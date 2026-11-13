// Original MHITU policy on its one cached native-view environment.
import abi from './mhitu-abi.json' with {type:'json'};
import {callMhitu,getMhituState} from './bindings/mhitu.js';
const owners=new WeakMap();
export function enableMhitu(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.mhitu,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MHITU ABI '+k);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t.includes('*'))return text(v);if(t==='void')return undefined;if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const local=Object.create(services),schemas=Object.values(abi.schemas);
 const field=(kind,p,i)=>{const row=schemas[kind],f=row?.fields[i];if(!f)throw new Error('Unknown MHITU field '+kind+':'+i);return{row,f,at:ctypes.locate(row.ctype,address(p),f.name).at};};
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){
  const m=prototype.match(/^(.+?)\s*\((.*)\)$/),args=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  local[name]=(...values)=>scalar(m[1],resolve(target)(...values.map((v,i)=>scalar(args[i],v))));
 }
 for(const[name,row]of Object.entries(abi.variadicABI))local[name]=(...args)=>{if(args.length!==row.types.length)throw new Error('MHITU format ABI '+name);return scalar(row.ret,resolve(row.name)(...args.map((v,i)=>scalar(row.types[i],v))));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const row=abi.globals[i];if(!row)throw new Error('Unknown MHITU global '+i);return environment.requireGlobal(row.name);},
  read:(k,p,i)=>{const{row,f,at}=field(k,p,i);return f.d.s||f.d.a?BigInt(at):BigInt(ctypes.getField(row.ctype,address(p),f.name,f.ctype));},
  write:(k,p,i,v)=>{const{row,f}=field(k,p,i);if(f.const)throw new Error('Write to MHITU const '+f.name);return ctypes.setField(row.ctype,address(p),f.name,f.ctype,v);},address:(k,p,i)=>field(k,p,i).at,
  callbackPointer:i=>{const n=abi.callbacks[i];if(!n)throw new Error('Unknown MHITU callback '+i);return environment.functionPointer(n,'pp');},
  displayWindow:(w,b)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_display_nhwindow').at;return functions.indirect(memory.view.getBigUint64(at,true),'vii',transport.int(w),transport.char(b));},
  rngCaller:i=>{const row=abi.rngSites[i];if(!row)throw new Error('Unknown MHITU RNG site '+i);if(services.rng_log_enabled())services.rng_log_set_caller(text('mhitu.c'),row.line,text(row.function));},
  rn2Value:n=>resolve('rn2')(transport.int(n)),rndValue:n=>resolve('rnd')(transport.int(n)),rnlValue:n=>resolve('rnl')(transport.int(n)),dValue:(n,s)=>resolve('d')(transport.int(n),transport.int(s)),
 });
 for(const row of abi.globals)Object.defineProperty(local,row.name,{value:undefined,writable:true,configurable:true});
 const owner={services:local,state:getMhituState(local),call:(name,...args)=>callMhitu(local,L,name,...args.map(v=>v?.address??v)),exports:abi.public,limitation:'Original MHITU native transport; connected combat and special/fatal branches require original-C verification and real foreign owners.'};
 environment.register('mhitu',Object.fromEntries(abi.public.filter(n=>!environment.hasFunction(n)).map(n=>[n,(...args)=>owner.call(n,...args)])),local);
 owners.set(environment,owner);return owner;
}
