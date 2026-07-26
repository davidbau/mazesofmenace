// dogmove.js — pet movement and the eating bookkeeping that goes with it.
// C ref: src/dogmove.c
//
// The file exists now but holds only what has been ported. dog_move itself
// (the pet's per-turn decision, src/dogmove.c around line 1150) is NOT here,
// and it is the first divergence for 7 of the 44 public sessions -- the
// single largest blocker in the port. See docs/plan/STATUS.md for its shape
// and the traps in it (the reservoir sampler at dogmove.c:1255 uses a
// PRE-increment, rn2(++chcnt)).

import { game } from './gstate.js';
import { M_AP_TYPE, M_AP_NOTHING } from './const.js';
import { newsym } from './display.js';
import { MONSYMS } from './monst_data.js';

// src/dogmove.c:1448 finish_meating() — the monster stops eating.
//
// Not just a flag clear. A monster that was eating a MIMIC has taken on the
// mimic's appearance, and that appearance has to be reset and the square
// redrawn, or the pet keeps rendering as whatever it was chewing on.
//
// The mlet test excludes real mimics: an actual mimic that stops eating keeps
// its disguise, because the disguise is what it is rather than what it ate.
export function finish_meating(mtmp) {
    mtmp.meating = 0;
    if (M_AP_TYPE(mtmp) !== M_AP_NOTHING
        && game.mons[mtmp.mnum].mlet !== MONSYMS.S_MIMIC) {
        /* was eating a mimic and now appearance needs resetting */
        mtmp.m_ap_type = M_AP_NOTHING;
        mtmp.mappearance = 0;
        newsym(mtmp.mx, mtmp.my);
    }
}
