// hack.js — Core hero damage / capacity helpers.
// C ref: hack.c — losehp, nomul, unmul, overexertion, moverock/dopush (and related).

import { game } from './gstate.js';
import {
    Upolyd, KILLED_BY, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, isok,
    IS_OBSTRUCTED, IRONBARS, IS_DOOR, D_NODOOR, D_BROKEN,
} from './const.js';
import { pline, newsym } from './display.js';
import { gethungry } from './eat.js';
import { m_at } from './mon.js';
import { cansee, recalc_block_point } from './vision.js';
import { is_hider, throws_rocks } from './monsters.js';
import { objects_at, obj_extract_self, place_object } from './mkobj.js';
import { objectNames } from './generated/objects_data.js';
import { xname } from './objnam.js';
import { A_STR, exercise } from './attrib.js';

const BOULDER = objectNames.indexOf('BOULDER');

function sobj_at(otyp, x, y) {
    for (let o = objects_at(x, y); o; o = o.nexthere) {
        if ((o.otyp | 0) === otyp) return o;
    }
    return null;
}

/** C ref: hack.c doorless_door — D_NODOOR / D_BROKEN only. */
function doorless_door(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) return false;
    const m = loc.doormask || 0;
    return m === D_NODOOR || m === D_BROKEN;
}

/**
 * C ref: hack.c movobj — extract floor obj and place at (ox,oy).
 * maybe_unhide_at deferred. Boulder → recalc_block_point both cells.
 */
function movobj(obj, ox, oy) {
    if (!obj) return;
    const ox0 = obj.ox | 0;
    const oy0 = obj.oy | 0;
    const wasBoulder = (obj.otyp | 0) === BOULDER;
    obj_extract_self(obj);
    newsym(ox0, oy0);
    if (wasBoulder) recalc_block_point(ox0, oy0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
    if (wasBoulder) recalc_block_point(ox, oy);
}

/**
 * C ref: hack.c dopush — message + exercise(A_STR) + movobj.
 * Shop bill / unpaid / stolen_value arms deferred.
 */
async function dopush(sx, sy, rx, ry, otmp) {
    const u = game.u;
    if (!game.bldrpush) game.bldrpush = { oid: 0, time: 0 };
    const bp = game.bldrpush;
    const oid = otmp.o_id | 0;
    if (oid !== bp.oid) {
        bp.time = (game.moves || 0) + 1;
        bp.oid = oid;
    }
    const moves = game.moves || 0;
    const givemesg = moves > bp.time + 2 || moves < bp.time;
    const what = givemesg ? `the ${xname(otmp)}` : null;
    if (!u.usteed) {
        const easypush = throws_rocks(game.youmonst?.data);
        if (givemesg) {
            await pline(
                `With ${easypush ? 'little' : 'great'} effort you move ${what}.`,
            );
        }
        if (!easypush) exercise(A_STR, true);
    } else if (givemesg) {
        // YMonnam(steed) deferred — rare for ordinary push
        await pline(`Your steed moves ${what}.`);
    }
    bp.time = moves;

    otmp.next_boulder = 0;
    movobj(otmp, rx, ry);
    newsym(sx, sy);
}

/**
 * C ref: hack.c moverock_core — push boulder(s) at (sx,sy) along u.dx/u.dy.
 * Branch envelope: clear-destination dopush + exercise. Named omissions:
 * Sokoban diagonal, shop costly, trap/teleport/pool arms, Blind feel,
 * Levitation leverage, giant/squeeze/nopick, tunneling chew, revive_nasty,
 * monster-behind, closed-door dest, next_boulder naming.
 * Returns 0 to advance onto vacated cell, -1 to abort the move.
 */
async function moverock_core(sx, sy) {
    const u = game.u;
    while (sobj_at(BOULDER, sx, sy)) {
        const otmp = sobj_at(BOULDER, sx, sy);
        // Ensure boulder is top of pile
        const head = objects_at(sx, sy);
        if (otmp && head && otmp !== head) movobj(otmp, sx, sy);

        const rx = u.ux + 2 * u.dx;
        const ry = u.uy + 2 * u.dy;
        await nomul(0);

        if (u.Levitation || game.dungeon_topology?.Is_airlevel) {
            await pline(`You don't have enough leverage to push the ${xname(otmp)}.`);
            return -1;
        }

        const loc = game.level?.at(rx, ry);
        const typ = loc?.typ ?? 0;
        const clear = isok(rx, ry)
            && !IS_OBSTRUCTED(typ)
            && typ !== IRONBARS
            && (!IS_DOOR(typ) || !(u.dx && u.dy) || doorless_door(rx, ry))
            && !sobj_at(BOULDER, rx, ry);

        if (clear) {
            // Trap / monster-behind / closed_door / pool arms deferred
            if (m_at(rx, ry)) {
                await pline(`You try to move the ${xname(otmp)}, but in vain.`);
                return -1;
            }
            await dopush(sx, sy, rx, ry, otmp);
        } else {
            await pline(`You try to move the ${xname(otmp)}, but in vain.`);
            return -1;
        }
    }
    return 0;
}

/**
 * C ref: hack.c moverock — push boulder(s) at hero+dir.
 * Uses u.dx/u.dy already set by domove.
 */
export async function moverock() {
    const u = game.u;
    const sx = u.ux + u.dx;
    const sy = u.uy + u.dy;
    return moverock_core(sx, sy);
}

/** True if floor cell has a boulder (domove test_move gate). */
export function boulder_at(x, y) {
    return !!sobj_at(BOULDER, x, y);
}

const AT_BOOM = 14; // monattk.h — explosion-on-death, not a real attack

/**
 * C ref: mondata.c noattacks — True if mattk slots are empty (ignore AT_BOOM).
 */
export function noattacks(ptr) {
    const slots = ptr?.mattk;
    if (!slots) return true;
    for (let i = 0; i < 6; i++) {
        const aatyp = slots[i]?.aatyp | 0;
        if (aatyp === AT_BOOM) continue;
        if (aatyp) return false;
    }
    return true;
}

/**
 * C ref: hack.c monster_nearby — adjacent hostile the hero can spot.
 * onscary stubbed false (Elbereth / sanctuary still deferred).
 */
export function monster_nearby() {
    const u = game.u;
    if (!u) return false;
    const hallu = !!(u.Hallucination);
    for (let x = u.ux - 1; x <= u.ux + 1; x++) {
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy)) continue;
            const mtmp = m_at(x, y);
            if (!mtmp) continue;
            const ap = M_AP_TYPE(mtmp);
            if (ap === M_AP_FURNITURE || ap === M_AP_OBJECT) continue;
            if (!(hallu || (!mtmp.mpeaceful && !noattacks(mtmp.data)))) continue;
            if (is_hider(mtmp.data) && mtmp.mundetected) continue;
            if (mtmp.msleeping || mtmp.mcanmove === 0) continue; // helpless
            // onscary(u.ux, u.uy, mtmp) deferred
            // canspotmon ≈ canseemon stub
            if (!cansee(mtmp.mx, mtmp.my) || mtmp.minvis) continue;
            return true;
        }
    }
    return false;
}

