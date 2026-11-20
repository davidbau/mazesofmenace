// dogmove.js — pet movement: dog_move(), dog_goal(), dog_invent(),
// dogfood() and helpers.
// C ref: dogmove.c, dog.c dogfood(), zap.c obj_resists()
//
// Branches that need code no session reaches yet throw a
// 'not ported yet' error instead of skipping their rolls.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import { dist2, distmin } from './hacklib.js';
import { cansee, couldsee, clear_path } from './vision.js';
import { m_at, MON_AT, place_monster, is_pool, is_lava, sobj_at, u_at,
         may_passwall } from './makemon.js';
import { t_at } from './trap.js';
import { mattackm, max_passive_dmg } from './mhitm.js';
import { mfndpos, monnear, mon_allowflags } from './mon.js';
import { gettrack } from './track.js';
import { onscary, should_displace, m_avoid_kicked_loc, mon_track_add,
         canseemon } from './monmove.js';
import { monsndx, is_swimmer, passes_walls, haseyes, perceives, is_undead,
         is_elf, is_vampshifter } from './mondata.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import * as O from './objects.js';
import { objects } from './objects.js';
import { splitobj, obj_extract_self } from './mkobj.js';
import { mpickobj, relobj } from './steal.js';
import { distant_name, doname } from './objnam.js';
import { newsym, pline } from './display.js';
import { Monnam } from './mhitm.js';
import {
    MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE, MTSZ,
    M_ATTK_MISS, M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED,
    ALLOW_U, ALLOW_M, ALLOW_MDISP, ALLOW_TRAPS, COLNO, ROWNO,
    DOGFOOD, CADAVER, ACCFOOD, MANFOOD, APPORT, POISON, UNDEF, TABU,
    IS_ROOM, IS_DOOR, IS_OBSTRUCTED, IS_STWALL, IS_TREE, W_NONDIGGABLE,
    D_CLOSED, D_LOCKED, CONFLICT, NON_PM, isok, MAGIC_PORTAL, W_ARMG,
    NEED_WEAPON, I_SPECIAL, W_ARMS,
} from './const.js';

/* monster inventory: makemon.js keeps mon->minvent as an array in pickup
   order; C prepends, so walk it newest first */
function minv(mon) { return (mon.minvent || []).slice().reverse(); }

const DOG_HUNGRY = 300;
const DOG_WEAK = 500;
const DOG_STARVE = 750;

/* mondata.h */
function carnivorous(ptr) { return (ptr.mflags1 & M.M1_CARNIVORE) !== 0; }
function herbivorous(ptr) { return (ptr.mflags1 & M.M1_HERBIVORE) !== 0; }
function is_animal(ptr) { return (ptr.mflags1 & M.M1_ANIMAL) !== 0; }
function mindless(ptr) { return (ptr.mflags1 & M.M1_MINDLESS) !== 0; }
function tunnels(ptr) { return (ptr.mflags1 & M.M1_TUNNEL) !== 0; }
function throws_rocks(ptr) { return (ptr.mflags2 & M.M2_ROCKTHROW) !== 0; }
function metallivorous(ptr) { return (ptr.mflags1 & M.M1_METALLIVORE) !== 0; }
function humanoid(ptr) { return (ptr.mflags1 & M.M1_HUMANOID) !== 0; }
// C ref: mondata.c attacktype()
function attacktype(ptr, atyp) {
    return ptr.mattk.some((a) => a.aatyp === atyp);
}
// C ref: mon.c check_gear_next_turn()
function check_gear_next_turn(mon) {
    mon.misc_worn_check = (mon.misc_worn_check || 0) | I_SPECIAL;
}
function acidic(ptr) { return (ptr.mflags1 & M.M1_ACID) !== 0; }
function poisonous(ptr) { return (ptr.mflags1 & M.M1_POIS) !== 0; }
function likes_lava(ptr) {
    return ptr === mons[M.PM_FIRE_ELEMENTAL] || ptr === mons[M.PM_SALAMANDER];
}
function likes_fire(ptr) {
    return ptr === mons[M.PM_FIRE_VORTEX] || ptr === mons[M.PM_FLAMING_SPHERE]
        || likes_lava(ptr);
}
function is_rider(ptr) {
    const n = monsndx(ptr);
    return n === M.PM_DEATH || n === M.PM_FAMINE || n === M.PM_PESTILENCE;
}
/* C ref: mondata.h vegan() */
function vegan(ptr) {
    return (ptr.mlet === M.S_BLOB || ptr.mlet === M.S_JELLY
            || ptr.mlet === M.S_FUNGUS || ptr.mlet === M.S_VORTEX
            || ptr.mlet === M.S_LIGHT
            || ((ptr.mlet === M.S_ELEMENTAL && ptr !== mons[M.PM_STALKER]))
            || (ptr.mlet === M.S_GOLEM && ptr !== mons[M.PM_FLESH_GOLEM]
                && ptr !== mons[M.PM_LEATHER_GOLEM])
            || ptr.mlet === M.S_GHOST /* noncorporeal() */);
}
/* C ref: mondata.h resists_poison()/resists_ston()/resists_acid() */
function mresists(mon, mr) {
    return (((mon.data.mresists | (mon.mextrinsics ?? 0)) & mr) !== 0);
}
/* C ref: monst.h helpless() */
function helpless(mon) { return !!(mon.msleeping || !mon.mcanmove); }
function Conflict() {
    const p = game.u.uprops[CONFLICT];
    return !!(p.intrinsic || p.extrinsic);
}
function distu(x, y) { return dist2(x, y, game.u.ux, game.u.uy); }
/* C ref: hack.c may_dig() */
function may_dig(x, y) {
    const lev = game.level.at(x, y);
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && ((lev.wall_info ?? 0) & W_NONDIGGABLE));
}
/* C ref: stairs.c On_stairs() */
function On_stairs(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return true;
    return false;
}

/* floor objects: game.level.objects is fobj (newest first); a square's
   pile is read from it in the same order */
function fobj_list() { return game.level.objects || []; }
function objects_at(x, y) {
    return fobj_list().filter(o => o.ox === x && o.oy === y);
}

// ── C ref: zap.c obj_resists() ──
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === O.AMULET_OF_YENDOR
        || obj.otyp === O.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === O.CANDELABRUM_OF_INVOCATION
        || obj.otyp === O.BELL_OF_OPENING
        || (obj.otyp === O.CORPSE && is_rider(mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);

        return (chance < (obj.oartifact ? achance : ochance));
    }
}

