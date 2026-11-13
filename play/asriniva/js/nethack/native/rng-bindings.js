import {withCEnvironment} from '../../c-runtime/context.js';
// Direct per-game execution of the original RNG state and policy.
import {createNativeRng} from './rng.js';
import {nativeStateFor} from './state-bridge.js';
export function createNativeRngBindings(environment,context){
 const owner=nativeStateFor(environment),native=createNativeRng(context),{transport}=environment;
 const callback=(fn,self,args)=>owner.boundary(withCEnvironment,context,()=>Reflect.apply(fn,self,args));
 for(const [target,key]of [[context,'Luck'],[context,'has_strong_rngseed'],[context.u,'ulevel']]){
  const descriptor=Object.getOwnPropertyDescriptor(target,key);if(!descriptor?.get)throw Error('Missing RNG callback '+key);
  Object.defineProperty(target,key,{...descriptor,get(){return callback(descriptor.get,this,[]);}});
 }
 const seed=context.sys_random_seed;context.sys_random_seed=function(...args){return callback(seed,this,args);};
 const entries=Object.fromEntries(Object.entries(native).map(([name,fn])=>{
  let started=false;
  const call=(...args)=>{
   if(!started){environment.startModule('rnd');started=true;}
   const outer=!owner.depth,saved=outer?transport.stackSave():undefined;if(outer)owner.enter();
   try{if(name==='shuffle_int_array')args=[context.intArray(args[0]),args[1]];return fn(...args);}
   finally{if(outer){try{owner.leave();}finally{transport.stackRestore(saved);}}}
  };
  call.nativeState=owner;call.nativeDirect=true;owner.functions.set(name,call);return[name,call];
 }));
 return entries;
}
