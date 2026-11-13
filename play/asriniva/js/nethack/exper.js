// Original EXPER policies on the existing hero-energy owner and shared state.
import abi from './exper-abi.json' with{type:'json'};
import * as source from '../ported/exper.js';
import{createExperEnvironment}from'./bindings/exper.js';
export function enableExperience(environment,layouts){
 const{services,memory,ctypes,transport}=environment,L=layouts.exper,address=environment.address,text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw new Error('Review EXPER ABI '+k);
 const local=Object.create(services),scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='short')return transport.short(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 for(const[name,{target,prototype}]of Object.entries(abi.calls)){const m=prototype.match(/^(.+?)\s*\((.*)\)$/),types=m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');local[name]=(...args)=>scalar(m[1],resolve(target)(...args.map((v,i)=>scalar(types[i],v))));}
 const bit=(p,i,v)=>{const n=abi.bits[i];if(!n)throw new Error('Unknown EXPER monster bit '+i);return v===undefined?ctypes.getField('struct monst',address(p),n,'unsigned int'):ctypes.setField('struct monst',address(p),n,'unsigned int',transport.int(v));};
 Object.assign(local,{heap:()=>memory.HEAPU8,global:i=>{const n=abi.globals[i];if(!n)throw new Error('Unknown EXPER global '+i);return environment.requireGlobal(n);},monsterBit:(p,i)=>bit(p,i),setMonsterBit:(p,i,v)=>bit(p,i,v),
  Strcpy:(out,v)=>address(resolve('strcpy')(address(out),text(v))),
  pline:(fmt,prefix,level)=>resolve('pline')(text(fmt),text(prefix),transport.int(level)),You_feel:message=>resolve('You_feel')(text('%s'),text(message)),
  livelog_printf:(category,format,...args)=>{if(!args.length)return resolve('livelog_printf')(transport.long(category),text('%s'),text(format));if(args.length===1)return resolve('livelog_printf')(transport.long(category),text(format),transport.int(args[0]));if(args.length===2)return resolve('livelog_printf')(transport.long(category),text(format),text(args[0]),transport.int(args[1]));throw new Error('Review EXPER livelog signature');},
  assert:ok=>{if(!ok){const r=abi.assertion;return resolve('__assert_fail')(text(r.condition),text('exper.c'),r.line,text(r.function));}},
 });
 for(const n of['rn2','rnd'])local[n]=(value,line,caller)=>{if(!['newpw','rndexp'].includes(caller))throw new Error('Unknown EXPER RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('exper.c'),transport.int(line),text(caller));return resolve(n)(transport.int(value));};
 local.rn1=(n,b,line,caller)=>local.rn2(n,line,caller)+transport.int(b);
 for(const n of abi.globals)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const context=createExperEnvironment(local,L),names=Object.keys(abi.public);
 environment.register('hero-energy',Object.fromEntries(names.map(n=>[n,source[n]])),context,{prepareArgs:(name,args)=>{const types=abi.public[name].match(/\((.*)\)$/)[1].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void');return args.map((v,i)=>name==='experience'&&i===0?context.monster(address(v)):scalar(types[i],v));}});
 return{context,services:local,exports:names,limitation:'Original EXPER entries share existing hero-energy ownership and live hero/role storage; kill XP/level/energy acceptance is focused, while draining/fatal/maximum-level branches require separate C verification.'};
}
