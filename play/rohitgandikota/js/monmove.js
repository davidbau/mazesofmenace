// monmove.js — monster movement.
// C ref: src/monmove.c
//
// distfleeck() draws rn2(5) unconditionally at its head (the "brave gremlin"
// roll), once per monster that acts, so it is the first thing a turn with
// awake monsters spends after the movement allotment.

import { monsndx } from './makemon.js';
import { mon_aligntyp } from './priest.js';
import { is_obj_mappear } from './monst.js';
import { Invis, Displaced, Underwater } from './youprop.js';
import { CORR } from './const.js';
import { ROOM } from './const.js';
import { switch_terrain } from './hack.js';
import { in_rooms } from './hack.js';
import { Is_special } from './dungeon.js';
import { game } from './gstate.js';
import { mpickstuff, mondied, wake_nearto, wake_msg, wakeup,
         monkilled } from './mon.js';
import { sengr_at, wipe_engr_at } from './engrave.js';
import { autoreturn_weapon } from './weapon.js';
import { MON_WEP, mon_offmap } from './monst.js';
import { find_offensive, find_defensive, use_defensive,
         find_misc, use_misc } from './muse.js';
import { is_launcher, is_pole } from './u_init.js';
import { ammo_and_launcher } from './wield.js';
import { MON_POLE_DIST, OBJ_FLOOR, RAY, MFAST, NON_PM, W_ARMG, W_WEP,
    IS_OBSTRUCTED, IS_STWALL, IS_TREE, LAVAWALL, STAIRS, LADDER, IRONBARS,
    WEB,
    P_DAGGER, P_KNIFE,
    AM_SHRINE, Amask2align, ROOMOFFSET, ALLOW_MDISP, ALLOW_M, SHOPBASE,
    TEMPLE, RLOC_MSG, NC_SHOW_MSG
, STRAT_WAITFORU, STRAT_WAITMASK, STRAT_CLOSE } from './const.js';
import { amorphous, passes_walls, is_floater, nonliving,
         attacktype, can_blow, needspick, flaming, noncorporeal,
         tunnels, nohands as nohands_mm,
         verysmall as verysmall_mm, sticks, webmaker } from './mondata.js';
import { ACCESSIBLE, DOOR, D_LOCKED, D_CLOSED, D_ISOPEN, D_NODOOR,
         D_BROKEN, In_endgame, NOTONL } from './const.js';
import { is_vampshifter } from './monst.js';
import { newsym, canseemon, canspotmon, sensemon, pline } from './display.js';
import { You, You_see, You_hear } from './pline.js';
import { create_gas_cloud, visible_region_at, m_in_out_region } from './region.js';
import { worm_move, worm_nomove } from './worm.js';
import { Adjmonnam, Monnam, mon_nam, y_monnam, upstart } from './do_name.js';
import { Blind, Deaf } from './youprop.js';
import { Is_rogue_level as IRL_const, D_TRAPPED } from './const.js';
import { sobj_at, money_cnt } from './invent.js';
import { is_pool, m_carrying, meatmetal, meatobj, resists_ston } from './mon.js';
import { acidic, slimeproof } from './dog.js';
import { Is_mbag } from './mkobj.js';
import { Is_container, Is_candle, is_cloak, is_gloves,
         is_shirt } from './obj.js';
import { is_weptool } from './mkobj.js';
import { metallivorous, corpse_eater, is_covetous,
         resist_conflict } from './mondata.js';
import { may_dig, in_town, losehp, disturb_buried_zombies } from './hack.js';
import { place_monster, remove_monster, hideunder,
         hideunder_with_message } from './makemon.js';
import { rn2, rnd, d } from './rng.js';
import {
    dog_move, could_reach_item, dogfood, MANFOOD, ACCFOOD,
} from './dog.js';
import {
    mfndpos, mon_allowflags, can_carry, t_at, m_at,
    curr_mon_load, max_mon_load,
} from './mon.js';
import { MONSYMS, MFLAGS, PMNAMES, ATTKS } from './monst_data.js';
import { M_AP_TYPE, M_AP_NOTHING, M_AP_MONSTER, M_AP_FURNITURE,
         M_AP_OBJECT } from './const.js';
import { OCLASSES, ONAMES, MATERIALS } from './objects_data.js';
import { is_pit } from './const.js';
import { couldsee, cansee, clear_path, recalc_block_point,
         vision_recalc } from './vision.js';
import { gettrack } from './track.js';
import { distmin , isok, sgn, distu, dist2} from './hacklib.js';
import { acurrstr } from './attrib.js';
import { Hallucination, Unaware } from './youprop.js';

// include/mondata.h throws_rocks()
const throws_rocks = (ptr) => (ptr.mflags2 & MFLAGS.M2_ROCKTHROW) !== 0;

// src/mondata.c:623 can_track() — Excalibur or eyes.
const can_track = (ptr) => haseyes(ptr);
const haseyes = (ptr) => (ptr.mflags1 & MFLAGS.M1_NOEYES) === 0;
import {
    ALLOW_U, COULD_SEE, A_LAWFUL, BOLT_LIM, IS_ALTAR, COLNO, ROWNO, A_STR,
    ALL_TRAPS, NO_TRAP,
    G_GENOD, TRAPPED_DOOR, KILLED_BY_AN,
} from './const.js';
import { is_rider } from './makemon.js';
import { MMOVE_NOTHING, MMOVE_MOVED, MMOVE_DIED, MMOVE_DONE,
         MMOVE_NOMOVES, engulfing_u, NEED_WEAPON, NEED_HTH_WEAPON,
         NEED_PICK_AXE, NEED_AXE, NEED_PICK_OR_AXE,
         Upolyd, u_at, NORMAL_SPEED, M_ATTK_HIT, M_ATTK_DEF_DIED,
         M_ATTK_AGR_DIED } from './const.js';
import { mon_wield_item } from './weapon.js';
import { mattacku, gazemu } from './mhitu.js';
import { noattacks } from './mondata.js';
import { helpless } from './monst.js';
import { is_axe, is_pick } from './mon.js';
import { MSOUND } from './monst_data.js';
import { pline_mon } from './pline.js';
import { verbalize } from './pline.js';
import { Amonnam } from './do_name.js';
import { nolimbs } from './mondata.js';
import { mhis } from './mondata.js';
import { mbodypart } from './polyself.js';
import { HEAD } from './const.js';
import { ARM } from './const.js';
import { makeplural } from './objnam.js';
import { picking_lock } from './lock.js';
import { is_digging, watch_dig } from './dig.js';
import { angry_guards } from './mon.js';
import { stop_occupation } from './allmain.js';
import { IS_DOOR, D_WARNED } from './const.js';













function note_unported_monmove(what) {
    (game.unported ||= new Set()).add('monmove:' + what);
}

const is_watch = (ptr) => ptr.pmidx === PMNAMES.PM_WATCHMAN
    || ptr.pmidx === PMNAMES.PM_WATCH_CAPTAIN;

// src/monmove.c:176 watch_on_duty() — a peaceful Minetown watch member has
// a one-in-three chance to notice lock picking or digging in town.
export async function watch_on_duty(mtmp) {
    if (mtmp.mpeaceful
        && in_town(game.u.ux + game.u.dx, game.u.uy + game.u.dy)
        && mtmp.mcansee && m_canseeu(mtmp) && !rn2(3)) {
        const cc = { x: 0, y: 0 };
        if (picking_lock(cc) && IS_DOOR(game.level.at(cc.x, cc.y).typ)
            && (game.level.at(cc.x, cc.y).doormask & D_LOCKED)) {
            if (couldsee(mtmp.mx, mtmp.my)) {
                const door = game.level.at(cc.x, cc.y);
                if (door.looted & D_WARNED) {
                    await mon_yells(mtmp, "Halt, thief!  You're under arrest!");
                    await angry_guards(Deaf());
                } else {
                    await mon_yells(mtmp, 'Hey, stop picking that lock!');
                    door.looted |= D_WARNED;
                }
                await stop_occupation();
            }
        } else if (is_digging()) {
            await watch_dig(mtmp, game.context.digging.pos.x,
                            game.context.digging.pos.y, false);
        }
    }
}

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

