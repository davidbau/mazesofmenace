// hack.js — C ref: hack.c.
import { nomul } from './allmain.js';
import { pooleffects_is_flyer, set_msg_xy } from './cmd.js';
import { BLINDED, CORR, FIRE_RES, FLYING, ICE, IS_AIR, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_WATERWALL, LAVAWALL, LEVITATION, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, ROOM, STONE, VIBRATING_SQUARE, W_NONDIGGABLE, isok, u_at } from './const.js';
import { mon_visible, time_botl_run_ended } from './display.js';
import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { ENV } from './hostenv.js';
import { _is_lava_local, _is_pool_local, is_door_mappear, is_pool_or_lava } from './look.js';
import { closed_door } from './monmove.js';
import { trapname } from './makemon.js';
import { Amonnam, hliquid } from './mhitm.js';
import { an } from './objnam.js';
import { pline } from './pline.js';
import { pushRngLogEntry } from './rng.js';
import { classifyTerrain, invalidateTerrainStatus } from './terrain-status.js';
import { t_at } from './trap.js';
import { m_at } from './uhitm.js';
import { is_safemon } from './display.js';
import { acurr } from './attrib.js'; // relocate-fns
import { Is_airlevel, LEFT_SIDE, OVERLOADED, RIGHT_SIDE, UNENCUMBERED, Upolyd, WOUNDED_LEGS, W_ARMF } from './const.js'; // relocate-fns
import { acurrstr } from './dokick.js'; // relocate-fns
import { float_vs_flight } from './mhitm.js'; // relocate-fns
import { _cwt, inv_weight_raw } from './weight.js'; // relocate-fns
import { showdamage } from './cmd.js'; // relocate-fns
import { COLD_RES, DISINT_RES, FAST, INTRINSIC, INVIS, POISON_RES, SEE_INVIS, SHOCK_RES, SLEEP_RES, STEALTH, TELEPORT, TELEPORT_CONTROL, UNCHANGING } from './const.js'; // relocate-fns
import { flush_pending_messages } from './display.js'; // relocate-fns
import { deadhero, do_death_sequence } from './end.js'; // relocate-fns
import { You_hear } from './pline.js'; // relocate-fns
import { PM_ELF, PM_VALKYRIE, PM_WIZARD } from './pm.generated.js'; // relocate-fns
import { rehumanize } from './polyself.js'; // relocate-fns
import { newsym } from './display.js'; // relocate-fns
import { place_object, remove_object } from './mklev.js'; // relocate-fns
import { Soundeffect, maybe_unhide_at } from './mon.js'; // relocate-fns
import { You_cant } from './pline.js'; // relocate-fns
import { ceiling, check_special_room, pooleffects, switch_terrain } from './cmd.js'; // relocate-fns
import { ARTICLE_A, FAILEDUNTRAP, HALF_PHDAM, IS_SINK, I_SPECIAL, MAX_TYPE, MELT_ICE_AWAY, RLOC_NOMSG, TIMEOUT, is_pit } from './const.js'; // relocate-fns
import { Warning, sensemon } from './display.js'; // relocate-fns
import { hard_helmet } from './do_wear.js'; // relocate-fns
import { pending_death_is_final } from './end.js'; // relocate-fns
import { is_ice } from './engrave.js'; // relocate-fns
import { drain_pending_death_in_place } from './fastforward.js'; // relocate-fns
import { x_monnam } from './mhitm.js'; // relocate-fns
import { mdamageu } from './mhitu.js'; // relocate-fns
import { helm_simple_name } from './objnam.js'; // relocate-fns
import { pickup } from './pickup.js'; // relocate-fns
import { d, rn2, rnd } from './rng.js'; // relocate-fns
import { dosinkfall } from './spoteffects.js'; // relocate-fns
import { mnexto } from './teleport.js'; // relocate-fns
import { spot_time_left } from './timeout.js'; // relocate-fns
import { dotrap, float_down } from './trap.js'; // relocate-fns
import { Blind } from './vision.js'; // relocate-fns
import { COLNO, NO_ROOM, ROOMOFFSET, ROWNO, SHARED, SHARED_PLUS, SHOPBASE } from './const.js'; // relocate-fns
import { bad_rock, cant_squeeze_thru, doorless_door } from './cmd.js'; // relocate-fns
import { D_BROKEN, D_NODOOR, IS_DOOR, Is_rogue_level, PASSES_WALLS } from './const.js'; // relocate-fns
import { PM_GRID_BUG } from './pm.generated.js'; // relocate-fns
import { block_door } from './shk.js'; // relocate-fns
import { _gp_uprop_he, goodpos, lev_flags, lev_typ } from './trap.js'; // relocate-fns

const _DIRTRACE = (typeof process !== 'undefined' && ENV
    && ENV.FF_DIRTRACE === '1');

// C ref: hack.c:906-913 may_dig(coordxy x, coordxy y)
//   struct rm *lev = &levl[x][y];
//   return (boolean) !((IS_STWALL(lev->typ) || IS_TREE(lev->typ))
//                      && (lev->wall_info & W_NONDIGGABLE));
// "intended to be called only on ROCKs or TREEs". wall_info is the shared
// `flags` bitfield. RNG: none.
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
}

