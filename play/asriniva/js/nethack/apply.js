// One cached original APPLY context; all mutable tool/occupation state stays shared.
import abi from './apply-abi.json' with{type:'json'};
import * as source from '../ported/apply.js';
import {callApply} from './bindings/apply.js';
const owners=new WeakMap();
export function enableApply(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(layouts.apply[k]!==v)throw new Error('Review APPLY ABI '+k);
 const L={...layouts.apply};for(const[k,row]of Object.entries(abi.relocations))Object.defineProperty(L,k,{enumerable:true,get:()=>ctypes.getField(row.record,environment.requireGlobal(row.global),row.field,'const char *')});
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{if(Object.hasOwn(o,k))return Reflect.get(o,k,r);const v=Reflect.has(o,k)?Reflect.get(o,k,r):undefined;if(v!==undefined&&typeof v!=='function')return v;if(typeof k!=='string')return v;if(!forwards.has(k))forwards.set(k,(...args)=>resolve(k)(...args.map(v=>typeof v==='string'?services.literal(v):v?.address??v)));return forwards.get(k);}});
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const split=s=>{let depth=0,start=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;else if(s[i]===')')depth--;else if(s[i]===','&&!depth){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out.filter(t=>t&&t!=='void');};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown APPLY prototype '+p);return{result:m[1].trim(),params:split(m[2])};};
 const scalar=(type,v)=>{type=ctypes.canonical(type);if(type==='void')return undefined;if(type.includes('*'))return text(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(type==='float'||type==='double')return Number(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const invoke=(row,args)=>{const p=prototype(row.prototype);if(args.length!==p.params.length)throw new Error('APPLY foreign arity '+row.target+': '+args.length+'/'+p.params.length);return scalar(p.result,resolve(row.target)(...args.map((v,i)=>scalar(p.params[i],v))));};
 for(const[n,row]of Object.entries(abi.calls))local[n]=(...args)=>invoke(row,args);
 const signature=p=>{const row=prototype(p),one=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'||t==='double'?'d':ctypes.size(t)===8?'j':'i';};return[one(row.result),...row.params.map(one)].join('');};
 const callback=name=>{const row=abi.callbacks[name];if(!row)throw new Error('Unknown APPLY callback '+name);const sig=signature(row.prototype);return row.sourceOwner==='foreign'||environment.hasFunction(name)?environment.functionPointer(name,sig):environment.functionPointer('apply::'+name,sig,(...args)=>call(name,...args));};
 const bit=(i,p,v)=>{const row=abi.bits[i];if(!row)throw new Error('Unknown APPLY packed field '+i);const f=ctypes.record(row.type).fields[row.field],type=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+row.field+'$'),'').trim();return v===undefined?ctypes.getField(row.type,address(p),row.field,type):ctypes.setField(row.type,address(p),row.field,type,v);};
 Object.assign(local,{moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown APPLY global '+i);return environment.requireGlobal(n);},bit:(i,p)=>bit(i,p),setBit:(i,p,v)=>bit(i,p,v),callback,
  rngSource:(line,caller)=>{if(!abi.callers.includes(caller))throw new Error('Unknown APPLY RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('apply.c'),transport.int(line),text(caller));},
  rn2:n=>resolve('rn2')(transport.int(n)),rnd:n=>resolve('rnd')(transport.int(n)),rnl:n=>resolve('rnl')(transport.int(n)),d:(n,s)=>resolve('d')(transport.int(n),transport.int(s)),rn1:(n,b)=>transport.int(resolve('rn2')(transport.int(n))+transport.int(b)),
 });
 const shape=fmt=>{const value=typeof fmt==='string'?fmt:memory.readString(address(fmt)),re=/%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?([lhz]*)([diouxXcsfFeEgGaAp%])/g;let out='',m;while((m=re.exec(value))){if(m[5]==='%')continue;if(m[2]==='*')out+='i';if(m[3]==='*')out+='i';out+=/[fFeEgGaA]/.test(m[5])?'d':/[sp]/.test(m[5])?'p':m[4].includes('l')?'j':'i';}return out;};
 for(const[name,shapes]of Object.entries(abi.formats))local[name]=(...args)=>{const index=name==='Snprintf'?4:['Sprintf','custompline','livelog_printf'].includes(name)?1:0,key=shape(args[index]),row=shapes[key];if(!row)throw new Error('Unknown APPLY '+name+' format shape '+key);return invoke(row,args);};
 const window=(name,sig,...args)=>{const f=ctypes.record('struct window_procs').fields[name];if(!f)throw new Error('Unknown APPLY window '+name);return functions.indirect(memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true),sig,...args);};
 Object.assign(local,{create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),start_menu:(win,flags)=>window('win_start_menu','vij',transport.int(win),transport.ulong(flags)),end_menu:(win,prompt)=>window('win_end_menu','vip',transport.int(win),text(prompt)),destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win))});
 function call(name,...args){if(typeof source[name]!=='function')throw new Error('Unknown APPLY source '+name);return transport.scoped(()=>callApply(local,L,name,...args));}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('apply',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])),local);
 const owner={call,services:local,callback,exports:names,limitation:'Original APPLY context/shared trap, leash and polearm state connected. Actual ordinary-tool/reset and invocation-item paths need focused C acceptance; unvisited foreign dependencies fail explicitly.'};owners.set(environment,owner);return owner;
}
