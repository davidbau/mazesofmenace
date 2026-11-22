// mkobj.js — object creation.
// C ref: mkobj.c — mkobjprobs[], rogueprobs[], hellprobs[], next_ident,
// may_generate_eroded, mkobj_erosions, mkobj_at, mksobj_at, mkobj, mksobj,
// mksobj_init, blessorcurse, bless, curse, bcsign, mkgold, is_flammable,
// is_rottable, rndmonnum, rndmonnum_adj, start_corpse_timeout,
// set_corpsenm, mkcorpstat; objnam.c erosion_matters; mon.c
// undead_to_corpse; o_init.c rnd_class.
//
// Objects are plain JS objects with the struct obj fields that are set
// here. Not ported yet (each is reported with impossible() where C would
// call it): the floor object lists (place_object only records ox/oy),
// containers (mkbox_cnts, add_to_container), egg/tin/figurine monster
// types, mk_artifact, candy wrappers, timers, novels, weight().

import { game } from './gstate.js';
import { rn2, rnd, rn1, rne, rnz } from './rng.js';
import { depth, level_difficulty, In_hell } from './dungeon.js';
import * as O from './objects.js';
import { objects } from './objects.js';
import { P_NONE, P_SHURIKEN, P_BOW, FIRE_RES, G_GONE, G_GENOD } from './const.js';
import { rndmonst_adj } from './makemon.js';
import { monsndx, little_to_big, big_to_little, is_human } from './mondata.js';
import * as M from './monsters.js';
import { assign_candy_wrapper } from './read.js';
import { noveltitle } from './do_name.js';
import {
    mons, LOW_PM, SPECIAL_PM, G_UNIQ, G_NOGEN, G_HELL, G_NOHELL, G_NOCORPSE,
    M2_MALE, M2_FEMALE, M2_NEUTER, MZ_SMALL, S_TROLL,
    PM_KOBOLD_ZOMBIE, PM_KOBOLD_MUMMY, PM_KOBOLD, PM_DWARF_ZOMBIE,
    PM_DWARF_MUMMY, PM_DWARF, PM_GNOME_ZOMBIE, PM_GNOME_MUMMY, PM_GNOME,
    PM_ORC_ZOMBIE, PM_ORC_MUMMY, PM_ORC, PM_ELF_ZOMBIE, PM_ELF_MUMMY, PM_ELF,
    PM_VAMPIRE, PM_VAMPIRE_LEADER, PM_HUMAN_ZOMBIE, PM_HUMAN_MUMMY, PM_HUMAN,
    PM_GIANT_ZOMBIE, PM_GIANT_MUMMY, PM_GIANT, PM_ETTIN_ZOMBIE,
    PM_ETTIN_MUMMY, PM_ETTIN, PM_LIZARD, PM_LICHEN, PM_DEATH, PM_FAMINE,
    PM_PESTILENCE,
} from './monsters.js';
import { merged } from './invent.js';
import { obj_no_longer_held } from './do.js';
import { block_point, recalc_block_point } from './vision.js';
import { vobj_at } from './display.js';
import { attach_egg_hatch_timeout } from './timeout.js';
import { tt_oname } from './topten.js';
import { zombie_form } from './mon.js';
import { forget_temple_entry } from './priest.js';
import { MON_DETACH } from './const.js';
import { confers_luck } from './timeout.js';
import { set_moreluck } from './attrib.js';
import { eaten_stat, tin_variety, tintxt_fodder, vegetarian } from './eat.js';
import { costly_spot } from './insight.js';

function impossible(msg) { console.error(`impossible: ${msg}`); }

const NON_PM = -1;

// hack.h corpse/statue flags
export const CORPSTAT_SPE_VAL = 0x07; /* 0x03 | 0x04 */
export const CORPSTAT_INIT = 0x08; /* pass init flag to mkcorpstat */
const CORPSTAT_FEMALE = 1;
const CORPSTAT_MALE = 2;
const CORPSTAT_NEUTER = 3;
const TAINT_AGE = 50;           /* age when corpses go bad */
const TROLL_REVIVE_CHANCE = 37; /* 1/37 chance for 50 turns ~ 75% chance */
const ROT_AGE = 250;            /* age when corpses rot away */

// C ref: mondata.h is_male(), is_female(), is_neuter(), verysmall(),
// is_rider()
function is_male(ptr) { return (ptr.mflags2 & M2_MALE) !== 0; }
function is_female(ptr) { return (ptr.mflags2 & M2_FEMALE) !== 0; }
function is_neuter(ptr) { return (ptr.mflags2 & M2_NEUTER) !== 0; }
function verysmall(ptr) { return ptr.msize < MZ_SMALL; }
function is_rider(ptr) {
    return (ptr === mons[PM_DEATH] || ptr === mons[PM_FAMINE]
            || ptr === mons[PM_PESTILENCE]);
}

// C ref: mkobj.c rndmonnum()
/* select a random, common monster type */
export function rndmonnum() {
    return rndmonnum_adj(0, 0);
}

// C ref: mkobj.c rndmonnum_adj()
/* select a random, common monster type, with adjusted difficulty */
export function rndmonnum_adj(minadj, maxadj) {
    let ptr;
    let i;

    /* Plan A: get a level-appropriate common monster */
    ptr = rndmonst_adj(minadj, maxadj);
    if (ptr)
        return monsndx(ptr);

    /* Plan B: get any common monster */
    const excludeflags = G_UNIQ | G_NOGEN | (In_hell(game.u.uz) ? G_NOHELL : G_HELL);
    do {
        i = rn1(SPECIAL_PM - LOW_PM, LOW_PM);
        ptr = mons[i];
    } while ((ptr.geno & excludeflags) !== 0);

    return i;
}

// C ref: mon.c undead_to_corpse()
/* return the corpse type an undead monster leaves */
export function undead_to_corpse(mndx) {
    switch (mndx) {
    case PM_KOBOLD_ZOMBIE:
    case PM_KOBOLD_MUMMY:
        mndx = PM_KOBOLD;
        break;
    case PM_DWARF_ZOMBIE:
    case PM_DWARF_MUMMY:
        mndx = PM_DWARF;
        break;
    case PM_GNOME_ZOMBIE:
    case PM_GNOME_MUMMY:
        mndx = PM_GNOME;
        break;
    case PM_ORC_ZOMBIE:
    case PM_ORC_MUMMY:
        mndx = PM_ORC;
        break;
    case PM_ELF_ZOMBIE:
    case PM_ELF_MUMMY:
        mndx = PM_ELF;
        break;
    case PM_VAMPIRE:
    case PM_VAMPIRE_LEADER:
    case PM_HUMAN_ZOMBIE:
    case PM_HUMAN_MUMMY:
        mndx = PM_HUMAN;
        break;
    case PM_GIANT_ZOMBIE:
    case PM_GIANT_MUMMY:
        mndx = PM_GIANT;
        break;
    case PM_ETTIN_ZOMBIE:
    case PM_ETTIN_MUMMY:
        mndx = PM_ETTIN;
        break;
    default:
        break;
    }
    return mndx;
}

// C ref: mkobj.c start_corpse_timeout()
/*
 * Start a corpse decay or revive timer.
 * This takes the age of the corpse into consideration as of 3.4.0.
 * Timers themselves are not ported yet; the rolls are.
 */
