// Port of the botl.c windowport-notify path: the whole C function
// evaluate_and_notify_windowport (botl.c:1621-1680) plus its static callee
// eval_notify_windowport_field (botl.c:1492-1618) and the pure static
// helpers that callee needs, all in C order with C line cites.
//
// C build notes: STATUS_HILITES is compiled in (config.h:616), so the
// `#ifdef STATUS_HILITES` arms below are live C, not dead config. The
// windowport itself (`status_update` == `*windowprocs.win_status_update`,
// winprocs.h:186; caps WC2_RESET_STATUS/WC2_FLUSH_STATUS, winprocs.h:246/248)
// has no JS registry yet, so per-field/RESET/FLUSH delivery is a named
// omission (loud forwarder, never silent). Likewise the hilite-rule engine
// (get_hilite botl.c:2364, hilite_reset_needed botl.c:2257) is named, not
// stubbed: its result only feeds status_update, so nothing observable is
// dropped while it is unwired.
//
// Caller: C bot() (botl.c:253) calls evaluate_and_notify_windowport at
// botl.c:1277 after filling gb.blstats. JS bot() (display.js:7148) renders
// via the direct tty path (_commitStatusLines) and never fills blstats, so
// the call is a NAMED OMISSION until a botl.c campaign ports the fill path.
// Do not call these from JS bot() today: with empty buffers every field
// compares equal and the windowport arms are unwired by design.

import { game } from './gstate.js';
import {
    MAXBLSTATS,
    BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN,
    BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX, BL_XP, BL_AC,
    BL_HD, BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX, BL_LEVELDESC,
    BL_EXP, BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS,
    BL_RESET, BL_FLUSH,
    WC2_RESET_STATUS, WC2_FLUSH_STATUS,
    ANY_INT, ANY_UINT, ANY_LONG, ANY_ULONG,
    ANY_IPTR, ANY_UPTR, ANY_LPTR, ANY_ULPTR,
    ANY_STR, ANY_MASK32,
    MAXVALWIDTH,
    Upolyd,
} from './const.js';
import { NO_COLOR } from './terminal.js';
import { newuexp } from './exper.js';

// C: sgn() (hacklib) — sign of an int comparison result.
function sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
}

// C `anything` is a union: every member aliases the same storage, so
// `a.a_void` (a pointer read of that storage) is nonzero iff any member
// holds nonzero bits. JS keeps the members side by side, so the two
// `a_void` reads below go through this overlay check instead of the field
// (which only whole-struct zeroing ever writes).
function unionNonzero(a) {
    return !!(a.a_int || a.a_uint || a.a_long || a.a_ulong
        || a.a_iptr || a.a_uptr || a.a_lptr || a.a_ulptr || a.a_void);
}

// C botl.h:282-300 (`struct istat_s`) + botl.c:684-692 (INIT_BLSTAT[P]).
// `anything` (union of int/uint/long/ulong + pointer-to-each) is a plain
// object; pointer arms hold a `{ v }` box or null (C NULL). `val` is a JS
// string (C fixed char buffer of `valwidth`; grows, never truncates — the
// tty truncation policy lives with the future windowport dispatch).
function zeroAnything() {
    return {
        a_void: 0,
        a_int: 0, a_uint: 0, a_long: 0, a_ulong: 0,
        a_iptr: null, a_uptr: null, a_lptr: null, a_ulptr: null,
    };
}

