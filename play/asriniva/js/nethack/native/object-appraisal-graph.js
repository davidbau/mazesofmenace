// Connected inventory queries consume native shared state; only public pointer
// results retain their external ABI. The original RNG sites remain in policy.
import publicFunctions from '../public-functions.json' with {type:'json'};
import {createNativeObjectAppraisal} from './object-appraisal.js';
import {createNativeRecordViews} from './record-views.js';
import {nativeStateFor} from './state-bridge.js';
const games=new WeakMap();
export function nativeObjectAppraisalFor(environment,layouts){
 if(games.has(environment))return games.get(environment);
 const owner=nativeStateFor(environment),views=createNativeRecordViews(environment),{transport:t,services:S,ctypes}=environment,address=environment.address;
 const root=(name,type)=>views.record('struct '+type,environment.requireGlobal(name));
 const context={...layouts.questpgr,...layouts.zap,gu:root('gu','instance_globals_u'),gi:root('gi','instance_globals_i'),gm:root('gm','instance_globals_m'),svl:root('svl','instance_globals_saved_l'),svc:root('svc','instance_globals_saved_c'),mons:environment.requireGlobal('mons'),int:t.int,uint:t.uint,char:t.char,
  argument:(value,type)=>type==='struct obj *'?views.record('struct obj',value):t.int(value),
  Has_contents:obj=>Boolean(obj.cobj),DEADMONSTER:mon=>mon.mhp<1,
  // Retained source pointer expressions inspect only one immutable species table.
  // Offsets are signed int indices; 64-bit pointer wrap is kept at this boundary.
  ptrAdd:(base,index,type)=>BigInt.asUintN(64,BigInt(address(base))+BigInt(index)*BigInt(ctypes.size(type))),ptrCompare:(a,b,op)=>{if(op!=='==')throw Error('Unreviewed appraisal pointer comparison');return a===b;},
  literal:S.literal,rng_log_enabled:S.rng_log_enabled,rng_log_set_caller:S.rng_log_set_caller,
  rn2:n=>{const fn=owner.functions.get('rn2')??S.rn2?.nativeEntry??S.rn2;return fn(n);},
 };
 Object.defineProperties(context,{fmon:{get:()=>context.svl.level.monlist},fobj:{get:()=>context.svl.level.objlist}});
 const policies=createNativeObjectAppraisal(context),functions={};
 for(const[name,policy]of Object.entries(policies)){
  if(!Object.hasOwn(publicFunctions.functions,name))continue;
  const pointer=name==='find_qarti'||name==='find_quest_artifact',invoke=(args,native)=>{const saved=owner.depth?undefined:t.stackSave();owner.enter();try{args=args.map((v,i)=>name==='find_quest_artifact'?t.uint(v):i===0?views.record('struct obj',v):t.int(v));const value=policy(...args);return pointer?native?value:address(value):t.char(value);}finally{owner.leave();if(saved!==undefined)t.stackRestore(saved);}};
  const fn=(...args)=>invoke(args,false),direct=(...args)=>invoke(args,true);for(const entry of[fn,direct]){entry.nativeState=owner;entry.nativeDirect=true;entry.nativePrepared=true;}fn.nativeValuesEntry=direct;functions[name]=fn;owner.functions.set(name,fn);
 }
 const graph={context,policies,functions};games.set(environment,graph);return graph;
}
