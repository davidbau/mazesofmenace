// Original ALLMAIN turn policies retain the existing startup context/owner.
import * as allmain from '../ported/allmain.js';
import abi from './turn-loop-abi.json' with {type:'json'};
import {createNativeRecordViews} from './native/record-views.js';
import {createNativeTurnLoop} from './native/turn-loop.js';
import {nativeStateFor} from './native/state-bridge.js';

// BEGIN GENERATED ALLMAIN HEADERS
const heroHeaders=[
 C=>{return Number(!(Number(!(Number(Boolean(((((C.u).uprops)[64]).intrinsic&BigInt.asIntN(64,BigInt((~((67108864n|33554432n)|16777216n))))))||Boolean((((C.u).uprops)[64]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[64]).intrinsic)||Boolean((((C.u).uprops)[64]).extrinsic))))));},
 C=>{return Number(!(Number(!((((C.u).uprops)[21]).intrinsic))));},
 C=>{return Number(!(Number(!(((C.u).umonnum!=(C.u).umonster)))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[46]).intrinsic)||Boolean((((C.u).uprops)[46]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[61]).intrinsic)||Boolean((((C.u).uprops)[61]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[63]).intrinsic)||Boolean((((C.u).uprops)[63]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[34]).intrinsic)||Boolean((((C.u).uprops)[34]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[31]).intrinsic)||Boolean((((C.u).uprops)[31]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean(Number(Boolean((((C.u).uprops)[35]).intrinsic)||Boolean((((C.u).uprops)[35]).extrinsic)))&&Boolean(Number(!((((C.u).uprops)[35]).blocked))))))));},
 C=>{return Number(!(Number(!((((C.u).uprops)[35]).blocked))));},
 C=>{return Number(!(Number(!((C.u).uinwater))));},
 C=>{return Number(!(Number(!(Number(Boolean(Number(Boolean((((C.u).uprops)[15]).intrinsic)||Boolean((((C.u).uprops)[15]).extrinsic)))&&Boolean(Number(!((((C.u).uprops)[15]).blocked))))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[23]).intrinsic)&&Boolean(Number(!(Number(Boolean((((C.u).uprops)[24]).intrinsic)||Boolean((((C.u).uprops)[24]).extrinsic))))))))));},
 C=>{return Number(!(Number(!((((C.u).uprops)[30]).extrinsic))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[32]).intrinsic)||Boolean((((C.u).uprops)[32]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[58]).intrinsic)||Boolean((((C.u).uprops)[58]).extrinsic))))));},
 C=>{return Number(!(Number(!((((C.u).uprops)[52]).extrinsic))));},
 C=>{return Number(!(Number(!(Number(Boolean(Number(Boolean((((C.u).uprops)[52]).intrinsic)||Boolean((((C.u).uprops)[52]).extrinsic)))||Boolean((((((C.gy).youmonst).data).mflags1&BigInt.asUintN(64,BigInt(1024n)))!=BigInt.asUintN(64,BigInt(0n)))))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[57]).intrinsic)||Boolean((((C.u).uprops)[57]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[56]).intrinsic)||Boolean((((C.u).uprops)[56]).extrinsic))))));},
 C=>{return Number(!(Number(!(Number(Boolean((((C.u).uprops)[27]).intrinsic)||Boolean((((C.u).uprops)[27]).extrinsic))))));},
 C=>{return Number(!(Number(!((C.flags).debug))));}
];
const addressHeaders=[
 C=>{return (C.u).uz;},
 C=>{return (C.u).uz0;},
 C=>{return (C.u).ucamefrom;},
 C=>{return (C.gy).youmonst;},
 C=>{return ((C.svd).dungeon_topology).d_stronghold_level;},
 C=>{return (C.iflags).menu_headings;},
 C=>{return (C.svp).plname;}
];
const headerWindow=C=>{return (((C.windowprocs).wincap2&BigInt.asUintN(64,BigInt((8n|128n))))!=BigInt.asUintN(64,BigInt(0)));};
const headerIsmnum=(C,n)=>{return Number(Boolean((n>=0))&&Boolean((n<383)));};
const headerNoticeOn=C=>{do {if(((--(C.a11y).mon_notices_blocked)<0)){C.impossible(C.literal("mon_notices_blocked<0"));((C.a11y).mon_notices_blocked=0);}}while(0);};
const headerNoticeOff=C=>{do {((C.a11y).mon_notices_blocked++);}while(0);};
const headerNews=C=>{return C.literal("news");};
// END GENERATED ALLMAIN HEADERS

