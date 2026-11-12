// Original PRIEST sanctuary/turn/cleanup policies on shared native records.
import abi from './priest-abi.json' with {type:'json'};
import * as source from '../ported/priest.js';
import {createPriestEnvironment} from '../nethack/bindings/priest.js';
const owners=new WeakMap();
export function enablePriest(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport}=environment,L=layouts.priest,address=environment.address;
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review PRIEST configured ABI '+key);
 const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v),resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
 for(const name of ['u','levl','svr','svm','gi','flags','program_state','gm','gn','gc','gb','gt','mons','xdir','ydir'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:index=>{const name=abi.globals[index];if(!name)throw new Error('Unknown PRIEST global '+index);return environment.requireGlobal(name);},
  monsterBit:(p,index)=>{const name=abi.monsterBits[index];if(!name)throw new Error('Unknown PRIEST packed field '+index);return ctypes.getField('struct monst',address(p),name,'unsigned int');},setMonsterBit:(p,index,value)=>{const name=abi.monsterBits[index];if(!name)throw new Error('Unknown PRIEST packed field '+index);return ctypes.setField('struct monst',address(p),name,'unsigned int',value);},
  roleplayDeaf:()=>memory.view.getInt8(environment.requireGlobal('u')+abi.roleplayDeafOffset),underwater:()=>ctypes.getField('struct you',environment.requireGlobal('u'),'uinwater','unsigned int'),
  terrainBit:(x,y,index)=>{if(index!==0)throw new Error('Unknown PRIEST terrain macro '+index);const at=environment.requireGlobal('svl')+L.terrain+(transport.short(x)*L.ROWNO+transport.short(y))*L.terrainSize;return ctypes.getField('struct rm',at,abi.terrainField,'unsigned int');},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  Strcpy:(out,input)=>services.strcpy(address(out),text(input)),Strcat:(out,input)=>services.strcat(address(out),text(input)),strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),Sprintf:(out,format,...args)=>services.sprintf(address(out),text(format),...boundary(args)),
  assert:ok=>{if(!ok){const row=abi.assertion;return resolve('__assert_fail')(text(row.expression),text('priest.c'),row.line,text(row.function));}},
 });
 for(const name of ['pline','You','Your','You_feel','verbalize','impossible','livelog_printf'])local[name]=(...args)=>resolve(name)(...boundary(args));
 const origin=(line,caller)=>{const name=typeof caller==='number'?abi.rngCallers[caller]:caller;if(!abi.rngCallers.includes(name))throw new Error('Unknown PRIEST RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('priest.c'),transport.int(line),text(name));};
 local.rn2=(n,line,caller)=>{origin(line,caller);return resolve('rn2')(transport.int(n));};local.d=(n,x,line,caller)=>{origin(line,caller);return resolve('d')(transport.int(n),transport.int(x));};
 const context=createPriestEnvironment(local,L),monsterArgs=['newepri','free_epri','move_special','histemple_at','inhistemple','pri_move','mon_aligntyp','priestname','p_coaligned','has_shrine','forget_temple_entry','priest_talk','reset_hostility','in_your_sanctuary','ghod_hitsu','restpriest'];
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name)),parameters=name=>abi.public[name].match(/\(([^)]*)\)/)[1].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');
 const prepare=(name,args)=>{const types=parameters(name);args=args.map((value,i)=>{const type=types[i];if(!type)throw new Error('Extra PRIEST argument '+name);return type.includes('*')?text(value):['boolean','char','schar','aligntyp'].includes(type)?transport.char(value):type==='coordxy'?transport.short(value):type==='unsigned int'?transport.uint(value):type==='long'?transport.long(value):transport.int(value);});if(monsterArgs.includes(name))args[0]=context.monster(args[0]);if(name==='priestini'){args[0]=context.level(args[0]);args[1]=context.room(args[1]);}if(name==='mk_roamer')args[0]=context.permonst(args[0]);return args;};
 environment.register('priest',Object.fromEntries(names.map(name=>[name,(...args)=>{const value=source[name](...args),type=abi.public[name].split(' (')[0];return type==='boolean'?Number(Boolean(value)):type.includes('*')?text(value):value?.address??value;}])),context,{prepareArgs:prepare});
 const owner={context,services:local,exports:names,limitation:'Whole original PRIEST context connected with existing companion extra/alignment/cleanup owners preserved. Ordinary sanctuary/turn/cleanup baselines require strict original-C acceptance; active temple/priest interaction paths remain separately unverified and missing owners fail explicitly.'};owners.set(environment,owner);return owner;
}
