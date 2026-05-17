// hunger.js — Hero hunger state, eat.c newuhs (subset), UI / enlightenment.
// C ref: hack.h (hunger_state_types), eat.c newuhs, hu_stat, cmd.c enlightenment.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { A_CON, A_MAX, A_STR } from './const.js';
import { acurr } from './attrib.js';
import { endRunning, nomul } from './timeout.js';

/** C: hunger_state_types (hack.h) */
export const UHS = {
    SATIATED: 0,
    NOT_HUNGRY: 1,
    HUNGRY: 2,
    WEAK: 3,
    FAINTING: 4,
    FAINTED: 5,
    STARVED: 6,
};

/**
 * C: eat.c newuhs — map u.uhunger to threshold band (same thresholds as newhs).
 * @param {number} uh
 * @returns {number} UHS.*
 */
export function uhsFromUhunger(uh) {
    const h = uh | 0;
    if (h > 1000) return UHS.SATIATED;
    if (h > 150) return UHS.NOT_HUNGRY;
    if (h > 50) return UHS.HUNGRY;
    if (h > 0) return UHS.WEAK;
    return UHS.FAINTING;
}

/** C: eat.c is_fainted(void) */
function isFainted(u) {
    return (u.uhs | 0) === UHS.FAINTED;
}

function ensureAtemp(u) {
    u.atemp = u.atemp || { a: [] };
    const a = u.atemp.a;
    while (a.length < A_MAX) a.push(0);
}

/**
 * C: eat.c newuhs(boolean incr) — hunger band messages, faint rn2/nomul, starvation.
 * Eatfood / force_save_hs / lifesave / selftouch / done() are partial or TODO.
 * @param {boolean} incr — TRUE after time passes (gethungry); FALSE from lesshungry paths (not wired).
 * @returns {string[]} pline lines in C order (caller awaits display.pline).
 */
export function collectNewuhsPlines(incr) {
    const g = game;
    const u = g.u;
    if (!u || typeof u.uhunger !== 'number') return [];

    const h = u.uhunger | 0;
    let newhs = uhsFromUhunger(h);
    const plines = [];
    const prevUhs = u.uhs | 0;

    /* C: occupation == eatfood || force_save_hs — victual deferral (not ported). */

    if (newhs === UHS.FAINTING) {
        const uhungerDivBy10 = (Math.sign(h) * (((Math.abs(h) + 5) / 10) | 0)) | 0;
        if (isFainted(u)) newhs = UHS.FAINTED;

        const faintGate = (prevUhs <= UHS.WEAK) || rn2(20 - uhungerDivBy10) >= 19;
        if (faintGate) {
            if (!isFainted(u) && (g.multi | 0) >= 0) {
                const duration = 10 - uhungerDivBy10;
                g.occupation = 0;
                plines.push('You faint from lack of food.');
                u.timed = u.timed || { blind: 0, deaf: 0 };
                u.timed.deaf = (u.timed.deaf | 0) + duration;
                nomul(-duration);
                g.multi_reason = 'fainted from lack of food';
                g.nomovemsg = 'You regain consciousness.';
                newhs = UHS.FAINTED;
                if (!(u.Levitation | 0)) {
                    /* C: selftouch("Falling, you") — trap.c / hurtle RNG; TODO */
                }
            }
        } else if (h < -(100 + 10 * (acurr(A_CON) | 0))) {
            u.uhs = UHS.STARVED;
            plines.push('You die from starvation.');
            g.program_state = g.program_state || {};
            g.program_state.gameover = true;
            return plines;
        }
    }

    if (newhs !== prevUhs) {
        if (newhs >= UHS.WEAK && prevUhs < UHS.WEAK) {
            ensureAtemp(u);
            u.atemp.a[A_STR] = -1;
        } else if (newhs < UHS.WEAK && prevUhs >= UHS.WEAK) {
            ensureAtemp(u);
            u.atemp.a[A_STR] = 0;
        }

        switch (newhs) {
            case UHS.HUNGRY: {
                if (u.Hallucination) {
                    plines.push(incr ? 'You are getting the munchies.' : 'You now have a lesser case of the munchies.');
                } else if (!incr) {
                    plines.push('You only feel hungry now.');
                } else if (h < 145) {
                    plines.push('You feel hungry.');
                } else {
                    plines.push('You are beginning to feel hungry.');
                }
                if (incr && g.occupation) g.occupation = 0;
                endRunning(true);
                break;
            }
            case UHS.WEAK: {
                if (u.Hallucination) {
                    plines.push(incr ? 'The munchies are interfering with your motor capabilities.' : 'You still have the munchies.');
                } else if (incr && (g.urole?.abbr === 'Wiz' || g.urole?.abbr === 'Val' || g.urace?.name === 'elf')) {
                    const who =
                        g.urole?.abbr === 'Wiz' || g.urole?.abbr === 'Val'
                            ? g.urole?.name?.m || 'Hero'
                            : 'Elf';
                    plines.push(`${who} needs food, badly!`);
                } else if (!incr) {
                    plines.push('You are still weak.');
                } else if (h < 45) {
                    plines.push('You feel weak.');
                } else {
                    plines.push('You are beginning to feel weak.');
                }
                if (incr && g.occupation) g.occupation = 0;
                endRunning(true);
                break;
            }
            default:
                break;
        }
        u.uhs = newhs;

        const hp = u.Upolyd ? u.mh | 0 : u.uhp | 0;
        if (hp < 1) {
            plines.push('You die from hunger and exhaustion.');
            g.program_state = g.program_state || {};
            g.program_state.gameover = true;
        }
    }

    return plines;
}

/** @param {number | undefined} uhs */
export function enlightHungerLine(uhs) {
    const h = uhs ?? UHS.NOT_HUNGRY;
    switch (h) {
        case UHS.SATIATED:
            return '  You are satiated.';
        case UHS.NOT_HUNGRY:
            return "  You aren't hungry.";
        case UHS.HUNGRY:
            return '  You are hungry.';
        case UHS.WEAK:
            return '  You are weak from hunger.';
        case UHS.FAINTING:
            return '  You are faint from lack of food.';
        case UHS.FAINTED:
            return '  You have fainted from lack of food.';
        case UHS.STARVED:
            return '  You are starving.';
        default:
            return "  You aren't hungry.";
    }
}
