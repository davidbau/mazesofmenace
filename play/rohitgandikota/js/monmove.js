// monmove.js — monster movement.
// C ref: src/monmove.c
//
// distfleeck() draws rn2(5) unconditionally at its head (the "brave gremlin"
// roll), once per monster that acts, so it is the first thing a turn with
// awake monsters spends after the movement allotment.

import { game } from './gstate.js';
import { autoreturn_weapon } from './weapon.js';
import { MON_WEP } from './monst.js';
import { is_launcher, is_pole } from './u_init.js';
import { ammo_and_launcher } from './wield.js';
import { MON_POLE_DIST, OBJ_FLOOR, RAY, MFAST, NON_PM, W_ARMG, W_WEP,
    IS_OBSTRUCTED, LAVAWALL,
    P_DAGGER, P_KNIFE,
    AM_SHRINE, Amask2align, ROOMOFFSET
} from './const.js';
import { amorphous, passes_walls, is_floater, nonliving,
         attacktype, can_blow, needspick, flaming, noncorporeal } from './mondata.js';
import { ACCESSIBLE, DOOR, D_LOCKED, D_CLOSED } from './const.js';
import { is_vampshifter } from './monst.js';
import { newsym } from './display.js';
import { sobj_at } from './invent.js';
import { m_carrying, meatmetal, resists_ston } from './mon.js';
import { acidic, slimeproof } from './dog.js';
import { Is_mbag } from './mkobj.js';
import { Is_container } from './obj.js';
import { is_weptool } from './mkobj.js';
import { metallivorous, corpse_eater } from './mondata.js';
import { place_monster, remove_monster } from './makemon.js';
import { rn2, rnd } from './rng.js';
import {
    dog_move, could_reach_item, dogfood, MANFOOD, ACCFOOD,
} from './dog.js';
import {
    mfndpos, mon_allowflags, can_carry, t_at, m_at,
    curr_mon_load, max_mon_load,
} from './mon.js';
import { MONSYMS, MFLAGS, PMNAMES, ATTKS } from './monst_data.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { couldsee, cansee, clear_path } from './vision.js';
import { gettrack } from './track.js';
import { distmin , isok, sgn, distu, dist2} from './hacklib.js';
import { acurrstr } from './attrib.js';

// include/mondata.h throws_rocks()
const throws_rocks = (ptr) => (ptr.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;

// src/mondata.c:623 can_track() — Excalibur or eyes.
const can_track = (ptr) => haseyes(ptr);
const haseyes = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOEYES) === 0;
import {
    ALLOW_U, COULD_SEE, A_LAWFUL, BOLT_LIM, IS_ALTAR, COLNO, ROWNO, A_STR,
    ALL_TRAPS, NO_TRAP,
    G_GENOD,
} from './const.js';
import { is_rider } from './makemon.js';
import { MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE,
         MMOVE_NOMOVES, engulfing_u } from './const.js';
import { MSOUND } from './monst_data.js';

// src/priest.c:9 ALGN_SINNED — worse than strayed (-1..-3).
const ALGN_SINNED = -4;

/* include/monst.h:214, include/mondata.h:81,174, include/hack.h:1414 and
   include/monst.h:217,281 — the one-line predicates distfleeck() and onscary()
   test with. Kept as single expressions so each reads like its macro. */
const DEADMONSTER = (mon) => (mon.mhp ?? 0) < 1;
const perceives = (ptr) => (ptr.mflags1 & MFLAGS.M1_SEE_INVIS) !== 0;
const unique_corpstat = (ptr) => (ptr.geno & MFLAGS.G_UNIQ) !== 0;
const NODIAG = (monnum) => monnum === PMNAMES.PM_GRID_BUG;
const is_minion = (ptr) => (ptr.mflags2 & MFLAGS.M2_MINION) !== 0;
const is_lminion = (mon) =>
    is_minion(game.mons[mon.mnum]) && mon_aligntyp(mon) === A_LAWFUL;

// src/mon.c mon_aligntyp()
export function mon_aligntyp(mon) {
    return game.mons[mon.mnum].maligntyp;
}

/* src/monmove.c:450 flees_light() — gremlins flee an artifact light source.
   Needs artifact_light() and couldsee(), neither of which is ported; a gremlin
   is the only monster it can ever be true for. */
function flees_light(mon) {
    if (mon.mnum !== PMNAMES.PM_GREMLIN)
        return false;
    note_unported('flees_light');
    return false;
}

/* src/priest.c in_your_sanctuary() — a temple with a peaceful coaligned priest.
   The early returns that need no priest data are ported; the rest needs the
   priest subsystem. */
export function in_your_sanctuary(mon, x, y) {
    if (mon) {
        if (is_minion(game.mons[mon.mnum]) || is_rider(game.mons[mon.mnum]))
            return false;
        x = mon.mx, y = mon.my;
    }
    if (game.u.ualign.record <= ALGN_SINNED) /* sinned or worse */
        return false;
    if (!game.in_rooms)
        return false;                   /* hack.js not loaded yet */

    /* C: `roomno != *in_rooms(x, y, TEMPLE)` dereferences the first char of a
       possibly-empty string, i.e. compares against '\0'. charAt(0) on an empty
       string gives '', and the roomno === '' guard keeps that from matching. */
    const roomno = temple_occupied(_in_rooms(game.u.ux, game.u.uy, 0));
    if (roomno === '' || roomno !== _in_rooms(x, y, TEMPLE).charAt(0))
        return false;

    const priest = findpriest(roomno);
    if (!priest)
        return false;

    return has_shrine(priest) && p_coaligned(priest) && !!priest.mpeaceful;
}

/* js/hack.js publishes in_rooms on the shared game object; importing it here
   closes a cycle, moving this function to js/priest.js regresses the corpus by
   restructuring the module graph, and adding the import to the entry point
   perturbs init order. All three were measured -- see STATUS. */
const _in_rooms = (x, y, t) => game.in_rooms?.(x, y, t) ?? '';

// src/priest.c temple_occupied() — the first room in `array` that is a temple.
// C passes u.urooms; in_rooms(u.ux, u.uy, 0) is the same set computed from the
// hero's position, which is what urooms holds.
function temple_occupied(array) {
    for (const ch of array || '')
        if (game.level?.rooms?.[ch.charCodeAt(0) - ROOMOFFSET]?.rtype === TEMPLE)
            return ch;
    return '';
}

// src/priest.c histemple_at()
function histemple_at(priest, x, y) {
    const r = _in_rooms(x, y, TEMPLE);
    return !!(priest && priest.ispriest && r
              && priest.epri?.shroom === r.charCodeAt(0)
              && priest.epri.shrlevel.dnum === game.u.uz.dnum
              && priest.epri.shrlevel.dlevel === game.u.uz.dlevel);
}

// src/priest.c findpriest()
function findpriest(roomno) {
    for (const mtmp of game.level.monsters || []) {
        if (DEADMONSTER(mtmp))
            continue;
        if (mtmp.ispriest && mtmp.epri?.shroom === roomno
            && histemple_at(mtmp, mtmp.mx, mtmp.my))
            return mtmp;
    }
    return null;
}

