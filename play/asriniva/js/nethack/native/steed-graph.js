// One native STEED graph, shared by construction, movement and riding owners.
import abi from '../special-interactions-abi.json' with {type:'json'};
import * as original from '../../ported/steed.js';
import {createNativeSteed} from './steed.js';
import {createNativeSteedState} from './steed-state.js';
import {nativeStateFor} from './state-bridge.js';
import {createNativeAbiCaster} from './execution.js';
const games=new WeakMap();
export function nativeSteedFor(environment,layouts){
 if(games.has(environment))return games.get(environment);
 const metadata=abi.ports.steed,L=layouts.steed,{services:S,transport:t,ctypes,memory}=environment,owner=nativeStateFor(environment);
 for(const[k,v]of Object.entries(metadata.layout))if(L[k]!==v)throw Error('Review STEED native ABI '+k);
 const address=environment.address,text=v=>typeof v==='string'?S.literal(v):address(v),cast=createNativeAbiCaster(ctypes,t,text);
 const resolve=name=>owner.functions.get(name)??S[name]?.nativeEntry??(typeof S[name]==='function'?S[name]:environment.resolve(name));
 const prototype=p=>{const m=p.match(/^(.*?)\s*\((.*)\)$/);if(!m)throw Error('Invalid STEED prototype '+p);return {result:cast(m[1]),parameters:m[2].split(',').map(x=>x.trim()).filter(x=>x&&x!=='void')};};
 const services=Object.create(S);
 for(const[name,p]of Object.entries(metadata.foreign))if(!p.includes('...')){const plan=prototype(p),args=plan.parameters.map(cast);services[name]=(...values)=>{const fn=resolve(name);if(fn.nativeState===owner&&fn.nativeDirect)return fn(...values);return plan.result(owner.boundary(fn,...values.map((v,i)=>args[i](v))));};}
 services.literal=S.literal;services.moduleKey=environment;services.heap=()=>memory.HEAPU8;services.stackAlloc=t.stackAlloc;
 services.memset=(out,value,n)=>memory.memset(address(out),Number(value),Number(n));
 services.equipment=i=>{const name=['uwep','uarm','uarmg','uarmf','uball'][i];if(!name)throw Error('Invalid STEED equipment slot');return owner.nativeArena.pointer(environment.requireGlobal(name));};
 services.commonString=i=>{if(i!==0)throw Error('Invalid STEED common string');return owner.nativeRecords.record('struct c_common_strings',environment.requireGlobal('c_common_strings')).c_Never_mind;};
 services.hasMgivenname=m=>Boolean(m.mextra&&m.mextra.mgivenname);
 for(const name of ['pline','You','You_cant','Your','panic','impossible'])services[name]=(format,...args)=>resolve(name)(text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v));
 services.Sprintf=(out,format,...args)=>S.sprintf(address(out),text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v));services.Strcpy=(out,from)=>S.strcpy(address(out),text(from));
 services.y_n=query=>resolve('yn_function')(text(query),environment.requireGlobal('ynchars'),110,1);
 for(const name of ['rn2','rnd'])services[name]=(bound,line,caller)=>{if(!metadata.callers.includes(caller))throw Error('Unknown STEED RNG caller '+caller);if(S.rng_log_enabled())S.rng_log_set_caller(S.literal('steed.c'),t.int(line),S.literal(caller));return resolve(name)(t.int(bound));};
 let context,policies;
 const getContext=()=>{if(!context){context=createNativeSteedState(environment,layouts,services,original);policies=createNativeSteed(context);}return context;};
 const functions={};
 for(const[name,p]of Object.entries({...metadata.public,steed_vs_stealth:'void (void)'})){
  const plan=prototype(p),args=plan.parameters.map(type=>{const target=ctypes.canonical(type).replace(/\s*\*$/,'');return type.includes('*')&&ctypes.isRecord(target)?v=>owner.nativeRecords.record(target,v):cast(type);});
  const fn=(...values)=>{const saved=owner.depth?undefined:t.stackSave();owner.enter();try{getContext();return plan.result(policies[name](...values.map((v,i)=>args[i](v))));}finally{owner.leave();if(saved!==undefined)t.stackRestore(saved);}};
  fn.nativeState=owner;fn.nativeDirect=true;fn.nativePrepared=true;owner.functions.set(name,fn);functions[name]=fn;
 }
 const result={functions,services,get context(){return getContext();},get policies(){getContext();return policies;},call:(name,...args)=>{if(!functions[name])throw Error('Unknown public STEED policy '+name);return functions[name](...args);}};games.set(environment,result);return result;
}