// C ref: rm.h NODIAG macro (hack.h:1419)
// #define NODIAG(monnum) ((monnum) == PM_GRID_BUG)
// PM_GRID_BUG = 116 (from pm.generated.js)
const PM_GRID_BUG_LA = 116;

function NODIAG(monnum) { return (monnum | 0) === PM_GRID_BUG_LA; }

// C ref: hack.c:2448-2464 avoid_moving_on_trap(x, y, msg)
// Returns TRUE if there's a known, visible, non-vibrating-square trap at (x, y).
// (RNG-free: only reads trap state.)
export async function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);
    if (!trap) return false;
    if (!trap.tseen) return false;
    if (trap.ttyp === VIBRATING_SQUARE) return false;
    /* C hack.c:2456-2460 — rushes (run >= 2) report why they stopped. */
    if (msg && game.flags?.mention_walls) {
        set_msg_xy(x, y);
        await pline(`You stop in front of ${an(trapname(trap.ttyp | 0, false))}.`);
    }
    return true;
}

// C ref: hack.c:2466-2494 avoid_moving_on_liquid(x, y, msg) — static fn in C
// Returns TRUE if the hero should stop at the edge of a pool/lava.
// RNG-free; reads terrain type, hero flags, and seenv.
export async function avoid_moving_on_liquid(x, y, msg) {
    const u = game.u || {};
    const levHere = game.level?.at(u.ux | 0, u.uy | 0);
    const levThere = game.level?.at(x, y);
    if (!levThere) return false;
    /* C youprop.h:240-255: blocked properties do not lift the hero; a flying steed can. */
    const lp = u.uprops?.[LEVITATION], fp = u.uprops?.[FLYING];
    const levitation = !!((lp?.intrinsic || lp?.extrinsic) && !lp?.blocked);
    const flying = !!((fp?.intrinsic || fp?.extrinsic
        || (u.usteed && pooleffects_is_flyer(u.usteed.data))) && !fp?.blocked);
    const in_air = levitation || flying;
    /* C hack.c:59-65 Known_wwalking / Known_lwalking.  These are
     * knowledge predicates, not movement properties: the hero only knows
     * water walking when identified water-walking boots are worn (and is not
     * riding), while lava walking additionally requires known fire resistance
     * and boots marked erosion-proof and rust-known. */
    const uarmf = u.uarmf;
    const known_wwalking = !!(uarmf
        && (uarmf.otyp | 0) === 167 /* WATER_WALKING_BOOTS */
        && game._oc_name_known?.[167]
        && !u.usteed);
    const fireRes = u.uprops?.[FIRE_RES];
    const known_lwalking = !!(known_wwalking && fireRes
        && ((fireRes.intrinsic | 0) || (fireRes.extrinsic | 0))
        && uarmf.oerodeproof && uarmf.rknown);
    /* C condition: avoid if:
     * NOT ((levl[x][y].typ == levl[u.ux][u.uy].typ
     *       || (context.run < 2 && (!is_lava(x,y) || in_air))
     *       || context.travel)
     *      && (in_air || Known_lwalking || (is_pool(x,y) && Known_wwalking))
     *      && !(IS_WATERWALL || LAVAWALL))
     * AND is_pool_or_lava(x,y) && levl[x][y].seenv */
    const ctx = game.context || {};
    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const typHere = levHere?.typ ?? ROOM;
    const typThere = levThere.typ;
    const isLavaThere = _is_lava_local(x, y);
    const isPoolThere = _is_pool_local(x, y);
    /* safe conditions */
    const safe_terrain = (typThere === typHere
        || (run < 2 && (!isLavaThere || in_air))
        || travel);
    const safe_protected = (in_air || known_lwalking
        || (isPoolThere && known_wwalking));
    const notWaterwall = !(IS_WATERWALL(typThere) || typThere === LAVAWALL);
    if (safe_terrain && safe_protected && notWaterwall) return false;
    if (is_pool_or_lava(x, y) && levThere.seenv) {
        if (msg && game.flags?.mention_walls) {
            set_msg_xy(x, y);
            await pline(`You stop at the edge of the ${hliquid(isPoolThere ? 'water' : 'lava')}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c:4046-4066 end_running(boolean and_travel)
// Clears context.run, optionally clears travel/travel1/mv, clears multi if > 0.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export function end_running(and_travel) {
    const ctx = game.context;
    if (!ctx) return;
    const wasRunning = !!(ctx.run | 0);
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_enter[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} andTravel=${and_travel?1:0} moves=${game.moves|0}]`);
    /* C hack.c:4131-4136 — `if (svc.context.run) { svc.context.run = 0;
     *     if (flags.time) disp.time_botl = TRUE; ... }'.  moveloop_core suppresses
     * the turn counter's status update for the whole run (allmain.c:262), so the
     * stop is what puts the current svm.moves back on the physical line. */
    if (ctx.run | 0) time_botl_run_ended();
    ctx.run = 0;
    /* C hack.c:4141-4143 — only a real run stop with terrainstatus enabled
     * invalidates/reclassifies the status terrain. */
    if (wasRunning && game.flags?.terrainstatus) {
        invalidateTerrainStatus();
        classifyTerrain();
    }
    if (and_travel) {
        ctx.travel = 0;
        ctx.travel1 = 0;
        ctx.mv = 0;
    }
    if (game.gt && game.gt.travelmap)
        game.gt.travelmap = null;
    if ((game.multi | 0) > 0) {
        game.multi = 0;
    }
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_exit[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} timeBotl=${game.disp?.time_botl|0} frozen=${game._timeBotlFrozenMoves ?? -1} moves=${game.moves|0}]`);
}

// C ref: hack.c:3814-3975 lookaround(void) — RNG-FREE run-stop predicate.
// Scans the 3×3 neighborhood of the hero and stops the run (nomul(0)) on:
//   - a visible non-safe monster in the path
//   - a known trap ahead
//   - a closed door orthogonally ahead
//   - a pool/lava ahead that would be dangerous
//   - a corridor intersection (corrct > 1 in run==2 mode)
// May rewrite u.dx/u.dy/u.last_str_turn for corridor turns.
// Consumes NO RNG.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export async function lookaround() {
    const u = game.u;
    if (!u) return;
    const ctx = game.context || {};

    /* C hack.c:3907-3910 — grid bugs stop if moving diagonal */
    if (NODIAG(u.umonnum | 0) && u.dx && u.dy) {
        await pline('You cannot move diagonally.');
        nomul(0);
        return;
    }

    /* C hack.c:3829-3830 — Blind or run==0: return without scanning */
    const bp = u.uprops?.[BLINDED];
    const blind = !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
        && !(bp.blocked | 0);
    if (blind || !(ctx.run)) return;

    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const ux = u.ux | 0, uy = u.uy | 0;
    const dx = u.dx | 0, dy = u.dy | 0;

    let corrct = 0, noturn = 0;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;

    /* FF_DIRTRACE emit at a STOP exit (a nomul(0); return inside the scan). The
     * tail-of-function emit covers the no-stop / turn-resolution exits; this one
     * covers the early stop returns so the instrument shows the run-STOP cause
     * (e.g. the closed-door stop at hack.c:3884 that ends the run faithfully). */
    const _emitStop = (reason) => {
        if (!_DIRTRACE) return;
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=0 turnApplied=0 turnI=na stop=1 reason=${reason}]`);
    };

    /* C hack.c:3831-3939: nested x/y loop over 3×3 neighborhood */
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            const infront = (x === ux + dx && y === uy + dy);
            /* ignore out of bounds and hero's own cell */
            if (!isok(x, y) || u_at(x, y)) continue;
            /* grid bugs: ignore diagonals */
            if (NODIAG(u.umonnum | 0) && x !== ux && y !== uy) continue;

            const lev = game.level?.at(x, y);
            if (!lev) continue;
            const typ = lev.typ;

            /* monster check */
            /* C m_at(): the map grid, which also holds long worm tail segments */
            const mtmp = m_at(x, y);
            if (mtmp != null
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* C hack.c:3849-3855: stop for visible hostile, or infront non-travel */
                if ((run !== 1 && !is_safemon(mtmp))
                    || (infront && !travel)) {
                    /* C hack.c:3853-3855: pline_xy(x, y,
                     *     "%s blocks your path.", upstart(a_monnam(mtmp))).
                     * Amonnam is exactly that naming composition.  pline()'s
                     * normal path updates the topline synchronously, so this
                     * awaits completion before stopping the run (apart
                     * from the same display-name stream C may use while
                     * hallucinating). */
                    if (game.flags?.mention_walls) {
                        set_msg_xy(x, y);
                        await pline(`${Amonnam(mtmp)} blocks your path.`);
                    }
                    nomul(0);
                    _emitStop(`monster@${x},${y}:tame${mtmp.mtame | 0}:peace${mtmp.mpeaceful | 0}:infront${infront ? 1 : 0}`);
                    return;
                }
            }

            /* stone is never interesting */
            if (typ === STONE) continue;
            /* skip the square we're moving away from */
            if (x === ux - dx && y === uy - dy) continue;

            /* trap check: avoid_moving_on_trap(x, y, infront && run > 1) */
            if (await avoid_moving_on_trap(x, y, infront && run > 1)) {
                if (run === 1) {
                    /* goto bcorr — treat as corridor */
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (infront) {
                    nomul(0);
                    _emitStop('trap-infront');
                    return;
                }
                /* run != 1 and !infront: fall through to the IS_OBSTRUCTED/etc check */
            }

            /* uninteresting terrain: obstructed/room/air/ice */
            if (IS_OBSTRUCTED(typ) || typ === ROOM
                || IS_AIR(typ) || typ === ICE) {
                continue;
            } else if (closed_door(x, y) || (mtmp && is_door_mappear(mtmp))) {
                /* closed door? */
                if (x !== ux && y !== uy) continue; /* ignore if diagonal */
                if (run !== 1 && !travel) {
                    /* C hack.c:3974-3977 */
                    if (game.flags?.mention_walls) {
                        set_msg_xy(x, y);
                        await pline('You stop in front of the door.');
                    }
                    nomul(0);
                    _emitStop('closed-door');
                    return;
                }
                /* orthogonal closed door → treat as corridor (bcorr) */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (typ === CORR) {
                /* corridor */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (is_pool_or_lava(x, y)) {
                if (infront && await avoid_moving_on_liquid(x, y, true)) {
                    nomul(0);
                    _emitStop('liquid');
                    return;
                }
                continue;
            } else {
                /* e.g. objects, trap, stairs */
                if (run === 1) {
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (run === 8) continue;
                if (mtmp) continue;
                /* off-axis continue checks */
                if (((x === ux - dx) && (y !== uy + dy))
                    || ((y === uy - dy) && (x !== ux + dx)))
                    continue;
                /* fall through to stop */
                nomul(0);
                _emitStop('obstruction');
                return;
            }
        }
    }

    /* C hack.c:4025-4028: corrct > 1 in run==2 → widen corridor → stop */
    if (corrct > 1 && run === 2) {
        if (game.flags?.mention_walls)
            await pline('The corridor widens here.');
        nomul(0);
        _emitStop('corridor-widens');
        return;
    }

    /* C hack.c:3946-3974: corridor turn resolution — may rewrite u.dx/u.dy */
    let _turnGate = false, _turnApplied = false, _turnI = null;
    if ((run === 1 || run === 3 || run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        _turnGate = true;
        let i;
        if (i0 === 2) {
            if (dx === y0 - uy && dy === ux - x0)
                i = 2;  /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (dx && dy) {
            if ((dx === dy && y0 === uy) || (dx !== dy && y0 !== uy))
                i = -1; /* half turn left */
            else
                i = 1;  /* half turn right */
        } else {
            if ((x0 - ux === y0 - uy && !dy)
                || (x0 - ux !== y0 - uy && dy))
                i = 1;  /* half turn right */
            else
                i = -1; /* half turn left */
        }
        i += (u.last_str_turn | 0);
        _turnI = i;
        if (i <= 2 && i >= -2) {
            _turnApplied = true;
            u.last_str_turn = i;
            u.dx = x0 - ux;
            u.dy = y0 - uy;
        }
    }
    if (_DIRTRACE) {
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=${_turnGate ? 1 : 0} turnApplied=${_turnApplied ? 1 : 0}`
            + ` turnI=${_turnI == null ? 'na' : _turnI}`
            + ` stop=${(game.multi | 0) === 0 ? 1 : 0}]`);
    }
}

/* Helper: bcorr block — corridor counting logic (C hack.c:3894-3920).
 * Takes current corridor-tracking state and returns updated state.
 * Returns null to signal "skip this cell" (C's 'continue' from inside bcorr).
 *
 * C uses goto bcorr which jumps into the CORR else-if branch at label bcorr:.
 * The label is at the start of the inner if(typ!=ROOM) block, so all goto bcorr
 * sites run the same logic and then the outer 'continue' at line 3920.
 *
 * Important: when i > 2 inside bcorr, C does 'continue' WITHOUT incrementing
 * corrct.  We signal this by returning the state unchanged (same as skip). */
function _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
    corrct, noturn, i0, x0, y0, m0) {
    /* C hack.c:3895: if (levl[u.ux][u.uy].typ != ROOM) — hero is in corridor */
    const levHero = game.level?.at(ux, uy);
    if (levHero && levHero.typ !== ROOM) {
        /* running or traveling: run==1/3/8 */
        if (run === 1 || run === 3 || run === 8) {
            /* i = dist2(x, y, u.ux+u.dx, u.uy+u.dy) */
            const i = dist2(x, y, ux + dx, uy + dy);
            /* C: if (i > 2) continue — skip cell, do NOT increment corrct */
            if (i > 2) {
                return { corrct, noturn, i0, x0, y0, m0 };
            }
            /* mark noturn if this corridor is not orthogonally next to prev */
            if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                noturn = 1;
            /* prefer the closer/orthogonal option */
            if (i < i0) {
                i0 = i;
                x0 = x;
                y0 = y;
                m0 = mtmp ? 1 : 0;
            }
        }
        corrct++;
    }
    return { corrct, noturn, i0, x0, y0, m0 };
}

const A_CON = 4;

/* C include/weight.h */
const WT_WEIGHTCAP_STRCON = 25; /* str+con multiplied by this */

const WT_WEIGHTCAP_SPARE = 50;

const WT_WOUNDEDLEG_REDUCT = 100;

const MAX_CARR_CAP = 1000;

const WT_HUMAN = 1450; /* C weight.h — weight of human body; Upolyd cap rescale */

/* C monflag.h sizes / mlets / mflags2 used by the Upolyd capacity rescale. */
const MZ_HUMAN = 2; /* == MZ_MEDIUM */

const S_NYMPH = 14;

const M2_STRONG = 0x04000000;
const M1_FLY = 0x00000001; /* monflag.h */
const COIN_CLASS = 12; /* objclass.h */

export function weight_cap() {
    const u = game.u;
    if (!u) return 1;

    const levPropW = (u.uprops && u.uprops[LEVITATION]) ? u.uprops[LEVITATION] : null;
    const save_ELev = levPropW ? (levPropW.extrinsic | 0) : 0;
    if (game.afternmv === 'Boots_on' && levPropW && (save_ELev & W_ARMF)) {
        levPropW.extrinsic = save_ELev & ~W_ARMF;
        float_vs_flight();
    }

    let carrcap = (WT_WEIGHTCAP_STRCON * (acurrstr(u) + (acurr(u, A_CON) | 0)))
                  + WT_WEIGHTCAP_SPARE;

    /* Upolyd branch (hack.c:4277-4287) — consistent with can_carry() in mon.c.
     *   if (youmonst.data->mlet == S_NYMPH)            carrcap = MAX_CARR_CAP;
     *   else if (!youmonst.data->cwt)                  carrcap *= msize / MZ_HUMAN;
     *   else if (!strongmonst || (strongmonst && cwt > WT_HUMAN))
     *                                                  carrcap *= cwt / WT_HUMAN; */
    if (Upolyd(u)) {
        const yd = game.youmonst && game.youmonst.data;
        if (yd) {
            const cwt = _cwt(yd.pmidx | 0);
            const strong = ((yd.mflags2 | 0) & M2_STRONG) !== 0;
            if ((yd.mlet | 0) === S_NYMPH) {
                carrcap = MAX_CARR_CAP;
            } else if (!cwt) {
                carrcap = Math.trunc((carrcap * (yd.msize | 0)) / MZ_HUMAN);
            } else if (!strong || (strong && cwt > WT_HUMAN)) {
                carrcap = Math.trunc((carrcap * cwt) / WT_HUMAN);
            }
        }
    }

    /* Levitation || Is_airlevel || strong-steed (hack.c:4289).
     * C youprop.h:240: Levitation = ((HLevitation || ELevitation) && !BLevitation).
     * Read the conferred property (e.g. ring of levitation just worn → ELevitation
     * set by setworn); this gives the hero MAX carrying capacity, dropping the
     * encumbrance state.  weight_cap also masks BLevitation&I_SPECIAL (hack.c:4309)
     * — the I_SPECIAL bit is cleared for the capacity check. */
    const levProp = (u.uprops && u.uprops[LEVITATION]) ? u.uprops[LEVITATION] : null;
    const HLevitation = levProp ? (levProp.intrinsic | 0) : 0;
    const ELevitation = levProp ? (levProp.extrinsic | 0) : 0;
    const BLevitation = levProp ? ((levProp.blocked | 0) & ~I_SPECIAL) : 0;
    const Levitation = (HLevitation || ELevitation) && !BLevitation;
    const Is_airlevel_wc = Is_airlevel(game.u?.uz);
    /* C hack.c:4326 `u.usteed && strongmonst(u.usteed->data)` */
    const _steedData = u.usteed ? (u.usteed.data || null) : null;
    const strongSteed = !!(_steedData && ((_steedData.mflags2 | 0) & M2_STRONG));
    if (Levitation || Is_airlevel_wc || strongSteed) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP)
            carrcap = MAX_CARR_CAP;
        // C hack.c:4330 / youprop.h:253: flight includes a flying steed.
        const flight = u.uprops?.[FLYING];
        const Flying = !!((flight?.intrinsic | 0) || (flight?.extrinsic | 0)
            || ((u.usteed?.data?.mflags1 | 0) & M1_FLY))
            && !(flight?.blocked | 0);
        if (!Flying) {
            /* hack.c:4293-4296 — EWounded_legs & LEFT_SIDE / RIGHT_SIDE. */
            const wprop = u.uprops ? u.uprops[WOUNDED_LEGS] : null;
            const eWoundedLegs = wprop ? (wprop.extrinsic | 0) : 0;
            if (eWoundedLegs & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (eWoundedLegs & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }

    /* hack.c:4338-4343 — BLevitation was masked above; C restores the saved
     * value and calls float_vs_flight(), which RECOMPUTES the I_SPECIAL block
     * from the current u.utrap.  So a weight_cap() call (bot() via
     * near_capacity) after trapmove() zeroed u.utrap but before reset_utrap()
     * drops the block, and reset_utrap(TRUE) then sees was_Lev true and prints
     * no float_up message. */
    /* C hack.c:4338-4343 — undo the boot-delay mask and re-block Flying. */
    if (levPropW && (levPropW.extrinsic | 0) !== save_ELev) {
        levPropW.extrinsic = save_ELev;
        float_vs_flight();
    }
    if (levProp && ((levProp.blocked | 0) & I_SPECIAL)) float_vs_flight();

    return Math.max(carrcap, 1); /* never return 0 */
}

/* C hack.c:4315 inv_weight() — returns (sum_owt - weight_cap). */
export function inv_weight() {
    return inv_weight_raw() - weight_cap();
}

/* C hack.c:4336 calc_capacity(xtra_wt). */
export function calc_capacity(xtra_wt) {
    const wc = weight_cap();        /* C: gw.wc set inside inv_weight() */
    const wt = (inv_weight_raw() - wc) + (xtra_wt | 0);
    if (wt <= 0)
        return UNENCUMBERED;
    if (wc <= 1)
        return OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

/* C hack.c:4348 near_capacity() = calc_capacity(0). */
export function near_capacity() {
    return calc_capacity(0);
}

/* C hack.c:4354 max_capacity() = inv_weight() - 2*weight_cap(). */
export function max_capacity() {
    const wc = weight_cap();
    return (inv_weight_raw() - wc) - (2 * wc);
}

/* C ref: hack.c:4219 losehp(n, knam, k_format) — apply hit-point loss to the
 * current monster form or the hero's ordinary HP, then resolve rehumanization
 * or death before returning to the caller. */
export async function losehp(n, knam, k_format) {
    const u = game.u;
    if (!u)
        return;
    n |= 0;
    // C's preceding pline has completed update_topl/more before losehp starts.
    // Drain the port's queued pages while they still show the pre-damage HP.
    /* C runs no flush_screen between the preceding pline and losehp's
     * SET_BOTL (hack.c:4265): status dirtied since that pline's own
     * flush_screen (kick_ouch's set_wounded_legs, dokick.c:900-901, ATEMP(A_DEX)--)
     * is not on the physical line until a later bot().  The port's drain below
     * must not paint it. */
    const _d0 = (game.disp ||= {});
    const _bl = _d0.botl, _blx = _d0.botlx;
    _d0.botl = 0; _d0.botlx = 0;
    /* ...and neither is the map: the port's drain below flushes the gbuf
     * (kick_ouch's feel_location paint), which C does not do here, so a later
     * display_nhwindow(WIN_MESSAGE) that blocks without flushing (vamp_shift,
     * monmove.c:2391) still shows the terminal as of the pline's own flush. */
    const _lff0 = game._lastFlushFrame;
    await flush_pending_messages();
    if (_lff0) game._lastFlushFrame = _lff0;
    if (_bl) _d0.botl = _bl;
    if (_blx) _d0.botlx = _blx;
    (game.disp ||= {}).botl = 1;
    end_running(true);
    if (Upolyd(u)) {
        u.mh = (u.mh | 0) - (n | 0);
        showdamage(n); /* C hack.c:4269 */
        if ((u.mhmax | 0) < (u.mh | 0)) u.mhmax = u.mh;
        if ((u.mh | 0) < 1) {
            await rehumanize();
        } else {
            const p = u.uprops?.[UNCHANGING];
            if ((n | 0) > 0 && (u.mh | 0) * 10 < (u.mhmax | 0)
                && ((p?.intrinsic | 0) || (p?.extrinsic | 0))) await maybe_wail();
        }
        return;
    }
    u.uhp = (u.uhp | 0) - (n | 0);
    showdamage(n); /* C hack.c:4280 */
    if ((u.uhp | 0) > (u.uhpmax | 0))
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if ((u.uhp | 0) < 1) {
        /* C hack.c:4248-4250 writes svk.killer, which is the struct
         * formatkiller() (topten.c:172) reads for the tombstone and the score
         * line.  This wrote a DIFFERENT object, `game.killer`, that nothing
         * reads — so a hero killed by a falling rock or a thrown potion got an
         * empty killer name on the stone. */
        if (!game.svk) game.svk = {};
        if (!game.svk.killer)
            game.svk.killer = { id: 0, format: 0, name: '', next: null };
        game.svk.killer.format = k_format | 0;
        game.svk.killer.name = knam || '';
        /* Preserve hack.c:4287's source-specific urgent death line across the
         * port's deferred async death boundary. */
        deadhero(0 /* DIED */, { urgentDeathLine: true });
        await do_death_sequence({ inPlace: true });
    } else if ((n | 0) > 0 && (u.uhp | 0) * 10 < (u.uhpmax | 0)) {
        await maybe_wail();
    }
}

/* ══ C hack.c:4210-4241 maybe_wail() ═════════════════════════════════════════
 * The "you are nearly dead" warning, fired by losehp() once the hero drops
 * below a tenth of max HP.  RNG-FREE.
 *
 * gw.wailmsg is a global that throttles it to once per 50 moves; this port had
 * no such field, so it is introduced here under C's name on `game`.  The
 * powers[] list and the >= 4 threshold are C's, verbatim; the intrinsic test is
 * `u.uprops[powers[i]].intrinsic & INTRINSIC` (youprop.h), the same uprops
 * spelling js/ writes elsewhere (see the note in js/const.js). */
/* seffects.h enum sound_effect_entries (se_zero_invalid = 0 first) */
const se_wailing_of_the_banshee = 193;

const _WAIL_POWERS = [TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES,
                      FIRE_RES, SLEEP_RES, DISINT_RES, TELEPORT_CONTROL,
                      STEALTH, FAST, INVIS];

async function maybe_wail() {
    const g = game, u = g.u;
    /* C hack.c:4217-4220 */
    if ((g.moves | 0) <= ((g.wailmsg | 0) + 50))
        return;
    g.wailmsg = g.moves | 0;
    if (g._touch_artifact_blast_msg) {
        const _bm = g._touch_artifact_blast_msg;
        g._touch_artifact_blast_msg = null;
        await pline(_bm);
    }
    /* C you.h:240/290 Role_if/Race_if — gu.urole.mnum / gu.urace.mnum, the same
     * readers js/cmd.js:254 and js/cmd.js:11131 use. */
    const role = (g.urole && g.urole.mnum) | 0;
    const race = (g.urace && g.urace.mnum) | 0;
    const isWiz = role === PM_WIZARD, isValk = role === PM_VALKYRIE;
    if (isWiz || race === PM_ELF || isValk) {
        /* C hack.c:4221-4237 */
        const who = (isWiz || isValk) ? (g.urole?.name?.m ?? 'Wizard') : 'Elf';
        if ((u.uhp | 0) === 1) {
            await pline(`${who} is about to die.`);
        } else {
            let powercnt = 0;
            for (const pw of _WAIL_POWERS)
                if (((u.uprops?.[pw]?.intrinsic | 0) & INTRINSIC) !== 0)
                    ++powercnt;
            await pline(powercnt >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`);
        }
        return;
    }
    /* C hack.c:4239-4241 — Soundeffect() then You_hear(); js/pline.js's
     * You_hear carries the Deaf/unaware guard and both prefixes. */
    Soundeffect(se_wailing_of_the_banshee, 75);
    const what = (u.uhp | 0) === 1 ? 'the wailing of the Banshee...'
                                   : 'the howling of the CwnAnnwn...';
    await You_hear(what);
}