// src/priest.c has_shrine()
function has_shrine(pri) {
    if (!pri || !pri.ispriest)
        return false;
    const e = pri.epri;
    const lev = game.level.at(e.shrpos.x, e.shrpos.y);
    if (!lev || !IS_ALTAR(lev.typ) || !(lev.altarmask & AM_SHRINE))
        return false;
    return e.shralign === Amask2align(lev.altarmask & ~AM_SHRINE);
}

/* src/priest.c:370 p_coaligned(). js/priest.js owns it, but importing that
   module here closes a cycle (see NOTES, "The module graph is load-bearing"),
   so priest.js publishes it on the shared game object the way js/hack.js
   publishes in_rooms. */
const p_coaligned = (priest) => game.p_coaligned?.(priest) ?? false;

/* src/shk.c inhishop() / src/priest.c inhistemple() — both need the shop and
   temple bookkeeping. No shopkeeper or priest is created on an ordinary level
   before either subsystem lands, so the flags they guard are never set. */
function inhishop(mtmp) {
    note_unported('inhishop');
    return false;
}

function inhistemple(mtmp) {
    note_unported('inhistemple');
    return false;
}

// include/mondata.h:115 is_wanderer()
const is_wanderer = (ptr) => (ptr.mflags2 & MFLAGS.M2_WANDER) !== 0;

// src/steal.c:45 findgold() — the first gold stack in a chain.
function findgold(chain) {
    for (const obj of (chain || []))
        if (obj.oclass === OCLASSES.COIN_CLASS)
            return obj;
    return null;
}

// src/monmove.c leppie_avoidance() — a leprechaun richer than the hero keeps
// its distance instead of closing in.
function leppie_avoidance(mtmp) {
    if (mtmp.mnum !== PMNAMES.PM_LEPRECHAUN)
        return false;

    const lepgold = findgold(mtmp.minvent);
    if (!lepgold)
        return false;
    const ygold = findgold(game.invent);
    return lepgold.quan > (ygold ? ygold.quan : 0);
}

// src/mthrowu.c:1398 lined_up() — needs m_lined_up's line-of-fire geometry.
// It only ever suppresses the item search for a monster already in position to
// shoot, and it draws nothing.
// src/mthrowu.c:1398 lined_up() = m_lined_up(&youmonst, mtmp)
//
// The hero-concealment arm draws rn2(25) but is gated on Upolyd, which no
// recorded session reaches. Everything else is geometry, now that clear_path
// exists to answer linedup()'s line-of-sight test.
function lined_up(mtmp) {
    const tx = mtmp.mux, ty = mtmp.muy;
    const ignore_boulders = throws_rocks(game.mons[mtmp.mnum])
                         || m_carrying(mtmp, ONAMES.WAN_STRIKING);

    if (game.u.umonnum !== game.u.umonster) {
        /* Upolyd: the concealment test draws rn2(25) */
        note_unported('m_lined_up:polyd concealment');
        return false;
    }

    return linedup(tx, ty, mtmp.mx, mtmp.my, ignore_boulders ? 1 : 2);
}

// src/mthrowu.c linedup() — a straight orthogonal or diagonal line within
// BOLT_LIM, with a clear path along it. The boulder-tolerant modes walk the
// line counting boulders; mode 2 then draws rn2(2 + boulderspots).
function linedup(ax, ay, bx, by, boulderhandling) {
    const tbx = ax - bx, tby = ay - by;

    /* displacement can make a monster think you are at its own location */
    if (!tbx && !tby)
        return false;

    if ((!tbx || !tby || Math.abs(tbx) === Math.abs(tby))
        && distmin(tbx, tby, 0, 0) < BOLT_LIM) {
        if (game.u.ux === ax && game.u.uy === ay
            ? couldsee(bx, by)
            : clear_path(ax, ay, bx, by))
            return true;
        if (boulderhandling === 0)
            return false;

        /* No line of sight, but it may still be lined up if the ONLY things in
           the way are boulders. Note the draw at the end: rn2(2 +
           boulderspots), so more boulders make a clear shot less likely, and
           boulderhandling == 1 skips the roll entirely. */
        const dx = sgn(ax - bx), dy = sgn(ay - by);
        let boulderspots = 0;
        let cx = bx, cy = by;
        do {
            /* <cx,cy> is guaranteed to eventually converge with <ax,ay> */
            cx += dx; cy += dy;
            if (blocking_terrain(cx, cy))
                return false;
            if (sobj_at(ONAMES.BOULDER, cx, cy))
                ++boulderspots;
        } while (cx !== ax || cy !== ay);

        /* reached target position without encountering an obstacle */
        if (boulderhandling === 1 || rn2(2 + boulderspots) < 2)
            return true;
        return false;
    }
    return false;
}


// src/monmove.c:1330 m_search_items() — look for an object worth walking to,
// and REWRITE the goal to it. One draw, the rn2(25) that usually makes a
// monster ignore merchandise inside a shop.
//
// goal is {x,y} and st is {mmoved, appr} because C passes all four by pointer
// and the caller depends on every one of them coming back changed.
function m_search_items(mtmp, goal, st) {
    let minr = SQSRCHRADIUS; /* not too far away */
    const omx = mtmp.mx, omy = mtmp.my;
    const ptr = game.mons[mtmp.mnum];

    /* cut down the search radius if it thinks character is closer. */
    if (distmin(mtmp.mux, mtmp.muy, omx, omy) < SQSRCHRADIUS && !mtmp.mpeaceful)
        minr--;
    /* guards shouldn't get too distracted */
    if (!mtmp.mpeaceful && is_mercenary(ptr))
        minr = 1;

    /* in shop, usually skip. in_rooms(SHOPBASE) needs the shop subsystem; no
       shop exists on a level before it lands, so the rn2(25) is not reachable
       yet and recording it keeps the gap visible. */
    if (in_shop(omx, omy)) {
        note_unported('m_search_items:shop');
    } else {
        /* distmin() gives a rectangular area */
        const hmx = Math.min(COLNO - 1, omx + minr);
        const hmy = Math.min(ROWNO - 1, omy + minr);
        const lmx = Math.max(1, omx - minr);
        const lmy = Math.max(0, omy - minr);

        for (let xx = lmx; xx <= hmx; xx++) {
            for (let yy = lmy; yy <= hmy; yy++) {
                /* no object here */
                if (!OBJ_AT(xx, yy))
                    continue;
                /* found an object closer already */
                if (minr < distmin(omx, omy, xx, yy))
                    continue;
                if (!could_reach_item(mtmp, xx, yy))
                    continue;
                /* hiders avoid hero's line of sight */
                if (hides_under(ptr) && cansee(xx, yy))
                    continue;
                /* don't get stuck circling an object underneath an immobile
                   or hidden monster */
                const mtoo = m_at(xx, yy);
                if (mtoo && (mtoo.mundetected
                             || (mtoo.mappearance && !mtoo.iswiz)
                             || !game.mons[mtoo.mnum].mmove))
                    continue;
                /* Don't get stuck circling an Elbereth */
                if (onscary(xx, yy, mtmp))
                    continue;
                /* ignore obj if there's a trap and monster knows it */
                const ttmp = t_at(xx, yy);
                if (ttmp && mon_knows_traps(mtmp, ttmp.ttyp)) {
                    if (goal.x === xx && goal.y === yy) {
                        goal.x = mtmp.mux;
                        goal.y = mtmp.muy;
                    }
                    continue;
                }

                /* look through the items on this location */
                for (const otmp of objects_at(xx, yy)) {
                    /* monsters may pick rocks up, but won't go out of their
                       way to grab them */
                    if (otmp.otyp === ONAMES.ROCK)
                        continue;

                    if (((mon_would_take_item(mtmp, otmp)
                          && (can_carry(mtmp, otmp) > 0))
                         || mon_would_consume_item(mtmp, otmp))) {
                        minr = distmin(omx, omy, xx, yy);
                        goal.x = otmp.ox;
                        goal.y = otmp.oy;
                        if (goal.x === omx && goal.y === omy) {
                            st.mmoved = MMOVE_DONE; /* actually unnecessary */
                            return true;
                        }
                        /* found an item of interest; skip the rest of the pile */
                        break;
                    }
                }
            }
        }
    }

    /* finish_search */
    if (minr < SQSRCHRADIUS && st.appr === -1) {
        if (distmin(omx, omy, mtmp.mux, mtmp.muy) <= 3) {
            goal.x = mtmp.mux;
            goal.y = mtmp.muy;
        } else {
            st.appr = 1;
        }
    }
    return false;
}

