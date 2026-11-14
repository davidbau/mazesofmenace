import {createNativeMonmoveEntries} from './native/monmove-entries.js';
import {nativeMonmoveMembers} from './native/monmove-state.js';
// Shared field/dependency transport for unchanged MONMOVE policies.
import abi from './monmove-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as monmove from '../ported/monmove.js';
import {nativeStateFor} from './native/state-bridge.js';
import {callMonmove,monmoveContext} from './bindings/monmove.js';
const owners=new WeakMap();
export function enableMonsterMovement(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes}=environment,L=layouts.monmove;
 const nativeState=nativeStateFor(environment),local=Object.create(services),wrappers=new Map();
 for(const key of nativeMonmoveMembers)Object.defineProperty(local,key,{configurable:true,enumerable:true,get(){
  const selected=nativeState.functions.get(key);if(selected)return selected.nativeValuesEntry??selected;
  let value=services[key];if(value===undefined){const resolved=environment.resolve(key);value=services[key]??resolved;}
  if(typeof value!=='function')return value;const prepared=value.nativeEntry;if(prepared?.nativeState===nativeState)return prepared.nativeValuesEntry??prepared;
  let cached=wrappers.get(key);if(!cached){cached=(...args)=>{const fn=environment.hasFunction(key)?environment.resolve(key):typeof services[key]==='function'?services[key]:environment.resolve(key);return nativeState.boundary(fn,...args.map(v=>v?.address??v));};wrappers.set(key,cached);}return cached;
 },set(value){Object.defineProperty(this,key,{value,writable:true,configurable:true,enumerable:true});}});
 // Shadow DECL setters so the unchanged factory installs its native record views.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:services[name],writable:true,configurable:true});

 let storage;const legacyStorage=()=>storage??=environment.allocateGlobal('monmove.class_lists',monmove.practical.length+monmove.magical.length);
 function field(kind,p,i,value){const key=abi.bits[kind]?.[i],type=abi.schema[kind]?.[0];if(!key||!type)throw new Error('Unknown MONMOVE packed field');const f=ctypes.record(type).fields[key];const scalar=f.ctype.replace(new RegExp(' '+key+'$'),'');return value===undefined?ctypes.getField(type,environment.address(p),key,scalar):ctypes.setField(type,environment.address(p),key,scalar,value);}
 Object.assign(local,{nativeEnvironment:environment,nativeLayouts:layouts,stackAlloc:environment.transport.stackAlloc,nativeOwner:nativeState,moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,global:i=>environment.requireGlobal(abi.globals[i]),storage:legacyStorage,bit:(kind,p,i)=>field(kind,p,i),setBit:(kind,p,i,v)=>field(kind,p,i,v),equipment:i=>ctypes.load('void *',environment.requireGlobal(['uwep','uarm','uball','uchain'][i]))});
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('monmove.c'),line,services.literal(caller));return services[name](n);};
 for(const name of ['d','rn1'])local[name]=(n,x,line,caller)=>{if(!abi.rngSites.some(row=>row[0]===name&&row[1]===line&&row[2]===caller))throw new Error('Unexpected MONMOVE RNG site '+name);if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('monmove.c'),line,services.literal(caller));return services[name](n,x);};
 local.assert=condition=>{if(!condition){const a=abi.assertion;return environment.resolve('__assert_fail')(services.literal(a.condition),services.literal(a.file),a.line,services.literal(a.function));}};
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 // Original MONMOVE header helpers share the active strings and window owner.
 local.winMessage=()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE'));
 local.commonString=()=>environment.address(ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_something','const char *'));
 local.display_nhwindow=(win,blocking)=>environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke('win_display_nhwindow','vii',environment.transport.int(win),environment.transport.char(blocking)):environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),'win_display_nhwindow','void *'),'vii',environment.transport.int(win),environment.transport.char(blocking));
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strncmpi'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 const entries=createNativeMonmoveEntries(()=>monmoveContext(local,L),nativeState,environment.transport);
 const names=Object.keys(monmove).filter(name=>typeof monmove[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const exports=Object.fromEntries(names.map(name=>{const call=entries[name];nativeState.functions.set(name,call);return [name,call];}));
 environment.register('monster-movement',exports);
 // These original MONMOVE helpers were installed by world startup before this
 // connected owner existed. Upgrade that owner rather than leaving gameplay on
 // a second, pointer-oriented implementation of the same source routines.
 const earlierAccess=['closed_door','accessible'].filter(name=>!Object.hasOwn(exports,name));
 const access=earlierAccess.length?environment.start('world-accessibility'):undefined;
 for(const name of earlierAccess){
  if(access.namespace[name]!==monmove[name])throw Error('Unexpected earlier movement access owner '+name);
  const fn=entries[name];
  access.namespace[name]=fn;nativeState.functions.set(name,fn);
 }

 const owner={services:local,entries,get storage(){return storage;},get context(){return monmoveContext(local,L);},call:(name,...args)=>callMonmove(local,L,name,...args),limitation:'Native per-game MONMOVE execution with transactional native fields and legacy service boundaries; strict public recordings and C world/RNG validation required for acceptance.'};owners.set(environment,owner);return owner;
}
