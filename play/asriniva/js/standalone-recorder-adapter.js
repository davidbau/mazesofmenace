// Public recorder host boundary. Only seed/date/options/keys/storage enter the engine.
// Bundled data works in browsers; optional Node diagnostics stay at the host boundary.
import bundledLayouts from './wasm/tu-layouts.json' with {type:'json'};
import {setStorageForTesting,vfsReadFile,vfsWriteFile} from './storage.js';
import {recordingClockEpoch} from './wasm-replay-support.js';
import {recordingProfile,profileSysconf} from './recording-profile.js';
import {loadGameAssets} from './nethack/game-assets.js';
const STATE_PATH='/teleport-standalone-state.json';let loadedData,segmentIndex=0;
const nodeHost=typeof process!=='undefined'&&Boolean(process.versions?.node);
async function data(){
 if(loadedData)return loadedData;
 let assets=loadGameAssets(),layouts=bundledLayouts;
 if(nodeHost&&(process.env.STANDALONE_RECORDER_ASSETS||process.env.STANDALONE_RECORDER_LAYOUTS)){
  const host=await import('./standalone-recorder-node.js');
  ({assets,layouts}=host.loadRecorderOverrides(assets,layouts));
 }
 loadedData={assets,layouts};return loadedData;
}
export async function runSegment(input,{preservePublishedSaveCursor=true}={}){
 if(typeof input.moves!=='string'&&input.moves!==undefined)throw TypeError('Recorder moves must be literal text');
 const index=segmentIndex++,moves=input.moves??'',profile=recordingProfile(),epoch=Number(recordingClockEpoch()),counts={get:0,set:0,remove:0};
 const storage=input.storage?{getItem(key){counts.get++;return input.storage.getItem(key);},setItem(key,value){counts.set++;return input.storage.setItem(key,value);},removeItem(key){counts.remove++;return input.storage.removeItem(key);},get length(){return input.storage.length;},key:i=>input.storage.key(i)}:null;
 setStorageForTesting(storage);const previous=vfsReadFile(STATE_PATH),{assets,layouts}=await data(),env={NETHACKDIR:'/nethack',HACKDIR:'/nethack',HOME:profile.home,USER:'root',LOGNAME:'root',TERM:'xterm-256color',TERMINFO:'/nethack/terminfo',LINES:'24',COLUMNS:'80',TZ:profile.timeZone,NETHACK_NO_DELAY:'1',NOMUX_MARKERS:'1',NETHACK_RAW_KEYS:'1',NETHACK_SEED:String(input.seed??0),NETHACK_FIXED_DATETIME:input.datetime||'20000110090000',NETHACK_RECORDING_EPOCH:String(epoch),NETHACK_RNGLOG:'/rng.log'};
 const installed={...assets,[profile.home+'/.nethackrc']:{bytes:new TextEncoder().encode(input.nethackrc??''),mode:0o666},'/nethack/sysconf':{bytes:new TextEncoder().encode(profileSysconf(new TextDecoder().decode(assets['/nethack/sysconf'].bytes),profile)),mode:0o666}};
 const names=['WebAssembly','fetch','Worker','WebSocket','XMLHttpRequest'],isolatedWorker=nodeHost&&process.argv.some(a=>a.startsWith('--worker-session=')),saved=isolatedWorker?null:names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name)),exhausted=new Error('Recorder input exhausted'),screens=[],cursors=[],animations=[];let program,keyIndex=0,rng=[],state,error=null,forbiddenAttempts=0,pending=[];
 const deny=()=>{forbiddenAttempts++;throw Error('Forbidden Wasm/network capability in pure-JS recorder');};
 try{
  // Recorder workers are disposable; remove lazy globals without initializing them.
  if(isolatedWorker)for(const name of names)delete globalThis[name];
  for(const name of names)Object.defineProperty(globalThis,name,{configurable:true,value:name==='WebAssembly'?new Proxy({},{get:deny}):deny});
  const[{createStandaloneProgram},{CExit}]=await Promise.all([import('./nethack/program.js'),import('./nethack/functions.js')]);
  program=createStandaloneProgram({layouts,terminalOptions:{preservePublishedSaveCursor},assets:installed,directories:[profile.home,'/nethack/save'],runtime:{now:()=>epoch*1000,timeZone:profile.timeZone,initialBytes:1024,maximumBytes:128*1024*1024,environment:env},readKey(){if(keyIndex>=moves.length)throw exhausted;const key=moves.charCodeAt(keyIndex++);return key===13?10:key;}});
  program.environment.filesystem.chdir('/nethack');const baseline=program.environment.fileBaseline();if(previous)program.environment.restoreFiles(previous);
  const name=/(?:^|[=\s,])name\s*:\s*([^,\n]+)/im.exec(input.nethackrc??'')?.[1]?.trim()||'';
  try{const status=program.run(['-u',name],{programName:'nethack'});if(status)throw Error('Standalone recorder exited with status '+status);}catch(e){if(e!==exhausted&&!(e instanceof CExit&&e.status===0))throw e;}
  try{rng=new TextDecoder().decode(program.environment.filesystem.readFile('/rng.log')).split('\n').filter(Boolean).map(line=>line.replace(/^\d+\s+/,'').replace(/\s*=\s*/g,'='));}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const frame of program.terminal.frames){const value={screen:frame.screen,cursor:frame.cursor};if(frame.animation)pending.push(value);else{screens.push(value.screen);cursors.push(value.cursor);animations.push(pending);pending=[];}}
  if(!screens.length)throw Error('Standalone recorder produced no input boundaries');state=program.environment.captureFiles(baseline);vfsWriteFile(STATE_PATH,JSON.stringify(state));
  return{getScreens:()=>screens,getCursors:()=>cursors,getRngLog:()=>rng,getAnimationFramesByStep:()=>animations,getTerminalDiagnostics:()=>({backend:'standalone-recorder-shadow'}),getDependencyDiagnostics:()=>({backend:'pure-javascript',wasmForbidden:true,forbiddenAttempts}),getPendingAnimationFrames:()=>pending};
 }catch(e){error=String(e?.stack??e);throw Error('Pure-JS recorder failed: '+error);}
 finally{
  if(saved)names.forEach((name,i)=>saved[i]?Object.defineProperty(globalThis,name,saved[i]):delete globalThis[name]);
  if(nodeHost&&process.env.STANDALONE_RECORDER_STATS_DIR){
   const {writeRecorderStats}=await import('./standalone-recorder-node.js');
   writeRecorderStats(index,(session,pid)=>({session,pid,segment:index,inputKeys:moves.length,consumedKeys:keyIndex,rngCalls:rng.filter(line=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(line)).length,screens:screens.length,cursors:cursors.length,animationSteps:animations.length,animationFrames:animations.map(frames=>frames.length),animationCursors:animations.map(frames=>frames.map(frame=>Array.isArray(frame.cursor)?[...frame.cursor]:null)),animationTotal:animations.reduce((n,frames)=>n+frames.length,0),pendingAnimationFrames:pending.length,storage:counts,persistedFiles:state?Object.keys(state.files):[],deletedFiles:state?.deleted??[],forbiddenAttempts,error}));
  }
 }
}