export function start_corpse_timeout(body) {
    let when;       /* rot away when this old */
    let age;        /* age of corpse          */

    /* lizards and lichen don't rot or revive */
    if (body.corpsenm === PM_LIZARD || body.corpsenm === PM_LICHEN)
        return;

    let action = 'ROT_CORPSE';             /* default action: rot away */
    const rot_adjust = game.in_mklev ? 25 : 10; /* give some variation */
    age = Math.max(game.moves || 0, 1) - body.age;
    if (age > ROT_AGE)
        when = rot_adjust;
    else
        when = ROT_AGE - age;
    when += (rnz(rot_adjust) - rot_adjust);

    if (is_rider(mons[body.corpsenm])) {
        action = 'REVIVE_MON';
        /* rider_revival_time() */
        const minturn = (body.corpsenm === PM_DEATH) ? 6 : 12;
        for (when = minturn; when < 67; when++)
            if (!rn2(3))
                break;
    } else if (mons[body.corpsenm].mlet === S_TROLL) {
        for (age = 2; age <= TAINT_AGE; age++)
            if (!rn2(TROLL_REVIVE_CHANCE)) { /* troll revives */
                action = 'REVIVE_MON';
                when = age;
                break;
            }
    } else if (game.zombify && zombie_form(mons[body.corpsenm]) !== NON_PM
               && !body.norevive) {
        action = 'ZOMBIFY_MON';
        when = rn1(15, 5); /* 5..19 */
    }

    /* (void) start_timer(when, TIMER_OBJECT, action, obj_to_any(body)):
       timers are not ported yet */
    body.timer = { when, action };
}

// C ref: mkobj.c set_corpsenm()
export function set_corpsenm(obj, id) {
    const old_id = obj.corpsenm;
    let when = 0;

    if (obj.timer) { /* obj->timed */
        if (obj.otyp === O.EGG) {
            /* when = stop_timer(HATCH_EGG, obj_to_any(obj)): the time left
               needs the timer queue */
            throw new Error('set_corpsenm(): stop_timer() of an egg hatch timer not ported yet');
        } else {
            when = 0;
            obj.timer = null; /* obj_stop_timers(obj): corpse or figurine */
        }
    }
    /* oeaten is used to determine how much nutrition is left in
       multiple-bite food and also used to derive how many hit points
       a creature resurrected from a partly eaten corpse gets; latter
       is of interest when a <foo> corpse revives as a <foo> zombie
       in case they are defined with different mons[].cnutrit values */
    if (obj.otyp === O.CORPSE && obj.oeaten
        /* when oeaten is non-zero, index old_id can't be NON_PM
           and divisor mons[old_id].cnutrit can't be zero */
        && mons[old_id].cnutrit !== mons[id].cnutrit) {
        obj.oeaten = Math.trunc(obj.oeaten * mons[id].cnutrit
                                / mons[old_id].cnutrit);
    }

    obj.corpsenm = id;
    switch (obj.otyp) {
    case O.CORPSE:
        start_corpse_timeout(obj);
        obj.owt = weight(obj);
        break;
    case O.FIGURINE:
        if (obj.corpsenm !== NON_PM && !dead_species(obj.corpsenm, true)
            && (obj.where === 'OBJ_INVENT' || obj.where === 'OBJ_MINVENT')) /* carried() || mcarried() */
            throw new Error('set_corpsenm(): attach_fig_transform_timeout() not ported yet');
        obj.owt = weight(obj);
        break;
    case O.EGG:
        if (obj.corpsenm !== NON_PM && !dead_species(obj.corpsenm, true))
            attach_egg_hatch_timeout(obj, when);
        break;
    default: /* tin, etc. */
        obj.owt = weight(obj);
        break;
    }
}

// C ref: mkobj.c save_mtraits()
/* stash a copy of a monster's traits in an object's oextra (corpse or
   statue), for revival */
export function save_mtraits(obj, mtmp) {
    if (mtmp.ispriest)
        forget_temple_entry(mtmp); /* EPRI() */
    if (!obj.oextra || !obj.oextra.omonst) { /* !has_omonst(obj) */
        if (!obj.oextra)
            obj.oextra = {};
        obj.oextra.omonst = {}; /* newomonst(obj) */
    }
    if (obj.oextra.omonst) { /* has_omonst(obj) */
        const baselevel = mtmp.data.mlevel; /* mtmp->data is valid ptr */
        const mtmp2 = { ...mtmp }; /* *mtmp2 = *mtmp */

        obj.oextra.omonst = mtmp2;
        mtmp2.mnum = monsndx(mtmp.data);
        /* invalidate pointers */
        /* m_id is needed to know if this is a revived quest leader */
        /* but m_id must be cleared when loading bones */
        mtmp2.nmon = null;
        mtmp2.data = null;
        mtmp2.minvent = null;
        mtmp2.mw = null; /* MON_NOWEP(mtmp2) */
        /* mtmp2->mextra = 0; if (mtmp->mextra) copy_mextra(mtmp2, mtmp):
           the port keeps the extension structs on the monster (or in
           mtmp.mextra); give the copy its own */
        if (mtmp.mextra) {
            mtmp2.mextra = {};
            for (const [k, v] of Object.entries(mtmp.mextra))
                mtmp2.mextra[k] = (v && typeof v === 'object') ? { ...v } : v;
        }
        for (const k of ['edog', 'epri', 'emin', 'eshk', 'egd'])
            if (mtmp[k])
                mtmp2[k] = { ...mtmp[k] };
        /* if mtmp is a long worm with segments, its saved traits will
           be one without any segments */
        mtmp2.wormno = 0;
        /* mtmp might have been killed by repeated life draining; make sure
           mtmp2 can survive if revived ('baselevel' will be 0 for 1d4 mon) */
        if (mtmp2.mhpmax <= baselevel)
            mtmp2.mhpmax = baselevel + 1;
        /* mtmp is assumed to be dead but we don't kill it or its saved
           traits, just force those to have a sane value for current HP */
        if (mtmp2.mhp > mtmp2.mhpmax)
            mtmp2.mhp = mtmp2.mhpmax;
        if (mtmp2.mhp < 1)
            mtmp2.mhp = 0;
        mtmp2.mstate = (mtmp2.mstate || 0) & ~MON_DETACH;
    }
    return obj;
}

// C ref: mkobj.c mkcorpstat()
/*
 * make a corpse or statue; the corpse type is ptr if given, else random
 */
export function mkcorpstat(objtype, mtmp, ptr, x, y, corpstatflags) {
    let otmp;
    const init = ((corpstatflags & CORPSTAT_INIT) !== 0);

    if (objtype !== O.CORPSE && objtype !== O.STATUE)
        impossible(`making corpstat type ${objtype}`);
    if (x === 0 && y === 0) { /* special case - random placement */
        otmp = mksobj(objtype, init, false);
        /* (void) rloco(otmp): teleport.js rloco() is async and this
           caller isn't */
        throw new Error('mkcorpstat(): rloco() for random placement not ported yet');
    } else {
        otmp = mksobj_at(objtype, x, y, init, false);
    }
    /* record gender and 'historic statue' in overloaded enchantment field */
    otmp.spe = (corpstatflags & CORPSTAT_SPE_VAL);
    otmp.norevive = game.mkcorpstat_norevive ? 1 : 0;

    /* when 'mtmp' is non-null save the monster's details with the
       corpse or statue; it will also force the 'ptr' override below */
    if (mtmp) {
        /* save_mtraits updates otmp->oextra->omonst in place */
        save_mtraits(otmp, mtmp);

        if (!ptr)
            ptr = mtmp.data;

        /* don't give a revive timer to a cancelled troll's corpse */
        if (mtmp.mcan && !is_rider(ptr))
            otmp.norevive = 1;
    }

    /* when 'ptr' is non-null it comes from our caller or from 'mtmp';
       override mkobjs()'s initialization of a random monster type */
    if (ptr) {
        const old_corpsenm = otmp.corpsenm;

        otmp.corpsenm = monsndx(ptr);
        otmp.owt = weight(otmp);
        if (otmp.otyp === O.CORPSE
            && (game.zombify || special_corpse(old_corpsenm)
                || special_corpse(otmp.corpsenm))) {
            /* obj_stop_timers(otmp) */
            start_corpse_timeout(otmp);
        }
    }
    return otmp;
}