/* C ref: artifact.c is_quest_artifact() */
function is_quest_artifact(otmp) {
    return !!(otmp.oartifact && otmp.oartifact === game.urole.questarti);
}

/* C ref: mkobj.c peek_at_iced_corpse_age() */
function peek_at_iced_corpse_age(otmp) {
    if (otmp.on_ice)
        throw new Error('peek_at_iced_corpse_age(): iced corpses not ported yet');
    return otmp.age ?? 0;
}

// ── C ref: dog.c dogfood() ──
// return quality of food; the lower the better
export function dogfood(mon, obj) {
    const mptr = mon.data;
    const carni = carnivorous(mptr), herbi = herbivorous(mptr);
    let fptr, fx;

    if (obj.opoisoned && !mresists(mon, M.MR_POISON))
        return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    switch (obj.oclass) {
    case O.FOOD_CLASS: {
        fx = (obj.otyp === O.CORPSE || obj.otyp === O.TIN || obj.otyp === O.EGG)
                /* corpsenm might be NON_PM (special tin, unhatchable egg) */
                ? obj.corpsenm
                : NON_PM;
        /* mons[NUMMONS] is a valid array entry, though not a valid
           monster; predicate tests against it will fail */
        fptr = (fx !== undefined && fx >= 0 && fx < M.NUMMONS) ? mons[fx]
               : null;
        const fp = fptr || { mlet: 0, mflags1: 0, mflags2: 0, mresists: 0 };

        if (obj.otyp === O.CORPSE && fptr && is_rider(fptr))
            return TABU;
        if ((obj.otyp === O.CORPSE || obj.otyp === O.EGG)
            && fptr && (fx === M.PM_COCKATRICE || fx === M.PM_CHICKATRICE
                        || fx === M.PM_MEDUSA) /* flesh_petrifies() */
            && !mresists(mon, M.MR_STONE))
            return POISON;
        if (obj.otyp === O.LUMP_OF_ROYAL_JELLY
            && mon.data === mons[M.PM_KILLER_BEE])
            throw new Error('dogfood(): find_pmmonst() not ported yet');
        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;

        /* a starving pet will eat almost anything */
        const starving = (mon.mtame && !mon.isminion
                          && mon.edog.mhpmax_penalty);
        /* even carnivores will eat carrots if they're temporarily blind */
        const mblind = (!mon.mcansee && haseyes(mon.data));

        /* ghouls prefer old corpses and unhatchable eggs, yum! */
        if (mptr === mons[M.PM_GHOUL])
            throw new Error('dogfood(): ghoul pets not ported yet');

        switch (obj.otyp) {
        case O.TRIPE_RATION:
        case O.MEATBALL:
        case O.MEAT_RING:
        case O.MEAT_STICK:
        case O.ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case O.EGG:
            if (obj.corpsenm === M.PM_PYROLISK && !likes_fire(mptr))
                return POISON;
            return carni ? CADAVER : MANFOOD;
        case O.CORPSE:
            if ((peek_at_iced_corpse_age(obj) + 50 <= game.moves
                 && !(fx === M.PM_LIZARD || fx === M.PM_LICHEN)
                 && mptr.mlet !== M.S_FUNGUS)
                || (acidic(fp) && !mresists(mon, M.MR_ACID))
                || (poisonous(fp) && !mresists(mon, M.MR_POISON)))
                return POISON;
            /* avoid polymorph unless starving or abused */
            else if ((fp.mflags2 & M.M2_SHAPESHIFTER) /* polyfood() */)
                throw new Error('dogfood(): polyfood() not ported yet');
            else if (vegan(fp))
                return herbi ? CADAVER : MANFOOD;
            /* most humanoids will avoid cannibalism unless starving */
            else if (humanoid(mptr))
                throw new Error('dogfood(): same_race() not ported yet');
            else
                return carni ? CADAVER : MANFOOD;
        case O.GLOB_OF_GREEN_SLIME: /* other globs use the default case */
            throw new Error('dogfood(): slimeproof() not ported yet');
        case O.CLOVE_OF_GARLIC:
            return (is_undead(mptr) || is_vampshifter(mon)) ? TABU
                   : (herbi || starving) ? ACCFOOD
                     : MANFOOD;
        case O.TIN:
            return metallivorous(mptr) ? ACCFOOD : MANFOOD;
        case O.APPLE:
            return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case O.CARROT:
            return (herbi || mblind) ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case O.BANANA:
            return (mptr.mlet === M.S_YETI && herbi) ? DOGFOOD
                   : (herbi || starving) ? ACCFOOD
                     : MANFOOD;
        default:
            if (starving)
                return ACCFOOD;
            return (obj.otyp > O.SLIME_MOLD) ? (carni ? ACCFOOD : MANFOOD)
                                             : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    default:
        if (obj.otyp === O.AMULET_OF_STRANGULATION
            || obj.otyp === O.RIN_SLOW_DIGESTION)
            return TABU;
        if (objects[obj.otyp].oc_material === O.SILVER
            && (is_vampshifter(mon) || is_undead(mptr) || mptr.mlet === M.S_IMP
                || (mptr.mflags2 & M.M2_DEMON) || (mptr.mflags2 & M.M2_WERE)
                || mptr === mons[M.PM_SHADE] || mptr.mlet === M.S_VAMPIRE))
            throw new Error('dogfood(): mon_hates_silver() not ported yet');
        if (mptr === mons[M.PM_GELATINOUS_CUBE])
            throw new Error('dogfood(): is_organic() not ported yet');
        if (metallivorous(mptr))
            throw new Error('dogfood(): is_metallic() not ported yet');
        if (!obj.cursed
            && obj.oclass !== O.BALL_CLASS
            && obj.oclass !== O.CHAIN_CLASS)
            return APPORT;
        /*FALLTHRU*/
    case O.ROCK_CLASS:
        return UNDEF;
    }
}

// C ref: mkobj.c weight() -- obj->owt as C maintains it; container
// contents aren't tracked yet (callers only need a lower bound there)
function obj_weight(obj) {
    const wt = objects[obj.otyp].oc_weight;
    if (obj.otyp === O.CORPSE && obj.corpsenm >= 0) {
        const long_wt = obj.quan * mons[obj.corpsenm].cwt;
        if (obj.oeaten)
            throw new Error('weight(): eaten_stat() not ported yet');
        return (long_wt > 32767) ? 32767 : long_wt;
    } else if (obj.oclass === O.FOOD_CLASS && obj.oeaten) {
        throw new Error('weight(): eaten_stat() not ported yet');
    } else if (obj.oclass === O.COIN_CLASS) {
        return Math.trunc((obj.quan + 50) / 100);
    } else if (obj.otyp === O.CANDELABRUM_OF_INVOCATION && obj.spe) {
        throw new Error('weight(): candelabrum not ported yet');
    }
    return (wt ? wt * obj.quan : (obj.quan + 1) >> 1);
}

/* C ref: mondata.h strongmonst() */
function strongmonst(ptr) { return (ptr.mflags2 & M.M2_STRONG) !== 0; }

// ── C ref: mon.c curr_mon_load() ──
export function curr_mon_load(mtmp) {
    let curload = 0;

    for (const obj of minv(mtmp)) {
        if (obj.otyp !== O.BOULDER || !throws_rocks(mtmp.data))
            curload += obj_weight(obj);
    }

    return curload;
}

// ── C ref: mon.c max_mon_load() ──
export function max_mon_load(mtmp) {
    const MAX_CARR_CAP = 1000, WT_HUMAN = 1450;
    let maxload;

    if (!mtmp.data.cwt)
        maxload = Math.trunc((MAX_CARR_CAP * mtmp.data.msize) / M.MZ_HUMAN);
    else if (!strongmonst(mtmp.data)
             || (strongmonst(mtmp.data) && (mtmp.data.cwt > WT_HUMAN)))
        maxload = Math.trunc((MAX_CARR_CAP * mtmp.data.cwt) / WT_HUMAN);
    else
        maxload = MAX_CARR_CAP; /*strong monsters w/cwt <= WT_HUMAN*/

    if (!strongmonst(mtmp.data))
        maxload = Math.trunc(maxload / 2);

    if (maxload < 1)
        maxload = 1;

    return maxload;
}

// ── C ref: mon.c can_touch_safely() ──
export function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp;

    if (otyp === O.CORPSE && (otmp.corpsenm === M.PM_COCKATRICE
                              || otmp.corpsenm === M.PM_CHICKATRICE)
        && !((mtmp.misc_worn_check ?? 0) & W_ARMG) && !mresists(mtmp, M.MR_STONE))
        return false;
    if (otyp === O.CORPSE && is_rider(mons[otmp.corpsenm]))
        return false;
    if (objects[otyp].oc_material === O.SILVER)
        throw new Error('can_touch_safely(): mon_hates_silver() not ported yet');
    if (otmp.oartifact)
        throw new Error('can_touch_safely(): touch_artifact() not ported yet');
    return true;
}

// ── C ref: mon.c can_carry() ──
export function can_carry(mtmp, otmp) {
    const u = game.u;
    const otyp = otmp.otyp;
    const mdat = mtmp.data;
    let newload;

    if ((mdat.mflags1 & M.M1_NOTAKE) !== 0)
        return 0; /* can't carry anything */

    if (!can_touch_safely(mtmp, otmp))
        return 0;

    /* hostile monsters who like gold will pick up the whole stack;
       tame monsters with hands will pick up the partial stack */
    const iquan = (otmp.quan > 32767 /* LARGEST_INT */)
               ? 20000 + rn2(32767 - 20000 + 1)
               : otmp.quan;

    /* monsters without hands can't pick up multiple objects at once
     * unless they have an engulfing attack
     *
     * ...dragons, of course, can always carry gold pieces and gems somehow
     */
    if (iquan > 1) {
        let glomper = false;

        if (mtmp.data.mlet === M.S_DRAGON
            && (otmp.oclass === O.COIN_CLASS
                || otmp.oclass === O.GEM_CLASS))
            glomper = true;
        else
            for (const a of mtmp.data.mattk)
                if (a.aatyp === M.AT_ENGL) {
                    glomper = true;
                    break;
                }
        if ((mtmp.data.mflags1 & M.M1_NOHANDS) && !glomper)
            return 1;
    }

    /* steeds don't pick up stuff (to avoid shop abuse) */
    if (mtmp === u.usteed)
        return 0;
    if (mtmp.isshk)
        return iquan; /* no limit */
    if (mtmp.mpeaceful && !mtmp.mtame)
        return 0;

    /* special--boulder throwers carry unlimited amounts of boulders */
    if (throws_rocks(mdat) && otyp === O.BOULDER)
        return iquan;

    /* nymphs deal in stolen merchandise, but not boulders or statues */
    if (mdat.mlet === M.S_NYMPH)
        return (otmp.oclass === O.ROCK_CLASS) ? 0 : iquan;

    /* newload = otmp->owt */
    const is_container = (otyp >= O.LARGE_BOX && otyp <= O.BAG_OF_TRICKS);
    if (is_container || otyp === O.STATUE) {
        /* contents only add weight: if the empty container is already
           too heavy the answer doesn't depend on them */
        newload = (otyp === O.STATUE) ? 0 : objects[otyp].oc_weight;
        if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp))
            return 0;
        throw new Error('can_carry(): container/statue weight() not ported yet');
    }
    newload = obj_weight(otmp);
    if (curr_mon_load(mtmp) + newload > max_mon_load(mtmp))
        return 0;

    return iquan;
}

