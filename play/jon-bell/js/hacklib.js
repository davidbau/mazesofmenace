// @ts-nocheck
// hacklib.js — Utility functions.
// C ref: hacklib.c, dungeon.c helpers
import { game } from './gstate.js';
export function isok(x, y) {
    const { COLNO, ROWNO } = await_const();
    /* mirror nethack-c/src/cmd.c:5004 — returns int, not boolean */
    return (x >= 1 && x <= COLNO - 1 && y >= 0 && y <= ROWNO - 1) ? 1 : 0;
}
// Lazy import to avoid circular deps
let _const = null;
function await_const() {
    if (!_const)
        _const = { COLNO: 80, ROWNO: 21 };
    return _const;
}
export function distmin(x1, y1, x2, y2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(y1 - y2));
}
export function dist2(x1, y1, x2, y2) {
    return (x1 - x2) * (x1 - x2) + (y1 - y2) * (y1 - y2);
}
export function depth(uz) {
    const dnum = uz?.dnum ?? 0;
    const dlevel = uz?.dlevel ?? 1;
    const dungeon = game?.dungeons?.[dnum];
    if (!dungeon)
        return dlevel;
    // C returns schar, including its signed-byte conversion.
    return ((dungeon.depth_start + dlevel - 1) << 24) >> 24;
}
/* C dungeon.c:1339 deepest_lev_reached. init_dungeon initializes the reach
 * record; goto_level updates it, including the minimum for upward branches.
 * Saved-level existence and the current location are not reach records. */
export function deepest_lev_reached(noquest) {
    const tmp = { dnum: 0, dlevel: 0 };
    let ret = 0;
    for (let i = 0; i < game._n_dgns; i++) {
        if (noquest && i === game.quest_dnum)
            continue;
        tmp.dlevel = game.dungeons[i].dunlev_ureached;
        if (tmp.dlevel === 0)
            continue;
        tmp.dnum = i;
        if (depth(tmp) > ret)
            ret = depth(tmp);
    }
    return ret;
}
// C ref: rn2(x) already in rng.js — re-export not needed

export function s_suffix(s) {
    const buf = String(s ?? '');
    if (buf.toLowerCase() === 'it')
        return buf + 's';
    if (buf.toLowerCase() === 'you')
        return buf + 'r';
    if (buf.length && buf[buf.length - 1] === 's')
        return buf + "'";
    return buf + "'s";
}
