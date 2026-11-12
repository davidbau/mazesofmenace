import { C } from '../c-runtime/context.js';
/* NetHack 5.0	mkobj.c	$NHDT-Date: 1764044196 2025/11/24 20:16:36 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.326 $ */
/* Copyright (c) Stichting Mathematisch Centrum, Amsterdam, 1985. */
/*-Copyright (c) Derek S. Ray, 2015. */
/* NetHack may be freely redistributed.  See license for details. */
/* probability of an item type */
/* item class */
export const mkobjprobs=C=>[[10,C.i8(C.WEAPON_CLASS)],[11,C.i8(C.ARMOR_CLASS)],[20,C.i8(C.FOOD_CLASS)],[8,C.i8(C.TOOL_CLASS)],[7,C.i8(C.GEM_CLASS)],[16,C.i8(C.POTION_CLASS)],[16,C.i8(C.SCROLL_CLASS)],[4,C.i8(C.SPBOOK_CLASS)],[4,C.i8(C.WAND_CLASS)],[3,C.i8(C.RING_CLASS)],[1,C.i8(C.AMULET_CLASS)]];
export const boxiprobs=C=>[[18,C.i8(C.GEM_CLASS)],[15,C.i8(C.FOOD_CLASS)],[18,C.i8(C.POTION_CLASS)],[18,C.i8(C.SCROLL_CLASS)],[12,C.i8(C.SPBOOK_CLASS)],[7,C.i8(C.COIN_CLASS)],[6,C.i8(C.WAND_CLASS)],[5,C.i8(C.RING_CLASS)],[1,C.i8(C.AMULET_CLASS)]];
export const rogueprobs=C=>[[12,C.i8(C.WEAPON_CLASS)],[12,C.i8(C.ARMOR_CLASS)],[22,C.i8(C.FOOD_CLASS)],[22,C.i8(C.POTION_CLASS)],[22,C.i8(C.SCROLL_CLASS)],[5,C.i8(C.WAND_CLASS)],[5,C.i8(C.RING_CLASS)]];
export const hellprobs=C=>[[20,C.i8(C.WEAPON_CLASS)],[20,C.i8(C.ARMOR_CLASS)],[16,C.i8(C.FOOD_CLASS)],[12,C.i8(C.TOOL_CLASS)],[10,C.i8(C.GEM_CLASS)],[1,C.i8(C.POTION_CLASS)],[1,C.i8(C.SCROLL_CLASS)],[8,C.i8(C.WAND_CLASS)],[8,C.i8(C.RING_CLASS)],[4,C.i8(C.AMULET_CLASS)]];
export const zerooextra=C=>[0,C.ptr(0),C.ptr(0),C.u32(0)];
export function init_oextra(oex)
{
    C.copyRecord(oex,C.zerooextra,C.sizes["struct oextra"]);
}

export function newoextra()
{
    let oextra;
    (oextra=C.alloc(C.u32(BigInt(C.sizes["struct oextra"]))));
    init_oextra(oextra);
    return oextra;
}

export function dealloc_oextra(o)
{
    let x=C.field(o,"obj","oextra").value;
    if(x) {
        if(C.field(x,"oextra","oname").value) (C.free(C.field(x,"oextra","oname").value),(C.field(x,"oextra","oname").value=0));
        if(C.field(x,"oextra","omonst").value) free_omonst(o);
        /* note: pass 'o' rather than 'x' */
        if(C.field(x,"oextra","omailcmd").value) (C.free(C.field(x,"oextra","omailcmd").value),(C.field(x,"oextra","omailcmd").value=0));
        C.free(x);
        (C.field(o,"obj","oextra").value=0);
    }
}

export function newomonst(otmp)
{
    if(Number(!(C.field(otmp,"obj","oextra").value))) (C.field(otmp,"obj","oextra").value=newoextra());
    if(Number(!((C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value)))) {
        let m=C.alloc(C.u32(BigInt(C.sizes["struct monst"])));
        C.copyRecord(m,C.field(C.cg,"const_globals","zeromonst").address,C.sizes["struct monst"]);
        ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value)=m);
    }
}

export function free_omonst(otmp)
{
    if(C.field(otmp,"obj","oextra").value) {
        let m=(C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value);
        if(m) {
            if(C.field(m,"monst","mextra").value) C.dealloc_mextra(m);
            C.free(m);
            ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omonst").value)=0);
        }
    }
}

export function newomid(otmp)
{
    if(Number(!(C.field(otmp,"obj","oextra").value))) (C.field(otmp,"obj","oextra").value=newoextra());
    ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omid").value)=C.u32(0));
}

export function free_omid(otmp)
{
    ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omid").value)=C.u32(0));
}

export function new_omailcmd(otmp,response_cmd)
{
    if(Number(!(C.field(otmp,"obj","oextra").value))) (C.field(otmp,"obj","oextra").value=newoextra());
    if((C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value)) free_omailcmd(otmp);
    ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value)=C.dupstr(response_cmd));
}

export function free_omailcmd(otmp)
{
    if(Number(!!(C.field(otmp,"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value)))) {
        C.free((C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value));
        ((C.field(C.field((otmp),"obj","oextra").value,"oextra","omailcmd").value)=0);
    }
}

/* can object be generated eroded? */
export function may_generate_eroded(otmp)
{
    /* initial hero inventory */
    if(Number(!!(Number(C.field(C.svm,"instance_globals_saved_m","moves").value<=C.i64(1))&&Number(!(C.field(C.gi,"instance_globals_i","in_mklev").value))))) return (C.i8(0));
    /* already erodeproof or cannot be eroded */
    if(Number(!!(Number(!!(C.i32(C.field(otmp,"obj","oerodeproof").value)||Number(!(C.erosion_matters(otmp)))))||Number(!((Number(!!(Number(!!(Number(!!(Number(!!((Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.IRON))||C.i32(is_flammable(otmp))))||C.i32(is_rottable(otmp))))||(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.COPPER)||Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.IRON))))))||(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)&&Number(C.i32(C.field((otmp),"obj","oclass").value)==C.ARMOR_CLASS)))))))))))) return (C.i8(0));
    /* part of a monster's body and produced when it dies */
    if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WORM_TOOTH)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.UNICORN_HORN)))) return (C.i8(0));
    /* artifacts cannot be generated eroded  */
    if(C.field(otmp,"obj","oartifact").value) return (C.i8(0));
    return (C.i8(1));
}

/* random chance of applying erosions/grease to object */
export function mkobj_erosions(otmp)
{
    if(may_generate_eroded(otmp)) {
        /* A small fraction of non-artifact items will generate eroded or
         * possibly erodeproof. An item that generates eroded will never be
         * erodeproof, and vice versa. */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),202,(C.literal("mkobj_erosions"))),C.rn2(100))):C.rn2(100)))))) {
            (C.field(otmp,"obj","oerodeproof").value=C.u32(1));
        } else {
            if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),205,(C.literal("mkobj_erosions"))),C.rn2(80))):C.rn2(80)))))&&(Number(!!(Number(!!(C.i32(is_flammable(otmp))||(Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.IRON))))||(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field((otmp),"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.GLASS)&&Number(C.i32(C.field((otmp),"obj","oclass").value)==C.ARMOR_CLASS)))))))))) {
                do {
                    ((C.field(otmp,"obj","oeroded").value=C.u32((C.field(otmp,"obj","oeroded").value+1)))-1);
                } while(Number(!!(Number(C.i32(C.field(otmp,"obj","oeroded").value)<3)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),209,(C.literal("mkobj_erosions"))),C.rn2(9))):C.rn2(9))))))));
            }
            if(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),211,(C.literal("mkobj_erosions"))),C.rn2(80))):C.rn2(80)))))&&(Number(!!(C.i32(is_rottable(otmp))||(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.COPPER)||Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.IRON)))))))))) {
                do {
                    ((C.field(otmp,"obj","oeroded2").value=C.u32((C.field(otmp,"obj","oeroded2").value+1)))-1);
                } while(Number(!!(Number(C.i32(C.field(otmp,"obj","oeroded2").value)<3)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),214,(C.literal("mkobj_erosions"))),C.rn2(9))):C.rn2(9))))))));
            }
        }
        /* and an extremely small fraction of the time, erodable items
         * will generate greased */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),219,(C.literal("mkobj_erosions"))),C.rn2(1000))):C.rn2(1000)))))) (C.field(otmp,"obj","greased").value=C.u32(1));
    }
}

/* make a random object of class 'let' at a specific location;
   'let' might be random class; place_object() will validate <x,y> */
export function mkobj_at(let_,x,y,artif)
{
    let_=C.i8(let_);
    x=C.i16(x);
    y=C.i16(y);
    artif=C.i8(artif);
    let otmp;
    (otmp=mkobj(C.i32(let_),artif));
    place_object(otmp,x,y);
    return otmp;
}

/* make a specific object at a specific location */
export function mksobj_at(otyp,x,y,init,artif)
{
    otyp=C.i32(otyp);
    x=C.i16(x);
    y=C.i16(y);
    init=C.i8(init);
    artif=C.i8(artif);
    let otmp;
    (otmp=mksobj(otyp,init,artif));
    place_object(otmp,x,y);
    return otmp;
}

/* used for extra orctown loot */
export function mksobj_migr_to_species(otyp,mflags2,init,artif)
{
    otyp=C.i32(otyp);
    mflags2=C.u32(mflags2);
    init=C.i8(init);
    artif=C.i8(artif);
    let otmp;
    (otmp=mksobj(otyp,init,artif));
    add_to_migration(otmp);
    (C.field(otmp,"obj","owornmask").value=C.i64(4096));
    (C.field(otmp,"obj","corpsenm").value=C.i32(mflags2));
    return otmp;
}

/* mkobj(): select a type of item from a class, use mksobj() to create it;
   result is always non-Null */
export function mkobj(oclass,artif)
{
    oclass=C.i32(oclass);
    artif=C.i8(artif);
    let tprob; let i; let prob;
    if(Number(oclass==C.RANDOM_CLASS)) {
        let iprobs=(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))?C.rogueprobs:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.hellprobs:C.mkobjprobs));
        for((tprob=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),280,(C.literal("mkobj"))),C.rnd(100))):C.rnd(100))));Number(((tprob=C.i32(tprob-C.field(iprobs,"icp","iprob").value)))>0);((iprobs=C.ptr((iprobs+Number(C.sizes["struct icp"]))))-Number(C.sizes["struct icp"]))) continue;

        (oclass=C.i32(C.field(iprobs,"icp","iclass").value));
    }
    if(Number(oclass==(C.i32((0-C.SPBOOK_CLASS))))) {
        (i=C.rnd_class(C.cell((C.field(C.svb,"instance_globals_saved_b","bases").address+Number(C.SPBOOK_CLASS)*4),"int").value,C.SPE_BLANK_PAPER));
        (oclass=C.SPBOOK_CLASS);
        /* for sanity check below */
    } else {
        (prob=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),289,(C.literal("mkobj"))),C.rnd(C.i32(C.cell((C.field(C.go,"instance_globals_o","oclass_prob_totals").address+Number(oclass)*2),"short").value)))):C.rnd(C.i32(C.cell((C.field(C.go,"instance_globals_o","oclass_prob_totals").address+Number(oclass)*2),"short").value)))));
        (i=C.cell((C.field(C.svb,"instance_globals_saved_b","bases").address+Number(oclass)*4),"int").value);
        while(Number(((prob=C.i32(prob-C.i32(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_prob").value))))>0)) (i=C.i32((i+1)));

    }
    if(Number(!!(Number(C.i32(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_class").value)!=oclass)||Number(!((C.field((C.obj_descr+Number(C.field((C.objects+Number(i)*C.sizes["struct objclass"]),"objclass","oc_name_idx").value)*C.sizes["struct objdescr"]),"objdescr","oc_name").value)))))) {
        C.variadic(0,C.literal("probtype error, oclass=%d i=%d"),oclass,i);
        (i=C.cell((C.field(C.svb,"instance_globals_saved_b","bases").address+Number(oclass)*4),"int").value);
    }
    return mksobj(i,(C.i8(1)),artif);
}

export function mkbox_cnts(box)
{
    let n;
    let otmp;
    (C.field(box,"obj","cobj").value=0);
    switch(C.i32(C.field(box,"obj","otyp").value)) {
        case (C.ICE_BOX):
            (n=20);
        break;
        case (C.CHEST):
            (n=(C.i32(C.field(box,"obj","olocked").value)?7:5));
        break;
        case (C.LARGE_BOX):
            (n=(C.i32(C.field(box,"obj","olocked").value)?5:3));
        break;
        case (C.SACK):
            case (C.OILSKIN_SACK):
                /* initial inventory: sack starts out empty */
                if(Number(!!(Number(C.field(C.svm,"instance_globals_saved_m","moves").value<=C.i64(1))&&Number(!(C.field(C.gi,"instance_globals_i","in_mklev").value))))) {
                    (n=0);
                    break;
                }
        ;
        /*FALLTHRU*/
        case (C.BAG_OF_HOLDING):
            (n=1);
        break;
        default:
            (n=0);
        break;
    }
    for((n=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),338,(C.literal("mkbox_cnts"))),C.rn2(C.i32((n+1))))):C.rn2(C.i32((n+1))))));Number(n>0);((n=C.i32((n-1)))+1)) {
        if(Number(C.i32(C.field(box,"obj","otyp").value)==C.ICE_BOX)) {
            (otmp=mksobj(C.CORPSE,(C.i8(1)),(C.i8(0))));
            /* Note: setting age to 0 is correct.  Age has a different
             * from usual meaning for objects stored in ice boxes. -KAA
             */
            (C.field(otmp,"obj","age").value=0n);
            if(C.field(otmp,"obj","timed").value) {
                C.stop_timer(C.i16(C.ROT_CORPSE),C.obj_to_any(otmp));
                C.stop_timer(C.i16(C.REVIVE_MON),C.obj_to_any(otmp));
                C.stop_timer(C.i16(C.SHRINK_GLOB),C.obj_to_any(otmp));
            }
        } else {
            let tprob;
            let iprobs=C.boxiprobs;
            for((tprob=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),354,(C.literal("mkbox_cnts"))),C.rnd(100))):C.rnd(100))));Number(((tprob=C.i32(tprob-C.field(iprobs,"icp","iprob").value)))>0);((iprobs=C.ptr((iprobs+Number(C.sizes["struct icp"]))))-Number(C.sizes["struct icp"]))) ;

            if(Number(!(((otmp=mkobj(C.i32(C.field(iprobs,"icp","iclass").value),(C.i8(0)))))))) continue;
            /* handle a couple of special cases */
            if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) {
                /* 2.5 x level's usual amount; weight adjusted below */
                (C.field(otmp,"obj","quan").value=C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),362,(C.literal("mkbox_cnts"))),C.rnd(C.i32((C.i32(C.level_difficulty())+2))))):C.rnd(C.i32((C.i32(C.level_difficulty())+2)))))*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),362,(C.literal("mkbox_cnts"))),C.rnd(75))):C.rnd(75))))))));
                (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
            } else while(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)) {
                (C.field(otmp,"obj","otyp").value=C.i16(C.rnd_class(C.DILITHIUM_CRYSTAL,C.LOADSTONE)));
                if(Number(C.field(otmp,"obj","quan").value>2n)) (C.field(otmp,"obj","quan").value=1n);
                (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
            }
            if(Number(C.i32(C.field(box,"obj","otyp").value)==C.BAG_OF_HOLDING)) {
                if((Number(!!(Number(C.i32(C.field((otmp),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((otmp),"obj","otyp").value)==C.BAG_OF_TRICKS))))) {
                    (C.field(otmp,"obj","otyp").value=C.i16(C.SACK));
                    (C.field(otmp,"obj","spe").value=C.i8(0));
                    (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
                } else while(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAN_CANCELLATION)) (C.field(otmp,"obj","otyp").value=C.i16(C.rnd_class(C.WAN_LIGHT,C.WAN_LIGHTNING)));

            }
        }
        add_to_container(box,otmp);
    }
    /* caller will update box->owt */
}

/* select a random, common monster type */
export function rndmonnum()
{
    return rndmonnum_adj(0,0);
}

/* select a random, common monster type, with adjusted difficulty */
export function rndmonnum_adj(minadj,maxadj)
{
    minadj=C.i32(minadj);
    maxadj=C.i32(maxadj);
    let ptr;
    let i;
    let excludeflags;
    /* Plan A: get a level-appropriate common monster */
    (ptr=C.rndmonst_adj(minadj,maxadj));
    if(ptr) return C.i32((C.field((ptr),"permonst","pmidx").value));
    /* Plan B: get any common monster */
    (excludeflags=C.u16(C.i32((C.i32((4096|512))|((C.i32(C.In_hell(C.field(C.u,"you","uz").address))?2048:1024))))));
    do {
        (i=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),409,(C.literal("rndmonnum_adj"))),C.rn2(C.i32((C.SPECIAL_PM-C.LOW_PM))))):C.rn2(C.i32((C.SPECIAL_PM-C.LOW_PM)))))+(C.LOW_PM)))));
        (ptr=(C.mons+Number(i)*C.sizes["struct permonst"]));
    } while(Number((C.i32((C.i32(C.field(ptr,"permonst","geno").value)&C.i32(excludeflags))))!=0));
    return i;
}

export function copy_oextra(obj2,obj1)
{
    if(Number(!!(Number(!!(Number(!(obj2))||Number(!(obj1))))||Number(!(C.field(obj1,"obj","oextra").value))))) return;
    if(Number(!(C.field(obj2,"obj","oextra").value))) (C.field(obj2,"obj","oextra").value=newoextra());
    if((Number(!!(C.field((obj1),"obj","oextra").value&&(C.field(C.field((obj1),"obj","oextra").value,"oextra","oname").value))))) C.oname(obj2,(C.field(C.field((obj1),"obj","oextra").value,"oextra","oname").value),512);
    if((Number(!!(C.field((obj1),"obj","oextra").value&&(C.field(C.field((obj1),"obj","oextra").value,"oextra","omonst").value))))) {
        if(Number(!((C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value)))) newomonst(obj2);
        ((Number(!!(((Number(!!(C.field((obj2),"obj","oextra").value&&(C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value)))))||((C.__assert_fail(C.literal("has_omonst(obj2)"),C.literal("mkobj.c"),429,(C.literal("copy_oextra"))),0))))));
        C.memcpy((C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value),(C.field(C.field((obj1),"obj","oextra").value,"oextra","omonst").value),BigInt(C.sizes["struct monst"]));
        (C.field((C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value),"monst","mextra").value=0);
        (C.field((C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value),"monst","nmon").value=0);
        if(C.field((C.field(C.field((obj1),"obj","oextra").value,"oextra","omonst").value),"monst","mextra").value) C.copy_mextra((C.field(C.field((obj2),"obj","oextra").value,"oextra","omonst").value),(C.field(C.field((obj1),"obj","oextra").value,"oextra","omonst").value));
    }
    if((Number(!!(C.field((obj1),"obj","oextra").value&&(C.field(C.field((obj1),"obj","oextra").value,"oextra","omailcmd").value))))) {
        new_omailcmd(obj2,(C.field(C.field((obj1),"obj","oextra").value,"oextra","omailcmd").value));
    }
    if((Number(!!(C.field((obj1),"obj","oextra").value&&(C.field(C.field((obj1),"obj","oextra").value,"oextra","omid").value))))) {
        if(Number(!((C.field(C.field((obj2),"obj","oextra").value,"oextra","omid").value)))) newomid(obj2);
        ((C.field(C.field((obj2),"obj","oextra").value,"oextra","omid").value)=(C.field(C.field((obj1),"obj","oextra").value,"oextra","omid").value));
    }
}

/*
 * Split stack so that its size gets reduced by num.  The quantity num is
 * put in the object structure delivered by this call.  The returned object
 * has its wornmask cleared and is positioned just following the original
 * in the nobj chain (and nexthere chain when on the floor).
 */
export function splitobj(obj,num)
{
    num=C.i64(num);
    let otmp;
    /* can't split containers */
    if(Number(!!(Number(!!(C.field(obj,"obj","cobj").value||Number(num<=0n)))||Number(C.field(obj,"obj","quan").value<=num)))) C.variadic(1,C.literal("splitobj [cobj=%s num=%ld quan=%ld]"),(C.field(obj,"obj","cobj").value?C.literal("non-empty container"):C.literal("(null)")),num,C.field(obj,"obj","quan").value);
    (otmp=C.alloc(C.u32(BigInt(C.sizes["struct obj"]))));
    C.copyRecord(otmp,obj,C.sizes["struct obj"]);
    /* copies whole structure */
    (C.field(otmp,"obj","oextra").value=0);
    (C.field(otmp,"obj","o_id").value=nextoid(obj,otmp));
    (C.field(otmp,"obj","timed").value=C.i16(0));
    /* not timed, yet */
    (C.field(otmp,"obj","lamplit").value=C.u32(0));
    /* ditto */
    (C.field(otmp,"obj","owornmask").value=0n);
    /* new object isn't worn */
    (C.field(obj,"obj","quan").value=C.i64(C.field(obj,"obj","quan").value-num));
    (C.field(obj,"obj","owt").value=C.u32(weight(obj)));
    (C.field(otmp,"obj","quan").value=num);
    (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
    /* -= obj->owt ? */
    (C.field(otmp,"obj","lua_ref_cnt").value=C.u32(0));
    (C.field(otmp,"obj","pickup_prev").value=C.u32(0));
    (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value=C.field(obj,"obj","o_id").value);
    (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value=C.field(otmp,"obj","o_id").value);
    (C.field(obj,"obj","nobj").value=otmp);
    /* Only set nexthere when on the floor; nexthere is also used
       as a back pointer to the container object when contained.
       For either case, otmp's nexthere pointer is already pointing
       at the right thing. */
    if(Number(C.i32(C.field(obj,"obj","where").value)==1)) (C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value=otmp);
    /* insert into chain: obj -> otmp -> next */
    /* lua isn't tracking the split off portion even if it happens to
       be tracking the original */
    if(Number(C.i32(C.field(otmp,"obj","where").value)==8)) (C.field(otmp,"obj","where").value=C.i8(0));
    if(C.field(obj,"obj","unpaid").value) C.splitbill(obj,otmp);
    copy_oextra(otmp,obj);
    if((Number(!!(C.field((otmp),"obj","oextra").value&&(C.field(C.field((otmp),"obj","oextra").value,"oextra","omid").value))))) free_omid(otmp);
    /* only one association with m_id */
    if(C.field(obj,"obj","timed").value) C.obj_split_timers(obj,otmp);
    if(C.obj_sheds_light(obj)) C.obj_split_light_source(obj,otmp);
    return otmp;
}

/* return the value of context.ident and then increment it to be ready for
   its next use; used to be simple += 1 so that every value from 1 to N got
   used but now has a random increase that skips half of potential values */
export function next_ident()
{
    let res=C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value;
    /* +rnd(2): originally just +1; changed to rnd() to avoid potential
       exploit of player using #adjust to split an object stack in a manner
       that makes most recent ident%2 known; since #adjust takes no time,
       no intervening activity like random creation of a new monster will
       take place before next user command; with former +1, o_id%2 of the
       next object to be created was knowable and player could make a wish
       under controlled circumstances for an item that is affected by the
       low bits of its obj->o_id [particularly helm of opposite alignment] */
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value=C.u32(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value+C.u32(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),521,(C.literal("next_ident"))),C.rnd(2))):C.rnd(2))))));
    /* ready for next new object or monster */
    /* if ident has wrapped to 0, force it to be non-zero; if/when it
       ever wraps past 0 (unlikely, but possible on a configuration which
       uses 16-bit 'int'), just live with that and hope no o_id conflicts
       between objects or m_id conflicts between monsters arise */
    if(Number(!(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value))) (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value=C.u32(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),528,(C.literal("next_ident"))),C.rnd(2))):C.rnd(2)))+1))));
    /* id 1 is reserved */
    return res;
}