// ── C ref: dogmove.c droppables() ──
export function droppables(mon) {
    /*
     * 'key|pickaxe|&c = &dummy' is used to make various creatures
     * that can't use a key/pick-axe/&c behave as if they are already
     * holding one so that any other such item in their inventory will
     * be considered a duplicate and get treated as a normal candidate
     * for dropping.
     */
    const dummy = { otyp: O.GOLD_PIECE, /* not STRANGE_OBJECT or tools of interest */
                    oartifact: 1 }; /* so real artifact won't override "don't keep it" */
    let pickaxe = null, unihorn = null, key = null;

    const wep = mon.mw || null; /* MON_WEP() */
    const mdat = mon.data;
    if (is_animal(mdat) || mindless(mdat)) {
        /* won't hang on to any objects of these types */
        pickaxe = unihorn = key = dummy; /* act as if already have them */
    } else {
        /* don't hang on to pick-axe if can't use one or don't need one */
        if (!tunnels(mdat) || !(mdat.mflags1 & M.M1_NEEDPICK))
            pickaxe = dummy;
        /* don't hang on to key if can't open doors */
        if ((mdat.mflags1 & M.M1_NOHANDS) || mdat.msize < M.MZ_SMALL)
            key = dummy;
    }
    if (wep) {
        if (wep.otyp === O.PICK_AXE || wep.otyp === O.DWARVISH_MATTOCK) /* is_pick() */
            pickaxe = wep;
        if (wep.otyp === O.UNICORN_HORN)
            unihorn = wep;
        /* don't need any wielded check for keys... */
    }
    for (const obj of minv(mon)) {
        let keep = false;
        switch (obj.otyp) {
        case O.DWARVISH_MATTOCK:
        case O.PICK_AXE:
            if (obj.otyp === O.DWARVISH_MATTOCK) {
                /* reject mattock if couldn't wield it */
                if ((mon.minvent || []).some(o => o.owornmask & W_ARMS))
                    break;
                /* keep mattock in preference to pick unless pick is already
                   wielded or is an artifact and mattock isn't */
                if (pickaxe && pickaxe.otyp === O.PICK_AXE && pickaxe !== wep
                    && (!pickaxe.oartifact || obj.oartifact))
                    return pickaxe; /* drop the one we earlier decided to keep */
            }
            /*FALLTHRU*/
            if (!pickaxe || (obj.oartifact && !pickaxe.oartifact)) {
                if (pickaxe)
                    return pickaxe;
                pickaxe = obj; /* keep this digging tool */
                keep = true;
            }
            break;
        case O.UNICORN_HORN:
            /* reject cursed unicorn horns */
            if (obj.cursed)
                break;
            /* keep artifact unihorn in preference to ordinary one */
            if (!unihorn || (obj.oartifact && !unihorn.oartifact)) {
                if (unihorn)
                    return unihorn;
                unihorn = obj; /* keep this unicorn horn */
                keep = true;
            }
            break;
        case O.SKELETON_KEY:
        case O.LOCK_PICK:
        case O.CREDIT_CARD:
            if (obj.otyp === O.SKELETON_KEY) {
                /* keep key in preference to lock-pick */
                if (key && key.otyp === O.LOCK_PICK
                    && (!key.oartifact || obj.oartifact))
                    return key; /* drop the one we earlier decided to keep */
            }
            /*FALLTHRU*/
            if (obj.otyp !== O.CREDIT_CARD) {
                /* keep lock-pick in preference to credit card */
                if (key && key.otyp === O.CREDIT_CARD
                    && (!key.oartifact || obj.oartifact))
                    return key;
            }
            /*FALLTHRU*/
            if (!key || (obj.oartifact && !key.oartifact)) {
                if (key)
                    return key;
                key = obj; /* keep this unlocking tool */
                keep = true;
            }
            break;
        default:
            break;
        }
        if (keep)
            continue;
        if (!obj.owornmask && obj !== wep)
            return obj;
    }
    return null; /* don't drop anything */
}