// C ref: mondata.h special_corpse()
function special_corpse(num) {
    return (num === PM_LIZARD || num === PM_LICHEN
            || (num >= 0 && (is_rider(mons[num]) || mons[num].mlet === S_TROLL)));
}

const {
    RANDOM_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    VENOM_CLASS,
} = O;

// C ref: objclass.h SPBOOK_no_NOVEL — mkobj() class code for "spellbook,
// but not a novel"
export const SPBOOK_no_NOVEL = O.SPBOOK_no_NOVEL;

// C ref: mkobj.c mkobjprobs[]
const mkobjprobs = [
    [10, WEAPON_CLASS], [11, ARMOR_CLASS], [20, FOOD_CLASS],
    [8, TOOL_CLASS], [7, GEM_CLASS], [16, POTION_CLASS],
    [16, SCROLL_CLASS], [4, SPBOOK_CLASS], [4, WAND_CLASS],
    [3, RING_CLASS], [1, AMULET_CLASS],
];

// C ref: mkobj.c rogueprobs[]
const rogueprobs = [
    [12, WEAPON_CLASS], [12, ARMOR_CLASS], [22, FOOD_CLASS],
    [22, POTION_CLASS], [22, SCROLL_CLASS], [5, WAND_CLASS],
    [5, RING_CLASS],
];

// C ref: mkobj.c hellprobs[]
const hellprobs = [
    [20, WEAPON_CLASS], [20, ARMOR_CLASS], [16, FOOD_CLASS],
    [12, TOOL_CLASS], [10, GEM_CLASS], [1, POTION_CLASS],
    [1, SCROLL_CLASS], [8, WAND_CLASS], [8, RING_CLASS],
    [4, AMULET_CLASS],
];

// C ref: dungeon.h Is_rogue_level() — Lcheck(x, &rogue_level)
function Is_rogue_level(lev) {
    const z = game.dungeon_topology.d_rogue_level;
    return !!((z.dlevel || z.dnum) && lev.dnum === z.dnum && lev.dlevel === z.dlevel);
}

// C ref: obj.h is_multigen()
function is_multigen(otmp) {
    return (otmp.oclass === WEAPON_CLASS
            && objects[otmp.otyp].oc_skill >= -P_SHURIKEN
            && objects[otmp.otyp].oc_skill <= -P_BOW);
}

// C ref: artifact.c permapoisoned() — is_art(obj, ART_GRIMTOOTH); no
// artifacts are created yet
export function permapoisoned(obj) {
    return !!(obj && obj.oartifact && false);
}

// C ref: obj.h is_poisonable()
export function is_poisonable(otmp) {
    return ((otmp.oclass === WEAPON_CLASS
             && objects[otmp.otyp].oc_skill >= -P_SHURIKEN
             && objects[otmp.otyp].oc_skill <= -P_BOW)
            || permapoisoned(otmp));
}

// C ref: obj.h is_weptool()
export function is_weptool(o) {
    return (o.oclass === TOOL_CLASS && objects[o.otyp].oc_skill !== P_NONE);
}

// C ref: obj.h Is_candle()
export function Is_candle(otmp) {
    return (otmp.otyp === O.TALLOW_CANDLE || otmp.otyp === O.WAX_CANDLE);
}

// C ref: obj.h Is_pudding()
function Is_pudding(o) {
    return (o.otyp === O.GLOB_OF_GRAY_OOZE || o.otyp === O.GLOB_OF_BROWN_PUDDING
            || o.otyp === O.GLOB_OF_GREEN_SLIME || o.otyp === O.GLOB_OF_BLACK_PUDDING);
}

// C ref: mkobj.c dknowns[]
const dknowns = [O.WAND_CLASS, O.RING_CLASS, O.POTION_CLASS, O.SCROLL_CLASS,
                 O.GEM_CLASS, O.SPBOOK_CLASS, O.WEAPON_CLASS, O.TOOL_CLASS,
                 O.VENOM_CLASS];

// C ref: mkobj.c clear_dknown()
/* set obj->dknown to 0 for most types of objects, to 1 otherwise */
export function clear_dknown(obj) {
    /* note: this is an unobserving not an observing, so don't call
       observe_object even if dknown is being set to 1 */
    obj.dknown = dknowns.includes(obj.oclass) ? 0 : 1;
    if ((obj.otyp >= O.ELVEN_SHIELD && obj.otyp <= O.ORCISH_SHIELD)
        || obj.otyp === O.SHIELD_OF_REFLECTION
        || objects[obj.otyp].oc_merge)
        obj.dknown = 0;
    /* globs always have dknown flag set (to maximize merging) but for new
       object, globby flag won't be set yet so isn't available to check */
    if (Is_pudding(obj))
        obj.dknown = 1;
}

// C ref: mkobj.c unknow_object()
/* some init for a brand new object, or partial re-init when hero loses
   potentially known info about an object */
export function unknow_object(obj) {
    clear_dknown(obj); /* obj->dknown = 0; */

    obj.bknown = obj.rknown = 0;
    obj.cknown = obj.lknown = 0;
    obj.tknown = 0;
    /* [object types which don't use the known flag have it set True] */
    obj.known = objects[obj.otyp].oc_uses_known ? 0 : 1;
}

// C ref: mkobj.c is_flammable()
export function is_flammable(otmp) {
    const otyp = otmp.otyp;
    const omat = objects[otyp].oc_material;

    /* Candles can be burned, but they're not flammable in the sense that
     * they can't get fire damage and it makes no sense for them to be
     * fireproofed.
     */
    if (Is_candle(otmp))
        return false;

    if (objects[otyp].oc_oprop === FIRE_RES || otyp === O.WAN_FIRE)
        return false;

    return ((omat <= O.WOOD && omat !== O.LIQUID) || omat === O.PLASTIC);
}

// C ref: mkobj.c is_rottable()
export function is_rottable(otmp) {
    const otyp = otmp.otyp;

    return ((objects[otyp].oc_material <= O.WOOD
             && objects[otyp].oc_material !== O.LIQUID)
            || objects[otyp].oc_material === O.DRAGON_HIDE);
}

// C ref: objclass.h is_rustprone(), is_crackable(), is_corrodeable(),
// is_damageable()
export function is_rustprone(otmp) { return objects[otmp.otyp].oc_material === O.IRON; }
export function is_crackable(otmp) {
    return (objects[otmp.otyp].oc_material === O.GLASS
            && otmp.oclass === ARMOR_CLASS); /* erosion_matters() */
}
export function is_corrodeable(otmp) {
    return (objects[otmp.otyp].oc_material === O.COPPER
            || objects[otmp.otyp].oc_material === O.IRON);
}
export function is_damageable(otmp) {
    return (is_rustprone(otmp) || is_flammable(otmp)
            || is_rottable(otmp) || is_corrodeable(otmp)
            || is_crackable(otmp));
}

// C ref: objnam.c erosion_matters()
export function erosion_matters(obj) {
    switch (obj.oclass) {
    case TOOL_CLASS:
        return is_weptool(obj) ? true : false;
    case WEAPON_CLASS:
    case ARMOR_CLASS:
    case BALL_CLASS:
    case CHAIN_CLASS:
        return true;
    default:
        break;
    }
    return false;
}

// C ref: mkobj.c next_ident()
export function next_ident() {
    if (!game.context) game.context = {};
    if (game.context.ident === undefined)
        game.context.ident = 2; /* allmain.c: id 1 is reserved for gy.youmonst */
    const res = game.context.ident;

    /* +rnd(2): originally just +1; changed to rnd() to avoid potential
       exploit of player using #adjust to split an object stack in a manner
       that makes most recent ident%2 known */
    game.context.ident += rnd(2); /* ready for next new object or monster */

    /* if ident has wrapped to 0, force it to be non-zero */
    if (!game.context.ident)
        game.context.ident = rnd(2) + 1; /* id 1 is reserved */

    return res;
}

