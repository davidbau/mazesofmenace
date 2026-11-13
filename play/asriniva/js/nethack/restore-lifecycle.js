// Original RESTORE on shared records/files and native reference semantics.
import abi from './restore-lifecycle-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/restore.js';
import {callRestore} from './bindings/restore.js';
import {createCTypes} from './c-types.js';

export function enableRestoreLifecycle(environment,layouts){
 const {memory,services,transport,functions}=environment,address=environment.address,L=layouts.restore;
 const ctypes=createCTypes(memory,{...records,records:{...records.records,...abi.records}},environment.bitfields);
 const text=v=>typeof v==='string'?services.literal(v):address(v),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 const forwards=new Map(),local=new Proxy(Object.create(services),{get:(o,key,r)=>{
  if(Object.hasOwn(o,key))return Reflect.get(o,key,r);
  const value=Reflect.get(o,key,r);if(value!==undefined&&typeof value!=='function')return value;
  if(typeof key!=='string')return value;
  if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));
  return forwards.get(key);
 }});
 const kinds=Object.keys(abi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.f?8:d.s?L[d.s+'Size']:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 const field=(kind,index)=>{const name=kinds[kind],f=abi.schemas[name]?.fields[index];if(!f)throw new Error('Unknown RESTORE field '+kind+':'+index);return{type:abi.recordTypes[name],f};};
 const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':/\b(float|double)\b/.test(t)?'d':ctypes.size(t)===8?'j':'i';};
 function windowCall(name,...args){
  const row=ctypes.record('struct window_procs').fields[name],m=row?.ctype.replace(new RegExp('\\s+'+name+'$'),'').match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!m)throw new Error('Unknown RESTORE window callback '+name);
  const signature=[m[1],...m[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');
  const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name).at;
  return functions.indirect(memory.view.getBigUint64(at,true),signature,...boundary(args));
 }
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
  global:i=>{const row=abi.globals[i];if(!row)throw new Error('Unknown RESTORE global '+i);return environment.requireGlobal(row.name);},
  read:(k,p,i)=>{const{type,f}=field(k,i);return f.d.a||f.d.s?BigInt(ctypes.locate(type,address(p),f.name).at):ctypes.getField(type,address(p),f.name,scalar(f.d));},
  write:(k,p,i,v)=>{const{type,f}=field(k,i);if(f.d.a||f.d.s)return memory.memmove(ctypes.locate(type,address(p),f.name).at,address(v),width(f.d));return ctypes.setField(type,address(p),f.name,scalar(f.d),v);},
  address:(k,p,i)=>{const{type,f}=field(k,i);return ctypes.locate(type,address(p),f.name).at;},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  pline:(message,value)=>resolve('pline')(text(message),text(value??0)),You:message=>resolve('You')(text(message)),
  pline1:message=>resolve('pline')(services.literal('%s'),text(message)),impossible:message=>resolve('impossible')(text(message)),panic:(message,n)=>resolve('panic')(text(message),transport.int(n??0)),
  debugEnabled:()=>resolve('debugcore')(services.literal('restore.c'),1),debugMessage:(message,n)=>resolve('pline')(text(message),transport.int(n)),
  Sprintf:(out,format,a,b,c)=>{const fmt=typeof format==='string'?format:memory.readString(text(format));if(fmt==='%.*s')return services.sprintf(address(out),text(format),transport.int(a),text(b));if(fmt==='%c %.*s')return services.sprintf(address(out),text(format),transport.int(a),transport.int(b),text(c));return services.sprintf(address(out),text(format),transport.int(a??0),transport.int(b??0),text(c??0));},
  assert:(ok,index)=>{if(ok)return;const row=abi.assertions[index];if(!row)throw new Error('Unknown RESTORE assertion '+index);return resolve('__assert_fail')(text(row.expression),text(row.file),row.line,text(row.function));},
  rnd:(n,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('restore.c'),transport.int(line),services.literal('getlev'));return services.rnd(transport.int(n));},
 });
 for(const[name,target]of Object.entries(abi.serializers))local[name]=(...args)=>resolve(target)(...boundary(args));
 const callbacks={cliparound:'win_cliparound',clear_nhwindow:'win_clear_nhwindow',display_nhwindow:'win_display_nhwindow',wait_synch:'win_wait_synch',create_nhwindow:'win_create_nhwindow',start_menu:'win_start_menu',end_menu:'win_end_menu',select_menu:'win_select_menu',destroy_nhwindow:'win_destroy_nhwindow',add_menu:'win_add_menu',putstr:'win_putstr',putmsghistory:'win_putmsghistory'};
 for(const[name,target]of Object.entries(callbacks))local[name]=(...args)=>windowCall(target,...args);
 const exports=Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const parameters=name=>{const m=publicFunctions.functions[name]?.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown RESTORE public prototype '+name);return m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');};
 const convert=(type,value)=>{type=ctypes.abiType(type);if(type.includes('*'))return text(value);if(type.startsWith('enum '))return transport.int(value);const n=ctypes.size(type);return n===8?type.startsWith('unsigned')?transport.ulong(value):transport.long(value):n===1?type.startsWith('unsigned')?transport.uchar(value):transport.char(value):n===2?type.startsWith('unsigned')?transport.ushort(value):transport.short(value):type.startsWith('unsigned')?transport.uint(value):transport.int(value);};
 environment.register('restore-lifecycle',Object.fromEntries(exports.map(name=>[name,(...args)=>{const params=parameters(name),result=callRestore(local,L,name,...args.map((value,i)=>convert(params[i],value)));return result?.address??result;}])));
 return{services:local,exports,limitation:'Original RESTORE transport connected on shared state; object/monster graphs, ghost mapping, recovery/errors and full save/resume require original-C verification.'};
}
