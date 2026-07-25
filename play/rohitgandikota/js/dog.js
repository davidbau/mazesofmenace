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
import { obj_resists } from './zap.js';
import { mfndpos, mon_allowflags, is_pool, is_lava, can_carry } from './mon.js';
import {
    COLNO, ROWNO, IS_ROOM, MAGIC_PORTAL, ALLOW_M, ALLOW_U,
    IS_OBSTRUCTED, IS_DOOR, D_CLOSED, D_LOCKED, isok,
} from './const.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { MFLAGS, MONSYMS, NUMMONS } from './monst_data.js';

const { WOOD, IRON, SILVER, MITHRIL } = MATERIALS;
import { rn2 } from './rng.js';
import { dist2 } from './hacklib.js';
import { couldsee } from './vision.js';
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

    initedog(mtmp);
    return mtmp;
}

// src/dog.c initedog() — tame flags only, no draw.
function initedog(mtmp) {
    mtmp.mtame = 10;
    mtmp.mpeaceful = 1;
    mtmp.mavenge = 0;
    mtmp.mleashed = 0;
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
// include/monst.h:217 is_vampshifter() — a monster, not a permonst.
const is_vampshifter = (mon) =>
    mon.cham === PMNAMES.PM_VAMPIRE || mon.cham === PMNAMES.PM_VAMPIRE_LEADER
    || mon.cham === PMNAMES.PM_VLAD_THE_IMPALER;
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
const touch_petrifies = (ptr) => ptr.pmidx === PMNAMES.PM_COCKATRICE
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
const is_metallic  = (otmp) => game.objects[otmp.otyp].oc_material >= IRON
                            && game.objects[otmp.otyp].oc_material <= MITHRIL;
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

function mon_hates_silver(mon) {
    note_unported('mon_hates_silver');
    return false;
}

const resists_ston   = (mon) => { note_unported('resists_ston'); return false; };
const resists_acid   = (mon) => { note_unported('resists_acid'); return false; };

// src/dogmove.c could_reach_item()
function could_reach_item(mon, nx, ny) {
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

// src/detect.c sobj_at() — a specific object type on the floor here.
function sobj_at(otyp, x, y) {
    return (game.level?.objects || [])
        .some(o => o.ox === x && o.oy === y && o.otyp === otyp);
}

/* src/dig.c may_dig() and src/mon.c m_cansee() are not ported; both only narrow
   which square is chosen and neither draws. */
function may_dig(x, y) {
    note_unported('may_dig');
    return true;
}

function m_cansee(mon, x, y) {
    note_unported('m_cansee');
    return true;
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

    /* src/dogmove.c:565 — follow the player.
       gtyp is UNDEF whenever the object search above found nothing. */
    if (gtyp === UNDEF) {
        game.gg = { gx: game.u.ux, gy: game.u.uy, gtyp };

        if (after && udist <= 4 && game.u.ux === game.gg.gx
            && game.u.uy === game.gg.gy)
            return -2;

        let appr = (udist >= 9) ? 1 : (mtmp.mflee ? -1 : 0);
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
        return appr;
    }

    note_unported('dog_goal non-follow goal');
    return 0;
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
export function dog_move(mtmp, after) {
    const edog = mtmp.mtame ? (mtmp.edog || {}) : null;
    if (!edog) return 0;

    /* src/dogmove.c dog_hunger() draws nothing — it is a comparison of
       moves against edog->hungrytime plus messages. Not ported; when it
       matters it kills a starving pet, which no public session reaches. */
    note_unported('dog_hunger');

    const omx = mtmp.mx, omy = mtmp.my;
    const udist = distu(omx, omy);

    dog_invent(mtmp, edog, udist);

    const whappr = 0;                 /* moves - edog.whistletime < 5 */
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
        if (cursed_object_at(nx, ny))
            continue;
        uncursedcnt++;
    }

    let nix = omx, niy = omy, chi = -1, chcnt = 0;
    let nidist = GDIST(nix, niy);

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;
        const cursemsg = cursed_object_at(nx, ny);

        /* the eat/attack branches at the top of this loop need dog_eat and
           the monster-attack path; neither is ported and both draw */
        if (mfp.info[i] & (ALLOW_M | ALLOW_U)) {
            note_unported('dog_move attack branch');
            continue;
        }

        /* saw a cursed item and is not being forced onto it */
        if (cursemsg && !mtmp.mleashed && uncursedcnt > 0
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
const MMOVE_NOTHING = 0, MMOVE_MOVED = 2, MMOVE_DONE = 3;

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

            if (edible <= CADAVER
                || (edog.mhpmax_penalty && edible === ACCFOOD)) {
                /* could_reach_item() and dog_eat() are not ported; dog_eat
                   draws, so stop here rather than guess. */
                note_unported('dog_eat');
                return 0;
            }
            /* can_carry() itself draws nothing, but it and could_reach_item()
               decide whether the rn2(20) below happens at all. */
            note_unported('dog_invent pickup');
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
