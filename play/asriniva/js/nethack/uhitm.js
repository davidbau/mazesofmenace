import {nativeStateFor} from './native/state-bridge.js';
import {createNativeRecordViews} from './native/record-views.js';
import {createNativeAbiCaster,installNativeDependency} from './native/execution.js';
// Whole original UHITM factory; record identity and private backing stay shared.
import abi from './uhitm-abi.json' with{type:'json'};
import * as source from '../ported/uhitm.js';
import{createUhitmEnvironment}from'./bindings/uhitm.js';
const owners=new WeakMap();
export function enableUhitm(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,L=layouts.uhitm,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review UHITM ABI '+k);
 const native=nativeStateFor(environment);createNativeRecordViews(environment);let context;
 const corpus=new Set(abi.literalCorpus),literal=v=>{if(!corpus.has(v))throw new Error('Review non-source UHITM literal '+v);return services.literal(v);},text=v=>typeof v==='string'?literal(v):address(v);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),local=Object.create(services);
 const signatures={Finish_digestion:'i',rn2_on_display_rng:'ii',xname:'pp'};
 const callback=name=>{if(!abi.callbacks.includes(name))throw new Error('Unknown UHITM callback '+name);return environment.functionPointer(name,signatures[name]);};
 const scalar=(type,v)=>{if(typeof v==='function'){const n=abi.callbacks.find(n=>v===local[n]||v===source[n]||v===context?.nativeNamespace[n]);if(!n)throw new Error('Unknown UHITM native callback identity');return address(callback(n));}if(type.includes('(*)')||/\(\s*\*\s*\)/.test(type))return address(v);type=ctypes.abiType(type);if(type==='void')return undefined;if(type.includes('*'))return text(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 for(const[name,row]of Object.entries(abi.calls)){const legacy=(...args)=>scalar(row.return,resolve(row.target)(...args.map((v,i)=>scalar(row.arguments[i],v)))),strings=row.arguments.flatMap((type,i)=>/\bchar\s*\*/.test(type)?[i]:[]);installNativeDependency(local,name,row.target,native,legacy,strings.length?args=>{for(const i of strings)if(typeof args[i]==='string')args[i]=text(args[i]);return args;}:undefined);}
 const shape=fmt=>{const f=typeof fmt==='string'?fmt:memory.readString(address(fmt));let out='';for(const m of f.matchAll(/%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?([lhz]*)([diouxXcsfFeEgGaAp%])/g)){if(m[5]==='%')continue;if(m[2]==='*')out+='i';if(m[3]==='*')out+='i';out+=/[fFeEgGaA]/.test(m[5])?'d':/[sp]/.test(m[5])?'p':m[4].includes('l')?'j':'i';}return out;};
 for(const[name,row]of Object.entries(abi.dispatch))local[name]=(...args)=>{const n=row.shapes[shape(args[row.formatIndex])],call=abi.variadic[n];if(!call||args.length!==call.arguments.length)throw new Error('Review UHITM '+name+' native format/arity');return scalar(call.return,resolve(call.target)(...args.map((v,i)=>scalar(call.arguments[i],v))));};
 const names=Object.keys(abi.globals),persistent=environment.allocateGlobal('uhitm.persistent',abi.persistentBytes);
 const bit=(i,p,v)=>{const r=abi.bits[i];if(!r)throw new Error('Unknown UHITM packed field '+i);return v===undefined?ctypes.getField(r.type,address(p),r.field,'unsigned int'):ctypes.setField(r.type,address(p),r.field,'unsigned int',transport.uint(v));};
 const window=(name,sig,...args)=>{if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke(name,sig,...args);const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name).at;return functions.indirect(memory.view.getBigUint64(at,true),sig,...args);};
 Object.assign(local,{nativeOwner:native,nativeRecordLayouts:Object.fromEntries(Object.keys(abi.records).map(type=>[type,ctypes.record(type)])),moduleKey:environment,heap:()=>memory.HEAPU8,literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{if(!names[i])throw new Error('Unknown UHITM global '+i);return environment.requireGlobal(names[i]);},persistent:i=>{if(abi.persistentOffsets[i]===undefined)throw new Error('Unknown UHITM backing '+i);return persistent+abi.persistentOffsets[i];},
  bit:(i,p)=>bit(i,p),setBit:(i,p,v)=>bit(i,p,v),callback,
  rngSource:(line,name)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('uhitm.c'),transport.int(line),text(name));},
  rn2:n=>resolve('rn2')(transport.int(n)),rn1:(n,b)=>resolve('rn2')(transport.int(n))+transport.int(b),rnd:n=>resolve('rnd')(transport.int(n)),rnl:n=>resolve('rnl')(transport.int(n)),d:(n,s)=>resolve('d')(transport.int(n),transport.int(s)),
  display_nhwindow:(w,b)=>window('win_display_nhwindow','vii',transport.int(w),transport.char(b)),nh_delay_output:()=>window('win_delay_output','v'),
 });
 for(const n of names)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 // One factory instance makes equal C pointers produce equal JS record objects.
 context=createUhitmEnvironment(local,L);
 const cast=createNativeAbiCaster(ctypes,transport,text);
 const prepared=new Map(Object.entries(abi.params).map(([name,types])=>[name,types.map(type=>{const target=type.replace(/\s*\*$/,'');if(type.endsWith('**')||type.endsWith('* *')||['int *','long *','short *'].includes(type))return value=>context.ref(target,address(value));if(type.endsWith('*')&&abi.records[target])return value=>context.record(target,value);return cast(type);})]));
 const prepare=(name,args)=>args.map((value,i)=>{const convert=prepared.get(name)?.[i];if(!convert)throw new Error('Unknown UHITM argument '+name+':'+i);return convert(value);});
 const call=(name,...args)=>{if(typeof context.nativeNamespace[name]!=='function')throw new Error('Unknown UHITM source function '+name);const saved=native.depth?undefined:transport.stackSave();native.enter();try{const result=context.nativeNamespace[name](...prepare(name,args));return typeof result==='string'?literal(result):result;}finally{try{native.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};
 const bind=name=>{const fn=(...args)=>call(name,...args);fn.nativeState=native;fn.nativeDirect=true;fn.nativePrepared=true;native.functions.set(name,fn);return fn;};
 const owner={context,services:local,persistent,exports:Object.keys(abi.public),call,limitation:'Native shared state and complete source bodies; private arrays, reference arguments, messages and remaining foreign owners retain byte/bridge boundaries.'};
 environment.register('uhitm',Object.fromEntries(owner.exports.map(n=>[n,bind(n)])),local);owners.set(environment,owner);return owner;
}
