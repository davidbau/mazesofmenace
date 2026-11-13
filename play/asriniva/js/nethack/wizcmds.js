// Original configured wizard commands on one strict native-shaped context.
import abi from './wizcmds-abi.json' with {type:'json'};
import * as source from '../ported/wizcmds.js';
import {createWizcmdsEnvironment} from './bindings/wizcmds.js';
import {withCEnvironment} from '../c-runtime/context.js';
const cache=new WeakMap();
export function enableWizcmds(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.wizcmds[k]!==v)throw Error('Review WIZCMDS ABI '+k);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.abiType(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='double'||t==='float')return Number(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.*?)\s*\((.*)\)$/);if(!m)throw Error('Review WIZCMDS prototype '+p);const args=[];let depth=0,start=0;for(let i=0;i<m[2].length;i++){const c=m[2][i];if(c==='(')depth++;else if(c===')'){if(--depth<0)throw Error('Unbalanced WIZCMDS prototype '+p);}else if(c===','&&depth===0){args.push(m[2].slice(start,i).trim());start=i+1;}}if(depth)throw Error('Unbalanced WIZCMDS prototype '+p);const last=m[2].slice(start).trim();if(last&&last!=='void')args.push(last);return{ret:m[1].trim(),args};};
 for(const[n,p]of Object.entries(abi.dependencies))if(prototype(p).args.length!==abi.dependencyArity[n])throw Error('Review WIZCMDS native dependency arity '+n);
 for(const[n,p]of Object.entries(abi.functionTypes))if(prototype(p).args.length!==abi.functionArity[n])throw Error('Review WIZCMDS original function arity '+n);
 const shared=abi.globals.map(n=>environment.requireGlobal(n)),base=Object.create(null),records=Object.values(abi.schema);
 for(const[n,p]of Object.entries(abi.dependencies)){const t=prototype(p);base[n]=(...a)=>scalar(t.ret,resolve(n)(...t.args.map((t,i)=>scalar(t,a[i]))));}
 for(const[n,row]of Object.entries(abi.variadics))base[n]=(...a)=>scalar(row.ret,resolve(row.name)(...row.types.map((t,i)=>scalar(t,a[i]))));
 function field(k,p,i){const r=records[k],f=r?.fields[i];if(!f)throw Error('Unknown WIZCMDS field');return{r,f,p:address(p)};}
 Object.assign(base,{alloc:n=>environment.alloc('alloc',transport.uint(n)),moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw Error('Unknown WIZCMDS global');return shared[i];},
  read:(k,p,i)=>{const{r,f}=field(k,p,i);return ctypes.getField(r.ctype,address(p),f.name,f.ctype);},write:(k,p,i,v)=>{const{r,f}=field(k,p,i);return ctypes.setField(r.ctype,address(p),f.name,f.ctype,v);},address:(k,p,i)=>{const{r,f}=field(k,p,i);if(f.bit)throw Error('WIZCMDS bitfield has no address');return ctypes.locate(r.ctype,address(p),f.name).at;},
  functionPointer:i=>{const n=abi.functions[i],p=abi.functionTypes[n];if(!n||!p||abi.callbackIndices[i]!==n)throw Error('Unknown WIZCMDS native callback index');const t=prototype(p),sig=[t.ret,...t.args].map(t=>t.includes('*')?'p':t==='void'?'v':/\blong\b/.test(t)?'j':'i').join('');return environment.functionPointer(Object.hasOwn(abi.public,n)?n:'wizcmds::'+n,sig,(...a)=>call(n,...a));},
  rn2:(n,line,caller)=>{if(!abi.rngSites.some(([l,f])=>l===Number(line)&&f===caller))throw Error('Unexpected WIZCMDS RNG site');if(services.rng_log_enabled())services.rng_log_set_caller(text('wizcmds.c'),transport.int(line),text(caller));return resolve('rn2')(transport.int(n));},
 });
 const win={create_nhwindow:['int',['int']],putstr:['void',['int','int','const char *']],display_nhwindow:['void',['int','boolean']],destroy_nhwindow:['void',['int']],start_menu:['void',['int','unsigned long']],end_menu:['void',['int','const char *']]};
 for(const[n,[ret,args]]of Object.entries(win))base[n]=(...a)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_'+n).at,sig=[ret,...args].map(t=>t.includes('*')?'p':t==='void'?'v':ctypes.size(ctypes.canonical(t))===8?'j':'i').join('');return scalar(ret,functions.indirect(memory.view.getBigUint64(at,true),sig,...args.map((t,i)=>scalar(t,a[i]))));};
 const local=new Proxy(base,{get:(o,k)=>{if(Object.hasOwn(o,k))return o[k];if(typeof k==='symbol')return undefined;throw Error('Missing WIZCMDS native transport '+k);}}),context=createWizcmdsEnvironment(local,layouts.wizcmds,source);
 function call(name,...args){return transport.scoped(()=>{const t=prototype(abi.functionTypes[name]);args=t.args.map((t,i)=>scalar(t,args[i]?.address??args[i]));const views={makemap_unmakemon:{0:'monst'},size_obj:{0:'obj'},count_obj:{0:'obj',1:'long*',2:'long*'},obj_chain:{2:'obj',4:'long*',5:'long*'},mon_invent_chain:{2:'monst',3:'long*',4:'long*'},contained_stats:{2:'long*',3:'long*'},size_monst:{0:'monst'},mon_chain:{2:'monst',4:'long*',5:'long*'},misc_stats:{1:'long*',2:'long*'},list_migrating_mons:{0:'d_level'}};for(const[i,type]of Object.entries(views[name]??{}))args[i]=type==='long*'?context.longPointer(args[i]):context.view(type,args[i]);return scalar(t.ret,withCEnvironment(context,source[name],...args));});}
 for(const n of Object.keys(abi.public))if(environment.hasFunction(n))throw Error('Unexpected existing WIZCMDS owner '+n);
 environment.register('wizcmds',Object.fromEntries(Object.keys(abi.public).map(n=>[n,(...a)=>call(n,...a)])));
 const result={context,services:local,call,exports:Object.keys(abi.public)};cache.set(environment,result);return result;
}
