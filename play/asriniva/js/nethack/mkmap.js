// Original cave generation and map helpers on one native shared-memory context.
import abi from './mkmap-abi.json' with {type:'json'};
import * as source from '../ported/mkmap.js';
import {createMkmapEnvironment} from './bindings/mkmap.js';
const cache=new WeakMap();
export function enableMkmap(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const{memory,ctypes,transport,services}=environment,L=layouts.mkmap,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review MKMAP ABI '+k);
 const resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n),text=v=>typeof v==='string'?services.literal(v):address(v),local=Object.create(services);
 const scalar=(type,value)=>{type=ctypes.abiType(type);if(type==='void')return undefined;if(type.includes('*'))return text(value);if(type==='char'||type==='signed char')return transport.char(value);if(type==='unsigned char')return transport.uchar(value);if(type==='short')return transport.short(value);if(type==='unsigned short')return transport.ushort(value);if(type==='unsigned int')return transport.uint(value);return ctypes.size(type)===8?(type.startsWith('unsigned')?transport.ulong(value):transport.long(value)):transport.int(value);};
 for(const[n,p]of Object.entries(abi.dependencies)){const m=p.match(/^(.+?)\s*\((.*)\)$/),params=m[2]==='void'?[]:m[2].split(',').map(t=>t.trim());local[n]=(...args)=>{if(args.length!==params.length)throw new Error('MKMAP native arity '+n);return scalar(m[1],resolve(n)(...args.map((v,i)=>scalar(params[i],v))));};}
 const levelFlags=()=>ctypes.locate('struct instance_globals_saved_l',environment.requireGlobal('svl'),'level').at+ctypes.record('dlevel_t').fields.flags.offset;
 Object.assign(local,{heap:()=>memory.HEAPU8,stackAlloc:transport.stackAlloc,global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown MKMAP global '+i);return environment.requireGlobal(n);},terrainBit:(p,i)=>{const n=abi.terrainBits[i];if(!n)throw new Error('Unknown MKMAP terrain bit '+i);return ctypes.getField('struct rm',address(p),n,'unsigned int');},setTerrainBit:(p,i,v)=>{const n=abi.terrainBits[i];if(!n)throw new Error('Unknown MKMAP terrain bit '+i);return ctypes.setField('struct rm',address(p),n,'unsigned int',v);},levelBit:i=>{const n=abi.levelBits[i];if(!n)throw new Error('Unknown MKMAP level bit '+i);return ctypes.getField('struct levelflags',levelFlags(),n,'unsigned int');},setLevelBit:(i,v)=>{const n=abi.levelBits[i];if(!n)throw new Error('Unknown MKMAP level bit '+i);return ctypes.setField('struct levelflags',levelFlags(),n,'unsigned int',v);},abs:v=>Math.abs(transport.int(v))|0,impossible:message=>resolve('impossible')(text('%s'),text(message))});
 const origin=(line,caller)=>{if(!abi.callers.includes(caller))throw new Error('Unknown MKMAP RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('mkmap.c'),transport.int(line),text(caller));};for(const n of ['rn2','rnd'])local[n]=(v,line,caller)=>{origin(line,caller);return resolve(n)(transport.int(v));};local.rn1=(x,y,line,caller)=>{origin(line,caller);return resolve('rn2')(transport.int(x))+transport.int(y);};
 const context=createMkmapEnvironment(local,L);Object.setPrototypeOf(context,local);
 const names=Object.keys(abi.public);for(const n of names)if(environment.hasFunction(n))throw new Error('Duplicate MKMAP owner '+n);
 const entry=environment.register('map-lighting',Object.fromEntries(names.map(n=>[n,source[n]])),context,{prepareArgs:(n,args)=>{if(n==='mkmap')args[0]=context.levInit(args[0]);return args;}});
 const result={context,entry,exports:names,scope:'Unchanged source generation and map helpers share actual native globals/scratch allocation; focused C acceptance required.'};cache.set(environment,result);return result;
}