// ── C ref: dogmove.c cursed_object_at() ──
function cursed_object_at(x, y) {
    for (const otmp of objects_at(x, y))
        if (otmp.cursed)
            return true;
    return false;
}

// ── C ref: dogmove.c dog_hunger() ──
function dog_hunger(mtmp, edog) {
    if (game.moves > edog.hungrytime + DOG_WEAK) {
        if (!carnivorous(mtmp.data) && !herbivorous(mtmp.data)) {
            edog.hungrytime = game.moves + DOG_WEAK;
            /* but not too high; it might polymorph */
        } else
            throw new Error('dog_hunger(): hungry pets not ported yet');
    }
    return false;
}

// ── C ref: dogmove.c dog_invent() ──
// do something with object (drop, pick up, eat) at current position
async function dog_invent(mtmp, edog, udist) {
    if (helpless(mtmp) || mtmp.meating)
        return 0;

    const omx = mtmp.mx, omy = mtmp.my;

    /* If we are carrying something then we drop it (perhaps near @). */
    /* Note: if apport == 1 then our behavior is independent of udist.
     * Use udist+1 so steed won't cause divide by zero. */
    if (droppables(mtmp)) {
        if (!rn2(udist + 1) || !rn2(edog.apport))
            if (rn2(10) < edog.apport) {
                await relobj(mtmp, mtmp.minvis ? 1 : 0, true);
                if (edog.apport > 1)
                    edog.apport--;
                edog.dropdist = udist; /* hpscdi!jon */
                edog.droptime = game.moves;
            }
    } else {
        const here = objects_at(omx, omy);
        const obj = here[0];
        if (obj
            && !(obj.oclass === O.BALL_CLASS || obj.oclass === O.CHAIN_CLASS
                 || obj.oclass === O.ROCK_CLASS) /* nofetch[] */
            /* avoid special items (is_mines_prize/is_soko_prize): those
               levels aren't ported yet */) {
            const edible = dogfood(mtmp, obj);

            if ((edible <= CADAVER
                 /* starving pet is more aggressive about eating */
                 || (edog.mhpmax_penalty && edible === ACCFOOD))
                && could_reach_item(mtmp, obj.ox, obj.oy))
                throw new Error('dog_invent(): dog_eat() not ported yet');

            const carryamt = can_carry(mtmp, obj);
            if (carryamt > 0 && !obj.cursed
                && could_reach_item(mtmp, obj.ox, obj.oy)) {
                if (rn2(20) < edog.apport + 3) {
                    if (rn2(udist) || !rn2(edog.apport)) {
                        let otmp = obj;
                        if (carryamt !== obj.quan)
                            otmp = splitobj(obj, carryamt);
                        if (cansee(omx, omy)) {
                            /* call distant_name() for possible side-effects
                               even if the result won't be printed; should be
                               done before extract+pickup while otmp is still
                               on floor */
                            const otmpname = distant_name(otmp, doname);

                            if (game.flags?.verbose)
                                await pline(`${Monnam(mtmp)} picks up ${otmpname}.`);
                        }
                        obj_extract_self(otmp);
                        newsym(omx, omy);
                        mpickobj(mtmp, otmp);
                        if (attacktype(mtmp.data, M.AT_WEAP)
                            && mtmp.weapon_check === NEED_WEAPON)
                            throw new Error('dog_invent(): mon_wield_item() not ported yet');
                        check_gear_next_turn(mtmp);
                    }
                }
            }
        }
    }
    return 0;
}

