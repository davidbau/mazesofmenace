import {nativeStateFor} from './native/state-bridge.js';
import {createNativeRecordViews} from './native/record-views.js';
import {compileNativeFieldPlans} from './native/address-fields.js';
// Shared record/file/callback transport for unchanged DO lifecycle policies.
import abi from './do-lifecycle-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/do.js';
import {callDo} from './bindings/do.js';

const descriptorScalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
const nativeSchema={schema:Object.fromEntries(Object.entries(abi.schemas).map(([name,row])=>[name,{ctype:row.ctype,fields:row.fields.map(f=>({name:f.name,canonical:f.d.s||f.d.a?f.ctype:descriptorScalar(f.d),bit:f.bit}))}]))};
export function createDoFieldPlans(environment){return compileNativeFieldPlans(environment,nativeSchema);}
export function enableDoLifecycle(environment,layouts){
 const {services,ctypes,memory}=environment,L=layouts.do,address=environment.address;
 const owner=nativeStateFor(environment);createNativeRecordViews(environment);
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const argumentsForBoundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 // Stable forwarding functions preserve .address identities attached by DO's
 // original adapter; unresolved dependency lookup stays lazy until invocation.
 const forwards=new Map(),local=new Proxy(Object.create(services),{get:(o,key,r)=>{
  if(Object.hasOwn(o,key))return Reflect.get(o,key,r);
  const existing=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;
  if(existing!==undefined&&typeof existing!=='function')return existing;
  if(typeof key!=='string')return existing;
  if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...argumentsForBoundary(args)));
  return forwards.get(key);
 }});
 const kinds=Object.keys(abi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.q||d.f?8:d.s?L[d.s+'Size']:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 const field=(kind,index)=>{const row=abi.schemas[kinds[kind]],f=row?.fields[index];if(!f)throw new Error('Unknown DO lifecycle field '+kind+':'+index);return{type:row.ctype,f};};
 const buffer=environment.allocateGlobal('do.wipebuf',abi.bufferBytes);
 const signature=prototype=>{
  const match=prototype.match(/^(.+?)\s*\((.*)\)$/);if(!match)throw new Error('Unknown DO callback prototype '+prototype);
  return[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':/\b(float|double)\b/.test(t)?'d':ctypes.size(t)===8?'j':'i';}).join('');
 };
 Object.assign(local,{nativeOwner:owner,nativeFieldPlans:createDoFieldPlans(environment),moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
  rectState:undefined,trackState:undefined,
  global:i=>{const row=abi.globals[i];if(!row)throw new Error('Unknown DO global '+i);return environment.requireGlobal(row.name);},
  read:(k,p,i)=>{const {type,f}=field(k,i);return f.d.a||f.d.s?BigInt(ctypes.locate(type,address(p),f.name).at):ctypes.getField(type,address(p),f.name,scalar(f.d));},
  write:(k,p,i,v)=>{const {type,f}=field(k,i);if(f.d.a||f.d.s)return memory.memmove(ctypes.locate(type,address(p),f.name).at,address(v),width(f.d));return ctypes.setField(type,address(p),f.name,scalar(f.d),v);},
  address:(k,p,i)=>{const {type,f}=field(k,i);return ctypes.locate(type,address(p),f.name).at;},
  buffer:()=>buffer,
  callbackPointer:i=>{const row=abi.callbackMap[i];if(!row)throw new Error('Unknown DO callback '+i);const own=['drop','wipeoff'].includes(row.name),privateName=own&&!Object.hasOwn(publicFunctions.functions,row.name);return environment.functionPointer(privateName?'do::'+row.name:row.name,signature(row.prototype),privateName?((...args)=>callDo(local,L,row.name,...args)):undefined);},
  rng:(kind,a,b,fn,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('do.c'),line,text(fn));const name=['rn2','rnd','d','rnz'][kind];if(!name)throw new Error('Unknown DO RNG operation '+kind);return kind===2?services.d(a,b):services[name](a);},
  impossiblePlain:message=>resolve('impossible')(text(message)),
  pline1:message=>resolve('pline')(services.literal('%s'),text(message)),
  mark_synch:()=>{const f=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_mark_synch');return environment.functions.indirect(memory.view.getBigUint64(f.at,true),'v');},
  y_n:prompt=>resolve('yn_function')(text(prompt),environment.requireGlobal('ynchars'),110,1),
 });
 // Native fixed variadic wrappers become typed calls to actual JS format/message
 // owners. The source marker supplies ABI metadata, never another format value.
 for(const name of new Set(abi.variadicSites.map(row=>row.name)))local[name]=(...args)=>{
  const marker=args.pop(),site=abi.variadicSites[marker?.varargSite];
  if(!site||site.name!==name)throw new Error('Missing/mismatched DO variadic ABI site '+name);
  const packed=args.map((v,i)=>{const type=site.types[i+site.prefix];if(!type)throw new Error('Extra DO variadic argument '+name);if(type.includes('*'))return /char/.test(type)?text(v):address(v);if(type==='long')return environment.transport.long(v);if(type==='unsigned long')return environment.transport.ulong(v);return environment.transport.int(v);});
  if(site.prefix)packed.unshift(services.literal(site.fn),site.line);
  return resolve(site.actual)(...packed);
 };
 const names=Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const entries=Object.fromEntries(names.map(name=>{const fn=(...args)=>callDo(local,L,name,...args);fn.nativeState=owner;fn.nativeDirect=true;fn.nativePrepared=true;owner.functions.set(name,fn);return[name,fn];}));
 environment.register('do-lifecycle',entries,local);
 return{services:local,buffer,exports:names,limitation:'Original DO shared transport connected; checkpointing, level transitions, item actions and other lifecycle dependencies require actual providers and original-C acceptance.'};
}
