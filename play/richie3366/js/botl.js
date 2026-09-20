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
    MAXVALWIDTH, BUFSZ, CLR_MAX,
    HL_UNDEF, HL_NONE, HL_BOLD, HL_DIM, HL_ITALIC, HL_ULINE, HL_BLINK, HL_INVERSE,
    HL_ATTCLR_BOLD, HL_ATTCLR_DIM, HL_ATTCLR_ITALIC,
    HL_ATTCLR_ULINE, HL_ATTCLR_BLINK, HL_ATTCLR_INVERSE,
    EQ_VALUE, LT_VALUE, LE_VALUE, GE_VALUE, GT_VALUE, TXT_VALUE,
    BL_TH_NONE, BL_TH_VAL_PERCENTAGE, BL_TH_VAL_ABSOLUTE, BL_TH_UPDOWN,
    BL_TH_CONDITION, BL_TH_TEXTMATCH, BL_TH_ALWAYS_HILITE, BL_TH_CRITICALHP,
    Upolyd,
    BOTL_NSIZ, MAX_TYPE,
    A_CHAOTIC, A_NEUTRAL, NOT_HUNGRY, UNENCUMBERED,
    CONDITION_COUNT,
    VI_NUMBER, VI_NAME, VI_BRANCH,
    SICK, SICK_VOMITABLE, SICK_NONVOMITABLE,
    STRANGLED, SLIMED, STONED, GLIB,
    MALE, FEMALE, ICE,
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
} from './const.js';
import { NO_COLOR, ATR_NONE } from './terminal.js';
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
import { upstart, strNsubst, stripchars, str_start_is } from './hacklib.js';
import { clr2colorname } from './artifact.js';
import { humanoid, mons, is_flyer, NON_PM } from './monsters.js';
import { Flying, Levitation } from './mhitu.js';
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
// (`:3470–3471`). Only reader is count_status_hilites (`:3477–3485`, the
// doset(options.c) helper — named omission, travels with the doset row).
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