// ── C ref: dogmove.c could_reach_item() ──
export function could_reach_item(mon, nx, ny) {
    if ((!is_pool(nx, ny) || is_swimmer(mon.data))
        && (!is_lava(nx, ny) || likes_lava(mon.data))
        && (!sobj_at(O.BOULDER, nx, ny) || throws_rocks(mon.data)))
        return true;
    return false;
}

// ── C ref: dogmove.c can_reach_location() ──
function can_reach_location(mon, mx, my, fx, fy) {
    if (mx === fx && my === fy)
        return true;
    if (!isok(mx, my))
        return false; /* should not happen */

    const dist = dist2(mx, my, fx, fy);
    for (let i = mx - 1; i <= mx + 1; i++) {
        for (let j = my - 1; j <= my + 1; j++) {
            if (!isok(i, j))
                continue;
            if (dist2(i, j, fx, fy) >= dist)
                continue;
            const lev = game.level.at(i, j);
            if (IS_OBSTRUCTED(lev.typ) && !passes_walls(mon.data)
                && (!may_dig(i, j) || !tunnels(mon.data)))
                continue;
            if (IS_DOOR(lev.typ)
                && ((lev.doormask ?? 0) & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(mon, i, j))
                continue;
            if (can_reach_location(mon, i, j, fx, fy))
                return true;
        }
    }
    return false;
}

// ── C ref: dogmove.c dog_goal() ──
// set dog's goal -- gtyp, gx, gy;
// returns -1/0/1 (dog's desire to approach player) or -2 (abort move)
function dog_goal(mtmp, edog, after, udist, whappr) {
    const u = game.u;
    const gg = game.gg || (game.gg = { gtyp: 0, gx: 0, gy: 0 });
    let appr;

    /* Steeds don't move on their own will */
    if (mtmp === u.usteed)
        return -2;

    const omx = mtmp.mx, omy = mtmp.my;

    const in_masters_sight = couldsee(omx, omy);
    const dog_has_minvent = (droppables(mtmp) !== null);

    if (!edog || mtmp.mleashed) { /* he's not going anywhere... */
        gg.gtyp = APPORT;
        gg.gx = u.ux;
        gg.gy = u.uy;
    } else {
        const DDIST = (x, y) => dist2(x, y, omx, omy);
        const SQSRCHRADIUS = 5;
        let min_x, max_x, min_y, max_y;

        gg.gtyp = UNDEF; /* no goal as yet */
        gg.gx = gg.gy = 0;  /* suppress 'used before set' message */

        if ((min_x = omx - SQSRCHRADIUS) < 1)
            min_x = 1;
        if ((max_x = omx + SQSRCHRADIUS) >= COLNO)
            max_x = COLNO - 1;
        if ((min_y = omy - SQSRCHRADIUS) < 0)
            min_y = 0;
        if ((max_y = omy + SQSRCHRADIUS) >= ROWNO)
            max_y = ROWNO - 1;

        /* nearby food is the first choice, then other objects */
        for (const obj of fobj_list().slice()) {
            const nx = obj.ox;
            const ny = obj.oy;
            if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
                const otyp = dogfood(mtmp, obj);
                /* skip inferior goals */
                if (otyp > gg.gtyp || otyp === UNDEF)
                    continue;
                /* avoid cursed items unless starving */
                if (cursed_object_at(nx, ny)
                    && !(edog.mhpmax_penalty && otyp < MANFOOD))
                    continue;
                /* skip completely unreachable goals */
                if (!could_reach_item(mtmp, nx, ny)
                    || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny))
                    continue;
                if (otyp < MANFOOD) {
                    if (otyp < gg.gtyp
                        || DDIST(nx, ny) < DDIST(gg.gx, gg.gy)) {
                        gg.gx = nx;
                        gg.gy = ny;
                        gg.gtyp = otyp;
                    }
                } else if (gg.gtyp === UNDEF && in_masters_sight
                           && !dog_has_minvent
                           && (!game.level.at(omx, omy).lit
                               || game.level.at(u.ux, u.uy).lit)
                           && (otyp === MANFOOD
                               || clear_path(mtmp.mx, mtmp.my, nx, ny)) /* m_cansee */
                           && edog.apport > rn2(8)
                           && can_carry(mtmp, obj) > 0) {
                    gg.gx = nx;
                    gg.gy = ny;
                    gg.gtyp = APPORT;
                }
            }
        }
    }

    /* follow player if appropriate */
    if (gg.gtyp === UNDEF || (gg.gtyp !== DOGFOOD && gg.gtyp !== APPORT
                              && game.moves < edog.hungrytime)) {
        gg.gx = u.ux;
        gg.gy = u.uy;
        if (after && udist <= 4 && u_at(gg.gx, gg.gy))
            return -2;
        appr = (udist >= 9) ? 1 : (mtmp.mflee) ? -1 : 0;
        if (udist > 1) {
            if (!IS_ROOM(game.level.at(u.ux, u.uy).typ) || !rn2(4) || whappr
                || (dog_has_minvent && rn2(edog.apport)))
                appr = 1;
        }
        /* if you have dog food it'll follow you more closely; if you are
           on stairs (or ladder) or on or next to a magic portal, it will
           behave as if you have dog food */
        if (appr === 0) {
            if (On_stairs(u.ux, u.uy)) {
                appr = 1;
            } else {
                for (let obj = game.invent; obj; obj = obj.nobj)
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                if (appr === 0) {
                    /* assume at most one magic portal per level */
                    for (const t of game.level.traps || [])
                        if (t.ttyp === MAGIC_PORTAL) {
                            if (distu(t.tx, t.ty) <= 2)
                                appr = 1;
                            break;
                        }
                }
            }
        }
    } else
        appr = 1; /* gtyp != UNDEF */
    if (mtmp.mconf)
        appr = 0;

    const FARAWAY = COLNO + 2; /* position outside screen */
    if (u_at(gg.gx, gg.gy) && !in_masters_sight) {
        const cp = gettrack(omx, omy);
        if (cp) {
            gg.gx = cp.x;
            gg.gy = cp.y;
            if (edog)
                edog.ogoal.x = 0;
        } else {
            /* assume master hasn't moved far, and reuse previous goal */
            if (edog && edog.ogoal.x
                && (edog.ogoal.x !== omx || edog.ogoal.y !== omy)) {
                gg.gx = edog.ogoal.x;
                gg.gy = edog.ogoal.y;
                edog.ogoal.x = 0;
            } else {
                throw new Error('dog_goal(): do_clear_area(wantdoor) not ported yet');
            }
        }
    } else if (edog) {
        edog.ogoal.x = 0;
    }
    return appr;
}

