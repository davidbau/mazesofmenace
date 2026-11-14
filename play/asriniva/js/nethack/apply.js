// Complete native APPLY graph shares hero, items, leashes and occupations.
import abi from './apply-abi.json' with{type:'json'};
import {nativeStateFor} from './native/state-bridge.js';
import {createNativeAbiCaster} from './native/execution.js';
import {createNativeApplyState,nativeApplyMembers} from './native/apply-state.js';
import {createNativeApplyCalls} from './native/apply-calls.js';
import {createNativeApplyEntries} from './native/apply-entries.js';
const owners=new WeakMap();
export function enableApply(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v),native=nativeStateFor(environment);
 for(const[k,v]of Object.entries(abi.layout))if(layouts.apply[k]!==v)throw new Error('Review APPLY ABI '+k);
 const L={...layouts.apply};for(const[k,row]of Object.entries(abi.relocations))Object.defineProperty(L,k,{enumerable:true,get:()=>native.nativeRecords.record(row.record,environment.requireGlobal(row.global))[row.field]});
 const resolve=n=>native.functions.get(n)??(environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n));
 const local=Object.create(services);
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const split=s=>{let depth=0,start=0,out=[];for(let i=0;i<s.length;i++){if(s[i]==='(')depth++;else if(s[i]===')')depth--;else if(s[i]===','&&!depth){out.push(s.slice(start,i).trim());start=i+1;}}out.push(s.slice(start).trim());return out.filter(t=>t&&t!=='void');};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw new Error('Unknown APPLY prototype '+p);return{result:m[1].trim(),params:split(m[2])};};
 const caster=createNativeAbiCaster(ctypes,transport,text),plans=new WeakMap();
 const plan=row=>{if(plans.has(row))return plans.get(row);const p=prototype(row.prototype),args=p.params.map(caster),result=caster(p.result);const targetType=p.result.replace(/\s*\*$/,'').replace(/^const\s+/,'');const recordResult=p.result.includes('*')&&ctypes.isRecord(targetType);const value={arity:args.length,args,pointers:p.params.map(t=>t.includes('*')),result,recordResult};plans.set(row,value);return value;};
 const invoke=(row,args)=>{const p=plan(row);if(args.length!==p.arity)throw new Error('APPLY foreign arity '+row.target+': '+args.length+'/'+p.arity);const fn=resolve(row.target),target=fn.nativeValuesEntry??fn;const direct=target.nativeState===native&&target.nativeDirect;const converted=args.map((v,i)=>direct&&p.pointers[i]&&v&&typeof v==='object'?v:p.args[i](v));const value=direct?target(...converted):native.boundary(fn,...converted);return direct&&p.recordResult?value:p.result(value);};
 Object.assign(local,createNativeApplyCalls(resolve,native,type=>{const cast=caster(type),pointer=type.includes('*'),recordResult=pointer&&ctypes.isRecord(type.replace(/\s*\*$/,'').replace(/^const\s+/,''));return{foreign:cast,native:pointer?v=>v&&typeof v==='object'?v:cast(v):cast,result:recordResult?v=>v:cast};}));
 const signature=p=>{const row=prototype(p),one=t=>{t=ctypes.canonical(t);return t.includes('*')?'p':t==='void'?'v':t==='float'||t==='double'?'d':ctypes.size(t)===8?'j':'i';};return[one(row.result),...row.params.map(one)].join('');};
 let context;const getContext=()=>context??=createNativeApplyState(local,L);const entries=createNativeApplyEntries(getContext,native,transport,services.literal);
 const callback=name=>{const row=abi.callbacks[name];if(!row)throw new Error('Unknown APPLY callback '+name);const sig=signature(row.prototype);return row.sourceOwner==='foreign'||environment.hasFunction(name)?environment.functionPointer(name,sig):environment.functionPointer('apply::'+name,sig,(...args)=>entries[name](...args));};
 const bit=(i,p,v)=>{const row=abi.bits[i];if(!row)throw new Error('Unknown APPLY packed field '+i);const f=ctypes.record(row.type).fields[row.field],type=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+row.field+'$'),'').trim();return v===undefined?ctypes.getField(row.type,address(p),row.field,type):ctypes.setField(row.type,address(p),row.field,type,v);};
 Object.assign(local,{nativeEnvironment:environment,nativeLayouts:layouts,nativeApplyAbi:abi,moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown APPLY global '+i);return environment.requireGlobal(n);},bit:(i,p)=>bit(i,p),setBit:(i,p,v)=>bit(i,p,v),callback,
  rngSource:(line,caller)=>{if(!abi.callers.includes(caller))throw new Error('Unknown APPLY RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('apply.c'),transport.int(line),text(caller));},
  rn2:n=>resolve('rn2')(transport.int(n)),rnd:n=>resolve('rnd')(transport.int(n)),rnl:n=>resolve('rnl')(transport.int(n)),d:(n,s)=>resolve('d')(transport.int(n),transport.int(s)),rn1:(n,b)=>transport.int(resolve('rn2')(transport.int(n))+transport.int(b)),
 });
 const shape=fmt=>{const value=typeof fmt==='string'?fmt:memory.readString(address(fmt)),re=/%([-+ #0]*)(\d+|\*)?(?:\.(\d+|\*))?([lhz]*)([diouxXcsfFeEgGaAp%])/g;let out='',m;while((m=re.exec(value))){if(m[5]==='%')continue;if(m[2]==='*')out+='i';if(m[3]==='*')out+='i';out+=/[fFeEgGaA]/.test(m[5])?'d':/[sp]/.test(m[5])?'p':m[4].includes('l')?'j':'i';}return out;};
 for(const[name,shapes]of Object.entries(abi.formats))local[name]=(...args)=>{const index=name==='Snprintf'?4:['Sprintf','custompline','livelog_printf'].includes(name)?1:0,key=shape(args[index]),row=shapes[key];if(!row)throw new Error('Unknown APPLY '+name+' format shape '+key);return invoke(row,args);};
 const window=(name,sig,...args)=>{if(environment.nativeWindowCallbacks)return environment.nativeWindowCallbacks.invoke(name,sig,...args);const f=ctypes.record('struct window_procs').fields[name];if(!f)throw new Error('Unknown APPLY window '+name);return functions.indirect(memory.view.getBigUint64(environment.requireGlobal('windowprocs')+f.offset,true),sig,...args);};
 Object.assign(local,{create_nhwindow:type=>window('win_create_nhwindow','ii',transport.int(type)),start_menu:(win,flags)=>window('win_start_menu','vij',transport.int(win),transport.ulong(flags)),end_menu:(win,prompt)=>window('win_end_menu','vip',transport.int(win),text(prompt)),destroy_nhwindow:win=>window('win_destroy_nhwindow','vi',transport.int(win))});
 function call(name,...args){if(!entries[name])throw new Error('Unknown native APPLY source '+name);return entries[name](...args);}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));for(const name of names)native.functions.set(name,entries[name]);environment.register('apply',Object.fromEntries(names.map(n=>[n,entries[n]])));
 // Every statically named service is bound once; misspellings cannot become a
 // dynamically invented forwarding function through a Proxy.
 const used=new Set(nativeApplyMembers);for(const name of used)if(!(name in local)&&!abi.globals.includes(name))local[name]=(...args)=>native.boundary(resolve(name),...args.map(v=>typeof v==='string'?services.literal(v):v?.address??v));
 const owner={call,services:local,callback,exports:names,entries,get context(){return getContext();},limitation:'Complete native APPLY records and direct graph; genuine byte buffers, callbacks, local records and external engine paths retain boundaries.'};owners.set(environment,owner);return owner;
}