// C ref: shk.c oid_price_adjustment()
/* used by nextoid() so that a split-off stack keeps the same price
   adjustment as its parent */
function oid_price_adjustment(obj, oid) {
    let res = 0;
    const otyp = obj.otyp;

    if (!(obj.dknown && objects[otyp].oc_name_known)
        && (obj.oclass !== O.GEM_CLASS || objects[otyp].oc_material !== O.GLASS)) {
        res = ((oid % 4) === 0) ? 1 : 0; /* id%4 ==0 -> +1, ==1..3 -> 0 */
    }
    return res;
}

// C ref: mkobj.c nextoid()
/* when splitting a stack that has o_id-based shop prices, pick an
   o_id value for the new stack that will maintain the same price */
function nextoid(oldobj, newobj) {
    let trylimit = 256; /* limit of 4 suffices at present */
    let oid = (game.context.ident - 1) >>> 0; /* loop increment will reverse -1 */
    let newdif;

    const olddif = oid_price_adjustment(oldobj, oldobj.o_id);
    do {
        oid = (oid + 1) >>> 0;
        if (!oid) /* avoid using 0 (in case value wrapped) */
            ++oid;
        newdif = oid_price_adjustment(newobj, oid);
    } while (newdif !== olddif && --trylimit >= 0);
    game.context.ident = oid; /* update 'last ident used' */
    next_ident(); /* increment context.ident for next use */
    return oid; /* caller will use this ident */
}

// C ref: mkobj.c copy_oextra()
/* oextra fields live directly on the JS object; the struct copy in
   splitobj() already carried them, so only deep-copy the mutable ones */
function copy_oextra(obj2, obj1) {
    if (!obj2 || !obj1)
        return;
    if (obj1.omonst)
        obj2.omonst = { ...obj1.omonst };
}

// C ref: mkobj.c splitobj()
/*
 * Split obj so that it gets size gets reduced by num. The quantity num is
 * put in the object structure delivered by this call.  The returned object
 * has its wornmask cleared and is positioned just following the original
 * in the nobj chain (and nexthere chain when on the floor).
 */
export function splitobj(obj, num) {
    /* can't split containers */
    if ((obj.cobj && obj.cobj.length) || num <= 0 || obj.quan <= num)
        throw new Error(`splitobj [num=${num} quan=${obj.quan}]`);

    const otmp = { ...obj }; /* copies whole structure */
    delete otmp.oextra;
    otmp.o_id = nextoid(obj, otmp);
    otmp.timed = 0; /* not timed, yet */
    otmp.lamplit = 0; /* ditto */
    otmp.owornmask = 0; /* new object isn't worn */
    obj.quan -= num;
    obj.owt = weight(obj);
    otmp.quan = num;
    otmp.owt = weight(otmp); /* -= obj->owt ? */
    otmp.lua_ref_cnt = 0;
    otmp.pickup_prev = 0;

    if (!game.context.objsplit) game.context.objsplit = {};
    game.context.objsplit.parent_oid = obj.o_id;
    game.context.objsplit.child_oid = otmp.o_id;
    /* obj->nobj = otmp; (and obj->nexthere = otmp when on the floor):
       insert into chain: obj -> otmp -> next */
    if (obj.where === 'OBJ_FLOOR') {
        const fobj = game.level.objects || [];
        fobj.splice(fobj.indexOf(obj) + 1, 0, otmp);
    } else if (obj.where === 'OBJ_MINVENT') {
        /* minvent arrays are kept oldest first (C chain reversed) */
        const inv = obj.ocarry.minvent;
        inv.splice(inv.indexOf(obj), 0, otmp);
    } else if (obj.where === 'OBJ_INVENT') {
        /* hero's inventory is a linked chain (gi.invent) */
        otmp.nobj = obj.nobj;
        obj.nobj = otmp;
    } else if (obj.where !== 'OBJ_FREE' && obj.where !== 'OBJ_LUAFREE') {
        throw new Error(`splitobj(): where=${obj.where} not ported yet`);
    }
    /* lua isn't tracking the split off portion even if it happens to
       be tracking the original */
    if (otmp.where === 'OBJ_LUAFREE')
        otmp.where = 'OBJ_FREE';
    if (obj.unpaid)
        throw new Error('splitobj(): splitbill() not ported yet');
    copy_oextra(otmp, obj);
    if (otmp.omid)
        delete otmp.omid; /* free_omid(): only one association with m_id */
    if (obj.timed)
        throw new Error('splitobj(): obj_split_timers() not ported yet');
    if (obj.lamplit)
        throw new Error('splitobj(): obj_split_light_source() not ported yet');
    return otmp;
}

// C ref: mkobj.c obj_extract_self()
/* the cases monster pickup reaches: floor objects live in
   game.level.objects, monster inventory in mon.minvent */
export function obj_extract_self(obj) {
    switch (obj.where) {
    case 'OBJ_FREE':
    case 'OBJ_LUAFREE':
        break;
    case 'OBJ_FLOOR': { /* remove_object() */
        const fobj = game.level.objects || [];
        const i = fobj.indexOf(obj);
        if (i >= 0)
            fobj.splice(i, 1);
        obj.where = 'OBJ_FREE';
        if (obj.otyp === O.BOULDER)
            recalc_block_point(obj.ox, obj.oy); /* vision */
        break;
    }
    case 'OBJ_MINVENT': {
        const inv = obj.ocarry.minvent || [];
        const i = inv.indexOf(obj);
        if (i >= 0)
            inv.splice(i, 1);
        obj.where = 'OBJ_FREE';
        obj.ocarry = null;
        break;
    }
    default:
        throw new Error(`obj_extract_self: where=${obj.where} is not ported yet`);
    }
}

// C ref: mkobj.c add_to_minv()
/* add obj to mon's inventory; returns 1 if obj was merged (and freed) */
export function add_to_minv(mon, obj) {
    if (obj.where !== 'OBJ_FREE')
        throw new Error(`add_to_minv: obj where=${obj.where}, not free`);

    if (!mon.minvent) mon.minvent = [];
    /* merge if possible (C walks the chain newest first) */
    for (const otmp of mon.minvent.slice().reverse())
        if (merged({ otmp, obj }))
            return 1; /* obj merged and then free'd */
    /* else insert; don't bother forcing it to end of chain
       (JS minvent arrays are oldest first: newest goes last) */
    obj.where = 'OBJ_MINVENT';
    obj.ocarry = mon;
    mon.minvent.push(obj);
    return 0; /* obj on mon's inventory chain */
}

// C ref: mkobj.c may_generate_eroded()
/* can object be generated eroded? */
function may_generate_eroded(otmp) {
    /* initial hero inventory */
    if ((game.moves || 0) <= 1 && !game.in_mklev)
        return false;
    /* already erodeproof or cannot be eroded */
    if (otmp.oerodeproof || !erosion_matters(otmp) || !is_damageable(otmp))
        return false;
    /* part of a monster's body and produced when it dies */
    if (otmp.otyp === O.WORM_TOOTH || otmp.otyp === O.UNICORN_HORN)
        return false;
    /* artifacts cannot be generated eroded  */
    if (otmp.oartifact)
        return false;
    return true;
}

// C ref: mkobj.c mkobj_erosions()
/* random chance of applying erosions/grease to object */
function mkobj_erosions(otmp) {
    if (may_generate_eroded(otmp)) {
        /* A small fraction of non-artifact items will generate eroded or
         * possibly erodeproof. An item that generates eroded will never be
         * erodeproof, and vice versa. */
        if (!rn2(100)) {
            otmp.oerodeproof = 1;
        } else {
            if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp)
                             || is_crackable(otmp))) {
                do {
                    otmp.oeroded++;
                } while (otmp.oeroded < 3 && !rn2(9));
            }
            if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
                do {
                    otmp.oeroded2++;
                } while (otmp.oeroded2 < 3 && !rn2(9));
            }
        }
        /* and an extremely small fraction of the time, erodable items
         * will generate greased */
        if (!rn2(1000))
            otmp.greased = 1;
    }
}

