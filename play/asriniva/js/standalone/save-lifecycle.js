// Original SAVE policies on shared records, real files and serializer owners.
import abi from './save-lifecycle-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as source from '../ported/save.js';
import {createSaveEnvironment} from '../nethack/bindings/save.js';

export function enableSaveLifecycle(environment,layouts){
 const {services,ctypes,memory,transport,functions}=environment,L=layouts.save,address=environment.address;
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const forwards=new Map(),local=new Proxy(Object.create(services),{get:(o,key,r)=>{
  if(Object.hasOwn(o,key))return Reflect.get(o,key,r);
  const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;
  if(value!==undefined&&typeof value!=='function')return value;
  if(typeof key!=='string')return value;
  if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));
  return forwards.get(key);
 }});
 const kinds=Object.keys(abi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const width=d=>d.t?Number(d.t.slice(1))/8:d.p!==undefined||d.f?8:d.s?L[d.s+'Size']:d.a.reduce((a,b)=>a*b,1)*width(d.e);
 const field=(kind,index)=>{const row=abi.schemas[kinds[kind]],f=row?.fields[index];if(!f)throw new Error('Unknown SAVE field '+kind+':'+index);return{type:row.ctype,f};};
 const zeroNames=Object.keys(abi.zeroStorage),zeros=zeroNames.map(name=>environment.allocateGlobal('save.'+name,abi.zeroStorage[name]));
 const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':/\b(float|double)\b/.test(t)?'d':ctypes.size(t)===8?'j':'i';};
 function windowCall(name,...args){
  const row=abi.schemas.window_procs.fields.find(f=>f.name===name),m=row?.ctype.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);
  if(!m)throw new Error('Unknown SAVE window callback '+name);
  const signature=[m[1],...m[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');
  const f=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name);
  return functions.indirect(memory.view.getBigUint64(f.at,true),signature,...boundary(args));
 }
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,
  rectState:undefined,trackState:undefined,
  global:i=>{if(i<abi.globals.length)return environment.requireGlobal(abi.globals[i].name);const p=zeros[i-abi.globals.length];if(!p)throw new Error('Unknown SAVE global '+i);return p;},
  read:(k,p,i)=>{const {type,f}=field(k,i);return f.d.a||f.d.s?BigInt(ctypes.locate(type,address(p),f.name).at):ctypes.getField(type,address(p),f.name,scalar(f.d));},
  write:(k,p,i,v)=>{const {type,f}=field(k,i);if(f.d.a||f.d.s)return memory.memmove(ctypes.locate(type,address(p),f.name).at,address(v),width(f.d));return ctypes.setField(type,address(p),f.name,scalar(f.d),v);},
  address:(k,p,i)=>{const {type,f}=field(k,i);return ctypes.locate(type,address(p),f.name).at;},
  sigIgn:()=>BigInt(abi.SIG_IGN),
  clear_nhwindow:win=>windowCall('win_clear_nhwindow',transport.int(win)),
  display_nhwindow:(win,block)=>windowCall('win_display_nhwindow',transport.int(win),transport.char(block)),
  exit_nhwindows:message=>windowCall('win_exit_nhwindows',text(message)),
  mark_synch:()=>windowCall('win_mark_synch'),getmsghistory:init=>windowCall('win_getmsghistory',transport.char(init)),
  y_n:prompt=>resolve('yn_function')(text(prompt),environment.requireGlobal('ynchars'),110,1),
  sound:(callback,message)=>functions.indirect(callback,'vp',text(message)),
  pline:message=>resolve('pline')(services.literal('%s'),text(message)),
  pline1:message=>resolve('pline')(services.literal('%s'),text(message)),
  There:message=>resolve('There')(services.literal('%s'),text(message)),
  panic:message=>resolve('panic')(services.literal('%s'),text(message)),
  impossible:message=>resolve('impossible')(services.literal('%s'),text(message)),
  debugEnabled:()=>resolve('debugcore')(services.literal(abi.sourceFile),0),
  debugMessage:(message,value)=>resolve('pline')(text(message),transport.int(value)),
  Sprintf:(out,format,a,b)=>services.sprintf(address(out),text(format),transport.int(a),transport.int(b)),
  Snprintf:(out,n,format,...args)=>resolve('nh_snprintf')(services.literal('store_plname_in_file'),abi.snprintfLine,address(out),transport.ulong(n),text(format),...args.map(text)),
  Strlen:(input,site)=>{const row=abi.strlenSites[site];if(!row)throw new Error('Unknown SAVE Strlen site '+site);return environment.strutil('Strlen_',text(input),services.literal(row.function),row.line);},
  assert:value=>{if(!value)return resolve('__assert_fail')(services.literal("hero[PL_NSIZ_PLUS - 1 - 1] == '\\0'"),services.literal(abi.sourceFile),abi.assertLine,services.literal('store_plname_in_file'));},
 });
 // SAVE's unchanged factory enumerates these own aliases to materialize C
 // reference arguments and copy their values back through real SF owners.
 for(const [name,target]of Object.entries(abi.serializers))local[name]=(...args)=>resolve(target)(...boundary(args));
 const context=createSaveEnvironment(local,L);
 const names=Object.keys(source).filter(name=>typeof source[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const parameters=name=>{const match=publicFunctions.functions[name].match(/^(.+?)\s*\((.*)\)$/);if(!match)throw new Error('Unknown SAVE prototype '+name);return match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');};
 environment.register('save-lifecycle',Object.fromEntries(names.map(name=>[name,source[name]])),context,{prepareArgs:(name,args)=>args.map((value,i)=>{
  const type=parameters(name)[i];if(!type)throw new Error('Extra SAVE argument '+name);
  if(type==='NHFILE *')return context.view('nh_file',address(value));
  if(type==='struct cemetery **')return context.pointerCell('cemetery',address(value));
  if(type==='xint8')return transport.char(value);
  if(type.includes('*'))return text(value);
  return value;
 })});
 return{services:local,context,zeros,exports:names,limitation:'Original SAVE transport connected; checkpoint files, serialized ownership graphs, error/cleanup paths and full save/restore require original-C acceptance.'};
}
