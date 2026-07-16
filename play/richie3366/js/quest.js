// quest.js — quest branch arrival hooks.
// C ref: quest.c onquest / on_start / on_locate / on_goal.
// Named omissions: locate/goal messages; nexttime/othertime; chat paths.

import { game } from './gstate.js';
import { In_quest } from './const.js';
import { qt_pager } from './questpgr.js';

/** C ref: dungeon.c on_level */
function on_level(a, b) {
    return !!a && !!b
        && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
}

/** C ref: dungeon.c Is_special — match in sp_levchn. */
function Is_special(lev) {
    for (const s of game.sp_levchn || []) {
        if (on_level(lev, s.dlevel)) return s;
    }
    return null;
}

/** C ref: quest.h / dungeon.c Is_qstart */
function Is_qstart(lev) {
    return on_level(lev, game.qstart_level);
}

/** C ref: quest.h / dungeon.c Is_qlocate */
function Is_qlocate(lev) {
    return on_level(lev, game.qlocate_level);
}

/** C ref: quest.h / dungeon.c Is_nemesis (goal) */
function Is_nemesis(lev) {
    return on_level(lev, game.nemesis_level);
}

/**
 * C ref: quest.c on_start — firsttime qt_pager + first_start.
 * nexttime/othertime when re-entering deferred.
 */
async function on_start() {
    const qs = game.quest_status || (game.quest_status = {});
    if (!qs.first_start) {
        await qt_pager('firsttime');
        qs.first_start = true;
    }
    // C: else if dnum/dlevel change → nexttime/othertime deferred
}

/**
 * C ref: quest.c onquest — special quest level arrival messages.
 * Not_firsttime = on_level(uz0, uz); skipped when staying on same level.
 */
export async function onquest() {
    const u = game.u;
    if (!u?.uz) return;
    if (u.uevent?.qcompleted) return;
    // C: #define Not_firsttime (on_level(&u.uz0, &u.uz))
    if (on_level(u.uz0, u.uz)) return;
    if (!In_quest(u.uz)) return;
    if (!Is_special(u.uz)) return;

    if (Is_qstart(u.uz)) await on_start();
    else if (Is_qlocate(u.uz)) {
        // on_locate deferred (C-JS-MAP)
    } else if (Is_nemesis(u.uz)) {
        // on_goal deferred (C-JS-MAP)
    }
}
