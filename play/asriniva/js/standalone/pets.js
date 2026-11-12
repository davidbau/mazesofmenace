// Shared state, packed fields and dependency transport for unchanged DOG policy.
import abi from './pet-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as dog from '../ported/dog.js';
import {callDog} from '../nethack/bindings/dog.js';
export function enablePets(environment,layouts){
 const {services,memory,ctypes,functions}=environment,L=layouts.dog;
 const local=new Proxy(Object.create(services),{get:(o,k,r)=>{const value=Reflect.get(o,k,r);if(Object.hasOwn(o,k)||typeof k!=='string')return value;if(typeof value!=='function'&&Reflect.has(o,k))return value;return(...args)=>(typeof value==='function'?value:environment.resolve(k))(...args.map(v=>v?.address??v));}});
 const fields={monster:['female','isgd','isminion','ispriest','isshk','iswiz','mavenge','mblinded','mcanmove','mconf','mflee','mfleetim','mfrozen','mleashed','mpeaceful','msleeping','mstun','mtrapped','wormno','mcansee'],object:['blessed','cursed','no_charge','oerodeproof','otrapped'],edog:['killed_by_u'],eshk:['dismiss_kops'],trap:['ttyp']},types={monster:'struct monst',object:'struct obj',edog:'struct edog',eshk:'struct eshk',trap:'struct trap'};
 function access(type,p,path,value){let at=environment.address(p),keys=path.split('.');for(const key of keys.slice(0,-1)){const e=ctypes.locate(type,at,key);at=e.at;type=e.field.record??e.field.ctype.replace(new RegExp(' '+key+'$'),'');}const key=keys.at(-1),f=ctypes.record(type).fields[key],scalar=f.ctype.replace(new RegExp(' '+key+'$'),'');return value===undefined?ctypes.getField(type,at,key,scalar):ctypes.setField(type,at,key,scalar,value);}
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,signedHeap:()=>memory.HEAP8,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown DOG global');return environment.requireGlobal(abi.globals[i]);},
  heroBit:i=>access('struct you',environment.requireGlobal('u'),['uroleplay.pauper','uhave.amulet','uevent.qexpelled','uswallow'][i]),
  classBit:(n,i)=>{if(i!==0)throw new Error('Unknown DOG class field');return access('struct objclass',environment.requireGlobal('objects')+n*ctypes.size('struct objclass'),'oc_material');},
  free:p=>services.free(environment.address(p)),alloc:n=>environment.alloc('alloc',n),memset:(p,v,n)=>services.memset(environment.address(p),v,n),
  assert:ok=>{if(!ok)environment.resolve('__assert_fail')(services.literal('ismnum(mndx)'),services.literal('dog.c'),111,services.literal('pick_familiar_pm'));},
  iter_mons:()=>environment.resolve('iter_mons')(environment.functionPointer('set_mon_lastmove','vp',p=>callDog(local,L,'set_mon_lastmove',p))),
 });
 for(const [kind,names]of Object.entries(fields)){
  local[kind+'Bit']=(p,i)=>{if(!names[i])throw new Error('Unknown DOG '+kind+' field');return access(types[kind],p,names[i]);};
  local['set'+kind[0].toUpperCase()+kind.slice(1)+'Bit']=(p,i,v)=>{if(!names[i])throw new Error('Unknown DOG '+kind+' field');return access(types[kind],p,names[i],v);};
 }
 for(const name of ['rn2','rnd'])local[name]=(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('dog.c'),line,services.literal(caller));return services[name](n);};
 const text=v=>typeof v==='string'?services.literal(v):environment.address(v);
 for(const name of ['strlen','strcpy','strcat','strcmp','strchr','strrchr','strncmpi'])local[name]=(...args)=>services[name](text(args[0]),...args.slice(1).map(v=>typeof v==='string'?text(v):v?.address??v));
 const names=Object.keys(dog).filter(name=>typeof dog[name]==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name));
 environment.register('pets',Object.fromEntries(names.map(name=>[name,(...args)=>callDog(local,L,name,...args)])));
 return {services:local,call:(name,...args)=>callDog(local,L,name,...args),limitation:'Pet integration in progress; full DOG state/output and lifecycle require original-C verification.'};
}
