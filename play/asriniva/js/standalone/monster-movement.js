// Shared field/dependency transport for unchanged MONMOVE policies.
import abi from './monmove-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as monmove from '../ported/monmove.js';
import {callMonmove} from '../ported/monmove-runtime.js';
export function enableMonsterMovement(environment,layouts){
 const {services,memory,ctypes}=environment,L=layouts.monmove;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const storage=environment.allocateGlobal('monmove.class_lists',monmove.practical.length+monmove.magical.length);
 function field(kind,p,i,value){const key=abi.bits[kind]?.[i],type=abi.schema[kind]?.[0];if(!key||!type)throw new Error('Unknown MONMOVE packed field');const f=ctypes.record(type).fields[key];const scalar=f.ctype.replace(new RegExp(' '+key+'$'),'');return value===undefined?ctypes.getField(type,environment.address(p),key,scalar):ctypes.setField(type,environment.address(p),key,scalar,value);}
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,global:i=>environment.requireGlobal(abi.globals[i]),storage:()=>storage,bit:(kind,p,i)=>field(kind,p,i),setBit:(kind,p,i,v)=>field(kind,p,i,v),equipment:i=>ctypes.load('void *',environment.requireGlobal(['uwep','uarm','uball','uchain'][i]))});
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('monmove.c'),line,services.literal(caller));return services[name](n);};
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strncmpi'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 const names=Object.keys(monmove).filter(name=>typeof monmove[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('monster-movement',Object.fromEntries(names.map(name=>[name,(...args)=>callMonmove(local,L,name,...args)])));
 return {services:local,storage,call:(name,...args)=>callMonmove(local,L,name,...args),limitation:'MONMOVE connection in progress; perception/movement and full-game behavior require C verification.'};
}
