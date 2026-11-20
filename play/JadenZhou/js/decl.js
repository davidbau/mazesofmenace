// decl.js — global variable initialization.
// C ref: decl.c decl_globals_init()
//
// C keeps most game state in zero-initialized globals (the g?/sv? instance
// structs). JS keeps it on the `game` object; this creates the pieces that
// ported code relies on before anything sets them.

import { game } from './gstate.js';
import { rfilter_init } from './role.js';

// C ref: decl.c decl_globals_init() (partial)
export function decl_globals_init() {
    const g = game;

    /* gr.rfilter: role/race/gender/alignment filters (all clear) */
    rfilter_init();
    /* gy.youmonst: the hero as a monster (zeroed struct monst) */
    g.youmonst = { data: null, mnum: 0, m_id: 0, cham: 0, movement: 0 };
    /* hero's equipment pointers (uwep, uarm, ...) start out null */
    g.uwep = g.uarm = g.uarmg = g.uarmh = null;
    /* gm.multi: count of turns the hero is busy (0 = free) */
    g.multi = 0;
    /* svq.quest_status */
    g.quest_status = {};
}
