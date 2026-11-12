// Full native DBRIDGE transport on the existing terrain-query context.
import abi from './dbridge-abi.json' with {type:'json'};
import * as source from '../ported/dbridge.js';
import {createDbridgeEnvironment} from '../nethack/bindings/dbridge.js';
const owners=new WeakMap();
export function enableDbridge(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const entry=environment.start('world-water-terrain'),context=entry.environment,previous=new Map(Object.entries(entry.namespace)),{services,memory,ctypes,transport}=environment,L=layouts.dbridge,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review DBRIDGE native ABI '+k);
 for(const[k,v]of Object.entries(abi.roomClosure.layout))if(layouts.mkroom[k]!==v)throw new Error('Review Castle MKROOM native ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),coerce={pointer:address,text,char:transport.char,short:transport.short,int:transport.int,uint:transport.uint},local=Object.create(services);
 for(const[name,row]of Object.entries(abi.calls))local[name]=(...args)=>{const result=resolve(row.target)(...row.coercions.map(([kind,i])=>coerce[kind](args[i])));return row.number?Number(result?.address??result):result;};
 const field=(type,p,key,value)=>{key=type==='struct rm'?(abi.terrainAliases[key]??key):key;const f=ctypes.record(type).fields[key];if(!f)throw new Error('Unknown DBRIDGE field '+key);const scalar=f.ctype.replace(new RegExp('\\s+'+key+'$'),'');return value===undefined?ctypes.getField(type,address(p),key,scalar):ctypes.setField(type,address(p),key,scalar,value);};
 const terrain=(x,y)=>environment.requireGlobal('svl')+L.locations+(transport.short(x)*L.ROWNO+transport.short(y))*L.rmSize;
 const u=environment.requireGlobal('u'),event=ctypes.locate('struct you',u,'uevent').at,phrase=environment.allocateGlobal('dbridge.E_phrase.phrase',L.phraseSize);
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown DBRIDGE global '+i);return environment.requireGlobal(abi.globals[i]);},
  monsterBit:(p,i)=>{if(!abi.bits.monster[i])throw new Error('Unknown DBRIDGE monster bit');return field('struct monst',p,abi.bits.monster[i]);},
  terrainBit:(x,y,i)=>{if(!abi.bits.terrain[i])throw new Error('Unknown DBRIDGE terrain bit');return field('struct rm',terrain(x,y),abi.bits.terrain[i]);},setTerrainBit:(x,y,i,v)=>{if(!abi.bits.terrain[i])throw new Error('Unknown DBRIDGE terrain bit');return field('struct rm',terrain(x,y),abi.bits.terrain[i],transport.uint(v));},
  heroBit:i=>{if(i!==0)throw new Error('Unknown DBRIDGE hero bit');return field('struct you',u,'uinwater');},roleplayDeaf:()=>field('struct u_roleplay',ctypes.locate('struct you',u,'uroleplay').at,'deaf'),
  heroEvent:i=>{if(i!==0&&i!==1)throw new Error('Unknown DBRIDGE hero event');return field('struct u_event',event,['uopened_dbridge','uheard_tune'][i]);},setHeroEvent:(i,v)=>{if(i!==0&&i!==1)throw new Error('Unknown DBRIDGE hero event');return field('struct u_event',event,['uopened_dbridge','uheard_tune'][i],transport.uint(v));},phraseBuffer:()=>phrase,
 });
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{const index=typeof caller==='string'?abi.callers.indexOf(caller):caller;if(!Number.isInteger(index)||index<0||index>=abi.callers.length)throw new Error('Unknown original DBRIDGE RNG caller');if(services.rng_log_enabled())services.rng_log_set_caller(text('dbridge.c'),transport.int(line),text(abi.callers[index]));return resolve(name)(transport.int(n));};
 for(const name of ['pline_The','You','You_see','You_hear'])local[name]=(fmt,a,b)=>resolve(name)(text(fmt),text(a),text(b));
 local.impossible=fmt=>resolve('impossible')(text(fmt));
 local.pline=(fmt,...args)=>args.length===1&&fmt.includes('%d')?resolve('pline')(text(fmt),transport.int(args[0])):args.length===2&&fmt.includes('%d')?resolve('pline')(text(fmt),text(args[0]),transport.int(args[1])):resolve('pline')(text(fmt),text(args[0]),text(args[1]));
 // Original native views must be own properties, not inherited DECL setters.
 for(const name of ['u','go','gy','svk','svc','gm','iflags','mons','levl'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const native=createDbridgeEnvironment(local,L);
 Object.defineProperties(context,Object.getOwnPropertyDescriptors(local));
 Object.defineProperties(context,Object.getOwnPropertyDescriptors(native));
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 environment.extend('world-water-terrain',Object.fromEntries(names.map(n=>[n,source[n]])));
 for(const[name,value]of previous)if(entry.namespace[name]!==value)throw new Error('DBRIDGE replaced previous wrapper '+name);
 const owner={context,services:local,exports:names,preserved:previous.size,limitation:'Original source policies share the existing terrain-query context and DECL occupant state; selected actual Castle actions require C evidence, other entity branches remain unaccepted.'};owners.set(environment,owner);return owner;
}