const SQSRCHRADIUS = 5;
const is_mercenary = (ptr) => (ptr.mflags2 & MFLAGS.M2_MERC) !== 0;

function objects_at(x, y) {
    return (game.level?.objects || []).filter(o => o.ox === x && o.oy === y);
}

/* include/mondata.h:143-146 and friends — what a monster is willing to pick up.
   likes_objs counts an armed monster as a collector. */
const mindless    = (ptr) => (ptr.mflags1 & MFLAGS.M1_MINDLESS) !== 0;
const is_animal   = (ptr) => (ptr.mflags1 & MFLAGS.M1_ANIMAL) !== 0;
const likes_gold  = (ptr) => (ptr.mflags2 & MFLAGS.M2_GREEDY) !== 0;
const likes_gems  = (ptr) => (ptr.mflags2 & MFLAGS.M2_JEWELS) !== 0;
const likes_magic = (ptr) => (ptr.mflags2 & MFLAGS.M2_MAGIC) !== 0;
const is_armed    = (ptr) => ptr.mattk.some(a => a[0] === ATTKS.AT_WEAP);
const likes_objs  = (ptr) => (ptr.mflags2 & MFLAGS.M2_COLLECT) !== 0 || is_armed(ptr);
const is_unicorn  = (ptr) => ptr.mlet === MONSYMS.S_UNICORN && likes_gems(ptr);

/* include/obj.h:337 Is_container() and :339 Is_mbag(). Both are duplicated
   here on purpose: js/obj.js has Is_container and js/mkobj.js has a private
   Is_mbag, but adding an import edge to monmove.js closes a cycle (NOTES,
   "The module graph is load-bearing"). dup-defs will flag these; the bodies
   are transcribed from the same C macros. */
/* Is_container comes from js/obj.js. */
/* Is_mbag comes from js/mkobj.js. */
const touch_petrifies = (ptr) => ptr.pmidx === PMNAMES.PM_COCKATRICE
                              || ptr.pmidx === PMNAMES.PM_CHICKATRICE;

// src/monmove.c:991 — the object classes a collector and a magic-user want.
const practical = [OCLASSES.WEAPON_CLASS, OCLASSES.ARMOR_CLASS,
                   OCLASSES.GEM_CLASS, OCLASSES.FOOD_CLASS];
const magical = [OCLASSES.AMULET_CLASS, OCLASSES.POTION_CLASS,
                 OCLASSES.SCROLL_CLASS, OCLASSES.WAND_CLASS,
                 OCLASSES.RING_CLASS, OCLASSES.SPBOOK_CLASS];

// src/mondata.c:1617 mon_knows_traps() — mtrapseen is a bitmask of trap types
// the monster has learned, with bit (ttyp - 1) per type.
export function mon_knows_traps(mtmp, ttyp) {
    if (ttyp === ALL_TRAPS)
        return !!mtmp.mtrapseen;
    else if (ttyp === NO_TRAP)
        return !mtmp.mtrapseen;
    else
        return ((mtmp.mtrapseen ?? 0) & (1 << (ttyp - 1))) !== 0;
}

// src/monmove.c mon_would_take_item() — each class of taker has its own load
// ceiling, so a heavily-laden monster stops being interested rather than being
// refused later by can_carry().
function mon_would_take_item(mtmp, otmp) {
    const ptr = game.mons[mtmp.mnum];
    const pctload = Math.trunc((curr_mon_load(mtmp) * 100) / max_mon_load(mtmp));

    if (otmp === game.u.uball || otmp === game.u.uchain)
        return false;
    if (mtmp.mtame && otmp.cursed)
        return false; /* note: will get overridden if mtmp will eat otmp */
    if (is_unicorn(ptr)
        && game.objects[otmp.otyp].oc_material !== MATERIALS.GEMSTONE)
        return false;
    if (!mindless(ptr) && !is_animal(ptr) && pctload < 75
        && searches_for_item(mtmp, otmp))
        return true;
    if (likes_gold(ptr) && otmp.otyp === ONAMES.GOLD_PIECE && pctload < 95)
        return true;
    if (likes_gems(ptr) && otmp.oclass === OCLASSES.GEM_CLASS
        && game.objects[otmp.otyp].oc_material !== MATERIALS.MINERAL
        && pctload < 85)
        return true;
    if (likes_objs(ptr) && practical.includes(otmp.oclass) && pctload < 75)
        return true;
    if (likes_magic(ptr) && magical.includes(otmp.oclass) && pctload < 85)
        return true;
    if (throws_rocks(ptr) && otmp.otyp === ONAMES.BOULDER && pctload < 50)
        return true;
    if (mtmp.mnum === PMNAMES.PM_GELATINOUS_CUBE
        && otmp.oclass !== OCLASSES.ROCK_CLASS
        && otmp.oclass !== OCLASSES.BALL_CLASS
        && !(otmp.otyp === ONAMES.CORPSE
             && touch_petrifies(game.mons[otmp.corpsenm])))
        return true;

    return false;
}

/* src/muse.c:2706 searches_for_item() needs the whole monster item-use
   subsystem. Its caller gates it behind !mindless && !is_animal, so no animal
   or mindless monster — which is most of an early level — can reach it. */
