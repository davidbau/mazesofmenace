import { C } from '../c-runtime/context.js';
/* NetHack 5.0	muse.c	$NHDT-Date: 1770949988 2026/02/12 18:33:08 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.241 $ */
/*      Copyright (C) 1990 by Ken Arromdee                         */
/* NetHack may be freely redistributed.  See license for details.  */
/*
 * Monster item usage routines.
 */
/* Let monsters use magic items.  Arbitrary assumptions: Monsters only use
 * scrolls when they can see, monsters know when wands have 0 charges,
 * monsters cannot recognize if items are cursed are not, monsters which
 * are confused don't know not to read scrolls, etc....
 */
/* Any preliminary checks which may result in the monster being unable to use
 * the item.  Returns 0 if nothing happened, 2 if the monster can't do
 * anything (i.e. it teleported) and 1 if it's dead.
 */
export function precheck(mon,obj)
{
    const stackFrame=C.stackSave();
    try {
    let vis;
    if(Number(!(obj))) return 0;
    (vis=C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mon,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mon,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))));
    if(Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS)) {
        let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
        const empty=C.literal("The potion turns out to be empty.");
        let mtmp;
        if(C.objdescr_is(obj,C.literal("milky"))) {
            if(Number(!!(Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_GHOST)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),74,(C.literal("precheck"))),C.rn2((C.i32((13+C.i32((2*C.i32((C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_GHOST)*C.sizes["struct mvitals"]),"mvitals","born").value)))))))))):C.rn2((C.i32((13+C.i32((2*C.i32((C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_GHOST)*C.sizes["struct mvitals"]),"mvitals","born").value))))))))))))))) {
                if(Number(!(C.enexto(cc,C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,(C.mons+Number(C.PM_GHOST)*C.sizes["struct permonst"]))))) return 0;
                mquaffmsg(mon,obj);
                C.m_useup(mon,obj);
                (mtmp=C.makemon((C.mons+Number(C.PM_GHOST)*C.sizes["struct permonst"]),C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,C.u32(131072n)));
                if(Number(!(mtmp))) {
                    if(vis) C.variadic(0,C.literal("%s"),empty);
                } else {
                    if(vis) {
                        C.variadic(1,C.literal("As %s opens the bottle, an enormous %s emerges!"),C.mon_nam(mon),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.rndmonnam(0):C.literal("ghost")));
                        C.variadic(2,C.literal("%s is frightened to death, and unable to move."),C.Monnam(mon));
                    }
                    C.paralyze_monst(mon,3);
                }
                return 2;
            }
        }
        if(Number(!!(Number(!!(C.i32(C.objdescr_is(obj,C.literal("smoky")))&&Number(!((C.i32((C.i32(C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_DJINNI)*C.sizes["struct mvitals"]),"mvitals","mvflags").value)&(C.i32((2|1))))))))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),101,(C.literal("precheck"))),C.rn2((C.i32((13+C.i32((2*C.i32((C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_DJINNI)*C.sizes["struct mvitals"]),"mvitals","born").value)))))))))):C.rn2((C.i32((13+C.i32((2*C.i32((C.field((C.field(C.svm,"instance_globals_saved_m","mvitals").address+Number(C.PM_DJINNI)*C.sizes["struct mvitals"]),"mvitals","born").value))))))))))))))) {
            if(Number(!(C.enexto(cc,C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,(C.mons+Number(C.PM_DJINNI)*C.sizes["struct permonst"]))))) return 0;
            mquaffmsg(mon,obj);
            C.m_useup(mon,obj);
            (mtmp=C.makemon((C.mons+Number(C.PM_DJINNI)*C.sizes["struct permonst"]),C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,C.u32(131072n)));
            if(Number(!(mtmp))) {
                if(vis) C.variadic(3,C.literal("%s"),empty);
            } else {
                if(vis) C.variadic(4,mtmp,C.literal("In a cloud of smoke, %s emerges!"),C.a_monnam(mtmp));
                C.variadic(5,C.literal("%s speaks."),(C.i32(vis)?C.Monnam(mtmp):C.field(C.c_common_strings,"c_common_strings","c_Something").value));
                /* I suspect few players will be upset that monsters */
                /* can't wish for wands of death here.... */
                ;
                if(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),117,(C.literal("precheck"))),C.rn2(2))):C.rn2(2)))) {
                    C.variadic(6,C.literal("You freed me!"));
                    (C.field(mtmp,"monst","mpeaceful").value=C.u32(1));
                    C.set_malign(mtmp);
                } else {
                    C.variadic(7,C.literal("It is about time."));
                    if(vis) C.variadic(8,C.literal("%s vanishes."),C.Monnam(mtmp));
                    C.mongone(mtmp);
                }
            }
            return 2;
        }
    }
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WAND_CLASS)&&C.i32(C.field(obj,"obj","cursed").value)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),132,(C.literal("precheck"))),C.rn2(100))):C.rn2(100)))))))) {
        let dam=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),133,(C.literal("precheck"))),C.d((C.i32((C.i32(C.field(obj,"obj","spe").value)+2))),(6)))):C.d((C.i32((C.i32(C.field(obj,"obj","spe").value)+2))),(6))));
        /* 3.6.1: no Deaf filter; 'if' message doesn't warrant it, 'else'
           message doesn't need it since You_hear() has one of its own */
        if(vis) {
            C.variadic(9,mon,C.literal("%s zaps %s, which suddenly explodes!"),C.Monnam(mon),C.an(C.xname(obj)));
        } else {
            /* same near/far threshold as mzapwand() */
            let range=((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mon,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mon,"monst","mx").value)*1),"unsigned char").value)&1)))!=0))?(C.i32((8+1))):(C.i32((8-3))));
            /* 9 or 5 */
            ;
            C.variadic(10,C.literal("a zap and an explosion %s."),((Number(C.dist2((C.field((mon),"monst","mx").value),(C.field((mon),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=C.i32((range*range))))?C.literal("nearby"):C.literal("in the distance")));
        }
        C.m_useup(mon,obj);
        (C.field(mon,"monst","mhp").value=C.i32(C.field(mon,"monst","mhp").value-dam));
        if((Number(C.field((mon),"monst","mhp").value<1))) {
            C.monkilled(mon,C.literal(""),242);
            return 1;
        }
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=0)));
        /* Only one needed to be set to 0 but the others are harmless */
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

/* when a monster zaps a wand give a message, deduct a charge, and if it
   isn't directly seen, remove hero's memory of the number of charges */
export function mzapwand(mtmp,otmp,self)
{
    self=C.i8(self);
    if(Number(C.i32(C.field(otmp,"obj","spe").value)<1)) {
        C.variadic(11,C.literal("Mon zapping wand with %d charges?"),C.i32(C.field(otmp,"obj","spe").value));
        return;
    }
    if(Number(!(C.canseemon(mtmp)))) {
        let range=((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&1)))!=0))?(C.i32((8+1))):(C.i32((8-3))));
        /* 9 or 5 */
        ;
        C.variadic(12,C.literal("a %s zap."),((Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=C.i32((range*range))))?C.literal("nearby"):C.literal("distant")));
        C.unknow_object(otmp);
        /* hero loses info when unseen obj is used */
    } else if(self) {
        C.variadic(13,C.literal("%s with %s!"),C.monverbself(mtmp,C.Monnam(mtmp),C.literal("zap"),0),C.doname(otmp));
    } else {
        C.variadic(14,mtmp,C.literal("%s zaps %s!"),C.Monnam(mtmp),C.an(C.xname(otmp)));
        C.stop_occupation();
    }
    (C.field(otmp,"obj","spe").value=C.i8(C.field(otmp,"obj","spe").value-1));
}

/* similar to mzapwand() but for magical horns (only instrument mons play) */
export function mplayhorn(mtmp,otmp,self)
{
    self=C.i8(self);
    const stackFrame=C.stackSave();
    try {
    let objnamp; let objbuf=C.stackAlloc((1*256));
    if(Number(!(C.canseemon(mtmp)))) {
        let range=((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&1)))!=0))?(C.i32((8+1))):(C.i32((8-3))));
        /* 9 or 5 */
        ;
        C.variadic(15,C.literal("a horn being played %s."),((Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=C.i32((range*range))))?C.literal("nearby"):C.literal("in the distance")));
        C.unknow_object(otmp);
        /* hero loses info when unseen obj is used */
    } else if(self) {
        C.observe_object(otmp);
        (objnamp=C.xname(otmp));
        if(Number(C.strlen(objnamp)>=C.u64(128))) (objnamp=C.simpleonames(otmp));
        C.variadic(16,objbuf,C.literal("a %s directed at"),objnamp);
        /* "<mon> plays a <horn> directed at himself!" */
        C.variadic(17,C.literal("%s!"),C.monverbself(mtmp,C.Monnam(mtmp),C.literal("play"),objbuf));
        C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        /* (wands handle this slightly differently) */
    } else {
        C.observe_object(otmp);
        (objnamp=C.xname(otmp));
        if(Number(C.strlen(objnamp)>=C.u64(128))) (objnamp=C.simpleonames(otmp));
        C.variadic(18,C.literal("%s %s %s directed at you!"),C.Monnam(mtmp),C.literal("plays"),C.an(objnamp));
        /* monverbself() would adjust the verb if hallucination made
                 subject plural; stick with singular here, at least for now */
        C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.stop_occupation();
    }
    (C.field(otmp,"obj","spe").value=C.i8(C.field(otmp,"obj","spe").value-1));
    /* use a charge */
    } finally {C.stackRestore(stackFrame); }
}

/* see or hear a monster reading a scroll;
   when scroll hasn't been seen, its label is revealed unless hero is deaf */
export function mreadmsg(mtmp,otmp)
{
    const stackFrame=C.stackSave();
    try {
    let onambuf=C.stackAlloc((1*256));
    let vismon=C.i8(C.canseemon(mtmp)); let tpindicator=C.i8((Number(!!(Number(!(vismon))&&C.sensemon(mtmp)))));
    if(Number(!!(Number(!(vismon))&&(Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) return;
    /* no feedback */
    C.observe_object(otmp);
    /* seeing/hearing scroll read reveals its label */
    C.strcpy(onambuf,C.singular(otmp,(C.i32(vismon)?C.functionPointer("doname"):C.functionPointer("ansimpleoname"))));
    if(vismon) {
        /* directly see the monster reading the scroll */
        C.variadic(19,mtmp,C.literal("%s reads %s!"),C.Monnam(mtmp),onambuf);
    } else {
        /* !Deaf, otherwise we wouldn't reach here */
        let blindbuf=C.stackAlloc((1*256));
        let similar=C.same_race(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value,C.field(mtmp,"monst","data").value); let uniqmon=C.i8((Number(!!(Number((C.i32((C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","geno").value)&4096)))!=0)||C.i32(C.field(mtmp,"monst","isshk").value))))); let recognize=C.i8((Number(!!(Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))))&&(Number(!!(C.i32(C.field(mtmp,"monst","meverseen").value)||(Number(!!(C.i32(similar)&&Number(!(uniqmon))))))))))));
        /* shopkeepers aren't unique monsters but since
                              they have distinct names, treat them as such */
        /* describe unseen monster accurately when not hallucinating if it
           has ever been seen or is the same race as the hero (not yet seen
           unique monsters excepted) */
        let mflags=(C.i32((C.i32((2|8))|((C.i32(recognize)?1:64)))));
        if(C.sensemon(mtmp)) {
            (tpindicator=(C.i8(1)));
        } else if(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&1)))!=0))&&Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=C.i32((10*10)))))) {
            /* monster can't be seen or sensed; hero might be blind or monster
               might be at a spot that isn't in view or might be invisible;
               remember it if the spot is within line of sight and relatively
               close */
            C.map_invisible(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        }
        C.variadic(20,(C.literal("mreadmsg")),278,blindbuf,BigInt((1*256)),C.literal("reading %s"),onambuf);
        C.strsubst(blindbuf,C.literal("reading a scroll labeled"),(C.i32(C.field(mtmp,"monst","mconf").value)?C.literal("attempting to incant"):C.literal("incant")));
        C.variadic(21,C.literal("%s %s."),C.x_monnam(mtmp,2,0,mflags,(C.i8(0))),blindbuf);
        if(tpindicator) C.flash_mon(mtmp);
    }
    if(C.field(mtmp,"monst","mconf").value) C.variadic(22,C.literal("Being confused, %s mispronounces the magic words..."),(C.i32(vismon)?C.mon_nam(mtmp):(C.field((C.genders+Number(C.pronoun_gender(mtmp,C.u32(2)))*C.sizes["struct Gender"]),"Gender","he").value)));
    /* (note: won't get if not seen and hero can't hear) */
    } finally {C.stackRestore(stackFrame); }
}

export function mquaffmsg(mtmp,otmp)
{
    if(C.canseemon(mtmp)) {
        C.observe_object(otmp);
        C.variadic(23,mtmp,C.literal("%s drinks %s!"),C.Monnam(mtmp),C.singular(otmp,C.functionPointer("doname")));
    } else if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
        ;
        C.variadic(24,C.literal("a chugging sound."));
    }
}

/* Defines for various types of stuff.  The order in which monsters prefer
 * to use them is determined by the order of the code logic, not the
 * numerical order in which they are defined.
 */
/* also an offensive item */
/*
#define MUSE_INNATE_TPT 9999
 * We cannot use this.  Since monsters get unlimited teleportation, if they
 * were allowed to teleport at will you could never catch them.  Instead,
 * assume they only teleport at random times, despite the inconsistency
 * that if you polymorph into one you teleport at will.
 */
export function m_use_healing(mtmp)
{
    let obj;
    if(Number(((obj=C.m_carrying(mtmp,C.POT_FULL_HEALING)))!=0)) {
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=18);
        return (C.i8(1));
    }
    if(Number(((obj=C.m_carrying(mtmp,C.POT_EXTRA_HEALING)))!=0)) {
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=4);
        return (C.i8(1));
    }
    if(Number(((obj=C.m_carrying(mtmp,C.POT_HEALING)))!=0)) {
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=3);
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* return TRUE if monster mtmp can see at least one sleeping soldier */
export function m_sees_sleepy_soldier(mtmp)
{
    let x=C.field(mtmp,"monst","mx").value; let y=C.field(mtmp,"monst","my").value;
    let xx; let yy;
    let mon;
    /* Distance is arbitrary.  What we really want to do is
     * have the soldier play the bugle when it sees or
     * remembers soldiers nearby...
     */
    for((xx=C.i16(C.i32((C.i32(x)-3))));Number(C.i32(xx)<=C.i32((C.i32(x)+3)));((xx=C.i16((xx+1)))-1)) for((yy=C.i16(C.i32((C.i32(y)-3))));Number(C.i32(yy)<=C.i32((C.i32(y)+3)));((yy=C.i16((yy+1)))-1)) {
        if(Number(!!(Number(!(C.isok(xx,yy)))||(Number(!!(Number(C.i32(xx)==C.i32(x))&&Number(C.i32(yy)==C.i32(y)))))))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(((mon=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(xx)*(8*21))+Number(yy)*8),"struct monst *").value)))!=0)&&(Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(512n))))!=C.u64(0n)))))&&Number(C.field(mon,"monst","data").value!=(C.mons+Number(C.PM_GUARD)*C.sizes["struct permonst"]))))&&(Number(!!(C.i32(C.field((mon),"monst","msleeping").value)||Number(!(C.field((mon),"monst","mcanmove").value)))))))) return (C.i8(1));
    }

    return (C.i8(0));
}

export function m_tele(mtmp,vismon,oseen,how)
{
    vismon=C.i8(vismon);
    oseen=C.i8(oseen);
    how=C.i32(how);
    /* monst that might be teleported */
    /* can see it */
    /* have seen the object that triggered this */
    /* type of that object */
    if(C.tele_restrict(mtmp)) {
        /* mysterious force... */
        if(Number(!!(C.i32(vismon)&&how))) C.discover_object((how),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        /* mentions 'teleport' */
        /* monster learns that teleportation isn't useful here */
        if(C.noteleport_level(mtmp)) C.mon_learns_traps(mtmp,C.TELEP_TRAP);
    } else if(Number(!!((Number(!!(C.mon_has_amulet(mtmp)||C.i32(C.On_W_tower_level(C.field(C.u,"you","uz").address)))))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),396,(C.literal("m_tele"))),C.rn2(3))):C.rn2(3)))))))) {
        if(vismon) C.variadic(25,mtmp,C.literal("%s seems disoriented for a moment."),C.Monnam(mtmp));
    } else {
        /* teleport monster 'mtmp' */
        if(how) {
            /* teleporation has been triggered by an object */
            if(oseen) C.discover_object((how),(C.i8(1)),(C.i8(1)),(C.i8(1)));
            C.rloc(mtmp,C.u32(2));
        } else {
            /* monster is voluntarily entering a teleporation trap; use the
               trap instead of rloc() in case it sends 'victim' to a vault */
            ((C.field(mtmp,"monst","mx").value=C.field(C.gt,"instance_globals_t","trapx").value),(C.field(mtmp,"monst","my").value=C.field(C.gt,"instance_globals_t","trapy").value));
            C.mintrap(mtmp,1);
        }
    }
}

/* return TRUE if monster mtmp has another monster next to it.
 * Called from find_defensive() where it is limited to Is_knox()
 * only, otherwise you could trap two monsters next to each other
 * in a boulder fort, and they would be happy to stay in there. */
export function m_next2m(mtmp)
{
    let x; let y;
    let m2;
    if(Number(!!((Number(C.field((mtmp),"monst","mhp").value<1))||(Number(C.field((mtmp),"monst","mstate").value!=C.i64(0)))))) return (C.i8(0));
    for((x=C.i16(C.i32((C.i32(C.field(mtmp,"monst","mx").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.field(mtmp,"monst","mx").value)+1)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(C.field(mtmp,"monst","my").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.field(mtmp,"monst","my").value)+1)));((y=C.i16((y+1)))-1)) {
        if(Number(!(C.isok(x,y)))) continue;
        if(Number(!!(((m2=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))&&Number(m2!=mtmp)))) return (C.i8(1));
    }

    return (C.i8(0));
}

/* Select a defensive item/action for a monster.  Returns TRUE iff one is
   found. */
