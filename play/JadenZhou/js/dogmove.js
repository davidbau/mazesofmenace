// dogmove.js — pet movement: dog_move(), dog_goal(), dog_invent(),
// dogfood() and helpers.
// C ref: dogmove.c, dog.c dogfood(), zap.c obj_resists()
//
// Branches that need code no session reaches yet throw a
// 'not ported yet' error instead of skipping their rolls.

import { polyfood } from './mon.js';
import { is_organic, is_metallic, is_rustprone } from './objects.js';
import { helpless } from './monmove.js';
import { may_dig } from './dig.js';
import { minv } from './mon.js';
import { poisonous } from './eat.js';
import { touch_artifact_mon } from './artifact.js';
import { game } from './gstate.js';
import { eaten_stat, peek_at_iced_corpse_age } from './eat.js';
import { mon_wield_item } from './weapon.js';
import { rn2, rnd } from './rng.js';
import { mattacku, mhis } from './mhitu.js';
import { m_unleash } from './apply.js';
import { dist2, distmin, distu } from './hacklib.js';
import { cansee, couldsee, clear_path, do_clear_area } from './vision.js';
import {
    m_at, MON_AT, place_monster, is_pool, is_lava, sobj_at, may_passwall
} from './makemon.js';
import { t_at } from './trap.js';
import { mattackm, max_passive_dmg } from './mhitm.js';
import { mfndpos, monnear, mon_allowflags, check_gear_next_turn,
         m_consume_obj, mondied } from './mon.js';
import { gettrack } from './track.js';
import { onscary, should_displace, m_avoid_kicked_loc, m_avoid_soko_push_loc, mon_track_add,
         m_digweapon_check, is_mines_prize, is_soko_prize } from './monmove.js';
import { monsndx, is_swimmer, passes_walls, haseyes, perceives, is_undead,
         is_elf, is_vampshifter, mon_hates_silver, is_flyer, is_floater,
         same_race, is_animal, mindless, throws_rocks, humanoid, carnivorous,
         herbivorous, tunnels, metallivorous, acidic, strongmonst, likes_lava,
         likes_fire, is_rider, vegan, attacktype,
         resist_conflict } from './mondata.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import * as O from './objects.js';
import { objects } from './objects.js';
import { splitobj, obj_extract_self } from './mkobj.js';
import { mpickobj, relobj } from './steal.js';
import { m_in_out_region } from './region.js';
import { distant_name, doname } from './objnam.js';
import {
    newsym, pline, canseemon, mon_visible, canspotmon, glyph_kind, vobj_at
} from './display.js';
import { vtense } from './objnam.js';
import { locomotion } from './trap.js';
import { Monnam, noit_Monnam } from './do_name.js';
import { MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE, MTSZ, M_ATTK_MISS,
         M_ATTK_HIT, M_ATTK_DEF_DIED, M_ATTK_AGR_DIED, ALLOW_U, ALLOW_M,
         ALLOW_MDISP, ALLOW_TRAPS, COLNO, ROWNO, DOGFOOD, CADAVER, ACCFOOD,
         MANFOOD, APPORT, POISON, UNDEF, TABU, IS_ROOM, IS_DOOR, IS_OBSTRUCTED,
         IS_STWALL, IS_TREE, W_NONDIGGABLE, D_CLOSED, D_LOCKED, CONFLICT,
         NON_PM, isok, MAGIC_PORTAL, W_ARMG, NEED_WEAPON, NEED_HTH_WEAPON,
         I_SPECIAL, W_ARMS, M_AP_NOTHING } from './const.js';
import { Hallucination, Conflict } from './youprop.js';
import { u_at } from './const.js';
import { undesirable_disp as undesirable_disp_dm } from './monmove.js';
import { mdisplacem as mdisplacem_dm } from './mhitm.js';
import { mon_reflects } from './muse.js';
import { resists_ston, touch_petrifies } from './mondata.js';
import { is_quest_artifact } from './questpgr.js';
import { pline_mon, pline_xy } from './display.js';
import { whimper } from './sounds.js';
import { Your as Your_dm, You_feel as You_feel_dm } from './display.js';
import { Deaf as Deaf_dm } from './youprop.js';
import { goodpos } from './makemon.js';
import { xytodir } from './hack.js';
import { dirtocoord } from './steed.js';
import { set_apparxy } from './monmove.js';
import { N_DIRS as N_DIRS_DM } from './const.js';

const DOG_HUNGRY = 300;
const DOG_WEAK = 500;
const DOG_STARVE = 750;

