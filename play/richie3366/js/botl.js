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
// omission (loud forwarder, never silent). The hilite-rule engine
// (get_hilite botl.c:2364, live below; hilite_reset_needed botl.c:2257,
// still named) feeds only status_update color + the hilite_rule cache, so
// nothing observable is dropped while the dispatch stays unwired.
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
    BL_RESET, BL_FLUSH, BL_CHARACTERISTICS,
    WC2_RESET_STATUS, WC2_FLUSH_STATUS,
    ANY_INT, ANY_UINT, ANY_LONG, ANY_ULONG,
    ANY_IPTR, ANY_UPTR, ANY_LPTR, ANY_ULPTR,
    ANY_STR, ANY_MASK32, ANY_INVALID,
    MAXVALWIDTH, BUFSZ, QBUFSZ, CLR_MAX,
    HL_UNDEF, HL_NONE, HL_BOLD, HL_DIM, HL_ITALIC, HL_ULINE, HL_BLINK, HL_INVERSE,
    HL_ATTCLR_BOLD, HL_ATTCLR_DIM, HL_ATTCLR_ITALIC,
    HL_ATTCLR_ULINE, HL_ATTCLR_BLINK, HL_ATTCLR_INVERSE, BL_ATTCLR_MAX,
    NO_LTEQGT, EQ_VALUE, LT_VALUE, LE_VALUE, GE_VALUE, GT_VALUE, TXT_VALUE,
    BL_TH_NONE, BL_TH_VAL_PERCENTAGE, BL_TH_VAL_ABSOLUTE, BL_TH_UPDOWN,
    BL_TH_CONDITION, BL_TH_TEXTMATCH, BL_TH_ALWAYS_HILITE, BL_TH_CRITICALHP,
    Upolyd,
    BOTL_NSIZ, MAX_TYPE,
    A_CHAOTIC, A_NEUTRAL, NOT_HUNGRY, UNENCUMBERED,
    SLT_ENCUMBER, OVERLOADED, SATIATED, STARVED,
    CONDITION_COUNT,
    VI_NUMBER, VI_NAME, VI_BRANCH,
    SICK, SICK_VOMITABLE, SICK_NONVOMITABLE,
    STRANGLED, SLIMED, STONED, GLIB,
    MALE, FEMALE, ICE, LARGEST_INT,
    TT_LAVA, TT_BURIEDBALL,
    P_LANCE, P_QUARTERSTAFF, P_MORNING_STAR, P_POLEARMS, P_UNICORN_HORN,
    BL_MASK_BAREH, BL_MASK_BLIND, BL_MASK_BUSY, BL_MASK_CONF,
    BL_MASK_DEAF, BL_MASK_ELF_IRON, BL_MASK_FLY, BL_MASK_FOODPOIS,
    BL_MASK_GLOWHANDS, BL_MASK_GRAB, BL_MASK_HALLU, BL_MASK_HELD,
    BL_MASK_ICY, BL_MASK_INLAVA, BL_MASK_LEV, BL_MASK_PARLYZ,
    BL_MASK_RIDE, BL_MASK_SLEEPING, BL_MASK_SLIME, BL_MASK_SLIPPERY,
    BL_MASK_STONE, BL_MASK_STRNGL, BL_MASK_STUN, BL_MASK_SUBMERGED,
    BL_MASK_TERMILL, BL_MASK_TETHERED, BL_MASK_TRAPPED, BL_MASK_UNCONSC,
    BL_MASK_WOUNDEDL, BL_MASK_HOLDING,
    MENU_ITEMFLAGS_SKIPINVERT,
} from './const.js';
import {
    NO_COLOR, ATR_NONE, ATR_INVERSE,
    CLR_BLACK, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_BLUE, CLR_MAGENTA,
    CLR_CYAN, CLR_GRAY, CLR_ORANGE, CLR_BRIGHT_GREEN, CLR_YELLOW,
    CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, CLR_WHITE,
} from './terminal.js';
import { newuexp } from './exper.js';
import {
    A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA,
    acurr, get_strength_str,
} from './attrib.js';
import { describe_level, objnum_to_glyph, Hallucination } from './display.js';
import { rank_of, roles } from './roles.js';
import { money_cnt } from './shk.js';
import { pmname } from './do_name.js';
import { sticks } from './engrave.js';
import { unconscious } from './teleport.js';
import { classify_terrain } from './hack.js';
import { near_capacity, weapon_descr, Blind } from './invent.js';
import { weapon_type } from './weapon.js';
import { is_sword, objectNames } from './objects.js';
import { bimanual, is_weptool } from './wield.js';
import { helm_simple_name } from './do_wear.js';
import { upstart, strNsubst, stripchars, str_start_is, fuzzymatch, lowc } from './hacklib.js';
import { clr2colorname } from './artifact.js';
import { humanoid, mons, is_flyer, NON_PM } from './monsters.js';
import { Flying, Levitation } from './mhitu.js';
import { critically_low_hp } from './pray.js';
import { mdlib_version_string } from './version.js';
import { WEAPON_CLASS, CLOAK_OF_PROTECTION } from './generated/objects_data.js';
import {
    ART_MITRE_OF_HOLINESS, ART_TSURUGI_OF_MURAMASA,
} from './generated/artifacts_data.js';

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
    // C status_initialize() (botl.c:1692-1697) sets gb.blinit after the full
    // init; JS has no status_initialize port, so the boot point carries it —
    // bot_via_windowport() panics without it (botl.c:970).
    game.gb.blinit = true;
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

// C botl.c:2333-2344 — noneoftheabove(): whether a title rule's textmatch
// is the 'none of the above' / polymorphed menu string. Same-file staticfn;
// get_hilite's BL_TITLE arm (C :2545-2546) is its only caller.
function noneoftheabove(hl_text) {
    if (fuzzymatch(hl_text, 'none of the above', '" -_', true) // C :2338
        || fuzzymatch(hl_text, '(polymorphed)', '"()', true) // C :2339
        || fuzzymatch(hl_text, 'none of the above (polymorphed)', // C :2340-2341
            '" -_()', true))
        return true; // C :2342
    return false; // C :2343
}