function searches_for_item(mon, obj) {
    const typ = obj.otyp;
    const d = game.mons[mon.mnum];

    /* don't let monsters interact with protected items on the floor */
    if (obj.where === OBJ_FLOOR && obj.ox === mon.mx && obj.oy === mon.my
        && onscary(obj.ox, obj.oy, mon))
        return false;

    if (is_animal(d) || mindless(d) || mon.mnum === PMNAMES.PM_GHOST)
        return false;               /* don't loot bones piles */

    if (typ === ONAMES.WAN_MAKE_INVISIBLE || typ === ONAMES.POT_INVISIBILITY)
        return !mon.minvis && !mon.invis_blkd && !attacktype(d, ATTKS.AT_GAZE);
    if (typ === ONAMES.WAN_SPEED_MONSTER || typ === ONAMES.POT_SPEED)
        return mon.mspeed !== MFAST;

    switch (obj.oclass) {
    case OCLASSES.WAND_CLASS:
        if (obj.spe <= 0)
            return false;
        if (typ === ONAMES.WAN_DIGGING)
            return !is_floater(d);
        if (typ === ONAMES.WAN_POLYMORPH)
            return d.difficulty < 6;
        if (game.objects[typ].oc_dir === RAY || typ === ONAMES.WAN_STRIKING
            || typ === ONAMES.WAN_UNDEAD_TURNING
            || typ === ONAMES.WAN_TELEPORTATION
            || typ === ONAMES.WAN_CREATE_MONSTER)
            return true;
        break;
    case OCLASSES.POTION_CLASS:
        if (typ === ONAMES.POT_HEALING || typ === ONAMES.POT_EXTRA_HEALING
            || typ === ONAMES.POT_FULL_HEALING || typ === ONAMES.POT_POLYMORPH
            || typ === ONAMES.POT_GAIN_LEVEL || typ === ONAMES.POT_PARALYSIS
            || typ === ONAMES.POT_SLEEPING || typ === ONAMES.POT_ACID
            || typ === ONAMES.POT_CONFUSION)
            return true;
        if (typ === ONAMES.POT_BLINDNESS && !attacktype(d, ATTKS.AT_GAZE))
            return true;
        break;
    case OCLASSES.SCROLL_CLASS:
        if (typ === ONAMES.SCR_TELEPORTATION
            || typ === ONAMES.SCR_CREATE_MONSTER
            || typ === ONAMES.SCR_EARTH || typ === ONAMES.SCR_FIRE)
            return true;
        break;
    case OCLASSES.AMULET_CLASS:
        if (typ === ONAMES.AMULET_OF_LIFE_SAVING)
            return !(nonliving(d) || is_vampshifter(mon));
        if (typ === ONAMES.AMULET_OF_REFLECTION
            || typ === ONAMES.AMULET_OF_GUARDING)
            return true;
        break;
    case OCLASSES.TOOL_CLASS:
        if (typ === ONAMES.PICK_AXE)
            return needspick(d);
        if (typ === ONAMES.UNICORN_HORN)
            return !obj.cursed && !is_unicorn(d)
                   && mon.mnum !== PMNAMES.PM_KI_RIN;
        if (typ === ONAMES.FROST_HORN || typ === ONAMES.FIRE_HORN)
            return obj.spe > 0 && can_blow(mon);
        if (Is_container(obj) && !(Is_mbag(obj) && obj.cursed) && !obj.olocked)
            return true;
        if (typ === ONAMES.EXPENSIVE_CAMERA)
            return obj.spe > 0;
        break;
    case OCLASSES.FOOD_CLASS:
        if (typ === ONAMES.CORPSE)
            return ((mon.misc_worn_check & W_ARMG) !== 0
                    && touch_petrifies(game.mons[obj.corpsenm]))
                   || (!resists_ston(mon) && cures_stoning(mon, obj, false));
        if (typ === ONAMES.TIN)
            return mcould_eat_tin(mon)
                   && !resists_ston(mon) && cures_stoning(mon, obj, true);
        if (typ === ONAMES.EGG && obj.corpsenm !== NON_PM)
            return touch_petrifies(game.mons[obj.corpsenm]);
        break;
    default:
        break;
    }
    return false;
}

// src/monmove.c:1036 mon_would_consume_item() — would this monster eat the
// object rather than carry it? m_search_items() treats that as a reason to walk
// to it, so a wrong answer changes the pet's goal.
//
// The second arm calls dogfood(), which DRAWS an rn2(100) through obj_resists.
// Stubbing this to false skipped that draw for every tame monster considering
// an object it might eat.
function mon_would_consume_item(mtmp, otmp) {
    if (otmp.otyp === ONAMES.CORPSE
        && !touch_petrifies(game.mons[otmp.corpsenm])
        && corpse_eater(game.mons[mtmp.mnum]))
        return true;

    if (mtmp.mtame && mtmp.edog) { /* has_edog(): not guardian angel */
        const ftyp = dogfood(mtmp, otmp);
        if (ftyp < MANFOOD
            && (ftyp < ACCFOOD || mtmp.edog.hungrytime <= game.moves))
            return true;
    }

    return false;
}

/* in_rooms(SHOPBASE) needs the shop subsystem; no shop exists on a level
   before it lands. */
function in_shop(x, y) { return false; }

// src/monmove.c:76 mon_track_add() — push a coordinate onto the monster's
// memory of where it has just been. m_move() consults it to avoid pacing back
// and forth, so the contents decide the modulus of an rn2 in the position loop.
export function mon_track_add(mtmp, x, y) {
    mtmp.mtrack = mtmp.mtrack || [];
    mtmp.mtrack.unshift({ x, y });
    if (mtmp.mtrack.length > MTSZ)
        mtmp.mtrack.length = MTSZ;
}

// src/monmove.c:88 mon_track_clear()
export function mon_track_clear(mtmp) {
    mtmp.mtrack = [];
}

// src/mon.c monnear() — adjacent, with no diagonal for NODIAG monsters.
function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);

    if (distance === 2 && NODIAG(mon.mnum))
        return false;
    return distance < 3;
}

// src/monmove.c onscary() — is this square one the monster refuses to stand on?
//
// Draws nothing, but it is what turns *scared on, and a scared monster spends
// an rnd() in monflee(). The engraving and scare-monster-scroll branches need
// subsystems that are not ported, so they are recorded rather than guessed:
// answering TRUE there would invent a flee (and a draw) that C did not make.
// src/monmove.c:133 m_can_break_boulder() — may this monster smash a boulder
// out of its way? Riders always can; shopkeepers, priests and quest leaders
// can while their special attack is off cooldown.
//
// mon_allowflags() reads it alongside throws_rocks() to decide ALLOW_ROCK, and
// mfndpos() then REJECTS any square holding a boulder when ALLOW_ROCK is
// clear. Leaving it out shrinks the candidate list for every shopkeeper,
// priest and leader on a level with boulders.
// src/monmove.c:2365 can_fog() — may this monster turn into a fog cloud to
// slip under a closed door? Only vampshifters, and only while fog clouds are
// not genocided, the hero has no Protection from shape changers, and the
// monster is not carrying something that would stop it.
//
// mfndpos() reads it beside amorphous() to decide whether a closed door blocks
// the square at all.
export function can_fog(mtmp) {
    if (!(game.mvitals?.[PMNAMES.PM_FOG_CLOUD]?.mvflags & G_GENOD)
        && is_vampshifter(mtmp)) {
        /* Protection_from_shape_changers needs the hero's worn items, and
           stuff_prevents_passage() needs monster inventory. */
        note_unported('can_fog:Protection_from_shape_changers');
        return false;
    }
    return false;
}

// src/monmove.c m_avoid_kicked_loc() — a peaceful or tame monster next to the
// hero keeps clear of the square the hero just kicked, so it does not walk
// into the follow-through.
export function m_avoid_kicked_loc(mtmp, nx, ny) {
    const k = game.kickedloc;
    return !!((mtmp.mpeaceful || mtmp.mtame)
              && mtmp.mcansee
              && !mtmp.mconf && !mtmp.mstun
              && !Conflict()
              && k && isok(k.x, k.y)
              && nx === k.x && ny === k.y
              && next2u(nx, ny));
}

