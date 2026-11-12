import * as u_init from '../../ported/u_init.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const fields={"obj": ["otyp", "oclass", "quan", "spe", "known", "dknown", "bknown", "rknown", "cknown", "lknown", "otrapped", "cursed", "opoisoned", "blessed", "owt", "nobj"], "objclass": ["oc_skill", "oc_class", "oc_magic", "oc_level", "oc_uses_known", "oc_charged", "oc_name_idx", "oc_descr_idx"], "you": ["weapon_slots", "umoney0", "ustuck", "umoved", "umortality", "ugrave_arise", "umonnum", "umonster", "ulycn", "ulevel", "uhp", "uhpmax", "uhppeak", "uen", "uenmax", "uenpeak", "uspellprot", "ulevelmax", "ublesscnt", "nv_range", "xray_range", "unblind_telepat_range", "uhandedness"], "roleplay": ["blind", "nudist", "deaf", "pauper", "reroll", "reserved1", "reserved2", "reserved3", "numbones", "numrerolls"], "level": ["dnum", "dlevel"], "weaponskill": ["skill", "advance"], "skill": ["skill", "skmax"], "align": ["type"], "flags": ["female", "initgend", "beginner", "initalign"], "gn": ["nocreate", "nocreate2", "nocreate3", "nocreate4"], "gu": ["urole.mnum", "urace.mnum"], "gl": ["lastinvnr"], "svm": ["moves"], "globals": ["ubirthday", "discover"], "trobj": ["trotyp", "trspe", "trclass", "trquan_min", "trquan_max", "trbless"], "invsub": ["race_pm", "item_otyp", "subs_otyp"]};
const longFields=new Set(["globals.ubirthday", "obj.quan", "roleplay.numbones", "roleplay.numrerolls", "svm.moves", "you.umoney0"]);
const pointerFields=new Set(["obj.nobj", "you.ustuck"]);
const tables=[{"name": "Archeologist", "typ": "trobj"}, {"name": "Barbarian_0", "typ": "trobj"}, {"name": "Barbarian_1", "typ": "trobj"}, {"name": "Cave_man", "typ": "trobj"}, {"name": "Healer", "typ": "trobj"}, {"name": "Knight", "typ": "trobj"}, {"name": "Monk", "typ": "trobj"}, {"name": "Priest", "typ": "trobj"}, {"name": "Ranger", "typ": "trobj"}, {"name": "Rogue", "typ": "trobj"}, {"name": "Samurai", "typ": "trobj"}, {"name": "Tourist", "typ": "trobj"}, {"name": "Valkyrie", "typ": "trobj"}, {"name": "Wizard", "typ": "trobj"}, {"name": "Healing_book", "typ": "trobj"}, {"name": "Protection_book", "typ": "trobj"}, {"name": "Confuse_monster_book", "typ": "trobj"}, {"name": "Tinopener", "typ": "trobj"}, {"name": "Magicmarker", "typ": "trobj"}, {"name": "Lamp", "typ": "trobj"}, {"name": "Blindfold", "typ": "trobj"}, {"name": "Xtra_food", "typ": "trobj"}, {"name": "Leash", "typ": "trobj"}, {"name": "Towel", "typ": "trobj"}, {"name": "Wishing", "typ": "trobj"}, {"name": "Money", "typ": "trobj"}, {"name": "inv_subs", "typ": "inv_sub"}, {"name": "Skill_A", "typ": "def_skill"}, {"name": "Skill_B", "typ": "def_skill"}, {"name": "Skill_C", "typ": "def_skill"}, {"name": "Skill_H", "typ": "def_skill"}, {"name": "Skill_K", "typ": "def_skill"}, {"name": "Skill_Mon", "typ": "def_skill"}, {"name": "Skill_P", "typ": "def_skill"}, {"name": "Skill_R", "typ": "def_skill"}, {"name": "Skill_Ran", "typ": "def_skill"}, {"name": "Skill_S", "typ": "def_skill"}, {"name": "Skill_T", "typ": "def_skill"}, {"name": "Skill_V", "typ": "def_skill"}, {"name": "Skill_W", "typ": "def_skill"}];
const raw=value=>BigInt(value?.address??value??0);
const address=value=>Number(raw(value));
const indexed=(get,set)=>new Proxy(Object.create(null),{get:(_,key)=>/^\d+$/.test(String(key))?get(Number(key)):undefined,set:(_,key,v)=>{if(!set)throw new Error('Read-only U_INIT ABI');set(Number(key),v);return true;}});
export function createUInitBridge(layout){
 const states=new WeakMap();
 return (services,name,...args)=>{
  if(layout.pointerSize!==8||layout.longSize!==8||layout.timeSize!==8)throw new Error('Review U_INIT memory64/long/time ABI');
  const saved=services.stackSave();
  try{
   const env=Object.assign(Object.create(services),layout);
   const groupNames=Object.keys(fields);
   const typed=(group,at)=>{
    at=address(at);if(!at&&['obj','skill','trobj'].includes(group))return 0;
    const result={address:at};const gi=groupNames.indexOf(group);
    fields[group].forEach((key,i)=>Object.defineProperty(result,key,{get(){const v=services.get(gi,i,at);return pointerFields.has(group+'.'+key)?(key==='nobj'?typed('obj',v):address(v)):longFields.has(group+'.'+key)?BigInt(v):Number(v);},set(v){services.set(gi,i,at,raw(v));}}));
    return result;
   };
   const globalAddress=key=>services.address(["u", "u.uroleplay", "u.uz", "u.uz0", "u.utolev", "u.ualign", "ubirthday", "urealtime", "cg.zeroobj", "flags", "gn", "gl", "svm"].indexOf(key));
   const memberArray=kind=>indexed(i=>Number(services.arrayGet(kind,i)),(i,v)=>services.arraySet(kind,i,BigInt(v)));
   Object.assign(env,{object:at=>typed('obj',at),nextTrobj:t=>typed('trobj',address(t)+layout.trobjSize),nextSkill:t=>typed('skill',address(t)+layout.skillSize),
    globalAddress,youSize:layout.youSize,timeSize:layout.timeSize,realtimeSize:layout.realtimeSize,
    Role_if:role=>env.gu.urole.mnum===role,Race_if:race=>env.gu.urace.mnum===race,
    copyObj(obj){const at=services.stackAlloc(layout.objSize);services.memcpy(at,obj,layout.objSize);return typed('obj',at);},
    copyRoleplay(obj){const at=services.stackAlloc(layout.roleplaySize);services.memcpy(at,obj,layout.roleplaySize);return typed('roleplay',at);},
    copyLevel(dst,src){services.memcpy(dst,src,layout.levelSize);},
    localTrobj(rows){const at=services.stackAlloc(rows.length*layout.trobjSize);services.memset(at,0,rows.length*layout.trobjSize);rows.forEach((row,i)=>row.forEach((v,j)=>services.set(groupNames.indexOf('trobj'),j,at+i*layout.trobjSize,BigInt(v))));return typed('trobj',at);},
    nhUse(){},SPELL_LEV_PW:n=>services.spellPw(n),
    objects:indexed(i=>{const v=typed('objclass',services.element(0,i));Object.defineProperty(v,'index',{value:i});return v;}),
    OBJ_NAME:v=>services.objname(v.index),OBJ_DESCR:v=>services.objdescr(v.index),
    svb:{bases:memberArray(0)},svs:{spl_book:indexed(i=>({get sp_id(){return Number(services.arrayGet(1,i));},set sp_id(v){services.arraySet(1,i,BigInt(v));}}))},
    aligns:indexed(i=>({get value(){return Number(services.arrayGet(4,i));}})),
    cg:{zeroobj:typed('obj',globalAddress('cg.zeroobj'))},
    flags:typed('flags',globalAddress('flags')),gn:typed('gn',0),gl:typed('gl',0),svm:typed('svm',0),
    gu:{urole:{get mnum(){return Number(services.get(groupNames.indexOf('gu'),0,0));}},urace:{get mnum(){return Number(services.get(groupNames.indexOf('gu'),1,0));}}},
    gi:{get invent(){return typed('obj',services.invent());}},
   });
   env.u=typed('you',globalAddress('u'));
   Object.defineProperties(env.u,{uroleplay:{get:()=>typed('roleplay',globalAddress('u.uroleplay')),set:v=>services.memcpy(globalAddress('u.uroleplay'),v,layout.roleplaySize)},
    uz:{get:()=>typed('level',globalAddress('u.uz'))},uz0:{get:()=>typed('level',globalAddress('u.uz0'))},utolev:{get:()=>typed('level',globalAddress('u.utolev'))},
    ualign:{get:()=>typed('align',globalAddress('u.ualign'))},ualignbase:{value:memberArray(2)},ueninc:{value:memberArray(3)},weapon_skills:{value:indexed(i=>typed('weaponskill',services.element(1,i)))}});
   ['HJumping','HBlinded'].forEach((key,i)=>Object.defineProperty(env,key,{get:()=>BigInt(services.intrinsic(i)),set:v=>services.setIntrinsic(i,BigInt(v))}));
   Object.defineProperty(env,'Role_switch',{get:()=>env.gu.urole.mnum});Object.defineProperty(env,'Race_switch',{get:()=>env.gu.urace.mnum});
   for(const key of fields.globals){const obj=typed('globals',0);Object.defineProperty(env,key,{get:()=>obj[key],set:v=>{obj[key]=v;}});}
   ["uarms", "uwep", "uarmh", "uarmg", "uarmu", "uarmc", "uarmf", "uarm", "uquiver", "uswapwep"].forEach((key,i)=>Object.defineProperty(env,key,{get:()=>typed('obj',services.equipment(i))}));
   ["is_pole", "is_launcher", "is_ammo", "is_spear", "Is_container", "is_graystone", "is_shield", "is_helmet", "is_gloves", "is_shirt", "is_cloak", "is_boots", "is_suit", "is_weptool", "is_missile", "bimanual"].forEach((key,i)=>env[key]=obj=>services.macro(obj,i));
   for(const key of['FROMOUTSIDE','W_ARMS','W_ARMH','W_ARMG','W_ARMU','W_ARMC','W_ARMF','W_ARM'])env[key]=BigInt(layout[key]);
   for(const key of['mkobj','mksobj','addinv'])env[key]=(...values)=>typed('obj',services[key](...values));
   let state=states.get(services.moduleKey);
   if(!state){
    state={};
    tables.forEach((table,i)=>{
     const names=table.typ==='trobj'?fields.trobj:table.typ==='def_skill'?fields.skill:fields.invsub;
     const group=table.typ==='trobj'?'trobj':table.typ==='def_skill'?'skill':'invsub';
     const size=table.typ==='trobj'?layout.trobjSize:table.typ==='def_skill'?layout.skillSize:layout.invsubSize;
     const at=services.table(i);
     u_init[table.name].forEach((row,index)=>row.forEach((value,field)=>{const v=typeof value==='string'?layout[value]:value;if(v===undefined)throw new Error('Missing U_INIT constant '+value);services.set(groupNames.indexOf(group),field,at+index*size,BigInt(v));}));
     state[table.name]=at;
    });states.set(services.moduleKey,state);
   }
   tables.forEach(table=>{
    const group=table.typ==='trobj'?'trobj':table.typ==='def_skill'?'skill':'invsub';
    env[table.name]=table.typ==='inv_sub'?indexed(i=>typed(group,state[table.name]+i*layout.invsubSize)):typed(group,state[table.name]);
   });
   if(['ini_inv_use_obj'].includes(name))args[0]=typed('obj',args[0]);
   if(['ini_inv_obj_substitution','ini_inv_adjust_obj','ini_inv','trquan'].includes(name))args[0]=typed('trobj',args[0]);
   if(['ini_inv_obj_substitution','ini_inv_adjust_obj'].includes(name))args[1]=typed('obj',args[1]);
   return withCEnvironment(env,u_init[name],...args);
  }finally{services.stackRestore(saved);}
 };
}