// C botl.c:2346-2370 — get_hilite(): rule selection over the field's
// threshold chain. Inputs per the C header comment: actual value vp
// (BL_TH_VAL_ABSOLUTE), chg down/up/same -1/1/0 (BL_TH_UPDOWN/change),
// percentage pc of max (BL_TH_VAL_PERCENTAGE). Returns the rule or null;
// the windowport color rides out through colorBox (`{ v }` holder mirroring
// C `int *colorptr`). Callers: eval_notify_windowport_field (C :1597) and
// exp_percent_changing (C :2117, not yet ported — named omit).
// Rule nodes (`struct hilite_s`) use C field names: behavior/rel/value
// (a_int/a_long)/textmatch/coloridx/next.
function get_hilite(idx, fldidx, vp, chg, pc, colorBox) {
    let rule = null; // C :2370 `rule = 0`
    const value = vp; // C :2371 `(anything *) vp`
    let txtstr;

    // C :2374-2375 — out-of-range returns Null WITHOUT touching colorptr.
    if (fldidx < 0 || fldidx >= MAXBLSTATS) return null;

    // C botl.c:673 `#define has_hilite(i) (gb.blstats[0][(i)].thresholds)`,
    // file-local, `#undef` at :2572 — inlined here.
    const gbstats = game.gb?.blstats;
    if (gbstats?.[0]?.[fldidx]?.thresholds) { // C :2377
        let dt;
        // C :2379-2380 — there are hilites set here; best-fit trackers.
        let max_pc = -1, min_pc = 101; // C :2380
        // C :2381-2383 — LARGEST_INT isn't INT_MAX; it fits within 16 bits
        // but handles all 'int' status fields.
        let max_ival = -LARGEST_INT, min_ival = LARGEST_INT; // C :2383
        // C :2384-2386 — LONG_MAX bounds; JS doubles are exact to 2^53,
        // far above any a_long status value, so MAX_SAFE_INTEGER is it.
        let max_lval = -Number.MAX_SAFE_INTEGER, min_lval = Number.MAX_SAFE_INTEGER;
        let exactmatch = false, updown = false, changed = false, // C :2387-2388
            perc_or_abs = false, crit_hp = false;

        // C :2390-2391 — min_/max_ track best fit over the chain.
        for (let hl = gbstats[0][fldidx].thresholds; hl; hl = hl.next) {
            dt = initblstats[fldidx].anytype; // C :2392, only for 'absolute'
            // C :2393-2401 — a matched critical-hp rule ignores every other
            // HP rule below (last critical one wins); otherwise regen's
            // every-move +1 would pin an up/changed highlight inside the
            // critical threshold.
            if (crit_hp && hl.behavior !== BL_TH_CRITICALHP) continue; // C :2400
            // C :2402-2406 — a matched temporary highlight beats all
            // persistent ones, but updown rules still run for the last fit.
            if ((updown || changed) && hl.behavior !== BL_TH_UPDOWN) continue; // C :2405
            // C :2407-2410 — a matched percentage/absolute rule beats 'always'.
            if (perc_or_abs && hl.behavior === BL_TH_ALWAYS_HILITE) continue; // C :2409

            switch (hl.behavior) { // C :2412
            case BL_TH_VAL_PERCENTAGE: // C :2413, always ANY_INT
                if (hl.rel === EQ_VALUE && pc === hl.value.a_int) { // C :2414
                    rule = hl;
                    min_pc = max_pc = hl.value.a_int; // C :2416
                    exactmatch = perc_or_abs = true; // C :2417
                } else if (exactmatch) { // C :2418-2419
                    ; // already found best fit, skip lt,ge,&c
                } else if (hl.rel === LT_VALUE // C :2420-2422
                           && (pc < hl.value.a_int)
                           && (hl.value.a_int <= min_pc)) {
                    rule = hl;
                    min_pc = hl.value.a_int; // C :2424
                    perc_or_abs = true; // C :2425
                } else if (hl.rel === LE_VALUE // C :2426-2428
                           && (pc <= hl.value.a_int)
                           && (hl.value.a_int <= min_pc)) {
                    rule = hl;
                    min_pc = hl.value.a_int; // C :2430
                    perc_or_abs = true; // C :2431
                } else if (hl.rel === GT_VALUE // C :2432-2434
                           && (pc > hl.value.a_int)
                           && (hl.value.a_int >= max_pc)) {
                    rule = hl;
                    max_pc = hl.value.a_int; // C :2436
                    perc_or_abs = true; // C :2437
                } else if (hl.rel === GE_VALUE // C :2438-2440
                           && (pc >= hl.value.a_int)
                           && (hl.value.a_int >= max_pc)) {
                    rule = hl;
                    max_pc = hl.value.a_int; // C :2442
                    perc_or_abs = true; // C :2443
                }
                break;
            case BL_TH_UPDOWN: // C :2446, uses chg (set by caller), not dt
                // C :2447-2448 — specific up/down beats general 'changed'
                // regardless of rule order.
                if (chg < 0 && hl.rel === LT_VALUE) { // C :2449
                    rule = hl;
                    updown = true; // C :2451
                } else if (chg > 0 && hl.rel === GT_VALUE) { // C :2452
                    rule = hl;
                    updown = true; // C :2454
                } else if (chg !== 0 && hl.rel === EQ_VALUE && !updown) { // C :2455
                    rule = hl;
                    changed = true; // C :2457
                }
                break;
            case BL_TH_VAL_ABSOLUTE: // C :2460, either ANY_INT or ANY_LONG
                // C :2461-2465 — int/long twins differ only in union field
                // and min_/max_ names; keep them in step.
                if (dt === ANY_INT) { // C :2466
                    if (hl.rel === EQ_VALUE // C :2467-2468
                        && hl.value.a_int === value.a_int) {
                        rule = hl;
                        min_ival = max_ival = hl.value.a_int; // C :2470
                        exactmatch = perc_or_abs = true; // C :2471
                    } else if (exactmatch) { // C :2472-2473
                        ; // already found best fit, skip lt,ge,&c
                    } else if (hl.rel === LT_VALUE // C :2474-2476
                               && (value.a_int < hl.value.a_int)
                               && (hl.value.a_int <= min_ival)) {
                        rule = hl;
                        min_ival = hl.value.a_int; // C :2478
                        perc_or_abs = true; // C :2479
                    } else if (hl.rel === LE_VALUE // C :2480-2482
                               && (value.a_int <= hl.value.a_int)
                               && (hl.value.a_int <= min_ival)) {
                        rule = hl;
                        min_ival = hl.value.a_int; // C :2484
                        perc_or_abs = true; // C :2485
                    } else if (hl.rel === GT_VALUE // C :2486-2488
                               && (value.a_int > hl.value.a_int)
                               && (hl.value.a_int >= max_ival)) {
                        rule = hl;
                        max_ival = hl.value.a_int; // C :2490
                        perc_or_abs = true; // C :2491
                    } else if (hl.rel === GE_VALUE // C :2492-2494
                               && (value.a_int >= hl.value.a_int)
                               && (hl.value.a_int >= max_ival)) {
                        rule = hl;
                        max_ival = hl.value.a_int; // C :2496
                        perc_or_abs = true; // C :2497
                    }
                } else { // C :2499 ANY_LONG
                    if (hl.rel === EQ_VALUE // C :2500-2501
                        && hl.value.a_long === value.a_long) {
                        rule = hl;
                        min_lval = max_lval = hl.value.a_long; // C :2503
                        exactmatch = perc_or_abs = true; // C :2504
                    } else if (exactmatch) { // C :2505-2506
                        ; // already found best fit, skip lt,ge,&c
                    } else if (hl.rel === LT_VALUE // C :2507-2509
                               && (value.a_long < hl.value.a_long)
                               && (hl.value.a_long <= min_lval)) {
                        rule = hl;
                        min_lval = hl.value.a_long; // C :2511
                        perc_or_abs = true; // C :2512
                    } else if (hl.rel === LE_VALUE // C :2513-2515
                               && (value.a_long <= hl.value.a_long)
                               && (hl.value.a_long <= min_lval)) {
                        rule = hl;
                        min_lval = hl.value.a_long; // C :2517
                        perc_or_abs = true; // C :2518
                    } else if (hl.rel === GT_VALUE // C :2519-2521
                               && (value.a_long > hl.value.a_long)
                               && (hl.value.a_long >= max_lval)) {
                        rule = hl;
                        max_lval = hl.value.a_long; // C :2523
                        perc_or_abs = true; // C :2524
                    } else if (hl.rel === GE_VALUE // C :2525-2527
                               && (value.a_long >= hl.value.a_long)
                               && (hl.value.a_long >= max_lval)) {
                        rule = hl;
                        max_lval = hl.value.a_long; // C :2529
                        perc_or_abs = true; // C :2530
                    }
                }
                break;
            case BL_TH_TEXTMATCH: // C :2534 ANY_STR
                txtstr = gbstats[idx][fldidx].val; // C :2535
                if (fldidx === BL_TITLE) {
                    // C :2536-2538 — "<name> the <rank-title>", skip past
                    // "<name> the ": strlen(plname) + sizeof(" the ") -
                    // sizeof("") = len + 5 - 1 (svp.plname = game.plname,
                    // botl.js:1020 precedent).
                    txtstr = String(txtstr ?? '').slice((game.plname ?? '').length + 4);
                }
                if (hl.rel === TXT_VALUE && hl.textmatch && hl.textmatch[0]) { // C :2539
                    if (fuzzymatch(hl.textmatch, txtstr, '" -_', true)) { // C :2540
                        rule = hl;
                        exactmatch = true; // C :2542
                    } else if (exactmatch) { // C :2543-2544
                        ; // already found best fit, skip "noneoftheabove"
                    } else if (fldidx === BL_TITLE // C :2545-2546
                               && Upolyd(game.u) && noneoftheabove(hl.textmatch)) {
                        rule = hl; // C :2547
                    }
                }
                break;
            case BL_TH_ALWAYS_HILITE: // C :2551-2553
                rule = hl;
                break;
            case BL_TH_CRITICALHP:
                // C :2555 — pray.c:116, live js/pray.js export (no clone #2).
                if (fldidx === BL_HP && critically_low_hp(false)) {
                    rule = hl;
                    crit_hp = true; // C :2557
                    updown = changed = perc_or_abs = false; // C :2558
                }
                break;
            case BL_TH_NONE: // C :2561-2562
                break;
            default: // C :2563-2564
                break;
            }
        }
    }
    if (colorBox) colorBox.v = rule ? rule.coloridx : NO_COLOR; // C :2568
    return rule; // C :2569
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
                // C :1613-1615 — get_hilite writes the windowport color
                // through `&color`; the `{ v }` holder mirrors the pointer.
                const colorBox = { v: color };
                curr.hilite_rule = get_hilite(idx, fld, curr.a, chg, pc, colorBox);
                color = colorBox.v;
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

// =======================================================================
// bot_via_windowport() fill path (botl.c:962-1279) + the tables and
// same-file callees it needs. Caller: C bot() (botl.c:262) takes this arm
// whenever VIA_WINDOWPORT(); JS bot() (display.js) stays on the direct tty
// path — no windowport registry exists yet — so the call is a NAMED
// OMISSION (see header). First call fills via status_version() even with
// showvers off (C :1114-1122), so status_version/encglyph are ported here
// rather than named: nothing on this path may throw.
// =======================================================================

// C botl.h:69-100 (enum blconditions) — indices parallel conditions[] and
// condtests[] below.
const bl_bareh = 0;
const bl_blind = 1;
const bl_busy = 2;
const bl_conf = 3;
const bl_deaf = 4;
const bl_elf_iron = 5;
const bl_fly = 6;
const bl_foodpois = 7;
const bl_glowhands = 8;
const bl_grab = 9;
const bl_hallu = 10;
const bl_held = 11;
const bl_icy = 12;
const bl_inlava = 13;
const bl_lev = 14;
const bl_parlyz = 15;
const bl_ride = 16;
const bl_sleeping = 17;
const bl_slime = 18;
const bl_slippery = 19;
const bl_stone = 20;
const bl_strngl = 21;
const bl_stun = 22;
const bl_submerged = 23;
const bl_termill = 24;
const bl_tethered = 25;
const bl_trapped = 26;
const bl_unconsc = 27;
const bl_woundedl = 28;
const bl_holding = 29;

// C global.h:576 (enum optchoice) — condtests option kind.
const OPT_IN = 0;
const OPT_OUT = 1;

// C botl.c:10-13 enc_stat[] ("also used in insight.c").
export const enc_stat = [
    '', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded',
];

// C eat.c:70-73 hu_stat[] ("see hunger states in hack.h"; also used in
// botl.c and insight.c). Trailing spaces are significant (D-0500).
const hu_stat = [
    'Satiated', '        ', 'Hungry  ', 'Weak    ',
    'Fainting', 'Fainted ', 'Starved ',
];

// C botl.c:781-813 conditions[] — ranking, mask, id, three text widths.
export const conditions = [
    { ranking: 20, mask: BL_MASK_BAREH, c: bl_bareh, text: ['Bare', 'Bar', 'Bh'] }, // C :783
    { ranking: 10, mask: BL_MASK_BLIND, c: bl_blind, text: ['Blind', 'Blnd', 'Bl'] }, // C :784
    { ranking: 20, mask: BL_MASK_BUSY, c: bl_busy, text: ['Busy', 'Bsy', 'By'] }, // C :785
    { ranking: 10, mask: BL_MASK_CONF, c: bl_conf, text: ['Conf', 'Cnf', 'Cf'] }, // C :786
    { ranking: 10, mask: BL_MASK_DEAF, c: bl_deaf, text: ['Deaf', 'Def', 'Df'] }, // C :787
    { ranking: 15, mask: BL_MASK_ELF_IRON, c: bl_elf_iron, text: ['Iron', 'Irn', 'Fe'] }, // C :788
    { ranking: 10, mask: BL_MASK_FLY, c: bl_fly, text: ['Fly', 'Fly', 'Fl'] }, // C :789
    { ranking: 6, mask: BL_MASK_FOODPOIS, c: bl_foodpois, text: ['FoodPois', 'Fpois', 'Poi'] }, // C :790
    { ranking: 20, mask: BL_MASK_GLOWHANDS, c: bl_glowhands, text: ['Glow', 'Glo', 'Gl'] }, // C :791
    { ranking: 2, mask: BL_MASK_GRAB, c: bl_grab, text: ['Grab', 'Grb', 'Gr'] }, // C :792
    { ranking: 10, mask: BL_MASK_HALLU, c: bl_hallu, text: ['Hallu', 'Hal', 'Hl'] }, // C :793
    { ranking: 20, mask: BL_MASK_HELD, c: bl_held, text: ['Held', 'Hld', 'Hd'] }, // C :794
    { ranking: 20, mask: BL_MASK_ICY, c: bl_icy, text: ['Icy', 'Icy', 'Ic'] }, // C :795
    { ranking: 8, mask: BL_MASK_INLAVA, c: bl_inlava, text: ['InLava', 'Lav', 'La'] }, // C :796
    { ranking: 10, mask: BL_MASK_LEV, c: bl_lev, text: ['Lev', 'Lev', 'Lv'] }, // C :797
    { ranking: 20, mask: BL_MASK_PARLYZ, c: bl_parlyz, text: ['Parlyz', 'Para', 'Par'] }, // C :798
    { ranking: 10, mask: BL_MASK_RIDE, c: bl_ride, text: ['Ride', 'Rid', 'Rd'] }, // C :799
    { ranking: 20, mask: BL_MASK_SLEEPING, c: bl_sleeping, text: ['Zzz', 'Zzz', 'Zz'] }, // C :800
    { ranking: 6, mask: BL_MASK_SLIME, c: bl_slime, text: ['Slime', 'Slim', 'Slm'] }, // C :801
    { ranking: 20, mask: BL_MASK_SLIPPERY, c: bl_slippery, text: ['Slip', 'Slp', 'Sl'] }, // C :802
    { ranking: 6, mask: BL_MASK_STONE, c: bl_stone, text: ['Stone', 'Ston', 'Sto'] }, // C :803
    { ranking: 4, mask: BL_MASK_STRNGL, c: bl_strngl, text: ['Strngl', 'Stngl', 'Str'] }, // C :804
    { ranking: 10, mask: BL_MASK_STUN, c: bl_stun, text: ['Stun', 'Stun', 'St'] }, // C :805
    { ranking: 15, mask: BL_MASK_SUBMERGED, c: bl_submerged, text: ['Submrg', 'Subm', 'Sm'] }, // C :806
    { ranking: 6, mask: BL_MASK_TERMILL, c: bl_termill, text: ['TermIll', 'Ill', 'Ill'] }, // C :807
    { ranking: 20, mask: BL_MASK_TETHERED, c: bl_tethered, text: ['Teth', 'Tth', 'Te'] }, // C :808
    { ranking: 20, mask: BL_MASK_TRAPPED, c: bl_trapped, text: ['Trap', 'Trp', 'Tr'] }, // C :809
    { ranking: 20, mask: BL_MASK_UNCONSC, c: bl_unconsc, text: ['Out', 'Out', 'KO'] }, // C :810
    { ranking: 20, mask: BL_MASK_WOUNDEDL, c: bl_woundedl, text: ['WLegs', 'Leg', 'Lg'] }, // C :811
    { ranking: 20, mask: BL_MASK_HOLDING, c: bl_holding, text: ['UHold', 'UHld', 'UHd'] }, // C :812
];

// C botl.c:817-851 condtests[] — id, useroption, opt_in/out, enabled,
// configchoice, testresult. Only enabled/test are read on this path; the
// rest rides along for the options UI (C struct condtests_t, botl.h:148).
export const condtests = [
    { c: bl_bareh, useroption: 'barehanded', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_blind, useroption: 'blind', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_busy, useroption: 'busy', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_conf, useroption: 'conf', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_deaf, useroption: 'deaf', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_elf_iron, useroption: 'iron', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_fly, useroption: 'fly', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_foodpois, useroption: 'foodPois', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_glowhands, useroption: 'glowhands', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_grab, useroption: 'grab', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_hallu, useroption: 'hallucinat', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_held, useroption: 'held', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_icy, useroption: 'ice', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_inlava, useroption: 'lava', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_lev, useroption: 'levitate', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_parlyz, useroption: 'paralyzed', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_ride, useroption: 'ride', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_sleeping, useroption: 'sleep', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_slime, useroption: 'slime', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_slippery, useroption: 'slip', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_stone, useroption: 'stone', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_strngl, useroption: 'strngl', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_stun, useroption: 'stun', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_submerged, useroption: 'submerged', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_termill, useroption: 'termIll', opt: OPT_OUT, enabled: true, choice: false, test: false },
    { c: bl_tethered, useroption: 'tethered', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_trapped, useroption: 'trap', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_unconsc, useroption: 'unconscious', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_woundedl, useroption: 'woundedlegs', opt: OPT_IN, enabled: false, choice: false, test: false },
    { c: bl_holding, useroption: 'holding', opt: OPT_IN, enabled: false, choice: false, test: false },
];

/**
 * C ref: botl.c opt_next_cond `:1456–1490` — value of the next cond_xyz
 * option for #saveoptions (sole C caller options.c all_options_conds
 * `:9563`, via extern.h `:291`). C writes into a char outbuf and returns
 * boolean; JS folds the buffer into the return: null is C FALSE
 * (`:1463–1464`, indx past CONDITION_COUNT), otherwise the cond string —
 * possibly '' when the entry sits at its default (`:1462` pre-clear, the
 * `:1466–1482` internal-order note kept as-is: no sorting). Non-default
 * gate (`:1484–1488`): opt_in+enabled or opt_out+!enabled emits
 * `[!]cond_<useroption>` (`:1486` enabled ? '' : '!').
 */
export function opt_next_cond(indx) {
    if (indx >= CONDITION_COUNT) return null; // C `:1463–1464` FALSE
    const ct = condtests[indx];
    if ((ct.opt === OPT_IN && ct.enabled) // C `:1484`
        || (ct.opt === OPT_OUT && !ct.enabled)) { // C `:1485`
        return `${ct.enabled ? '' : '!'}cond_${ct.useroption}`; // C `:1486–1487`
    }
    return ''; // C `:1462` default value
}

// C hacklib strcmpi — A-Z fold; useroption strings are ASCII so lowercase
// ordering equals the C byte order (invent.js sortloot_cmp `:498–499`
// precedent).
function strcmpi_fold(a, b) {
    const x = (a || '').toLowerCase();
    const y = (b || '').toLowerCase();
    if (x < y) return -1;
    if (x > y) return 1;
    return 0;
}

// C botl.c cond_cmp `:1332–1342` — qsort callback sorting condition
// indices: conditions[] ranking ascending, useroption-alpha tiebreak.
function cond_cmp(a, b) {
    const c1 = conditions[a].ranking;
    const c2 = conditions[b].ranking;
    if (c1 !== c2) return c1 - c2; // C `:1338–1339`
    return strcmpi_fold(condtests[a].useroption, condtests[b].useroption); // C `:1341`
}

// C botl.c menualpha_cmp `:1344–1351` — qsort callback sorting condition
// indices alphabetically by useroption.
function menualpha_cmp(a, b) {
    return strcmpi_fold(condtests[a].useroption, condtests[b].useroption); // C `:1350`
}

/**
 * C ref: botl.c cond_menu `:1376–1454` — status-conditions toggle menu.
 * Toggles condtests[].enabled via a PICK_ANY menu (sort-change row first,
 * then one row per condition, preselected when enabled); returns true iff
 * any change was made. The create/start/select/destroy window layer maps
 * to one select_menu_pick_any call (getpos_menu precedent); free(picks)
 * and cg.zeroany have no JS carrier (a_int rides each row).
 * C callers: options.c pfxfn_cond_ do_handler `:5032` ("not used" in C —
 * no JS site); options.c optfn_o_status_cond do_handler `:8436–8439`
 * (wired in js/options.js doset).
 */
export async function cond_menu() {
    // options.js statically imports botl.js, so the menu layer comes in
    // lazily here (mon_givit/eat.js + wiz_intrinsic precedents).
    const { select_menu_pick_any } = await import('./options.js');
    if (!game.gc) game.gc = {}; // C decl.h:223 instance_globals_c (cmd.js precedent)
    const menutitle = ['alphabetically', 'by ranking']; // C `:1378–1380`
    let changed = false; // C `:1390`
    let showmenu = true; // C `:1389`
    let idx = 0; // C `:1383`
    let res = -1;
    do {
        const order = (game.gc.condmenu_sortorder | 0) ? 1 : 0; // C decl.h:229, init 0 `:1315`
        const sequence = [];
        for (let i = 0; i < CONDITION_COUNT; ++i) sequence.push(i); // C `:1392–1394`
        // C `:1395–1397` qsort; useroptions are unique so no tie survives
        // either comparator — the contest stable sort (Constitution §4)
        // matches C on every input here.
        sequence.sort(order ? cond_cmp : menualpha_cmp);
        const raw = [
            // C `:1422` end_menu prompt rides the title row (wiz_intrinsic precedent).
            { text: 'Choose status conditions to toggle', selectable: false, attr: ATR_INVERSE },
            { text: '', selectable: false },
            // C `:1402–1408` sort-change row: any.a_int 1, 'S'
            // accelerator, SKIPINVERT.
            {
                text: `change sort order from "${menutitle[order]}" to "${menutitle[1 - order]}"`,
                selectable: true,
                selector: 'S',
                a_int: 1,
                itemflags: MENU_ITEMFLAGS_SKIPINVERT,
            },
            // C `:1409–1411` add_menu_heading.
            { text: `sorted ${menutitle[order]}`, selectable: false },
        ];
        for (let i = 0; i < condtests.length; i++) { // C `:1412` SIZE(condtests)
            idx = sequence[i];
            condtests[idx].choice = false; // C `:1417`
            // C `:1413–1420` — `cond_%-14s`; every useroption is under 14
            // chars so padEnd is exact (C never truncates either).
            raw.push({
                text: `cond_${condtests[idx].useroption.padEnd(14, ' ')}`,
                selectable: true,
                selected: !!condtests[idx].enabled, // C `:1419–1420` SELECTED
                a_int: idx + 2, // C `:1416` avoid zero and the sort-change pick
            });
        }
        // C `:1424–1427` select + destroy; cancelValue -1 tells ESC
        // (C res -1, final loop skipped) apart from finish-empty (C res 0,
        // final loop disables everything still unpicked).
        const picked = await select_menu_pick_any(raw, { cancelValue: -1 });
        res = picked === -1 ? -1 : picked.length;
        showmenu = false; // C `:1427`
        if (res > 0) { // C `:1428`
            for (let i = 0; i < res; i++) { // C `:1429`
                idx = (picked[i].a_int | 0); // C `:1430`
                if (idx === 1) { // C `:1431–1435` sort change requested
                    game.gc.condmenu_sortorder = 1 - order;
                    showmenu = true;
                    break; // C `:1435` for loop
                }
                idx -= 2; // C `:1437`
                condtests[idx].choice = true; // C `:1438`
            }
            // C `:1441` free(picks) is GC here.
        }
    } while (showmenu); // C `:1443`
    if (res >= 0) { // C `:1445`
        for (let i = 0; i < CONDITION_COUNT; ++i) { // C `:1446`
            if (!!condtests[i].enabled !== !!condtests[i].choice) { // C `:1447`
                condtests[i].enabled = condtests[i].choice; // C `:1448`
                // C `:1449` clears test on the leftover idx, not i.
                condtests[idx].test = false;
                // C `:1450` disp.botl (hack.js:2932 precedent sets both flags).
                if (game.flags) game.flags.botl = true;
                if (game.disp) game.disp.botl = true;
                changed = true; // C `:1450`
            }
        }
    }
    return changed; // C `:1452`
}

/* ===== C ref: botl.c hilite_status option parser `:2189–2647` + `:2652–3106` + `:3171–3349` =====
 * Whole-function port of parse_status_hl2() (`:2814–3106`, the queue row)
 * with every static callee it needs, plus its sole ported caller
 * parse_status_hl1() (`:2593–2647`, both C call sites `:2616` + `:2637`).
 * STATUS_HILITES is compiled in (config.h:616), so the `#ifdef` arms are
 * live C; the `:2878` `#if 0` early-return is compiled out (not ported).
 * Callers: C bot() never touches this path; the option layer
 * (options.c `:1873` do_set, cfgfiles.c `:1173`) is still unported, so the
 * two exports below are live for those future rows. The interactive
 * chooser / field menu / remove family is below (`:3811+`, D-2757).
 * `status_hilite_menu_add` (`:3889–4302`) stays a named omission.
 * Named omissions (map): config_error_add sink (options.c; bad_negation
 * precedent in options.js) — FALSE propagation at every site is kept.
 */

// C wintype.h:128-134 — window-system text attributes. NOT the terminal.js
// display attrs (different numbering); this is the match_str2attr domain
// compared in the action loops, so the C values stay file-local here.
const C_ATR_NONE = 0;
const C_ATR_BOLD = 1;
const C_ATR_DIM = 2;
const C_ATR_ITALIC = 3;
const C_ATR_ULINE = 4;
const C_ATR_BLINK = 5;
const C_ATR_INVERSE = 7;

/* C coloratt.c:12-28 colornames[] — canonical names plus the post-sentinel
 * aliases (matched by the same loop in C, so they ride one table here).
 * The live JS color surface stays clr2colorname (artifact.js). */
const statusColorNames = [
    { name: 'black', color: CLR_BLACK }, // C :13
    { name: 'red', color: CLR_RED }, // C :14
    { name: 'green', color: CLR_GREEN }, // C :15
    { name: 'brown', color: CLR_BROWN }, // C :16
    { name: 'blue', color: CLR_BLUE }, // C :17
    { name: 'magenta', color: CLR_MAGENTA }, // C :18
    { name: 'cyan', color: CLR_CYAN }, // C :19
    { name: 'gray', color: CLR_GRAY }, // C :20
    { name: 'orange', color: CLR_ORANGE }, // C :21
    { name: 'light green', color: CLR_BRIGHT_GREEN }, // C :22
    { name: 'yellow', color: CLR_YELLOW }, // C :23
    { name: 'light blue', color: CLR_BRIGHT_BLUE }, // C :24
    { name: 'light magenta', color: CLR_BRIGHT_MAGENTA }, // C :25
    { name: 'light cyan', color: CLR_BRIGHT_CYAN }, // C :26
    { name: 'white', color: CLR_WHITE }, // C :27
    { name: 'no color', color: NO_COLOR }, // C :28
    // C :29 sentinel — everything after is an alias.
    { name: 'transparent', color: NO_COLOR }, // C :30
    { name: 'purple', color: CLR_MAGENTA }, // C :31
    { name: 'light purple', color: CLR_BRIGHT_MAGENTA }, // C :32
    { name: 'bright purple', color: CLR_BRIGHT_MAGENTA }, // C :33
    { name: 'grey', color: CLR_GRAY }, // C :34
    { name: 'bright red', color: CLR_ORANGE }, // C :35
    { name: 'bright green', color: CLR_BRIGHT_GREEN }, // C :36
    { name: 'bright blue', color: CLR_BRIGHT_BLUE }, // C :37
    { name: 'bright magenta', color: CLR_BRIGHT_MAGENTA }, // C :38
    { name: 'bright cyan', color: CLR_BRIGHT_CYAN }, // C :39
];

/* C coloratt.c:47-58 attrnames[] — canonical plus post-sentinel aliases. */
const statusAttrNames = [
    { name: 'none', attr: C_ATR_NONE }, // C :48
    { name: 'bold', attr: C_ATR_BOLD }, // C :49
    { name: 'dim', attr: C_ATR_DIM }, // C :50
    { name: 'italic', attr: C_ATR_ITALIC }, // C :51
    { name: 'underline', attr: C_ATR_ULINE }, // C :52
    { name: 'blink', attr: C_ATR_BLINK }, // C :53
    { name: 'inverse', attr: C_ATR_INVERSE }, // C :54
    // C :55 sentinel — everything after is an alias.
    { name: 'normal', attr: C_ATR_NONE }, // C :56
    { name: 'uline', attr: C_ATR_ULINE }, // C :57
    { name: 'reverse', attr: C_ATR_INVERSE }, // C :58
];

/* C botl.c:2189-2212 fieldids_alias[] — non-canonical field-name aliases. */
const fieldids_alias = [
    { fieldname: 'characteristics', fldid: BL_CHARACTERISTICS }, // C :2190
    { fieldname: 'encumbrance', fldid: BL_CAP }, // C :2191
    { fieldname: 'experience-points', fldid: BL_EXP }, // C :2192
    { fieldname: 'dx', fldid: BL_DX }, // C :2193
    { fieldname: 'co', fldid: BL_CO }, // C :2194
    { fieldname: 'con', fldid: BL_CO }, // C :2195
    { fieldname: 'points', fldid: BL_SCORE }, // C :2196
    { fieldname: 'cap', fldid: BL_CAP }, // C :2197
    { fieldname: 'pw', fldid: BL_ENE }, // C :2198
    { fieldname: 'pw-max', fldid: BL_ENEMAX }, // C :2199
    { fieldname: 'xl', fldid: BL_XP }, // C :2200
    { fieldname: 'xplvl', fldid: BL_XP }, // C :2201
    { fieldname: 'ac', fldid: BL_AC }, // C :2202
    { fieldname: 'hit-dice', fldid: BL_HD }, // C :2203
    { fieldname: 'turns', fldid: BL_TIME }, // C :2204
    { fieldname: 'hp', fldid: BL_HP }, // C :2205
    { fieldname: 'hp-max', fldid: BL_HPMAX }, // C :2206
    { fieldname: 'dgn', fldid: BL_LEVELDESC }, // C :2207
    { fieldname: 'xp', fldid: BL_EXP }, // C :2208
    { fieldname: 'exp', fldid: BL_EXP }, // C :2209
    { fieldname: 'flags', fldid: BL_CONDITION }, // C :2210
    { fieldname: null, fldid: BL_FLUSH }, // C :2211
];

// C botl.c:2816 aligntxt[] — function-static match forms for BL_ALIGN.
const statusAlignTxt = ['chaotic', 'neutral', 'lawful'];
// C botl.c:2819-2821 hutxt[] — match forms ("not hungry" has no text, hence
// the gap); hu_stat[] holds the stored values (C `:2915`).
const statusHungerTxt = [
    'Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved',
];

/* C options.c config_error_add() — config-error sink. bad_negation
 * (options.js) precedent: the message text is a named omission (map);
 * FALSE propagation at every call site below is kept. */
function config_error_add(_fmt, ..._args) {
    // Named omission (map): config_error_add sink.
}

// C stdlib atoi/atol as s_to_anything() uses them: leading whitespace,
// optional sign, digit run; 0 when no digits. One helper covers both C
// types (JS numbers hold the long range exactly).
function c_atoi(buf) {
    const m = /^\s*[+-]?\d+/.exec(String(buf ?? ''));
    return m ? parseInt(m[0], 10) : 0;
}

/* C botl.c:1930-1975 s_to_anything() — parse buf into the anything arm
 * selected by anytype. ANY_STR has no arm (default void-zero, C
 * `:1966-1969`); pointer arms write through the `{ v }` box when non-null
 * (C `:1949-1962` null guards; zeroAnything() builds null boxes). */
function s_to_anything(a, buf, anytype) {
    if (buf === null || buf === undefined || !a) return; // C :1933-1934
    const text = String(buf);
    switch (anytype) { // C :1936
    case ANY_LONG: // C :1937-1939
        a.a_long = c_atoi(text);
        break;
    case ANY_INT: // C :1940-1942
        a.a_int = c_atoi(text);
        break;
    case ANY_UINT: // C :1943-1945
        a.a_uint = c_atoi(text);
        break;
    case ANY_ULONG: // C :1946-1948
        a.a_ulong = c_atoi(text);
        break;
    case ANY_IPTR: // C :1949-1952
        if (a.a_iptr) a.a_iptr.v = c_atoi(text);
        break;
    case ANY_UPTR: // C :1953-1955
        if (a.a_uptr) a.a_uptr.v = c_atoi(text);
        break;
    case ANY_LPTR: // C :1956-1959
        if (a.a_lptr) a.a_lptr.v = c_atoi(text);
        break;
    case ANY_ULPTR: // C :1960-1962
        if (a.a_ulptr) a.a_ulptr.v = c_atoi(text);
        break;
    case ANY_MASK32: // C :1963-1965
        a.a_ulong = c_atoi(text);
        break;
    default: // C :1966-1969 (ANY_STR and anything else)
        a.a_void = 0;
        break;
    }
}

/* C botl.c:2221-2255 fldname_to_bl_indx() — canonical fuzzymatch, then
 * alias fuzzymatch, then canonical prefix; unique match wins else BL_FLUSH
 * (C `:2253`). JS `name` is the initblstats[].fldname mirror (`:703-737`). */
function fldname_to_bl_indx(name) {
    let fld = 0, nmatches = 0; // C :2224
    if (name && name[0]) { // C :2226 if (name && *name)
        for (let i = 0; i < initblstats.length; i++) { // C :2227-2231
            if (fuzzymatch(initblstats[i].name, name, ' -_', true)) {
                fld = initblstats[i].fld;
                nmatches++;
            }
        }
        if (!nmatches) { // C :2232-2240 aliases
            for (let i = 0; fieldids_alias[i].fieldname; i++) {
                if (fuzzymatch(fieldids_alias[i].fieldname, name, ' -_', true)) {
                    fld = fieldids_alias[i].fldid;
                    nmatches++;
                }
            }
        }
        if (!nmatches) { // C :2241-2251 partial canonical
            const len = name.length; // C :2243
            for (let i = 0; i < initblstats.length; i++) {
                // C :2246 !strncmpi(name, fldname, len) — name prefixes fldname.
                if (initblstats[i].name.slice(0, len).toLowerCase() === name.toLowerCase()) {
                    fld = initblstats[i].fld;
                    nmatches++;
                }
            }
        }
    }
    return nmatches === 1 ? fld : BL_FLUSH; // C :2253
}

/* C coloratt.c:348-370 match_str2clr() — fuzzy name over colornames (aliases
 * included, C `:356-361`); digit-led leftovers parse as bare numbers
 * (C `:360-361`); anything else is CLR_MAX with a sinked message. */
function match_str2clr(str, suppress_msg) {
    const s = String(str ?? '');
    let c = CLR_MAX; // C :351
    let matched = false;
    for (let i = 0; i < statusColorNames.length; i++) { // C :356-361
        if (statusColorNames[i].name
            && fuzzymatch(s, statusColorNames[i].name, ' -_', true)) {
            c = statusColorNames[i].color;
            matched = true;
            break;
        }
    }
    if (!matched && s[0] >= '0' && s[0] <= '9') c = c_atoi(s); // C :360-361 digit+atoi
    if (c < 0 || c >= CLR_MAX) { // C :363
        if (!suppress_msg) config_error_add("Unknown color '%.60s'", s); // C :364-365
        c = CLR_MAX; // C :366 none of the above
    }
    return c;
}

/* C coloratt.c:374-389 match_str2attr() — -1 when nothing matches (the hl2 /
 * parse_condition action loops read that as "try a color", C `:382`); the
 * complain message sinks. */
function match_str2attr(str, complain) {
    const s = String(str ?? '');
    let a = -1; // C :377
    for (let i = 0; i < statusAttrNames.length; i++) { // C :379-384
        if (statusAttrNames[i].name
            && fuzzymatch(s, statusAttrNames[i].name, ' -_', true)) {
            a = statusAttrNames[i].attr;
            break;
        }
    }
    if (a === -1 && complain) config_error_add("Unknown text attribute '%.50s'", s); // C :386-387
    return a;
}

// C hacklib digit() macro arm used at botl.c `:2662` + coloratt.c `:360`.
function is_digit_ch(ch) {
    return ch >= '0' && ch <= '9';
}

/* C botl.c:2652-2670 is_ltgt_percentnumber() — "[<>]?=?[-+]?[0-9]+%?" shape
 * walk; the trailing `%` is optional and the end must terminate it. */
function is_ltgt_percentnumber(str) {
    const s = String(str ?? ''); // C :2654
    let p = 0; // C pointer walk
    if (s[p] === '<' || s[p] === '>') p++; // C :2656-2657
    if (s[p] === '=') p++; // C :2658-2659
    if (s[p] === '-' || s[p] === '+') p++; // C :2660-2661
    if (!is_digit_ch(s[p])) return false; // C :2662-2663 !digit
    while (is_digit_ch(s[p])) p++; // C :2664-2665
    if (s[p] === '%') p++; // C :2666-2667
    return p >= s.length; // C :2668 *s == '\0'
}

/* C botl.c:2673-2685 has_ltgt_percentnumber() — charset-only pre-check that
 * picks the "Wrong format" message (empty string passes, C `:2677-2683`). */
function has_ltgt_percentnumber(str) {
    const s = String(str ?? ''); // C :2675
    for (const ch of s) { // C :2677-2681
        if (!'<>=-+0123456789%'.includes(ch)) return false;
    }
    return true; // C :2683
}

/* C botl.c:2688-2727 splitsubfields() — in-place '+'/'&' split over a static
 * MAX_SUBFIELDS=16 shelf; maxsf 0 means the full shelf (C `:2700`). JS
 * strings are immutable so segments are returned; null is C -1, the
 * over-capacity arm (C `:2714-2715`); null input is C 0 (C `:2695-2696`),
 * which reads as [] here (both callers treat sf < 1 as failure). */
function splitsubfields(str, maxsf) {
    const MAX_SUBFIELDS = 16; // C :2690 #define
    if (str === null || str === undefined) return []; // C :2695-2696
    const cap = (maxsf === 0) ? MAX_SUBFIELDS : Math.min(maxsf, MAX_SUBFIELDS); // C :2700
    const text = String(str);
    if (!text.includes('+') && !text.includes('&')) return [text]; // C :2721-2724
    const parts = text.split(/[+&]/); // C :2705-2713 separator cut
    if (parts.length && parts[parts.length - 1] === '') parts.pop(); // C :2716-2717 no trailing empty
    if (parts.length >= cap - 1) return null; // C :2714-2715
    return parts;
}

/* C botl.c:2730-2745 is_fld_arrayvalues() — strcmpi scan of
 * arr[arrmin..arrmax); C reports through int *retidx, JS returns the hit
 * index or -1. */
function is_fld_arrayvalues(str, arr, arrmin, arrmax) {
    const s = String(str ?? '');
    for (let i = arrmin; i < arrmax; i++) { // C :2737
        if (strcmpi_fold(s, arr[i] ?? '') === 0) return i; // C :2738-2741 !strcmpi
    }
    return -1; // C :2743 FALSE
}

/* C botl.c:2784-2811 status_hilite_add_threshold() — copy the rule onto the
 * end of gb.blstats[0][fld].thresholds and mirror the chain into row 1
 * (C `:2808-2810`; sort_hilites() is commented out in C, `:2806`). C
 * gb.blstats is static storage; JS builds the two-row shelf on demand so a
 * threshold parsed before init_blstats() still lands where get_hilite()
 * (`:2377` chain walk) reads it. */
function status_hilite_add_threshold(fld, hilite) {
    if (!hilite) return; // C :2787-2789
    if (!game.gb) game.gb = {};
    if (!game.gb.blstats) game.gb.blstats = [new Array(MAXBLSTATS), new Array(MAXBLSTATS)];
    for (let row = 0; row <= 1; row++) {
        if (!game.gb.blstats[row][fld]) game.gb.blstats[row][fld] = { thresholds: null };
    }
    const new_hilite = { // C :2792-2793 alloc + struct copy
        ...hilite,
        value: { ...hilite.value },
        set: true, // C :2795
        fld, // C :2796
        next: null, // C :2797
    };
    const chain = game.gb.blstats[0][fld];
    if (!chain.thresholds) { // C :2799-2800
        chain.thresholds = new_hilite;
    } else { // C :2801-2805 end insert
        let old = chain.thresholds;
        while (old.next) old = old.next;
        old.next = new_hilite;
    }
    game.gb.blstats[1][fld].thresholds = game.gb.blstats[0][fld].thresholds; // C :2808-2810
}

/* C botl.c:2814-3106 parse_status_hl2() — one hilite_status entry (already
 * split on ' ' by parse_status_hl1) into field + threshold/action runs. s is
 * the hsbuf array (C `char (*)[QBUFSZ]`); slots past the entry read ''
 * (C zeroes every slot, `:2604-2606`). from_configfile only rides the
 * BL_CHARACTERISTICS recursion (C `:2852`) — the body never reads it. */
export function parse_status_hl2(s, from_configfile) {
    let sidx = 0, i = -1, dt = ANY_INVALID; // C :2823
    let coloridx = -1, successes = 0; // C :2824
    let disp_attrib = 0; // C :2825
    let percent, changed, numeric, down, up, // C :2826-2827
        grt, lt, gte, le, eq, txtval, always, criticalhp;
    let txt; // C :2828
    let fld = BL_FLUSH; // C :2829
    let hilite; // C :2830 botl.h:265-274 struct hilite_s
    // C :2831 tmpbuf[BUFSZ] — stripchars() returns a fresh string (hacklib precedent).

    // C :2833-2839 3.6.1 examples; :2841-2843 field-name comment.
    fld = fldname_to_bl_indx(s[sidx] ?? ''); // C :2845

    if (fld === BL_CHARACTERISTICS) { // C :2846-2856
        let res = false; // C :2847
        // C :2848 BL_CHARACTERISTICS aliases BL_STR..BL_CH (botl.h:44).
        for (fld = BL_STR; fld <= BL_CH; fld++) { // C :2849-2850 (JS values consecutive, const.js:765-770)
            s[sidx] = initblstats[fld].name; // C :2851 Strcpy(s[sidx], initblstats[fld].fldname)
            res = parse_status_hl2(s, from_configfile); // C :2852
            if (!res) return false; // C :2853-2854
        }
        return true; // C :2856
    }
    if (fld === BL_FLUSH) { // C :2858-2861
        config_error_add("Unknown status field '%s'", s[sidx]); // C :2859
        return false; // C :2860
    }
    if (fld === BL_CONDITION) return parse_condition(s, sidx); // C :2862-2863

    ++sidx; // C :2865
    while ((s[sidx] ?? '')[0]) { // C :2866 while (s[sidx][0])
        let kidx = -1; // C :2867-2872 subfield decls (buf/subfields/sf/kidx)
        txt = null; // C :2873-2878 txt = 0 + flag inits
        percent = numeric = always = false;
        down = up = changed = false;
        criticalhp = false;
        grt = gte = eq = le = lt = txtval = false;
        // C :2879-2883 #if 0 — compiled out, not ported.
        hilite = { // C :2881 memset zero
            fld: 0, set: false, anytype: 0, value: zeroAnything(),
            behavior: 0, textmatch: '', rel: 0, coloridx: 0, next: null,
        };
        hilite.set = false; // C :2882 mark it "unset"
        hilite.fld = fld; // C :2883
        const cur = s[sidx] ?? ''; // threshold token
        const nxt = (sidx + 1 < s.length ? s[sidx + 1] : '') ?? ''; // C :2884 *s[sidx+1]
        if (nxt === '' || strcmpi_fold(cur, 'always') === 0) { // C :2884-2889 field/always/color OR field/color
            always = true; // C :2887
            if (nxt === '') sidx--; // C :2888
        } else if (strcmpi_fold(cur, 'up') === 0 || strcmpi_fold(cur, 'down') === 0) { // C :2890-2901
            if (initblstats[fld].anytype === ANY_STR) { // C :2891
                ; // C :2892-2896 ordered-string note — changed below, no reject
            } else if (strcmpi_fold(cur, 'down') === 0) down = true; // C :2897-2898
            else up = true; // C :2899-2900
            changed = true; // C :2901
        } else if (fld === BL_CAP // C :2902-2907
            && (kidx = is_fld_arrayvalues(cur, enc_stat, SLT_ENCUMBER, OVERLOADED + 1)) >= 0) {
            txt = enc_stat[kidx]; // C :2906
            txtval = true; // C :2907
        } else if (fld === BL_ALIGN // C :2908-2911
            && (kidx = is_fld_arrayvalues(cur, statusAlignTxt, 0, 3)) >= 0) {
            txt = statusAlignTxt[kidx]; // C :2910
            txtval = true; // C :2911
        } else if (fld === BL_HUNGER // C :2912-2916
            && (kidx = is_fld_arrayvalues(cur, statusHungerTxt, SATIATED, STARVED + 1)) >= 0) {
            txt = hu_stat[kidx]; // C :2915 store hu_stat[] val, not hutxt[]
            txtval = true; // C :2916
        } else if (strcmpi_fold(cur, 'changed') === 0) { // C :2917-2918
            changed = true; // C :2918
        } else if (fld === BL_HP && strcmpi_fold(cur, 'criticalhp') === 0) { // C :2919-2920
            criticalhp = true; // C :2920
        } else if (is_ltgt_percentnumber(cur)) { // C :2921-2964
            let tmp = cur; // C :2922-2925 is_ltgt_() guarantees [<>]?=?[-+]?[0-9]+%?
            if (tmp.includes('%')) percent = true; // C :2926 strchr
            if (tmp[0] === '<') { // C :2927-2928
                if (tmp[1] === '=') le = true; // C :2929
                else lt = true; // C :2930-2931
            } else if (tmp[0] === '>') { // C :2932-2933
                if (tmp[1] === '=') gte = true; // C :2934
                else grt = true; // C :2935-2936
            }
            // C :2937-2941 %,<,> served out; =,+ decorative — strip to -?[0-9]+.
            tmp = stripchars(null, '%<>=+', tmp); // C :2942
            numeric = true; // C :2943
            dt = percent ? ANY_INT : initblstats[fld].anytype; // C :2944
            s_to_anything(hilite.value, tmp, dt); // C :2945 (void)
            // C :2946 op string — message-only (sink), not kept.
            if (dt === ANY_INT // C :2947-2957
                // C :2949-2951 AC alone takes negatives; >-1 elsewhere; <0 rejected (non-AC)
                && (hilite.value.a_int < (fld === BL_AC ? -128 : grt ? -1 : lt ? 1 : 0)
                    // C :2952-2954 percentages re-checked below; absolute capped at LARGEST_INT
                    || hilite.value.a_int > (percent ? (lt ? 101 : 100) : LARGEST_INT))) {
                config_error_add('threshold out of range'); // C :2955 threshold_value/op/is_out_of_range
                return false; // C :2956-2957
            } else if (dt === ANY_LONG // C :2958-2962
                && hilite.value.a_long < (grt ? -1 : lt ? 1 : 0)) {
                config_error_add('threshold out of range'); // C :2961
                return false; // C :2962
            }
        } else if (initblstats[fld].anytype === ANY_STR) { // C :2965-2967
            txt = cur; // C :2966
            txtval = true; // C :2967
        } else { // C :2968-2974
            config_error_add(has_ltgt_percentnumber(cur) // C :2969-2972
                ? "Wrong format '%s', expected a threshold number or percent"
                : "Unknown behavior '%s'");
            return false; // C :2973-2974
        }

        // C :2976 relationships {LT_VALUE, LE_VALUE, EQ_VALUE, GE_VALUE, GT_VALUE}.
        // (eq is never set above — mirrored; it still reads in the chain.)
        if (grt || up) hilite.rel = GT_VALUE; // C :2977-2978
        else if (lt || down) hilite.rel = LT_VALUE; // C :2979-2980
        else if (gte) hilite.rel = GE_VALUE; // C :2981-2982
        else if (le) hilite.rel = LE_VALUE; // C :2983-2984
        else if (eq || percent || numeric || changed) hilite.rel = EQ_VALUE; // C :2985-2986
        else if (txtval) hilite.rel = TXT_VALUE; // C :2987-2988
        else hilite.rel = LT_VALUE; // C :2989-2990

        if (initblstats[fld].anytype === ANY_STR && (percent || numeric)) { // C :2992-2994
            config_error_add("Field '%s' does not support numeric values"); // C :2993
            return false; // C :2994
        }

        if (percent) { // C :2995-3025
            if (initblstats[fld].idxmax < 0) { // C :2996-2999
                config_error_add("Cannot use percent with '%s'"); // C :3000
                return false; // C :3001
            } else if ((hilite.value.a_int < -1) // C :3002-3012
                || (hilite.value.a_int === -1 && hilite.value.a_int !== GT_VALUE)
                || (hilite.value.a_int === 0 && hilite.rel === LT_VALUE)
                || (hilite.value.a_int === 100 && hilite.rel === GT_VALUE)
                || (hilite.value.a_int === 101 && hilite.value.a_int !== LT_VALUE)
                || (hilite.value.a_int > 101)) {
                config_error_add("hilite_status: invalid percentage value '%s%d%%'"); // C :3013-3023
                return false; // C :3024-3025
            }
        }

        // C :3026 actions.
        sidx++; // C :3026
        let how = sidx < s.length ? s[sidx] : null; // C :3027 how = s[sidx]
        if (how === null || how === undefined) { // C :3028 if (!how) — dead in-bounds (hsbuf zeroed)
            if (!successes) return false; // C :3028-3030
            how = ''; // past-end: C reads OOB (UB); empty folds into bad-color FALSE below
        }
        coloridx = -1; // C :3031
        // C :3032-3033 Strcpy(buf, how) — JS strings immutable; split reads how.
        const subfields = splitsubfields(how, 0); // C :3034 sf = splitsubfields(buf, &subfields, 0)
        const sf = subfields === null ? -1 : subfields.length;
        if (sf < 1) return false; // C :3035-3037 (covers the -1 overflow too)
        disp_attrib = HL_UNDEF; // C :3039
        for (i = 0; i < sf; ++i) { // C :3040-3041
            const a = match_str2attr(subfields[i], false); // C :3042
            if (a === C_ATR_BOLD) disp_attrib |= HL_BOLD; // C :3043-3044
            else if (a === C_ATR_DIM) disp_attrib |= HL_DIM; // C :3045-3046
            else if (a === C_ATR_ITALIC) disp_attrib |= HL_ITALIC; // C :3047-3048
            else if (a === C_ATR_ULINE) disp_attrib |= HL_ULINE; // C :3049-3050
            else if (a === C_ATR_BLINK) disp_attrib |= HL_BLINK; // C :3051-3052
            else if (a === C_ATR_INVERSE) disp_attrib |= HL_INVERSE; // C :3053-3054
            else if (a === C_ATR_NONE) disp_attrib = HL_NONE; // C :3055-3056
            else { // C :3057-3066 (a == -1 falls here too)
                const cc = match_str2clr(subfields[i], false); // C :3059
                if (cc >= CLR_MAX || coloridx !== -1) { // C :3060-3062
                    config_error_add("bad color '%d %d'"); // C :3063
                    return false; // C :3064-3066
                }
                coloridx = cc; // C :3065
            }
        }
        if (coloridx === -1) coloridx = NO_COLOR; // C :3069
        hilite.coloridx = coloridx | (disp_attrib << 8); // C :3072
        if (always) hilite.behavior = BL_TH_ALWAYS_HILITE; // C :3075-3076
        else if (percent) hilite.behavior = BL_TH_VAL_PERCENTAGE; // C :3077-3078
        else if (changed) hilite.behavior = BL_TH_UPDOWN; // C :3079-3080
        else if (numeric) hilite.behavior = BL_TH_VAL_ABSOLUTE; // C :3081-3082
        else if (txtval) hilite.behavior = BL_TH_TEXTMATCH; // C :3083-3084
        else if (unionNonzero(hilite.value)) hilite.behavior = BL_TH_VAL_ABSOLUTE; // C :3085-3086 (a_void)
        else if (criticalhp) hilite.behavior = BL_TH_CRITICALHP; // C :3087-3088
        else hilite.behavior = BL_TH_NONE; // C :3089-3090
        hilite.anytype = dt; // C :3091
        if (hilite.behavior === BL_TH_TEXTMATCH && txt) { // C :3092-3097
            hilite.textmatch = String(txt).slice(0, MAXVALWIDTH - 1); // C :3094 strncpy + [sizeof-1] = 0
            // C :3096 (void) trimspaces — the shifted return is discarded, so
            // leading space stays and only the trailing strip lands.
            hilite.textmatch = hilite.textmatch.replace(/[ \t]+$/, ''); // (hacklib.c trimspaces)
        }
        status_hilite_add_threshold(fld, hilite); // C :3099
        successes++; // C :3101
        sidx++; // C :3102-3103
    }
    return successes > 0; // C :3105
}

/* C botl.c:2593-2647 parse_status_hl1() — the hilite_status entry splitter:
 * lowercase into hsbuf[MAX_THRESH] fields on '/', flush one entry per ' '
 * (titles keep their spaces, C `:2611-2615`), then hand each entry to
 * parse_status_hl2() (C `:2616` + `:2637`). */
export function parse_status_hl1(op, from_configfile) {
    const MAX_THRESH = 21; // C :2597 #define
    const hsbuf = new Array(MAX_THRESH).fill(''); // C :2598 + :2604-2606 zero
    let rslt, badopt = false; // C :2599
    let i, fldnum, ccount = 0; // C :2600
    let c; // C :2600
    fldnum = 0; // C :2602
    let p = 0; // cursor over op (C `*op`/`op++`)
    const text = String(op ?? '');
    while (p < text.length && fldnum < MAX_THRESH && ccount < (QBUFSZ - 2)) { // C :2607
        c = lowc(text[p]); // C :2608
        if (c === ' ') { // C :2609
            if (fldnum >= 1) { // C :2610
                if (hsbuf[0] === 'title') { // C :2611 strcmpi — buffer already lowered
                    hsbuf[fldnum] += c; // C :2613-2614 hsbuf[fldnum][ccount++] = c (+NUL)
                    ccount++; // C :2613
                    p++; // C :2615 op++
                    continue; // C :2615
                }
                rslt = parse_status_hl2(hsbuf, from_configfile); // C :2616
                if (!rslt) { // C :2617
                    badopt = true; // C :2618
                    break; // C :2619
                }
            }
            for (i = 0; i < MAX_THRESH; ++i) hsbuf[i] = ''; // C :2620-2623
            fldnum = 0; // C :2624
            ccount = 0; // C :2625
        } else if (c === '/') { // C :2626
            fldnum++; // C :2627
            ccount = 0; // C :2628
        } else { // C :2629
            hsbuf[fldnum] += c; // C :2630-2631 hsbuf[fldnum][ccount++] = c (+NUL)
            ccount++; // C :2630
        }
        p++; // C :2633 op++
    }
    if (fldnum >= 1 && !badopt) { // C :2636
        rslt = parse_status_hl2(hsbuf, from_configfile); // C :2637
        if (!rslt) badopt = true; // C :2638-2639
    }
    if (badopt) return false; // C :2640-2641
    // C :2642-2645 highlighting On; short duration for temp highlights.
    if (!game.iflags) game.iflags = {};
    if (!game.iflags.hilite_delta) game.iflags.hilite_delta = 3;
    return true; // C :2646
    // C :2647 #undef MAX_THRESH.
}

/* gc.cond_hilites[] shelf (C decl.h:228 [BL_ATTCLR_MAX], zero-init): the only
 * JS producer is parse_condition() below; readers use ?? []. */
function ensureCondHilites() {
    if (!game.gc) game.gc = {}; // C decl.h:223 instance_globals_c (cond_menu precedent)
    if (!game.gc.cond_hilites) game.gc.cond_hilites = new Array(BL_ATTCLR_MAX).fill(0);
    return game.gc.cond_hilites;
}

/* C botl.c:3171-3206 match_str2conditionbitmask() — canonical text[0]
 * fuzzymatch, then alias fuzzymatch, then alias prefix; ORs every hit
 * (0 when nothing matches, C `:3205`). */
function match_str2conditionbitmask(str) {
    let mask = 0; // C :3174
    let nmatches = 0; // C :3173
    const s = String(str ?? '');
    if (s && s[0]) { // C :3176 if (str && *str)
        for (let i = 0; i < conditions.length; i++) { // C :3178-3182 SIZE(conditions)
            if (fuzzymatch(conditions[i].text[0], s, ' -_', true)) {
                mask |= conditions[i].mask;
                nmatches++;
            }
        }
        if (!nmatches) { // C :3184-3191 aliases
            for (let i = 0; i < condition_aliases.length; i++) {
                if (fuzzymatch(condition_aliases[i].id, s, ' -_', true)) {
                    mask |= condition_aliases[i].bitmask;
                    nmatches++;
                }
            }
        }
        if (!nmatches) { // C :3193-3203 partial alias
            const len = s.length; // C :3195
            for (let i = 0; i < condition_aliases.length; i++) {
                // C :3197 !strncmpi(str, id, len) — str prefixes the alias.
                if (condition_aliases[i].id.slice(0, len).toLowerCase() === s.toLowerCase()) {
                    mask |= condition_aliases[i].bitmask;
                    nmatches++;
                }
            }
        }
    }
    return mask; // C :3205
}

/* C botl.c:3209-3230 str2conditionbitmask() — '+'/'&' split (capped at
 * SIZE(conditions) → 16 by splitsubfields `:2700`); an unknown member sinks
 * a message and zeroes the whole mask (C `:3223-3225`). */
function str2conditionbitmask(str) {
    let conditions_bitmask = 0; // C :3211
    const subfields = splitsubfields(str, conditions.length); // C :3215
    const sf = subfields === null ? -1 : subfields.length;
    if (sf < 1) return 0; // C :3217-3218
    for (let i = 0; i < sf; ++i) { // C :3220
        const bm = match_str2conditionbitmask(subfields[i]); // C :3221
        if (!bm) { // C :3223
            config_error_add("Unknown condition '%s'", subfields[i]); // C :3224
            return 0; // C :3225
        }
        conditions_bitmask |= bm; // C :3227
    }
    return conditions_bitmask; // C :3229
}

/* C botl.c:3233-3349 parse_condition() — `condition/<conds>/<colors>` runs:
 * bitmask the conditions, then OR the mask into gc.cond_hilites[] under the
 * parsed color index and every parsed attribute index.
 * C :3245-3255 3.6.1 example + TODO? design note kept as cite. */
function parse_condition(s, sidx) {
    let i; // C :3236 loop index
    let coloridx = NO_COLOR; // C :3237
    let tmp, how; // C :3238
    let conditions_bitmask = 0; // C :3239
    let result = false; // C :3240
    if (!s) return false; // C :3242-3243
    sidx++; // C :3256
    if (!((s[sidx] ?? '')[0])) { // C :3257 !s[sidx][0]
        config_error_add('Missing condition(s)'); // C :3258
        return false; // C :3259
    }
    while (((s[sidx] ?? '')[0])) { // C :3261 while (s[sidx][0])
        tmp = s[sidx]; // C :3265
        // C :3266-3267 Strcpy(buf, tmp) folded — JS strings immutable.
        conditions_bitmask = str2conditionbitmask(tmp);
        if (!conditions_bitmask) return false; // C :3269-3270
        // C :3272-3284 why an array of bitmasks — kept as cite.
        sidx++; // C :3286 actions
        how = s[sidx]; // C :3286-3287
        if (!how) { // C :3288 !how || !*how
            config_error_add('Missing color+attribute'); // C :3289
            return false; // C :3290
        }
        // C :3291-3293 Strcpy(buf, how) folded; :3295-3312 representation note.
        const subfields = splitsubfields(how, 0) ?? []; // -1 overflow: loop skips, mask still lands (C `:2714` + `:3343`)
        const condhilites = ensureCondHilites();
        for (i = 0; i < subfields.length; ++i) { // C :3314
            const a = match_str2attr(subfields[i], false); // C :3315
            if (a === C_ATR_BOLD) condhilites[HL_ATTCLR_BOLD] |= conditions_bitmask; // C :3316-3318
            else if (a === C_ATR_DIM) condhilites[HL_ATTCLR_DIM] |= conditions_bitmask; // C :3319-3320
            else if (a === C_ATR_ITALIC) condhilites[HL_ATTCLR_ITALIC] |= conditions_bitmask; // C :3321-3322
            else if (a === C_ATR_ULINE) condhilites[HL_ATTCLR_ULINE] |= conditions_bitmask; // C :3323-3324
            else if (a === C_ATR_BLINK) condhilites[HL_ATTCLR_BLINK] |= conditions_bitmask; // C :3325-3326
            else if (a === C_ATR_INVERSE) condhilites[HL_ATTCLR_INVERSE] |= conditions_bitmask; // C :3327-3328
            else if (a === C_ATR_NONE) { // C :3329-3337 clear every attribute bit
                condhilites[HL_ATTCLR_BOLD] &= ~conditions_bitmask;
                condhilites[HL_ATTCLR_DIM] &= ~conditions_bitmask;
                condhilites[HL_ATTCLR_ITALIC] &= ~conditions_bitmask;
                condhilites[HL_ATTCLR_ULINE] &= ~conditions_bitmask;
                condhilites[HL_ATTCLR_BLINK] &= ~conditions_bitmask;
                condhilites[HL_ATTCLR_INVERSE] &= ~conditions_bitmask;
            } else { // C :3338-3342 (a == -1 falls here too)
                const k = match_str2clr(subfields[i], false); // C :3340
                if (k >= CLR_MAX) { // C :3341-3342
                    config_error_add('bad color %d', k); // C :3343
                    return false; // C :3344
                }
                coloridx = k; // C :3345
            }
        }
        // C :3340-3343 comment — bits land under the chosen color index.
        condhilites[coloridx] |= conditions_bitmask; // C :3343
        result = true; // C :3344
        sidx++; // C :3345
    }
    return result; // C :3347
}

// C botl.c:860-909 terrain_descr[] — indexed by iflags.terrain_typ;
// MAX_TYPE (37) is "" ("skipped rather than overloaded"); entries past 38
// are classify_terrain() pseudo-types, not levl[][].typ values.
const _Wall = 'Wall';
export const terrain_descr = [
    'Stone', // C :865 stone
    _Wall, _Wall, _Wall, _Wall, _Wall, _Wall, // C :866-871 vwall,hwall,corners
    _Wall, _Wall, _Wall, _Wall, _Wall, // C :872-876 crosswall,tuwall,tdwall,tlwall,trwall
    'Portcullis', // C :877 dbwall
    'Tree', // C :878
    _Wall, // C :879 sdoor
    'Stone', // C :880 scorr
    'Pool', // C :881
    'Moat', // C :882
    'Water', // C :883 Water level
    '(gap)', // C :884 drawbridge_up
    'Lava', // C :885 lavapool
    'LavaWall', // C :886
    'Bars', // C :887 ironbars
    'Doorway', // C :888
    'Corridor', // C :889 (replaced by "Floor")
    'Room', // C :890 (replaced by "Floor")
    'Stairs', // C :891
    'Ladder', // C :892
    'Fountain', // C :893
    'Throne', // C :894
    'Sink', // C :895
    'Grave', // C :896
    'Altar', // C :897
    'Ice', // C :898
    'Bridge', // C :899 drawbridge_down
    'Air', // C :900
    'Cloud', // C :901
    '', // C :903 MAX_TYPE
    _Wall, // C :904 MATCH_WALL
    'Floor', // C :909 room/corridor substitute
    'Ground', // C :910 Earth level room
    'Open-door', // C :911
    'Shut-door', // C :912
    'Swamp', // C :913 Juiblex level
    'Submerged', // C :914 under water
    'Sea', // C :915 Medusa shallow sea
    'WaterWall', // C :916
];

// C botl.c:919-921 cache statics for the multi<0 condition arms, plus
// gn.now_or_before_idx (decl.c zero-init) toggled by bot_via_windowport().
let now_or_before_idx = 0;
let cache_avail = [false, false, false];
let cache_reslt = [false, false, false];
let cache_nomovemsg = null;
let cache_multi_reason = null;

// C traditional highc() — ASCII uppercase only.
function highc(c) {
    return (c >= 'a' && c <= 'z') ? String.fromCharCode(c.charCodeAt(0) - 32) : c;
}

// C botl.c:1147 test_if_enabled(c) — assign only when the option enables it.
function setIfEnabled(c, v) {
    if (condtests[c].enabled) condtests[c].test = v;
}

// C botl.c:923-951 cond_cache_prepA() — refresh the unconsc/parlyz message
// cache when multi<0 with a live message, else clear it. JS reads the
// flattened game.nomovemsg/game.multi_reason (apply.js precedent).
function cond_cache_prepA() {
    let clear_cache = false, refresh_cache = false;
    if ((game.multi | 0) < 0) { // C :927
        if (game.nomovemsg || game.multi_reason) { // C :928
            if (cache_nomovemsg !== game.nomovemsg) // C :929-930
                refresh_cache = true;
            if (cache_multi_reason !== game.multi_reason) // C :931-932
                refresh_cache = true;
        } else { // C :933-934
            clear_cache = true;
        }
    } else { // C :936-937
        clear_cache = true;
    }
    if (clear_cache) { // C :939-941
        cache_nomovemsg = null;
        cache_multi_reason = null;
    }
    if (refresh_cache) { // C :943-945
        cache_nomovemsg = game.nomovemsg;
        cache_multi_reason = game.multi_reason;
    }
    if (clear_cache || refresh_cache) { // C :947-949
        cache_reslt[0] = cache_avail[0] = false;
        cache_reslt[1] = cache_avail[1] = false;
    }
}

// C botl.c:361-364 rank() (staticfn) — role rank title for the unpoly'd hero.
function rank() {
    const u = game.u ?? {};
    return rank_of(u.ulevel | 0, game.urole?.mnum, !!(game.flags?.female));
}

/**
 * C ref: botl.c max_rank_sz `:402–415` — widest role rank-title string
 * into gm.mrank_sz (C reads gu.urole.rank[9]; JS game.urole.title, with the
 * rank_of fallback when the shape is thin). C's in-tree callers are
 * u_init.c:1033, restore.c:908 and polyself.c change_sex :287.
 */
export function max_rank_sz() {
    let role = game.urole || null; // C: gu.urole
    if (!role?.name?.m) role = roles.find(r => r.mnum === (game.urole?.mnum | 0)) || null;
    const titles = role?.title || role?.rank;
    const list = Array.isArray(titles) ? titles
        : (titles ? [titles] : (role?.name ? [{ m: role.name.m, f: role.name.f }] : []));
    let maxr = 0; // C: size_t maxr = 0
    for (let i = 0; i < 9; i++) { // C :407
        const t = list[i];
        if (!t) continue;
        if (t.m && t.m.length > maxr) maxr = t.m.length; // C :408-409 strlen
        if (t.f && t.f.length > maxr) maxr = t.f.length; // C :410-411 strlen
    }
    if (!game.gm) game.gm = {};
    game.gm.mrank_sz = maxr | 0; // C :413 (int) maxr
}

/**
 * C ref: botl.c title_to_mon `:367–399` — match a rank title prefix.
 * Loops roles[] (sentinel: missing name.m), 9 rank slots each, male then
 * female title, ASCII-caseblind prefix (str_start_is TRUE). Out-params are
 * optional boxes ({ value }); the sole C caller (mondata.c:1075) passes
 * only the length box. C roles[].rank is JS role.title (rank_of precedent).
 * @param {string} str article-stripped, singularized input (already processed)
 * @param {{value:number}|null} rankBox receives the 0–8 rank index
 * @param {{value:number}|null} lenBox receives the matched title length
 */
export function title_to_mon(str, rankBox = null, lenBox = null) {
    const s = String(str ?? '');
    for (let i = 0; roles[i] && roles[i].name && roles[i].name.m; i++) {
        const titles = roles[i].title || roles[i].rank || [];
        for (let j = 0; j < 9; j++) {
            const t = titles[j];
            if (!t) continue;
            if (t.m && str_start_is(s, t.m, true)) {
                if (rankBox) rankBox.value = j;
                if (lenBox) lenBox.value = t.m.length;
                return roles[i].mnum;
            }
            if (t.f && str_start_is(s, t.f, true)) {
                if (rankBox) rankBox.value = j;
                if (lenBox) lenBox.value = t.f.length;
                return roles[i].mnum;
            }
        }
    }
    if (lenBox) lenBox.value = 0;
    return NON_PM;
}

// Otyp constants with no const.js export (invent.js objectNames.indexOf
// precedent, C objclass oo).
const OTYP_AKLYS = objectNames.indexOf('AKLYS');
const OTYP_CREAM_PIE = objectNames.indexOf('CREAM_PIE');
const OTYP_RIN_PROTECTION = objectNames.indexOf('RIN_PROTECTION');
const OTYP_AMULET_OF_GUARDING = objectNames.indexOf('AMULET_OF_GUARDING');
const OTYP_GOLD_PIECE = objectNames.indexOf('GOLD_PIECE');

// C windows.c:1428-1435 encglyph() — "\GXXXXNNNN" glyph encoding: 4 uppercase
// hex digits of svc.context.rndencode, then 4 of the glyph. C %04X prints
// wider values whole (no truncation); >>>0 matches %X's unsigned read.
export function encglyph(glyph) {
    const hex4 = (n) => ((n | 0) >>> 0).toString(16).toUpperCase().padStart(4, '0');
    return '\\G' + hex4(game.svc?.context?.rndencode) + hex4(glyph);
}

// C version.c:89-155 status_version() — "<game> <branch> <x.y.z>" version
// text for status lines. C fills the caller's buffer (Snprintf-capped at
// bufsz); JS returns the string, sliced to bufsz - 1 like the C truncation.
// VERS_GAME_NAME is unset (C :100-104 takes nh_basename(gh.hname) then);
// JS has no gh.hname, so a missing name disables showname exactly as C's
// `!name || !*name` arm does. Likewise a missing nomakedefs.git_branch
// disables showbranch (C :110-115).
export function status_version(bufsz, indent) {
    const vflags = (game.flags?.versinfo | 0); // C :93
    let shownum = (vflags & VI_NUMBER) !== 0; // C :94
    let showname = (vflags & VI_NAME) !== 0; // C :95
    let showbranch = (vflags & VI_BRANCH) !== 0; // C :96
    let name = null, altname = null;
    if (showname) { // C :99-104
        const hname = game.gh?.hname;
        name = hname ? String(hname).split('/').pop() : null; // C nh_basename
        if (!name) // C :103-104 shouldn't-happen arm
            showname = false;
    }
    if (showbranch) { // C :107-115
        altname = game.nomakedefs?.git_branch ?? null;
        if (!altname)
            showbranch = false;
    }
    if (showname && showbranch) { // C :116-128
        // C :117 !strncmpi(name, altname, strlen(name)) — game name is a
        // prefix of (or same as) the branch name, omit the game name.
        if (altname.slice(0, name.length).toLowerCase() === name.toLowerCase())
            showname = false;
    } else if (!showname && !showbranch) { // C :129-132
        shownum = true;
    }
    let buf = ''; // C :134 *buf = '\0'
    let indentation = indent ? ' ' : ''; // C :135
    if (showname) { // C :136-139
        buf += indentation + name;
        indentation = ' ';
    }
    if (showbranch) { // C :140-143
        buf += indentation + altname;
        indentation = ' ';
    }
    if (shownum) { // C :144-150
        const vs = game.nomakedefs?.version_string;
        buf += indentation + ((vs && vs[0]) ? vs : mdlib_version_string('.'));
    }
    return buf.slice(0, (bufsz | 0) - 1);
}

// C botl.c:481-557 weapon_status() — weapon description for status lines.
// C fills the caller's out-buffer and returns it; JS returns the string.
// "2H-" prefix + first-letter capitalization + space-to-dash substitution
// operate on the assembled buffer in C order (:544-551).
export function weapon_status() {
    const u = game.u ?? {};
    const uwep = u.uwep ?? null;
    let res;
    if (!uwep) { // C :486-491 no weapon
        res = u.uarmg ? 'Empty-hnd' // C :488 gloves imply hands
            : humanoid(game.youmonst?.data) ? 'Bare-hnds' // C :489 humanoid
            : 'No-weapon';
    } else if (u.twoweap) { // C :492-499 two-weaponing
        res = 'Dual-weps';
        // C :497-499 dual lances joust when mounted
        if (u.usteed && (weapon_type(uwep) === P_LANCE
                         || weapon_type(u.uswapwep) === P_LANCE))
            res = 'Dual+joust';
    } else {
        const skill = weapon_type(uwep); // C :505
        if (u.usteed && skill === P_LANCE) { // C :507-509 mounted lance
            res = 'joust';
        } else if ((uwep.otyp | 0) === OTYP_AKLYS) { // C :510-515 aklys
            res = 'aklys';
        } else if (is_sword(uwep)) { // C :516-519 simplify sword kinds
            res = 'sword';
        } else { // C :520-542 shorten several
            switch (skill) {
            case P_QUARTERSTAFF:
                res = 'staff'; // C :524-525
                break;
            case P_MORNING_STAR:
                res = 'mrng-star'; // C :526-527
                break;
            case P_POLEARMS:
                res = 'pole'; // C :528-529
                break;
            case P_UNICORN_HORN:
                res = 'unihorn'; // C :530-531
                break;
            default:
                res = weapon_descr(uwep); // C :533 skill or class name
                // C :535-536 wielded cream pie reads as food
                if (res.toLowerCase() === 'food' && (uwep.otyp | 0) === OTYP_CREAM_PIE)
                    res = 'pie';
                break;
            }
        }
        // C :544-546 bimanual weapons take a "2H-" prefix unless already
        // numbered ("2...") or "two...".
        let out = ((uwep.oclass === WEAPON_CLASS || is_weptool(uwep))
                   && bimanual(uwep) && res.charAt(0) !== '2'
                   && res.slice(0, 3).toLowerCase() !== 'two') ? '2H-' : '';
        // C :547-548 append res, capitalize its first letter (p = eos).
        out += (res.length ? highc(res.charAt(0)) + res.slice(1) : res);
        // C :551 no embedded spaces on the status line.
        res = strNsubst(out, ' ', '-', 0);
    }
    return res;
}

// C botl.c:559-625 armor_status() — armor description for status lines.
// C fills the caller's buffer and returns upstart() of it; JS returns the
// upstart() string. strkitten(armbuf, '+') is a single-char append.
export function armor_status() {
    const u = game.u ?? {};
    // C :562 slot count.
    const n = (!!u.uarmg + !!u.uarmc + !!u.uarm + !!u.uarmu
               + !!u.uarmh + !!u.uarmf + !!u.uarms);
    let armbuf;
    if (n === 0) { // C :568-569 no armor
        armbuf = 'naked';
    } else if (n === 1) { // C :570-577 just one piece, spelled out
        armbuf = u.uarmg ? 'gloves'
            : u.uarmc ? 'cloak'
            : u.uarm ? 'suit'
            : u.uarmu ? 'shirt'
            : u.uarmh ? helm_simple_name(u.uarmh) // C :574 hat|helm
            : u.uarmf ? 'boots'
            : u.uarms ? 'shield'
            : ''; // C :577 not possible
    } else { // C :578-595 letter per slot, gloves first
        let letters = '';
        if (u.uarmg) letters += 'G'; // C :583
        if (u.uarmc) letters += 'C'; // C :585
        if (u.uarm) letters += 'A'; // C :587 suit ('s' is shield)
        if (u.uarmu) letters += 'U'; // C :589
        if (u.uarmh) letters += 'H'; // C :591
        if (u.uarmf) letters += 'B'; // C :593 boots
        if (u.uarms) letters += 'S'; // C :595 shield
        armbuf = letters;
    }
    // C :603-610 magical-protection hint ('+' when augmented).
    if (((u.uright?.otyp | 0) === OTYP_RIN_PROTECTION && u.uright)
        || ((u.uleft?.otyp | 0) === OTYP_RIN_PROTECTION && u.uleft)
        || ((u.uamul?.otyp | 0) === OTYP_AMULET_OF_GUARDING && u.uamul)
        || ((u.uarmc?.otyp | 0) === CLOAK_OF_PROTECTION && u.uarmc)
        || (u.uarmh?.oartifact === ART_MITRE_OF_HOLINESS && u.uarmh)
        || (u.uwep?.oartifact === ART_TSURUGI_OF_MURAMASA && u.uwep))
        armbuf += '+'; // C :610 strkitten(armbuf, '+')
    return upstart(armbuf); // C :612
}

// C botl.c:962-1279 bot_via_windowport() (staticfn) — fill gb.blstats[idx]
// for the windowport status update, then evaluate_and_notify_windowport().
// C min(x,9999) caps hp/maxhp/pw/maxpw/gold match the tty formatter so the
// two display modes never disagree (:977-982). Property predicates expand
// the youprop.h macros against game.u (display.js _statusLine2 precedent
// for the shared arms); C macros with no JS export are read inline, never
// re-cloned as functions. botl_score() is compiled out (!SCORE_ON_BOTL,
// config.h:625-627), so BL_SCORE is constant 0 (C :1031-1035).
export function bot_via_windowport() {
    const u = game.u;
    if (!u) return; // JS null-state guard (display.js bot() precedent)
    if (!game.gb?.blinit) // C :970
        throw new Error('bot before init.');

    // C :973-974 toggle from previous iteration.
    const idx = 1 - now_or_before_idx; // 0 -> 1, 1 -> 0
    now_or_before_idx = idx;

    // C :977 clear the "value set" indicators.
    const valset = new Array(MAXBLSTATS).fill(false);
    const bs = game.gb.blstats[idx];
    const flags = game.flags ?? {};
    const iflags = game.iflags ?? {};
    const polyd = Upolyd(u);

    // C :986-1010 player name and title.
    let name = game.plname ?? ''; // C :988 svp.plname (game.plname precedent)
    if (name.length) name = highc(name.charAt(0)) + name.slice(1); // C :989
    const titl = !polyd ? rank() : pmname(u.umonnum | 0, u.mfemale ? FEMALE : MALE); // C :990 Ugender
    // C :991 i = strlen + sizeof " the " (5) + strlen - sizeof "" (1).
    let i = name.length + 5 + titl.length - 1;
    if (i > 30) { // C :995-999 truncate name, keep >= BOTL_NSIZ
        i = 30 - (5 + titl.length - 1);
        name = name.slice(0, Math.max(i, BOTL_NSIZ));
    }
    let buf = name + ' the ' + titl; // C :1000-1001
    if (polyd) { // C :1002-1006 capitalize poly'd monster words
        let cap = '';
        for (let k = 0; k < titl.length; k++)
            cap += (k === 0 || titl[k - 1] === ' ') ? highc(titl[k]) : titl[k];
        buf = name + ' the ' + cap;
    }
    bs[BL_TITLE].val = buf.padEnd(30); // C :1007 "%-30s"
    valset[BL_TITLE] = true; // C :1008

    // C :1011-1013 strength.
    bs[BL_STR].a.a_int = acurr(A_STR);
    bs[BL_STR].val = get_strength_str();
    valset[BL_STR] = true;

    // C :1016-1020 dexterity, constitution, intelligence, wisdom, charisma.
    bs[BL_DX].a.a_int = acurr(A_DEX);
    bs[BL_CO].a.a_int = acurr(A_CON);
    bs[BL_IN].a.a_int = acurr(A_INT);
    bs[BL_WI].a.a_int = acurr(A_WIS);
    bs[BL_CH].a.a_int = acurr(A_CHA);

    // C :1023-1027 alignment.
    bs[BL_ALIGN].val = (u.ualign?.type === A_CHAOTIC) ? 'Chaotic'
        : (u.ualign?.type === A_NEUTRAL) ? 'Neutral' : 'Lawful';

    // C :1031-1035 score (SCORE_ON_BOTL off: constant 0L).
    bs[BL_SCORE].a.a_long = 0;

    // C :1038-1045 hit points (gameover uhp -1 reads 0).
    let hp = polyd ? (u.mh | 0) : (u.uhp | 0); // C :1039
    if (hp < 0) // C :1040-1041
        hp = 0;
    bs[BL_HP].rawval.a_int = hp; // C :1042
    bs[BL_HP].a.a_int = Math.min(hp, 9999); // C :1043
    const hpmax = polyd ? (u.mhmax | 0) : (u.uhpmax | 0); // C :1044
    bs[BL_HPMAX].rawval.a_int = hpmax; // C :1045
    bs[BL_HPMAX].a.a_int = Math.min(hpmax, 9999); // C :1046

    // C :1049-1050 dungeon level.
    bs[BL_LEVELDESC].val = describe_level(1);
    valset[BL_LEVELDESC] = true;

    // C :1053-1082 gold.
    let money = money_cnt(game.gi?.invent ?? game.invent); // C :1054
    if (money < 0) // C :1055 ought to impossible() then discard
        money = 0;
    bs[BL_GOLD].rawval.a_long = money; // C :1056
    bs[BL_GOLD].a.a_long = Math.min(money, 999999); // C :1057
    // C :1071-1074 tty shows the gold glyph as the field header unless a
    // dumplog or an invisible symbol forces '$'.
    const goldpfx = (iflags.in_dumplog || iflags.invis_goldsym) ? '$'
        : encglyph(objnum_to_glyph(OTYP_GOLD_PIECE));
    bs[BL_GOLD].val = goldpfx + ':' + bs[BL_GOLD].a.a_long; // C :1071
    valset[BL_GOLD] = true; // C :1075

    // C :1085-1088 power (magical energy).
    bs[BL_ENE].rawval.a_int = u.uen | 0; // C :1085
    bs[BL_ENE].a.a_int = Math.min(u.uen | 0, 9999); // C :1086
    bs[BL_ENEMAX].rawval.a_int = u.uenmax | 0; // C :1087
    bs[BL_ENEMAX].a.a_int = Math.min(u.uenmax | 0, 9999); // C :1088

    // C :1091 armor class.
    bs[BL_AC].a.a_int = u.uac | 0;

    // C :1094 monster level (if Upolyd).
    bs[BL_HD].a.a_int = polyd ? (mons(u.umonnum | 0)?.mlevel | 0) : 0;

    // C :1097-1098 experience.
    bs[BL_XP].a.a_int = u.ulevel | 0;
    bs[BL_EXP].a.a_long = u.uexp ?? 0;

    // C :1101 time (moves).
    bs[BL_TIME].a.a_long = game.moves ?? 0;

    // C :1104-1110 hunger (ANY_UINT history abandoned: plain int).
    const uhs = u.uhs | 0; // C :1106 (int) u.uhs
    bs[BL_HUNGER].a.a_int = uhs;
    bs[BL_HUNGER].val = (uhs !== NOT_HUNGRY) ? (hu_stat[uhs] ?? '') : ''; // C :1107-1108
    valset[BL_HUNGER] = true; // C :1109

    // C :1112-1116 carrying capacity.
    const cap = near_capacity(); // C :1113
    bs[BL_CAP].a.a_int = cap;
    bs[BL_CAP].val = (cap > UNENCUMBERED) ? (enc_stat[cap] ?? '') : ''; // C :1114-1115
    valset[BL_CAP] = true; // C :1116

    // C :1120-1128 version (refilled when flags.versinfo changes; toggling
    // showvers off clears it via the evaluate skip).
    const versinfo = flags.versinfo | 0;
    if (bs[BL_VERS].a.a_int !== versinfo) { // C :1120
        bs[BL_VERS].a.a_int = versinfo;
        valset[BL_VERS] = false; // C :1122
    }
    if (!valset[BL_VERS]) { // C :1124
        bs[BL_VERS].val = status_version(bs[BL_VERS].valwidth, false); // C :1125-1126
        valset[BL_VERS] = true; // C :1127
    }

    // C :1131 conditions bitmask.
    bs[BL_CONDITION].a.a_ulong = 0;

    // C :1149-1152 sickness (Sick: youprop.h:108 uprops[SICK].intrinsic;
    // display.js:5897 adds the JS flat mirror).
    condtests[bl_foodpois].test = condtests[bl_termill].test = false;
    if (((u.Sick | 0) || (u.uprops?.[SICK]?.intrinsic | 0))) { // C :1150
        setIfEnabled(bl_foodpois, ((u.usick_type | 0) & SICK_VOMITABLE) !== 0); // C :1151
        setIfEnabled(bl_termill, ((u.usick_type | 0) & SICK_NONVOMITABLE) !== 0); // C :1152
    }
    // C :1154-1162 trapped states.
    condtests[bl_inlava].test = condtests[bl_tethered].test
        = condtests[bl_trapped].test = false;
    if (u.utrap) { // C :1156
        setIfEnabled(bl_inlava, (u.utraptype | 0) === TT_LAVA); // C :1157
        setIfEnabled(bl_tethered, (u.utraptype | 0) === TT_BURIEDBALL); // C :1158
        // C :1161-1162 disabled lava/tethered lump into trapped.
        setIfEnabled(bl_trapped, !condtests[bl_inlava].test
                                 && !condtests[bl_tethered].test);
    }
    // C :1164-1189 held states (bl_engulfed compiled out at :1165-1167,
    // swallowed reads as held).
    condtests[bl_grab].test = condtests[bl_held].test
        = condtests[bl_holding].test = false;
    if (u.ustuck) { // C :1169
        if (u.uswallow) { // C :1174 swallowed (better than blank)
            setIfEnabled(bl_held, true);
        } else if (polyd && sticks(game.youmonst?.data)) { // C :1181 sticky hero holds
            setIfEnabled(bl_holding, true);
        } else { // C :1185-1188 grab (drowning) vs held
            setIfEnabled(bl_grab, u.ustuck?.data?.mlet === 'S_EEL');
            setIfEnabled(bl_held, !condtests[bl_grab].test);
        }
    }
    condtests[bl_blind].test = Blind() ? true : false; // C :1191
    condtests[bl_conf].test = ((u.HConfusion | 0) || u.Confusion) ? true : false; // C :1192 display.js:5904
    condtests[bl_deaf].test = ((u.HDeaf | 0) || (u.EDeaf | 0) || u.uroleplay?.deaf || u.Deaf) ? true : false; // C :1193 display.js:5906
    condtests[bl_fly].test = Flying() ? true : false; // C :1194
    condtests[bl_glowhands].test = u.umconf ? true : false; // C :1195
    condtests[bl_hallu].test = Hallucination() ? true : false; // C :1196
    condtests[bl_lev].test = Levitation() ? true : false; // C :1197
    condtests[bl_ride].test = u.usteed ? true : false; // C :1198
    condtests[bl_slime].test = ((u.Slimed | 0) || (u.uprops?.[SLIMED]?.intrinsic | 0)) ? true : false; // C :1199 display.js:5899
    condtests[bl_stone].test = ((u.Stoned | 0) || (u.uprops?.[STONED]?.intrinsic | 0)) ? true : false; // C :1200 display.js:5900
    condtests[bl_strngl].test = ((u.Strangled | 0) || (u.HStrangled | 0) || (u.EStrangled | 0) || (u.uprops?.[STRANGLED]?.intrinsic | 0) || (u.uprops?.[STRANGLED]?.extrinsic | 0)) ? true : false; // C :1201 display.js:5894
    condtests[bl_stun].test = ((u.HStun | 0) || u.Stunned) ? true : false; // C :1202 display.js:5931
    condtests[bl_submerged].test = u.uinwater ? true : false; // C :1203 Underwater: youprop.h:279
    setIfEnabled(bl_elf_iron, false); // C :1204 never (FALSE)
    setIfEnabled(bl_bareh, !u.uarmg && !u.uwep); // C :1205
    setIfEnabled(bl_icy, game.level?.at(u.ux | 0, u.uy | 0)?.typ === ICE); // C :1206
    // C :1207 Glib is uprops[GLIB].intrinsic only (youprop.h:112); the
    // potion.js Glib() export folds in extrinsic, so the macro is read here.
    setIfEnabled(bl_slippery, ((u.uprops?.[GLIB]?.intrinsic | 0) !== 0) ? true : false);
    setIfEnabled(bl_woundedl, ((u.HWounded_legs | 0) || (u.EWounded_legs | 0) || u.Wounded_legs) ? true : false); // C :1208 youprop.h:138 + flat
    if ((game.multi | 0) < 0) { // C :1210
        cond_cache_prepA(); // C :1211
        if (condtests[bl_unconsc].enabled // C :1212-1216
            && cache_nomovemsg && !cache_avail[0]) {
            cache_reslt[0] = (!u.usleep && unconscious());
            cache_avail[0] = true;
        }
        if (condtests[bl_parlyz].enabled // C :1217-1222
            && cache_multi_reason && !cache_avail[1]) {
            cache_reslt[1] = ((cache_multi_reason.startsWith('paralyzed'))
                              || (cache_multi_reason.startsWith('frozen')));
            cache_avail[1] = true;
        }
        if (cache_avail[0] && cache_reslt[0]) { // C :1223-1224
            condtests[bl_unconsc].test = cache_reslt[0];
        } else if (cache_avail[1] && cache_reslt[1]) { // C :1225-1226
            condtests[bl_parlyz].test = cache_reslt[1];
        } else if (condtests[bl_sleeping].enabled && u.usleep) { // C :1227-1228
            condtests[bl_sleeping].test = true;
        } else if (condtests[bl_busy].enabled) { // C :1229-1230
            condtests[bl_busy].test = true;
        }
    } else { // C :1232-1234
        condtests[bl_unconsc].test = condtests[bl_parlyz].test =
            condtests[bl_sleeping].test = condtests[bl_busy].test = false;
    }

    // C :1239-1244 set one mask bit per enabled passing condition.
    for (let k = 0; k < CONDITION_COUNT; ++k) {
        if (condtests[k].enabled
                && condtests[k].test)
            bs[BL_CONDITION].a.a_ulong |= conditions[k].mask; // C cond_setbit
    }

    // C :1251-1255 optional weapon line.
    if (flags.weaponstatus)
        bs[BL_WEAPON].val = weapon_status();
    else
        bs[BL_WEAPON].val = '';

    // C :1257-1260 optional armor line.
    if (flags.armorstatus)
        bs[BL_ARMOR].val = armor_status();
    else
        bs[BL_ARMOR].val = '';

    // C :1262-1273 optional terrain line.
    if (flags.terrainstatus) {
        if ((iflags.terrain_typ | 0) === MAX_TYPE) // C :1262-1263
            classify_terrain();
        const terr = game.iflags?.terrain_typ | 0; // C :1264 re-read
        if (bs[BL_TERRAIN].a.a_int !== terr) { // C :1265
            bs[BL_TERRAIN].val = terrain_descr[terr] ?? ''; // C :1266
            bs[BL_TERRAIN].a.a_int = terr; // C :1267
        }
    } else { // C :1270-1272
        bs[BL_TERRAIN].val = '';
        bs[BL_TERRAIN].a.a_int = MAX_TYPE;
    }
    valset[BL_TERRAIN] = true; // C :1274

    // C :1277 request rendering.
    evaluate_and_notify_windowport(valset, idx);
}

// =======================================================================
// C botl.c STATUS_HILITES store + linestr gather chain for the #saveoptions
// writer all_options_statushilites (`:4477–4495`, js/options.js [campaign
// 6/7]). STATUS_HILITES is compiled in (config.h:616), so every arm below
// is live C. C file order is kept: condition_aliases (`:749`), split_clridx
// (`:2576`), conditionbitmask2str (`:3141`), hlattr2attrname (`:3369`),
// the linestr store (`:3403–3414`), add/done/countfield (`:3417–3474`),
// gather_conditions (`:3488–3568`), gather (`:3570–3587`), status_hilite2str
// (`:3590–3670`). The two C staticfns the extern writer calls (done, gather)
// are exported like opt_next_cond above (C staticfn `:1456`, same fold);
// the rest mirror staticfn (file-local). C `struct hilite_s` threshold
// nodes are plain objects here: { rel, behavior, value: { a_int, a_ulong },
// textmatch, coloridx, fld, next } — no producer is ported yet (threshold
// chains stay null via init_blstats `:1772`, cond_hilites via game.gc), so
// the store gathers empty, exactly like the sibling empty registries.
// =======================================================================

// C botl.c:749–777 condition_aliases[] (struct condmap { id, bitmask }) under
// `#ifdef STATUS_HILITES` — short names for condition bitmask unions.
const condition_aliases = [
    { id: 'strangled', bitmask: BL_MASK_STRNGL }, // C :750
    { id: 'all', bitmask: BL_MASK_BAREH | BL_MASK_BLIND | BL_MASK_BUSY // C :751–758
        | BL_MASK_CONF | BL_MASK_DEAF | BL_MASK_ELF_IRON
        | BL_MASK_FLY | BL_MASK_FOODPOIS | BL_MASK_GLOWHANDS
        | BL_MASK_GRAB | BL_MASK_HALLU | BL_MASK_HELD
        | BL_MASK_ICY | BL_MASK_INLAVA | BL_MASK_LEV
        | BL_MASK_PARLYZ | BL_MASK_RIDE | BL_MASK_SLEEPING
        | BL_MASK_SLIME | BL_MASK_SLIPPERY | BL_MASK_STONE
        | BL_MASK_STRNGL | BL_MASK_STUN | BL_MASK_SUBMERGED
        | BL_MASK_TERMILL | BL_MASK_TETHERED
        | BL_MASK_TRAPPED | BL_MASK_UNCONSC
        | BL_MASK_WOUNDEDL | BL_MASK_HOLDING },
    { id: 'major_troubles', bitmask: BL_MASK_FOODPOIS | BL_MASK_GRAB | BL_MASK_INLAVA // C :759–761
        | BL_MASK_SLIME | BL_MASK_STONE | BL_MASK_STRNGL
        | BL_MASK_TERMILL },
    { id: 'minor_troubles', bitmask: BL_MASK_BLIND | BL_MASK_CONF | BL_MASK_DEAF // C :762–764
        | BL_MASK_HALLU | BL_MASK_PARLYZ | BL_MASK_SUBMERGED
        | BL_MASK_STUN },
    { id: 'movement', bitmask: BL_MASK_LEV | BL_MASK_FLY | BL_MASK_RIDE }, // C :765
    { id: 'opt_in', bitmask: BL_MASK_BAREH | BL_MASK_BUSY | BL_MASK_GLOWHANDS // C :766–772
        | BL_MASK_HELD | BL_MASK_ICY | BL_MASK_PARLYZ
        | BL_MASK_SLEEPING | BL_MASK_SLIPPERY
        | BL_MASK_SUBMERGED | BL_MASK_TETHERED
        | BL_MASK_TRAPPED
        | BL_MASK_UNCONSC | BL_MASK_WOUNDEDL
        | BL_MASK_HOLDING },
];

// C botl.c:2576–2584 split_clridx() (staticfn) — low byte is the color,
// high byte the attribute. C writes through two out-pointers; JS folds the
// pair into the return (opt_next_cond precedent above).
function split_clridx(idx) {
    return [(idx | 0) & 0x00FF, ((idx | 0) >> 8) & 0x00FF]; // C `:2580–2582`
}

// C botl.c:3141–3170 conditionbitmask2str() (staticfn) — 'Blind+Conf' union
// names, or the whole-union alias when one matches (`:3153–3166`). C
// returns a static buffer (immediately copied by the caller); JS returns a
// fresh string. eos() appends are plain concat.
function conditionbitmask2str(ul) {
    ul = ul >>> 0; // C unsigned long
    if (!ul) return ''; // C `:3149–3150` empty buf
    let alias = null; // C `:3146`
    for (let i = 1; i < condition_aliases.length; i++) // C `:3153`
        if ((condition_aliases[i].bitmask >>> 0) === ul) // C `:3154`
            alias = condition_aliases[i].id;
    let buf = '';
    let first = true; // C `:3145`
    for (let i = 0; i < conditions.length; i++) // C `:3158`
        if ((conditions[i].mask & ul) !== 0) { // C `:3159`
            buf += `${first ? '' : '+'}${conditions[i].text[0]}`; // C `:3160–3162`
            first = false;
        }
    if (!first && alias) buf = alias; // C `:3165–3166`
    return buf;
}

// C botl.c:3369–3399 hlattr2attrname() (staticfn) — 'bold+dim' style names,
// 'normal' for HL_NONE (`:3377–3380`); NULL when attrib is 0 or buf missing
// (`:3369`, `:3398`). C writes into the caller buffer when the name fits
// (`:3394–3396`); JS returns the name (null when C would leave buf useless).
function hlattr2attrname(attrib) {
    attrib |= 0;
    if (!attrib) return null; // C `:3371` !attrib → 0
    if (attrib === HL_NONE) return 'normal'; // C `:3377–3380`
    let attbuf = ''; // C `:3376`
    let first = 0; // C `:3375`
    if (attrib & HL_BOLD) attbuf += first++ ? '+bold' : 'bold'; // C `:3383–3384`
    if (attrib & HL_DIM) attbuf += first++ ? '+dim' : 'dim'; // C `:3385–3386`
    if (attrib & HL_ITALIC) attbuf += first++ ? '+italic' : 'italic'; // C `:3387–3388`
    if (attrib & HL_ULINE) attbuf += first++ ? '+underline' : 'underline'; // C `:3389–3390`
    if (attrib & HL_BLINK) attbuf += first++ ? '+blink' : 'blink'; // C `:3391–3392`
    if (attrib & HL_INVERSE) attbuf += first++ ? '+inverse' : 'inverse'; // C `:3393–3394`
    if (attbuf.length >= BUFSZ - 1) return null; // C `:3394–3396` no fit → buf unusable
    return attbuf;
}

// C botl.c:3403–3414 — linestr store: `struct _status_hilite_line_str`
// { id, fld, hl, mask, str[BUFSZ], next } plus the file statics (`:3413–3414`
// "these don't need to be in 'struct g'"). Nodes are plain objects; str is
// a JS string (C fixed buffer, always fits per the producers).
let status_hilite_str = null; // C `:3413` = 0
let status_hilite_str_id = 0; // C `:3414` = 0

// C botl.c:3417–3445 status_hilite_linestr_add() (staticfn) — alloc +
// zero (`:3424–3425`), tail-append (`:3437–3443`); BL_TITLE keeps spaces,
// every other field strips them (`:3432–3435`).
function status_hilite_linestr_add(fld, hl, mask, str) {
    const tmp = { // C `:3424–3425` alloc + memset 0
        id: ++status_hilite_str_id, // C `:3430`
        fld, // C `:3431`
        hl, // C `:3432`
        mask: mask >>> 0, // C unsigned long
        str: (fld === BL_TITLE) ? String(str ?? '') // C `:3433–3434` Strcpy
            : stripchars('', ' ', str), // C `:3435` strip spaces
        next: null, // C `:3427`
    };
    let nxt = status_hilite_str; // C `:3437`
    if (nxt !== null) {
        while (nxt.next) nxt = nxt.next; // C `:3438–3439`
        nxt.next = tmp; // C `:3440`
    } else {
        status_hilite_str = tmp; // C `:3442`
    }
}

// C botl.c:3448–3459 status_hilite_linestr_done() (staticfn) — free the whole
// chain and zero the id (`:3450–3458`; GC frees here). Exported: the extern
// #saveoptions writer (js/options.js) calls it like C `:4482`/`:4494`.
export function status_hilite_linestr_done() {
    status_hilite_str = null; // C `:3457`
    status_hilite_str_id = 0; // C `:3458`
}

// C botl.c:3462–3474 status_hilite_linestr_countfield() (staticfn) —
// BL_FLUSH counts every line (`:3465–3466`), else only fld matches
// (`:3470–3471`). Readers: this file's hilite menus, and
// count_status_hilites (`:3477–3485`, the doset get_val helper — still
// a named omission).
function status_hilite_linestr_countfield(fld) {
    const countall = (fld === BL_FLUSH); // C `:3465`
    let count = 0; // C `:3466`
    for (let tmp = status_hilite_str; tmp; tmp = tmp.next) { // C `:3469`
        if (countall || tmp.fld === fld) count++; // C `:3470–3471`
    }
    return count;
}

// C botl.c:3488–3568 status_hilite_linestr_gather_conditions() (staticfn) —
// fold gc.cond_hilites[] into one linestr per distinct color+attr union:
// first CLR_MAX slots are colors (`:3502–3506`), HL_ATTCLR_* slots are
// attributes (`:3507–3518`, HL_NONE cleared at `:3519–3520`); same-union
// conditions merge (`:3524–3530`), else take the first free slot
// (`:3532–3539`); each union prints 'condition/Mask/color[&attr]'
// (`:3555–3564`). Missing game.gc reads 0 (unconfigured hilites).
function status_hilite_linestr_gather_conditions() {
    const condmaps = []; // C `:3494` cond_maps[SIZE(conditions)], memset 0 `:3496–3497`
    for (let i = 0; i < conditions.length; i++) condmaps.push({ bm: 0, clratr: 0 });
    const condhilites = game.gc?.cond_hilites ?? []; // C decl.h `:228` [BL_ATTCLR_MAX]

    for (let i = 0; i < conditions.length; i++) { // C `:3499`
        let clr = NO_COLOR; // C `:3500`
        let atr = HL_NONE; // C `:3501`
        for (let j = 0; j < CLR_MAX; j++) // C `:3503`
            if (((condhilites[j] ?? 0) & conditions[i].mask) !== 0) { // C `:3504`
                clr = j; // C `:3505`
                break;
            }
        if (((condhilites[HL_ATTCLR_BOLD] ?? 0) & conditions[i].mask) !== 0) atr |= HL_BOLD; // C `:3507–3508`
        if (((condhilites[HL_ATTCLR_DIM] ?? 0) & conditions[i].mask) !== 0) atr |= HL_DIM; // C `:3509–3510`
        if (((condhilites[HL_ATTCLR_ITALIC] ?? 0) & conditions[i].mask) !== 0) atr |= HL_ITALIC; // C `:3511–3512`
        if (((condhilites[HL_ATTCLR_ULINE] ?? 0) & conditions[i].mask) !== 0) atr |= HL_ULINE; // C `:3513–3514`
        if (((condhilites[HL_ATTCLR_BLINK] ?? 0) & conditions[i].mask) !== 0) atr |= HL_BLINK; // C `:3515–3516`
        if (((condhilites[HL_ATTCLR_INVERSE] ?? 0) & conditions[i].mask) !== 0) atr |= HL_INVERSE; // C `:3517–3518`
        if (atr !== HL_NONE) atr &= ~HL_NONE; // C `:3519–3520`

        if (clr !== NO_COLOR || atr !== HL_NONE) { // C `:3522`
            const ca = (clr | (atr << 8)) >>> 0; // C `:3523` unsigned int
            let added = false; // C `:3524` added_condmap
            for (let j = 0; j < conditions.length; j++) // C `:3526`
                if (condmaps[j].clratr === ca) { // C `:3527`
                    condmaps[j].bm |= conditions[i].mask; // C `:3528`
                    added = true; // C `:3529`
                    break;
                }
            if (!added) { // C `:3532`
                for (let j = 0; j < conditions.length; j++) // C `:3533`
                    if (!condmaps[j].bm) { // C `:3534`
                        condmaps[j].bm = conditions[i].mask; // C `:3535`
                        condmaps[j].clratr = ca; // C `:3536`
                        break;
                    }
            }
        }
    }

    for (let i = 0; i < conditions.length; i++) // C `:3543`
        if (condmaps[i].bm) { // C `:3544`
            const [clr, atr] = split_clridx(condmaps[i].clratr); // C `:3548`
            if (clr !== NO_COLOR || atr !== HL_NONE) { // C `:3549`
                let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0); // C `:3555–3556`
                const tmpattr = hlattr2attrname(atr); // C `:3557`
                if (tmpattr) clrbuf += `&${tmpattr}`; // C `:3558–3559` Sprintf eos
                const condbuf = `condition/${conditionbitmask2str(condmaps[i].bm)}/${clrbuf}`; // C `:3560–3561`
                status_hilite_linestr_add(BL_CONDITION, null, condmaps[i].bm, condbuf); // C `:3562–3563`
            }
        }
}