// C ref: mkobj.c mkobj_at()
/* make a random object of class 'let' at a specific location;
   'let' might be random class; place_object() will validate <x,y> */
export function mkobj_at(let_, x, y, artif) {
    const otmp = mkobj(let_, artif);
    place_object(otmp, x, y);
    return otmp;
}

// C ref: mkobj.c mksobj_at()
export function mksobj_at(otyp, x, y, init, artif) {
    const otmp = mksobj(otyp, init, artif);
    place_object(otmp, x, y);
    return otmp;
}

// C ref: mkobj.c place_object() -- the level's floor object chain (fobj)
// is game.level.objects, newest first; per-square piles are read from it
// in the same order (boulder-first pile ordering isn't ported yet).
export function place_object(otmp, x, y) {
    const otmp2 = vobj_at(x, y); /* level.objects[x][y] */

    obj_no_longer_held(otmp);
    if (otmp.otyp === O.BOULDER) {
        if (!otmp2 || otmp2.otyp !== O.BOULDER)
            block_point(x, y); /* vision */
    }
    otmp.ox = x;
    otmp.oy = y;
    otmp.where = 'OBJ_FLOOR';
    /* otmp->nobj = fobj; fobj = otmp; */
    if (!game.level.objects) game.level.objects = [];
    game.level.objects.unshift(otmp);
}

// C ref: o_init.c rnd_class()
export function rnd_class(first, last) {
    let i, x, sum = 0;

    if (last > first) {
        for (i = first; i <= last; i++)
            sum += objects[i].oc_prob;
        if (!sum) /* all zero, so equal probability */
            return rn1(last - first + 1, first);

        x = rnd(sum);
        for (i = first; i <= last; i++)
            if ((x -= objects[i].oc_prob) <= 0)
                return i;
    }
    return (first === last) ? first : O.STRANGE_OBJECT;
}

// C ref: mkobj.c mkobj()
/* mkobj(): select a type of item from a class, use mksobj() to create it;
   result is always non-Null */
export function mkobj(oclass, artif) {
    let tprob, i, prob;

    if (oclass === RANDOM_CLASS) {
        const iprobs = Is_rogue_level(game.u.uz) ? rogueprobs
                       : In_hell(game.u.uz) ? hellprobs : mkobjprobs;
        let k = 0;

        for (tprob = rnd(100); (tprob -= iprobs[k][0]) > 0; k++)
            continue;
        oclass = iprobs[k][1];
    }

    if (oclass === SPBOOK_no_NOVEL) {
        i = rnd_class(game.bases[SPBOOK_CLASS], O.SPE_BLANK_PAPER);
        oclass = SPBOOK_CLASS; /* for sanity check below */
    } else {
        prob = rnd(game.oclass_prob_totals[oclass]);
        i = game.bases[oclass];
        while ((prob -= objects[i].oc_prob) > 0)
            ++i;
    }

    if (objects[i].oc_class !== oclass || !O.OBJ_NAME(objects[i])) {
        impossible(`probtype error, oclass=${oclass} i=${i}`);
        i = game.bases[oclass];
    }

    return mksobj(i, true, artif);
}

// C ref: mkobj.c bless() — the light-source and inventory updates are not
// needed during level creation
export function bless(otmp) {
    otmp.cursed = 0;
    otmp.blessed = 1;
}

// C ref: mkobj.c curse()
export function curse(otmp) {
    otmp.blessed = 0;
    otmp.cursed = 1;
}

// C ref: mkobj.c uncurse()
export function uncurse(otmp) {
    if (otmp.lamplit)
        throw new Error('uncurse(): arti_light_radius() of a lit object not ported yet');
    otmp.cursed = 0;
    if (otmp.where === 'OBJ_INVENT' /* carried(otmp) */ && confers_luck(otmp))
        set_moreluck();
    else if (otmp.otyp === O.BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
    else if (otmp.otyp === O.FIGURINE && otmp.timed)
        throw new Error('uncurse(): stop_timer(FIG_TRANSFORM) not ported yet');
    return;
}

// C ref: mkobj.c blessorcurse()
export function blessorcurse(otmp, chance) {
    if (otmp.blessed || otmp.cursed)
        return;

    if (!rn2(chance)) {
        if (!rn2(2)) {
            curse(otmp);
        } else {
            bless(otmp);
        }
    }
}

// C ref: mkobj.c bcsign()
export function bcsign(otmp) {
    return (!!otmp.blessed - !!otmp.cursed);
}

// nartifact_exist(): C ref artifact.c, ported in artifact.js
import { nartifact_exist, mk_artifact } from './artifact.js';
import { A_NONE } from './const.js';

function not_ported(what) {
    throw new Error(`mkobj: ${what} not ported yet`);
}

// C ref: mkobj.c boxiprobs[]
const boxiprobs = [ { iprob: 18, iclass: O.GEM_CLASS },
                    { iprob: 15, iclass: O.FOOD_CLASS },
                    { iprob: 18, iclass: O.POTION_CLASS },
                    { iprob: 18, iclass: O.SCROLL_CLASS },
                    { iprob: 12, iclass: O.SPBOOK_CLASS },
                    { iprob: 7, iclass: O.COIN_CLASS },
                    { iprob: 6, iclass: O.WAND_CLASS },
                    { iprob: 5, iclass: O.RING_CLASS },
                    { iprob: 1, iclass: O.AMULET_CLASS } ];

// C ref: obj.h Is_mbag()
function Is_mbag(otmp) {
    return otmp.otyp === O.BAG_OF_HOLDING || otmp.otyp === O.BAG_OF_TRICKS;
}

// C ref: mkobj.c add_to_container() -- container chains are kept as a
// plain array on the box (no merging yet)
export function add_to_container(container, obj) {
    obj.where = 'OBJ_CONTAINED';
    obj.ocontainer = container;
    if (!container.cobj) container.cobj = [];
    container.cobj.unshift(obj);
    return obj;
}

// C ref: obj.h Is_container()
export function Is_container(otmp) {
    return otmp.otyp >= O.LARGE_BOX && otmp.otyp <= O.BAG_OF_TRICKS;
}

// C ref: mkobj.c weight()
/*
 * Calculate the weight of the given object.  This will recursively follow
 * and calculate the weight of any containers.  (C's container chain is a
 * plain array, obj.cobj, here.)
 */
export function weight(obj) {
    let wt = objects[obj.otyp].oc_weight; /* weight of 1 'otyp' */

    if (obj.quan < 1) {
        impossible(`Calculating weight of ${obj.quan} objects?`);
        return 0;
    }
    /* glob absorption means that merging globs combines their weight
       while quantity stays 1 */
    if (obj.globby)
        return obj.owt;
    if (Is_container(obj) || obj.otyp === O.STATUE) {
        let cwt;

        if (obj.otyp === O.STATUE && obj.corpsenm >= LOW_PM) {
            const msize = mons[obj.corpsenm].msize, /* 0..7 */
                  minwt = (msize + msize + 1) * 100;

            /* default statue weight is 1.5 times corpse weight */
            wt = Math.trunc(3 * mons[obj.corpsenm].cwt / 2);
            if (wt < minwt)
                wt = minwt;
            /* this has no effect because statues don't stack */
            wt *= obj.quan;
        }

        cwt = 0; /* contents weight */
        for (const contents of (obj.cobj || []))
            cwt += weight(contents);
        if (obj.otyp === O.BAG_OF_HOLDING)
            cwt = obj.cursed ? (cwt * 2)
                  : obj.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2); /* uncursed */

        return wt + cwt;
    }
    if (obj.otyp === O.CORPSE && obj.corpsenm >= LOW_PM) {
        wt = obj.quan * mons[obj.corpsenm].cwt;
        if (obj.oeaten)
            wt = eaten_stat(wt, obj);
        return wt;
    } else if (obj.oclass === O.FOOD_CLASS && obj.oeaten) {
        return eaten_stat(obj.quan * wt, obj);
    } else if (obj.oclass === O.COIN_CLASS) {
        /* 5.0: always weigh at least 1 unit; used to yield 0 for 1..49 */
        wt = Math.trunc((obj.quan + 50) / 100);
        return Math.max(wt, 1);
    } else if (obj.otyp === O.HEAVY_IRON_BALL && obj.owt !== 0) {
        return obj.owt; /* kludge for "very" heavy iron ball */
    } else if (obj.otyp === O.CANDELABRUM_OF_INVOCATION && obj.spe) {
        return wt + obj.spe * objects[O.TALLOW_CANDLE].oc_weight;
    }
    return (wt ? wt * obj.quan : (obj.quan + 1) >> 1);
}

