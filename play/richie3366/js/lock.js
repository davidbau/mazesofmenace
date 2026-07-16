// lock.js — Lock picking and door open.
// C ref: lock.c pick_lock (door/container subset); doopen_indir (autoopen path).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline, newsym } from './display.js';
import { vision_recalc, recalc_block_point } from './vision.js';
import {
    COLNO, ROWNO, IS_DOOR, ECMD_OK, ECMD_TIME,
    D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_TRAPPED,
    P_DAGGER, P_FLAIL, P_LANCE, P_PICK_AXE, P_SABER, P_NONE,
} from './const.js';
import { rnl } from './rng.js';
import { acurr, acurrstr, A_STR, A_DEX, A_CON, exercise } from './attrib.js';
import { verysmall } from './monsters.js';
import { objects_at } from './mkobj.js';
import { can_reach_floor } from './engrave.js';
import { WEAPON_CLASS, ROCK_CLASS, TOOL_CLASS, objectNames } from './objects.js';
import { doname, xname } from './objnam.js';

const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

// C: PICKLOCK_* return codes
const PICKLOCK_LEARNED_SOMETHING = -1;
const PICKLOCK_DID_NOTHING = 0;
const PICKLOCK_DID_SOMETHING = 1;

/** C ref: cmd.c getdir — movement key → u.dx/u.dy; default prompt. */
export async function getdir(prompt) {
    const msg = prompt || 'In what direction?';
    game._pending_message = `${msg} `;
    await flush_screen(1);
    const disp = game.nhDisplay;
    if (disp?.setCursor) {
        disp.setCursor(game._pending_message.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r') {
        return false;
    }
    if (!(ch in DIR_DX)) {
        return false;
    }
    if (!game.u) game.u = {};
    game.u.dx = DIR_DX[ch];
    game.u.dy = DIR_DY[ch];
    game.u.dz = 0;
    return true;
}

/** C ref: cmd.c get_adjacent_loc */
async function get_adjacent_loc(prompt, emsg) {
    if (!(await getdir(prompt))) {
        await pline('Never mind.');
        return null;
    }
    const x = (game.u.ux || 0) + (game.u.dx || 0);
    const y = (game.u.uy || 0) + (game.u.dy || 0);
    if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) {
        if (emsg) await pline(emsg);
        return null;
    }
    return { x, y };
}

/**
 * C ref: lock.c doopen_indir — open a CLOSED door at (x,y).
 * Autoopen callers pass the door coordinates (x > 0). Interactive
 * getdir / loot-at-feet / portcullis / autounlock / b_trapped /
 * feel_newsym mapseen gating deferred (named in C-JS-MAP).
 * Returns true when C would return ECMD_TIME (open attempt ran).
 */
export async function doopen_indir(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc || !IS_DOOR(loc.typ)) {
        await pline('You see no door there.');
        return false;
    }

    const mask = loc.doormask || 0;
    if (!(mask & D_CLOSED)) {
        let mesg;
        if (mask === D_BROKEN) mesg = ' is broken';
        else if (mask === D_NODOOR) mesg = 'way has no door';
        else if (mask === D_ISOPEN) mesg = ' is already open';
        else mesg = ' is locked';
        await pline(`This door${mesg}.`);
        // autounlock / canned kick deferred
        return false;
    }

    if (verysmall(game.youmonst?.data)) {
        await pline("You're too small to pull the door open.");
        return false;
    }

    // C: rnl(20) < (ACURRSTR + ACURR(A_DEX) + ACURR(A_CON)) / 3
    const chance = Math.trunc(
        (acurrstr() + acurr(A_DEX) + acurr(A_CON)) / 3,
    );
    if (rnl(20) < chance) {
        await pline('The door opens.');
        if (mask & D_TRAPPED) {
            // b_trapped("door", FINGER) deferred — clear to D_NODOOR like C
            loc.doormask = D_NODOOR;
        } else {
            loc.doormask = D_ISOPEN;
        }
        newsym(x, y);
        // C: feel_location + recalc_block_point(cc) then vision via full recalc
        recalc_block_point(x, y);
        vision_recalc(1);
    } else {
        exercise(A_STR, true);
        await pline('The door resists!');
    }
    return true;
}

/**
 * C ref: lock.c pick_lock — interactive adjacent-door path only.
 * Returns PICKLOCK_* ; caller maps != 0 to ECMD_TIME.
 */
