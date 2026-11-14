import {connectNativeMakemon} from './native/makemon-state.js';
// Monster construction on shared measured records; policies remain in ports.
import * as makemon from '../ported/makemon.js';
import {set_mon_data,mon_learns_traps,attacktype,attacktype_fordmg} from '../ported/mondata.js';
import {pm_to_cham,dealloc_monst,check_gear_next_turn} from '../ported/mon.js';
import {nativeSteedFor} from './native/steed-graph.js';
import {christen_monst,new_mgivenname,free_mgivenname} from '../ported/do_name.js';
import {newedog,free_edog} from '../ported/dog.js';
import {newemin,free_emin} from '../ported/minion.js';
import {newepri,free_epri,mon_aligntyp} from '../ported/priest.js';
import {newegd,free_egd} from '../ported/vault.js';
import {neweshk,free_eshk} from '../ported/shknam.js';
import {quest_info} from '../ported/questpgr.js';
import {enableLight} from './light.js';
import {monst_to_any} from '../ported/hack.js';
import {withCEnvironment} from '../c-runtime/context.js';
export function enableMonsterCreation(environment,layouts,selection){
 const {ctypes,memory,transport}=environment,{views}=selection;
 const services=new Proxy(environment.services,{get:(o,key,r)=>Reflect.has(o,key)?Reflect.get(o,key,r):typeof key==='string'?(...args)=>environment.resolve(key)(...args):undefined});
 const record=(type,p)=>views.record(type,p),raw=v=>BigInt(environment.address(v)),L=layouts.makemon;
 const env=Object.create(selection.environment);
 env.assertFail=(condition,file,line,fn)=>environment.resolve('__assert_fail')(typeof condition==='string'?services.literal(condition):environment.address(condition),typeof file==='string'?services.literal(file):environment.address(file),transport.int(line),typeof fn==='string'?services.literal(fn):environment.address(fn));
 env.raw_print=value=>environment.functions.indirect(ctypes.getField('struct window_procs',environment.requireGlobal('windowprocs'),'win_raw_print','void *'),'vp',typeof value==='string'?services.literal(value):environment.address(value));
 env.Snprintf=(fn,line,out,size,format,...args)=>environment.resolve('nh_snprintf')(typeof fn==='string'?services.literal(fn):environment.address(fn),transport.int(line),environment.address(out),transport.ulong(size),typeof format==='string'?services.literal(format):environment.address(format),...args.map(v=>typeof v==='string'?services.literal(v):environment.address(v)));
 Object.defineProperty(env,'monsdump',{get:()=>views.array('struct enum_dump',environment.requireGlobal('monsdump'),layouts.earlyarg.monsdump_count)});
 env.nhUse=value=>{void value;};
 const context=layout=>{
  const local=Object.create(env);
  for(const[key,value]of Object.entries(layout)){
   let owner=env,descriptor;while(owner&&!descriptor){descriptor=Object.getOwnPropertyDescriptor(owner,key);owner=Object.getPrototypeOf(owner);}
   // Some profiles export native values for header aliases such as fmon.
   // Shared-state getters/setters must remain live and must never receive them.
   if(descriptor&&(descriptor.get||descriptor.set||descriptor.writable===false))continue;
   Object.defineProperty(local,key,{value,writable:true,configurable:true});
  }
  return local;
 };
 Object.assign(env,L,{min:Math.min,max:Math.max,sgn:Math.sign,coordxy:transport.short,short:transport.short,
  assignField:(o,k,v)=>{o[k]=v;return o[k];},copyRecord:(to,from,n)=>memory.memmove(environment.address(to),environment.address(from),Number(n)),
  coordLocal:()=>record('struct nhcoord',transport.stackAlloc(ctypes.size('coord'))),
  monsterLocal:()=>record('struct monst',transport.stackAlloc(ctypes.size('struct monst'))),
  intArrayLocal:n=>views.array('int',transport.stackAlloc(4*n),n),intLoad:p=>transport.read('Int32',p),
  monster:p=>record('struct monst',p),object:p=>record('struct obj',p),mextra:p=>record('struct mextra',p),
 });
 for(const[name,type]of Object.entries({gi:'instance_globals_i',gu:'instance_globals_u',gv:'instance_globals_v',gs:'instance_globals_s',gt:'instance_globals_t',gl:'instance_globals_l',cg:'const_globals',svq:'instance_globals_saved_q',gm:'instance_globals_m',go:'instance_globals_o',flags:'flag',svr:'instance_globals_saved_r',c_common_strings:'c_common_strings'}))Object.defineProperty(env,name,{value:record('struct '+type,environment.requireGlobal(name))});
 Object.defineProperty(env,'objects',{value:views.array('struct objclass',environment.requireGlobal('objects'),layouts.o_init.NUM_OBJECTS)});
 Object.defineProperty(env,'def_monsyms',{value:views.array('struct class_sym',environment.requireGlobal('def_monsyms'),layouts.drawing.MAXMCLASSES)});
 Object.defineProperty(env,'uwep',{get:()=>record('struct obj',ctypes.load('struct obj *',environment.requireGlobal('uwep')))});
 // Original header expansions copied from the unchanged MAKEMON adapter.
 env.syms=makemon.syms.map(n=>L[n]);env.levl=env.svl.level.locations;
 Object.defineProperty(env,'fmon',{get:()=>env.svl.level.monlist,set:v=>env.svl.level.monlist=v});Object.defineProperty(env,'wizard',{get:()=>env.flags.debug});Object.defineProperty(env,'quest_dnum',{get:()=>env.svd.dungeon_topology.d_quest_dnum});
 for(const name of ['nothing_happens','nothing_seems_to_happen'])Object.defineProperty(env,name,{get:()=>env.c_common_strings['c_'+name]});
 const lcheck=(lev,name)=>{const b=env.svd.dungeon_topology['d_'+name];return Number(Boolean((b.dnum||b.dlevel)&&services.on_level(lev,b)));};
 for(const name of ['air','astral','earth','fire','water'])env['Is_'+name+(name==='knox'?'':'level')]=lev=>lcheck(lev,name+'_level');
 env.Is_knox=lev=>lcheck(lev,'knox_level');env.Is_rogue_level=lev=>lcheck(lev,'rogue_level');env.Is_stronghold=lev=>lcheck(lev,'stronghold_level');
 env.In_endgame=lev=>Number(lev.dnum===env.svd.dungeon_topology.d_astral_level.dnum);env.In_sokoban=lev=>Number(lev.dnum===env.svd.dungeon_topology.d_sokoban_dnum);env.Race_if=pm=>Number(env.gu.urace.mnum===pm);
 Object.defineProperty(env,'Inhell',{get:()=>services.In_hell(env.u.uz)});
 Object.defineProperty(env,'Blind',{get:()=>{const p=env.u.uprops[L.BLINDED];return Number(Boolean((p.intrinsic||p.extrinsic)&&!p.blocked));}});
 Object.defineProperty(env,'Protection_from_shape_changers',{get:()=>{const p=env.u.uprops[L.PROT_FROM_SHAPE_CHANGERS];return Number(Boolean(p.intrinsic||p.extrinsic));}});
 env.MON_AT=(x,y)=>Number(Boolean(env.svl.level.monsters[x][y]));env.OBJ_AT=(x,y)=>Number(Boolean(env.svl.level.objects[x][y]));env.u_at=(x,y)=>Number(x===env.u.ux&&y===env.u.uy);
 env.M_AP_TYPE=m=>m.m_ap_type&L.M_AP_TYPMASK;env.MGIVENNAME=m=>m.mextra.mgivenname;env.EDOG=m=>m.mextra.edog;env.EMIN=m=>m.mextra.emin;env.EPRI=m=>m.mextra.epri;
 env.has_edog=m=>Number(Boolean(m.mextra&&m.mextra.edog));env.has_emin=m=>Number(Boolean(m.mextra&&m.mextra.emin));env.has_mgivenname=m=>Number(Boolean(m.mextra&&m.mextra.mgivenname));env.has_mcorpsenm=m=>Number(Boolean(m.mextra&&m.mextra.mcorpsenm!==L.NON_PM));
 const flag=(p,field,name)=>Number(Boolean(p[field]&BigInt(L[name])));
 env.always_hostile=p=>flag(p,'mflags2','M2_HOSTILE');
 env.always_peaceful=p=>flag(p,'mflags2','M2_PEACEFUL');
 env.amorphous=p=>flag(p,'mflags1','M1_AMORPHOUS');
 env.extra_nasty=p=>flag(p,'mflags2','M2_NASTY');
 env.humanoid=p=>flag(p,'mflags1','M1_HUMANOID');
 env.is_demon=p=>flag(p,'mflags2','M2_DEMON');
 env.is_domestic=p=>flag(p,'mflags2','M2_DOMESTIC');
 env.is_dwarf=p=>flag(p,'mflags2','M2_DWARF');
 env.is_elf=p=>flag(p,'mflags2','M2_ELF');
 env.is_female=p=>flag(p,'mflags2','M2_FEMALE');
 env.is_flyer=p=>flag(p,'mflags1','M1_FLY');
 env.is_giant=p=>flag(p,'mflags2','M2_GIANT');
 env.is_lord=p=>flag(p,'mflags2','M2_LORD');
 env.is_male=p=>flag(p,'mflags2','M2_MALE');
 env.is_mercenary=p=>flag(p,'mflags2','M2_MERC');
 env.is_minion=p=>flag(p,'mflags2','M2_MINION');
 env.is_neuter=p=>flag(p,'mflags2','M2_NEUTER');
 env.is_prince=p=>flag(p,'mflags2','M2_PRINCE');
 env.is_shapeshifter=p=>flag(p,'mflags2','M2_SHAPESHIFTER');
 env.is_swimmer=p=>flag(p,'mflags1','M1_SWIM');
 env.likes_gold=p=>flag(p,'mflags2','M2_GREEDY');
 env.mindless=p=>flag(p,'mflags1','M1_MINDLESS');
 env.strongmonst=p=>flag(p,'mflags2','M2_STRONG');
 env.throws_rocks=p=>flag(p,'mflags2','M2_ROCKTHROW');
 env.monsndx=p=>p.pmidx;env.is_golem=p=>Number(p.mlet===L.S_GOLEM);env.is_floater=p=>Number(p.mlet===L.S_EYE||p.mlet===L.S_LIGHT);env.noncorporeal=p=>Number(p.mlet===L.S_GHOST);
 env.is_bat=p=>Number([L.PM_BAT,L.PM_GIANT_BAT,L.PM_VAMPIRE_BAT].some(n=>env.samePtr(p,env.mons[n])));env.is_rider=p=>Number([L.PM_DEATH,L.PM_FAMINE,L.PM_PESTILENCE].some(n=>env.samePtr(p,env.mons[n])));
 env.is_placeholder=p=>Number([L.PM_ORC,L.PM_GIANT,L.PM_ELF,L.PM_HUMAN].some(n=>env.samePtr(p,env.mons[n])));env.is_whirly=p=>Number(p.mlet===L.S_VORTEX||env.samePtr(p,env.mons[L.PM_AIR_ELEMENTAL]));
 env.is_mplayer=p=>Number(raw(p)>=raw(env.mons[L.PM_ARCHEOLOGIST])&&raw(p)<=raw(env.mons[L.PM_WIZARD]));env.is_dprince=p=>Number(Boolean(env.is_demon(p)&&env.is_prince(p)));env.is_ndemon=p=>Number(Boolean(env.is_demon(p)&&!(p.mflags2&BigInt(L.M2_LORD|L.M2_PRINCE))));
 env.is_lminion=m=>Number(Boolean(env.is_minion(m.data)&&services.mon_aligntyp(m)===L.A_LAWFUL));env.nonliving=p=>Number(Boolean(flag(p,'mflags2','M2_UNDEAD')||env.samePtr(p,env.mons[L.PM_MANES])||env.is_golem(p)||p.mlet===L.S_VORTEX));
 env.is_unicorn=p=>Number(p.mlet===L.S_UNICORN&&flag(p,'mflags2','M2_JEWELS'));env.is_armed=p=>services.attacktype(p,L.AT_WEAP);env.pm_resistance=(p,r)=>Number(Boolean(p.mresists&r));
 env.is_sword=o=>Number(o.oclass===L.WEAPON_CLASS&&env.objects[o.otyp].oc_skill>=L.P_SHORT_SWORD&&env.objects[o.otyp].oc_skill<=L.P_SABER);
 env.isupper=c=>Number(((env.uint(c)-65)>>>0)<26);env.IS_DOOR=t=>Number(t===L.DOOR);env.IS_WALL=t=>Number(t&&t<=L.DBWALL);env.DEADMONSTER=m=>Number(m.mhp<1);
 env.Align2amask=x=>env.uint(x===L.A_NONE?L.AM_NONE:x===L.A_LAWFUL?L.AM_LAWFUL:x+2);env.distu=(x,y)=>services.dist2(env.short(x),env.short(y),env.u.ux,env.u.uy);
 env.monmin_difficulty=d=>Math.trunc(d/6);env.monmax_difficulty=d=>Math.trunc((d+env.u.ulevel)/2);env.montooweak=(n,lev)=>Number(env.mons[n].difficulty<lev);env.montoostrong=(n,lev)=>Number(env.mons[n].difficulty>lev);
 env.monsym=p=>env.def_monsyms[p.mlet].sym;env.quest_mon_represents_role=(p,role)=>Number(p.mlet===L.S_HUMAN&&env.gu.urole.mnum===role&&(p.msound===L.MS_LEADER||p.msound===L.MS_NEMESIS));
 env.mhe=m=>env.genders[services.pronoun_gender(m,L.PRONOUN_HALLU)].he;env.ARM_BONUS=o=>env.objects[o.otyp].a_ac+o.spe-env.min(env.greatest_erosion(o),env.objects[o.otyp].a_ac);
 for(const key of ['STRAT_WAITFORU','STRAT_CLOSE','STRAT_APPEARMSG','M_SEEN_NOTHING'])env[key]=BigInt(L[key]);
 env.newmonst=()=>env.monster(services.alloc(L.monsterSize));env.makeknown=n=>services.discover_object(n,1,1,1);env.canspotmon=m=>Number(Boolean(services.canseemon(m)||services.sensemon(m)));
 env.u_wield_art=n=>services.is_art(env.uwep,n);env.cansee=(x,y)=>Number(Boolean(env.gv.viz_array[y][x]&L.IN_SIGHT));env.next2u=(x,y)=>Number(env.distu(x,y)<=2);env.greatest_erosion=o=>env.max(o.oeroded,o.oeroded2);env.race_hostile=p=>Number(Boolean(p.mflags2&BigInt(env.gu.urace.hatemask)));env.race_peaceful=p=>Number(Boolean(p.mflags2&BigInt(env.gu.urace.lovemask)));env.showdebug=f=>services.debugcore(f,1);env.pline1=s=>services.pline('%s',s);env.emits_light=p=>Number(p.mlet===L.S_LIGHT||[L.PM_FLAMING_SPHERE,L.PM_SHOCKING_SPHERE,L.PM_BABY_GOLD_DRAGON,L.PM_FIRE_VORTEX,L.PM_FIRE_ELEMENTAL,L.PM_GOLD_DRAGON].some(n=>env.samePtr(p,env.mons[n])));

 env.qsort=(p,n,width,fn)=>environment.resolve('nh_deterministic_qsort')(environment.address(p),transport.ulong(n),transport.ulong(width),(a,b)=>transport.scoped(()=>withCEnvironment(env,fn,a,b)));
 env.rn1=(range,base)=>services.rn2(range)+base;
 env.cansee=(x,y)=>Number(Boolean(transport.read('Uint8',transport.read('ptr',env.gv.viz_array+y*8)+x)&L.IN_SIGHT));
 for(const[name,type]of Object.entries({mksobj:'struct obj',mkobj:'struct obj',mkobj_at:'struct obj',which_armor:'struct obj',findgold:'struct obj',oname:'struct obj',christen_monst:'struct monst',Is_special:'struct s_level',qt_montype:'struct permonst'}))env[name]=(...args)=>record(type,environment.resolve(name)(...args));
 env.zeromextra=record('struct mextra',environment.allocateGlobal('makemon.zeromextra',ctypes.size('struct mextra')));
 const names=['makemon','propagate','mbirth_limit','monhp_per_lvl','newmonhp','init_mextra','newmextra','adj_lev','golemhp','peace_minded','set_malign','newmcorpsenm','freemcorpsenm','mongets','m_initweap','m_initinv','m_initthrow','mkmonmoney','grow_up','create_critters','mkclass','mkclass_aligned','mkclass_poly','clone_mon','unmakemon','set_mimic_sym','bagotricks','summon_furies','dump_mongen'];
 environment.register('monster-creation',Object.fromEntries(names.map(n=>[n,makemon[n]])),env,{prepareArgs:(fn,args)=>{
  if(fn==='mkclass_poly'||fn==='summon_furies')return [transport.int(args[0])];
  if(fn==='dump_mongen')return [];
  if(fn==='bagotricks'){const p=environment.address(args[2]);return [record('struct obj',args[0]),transport.char(args[1]),p?Object.defineProperty({address:p},'value',{get:()=>memory.view.getInt32(p,true),set:v=>memory.view.setInt32(p,transport.int(v),true)}):0];}
  if(fn==='clone_mon')return [record('struct monst',args[0]),transport.short(args[1]),transport.short(args[2])];
  if(fn==='unmakemon')return [record('struct monst',args[0]),transport.uint(args[1])];
  if(fn==='mkclass'||fn==='mkclass_aligned')return [transport.char(args[0]),transport.int(args[1]),...(fn==='mkclass_aligned'?[transport.char(args[2])]:[])];
  if(fn==='create_critters')return [transport.int(args[0]),record('struct permonst',args[1]),transport.char(args[2])];
  if(fn==='makemon'||fn==='adj_lev'||fn==='peace_minded')args[0]=record('struct permonst',args[0]);
  else if(fn==='init_mextra')args[0]=record('struct mextra',args[0]);
  else if(!['mbirth_limit','propagate','newmextra','golemhp'].includes(fn))args[0]=record('struct monst',args[0]);
  if(fn==='grow_up')args[1]=record('struct monst',args[1]);
  if(fn==='makemon_rnd_goodpos')args[2]=record('coord',args[2]);
  return args;
 }});
 const native=connectNativeMakemon(environment,'monster-creation',names);
 // Each owner gets its own header/constants context, sharing only C memory.
 const biology=context(layouts.mondata);Object.assign(biology,{
  gy:record('struct instance_globals_y',environment.requireGlobal('gy')),
  shortRef:(o,k)=>Object.defineProperty({},'value',{get:()=>o[k],set:v=>{o[k]=transport.short(v);}}),
  attackBefore:(a,b)=>environment.address(a)<environment.address(b),attackNext:a=>views.advance(a,1),
 });
 environment.register('monster-data',{set_mon_data,mon_learns_traps,attacktype,attacktype_fordmg},biology,{prepareArgs:(fn,args)=>{args[0]=views.argument(['attacktype','attacktype_fordmg'].includes(fn)?'permonst':'monst',args[0]);if(fn==='set_mon_data')args[1]=views.argument('permonst',args[1]);return args;}});
 const mon=context(layouts.mon);Object.assign(mon,{
  ismnum:n=>Number(n>=L.LOW_PM&&n<L.NUMMONS),is_shapeshifter:env.is_shapeshifter,
  ptrOffset:(p,n)=>environment.address(p)+Number(n),copyStruct:env.copyRecord,monSize:ctypes.size('struct monst'),
 });
 const naming=context(layouts.do_name);Object.assign(naming,{charPointer:p=>typeof p==='string'?services.literal(p):environment.address(p),strlen:p=>BigInt(services.strlen(p)),has_mgivenname:env.has_mgivenname});
 environment.register('monster-naming',{christen_monst,new_mgivenname,free_mgivenname},naming,{prepareArgs:(_fn,args)=>{args[0]=record('struct monst',args[0]);return args;}});
 environment.register('monster-lifetime',{pm_to_cham,dealloc_monst,check_gear_next_turn},mon,{prepareArgs:(fn,args)=>{if(fn!=='pm_to_cham')args[0]=record('struct monst',args[0]);return args;}});
 const placement=nativeSteedFor(environment,layouts);
 environment.register('monster-placement',{place_monster:placement.functions.place_monster});
 const extras=Object.create(env);Object.assign(extras,{eminSize:ctypes.size('struct emin'),edogSize:ctypes.size('struct edog'),emin:p=>record('struct emin',p),edog:p=>record('struct edog',p)});
 Object.assign(extras,{epriSize:ctypes.size('struct epri'),egdSize:ctypes.size('struct egd'),eshkSize:ctypes.size('struct eshk'),epri:p=>record('struct epri',p),eshk:p=>record('struct eshk',p),ESHK:m=>m.mextra.eshk});
 environment.register('monster-companion-extra',{newedog,free_edog,newemin,free_emin,newepri,free_epri,newegd,free_egd,neweshk,free_eshk,mon_aligntyp},extras,{prepareArgs:(_fn,args)=>{args[0]=record('struct monst',args[0]);return args;}});
 environment.register('monster-quest-info',{quest_info},context(layouts.questpgr));
 enableLight(environment,layouts);
 environment.register('monster-anything',{monst_to_any},Object.assign(Object.create(env),{sizes:{any:ctypes.size('union any')}}),{prepareArgs:(_fn,args)=>[record('struct monst',args[0])]});
 environment.exposeAddressPort('dungeon',['In_V_tower','In_mines']);
 if(!Object.hasOwn(environment.status(),'cmd-geometry'))environment.enableCommandGeometry();
 return {environment:env,views,context,native,limitation:'Monster creation dependency integration in progress; unresolved world/UI/equipment owners fail explicitly.'};
}
