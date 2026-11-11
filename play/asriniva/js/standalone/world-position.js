// Original terrain, candidate collection and position-selection policies.
import * as teleport from '../ported/teleport.js';
import {is_pool,is_lava,is_waterwall,db_under_typ} from '../ported/dbridge.js';
import {closed_door,accessible} from '../ported/monmove.js';
import {may_passwall} from '../ported/hack.js';
import {sticks} from '../ported/mondata.js';
import {m_in_air} from '../ported/mon.js';
import {engr_at,sengr_at,make_engr_at,del_engr_at,can_reach_floor,wipe_engr_at} from '../ported/engrave.js';
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
 const names=['goodpos','goodpos_onscary','enexto','enexto_core','enexto_gpflags','collect_coords'];
 environment.register('world-position',Object.fromEntries(names.map(n=>[n,teleport[n]])),env,{prepareArgs:(fn,a)=>{
  if(fn==='goodpos')a[2]=monster(a[2]);else if(fn==='goodpos_onscary')a[2]=pm(a[2]);else if(fn==='collect_coords')a[0]=environment.address(a[0]);
  else{a[0]=coord(a[0]);a[3]=pm(a[3]);}return a;
 }});
 const bridge=context(layouts.dbridge),D=layouts.dbridge;
 Object.assign(bridge,{IS_WATERWALL:t=>t===D.WATER,Is_juiblex_level:lev=>services.on_level(lev,world.svd.dungeon_topology.d_juiblex_level)});
 environment.register('world-water-terrain',{is_pool,is_lava,is_waterwall,db_under_typ},bridge);
 const move=context(layouts.monmove);Object.assign(move,{
  bool:v=>Number(Boolean(v)),IS_DOOR:t=>t===layouts.monmove.DOOR,ACCESSIBLE:t=>t>=layouts.monmove.DOOR,
  SURFACE_AT:(x,y)=>world.levl[x][y].typ===D.DRAWBRIDGE_UP?services.db_under_typ(world.levl[x][y].drawbridgemask):world.levl[x][y].typ,
 });
 environment.register('world-accessibility',{closed_door,accessible},move);
 const hack=context(layouts.hack);Object.assign(hack,{IS_STWALL:t=>t<=layouts.hack.DBWALL});
 environment.register('world-wall-permission',{may_passwall},hack);
 const mon=context(layouts.mon);Object.assign(mon,{is_clinger:p=>Boolean(p.mflags1&BigInt(layouts.mon.M1_CLING))});
 environment.register('world-air-position',{m_in_air},mon,{prepareArgs:(_fn,a)=>[monster(a[0])]});
 const engr=context(layouts.engrave),EL={...layouts.mondata,...layouts.engrave},flag=(p,k)=>Boolean(p.mflags1&BigInt(EL[k]));
 Object.defineProperty(engr,'Levitation',{get:()=>{const p=world.u.uprops[EL.LEVITATION];return Number(Boolean((p.intrinsic||p.extrinsic)&&!p.blocked));}});
 Object.defineProperty(engr,'Flying',{get:()=>{const p=world.u.uprops[EL.FLYING];return Number(Boolean((p.intrinsic||p.extrinsic||(world.u.usteed&&flag(world.u.usteed.data,'M1_FLY')))&&!p.blocked));}});
 engr.P_SKILL=n=>world.u.weapon_skills[n].skill;engr.ceiling_hider=p=>Number(flag(p,'M1_HIDE')&&((flag(p,'M1_CLING')&&p.mlet!==EL.S_MIMIC)||flag(p,'M1_FLY')));
 const mondata=context(layouts.mondata);environment.register('floor-monster-stickiness',{sticks},mondata,{prepareArgs:(_fn,a)=>[record('struct permonst',a[0])]});
 Object.assign(engr,{EngrSize:ctypes.size('struct engr'),Strlen:p=>memory.strlen(environment.address(p)),
  newengr:n=>record('struct engr',memory.malloc(ctypes.size('struct engr')+Number(n))),dealloc_engr:p=>memory.free(environment.address(p)),
  engr_text_space:p=>environment.address(p)+ctypes.size('struct engr'),Strcpy:(d,s)=>services.strcpy(d,s),
  strcmp:(a,b)=>services.strcmp(typeof a==='string'?services.literal(a):a,typeof b==='string'?services.literal(b):b),
  strcmpi:(a,b)=>services.strncmpi(a,b,-1),
  rnd:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('engrave.c'),line,services.literal(caller));return services.rnd(n);},
  rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('engrave.c'),line,services.literal(caller));return services.rn2(n);},
 });
 Object.defineProperty(engr,'head_engr',{get:()=>record('struct engr',ctypes.load('struct engr *',environment.requireGlobal('head_engr'))),set:v=>ctypes.store('struct engr *',environment.requireGlobal('head_engr'),v)});
 environment.register('world-engravings',{engr_at,sengr_at,make_engr_at,del_engr_at,can_reach_floor,wipe_engr_at},engr,{prepareArgs:(fn,a)=>{if(fn==='sengr_at'&&typeof a[0]==='string')a[0]=services.literal(a[0]);if(fn==='make_engr_at')for(const i of [2,3])if(typeof a[i]==='string')a[i]=services.literal(a[i]);return a;}});
 environment.exposeAddressPort('invent',['sobj_at']);
 environment.enableAddressPort('mkmaze',{only:['is_exclusion_zone']});
 environment.exposeAddressPort('dungeon',['has_ceiling']);
 environment.extend('monster-creation',{makemon_rnd_goodpos,m_initgrp});
 return {environment:env,views,limitation:'Position-selection integration in progress; full world transitions, hero movement and recording remain separate.'};
}
