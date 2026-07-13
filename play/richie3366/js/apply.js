// apply.js — Apply / use tool command.
// C ref: apply.c doapply (LOCK_PICK / key subset).

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, flush_topl_more, pline } from './display.js';
import { TOOL_CLASS, objectNames } from './objects.js';
import { pick_lock } from './lock.js';

const LOCK_PICK = objectNames.indexOf('LOCK_PICK');
const SKELETON_KEY = objectNames.indexOf('SKELETON_KEY');
const CREDIT_CARD = objectNames.indexOf('CREDIT_CARD');

/** C ref: apply.c apply_ok — TOOL_CLASS SUGGEST subset; other classes deferred. */
function apply_ok(obj) {
    return !!(obj && obj.oclass === TOOL_CLASS);
}

/** Invent-order letters (C getobj; do not alpha-sort). */
function apply_lets() {
    const lets = [];
    for (const o of game.invent || []) {
        if (apply_ok(o) && o.invlet) lets.push(o.invlet);
    }
    return lets.join('');
}

/**
 * C ref: invent.c getobj("use or apply", apply_ok) — loop on missing letter;
 * flush_topl_more before re-prompt so "don't have" gets --More--.
 * Empty SUGGEST set with no DOWNPLAY/hands → early "don't have anything"
 * (C suggested==0 && !forceprompt && !allownone); do not prompt [*].
 */
async function getobj_apply() {
    const lets0 = apply_lets();
    // C: apply_ok(NULL) is GETOBJ_EXCLUDE — no hands; DOWNPLAY (coins/
    // unknown oil) not yet in apply_ok → forceprompt stays false.
    if (!lets0) {
        await pline("You don't have anything to use or apply.");
        return null;
    }

    for (;;) {
        await flush_topl_more();
        const lets = apply_lets();
        if (!lets) {
            await pline("You don't have anything to use or apply.");
            return null;
        }
        const query = `What do you want to use or apply? [${lets} or ?*]`;
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
        const otmp = (game.invent || []).find((o) => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        if (!apply_ok(otmp)) {
            await pline("Sorry, I don't know how to use that.");
            return null;
        }
        game._pending_message = '';
        return otmp;
    }
}

/**
 * C ref: apply.c doapply() — TOOL_CLASS getobj; LOCK_PICK/key body.
 * Named omissions: full apply_ok (wand/spbook/coin/weapon/potion/
 * food/graystone); nohands/capacity; retouch; most otyp cases.
 * @returns {boolean} true if the command took time (ECMD_TIME)
 */
export async function doapply() {
    const obj = await getobj_apply();
    if (!obj) return false;

    if (obj.otyp === LOCK_PICK || obj.otyp === SKELETON_KEY
        || obj.otyp === CREDIT_CARD) {
        // C: res = (pick_lock(...) != 0) ? ECMD_TIME : ECMD_OK
        const pl = await pick_lock(obj);
        return pl !== 0;
    }

    // Other tools (sack, etc.) deferred
    await pline("Sorry, I don't know how to use that.");
    return false;
}
