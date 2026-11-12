// Level-generation entry points on the shared C environment. Policies remain
// in the translated owners; missing dependencies retain explicit link errors.
import {enableSelections} from './selections.js';
import abi from './level-abi.json' with {type:'json'};
import {enableMkmap} from './mkmap.js';
import {is_pool_or_lava,is_ice} from '../ported/dbridge.js';
import * as stairs from '../ported/stairs.js';
import * as region from '../ported/region.js';
import {callRegion} from '../ported/region-runtime.js';
import {sys_random_seed} from '../ported/unixmain.js';
import * as bones from '../ported/bones.js';
import {createBonesEnvironment} from '../ported/bones-runtime.js';
import {bindBonesServices} from './bones-services.js';
import {bindRegionServices} from './region-services.js';
export function enableLevelStartup(environment,layouts,creation){
 enableSelections(environment,layouts,creation);
 const {services,ctypes,memory}=environment,local=new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 for(const n of ['u','flags','iflags','svl','program_state','gs','gf','gi','gu','svp','svn','gb','mons','objects','svr','svd','roles','races','genders','aligns','levl'])Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});
 const names=Object.keys(abi.bones.schema),scalar=f=>f.ctype.replace(/\s+\w+$/,'');
 const paths=['u','flags','iflags','program_state','gs','gf','gi','gu','svp','svn','gb','svl.level','mons','objects','svr.rooms','svd.dungeons','roles','races','genders','aligns','svl.level.locations','svl.lastseentyp','svd.dungeon_topology.d_oracle_level','uball','svc.context.achieveo.mines_prize_oid','svc.context.achieveo.soko_prize_oid','windowprocs.wp_id'];
 function global(i){const path=paths[i];if(!path)throw new Error('Unknown BONES global '+i);const [root,...fields]=path.split('.');let at=environment.requireGlobal(root),type=root==='windowprocs'?'struct window_procs':abi.bones.globals[root];for(const key of fields){const e=ctypes.locate(type,at,key);at=e.at;type=e.field.record??scalar(e.field);}return at;}
 function field(kind,p,index){const name=names[kind],key=abi.bones.schema[name]?.[index]?.[0],type=abi.bones.types[kind];if(!key||!type)throw new Error('Unknown BONES field '+kind+':'+index);const e=ctypes.locate(type,environment.address(p),key);return{...e,type,key,scalar:scalar(e.field)};}
 Object.assign(local,{
  global,read:(k,p,i)=>{const e=field(k,p,i);return ctypes.getField(e.type,environment.address(p),e.key,e.scalar);},write:(k,p,i,v)=>{const e=field(k,p,i);return ctypes.setField(e.type,environment.address(p),e.key,e.scalar,v);},
  copy:(to,from,n)=>memory.memmove(environment.address(to),environment.address(from),Number(n)),
  rngCaller:site=>{const row=abi.bones.rngSites[site];if(!row)throw new Error('Unknown BONES RNG call site');if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('bones.c'),row[0],services.literal(row[1]));},rn2Value:n=>services.rn2(n),
  callbackPointer:()=>environment.functionPointer('bones::remove_mon_from_bones','vp',p=>environment.call('bones','remove_mon_from_bones',p)),
 });
 // BONES exposes typed records; address-based dungeon owners consume pointers.
 for(const name of ['open_bonesfile','ledger_no','Is_special','Is_botlevel','Is_branchlev','In_hell','dunlevs_in_dungeon','on_level','depth'])local[name]=(...args)=>environment.resolve(name)(...args.map(value=>value?.address??value));
 let automatic=null;
 const seed=Object.create(services);Object.assign(seed,{ptr:environment.address,i8:environment.transport.char,u64:environment.transport.ulong,
  enterAutomatic:slots=>{const previous=automatic;automatic=new Map(slots.map(([name,n])=>[name,environment.transport.stackAlloc(n)]));return previous;},leaveAutomatic:previous=>{automatic=previous;},
  local:(name,type,value)=>{const at=automatic?.get(name);if(!at)throw new Error('Unknown UNIXMAIN automatic '+name);ctypes.store(type,at,value);return{address:at,get value(){return ctypes.load(type,at);},set value(v){ctypes.store(type,at,v);}};},
  global:name=>{const at=environment.requireGlobal(name);return{get value(){return ctypes.load('signed char',at);},set value(v){ctypes.store('signed char',at,v);}};},
 });
 for(const name of ['getpid','getnow','paniclog'])seed[name]=(...args)=>(typeof services[name]==='function'?services[name]:environment.resolve(name))(...args);
 environment.register('platform-seed',{sys_random_seed},seed);
 if(!Object.hasOwn(environment.status(),'rect'))environment.enableRect(layouts.rect);
 let env;const bonesServices=bindBonesServices(environment,local,()=>env);
 env=createBonesEnvironment(local,layouts.bones,bones);
 local.Strcpy=(out,input)=>services.strcpy(environment.address(out),typeof input==='string'?services.literal(input):environment.address(input));local.Strcat=(out,input)=>services.strcat(environment.address(out),typeof input==='string'?services.literal(input):environment.address(input));
 environment.register('bones',Object.fromEntries(Object.keys(bonesServices.public).filter(name=>!environment.hasFunction(name)).map(name=>[name,bones[name]])),env,{prepareArgs:bonesServices.prepareArgs});
 enableMkmap(environment,layouts);
 const water=creation.context(layouts.dbridge);water.IS_WATERWALL=t=>t===layouts.dbridge.WATER;water.Is_juiblex_level=lev=>services.on_level(lev,creation.environment.svd.dungeon_topology.d_juiblex_level);environment.register('level-water-terrain',{is_pool_or_lava,is_ice},water);
 const {views,context}=creation,stair=context(layouts.stairs),record=(type,p)=>views.record(type,p);
 Object.assign(stair,{StairwaySize:ctypes.size('stairway'),stairway:p=>record('stairway',p),assign_level:(to,from)=>memory.memmove(environment.address(to),environment.address(from),ctypes.size('d_level')),levelCopy:from=>{const p=environment.transport.stackAlloc(ctypes.size('d_level'));memory.memmove(p,environment.address(from),ctypes.size('d_level'));return record('d_level',p);},Sprintf:services.sprintf});
 for(const name of ['earth','air','fire','water'])Object.defineProperty(stair,name+'_level',{get:()=>creation.environment.svd.dungeon_topology['d_'+name+'_level']});
 environment.register('stairs',Object.fromEntries(Object.entries(stairs).filter(([,v])=>typeof v==='function')),stair,{prepareArgs:(fn,args)=>{if(fn==='stairway_add'){args[0]=environment.transport.short(args[0]);args[1]=environment.transport.short(args[1]);args[2]=environment.transport.char(args[2]);args[3]=environment.transport.char(args[3]);args[4]=record('d_level',args[4]);}else if(['stairway_find','stairway_find_from'].includes(fn))args[0]=record('d_level',args[0]);else if(['known_branch_stairs','stairs_description'].includes(fn))args[0]=record('stairway',args[0]);return args;}});
 const reg=Object.create(services),regionGlobals=['gr','gm','svn','svm','gg','u','gy','gi','svc','iflags','cg','svl','mons','gv'];
 for(const name of regionGlobals)Object.defineProperty(reg,name,{value:undefined,writable:true,configurable:true});
 Object.assign(reg,{global:i=>environment.requireGlobal(regionGlobals[i]),free:p=>services.free(environment.address(p)),alloc:n=>environment.alloc('alloc',n),memcpy:(a,b,n)=>memory.memmove(environment.address(a),environment.address(b),Number(n))});
 bindRegionServices(environment,reg,layouts.region);
 environment.register('region-reset',Object.fromEntries(['clear_regions','free_region','region_danger','create_gas_cloud','show_region','reg_damg'].map(name=>[name,(...args)=>{const result=callRegion(reg,layouts.region,name,...args);return result?.address??result;}])),reg);
 environment.exposeAddressPort('sp_lev',['reset_xystart_size','create_des_coder']);
 environment.exposeAddressPort('dungeon',['init_mapseen','free_exclusions','Is_special','Is_branchlev'].filter(name=>!environment.hasFunction(name)));
 environment.enableAddressPort('mklev',{only:['mklev']});
 return {environment:env,limitation:'Level dependency integration in progress. Bones file restoration and unresolved map-generation owners require their actual providers.'};
}