export function find_defensive(mtmp,tryescape)
{
    tryescape=C.i8(tryescape);
    const stackFrame=C.stackSave();
    try {
    botm: {
    let obj;
    let t;
    let fraction;
    let x=C.field(mtmp,"monst","mx").value; let y=C.field(mtmp,"monst","my").value;
    let stuck=C.i8((Number(mtmp==C.field(C.u,"you","ustuck").value))); let immobile=C.i8((Number(C.i32(C.field(C.field(mtmp,"monst","data").value,"permonst","mmove").value)==0)));
    let stway;
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=0);
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=0);
    if(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))) return (C.i8(0));
    if(Number(!!(Number(!(tryescape))&&Number(C.dist2(x,y,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value)>25)))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(!!(C.i32(tryescape)&&((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))))&&Number(!((Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))))&&C.i32(m_next2m(mtmp))))) return (C.i8(0));
    if(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&C.i32(stuck)))) return (C.i8(0));
    /*
     * Since unicorn horns don't get used up, the monster would look
     * silly trying to use the same cursed horn round after round,
     * so skip cursed unicorn horns.
     *
     * Unicorns use their own horns; they're excluded from inventory
     * scanning by nohands().  Ki-rin is depicted in the AD&D Monster
     * Manual with same horn as a unicorn, so let it use its horn too.
     * is_unicorn() doesn't include it; the class differs and it has
     * no interest in gems.
     */
    if(Number(!!(Number(!!(C.i32(C.field(mtmp,"monst","mconf").value)||C.i32(C.field(mtmp,"monst","mstun").value)))||Number(!(C.field(mtmp,"monst","mcansee").value))))) {
        (obj=0);
        if(Number(!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))) {
            for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.UNICORN_HORN)&&Number(!(C.field(obj,"obj","cursed").value))))) break;

        }
        if(Number(!!(Number(!!(obj||(Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_UNICORN)&&(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(536870912n))))!=C.u64(0n))))))))||Number(C.field(mtmp,"monst","data").value==(C.mons+Number(C.PM_KI_RIN)*C.sizes["struct permonst"]))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=17);
            return (C.i8(1));
        }
    }
    if(Number(!!(C.i32(C.field(mtmp,"monst","mconf").value)||C.i32(C.field(mtmp,"monst","mstun").value)))) {
        let liztin=0;
        for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
            if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)&&Number(C.field(obj,"obj","corpsenm").value==C.PM_LIZARD)))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=19);
                return (C.i8(1));
            } else if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN)&&Number(C.field(obj,"obj","corpsenm").value==C.PM_LIZARD)))) {
                (liztin=obj);
            }
        }
        /* confused or stunned monster might not be able to open tin */
        if(Number(!!(Number(!!(liztin&&C.i32(mcould_eat_tin(mtmp))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),502,(C.literal("find_defensive"))),C.rn2(3))):C.rn2(3)))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=liztin);
            /* tin and corpse ultimately end up being handled the same */
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=19);
            return (C.i8(1));
        }
    }
    /* It so happens there are two unrelated cases when we might want to
     * check specifically for healing alone.  The first is when the monster
     * is blind (healing cures blindness).  The second is when the monster
     * is peaceful; then we don't want to flee the player, and by
     * coincidence healing is all there is that doesn't involve fleeing.
     * These would be hard to combine because of the control flow.
     * Pestilence won't use healing even when blind.
     */
    if(Number(!!(Number(!!(Number(!(C.field(mtmp,"monst","mcansee").value))&&Number(!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))))&&Number(C.field(mtmp,"monst","data").value!=(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"]))))) {
        if(m_use_healing(mtmp)) return (C.i8(1));
    }
    /* monsters aren't given wands of undead turning but if they
       happen to have picked one up, use it against corpse wielder;
       when applicable, use it now even if 'mtmp' isn't wounded */
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(C.field(mtmp,"monst","mpeaceful").value))&&Number(!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))))&&C.global("uwep").value))&&Number(C.i32(C.field(C.global("uwep").value,"obj","otyp").value)==C.CORPSE)))&&(Number(!!(Number(((C.mons+Number(C.field(C.global("uwep").value,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(C.global("uwep").value,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"])))))))&&Number(!(C.poly_when_stoned(C.field(mtmp,"monst","data").value)))))&&Number(!(C.Resists_Elem(mtmp,C.STONE_RES)))))&&C.i32(C.lined_up(mtmp))))) {
        /* only lines up if distu range is within 5*5 */
        /* could use m_carrying(), then nxtobj() when matching wand
           is empty, but direct traversal is actually simpler here */
        for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_UNDEAD_TURNING)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=20);
            return (C.i8(1));
        }

    }
    if(Number(!(tryescape))) {
        /* do we try to heal? */
        (fraction=(Number(C.field(C.u,"you","ulevel").value<10)?5:(Number(C.field(C.u,"you","ulevel").value<14)?4:3)));
        if(Number(!!(Number(C.field(mtmp,"monst","mhp").value>=C.field(mtmp,"monst","mhpmax").value)||(Number(!!(Number(C.field(mtmp,"monst","mhp").value>=10)&&Number(C.i32((C.field(mtmp,"monst","mhp").value*fraction))>=C.field(mtmp,"monst","mhpmax").value))))))) return (C.i8(0));
        if(C.field(mtmp,"monst","mpeaceful").value) {
            if(Number(!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))) {
                if(m_use_healing(mtmp)) return (C.i8(1));
            }
            return (C.i8(0));
        }
    }
    if(Number(!!(Number(!!(C.i32(stuck)||C.i32(immobile)))||C.i32(C.field(mtmp,"monst","mtrapped").value)))) {
        ;
        /* fleeing by stairs or traps is not possible */
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.STAIRS)) {
        (stway=C.stairway_at(x,y));
        if(Number(!!(Number(!!(stway&&Number(!(C.field(stway,"stairway","up").value))))&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            if(Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))) (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=9);
        } else if(Number(!!(Number(!!(stway&&C.i32(C.field(stway,"stairway","up").value)))&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=8);
        } else if(Number(!!(stway&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)!=C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            if(Number(!!(C.i32(C.field(stway,"stairway","up").value)||Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))))) (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=14);
        }
    } else if(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value)==C.LADDER)) {
        (stway=C.stairway_at(x,y));
        if(Number(!!(Number(!!(stway&&C.i32(C.field(stway,"stairway","up").value)))&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=12);
        } else if(Number(!!(Number(!!(stway&&Number(!(C.field(stway,"stairway","up").value))))&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)==C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            if(Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))) (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=13);
        } else if(Number(!!(stway&&Number(C.i32(C.field(C.field(stway,"stairway","tolev").address,"d_level","dnum").value)!=C.i32(C.field(C.field(C.u,"you","uz").address,"d_level","dnum").value))))) {
            if(Number(!!(C.i32(C.field(stway,"stairway","up").value)||Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))))) (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=14);
        }
    } else {
        /* Note: trap doors take precedence over teleport traps. */
        let xx; let yy; let i; let locs=C.stackAlloc(((2*10)*2));
        let ignore_boulders=C.i8((Number(!!(Number(!!((Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","msize").value)<1))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n)))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n))))))); let diag_ok=C.i8(Number(!((Number(C.i32(((C.field((C.field(mtmp,"monst","data").value),"permonst","pmidx").value)))==C.PM_GRID_BUG)))));
        for((i=C.i16(0));Number(C.i32(i)<10);(i=C.i16((i+1)))) (C.cell(((locs+Number(i)*(2*2))+Number(0)*2),"short").value=(C.cell(((locs+Number(i)*(2*2))+Number(1)*2),"short").value=C.i16(0)));

        /* 10: 9 spots plus sentinel */
        /* collect viable spots; monster's <mx,my> comes first */
        ((C.cell(((locs+Number(0)*(2*2))+Number(0)*2),"short").value=x),(C.cell(((locs+Number(0)*(2*2))+Number(1)*2),"short").value=y));
        (i=C.i16(1));
        for((xx=C.i16(C.i32((C.i32(x)-1))));Number(C.i32(xx)<=C.i32((C.i32(x)+1)));((xx=C.i16((xx+1)))-1)) for((yy=C.i16(C.i32((C.i32(y)-1))));Number(C.i32(yy)<=C.i32((C.i32(y)+1)));((yy=C.i16((yy+1)))-1)) if(Number(!!(C.isok(xx,yy)&&(Number(!!(Number(C.i32(xx)!=C.i32(x))||Number(C.i32(yy)!=C.i32(y)))))))) {
            ((C.cell(((locs+Number(i)*(2*2))+Number(0)*2),"short").value=xx),(C.cell(((locs+Number(i)*(2*2))+Number(1)*2),"short").value=yy));
            (i=C.i16((i+1)));
        }


        /* look for a suitable trap among the viable spots */
        for((i=C.i16(0));Number(C.i32(i)<10);(i=C.i16((i+1)))) {
            ((xx=C.cell(((locs+Number(i)*(2*2))+Number(0)*2),"short").value),(yy=C.cell(((locs+Number(i)*(2*2))+Number(1)*2),"short").value));
            if(Number(!(xx))) break;
            /* we've run out of spots */
            /* skip if it's hero's location
               or a diagonal spot and monster can't move diagonally
               or some other monster is there */
            if(Number(!!(Number(!!((Number(!!(Number(C.i32((xx))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((yy))==C.i32(C.field(C.u,"you","uy").value)))))||(Number(!!(Number(!!(Number(C.i32(xx)!=C.i32(x))&&Number(C.i32(yy)!=C.i32(y))))&&Number(!(diag_ok)))))))||(Number(!!(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(xx)*(8*21))+Number(yy)*8),"struct monst *").value&&Number(!((Number(!!(Number(C.i32(xx)==C.i32(x))&&Number(C.i32(yy)==C.i32(y))))))))))))) continue;
            /* skip if there's no trap or can't/won't move onto trap */
            if(Number(!!(Number(!!(Number(((t=C.t_at(xx,yy)))==0)||(Number(!!(Number(!(ignore_boulders))&&C.sobj_at(C.BOULDER,xx,yy))))))||C.i32(C.onscary(xx,yy,mtmp))))) continue;
            /* use trap if it's the correct type */
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(C.i32((C.field(t,"trap","ttyp").value))==C.HOLE)||Number(C.i32((C.field(t,"trap","ttyp").value))==C.TRAPDOOR))))&&Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))))&&Number(!(C.field(mtmp,"monst","isshk").value))))&&Number(!(C.field(mtmp,"monst","isgd").value))))&&Number(!(C.field(mtmp,"monst","ispriest").value))))&&C.i32(C.Can_fall_thru(C.field(C.u,"you","uz").address))))) {
                (C.field(C.gt,"instance_globals_t","trapx").value=xx);
                (C.field(C.gt,"instance_globals_t","trapy").value=yy);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=6);
                break;
                /* no need to look at any other spots */
            } else if(Number(C.i32(C.field(t,"trap","ttyp").value)==C.TELEP_TRAP)) {
                (C.field(C.gt,"instance_globals_t","trapx").value=xx);
                (C.field(C.gt,"instance_globals_t","trapy").value=yy);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=7);
            }
        }
    }
    if((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))) break botm;
    /* can't use objects */
    if(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(512n))))!=C.u64(0n)))&&Number(((obj=C.m_carrying(mtmp,C.BUGLE)))!=0)))&&C.i32(m_sees_sleepy_soldier(mtmp))))) {
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=16);
    }
    /* use immediate physical escape prior to attempting magic */
    if(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value) break botm;
    /* stairs, trap door or tele-trap, bugle alert */
    /* kludge to cut down on trap destruction (particularly portals) */
    (t=C.t_at(x,y));
    if(Number(!!(t&&(Number(!!(Number(!!((Number(!!(Number(C.i32((C.field(t,"trap","ttyp").value))==C.PIT)||Number(C.i32((C.field(t,"trap","ttyp").value))==C.SPIKED_PIT))))||Number(C.i32(C.field(t,"trap","ttyp").value)==C.WEB)))||Number(C.i32(C.field(t,"trap","ttyp").value)==C.BEAR_TRAP))))))) (t=0);
    /* ok for monster to dig here */
    /* selection could be improved by collecting all possibilities
       into an array and then picking one at random */
    for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        /* don't always use the same selection pattern */
        if(Number(!!(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),659,(C.literal("find_defensive"))),C.rn2(3))):C.rn2(3)))))))) break;
        /* nomore(MUSE_WAN_DIGGING); */
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==5)) break;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_DIGGING)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!(stuck))))&&Number(!(t))))&&Number(!(C.field(mtmp,"monst","isshk").value))))&&Number(!(C.field(mtmp,"monst","isgd").value))))&&Number(!(C.field(mtmp,"monst","ispriest").value))))&&Number(!((Number(!!(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))))))&&Number(!(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value))))&&Number(!((C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","flags").value)&8)))))))&&Number(!((Number(!!(C.i32(C.Is_botlevel(C.field(C.u,"you","uz").address))||(Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value))))))))))&&Number(!((Number(!!(Number(!!(C.i32(C.is_ice(x,y))||C.i32(C.is_pool(x,y))))||C.i32(C.is_lava(x,y)))))))))&&Number(!((Number(!!((Number(!!(Number(C.field((mtmp),"monst","data").value==(C.mons+Number(C.PM_VLAD_THE_IMPALER)*C.sizes["struct permonst"]))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))&&C.i32(C.In_V_tower(C.field(C.u,"you","uz").address)))))))))) {
            /* monsters digging in Sokoban can ruin things */
            /* digging wouldn't be effective; assume they know that */
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=5);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==2)) continue;
        ;
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==15)) continue;
        ;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_TELEPORTATION)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))) {
            /* use the TELEP_TRAP bit to determine if they know
             * about noteleport on this level or not.  Avoids
             * ineffective re-use of teleportation.  This does
             * mean if the monster leaves the level, they'll know
             * about teleport traps.
             */
            if(Number(!!(Number(!(C.noteleport_level(mtmp)))||Number(!(C.mon_knows_traps(mtmp,C.TELEP_TRAP)))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=((C.mon_has_amulet(mtmp))?15:2));
            }
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==1)) continue;
        ;
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_TELEPORTATION)&&C.i32(C.field(mtmp,"monst","mcansee").value)))&&(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))&&(Number(!!(Number(!(C.field(obj,"obj","cursed").value))||(Number(!!(Number(!!(Number(!((Number(!!(C.i32(C.field(mtmp,"monst","isshk").value)&&C.inhishop(mtmp))))))&&Number(!(C.field(mtmp,"monst","isgd").value))))&&Number(!(C.field(mtmp,"monst","ispriest").value))))))))))) {
            /* see WAN_TELEPORTATION case above */
            if(Number(!!(Number(!(C.noteleport_level(mtmp)))||Number(!(C.mon_knows_traps(mtmp,C.TELEP_TRAP)))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=1);
            }
        }
        if(Number(C.field(mtmp,"monst","data").value!=(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"]))) {
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==18)) continue;
            ;
            if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_FULL_HEALING)) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=18);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==4)) continue;
            ;
            if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_EXTRA_HEALING)) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=4);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==10)) continue;
            ;
            if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_CREATE_MONSTER)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=10);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==3)) continue;
            ;
            if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_HEALING)) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=3);
            }
        } else {
            /* Pestilence */
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==18)) continue;
            ;
            if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_SICKNESS)) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=18);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==10)) continue;
            ;
            if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_CREATE_MONSTER)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=10);
            }
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value==11)) continue;
        ;
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_CREATE_MONSTER)) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value=11);
        }
    }
    }
    return C.i8(Number(!(Number(!(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value)))));
    } finally {C.stackRestore(stackFrame); }
}

/* when a monster deliberately enters a trap, make sure the spot becomes
   accessible (trap doors and teleporters inside niches are located at
   secret corridor locations; convert such into normal corridor even if
   hero doesn't see it happen) */
export function reveal_trap(t,seeit)
{
    seeit=C.i8(seeit);
    let lev=((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(t,"trap","tx").value)*(C.sizes["struct rm"]*21))+Number(C.field(t,"trap","ty").value)*C.sizes["struct rm"]);
    if(Number(C.i32(C.field(lev,"rm","typ").value)==C.SCORR)) {
        ((C.field(lev,"rm","typ").value=C.i8(C.CORR)),(C.field(lev,"rm","flags").value=C.u32(0)));
        /* set_levltyp(,,CORR) */
        C.unblock_point(C.i32(C.field(t,"trap","tx").value),C.i32(C.field(t,"trap","ty").value));
    }
    if(seeit) C.seetrap(t);
}

/* Monsters without the Amulet escape the dungeon and
 * are gone for good when they leave up the up stairs.
 * A monster with the Amulet would leave it behind
 * (mongone -> mdrop_special_objs) but we force any
 * monster who manages to acquire it or the invocation
 * tools to stick around instead of letting it escape.
 * Don't let the Wizard escape even when not carrying
 * anything of interest unless there are more than 1
 * of him.
 */