// C botl.c:684-692 — INIT_BLSTAT(name, fmt, anytyp, wid, fld):
// { name, fmt, 0L, FALSE, FALSE, 0, anytyp, {0}, {0}, NULL, wid, -1, fld }.
// C botl.c:703-737 (`initblstats[MAXBLSTATS]`), field order verbatim.
const initblstats = [
    { name: 'title', fmt: '%s', anytype: ANY_STR, width: MAXVALWIDTH, pct: false, idxmax: -1, fld: BL_TITLE }, // C :704
    { name: 'strength', fmt: ' St:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_STR }, // C :705
    { name: 'dexterity', fmt: ' Dx:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_DX }, // C :706
    { name: 'constitution', fmt: ' Co:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_CO }, // C :707
    { name: 'intelligence', fmt: ' In:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_IN }, // C :708
    { name: 'wisdom', fmt: ' Wi:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_WI }, // C :709
    { name: 'charisma', fmt: ' Ch:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_CH }, // C :710
    { name: 'alignment', fmt: ' %s', anytype: ANY_STR, width: 20, pct: false, idxmax: -1, fld: BL_ALIGN }, // C :711
    { name: 'score', fmt: ' S:%s', anytype: ANY_LONG, width: 30, pct: false, idxmax: -1, fld: BL_SCORE }, // C :712
    { name: 'carrying-capacity', fmt: ' %s', anytype: ANY_INT, width: 20, pct: false, idxmax: -1, fld: BL_CAP }, // C :713
    { name: 'gold', fmt: ' %s', anytype: ANY_LONG, width: 40, pct: false, idxmax: -1, fld: BL_GOLD }, // C :714
    // INIT_BLSTATP rows: percent_matters TRUE, idxmax set. C :715-717.
    { name: 'power', fmt: ' Pw:%s', anytype: ANY_INT, width: 10, pct: true, idxmax: BL_ENEMAX, fld: BL_ENE }, // C :715
    { name: 'power-max', fmt: '(%s)', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_ENEMAX }, // C :716
    { name: 'experience-level', fmt: ' Xp:%s', anytype: ANY_INT, width: 10, pct: true, idxmax: BL_EXP, fld: BL_XP }, // C :717
    { name: 'armor-class', fmt: ' AC:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_AC }, // C :718
    { name: 'HD', fmt: ' HD:%s', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_HD }, // C :719
    { name: 'time', fmt: ' T:%s', anytype: ANY_LONG, width: 30, pct: false, idxmax: -1, fld: BL_TIME }, // C :720
    // C :721 hunger note: ANY_UINT history abandoned, ANY_INT live.
    { name: 'hunger', fmt: ' %s', anytype: ANY_INT, width: 20, pct: false, idxmax: -1, fld: BL_HUNGER }, // C :722
    { name: 'hitpoints', fmt: ' HP:%s', anytype: ANY_INT, width: 10, pct: true, idxmax: BL_HPMAX, fld: BL_HP }, // C :723
    { name: 'hitpoints-max', fmt: '(%s)', anytype: ANY_INT, width: 10, pct: false, idxmax: -1, fld: BL_HPMAX }, // C :724
    { name: 'dungeon-level', fmt: '%s', anytype: ANY_STR, width: MAXVALWIDTH, pct: false, idxmax: -1, fld: BL_LEVELDESC }, // C :725
    { name: 'experience', fmt: '/%s', anytype: ANY_LONG, width: 30, pct: true, idxmax: BL_EXP, fld: BL_EXP }, // C :726
    { name: 'condition', fmt: '%s', anytype: ANY_MASK32, width: 0, pct: false, idxmax: -1, fld: BL_CONDITION }, // C :727
    { name: 'version', fmt: ' %s', anytype: ANY_STR, width: MAXVALWIDTH, pct: false, idxmax: -1, fld: BL_VERS }, // C :731
    { name: 'weapon', fmt: ' %s', anytype: ANY_STR, width: 20, pct: false, idxmax: -1, fld: BL_WEAPON }, // C :735
    { name: 'armor', fmt: ' %s', anytype: ANY_STR, width: 20, pct: false, idxmax: -1, fld: BL_ARMOR }, // C :736
    { name: 'terrain', fmt: ' %s', anytype: ANY_STR, width: 20, pct: false, idxmax: -1, fld: BL_TERRAIN }, // C :741
];

// C botl.c:1759-1788 — init_blstats(): copy initblstats into both idx
// buffers, zero the anything unions, alloc val buffers, keep hilite chains,
// refuse the second call (C impossible() logs and returns; the async pline
// machinery is unavailable in sync code, so the message is a named omit and
// the early return is kept — artifact.js:563 precedent).
let blstatsInitalready = false;

export function init_blstats() {
    if (blstatsInitalready) {
        // C :1765-1768 — impossible("init_blstats called more than once.").
        return;
    }
    if (!game.gb) game.gb = {};
    game.gb.blstats = [new Array(MAXBLSTATS), new Array(MAXBLSTATS)];
    for (let i = 0; i <= 1; ++i) {
        for (let j = 0; j < MAXBLSTATS; ++j) {
            const keep_thresholds = game.gb.blstats[i][j]?.thresholds ?? null; // C :1772 STATUS_HILITES keep
            const t = initblstats[j];
            game.gb.blstats[i][j] = {
                fldname: t.name, // C :1775 struct copy
                fldfmt: t.fmt,
                time: 0,
                chg: false,
                percent_matters: t.pct,
                percent_value: 0,
                anytype: t.anytype,
                a: zeroAnything(), // C :1776 cg.zeroany
                rawval: zeroAnything(),
                val: t.width ? '' : null, // C :1777-1781 alloc(valwidth)
                valwidth: t.width,
                idxmax: t.idxmax,
                fld: t.fld,
                hilite_rule: null,
                thresholds: keep_thresholds, // C :1784 restore
            };
        }
    }
    blstatsInitalready = true;
}

// C botl.c:1809-1884 — compare_blstats(): prev-vs-new change direction
// (1 = went up/increased, -1 = went down, 0 = same; bitmask 0/1 same/changed).
// C panic() aborts the game; JS has no sync abort, so the two bad-pointer
// arms throw with the C message (loud, never silent). fmt_ptr() has no JS
// port — the field index rides along instead.
export function compare_blstats(bl1, bl2) {
    if (!bl1 || !bl2) {
        throw new Error(`compare_blstat: bad istat pointer ${bl1?.fld}, ${bl2?.fld}`); // C :1814-1816
    }
    let anytype = bl1.anytype;
    const isPtrType = anytype === ANY_IPTR || anytype === ANY_UPTR
        || anytype === ANY_LPTR || anytype === ANY_ULPTR;
    if ((!unionNonzero(bl1.a) || !unionNonzero(bl2.a)) && isPtrType) {
        throw new Error('compare_blstat: invalid pointer'); // C :1821-1824
    }
    // C :1827-1829 cheat — terrain highlights as string but compares as int.
    if (bl1.fld === BL_TERRAIN) anytype = ANY_INT;

    const fld = bl1.fld;
    // C :1832-1835 — HP/HPmax/energy/energymax/gold compare rawval (C keeps
    // truncated display values in `a`, e.g. HP capped at 9999).
    const use_rawval = fld === BL_HP || fld === BL_HPMAX
        || fld === BL_ENE || fld === BL_ENEMAX || fld === BL_GOLD;
    const a1 = use_rawval ? bl1.rawval : bl1.a;
    const a2 = use_rawval ? bl2.rawval : bl2.a;

    let result = 0;
    switch (anytype) { // C :1838-1879
    case ANY_INT:
        result = a1.a_int < a2.a_int ? 1 : a1.a_int > a2.a_int ? -1 : 0;
        break;
    case ANY_IPTR:
        result = a1.a_iptr.v < a2.a_iptr.v ? 1 : a1.a_iptr.v > a2.a_iptr.v ? -1 : 0;
        break;
    case ANY_LONG:
        result = a1.a_long < a2.a_long ? 1 : a1.a_long > a2.a_long ? -1 : 0;
        break;
    case ANY_LPTR:
        result = a1.a_lptr.v < a2.a_lptr.v ? 1 : a1.a_lptr.v > a2.a_lptr.v ? -1 : 0;
        break;
    case ANY_UINT:
        result = a1.a_uint < a2.a_uint ? 1 : a1.a_uint > a2.a_uint ? -1 : 0;
        break;
    case ANY_UPTR:
        result = a1.a_uptr.v < a2.a_uptr.v ? 1 : a1.a_uptr.v > a2.a_uptr.v ? -1 : 0;
        break;
    case ANY_ULONG:
        result = a1.a_ulong < a2.a_ulong ? 1 : a1.a_ulong > a2.a_ulong ? -1 : 0;
        break;
    case ANY_ULPTR:
        result = a1.a_ulptr.v < a2.a_ulptr.v ? 1 : a1.a_ulptr.v > a2.a_ulptr.v ? -1 : 0;
        break;
    case ANY_STR:
        // C :1875 sgn(strcmp(bl1->val, bl2->val)); JS string order is
        // UTF-16 code-unit order — identical to byte order for ASCII values.
        result = bl1.val === bl2.val ? 0 : sgn(bl1.val < bl2.val ? -1 : 1);
        break;
    case ANY_MASK32:
        result = a1.a_ulong !== a2.a_ulong ? 1 : 0; // C :1878 boolean→int
        break;
    default:
        result = 1; // C :1880-1881
    }
    return result;
}

// C botl.c:1886-1923 — anything_to_s(): render the union per anytype into
// buf; NULL buf returns NULL; ANY_STR is a no-op (returns buf); default
// empties. JS strings are immutable so the rendered string is returned
// (null for null input).
export function anything_to_s(val, a, anytype) {
    if (val === null || val === undefined) return null; // C :1889-1890
    switch (anytype) { // C :1892-1920
    case ANY_ULONG:
        return String(a.a_ulong);
    case ANY_MASK32:
        return (a.a_ulong >>> 0).toString(16); // C :1897 "%lx"
    case ANY_LONG:
        return String(a.a_long);
    case ANY_INT:
        return String(a.a_int);
    case ANY_UINT:
        return String(a.a_uint >>> 0);
    case ANY_IPTR:
        return String(a.a_iptr.v);
    case ANY_LPTR:
        return String(a.a_lptr.v);
    case ANY_ULPTR:
        return String(a.a_ulptr.v);
    case ANY_UPTR:
        return String(a.a_uptr.v >>> 0);
    case ANY_STR: /* do nothing */
        return val; // C :1915-1917
    default:
        return ''; // C :1919 buf[0] = '\0'
    }
}

// C botl.c:1977-2050 — percentage(): integer 100*cur/max per anytype; HP
// and energy use rawval (untruncated) — C :1992-1996. A truncation-to-zero
// of a nonzero input reports 1 — C :2043-2048.
export function percentage(bl, maxbl) {
    let result = 0;
    let ival = 0, lval = 0, uval = 0, ulval = 0;

    if (!bl || !maxbl) {
        // C :1985-1988 — impossible() logs and returns 0 (no abort); the
        // async log is a named omit in sync code, the return is kept.
        return 0;
    }

    const fld = bl.fld;
    const use_rawval = fld === BL_HP || fld === BL_ENE; // C :1991
    const anytype = bl.anytype;
    if (unionNonzero(maxbl.a)) { // C :1995 `maxbl->a.a_void` (union overlay)
        switch (anytype) { // C :1996-2037
        case ANY_INT:
            ival = use_rawval ? bl.rawval.a_int : bl.a.a_int;
            {
                const mval = use_rawval ? maxbl.rawval.a_int : maxbl.a.a_int;
                result = Math.trunc((100 * ival) / mval);
            }
            break;
        case ANY_LONG:
            lval = bl.a.a_long;
            result = Math.trunc((100 * lval) / maxbl.a.a_long);
            break;
        case ANY_UINT:
            uval = bl.a.a_uint;
            result = Math.trunc((100 * uval) / maxbl.a.a_uint);
            break;
        case ANY_ULONG:
            ulval = bl.a.a_ulong;
            result = Math.trunc((100 * ulval) / maxbl.a.a_ulong);
            break;
        case ANY_IPTR:
            ival = bl.a.a_iptr.v;
            result = Math.trunc((100 * ival) / maxbl.a.a_iptr.v);
            break;
        case ANY_LPTR:
            lval = bl.a.a_lptr.v;
            result = Math.trunc((100 * lval) / maxbl.a.a_lptr.v);
            break;
        case ANY_UPTR:
            uval = bl.a.a_uptr.v;
            result = Math.trunc((100 * uval) / maxbl.a.a_uptr.v);
            break;
        case ANY_ULPTR:
            ulval = bl.a.a_ulptr.v;
            result = Math.trunc((100 * ulval) / maxbl.a.a_ulptr.v);
            break;
        }
    }
    if (result === 0 && (ival !== 0 || lval !== 0 || uval !== 0 || ulval !== 0)) result = 1; // C :2043-2047
    return result;
}

// C botl.c:2052-2089 — exp_percentage(): level-progress share of
// (u.uexp - level_start) in (next_start - level_start); one point short of
// the next level counts as 100 (level-drain highlight hook) — C :2064-2074.
export function exp_percentage() {
    let res = 0;
    const u = game.u ?? {};
    if ((u.ulevel | 0) < 30) { // C :2056
        const curlvlstart = newuexp((u.ulevel | 0) - 1); // C :2059
        const exp_val = (u.uexp | 0) - curlvlstart; // C :2060
        const nxt_exp_val = newuexp(u.ulevel | 0) - curlvlstart; // C :2061
        if (exp_val === nxt_exp_val - 1) {
            res = 100; // C :2074
        } else {
            const curval = { anytype: ANY_LONG, a: zeroAnything(), fld: BL_EXP }; // C :2077-2082
            const maxval = { anytype: ANY_LONG, a: zeroAnything(), fld: BL_EXP };
            curval.a.a_long = exp_val;
            maxval.a.a_long = nxt_exp_val;
            res = percentage(curval, maxval); // C :2085
        }
    }
    return res;
}

// Named omissions — live C under STATUS_HILITES / the windowport registry,
// unwired in JS. Loud forwarders (never silent divergence); replace with the
// real ports when their campaigns land.

// C botl.c:2257 hilite_reset_needed() — timeout expiry check for a field's
// active highlight. Named omit: result only gates the reset arm below.
function hilite_reset_needed(_prev, _moves) {
    throw new Error('named omit: hilite_reset_needed (botl.c:2257) not yet ported');
}

// C botl.c:2364 get_hilite() — status-highlight rule selection. Named omit:
// result only feeds status_update color + hilite_rule cache below.
function get_hilite(_idx, _fld, _vp, _chg, _pc) {
    throw new Error('named omit: get_hilite (botl.c:2364) not yet ported');
}

// C winprocs.h:186 (`#define status_update (*windowprocs.win_status_update)`)
// — per-field delivery into the windowport's status buffer. Named omit: JS
// has no windowport registry; the tty end effect is display.js bot().
function status_update(_fld, _val, _chg, _pc, _color, _hilites) {
    throw new Error('named omit: status_update windowport dispatch (winprocs.h:186) not yet ported');
}

// C botl.c:1496-1497 — `static int oldrndencode = 0; static nhsym oldgoldsym
// = 0;` C starts at 0 because svc/gs exist from boot. Neither has a JS port
// yet, so the cache starts undefined: the arm stays off (no spurious first
// force) until svc/gs land, at which point the first real values trip
// exactly the refresh the C hack was written for.
let oldrndencode;
let oldgoldsym;

// C botl.c:1492-1618 — eval_notify_windowport_field(): compare one blstats
// field across the idx buffers and push changes to the window port.
// Returns whether anything was pushed (drives the outer FLUSH decision).
export function eval_notify_windowport_field(fld, valsetlist, idx) {
    const gbstats = game.gb?.blstats;
    const curr = gbstats?.[idx]?.[fld] ?? null; // C :1515
    const prev = gbstats?.[1 - idx]?.[fld] ?? null; // C :1516
    if (!curr || !prev) return false;
    const gu_update_all = !!game.gu?.update_all;
    let color = NO_COLOR; // C :1517
    const anytype = gbstats[idx][fld].anytype; // C :1514 (anytype field)

    let chg = gu_update_all ? 0 : compare_blstats(prev, curr); // C :1519
    // C :1520-1542 percent arm (STATUS_HILITES compiled in: thresholds part
    // of the gate). Second disjunct: hitpoint bar shows HP share even when
    // HP itself is unchanged — C :1540-1542 comment.
    let pc;
    if ((((chg !== 0 || gu_update_all || fld === BL_XP)
            && curr.percent_matters
            && curr.thresholds)
        || (fld === BL_HP && (game.iflags?.wc2_hitpointbar ?? false)))) {
        const fldmax = curr.idxmax; // C :1543
        pc = fldmax === BL_EXP ? exp_percentage() // C :1544
            : fldmax >= 0 && fldmax < MAXBLSTATS
                ? percentage(curr, gbstats[idx][fldmax]) // C :1545-1547
                : 0; // C :1548 bullet proofing
        if (pc !== prev.percent_value) chg = pc < prev.percent_value ? -1 : 1; // C :1549-1550
        curr.percent_value = pc; // C :1551
    } else {
        pc = 0; // C :1553
    }

    // C :1556-1581 temporary hack — moveloop's new-game prolog sets
    // svc.context.rndencode after the status window init, so gold's \G
    // sequence was already encoded/cached; a symset change likewise alters
    // the glyph half of the encoding. svc/gs state has no JS port yet
    // (COIN_CLASS/SYM_OFF_O have no const.js export either), so the reads
    // are undefined-safe and the arm pins off until that state lands.
    {
        const rndencode = game.svc?.context?.rndencode;
        const goldsym = game.gs?.showsyms?.[0]; // C :1579 gs.showsyms[COIN_CLASS + SYM_OFF_O]
        if (fld === BL_GOLD && (rndencode !== oldrndencode || goldsym !== oldgoldsym)) { // C :1582-1584
            if (!game.gu) game.gu = {};
            game.gu.update_all = true; // C :1585 (chg = 2 variant abandoned)
            oldrndencode = rndencode; // C :1586-1587
            oldgoldsym = goldsym;
        }
    }

    let reset = false; // C :1589
    // C :1591-1599 STATUS_HILITES arms: full-update zeroes both times;
    // otherwise an unchanged field with a live timer re-checks expiry.
    if (game.gu?.update_all) { // C :1592
        chg = 0; // C :1593
        curr.time = prev.time = 0; // C :1594
    } else if (chg === 0 && curr.time) { // C :1595
        reset = hilite_reset_needed(prev, 0); // C :1596 (gb.bl_hilite_moves; 0 until options port)
        if (reset) curr.time = prev.time = 0; // C :1597-1598
    }

    let updated = false;
    if (game.gu?.update_all || chg !== 0 || reset) { // C :1601
        if (!valsetlist?.[fld]) curr.val = anything_to_s(curr.val, curr.a, anytype); // C :1602-1603 (void) fill

        if (anytype !== ANY_MASK32) { // C :1605
            if (chg !== 0 || (curr.val?.length ?? 0) > 0) { // C :1606 `chg || *curr->val`
                // C :1607-1610 — an Xp-percentage-only change resets chg to
                // the value comparison (or level-loss direction).
                if (chg === 1 && fld === BL_XP) chg = compare_blstats(prev, curr); // C :1611
                curr.hilite_rule = get_hilite(idx, fld, curr.a, chg, pc); // C :1613-1615
                prev.hilite_rule = curr.hilite_rule; // C :1616
                if (chg === 2) { // C :1617-1620
                    color = NO_COLOR; // C :1618
                    chg = 0; // C :1619
                }
            }
            status_update(fld, curr.val, chg, pc, color, null); // C :1621-1622 (...,(unsigned long *) 0)
        } else {
            // C :1624-1627 — condition colors ride gc.cond_hilites[], not color.
            status_update(fld, curr.a.a_ulong, chg, pc, color, game.gc?.cond_hilites ?? null);
        }
        curr.chg = prev.chg = true; // C :1629
        updated = true; // C :1630
    }
    return updated; // C :1632
}

// C botl.c:1621-1680 — evaluate_and_notify_windowport(): push the changed
// blstats fields to the window port, then RESET/FLUSH per windowport caps,
// then clear the botl request flags. Option gates in C order — C :1632-1642;
// all default Off (optlist.h:167/657/664/672/750/762/865), so absent JS
// option state reads false, matching a fresh C config.
export function evaluate_and_notify_windowport(valsetlist, idx) {
    let updated = 0; // C :1625

    // C :1630-1650 — skip fields the options hide (Upolyd = u.umonnum !=
    // u.umonster; JS Upolyd(player) in const.js:3172).
    for (let i = 0; i < MAXBLSTATS; i++) { // C :1630
        const fld = initblstats[i].fld; // C :1631
        const flags = game.flags ?? {};
        if (((fld === BL_SCORE) && !flags.showscore) // C :1633
            || ((fld === BL_EXP) && !flags.showexp) // C :1634
            || ((fld === BL_TIME) && !flags.time) // C :1635
            || ((fld === BL_HD) && !Upolyd(game.u)) // C :1636
            || ((fld === BL_XP || fld === BL_EXP) && Upolyd(game.u)) // C :1637
            || ((fld === BL_VERS) && !flags.showvers) // C :1638
            || ((fld === BL_TERRAIN) && !flags.terrainstatus) // C :1639
            || ((fld === BL_WEAPON) && !flags.weaponstatus) // C :1640
            || ((fld === BL_ARMOR) && !flags.armorstatus) // C :1641
        ) {
            continue; // C :1643
        }
        if (eval_notify_windowport_field(fld, valsetlist, idx)) updated++; // C :1645-1646
    }
    // C :1652-1670 notes: botlx forces a full push (some ports only draw
    // changed fields; tty needs the repaint after menu/text obliteration).
    // No windowport registry in JS → caps read 0 (named omit); both arms
    // skip, exactly as with a status-incapable windowport in C.
    const wincap2 = 0; // named omit: windowprocs.wincap2 (windowport registry)
    const botlx = !!(game.flags?.botlx ?? game.disp?.botlx); // C disp.botlx; JS convention: game.flags (display.js bot())
    if (botlx && (wincap2 & WC2_RESET_STATUS) !== 0) { // C :1671-1673
        status_update(BL_RESET, 0, 0, 0, NO_COLOR, null);
    } else if ((updated || botlx) && (wincap2 & WC2_FLUSH_STATUS) !== 0) { // C :1674-1676
        status_update(BL_FLUSH, 0, 0, 0, NO_COLOR, null);
    }

    if (game.flags) { // C :1678 disp.botl = disp.botlx = disp.time_botl = FALSE
        game.flags.botl = false;
        game.flags.botlx = false;
        game.flags.time_botl = false;
    } else if (game.disp) {
        game.disp.botl = game.disp.botlx = game.disp.time_botl = false;
    }
    if (game.gu) game.gu.update_all = false; // C :1679 gu.update_all = FALSE
}