// C botl.c:3570–3587 status_hilite_linestr_gather() (staticfn) — clear the
// store (`:3575`), add one line per blstats threshold (`:3577–3582`), then
// the condition unions (`:3585`). Exported for the extern writer; the C
// `status_hilite_str` head read (`:4485`) is folded into the return
// (opt_next_cond precedent). Unbuilt blstats reads empty (no thresholds).
export function status_hilite_linestr_gather() {
    status_hilite_linestr_done(); // C `:3575`

    const bl0 = game.gb?.blstats?.[0]; // C `:3578` gb.blstats[0]
    for (let i = 0; i < MAXBLSTATS; i++) { // C `:3577`
        let hl = bl0?.[i]?.thresholds ?? null; // C `:3578`
        while (hl) { // C `:3579`
            status_hilite_linestr_add(i, hl, 0, status_hilite2str(hl)); // C `:3580`
            hl = hl.next; // C `:3581`
        }
    }

    status_hilite_linestr_gather_conditions(); // C `:3585`
    return status_hilite_str;
}

// C botl.c:3590–3670 status_hilite2str() (staticfn) — 'field/behavior/color'
// for one threshold (`:3665–3667`); NULL for a null rule (`:3600–3601`).
// C returns a static buffer the caller copies at once (`:3580`); JS returns
// a fresh string. impossible() arms (bad rel per behavior) leave behavebuf
// empty: C impossible logs and returns (init_blstats precedent above), so
// nothing observable is dropped. initblstats[].name is the JS field for C
// initblstats[].fldname (`:112–143` mirror `:703–737`).
function status_hilite2str(hl) {
    if (!hl) return null; // C `:3600–3601`
    let clr = NO_COLOR, attr = ATR_NONE; // C `:3593`
    let behavebuf = ''; // C `:3604`
    const op = (hl.rel === LT_VALUE) ? '<' // C `:3606–3611`
        : (hl.rel === LE_VALUE) ? '<='
        : (hl.rel === GT_VALUE) ? '>'
        : (hl.rel === GE_VALUE) ? '>='
        : (hl.rel === EQ_VALUE) ? '='
        : null; // C `:3611` 0
    switch (hl.behavior) { // C `:3613`
    case BL_TH_VAL_PERCENTAGE: // C `:3614`
        if (op) behavebuf = `${op}${hl.value?.a_int | 0}%`; // C `:3615–3616`
        /* else C `:3617` impossible("hl->behavior=percentage, rel error") */
        break;
    case BL_TH_UPDOWN: // C `:3619`
        if (hl.rel === LT_VALUE) behavebuf = 'down'; // C `:3620–3621`
        else if (hl.rel === GT_VALUE) behavebuf = 'up'; // C `:3622–3623`
        else if (hl.rel === EQ_VALUE) behavebuf = 'changed'; // C `:3624–3625`
        /* else C `:3627` impossible("hl->behavior=updown, rel error") */
        break;
    case BL_TH_VAL_ABSOLUTE: // C `:3630`
        if (op) behavebuf = `${op}${hl.value?.a_int | 0}`; // C `:3631–3632`
        /* else C `:3633` impossible("hl->behavior=absolute, rel error") */
        break;
    case BL_TH_TEXTMATCH: // C `:3635`
        if (hl.rel === TXT_VALUE && hl.textmatch?.[0]) behavebuf = `${hl.textmatch}`; // C `:3636–3637`
        /* else C `:3639` impossible("hl->behavior=textmatch, rel or textmatch error") */
        break;
    case BL_TH_CONDITION: // C `:3641`
        if (hl.rel === EQ_VALUE) behavebuf = `${conditionbitmask2str(hl.value?.a_ulong ?? 0)}`; // C `:3642–3643`
        /* else C `:3645` impossible("hl->behavior=condition, rel error") */
        break;
    case BL_TH_ALWAYS_HILITE: // C `:3647–3648`
        behavebuf = 'always';
        break;
    case BL_TH_CRITICALHP: // C `:3650–3651`
        behavebuf = 'criticalhp';
        break;
    case BL_TH_NONE: // C `:3653–3654`
    default: // C `:3655–3656`
        break;
    }

    [clr, attr] = split_clridx(hl.coloridx | 0); // C `:3659`
    let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0); // C `:3660`
    if (attr !== HL_UNDEF) { // C `:3661`
        const tmpattr = hlattr2attrname(attr); // C `:3662`
        if (tmpattr != null) clrbuf += `&${tmpattr}`; // C `:3662–3663`
    }
    return `${initblstats[hl.fld]?.name ?? ''}/${behavebuf}/${clrbuf}`; // C `:3665–3667`
}

