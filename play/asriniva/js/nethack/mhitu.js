// Original MHITU policy on its one cached native-view environment.
import abi from './mhitu-abi.json' with {type:'json'};
import {getMhituState,createMhituEnvironment,prepareMhituArguments} from './bindings/mhitu.js';
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeMonsterAttack} from './native/mhitu.js';
import {installNativeDependency,createNativeAbiCaster} from './native/execution.js';
const owners=new WeakMap();
export function enableMhitu(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport,functions}=environment,L=layouts.mhitu,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MHITU ABI '+k);
 const nativeState=nativeStateFor(environment);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>nativeState.functions.get(n)??(environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n));
 const cast=createNativeAbiCaster(ctypes,transport,text),scalar=(t,v)=>cast(t)(v);
 const local=Object.create(services),schemas=Object.values(abi.schemas);
 const field=(kind,p,i)=>{const row=schemas[kind],f=row?.fields[i];if(!f)throw new Error('Unknown MHITU field '+kind+':'+i);return{row,f,at:ctypes.locate(row.ctype,address(p),f.name).at};};
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){
  const m=prototype.match(/^(.+?)\s*\((.*)\)$/),args=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  const arguments_=args.map(cast),result=cast(m[1]);
  const legacy=(...values)=>result(resolve(target)(...values.map((v,i)=>arguments_[i](v))));
  installNativeDependency(local,name,target,nativeState,legacy);
 }
 for(const[name,row]of Object.entries(abi.variadicABI)){const arguments_=row.types.map(cast),result=cast(row.ret);local[name]=(...args)=>{if(args.length!==arguments_.length)throw new Error('MHITU format ABI '+name);return result(resolve(row.name)(...args.map((v,i)=>arguments_[i](v))));};}
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
 local.nativeOwner=nativeState;local.nativeRecordLayouts=Object.fromEntries(schemas.map(row=>[row.ctype.replace(/^(struct |union )/,''),ctypes.record(row.ctype)]));
 let context,native;
 const getContext=()=>{if(!context){context=createMhituEnvironment(local,L);native=createNativeMonsterAttack(context);}return context;};
 const invoke=(name,args)=>{const env=getContext(),saved=nativeState.depth?undefined:transport.stackSave();nativeState.enter();try{const v=native[name](...prepareMhituArguments(env,L,name,args));return typeof v==='string'?services.literal(v):typeof v==='boolean'?Number(v):v?.address??v;}finally{try{nativeState.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};
 const owner={services:local,state:getMhituState(local),call:(name,...args)=>invoke(name,args),get context(){return getContext();},exports:abi.public,limitation:'Native MHITU shares canonical actors and source-private state; finite original-C and recording acceptance is reported separately.'};
 environment.register('mhitu',Object.fromEntries(abi.public.filter(n=>!environment.hasFunction(n)).map(n=>{let started=false;const call=(...args)=>{if(!started){environment.startModule('mhitu');started=true;}return invoke(n,args);};call.nativeState=nativeState;call.nativeDirect=true;nativeState.functions.set(n,call);return[n,call];})),local);
 owners.set(environment,owner);return owner;
}