/* C ref: hack.c:97-108 monst_to_any(mon) / obj_to_any(obj) — `anything` is a
 * UNION, so a_monst and a_obj are the same pointer.  del_light_source()'s
 * `curr->id.a_obj == id->a_obj` comparison relies on exactly that, which is
 * why both fields are filled here rather than one. */
export { monst_to_any, obj_to_any } from './cmd.js';

// movobj(obj, ox, oy) — hack.c:824-833.
export function movobj(obj, ox, oy) {
    remove_object(obj);
    maybe_unhide_at(obj.ox | 0, obj.oy | 0);
    newsym(obj.ox | 0, obj.oy | 0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
}

/** C ref: hack.c:4514 money_cnt — walk invent chain, return COIN_CLASS obj quan. */
export function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS)
            return otmp.quan;
    }
    return 0;
}

/* C ref: pline.c You_cant(const char *line, ...) — "You can't %s!". */
/* C ref: hack.c:4370 check_capacity(str) —
 *     if (near_capacity() >= EXT_ENCUMBER) {
 *         if (str) pline(str); else You_cant("do that while carrying so much stuff.");
 *         return TRUE;
 *     }
 *     return FALSE;
 * EXT_ENCUMBER = 4 (hack.h encumbrance levels: Unencumbered=0, Burdened=1,
 * Stressed=2, Strained=3, Overtaxed=4, Overloaded=5) — same threshold
 * js/cmd.js's own check_capacity uses. */
