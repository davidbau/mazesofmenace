import {validateNativeWeaponLayouts} from '../native/weapon-layout.js';
import {createNativeWeapon} from '../native/weapon.js';
import {installNativeIntegerCasts} from '../native/execution.js';
import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native layouts, pointer lvalues and original header macros only.
import * as weapon from '../../ported/weapon.js';
import { withCEnvironment } from '../../c-runtime/context.js';
const states = new WeakMap();
export function createWeaponEnvironment(services,L) {
 const address=value=>Number(value?.address??value??0),raw=value=>CAdapter.unsignedPointer(value);
 const native=services.nativeOwner?.nativeArena?services.nativeOwner:undefined,records=native?.nativeRecords;
 if(native)validateNativeWeaponLayouts(services.nativeWeaponTypes,L);
 const nativeClasses=new WeakSet(),nativeObjects=new WeakSet();
 const view=()=>native?native.nativeArena.view:CAdapter.currentDataView(services),global=i=>Number(services.global(i));
 const int=value=>native&&typeof value==='number'&&Number.isInteger(value)?value|0:CAdapter.signedInt(value,true);
 const scalar=(obj,key,at,type)=>Object.defineProperty(obj,key,{get:()=>view()['get'+type](at(),true),set:value=>view()['set'+type](at(),type.includes('Big')?BigInt(value):Number(value),true)});
 const pointer=at=>CAdapter.readPointerNumber(view,at);
 const ptrField=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{get:()=>wrap(pointer(at())),set:value=>view().setBigUint64(at(),raw(value),true)});
 const array=(at,stride,wrap)=>new Proxy({address:at},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?wrap(at+Number(key)*stride):target[key]});
 const numericArray=(at,count,type)=>new Proxy({address:at,length:count},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?view()['get'+type](at+Number(key)*(type.endsWith('16')?2:4),true):target[key],set(target,key,value){if(typeof key==='string'&&/^\d+$/.test(key))view()['set'+type](at+Number(key)*(type.endsWith('16')?2:4),Number(value),true);else target[key]=value;return true;}});
 const permonst=value=>{if(records)return records.record('struct permonst',value);const at=address(value);if(!at)return 0;const item={address:at};for(const[k,type]of Object.entries({mlet:'Int8',msize:'Uint8',mflags1:'BigUint64',mflags2:'BigUint64'}))scalar(item,k,()=>at+L['pm_'+k],type);return item;};
 const monster=value=>{if(records)return records.record('struct monst',value);const at=address(value);if(!at)return 0;const item={address:at};for(const k of ['mx','my','mux','muy','weapon_check'])scalar(item,k,()=>at+L['mon_'+k],'Int16');scalar(item,'misc_worn_check',()=>at+L.mon_misc_worn_check,'BigInt64');ptrField(item,'data',()=>at+L.mon_data,permonst);ptrField(item,'mw',()=>at+L.mon_mw,object);ptrField(item,'minvent',()=>at+L.mon_minvent,object);return item;};
 const object=value=>{if(records){const item=records.record('struct obj',value);if(item&&!nativeObjects.has(item)){CAdapter.installStringAliases(item,{ocarry:'v.v_ocarry'},true);nativeObjects.add(item);}return item;}const at=address(value);if(!at)return 0;const item={address:at};for(const[k,type]of Object.entries({otyp:'Int16',oclass:'Int8',oartifact:'Int8',spe:'Int8',owt:'Uint32',quan:'BigInt64',owornmask:'BigInt64',corpsenm:'Int32',where:'Int8'}))scalar(item,k,()=>at+L['obj_'+k],type);ptrField(item,'nobj',()=>at+L.obj_nobj,object);ptrField(item,'ocarry',()=>at+L.obj_ocarry,monster);for(const[i,key]of ['globby','blessed','lamplit','dknown','cursed','bknown','oeroded','oeroded2'].entries())Object.defineProperty(item,key,{get:()=>services.objectBit(at,i),set:value=>services.setObjectBit(at,i,value)});return item;};
 const classView=at=>{if(records){const item=records.record('struct objclass',at);if(!nativeClasses.has(item)){CAdapter.installStringAliases(item,{oc_skill:'oc_subtyp',oc_bimanual:'oc_big',oc_hitbon:'oc_oc1'},true);nativeClasses.add(item);}return item;}const item={address:at};for(const[k,type]of Object.entries({oc_name_idx:'Int16',oc_skill:'Int8',oc_hitbon:'Int8',oc_wldam:'Int8',oc_wsdam:'Int8',oc_weight:'Uint32'}))scalar(item,k,()=>at+L['cls_'+k],type);for(const[i,key]of ['oc_material','oc_bimanual'].entries())Object.defineProperty(item,key,{get:()=>services.classBit(at,i)});return item;};
 const skills=at=>{if(records)return records.record('struct skills',at);const item={address:at};for(const[k,type]of Object.entries({skill:'Int16',max_skill:'Int16',advance:'Uint16'}))scalar(item,k,()=>at+L['skill_'+k],type);return item;};
 const defSkill=value=>{if(records)return records.record('struct def_skill',value);const at=address(value);if(!at)return 0;const item={address:at};for(const k of ['skill','skmax'])scalar(item,k,()=>at+L['defskill_'+k],'Int16');return item;};
 const longPointer=value=>{const at=address(value);if(!at)return 0;const box={address:at};scalar(box,'value',()=>at,'BigInt64');return box;};
 const anything=value=>{if(records)return records.record('union any',value);const at=address(value);if(!at)return 0;const item={address:at};scalar(item,'a_int',()=>at+L.any_a_int,'Int32');return item;};
 const menu=value=>array(address(value),L.menuSize,at=>({address:at,item:anything(at+L.menu_item)}));
 const menuPointerLocal=()=>{const at=services.stackAlloc(L.pointerSize),box={address:at};ptrField(box,'value',()=>at,value=>value?menu(value):0);return box;};
 const arw=value=>{if(records)return records.record('struct throw_and_return_weapon',value);const at=address(value);if(!at)return 0;const item={address:at};scalar(item,'otyp',()=>at+L.arw_otyp,'Int16');scalar(item,'range',()=>at+L.arw_range,'Int32');Object.defineProperty(item,'tethered',{get:()=>services.tethered(at)});return item;};
 if(L.pointerSize!==8||L.longSize!==8||L.booleanSize!==1)throw new Error('Review changed WEAPON ABI');
 const key=services.moduleKey;if(!key||typeof key!=='object')throw new Error('WEAPON needs actual Module identity');
 if(!states.has(key)){
  if(services.storageCount(0)!==weapon.arwep.length||services.storageCount(1)!==weapon.kebabable.length)throw new Error('Review changed WEAPON private table storage');
  const state={};
  for(const name of ['skill_names_indices','rwep','pwep','hwep'])state[name]=weapon[name].map(value=>typeof value==='string'?Number(L[value]):value);
  for(const name of ['odd_skill_names','barehands_or_martial'])state[name]=weapon[name].map(value=>services.literal(value));
  state.skill_ranges=weapon.skill_ranges.map(row=>({first:Number(L[row.first]),last:Number(L[row.last]),name:services.literal(row.name)}));
  const start=Number(services.storage(0));services.heap().fill(0,start,start+L.arwSize*weapon.arwep.length);
  state.arwep=weapon.arwep.map((row,i)=>{const item=arw(start+i*L.arwSize);item.otyp=L[row.otyp];item.range=L[row.range];services.setTethered(item.address,row.tethered);return item;});
  state.kebabable=Number(services.storage(1));weapon.kebabable.forEach((value,i)=>{services.heap()[state.kebabable+i]=typeof value==='string'?Number(L[value]):value;});
  states.set(key,state);
 }
 const env=Object.assign(Object.create(services),L,states.get(key),{object,monster,permonst,defSkill,longPointer,menuPointerLocal,
  int,bool:value=>Number(Boolean(value)),long:value=>BigInt.asIntN(64,BigInt(value)),charPointer:value=>typeof value==='string'?services.literal(value):address(value),
  samePtr:(a,b)=>{const left=a?.address??a,right=b?.address??b;return native&&typeof left==='number'&&typeof right==='number'&&Number.isSafeInteger(left)&&Number.isSafeInteger(right)&&left>=0&&right>=0?left===right:raw(a)===raw(b);},defSkillNext:value=>defSkill(address(value)+L.defSkillSize),
  anyLocal:()=>anything(services.stackAlloc(L.anythingSize)),copyAny:(dst,src)=>services.heap().copyWithin(address(dst),address(src),address(src)+L.anythingSize),
  callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
  min:Math.min,max:Math.max,plur:value=>value==1?'':'s',STR18:value=>18+value,
  practice_needed_to_advance:level=>Math.imul(Math.imul(int(level),int(level)),20),
 });
 for(const name of Object.keys(L))if(/^(W_|M[12]_)/.test(name))env[name]=BigInt(L[name]);
 env.u={weapon_skills:array(global(0)+L.u_weapon_skills,L.skillsSize,skills),skill_record:numericArray(global(0)+L.u_skill_record,L.P_SKILL_LIMIT,'Int16'),uroleplay:{}};
 for(const k of ['weapon_slots','skills_advanced','umonnum','umonster','ulevel'])scalar(env.u,k,()=>global(0)+L['u_'+k],'Int32');
 for(const k of ['ux','uy'])scalar(env.u,k,()=>global(0)+L['u_'+k],'Int16');
 scalar(env.u,'twoweap',()=>global(0)+L.u_twoweap,'Int8');ptrField(env.u,'usteed',()=>global(0)+L.u_usteed,monster);
 scalar(env.u.uroleplay,'pauper',()=>global(0)+L.u_uroleplay_pauper,'Int8');
 env.objects=array(global(1),L.objectClassSize,classView);env.mons=array(global(3),L.permonstSize,permonst);
 env.OBJ_NAME=cls=>records?records.record('struct objdescr',global(2)+cls.oc_name_idx*L.objDescrSize).oc_name:pointer(global(2)+view().getInt16(address(cls)+L.cls_oc_name_idx,true)*L.objDescrSize+L.descr_oc_name);
 env.gy={youmonst:monster(global(4)+L.youmonst)};
 env.gp={};ptrField(env.gp,'propellor',()=>global(5)+L.propellor,object);
 env.gu={urole:{}};scalar(env.gu,'unweapon',()=>global(6)+L.unweapon,'Int8');for(const k of ['mnum','petnum'])scalar(env.gu.urole,k,()=>global(6)+L[k==='mnum'?'roleMnum':'petnum'],'Int16');scalar(env.gu.urole,'spelspec',()=>global(6)+L.spelspec,'Int32');
 env.gi={};ptrField(env.gi,'invent',()=>global(7)+L.invent,object);env.iflags={};scalar(env.iflags,'menu_tab_sep',()=>global(8)+L.menu_tab_sep,'Int8');
 env.svc={context:{}};scalar(env.svc.context,'tips',()=>global(9)+L.tips,'BigUint64');env.cg={zeroany:anything(global(10)+L.zeroany)};
 Object.defineProperties(env,{wizard:{get:()=>view().getInt8(global(11)+L.debug)},Upolyd:{get:()=>Number(env.u.umonnum!==env.u.umonster)},hands_obj:{get:()=>object(services.hands())},nul_glyphinfo:{get:()=>services.nulGlyphInfo()}});
 for(const[i,name]of ['uleft','uright','uwep','uswapwep'].entries())Object.defineProperty(env,name,{get:()=>object(services.equipment(i))});
 env.def_oc_syms=array(global(14),L.classsymSize,at=>records?records.record('struct class_sym',at):({get name(){return pointer(at+L.classsym_name);}}));
 if(records){
  for(const [name,type,index]of [['u','struct you',0],['gy','struct instance_globals_y',4],['gp','struct instance_globals_p',5],['gu','struct instance_globals_u',6],['gi','struct instance_globals_i',7],['iflags','struct instance_flags',8],['svc','struct instance_globals_saved_c',9],['cg','struct const_globals',10]])env[name]=records.record(type,global(index));
 }
 env.Role_if=pm=>Number(env.gu.urole.mnum===pm);env.martial_bonus=()=>Number(Boolean(env.Role_if(L.PM_SAMURAI)||env.Role_if(L.PM_MONK)));
 env.MON_WEP=mon=>mon.mw;env.MON_NOWEP=mon=>(mon.mw=0);
 env.mhis=mon=>pointer(global(13)+services.pronoun_gender(mon,L.PRONOUN_HALLU)*L.genderSize+L.gender_his);
 env.couldsee=(x,y)=>Number(Boolean(services.heap()[pointer(pointer(global(12)+L.vizArray)+y*L.pointerSize)+x]&1));
 env.cansee=(x,y)=>Number(Boolean(services.heap()[pointer(pointer(global(12)+L.vizArray)+y*L.pointerSize)+x]&2));
 env.mdistu=mon=>services.dist2(mon.mx,mon.my,env.u.ux,env.u.uy);
 env.carried=obj=>Number(obj.where===L.OBJ_INVENT);env.mcarried=obj=>Number(obj.where===L.OBJ_MINVENT);
 env.bigmonst=pm=>Number(pm.msize>=L.MZ_LARGE);
 for(const[name,field,mask]of [['is_swimmer','mflags1','M1_SWIM'],['passes_walls','mflags1','M1_WALLWALK'],['mindless','mflags1','M1_MINDLESS'],['is_animal','mflags1','M1_ANIMAL'],['thick_skinned','mflags1','M1_THICK_HIDE'],['is_giant','mflags2','M2_GIANT'],['strongmonst','mflags2','M2_STRONG'],['throws_rocks','mflags2','M2_ROCKTHROW'],['likes_gems','mflags2','M2_JEWELS']])env[name]=pm=>Number(Boolean(pm[field]&BigInt(L[mask])));
 env.is_wooden=pm=>Number(raw(pm)===raw(env.mons[L.PM_WOOD_GOLEM]));env.hates_light=pm=>Number(raw(pm)===raw(env.mons[L.PM_GREMLIN]));env.touch_petrifies=pm=>Number(raw(pm)===raw(env.mons[L.PM_COCKATRICE])||raw(pm)===raw(env.mons[L.PM_CHICKATRICE]));
 env.is_weptool=obj=>Number(obj.oclass===L.TOOL_CLASS&&env.objects[obj.otyp].oc_skill!==L.P_NONE);
 env.is_spear=obj=>Number(obj.oclass===L.WEAPON_CLASS&&env.objects[obj.otyp].oc_skill===L.P_SPEAR);
 for(const[name,skill]of [['is_axe','P_AXE'],['is_pick','P_PICK_AXE']])env[name]=obj=>Number((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.TOOL_CLASS)&&env.objects[obj.otyp].oc_skill===L[skill]);
 env.is_ammo=obj=>Number((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.GEM_CLASS)&&env.objects[obj.otyp].oc_skill>=-L.P_CROSSBOW&&env.objects[obj.otyp].oc_skill<=-L.P_BOW);
 env.bimanual=obj=>Number((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.TOOL_CLASS)&&env.objects[obj.otyp].oc_bimanual);
 env.is_graystone=obj=>Number([L.LUCKSTONE,L.LOADSTONE,L.FLINT,L.TOUCHSTONE].includes(obj.otyp));env.is_wet_towel=obj=>Number(obj.otyp===L.TOWEL&&obj.spe>0);
 env.greatest_erosion=obj=>obj.oeroded>obj.oeroded2?obj.oeroded:obj.oeroded2;
 env.is_plural=obj=>Number(obj.quan!==1n||(obj.oartifact===L.ART_EYES_OF_THE_OVERWORLD&&!services.undiscovered_artifact(L.ART_EYES_OF_THE_OVERWORLD)));
 env.resists_ston=mon=>services.Resists_Elem(mon,L.STONE_RES);
 env.ACURR=services.acurr;
 for(const name of ['which_armor','m_carrying'])env[name]=(...args)=>object(services[name](...args));
 env.distant_name=(obj,fn)=>{if(fn!==env.doname)throw new Error('Unexpected original WEAPON naming callback');return services.distant_name(obj);};
 if(native){installNativeIntegerCasts(env,['byte']);env.nativeState=native;env.nativeNamespace=createNativeWeapon(env);}
 return env;
}
const environments=new WeakMap();
export function callWeapon(services,layout,name,...args) {
 const native=services.nativeOwner?.nativeArena?services.nativeOwner:undefined;
 let state,env,previous;
 if(native){
  state=environments.get(services.moduleKey);
  if(!state){state={services,layout};const forward=new Proxy(Object.create(null),{get:(_,key)=>Reflect.get(state.services,key,state.services)});state.environment=createWeaponEnvironment(forward,layout);environments.set(services.moduleKey,state);}
  if(state.layout!==layout)throw Error('Changed native weapon layout owner');
  env=state.environment;previous=state.services;state.services=services;
 }else env=createWeaponEnvironment(services,layout);
 if(name==='environment'){if(state)state.services=previous;return env;}
 const saved=services.stackSave();
 try {
  const objects={weapon_descr:[0],hitval:[0],dmgval:[0],autoreturn_weapon:[0],monmightthrowwep:[0],finish_towel_change:[0],wet_a_towel:[0],dry_a_towel:[0],weapon_type:[0],weapon_hit_bonus:[0],weapon_dam_bonus:[0],setmnotwielded:[1]};
  const monsters={hitval:[1],dmgval:[1],special_dmgval:[0,1],silver_sears:[0,1],oselect:[0],select_rwep:[0],select_hwep:[0],possibly_unwield:[0],mon_wield_item:[0],mwepgone:[0],setmnotwielded:[0]};
  for(const i of objects[name]??[])args[i]=env.object(args[i]);for(const i of monsters[name]??[])args[i]=env.monster(args[i]);
  if(name==='special_dmgval'){args[2]=BigInt.asIntN(64,BigInt(args[2]));args[3]=env.longPointer(args[3]);}
  if(name==='silver_sears')args[2]=BigInt.asIntN(64,BigInt(args[2]));
  if(name==='skill_init')args[0]=env.defSkill(args[0]);
  let result;if(native){native.enter();try{result=env.nativeNamespace[name](...args);}finally{native.leave();}}else result=withCEnvironment(env,()=>weapon[name](...args));return native?result:result?.address??result;
 }finally{try{services.stackRestore(saved);}finally{if(state)state.services=previous;}}
}
