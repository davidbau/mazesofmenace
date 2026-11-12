// Canonical MONDATA native context; original policies and catalogues stay unchanged.
import abi from './mondata-abi.json' with {type:'json'};
import * as source from '../ported/mondata.js';
import {createMondataEnvironment} from '../nethack/bindings/mondata.js';
import {withCEnvironment} from '../c-runtime/context.js';
const cache=new WeakMap();
export function enableMondata(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const{services,memory,ctypes,transport}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.mondata[k]!==v)throw new Error('Review MONDATA ABI '+k);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 function field(type,p,path){const parts=path.split('.'),key=parts.pop();for(const k of parts){const e=ctypes.locate(type,p,k);p=e.at;type=e.field.record;}const f=ctypes.record(type).fields[key],scalar=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+key+'$'),'').trim();return ctypes.getField(type,address(p),key,scalar);}
 const mapDimensions=[...ctypes.record('dlevel_t').fields.locations.ctype.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1]));
 if(mapDimensions.length!==2||mapDimensions.some(n=>!Number.isSafeInteger(n)||n<=0))throw new Error('Review MONDATA map dimensions');
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const base=Object.create(null);for(const[n,prototype]of Object.entries(abi.dependencies)){const m=prototype.match(/^(.*?)\((.*)\)$/);if(!m)throw new Error('Review MONDATA prototype '+n);const types=m[2]==='void'||!m[2]?[]:m[2].split(',').map(s=>s.trim());base[n]=(...args)=>scalar(m[1],resolve(n)(...types.map((t,i)=>scalar(t,args[i]))));}
 Object.assign(base,{moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown MONDATA global '+i);return environment.requireGlobal(abi.globals[i]);},equipment:i=>{const n=['uwep','uarm','ublindf'][i];if(!n)throw new Error('Unknown MONDATA equipment '+i);return address(ctypes.load('struct obj *',environment.requireGlobal(n)));},
  monsterBit:(p,i)=>{if(!abi.packed.monster[i])throw new Error('Unknown MONDATA monster bit '+i);return field('struct monst',p,abi.packed.monster[i]);},heroBit:i=>{if(!abi.packed.hero[i])throw new Error('Unknown MONDATA hero bit '+i);return field('struct you',environment.requireGlobal('u'),abi.packed.hero[i]);},
  terrainBit:(x,y)=>{const level=ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at,grid=ctypes.locate('dlevel_t',level,'locations').at,p=grid+(transport.short(x)*mapDimensions[1]+transport.short(y))*ctypes.size('struct rm');return field('struct rm',p,'lit');},trapBit:p=>field('struct trap',p,'ttyp'),
  Strcpy:(out,s)=>resolve('strcpy')(text(out),text(s)),strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),impossible:(fmt,value=0)=>resolve('impossible')(text(fmt),transport.int(value)),
 });
 for(const name of ['rn2','rnd'])base[name]=(bound,line,caller)=>{if(!abi.rngSites.some(row=>row[0]===name&&row[1]===line&&row[2]===caller))throw new Error('Unexpected MONDATA RNG site');if(services.rng_log_enabled())services.rng_log_set_caller(text('mondata.c'),transport.int(line),text(caller));return resolve(name)(transport.int(bound));};
 const local=new Proxy(base,{get:(o,k)=>{if(Object.hasOwn(o,k))return o[k];if(typeof k==='symbol')return undefined;throw new Error('Missing MONDATA native transport '+k);}}),context=createMondataEnvironment(local,layouts.mondata,source);
 function call(name,...args){return transport.scoped(()=>{const m=abi.public[name].match(/^(.*?)\((.*)\)$/),types=m[2]&&m[2]!=='void'?m[2].split(',').map(s=>s.trim()):[];args=args.map((v,i)=>scalar(types[i],v?.address??v));for(const row of abi.viewArgs)if(row.names.includes(name))args[row.index]=context[row.kind](args[row.index]);const result=withCEnvironment(context,source[name],...args);return scalar(m[1],typeof result==='string'?services.literal(result):result?.address??result??0)??0;});}
 // Keep published symbol/function-pointer identities, but route every MONDATA public
 // policy through this single context. Older contexts retain unrelated policies.
 const groups=['hero-monster-resistance','monster-gender-material','hero-monster-resistance-memory','monster-growth-types','monster-data','monster-armor-shape','floor-monster-stickiness'],prior=new Map();
 for(const group of groups){let entry;try{entry=environment.start(group);}catch(e){if(e.message==='Unresolved standalone module '+group)continue;throw e;}for(const name of Object.keys(abi.public))if(Object.hasOwn(entry.namespace,name)){if(entry.namespace[name]!==source[name])throw new Error('Review existing MONDATA source owner '+group+'.'+name);if(prior.has(name))throw new Error('Duplicate prior MONDATA owner '+name);prior.set(name,{entry,group});}}
 for(const name of Object.keys(abi.public))if(environment.hasFunction(name)&&!prior.has(name))throw new Error('Unexpected existing MONDATA owner '+name);
 for(const[name,{entry}]of prior)entry.namespace[name]=(...args)=>call(name,...args);
 const exports=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('monster-biology',Object.fromEntries(exports.map(n=>[n,(...args)=>call(n,...args)])));const result={call,context,services:local,exports,forwarded:[...prior].map(([name,{group}])=>({name,group}))};cache.set(environment,result);return result;
}
