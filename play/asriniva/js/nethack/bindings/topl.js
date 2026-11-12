import * as CAdapter from '../../c-runtime/adapter-factories.js';
import {applyRecordAliases,createFieldAliases,applyPrototypeAliases} from '../header-aliases.js';
import * as Crt from '../../c-runtime/adapter-memory.js';
// TOPL typed native storage/dependencies/header transport; source algorithms stay in topl.js.
import * as core from '../../ported/topl.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const fieldAliases=createFieldAliases('topl');
const recordSizeKeys={"struct instance_flags":"R0_size","struct DisplayDesc":"R1_size","struct window_procs":"R2_size","struct WinDesc":"R3_size","struct instance_globals_t":"R4_size","struct sinfo":"R5_size","struct tc_gbl_data":"R6_size","struct flag":"R7_size","struct instance_globals_s":"R8_size"};
const records={"struct instance_flags":{"prevmsg_window":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R0_F0","record":0},"debug_fuzzer":{"type":"signed char","sourceType":"xint8","bit":false,"const":false,"key":"R0_F1","record":0}},"struct DisplayDesc":{"inread":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F0","record":1},"dismiss_more":{"type":"char","sourceType":"char","bit":false,"const":false,"key":"R1_F1","record":1},"toplin":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F2","record":1},"topl_utf8":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F3","record":1},"mixed":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F4","record":1},"curx":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R1_F5","record":1},"cury":{"type":"short","sourceType":"short","bit":false,"const":false,"key":"R1_F6","record":1},"inmore":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F7","record":1},"intr":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R1_F8","record":1}},"struct window_procs":{"win_create_nhwindow":{"type":"winid (*)(int)","sourceType":"winid (*)(int)","bit":false,"const":false,"key":"R2_F0","record":2},"win_putstr":{"type":"void (*)(winid, int, char *)","sourceType":"void (*)(winid, int, const char *)","bit":false,"const":false,"key":"R2_F1","record":2},"win_display_nhwindow":{"type":"void (*)(winid, boolean)","sourceType":"void (*)(winid, boolean)","bit":false,"const":false,"key":"R2_F2","record":2},"win_destroy_nhwindow":{"type":"void (*)(winid)","sourceType":"void (*)(winid)","bit":false,"const":false,"key":"R2_F3","record":2}},"struct WinDesc":{"maxcol":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F0","record":3},"maxrow":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F1","record":3},"data":{"type":"char **","sourceType":"char **","bit":false,"const":false,"key":"R3_F2","record":3},"rows":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F3","record":3},"flags":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R3_F4","record":3},"curx":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F5","record":3},"cury":{"type":"long","sourceType":"long","bit":false,"const":false,"key":"R3_F6","record":3},"datlen":{"type":"short *","sourceType":"short *","bit":false,"const":false,"key":"R3_F7","record":3}},"struct instance_globals_t":{"toplines":{"type":"char[300]","sourceType":"char[300]","bit":false,"const":false,"key":"R4_F0","record":4},"tc_gbl_data":{"type":"struct tc_gbl_data","sourceType":"struct tc_gbl_data","bit":false,"const":false,"key":"R4_F1","record":4}},"struct sinfo":{"in_checkpoint":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R5_F0","record":5}},"struct tc_gbl_data":{"tc_CO":{"type":"int","sourceType":"int","bit":false,"const":false,"key":"R6_F0","record":6}},"struct flag":{"standout":{"type":"signed char","sourceType":"boolean","bit":false,"const":false,"key":"R7_F0","record":7}},"struct instance_globals_s":{"saved_pline_index":{"type":"unsigned int","sourceType":"unsigned int","bit":false,"const":false,"key":"R8_F0","record":8}}};
const globals={"wins":"struct WinDesc *[20]","WIN_MESSAGE":"int","iflags":"struct instance_flags","ttyDisplay":"struct DisplayDesc *","windowprocs":"struct window_procs","gt":"struct instance_globals_t","morc":"char","program_state":"struct sinfo","BASE_WINDOW":"int","flags":"struct flag","defmorestr":"char[]","yn_number":"long","quitchars":"char[]","erase_char":"char","gs":"struct instance_globals_s"};
const params={"tty_doprev_message":[],"redotoplin":["char *"],"show_topl":["char *"],"remember_topl":[],"addtopl":["char *"],"more":[],"update_topl":["char *"],"topl_putsym":["char"],"putsyms":["char *"],"removetopl":["int"],"tty_yn_function":["char *","char *","char"],"msghistory_snapshot":["signed char"],"free_msghistory_snapshot":["signed char"],"tty_getmsghistory":["signed char"],"tty_putmsghistory":["char *","signed char"]};
const returnRecords={};
const CALLER_NAMES=["tty_doprev_message", "redotoplin", "show_topl", "remember_topl", "addtopl", "more", "update_topl", "topl_putsym", "putsyms", "removetopl", "tty_yn_function", "msghistory_snapshot", "free_msghistory_snapshot", "tty_getmsghistory", "tty_putmsghistory"];
const LONG_CONSTANTS=[];
const CALLBACK_NAMES=[];
const CALLBACK_CONSUMERS=["askchain", "at_quick_exit", "atexit", "bhit", "bhitpile", "bsearch", "cmd_from_func", "cmdname_from_func", "cmdq_add_ec", "collect_coords", "collect_obj_classes", "container_gone", "count_buc", "detecting", "distant_name", "do_clear_area", "ecname_from_fn", "ext_func_tab_from_func", "get_iter_mons", "get_iter_mons_xy", "get_rnd_text", "getobj", "getpos_sethilite", "ggetobj", "init_isaac64", "init_random", "iter_mons", "iter_mons_safe", "linedup_callback", "nh_deterministic_qsort", "parse_conf_file", "parse_conf_str", "qsort", "qsort_r", "query_objlist", "reseed_random", "ripoffline", "ripoffline_sp", "safe_qbuf", "set_occupation", "set_selection_floodfillchk", "sethanguphandler", "short_oname", "signal", "sigset", "singular", "sortloot", "teleport_native_signal", "tputs", "walk_path"];
export function createToplEnvironment(services,L){
 const raw=v=>CAdapter.unsignedPointer(v),address=v=>Number(raw(v));
 const view=()=>CAdapter.currentDataView(services),literal=v=>typeof v==='string'?services.literal(v):address(v);
 const scalarType=t=>(Crt.scalarMethod(t));
 const widths={Int8:1,Uint8:1,Int16:2,Uint16:2,Int32:4,Uint32:4,BigInt64:8,BigUint64:8};
 const size=t=>t.includes('*')?L.pointerSize:scalarType(t)?widths[scalarType(t)]:records[t]?L[recordSizeKeys[t]]:(()=>{throw Error('Review TOPL native type '+t);})();
 const write=(t,p,v)=>{const method=scalarType(t);if(method)view()['set'+method](p,method.startsWith('Big')?BigInt(v):Number(v),true);else if(t.includes('*'))view().setBigUint64(p,raw(typeof v==='function'?env.callbackAddress(v):typeof v==='string'?literal(v):v),true);else services.heap().copyWithin(p,address(v),address(v)+size(t));return v;};
 const seq=(p,t,stride)=>Crt.pointerSequence(read,write,records,record,p,t,stride);
 function read(t,p){
  const method=scalarType(t);if(method)return view()['get'+method](p,true);
  const array=t.match(/^(.*?)\[(\d*)\](.*)$/);if(array){if(array[1]==='char'&&!array[3])return p;const elem=array[1]+array[3],stride=array[3]?size(array[1])*Number(array[3].match(/\d+/)[0]):size(elem);if(array[1]==='char'&&!array[3])return p;return seq(p,elem,stride);}
  if(t.includes('(*)'))return Number(view().getBigUint64(p,true));
  if(t.endsWith('*')){const at=Number(view().getBigUint64(p,true));if(!at)return 0;const target=t.slice(0,-1).trim();return records[target]?record(target,at):target.endsWith('*')?seq(at,target,L.pointerSize):scalarType(target)&&target!=='char'?seq(at,target,size(target)):at;}
  if(records[t])return record(t,p);
  throw Error('Review TOPL read type '+t);
 }
 const recordCache=new Map();
 const record=CAdapter.createTypedRecordFactory({services,L,records,address,size,read,write,decorate:(t,out)=>CAdapter.installStringAliases(out,fieldAliases,true),cache:recordCache,primitive:true,immutableErrorPrefix:"TOPL immutable field ",unknownErrorPrefix:"Unknown TOPL "});
 const env=Object.assign(Object.create(services),L,{
  record,
  int:v=>Number(BigInt.asIntN(32,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),uint:v=>Number(BigInt.asUintN(32,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),
  char:v=>Number(BigInt.asIntN(8,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),short:v=>Number(BigInt.asIntN(16,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),
  boolean:v=>Number(BigInt.asIntN(8,(typeof v==='bigint'?v:BigInt(Math.trunc(v))))),long:v=>BigInt.asIntN(64,BigInt(v)),
  byte:p=>Object.defineProperty({address:literal(p)},'value',{get:()=>view().getInt8(literal(p)),set:v=>view().setInt8(literal(p),Number(v))}),
  ref:(t,p)=>{p=address(p);return p?Object.defineProperty({address:p},'value',{get:()=>read(t,p),set:v=>write(t,p,v)}):0;},
  localScalar:(t,v)=>{const p=Number(services.stackAlloc(size(t)));write(t,p,v);return env.ref(t,p);},
  localArray:(t,n)=>seq(Number(services.stackAlloc(size(t)*n)),t,size(t)),
  localRecord:t=>record(t,services.stackAlloc(size(t))),
  fieldRef:(o,name)=>{const f=records[o.nativeType][fieldAliases[name]??name];if(!f||f.bit||f.const)throw Error('Review TOPL addressable field '+name);return env.ref(f.type,o.address+L[f.key]);},
  assignField:(o,k,v)=>{o[k]=v;return o[k];},samePtr:(a,b)=>raw(a)===raw(b),
  callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
  SIZE:a=>a.length,min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,abs:Math.abs,
 });
 const globalAddresses=new Map(); let index=0;
 for(const[name,type]of Object.entries(globals)){
  const p=Number(services.global(index++));globalAddresses.set(name,p);
  if(records[type])env[name]=record(type,p);
  else Object.defineProperty(env,name,{get:()=>read(type,p),set:v=>write(type,p,v)});
 }
 env.uchar=v=>Number(BigInt.asUintN(8,BigInt(v)));
 env.div=(a,b)=>typeof a==='bigint'||typeof b==='bigint'?env.long(a)/env.long(b):Math.trunc(a/b);
 const scalarArgument=(t,v)=>t==='char *'?literal(v):t==='int'?env.int(v):t==='unsigned int'?env.uint(v):t==='short'?env.short(v):t==='unsigned char'?env.uchar(v):t==='char'||t==='signed char'?env.char(v):t==='long'||t==='unsigned long'?env.long(v):v;
 env.callLocal=(fn,...args)=>{const saved=services.stackSave();try{for(const[i,t]of(params[fn.name]??[]).entries())args[i]=scalarArgument(t,args[i]);return fn(...args);}finally{services.stackRestore(saved);}};
 Object.defineProperty(env,'CO',{get:()=>env.gt.tc_gbl_data.tc_CO});
 env.C=c=>(0x1f&c);
 // Actual AppendLongDigit definition; source arguments are scalar locals.
 const LONG_MAX=9223372036854775807n;
 env.AppendLongDigit=(L,D)=>((L<LONG_MAX/10n||(L===LONG_MAX/10n&&D<=LONG_MAX%10n))?env.long(L*10n+D):-1n);
 env.toplAssert=(expression,line,value)=>{if(!value)services.nhassert_failed(expression,'../win/tty/topl.c',line);};
 for(const[name,type,i]of[['snapshot_mesgs','char **',0],['nxtidx','int',1],['initd','signed char',2]])Object.defineProperty(env,name,{get:()=>read(type,services.persistent(i)),set:v=>write(type,services.persistent(i),v)});
 if(!services.moduleKey.teleportToplPersistentInitialized){env.snapshot_mesgs=0;env.nxtidx=0;env.initd=0;services.moduleKey.teleportToplPersistentInitialized=true;}
 env.rectState=undefined;env.trackState=undefined;
 return new Proxy(env,{get:(o,k,r)=>{if(typeof k==='string'&&!Reflect.has(o,k))throw Error('Missing TOPL environment key '+k);return Reflect.get(o,k,r);}});

}
export function callTopl(services,layout,name,...args){
 const saved=services.stackSave();
 try{
  const env=createToplEnvironment(services,layout);
  for(const[i,t]of(params[name]??[]).entries()){
   const target=t.replace(/\s*\*$/,'');
   if(t.endsWith('**')||t.endsWith('* *'))args[i]=env.ref(t.slice(0,-1).trim(),args[i]);
   else if(t==='int *'||t==='long *'||t==='short *')args[i]=env.ref(t.slice(0,-1).trim(),args[i]);
   else if(t.endsWith('*')&&records[target])args[i]=env.record(target,args[i]);
   else if(t==='void *'||t==='char *')args[i]=Number(args[i]?.address??args[i]??0);
   else if(t==='signed char'||t==='char')args[i]=env.char(args[i]);
   else if(t==='short')args[i]=env.short(args[i]);
   else if(t==='unsigned char')args[i]=env.uchar(args[i]);
   else if(t==='unsigned int')args[i]=env.uint(args[i]);
   else if(t==='int')args[i]=env.int(args[i]);
   else if(t==='long'||t==='long long')args[i]=env.long(args[i]);
  }
  const result=withCEnvironment(env,()=>core[name](...args));
  return typeof result==='string'?services.literal(result):result?.address??result;
 }finally{services.stackRestore(saved);}
}