/* when splitting a stack that has o_id-based shop prices, pick an
   o_id value for the new stack that will maintain the same price */
export function nextoid(oldobj,newobj)
{
    let olddif; let newdif; let trylimit=256;
    /* limit of 4 suffices at present */
    let oid=C.u32((C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value-C.u32(1)));
    /* loop increment will reverse -1 */
    (olddif=C.oid_price_adjustment(oldobj,C.field(oldobj,"obj","o_id").value));
    do {
        (oid=C.u32((oid+1)));
        if(Number(!(oid))) (oid=C.u32((oid+1)));
        /* avoid using 0 (in case value wrapped) */
        (newdif=C.oid_price_adjustment(newobj,oid));
    } while(Number(!!(Number(newdif!=olddif)&&Number((trylimit=C.i32((trylimit-1)))>=0))));
    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","ident").value=oid);
    /* update 'last ident used' */
    next_ident();
    /* increment context.ident for next use */
    return oid;
    /* caller will use this ident */
}

/* try to find the stack obj was split from, then merge them back together;
   returns the combined object if unsplit is successful, null otherwise */
export function unsplitobj(obj)
{
    const stackFrame=C.stackSave();
    try {
    let target_oid=C.u32(0);
    let oparentAddress=C.stackAlloc(8); C.cell(oparentAddress,"struct obj *").value=0; let ochildAddress=C.stackAlloc(8); C.cell(ochildAddress,"struct obj *").value=0; let list=0;
    /*
     * We don't operate on floor objects (we're following o->nobj rather
     * than o->nexthere), on free objects (don't know which list to use when
     * looking for obj's parent or child), on bill objects (too complicated,
     * not needed), or on buried or migrating objects (not needed).
     * [This could be improved, but at present additional generality isn't
     * necessary.]
     */
    switch(C.i32(C.field(obj,"obj","where").value)) {
        case (0):
            case (1):
                case (7):
                    case (5):
                        case (6):
                            default:
                                return 0;
        case (3):
            (list=C.field(C.gi,"instance_globals_i","invent").value);
        break;
        case (4):
            (list=C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value,"monst","minvent").value);
        break;
        case (2):
            (list=C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value,"obj","cobj").value);
        break;
    }
    /* first try the expected case; obj is split from another stack */
    if(Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value)) {
        /* parent probably precedes child and will require list traversal */
        (C.cell(ochildAddress,"struct obj *").value=obj);
        (target_oid=C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value);
        if(Number(!!(C.field(obj,"obj","nobj").value&&Number(C.field(C.field(obj,"obj","nobj").value,"obj","o_id").value==target_oid)))) (C.cell(oparentAddress,"struct obj *").value=C.field(obj,"obj","nobj").value);
    } else if(Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value)) {
        /* alternate scenario: another stack was split from obj;
           child probably follows parent and will be found here */
        (C.cell(oparentAddress,"struct obj *").value=obj);
        (target_oid=C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value);
        if(Number(!!(C.field(obj,"obj","nobj").value&&Number(C.field(C.field(obj,"obj","nobj").value,"obj","o_id").value==target_oid)))) (C.cell(ochildAddress,"struct obj *").value=C.field(obj,"obj","nobj").value);
    }
    /* if we have only half the split, scan obj's list to find other half */
    if(Number(!!(C.cell(ochildAddress,"struct obj *").value&&Number(!(C.cell(oparentAddress,"struct obj *").value))))) {
        /* expected case */
        for((obj=list);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(C.field(obj,"obj","o_id").value==target_oid)) {
            (C.cell(oparentAddress,"struct obj *").value=obj);
            break;
        }

    } else if(Number(!!(C.cell(oparentAddress,"struct obj *").value&&Number(!(C.cell(ochildAddress,"struct obj *").value))))) {
        /* alternate scenario */
        for((obj=list);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(C.field(obj,"obj","o_id").value==target_oid)) {
            (C.cell(ochildAddress,"struct obj *").value=obj);
            break;
        }

    }
    /* if we have both parent and child, try to merge them;
       if successful, return the combined stack, otherwise return null */
    return ((Number(!!(Number(!!(C.cell(oparentAddress,"struct obj *").value&&C.cell(ochildAddress,"struct obj *").value))&&C.merged(oparentAddress,ochildAddress))))?C.cell(oparentAddress,"struct obj *").value:0);
    } finally {C.stackRestore(stackFrame); }
}

/* reset splitobj()/unsplitobj() context */
export function clear_splitobjs()
{
    (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value=(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value=C.u32(0)));
}

/*
 * Insert otmp right after obj in whatever chain(s) it is on.  Then extract
 * obj from the chain(s).  This function does a literal swap.  It is up to
 * the caller to provide a valid context for the swap.  When done, obj will
 * still exist, but not on any chain.
 *
 * Note:  Don't use obj_extract_self() -- we are doing an in-place swap,
 * not actually moving something.
 */
export function replace_object(obj,otmp)
{
    (C.field(otmp,"obj","where").value=C.field(obj,"obj","where").value);
    switch(C.i32(C.field(obj,"obj","where").value)) {
        case (0):
            /* do nothing */
            break;
        case (3):
            (C.field(otmp,"obj","nobj").value=C.field(obj,"obj","nobj").value);
        (C.field(obj,"obj","nobj").value=otmp);
        extract_nobj(obj,C.field(C.gi,"instance_globals_i","invent").address);
        break;
        case (2):
            (C.field(otmp,"obj","nobj").value=C.field(obj,"obj","nobj").value);
        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_ocontainer").value=C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value);
        (C.field(obj,"obj","nobj").value=otmp);
        extract_nobj(obj,C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value,"obj","cobj").address);
        break;
        case (4):
            (C.field(otmp,"obj","nobj").value=C.field(obj,"obj","nobj").value);
        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_ocarry").value=C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value);
        (C.field(obj,"obj","nobj").value=otmp);
        extract_nobj(obj,C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value,"monst","minvent").address);
        break;
        case (1):
            (C.field(otmp,"obj","nobj").value=C.field(obj,"obj","nobj").value);
        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value=C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value);
        (C.field(otmp,"obj","ox").value=C.field(obj,"obj","ox").value);
        (C.field(otmp,"obj","oy").value=C.field(obj,"obj","oy").value);
        (C.field(obj,"obj","nobj").value=otmp);
        (C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value=otmp);
        extract_nobj(obj,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").address);
        extract_nexthere(obj,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(C.field(obj,"obj","ox").value)*(8*21))+Number(C.field(obj,"obj","oy").value)*8));
        break;
        default:
            C.variadic(2,C.literal("replace_object: obj position"));
        break;
    }
}

/* is 'obj' inside a container whose contents aren't known?
   if so, return the outermost container meeting that criterium */
export function unknwn_contnr_contents(obj)
{
    let result=0; let parent;
    while(Number(C.i32(C.field(obj,"obj","where").value)==2)) {
        (parent=C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value);
        if(Number(!(C.field(parent,"obj","cknown").value))) (result=parent);
        (obj=parent);
    }
    return result;
}

/*
 * Create a dummy duplicate to put on shop bill.  The duplicate exists
 * only in the billobjs chain.  This function is used when a shop object
 * is being altered, and a copy of the original is needed for billing
 * purposes.  For example, when eating, where an interruption will yield
 * an object which is different from what it started out as; the "I x"
 * command needs to display the original object.
 *
 * The caller is responsible for checking otmp->unpaid and
 * costly_spot(u.ux, u.uy).  This function will make otmp no charge.
 *
 * Note that check_unpaid_usage() should be used instead for partial
 * usage of an object.
 */
export function bill_dummy_object(otmp)
{
    let dummy;
    let cost=0n;
    if(C.field(otmp,"obj","unpaid").value) {
        (cost=C.unpaid_cost(otmp,C.u8(C.COST_SINGLEOBJ)));
        C.subfrombill(otmp,C.shop_keeper(C.cell(C.field(C.u,"you","ushops").address,"char").value));
    }
    (dummy=C.alloc(C.u32(BigInt(C.sizes["struct obj"]))));
    C.copyRecord(dummy,otmp,C.sizes["struct obj"]);
    (C.field(dummy,"obj","oextra").value=0);
    (C.field(dummy,"obj","where").value=C.i8(0));
    (C.field(dummy,"obj","o_id").value=nextoid(otmp,dummy));
    (C.field(dummy,"obj","timed").value=C.i16(0));
    copy_oextra(dummy,otmp);
    if((Number(!!(C.field((dummy),"obj","oextra").value&&(C.field(C.field((dummy),"obj","oextra").value,"oextra","omid").value))))) free_omid(dummy);
    /* only one association with m_id */
    if((Number(!!(Number(C.i32(C.field(dummy,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(dummy,"obj","otyp").value)==C.WAX_CANDLE))))) (C.field(dummy,"obj","lamplit").value=C.u32(0));
    (C.field(dummy,"obj","owornmask").value=0n);
    /* dummy object is not worn */
    C.addtobill(dummy,(C.i8(0)),(C.i8(1)),(C.i8(1)));
    if(Number(!!(cost&&Number(C.i32(C.field(dummy,"obj","where").value)!=9)))) C.alter_cost(dummy,C.i64((-cost)));
    /* no_charge is only valid for some locations */
    (C.field(otmp,"obj","no_charge").value=C.u32(((Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)==1)||Number(C.i32(C.field(otmp,"obj","where").value)==2))))?1:0)));
    (C.field(otmp,"obj","unpaid").value=C.u32(0));
    return;
}

/* alteration types; must match COST_xxx macros in hack.h */
export const alteration_verbs=C=>[C.literal("cancel"),C.literal("drain"),C.literal("uncharge"),C.literal("unbless"),C.literal("uncurse"),C.literal("disenchant"),C.literal("degrade"),C.literal("dilute"),C.literal("erase"),C.literal("burn"),C.literal("neutralize"),C.literal("destroy"),C.literal("splatter"),C.literal("bite"),C.literal("open"),C.literal("break the lock on"),C.literal("rust"),C.literal("rot"),C.literal("tarnish"),C.literal("crack")];
/* possibly bill for an object which the player has just modified */
export function costly_alteration(obj,alter_type)
{
    alter_type=C.i32(alter_type);
    const stackFrame=C.stackSave();
    try {
    let oxAddress=C.stackAlloc(2); let oyAddress=C.stackAlloc(2);
    let objroom;
    let learn_bknown;
    let those; let them;
    let shkpAddress=C.stackAlloc(8); C.cell(shkpAddress,"struct monst *").value=0;
    if(Number(!!(Number(alter_type<0)||Number(alter_type>=C.i32((C.u64((BigInt((8*20))/BigInt(8))))))))) {
        C.variadic(3,C.literal("invalid alteration type (%d)"),alter_type);
        (alter_type=0);
    }
    (C.cell(oxAddress,"short").value=(C.cell(oyAddress,"short").value=C.i16(0)));
    /* lint suppression */
    (objroom=C.i8(0));
    /* ditto */
    if(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))||Number(C.i32(C.field(obj,"obj","where").value)==0)))) {
        /* OBJ_FREE catches obj_no_longer_held()'s transformation
           of crysknife back into worm tooth; the object has been
           removed from inventory but not necessarily placed at
           its new location yet--the unpaid flag will still be set
           if this item is owned by a shop */
        if(Number(!(C.field(obj,"obj","unpaid").value))) return;
    } else {
        /* this get_obj_location shouldn't fail, but if it does,
           use hero's location */
        if(Number(!(C.get_obj_location(obj,oxAddress,oyAddress,1)))) ((C.cell(oxAddress,"short").value=C.field(C.u,"you","ux").value),(C.cell(oyAddress,"short").value=C.field(C.u,"you","uy").value));
        if(Number(!(C.costly_spot(C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value)))) return;
        (objroom=C.cell(C.in_rooms(C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value,C.SHOPBASE),"char").value);
        /* if no shop cares about it, we're done */
        if(Number(!(C.billable(shkpAddress,obj,objroom,(C.i8(0)))))) return;
    }
    if(Number(C.field(obj,"obj","quan").value==1n)) ((those=C.literal("that")),(them=C.literal("it")));
 else ((those=C.literal("those")),(them=C.literal("them")));
    /* when shopkeeper describes the object as being uncursed or unblessed
       hero will know that it is now uncursed; will also make the feedback
       from `I x' after bill_dummy_object() be more specific for this item */
    (learn_bknown=C.i8((Number(!!(Number(alter_type==C.COST_UNCURS)||Number(alter_type==C.COST_UNBLSS))))));
    switch(C.i32(C.field(obj,"obj","where").value)) {
        case (0):
            /* obj_no_longer_held() */
            case (3):
                if(learn_bknown) set_bknown(obj,C.u32(1));
        if(C.cell(shkpAddress,"struct monst *").value) {
            ;
        }
        C.variadic(4,C.literal("You %s %s %s, you pay for %s!"),C.cell((C.alteration_verbs+Number(alter_type)*8),"char *").value,those,C.simpleonames(obj),them);
        bill_dummy_object(obj);
        break;
        case (1):
            if(learn_bknown) (C.field(obj,"obj","bknown").value=C.u32(1));
        /* ok to bypass set_bknown() here */
        if(Number(!!(C.i32(C.costly_spot(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))&&Number(C.i32(objroom)==C.i32(C.cell(C.field(C.u,"you","ushops").address,"char").value))))) {
            if(C.cell(shkpAddress,"struct monst *").value) {
                ;
            }
            C.variadic(5,C.literal("You %s %s, you pay for %s!"),C.cell((C.alteration_verbs+Number(alter_type)*8),"char *").value,those,them);
            bill_dummy_object(obj);
        } else {
            C.stolen_value(obj,C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value,(C.i8(0)),(C.i8(0)));
        }
        break;
    }
    } finally {C.stackRestore(stackFrame); }
}

export const dknowns=C=>[C.i8(C.WAND_CLASS),C.i8(C.RING_CLASS),C.i8(C.POTION_CLASS),C.i8(C.SCROLL_CLASS),C.i8(C.GEM_CLASS),C.i8(C.SPBOOK_CLASS),C.i8(C.WEAPON_CLASS),C.i8(C.TOOL_CLASS),C.i8(C.VENOM_CLASS),C.i8(0)];
/* set obj->dknown to 0 for most types of objects, to 1 otherwise;
   split off from unknow_object() */
export function clear_dknown(obj)
{
    /* note: this is an unobserving not an observing, so don't call
       observe_object even if dknown is being set to 1 */
    (C.field(obj,"obj","dknown").value=C.u32((C.strchr(C.dknowns,C.i32(C.field(obj,"obj","oclass").value))?0:1)));
    if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)>=C.ELVEN_SHIELD)&&Number(C.i32(C.field(obj,"obj","otyp").value)<=C.ORCISH_SHIELD))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.SHIELD_OF_REFLECTION)))||C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_merge").value)))) (C.field(obj,"obj","dknown").value=C.u32(0));
    /* globs always have dknown flag set (to maximize merging) but for new
       object, globby flag won't be set yet so isn't available to check */
    if((Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.GLOB_OF_GRAY_OOZE)||Number(C.i32(C.field(obj,"obj","otyp").value)==C.GLOB_OF_BROWN_PUDDING)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.GLOB_OF_GREEN_SLIME)))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.GLOB_OF_BLACK_PUDDING))))) (C.field(obj,"obj","dknown").value=C.u32(1));
}

/* some init for a brand new object, or partial re-init when hero loses
   potentially known info about an object (called when an unseen monster
   picks up or uses it); moved from invent.c to here for access to dknowns */
