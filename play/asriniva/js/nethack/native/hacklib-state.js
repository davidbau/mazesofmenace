import {createNativeHacklib} from './hacklib.js';
import {nativeStateFor} from './state-bridge.js';

// Source bodies already express their C argument widths. Keep native arguments
// intact and retain stack ownership only for byte-local routines and callbacks.
export function createNativeHacklibBindings(environment,context,namespace){
 const owner=nativeStateFor(environment),source=createNativeHacklib(context),entries={...source};
 Object.assign(namespace,source);context.nativeNamespace=source;
 for(const [name,body]of Object.entries(source)){
  if(typeof body!=='function')continue;
  const fn=(...args)=>{
   const saved=owner.depth?undefined:environment.transport.stackSave();owner.enter();
   try{return body(...args);}finally{try{owner.leave();}finally{if(saved!==undefined)environment.transport.stackRestore(saved);}}
  };
  fn.nativeState=owner;fn.nativeDirect=true;fn.nativePrepared=true;
  owner.functions.set(name,fn);entries[name]=fn;
 }
 return {entries,namespace:source,owner,context};
}
