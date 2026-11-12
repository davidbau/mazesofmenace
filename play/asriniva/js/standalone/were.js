// Original WERE policies on one live shared game context.
import abi from './were-abi.json' with {type:'json'};
import * as source from '../ported/were.js';
import {createWereEnvironment} from '../ported/were-runtime.js';
import publicFunctions from './public-functions.json' with {type:'json'};

export function enableWere(environment,layouts){
 const {services,memory,ctypes,transport}=environment,L=layouts.were,address=environment.address;
 for(const [key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review WERE ABI '+key);
 const text=v=>typeof v==='string'?services.literal(v):address(v);
 const resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name);
 const local=Object.create(services);
 const scalar=(type,v)=>{type=ctypes.canonical(type);if(type.includes('*'))return text(v);if(type==='char'||type==='signed char')return transport.char(v);if(type==='unsigned char')return transport.uchar(v);if(type==='short')return transport.short(v);if(type==='unsigned short')return transport.ushort(v);if(type==='unsigned int')return transport.uint(v);if(ctypes.size(type)===8)return type.startsWith('unsigned')?transport.ulong(v):transport.long(v);return transport.int(v);};
 const prototype=name=>{const p=publicFunctions.functions[name];if(!p)throw new Error('Missing WERE foreign public prototype '+name);const m=p.match(/^(.+?)\s*\((.*)\)$/);return{result:m[1],args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')};};
 for(const[name,target]of Object.entries(abi.calls)){
  const p=prototype(target);
  local[name]=(...args)=>{const result=resolve(target)(...args.map((v,i)=>scalar(p.args[i],v)));return ctypes.canonical(p.result)==='void'?undefined:scalar(p.result,result);};
 }
 const bit=(p,i,value)=>{const name=abi.bits[i];if(!name)throw new Error('Unknown WERE packed field '+i);return value===undefined?ctypes.getField('struct monst',address(p),name,'unsigned int'):ctypes.setField('struct monst',address(p),name,'unsigned int',value);};
 Object.assign(local,{heap:()=>memory.HEAPU8,stackAlloc:transport.stackAlloc,
  global:i=>{if(!abi.globals[i])throw new Error('Unknown WERE global '+i);return environment.requireGlobal(abi.globals[i]);},
  monsterBit:(p,i)=>bit(p,i),setMonsterBit:(p,i,v)=>bit(p,i,transport.int(v)),
  roleplayDeaf:()=>ctypes.getField('struct u_roleplay',ctypes.locate('struct you',environment.requireGlobal('u'),'uroleplay').at,'deaf','boolean'),
  night:()=>environment.calendar('night'),
  Strcpy:(out,value)=>address(resolve('strcpy')(address(out),text(value))),
  Sprintf:(out,format,name)=>resolve('sprintf')(address(out),text(format),text(name)),
  impossible:(format,name)=>resolve('impossible')(text(format),text(name)),
  pline:(format,a,b)=>resolve('pline')(text(format),text(a),text(b)),
  You_hear:(format,name)=>resolve('You_hear')(text(format),text(name)),
  You_feel:format=>resolve('You_feel')(text('%s'),text(format)),
 });
 for(const name of ['rn2','rnd'])local[name]=(bound,line,caller)=>{if(!['were_change','new_were','were_summon','you_unwere'].includes(caller))throw new Error('Unknown WERE RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('were.c'),transport.int(line),text(caller));return resolve(name)(transport.int(bound));};
 local.rn1=(x,y,line,caller)=>local.rn2(x,line,caller)+transport.int(y);
 // Shadow DECL projections; the factory views retain the original shared bytes.
 for(const name of abi.globals)Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const context=createWereEnvironment(local,L);
 const views={were_change:[context.monster],new_were:[context.monster],were_summon:[context.permonst,null,context.intPointer]};
 environment.register('were',source,context,{prepareArgs:(name,args)=>{const p=prototype(name);return args.map((v,i)=>views[name]?.[i]?views[name][i](address(v)):scalar(p.args[i],v));}});
 return{context,services:local,exports:Object.keys(abi.public),limitation:'Original WERE entries connected; transformed-hero, combat/equipment and summon branches require their real foreign owners and focused acceptance.'};
}
