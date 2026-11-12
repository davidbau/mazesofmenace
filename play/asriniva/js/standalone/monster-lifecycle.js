// Shared field/dependency transport for unchanged MON policies.
import abi from './mon-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as mon from '../ported/mon.js';
import {getShknamCatalogue} from './shknam.js';
import {callMon} from '../ported/mon-runtime.js';
export function enableMonsterLifecycle(environment,layouts){
 const {services,memory,ctypes,transport}=environment,L=layouts.mon;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{if(Object.hasOwn(o,k))return Reflect.get(o,k,r);const value=Reflect.get(o,k,r);if(value!==undefined&&typeof value!=='function')return value;if(typeof k!=='string')return value;return(...args)=>(environment.hasFunction(k)?environment.resolve(k):typeof value==='function'?value:environment.resolve(k))(...args.map(v=>v?.address??v));}});

 // Shadow DECL setters so the unchanged factory installs its native record views.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:services[name],writable:true,configurable:true});

 // Native MON passes these formatter function addresses to OBJNAM.
 for(const name of ['xname','doname']){const formatter=(...args)=>environment.resolve(name)(...args.map(v=>v?.address??v));Object.defineProperty(formatter,'address',{get:()=>environment.functionPointer(name,'pp')});local[name]=formatter;}

 // MON references the original SHKNAM catalogue even before a shop is created.
 const catalogue=getShknamCatalogue(environment,layouts);
 function field(kind,p,i,value){const key=abi.bits[kind]?.[i],type=abi.schema[kind]?.[0];if(!key||!type)throw new Error('Unknown MON packed field');const f=ctypes.record(type).fields[key];const scalar=f.ctype.replace(new RegExp(' '+key+'$'),'');return value===undefined?ctypes.getField(type,environment.address(p),key,scalar):ctypes.setField(type,environment.address(p),key,scalar,value);}
 Object.assign(local,{alloc:n=>environment.alloc('alloc',transport.uint(n)),moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,global:i=>environment.requireGlobal(abi.globals[i]),displayRngPointer:()=>environment.functionPointer('rn2_on_display_rng','ii'),winMessage:()=>ctypes.load('int',environment.requireGlobal('WIN_MESSAGE')),bit:(kind,p,i)=>field(kind,p,i),setBit:(kind,p,i,v)=>field(kind,p,i,v),equipment:i=>ctypes.load('void *',environment.requireGlobal(['uwep','uball','uchain'][i]))});
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('mon.c'),line,services.literal(caller));return services[name](n);};
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strncmpi'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 Object.assign(local,{invokeMonBool:(fn,m)=>environment.functions.indirect(fn,'ip',environment.address(m)),invokeMonVoid:(fn,m)=>environment.functions.indirect(fn,'vp',environment.address(m)),invokeMonBoolXY:(fn,m,x,y)=>environment.functions.indirect(fn,'ipii',environment.address(m),x,y)});
 local.commonString=i=>{const key=['c_Something','c_thats_enough_tries','c_black','c_green','c_red'][i],type=i<2?'struct c_common_strings':'struct c_color_names';return ctypes.getField(type,environment.requireGlobal(i<2?'c_common_strings':'c_color_names'),key,'const char *');};
 const names=Object.keys(mon).filter(name=>typeof mon[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('monster-lifecycle',Object.fromEntries(names.map(name=>[name,(...args)=>callMon(local,L,name,...args)])));
 return {services:local,catalogue,call:(name,...args)=>callMon(local,L,name,...args),limitation:'MON connection in progress; lifecycle/perception and full-game behavior require C verification.'};
}