/* mondata.h */
/* C ref: mondata.h resists_poison()/resists_ston()/resists_acid() */
function mresists(mon, mr) {
    return (((mon.data.mresists | (mon.mextrinsics ?? 0)) & mr) !== 0);
}
/* C ref: stairs.c On_stairs() */
export function On_stairs(x, y) {
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

// ── C ref: dog.c dogfood() ──
// return quality of food; the lower the better
export function dogfood(mon, obj) {
    const mptr = mon.data;
    const carni = carnivorous(mptr), herbi = herbivorous(mptr);
    let fptr, fx;

    if (obj.otrapped /* opoisoned */ && !mresists(mon, M.MR_POISON))
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
            /* avoid polymorph unless starving or abused (in which case the
               pet will consider it for a chance to become more powerful) */
            else if (polyfood(obj) && mon.mtame > 1 && !starving)
                return MANFOOD;
            else if (vegan(fp))
                return herbi ? CADAVER : MANFOOD;
            /* most humanoids will avoid cannibalism unless starving;
               arbitrary: elves won't eat other elves even then */
            else if (humanoid(mptr) && same_race(mptr, fp)
                     && (!is_undead(mptr) && fp.mlet !== M.S_KOBOLD
                         && fp.mlet !== M.S_ORC && fp.mlet !== M.S_OGRE))
                return (starving && carni && !is_elf(mptr)) ? ACCFOOD : TABU;
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
        if (mon_hates_silver(mon) && objects[obj.otyp].oc_material === O.SILVER)
            return TABU;
        if (mptr === mons[M.PM_GELATINOUS_CUBE] && is_organic(obj))
            return ACCFOOD;
        if (metallivorous(mptr) && is_metallic(obj)
            && (is_rustprone(obj) || mptr !== mons[M.PM_RUST_MONSTER])) {
            /* Non-rustproofed ferrous-based metals are preferred. */
            return (is_rustprone(obj) && !obj.oerodeproof) ? DOGFOOD
                                                            : ACCFOOD;
        }
        if (!obj.cursed
            && obj.oclass !== O.BALL_CLASS
            && obj.oclass !== O.CHAIN_CLASS)
            return APPORT;
        /*FALLTHRU*/
    case O.ROCK_CLASS:
        return UNDEF;
    }
}

