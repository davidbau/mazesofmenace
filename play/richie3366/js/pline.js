// pline.js — chronicle / livelog helpers (message pline lives in display.js).
// C ref: pline.c gamelog_add / livelog_printf (CHRONICLE on).

import { game } from './gstate.js';
import { BUFSZ } from './const.js';
import { strNsubst } from './hacklib.js';

/**
 * C ref: pline.c gamelog_add — append to gg.gamelog linked list (JS array).
 * The file append lives in livelog_add below.
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
 * C ref: files.c livelog_add `:3666–3706` (LIVELOG, NHL_SANDBOX).
 * `!(ll_type & sysopt.livelog)` returns (`:3673`). sys.c:63 sets
 * `sysopt.livelog` to LL_NONE, so a missing mask is that zero.
 * Named omission: lock_file / fopen_datafile(LIVELOGFILE) / fprintf /
 * fclose / unlock_file (`:3676–3704`) — a host-file append, Rule #2.
 * @param {number} ll_type
 * @param {string} str buffer after strNsubst; consumed only by the file arm
 */
export function livelog_add(ll_type, str) {
    const mask = game.sysopt?.livelog | 0;
    if (!((ll_type | 0) & mask)) return;
    // files.c:3676 would append `str` to LIVELOGFILE. Named omission.
    return str;
}

/**
 * C ref: pline.c livelog_printf `:514–526` (CHRONICLE).
 * vsnprintf into `BUFSZ * 2`, gamelog_add(moves) with that text,
 * then strNsubst tabs to `_` (`n == 0`), then livelog_add.
 * %s / %d / %ld stay the previous substitution; %c and %lu are the
 * other specifiers the C call sites use.
 */
export function livelog_printf(ll_type, line, ...the_args) {
    let i = 0;
    let gamelogbuf = String(line ?? '').replace(/%(?:lu|ld|d|c|s)/g, (spec) => {
        const a = the_args[i++];
        if (spec === '%c') {
            if (typeof a === 'string') return a.slice(0, 1);
            return String.fromCharCode((Number(a) | 0) & 0xff);
        }
        if (spec === '%lu') return String(Number(a) >>> 0);
        return String(a ?? '');
    });
    const cap = BUFSZ * 2 - 1;
    if (gamelogbuf.length > cap) gamelogbuf = gamelogbuf.slice(0, cap);
    gamelog_add(ll_type | 0, game.moves | 0, gamelogbuf);
    gamelogbuf = strNsubst(gamelogbuf, '\t', '_', 0);
    livelog_add(ll_type | 0, gamelogbuf);
}
