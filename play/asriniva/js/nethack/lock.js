// Original LOCK policies on one native context and live GX occupation state.
import abi from './lock-abi.json' with{type:'json'};
import * as source from '../ported/lock.js';
import{withLockEnvironment}from'./bindings/lock.js';
import{withCEnvironment}from'../c-runtime/context.js';
const owners=new WeakMap();
export function enableLock(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport}=environment,L=layouts.lock,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),local=Object.create(services);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review LOCK ABI '+k);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){const m=prototype.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');local[name]=(...args)=>scalar(m[1],resolve(target)(...args.map((v,i)=>scalar(types[i],v))));}
 const at=(type,p,f)=>ctypes.locate(type,p,f).at,hero=()=>environment.requireGlobal('u'),level=()=>at('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level'),terrain=(x,y)=>at('dlevel_t',level(),'locations')+(transport.short(x)*L.ROWNO+transport.short(y))*L.terrainSize;
 const packed=(type,p,name,v)=>v===undefined?ctypes.getField(type,address(p),name,'unsigned int'):ctypes.setField(type,address(p),name,'unsigned int',transport.uint(v));
 const occupation=()=>at('struct instance_globals_o',environment.requireGlobal('go'),'occupation');
 const callback=i=>{const n=abi.callbacks[i];if(!n)throw new Error('Unknown LOCK callback '+i);return environment.functionPointer('lock::'+n,'i',()=>call(n));};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown LOCK global '+i);return environment.requireGlobal(n);},equipment:()=>ctypes.load('struct obj *',environment.requireGlobal('uwep')),
  roleplayDeaf:()=>ctypes.getField('struct u_roleplay',at('struct you',hero(),'uroleplay'),'deaf','boolean'),heroBit:i=>{const n=['uswallow','uinwater'][i];if(!n)throw new Error('Unknown LOCK hero bit '+i);return packed('struct you',hero(),n);},
  objectBit:(p,i)=>{const n=abi.objectBits[i];if(!n)throw new Error('Unknown LOCK object bit '+i);return packed('struct obj',p,n);},setObjectBit:(p,i,v)=>{const n=abi.objectBits[i];if(!n)throw new Error('Unknown LOCK object bit '+i);return packed('struct obj',p,n,v);},
  monsterBit:(p,i)=>{const n=abi.monsterBits[i];if(!n)throw new Error('Unknown LOCK monster bit '+i);return packed('struct monst',p,n);},
  objectClassBit:(p,i)=>{if(i!==0)throw new Error('Unknown LOCK class bit '+i);return packed('struct objclass',p,'oc_material');},terrainBit:(x,y,i)=>{if(i!==0)throw new Error('Unknown LOCK terrain bit '+i);return packed('struct rm',terrain(x,y),'flags');},setTerrainBit:(x,y,i,v)=>{if(i!==0)throw new Error('Unknown LOCK terrain bit '+i);return packed('struct rm',terrain(x,y),'flags',v);},
  contextBit:i=>{if(i!==0)throw new Error('Unknown LOCK context bit '+i);return ctypes.getField('struct context_info',at('struct instance_globals_saved_c',environment.requireGlobal('svc'),'context'),'move','boolean');},setContextBit:(i,v)=>{if(i!==0)throw new Error('Unknown LOCK context bit '+i);ctypes.setField('struct context_info',at('struct instance_globals_saved_c',environment.requireGlobal('svc'),'context'),'move','boolean',transport.char(v));},
  callbackPointer:callback,getOccupation:()=>memory.view.getBigUint64(occupation(),true),setOccupation:v=>memory.view.setBigUint64(occupation(),BigInt(address(v)),true),set_occupation:(fn,action,count)=>resolve('set_occupation')(address(fn),text(action),transport.long(count)),
  commandPointer:()=>environment.functionPointer('dokick','i'),cmdq_add_ec:(q,fn)=>resolve('cmdq_add_ec')(transport.int(q),address(fn)),
  commonString:i=>{if(i!==0)throw new Error('Unknown LOCK common string '+i);return ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_Something','const char *');},
  y_n:q=>resolve('yn_function')(text(q),environment.requireGlobal('ynchars'),110,1),ynq:q=>resolve('yn_function')(text(q),environment.requireGlobal('ynqchars'),113,1),
  Sprintf:(out,fmt,...args)=>{if(args.length>3)throw new Error('Review LOCK format arity');return resolve('sprintf')(address(out),text(fmt),...args.map(text));},impossible:(fmt,v)=>resolve('impossible')(text(fmt),transport.int(v)),
  singular:(obj,fn)=>{if(fn!==local.xname)throw new Error('Unexpected LOCK singular callback');return address(resolve('singular')(address(obj),environment.functionPointer('xname','pp')));},
  safe_qbuf:(out,prefix,suffix,obj,name,alternate,last)=>{let pair;if(name===local.yname&&alternate===local.ysimple_name)pair=['yname','ysimple_name'];else if(name===local.doname&&alternate===local.ansimpleoname)pair=['doname','ansimpleoname'];else throw new Error('Unexpected LOCK prompt callbacks');return address(resolve('safe_qbuf')(address(out),text(prefix),text(suffix),address(obj),environment.functionPointer(pair[0],'pp'),environment.functionPointer(pair[1],'pp'),text(last)));},
 });
 for(const n of['rn2','rnl'])local[n]=(bound,line,caller)=>{if(!['picklock','breakchestlock','forcelock','doopen_indir','doclose'].includes(caller))throw new Error('Unknown LOCK RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('lock.c'),transport.int(line),text(caller));return resolve(n)(transport.int(bound));};
 for(const n of['pline','You','You_cant','You_hear','There','pline_The','verbalize'])local[n]=(fmt,...args)=>{if(args.length>3)throw new Error('Review LOCK '+n+' arity');return resolve(n)(text(fmt),...args.map(v=>typeof v==='bigint'?transport.long(v):text(v)));};
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 function call(name,...args){if(typeof source[name]!=='function')throw new Error('Unknown LOCK source function '+name);return transport.scoped(()=>withLockEnvironment(local,L,source,context=>{
  const types=abi.public[name]?.match(/\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');if(types)args=args.map((v,i)=>scalar(types[i],v));
  if(name==='picking_lock'){args[0]=context.coordPointer(args[0]);args[1]=context.coordPointer(args[1]);}
  if(['breakchestlock','maybe_reset_pick','pick_lock','doorlock','chest_shatter_msg'].includes(name))args[0]=context.object(args[0]);if(name==='pick_lock')args[3]=context.object(args[3]);if(name==='boxlock'){args[0]=context.object(args[0]);args[1]=context.object(args[1]);}
  const v=withCEnvironment(context,source[name],...args);return typeof v==='string'?text(v):v?.address??v;
 }));}
 const owner={services:local,call,callbackPointer:callback,exports:Object.keys(abi.public),get context(){return withLockEnvironment(local,L,source,c=>c);},limitation:'Original LOCK owner and live xlock/occupation connected; ordinary door/reset acceptance is focused. Magic, trapped chests and advanced lock occupations require separate source-C proof.'};
 const inherited=new Set();
 if(environment.hasFunction('maybe_reset_pick')){
  const entry=environment.start('inventory-context');if(entry.namespace.maybe_reset_pick!==source.maybe_reset_pick)throw new Error('Unexpected earlier LOCK inventory hook');
  entry.namespace.maybe_reset_pick=(...args)=>call('maybe_reset_pick',...args);inherited.add('maybe_reset_pick');
 }
 environment.register('lock',Object.fromEntries(owner.exports.filter(n=>!inherited.has(n)).map(n=>[n,(...args)=>call(n,...args)])),local);owners.set(environment,owner);return owner;
}
