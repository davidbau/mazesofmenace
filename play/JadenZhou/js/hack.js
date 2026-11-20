// hack.js — movement and carrying-capacity routines.
// C ref: hack.c
//
// Ported so far: weight_cap(), inv_weight(), calc_capacity(),
// near_capacity().

import { game } from './gstate.js';
import { ACURR, acurrstr } from './attrib.js';
import {
    A_CON, WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP, WT_HUMAN,
    WT_WOUNDEDLEG_REDUCT, UNENCUMBERED, OVERLOADED, LEVITATION,
    FLYING, WOUNDED_LEGS, LEFT_SIDE, RIGHT_SIDE, I_SPECIAL, Is_airlevel,
    isok, HALLUC, STONED, SLIMED, STRANGLED, SICK, M_AP_FURNITURE, M_AP_OBJECT,
    CONFUSION, STUNNED, BLINDED, WWALKING, STONE, ROOM, CORR, ICE, LAVAWALL,
    IS_OBSTRUCTED, IS_AIR, IS_WATERWALL,
} from './const.js';
import { S_NYMPH, M2_STRONG, M2_ROCKTHROW, MZ_HUMAN, AT_BOOM, M1_HIDE,
         PM_GRID_BUG } from './monsters.js';
import { m_at, is_pool, is_lava, closed_door } from './makemon.js';
import { pline, canspotmon, mon_visible } from './display.js';
import { t_at, VIBRATING_SQUARE } from './trap.js';
import { dist2 } from './hacklib.js';
import { onscary } from './monmove.js';
import { COIN_CLASS, BOULDER } from './objects.js';

function strongmonst(ptr) { return (ptr.mflags2 & M2_STRONG) !== 0; }
function throws_rocks(ptr) { return (ptr.mflags2 & M2_ROCKTHROW) !== 0; }

// C ref: hack.c weight_cap()
export function weight_cap() {
    const g = game;
    const u = g.u;
    const lev = u.uprops[LEVITATION];
    const save_BLev = lev.blocked;
    let carrcap;

    /* boots of levitation being put on (afternmv == Boots_on): donning
       armor over several turns isn't ported yet */
    /* levitation is blocked by being trapped in the floor, but it still
       functions enough in that situation to enhance carrying capacity */
    lev.blocked &= ~I_SPECIAL;

    carrcap = (WT_WEIGHTCAP_STRCON * (acurrstr() + ACURR(A_CON)))
              + WT_WEIGHTCAP_SPARE;
    if (u.umonnum !== u.umonster) { /* Upolyd */
        const ptr = g.youmonst.data;
        /* consistent with can_carry() in mon.c */
        if (ptr.mlet === S_NYMPH)
            carrcap = MAX_CARR_CAP;
        else if (!ptr.cwt)
            carrcap = Math.trunc((carrcap * ptr.msize) / MZ_HUMAN);
        else if (!strongmonst(ptr)
                 || (strongmonst(ptr) && (ptr.cwt > WT_HUMAN)))
            carrcap = Math.trunc(carrcap * ptr.cwt / WT_HUMAN);
    }

    /* C ref: youprop.h Levitation, Flying (BFlying: not ported yet) */
    const Levitation = (lev.intrinsic || lev.extrinsic) && !lev.blocked;
    const Flying = !!(u.uprops[FLYING].intrinsic || u.uprops[FLYING].extrinsic);
    if (Levitation || Is_airlevel(u.uz) /* pugh@cornell */
        || (u.usteed && strongmonst(u.usteed.data))) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP)
            carrcap = MAX_CARR_CAP;
        if (!Flying) {
            const EWounded_legs = u.uprops[WOUNDED_LEGS].extrinsic;
            if (EWounded_legs & LEFT_SIDE)
                carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (EWounded_legs & RIGHT_SIDE)
                carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }

    if (lev.blocked !== save_BLev) {
        lev.blocked = save_BLev;
        /* float_vs_flight(): not ported yet */
    }

    return Math.max(carrcap, 1); /* never return 0 */
}

