// eat.js — Eat command (getobj / doeat; fortune cookie for seed1800).
// C ref: eat.c doeat / floorfood / is_edible / fprefx / fpostfx / gethungry;
//         invent.c getobj.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { flush_topl_more, pline } from './display.js';
import { yn_function } from './getline.js';
import { FOOD_CLASS, COIN_CLASS, objectNames } from './objects.js';
import { weight } from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';

const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');

/**
 * C ref: eat.c gethungry — accessorytime = rn2(20); hunger side-effects
 * beyond the roll deferred (ring/amulet nutrition, faint, etc.).
 */
export function gethungry() {
    const accessorytime = rn2(20);
    void accessorytime;
}

/**
 * C ref: eat.c morehungry — nutrition loss after feats of magic / vomit.
 * newuhs body deferred (status transitions not needed for cast hunger).
 */
export function morehungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) - (num | 0);
}

function is_edible(obj) {
    if (!obj) return false;
    // C: objects[obj->otyp].oc_unique → false; human → FOOD_CLASS only
    const oc = game.objects?.[obj.otyp];
    if (oc?.oc_unique) return false;
    return obj.oclass === FOOD_CLASS;
}

/** Build getobj allow-string of edible inventory letters (e.g. "b-g"). */
function edible_lets() {
    const inv = game.invent || [];
    const lets = [];
    for (const o of inv) {
        if (is_edible(o) && o.invlet) lets.push(o.invlet);
    }
    lets.sort();
    if (!lets.length) return '';
    // Compact consecutive runs: b,c,d,e,f,g → b-g
    // C invent.c compactify uses dashes for runs of 3+; short runs stay literal.
    // seed1800 C shows "bcdef" (no dash) — emit uncompacted for ≤5 letters.
    if (lets.length <= 5) return lets.join('');
    let out = lets[0];
    let runStart = lets[0];
    let prev = lets[0];
    for (let i = 1; i < lets.length; i++) {
        const ch = lets[i];
        if (ch.charCodeAt(0) === prev.charCodeAt(0) + 1) {
            prev = ch;
            continue;
        }
        if (prev !== runStart) {
            out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
                ? prev
                : `-${prev}`;
        }
        out += ch;
        runStart = prev = ch;
    }
    if (prev !== runStart) {
        out += prev === String.fromCharCode(runStart.charCodeAt(0) + 1)
            ? prev
            : `-${prev}`;
    }
    return out;
}

/**
 * C ref: invent.c getobj("eat", is_edible) — yn_function free-letter loop;
 * missing letter → You("don't have that object.") + continue (next
 * yn_function flushes NEED_MORE → --More--). Empty SUGGEST → early
 * "don't have anything to eat."
 */
async function getobj_eat() {
    for (;;) {
        await flush_topl_more();
        const lets = edible_lets();
        if (!lets) {
            await pline("You don't have anything to eat.");
            return null;
        }
        // C: yn_function(qbuf, NULL, '\0') — any char; leave prompt on line
        const query = `What do you want to eat? [${lets} or ?*]`;
        const ch = await yn_function(query, null, '\0');

        // quitchars: space, Esc, etc.
        if (ch === '\x1b' || ch === ' ' || ch === '\n' || ch === '\r') {
            if (game.flags?.verbose !== false) await pline('Never mind.');
            return null;
        }
        if (ch === '?' || ch === '*') {
            // Menu path deferred
            await pline('Never mind.');
            return null;
        }

        const otmp = (game.invent || []).find(o => o.invlet === ch);
        if (!otmp) {
            // C: You("don't have that object."); continue;
            await pline("You don't have that object.");
            continue;
        }
        return otmp;
    }
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
 * C ref: eat.c doeat() — fortune-cookie + getobj loop; ordinary food body
 * deferred (nutrition/reqtime/occupation).
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    const otmp = await getobj_eat();
    if (!otmp) return 0;

    if (otmp.oclass === COIN_CLASS && !is_edible(otmp)) {
        await pline('You cannot eat gold.');
        return 0;
    }
    if (!is_edible(otmp)) {
        await pline('You cannot eat that!');
        return 0;
    }

    // Fortune cookie: reqtime 1 → instant finish + fpostfx rumor
    if (otmp.otyp === FORTUNE_COOKIE) {
        await pline(`This fortune cookie is ${otmp.cursed ? 'terrible!' : 'delicious!'}`);
        await outrumor(bcsign(otmp), BY_COOKIE);
        useup(otmp);
        // Nutrition stub — enough for RNG; hunger side-effects later
        game.u.uhunger = (game.u.uhunger ?? 900) + 40;
        return 1;
    }

    // Ordinary food nutrition/occupation deferred (C-JS-MAP)
    await pline('That food is not implemented yet.');
    return 0;
}
