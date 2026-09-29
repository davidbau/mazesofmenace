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

/* C ref: hacklib.c:343-359 s_suffix(const char *s) — a name converted to
 * possessive.  FOUR arms, in this order:
 *     Strcpy(buf, s);
 *     if (!strcmpi(buf, "it"))          Strcat(buf, "s");    // it  -> its
 *     else if (!strcmpi(buf, "you"))    Strcat(buf, "r");    // you -> your
 *     else if (*(eos(buf) - 1) == 's')  Strcat(buf, "'");    // Xs  -> Xs'
 *     else                              Strcat(buf, "'s");   // X   -> X's
 * strcmpi is CASE-INSENSITIVE, so "It"/"IT"/"You"/"YOU" take the first two
 * arms too.  RNG-free; pure string formatting.
 *
 * THE ONE BODY.  C has 165 call sites for this five-line helper and js/ had
 * grown EIGHT hand-derived copies of it, four of which carried only the last
 * arm (`s + "'s"`), so every subject already ending in 's printed the doubled
 * form: MEASURED on a C-recorded probe (tools/migration/record-v5.sh seed
 * 777001, apply.c:1683 use_lamp's candle arm) C's topline is "Your candles'
 * flames burn brightly!" where this port printed "Your candles's flames burn
 * brightly!".  The copies lived in js/mhitm.js, js/mhitu.js (twice, as
 * s_suffix and s_suffix_mu), js/uhitm.js, js/shk.js (s_suffix_shk),
 * js/steal.js, js/questpgr.js (_s_suffix) and js/wizcmds.js (_ta_s_suffix);
 * they all import this now.  hacklib.js is the right home precisely because it
 * is a leaf — it imports gstate.js and nothing else, so every one of those
 * modules can reach it without adding a cycle. */
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
