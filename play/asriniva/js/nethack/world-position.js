import {connectNativeMakemon} from './native/makemon-state.js';
// Original terrain, candidate collection and position-selection policies.
import {nativeSpatialFor} from './native/spatial-state.js';
import {enableTeleport} from './teleport.js';
import {is_pool,is_lava,is_waterwall,db_under_typ,is_drawbridge_wall,is_db_wall,find_drawbridge,is_moat} from '../ported/dbridge.js';
import {closed_door,accessible} from '../ported/monmove.js';
import {may_passwall} from '../ported/hack.js';
import {sticks} from '../ported/mondata.js';
import {m_in_air} from '../ported/mon.js';
import {nativeEngraveFor} from './engrave.js';
import {enableDokick} from './dokick.js';
import {hliquid,hliquids} from '../ported/do_name.js';
import {makemon_rnd_goodpos,m_initgrp} from '../ported/makemon.js';
import {debugcore,nh_basename,fqname} from '../ported/files.js';
export function enableWorldPosition(environment,layouts,creation){
 const {services,ctypes,memory,transport,functions}=environment,{views,context,environment:world}=creation;
 const record=(t,p)=>views.record(t,p),L={...layouts.makemon,...layouts.teleport};
 if(!Object.hasOwn(environment.status(),'hacklib'))environment.enableHacklib(layouts.hacklib);
 const env=context(L);
 Object.assign(env,{
  gy:record('struct instance_globals_y',environment.requireGlobal('gy')),
  rn2:(n,line,caller)=>{if(line!==undefined&&services.rng_log_enabled())services.rng_log_set_caller(services.literal('teleport.c'),line,services.literal(caller));return services.rn2(typeof n==='function'?n():n);},
  coordArray:n=>views.array('coord',transport.stackAlloc(n*ctypes.size('coord')),n),
  localCoord:world.coordLocal,localMonster:world.monsterLocal,
  coordAt:(p,i=0)=>record('coord',environment.address(p)+i*ctypes.size('coord')),
  coordOffset:(p,i)=>environment.address(p)+i*ctypes.size('coord'),
  copyCoord:(a,b)=>memory.memmove(environment.address(a),environment.address(b),ctypes.size('coord')),
  copyMonster:(a,b)=>memory.memmove(environment.address(a),environment.address(b),ctypes.size('struct monst')),
  callFilter:(fn,x,y)=>typeof fn==='function'?fn(x,y):functions.indirect(fn,'iii',x,y),
  m_at:(x,y)=>world.svl.level.monsters[x][y],
  passes_walls:p=>Boolean(p.mflags1&BigInt(L.M1_WALLWALK)),haseyes:p=>!(p.mflags1&BigInt(L.M1_NOEYES)),
  unique_corpstat:p=>Boolean(p.geno&L.G_UNIQ),IS_ALTAR:t=>t===L.ALTAR,
  likes_lava:p=>p.pmidx===L.PM_FIRE_ELEMENTAL||p.pmidx===L.PM_SALAMANDER,
  ZAP_POS:t=>t>=L.POOL,
 });
 // FILES' original debug guard uses the same named address syntax as its
 // existing adapter, backed here by measured scalar/bitfield access.
 if(!Object.hasOwn(environment.status(),'sys'))environment.enableSys(layouts.sys);
 environment.register('wildcard-strings',{pmatch:(...a)=>environment.strutil('pmatch',...a),pmatchi:(...a)=>environment.strutil('pmatchi',...a)});
 const debug=context(layouts.files),basebuf=environment.allocateGlobal('files.nh_basename.basebuf',80);
 const cell=(type,at)=>Object.defineProperty({address:environment.address(at)},'value',{
  get:()=>type.includes('*')?environment.address(ctypes.load(type,at)):ctypes.load(type,at),
  set:v=>ctypes.store(type,at,v),
 });
 Object.assign(debug,{ptr:environment.address,literal:services.literal,i8:transport.char,i32:transport.int,i64:transport.long,u64:transport.ulong,
  sysopt:record('struct sysopt_s',environment.requireGlobal('sysopt')),
  cell:(p,t)=>cell(t,environment.address(p)),
  field:(p,t,k)=>{const f=ctypes.locate(t,environment.address(p),k),scalar=f.field.ctype.replace(new RegExp('\\s+'+k+'$'),'');return Object.defineProperty({address:f.at},'value',{
   get:()=>{const v=ctypes.getField(t,p,k,scalar);return scalar.includes('*')?environment.address(v):v;},set:v=>ctypes.setField(t,p,k,scalar,v),
  });},
  staticAddress:key=>{if(key!=='nh_basename.basebuf')throw new Error('Unresolved FILES static '+key);return basebuf;},
 });
 environment.register('source-debug-guard',{debugcore,nh_basename,fqname},debug,{prepareArgs:(_fn,a)=>{if(typeof a[0]==='string')a[0]=services.literal(a[0]);return a;}});
 const debugMessage=values=>{if(services.debugcore('teleport.c',1)){const saved=world.iflags.last_msg;try{const[fmt,...args]=values();environment.resolve('pline')(fmt,...args);}finally{world.iflags.last_msg=saved;}}};
 env.debugpline0=s=>debugMessage(()=>[s]);env.debugpline4=debugMessage;
 const coord=p=>record('coord',p),monster=p=>record('struct monst',p),pm=p=>record('struct permonst',p);
 const teleportOwner=enableTeleport(environment,layouts,creation);
 const spatial=nativeSpatialFor(environment,layouts),bridge=context(layouts.dbridge),D=layouts.dbridge;
 Object.assign(bridge,{bool:v=>Number(Boolean(v)),IS_DRAWBRIDGE:t=>t===D.DRAWBRIDGE_UP||t===D.DRAWBRIDGE_DOWN,IS_WATERWALL:t=>t===D.WATER,Is_juiblex_level:lev=>services.on_level(lev,world.svd.dungeon_topology.d_juiblex_level)});
 const shortReference=p=>({address:environment.address(p),get value(){return memory.view.getInt16(environment.address(p),true);},set value(v){memory.view.setInt16(environment.address(p),transport.short(v),true);}});
 environment.register('world-water-terrain',{is_pool:spatial.terrain.is_pool,is_lava:spatial.terrain.is_lava,is_waterwall:spatial.terrain.is_waterwall,db_under_typ:spatial.terrain.db_under_typ,is_drawbridge_wall,is_db_wall,find_drawbridge,is_moat:spatial.terrain.is_moat},bridge,{prepareArgs:(fn,args)=>fn==='find_drawbridge'?[shortReference(args[0]),shortReference(args[1])]:args});
 const move=context(layouts.monmove);Object.assign(move,{
  bool:v=>Number(Boolean(v)),IS_DOOR:t=>t===layouts.monmove.DOOR,ACCESSIBLE:t=>t>=layouts.monmove.DOOR,
  SURFACE_AT:(x,y)=>world.levl[x][y].typ===D.DRAWBRIDGE_UP?services.db_under_typ(world.levl[x][y].drawbridgemask):world.levl[x][y].typ,
 });
 environment.register('world-accessibility',{closed_door,accessible},move);
 const hack=context(layouts.hack);Object.assign(hack,{IS_STWALL:t=>t<=layouts.hack.DBWALL});
 environment.register('world-wall-permission',{may_passwall},hack);
 const mon=context(layouts.mon);Object.assign(mon,{is_clinger:p=>Boolean(p.mflags1&BigInt(layouts.mon.M1_CLING))});
 environment.register('world-air-position',{m_in_air},mon,{prepareArgs:(_fn,a)=>[monster(a[0])]});
 const mondata=context(layouts.mondata);Object.assign(mondata,{attackBefore:(a,b)=>environment.address(a)<environment.address(b),attackNext:a=>views.advance(a,1)});environment.register('floor-monster-stickiness',{sticks},mondata,{prepareArgs:(_fn,a)=>[record('struct permonst',a[0])]});
 const text=p=>typeof p==='string'?services.literal(p):environment.address(p);
 const engraving=nativeEngraveFor(environment,layouts),engravingNames=['engr_at','sengr_at','make_engr_at','del_engr_at','can_reach_floor','wipe_engr_at','read_engr_at','u_wipe_engr','freehand','forget_engravings','sanitize_engravings'];
 environment.register('world-engravings',Object.fromEntries(engravingNames.map(name=>[name,engraving.functions[name]])),engraving.context);
 const delivery=enableDokick(environment,layouts);
 // Retain these original public owners, forwarding to the one DOKICK context.
 environment.register('object-delivery',Object.fromEntries(delivery.deliveryNames.map(name=>[name,(...args)=>delivery.call(name,...args)])),delivery.services);
 const liquid=context(layouts.do_name);
 Object.assign(liquid,{hliquids:hliquids.map(services.literal),charPointer:text,program_state:record('struct sinfo',environment.requireGlobal('program_state'))});
 Object.defineProperty(liquid,'Hallucination',{get:()=>{const p=world.u.uprops[layouts.do_name.HALLUC],r=world.u.uprops[layouts.do_name.HALLUC_RES];return Number(Boolean(p.intrinsic&&!r.intrinsic&&!r.extrinsic));}});
 if(!environment.hasFunction('hliquid'))environment.register('surface-liquid-naming',{hliquid},liquid);
 environment.exposeAddressPort('invent',['sobj_at']);
 environment.enableAddressPort('mkmaze',{only:['is_exclusion_zone']});
 environment.exposeAddressPort('dungeon',['has_ceiling','surface'].filter(name=>!environment.hasFunction(name)));
 environment.extend('monster-creation',{makemon_rnd_goodpos,m_initgrp});
 connectNativeMakemon(environment,'monster-creation',['makemon_rnd_goodpos','m_initgrp']);
 return {environment:env,views,limitation:'Position-selection integration in progress; full world transitions, hero movement and recording remain separate.'};
}
