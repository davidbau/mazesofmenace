// One original POLYSELF source context for initial helpers and full form policy.
import abi from './polyself-abi.json' with {type:'json'};
import * as source from '../ported/polyself.js';
import {createPolyselfEnvironment} from '../ported/polyself-runtime.js';
import {withCEnvironment} from '../ported/c-runtime.js';
const owners=new WeakMap();
export function enablePolyself(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services:S,ctypes,memory,transport}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.polyself[k]!==v)throw Error('Review POLYSELF native layout '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long')return transport.long(v);if(t==='unsigned long')return transport.ulong(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char'||t==='uchar')return transport.uchar(v);if(t==='short'||t==='coordxy'||t==='xint16')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Review POLYSELF prototype '+p);return{ret:m[1],args:m[2].split(',').map(s=>s.trim()).filter(s=>s&&s!=='void')};};
 const names=Object.keys(abi.schema),field=(k,p,i)=>{const type=names[k],f=abi.schema[type]?.fields[i];if(!f)throw Error('Unknown POLYSELF native field');return{type,f,p:address(p)};};
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(!abi.globals[i])throw Error('Unknown POLYSELF global '+i);return environment.requireGlobal(abi.globals[i].name);},
  read:(k,p,i)=>{const e=field(k,p,i);return ctypes.getField(e.type,e.p,e.f.name,e.f.ctype);},write:(k,p,i,v)=>{const e=field(k,p,i);return ctypes.setField(e.type,e.p,e.f.name,e.f.ctype,v);},address:(k,p,i)=>{const e=field(k,p,i);return ctypes.locate(e.type,e.p,e.f.name).at;},
  rngCaller:i=>{const row=abi.rngSites[i];if(!row)throw Error('Unknown POLYSELF RNG site '+i);if(S.rng_log_enabled())S.rng_log_set_caller(text('polyself.c'),row.line,text(row.function));},
 };
 for(const n of ['rn2','rnd','rnl','d'])local[n+'Value']=(...args)=>resolve(n)(...args.map(transport.int));
 for(const[n,p]of Object.entries(abi.dependencies)){const row=prototype(p);local[n]=(...args)=>scalar(row.ret,resolve(n)(...args.map((v,i)=>scalar(row.args[i],v))));}
 for(const[n,row]of Object.entries(abi.variadicABI))local[n]=(...args)=>scalar(row.ret,resolve(row.name)(...args.map((v,i)=>scalar(row.types[i],v))));
 const context=createPolyselfEnvironment(local,layouts.polyself);
 function call(name,...args){const p=abi.public[name];if(!p)throw Error('Unknown original POLYSELF public '+name);const row=prototype(p);return transport.scoped(()=>{args=args.map((v,i)=>scalar(row.args[i],v));if(name==='mbodypart')args[0]=context.view('monst',args[0]);const result=withCEnvironment(context,()=>source[name](...args));return scalar(row.ret,result?.address??result);});}
 // This replaces the previous five hero-form callPolyself wrappers at assembly.
 if(environment.hasFunction('set_uasmon'))throw Error('POLYSELF must replace the existing hero-form assembly, not create a second owner');
 environment.register('hero-form',Object.fromEntries(Object.keys(abi.public).map(n=>[n,(...args)=>call(n,...args)])));
 const owner={context,services:local,call,exports:Object.keys(abi.public),limitations:'Native transport is shared by all public entry points; only separately C-compared source paths accepted.'};owners.set(environment,owner);return owner;
}