export function mon_escape(mtmp,vismon)
{
    vismon=C.i8(vismon);
    if(Number(!!(C.mon_has_special(mtmp)||(Number(!!(C.i32(C.field(mtmp,"monst","iswiz").value)&&Number(C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","no_of_wizards").value<C.u32(2)))))))) return 0;
    if(vismon) C.variadic(26,mtmp,C.literal("%s escapes the dungeon!"),C.Monnam(mtmp));
    C.mongone(mtmp);
    return 2;
}

/* Perform a defensive action for a monster.  Must be called immediately
 * after find_defensive().  Return values are 0: did something, 1: died,
 * 2: did something and can't attack again (i.e. teleported).
 */
export function use_defensive(mtmp)
{
    const stackFrame=C.stackSave();
    try {
    const MissingDefensiveItem=C.staticArray("use_defensive","MissingDefensiveItem","use_defensive: no %s");
    let i; let fleetim;
    let otmp=C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","defensive").value;
    let vis; let vismon; let oseen;
    let t;
    let stway;
    if(Number(((i=precheck(mtmp,otmp)))!=0)) return i;
    (vis=C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))));
    (vismon=C.i8(C.canseemon(mtmp)));
    (oseen=C.i8(Number(!!(otmp&&C.i32(vismon)))));
    /* when using defensive choice to run away, we want monster to avoid
       rushing right straight back; don't override if already scared */
    (fleetim=(Number(!(C.field(mtmp,"monst","mflee").value))?(C.i32((33-(C.i32(Math.trunc((C.i32((30*C.field(mtmp,"monst","mhp").value))/C.field(mtmp,"monst","mhpmax").value))))))):0));
    switch(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value) {
        case (17):
            /* unlike most defensive cases, unicorn horn object is optional */
            if(vismon) {
                if(otmp) C.variadic(27,mtmp,C.literal("%s uses a unicorn horn!"),C.Monnam(mtmp));
 else C.variadic(28,C.literal("tip of %s's horn glows!"),C.mon_nam(mtmp));
            }
        if(Number(!(C.field(mtmp,"monst","mcansee").value))) {
            mcureblindness(mtmp,vismon);
        } else if(Number(!!(C.i32(C.field(mtmp,"monst","mconf").value)||C.i32(C.field(mtmp,"monst","mstun").value)))) {
            (C.field(mtmp,"monst","mconf").value=(C.field(mtmp,"monst","mstun").value=C.u32(0)));
            if(vismon) C.variadic(29,mtmp,C.literal("%s seems steadier now."),C.Monnam(mtmp));
        } else {
            C.variadic(30,C.literal("No need for unicorn horn?"));
        }
        return 2;
        case (16):
            if(Number(!(otmp))) C.variadic(31,MissingDefensiveItem,C.literal("bugle"));
        if(vismon) {
            C.variadic(32,mtmp,C.literal("%s plays %s!"),C.Monnam(mtmp),C.doname(otmp));
        } else if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            ;
            C.variadic(33,C.literal("a bugle playing reveille!"));
        }
        C.awaken_soldiers(mtmp);
        return 2;
        case (2):
            if(Number(!(otmp))) C.variadic(34,MissingDefensiveItem,C.literal("wand of teleportation"));
        if(Number(!!(Number(!!((Number(!!(C.i32(C.field(mtmp,"monst","isshk").value)&&C.inhishop(mtmp))))||C.i32(C.field(mtmp,"monst","isgd").value)))||C.i32(C.field(mtmp,"monst","ispriest").value)))) return 2;
        if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
            C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
        }
        ;
        mzapwand(mtmp,otmp,(C.i8(1)));
        m_tele(mtmp,vismon,oseen,C.WAN_TELEPORTATION);
        return 2;
        case (15):
            if(Number(!(otmp))) C.variadic(35,MissingDefensiveItem,C.literal("wand of teleportation"));
        (C.field(C.gz,"instance_globals_z","zap_oseen").value=oseen);
        mzapwand(mtmp,otmp,(C.i8(0)));
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
        mbhit(mtmp,(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),864,(C.literal("use_defensive"))),C.rn2(8))):C.rn2(8)))+(6)))),C.functionPointer("mbhitm"),C.functionPointer("bhito"),otmp);
        /* monster learns that teleportation isn't useful here */
        if(C.noteleport_level(mtmp)) C.mon_learns_traps(mtmp,C.TELEP_TRAP);
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
        return 2;
        case (1):
{
                let obj_is_cursed;
                if(Number(!(otmp))) C.variadic(36,MissingDefensiveItem,C.literal("scroll of teleportation"));
                (obj_is_cursed=C.i32(C.field(otmp,"obj","cursed").value));
                if(Number(!!(Number(!!(C.i32(C.field(mtmp,"monst","isshk").value)||C.i32(C.field(mtmp,"monst","isgd").value)))||C.i32(C.field(mtmp,"monst","ispriest").value)))) return 2;
                if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                    C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
                }
                ;
                /* we want to be able to access otmp after the teleport but it
           might get destroyed if still in mtmp's inventory (maybe mtmp
           lands in lava or on a fire trap) so take it out in advance */
                if(Number(C.field(otmp,"obj","quan").value>1n)) (otmp=C.splitobj(otmp,1n));
                C.extract_from_minvent(mtmp,otmp,(C.i8(0)),(C.i8(0)));
                /* 'last_msg' will be changed to PLNMSG_UNKNOWN if any messages
           are issued by mreadmsg(), 'if (vismon) pline()', or m_tele() */
                (C.field(C.iflags,"instance_flags","last_msg").value=C.PLNMSG_enum);
                mreadmsg(mtmp,otmp);
                /* sets otmp->dknown if !Blind or !Deaf */
                if(Number(!!(obj_is_cursed||C.i32(C.field(mtmp,"monst","mconf").value)))) {
                    let nlev;
                    let flev=C.stackAlloc(C.sizes["struct d_level"]);
                    (nlev=C.random_teleport_level());
                    if(Number(!!(C.mon_has_amulet(mtmp)||(Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))) {
                        if(vismon) C.variadic(37,mtmp,C.literal("%s seems very disoriented for a moment."),C.Monnam(mtmp));
                    } else if(Number(nlev==C.i32(C.depth(C.field(C.u,"you","uz").address)))) {
                        if(vismon) C.variadic(38,mtmp,C.literal("%s shudders for a moment."),C.Monnam(mtmp));
                    } else {
                        C.get_level(flev,nlev);
                        C.migrate_to_level(mtmp,C.ledger_no(flev),C.i16(0),0);
                    }
                } else {
                    m_tele(mtmp,vismon,oseen,C.SCR_TELEPORTATION);
                }
                /* m_tele() handles makeknown(); trycall() will be a no-op when
           otmp->otyp is already discovered */
                if(Number(!!(C.i32(C.field(otmp,"obj","dknown").value)&&Number(C.field(C.iflags,"instance_flags","last_msg").value!=C.PLNMSG_enum)))) C.trycall(otmp);
                /* already removed from mtmp->minvent so not 'm_useup(mtmp, otmp)' */
                C.obfree(otmp,0);
                return 2;
            }        case (5):
            if(Number(!(otmp))) C.variadic(39,MissingDefensiveItem,C.literal("wand of digging"));
        if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
            C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
        }
        ;
        mzapwand(mtmp,otmp,(C.i8(0)));
        if(oseen) C.discover_object((C.WAN_DIGGING),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        if(Number(!!(Number(!!(Number(!!((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(mtmp,"monst","mx").value)*(C.sizes["struct rm"]*21))+Number(C.field(mtmp,"monst","my").value)*C.sizes["struct rm"]),"rm","typ").value))>=C.STAIRS)&&Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(mtmp,"monst","mx").value)*(C.sizes["struct rm"]*21))+Number(C.field(mtmp,"monst","my").value)*C.sizes["struct rm"]),"rm","typ").value))<=C.ALTAR))))||(Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(mtmp,"monst","mx").value)*(C.sizes["struct rm"]*21))+Number(C.field(mtmp,"monst","my").value)*C.sizes["struct rm"]),"rm","typ").value))==C.DRAWBRIDGE_UP)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(mtmp,"monst","mx").value)*(C.sizes["struct rm"]*21))+Number(C.field(mtmp,"monst","my").value)*C.sizes["struct rm"]),"rm","typ").value))==C.DRAWBRIDGE_DOWN))))))||(Number(C.is_drawbridge_wall(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value)>=0))))||C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value)))) {
            C.variadic(40,C.literal("digging ray is ineffective."));
            return 2;
        }
        if(Number(!!(Number(!(C.Can_dig_down(C.field(C.u,"you","uz").address)))&&Number(!(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(mtmp,"monst","mx").value)*(C.sizes["struct rm"]*21))+Number(C.field(mtmp,"monst","my").value)*C.sizes["struct rm"]),"rm","candig").value))))) {
            /* can't dig further if there's already a pit (or other trap)
               here, or if pit creation fails for some reason */
            if(Number(!!(C.t_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value)||Number(!(((t=C.maketrap(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.PIT)))))))) {
                if(vismon) {
                    C.variadic(41,C.literal("%s here is too hard to dig in."),C.surface(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
                }
                return 2;
            }
            /* pit creation succeeded */
            if(vis) {
                C.seetrap(t);
                C.variadic(42,mtmp,C.literal("%s has made a pit in the %s."),C.Monnam(mtmp),C.surface(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
            }
            C.fill_pit(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
            C.recalc_block_point(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
            return ((Number(C.mintrap(mtmp,4)==C.Trap_Killed_Mon))?1:2);
        }
        (t=C.maketrap(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.HOLE));
        if(Number(!(t))) return 2;
        C.recalc_block_point(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        C.seetrap(t);
        if(vis) {
            C.variadic(43,mtmp,C.literal("%s has made a hole in the %s."),C.Monnam(mtmp),C.surface(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
            C.variadic(44,mtmp,C.literal("%s %s through..."),C.Monnam(mtmp),((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(1n))))!=C.u64(0n)))?C.literal("dives"):C.literal("falls")));
        } else if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) {
            ;
            C.variadic(45,C.literal("%s crash through the %s."),C.field(C.c_common_strings,"c_common_strings","c_something").value,C.surface(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        }
        C.fill_pit(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        /* we made sure that there is a level for mtmp to go to */
        C.migrate_to_level(mtmp,C.i16(C.i32((C.i32(C.ledger_no(C.field(C.u,"you","uz").address))+1))),C.i16(0),0);
        return 2;
        case (20):
            if(Number(!(otmp))) C.variadic(46,MissingDefensiveItem,C.literal("wand of undead turning"));
        (C.field(C.gz,"instance_globals_z","zap_oseen").value=oseen);
        mzapwand(mtmp,otmp,(C.i8(0)));
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
        mbhit(mtmp,(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),978,(C.literal("use_defensive"))),C.rn2(8))):C.rn2(8)))+(6)))),C.functionPointer("mbhitm"),C.functionPointer("bhito"),otmp);
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
        return 2;
        case (10):
{
                let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
                let mon;
                /* pm: 0 => random, eel => aquatic, croc => amphibious */
                let pm=(Number(!(C.is_pool(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value)))?0:(C.mons+Number((C.i32(C.field(C.u,"you","uinwater").value)?C.PM_GIANT_EEL:C.PM_CROCODILE))*C.sizes["struct permonst"]));
                if(Number(!(otmp))) C.variadic(47,MissingDefensiveItem,C.literal("wand of create monster"));
                if(Number(!(C.enexto(cc,C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,pm)))) return 0;
                mzapwand(mtmp,otmp,(C.i8(0)));
                (mon=C.makemon(0,C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,C.u32(0n)));
                if(Number(!!(Number(!!(mon&&(Number(!!(C.canseemon(mon)||C.sensemon(mon))))))&&C.i32(oseen)))) C.discover_object((C.WAN_CREATE_MONSTER),(C.i8(1)),(C.i8(1)),(C.i8(1)));
                return 2;
            }        case (11):
{
                let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
                let pm=0; let fish=0;
                let cnt=1;
                let mon;
                let known=(C.i8(0));
                if(Number(!(otmp))) C.variadic(48,MissingDefensiveItem,C.literal("scroll of create monster"));
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1007,(C.literal("use_defensive"))),C.rn2(73))):C.rn2(73)))))) (cnt=C.i32(cnt+((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1008,(C.literal("use_defensive"))),C.rnd(4))):C.rnd(4)))));
                if(Number(!!(C.i32(C.field(mtmp,"monst","mconf").value)||C.i32(C.field(otmp,"obj","cursed").value)))) (cnt=C.i32(cnt+12));
                if(C.field(mtmp,"monst","mconf").value) (pm=(fish=(C.mons+Number(C.PM_ACID_BLOB)*C.sizes["struct permonst"])));
 else if(C.is_pool(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value)) (fish=(C.mons+Number((C.i32(C.field(C.u,"you","uinwater").value)?C.PM_GIANT_EEL:C.PM_CROCODILE))*C.sizes["struct permonst"]));
                mreadmsg(mtmp,otmp);
                while(((cnt=C.i32((cnt-1)))+1)) {
                    /* `fish' potentially gives bias towards water locations;
               `pm' is what to actually create (0 => random) */
                    if(Number(!(C.enexto(cc,C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,fish)))) break;
                    (mon=C.makemon(pm,C.field(cc,"nhcoord","x").value,C.field(cc,"nhcoord","y").value,C.u32(0n)));
                    if(Number(!!(mon&&(Number(!!(C.canseemon(mon)||C.sensemon(mon))))))) (known=(C.i8(1)));
                }
                /* The only case where we don't use oseen.  For wands, you
         * have to be able to see the monster zap the wand to know
         * what type it is.  For teleport scrolls, you have to see
         * the monster to know it teleported.
         */
                if(known) C.discover_object((C.SCR_CREATE_MONSTER),(C.i8(1)),(C.i8(1)),(C.i8(1)));
 else C.trycall(otmp);
                C.m_useup(mtmp,otmp);
                return 2;
            }        case (6):
            /* trap doors on "bottom" levels of dungeons are rock-drop
         * trap doors, not holes in the floor.  We check here for
         * safety.
         */
            if(C.Is_botlevel(C.field(C.u,"you","uz").address)) return 0;
        if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
            C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
        }
        ;
        (t=C.t_at(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value));
        if(vis) {
            C.variadic(49,mtmp,C.literal("%s %s into a %s!"),C.Monnam(mtmp),C.vtense(C.cell((C.field(C.c_common_strings,"c_common_strings","c_fakename").address+Number(0)*8),"char *").value,C.locomotion(C.field(mtmp,"monst","data").value,C.literal("jump"))),C.trapname(C.i32(C.field(t,"trap","ttyp").value),(C.i8(0))));
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t,vis);
        /*  don't use rloc_to() because worm tails must "move" */
        (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(mtmp,"monst","mx").value)*(8*21))+Number(C.field(mtmp,"monst","my").value)*8),"struct monst *").value=0);
        C.newsym(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        /* update old location */
        C.place_monster(mtmp,C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        if(C.field(mtmp,"monst","wormno").value) C.worm_move(mtmp);
        C.newsym(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        C.migrate_to_level(mtmp,C.i16(C.i32((C.i32(C.ledger_no(C.field(C.u,"you","uz").address))+1))),C.i16(0),0);
        return 2;
        case (8):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (stway=C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        if(Number(!(stway))) return 0;
        if(Number(C.i32(C.ledger_no(C.field(C.u,"you","uz").address))==1)) return mon_escape(mtmp,vismon);
        /* impossible; level 1 upstairs are SSTAIRS */
        if(Number(!!(Number(!!(Number(!!(C.i32(C.In_hell(C.field(C.u,"you","uz").address))&&C.mon_has_amulet(mtmp)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1073,(C.literal("use_defensive"))),C.rn2(4))):C.rn2(4)))))))&&(Number(C.i32(C.dunlev(C.field(C.u,"you","uz").address))<C.i32((C.i32(C.dunlevs_in_dungeon(C.field(C.u,"you","uz").address))-3))))))) {
            if(vismon) C.variadic(50,C.literal("As %s climbs the stairs, a mysterious force momentarily surrounds %s..."),C.mon_nam(mtmp),(C.field((C.genders+Number(C.pronoun_gender(mtmp,C.u32(2)))*C.sizes["struct Gender"]),"Gender","him").value));
            /* simpler than for the player; this will usually be
               the Wizard and he'll immediately go right to the
               upstairs, so there's not much point in having any
               chance for a random position on the current level */
            C.migrate_to_level(mtmp,C.i16(C.i32((C.i32(C.ledger_no(C.field(C.u,"you","uz").address))+1))),C.i16(0),0);
        } else {
            if(vismon) C.variadic(51,mtmp,C.literal("%s escapes upstairs!"),C.Monnam(mtmp));
            C.migrate_to_level(mtmp,C.ledger_no(C.field(stway,"stairway","tolev").address),C.i16(4),0);
        }
        return 2;
        case (9):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (stway=C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        if(Number(!(stway))) return 0;
        if(vismon) C.variadic(52,mtmp,C.literal("%s escapes downstairs!"),C.Monnam(mtmp));
        C.migrate_to_level(mtmp,C.ledger_no(C.field(stway,"stairway","tolev").address),C.i16(3),0);
        return 2;
        case (12):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (stway=C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        if(Number(!(stway))) return 0;
        if(vismon) C.variadic(53,mtmp,C.literal("%s escapes up the ladder!"),C.Monnam(mtmp));
        C.migrate_to_level(mtmp,C.ledger_no(C.field(stway,"stairway","tolev").address),C.i16(6),0);
        return 2;
        case (13):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (stway=C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        if(Number(!(stway))) return 0;
        if(vismon) C.variadic(54,mtmp,C.literal("%s escapes down the ladder!"),C.Monnam(mtmp));
        C.migrate_to_level(mtmp,C.ledger_no(C.field(stway,"stairway","tolev").address),C.i16(5),0);
        return 2;
        case (14):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (stway=C.stairway_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
        if(Number(!(stway))) return 0;
        if(Number(C.i32(C.ledger_no(C.field(C.u,"you","uz").address))==1)) {
            return mon_escape(mtmp,vismon);
        }
        if(vismon) C.variadic(55,mtmp,C.literal("%s escapes %sstairs!"),C.Monnam(mtmp),(C.i32(C.field(stway,"stairway","up").value)?C.literal("up"):C.literal("down")));
        /* going from the Valley to Castle (Stronghold) has no sstairs
           to target, but having gs.sstairs.<sx,sy> == <0,0> will work the
           same as specifying MIGR_RANDOM when mon_arrive() eventually
           places the monster, so we can use MIGR_SSTAIRS unconditionally */
        C.migrate_to_level(mtmp,C.ledger_no(C.field(stway,"stairway","tolev").address),C.i16(7),0);
        return 2;
        case (7):
            if(Number(!!(fleetim&&Number(!(C.field(mtmp,"monst","iswiz").value))))) {
                C.monflee(mtmp,fleetim,(C.i8(0)),(C.i8(0)));
            }
        ;
        (t=C.t_at(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value));
        if(vis) {
            C.variadic(56,mtmp,C.literal("%s %s onto a %s!"),C.Monnam(mtmp),C.vtense(C.cell((C.field(C.c_common_strings,"c_common_strings","c_fakename").address+Number(0)*8),"char *").value,C.locomotion(C.field(mtmp,"monst","data").value,C.literal("jump"))),C.trapname(C.i32(C.field(t,"trap","ttyp").value),(C.i8(0))));
        }
        /* if trap was in a concealed niche, it's no longer concealed */
        reveal_trap(t,vis);
        /*  don't use rloc_to() because worm tails must "move" */
        (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(mtmp,"monst","mx").value)*(8*21))+Number(C.field(mtmp,"monst","my").value)*8),"struct monst *").value=0);
        C.newsym(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        /* update old location */
        C.place_monster(mtmp,C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        if(C.field(mtmp,"monst","wormno").value) C.worm_move(mtmp);
        C.maybe_unhide_at(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        C.newsym(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        /* 0: 'no object' rather than STRANGE_OBJECT; FALSE: obj not seen */
        m_tele(mtmp,vismon,(C.i8(0)),0);
        return 2;
        case (3):
            if(Number(!(otmp))) C.variadic(57,MissingDefensiveItem,C.literal("potioh of healing"));
        mquaffmsg(mtmp,otmp);
        (i=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1165,(C.literal("use_defensive"))),C.d((C.i32((6+C.i32((2*C.bcsign(otmp)))))),(4)))):C.d((C.i32((6+C.i32((2*C.bcsign(otmp)))))),(4)))));
        C.healmon(mtmp,i,1);
        if(Number(!!(Number(!(C.field(otmp,"obj","cursed").value))&&Number(!(C.field(mtmp,"monst","mcansee").value))))) mcureblindness(mtmp,vismon);
        if(vismon) C.variadic(58,mtmp,C.literal("%s looks better."),C.Monnam(mtmp));
        if(oseen) C.discover_object((C.POT_HEALING),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.m_useup(mtmp,otmp);
        return 2;
        case (4):
            if(Number(!(otmp))) C.variadic(59,MissingDefensiveItem,C.literal("potioh of extra healing"));
        mquaffmsg(mtmp,otmp);
        (i=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1179,(C.literal("use_defensive"))),C.d((C.i32((6+C.i32((2*C.bcsign(otmp)))))),(8)))):C.d((C.i32((6+C.i32((2*C.bcsign(otmp)))))),(8)))));
        C.healmon(mtmp,i,(C.i32(C.field(otmp,"obj","blessed").value)?5:2));
        if(Number(!(C.field(mtmp,"monst","mcansee").value))) mcureblindness(mtmp,vismon);
        if(vismon) C.variadic(60,mtmp,C.literal("%s looks much better."),C.Monnam(mtmp));
        if(oseen) C.discover_object((C.POT_EXTRA_HEALING),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.m_useup(mtmp,otmp);
        return 2;
        case (18):
            if(Number(!(otmp))) C.variadic(61,MissingDefensiveItem,C.literal("potioh of full healing"));
        mquaffmsg(mtmp,otmp);
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.POT_SICKNESS)) C.unbless(otmp);
        /* Pestilence */
        C.healmon(mtmp,C.field(mtmp,"monst","mhpmax").value,(C.i32(C.field(otmp,"obj","blessed").value)?8:4));
        if(Number(!!(Number(!(C.field(mtmp,"monst","mcansee").value))&&Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.POT_SICKNESS)))) mcureblindness(mtmp,vismon);
        if(vismon) C.variadic(62,mtmp,C.literal("%s looks completely healed."),C.Monnam(mtmp));
        if(oseen) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.m_useup(mtmp,otmp);
        return 2;
        case (19):
            if(Number(!(otmp))) C.variadic(63,MissingDefensiveItem,C.literal("lizard corpse"));
        /* not actually called for its unstoning effect */
        mon_consume_unstone(mtmp,otmp,(C.i8(0)),(C.i8(0)));
        return 2;
        case (0):
            return 0;
        /* i.e. an exploded wand */
        default:
            C.variadic(64,C.literal("%s wanted to perform action %d?"),C.Monnam(mtmp),C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_defense").value);
        break;
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function rnd_defensive_item(mtmp)
{
    let pm=C.field(mtmp,"monst","data").value;
    let difficulty=C.i32(C.field((C.mons+Number(((C.field((pm),"permonst","pmidx").value)))*C.sizes["struct permonst"]),"permonst","difficulty").value);
    let trycnt=0;
    if(Number(!!(Number(!!(Number(!!(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||C.i32(C.attacktype(pm,13))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_GHOST)))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_KOP)))) return 0;
    try_again: for(;;) {
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1232,(C.literal("rnd_defensive_item"))),C.rn2(C.i32((C.i32((C.i32((8+(Number(difficulty>3))))+(Number(difficulty>6))))+(Number(difficulty>8))))))):C.rn2(C.i32((C.i32((C.i32((8+(Number(difficulty>3))))+(Number(difficulty>6))))+(Number(difficulty>8)))))))) {
        case (6):
            case (9):
                if(Number(!!(C.i32(C.noteleport_level(mtmp))&&Number((trycnt=C.i32((trycnt+1)))<2)))) continue try_again;
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1237,(C.literal("rnd_defensive_item"))),C.rn2(3))):C.rn2(3)))))) return C.WAN_TELEPORTATION;
        ;
        /*FALLTHRU*/
        case (0):
            case (1):
                return C.SCR_TELEPORTATION;
        case (8):
            case (10):
                if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1246,(C.literal("rnd_defensive_item"))),C.rn2(3))):C.rn2(3)))))) return C.WAN_CREATE_MONSTER;
        ;
        /*FALLTHRU*/
        case (2):
            return C.SCR_CREATE_MONSTER;
        case (3):
            return C.POT_HEALING;
        case (4):
            return C.POT_EXTRA_HEALING;
        case (5):
            return ((Number(C.field(mtmp,"monst","data").value!=(C.mons+Number(C.PM_PESTILENCE)*C.sizes["struct permonst"])))?C.POT_FULL_HEALING:C.POT_SICKNESS);
        case (7):
            /* wand of digging */
            /* usually avoid digging in Sokoban */
            if(Number(!!(C.i32(C.field(C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","flags").address,"levelflags","sokoban_rules").value)&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1261,(C.literal("rnd_defensive_item"))),C.rn2(4))):C.rn2(4)))))) continue try_again;
        /* some creatures shouldn't dig down to another level when hurt */
        if(Number(!!(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_LIGHT))))||C.i32(C.field(mtmp,"monst","isshk").value)))||C.i32(C.field(mtmp,"monst","isgd").value)))||C.i32(C.field(mtmp,"monst","ispriest").value)))) return 0;
        return C.WAN_DIGGING;
    }
        break try_again;
    }
    /*NOTREACHED*/
    return 0;
}

/*#define MUSE_WAN_UNDEAD_TURNING 20*/
/* also a defensive item so don't
                                     * redefine; nonconsecutive value is ok */
export function linedup_chk_corpse(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    return C.i8((Number(C.sobj_at(C.CORPSE,x,y)!=0)));
}

export function m_use_undead_turning(mtmp,obj)
{
    let ax=C.i16(C.i32((C.i32(C.field(C.u,"you","ux").value)+C.i32((C.sgn(C.i32((C.i32(C.field(mtmp,"monst","mux").value)-C.i32(C.field(mtmp,"monst","mx").value))))*3))))); let ay=C.i16(C.i32((C.i32(C.field(C.u,"you","uy").value)+C.i32((C.sgn(C.i32((C.i32(C.field(mtmp,"monst","muy").value)-C.i32(C.field(mtmp,"monst","my").value))))*3)))));
    let bx=C.field(mtmp,"monst","mx").value; let by=C.field(mtmp,"monst","my").value;
    if(Number(!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_UNDEAD_TURNING)&&Number(C.i32(C.field(obj,"obj","spe").value)>0))))))) return;
    /* not necrophiliac(); unlike deciding whether to pick this
       type of wand up, we aren't interested in corpses within
       carried containers until they're moved into open inventory;
       we don't check whether hero is poly'd into an undead--the
       wand's turning effect is too weak to be a useful direct
       attack--only whether hero is carrying at least one corpse */
    if(Number(!!(C.carrying(C.CORPSE)||C.i32(C.linedup_callback(ax,ay,bx,by,C.functionPointer("linedup_chk_corpse")))))) {
        /*
         * If hero is carrying one or more corpses but isn't wielding
         * a cockatrice corpse (unless being hit by one won't do
         * the monster much harm); otherwise we'd be using this wand
         * as a defensive item with higher priority.
         *
         * Might be cockatrice intended as a weapon (or being denied
         * to glove-wearing monsters for use as a weapon) or lizard
         * intended as a cure or lichen intended as veggy food or
         * sacrifice fodder being lugged to an altar.  Zapping with
         * this will deprive hero of one from each stack although
         * they might subsequently be recovered after killing again.
         * In the sacrifice fodder case, it could even be to the
         * player's advantage (fresher corpse if a new one gets
         * dropped; player might not choose to spend a wand charge
         * on that when/if hero acquires this wand).
         */
        /* or there's a corpse on the ground in a direct line from the
           monster to the hero, and up to 3 steps beyond. */
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
        (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=20);
    }
}