export async function pick_lock(pick) {
    const cc = await get_adjacent_loc(null, 'Invalid location!');
    if (!cc) return PICKLOCK_DID_NOTHING;

    const u = game.u || {};
    if (cc.x === u.ux && cc.y === u.uy) {
        // Container-at-feet pick_lock path deferred
        await pline("There doesn't seem to be any sort of lock here.");
        return PICKLOCK_LEARNED_SOMETHING;
    }

    const loc = game.level?.at(cc.x, cc.y);
    if (!loc || !IS_DOOR(loc.typ)) {
        // C: feel_location / update_mapseen_for may upgrade DID_NOTHING →
        // LEARNED when glyph/lastseen changes; omit mapseen and treat
        // directed no-door as LEARNED (time passes) — matches lit probes.
        await pline('You see no door there.');
        return PICKLOCK_LEARNED_SOMETHING;
    }

    // C ref: lock.c pick_lock — switch (door->doormask) exact cases
    const mask = loc.doormask || 0;
    switch (mask) {
    case D_NODOOR:
        await pline('This doorway has no door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_ISOPEN:
        await pline('You cannot lock an open door.');
        return PICKLOCK_LEARNED_SOMETHING;
    case D_BROKEN:
        await pline('This door is broken.');
        return PICKLOCK_LEARNED_SOMETHING;
    default:
        // CLOSED/LOCKED (+ TRAPPED): yn lock/unlock occupation, autounlock,
        // credit-card rules deferred (named in C-JS-MAP).
        await pline('This doorway has no door.');
        return PICKLOCK_LEARNED_SOMETHING;
    }
}

/** C ref: obj.h Is_box — LARGE_BOX / CHEST. */
function Is_box(obj) {
    const n = objectNames[obj?.otyp];
    return n === 'LARGE_BOX' || n === 'CHEST';
}

/** C ref: obj.h is_weptool */
function is_weptool(obj) {
    if (!obj || obj.oclass !== TOOL_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill;
    return sk != null && sk !== P_NONE;
}

/** C ref: obj.h is_pick */
function is_pick(obj) {
    return (game.objects?.[obj?.otyp]?.oc_skill ?? 0) === P_PICK_AXE;
}

/** C ref: obj.h is_blade */
function is_blade(obj) {
    if (!obj || obj.oclass !== WEAPON_CLASS) return false;
    const sk = game.objects?.[obj.otyp]?.oc_skill ?? 0;
    return sk >= P_DAGGER && sk <= P_SABER;
}

/** C ref: lock.c u_have_forceable_weapon */
function u_have_forceable_weapon() {
    const uwep = game.u?.uwep;
    if (!uwep) return false;
    if (uwep.oclass === WEAPON_CLASS || is_weptool(uwep)) {
        const sk = game.objects?.[uwep.otyp]?.oc_skill ?? 0;
        if (sk < P_DAGGER || sk === P_FLAIL || sk > P_LANCE) return false;
        return true;
    }
    return uwep.oclass === ROCK_CLASS;
}

/**
 * C ref: lock.c doforce — #force chest lock with wielded weapon.
 * Branch envelope: swallow / no-weapon / can't-reach → ECMD_OK; scan
 * underfoot boxes; no box → "You decide not to force the issue." +
 * ECMD_TIME. forcelock occupation / resume deferred (C-JS-MAP).
 */
export async function doforce() {
    const u = game.u;
    if (!u) return ECMD_OK;

    if (u.uswallow) {
        await pline("You can't force anything from inside here.");
        return ECMD_OK;
    }
    if (!u_have_forceable_weapon()) {
        const uwep = u.uwep;
        const use_plural = !!(uwep && (uwep.quan || 1) > 1);
        let mid;
        if (!uwep) mid = 'when not wielding a';
        else if (uwep.oclass !== WEAPON_CLASS && !is_weptool(uwep)) {
            mid = use_plural ? 'without proper' : 'without a proper';
        } else {
            mid = use_plural ? 'with those' : 'with that';
        }
        await pline(
            `You can't force anything ${mid} weapon${use_plural ? 's' : ''}.`,
        );
        return ECMD_OK;
    }
    if (!can_reach_floor(true)) {
        await pline("You can't reach the floor.");
        return ECMD_OK;
    }

    const uwep = u.uwep;
    const picktyp = is_blade(uwep) && !is_pick(uwep);

    let box = null;
    for (let otmp = objects_at(u.ux, u.uy); otmp; otmp = otmp.nexthere) {
        if (!Is_box(otmp)) continue;
        if (otmp.obroken || !otmp.olocked) {
            otmp.lknown = 0;
            await pline(
                `There is ${doname(otmp)} here, but its lock is already ${
                    otmp.obroken ? 'broken' : 'unlocked'
                }.`,
            );
            otmp.lknown = 1;
            continue;
        }
        otmp.lknown = 1;
        const { yn_function } = await import('./getline.js');
        const c = await yn_function(
            `There is ${doname(otmp)} here; force its lock?`,
            'ynq',
            'n',
        );
        if (c === 'q') return ECMD_OK;
        if (c === 'n') continue;
        if (picktyp) {
            await pline(`You force your ${xname(uwep)} into a crack and pry.`);
        } else {
            await pline(`You start bashing it with your ${xname(uwep)}.`);
        }
        box = otmp;
        break;
    }

    if (box) {
        // set_occupation(forcelock) deferred — still ECMD_TIME
        return ECMD_TIME;
    }
    await pline('You decide not to force the issue.');
    return ECMD_TIME;
}
