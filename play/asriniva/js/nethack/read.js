// Original READ policies on one context and its source-private gremlins head.
import abi from './read-abi.json' with{type:'json'};
import * as source from '../ported/read.js';
import {createReadEnvironment} from './bindings/read.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableRead(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport}=environment,address=environment.address,L=layouts.read,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review READ ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),local=Object.create(services),head=environment.allocateGlobal('read.gremlins',8);
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const split=s=>{let depth=0,start=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;else if(s[i]===')')depth--;else if(s[i]===','&&!depth){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out.filter(t=>t&&t!=='void');};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown READ prototype '+p);return{result:m[1].trim(),params:split(m[2])};};
 const scalar=(type,v)=>{type=ctypes.abiType(type);if(type==='void')return undefined;if(type.includes('*'))return typeof v==='function'?callback(Object.keys(abi.callbacks).find(n=>source[n]===v||local[n]===v)):text(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(type==='float'||type==='double')return Number(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const invoke=(row,args)=>{const p=prototype(row.prototype);if(args.length!==p.params.length)throw new Error('READ foreign arity '+row.target+': '+args.length+'/'+p.params.length);return scalar(p.result,resolve(row.target)(...args.map((v,i)=>scalar(p.params[i],v))));};
 for(const[n,row]of Object.entries(abi.calls))local[n]=(...args)=>invoke(row,args);
 const signature=p=>{const row=prototype(p),one=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'||t==='double'?'d':ctypes.size(t)===8?'j':'i';};return[one(row.result),...row.params.map(one)].join('');};
 const callback=name=>{const row=abi.callbacks[name];if(!row)throw new Error('Unknown READ callback '+name);const sig=signature(row.prototype);return environment.hasFunction(name)?environment.functionPointer(name,sig):environment.functionPointer('read::'+name,sig,(...args)=>call(name,...args));};
 const bit=(i,p,v)=>{const row=abi.bits[i];if(!row)throw new Error('Unknown READ packed field '+i);const f=ctypes.record(row.type).fields[row.field],type=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+row.field+'$'),'').trim();return v===undefined?ctypes.getField(row.type,address(p),row.field,type):ctypes.setField(row.type,address(p),row.field,type,v);};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown READ global '+i);return environment.requireGlobal(n);},bit:(i,p)=>bit(i,p),setBit:(i,p,v)=>bit(i,p,v),callback,sourceData:i=>{if(i!==0)throw new Error('Unknown READ private storage '+i);return head;},
  rngSource:(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('read.c'),transport.int(line),text(caller));},
  rn2:n=>resolve('rn2')(transport.int(n)),rnd:n=>resolve('rnd')(transport.int(n)),d:(n,s)=>resolve('d')(transport.int(n),transport.int(s)),rn1:(n,b)=>transport.int(resolve('rn2')(transport.int(n))+transport.int(b)),
 });
 const shape=fmt=>{const value=typeof fmt==='string'?fmt:memory.readString(address(fmt)),re=/%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?([lhz]*)([diouxXcsfFeEgGaAp%])/g;let out='',m;while((m=re.exec(value))){if(m[5]==='%')continue;if(m[2]==='*')out+='i';if(m[3]==='*')out+='i';out+=/[fFeEgGaA]/.test(m[5])?'d':/[sp]/.test(m[5])?'p':m[4].includes('l')?'j':'i';}return out;};
 for(const[name,shapes]of Object.entries(abi.formats))local[name]=(...args)=>{const index=name==='Snprintf'?4:['Sprintf','livelog_printf'].includes(name)?1:0,key=shape(args[index]),row=shapes[key];if(!row)throw new Error('Unknown READ '+name+' format shape '+key);return invoke(row,args);};
 const context=createReadEnvironment(local,L);
 function call(name,...args){if(typeof source[name]!=='function')throw new Error('Unknown READ source '+name);return transport.scoped(()=>{args=args.map((v,i)=>{const t=abi.params[name]?.[i];if(!t)throw new Error('Unexpected READ argument '+name);const target=t.replace(/\s*\*$/,'');if(t.endsWith('**')||t.endsWith('* *'))return context.ref(target,address(v));if(t==='int *')return context.ref('int',address(v));if(t.endsWith('*')&&abi.records.includes(target))return context.record(target,address(v));return scalar(t,v);});const result=withCEnvironment(context,()=>source[name](...args));return typeof result==='string'?services.literal(result):result?.address??result;});}
 // assign_candy_wrapper is already owned by a stateless original-source hook.
 // It has no gremlins/private state to migrate; retain that existing public owner.
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('read',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])));
 const owner={call,context,services:local,callback,exports:names,storage:head,limitation:'Whole original READ context/gremlins storage connected with existing stateless candy-wrapper owner retained. Ordinary scroll and invocation lifecycle acceptance is focused; absent foreign owners fail explicitly.'};owners.set(environment,owner);return owner;
}