export function unknow_object(obj)
{
    clear_dknown(obj);
    /* obj->dknown = 0; */
    (C.field(obj,"obj","bknown").value=(C.field(obj,"obj","rknown").value=C.u32(0)));
    (C.field(obj,"obj","cknown").value=(C.field(obj,"obj","lknown").value=C.u32(0)));
    (C.field(obj,"obj","tknown").value=C.u32(0));
    /* for an existing object, awareness of charges or enchantment has
       gone poof...  [object types which don't use the known flag have
       it set True for some reason] */
    (C.field(obj,"obj","known").value=C.u32((C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_uses_known").value)?0:1)));
}

/* do some initialization to newly created object; otyp must already be set */
export function mksobj_init(obj,artif)
{
    artif=C.i8(artif);
    let mndx; let tryct;
    let otmp=C.cell(obj,"struct obj *").value;
    let let_=C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_class").value;
    switch(C.i32(let_)) {
        case (C.WEAPON_CLASS):
            (C.field(otmp,"obj","quan").value=((Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_SHURIKEN)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))?C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),877,(C.literal("mksobj_init"))),C.rn2(6))):C.rn2(6)))+(6))))):1n));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),878,(C.literal("mksobj_init"))),C.rn2(11))):C.rn2(11)))))) {
            (C.field(otmp,"obj","spe").value=C.i8(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),879,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3)))));
            (C.field(otmp,"obj","blessed").value=C.u32(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),880,(C.literal("mksobj_init"))),C.rn2(2))):C.rn2(2)))));
        } else if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),881,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))))) {
            curse(otmp);
            (C.field(otmp,"obj","spe").value=C.i8(C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),883,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3)))))));
        } else blessorcurse(otmp,10);
        if(Number(!!((Number(!!((Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.WEAPON_CLASS)&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)>=C.i32((-C.P_SHURIKEN)))))&&Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)<=C.i32((-C.P_BOW))))))||C.i32(C.permapoisoned(otmp)))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),886,(C.literal("mksobj_init"))),C.rn2(100))):C.rn2(100)))))))) (C.field(otmp,"obj","otrapped").value=C.u32(1));
        if(Number(!!(C.i32(artif)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),889,(C.literal("mksobj_init"))),C.rn2(C.i32((20+(C.i32((10*C.nartifact_exist())))))))):C.rn2(C.i32((20+(C.i32((10*C.nartifact_exist()))))))))))))) {
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            (otmp=C.mk_artifact(otmp,C.i8((C.i32((-128)))),C.u8(99),(C.i8(1))));
            (C.cell(obj,"struct obj *").value=otmp);
        }
        break;
        case (C.FOOD_CLASS):
            (C.field(otmp,"obj","oeaten").value=C.u32(0));
        switch(C.i32(C.field(otmp,"obj","otyp").value)) {
            case (C.CORPSE):
                /* possibly overridden by mkcorpstat() */
                (tryct=50);
            do (C.field(otmp,"obj","corpsenm").value=C.undead_to_corpse(rndmonnum()));
 while(Number(!!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&16)))&&(Number((tryct=C.i32((tryct-1)))>0)))));
            if(Number(tryct==0)) {
                /* perhaps rndmonnum() only wants to make G_NOCORPSE
                   monsters on this svl.level; create an adventurer's
                   corpse instead, then */
                (C.field(otmp,"obj","corpsenm").value=C.PM_HUMAN);
            }
            /* timer set below */
            break;
            case (C.EGG):
                (C.field(otmp,"obj","corpsenm").value=C.NON_PM);
            /* generic egg */
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),915,(C.literal("mksobj_init"))),C.rn2(3))):C.rn2(3)))))) for((tryct=200);Number(tryct>0);(tryct=C.i32((tryct-1)))) {
                (mndx=C.can_be_hatched(rndmonnum()));
                if(Number(!!(Number(mndx!=C.NON_PM)&&Number(!(C.dead_species(mndx,(C.i8(1)))))))) {
                    (C.field(otmp,"obj","corpsenm").value=mndx);
                    /* typed egg */
                    break;
                }
            }
            /* timer set below */
            break;
            case (C.TIN):
                (C.field(otmp,"obj","corpsenm").value=C.NON_PM);
            /* empty (so far) */
            if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),927,(C.literal("mksobj_init"))),C.rn2(6))):C.rn2(6)))))) C.set_tin_variety(otmp,(C.i32((-1))));
 else for((tryct=200);Number(tryct>0);(tryct=C.i32((tryct-1)))) {
                (mndx=C.undead_to_corpse(rndmonnum()));
                if(Number(!!(C.i32(C.field((C.mons+Number(mndx)*C.sizes["struct permonst"]),"permonst","cnutrit").value)&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(mndx)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&16)))))))) {
                    (C.field(otmp,"obj","corpsenm").value=mndx);
                    C.set_tin_variety(otmp,(C.i32((-2))));
                    break;
                }
            }
            blessorcurse(otmp,10);
            break;
            case (C.SLIME_MOLD):
                (C.field(otmp,"obj","spe").value=C.i8(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","current_fruit").value));
            (C.field(C.flags,"flag","made_fruit").value=(C.i8(1)));
            break;
            case (C.KELP_FROND):
                (C.field(otmp,"obj","quan").value=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),946,(C.literal("mksobj_init"))),C.rnd(2))):C.rnd(2)))));
            break;
            case (C.CANDY_BAR):
                /* set otmp->spe */
                C.assign_candy_wrapper(otmp);
            break;
            default:
                break;
        }
        if((Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_GRAY_OOZE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_BROWN_PUDDING)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_GREEN_SLIME)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GLOB_OF_BLACK_PUDDING))))) {
            (C.field(otmp,"obj","globby").value=C.u32(1));
            /* for emphasis; glob quantity is always 1 and weight varies
               when other globs coalesce with it or this one shrinks */
            (C.field(otmp,"obj","quan").value=1n);
            /* 5.0: globs in 3.6.x left owt as 0 and let weight() fix
               that up during 'obj->owt = weight(obj)' below, but now
               we initialize glob->owt explicitly so weight() doesn't
               need to perform any fix up and returns glob->owt as-is */
            (C.field(otmp,"obj","owt").value=C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_weight").value);
            /* dknown, but not observed */
            (C.field(otmp,"obj","known").value=(C.field(otmp,"obj","dknown").value=C.u32(1)));
            (C.field(otmp,"obj","corpsenm").value=C.i32((C.PM_GRAY_OOZE+(C.i32((C.i32(C.field(otmp,"obj","otyp").value)-C.GLOB_OF_GRAY_OOZE))))));
            start_glob_timeout(otmp,0n);
        } else {
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.CORPSE)&&Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.MEAT_RING)))&&Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.KELP_FROND)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),971,(C.literal("mksobj_init"))),C.rn2(6))):C.rn2(6)))))))) {
                (C.field(otmp,"obj","quan").value=2n);
            }
        }
        break;
        case (C.GEM_CLASS):
            (C.field(otmp,"obj","corpsenm").value=0);
        /* LOADSTONE hack */
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.LOADSTONE)) curse(otmp);
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.ROCK)) (C.field(otmp,"obj","quan").value=C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),981,(C.literal("mksobj_init"))),C.rn2(6))):C.rn2(6)))+(6))))));
 else if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.LUCKSTONE)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),982,(C.literal("mksobj_init"))),C.rn2(6))):C.rn2(6)))))))) (C.field(otmp,"obj","quan").value=2n);
 else (C.field(otmp,"obj","quan").value=1n);
        break;
        case (C.TOOL_CLASS):
            switch(C.i32(C.field(otmp,"obj","otyp").value)) {
                case (C.TALLOW_CANDLE):
                    case (C.WAX_CANDLE):
                        (C.field(otmp,"obj","spe").value=C.i8(1));
                (C.field(otmp,"obj","age").value=C.i64((20n*C.i64(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_cost").value))));
                /* 400 or 200 */
                (C.field(otmp,"obj","lamplit").value=C.u32(0));
                (C.field(otmp,"obj","quan").value=C.i64((1n+C.i64(((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),995,(C.literal("mksobj_init"))),C.rn2(2))):C.rn2(2)))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),995,(C.literal("mksobj_init"))),C.rn2(7))):C.rn2(7))):0))))));
                blessorcurse(otmp,5);
                break;
                case (C.BRASS_LANTERN):
                    case (C.OIL_LAMP):
                        (C.field(otmp,"obj","spe").value=C.i8(1));
                (C.field(otmp,"obj","age").value=C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1001,(C.literal("mksobj_init"))),C.rn2(500))):C.rn2(500)))+(1000))))));
                (C.field(otmp,"obj","lamplit").value=C.u32(0));
                blessorcurse(otmp,5);
                break;
                case (C.MAGIC_LAMP):
                    (C.field(otmp,"obj","spe").value=C.i8(1));
                (C.field(otmp,"obj","lamplit").value=C.u32(0));
                blessorcurse(otmp,2);
                break;
                case (C.CHEST):
                    case (C.LARGE_BOX):
                        (C.field(otmp,"obj","olocked").value=C.u32(Number(!(Number(!((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1012,(C.literal("mksobj_init"))),C.rn2(5))):C.rn2(5))))))))));
                (C.field(otmp,"obj","otrapped").value=C.u32(Number(!((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1013,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10))))))));
                (C.field(otmp,"obj","tknown").value=C.u32(Number(!!(C.i32(C.field(otmp,"obj","otrapped").value)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1014,(C.literal("mksobj_init"))),C.rn2(100))):C.rn2(100)))))))));
                /* obvious trap */
                ;
                /*FALLTHRU*/
                case (C.ICE_BOX):
                    case (C.SACK):
                        case (C.OILSKIN_SACK):
                            case (C.BAG_OF_HOLDING):
                                mkbox_cnts(otmp);
                break;
                case (C.EXPENSIVE_CAMERA):
                    case (C.TINNING_KIT):
                        case (C.MAGIC_MARKER):
                            (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1026,(C.literal("mksobj_init"))),C.rn2(70))):C.rn2(70)))+(30))))));
                break;
                case (C.CAN_OF_GREASE):
                    (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1029,(C.literal("mksobj_init"))),C.rn2(21))):C.rn2(21)))+(5))))));
                /* 0..20 + 5 => 5..25 */
                blessorcurse(otmp,10);
                break;
                case (C.CRYSTAL_BALL):
                    (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1033,(C.literal("mksobj_init"))),C.rn2(5))):C.rn2(5)))+(3))))));
                /* 0..4 + 3 => 3..7 */
                blessorcurse(otmp,2);
                break;
                case (C.HORN_OF_PLENTY):
                    case (C.BAG_OF_TRICKS):
                        (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1038,(C.literal("mksobj_init"))),C.rn2(18))):C.rn2(18)))+(3))))));
                /* 0..17 + 3 => 3..20 */
                break;
                case (C.FIGURINE):
                    (tryct=0);
                /* figurines are slightly harder monsters */
                do (C.field(otmp,"obj","corpsenm").value=rndmonnum_adj(5,10));
 while(Number(!!((Number((C.u64((C.field(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mflags2").value&C.u64(8n))))!=C.u64(0n)))&&Number(((tryct=C.i32((tryct+1)))-1)<30))));
                blessorcurse(otmp,4);
                break;
                case (C.BELL_OF_OPENING):
                    (C.field(otmp,"obj","spe").value=C.i8(3));
                break;
                case (C.MAGIC_FLUTE):
                    case (C.MAGIC_HARP):
                        case (C.FROST_HORN):
                            case (C.FIRE_HORN):
                                case (C.DRUM_OF_EARTHQUAKE):
                                    (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1056,(C.literal("mksobj_init"))),C.rn2(5))):C.rn2(5)))+(4))))));
                break;
            }
        break;
        case (C.AMULET_CLASS):
            if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_YENDOR)) (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","made_amulet").value=(C.i8(1)));
        if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1063,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))&&(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_STRANGULATION)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_CHANGE)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.AMULET_OF_RESTFUL_SLEEP))))))) {
            curse(otmp);
        } else blessorcurse(otmp,10);
        break;
        case (C.VENOM_CLASS):
            case (C.CHAIN_CLASS):
                case (C.BALL_CLASS):
                    break;
        case (C.POTION_CLASS):
            /* note: potions get some additional init below */
            case (C.SCROLL_CLASS):
                if(Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.SCR_MAIL)) blessorcurse(otmp,4);
        break;
        case (C.SPBOOK_CLASS):
            (C.field(otmp,"obj","usecount").value=0);
        blessorcurse(otmp,17);
        break;
        case (C.ARMOR_CLASS):
            if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1086,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FUMBLE_BOOTS)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.LEVITATION_BOOTS)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.HELM_OF_OPPOSITE_ALIGNMENT)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.GAUNTLETS_OF_FUMBLING)))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1090,(C.literal("mksobj_init"))),C.rn2(11))):C.rn2(11))))))))))) {
                curse(otmp);
                (C.field(otmp,"obj","spe").value=C.i8(C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1092,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3)))))));
            } else if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1093,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))))) {
                (C.field(otmp,"obj","blessed").value=C.u32(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1094,(C.literal("mksobj_init"))),C.rn2(2))):C.rn2(2)))));
                (C.field(otmp,"obj","spe").value=C.i8(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1095,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3)))));
            } else blessorcurse(otmp,10);
        if(Number(!!(C.i32(artif)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1098,(C.literal("mksobj_init"))),C.rn2(C.i32((40+(C.i32((10*C.nartifact_exist())))))))):C.rn2(C.i32((40+(C.i32((10*C.nartifact_exist()))))))))))))) {
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            (otmp=C.mk_artifact(otmp,C.i8((C.i32((-128)))),C.u8(99),(C.i8(1))));
            (C.cell(obj,"struct obj *").value=otmp);
        }
        /* simulate lacquered armor for samurai */
        if(Number(!!(Number(!!((Number(C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value)==(C.PM_SAMURAI)))&&Number(C.i32(C.field(otmp,"obj","otyp").value)==C.SPLINT_MAIL)))&&(Number(!!(Number(C.field(C.svm,"instance_globals_saved_m","moves").value<=C.i64(1))||C.i32(C.In_quest(C.field(C.u,"you","uz").address)))))))) {
            /* optimizer bitfield bug */
            (C.field(otmp,"obj","oerodeproof").value=(C.field(otmp,"obj","rknown").value=C.u32(1)));
        }
        break;
        case (C.WAND_CLASS):
            if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAN_WISHING)) (C.field(otmp,"obj","spe").value=C.i8(1));
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAN_STASIS)) (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1121,(C.literal("mksobj_init"))),C.rn2(4))):C.rn2(4)))+(3))))));
 else (C.field(otmp,"obj","spe").value=C.i8((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1124,(C.literal("mksobj_init"))),C.rn2(5))):C.rn2(5)))+(((Number(C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_dir").value)==1))?11:4)))))));
        /* just as easy to recharge as other NODIR wands, but starts with
               fewer charges */
        blessorcurse(otmp,17);
        (C.field(otmp,"obj","recharged").value=C.u32(0));
        /* used to control recharging */
        break;
        case (C.RING_CLASS):
            if(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_charged").value) {
                blessorcurse(otmp,3);
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1131,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))) {
                    if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1132,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))&&bcsign(otmp)))) (C.field(otmp,"obj","spe").value=C.i8(C.i32((bcsign(otmp)*((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1133,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3)))))));
 else (C.field(otmp,"obj","spe").value=C.i8((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1135,(C.literal("mksobj_init"))),C.rn2(2))):C.rn2(2)))?((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1135,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3))):C.i32((-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1135,(C.literal("mksobj_init"))),C.rne(3))):C.rne(3))))))));
                }
                /* make useless +0 rings much less common */
                if(Number(C.i32(C.field(otmp,"obj","spe").value)==0)) (C.field(otmp,"obj","spe").value=C.i8(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1139,(C.literal("mksobj_init"))),C.rn2(4))):C.rn2(4)))-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1139,(C.literal("mksobj_init"))),C.rn2(3))):C.rn2(3)))))));
                /* negative rings are usually cursed */
                if(Number(!!(Number(C.i32(C.field(otmp,"obj","spe").value)<0)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1141,(C.literal("mksobj_init"))),C.rn2(5))):C.rn2(5)))))) curse(otmp);
            } else if(Number(!!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1143,(C.literal("mksobj_init"))),C.rn2(10))):C.rn2(10)))&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.RIN_TELEPORTATION)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.RIN_POLYMORPH)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.RIN_AGGRAVATE_MONSTER)))||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.RIN_HUNGER)))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1146,(C.literal("mksobj_init"))),C.rn2(9))):C.rn2(9))))))))))) {
                curse(otmp);
            }
        break;
        case (C.ROCK_CLASS):
            if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.STATUE)) {
                /* possibly overridden by mkcorpstat() */
                (C.field(otmp,"obj","corpsenm").value=rndmonnum());
                if(Number(!!(Number(!((Number(C.i32(C.field(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","msize").value)<1))))&&Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1155,(C.literal("mksobj_init"))),C.rn2(C.i32((C.i32(Math.trunc((C.i32(C.level_difficulty())/2)))+10))))):C.rn2(C.i32((C.i32(Math.trunc((C.i32(C.level_difficulty())/2)))+10)))))>10)))) add_to_container(otmp,mkobj((C.i32((0-C.SPBOOK_CLASS))),(C.i8(0))));
                /* caller will update owt */
            }
        /* boulder init'd below in the 'regardless of !init' code */
        break;
        case (C.COIN_CLASS):
            break;
        /* do nothing */
        default:
            /* 3.6.3: this used to be impossible() followed by return 0
           but most callers aren't prepared to deal with Null result
           and cluttering them up to do so is pointless */
            C.variadic(6,C.literal("mksobj tried to make type %d, class %d."),C.i32(C.field(otmp,"obj","otyp").value),C.i32(C.field((C.objects+Number(C.field(otmp,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_class").value));
        /*NOTREACHED*/
    }
    mkobj_erosions(otmp);
    if(C.permapoisoned(otmp)) (C.field(otmp,"obj","otrapped").value=C.u32(1));
}

/* mksobj(): create a specific type of object; result is always non-Null */
export function mksobj(otyp,init,artif)
{
    otyp=C.i32(otyp);
    init=C.i8(init);
    artif=C.i8(artif);
    const stackFrame=C.stackSave();
    try {
    let otmpAddress=C.stackAlloc(8);
    let let_=C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_class").value;
    (C.cell(otmpAddress,"struct obj *").value=C.alloc(C.u32(BigInt(C.sizes["struct obj"]))));
    C.copyRecord(C.cell(otmpAddress,"struct obj *").value,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","age").value=((Number((C.field(C.svm,"instance_globals_saved_m","moves").value)>(1n))?(C.field(C.svm,"instance_globals_saved_m","moves").value):(1n))));
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","o_id").value=next_ident());
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","quan").value=1n);
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","oclass").value=let_);
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","otyp").value=C.i16(otyp));
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","where").value=C.i8(0));
    unknow_object(C.cell(otmpAddress,"struct obj *").value);
    /* set up dknown and known: non-0 for some things */
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=C.NON_PM);
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","lua_ref_cnt").value=C.u32(0));
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","pickup_prev").value=C.u32(0));
    if(init) mksobj_init(otmpAddress,artif);
    /* some things must get done (corpsenm, timers) even if init = 0 */
    switch(((Number(!!(Number(C.i32(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","oclass").value)==C.POTION_CLASS)&&Number(C.i32(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","otyp").value)!=C.POT_OIL))))?C.POT_WATER:C.i32(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","otyp").value))) {
        case (C.CORPSE):
            if(Number(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value==C.NON_PM)) {
                (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=C.undead_to_corpse(rndmonnum()));
                if(C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((16|(C.i32((2|1))))))))) (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=C.i32(C.field(C.field(C.gu,"instance_globals_u","urole").address,"Role","mnum").value));
            }
        ;
        /*FALLTHRU*/
        case (C.STATUE):
            case (C.FIGURINE):
                if(Number(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value==C.NON_PM)) (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=rndmonnum());
        if(Number(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value!=C.NON_PM)) {
            let ptr=(C.mons+Number(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value)*C.sizes["struct permonst"]);
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","spe").value=C.i8((((Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(262144n))))!=C.u64(0n)))?3:((Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(131072n))))!=C.u64(0n)))?1:((Number((C.u64((C.field((ptr),"permonst","mflags2").value&C.u64(65536n))))!=C.u64(0n)))?2:(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1222,(C.literal("mksobj"))),C.rn2(2))):C.rn2(2)))?1:2)))))));
        }
        ;
        /*FALLTHRU*/
        case (C.EGG):
            /* case TIN: */
            set_corpsenm(C.cell(otmpAddress,"struct obj *").value,C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value);
        break;
        case (C.BOULDER):
            /* next_boulder overloads corpsenm so the default value is NON_PM;
           since that is non-zero, the "next boulder" case in xname() would
           happen when it shouldn't; explicitly set it to 0 */
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=0);
        break;
        case (C.POT_OIL):
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","age").value=C.i64(400));
        /* amount of oil */
        ;
        /*FALLTHRU*/
        case (C.POT_WATER):
            /* POTION_CLASS */
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=0);
        /* overloads corpsenm, which was set to NON_PM */
        break;
        case (C.LEASH):
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=0);
        /* overloads corpsenm, which was set to NON_PM */
        break;
        case (C.SPE_NOVEL):
            (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").value=C.i32((-1)));
        /* "none of the above"; will be changed */
        (C.cell(otmpAddress,"struct obj *").value=C.oname(C.cell(otmpAddress,"struct obj *").value,C.noveltitle(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","corpsenm").address),0));
        break;
    }
    /* unique objects may have an associated artifact entry */
    if(Number(!!(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_unique").value)&&Number(!(C.field(C.cell(otmpAddress,"struct obj *").value,"obj","oartifact").value))))) {
        /* mk_artifact() with otmp and A_NONE will never return NULL */
        (C.cell(otmpAddress,"struct obj *").value=C.mk_artifact(C.cell(otmpAddress,"struct obj *").value,C.i8((C.i32((-128)))),C.u8(99),(C.i8(0))));
    }
    (C.field(C.cell(otmpAddress,"struct obj *").value,"obj","owt").value=C.u32(weight(C.cell(otmpAddress,"struct obj *").value)));
    return C.cell(otmpAddress,"struct obj *").value;
    } finally {C.stackRestore(stackFrame); }
}

/* potential mimic shapes that should be undone by stone-to-flesh;
   not used for objects that will be transformed when hit by stone-to-flesh */
export function stone_object_type(mappearance)
{
    mappearance=C.u32(mappearance);
    let otyp=C.i32(mappearance);
    /* we exclude wands, rings, and gems even though some qualify as stone;
       there aren't any weapons or armor classified as made out of stone */
    return C.i8((Number(!!(Number(!!(Number(otyp==C.BOULDER)||Number(otyp==C.STATUE)))||Number(otyp==C.FIGURINE)))));
}

/* possible mimic shapes that are affected by stone-to-flesh;
   mappearance for furniture is a display symbol rather than a terrain type */
export function stone_furniture_type(mappearance)
{
    mappearance=C.u32(mappearance);
    let sym=C.i32(mappearance);
    switch(sym) {
        case (C.S_upstair):
            case (C.S_dnstair):
                case (C.S_brupstair):
                    case (C.S_brdnstair):
                        case (C.S_altar):
                            case (C.S_throne):
                                case (C.S_sink):
                                    /* stone sink is iffy; metal might be more appropriate */
                                    return (C.i8(1));
        default:
            if(Number(!!(Number(sym>=C.S_vwall)&&Number(sym<=C.S_trwall)))) return (C.i8(1));
        break;
    }
    return (C.i8(0));
}

/*
 * Several areas of the code made direct reassignments
 * to obj->corpsenm.  Because some special handling is
 * required in certain cases, place that handling here
 * and call this routine in place of the direct assignment.
 *
 * If the object was a lizard or lichen corpse:
 *     - ensure that you don't end up with some
 *       other corpse type which has no rot-away timer.
 *
 * If the object was a troll corpse:
 *     - ensure that you don't end up with some other
 *       corpse type which resurrects from the dead.
 *
 * Re-calculates the weight of figurines and corpses to suit the
 * new species.
 *
 * Existing timeout value for egg hatch is preserved.
 *
 */
export function set_corpsenm(obj,id)
{
    id=C.i32(id);
    let old_id=C.field(obj,"obj","corpsenm").value;
    let when=0n;
    if(C.field(obj,"obj","timed").value) {
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.EGG)) {
            (when=C.stop_timer(C.i16(C.HATCH_EGG),C.obj_to_any(obj)));
        } else {
            (when=0n);
            C.obj_stop_timers(obj);
            /* corpse or figurine */
        }
    }
    /* oeaten is used to determine how much nutrition is left in
       multiple-bite food and also used to derive how many hit points
       a creature resurrected from a partly eaten corpse gets; latter
       is of interest when a <foo> corpse revives as a <foo> zombie
       in case they are defined with different mons[].cnutrit values */
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&Number(C.field(obj,"obj","oeaten").value!=C.u32(0))))&&Number(C.i32(C.field((C.mons+Number(old_id)*C.sizes["struct permonst"]),"permonst","cnutrit").value)!=C.i32(C.field((C.mons+Number(id)*C.sizes["struct permonst"]),"permonst","cnutrit").value))))) {
        /* when oeaten is non-zero, index old_id can't be NON_PM
           and divisor mons[old_id].cnutrit can't be zero */
        /* oeaten and cnutrit are unsigned; theoretically that could
           be 16 bits and the calculation might overflow, so force long */
        (C.field(obj,"obj","oeaten").value=C.u32((C.i64((C.i64((C.i64(C.field(obj,"obj","oeaten").value)*C.i64(C.field((C.mons+Number(id)*C.sizes["struct permonst"]),"permonst","cnutrit").value)))/C.i64(C.field((C.mons+Number(old_id)*C.sizes["struct permonst"]),"permonst","cnutrit").value))))));
    }
    (C.field(obj,"obj","corpsenm").value=id);
    switch(C.i32(C.field(obj,"obj","otyp").value)) {
        case (C.CORPSE):
            start_corpse_timeout(obj);
        (C.field(obj,"obj","owt").value=C.u32(weight(obj)));
        break;
        case (C.FIGURINE):
            if(Number(!!(Number(!!(Number(C.field(obj,"obj","corpsenm").value!=C.NON_PM)&&Number(!(C.dead_species(C.field(obj,"obj","corpsenm").value,(C.i8(1)))))))&&(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))||(Number(C.i32(C.field((obj),"obj","where").value)==4)))))))) C.attach_fig_transform_timeout(obj);
        (C.field(obj,"obj","owt").value=C.u32(weight(obj)));
        break;
        case (C.EGG):
            if(Number(!!(Number(C.field(obj,"obj","corpsenm").value!=C.NON_PM)&&Number(!(C.dead_species(C.field(obj,"obj","corpsenm").value,(C.i8(1)))))))) C.attach_egg_hatch_timeout(obj,when);
        break;
        default:
            /* tin, etc. */
            (C.field(obj,"obj","owt").value=C.u32(weight(obj)));
        break;
    }
}

/* Return the number of turns after which a Rider corpse revives */
export function rider_revival_time(body,retry)
{
    retry=C.i8(retry);
    let when;
    let minturn=(C.i32(retry)?3n:((Number(C.field(body,"obj","corpsenm").value==C.PM_DEATH))?6n:12n));
    /* Riders have a 1/3 chance per turn of reviving after 12, 6, or 3 turns.
       Always revive by 67. */
    for((when=minturn);Number(when<67n);((when=C.i64((when+1n)))-1n)) if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1379,(C.literal("rider_revival_time"))),C.rn2(3))):C.rn2(3)))))) break;

    return when;
}

/*
 * Start a corpse decay or revive timer.
 * This takes the age of the corpse into consideration as of 3.4.0.
 */
export function start_corpse_timeout(body)
{
    let when;
    /* rot away when this old */
    let age;
    /* age of corpse          */
    let rot_adjust;
    let action;
    /*
     * Note:
     *      if body->norevive is set, the corpse will rot away instead
     *      of revive when its REVIVE_MON timer finishes.
     */
    /* lizards and lichen don't rot or revive */
    if(Number(!!(Number(C.field(body,"obj","corpsenm").value==C.PM_LIZARD)||Number(C.field(body,"obj","corpsenm").value==C.PM_LICHEN)))) return;
    (action=C.i16(C.ROT_CORPSE));
    /* default action: rot away */
    (rot_adjust=(C.i32(C.field(C.gi,"instance_globals_i","in_mklev").value)?25:10));
    /* give some variation */
    (age=C.i64((((Number((C.field(C.svm,"instance_globals_saved_m","moves").value)>C.i64((1)))?(C.field(C.svm,"instance_globals_saved_m","moves").value):C.i64((1))))-C.field(body,"obj","age").value)));
    if(Number(age>(250n))) (when=C.i64(rot_adjust));
 else (when=C.i64(((250n)-age)));
    (when=C.i64(when+C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1413,(C.literal("start_corpse_timeout"))),C.rnz(rot_adjust))):C.rnz(rot_adjust)))-rot_adjust))))));
    if((Number(!!(Number(!!(Number(((C.mons+Number(C.field(body,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(body,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number(((C.mons+Number(C.field(body,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))))) {
        (action=C.i16(C.REVIVE_MON));
        (when=rider_revival_time(body,(C.i8(0))));
    } else if(Number(C.i32(C.field((C.mons+Number(C.field(body,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","mlet").value)==C.S_TROLL)) {
        for((age=C.i64(2));Number(age<=(50n));((age=C.i64((age+1n)))-1n)) if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1420,(C.literal("start_corpse_timeout"))),C.rn2(37))):C.rn2(37)))))) {
            /* troll revives */
            (action=C.i16(C.REVIVE_MON));
            (when=age);
            break;
        }

    } else if(Number(!!(Number(!!(C.i32(C.field(C.gz,"instance_globals_z","zombify").value)&&Number(C.zombie_form((C.mons+Number(C.field(body,"obj","corpsenm").value)*C.sizes["struct permonst"]))!=C.NON_PM)))&&Number(!(C.field(body,"obj","oeroded2").value))))) {
        (action=C.i16(C.ZOMBIFY_MON));
        (when=C.i64((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1428,(C.literal("start_corpse_timeout"))),C.rn2(15))):C.rn2(15)))+(5))))));
        /* 5..19 */
    }
    C.start_timer(when,C.i16(C.TIMER_OBJECT),action,C.obj_to_any(body));
}

/* used by item_on_ice() and shrink_glob() */
/* used by shrink_glob(); is 'item' or enclosing container on or under ice? */
export function item_on_ice(item)
{
    const stackFrame=C.stackSave();
    try {
    let otmp;
    let oxAddress=C.stackAlloc(2); let oyAddress=C.stackAlloc(2);
    (otmp=item);
    /* if in a container, it might be nested so find outermost one since
       that's the item whose location needs to be checked */
    while(Number(C.i32(C.field(otmp,"obj","where").value)==2)) (otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_ocontainer").value);

    if(C.get_obj_location(otmp,oxAddress,oyAddress,2)) {
        switch(C.i32(C.field(otmp,"obj","where").value)) {
            case (1):
                if(C.is_ice(C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value)) return C.SET_ON_ICE;
            break;
            case (6):
                if(C.is_ice(C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value)) return C.BURIED_UNDER_ICE;
            break;
            default:
                break;
        }
    }
    return C.NOT_ON_ICE;
    } finally {C.stackRestore(stackFrame); }
}

/* schedule a timer that will shrink the target glob by 1 unit of weight */
export function start_glob_timeout(obj,when)
{
    when=C.i64(when);
    /* glob */
    /* when to shrink; if 0L, use random value close to 25 */
    if(Number(!(C.field(obj,"obj","globby").value))) {
        C.variadic(7,C.literal("start_glob_timeout for non-glob [%d: %s]?"),C.i32(C.field(obj,"obj","otyp").value),C.simpleonames(obj));
        return;
        /* skip timer creation */
    }
    /* sanity precaution */
    if(C.field(obj,"obj","timed").value) C.stop_timer(C.i16(C.SHRINK_GLOB),C.obj_to_any(obj));
    if(Number(when<1n)) (when=C.i64((C.i64((25n+C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1487,(C.literal("start_glob_timeout"))),C.rn2(5))):C.rn2(5))))))-2n)));
    /* caller usually passes 0L; should never be negative */
    /* 25+[0..4]-2 => 23..27, avg 25 */
    /* 1 new glob weighs 20 units and loses 1 unit every 25 turns,
       so lasts for 500 turns, twice as long as the average corpse */
    C.start_timer(when,C.i16(C.TIMER_OBJECT),C.i16(C.SHRINK_GLOB),C.obj_to_any(obj));
}