const EAT_EXT_ENCUMBER = 4;

export async function check_capacity(qbuf) {
    if (near_capacity() >= EAT_EXT_ENCUMBER) {
        if (qbuf) await pline(qbuf);
        else await You_cant('do that while carrying so much stuff.');
        return true;
    }
    return false;
}

const S_PIERCER = 16; // defsym.h

function terrain(x, y) {
    return game.level?.locations?.[x]?.[y]?.typ ?? STONE;
}

export async function spoteffects(pick) {
    const g = game, u = g.u;
    let trap = t_at(u.ux, u.uy);
    const trapflag = g.iflags?.failing_untrap ? FAILEDUNTRAP : 0;
    // C function statics belong to this game, including across nested calls.
    const state = g._spoteffectsState ||= {
        depth: 0, x: 0, y: 0, terrain: STONE, trap: null, trapType: 0,
    };
    if (state.depth && u.ux === state.x && u.uy === state.y
        && state.terrain === terrain(u.ux, u.uy)
        && (!state.trap || !trap || trap.ttyp === state.trapType)) return;
    if (g.iflags?.in_lava_effects) return;

    ++state.depth;
    state.terrain = terrain(u.ux, u.uy);
    state.x = u.ux;
    state.y = u.uy;
    try {
        if (state.terrain !== terrain(u.ux0, u.uy0)
            || g.iflags?.terrain_typ === MAX_TYPE)
            await switch_terrain();
        if (await pooleffects(true)) return;
        await check_special_room(false);

        const lev = () => u.uprops?.[LEVITATION] || {};
        const levitating = () => !!((lev().intrinsic | 0) || (lev().extrinsic | 0))
            && !(lev().blocked | 0);
        if (IS_SINK(terrain(u.ux, u.uy)) && levitating())
            await dosinkfall();

        if (!g.in_steed_dismounting) {
            if (trap && ((lev().intrinsic | 0) & TIMEOUT) === 1
                && !((lev().extrinsic | 0)
                     || ((lev().intrinsic | 0) & ~(I_SPECIAL | TIMEOUT)))) {
                if (rn2(2)) {
                    const prop = lev();
                    prop.intrinsic = ((prop.intrinsic | 0) & ~TIMEOUT)
                        | Math.min(TIMEOUT, ((prop.intrinsic | 0) & TIMEOUT) + 1);
                } else if (await float_down(I_SPECIAL | TIMEOUT, 0)) {
                    trap = null;
                    pick = false;
                }
            }
            const pit = trap && is_pit(trap.ttyp);
            if (pick && !pit) await pickup(1);
            if (trap && (!state.trap || state.trapType !== trap.ttyp)) {
                state.trap = trap;
                state.trapType = trap.ttyp;
                try {
                    await dotrap(trap, trapflag);
                } finally {
                    state.trap = null;
                    state.trapType = 0;
                }
            }
            if (pick && pit) await pickup(1);
        }

        if (Warning() && is_ice(u.ux, u.uy)) {
            const left = spot_time_left(u.ux, u.uy, MELT_ICE_AWAY);
            if (left && left < 15) {
                const warnings = ['The ice seems very soft and slushy.',
                    'You feel the ice shift beneath you!', 'The ice, is gonna BREAK!'];
                await pline(warnings[left < 5 ? 2 : left < 10 ? 1 : 0]);
            }
        }

        await spoteffects_mon_underfoot();
    } finally {
        if (!--state.depth) {
            state.terrain = STONE;
            state.x = state.y = 0;
        }
    }
}

