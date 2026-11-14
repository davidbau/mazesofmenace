// Canonical pet/lifecycle roots with native list references and value locals.
import abi from '../pet-abi.json' with {type:'json'};
import {createNativeValueRecords} from './value-records.js';
import {nativeStateLinksFor} from './state-links.js';
export function createNativeDogState(environment,layouts,services,owner){
 const layout=layouts.dog,{ctypes,transport:t}=environment,views=owner.nativeRecords,arena=owner.nativeArena;
 const addr=environment.address,raw=v=>BigInt.asUintN(64,BigInt(v?.address??v??0)),view=()=>arena.view,global=i=>environment.requireGlobal(abi.globals[i]),pointer=at=>arena.pointer(at),int=t.int,long=t.long,samePtr=(a,b)=>(a?.address??a??0)===(b?.address??b??0);
 const wrap=type=>v=>views.record(type,v),monster=wrap('struct monst'),object=wrap('struct obj'),permonst=wrap('struct permonst'),edog=wrap('struct edog'),extra=wrap('struct mextra'),coord=wrap('struct nhcoord'),level=wrap('struct d_level'),trap=wrap('struct trap');
 const roots={};for(const[name,type]of Object.entries({u:'you',svm:'instance_globals_saved_m',gu:'instance_globals_u',gp:'instance_globals_p',svc:'instance_globals_saved_c',gd:'instance_globals_d',gc:'instance_globals_c',gh:'instance_globals_h',gb:'instance_globals_b',gn:'instance_globals_n',gm:'instance_globals_m',gf:'instance_globals_f',svu:'instance_globals_saved_u',svr:'instance_globals_saved_r',svq:'instance_globals_saved_q',gy:'instance_globals_y',svl:'instance_globals_saved_l',flags:'flag',iflags:'instance_flags',program_state:'sinfo'}))roots[name]=views.record('struct '+type,environment.requireGlobal(name));
 const {u,svm,gu,gp,svc,gd,gc,gh,gb,gn,gm,gf,svu,svr,svq,gy,svl,flags,iflags,program_state}=roots;
 function table(type,base,stride,length){const out=Array(length);for(let i=0;i<length;i++)Object.defineProperty(out,i,{enumerable:true,configurable:true,get(){const value=views.record(type,base+i*stride);Object.defineProperty(out,i,{value,enumerable:true});return value;}});return out;}
 const mons=table('struct permonst',global(22),layout.pmSize,layout.NUMMONS+1),objects=table('struct objclass',global(23),ctypes.size('struct objclass'),layout.NUM_OBJECTS),props=table('struct prop',global(0)+layout.u_uprops,layout.propSize,u.uprops.length),skills=table('struct skills',global(0)+layout.u_weapon_skills,layout.skillSize,u.weapon_skills.length),rooms=table('struct mkroom',global(13)+layout.rooms,layout.roomSize,ctypes.size(ctypes.record('struct instance_globals_saved_r').fields.rooms.ctype.replace(/ rooms$/,''))/layout.roomSize);
 const links=nativeStateLinksFor(environment),failed=links.private('native.dog.failed_arrivals','struct monst');
 const values=createNativeValueRecords({...environment,nativeRecords:views},t.stackAlloc),locals=new WeakSet();
 function localRecord(type,fields){const ref=values.local(type),out={get address(){return ref.address;}};for(const name of fields)Object.defineProperty(out,name,{enumerable:true,get:()=>ref.read(name),set:v=>ref.write(name,v)});locals.add(out);return out;}
    const env=Object.assign({},layout,{u,svm,gu,gp,svc,gd,gc,gh,gb,gn,gm,gf,svu,svr,svq,gy,flags,iflags,program_state,mons,objects,monster,object,permonst,edog,extra,coord,level,trap,int,long,ulong:raw,short:v=>int(v)<<16>>16,coordxy:v=>int(v)<<16>>16,boolean:v=>int(v)<<24>>24,
        samePtr,EDOG:m=>m.mextra.edog,ESHK:m=>m.mextra.eshk,EPRI:m=>m.mextra.epri,EGD:m=>m.mextra.egd,has_edog:m=>Boolean(m.mextra&&m.mextra.edog),has_oname:o=>Boolean(o.oextra&&o.oextra.oname),ONAME:o=>o.oextra.oname,
        loadChar:p=>view().getInt8(typeof p==='string'?services.literal(p):addr(p)),coordLocal:()=>localRecord('struct nhcoord',['x','y']),levelLocal:()=>localRecord('struct d_level',['dnum','dlevel']),roomAt:i=>rooms[i],
        monsterLink:links.record,objectLink:links.record,failedArrivalsReference:()=>failed,
        Role_if:p=>gu.urole.mnum===p,P_SKILL:i=>skills[i].skill,ACURR:a=>services.acurr(a),
        min:(a,b)=>a<b?a:b,max:(a,b)=>a>b?a:b,ismnum:n=>n>=0&&n<layout.NUMMONS,Has_contents:o=>Boolean(o.cobj),DEADMONSTER:m=>m.mhp<1,helpless:m=>Boolean(m.msleeping||!m.mcanmove),
        MON_AT:(x,y)=>Boolean(svl.level.monsters[x][y]),In_endgame:l=>l.dnum===level(global(16)+layout.astral).dnum,Is_qstart:l=>{const q=level(global(16)+layout.qstart);return Boolean((q.dnum||q.dlevel)&&services.on_level(l,q));},
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
        iter_mons:fn=>services.iter_mons(fn),
        rn1:(bound,offset,line,caller)=>int(services.rn2(int(bound),line,caller)+int(offset)),
        callLocal:(fn,...args)=>fn(...args),
    });
    for(const [name,mask]of Object.entries({is_domestic:'M2_DOMESTIC',is_undead:'M2_UNDEAD',is_elf:'M2_ELF',is_human:'M2_HUMAN',is_demon:'M2_DEMON',carnivorous:'M1_CARNIVORE',herbivorous:'M1_HERBIVORE',metallivorous:'M1_METALLIVORE',humanoid:'M1_HUMANOID',acidic:'M1_ACID',poisonous:'M1_POIS',regenerates:'M1_REGEN'}))env[name]=p=>Boolean(p[mask.startsWith('M1_')?'mflags1':'mflags2']&BigInt(layout[mask]));env.haseyes=p=>!(p.mflags1&BigInt(layout.M1_NOEYES));env.is_covetous=p=>p.mflags3&layout.M3_COVETOUS;
    for(const [k,v]of Object.entries(layout))if(/^(M1_|M2_|MON_|STRAT_|MIGR_LEFTOVERS$)/.test(k))env[k]=BigInt(v);
    Object.defineProperties(env,{failed_arrivals:{get(){return failed.value;},set(v){failed.value=v;}},fmon:{get(){return svl.level.monlist;},set(v){svl.level.monlist=v;}},Upolyd:{get(){return u.umonnum!==u.umonster;}},Aggravate_monster:{get(){return Boolean(props[layout.AGGRAVATE_MONSTER].intrinsic||props[layout.AGGRAVATE_MONSTER].extrinsic);}},Conflict:{get(){return Boolean(props[layout.CONFLICT].intrinsic||props[layout.CONFLICT].extrinsic);}},Hallucination:{get(){return Boolean(props[layout.HALLUC].intrinsic&&!(props[layout.HALLUC_RES].intrinsic||props[layout.HALLUC_RES].extrinsic));}}});
    env.coord=v=>locals.has(v)?v:coord(v);env.level=v=>locals.has(v)?v:level(v);
    for(const key of ['makemon','christen_monst','find_pmmonst'])env[key]=(...args)=>monster(services[key](...args));for(const key of ['rndmonst_adj'])env[key]=(...args)=>permonst(services[key](...args));env.newmextra=()=>extra(services.newmextra());
    for(const key of ['stairway_find','stairway_find_dir','stairway_find_from'])env[key]=(...args)=>views.record('struct stairway',services[key](...args));
    Object.setPrototypeOf(env,services);return env;
}