/* globs have quantity 1 and size which varies by multiples of 20 in owt;
   they don't become tainted with age, but every 25 turns this timer runs
   and reduces owt by 1; when it hits 0, destroy the glob (if some other
   part of the program destroys it, the timer will be cancelled);
   note: timer keeps going if an object gets buried or scheduled to
   migrate to another level and can delete the glob in those states */
export function shrink_glob(arg,expire_time)
{
    expire_time=C.i64(expire_time);
    const stackFrame=C.stackSave();
    try {
    /* glob (in arg->a_obj) */
    /* turn the timer should have gone off; if less than
                       * current 'moves', we're making up for lost time
                       * after leaving and then returning to this level */
    let globnambuf=C.stackAlloc((1*256));
    let obj=C.field(arg,"any","a_obj").value;
    let globloc=item_on_ice(obj);
    let ininv=C.i8((Number(C.i32(C.field(obj,"obj","where").value)==3))); let shrink=(C.i8(0)); let gone=(C.i8(0)); let updinv=(C.i8(0));
    let contnr=((Number(C.i32(C.field(obj,"obj","where").value)==2))?C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value:0); let topcontnr=0;
    let old_top_owt=C.u32(0);
    if(Number(!(C.field(obj,"obj","globby").value))) {
        C.variadic(8,C.literal("shrink_glob for non-glob [%d: %s]?"),C.i32(C.field(obj,"obj","otyp").value),C.simpleonames(obj));
        return;
        /* old timer is gone, don't start a new one */
    }
    /* note: if check_glob() complains about a problem, the " obj " here
       will be replaced in the feedback with info about this glob */
    check_glob(obj,C.literal("shrink obj "));
    /*
     * If shrinkage occurred while we were on another level, catch up now.
     */
    if(Number(!!(Number(expire_time<C.field(C.svm,"instance_globals_saved_m","moves").value)&&Number(globloc!=C.BURIED_UNDER_ICE)))) {
        /* number of units of weight to remove */
        let delta=C.i64(((C.i64((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-expire_time))+24n)))/25n)); let moddelta=C.i64((25n-(C.i64((delta%25n)))));
        /* leftover amount to use for new timer */
        if(Number(globloc==C.SET_ON_ICE)) (delta=C.i64(((C.i64((delta+2n)))/3n)));
        if(Number(delta>=C.i64(C.field(obj,"obj","owt").value))) {
            /* gone; no newsym() or message here--forthcoming map update for
               level arrival is all that's needed */
            (C.field(obj,"obj","owt").value=C.u32(0));
            /* not required; accurately reflects obj's state */
            shrinking_glob_gone(obj);
        } else {
            /* shrank but not gone; reduce remaining weight */
            (C.field(obj,"obj","owt").value=C.u32(C.field(obj,"obj","owt").value-C.u32(delta)));
            /* when contained, update container's weight (recursively if
               nested); won't be in a container carried by hero (since
               catching up for lost time never applies in that situation)
               but might be in one on floor or one carried by a monster */
            if(contnr) container_weight(contnr);
            /* resume regular shrinking */
            start_glob_timeout(obj,moddelta);
        }
        return;
    }
    /*
     * When on ice, only shrink every third try.  If buried under ice,
     * don't shrink at all, similar to being contained in an ice box
     * except that the timer remains active.  [FIXME:  stop the timer
     * for obj in pool that becomes frozen, restart it if/when unburied.]
     *
     * If the glob is actively being eaten by hero, skip weight reduction
     * to avoid messing up the context.victual data (if/when eaten by a
     * monster, timer won't have a chance to run before meal is finished).
     */
    if(Number(!!(Number(!!(C.i32(C.eating_glob(obj))||Number(globloc==C.BURIED_UNDER_ICE)))||(Number(!!(Number(globloc==C.SET_ON_ICE)&&Number((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value%3n)))==1n))))))) {
        /* schedule next shrink attempt; for the being eaten case, the
           glob and its timer might be deleted before this kicks in */
        start_glob_timeout(obj,0n);
        return;
    }
    /* format "Your/Shk's/The [partly eaten] glob of <goo>" into
       globnambuf[] before shrinking the glob; Yname2() calls yname()
       which calls xname() which ordinarily leaves "partly eaten" to
       doname() rather than inserting that itself; ask xname() to add
       that when appropriate */
    (C.field(C.iflags,"instance_flags","partly_eaten_hack").value=(C.i8(1)));
    C.strcpy(globnambuf,C.Yname2(obj));
    (C.field(C.iflags,"instance_flags","partly_eaten_hack").value=(C.i8(0)));
    if(Number(C.field(obj,"obj","owt").value>C.u32(0))) {
        /* sanity precaution */
        /* globs start out weighing 20 units; give two messages per glob,
           when going from 20 to 19 and from 10 to 9; a different message
           is given for going from 1 to 0 (gone) */
        let basewt=C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_weight").value; let msgwt=C.u32(Math.trunc(((C.u32((((Number((basewt)>(1))?(basewt):(1)))+1)))/2)));
        /* 20 */
        /* 10 */
        (shrink=C.i8(Number((C.u32((C.field(obj,"obj","owt").value%msgwt)))==C.u32(0))));
        (C.field(obj,"obj","owt").value=C.u32(C.field(obj,"obj","owt").value-C.u32(1)));
        /* if glob is partly eaten, reduce the amount still available (but
           not all the way to 0 which would change it back to untouched) */
        if(Number(C.field(obj,"obj","oeaten").value>C.u32(1))) (C.field(obj,"obj","oeaten").value=C.u32(C.field(obj,"obj","oeaten").value-C.u32(1)));
    }
    (gone=C.i8(Number(!(C.field(obj,"obj","owt").value))));
    /* timer might go off when the glob is migrating to another level and
       possibly delete it; messages are only given for in-open-inventory,
       inside-container-in-invent, and going away when can-see-on-floor */
    if(ininv) {
        if(Number(!!(C.i32(shrink)||C.i32(gone)))) C.variadic(9,C.literal("%s %s."),globnambuf,(C.i32(gone)?C.literal("dissolves completely"):C.literal("shrinks")));
        /* globs always have quantity 1 so we don't need otense()
                     because the verb always references a singular item */
        (updinv=(C.i8(1)));
    } else if(contnr) {
        /* when in a container, it might be nested so find outermost one */
        (topcontnr=contnr);
        while(Number(C.i32(C.field(topcontnr,"obj","where").value)==2)) (topcontnr=C.field(C.field(topcontnr,"obj","v").address,"vptrs","v_ocontainer").value);

        /* obj's weight has been reduced, but weight(s) of enclosing
           container(s) haven't been adjusted for that yet */
        (old_top_owt=C.field(topcontnr,"obj","owt").value);
        /* update those weights now; recursively updates nested containers */
        container_weight(contnr);
        if(Number(C.i32(C.field(topcontnr,"obj","where").value)==3)) {
            /* for regular containers, the weight will always be reduced
               when glob's weight has been reduced but we only say so
               when shrinking beneath a particular threshold (N*20 to
               (N-1)*20 + 19 or (N-1)*20 + 10 to (N-1)*20 + 9), or
               if we're going to report a change in carrying capacity;
               for a non-cursed bag of holding the total weight might not
               change because only a fraction of glob's weight is counted;
               however, always say the bag is lighter for the 'gone' case */
            if(Number(!!(Number(!!(C.i32(gone)||(Number(!!(C.i32(shrink)&&Number(C.field(topcontnr,"obj","owt").value!=old_top_owt))))))||Number(C.near_capacity()!=C.field(C.go,"instance_globals_o","oldcap").value)))) C.variadic(10,C.literal("%s %s%s lighter."),C.Yname2(topcontnr),((Number(C.field(topcontnr,"obj","owt").value!=old_top_owt))?C.literal("becomes"):C.literal("seems")),(Number(!(gone))?C.literal(" slightly"):C.literal("")));
            /* containers also always have quantity 1 */
            /* TODO?  maybe also skip "slightly" if description
                         is changing (from "very large" to "large",
                         "large" to "medium", or "medium to "small") */
            (updinv=(C.i8(1)));
        }
    }
    if(gone) {
        let oxAddress=C.stackAlloc(2); C.cell(oxAddress,"short").value=C.i16(0); let oyAddress=C.stackAlloc(2); C.cell(oyAddress,"short").value=C.i16(0);
        /* check location for visibility before destroying obj */
        let seeit=C.i8((Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==1)&&C.i32(C.get_obj_location(obj,oxAddress,oyAddress,0))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.cell(oyAddress,"short").value)*8),"unsigned char *").value+Number(C.cell(oxAddress,"short").value)*1),"unsigned char").value)&2)))!=0))))));
        /* weight has been reduced to 0 so destroy the glob */
        shrinking_glob_gone(obj);
        if(seeit) {
            C.newsym(C.cell(oxAddress,"short").value,C.cell(oyAddress,"short").value);
            if(Number(!!((Number(!!(Number(C.i32(C.cell(oxAddress,"short").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.cell(oyAddress,"short").value)!=C.i32(C.field(C.u,"you","uy").value)))))&&Number(!(C.strncmp(globnambuf,C.literal("The "),C.u64(4))))))) C.strsubst(globnambuf,C.literal("The "),C.literal("A "));
            /* fortunately none of the glob adjectives warrant "An " */
            /* again, quantity is always 1 so no need for otense()/vtense() */
            C.variadic(11,C.literal("%s fades away."),globnambuf);
        }
    } else {
        /* schedule next shrink ~25 turns from now */
        start_glob_timeout(obj,0n);
    }
    if(updinv) {
        C.update_inventory();
        C.encumber_msg();
    }
    } finally {C.stackRestore(stackFrame); }
}

/* a glob has shrunk away to nothing; handle owornmask, then delete glob */
export function shrinking_glob_gone(obj)
{
    let owhere=C.i16(C.field(obj,"obj","where").value);
    if(Number(C.i32(owhere)==3)) {
        if(C.field(obj,"obj","owornmask").value) {
            C.remove_worn_item(obj,(C.i8(0)));
            C.stop_occupation();
        }
        C.useupall(obj);
        /* freeinv()+obfree() */
    } else {
        if(Number(C.i32(owhere)==5)) {
            /* destination flag overloads owornmask; clear it so obfree()'s
               check for freeing a worn object doesn't get a false hit */
            (C.field(obj,"obj","owornmask").value=0n);
        } else if(Number(C.i32(owhere)==4)) {
            /* monsters don't wield globs so this isn't strictly needed */
            if(Number(!!(C.field(obj,"obj","owornmask").value&&Number(obj==(C.field((C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value),"monst","mw").value))))) C.setmnotwielded(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value,obj);
            /* clears owornmask */
        }
        /* remove the glob from whatever list it's on and then delete it;
           if it's contained, obj_extract_self() will update the container's
           weight and if nested, the enclosing containers' weights too */
        obj_extract_self(obj);
        if(Number(C.i32(owhere)==1)) C.maybe_unhide_at(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value);
        C.obfree(obj,0);
    }
}

export function maybe_adjust_light(obj,old_range)
{
    old_range=C.i32(old_range);
    const stackFrame=C.stackSave();
    try {
    let buf=C.stackAlloc((1*256));
    let oxAddress=C.stackAlloc(2); let oyAddress=C.stackAlloc(2);
    let new_range=C.arti_light_radius(obj); let delta=C.i32((new_range-old_range));
    /* radius of light emitting artifact varies by curse/bless state
       so will change after blessing or cursing */
    if(delta) {
        C.obj_adjust_light_radius(obj,new_range);
        /* simplifying assumptions:  hero is wielding or wearing this object;
           artifacts have to be in use to emit light and monsters' gear won't
           change bless or curse state */
        if(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&C.i32(C.get_obj_location(obj,oxAddress,oyAddress,0))))) {
            (C.cell(buf,"char").value=C.i8(0));
            if(Number(C.field(C.iflags,"instance_flags","last_msg").value==C.PLNMSG_OBJ_GLOWS)) C.strcpy(buf,((Number(C.field(obj,"obj","quan").value==1n))?C.literal("It"):C.literal("They")));
 else if(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))||(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.cell(oyAddress,"short").value)*8),"unsigned char *").value+Number(C.cell(oxAddress,"short").value)*1),"unsigned char").value)&2)))!=0))))) C.strcpy(buf,C.Yname2(obj));
            /* we just saw "The <obj> glows <color>." from dipping */
            if(C.cell(buf,"char").value) {
                /* initial activation says "dimly" if cursed,
                   "brightly" if uncursed, and "brilliantly" if blessed;
                   when changing intensity, using "less brightly" is
                   straightforward for dimming, but we need "brighter"
                   rather than "more brightly" for brightening; ugh */
                C.variadic(12,C.literal("%s %s %s%s."),buf,C.otense(obj,C.literal("shine")),((Number(C.abs(delta)>1))?C.literal("much "):C.literal("")),((Number(delta>0))?C.literal("brighter"):C.literal("less brightly")));
            }
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 *      bless(), curse(), unbless(), uncurse() -- any relevant message
 *      about glowing amber/black/&c should be delivered prior to calling
 *      these routines to make the actual curse/bless state change.
 */
export function bless(otmp)
{
    let old_light=0;
    if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) return;
    if(C.field(otmp,"obj","lamplit").value) (old_light=C.arti_light_radius(otmp));
    (C.field(otmp,"obj","cursed").value=C.u32(0));
    (C.field(otmp,"obj","blessed").value=C.u32(1));
    if(Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))&&C.i32(C.confers_luck(otmp))))) C.set_moreluck();
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_HOLDING)) (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
 else if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FIGURINE)&&C.i32(C.field(otmp,"obj","timed").value)))) C.stop_timer(C.i16(C.FIG_TRANSFORM),C.obj_to_any(otmp));
    if(C.field(otmp,"obj","lamplit").value) maybe_adjust_light(otmp,old_light);
    return;
}

export function unbless(otmp)
{
    let old_light=0;
    if(C.field(otmp,"obj","lamplit").value) (old_light=C.arti_light_radius(otmp));
    (C.field(otmp,"obj","blessed").value=C.u32(0));
    if(Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))&&C.i32(C.confers_luck(otmp))))) C.set_moreluck();
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_HOLDING)) (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
    if(C.field(otmp,"obj","lamplit").value) maybe_adjust_light(otmp,old_light);
}

export function curse(otmp)
{
    let already_cursed;
    let old_light=0;
    if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.COIN_CLASS)) return;
    if(C.field(otmp,"obj","lamplit").value) (old_light=C.arti_light_radius(otmp));
    (already_cursed=C.field(otmp,"obj","cursed").value);
    (C.field(otmp,"obj","blessed").value=C.u32(0));
    (C.field(otmp,"obj","cursed").value=C.u32(1));
    /* welded two-handed weapon interferes with some armor removal */
    if(Number(!!(Number(otmp==C.global("uwep").value)&&(Number(!!((Number(!!(Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(C.global("uwep").value,"obj","oclass").value)==C.TOOL_CLASS))))&&C.i32(C.field((C.objects+Number(C.field(C.global("uwep").value,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_big").value))))))) C.reset_remarm();
    /* rules at top of wield.c state that twoweapon cannot be done
       with cursed alternate weapon */
    if(Number(!!(Number(otmp==C.global("uswapwep").value)&&C.i32(C.field(C.u,"you","twoweap").value)))) C.drop_uswapwep();
    /* some cursed items need immediate updating */
    if(Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))&&C.i32(C.confers_luck(otmp))))) {
        C.set_moreluck();
    } else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_HOLDING)) {
        (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
    } else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FIGURINE)) {
        if(Number(!!(Number(!!(Number(C.field(otmp,"obj","corpsenm").value!=C.NON_PM)&&Number(!(C.dead_species(C.field(otmp,"obj","corpsenm").value,(C.i8(1)))))))&&(Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))||(Number(C.i32(C.field((otmp),"obj","where").value)==4)))))))) C.attach_fig_transform_timeout(otmp);
    } else if(Number(C.i32(C.field(otmp,"obj","oclass").value)==C.SPBOOK_CLASS)) {
        /* if book hero is reading becomes cursed, interrupt */
        if(Number(!(already_cursed))) C.book_cursed(otmp);
    }
    if(C.field(otmp,"obj","lamplit").value) maybe_adjust_light(otmp,old_light);
    return;
}

export function uncurse(otmp)
{
    let old_light=0;
    if(C.field(otmp,"obj","lamplit").value) (old_light=C.arti_light_radius(otmp));
    (C.field(otmp,"obj","cursed").value=C.u32(0));
    if(Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))&&C.i32(C.confers_luck(otmp))))) C.set_moreluck();
 else if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BAG_OF_HOLDING)) (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
 else if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FIGURINE)&&C.i32(C.field(otmp,"obj","timed").value)))) C.stop_timer(C.i16(C.FIG_TRANSFORM),C.obj_to_any(otmp));
    if(C.field(otmp,"obj","lamplit").value) maybe_adjust_light(otmp,old_light);
    return;
}

export function blessorcurse(otmp,chance)
{
    chance=C.i32(chance);
    if(Number(!!(C.i32(C.field(otmp,"obj","blessed").value)||C.i32(C.field(otmp,"obj","cursed").value)))) return;
    if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1846,(C.literal("blessorcurse"))),C.rn2(chance))):C.rn2(chance)))))) {
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1847,(C.literal("blessorcurse"))),C.rn2(2))):C.rn2(2)))))) {
            curse(otmp);
        } else {
            bless(otmp);
        }
    }
    return;
}

export function bcsign(otmp)
{
    return (C.i32((Number(!(Number(!(C.field(otmp,"obj","blessed").value))))-Number(!(Number(!(C.field(otmp,"obj","cursed").value)))))));
}

/* set the object's bless/curse-state known flag */
export function set_bknown(obj,onoff)
{
    onoff=C.u32(onoff);
    /* 1 or 0 */
    if(Number(C.u32(C.field(obj,"obj","bknown").value)!=onoff)) {
        (C.field(obj,"obj","bknown").value=onoff);
        if(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==3)&&Number(C.field(C.svm,"instance_globals_saved_m","moves").value>1n)))) C.update_inventory();
    }
}

/*
 *  Calculate the weight of the given object.  This will recursively follow
 *  and calculate the weight of any containers.
 *
 *  Note:  It is possible to end up with an incorrect weight if some part
 *         of the code messes with a contained object and doesn't update the
 *         container's weight.
 *
 *  Note too: obj->owt is an unsigned int and objects[].oc_weight an
 *         unsigned short int, so weight() should probably be changed to
 *         use and return unsigned int instead of signed int.
 */
export function weight(obj)
{
    let wt=C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_weight").value);
    /* weight of 1 'otyp' */
    if(Number(C.field(obj,"obj","quan").value<1n)) {
        C.variadic(13,C.literal("Calculating weight of %ld %s?"),C.field(obj,"obj","quan").value,C.simpleonames(obj));
        return 0;
    }
    /* glob absorption means that merging globs combines their weight
       while quantity stays 1; mksobj(), obj_absorb(), and shrink_glob()
       manage glob->owt and there is nothing for weight() to do except
       return the current value as-is */
    if(C.field(obj,"obj","globby").value) {
        /* 5.0: in 3.6.x this checked for owt==0 and then used
           owt as-is when non-zero or objects[].oc_weight if zero;
           we don't do that anymore because it confused calculating
           the weight of a container when a glob inside shrank down
           to 0 and was about to be deleted [mksobj() now initializes
           owt for globs sooner and the subsequent o->owt = weight(o)
           general initialization is benignly redundant for globs] */
        return C.i32(C.field(obj,"obj","owt").value);
    }
    if(Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))||Number(C.i32(C.field(obj,"obj","otyp").value)==C.STATUE)))) {
        let contents;
        let cwt;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.STATUE)&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))) {
            let msize=C.i32(C.field((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","msize").value); let minwt=C.i32(((C.i32((C.i32((msize+msize))+1)))*100));
            /* 0..7 */
            /* default statue weight is 1.5 times corpse weight */
            (wt=C.i32(Math.trunc((C.i32((3*C.i32(C.field((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","cwt").value)))/2))));
            /* some monsters that never leave a corpse when they die have
               corpse weight defined as 0; statues resembling them need to
               have non-zero weight; others are so tiny (killer bee) that
               they weigh barely more than nothing or so insubstantial
               (wraith) that they actually weigh nothing; statues of such
               need more heft */
            if(Number(wt<minwt)) (wt=minwt);
            /* this has no effect because statues don't stack */
            (wt=C.i32(wt*C.i32(C.field(obj,"obj","quan").value)));
        }
        (cwt=0);
        /* contents weight */
        for((contents=C.field(obj,"obj","cobj").value);contents;(contents=C.field(contents,"obj","nobj").value)) (cwt=C.i32(cwt+weight(contents)));

        /*
         *  The weight of bags of holding is calculated as the weight
         *  of the bag plus the weight of the bag's contents modified
         *  as follows:
         *
         *      Bag status      Weight of contents
         *      ----------      ------------------
         *      cursed                  2x
         *      blessed                 x/4 [rounded up: (x+3)/4]
         *      otherwise               x/2 [rounded up: (x+1)/2]
         *
         *  The macro DELTA_CWT in pickup.c also implements these
         *  weight equations.
         */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BAG_OF_HOLDING)) (cwt=(C.i32(C.field(obj,"obj","cursed").value)?(C.i32((cwt*2))):(C.i32(C.field(obj,"obj","blessed").value)?(C.i32(Math.trunc(((C.i32((cwt+3)))/4)))):(C.i32(Math.trunc(((C.i32((cwt+1)))/2)))))));
        /* uncursed */
        return C.i32((wt+cwt));
    }
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))) {
        let long_wt=C.i64((C.field(obj,"obj","quan").value*C.i64(C.field((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","cwt").value)));
        (wt=((Number(long_wt>C.i64(32767)))?32767:C.i32(long_wt)));
        if(C.field(obj,"obj","oeaten").value) (wt=C.eaten_stat(wt,obj));
        return wt;
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.FOOD_CLASS)&&C.field(obj,"obj","oeaten").value))) {
        return C.eaten_stat(C.i32((C.i32(C.field(obj,"obj","quan").value)*wt)),obj);
    } else if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)) {
        /* 5.0: always weigh at least 1 unit; used to yield 0 for 1..49 */
        (wt=C.i32((C.i64(((C.i64((C.field(obj,"obj","quan").value+50n)))/100n)))));
        return ((Number((wt)>(1))?(wt):(1)));
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.HEAVY_IRON_BALL)&&Number(C.field(obj,"obj","owt").value!=C.u32(0))))) {
        return C.i32(C.field(obj,"obj","owt").value);
        /* kludge for "very" heavy iron ball */
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CANDELABRUM_OF_INVOCATION)&&C.i32(C.field(obj,"obj","spe").value)))) {
        return C.i32((wt+C.i32((C.i32(C.field(obj,"obj","spe").value)*C.i32(C.field((C.objects+Number(C.TALLOW_CANDLE)*C.sizes["struct objclass"]),"objclass","oc_weight").value)))));
    }
    return ((wt?C.i32((wt*C.i32(C.field(obj,"obj","quan").value))):C.i32(((C.i32((C.i32(C.field(obj,"obj","quan").value)+1)))>>1))));
}