/* from monster's point of view, is hero behind a chokepoint? */
export function hero_behind_chokepoint(mtmp)
{
    const stackFrame=C.stackSave();
    try {
    let dx=C.i16(C.sgn(C.i32((C.i32(C.field(mtmp,"monst","mx").value)-C.i32(C.field(mtmp,"monst","mux").value)))));
    let dy=C.i16(C.sgn(C.i32((C.i32(C.field(mtmp,"monst","my").value)-C.i32(C.field(mtmp,"monst","muy").value)))));
    let x=C.i16(C.i32((C.i32(C.field(mtmp,"monst","mux").value)+C.i32(dx))));
    let y=C.i16(C.i32((C.i32(C.field(mtmp,"monst","muy").value)+C.i32(dy))));
    let dir=C.xytodir(C.i32(dx),C.i32(dy));
    let dir_l=(C.i32(((C.i32((((C.i32(((C.i32(((dir)+6)))%(C.i32((C.N_DIRS_Z-2)))))))+(C.i32((C.N_DIRS_Z-2))))))%(C.i32((C.N_DIRS_Z-2))))));
    let dir_r=(C.i32(((C.i32((((C.i32(((C.i32(((dir)+2)))%(C.i32((C.N_DIRS_Z-2)))))))+(C.i32((C.N_DIRS_Z-2))))))%(C.i32((C.N_DIRS_Z-2))))));
    let c1=C.stackAlloc(C.sizes["struct nhcoord"]); let c2=C.stackAlloc(C.sizes["struct nhcoord"]);
    C.dirtocoord(c1,dir_l);
    C.dirtocoord(c2,dir_r);
    ((C.field(c1,"nhcoord","x").value=C.i16(C.field(c1,"nhcoord","x").value+C.i32(x))),(C.field(c2,"nhcoord","x").value=C.i16(C.field(c2,"nhcoord","x").value+C.i32(x))));
    ((C.field(c1,"nhcoord","y").value=C.i16(C.field(c1,"nhcoord","y").value+C.i32(y))),(C.field(c2,"nhcoord","y").value=C.i16(C.field(c2,"nhcoord","y").value+C.i32(y))));
    if(Number(!!((Number(!!(Number(!(C.isok(C.field(c1,"nhcoord","x").value,C.field(c1,"nhcoord","y").value)))||Number(!(C.accessible(C.field(c1,"nhcoord","x").value,C.field(c1,"nhcoord","y").value))))))&&(Number(!!(Number(!(C.isok(C.field(c2,"nhcoord","x").value,C.field(c2,"nhcoord","y").value)))||Number(!(C.accessible(C.field(c2,"nhcoord","x").value,C.field(c2,"nhcoord","y").value))))))))) return (C.i8(1));
    return (C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

/* hostile monster has another hostile next to it */
export function mon_has_friends(mtmp)
{
    let dx; let dy;
    let mon2;
    if(Number(!!(C.i32(C.field(mtmp,"monst","mtame").value)||C.i32(C.field(mtmp,"monst","mpeaceful").value)))) return (C.i8(0));
    for((dx=C.i16(C.i32((-1))));Number(C.i32(dx)<=1);((dx=C.i16((dx+1)))-1)) for((dy=C.i16(C.i32((-1))));Number(C.i32(dy)<=1);((dy=C.i16((dy+1)))-1)) {
        let x=C.i16(C.i32((C.i32(C.field(mtmp,"monst","mx").value)+C.i32(dx))));
        let y=C.i16(C.i32((C.i32(C.field(mtmp,"monst","my").value)+C.i32(dy))));
        if(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(x,y)&&Number(((mon2=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)))&&Number(mon2!=mtmp)))&&Number(!(C.field(mon2,"monst","mtame").value))))&&Number(!(C.field(mon2,"monst","mpeaceful").value))))) return (C.i8(1));
    }

    return (C.i8(0));
}

/* does monster like object pile at x,y? */
export function mon_likes_objpile_at(mtmp,x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let i;
    let otmp;
    if(Number(!!(Number(!(C.isok(x,y)))||Number(!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value!=0))))))) return (C.i8(0));
    /* monster likes any of the top 3 items in the pile? */
    for(((i=0),(otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(x)*(8*21))+Number(y)*8),"struct obj *").value));Number(!!(otmp&&Number(i<3)));((i=C.i32((i+1)))-1)) {
        if(C.mon_would_take_item(mtmp,otmp)) return (C.i8(1));
        (otmp=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value);
    }
    /* pile is larger than 3 stacks? */
    if(Number(i>=3)) return (C.i8(1));
    return (C.i8(0));
}

/* Select an offensive item/action for a monster.  Returns TRUE iff one is
 * found.
 */
export function find_offensive(mtmp)
{
    let obj; let mtmp_helmet;
    let reflection_skip;
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=0);
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=0);
    if(Number(!!(Number(!!(Number(!!(C.i32(C.field(mtmp,"monst","mpeaceful").value)||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))))) return (C.i8(0));
    if(C.field(C.u,"you","uswallow").value) return (C.i8(0));
    if(C.in_your_sanctuary(mtmp,C.i16(0),C.i16(0))) return (C.i8(0));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.dmgtype(C.field(mtmp,"monst","data").value,27))&&Number(!(C.global("uwep").value))))&&Number(!(C.global("uarmu").value))))&&Number(!(C.global("uarm").value))))&&Number(!(C.global("uarmh").value))))&&Number(!(C.global("uarms").value))))&&Number(!(C.global("uarmg").value))))&&Number(!(C.global("uarmc").value))))&&Number(!(C.global("uarmf").value))))) return (C.i8(0));
    /* all offensive items require orthogonal or diagonal targeting */
    if(Number(!(C.lined_up(mtmp)))) return (C.i8(0));
    (reflection_skip=C.i8((Number(!!(Number((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_REFL)))))!=C.u64(0))||C.i32(C.monnear(mtmp,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value)))))));
    (mtmp_helmet=C.which_armor(mtmp,4n));
    /* this picks the last viable item rather than prioritizing choices */
    for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(Number(!(reflection_skip))) {
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==1)) continue;
            ;
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_DEATH)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_MAGR)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=1);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==2)) continue;
            ;
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_SLEEP)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(C.field(C.gm,"instance_globals_m","multi").value>=C.i64(0))))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_SLEEP)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=2);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==3)) continue;
            ;
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_FIRE)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_FIRE)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=3);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==13)) continue;
            ;
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FIRE_HORN)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&C.i32(C.can_blow(mtmp))))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_FIRE)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=13);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==4)) continue;
            ;
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_COLD)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_COLD)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=4);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==12)) continue;
            ;
            if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FROST_HORN)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&C.i32(C.can_blow(mtmp))))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_COLD)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=12);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==5)) continue;
            ;
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_LIGHTNING)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_ELEC)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=5);
            }
            if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==6)) continue;
            ;
            if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_MAGIC_MISSILE)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_MAGR)))))))))) {
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=6);
            }
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==20)) continue;
        ;
        m_use_undead_turning(mtmp,obj);
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==7)) continue;
        ;
        if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_STRIKING)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_MAGR)))))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=7);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==15)) continue;
        ;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_TELEPORTATION)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPORT_CONTROL)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.TELEPORT_CONTROL)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))&&(Number(!!(Number(!(C.noteleport_level(mtmp)))||Number(!(C.mon_knows_traps(mtmp,C.TELEP_TRAP))))))))&&(Number(!!(Number(!!(Number(!!(C.i32(C.onscary(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,mtmp))||(Number(!!(C.i32(hero_behind_chokepoint(mtmp))&&C.i32(mon_has_friends(mtmp)))))))||C.i32(mon_likes_objpile_at(mtmp,C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))||C.stairway_at(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value))))))) {
            /* don't give controlled hero a free teleport */
            /* same hack as MUSE_WAN_TELEPORTATION_SELF */
            /* do try to move hero to a more vulnerable spot */
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=15);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==9)) continue;
        ;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_PARALYSIS)&&Number(C.field(C.gm,"instance_globals_m","multi").value>=C.i64(0))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=9);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==10)) continue;
        ;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_BLINDNESS)&&Number(!(C.attacktype(C.field(mtmp,"monst","data").value,15)))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=10);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==11)) continue;
        ;
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_CONFUSION)) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=11);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==16)) continue;
        ;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_SLEEPING)&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_SLEEP)))))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=16);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==14)) continue;
        ;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_ACID)&&Number(!((C.u64((C.field((mtmp),"monst","seen_resistance").value&C.u64((C.M_SEEN_ACID)))))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=14);
        }
        /* we can safely put this scroll here since the locations that
         * are in a 1 square radius are a subset of the locations that
         * are in wand or throwing range (in other words, always lined_up())
         */
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==17)) continue;
        ;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_EARTH)&&(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.hard_helmet(mtmp_helmet))||C.i32(C.field(mtmp,"monst","mconf").value)))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(4n))))!=C.u64(0n)))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n)))))||(Number(C.i32(C.field((C.field(mtmp,"monst","data").value),"permonst","mlet").value)==C.S_GHOST))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(1048576n))))!=C.u64(0n)))))||Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1558,(C.literal("find_offensive"))),C.rn2(10))):C.rn2(10))))))))))&&Number(C.dist2(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value)<=2)))&&C.i32(C.field(mtmp,"monst","mcansee").value)))&&(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))&&Number(!(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_rogue_level").address))))))))))&&(Number(!!(Number(!((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32(C.field(C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_astral_level").address,"d_level","dnum").value)))))||((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_earth_level").address)))))))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=17);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==18)) continue;
        ;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.EXPENSIVE_CAMERA)&&(Number(!!((Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&Number(!(C.resists_blnd(C.field(C.gy,"instance_globals_y","youmonst").address))))))||(Number((C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value)==(C.mons+Number(C.PM_GREMLIN)*C.sizes["struct permonst"]))))))))&&Number(C.dist2(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value)<=2)))&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1571,(C.literal("find_offensive"))),C.rn2(6))):C.rn2(6)))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value=18);
        }
        /*
             * TODO?
             *  Could choose scroll if <mux,muy> (where attacker thinks
             *  hero is located) is ice and attacker either isn't also
             *  on ice or is able to fly/float/swim.
             */
        /* 0 */
    }
    return C.i8(Number(!(Number(!(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value)))));
}