/**
 * C ref: hack.c overexertion — melee hunger via gethungry; maybe faint.
 * Encumber HP loss (near_capacity / overexert_hp) deferred — no RNG when
 * not heavily encumbered.
 */
export function overexertion() {
    gethungry();
    return (game.multi | 0) < 0;
}

/**
 * C ref: hack.h Maybe_Half_Phys — Half_physical_damage halves ((dmg+1)/2).
 * Prop not yet wired → identity.
 */
export function maybe_half_phys(dmg) {
    const u = game.u;
    const half = !!(u?.HHalf_physical_damage || u?.EHalf_physical_damage);
    if (half) return Math.trunc((dmg + 1) / 2);
    return dmg;
}

/**
 * C ref: hack.c nomul — start/replace multi-turn inactivity (negative = occupation).
 * end_running / cmdq_clear deferred.
 */
export function nomul(nval) {
    if ((game.multi || 0) < nval) return;
    if (!game.flags) game.flags = {};
    if ((game.multi || 0) >= 0) game.flags.botl = true;
    game.multi = nval;
    if (nval === 0) {
        game.multi_reason = null;
        game.nomovemsg = null;
    }
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
    }
}

/**
 * C ref: timeout.c fall_asleep — nomul(how_long) with sleeping reason.
 * Deafness / Hear_again afternmv (#if 0 in C) deferred.
 * @param {number} how_long negative multi turns
 * @param {boolean} wakeup_msg if true, nomovemsg is "You wake up."
 */
export function fall_asleep(how_long, wakeup_msg) {
    // stop_occupation — clear multi-turn occupation without message
    if (typeof game.occupation === 'function') game.occupation = null;
    nomul(how_long);
    game.multi_reason = 'sleeping';
    if (!game.u) game.u = {};
    game.u.usleep = game.moves | 0;
    game.nomovemsg = wakeup_msg ? 'You wake up.' : 'You can move again.';
}

/**
 * C ref: hack.c unmul — finish multi-turn action; run afternmv if set.
 * @param {string|null|undefined} msg_override
 */
export async function unmul(msg_override) {
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    game.multi = 0;
    let msg = msg_override;
    if (msg === undefined) msg = null;
    if (msg != null) game.nomovemsg = msg;
    else if (!game.nomovemsg) game.nomovemsg = 'You can move again.';
    if (game.nomovemsg) {
        if (game.nomovemsg.length) await pline(game.nomovemsg);
        game.nomovemsg = null;
    }
    game.multi_reason = null;
    const f = game.afternmv;
    game.afternmv = null;
    if (typeof f === 'function') await f();
}

/**
 * C ref: hack.c losehp() — subtract HP (or mh when Upolyd).
 * showdamage / maybe_wail / done(DIED) bodies deferred; death still clamps
 * uhp and marks gameover so callers do not continue with negative HP.
 */
export function losehp(n, knam, k_format = KILLED_BY) {
    const u = game.u || (game.u = {});
    if (!game.flags) game.flags = {};
    game.flags.botl = true;
    // C: end_running(TRUE) — clear rush; do NOT force multi=0 (nomul owns that)
    if (game.context) {
        game.context.run = 0;
        game.context.mv = 0;
        game.context.travel = 0;
    }
    if ((game.multi | 0) > 0) game.multi = 0;

    if (Upolyd(u)) {
        u.mh = (u.mh || 0) - n;
        if ((u.mhmax || 0) < (u.mh || 0)) u.mhmax = u.mh;
        if ((u.mh || 0) < 1) {
            // rehumanize deferred — treat as fatal for now
            u.mh = 0;
            if (game.program_state) game.program_state.gameover = true;
        }
        return;
    }

    u.uhp = (u.uhp || 0) - n;
    if ((u.uhp || 0) > (u.uhpmax || 0)) u.uhpmax = u.uhp;
    if ((u.uhp || 0) < 1) {
        u.uhp = 0;
        // C: urgent_pline("You die..."); done(DIED); — full death path deferred
        if (game.program_state) game.program_state.gameover = true;
        void knam;
        void k_format;
    }
    // else if (n > 0 && u.uhp * 10 < u.uhpmax) maybe_wail() — deferred
}