// C ref: mkobj.c costly_alteration()
/* possibly bill for an object which the player has just modified;
   only the "nobody is charging for it" cases are ported */
export function costly_alteration(obj, alter_type) {
    void alter_type;
    let ox, oy;

    if (obj.where === 'OBJ_INVENT' || obj.where === 'OBJ_FREE') {
        /* OBJ_FREE catches obj_no_longer_held()'s transformation
           of crysknife back into worm tooth; the object has been
           removed from inventory but not necessarily placed at
           its new location yet--the unpaid flag will still be set
           if this item is owned by a shop */
        if (!obj.unpaid)
            return;
    } else {
        /* this get_obj_location shouldn't fail, but if it does,
           use hero's location */
        if (obj.where === 'OBJ_FLOOR')
            ox = obj.ox, oy = obj.oy;
        else
            throw new Error('costly_alteration(): get_obj_location() of a contained/carried object not ported yet');
        if (!costly_spot(ox, oy))
            return;
    }
    throw new Error('costly_alteration(): billing for an altered shop object not ported yet');
}

// C ref: mkobj.c mkbox_cnts()
function mkbox_cnts(box) {
    let n;
    let otmp;

    box.cobj = null;

    switch (box.otyp) {
    case O.ICE_BOX:
        n = 20;
        break;
    case O.CHEST:
        n = box.olocked ? 7 : 5;
        break;
    case O.LARGE_BOX:
        n = box.olocked ? 5 : 3;
        break;
    case O.SACK:
    case O.OILSKIN_SACK:
        /* initial inventory: sack starts out empty */
        if ((game.moves ?? 1) <= 1 && !game.in_mklev) {
            n = 0;
            break;
        }
        /* FALLTHRU */
    case O.BAG_OF_HOLDING:
        n = 1;
        break;
    default:
        n = 0;
        break;
    }

    for (n = rn2(n + 1); n > 0; n--) {
        if (box.otyp === O.ICE_BOX) {
            otmp = mksobj(O.CORPSE, true, false);
            /* Note: setting age to 0 is correct.  Age has a different
             * from usual meaning for objects stored in ice boxes. -KAA
             */
            otmp.age = 0;
            /* stop_timer(ROT_CORPSE/REVIVE_MON/SHRINK_GLOB): timers are
               not ported yet */
        } else {
            let tprob;
            let ip = 0;

            for (tprob = rnd(100); (tprob -= boxiprobs[ip].iprob) > 0; ip++)
                ;
            if (!(otmp = mkobj(boxiprobs[ip].iclass, false)))
                continue;

            /* handle a couple of special cases */
            if (otmp.oclass === O.COIN_CLASS) {
                /* 2.5 x level's usual amount; weight adjusted below */
                otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
            } else
                while (otmp.otyp === O.ROCK) {
                    otmp.otyp = rnd_class(O.DILITHIUM_CRYSTAL, O.LOADSTONE);
                    if (otmp.quan > 2)
                        otmp.quan = 1;
                }
            if (box.otyp === O.BAG_OF_HOLDING) {
                if (Is_mbag(otmp)) {
                    otmp.otyp = O.SACK;
                    otmp.spe = 0;
                } else
                    while (otmp.otyp === O.WAN_CANCELLATION)
                        otmp.otyp = rnd_class(O.WAN_LIGHT, O.WAN_LIGHTNING);
            }
        }
        add_to_container(box, otmp);
    }
    /* caller will update box->owt */
}

// C ref: hack.h tin varieties
const ROTTEN_TIN = 0;
const HOMEMADE_TIN = 1;
const SPINACH_TIN = -1;
const RANDOM_TIN = -2;
const HEALTHY_TIN = -3;
// C ref: eat.c TTSZ == SIZE(tintxts); tintxts[] has 16 entries
const TTSZ = 16;

// C ref: eat.c nonrotting_corpse()
function nonrotting_corpse(mnum) {
    return mnum === M.PM_LIZARD || mnum === M.PM_LICHEN
           || mnum === M.PM_DEATH || mnum === M.PM_FAMINE
           || mnum === M.PM_PESTILENCE /* is_rider() */
           || mnum === M.PM_ACID_BLOB;
}

// C ref: eat.c set_tin_variety()
export function set_tin_variety(obj, forcetype) {
    let r;
    const mnum = obj.corpsenm;

    if (forcetype === SPINACH_TIN
        || (forcetype === HEALTHY_TIN
            && (mnum === NON_PM /* empty or already spinach */
                || !vegetarian(mons[mnum])))) { /* replace meat */
        obj.corpsenm = NON_PM; /* not based on any monster */
        obj.spe = 1;           /* spinach */
        return;
    } else if (forcetype === HEALTHY_TIN) {
        r = tin_variety(obj, false);
        if (r < 0 || r >= TTSZ)
            r = ROTTEN_TIN; /* shouldn't happen */
        while ((r === ROTTEN_TIN && !obj.cursed) || !tintxt_fodder[r])
            r = rn2(TTSZ - 1);
    } else if (forcetype >= 0 && forcetype < TTSZ - 1) {
        r = forcetype;
    } else {               /* RANDOM_TIN */
        r = rn2(TTSZ - 1); /* take your pick */
        if (r === ROTTEN_TIN && (mnum >= 0 && nonrotting_corpse(mnum)))
            r = HOMEMADE_TIN; /* lizards don't rot */
    }
    obj.spe = -(r + 1); /* offset by 1 to allow index 0 */
}

// C ref: mon.c can_be_hatched()
export function can_be_hatched(mnum) {
    /* ranger quest nemesis has the oviparous bit set, making it
       be possible to wish for eggs of that unique monster; turn
       such into ordinary eggs rather than forbidding them outright */
    if (mnum === M.PM_SCORPIUS)
        mnum = M.PM_SCORPION;

    mnum = little_to_big(mnum);
    /*
     * Queen bees lay killer bee eggs (usually), but killer bees don't
     * grow into queen bees.  Ditto for [winged-]gargoyles.
     */
    if (mnum === M.PM_KILLER_BEE || mnum === M.PM_GARGOYLE
        || ((mons[mnum].mflags1 & M.M1_OVIPAROUS) !== 0 /* lays_eggs() */
            && (!rn2(77) /* BREEDER_EGG */
                || (mnum !== M.PM_QUEEN_BEE && mnum !== M.PM_WINGED_GARGOYLE))))
        return mnum;
    return NON_PM;
}

// C ref: mon.c dead_species()
export function dead_species(m_idx, egg) {
    /* generic eggs are unhatchable and have corpsenm of NON_PM */
    if (m_idx < 0)
        return true;
    const alt_idx = egg ? big_to_little(m_idx) : m_idx;
    return ((game.mvitals[m_idx].mvflags & G_GENOD) !== 0
            || (game.mvitals[alt_idx].mvflags & G_GENOD) !== 0);
}

