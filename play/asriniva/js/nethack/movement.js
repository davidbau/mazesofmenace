// One native HACK owner connects movement, travel, shared state and direct calls.
import abi from './hack-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as original from '../ported/hack.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeAbiCaster} from './native/execution.js';
import {createNativeHackState,nativeHackMembers} from './native/hack-state.js';
import {createNativeHackEntries} from './native/hack-entries.js';
import {createNativeHackCalls} from './native/hack-calls.js';
import {parseCPrototype} from '../c-runtime/prototypes.js';
const owners=new WeakMap();
export function enableMovement(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,functions,ctypes,transport}=environment,owner=nativeStateFor(environment),L=Object.freeze({...layouts.hack}),text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 const resolve=name=>owner.functions.get(name)??services[name]?.nativeEntry??(typeof services[name]==='function'?services[name]:environment.resolve(name));
 let context;const local=Object.create(services),getContext=()=>context??=createNativeHackState(local,L),entries=createNativeHackEntries(getContext,owner,transport,services.literal);
 const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'||t==='double'?'d':ctypes.size(t)===8?'j':'i';};
 function pointer(name){const row=abi.callbacks[name]??parseCPrototype(publicFunctions.functions[name]??'');const result=row.result,parameters=row.parameters;return environment.functionPointer(Object.hasOwn(publicFunctions.functions,name)?name:'hack::'+name,[result,...parameters].map(code).join(''),abi.callbacks[name]?((...args)=>entries[name](...args)):undefined);}
 const cast=createNativeAbiCaster(ctypes,transport,text),plan=type=>{const convert=cast(type),pointerType=type.includes('*'),recordPointer=pointerType&&ctypes.isRecord(type.replace(/^const /,'').replace(/\s*\*$/,''));const argument=v=>typeof v==='function'?getContext().functionPointer(v):v;return{foreign:v=>convert(argument(v)),native:pointerType?v=>{v=argument(v);return v&&typeof v==='object'?v:convert(v);}:convert,result:recordPointer?v=>v:convert};};
 Object.assign(local,createNativeHackCalls(resolve,owner,plan,ref=>getContext().commitRef(ref)));
 let buffer;try{buffer=environment.requireGlobal('hack.in_rooms.buf');}catch(e){if(!e.message.startsWith('Unresolved standalone global '))throw e;buffer=environment.allocateGlobal('hack.in_rooms.buf',5);}
 Object.assign(local,{nativeEnvironment:environment,nativeLayouts:layouts,moduleKey:environment,nativeGlobalBindings:true,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>environment.requireGlobal(abi.globals[i].name),functionPointer:i=>pointer(abi.functions[i]),foreignFunctionPointer:i=>pointer(['Boots_on','do_reqmenu','dokick'][i]),inRoomsBuffer:()=>buffer,callIntFunction:fn=>owner.boundary(functions.indirect,fn,'i'),
  rngCaller:(line,caller)=>{const n=transport.int(line),name=typeof caller==='string'?caller:memory.readString(environment.address(caller));if(!abi.rngCallers.some(row=>row[0]===n&&row[1]===name))throw Error('Unexpected HACK RNG caller');if(services.rng_log_enabled())services.rng_log_set_caller(text('hack.c'),n,text(caller));},
 });
 const families=['Norep','There','You','You_cant','You_feel','You_hear','Your','impossible','livelog_printf','nh_snprintf','panic','pline','pline_The','pline_dir','pline_xy','raw_printf','sprintf','urgent_pline','verbalize'],formatted=new Map();
 local.formatted=key=>{if(formatted.has(key))return formatted.get(key);const family=families.find(n=>key.startsWith(n+'_')&&/^[pijd]+$/.test(key.slice(n.length+1)));if(!family)throw Error('Unknown native HACK format '+key);const shape=key.slice(family.length+1),converts=[...shape].map(c=>c==='p'?text:c==='j'?BigInt:c==='i'?v=>Number(BigInt.asIntN(32,BigInt(v))):Number),fn=(...args)=>{if(args.length!==converts.length)throw Error('Native HACK format arity '+key);return owner.boundary(resolve(family),...args.map((v,i)=>converts[i](v)));};formatted.set(key,fn);return fn;};
 const window=(field,signature,...args)=>environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke(field,signature,...args):owner.boundary(functions.indirect,memory.view.getBigUint64(environment.requireGlobal('windowprocs')+ctypes.record('struct window_procs').fields[field].offset,true),signature,...args);
 Object.assign(local,{create_nhwindow:t=>window('win_create_nhwindow','ii',transport.int(t)),destroy_nhwindow:w=>window('win_destroy_nhwindow','vi',transport.int(w)),display_nhwindow:(w,b)=>window('win_display_nhwindow','vii',transport.int(w),transport.char(b)),putstr:(w,a,s)=>window('win_putstr','viip',transport.int(w),transport.int(a),text(s)),start_menu:(w,f)=>window('win_start_menu','vij',transport.int(w),transport.ulong(f)),end_menu:(w,s)=>window('win_end_menu','vip',transport.int(w),text(s)),nh_delay_output:()=>window('win_delay_output','v'),raw_print:s=>window('win_raw_print','vp',text(s))});
 // Preserve the earlier provider's shared static buffer during original initialization.
 const prior=memory.readBytes(buffer,5);original.initializeHackData(getContext());memory.HEAPU8.set(prior,buffer);
 const names=abi.functions.filter(n=>Object.hasOwn(publicFunctions.functions,n)&&!environment.hasFunction(n));for(const name of names)owner.functions.set(name,entries[name]);environment.register('movement',Object.fromEntries(names.map(n=>[n,entries[n]])));
 const previous=environment.start('level-invocation');for(const name of ['invocation_pos','in_rooms']){if(previous.namespace[name]!==original[name])throw Error('Unexpected earlier HACK owner '+name);previous.namespace[name]=entries[name];owner.functions.set(name,entries[name]);}
 const graph={services:local,context:getContext(),entries,pointer,ctypes,call:(name,...args)=>{if(!entries[name])throw Error('Unknown native HACK entry '+name);return entries[name](...args);},limitation:'Complete native movement context and calls; genuine byte buffers, local records, foreign calls and dynamic callbacks retain boundaries.'};owners.set(environment,graph);return graph;
}
