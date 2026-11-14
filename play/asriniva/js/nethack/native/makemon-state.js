import {createNativeMakemon} from './makemon.js';
import {nativeStateFor} from './state-bridge.js';
import {createNativeRecordViews} from './record-views.js';
import {createNativeAbiCaster,installNativeIntegerCasts} from './execution.js';
import {makemonParameters} from '../bindings/makemon.js';

// Retain each published owner and its original argument/reference preparation.
// Both contexts inherit the same live selection statics and canonical records.
const contexts=new WeakMap();
export function connectNativeMakemon(environment,module,names){
 const entry=environment.start(module),context=entry.environment;
 let bound=contexts.get(context);
 if(!bound){
  const owner=nativeStateFor(environment),records=createNativeRecordViews(environment);
  installNativeIntegerCasts(context);
  const namespace=createNativeMakemon(context),cast=createNativeAbiCaster(environment.ctypes,environment.transport,value=>typeof value==='string'?environment.services.literal(value):environment.address(value));
  bound={owner,namespace,plans:new Map(),cast,records};contexts.set(context,bound);
 }
 for(const name of names){
  if(typeof bound.namespace[name]!=='function')throw Error('Missing native MAKEMON source '+name);
  const types=makemonParameters[name];if(!types)throw Error('Missing measured MAKEMON parameters '+name);
  const plans=types.map(type=>{const target=type.replace(/\s*\*$/,'');return type.endsWith('*')&&environment.ctypes.isRecord(target)?value=>bound.records.record(target,value):bound.cast(type);});
  bound.plans.set(name,plans);
  const fn=(...args)=>{
   const {owner}=bound,saved=owner.depth?undefined:environment.transport.stackSave();owner.enter();
   try{
    args=args.map((value,i)=>{if(!plans[i])throw Error('Unexpected native MAKEMON argument '+name+':'+i);return plans[i](value);});
    if(entry.prepareArgs)args=entry.prepareArgs(name,args);
    const result=bound.namespace[name](...args);
    return typeof result==='string'?environment.services.literal(result):result;
   }finally{try{owner.leave();}finally{if(saved!==undefined)environment.transport.stackRestore(saved);}}
  };
  fn.nativeState=bound.owner;fn.nativeDirect=true;fn.nativePrepared=true;
  entry.namespace[name]=fn;bound.owner.functions.set(name,fn);
 }
 return bound;
}
