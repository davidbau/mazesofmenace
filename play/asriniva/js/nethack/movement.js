// Live shared storage/typed calls for the unchanged HACK adapter.
import abi from './hack-abi.json' with {type:'json'};
import records from './records.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import {createCTypes} from './c-types.js';
import * as hack from '../ported/hack.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createHackEnvironment,callHack} from './bindings/hack.js';
export function enableMovement(environment,layouts){
 const {services,memory,functions}=environment,L=Object.freeze({...layouts.hack});
 const ctypes=createCTypes(memory,{...records,records:{...records.records,...abi.records}},environment.bitfields);
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v),families=['Norep','There','You','You_cant','You_feel','You_hear','Your','impossible','livelog_printf','nh_snprintf','panic','pline','pline_The','pline_dir','pline_xy','raw_printf','sprintf','urgent_pline','verbalize'];
 const resolve=name=>typeof services[name]==='function'?services[name]:environment.resolve(name);
 const nativeState=nativeStateFor(environment),inheritedWrappers=new Map(),resolvedWrappers=new Map();
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{
  if(!Object.hasOwn(o,k)&&nativeState.functions.has(k))return nativeState.functions.get(k);
  if(Reflect.has(o,k)){const value=Reflect.get(o,k,r);if(typeof value!=='function'||Object.hasOwn(o,k))return value;const previous=inheritedWrappers.get(k);if(previous?.source===value)return previous.wrapper;const wrapper=(...args)=>value(...args.map(v=>v?.address??v));inheritedWrappers.set(k,{source:value,wrapper});return wrapper;}if(typeof k!=='string')return undefined;
  if(resolvedWrappers.has(k))return resolvedWrappers.get(k);
  const family=families.find(name=>k.startsWith(name+'_')&&/^[pijd]+$/.test(k.slice(name.length+1)));
  const wrapper=family?((...args)=>{const shape=k.slice(family.length+1);return resolve(family)(...args.map((v,i)=>shape[i]==='p'?text(v):shape[i]==='j'?BigInt(v):shape[i]==='i'?Number(BigInt.asIntN(32,BigInt(v))):v));}):((...args)=>environment.resolve(k)(...args.map(v=>v?.address??v)));resolvedWrappers.set(k,wrapper);return wrapper;
 }});
 local.rngCaller=(line,caller)=>{const n=environment.transport.int(line),name=typeof caller==='string'?caller:memory.readString(environment.address(caller));if(!abi.rngCallers.some(row=>row[0]===n&&row[1]===name))throw new Error('Unexpected HACK RNG caller');if(services.rng_log_enabled())services.rng_log_set_caller(text('hack.c'),n,text(caller));};
 const kinds=Object.keys(abi.schemas),scalar=d=>d.t?{i8:'signed char',u8:'unsigned char',i16:'short',u16:'unsigned short',i32:'int',u32:'unsigned int',i64:'long',u64:'unsigned long'}[d.t]:'void *';
 const field=(kind,index)=>{const row=abi.schemas[kinds[kind]],f=row?.fields[index];if(!f)throw new Error('Unknown HACK field');return {type:row.ctype,f};};
 const code=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':ctypes.size(t)===8?'j':'i';};
 function pointer(name){let row=abi.callbacks[name];if(!row){const m=publicFunctions.functions[name]?.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown movement callback '+name);row={result:m[1],parameters:m[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')};}return environment.functionPointer(Object.hasOwn(publicFunctions.functions,name)?name:'hack::'+name,[row.result,...row.parameters].map(code).join(''),abi.callbacks[name]?((...args)=>callHack(local,L,name,...args)):undefined);}
 let buffer;try{buffer=environment.requireGlobal('hack.in_rooms.buf');}catch(error){if(!error.message.startsWith('Unresolved standalone global '))throw error;buffer=environment.allocateGlobal('hack.in_rooms.buf',5);}
 Object.assign(local,{moduleKey:environment,nativeGlobalBindings:true,heap:()=>memory.HEAPU8,
  global:i=>environment.requireGlobal(abi.globals[i].name),
  read:(kind,p,index)=>{const e=field(kind,index);return e.f.d.a||e.f.d.s?BigInt(ctypes.locate(e.type,environment.address(p),e.f.name).at):ctypes.getField(e.type,environment.address(p),e.f.name,scalar(e.f.d));},
  write:(kind,p,index,v)=>{const e=field(kind,index);return ctypes.setField(e.type,environment.address(p),e.f.name,e.f.ctype,v);},
  address:(kind,p,index)=>{const e=field(kind,index);return ctypes.locate(e.type,environment.address(p),e.f.name).at;},
  functionPointer:i=>pointer(abi.functions[i]),foreignFunctionPointer:i=>pointer(['Boots_on','do_reqmenu','dokick'][i]),inRoomsBuffer:()=>buffer,callIntFunction:fn=>functions.indirect(fn,'i'),
  alloc:n=>environment.alloc('alloc',n),free:p=>services.free(environment.address(p)),
 });
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strrchr','strstr','strncpy','strncmp'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 // The earlier level provider already owns this exact source-private buffer.
 // Preserve it while installing the rest of the original once-per-module data.
 const prior=memory.readBytes(buffer,5),context=createHackEnvironment(local,L,hack);hack.initializeHackData(context);memory.HEAPU8.set(prior,buffer);
 const names=abi.functions.filter(name=>Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 const exports=Object.fromEntries(names.map(name=>{let started=false;const call=(...args)=>{if(!started){environment.startModule('movement');started=true;}return callHack(local,L,name,...args);};call.nativeState=nativeState;call.nativeDirect=true;nativeState.functions.set(name,call);return [name,call];}));
 environment.register('movement',exports);
 return {services:local,context,ctypes,pointer,call:(name,...args)=>callHack(local,L,name,...args),limitation:'Movement/room integration in progress; complete HACK policies and game lifecycle require original-C verification.'};
}