export const treefruits=C=>[C.APPLE,C.ORANGE,C.PEAR,C.BANANA,C.EUCALYPTUS_LEAF];
/* called when a tree is kicked; never returns Null */
export function rnd_treefruit_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return mksobj_at(C.cell((C.treefruits+Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),1986,(C.literal("rnd_treefruit_at"))),C.rn2(C.i32((C.u64((BigInt((4*5))/BigInt(4)))))))):C.rn2(C.i32((C.u64((BigInt((4*5))/BigInt(4)))))))))*4),"int").value,x,y,(C.i8(1)),(C.i8(0)));
}

/* for describing objects embedded in trees */
export function is_treefruit(otmp)
{
    let fruitidx;
    for((fruitidx=0);Number(fruitidx<C.i32((C.u64((BigInt((4*5))/BigInt(4))))));(fruitidx=C.i32((fruitidx+1)))) if(Number(C.cell((C.treefruits+Number(fruitidx)*4),"int").value==C.i32(C.field(otmp,"obj","otyp").value))) return (C.i8(1));

    return (C.i8(0));
}

/* create a stack of N gold pieces; never returns Null */
export function mkgold(amount,x,y)
{
    amount=C.i64(amount);
    x=C.i16(x);
    y=C.i16(y);
    let gold=C.g_at(x,y);
    if(Number(amount<=0n)) {
        let mul=C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),2008,(C.literal("mkgold"))),C.rnd(C.i32(Math.trunc((30/((Number((C.i32((12-C.i32(C.depth(C.field(C.u,"you","uz").address)))))>(2))?(C.i32((12-C.i32(C.depth(C.field(C.u,"you","uz").address))))):(2))))))))):C.rnd(C.i32(Math.trunc((30/((Number((C.i32((12-C.i32(C.depth(C.field(C.u,"you","uz").address)))))>(2))?(C.i32((12-C.i32(C.depth(C.field(C.u,"you","uz").address))))):(2))))))))));
        (amount=(C.i64((C.i64(1)+C.i64((C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),2010,(C.literal("mkgold"))),C.rnd(C.i32((C.i32(C.level_difficulty())+2))))):C.rnd(C.i32((C.i32(C.level_difficulty())+2))))))*mul))))));
    }
    if(gold) {
        (C.field(gold,"obj","quan").value=C.i64(C.field(gold,"obj","quan").value+amount));
    } else {
        (gold=mksobj_at(C.GOLD_PIECE,x,y,(C.i8(1)),(C.i8(0))));
        (C.field(gold,"obj","quan").value=amount);
    }
    (C.field(gold,"obj","owt").value=C.u32(weight(gold)));
    return gold;
}

/* potions of oil use their obj->age field differently from other potions
   so changing potion type to or from oil needs to have that fixed up */
export function fixup_oil(potion,source)
{
    /* potion that just had its otyp changed */
    /* item used to create potion; might be Null */
    if(Number(C.i32(C.field(potion,"obj","otyp").value)==C.POT_OIL)) {
        if(Number(!!(source&&Number(C.i32(C.field(source,"obj","otyp").value)==C.POT_OIL)))) {
            /* potion of oil being used to set potion's otyp to oil;
               source might be partly used */
            (C.field(potion,"obj","age").value=C.field(source,"obj","age").value);
        } else {
            /* non-oil is being turned into oil; change absolute age
               (turn created) into relative age (amount remaining /
               burn time available) */
            (C.field(potion,"obj","age").value=C.i64(400));
        }
    } else if(Number(!!(source&&Number(C.i32(C.field(source,"obj","otyp").value)==C.POT_OIL)))) {
        /* potion is no longer oil, being turned into non-oil */
        if(Number(C.field(potion,"obj","age").value==C.field(source,"obj","age").value)) (C.field(potion,"obj","age").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
        /* when source is a partly used oil, mark potion as diluted */
        if(Number(C.field(source,"obj","age").value<C.i64(400))) (C.field(potion,"obj","oeroded").value=C.u32(1));
    }
}

/* return TRUE if the corpse has special timing;
   lizards and lichen don't rot, trolls and Riders auto-revive */
/* mkcorpstat: make a corpse or statue; never returns Null.
 *
 * OEXTRA note: Passing mtmp causes mtraits to be saved
 * even if ptr passed as well, but ptr is always used for
 * the corpse type (corpsenm). That allows the corpse type
 * to be different from the original monster,
 *      i.e.  vampire -> human corpse
 * yet still allow restoration of the original monster upon
 * resurrection.
 */
export function mkcorpstat(objtype,mtmp,ptr,x,y,corpstatflags)
{
    objtype=C.i32(objtype);
    x=C.i16(x);
    y=C.i16(y);
    corpstatflags=C.u32(corpstatflags);
    /* CORPSE or STATUE */
    /* dead monster, might be Null */
    /* if non-Null, overrides mtmp->mndx */
    /* where to place corpse; <0,0> => random */
    let otmp;
    let init=C.i8((Number((C.u32((corpstatflags&C.u32(8))))!=C.u32(0))));
    if(Number(!!(Number(objtype!=C.CORPSE)&&Number(objtype!=C.STATUE)))) C.variadic(14,C.literal("making corpstat type %d"),objtype);
    if(Number(!!(Number(C.i32(x)==0)&&Number(C.i32(y)==0)))) {
        /* special case - random placement */
        (otmp=mksobj(objtype,init,(C.i8(0))));
        C.rloco(otmp);
    } else {
        (otmp=mksobj_at(objtype,x,y,init,(C.i8(0))));
    }
    /* record gender and 'historic statue' in overloaded enchantment field */
    (C.field(otmp,"obj","spe").value=C.i8((C.u32((corpstatflags&C.u32(7))))));
    (C.field(otmp,"obj","oeroded2").value=C.u32(C.field(C.gm,"instance_globals_m","mkcorpstat_norevive").value));
    /* via envrmt rather than flags */
    /* when 'mtmp' is non-null save the monster's details with the
       corpse or statue; it will also force the 'ptr' override below */
    if(mtmp) {
        /* save_mtraits updates otmp->oextra->omonst in place */
        save_mtraits(otmp,mtmp);
        if(Number(!(ptr))) (ptr=C.field(mtmp,"monst","data").value);
        /* don't give a revive timer to a cancelled troll's corpse */
        if(Number(!!(C.i32(C.field(mtmp,"monst","mcan").value)&&Number(!((Number(!!(Number(!!(Number((ptr)==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number((ptr)==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number((ptr)==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))))))))) (C.field(otmp,"obj","oeroded2").value=C.u32(1));
    }
    /* when 'ptr' is non-null it comes from our caller or from 'mtmp';
       override mkobjs()'s initialization of a random monster type */
    if(ptr) {
        let old_corpsenm=C.field(otmp,"obj","corpsenm").value;
        (C.field(otmp,"obj","corpsenm").value=C.i32((C.field((ptr),"permonst","pmidx").value)));
        (C.field(otmp,"obj","owt").value=C.u32(weight(otmp)));
        if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&(Number(!!(Number(!!(C.i32(C.field(C.gz,"instance_globals_z","zombify").value)||(Number(!!((Number(!!(Number((old_corpsenm)==C.PM_LIZARD)||Number((old_corpsenm)==C.PM_LICHEN))))||(Number(!!(Number(C.i32(C.field((C.mons+Number(old_corpsenm)*C.sizes["struct permonst"]),"permonst","mlet").value)==C.S_TROLL)||(Number(!!(Number(!!(Number(((C.mons+Number(old_corpsenm)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number(((C.mons+Number(old_corpsenm)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number(((C.mons+Number(old_corpsenm)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))))))))))))||(Number(!!((Number(!!(Number((C.field(otmp,"obj","corpsenm").value)==C.PM_LIZARD)||Number((C.field(otmp,"obj","corpsenm").value)==C.PM_LICHEN))))||(Number(!!(Number(C.i32(C.field((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]),"permonst","mlet").value)==C.S_TROLL)||(Number(!!(Number(!!(Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_DEATH)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_FAMINE)*C.sizes["struct permonst"]))))||Number(((C.mons+Number(C.field(otmp,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"]))))))))))))))))) {
            C.obj_stop_timers(otmp);
            start_corpse_timeout(otmp);
        }
    }
    return otmp;
}

/*
 * Return the type of monster that this corpse will
 * revive as, even if it has a monster structure
 * attached to it. In that case, you can't just
 * use obj->corpsenm, because the stored monster
 * type can, and often is, different.
 * The return value is an index into mons[].
 */
export function corpse_revive_type(obj)
{
    let revivetype=C.field(obj,"obj","corpsenm").value;
    let mtmp;
    if(Number(!!((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))&&(Number(((mtmp=get_mtraits(obj,(C.i8(0)))))!=0))))) {
        /* mtmp is a temporary pointer to a monster's stored
        attributes, not a real monster */
        (revivetype=C.i32(C.field(mtmp,"monst","mnum").value));
    }
    return revivetype;
}

/*
 * Attach a monster id to an object, to provide
 * a lasting association between the two.
 */
export function obj_attach_mid(obj,mid)
{
    mid=C.u32(mid);
    if(Number(!!(Number(!(mid))||Number(!(obj))))) return 0;
    newomid(obj);
    ((C.field(C.field((obj),"obj","oextra").value,"oextra","omid").value)=mid);
    return obj;
}

export function save_mtraits(obj,mtmp)
{
    if(C.field(mtmp,"monst","ispriest").value) C.forget_temple_entry(mtmp);
    /* EPRI() */
    if(Number(!((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))))) newomonst(obj);
    if((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))) {
        let baselevel=C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mlevel").value);
        /* mtmp->data is valid ptr */
        let mtmp2=(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value);
        C.copyRecord(mtmp2,mtmp,C.sizes["struct monst"]);
        (C.field(mtmp2,"monst","mextra").value=0);
        (C.field(mtmp2,"monst","mnum").value=C.i16((C.field((C.field(mtmp,"monst","data").value),"permonst","pmidx").value)));
        /* invalidate pointers */
        /* m_id is needed to know if this is a revived quest leader */
        /* but m_id must be cleared when loading bones */
        (C.field(mtmp2,"monst","nmon").value=0);
        (C.field(mtmp2,"monst","data").value=0);
        (C.field(mtmp2,"monst","minvent").value=0);
        ((C.field((mtmp2),"monst","mw").value=0));
        /* mtmp2->mw = (struct obj *) 0; */
        if(C.field(mtmp,"monst","mextra").value) C.copy_mextra(mtmp2,mtmp);
        /* if mtmp is a long worm with segments, its saved traits will
           be one without any segments */
        (C.field(mtmp2,"monst","wormno").value=C.u32(0));
        /* mtmp might have been killed by repeated life draining; make sure
           mtmp2 can survive if revived ('baselevel' will be 0 for 1d4 mon) */
        if(Number(C.field(mtmp2,"monst","mhpmax").value<=baselevel)) (C.field(mtmp2,"monst","mhpmax").value=C.i32((baselevel+1)));
        /* mtmp is assumed to be dead but we don't kill it or its saved
           traits, just force those to have a sane value for current HP */
        if(Number(C.field(mtmp2,"monst","mhp").value>C.field(mtmp2,"monst","mhpmax").value)) (C.field(mtmp2,"monst","mhp").value=C.field(mtmp2,"monst","mhpmax").value);
        if(Number(C.field(mtmp2,"monst","mhp").value<1)) (C.field(mtmp2,"monst","mhp").value=0);
        (C.field(mtmp2,"monst","mstate").value=C.i64(C.field(mtmp2,"monst","mstate").value&C.i64(C.i32((~2)))));
    }
    return obj;
}

/* returns a pointer to a new monst structure based on
 * the one contained within the obj.
 */
export function get_mtraits(obj,copyof)
{
    copyof=C.i8(copyof);
    let mtmp=0;
    let mnew=0;
    if((Number(!!(C.field((obj),"obj","oextra").value&&(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value))))) (mtmp=(C.field(C.field((obj),"obj","oextra").value,"oextra","omonst").value));
    if(mtmp) {
        if(copyof) {
            (mnew=C.alloc(C.u32(BigInt(C.sizes["struct monst"]))));
            C.copyRecord(mnew,mtmp,C.sizes["struct monst"]);
            (C.field(mnew,"monst","mextra").value=0);
            if(C.field(mtmp,"monst","mextra").value) C.copy_mextra(mnew,mtmp);
        } else {
            /* Never insert this returned pointer into mon chains! */
            (mnew=mtmp);
        }
        (C.field(mnew,"monst","data").value=(C.mons+Number(C.field(mnew,"monst","mnum").value)*C.sizes["struct permonst"]));
    }
    return mnew;
}

/* make an object named after someone listed in the scoreboard file;
   never returns Null */
export function mk_tt_object(objtype,x,y)
{
    objtype=C.i32(objtype);
    x=C.i16(x);
    y=C.i16(y);
    /* CORPSE or STATUE */
    let otmp;
    let initialize_it;
    /* player statues never contain books */
    (initialize_it=C.i8((Number(objtype!=C.STATUE))));
    (otmp=mksobj_at(objtype,x,y,initialize_it,(C.i8(0))));
    /* tt_oname() will return null if the scoreboard is empty, which in
       turn leaves the random corpsenm value; force it to match a player */
    if(Number(!(C.tt_oname(otmp)))) {
        let pm=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),2241,(C.literal("mk_tt_object"))),C.rn2(C.i32((C.i32((C.PM_WIZARD-C.PM_ARCHEOLOGIST))+1))))):C.rn2(C.i32((C.i32((C.PM_WIZARD-C.PM_ARCHEOLOGIST))+1)))))+(C.PM_ARCHEOLOGIST))));
        /* update weight for either, force timer sanity for corpses */
        set_corpsenm(otmp,pm);
    }
    return otmp;
}

/* make a new corpse or statue, uninitialized if a statue (i.e. no books);
   never returns Null */
export function mk_named_object(objtype,ptr,x,y,nm)
{
    objtype=C.i32(objtype);
    x=C.i16(x);
    y=C.i16(y);
    /* CORPSE or STATUE */
    let otmp;
    let corpstatflags=C.u32(((Number(objtype!=C.STATUE))?8:0));
    (otmp=mkcorpstat(objtype,0,ptr,x,y,corpstatflags));
    if(nm) (otmp=C.oname(otmp,nm,0));
    return otmp;
}

export function is_flammable(otmp)
{
    let otyp=C.i32(C.field(otmp,"obj","otyp").value);
    let omat=C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value);
    /* Candles can be burned, but they're not flammable in the sense that
     * they can't get fire damage and it makes no sense for them to be
     * fireproofed.
     */
    if((Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.TALLOW_CANDLE)||Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAX_CANDLE))))) return (C.i8(0));
    if(Number(!!(Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_oprop").value)==C.FIRE_RES)||Number(otyp==C.WAN_FIRE)))) return (C.i8(0));
    return C.i8((Number(!!((Number(!!(Number(omat<=C.WOOD)&&Number(omat!=C.LIQUID))))||Number(omat==C.PLASTIC)))));
}

export function is_rottable(otmp)
{
    let otyp=C.i32(C.field(otmp,"obj","otyp").value);
    return C.i8((Number(!!((Number(!!(Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value)<=C.WOOD)&&Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value)!=C.LIQUID))))||Number(C.i32(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.DRAGON_HIDE)))));
}

/*
 * These routines maintain the single-linked lists headed in level.objects[][]
 * and threaded through the nexthere fields in the object-instance structure.
 */
/* put the object at the given location */
export function place_object(otmp,x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let otmp2;
    if(Number(!(C.isok(x,y)))) {
        /* validate location */
        let func;
        (func=((Number(!!(Number(!!(Number(!!(Number(C.i32(x)<0)||Number(C.i32(y)<0)))||Number(C.i32(x)>C.i32((80-1)))))||Number(C.i32(y)>C.i32((21-1))))))?C.functionPointer("panic"):C.functionPointer("impossible")));
        C.variadic(15,(func),C.literal("place_object: \"%s\" [%d] off map <%d,%d>"),C.safe_typename(C.i32(C.field(otmp,"obj","otyp").value)),C.i32(C.field(otmp,"obj","where").value),C.i32(x),C.i32(y));
        /* we'll only get to here if we've issued a warning (and fuzzer
           is not running since it escalates impossible to panic), so
           x,y has failed isok() but is within array bounds for the map;
           in other words, x specifies column 0 which should not happen
           but we let the game keep going */
    }
    if(Number(C.i32(C.field(otmp,"obj","where").value)!=0)) C.variadic(16,C.literal("place_object: obj \"%s\" [%d] not free"),C.safe_typename(C.i32(C.field(otmp,"obj","otyp").value)),C.i32(C.field(otmp,"obj","where").value));
    ((Number(!!((Number(!!(Number(!!(Number(!!(Number(C.i32(x)>=0)&&Number(C.i32(x)<80)))&&Number(C.i32(y)>=0)))&&Number(C.i32(y)<21))))||((C.__assert_fail(C.literal("x >= 0 && x < COLNO && y >= 0 && y < ROWNO"),C.literal("mkobj.c"),2327,(C.literal("place_object"))),0))))));
    (otmp2=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);
    C.obj_no_longer_held(otmp);
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BOULDER)) {
        if(Number(!!(Number(!(otmp2))||Number(C.i32(C.field(otmp2,"obj","otyp").value)!=C.BOULDER)))) C.block_point(C.i32(x),C.i32(y));
        /* vision */
    }
    /* non-boulder object goes under boulders so that map will show boulder
       here without display code needing to traverse pile chain to find one */
    if(Number(!!(Number(!!(otmp2&&Number(C.i32(C.field(otmp2,"obj","otyp").value)==C.BOULDER)))&&Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.BOULDER)))) {
        /* 3.6.3: put otmp under last consecutive boulder rather than under
           just the first one */
        while(Number(!!(C.field(C.field(otmp2,"obj","v").address,"vptrs","v_nexthere").value&&Number(C.i32(C.field(C.field(C.field(otmp2,"obj","v").address,"vptrs","v_nexthere").value,"obj","otyp").value)==C.BOULDER)))) (otmp2=C.field(C.field(otmp2,"obj","v").address,"vptrs","v_nexthere").value);

        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value=C.field(C.field(otmp2,"obj","v").address,"vptrs","v_nexthere").value);
        (C.field(C.field(otmp2,"obj","v").address,"vptrs","v_nexthere").value=otmp);
    } else {
        /* put on top of current pile */
        (C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value=otmp2);
        (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value=otmp);
    }
    /* set the object's new location */
    (C.field(otmp,"obj","ox").value=x);
    (C.field(otmp,"obj","oy").value=y);
    (C.field(otmp,"obj","where").value=C.i8(1));
    /* if placed outside of shop, no_charge is no longer applicable */
    if(Number(!!(Number(!!(C.i32(C.field(otmp,"obj","no_charge").value)&&Number(!(C.costly_spot(x,y)))))&&Number(!(C.costly_adjacent(C.find_objowner(otmp,x,y),x,y)))))) (C.field(otmp,"obj","no_charge").value=C.u32(0));
    /* add to floor chain */
    (C.field(otmp,"obj","nobj").value=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value=otmp);
    if(C.field(otmp,"obj","timed").value) obj_timer_checks(otmp,x,y,0);
}

/* tear down the object pile at <x,y> and create it again, so that any
   boulders which are present get forced to the top */
export function recreate_pile_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let otmp; let next_obj; let reversed=0;
    /* remove all objects at <x,y>, saving a reversed temporary list */
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=next_obj)) {
        (next_obj=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value);
        remove_object(otmp);
        /* obj_extract_self() for floor */
        (C.field(otmp,"obj","nobj").value=reversed);
        (reversed=otmp);
    }
    /* pile at <tx,ty> is now empty; create new one, re-reversing to restore
       original order; place_object() handles making boulders be on top */
    for((otmp=reversed);otmp;(otmp=next_obj)) {
        (next_obj=C.field(otmp,"obj","nobj").value);
        (C.field(otmp,"obj","nobj").value=0);
        /* obj->where is OBJ_FREE */
        place_object(otmp,x,y);
    }
}

/* rotting on ice takes 2 times as long */
/* If ice was affecting any objects correct that now
 * Also used for starting ice effects too. [zap.c]
 */
export function obj_ice_effects(x,y,do_buried)
{
    x=C.i16(x);
    y=C.i16(y);
    do_buried=C.i8(do_buried);
    let otmp;
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);otmp;(otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value)) {
        if(C.field(otmp,"obj","timed").value) obj_timer_checks(otmp,x,y,0);
    }
    if(do_buried) {
        for((otmp=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);otmp;(otmp=C.field(otmp,"obj","nobj").value)) {
            if(Number(!!(Number(C.i32(C.field(otmp,"obj","ox").value)==C.i32(x))&&Number(C.i32(C.field(otmp,"obj","oy").value)==C.i32(y))))) {
                if(C.field(otmp,"obj","timed").value) obj_timer_checks(otmp,x,y,0);
            }
        }
    }
}

/*
 * Returns an obj->age for a corpse object on ice, that would be the
 * actual obj->age if the corpse had just been lifted from the ice.
 * This is useful when just using obj->age in a check or calculation because
 * rot timers pertaining to the object don't have to be stopped and
 * restarted etc.
 */
