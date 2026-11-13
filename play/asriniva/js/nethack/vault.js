// Original whole VAULT context on measured shared DECL/record transport.
import abi from './vault-abi.json' with {type:'json'};
import * as source from '../ported/vault.js';
import {createVaultEnvironment} from './bindings/vault.js';
import {withCEnvironment} from '../c-runtime/context.js';
import {createRecordViews} from './record-views.js';
const owners=new WeakMap();
export function enableVault(environment,layouts){
 if(owners.has(environment))return owners.get(environment);
 const{services,memory,ctypes,transport}=environment,L=layouts.vault,address=environment.address;
 for(const[key,value]of Object.entries(abi.layout))if(L[key]!==value)throw new Error('Review VAULT native ABI '+key);
 const text=value=>typeof value==='string'?services.literal(value):address(value),boundary=args=>args.map(v=>typeof v==='string'?services.literal(v):v?.address??v),resolve=name=>environment.hasFunction(name)?environment.resolve(name):typeof services[name]==='function'?services[name]:environment.resolve(name),forwards=new Map();
 const local=new Proxy(Object.create(services),{get:(o,key,r)=>{if(Object.hasOwn(o,key))return Reflect.get(o,key,r);const value=Reflect.has(o,key)?Reflect.get(o,key,r):undefined;if(value!==undefined&&typeof value!=='function')return value;if(typeof key!=='string')return value;if(!forwards.has(key))forwards.set(key,(...args)=>resolve(key)(...boundary(args)));return forwards.get(key);}});
 for(const name of ['u','gm','gv','program_state','svc','gy','gi','svm','svp','flags','svr','levl','mons','objects'])Object.defineProperty(local,name,{value:undefined,writable:true,configurable:true});
 const views=createRecordViews(environment),u=views.record('struct you',environment.requireGlobal('u')),prop=n=>u.uprops[n],bit=(type,p,keys,index,value)=>{const key=keys[index];if(!key)throw new Error('Unknown VAULT packed field '+type+':'+index);return value===undefined?ctypes.getField(type,address(p),key,'unsigned int'):ctypes.setField(type,address(p),key,'unsigned int',value);};
 const terrain=(x,y)=>{const row=abi.globals[3],at=environment.requireGlobal(row.name)+row.offset;return at+(transport.short(x)*L.ROWNO+transport.short(y))*L.rmSize;};
 const couldsee=(x,y)=>{const at=ctypes.locate('struct instance_globals_v',environment.requireGlobal('gv'),'viz_array').at,rows=Number(memory.view.getBigUint64(at,true)),row=Number(memory.view.getBigUint64(rows+transport.short(y)*8,true));return Boolean(memory.HEAPU8[row+transport.short(x)]&abi.extra.COULD_SEE);};
 Object.assign(local,{moduleKey:environment,heap:()=>memory.HEAPU8,literal:services.literal,stackAlloc:transport.stackAlloc,stackSave:transport.stackSave,stackRestore:transport.stackRestore,
  global:index=>{const row=abi.globals[index];if(!row)throw new Error('Unknown VAULT global '+index);return environment.requireGlobal(row.name)+row.offset;},
  alloc:n=>environment.alloc('alloc',transport.uint(n)),free:p=>services.free(address(p)),
  monsterBit:(p,i)=>bit('struct monst',p,abi.monsterBits,i),setMonsterBit:(p,i,v)=>bit('struct monst',p,abi.monsterBits,i,v),
  egdBit:(p,i)=>bit('struct egd',p,abi.egdBits,i),setEgdBit:(p,i,v)=>bit('struct egd',p,abi.egdBits,i,v),
  objectCknown:p=>ctypes.getField('struct obj',address(p),'cknown','unsigned int'),objectClass:i=>ctypes.getField('struct objclass',environment.requireGlobal('objects')+transport.int(i)*ctypes.size('struct objclass'),'oc_class','char'),
  heroBit:i=>bit('struct you',environment.requireGlobal('u'),abi.heroBits,i),
  flag:i=>{if(i===0)return Number(u.umonnum!==u.umonster);if(i===1){const p=prop(L.BLINDED);return Number(Boolean((p.intrinsic||p.extrinsic)&&!p.blocked));}if(i===2){const p=prop(L.DEAF);return Number(Boolean(p.intrinsic||p.extrinsic||u.uroleplay.deaf));}if(i===3)return Number(Boolean(prop(L.STRANGLED).intrinsic));throw new Error('Unknown VAULT header flag '+i);},
  terrainBit:(x,y,i)=>bit('struct rm',terrain(x,y),abi.terrainBits,i),setTerrainBit:(x,y,i,v)=>bit('struct rm',terrain(x,y),abi.terrainBits,i,v),
  pronoun:(mon,i)=>{if(i!==0&&i!==1)throw new Error('Unknown VAULT pronoun '+i);const flags=abi.extra.PRONOUN_HALLU|(i?abi.extra.PRONOUN_NO_IT:0),gender=resolve('pronoun_gender')(address(mon),flags),p=environment.requireGlobal('genders')+transport.int(gender)*ctypes.size('struct Gender');return address(ctypes.getField('struct Gender',p,i?'his':'he','char *'));},
  m_canseeu:mon=>{const at=address(mon),m=views.record('struct monst',at),p=prop(abi.extra.INVIS),invisible=(p.intrinsic||p.extrinsic)&&!p.blocked;return Number((!invisible||Boolean(m.data.mflags1&BigInt(abi.extra.M1_SEE_INVIS)))&&!u.uinwater&&couldsee(m.mx,m.my));},
  rn2:(n,line,caller)=>{if(!['invault','move_gold','gd_move','paygd'].includes(caller))throw new Error('Unknown VAULT RNG caller '+caller);if(services.rng_log_enabled())services.rng_log_set_caller(text('vault.c'),transport.int(line),text(caller));return resolve('rn2')(transport.int(n));},
  strcmpi:(a,b)=>resolve('strncmpi')(text(a),text(b),-1),Sprintf:(out,format,a=0,b=0)=>services.sprintf(address(out),text(format),text(a),text(b)),
 });
 for(const name of ['pline','pline_The','You','You_hear','You_see','verbalize','Your'])local[name]=(...args)=>resolve(name)(...boundary(args));
 for(const name of ['impossible','panic'])local[name]=format=>resolve(name)(text(format),0);
 for(const [name,count]of [['debugpline1',1],['debugpline2',2]])local[name]=(format,...args)=>{if(resolve('debugcore')(text('vault.c'),1)){const flags=views.record('struct instance_flags',environment.requireGlobal('iflags')),saved=flags.last_msg;resolve('pline')(text(format),...boundary(args.slice(0,count)));flags.last_msg=saved;}};
 const context=createVaultEnvironment(local,L),monsterArgs=['newegd','free_egd','clear_fcorr','restfakecorr','parkguard','grddead','in_fcorridor','uleftvault','find_guard_dest','wallify_vault','gd_mv_monaway','gd_pick_corridor_gold','gd_move_cleanup','gd_letknow','gd_move'];
 const names=Object.keys(abi.public).filter(name=>!environment.hasFunction(name));
 const parameters=name=>abi.public[name].match(/\(([^)]*)\)/)[1].split(',').map(v=>v.trim()).filter(v=>v&&v!=='void');
 const prepare=(name,args)=>{const types=parameters(name);args=args.map((value,i)=>{const type=types[i];if(!type)throw new Error('Extra VAULT argument '+name);return type.includes('*')?text(value):type==='boolean'||type==='schar'?transport.char(value):type==='coordxy'?transport.short(value):type==='long'?transport.long(value):type==='unsigned int'?transport.uint(value):transport.int(value);});if(monsterArgs.includes(name))args[0]=context.monster(args[0]);if(name==='move_gold')args[0]=context.object(args[0]);if(name==='find_guard_dest'){args[1]=context.coordPointer(args[1]);args[2]=context.coordPointer(args[2]);}return args;};
 environment.register('vault',Object.fromEntries(names.map(name=>[name,(...args)=>{const result=source[name](...args),type=abi.public[name].split(' (')[0];return type==='boolean'?Number(Boolean(result)):type==='char'?transport.char(result):result?.address??result??0;}])),context,{prepareArgs:prepare});
 const owner={context,services:local,exports:names,limitation:'Whole original VAULT context and source-public dispatch connected; existing companion-extra and other public owners preserved. Reached guardless end-game accounting and other branches need strict original-C acceptance; guard creation/path/terrain/gold/visibility/message/RNG branches remain separately unverified until tested.'};owners.set(environment,owner);return owner;
}
