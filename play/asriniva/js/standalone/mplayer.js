// Original player-monster creation/naming/gear policy on one native-shaped context.
import abi from './mplayer-abi.json' with {type:'json'};
import * as source from '../ported/mplayer.js';
import {createMplayerEnvironment} from '../nethack/bindings/mplayer.js';
import {withCEnvironment} from '../c-runtime/context.js';
const cache=new WeakMap();
export function enableMplayer(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const{services,memory,ctypes,transport}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.mplayer[k]!==v)throw new Error('Review MPLAYER ABI '+k);
 if(abi.expressions.voice!=='')throw new Error('Review configured MPLAYER SetVoice macro');
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 function field(type,p,key,value){const f=ctypes.record(type).fields[key],scalar=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+key+'$'),'').trim();return value===undefined?ctypes.getField(type,address(p),key,scalar):ctypes.setField(type,address(p),key,scalar,value);}
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const base=Object.create(null);for(const[n,prototype]of Object.entries(abi.dependencies)){const m=prototype.match(/^(.*?)\((.*)\)$/);if(!m)throw new Error('Review MPLAYER prototype '+n);const types=m[2]==='void'||!m[2]?[]:m[2].split(',').map(s=>s.trim());base[n]=(...args)=>scalar(m[1],resolve(n)(...types.map((t,i)=>scalar(t,args[i]))));}
 Object.assign(base,{moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown MPLAYER global '+i);return environment.requireGlobal(abi.globals[i]);},
  monsterBit:(p,i)=>{if(!abi.packed.monster[i])throw new Error('Unknown MPLAYER monster bit '+i);return field('struct monst',p,abi.packed.monster[i]);},setMonsterBit:(p,i,v)=>{if(!abi.packed.monster[i])throw new Error('Unknown MPLAYER monster bit '+i);return field('struct monst',p,abi.packed.monster[i],transport.int(v));},
  objectBit:(p,i)=>{if(!abi.packed.object[i])throw new Error('Unknown MPLAYER object bit '+i);return field('struct obj',p,abi.packed.object[i]);},setObjectBit:(p,i,v)=>{if(!abi.packed.object[i])throw new Error('Unknown MPLAYER object bit '+i);return field('struct obj',p,abi.packed.object[i],transport.int(v));},
  objectClassBit:p=>field('struct objclass',p,'oc_merge'),Strcpy:(a,b)=>resolve('strcpy')(text(a),text(b)),Strcat:(a,b)=>resolve('strcat')(text(a),text(b)),
  strlen:s=>Number(resolve('strlen')(text(s))),impossible:s=>resolve('impossible')(text('%s'),text(s)),verbalize:(fmt,s)=>resolve('verbalize')(text(fmt),text(s)),
 });
 for(const name of ['rn2','rnd','d','rn1'])base[name]=(...args)=>{const caller=args.pop(),line=args.pop();if(!abi.rngSites.some(row=>row[0]===name&&row[1]===line&&row[2]===caller))throw new Error('Unexpected MPLAYER RNG site');if(services.rng_log_enabled())services.rng_log_set_caller(text('mplayer.c'),transport.int(line),text(caller));return name==='rn1'?transport.int(resolve('rn2')(transport.int(args[0]))+transport.int(args[1])):resolve(name)(...args.map(transport.int));};
 const local=new Proxy(base,{get:(o,k)=>{if(Object.hasOwn(o,k))return o[k];if(typeof k==='symbol')return undefined;throw new Error('Missing MPLAYER native transport '+k);}}),context=createMplayerEnvironment(local,layouts.mplayer);Object.setPrototypeOf(context,local);
 function call(name,...args){return transport.scoped(()=>{const m=abi.public[name].match(/^(.*?)\((.*)\)$/),types=m[2]?m[2].split(',').map(s=>s.trim()):[];args=args.map((v,i)=>scalar(types[i],v?.address??v));if(name==='mk_mplayer')args[0]=context.permonst(args[0]);if(name==='mplayer_talk')args[0]=context.monster(args[0]);return withCEnvironment(context,source[name],...args)?.address??0;});}
 const exports=Object.keys(abi.public);for(const name of exports)if(environment.hasFunction(name))throw new Error('Unexpected existing MPLAYER owner '+name);environment.register('player-monsters',Object.fromEntries(exports.map(n=>[n,(...args)=>call(n,...args)])));const result={call,context,services:local,exports};cache.set(environment,result);return result;
}
