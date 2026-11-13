// Original BALL policies/private restriction state over the shared live gear.
import abi from './ball-abi.json' with {type:'json'};
import * as source from '../ported/ball.js';
import {createBallState,createBallEnvironment} from './bindings/ball.js';
import {withCEnvironment} from '../c-runtime/context.js';
const owners=new WeakMap();
export function enableBall(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const {services:S,memory,ctypes,transport}=environment,L=layouts.ball,address=environment.address;
 for(const[k,v]of Object.entries(abi.layout))if(L[k]!==v)throw Error('Review BALL native layout '+k);
 const text=v=>typeof v==='string'?S.literal(v):address(v),resolve=n=>environment.hasFunction(n)?environment.resolve(n):typeof S[n]==='function'?S[n]:environment.resolve(n);
 const scalar=(t,v)=>{t=ctypes.abiType(t);if(t==='void')return undefined;if(t.includes('*'))return text(v);if(t==='long')return transport.long(v);if(t==='unsigned long')return transport.ulong(v);if(t==='unsigned int')return transport.uint(v);if((t==='short'||t==='coordxy'||t==='xint16'||t==='int16'))return transport.short(v);if(t==='unsigned short')return transport.ushort(v);if(t==='char'||t==='signed char'||t==='boolean'||t==='schar')return transport.char(v);if(t==='unsigned char')return transport.uchar(v);return transport.int(v);};
 const prototype=p=>{const m=p.match(/^(.+?)\s*\((.*)\)$/);if(!m)throw Error('Unknown BALL native prototype '+p);return{ret:m[1],args:m[2].split(',').map(t=>t.trim()).filter(t=>t&&t!=='void')};};
 const local={heap:()=>memory.HEAPU8,literal:S.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:i=>{const n=abi.globals[i];if(!n)throw Error('Unknown BALL global '+i);return environment.requireGlobal(n);},
  equipment:i=>{const n=abi.equipment[i];if(!n)throw Error('Unknown BALL equipment '+i);return ctypes.load('struct obj *',environment.requireGlobal(n));},
  heroBit:i=>{if(i!==0)throw Error('Unknown BALL hero bit '+i);return ctypes.getField('struct you',environment.requireGlobal('u'),'uswallow','unsigned int');},
  terrainBit:(x,y,i)=>{if(i!==0)throw Error('Unknown BALL terrain bit '+i);return ctypes.getField('struct rm',environment.requireGlobal('svl')+L.locations+(transport.short(x)*L.ROWNO+transport.short(y))*L.rmSize,abi.terrainField,'unsigned int');},
  trapBit:(p,i)=>{const n=abi.trapBits[i];if(!n)throw Error('Unknown BALL trap bit '+i);return ctypes.getField('struct trap',address(p),n,'unsigned int');},
  setTrapBit:(p,i,v)=>{const n=abi.trapBits[i];if(!n)throw Error('Unknown BALL trap bit '+i);return ctypes.setField('struct trap',address(p),n,'unsigned int',transport.uint(v));},
 };
 for(const[n,p]of Object.entries(abi.dependencies)){const row=prototype(p);local[n]=(...args)=>scalar(row.ret,resolve(n)(...args.map((v,i)=>scalar(row.args[i],v))));}
 for(const n of ['rn2','rnd'])local[n]=(bound,line,caller)=>{caller=typeof caller==='number'?abi.rngCallers[caller]:caller;if(!abi.rngCallers.includes(caller))throw Error('Unknown BALL RNG source '+caller);if(S.rng_log_enabled())S.rng_log_set_caller(text('ball.c'),transport.int(line),text(caller));return resolve(n)(transport.int(bound));};
 for(const n of ['pline','pline_The','You','You_feel','Your','impossible'])local[n]=(f,...a)=>resolve(n)(text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 local.Sprintf=(p,f,...a)=>S.sprintf(address(p),text(f),...a.map(v=>typeof v==='string'?text(v):v?.address??v));
 const state=createBallState(local,L),context=createBallEnvironment(local,L,state);
 function argument(t,v){t=ctypes.canonical(t);if(t==='struct obj *')return context.object(v);if(t==='struct monst *')return context.monster(v);if(t==='struct trap *')return context.trap(v);if(t==='struct d_level *')return context.level(v);if(t==='int *')return context.intPointer(v);if(t==='short *'||t==='coordxy *')return context.coordPointer(v);if(t==='signed char *'||t==='boolean *')return context.booleanPointer(v);return scalar(t,v);}
 function call(name,...args){const p=abi.public[name];if(!p)throw Error('Unknown BALL original public '+name);const row=prototype(p);return transport.scoped(()=>scalar(row.ret,withCEnvironment(context,()=>source[name](...args.map((v,i)=>argument(row.args[i],v))))));}
 const names=Object.keys(abi.public).filter(n=>!environment.hasFunction(n));environment.register('ball',Object.fromEntries(names.map(n=>[n,(...args)=>call(n,...args)])));
 const owner={context,state,services:local,call,exports:names,limitation:'One unchanged BALL native context and source restriction state. Only explicitly C-compared ordinary punishment/movement/pickup/drop/unpunish paths accepted; punished water/levitation variants require separate proof.'};owners.set(environment,owner);return owner;
}
