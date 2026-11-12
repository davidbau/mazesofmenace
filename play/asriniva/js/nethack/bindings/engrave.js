import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native fields/header macros only; all original engraving rules are engrave.js.
import * as core from '../../ported/engrave.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const tablesByModule=new WeakMap();
const environmentsByModule=new WeakMap();
export function createEngraveEnvironment(services,L){
 const address=value=>Number(value?.address??value??0),raw=value=>CAdapter.unsignedPointer(value);
 const view=()=>CAdapter.currentDataView(services),global=index=>address(services.global(index));
 const int=value=>CAdapter.signedInt(value,true),uint=value=>typeof value==='bigint'?Number(BigInt.asUintN(32,value)):Number(value)>>>0;
 const literal=value=>typeof value==='string'?services.literal(value):address(value);
 const scalar=(obj,key,at,type)=>Object.defineProperty(obj,key,{get:()=>view()['get'+type](at(),true),set:value=>view()['set'+type](at(),type.includes('Big')?BigInt(value):Number(value),true)});
 const pointer=at=>CAdapter.readPointerNumber(view,at);
 const ptr=(obj,key,at,wrap=value=>value)=>Object.defineProperty(obj,key,{get:()=>wrap(pointer(at())),set:value=>view().setBigUint64(at(),typeof value==='string'?BigInt(literal(value)):raw(value),true)});
 const array=(at,stride,wrap)=>new Proxy({address:at},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?wrap(at+Number(key)*stride):target[key]});
 const pointers=at=>new Proxy({address:at},{get:(target,key)=>typeof key==='string'&&/^\d+$/.test(key)?pointer(at+Number(key)*L.pointerSize):target[key],set(target,key,value){if(typeof key==='string'&&/^\d+$/.test(key))view().setBigUint64(at+Number(key)*L.pointerSize,raw(value),true);else target[key]=value;return true;}});
 const coord=at=>{const item={address:at};for(const key of ['x','y'])scalar(item,key,()=>at+L['coord_'+key],'Int16');return item;};
 const dlevel=at=>{const item={address:at};for(const key of ['dnum','dlevel'])scalar(item,key,()=>at+L['dlevel_'+key],'Int16');return item;};
 const object=value=>{const at=address(value);if(!at)return 0;const item={address:at};ptr(item,'nobj',()=>at+L.obj_nobj,object);for(const[key,type]of Object.entries({otyp:'Int16',oclass:'Int8',oartifact:'Int8',spe:'Int8',owornmask:'BigInt64',quan:'BigInt64'}))scalar(item,key,()=>at+L['obj_'+key],type);for(const[i,key]of ['cursed','known'].entries())Object.defineProperty(item,key,{get:()=>services.objectBit(at,i),set:value=>services.setObjectBit(at,i,value)});return item;};
 const permonst=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const[key,type]of Object.entries({mflags1:'BigUint64',mflags2:'BigUint64',msize:'Uint8',mlet:'Int8'}))scalar(item,key,()=>at+L['pm_'+key],type);return item;};
 const monster=value=>{const at=address(value);if(!at)return 0;const item={address:at};ptr(item,'data',()=>at+L.mon_data,permonst);return item;};
 const engr=value=>{const at=address(value);if(!at)return 0;const item={address:at,engr_txt:pointers(at+L.engr_engr_txt)};ptr(item,'nxt_engr',()=>at+L.engr_nxt_engr,engr);for(const[key,type]of Object.entries({engr_x:'Int16',engr_y:'Int16',engr_szeach:'Uint32',engr_alloc:'Uint32',engr_time:'BigInt64',engr_type:'Int8'}))scalar(item,key,()=>at+L['engr_'+key],type);for(const[i,key]of ['guardobjects','nowipeout','eread','erevealed'].entries())Object.defineProperty(item,key,{get:()=>services.engrBit(at,i),set:value=>services.setEngrBit(at,i,value)});return item;};
 const context=value=>{const at=address(value);if(!at)return 0;const item={address:at};for(const key of 'dengr doblind doknown eow jello ptext teleengr zapwand disprefresh frosted adding'.split(' '))scalar(item,key,()=>at+L['ctx_'+key],'Int8');for(const key of ['ret','type','oetype'])scalar(item,key,()=>at+L['ctx_'+key],'Int32');scalar(item,'len',()=>at+L.ctx_len,'BigUint64');ptr(item,'otmp',()=>at+L.ctx_otmp,object);ptr(item,'oep',()=>at+L.ctx_oep,engr);for(const key of ['writer','everb','eloc'])ptr(item,key,()=>at+L['ctx_'+key]);for(const key of ['buf','ebuf','fbuf','qbuf','post_engr_text'])Object.defineProperty(item,key,{get:()=>at+L['ctx_'+key]});return item;};
 const cell=(at,type)=>{const item={address:at};scalar(item,'value',()=>at,type);return item;};
 if(L.pointerSize!==8||L.longSize!==8||L.booleanSize!==1)throw Error('Review changed ENGRAVE ABI');
 let tables=tablesByModule.get(services.moduleKey);
 if(!tables){const base=address(services.storage(0));if(Number(services.storageSize(0))!==core.blind_writing.length*21)throw Error('Review ENGRAVE encoded row storage');for(let i=0;i<core.blind_writing.length;i++)services.heap().set(core.blind_writing[i],base+i*21);tables={rubouts:core.rubouts.map(row=>({wipefrom:row.wipefrom,wipeto:literal(row.wipeto)})),blind_writing:core.blind_writing.map((row,i)=>base+i*21)};tablesByModule.set(services.moduleKey,tables);}
 const env=Object.assign(Object.create(services),L,tables,{object,monster,permonst,engr,context,
  int,uint,char:value=>Number(BigInt.asIntN(8,BigInt(value))),short:value=>Number(BigInt.asIntN(16,BigInt(value))),long:value=>BigInt.asIntN(64,BigInt(value)),
  samePtr:(a,b)=>raw(a)===raw(b),ptrDiff:(a,b)=>BigInt.asIntN(64,raw(a)-raw(b)),charPointer:literal,
  loadChar:at=>new Int8Array(services.heap().buffer)[address(at)],storeChar:(at,value)=>{const b=Number(BigInt.asIntN(8,BigInt(value)));new Int8Array(services.heap().buffer)[address(at)]=b;return b;},
  min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,
  uintLocal:value=>{const at=services.stackAlloc(4),box=cell(at,'Uint32');if(value!==undefined)box.value=value;return box;},longPointer:at=>at?cell(address(at),'BigInt64'):0,
  nhfile:value=>{const at=address(value);if(!at)return 0;const item={address:at};scalar(item,'mode',()=>at+L.nhfile_mode,'Int32');return item;},
  newengr:size=>engr(services.alloc(uint(uint(size)+L.EngrSize))),dealloc_engr:ep=>services.free(ep),engr_text_space:ep=>address(ep)+L.EngrSize,
  callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
 });
 for(const key of Object.keys(L))if(/^(M[12]_|W_|LL_)/.test(key))env[key]=BigInt(L[key]);
 env.u={uz:dlevel(global(0)+L.u_uz),uconduct:{}};for(const key of ['ux','uy'])scalar(env.u,key,()=>global(0)+L['u_'+key],'Int16');for(const key of ['ustuck','usteed'])ptr(env.u,key,()=>global(0)+L['u_'+key],monster);for(const[i,key]of ['uswallow','uundetected'].entries())Object.defineProperty(env.u,key,{get:()=>services.heroBit(i)});scalar(env.u.uconduct,'literate',()=>global(0)+L.literate,'BigInt64');
 const property=index=>{const at=global(0)+L.u_uprops+index*L.propSize;return{intrinsic:view().getBigInt64(at+L.prop_intrinsic,true),extrinsic:view().getBigInt64(at+L.prop_extrinsic,true),blocked:view().getBigInt64(at+L.prop_blocked,true)};};
 for(const[name,key]of [['Blind','BLINDED'],['Deaf','DEAF'],['Levitation','LEVITATION'],['Flying','FLYING'],['Confusion','CONFUSION'],['Stunned','STUNNED'],['Hallucination','HALLUC']])Object.defineProperty(env,name,{get(){const p=property(L[key]);if(name==='Confusion'||name==='Stunned')return p.intrinsic;if(name==='Hallucination'){const r=property(L.HALLUC_RES);return Number(Boolean(p.intrinsic&&!r.intrinsic&&!r.extrinsic));}const source=p.intrinsic||p.extrinsic||(name==='Deaf'&&services.heroBit(2))||(name==='Flying'&&env.u.usteed&&(env.u.usteed.data.mflags1&BigInt(L.M1_FLY)));return Number(Boolean(source&&((name==='Deaf')||!p.blocked)));}});
 env.gy={youmonst:monster(global(7)+L.youmonst)};env.gi={};ptr(env.gi,'invent',()=>global(4)+L.invent,object);scalar(env.gi,'in_mklev',()=>global(4)+L.in_mklev,'Int8');env.svm={};scalar(env.svm,'moves',()=>global(1)+L.moves,'BigInt64');env.gm={};scalar(env.gm,'multi',()=>global(5)+L.multi,'BigInt64');env.gn={};ptr(env.gn,'nomovemsg',()=>global(6)+L.nomovemsg);env.flags={};scalar(env.flags,'verbose',()=>global(9)+L.verbose,'Int8');env.iflags={};scalar(env.iflags,'last_msg',()=>global(8)+L.last_msg,'Int32');
 env.svc={context:{engraving:{}}};const occupation=env.svc.context.engraving,at=global(2)+L.engraving;scalar(env.svc.context,'run',()=>global(2)+L.run,'Int32');Object.defineProperty(occupation,'text',{get:()=>at+L.occupation_text});ptr(occupation,'nextc',()=>at+L.occupation_nextc);ptr(occupation,'stylus',()=>at+L.occupation_stylus,object);scalar(occupation,'type',()=>at+L.occupation_type,'Int8');scalar(occupation,'actionct',()=>at+L.occupation_actionct,'Int32');occupation.pos=coord(at+L.occupation_pos);
 Object.defineProperty(env,'head_engr',{get:()=>engr(services.head()),set:value=>services.setHead(raw(value))});
 for(const[i,key]of ['uwep','uarms','ublindf'].entries())Object.defineProperty(env,key,{get:()=>object(services.equipment(i))});Object.defineProperty(env,'hands_obj',{get:()=>object(services.hands())});
 env.objects=array(global(11),L.objectClassSize,p=>{const item={address:p};for(const key of ['oc_skill','oc_armcat'])scalar(item,key,()=>p+L['cls_'+key],'Int8');for(const[i,key]of ['oc_name_known','oc_tough','oc_bimanual'].entries())Object.defineProperty(item,key,{get:()=>services.classBit(p,i)});return item;});env.mons=array(global(12),L.permonstSize,permonst);
 env.levl=array(global(3)+L.locations,L.ROWNO*L.rmSize,p=>array(p,L.rmSize,cell=>{const item={address:cell};scalar(item,'typ',()=>cell+L.rm_typ,'Int8');for(const[i,key]of ['disturbed','drawbridgemask'].entries())Object.defineProperty(item,key,{get:()=>services.terrainBit(cell,i),set:value=>services.setTerrainBit(cell,i,value)});return item;}));env.svl={level:{locations:env.levl}};
 for(const[i,key]of ['Something','Never_mind','vision_clears','ynqchars'].entries())Object.defineProperty(env,key,{get:()=>services.commonString(i)});
 for(const key of ['air_level','water_level'])env['Is_'+key.replace('_level','level')]=level=>{const target=dlevel(global(13)+L[key]);return Number(Boolean((target.dnum||target.dlevel)&&services.on_level(level,target)));};
 env.P_SKILL=index=>view().getInt16(global(0)+L.u_weapon_skills+index*L.skillSize+L.skill_skill,true);
 env.ACCESSIBLE=typ=>Number(typ>=L.DOOR);for(const[name,typ]of [['IS_ALTAR','ALTAR'],['IS_FOUNTAIN','FOUNTAIN'],['IS_GRAVE','GRAVE']])env[name]=value=>Number(value===L[typ]);env.IS_AIR=typ=>Number(typ===L.AIR||typ===L.CLOUD);env.SURFACE_AT=(x,y)=>{const cell=env.levl[x][y];return cell.typ===L.DRAWBRIDGE_UP?services.db_under_typ(cell.drawbridgemask):cell.typ;};
 for(const[name,field,mask]of [['is_animal','mflags1','M1_ANIMAL'],['is_demon','mflags2','M2_DEMON']])env[name]=pm=>Number(Boolean(pm[field]&BigInt(L[mask])));
 env.is_vampire=pm=>Number(pm.mlet===L.S_VAMPIRE);env.is_whirly=pm=>Number(pm.mlet===L.S_VORTEX||raw(pm)===raw(env.mons[L.PM_AIR_ELEMENTAL]));env.cantwield=pm=>Number(Boolean(pm.mflags1&BigInt(L.M1_NOHANDS))||pm.msize<L.MZ_SMALL);env.ceiling_hider=pm=>Number(Boolean((pm.mflags1&BigInt(L.M1_HIDE))&&(((pm.mflags1&BigInt(L.M1_CLING))&&pm.mlet!==L.S_MIMIC)||(pm.mflags1&BigInt(L.M1_FLY)))));
 env.bimanual=obj=>Number(Boolean((obj.oclass===L.WEAPON_CLASS||obj.oclass===L.TOOL_CLASS)&&env.objects[obj.otyp].oc_bimanual));env.is_blade=obj=>Number(obj.oclass===L.WEAPON_CLASS&&env.objects[obj.otyp].oc_skill>=L.P_DAGGER&&env.objects[obj.otyp].oc_skill<=L.P_SABER);env.is_boots=obj=>Number(obj.oclass===L.ARMOR_CLASS&&env.objects[obj.otyp].oc_armcat===L.ARM_BOOTS);env.is_wet_towel=obj=>Number(obj.otyp===L.TOWEL&&obj.spe>0);
 env.getobj=(prompt,fn,flags)=>{if(fn!==core.stylus_ok)throw Error('Unknown original ENGRAVE selector');return object(services.getobj(prompt,flags));};env.set_occupation=(fn,text,xtime)=>{if(fn!==core.engrave)throw Error('Unknown original ENGRAVE occupation');return services.set_occupation(text,xtime);};env.get_rnd_text=(file,out,rng,pad)=>{if(rng!==env.rn2)throw Error('Unknown original ENGRAVE random callback');return services.get_rnd_text(file,out,pad);};
 for(const key of ['splitobj','hold_another_object'])env[key]=(...args)=>object(services[key](...args));
 env.strcmpi=(a,b)=>services.strncmpi(a,b,-1);env.update_file=nhfp=>nhfp.mode&(L.COUNTING|L.WRITING);env.release_data=nhfp=>nhfp.mode&L.FREEING;
 env.pline1=text=>services.pline('%s',text);env.Your1=text=>services.Your('%s',text);
 return env;
}
export function callEngrave(services,layout,name,...args){
 let cached=environmentsByModule.get(services.moduleKey);
 if(!cached||cached.layout!==layout){cached={layout,env:createEngraveEnvironment(services,layout)};environmentsByModule.set(services.moduleKey,cached);}
 const env=cached.env,saved=services.stackSave();
 try{
  if(['stylus_ok'].includes(name))args[0]=env.object(args[0]);
  if(['engr_can_be_felt','del_engr','rloc_engr','see_engraving','feel_engraving'].includes(name))args[0]=env.engr(args[0]);
  if(['doengrave_ctx_init','doengrave_sfx_item_WAN','doengrave_sfx_item','doengrave_ctx_verb'].includes(name))args[0]=env.context(args[0]);
  if(['save_engravings','rest_engravings'].includes(name))args[0]=env.nhfile(args[0]);
  if(name==='engr_stats'){args[2]=env.longPointer(args[2]);args[3]=env.longPointer(args[3]);}
  const result=withCEnvironment(env,()=>core[name](...args));return result?.address??result;
 }finally{services.stackRestore(saved);}
}
