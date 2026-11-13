// Canonical original DO_NAME over the existing naming buffers and counter.
import abi from './do-name-abi.json' with {type:'json'};
import * as source from '../ported/do_name.js';
import {initializeDoName,createDoNameEnvironment} from './bindings/do_name.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableDoName(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services:S,ctypes,memory,transport}=environment,address=environment.address,L=layouts.do_name;
 for(const[k,v]of Object.entries(abi.layout))if(JSON.stringify(L[k])!==JSON.stringify(v))throw Error('Review DO_NAME ABI '+k);
 const legacy=environment.start('monster-names').environment,text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long')return transport.long(v);if(t==='unsigned long')return transport.ulong(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char'||t==='uchar')return transport.uchar(v);if(t==='short'||t==='coordxy'||t==='xint16')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Review DO_NAME prototype '+p);return{ret:m[1],args:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 const packed=(type,p,key,value)=>{let at=address(p);const parts=key.split('.'),last=parts.pop();for(const k of parts){const f=ctypes.locate(type,at,k);type=f.field.record;at=f.at;}return value===undefined?ctypes.getField(type,at,last,'unsigned int'):ctypes.setField(type,at,last,'unsigned int',transport.uint(value));};
 const rndbuf=environment.allocateGlobal('do_name.rndmonnam',L.BUFSZ),bogon=environment.requireGlobal('bogon_codes');
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(!abi.globals[i])throw Error('Unknown DO_NAME global '+i);return environment.requireGlobal(abi.globals[i]);},equipment:i=>{if(i!==0&&i!==1)throw Error('Unknown DO_NAME gear '+i);return ctypes.load('struct obj *',environment.requireGlobal(i?'uswapwep':'uwep'));},
  storage:i=>{if(i===0)return legacy.bufs[0];if(i===1)return rndbuf;if(i===2)return bogon;throw Error('Unknown DO_NAME storage '+i);},
  objectBit:(p,i)=>packed('struct obj',p,abi.bits.object[i]),setObjectBit:(p,i,v)=>packed('struct obj',p,abi.bits.object[i],v),monsterBit:(p,i)=>packed('struct monst',p,abi.bits.monster[i]),setMonsterBit:(p,i,v)=>packed('struct monst',p,abi.bits.monster[i],v),classBit:p=>packed('struct objclass',p,'oc_name_known'),
  heroBit:i=>{const k=['mfemale','uswallow','uundetected','uroleplay.deaf'][i];if(!k)throw Error('Unknown DO_NAME hero bit '+i);return packed('struct you',environment.requireGlobal('u'),k);},
  winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),commonString:i=>{if(i!==0)throw Error('Unknown DO_NAME common string');return address(ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_Never_mind','const char *'));},nulGlyphInfo:()=>environment.requireGlobal('nul_glyphinfo'),objectColor:i=>ctypes.load('const char *',environment.requireGlobal('c_obj_colors')+transport.int(i)*8),
 };
 for(const[n,p]of Object.entries(abi.dependencies)){const row=prototype(p);local[n]=(...args)=>scalar(row.ret,resolve(n)(...args.map((v,i)=>scalar(row.args[i],v))));}
 const window=(field,sig,...args)=>environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),field,'void *'),sig,...args);
 Object.assign(local,{create_nhwindow:t=>window('win_create_nhwindow','ii',transport.int(t)),start_menu:(w,f)=>window('win_start_menu','vij',transport.int(w),transport.ulong(f)),end_menu:(w,p)=>window('win_end_menu','vip',transport.int(w),text(p)),display_nhwindow:(w,b)=>window('win_display_nhwindow','vii',transport.int(w),transport.char(b)),destroy_nhwindow:w=>window('win_destroy_nhwindow','vi',transport.int(w)),getlin:(p,out)=>window('win_getlin','vpp',text(p),text(out)),free:p=>resolve('free')(address(p))});
 local.Strcpy=local.strcpy;local.Strcat=local.strcat;
 for(const n of ['pline','You','There','verbalize','impossible'])local[n]=(fmt,...a)=>resolve(n)(text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(out,fmt,...a)=>S.sprintf(text(out),text(fmt),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.livelog_printf=(mask,fmt,...a)=>resolve('livelog_printf')(transport.long(mask),text(fmt),...a.map(text));
 local.assert=value=>{if(!value){const a=abi.assertion;resolve('__assert_fail')(text(a.condition),text(a.file),a.line,text(a.function));}};
 for(const n of ['rn2','rn1'])local[n]=(bound,...args)=>{const caller=args.pop(),line=args.pop();if(!abi.rngSites.some(r=>r.kind===n&&r.line===line&&r.caller===caller))throw Error('Unexpected DO_NAME RNG source '+n+':'+line);if(S.rng_log_enabled())S.rng_log_set_caller(text('do_name.c'),line,text(caller));const value=resolve('rn2')(transport.int(bound));return n==='rn1'?transport.int(value+transport.int(args[0])):value;};
 let context;const callbacks=new Map();function callback(n,sig){if(environment.hasFunction(n))return environment.functionPointer(n,sig);if(!callbacks.has(n))callbacks.set(n,environment.functions.functionPointer((...a)=>call(n,...a),sig));return callbacks.get(n);}
 local.getobj=(prompt,which,flags)=>{const n=['name_ok','call_ok'][which];if(!n)throw Error('Unknown DO_NAME getobj callback');return resolve('getobj')(text(prompt),callback(n,'ip'),transport.uint(flags));};
 local.safe_qbuf=(out,prefix,suffix,obj,which,last)=>{if(which!==0&&which!==1)throw Error('Unknown DO_NAME safe_qbuf callback');const first=which?callback('docall_xname','pp'):environment.functionPointer('xname','pp');return resolve('safe_qbuf')(text(out),text(prefix),text(suffix),address(obj),first,environment.functionPointer('simpleonames','pp'),text(last));};
 local.get_rnd_text=(file,out,pad)=>resolve('get_rnd_text')(text(file),text(out),environment.functionPointer('rn2_on_display_rng','ii'),transport.uint(pad));
 const state=initializeDoName(local);Object.defineProperty(state,'bufidx',{get:()=>legacy.bufidx,set:v=>{legacy.bufidx=v;},configurable:true});context=createDoNameEnvironment(local,L);
 function call(n,...args){const p=abi.public[n]??({name_ok:'int (struct obj *)',call_ok:'int (struct obj *)',docall_xname:'char *(struct obj *)'})[n];if(!p)throw Error('Unknown original DO_NAME export '+n);const row=prototype(p);return transport.scoped(()=>{args=args.map((v,i)=>scalar(row.args[i],v));row.args.forEach((t,i)=>{if(t==='struct monst *')args[i]=context.monster(args[i]);if(t==='struct obj *')args[i]=context.object(args[i]);if(t==='const struct permonst *'||t==='struct permonst *')args[i]=context.permonst(args[i]);});if(n==='noveltitle')args[0]=context.intPointer(args[0]);if(n==='lookup_novel')args[1]=context.intPointer(args[1]);const result=withCEnvironment(context,()=>source[n](...args));return scalar(row.ret,result?.address??result);});}
 const groups=['monster-names','monster-naming','item-naming','object-safe-name','surface-liquid-naming','special-item-naming'],forwarded=[];
 for(const group of groups){let entry;try{entry=environment.start(group);}catch(e){if(e.message==='Unresolved standalone module '+group)continue;throw e;}for(const n of Object.keys(abi.public))if(Object.hasOwn(entry.namespace,n)){entry.namespace[n]=(...args)=>call(n,...args);forwarded.push({name:n,group});}}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('naming-public',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])));
 const owner={context,services:local,call,exports:names,forwarded,limitations:'Full source surface transport; only explicitly C-compared naming/UI paths accepted.'};owners.set(environment,owner);return owner;
}