// C botl.c:703–737 initblstats[].fldname. The JS table stores that string
// as `name` (copied onto blstats[].fldname by init_blstats).
function blstatFldName(fld) {
    return initblstats[fld | 0]?.name ?? '';
}

// tty_end_menu prepends the prompt and a blank row. Same shape as
// cond_menu / getpos_menu: the prompt is the inverse title, then a gap,
// then the add_menu rows in C order.
function hiliteMenuRows(prompt, rows) {
    return [
        { text: prompt, attr: ATR_INVERSE, selectable: false },
        { text: '', attr: ATR_NONE, selectable: false },
        ...rows,
    ];
}

/**
 * C ref: botl.c status_hilite_menu_choose_updownboth `:3811–3887`.
 * PICK_ONE menu of LT/LE/EQ/GE/GT. a_int is `10 + relationship` so a
 * cancelled menu (res <= 0) stays distinct from EQ_VALUE (0). Returns
 * the relationship, or NO_LTEQGT on cancel. create/start/end/select/
 * destroy fold into one select_menu_pick_one (cond_menu precedent);
 * nul_glyphinfo / NO_COLOR / MENU_ITEMFLAGS_NONE do not change the tty
 * text row. cg.zeroany is the fresh a_int on each row.
 *
 * C callers are both inside status_hilite_menu_add (`:4057`, `:4088`),
 * which has no JS body (named omission). This export is the call those
 * sites make.
 *
 * @param {number} fld statusfields index
 * @param {string|null} str threshold text, or null for the up/down menu
 * @param {boolean} ltok offer less / less-or-equal
 * @param {boolean} gtok offer greater / greater-or-equal
 * @returns {Promise<number>}
 */