/* C ref: hack.c:3416-3454 — spoteffects()' last block: a monster on the
 * hero's new square (a piercer drops, anything else surprises) is moved off
 * with mnexto().  Shared with teleds()' inline spoteffects (js/teleport.js). */
export async function spoteffects_mon_underfoot() {
    const u = game.u;
    const mon = m_at(u.ux, u.uy);
    if (mon && !u.uswallow) {
        mon.mundetected = mon.msleeping = 0;
        if ((mon.data?.mlet | 0) === S_PIERCER) {
            await pline(`${Amonnam(mon)} suddenly drops from the ${ceiling(u.ux, u.uy)}!`);
            if (mon.mtame) {
                // The tame piercer jumps to greet the hero.
            } else if (hard_helmet(u.uarmh)) {
                await pline(`Its blow glances off your ${helm_simple_name(u.uarmh)}.`);
            } else if ((u.uac | 0) + 3 <= rnd(20)) {
                await pline(`You are almost hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
            } else {
                await pline(`You are hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
                let damage = d(4, 6);
                const half = u.uprops?.[HALF_PHDAM];
                if ((half?.intrinsic | 0) || (half?.extrinsic | 0))
                    damage = Math.trunc((damage + 1) / 2);
                const deathBefore = game._pendingDeath || null;
                await mdamageu(mon, damage);
                /* C hack.c:3439 mdamageu -> done_in_by: "You die..." pages
                 * inside done(), before hack.c:3454's mnexto moves the
                 * piercer off the hero's square, and done() never returns
                 * unless the death is escaped. */
                if (game._pendingDeath && game._pendingDeath !== deathBefore) {
                    await drain_pending_death_in_place();
                    if (pending_death_is_final()) return;
                }
            }
        } else if (mon.mtame) {
            await pline(`${Amonnam(mon)} jumps near you from the ${ceiling(u.ux, u.uy)}.`);
        } else if (mon.mpeaceful) {
            const name = Blind() && !sensemon(mon) ? 'something'
                : x_monnam(mon, ARTICLE_A, null, 0, false);
            await pline(`You surprise ${name}!`);
            mon.mpeaceful = 0;
        } else {
            await pline(`${Amonnam(mon)} attacks you by surprise!`);
        }
        await mnexto(mon, RLOC_NOMSG);
    }
}

/* C ref: hack.c:697-760 in_rooms(x, y, typewanted) — return the room numbers
 * that <x,y> belongs to, filtered by room type.  C returns a NUL-terminated
 * char string of room numbers built backwards from the end of a static buffer;
 * this returns the same numbers, in the same order, as an array (every JS
 * caller in this file already consumes the stub's array form).
 *
 * C's goodtype(rno) macro:
 *   !typewanted
 *   || (typefound = svr.rooms[rno - ROOMOFFSET].rtype) == typewanted
 *   || (typewanted == SHOPBASE && typefound > SHOPBASE)
 * i.e. SHOPBASE is a "any shop" wildcard, since each shop kind is SHOPBASE+n.
 */
export function in_rooms(x, y, typewanted) {
    const buf = [];
    const rooms = game.level?.rooms ?? [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const typefound = rooms[rno - ROOMOFFSET]?.rtype | 0;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };
    const roomno_at = (xx, yy) =>
        (game.level?.locations?.[xx]?.[yy]?.roomno | 0);

    let rno = roomno_at(x, y);
    let step;
    switch (rno) {
    case NO_ROOM:
        return buf;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default: /* i.e. a regular room # */
        if (goodtype(rno))
            buf.unshift(rno);
        return buf;
    }

    /* C hack.c:721-737 — scan the 3x3 (or 2x2, for SHARED's step 2) window
     * around <x,y> collecting every distinct good-type room number. */
    let min_x = x - 1, max_x = x + 1;
    if (x < 1)
        min_x += step;
    else if (x >= COLNO)
        max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step) {
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = roomno_at(xx, min_y + yy);
            if (rno >= ROOMOFFSET && !buf.includes(rno) && goodtype(rno))
                buf.unshift(rno);
        }
    }
    return buf;
}