// src/monmove.c m_avoid_soko_push_loc() — in Sokoban a friendly monster will
// not stand where it would be pushed into a boulder the hero is lined up with.
export function m_avoid_soko_push_loc(mtmp, nx, ny) {
    return !!(Sokoban()
              && (mtmp.mpeaceful || mtmp.mtame)
              && !mtmp.mconf && !mtmp.mstun
              && !Conflict()
              && dist2(nx, ny, game.u.ux, game.u.uy) === 4
              && sobj_at(ONAMES.BOULDER,
                         nx + sgn(game.u.ux - nx),
                         ny + sgn(game.u.uy - ny)));
}

// include/you.h:558 next2u()
const next2u = (px, py) => distu(px, py) <= 2;

// include/rm.h:538 Sokoban — the level flag.
const Sokoban = () => game.level?.flags?.sokoban_rules === true;

// include/youprop.h:218 Conflict — (HConflict || EConflict), the intrinsic or
// the extrinsic. The port keeps the hero's properties on u.uprops, so this
// reads them the same way the clairvoyance check in js/allmain.js does. There
// is no source of conflict in the game yet, so it answers false today, but it
// answers it by LOOKING rather than by assuming.
const Conflict = () => !!(game.u?.uprops?.CONFLICT);

export function m_can_break_boulder(mtmp) {
    return is_rider(mtmp.data)
        || (!mtmp.mspec_used
            && (mtmp.isshk || mtmp.ispriest
                || mtmp.data.msound === MSOUND.MS_LEADER));
}

export function onscary(x, y, mtmp) {
    /* <0,0> is used by musical scaring; it doesn't care about scrolls or
       engravings or dungeon branch */
    const auditory_scare = (x === 0 && y === 0);
    const magical_scare = !auditory_scare;

    /* creatures who are directly resistant to any type of scaring:
       Rodney, lawful minions, Angels, the Riders */
    if (mtmp.iswiz || is_lminion(mtmp) || mtmp.mnum === PMNAMES.PM_ANGEL
        || is_rider(game.mons[mtmp.mnum]))
        return false;

    /* creatures who are directly resistant to magical scaring based on the
       mere presence of something at a location: humans etc. */
    if (magical_scare
        && (game.mons[mtmp.mnum].mlet === MONSYMS.S_HUMAN
            || unique_corpstat(game.mons[mtmp.mnum])))
        return false;

    /* shopkeepers inside their own shop, priests inside their own temple */
    if ((mtmp.isshk && inhishop(mtmp)) || (mtmp.ispriest && inhistemple(mtmp)))
        return false;

    if (auditory_scare)
        return true;

    /* should this still be true for defiled/molochian altars? */
    const loc = game.level?.at(x, y);
    if (loc && IS_ALTAR(loc.typ)
        && (game.mons[mtmp.mnum].mlet === MONSYMS.S_VAMPIRE
            || is_vampshifter(mtmp)))
        return true;

    /* the scare monster scroll doesn't have any of the below
     * restrictions, being its own source of power */
    if (sobj_at(ONAMES.SCR_SCARE_MONSTER, x, y))
        return true;

    /* sengr_at("Elbereth") needs the engraving code, which is absent. */
    note_unported('onscary:elbereth');
    return false;
}

// src/monmove.c:462 monflee() — begin fleeing for fleetime turns.
//
// The caller has already spent the rnd() that produces fleetime; this function
// itself only draws through its messages, which need pline plumbing that is not
// here yet.
export function monflee(mtmp, fleetime, first, fleemsg) {
    if (DEADMONSTER(mtmp))
        return;

    if (mtmp === game.u.ustuck)
        note_unported('release_hero');

    if (!first || !mtmp.mflee) {
        /* don't lose untimed scare */
        if (!fleetime) {
            mtmp.mfleetim = 0;
        } else if (!mtmp.mflee || mtmp.mfleetim) {
            fleetime += (mtmp.mfleetim || 0);
            /* ensure monster flees long enough to visibly stop fighting */
            if (fleetime === 1)
                fleetime++;
            mtmp.mfleetim = Math.min(fleetime, 127);
        }
        if (!mtmp.mflee && fleemsg)
            note_unported('monflee:fleemsg');
        mtmp.mflee = 1;
    }
    /* ignore recently-stepped spaces when made to flee */
    mon_track_clear(mtmp);
}

// src/monmove.c set_apparxy() — the monster decides where it thinks the hero
// is. dochug() calls this before distfleeck(), because inrange/nearby are
// measured against mux,muy rather than the hero's real position.
//
// The ordinary case (monster can see, hero neither invisible nor displaced nor
// underwater) sets displ to 0 and returns without drawing, which is why leaving
// this out cost no RNG and still left every monster targeting <0,0>.
export function set_apparxy(mtmp) {
    let mx = mtmp.mux, my = mtmp.muy;
    let displ;

    /* pet knows your smell; grabber still has hold of you; monsters which
       know where you are don't suddenly forget, if you haven't moved away */
    if (mtmp.mtame || mtmp === game.u.ustuck
        || (game.u.ux === mx && game.u.uy === my)) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return;
    }

    const Invis = !!game.u.uprops?.INVIS;
    const Displaced = !!game.u.uprops?.DISPLACED;
    const Underwater = !!game.u.uinwater;

    const notseen = (!mtmp.mcansee || (Invis && !perceives(game.mons[mtmp.mnum])));
    const notthere = (Displaced && mtmp.mnum !== PMNAMES.PM_DISPLACER_BEAST);

    if (Underwater) {
        displ = 1;
    } else if (notseen) {
        /* Xorns can smell quantities of valuable metal like that in solid
           gold coins, treat as seen */
        const umoney = money_cnt(game.invent);
        displ = (mtmp.mnum === PMNAMES.PM_XORN && umoney) ? 0 : 1;
    } else if (notthere) {
        displ = couldsee(mx, my) ? 2 : 1;
    } else {
        displ = 0;
    }
    if (!displ) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return;
    }

    /* src/monmove.c — without something like the following, invisibility and
       displacement are too powerful.

       This branch was recorded unported and short-circuited to the hero's
       exact square, which spent NO draws on a path every unseen monster takes.
       C spends one rn2(3) or rn2(4) here, then TWO rn2(2 * displ + 1) per
       iteration of the retry loop below. */
    const gotu = notseen ? !rn2(3) : notthere ? !rn2(4) : false;

    if (!gotu) {
        let try_cnt = 0;
        const ptr = game.mons[mtmp.mnum];

        do {
            if (++try_cnt > 200) {
                mx = game.u.ux;
                my = game.u.uy;
                break;              /* punt */
            }
            mx = game.u.ux - displ + rn2(2 * displ + 1);
            my = game.u.uy - displ + rn2(2 * displ + 1);
        } while (!isok(mx, my)
                 || (displ !== 2 && mx === mtmp.mx && my === mtmp.my)
                 || ((mx !== game.u.ux || my !== game.u.uy)
                     && !passes_walls(ptr)
                     && !(accessible(mx, my)
                          || (closed_door_mm(mx, my)
                              && (can_ooze(mtmp) || can_fog(mtmp)))))
                 || !couldsee(mx, my));
    } else {
        mx = game.u.ux;
        my = game.u.uy;
    }

    mtmp.mux = mx;
    mtmp.muy = my;
}

