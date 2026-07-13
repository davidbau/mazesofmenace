// potion.js — Quaff command (dodrink / dopotion / peffects subset).
// C ref: potion.c dodrink, dopotion, peffects, peffect_oil; invent.c getobj.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { flush_screen, pline } from './display.js';
import { POTION_CLASS, objectNames } from './objects.js';
import { weight } from './mkobj.js';
import { A_WIS, exercise } from './attrib.js';
import { discover_object } from './invent.js';

const POT_OIL = objectNames.indexOf('POT_OIL');

/** Invent letters of drinkable potions (C drink_ok → GETOBJ_SUGGEST). */
function drinkable_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (o.oclass === POTION_CLASS && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    return lets.join('');
}

/**
 * C ref: invent.c getobj("drink", drink_ok, GETOBJ_NOFLAGS)
 * Fountain/sink/underwater prompts deferred (dodrink skips when not present).
 */
async function getobj_drink() {
    const lets = drinkable_lets();
    const query = lets
        ? `What do you want to drink? [${lets} or ?*]`
        : 'What do you want to drink? [*]';
    const prompt = `${query} `;

    game._pending_message = prompt;
    const disp = game.nhDisplay;
    await flush_screen(1);
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
        await pline("You don't have that object.");
        return null;
    }
    if (otmp.oclass !== POTION_CLASS) {
        await pline('That is a silly thing to drink.');
        return null;
    }
    return otmp;
}

/** C ref: invent.c useup() — consume one from a stack / remove if gone. */
function useup(otmp) {
    if (!otmp) return;
    if ((otmp.quan || 1) > 1) {
        otmp.quan--;
        otmp.owt = weight(otmp);
        return;
    }
    const inv = game.invent || [];
    const idx = inv.indexOf(otmp);
    if (idx >= 0) inv.splice(idx, 1);
}

/**
 * C ref: potion.c peffect_oil()
 * Lit/fire-resist and burn_away_slime paths deferred.
 */
async function peffect_oil(otmp) {
    let good_for_you = false;
    if (otmp.lamplit) {
        // C: likes_fire → refreshing; else burn face + losehp + burn_away_slime
        // Lit-oil body deferred (starting kit oil is unlit)
        await pline('That was smooth!');
    } else if (otmp.cursed) {
        await pline('This tastes like castor oil.');
    } else {
        await pline('That was smooth!');
    }
    exercise(A_WIS, good_for_you);
}

/**
 * C ref: potion.c peffects() — POT_OIL only; other otyps named in C-JS-MAP.
 * Returns -1 to continue dopotion makeknown/useup; >=0 early ECMD
 * (0 = ECMD_OK without useup, matching C impossible/default return 0).
 */
async function peffects(otmp) {
    switch (otmp.otyp) {
    case POT_OIL:
        await peffect_oil(otmp);
        return -1;
    default:
        // Other peffect_* deferred — do not useup
        await pline('That potion is not implemented yet.');
        return 0;
    }
}

/**
 * C ref: potion.c dopotion()
 * Ghost/djinni bottle RNG, Hallucination peculiar-feeling, trycall deferred.
 */
async function dopotion(otmp) {
    otmp.in_use = true;
    const retval = await peffects(otmp);
    if (retval >= 0) return retval ? 1 : 0;

    const oc = game.objects?.[otmp.otyp];
    if (otmp.dknown && oc && !oc.oc_name_known) {
        discover_object(otmp.otyp, true, true);
        // more_experienced(0, 10) deferred
    }
    useup(otmp);
    return 1;
}

/**
 * C ref: potion.c dodrink() / #quaff
 * Strangled / fountain / sink / underwater / milky-ghost / smoky-djinni
 * deferred. Worn-stack split deferred (starting oils are unworn).
 * @returns {number} 0 = cancel/no turn, 1 = took time
 */
export async function dodrink() {
    // C: Strangled → message, ECMD_OK (no turn) — deferred unless needed
    const otmp = await getobj_drink();
    if (!otmp) return 0;

    otmp.in_use = true;
    // milky/smoky occupant paths deferred (no RNG when descr unmatched)
    return dopotion(otmp);
}