// src/monmove.c:54 mb_trapped() -- a monster triggers a trapped door.
export async function mb_trapped(mtmp, canseeit) {
    if (game.flags?.verbose) {
        if (canseeit && !Unaware())
            await pline_mon(mtmp, 'KABOOM!!  You see a door explode.');
        else if (!Deaf())
            await You_hear(`a ${distu(mtmp.mx, mtmp.my) > 7 * 7
                                ? 'distant' : 'nearby'} explosion.`);
    }
    await wake_nearto(mtmp.mx, mtmp.my, 7 * 7);
    mtmp.mstun = 1;
    mtmp.mhp -= rnd(15);
    if (DEADMONSTER(mtmp)) {
        await mondied(mtmp);
        if (DEADMONSTER(mtmp))
            return true;
    }
    mtmp.mtrapseen = (mtmp.mtrapseen | 0) | (1 << (TRAPPED_DOOR - 1));
    return false;
}
const is_lminion = (mon) =>
    is_minion(game.mons[mon.mnum]) && mon_aligntyp(mon) === A_LAWFUL;

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
export function histemple_at(priest, x, y) {
    const r = _in_rooms(x, y, TEMPLE);
    return !!(priest && priest.ispriest && r
              && priest.epri?.shroom === r.charCodeAt(0)
              && priest.epri.shrlevel.dnum === game.u.uz.dnum
              && priest.epri.shrlevel.dlevel === game.u.uz.dlevel);
}