// src/monmove.c:2188 accessible() — uses the terrain in front of a closed
// drawbridge, not the drawbridge itself.
function accessible(x, y) {
    const levtyp = game.level.at(x, y)?.typ;
    return ACCESSIBLE(levtyp) && !closed_door_mm(x, y);
}

/* src/detect.c closed_door() — js/cmd.js has the same predicate, but importing
   it here would close a cycle (cmd.js already imports this file). */
function closed_door_mm(x, y) {
    const lev = game.level.at(x, y);
    return !!lev && lev.typ === DOOR
        && (lev.doormask & (D_LOCKED | D_CLOSED)) !== 0;
}

// src/monmove.c:2356 can_ooze() — squeeze under a door.
// stuff_prevents_passage() needs the inventory-bulk rules; it is recorded
// rather than assumed, since assuming FALSE would let a laden monster ooze.
function can_ooze(mtmp) {
    if (!amorphous(game.mons[mtmp.mnum]))
        return false;
    if (mtmp.minvent && mtmp.minvent.length)
        note_unported('can_ooze:stuff_prevents_passage');
    return true;
}

// src/invent.c money_cnt()
function money_cnt(invent) {
    for (const otmp of invent || [])
        if (otmp.oclass === OCLASSES.COIN_CLASS)
            return otmp.quan;
    return 0;
}

// src/monmove.c:532 distfleeck()
export function distfleeck(mtmp) {
    let seescaryx, seescaryy;
    const bravegremlin = (rn2(5) === 0);

    const inrange = dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                    <= (BOLT_LIM * BOLT_LIM);
    const nearby = inrange && monnear(mtmp, mtmp.mux, mtmp.muy);

    /* Note: if your image is displaced, the monster sees the Elbereth at your
     * displaced position, thus never attacking your displaced position, but
     * possibly attacking you by accident. */
    if (!mtmp.mcansee || (game.u.uprops?.INVIS && !perceives(game.mons[mtmp.mnum]))) {
        seescaryx = mtmp.mux;
        seescaryy = mtmp.muy;
    } else {
        seescaryx = game.u.ux;
        seescaryy = game.u.uy;
    }

    const sawscary = onscary(seescaryx, seescaryy, mtmp);
    let scared;
    if (nearby && (sawscary
                   || (flees_light(mtmp) && !bravegremlin)
                   || (!mtmp.mpeaceful && in_your_sanctuary(mtmp, 0, 0)))) {
        scared = true;
        monflee(mtmp, rnd(rn2(7) ? 10 : 100), true, true);
    } else {
        scared = false;
    }
    return { inrange, nearby, scared, bravegremlin };
}

// src/monmove.c:700 dochug() — one monster's turn.
export function dochug(mtmp) {
    /* src/monmove.c:727 — a sleeping monster still gets a chance to be woken,
       and disturb() DRAWS on the way. Returning early here skipped both the
       draws and the monster's whole turn when it did wake. */
    if (mtmp.msleeping && !disturb(mtmp))
        return 0;

    /* src/monmove.c:778 — must run after the hero moves and before the monster
       does, because inrange/nearby in distfleeck() are measured against the
       monster's guess at the hero's position, not the hero's real one. */
    set_apparxy(mtmp);

    /* src/monmove.c:791 */
    let { nearby, scared } = distfleeck(mtmp);

    const mdat = game.mons[mtmp.mnum];
    let status = 0;

    /* src/monmove.c:882 — a monster only gets to move if it passes this. Each
       arm that draws does so ONLY because the arms before it were false, so
       dropping the whole condition (as we did) loses a draw on any turn a
       wandering or blinded monster takes a step. */
    if (!nearby || mtmp.mflee || scared || mtmp.mconf || mtmp.mstun
        || (mtmp.minvis && !rn2(3))
        || (mdat.mlet === MONSYMS.S_LEPRECHAUN && !findgold(game.invent)
            && (findgold(mtmp.minvent) || rn2(2)))
        || (is_wanderer(mdat) && !rn2(4))
        || (game.u.uprops?.CONFLICT && !mtmp.iswiz)
        || (!mtmp.mcansee && !rn2(4)) || mtmp.mpeaceful) {

        /* Possibly cast an undirected spell if not attacking you. castmu()
           needs the spell tables; a monster with no AT_MAGC attack never
           reaches it, which is every monster on an early level. */
        if (!mtmp.mspec_used
            && dist2(mtmp.mx, mtmp.my, game.u.ux, game.u.uy) <= 49) {
            for (const a of mdat.mattk) {
                if (a[0] === ATTKS.AT_MAGC
                    && (a[1] === ATTKS.AD_SPEL || a[1] === ATTKS.AD_CLRC)) {
                    note_unported('castmu');
                    break;
                }
            }
        }

        /* src/monmove.c:1773 — m_move() dispatches a tame monster to
           dog_move() before it reaches mfndpos(). */
        if (!status)
            status = mtmp.mtame ? dog_move(mtmp, 0) : m_move(mtmp, 0);

        /* src/monmove.c:915 — distfleeck is RECALCULATED after the move, so
           every monster that takes a turn spends TWO rn2(5) draws, not one. */
        if (status !== MMOVE_DIED)
            ({ nearby, scared } = distfleeck(mtmp));
    }

    return status;
}

