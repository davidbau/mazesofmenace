import * as CAdapter from '../../c-runtime/adapter-factories.js';
// Original combat/projectile policy is in mthrowu.js; this file supplies native layouts and header macros.
import * as core from '../../ported/mthrowu.js';
import {withCEnvironment} from '../../c-runtime/context.js';
const instances=new WeakMap();
export function createMthrowuEnvironment(services,L,state={do_not_annoy:0n}){
    const address=v=>Number(v?.address??v??0),dv=()=>CAdapter.currentDataView(services),cache=new Map();
    for(const[k,v]of Object.entries({pointerSize:8,longSize:8,intSize:4,coord_x_size:2,coord_y_size:2}))if(L[k]!==v)throw Error('Review changed MTHROWU ABI: '+k);
    const read=(p,kind)=>dv()['get'+kind](p,true),write=(p,kind,v)=>dv()['set'+kind](p,kind.includes('Big')?BigInt(v):Number(v),true);
    const kind=(tag,n)=>{const size=L[tag+'_'+n+'_size'],signed=L[tag+'_'+n+'_signed'];if(![1,2,4,8].includes(size))throw Error('Review MTHROWU field: '+tag+'.'+n);return (size===8?'Big':'')+(signed?'Int':'Uint')+(size*8);};
    const cell=(p,k)=>({address:p,get value(){return read(p,k);},set value(v){write(p,k,v);}});
    function raw(p,tag,names){p=address(p);if(!p)return 0;const key=tag+':'+p;if(cache.has(key))return cache.get(key);const o={address:p};cache.set(key,o);for(const n of names.split(' ')){if(!n)continue;const k=kind(tag,n);Object.defineProperty(o,n,{enumerable:true,get(){return read(p+L[tag+'_'+n],k);},set(v){write(p+L[tag+'_'+n],k,v);}});}return o;}
    function pointer(o,tag,n,view){Object.defineProperty(o,n,{enumerable:true,get(){return view(Number(read(o.address+L[tag+'_'+n],'BigUint64')));},set(v){write(o.address+L[tag+'_'+n],'BigUint64',BigInt(address(v)));}});}
    const permonst=p=>raw(p,'pm','mlet msize msound mflags1 mflags2 mflags3 mresists pmidx');
    function object(p){const o=raw(p,'obj','ox oy where otyp quan owt spe oclass corpsenm oartifact owornmask o_id');if(o&&!Object.hasOwn(o,'nobj')){pointer(o,'obj','nobj',object);pointer(o,'obj','nexthere',object);for(const[n,i]of ['cursed greased known opoisoned otrapped dknown'.split(' ')].flat().map((n,i)=>[n,i]))Object.defineProperty(o,n,{get(){return services.objectBit(o,i);},set(v){services.setObjectBit(o,i,v);}});}return o;}
    const dog=p=>raw(p,'dog','hungrytime');
    function extra(p){const o=raw(p,'extra','');if(o&&!Object.hasOwn(o,'edog'))pointer(o,'extra','edog',dog);return o;}
    function monster(p){const o=raw(p,'mon','mx my mux muy mhp m_lev mtame mspec_used weapon_check cham m_ap_type mappearance m_id seen_resistance');if(o&&!Object.hasOwn(o,'data')){for(const[n,view]of [['nmon',monster],['data',permonst],['minvent',object],['mw',object],['mextra',extra]])pointer(o,'mon',n,view);for(const[n,i]of 'isminion mblinded mcan mcansee mconf mflee msleeping mstun'.split(' ').map((n,i)=>[n,i]))Object.defineProperty(o,n,{get(){return services.monsterBit(o,i);},set(v){services.setMonsterBit(o,i,v);}});}return o;}
    const attack=p=>raw(p,'atk','adtyp damn'),coord=p=>raw(p,'coord','x y');
    function objectClass(p){const o=raw(p,'cls','oc_skill oc_armcat');if(o&&!Object.hasOwn(o,'oc_material'))Object.defineProperty(o,'oc_material',{get(){return services.classBit(o,0);}});return o;}
    function returnWeapon(p){const o=raw(p,'ret','otyp range');if(o&&!Object.hasOwn(o,'tethered'))Object.defineProperty(o,'tethered',{get(){return services.returnBit(o);}});return o;}
    const globalNames=['u','gy','gm','gt','gb','gn','gv','gi','gu','svc','svm','flags','iflags','svl','go','mons','objects','genders'];
    const bases=Object.fromEntries(globalNames.map((n,i)=>[n,address(services.global(i))]));
    const g={u:raw(bases.u,'u','ux uy ux0 uy0 uac ucreamed umortality umonnum umonster ulycn'),gm:raw(bases.gm,'gm','mesg_given multi'),gt:raw(bases.gt,'gt','tbx tby'),gn:raw(bases.gn,'gn','notonhead'),gv:raw(bases.gv,'gv','vision_full_recalc'),svm:raw(bases.svm,'svm','moves'),flags:raw(bases.flags,'flags','verbose'),iflags:raw(bases.iflags,'iflags','last_msg'),gi:raw(bases.gi,'gi',''),go:raw(bases.go,'go','otg_temp')};
    for(const[obj,tag,n,view]of [[g.gm,'gm','marcher',monster],[g.gm,'gm','mtarget',monster],[g.gt,'gt','thrownobj',object],[g.gi,'gi','invent',object],[g.go,'go','otg_otmp',object]])pointer(obj,tag,n,view);
    for(const[key,view]of [['uundetected','uundetected'],['roleplayDeaf','roleplayDeaf']])Object.defineProperty(g.u,key,{get(){return services.heroBit(view==='uundetected'?0:1);}});
    g.gy={};Object.defineProperty(g.gy,'youmonst',{get(){return monster(bases.gy+L.gy_youmonst);}});
    g.gb={address:bases.gb};pointer(g.gb,'gb','buzzer',monster);Object.defineProperty(g.gb,'bhitpos',{get(){return coord(bases.gb+L.gb_bhitpos);}});
    g.gm.m_shot={};for(const n of ['s','n','i','o'])Object.defineProperty(g.gm.m_shot,n,{get(){const bytes=L['shot_'+n+'_size'];return read(bases.gm+L['shot_'+n],bytes===1?'Int8':bytes===2?'Int16':'Int32');},set(v){write(bases.gm+L['shot_'+n],L['shot_'+n+'_size']===1?'Int8':L['shot_'+n+'_size']===2?'Int16':'Int32',v);}});
    g.svc={context:{}};Object.defineProperty(g.svc.context,'mon_moving',{get(){return read(bases.svc+L.context_mon_moving,L.context_mon_moving_size===1?'Int8':'Int32');}});
    const catalog=(base,stride,view)=>new Proxy({address:base},{get(o,k){if(k in o)return o[k];if(/^\d+$/.test(String(k)))return view(base+Number(k)*stride);}});
    const mons=catalog(bases.mons,L.permonstSize,permonst),objects=catalog(bases.objects,L.objectClassSize,objectClass);
    const prop=(n,f)=>cell(bases.u+L.u_uprops+n*L.propSize+L['prop_'+f],'BigInt64');
    const hasProp=n=>prop(n,'intrinsic').value||prop(n,'extrinsic').value;
    const terrain=(x,y)=>{const o=raw(bases.svl+L.terrain+(x*L.ROWNO+y)*L.terrainSize,'rm','typ');if(!Object.hasOwn(o,'wall_info'))Object.defineProperty(o,'wall_info',{get(){return services.terrainBit(o);}});return o;};
    const mapObject=(x,y)=>object(Number(read(bases.svl+L.floorObjects+(x*L.ROWNO+y)*L.pointerSize,'BigUint64')));
    const m_at=(x,y)=>monster(Number(read(bases.svl+L.floorMonsters+(x*L.ROWNO+y)*L.pointerSize,'BigUint64')));
    const flag=(p,n,k=1)=>!!(p['mflags'+k]&BigInt(L[n]));
    const env=Object.assign(Object.create(services),L,g,{object,monster,attack,coord,returnWeapon,permonst,mons,objects,terrain,m_at,state,
      boolean:v=>Number(v)<<24>>24,int:v=>Number(BigInt.asIntN(32,BigInt(v))),long:v=>BigInt.asIntN(64,BigInt(v)),
      objectPointer:p=>p?{address:address(p),get value(){return object(Number(read(address(p),'BigUint64')));},set value(v){write(address(p),'BigUint64',BigInt(address(v)));}}:0,
      objectLocal:(v=0)=>{const p=services.stackAlloc(L.pointerSize),o=env.objectPointer(p);o.value=v;return o;},intLocal:(v=0)=>{const o=cell(services.stackAlloc(4),'Int32');o.value=v;return o;},
      MON_WEP:m=>m.mw,EDOG:m=>m.mextra.edog,DEADMONSTER:m=>m.mhp<1,monsndx:p=>p.pmidx,M_AP_TYPE:m=>m.m_ap_type&L.M_AP_TYPMASK,
      Role_if:pm=>read(bases.gu+L.role_mnum,'Int32')===pm,ACURR:a=>services.acurr(a),
      BZ_M_BREATH:t=>-20-t,BZ_OFS_AD:t=>Math.abs(t-L.AD_MAGM)%10,BZ_VALID_ADTYP:t=>t>=L.AD_MAGM&&t<=L.AD_SPC2,
      abs:v=>Math.abs(Number(v)|0)|0,max:(a,b)=>a>b?a:b,nhUse:v=>{},
      is_ammo:o=>(o.oclass===L.WEAPON_CLASS||o.oclass===L.GEM_CLASS)&&objects[o.otyp].oc_skill>=-L.P_CROSSBOW&&objects[o.otyp].oc_skill<=-L.P_BOW,
      is_launcher:o=>o.oclass===L.WEAPON_CLASS&&objects[o.otyp].oc_skill>=L.P_BOW&&objects[o.otyp].oc_skill<=L.P_CROSSBOW,
      matching_launcher:(a,l)=>l&&objects[a.otyp].oc_skill===-objects[l.otyp].oc_skill,
      ammo_and_launcher:(a,l)=>env.is_ammo(a)&&env.matching_launcher(a,l),
      is_pole:o=>(o.oclass===L.WEAPON_CLASS||o.oclass===L.TOOL_CLASS)&&(objects[o.otyp].oc_skill===L.P_POLEARMS||objects[o.otyp].oc_skill===L.P_LANCE||services.is_art(o,L.ART_SNICKERSNEE)),
      is_poisonable:o=>(o.oclass===L.WEAPON_CLASS&&objects[o.otyp].oc_skill>=-L.P_SHURIKEN&&objects[o.otyp].oc_skill<=-L.P_BOW)||services.permapoisoned(o),
      stone_missile:o=>(objects[o.otyp].oc_material===L.GEMSTONE||objects[o.otyp].oc_material===L.MINERAL)&&o.oclass!==L.RING_CLASS,
      is_flimsy:o=>objects[o.otyp].oc_material<=L.LEATHER||o.otyp===L.RUBBER_HOSE,
      is_elf:p=>flag(p,'M2_ELF',2),is_orc:p=>flag(p,'M2_ORC',2),is_gnome:p=>flag(p,'M2_GNOME',2),is_lord:p=>flag(p,'M2_LORD',2),is_prince:p=>flag(p,'M2_PRINCE',2),
      is_mplayer:p=>p.address>=mons[L.PM_ARCHEOLOGIST].address&&p.address<=mons[L.PM_WIZARD].address,
      is_unicorn:p=>p.mlet===L.S_UNICORN&&flag(p,'M2_JEWELS',2),noncorporeal:p=>p.mlet===L.S_GHOST,amorphous:p=>flag(p,'M1_AMORPHOUS'),bigmonst:p=>p.msize>=L.MZ_LARGE,
      passes_rocks:p=>flag(p,'M1_WALLWALK')&&!flag(p,'M1_UNSOLID'),throws_rocks:p=>flag(p,'M2_ROCKTHROW',2),nohands:p=>flag(p,'M1_NOHANDS'),
      nonliving:p=>flag(p,'M2_UNDEAD',2)||p===mons[L.PM_MANES]||p.mlet===L.S_GOLEM||p.mlet===L.S_VORTEX,
      touch_petrifies:p=>p===mons[L.PM_COCKATRICE]||p===mons[L.PM_CHICKATRICE],eyecount:p=>flag(p,'M1_NOEYES')?0:p===mons[L.PM_CYCLOPS]||p===mons[L.PM_FLOATING_EYE]?1:2,
      is_vampshifter:m=>m.cham===L.PM_VAMPIRE||m.cham===L.PM_VAMPIRE_LEADER||m.cham===L.PM_VLAD_THE_IMPALER,
      resists_acid:m=>services.Resists_Elem(m,L.ACID_RES),resists_poison:m=>services.Resists_Elem(m,L.POISON_RES),resists_ston:m=>services.Resists_Elem(m,L.STONE_RES),
      u_at:(x,y)=>x===g.u.ux&&y===g.u.uy,mdistu:m=>services.dist2(m.mx,m.my,g.u.ux,g.u.uy),m_seenres:(m,mask)=>m.seen_resistance&BigInt(mask),
      cansee:(x,y)=>{const rows=Number(read(bases.gv+L.gv_viz_array,'BigUint64')),row=Number(read(rows+y*8,'BigUint64'));return !!(read(row+x,'Uint8')&L.IN_SIGHT);},
      couldsee:(x,y)=>{const rows=Number(read(bases.gv+L.gv_viz_array,'BigUint64')),row=Number(read(rows+y*8,'BigUint64'));return !!(read(row+x,'Uint8')&L.COULD_SEE);},
      canspotmon:m=>services.canseemon(m)||services.sensemon(m),
      IS_OBSTRUCTED:t=>t<L.POOL,IS_SINK:t=>t===L.SINK,
      makeknown:n=>services.discover_object(n,1,1,1),
      mhis:m=>Number(read(bases.genders+services.pronoun_gender(m,L.PRONOUN_HALLU)*L.genderSize+L.gender_his,'BigUint64')),mhim:m=>Number(read(bases.genders+services.pronoun_gender(m,L.PRONOUN_HALLU)*L.genderSize+L.gender_him,'BigUint64')),
      invokeLineCallback:(token,x,y)=>services.invokeLineCallback(token,x,y),
    });
    for(const[name,n]of Object.entries({Acid_resistance:L.ACID_RES,Stone_resistance:L.STONE_RES,Sleep_resistance:L.SLEEP_RES,Fumbling:L.FUMBLING,Half_physical_damage:L.HALF_PHDAM}))Object.defineProperty(env,name,{get(){return hasProp(n);}});
    Object.defineProperties(env,{
      something:{get(){return services.common(0);}},Something:{get(){return services.common(1);}},vision_clears:{get(){return services.common(2);}},
      Blind:{get(){return (prop(L.BLINDED,'intrinsic').value||prop(L.BLINDED,'extrinsic').value)&&!prop(L.BLINDED,'blocked').value;}},
      Deaf:{get(){return hasProp(L.DEAF)||services.heroBit(1);}},Hallucination:{get(){return prop(L.HALLUC,'intrinsic').value&&!hasProp(L.HALLUC_RES);}},
      Confusion:{get(){return prop(L.CONFUSION,'intrinsic').value;}},Stunned:{get(){return prop(L.STUNNED,'intrinsic').value;}},
      Stoned:{get(){return prop(L.STONED,'intrinsic').value;}},BlindedTimeout:{get(){return prop(L.BLINDED,'intrinsic').value&BigInt(L.TIMEOUT);}},
      Underwater:{get(){return services.heroBit(2);}},Upolyd:{get(){return g.u.umonnum!==g.u.umonster;}},U_AP_TYPE:{get(){return g.gy.youmonst.m_ap_type&L.M_AP_TYPMASK;}},
      Hate_silver:{get(){return g.u.ulycn>=L.LOW_PM||services.hates_silver(g.gy.youmonst.data);}},
      do_not_annoy:{get(){return state.do_not_annoy;},set(v){state.do_not_annoy=BigInt.asIntN(64,BigInt(v));}},
    });
    env.W_WEP=BigInt(L.W_WEP);
    env.obj_to_glyph=(o,rng)=>{
      const piletop=()=>o.where===L.OBJ_FLOOR&&((g.go.otg_otmp=mapObject(o.ox,o.oy).nexthere)!==0)&&(o.otyp!==L.BOULDER||g.go.otg_otmp.otyp===L.BOULDER);
      if(o.otyp===L.STATUE){if(env.Hallucination)return rng(L.NUMMONS)+(rng(2)===0?L.GLYPH_MON_MALE_OFF:L.GLYPH_MON_FEM_OFF);return o.corpsenm+((o.spe&L.CORPSTAT_GENDER)===L.CORPSTAT_FEMALE?(piletop()?L.GLYPH_STATUE_FEM_PILETOP_OFF:L.GLYPH_STATUE_FEM_OFF):(piletop()?L.GLYPH_STATUE_MALE_PILETOP_OFF:L.GLYPH_STATUE_MALE_OFF));}
      if(env.Hallucination){g.go.otg_temp=rng(L.NUM_OBJECTS-L.FIRST_OBJECT)+L.FIRST_OBJECT;return g.go.otg_temp===L.CORPSE?rng(L.NUMMONS)+L.GLYPH_BODY_OFF:g.go.otg_temp+L.GLYPH_OBJ_OFF;}
      if(o.otyp===L.CORPSE)return o.corpsenm+(piletop()?L.GLYPH_BODY_PILETOP_OFF:L.GLYPH_BODY_OFF);
      const generic=!o.dknown&&(o.oclass===L.POTION_CLASS||(o.otyp>=L.FIRST_REAL_GEM&&o.otyp<=L.LAST_GLASS_GEM)||(o.otyp>=L.FIRST_SPELL&&o.otyp<=L.LAST_SPELL));
      return (generic?o.oclass:o.otyp)+(piletop()?L.GLYPH_OBJ_PILETOP_OFF:L.GLYPH_OBJ_OFF);
    };
    for(const[name,view]of [['autoreturn_weapon',returnWeapon],['splitobj',object],['mksobj',object],['select_rwep',object],['hold_another_object',object],['sobj_at',object]])env[name]=(...args)=>view(services[name](...args));
    env.callLocal=(fn,...args)=>{return CAdapter.callWithStack(services,fn,...args);};
    return env;
}
export function callMthrowu(services,layout,name,...args){
    const key=services.moduleKey;if(!key)throw Error('MTHROWU requires actual Module identity');let env=instances.get(key);if(!env){env=createMthrowuEnvironment(services,layout);instances.set(key,env);}if(name==='environment')return env;
    const monFirst=['m_has_launcher_and_ammo','monmulti','monshoot','ohitmon','m_throw','return_from_mtoss','thrwmm','spitmm','breamm','m_useupall','m_useup','thrwmu','spitmu','breamu','m_lined_up','lined_up','m_carrying'];
    if(monFirst.includes(name))args[0]=env.monster(args[0]);
    if(['drop_throw','ucatchgem','u_catch_thrown_obj'].includes(name))args[0]=env.object(args[0]);
    if(['monmulti','monshoot'].includes(name)){args[1]=env.object(args[1]);args[2]=env.object(args[2]);}
    if(['ohitmon','return_from_mtoss','m_useupall','m_useup'].includes(name))args[1]=env.object(args[1]);
    if(name==='m_throw')args[6]=env.object(args[6]);
    if(['thrwmm','m_lined_up'].includes(name))args[1]=env.monster(args[1]);
    if(name==='ucatchgem')args[1]=env.monster(args[1]);
    if(['spitmm','breamm','spitmu','breamu'].includes(name))args[1]=env.attack(args[1]);
    if(['spitmm','breamm'].includes(name))args[2]=env.monster(args[2]);
    if(name==='thitu')args[2]=env.objectPointer(args[2]);if(['hit_bars','hits_bars'].includes(name))args[0]=env.objectPointer(args[0]);
    const sp=services.stackSave();try{return withCEnvironment(env,core[name],...args);}finally{services.stackRestore(sp);}
}
