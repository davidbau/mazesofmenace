// dog.js — the starting pet.
// C ref: src/dog.c
//
// makedog() runs between u_on_upstairs() and u_init_inventory_attrs()
// (src/allmain.c:814), not with the rest of hero setup. Getting that ordering
// wrong puts the pet's draws on the wrong side of the inventory's.
//
// The cost is small but very visible in the log: one rn2(2) from pet_type()
// when the role has no fixed pet, then a whole collect_coords() ring shuffle
// from enexto() to place it.

import { game } from './gstate.js';
import { DEADMONSTER, is_vampshifter } from './monst.js';
import { m_avoid_kicked_loc, m_avoid_soko_push_loc } from './monmove.js';
/* include/hack.h:1322 — MMOVE_MOVED is 1 and MMOVE_DIED is 2. This file had
   its own copy with MMOVE_MOVED = 2 (C's DIED value) and no MMOVE_DIED at all,
   so dog_move's death return was an unbound name. */
import { MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE } from './const.js';
import { acurr } from './attrib.js';
import { put_saddle_on_mon } from './steed.js';
import { perceives , is_domestic} from './mondata.js';
import { sobj_at } from './invent.js';
import { may_dig } from './hack.js';
import { is_metallic } from './obj.js';
import { obj_resists } from './zap.js';
import {
    mfndpos, mon_allowflags, is_pool, is_lava, can_carry, m_at, t_at,
} from './mon.js';
import {
    COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, ALLOW_M, ALLOW_U,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, isok,
    IS_STWALL, IS_TREE, W_NONDIGGABLE,
    ALLOW_MDISP, ALLOW_TRAPS, A_CHA,
} from './const.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { MFLAGS, MONSYMS, NUMMONS, MSOUND, ATTKS } from './monst_data.js';

const { WOOD, IRON, SILVER, MITHRIL } = MATERIALS;
import { rn2, rnd } from './rng.js';
import { dist2, sgn } from './hacklib.js';
import { couldsee, clear_path } from './vision.js';
import { PMNAMES } from './monst_data.js';
import {
    makemon, MM_EDOG, NO_MINVENT, place_monster, remove_monster, is_rider,
} from './makemon.js';

const NON_PM = -1;

// gu.urole.petnum is a PM_ name in the generated role table.
function petnumOf(role) {
    const p = role?.petnum;
    if (typeof p === 'number') return p;
    if (!p || p === 'NON_PM') return NON_PM;
    return PMNAMES[p] !== undefined ? PMNAMES[p] : NON_PM;
}

// src/dog.c:93 pet_type()
export function pet_type() {
    const petnum = petnumOf(game.urole);
    if (petnum !== NON_PM)
        return petnum;
    if (game.preferred_pet === 'c')
        return PMNAMES.PM_KITTEN;
    if (game.preferred_pet === 'd')
        return PMNAMES.PM_LITTLE_DOG;
    return rn2(2) ? PMNAMES.PM_KITTEN : PMNAMES.PM_LITTLE_DOG;
}

// src/dog.c:111 makedog()
export function makedog() {
    if (game.preferred_pet === 'n') {
        game.context.startingpet_typ = NON_PM;
        return null;
    }

    const pettype = game.context.startingpet_typ = pet_type();

    /* NO_MINVENT stops makemon() giving a pony an already-worn saddle */
    const mtmp = makemon(game.mons[pettype], game.u.ux, game.u.uy,
                         MM_EDOG | NO_MINVENT);
    if (!mtmp)
        return null;

    /* src/dog.c:260 — the starting pet is recorded, and an initial PONY comes
       already saddled unless the hero is a pauper. Passing no saddle makes
       put_saddle_on_mon() create one, and that mksobj() spends a next_ident().
       Skipping it lost a draw in the middle of character creation. */
    if (!game.context.startingpet_mid) {
        game.context.startingpet_mid = mtmp.m_id;
        if (!game.u.uroleplay?.pauper) {
            if (pettype === PMNAMES.PM_PONY)
                put_saddle_on_mon(null, mtmp);
        }
        /* see_monster_closeup() is display bookkeeping */
    }

    initedog(mtmp, true);
    return mtmp;
}

// src/dog.c:45 initedog() — make mtmp tame and fill in its edog struct.
//
// Draws nothing, but several of these fields are read by code that DOES draw,
// and a missing one silently changes the draw count rather than the outcome:
//
//   apport      dog_goal's APPORT branch is `edog->apport > rn2(8)`. Leaving
//               it undefined makes that test false for every object, so the
//               goal is never set and EVERY later object in the search box
//               re-enters the branch and spends another rn2(8). C spends one.
//   hungrytime  gates dog_move's "eat it even if not starving" arm.
//   dropdist    starts at 10000, not 0; dog_invent compares against it.
//
// `everything` is FALSE when re-taming an already-tame monster, and then only
// the apport floor is applied.
function initedog(mtmp, everything) {
    const edogp = (mtmp.edog ||= {});
    const minhungry = game.moves + 1000;
    const minimumtame = is_domestic(mtmp.data) ? 10 : 5;

    mtmp.mtame = Math.max(minimumtame, mtmp.mtame || 0);
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    /* set_malign() recalculates alignment now that it is tamed; no draw */

    if (everything) {
        mtmp.mleashed = 0;
        mtmp.meating = 0;
        edogp.droptime = 0;
        edogp.dropdist = 10000;
        /* ACURR(A_CHA), not u.acurr.a[A_CHA]. newgame() calls makedog()
           BEFORE u_init_inventory_attrs(), where init_attr() lives, so the
           array is still zeroed here -- but acurr() clamps its result to a
           floor of 3, so the starting pet gets apport 3 rather than 0. That
           difference decides whether dog_goal ever settles on a goal. */
        edogp.apport = acurr(A_CHA);
        edogp.whistletime = 0;
        edogp.ogoal = { x: -1, y: -1 };  /* force error if used before set */
        edogp.abuse = 0;
        edogp.revivals = 0;
        edogp.mhpmax_penalty = 0;
        edogp.killed_by_u = 0;
    } else {
        if (edogp.apport <= 0)
            edogp.apport = 1;
    }

    /* always set for a newly tamed pet; hungrytime might already be higher
       when taming magic affects an already-tame monster */
    if ((edogp.hungrytime ?? 0) < minhungry)
        edogp.hungrytime = minhungry;
}

