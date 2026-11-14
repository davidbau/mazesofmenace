// Connected native TRAP owner: hero/monster effects, lookup, tools and terrain.
import {trapSchema as schema} from '../ported/trap.js';
import abi from './trap-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import {nativeStateFor} from './native/state-bridge.js';
import {nativeSpatialFor} from './native/spatial-state.js';
import {createNativeTrapState} from './native/trap-state.js';
import {createNativeTrap} from './native/trap.js';
import {createNativeTrapEntries} from './native/trap-entries.js';
const owners=new WeakMap();
export function enableTrap(environment,layouts){
 if(owners.has(environment))return owners.get(environment);const owner=nativeStateFor(environment),{transport,ctypes}=environment;let context,namespace;
 const code=t=>typeof t==='object'||t.includes('*')?'p':t==='void'?'v':/^f\d+$/.test(t)||/\b(float|double)\b/.test(t)?'d':/64|\blong\b/.test(t)?'j':'i';
 const sig=(result,args)=>[result,...args].map(code).join('');let entries;
 const pointer=name=>{const owned=schema.functions.find(f=>f.name===name),foreign=schema.callSites.find(f=>f.name===name);let signature;if(owned)signature=sig(owned.returnType,owned.parameters.map(p=>p.type));else if(foreign)signature=sig(foreign.return,foreign.args);else{const match=publicFunctions.functions[name]?.match(/^(.+?)\s*\((.*)\)$/);if(!match)throw Error('Unknown native TRAP callback '+name);signature=sig(ctypes.canonical(match[1]),match[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void').map(ctypes.canonical));}return environment.functionPointer(owned&&!Object.hasOwn(publicFunctions.functions,name)?'trap::'+name:name,signature,owned?((...args)=>entries[name](...args)):undefined);};
 const getContext=()=>{if(!context){context=createNativeTrapState(environment,schema,abi.layout,owner,pointer);namespace=createNativeTrap(context);}return context;};
 entries=createNativeTrapEntries(()=>{getContext();return namespace;},owner,transport);
 const names=Object.keys(entries).filter(n=>n!=='t_at'&&Object.hasOwn(publicFunctions.functions,n)&&!environment.hasFunction(n));for(const n of names)owner.functions.set(n,entries[n]);environment.register('trap',Object.fromEntries(names.map(n=>[n,entries[n]])));if(!environment.hasFunction('t_at'))environment.extend('trap',{t_at:nativeSpatialFor(environment,layouts).t_at});
 const graph={entries,get context(){return getContext();},call:(name,...args)=>{if(!entries[name])throw Error('Unknown native TRAP entry '+name);return entries[name](...args);},limitations:'Complete source graph, native record fields and direct calls; byte locals/copies and foreign callbacks remain.'};owners.set(environment,graph);return graph;
}