// ── C ref: dogmove.c find_targ() ──
function find_targ(mtmp, dx, dy, maxdist) {
    let targ = null;
    let curx = mtmp.mx, cury = mtmp.my;

    for (let dist = 0; dist < maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury))
            break;

        /* FIXME: Check if we hit a wall/door/boulder to
         *        short-circuit unnecessary subsequent checks
         */

        /* If we can't see up to here, forget it - will this
         * mean pets in corridors don't breathe at monsters
         * in rooms? If so, is that necessarily bad?
         */
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) /* m_cansee() */
            break;

        if (curx === mtmp.mux && cury === mtmp.muy)
            return game.youmonst;

        if ((targ = m_at(curx, cury)) !== null) {
            /* Is the monster visible to the pet? */
            if ((!targ.minvis || perceives(mtmp.data)) && !targ.mundetected
                && targ.mx === curx && targ.my === cury) /* not tail */
                break;
            /* If the pet can't see it, it assumes it aint there */
            targ = null;
        }
    }
    return targ;
}

// ── C ref: dogmove.c find_friends() ──
function find_friends(mtmp, mtarg, maxdist) {
    const dx = Math.sign(mtarg.mx - mtmp.mx),
          dy = Math.sign(mtarg.my - mtmp.my);
    let curx = mtarg.mx, cury = mtarg.my;
    let dist = distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my);

    for ( ; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;

        if (!isok(curx, cury))
            return 0;

        /* If the pet can't see beyond this point, don't
         * check any farther
         */
        if (!clear_path(mtmp.mx, mtmp.my, curx, cury)) /* m_cansee() */
            return 0;

        /* Does pet think you're here? */
        if (mtmp.mux === curx && mtmp.muy === cury)
            return 1;

        const pal = m_at(curx, cury);

        if (pal) {
            if (pal.mtame) {
                /* Pet won't notice invisible pets */
                if (!pal.minvis || perceives(mtmp.data))
                    return 1;
            } else {
                /* Quest leaders and guardians are always seen */
                if (pal.data.msound === M.MS_LEADER
                    || pal.data.msound === M.MS_GUARDIAN)
                    return 1;
            }
        }
    }
    return 0;
}

// ── C ref: dogmove.c score_targ() ──
function score_targ(mtmp, mtarg) {
    const u = game.u;
    let score = 0;

    /* If the monster is confused, normal scoring is disrupted -
     * anything may happen
     */

    /* Give 1 in 3 chance of safe breathing even if pet is confused or
     * if you're on the quest start level */
    if (!mtmp.mconf || !rn2(3) || false /* Is_qstart(&u.uz) */) {
        let mtmp_lev;
        const youmonst = (mtarg === game.youmonst);

        if (mtmp.isminion || mtmp.ispriest || mtarg.isminion || mtarg.ispriest)
            throw new Error('score_targ(): minion/priest alignment not ported yet');

        /* Never target quest friendlies */
        if (!youmonst && (mtarg.data.msound === M.MS_LEADER
                          || mtarg.data.msound === M.MS_GUARDIAN))
            return -5000;
        /* D: If friendly, try not to hit it */
        /* Is monster adjacent? */
        if (distmin(mtmp.mx, mtmp.my,
                    youmonst ? u.ux : mtarg.mx, youmonst ? u.uy : mtarg.my) <= 1) {
            score -= 3000;
            return score;
        }
        /* Is the monster peaceful or tame? */
        if (/*mtarg->mpeaceful ||*/ mtarg.mtame || youmonst) {
            /* Pets will never be targeted */
            score -= 3000;
            return score;
        }
        /* Is master/pet behind monster? Check up to 15 squares beyond
         * pet.
         */
        if (find_friends(mtmp, mtarg, 15)) {
            score -= 3000;
            return score;
        }
        /* Target hostile monsters in preference to peaceful ones */
        if (!mtarg.mpeaceful)
            score += 10;
        /* Avoid passive monsters (eg. acid blob) */
        if (mtarg.data.mattk[0].aatyp === M.AT_NONE)
            score -= 1000;
        /* Even weak pets with breath attacks shouldn't take on very
           low-level monsters. Wasting breath on lichens is ridiculous. */
        if ((mtarg.m_lev < 2 && mtmp.m_lev > 5)
            || (mtmp.m_lev > 12 && mtarg.m_lev < mtmp.m_lev - 9
                && u.ulevel > 8 && mtarg.m_lev < u.ulevel - 7))
            score -= 25;
        /* for strength purposes, a vampshifter in weak form (vampire bat,
           fog cloud, maybe wolf) will attack as if in vampire form */
        mtmp_lev = mtmp.m_lev;
        if (is_vampshifter(mtmp) && mtmp.data.mlet !== M.S_VAMPIRE)
            throw new Error('score_targ(): vampshifter pets not ported yet');
        /* And pets will hesitate to attack vastly stronger foes.
           This penalty will be discarded if master's in trouble. */
        if (mtarg.m_lev > mtmp_lev + 4)
            score -= (mtarg.m_lev - mtmp_lev) * 20;
        /* All things being the same, go for the beefiest monster. This
           bonus should not be large enough to override the pet's aversion
           to attacking much stronger monsters. */
        score += mtarg.m_lev * 2 + Math.trunc(mtarg.mhp / 3);
    }
    /* Fuzz factor to make things less predictable when very
       similar targets are abundant. */
    score += rnd(5);
    /* Pet may decide not to use ranged attack when confused */
    if (mtmp.mconf && !rn2(3))
        score -= 1000;
    return score;
}