export function enableTurnLoop(environment,layouts,startup){
 const C=startup?.environment;
 if(!C)throw new Error('Turn loop requires the existing ALLMAIN startup context');
 if(layouts.allmain.pointerSize!==8||layouts.allmain.longSize!==8||layouts.allmain.timeSize!==8)
  throw new Error('Review changed ALLMAIN turn ABI');
 const {services,ctypes,memory,transport,functions}=environment,views=createNativeRecordViews(environment),nativeState=nativeStateFor(environment);
 const text=value=>typeof value==='string'?services.literal(value):environment.address(value);
 C.Role_if=role=>Number(views.record('struct instance_globals_u',environment.requireGlobal('gu')).urole.mnum===transport.int(role));
 const resolve=name=>nativeState.functions.get(name)??(typeof services[name]==='function'?services[name].nativeEntry??services[name]:environment.resolve(name));
 // ALLMAIN fields remain the actual DECL/role/window globals. Installing views
 // adds no initialization and never copies an existing owner's field values.
 for(const [name,sourceType]of Object.entries(abi.roots)){
  if(Object.hasOwn(C,name))continue;
  let type=ctypes.canonical(sourceType),at=environment.requireGlobal(name);
  if(type.endsWith('[]')){const child=type.slice(0,-2),count=abi.rootBytes[name]/ctypes.size(child);if(!Number.isSafeInteger(count))throw new Error('Invalid ALLMAIN array extent '+name);type=child+'['+count+']';}
  let record;try{record=ctypes.record(type);}catch{}
  if(record||type.includes('['))Object.defineProperty(C,name,{value:views.value(type,at),configurable:true});
  else Object.defineProperty(C,name,{get:()=>ctypes.load(type,at),set:value=>ctypes.store(type,at,value),configurable:true});
 }
 if(!Object.hasOwn(C,'allmainState')){
  const state={};for(const name of ['mvl_wtcap','mvl_change']){let value=transport.int(allmain[name]);Object.defineProperty(state,name,{get:()=>value,set:next=>{value=transport.int(next);},enumerable:true});}
  Object.defineProperty(C,'allmainState',{value:state});
 }
 const boundary=(sourceType,value)=>{
  const type=ctypes.canonical(sourceType);
  if(type==='void')return undefined;
  if(type.includes('*'))return typeof value==='string'?services.literal(value):environment.address(value);
  if(type==='float'||type==='double')return Number(value);
  if(type==='unsigned long'||type==='unsigned long long')return transport.ulong(value);
  if(type==='long'||type==='long long')return transport.long(value);
  if(type==='unsigned char')return transport.uchar(value);
  if(type==='signed char'||type==='char')return transport.char(value);
  if(type==='short')return transport.short(value);
  if(type==='unsigned short')return transport.ushort(value);
  if(type==='unsigned int'||type==='unsigned')return transport.uint(value);
  if(type==='int'||type.startsWith('enum '))return transport.int(value);
  throw new Error('Unconnected ALLMAIN scalar ABI '+sourceType);
 };
 // Source winprocs.h macros dispatch the installed window table, rather than
 // attempting to resolve a C function symbol for a header-only operation.
 for(const [name,row]of Object.entries(abi.windowMacros))if(!Object.hasOwn(C,name)){
  const match=row.type.match(/^(.*?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unknown ALLMAIN window callback '+name);
  const result=match[1].trim(),parameters=match[2].split(',').map(type=>type.trim()).filter(type=>type&&type!=='void'),code=type=>{type=ctypes.canonical(type);return type==='void'?'v':type.includes('*')?'p':type.includes('long')?'j':'i';},signature=[result,...parameters].map(code).join('');
  C[name]=(...args)=>{const offset=ctypes.record('struct window_procs').fields[row.field].offset,fn=memory.view.getBigUint64(environment.requireGlobal('windowprocs')+offset,true);return boundary(result,environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke(row.field,signature,...args.map((value,i)=>boundary(parameters[i],value))):functions.indirect(fn,signature,...args.map((value,i)=>boundary(parameters[i],value))));};
 }
 // Keep already-installed explicit header/callback transports (for example,
 // game-windows' create_nhwindow macro) on this same shared context.
 for(const [name,row]of Object.entries(abi.dependencies))if(!Object.hasOwn(C,name)){
  const call=(...args)=>{const selected=resolve(name);if(selected.nativeState===nativeState)return selected(...args);const result=nativeState.boundary(selected,...args.map((value,i)=>boundary(row.parameters[i],value)));return boundary(row.result,result);};
  Object.defineProperty(C,name,{configurable:true,enumerable:true,get(){const selected=nativeState.functions.get(name);return selected?.nativeState===nativeState?selected:call;},set(value){Object.defineProperty(C,name,{value,writable:true,configurable:true,enumerable:true});}});
 }
 const sourceCaller=(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('allmain.c'),transport.int(line),text(caller));};
 for(const kind of ['rn2','rnd'])C[kind]=(bound,line,caller)=>{sourceCaller(line,caller);return services[kind](transport.int(typeof bound==='function'?bound():bound));};
 C.rn1=(bounds,line,caller)=>{sourceCaller(line,caller);const pair=typeof bounds==='function'?bounds():bounds;return transport.int(services.rn2(transport.int(pair[0]))+transport.int(pair[1]));};
 C.literal=services.literal;
 abi.heroes.forEach((name,i)=>Object.defineProperty(C,name,{get:()=>Boolean(heroHeaders[i](C)),configurable:true}));
 for(const [name,i]of [['stronghold_level',4]])if(!Object.hasOwn(C,name))Object.defineProperty(C,name,{get:()=>addressHeaders[i](C),configurable:true});
 if(!Object.hasOwn(C,'menuHeadingsAddress'))Object.defineProperty(C,'menuHeadingsAddress',{get:()=>environment.address(addressHeaders[5](C)),configurable:true});
 Object.assign(C,{
  VIA_WINDOWPORT:()=>Boolean(headerWindow(C)),ismnum:n=>Boolean(headerIsmnum(C,transport.int(n))),
  notice_mon_off:()=>headerNoticeOff(C),notice_mon_on:()=>headerNoticeOn(C),
  callOccupation:fn=>transport.int(functions.indirect(fn,'i')),
  longFromDouble:value=>transport.long(Math.trunc(Number(value))),
  ACURR:attribute=>transport.int(resolve('acurr')(transport.int(attribute))),
  MON_AT:(x,y)=>Number(Boolean(C.svl.level.monsters[transport.short(x)][transport.short(y)])),
  m_at:(x,y)=>C.svl.level.monsters[transport.short(x)][transport.short(y)],
  nhassert:condition=>{if(!condition)resolve('nhassert_failed')(text(abi.assertion.text),text(abi.assertion.file),abi.assertion.line);},
  Sprintf:(out,format,...args)=>services.sprintf(environment.address(out),text(format),...args.map(value=>typeof value==='string'?services.literal(value):value?.address??value)),
 });
 if(!Object.hasOwn(C,'NEWS'))Object.defineProperty(C,'NEWS',{get:()=>headerNews(C),configurable:true});
 for(const name of ['phase_of_the_moon','friday_13th','night'])C[name]=(...args)=>environment.calendar(name,...args);
 for(const name of ['pline','urgent_pline','Norep','You','impossible','livelog_printf'])C[name]=(...args)=>resolve(name)(...args.map(value=>typeof value==='string'?services.literal(value):value?.address??value));
 // The caller needs a projected s_level, while the shared dungeon owner accepts
 // and returns C addresses. Its actual source find_level body remains the owner.
 C.find_level=name=>{const at=resolve('find_level')(text(name));return at?views.record('struct s_level',at):0;};
 C.nativeTurn=fn=>{const saved=transport.stackSave();nativeState.enter();try{return fn();}finally{try{nativeState.leave();}finally{transport.stackRestore(saved);}}};
 const native=createNativeTurnLoop(C);
 const entries=['moveloop_preamble','moveloop_core','moveloop','stop_occupation','timet_to_seconds','timet_delta'];
 const implementations=Object.fromEntries(entries.filter(name=>!environment.hasFunction(name)).map(name=>{let started=false;const invoke=(...args)=>{if(!started){environment.startModule('game-startup');started=true;}if(name==='moveloop_preamble'||name==='moveloop')args[0]=transport.char(args[0]);else if(name==='timet_to_seconds'||name==='timet_delta')args=args.map(transport.long);return name==='moveloop'?native[name](...args):C.nativeTurn(()=>native[name](...args));};invoke.nativeState=nativeState;invoke.nativeDirect=true;nativeState.functions.set(name,invoke);return [name,invoke];}));
 environment.extend('game-startup',implementations);
 return {environment:C,state:C.allmainState,entries:Object.keys(implementations),native,views,limitation:'Native ALLMAIN turns share startup state and canonical typed actors; finite recording acceptance is required separately.'};
}
