// Original native REGION transport, installed on its existing services/context.
import abi from './region-services-abi.json' with {type:'json'};
import * as region from '../ported/region.js';
import {callRegion,createRegionEntry} from './bindings/region.js';
import {nativeStateFor} from './native/state-bridge.js';
const facades=new WeakMap();
export function enableRegion(environment,layouts){
 if(facades.has(environment))return facades.get(environment);
 const entry=environment.start('region-reset'),services=entry.environment,previous=new Map(Object.entries(entry.namespace)),published=new Map(Object.keys(abi.public).filter(n=>environment.hasFunction(n)).map(n=>[n,environment.services[n]])),names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 for(const name of names)if(typeof region[name]!=='function')throw new Error('Missing original REGION policy '+name);
 environment.extend('region-reset',Object.fromEntries(names.map(name=>[name,createRegionEntry(services,layouts.region,name)])));
 for(const[name,value]of previous)if(entry.namespace[name]!==value)throw new Error('REGION replaced existing wrapper '+name);
 for(const[name,value]of published)if(environment.services[name]!==value)throw new Error('REGION replaced existing published identity '+name);
 const upgradedQueries=['visible_region_at','any_visible_region'].filter(name=>previous.has(name));
 for(const name of upgradedQueries){entry.namespace[name]=createRegionEntry(services,layouts.region,name);}
 const owner={services,exports:names,preserved:previous.size-upgradedQueries.length,upgradedQueries:upgradedQueries.length,get context(){return callRegion(services,layouts.region,'environment');},limitation:'All REGION entries use one native policy/context graph with canonical actor state and shared query/mutation regions. Serialization/addressable locals retain byte storage; ghost restoration and other advanced branches require separate C acceptance.'};facades.set(environment,owner);return owner;
}
export function bindRegionServices(environment,local,layout,speciesCount){
 const {services,ctypes,memory,transport,functions}=environment,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v);
 for(const[k,v]of Object.entries(abi.layout))if(layout[k]!==v)throw new Error('Review REGION native ABI '+k);
 if(!Number.isSafeInteger(speciesCount)||speciesCount<1)throw Error('REGION requires the measured species count');
 const native=nativeStateFor(environment);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),coerce={pointer:address,text,long:v=>BigInt(v),char:transport.char,short:transport.short,int:transport.int,uint:transport.uint};
 for(const[name,row]of Object.entries(abi.calls))local[name]=(...args)=>{const direct=native.functions.get(row.target);if(direct?.nativeState===native)return direct(...args);const value=native.boundary(resolve(row.target),...row.coercions.map(([kind,i])=>coerce[kind](args[i])));return row.number?typeof value==='string'?text(value):Number(value?.address??value):value;};
 const field=(type,p,key,value)=>{const record=native.nativeRecords.record(type,p);if(!(key in record))throw Error('Unknown REGION measured field '+key);if(value===undefined)return record[key];record[key]=value;return record[key];};
 Object.assign(local,{nativeOwner:native,nativeSpeciesCount:speciesCount,nativeGlobal:name=>environment.requireGlobal(name),nativeAllocationSize:p=>{const block=memory.live.get(address(p));if(!block)throw Error('REGION array is not a complete live allocation');return block.size;},moduleKey:local.moduleKey??environment,heap:()=>memory.HEAPU8,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,literal:services.literal,
  global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown REGION global '+i);return environment.requireGlobal(n);},
  monsterBit:(p,i)=>{const k=abi.monsterBits[i];if(!k)throw new Error('Unknown REGION monster bit');return field('struct monst',p,k);},setMonsterBit:(p,i,v)=>{const k=abi.monsterBits[i];if(!k)throw new Error('Unknown REGION monster bit');return field('struct monst',p,k,transport.uint(v));},
  heroBit:i=>{const k=abi.heroBits[i];if(!k)throw new Error('Unknown REGION hero bit');return field('struct you',environment.requireGlobal('u'),k);},setHeroBit:(i,v)=>{const k=abi.heroBits[i];if(!k)throw new Error('Unknown REGION hero bit');return field('struct you',environment.requireGlobal('u'),k,transport.uint(v));},
  blindfold:()=>native.nativeArena.pointer(environment.requireGlobal('ublindf')),something:()=>address(field('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_Something')),
  storeChar:(p,v)=>memory.view.setUint8(address(p),transport.uchar(v)),
  putstr:(w,a,s)=>{const p=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_putstr').at;return environment.nativeWindowCallbacks?environment.nativeWindowCallbacks.invoke('win_putstr','viip',transport.int(w),transport.int(a),text(s)):functions.indirect(memory.view.getBigUint64(p,true),'viip',transport.int(w),transport.int(a),text(s));},
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