export function peek_at_iced_corpse_age(otmp)
{
    let age; let retval=C.field(otmp,"obj","age").value;
    if(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&C.i32(C.field(otmp,"obj","recharged").value)))) {
        /* Adjust the age; must be same as obj_timer_checks() for off ice*/
        (age=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(otmp,"obj","age").value)));
        (retval=C.i64(retval+C.i64((C.i64((age*C.i64((C.i32((2-1))))))/C.i64(2)))));
        do {
            if(C.debugcore(C.literal("mkobj.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(17,C.literal("The %s age has ice modifications: otmp->age = %ld, returning %ld."),C.s_suffix(C.doname(otmp)),C.field(otmp,"obj","age").value,retval);
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
        do {
            if(C.debugcore(C.literal("mkobj.c"),(C.i8(1)))) {
                let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                C.variadic(18,C.literal("Effective age of corpse: %ld."),C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-retval)));
                (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
            }
        } while(0);
    }
    return retval;
}

export function obj_timer_checks(otmp,x,y,force)
{
    x=C.i16(x);
    y=C.i16(y);
    force=C.i32(force);
    /* 0 = no force so do checks, <0 = force off, >0 force on */
    let tleft=0n;
    let action=C.i16(C.ROT_CORPSE);
    let restart_timer=(C.i8(0));
    let on_floor=C.i8((Number(C.i32(C.field(otmp,"obj","where").value)==1)));
    let buried=C.i8((Number(C.i32(C.field(otmp,"obj","where").value)==6)));
    /* Check for corpses just placed on or in ice */
    if(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&(Number(!!(C.i32(on_floor)||C.i32(buried))))))&&C.i32(C.is_ice(x,y))))) {
        (tleft=C.stop_timer(action,C.obj_to_any(otmp)));
        if(Number(tleft==0n)) {
            (action=C.i16(C.REVIVE_MON));
            (tleft=C.stop_timer(action,C.obj_to_any(otmp)));
        }
        if(Number(tleft!=0n)) {
            let age;
            /* mark the corpse as being on ice */
            (C.field(otmp,"obj","recharged").value=C.u32(1));
            do {
                if(C.debugcore(C.literal("mkobj.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(19,C.literal("%s is now on ice at <%d,%d>."),C.The(C.xname(otmp)),C.i32(x),C.i32(y));
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
            /* Adjust the time remaining */
            (tleft=C.i64(tleft*C.i64(2)));
            (restart_timer=(C.i8(1)));
            /* Adjust the age; time spent off ice needs to be multiplied
               by the ice adjustment and subtracted from the age so that
               later calculations behave as if it had been on ice during
               that time (longwinded way of saying this is the inverse
               of removing it from the ice and of peeking at its age). */
            (age=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(otmp,"obj","age").value)));
            (C.field(otmp,"obj","age").value=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-(C.i64((age*C.i64(2)))))));
        }
        /* Check for corpses coming off ice */
    } else if(Number(!!(Number(force<0)||(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.CORPSE)&&C.i32(C.field(otmp,"obj","recharged").value)))&&Number(!((Number(!!((Number(!!(C.i32(on_floor)||C.i32(buried))))&&C.i32(C.is_ice(x,y))))))))))))) {
        (tleft=C.stop_timer(action,C.obj_to_any(otmp)));
        if(Number(tleft==0n)) {
            (action=C.i16(C.REVIVE_MON));
            (tleft=C.stop_timer(action,C.obj_to_any(otmp)));
        }
        if(Number(tleft!=0n)) {
            let age;
            (C.field(otmp,"obj","recharged").value=C.u32(0));
            do {
                if(C.debugcore(C.literal("mkobj.c"),(C.i8(1)))) {
                    let save_plnmsg=C.field(C.iflags,"instance_flags","last_msg").value;
                    C.variadic(20,C.literal("%s is no longer on ice at <%d,%d>."),C.The(C.xname(otmp)),C.i32(x),C.i32(y));
                    (C.field(C.iflags,"instance_flags","last_msg").value=save_plnmsg);
                }
            } while(0);
            /* Adjust the remaining time */
            (tleft=C.i64(tleft/C.i64(2)));
            (restart_timer=(C.i8(1)));
            /* Adjust the age */
            (age=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(otmp,"obj","age").value)));
            (C.field(otmp,"obj","age").value=C.i64(C.field(otmp,"obj","age").value+C.i64((C.i64((age*C.i64((C.i32((2-1))))))/C.i64(2)))));
        }
    }
    /* now re-start the timer with the appropriate modifications */
    if(restart_timer) C.start_timer(tleft,C.i16(C.TIMER_OBJECT),action,C.obj_to_any(otmp));
}

export function remove_object(otmp)
{
    let x=C.field(otmp,"obj","ox").value;
    let y=C.field(otmp,"obj","oy").value;
    if(Number(C.i32(C.field(otmp,"obj","where").value)!=1)) C.variadic(21,C.literal("remove_object: obj where=%d, not on floor"),C.i32(C.field(otmp,"obj","where").value));
    extract_nexthere(otmp,((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8));
    extract_nobj(otmp,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").address);
    if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.BOULDER)) C.recalc_block_point(x,y);
    /* vision */
    if(C.field(otmp,"obj","timed").value) obj_timer_checks(otmp,x,y,0);
}

/* throw away all of a monster's inventory */
export function discard_minvent(mtmp,uncreate_artifacts)
{
    uncreate_artifacts=C.i8(uncreate_artifacts);
    let otmp;
    while(Number(((otmp=C.field(mtmp,"monst","minvent").value))!=0)) {
        /* this has now become very similar to m_useupall()... */
        C.extract_from_minvent(mtmp,otmp,(C.i8(1)),(C.i8(1)));
        if(Number(!!(C.i32(uncreate_artifacts)&&C.i32(C.field(otmp,"obj","oartifact").value)))) C.artifact_exists(otmp,C.safe_oname(otmp),(C.i8(0)),0);
        C.obfree(otmp,0);
        /* dealloc_obj() isn't sufficient */
    }
}

/*
 * Free obj from whatever list it is on in preparation for deleting it
 * or moving it elsewhere; obj->where will end up set to OBJ_FREE unless
 * it is already OBJ_LUAFREE or OBJ_DELETED.
 * Doesn't handle unwearing of objects in hero's or monsters' inventories.
 *
 * Object positions:
 *      OBJ_FREE        not on any list
 *      OBJ_FLOOR       fobj, level.locations[][] chains (use remove_object)
 *      OBJ_CONTAINED   cobj chain of container object
 *      OBJ_INVENT      hero's invent chain (use freeinv)
 *      OBJ_MINVENT     monster's invent chain
 *      OBJ_MIGRATING   migrating chain
 *      OBJ_BURIED      level.buriedobjs chain
 *      OBJ_ONBILL      on gb.billobjs chain
 *      OBJ_LUAFREE     obj is dealloc'd from core, but still used by lua
 *      OBJ_DELETED     obj has been deleted from play but not yet deallocated
 */
export function obj_extract_self(obj)
{
    switch(C.i32(C.field(obj,"obj","where").value)) {
        case (0):
            case (8):
                case (9):
                    break;
        case (1):
            remove_object(obj);
        break;
        case (2):
            extract_nobj(obj,C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value,"obj","cobj").address);
        container_weight(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value);
        (C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value=0);
        /* clear stale back-link */
        break;
        case (3):
            C.freeinv(obj);
        break;
        case (4):
            extract_nobj(obj,C.field(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value,"monst","minvent").address);
        (C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value=0);
        /* clear stale back-link */
        break;
        case (5):
            extract_nobj(obj,C.field(C.gm,"instance_globals_m","migrating_objs").address);
        break;
        case (6):
            extract_nobj(obj,C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").address);
        break;
        case (7):
            extract_nobj(obj,C.field(C.gb,"instance_globals_b","billobjs").address);
        break;
        default:
            C.variadic(22,C.literal("obj_extract_self, where=%d"),C.i32(C.field(obj,"obj","where").value));
        break;
    }
}

/* Extract the given object from the chain, following nobj chain. */
export function extract_nobj(obj,head_ptr)
{
    let curr; let prev;
    (curr=C.cell(head_ptr,"struct obj *").value);
    for((prev=0);curr;((prev=curr),(curr=C.field(curr,"obj","nobj").value))) {
        if(Number(curr==obj)) {
            if(prev) (C.field(prev,"obj","nobj").value=C.field(curr,"obj","nobj").value);
 else (C.cell(head_ptr,"struct obj *").value=C.field(curr,"obj","nobj").value);
            break;
        }
    }
    if(Number(!(curr))) C.variadic(23,C.literal("extract_nobj: object lost"));
    (C.field(obj,"obj","where").value=C.i8(0));
    (C.field(obj,"obj","nobj").value=0);
}

/*
 * Extract the given object from the chain, following nexthere chain.
 *
 * This does not set obj->where, this function is expected to be called
 * in tandem with extract_nobj, which does set it.
 */
export function extract_nexthere(obj,head_ptr)
{
    let curr; let prev;
    (curr=C.cell(head_ptr,"struct obj *").value);
    for((prev=0);curr;((prev=curr),(curr=C.field(C.field(curr,"obj","v").address,"vptrs","v_nexthere").value))) {
        if(Number(curr==obj)) {
            if(prev) (C.field(C.field(prev,"obj","v").address,"vptrs","v_nexthere").value=C.field(C.field(curr,"obj","v").address,"vptrs","v_nexthere").value);
 else (C.cell(head_ptr,"struct obj *").value=C.field(C.field(curr,"obj","v").address,"vptrs","v_nexthere").value);
            break;
        }
    }
    if(Number(!(curr))) C.variadic(24,C.literal("extract_nexthere: object lost"));
    (C.field(C.field(obj,"obj","v").address,"vptrs","v_nexthere").value=0);
}

/*
 * Add obj to mon's inventory.  If obj is able to merge with something already
 * in the inventory, then the passed obj is deleted and 1 is returned.
 * Otherwise 0 is returned.
 */
export function add_to_minv(mon,obj)
{
    const stackFrame=C.stackSave();
    try {
    const objAddress=C.stackAlloc(8);C.cell(objAddress,"struct obj *").value=obj;
    let otmpAddress=C.stackAlloc(8);
    if(Number(C.i32(C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value)!=0)) C.variadic(25,C.literal("add_to_minv: obj where=%d, not free"),C.i32(C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value));
    /* merge if possible */
    for((C.cell(otmpAddress,"struct obj *").value=C.field(mon,"monst","minvent").value);C.cell(otmpAddress,"struct obj *").value;(C.cell(otmpAddress,"struct obj *").value=C.field(C.cell(otmpAddress,"struct obj *").value,"obj","nobj").value)) if(C.merged(otmpAddress,objAddress)) return 1;

    /* obj merged and then free'd */
    /* else insert; don't bother forcing it to end of chain */
    (C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value=C.i8(4));
    (C.field(C.field(C.cell(objAddress,"struct obj *").value,"obj","v").address,"vptrs","v_ocarry").value=mon);
    (C.field(C.cell(objAddress,"struct obj *").value,"obj","nobj").value=C.field(mon,"monst","minvent").value);
    (C.field(mon,"monst","minvent").value=C.cell(objAddress,"struct obj *").value);
    return 0;
    /* obj on mon's inventory chain */
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Add obj to container, make sure obj is "free".  Returns (merged) obj.
 * The input obj may be deleted in the process.
 *
 * Caveat:  this does not update the container's weight [possibly to
 * prevent that from being recalculated repeatedly when adding multiple
 * items].
 */
export function add_to_container(container,obj)
{
    const stackFrame=C.stackSave();
    try {
    const objAddress=C.stackAlloc(8);C.cell(objAddress,"struct obj *").value=obj;
    let otmpAddress=C.stackAlloc(8);
    if(Number(C.i32(C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value)!=0)) C.variadic(26,C.literal("add_to_container: obj where=%d, not free"),C.i32(C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value));
    if(Number(!!(Number(C.i32(C.field(container,"obj","where").value)!=3)&&Number(C.i32(C.field(container,"obj","where").value)!=4)))) C.obj_no_longer_held(C.cell(objAddress,"struct obj *").value);
    /* merge if possible */
    for((C.cell(otmpAddress,"struct obj *").value=C.field(container,"obj","cobj").value);C.cell(otmpAddress,"struct obj *").value;(C.cell(otmpAddress,"struct obj *").value=C.field(C.cell(otmpAddress,"struct obj *").value,"obj","nobj").value)) if(C.merged(otmpAddress,objAddress)) return C.cell(otmpAddress,"struct obj *").value;

    (C.field(C.cell(objAddress,"struct obj *").value,"obj","where").value=C.i8(2));
    (C.field(C.field(C.cell(objAddress,"struct obj *").value,"obj","v").address,"vptrs","v_ocontainer").value=container);
    (C.field(C.cell(objAddress,"struct obj *").value,"obj","nobj").value=C.field(container,"obj","cobj").value);
    (C.field(container,"obj","cobj").value=C.cell(objAddress,"struct obj *").value);
    return C.cell(objAddress,"struct obj *").value;
    } finally {C.stackRestore(stackFrame); }
}

export function add_to_migration(obj)
{
    if(Number(C.i32(C.field(obj,"obj","where").value)!=0)) C.variadic(27,C.literal("add_to_migration: obj where=%d, not free"),C.i32(C.field(obj,"obj","where").value));
    if(C.field(obj,"obj","unpaid").value) C.variadic(28,C.literal("unpaid object migrating to another level? [%s]"),C.simpleonames(obj));
    /* caller should have changed unpaid item to stolen */
    (C.field(obj,"obj","no_charge").value=C.u32(0));
    /* was only relevant while inside a shop */
    /* lock picking context becomes stale if it's for this object */
    if((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))) C.maybe_reset_pick(obj);
    (C.field(obj,"obj","where").value=C.i8(5));
    (C.field(obj,"obj","nobj").value=C.field(C.gm,"instance_globals_m","migrating_objs").value);
    (C.field(obj,"obj","omigr_from_dnum").value=C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value);
    (C.field(obj,"obj","omigr_from_dlevel").value=C.field(C.field(C.u,"you","uz").address,"d_level","dlevel").value);
    (C.field(C.gm,"instance_globals_m","migrating_objs").value=obj);
}

export function add_to_buried(obj)
{
    if(Number(C.i32(C.field(obj,"obj","where").value)!=0)) C.variadic(29,C.literal("add_to_buried: obj where=%d, not free"),C.i32(C.field(obj,"obj","where").value));
    (C.field(obj,"obj","where").value=C.i8(6));
    (C.field(obj,"obj","nobj").value=C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value);
    (C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value=obj);
}

/* recalculate weight of object, which doesn't have to be a container
   itself; if it is contained, recursively handle _its_ container(s) */
export function container_weight(object)
{
    (C.field(object,"obj","owt").value=C.u32(weight(object)));
    if(Number(C.i32(C.field(object,"obj","where").value)==2)) container_weight(C.field(C.field(object,"obj","v").address,"vptrs","v_ocontainer").value);
}

/*
 * Mark object to be deallocated.  _All_ objects should be run through here
 * for them to be deallocated.
 */
export function dealloc_obj(obj)
{
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)) (C.field(obj,"obj","corpsenm").value=0);
    if(Number(C.i32(C.field(obj,"obj","where").value)==9)) {
        C.variadic(30,C.literal("dealloc_obj: obj already deleted (type=%d)"),C.i32(C.field(obj,"obj","otyp").value));
        return;
    } else if(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)!=0)&&Number(C.i32(C.field(obj,"obj","where").value)!=8)))) {
        C.variadic(31,C.literal("dealloc_obj: obj not free (type=%d, where=%d)"),C.i32(C.field(obj,"obj","otyp").value),C.i32(C.field(obj,"obj","where").value));
    }
    if(C.field(obj,"obj","nobj").value) C.variadic(32,C.literal("dealloc_obj with nobj"));
    if(C.field(obj,"obj","cobj").value) C.variadic(33,C.literal("dealloc_obj with cobj"));
    if(Number(obj==C.hands_obj)) {
        C.variadic(34,C.literal("dealloc_obj with hands_obj"));
        return;
    }
    /* free up any timers attached to the object */
    if(C.field(obj,"obj","timed").value) C.obj_stop_timers(obj);
    /*
     * Free up any light sources attached to the object.
     *
     * We may want to just call del_light_source() without any
     * checks (requires a code change there).  Otherwise this
     * list must track all objects that can have a light source
     * attached to it (and also requires lamplit to be set).
     */
    if(C.obj_sheds_light(obj)) {
        C.del_light_source(C.LS_OBJECT,C.obj_to_any(obj));
        (C.field(obj,"obj","lamplit").value=C.u32(0));
    }
    if(Number(obj==C.field(C.gt,"instance_globals_t","thrownobj").value)) (C.field(C.gt,"instance_globals_t","thrownobj").value=0);
    if(Number(obj==C.field(C.gk,"instance_globals_k","kickedobj").value)) (C.field(C.gk,"instance_globals_k","kickedobj").value=0);
    if(Number(obj==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","tin").value)) {
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","tin").value=0);
        (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","tin").address,"tin_info","o_id").value=C.u32(0));
    }
    /* if obj came from the most recent splitobj(), it's no longer eligible
       for unsplitobj(); perform inline clear_splitobjs() */
    if(Number(!!(Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value)||Number(C.field(obj,"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value)))) (C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","parent_oid").value=(C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","objsplit").address,"obj_split","child_oid").value=C.u32(0)));
    if(C.field(obj,"obj","lua_ref_cnt").value) {
        /* obj is referenced from a lua script, let lua gc free it */
        (C.field(obj,"obj","where").value=C.i8(8));
        return;
    }
    if(Number(!(C.field(C.program_state,"sinfo","freeingdata").value))) {
        /* mark object as deleted, put it into queue to be freed */
        (C.field(obj,"obj","where").value=C.i8(9));
        (C.field(obj,"obj","nobj").value=C.field(C.go,"instance_globals_o","objs_deleted").value);
        (C.field(C.go,"instance_globals_o","objs_deleted").value=obj);
    } else {
        /* when saving, there's no need to stage deletions on objs_deleted */
        dealloc_obj_real(obj);
    }
}

/* actually deallocate the object */
export function dealloc_obj_real(obj)
{
    if(C.field(obj,"obj","oextra").value) dealloc_oextra(obj);
    /* clear out of date information contained in the about-to-become
       stale memory so that potential used-after-freed bugs (should never
       happen) might trigger an object lost panic instead of continuing;
       linking with a debugging malloc library is likely to do something
       similar so this is mainly useful for ordinary malloc/free */
    C.copyRecord(obj,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
    C.free(obj);
}

/* free all the objects marked for deletion */
export function dobjsfree()
{
    let otmp;
    while(C.field(C.go,"instance_globals_o","objs_deleted").value) {
        (otmp=C.field(C.go,"instance_globals_o","objs_deleted").value);
        (C.field(C.go,"instance_globals_o","objs_deleted").value=C.field(otmp,"obj","nobj").value);
        if(Number(C.i32(C.field(otmp,"obj","where").value)!=9)) C.variadic(35,C.literal("dobjsfree: obj where=%d, not OBJ_DELETED"),C.i32(C.field(otmp,"obj","where").value));
        obj_extract_self(otmp);
        dealloc_obj_real(otmp);
    }
}

/* create an object from a horn of plenty; mirrors bagotricks(makemon.c) */
export function hornoplenty(horn,tipping,targetbox)
{
    tipping=C.i8(tipping);
    /* caller emptying entire contents; affects shop mesgs */
    /* if non-Null, container to tip into */
    let objcount=0;
    if(Number(!!(Number(!(horn))||Number(C.i32(C.field(horn,"obj","otyp").value)!=C.HORN_OF_PLENTY)))) {
        C.variadic(36,C.literal("bad horn o' plenty"));
    } else if(Number(C.i32(C.field(horn,"obj","spe").value)<1)) {
        C.variadic(37,C.literal("%s"),C.field(C.c_common_strings,"c_common_strings","c_nothing_happens").value);
        if(Number(!(C.field(horn,"obj","cknown").value))) {
            (C.field(horn,"obj","cknown").value=C.u32(1));
            C.update_inventory();
        }
    } else {
        let obj;
        let what;
        C.consume_obj_charge(horn,C.i8(Number(!(tipping))));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),2867,(C.literal("hornoplenty"))),C.rn2(13))):C.rn2(13)))))) {
            (obj=mkobj(C.POTION_CLASS,(C.i8(0))));
            if(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_magic").value) {
                do {
                    (C.field(obj,"obj","otyp").value=C.i16(C.rnd_class(C.POT_BOOZE,C.POT_WATER)));
                } while(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_SICKNESS));
                /* oil uses obj->age field differently from other potions */
                if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_OIL)) fixup_oil(obj,(0));
            }
            (what=((Number(C.field(obj,"obj","quan").value>1n))?C.literal("Some potions"):C.literal("A potion")));
        } else {
            (obj=mkobj(C.FOOD_CLASS,(C.i8(0))));
            if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FOOD_RATION)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),2880,(C.literal("hornoplenty"))),C.rn2(7))):C.rn2(7)))))))) (C.field(obj,"obj","otyp").value=C.i16(C.LUMP_OF_ROYAL_JELLY));
            (what=C.literal("Some food"));
        }
        (objcount=C.i32((objcount+1)));
        C.variadic(38,C.literal("%s %s out."),what,C.vtense(what,C.literal("spill")));
        (C.field(obj,"obj","blessed").value=C.field(horn,"obj","blessed").value);
        (C.field(obj,"obj","cursed").value=C.field(horn,"obj","cursed").value);
        (C.field(obj,"obj","owt").value=C.u32(weight(obj)));
        /* using a shop's horn of plenty entails a usage fee and also
           confers ownership of the created item to the shopkeeper */
        if(C.field(horn,"obj","unpaid").value) C.addtobill(obj,(C.i8(0)),(C.i8(0)),tipping);
        /* if it ended up on bill, we don't want "(unpaid, N zorkmids)"
           being included in its formatted name during next message */
        ((C.field(C.iflags,"instance_flags","suppress_price").value=C.i32((C.field(C.iflags,"instance_flags","suppress_price").value+1)))-1);
        if(Number(!(tipping))) {
            (obj=C.hold_another_object(obj,(C.i32(C.field(C.u,"you","uswallow").value)?C.literal("Oops!  %s out of your reach!"):((Number(!!(Number(!!(Number(!!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_air_level").address))))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_water_level").address))))))))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)<C.IRONBARS)))||Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value)>=C.ICE))))?C.literal("Oops!  %s away from you!"):C.literal("Oops!  %s to the floor!"))),C.The(C.aobjnam(obj,C.literal("slip"))),0));
            ((obj));
        } else if(targetbox) {
            add_to_container(targetbox,obj);
            /* add to container doesn't update the weight */
            (C.field(targetbox,"obj","owt").value=C.u32(weight(targetbox)));
            /* item still in magic horn was weightless; when it's now in
               a carried container, hero's encumbrance could change */
            if((Number(C.i32(C.field((targetbox),"obj","where").value)==3))) {
                C.encumber_msg();
                C.update_inventory();
                /* for contents count or wizweight */
            }
        } else {
            /* assumes this is taking place at hero's location */
            if(Number(!(C.can_reach_floor((C.i8(1)))))) {
                C.hitfloor(obj,(C.i8(1)));
                /* does altar check, message, drop */
            } else {
                if((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.u,"you","ux").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.u,"you","uy").value)*C.sizes["struct rm"]),"rm","typ").value))==C.ALTAR))) C.doaltarobj(obj);
 else C.variadic(39,C.literal("%s %s to the %s."),C.Doname2(obj),C.otense(obj,C.literal("drop")),C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
                /* does its own drop message */
                C.dropy(obj);
            }
        }
        ((C.field(C.iflags,"instance_flags","suppress_price").value=C.i32((C.field(C.iflags,"instance_flags","suppress_price").value-1)))+1);
        if(C.field(horn,"obj","dknown").value) C.discover_object((C.HORN_OF_PLENTY),(C.i8(1)),(C.i8(1)),(C.i8(1)));
    }
    return objcount;
}

