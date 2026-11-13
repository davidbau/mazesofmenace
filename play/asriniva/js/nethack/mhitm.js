// Whole original MHITM owner on one live native-view context.
import abi from './mhitm-abi.json' with{type:'json'};
import {createNativeMonsterCombat} from './native/mhitm.js';
import {nativeStateFor} from './native/state-bridge.js';
import {installNativeDependency,createNativeAbiCaster} from './native/execution.js';
import{createMhitmEnvironment,prepareMhitmArguments}from'./bindings/mhitm.js';
const owners=new WeakMap();
export function enableMhitm(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const nativeState=nativeStateFor(environment);
 const{services,memory,ctypes,transport}=environment,L=layouts.mhitm,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MHITM ABI '+k);
 const resolve=n=>nativeState.functions.get(n)??(environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n)),local=Object.create(services);
 const cast=createNativeAbiCaster(ctypes,transport,text),scalar=(t,v)=>cast(t)(v);
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){
  const m=prototype.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');
  const arguments_=types.map(cast),result=cast(m[1]),legacy=(...args)=>result(resolve(target)(...args.map((v,i)=>arguments_[i](v))));
  const strings=types.flatMap((type,i)=>/\bchar\s*\*/.test(type)?[i]:[]),prepareNative=strings.length?args=>{for(const i of strings)if(typeof args[i]==='string')args[i]=text(args[i]);return args;}:undefined;
  installNativeDependency(local,name,target,nativeState,legacy,prepareNative);
 }
 const nested=(type,p,name)=>ctypes.locate(type,p,name).at;
 const bit=(p,i,v)=>{const n=abi.bits[i];if(!n)throw new Error('Unknown MHITM monster bit '+i);return v===undefined?ctypes.getField('struct monst',address(p),n,'unsigned int'):ctypes.setField('struct monst',address(p),n,'unsigned int',transport.uint(v));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown MHITM global '+i);return environment.requireGlobal(n);},monsterBit:(p,i)=>bit(p,i),setMonsterBit:(p,i,v)=>bit(p,i,v),
  heroBit:i=>{if(i===0)return ctypes.getField('struct you',environment.requireGlobal('u'),'uswallow','unsigned int');if(i===1)return ctypes.getField('struct u_roleplay',nested('struct you',environment.requireGlobal('u'),'uroleplay'),'deaf','boolean');throw new Error('Unknown MHITM hero bit '+i);},
  classMaterial:p=>ctypes.getField('struct objclass',address(p),'oc_material','unsigned int'),
  arboreal:()=>ctypes.getField('struct levelflags',nested('dlevel_t',nested('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level'),'flags'),'arboreal','unsigned int'),
  commonString:i=>{const n=['c_something','c_nothing_happens'][i];if(!n)throw new Error('Unknown MHITM common string '+i);return ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),n,'const char *');},
  Sprintf:(out,fmt,...args)=>{if(args.length>2)throw new Error('Review MHITM sprintf arity');return resolve('sprintf')(address(out),text(fmt),...args.map(text));},
  Snprintf:(out,n,fmt,...args)=>{const i=args.pop(),site=abi.formats[i];if(!site||args.length>2)throw new Error('Unknown MHITM snprintf site '+i);return resolve('nh_snprintf')(text(site.function),site.line,address(out),transport.ulong(n),text(fmt),...args.map(text));},
 });
 for(const[name,max]of[['pline',6],['pline_mon',2],['You',2],['You_hear',2],['You_feel',1],['Your',0]])local[name]=(...args)=>{const mon=name==='pline_mon'?args.shift():undefined,fmt=args.shift();if(args.length>max)throw new Error('Review MHITM '+name+' arity');return resolve(name)(...(mon===undefined?[]:[address(mon)]),text(fmt),...args.map(text));};
 for(const name of['rn2','rnd','d'])local[name]=(...args)=>{const caller=args.pop(),line=args.pop();if(services.rng_log_enabled())services.rng_log_set_caller(text('mhitm.c'),transport.int(line),text(caller));return resolve(name)(...args.map(transport.int));};
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 local.nativeOwner=nativeState;
 const context=createMhitmEnvironment(local,L),native=createNativeMonsterCombat(context);
 const prepare=(name,args)=>{
  args=prepareMhitmArguments(context,name,args);
  const proto=abi.public[name];if(proto){const types=proto.match(/\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');args=args.map((v,i)=>ctypes.canonical(types[i]).includes('*')?v:scalar(types[i],v));}
  return args;
 };
 const call=(name,...args)=>{if(typeof native[name]!=='function')throw new Error('Unknown MHITM native function '+name);const saved=nativeState.depth?undefined:transport.stackSave();nativeState.enter();try{return native[name](...prepare(name,args));}finally{try{nativeState.leave();}finally{if(saved!==undefined)transport.stackRestore(saved);}}};
 environment.register('mhitm',Object.fromEntries(Object.keys(abi.public).map(n=>{let started=false;const invoke=(...args)=>{if(!started){environment.startModule('mhitm');started=true;}return call(n,...args);};invoke.nativeState=nativeState;invoke.nativeDirect=true;nativeState.functions.set(n,invoke);return[n,invoke];})),local);
 const owner={context,services:local,native,exports:Object.keys(abi.public),call,limitation:'Native monster combat shares canonical actors and source policy; finite C matrices and recording acceptance are reported separately.'};
 owners.set(environment,owner);return owner;
}