// ---------------------------------------------------------------------------
// The pet's turn. dog_goal() scans a 5-square radius for something worth
// walking to, and calls dogfood() on every object it finds.
// ---------------------------------------------------------------------------

// include/dog.h — dogfood() return values, best first.
export const DOGFOOD = 0, CADAVER = 1, ACCFOOD = 2, MANFOOD = 3, APPORT = 4,
             POISON = 5, UNDEF = 6, TABU = 7;

/* include/mondata.h and include/objclass.h — the predicates dogfood() sorts
   with. None of them draws; they only decide which branch is taken, and a wrong
   branch changes how far the caller's loop runs before it breaks. */
const carnivorous  = (ptr) => (ptr.mflags1 & MFLAGS.M1_CARNIVORE) !== 0;
const herbivorous  = (ptr) => (ptr.mflags1 & MFLAGS.M1_HERBIVORE) !== 0;
const metallivorous = (ptr) => (ptr.mflags1 & MFLAGS.M1_METALLIVORE) !== 0;
const haseyes      = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOEYES) === 0;
const humanoid     = (ptr) => (ptr.mflags1 & MFLAGS.M1_HUMANOID) !== 0;
const acidic       = (ptr) => (ptr.mflags1 & MFLAGS.M1_ACID) !== 0;
const poisonous    = (ptr) => (ptr.mflags1 & MFLAGS.M1_POIS) !== 0;
const is_undead    = (ptr) => (ptr.mflags2 & MFLAGS.M2_UNDEAD) !== 0;
const is_elf       = (ptr) => (ptr.mflags2 & MFLAGS.M2_ELF) !== 0;
const noncorporeal = (ptr) => ptr.mlet === MONSYMS.S_GHOST;
/* include/mondata.h:59,190 — both are explicit species lists, not flag tests.
   There is no M1_FIRE_RES; fire resistance lives in mresists as MR_FIRE, and
   guessing a flag here silently made every monster flaming. */
const flaming      = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_VORTEX
                           || ptr.pmidx === PMNAMES.PM_FLAMING_SPHERE
                           || ptr.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
                           || ptr.pmidx === PMNAMES.PM_SALAMANDER;
const likes_lava   = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_ELEMENTAL
                           || ptr.pmidx === PMNAMES.PM_SALAMANDER;

// include/monst.h:285 ismnum()
const ismnum = (x) => x >= 0 && x < NUMMONS;

// include/mondata.h:200-203
export const touch_petrifies = (ptr) => ptr.pmidx === PMNAMES.PM_COCKATRICE
                              || ptr.pmidx === PMNAMES.PM_CHICKATRICE;
const flesh_petrifies = (pm) => touch_petrifies(pm)
                             || pm.pmidx === PMNAMES.PM_MEDUSA;

// include/mondata.h:75
const slimeproof = (ptr) => ptr.pmidx === PMNAMES.PM_GREEN_SLIME
                         || flaming(ptr) || noncorporeal(ptr);

// include/mondata.h:196
const likes_fire = (ptr) => ptr.pmidx === PMNAMES.PM_FIRE_VORTEX
                         || ptr.pmidx === PMNAMES.PM_FLAMING_SPHERE
                         || likes_lava(ptr);

// include/mondata.h:232
const vegan = (ptr) =>
    ptr.mlet === MONSYMS.S_BLOB || ptr.mlet === MONSYMS.S_JELLY
    || ptr.mlet === MONSYMS.S_FUNGUS || ptr.mlet === MONSYMS.S_VORTEX
    || ptr.mlet === MONSYMS.S_LIGHT
    || (ptr.mlet === MONSYMS.S_ELEMENTAL && ptr.pmidx !== PMNAMES.PM_STALKER)
    || (ptr.mlet === MONSYMS.S_GOLEM && ptr.pmidx !== PMNAMES.PM_FLESH_GOLEM
        && ptr.pmidx !== PMNAMES.PM_LEATHER_GOLEM)
    || noncorporeal(ptr);

// include/objclass.h:193-200. WOOD, IRON and MITHRIL are material ordinals.
const is_organic   = (otmp) => game.objects[otmp.otyp].oc_material <= WOOD;
const is_rustprone = (otmp) => game.objects[otmp.otyp].oc_material === IRON;

/* The remaining tests reach subsystems that are absent. Each is only reachable
   through a corpse, egg or tin, none of which exists before the death-drop and
   cooking code lands, so recording keeps the gap visible without inventing a
   branch. */
function peek_at_iced_corpse_age(obj) {
    note_unported('peek_at_iced_corpse_age');
    return obj.age ?? 0;
}

function stale_egg(obj) {
    note_unported('stale_egg');
    return false;
}

function polyfood(obj) {
    note_unported('polyfood');
    return false;
}

function same_race(pm1, pm2) {
    note_unported('same_race');
    return pm1 === pm2;
}

function find_pmmonst(pm) {
    return (game.level?.monsters || []).find(m => m.mnum === pm) || null;
}

// src/mondata.c:517 mon_hates_silver() / :524 hates_silver()
export function mon_hates_silver(mon) {
    return is_vampshifter(mon) || hates_silver(game.mons[mon.mnum]);
}

// src/mondata.c:524 — True if monster-type is especially affected by silver.
function hates_silver(ptr) {
    return is_were(ptr) || ptr.mlet === MONSYMS.S_VAMPIRE || is_demon(ptr)
        || ptr.pmidx === PMNAMES.PM_SHADE
        || (ptr.mlet === MONSYMS.S_IMP && ptr.pmidx !== PMNAMES.PM_TENGU);
}

const is_were = (ptr) => (ptr.mflags2 & MFLAGS.M2_WERE) !== 0;
const is_demon = (ptr) => (ptr.mflags2 & MFLAGS.M2_DEMON) !== 0;