/* support for wizard-mode's `sanity_check' option */
/* pline formats for insane_object() */
export const ofmt0=C=>C.literal("%s obj %s %s: %s");
export const ofmt3=C=>C.literal("%s [not null] %s %s: %s");
/* " held by mon %p (%s)" will be appended, filled by M,mon_nam(M) */
export const mfmt1=C=>C.literal("%s obj %s %s (%s)");
export const mfmt2=C=>C.literal("%s obj %s %s (%s) *not*");
/* Check all object lists for consistency. */
export function obj_sanity_check()
{
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let obj; let otop; let prevo;
    objlist_sanity(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objlist").value,1,C.literal("floor sanity"));
    /* check that the map's record of floor objects is consistent;
       those objects should have already been sanity checked via
       the floor list so container contents are skipped here */
    for((x=C.i16(0));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        let at_fmt=C.stackAlloc((1*256));
        (otop=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value);
        (prevo=0);
        for((obj=otop);obj;((prevo=obj),(obj=C.field(C.field(prevo,"obj","v").address,"vptrs","v_nexthere").value))) {
            /* <ox,oy> should match <x,y>; <0,*> should always be empty */
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)!=1)||Number(C.i32(x)==0)))||Number(C.i32(C.field(obj,"obj","ox").value)!=C.i32(x))))||Number(C.i32(C.field(obj,"obj","oy").value)!=C.i32(y))))) {
                C.variadic(40,at_fmt,C.literal("%%s obj@<%d,%d> %%s %%s: %%s@<%d,%d>"),C.i32(x),C.i32(y),C.i32(C.field(obj,"obj","ox").value),C.i32(C.field(obj,"obj","oy").value));
                insane_object(obj,at_fmt,C.literal("location sanity"),0);
                /* when one or more boulders are present, they should always
                   be at the top of their pile; also never in water or lava */
            } else if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)) {
                if(Number(!!(prevo&&Number(C.i32(C.field(prevo,"obj","otyp").value)!=C.BOULDER)))) {
                    C.variadic(41,at_fmt,C.literal("%%s boulder@<%d,%d> %%s %%s: not on top"),C.i32(x),C.i32(y));
                    insane_object(obj,at_fmt,C.literal("boulder sanity"),0);
                }
                if(C.is_pool_or_lava(x,y)) {
                    C.variadic(42,at_fmt,C.literal("%%s boulder@<%d,%d> %%s %%s: on/in %s"),C.i32(x),C.i32(y),(C.i32(C.is_pool(x,y))?C.literal("water"):C.literal("lava")));
                    insane_object(obj,at_fmt,C.literal("boulder sanity"),0);
                }
            }
        }
    }

    objlist_sanity(C.field(C.gi,"instance_globals_i","invent").value,3,C.literal("invent sanity"));
    objlist_sanity(C.field(C.gm,"instance_globals_m","migrating_objs").value,5,C.literal("migrating sanity"));
    objlist_sanity(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","buriedobjlist").value,6,C.literal("buried sanity"));
    objlist_sanity(C.field(C.gb,"instance_globals_b","billobjs").value,7,C.literal("bill sanity"));
    objlist_sanity(C.field(C.go,"instance_globals_o","objs_deleted").value,9,C.literal("deleted object sanity"));
    mon_obj_sanity(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monlist").value,C.literal("minvent sanity"));
    mon_obj_sanity(C.field(C.gm,"instance_globals_m","migrating_mons").value,C.literal("migrating minvent sanity"));
    /* monsters temporarily in transit;
       they should have arrived with hero by the time we get called */
    if(C.field(C.gm,"instance_globals_m","mydogs").value) {
        C.variadic(43,C.literal("gm.mydogs sanity [not empty]"));
        mon_obj_sanity(C.field(C.gm,"instance_globals_m","mydogs").value,C.literal("mydogs minvent sanity"));
    }
    /* objects temporarily freed from invent/floor lists;
       they should have arrived somewhere by the time we get called */
    if(C.field(C.gt,"instance_globals_t","thrownobj").value) insane_object(C.field(C.gt,"instance_globals_t","thrownobj").value,C.ofmt3,C.literal("thrownobj sanity"),0);
    if(C.field(C.gk,"instance_globals_k","kickedobj").value) insane_object(C.field(C.gk,"instance_globals_k","kickedobj").value,C.ofmt3,C.literal("kickedobj sanity"),0);
    /* returning_missile temporarily remembers thrownobj and should be
       Null in between moves */
    if(C.field(C.iflags,"instance_flags","returning_missile").value) insane_object(C.field(C.gk,"instance_globals_k","kickedobj").value,C.ofmt3,C.literal("returning_missile sanity"),0);
    /* gc.current_wand isn't removed from invent while in use, but should
       be Null between moves when we're called */
    if(C.field(C.gc,"instance_globals_c","current_wand").value) insane_object(C.field(C.gc,"instance_globals_c","current_wand").value,C.ofmt3,C.literal("current_wand sanity"),0);
    } finally {C.stackRestore(stackFrame); }
}

/* sanity check for objects on specified list (fobj, &c) */
export function objlist_sanity(objlist,wheretype,mesg)
{
    wheretype=C.i32(wheretype);
    const stackFrame=C.stackSave();
    try {
    let obj;
    for((obj=objlist);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(C.i32(C.field(obj,"obj","where").value)!=wheretype)) insane_object(obj,C.ofmt0,mesg,0);
        if(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==3)&&Number(C.i32(C.field(obj,"obj","how_lost").value)!=0)))) {
            let lostbuf=C.stackAlloc((1*40));
            /* %d: bitfield is unsigned but narrow, so promotes to int */
            C.variadic(44,lostbuf,C.literal("how_lost=%d obj in inventory!"),C.i32(C.field(obj,"obj","how_lost").value));
            insane_object(obj,C.ofmt0,lostbuf,0);
        }
        if((Number(C.field((obj),"obj","cobj").value!=0))) {
            if(Number(wheretype==7)) insane_object(obj,C.literal("%s obj contains something! %s %s: %s"),mesg,0);
            /* containers on shop bill should always be empty */
            check_contained(obj,mesg);
        }
        if(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)||C.i32(C.field(obj,"obj","no_charge").value)))) {
            shop_obj_sanity(obj,mesg);
        }
        if(C.field(obj,"obj","owornmask").value) {
            let maskbuf=C.stackAlloc((1*40));
            let bc_ok=(C.i8(0));
            switch(C.i32(C.field(obj,"obj","where").value)) {
                case (3):
                    case (4):
                        sanity_check_worn(obj);
                break;
                case (5):
                    /* migrating objects overload the owornmask field
                   with a destination code; skip attempt to check it */
                    break;
                case (1):
                    /* note: ball and chain can also be OBJ_FREE, but not across
                   turns so this sanity check shouldn't encounter that */
                    (bc_ok=(C.i8(1)));
                ;
                /*FALLTHRU*/
                default:
                    if(Number(!!((Number(!!(Number(obj!=C.global("uchain").value)&&Number(obj!=C.global("uball").value))))||Number(!(bc_ok))))) {
                        /* discovered an object not in inventory which
                       erroneously has worn mask set */
                        C.variadic(45,maskbuf,C.literal("worn mask 0x%08lx"),C.field(obj,"obj","owornmask").value);
                        insane_object(obj,C.ofmt0,maskbuf,0);
                    }
                break;
            }
        }
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)&&C.field(obj,"obj","corpsenm").value))) {
            let buf=C.stackAlloc((1*256));
            let mtmp=C.find_mid(C.u32(C.field(obj,"obj","corpsenm").value),C.u32(1));
            if(Number(C.i32(C.field(obj,"obj","where").value)==3)) {
                if(Number(!(mtmp))) {
                    /* found leash with phantom mon */
                    C.variadic(46,buf,C.literal("leashmon=%u no monst,"),C.u32(C.field(obj,"obj","corpsenm").value));
                    insane_object(obj,C.ofmt0,buf,0);
                } else if(Number(!(C.field(mtmp,"monst","mleashed").value))) {
                    /* found leashed mon
                                               * not flagged as leashed */
                    C.variadic(47,buf,C.literal("leashmon=%u %s not leashed,"),C.u32(C.field(obj,"obj","corpsenm").value),C.mon_pmname(mtmp));
                    insane_object(obj,C.ofmt0,buf,0);
                }
                /* have to explicitly exclude migrating_objs because the
               obj->migr_species field overlays obj->corpsenm just like
               obj->leashmon does, so obj->leashmon and consequently 'mtmp'
               might be inaccurate for any leash found on migrating_objs */
            } else if(Number(C.i32(C.field(obj,"obj","where").value)!=5)) {
                let mtmp2=((Number(C.i32(C.field(obj,"obj","where").value)==4))?C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value:0);
                if(mtmp) {
                    /* found monst leashed by non-invent leash */
                    C.variadic(48,buf,C.literal("leashmon:%u %s leashed by %s leash,"),C.u32(C.field(obj,"obj","corpsenm").value),C.mon_pmname(mtmp),where_name(obj));
                    insane_object(obj,C.ofmt0,buf,mtmp2);
                } else {
                    /* found non-invent leash with m_id of phantom mon */
                    C.variadic(49,buf,C.literal("leashmon:%u no monst for %s leash,"),C.u32(C.field(obj,"obj","corpsenm").value),where_name(obj));
                    insane_object(obj,C.ofmt0,buf,mtmp2);
                }
            }
        }
        if(C.field(obj,"obj","globby").value) check_glob(obj,mesg);
        /* temporary flags that might have been set but which should
           be clear by the time this sanity check is taking place */
        if(Number(!!(Number(!!(Number(!!(C.i32(C.field(obj,"obj","in_use").value)||C.i32(C.field(obj,"obj","bypass").value)))||C.i32(C.field(obj,"obj","nomerge").value)))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&C.field(obj,"obj","corpsenm").value)))))) insane_obj_bits(obj,0);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* check obj->unpaid and obj->no_charge for shop sanity; caller has
   verified that at least one of them is set */
export function shop_obj_sanity(obj,mesg)
{
    const stackFrame=C.stackSave();
    try {
    let otop;
    let shkp;
    let why;
    let costly; let costlytoo;
    let xAddress=C.stackAlloc(2); C.cell(xAddress,"short").value=C.i16(0); let yAddress=C.stackAlloc(2); C.cell(yAddress,"short").value=C.i16(0);
    /* if contained, get top-most container; we needs its location */
    (otop=obj);
    while(Number(C.i32(C.field(otop,"obj","where").value)==2)) (otop=C.field(C.field(otop,"obj","v").address,"vptrs","v_ocontainer").value);

    /* get obj's or its container's location; do not update obj->ox,oy
       or otop->ox,oy because that would cause sanity checking to
       produce side-effects that won't occur when not sanity checking;
       no need for CONTAINED_TOO because we have a top level container */
    C.get_obj_location(otop,xAddress,yAddress,2);
    /* these will always be needed for the normal case, so don't bother
       waiting until we find an insanity to fetch them */
    (shkp=C.find_objowner(obj,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value));
    if(Number(!!(shkp&&Number(C.i32(C.field(obj,"obj","where").value)==7)))) ((C.cell(xAddress,"short").value=C.field(shkp,"monst","mx").value),(C.cell(yAddress,"short").value=C.field(shkp,"monst","my").value));
    (costly=C.costly_spot(C.cell(xAddress,"short").value,C.cell(yAddress,"short").value));
    (costlytoo=C.costly_adjacent(shkp,C.cell(xAddress,"short").value,C.cell(yAddress,"short").value));
    (why=0);
    if(Number(!!(C.i32(C.field(obj,"obj","no_charge").value)&&C.i32(C.field(obj,"obj","unpaid").value)))) {
        (why=C.literal("%s obj both unpaid and no_charge! %s %s: %s"));
    } else if(C.field(obj,"obj","unpaid").value) {
        /* unpaid is only applicable for directly carried objects, for
           objects inside carried containers, for used up items on the
           billobjs list, and for floor items outside the shop proper
           but within the shop boundary (walls, door, "free spot") and
           for objects moved from such spots into the shop proper by
           repair of shop walls or items buried while on boundary */
        if(Number(!!(Number(!!(Number(C.i32(C.field(otop,"obj","where").value)!=3)&&Number(C.i32(C.field(obj,"obj","where").value)!=7)))&&(Number(!!((Number(!!(Number(C.i32(C.field(otop,"obj","where").value)!=1)&&Number(C.i32(C.field(obj,"obj","where").value)!=6))))||Number(!((Number(!!(C.i32(costly)||C.i32(costlytoo)))))))))))) (why=C.literal("%s unpaid obj not carried! %s %s: %s"));
 else if(Number(!!(Number(!(costly))&&Number(!(costlytoo))))) (why=C.literal("%s unpaid obj not inside tended shop! %s %s: %s"));
 else if(Number(!(shkp))) (why=C.literal("%s unpaid obj inside untended shop! %s %s: %s"));
 else if(Number(!(C.onshopbill(obj,shkp,(C.i8(1)))))) (why=C.literal("%s unpaid obj not on shop bill! %s %s: %s"));
        /* when on bill, obj==otop */
    } else if(C.field(obj,"obj","no_charge").value) {
        /* no_charge is only applicable for floor objects in shops, for
           objects inside floor containers in shops, and for objects buried
           beneath the shop floor or carried by a monster (usually pet) */
        if(Number(!!(Number(!!(Number(C.i32(C.field(otop,"obj","where").value)!=1)&&Number(C.i32(C.field(otop,"obj","where").value)!=6)))&&Number(C.i32(C.field(otop,"obj","where").value)!=4)))) (why=C.literal("%s no_charge obj not on floor! %s %s: %s"));
 else if(Number(!!(Number(!(costly))&&Number(!(costlytoo))))) (why=C.literal("%s no_charge obj not inside tended shop! %s %s: %s"));
 else if(Number(!(shkp))) (why=C.literal("%s no_charge obj inside untended shop! %s %s: %s"));
 else if(C.onshopbill(obj,shkp,(C.i8(1)))) (why=C.literal("%s no_charge obj on shop bill! %s %s: %s"));
    }
    if(why) insane_object(obj,why,mesg,((Number(C.i32(C.field((otop),"obj","where").value)==4))?C.field(C.field(otop,"obj","v").address,"vptrs","v_ocarry").value:0));
    return;
    } finally {C.stackRestore(stackFrame); }
}

/* sanity check for objects carried by all monsters in specified list */
export function mon_obj_sanity(monlist,mesg)
{
    let mon;
    let obj; let mwep;
    for((mon=monlist);mon;(mon=C.field(mon,"monst","nmon").value)) {
        if((Number(C.field((mon),"monst","mhp").value<1))) continue;
        (mwep=(C.field((mon),"monst","mw").value));
        /* mon->mw */
        if(mwep) {
            if(Number(!((Number(C.i32(C.field((mwep),"obj","where").value)==4))))) insane_object(mwep,C.mfmt1,mesg,mon);
            if(Number(C.field(C.field(mwep,"obj","v").address,"vptrs","v_ocarry").value!=mon)) insane_object(mwep,C.mfmt2,mesg,mon);
        }
        for((obj=C.field(mon,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
            if(Number(C.i32(C.field(obj,"obj","where").value)!=4)) insane_object(obj,C.mfmt1,mesg,mon);
            if(Number(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value!=mon)) insane_object(obj,C.mfmt2,mesg,mon);
            if(C.field(obj,"obj","globby").value) check_glob(obj,mesg);
            check_contained(obj,mesg);
            if(Number(!!(C.i32(C.field(obj,"obj","unpaid").value)||C.i32(C.field(obj,"obj","no_charge").value)))) shop_obj_sanity(obj,mesg);
            if(Number(!!(Number(!!(Number(!!(C.i32(C.field(obj,"obj","in_use").value)||C.i32(C.field(obj,"obj","bypass").value)))||C.i32(C.field(obj,"obj","nomerge").value)))||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&C.field(obj,"obj","corpsenm").value)))))) insane_obj_bits(obj,mon);
            if(Number(obj==mwep)) (mwep=0);
        }
        if(mwep) {
            /* this is a monster check rather than an object check, but doing
               it here avoids making an extra pass through mon's minvent;
               if the full pass through that list hasn't reset mwep to Null,
               then mwep isn't in that list where it should be */
            C.variadic(50,C.literal("monst (%s: %u) wielding %s (%u) not in %s inventory"),C.pmname(C.field(mon,"monst","data").value,C.Mgender(mon)),C.field(mon,"monst","m_id").value,C.safe_typename(C.i32(C.field(mwep,"obj","otyp").value)),C.field(mwep,"obj","o_id").value,(C.field((C.genders+Number(C.pronoun_gender(mon,C.u32(2)))*C.sizes["struct Gender"]),"Gender","his").value));
        }
    }
}

