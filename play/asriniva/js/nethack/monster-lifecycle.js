import {createNativeMonEntries} from './native/mon-entries.js';
import {nativeMonMembers} from './native/mon-state.js';
// Shared field/dependency transport for unchanged MON policies.
import abi from './mon-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as mon from '../ported/mon.js';
import {getShknamCatalogue} from './shknam.js';
import {createMonEnvironment} from './bindings/mon.js';
import {nativeStateFor} from './native/state-bridge.js';
const ALIGNMENT_MODULUS=8n*(1n<<32n);
export function projectMonAlignmentLimit(value){if(typeof value!=='bigint')throw new TypeError('MON native alignment limit must be BigInt');return Number(value%ALIGNMENT_MODULUS);}
const owners=new WeakMap();
export function enableMonsterLifecycle(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const macro=abi.numericMacros.ALIGNLIM,uses=mon.xkilled.toString().split('\n').filter(line=>line.includes('C.ALIGNLIM')).map(line=>line.trim());if(macro.projectionModulus!==String(ALIGNMENT_MODULUS)||JSON.stringify(uses)!==JSON.stringify(macro.sourceUses))throw new Error('Review MON alignment projection source sites');
 const {services,memory,ctypes,transport}=environment,L=layouts.mon;
 const nativeState=nativeStateFor(environment),local=Object.create(services),wrappers=new Map();
 for(const key of nativeMonMembers)Object.defineProperty(local,key,{configurable:true,enumerable:true,get(){
  const selected=nativeState.functions.get(key);if(selected)return selected.nativeValuesEntry??selected;
  let value=services[key];if(value===undefined){const resolved=environment.resolve(key);value=services[key]??resolved;}
  if(typeof value!=='function')return value;const prepared=value.nativeEntry;if(prepared?.nativeState===nativeState)return prepared.nativeValuesEntry??prepared;
  let fn=wrappers.get(key);if(!fn){fn=(...args)=>{const target=environment.hasFunction(key)?environment.resolve(key):typeof services[key]==='function'?services[key]:environment.resolve(key);return nativeState.boundary(target,...args.map(v=>v?.address??v));};if('address' in value)Object.defineProperty(fn,'address',{get:()=>value.address});wrappers.set(key,fn);}return fn;
 },set(value){Object.defineProperty(this,key,{value,writable:true,configurable:true,enumerable:true});}});

 // Shadow DECL setters so the unchanged factory installs its native record views.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:services[name],writable:true,configurable:true});

 // Native MON passes these formatter function addresses to OBJNAM.
 for(const name of ['xname','doname']){const formatter=obj=>{const selected=nativeState.functions.get(name);if(selected?.nativeState===nativeState&&selected.nativeDirect)return (selected.nativeValuesEntry??selected)(obj);return nativeState.boundary(environment.resolve(name),environment.address(obj));};Object.defineProperty(formatter,'address',{get:()=>environment.functionPointer(name,'pp')});local[name]=formatter;}

 // MON references the original SHKNAM catalogue even before a shop is created.
 const catalogue=getShknamCatalogue(environment,layouts);
 function field(kind,p,i,value){const key=abi.bits[kind]?.[i],type=abi.schema[kind]?.[0];if(!key||!type)throw new Error('Unknown MON packed field');const f=ctypes.record(type).fields[key];const scalar=f.ctype.replace(new RegExp(' '+key+'$'),'');return value===undefined?ctypes.getField(type,environment.address(p),key,scalar):ctypes.setField(type,environment.address(p),key,scalar,value);}
 Object.assign(local,{nativeEnvironment:environment,nativeLayouts:layouts,projectAlignmentLimit:projectMonAlignmentLimit,stackAlloc:transport.stackAlloc,alloc:n=>environment.alloc('alloc',transport.uint(n)),moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,global:i=>environment.requireGlobal(abi.globals[i]),displayRngPointer:()=>environment.functionPointer('rn2_on_display_rng','ii'),winMessage:()=>nativeState.nativeArena.view.getInt32(environment.requireGlobal('WIN_MESSAGE'),true),bit:(kind,p,i)=>field(kind,p,i),setBit:(kind,p,i,v)=>field(kind,p,i,v),equipment:i=>nativeState.nativeRecords.record('struct obj',nativeState.nativeArena.pointer(environment.requireGlobal(['uwep','uball','uchain'][i])))});
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('mon.c'),line,services.literal(caller));return services[name](n);};
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 // Native MON assert macro preserves its measured source site and SDK abort owner.
 local.assert=(condition,index)=>{condition=transport.int(condition);index=transport.int(index);if(condition)return;const site=abi.assertions[index];if(!site)throw new Error('Unknown MON assertion '+index);return environment.resolve('__assert_fail')(text(site.expression),text(site.file),site.line,text(site.function));};
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strncmpi'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 Object.assign(local,{invokeMonBool:(fn,m)=>nativeState.boundary(environment.functions.indirect,fn,'ip',environment.address(m)),invokeMonVoid:(fn,m)=>nativeState.boundary(environment.functions.indirect,fn,'vp',environment.address(m)),invokeMonBoolXY:(fn,m,x,y)=>nativeState.boundary(environment.functions.indirect,fn,'ipii',environment.address(m),x,y)});
 local.commonString=i=>{const key=['c_Something','c_thats_enough_tries','c_black','c_green','c_red'][i],type=i<2?'struct c_common_strings':'struct c_color_names';return nativeState.nativeRecords.record(type,environment.requireGlobal(i<2?'c_common_strings':'c_color_names'))[key];};
 let context;const getContext=()=>context??=createMonEnvironment(local,L);
 const entries=createNativeMonEntries(getContext,nativeState,transport,services.literal),call=(name,...args)=>{const fn=entries[name];if(!fn)throw Error('Unknown native MON entry '+name);return fn(...args);};

 const names=Object.keys(mon).filter(name=>typeof mon[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const exports=Object.fromEntries(names.map(name=>{const invoke=entries[name];nativeState.functions.set(name,invoke);return [name,invoke];}));
 environment.register('monster-lifecycle',exports);
 const owner={services:local,catalogue,entries,call,get context(){return getContext();},limitation:'One original MON factory/private state; source-site-guarded ALIGNLIM numeric projection preserves its four int/cast/division uses over the full signedlong move domain. Wider lifecycle and full-game branches require C verification.'};owners.set(environment,owner);return owner;
}
