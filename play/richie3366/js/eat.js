// eat.js — Eat command (getobj / doeat; fortune cookie + reqtime-1 food).
// C ref: eat.c doeat / touchfood / fprefx / start_eating / bite / done_eating /
//         lesshungry / obj_nutrition / floorfood / is_edible / gethungry
//         (Unaware rn2(10) + accessorytime rn2(20)); invent.c getobj.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { flush_topl_more, pline } from './display.js';
import { yn_function } from './getline.js';
import { FOOD_CLASS, COIN_CLASS, objectNames } from './objects.js';
import { weight, splitobj } from './mkobj.js';
import { BY_COOKIE, bcsign, outrumor } from './rumors.js';
import { singular, xname, doname } from './objnam.js';

const FORTUNE_COOKIE = objectNames.indexOf('FORTUNE_COOKIE');
const APPLE = objectNames.indexOf('APPLE');
const PEAR = objectNames.indexOf('PEAR');
const LEMBAS_WAFER = objectNames.indexOf('LEMBAS_WAFER');
const CRAM_RATION = objectNames.indexOf('CRAM_RATION');
const FOOD_RATION = objectNames.indexOf('FOOD_RATION');
const TRIPE_RATION = objectNames.indexOf('TRIPE_RATION');
const K_RATION = objectNames.indexOf('K_RATION');
const C_RATION = objectNames.indexOf('C_RATION');

/**
 * C objects.h FOOD nutrition — extractor omits oc_nutrition (named omission).
 * Only otyps exercised by the reqtime-1 / cookie path need entries here.
 */
const FOOD_NUTRITION = {
    FORTUNE_COOKIE: 40,
    APPLE: 50,
    PEAR: 50,
    ORANGE: 80,
    MELON: 100,
    BANANA: 80,
    CARROT: 50,
    FOOD_RATION: 800,
    TRIPE_RATION: 200,
    LEMBAS_WAFER: 800,
    CRAM_RATION: 600,
    K_RATION: 400,
    C_RATION: 300,
    EGG: 80,
    CLOVE_OF_GARLIC: 40,
    SPRIG_OF_WOLFSBANE: 40,
    EUCALYPTUS_LEAF: 1,
    CANDY_BAR: 100,
    CREAM_PIE: 100,
    PANCAKE: 200,
    SLIME_MOLD: 250,
    LUMP_OF_ROYAL_JELLY: 200,
};

/**
 * C ref: trap.c unconscious — multi < 0 and (usleep or wake-msg prefixes).
 */
function unconscious() {
    if ((game.multi || 0) >= 0) return false;
    const u = game.u || {};
    if (u.usleep) return true;
    const msg = game.nomovemsg || '';
    return msg.startsWith('You awake')
        || msg.startsWith('You regain con')
        || msg.startsWith('You are consci');
}

/**
 * C ref: youprop.h Unaware — multi < 0 && (unconscious || fainted).
 * Fainted (uhs == FAINTED) deferred as always-false until newuhs ports it.
 */
function Unaware() {
    return (game.multi || 0) < 0 && unconscious();
}

/**
 * C ref: eat.c gethungry — Unaware metabolic rn2(10) then accessorytime rn2(20).
 * Hunger side-effects beyond the rolls deferred (ring/amulet nutrition, faint).
 */