export function insane_obj_bits(obj,mon)
{
    const stackFrame=C.stackSave();
    try {
    let o_in_use; let o_bypass; let o_nomerge; let o_boulder;
    if(Number(C.i32(C.field(obj,"obj","where").value)==9)) return;
    /* skip bit checking for deleted objects */
    (o_in_use=C.field(obj,"obj","in_use").value);
    (o_bypass=C.field(obj,"obj","bypass").value);
    /* having obj->nomerge be set might be intentional */
    (o_nomerge=C.u32((Number(!!(C.i32(C.field(obj,"obj","nomerge").value)&&Number(!(nomerge_exception(obj))))))));
    /* next_boulder is only for object name formatting when pushing
       boulders and should be reset by time of next sanity check */
    (o_boulder=C.u32((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)&&C.field(obj,"obj","corpsenm").value)))));
    if(Number(!!(Number(!!(Number(!!(o_in_use||o_bypass))||o_nomerge))||o_boulder))) {
        let infobuf=C.stackAlloc((1*128));
        C.variadic(51,infobuf,C.literal("flagged%s%s%s%s"),(o_in_use?C.literal(" in_use"):C.literal("")),(o_bypass?C.literal(" bypass"):C.literal("")),(o_nomerge?C.literal(" nomerge"):C.literal("")),(o_boulder?C.literal(" nxtbldr"):C.literal("")));
        insane_object(obj,C.ofmt0,infobuf,mon);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* does 'obj' use the 'nomerge' flag persistently? */
export function nomerge_exception(obj)
{
    /* special prize objects for achievement tracking are set 'nomerge'
       until they get picked up by the hero */
    if(Number(!!((Number(C.field((obj),"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","mines_prize_oid").value))||(Number(C.field((obj),"obj","o_id").value==C.field(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","achieveo").address,"achievement_tracking","soko_prize_oid").value))))) return (C.i8(1));
    return (C.i8(0));
}

/* This must stay consistent with the defines in obj.h. */
export const obj_state_names=C=>[C.literal("free"),C.literal("floor"),C.literal("contained"),C.literal("invent"),C.literal("minvent"),C.literal("migrating"),C.literal("buried"),C.literal("onbill"),C.literal("luafree"),C.literal("deleted")];
export function where_name(obj)
{
    const unknown=C.staticData("where_name","unknown",()=>null);
    /* big enough to handle rogue 64-bit int */
    let where;
    if(Number(!(obj))) return C.literal("nowhere");
    (where=C.i32(C.field(obj,"obj","where").value));
    if(Number(!!(Number(!!(Number(where<0)||Number(where>=10)))||Number(!(C.cell((C.obj_state_names+Number(where)*8),"char *").value))))) {
        C.variadic(52,unknown,C.literal("unknown[%d]"),where);
        return unknown;
    }
    return C.cell((C.obj_state_names+Number(where)*8),"char *").value;
}

export function insane_object(obj,fmt,mesg,mon)
{
    const stackFrame=C.stackSave();
    try {
    let objnm; let monnm;
    let altfmt=C.stackAlloc((1*256));
    (objnm=(monnm=C.literal("null!")));
    if(obj) {
        ((C.field(C.iflags,"instance_flags","override_ID").value=C.i32((C.field(C.iflags,"instance_flags","override_ID").value+1)))-1);
        (objnm=C.doname(obj));
        ((C.field(C.iflags,"instance_flags","override_ID").value=C.i32((C.field(C.iflags,"instance_flags","override_ID").value-1)))+1);
    }
    if(Number(!!(mon||(Number(!!(C.strstri(mesg,C.literal("minvent"))&&Number(!(C.strstri(mesg,C.literal("contained")))))))))) {
        C.strcat(C.strcpy(altfmt,fmt),C.literal(" held by mon %s (%s)"));
        if(mon) (monnm=C.x_monnam(mon,2,0,31,(C.i8(1))));
        C.variadic(53,altfmt,mesg,C.fmt_ptr(obj),where_name(obj),objnm,C.fmt_ptr(mon),monnm);
    } else {
        C.variadic(54,fmt,mesg,C.fmt_ptr(obj),where_name(obj),objnm);
    }
    } finally {C.stackRestore(stackFrame); }
}

/* initialize a dummy obj with just enough info to allow some of the tests in
   obj.h that take an obj pointer to work; used when applying a stethoscope
   toward a mimic mimicking an object */
export function init_dummyobj(obj,otyp,oquan)
{
    otyp=C.i16(otyp);
    oquan=C.i64(oquan);
    if(obj) {
        C.copyRecord(obj,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
        (C.field(obj,"obj","otyp").value=otyp);
        (C.field(obj,"obj","oclass").value=C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_class").value);
        /* obj->dknown = 0; */
        /* suppress known except for amulets (needed for fakes & real AoY) */
        (C.field(obj,"obj","known").value=C.u32(((Number(C.i32(C.field(obj,"obj","oclass").value)==C.AMULET_CLASS))?C.i32(C.field(obj,"obj","known").value):Number(!(C.field((C.objects+Number(otyp)*C.sizes["struct objclass"]),"objclass","oc_uses_known").value)))));
        /* default is "on" for types which don't use it */
        (C.field(obj,"obj","quan").value=(oquan?oquan:1n));
        (C.field(obj,"obj","corpsenm").value=C.NON_PM);
        /* suppress statue and figurine details */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.LEASH)) (C.field(obj,"obj","corpsenm").value=0);
        /* overloads corpsenm, avoid NON_PM */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BOULDER)) (C.field(obj,"obj","corpsenm").value=0);
        /* overloads corpsenm, avoid NON_PM */
        /* but suppressing fruit details leads to "bad fruit #0" */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SLIME_MOLD)) (C.field(obj,"obj","spe").value=C.i8(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","current_fruit").value));
    }
    return obj;
}

/* obj sanity check: check objects inside container */
export function check_contained(container,mesg)
{
    const stackFrame=C.stackSave();
    try {
    let obj;
    /* big enough to work with, not too big to blow out stack in recursion */
    let mesgbuf=C.stackAlloc((1*40)); let nestedmesg=C.stackAlloc((1*120));
    if(Number(!((Number(C.field((container),"obj","cobj").value!=0))))) return;
    /* change "invent sanity" to "contained invent sanity"
       but leave "nested contained invent sanity" as is */
    if(Number(!(C.strstri(mesg,C.literal("contained"))))) (mesg=C.strcat(C.strcpy(mesgbuf,C.literal("contained ")),mesg));
    for((obj=C.field(container,"obj","cobj").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        /* catch direct cycle to avoid unbounded recursion */
        if(Number(obj==container)) C.variadic(55,C.literal("failed sanity check: container holds itself"));
        if(Number(C.i32(C.field(obj,"obj","where").value)!=2)) insane_object(obj,C.literal("%s obj %s %s: %s"),mesg,0);
 else if(Number(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value!=container)) C.variadic(56,C.literal("%s obj %s in container %s, not %s"),mesg,C.fmt_ptr(obj),C.fmt_ptr(C.field(C.field(obj,"obj","v").address,"vptrs","v_ocontainer").value),C.fmt_ptr(container));
        if(C.field(obj,"obj","globby").value) check_glob(obj,mesg);
        if((Number(C.field((obj),"obj","cobj").value!=0))) {
            /* catch most likely indirect cycle; we won't notice if
               parent is present when something comes before it, or
               notice more deeply embedded cycles (grandparent, &c) */
            if(Number(C.field(obj,"obj","cobj").value==container)) C.variadic(57,C.literal("failed sanity check: container holds its parent"));
            /* change "contained... sanity" to "nested contained... sanity"
               and "nested contained..." to "nested nested contained..." */
            C.strcpy(nestedmesg,C.literal("nested "));
            C.copynchars(C.eos(nestedmesg),mesg,C.i32((C.i32((C.i32(BigInt((1*120)))-C.i32(C.strlen(nestedmesg))))-1)));
            /* recursively check contents */
            check_contained(obj,nestedmesg);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

/* called when 'obj->globby' is set so we don't recheck it here */
export function check_glob(obj,mesg)
{
    const stackFrame=C.stackSave();
    try {
    if(Number(!!(Number(!!(Number(!!(Number(C.field(obj,"obj","quan").value!=1n)||Number(C.field(obj,"obj","owt").value==C.u32(0))))||Number(C.i32(C.field(obj,"obj","otyp").value)<C.GLOB_OF_GRAY_OOZE)))||Number(C.i32(C.field(obj,"obj","otyp").value)>C.GLOB_OF_BLACK_PUDDING)))) {
        /*
         * This was relevant before the shrink_glob timer was adopted but
         * now any glob could have a weight that isn't a multiple of 20.
         */
        /* a partially eaten glob could have any non-zero weight but an
           intact one should weigh an exact multiple of base weight (20) */
        let mesgbuf=C.stackAlloc((1*256)); let globbuf=C.stackAlloc((1*128));
        C.variadic(58,globbuf,C.literal(" glob %d,quan=%ld,owt=%u "),C.i32(C.field(obj,"obj","otyp").value),C.field(obj,"obj","quan").value,C.field(obj,"obj","owt").value);
        (mesg=C.strsubst(C.strcpy(mesgbuf,mesg),C.literal(" obj "),globbuf));
        insane_object(obj,C.ofmt0,mesg,((Number(C.i32(C.field(obj,"obj","where").value)==4))?C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value:0));
    }
    } finally {C.stackRestore(stackFrame); }
}

/* check an object in hero's or monster's inventory which has worn mask set */
export function sanity_check_worn(obj)
{
    const stackFrame=C.stackSave();
    try {
    const wearbits=C.staticData("sanity_check_worn","wearbits",()=>[C.u64(1n),C.u64(2n),C.u64(4n),C.u64(8n),C.u64(16n),C.u64(32n),C.u64(64n),C.u64(256n),C.u64(512n),C.u64(1024n),C.u64(65536n),C.u64(131072n),C.u64(262144n),C.u64(524288n),C.u64(1048576n),C.u64(2097152n),C.u64(4194304n),C.u64(0)]);
    /* [W_ART,W_ARTI are property bits for items which aren't worn] */
    let maskbuf=C.stackAlloc((1*60));
    let what;
    let owornmask; let allmask=C.u64(0n);
    let embedded=(C.i8(0));
    let i; let n=0;
    /* use owornmask for testing and bit twiddling, but use original
       obj->owornmask for printing */
    (owornmask=C.u64(C.field(obj,"obj","owornmask").value));
    /* figure out how many bits are set, and also which are viable */
    for((i=0);C.cell((wearbits+Number(i)*8),"unsigned long").value;(i=C.i32((i+1)))) {
        if(Number((C.u64((owornmask&C.cell((wearbits+Number(i)*8),"unsigned long").value)))!=C.u64(0n))) (n=C.i32((n+1)));
        (allmask=C.u64(allmask|C.cell((wearbits+Number(i)*8),"unsigned long").value));
    }
    if(Number(obj==C.global("uskin").value)) {
        /* embedded dragon scales have an extra bit set;
           make sure it's set, then suppress it */
        (embedded=(C.i8(1)));
        if(Number((C.u64((owornmask&C.u64((C.i64((1n|536870912n)))))))==C.u64((C.i64((1n|536870912n)))))) (owornmask=C.u64(owornmask&C.u64(C.i64((~536870912n)))));
 else ((n=0),(owornmask=C.u64(C.i32((~0)))));
        /* force insane_object("bogus") below */
    }
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(n==2)&&(Number(C.i32(C.field((obj),"obj","where").value)==3))))&&Number(obj==C.global("uball").value)))&&Number((C.u64((owornmask&C.u64(2097152n))))!=C.u64(0n))))&&Number((C.u64((owornmask&C.u64((C.i64((C.i64((256n|1024n))|512n)))))))!=C.u64(0n))))) {
        /* chained ball can be wielded/alt-wielded/quivered; if so,
          pretend it's not chained in order to check the weapon pointer
          (we've already verified the ball pointer by successfully passing
          the if-condition to get here...) */
        (owornmask=C.u64(owornmask&C.u64(C.i64((~2097152n)))));
        (n=1);
    }
    if(Number(n>1)) {
        /* multiple bits set */
        C.variadic(59,maskbuf,C.literal("worn mask (multiple) 0x%08lx"),C.field(obj,"obj","owornmask").value);
        insane_object(obj,C.ofmt0,maskbuf,0);
    }
    if(Number(!!(Number((C.u64((owornmask&C.u64((~allmask)))))!=C.u64(0n))||(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))&&Number((C.u64((owornmask&C.u64(1048576n))))!=C.u64(0n)))))))) {
        /* non-wearable bit(s) set */
        C.variadic(60,maskbuf,C.literal("worn mask (bogus)) 0x%08lx"),C.field(obj,"obj","owornmask").value);
        insane_object(obj,C.ofmt0,maskbuf,0);
    }
    if(Number(!!(Number(n==1)&&(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))||Number((C.u64((owornmask&C.u64((C.i64((2097152n|4194304n)))))))!=C.u64(0n)))))))) {
        (what=0);
        /* verify that obj in hero's invent (or ball/chain elsewhere)
           with owornmask of W_foo is the object pointed to by ufoo */
        switch(owornmask) {
            case C.u64((1n)):
                if(Number(obj!=((C.i32(embedded)?C.global("uskin").value:C.global("uarm").value)))) (what=(C.i32(embedded)?C.literal("skin"):C.literal("suit")));
            break;
            case C.u64((2n)):
                if(Number(obj!=C.global("uarmc").value)) (what=C.literal("cloak"));
            break;
            case C.u64((4n)):
                if(Number(obj!=C.global("uarmh").value)) (what=C.literal("helm"));
            break;
            case C.u64((8n)):
                if(Number(obj!=C.global("uarms").value)) (what=C.literal("shield"));
            break;
            case C.u64((16n)):
                if(Number(obj!=C.global("uarmg").value)) (what=C.literal("gloves"));
            break;
            case C.u64((32n)):
                if(Number(obj!=C.global("uarmf").value)) (what=C.literal("boots"));
            break;
            case C.u64((64n)):
                if(Number(obj!=C.global("uarmu").value)) (what=C.literal("shirt"));
            break;
            case C.u64((256n)):
                if(Number(obj!=C.global("uwep").value)) (what=C.literal("primary weapon"));
            break;
            case C.u64((512n)):
                if(Number(obj!=C.global("uquiver").value)) (what=C.literal("quiver"));
            break;
            case C.u64((1024n)):
                if(Number(obj!=C.global("uswapwep").value)) (what=(C.i32(C.field(C.u,"you","twoweap").value)?C.literal("secondary weapon"):C.literal("alternate weapon")));
            break;
            case C.u64((65536n)):
                if(Number(obj!=C.global("uamul").value)) (what=C.literal("amulet"));
            break;
            case C.u64((131072n)):
                if(Number(obj!=C.global("uleft").value)) (what=C.literal("left ring"));
            break;
            case C.u64((262144n)):
                if(Number(obj!=C.global("uright").value)) (what=C.literal("right ring"));
            break;
            case C.u64((524288n)):
                if(Number(obj!=C.global("ublindf").value)) (what=C.literal("blindfold"));
            break;
            /* case W_SADDLE: */
            case C.u64((2097152n)):
                if(Number(obj!=C.global("uball").value)) (what=C.literal("ball"));
            break;
            case C.u64((4194304n)):
                if(Number(obj!=C.global("uchain").value)) (what=C.literal("chain"));
            break;
            default:
                break;
        }
        if(what) {
            C.variadic(61,maskbuf,C.literal("worn mask 0x%08lx != %s"),C.field(obj,"obj","owornmask").value,what);
            insane_object(obj,C.ofmt0,maskbuf,0);
        }
    }
    if(Number(!!(Number(n==1)&&(Number(!!(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==3))||Number((C.u64((owornmask&C.u64((C.i64((2097152n|4194304n)))))))!=C.u64(0n))))||(Number(C.i32(C.field((obj),"obj","where").value)==4)))))))) {
        /* check for items worn in invalid slots; practically anything can
           be wielded/alt-wielded/quivered, so tests on those are limited */
        (what=0);
        if(C.u64((owornmask&C.u64((C.i64((C.i64((C.i64((C.i64((C.i64((C.i64((1n|2n))|4n))|8n))|16n))|32n))|64n))))))) {
            if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.ARMOR_CLASS)) (what=C.literal("armor"));
            /* 3.6: dragon scale mail reverts to dragon scales when
               becoming embedded in poly'd hero's skin */
            if(Number(!!(C.i32(embedded)&&Number(!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.GRAY_DRAGON_SCALES)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.YELLOW_DRAGON_SCALES))))))))) (what=C.literal("skin"));
        } else if(C.u64((owornmask&C.u64((C.i64((C.i64((256n|1024n))|512n))))))) {
            /* monsters don't maintain alternate weapon or quiver */
            if(Number(!!((Number(C.i32(C.field((obj),"obj","where").value)==4))&&Number((C.u64((owornmask&C.u64((C.i64((1024n|512n)))))))!=C.u64(0n))))) (what=(Number((C.u64((owornmask&C.u64(1024n))))!=C.u64(0n))?C.literal("monst alt weapon?"):C.literal("monst quiver?")));
 else if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.COIN_CLASS)&&Number((C.u64((owornmask&C.u64((C.i64((256n|1024n)))))))!=C.u64(0n))))) (what=(Number((C.u64((owornmask&C.u64(256n))))!=C.u64(0n))?C.literal("weapon"):C.literal("alt weapon")));
            /* hero can quiver gold but not wield it (hence not alt-wield
               it either); also catches monster wielding gold */
        } else if(C.u64((owornmask&C.u64(65536n)))) {
            if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.AMULET_CLASS)) (what=C.literal("amulet"));
        } else if(C.u64((owornmask&C.u64((C.i64((131072n|262144n))))))) {
            if(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.RING_CLASS)&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.MEAT_RING)))) (what=C.literal("ring"));
        } else if(C.u64((owornmask&C.u64(524288n)))) {
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.BLINDFOLD)&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.TOWEL)))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.LENSES)))) (what=C.literal("blindfold"));
        } else if(C.u64((owornmask&C.u64(2097152n)))) {
            if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.BALL_CLASS)) (what=C.literal("chained ball"));
        } else if(C.u64((owornmask&C.u64(4194304n)))) {
            if(Number(C.i32(C.field(obj,"obj","oclass").value)!=C.CHAIN_CLASS)) (what=C.literal("chain"));
        } else if(C.u64((owornmask&C.u64(1048576n)))) {
            if(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.SADDLE)) (what=C.literal("saddle"));
        }
        if(what) {
            let oclassname=C.stackAlloc((1*30));
            let mon=((Number(C.i32(C.field((obj),"obj","where").value)==4))?C.field(C.field(obj,"obj","v").address,"vptrs","v_ocarry").value:0);
            /* if we've found a potion worn in the amulet slot,
               this yields "worn (potion amulet)" */
            C.strcpy(oclassname,C.field((C.def_oc_syms+Number(C.u8(C.field(obj,"obj","oclass").value))*C.sizes["struct class_sym"]),"class_sym","name").value);
            C.variadic(62,maskbuf,C.literal("worn (%s %s)"),C.makesingular(oclassname),what);
            insane_object(obj,C.ofmt0,maskbuf,mon);
        }
    }
    /* not (NH_DEVEL_STATUS != NH_STATUS_RELEASED) || DEBUG) */
    /* dummy use of obj to avoid "arg not used" complaint */
    } finally {C.stackRestore(stackFrame); }
}

/*
 * wrapper to make "near this object" convenient
 */
export function obj_nexto(otmp)
{
    if(Number(!(otmp))) {
        C.variadic(63,C.literal("obj_nexto: wasn't given an object to check"));
        return 0;
    }
    return obj_nexto_xy(otmp,C.field(otmp,"obj","ox").value,C.field(otmp,"obj","oy").value,(C.i8(1)));
}

/*
 * looks for objects of a particular type next to x, y
 * skips over oid if found (lets us avoid ourselves if
 * we're looking for a second type of an existing object)
 *
 * TODO: return a list of all objects near us so we can more
 * reliably predict which one we want to 'find' first
 */
export function obj_nexto_xy(obj,x,y,recurs)
{
    x=C.i16(x);
    y=C.i16(y);
    recurs=C.i8(recurs);
    let otmp;
    let fx; let fy; let ex; let ey; let otyp=C.i32(C.field(obj,"obj","otyp").value);
    let dx; let dy;
    /* check under our "feet" first */
    (otmp=C.sobj_at(otyp,x,y));
    while(otmp) {
        /* don't be clever and find ourselves */
        if(Number(!!(Number(otmp!=obj)&&C.i32(C.mergable(otmp,obj))))) return otmp;
        (otmp=C.nxtobj(otmp,otyp,(C.i8(1))));
    }
    if(Number(!(recurs))) return 0;
    /* search in a random order */
    (dx=C.i16(((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),3680,(C.literal("obj_nexto_xy"))),C.rn2(2))):C.rn2(2)))?C.i32((-1)):1))));
    (dy=C.i16(((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),3681,(C.literal("obj_nexto_xy"))),C.rn2(2))):C.rn2(2)))?C.i32((-1)):1))));
    (ex=C.i32((C.i32(x)-C.i32(dx))));
    (ey=C.i32((C.i32(y)-C.i32(dy))));
    for((fx=ex);Number(C.abs(C.i32((fx-ex)))<3);(fx=C.i32(fx+C.i32(dx)))) {
        for((fy=ey);Number(C.abs(C.i32((fy-ey)))<3);(fy=C.i32(fy+C.i32(dy)))) {
            /* 0, 0 was checked above */
            if(Number(!!(C.isok(C.i16(fx),C.i16(fy))&&(Number(!!(Number(fx!=C.i32(x))||Number(fy!=C.i32(y)))))))) {
                if(Number(((otmp=obj_nexto_xy(obj,C.i16(fx),C.i16(fy),(C.i8(0)))))!=0)) return otmp;
            }
        }
    }
    return 0;
}

/*
 * Causes one object to absorb another, increasing weight
 * accordingly.  Frees obj2; obj1 remains and is returned.
 */
export function obj_absorb(obj1,obj2)
{
    let otmp1; let otmp2;
    let o1wt; let o2wt;
    let agetmp;
    /* don't let people dumb it up */
    if(Number(!!(obj1&&obj2))) {
        (otmp1=C.cell(obj1,"struct obj *").value);
        (otmp2=C.cell(obj2,"struct obj *").value);
        if(Number(!!(Number(!!(otmp1&&otmp2))&&Number(otmp1!=otmp2)))) {
            C.globby_bill_fixup(otmp1,otmp2);
            if(Number(C.i32(C.field(otmp1,"obj","bknown").value)!=C.i32(C.field(otmp2,"obj","bknown").value))) (C.field(otmp1,"obj","bknown").value=(C.field(otmp2,"obj","bknown").value=C.u32(0)));
            if(Number(C.i32(C.field(otmp1,"obj","rknown").value)!=C.i32(C.field(otmp2,"obj","rknown").value))) (C.field(otmp1,"obj","rknown").value=(C.field(otmp2,"obj","rknown").value=C.u32(0)));
            if(Number(C.i32(C.field(otmp1,"obj","greased").value)!=C.i32(C.field(otmp2,"obj","greased").value))) (C.field(otmp1,"obj","greased").value=(C.field(otmp2,"obj","greased").value=C.u32(0)));
            if(Number(!!(C.i32(C.field(otmp1,"obj","oeroded").value)||C.i32(C.field(otmp2,"obj","oeroded").value)))) (C.field(otmp1,"obj","oeroded").value=(C.field(otmp2,"obj","oeroded").value=C.u32(1)));
            (o1wt=C.i32((C.field(otmp1,"obj","oeaten").value?C.field(otmp1,"obj","oeaten").value:C.field(otmp1,"obj","owt").value)));
            (o2wt=C.i32((C.field(otmp2,"obj","oeaten").value?C.field(otmp2,"obj","oeaten").value:C.field(otmp2,"obj","owt").value)));
            /* averaging the relative ages is less likely to overflow
               than averaging the absolute ages directly */
            (agetmp=(C.i64(((C.i64((C.i64(((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(otmp1,"obj","age").value)))*C.i64(o1wt)))+C.i64(((C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-C.field(otmp2,"obj","age").value)))*C.i64(o2wt))))))/C.i64((C.i32((o1wt+o2wt))))))));
            /* convert relative age back to absolute age */
            (C.field(otmp1,"obj","age").value=C.i64((C.field(C.svm,"instance_globals_saved_m","moves").value-agetmp)));
            (C.field(otmp1,"obj","owt").value=C.u32(C.field(otmp1,"obj","owt").value+C.u32(o2wt)));
            if(Number(!!(C.field(otmp1,"obj","oeaten").value||C.field(otmp2,"obj","oeaten").value))) (C.field(otmp1,"obj","oeaten").value=C.u32(C.i32((o1wt+o2wt))));
            (C.field(otmp1,"obj","quan").value=1n);
            if(Number(!!(C.i32(C.field(otmp1,"obj","globby").value)&&C.i32(C.field(otmp2,"obj","globby").value)))) {
                /* average (not weighted, no pun intended) the two globs'
                   shrink timers and use that to give otmp1 a new timer */
                let tm1=C.stop_timer(C.i16(C.SHRINK_GLOB),C.obj_to_any(otmp1)); let tm2=C.stop_timer(C.i16(C.SHRINK_GLOB),C.obj_to_any(otmp2));
                (tm1=C.i64(((C.i64((C.i64((((tm1?tm1:25n))+((tm2?tm2:25n))))+1n)))/2n)));
                start_glob_timeout(otmp1,tm1);
            }
            /* get rid of second glob, return augmented first one */
            obj_extract_self(otmp2);
            dealloc_obj(otmp2);
            (C.cell(obj2,"struct obj *").value=0);
            return otmp1;
        }
    }
    C.variadic(64,C.literal("obj_absorb: not called with two actual objects"));
    return 0;
}

/*
 * Causes the heavier object to absorb the lighter object in
 * most cases, but if one object is OBJ_FREE and the other is
 * on the floor, the floor object goes first.  Note that when
 * a globby monster dies, its corpse (new glob) will be created
 * on the floor; when a glob is dropped, thrown, or kicked it
 * will be free at the time obj_meld() gets called.
 *
 * Wrapper for obj_absorb() so that floor_effects works more
 * cleanly (since we don't know which we want to stay around).
 */
export function obj_meld(obj1,obj2)
{
    let otmp1; let otmp2; let result=0;
    let ox; let oy;
    /* coordinates for the glob that goes away */
    if(Number(!!(obj1&&obj2))) {
        (otmp1=C.cell(obj1,"struct obj *").value);
        (otmp2=C.cell(obj2,"struct obj *").value);
        if(Number(!!(Number(!!(otmp1&&otmp2))&&Number(otmp1!=otmp2)))) {
            (ox=(oy=0));
            /*
             * FIXME?
             *  If one of the objects is free because it's being dropped,
             *  we should really finish a full drop and then absorb/meld
             *  if it survives the flooreffects().  Then lighter-melds-into-
             *  heavier will be true even when heavier is the one dropped.
             *
             *  [Also, what about when one of the globs is on the shore
             *  and we drop the other into adjacent pool or vice versa?]
             */
            if(Number(!!(Number(!((Number(!!(Number(C.i32(C.field(otmp2,"obj","where").value)==1)&&Number(C.i32(C.field(otmp1,"obj","where").value)==0))))))&&(Number(!!(Number(C.field(otmp1,"obj","owt").value>C.field(otmp2,"obj","owt").value)||(Number(!!(Number(C.field(otmp1,"obj","owt").value==C.field(otmp2,"obj","owt").value)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("mkobj.c"),3790,(C.literal("obj_meld"))),C.rn2(2))):C.rn2(2)))))))))))) {
                if(Number(C.i32(C.field(otmp2,"obj","where").value)==1)) ((ox=C.i32(C.field(otmp2,"obj","ox").value)),(oy=C.i32(C.field(otmp2,"obj","oy").value)));
                (result=obj_absorb(obj1,obj2));
            } else {
                if(Number(C.i32(C.field(otmp1,"obj","where").value)==1)) ((ox=C.i32(C.field(otmp1,"obj","ox").value)),(oy=C.i32(C.field(otmp1,"obj","oy").value)));
                (result=obj_absorb(obj2,obj1));
            }
            /* callers really ought to take care of this; glob melding is
               a bookkeeping issue rather than a display one */
            if(ox) {
                if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(oy)*8),"unsigned char *").value+Number(ox)*1),"unsigned char").value)&2)))!=0))) C.newsym(C.i16(ox),C.i16(oy));
                /* and this; a hides-under monster might be hiding under
                   the glob that went away; if there's nothing else there
                   to hide under, force it out of hiding */
                C.maybe_unhide_at(C.i16(ox),C.i16(oy));
            }
        }
    } else {
        C.variadic(65,C.literal("obj_meld: not called with two actual objects"));
    }
    return result;
}

/* give a message if hero notices two globs merging [used to be in pline.c] */
export function pudding_merge_message(otmp,otmp2)
{
    let visible=C.i8((Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(otmp,"obj","oy").value)*8),"unsigned char *").value+Number(C.field(otmp,"obj","ox").value)*1),"unsigned char").value)&2)))!=0))||(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(otmp2,"obj","oy").value)*8),"unsigned char *").value+Number(C.field(otmp2,"obj","ox").value)*1),"unsigned char").value)&2)))!=0)))))); let onfloor=C.i8((Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)==1)||Number(C.i32(C.field(otmp2,"obj","where").value)==1))))); let inpack=C.i8((Number(!!((Number(C.i32(C.field((otmp),"obj","where").value)==3))||(Number(C.i32(C.field((otmp2),"obj","where").value)==3))))));
    /* the player will know something happened inside his own inventory */
    if(Number(!!((Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&C.i32(visible))))||C.i32(inpack)))) {
        if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) {
            if(onfloor) {
                C.variadic(66,C.literal("parts of the floor melting!"));
            } else if(inpack) {
                C.variadic(67,C.literal("pack reaches out and grabs something!"));
            }
            /* even though we can see where they should be,
             * they'll be out of our view (minvent or container)
             * so don't actually show anything */
        } else if(Number(!!(C.i32(onfloor)||C.i32(inpack)))) {
            let adj=C.i8((Number(!!((Number(!!(Number(C.i32(C.field(otmp,"obj","ox").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(otmp,"obj","oy").value)!=C.i32(C.field(C.u,"you","uy").value)))))&&(Number(!!(Number(C.i32(C.field(otmp2,"obj","ox").value)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(C.field(otmp2,"obj","oy").value)!=C.i32(C.field(C.u,"you","uy").value)))))))));
            C.variadic(68,C.literal("The %s%s coalesce%s."),((Number(!!(C.i32(onfloor)&&C.i32(adj))))?C.literal("adjacent "):C.literal("")),C.makeplural(C.obj_typename(C.i32(C.field(otmp,"obj","otyp").value))),(C.i32(inpack)?C.literal(" inside your pack"):C.literal("")));
        }
    } else {
        ;
        C.variadic(69,C.literal("a faint sloshing sound."));
    }
}

/*mkobj.c*/
export const initializers={mkobjprobs,boxiprobs,rogueprobs,hellprobs,zerooextra,alteration_verbs,dknowns,treefruits,ofmt0,ofmt3,mfmt1,mfmt2,obj_state_names};
