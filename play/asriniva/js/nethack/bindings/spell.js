import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Native layouts, C header expressions and address/lifetime adapters only.
import * as core from '../../ported/spell.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const states=new WeakMap();
export function createSpellState(L){return{save_tport:{savespell:{bytes:new Uint8Array(L.spellSize)},tport_indx:0}};}
export function createSpellEnvironment(services,L,state){
 const raw=v=>CAdapter.unsignedPointer(v),address=v=>Number(raw(v)),global=i=>address(services.global(i)),view=()=>CAdapter.currentDataView(services),literal=v=>typeof v==='string'?services.literal(v):address(v);
 const int=v=>CAdapter.signedInt(v,true),long=v=>BigInt.asIntN(64,BigInt(v));
 const scalar=(o,k,at,type)=>Object.defineProperty(o,k,{enumerable:true,get:()=>view()['get'+type](at(),true),set:v=>view()['set'+type](at(),type.includes('Big')?BigInt(v):Number(v),true)});
 const ptr=(o,k,at,wrap=v=>Number(v))=>Object.defineProperty(o,k,{enumerable:true,get:()=>wrap(view().getBigUint64(at(),true)),set:v=>view().setBigUint64(at(),raw(typeof v==='string'?literal(v):v),true)});
 const bytes=(v,n)=>v.bytes??services.heap().slice(address(v),address(v)+n);
 const copy=(dst,src,n)=>{const b=bytes(src,n);if(dst.bytes)dst.bytes.set(b);else services.heap().set(b,address(dst));};
 const array=(at,stride,wrap,set)=>new Proxy({address:at},{get:(o,k)=>k==='address'?at:/^\d+$/.test(String(k))?wrap(at+Number(k)*stride):o[k],set:(o,k,v)=>{if(set&&/^\d+$/.test(String(k))){set(at+Number(k)*stride,v);return true;}o[k]=v;return true;}});
 const basic=p=>({address:raw(p)>BigInt(Number.MAX_SAFE_INTEGER)?raw(p):address(p)});
 const monster=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  ptr(out,'nmon',()=>at+L.mon_nmon,monster);
  ptr(out,'data',()=>at+L.mon_data,permonst);
  scalar(out,'mx',()=>at+L.mon_mx,'Int16');
  scalar(out,'my',()=>at+L.mon_my,'Int16');
  scalar(out,'mhp',()=>at+L.mon_mhp,'Int32');
  scalar(out,'mintrinsics',()=>at+L.mon_mintrinsics,'Uint16');
  scalar(out,'mextrinsics',()=>at+L.mon_mextrinsics,'Uint16');
  scalar(out,'mtame',()=>at+L.mon_mtame,'Int8');
  scalar(out,'cham',()=>at+L.mon_cham,'Int16');
  Object.defineProperty(out,'mpeaceful',{get:()=>services.monsterBit(at,0),set:v=>services.setMonsterBit(at,0,Number(v))});
  return out;};
 const object=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  ptr(out,'nobj',()=>at+L.obj_nobj,object);
  scalar(out,'otyp',()=>at+L.obj_otyp,'Int16');
  scalar(out,'o_id',()=>at+L.obj_o_id,'Uint32');
  scalar(out,'spe',()=>at+L.obj_spe,'Int8');
  scalar(out,'spestudied',()=>at+L.obj_spestudied,'Int32');
  scalar(out,'novelidx',()=>at+L.obj_novelidx,'Int32');
  scalar(out,'quan',()=>at+L.obj_quan,'BigInt64');
  scalar(out,'age',()=>at+L.obj_age,'BigInt64');
  Object.defineProperty(out,'in_use',{get:()=>services.objectBit(at,0),set:v=>services.setObjectBit(at,0,Number(v))});
  Object.defineProperty(out,'blessed',{get:()=>services.objectBit(at,1),set:v=>services.setObjectBit(at,1,Number(v))});
  Object.defineProperty(out,'cursed',{get:()=>services.objectBit(at,2),set:v=>services.setObjectBit(at,2,Number(v))});
  Object.defineProperty(out,'known',{get:()=>services.objectBit(at,3),set:v=>services.setObjectBit(at,3,Number(v))});
  Object.defineProperty(out,'lamplit',{get:()=>services.objectBit(at,4),set:v=>services.setObjectBit(at,4,Number(v))});
  return out;};
 const permonst=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'mflags1',()=>at+L.pm_mflags1,'BigUint64');
  scalar(out,'mflags2',()=>at+L.pm_mflags2,'BigUint64');
  scalar(out,'mlet',()=>at+L.pm_mlet,'Int8');
  scalar(out,'maligntyp',()=>at+L.pm_maligntyp,'Int8');
  scalar(out,'pmidx',()=>at+L.pm_pmidx,'Int32');
  return out;};
 const objectClass=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'oc_level',()=>at+L.cls_oc_level,'Int8');
  scalar(out,'oc_delay',()=>at+L.cls_oc_delay,'Int8');
  scalar(out,'oc_skill',()=>at+L.cls_oc_skill,'Int8');
  scalar(out,'oc_name_idx',()=>at+L.cls_oc_name_idx,'Int16');
  scalar(out,'oc_weight',()=>at+L.cls_oc_weight,'Uint32');
  Object.defineProperty(out,'oc_name_known',{get:()=>services.classBit(at,0),set:v=>services.setClassBit(at,0,Number(v))});
  Object.defineProperty(out,'oc_dir',{get:()=>services.classBit(at,1),set:v=>services.setClassBit(at,1,Number(v))});
  Object.defineProperty(out,'oc_material',{get:()=>services.classBit(at,2),set:v=>services.setClassBit(at,2,Number(v))});
  return out;};
 const coord=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'x',()=>at+L.coord_x,'Int16');
  scalar(out,'y',()=>at+L.coord_y,'Int16');
  return out;};
 const rm=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'typ',()=>at+L.rm_typ,'Int8');
  Object.defineProperty(out,'doormask',{get:()=>services.terrainBit(at,0),set:v=>services.setTerrainBit(at,0,Number(v))});
  return out;};
 const spell=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'sp_id',()=>at+L.spell_sp_id,'Int16');
  scalar(out,'sp_lev',()=>at+L.spell_sp_lev,'Int16');
  scalar(out,'sp_know',()=>at+L.spell_sp_know,'Int32');
  return out;};
 const command=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'typ',()=>at+L.cmd_typ,'Int32');
  scalar(out,'key',()=>at+L.cmd_key,'Int8');
  return out;};
 const anything=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'a_int',()=>at+L.any_a_int,'Int32');
  return out;};
 const role=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'mnum',()=>at+L.role_mnum,'Int16');
  scalar(out,'spelbase',()=>at+L.role_spelbase,'Int32');
  scalar(out,'spelheal',()=>at+L.role_spelheal,'Int32');
  scalar(out,'spelshld',()=>at+L.role_spelshld,'Int32');
  scalar(out,'spelarmr',()=>at+L.role_spelarmr,'Int32');
  scalar(out,'spelstat',()=>at+L.role_spelstat,'Int32');
  scalar(out,'spelspec',()=>at+L.role_spelspec,'Int32');
  scalar(out,'spelsbon',()=>at+L.role_spelsbon,'Int32');
  return out;};
 const skill=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'skill',()=>at+L.skill_skill,'Int16');
  return out;};
 const dlevel=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'dnum',()=>at+L.dlevel_dnum,'Int16');
  scalar(out,'dlevel',()=>at+L.dlevel_dlevel,'Int16');
  return out;};
 const align=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'type',()=>at+L.align_type,'Int8');
  return out;};
 const gender=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  ptr(out,'him',()=>at+L.gender_him,v=>Number(v));
  return out;};
 const objdescr=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  ptr(out,'oc_name',()=>at+L.descr_oc_name,v=>Number(v));
  return out;};
 const zap=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'dir',()=>at+L.zap_dir,'Uint8');
  scalar(out,'x',()=>at+L.zap_x,'Int16');
  scalar(out,'y',()=>at+L.zap_y,'Int16');
  scalar(out,'strength',()=>at+L.zap_strength,'Int8');
  return out;};
 const queue=p=>{if(!raw(p))return 0;const out=basic(p),at=address(p);
  scalar(out,'head',()=>at+L.queue_head,'Int32');
  scalar(out,'tail',()=>at+L.queue_tail,'Int32');
  scalar(out,'displayed_beam',()=>at+L.queue_displayed_beam,'Int32');
  out.q=array(at+L.queue_q,L.zapSize,zap,(p,v)=>copy(p,v,L.zapSize));
  return out;};
 const env=Object.assign(Object.create(services),L,{object,monster,permonst,coord,spell,zap,queue,command,role,dlevel,rm,anything,charPointer:literal,literal,int,long,short:v=>Number(BigInt.asIntN(16,BigInt(v))),char:v=>Number(BigInt.asIntN(8,BigInt(v))),uchar:v=>Number(BigInt.asUintN(8,BigInt(v))),uint:v=>Number(BigInt.asUintN(32,BigInt(v))),boolean:v=>Number(BigInt.asIntN(8,BigInt(v))),coordxy:v=>Number(BigInt.asIntN(16,BigInt(v))),samePtr:(a,b)=>raw(a)===raw(b),ptrLess:(a,b)=>raw(a)<raw(b),
  loadInt:p=>view().getInt32(address(p),true),storeChar:(p,v)=>{const b=Number(BigInt.asIntN(8,BigInt(v)));view().setInt8(address(p),b);return b;},callLocal:(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);},
 });
 for(const k of Object.keys(L))if(/^(M[12]_|TIMEOUT|LL_)/.test(k))env[k]=BigInt(L[k]);
 const local=(size,v,type)=>{const at=services.stackAlloc(size),o={address:at};scalar(o,'value',()=>at,type);o.value=v;return o;};
 env.intLocal=(v=0)=>local(4,v,'Int32');env.intPointer=p=>{if(!raw(p))return 0;const o=basic(p);scalar(o,'value',()=>address(p),'Int32');return o;};
 env.intField=(o,k)=>env.intPointer(address(o)+L['obj_'+k]);
 env.objectPointerLocal=(v=0)=>{const at=services.stackAlloc(8),out={address:at};ptr(out,'value',()=>at,object);out.value=v;return out;};
 env.coordLocal=()=>coord(services.stackAlloc(L.coordSize));env.spellLocal=()=>spell(services.stackAlloc(L.spellSize));env.chainZapCopy=v=>{const out=zap(services.stackAlloc(L.zapSize));copy(out,v,L.zapSize);return out;};env.chainZapLocal=(dir,x,y,strength)=>{const out=zap(services.stackAlloc(L.zapSize));out.dir=dir;out.x=x;out.y=y;out.strength=strength;return out;};env.chainQueueLocal=()=>{const at=services.stackAlloc(L.queueSize);services.heap().fill(0,at,at+L.queueSize);return queue(at);};env.spellArrayLocal=n=>array(services.stackAlloc(n*L.spellSize),L.spellSize,spell,(p,v)=>copy(p,v,L.spellSize));env.copySpell=(a,b)=>copy(a,b,L.spellSize);env.copyAnything=(a,b)=>copy(a,b,L.anythingSize);env.anyLocal=()=>anything(services.stackAlloc(L.anythingSize));env.commandCopy=c=>{const out=command(services.stackAlloc(L.commandSize));copy(out,c,L.commandSize);return out;};
 const menu=p=>{if(!raw(p))return 0;return{address:address(p),item:anything(address(p)+L.menu_item)};};env.menuPointerLocal=()=>{const at=services.stackAlloc(8),o={address:at};ptr(o,'value',()=>at,p=>raw(p)?array(address(p),L.menuSize,menu):0);o.value=0;return o;};
 env.spellState=state;
 env.u=basic(global(0));for(const[k,kind]of Object.entries({ux:'Int16',uy:'Int16',dx:'Int32',dy:'Int32',dz:'Int32',ulevel:'Int32',umonnum:'Int32',umonster:'Int32',uen:'Int32',uenmax:'Int32',uenpeak:'Int32',uhunger:'Int32',uac:'Int8',uspellprot:'Uint8',uspmtime:'Uint8',usptime:'Uint8',udg_cnt:'Uint32'}))scalar(env.u,k,()=>global(0)+L['u_'+k],kind);ptr(env.u,'ustuck',()=>global(0)+L.u_ustuck,monster);env.u.ualign=align(global(0)+L.u_ualign);env.u.uz=dlevel(global(0)+L.u_uz);env.u.uconduct={};scalar(env.u.uconduct,'literate',()=>global(0)+L.literate,'BigInt64');env.u.uhave={};env.u.uevent={};env.u.uroleplay={};
 const heroKeys={'uhave.bell':0,'uhave.menorah':1,'uhave.amulet':2,'uevent.invoked':3,'uevent.udemigod':4,'uevent.read_tribute':5,'uroleplay.pauper':6,uswallow:7,uinwater:8};for(const[group,keys]of [['uhave',['bell','menorah','amulet']],['uevent',['invoked','udemigod','read_tribute']],['uroleplay',['pauper']]])for(const k of keys)Object.defineProperty(env.u[group],k,{get:()=>services.heroBit(heroKeys[group+'.'+k]),set:v=>services.setHeroBit(heroKeys[group+'.'+k],Number(v))});for(const k of ['uswallow','uinwater'])Object.defineProperty(env.u,k,{get:()=>services.heroBit(heroKeys[k])});
 env.gy={youmonst:monster(global(1)+L.youmonst)};env.svc={context:{spbook:{}}};ptr(env.svc.context.spbook,'book',()=>global(2)+L.book,object);scalar(env.svc.context.spbook,'o_id',()=>global(2)+L.book_oid,'Uint32');scalar(env.svc.context.spbook,'delay',()=>global(2)+L.book_delay,'Int8');scalar(env.svc.context,'forcefight',()=>global(2)+L.forcefight,'Int8');env.go={};ptr(env.go,'occupation',()=>global(3)+L.occupation,v=>BigInt(v));env.gm={};scalar(env.gm,'multi',()=>global(4)+L.multi,'BigInt64');ptr(env.gm,'multi_reason',()=>global(4)+L.multi_reason);env.gn={};ptr(env.gn,'nomovemsg',()=>global(5)+L.nomovemsg);scalar(env.gn,'notonhead',()=>global(5)+L.notonhead,'Int8');env.gi={};ptr(env.gi,'invent',()=>global(6)+L.invent,object);env.svm={};scalar(env.svm,'moves',()=>global(7)+L.moves,'BigInt64');env.svs={spl_book:array(global(8)+L.spl_book,L.spellSize,spell,(p,v)=>copy(p,v,L.spellSize))};env.gs={};scalar(env.gs,'spl_sortmode',()=>global(9)+L.spl_sortmode,'Int32');ptr(env.gs,'spl_orderindx',()=>global(9)+L.spl_orderindx,p=>raw(p)?array(address(p),4,p=>view().getInt32(p,true),(p,v)=>view().setInt32(p,int(v),true)):0);env.svb={bases:array(global(10)+L.bases,4,p=>view().getInt32(p,true))};env.gu={urole:role(global(11)+L.you_role)};env.gb={bhitpos:coord(global(12)+L.bhitpos)};env.cg={zeroany:anything(global(13)+L.zeroany)};env.flags={};scalar(env.flags,'menu_style',()=>global(14)+L.menu_style,'Int8');env.iflags={};scalar(env.iflags,'menu_tab_sep',()=>global(15)+L.menu_tab_sep,'Int8');env.disp={};scalar(env.disp,'botl',()=>global(16)+L.botl,'Int8');
 env.mons=array(global(17),L.permonstSize,permonst);env.objects=array(global(18),L.objectClassSize,objectClass);const desc=array(global(19),L.objdescrSize,objdescr);env.OBJ_NAME=o=>desc[o.oc_name_idx].oc_name;
 env.levl=array(global(20)+L.locations,L.ROWNO*L.rmSize,p=>array(p,L.rmSize,rm));env.m_at=(x,y)=>{const at=global(20)+L.monsters+(x*L.ROWNO+y)*8;return monster(view().getBigUint64(at,true));};env.cansee=(x,y)=>{const rows=Number(view().getBigUint64(global(21)+L.vizArray,true));const row=Number(view().getBigUint64(rows+y*8,true));return Number(Boolean(view().getUint8(row+x)&L.IN_SIGHT));};Object.defineProperty(env,'wizard',{get:()=>view().getInt8(global(14)+L.wizard)});
 const prop=i=>{const at=global(0)+L.u_uprops+i*L.propSize;return{intrinsic:view().getBigInt64(at+L.prop_intrinsic,true),extrinsic:view().getBigInt64(at+L.prop_extrinsic,true),blocked:view().getBigInt64(at+L.prop_blocked,true)};};
 for(const[n,key]of [['Blind','BLINDED'],['Confusion','CONFUSION'],['Stunned','STUNNED'],['Poison_resistance','POISON_RES'],['Antimagic','ANTIMAGIC'],['Sleep_resistance','SLEEP_RES'],['Hallucination','HALLUC'],['Sick','SICK'],['Slimed','SLIMED'],['Half_physical_damage','HALF_PHDAM']])Object.defineProperty(env,n,{get(){const p=prop(L[key]);if(n==='Confusion'||n==='Stunned'||n==='Sick'||n==='Slimed')return p.intrinsic;if(n==='Hallucination'){const r=prop(L.HALLUC_RES);return Number(Boolean(p.intrinsic&&!r.intrinsic&&!r.extrinsic));}return Number(Boolean((p.intrinsic||p.extrinsic)&&(n!=='Blind'||!p.blocked)));}});
 Object.defineProperty(env,'HStun',{get:()=>prop(L.STUNNED).intrinsic});Object.defineProperty(env,'HConfusion',{get:()=>prop(L.CONFUSION).intrinsic});Object.defineProperty(env,'BlindedTimeout',{get:()=>prop(L.BLINDED).intrinsic&BigInt(L.TIMEOUT)});Object.defineProperty(env,'BClairvoyant',{get:()=>prop(L.CLAIRVOYANT).blocked});
 for(const[i,n]of ['uwep','uarm','uarmc','uarmh','uarmg','uarmf','uarms','ublindf'].entries())Object.defineProperty(env,n,{get:()=>object(services.equipment(i))});for(const[i,n]of ['Never_mind','nothing_happens','something','quitchars','NH_GOLDEN','ynchars'].entries())Object.defineProperty(env,n,{get:()=>services.commonString(i)});Object.defineProperty(env,'nul_glyphinfo',{get:()=>services.nulGlyphInfo()});Object.defineProperty(env,'WIN_MESSAGE',{get:()=>services.winMessage()});env.xdir=array(global(22),1,p=>view().getInt8(p));env.ydir=array(global(23),1,p=>view().getInt8(p));
 env.P_SKILL=i=>skill(global(0)+L.u_weapon_skills+i*L.skillSize).skill;env.y_n=q=>services.yn_function(q,env.ynchars,110,1);env.Role_if=p=>Number(env.gu.urole.mnum===p);env.ACURR=services.acurr;env.makeknown=n=>services.discover_object(n,1,1,1);env.pline1=t=>services.pline('%s',t);env.resists_elec=m=>services.Resists_Elem(m,L.SHOCK_RES);env.canspotmon=m=>Number(Boolean(services.canseemon(m)||services.sensemon(m)));env.mdistu=m=>services.dist2(m.mx,m.my,env.u.ux,env.u.uy);env.u_at=(x,y)=>Number(x===env.u.ux&&y===env.u.uy);env.DEADMONSTER=m=>Number(m.mhp<1);env.DIR_LEFT=n=>(n+7)%L.N_DIRS;env.DIR_RIGHT2=n=>(n+2)%L.N_DIRS;env.BZ_U_SPELL=n=>10+n;env.SPELL_LEV_PW=n=>n*5;env.max=(a,b)=>a>b?a:b;env.min=(a,b)=>a<b?a:b;env.nhUse=v=>v;env.SPACE_POS=n=>Number(n>L.DOOR);env.ZAP_POS=n=>Number(n>=L.POOL);env.IS_DOOR=n=>Number(n===L.DOOR);env.IS_STWALL=n=>Number(n<=L.DBWALL);env.IS_TREE=n=>Number(n===L.TREE);env.is_undead=p=>Number(Boolean(p.mflags2&BigInt(L.M2_UNDEAD)));env.is_animal=p=>Number(Boolean(p.mflags1&BigInt(L.M1_ANIMAL)));env.is_whirly=p=>Number(p.mlet===L.S_VORTEX||raw(p)===raw(env.mons[L.PM_AIR_ELEMENTAL]));env.enfolds=p=>Number(Boolean(services.dmgtype_fromattack(p,L.AD_WRAP,L.AT_ENGL)));env.is_vampshifter=m=>Number([L.PM_VAMPIRE,L.PM_VAMPIRE_LEADER,L.PM_VLAD_THE_IMPALER].includes(m.cham));env.is_metallic=o=>{const mat=services.classBit(raw(env.objects[o.otyp]),2);return Number(mat>=L.IRON&&mat<=L.MITHRIL);};env.eyecount=p=>(p.mflags1&BigInt(L.M1_NOEYES))?0:raw(p)===raw(env.mons[L.PM_CYCLOPS])||raw(p)===raw(env.mons[L.PM_FLOATING_EYE])?1:2;
 env.Is_waterlevel=level=>{const target=dlevel(global(24)+L.water_level);return Number(Boolean((target.dnum||target.dlevel)&&services.on_level(level,target)));};env.uhim=()=>gender(global(25)+(view().getInt8(global(14)+L.female)?1:0)*L.genderSize).him;
 env.cmdq_pop=()=>command(services.cmdq_pop());env.makemon=(...a)=>monster(services.makemon(...a));env.mksobj=(...a)=>object(services.mksobj(...a));
 env.sameFunction=(token,fn)=>raw(token)===(fn===core.learn?raw(services.callbackPointer(0)):raw(fn));env.set_occupation=(fn,text,time)=>{if(fn!==core.learn)throw Error('Unknown SPELL occupation');return services.set_occupation(services.callbackPointer(0),text,time);};env.iter_mons=fn=>{if(fn!==core.deadbook_pacify_undead)throw Error('Unknown SPELL monster callback');return services.iter_mons();};env.qsort=(base,n,size,fn)=>{if(fn!==core.spell_cmp)throw Error('Unknown SPELL comparator');return services.qsort(base,n,size);};env.getpos_sethilite=(a,b)=>{if(a!==core.display_spell_target_positions||b!==core.can_center_spell_location)throw Error('Unknown SPELL target callbacks');return services.getpos_sethilite();};env.walk_path=(a,b,fn,arg)=>{if(fn!==core.spell_aim_step)throw Error('Unknown SPELL aim callback');return services.walk_path(a,b,arg);};
 return env;
}
const cachedEnvironments=new WeakMap();
function environmentForCall(services,layout,state){
 let layouts=cachedEnvironments.get(services.moduleKey);
 if(!layouts){layouts=new WeakMap();cachedEnvironments.set(services.moduleKey,layouts);}
 let entry=layouts.get(layout);
 if(!entry){
  entry={active:services};
  const methods=new Map();
  const forwarding=new Proxy({}, {
   get(_target,key){
    const value=Reflect.get(entry.active,key,entry.active);
    if(typeof value!=='function')return value;
    let method=methods.get(key);
    if(!method){method=(...args)=>Reflect.apply(Reflect.get(entry.active,key,entry.active),entry.active,args);methods.set(key,method);}
    return method;
   },
   has:(_target,key)=>Reflect.has(entry.active,key),
  });
  entry.environment=createSpellEnvironment(forwarding,layout,state);
  layouts.set(layout,entry);
 }
 return entry;
}
export function callSpell(services,L,name,...args){const saved=services.stackSave();let entry,previous;try{let state=states.get(services.moduleKey);if(!state)states.set(services.moduleKey,state=createSpellState(L));entry=environmentForCall(services,L,state);previous=entry.active;entry.active=services;const env=entry.environment;
 if(['cursed_book','confused_book','deadbook','book_cursed','study_book','book_disappears','initialspell'].includes(name))args[0]=env.object(args[0]);if(name==='book_substitution'){args[0]=env.object(args[0]);args[1]=env.object(args[1]);}if(name==='deadbook_pacify_undead')args[0]=env.monster(args[0]);if(['getspell'].includes(name))args[0]=env.intPointer(args[0]);if(name==='spelleffects_check'){args[1]=env.intPointer(args[1]);args[2]=env.intPointer(args[2]);}if(name==='dospellmenu')args[2]=env.intPointer(args[2]);if(name==='propagate_chain_lightning'){args[0]=env.queue(args[0]);args[1]=env.zap(args[1]);}const result=withCEnvironment(env,()=>core[name](...args));return typeof result==='string'?services.literal(result):result?.address??result;
 }finally{if(entry)entry.active=previous;services.stackRestore(saved);}}