// src/priest.c findpriest()
export function findpriest(roomno) {
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

// src/shk.c:1039 inhishop() — shopkeeper currently in her shop or its
// boundary? (Kept next to its priest twin rather than in js/shk.js
// because both are read inside this file's movement gates.)
export function inhishop(mtmp) {
    const eshkp = mtmp.eshk;
    if (!eshkp)
        return false;
    if (eshkp.shoplevel
        && (eshkp.shoplevel.dnum !== game.u.uz.dnum
            || eshkp.shoplevel.dlevel !== game.u.uz.dlevel))
        return false;
    const shkrooms = _in_rooms(mtmp.mx, mtmp.my, SHOPBASE);
    return shkrooms.includes(String.fromCharCode(eshkp.shoproom));
}

// src/priest.c:161 inhistemple()
export function inhistemple(mtmp) {
    /* make sure we have a priest */
    if (!mtmp || !mtmp.ispriest)
        return false;
    /* priest must be on right level and in right room */
    if (!histemple_at(mtmp, mtmp.mx, mtmp.my))
        return false;
    /* temple room must still contain properly aligned altar */
    return has_shrine(mtmp);
}

// include/mondata.h:82 can_teleport()
const can_teleport = (ptr) => (ptr.mflags1 & MFLAGS.M1_TPORT) !== 0;

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
// The hero-concealment arm draws rn2(25) whenever the hero is polymorphed.
// It suppresses the shot only when the hero is also concealed.
export function lined_up(mtmp) {
    const tx = mtmp.mux, ty = mtmp.muy;
    const ignore_boulders = throws_rocks(game.mons[mtmp.mnum])
                         || m_carrying(mtmp, ONAMES.WAN_STRIKING);

    if (game.u.umonnum !== game.u.umonster) {
        const concealment_roll = rn2(25);
        const appearance = M_AP_TYPE(game.youmonst);
        if (concealment_roll
            && (game.u.uundetected
                || (appearance !== M_AP_NOTHING
                    && appearance !== M_AP_MONSTER)))
            return false;
    }

    return linedup(tx, ty, mtmp.mx, mtmp.my, ignore_boulders ? 1 : 2);
}

// src/mthrowu.c linedup() — a straight orthogonal or diagonal line within
// BOLT_LIM, with a clear path along it. The boulder-tolerant modes walk the
// line counting boulders; mode 2 then draws rn2(2 + boulderspots).
function linedup(ax, ay, bx, by, boulderhandling) {
    const tbx = ax - bx, tby = ay - by;
    /* C stores the deltas in gt.tbx/gt.tby; monshoot reads their signs */
    game.tbx = tbx;
    game.tby = tby;

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

    /* in shop, usually skip (monmove.c:1355): the rn2(25) draws for every
       monster standing in a shop, and only a 0 lets a non-shk keep looking */
    if (_in_rooms(omx, omy, SHOPBASE).length
        && (rn2(25) || mtmp.isshk)) {
        ; /* goto finish_search */
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

                /* src/monmove.c:1403 — avoid getting stuck on eg. items in
                   niches; the monster must be able to SEE the square. This
                   was missing, and a kobold walked toward a scroll two dark
                   rooms away while C's kept chasing the hero (seed0004). */
                if (!clear_path(omx, omy, xx, yy))
                    continue;

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
export function mon_would_take_item(mtmp, otmp) {
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
export function searches_for_item(mon, obj) {
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
export function monnear(mon, x, y) {
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
// src/monmove.c:2316 stuff_prevents_passage(). Bulky carried objects stop an
// amorphous monster, or a vampire in fog form, from passing under a door.
function stuff_prevents_passage(mtmp) {
    for (const obj of (mtmp === game.youmonst ? game.invent : mtmp.minvent) || []) {
        const typ = obj.otyp;
        if (typ === OCLASSES.COIN_CLASS && obj.quan > 100)
            return true;
        if (obj.oclass !== OCLASSES.GEM_CLASS
            && !(typ >= ONAMES.ARROW && typ <= ONAMES.BOOMERANG)
            && !(typ >= ONAMES.DAGGER && typ <= ONAMES.CRYSKNIFE)
            && typ !== ONAMES.SLING && !is_cloak(obj)
            && typ !== ONAMES.FEDORA && !is_gloves(obj)
            && typ !== ONAMES.LEATHER_JACKET
            && typ !== ONAMES.CREDIT_CARD && !is_shirt(obj)
            && !(typ === ONAMES.CORPSE
                 && verysmall_mm(game.mons[obj.corpsenm]))
            && typ !== ONAMES.FORTUNE_COOKIE && typ !== ONAMES.CANDY_BAR
            && typ !== ONAMES.PANCAKE && typ !== ONAMES.LEMBAS_WAFER
            && typ !== ONAMES.LUMP_OF_ROYAL_JELLY
            && obj.oclass !== OCLASSES.AMULET_CLASS
            && obj.oclass !== OCLASSES.RING_CLASS
            && obj.oclass !== OCLASSES.VENOM_CLASS
            && typ !== ONAMES.SACK && typ !== ONAMES.BAG_OF_HOLDING
            && typ !== ONAMES.BAG_OF_TRICKS && !Is_candle(obj)
            && typ !== ONAMES.OILSKIN_SACK && typ !== ONAMES.LEASH
            && typ !== ONAMES.STETHOSCOPE && typ !== ONAMES.BLINDFOLD
            && typ !== ONAMES.TOWEL && typ !== ONAMES.TIN_WHISTLE
            && typ !== ONAMES.MAGIC_WHISTLE && typ !== ONAMES.MAGIC_MARKER
            && typ !== ONAMES.TIN_OPENER && typ !== ONAMES.SKELETON_KEY
            && typ !== ONAMES.LOCK_PICK)
            return true;
        if (Is_container(obj) && obj.cobj?.length)
            return true;
    }
    return false;
}

// src/monmove.c:2365 can_fog(). mfndpos() reads this beside amorphous() to
// decide whether a closed door blocks the square at all.
export function can_fog(mtmp) {
    return !(game.mvitals?.[PMNAMES.PM_FOG_CLOUD]?.mvflags & G_GENOD)
        && is_vampshifter(mtmp)
        && !game.u.uprops?.PROT_FROM_SHAPE_CHANGERS
        && !stuff_prevents_passage(mtmp);
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
const Sokoban = () => !!game.level?.flags?.sokoban_rules;

// src/monmove.c:1230 holds_up_web() through maybe_spin_web().
function holds_up_web(x, y) {
    const lev = game.level?.at(x, y);
    let upStairs = false;

    if (lev && (lev.typ === STAIRS || lev.typ === LADDER)) {
        for (let st = game.stairs; st; st = st.next) {
            if (st.sx === x && st.sy === y) {
                upStairs = !!st.up;
                break;
            }
        }
    }
    return !isok(x, y) || !lev || IS_OBSTRUCTED(lev.typ)
        || upStairs || lev.typ === IRONBARS;
}

function count_webbing_walls(x, y) {
    return Number(holds_up_web(x, y - 1))
        + Number(holds_up_web(x + 1, y))
        + Number(holds_up_web(x, y + 1))
        + Number(holds_up_web(x - 1, y));
}

function soko_allow_web(mon) {
    if (!Sokoban())
        return true;
    for (let st = game.stairs; st; st = st.next)
        if (st.up)
            return clear_path(mon.mx, mon.my, st.sx, st.sy);
    return false;
}

async function maybe_spin_web(mtmp) {
    const ptr = mtmp.data ?? game.mons[mtmp.mnum];
    if (!webmaker(ptr) || helpless(mtmp) || mtmp.mspec_used
        || t_at(mtmp.mx, mtmp.my) || !soko_allow_web(mtmp))
        return;

    const webCount = (game.level?.traps || [])
        .filter((trap) => trap.ttyp === WEB).length;
    const prob = (ptr.pmidx === PMNAMES.PM_GIANT_SPIDER ? 15 : 5)
        * (count_webbing_walls(mtmp.mx, mtmp.my) + 1) - 3 * webCount;
    if (rn2(1000) >= prob)
        return;

    const { maketrap } = await import('./mklev.js');
    const trap = maketrap(mtmp.mx, mtmp.my, WEB);
    if (!trap)
        return;
    mtmp.mspec_used = d(4, 4);
    if (cansee(mtmp.mx, mtmp.my)) {
        const name = canspotmon(mtmp) ? y_monnam(mtmp) : 'something';
        await pline(`${upstart(name)} spins a web.`);
        trap.tseen = 1;
    }
    if (game.in_rooms?.(mtmp.mx, mtmp.my, SHOPBASE))
        note_unported('postmov:spin_web_shop_damage');
}

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

    /*
     * src/monmove.c — creatures who don't (or can't) fear a written Elbereth:
     * all the above plus shopkeepers (even if poly'd into non-human), vault
     * guards (also even if poly'd), blind or peaceful monsters, humans and
     * elves, and minotaurs.
     *
     * If the player isn't actually on the square OR the player's image isn't
     * displaced to the square, no protection is being granted.
     *
     * Elbereth doesn't work in Gehennom, the Elemental Planes, or the Astral
     * Plane; the influence of the Valar only reaches so far.
     *
     * This used to be a bare `return !!sengr_at(...)`, which scared every
     * monster that merely looked at a square carrying the engraving —
     * PEACEFUL ones included, and from anywhere on the level.
     */
    const ep = sengr_at("Elbereth", x, y, true);
    return !!ep
        && ((game.u.ux === x && game.u.uy === y)
            || (game.u.uprops?.DISPLACED && mtmp.mux === x && mtmp.muy === y)
            || (ep.guardobjects && !!(game.level?.objects || [])
                                        .find(o => o.ox === x && o.oy === y)))
        && !(mtmp.isshk || mtmp.isgd || !mtmp.mcansee
             || mtmp.mpeaceful
             || mtmp.mnum === PMNAMES.PM_MINOTAUR
             /* include/dungeon.h In_hell(); the helper is private to
                trap.js and mklev.js (duplicate-definition debt in NOTES),
                so the one-liner is used directly rather than adding a third
                copy. */
             || game.u.uz?.dnum === game.hell_dnum
             || In_endgame(game.u.uz));
}

// src/monmove.c:462 monflee() — begin fleeing for fleetime turns.
//
// The caller has already spent the rnd() that produces fleetime. The ordinary
// and immobile message paths do not draw further RNG.
export async function monflee(mtmp, fleetime, first, fleemsg) {
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
        if (!mtmp.mflee && fleemsg && canseemon(mtmp)
            && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
            && M_AP_TYPE(mtmp) !== M_AP_OBJECT) {
            if (!mtmp.mcanmove || !game.mons[mtmp.mnum].mmove) {
                await pline(`${Adjmonnam(mtmp, 'immobile')} seems to flinch.`);
            } else {
                await pline(`${Monnam(mtmp)} turns to flee.`);
            }
        }

        /* src/monmove.c:521 — a vrock covers its escape in a stench cloud */
        if (mtmp.mnum === PMNAMES.PM_VROCK && !mtmp.mspec_used) {
            mtmp.mspec_used = 75 + rn2(25);
            await create_gas_cloud(mtmp.mx, mtmp.my, 5, 8);
        }

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
    const umoney = money_cnt(game.invent);

    /* pet knows your smell; grabber still has hold of you; monsters which
       know where you are don't suddenly forget, if you haven't moved away */
    if (mtmp.mtame || mtmp === game.u.ustuck
        || (game.u.ux === mx && game.u.uy === my)) {
        mtmp.mux = game.u.ux;
        mtmp.muy = game.u.uy;
        return;
    }

    const notseen = (!mtmp.mcansee || (Invis() && !perceives(game.mons[mtmp.mnum])));
    const notthere = (Displaced() && mtmp.mnum !== PMNAMES.PM_DISPLACER_BEAST);

    if (Underwater()) {
        displ = 1;
    } else if (notseen) {
        /* Xorns can smell quantities of valuable metal like that in solid
           gold coins, treat as seen */
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

// src/monmove.c:2170 dissolve_bars()
export async function dissolve_bars(x, y) {
    const lev = game.level.at(x, y);
    lev.typ = (lev.edge === 1) ? DOOR
        : (Is_special(game.u.uz) || in_rooms(x, y, 0)) ? ROOM : CORR;
    lev.flags = 0; /* doormask = D_NODOOR */
    lev.doormask = 0;
    newsym(x, y);
    if (u_at(x, y))
        await switch_terrain();
}

// src/monmove.c:2188 accessible() — uses the terrain in front of a closed
// drawbridge, not the drawbridge itself.
export function accessible(x, y) {
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
export function can_ooze(mtmp) {
    return amorphous(mtmp.data) && !stuff_prevents_passage(mtmp);
}

// src/monmove.c:532 distfleeck()
export async function distfleeck(mtmp) {
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
        await monflee(mtmp, rnd(rn2(7) ? 10 : 100), true, true);
    } else {
        scared = false;
    }
    return { inrange, nearby, scared, bravegremlin };
}

const telepathic = (ptr) => ptr.pmidx === PMNAMES.PM_FLOATING_EYE
    || ptr.pmidx === PMNAMES.PM_MIND_FLAYER
    || ptr.pmidx === PMNAMES.PM_MASTER_MIND_FLAYER;

// src/monmove.c:583 mind_blast(). The target loops and their short-circuit
// rolls are part of ordinary monster timing, even when no visible message is
// produced.
async function mind_blast(mtmp) {
    if (canseemon(mtmp))
        await pline(`${Monnam(mtmp)} concentrates.`);
    if (mdistu(mtmp) > BOLT_LIM * BOLT_LIM) {
        await You('sense a faint wave of psychic energy.');
        return;
    }

    await pline('A wave of psychic energy pours over you!');
    if (mtmp.mpeaceful && (!Conflict() || resist_conflict(mtmp))) {
        await pline('It feels quite soothing.');
    } else if (!game.u.uinvulnerable) {
        const sensed = sensemon(mtmp);
        const blindTelepat = Blind()
            && !!(game.u.intrinsic?.HTelepat || game.u.uprops?.TELEPAT);
        if (sensed || (blindTelepat && rn2(2)) || !rn2(10)) {
            if (game.u.uundetected) {
                game.u.uundetected = 0;
                newsym(game.u.ux, game.u.uy);
            } else if (M_AP_TYPE(game.youmonst) !== M_AP_NOTHING
                       && M_AP_TYPE(game.youmonst) !== M_AP_MONSTER) {
                game.youmonst.m_ap_type = M_AP_NOTHING;
                game.youmonst.mappearance = 0;
                newsym(game.u.ux, game.u.uy);
            }
            await pline(`It locks on to your ${sensed ? 'telepathy'
                : blindTelepat ? 'latent telepathy' : 'mind'}!`);
            let damage = rnd(15);
            if (game.u.uprops?.HALF_SPDAM)
                damage = Math.trunc((damage + 1) / 2);
            await losehp(damage, 'psychic blast', KILLED_BY_AN);
        }
    }

    for (const mon of [...(game.level?.monsters || [])]) {
        if (DEADMONSTER(mon) || mon.mpeaceful === mtmp.mpeaceful
            || mindless(game.mons[mon.mnum]) || mon === mtmp)
            continue;
        const ptr = game.mons[mon.mnum];
        if ((telepathic(ptr) && (rn2(2) || mon.mblinded)) || !rn2(10)) {
            await wakeup(mon, false);
            if (cansee(mon.mx, mon.my))
                await pline(`It locks on to ${mon_nam(mon)}.`);
            mon.mhp -= rnd(15);
            if (DEADMONSTER(mon))
                await monkilled(mon, '', ATTKS.AD_DRIN);
        }
    }
}

// src/monmove.c:700 dochug() — one monster's turn.
export async function dochug(mtmp) {
    /* src/monmove.c:711 — a waiting monster stops waiting once it can see
       the hero or has been hurt. */
    if ((mtmp.mstrategy & STRAT_WAITFORU)
        && (m_canseeu(mtmp) || mtmp.mhp < mtmp.mhpmax))
        mtmp.mstrategy &= ~STRAT_WAITFORU;

    /* src/monmove.c:717 — frozen or strategically waiting monsters do
       nothing at all this turn (BEFORE the sleep/disturb check). */
    if (!(mtmp.mcanmove ?? 1) || (mtmp.mstrategy & STRAT_WAITMASK)) {
        if (mtmp.mcanmove && (mtmp.mstrategy & STRAT_CLOSE)
            && !mtmp.msleeping && monnear(mtmp, game.u.ux, game.u.uy)) {
            const { quest_talk } = await import('./quest.js');
            await quest_talk(mtmp);
        }
        return 0;
    }

    /* src/monmove.c:727 — a sleeping monster still gets a chance to be woken,
       and disturb() DRAWS on the way. Returning early here skipped both the
       draws and the monster's whole turn when it did wake. */
    if (mtmp.msleeping && !(await disturb(mtmp)))
        return 0;

    /* src/monmove.c:732: active monsters scuff any engraving beneath them
       before status recovery or teleport checks. */
    wipe_engr_at(mtmp.mx, mtmp.my, 1, false);

    /* src/monmove.c:735 — confused monsters get unconfused with small
       probability */
    if (mtmp.mconf && !rn2(50))
        mtmp.mconf = 0;

    /* stunned monsters get un-stunned with larger probability */
    if (mtmp.mstun && !rn2(10))
        mtmp.mstun = 0;

    /* src/monmove.c:744 — some monsters teleport. Teleportation costs a
       turn. The rn2(40) is spent by EVERY fleeing monster; only one that
       can actually teleport then rloc()s. */
    if (mtmp.mflee && !rn2(40) && can_teleport(game.mons[mtmp.mnum])
        && !mtmp.iswiz) {
        const { noteleport_level, rloc } = await import('./teleport.js');
        if (!noteleport_level(mtmp)) {
            if (await rloc(mtmp, RLOC_MSG)
                && game.mons[mtmp.mnum].mlet === MONSYMS.S_LEPRECHAUN)
                note_unported('dochug:leppie_stash');
            return 0;
        }
    }

    /* src/mon.c:4122 m_respond(), Medusa gazes once before movement. */
    if (mtmp.mnum === PMNAMES.PM_MEDUSA
        && couldsee(mtmp.mx, mtmp.my)) {
        const gaze = mtmp.data.mattk.find(atk => atk[0] === ATTKS.AT_GAZE);
        if (gaze)
            await gazemu(mtmp, gaze);
        if (DEADMONSTER(mtmp))
            return 1;
    }

    /* src/monmove.c:757 — fleeing monsters might regain courage */
    if (mtmp.mflee && !mtmp.mfleetim
        && mtmp.mhp === mtmp.mhpmax && !rn2(25))
        mtmp.mflee = 0;

    /* release_hero(): conflict-induced swallow/grab needs engulfing */

    /* src/monmove.c:778 — must run after the hero moves and before the monster
       does, because inrange/nearby in distfleeck() are measured against the
       monster's guess at the hero's position, not the hero's real one. */
    set_apparxy(mtmp);

    /* src/monmove.c:782 — monsters that want to acquire things may
       teleport, so do it before inrange is set. This costs a turn only if
       mstate is set. */
    if (is_covetous(game.mons[mtmp.mnum])) {
        const { tactics } = await import('./wizard.js');
        await tactics(mtmp);
        /* tactics -> mnexto -> deal_with_overcrowding */
        if (mtmp.mstate)
            return 0;
        set_apparxy(mtmp);
    }

    /* src/monmove.c:791 */
    let { inrange, nearby, scared } = await distfleeck(mtmp);

    const mdat = game.mons[mtmp.mnum];
    let status = 0;
    let panicattk = false;

    /* src/monmove.c:794, defensive actions take priority over utility. */
    if (find_defensive(mtmp, false)) {
        if (await use_defensive(mtmp) !== 0)
            return 1;
    } else if (find_misc(mtmp)) {
        if (await use_misc(mtmp) !== 0)
            return 1;
    }

    if (is_watch(mdat)) {
        await watch_on_duty(mtmp);
    } else if ((mdat.pmidx === PMNAMES.PM_MIND_FLAYER
                || mdat.pmidx === PMNAMES.PM_MASTER_MIND_FLAYER)
               && !rn2(20)) {
        await mind_blast(mtmp);
        set_apparxy(mtmp);
        ({ inrange, nearby, scared } = await distfleeck(mtmp));
    }

    /* src/monmove.c:840 — if monster is nearby you, and has to wield a
       weapon, do so. This costs the monster a move, of course. */
    if ((!mtmp.mpeaceful || game.u.uprops?.CONFLICT) && inrange
        && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8
        && attacktype(mdat, ATTKS.AT_WEAP)) {
        /* The scared check is necessary.  Otherwise a monster that is
         * one square near the player but fleeing into a wall would keep
         * switching between pick-axe and weapon.  If monster is stuck
         * in a trap, prefer ranged weapon (wielding is done in thrwmu).
         */
        const mw_tmp = MON_WEP(mtmp);
        if (!(scared && mw_tmp && is_pick(mw_tmp))
            && mtmp.weapon_check === NEED_WEAPON
            && !(mtmp.mtrapped && !nearby && select_rwep_absent(mtmp))) {
            mtmp.weapon_check = NEED_HTH_WEAPON;
            if (await mon_wield_item(mtmp) !== 0)
                return 0;
        }
    }

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
                    const { castmu } = await import('./mcastu.js');
                    if ((await castmu(mtmp, a, false, false)) & M_ATTK_HIT) {
                        status = MMOVE_DONE;
                        break;
                    }
                }
            }
        }

        /* src/monmove.c:1772 — m_move() dispatches a tame monster to
           `postmov(..., dog_move(mtmp, after), ...)`. postmov is where the
           display catches up with the move: newsym on the vacated square and
           on the new one (monmove.c:1508 and the mintrap arm). Without it a
           pet's move never repaints and the frames show it frozen at its old
           square. postmov's trap/door arms are recorded. */
        if (!status)
            status = await m_move(mtmp, 0);

        /* src/monmove.c:913. A monster which used stairs or another
           migration route is no longer on this level and must not take the
           post-move distance check. */
        if (mon_offmap(mtmp))
            return 1;

        /* src/monmove.c:915 — distfleeck is RECALCULATED after the move, so
           every monster that takes a turn spends TWO rn2(5) draws, not one. */
        if (status !== MMOVE_DIED)
            ({ inrange, nearby, scared } = await distfleeck(mtmp));

        /* src/monmove.c:917 — the status switch. For pets, cases 0 and 3
           are equivalent. */
        switch (status) {
        case MMOVE_NOMOVES:
            if (scared)
                panicattk = true;
            /*FALLTHRU*/
        case MMOVE_NOTHING: /* no movement, but it can still attack you */
        case MMOVE_DONE: /* absolutely no movement */
            /* vault guard might have vanished */
            if (mtmp.isgd && (DEADMONSTER(mtmp) || mtmp.mx === 0))
                return 1; /* behave as if it died */
            if (Hallucination())
                newsym(mtmp.mx, mtmp.my);
            break;
        case MMOVE_MOVED: /* monster moved */
            /* if confused grabber has wandered off, let go */
            if (mtmp === game.u.ustuck && !(distu(mtmp.mx, mtmp.my) <= 2))
                note_unported_monmove('dochug:unstuck');
            {
                const { grounded } = await import('./trap.js');
                if (grounded(mdat))
                    disturb_buried_zombies(mtmp.mx, mtmp.my);
            }
            /* Maybe it stepped on a trap and fell asleep... */
            if (helpless(mtmp))
                return 0;
            /* Monsters can move and then shoot on same turn;
               our hero can't.  Is that fair? */
            if (!nearby
                && (ranged_attk_available(mtmp)
                    || attacktype(mdat, ATTKS.AT_WEAP)
                    || find_offensive(mtmp)))
                break;
            /* a monster that's digesting you can move at the
             * same time -dlc
             */
            if (engulfing_u(mtmp))
                return await mattacku(mtmp);
            return 0;
        case MMOVE_DIED: /* monster died */
            return 1;
        }
    }

    /*
     * PHASE FOUR: Standard Attacks
     */

    /* Now, attack the player if possible - one attack set per monst */
    if (status !== MMOVE_DONE && (!mtmp.mpeaceful
                                  || (game.u.uprops?.CONFLICT
                                      && !resist_conflict_absent(mtmp)))) {
        if (((inrange && !scared) || panicattk) && !noattacks(mdat)
            /* [is this hp check really needed?] */
            && (Upolyd(game.u) ? game.u.mh : game.u.uhp) > 0) {
            if (await mattacku(mtmp))
                return 1; /* monster died (e.g. exploded) */
        }
        if (mtmp.wormno)
            note_unported_monmove('dochug:wormhitu');
    }
    /* special speeches for quest monsters */
    if (!helpless(mtmp) && nearby
        && (mdat.msound === MSOUND.MS_LEADER
            || mdat.msound === MSOUND.MS_NEMESIS
            || mdat.msound === MSOUND.MS_GUARDIAN)) {
        const { quest_talk } = await import('./quest.js');
        await quest_talk(mtmp);
    }
    /* extra emotional attack for vile monsters */
    if (inrange && mdat.msound === MSOUND.MS_CUSS && !mtmp.mpeaceful
        && couldsee(mtmp.mx, mtmp.my) && !mtmp.minvis && !rn2(5)) {
        const { cuss } = await import('./wizard.js');
        await cuss(mtmp);
    }

    /* note: can't get here when monster is dead, so this always returns 0 */
    return (status === MMOVE_DIED) ? 1 : 0;
}

// src/monmove.c:204 dochugw() -- move a monster, then interrupt an active
// occupation when a hostile threat has newly come into view nearby.
export async function dochugw(mtmp, chug) {
    const x = mtmp.mx, y = mtmp.my;
    const already_saw_mon = !!(chug && game.occupation && canspotmon(mtmp));
    const rd = chug ? await dochug(mtmp) : 0;

    if (game.occupation && !rd
        && (Hallucination()
            || (!mtmp.mpeaceful && !noattacks(game.mons[mtmp.mnum])))
        && mdistu(mtmp) <= (BOLT_LIM + 1) * (BOLT_LIM + 1)
        && (!already_saw_mon || !couldsee(x, y)
            || dist2(x, y, game.u.ux, game.u.uy)
                > (BOLT_LIM + 1) * (BOLT_LIM + 1))
        && canspotmon(mtmp) && couldsee(mtmp.mx, mtmp.my)
        && (mtmp.mcanmove ?? 1) && !onscary(game.u.ux, game.u.uy, mtmp)) {
        const { stop_occupation } = await import('./allmain.js');
        await stop_occupation();
    }
    return rd;
}


/* src/weapon.c select_rwep() — the throwing subsystem is absent; reaching
   this guard (a trapped weapon-monster out of melee range) is recorded. */
function select_rwep_absent(mtmp) {
    note_unported_monmove('dochug:select_rwep');
    return false;
}

/* src/priest.c resist_conflict() — conflict resistance check for priests;
   only reachable under Conflict, which is recorded state already. */
/* src/mondata.c:1607 resist_conflict() — now the real port */
function resist_conflict_absent(mtmp) {
    return resist_conflict(mtmp);
}

// src/monmove.c:1053 itsstuck() — a poly'd hero that sticks keeps hold of
// the monster it grabbed.
export async function itsstuck(mtmp) {
    if (sticks(game.mons[game.u.umonnum]) && mtmp === game.u.ustuck
        && !game.u.uswallow) {
        await pline(`${Monnam(mtmp)} cannot escape from you!`);
        return true;
    }
    return false;
}

// src/monmove.c:2088 m_move_aggress(), attack the monster occupying the
// selected square, or spend the move attacking an empty displaced image.
async function m_move_aggress(mtmp, x, y) {
    const mtmp2 = m_at(x, y);
    let mstatus = 0;
    let mattackm;

    if (mtmp2) {
        game.bhitpos = { x, y };
        game.notonhead = x !== mtmp2.mx || y !== mtmp2.my;
        ({ mattackm } = await import('./mhitm.js'));
        mstatus = await mattackm(mtmp, mtmp2);
    }

    if ((mstatus & M_ATTK_AGR_DIED) || DEADMONSTER(mtmp))
        return MMOVE_DIED;

    if (mtmp2
        && (mstatus & (M_ATTK_HIT | M_ATTK_DEF_DIED)) === M_ATTK_HIT
        && rn2(4) && mtmp2.movement > rn2(NORMAL_SPEED)) {
        if (mtmp2.movement > NORMAL_SPEED)
            mtmp2.movement -= NORMAL_SPEED;
        else
            mtmp2.movement = 0;
        game.bhitpos = { x: mtmp.mx, y: mtmp.my };
        game.notonhead = false;
        mstatus = await mattackm(mtmp2, mtmp);
        if (mstatus & M_ATTK_DEF_DIED)
            return MMOVE_DIED;
    }
    return MMOVE_DONE;
}

// src/monmove.c:1720 m_move() — a non-tame monster's turn. The tame case is
// dispatched to dog_move() above, exactly as C does at :1773.
export async function m_move(mtmp, after) {
    const ptr = mtmp.data;
    const omx = mtmp.mx, omy = mtmp.my;

    /* src/monmove.c:1733 — a monster that starts its turn already caught in
       a trap re-triggers it; postmov() handles the ARRIVAL case. */
    if (mtmp.mtrapped) {
        const { mintrap } = await import('./trap.js');
        const i = await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
        if (i === 3 /* Trap_Killed_Mon */) {
            newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }
        if (i === 1 /* Trap_Caught_Mon */)
            return MMOVE_NOTHING;   /* still in trap, so didn't move */
    }

    /* src/monmove.c:1745 — digest the meal. This is the ONLY per-turn
       countdown of meating, and m_move() is the common entry for pets too
       (it dispatches to dog_move() further down), so leaving it out froze
       meating forever: dog_invent() then bailed on every turn and a pet
       that had eaten once could never eat again. */
    if (mtmp.meating) {
        mtmp.meating--;
        if (mtmp.meating <= 0)
            finish_meating(mtmp);
        return MMOVE_DONE;         /* still eating */
    }

    /* hides_under comes next in C; it needs an object underfoot. */
    if (hides_under(ptr) && OBJ_AT(omx, omy)
        && can_hide_under_obj(objects_at(omx, omy)[0])
        && rn2(10))
        return MMOVE_NOTHING;      /* do not leave hiding place */

    /* src/monmove.c:1761 — "Where does 'mtmp' think you are?  Not necessary
       if m_move() called from this file, but needed for other calls." C runs
       it unconditionally, so a monster whose guess is stale re-rolls it (and
       DRAWS the gotu/candidate dice) at the top of every move, pets included,
       before the tame dispatch below. */
    set_apparxy(mtmp);

    /* src/monmove.c:1763-1765. Keep this movement decision and pass it to
       postmov(). Hostile monsters that need a pick can disable tunneling
       below when close enough to prefer a weapon. */
    let can_tunnel = !IRL_const(game.u.uz) && tunnels(ptr);

    /* src/monmove.c:1772 — my dog gets special treatment. Routing pets here
       rather than straight from dochug() is what puts them through the
       mtrapped and meating blocks above, exactly as C does. */
    if (mtmp.mtame)
        return await postmov(mtmp, ptr, omx, omy,
                             await dog_move(mtmp, after), can_tunnel);

    /* the covetous warp arm (monmove.c:1778) sits here in C; no covetous
       monster is generated by a ported path yet */

    /* src/monmove.c:1806 — likewise for shopkeeper, guard, or priest */
    if (mtmp.isshk || mtmp.isgd || mtmp.ispriest) {
        let xm;
        if (mtmp.isshk) {
            const { shk_move } = await import('./shk.js');
            xm = await shk_move(mtmp);
        } else if (mtmp.isgd) {
            const { gd_move } = await import('./vault.js');
            xm = await gd_move(mtmp);
        } else {
            const { pri_move } = await import('./priest.js');
            xm = await pri_move(mtmp);
        }
        switch (xm) {
        case -2:
            return MMOVE_DIED;
        case -1:
            break;      /* shk follows hero outside shop: normal AI */
        default:
        case 0:
        case 1:
            return await postmov(mtmp, ptr, omx, omy,
                                 (xm !== 1) ? MMOVE_NOTHING : MMOVE_MOVED,
                                 can_tunnel);
        }
    }

    /* src/monmove.c:1840. A tengu checks for spontaneous teleportation on
       every ordinary move, even when the roll says to stay put. */
    if (mtmp.mnum === PMNAMES.PM_TENGU && !rn2(5) && !mtmp.mcan) {
        const { rloc, tele_restrict } = await import('./teleport.js');
        if (!await tele_restrict(mtmp)) {
            if (mtmp.mhp < 7 || mtmp.mpeaceful || rn2(2)) {
                await rloc(mtmp, RLOC_MSG);
            } else {
                const { mnexto } = await import('./mon.js');
                await mnexto(mtmp, RLOC_MSG);
            }
            return await postmov(mtmp, ptr, omx, omy, MMOVE_MOVED,
                                 can_tunnel);
        }
    }

    /* src/monmove.c:1851. While engulfed, only the engulfing monster and
       fleeing monsters continue through normal movement. */
    if (game.u.uswallow && !mtmp.mflee && game.u.ustuck !== mtmp)
        return MMOVE_MOVED;

    let ggx = mtmp.mux, ggy = mtmp.muy;
    const prange = { min: 0, max: 0 };
    let appr = mtmp.mflee ? -1 : 1;

    if (mtmp.mconf || engulfing_u(mtmp)) {
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
            || (should_see && Invis() && !perceives(ptr) && rn2(11))
            || is_obj_mappear(game.youmonst, ONAMES.STRANGE_OBJECT) || game.u.uundetected
            || (is_obj_mappear(game.youmonst, ONAMES.GOLD_PIECE) && !likes_gold(ptr))
            || (mtmp.mpeaceful && !mtmp.isshk) /* allow shks to follow */
            || ((monsndx(ptr) === PMNAMES.PM_STALKER || ptr.mlet === MONSYMS.S_BAT
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
            return await postmov(mtmp, ptr, omx, omy, MMOVE_DONE,
                                 can_tunnel);
        }
        ggx = goal.x; ggy = goal.y; appr = st.appr;
    }

    /* src/monmove.c:1910. A hostile pick-user within striking range keeps
       its weapon available instead of tunneling through its destination. */
    if (can_tunnel && needspick(ptr)
        && ((!mtmp.mpeaceful || Conflict())
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    const flag = mon_allowflags(mtmp);
    const mfp = {};
    const cnt = mfndpos(mtmp, mfp, flag);
    if (cnt === 0 && !is_unicorn(ptr)) {
        if (find_defensive(mtmp, true) && await use_defensive(mtmp))
            return MMOVE_DONE;
        return MMOVE_NOMOVES;
    }

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

    /* src/monmove.c:1939 — on noteleport levels a unicorn perhaps cannot
       avoid the hero: when any candidate is off the hero's line, skip the
       on-line ones. */
    let avoid = false;
    if (is_unicorn(ptr) && game.level?.flags?.noteleport) {
        for (let i = 0; i < cnt; i++)
            if (!(mfp.info[i] & NOTONL))
                avoid = true;
    }

    /* src/monmove.c:1945 should_displace() — displacing another monster is
       only worth it when every non-displacing path is longer. Vacuous until
       mfndpos sets ALLOW_MDISP, but the loop below tests it as C does. */
    const better_with_displacing = should_displace(mtmp, mfp, ggx, ggy, cnt);

    for (let i = 0; i < cnt; i++) {
        if (avoid && (mfp.info[i] & NOTONL))
            continue;
        const nx = mfp.poss[i].x, ny = mfp.poss[i].y;

        /* src/monmove.c:1953 — a peaceful or tame monster avoids the square
           the hero just kicked it from */
        if (m_avoid_kicked_loc(mtmp, nx, ny))
            continue;

        if (m_at(nx, ny) && (mfp.info[i] & ALLOW_MDISP)
            && !(mfp.info[i] & ALLOW_M) && !better_with_displacing)
            continue;

        if (appr !== 0) {
            const track = mtmp.mtrack || [];
            let skip = false;
            for (let j = 0; j < jcnt; j++)
                if (track[j] && nx === track[j].x && ny === track[j].y) {
                    if (globalThis.__mm_probe) {
                        const { rngLogLength } = globalThis.__rng_mod || {};
                        console.error('MMPROBE', JSON.stringify({ idx: rngLogLength ? rngLogLength() : -1, mon: mtmp.mnum, at: [mtmp.mx, mtmp.my], appr, gg: [ggx, ggy], cnt, j, nx, ny, poss: (mfp.poss||[]).slice(0, cnt) }));
                    }
                    if (rn2(4 * (cnt - j))) { skip = true; break; }
                }
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
    if (mmoved === MMOVE_MOVED
        && await m_digweapon_check(mtmp, nix, niy)) {
        return MMOVE_DONE;
    }

    if (mmoved === MMOVE_MOVED && (nix !== omx || niy !== omy)) {
        /* src/monmove.c:2006 — if ALLOW_U is set, either it's trying to
           attack you, or it thinks it is. Attack this spot in preference to
           all others. The attack itself happens back in dochug()'s PHASE
           FOUR: returning MMOVE_NOTHING leaves the monster adjacent and
           eligible for mattacku(). */
        if (chi >= 0 && (mfp.info[chi] & ALLOW_U)) {
            nix = mtmp.mux;
            niy = mtmp.muy;
        }
        if (u_at(nix, niy)) {
            mtmp.mux = game.u.ux;
            mtmp.muy = game.u.uy;
            return MMOVE_NOTHING;
        }
        if ((mfp.info[chi] & ALLOW_M)
            || (nix === mtmp.mux && niy === mtmp.muy))
            return await m_move_aggress(mtmp, nix, niy);
        // src/monmove.c:2039, update the selected region membership.
        if (!(await m_in_out_region(mtmp, nix, niy)))
            return MMOVE_DONE;
        /* src/monmove.c:2047 — postmove effects run BEFORE the location
           changes (monsters have no "previous location" field) */
        await m_postmove_effect(mtmp);
        /* src/monmove.c:2051 — remove then place, so level.monsters[][] tracks
           the move. Writing mx/my alone leaves m_at() answering with the old
           square. */
        remove_monster(omx, omy);
        place_monster(mtmp, nix, niy);
        // src/monmove.c:2057, reconnect the moved head to its tail.
        if (mtmp.wormno)
            worm_move(mtmp);
        maybe_unhide_at_mon(mtmp);
        /* the newsym for the vacated square is in postmov(), not here --
           src/monmove.c:1508 sits inside postmov so that EVERY path returning
           through it redraws, including dog_move's at :1773. */

        /* src/monmove.c:2062 — the monster remembers where it came from.
           m_move's mtrack loop draws rn2(4 * (cnt - j)) against the index of
           the matching remembered square, so an unmaintained track makes
           every match land on j=0 and draws the wrong modulus. */
        mon_track_add(mtmp, omx, omy);
    } else {
        if (is_unicorn(ptr) && rn2(2)) {
            /* A unicorn which cannot find an acceptable step may teleport. */
            const { rloc, tele_restrict } = await import('./teleport.js');
            if (!await tele_restrict(mtmp)) {
                await rloc(mtmp, RLOC_MSG);
                return MMOVE_MOVED;
            }
        }
        if (mtmp.wormno)
            worm_nomove(mtmp);
    }

    return await postmov(mtmp, ptr, omx, omy, mmoved, can_tunnel);
}

// src/mon.c:4698 maybe_unhide_at(), monster arm. A concealed monster which
// leaves its covering object must be revealed before postmov() decides
// whether to roll for hiding again at the destination.
export function maybe_unhide_at_mon(mtmp) {
    if (!mtmp.mundetected)
        return;
    const ptr = game.mons[mtmp.mnum];
    const obj = (game.level?.objects || []).find(
        (o) => o.ox === mtmp.mx && o.oy === mtmp.my);
    if ((hides_under(ptr)
         && (!obj || mtmp.mtrapped || !can_hide_under_obj(obj)))
        || (ptr.mlet === MONSYMS.S_EEL && !is_pool(mtmp.mx, mtmp.my)))
        hideunder(mtmp);
}

// src/monmove.c:1108 m_digweapon_check() lets a tunneling monster ready the
// tool needed for its chosen square. Equipping it spends this move.
async function m_digweapon_check(mtmp, nix, niy) {
    const mw_tmp = MON_WEP(mtmp);
    const can_tunnel = !IRL_const(game.u.uz) && tunnels(mtmp.data);

    if (can_tunnel && needspick(mtmp.data) && !mwelded(mw_tmp)
        && (may_dig(nix, niy) || closed_door_mm(nix, niy))) {
        if (closed_door_mm(nix, niy)) {
            if (!mw_tmp || !is_pick(mw_tmp) || !is_axe(mw_tmp))
                mtmp.weapon_check = NEED_PICK_OR_AXE;
        } else if (IS_TREE(game.level.at(nix, niy)?.typ)) {
            if (!mw_tmp || !is_axe(mw_tmp))
                mtmp.weapon_check = NEED_AXE;
        } else if (IS_STWALL(game.level.at(nix, niy)?.typ)) {
            if (!mw_tmp || !is_pick(mw_tmp))
                mtmp.weapon_check = NEED_PICK_AXE;
        }
        if (mtmp.weapon_check >= NEED_PICK_AXE
            && await mon_wield_item(mtmp)) {
            return true;
        }
    }
    return false;
}

// src/monmove.c:1070 should_displace() — is displacing a monster the only
// way (or the shortest way) toward the goal? undesirable_disp is recorded
// through the same gate C reads it in.
function should_displace(mtmp, data, ggx, ggy, cnt) {
    let shortest_with = -1, shortest_without = -1, count_without = 0;

    for (let i = 0; i < cnt; i++) {
        const nx = data.poss[i].x, ny = data.poss[i].y;
        const ndist = dist2(nx, ny, ggx, ggy);
        if (m_at(nx, ny) && (data.info[i] & ALLOW_MDISP)
            && !(data.info[i] & ALLOW_M)) {
            if (shortest_with === -1 || ndist < shortest_with)
                shortest_with = ndist;
        } else {
            if (shortest_without === -1 || ndist < shortest_without)
                shortest_without = ndist;
            count_without++;
        }
    }
    return shortest_with > -1
           && (shortest_with < shortest_without || !count_without);
}

// src/monmove.c:1455 postmov() — everything a monster does after arriving.
//
// This is a SEPARATE FUNCTION in C, not the tail of m_move, and m_move returns
// through it from five different places (:1773, :1799, :1823, :1847, :1907).
// Writing it as a tail meant every early return skipped it, which is why
// wiring meatmetal() in changed nothing: the block was there but unreachable
// on the paths that mattered. :1773 is the pet path, so dog_move()'s result
// goes through here too.
async function postmov(mtmp, ptr, omx, omy, mmoved, can_tunnel) {
    /* src/monmove.c:1478. A vampshifter which selected a closed doorway
       changes into fog before the ordinary door handling runs. */
    if (mmoved === MMOVE_MOVED && is_vampshifter(mtmp) && !amorphous(ptr)) {
        const here = game.level.at(mtmp.mx, mtmp.my);
        if (here?.typ === DOOR
            && (here.doormask & (D_LOCKED | D_CLOSED)) !== 0
            && can_fog(mtmp)) {
            const { newcham } = await import('./mon.js');
            if (await newcham(mtmp, game.mons[PMNAMES.PM_FOG_CLOUD], NC_SHOW_MSG))
                ptr = mtmp.data;
        }
    }

    /* src/monmove.c:1508 — "update the old position", inside postmov and so on
       EVERY path that returns through it, including dog_move's at :1773.
       remove_monster only clears level.monsters[][]; without this the vacated
       square keeps the monster's glyph and a moving pet leaves a trail. */
    if (mmoved === MMOVE_MOVED) {
        newsym(omx, omy);
    }

    /* src/monmove.c:1509 — the arrival square's trap fires here, for pets and
       hostiles alike. */
    if (mmoved === MMOVE_MOVED) {
        const { mintrap } = await import('./trap.js');
        const trapret = await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
        /* include/trap.h:101-102 — Trap_Killed_Mon = 2, Trap_Moved_Mon = 3 */
        if (trapret === 2 /* Trap_Killed_Mon */ || trapret === 3 /* Moved */) {
            if (mtmp.mx)
                newsym(mtmp.mx, mtmp.my);
            return MMOVE_DIED;
        }

        /* src/monmove.c:1520 — open a door, or crash through it, if 'mtmp'
           can. can_tunnel is the effective movement decision from m_move();
           unlike the other predicates, it can be disabled near the hero. */
        const here = game.level.at(mtmp.mx, mtmp.my);
        const can_open = !(nohands_mm(ptr) || verysmall_mm(ptr));
        /* monhaskey(mtmp, TRUE): credit card ok for unlocking */
        const can_unlock = ((can_open
                             && (m_carrying(mtmp, ONAMES.CREDIT_CARD)
                                 || m_carrying(mtmp, ONAMES.SKELETON_KEY)
                                 || m_carrying(mtmp, ONAMES.LOCK_PICK)))
                            || mtmp.iswiz);
        if (here && DOOR === here.typ /* IS_DOOR */
            && !passes_walls(ptr) && !can_tunnel) {
            const btrapped = (here.doormask & D_TRAPPED) !== 0;
            const canseeit = cansee(mtmp.mx, mtmp.my);

            /* magic-key disarm: no monster carries the Key yet */
            const openit = async (what) => {
                here.doormask = what;
                newsym(mtmp.mx, mtmp.my);
                recalc_block_point(mtmp.mx, mtmp.my);
                vision_recalc(0);
            };
            if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0
                && amorphous(ptr)) {
                if (game.flags?.verbose && canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} ${
                        ptr.mlet === MONSYMS.S_LIGHT ? 'flows'
                                                     : 'oozes'} under the door.`);
            } else if ((here.doormask & D_LOCKED) !== 0 && can_unlock) {
                if (btrapped) {
                    await openit(D_NODOOR);
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    await openit(D_ISOPEN);
                    if (game.flags?.verbose) {
                        if (canseeit && canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} unlocks and opens a door.`);
                        else if (canseeit)
                            await You_see('a door unlock and open.');
                        else if (!Deaf())
                            await You_hear('a door unlock and open.');
                    }
                }
            } else if (here.doormask === D_CLOSED && can_open) {
                if (btrapped) {
                    await openit(D_NODOOR);
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    await openit(D_ISOPEN);
                    if (game.flags?.verbose) {
                        if (canseeit && canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} opens a door.`);
                        else if (canseeit)
                            await You_see('a door open.');
                        else if (!Deaf())
                            await You_hear('a door open.');
                    }
                }
            } else if ((here.doormask & (D_LOCKED | D_CLOSED)) !== 0) {
                /* mfndpos guarantees this must be a doorbuster */
                const mask = (btrapped
                              || ((here.doormask & D_LOCKED) !== 0
                                  && !rn2(2)))
                             ? D_NODOOR : D_BROKEN;
                await openit(mask);
                if (btrapped) {
                    if (await mb_trapped(mtmp, canseeit))
                        return MMOVE_DIED;
                } else {
                    if (game.flags?.verbose) {
                        if (canseeit && canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} smashes down a door.`);
                        else if (canseeit)
                            await You_see('a door crash open.');
                        else if (!Deaf())
                            await You_hear('a door crash open.');
                    }
                    /* if it's a shop door, schedule repair */
                    if (mask === D_NODOOR)
                        note_unported('postmov:doorbuster_shop_damage');
                }
            }
        }

        /* src/monmove.c:1644 — possibly dig */
        if (can_tunnel && may_dig(mtmp.mx, mtmp.my)) {
            const { mdig_tunnel } = await import('./dig.js');
            if (await mdig_tunnel(mtmp))
                return MMOVE_DIED; /* mon died */
        }

        /* src/monmove.c:1656 — the arrival square is painted LAST in the
           MMOVE_MOVED block, after mintrap and the door arms. Painting it
           at the top put the pet on screen before its own "steps
           reluctantly" --More--, one frame earlier than C (seed0004
           screen 39). The engulf arm is handled by its own machinery. */
        newsym(mtmp.mx, mtmp.my);
    }

    if (mmoved === MMOVE_MOVED || mmoved === MMOVE_DONE) {
        if (OBJ_AT(mtmp.mx, mtmp.my) && mtmp.mcanmove) {
            /* Maybe a rock mole just ate some metal object */
            if (metallivorous(ptr)) {
                if (meatmetal(mtmp) === 2)
                    return MMOVE_DIED; /* it died */
            }

            /* Maybe a cube ate just about anything */
            if (ptr.pmidx === PMNAMES.PM_GELATINOUS_CUBE) {
                if (await meatobj(mtmp) === 2)
                    return MMOVE_DIED;
            }

            /* Maybe a purple worm ate a corpse */
            if (corpse_eater(ptr))
                note_unported('postmov:meatcorpse');

            if (await mpickstuff(mtmp))
                mmoved = MMOVE_DONE;

            if (mtmp.minvis) {
                newsym(mtmp.mx, mtmp.my);
                if (mtmp.wormno)
                    note_unported('postmov:see_wsegs');
            }
        }

        await maybe_spin_web(mtmp);

        /* src/monmove.c:1692, concealment-capable monsters and eels
           reconsider hiding after every move. The rn2(5) is spent even
           when there is no object or pool at the destination. */
        if (hides_under(ptr) || ptr.mlet === MONSYMS.S_EEL) {
            if (mtmp.mundetected || (!helpless(mtmp) && rn2(5)))
                await hideunder_with_message(mtmp);
            newsym(mtmp.mx, mtmp.my);
        }
    }
    return mmoved;
}

const MTSZ = 4;
/* include/hack.h:1322 — these were declared here with MMOVE_DIED and
   MMOVE_MOVED SWAPPED against the header. js/const.js has them right. */


// src/monmove.c:2121 can_hide_under_obj() — TRUE if a mon can hide under obj.
export function can_hide_under_obj(obj) {
    if (!obj || (obj.where !== undefined && obj.where !== 1 /* OBJ_FLOOR */))
        return false;
    /* can't hide in/on/under traps (except pits) even when there is an
       object here; since obj is on floor, its <ox,oy> are up to date */
    const t = t_at(obj.ox, obj.oy);
    if (t && !is_pit(t.ttyp))
        return false;
    /* can't hide under small amount of coins unless non-coins are also
       present; we expect coins to be a single stack but don't assume that */
    if (obj.oclass === OCLASSES.COIN_CLASS) {
        let coinquan = 0;
        const chain = (game.level?.objects || []).filter(
            (o) => o.ox === obj.ox && o.oy === obj.oy
                && (o.where === undefined || o.where === 1));
        let i = chain.indexOf(obj);
        if (i < 0) i = 0;
        for (;;) {
            /* 10 coins is arbitrary amount considered enough to hide under */
            if ((coinquan += chain[i].quan) >= 10)
                break; /* fall through to other checks */
            i++;
            if (i >= chain.length)
                return false; /* whole pile was less than 10 coins */
            if (chain[i].oclass !== OCLASSES.COIN_CLASS)
                break;
        }
    }
    return true;
}

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
async function disturb(mtmp) {
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

    await wake_msg(mtmp, !mtmp.mpeaceful);
    mtmp.msleeping = 0;
    return 1;
}

/* src/mon.c mdistu() — squared distance from the hero to a monster.
   Its C home is src/mon.c, so it belongs in js/mon.js; exported from here
   for now because moving it would touch more call sites than it is worth. */
export function mdistu(mtmp) {
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

// include/vision.h:50 m_canseeu(), the active macro without buried-state tests.
export function m_canseeu(mtmp) {
    return (!Invis() || perceives(mtmp.data))
        && !Underwater() && couldsee(mtmp.mx, mtmp.my);
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
export const will_weld = (o) =>
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

// src/dogmove.c:1448 finish_meating() — the meal ends.
function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
        && game.mons[mtmp.mnum].mlet !== MONSYMS.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}

// src/monmove.c:650 m_everyturn_effect() — called every turn for each
// living monster (and the hero): a fog cloud sheds a harmless vapor trail
// where it stands (this is what fills the Valley with drifting mist).
export async function m_everyturn_effect(mtmp) {
    const is_u = (mtmp === game.youmonst);
    const x = is_u ? game.u.ux : mtmp.mx,
          y = is_u ? game.u.uy : mtmp.my;

    if (mtmp.mnum === PMNAMES.PM_FOG_CLOUD) {
        /* don't leave a vapor cloud if some other gas cloud is already
           present, or when flowing under closed doors */
        if (!closed_door_mm(x, y) && !visible_region_at(x, y))
            await create_gas_cloud(x, y, 1, 0);       /* harmless vapor */
    }
}

// src/monmove.c:672 m_postmove_effect() — effects a monster leaves at the
// square it is ABOUT to vacate: hezrou stench and steam-vortex vapor.
export async function m_postmove_effect(mtmp) {
    const is_u = mtmp === game.youmonst;
    const x = is_u ? game.u.ux0 : mtmp.mx;
    const y = is_u ? game.u.uy0 : mtmp.my;

    if (mtmp.mnum === PMNAMES.PM_HEZROU)        /* stench */
        await create_gas_cloud(x, y, 1, 8);
    else if (mtmp.mnum === PMNAMES.PM_STEAM_VORTEX && !mtmp.mcan)
        await create_gas_cloud(x, y, 1, 0);           /* harmless vapor */
}

// src/monmove.c mon_yells(); a monster shouts (a watchman's warning)
export async function mon_yells(mon, shout) {
    if (Deaf()) {
        if (canspotmon(mon))
            /* Sidenote on "A watchman angrily waves her arms!"
             * Female being called watchman is correct (career name).
             */
            await pline_mon(mon, `${Amonnam(mon)} angrily ${
                nolimbs(mon.data) ? 'shakes' : 'waves'} ${mhis(mon)} ${
                nolimbs(mon.data) ? mbodypart(mon, HEAD)
                                  : makeplural(mbodypart(mon, ARM))}!`);
    } else {
        if (canspotmon(mon)) {
            await pline_mon(mon, `${Amonnam(mon)} yells:`);
        } else {
            /* Soundeffect(se_someone_yells, 75); */
            await You_hear('someone yell:');
        }
        /* SetVoice(mon, 0, 80, 0); */
        await verbalize(shout);
    }
}