export async function status_hilite_menu_choose_updownboth(fld, str, ltok, gtok) {
    let ret = NO_LTEQGT; // C `:3816`
    const rows = [];
    // C `if (str)` is a pointer test. "" is non-NULL.
    const hasStr = str != null;
    const ac = (fld | 0) === BL_AC; // C `:3830` and the other AC ternaries

    if (ltok) { // C `:3827`
        const buf = hasStr // C `:3828–3832`
            ? `${ac ? 'Better (lower)' : 'Less'} than ${str}`
            : 'Value goes down';
        rows.push({ // C `:3833–3836` a_int = 10 + LT_VALUE
            text: buf, selectable: true, attr: ATR_NONE, a_int: 10 + LT_VALUE,
        });
        if (hasStr) { // C `:3838–3844`
            rows.push({
                text: `${str} or ${ac ? 'better (lower)' : 'less'}`,
                selectable: true, attr: ATR_NONE, a_int: 10 + LE_VALUE,
            });
        }
    }

    rows.push({ // C `:3848–3855` EQ is unconditional
        text: hasStr ? `Exactly ${str}` : 'Value changes',
        selectable: true, attr: ATR_NONE, a_int: 10 + EQ_VALUE,
    });

    if (gtok) { // C `:3857`
        if (hasStr) { // C `:3858–3864` GE only when a threshold string exists
            rows.push({
                text: `${str} or ${ac ? 'worse (higher)' : 'more'}`,
                selectable: true, attr: ATR_NONE, a_int: 10 + GE_VALUE,
            });
        }
        const buf = hasStr // C `:3866–3870`
            ? `${ac ? 'Worse (higher)' : 'More'} than ${str}`
            : 'Value goes up';
        rows.push({ // C `:3871–3874` a_int = 10 + GT_VALUE
            text: buf, selectable: true, attr: ATR_NONE, a_int: 10 + GT_VALUE,
        });
    }

    const prompt = `Select field ${blstatFldName(fld)} value:`; // C `:3876`
    // options.js statically imports this module (cond_menu precedent).
    const { select_menu_pick_one } = await import('./options.js');
    const res = await select_menu_pick_one(hiliteMenuRows(prompt, rows)); // C `:3877–3880`
    if (res.kind === 'pick' && res.item) { // C `:3881` res > 0
        ret = (res.item.a_int | 0) - 10; // C `:3882`
        // C `:3883` free(picks) — GC.
    }
    return ret; // C `:3886`
}

