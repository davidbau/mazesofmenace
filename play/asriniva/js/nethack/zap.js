// Shared original ZAP factory, initially exposing actual location queries.
import {nativeObjectAppraisalFor} from './native/object-appraisal-graph.js';
import abi from './zap-abi.json' with {type:'json'};
import {callZap,initializeZap,zapState} from './bindings/zap.js';
const owners=new WeakMap();

export function enableZap(environment,layouts,{only=['get_obj_location','get_mon_location']}={}){
 let owner=owners.get(environment);
 if(!owner){
  const {services,memory,ctypes,transport,functions}=environment,L=layouts.zap,address=environment.address;
  for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review ZAP ABI '+key);
  const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(value=>typeof value==='string'?services.literal(value):value?.address??value),forwards=new Map();
  const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
  const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
  for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
  let destroy;
  try{destroy=environment.requireGlobal('destroy_strings');}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;destroy=environment.allocateGlobal('destroy_strings',abi.storageBytes[0]);}
  const storage=[destroy,environment.allocateGlobal('zap.charged_objs',abi.storageBytes[1])],statics=Object.fromEntries(Object.entries(abi.staticBytes).map(([name,n])=>[name,environment.allocateGlobal('zap.'+name,n)]));
  const signature=type=>{const match=type.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unconnected ZAP indirect prototype '+type);return[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':/\b(float|double)\b/.test(t)?'d':ctypes.size(t)===8?'j':'i';}).join('');};
  Object.assign(local,{strlen:s=>transport.ulong(resolve('strlen')(text(s))),moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
   global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown ZAP global '+i);return environment.requireGlobal(name);},
   storage:i=>{if(storage[i]===undefined)throw new Error('Unknown ZAP source table '+i);return storage[i];},staticStorage:name=>{if(statics[name]===undefined)throw new Error('Unknown ZAP static storage '+name);return statics[name];},
   getBit:(p,i)=>{const row=abi.bits[i];if(!row)throw new Error('Unknown ZAP packed field '+i);return ctypes.getField(row.type,address(p),row.field,'unsigned int');},setBit:(p,i,value)=>{const row=abi.bits[i];if(!row)throw new Error('Unknown ZAP packed field '+i);return ctypes.setField(row.type,address(p),row.field,'unsigned int',value);},
   callbackPointer:name=>{const proto=abi.public[name]??({rn2:'int (int)',rn2_on_display_rng:'int (int)',xname:'char *(struct obj *)',zap_ok:'int (struct obj *)'})[name];if(!proto)throw new Error('Unconnected ZAP callback '+name);const match=proto.match(/^(.+?)\s*\((.*)\)$/),sig=signature(match[1]+' (*)('+match[2]+')');return environment.functionPointer(name==='zap_ok'?'zap::'+name:name,sig,environment.hasFunction(name)||(!Object.hasOwn(abi.public,name)&&name!=='zap_ok')?undefined:(...args)=>callZap(local,L,name,...args));},
   callIndirect:(fn,type,...args)=>functions.indirect(fn,signature(type),...boundary(args)),
  });
  initializeZap(local,L);
  owner={services:local,storage,statics,state:zapState(local),call:(name,...args)=>callZap(local,L,name,...boundary(args)),exports:[],limitation:'Original ZAP location queries on one shared factory/private state. Other ZAP/wish/polymorph/callback/format branches are not accepted and require their actual complete transport/dependency owners.'};owners.set(environment,owner);
 }
 const names=only.filter(name=>{if(!Object.hasOwn(abi.public,name))throw new Error('Unknown public ZAP function '+name);return!environment.hasFunction(name);}),nativeQueries=nativeObjectAppraisalFor(environment,layouts).functions,namespace=Object.fromEntries(names.map(name=>[name,nativeQueries[name]??((...args)=>owner.call(name,...args))]));
 if(owner.exports.length)environment.extend('zap',namespace);else environment.register('zap',namespace);
 owner.exports.push(...names);return owner;
}

// Late exposure preserves every earlier owner and the existing ZAP private state.
export function enableZapPublic(environment,layouts){
 const prior=new Map(Object.keys(abi.public).filter(n=>environment.hasFunction(n)).map(n=>[n,environment.services[n]]));
 const namespaces=Object.entries(environment.status()).filter(([,status])=>status==='ready').map(([name])=>environment.start(name).namespace),callbacks=namespaces.flatMap(namespace=>Object.entries(namespace).filter(([n])=>prior.has(n)).map(([n,fn])=>({namespace,n,fn})));
 const owner=enableZap(environment,layouts,{only:Object.keys(abi.public)});
 for(const[n,fn]of prior)if(!environment.hasFunction(n)||environment.services[n]!==fn)throw new Error('Existing public service changed during ZAP exposure '+n);
 for(const{namespace,n,fn}of callbacks)if(namespace[n]!==fn)throw new Error('Existing public callback changed during ZAP exposure '+n);
 return owner;
}
