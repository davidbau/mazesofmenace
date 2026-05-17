// dig_occupation.js — Hero digging occupation (dig.c is_digging, allmain.c stop_occupation subset).
// C ref: dig.c is_digging() (**`go.occupation == dig`**); allmain.c stop_occupation() (**`nomul(0)`**, **`end_running`**, pline);
//        watch_dig() tail when **`is_digging()`**.
//
// JS uses **`g.context.digging.occupying`** until **`go.occupation`** function pointers exist.

import { nomul, endRunning } from './timeout.js';
import { pline } from './display.js';

/**
 * C: **`svc.context.digging`** — **`warned`** (**`watch_dig`**) + **`occupying`** (**`is_digging`** stand-in).
 * @param {import('./gstate.js').game} g
 */
export function ensureContextDiggingLikeC(g) {
    if (!g.context) g.context = {};
    const d = g.context.digging;
    if (!d) {
        g.context.digging = { warned: false, occupying: false };
        return g.context.digging;
    }
    if (d.warned === undefined) d.warned = false;
    if (d.occupying === undefined) d.occupying = false;
    return g.context.digging;
}

/**
 * C: dig.c **`is_digging(void)`** — **`go.occupation == dig`**.
 * @param {import('./gstate.js').game} g
 * @returns {boolean}
 */
export function isDiggingHeroLikeC(g) {
    return !!(ensureContextDiggingLikeC(g).occupying);
}

/**
 * C: set **`go.occupation`** / **`set_occupation(dig, …)`** — only **`occupying`** flag in this fork.
 * @param {import('./gstate.js').game} g
 * @param {boolean} on
 */
export function setHeroDiggingOccupationLikeC(g, on) {
    ensureContextDiggingLikeC(g).occupying = !!on;
}

/**
 * C: allmain.c **`stop_occupation`** when **`is_digging()`** — **`nomul(0)`**, **`end_running`**, **`You("stop %s.", occtxt)`** (**`digging`**).
 * Omits **`maybe_finished_meal`**, **`cmdq_clear`**, **`disp.botl`**.
 * @param {import('./gstate.js').game} g
 */
export async function stopOccupationIfDiggingHeroLikeC(g) {
    if (!isDiggingHeroLikeC(g)) return;
    setHeroDiggingOccupationLikeC(g, false);
    nomul(0);
    endRunning(true);
    await pline('You stop digging.');
}