/**
 * C ref: botl.c status_hilite_remove `:4305–4354`.
 * Walk the linestr store for `id`. A condition rule clears the matching
 * bits in gc.cond_hilites and returns TRUE without unlinking the line
 * (the caller re-gathers). Any other rule unlinks that hilite_s from
 * blstats[0][fld].thresholds, mirrors the head into row 1, and drops
 * hilite_rule / time on both rows when the removed node is the active
 * rule. free(hl) is GC.
 *
 * Sole C caller: status_hilite_menu_fld `:4441` (wired below).
 * The `:669` line is the prototype.
 * @param {number} id linestr id
 * @returns {boolean}
 */
export function status_hilite_remove(id) {
    let hlstr = status_hilite_str; // C `:4307`
    const want = id | 0;
    while (hlstr && (hlstr.id | 0) !== want) hlstr = hlstr.next; // C `:4309–4311`
    if (!hlstr) return false; // C `:4313–4314`

    if ((hlstr.fld | 0) === BL_CONDITION) { // C `:4316`
        const ch = ensureCondHilites();
        const mask = hlstr.mask >>> 0;
        const clearBit = (i) => {
            ch[i] = ((ch[i] ?? 0) & ~mask) >>> 0;
        };
        for (let i = 0; i < CLR_MAX; i++) clearBit(i); // C `:4319–4320`
        clearBit(HL_ATTCLR_BOLD); // C `:4321`
        clearBit(HL_ATTCLR_DIM); // C `:4322`
        clearBit(HL_ATTCLR_ITALIC); // C `:4323`
        clearBit(HL_ATTCLR_ULINE); // C `:4324`
        clearBit(HL_ATTCLR_BLINK); // C `:4325`
        clearBit(HL_ATTCLR_INVERSE); // C `:4326`
        return true; // C `:4327`
    }

    const fld = hlstr.fld | 0; // C `:4329`
    const row0 = game.gb?.blstats?.[0]?.[fld];
    const row1 = game.gb?.blstats?.[1]?.[fld];
    let hlprev = null; // C `:4330`
    for (let hl = row0?.thresholds ?? null; hl; hl = hl.next) { // C `:4332`
        if (hlstr.hl === hl) { // C `:4333` pointer identity
            if (hlprev) { // C `:4334–4335`
                hlprev.next = hl.next;
            } else if (row0) { // C `:4336–4340`
                row0.thresholds = hl.next;
                if (row1) row1.thresholds = row0.thresholds;
            }
            if (row0 && row0.hilite_rule === hl) { // C `:4341–4346`
                row0.hilite_rule = null;
                if (row1) row1.hilite_rule = null;
                row0.time = 0;
                if (row1) row1.time = 0;
            }
            // C `:4347` free(hl) — GC.
            return true; // C `:4348`
        }
        hlprev = hl; // C `:4350`
    }
    return false; // C `:4353`
}

