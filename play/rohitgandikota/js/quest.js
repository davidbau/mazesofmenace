// quest.js — quest progress events.
// C ref: src/quest.c
//
// Only the arrival half is here so far: onquest() and the three per-level
// handlers goto_level dispatches through. Each delivered message is a
// qt_pager() call, and every com_pager_core run costs the nhlib.lua align
// shuffle (rn2(3), rn2(2)) for its fresh Lua state, so a skipped handler is
// two calls short before the text ever shows.

import { game } from './gstate.js';
import { qt_pager } from './questpgr.js';

/* include/quest.h:8 struct q_score — zero-initialized at game start */
function Qstat() {
    return (game.quest_status ||= {});
}

/* include/dungeon.h:129 Lcheck() via on_level() */
const on_level = (a, b) => !!a && !!b && a.dnum === b.dnum
                           && a.dlevel === b.dlevel;

// src/quest.c:25 on_start()
async function on_start() {
    const q = Qstat();
    if (!q.first_start) {
        await qt_pager('firsttime');
        q.first_start = true;
    } else if ((game.u.uz0.dnum !== game.u.uz.dnum)
               || (game.u.uz0.dlevel < game.u.uz.dlevel)) {
        if ((q.not_ready ?? 0) <= 2)
            await qt_pager('nexttime');
        else
            await qt_pager('othertime');
    }
}

// src/quest.c:39 on_locate()
async function on_locate() {
    const q = Qstat();
    /* the locate messages are phrased in a manner such that they only
       make sense when arriving on the level from above */
    const from_above = (game.u.uz0.dlevel < game.u.uz.dlevel);

    if (q.killed_nemesis) {
        return;
    } else if (!q.first_locate) {
        if (from_above)
            await qt_pager('locate_first');
        q.first_locate = true;
    } else {
        if (from_above)
            await qt_pager('locate_next');
    }
}

// src/quest.c:61 on_goal()
async function on_goal() {
    const q = Qstat();
    if (q.killed_nemesis) {
        return;
    } else if (!q.made_goal) {
        await qt_pager('goal_first');
        q.made_goal = 1;
    } else {
        /* the return visit needs find_quest_artifact() over the floor,
           minvent and buried chains to pick goal_next vs goal_alt */
        (game.unported ||= new Set()).add('quest:on_goal:find_quest_artifact');
        await qt_pager('goal_next');
        if (q.made_goal < 7)
            q.made_goal++;
    }
}

// src/quest.c:90 onquest() — dispatched from goto_level's arrival tail.
// Not_firsttime is on_level(&u.uz0, &u.uz): u.uz0 still holds the level the
// hero left, until goto_level's tail resets it.
export async function onquest() {
    const { Is_special } = await import('./dungeon.js');

    if (game.u.uevent?.qcompleted || on_level(game.u.uz0, game.u.uz))
        return;
    if (!Is_special(game.u.uz))
        return;

    const sl = game.special_levels || {};
    if (on_level(game.u.uz, sl.qstart_level))
        await on_start();
    else if (on_level(game.u.uz, sl.qlocate_level))
        await on_locate();
    else if (on_level(game.u.uz, sl.nemesis_level))
        await on_goal();
}