export function mbhitm(mtmp,otmp)
{
    let tmp;
    let reveal_invis=(C.i8(0)); let learnit=(C.i8(0)); let hits_you=C.i8((Number(mtmp==C.field(C.gy,"instance_globals_y","youmonst").address)));
    if(Number(!!(Number(!(hits_you))&&Number(C.i32(C.field(otmp,"obj","otyp").value)!=C.WAN_UNDEAD_TURNING)))) {
        (C.field(mtmp,"monst","msleeping").value=C.u32(0));
        if(C.field(mtmp,"monst","m_ap_type").value) C.seemimic(mtmp);
    }
    switch(C.i32(C.field(otmp,"obj","otyp").value)) {
        case (C.WAN_STRIKING):
            (reveal_invis=(C.i8(1)));
        if(hits_you) {
            if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.ANTIMAGIC)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.ANTIMAGIC)*C.sizes["struct prop"]),"prop","extrinsic").value)))) {
                C.monstseesu(C.u64(C.M_SEEN_MAGR));
                /* monsters notice hero resisting */
                C.shieldeff(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value);
                ;
                C.variadic(65,C.literal("Boing!"));
                (learnit=(C.i8(1)));
            } else if(Number(!!(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1618,(C.literal("mbhitm"))),C.rnd(20))):C.rnd(20)))<C.i32((10+C.i32(C.field(C.u,"you","uac").value))))&&Number(!((Number(!!(C.field(C.gb,"instance_globals_b","buzzer").value&&Number(!(C.field(C.field(C.gb,"instance_globals_b","buzzer").value,"monst","mwandexp").value)))))))))) {
                C.monstunseesu(C.u64(C.M_SEEN_MAGR));
                /* mons see hero not resisting */
                C.variadic(66,C.literal("wand hits you!"));
                (tmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1622,(C.literal("mbhitm"))),C.d((2),(12)))):C.d((2),(12)))));
                if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_SPDAM)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALF_SPDAM)*C.sizes["struct prop"]),"prop","extrinsic").value)))) (tmp=C.i32(Math.trunc(((C.i32((tmp+1)))/2))));
                C.losehp(tmp,C.literal("wand"),C.i8(0));
                (learnit=(C.i8(1)));
            } else {
                C.variadic(67,C.literal("wand misses you."));
            }
            C.stop_occupation();
            C.nomul(0);
        } else if(C.resists_magm(mtmp)) {
            C.shieldeff(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
            ;
            C.variadic(68,C.literal("Boing!"));
            (learnit=(C.i8(1)));
        } else if(Number(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1637,(C.literal("mbhitm"))),C.rnd(20))):C.rnd(20)))<C.i32((10+C.find_mac(mtmp))))) {
            (tmp=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1638,(C.literal("mbhitm"))),C.d((2),(12)))):C.d((2),(12)))));
            C.hit(C.literal("wand"),mtmp,C.exclam(tmp));
            C.resist(mtmp,C.field(otmp,"obj","oclass").value,tmp,1);
            (learnit=(C.i8(1)));
        } else {
            C.miss(C.literal("wand"),mtmp);
        }
        /* need to see the wand being zapped and also the spot where the
           target is hit; don't have to see the target itself though */
        if(Number(!!(Number(!!(C.i32(learnit)&&C.i32(C.field(C.gz,"instance_globals_z","zap_oseen").value)))&&(Number(!!(C.i32(hits_you)||(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0)))))))) C.discover_object((C.WAN_STRIKING),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        break;
        case (C.WAN_TELEPORTATION):
            if(hits_you) {
                C.tele();
                if(C.field(C.gz,"instance_globals_z","zap_oseen").value) C.discover_object((C.WAN_TELEPORTATION),(C.i8(1)),(C.i8(1)),(C.i8(1)));
            } else {
                /* for consistency with zap.c, don't identify */
                if(Number(!!(C.i32(C.field(mtmp,"monst","ispriest").value)&&C.i32(C.cell(C.in_rooms(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.TEMPLE),"char").value)))) {
                    if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))) C.variadic(69,mtmp,C.literal("%s resists the magic!"),C.Monnam(mtmp));
                } else if(Number(!(C.tele_restrict(mtmp)))) C.rloc(mtmp,C.u32(2));
            }
        break;
        case (C.WAN_CANCELLATION):
            case (C.SPE_CANCELLATION):
                C.cancel_monst(mtmp,otmp,(C.i8(0)),(C.i8(1)),(C.i8(0)));
        break;
        case (C.WAN_UNDEAD_TURNING):
            if(hits_you) {
                C.unturn_you();
                (learnit=C.field(C.gz,"instance_globals_z","zap_oseen").value);
            } else {
                let wake=(C.i8(0));
                if(C.unturn_dead(mtmp)) (wake=(C.i8(1)));
                /* affects mtmp's invent, not mtmp */
                if(Number(!!((Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))||(Number(!!(Number(!!(Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))) {
                    (wake=(reveal_invis=(C.i8(1))));
                    /* context.bypasses=True: if resist() happens to be fatal,
                   make_corpse() will set obj->bypass on the new corpse
                   so that mbhito() will skip it instead of reviving it */
                    (C.field(C.field(C.svc,"instance_globals_saved_c","context").address,"context_info","bypasses").value=(C.i8(1)));
                    /* for make_corpse() */
                    C.resist(mtmp,C.i8(C.WAND_CLASS),((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1684,(C.literal("mbhitm"))),C.rnd(8))):C.rnd(8))),0);
                }
                if(wake) {
                    if(Number(!((Number(C.field((mtmp),"monst","mhp").value<1))))) C.wakeup(mtmp,(C.i8(0)));
                    (learnit=C.field(C.gz,"instance_globals_z","zap_oseen").value);
                }
            }
        if(learnit) C.discover_object((C.WAN_UNDEAD_TURNING),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        break;
        default:
            break;
    }
    if(Number(!!(Number(!!(Number(!!(C.i32(reveal_invis)&&Number(!((Number(C.field((mtmp),"monst","mhp").value<1))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))))&&Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))))) C.map_invisible(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
    return 0;
}

/* hit all objects at x,y with fhito function */
export function fhito_loc(obj,tx,ty,fhito)
{
    tx=C.i16(tx);
    ty=C.i16(ty);
    let otmp; let next_obj;
    let hitanything=0;
    if(Number(!!(Number(!(fhito))||Number(!((Number(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(tx)*(8*21))+Number(ty)*8),"struct obj *").value!=0))))))) return (C.i8(0));
    for((otmp=C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","objects").address+Number(tx)*(8*21))+Number(ty)*8),"struct obj *").value);otmp;(otmp=next_obj)) {
        (next_obj=C.field(C.field(otmp,"obj","v").address,"vptrs","v_nexthere").value);
        if(Number(!!(Number(!!(Number(C.i32(C.field(otmp,"obj","where").value)!=1)||Number(C.i32(C.field(otmp,"obj","ox").value)!=C.i32(tx))))||Number(C.i32(C.field(otmp,"obj","oy").value)!=C.i32(ty))))) continue;
        (hitanything=C.i32(hitanything+C.callProc((fhito),"int (struct obj *, struct obj *)",otmp,obj)));
    }
    return C.i8((hitanything?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* A modified bhit() for monsters.  Based on bhit() in zap.c.  Unlike
 * buzz(), bhit() doesn't take into account the possibility of a monster
 * zapping you, so we need a special function for it.  (Unless someone wants
 * to merge the two functions...)
 */
export function mbhit(mon,range,fhitm,fhito,obj)
{
    range=C.i32(range);
    const stackFrame=C.stackSave();
    try {
    /* monster shooting the wand */
    /* direction and range */
    /* must be non-Null */
    /* fns called when mon/obj hit */
    /* 2nd arg to fhitm/fhito */
    let mtmp;
    let ltyp;
    let ddx; let ddy; let otyp=C.i32(C.field(obj,"obj","otyp").value);
    (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.field(mon,"monst","mx").value);
    (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.field(mon,"monst","my").value);
    (ddx=C.sgn(C.i32((C.i32(C.field(mon,"monst","mux").value)-C.i32(C.field(mon,"monst","mx").value)))));
    (ddy=C.sgn(C.i32((C.i32(C.field(mon,"monst","muy").value)-C.i32(C.field(mon,"monst","my").value)))));
    while(Number(((range=C.i32((range-1)))+1)>0)) {
        let x; let y; let dbxAddress=C.stackAlloc(2); let dbyAddress=C.stackAlloc(2);
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value+ddx));
        (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value+ddy));
        (x=C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value);
        (y=C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
        if(Number(!(C.isok(x,y)))) {
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value-ddx));
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value-ddy));
            break;
        }
        if((Number(!!(Number(C.i32((C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value))==C.i32(C.field(C.u,"you","uy").value)))))) {
            C.callProc((fhitm),"int (struct monst *, struct obj *)",C.field(C.gy,"instance_globals_y","youmonst").address,obj);
            (range=C.i32(range-3));
        } else if(Number(((mtmp=(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(8*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"struct monst *").value)))!=0)) {
            if(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*8),"unsigned char *").value+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*1),"unsigned char").value)&2)))!=0))&&Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))))) C.map_invisible(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value);
            C.callProc((fhitm),"int (struct monst *, struct obj *)",mtmp,obj);
            (range=C.i32(range-3));
        }
        if(fhito_loc(obj,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,fhito)) ((range=C.i32((range-1)))+1);
        (ltyp=C.u8(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","typ").value));
        ((C.cell(dbxAddress,"short").value=x),(C.cell(dbyAddress,"short").value=y));
        if(Number(!!(Number(!!(Number(otyp==C.WAN_STRIKING)&&Number(C.i32(ltyp)!=C.DRAWBRIDGE_UP)))&&C.i32(C.find_drawbridge(dbxAddress,dbyAddress))))) {
            /* if levl[x][y].typ is DRAWBRIDGE_UP then the zap is passing
               over the moat in front of a closed drawbridge and doesn't
               hit any part of the bridge's mechanism (yet; it might be
               about to hit the closed portcullis on the next iteration) */
            /* this might kill mon and destroy obj but they'll remain
               accessible; (*fhitm)() and (*fhito)() use obj for zap type */
            C.destroy_drawbridge(C.cell(dbxAddress,"short").value,C.cell(dbyAddress,"short").value);
        } else if(Number(!!((Number(C.i32((ltyp))==C.DOOR))||Number(C.i32(ltyp)==C.SDOOR)))) {
            switch(otyp) {
                /* note: monsters don't use opening or locking magic
               at present, but keep these as placeholders */
                case (C.WAN_OPENING):
                    case (C.WAN_LOCKING):
                        case (C.WAN_STRIKING):
                            if(C.doorlock(obj,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)) {
                                if(C.field(C.gz,"instance_globals_z","zap_oseen").value) C.discover_object((otyp),(C.i8(1)),(C.i8(1)),(C.i8(1)));
                                /* if a shop door gets broken, add it to
                       the shk's fix list (no cost to player) */
                                if(Number(!!(Number(C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","flags").value)==1)&&C.i32(C.cell(C.in_rooms(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,C.SHOPBASE),"char").value)))) C.add_damage(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value,C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value,0n);
                            }
                break;
            }
        }
        if(Number(!!(Number(!((Number(C.i32((ltyp))>=C.POOL))))||(Number(!!((Number(C.i32((ltyp))==C.DOOR))&&(C.i32((C.i32(C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value)*(C.sizes["struct rm"]*21))+Number(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value)*C.sizes["struct rm"]),"rm","flags").value)&(C.i32((8|4)))))))))))) {
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","x").value-ddx));
            (C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value=C.i16(C.field(C.field(C.gb,"instance_globals_b","bhitpos").address,"nhcoord","y").value-ddy));
            break;
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function buzz_force_miss(type,nd,sx,sy,dx,dy)
{
    type=C.i32(type);
    nd=C.i32(nd);
    sx=C.i16(sx);
    sy=C.i16(sy);
    dx=C.i32(dx);
    dy=C.i32(dy);
    C.dobuzz(type,nd,sx,sy,dx,dy,(C.i8(1)),(C.i8(0)),(C.i8(1)));
}

/* Perform an offensive action for a monster.  Must be called immediately
 * after find_offensive().  Return values are same as use_defensive().
 */
export function use_offensive(mtmp)
{
    let i;
    let otmp=C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","offensive").value;
    let oseen;
    /* if a monster has never used an attack wand before, it takes them some
       time to get used to holding that much power, so the first shot always
       misses */
    let buzzfn=(C.i32(C.field(mtmp,"monst","mwandexp").value)?C.functionPointer("buzz"):C.functionPointer("buzz_force_miss"));
    /* offensive potions are not drunk, they're thrown */
    if(Number(!!(Number(C.i32(C.field(otmp,"obj","oclass").value)!=C.POTION_CLASS)&&Number(((i=precheck(mtmp,otmp)))!=0)))) return i;
    (oseen=C.i8(C.canseemon(mtmp)));
    switch(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value) {
        case (1):
            case (2):
                case (3):
                    case (4):
                        case (5):
                            case (6):
                                mzapwand(mtmp,otmp,(C.i8(0)));
        if(oseen) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
        (C.field(C.gc,"instance_globals_c","current_wand").value=otmp);
        (C.field(C.gb,"instance_globals_b","buzzer").value=mtmp);
        C.callProc(buzzfn,"void (*)(int, int, coordxy, coordxy, int, int)",(C.i32((C.i32((-30))-((C.i32((C.abs(C.i32((C.i32((C.field(otmp,"obj","otyp").value))-C.WAN_MAGIC_MISSILE)))%10))))))),((Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAN_MAGIC_MISSILE))?2:6),C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.sgn(C.i32((C.i32(C.field(mtmp,"monst","mux").value)-C.i32(C.field(mtmp,"monst","mx").value)))),C.sgn(C.i32((C.i32(C.field(mtmp,"monst","muy").value)-C.i32(C.field(mtmp,"monst","my").value)))));
        (C.field(C.gb,"instance_globals_b","buzzer").value=0);
        (C.field(C.gc,"instance_globals_c","current_wand").value=0);
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
        (C.field(mtmp,"monst","mwandexp").value=C.u32((C.i8(1))));
        return (((Number(C.field((mtmp),"monst","mhp").value<1)))?1:2);
        case (13):
            case (12):
                mplayhorn(mtmp,otmp,(C.i8(0)));
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
        (C.field(C.gb,"instance_globals_b","buzzer").value=mtmp);
        (C.field(C.gc,"instance_globals_c","current_wand").value=otmp);
        /* needed by zhitu() */
        C.callProc(buzzfn,"void (*)(int, int, coordxy, coordxy, int, int)",(C.i32((C.i32((-30))-((C.i32((C.abs(C.i32(((((Number(C.i32(C.field(otmp,"obj","otyp").value)==C.FROST_HORN))?3:2))-1)))%10))))))),(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1870,(C.literal("use_offensive"))),C.rn2(6))):C.rn2(6)))+(6)))),C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.sgn(C.i32((C.i32(C.field(mtmp,"monst","mux").value)-C.i32(C.field(mtmp,"monst","mx").value)))),C.sgn(C.i32((C.i32(C.field(mtmp,"monst","muy").value)-C.i32(C.field(mtmp,"monst","my").value)))));
        (C.field(C.gb,"instance_globals_b","buzzer").value=0);
        (C.field(C.gc,"instance_globals_c","current_wand").value=0);
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
        (C.field(mtmp,"monst","mwandexp").value=C.u32((C.i8(1))));
        return (((Number(C.field((mtmp),"monst","mhp").value<1)))?1:2);
        case (15):
            case (20):
                case (7):
                    (C.field(C.gz,"instance_globals_z","zap_oseen").value=oseen);
        mzapwand(mtmp,otmp,(C.i8(0)));
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
        (C.field(C.gb,"instance_globals_b","buzzer").value=mtmp);
        mbhit(mtmp,(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1884,(C.literal("use_offensive"))),C.rn2(8))):C.rn2(8)))+(6)))),C.functionPointer("mbhitm"),C.functionPointer("bhito"),otmp);
        (C.field(C.gb,"instance_globals_b","buzzer").value=0);
        /* note: 'otmp' might have been destroyed (drawbridge destruction) */
        (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value==7)) (C.field(mtmp,"monst","mwandexp").value=C.u32((C.i8(1))));
        return 2;
        case (17):
{
                /* TODO: handle steeds */
                let x; let y;
                /* don't use monster fields after killing it */
                let confused=C.i8(((C.i32(C.field(mtmp,"monst","mconf").value)?C.i32((C.i8(1))):C.i32((C.i8(0))))));
                let mmx=C.i32(C.field(mtmp,"monst","mx").value); let mmy=C.i32(C.field(mtmp,"monst","my").value);
                let is_cursed=C.i8(C.field(otmp,"obj","cursed").value); let is_blessed=C.i8(C.field(otmp,"obj","blessed").value);
                mreadmsg(mtmp,otmp);
                /* Identify the scroll */
                if((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))) {
                    C.variadic(70,C.literal("%s rumbles %s %s!"),C.ceiling(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value),(C.i32(C.field(otmp,"obj","blessed").value)?C.literal("around"):C.literal("above")),C.mon_nam(mtmp));
                    if(oseen) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
                } else if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))) {
                    C.variadic(71,C.literal("%s rumbles in the middle of nowhere!"),C.ceiling(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
                    if(C.field(mtmp,"monst","minvis").value) C.map_invisible(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
                    if(oseen) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
                }
                /* could be fatal to monster, so use up the scroll before
           there's a chance that monster's inventory will be dropped */
                C.m_useup(mtmp,otmp);
                /* Loop through the surrounding squares */
                for((x=C.i16(C.i32((mmx-1))));Number(C.i32(x)<=C.i32((mmx+1)));((x=C.i16((x+1)))-1)) {
                    for((y=C.i16(C.i32((mmy-1))));Number(C.i32(y)<=C.i32((mmy+1)));((y=C.i16((y+1)))-1)) {
                        /* Is this a suitable spot? */
                        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.isok(x,y)&&Number(!(C.closed_door(x,y)))))&&Number(!((Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))<C.POOL))))))&&Number(!((Number(!!(Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.AIR)||Number(C.i32((C.field(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","locations").address+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","typ").value))==C.CLOUD))))))))&&(((Number(!!((Number(C.i32(x)==mmx))&&(Number(C.i32(y)==mmy)))))?Number(!(is_blessed)):Number(!(is_cursed))))))&&(Number(!!(Number(C.i32(x)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(y)!=C.i32(C.field(C.u,"you","uy").value)))))))) {
                            C.drop_boulder_on_monster(x,y,confused,(C.i8(0)));
                        }
                    }
                }
                /* Attack the player */
                if(Number(!!(Number(C.distmin(C.i16(mmx),C.i16(mmy),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)==1)&&Number(!(is_cursed))))) {
                    C.drop_boulder_on_player(confused,C.i8(Number(!(is_cursed))),(C.i8(0)),(C.i8(1)));
                }
                return (((Number(C.field((mtmp),"monst","mhp").value<1)))?1:2);
            }        /* case MUSE_SCR_EARTH */
        case (18):
{
                if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) {
                    ;
                    C.variadic(72,C.literal("Say cheese!"));
                } else if(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))) {
                    C.variadic(73,C.literal("%s takes a picture of you with %s!"),C.Monnam(mtmp),C.an(C.xname(otmp)));
                }
                (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(1)));
                if(Number(!!(Number(!((Number(!!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","extrinsic").value)))&&Number(!(C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","blocked").value)))))))&&Number(!(C.resists_blnd(C.field(C.gy,"instance_globals_y","youmonst").address)))))) {
                    C.variadic(74,C.literal("are blinded by the flash of light!"));
                    C.make_blinded(C.i64(((C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.BLINDED)*C.sizes["struct prop"]),"prop","intrinsic").value&16777215n)))+C.i64(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),1949,(C.literal("use_offensive"))),C.rnd(C.i32((1+50))))):C.rnd(C.i32((1+50)))))))),(C.i8(0)));
                }
                C.lightdamage(otmp,(C.i8(1)),5);
                (C.field(C.gm,"instance_globals_m","m_using").value=(C.i8(0)));
                ((C.field(otmp,"obj","spe").value=C.i8((C.field(otmp,"obj","spe").value-1)))+1);
                return 1;
            }        /* case MUSE_CAMERA */
        /* 0 */
        case (9):
            case (10):
                case (11):
                    case (16):
                        case (14):
                            /* Note: this setting of dknown doesn't suffice.  A monster
         * which is out of sight might throw and it hits something _in_
         * sight, a problem not existing with wands because wand rays
         * are not objects.  Also set dknown in mthrowu.c.
         */
                            if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))) {
                                C.observe_object(otmp);
                                C.variadic(75,mtmp,C.literal("%s hurls %s!"),C.Monnam(mtmp),C.singular(otmp,C.functionPointer("doname")));
                            }
        C.m_throw(mtmp,C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.i16(C.sgn(C.i32((C.i32(C.field(mtmp,"monst","mux").value)-C.i32(C.field(mtmp,"monst","mx").value))))),C.i16(C.sgn(C.i32((C.i32(C.field(mtmp,"monst","muy").value)-C.i32(C.field(mtmp,"monst","my").value))))),C.distmin(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value),otmp);
        return 2;
        case (0):
            return 0;
        /* i.e. an exploded wand */
        default:
            C.variadic(76,C.literal("%s wanted to perform action %d?"),C.Monnam(mtmp),C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_offense").value);
        break;
    }
    return 0;
}

export function rnd_offensive_item(mtmp)
{
    let pm=C.field(mtmp,"monst","data").value;
    let difficulty=C.i32(C.field((C.mons+Number(((C.field((pm),"permonst","pmidx").value)))*C.sizes["struct permonst"]),"permonst","difficulty").value);
    if(Number(!!(Number(!!(Number(!!(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||C.i32(C.attacktype(pm,13))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_GHOST)))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_KOP)))) return 0;
    if(Number(!!(Number(difficulty>7)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2043,(C.literal("rnd_offensive_item"))),C.rn2(35))):C.rn2(35)))))))) return C.WAN_DEATH;
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2045,(C.literal("rnd_offensive_item"))),C.rn2(C.i32((C.i32((9-(Number(difficulty<4))))+C.i32((4*(Number(difficulty>6))))))))):C.rn2(C.i32((C.i32((9-(Number(difficulty<4))))+C.i32((4*(Number(difficulty>6)))))))))) {
        case (0):
{
                let mtmp_helmet=C.which_armor(mtmp,4n);
                if(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.hard_helmet(mtmp_helmet))||(Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(4n))))!=C.u64(0n)))))||(Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n)))))||(Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_GHOST))))||(Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(1048576n))))!=C.u64(0n)))))) return C.SCR_EARTH;
            }        ;
        /* FALLTHRU */
        case (1):
            return C.WAN_STRIKING;
        case (2):
            return C.POT_ACID;
        case (3):
            return C.POT_CONFUSION;
        case (4):
            return C.POT_BLINDNESS;
        case (5):
            return C.POT_SLEEPING;
        case (6):
            return C.POT_PARALYSIS;
        case (7):
            case (8):
                return C.WAN_MAGIC_MISSILE;
        case (9):
            return C.WAN_SLEEP;
        case (10):
            return C.WAN_FIRE;
        case (11):
            return C.WAN_COLD;
        case (12):
            return C.WAN_LIGHTNING;
    }
    /*NOTREACHED*/
    return 0;
}

export function find_misc(mtmp)
{
    let obj;
    let mdat=C.field(mtmp,"monst","data").value;
    let x=C.field(mtmp,"monst","mx").value; let y=C.field(mtmp,"monst","my").value;
    let t;
    let xx; let yy;
    let pmidx=C.NON_PM;
    let immobile=C.i8((Number(C.i32(C.field(mdat,"permonst","mmove").value)==0)));
    let stuck=C.i8((Number(mtmp==C.field(C.u,"you","ustuck").value)));
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=0);
    (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=0);
    if(Number(!!((Number((C.u64((C.field((mdat),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||(Number((C.u64((C.field((mdat),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))) return C.i8(0);
    if(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&C.i32(stuck)))) return (C.i8(0));
    /* We arbitrarily limit to times when a player is nearby for the
     * same reason as Junior Pac-Man doesn't have energizers eaten until
     * you can see them...
     */
    if(Number(C.dist2(x,y,C.field(mtmp,"monst","mux").value,C.field(mtmp,"monst","muy").value)>36)) return (C.i8(0));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!(stuck))&&Number(!(immobile))))&&Number(!(C.field(mtmp,"monst","mtrapped").value))))&&(Number(C.i32(C.field(mtmp,"monst","cham").value)==C.NON_PM))))&&Number(C.i32(C.field((C.mons+Number(((pmidx=C.i32((C.field((mdat),"permonst","pmidx").value)))))*C.sizes["struct permonst"]),"permonst","difficulty").value)<6)))) {
        let ignore_boulders=C.i8((Number(!!(Number(!!((Number(C.i32(C.field((mdat),"permonst","msize").value)<1))||(Number((C.u64((C.field((mdat),"permonst","mflags2").value&C.u64(134217728n))))!=C.u64(0n)))))||(Number((C.u64((C.field((mdat),"permonst","mflags1").value&C.u64(8n))))!=C.u64(0n))))))); let diag_ok=C.i8(Number(!((Number((pmidx)==C.PM_GRID_BUG)))));
        for((xx=C.i16(C.i32((C.i32(x)-1))));Number(C.i32(xx)<=C.i32((C.i32(x)+1)));((xx=C.i16((xx+1)))-1)) for((yy=C.i16(C.i32((C.i32(y)-1))));Number(C.i32(yy)<=C.i32((C.i32(y)+1)));((yy=C.i16((yy+1)))-1)) if(Number(!!(Number(!!(Number(!!(C.isok(xx,yy)&&Number(!((Number(!!(Number(C.i32((xx))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((yy))==C.i32(C.field(C.u,"you","uy").value)))))))))&&(Number(!!(Number(!!(C.i32(diag_ok)||Number(C.i32(xx)==C.i32(x))))||Number(C.i32(yy)==C.i32(y)))))))&&(Number(!!((Number(!!(Number(C.i32(xx)==C.i32(x))&&Number(C.i32(yy)==C.i32(y)))))||Number(!(C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(xx)*(8*21))+Number(yy)*8),"struct monst *").value)))))))) if(Number(!!(Number(!!(Number(((t=C.t_at(xx,yy)))!=0)&&(Number(!!(C.i32(ignore_boulders)||Number(!(C.sobj_at(C.BOULDER,xx,yy))))))))&&Number(!(C.onscary(xx,yy,mtmp)))))) {
            /* use trap if it's the correct type and will
                           polymorph the monster */
            if(Number(!!(Number(C.i32(C.field(t,"trap","ttyp").value)==C.POLY_TRAP)&&Number(!(C.wearing_iron_shoes(mtmp)))))) {
                (C.field(C.gt,"instance_globals_t","trapx").value=xx);
                (C.field(C.gt,"instance_globals_t","trapy").value=yy);
                (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=4);
                return (C.i8(1));
            }
        }


    }
    if((Number((C.u64((C.field((mdat),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))) return C.i8(0);
    /* normally we would want to bracket a macro expansion containing
       'if' without matching 'else' with 'do { ... } while (0)' but we
       can't do that here because it would intercept 'continue' */
    /*
     * [bug?]  Choice of item is not prioritized; the last viable one
     * in the monster's inventory will be chosen.
     * 'nomore()' is nearly worthless because it only screens checking
     * of duplicates when there is no alternate type in between them.
     *
     * MUSE_BAG issues:
     * should allow looting floor container instead of needing the
     * monster to have picked it up and now be carrying it which takes
     * extra time and renders heavily filled containers immune;
     * hero should have a chance to see the monster fail to open a
     * locked container instead of monster always knowing lock state
     * (may not be feasible to implement--requires too much per-object
     * info for each monster);
     * monster with key should be able to unlock a locked floor
     * container and not know whether it is trapped.
     */
    for((obj=C.field(mtmp,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        /* Monsters shouldn't recognize cursed items; this kludge is
           necessary to prevent serious problems though... */
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_GAIN_LEVEL)&&(Number(!!(Number(!(C.field(obj,"obj","cursed").value))||(Number(!!(Number(!!(Number(!(C.field(mtmp,"monst","isgd").value))&&Number(!(C.field(mtmp,"monst","isshk").value))))&&Number(!(C.field(mtmp,"monst","ispriest").value))))))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=1);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(8))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.BULLWHIP)&&Number(!(C.field(mtmp,"monst","mpeaceful").value))))&&C.global("uwep").value))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2182,(C.literal("find_misc"))),C.rn2(5))):C.rn2(5)))))))&&Number(obj==(C.field((mtmp),"monst","mw").value))))&&(Number(!!(Number(C.i32((C.field(mtmp,"monst","mux").value))==C.i32(C.field(C.u,"you","ux").value))&&Number(C.i32((C.field(mtmp,"monst","muy").value))==C.i32(C.field(C.u,"you","uy").value)))))))&&(Number(C.dist2((C.field((mtmp),"monst","mx").value),(C.field((mtmp),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value)<=2))))&&Number(!(C.field(C.u,"you","uswallow").value))))&&(Number(!!(C.i32(C.canletgo(C.global("uwep").value,C.literal("")))||(Number(!!(C.i32(C.field(C.u,"you","twoweap").value)&&C.i32(C.canletgo(C.global("uswapwep").value,C.literal("")))))))))))) {
            /* the random test prevents whip-wielding
               monster from attempting disarm every turn */
            /* hero's location must be known and adjacent */
            /* don't bother if it can't work (this doesn't
               prevent cursed weapons from being targeted) */
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=8);
        }
        /* Note: peaceful/tame monsters won't make themselves
         * invisible unless you can see them.  Not really right, but...
         */
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(2))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_MAKE_INVISIBLE)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(!(C.field(mtmp,"monst","minvis").value))))&&Number(!(C.field(mtmp,"monst","invis_blkd").value))))&&(Number(!!(Number(!(C.field(mtmp,"monst","mpeaceful").value))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))&&(Number(!!(Number(!(C.attacktype(C.field(mtmp,"monst","data").value,15)))||C.i32(C.field(mtmp,"monst","mcan").value))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=2);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(3))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_INVISIBILITY)&&Number(!(C.field(mtmp,"monst","minvis").value))))&&Number(!(C.field(mtmp,"monst","invis_blkd").value))))&&(Number(!!(Number(!(C.field(mtmp,"monst","mpeaceful").value))||(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))&&(Number(!!(Number(!(C.attacktype(C.field(mtmp,"monst","data").value,15)))||C.i32(C.field(mtmp,"monst","mcan").value))))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=3);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(7))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_SPEED_MONSTER)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&Number(C.i32(C.field(mtmp,"monst","mspeed").value)!=2)))&&Number(!(C.field(mtmp,"monst","isgd").value))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=7);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(6))) continue;
        if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_SPEED)&&Number(C.i32(C.field(mtmp,"monst","mspeed").value)!=2)))&&Number(!(C.field(mtmp,"monst","isgd").value))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=6);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(5))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_POLYMORPH)&&Number(C.i32(C.field(obj,"obj","spe").value)>0)))&&(Number(C.i32(C.field(mtmp,"monst","cham").value)==C.NON_PM))))&&Number(C.i32(C.field((C.mons+Number((C.field((mdat),"permonst","pmidx").value))*C.sizes["struct permonst"]),"permonst","difficulty").value)<6)))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=5);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(9))) continue;
        if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_POLYMORPH)&&(Number(C.i32(C.field(mtmp,"monst","cham").value)==C.NON_PM))))&&Number(C.i32(C.field((C.mons+Number((C.field((mdat),"permonst","pmidx").value))*C.sizes["struct permonst"]),"permonst","difficulty").value)<6)))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=9);
        }
        if(Number(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value==(10))) continue;
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))&&Number(C.i32(C.field(obj,"obj","otyp").value)!=C.BAG_OF_TRICKS)))&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2235,(C.literal("find_misc"))),C.rn2(5))):C.rn2(5)))))))&&Number(!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","spe").value)==1))))))))&&Number(!(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value))))&&(Number(C.field((obj),"obj","cobj").value!=0))))&&Number(!(C.field(obj,"obj","olocked").value))))&&Number(!(C.field(obj,"obj","otrapped").value))))) {
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value=obj);
            (C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value=10);
        }
    }
    return C.i8(Number(!(Number(!(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value)))));
}