/**
 * C ref: botl.c reset_status_hilites `:2320–2331`.
 * When hilite_delta is non-zero, zero both blstats rows' time and set
 * gu.update_all. Always set disp.botlx. This port's bot() reads
 * flags.botlx (allmain.js), so that store is set too (cond_menu sets
 * both botl stores the same way).
 *
 * Callers: botl.c:4556 → status_hilite_menu below.
 * botl.c:4300 is the tail of status_hilite_menu_add (named omission,
 * no JS site). options.c:4035 is optfn_statushilites do_set (optfn
 * still null — named omission).
 */
export function reset_status_hilites() {
    if (game.iflags?.hilite_delta) { // C `:2323`
        const b0 = game.gb?.blstats?.[0];
        const b1 = game.gb?.blstats?.[1];
        if (b0 && b1) {
            for (let i = 0; i < MAXBLSTATS; ++i) { // C `:2326–2327`
                if (b0[i]) b0[i].time = 0;
                if (b1[i]) b1[i].time = 0;
            }
        }
        if (!game.gu) game.gu = {};
        game.gu.update_all = true; // C `:2328`
    }
    if (!game.disp) game.disp = {};
    game.disp.botlx = true; // C `:2330`
    if (!game.flags) game.flags = {};
    game.flags.botlx = true;
}

