// Original native REGION transport, installed on its existing services/context.
import abi from './region-services-abi.json' with {type:'json'};
import * as region from '../ported/region.js';
import {callRegion} from '../nethack/bindings/region.js';
const facades=new WeakMap();
export function enableRegion(environment,layouts){
 if(facades.has(environment))return facades.get(environment);
 const entry=environment.start('region-reset'),services=entry.environment,previous=new Map(Object.entries(entry.namespace)),published=new Map(Object.keys(abi.public).filter(n=>environment.hasFunction(n)).map(n=>[n,environment.services[n]])),names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 for(const name of names)if(typeof region[name]!=='function')throw new Error('Missing original REGION policy '+name);
 environment.extend('region-reset',Object.fromEntries(names.map(name=>[name,(...args)=>{const value=callRegion(services,layouts.region,name,...args);return value?.address??value;}])));
 for(const[name,value]of previous)if(entry.namespace[name]!==value)throw new Error('REGION replaced existing wrapper '+name);
 for(const[name,value]of published)if(environment.services[name]!==value)throw new Error('REGION replaced existing published identity '+name);
 const owner={services,exports:names,preserved:previous.size,get context(){return callRegion(services,layouts.region,'environment');},limitation:'Original public REGION entries use the existing cached context. Only selected source-created cloud, plane, persistence and gameplay paths have C acceptance; other branches retain explicit missing-provider failures.'};facades.set(environment,owner);return owner;
}
export function bindRegionServices(environment,local,layout){
 const {services,ctypes,memory,transport,functions}=environment,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(layout[k]!==v)throw new Error('Review REGION native ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),coerce={pointer:address,text,long:v=>BigInt(v),char:transport.char,short:transport.short,int:transport.int,uint:transport.uint};
 for(const[name,row]of Object.entries(abi.calls))local[name]=(...args)=>{const value=resolve(row.target)(...row.coercions.map(([kind,i])=>coerce[kind](args[i])));return row.number?typeof value==='string'?text(value):Number(value?.address??value):value;};
 const field=(type,p,key,value)=>{const f=ctypes.record(type).fields[key];if(!f)throw new Error('Unknown REGION measured field '+key);const scalar=f.ctype.replace(new RegExp('\\s+'+key+'$'),'');return value===undefined?ctypes.getField(type,address(p),key,scalar):ctypes.setField(type,address(p),key,scalar,value);};
 Object.assign(local,{moduleKey:local.moduleKey??environment,heap:()=>memory.HEAPU8,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,literal:services.literal,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown REGION global '+i);return environment.requireGlobal(n);},
  monsterBit:(p,i)=>{const k=abi.monsterBits[i];if(!k)throw new Error('Unknown REGION monster bit');return field('struct monst',p,k);},setMonsterBit:(p,i,v)=>{const k=abi.monsterBits[i];if(!k)throw new Error('Unknown REGION monster bit');return field('struct monst',p,k,transport.uint(v));},
  heroBit:i=>{const k=abi.heroBits[i];if(!k)throw new Error('Unknown REGION hero bit');return field('struct you',environment.requireGlobal('u'),k);},setHeroBit:(i,v)=>{const k=abi.heroBits[i];if(!k)throw new Error('Unknown REGION hero bit');return field('struct you',environment.requireGlobal('u'),k,transport.uint(v));},
  blindfold:()=>address(ctypes.load('struct obj *',environment.requireGlobal('ublindf'))),something:()=>address(field('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_Something')),
  storeChar:(p,v)=>memory.view.setUint8(address(p),transport.uchar(v)),
  putstr:(w,a,s)=>{const p=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_putstr').at;return functions.indirect(memory.view.getBigUint64(p,true),'viip',transport.int(w),transport.int(a),text(s));},
  pline1:s=>resolve('pline')(text('%s'),text(s)),
 });
 for(const name of Object.values(abi.messages))local[name]=(fmt,a=0,b=0)=>resolve(name)(text(fmt),text(a),text(b));
 local.impossible=(fmt,...a)=>a.length===1?resolve('impossible')(text(fmt),transport.int(a[0])):resolve('impossible')(text(fmt),text(a[0]),transport.uint(a[1]??0));
 local.Sprintf=(out,fmt,...a)=>{let values;if(fmt==='%5ld')values=[transport.long(a[0])];else if(fmt==='poison gas (%d)')values=[transport.int(a[0])];else if(a.length===2&&typeof a[0]==='bigint')values=a.map(transport.long);else if(a.length===2)values=a.map(text);else if(a.length===5)values=[text(a[0]),...a.slice(1).map(transport.int)];else throw new Error('Review REGION native format '+fmt);return resolve('sprintf')(address(out),text(fmt),...values);};
 const rng=(name,caller,line,args)=>{if(services.rng_log_enabled())services.rng_log_set_caller(text('region.c'),transport.int(line),text(abi.rngCallers[caller]));return resolve(name)(...args.map(transport.int));};
 local.rnd=(n,line)=>rng('rnd',0,line,[n]);local.rn2=(n,line)=>rng('rn2',1,line,[n]);local.rn1=(n,b,line)=>transport.int(local.rn2(n,line)+transport.int(b));local.d=(n,s,line)=>rng('d',2,line,[n,s]);
 for(const[method,target]of Object.entries(abi.sf)){const name=method[0].toUpperCase()+method.slice(1);local[name]=(f,p,s,n)=>resolve(target)(address(f),address(p),text(s),...(method.endsWith('_char')?[transport.int(n)]:[]));}
 return local;
}