/* type of monster to polymorph into; defaults to one suitable for the
   current level rather than the totally arbitrary choice of newcham() */
export function muse_newcham_mon(mon)
{
    let m_armr;
    if(Number(((m_armr=C.which_armor(mon,1n)))!=0)) {
        if((Number(!!(Number(C.i32(C.field((m_armr),"obj","otyp").value)>=C.GRAY_DRAGON_SCALES)&&Number(C.i32(C.field((m_armr),"obj","otyp").value)<=C.YELLOW_DRAGON_SCALES))))) return (C.mons+Number(C.i32((C.i32((C.PM_GRAY_DRAGON+C.i32(C.field((m_armr),"obj","otyp").value)))-C.GRAY_DRAGON_SCALES)))*C.sizes["struct permonst"]);
 else if((Number(!!(Number(C.i32(C.field((m_armr),"obj","otyp").value)>=C.GRAY_DRAGON_SCALE_MAIL)&&Number(C.i32(C.field((m_armr),"obj","otyp").value)<=C.YELLOW_DRAGON_SCALE_MAIL))))) return (C.mons+Number(C.i32((C.i32((C.PM_GRAY_DRAGON+C.i32(C.field((m_armr),"obj","otyp").value)))-C.GRAY_DRAGON_SCALE_MAIL)))*C.sizes["struct permonst"]);
    }
    return C.rndmonst();
}

export function mloot_container(mon,container,vismon)
{
    vismon=C.i8(vismon);
    const stackFrame=C.stackSave();
    try {
    let contnr_nam=C.stackAlloc((1*256)); let mpronounbuf=C.stackAlloc((1*20));
    let nearby;
    let takeout_indx; let takeout_count; let howfar; let res=0;
    if(Number(!!(Number(!!(Number(!(container))||Number(!((Number(C.field((container),"obj","cobj").value!=0))))))||C.i32(C.field(container,"obj","olocked").value)))) return res;
    /* 0 */
    /* FIXME: handle cursed bag of holding */
    if(Number(!!((Number(!!(Number(C.i32(C.field((container),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((container),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(C.field(container,"obj","cursed").value)))) return res;
    /* 0 */
    if((Number(!!(Number(C.i32(C.field((container),"obj","otyp").value)==C.LARGE_BOX)&&Number(C.i32(C.field((container),"obj","spe").value)==1))))) return res;
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2281,(C.literal("mloot_container"))),C.rn2(10))):C.rn2(10)))) {
        default:
            /* case 0, 1, 2, 3: */
            (takeout_count=1);
        break;
        case (4):
            case (5):
                case (6):
                    (takeout_count=2);
        break;
        case (7):
            case (8):
                (takeout_count=3);
        break;
        case (9):
            (takeout_count=4);
        break;
    }
    (howfar=C.dist2((C.field((mon),"monst","mx").value),(C.field((mon),"monst","my").value),C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
    (nearby=C.i8((Number(howfar<=C.i32((7*7))))));
    (C.cell((contnr_nam+Number(0)*1),"char").value=(C.cell((mpronounbuf+Number(0)*1),"char").value=C.i8(0)));
    if(vismon) {
        /* do this once so that when hallucinating it won't change
           from one item to the next */
        C.strcpy(mpronounbuf,(C.field((C.genders+Number(C.pronoun_gender(mon,C.u32(2)))*C.sizes["struct Gender"]),"Gender","he").value));
    }
    for((takeout_indx=0);Number(takeout_indx<takeout_count);(takeout_indx=C.i32((takeout_indx+1)))) {
        let xobj;
        let nitems;
        if(Number(!((Number(C.field((container),"obj","cobj").value!=0))))) break;
        /* might have removed all items */
        /* TODO?
         *  Monster ought to prioritize on something it wants to use.
         */
        (nitems=0);
        for((xobj=C.field(container,"obj","cobj").value);Number(xobj!=0);(xobj=C.field(xobj,"obj","nobj").value)) (nitems=C.i32((nitems+1)));

        /* nitems is always greater than 0 due to Has_contents() check;
           throttle item removal as the container becomes less filled */
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2318,(C.literal("mloot_container"))),C.rn2(C.i32((nitems+1))))):C.rn2(C.i32((nitems+1)))))))) break;
        (nitems=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2320,(C.literal("mloot_container"))),C.rn2(nitems))):C.rn2(nitems))));
        for((xobj=C.field(container,"obj","cobj").value);Number(xobj!=0);(xobj=C.field(xobj,"obj","nobj").value)) if(Number((nitems=C.i32((nitems-1)))<0)) break;

        ((Number(!!((Number(xobj!=(0)))||((C.__assert_fail(C.literal("xobj != NULL"),C.literal("muse.c"),2324,(C.literal("mloot_container"))),0))))));
        (C.field(container,"obj","cknown").value=C.u32(0));
        /* hero no longer knows container's contents
                                * even if [attempted] removal is observed */
        if(Number(!(C.cell(contnr_nam,"char").value))) {
            /* xname sets dknown, distant_name might depending on its own
               idea about nearness */
            C.strcpy(contnr_nam,C.an((C.i32(nearby)?C.xname(container):C.distant_name(container,C.functionPointer("xname")))));
        }
        /* this was originally just 'can_carry(mon, xobj)' which
           covers objects a monster shouldn't pick up but also
           checks carrying capacity; for that, it ended up counting
           xobj's weight twice when container is carried; so take
           xobj out, check whether it can be carried, and then put
           it back (below) if it can't be */
        C.obj_extract_self(xobj);
        /* this reduces container's weight */
        /* check whether mon can handle xobj and whether weight of xobj plus
           minvent (including container, now without xobj) can be carried */
        if(C.can_carry(mon,xobj)) {
            if(vismon) {
                if(Number(howfar>2)) C.variadic(77,C.literal("%s rummages through %s."),C.Monnam(mon),contnr_nam);
 else if(Number(takeout_indx==0)) C.variadic(78,mon,C.literal("%s removes %s from %s."),C.Monnam(mon),C.doname(xobj),contnr_nam);
 else C.variadic(79,C.literal("%s removes %s."),C.upstart(mpronounbuf),C.doname(xobj));
                /* not adjacent */
                /* adjacent, first item */
                /* adjacent, additional items */
            }
            if(Number(C.i32(C.field(container,"obj","otyp").value)==C.ICE_BOX)) C.removed_from_icebox(xobj);
            /* resume rotting for corpse */
            /* obj_extract_self(xobj); -- already done above */
            C.mpickobj(mon,xobj);
            (res=2);
        } else {
            /* couldn't carry xobj separately so put back inside */
            /* an achievement prize (castle's wand?) might already be
               marked nomerge (when it hasn't been in invent yet) */
            let already_nomerge=C.i8(Number(C.i32(C.field(xobj,"obj","nomerge").value)!=0)); let just_xobj=C.i8(Number(!((Number(C.field((container),"obj","cobj").value!=0)))));
            /* this doesn't restore the original contents ordering
               [shouldn't be a problem; even though this item didn't
               give the rummage message, that's what mon was doing] */
            (C.field(xobj,"obj","nomerge").value=C.u32(1));
            (xobj=C.add_to_container(container,xobj));
            if(Number(!(already_nomerge))) (C.field(xobj,"obj","nomerge").value=C.u32(0));
            (C.field(container,"obj","owt").value=C.u32(C.weight(container)));
            if(just_xobj) break;
            /* out of takeout_count loop */
        }
        /* can_carry */
    }
    /* takeout_count */
    return res;
    } finally {C.stackRestore(stackFrame); }
}

export function use_misc(mtmp)
{
    const stackFrame=C.stackSave();
    try {
    const MissingMiscellaneousItem=C.staticArray("use_misc","MissingMiscellaneousItem","use_misc: no %s");
    let nambuf=C.stackAlloc((1*256));
    let vis; let vismon; let vistrapspot; let oseen;
    let i;
    let t;
    let otmp=C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","misc").value;
    if(Number(((i=precheck(mtmp,otmp)))!=0)) return i;
    (vis=C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mtmp,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mtmp,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))));
    (vismon=C.i8(C.canseemon(mtmp)));
    (oseen=C.i8(Number(!!(otmp&&C.i32(vismon)))));
    switch(C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value) {
        case (1):
            if(Number(!(otmp))) C.variadic(80,MissingMiscellaneousItem,C.literal("potion of gain level"));
        mquaffmsg(mtmp,otmp);
        if(C.field(otmp,"obj","cursed").value) {
            skipmsg: {
                if(C.Can_rise_up(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,C.field(C.u,"you","uz").address)) {
                    let tolev=C.i32((C.i32(C.depth(C.field(C.u,"you","uz").address))-1));
                    let tolevel=C.stackAlloc(C.sizes["struct d_level"]);
                    C.get_level(tolevel,tolev);
                    /* insurance against future changes... */
                    if(C.on_level(tolevel,C.field(C.u,"you","uz").address)) break skipmsg;
                    if(vismon) {
                        C.variadic(81,mtmp,C.literal("%s rises up, through the %s!"),C.Monnam(mtmp),C.ceiling(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value));
                        C.trycall(otmp);
                    }
                    C.m_useup(mtmp,otmp);
                    C.migrate_to_level(mtmp,C.ledger_no(tolevel),C.i16(0),0);
                    return 2;
                }
            }
{
                if(vismon) {
                    C.variadic(82,mtmp,C.literal("%s looks uneasy."),C.Monnam(mtmp));
                    C.trycall(otmp);
                }
                C.m_useup(mtmp,otmp);
                return 2;
            }        }
        if(vismon) C.variadic(83,mtmp,C.literal("%s seems more experienced."),C.Monnam(mtmp));
        if(oseen) C.discover_object((C.POT_GAIN_LEVEL),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        C.m_useup(mtmp,otmp);
        if(Number(!(C.grow_up(mtmp,0)))) return 1;
        /* grew into genocided monster */
        return 2;
        case (2):
            case (3):
                if(Number(!(otmp))) C.variadic(84,MissingMiscellaneousItem,C.literal("potion of invisibility"));
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.WAN_MAKE_INVISIBLE)) {
            mzapwand(mtmp,otmp,(C.i8(1)));
        } else mquaffmsg(mtmp,otmp);
        /* format monster's name before altering its visibility */
        C.strcpy(nambuf,C.mon_nam(mtmp));
        C.mon_set_minvis(mtmp,C.i8((Number(!(C.field(otmp,"obj","cursed").value))?C.i32((C.i8(0))):C.i32((C.i8(1))))));
        if(Number(!!(C.i32(vismon)&&C.i32(C.field(mtmp,"monst","minvis").value)))) {
            /* was seen, now invisible */
            if((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))) {
                C.variadic(85,C.literal("%s body takes on a %s transparency."),C.upstart(C.s_suffix(nambuf)),((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?C.literal("normal"):C.literal("strange")));
            } else {
                C.variadic(86,C.literal("Suddenly you cannot see %s."),nambuf);
                if(vis) C.map_invisible(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
            }
            if(oseen) C.discover_object(C.i32((C.field(otmp,"obj","otyp").value)),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        } else if(Number(!!(C.i32(vismon)&&Number(!(C.field(mtmp,"monst","minvis").value))))) {
            /* cursed potion; mon tried to make itself invisible but failed */
            C.variadic(87,C.literal("%s briefly seems to be transparent."),C.Monnam(mtmp));
            /* we could call map_invisible() before the pline(), then
               newsym() after; unseen monster glyph would be visible during
               the pline, but hero would forget any remembered object under
               the monster */
        } else if(Number(!!(Number(!(vismon))&&C.canseemon(mtmp)))) {
            /* cursed potion; this won't happen because a monster will only
               drink a potion of invisibility when not already invisible */
            C.variadic(88,C.literal("%s suddenly appears!"),C.Monnam(mtmp));
        }
        if(Number(C.i32(C.field(otmp,"obj","otyp").value)==C.POT_INVISIBILITY)) {
            if(C.field(otmp,"obj","cursed").value) you_aggravate(mtmp);
            C.m_useup(mtmp,otmp);
        }
        return 2;
        case (7):
            if(Number(!(otmp))) C.variadic(89,MissingMiscellaneousItem,C.literal("wand of speed monster"));
        mzapwand(mtmp,otmp,(C.i8(1)));
        C.mon_adjust_speed(mtmp,1,otmp);
        return 2;
        case (6):
            if(Number(!(otmp))) C.variadic(90,MissingMiscellaneousItem,C.literal("potion of speed"));
        mquaffmsg(mtmp,otmp);
        /* note difference in potion effect due to substantially
           different methods of maintaining speed ratings:
           player's character becomes "very fast" temporarily;
           monster becomes "one stage faster" permanently */
        C.mon_adjust_speed(mtmp,1,otmp);
        C.m_useup(mtmp,otmp);
        return 2;
        case (5):
            if(Number(!(otmp))) C.variadic(91,MissingMiscellaneousItem,C.literal("wand of polymorph"));
        mzapwand(mtmp,otmp,(C.i8(1)));
        C.newcham(mtmp,muse_newcham_mon(mtmp),C.u32((2|1)));
        if(oseen) C.discover_object((C.WAN_POLYMORPH),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        return 2;
        case (9):
            if(Number(!(otmp))) C.variadic(92,MissingMiscellaneousItem,C.literal("potion of polymorph"));
        mquaffmsg(mtmp,otmp);
        C.m_useup(mtmp,otmp);
        if(vismon) C.variadic(93,mtmp,C.literal("%s suddenly mutates!"),C.Monnam(mtmp));
        C.newcham(mtmp,muse_newcham_mon(mtmp),1);
        if(oseen) C.discover_object((C.POT_POLYMORPH),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        return 2;
        case (4):
            (t=C.t_at(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value));
        (vistrapspot=C.i8((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(t,"trap","ty").value)*8),"unsigned char *").value+Number(C.field(t,"trap","tx").value)*1),"unsigned char").value)&2)))!=0))));
        if(Number(!!(C.i32(vis)||C.i32(vistrapspot)))) C.seetrap(t);
        if(Number(!!(C.i32(vismon)||C.i32(vistrapspot)))) {
            C.variadic(94,mtmp,C.literal("%s deliberately %s onto a %s!"),C.Some_Monnam(mtmp),C.vtense(C.cell((C.field(C.c_common_strings,"c_common_strings","c_fakename").address+Number(0)*8),"char *").value,C.locomotion(C.field(mtmp,"monst","data").value,C.literal("jump"))),(C.i32(C.field(t,"trap","tseen").value)?C.trapname(C.i32(C.field(t,"trap","ttyp").value),(C.i8(0))):C.literal("hidden trap")));
            /* note: if mtmp is unseen because it is invisible, its new
               shape will also be invisible and could produce "Its armor
               falls off" messages during the transformation; those make
               more sense after we've given "Someone jumps onto a trap." */
        }
        /*  don't use rloc() due to worms */
        (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(mtmp,"monst","mx").value)*(8*21))+Number(C.field(mtmp,"monst","my").value)*8),"struct monst *").value=0);
        C.newsym(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
        C.place_monster(mtmp,C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        C.maybe_unhide_at(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        if(C.field(mtmp,"monst","wormno").value) C.worm_move(mtmp);
        C.newsym(C.field(C.gt,"instance_globals_t","trapx").value,C.field(C.gt,"instance_globals_t","trapy").value);
        C.newcham(mtmp,0,1);
        return 2;
        case (10):
            if(Number(!(otmp))) C.variadic(95,MissingMiscellaneousItem,C.literal("container"));
        return mloot_container(mtmp,otmp,vismon);
        case (8):
            /* attempt to disarm hero */
{
                let The_whip=(C.i32(vismon)?C.literal("The bullwhip"):C.literal("A whip"));
                let where_to=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2553,(C.literal("use_misc"))),C.rn2(4))):C.rn2(4)));
                let obj=C.global("uwep").value;
                let hand;
                let the_weapon=C.stackAlloc((1*256)); let hand_buf=C.stackAlloc((1*256));
                if(Number(!!(Number(!!(Number(!(obj))||Number(!(C.canletgo(obj,C.literal(""))))))||(Number(!!(Number(!!(C.i32(C.field(C.u,"you","twoweap").value)&&C.i32(C.canletgo(C.global("uswapwep").value,C.literal("")))))&&((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2559,(C.literal("use_misc"))),C.rn2(2))):C.rn2(2))))))))) (obj=C.global("uswapwep").value);
                if(Number(!(obj))) break;
                /* shouldn't happen after find_misc() */
                C.strcpy(the_weapon,C.the(C.xname(obj)));
                (hand=C.body_part(C.HAND));
                if((Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)||Number(C.i32(C.field(obj,"obj","oclass").value)==C.TOOL_CLASS))))&&C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_big").value))))) (hand=C.makeplural(hand));
                C.strncpy(hand_buf,hand,C.u64((BigInt((1*256))-C.u64(1))));
                (C.cell((hand_buf+Number(C.u64((BigInt((1*256))-C.u64(1))))*1),"char").value=C.i8(0));
                if(vismon) C.variadic(96,mtmp,C.literal("%s flicks a bullwhip towards your %s!"),C.Monnam(mtmp),hand_buf);
                if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.HEAVY_IRON_BALL)) {
                    C.variadic(97,C.literal("%s fails to wrap around %s."),The_whip,the_weapon);
                    return 1;
                }
                C.variadic(98,C.literal("%s wraps around %s you're wielding!"),The_whip,the_weapon);
                if(C.welded(obj)) {
                    C.variadic(99,C.literal("%s welded to your %s%c"),(Number(!((Number(!!(Number(C.field((obj),"obj","quan").value!=1n)||(Number(!!(Number(C.i32(C.field((obj),"obj","oartifact").value)==C.ART_EYES_OF_THE_OVERWORLD)&&Number(!(C.undiscovered_artifact(C.i16(C.ART_EYES_OF_THE_OVERWORLD))))))))))))?C.literal("It is"):C.literal("They are")),hand_buf,(Number(!(C.field(obj,"obj","bknown").value))?33:46));
                    /* obj->bknown = 1; */
                    /* welded() takes care of this */
                    (where_to=0);
                }
                if(Number(!(where_to))) {
                    C.variadic(100,C.literal("whip slips free."));
                    /* not `The_whip' */
                    return 1;
                } else if(Number(!!(Number(!!(Number(where_to==3)&&C.i32(C.mon_hates_silver(mtmp))))&&Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_material").value)==C.SILVER)))) {
                    /* this monster won't want to catch a silver
                   weapon; drop it at hero's feet instead */
                    (where_to=2);
                }
                C.remove_worn_item(obj,(C.i8(0)));
                C.freeinv(obj);
                switch(where_to) {
                    case (1):
                        /* onto floor beneath mon */
                        C.variadic(101,mtmp,C.literal("%s yanks %s from your %s!"),C.Monnam(mtmp),the_weapon,hand_buf);
                    C.place_object(obj,C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
                    break;
                    case (2):
                        /* onto floor beneath you */
                        C.variadic(102,mtmp,C.literal("%s yanks %s to the %s!"),C.Monnam(mtmp),the_weapon,C.surface(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value));
                    C.dropy(obj);
                    break;
                    case (3):
                        /* into mon's inventory */
                        C.variadic(103,mtmp,C.literal("%s snatches %s!"),C.Monnam(mtmp),the_weapon);
                    C.mpickobj(mtmp,obj);
                    break;
                }
                return 1;
            }        /*NOTREACHED*/
        return 0;
        case (0):
            return 0;
        /* i.e. an exploded wand */
        default:
            C.variadic(104,C.literal("%s wanted to perform action %d?"),C.Monnam(mtmp),C.field(C.field(C.gm,"instance_globals_m","m").address,"musable","has_misc").value);
        break;
    }
    return 0;
    } finally {C.stackRestore(stackFrame); }
}