// C ref: hack.c inv_weight()
/* returns how far beyond the normal capacity the hero is carrying */
export function inv_weight() {
    const g = game;
    let otmp = g.invent;
    let wt = 0;

    while (otmp) {
        if (otmp.oclass === COIN_CLASS)
            wt += Math.trunc((otmp.quan + 50) / 100);
        else if (otmp.otyp !== BOULDER || !throws_rocks(g.youmonst.data))
            wt += otmp.owt;
        otmp = otmp.nobj;
    }
    g.wc = weight_cap();
    return (wt - g.wc);
}

// C ref: hack.c calc_capacity()
export function calc_capacity(xtra_wt) {
    const wt = inv_weight() + xtra_wt;
    let cap;

    if (wt <= 0)
        return UNENCUMBERED;
    if (game.wc <= 1)
        return OVERLOADED;
    cap = Math.trunc((wt * 2) / game.wc) + 1;
    return Math.min(cap, OVERLOADED);
}

// C ref: hack.c near_capacity()
export function near_capacity() {
    return calc_capacity(0);
}

// C ref: mondata.c noattacks()
function noattacks(ptr) {
    for (const mattk of ptr.mattk || []) {
        /* AT_BOOM "passive attack" (gas spore's explosion upon death)
           isn't an attack as far as our callers are concerned */
        if (mattk.aatyp === AT_BOOM)
            continue;

        if (mattk.aatyp)
            return false;
    }
    return true;
}

// C ref: hack.c monster_nearby()
export function monster_nearby() {
    const u = game.u;
    const Hallucination = !!(u.uprops[HALLUC]?.intrinsic || u.uprops[HALLUC]?.extrinsic);

    /* Also see the similar check in dochugw() in monmove.c */
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy))
                continue;
            const mtmp = m_at(x, y);
            if (mtmp
                && mtmp.m_ap_type !== M_AP_FURNITURE
                && mtmp.m_ap_type !== M_AP_OBJECT
                && (Hallucination
                    || (!mtmp.mpeaceful && !noattacks(mtmp.data)))
                && (!(mtmp.data.mflags1 & M1_HIDE) || !mtmp.mundetected)
                && !(mtmp.msleeping || !mtmp.mcanmove) /* !helpless() */
                && !onscary(u.ux, u.uy, mtmp) && canspotmon(mtmp))
                return 1;
        }
    return 0;
}

// C ref: do.c danger_uprops()
function danger_uprops() {
    const p = game.u.uprops;
    const on = (i) => !!(p[i]?.intrinsic || p[i]?.extrinsic);
    return (on(STONED) || on(SLIMED) || on(STRANGLED) || on(SICK));
}

// C ref: do.c cmd_safety_prevention() -- flagcounter names the game
// field C passes by address
export async function cmd_safety_prevention(ucverb, cmddesc, act, flagcounter) {
    const g = game;
    if (g.flags.safe_wait !== false && !g.iflags.menu_requested && !g.multi) {
        let buf = '';
        /* iflags.cmdassist (default on) || !(*flagcounter)++ */
        let assist = (g.iflags.cmdassist !== false);
        if (!assist) {
            const prev = g[flagcounter] || 0;
            g[flagcounter] = prev + 1;
            assist = !prev;
        }
        if (assist) /* visctrl(cmd_from_func(do_reqmenu)): the default 'm' */
            buf = `  Use 'm' prefix to force ${cmddesc}.`;
        if (monster_nearby()) {
            await pline(`${act}${buf}`); /* Norep() */
            return true;
        } else if (danger_uprops()) {
            await pline(`${ucverb} doesn't feel like a good idea right now.`);
            return true;
        }
    }
    g[flagcounter] = 0;
    return false;
}

// C ref: display.h _is_safemon() -- is_safemon(mon)
function is_safemon(mtmp) {
    const P = game.u.uprops;
    const has = (p) => !!(P[p]?.intrinsic || P[p]?.extrinsic);
    return game.flags.safe_dog !== false && mtmp.mpeaceful && canspotmon(mtmp)
           && !has(CONFUSION) && !has(HALLUC) && !has(STUNNED);
}

// C ref: defsym.h S_vcdoor, S_hcdoor (pchar indices)
const S_vcdoor = 15, S_hcdoor = 16;

// C ref: monst.h is_door_mappear()
function is_door_mappear(mon) {
    return mon.m_ap_type === M_AP_FURNITURE
           && (mon.mappearance === S_hcdoor || mon.mappearance === S_vcdoor);
}