/**
 * C ref: botl.c status_hilite_menu_fld `:4356–4453`.
 * PICK_ANY over one field's linestr rows, plus "Remove selected hilites"
 * (accelerator X, a_int -1) and, except for BL_SCORE, "Add new hilites"
 * (accelerator Z, a_int -2). SCORE_ON_BOTL is commented out
 * (config.h:627), so the `#ifndef` arm is live C: score never offers Z.
 * Delete (mode bit 1) calls status_hilite_remove for each selected id.
 * Create (mode bit 2) is status_hilite_menu_add — named omission.
 *
 * When the field has no lines yet, C calls status_hilite_menu_add first
 * (`:4370`) and returns FALSE if that returns FALSE. The add function
 * has no JS body, so this site takes that FALSE return. The
 * "No current hilites for %s" row (`:4392–4394`) is only reached after
 * add returns TRUE and the re-gather is still empty; that arm stays
 * with the omitted function.
 *
 * Sole C caller: status_hilite_menu `:4555` (wired below). `:670` is
 * the prototype.
 * @param {number} fld
 * @returns {Promise<boolean>} acted
 */
async function status_hilite_menu_fld(fld) {
    const count = status_hilite_linestr_countfield(fld); // C `:4363`
    if (!count) { // C `:4369–4376`
        // Named omission: status_hilite_menu_add (botl.c:3889–4302).
        // C returns FALSE from here when add returns FALSE (`:4375`).
        return false;
    }

    const rows = [];
    let hlstr = status_hilite_str; // C `:4382`
    while (hlstr) { // C `:4383–4391`
        if ((hlstr.fld | 0) === (fld | 0)) {
            rows.push({
                text: hlstr.str, selectable: true, attr: ATR_NONE, a_int: hlstr.id | 0,
            });
        }
        hlstr = hlstr.next;
    }
    rows.push({ text: '', selectable: false, attr: ATR_NONE }); // C `:4398` separator
    rows.push({ // C `:4400–4404` a_int -1, accelerator 'X'
        text: 'Remove selected hilites',
        selectable: true,
        selector: 'X',
        attr: ATR_NONE,
        a_int: -1,
    });
    // C `:4407–4421` #ifndef SCORE_ON_BOTL. The define is off, so score
    // suppresses Z. Every other field offers it.
    if ((fld | 0) !== BL_SCORE) {
        rows.push({
            text: 'Add new hilites',
            selectable: true,
            selector: 'Z',
            attr: ATR_NONE,
            a_int: -2,
        });
    }

    const prompt = `Current ${blstatFldName(fld)} hilites:`; // C `:4423`
    const { select_menu_pick_any } = await import('./options.js');
    const picks = await select_menu_pick_any(hiliteMenuRows(prompt, rows)); // C `:4427`
    let acted = false; // C `:4426`
    const res = Array.isArray(picks) ? picks.length : 0; // cancel and finish-empty are both <= 0
    if (res > 0) { // C `:4427`
        let mode = 0; // C `:4429` unsigned
        for (let i = 0; i < res; i++) { // C `:4431–4437`
            const idx = picks[i].a_int | 0;
            if (idx === -1) mode |= 1;
            else if (idx === -2) mode |= 2;
        }
        if (mode & 1) { // C `:4438–4443` delete selected hilites
            for (let i = 0; i < res; i++) {
                const idx = picks[i].a_int | 0;
                if (idx > 0 && status_hilite_remove(idx)) acted = true;
            }
        }
        if (mode & 2) { // C `:4445–4447`
            // Named omission: while (status_hilite_menu_add(fld)) acted = TRUE.
            // botl.c:3889–4302 has no JS body, so this arm does not set acted.
        }
        // C `:4449` free(picks) — GC.
    }
    return acted; // C `:4452`
}

/**
 * C ref: botl.c status_hilites_viewall `:4455–4474`.
 * NHW_TEXT of `OPTIONS=hilite_status: %.*s` for each linestr.
 * Precision is BUFSZ minus sizeof("OPTIONS=hilite_status: ") minus 1
 * (sizeof counts the NUL). display_nhwindow(..., FALSE): tty ignores
 * the blocking flag for NHW_TEXT ("all windows are blocking") and
 * process_text_window always waits. show_text_pages is that wait.
 * create/destroy fold into the pager. Sole C caller is
 * status_hilite_menu `:4553` (`:671` is the prototype).
 */
async function status_hilites_viewall() {
    const prefix = 'OPTIONS=hilite_status: '; // C `:4465`
    const prec = BUFSZ - (prefix.length + 1) - 1; // sizeof includes NUL
    const lines = [];
    for (let hlstr = status_hilite_str; hlstr; hlstr = hlstr.next) { // C `:4464–4470`
        lines.push(prefix + String(hlstr.str ?? '').slice(0, prec));
    }
    const { show_text_pages } = await import('./pager.js');
    await show_text_pages(lines); // C `:4472` display_nhwindow(datawin, FALSE)
    // C `:4473` destroy_nhwindow — show_text_pages dismisses via docrt.
}

/**
 * C ref: botl.c status_hilite_menu `:4498–4578`.
 * PICK_ONE of "View all" (a_int -1, only when any rule exists) plus one
 * row per blstats field (`a_int = fld + 1`, `%-18s`, " (N defined)").
 * SCORE_ON_BOTL is off, so a score field with no rules is skipped
 * (`:4532–4538`). A negative fld after `a_int - 1` is view-all; otherwise
 * the field menu, and a TRUE from that resets hilite timers. The menu
 * repeats until cancel, unless iflags.debug_fuzzer (one try). Then, if
 * any rule was gathered and hilite_delta is 0, set it to 3.
 * Always returns TRUE (`:4577`).
 *
 * C caller: options.c optfn_o_status_hilites do_handler `:8465`
 * (js/options.js doset, the "status highlight rules" row).
 * @returns {Promise<boolean>}
 */
export async function status_hilite_menu() {
    let redo; // C `:4504`
    let countall = 0; // C `:4505`
    const { select_menu_pick_one } = await import('./options.js');
    do {
        redo = false; // C `:4509` shlmenu_redo
        status_hilite_linestr_gather(); // C `:4514`
        countall = status_hilite_linestr_countfield(BL_FLUSH); // C `:4515`
        const rows = [];
        if (countall) { // C `:4516–4524`
            rows.push({
                text: 'View all hilites in config format',
                selectable: true, attr: ATR_NONE, a_int: -1,
            });
            rows.push({ text: '', selectable: false, attr: ATR_NONE }); // C `:4523` add_menu_str ""
        }
        for (let i = 0; i < MAXBLSTATS; i++) { // C `:4526`
            const fld = initblstats[i].fld | 0; // C `:4530`
            const count = status_hilite_linestr_countfield(fld); // C `:4531`
            // C `:4532–4538` #ifndef SCORE_ON_BOTL (the define is off).
            if (fld === BL_SCORE && !count) continue;
            let buf = blstatFldName(fld).padEnd(18, ' '); // C `:4542` %-18s
            if (count) buf += ` (${count} defined)`; // C `:4543–4544`
            rows.push({ // C `:4540–4546` a_int = fld + 1
                text: buf, selectable: true, attr: ATR_NONE, a_int: fld + 1,
            });
        }
        const res = await select_menu_pick_one( // C `:4549–4550`
            hiliteMenuRows('Status hilites:', rows));
        if (res.kind === 'pick' && res.item) { // C `:4550` res > 0
            const fld = (res.item.a_int | 0) - 1; // C `:4551`
            if (fld < 0) { // C `:4552–4553`
                await status_hilites_viewall();
            } else if (await status_hilite_menu_fld(fld)) { // C `:4554–4556`
                reset_status_hilites();
            }
            // C `:4558` free(picks) — GC.
            redo = true; // C `:4559`
        }
        // C `:4562` destroy_nhwindow — select_menu_pick_one dismisses.
        countall = status_hilite_linestr_countfield(BL_FLUSH); // C `:4563`
        status_hilite_linestr_done(); // C `:4564`
    } while (redo && !game.iflags?.debug_fuzzer); // C `:4568–4569`

    if (!game.iflags) game.iflags = {};
    if (countall > 0 && !game.iflags.hilite_delta) // C `:4574–4575`
        game.iflags.hilite_delta = 3;
    return true; // C `:4577`
}
