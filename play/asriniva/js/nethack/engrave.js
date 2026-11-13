// Original ENGRAVE policies on the shared head chain and saved occupation fields.
import abi from './engrave-abi.json' with {type:'json'};
import * as source from '../ported/engrave.js';
import {createEngraveEnvironment} from './bindings/engrave.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableEngrave(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services:S,ctypes,memory,transport}=environment,address=environment.address,L=layouts.engrave;
 for(const[k,v]of Object.entries(abi.layout))if(JSON.stringify(L[k])!==JSON.stringify(v))throw Error('Review ENGRAVE ABI '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long'||t==='cmdcount_nht')return transport.long(v);if(t==='unsigned long'||t==='size_t')return transport.ulong(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char'||t==='uchar')return transport.uchar(v);if(t==='short'||t==='coordxy'||t==='xint16')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int'||t==='unsigned')return transport.uint(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Review ENGRAVE prototype '+p);return{ret:m[1],args:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 const packed=(type,p,key,value)=>{let at=address(p);const parts=key.split('.'),last=parts.pop();for(const k of parts){const f=ctypes.locate(type,at,k);type=f.field.record;at=f.at;}return value===undefined?ctypes.getField(type,at,last,'unsigned int'):ctypes.setField(type,at,last,'unsigned int',transport.uint(value));};
 const encodedSize=source.blind_writing.length*21,encoded=environment.allocateGlobal('engrave.encoded',encodedSize);
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(!abi.globals[i])throw Error('Unknown ENGRAVE global '+i);return environment.requireGlobal(abi.globals[i]);},head:()=>ctypes.load('struct engr *',environment.requireGlobal('head_engr')),setHead:p=>ctypes.store('struct engr *',environment.requireGlobal('head_engr'),address(p)),equipment:i=>{const n=['uwep','uarms','ublindf'][i];if(!n)throw Error('Unknown ENGRAVE gear '+i);return ctypes.load('struct obj *',environment.requireGlobal(n));},hands:()=>environment.requireGlobal('hands_obj'),
  storage:i=>{if(i!==0)throw Error('Unknown ENGRAVE storage');return encoded;},storageSize:i=>{if(i!==0)throw Error('Unknown ENGRAVE storage size');return encodedSize;},
  objectBit:(p,i)=>packed('struct obj',p,abi.bits.object[i]),setObjectBit:(p,i,v)=>packed('struct obj',p,abi.bits.object[i],v),classBit:(p,i)=>packed('struct objclass',p,abi.bits.class[i]),engrBit:(p,i)=>packed('struct engr',p,abi.bits.engr[i]),setEngrBit:(p,i,v)=>packed('struct engr',p,abi.bits.engr[i],v),terrainBit:(p,i)=>packed('struct rm',p,abi.bits.terrain[i]),setTerrainBit:(p,i,v)=>packed('struct rm',p,abi.bits.terrain[i],v),
  heroBit:i=>{const k=['uswallow','uundetected','uroleplay.deaf'][i];if(!k)throw Error('Unknown ENGRAVE hero bit '+i);return packed('struct you',environment.requireGlobal('u'),k);},
  commonString:i=>{if(i===3)return environment.requireGlobal('ynqchars');const n=['c_Something','c_Never_mind','c_vision_clears'][i];if(!n)throw Error('Unknown ENGRAVE common string');return address(ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),n,'const char *'));},
 };
 for(const[n,p]of Object.entries(abi.dependencies)){const row=prototype(p);local[n]=(...args)=>scalar(row.ret,resolve(n)(...args.map((v,i)=>scalar(row.args[i],v))));}
 local.Strcpy=local.strcpy;local.Strcat=local.strcat;local.free=p=>resolve('free')(address(p));
 const window=(field,sig,...args)=>environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),field,'void *'),sig,...args);
 local.getlin=(p,out)=>window('win_getlin','vpp',text(p),text(out));
 local.Strlen=(p,i)=>{const row=abi.strlenSites[i];if(!row)throw Error('Unknown ENGRAVE Strlen source');return transport.uint(resolve('Strlen_')(text(p),text(row.function),row.line));};
 for(const n of ['pline','You','Your','You_cant','You_see','There','pline_The','impossible'])local[n]=(fmt,...a)=>resolve(n)(text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(out,fmt,...a)=>S.sprintf(text(out),text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));local.livelog_printf=(mask,fmt,...a)=>resolve('livelog_printf')(transport.long(mask),text(fmt),...a.map(text));
 for(const n of ['rn2','rn1','rnd'])local[n]=(bound,...args)=>{const caller=args.pop(),line=args.pop();if(!abi.rngSites.some(r=>r.kind===n&&r.line===line&&r.caller===caller))throw Error('Unexpected ENGRAVE RNG source '+n+':'+line);if(S.rng_log_enabled())S.rng_log_set_caller(text('engrave.c'),line,text(caller));const value=resolve(n==='rnd'?'rnd':'rn2')(transport.int(bound));return n==='rn1'?transport.int(value+transport.int(args[0])):value;};
 let context;const callbacks=new Map();function callback(n,sig){if(environment.hasFunction(n))return environment.functionPointer(n,sig);if(!callbacks.has(n))callbacks.set(n,environment.functionPointer('engrave::'+n,sig,(...args)=>call(n,...args)));return callbacks.get(n);}
 local.getobj=(prompt,flags)=>resolve('getobj')(text(prompt),callback('stylus_ok','ip'),transport.uint(flags));local.set_occupation=(label,time)=>resolve('set_occupation')(callback('engrave','i'),text(label),transport.long(time));
 local.get_rnd_text=(file,out,pad)=>resolve('get_rnd_text')(text(file),text(out),environment.functionPointer('rn2','ii'),transport.uint(pad));
 for(const direction of ['sfo','sfi'])for(const type of ['unsigned','engr','char'])local[(direction==='sfo'?'Sfo_':'Sfi_')+type]=(file,data,tag,...count)=>resolve(direction+'_'+type)(address(file),address(data),text(tag),...count.map(transport.int));
 context=createEngraveEnvironment(local,L);
 function call(n,...args){const p=abi.public[n]??({stylus_ok:'int (struct obj *)',engrave:'int (void)'})[n];if(!p)throw Error('Unknown original ENGRAVE export '+n);const row=prototype(p);return transport.scoped(()=>{args=args.map((v,i)=>scalar(row.args[i],v));if(n==='stylus_ok')args[0]=context.object(args[0]);if(['engr_can_be_felt','del_engr','rloc_engr','see_engraving','feel_engraving'].includes(n))args[0]=context.engr(args[0]);if(['save_engravings','rest_engravings'].includes(n))args[0]=context.nhfile(args[0]);if(n==='engr_stats'){args[2]=context.longPointer(args[2]);args[3]=context.longPointer(args[3]);}const result=withCEnvironment(context,()=>source[n](...args));return scalar(row.ret,result?.address??result);});}
 const groups=['world-engravings','engraving-persistence'],forwarded=[];
 for(const group of groups){let entry;try{entry=environment.start(group);}catch(e){if(e.message==='Unresolved standalone module '+group)continue;throw e;}for(const n of Object.keys(abi.public))if(Object.hasOwn(entry.namespace,n)){entry.namespace[n]=(...args)=>call(n,...args);forwarded.push({name:n,group});}}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('engraving-public',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])));
 const owner={context,services:local,call,exports:names,forwarded,limitations:'Full source public surface; only separately C-compared engraving/persistence paths accepted.'};owners.set(environment,owner);return owner;
}