// src/monmove.c:1720 m_move() — a non-tame monster's turn. The tame case is
// dispatched to dog_move() above, exactly as C does at :1773.
export function m_move(mtmp, after) {
    const ptr = mtmp.data;
    const omx = mtmp.mx, omy = mtmp.my;

    /* mtrapped / meating / hides_under all come first in C; the first two
       draw nothing here and the third needs an object underfoot. */
    if (hides_under(ptr) && OBJ_AT(omx, omy) && rn2(10))
        return MMOVE_NOTHING;      /* do not leave hiding place */

    let ggx = mtmp.mux, ggy = mtmp.muy;
    const prange = { min: 0, max: 0 };
    let appr = mtmp.mflee ? -1 : 1;

    if (mtmp.mconf) {
        appr = 0;
    } else {
        /* src/monmove.c:1861 — all three terms matter. Ours had only the
           distance one, which made should_see true far too often and skipped
           the gettrack branch below; that branch changes the GOAL, so the
           monster walked somewhere else while drawing the same numbers. */
        const here = game.level.at(omx, omy);
        const there = game.level.at(ggx, ggy);
        const should_see = (couldsee(omx, omy)
                            && (there?.lit || !here?.lit)
                            && (dist2(omx, omy, ggx, ggy) <= 36));

        if (!mtmp.mcansee
            || (should_see && game.u.uprops?.INVIS
                && !perceives(ptr) && rn2(11))
            || (mtmp.mpeaceful && !mtmp.isshk) /* allow shks to follow */
            || ((mtmp.mnum === PMNAMES.PM_STALKER
                 || ptr.mlet === MONSYMS.S_BAT
                 || ptr.mlet === MONSYMS.S_LIGHT) && !rn2(3)))
            appr = 0;

        /* leppie_avoidance needs the leprechaun gold logic; it only ever turns
           appr from 1 to -1 and draws nothing. */
        if (appr === 1 && leppie_avoidance(mtmp))
            appr = -1;

        /* src/monmove.c:1878 — hostiles with a ranged option keep their
           distance. This changes appr, and appr decides which candidate square
           wins, so getting it wrong moves a monster to a different legal square
           while drawing exactly the same numbers. */
        appr = m_balks_at_approaching(appr, mtmp, prange);

        if (!should_see && can_track(ptr)) {
            const cp = gettrack(omx, omy);
            if (cp) {
                ggx = cp.x;
                ggy = cp.y;
            }
        }
    }

    /* src/monmove.c:1891 — the pickup branch. The rn2(10) fires for every
       PEACEFUL monster whether or not it then picks anything up. */
    let getitems = false;
    if ((!mtmp.mpeaceful || !rn2(10))) {
        const in_line = lined_up(mtmp)
            && (distmin(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy)
                <= (throws_rocks(game.mons[game.u.umonnum]) ? 20
                                                            : (acurrstr() / 2 + 1)));

        if (appr !== 1 || !in_line) {
            /* Monsters in combat won't pick stuff up, avoiding the situation
             * where you toss arrows at it and it has nothing better to do
             * than pick the arrows up.
             */
            getitems = true;
        }
    }

    if (getitems) {
        const goal = { x: ggx, y: ggy };
        /* C declares mmoved = 0 at the top of m_move, well before this; ours
           is declared further down, and m_search_items only writes it on the
           path where the caller returns immediately. */
        const st = { mmoved: MMOVE_NOTHING, appr };
        if (m_search_items(mtmp, goal, st)) {
            /* src/monmove.c:1799 — C returns through postmov() here too. */
            return postmov(mtmp, ptr, omx, omy, MMOVE_DONE);
        }
        ggx = goal.x; ggy = goal.y; appr = st.appr;
    }

    const flag = mon_allowflags(mtmp);
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, flag);
    if (cnt === 0)
        return MMOVE_NOMOVES;

    let chcnt = 0;
    const jcnt = Math.min(MTSZ, cnt - 1);
    let chi = -1;
    let nix = omx, niy = omy;
    let nidist = dist2(nix, niy, ggx, ggy);

    /* src/monmove.c:1936 — allow monsters to be shortsighted on some levels
       for balance. When this fires it flips appr from 1 to 0, which switches
       the selection below from "deterministically approach the goal" to the
       random !rn2(++chcnt) tie-break, so it changes both the destination AND
       the draw count. level.flags.shortsighted is only set by special levels,
       so this is dormant on ordinary ones rather than dead. */
    if (!mtmp.mpeaceful && game.level.flags.shortsighted
        && nidist > (couldsee(nix, niy) ? 144 : 36) && appr === 1)
        appr = 0;

    let mmoved = MMOVE_NOTHING;

    for (let i = 0; i < cnt; i++) {
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;

        if (appr !== 0) {
            const track = mtmp.mtrack || [];
            let skip = false;
            for (let j = 0; j < jcnt; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y)
                    if (rn2(4 * (cnt - j))) { skip = true; break; }
            if (skip) continue;
        }

        const ndist = dist2(nx, ny, ggx, ggy);
        const nearer = ndist < nidist;

        if ((appr === 1 && nearer) || (appr === -1 && !nearer)
            || (!appr && !rn2(++chcnt))
            /* src/monmove.c:1971 — keep-your-distance, for a monster wielding
               a throw-and-return weapon. Only reachable now that
               m_balks_at_approaching can return -2. */
            || (appr === -2
                && ((ndist <= prange.min && !nearer)
                    || (ndist >= prange.max && nearer)))
            || (mmoved === MMOVE_NOTHING)) {
            nix = nx;
            niy = ny;
            nidist = ndist;
            chi = i;
            mmoved = MMOVE_MOVED;
        }
    }

    if (mmoved === MMOVE_MOVED && (nix !== omx || niy !== omy)) {
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            note_unported('mattacku');
            return MMOVE_DONE;
        }
        mtmp.mtrack = mtmp.mtrack || [];
        mtmp.mtrack.unshift({ x: omx, y: omy });
        if (mtmp.mtrack.length > MTSZ) mtmp.mtrack.length = MTSZ;
        /* src/monmove.c:2051 — remove then place, so level.monsters[][] tracks
           the move. Writing mx/my alone leaves m_at() answering with the old
           square. */
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        /* the newsym for the vacated square is in postmov(), not here --
           src/monmove.c:1508 sits inside postmov so that EVERY path returning
           through it redraws, including dog_move's at :1773. */
    }

    return postmov(mtmp, ptr, omx, omy, mmoved);
}

// src/monmove.c:1455 postmov() — everything a monster does after arriving.
//
// This is a SEPARATE FUNCTION in C, not the tail of m_move, and m_move returns
// through it from five different places (:1773, :1799, :1823, :1847, :1907).
// Writing it as a tail meant every early return skipped it, which is why
// wiring meatmetal() in changed nothing: the block was there but unreachable
// on the paths that mattered. :1773 is the pet path, so dog_move()'s result
// goes through here too.
function postmov(mtmp, ptr, omx, omy, mmoved) {
    /* src/monmove.c:1508 — "update the old position", inside postmov and so on
       EVERY path that returns through it, including dog_move's at :1773.
       remove_monster only clears level.monsters[][]; without this the vacated
       square keeps the monster's glyph and a moving pet leaves a trail. */
    if (mmoved === MMOVE_MOVED)
        newsym(omx, omy);

    if (mmoved === MMOVE_MOVED || mmoved === MMOVE_DONE) {
        if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
            /* Maybe a rock mole just ate some metal object */
            if (metallivorous(ptr)) {
                if (meatmetal(mtmp) === 2)
                    return MMOVE_DIED; /* it died */
            }

            /* Maybe a cube ate just about anything */
            if (ptr.pmidx === PMNAMES.PM_GELATINOUS_CUBE)
                note_unported('postmov:meatobj');

            /* Maybe a purple worm ate a corpse */
            if (corpse_eater(ptr))
                note_unported('postmov:meatcorpse');

            /* mpickstuff() draws; it is the one that affects the most turns. */
            note_unported('postmov:mpickstuff');
        }
    }
    return mmoved;
}

const MTSZ = 4;
/* include/hack.h:1322 — these were declared here with MMOVE_DIED and
   MMOVE_MOVED SWAPPED against the header. js/const.js has them right. */

/* include/mondata.h hides_under() */
function hides_under(ptr) {
    return (ptr.mflags1 & MFLAGS.M1_CONCEAL) !== 0;
}

function OBJ_AT(x, y) {
    return (game.level?.objects || []).some(o => o.ox === x && o.oy === y);
}


function note_unported(what) {
    (game.unported ||= new Set()).add(what);
}