// ── C ref: dogmove.c best_target() ──
function best_target(mtmp, forced) {
    let bestscore = -40000, currscore;
    let best_targ = null, temp_targ = null;

    /* Help! */
    if (!mtmp)
        return null;

    /* If the pet is blind, it's not going to see any target */
    if (!mtmp.mcansee)
        return null;

    /* Search for any monsters lined up with the pet, within an arbitrary
     * distance from the pet (7 squares, even along diagonals). Monsters
     * are assigned scores and the best score is chosen.
     */
    for (let dy = -1; dy < 2; ++dy) {
        for (let dx = -1; dx < 2; ++dx) {
            if (!dx && !dy)
                continue;
            /* Traverse the line to find the first monster within 7
             * squares. Invisible monsters are skipped (if the
             * pet doesn't have see invisible).
             */
            temp_targ = find_targ(mtmp, dx, dy, 7);

            /* Nothing in this line? */
            if (!temp_targ)
                continue;

            /* Decide how attractive the target is */
            currscore = score_targ(mtmp, temp_targ);

            if (currscore > bestscore) {
                bestscore = currscore;
                best_targ = temp_targ;
            }
        }
    }

    /* Filter out targets the pet doesn't like */
    if (!forced && bestscore < 0)
        best_targ = null;

    return best_targ;
}

// ── C ref: dogmove.c pet_ranged_attk() ──
async function pet_ranged_attk(mtmp, forced) {
    let hungry = false;

    /* How hungry is the pet? */
    if (!mtmp.isminion) {
        const dog = mtmp.edog;

        hungry = (game.moves > (dog.hungrytime + DOG_HUNGRY));
    }

    /* Identify the best target in a straight line from the pet;
     * if there is such a target, we'll let the pet attempt an attack.
     */
    const mtarg = best_target(mtmp, forced);

    /* Hungry pets are unlikely to use breath/spit attacks */
    if (mtarg && (!hungry || !rn2(5))) {
        let mstatus = M_ATTK_MISS;

        if (mtarg === game.youmonst) {
            throw new Error('pet_ranged_attk(): mattacku() not ported yet');
        } else {
            game.bhitpos = { x: mtmp.mx, y: mtmp.my };
            game.notonhead = false;
            mstatus = await mattackm(mtmp, mtarg);

            /* aggressor (pet) died */
            if (mstatus & M_ATTK_AGR_DIED)
                return MMOVE_DIED;

            /* the defender may retaliate if it's still alive and can
               see the pet */
            if ((mstatus & M_ATTK_HIT) && !(mstatus & M_ATTK_DEF_DIED)
                && rn2(4) && mtarg !== game.youmonst) {
                if (mtarg.mcansee && haseyes(mtarg.data)) {
                    let mresp;

                    game.bhitpos = { x: mtmp.mx, y: mtmp.my };
                    game.notonhead = false;
                    mresp = await mattackm(mtarg, mtmp);
                    if (mresp & M_ATTK_DEF_DIED)
                        return MMOVE_DIED;
                }
            }
        }
        /* Only return 3 if the pet actually made a ranged attack, and
         * thus should lose the rest of its move. */
        if (mstatus !== M_ATTK_MISS)
            return MMOVE_DONE;
    } else if (forced)
        throw new Error('pet_ranged_attk(): domonnoise() not ported yet');
    return MMOVE_NOTHING;
}