function _gp_Passes_walls() { return _gp_uprop_he(PASSES_WALLS); }

/* ---------------------------------------------------------------------------
 * crawl_destination — can the hero crawl from water to <x,y>?
 * C ref: nethack-c/src/hack.c:3992-4017
 *   boolean crawl_destination(coordxy x, coordxy y)
 * RNG: none of its own (goodpos()'s rn2(13) never fires for the hero, whose
 * mdat->mlet is never S_EEL on the crawl path).
 * ---------------------------------------------------------------------------
 */
export function crawl_destination(x, y) {
    const u = game.u || {};

    /* is location ok in general? */
    if (!goodpos(x, y, game.youmonst, 0))
        return false;

    /* orthogonal movement is unrestricted when destination is ok */
    if (x === u.ux || y === u.uy)
        return true;

    /* diagonal movement has some restrictions */
    if ((u.umonnum | 0) === PM_GRID_BUG) /* hack.h:1419 NODIAG(monnum) */
        return false; /* poly'd into a grid bug... */
    if (_gp_Passes_walls())
        return true; /* or a xorn... */
    /* pool could be next to a door, conceivably even inside a shop */
    if (IS_DOOR(lev_typ(x, y)) && (!doorless_door(x, y) || block_door(x, y)))
        return false;
    /* finally, are we trying to squeeze through a too-narrow gap? */
    return !(bad_rock(game.youmonst?.data, u.ux, y)
             && bad_rock(game.youmonst?.data, x, u.uy)
             && cant_squeeze_thru(game.youmonst));
}
