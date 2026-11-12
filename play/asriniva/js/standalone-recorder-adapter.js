// Public recorder host boundary. Only seed/date/options/keys/storage enter the engine.
// Node reads game data/layouts here; production policies, memory and VM remain pure JS.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {setStorageForTesting,vfsReadFile,vfsWriteFile} from './storage.js';
import {recordingClockEpoch} from './wasm-replay-support.js';
import {recordingProfile,profileSysconf} from './recording-profile.js';
const STATE_PATH='/teleport-standalone-state.json';let loadedData,segmentIndex=0;
function data(){
 if(loadedData)return loadedData;
 const directory=path.resolve(process.env.STANDALONE_RECORDER_ASSETS??fileURLToPath(new URL('../.cache/full-original-c-v1/assets',import.meta.url))),assets={};
 function visit(from,to){for(const entry of fs.readdirSync(from,{withFileTypes:true})){const source=path.join(from,entry.name),target=to+'/'+entry.name;if(entry.isDirectory())visit(source,target);else if(entry.isFile())assets[target]={bytes:new Uint8Array(fs.readFileSync(source)),mode:fs.statSync(source).mode&0o777};else throw Error('Unsupported recorder asset '+source);}}
 visit(directory,'/nethack');const layouts=JSON.parse(fs.readFileSync(process.env.STANDALONE_RECORDER_LAYOUTS??fileURLToPath(new URL('./wasm/tu-layouts.json',import.meta.url))));loadedData={assets,layouts};return loadedData;
}
export async function runSegment(input){
 if(typeof input.moves!=='string'&&input.moves!==undefined)throw TypeError('Recorder moves must be literal text');
 const index=segmentIndex++,moves=input.moves??'',profile=recordingProfile(),epoch=Number(recordingClockEpoch()),timezone=process.env.TZ||Intl.DateTimeFormat().resolvedOptions().timeZone,counts={get:0,set:0,remove:0};
 const storage=input.storage?{getItem(key){counts.get++;return input.storage.getItem(key);},setItem(key,value){counts.set++;return input.storage.setItem(key,value);},removeItem(key){counts.remove++;return input.storage.removeItem(key);},get length(){return input.storage.length;},key:i=>input.storage.key(i)}:null;
 setStorageForTesting(storage);const previous=vfsReadFile(STATE_PATH),{assets,layouts}=data(),env={NETHACKDIR:'/nethack',HACKDIR:'/nethack',HOME:profile.home,USER:'root',LOGNAME:'root',TERM:'xterm-256color',TERMINFO:'/nethack/terminfo',LINES:'24',COLUMNS:'80',TZ:timezone,NETHACK_NO_DELAY:'1',NOMUX_MARKERS:'1',NETHACK_RAW_KEYS:'1',NETHACK_SEED:String(input.seed??0),NETHACK_FIXED_DATETIME:input.datetime||'20000110090000',NETHACK_RECORDING_EPOCH:String(epoch),NETHACK_RNGLOG:'/rng.log'};
 const installed={...assets,[profile.home+'/.nethackrc']:{bytes:new TextEncoder().encode(input.nethackrc??''),mode:0o666},'/nethack/sysconf':{bytes:new TextEncoder().encode(profileSysconf(new TextDecoder().decode(assets['/nethack/sysconf'].bytes),profile)),mode:0o666}};
 const names=['WebAssembly','fetch','Worker','WebSocket','XMLHttpRequest'],saved=names.map(name=>Object.getOwnPropertyDescriptor(globalThis,name)),exhausted=new Error('Recorder input exhausted'),screens=[],cursors=[],animations=[];let program,keyIndex=0,rng=[],state,error=null,forbiddenAttempts=0,pending=[];
 const deny=()=>{forbiddenAttempts++;throw Error('Forbidden Wasm/network capability in pure-JS recorder');};
 try{
  for(const name of names)Object.defineProperty(globalThis,name,{configurable:true,value:name==='WebAssembly'?new Proxy({},{get:deny}):deny});
  const[{createStandaloneProgram},{CExit}]=await Promise.all([import('./standalone/program.js'),import('./standalone/functions.js')]);
  program=createStandaloneProgram({layouts,assets:installed,directories:[profile.home,'/nethack/save'],runtime:{now:()=>epoch*1000,initialBytes:1024,maximumBytes:128*1024*1024,environment:env},readKey(){if(keyIndex>=moves.length)throw exhausted;const key=moves.charCodeAt(keyIndex++);return key===13?10:key;}});
  program.environment.filesystem.chdir('/nethack');const baseline=program.environment.fileBaseline();if(previous)program.environment.restoreFiles(previous);
  const name=/(?:^|[=\s,])name\s*:\s*([^,\n]+)/im.exec(input.nethackrc??'')?.[1]?.trim()||'';
  try{const status=program.run(['-u',name],{programName:'nethack'});if(status)throw Error('Standalone recorder exited with status '+status);}catch(e){if(e!==exhausted&&!(e instanceof CExit&&e.status===0))throw e;}
  try{rng=new TextDecoder().decode(program.environment.filesystem.readFile('/rng.log')).split('\n').filter(Boolean).map(line=>line.replace(/^\d+\s+/,'').replace(/\s*=\s*/g,'='));}catch(e){if(e.code!=='ENOENT')throw e;}
  for(const frame of program.terminal.frames){const value={screen:frame.screen,cursor:frame.cursor};if(frame.animation)pending.push(value);else{screens.push(value.screen);cursors.push(value.cursor);animations.push(pending);pending=[];}}
  if(!screens.length)throw Error('Standalone recorder produced no input boundaries');state=program.environment.captureFiles(baseline);vfsWriteFile(STATE_PATH,JSON.stringify(state));
  return{getScreens:()=>screens,getCursors:()=>cursors,getRngLog:()=>rng,getAnimationFramesByStep:()=>animations,getTerminalDiagnostics:()=>({backend:'standalone-recorder-shadow'}),getDependencyDiagnostics:()=>({backend:'pure-javascript',wasmForbidden:true,forbiddenAttempts}),getPendingAnimationFrames:()=>pending};
 }catch(e){error=String(e?.stack??e);throw Error('Pure-JS recorder failed: '+error);}
 finally{
  names.forEach((name,i)=>saved[i]?Object.defineProperty(globalThis,name,saved[i]):delete globalThis[name]);
  const directory=process.env.STANDALONE_RECORDER_STATS_DIR;
  if(directory){fs.mkdirSync(directory,{recursive:true});const worker=process.argv.find(a=>a.startsWith('--worker-session=')),session=worker?path.basename(worker.slice('--worker-session='.length)):'direct';fs.writeFileSync(path.join(directory,session+'.'+process.pid+'.'+index+'.json'),JSON.stringify({session,pid:process.pid,segment:index,inputKeys:moves.length,consumedKeys:keyIndex,rngCalls:rng.filter(line=>/^(?:rn2|rnd|rn1|rnl|rne|rnz|d)\(/.test(line)).length,screens:screens.length,cursors:cursors.length,animationSteps:animations.length,animationFrames:animations.map(frames=>frames.length),animationTotal:animations.reduce((n,frames)=>n+frames.length,0),pendingAnimationFrames:pending.length,storage:counts,persistedFiles:state?Object.keys(state.files):[],deletedFiles:state?.deleted??[],forbiddenAttempts,error},null,2));}
 }
}