export function you_aggravate(mtmp)
{
    C.variadic(105,C.literal("For some reason, %s presence is known to you."),C.s_suffix(C.noit_mon_nam(mtmp)));
    C.cls();
    C.callProc((C.field(C.windowprocs,"window_procs","win_cliparound").value),"void (int, int)",C.i32(C.field(mtmp,"monst","mx").value),C.i32(C.field(mtmp,"monst","my").value));
    C.show_glyph(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value,(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((mtmp),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((mtmp),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
    C.show_glyph(C.field(C.u,"you","ux").value,C.field(C.u,"you","uy").value,(((Number(!!(C.field(C.u,"you","usteed").value&&C.mon_visible(C.field(C.u,"you","usteed").value))))?(C.i32(((((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))?(C.callProc((C.functionPointer("rn2_on_display_rng")),"int (int)",C.NUMMONS)):C.i32((C.field((C.field((C.field(C.u,"you","usteed").value),"monst","data").value),"permonst","pmidx").value))))+(((Number(C.i32(C.field((C.field(C.u,"you","usteed").value),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))||Number(!(C.field(C.flags,"flag","showrace").value)))))?C.field(C.u,"you","umonnum").value:C.i32(C.field(C.field(C.gu,"instance_globals_u","urace").address,"Race","mnum").value)))+(((Number((((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_vwall))+((C.i32(C.In_mines(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.field(C.u,"you","uz").address))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dlevel").value)||C.i32(C.field((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address),"d_level","dnum").value))))&&C.i32(C.on_level(C.field(C.u,"you","uz").address,C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_knox_level").address))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.field((C.field(C.u,"you","uz").address),"d_level","dnum").value)==C.i32((C.field(C.field(C.svd,"instance_globals_saved_d","dungeon_topology").address,"dgn_topology","d_sokoban_dnum").value))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","m_ap_type").value)&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","mappearance").value))+(((Number(((((((Number(C.field(C.u,"you","umonnum").value!=C.field(C.u,"you","umonster").value))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.field(C.flags,"flag","female").value)))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
    C.variadic(106,C.literal("aggravated at %s."),C.noit_mon_nam(mtmp));
    C.callProc((C.field(C.windowprocs,"window_procs","win_display_nhwindow").value),"void (winid, boolean)",C.global("WIN_MAP").value,(C.i8(1)));
    C.docrt();
    if(C.unconscious()) {
        (C.field(C.gm,"instance_globals_m","multi").value=C.i64(C.i32((-1))));
        (C.field(C.gn,"instance_globals_n","nomovemsg").value=C.literal("Aggravated, you are jolted into full consciousness."));
    }
    C.newsym(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
    if(Number(!((Number(!!(C.canseemon(mtmp)||C.sensemon(mtmp))))))) C.map_invisible(C.field(mtmp,"monst","mx").value,C.field(mtmp,"monst","my").value);
}

export function rnd_misc_item(mtmp)
{
    let pm=C.field(mtmp,"monst","data").value;
    let difficulty=C.i32(C.field((C.mons+Number(((C.field((pm),"permonst","pmidx").value)))*C.sizes["struct permonst"]),"permonst","difficulty").value);
    if(Number(!!(Number(!!(Number(!!(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||C.i32(C.attacktype(pm,13))))||(Number((C.u64((C.field((C.field(mtmp,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_GHOST)))||Number(C.i32(C.field(pm,"permonst","mlet").value)==C.S_KOP)))) return 0;
    /* Unlike other rnd_item functions, we only allow _weak_ monsters
     * to have this item; after all, the item will be used to strengthen
     * the monster and strong monsters won't use it at all...
     */
    if(Number(!!(Number(difficulty<6)&&Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2666,(C.literal("rnd_misc_item"))),C.rn2(30))):C.rn2(30)))))))) return (((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2667,(C.literal("rnd_misc_item"))),C.rn2(6))):C.rn2(6)))?C.POT_POLYMORPH:C.WAN_POLYMORPH);
    if(Number(!!(Number(!!(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2669,(C.literal("rnd_misc_item"))),C.rn2(40))):C.rn2(40)))))&&Number(!((Number(!!(Number(!!((Number((C.u64((C.field((pm),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))||Number((pm)==(C.mons+Number(C.PM_MANES)*C.sizes["struct permonst"]))))||(Number(!!((Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_GOLEM))||Number(C.i32(C.field((pm),"permonst","mlet").value)==C.S_VORTEX)))))))))))&&Number(!((Number(!!(Number(!!(Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mtmp),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))))) return C.AMULET_OF_LIFE_SAVING;
    switch(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2672,(C.literal("rnd_misc_item"))),C.rn2(3))):C.rn2(3)))) {
        case (0):
            if(C.field(mtmp,"monst","isgd").value) return 0;
        return (((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2676,(C.literal("rnd_misc_item"))),C.rn2(6))):C.rn2(6)))?C.POT_SPEED:C.WAN_SPEED_MONSTER);
        case (1):
            if(Number(!!(C.i32(C.field(mtmp,"monst","mpeaceful").value)&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.SEE_INVIS)*C.sizes["struct prop"]),"prop","extrinsic").value)))))))) return 0;
        return (((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2680,(C.literal("rnd_misc_item"))),C.rn2(6))):C.rn2(6)))?C.POT_INVISIBILITY:C.WAN_MAKE_INVISIBLE);
        case (2):
            return C.POT_GAIN_LEVEL;
    }
    /*NOTREACHED*/
    return 0;
}

/* check whether hero is carrying a corpse or contained petrifier corpse */
export function searches_for_item(mon,obj)
{
    let typ=C.i32(C.field(obj,"obj","otyp").value);
    /* don't let monsters interact with protected items on the floor */
    if(Number(!!(Number(!!(Number(C.i32(C.field(obj,"obj","where").value)==1)&&(Number(!!(Number(C.i32(C.field(obj,"obj","ox").value)==C.i32(C.field(mon,"monst","mx").value))&&Number(C.i32(C.field(obj,"obj","oy").value)==C.i32(C.field(mon,"monst","my").value)))))))&&C.i32(C.onscary(C.field(obj,"obj","ox").value,C.field(obj,"obj","oy").value,mon))))) {
        return (C.i8(0));
    }
    if(Number(!!(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))||(Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))||Number(C.field(mon,"monst","data").value==(C.mons+Number(C.PM_GHOST)*C.sizes["struct permonst"]))))) return (C.i8(0));
    /* don't loot bones piles */
    if(Number(!!(Number(typ==C.WAN_MAKE_INVISIBLE)||Number(typ==C.POT_INVISIBILITY)))) return C.i8((Number(!!(Number(!!(Number(!(C.field(mon,"monst","minvis").value))&&Number(!(C.field(mon,"monst","invis_blkd").value))))&&Number(!(C.attacktype(C.field(mon,"monst","data").value,15)))))));
    if(Number(!!(Number(typ==C.WAN_SPEED_MONSTER)||Number(typ==C.POT_SPEED)))) return C.i8((Number(C.i32(C.field(mon,"monst","mspeed").value)!=2)));
    switch(C.i32(C.field(obj,"obj","oclass").value)) {
        case (C.WAND_CLASS):
            if(Number(C.i32(C.field(obj,"obj","spe").value)<=0)) return (C.i8(0));
        if(Number(typ==C.WAN_DIGGING)) return C.i8(Number(!((Number(!!(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT)))))));
        if(Number(typ==C.WAN_POLYMORPH)) return C.i8((Number(C.i32(C.field((C.mons+Number((C.field((C.field(mon,"monst","data").value),"permonst","pmidx").value))*C.sizes["struct permonst"]),"permonst","difficulty").value)<6)));
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.i32(C.field((C.objects+Number(typ)*C.sizes["struct objclass"]),"objclass","oc_dir").value)==3)||Number(typ==C.WAN_STRIKING)))||Number(typ==C.WAN_UNDEAD_TURNING)))||Number(typ==C.WAN_TELEPORTATION)))||Number(typ==C.WAN_CREATE_MONSTER)))) return (C.i8(1));
        break;
        case (C.POTION_CLASS):
            if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(typ==C.POT_HEALING)||Number(typ==C.POT_EXTRA_HEALING)))||Number(typ==C.POT_FULL_HEALING)))||Number(typ==C.POT_POLYMORPH)))||Number(typ==C.POT_GAIN_LEVEL)))||Number(typ==C.POT_PARALYSIS)))||Number(typ==C.POT_SLEEPING)))||Number(typ==C.POT_ACID)))||Number(typ==C.POT_CONFUSION)))) return (C.i8(1));
        if(Number(!!(Number(typ==C.POT_BLINDNESS)&&Number(!(C.attacktype(C.field(mon,"monst","data").value,15)))))) return (C.i8(1));
        break;
        case (C.SCROLL_CLASS):
            if(Number(!!(Number(!!(Number(!!(Number(typ==C.SCR_TELEPORTATION)||Number(typ==C.SCR_CREATE_MONSTER)))||Number(typ==C.SCR_EARTH)))||Number(typ==C.SCR_FIRE)))) return (C.i8(1));
        break;
        case (C.AMULET_CLASS):
            if(Number(typ==C.AMULET_OF_LIFE_SAVING)) return C.i8(Number(!((Number(!!((Number(!!(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_MANES)*C.sizes["struct permonst"]))))||(Number(!!((Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_GOLEM))||Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_VORTEX)))))))||(Number(!!(Number(!!(Number(C.i32(C.field((mon),"monst","cham").value)==C.PM_VAMPIRE)||Number(C.i32(C.field((mon),"monst","cham").value)==C.PM_VAMPIRE_LEADER)))||Number(C.i32(C.field((mon),"monst","cham").value)==C.PM_VLAD_THE_IMPALER))))))))));
        if(Number(!!(Number(typ==C.AMULET_OF_REFLECTION)||Number(typ==C.AMULET_OF_GUARDING)))) return (C.i8(1));
        break;
        case (C.TOOL_CLASS):
            if(Number(typ==C.PICK_AXE)) return C.i8((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(64n))))!=C.u64(0n))));
        if(Number(typ==C.UNICORN_HORN)) return C.i8((Number(!!(Number(!!(Number(!(C.field(obj,"obj","cursed").value))&&Number(!((Number(!!(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_UNICORN)&&(Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(536870912n))))!=C.u64(0n))))))))))&&Number(C.field(mon,"monst","data").value!=(C.mons+Number(C.PM_KI_RIN)*C.sizes["struct permonst"]))))));
        if(Number(!!(Number(typ==C.FROST_HORN)||Number(typ==C.FIRE_HORN)))) return C.i8((Number(!!(Number(C.i32(C.field(obj,"obj","spe").value)>0)&&C.i32(C.can_blow(mon))))));
        if(Number(!!(Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)>=C.LARGE_BOX)&&Number(C.i32(C.field((obj),"obj","otyp").value)<=C.BAG_OF_TRICKS))))&&Number(!((Number(!!((Number(!!(Number(C.i32(C.field((obj),"obj","otyp").value)==C.BAG_OF_HOLDING)||Number(C.i32(C.field((obj),"obj","otyp").value)==C.BAG_OF_TRICKS))))&&C.i32(C.field(obj,"obj","cursed").value))))))))&&Number(!(C.field(obj,"obj","olocked").value))))) return (C.i8(1));
        if(Number(typ==C.EXPENSIVE_CAMERA)) return C.i8((Number(C.i32(C.field(obj,"obj","spe").value)>0)));
        break;
        case (C.FOOD_CLASS):
            if(Number(typ==C.CORPSE)) return C.i8((Number(!!((Number(!!(Number((C.i64((C.field(mon,"monst","misc_worn_check").value&16n)))!=0n)&&(Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"]))))))))||(Number(!!(Number(!(C.Resists_Elem(mon,C.STONE_RES)))&&C.i32(cures_stoning(mon,obj,(C.i8(0)))))))))));
        if(Number(typ==C.TIN)) return C.i8((Number(!!(C.i32(mcould_eat_tin(mon))&&(Number(!!(Number(!(C.Resists_Elem(mon,C.STONE_RES)))&&C.i32(cures_stoning(mon,obj,(C.i8(1)))))))))));
        if(Number(!!(Number(typ==C.EGG)&&(Number(!!(Number((C.field(obj,"obj","corpsenm").value)>=C.LOW_PM)&&Number((C.field(obj,"obj","corpsenm").value)<C.NUMMONS))))))) return C.i8((Number(!!(Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_COCKATRICE)*C.sizes["struct permonst"]))||Number(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"]))==(C.mons+Number(C.PM_CHICKATRICE)*C.sizes["struct permonst"]))))));
        break;
        default:
            break;
    }
    return (C.i8(0));
}

export function mon_reflects(mon,str)
{
    let orefl=C.which_armor(mon,8n);
    if(Number(!!(orefl&&Number(C.i32(C.field(orefl,"obj","otyp").value)==C.SHIELD_OF_REFLECTION)))) {
        if(str) {
            C.variadic(107,str,C.s_suffix(C.mon_nam(mon)),C.literal("shield"));
            C.discover_object((C.SHIELD_OF_REFLECTION),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        }
        return (C.i8(1));
    } else if(C.arti_reflects((C.field((mon),"monst","mw").value))) {
        /* due to wielded artifact weapon */
        if(str) C.variadic(108,str,C.s_suffix(C.mon_nam(mon)),C.literal("weapon"));
        return (C.i8(1));
    } else if(Number(!!(((orefl=C.which_armor(mon,65536n)))&&Number(C.i32(C.field(orefl,"obj","otyp").value)==C.AMULET_OF_REFLECTION)))) {
        if(str) {
            C.variadic(109,str,C.s_suffix(C.mon_nam(mon)),C.literal("amulet"));
            C.discover_object((C.AMULET_OF_REFLECTION),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        }
        return (C.i8(1));
    } else if(Number(!!(((orefl=C.which_armor(mon,1n)))&&(Number(!!(Number(C.i32(C.field(orefl,"obj","otyp").value)==C.SILVER_DRAGON_SCALES)||Number(C.i32(C.field(orefl,"obj","otyp").value)==C.SILVER_DRAGON_SCALE_MAIL))))))) {
        if(str) C.variadic(110,str,C.s_suffix(C.mon_nam(mon)),C.literal("armor"));
        return (C.i8(1));
    } else if(Number(!!(Number(C.field(mon,"monst","data").value==(C.mons+Number(C.PM_SILVER_DRAGON)*C.sizes["struct permonst"]))||Number(C.field(mon,"monst","data").value==(C.mons+Number(C.PM_CHROMATIC_DRAGON)*C.sizes["struct permonst"]))))) {
        /* Silver dragons only reflect when mature; babies do not */
        if(str) C.variadic(111,str,C.s_suffix(C.mon_nam(mon)),C.literal("scales"));
        return (C.i8(1));
    }
    return (C.i8(0));
}

export function ureflects(fmt,str)
{
    /* Check from outermost to innermost objects */
    if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&8n))) {
        if(Number(!!(fmt&&str))) {
            C.variadic(112,fmt,str,C.literal("shield"));
            C.discover_object((C.SHIELD_OF_REFLECTION),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        }
        return (C.i8(1));
    } else if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&256n))) {
        /* Due to wielded artifact weapon */
        if(Number(!!(fmt&&str))) C.variadic(113,fmt,str,C.literal("weapon"));
        return (C.i8(1));
    } else if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&65536n))) {
        if(Number(!!(fmt&&str))) {
            C.variadic(114,fmt,str,C.literal("medallion"));
            C.discover_object((C.AMULET_OF_REFLECTION),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        }
        return (C.i8(1));
    } else if(C.i64((C.field((C.field(C.u,"you","uprops").address+Number(C.REFLECTING)*C.sizes["struct prop"]),"prop","extrinsic").value&1n))) {
        if(Number(!!(fmt&&str))) C.variadic(115,fmt,str,(C.global("uskin").value?C.literal("luster"):C.literal("armor")));
        return (C.i8(1));
    } else if(Number(C.field(C.field(C.gy,"instance_globals_y","youmonst").address,"monst","data").value==(C.mons+Number(C.PM_SILVER_DRAGON)*C.sizes["struct permonst"]))) {
        if(Number(!!(fmt&&str))) C.variadic(116,fmt,str,C.literal("scales"));
        return (C.i8(1));
    }
    return (C.i8(0));
}

/* cure mon's blindness (use_defensive, dog_eat, meatobj) */
export function mcureblindness(mon,verbos)
{
    verbos=C.i8(verbos);
    if(Number(!(C.field(mon,"monst","mcansee").value))) {
        (C.field(mon,"monst","mcansee").value=C.u32(1));
        (C.field(mon,"monst","mblinded").value=C.u32(0));
        if(Number(!!(C.i32(verbos)&&(Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))))) C.variadic(117,mon,C.literal("%s can see again."),C.Monnam(mon));
    }
}

/* TRUE if the monster ate something */
export function munstone(mon,by_you)
{
    by_you=C.i8(by_you);
    let obj;
    let tinok;
    if(C.Resists_Elem(mon,C.STONE_RES)) return (C.i8(0));
    if(Number(!!(C.field(mon,"monst","meating").value||(Number(!!(C.i32(C.field((mon),"monst","msleeping").value)||Number(!(C.field((mon),"monst","mcanmove").value)))))))) return (C.i8(0));
    (C.field(mon,"monst","mstrategy").value=C.u64(C.field(mon,"monst","mstrategy").value&C.u64(C.i64((~536870912n)))));
    (tinok=mcould_eat_tin(mon));
    for((obj=C.field(mon,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        if(cures_stoning(mon,obj,tinok)) {
            mon_consume_unstone(mon,obj,by_you,(C.i8(1)));
            return (C.i8(1));
        }
    }
    return (C.i8(0));
}

export function mon_consume_unstone(mon,obj,by_you,stoning)
{
    by_you=C.i8(by_you);
    stoning=C.i8(stoning);
    /* T: stop petrification, F: cure stun && confusion */
    let vis=C.i8(C.canseemon(mon)); let tinned=C.i8(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN)); let food=C.i8(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.CORPSE)||C.i32(tinned)))); let acid=C.i8(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_ACID)||(Number(!!(C.i32(food)&&(Number((C.u64((C.field(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mflags1").value&C.u64(134217728n))))!=C.u64(0n))))))))); let lizard=C.i8(Number(!!(C.i32(food)&&Number(C.field(obj,"obj","corpsenm").value==C.PM_LIZARD))));
    let nutrit=(C.i32(food)?C.dog_nutrition(mon,obj):0);
    /* also sets meating */
    /* give a "<mon> is slowing down" message and also remove
       intrinsic speed (comparable to similar effect on the hero) */
    if(stoning) C.mon_adjust_speed(mon,C.i32((-3)),0);
    if(vis) {
        let save_quan=C.field(obj,"obj","quan").value;
        (C.field(obj,"obj","quan").value=1n);
        C.variadic(118,mon,C.literal("%s %s %s."),C.Monnam(mon),(((Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS))?C.literal("quaffs"):((Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN))?C.literal("opens and eats the contents of"):C.literal("eats")))),C.distant_name(obj,C.functionPointer("doname")));
        (C.field(obj,"obj","quan").value=save_quan);
    } else if(Number(!((Number(!!(Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.DEAF)*C.sizes["struct prop"]),"prop","extrinsic").value))||C.i32(C.field(C.field(C.u,"you","uroleplay").address,"u_roleplay","deaf").value))))))) C.variadic(119,C.literal("%s."),((Number(C.i32(C.field(obj,"obj","oclass").value)==C.POTION_CLASS))?C.literal("drinking"):C.literal("chewing")));
    C.m_useup(mon,obj);
    /* obj is now gone */
    if(Number(!!(Number(!!(C.i32(acid)&&Number(!(tinned))))&&Number(!(C.Resists_Elem(mon,C.ACID_RES)))))) {
        (C.field(mon,"monst","mhp").value=C.i32(C.field(mon,"monst","mhp").value-((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),2942,(C.literal("mon_consume_unstone"))),C.rnd(15))):C.rnd(15)))));
        if(vis) C.variadic(120,mon,C.literal("%s has a very bad case of stomach acid."),C.Monnam(mon));
        if((Number(C.field((mon),"monst","mhp").value<1))) {
            C.variadic(121,mon,C.literal("%s dies!"),C.Monnam(mon));
            if(by_you) C.xkilled(mon,C.i32((1|4)));
 else C.mondead(mon);
            /* hero gets credit (experience) and blame (possible loss
                   of alignment and/or luck and/or telepathy depending on
                   mon) for the kill but does not break pacifism conduct */
            return;
        }
    }
    if(Number(!!(C.i32(stoning)&&C.i32(vis)))) {
        if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) C.variadic(122,C.literal("What a pity - %s just ruined a future piece of art!"),C.mon_nam(mon));
 else C.variadic(123,mon,C.literal("%s seems limber!"),C.Monnam(mon));
    }
    if(Number(!!(C.i32(lizard)&&(Number(!!(C.i32(C.field(mon,"monst","mconf").value)||C.i32(C.field(mon,"monst","mstun").value))))))) {
        (C.field(mon,"monst","mconf").value=C.u32(0));
        (C.field(mon,"monst","mstun").value=C.u32(0));
        if(Number(!!(Number(!!(C.i32(vis)&&Number(!((Number(!!(Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_BAT)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_GIANT_BAT)*C.sizes["struct permonst"]))))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_VAMPIRE_BAT)*C.sizes["struct permonst"])))))))))&&Number(C.field(mon,"monst","data").value!=(C.mons+Number(C.PM_STALKER)*C.sizes["struct permonst"]))))) C.variadic(124,mon,C.literal("%s seems steadier now."),C.Monnam(mon));
    }
    if(Number(!!(Number(!!(C.i32(C.field(mon,"monst","mtame").value)&&Number(!(C.field(mon,"monst","isminion").value))))&&Number(nutrit>0)))) {
        let edog=(C.field(C.field((mon),"monst","mextra").value,"mextra","edog").value);
        if(Number(C.field(edog,"edog","hungrytime").value<C.field(C.svm,"instance_globals_saved_m","moves").value)) (C.field(edog,"edog","hungrytime").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
        (C.field(edog,"edog","hungrytime").value=C.i64(C.field(edog,"edog","hungrytime").value+C.i64(nutrit)));
        (C.field(mon,"monst","mconf").value=C.u32(0));
    }
    /* use up monster's next move */
    (C.field(mon,"monst","movement").value=C.i16(C.field(mon,"monst","movement").value-12));
    (C.field(mon,"monst","mlstmv").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
}

/* decide whether obj can cure petrification; also used when picking up */
export function cures_stoning(mon,obj,tinok)
{
    tinok=C.i8(tinok);
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_ACID)) return (C.i8(1));
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.GLOB_OF_GREEN_SLIME)) return C.i8((Number(!!(Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_GREEN_SLIME)*C.sizes["struct permonst"]))||(Number(!!(Number(!!(Number(!!(Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"]))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_SALAMANDER)*C.sizes["struct permonst"])))))))||(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_GHOST))))));
    if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.CORPSE)&&(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)!=C.TIN)||Number(!(tinok)))))))) return (C.i8(0));
    /* corpse, or tin that mon can open */
    if(Number(C.field(obj,"obj","corpsenm").value==C.NON_PM)) return (C.i8(0));
    /* empty/special tin */
    return C.i8((Number(!!(Number(C.field(obj,"obj","corpsenm").value==C.PM_LIZARD)||(Number((C.u64((C.field(((C.mons+Number(C.field(obj,"obj","corpsenm").value)*C.sizes["struct permonst"])),"permonst","mflags1").value&C.u64(134217728n))))!=C.u64(0n)))))));
}

