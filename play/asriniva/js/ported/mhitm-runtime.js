// Native field/pointer ABI and original header macros only; combat is mhitm.js.
import * as mhitm from './mhitm.js';
import { withCEnvironment } from './c-runtime.js';
export function createMhitmEnvironment(services,L) {
 const address=value=>Number(value?.address??value??0),raw=value=>BigInt.asUintN(64,BigInt(value?.address??value??0));
 const view=()=>new DataView(services.heap().buffer),global=i=>Number(services.global(i));
 const int=value=>typeof value==='bigint'?Number(BigInt.asIntN(32,value)):Number(value)|0;
 const scalar=(obj,key,at,type)=>Object.defineProperty(obj,key,{get:()=>view()['get'+type](at(),true),set:value=>view()['set'+type](at(),type.includes('Big')?BigInt(value):Number(value),true)});
 const pointer=at=>Number(view().getBigUint64(at,true));
 const ptrField=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{get:()=>wrap(pointer(at())),set:value=>view().setBigUint64(at(),raw(value),true)});
 const array=(at,stride,wrap)=>new Proxy({address:at},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?wrap(at+Number(key)*stride):target[key]});
 const intArray=at=>new Proxy({address:at},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?view().getInt32(at+Number(key)*4,true):target[key],set(target,key,value){if(typeof key==='string'&&/^\d+$/.test(key))view().setInt32(at+Number(key)*4,Number(value),true);else target[key]=value;return true;}});
 const attack=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const k of ['aatyp','adtyp','damn','damd'])scalar(item,k,()=>at+L['atk_'+k],'Uint8');return item;};
 const permonst=value=>{const at=address(value);if(!at)return 0;const item={address:at,mattk:array(at+L.pm_mattk,L.attackSize,attack)};for(const[k,type]of Object.entries({mlet:'Int8',msize:'Uint8',mflags1:'BigUint64',mflags2:'BigUint64',mlevel:'Int8',geno:'Uint16',pmidx:'Int32'}))scalar(item,k,()=>at+L['pm_'+k],type);return item;};
 const object=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const[k,type]of Object.entries({otyp:'Int16',oclass:'Int8',oartifact:'Int8',quan:'BigInt64'}))scalar(item,k,()=>at+L['obj_'+k],type);ptrField(item,'nobj',()=>at+L.obj_nobj,object);return item;};
 const monster=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const[k,type]of Object.entries({mhp:'Int32',mhpmax:'Int32',mx:'Int16',my:'Int16',movement:'Int16',mtame:'Int8',mstrategy:'BigUint64',mlstmv:'BigInt64',m_lev:'Uint8',m_id:'Uint32',weapon_check:'Int16',mspec_used:'Int32',meating:'Int32',cham:'Int16',m_ap_type:'Uint8',mstate:'BigInt64',misc_worn_check:'BigInt64'}))scalar(item,k,()=>at+L['mon_'+k],type);for(const[k,wrap]of [['nmon',monster],['data',permonst],['minvent',object],['mw',object]])ptrField(item,k,()=>at+L['mon_'+k],wrap);for(const[i,key]of ['mcan','mconf','mundetected','msleeping','mcanmove','wormno','mcansee','minvis','mleashed','mstun','mfrozen','mtrapped'].entries())Object.defineProperty(item,key,{get:()=>services.monsterBit(at,i),set:value=>services.setMonsterBit(at,i,value)});return item;};
 const record=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const[k,type]of Object.entries({damage:'Int32',hitflags:'Int32',done:'Int8',permdmg:'Int8',specialdmg:'Int32',dieroll:'Int32'}))scalar(item,k,()=>at+L['mhm_'+k],type);return item;};
 const coord=at=>{const item={address:at};for(const k of ['x','y'])scalar(item,k,()=>at+L['coord_'+k],'Int16');return item;};
 if(L.pointerSize!==8||L.longSize!==8||L.intSize!==4||L.booleanSize!==1)throw new Error('Review changed MHITM ABI');
 const env=Object.assign(Object.create(services),L,{monster,object,attack,permonst,
  int,char:value=>Number(BigInt.asIntN(8,BigInt(value))),long:value=>BigInt.asIntN(64,BigInt(value)),samePtr:(a,b)=>raw(a)===raw(b),
  min:Math.min,loadChar:ptr=>new Int8Array(services.heap().buffer)[address(ptr)],storeChar:(ptr,value)=>{const narrowed=Number(BigInt.asIntN(8,BigInt(value)));new Int8Array(services.heap().buffer)[address(ptr)]=narrowed;return narrowed;},
  attackLocal:()=>attack(services.stackAlloc(L.attackSize)),mhitmLocal:()=>record(services.stackAlloc(L.mhitmSize)),intArrayLocal:n=>intArray(services.stackAlloc(n*4)),
  fieldRef:(item,key)=>{if(key!=='hitflags')throw new Error('Unexpected MHITM addressable field');const at=address(item)+L.mhm_hitflags,box={address:at};scalar(box,'value',()=>at,'Int32');return box;},
  callLocal:(fn,...args)=>{const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
 });
 for(const name of Object.keys(L))if(/^(STRAT_|W_|M[12]_)/.test(name))env[name]=BigInt(L[name]);
 env.u={};for(const k of ['ux','uy'])scalar(env.u,k,()=>global(0)+L['u_'+k],'Int16');for(const k of ['ulycn','umonnum'])scalar(env.u,k,()=>global(0)+L['u_'+k],'Int32');for(const k of ['usteed','ustuck'])ptrField(env.u,k,()=>global(0)+L['u_'+k],monster);Object.defineProperty(env.u,'uswallow',{get:()=>services.heroBit(0)});
 const property=index=>{const at=global(0)+L.u_uprops+index*L.propSize;return{intrinsic:view().getBigInt64(at+L.prop_intrinsic,true),extrinsic:view().getBigInt64(at+L.prop_extrinsic,true),blocked:view().getBigInt64(at+L.prop_blocked,true)};};
 for(const[name,index]of [['Deaf','DEAF'],['Conflict','CONFLICT'],['Antimagic','ANTIMAGIC'],['Unchanging','UNCHANGING'],['Passes_walls','PASSES_WALLS'],['Blind','BLINDED']])Object.defineProperty(env,name,{get(){const p=property(L[index]);return Number(Boolean((p.intrinsic||p.extrinsic||(name==='Deaf'&&services.heroBit(1)))&&(name!=='Blind'||!p.blocked)));}});
 const addScalar=(target,field,glob,key,type)=>{env[target]??={};scalar(env[target],field,()=>global(glob)+L[key],type);};
 for(const[target,field,glob,key,type]of [['gf','far_noise',1,'far_noise','Int8'],['svm','moves',2,'moves','BigInt64'],['gn','noisetime',3,'noisetime','BigInt64'],['gn','notonhead',3,'notonhead','Int8'],['gv','vis',4,'vis','Int8'],['gs','skipdrin',6,'skipdrin','Int8'],['gl','last_hider',7,'last_hider','Uint32'],['iflags','last_msg',8,'last_msg','Int32'],['flags','verbose',9,'verbose','Int8'],['gm','multi',11,'multi','BigInt64'],['gm','mkcorpstat_norevive',11,'norevive','Int8'],['gz','zombify',12,'zombify','Int8']])addScalar(target,field,glob,key,type);
 env.gb={bhitpos:coord(global(5)+L.bhitpos)};env.gy={youmonst:monster(global(10)+L.youmonst)};ptrField(env.gm,'mswallower',()=>global(11)+L.mswallower,monster);
 Object.defineProperties(env,{Unaware:{get:()=>Number(env.gm.multi<0n&&(services.unconscious()||services.is_fainted()))},fmon:{get:()=>monster(pointer(global(15)+L.fmon))},something:{get:()=>services.commonString(0)},nothing_happens:{get:()=>services.commonString(1)}});
 env.mons=array(global(13),L.permonstSize,permonst);env.objects=array(global(14),L.objectClassSize,at=>({address:at,get oc_material(){return services.classMaterial(at);},get oc_skill(){return view().getInt8(at+L.cls_oc_skill);}}));
 env.levl=array(global(15)+L.locations,L.ROWNO*L.rmSize,at=>array(at,L.rmSize,cell=>({address:cell,get typ(){return view().getInt8(cell+L.rm_typ);}})));
 const gridAt=(x,y)=>global(15)+L.monsters+(x*L.ROWNO+y)*L.pointerSize;
 env.m_at=(x,y)=>monster(pointer(gridAt(x,y)));env.remove_monster=(x,y)=>view().setBigUint64(gridAt(x,y),0n,true);
 env.cansee=(x,y)=>Number(Boolean(services.heap()[pointer(pointer(global(4)+L.vizArray)+y*L.pointerSize)+x]&L.IN_SIGHT));
 env.canspotmon=mon=>Number(Boolean(services.canseemon(mon)||services.sensemon(mon)));
 env.mdistu=mon=>services.dist2(mon.mx,mon.my,env.u.ux,env.u.uy);
 env.mhis=mon=>pointer(global(16)+services.pronoun_gender(mon,L.PRONOUN_HALLU)*L.genderSize+L.gender_his);
 env.M_AP_TYPE=mon=>mon.m_ap_type&L.M_AP_TYPMASK;env.MON_WEP=mon=>mon.mw;env.DEADMONSTER=mon=>Number(mon.mhp<1);env.helpless=mon=>Number(Boolean(mon.msleeping||!mon.mcanmove));env.engulfing_u=mon=>Number(Boolean(env.u.uswallow&&raw(env.u.ustuck)===raw(mon)));env.mon_offmap=mon=>Number(mon.mstate!==BigInt(L.MON_FLOOR));env.monsndx=pm=>pm.pmidx;env.ismnum=idx=>Number(idx>=L.LOW_PM&&idx<L.NUMMONS);
 for(const[name,field,mask]of [['unsolid','mflags1','M1_UNSOLID'],['amorphous','mflags1','M1_AMORPHOUS'],['passes_walls','mflags1','M1_WALLWALK'],['can_teleport','mflags1','M1_TPORT'],['perceives','mflags1','M1_SEE_INVIS'],['is_elf','mflags2','M2_ELF'],['is_orc','mflags2','M2_ORC']])env[name]=pm=>Number(Boolean(pm[field]&BigInt(L[mask])));
 env.haseyes=pm=>Number(!(pm.mflags1&BigInt(L.M1_NOEYES)));env.noncorporeal=pm=>Number(pm.mlet===L.S_GHOST);
 const oneOf=(pm,names)=>names.some(name=>raw(pm)===raw(env.mons[L[name]]));
 env.touch_petrifies=pm=>Number(oneOf(pm,['PM_COCKATRICE','PM_CHICKATRICE']));
 env.is_rider=pm=>Number(oneOf(pm,['PM_DEATH','PM_FAMINE','PM_PESTILENCE']));
 env.is_whirly=pm=>Number(pm.mlet===L.S_VORTEX||oneOf(pm,['PM_AIR_ELEMENTAL']));env.flaming=pm=>Number(oneOf(pm,['PM_FIRE_VORTEX','PM_FLAMING_SPHERE','PM_FIRE_ELEMENTAL','PM_SALAMANDER']));
 env.slimeproof=pm=>Number(oneOf(pm,['PM_GREEN_SLIME'])||env.flaming(pm)||env.noncorporeal(pm));
 env.digests=pm=>Number(Boolean(services.dmgtype_fromattack(pm,L.AD_DGST,L.AT_ENGL)));env.enfolds=pm=>Number(Boolean(services.dmgtype_fromattack(pm,L.AD_WRAP,L.AT_ENGL)));
 env.is_vampshifter=mon=>Number([L.PM_VAMPIRE,L.PM_VAMPIRE_LEADER,L.PM_VLAD_THE_IMPALER].includes(mon.cham));
 env.IS_OBSTRUCTED=typ=>Number(typ<L.POOL);env.IS_TREE=typ=>Number(typ===L.TREE||(services.arboreal()&&typ===L.STONE));
 for(const[name,res]of [['resists_ston','STONE_RES'],['resists_sleep','SLEEP_RES'],['resists_acid','ACID_RES'],['resists_cold','COLD_RES'],['resists_fire','FIRE_RES'],['resists_elec','SHOCK_RES']])env[name]=mon=>services.Resists_Elem(mon,L[res]);
 env.is_pole=obj=>Number((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.TOOL_CLASS)&&(env.objects[obj.otyp].oc_skill===L.P_POLEARMS||env.objects[obj.otyp].oc_skill===L.P_LANCE||services.is_art(obj,L.ART_SNICKERSNEE)));
 for(const name of ['getmattk'])env[name]=(...args)=>attack(services[name](...args));
 env.clone_mon=(...args)=>monster(services.clone_mon(...args));
 env.troll_baned=(mon,obj)=>Number(Boolean(mon.data.mlet===L.S_TROLL&&obj&&obj.oartifact===L.ART_TROLLSBANE));
 env.strcmpi=(a,b)=>services.strncmpi(a,b,-1);env.pline1=text=>services.pline('%s',text);
 return env;
}
export function callMhitm(services,layout,name,...args){
 const env=createMhitmEnvironment(services,layout),saved=services.stackSave();
 try{
  if(name!=='attk_protection')args[0]=env.monster(args[0]);
  if(['pre_mm_attack','missmm','mdisplacem','mattackm','failed_grab','hitmm','gazemm','engulf_target','gulpmm','explmm','mdamagem','mon_poly','mswingsm','passivemm'].includes(name))args[1]=env.monster(args[1]);
  if(name==='noises')args[1]=env.attack(args[1]);
  if(['missmm','failed_grab','hitmm','gazemm','gulpmm','explmm','mdamagem'].includes(name))args[2]=env.attack(args[2]);
  if(['hitmm','mdamagem'].includes(name))args[3]=env.object(args[3]);
  if(name==='rustm')args[1]=env.object(args[1]);if(name==='mswingsm')args[2]=env.object(args[2]);if(name==='passivemm')args[4]=env.object(args[4]);
  return withCEnvironment(env,()=>mhitm[name](...args));
 }finally{services.stackRestore(saved);}
}