// C ref: mkobj.c mksobj_init()
function mksobj_init(otmp, artif) {
    const let_ = objects[otmp.otyp].oc_class;

    switch (let_) {
    case WEAPON_CLASS:
        otmp.quan = is_multigen(otmp) ? rn1(6, 6) : 1;
        if (!rn2(11)) {
            otmp.spe = rne(3);
            otmp.blessed = rn2(2);
        } else if (!rn2(10)) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else
            blessorcurse(otmp, 10);
        if (is_poisonable(otmp) && !rn2(100))
            otmp.opoisoned = 1;

        if (artif && !rn2(20 + (10 * nartifact_exist()))) {
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            otmp = mk_artifact(otmp, A_NONE, 99, true);
        }
        break;
    case FOOD_CLASS:
        otmp.oeaten = 0;
        switch (otmp.otyp) {
        case O.CORPSE: {
            /* possibly overridden by mkcorpstat() */
            let tryct = 50;
            do
                otmp.corpsenm = undead_to_corpse(rndmonnum());
            while ((game.mvitals[otmp.corpsenm].mvflags & G_NOCORPSE)
                   && (--tryct > 0));
            if (tryct === 0) {
                /* perhaps rndmonnum() only wants to make G_NOCORPSE
                   monsters on this level; create an adventurer's
                   corpse instead, then */
                otmp.corpsenm = PM_HUMAN;
            }
            /* timer set below */
            break;
        }
        case O.EGG:
            otmp.corpsenm = NON_PM; /* generic egg */
            if (!rn2(3))
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = can_be_hatched(rndmonnum());
                    if (mndx !== NON_PM && !dead_species(mndx, true)) {
                        otmp.corpsenm = mndx; /* typed egg */
                        break;
                    }
                }
            /* timer set below */
            break;
        case O.TIN:
            otmp.corpsenm = NON_PM; /* empty (so far) */
            if (!rn2(6))
                set_tin_variety(otmp, SPINACH_TIN);
            else
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse(rndmonnum());
                    if (mons[mndx].cnutrit
                        && !(game.mvitals[mndx].mvflags & G_NOCORPSE)) {
                        otmp.corpsenm = mndx;
                        set_tin_variety(otmp, RANDOM_TIN);
                        break;
                    }
                }
            blessorcurse(otmp, 10);
            break;
        case O.SLIME_MOLD:
            otmp.spe = game.context?.current_fruit || 0;
            game.flags.made_fruit = true;
            break;
        case O.KELP_FROND:
            otmp.quan = rnd(2);
            break;
        case O.CANDY_BAR:
            assign_candy_wrapper(otmp);
            break;
        default:
            break;
        }
        if (Is_pudding(otmp)) {
            otmp.globby = 1;
            otmp.quan = 1;
            otmp.owt = objects[otmp.otyp].oc_weight;
            otmp.known = otmp.dknown = 1;
            /* start_glob_timeout(): no timers yet */
        } else {
            if (otmp.otyp !== O.CORPSE && otmp.otyp !== O.MEAT_RING
                && otmp.otyp !== O.KELP_FROND && !rn2(6)) {
                otmp.quan = 2;
            }
        }
        break;
    case GEM_CLASS:
        otmp.corpsenm = 0; /* LOADSTONE hack */
        if (otmp.otyp === O.LOADSTONE)
            curse(otmp);
        else if (otmp.otyp === O.ROCK)
            otmp.quan = rn1(6, 6);
        else if (otmp.otyp !== O.LUCKSTONE && !rn2(6))
            otmp.quan = 2;
        else
            otmp.quan = 1;
        break;
    case TOOL_CLASS:
        switch (otmp.otyp) {
        case O.TALLOW_CANDLE:
        case O.WAX_CANDLE:
            otmp.spe = 1;
            otmp.age = 20 * objects[otmp.otyp].oc_cost; /* 400 or 200 */
            otmp.lamplit = 0;
            otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
            blessorcurse(otmp, 5);
            break;
        case O.BRASS_LANTERN:
        case O.OIL_LAMP:
            otmp.spe = 1;
            otmp.age = rn1(500, 1000);
            otmp.lamplit = 0;
            blessorcurse(otmp, 5);
            break;
        case O.MAGIC_LAMP:
            otmp.spe = 1;
            otmp.lamplit = 0;
            blessorcurse(otmp, 2);
            break;
        case O.CHEST:
        case O.LARGE_BOX:
            otmp.olocked = !!(rn2(5));
            otmp.otrapped = !(rn2(10));
            otmp.tknown = otmp.otrapped && !rn2(100); /* obvious trap */
            /* FALLTHRU */
        case O.ICE_BOX:
        case O.SACK:
        case O.OILSKIN_SACK:
        case O.BAG_OF_HOLDING:
            mkbox_cnts(otmp);
            break;
        case O.EXPENSIVE_CAMERA:
        case O.TINNING_KIT:
        case O.MAGIC_MARKER:
            otmp.spe = rn1(70, 30);
            break;
        case O.CAN_OF_GREASE:
            otmp.spe = rn1(21, 5); /* 0..20 + 5 => 5..25 */
            blessorcurse(otmp, 10);
            break;
        case O.CRYSTAL_BALL:
            otmp.spe = rn1(5, 3); /* 0..4 + 3 => 3..7 */
            blessorcurse(otmp, 2);
            break;
        case O.HORN_OF_PLENTY:
        case O.BAG_OF_TRICKS:
            otmp.spe = rn1(18, 3); /* 0..17 + 3 => 3..20 */
            break;
        case O.FIGURINE: {
            let tryct = 0;
            /* figurines are slightly harder monsters */
            do
                otmp.corpsenm = rndmonnum_adj(5, 10);
            while (is_human(mons[otmp.corpsenm]) && tryct++ < 30);
            blessorcurse(otmp, 4);
            break;
        }
        case O.BELL_OF_OPENING:
            otmp.spe = 3;
            break;
        case O.MAGIC_FLUTE:
        case O.MAGIC_HARP:
        case O.FROST_HORN:
        case O.FIRE_HORN:
        case O.DRUM_OF_EARTHQUAKE:
            otmp.spe = rn1(5, 4);
            break;
        }
        break;
    case AMULET_CLASS:
        if (otmp.otyp === O.AMULET_OF_YENDOR)
            game.context.made_amulet = true;
        if (rn2(10) && (otmp.otyp === O.AMULET_OF_STRANGULATION
                        || otmp.otyp === O.AMULET_OF_CHANGE
                        || otmp.otyp === O.AMULET_OF_RESTFUL_SLEEP)) {
            curse(otmp);
        } else
            blessorcurse(otmp, 10);
        break;
    case VENOM_CLASS:
    case CHAIN_CLASS:
    case BALL_CLASS:
        break;
    case POTION_CLASS: /* note: potions get some additional init below */
    case SCROLL_CLASS:
        /* SCR_MAIL exists only with MAIL_STRUCTURES, which this build
           does not define */
        blessorcurse(otmp, 4);
        break;
    case SPBOOK_CLASS:
        otmp.spestudied = 0;
        blessorcurse(otmp, 17);
        break;
    case ARMOR_CLASS:
        if (rn2(10)
            && (otmp.otyp === O.FUMBLE_BOOTS
                || otmp.otyp === O.LEVITATION_BOOTS
                || otmp.otyp === O.HELM_OF_OPPOSITE_ALIGNMENT
                || otmp.otyp === O.GAUNTLETS_OF_FUMBLING || !rn2(11))) {
            curse(otmp);
            otmp.spe = -rne(3);
        } else if (!rn2(10)) {
            otmp.blessed = rn2(2);
            otmp.spe = rne(3);
        } else
            blessorcurse(otmp, 10);
        if (artif && !rn2(40 + (10 * nartifact_exist()))) {
            /* mk_artifact() with otmp and A_NONE will never return NULL */
            otmp = mk_artifact(otmp, A_NONE, 99, true);
        }
        /* simulate lacquered armor for samurai */
        if (game.urole.mnum === M.PM_SAMURAI /* Role_if(PM_SAMURAI) */
            && otmp.otyp === O.SPLINT_MAIL
            && ((game.moves ?? 1) <= 1
                || game.u.uz.dnum === game.dungeon_topology.d_quest_dnum)) {
            /* In_quest(&u.uz) */
            otmp.oerodeproof = otmp.rknown = 1;
        }
        break;
    case WAND_CLASS:
        if (otmp.otyp === O.WAN_WISHING)
            otmp.spe = 1;
        else if (otmp.otyp === O.WAN_STASIS)
            /* just as easy to recharge as other NODIR wands, but starts with
               fewer charges */
            otmp.spe = rn1(4, 3);
        else
            otmp.spe = rn1(5,
                           (objects[otmp.otyp].oc_dir === O.NODIR) ? 11 : 4);
        blessorcurse(otmp, 17);
        otmp.recharged = 0; /* used to control recharging */
        break;
    case RING_CLASS:
        if (objects[otmp.otyp].oc_charged) {
            blessorcurse(otmp, 3);
            if (rn2(10)) {
                if (rn2(10) && bcsign(otmp))
                    otmp.spe = bcsign(otmp) * rne(3);
                else
                    otmp.spe = rn2(2) ? rne(3) : -rne(3);
            }
            /* make useless +0 rings much less common */
            if (otmp.spe === 0)
                otmp.spe = rn2(4) - rn2(3);
            /* negative rings are usually cursed */
            if (otmp.spe < 0 && rn2(5))
                curse(otmp);
        } else if (rn2(10) && (otmp.otyp === O.RIN_TELEPORTATION
                               || otmp.otyp === O.RIN_POLYMORPH
                               || otmp.otyp === O.RIN_AGGRAVATE_MONSTER
                               || otmp.otyp === O.RIN_HUNGER || !rn2(9))) {
            curse(otmp);
        }
        break;
    case ROCK_CLASS:
        if (otmp.otyp === O.STATUE) {
            /* possibly overridden by mkcorpstat() */
            otmp.corpsenm = rndmonnum();
            if (!verysmall(mons[otmp.corpsenm])
                && rn2(Math.trunc(level_difficulty() / 2) + 10) > 10) {
                /* add_to_container(): containers are not ported yet */
                const book = mkobj(SPBOOK_no_NOVEL, false);
                (otmp.contents || (otmp.contents = [])).push(book);
            }
        }
        /* boulder init'd below in the 'regardless of !init' code */
        break;
    case COIN_CLASS:
        break; /* do nothing */
    default:
        impossible(`mksobj tried to make type ${otmp.otyp}, class ${objects[otmp.otyp].oc_class}.`);
    }

    mkobj_erosions(otmp);
    if (permapoisoned(otmp))
        otmp.opoisoned = 1;
}