// ── C ref: dogmove.c dog_move() ──
// Return values (same as m_move):
// 0: did not move, but can still attack and do other stuff.
// 1: moved, possibly can attack.
// 2: monster died.
// 3: did not move, and can't do anything else either.
export async function dog_move(mtmp, after) {
    const u = game.u;
    let omx, omy; /* original mtmp position */
    let appr, whappr, udist;
    let i, j, k;
    const edog = (mtmp.mtame && mtmp.edog) ? mtmp.edog : null;
    const cursemsg = [];
    let nix, niy;      /* position mtmp is (considering) moving to */
    let nx, ny; /* temporary coordinates */
    let cnt, uncursedcnt, chcnt;
    let chi = -1, nidist, ndist;
    const gg = game.gg || (game.gg = { gtyp: 0, gx: 0, gy: 0 });
    const GDIST = (x, y) => dist2(x, y, gg.gx, gg.gy);

    if (!edog && !mtmp.isminion)
        throw new Error('dog_move for non-pet?');

    omx = mtmp.mx;
    omy = mtmp.my;
    if (edog && dog_hunger(mtmp, edog))
        return MMOVE_DIED; /* starved */

    udist = distu(omx, omy);
    /* Let steeds eat and maybe throw rider during Conflict */
    if (mtmp === u.usteed) {
        if (Conflict())
            throw new Error('dog_move(): steed conflict not ported yet');
        udist = 1;
    } else if (!udist) {
        /* maybe we tamed him while being swallowed --jgm */
        return MMOVE_NOTHING;
    }

    nix = omx; /* set before newdogpos */
    niy = omy;
    cursemsg[0] = false; /* lint suppression */

    if (edog) {
        j = await dog_invent(mtmp, edog, udist);
        if (j === 2)
            return helpless(mtmp) && mtmp.mhp < 1 ? MMOVE_DIED : MMOVE_DONE;
        else if (j === 1)
            throw new Error('dog_move(): eating pets not ported yet');

        whappr = (game.moves - edog.whistletime < 5);
    } else
        whappr = 0;

    appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    if (Conflict())
        throw new Error('dog_move(): resist_conflict() not ported yet');

    const allowflags = mon_allowflags(mtmp);
    const mfp = { cnt: 0, poss: [], info: [] };
    cnt = mfndpos(mtmp, mfp, allowflags);

    /* Normally dogs don't step on cursed items, but if they have no
     * other choice they will.  This requires checking ahead of time
     * to see how many uncursed item squares are around.
     */
    uncursedcnt = 0;
    for (i = 0; i < cnt; i++) {
        nx = mfp.poss[i].x;
        ny = mfp.poss[i].y;
        if (MON_AT(nx, ny) && !((mfp.info[i] & ALLOW_M) || mfp.info[i] & ALLOW_MDISP))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    const better_with_displacing = should_displace(mtmp, mfp, gg.gx, gg.gy);

    chcnt = 0;
    chi = -1;
    nidist = GDIST(nix, niy);

    for (i = 0; i < cnt; i++) {
        nx = mfp.poss[i].x;
        ny = mfp.poss[i].y;
        cursemsg[i] = false;

        /* if leashed, we drag him along. */
        if (mtmp.mleashed && distu(nx, ny) > 4)
            continue;

        /* if a guardian, try to stay close by choice */
        if (!edog && (j = distu(nx, ny)) > 16 && j >= udist)
            continue;

        if ((mfp.info[i] & ALLOW_M) && MON_AT(nx, ny)) {
            const mtmp2 = m_at(nx, ny);
            const balk = mtmp.m_lev + Math.trunc((5 * mtmp.mhp) / mtmp.mhpmax) - 2;

            if (mtmp2.m_lev >= balk
                || (mtmp2.mtame && mtmp.mtame && !Conflict())
                || (max_passive_dmg(mtmp2, mtmp) >= mtmp.mhp)
                || ((mtmp.mhp * 4 < mtmp.mhpmax
                     || mtmp2.data.msound === M.MS_GUARDIAN
                     || mtmp2.data.msound === M.MS_LEADER)
                    && mtmp2.mpeaceful && !Conflict())) {
                continue;
            }
            if (mtmp2.data === mons[M.PM_FLOATING_EYE]
                || mtmp2.data === mons[M.PM_GELATINOUS_CUBE]
                || mtmp2.data === mons[M.PM_COCKATRICE]
                || mtmp2.data === mons[M.PM_CHICKATRICE])
                throw new Error('dog_move(): floating eye/cube/cockatrice foes not ported yet');

            if (after)
                return MMOVE_NOTHING; /* hit only once each move */

            game.bhitpos = { x: nx, y: ny };
            game.notonhead = mtmp2.mx !== nx || mtmp2.my !== ny;
            let mstatus = await mattackm(mtmp, mtmp2);

            /* aggressor (pet) died */
            if (mstatus & M_ATTK_AGR_DIED)
                return MMOVE_DIED;

            if ((mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
                && rn2(4)
                && mtmp2.mlstmv !== game.moves
                && !onscary(mtmp.mx, mtmp.my, mtmp2)
                /* monnear check needed: long worms hit on tail */
                && monnear(mtmp2, mtmp.mx, mtmp.my)) {
                game.bhitpos = { x: mtmp.mx, y: mtmp.my };
                game.notonhead = false;
                mstatus = await mattackm(mtmp2, mtmp); /* return attack */
                if (mstatus & M_ATTK_DEF_DIED)
                    return MMOVE_DIED;
            }
            return MMOVE_DONE;
        }
        if ((mfp.info[i] & ALLOW_MDISP) && MON_AT(nx, ny)
            && better_with_displacing)
            throw new Error('dog_move(): mdisplacem() not ported yet');

        /* avoid a location hero just kicked */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        /* m_avoid_soko_push_loc(): Sokoban isn't ported yet */

        {
            /* Dog avoids harmful traps, but perhaps it has to pass one
             * in order to follow player.
             */
            let trap;

            if ((mfp.info[i] & ALLOW_TRAPS) && (trap = t_at(nx, ny))) {
                if (mtmp.mleashed) {
                    throw new Error('dog_move(): whimper() not ported yet');
                } else {
                    /* 1/40 chance of stepping on it anyway, in case
                     * it has to pass one to follow the player...
                     */
                    if (trap.tseen && rn2(40))
                        continue;
                }
            }
        }

        /* dog eschews cursed objects, but likes dog food */
        /* (minion isn't interested; `cursemsg' stays FALSE) */
        if (edog) {
            const can_reach_food = could_reach_item(mtmp, nx, ny);

            for (const obj of objects_at(nx, ny)) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else {
                    let otyp;
                    if (can_reach_food
                        && (otyp = dogfood(mtmp, obj)) < MANFOOD
                        && (otyp < ACCFOOD
                            || edog.hungrytime <= game.moves)) {
                        /* Note: our dog likes the food so much that he
                         * might eat it even when it conceals a cursed
                         * object */
                        throw new Error('dog_move(): dog_eat() not ported yet');
                    }
                }
            }
        }
        /* didn't find something to eat; if we saw a cursed item and
           aren't being forced to walk on it, usually keep looking */
        if (cursemsg[i] && !mtmp.mleashed && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /*
         * Lessen the chance of backtracking to previous position(s).
         * This causes unintended issues for pets trying to follow the
         * hero.  Thus, only run it if not leashed and >5 tiles away.
         */
        let skip = false;
        if (!mtmp.mleashed && distmin(mtmp.mx, mtmp.my, u.ux, u.uy) > 5) {
            if (!mtmp.mtrack)
                mtmp.mtrack = Array.from({ length: MTSZ }, () => ({ x: 0, y: 0 }));
            k = edog ? uncursedcnt : cnt;
            for (j = 0; j < MTSZ && j < k - 1; j++)
                if (nx === mtmp.mtrack[j].x && ny === mtmp.mtrack[j].y)
                    if (rn2(MTSZ * (k - j))) {
                        skip = true; /* goto nxti */
                        break;
                    }
        }
        if (skip) continue;

        j = ((ndist = GDIST(nx, ny)) - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0)
                chcnt = 0;
            chi = i;
        }
        /* nxti: */
    }

    /* Pet hasn't attacked anything but is considering moving -
     * now's the time for ranged attacks. Note that the pet can move
     * after it performs its ranged attack. Should this be changed?
     */
    if ((i = await pet_ranged_attk(mtmp, false)) !== MMOVE_NOTHING)
        return i;

    /* newdogpos: */
    if (nix !== omx || niy !== omy) {
        if (mfp.info[chi] & ALLOW_U) {
            throw new Error('dog_move(): mattacku() not ported yet');
        }
        /* if (!m_in_out_region(mtmp, nix, niy)) return MMOVE_MOVED:
           regions aren't ported yet (none exist) */
        /* m_digweapon_check(): only for tunnelling pets */
        if (tunnels(mtmp.data))
            throw new Error('dog_move(): m_digweapon_check() not ported yet');

        /* insert a worm_move() if worms ever begin to eat things */
        /* wasseen = canseemon(mtmp); remove_monster(omx, omy): the
           monster list is keyed by mx/my, so place_monster() is enough */
        place_monster(mtmp, nix, niy);
        if (cursemsg[chi] && canseemon(mtmp))
            throw new Error('dog_move(): reluctant step message not ported yet');
        mon_track_add(mtmp, omx, omy);
    } else if (mtmp.mleashed && distu(omx, omy) > 4) {
        throw new Error('dog_move(): leashed pet kludge not ported yet');
    }
    return MMOVE_MOVED;
}