// ── C ref: mon.c curr_mon_load() ──
export function curr_mon_load(mtmp) {
    let curload = 0;

    for (const obj of minv(mtmp)) {
        if (obj.otyp !== O.BOULDER || !throws_rocks(mtmp.data))
            curload += obj.owt;
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
    if (objects[otyp].oc_material === O.SILVER && mon_hates_silver(mtmp)
        && (otyp !== O.BELL_OF_OPENING
            || (mtmp.data.mflags3 & M.M3_COVETOUS) === 0 /* !is_covetous() */))
        return false;
    if (!touch_artifact_mon(otmp, mtmp))
        return false;
    return true;
}

// ── C ref: mon.c can_carry() ──
export function can_carry(mtmp, otmp) {
    const u = game.u;
    const otyp = otmp.otyp, newload = otmp.owt;
    const mdat = mtmp.data;

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
export function cursed_object_at(x, y) {
    for (const otmp of objects_at(x, y))
        if (otmp.cursed)
            return true;
    return false;
}

// ── C ref: dogmove.c dog_nutrition() ──
export function dog_nutrition(mtmp, obj) {
    let nutrit;

    /*
     * It is arbitrary that the pet takes the same length of time to eat
     * as a human, but gets more nutritional value.
     */
    if (obj.oclass === O.FOOD_CLASS) {
        if (obj.otyp === O.CORPSE) {
            mtmp.meating = 3 + (mons[obj.corpsenm].cwt >> 6);
            nutrit = mons[obj.corpsenm].cnutrit;
        } else {
            mtmp.meating = objects[obj.otyp].oc_delay;
            nutrit = objects[obj.otyp].oc_nutrition;
        }
        switch (mtmp.data.msize) {
        case M.MZ_TINY:
            nutrit *= 8;
            break;
        case M.MZ_SMALL:
            nutrit *= 6;
            break;
        default:
        case M.MZ_MEDIUM:
            nutrit *= 5;
            break;
        case M.MZ_LARGE:
            nutrit *= 4;
            break;
        case M.MZ_HUGE:
            nutrit *= 3;
            break;
        case M.MZ_GIGANTIC:
            nutrit *= 2;
            break;
        }
        if (obj.oeaten) {
            mtmp.meating = eaten_stat(mtmp.meating, obj);
            nutrit = eaten_stat(nutrit, obj);
        }
    } else if (obj.oclass === O.COIN_CLASS) {
        mtmp.meating = Math.trunc(obj.quan / 2000) + 1;
        if (mtmp.meating < 0)
            mtmp.meating = 1;
        nutrit = Math.trunc(obj.quan / 20);
        if (nutrit < 0)
            nutrit = 0;
    } else {
        /* Unusual pet such as gelatinous cube eating odd stuff.
         * meating made consistent with wild monsters in mon.c.
         * nutrit made consistent with polymorphed player nutrit in
         * eat.c.  (This also applies to pets eating gold.)
         */
        mtmp.meating = Math.trunc(obj.owt / 20) + 1;
        nutrit = 5 * objects[obj.otyp].oc_nutrition;
    }
    return nutrit;
}

// ── C ref: dogmove.c dog_eat() ──
/* returns 2 if pet dies, otherwise 1 */
export async function dog_eat(mtmp,
                              obj, /* if unpaid, then thrown or kicked by hero */
                              x,   /* dog's starting location, */
                              y,   /* might be different from current */
                              devour) {
    const edog = mtmp.edog;
    let nutrit;
    let obj_name;

    if (edog.hungrytime < game.moves)
        edog.hungrytime = game.moves;
    nutrit = dog_nutrition(mtmp, obj);

    if (devour) {
        if (mtmp.meating > 1)
            mtmp.meating = Math.trunc(mtmp.meating / 2);
        if (nutrit > 1)
            nutrit = Math.trunc((nutrit * 3) / 4);
    }
    edog.hungrytime += nutrit;
    mtmp.mconf = 0;
    if (edog.mhpmax_penalty) {
        /* no longer starving */
        mtmp.mhpmax += edog.mhpmax_penalty;
        edog.mhpmax_penalty = 0;
    }
    if (mtmp.mflee && mtmp.mfleetim > 1)
        mtmp.mfleetim = Math.trunc(mtmp.mfleetim / 2);
    if (mtmp.mtame < 20)
        mtmp.mtame++;
    if (x !== mtmp.mx || y !== mtmp.my) { /* moved & ate on same turn */
        newsym(x, y);
        newsym(mtmp.mx, mtmp.my);
    }
    if (mtmp.data === mons[M.PM_KILLER_BEE]
        && obj.otyp === O.LUMP_OF_ROYAL_JELLY)
        throw new Error('dog_eat(): bee_eat_jelly() not ported yet');

    /* food items are eaten one at a time; entire stack for other stuff */
    if (obj.quan > 1 && obj.oclass === O.FOOD_CLASS)
        obj = splitobj(obj, 1);
    if (obj.unpaid)
        throw new Error('dog_eat(): unpaid food not ported yet');
    if (is_pool(mtmp.mx, mtmp.my) && !game.u.uinwater /* !Underwater */) {
        /* Don't print obj */
        /* TODO: Reveal presence of sea monster (especially sharks) */
    } else {
        /* food is at monster's current location, <mx,my>;
           <x,y> was monster's location at start of this turn;
           they might be the same but will be different when
           the monster is moving+eating on same turn */
        const seeobj = cansee(mtmp.mx, mtmp.my),
              sawpet = cansee(x, y) && mon_visible(mtmp);

        /* Observe the action if either the food location or the pet
           itself is in view.  When pet which was in view moves to an
           unseen spot to eat the food there, avoid referring to that
           pet as "it".  However, we want "it" if invisible/unsensed
           pet eats visible food. */
        if (sawpet || (seeobj && canspotmon(mtmp))) {
            /* call distant_name() for possible side-effects even if the
               result won't be printed */
            obj_name = distant_name(obj, doname);
            if (tunnels(mtmp.data))
                await pline_mon(mtmp, `${noit_Monnam(mtmp)} digs in.`);
            else
                await pline_mon(mtmp, `${noit_Monnam(mtmp)} ${
                    devour ? "devours" : "eats"} ${obj_name}.`);
        } else if (seeobj) {
            obj_name = distant_name(obj, doname);
            await pline(`It ${devour ? "devours" : "eats"} ${obj_name}.`);
        }
    }
    if (mtmp.data === mons[M.PM_RUST_MONSTER] && obj.oerodeproof) {
        throw new Error('dog_eat(): rust monster spitting out rustproofing not ported yet');
    } else {
        /* It's a reward if it's DOGFOOD and the player dropped/threw it.
           We know the player had it if invlet is set. -dlc */
        if (dogfood(mtmp, obj) === DOGFOOD && obj.invlet) {
            edog.apport += Math.trunc(200 / (edog.dropdist + game.moves
                                             - edog.droptime));
            if (edog.apport <= 0) {
                /* impossible("dog_eat: pet apport <= 0 ...") */
                edog.apport = 1;
            }
        }
        await m_consume_obj(mtmp, obj);
    }

    return (mtmp.mhp < 1) ? 2 : 1; /* DEADMONSTER(mtmp) */
}

// ── C ref: dogmove.c dog_starve() ──
async function dog_starve(mtmp) {
    if (mtmp.mleashed && mtmp !== game.u.usteed)
        await Your_dm("leash goes slack.");
    else if (cansee(mtmp.mx, mtmp.my))
        await pline_mon(mtmp, `${Monnam(mtmp)} starves.`);
    else
        await You_feel_dm(`${Hallucination() ? "bummed" : "sad"} for a moment.`);
    await mondied(mtmp);
}

// ── C ref: dogmove.c dog_hunger() ──
/* hunger effects -- returns TRUE on starvation */
async function dog_hunger(mtmp, edog) {
    if (game.moves > edog.hungrytime + DOG_WEAK) {
        if (!carnivorous(mtmp.data) && !herbivorous(mtmp.data)) {
            edog.hungrytime = game.moves + DOG_WEAK;
            /* but not too high; it might polymorph */
        } else if (!edog.mhpmax_penalty) {
            /* starving pets are limited in healing */
            const newmhpmax = Math.trunc(mtmp.mhpmax / 3);
            mtmp.mconf = 1;
            edog.mhpmax_penalty = mtmp.mhpmax - newmhpmax;
            mtmp.mhpmax = newmhpmax;
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhp = mtmp.mhpmax;
            if (mtmp.mhp < 1) { /* DEADMONSTER(mtmp) */
                await dog_starve(mtmp);
                return true;
            }
            if (cansee(mtmp.mx, mtmp.my))
                await pline_mon(mtmp, `${Monnam(mtmp)} is confused from hunger.`);
            else if (couldsee(mtmp.mx, mtmp.my))
                throw new Error('dog_hunger(): beg() not ported yet');
            else
                throw new Error('dog_hunger(): You_feel() not ported yet');
            /* stop_occupation(): occupations aren't ported yet */
        } else if (game.moves > edog.hungrytime + DOG_STARVE
                   || mtmp.mhp < 1) {
            await dog_starve(mtmp);
            return true;
        }
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
            /* MAIL_STRUCTURES is defined (global.h) */
            && obj.otyp !== O.SCR_MAIL
            /* avoid special items; once hero picks them up, they'll cease
               being special and become eligible for normal monst activity */
            && !(is_mines_prize(obj) || is_soko_prize(obj))) {
            const edible = dogfood(mtmp, obj);

            if ((edible <= CADAVER
                 /* starving pet is more aggressive about eating */
                 || (edog.mhpmax_penalty && edible === ACCFOOD))
                && could_reach_item(mtmp, obj.ox, obj.oy))
                return await dog_eat(mtmp, obj, omx, omy, false);

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
                                await pline_xy(omx, omy, `${Monnam(mtmp)} picks up ${otmpname}.`);
                        }
                        obj_extract_self(otmp);
                        newsym(omx, omy);
                        mpickobj(mtmp, otmp);
                        if (attacktype(mtmp.data, M.AT_WEAP)
                            && mtmp.weapon_check === NEED_WEAPON) {
                            mtmp.weapon_check = NEED_HTH_WEAPON;
                            await mon_wield_item(mtmp);
                        }
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
                const fardist = { v: FARAWAY * FARAWAY };
                gg.gx = gg.gy = FARAWAY; /* random */
                do_clear_area(omx, omy, 9, wantdoor, fardist);

                /* here gx == FARAWAY e.g. when dog is in a vault */
                if (gg.gx === FARAWAY || (gg.gx === omx && gg.gy === omy)) {
                    gg.gx = game.u.ux;
                    gg.gy = game.u.uy;
                } else if (edog) {
                    edog.ogoal.x = gg.gx;
                    edog.ogoal.y = gg.gy;
                }
            }
        }
    } else if (edog) {
        edog.ogoal.x = 0;
    }
    return appr;
}