const resists_ston   = (mon) => { note_unported('resists_ston'); return false; };
const resists_acid   = (mon) => { note_unported('resists_acid'); return false; };

// src/dogmove.c could_reach_item()
export function could_reach_item(mon, nx, ny) {
    if ((!is_pool(nx, ny) || is_swimmer(game.mons[mon.mnum]))
        && (!is_lava(nx, ny) || likes_lava(game.mons[mon.mnum]))
        && (!sobj_at(ONAMES.BOULDER, nx, ny) || throws_rocks(game.mons[mon.mnum])))
        return true;
    return false;
}

// src/dogmove.c can_reach_location() — a recursive walk toward <fx,fy> that
// only ever steps strictly closer, so it terminates.
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
            const loc = game.level.at(i, j);
            if (IS_OBSTRUCTED(loc.typ) && !passes_walls(game.mons[mon.mnum])
                && (!may_dig(i, j) || !tunnels(game.mons[mon.mnum])))
                continue;
            if (IS_DOOR(loc.typ) && (loc.doormask & (D_CLOSED | D_LOCKED)))
                continue;
            if (!could_reach_item(mon, i, j))
                continue;
            if (can_reach_location(mon, i, j, fx, fy))
                return true;
        }
    }
    return false;
}

const is_swimmer   = (ptr) => (ptr.mflags1 & MFLAGS.M1_SWIM) !== 0;
const throws_rocks = (ptr) => (ptr.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;
const passes_walls = (ptr) => (ptr.mflags1 & MFLAGS.M1_WALLWALK) !== 0;
const tunnels      = (ptr) => (ptr.mflags1 & MFLAGS.M1_TUNNEL) !== 0;



// include/vision.h:42 m_cansee(mtmp, x2, y2) = clear_path(mx, my, x2, y2)
function m_cansee(mon, x, y) {
    return clear_path(mon.mx, mon.my, x, y);
}

// src/dog.c:995 dogfood() — only the part that draws is ported.
//
// The second test is the one that matters for the stream:
//
//     if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
//
// obj_resists always draws rn2(100) for an ordinary object and, with ochance 0,
// always returns false. So EVERY object the pet looks at costs exactly one
// rn2(100) here — which is why the recordings show obj_resists arriving before
// dog_goal's own rn2(8) rather than after it, even though the C line that names
// can_carry() sits later in the same condition.
export function dogfood(mon, obj) {
    if (obj.opoisoned && !resists_poison(mon))
        return POISON;
    if (is_quest_artifact(obj) || obj_resists(obj, 0, 95))
        return obj.cursed ? TABU : APPORT;

    const mptr = game.mons[mon.mnum];
    const carni = carnivorous(mptr), herbi = herbivorous(mptr);
    let fx;

    switch (obj.oclass) {
    case OCLASSES.FOOD_CLASS: {
        fx = (obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.TIN
              || obj.otyp === ONAMES.EGG)
             /* corpsenm might be NON_PM (special tin, unhatchable egg) */
             ? obj.corpsenm
             : NON_PM;
        /* mons[NUMMONS] is a valid array entry, though not a valid monster;
           predicate tests against it will fail */
        const fptr = game.mons[ismnum(fx) ? fx : NUMMONS];

        if (obj.otyp === ONAMES.CORPSE && is_rider(fptr))
            return TABU;
        if ((obj.otyp === ONAMES.CORPSE || obj.otyp === ONAMES.EGG)
            && flesh_petrifies(fptr) /* c*ckatrice or Medusa */
            && !resists_ston(mon))
            return POISON;
        if (obj.otyp === ONAMES.LUMP_OF_ROYAL_JELLY
            && mon.mnum === PMNAMES.PM_KILLER_BEE) {
            /* if there's a queen bee on the level, don't eat royal jelly;
               if there isn't, do eat it and grow into a queen */
            return !find_pmmonst(PMNAMES.PM_QUEEN_BEE) ? DOGFOOD : TABU;
        }
        if (!carni && !herbi)
            return obj.cursed ? UNDEF : APPORT;

        /* a starving pet will eat almost anything */
        const starving = !!(mon.mtame && !mon.isminion && mon.edog?.mhpmax_penalty);
        /* even carnivores will eat carrots if they're temporarily blind */
        const mblind = (!mon.mcansee && haseyes(mptr));

        /* ghouls prefer old corpses and unhatchable eggs, yum! */
        if (mon.mnum === PMNAMES.PM_GHOUL) {
            if (obj.otyp === ONAMES.CORPSE)
                return (peek_at_iced_corpse_age(obj) + 50 <= game.moves
                        && !(fx === PMNAMES.PM_LIZARD || fx === PMNAMES.PM_LICHEN))
                       ? DOGFOOD
                       : (starving && !vegan(fptr)) ? ACCFOOD
                       : POISON;
            if (obj.otyp === ONAMES.EGG)
                return stale_egg(obj) ? CADAVER : starving ? ACCFOOD : POISON;
            return TABU;
        }

        switch (obj.otyp) {
        case ONAMES.TRIPE_RATION:
        case ONAMES.MEATBALL:
        case ONAMES.MEAT_RING:
        case ONAMES.MEAT_STICK:
        case ONAMES.ENORMOUS_MEATBALL:
            return carni ? DOGFOOD : MANFOOD;
        case ONAMES.EGG:
            if (obj.corpsenm === PMNAMES.PM_PYROLISK && !likes_fire(mptr))
                return POISON;
            return carni ? CADAVER : MANFOOD;
        case ONAMES.CORPSE:
            if ((peek_at_iced_corpse_age(obj) + 50 <= game.moves
                 && !(fx === PMNAMES.PM_LIZARD || fx === PMNAMES.PM_LICHEN)
                 && mptr.mlet !== MONSYMS.S_FUNGUS)
                || (acidic(fptr) && !resists_acid(mon))
                || (poisonous(fptr) && !resists_poison(mon)))
                return POISON;
            /* avoid polymorph unless starving or abused */
            else if (polyfood(obj) && mon.mtame > 1 && !starving)
                return MANFOOD;
            else if (vegan(fptr))
                return herbi ? CADAVER : MANFOOD;
            /* most humanoids avoid cannibalism unless starving; arbitrary:
               elves won't eat other elves even then */
            else if (humanoid(mptr) && same_race(mptr, fptr)
                     && (!is_undead(mptr) && fptr.mlet !== MONSYMS.S_KOBOLD
                         && fptr.mlet !== MONSYMS.S_ORC
                         && fptr.mlet !== MONSYMS.S_OGRE))
                return (starving && carni && !is_elf(mptr)) ? ACCFOOD : TABU;
            else
                return carni ? CADAVER : MANFOOD;
        case ONAMES.GLOB_OF_GREEN_SLIME: /* other globs use the default case */
            /* turning into slime is preferable to starvation */
            return (starving || slimeproof(mptr)) ? ACCFOOD : POISON;
        case ONAMES.CLOVE_OF_GARLIC:
            return (is_undead(mptr) || is_vampshifter(mon)) ? TABU
                   : (herbi || starving) ? ACCFOOD
                   : MANFOOD;
        case ONAMES.TIN:
            return metallivorous(mptr) ? ACCFOOD : MANFOOD;
        case ONAMES.APPLE:
            return herbi ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case ONAMES.CARROT:
            return (herbi || mblind) ? DOGFOOD : starving ? ACCFOOD : MANFOOD;
        case ONAMES.BANANA:
            /* monkeys and apes (tamable) plus sasquatch prefer these,
               yetis will only eat them if starving */
            return (mptr.mlet === MONSYMS.S_YETI && herbi) ? DOGFOOD
                   : (herbi || starving) ? ACCFOOD
                   : MANFOOD;
        default:
            if (starving)
                return ACCFOOD;
            return (obj.otyp > ONAMES.SLIME_MOLD) ? (carni ? ACCFOOD : MANFOOD)
                                                  : (herbi ? ACCFOOD : MANFOOD);
        }
    }
    case OCLASSES.ROCK_CLASS:
        return UNDEF;
    default:
        if (obj.otyp === ONAMES.AMULET_OF_STRANGULATION
            || obj.otyp === ONAMES.RIN_SLOW_DIGESTION)
            return TABU;
        if (mon_hates_silver(mon)
            && game.objects[obj.otyp].oc_material === SILVER)
            return TABU;
        if (mon.mnum === PMNAMES.PM_GELATINOUS_CUBE && is_organic(obj))
            return ACCFOOD;
        if (metallivorous(mptr) && is_metallic(obj)
            && (is_rustprone(obj) || mon.mnum !== PMNAMES.PM_RUST_MONSTER)) {
            /* Non-rustproofed ferrous-based metals are preferred. */
            return (is_rustprone(obj) && !obj.oerodeproof) ? DOGFOOD : ACCFOOD;
        }
        if (!obj.cursed
            && obj.oclass !== OCLASSES.BALL_CLASS
            && obj.oclass !== OCLASSES.CHAIN_CLASS)
            return APPORT;
        /* FALLTHRU to ROCK_CLASS's UNDEF */
        return UNDEF;
    }
}

/* src/artifact.c is not ported; no session generates a quest artifact this
   early, and the call draws nothing either way. */
function is_quest_artifact(obj) { return false; }

/* src/mondata.h resists_poison() */
function resists_poison(mon) {
    return !!(mon.data?.mresists & MFLAGS.MR_POISON);
}

function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/dogmove.c:495 dog_goal() — pick somewhere worth walking to.
//
// Only the object search is ported. It walks the level's object list (fobj,
// newest-first) and calls dogfood() on everything inside a 5-square box around
// the pet, so it costs one rn2(100) per nearby object before any of its own
// draws. That is the whole reason obj_resists shows up ahead of dog_goal's
// rn2(8) in the recordings.
const SQSRCHRADIUS = 5;

export function dog_goal(mtmp, edog, after, udist, whappr) {
    const omx = mtmp.mx, omy = mtmp.my;

    const min_x = Math.max(omx - SQSRCHRADIUS, 1);
    const max_x = Math.min(omx + SQSRCHRADIUS, COLNO - 1);
    const min_y = Math.max(omy - SQSRCHRADIUS, 0);
    const max_y = Math.min(omy + SQSRCHRADIUS, ROWNO - 1);

    /* src/dogmove.c — gg.gtyp/gg.gx/gg.gy, the goal chosen so far. C suppresses
       a 'used before set' warning by zeroing the coordinates. */
    let gtyp = UNDEF;
    let gx = 0, gy = 0;

    /* #define DDIST(x, y) (dist2(x, y, omx, omy)) */
    const DDIST = (x, y) => dist2(x, y, omx, omy);

    /* src/dogmove.c — both gate the APPORT branch. couldsee() is real, so use
       it; droppables() needs monster inventory, and a pet carrying nothing is
       the reachable state until that lands. */
    const in_masters_sight = couldsee(omx, omy);
    const dog_has_minvent = false; /* droppables(mtmp) != 0 */

    for (const obj of (game.level.objects || [])) {
        const nx = obj.ox, ny = obj.oy;
        if (nx >= min_x && nx <= max_x && ny >= min_y && ny <= max_y) {
            const otyp = dogfood(mtmp, obj);
            /* skip inferior goals */
            if (otyp > gtyp || otyp === UNDEF)
                continue;
            if (!could_reach_item(mtmp, nx, ny)
                || !can_reach_location(mtmp, mtmp.mx, mtmp.my, nx, ny))
                continue;
            if (otyp < MANFOOD) {
                if (otyp < gtyp || DDIST(nx, ny) < DDIST(gx, gy)) {
                    gx = nx;
                    gy = ny;
                    gtyp = otyp;
                }
            } else if (gtyp === UNDEF && in_masters_sight
                       && !dog_has_minvent
                       && (!game.level.at(omx, omy)?.lit
                           || game.level.at(game.u.ux, game.u.uy)?.lit)
                       && (otyp === MANFOOD || m_cansee(mtmp, nx, ny))
                       && mtmp.edog?.apport > rn2(8)
                       && can_carry(mtmp, obj) > 0) {
                gx = nx;
                gy = ny;
                gtyp = APPORT;
            }
        }
    }

    /* src/dogmove.c:483 — appr is declared at function scope in C, and both
       the follow-player branch and its else arm assign it. */
    let appr = 0;

    /* src/dogmove.c:566 — follow the player.
     *
     *     if (gg.gtyp == UNDEF || (gg.gtyp != DOGFOOD && gg.gtyp != APPORT
     *                           && svm.moves < edog->hungrytime)) {
     *
     * The second arm is not optional. A goal that is neither DOGFOOD nor
     * APPORT is something the pet would eat only if it were hungry, so while
     * it is still full it follows the hero INSTEAD, and follows with an appr
     * computed here rather than the flat 1 the else arm uses. That changes
     * dog_move's `j = (ndist - nidist) * appr`: with appr 0 every candidate
     * gives j == 0 and spends an rn2(++chcnt), and with appr 1 none of them
     * do. Testing only for UNDEF made the pet march at a corpse it had no
     * appetite for and skip that whole run of draws. */
    if (gtyp === UNDEF || (gtyp !== DOGFOOD && gtyp !== APPORT
                           && game.moves < (edog?.hungrytime ?? 0))) {
        /* src/dogmove.c:566 — gg.gx/gg.gy ARE the goal dog_move steers by
           (GDIST reads them). Writing them into a separate game.gg left the
           local gx/gy at 0,0, so an appr = 1 pet walked toward the top-left
           corner of the map instead of toward the hero. */
        gx = game.u.ux;
        gy = game.u.uy;

        if (after && udist <= 4 && game.u.ux === gx && game.u.uy === gy)
            return -2;

        appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
        if (udist > 1) {
            if (!IS_ROOM(game.level.at(game.u.ux, game.u.uy)?.typ)
                || !rn2(4) || whappr)
                appr = 1;
            /* the dog_has_minvent case needs monster inventory */
        }

        /* a pet follows more closely when the hero is carrying its food, is
           on stairs, or is beside a magic portal. The inventory scan calls
           dogfood() on EVERY carried item, and dogfood() draws — so this is
           one rn2(100) per item in the pack. */
        if (appr === 0) {
            if (On_stairs(game.u.ux, game.u.uy)) {
                appr = 1;
            } else {
                for (const obj of (game.invent || [])) {
                    if (dogfood(mtmp, obj) === DOGFOOD) {
                        appr = 1;
                        break;
                    }
                }
                if (appr === 0) {
                    const t = (game.level?.traps || [])
                                  .find(tr => tr.ttyp === MAGIC_PORTAL);
                    if (t && distu(t.tx, t.ty) <= 2)
                        appr = 1;
                }
            }
        }
    } else {
        /* src/dogmove.c:605-606 — the else arm of the follow-player test sets
           appr = 1 because gtyp is not UNDEF: the object search DID find a
           goal, so head for it. Returning 0 here made the pet wander instead,
           discarding the goal the box scan had just computed. */
        appr = 1;
    }

    /* src/dogmove.c:607 */
    if (mtmp.mconf)
        appr = 0;

    /* src/dogmove.c — gg is ONE struct shared by dog_goal and dog_move; our
       dog_move reads it through GDIST(), so publish the goal rather than
       leaving the two halves out of step. */
    game.gg = { gx, gy, gtyp };
    return appr;
}

/* src/dungeon.c On_stairs() */
function On_stairs(x, y) {
    return (game.level?.stairs || []).some(st => st.sx === x && st.sy === y);
}

// src/dogmove.c:977 dog_move() — the pet's turn.
//
// dog_hunger() and dog_invent() come first in C and both draw; neither is
// ported, so this reaches dog_goal()'s search only. The stream is right up to
// the point one of those would have fired.
// src/dogmove.c find_friends() — is the master or another pet standing behind
// the target, in the line of fire? Draws nothing.
function find_friends(mtmp, mtarg, maxdist) {
    const dx = sgn(mtarg.mx - mtmp.mx), dy = sgn(mtarg.my - mtmp.my);
    let curx = mtarg.mx, cury = mtarg.my;
    let dist = distmin(mtarg.mx, mtarg.my, mtmp.mx, mtmp.my);

    for (; dist <= maxdist; ++dist) {
        curx += dx;
        cury += dy;

        if (!isok(curx, cury))
            return false;
        /* If the pet can't see beyond this point, don't check any farther */
        if (!m_cansee(mtmp, curx, cury))
            return false;
        /* Does pet think you're here? */
        if (mtmp.mux === curx && mtmp.muy === cury)
            return true;

        const pal = m_at(curx, cury);
        if (pal) {
            if (pal.mtame) {
                /* Pet won't notice invisible pets */
                if (!pal.minvis || perceives(game.mons[mtmp.mnum]))
                    return true;
            } else {
                /* Quest leaders and guardians are always seen */
                const pd = game.mons[pal.mnum];
                if (pd.msound === MSOUND.MS_LEADER
                    || pd.msound === MSOUND.MS_GUARDIAN)
                    return true;
            }
        }
    }
    return false;
}

// src/dogmove.c find_targ() — walk outwards along <dx,dy> for maxdist squares
// and return the first monster the pet can see. Draws nothing, but m_cansee()
// stops the walk, which is what keeps the pet from targeting through walls.
function find_targ(mtmp, dx, dy, maxdist) {
    let targ = null;
    let curx = mtmp.mx, cury = mtmp.my;

    for (let dist = 0; dist < maxdist; ++dist) {
        curx += dx;
        cury += dy;
        if (!isok(curx, cury))
            break;
        if (!m_cansee(mtmp, curx, cury))
            break;
        if (curx === mtmp.mux && cury === mtmp.muy)
            return game.u;                 /* &gy.youmonst */

        targ = m_at(curx, cury);
        if (targ) {
            /* Is the monster visible to the pet? */
            if ((!targ.minvis || perceives(game.mons[mtmp.mnum]))
                && !targ.mundetected
                /* if a long worm, only accept the head as a target */
                && targ.mx === curx && targ.my === cury)
                break;
            /* If the pet can't see it, it assumes it ain't there */
            targ = null;
        }
    }
    return targ;
}

// src/dogmove.c:738 score_targ() — how attractive is this target?
//
// Its `score += rnd(5)` fires once per target found and is the draw that
// seed0102 and seed0105 were missing. The two rn2(3)s only fire for a confused
// pet and the rn2(mtmp_lev/2+1) only for a vampshifter, so an ordinary pet
// spends exactly one draw here per target.
function score_targ(mtmp, mtarg) {
    let score = 0;

    /* Give 1 in 3 chance of safe breathing even if pet is confused */
    if (!mtmp.mconf || !rn2(3)) {
        let mtmp_lev;
        const tdat = (mtarg === game.u) ? null : game.mons[mtarg.mnum];

        /* the priest/minion alignment arms need the priest subsystem; no
           minion or priest is adjacent to a pet on an ordinary level */
        if (mtmp.isminion || mtmp.ispriest || mtarg.isminion || mtarg.ispriest)
            note_unported('score_targ:faith');

        /* Never target quest friendlies */
        if (tdat && (tdat.msound === MSOUND.MS_LEADER
                     || tdat.msound === MSOUND.MS_GUARDIAN))
            return -5000;
        /* Is monster adjacent? */
        if (distmin(mtmp.mx, mtmp.my, mtarg.mx ?? game.u.ux,
                    mtarg.my ?? game.u.uy) <= 1)
            return score - 3000;
        /* Is the monster peaceful or tame? Pets are never targeted */
        if (mtarg === game.u || mtarg.mtame)
            return score - 3000;
        /* Is master/pet behind monster? Check up to 15 squares beyond pet. */
        if (find_friends(mtmp, mtarg, 15))
            return score - 3000;
        /* Target hostile monsters in preference to peaceful ones */
        if (!mtarg.mpeaceful)
            score += 10;
        /* Is the monster passive? Don't waste energy on it, if so */
        if (tdat.mattk[0][0] === ATTKS.AT_NONE)
            score -= 1000;
        /* Even weak pets with breath attacks shouldn't take on very
           low-level monsters. */
        if ((mtarg.m_lev < 2 && mtmp.m_lev > 5)
            || (mtmp.m_lev > 12 && mtarg.m_lev < mtmp.m_lev - 9
                && game.u.ulevel > 8 && mtarg.m_lev < game.u.ulevel - 7))
            score -= 25;
        /* a vampshifter in weak form attacks as if in vampire form */
        mtmp_lev = mtmp.m_lev;
        if (is_vampshifter(mtmp)
            && game.mons[mtmp.mnum].mlet !== MONSYMS.S_VAMPIRE) {
            mtmp_lev = game.mons[mtmp.cham].mlevel;
            /* actual vampire level ranges from 1.0*mlvl to 1.5*mlvl */
            mtmp_lev += rn2(Math.trunc(mtmp_lev / 2) + 1);
            if (mtmp.m_lev > mtmp_lev)
                mtmp_lev = mtmp.m_lev;
        }
        /* pets hesitate to attack vastly stronger foes */
        if (mtarg.m_lev > mtmp_lev + 4)
            score -= (mtarg.m_lev - mtmp_lev) * 20;
        /* All things being the same, go for the beefiest monster. */
        score += mtarg.m_lev * 2 + Math.trunc(mtarg.mhp / 3);
    }
    /* Fuzz factor to make things less predictable when very similar targets
       are abundant. */
    score += rnd(5);
    /* Pet may decide not to use ranged attack when confused */
    if (mtmp.mconf && !rn2(3))
        score -= 1000;
    return score;
}

// src/dogmove.c:838 best_target() — the best target in a straight line from the
// pet, scanning all eight directions out to 7 squares.
function best_target(mtmp, forced) {
    let bestscore = -40000;
    let best_targ = null;

    if (!mtmp)
        return null;
    /* If the pet is blind, it's not going to see any target */
    if (!mtmp.mcansee)
        return null;

    for (let dy = -1; dy < 2; ++dy) {
        for (let dx = -1; dx < 2; ++dx) {
            if (!dx && !dy)
                continue;
            const temp_targ = find_targ(mtmp, dx, dy, 7);
            if (!temp_targ)
                continue;
            const currscore = score_targ(mtmp, temp_targ);
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

// src/dogmove.c:889 pet_ranged_attk() — the pet considers a ranged attack.
//
// dog_move calls this AFTER its position loop and BEFORE committing the move
// (src/dogmove.c:1273). We were not calling it at all, which is why seed0102
// and seed0105 both stop at score_targ's rnd(5).
function pet_ranged_attk(mtmp, forced) {
    let hungry = false;

    /* How hungry is the pet? */
    if (!mtmp.isminion && mtmp.edog)
        hungry = (game.moves > (mtmp.edog.hungrytime + DOG_HUNGRY));

    const mtarg = best_target(mtmp, forced);

    /* Hungry pets are unlikely to use breath/spit attacks */
    if (mtarg && (!hungry || !rn2(5))) {
        /* the attack itself needs mattacku / the monster attack code */
        note_unported('pet_ranged_attk:attack');
    }
    return MMOVE_NOTHING;
}

// src/dogmove.c:11-12
// src/dogmove.c:10-12
const DOG_HUNGRY = 300, DOG_WEAK = 500, DOG_STARVE = 750;


// src/dogmove.c dog_hunger() — a pet that has not eaten in DOG_WEAK turns is
// weakened, and in DOG_STARVE turns it dies. Draws nothing: it is a comparison
// of moves against edog->hungrytime, plus messages.
//
// Returns TRUE when the pet died, which makes dog_move return MMOVE_DIED and
// stops dochug from calling distfleeck a second time for it — so a pet that
// starves changes the DRAW COUNT of the turn even though this function itself
// spends nothing.
function dog_hunger(mtmp, edog) {
    const mdat = game.mons[mtmp.mnum];

    if (game.moves > edog.hungrytime + DOG_WEAK) {
        if (!carnivorous(mdat) && !herbivorous(mdat)) {
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
            if (DEADMONSTER(mtmp)) {
                note_unported('dog_starve');
                return true;
            }
            /* the "confused from hunger" / beg() messages need pline plumbing */
            note_unported('dog_hunger:messages');
        } else if (game.moves > edog.hungrytime + DOG_STARVE
                   || DEADMONSTER(mtmp)) {
            note_unported('dog_starve');
            return true;
        }
    }
    return false;
}

export function dog_move(mtmp, after) {
    const edog = mtmp.mtame ? (mtmp.edog || {}) : null;
    if (!edog) return 0;

    if (dog_hunger(mtmp, edog))
        return MMOVE_DIED;

    const omx = mtmp.mx, omy = mtmp.my;
    const udist = distu(omx, omy);

    dog_invent(mtmp, edog, udist);

    /* src/dogmove.c:1038 — whappr is TRUE for the five turns after the pet was
       whistled for, and edog->whistletime starts at 0, so it is TRUE for the
       whole opening of the game. Hardcoding it to 0 left appr at 0 there, which
       makes the pet WANDER by reservoir sample instead of approaching the hero
       — a completely different path from C's, drawn with the same numbers. */
    const whappr = (game.moves - (edog.whistletime || 0)) < 5 ? 1 : 0;
    const appr = dog_goal(mtmp, edog, after, udist, whappr);
    if (appr === -2)
        return MMOVE_NOTHING;

    /* src/dogmove.c:1062 — the squares the pet may move to */
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, mon_allowflags(mtmp));

    /* Dogs normally avoid cursed items, so count the clean squares first;
       the count is the bound of the rn2 below. */
    let uncursedcnt = 0;
    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;
        /* src/dogmove.c:1073 — a square holding a monster the pet may not
           attack or displace is not a free square, so it does not count. */
        if (m_at(nx, ny) && !(mfp.info[i] & (ALLOW_M | ALLOW_MDISP)))
            continue;
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    let nix = omx, niy = omy, chi = -1, chcnt = 0;
    let nidist = GDIST(nix, niy);
    /* src/dogmove.c:989 — cursemsg[] is PER CANDIDATE and is filled in by the
       object walk below, not by a helper called on demand. Keeping it as an
       array matters because the newdogpos code reads cursemsg[chi] for the
       square finally chosen. */
    const cursemsg = new Array(cnt).fill(false);

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;

        /* src/dogmove.c:1141 — the ALLOW_M attack and ALLOW_MDISP displace
           branches need mattackm/mdisplacem, the monster-vs-monster combat
           path. Both draw, so stop rather than guess their numbers. */
        if (mfp.info[i] & (ALLOW_M | ALLOW_U)) {
            note_unported('dog_move attack branch');
            continue;
        }

        /* src/dogmove.c:1182 — keep clear of the square the hero just kicked,
           and of a Sokoban push line. Neither draws. */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;
        if (m_avoid_soko_push_loc(mtmp, nx, ny))
            continue;

        /* src/dogmove.c:1197 — a dog avoids a harmful trap, but may have to
           cross one to keep up with the hero, so it steps on a trap it has
           SEEN once in forty tries. That rn2(40) was missing entirely: the
           whole block was absent, so no pet ever spent it.
           A leashed dog whimpers instead and is dragged across. */
        if ((mfp.info[i] & ALLOW_TRAPS) && t_at(nx, ny)) {
            const trap = t_at(nx, ny);
            if (mtmp.mleashed) {
                /* whimper() needs the sound code and the Deaf test */
                note_unported('dog_move:whimper');
            } else {
                if (trap.tseen && rn2(40))
                    continue;
            }
        }

        /* src/dogmove.c:1214 — dog eschews cursed objects, but likes dog food.
         *
         * This walks the objects ON the square, and that walk DRAWS: dogfood()
         * opens with obj_resists(obj, 0, 95), which spends an rn2(100) whatever
         * it returns. Substituting a cursed_object_at() helper for the walk
         * skipped one draw per non-cursed object on every candidate square,
         * which is the run of consecutive obj_resists calls the recordings show
         * right after dog_goal's rn2(8).
         *
         * Both short-circuits are load-bearing: a cursed object never reaches
         * dogfood(), and neither does anything when can_reach_food is false.
         */
        if (edog) {
            const can_reach_food = could_reach_item(mtmp, nx, ny);
            let ate = false;

            for (const obj of objects_at(nx, ny)) {
                if (obj.cursed) {
                    cursemsg[i] = true;
                } else if (can_reach_food) {
                    const otyp = dogfood(mtmp, obj);
                    if (otyp < MANFOOD
                        && (otyp < ACCFOOD
                            || (edog.hungrytime ?? 0) <= game.moves)) {
                        /* the dog likes the food so much it might eat it even
                           when it conceals a cursed object */
                        nix = nx;
                        niy = ny;
                        chi = i;
                        cursemsg[i] = false;    /* not reluctant */
                        ate = true;             /* do_eat = TRUE */
                        break;                  /* goto newdogpos */
                    }
                }
            }
            if (ate) {
                /* dog_eat() draws; stop rather than guess its numbers. */
                note_unported('dog_move:do_eat');
                return MMOVE_NOTHING;
            }
        }

        /* didn't find something to eat; if we saw a cursed item and aren't
           being forced to walk on it, usually keep looking */
        if (cursemsg[i] && !mtmp.mleashed && uncursedcnt > 0
            && rn2(13 * uncursedcnt))
            continue;

        /* lessen the chance of backtracking; only when loose and far away */
        if (!mtmp.mleashed && distmin(omx, omy, game.u.ux, game.u.uy) > 5) {
            const k = edog ? uncursedcnt : cnt;
            let skip = false;
            const track = mtmp.mtrack || [];
            for (let j = 0; j < MTSZ && j < k - 1; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y)
                    if (rn2(MTSZ * (k - j))) { skip = true; break; }
            if (skip) continue;
        }

        const ndist = GDIST(nx, ny);
        const j = (ndist - nidist) * appr;
        if ((j === 0 && !rn2(++chcnt)) || j < 0
            || (j > 0 && !whappr
                && ((omx === nix && omy === niy && !rn2(3)) || !rn2(12)))) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            if (j < 0) chcnt = 0;
            chi = i;
        }
    }

    /* src/dogmove.c:1273 — the pet has not attacked anything but is about to
       move; now is the time for a ranged attack. C calls this AFTER the
       position loop and BEFORE newdogpos, unconditionally. */
    {
        const i = pet_ranged_attk(mtmp, false);
        if (i !== MMOVE_NOTHING)
            return i;
    }

    /* src/dogmove.c:1276 newdogpos — apply the move. Draws nothing: it is
       remove_monster() followed by place_monster(), which for us is just the
       pet's coordinates. C does NOT reorder fmon here, so neither do we.
       Without this the pet stands still for the whole game and its search box
       drifts further from C's with every turn. */
    if (nix !== omx || niy !== omy) {
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            note_unported('mattacku');
            return MMOVE_DONE;
        }
        /* src/monmove.c mtrack — remember where we came from, newest first */
        mtmp.mtrack = mtmp.mtrack || [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;

    /* src/dogmove.c:1273 — the pet has not attacked anything but is about to
       move; now is the time for a ranged attack. */
    {
        const i = pet_ranged_attk(mtmp, false);
        if (i !== MMOVE_NOTHING)
            return i;
    }

        /* src/monmove.c:2051 — remove then place, so level.monsters[][] tracks
           the move. Writing mx/my alone leaves m_at() answering with the old
           square. */
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        return MMOVE_MOVED;
    }
    return MMOVE_NOTHING;
}

/* include/monst.h MTSZ — how many previous squares a monster remembers. */
const MTSZ = 4;

/* src/dogmove.c GDIST(x,y) = dist2(x, y, gg.gx, gg.gy) */
function GDIST(x, y) {
    const gx = game.gg?.gx ?? game.u.ux, gy = game.gg?.gy ?? game.u.uy;
    const dx = x - gx, dy = y - gy;
    return dx * dx + dy * dy;
}

/* src/hack.c distmin() — the Chebyshev distance */
function distmin(x0, y0, x1, y1) {
    return Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
}

/* src/dogmove.c cursed_object_at() */
function cursed_object_at(x, y) {
    return (game.level?.objects || [])
               .some(o => o.ox === x && o.oy === y && o.cursed);
}

/* src/rm.h svl.level.objects[x][y] — the pile on one square, walked through
   ->nexthere. place_object() PREPENDS to the level list, so filtering it in
   order gives newest-first, which is the order the chain has. Every caller
   that draws per object depends on that order. */
function objects_at(x, y) {
    return (game.level?.objects || []).filter(o => o.ox === x && o.oy === y);
}

// src/dogmove.c:410 dog_invent() — the pet drops what it carries, or picks up
// what it is standing on.
//
// Both halves are guarded, and in the common case — nothing carried, nothing
// underfoot — this draws NOTHING. That is what the recordings show: seed0101
// and seed0102 both go straight from distfleeck to dog_goal's first dogfood.
// Getting the guards right therefore matters as much as the draws.
/* src/dogmove.c:138 nofetch[] = { BALL_CLASS, CHAIN_CLASS, ROCK_CLASS } */
const nofetch = [OCLASSES.BALL_CLASS, OCLASSES.CHAIN_CLASS, OCLASSES.ROCK_CLASS];

export function dog_invent(mtmp, edog, udist) {
    if (helpless(mtmp) || mtmp.meating)
        return 0;

    const omx = mtmp.mx, omy = mtmp.my;

    if (droppables(mtmp)) {
        if (!rn2(udist + 1) || !rn2(edog.apport))
            if (rn2(10) < edog.apport) {
                note_unported('relobj');           /* the drop itself */
                if (edog.apport > 1) edog.apport--;
                edog.dropdist = udist;
                edog.droptime = game.moves;
            }
    } else {
        const obj = (game.level.objects || [])
                        .find(o => o.ox === omx && o.oy === omy);
        if (obj && !nofetch.includes(obj.oclass)) {
            const edible = dogfood(mtmp, obj);

            if ((edible <= CADAVER
                 /* a starving pet is more aggressive about eating */
                 || (edog.mhpmax_penalty && edible === ACCFOOD))
                && could_reach_item(mtmp, obj.ox, obj.oy)) {
                /* dog_eat() draws; stop rather than guess its numbers. */
                note_unported('dog_eat');
                return 0;
            }

            /* src/dogmove.c:443 — the fetch. can_carry() and
               could_reach_item() draw nothing, but they gate TWO draws that
               were being skipped entirely: rn2(20) for whether the pet is
               interested at all, and then rn2(udist) or rn2(apport) for
               whether it bothers at this distance. */
            const carryamt = can_carry(mtmp, obj);
            if (carryamt > 0 && !obj.cursed
                && could_reach_item(mtmp, obj.ox, obj.oy)) {
                if (rn2(20) < edog.apport + 3) {
                    if (rn2(udist) || !rn2(edog.apport)) {
                        /* splitobj() when carryamt is a partial stack, then
                           distant_name/pline, mpickobj and mon_wield_item. */
                        note_unported('dog_invent:pickup');
                    }
                }
            }
        }
    }
    return 0;
}

/* src/mon.c droppables() — the first thing in the pet's pack it would drop.
   Our monsters carry no inventory yet, so this is empty rather than wrong;
   m_initinv() is the gap, and it is recorded there. */
function droppables(mtmp) {
    return (mtmp.minvent && mtmp.minvent.length) ? mtmp.minvent[0] : null;
}

/* src/mondata.h helpless() */
function helpless(mtmp) {
    return !!(mtmp.msleeping || !mtmp.mcanmove || (mtmp.mfrozen | 0) > 0);
}

// src/hack.c distu() — squared distance from the hero.
function distu(x, y) {
    const dx = x - game.u.ux, dy = y - game.u.uy;
    return dx * dx + dy * dy;
}