// src/monmove.c:660 disturb() — does the hero's presence wake this monster?
//
// Three of the four conditions can draw, and they short-circuit in order, so
// the draw count depends on what kind of monster it is:
//   ettin + stealthy hero        -> rn2(10)
//   nymph, jabberwock, leprechaun-> rn2(50)
//   anything not a dog or human  -> rn2(7)
function disturb(mtmp) {
    const d = mtmp.data;

    if (!(couldsee(mtmp.mx, mtmp.my) && mdistu(mtmp) <= 100))
        return 0;
    /* Stealth is an intrinsic the hero does not have yet, so the ettin
       rn2(10) cannot fire; when Stealth lands, this test comes with it. */
    if (!(d.mlet !== MONSYMS.S_NYMPH
          && d.pmidx !== PMNAMES.PM_JABBERWOCK
          && d.mlet !== MONSYMS.S_LEPRECHAUN) && rn2(50))
        return 0;
    if (!((d.mlet === MONSYMS.S_DOG || d.mlet === MONSYMS.S_HUMAN)
          || !rn2(7)))
        return 0;

    mtmp.msleeping = 0;
    return 1;
}

/* src/mon.c mdistu() — squared distance from the hero to a monster */
function mdistu(mtmp) {
    const dx = mtmp.mx - game.u.ux, dy = mtmp.my - game.u.uy;
    return dx * dx + dy * dy;
}

// src/monmove.c:1830 m_balks_at_approaching() — should this monster hang back?
//
// Draws nothing. Returns -1 to retreat, -2 for a preferred-range weapon, or the
// caller's appr unchanged.
function m_balks_at_approaching(oldappr, mtmp, prange) {
    const x = mtmp.mx, y = mtmp.my, ux = mtmp.mux, uy = mtmp.muy;
    const edist = (x - ux) * (x - ux) + (y - uy) * (y - uy);

    /* peaceful, far away, or cannot see the hero */
    if (mtmp.mpeaceful || edist >= 5 * 5 || !m_canseeu(mtmp))
        return oldappr;

    /* src/monmove.c — the three ranged cases, in C's order. Order matters:
       each returns, so a monster with both a launcher and a polearm takes the
       first arm, and only a monster with neither reaches the -2 case. */
    const mwep = MON_WEP(mtmp);

    /* has ammo + launcher */
    if (m_has_launcher_and_ammo(mtmp))
        return -1;

    /* is using a polearm and in range */
    if (mwep && is_pole(mwep) && edist <= MON_POLE_DIST)
        return -1;

    /* is using a throw-and-return weapon; provide min and max preferred range */
    let arw;
    if (mwep && (arw = autoreturn_weapon(mwep)) !== null) {
        if (prange) {
            prange.min = 2 * 2;
            prange.max = arw.range;
        }
        return -2;
    }

    /* can attack from a distance, and is hurt or has not used it */
    if (ranged_attk_available(mtmp)
        && ((mtmp.mhp < Math.trunc((mtmp.mhpmax + 1) / 3)) || !mtmp.mspec_used))
        return -1;

    return oldappr;
}

// include/vision.h:50 m_canseeu() — Invis and Underwater are hero states the
// port does not have yet, so this reduces to line of sight.
function m_canseeu(mtmp) {
    return couldsee(mtmp.mx, mtmp.my);
}

// src/mhitu.c:2413 ranged_attk_available() — does this monster have any attack
// that works at a distance? m_seenres() tracks what the hero has been seen to
// resist and needs the resistance-memory subsystem; without it C's test reduces
// to the attack-type check.
function ranged_attk_available(mtmp) {
    for (const atk of (mtmp.data?.mattk || [])) {
        const aatyp = atk[0];
        if (DISTANCE_ATTK_TYPE(aatyp))
            return true;
    }
    return false;
}

// include/monattk.h:31
function DISTANCE_ATTK_TYPE(atyp) {
    return atyp === ATTKS.AT_SPIT || atyp === ATTKS.AT_BREA
        || atyp === ATTKS.AT_GAZE || atyp === ATTKS.AT_MAGC;
}

// src/mthrowu.c:58 m_has_launcher_and_ammo() — its C home is mthrowu.c, which
// has no JS counterpart yet; move it when the monster-missile code lands.
function m_has_launcher_and_ammo(mtmp) {
    const mwep = MON_WEP(mtmp);

    if (mwep && is_launcher(mwep)) {
        for (const otmp of mtmp.minvent || [])
            if (ammo_and_launcher(otmp, mwep))
                return true;
    }
    return false;
}

// src/muse.c:2985 cures_stoning() — would eating this stop petrification?
function cures_stoning(mon, obj, tinok) {
    if (obj.otyp === ONAMES.POT_ACID)
        return true;
    if (obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME)
        return slimeproof(game.mons[mon.mnum]);
    if (obj.otyp !== ONAMES.CORPSE && (obj.otyp !== ONAMES.TIN || !tinok))
        return false;
    /* corpse, or tin that mon can open */
    if (obj.corpsenm === NON_PM)        /* empty/special tin */
        return false;
    return obj.corpsenm === PMNAMES.PM_LIZARD
           || acidic(game.mons[obj.corpsenm]);
}

// src/muse.c:3001 mcould_eat_tin() — can this monster open a tin?
//
// Different from the player: the opener or blade does NOT have to be wielded,
// and a knife counts as well as a dagger. Animals cannot, which is how a
// monkey that steals a tin still cannot eat it.
function mcould_eat_tin(mon) {
    if (is_animal(game.mons[mon.mnum]))
        return false;

    const mwep = MON_WEP(mon);
    const welded_wep = !!(mwep && mwelded(mwep));

    for (const obj of mon.minvent || []) {
        /* if stuck with a cursed weapon, don't check rest of inventory */
        if (welded_wep && obj !== mwep)
            continue;
        if (obj.otyp === ONAMES.TIN_OPENER
            || (obj.oclass === OCLASSES.WEAPON_CLASS
                && (game.objects[obj.otyp].oc_skill === P_DAGGER
                    || game.objects[obj.otyp].oc_skill === P_KNIFE)))
            return true;
    }
    return false;
}

/* src/wield.c:63 erodeable_wep(), :68 will_weld(), :1078 mwelded(), and
   include/obj.h:249 is_weptool(). Local rather than imported: js/wield.js and
   js/mkobj.js both close a cycle from here (NOTES, "The module graph is
   load-bearing"). */
const erodeable_wep = (o) =>
    o.oclass === OCLASSES.WEAPON_CLASS || is_weptool(o, game.objects)
    || o.otyp === ONAMES.HEAVY_IRON_BALL || o.otyp === ONAMES.IRON_CHAIN;
const will_weld = (o) =>
    o.cursed && (erodeable_wep(o) || o.otyp === ONAMES.TIN_OPENER);
const mwelded = (obj) =>
    !!(obj && (obj.owornmask & W_WEP) && will_weld(obj));

/* acidic and slimeproof come from js/dog.js. */

// src/mthrowu.c:1282 blocking_terrain() — does this square stop a missile?
//
// is_waterwall needs the water-level terrain, which no ordinary level has, so
// it is recorded rather than assumed false.
function blocking_terrain(x, y) {
    if (!isok(x, y))
        return true;
    const lev = game.level.at(x, y);
    if (!lev || IS_OBSTRUCTED(lev.typ) || closed_door_mm(x, y)
        || lev.typ === LAVAWALL)
        return true;
    return false;
}
