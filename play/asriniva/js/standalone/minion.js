// Original demon/angel summons and guardian lifecycle on shared native storage.
import abi from './minion-abi.json' with {type:'json'};
import * as source from '../ported/minion.js';
import {createMinionEnvironment} from '../nethack/bindings/minion.js';
import {withCEnvironment} from '../c-runtime/context.js';
const cache=new WeakMap();
export function enableMinion(environment,layouts){
 if(cache.has(environment))return cache.get(environment);
 const{services,memory,ctypes,transport,functions}=environment,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(layouts.minion[k]!==v)throw new Error('Review MINION ABI '+k);
 if(abi.expressions.voice!=='')throw new Error('Review configured MINION SetVoice macro');
 const text=v=>typeof v==='string'?services.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof services[n]==='function'?services[n]:environment.resolve(n);
 function field(type,p,path,value){const parts=path.split('.'),key=parts.pop();for(const k of parts){const e=ctypes.locate(type,p,k);p=e.at;type=e.field.record;}const f=ctypes.record(type).fields[key],scalar=f.bits!==undefined?'unsigned int':f.ctype.replace(new RegExp('\\b'+key+'$'),'').trim();return value===undefined?ctypes.getField(type,address(p),key,scalar):ctypes.setField(type,address(p),key,scalar,value);}
 const scalar=(t,v)=>{t=ctypes.canonical(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='char'||t==='signed char')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);if(t==='short')return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='unsigned int')return transport.uint(v);if(ctypes.size(t)===8)return t.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const base=Object.create(null);for(const[n,prototype]of Object.entries(abi.dependencies)){const m=prototype.match(/^(.*?)\((.*)\)$/);if(!m)throw new Error('Review MINION prototype '+n);const types=m[2]==='void'||!m[2]?[]:m[2].split(',').map(s=>s.trim());base[n]=(...args)=>scalar(m[1],resolve(n)(...types.map((t,i)=>scalar(t,args[i]))));}
 Object.assign(base,{moduleKey:environment,rectState:undefined,trackState:undefined,heap:()=>memory.HEAPU8,literal:services.literal,stackSave:transport.stackSave,stackRestore:transport.stackRestore,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown MINION global '+i);return environment.requireGlobal(abi.globals[i]);},uwep:()=>address(ctypes.load('struct obj *',environment.requireGlobal('uwep'))),roleplayDeaf:()=>field('struct you',environment.requireGlobal('u'),'uroleplay.deaf'),
  monsterBit:(p,i)=>{if(!abi.packed.monster[i])throw new Error('Unknown MINION monster bit '+i);return field('struct monst',p,abi.packed.monster[i]);},setMonsterBit:(p,i,v)=>{if(!abi.packed.monster[i])throw new Error('Unknown MINION monster bit '+i);return field('struct monst',p,abi.packed.monster[i],transport.int(v));},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),
  getlin:(query,out)=>{const at=ctypes.locate('struct window_procs',environment.requireGlobal('windowprocs'),'win_getlin').at;return functions.indirect(memory.view.getBigUint64(at,true),'vpp',text(query),address(out));},
  sscanf:(buffer,fmt,value)=>resolve('sscanf')(address(buffer),text(fmt),address(value)),
  livelog_printf:(category,fmt,name,value,units)=>resolve('livelog_printf')(transport.long(category),text(fmt),text(name),transport.long(value),text(units)),
 });
 for(const name of ['pline','pline_The','You','You_feel','verbalize','impossible','panic'])base[name]=(fmt,a=0,b=0,c=0)=>resolve(name)(text(fmt),text(a),(name==='pline'&&fmt==='%s demands %ld %s for safe passage.'||name==='You'&&fmt==='give %s %ld %s.')?transport.long(b):text(b),text(c));
 for(const name of ['rn2','rnd','d'])base[name]=(...args)=>{const index=transport.int(args.pop()),line=transport.int(args.pop()),caller=abi.rngCallers[index];if(!caller||!abi.rngSites.some(row=>row[0]===name&&row[1]===line&&row[2]===caller))throw new Error('Unexpected MINION RNG site');if(services.rng_log_enabled())services.rng_log_set_caller(text('minion.c'),line,text(caller));return resolve(name)(...args.map(transport.int));};
 const local=new Proxy(base,{get:(o,k)=>{if(Object.hasOwn(o,k))return o[k];if(typeof k==='symbol')return undefined;throw new Error('Missing MINION native transport '+k);}}),context=createMinionEnvironment(local,layouts.minion,source);Object.setPrototypeOf(context,local);
 function call(name,...args){return transport.scoped(()=>{const m=abi.public[name].match(/^(.*?)\((.*)\)$/),types=m[2]&&m[2]!=='void'?m[2].split(',').map(s=>s.trim()):[];args=args.map((v,i)=>scalar(types[i],v?.address??v));if(['newemin','free_emin','msummon','demon_talk','bribe','lose_guardian_angel'].includes(name))args[0]=context.monster(args[0]);return withCEnvironment(context,source[name],...args)??0;});}
 const inherited=Object.keys(abi.public).filter(n=>environment.hasFunction(n));for(const n of inherited){if(!['newemin','free_emin'].includes(n)||environment.start('monster-companion-extra').namespace[n]!==source[n])throw new Error('Unexpected MINION owner '+n);}
 const exports=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('minion-lifecycle',Object.fromEntries(exports.map(n=>[n,(...args)=>call(n,...args)])));const result={call,context,services:local,exports,inherited};cache.set(environment,result);return result;
}
