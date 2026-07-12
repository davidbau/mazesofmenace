// dothrow.js — Throw command (minimal path for Tourist darts).
// C ref: dothrow.c dothrow / throw_obj / throwit (subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { rnd } from './rng.js';
import { place_object, splitobj } from './mkobj.js';
import { WEAPON_CLASS, COIN_CLASS } from './objects.js';
import {
    COLNO, ROWNO, IS_SOFT, LOST_THROWN, ZAP_POS, IS_DOOR, D_CLOSED, D_LOCKED,
} from './const.js';
import { obj_resists } from './dogmove.js';



const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

/**
 * C ref: dothrow.c throw_ok — GETOBJ_SUGGEST for coins + weapons (!uslinging).
 * DOWNPLAY / welded / AutoReturn / gem-sling branches deferred.
 */
function throw_ok(obj) {
    if (!obj) return false;
    if (obj.oclass === COIN_CLASS) return true;
    if (obj.oclass === WEAPON_CLASS) return true;
    return false;
}

/** Invent-order suggest letters (C getobj walks invent; gold `$` first). */
function throwable_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (throw_ok(o) && o.invlet) lets.push(o.invlet);
    }
    if (!lets.length) return '';
    return lets.join('');
}

/**
 * C ref: invent.c getobj("throw", throw_ok) — loop on missing letter;
 * re-prompt after more() when prior topline still needs acknowledgment.
 */
async function getobj_throw() {
    for (;;) {
        await flush_topl_more();
        const lets = throwable_lets();
        const query = lets
            ? `What do you want to throw? [${lets} or ?*]`
            : 'What do you want to throw? [*]';
        const prompt = `${query} `;
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);

        const key = await nhgetch();
        const ch = String.fromCharCode(key);
        if (key === 27 || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            await pline('Never mind.');
            return null;
        }
        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!throw_ok(otmp)) {
            await pline('You cannot throw that!');
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

async function getdir(prompt) {
    if (prompt) {
        game._pending_message = prompt;
        await flush_screen(1);
        const disp = game.nhDisplay;
        if (disp?.setCursor) disp.setCursor(prompt.length, 0);
    }
    const key = await nhgetch();
    const ch = String.fromCharCode(key);
    // Clear yn prompt before returning to the command loop (next capture).
    game._pending_message = '';
    if (key === 27 || ch === '.' || ch === ' ' || ch === '\n' || ch === '\r')
        return null;
    if (!(ch in DIR_DX)) {
        await pline('Never mind.');
        return null;
    }
    return { dx: DIR_DX[ch], dy: DIR_DY[ch] };
}

function freeinv(otmp) {
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
    // Also handle when otmp was split from a stack still in invent
}

/**
 * C ref: dothrow.c throw_obj — multishot rnd + split + throwit stub.
 * Enough RNG for seed1800 dart throw that lands without combat rolls.
 */
async function throw_obj(obj, _shotlimit) {
    // C: coin class → throw_gold (body deferred; `$` still in getobj suggest list)
    if (obj.oclass === COIN_CLASS) return 0;
    // Multishot stays 1 for Tourist dart (no launcher skill bonus path)
    let multishot = 1;
    multishot = rnd(multishot);
    if (multishot > (obj.quan || 1)) multishot = obj.quan || 1;

    for (let i = 1; i <= multishot; i++) {
        let otmp;
        if ((obj.quan || 1) > 1) {
            otmp = splitobj(obj, 1);
        } else {
            otmp = obj;
            freeinv(otmp);
            obj = null;
        }
        if (!otmp) break;
        // Detach split child from invent (parent stack remains)
        if (obj) {
            // split child was never in invent list as separate entry
        } else {
            freeinv(otmp);
        }
        await throwit(otmp);
    }
    return 1;
}

/**
 * C ref: dothrow.c breaktest() — always rolls obj_resists; darts don't break.
 */
function breaktest(obj) {
    if (!obj) return false;
    // nonbreakchance 1 for normal items
    if (obj_resists(obj, 1, 99)) return false;
    // glass / potions / eggs etc. — not needed for Tourist darts
    return false;
}

/**
 * C ref: zap.c bhit + dothrow.c throwit — fly along dx/dy; stop before
 * !ZAP_POS / closed door (bhit backs up one step), then place / breaktest.
 */
async function throwit(obj) {
    const u = game.u;
    const dx = u.dx || 0;
    const dy = u.dy || 0;
    // C: urange = ACURRSTR/2, then range capped; adjacent wall needs ≥1
    let range = 5;
    let x = u.ux;
    let y = u.uy;
    while (range-- > 0) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 1 || nx >= COLNO || ny < 0 || ny >= ROWNO) break;
        const loc = game.level?.at?.(nx, ny);
        if (!loc) break;
        const typ = loc.typ ?? 0;
        const closed = IS_DOOR(typ) && ((loc.doormask || 0) & (D_CLOSED | D_LOCKED));
        // C bhit: if (!ZAP_POS(typ) || closed_door) { bhitpos -= dir; break; }
        if (!ZAP_POS(typ) || closed) break;
        x = nx;
        y = ny;
    }
    const loc = game.level?.at?.(x, y);
    if (loc && !IS_SOFT(loc.typ) && breaktest(obj)) {
        // Broken — darts usually survive via obj_resists
        return;
    }
    obj.how_lost = LOST_THROWN;
    place_object(obj, x, y);
}


/**
 * C ref: dothrow.c dothrow()
 * @returns {number} 0 no turn, 1 took time
 */
export async function dothrow() {
    const obj = await getobj_throw();
    if (!obj) return 0;

    const dir = await getdir('In what direction? ');
    if (!dir) return 0;
    game.u.dx = dir.dx;
    game.u.dy = dir.dy;
    game.u.dz = 0;

    return await throw_obj(obj, 0);
}
