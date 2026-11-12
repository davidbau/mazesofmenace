// Original END lifecycle on the existing killer owner and shared native state.
import abi from './end-lifecycle-abi.json' with {type:'json'};
import * as source from '../ported/end.js';
import {createEndEnvironment,callEnd} from '../nethack/bindings/end.js';
import {withCEnvironment} from '../c-runtime/context.js';
import {enableKillerState} from './killer-state.js';
const owners=new WeakMap();
export function enableEndLifecycle(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.end,address=environment.address;
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review END native ABI '+key);
 const killer=enableKillerState(environment,layouts),local=killer.environment;
 const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(value=>typeof value==='string'?services.literal(value):value?.address??value);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 const forwards=new Map(),forwarding=new Proxy(Object.create(services),{get:(o,key,r)=>{const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});Object.setPrototypeOf(local,forwarding);
 // The killer services already own SVK/iflags. Other native roots need writable
 // local shadows so the unchanged factory cannot invoke inherited DECL setters.
 for(const name of Object.keys(abi.globals))if(!Object.hasOwn(local,name))Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const code=type=>{type=ctypes.canonical(type);return type.includes('*')?'p':type==='void'?'v':/\b(float|double)\b/.test(type)?'d':ctypes.size(type)===8?'j':'i';};
 const windowCall=(name,...args)=>{const row=abi.records['struct window_procs'][name],match=row?.sourceType.match(/^(.+?)\s*\(\*\)\s*\((.*)\)$/);if(!match)throw new Error('Unknown END window callback '+name);const signature=[match[1],...match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void')].map(code).join('');const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),name).at;return functions.indirect(memory.view.getBigUint64(at,true),signature,...boundary(args));};
 let context;
 const handler=which=>{if(which===-1)return BigInt(L.SIG_IGN);const name=['done1','done_intr','done_hangup'][which];if(!name)throw new Error('Unknown END native signal handler '+which);if(name==='done1')return environment.functionPointer(name,'vi');return environment.functionPointer('end::'+name,'vi',sig=>transport.scoped(()=>withCEnvironment(context,source[name],transport.int(sig))));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:index=>{const name=Object.keys(abi.globals)[index];if(!name)throw new Error('Unknown END global '+index);return environment.requireGlobal(name);},
  bit:(index,p)=>{const[type,field]=abi.bits[index]??[];if(!field)throw new Error('Unknown END packed field '+index);return ctypes.getField(type,address(p),field,'unsigned int');},
  setBit:(index,p,value)=>{const[type,field]=abi.bits[index]??[];if(!field)throw new Error('Unknown END packed field '+index);return ctypes.setField(type,address(p),field,'unsigned int',value);},
  headerString:index=>{const value=abi.headers[index];if(value===undefined)throw new Error('Unknown END header string '+index);return text(value);},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  Strcpy:(out,input)=>services.strcpy(address(out),text(input)),Strcat:(out,input)=>services.strcat(address(out),text(input)),strlen:p=>services.strlen(text(p)),
  Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...boundary(args)),
  vsnprintf:(out,n,format,args)=>{if(!Array.isArray(args))throw new Error('END panic requires standalone value-packet varargs; opaque native va_list is unsupported');return services.vsnprintf(address(out),transport.ulong(n),text(format),boundary(args));},
  sscanf:(input,format,...outputs)=>services.sscanf(text(input),text(format),...outputs.map(address)),
  Strlen:(input,line)=>environment.strutil('Strlen_',text(input),text('really_done'),transport.int(line)),
  signal:(sig,which)=>resolve('signal')(transport.int(sig),handler(which)),sethanguphandler:which=>resolve('sethanguphandler')(handler(which)),
  cmdq_add_ec:q=>resolve('cmdq_add_ec')(transport.int(q),environment.functionPointer('wiz_makemap','i')),
  soundExit:message=>{const at=ctypes.locate('struct sound_procs',environment.requireGlobal('soundprocs'),'sound_exit_nhsound').at;return functions.indirect(memory.view.getBigUint64(at,true),'vp',text(message));},
  nethack_exit:status=>{if(abi.exitMacro!=='exit')throw new Error('Review configured END exit macro');return functions.exit(transport.int(status));},
 });
 const callbacks={create_nhwindow:'win_create_nhwindow',clear_nhwindow:'win_clear_nhwindow',display_nhwindow:'win_display_nhwindow',destroy_nhwindow:'win_destroy_nhwindow',exit_nhwindows:'win_exit_nhwindows',putstr:'win_putstr',raw_print:'win_raw_print',mark_synch:'win_mark_synch',wait_synch:'win_wait_synch',outrip:'win_outrip'};
 for(const[name,target]of Object.entries(callbacks))local[name]=(...args)=>windowCall(target,...args);
 for(const name of ['You','Your','You_feel','pline','pline_The','raw_printf','impossible','livelog_printf'])local[name]=(...args)=>resolve(name)(...boundary(args));
 for(const name of ['Sfo_kinfo','Sfi_kinfo'])local[name]=(...args)=>resolve(name==='Sfo_kinfo'?'sfo_kinfo':'sfi_kinfo')(...boundary(args));
 local.rn2=(n,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('end.c'),transport.int(line),text('fuzzer_savelife'));return resolve('rn2')(transport.int(n));};
 local.d=(n,count,line)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('end.c'),transport.int(line),text('really_done'));return resolve('d')(transport.int(n),transport.int(count));};
 context=createEndEnvironment(local,L);
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));
 const parameters=name=>abi.public[name].match(/\(([^)]*)\)/)[1].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');
 const convert=(type,value)=>{if(type.includes('*'))return text(value);if(type==='boolean'||type==='char'||type==='schar')return transport.char(value);if(type==='unsigned int')return transport.uint(value);if(type==='long')return transport.long(value);return transport.int(value);};
 environment.register('end-lifecycle',Object.fromEntries(names.map(name=>[name,(...args)=>{if(name==='panic')return callEnd(local,L,name,text(args[0]),boundary(args.slice(1)));const types=parameters(name);return callEnd(local,L,name,...args.map((value,i)=>{if(!types[i])throw new Error('Extra END argument '+name);return convert(types[i],value);}));}])));
 const owner={context,services:local,killer,exports:names,limitation:'Original END lifecycle entries connected on the existing shared killer owner. Missing foreign owners fail explicitly; quit/death/disclosure/bones/score/cleanup/termination branches require strict original-C connected acceptance. Native opaque va_list is not accepted; canonical panic callers use standalone value packets.'};owners.set(environment,owner);return owner;
}
