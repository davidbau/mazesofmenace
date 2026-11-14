import {nativeWornFor} from './native/worn-graph.js';
// Shared monster pickup/equipment/name owners; source policies are unchanged.
import {mpickobj,findgold,mdrop_special_objs,relobj} from '../ported/steal.js';
import {breakarm,sliparm,num_horns} from '../ported/mondata.js';
import {can_saddle,put_saddle_on_mon,steeds,stucksteed} from '../ported/steed.js';
import {mon_nam,Monnam,minimal_monnam,Mgender,pmname,new_oname,a_monnam,Amonnam,y_monnam,YMonnam,noit_Monnam,noit_mon_nam,obj_pmname,mon_nam_too,Adjmonnam,some_mon_nam,noname_monnam,x_monnam,hcolor,hcolors,mon_pmname,Some_Monnam,free_oname} from '../ported/do_name.js';
import {noteleport_level} from '../ported/teleport.js';
import {mon_has_amulet} from '../ported/wizard.js';
import {monhealthdescr} from '../ported/pager.js';
import {hard_helmet} from '../ported/do_wear.js';
export function enableMonsterInventory(environment,layouts,creation){
 const {services,ctypes,memory,transport}=environment,{environment:env,views,context}=creation;
 const record=(type,p)=>views.record(type,p),object=p=>record('struct obj',p),monster=p=>record('struct monst',p);
 const copyString=(out,src)=>services.strcpy(environment.address(out),typeof src==='string'?services.literal(src):environment.address(src));
 const health=context(layouts.pager);health.nhUse=v=>void v;health.storeCharAt=(p,v)=>memory.view.setInt8(environment.address(p),environment.transport.char(v));environment.register('monster-health-description',{monhealthdescr},health,{prepareArgs:(_fn,args)=>[monster(args[0]),environment.transport.char(args[1]),environment.address(args[2])]});
 const wizard=context(layouts.wizard);environment.register('monster-amulet-check',{mon_has_amulet},wizard,{prepareArgs:(_fn,args)=>[monster(args[0])]});
 const names=['m_dowear','m_dowear_type','which_armor','update_mon_extrinsics','mon_adjust_speed','extract_from_minvent'];
 const nativeWorn=nativeWornFor(environment,layouts),equip=nativeWorn.context;
 environment.register('monster-equipment',Object.fromEntries(names.map(n=>[n,nativeWorn.functions[n]])),equip);
 const bio=context(layouts.mondata);Object.assign(bio,{bigmonst:p=>p.msize>=layouts.mondata.MZ_LARGE});
 environment.register('monster-armor-shape',{breakarm,sliparm,num_horns},bio,{prepareArgs:(_fn,args)=>[record('struct permonst',args[0])]});
 const pickup=context(layouts.steal);Object.assign(pickup,{Has_contents:o=>Boolean(o.cobj),engulfing_u:m=>Number(env.u.uswallow&&env.samePtr(env.u.ustuck,m))});
 for(const[key,type]of [['gt','instance_globals_t'],['gk','instance_globals_k']])Object.defineProperty(pickup,key,{value:record('struct '+type,environment.requireGlobal(key))});
 for(const key of ['uball','uchain'])Object.defineProperty(pickup,key,{get:()=>object(ctypes.load('struct obj *',environment.requireGlobal(key)))});
 environment.register('monster-pickup',{mpickobj,mdrop_special_objs,relobj},pickup,{prepareArgs:(fn,args)=>fn==='mpickobj'?[monster(args[0]),object(args[1])]:fn==='relobj'?[monster(args[0]),transport.int(args[1]),transport.char(args[2])]:[monster(args[0])]});
 environment.register('monster-gold-search',{findgold},pickup,{prepareArgs:(_fn,args)=>[object(args[0])]});
 environment.exposeAddressPort('mkobj',['add_to_minv','discard_minvent','set_corpsenm']);
 environment.exposeAddressPort('display',['canseemon','mon_visible','see_with_infrared','sensemon','tp_sensemon']);
 environment.enableAddressPort('muse',{only:['rnd_defensive_item','rnd_offensive_item','rnd_misc_item']});
 const tele=context(layouts.teleport);Object.assign(tele,{
  is_dlord:p=>env.is_demon(p)&&env.is_lord(p),is_covetous:p=>Boolean(p.mflags3&Number(layouts.teleport.M3_COVETOUS)),
 });
 if(!environment.hasFunction('noteleport_level'))environment.register('monster-teleport-eligibility',{noteleport_level},tele,{prepareArgs:(_fn,args)=>[monster(args[0])]});
 const saddle=context(layouts.steed);saddle.steeds=services.literal(String.fromCharCode(...steeds.map(n=>typeof n==='string'?layouts.steed[n]:n)));saddle.unsolid=p=>Number(Boolean(p.mflags1&BigInt(layouts.steed.M1_UNSOLID)));environment.exposeAddressPort('invent',['fully_identify_obj']);saddle.W_SADDLE=BigInt(layouts.steed.W_SADDLE);saddle.which_armor=(...args)=>object(environment.resolve('which_armor')(...args));saddle.mksobj=(...args)=>object(environment.resolve('mksobj')(...args));environment.register('monster-saddle-check',{can_saddle,put_saddle_on_mon,stucksteed},saddle,{prepareArgs:(fn,args)=>fn==='stucksteed'?[environment.transport.char(args[0])]:fn==='can_saddle'?[monster(args[0])]:[object(args[0]),monster(args[1])]});
 const helmet=context(layouts.do_wear);Object.assign(helmet,{is_helmet:equip.is_helmet,
  is_metallic:o=>env.objects[o.otyp].oc_material>=layouts.do_wear.IRON&&env.objects[o.otyp].oc_material<=layouts.do_wear.MITHRIL,
  is_crackable:o=>env.objects[o.otyp].oc_material===layouts.do_wear.GLASS&&o.oclass===layouts.do_wear.ARMOR_CLASS,
 });
 environment.register('monster-helmet-check',{hard_helmet},helmet,{prepareArgs:(_fn,args)=>[object(args[0])]});
 const name=context(layouts.do_name),N=layouts.do_name;
 for(const[k,v]of Object.entries(N))if(/^W_/.test(k))name[k]=BigInt(v);
 Object.assign(name,{
  charPointer:p=>typeof p==='string'?services.literal(p):environment.address(p),strcpy:copyString,Strcpy:copyString,Strcat:(d,s)=>services.strcat(d,typeof s==='string'?services.literal(s):s),
  strlen:p=>BigInt(services.strlen(name.charPointer(p))),ptrBefore:(a,b)=>environment.address(a)<environment.address(b),
  is_animal:equip.is_animal,type_is_pname:p=>Boolean(p.mflags2&BigInt(N.M2_PNAME)),
  engulfing_u:pickup.engulfing_u,
  ismnum:n=>Number(n>=N.LOW_PM&&n<N.NUMMONS),
  has_oname:o=>Number(Boolean(o.oextra&&o.oextra.oname)),
  newoextra:()=>record('struct oextra',environment.resolve('newoextra')()),
 });
 for(const[key,type]of [['gy','instance_globals_y'],['program_state','sinfo']])Object.defineProperty(name,key,{value:record('struct '+type,environment.requireGlobal(key))});
 const pool=environment.allocateGlobal('do_name.bufs',5*N.BUFSZ),index=environment.allocateGlobal('do_name.bufidx',4);
 name.bufs=Array.from({length:5},(_,i)=>pool+i*N.BUFSZ);Object.defineProperty(name,'bufidx',{get:()=>transport.read('Int32',index),set:v=>transport.write('Int32',index,v)});
 Object.defineProperty(name,'Hallucination',{get:()=>Boolean(env.u.uprops[N.HALLUC].intrinsic&&!env.u.uprops[N.HALLUC_RES].intrinsic&&!env.u.uprops[N.HALLUC_RES].extrinsic)});
 name.hcolors=hcolors.map(services.literal);
 environment.register('monster-names',{mon_nam,Monnam,minimal_monnam,Mgender,pmname,new_oname,a_monnam,Amonnam,y_monnam,YMonnam,noit_Monnam,noit_mon_nam,obj_pmname,mon_nam_too,Adjmonnam,some_mon_nam,noname_monnam,x_monnam,hcolor,mon_pmname,Some_Monnam,free_oname},name,{prepareArgs:(fn,args)=>{
  if(fn==='hcolor')return [name.charPointer(args[0])];
  args[0]=fn==='pmname'?record('struct permonst',args[0]):['new_oname','obj_pmname','free_oname'].includes(fn)?object(args[0]):monster(args[0]);
  if(['pmname','new_oname','noname_monnam'].includes(fn))args[1]=transport.int(args[1]);
  if(fn==='mon_nam_too')args[1]=monster(args[1]);
  if(fn==='Adjmonnam')args[1]=name.charPointer(args[1]);
  if(fn==='x_monnam'){args[1]=transport.int(args[1]);args[2]=name.charPointer(args[2]);args[3]=transport.int(args[3]);args[4]=transport.char(args[4]);}
  return args;
 }});
 return {environment:equip,limitation:'Monster inventory dependency integration in progress; full naming/UI/world effects remain unresolved.'};
}