export function gethungry() {
    if (game.u?.uinvulnerable) return;

    // C: (!Unaware || !rn2(10)) && eats && !Slow_digestion → uhunger--
    // rn2(10) is evaluated whenever Unaware (|| short-circuit); food checks
    // after that are deferred — RNG order only needs the Unaware roll.
    if (Unaware()) {
        rn2(10);
        // uhunger-- when !rn2(10) && carnivorous/… deferred
    }
    // else non-Unaware: no rn2(10); ordinary uhunger-- deferred

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

/**
 * C ref: eat.c lesshungry — uhunger += num; choke/fullwarn/newuhs deferred.
 */
export function lesshungry(num) {
    if (!game.u) return;
    game.u.uhunger = (game.u.uhunger ?? 900) + (num | 0);
}

/**
 * C ref: eat.c obj_nutrition — FOOD uses objects[].oc_nutrition.
 */
function obj_nutrition(otmp) {
    if (!otmp) return 0;
    const oc = game.objects?.[otmp.otyp];
    if (oc?.oc_nutrition != null) return oc.oc_nutrition | 0;
    const name = objectNames[otmp.otyp];
    return FOOD_NUTRITION[name] ?? 0;
}

/** C ref: eat.c nonrotting_food */
function nonrotting_food(otyp) {
    return otyp === LEMBAS_WAFER || otyp === CRAM_RATION;
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
 * C ref: eat.c touchfood — split stack (next_ident via splitobj), set oeaten.
 * freeinv + addinv_nomerge deferred: invent-array split leaves parent reduced
 * and child OBJ_FREE; done_eating useup does not need reinsertion for
 * reqtime-1 finish.
 */
function touchfood(otmp) {
    if ((otmp.quan || 1) > 1) {
        // C: floor → splitobj(otmp, quan-1); carried → otmp = splitobj(otmp, 1)
        // Inventory-only path here (floorfood floor deferred).
        const child = splitobj(otmp, 1);
        if (child) otmp = child;
    }
    if (!otmp.oeaten) {
        // costly_alteration deferred
        otmp.oeaten = obj_nutrition(otmp);
    }
    return otmp;
}

/**
 * C ref: eat.c fprefx — first-bite messages for non-rotten non-tin food.
 * Contest recorder is MACOS → APPLE "Macintosh!"; UNIX Core dumped deferred.
 * Returns false if eating should abort (egg explode etc. deferred → true).
 */
async function fprefx(otmp) {
    if (otmp.otyp === FOOD_RATION) {
        const hung = game.u?.uhunger ?? 900;
        if (hung <= 200) {
            await pline('This food really hits the spot!');
        } else if (hung < 700) {
            await pline('This satiates your stomach!');
        }
        return true;
    }
    if (otmp.otyp === TRIPE_RATION) {
        await pline('Yak - dog food!');
        return true;
    }
    // Contest C build defines MACOS (recorder on macOS).
    if (otmp.otyp === APPLE && !otmp.cursed) {
        await pline('Delicious!  Must be a Macintosh!');
        return true;
    }
    if (otmp.otyp === PEAR && !otmp.cursed) {
        await pline('Core dumped.');
        return true;
    }
    // default give_feedback
    const cursed = !!otmp.cursed;
    const bland = otmp.otyp === CRAM_RATION
        || otmp.otyp === K_RATION
        || otmp.otyp === C_RATION;
    const adj = cursed ? 'terrible!' : bland ? 'bland.' : 'delicious!';
    await pline(`This ${singular(otmp, xname)} is ${adj}`);
    return true;
}

/**
 * C ref: eat.c bite + done_eating subset for reqtime==1 (no occupation).
 * choke / fpostfx body / newuhs deferred beyond lesshungry.
 */
async function finish_reqtime1(otmp) {
    if (!game.context) game.context = {};
    const victual = game.context.victual || {};
    // C bite: nmod < 0 → lesshungry(adj_victual_nutrition())
    if ((victual.nmod | 0) < 0) {
        let nut = -(victual.nmod | 0);
        if (nut < 1) nut = 1;
        lesshungry(nut);
    } else if ((victual.nmod | 0) > 0) {
        lesshungry(1);
    }
    // fpostfx: FORTUNE_COOKIE rumor; other APPLE/etc. deferred
    if (otmp.otyp === FORTUNE_COOKIE) {
        await outrumor(bcsign(otmp), BY_COOKIE);
    }
    useup(otmp);
    game.context.victual = {};
}

/**
 * C ref: eat.c doeat() — food-class path for reqtime==1 (apple/cookie/…).
 * Multi-turn occupation, corpses, tins, rotten rn2(7), floorfood floor,
 * and non-food deferred.
 * @returns {number} 0 = no turn (ECMD_OK), 1 = took time
 */
export async function doeat() {
    const otmp0 = await getobj_eat();
    if (!otmp0) return 0;

    if (otmp0.oclass === COIN_CLASS && !is_edible(otmp0)) {
        await pline('You cannot eat gold.');
        return 0;
    }
    if (!is_edible(otmp0)) {
        await pline('You cannot eat that!');
        return 0;
    }

    if (otmp0.oclass !== FOOD_CLASS) {
        // doeat_nonfood deferred
        await pline('That food is not implemented yet.');
        return 0;
    }

    // TIN / CORPSE / globby deferred
    const name = objectNames[otmp0.otyp];
    if (name === 'TIN' || name === 'CORPSE' || otmp0.globby) {
        await pline('That food is not implemented yet.');
        return 0;
    }

    // KMH, conduct
    if (!game.u.uconduct) game.u.uconduct = {};
    game.u.uconduct.food = (game.u.uconduct.food | 0) + 1;

    const already_partly_eaten = !!otmp0.oeaten;
    let otmp = touchfood(otmp0);
    if (!otmp) return 1;

    if (!game.context) game.context = {};
    game.context.victual = {
        piece: otmp,
        o_id: otmp.o_id,
        usedtime: 0,
        eating: 0,
        canchoke: 0,
        fullwarn: 0,
        doreset: 0,
        reqtime: 0,
        nmod: 0,
    };

    const oc = game.objects?.[otmp.otyp];
    let dont_start = false;
    game.context.victual.reqtime = oc?.oc_delay ?? 1;

    // C: rotten check — FORTUNE_COOKIE skipped; nonrotting_food skips age gate
    const moves = game.moves ?? 0;
    const age = otmp.age ?? moves;
    if (otmp.otyp !== FORTUNE_COOKIE
        && (otmp.cursed
            || (!nonrotting_food(otmp.otyp)
                && (moves - age) > (otmp.blessed ? 50 : 30)
                && (otmp.orotten || !rn2(7))))) {
        // rottenfood / consume_oeaten deferred — refuse rather than invent
        await pline('That food is not implemented yet.');
        game.context.victual = {};
        return 0;
    }
    if (!already_partly_eaten) {
        if (!(await fprefx(otmp))) {
            game.context.victual = {};
            return 1;
        }
    } else {
        const req = game.context.victual.reqtime;
        await pline(
            `You ${req === 1 ? 'eat' : 'begin eating'} ${doname(otmp)}.`,
        );
    }

    const basenutrit = obj_nutrition(otmp) | 0;
    const oeaten = otmp.oeaten | 0;
    // C: rounddiv(reqtime * oeaten, basenutrit)
    if (basenutrit === 0) {
        game.context.victual.reqtime = 0;
    } else {
        game.context.victual.reqtime = Math.trunc(
            (game.context.victual.reqtime * oeaten) / basenutrit,
        );
    }
    const reqtime = game.context.victual.reqtime | 0;
    if (reqtime === 0 || oeaten === 0) {
        game.context.victual.nmod = 0;
    } else if (oeaten >= reqtime) {
        game.context.victual.nmod = -Math.trunc(oeaten / reqtime);
    } else {
        game.context.victual.nmod = reqtime % oeaten;
    }
    game.context.victual.canchoke = 0; // u.uhs == SATIATED deferred

    // Multi-turn occupation deferred
    if (dont_start) {
        otmp.owt = weight(otmp);
        return 1;
    }
    if (reqtime > 1) {
        await pline('That food is not implemented yet.');
        game.context.victual = {};
        return 0;
    }

    // start_eating for reqtime <= 1: first bite finishes immediately
    game.context.victual.eating = 1;
    game.context.victual.usedtime = 1;
    await finish_reqtime1(otmp);
    return 1;
}
