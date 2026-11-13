// Existing random species selection and biological helpers. Header expansions
// and static storage follow the original adapter; all selection policy stays
// in MAKEMON/MON/MONDATA and dungeon policy stays in DUNGEON.
import * as makemon from '../ported/makemon.js';
import privateAbi from './makemon-private-abi.json' with {type:'json'};
import {zombie_form,undead_to_corpse,can_be_hatched,dead_species} from '../ported/mon.js';
import {grownups,little_to_big,big_to_little} from '../ported/mondata.js';
import {obj_no_longer_held} from '../ported/do.js';
import {set_tin_variety,tin_variety,tintxts} from '../ported/eat.js';
import {assign_candy_wrapper} from '../ported/read.js';
import {createRecordViews} from './record-views.js';
export function enableMonsterSelection(environment,layouts) {
    const {services,transport,ctypes,memory}=environment,views=createRecordViews(environment);
    const record=(type,p)=>views.record(type,p),pointer=v=>environment.address(v);
    const common=new Proxy(Object.create(services),{get(target,key,receiver){if(Reflect.has(target,key))return Reflect.get(target,key,receiver);if(typeof key!=='string')return undefined;return (...args)=>environment.resolve(key)(...args);}});
    function base(layout,file){
        const env=Object.create(common);Object.defineProperties(env,Object.getOwnPropertyDescriptors(transport));Object.assign(env,layout,{
            int:transport.int,char:transport.char,long:transport.long,uint:transport.uint,boolean:transport.char,
            callLocal:(fn,...args)=>transport.scoped(fn,...args),abs:Math.abs,
            samePtr:(a,b)=>pointer(a)===pointer(b),monsndx:pm=>pm.pmidx,
            showdebug:file=>environment.resolve('debugcore')(typeof file==='string'?services.literal(file):pointer(file),1),
            impossible:(format,...args)=>environment.diagnostics.push(environment.libc.format(format,...args)),
            rngSource:(line,caller)=>{if(services.rng_log_enabled())services.rng_log_set_caller(services.literal(file),line,services.literal(caller));},
        });
        env.rn2=(n,line,caller)=>{if(line!==undefined)env.rngSource(line,caller);return services.rn2(n);};
        for(const [name,type]of Object.entries({u:'you',svm:'instance_globals_saved_m',svd:'instance_globals_saved_d',svl:'instance_globals_saved_l',iflags:'instance_flags'}))Object.defineProperty(env,name,{value:record('struct '+type,environment.requireGlobal(name))});
        Object.defineProperty(env,'mons',{value:views.array('struct permonst',environment.requireGlobal('mons'),layouts.monst.sizeof_mons/ctypes.size('struct permonst'))});
        return env;
    }
    const growth=base(layouts.mondata,'mondata.c');growth.grownups=grownups.map(row=>row.map(n=>typeof n==='string'?layouts.mondata[n]:n));
    environment.register('monster-growth-types',{little_to_big,big_to_little},growth);
    const mon=base(layouts.mon,'mon.c');
    for(const [key,value]of Object.entries(layouts.mon))if(typeof value==='string'&&/^-?\d+$/.test(value))mon[key]=BigInt(value);
    mon.is_elf=pm=>Number(Boolean(pm.mflags2&BigInt(layouts.mon.M2_ELF)));mon.is_dwarf=pm=>Number(Boolean(pm.mflags2&BigInt(layouts.mon.M2_DWARF)));mon.lays_eggs=pm=>Number(Boolean(pm.mflags1&BigInt(layouts.mon.M1_OVIPAROUS)));
    environment.register('species-biology',{zombie_form,undead_to_corpse,can_be_hatched,dead_species},mon,{prepareArgs:(fn,args)=>{if(fn==='zombie_form')args[0]=record('struct permonst',args[0]);return args;}});
    const held=base(layouts.do,'do.c');
    held.svc=record('struct instance_globals_saved_c',environment.requireGlobal('svc'));
    held.program_state=record('struct sinfo',environment.requireGlobal('program_state'));
    held.Has_contents=o=>Number(Boolean(o.cobj));
    held.rn2=(n,caller,line)=>{held.rngSource(line,caller);return services.rn2(n);};
    environment.register('object-held-state',{obj_no_longer_held},held,{prepareArgs:(_fn,args)=>[record('struct obj',args[0])]});
    const food=base(layouts.eat,'eat.c');food.tintxts=tintxts;
    food.boolean=transport.char;food.ismnum=n=>Number(n>=food.LOW_PM&&n<food.NUMMONS);
    food.is_rider=pm=>Number([food.PM_DEATH,food.PM_FAMINE,food.PM_PESTILENCE].includes(pm.pmidx));
    food.vegan=pm=>Number([food.S_BLOB,food.S_JELLY,food.S_FUNGUS,food.S_VORTEX,food.S_LIGHT].includes(pm.mlet)||(pm.mlet===food.S_ELEMENTAL&&pm.pmidx!==food.PM_STALKER)||(pm.mlet===food.S_GOLEM&&pm.pmidx!==food.PM_FLESH_GOLEM&&pm.pmidx!==food.PM_LEATHER_GOLEM)||pm.mlet===food.S_GHOST);
    food.vegetarian=pm=>Number(food.vegan(pm)||(pm.mlet===food.S_PUDDING&&pm.pmidx!==food.PM_BLACK_PUDDING));
    environment.register('tin-preparation',{set_tin_variety,tin_variety},food,{prepareArgs:(_fn,args)=>{args[0]=record('struct obj',args[0]);return args;}});
    const candy=base(layouts.read,'read.c');candy.SIZE=a=>a.length;
    environment.register('candy-wrapper',{assign_candy_wrapper},candy,{prepareArgs:(_fn,args)=>[record('struct obj',args[0])]});
    const env=base(layouts.makemon,'makemon.c'),L=layouts.makemon;
    const oldmoves=environment.allocateGlobal('makemon.oldmoves',8),lev=environment.allocateGlobal('makemon.lev',8);
    for(const[k,v]of Object.entries(privateAbi.constants))if(L[k]!==v)throw new Error('Review MAKEMON private extent '+k);
    const order=environment.allocateGlobal('makemon.mongen_order',privateAbi.storageBytes.mongen_order),maxf=environment.allocateGlobal('makemon.mclass_maxf',privateAbi.storageBytes.mclass_maxf),ready=environment.allocateGlobal('makemon.mongen_order_init',privateAbi.storageBytes.mongen_order_init);
    Object.defineProperties(env,{mongen_order:{value:views.array('int',order,L.NUMMONS)},mclass_maxf:{value:views.array('signed char',maxf,L.MAXMCLASSES)},mongen_order_init:{get:()=>memory.view.getInt8(ready),set:v=>memory.view.setInt8(ready,transport.char(v))}});
    env.mongenOrderAt=i=>env.mongen_order[transport.int(i)];env.intLoad=p=>memory.view.getInt32(pointer(p),true);
    // Actual source statics are initialized to 0L and NULL, respectively.
    Object.defineProperties(env,{
        oldmoves:{get:()=>memory.view.getBigInt64(oldmoves,true),set:v=>memory.view.setBigInt64(oldmoves,BigInt(v),true)},
        lev:{get:()=>record('struct s_level',memory.view.getBigUint64(lev,true)),set:v=>memory.view.setBigUint64(lev,BigInt(pointer(v)),true)},
        quest_dnum:{get:()=>env.svd.dungeon_topology.d_quest_dnum},Inhell:{get:()=>services.In_hell(env.u.uz)},
    });
    env.Is_special=level=>record('struct s_level',services.Is_special(level));
    const levelCheck=(level,name)=>{const target=env.svd.dungeon_topology['d_'+name];return Number(Boolean((target.dnum||target.dlevel)&&services.on_level(level,target)));};
    for(const name of ['air','astral','earth','fire','water'])env['Is_'+name+'level']=level=>levelCheck(level,name+'_level');
    env.Is_astralevel=env.Is_astrallevel;
    env.Is_rogue_level=level=>levelCheck(level,'rogue_level');env.In_endgame=level=>Number(level.dnum===env.svd.dungeon_topology.d_astral_level.dnum);
    // These are the original mondata.h/monst.h macro expansions, also present
    // verbatim in makemon-runtime.js; no replacement selection algorithm.
    env.monmin_difficulty=d=>Math.trunc(d/6);env.monmax_difficulty=d=>Math.trunc((d+env.u.ulevel)/2);
    env.montooweak=(n,d)=>Number(env.mons[n].difficulty<d);env.montoostrong=(n,d)=>Number(env.mons[n].difficulty>d);
    env.pm_resistance=(pm,res)=>Number(Boolean(pm.mresists&res));env.isupper=ch=>Number(ch>=65&&ch<=90);
    const symbols=views.array('struct class_sym',environment.requireGlobal('def_monsyms'),layouts.drawing.MAXMCLASSES);env.monsym=pm=>symbols[pm.mlet].sym;
    const flag=(pm,key,mask)=>Number(Boolean(pm[key]&BigInt(L[mask])));
    env.is_swimmer=pm=>flag(pm,'mflags1','M1_SWIM');env.is_flyer=pm=>flag(pm,'mflags1','M1_FLY');env.amorphous=pm=>flag(pm,'mflags1','M1_AMORPHOUS');env.noncorporeal=pm=>Number(pm.mlet===L.S_GHOST);env.is_whirly=pm=>Number(pm.mlet===L.S_VORTEX||pm.pmidx===L.PM_AIR_ELEMENTAL);env.is_floater=pm=>Number(pm.mlet===L.S_EYE||pm.mlet===L.S_LIGHT);
    environment.exposeAddressPort('dungeon',['Is_special','level_difficulty','depth','builds_up','deepest_lev_reached']);
    const names=['rndmonst','rndmonst_adj','uncommon','align_shift','temperature_shift','wrong_elem_type','is_home_elemental'];
    environment.register('monster-selection',Object.fromEntries(names.map(name=>[name,makemon[name]])),env,{prepareArgs:(fn,args)=>{if(['align_shift','temperature_shift','wrong_elem_type','is_home_elemental'].includes(fn))args[0]=record('struct permonst',args[0]);return args;}});
    return {environment:env,views,limitation:'Random species selection and biology helpers; full makemon placement, inventories, quest-specific owners and world interactions remain separate.'};
}
