import formatAbi from '../equipment-format-abi.json' with {type:'json'};
// Shared native wearing/extrinsic graph for hero and monster owners.
import publicFunctions from '../public-functions.json' with {type:'json'};
import textAbi from '../worn-text-abi.json' with {type:'json'};
import * as source from '../../ported/worn.js';
import {createNativeWorn} from './worn.js';
import {createNativeWornState} from './worn-state.js';
import {nativeStateFor} from './state-bridge.js';
import {createNativeAbiCaster} from './execution.js';
const games=new WeakMap();
export function nativeWornFor(environment,layouts){
 if(games.has(environment))return games.get(environment);
 const {services:S,transport:t,memory,ctypes}=environment,owner=nativeStateFor(environment),address=environment.address,text=v=>typeof v==='string'?S.literal(v):address(v),cast=createNativeAbiCaster(ctypes,t,text);
 const prototype=p=>{const m=p.match(/^(.*?)\s*\((.*)\)$/);if(!m)throw Error('Invalid WORN prototype '+p);return {result:m[1].trim(),parameters:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 const resolve=n=>{const fn=owner.functions.get(n)??S[n]?.nativeEntry;return fn?.nativeValuesEntry??fn??(typeof S[n]==='function'?S[n]:environment.resolve(n));};
 const forwards=new Map(),local=new Proxy(Object.create(null),{get(o,key){if(Object.hasOwn(o,key))return o[key];if(typeof key!=='string')return undefined;if(!forwards.has(key)){const declared=Object.hasOwn(publicFunctions.functions,key)?publicFunctions.functions[key]:undefined;if(!declared&&key in Object.prototype)return Reflect.get(Object.prototype,key);if(!declared)throw Error('Missing WORN dependency prototype '+key);const plan=prototype(declared);if(plan.parameters.includes('...'))throw Error('Unconnected WORN variadic '+key);const args=plan.parameters.map(cast),result=cast(plan.result);const forward=(...values)=>{const fn=resolve(key);if(fn.nativeState===owner&&fn.nativeDirect)return fn(...values);return result(owner.boundary(fn,...values.map((v,i)=>args[i](v))));};Object.defineProperty(forward,'address',{get(){if(!S[key])environment.resolve(key);const token=S[key]?.address;if(token===undefined)throw Error('Unconnected WORN callback '+key);return token;}});forwards.set(key,forward);}return forwards.get(key);}});
 Object.assign(local,{literal:S.literal,heap:()=>memory.HEAPU8,stackAlloc:t.stackAlloc,free:p=>S.free(address(p)),abs:Math.abs,sgn:Math.sign,
  commonString:index=>{const name=['NH_BLACK','Something'][t.int(index)],row=textAbi.commonStrings[name];if(!row)throw Error('Unknown WORN common string');return owner.nativeRecords.record(row.type,environment.requireGlobal(row.global))[row.field];},
  strcpy:(out,from)=>S.strcpy(address(out),text(from)),Strcpy:(out,from)=>out?.nativeBytes?out.copyCString(from):S.strcpy(address(out),text(from)),strcat:(out,from)=>S.strcat(address(out),text(from)),Strcat:(out,from)=>S.strcat(address(out),text(from)),
  Sprintf:(out,fmt,...args)=>S.sprintf(address(out),text(fmt),...args.map(v=>typeof v==='string'?text(v):v?.address??v)),
  strcmpi:(a,b)=>S.strncmpi(text(a),text(b),-1),strncmpi:(a,b,n)=>S.strncmpi(text(a),text(b),t.int(n)),strsubst:(out,a,b)=>resolve('strsubst')(address(out),text(a),text(b)),
 });
 for(const name of ['pline','You','Your','You_feel','You_hear','You_see','pline_The','impossible','panic'])local[name]=(fmt,...args)=>resolve(name)(text(fmt),...args.map(v=>typeof v==='string'?text(v):v?.address??v));
 const snprintf=formatAbi.worn.snprintf,snprintfTypes=snprintf.types.map(cast);local.Snprintf=(...values)=>resolve(snprintf.actual)(text(snprintf.fn),t.int(snprintf.line),...values.map((v,i)=>snprintfTypes[i](v)));
 local.pline_mon=(mon,fmt,...values)=>resolve('pline_mon')(address(mon),text(fmt),...values.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.rnl=(n,line,caller)=>{if(S.rng_log_enabled())S.rng_log_set_caller(S.literal('worn.c'),t.int(line),S.literal(caller));return resolve('rnl')(t.int(n));};
 let context,policies;const getContext=()=>{if(!context){context=createNativeWornState(environment,layouts,local,source,owner);policies=createNativeWorn(context);}return context;};
 const names=Object.entries(source).filter(([name,fn])=>typeof fn==='function'&&(Object.hasOwn(publicFunctions.functions,name)||name==='m_dowear_type')).map(([name])=>name),functions={};
 for(const name of names){const p=publicFunctions.functions[name]??({m_dowear_type:'void (struct monst *, long, boolean, boolean)'}[name]);if(!p)throw Error('Missing WORN native signature '+name);const plan=prototype(p),args=plan.parameters.map(type=>{const target=ctypes.canonical(type).replace(/\s*\*$/,'');return type.includes('*')&&ctypes.isRecord(target)?v=>owner.nativeRecords.record(target,v):cast(type);}),result=cast(plan.result);
  const invoke=(values,nativeValues)=>{const saved=owner.depth?undefined:t.stackSave();owner.enter();try{getContext();const value=policies[name](...values.map((v,i)=>args[i](v)));return nativeValues?value:result(value);}finally{owner.leave();if(saved!==undefined)t.stackRestore(saved);}};
  const fn=(...values)=>invoke(values,false),direct=(...values)=>invoke(values,true);for(const value of[fn,direct]){value.nativeState=owner;value.nativeDirect=true;value.nativePrepared=true;}fn.nativeValuesEntry=direct;functions[name]=fn;owner.functions.set(name,fn);
 }
 const graph={functions,get context(){return getContext();},get policies(){getContext();return policies;},services:local};games.set(environment,graph);return graph;
}
