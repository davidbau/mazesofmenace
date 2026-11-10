// Fresh compiler-derived views and header/ABI expansion; dog policy is dog.js.
import * as dog from './dog.js';
import {withCEnvironment} from './c-runtime.js';
const states=new WeakMap();
const environments=new WeakMap();
export function createDogState(){return {failed_arrivals:0,borrow:0};}
export function createDogEnvironment(services,layout,state){
    const schemas={"mon": {"data": "ptr", "nmon": "ptr", "minvent": "ptr", "mextra": "ptr", "m_id": "Uint32", "mtame": "Int8", "mhp": "Int32", "mhpmax": "Int32", "mx": "Int16", "my": "Int16", "mux": "Int16", "muy": "Int16", "mlstmv": "BigInt64", "mstate": "BigInt64", "migflags": "BigInt64", "mstrategy": "BigUint64", "mspec_used": "Int32", "meating": "Int32", "weapon_check": "Int16", "mtrack": "array", "cham": "Int16"}, "obj": {"nobj": "ptr", "cobj": "ptr", "oextra": "ptr", "age": "BigInt64", "corpsenm": "Int32", "spe": "Int8", "otyp": "Int16", "oclass": "Int8", "ox": "Int16", "oy": "Int16", "where": "Int8", "owornmask": "BigInt64"}, "extra": {"edog": "ptr", "eshk": "ptr", "epri": "ptr", "egd": "ptr"}, "edog": {"parentmid": "Uint32", "droptime": "BigInt64", "dropdist": "Uint32", "apport": "Int32", "whistletime": "BigInt64", "hungrytime": "BigInt64", "ogoal": "coord", "abuse": "Int32", "revivals": "Int32", "mhpmax_penalty": "Int32"}, "eshk": {"dismiss_kops": "Int8", "shoplevel": "level"}, "epri": {"shrlevel": "level"}, "egd": {"gdlevel": "level"}, "pm": {"mflags1": "BigUint64", "mflags2": "BigUint64", "mflags3": "Uint16", "mlet": "Int8", "msize": "Uint8"}, "cls": {}, "coord": {"x": "Int16", "y": "Int16"}, "level": {"dnum": "Int16", "dlevel": "Int16"}, "stair": {"sx": "Int16", "sy": "Int16"}, "trap": {"ntrap": "ptr", "tx": "Int16", "ty": "Int16"}, "vital": {"mvflags": "Uint8"}, "skill": {"skill": "Int16"}, "gender": {"his": "ptr"}, "prop": {"intrinsic": "BigInt64", "extrinsic": "BigInt64", "blocked": "BigInt64"}, "u": {"ux": "Int16", "uy": "Int16", "uz": "level", "uz0": "level", "usteed": "ptr", "ustuck": "ptr", "umonnum": "Int32", "umonster": "Int32", "uprops": "array", "weapon_skills": "array", "uconduct_pets": "BigInt64"}};
    for(const [key,n]of Object.entries({pointerSize:8,intSize:4,longSize:8,shortSize:2,configDevelopmentDiagnostics:1,configAssertions:1}))if(layout[key]!==n)throw new Error('Review dog ABI '+key);
    const addr=v=>Number(v?.address??v??0),raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),int=v=>Number(BigInt.asIntN(32,BigInt(v))),long=v=>BigInt.asIntN(64,BigInt(v));
    const view=()=>new DataView(services.heap().buffer),global=i=>addr(services.global(i)),pointer=at=>Number(view().getBigUint64(at,true)),samePtr=(a,b)=>raw(a)===raw(b);
    const indexed=get=>new Proxy({}, {get(t,k){return typeof k==='string'&&/^-?\d+$/.test(k)?get(Number(k)):Reflect.get(t,k);}});
    const field=(o,k,at,kind)=>{Object.defineProperty(o,k,{get(){return view()['get'+kind](at(),true);},set(v){view()['set'+kind](at(),kind.startsWith('Big')?BigInt(v):Number(v),true);}});};
    const ptr=(o,k,at,wrap=v=>v)=>{o._addresses??={};o._addresses[k]=at;Object.defineProperty(o,k,{get(){return wrap(pointer(at()));},set(v){view().setBigUint64(at(),raw(v),true);}});};
    function record(value,prefix){const at=addr(value);if(!at)return 0;const o={address:at};for(const [k,kind]of Object.entries(schemas[prefix]))if(!['ptr','array','coord','level'].includes(kind)){if(layout[prefix+'_'+k+'_size']!==Number(kind.match(/\d+/)[0])/8)throw new Error('Review dog field '+prefix+'_'+k);field(o,k,()=>at+layout[prefix+'_'+k],kind);}return o;}
    const coord=v=>record(v,'coord'),level=v=>record(v,'level'),permonst=v=>record(v,'pm');
    function edog(v){const d=record(v,'edog');if(!d)return 0;d.ogoal=coord(d.address+layout.edog_ogoal);Object.defineProperty(d,'killed_by_u',{get(){return services.edogBit(d,0);},set(v){services.setEdogBit(d,0,v);}});return d;}
    function extra(v){const e=record(v,'extra');if(!e)return 0;ptr(e,'edog',()=>e.address+layout.extra_edog,edog);for(const [k,prefix,key]of [['eshk','eshk','shoplevel'],['epri','epri','shrlevel'],['egd','egd','gdlevel']])ptr(e,k,()=>e.address+layout['extra_'+k],p=>{const r=record(p,prefix);if(!r)return 0;r[key]=level(r.address+layout[prefix+'_'+key]);return r;});return e;}
    function object(v){const o=record(v,'obj');if(!o)return 0;ptr(o,'nobj',()=>o.address+layout.obj_nobj,object);ptr(o,'cobj',()=>o.address+layout.obj_cobj,object);ptr(o,'oextra',()=>o.address+layout.obj_oextra,p=>p?{address:p,get oname(){return pointer(p+layout.oextra_oname);}}:0);for(const [i,k]of ['blessed','cursed','no_charge','oerodeproof','opoisoned'].entries())Object.defineProperty(o,k,{get(){return services.objectBit(o,i);},set(v){services.setObjectBit(o,i,v);}});return o;}
    function monster(v){const m=record(v,'mon');if(!m)return 0;ptr(m,'data',()=>m.address+layout.mon_data,permonst);ptr(m,'nmon',()=>m.address+layout.mon_nmon,monster);ptr(m,'minvent',()=>m.address+layout.mon_minvent,object);ptr(m,'mextra',()=>m.address+layout.mon_mextra,extra);m.mtrack=indexed(i=>coord(m.address+layout.mon_mtrack+i*layout.coordSize));for(const [i,k]of ['female','isgd','isminion','ispriest','isshk','iswiz','mavenge','mblinded','mcanmove','mconf','mflee','mfleetim','mfrozen','mleashed','mpeaceful','msleeping','mstun','mtrapped','wormno','mcansee'].entries())Object.defineProperty(m,k,{get(){return services.monsterBit(m,i);},set(v){services.setMonsterBit(m,i,v);}});return m;}
    const u=record(global(0),'u');for(const k of ['uz','uz0'])u[k]=level(global(0)+layout['u_'+k]);for(const k of ['usteed','ustuck'])ptr(u,k,()=>global(0)+layout['u_'+k],monster);u.uconduct={};field(u.uconduct,'pets',()=>global(0)+layout.u_uconduct_pets,'BigInt64');
    u.uroleplay={};u.uhave={};u.uevent={};for(const [i,o,k]of [[0,u.uroleplay,'pauper'],[1,u.uhave,'amulet'],[2,u.uevent,'qexpelled']])Object.defineProperty(o,k,{get(){return services.heroBit(i);}});Object.defineProperty(u,'uswallow',{get(){return services.heroBit(3);}});
    const props=indexed(i=>record(global(0)+layout.u_uprops+i*layout.propSize,'prop'));u.uprops=props;
    const svm={mvitals:indexed(i=>record(global(1)+layout.mvitals+i*layout.vitalSize,'vital'))};field(svm,'moves',()=>global(1)+layout.moves,'BigInt64');
    const gu={urole:{}},gp={},svc={context:{}},gd={dogname:global(5)+layout.dogname},gc={catname:global(6)+layout.catname},gh={horsename:global(7)+layout.horsename},gb={bhitpos:coord(global(8)+layout.bhitpos)},gn={},gm={},gf={},svu={updest:{}},svr={},svq={quest_status:{}},gy={youmonst:monster(global(15)+layout.youmonst)},flags={},iflags={},program_state={};
    for(const k of ['petnum','mnum'])field(gu.urole,k,()=>global(2)+layout[k],'Int16');field(gp,'preferred_pet',()=>global(3)+layout.preferred_pet,'Int8');field(gp,'petname_used',()=>global(3)+layout.petname_used,'Int32');
    field(svc.context,'startingpet_typ',()=>global(4)+layout.startingpet_typ,'Int32');field(svc.context,'startingpet_mid',()=>global(4)+layout.startingpet_mid,'Uint32');field(gn,'notonhead',()=>global(9)+layout.notonhead,'Int8');
    for(const k of ['migrating_mons','mydogs'])ptr(gm,k,()=>global(10)+layout[k],monster);ptr(gm,'migrating_objs',()=>global(10)+layout.migrating_objs,object);ptr(gf,'ftrap',()=>global(11)+layout.ftrap,trap);
    for(const k of ['lx','hx','ly','hy'])field(svu.updest,k,()=>global(12)+layout['updest_'+k],'Int16');svr.rooms=indexed(i=>({address:global(13)+layout.rooms+i*layout.roomSize}));field(svq.quest_status,'leader_m_id',()=>global(14)+layout.leader_m_id,'Uint32');
    field(flags,'moonphase',()=>global(18)+layout.moonphase,'Uint32');field(flags,'female',()=>global(18)+layout.female,'Int8');field(iflags,'debug_fuzzer',()=>global(19)+layout.debug_fuzzer,'Int8');field(program_state,'in_moveloop',()=>global(20)+layout.in_moveloop,'Int32');
    const mons=indexed(i=>permonst(global(22)+i*layout.pmSize)),objects=indexed(i=>({get oc_material(){return services.classBit(i,0);}}));
    function trap(v){const t=record(v,'trap');if(!t)return 0;ptr(t,'ntrap',()=>t.address+layout.trap_ntrap,trap);Object.defineProperty(t,'ttyp',{get(){return services.trapBit(t,0);}});return t;}
    function link(o,k){return {address:o._addresses[k](),get value(){return o[k];},set value(v){o[k]=v;}};}
    const env=Object.assign(Object.create(services),layout,{u,svm,gu,gp,svc,gd,gc,gh,gb,gn,gm,gf,svu,svr,svq,gy,flags,iflags,program_state,mons,objects,monster,object,permonst,edog,extra,coord,level,trap,int,long,ulong:raw,short:v=>int(v)<<16>>16,coordxy:v=>int(v)<<16>>16,boolean:v=>int(v)<<24>>24,
        samePtr,EDOG:m=>m.mextra.edog,ESHK:m=>m.mextra.eshk,EPRI:m=>m.mextra.epri,EGD:m=>m.mextra.egd,has_edog:m=>Boolean(m.mextra&&m.mextra.edog),has_oname:o=>Boolean(o.oextra&&o.oextra.oname),ONAME:o=>o.oextra.oname,
        loadChar:p=>view().getInt8(typeof p==='string'?services.literal(p):addr(p)),coordLocal:()=>coord(services.stackAlloc(layout.coordSize)),levelLocal:()=>level(services.stackAlloc(layout.levelSize)),roomAt:i=>svr.rooms[i],
        monsterLink:link,objectLink:link,failedArrivalsReference:()=>({privateFailed:true}),
        Role_if:p=>gu.urole.mnum===p,P_SKILL:i=>view().getInt16(global(0)+layout.u_weapon_skills+i*layout.skillSize+layout.skill_skill,true),ACURR:a=>services.acurr(a),
        min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,ismnum:n=>n>=0&&n<layout.NUMMONS,Has_contents:o=>Boolean(o.cobj),DEADMONSTER:m=>m.mhp<1,helpless:m=>Boolean(m.msleeping||!m.mcanmove),
        MON_AT:(x,y)=>Boolean(pointer(global(17)+layout.floorMonsters+(x*layout.ROWNO+y)*8)),In_endgame:l=>l.dnum===level(global(16)+layout.astral).dnum,Is_qstart:l=>{const q=level(global(16)+layout.qstart);return Boolean((q.dnum||q.dlevel)&&services.on_level(l,q));},
        cansee:(x,y)=>{const rows=pointer(global(24)+layout.viz_array),row=pointer(rows+y*8);return Boolean(view().getUint8(row+x)&layout.IN_SIGHT);},canspotmon:m=>Boolean(services.canseemon(m)||services.sensemon(m)),
        uhis:()=>pointer(global(21)+(flags.female?1:0)*layout.genderSize+layout.gender_his),
        resists_poison:m=>services.Resists_Elem(m,layout.POISON_RES),resists_acid:m=>services.Resists_Elem(m,layout.ACID_RES),resists_ston:m=>services.Resists_Elem(m,layout.STONE_RES),
        is_vampshifter:m=>[layout.PM_VAMPIRE,layout.PM_VAMPIRE_LEADER,layout.PM_VLAD_THE_IMPALER].includes(m.cham),
        is_rider:p=>['PM_DEATH','PM_FAMINE','PM_PESTILENCE'].some(k=>samePtr(p,mons[layout[k]])),flesh_petrifies:p=>['PM_COCKATRICE','PM_CHICKATRICE','PM_MEDUSA'].some(k=>samePtr(p,mons[layout[k]])),
        likes_fire:p=>['PM_FIRE_VORTEX','PM_FLAMING_SPHERE','PM_FIRE_ELEMENTAL','PM_SALAMANDER'].some(k=>samePtr(p,mons[layout[k]])),
        slimeproof:p=>samePtr(p,mons[layout.PM_GREEN_SLIME])||p.mlet===layout.S_GHOST||env.likes_fire(p),
        emits_light:p=>p.mlet===layout.S_LIGHT||['PM_FLAMING_SPHERE','PM_SHOCKING_SPHERE','PM_BABY_GOLD_DRAGON','PM_FIRE_VORTEX','PM_FIRE_ELEMENTAL','PM_GOLD_DRAGON'].some(k=>samePtr(p,mons[layout[k]]))?1:0,
        vegan:p=>[layout.S_BLOB,layout.S_JELLY,layout.S_FUNGUS,layout.S_VORTEX,layout.S_LIGHT,layout.S_GHOST].includes(p.mlet)||(p.mlet===layout.S_ELEMENTAL&&!samePtr(p,mons[layout.PM_STALKER]))||(p.mlet===layout.S_GOLEM&&!samePtr(p,mons[layout.PM_FLESH_GOLEM])&&!samePtr(p,mons[layout.PM_LEATHER_GOLEM])),
        stale_egg:o=>long(svm.moves-o.age)>BigInt(2*layout.MAX_EGG_HATCH_TIME),polyfood:o=>[layout.CORPSE,layout.EGG,layout.TIN].includes(o.otyp)&&o.corpsenm>=layout.LOW_PM&&(services.pm_to_cham(o.corpsenm)!==layout.NON_PM||services.dmgtype(mons[o.corpsenm],layout.AD_POLY)),
        is_organic:o=>objects[o.otyp].oc_material<=layout.WOOD,is_metallic:o=>objects[o.otyp].oc_material>=layout.IRON&&objects[o.otyp].oc_material<=layout.MITHRIL,is_rustprone:o=>objects[o.otyp].oc_material===layout.IRON,
        iter_mons:fn=>{if(fn!==dog.set_mon_lastmove)throw new Error('Review dog iterator identity');return services.iter_mons();},
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        callLocal(fn,...args){const saved=services.stackSave();try{return fn(...args);}finally{services.stackRestore(saved);}},
    });
    for(const [name,mask]of Object.entries({is_domestic:'M2_DOMESTIC',is_undead:'M2_UNDEAD',is_elf:'M2_ELF',is_human:'M2_HUMAN',is_demon:'M2_DEMON',carnivorous:'M1_CARNIVORE',herbivorous:'M1_HERBIVORE',metallivorous:'M1_METALLIVORE',humanoid:'M1_HUMANOID',acidic:'M1_ACID',poisonous:'M1_POIS',regenerates:'M1_REGEN'}))env[name]=p=>Boolean(p[mask.startsWith('M1_')?'mflags1':'mflags2']&BigInt(layout[mask]));env.haseyes=p=>!(p.mflags1&BigInt(layout.M1_NOEYES));env.is_covetous=p=>p.mflags3&layout.M3_COVETOUS;
    for(const [k,v]of Object.entries(layout))if(/^(M1_|M2_|MON_|STRAT_|MIGR_LEFTOVERS$)/.test(k))env[k]=BigInt(v);
    function failed(){return state.borrow?pointer(state.borrow.address):state.failed_arrivals;}
    Object.defineProperties(env,{failed_arrivals:{get(){return monster(failed());},set(v){if(state.borrow)view().setBigUint64(state.borrow.address,raw(v),true);else state.failed_arrivals=addr(v);}},fmon:{get(){return monster(pointer(global(17)+layout.fmon));},set(v){view().setBigUint64(global(17)+layout.fmon,raw(v),true);}},Upolyd:{get(){return u.umonnum!==u.umonster;}},Aggravate_monster:{get(){return Boolean(props[layout.AGGRAVATE_MONSTER].intrinsic||props[layout.AGGRAVATE_MONSTER].extrinsic);}},Conflict:{get(){return Boolean(props[layout.CONFLICT].intrinsic||props[layout.CONFLICT].extrinsic);}},Hallucination:{get(){return Boolean(props[layout.HALLUC].intrinsic&&!(props[layout.HALLUC_RES].intrinsic||props[layout.HALLUC_RES].extrinsic));}}});
    env.relmon=(mon,ref)=>{if(!ref.privateFailed)return services.relmon(mon,ref);const saved=services.stackSave();if(!state.borrow){const at=services.stackAlloc(8);view().setBigUint64(at,BigInt(state.failed_arrivals),true);state.borrow={address:at,depth:0};}const cell=state.borrow;cell.depth++;try{return services.relmon(mon,cell);}finally{if(--cell.depth===0){state.failed_arrivals=pointer(cell.address);state.borrow=0;}services.stackRestore(saved);}};
    for(const key of ['makemon','christen_monst','find_pmmonst'])env[key]=(...args)=>monster(services[key](...args));for(const key of ['rndmonst_adj'])env[key]=(...args)=>permonst(services[key](...args));env.newmextra=()=>extra(services.newmextra());
    for(const key of ['stairway_find','stairway_find_dir','stairway_find_from'])env[key]=(...args)=>record(services[key](...args),'stair');
    return env;
}
export function dogState(services){let state=states.get(services.moduleKey);if(!state)states.set(services.moduleKey,state=createDogState());return state;}
export function callDog(services,layout,name,...args){
    const state=dogState(services);
    let layouts=environments.get(services.moduleKey),entry=layouts?.get(layout);
    if(!entry){
        entry={services};
        const forwarding=new Proxy(Object.create(null),{get:(_,key)=>Reflect.get(entry.services,key,entry.services)});
        entry.env=createDogEnvironment(forwarding,layout,state);
        if(!layouts){layouts=new WeakMap();environments.set(services.moduleKey,layouts);}
        layouts.set(layout,entry);
    }
    const env=entry.env,previous=entry.services;
    entry.services=services;
    try{if(name==='failed_arrivals')return state.borrow?Number(new DataView(services.heap().buffer).getBigUint64(state.borrow.address,true)):state.failed_arrivals;
    if(!['pet_type','pick_familiar_pm','make_familiar','makedog','update_mlstmv','losedogs','keepdogs','discard_migrations'].includes(name))args[0]=env.monster(args[0]);
    if(['pick_familiar_pm','make_familiar'].includes(name))args[0]=env.object(args[0]);if(['dogfood','tamedog'].includes(name))args[1]=env.object(args[1]);if(name==='migrate_to_level')args[3]=env.coord(args[3]);
    const saved=services.stackSave();try{const result=withCEnvironment(env,dog[name],...args);return result?.address??result??0;}finally{services.stackRestore(saved);}
    }finally{entry.services=previous;}
}
