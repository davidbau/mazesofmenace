// Original monster-spell policies and catalogues on one shared native context.
import abi from './mcastu-abi.json' with {type:'json'};
import * as source from '../ported/mcastu.js';
import {createMcastuEnvironment} from './bindings/mcastu.js';
const owners=new WeakMap();
export function enableMcastu(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services,memory,ctypes,transport}=environment,L=layouts.mcastu,address=environment.address;
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review MCASTU configured ABI '+key);
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 function value(type,v){type=ctypes.abiType(type);if(type==='void')return undefined;if(type.includes('*'))return text(v);if(type==='unsigned long')return transport.ulong(v);if(type==='long')return transport.long(v);if(type==='unsigned int')return transport.uint(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);return transport.int(v);}
 const local={moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const name=abi.globals[i];if(!name)throw new Error('Unknown MCASTU global '+i);return environment.requireGlobal(name);},
  monsterBit:(p,i)=>{const name=abi.monsterBits[i];if(!name)throw new Error('Unknown MCASTU monster bit '+i);return ctypes.getField('struct monst',address(p),name,'unsigned int');},
  setMonsterBit:(p,i,v)=>{const name=abi.monsterBits[i];if(!name)throw new Error('Unknown MCASTU monster bit '+i);return ctypes.setField('struct monst',address(p),name,'unsigned int',v);},
  heroBit:()=>ctypes.getField('struct you',environment.requireGlobal('u'),'uundetected','unsigned int'),
  roleplayDeaf:()=>memory.view.getInt8(environment.requireGlobal('u')+abi.roleplayDeafOffset),
  commonString:()=>ctypes.getField('struct c_common_strings',environment.requireGlobal('c_common_strings'),'c_vision_clears','const char *'),
 };
 for(const[name,prototype]of Object.entries(abi.dependencies)){const match=prototype.match(/^(.+?)\s*\((.*)\)$/),types=match[2].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');local[name]=(...args)=>value(match[1],resolve(name)(...args.map((v,i)=>value(types[i],v))));}
 local.Strcpy=(out,input)=>services.strcpy(address(out),text(input));local.Sprintf=(out,format,...args)=>services.sprintf(address(out),text(format),...args.map(text));
 local.strcpy=local.Strcpy;
 for(const name of ['pline','pline_The','You','You_feel','Your','You_hear','verbalize','Norep','impossible'])local[name]=(format,...args)=>resolve(name)(text(format),...args.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.pline_mon=(mon,format,...args)=>resolve('pline_mon')(address(mon),text(format),...args.map(text));
 for(const name of ['rn2','rnd','d'])local[name]=(...args)=>{const caller=args.pop(),line=args.pop(),index=typeof caller==='string'?abi.rngCallers.indexOf(caller):transport.int(caller);if(index<0||index>=abi.rngCallers.length)throw new Error('Unknown MCASTU RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('mcastu.c'),transport.int(line),text(abi.rngCallers[index]));return resolve(name)(...args.map(transport.int));};
 const context=createMcastuEnvironment(local,L,source),parse=n=>{const m=abi.public[n].match(/^(.+?)\s*\((.*)\)$/);return{result:m[1],args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')};},names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));
 environment.register('mcastu',Object.fromEntries(names.map(n=>[n,(...args)=>value(parse(n).result,source[n](...args))])),context,{prepareArgs:(n,args)=>args.map((v,i)=>{const t=parse(n).args[i],p=value(t,v);return t==='struct monst *'?context.monster(p):t==='struct attack *'?context.attack(p):p;})});
 const owner={context,services:local,exports:names,limitation:'Original MCASTU context and shared spell catalogues connected. Ordinary castmu/buzzmu paths need source-C acceptance; unavailable spell dependencies fail explicitly, and special/fatal/summoning matrices remain separately unverified.'};owners.set(environment,owner);return owner;
}
