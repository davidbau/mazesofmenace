// livelog.js — C do.c goto_level "entered %s" + record.c livelog_printf metadata (contest: no file I/O).
// C ref: do.c goto_level (after **`new`** from **`mklev`**) — **`describe_level(dloc, 2)`**; **`livelog_printf(major ? LL_ACHIEVE : LL_DEBUG, "entered %s", dloc)`**.
//        record.c **`livelog_printf`** — contest: ring on **`gd.livelog_recent`** (no **`LIVELOGFILE`** write).

import { LL_ACHIEVE, LL_DEBUG } from './const.js';
import { In_endgame, In_quest, Is_astralevel } from './const.js';
import { describeLevelLivelogEnteredBufLikeC } from './describe_level.js';

/** Max retained **`gd.livelog_recent`** rows per session (bounded memory). */
const LIVELOG_RECENT_CAP = 128;

/**
 * C **`record.c`** **`livelog_printf`**-style **`%s`** expansion (single-pass; no **`%d`** / locale).
 * @param {string} fmt
 * @param {string[]} args
 */
export function formatLivelogTemplateLikeC(fmt, args) {
    const f = String(fmt);
    const a = args.map((x) => (x == null ? '' : String(x)));
    let ai = 0;
    let out = '';
    for (let p = 0; p < f.length; ) {
        if (f.charCodeAt(p) === 37 && f.charCodeAt(p + 1) === 115) {
            /* `%s` */
            out += a[ai++] ?? '';
            p += 2;
        } else {
            out += f[p++];
        }
    }
    return out;
}

/**
 * C: **`record.c`** **`livelog_printf(flags, fmt, …)`** — no VFS in contest; append to **`g.gd.livelog_recent`**.
 * Does not **`pline`**, RNG, or terminal I/O.
 * @param {import('./gstate.js').game} g
 * @param {number} flags — C first arg (**`LL_*`**).
 * @param {string} fmt
 * @param {...string} [args] — only **`%s`** in **`fmt`** is expanded ( **`entered %s`** path).
 * @returns {string} formatted line (same string C would have written minus file prefix).
 */
export function livelogPrintfLikeC(g, flags, fmt, ...args) {
    g.gd = g.gd || {};
    const line = formatLivelogTemplateLikeC(fmt, args);
    const rec = {
        flags: flags | 0,
        template: String(fmt),
        args: args.map((x) => (x == null ? '' : String(x))),
        line,
    };
    const arr = g.gd.livelog_recent ?? (g.gd.livelog_recent = []);
    arr.push(rec);
    if (arr.length > LIVELOG_RECENT_CAP)
        arr.splice(0, arr.length - LIVELOG_RECENT_CAP);
    return line;
}

/**
 * C: **`do.c`** **`goto_level`** — **`major`** for **`livelog_printf`** first arg; **`dloc`** from **`describe_level(..., 2)`**.
 * Pure return value; **`maybeRecordEnteredNewLevelLivelogLikeC`** stores **`g.context.lastEnteredLevelLivelog`** on first visit per **`(dnum,dlevel)`** after **`mklev`**.
 * @param {import('./gstate.js').game} g
 * @returns {{ flags: number, dloc: string, template: string } | null}
 */
export function enteredNewLevelLivelogMetaLikeC(g) {
    const uz = g?.u?.uz;
    if (!uz) return null;
    const major = (In_endgame(uz) && !Is_astralevel(uz)) || In_quest(uz);
    return {
        flags: major ? LL_ACHIEVE : LL_DEBUG,
        dloc: describeLevelLivelogEnteredBufLikeC(g),
        template: 'entered %s',
    };
}

/** C: **`d_level`** key for visit set (**`ledger_no`** parity stub). */
export function heroLevelVisitKeyLikeC(uz) {
    if (!uz) return '';
    return `${uz.dnum | 0}:${uz.dlevel | 0}`;
}

/**
 * C: **`do.c`** **`goto_level`** — **`if (new)`** after **`mklev`** when the level was first materialized (**`!LFILE_EXISTS`**).
 * JS: at most one **`entered`** livelog meta per **`(dnum,dlevel)`** per session, only after **`mklev()`** returned true.
 * Sets **`g.context.lastEnteredLevelLivelog`** and calls **`livelogPrintfLikeC`** (**`LIVELOGFILE`** / recorder file still omitted).
 * @param {import('./gstate.js').game} g
 * @returns {boolean} true if this was the first visit and meta was stored.
 */
export function maybeRecordEnteredNewLevelLivelogLikeC(g) {
    const uz = g?.u?.uz;
    if (!uz) return false;
    g.gd = g.gd || {};
    const key = heroLevelVisitKeyLikeC(uz);
    const visits = g.gd.hero_level_visits ?? (g.gd.hero_level_visits = Object.create(null));
    if (visits[key]) return false;
    visits[key] = true;
    g.context = g.context || {};
    const meta = enteredNewLevelLivelogMetaLikeC(g);
    if (meta) {
        g.context.lastEnteredLevelLivelog = meta;
        livelogPrintfLikeC(g, meta.flags, meta.template, meta.dloc);
    }
    return !!meta;
}
