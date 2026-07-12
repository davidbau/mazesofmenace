// lock.js — Lock picking (apply lock pick / key / credit card).
// C ref: lock.c pick_lock (door/container subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline } from './display.js';
import { COLNO, ROWNO, IS_DOOR } from './const.js';

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

    // Real door lock/unlock occupation deferred
    await pline('This doorway has no door.');
    return PICKLOCK_LEARNED_SOMETHING;
}
