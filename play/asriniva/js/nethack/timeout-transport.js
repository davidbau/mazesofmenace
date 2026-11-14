// Supplement the existing timer context with unchanged native TIMEOUT macros.
import abi from './timeout-abi.json' with {type:'json'};
import * as source from '../ported/timeout.js';
import {createTimeoutEnvironment} from './bindings/timeout.js';
import {nativeStateFor} from './native/state-bridge.js';

export function extendTimeoutTransport(environment,layouts,env){
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.timeout,address=environment.address;
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review TIMEOUT ABI '+key);
 const owner=nativeStateFor(environment);
 const text=v=>typeof v==='string'?services.literal(v):address(v),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),cache=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;const direct=owner.functions.get(key);if(direct?.nativeState===owner)return direct;if(!cache.has(key))cache.set(key,(...args)=>owner.boundary(resolve(key),...boundary(args)));return cache.get(key);}});
 const bit=(type,p,parts,value)=>{
  const last=parts.at(-1);let record=owner.nativeRecords.record(type,p);
  for(const part of parts.slice(0,-1))record=record[part];
  if(value===undefined)return record[last];record[last]=value;return record[last];
 };
 const equipmentAddresses=abi.equipment.map(name=>environment.requireGlobal(name));
 const hero=[['uhave','amulet'],['uinvulnerable'],['uburied'],['usick_type'],['uroleplay','deaf']];
 const windowCall=(name,...args)=>{const field=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name),prototype=field.field.ctype.replace(new RegExp('\\s+'+name+'$'),''),match=prototype.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unknown TIMEOUT window prototype '+name);const signature=[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':ctypes.size(t)===8?'j':'i';}).join('');return environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke(name,signature,...args):functions.indirect(memory.view.getBigUint64(field.at,true),signature,...args);};
 Object.assign(local,{nativeOwner:owner,nativeSpeciesCount:layouts.monst.NUMMONS+1,moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown TIMEOUT global '+i);return environment.requireGlobal(name);},
  equipment:i=>owner.nativeArena.pointer(equipmentAddresses[i]),
  monsterBit:(p,i)=>{if(i!==0)throw new Error('Unknown TIMEOUT monster bit');return bit('struct monst',p,['wormno']);},setMonsterBit:(p,i,v)=>{if(i!==0)throw new Error('Unknown TIMEOUT monster bit');return bit('struct monst',p,['wormno'],v);},
  objectBit:(p,i)=>bit('struct obj',p,[['dknown','lamplit','cursed','odiluted'][i]]),setObjectBit:(p,i,v)=>bit('struct obj',p,[['dknown','lamplit','cursed','odiluted'][i]],v),
  terrainBit:(p,i)=>{if(i!==0)throw new Error('Unknown TIMEOUT terrain bit');return bit('struct rm',p,['drawbridgemask']);},
  heroBit:i=>bit('struct you',environment.requireGlobal('u'),hero[i]),setHeroBit:(i,v)=>bit('struct you',environment.requireGlobal('u'),hero[i],v),
  flagBit:i=>{if(i===0)return bit('struct instance_globals_saved_q',environment.requireGlobal('svq'),['quest_status','killed_leader']);if(i===1)return bit('struct instance_globals_saved_l',environment.requireGlobal('svl'),['level','flags','stormy']);throw new Error('Unknown TIMEOUT flag bit');},
  timerBit:p=>bit('struct fe',p,['needs_fixup']),setTimerBit:(p,v)=>bit('struct fe',p,['needs_fixup'],v),
  commonString:i=>{const row=abi.common[i];if(!row)throw new Error('Unknown TIMEOUT common string');return owner.nativeRecords.record('struct '+row[0],environment.requireGlobal(row[0]))[row[1]];},
  callbackPointer:i=>{const name=abi.foreign[i],index=source.timeout_funcs.findIndex(row=>row.f===name);if(index<0)throw new Error('Unknown TIMEOUT callback '+i);return env.timeout_funcs[index].f;},
  invoke:(fn,arg,time)=>functions.indirect(fn,'vpj',address(arg),transport.long(time)),
  rngCaller:env.rngCaller,
  rn2:(n,line,caller,already)=>{if(!already&&line!==undefined)env.rngCaller(line,caller);return services.rn2(transport.int(n));},
  rnd:(n,line,caller,already)=>{if(!already&&line!==undefined)env.rngCaller(line,caller);return services.rnd(transport.int(n));},
  d:(n,x,line,caller,already)=>{if(!already&&line!==undefined)env.rngCaller(line,caller);return services.d(transport.int(n),transport.int(x));},
  rn1:(n,b,line,caller,already)=>transport.int(local.rn2(n,line,caller,already)+transport.int(b)),
  Strcpy:(out,input)=>services.strcpy(address(out),text(input)),
  fmt_ptr:pointer=>environment.hasFunction('fmt_ptr')?environment.resolve('fmt_ptr')(address(pointer)):environment.alloc('fmt_ptr',address(pointer)),
  create_nhwindow:type=>windowCall('win_create_nhwindow',transport.int(type)),destroy_nhwindow:win=>windowCall('win_destroy_nhwindow',transport.int(win)),display_nhwindow:(win,block)=>windowCall('win_display_nhwindow',transport.int(win),transport.char(block)),putstr:(win,attribute,value)=>windowCall('win_putstr',transport.int(win),transport.int(attribute),text(value)),
  assert:(value,i)=>{if(!value){const row=abi.assertions[i];if(!row)throw new Error('Unknown TIMEOUT assertion');return resolve('__assert_fail')(text(row.condition),text('timeout.c'),row.line,text(row.function));}},
 });
 const previousImpossible=env.impossible;
 for(const name of ['pline','Norep','You','Your','You_feel','You_hear','You_see'])local[name]=(...args)=>resolve(name)(...boundary(args));
 local.impossible=(...args)=>environment.hasFunction('impossible')?environment.resolve('impossible')(...boundary(args)):previousImpossible(...args);
 local.Sprintf=(out,format,...args)=>services.sprintf(address(out),text(format),...boundary(args));
 for(const direction of ['sfo','sfi'])for(const type of ['int','ulong','fe'])local[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(...args)=>resolve(direction+'_'+type)(...boundary(args));
 // The native adapter assigns root projections. Shadow DECL setters first so
 // constructing views cannot copy records into the live game globals.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const native=createTimeoutEnvironment(local,L);
 // Never replace the established queue projections, callback IDs or lifecycle
 // helpers. Native macro closures project the very same measured shared bytes.
 for(const [name,descriptor]of Object.entries(Object.getOwnPropertyDescriptors(native)))if(!Object.hasOwn(env,name)||(typeof descriptor.value==='bigint'&&['number','string'].includes(typeof env[name])))Object.defineProperty(env,name,descriptor);
 for(const name of ['rn2','rn1','rnd','d','pline','Norep','You','Your','You_feel','You_hear','You_see','impossible','Sprintf','Strcpy','fmt_ptr','assert','create_nhwindow','destroy_nhwindow','display_nhwindow','putstr'])Object.defineProperty(env,name,{value:local[name],writable:true,configurable:true});
 return{native,services:local,abi};
}