// C ref: mkobj.c mksobj()
/* mksobj(): create a specific type of object; result is always non-Null */
export function mksobj(otyp, init, artif) {
    const let_ = objects[otyp].oc_class;
    let otmp = {
        age: Math.max(game.moves || 0, 1),
        o_id: next_ident(),
        quan: 1,
        oclass: let_,
        otyp,
        where: 'OBJ_FREE',
        corpsenm: -1, /* NON_PM */
        spe: 0, blessed: 0, cursed: 0, oeroded: 0, oeroded2: 0,
        oerodeproof: 0, greased: 0, oartifact: 0, owt: 0,
    };
    unknow_object(otmp); /* set up dknown and known: non-0 for some things */

    if (init)
        mksobj_init(otmp, artif);

    /* some things must get done (corpsenm, timers) even if init = 0 */
    switch ((otmp.oclass === POTION_CLASS && otmp.otyp !== O.POT_OIL)
            ? O.POT_WATER : otmp.otyp) {
    case O.CORPSE:
        if (otmp.corpsenm === NON_PM) {
            otmp.corpsenm = undead_to_corpse(rndmonnum());
            if (game.mvitals[otmp.corpsenm].mvflags & (G_NOCORPSE | G_GONE))
                otmp.corpsenm = game.urole.mnum;
        }
        /*FALLTHRU*/
    case O.STATUE:
    case O.FIGURINE:
        if (otmp.corpsenm === NON_PM)
            otmp.corpsenm = rndmonnum();
        if (otmp.corpsenm !== NON_PM) {
            const ptr = mons[otmp.corpsenm];

            otmp.spe = (is_neuter(ptr) ? CORPSTAT_NEUTER
                        : is_female(ptr) ? CORPSTAT_FEMALE
                          : is_male(ptr) ? CORPSTAT_MALE
                            : rn2(2) ? CORPSTAT_FEMALE : CORPSTAT_MALE);
        }
        /*FALLTHRU*/
    case O.EGG:
        set_corpsenm(otmp, otmp.corpsenm);
        break;
    case O.BOULDER:
        otmp.next_boulder = 0;
        break;
    case O.POT_OIL:
        otmp.age = 400; /* MAX_OIL_IN_FLASK: amount of oil */
        otmp.fromsink = 0;
        break;
    case O.POT_WATER: /* POTION_CLASS */
        otmp.fromsink = 0; /* overloads corpsenm, which was set to NON_PM */
        break;
    case O.LEASH:
        otmp.leashmon = 0; /* overloads corpsenm, which was set to NON_PM */
        break;
    case O.SPE_NOVEL: {
        otmp.novelidx = -1; /* "none of the above"; will be changed */
        const novidx = { v: otmp.novelidx };
        const title = noveltitle(novidx);
        otmp.novelidx = novidx.v;
        /* otmp = oname(otmp, title, ONAME_NO_FLAGS): a novel is never an
           artifact (no artilist[] entry has otyp SPE_NOVEL), so oname()
           only does new_oname() + Strcpy(ONAME(otmp), title) */
        otmp.oname = title;
        break;
    }
    }

    /* unique objects may have an associated artifact entry */
    if (objects[otyp].oc_unique && !otmp.oartifact) {
        /* mk_artifact() with otmp and A_NONE will never return NULL */
        otmp = mk_artifact(otmp, A_NONE, 99, false);
    }
    otmp.owt = weight(otmp);
    return otmp;
}

// C ref: mkobj.c mk_tt_object()
/* make an object named after someone listed in the scoreboard file;
   never returns Null */
export function mk_tt_object(
    objtype, /* CORPSE or STATUE */
    x, y)
{
    /* player statues never contain books */
    const initialize_it = (objtype !== O.STATUE);
    const otmp = mksobj_at(objtype, x, y, initialize_it, false);

    /* tt_oname() will return null if the scoreboard is empty, which in
       turn leaves the random corpsenm value; force it to match a player */
    if (!tt_oname(otmp)) {
        const pm = rn1(M.PM_WIZARD - M.PM_ARCHEOLOGIST + 1, M.PM_ARCHEOLOGIST);

        /* update weight for either, force timer sanity for corpses */
        set_corpsenm(otmp, pm);
    }

    return otmp;
}

// C ref: mkobj.c mkgold()
export function mkgold(amount, x, y) {
    /* g_at(x, y): floor objects are not tracked yet; mklev.js recorded
       gold amounts per location in game.level.gold_at */
    if (!game.level.gold_at) game.level.gold_at = new Map();
    const key = `${x},${y}`;
    let gold = game.level.gold_at.get(key) || null;

    if (amount <= 0) {
        const mul = rnd(Math.trunc(30 / Math.max(12 - depth(game.u.uz), 2)));

        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    if (gold) {
        gold.quan += amount;
    } else {
        gold = mksobj_at(O.GOLD_PIECE, x, y, true, false);
        gold.quan = amount;
        game.level.gold_at.set(key, gold);
    }
    gold.owt = objects[O.GOLD_PIECE].oc_weight; /* weight(gold) */
    return gold;
}
