import {createNativeStairs} from './stairs.js';
import {nativeStateFor} from './state-bridge.js';
import {createNativeRecordViews} from './record-views.js';
import {createNativeAbiCaster,installNativeIntegerCasts} from './execution.js';
import publicFunctions from '../public-functions.json' with {type:'json'};
// Complete stair policy shares live hero/list/dungeon state with movement.
export function createNativeStairBindings(environment,context){
 const owner=nativeStateFor(environment),records=createNativeRecordViews(environment),{transport}=environment;
 for(const [name,type]of Object.entries({gs:'struct instance_globals_s',u:'struct you',svd:'struct instance_globals_saved_d'}))Object.defineProperty(context,name,{value:records.record(type,environment.requireGlobal(name)),writable:true,configurable:true});
 context.stairway=value=>records.record('stairway',value);installNativeIntegerCasts(context);
 const namespace=createNativeStairs(context),cast=createNativeAbiCaster(environment.ctypes,transport,value=>typeof value==='string'?environment.services.literal(value):environment.address(value)),entries={};
 for(const name of Object.keys(namespace)){
  const prototype=publicFunctions.functions[name],match=prototype?.match(/^(.*?)\((.*)\)$/);if(!match)throw Error('Missing native stair prototype '+name);
  const types=match[2]&&match[2]!=='void'?match[2].split(',').map(t=>t.trim()):[];
  const prepare=types.map(type=>/\bd_level\s*\*/.test(type)?value=>records.record('d_level',value):/\bstairway\s*\*/.test(type)?value=>records.record('stairway',value):cast(type));
  const call=(...args)=>{const saved=owner.depth?undefined:transport.stackSave();owner.enter();try{return namespace[name](...args.map((value,i)=>prepare[i](value)));}finally{try{owner.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};
  call.nativeState=owner;call.nativeDirect=true;call.nativePrepared=true;entries[name]=call;owner.functions.set(name,call);
 }
 return {entries,context,namespace,owner};
}
