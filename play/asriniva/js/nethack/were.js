// Per-game WERE policies on canonical shared native actors and properties.
import abi from './were-abi.json' with {type:'json'};
import {createNativeWere} from './native/were.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeAbiCaster} from './native/execution.js';
import {createWereEnvironment} from './bindings/were.js';
import publicFunctions from './public-functions.json' with {type:'json'};

export function enableWere(environment,layouts){
 const {services,memory,ctypes,transport}=environment,L=layouts.were,address=environment.address;
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review WERE ABI '+key);
 const native=nativeStateFor(environment);
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=Object.create(services);
 const cast=createNativeAbiCaster(ctypes,transport,text),scalar=(type,value)=>cast(type)(value);
 const prototype=name=>{const p=publicFunctions.functions[name];if(!p)throw new Error('Missing WERE foreign public prototype '+name);const m=p.match(/^(.+?)\s*\((.*)\)$/);return{result:m[1],args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')};};
 for(const[name,target]of Object.entries(abi.calls)){
  const p=prototype(target);
  local[name]=(...args)=>{const direct=native.functions.get(target);if(direct?.nativeState===native)return direct(...args);const result=native.boundary(resolve(target),...args.map((v,i)=>scalar(p.args[i],v)));return ctypes.canonical(p.result)==='void'?undefined:scalar(p.result,result);};
 }
 const bit=(p,i,value)=>{const name=abi.bits[i];if(!name)throw new Error('Unknown WERE packed field '+i);return value===undefined?ctypes.getField('struct monst',address(p),name,'unsigned int'):ctypes.setField('struct monst',address(p),name,'unsigned int',value);};
 Object.assign(local,{nativeOwner:native,heap:()=>memory.HEAPU8,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown WERE global '+i);return environment.requireGlobal(abi.globals[i]);},
  monsterBit:(p,i)=>bit(p,i),setMonsterBit:(p,i,v)=>bit(p,i,transport.int(v)),
  roleplayDeaf:()=>native.nativeRecords.record('struct you',environment.requireGlobal('u')).uroleplay.deaf,
  night:()=>environment.calendar('night'),
  Strcpy:(out,value)=>address(resolve('strcpy')(address(out),text(value))),
  Sprintf:(out,format,name)=>resolve('sprintf')(address(out),text(format),text(name)),
  impossible:(format,name)=>resolve('impossible')(text(format),text(name)),
  pline:(format,a,b)=>resolve('pline')(text(format),text(a),text(b)),
  You_hear:(format,name)=>resolve('You_hear')(text(format),text(name)),
  You_feel:format=>resolve('You_feel')(text('%s'),text(format)),
 });
 for(const name of ['rn2','rnd'])local[name]=(bound,line,caller)=>{if(!['were_change','new_were','were_summon','you_unwere'].includes(caller))throw new Error('Unknown WERE RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('were.c'),transport.int(line),text(caller));return resolve(name)(transport.int(bound));};
 local.rn1=(x,y,line,caller)=>local.rn2(x,line,caller)+transport.int(y);
 // Shadow DECL projections; the factory views retain the original shared bytes.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const context=createWereEnvironment(local,L);
 const views={were_change:[context.monster],new_were:[context.monster],were_summon:[context.permonst,null,context.intPointer]};
 const policies=createNativeWere(context);
 const exports=Object.fromEntries(Object.keys(abi.public).map(name=>{
  const p=prototype(name),invoke=(...args)=>{
   const saved=native.depth?undefined:transport.stackSave();native.enter();
   try{return policies[name](...args.map((v,i)=>views[name]?.[i]?views[name][i](v):scalar(p.args[i],v)));}
   finally{native.leave();if(saved!==undefined)transport.stackRestore(saved);}
  };
  invoke.nativeState=native;invoke.nativeDirect=true;native.functions.set(name,invoke);return[name,invoke];
 }));
 environment.register('were',exports);
 return{context,services:local,exports:Object.keys(abi.public),limitation:'Per-game native WERE policies use canonical monster/hero state and direct native dependencies; strings, output pointers and remaining foreign owners retain byte boundaries.'};
}