export function mcould_eat_tin(mon)
{
    let obj; let mwep;
    let welded_wep;
    /* monkeys who manage to steal tins can't open and eat them
       even if they happen to also have the appropriate tool */
    if((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))) return (C.i8(0));
    (mwep=(C.field((mon),"monst","mw").value));
    (welded_wep=C.i8(Number(!!(mwep&&C.i32(C.mwelded(mwep))))));
    /* this is different from the player; tin opener or dagger doesn't
       have to be wielded, and knife can be used instead of dagger */
    for((obj=C.field(mon,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) {
        /* if stuck with a cursed weapon, don't check rest of inventory */
        if(Number(!!(C.i32(welded_wep)&&Number(obj!=mwep)))) continue;
        if(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.TIN_OPENER)||(Number(!!(Number(C.i32(C.field(obj,"obj","oclass").value)==C.WEAPON_CLASS)&&(Number(!!(Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_DAGGER)||Number(C.i32(C.field((C.objects+Number(C.field(obj,"obj","otyp").value)*C.sizes["struct objclass"]),"objclass","oc_subtyp").value)==C.P_KNIFE)))))))))) return (C.i8(1));
    }
    return (C.i8(0));
}

/* TRUE if monster does something to avoid turning into green slime */
export function munslime(mon,by_you)
{
    by_you=C.i8(by_you);
    const stackFrame=C.stackSave();
    try {
    let obj; let odummy=C.stackAlloc(C.sizes["struct obj"]);
    let mptr=C.field(mon,"monst","data").value;
    /*
     * muse_unslime() gives "mon starts turning green", "mon zaps
     * itself with a wand of fire", and "mon's slime burns away"
     * messages.  Monsters who don't get any chance at that just have
     * (via our caller) newcham()'s "mon turns into slime" feedback.
     */
    if((Number(!!(Number(!!(Number((mptr)==(C.mons+Number(C.PM_GREEN_SLIME)*C.sizes["struct permonst"]))||(Number(!!(Number(!!(Number(!!(Number((mptr)==(C.mons+Number(C.PM_FIRE_VORTEX)*C.sizes["struct permonst"]))||Number((mptr)==(C.mons+Number(C.PM_FLAMING_SPHERE)*C.sizes["struct permonst"]))))||Number((mptr)==(C.mons+Number(C.PM_FIRE_ELEMENTAL)*C.sizes["struct permonst"]))))||Number((mptr)==(C.mons+Number(C.PM_SALAMANDER)*C.sizes["struct permonst"])))))))||(Number(C.i32(C.field((mptr),"permonst","mlet").value)==C.S_GHOST)))))) return (C.i8(0));
    if(Number(!!(C.field(mon,"monst","meating").value||(Number(!!(C.i32(C.field((mon),"monst","msleeping").value)||Number(!(C.field((mon),"monst","mcanmove").value)))))))) return (C.i8(0));
    (C.field(mon,"monst","mstrategy").value=C.u64(C.field(mon,"monst","mstrategy").value&C.u64(C.i64((~536870912n)))));
    /* if monster can breathe fire, do so upon self; a monster who deals
       fire damage by biting, clawing, gazing, and especially exploding
       isn't able to cure itself of green slime with its own attack
       [possible extension: monst capable of casting high level clerical
       spells could toss pillar of fire at self--probably too suicidal] */
    if(Number(!!(Number(!!(Number(!(C.field(mon,"monst","mcan").value))&&Number(!(C.field(mon,"monst","mspec_used").value))))&&C.attacktype_fordmg(mptr,12,2)))) {
        C.copyRecord(odummy,C.field(C.cg,"const_globals","zeroobj").address,C.sizes["struct obj"]);
        /* otyp == STRANGE_OBJECT */
        return muse_unslime(mon,odummy,0,by_you);
    }
    /* same MUSE criteria as use_defensive() */
    if(Number(!!(Number(!((Number((C.u64((C.field((mptr),"permonst","mflags1").value&C.u64(262144n))))!=C.u64(0n)))))&&Number(!((Number((C.u64((C.field((mptr),"permonst","mflags1").value&C.u64(65536n))))!=C.u64(0n)))))))) {
        let t;
        for((obj=C.field(mon,"monst","minvent").value);obj;(obj=C.field(obj,"obj","nobj").value)) if(cures_sliming(mon,obj)) return muse_unslime(mon,obj,0,by_you);

        if(Number(!!(Number(!!((Number(!!(Number(((t=C.t_at(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value)))==0)||Number(C.i32(C.field(t,"trap","ttyp").value)!=C.FIRE_TRAP))))&&C.i32(C.field(mptr,"permonst","mmove").value)))&&Number(!(C.field(mon,"monst","mtrapped").value))))) {
            let xy=C.stackAlloc(((2*2)*8)); let x; let y; let idx; let ridx; let nxy=C.i16(0);
            for((x=C.i16(C.i32((C.i32(C.field(mon,"monst","mx").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.field(mon,"monst","mx").value)+1)));(x=C.i16((x+1)))) for((y=C.i16(C.i32((C.i32(C.field(mon,"monst","my").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.field(mon,"monst","my").value)+1)));(y=C.i16((y+1)))) if(Number(!!(Number(!!(Number(!!(C.isok(x,y)&&C.i32(C.accessible(x,y))))&&Number(!((C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))))&&(Number(!!(Number(C.i32(x)!=C.i32(C.field(C.u,"you","ux").value))||Number(C.i32(y)!=C.i32(C.field(C.u,"you","uy").value)))))))) {
                ((C.cell(((xy+Number(0)*(2*8))+Number(nxy)*2),"short").value=x),(C.cell(((xy+Number(1)*(2*8))+Number(nxy)*2),"short").value=y));
                (nxy=C.i16((nxy+1)));
            }


            for((idx=C.i16(0));Number(C.i32(idx)<C.i32(nxy));(idx=C.i16((idx+1)))) {
                (ridx=C.i16((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),3080,(C.literal("munslime"))),C.rn2(C.i32((C.i32(nxy)-C.i32(idx)))))):C.rn2(C.i32((C.i32(nxy)-C.i32(idx))))))+C.i32((idx)))))));
                if(Number(C.i32(ridx)!=C.i32(idx))) {
                    (x=C.cell(((xy+Number(0)*(2*8))+Number(idx)*2),"short").value);
                    (C.cell(((xy+Number(0)*(2*8))+Number(idx)*2),"short").value=C.cell(((xy+Number(0)*(2*8))+Number(ridx)*2),"short").value);
                    (C.cell(((xy+Number(0)*(2*8))+Number(ridx)*2),"short").value=x);
                    (y=C.cell(((xy+Number(1)*(2*8))+Number(idx)*2),"short").value);
                    (C.cell(((xy+Number(1)*(2*8))+Number(idx)*2),"short").value=C.cell(((xy+Number(1)*(2*8))+Number(ridx)*2),"short").value);
                    (C.cell(((xy+Number(1)*(2*8))+Number(ridx)*2),"short").value=y);
                }
                if(Number(!!(Number(((t=C.t_at(C.cell(((xy+Number(0)*(2*8))+Number(idx)*2),"short").value,C.cell(((xy+Number(1)*(2*8))+Number(idx)*2),"short").value)))!=0)&&Number(C.i32(C.field(t,"trap","ttyp").value)==C.FIRE_TRAP)))) break;
            }
        }
        if(Number(!!(t&&Number(C.i32(C.field(t,"trap","ttyp").value)==C.FIRE_TRAP)))) return muse_unslime(mon,C.hands_obj,t,by_you);
    }
    /* MUSE */
    return (C.i8(0));
    } finally {C.stackRestore(stackFrame); }
}

/* mon uses an item--selected by caller--to burn away incipient slime */
export function muse_unslime(mon,obj,trap,by_you)
{
    by_you=C.i8(by_you);
    const stackFrame=C.stackSave();
    try {
    /* true: if mon kills itself, hero gets credit/blame */
    /* [by_you not honored if 'mon' triggers fire trap]. */
    let odummypAddress=C.stackAlloc(8);
    let otyp=C.i32(C.field(obj,"obj","otyp").value); let dmg=0;
    let vis=C.i8(C.canseemon(mon)); let res=(C.i8(1));
    if(vis) C.variadic(125,mon,C.literal("%s starts turning %s."),C.Monnam(mon),(C.i32(green_mon(mon))?C.literal("into ooze"):C.hcolor(C.field(C.c_color_names,"c_color_names","c_green").value)));
    /* -4 => sliming, causes quiet loss of enhanced speed */
    C.mon_adjust_speed(mon,C.i32((-4)),0);
    if(trap) {
        let Mnam=(C.i32(vis)?C.Monnam(mon):0);
        if(Number(!!(Number(C.i32(C.field(mon,"monst","mx").value)==C.i32(C.field(trap,"trap","tx").value))&&Number(C.i32(C.field(mon,"monst","my").value)==C.i32(C.field(trap,"trap","ty").value))))) {
            if(vis) C.variadic(126,C.literal("%s triggers %s fire trap!"),Mnam,(C.i32(C.field(trap,"trap","tseen").value)?C.literal("the"):C.literal("a")));
        } else {
            (C.cell(((C.field(C.field(C.svl,"instance_globals_saved_l","level").address,"dlevel_t","monsters").address+Number(C.field(mon,"monst","mx").value)*(8*21))+Number(C.field(mon,"monst","my").value)*8),"struct monst *").value=0);
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
            C.place_monster(mon,C.field(trap,"trap","tx").value,C.field(trap,"trap","ty").value);
            if(C.field(mon,"monst","wormno").value) C.worm_move(mon);
            /* won't happen; worms don't MUSE to unslime */
            C.newsym(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value);
            if(vis) C.variadic(127,C.literal("%s %s %s %s fire trap!"),Mnam,C.vtense(C.cell((C.field(C.c_common_strings,"c_common_strings","c_fakename").address+Number(0)*8),"char *").value,C.locomotion(C.field(mon,"monst","data").value,C.literal("move"))),((Number(!!(Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_EYE)||Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_LIGHT))))?C.literal("over"):C.literal("onto")),(C.i32(C.field(trap,"trap","tseen").value)?C.literal("the"):C.literal("a")));
        }
        C.mintrap(mon,1);
    } else if(Number(otyp==C.STRANGE_OBJECT)) {
        /* monster is using fire breath on self */
        if(vis) C.variadic(128,mon,C.literal("%s."),C.monverbself(mon,C.Monnam(mon),C.literal("breath"),C.literal("fire on")));
        if(Number(!(((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),3146,(C.literal("muse_unslime"))),C.rn2(3))):C.rn2(3)))))) (C.field(mon,"monst","mspec_used").value=(C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),3147,(C.literal("muse_unslime"))),C.rn2(10))):C.rn2(10)))+(5)))));
        /* -21 => monster's fire breath; 1 => # of damage dice */
        (dmg=C.zhitm(mon,(C.i32(by_you)?21:C.i32((-21))),1,odummypAddress));
    } else if(Number(otyp==C.SCR_FIRE)) {
        mreadmsg(mon,obj);
        if(C.field(mon,"monst","mconf").value) {
            if((Number((C.i32((C.i32(C.cell((C.cell((C.field(C.gv,"instance_globals_v","viz_array").value+Number(C.field(mon,"monst","my").value)*8),"unsigned char *").value+Number(C.field(mon,"monst","mx").value)*1),"unsigned char").value)&2)))!=0))) C.variadic(129,C.literal("Oh, what a pretty fire!"));
            if(vis) C.trycall(obj);
            C.m_useup(mon,obj);
            /* after trycall() */
            (vis=(C.i8(0)));
            /* skip makeknown() below */
            (res=(C.i8(0)));
            /* failed to cure sliming */
        } else {
            (dmg=C.i32(Math.trunc(((C.i32((C.i32((2*(C.i32(((C.i32((((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),3161,(C.literal("muse_unslime"))),C.rn2(3))):C.rn2(3)))+(3))))+C.i32((2*C.bcsign(obj))))))))+1)))/3))));
            C.m_useup(mon,obj);
            /* before explode() */
            /* -11 => monster's fireball */
            C.explode(C.field(mon,"monst","mx").value,C.field(mon,"monst","my").value,C.i32((-11)),dmg,C.i8(C.SCROLL_CLASS),(C.i32(by_you)?C.i32((-C.EXPL_FIERY)):C.EXPL_FIERY));
            /* by_you: override -11 for mon but not others */
            (dmg=0);
            /* damage has been applied by explode() */
        }
    } else if(Number(otyp==C.POT_OIL)) {
        let Pronoun=C.stackAlloc((1*40));
        let was_lit=C.i8((C.i32(C.field(obj,"obj","lamplit").value)?C.i32((C.i8(1))):C.i32((C.i8(0))))); let saw_lit=(C.i8(0));
        /*
         * If not already lit, requires two actions.  We cheat and let
         * monster do both rather than render the potion unusable.
         *
         * Monsters don't start with oil and don't actively pick up oil
         * so this may never occur in a real game.  (Possible though;
         * nymph can steal potions of oil; shapechanger could take on
         * nymph form or vacuum up stuff as a gel.cube and then eventually
         * engage with a green slime.)
         */
        if(Number(C.field(obj,"obj","quan").value>1n)) (obj=C.splitobj(obj,1n));
        if(Number(!!(C.i32(vis)&&Number(!(was_lit))))) {
            C.variadic(130,mon,C.literal("%s ignites %s."),C.Monnam(mon),C.ansimpleoname(obj));
            (saw_lit=(C.i8(1)));
        }
        C.begin_burn(obj,was_lit);
        (vis=C.i8(vis|C.canseemon(mon)));
        /* burning potion may improve visibility */
        if(vis) {
            if(Number(!((Number(!!(Number(C.field(C.gm,"instance_globals_m","multi").value<C.i64(0))&&(Number(!!(C.i32(C.unconscious())||C.i32(C.is_fainted())))))))))) C.observe_object(obj);
            /* hero is watching mon drink obj */
            C.variadic(131,C.literal("%s quaffs a burning %s"),(C.i32(saw_lit)?C.upstart(C.strcpy(Pronoun,(C.field((C.genders+Number(C.pronoun_gender(mon,C.u32(2)))*C.sizes["struct Gender"]),"Gender","he").value))):C.Monnam(mon)),C.simpleonames(obj));
            C.discover_object((C.POT_OIL),(C.i8(1)),(C.i8(1)),(C.i8(1)));
        }
        (dmg=((C.i32(C.rng_log_enabled())?((C.rng_log_set_caller(C.literal("muse.c"),3199,(C.literal("muse_unslime"))),C.d((3),(4)))):C.d((3),(4)))));
        /* [**TEMP** (different from hero)] */
        C.m_useup(mon,obj);
    } else {
        /* wand/horn of fire w/ positive charge count */
        if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FIRE_HORN)) mplayhorn(mon,obj,(C.i8(1)));
 else mzapwand(mon,obj,(C.i8(1)));
        /* -1 => monster's wand of fire; 2 => # of damage dice */
        (dmg=C.zhitm(mon,(C.i32(by_you)?1:C.i32((-1))),2,odummypAddress));
    }
    if(dmg) {
        /* zhitm() applies damage but doesn't kill creature off;
           for fire breath, dmg is going to be 0 (fire breathers are
           immune to fire damage) but for wand of fire or fire horn,
           'mon' could have taken damage so might die */
        if((Number(C.field((mon),"monst","mhp").value<1))) {
            if(by_you) {
                /* mon killed self but hero gets credit and blame (except
                   for pacifist conduct); xkilled()'s message would say
                   "You killed/destroyed <mon>" so give our own message */
                if(vis) C.variadic(132,mon,C.literal("%s is %s by the fire!"),C.Monnam(mon),((Number(!!(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags2").value&C.u64(2n))))!=C.u64(0n)))||Number((C.field(mon,"monst","data").value)==(C.mons+Number(C.PM_MANES)*C.sizes["struct permonst"]))))||(Number(!!((Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_GOLEM))||Number(C.i32(C.field((C.field(mon,"monst","data").value),"permonst","mlet").value)==C.S_VORTEX)))))))?C.literal("destroyed"):C.literal("killed")));
                C.xkilled(mon,C.i32((1|4)));
            } else C.monkilled(mon,C.literal("fire"),2);
        } else {
            /* non-fatal damage occurred */
            if(vis) C.variadic(133,mon,C.literal("%s is burned%s"),C.Monnam(mon),C.exclam(dmg));
        }
    }
    if(vis) {
        if(Number(!!(C.i32(res)&&Number(!((Number(C.field((mon),"monst","mhp").value<1))))))) C.variadic(134,mon,C.literal("%s slime is burned away!"),C.s_suffix(C.Monnam(mon)));
        if(Number(otyp!=C.STRANGE_OBJECT)) C.discover_object((otyp),(C.i8(1)),(C.i8(1)),(C.i8(1)));
    }
    /* use up monster's next move */
    (C.field(mon,"monst","movement").value=C.i16(C.field(mon,"monst","movement").value-12));
    (C.field(mon,"monst","mlstmv").value=C.field(C.svm,"instance_globals_saved_m","moves").value);
    return res;
    } finally {C.stackRestore(stackFrame); }
}

/* decide whether obj can be used to cure green slime */
export function cures_sliming(mon,obj)
{
    /* scroll of fire */
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.SCR_FIRE)) return (Number(!!(Number(!!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(4096n))))==C.u64(0n)))&&C.i32(C.field(mon,"monst","mcansee").value)))&&Number(!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n))))))));
    /* potion of oil; will be set burning if not already */
    if(Number(C.i32(C.field(obj,"obj","otyp").value)==C.POT_OIL)) return Number(!((Number((C.u64((C.field((C.field(mon,"monst","data").value),"permonst","mflags1").value&C.u64(8192n))))!=C.u64(0n)))));
    /* non-empty wand or horn of fire;
       hero doesn't need hands or even limbs to zap, so mon doesn't either */
    return (Number(!!((Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.WAN_FIRE)||(Number(!!(Number(C.i32(C.field(obj,"obj","otyp").value)==C.FIRE_HORN)&&C.i32(C.can_blow(mon))))))))&&Number(C.i32(C.field(obj,"obj","spe").value)>0))));
}

/* TRUE if monster appears to be green; we go by the display color.
   The alternative was to just pick things that
   seem plausibly green (which didn't necessarily match the categorization
   by the color of the text).
   iflags.use_color is not meant for game behavior decisions */
export function green_mon(mon)
{
    let ptr=C.field(mon,"monst","data").value;
    if((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC)*C.sizes["struct prop"]),"prop","intrinsic").value&&Number(!((Number(!!(C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","intrinsic").value||C.field((C.field(C.u,"you","uprops").address+Number(C.HALLUC_RES)*C.sizes["struct prop"]),"prop","extrinsic").value))))))))) return (C.i8(0));
    return C.i8((Number(!!(Number(C.i32(C.field(ptr,"permonst","mcolor").value)==2)||Number(C.i32(C.field(ptr,"permonst","mcolor").value)==10)))));
    /* approximation */
}

/*muse.c*/
export const initialState=C=>({});
