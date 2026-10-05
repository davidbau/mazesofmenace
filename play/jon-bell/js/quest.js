// @ts-nocheck
// quest.js — Quest functions.
// C ref: quest.c
//
// WIRE_PENDING: port-gen-quest_stat_check-001

import { game } from './gstate.js';
import { monnear as monnear_real } from './makemon.js';

// C mon.c:2461 monnear — use the canonical predicate, including the
// grid-bug diagonal exception.
function monnear(mon, x, y) { return monnear_real(mon, x, y); }

// C monst.h:249 helpless(mon) — msleeping || !mcanmove
function _helpless(mtmp) {
    return !!(mtmp.msleeping | 0) || !(mtmp.mcanmove | 0);
}

// C quest.c:513-518 quest_stat_check(mtmp)
// Checks if the monster is the nemesis and if so, sets the quest in_battle flag
// based on whether the nemesis is helpless and nearby.
export function quest_stat_check(mtmp) {
    // C: if (mtmp->data->msound == MS_NEMESIS)  — plain deref, no guard
    if (mtmp.data.msound === 37) { // MS_NEMESIS = 37
        // C: Qstat(in_battle) = (!helpless(mtmp) && monnear(mtmp, u.ux, u.uy));
        //    where Qstat(x) == svq.quest_status.x  (single faithful path, no fallback)
        const is_helpless = _helpless(mtmp);
        const is_near = monnear(mtmp, game.u.ux, game.u.uy);
        game.svq.quest_status.in_battle = (!is_helpless && is_near) ? 1 : 0;
    }
}
