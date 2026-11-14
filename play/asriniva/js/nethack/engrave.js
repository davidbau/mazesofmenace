// Original ENGRAVE policies on the shared head chain and saved occupation fields.
import {nativeStateFor} from './native/state-bridge.js';
import abi from './engrave-abi.json' with {type:'json'};
import * as source from '../ported/engrave.js';
import {createNativeRecordViews} from './native/record-views.js';
import {createNativeEngraveState} from './native/engrave-state.js';
import {createNativeEngrave} from './native/engrave.js';
const owners=new WeakMap();
export function nativeEngraveFor(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services:S,ctypes,memory,transport}=environment,address=environment.address,L=layouts.engrave,state=nativeStateFor(environment);createNativeRecordViews(environment);
 for(const[k,v]of Object.entries(abi.layout))if(JSON.stringify(L[k])!==JSON.stringify(v))throw Error('Review ENGRAVE ABI '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>{const fn=state.functions.get(n)??S[n]?.nativeEntry;return fn?.nativeValuesEntry??fn??(environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n));};
 const scalar=(t,v)=>{t=ctypes.abiType(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long'||t==='cmdcount_nht')return transport.long(v);if(t==='unsigned long'||t==='size_t')return transport.ulong(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char'||t==='uchar')return transport.uchar(v);if(t==='short'||t==='coordxy'||t==='xint16')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int'||t==='unsigned')return transport.uint(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Review ENGRAVE prototype '+p);return{ret:m[1],args:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,commonString:i=>{if(i===3)return environment.requireGlobal('ynqchars');const key=['c_Something','c_Never_mind','c_vision_clears'][i];if(!key)throw Error('Unknown native ENGRAVE common string');return state.nativeRecords.record('struct c_common_strings',environment.requireGlobal('c_common_strings'))[key];}};
 for(const[n,p]of Object.entries(abi.dependencies)){const row=prototype(p),arguments_=row.args.map(type=>{const canonical=ctypes.canonical(type),target=canonical.replace(/\s*\*$/,'');return canonical.endsWith('*')&&ctypes.isRecord(target)?v=>state.nativeRecords.record(target,v):v=>scalar(type,v);});local[n]=(...args)=>{const fn=resolve(n),values=args.map((v,i)=>arguments_[i](v));if(fn.nativeState===state&&fn.nativeDirect)return fn(...values);return scalar(row.ret,state.boundary(fn,...values.map(v=>v?.address??v)));};}
 local.Strcpy=local.strcpy;local.Strcat=local.strcat;local.free=p=>resolve('free')(address(p));
 const window=(field,sig,...args)=>environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke(field,sig,...args):environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),field,'void *'),sig,...args);
 local.getlin=(p,out)=>window('win_getlin','vpp',text(p),text(out));
 local.Strlen=(p,i)=>{const row=abi.strlenSites[i];if(!row)throw Error('Unknown ENGRAVE Strlen source');return transport.uint(resolve('Strlen_')(text(p),text(row.function),row.line));};
 for(const n of ['pline','You','Your','You_cant','You_see','There','pline_The','impossible'])local[n]=(fmt,...a)=>resolve(n)(text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(out,fmt,...a)=>S.sprintf(text(out),text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));local.livelog_printf=(mask,fmt,...a)=>resolve('livelog_printf')(transport.long(mask),text(fmt),...a.map(text));
 for(const n of ['rn2','rn1','rnd'])local[n]=(bound,...args)=>{const caller=args.pop(),line=args.pop();if(!abi.rngSites.some(r=>r.kind===n&&r.line===line&&r.caller===caller))throw Error('Unexpected ENGRAVE RNG source '+n+':'+line);if(S.rng_log_enabled())S.rng_log_set_caller(text('engrave.c'),line,text(caller));const value=resolve(n==='rnd'?'rnd':'rn2')(transport.int(bound));return n==='rn1'?transport.int(value+transport.int(args[0])):value;};
 let context;const callbacks=new Map();function callback(n,sig){if(environment.hasFunction(n))return environment.functionPointer(n,sig);if(!callbacks.has(n))callbacks.set(n,environment.functionPointer('engrave::'+n,sig,(...args)=>call(n,args)));return callbacks.get(n);}
 local.getobj=(prompt,flags)=>resolve('getobj')(text(prompt),callback('stylus_ok','ip'),transport.uint(flags));local.set_occupation=(label,time)=>resolve('set_occupation')(callback('engrave','i'),text(label),transport.long(time));
 local.get_rnd_text=(file,out,pad)=>resolve('get_rnd_text')(text(file),text(out),environment.functionPointer('rn2','ii'),transport.uint(pad));
 for(const direction of ['sfo','sfi'])for(const type of ['unsigned','engr','char'])local[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(file,data,tag,...count)=>resolve(direction+'_'+type)(address(file),address(data),text(tag),...count.map(transport.int));
 context=createNativeEngraveState(environment,layouts,local,source,state);const policies=createNativeEngrave(context);context.bindNamespace(policies);
 function call(n,args,nativeValues=false){const p=abi.public[n]??({stylus_ok:'int (struct obj *)',engrave:'int (void)'})[n];if(!p)throw Error('Unknown native ENGRAVE export '+n);const row=prototype(p),saved=state.depth?undefined:transport.stackSave();state.enter();try{
  args=args.map((v,i)=>{if(n==='engr_stats'&&(i===2||i===3))return context.longPointer(v);const type=row.args[i],canonical=ctypes.canonical(type),target=canonical.replace(/\s*\*$/,'');return canonical.endsWith('*')&&ctypes.isRecord(target)?state.nativeRecords.record(target,v):scalar(type,v);});
  const value=policies[n](...args);return nativeValues?value:scalar(row.ret,value?.address??value);
 }finally{state.leave();if(saved!==undefined)transport.stackRestore(saved);}}
 const functions={};for(const name of [...Object.keys(abi.public),'stylus_ok','engrave']){const fn=(...args)=>call(name,args),direct=(...args)=>call(name,args,true);for(const entry of[fn,direct]){entry.nativeState=state;entry.nativeDirect=true;entry.nativePrepared=true;}fn.nativeValuesEntry=direct;functions[name]=fn;state.functions.set(name,fn);}
 for(const name of ['engr_at','sengr_at'])state.spatial.engravings[name]=functions[name].nativeValuesEntry;
 const owner={context,policies,services:local,functions,call:(name,...args)=>call(name,args),limitations:'Connected native engraving owner, command state and source policies; byte text/serialization boundaries remain. Exact C/gameplay/recording evidence is reported separately.'};owners.set(environment,owner);return owner;
}
export function enableEngrave(environment,layouts){
 const owner=nativeEngraveFor(environment,layouts);if(owner.registered)return owner;const forwarded=[];
 for(const group of ['world-engravings','engraving-persistence']){let entry;try{entry=environment.start(group);}catch(e){if(e.message==='Unresolved standalone module '+group)continue;throw e;}for(const name of Object.keys(abi.public))if(Object.hasOwn(entry.namespace,name)&&entry.namespace[name]!==owner.functions[name]){entry.namespace[name]=owner.functions[name];forwarded.push({name,group});}}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('engraving-public',Object.fromEntries(names.map(n=>[n,owner.functions[n]])),owner.context);
 owner.exports=names;owner.forwarded=forwarded;owner.registered=true;return owner;
}