// C ref: dogmove.c wantdoor()
/* do_clear_area client */
function wantdoor(x, y, distance) {
    let ndist;
    const dist_ptr = distance;

    if (dist_ptr.v > (ndist = distu(x, y))) {
        game.gg.gx = x;
        game.gg.gy = y;
        dist_ptr.v = ndist;
    }
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
            if (await mattacku(mtmp))
                return MMOVE_DIED;
            /* Treat this as the pet having initiated an attack even if it
             * didn't, so it will lose its move.  This isn't entirely fair,
             * but mattacku doesn't distinguish between "did not attack"
             * and "attacked but didn't die" cases, and this is preferable
             * to letting the pet attack the player and continuing to move.
             */
            mstatus = M_ATTK_HIT;
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
    let do_eat = false, eatobj = null;
    let nix, niy;      /* position mtmp is (considering) moving to */
    let nx, ny; /* temporary coordinates */
    let cnt, uncursedcnt, chcnt;
    let chi = -1, nidist, ndist;
    let ranged_only;
    const gg = game.gg || (game.gg = { gtyp: 0, gx: 0, gy: 0 });
    const GDIST = (x, y) => dist2(x, y, gg.gx, gg.gy);

    if (!edog && !mtmp.isminion)
        throw new Error('dog_move for non-pet?');

    omx = mtmp.mx;
    omy = mtmp.my;
    if (edog && await dog_hunger(mtmp, edog))
        return MMOVE_DIED; /* starved */

    udist = distu(omx, omy);
    /* Let steeds eat and maybe throw rider during Conflict */
    if (mtmp === u.usteed) {
        if (Conflict() && !resist_conflict(mtmp))
            throw new Error('dog_move(): dismount_steed(DISMOUNT_THROWN) not ported yet');
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
        if (j === 2 /* || mon_offmap(mtmp) */)
            return (mtmp.mhp < 1) ? MMOVE_DIED : MMOVE_DONE;
        else if (j === 1) {
            /* goto newdogpos; eating something: nix,niy == omx,omy, so
               only newdogpos's leashed-pet branch could apply */
            if (mtmp.mleashed && distu(omx, omy) > 4)
                await dog_leash_kludge(mtmp, omx, omy, nix, niy);
            return MMOVE_MOVED;
        }

        whappr = (game.moves - edog.whistletime < 5);
    } else
        whappr = 0;

    appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    if (Conflict() && !resist_conflict(mtmp)) {
        if (!edog)
            throw new Error('dog_move(): lose_guardian_angel() not ported yet');
    }

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

        ranged_only = false;

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
            if ((mtmp2.data === mons[M.PM_FLOATING_EYE] && rn2(10)
                 && mtmp.mcansee && haseyes(mtmp.data) && mtmp2.mcansee
                 && (!mtmp2.minvis || perceives(mtmp.data))
                 && !await mon_reflects(mtmp, null))
                || (mtmp2.data === mons[M.PM_GELATINOUS_CUBE] && rn2(10))
                || (touch_petrifies(mtmp2.data) && !resists_ston(mtmp))) {
                /* only skip this foe if a ranged attack isn't viable */
                if (dist2(mtmp.mx, mtmp.my, mtmp2.mx, mtmp2.my) <= 2
                    || best_target(mtmp, false) !== mtmp2)
                    continue;
                ranged_only = true;
            }
            /** FIXME: 'ranged_only' isn't used as intended yet **/
            if (ranged_only)
                continue;

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
            && better_with_displacing && !undesirable_disp_dm(mtmp, nx, ny)) {
            const mtmp2 = m_at(nx, ny);

            const mstatus = await mdisplacem_dm(mtmp, mtmp2, false); /* displace monster */
            if (mstatus & M_ATTK_DEF_DIED)
                return MMOVE_DIED;
            return MMOVE_NOTHING;
        }

        /* avoid a location hero just kicked */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        {
            /* Dog avoids harmful traps, but perhaps it has to pass one
             * in order to follow player.
             */
            let trap;

            if ((mfp.info[i] & ALLOW_TRAPS) && (trap = t_at(nx, ny))) {
                if (mtmp.mleashed) {
                    if (!Deaf_dm())
                        await whimper(mtmp);
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
                        nix = nx;
                        niy = ny;
                        chi = i;
                        do_eat = true;
                        eatobj = obj;
                        cursemsg[i] = false; /* not reluctant */
                        break; /* goto newdogpos */
                    }
                }
            }
            if (do_eat)
                break; /* goto newdogpos */
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
    if (!do_eat && (i = await pet_ranged_attk(mtmp, false)) !== MMOVE_NOTHING)
        return i;

    /* newdogpos: */
    if (nix !== omx || niy !== omy) {
        if (mfp.info[chi] & ALLOW_U) {
            if (mtmp.mleashed) { /* play it safe */
                await pline_mon(mtmp, `${Monnam(mtmp)} breaks loose of ${mhis(mtmp)} leash!`);
                m_unleash(mtmp, false);
            }
            await mattacku(mtmp);
            return MMOVE_DONE;
        }
        if (!(await m_in_out_region(mtmp, nix, niy)))
            return MMOVE_MOVED;
        if (await m_digweapon_check(mtmp, nix, niy))
            return MMOVE_NOTHING;

        /* insert a worm_move() if worms ever begin to eat things */
        const wasseen = canseemon(mtmp);
        /* remove_monster(omx, omy): the monster list is keyed by mx/my,
           so place_monster() is enough */
        place_monster(mtmp, nix, niy);
        if (cursemsg[chi] && (wasseen || canseemon(mtmp))) {
            /* describe top item of pile, not necessarily cursed item itself;
               don't use glyph_at() here--it would return the pet but we want
               to know whether an object is remembered at this map location */
            const o = (!Hallucination() && game.level.flags?.hero_memory
                       /* glyph_is_object(levl[nix][niy].glyph) */
                       && glyph_kind(game.level.at(nix, niy).remembered_glyph) === 'obj')
                          ? vobj_at(nix, niy) : null;
            const what = o ? distant_name(o, doname) : "something";

            await pline_mon(mtmp, `${noit_Monnam(mtmp)} ${
                vtense(null, locomotion(mtmp.data, "step"))} reluctantly ${
                (is_flyer(mtmp.data) || is_floater(mtmp.data)) ? "over"
                                                               : "onto"} ${
                what}.`);
        }
        mon_track_add(mtmp, omx, omy);
        /* We have to know if the pet's going to do a combined eat and
         * move before moving it, but it can't eat until after being
         * moved.  Thus the do_eat flag.
         */
        if (do_eat) {
            if (await dog_eat(mtmp, eatobj, omx, omy, false) === 2)
                return MMOVE_DIED;
        }
    } else if (mtmp.mleashed && distu(omx, omy) > 4) {
        await dog_leash_kludge(mtmp, omx, omy, nix, niy);
    }
    return MMOVE_MOVED;
}

