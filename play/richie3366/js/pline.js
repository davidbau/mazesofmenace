// pline.js — chronicle / livelog helpers (message pline lives in display.js).
// C ref: pline.c gamelog_add / livelog_printf (CHRONICLE on).

import { game } from './gstate.js';

/**
 * C ref: pline.c gamelog_add — append to gg.gamelog linked list (JS array).
 * livelog_add file write deferred (not session-observable).
 */
export function gamelog_add(glflags, gltime, str) {
    if (!game.gamelog) game.gamelog = [];
    game.gamelog.push({
        turn: gltime | 0,
        flags: glflags | 0,
        text: String(str ?? ''),
    });
}

/**
 * C ref: pline.c livelog_printf — format + gamelog_add(moves) + livelog_add.
 * File livelog deferred; chronicle list is the scored path.
 */
export function livelog_printf(ll_type, fmt, ...args) {
    let i = 0;
    // C vsnprintf %s / %d / %ld; file livelog_add still deferred.
    const msg = String(fmt).replace(/%(?:ld|d|s)/g, () => String(args[i++] ?? ''));
    gamelog_add(ll_type, game.moves | 0, msg);
}
