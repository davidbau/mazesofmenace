// Shared storage/typed transport for unchanged artifact and hero-startup policy.
import abi from './hero-abi.json' with {type:'json'};
import attributeAbi from './attribute-abi.json' with {type:'json'};
import hungerDataAbi from './hunger-data-abi.json' with {type:'json'};
import publicFunctions from './public-functions.json' with {type:'json'};
import * as uInit from '../ported/u_init.js';
import {createUInitBridge} from '../nethack/bindings/u_init.js';
import {enablePolyself} from './polyself.js';
import * as attrib from '../ported/attrib.js';
import {createAttribEnvironment} from '../nethack/bindings/attrib.js';
import {valid_vampshiftform} from '../ported/mon.js';
import {resists_drli,dmgtype,dmgtype_fromattack,cvt_prop_to_mseenres,cvt_adtyp_to_mseenres,monstunseesu,mon_hates_silver,hates_silver,mon_hates_blessings,hates_blessings,pronoun_gender,gender,passes_bars,Resists_Elem,max_passive_dmg,can_track,noattacks,can_blow,levl_follower,can_blnd,can_chant,locomotion,msummon_environ} from '../ported/mondata.js';
import {levitate,flys,flyl,slither,ooze,immobile,crawl} from '../ported/mondata.js';
import {enableExperience} from './exper.js';
import {enableSpell} from './spell.js';
import {hidden_gold} from '../ported/vault.js';
import {hu_stat} from '../ported/eat.js';
import {enableEating} from './eat.js';
import {upgradeArtifact} from './artifact.js';
import {max_rank_sz} from '../ported/botl.js';
import {init_artifacts,hack_artifacts} from '../ported/artifact.js';
export function enableHeroStartup(environment,layouts,creation,inventory){
 const {services,ctypes,memory,transport}=environment,{views,context}=creation;
 const address=environment.address,record=(type,p)=>views.record(type,p),scalar=f=>f.ctype.slice(0,-f.ctype.match(/\s+\w+$/)[0].length);
 function location(type,at,path){for(const key of path.split('.')){const entry=ctypes.locate(type,at,key);at=entry.at;type=entry.field.record??scalar(entry.field);}return {at,type};}
 const named=(name,path='')=>path?location(ctypes.record('struct '+globalTypes[name]).type,environment.requireGlobal(name),path):{at:environment.requireGlobal(name),type:globalTypes[name]};
 const globalTypes={u:'you',gu:'instance_globals_u',gy:'instance_globals_y',svb:'instance_globals_saved_b',svs:'instance_globals_saved_s',svm:'instance_globals_saved_m',svc:'instance_globals_saved_c',svk:'instance_globals_saved_k',gl:'instance_globals_l',gn:'instance_globals_n',gm:'instance_globals_m',gw:'instance_globals_w',flags:'flag',disp:'display_hints',program_state:'sinfo',gi:'instance_globals_i',cg:'const_globals',gx:'instance_globals_x'};
 const foreign=()=>new Proxy(Object.create(services),{get:(o,k,r)=>Reflect.has(o,k)?Reflect.get(o,k,r):typeof k==='string'?(...args)=>environment.resolve(k)(...args):undefined});
 const shadow=(local,names)=>{for(const n of names)Object.defineProperty(local,n,{value:undefined,writable:true,configurable:true});return local;};
 const legacy=inventory.legacy;legacy.aligns=views.array('struct Align',environment.requireGlobal('aligns'),4);Object.defineProperty(legacy,'Role_switch',{get:()=>legacy.gu.urole.mnum});
 legacy.artidisco=views.array('short',environment.allocateGlobal('artidisco',layouts.artifact.NROFARTIFACTS*ctypes.size('short')),layouts.artifact.NROFARTIFACTS);
 Object.assign(legacy.sizes,{artidisco:layouts.artifact.NROFARTIFACTS*ctypes.size('short'),artiexist:(layouts.artifact.NROFARTIFACTS+1)*ctypes.size('struct arti_info')});
 environment.extend('artifact-properties',{init_artifacts,hack_artifacts});
 const artifacts=upgradeArtifact(environment,layouts,legacy);
 artifacts.enablePublic();
 const ui=shadow(foreign(),['objects','svb','svs','aligns','cg','flags','gn','gl','svm','gu','gi','u']);
 const groupNames=Object.keys(abi.u_init.fields),groupTypes={obj:'obj',objclass:'objclass',you:'you',roleplay:'u_roleplay',level:'d_level',align:'align',weaponskill:'skills',skill:'def_skill',trobj:'trobj',invsub:'inv_sub'};
 const aliases={obj:{opoisoned:'otrapped'},objclass:{oc_skill:'oc_subtyp',oc_level:'oc_oc2'}};
 function field(group,index,p){const name=groupNames[group],key=abi.u_init.fields[name]?.[index];if(!key)throw new Error('Unknown U_INIT field '+group+':'+index);const type=groupTypes[name];if(type){const f=aliases[name]?.[key]??key;if(abi.records[type])return{at:address(p)+abi.records[type].fields[f].offset,type:scalar(abi.records[type].fields[f])};const entry=ctypes.locate(type,address(p),f);return{...entry,type:scalar(entry.field),record:type,key:f};}if(name==='globals')return key==='discover'?named('flags','explore'):{at:environment.requireGlobal(key),type:'long'};return named(name,key);}
 const tables=abi.u_init.tables.map(row=>environment.allocateGlobal('u_init.'+row.name,uInit[row.name].length*(row.typ==='trobj'?layouts.u_init.trobjSize:row.typ==='inv_sub'?layouts.u_init.invsubSize:layouts.u_init.skillSize)));
 const globalNames=['u','u.uroleplay','u.uz','u.uz0','u.utolev','u.ualign','ubirthday','urealtime','cg.zeroobj','flags','gn','gl','svm'];
 function member(kind,i){switch(kind){case 0:return{at:named('svb','bases').at+i*4,type:'int'};case 1:return location('spell',named('svs','spl_book').at+i*ctypes.size('struct spell'),'sp_id');case 2:return{at:named('u','ualignbase').at+i,type:'signed char'};case 3:return{at:named('u','ueninc').at+i*2,type:'short'};case 4:return location('Align',environment.requireGlobal('aligns')+i*ctypes.size('struct Align'),'value');default:throw new Error('Unknown U_INIT array '+kind);}}
 Object.assign(ui,{
  get:(g,f,p)=>{const e=field(g,f,p);return BigInt(e.record?ctypes.getField(e.record,address(p),e.key,e.type):ctypes.load(e.type,e.at));},
  set:(g,f,p,v)=>{const e=field(g,f,p);return e.record?ctypes.setField(e.record,address(p),e.key,e.type,v):ctypes.store(e.type,e.at,v);},
  address:i=>{const path=globalNames[i];if(!path)throw new Error('Unknown U_INIT global '+i);const [name,...keys]=path.split('.');return keys.length?named(name,keys.join('.')).at:environment.requireGlobal(name);},
  arrayGet:(k,i)=>{const e=member(k,i);return BigInt(ctypes.load(e.type,e.at));},arraySet:(k,i,v)=>{const e=member(k,i);ctypes.store(e.type,e.at,v);},
  element:(k,i)=>k===0?environment.requireGlobal('objects')+i*ctypes.size('struct objclass'):named('u','weapon_skills').at+i*ctypes.size('struct skills'),
  invent:()=>ctypes.load('struct obj *',named('gi','invent').at),table:i=>tables[i],
  equipment:i=>ctypes.load('struct obj *',environment.requireGlobal(['uarms','uwep','uarmh','uarmg','uarmu','uarmc','uarmf','uarm','uquiver','uswapwep'][i])),
  intrinsic:i=>views.record('struct you',environment.requireGlobal('u')).uprops[layouts.attrib[i?'BLINDED':'JUMPING']].intrinsic,
  setIntrinsic:(i,v)=>{views.record('struct you',environment.requireGlobal('u')).uprops[layouts.attrib[i?'BLINDED':'JUMPING']].intrinsic=v;},
  rn2:(n,line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('u_init.c'),line,services.literal(caller));return services.rn2(n);},
 });
 // Property-style U_INIT records cross dependency boundaries as C addresses.
 for(const name of ['discover_object','Japanese_item_name','adjattrib','inv_weight','set_uasmon','newhp','newpw','adjabil','init_uhunger','getnow','max_rank_sz','spell_skilltype','mkobj','mksobj','dealloc_obj','weight','set_twoweap','setworn','setuqwep','setuwep','setuswapwep','initialspell','addinv','useupall','hidden_gold','init_attr','vary_init_attr','skill_init','num_spells','find_ac'])ui[name]=(...args)=>environment.resolve(name)(...args.map(v=>v?.address??v));
 ui.debugpline3=(format,...args)=>{if(services.debugcore('u_init.c',1)){const flags=record('struct instance_flags',environment.requireGlobal('iflags')),saved=flags.last_msg;try{return environment.resolve('pline')(...[format,...args].map(v=>typeof v==='string'?services.literal(v):v?.address??v));}finally{flags.last_msg=saved;}}};
 // Exact obj.h classification expansions used by the original U_INIT ABI.
 const UL={...layouts.objects,...layouts.steed,...layouts.mplayer,...layouts.iactions,...layouts.u_init},objects=views.array('struct objclass',environment.requireGlobal('objects'),layouts.o_init.NUM_OBJECTS),descriptors=views.array('struct objdescr',environment.requireGlobal('obj_descr'),layouts.o_init.NUM_OBJECTS);
 ui.macro=(p,i)=>{const o=record('struct obj',p),c=objects[o.otyp],weapon=o.oclass===UL.WEAPON_CLASS,tool=o.oclass===UL.TOOL_CLASS,skill=c.oc_subtyp;
  switch(i){
   case 0:return Number((weapon||tool)&&(skill===UL.P_POLEARMS||skill===UL.P_LANCE||services.is_art(o,UL.ART_SNICKERSNEE)));
   case 1:return Number(weapon&&skill>=UL.P_BOW&&skill<=UL.P_CROSSBOW);
   case 2:return Number((weapon||o.oclass===UL.GEM_CLASS)&&skill>=-UL.P_CROSSBOW&&skill<=-UL.P_BOW);
   case 3:return Number(weapon&&skill===UL.P_SPEAR);
   case 4:return Number(o.otyp>=UL.LARGE_BOX&&o.otyp<=UL.BAG_OF_TRICKS);
   case 5:return Number([UL.LUCKSTONE,UL.LOADSTONE,UL.FLINT,UL.TOUCHSTONE].includes(o.otyp));
   case 6:case 7:case 8:case 9:case 10:case 11:case 12:return Number(o.oclass===UL.ARMOR_CLASS&&c.oc_subtyp===[UL.ARM_SHIELD,UL.ARM_HELM,UL.ARM_GLOVES,UL.ARM_SHIRT,UL.ARM_CLOAK,UL.ARM_BOOTS,UL.ARM_SUIT][i-6]);
   case 13:return Number(tool&&skill!==UL.P_NONE);
   case 14:return Number((weapon||tool)&&skill>=-UL.P_BOOMERANG&&skill<=-UL.P_DART);
   case 15:return Number((weapon||tool)&&c.oc_bimanual);
   default:throw new Error('Unknown U_INIT header macro '+i);
  }
 };
 ui.objname=i=>descriptors[objects[i].oc_name_idx].oc_name;ui.objdescr=i=>descriptors[objects[i].oc_descr_idx].oc_descr;ui.spellPw=n=>transport.int(n*5);
 for(const kind of ['rnd','rn1','rne'])ui[kind]=(...args)=>{const caller=args.pop(),line=args.pop();if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('u_init.c'),line,services.literal(caller));return kind==='rn1'?services.rn2(args[0])+args[1]:services[kind](...args);};
 const bridge=createUInitBridge(layouts.u_init);environment.register('hero-init',Object.fromEntries(['u_init_misc','skills_for_role','u_init_inventory_attrs'].map(name=>[name,(...args)=>bridge(ui,name,...args)])));
 const poly=enablePolyself(environment,layouts).services;
 const mon=context(layouts.mon);mon.is_vampire=p=>Number(p.mlet===mon.S_VAMPIRE);environment.register('hero-vampire-form',{valid_vampshiftform},mon);
 const biology=context(layouts.mondata);Object.assign(biology,{charPointer:p=>typeof p==='string'?services.literal(p):address(p),loadChar:p=>memory.view.getInt8(address(p)),nolimbs:p=>Number((p.mflags1&BigInt(layouts.mondata.M1_NOLIMBS))===BigInt(layouts.mondata.M1_NOLIMBS))});for(const[k,v]of Object.entries({levitate,flys,flyl,slither,ooze,immobile,crawl}))biology[k]=v.map(services.literal);Object.defineProperty(biology,'gy',{value:record('struct instance_globals_y',environment.requireGlobal('gy'))});
 Object.assign(biology,{is_undead:p=>Number(Boolean(p.mflags2&BigInt(layouts.mondata.M2_UNDEAD))),is_were:p=>Number(Boolean(p.mflags2&BigInt(layouts.mondata.M2_WERE))),is_vampshifter:m=>Number([mon.PM_VAMPIRE,mon.PM_VAMPIRE_LEADER,mon.PM_VLAD_THE_IMPALER].includes(m.cham)),
  objectLocal:()=>record('struct obj',transport.stackAlloc(ctypes.size('struct obj'))),copyObject:(a,b)=>memory.memmove(address(a),address(b),ctypes.size('struct obj')),
  attackBefore:(a,b)=>address(a)<address(b),attackNext:a=>views.advance(a,1),
 });
 for(const key of ['uarm','ublindf'])Object.defineProperty(biology,key,{get:()=>record('struct obj',ctypes.load('struct obj *',environment.requireGlobal(key)))});
 environment.register('hero-monster-resistance',{resists_drli,dmgtype,dmgtype_fromattack},biology,{prepareArgs:(fn,args)=>{args[0]=record(fn==='resists_drli'?'struct monst':'struct permonst',args[0]);return args;}});
 Object.assign(biology,{uchar:transport.uchar,ulong:transport.ulong,
  m_canseeu:m=>{const u=record('struct you',environment.requireGlobal('u')),p=u.uprops[layouts.mondata.INVIS],invisible=(p.intrinsic||p.extrinsic)&&!p.blocked;if((invisible&&!(m.data.mflags1&BigInt(layouts.mondata.M1_SEE_INVIS)))||u.uinwater)return 0;const root=ctypes.locate('struct instance_globals_v',environment.requireGlobal('gv'),'viz_array').at,rows=Number(memory.view.getBigUint64(root,true)),row=Number(memory.view.getBigUint64(rows+m.my*8,true));return Number(Boolean(memory.HEAPU8[row+m.mx]&layouts.mondata.COULD_SEE));},
  m_clearseenres:(m,mask)=>{m.seen_resistance=BigInt.asUintN(64,m.seen_resistance&~BigInt(mask));},
 });
 for(const [key,value]of Object.entries(layouts.mondata))if(key.startsWith('M_SEEN_'))biology[key]=BigInt(value);
 biology.type_is_pname=p=>Number(Boolean(p.mflags2&BigInt(layouts.mondata.M2_PNAME)));
 Object.defineProperty(biology,'Hallucination',{get:()=>{const props=record('struct you',environment.requireGlobal('u')).uprops;return Boolean(props[biology.HALLUC].intrinsic&&!props[biology.HALLUC_RES].intrinsic&&!props[biology.HALLUC_RES].extrinsic);}});
 for(const[name,mask]of Object.entries({passes_walls:'M1_WALLWALK',amorphous:'M1_AMORPHOUS',unsolid:'M1_UNSOLID',metallivorous:'M1_METALLIVORE',slithy:'M1_SLITHY'}))biology[name]=p=>Number(Boolean(p.mflags1&BigInt(layouts.mondata[mask])));
 biology.verysmall=p=>p.msize<biology.MZ_SMALL;biology.bigmonst=p=>p.msize>=biology.MZ_LARGE;
 biology.has_head=p=>Number(!(p.mflags1&BigInt(layouts.mondata.M1_NOHEAD)));
 biology.mon_perma_blind=m=>Number(!m.mcansee&&!m.mblinded);
 for(const[key,read]of Object.entries({Blind:props=>(props[biology.BLINDED].intrinsic||props[biology.BLINDED].extrinsic)&&!props[biology.BLINDED].blocked,Blindfolded:props=>props[biology.BLINDED].extrinsic,Blnd_resist:props=>props[biology.BLND_RES].intrinsic||props[biology.BLND_RES].extrinsic}))Object.defineProperty(biology,key,{get:()=>read(record('struct you',environment.requireGlobal('u')).uprops)});
 Object.defineProperty(biology,'Unaware',{get:()=>record('struct instance_globals_m',environment.requireGlobal('gm')).multi<0&&(services.unconscious()||services.is_fainted())});
 Object.defineProperty(biology,'Strangled',{get:()=>record('struct you',environment.requireGlobal('u')).uprops[biology.STRANGLED].intrinsic});
 biology.is_silent=p=>p.msound===biology.MS_SILENT;biology.breathless=p=>Number(Boolean(p.mflags1&BigInt(layouts.mondata.M1_BREATHLESS)));
 biology.haseyes=p=>Number(!(p.mflags1&BigInt(layouts.mondata.M1_NOEYES)));
 biology.MON_WEP=m=>m.mw;biology.mon_resistancebits=m=>m.data.mresists|m.mextrinsics|m.mintrinsics;
 biology.is_weptool=o=>o.oclass===biology.TOOL_CLASS&&biology.objects[o.otyp].oc_skill!==biology.P_NONE;
 for(const[k,v]of Object.entries(layouts.mondata))if(k.startsWith('W_'))biology[k]=BigInt(v);
 for(const[name,ids]of Object.entries({completelyburns:['PM_PAPER_GOLEM','PM_STRAW_GOLEM'],completelyrots:['PM_WOOD_GOLEM','PM_LEATHER_GOLEM'],completelyrusts:['PM_IRON_GOLEM']}))biology[name]=p=>ids.some(id=>address(p)===address(biology.mons[biology[id]]));
 environment.register('monster-gender-material',{mon_hates_silver,hates_silver,mon_hates_blessings,hates_blessings,pronoun_gender,gender,passes_bars,Resists_Elem,max_passive_dmg,can_track,noattacks,can_blow,levl_follower,can_blnd,can_chant,locomotion,msummon_environ},biology,{prepareArgs:(fn,args)=>{if(fn==='msummon_environ'){const p=address(args[1]);return [record('struct permonst',args[0]),{address:p,get value(){return Number(memory.view.getBigUint64(p,true));},set value(v){memory.view.setBigUint64(p,BigInt(biology.charPointer(v)),true);}}];}if(fn==='can_blnd')return [record('struct monst',args[0]),record('struct monst',args[1]),transport.uchar(args[2]),record('struct obj',args[3])];args[0]=record(['hates_silver','hates_blessings','passes_bars','can_track','noattacks','locomotion'].includes(fn)?'struct permonst':'struct monst',args[0]);if(fn==='locomotion')args[1]=biology.charPointer(args[1]);if(fn==='max_passive_dmg')args[1]=record('struct monst',args[1]);return args;}});
 environment.register('hero-monster-resistance-memory',{cvt_prop_to_mseenres,cvt_adtyp_to_mseenres,monstunseesu},biology);

 const a=shadow(foreign(),['u','gu','gy','gi','svm','gm','svc','svk','flags','program_state','disp','mons','aligns','objects']);
 const ag=['u','gu.urole','gu.urace','gy.youmonst','gi.invent','svm.moves','gm.multi','svc.context.next_attrib_check','svk.killer.format','svk.killer.name','flags.initalign','flags.verbose','program_state.in_moveloop',null,'mons','aligns'];
 const count=Object.keys(attrib).filter(k=>Array.isArray(attrib[k])&&/_abil$/.test(k)).reduce((n,k)=>n+attrib[k].length,0),at=environment.allocateGlobal('attrib.innates',count*layouts.attrib.innateSize),names=environment.allocateGlobal('attrname',attrib.attrname.length*8),from=environment.allocateGlobal('attrib.fromWhat',256);
 Object.assign(a,{global:i=>{const path=ag[i];if(!path)throw new Error('Unknown ATTRIB global '+i);const [name,...fields]=path.split('.');return fields.length?named(name,fields.join('.')).at:environment.requireGlobal(name);},tableStorage:()=>at,tableCount:()=>count,attrnameStorage:()=>names,fromWhatBuffer:()=>from,heroData:()=>record('struct instance_globals_y',environment.requireGlobal('gy')).youmonst.data.address,
  botl:()=>record('struct display_hints',environment.requireGlobal('disp')).botl,setBotl:v=>{record('struct display_hints',environment.requireGlobal('disp')).botl=v;},
  roleplayBit:i=>record('struct you',environment.requireGlobal('u')).uroleplay[i?'deaf':'blind'],
  objectBit:(o,i)=>{const key=attributeAbi.objectBits[i];if(!key)throw new Error('Unknown ATTRIB object field '+i);return ctypes.getField('struct obj',address(o),key,'unsigned int');},
 });
 for(const kind of ['rn2','rnd','rn1','d'])a[kind]=(...args)=>{const caller=args.pop(),line=args.pop();if(services.rng_log_enabled())services.rng_log_set_caller(services.literal('attrib.c'),line,services.literal(caller));return kind==='rn1'?services.rn2(args[0])+args[1]:services[kind](...args);};
 a.u_wield_art=id=>services.is_art(ctypes.load('struct obj *',environment.requireGlobal('uwep')),id);
 a.haseyes=pm=>Number(!(record('struct permonst',address(pm)).mflags1&BigInt(layouts.attrib.M1_NOEYES)));
 a.type_is_pname=pm=>Number(Boolean(record('struct permonst',address(pm)).mflags2&BigInt(layouts.attrib.M2_PNAME)));
 a.Is_astralevel=level=>{const astral=record('struct instance_globals_saved_d',environment.requireGlobal('svd')).dungeon_topology.d_astral_level;return Number(Boolean((astral.dnum||astral.dlevel)&&services.on_level(address(level),address(astral))));};
 Object.defineProperty(a,'something',{get:()=>record('struct c_common_strings',environment.requireGlobal('c_common_strings')).c_something});
 a.equipment=i=>ctypes.load('struct obj *',environment.requireGlobal(['uarmh','uarmg','uarmf','uarmc','ublindf'][i]));
 a.objectNameKnown=i=>objects[i].oc_name_known;
 a.flag=i=>{const u=record('struct you',environment.requireGlobal('u')),L=layouts.attrib,prop=name=>u.uprops[L[name]],h=name=>prop(name).intrinsic,e=name=>prop(name).extrinsic,b=name=>prop(name).blocked,active=name=>h(name)||e(name);
  switch(i){case 0:return e('FIXED_ABIL');case 1:return active('POISON_RES');case 2:{const o=record('struct obj',ctypes.load('struct obj *',environment.requireGlobal('ublindf')));return Number(Boolean(o&&o.otyp===L.TOWEL&&o.spe>0));}case 3:return active('WOUNDED_LEGS');case 4:return Number(u.umonnum!==u.umonster);case 5:return Number(Boolean(h('HALLUC')&&!active('HALLUC_RES')));case 6:return h('CONFUSION');case 7:return h('SICK');case 8:return h('VOMITING');case 9:return active('FUMBLING');case 10:return Number(Boolean(e('BLINDED')&&!(h('BLINDED')&&!b('BLINDED'))));case 11:return (h('FAST')&~BigInt(L.INTRINSIC))||e('FAST');case 12:return record('struct flag',environment.requireGlobal('flags')).debug;
   case 13:return h('CLAIRVOYANT');case 14:return b('CLAIRVOYANT');case 15:return h('REGENERATION');case 16:return h('STUNNED');case 17:return h('BLND_RES');case 18:return h('FAST');case 19:return e('FAST');case 20:return h('BLINDED');case 21:return e('BLINDED');case 22:return b('BLINDED');case 23:return h('BLINDED')&BigInt(L.TIMEOUT);default:throw new Error('Unknown ATTRIB property '+i);}
 };
 a.assert=ok=>{if(!ok)environment.resolve('__assert_fail')(services.literal('chridx >= 0 && chridx < A_MAX'),services.literal('attrib.c'),1204,services.literal('acurr'));};
 const attributeDebug=(format,values)=>{
  if(!services.debugcore(attributeAbi.debugSource,1))return;
  const flags=record('struct instance_flags',environment.requireGlobal('iflags')),previous=flags.last_msg;
  try{return environment.resolve('pline')(typeof format==='string'?services.literal(format):address(format),...values());}finally{flags.last_msg=previous;}
 };
 const attributeText=value=>typeof value==='string'?services.literal(value):address(value);
 // Match the native ATTRIB text() boundary for literals and C string addresses.
 a.strcmp=(left,right)=>transport.int(services.strcmp(attributeText(left),attributeText(right)));
 a.strcpy=(out,value)=>address(services.strcpy(attributeText(out),attributeText(value)));
 a.strlen=value=>transport.ulong(services.strlen(attributeText(value)));
 a.strncmpi=(left,right,n)=>transport.int(environment.resolve('strncmpi')(attributeText(left),attributeText(right),transport.int(n)));
 a.strstri=(haystack,needle)=>address(environment.resolve('strstri')(attributeText(haystack),attributeText(needle)));
 a.debugpline0=format=>attributeDebug(format,()=>[0]);
 a.debugpline1=(format,value)=>attributeDebug(format,()=>[(typeof format==='string'?format:memory.readString(address(format))).includes('%ld')?transport.long(value):transport.int(value)]);
 a.debugpline2=(format,one,two)=>attributeDebug(format,()=>[attributeText(one),transport.int(two)]);
 a.debugpline3=(format,one,two,three)=>attributeDebug(format,()=>[attributeText(one),attributeText(two),transport.int(three)]);
 const attr=createAttribEnvironment(a,layouts.attrib,attrib);
 const attributeEntries=Object.fromEntries(Object.entries(attrib).filter(([name,fn])=>typeof fn==='function'&&Object.hasOwn(publicFunctions.functions,name)&&!environment.hasFunction(name)));
 const attributeParameters=Object.fromEntries(Object.keys(attributeEntries).map(name=>[name,publicFunctions.functions[name].match(/^[^(]+\((.*)\)$/)[1].split(',').map(type=>type.trim()).filter(type=>type&&type!=='void')]));
 environment.register('hero-attributes',attributeEntries,attr,{prepareArgs:(name,args)=>args.map((value,i)=>{
  const type=ctypes.canonical(attributeParameters[name][i]);
  if(type==='struct obj *')return attr.object(value);
  if(type.includes('*'))return typeof value==='string'?services.literal(value):address(value);
  return type==='signed char'||type==='char'?transport.char(value):type==='short'?transport.short(value):transport.int(value);
 })});
 const power=enableExperience(environment,layouts);
 const vault=context(layouts.vault);vault.Has_contents=o=>Number(Boolean(o.cobj));vault.contained_gold=(o,known)=>environment.resolve('contained_gold')(address(o),known);environment.exposeAddressPort('shk',['contained_gold']);environment.register('inventory-hidden-gold',{hidden_gold},vault);
 enableSpell(environment,layouts);
 if(layouts.eat.pointerSize!==hungerDataAbi.pointerSize||hu_stat.length!==hungerDataAbi.count)throw new Error('Review EAT hunger table ABI');
 const hungerTable=environment.allocateGlobal('hu_stat',hu_stat.length*hungerDataAbi.pointerSize);
 hu_stat.forEach((text,i)=>memory.view.setBigUint64(hungerTable+i*hungerDataAbi.pointerSize,BigInt(services.literal(text)),true));
 const hunger=enableEating(environment,layouts,hungerTable);
 const rank=context(layouts.botl);rank.strlen=p=>Number(services.strlen(p));environment.register('hero-rank-size',{max_rank_sz},rank);
 environment.exposeAddressPort('display',['reset_glyphmap']);
 environment.register('hero-clock',{getyear:()=>environment.calendar('getyear'),yyyymmdd:date=>environment.calendar('yyyymmdd',transport.long(date)),hhmmss:date=>environment.calendar('hhmmss',transport.long(date)),time_from_yyyymmddhhmmss:value=>environment.calendar('time_from_yyyymmddhhmmss',typeof value==='string'?services.literal(value):address(value)),midnight:()=>environment.calendar('midnight'),night:()=>environment.calendar('night'),getnow:()=>environment.calendar('getnow'),yyyymmddhhmmss:date=>environment.calendar('yyyymmddhhmmss',transport.long(date))});
 return {ui,tables,poly,enableSkills:()=>environment.extend('hero-init',{u_init_skills_discoveries:(...args)=>bridge(ui,'u_init_skills_discoveries',...args)}),limitation:'Hero initialization dependency integration in progress; source callbacks/UI and inventory/skills require their actual owners.'};
}