// C ref: dogmove.c dog_move() -- the "else if (mtmp->mleashed &&
// distu(omx, omy) > 4)" branch after newdogpos:, shared by dog_move()'s
// two ways into newdogpos (no rolls here)
async function dog_leash_kludge(mtmp, omx, omy, nix, niy) {
    const u = game.u;
    /* an incredible kludge, but the only way to keep pooch near
     * after it spends time eating or in a trap, etc.
     */
    const cc = { x: 0, y: 0 };
    let nx, ny, i, j;

    dognext: {
        nx = Math.sign(omx - u.ux); /* sgn() */
        ny = Math.sign(omy - u.uy);
        cc.x = u.ux + nx;
        cc.y = u.uy + ny;
        if (goodpos(cc.x, cc.y, mtmp, 0))
            break dognext;

        i = xytodir(nx, ny);
        for (j = (i + 7) % N_DIRS_DM /* DIR_LEFT(i) */;
             j < (i + 1) % N_DIRS_DM /* DIR_RIGHT(i) */; j++) {
            dirtocoord(cc, j);
            if (goodpos(cc.x, cc.y, mtmp, 0))
                break dognext;
        }
        for (j = (i + 6) % N_DIRS_DM /* DIR_LEFT2(i) */;
             j < (i + 2) % N_DIRS_DM /* DIR_RIGHT2(i) */; j++) {
            dirtocoord(cc, j);
            if (goodpos(cc.x, cc.y, mtmp, 0))
                break dognext;
        }
        cc.x = mtmp.mx;
        cc.y = mtmp.my;
    }
    /* dognext: */
    if (!(await m_in_out_region(mtmp, nix, niy)))
        return;
    /* remove_monster(mtmp->mx, mtmp->my): the monster list is keyed by
       mx/my, so place_monster() is enough */
    place_monster(mtmp, cc.x, cc.y);
    newsym(cc.x, cc.y);
    set_apparxy(mtmp);
}

// C ref: dogmove.c finish_meating()
export function finish_meating(mtmp) {
    mtmp.meating = 0;
    if ((mtmp.m_ap_type || 0) !== M_AP_NOTHING && mtmp.data.mlet !== M.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}