// C ref: dbridge.c is_pool_or_lava()
function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

// C ref: hack.c avoid_moving_on_trap()
function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);

    if (trap && trap.tseen
        /* the vibrating square is implemented as a trap but treated as if
           it were a type of terrain */
        && trap.ttyp !== VIBRATING_SQUARE) {
        /* if (msg && flags.mention_walls) You("stop in front of %s.",
           an(trapname(trap->ttyp, FALSE))): trapname() isn't ported yet */
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_liquid()
function avoid_moving_on_liquid(x, y, msg) {
    const u = game.u;
    const P = u.uprops;
    const has = (p) => !!(P[p]?.intrinsic || P[p]?.extrinsic);
    const in_air = has(LEVITATION) || has(FLYING);
    const loc = game.level.at(x, y);
    /* Known_wwalking/Known_lwalking: whether worn water/lava walking boots
       are identified isn't tracked yet; only intrinsic water walking */
    const Known_wwalking = has(WWALKING);
    const Known_lwalking = false;

    /* don't stop if you're not on a transition between terrain types... */
    if ((loc.typ === game.level.at(u.ux, u.uy).typ
         /* or you are using shift-dir running and the transition isn't
            dangerous... */
         || (game.context.run < 2 && (!is_lava(x, y) || in_air))
         || game.context.travel)
        /* and you know you won't fall in */
        && (in_air || Known_lwalking || (is_pool(x, y) && Known_wwalking))
        && !(IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL)) {
        return false; /* liquid is safe to traverse */
    } else if (is_pool_or_lava(x, y) && loc.seenv) {
        /* if (msg && flags.mention_walls) You("stop at the edge of the
           %s.", hliquid(...)): hliquid() isn't ported yet */
        return true;
    }
    return false;
}

// C ref: hack.c lookaround()
export async function lookaround() {
    const g = game;
    const u = g.u;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;
    let i;
    let corrct = 0, noturn = 0;
    let mtmp;
    const Blind = !!(u.uprops[BLINDED]?.intrinsic || u.uprops[BLINDED]?.extrinsic);

    /* Grid bugs stop if trying to move diagonal, even if blind.  Maybe */
    /* they polymorphed while in the middle of a long move. */
    if (u.umonnum === PM_GRID_BUG /* NODIAG(u.umonnum) */ && u.dx && u.dy) {
        await pline("You cannot move diagonally.");
        nomul(0);
        return;
    }

    if (Blind || g.context.run === 0)
        return;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + u.dx && y === u.uy + u.dy);
            let stop = false, bcorr = false;

            /* ignore out of bounds, and our own location */
            if (!isok(x, y) || (x === u.ux && y === u.uy))
                continue;
            /* (grid bugs) ignore diagonals */
            if (u.umonnum === PM_GRID_BUG && x !== u.ux && y !== u.uy)
                continue;

            /* can we see a monster there? */
            if ((mtmp = m_at(x, y)) != null
                && mtmp.m_ap_type !== M_AP_FURNITURE
                && mtmp.m_ap_type !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* running movement and not a hostile monster */
                /* OR it blocks our move direction and we're not traveling */
                if ((g.context.run !== 1 && !is_safemon(mtmp))
                    || (infront && !g.context.travel)) {
                    /* if (flags.mention_walls) pline_xy(x, y, "%s blocks
                       your path.", upstart(a_monnam(mtmp))): a_monnam()
                       isn't ported yet */
                    nomul(0); /* goto stop */
                    return;
                }
            }

            const loc = g.level.at(x, y);
            /* stone is never interesting */
            if (loc.typ === STONE)
                continue;
            /* ignore the square we're moving away from */
            if (x === u.ux - u.dx && y === u.uy - u.dy)
                continue;

            /* stop for traps, sometimes */
            if (avoid_moving_on_trap(x, y, (infront && g.context.run > 1))) {
                if (g.context.run === 1)
                    bcorr = true; /* goto bcorr: if you must */
                else if (infront)
                    stop = true; /* goto stop */
            }

            if (!bcorr && !stop) {
                /* more uninteresting terrain */
                if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM
                    || IS_AIR(loc.typ) || loc.typ === ICE) {
                    continue;
                } else if (closed_door(x, y) || (mtmp && is_door_mappear(mtmp))) {
                    /* a closed door? */
                    /* ignore if diagonal */
                    if (x !== u.ux && y !== u.uy)
                        continue;
                    if (g.context.run !== 1 && !g.context.travel) {
                        if (g.flags.mention_walls)
                            await pline("You stop in front of the door.");
                        stop = true; /* goto stop */
                    } else {
                        /* orthogonal to a closed door, consider it a
                           corridor */
                        bcorr = true; /* goto bcorr */
                    }
                } else if (loc.typ === CORR) {
                    bcorr = true; /* corridor */
                } else if (is_pool_or_lava(x, y)) {
                    if (infront && avoid_moving_on_liquid(x, y, true))
                        stop = true; /* goto stop */
                    else
                        continue;
                } else { /* e.g. objects or trap or stairs */
                    if (g.context.run === 1)
                        bcorr = true; /* goto bcorr */
                    else if (g.context.run === 8)
                        continue;
                    else if (mtmp)
                        continue; /* d */
                    else if (((x === u.ux - u.dx) && (y !== u.uy + u.dy))
                             || ((y === u.uy - u.dy) && (x !== u.ux + u.dx)))
                        continue;
                    else
                        stop = true;
                }
            }
            if (bcorr) {
                /* bcorr: */
                if (g.level.at(u.ux, u.uy).typ !== ROOM) {
                    /* running or traveling */
                    if (g.context.run === 1 || g.context.run === 3
                        || g.context.run === 8) {
                        /* distance from x,y to location we're moving to */
                        i = dist2(x, y, u.ux + u.dx, u.uy + u.dy);
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                            noturn = 1;
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mtmp ? 1 : 0;
                        }
                    }
                    corrct++;
                }
                continue;
            }
            /* stop: */
            nomul(0);
            return;
        } /* end for loops */

    if (corrct > 1 && g.context.run === 2) {
        if (g.flags.mention_walls)
            await pline("The corridor widens here.");
        nomul(0); /* goto stop */
        return;
    }
    if ((g.context.run === 1 || g.context.run === 3 || g.context.run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        /* make sure that we do not turn too far */
        if (i0 === 2) {
            if (u.dx === y0 - u.uy && u.dy === u.ux - x0)
                i = 2; /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (u.dx && u.dy) {
            if ((u.dx === u.dy && y0 === u.uy) || (u.dx !== u.dy && y0 !== u.uy))
                i = -1; /* half turn left */
            else
                i = 1; /* half turn right */
        } else {
            if ((x0 - u.ux === y0 - u.uy && !u.dy)
                || (x0 - u.ux !== y0 - u.uy && u.dy))
                i = 1; /* half turn right */
            else
                i = -1; /* half turn left */
        }

        i += u.last_str_turn || 0;
        if (i <= 2 && i >= -2) {
            u.last_str_turn = i;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// C ref: hack.c end_running()
export function end_running(and_travel) {
    const g = game;
    /* moveloop() suppresses time_botl when context.run is non-zero; when
       running stops, update 'time' even if other botl status is unchanged */
    if (g.context.run) {
        g.context.run = 0;
        if (g.flags.time)
            g.disp_time_botl = true;
        /* flags.terrainstatus: classify_terrain() isn't ported yet */
    }

    /* 'context.mv' isn't travel but callers who want to end travel
       all clear it too */
    if (and_travel)
        g.context.travel = g.context.travel1 = g.context.mv = 0;
    /* gt.travelmap: travel isn't ported yet */
    /* cancel multi */
    if (g.multi > 0)
        g.multi = 0;
}

// C ref: hack.c nomul()
export function nomul(nval) {
    const g = game;
    if (g.multi < nval)
        return;              /* This is a bug fix by ab@unido */
    if (g.multi >= 0) g.disp_botl = true;
    g.u.uinvulnerable = 0; /* Kludge to avoid ctrl-C bug -dlc */
    g.u.usleep = 0;
    g.multi = nval;
    if (nval === 0)
        g.multi_reason = null;
    end_running(true);
    /* cmdq_clear(CQ_CANNED): the command queue isn't ported yet */
}
