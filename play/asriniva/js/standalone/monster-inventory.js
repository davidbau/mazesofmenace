// Shared monster pickup/equipment/name owners; source policies are unchanged.
import {mpickobj,findgold} from '../ported/steal.js';
import * as worn from '../ported/worn.js';
import {breakarm,sliparm,num_horns} from '../ported/mondata.js';
import {can_saddle,put_saddle_on_mon,steeds} from '../ported/steed.js';
import {mon_nam,Monnam,minimal_monnam} from '../ported/do_name.js';
import {noteleport_level} from '../ported/teleport.js';
import {hard_helmet} from '../ported/do_wear.js';
export function enableMonsterInventory(environment,layouts,creation){
 const {services,ctypes,memory,transport}=environment,{environment:env,views,context}=creation;
 const record=(type,p)=>views.record(type,p),object=p=>record('struct obj',p),monster=p=>record('struct monst',p);
 const m1=(p,k)=>Boolean(p.mflags1&BigInt(layouts.worn[k]));
 const copyString=(out,src)=>services.strcpy(environment.address(out),typeof src==='string'?services.literal(src):environment.address(src));
 const equip=context(layouts.worn);
 Object.assign(equip,{
  bool:v=>Number(Boolean(v)),charPointer:p=>typeof p==='string'?services.literal(p):environment.address(p),
  Role_if:n=>env.gu.urole.mnum===n,MON_WEP:m=>m.mw,
  verysmall:p=>p.msize<layouts.worn.MZ_SMALL,nohands:p=>m1(p,'M1_NOHANDS'),is_animal:p=>m1(p,'M1_ANIMAL'),
  slithy:p=>m1(p,'M1_SLITHY'),has_horns:p=>services.num_horns(p)>0,cantweararm:p=>services.breakarm(p)||services.sliparm(p),
  WrappingAllowed:p=>m1(p,'M1_HUMANOID')&&p.msize>=layouts.worn.MZ_SMALL&&p.msize<=layouts.worn.MZ_HUGE&&p.mlet!==layouts.worn.S_GHOST&&p.mlet!==layouts.worn.S_CENTAUR&&p.pmidx!==layouts.worn.PM_WINGED_GARGOYLE&&p.pmidx!==layouts.worn.PM_MARILITH,
  bimanual:o=>(o.oclass===layouts.worn.WEAPON_CLASS||o.oclass===layouts.worn.TOOL_CLASS)&&env.objects[o.otyp].oc_bimanual,
  is_flimsy:o=>env.objects[o.otyp].oc_material<=layouts.worn.LEATHER||o.otyp===layouts.worn.RUBBER_HOSE,
  is_elven_armor:o=>['ELVEN_LEATHER_HELM','ELVEN_MITHRIL_COAT','ELVEN_CLOAK','ELVEN_SHIELD','ELVEN_BOOTS'].some(k=>o.otyp===layouts.worn[k]),
  res_to_mr:n=>layouts.worn.FIRE_RES<=n&&n<=layouts.worn.STONE_RES?(1<<(n-1))&255:0,
  monstunseesu_prop:p=>environment.resolve('monstunseesu')(environment.resolve('cvt_prop_to_mseenres')(p&255)),
  Strcpy:copyString,
 });
 for(const[k,v]of Object.entries(layouts.worn))if(/^W_|^M1_/.test(k)||k==='I_SPECIAL')equip[k]=BigInt(v);
 for(const[name,cat]of [['is_shirt','ARM_SHIRT'],['is_cloak','ARM_CLOAK'],['is_helmet','ARM_HELM'],['is_shield','ARM_SHIELD'],['is_gloves','ARM_GLOVES'],['is_boots','ARM_BOOTS'],['is_suit','ARM_SUIT']])equip[name]=o=>o.oclass===layouts.worn.ARMOR_CLASS&&env.objects[o.otyp].oc_armcat===layouts.worn[cat];
 Object.defineProperty(equip,'See_invisible',{get:()=>Boolean(env.u.uprops[layouts.worn.SEE_INVIS].intrinsic||env.u.uprops[layouts.worn.SEE_INVIS].extrinsic)});
 const names=['m_dowear','m_dowear_type','which_armor','update_mon_extrinsics','mon_adjust_speed','extract_from_minvent'];
 environment.register('monster-equipment',Object.fromEntries(names.map(n=>[n,worn[n]])),equip,{prepareArgs:(fn,args)=>{args[0]=monster(args[0]);if(['update_mon_extrinsics','extract_from_minvent'].includes(fn))args[1]=object(args[1]);if(fn==='mon_adjust_speed')args[2]=object(args[2]);return args;}});
 const bio=context(layouts.mondata);Object.assign(bio,{bigmonst:p=>p.msize>=layouts.mondata.MZ_LARGE});
 environment.register('monster-armor-shape',{breakarm,sliparm,num_horns},bio,{prepareArgs:(_fn,args)=>[record('struct permonst',args[0])]});
 const pickup=context(layouts.steal);Object.assign(pickup,{Has_contents:o=>Boolean(o.cobj),engulfing_u:m=>Number(env.u.uswallow&&env.samePtr(env.u.ustuck,m))});
 for(const[key,type]of [['gt','instance_globals_t'],['gk','instance_globals_k']])Object.defineProperty(pickup,key,{value:record('struct '+type,environment.requireGlobal(key))});
 for(const key of ['uball','uchain'])Object.defineProperty(pickup,key,{get:()=>object(ctypes.load('struct obj *',environment.requireGlobal(key)))});
 environment.register('monster-pickup',{mpickobj},pickup,{prepareArgs:(_fn,args)=>[monster(args[0]),object(args[1])]});
 environment.register('monster-gold-search',{findgold},pickup,{prepareArgs:(_fn,args)=>[object(args[0])]});
 environment.exposeAddressPort('mkobj',['add_to_minv','discard_minvent','set_corpsenm']);
 environment.exposeAddressPort('display',['canseemon','mon_visible','see_with_infrared','sensemon','tp_sensemon']);
 environment.enableAddressPort('muse',{only:['rnd_defensive_item','rnd_offensive_item','rnd_misc_item']});
 const tele=context(layouts.teleport);Object.assign(tele,{
  is_dlord:p=>env.is_demon(p)&&env.is_lord(p),is_covetous:p=>Boolean(p.mflags3&Number(layouts.teleport.M3_COVETOUS)),
 });
 environment.register('monster-teleport-eligibility',{noteleport_level},tele,{prepareArgs:(_fn,args)=>[monster(args[0])]});
 const saddle=context(layouts.steed);saddle.steeds=services.literal(String.fromCharCode(...steeds.map(n=>typeof n==='string'?layouts.steed[n]:n)));saddle.unsolid=p=>Number(Boolean(p.mflags1&BigInt(layouts.steed.M1_UNSOLID)));environment.exposeAddressPort('invent',['fully_identify_obj']);saddle.W_SADDLE=BigInt(layouts.steed.W_SADDLE);saddle.which_armor=(...args)=>object(environment.resolve('which_armor')(...args));saddle.mksobj=(...args)=>object(environment.resolve('mksobj')(...args));environment.register('monster-saddle-check',{can_saddle,put_saddle_on_mon},saddle,{prepareArgs:(fn,args)=>fn==='can_saddle'?[monster(args[0])]:[object(args[0]),monster(args[1])]});
 const helmet=context(layouts.do_wear);Object.assign(helmet,{is_helmet:equip.is_helmet,
  is_metallic:o=>env.objects[o.otyp].oc_material>=layouts.do_wear.IRON&&env.objects[o.otyp].oc_material<=layouts.do_wear.MITHRIL,
  is_crackable:o=>env.objects[o.otyp].oc_material===layouts.do_wear.GLASS&&o.oclass===layouts.do_wear.ARMOR_CLASS,
 });
 environment.register('monster-helmet-check',{hard_helmet},helmet,{prepareArgs:(_fn,args)=>[object(args[0])]});
 const name=context(layouts.do_name),N=layouts.do_name;
 Object.assign(name,{
  charPointer:p=>typeof p==='string'?services.literal(p):environment.address(p),Strcpy:copyString,Strcat:(d,s)=>services.strcat(d,typeof s==='string'?services.literal(s):s),
  strlen:p=>BigInt(services.strlen(p)),ptrBefore:(a,b)=>environment.address(a)<environment.address(b),
  is_animal:equip.is_animal,type_is_pname:p=>Boolean(p.mflags2&BigInt(N.M2_PNAME)),
  engulfing_u:pickup.engulfing_u,
 });
 for(const[key,type]of [['gy','instance_globals_y'],['program_state','sinfo']])Object.defineProperty(name,key,{value:record('struct '+type,environment.requireGlobal(key))});
 const pool=environment.allocateGlobal('do_name.bufs',5*N.BUFSZ),index=environment.allocateGlobal('do_name.bufidx',4);
 name.bufs=Array.from({length:5},(_,i)=>pool+i*N.BUFSZ);Object.defineProperty(name,'bufidx',{get:()=>transport.read('Int32',index),set:v=>transport.write('Int32',index,v)});
 Object.defineProperty(name,'Hallucination',{get:()=>Boolean(env.u.uprops[N.HALLUC].intrinsic&&!env.u.uprops[N.HALLUC_RES].intrinsic&&!env.u.uprops[N.HALLUC_RES].extrinsic)});
 environment.register('monster-names',{mon_nam,Monnam,minimal_monnam},name,{prepareArgs:(_fn,args)=>{args[0]=monster(args[0]);return args;}});
 return {environment:equip,limitation:'Monster inventory dependency integration in progress; full naming/UI/world effects remain unresolved.'};
}
