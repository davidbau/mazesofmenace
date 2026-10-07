// Port of the botl.c windowport-notify path: the whole C function
// evaluate_and_notify_windowport (botl.c:1621-1680) plus its static callee
// eval_notify_windowport_field (botl.c:1492-1618) and the pure static
// helpers that callee needs, all in C order with C line cites.
//
// C build notes: STATUS_HILITES is compiled in (config.h:616), so the
// `#ifdef STATUS_HILITES` arms below are live C, not dead config. The
// windowport delivery (`status_update` == `*windowprocs.win_status_update`,
// winprocs.h:186; caps WC2_RESET_STATUS/WC2_FLUSH_STATUS, winprocs.h:246/248)
// is tty_status_update below (wintty.c:4454); the scored port has no proc
// table, so the tty function is the call. The hilite-rule engine
// (get_hilite botl.c:2364, live below; hilite_reset_needed botl.c:2257,
// live below) feeds status_update color + the hilite_rule cache.
//
// Caller: C bot() (botl.c:262) calls bot_via_windowport when
// VIA_WINDOWPORT(). display.js bot() does that. C tty SETS the status
// bits (wintty.c `:114–117`, STATUS_HILITES config.h:616) and so does
// the JS model (const.js TTY_WINCAP2); the tty putstr path commits
// do_statusline1 / do_statusline2 only when the caps are clear.

import { game } from './gstate.js';
import { config_error_add } from './cfgfiles.js';
export { config_error_add } from './cfgfiles.js'; // existing callers use the C cfgfiles sink
import {
    MAXBLSTATS,
    BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN,
    BL_SCORE, BL_CAP, BL_GOLD, BL_ENE, BL_ENEMAX, BL_XP, BL_AC,
    BL_HD, BL_TIME, BL_HUNGER, BL_HP, BL_HPMAX, BL_LEVELDESC,
    BL_EXP, BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS,
    BL_RESET, BL_FLUSH, BL_CHARACTERISTICS,
    WC2_RESET_STATUS, WC2_FLUSH_STATUS,
    TTY_WINCAP2,
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
    NOW, BEFORE, MAXCO, WIN_ERR, REASSESS_ONLY,
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
import { describe_level, objnum_to_glyph, Hallucination, impossible, SYM_OFF_O, glyphmap_symidx, set_committed_status_lines, pline } from './display.js';
import { rank_of, roles } from './roles.js';
import { money_cnt } from './shk.js';
import { hidden_gold } from './vault.js';
import { nowrap_add } from './end.js';
import { pmname } from './do_name.js';
import { sticks } from './engrave.js';
import { unconscious } from './teleport.js';
import { classify_terrain } from './hack.js';
import { near_capacity, weapon_descr, Blind } from './invent.js';
import { weapon_type } from './weapon.js';
import { is_sword, objectNames, COIN_CLASS } from './objects.js';
import { bimanual, is_weptool } from './wield.js';
import { helm_simple_name } from './do_wear.js';
import {
    upstart, strNsubst, stripchars, str_start_is, fuzzymatch, lowc,
    deepest_lev_reached, eos, highc, strncmpi, trimspaces, strstri, digit,
} from './hacklib.js';
import { clr2colorname } from './artifact.js';
import { humanoid, mons, is_flyer, NON_PM } from './monsters.js';
import { Flying, Levitation } from './mhitu.js';
import { critically_low_hp } from './pray.js';
import { mdlib_version_string } from './version.js';
import { WEAPON_CLASS, CLOAK_OF_PROTECTION } from './generated/objects_data.js';
import {
    ART_MITRE_OF_HOLINESS, ART_TSURUGI_OF_MURAMASA,
} from './generated/artifacts_data.js';
// options.js statically imports botl.js; this back-edge is cycle-safe only
// because match_optname is a hoisted function declaration, called at
// runtime, never at module top level (`imports.mjs --can` verdict SAFE).
import { match_optname } from './options.js';
// getline.js takes no botl edge (`imports.mjs --can` verdict SAFE).
import { getlin } from './getline.js';

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
    // C :1763-1768 — initalready is process-global and C runs one game
    // per process, so a set flag means buffers exist. JS runs every
    // segment in one process (game = {} per game): buffers gone means a
    // new game, not a repeat call — rebuild quietly (fresh-process
    // semantics, no C repeat to impossible about).
    if (blstatsInitalready && game.gb?.blstats) {
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
    // gb.blinit is set by status_initialize() after win_status_init
    // (botl.c:1697), not here.
}

// C windows.c:887-890 — genl status tables (window-port side).
// status_vals is a JS string; C alloc(MAXCO) is a fixed buffer. The cap
// is MAXCO; writers must not treat the string as longer than that.
const statusFieldnm = new Array(MAXBLSTATS).fill(null);
const statusFieldfmt = new Array(MAXBLSTATS).fill(null);
const statusVals = new Array(MAXBLSTATS).fill(null);
const statusActivefields = new Array(MAXBLSTATS).fill(false);

// C wintty.c:4261-4300 — tty status field cache and row order.
// blPAD is BL_FLUSH. A short C initializer zero-fills; enum 0 is BL_TITLE.
const BL_PAD = BL_FLUSH;
const MAX_PER_ROW = 19;
const twolineorder = [
    [BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_ALIGN,
        BL_SCORE, BL_FLUSH,
        BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD],
    [BL_LEVELDESC, BL_GOLD, BL_HP, BL_HPMAX, BL_ENE, BL_ENEMAX,
        BL_AC, BL_XP, BL_EXP, BL_HD, BL_TIME, BL_HUNGER, BL_CAP,
        BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN, BL_VERS, BL_FLUSH],
    // Third row is unused for two-line status. C lists 17 slots; the
    // last two zero-fill to BL_TITLE (0).
    [BL_FLUSH, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD,
        BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD,
        BL_TITLE, BL_TITLE],
];
const threelineorder = [
    [BL_TITLE, BL_STR, BL_DX, BL_CO, BL_IN, BL_WI, BL_CH, BL_SCORE, BL_FLUSH,
        BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD],
    [BL_ALIGN, BL_GOLD, BL_HP, BL_HPMAX, BL_ENE, BL_ENEMAX,
        BL_AC, BL_XP, BL_EXP, BL_HD, BL_HUNGER, BL_CAP,
        BL_FLUSH, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD],
    [BL_LEVELDESC, BL_TIME, BL_CONDITION, BL_WEAPON, BL_ARMOR, BL_TERRAIN,
        BL_VERS, BL_FLUSH, BL_PAD,
        BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD, BL_PAD],
];
for (const row of [...twolineorder, ...threelineorder]) {
    if (row.length !== MAX_PER_ROW) {
        throw new Error(`status field order width ${row.length}`);
    }
}
let ttyFieldorder = twolineorder;
let ttyConditionBits = 0;
let hpbarPercent = 0;
let hpbarCritHp = 0;
// tty_status[NOW|BEFORE][fld]. lth is not cleared by tty_status_init.
let ttyStatus = [
    new Array(MAXBLSTATS).fill(null),
    new Array(MAXBLSTATS).fill(null),
];
// C wintty.c:4263-4309 — tty delivery statics (STATUS_HILITES on).
let ttyColormasks = null; // C :4263
let condShrinklvl = 0; // C :4306
let enclev = 0, encShrinklvl = 0; // C :4307
let dlvlShrinklvl = 0; // C :4308
let truncationExpected = false; // C :4309
let windowdataInit = false; // C :4305 windowdata_init
let finalx = [[0, 0], [0, 0], [0, 0]]; // C :4304 [rows][BEFORE=0|NOW=1]
// C :4321-4326 do_field_opt — DISABLE_TTY_FIELD_OPT is unset, so 1.
let doFieldOpt = 1;
// C wins[WIN_STATUS]->data — the status window framebuffer (chars only;
// colors/attrs go straight to the terminal). MAX_STATUS_ROWS × 80.
let statusWinData = [
    new Array(80).fill(' '),
    new Array(80).fill(' '),
    new Array(80).fill(' '),
];
// C wintty.c:4269-4273 encvals — encumbrance word shrink ladder.
const encvals = [
    ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'],
    ['', 'Burden', 'Stress', 'Strain', 'Overtax', 'Overload'],
    ['', 'Brd', 'Strs', 'Strn', 'Ovtx', 'Ovld'],
];
// C wins[WIN_STATUS]->cols — contest fixed 24x80 geometry.
const STATUS_COLS = 80;
// C decl.c:74 hexdd — decode_glyph hex table.
const HEXDD = '00112233445566778899aAbBcCdDeEfF';

// Same sentinel allmain.js uses for create_nhwindow(NHW_STATUS).
const WIN_STATUS_ID = 11;

// C wintty.c:229 StatusRows — wc2_statuslines <= 2 → 2 else 3.
function statusRows() {
    const n = game.iflags?.wc2_statuslines | 0;
    return n <= 2 ? 2 : 3;
}

function emptyTtyStatusField(lth) {
    return {
        idx: BL_FLUSH,
        color: NO_COLOR,
        attr: ATR_NONE,
        x: 0,
        y: 0,
        lth: lth | 0,
        valid: false,
        dirty: false,
        redraw: false,
        sanitycheck: false,
    };
}

// C windows.c:893-906 genl_status_init.
// Named: display_nhwindow(WIN_STATUS, FALSE) — no nhwindow object;
// init paints stay the allmain omission (no grid snapshot, D-1831).
export function genl_status_init() {
    for (let i = 0; i < MAXBLSTATS; ++i) {
        statusVals[i] = '';
        if ((statusVals[i]?.length | 0) > MAXCO) {
            statusVals[i] = statusVals[i].slice(0, MAXCO);
        }
        statusActivefields[i] = false;
        statusFieldfmt[i] = null;
    }
    game.WIN_STATUS = WIN_STATUS_ID;
}

// C windows.c:909-919 genl_status_finish. fieldnm / fmt / active stay.
export function genl_status_finish() {
    for (let i = 0; i < MAXBLSTATS; ++i) {
        if (statusVals[i] != null) statusVals[i] = null;
    }
}

// C windows.c:922-931 genl_status_enablefield.
export function genl_status_enablefield(fieldidx, nm, fmt, enable) {
    statusFieldfmt[fieldidx] = fmt;
    statusFieldnm[fieldidx] = nm;
    statusActivefields[fieldidx] = !!enable;
}

// C wintty.c:4364-4371 tty_status_enablefield — forwards to genl.
export function tty_status_enablefield(fieldidx, nm, fmt, enable) {
    genl_status_enablefield(fieldidx, nm, fmt, enable);
}

// C wintty.c:4336-4361 tty_status_init. STATUS_HILITES is on
// (config.h:616), so the field cache is live. DISABLE_TTY_FIELD_OPT
// is unset; do_field_opt stays 1 and is read by render_status (not
// this function).
export function tty_status_init() {
    const num_rows = statusRows();
    ttyFieldorder = (num_rows !== 3) ? twolineorder : threelineorder;
    for (let i = 0; i < MAXBLSTATS; ++i) {
        const lth = ttyStatus[NOW][i]?.lth | 0;
        const now = emptyTtyStatusField(lth);
        ttyStatus[NOW][i] = now;
        ttyStatus[BEFORE][i] = emptyTtyStatusField(now.lth);
    }
    ttyConditionBits = 0;
    hpbarPercent = 0;
    hpbarCritHp = 0;
    genl_status_init();
}

// C botl.h:185 status_enablefield → windowprocs.win_status_enablefield.
// tty_procs installs tty_status_enablefield (wintty.c:156). The scored
// port has no proc table, so the tty function is the call.
function status_enablefield(fld, fieldname, fieldfmt, fldenabl) {
    tty_status_enablefield(fld, fieldname, fieldfmt, fldenabl);
}

// =====================================================================
// C win/tty/wintty.c status_update delivery (`:4454–5264`, STATUS_HILITES
// on per config.h:616) + its static callees, in C order with C line cites.
// Field values buffer in statusVals/ttyStatus (above); BL_FLUSH/BL_RESET
// fit (make_things_fit) and render (render_status) into statusWinData —
// the wins[WIN_STATUS]->data mirror — and onto grid rows 22–23. Time-only
// ticks (timebot → stat_update_time) refresh BL_TIME alone; every other
// field keeps its last bot() value, which is the paint C captures.
// =====================================================================

// C wintty.c:4513 Sprintf single-%s-conversion subset: `%[-][width][.prec]s`.
// Minimum width pads with blanks (padStart, or padEnd with '-');
// precision truncates. Surrounding literal text is preserved.
function sprintf_percent_s(fmt, text) {
    const m = /%(-)?(\d+)?(?:\.(\d+))?s/.exec(fmt);
    if (!m) return fmt;
    let val = text;
    if (m[3] !== undefined) val = val.slice(0, parseInt(m[3], 10));
    const width = m[2] !== undefined ? parseInt(m[2], 10) : 0;
    if (val.length < width) val = m[1] ? val.padEnd(width, ' ') : val.padStart(width, ' ');
    return fmt.slice(0, m.index) + val + fmt.slice(m.index + m[0].length);
}

// C wintty.c:4454–4579 tty_status_update (STATUS_HILITES arm; tty_procs
// :158). BL_RESET forces a full re-render, BL_FLUSH renders fit fields,
// BL_CONDITION stashes bits+masks, BL_GOLD decodes mixed glyph text,
// every other field formats into statusVals. Nothing renders except on
// FLUSH/RESET (`:4577`).
export function tty_status_update(fldidx, ptr, chg, percent, color, colormasks) {
    fldidx |= 0; // C int param
    let reset_state = false; // C `:4467` NO_RESET
    if (fldidx < BL_RESET || fldidx >= MAXBLSTATS) return; // C `:4469–4470`
    if (fldidx >= 0 && fldidx < MAXBLSTATS && !statusActivefields[fldidx]) return; // C `:4472–4473`
    if (fldidx === BL_RESET) { // C `:4476–4480`
        reset_state = true; // C FORCE_RESET; FALLTHROUGH
        if (make_things_fit(reset_state) || truncationExpected) render_status();
        // C `:4483–4485` status_sanity_check is compiled out
        // (NH_DEVEL_STATUS == NH_STATUS_RELEASED, patchlevel.h:33).
        return;
    }
    if (fldidx === BL_FLUSH) { // C `:4480`
        if (make_things_fit(reset_state) || truncationExpected) render_status();
        return;
    }
    if (fldidx === BL_CONDITION) { // C `:4488–4496`
        ttyStatus[NOW][fldidx].idx = fldidx;
        ttyConditionBits = ptr | 0; // C :4490 *condptr
        ttyColormasks = colormasks ?? null; // C :4491
        ttyStatus[NOW][fldidx].valid = true;
        ttyStatus[NOW][fldidx].dirty = true;
        ttyStatus[NOW][fldidx].sanitycheck = true;
        truncationExpected = false;
    } else {
        let text = (fldidx === BL_GOLD) // C `:4497–4500`
            ? decode_mixed(String(ptr ?? '')) // :4498 decode_mixed
            : String(ptr ?? ''); // C `:4501` default
        const attrmask = ((color | 0) >> 8) & 0x00FF; // C `:4502`
        let fmt = statusFieldfmt[fldidx]; // C `:4503`
        if (!fmt) fmt = '%s'; // C `:4504–4505`
        // C `:4506–4512` skip the leading blank for a row-first field.
        if (fmt.charAt(0) === ' '
            && (fldidx === ttyFieldorder[0][0] || fldidx === ttyFieldorder[1][0]
                || fldidx === ttyFieldorder[2][0])) fmt = fmt.slice(1);
        // C `:4513` Sprintf(status_vals[fldidx], fmt, text) — every live
        // fmt carries exactly one %s conversion (initblstats fmts, plus
        // the hitpointbar BL_TITLE override `%-30.30s`, botl.c:1714).
        statusVals[fldidx] = sprintf_percent_s(fmt, text);
        ttyStatus[NOW][fldidx].idx = fldidx; // C `:4514`
        ttyStatus[NOW][fldidx].color = (color | 0) & 0x00FF; // C `:4515`
        ttyStatus[NOW][fldidx].attr = term_attr_fixup(attrmask); // C `:4516`
        ttyStatus[NOW][fldidx].lth = statusVals[fldidx].length; // C `:4517`
        ttyStatus[NOW][fldidx].valid = true; // C `:4518–4520`
        ttyStatus[NOW][fldidx].dirty = true;
        ttyStatus[NOW][fldidx].sanitycheck = true;
    }
    // C `:4524–4531` suppress the lone blank the core sends for unused
    // carrying-capacity.
    if (fldidx >= 0 && fldidx < MAXBLSTATS
        && ttyStatus[NOW][fldidx].lth === 1 && statusVals[fldidx].charAt(0) === ' ') {
        statusVals[fldidx] = '';
        ttyStatus[NOW][fldidx].lth = 0;
    }
    // C `:4534–4576` second switch (default processing above first).
    if (fldidx === BL_HP && (game.iflags?.wc2_hitpointbar | 0)) { // C `:4535–4545`
        hpbarPercent = percent | 0; // C `:4538`
        hpbarCritHp = critically_low_hp(true) ? 1 : 0; // C `:4539`
        ttyStatus[NOW][BL_TITLE].color = (color | 0) & 0x00FF; // C `:4540`
        const tha = HL_INVERSE | (hpbarCritHp ? HL_BLINK : 0); // C `:4541`
        ttyStatus[NOW][BL_TITLE].attr = term_attr_fixup(tha); // C `:4542`
        ttyStatus[NOW][BL_TITLE].dirty = true; // C `:4543`
    } else if (fldidx === BL_LEVELDESC || fldidx === BL_HUNGER) { // C `:4546–4560`
        // LEVELDESC falls through into HUNGER's blank-strip in C.
        if (fldidx === BL_LEVELDESC) dlvlShrinklvl = 0; // C `:4547`
        // C `:4551–4559` strip trailing blanks.
        if (ttyStatus[NOW][fldidx].lth > 0) {
            let s = statusVals[fldidx];
            while (s.length > 0 && s.charAt(s.length - 1) === ' ') s = s.slice(0, -1);
            statusVals[fldidx] = s;
            ttyStatus[NOW][fldidx].lth = s.length;
        }
    } else if (fldidx === BL_TITLE) { // C `:4561–4566`
        if (game.iflags?.wc2_hitpointbar) ttyStatus[NOW][fldidx].lth = 30 + 2;
    } else if (fldidx === BL_GOLD) { // C `:4567–4571`
        // A surviving \G counts 1 display cell, not 10 source chars.
        const p = statusVals[fldidx].indexOf('\\');
        if (p >= 0 && statusVals[fldidx].charAt(p + 1) === 'G') ttyStatus[NOW][fldidx].lth -= (10 - 1);
    } else if (fldidx === BL_CAP) { // C `:4572–4575`
        encShrinklvl = 0; // C `:4573` caller passes the full word
        enclev = stat_cap_indx(); // C `:4574`
    }
    // C `:4577` render on BL_FLUSH/BL_RESET only.
}

// C wintty.c:4583–4638 make_things_fit — restore shrink levels, measure
// rows, then shrink conditions (2 tries), encumbrance (2), Dlvl (1),
// else expect truncation. Returns the condition-row requirement, 0 when
// fields are not all valid yet.
function make_things_fit(force_update) {
    let fitting = 0; // C `:4586`
    const rowsz = [0, 0, 0]; // C `:4587` MAX_STATUS_ROWS
    const num_rows = statusRows(); // C `:4589`
    const condrow = num_rows - 1; // C `:4590`
    let otheroptions = 0; // C `:4587`
    condShrinklvl = 0; // C `:4591`
    if (encShrinklvl > 0 && num_rows === 2) shrink_enc(0); // C `:4592–4593`
    if (dlvlShrinklvl > 0) shrink_dlvl(0); // C `:4594–4595`
    set_condition_length(); // C `:4596`
    for (let trycnt = 0; trycnt < 6 && !fitting; ++trycnt) { // C `:4597`
        if (!check_fields(force_update, rowsz)) { // C `:4601–4604`
            fitting = 0;
            break;
        }
        const requirement = rowsz[condrow] - 1; // C `:4606`
        if (requirement <= STATUS_COLS - 1) { // C `:4607–4610` wins cols
            fitting = requirement;
            break;
        }
        if (trycnt < 2) { // C `:4611–4617`
            if (condShrinklvl < trycnt + 1) {
                condShrinklvl = trycnt + 1;
                set_condition_length();
            }
            continue;
        }
        if (condShrinklvl >= 2) { // C `:4618–4635`
            if (otheroptions < 2) {
                if (num_rows === 2) shrink_enc(otheroptions + 1); // C `:4625–4626`
            } else if (otheroptions === 2) {
                shrink_dlvl(1); // C `:4628`
            } else {
                truncationExpected = true; // C `:4631`
                break;
            }
            ++otheroptions; // C `:4634` runs even when num_rows is 3
        }
    }
    return fitting; // C `:4637`
}

// C wintty.c:4646–4743 check_fields — lay out every active field (x/y),
// flag moves (update_right/redraw), and take the same-contents shortcut
// (matchprev) against the window buffer. sz[row] takes the 1-based end.
// FALSE while any field is still invalid.
function check_fields(forcefields, sz) {
    if (!windowdataInit && !check_windowdata()) return false; // C `:4652–4653`
    const num_rows = statusRows(); // C `:4655`
    let valid = true; // C `:4650`
    for (let row = 0; row < num_rows; ++row) { // C `:4656`
        sz[row] = 0;
        let col = 1; // C `:4658`
        let update_right = false; // C `:4659`
        for (let i = 0; ttyFieldorder[row][i] !== BL_FLUSH; ++i) { // C `:4660`
            const idx = ttyFieldorder[row][i];
            if (!statusActivefields[idx]) continue; // C `:4661–4662`
            if (!ttyStatus[NOW][idx].valid) valid = false; // C `:4663–4664`
            ttyStatus[NOW][idx].redraw = false; // C `:4667`
            ttyStatus[NOW][idx].y = row; // C `:4668`
            ttyStatus[NOW][idx].x = col; // C `:4669`
            // C `:4671–4682` a moved field end resyncs everything right.
            if (ttyStatus[NOW][idx].x + ttyStatus[NOW][idx].lth
                !== ttyStatus[BEFORE][idx].x + ttyStatus[BEFORE][idx].lth) {
                update_right = true;
            } else if (ttyStatus[NOW][idx].lth !== ttyStatus[BEFORE][idx].lth
                || ttyStatus[NOW][idx].x !== ttyStatus[BEFORE][idx].x) {
                ttyStatus[NOW][idx].redraw = true;
            } else {
                update_right = false;
            }
            let matchprev = false; // C `:4684`
            if (valid && !update_right && !forcefields // C `:4685–4686`
                && !ttyStatus[NOW][idx].redraw) {
                // C `:4691–4699` same-contents shortcut (conditions skip:
                // color/attr checks and status_vals are wrong for them).
                if (doFieldOpt && idx !== BL_CONDITION
                    && ttyStatus[NOW][idx].color === ttyStatus[BEFORE][idx].color
                    && ttyStatus[NOW][idx].attr === ttyStatus[BEFORE][idx].attr) {
                    matchprev = true; // C `:4700`
                    if (ttyStatus[NOW][idx].dirty) { // C `:4701`
                        const nb = statusVals[idx] ?? ''; // C `:4708`
                        let c = col - 1; // C `:4706`
                        let k = 0;
                        while (k < nb.length && c < STATUS_COLS) { // C `:4709`
                            if (nb[k] !== statusWinData[row][c]) break; // C `:4710–4711`
                            k++; // C `:4712–4714`
                            c++;
                        }
                        // C `:4716–4722` unmatched remainder, or overrun.
                        // (`:4723–4728` is #if 0, compiled out.)
                        if (k < nb.length) matchprev = false;
                    }
                }
            }
            if (forcefields || update_right // C `:4734–4736`
                || (ttyStatus[NOW][idx].dirty && !matchprev)) {
                ttyStatus[NOW][idx].redraw = true;
            }
            col += ttyStatus[NOW][idx].lth; // C `:4738`
        }
        sz[row] = col; // C `:4740`
    }
    return valid; // C `:4742`
}

// C wintty.c:4844–4857 set_condition_length — 1 blank + word per set
// condition bit at the current shrink level (caller sets condShrinklvl).
function set_condition_length() {
    let lth = 0; // C `:4847`
    if (ttyConditionBits) { // C `:4849`
        for (let c = 0; c < CONDITION_COUNT; ++c) { // C `:4850` SIZE
            const mask = conditions[c].mask; // C `:4851`
            if ((ttyConditionBits & mask) === mask) // C `:4852`
                lth += 1 + conditions[c].text[condShrinklvl].length; // C `:4853`
        }
    }
    ttyStatus[NOW][BL_CONDITION].lth = lth; // C `:4856`
}

// C wintty.c:4860–4868 shrink_enc — shrink (lvl 0–2) or restore the
// encumbrance word; lth always re-measures, even past level 2.
function shrink_enc(lvl) {
    if (lvl <= 2) { // C `:4863`
        encShrinklvl = lvl; // C `:4864`
        statusVals[BL_CAP] = ' ' + encvals[lvl][enclev]; // C `:4865`
    }
    ttyStatus[NOW][BL_CAP].lth = statusVals[BL_CAP].length; // C `:4867`
}

// C wintty.c:4871–4884 shrink_dlvl — Dlvl: to Dl: (lvl 1) or back (0).
function shrink_dlvl(lvl) {
    const cur = statusVals[BL_LEVELDESC] ?? ''; // C `:4875` strchr ':'
    const ci = cur.indexOf(':');
    if (ci >= 0) { // C `:4877`
        dlvlShrinklvl = lvl; // C `:4878`
        const head = (lvl === 0) ? 'Dlvl' : 'Dl'; // C `:4879`
        statusVals[BL_LEVELDESC] = head + cur.slice(ci); // C `:4880–4881`
        ttyStatus[NOW][BL_LEVELDESC].lth = statusVals[BL_LEVELDESC].length; // C `:4882`
    }
}

// C wintty.c:4891–4901 check_windowdata — the status window buffer
// starts blank and null-terminated (paniclog is log-only here).
function check_windowdata() {
    // C `:4893–4895` — no WinDesc table in JS; game.WIN_STATUS is the
    // validity signal (genl_status_init). paniclog writes a log file,
    // excluded by Rule #2 (display.js impossible precedent).
    if (game.WIN_STATUS == null || (game.WIN_STATUS | 0) === WIN_ERR) return false;
    if (!windowdataInit) { // C `:4896–4899` tty_clear_nhwindow
        for (let r = 0; r < statusWinData.length; r++) statusWinData[r].fill(' ');
        const disp = game.nhDisplay;
        if (disp?.setCell) {
            for (let r = 0; r < statusRows(); r++) {
                for (let c = 0; c < STATUS_COLS; c++) disp.setCell(c, 22 + r, ' ', NO_COLOR, 0);
            }
        }
        windowdataInit = true;
    }
    return true; // C `:4900`
}

// C wintty.c:4908–4918 condcolor — first CLR_ slot whose mask hits.
function condcolor(bm, bmarray) {
    if ((bm | 0) && bmarray) { // C `:4912`
        for (let i = 0; i < CLR_MAX; ++i) { // C `:4913`
            if (((bm | 0) & (bmarray[i] | 0)) !== 0) return i; // C `:4914–4915`
        }
    }
    return NO_COLOR; // C `:4917`
}

// C wintty.c:4921–4953 condattr — HL_ bits from the ATTCLR slots.
function condattr(bm, bmarray) {
    let attr = 0; // C `:4923`
    if ((bm | 0) && bmarray) { // C `:4926`
        for (let i = HL_ATTCLR_BOLD; i < BL_ATTCLR_MAX; ++i) { // C `:4927`
            if (((bm | 0) & (bmarray[i] | 0)) !== 0) { // C `:4928`
                switch (i) { // C `:4929–4948`
                case HL_ATTCLR_BOLD: attr |= HL_BOLD; break;
                case HL_ATTCLR_DIM: attr |= HL_DIM; break;
                case HL_ATTCLR_ITALIC: attr |= HL_ITALIC; break;
                case HL_ATTCLR_ULINE: attr |= HL_ULINE; break;
                case HL_ATTCLR_BLINK: attr |= HL_BLINK; break;
                case HL_ATTCLR_INVERSE: attr |= HL_INVERSE; break;
                }
            }
        }
    }
    return attr; // C `:4952`
}

// Render-terminal state (term_start/end_color/attr targets). Colors are
// CLR_* / NO_COLOR like the map paints; attrs are the HL_* mask.
let renderFg = NO_COLOR;
let renderAttrHL = 0;
// Status-window cursor (1-based x, 0-based y); cl_end's origin. Mid-render
// positions are unobservable (callers re-curs after bot()).
let statusCurX = 1;
let statusCurY = 0;
// C render_status `:5110` once_only truncation warn flag.
let renderTruncWarned = false;

// C termcap term_start_color/term_end_color — subsequent field chars
// take coloridx, then back to default. Dormant without statushilites
// rules (render guards every call on iflags.hilite_delta).
function term_start_color(coloridx) {
    if ((coloridx | 0) !== NO_COLOR) renderFg = coloridx | 0;
}
function term_end_color() {
    renderFg = NO_COLOR;
}

// C wintty.c Begin_Attr/End_Attr (`:4955–4989`) — HL_ mask on/off around
// a field. The cell sink carries bold/inverse/uline bits (display.js
// sgrTransition); dim/blink/italic have no cell bit and stay stored-only.
function begin_attr(m) {
    renderAttrHL |= (m | 0);
}
function end_attr(m) {
    renderAttrHL &= ~(m | 0);
}

// HL_* mask to the setCell attr bits (1 inv, 2 bold, 4 under).
function hl_to_cell_attr(m) {
    let a = 0;
    if ((m | 0) & HL_BOLD) a |= 2;
    if ((m | 0) & HL_INVERSE) a |= 1;
    if ((m | 0) & HL_ULINE) a |= 4;
    return a;
}

// C tty_curs(WIN_STATUS, x, y) inside the status render — cursor model.
function status_curs(x, y) {
    statusCurX = x | 0;
    statusCurY = y | 0;
}

// C termcap.c cl_end (`:648–663`) — clear visible cells from the cursor
// to end of line. C clears the tty, not cw->data; JS also clears the
// mirror (mirror==visible invariant — the cleared span sits past every
// field end, so check_fields' same-contents compare, which stays inside
// field spans, never reads it; the row commit below does). xterm HAS CE
// so the cursor does not move (the no-CE space-fill arm is dead there).
function status_cl_end() {
    const disp = game.nhDisplay;
    for (let c = statusCurX - 1; c < STATUS_COLS; c++) {
        if (c < 0) continue;
        statusWinData[statusCurY][c] = ' ';
        if (disp?.setCell) disp.setCell(c, 22 + statusCurY, ' ', NO_COLOR, 0);
    }
}

// C wintty.c:4803–4840 tty_putstatusfield — one field string at (x, y):
// x 1-based, y 0-based; chars land in the window buffer and on screen.
function tty_putstatusfield(text, x, y) {
    // C `:4808–4810` — unreachable past check_windowdata; C panics.
    if (game.WIN_STATUS == null || (game.WIN_STATUS | 0) === WIN_ERR) {
        throw new Error('tty_putstatusfield: Invalid WinDesc');
    }
    // C `:4816` print_vt_code2 AVTC_SELECT_WINDOW — tile-protocol emit,
    // no tty text effect.
    const nrows = statusRows(); // C `:4813` cw->maxrow
    x |= 0; y |= 0;
    if (x < STATUS_COLS && y < nrows) { // C `:4818`
        if (x !== statusCurX || y !== statusCurY) status_curs(x, y); // C `:4819–4820`
        const s = String(text ?? ''); // C `:4814` lth
        const disp = game.nhDisplay;
        for (let i = 0; i < s.length; ++i) { // C `:4821`
            const n = i + x; // C `:4822`
            if (n < STATUS_COLS && s[i]) { // C `:4823`
                statusWinData[y][n - 1] = s[i]; // C `:4827` cw->data
                // Capture-normalized form: the recorder compresses space
                // runs longer than 4 to CSI CUF (terminal.js serialize
                // precedent; do_statusline1 gap rule) and the worker
                // renders CUF-skips as blank attr-0 cells (frozen
                // screen-decode), so a status space in such a run lands
                // attr-free even when painted under an attr (hitpointbar
                // pad under Begin_Attr, wintty.c:5159–5166). Short runs
                // are written verbatim with attrs (C wintty.c:4824
                // putchar), intra-name spaces included.
                let chAttr = hl_to_cell_attr(renderAttrHL);
                if (s[i] === ' ') {
                    // Maximal space run within s containing i, both
                    // directions — the bar pad touches the string end.
                    let lo = i, hi = i;
                    while (lo - 1 >= 0 && s[lo - 1] === ' ') lo--;
                    while (s[hi + 1] === ' ') hi++;
                    if (hi - lo + 1 > 4) chAttr = 0;
                }
                if (disp?.setCell) disp.setCell(n - 1, 22 + y, s[i], renderFg, chAttr); // C `:4824` putchar
                statusCurX++; // C `:4825–4826` curx++
            }
        }
    }
    // C `:4832–4839` #if 0, compiled out.
}

// C wintty.c:4992–5264 render_status — paint redraw-flagged fields in
// fieldorder, conditions word by word (cond_idx order), then erase a
// shrunk tail and roll NOW to BEFORE.
function render_status() {
    const num_rows = statusRows(); // C `:5006`
    for (let row = 0; row < num_rows; ++row) { // C `:5007`
        // C `:5008` HUPSKIP — done_hup return; morc is display-local
        // (xwaitforspace bypass) and SIGHUP is unreachable in contest.
        if (game.program_state?.done_hup) return;
        const y = row; // C `:5009`
        status_curs(1, y); // C `:5010` tty_curs(WIN_STATUS, 1, y)
        let x = 1; // C `:4995` reused across the row (`:5251`)
        for (let i = 0; ttyFieldorder[row][i] !== BL_FLUSH; ++i) { // C `:5011`
            const idx = ttyFieldorder[row][i];
            if (!statusActivefields[idx]) continue; // C `:5012–5013`
            x = ttyStatus[NOW][idx].x; // C `:5014`
            const text0 = statusVals[idx] ?? ''; // C `:5015` ("" for CONDITION)
            const tlth = ttyStatus[NOW][idx].lth | 0; // C `:5016`
            if (ttyStatus[NOW][idx].redraw || !doFieldOpt) { // C `:5018`
                const hitpointbar = idx === BL_TITLE // C `:5019–5020`
                    && (game.iflags?.wc2_hitpointbar | 0);
                if (idx === BL_CONDITION) { // C `:5022–5116`
                    let bits = ttyConditionBits | 0; // C `:5028`
                    // C `:5037–5071` third-row condition indent.
                    if (row === 2 && bits !== 0) { // C `:5037` MAX_STATUS_ROWS-1
                        let last_col = STATUS_COLS; // C `:5038` cw->cols
                        if (statusActivefields[BL_VERS] // C `:5044–5046`
                            && ttyFieldorder[row][i + 1] === BL_VERS) {
                            last_col -= ttyStatus[NOW][BL_VERS].lth | 0;
                        }
                        let cstart; // C `:5047–5061`
                        if (ttyStatus[BEFORE][BL_HUNGER].y < row
                            && x < ttyStatus[BEFORE][BL_HUNGER].x
                            && (ttyStatus[BEFORE][BL_HUNGER].x + tlth < last_col - 1)) {
                            cstart = ttyStatus[BEFORE][BL_HUNGER].x;
                        } else if (x + tlth < STATUS_COLS - 1) {
                            cstart = last_col - tlth;
                        } else {
                            cstart = x;
                        }
                        if (x < cstart) { // C `:5063–5070`
                            do {
                                if (statusWinData[y][x - 1] !== ' ') tty_putstatusfield(' ', x, y); // C `:5065–5066` dat
                                x++;
                            } while (x < cstart);
                            ttyStatus[NOW][BL_CONDITION].x = x; // C `:5068`
                            status_curs(x, y); // C `:5069`
                        }
                    }
                    // C `:5073–5104` draw condition words in cond_idx order.
                    for (let c = 0; c < CONDITION_COUNT && bits !== 0; ++c) { // C `:5073` SIZE
                        const ci = cond_idx[c]; // C `:5074`
                        const mask = conditions[ci].mask; // C `:5075`
                        if (((bits | 0) & mask) !== 0) { // C `:5076` bits & mask
                            let coloridx = NO_COLOR; // C `:4996`
                            let attrmask = 0;
                            tty_putstatusfield(' ', x++, y); // C `:5079`
                            if (game.iflags?.hilite_delta) { // C `:5080–5086`
                                attrmask = condattr(mask, ttyColormasks);
                                begin_attr(attrmask);
                                coloridx = condcolor(mask, ttyColormasks);
                                if (coloridx !== NO_COLOR) term_start_color(coloridx);
                            }
                            let condtext = conditions[ci].text[condShrinklvl]; // C `:5087`
                            if (x >= STATUS_COLS && !truncationExpected) { // C `:5088–5094`
                                void impossible('Unexpected condition placement overflow for "%s"', condtext);
                                condtext = '';
                                bits = 0;
                            }
                            tty_putstatusfield(condtext, x, y); // C `:5095`
                            x += condtext.length; // C `:5096`
                            if (game.iflags?.hilite_delta) { // C `:5097–5101`
                                if (coloridx !== NO_COLOR) term_end_color();
                                end_attr(attrmask);
                            }
                            bits &= ~mask; // C `:5102`
                        }
                    }
                    // C `:5109–5116` x==cols may sit on the terminator;
                    // past it truncates (paniclog is Rule #2 log-only).
                    if (x > STATUS_COLS) {
                        if (!truncationExpected && !renderTruncWarned) renderTruncWarned = true;
                        x = STATUS_COLS;
                    }
                } else if (hitpointbar) { // C `:5117–5177` title HP bar
                    let bar; // C `:5125` bar[30+1]
                    const ttext = text0;
                    if (ttext.length !== 30) { // C `:5130–5135` %-30.30s
                        bar = ttext.padEnd(30).slice(0, 30);
                        statusVals[BL_TITLE] = bar; // C `:5132` writeback
                    } else {
                        bar = ttext; // C `:5134`
                    }
                    if (hpbarCritHp) bar = repad_with_dashes(bar); // C `:5136–5137`
                    const bar_len = bar.length; // C `:5138` always 30
                    const twoparts = hpbarPercent < 100; // C `:5126`
                    let attrmask = 0; // C `:5140` dead-case default
                    let bar2 = '';
                    if (twoparts) { // C `:5144–5154`
                        let bar_pos = Math.trunc((bar_len * hpbarPercent) / 100); // C `:5146`
                        if (bar_pos < 1 && hpbarPercent > 0) bar_pos = 1; // C `:5147–5148`
                        if (bar_pos >= bar_len && hpbarPercent < 100) bar_pos = bar_len - 1; // C `:5149–5150`
                        bar2 = bar.slice(bar_pos); // C `:5151–5153` split
                        bar = bar.slice(0, bar_pos);
                    }
                    tty_putstatusfield('[', x++, y); // C `:5155`
                    if (bar.length) { // C `:5156` *bar
                        const coloridx = ttyStatus[NOW][BL_TITLE].color; // C `:5157`
                        attrmask = ttyStatus[NOW][BL_TITLE].attr; // C `:5158`
                        begin_attr(attrmask); // C `:5159`
                        if (game.iflags?.hilite_delta && coloridx !== NO_COLOR) term_start_color(coloridx); // C `:5160–5161`
                        tty_putstatusfield(bar, x, y); // C `:5162`
                        x += bar.length; // C `:5163`
                        if (game.iflags?.hilite_delta && coloridx !== NO_COLOR) term_end_color(); // C `:5164–5165`
                        end_attr(attrmask); // C `:5166`
                    }
                    if (twoparts) { // C `:5168–5176`
                        // C `:5169–5170` ATR_BLINK has no cell bit (dormant:
                        // hitpointbar off in contest); the text still paints.
                        tty_putstatusfield(bar2, x, y); // C `:5172`
                        x += bar2.length; // C `:5173`
                    }
                    tty_putstatusfield(']', x++, y); // C `:5177`
                } else { // C `:5178–5235` ordinary field
                    if (idx === BL_VERS // C `:5185–5188` trailing version
                        && ttyFieldorder[row][i + 1] === BL_FLUSH) { // right-justifies
                        // C `:5191–5202` FIXME resync after 3rd-row indents.
                        const vx = (ttyStatus[BEFORE][BL_CONDITION].x | 0)
                            + (ttyStatus[BEFORE][BL_CONDITION].lth | 0);
                        if (i > 0 && ttyFieldorder[row][i - 1] === BL_CONDITION && x !== vx) {
                            x = vx;
                            status_curs(x, y); // C `:5201`
                        }
                        const vstart = STATUS_COLS - (ttyStatus[NOW][idx].lth | 0); // C `:5204`
                        if (x < vstart) { // C `:5205–5211`
                            do {
                                if (statusWinData[y][x - 1] !== ' ') tty_putstatusfield(' ', x, y); // C `:5207–5208` dat
                                x++;
                            } while (x < vstart);
                            ttyStatus[NOW][BL_VERS].x = x; // C `:5210`
                        }
                    }
                    let text = text0;
                    if (game.iflags?.hilite_delta) { // C `:5213–5227`
                        while (text.charAt(0) === ' ') { // C `:5214–5217`
                            tty_putstatusfield(' ', x++, y);
                            text = text.slice(1);
                        }
                        if (text.charAt(0) === '/' && idx === BL_EXP) { // C `:5218–5221`
                            tty_putstatusfield('/', x++, y);
                            text = text.slice(1);
                        }
                        const am = ttyStatus[NOW][idx].attr; // C `:5222–5226`
                        begin_attr(am);
                        const ci = ttyStatus[NOW][idx].color;
                        if (ci !== NO_COLOR) term_start_color(ci);
                        tty_putstatusfield(text, x, y); // C `:5228`
                        x += text.length; // C `:5229`
                        if (ci !== NO_COLOR) term_end_color(); // C `:5230–5234`
                        end_attr(am);
                    } else {
                        tty_putstatusfield(text, x, y); // C `:5228`
                        x += text.length; // C `:5229`
                    }
                }
            } else {
                x += tlth; // C `:5238` not rendered, same text as before
            }
            finalx[row][NOW] = x - 1; // C `:5240`
            // C `:5242–5244` reset flags now the field is rendered.
            ttyStatus[NOW][idx].dirty = false;
            ttyStatus[NOW][idx].redraw = false;
            ttyStatus[NOW][idx].sanitycheck = false;
            ttyStatus[BEFORE][idx] = { ...ttyStatus[NOW][idx] }; // C `:5249` value copy
        }
        // C `:5251–5256` a shrunk row erases its tail.
        x = finalx[row][NOW]; // C `:5251` (x is reused; keep the name)
        if ((x < finalx[row][BEFORE] || !finalx[row][BEFORE]) // C `:5252`
            && x + 1 < STATUS_COLS) { // cw->cols
            status_curs(x + 1, y); // C `:5254`
            status_cl_end(); // C `:5255`
        }
        finalx[row][BEFORE] = finalx[row][NOW]; // C `:5261`
    }
    // Publish the painted rows for the flush/overlay readers (the
    // window-buffer equivalent of display.js _commitStatusLines): C has
    // no such strings. The mirror is visible-identical (status_cl_end
    // clears it with the grid), so visible content is the row through
    // finalx, trailing blanks trimmed like _statusLine1/2 emit.
    const rows = [];
    for (let r = 0; r < 2; r++) {
        const end = Math.max(0, (finalx[r][NOW] | 0) + 1);
        rows.push(statusWinData[r].slice(0, end).join('').replace(/ +$/, ''));
    }
    set_committed_status_lines(rows[0] ?? '', rows[1] ?? '');
    // C `:5263` return (void).
}

// C windows.c:1439–1463 decode_glyph — 4 rndencode hex + 4 glyph hex
// (hexdd halves the strchr offset). Returns the digit count, 0 when the
// check word mismatches (glyph_ptr untouched); out is boxed (out.v).
function decode_glyph(str, out) {
    let rndchk = 0, dcount = 0, retval = 0; // C `:1441`
    let i = 0;
    const s = String(str ?? '');
    for (; i < s.length && ++dcount <= 4; ++i) { // C `:1444`
        const dp = HEXDD.indexOf(s[i]); // C `:1445` strchr
        if (dp >= 0) { // C `:1445`
            retval++; // C `:1446`
            rndchk = (rndchk * 16) + Math.trunc(dp / 2); // C `:1447`
        } else break; // C `:1448–1449`
    }
    if (rndchk === (game.svc?.context?.rndencode | 0)) { // C `:1451`
        out.v = 0; // C `:1452` *glyph_ptr = dcount = 0
        dcount = 0;
        for (; i < s.length && ++dcount <= 4; ++i) { // C `:1453`
            const dp = HEXDD.indexOf(s[i]); // C `:1454`
            if (dp >= 0) { // C `:1454`
                retval++; // C `:1455`
                out.v = (out.v * 16) + Math.trunc(dp / 2); // C `:1456`
            } else break; // C `:1457–1458`
        }
        return retval; // C `:1460`
    }
    return 0; // C `:1462`
}

// C windows.c:1466–1512 decode_mixed — expand \GXXXXNNNN glyph escapes
// to their showsyms char (single pass, no rescan). A failed check word
// stays literal (possible forgery); trailing lone backslash survives;
// any other \x drops the backslash.
export function decode_mixed(str) {
    let out = '';
    const s = String(str ?? '');
    let i = 0;
    while (i < s.length) { // C `:1474`
        if (s[i] === '\\') { // C `:1475`
            const save = i; // C `:1479` save_str
            i++; // C `:1479` str++
            const c = i < s.length ? s[i] : '\0'; // C `:1480` switch
            if (c === 'G') { // C `:1481` glyph value
                const box = { v: 0 };
                const dcount = decode_glyph(s.slice(i + 1), box); // C `:1482`
                if (dcount) { // C `:1482`
                    i += (dcount + 1); // C `:1483`
                    // C `:1484–1486` map_glyphinfo symidx → showsyms.
                    const so = glyphmap_symidx(box.v);
                    const sh = game.gs?.showsyms?.[so];
                    out += (typeof sh === 'string' && sh.length) ? sh[0] : '?';
                    continue; // C `:1485–1487` no copy this iteration
                }
                i = save; // C `:1490` forgery — literal
            } else if (c === '\\') { // C `:1493–1494` → copy one below
                // fall through to the shared copy
            } else if (c === '\0') { // C `:1495–1504` trailing backslash
                i = save; // C `:1503`
            }
            // C default (`:1506`): no case — the backslash is dropped.
        }
        out += s[i] ?? ''; // C `:1507` *put++ = *str++
        i++;
    }
    return out; // C `:1510–1511`
}

// C win/tty/termcap.c:1411–1428 term_attr_fixup — drop highlights the
// terminal cannot do (kept in sync with s_atr2str). The recorder runs
// xterm-256color (record-session.mjs), where US (uline), MB (blink)
// and MH (dim) all exist, so every arm below reads present.
export function term_attr_fixup(msk) {
    msk |= 0; // C int param
    const has_US = true; // C `:1415` nh_US — xterm present
    const has_MB = true; // C `:1420` MB — xterm present
    const has_MH = true; // C `:1425` MH — xterm present
    if ((msk & HL_ULINE) && !has_US) { // C `:1415–1418`
        msk |= HL_BOLD;
        msk &= ~HL_ULINE;
    }
    if ((msk & HL_BLINK) && !has_MB) { // C `:1420–1423`
        msk |= HL_BOLD;
        msk &= ~HL_BLINK;
    }
    if ((msk & HL_DIM) && !has_MH) { // C `:1425–1427`
        msk &= ~HL_DIM;
    }
    return msk; // C `:1428`
}

// C botl.c:1683-1720 status_initialize.
// reassessment TRUE (REASSESS_ONLY): skip blstats/window init, panic
// if blinit is still false, then recompute every field's enable bit.
// Full init impossibles on a second call but does not return: init_blstats
// refuses the second copy, then win_status_init and the field loop still run.
export function status_initialize(reassessment) {
    if (!reassessment) {
        if (game.gb?.blinit) {
            // C :1691. impossible returns; this is not an error return.
            // Not awaited (sync caller). The double-init path is the only
            // arm, and it still continues into init_blstats.
            void impossible('2nd status_initialize with full init.');
        }
        init_blstats();
        // C :1695 (*windowprocs.win_status_init)() — tty_status_init.
        tty_status_init();
        if (!game.gb) game.gb = {};
        game.gb.blinit = true;
    } else if (!game.gb?.blinit) {
        // C :1698 panic — does not return.
        throw new Error("status 'reassess' before init");
    }
    const polyd = !!Upolyd(game.u);
    const flags = game.flags ?? {};
    for (let i = 0; i < MAXBLSTATS; ++i) {
        const fld = initblstats[i].fld;
        // C :1704-1714 nested ?: — one predicate per field, else TRUE.
        const fldenabl = (fld === BL_SCORE) ? !!flags.showscore
            : (fld === BL_TIME) ? !!flags.time
                : (fld === BL_EXP) ? !!(flags.showexp && !polyd)
                    : (fld === BL_XP) ? !polyd
                        : (fld === BL_HD) ? polyd
                            : (fld === BL_VERS) ? !!flags.showvers
                                : (fld === BL_WEAPON) ? !!flags.weaponstatus
                                    : (fld === BL_ARMOR) ? !!flags.armorstatus
                                        : (fld === BL_TERRAIN) ? !!flags.terrainstatus
                                            : true;
        const fieldname = initblstats[i].name;
        const fieldfmt = (fld === BL_TITLE && game.iflags?.wc2_hitpointbar)
            ? '%-30.30s'
            : initblstats[i].fmt;
        status_enablefield(fld, fieldname, fieldfmt, fldenabl);
    }
    if (!game.gu) game.gu = {};
    game.gu.update_all = true; // C :1718
    if (!game.disp) game.disp = {};
    game.disp.botlx = true; // C :1719
    // bot() reads flags.botlx (reset_status_hilites, same store).
    if (!game.flags) game.flags = {};
    game.flags.botlx = true;
}

// C wintty.c:491-507 new_status_window (static). STATUS_HILITES is on,
// so the reassess call is live. Callers winch_handler (wintty.c:431)
// and tty_preference_update (wintty.c:602) have no JS site.
export function new_status_window() {
    const win = game.WIN_STATUS;
    if (win != null && (win | 0) !== WIN_ERR) {
        // tty_clear_nhwindow (wintty.c:1034) and tty_destroy_nhwindow
        // (wintty.c:2009) are not ported. Drop the sentinel the way
        // destroy assigns WIN_ERR.
        game.WIN_STATUS = WIN_ERR;
    }
    genl_status_finish();
    tty_status_init();
    // Second tty_clear_nhwindow(WIN_STATUS) (wintty.c:503) blanks the
    // status rows and sets disp.botlx (wintty.c:1072). The clear is
    // named; status_initialize sets botlx on the next line.
    status_initialize(REASSESS_ONLY);
}

// C botl.c:1809-1884 — compare_blstats(): prev-vs-new change direction
// (1 = went up/increased, -1 = went down, 0 = same; bitmask 0/1 same/changed).
// C panic() aborts the game; JS has no sync abort, so the two bad-pointer
// arms throw with the C message (loud, never silent). fmt_ptr() lives in
// js/alloc.js but the field index rides along here instead (stable ids).
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

// C botl.c:2090-2125 — exp_percent_changing(). STATUS_HILITES is on
// (config.h:616), so the thresholds gate and the get_hilite compare are
// the compiled body. disp.botl is game.flags.botl, the bit bot() reads.
// A BL_XP slot the hilite parser created before init_blstats() has no
// percent_matters; the INIT_BLSTATP row is TRUE (botl.c:717).
export function exp_percent_changing() {
    if (!game.flags?.botl) { // C :2099
        const curr = game.gb?.blstats?.[now_or_before_idx]?.[BL_XP] ?? null; // C :2106
        const percentMatters = curr
            ? (curr.percent_matters ?? initblstats[BL_XP].pct)
            : initblstats[BL_XP].pct;
        const thresholds = curr ? curr.thresholds : null; // C :2112
        if (percentMatters && thresholds) { // C :2110-2113
            const pc = exp_percentage(); // C :2113
            if (pc !== (curr.percent_value ?? 0)) {
                const a = zeroAnything(); // C :2114 cg.zeroany
                a.a_int = (game.u?.ulevel | 0); // C :2115
                const colorBox = { v: NO_COLOR }; // C :2095 color_dummy
                const rule = get_hilite(now_or_before_idx, BL_XP, a, 0, pc, colorBox); // C :2117-2118
                if (rule !== (curr.hilite_rule ?? null)) return true; // C :2119-2120
            }
        }
    }
    return false; // C :2124
}

// C botl.c:2131–2141 stat_cap_indx() — encumbrance index for the tty
// status highlighter (wintty.c:4574): the BL_CAP anything int of the live
// buffer (`:2136`). The `#else` near_capacity() arm (`:2138`) is compiled
// out (STATUS_HILITES is defined, config.h:616). Unbuilt blstats reads 0
// (init_blstats zero-inits a_int; linestr_gather `?.` precedent).
export function stat_cap_indx() {
    return game.gb?.blstats?.[now_or_before_idx]?.[BL_CAP]?.a?.a_int | 0; // C `:2136`
}

// C botl.c:2146–2156 stat_hunger_indx() — hunger index for the tty status
// highlighter: the BL_HUNGER anything int of the live buffer (`:2151`).
// The `#else` u.uhs arm (`:2153`) is compiled out (STATUS_HILITES is
// defined, config.h:616). No C callers; exported like C (extern).
export function stat_hunger_indx() {
    return game.gb?.blstats?.[now_or_before_idx]?.[BL_HUNGER]?.a?.a_int | 0; // C `:2151`
}

// C botl.c:2160–2165 bl_idx_to_fldname() — initblstats[].fldname for a
// valid index (the JS field is `name`; status_hilite2str `:112–143`
// mirror note), NULL (null) outside [0, MAXBLSTATS) (`:2165`). No C
// callers beyond the extern.h:286 declaration; exported like C.
export function bl_idx_to_fldname(idx) {
    idx |= 0; // C int param
    if (idx >= 0 && idx < MAXBLSTATS) return initblstats[idx].name; // C `:2163–2164`
    return null; // C `:2165`
}

// C botl.c:2170–2178 repad_with_dashes() — the tty HP bar's critical-HP
// restyle (wintty.c:5137): walk back from eos over trailing space pairs,
// replacing the second space of each pair with a dash (`:2175–2177`). C
// mutates the buffer in place; JS strings are immutable, so this returns
// the restyled string (eos index-walk precedent, hacklib.js).
export function repad_with_dashes(inoutbuf) {
    const s = String(inoutbuf ?? '');
    const ch = s.split('');
    let p = eos(s); // C `:2173` end index (pointer in C)
    while (p >= 2 && ch[p - 1] === ' ' && ch[p - 2] === ' ') { // C `:2175`
        ch[p - 1] = '-'; // C `:2176`
        p -= 2; // C `:2177`
    }
    return ch.join('');
}

// C botl.c:675 Is_Temp_Hilite — file-local macro, #undef later in the file.
function Is_Temp_Hilite(rule) {
    return !!(rule && rule.behavior === BL_TH_UPDOWN);
}

// C botl.c:2257–2274 hilite_reset_needed(). gm.multi non-zero (including a
// negative occupation) skips the check. Only a temporary up/down rule
// expires, and only once its stored time is in the past relative to
// augmented_time.
function hilite_reset_needed(bl_p, augmented_time) {
    // C :2265
    if (game.multi) return false;
    // C :2268
    if (!Is_Temp_Hilite(bl_p?.hilite_rule)) return false;
    // C :2271 — long compare; 0 or not-yet-due stays put.
    const t = bl_p.time ?? 0;
    if (t === 0 || t >= augmented_time) return false;
    return true; // C :2274
}

// C botl.c:2278–2316 status_eval_next_unhilite(). moveloop calls this once
// per hero action when iflags.hilite_delta is set (STATUS_HILITES is on).
// A missing blstats row is the BSS zero C has before init_blstats: no
// chg, time 0, no rule. Setting disp.botl writes both JS stores.
export function status_eval_next_unhilite() {
    if (!game.gb) game.gb = {};
    // C :2285 svm.moves. Long; do not truncate to 32 bits.
    game.gb.bl_hilite_moves = game.moves ?? 0;
    let next_unhilite = 0; // C :2289
    const row0 = game.gb.blstats?.[0];
    const row1 = game.gb.blstats?.[1];
    for (let i = 0; i < MAXBLSTATS; ++i) { // C :2290
        // C :2291 blstats[0][i]; time matches blstats[1][i].time
        const curr = row0?.[i] ?? null;
        const chg = !!curr?.chg;
        if (chg) { // C :2293
            const prev = row1?.[i] ?? null;
            if (Is_Temp_Hilite(curr.hilite_rule)) { // C :2296
                curr.time = game.gb.bl_hilite_moves + (game.iflags?.hilite_delta | 0);
            } else {
                curr.time = 0; // C :2299
            }
            if (prev) prev.time = curr.time; // C :2300
            curr.chg = false; // C :2302
            if (prev) prev.chg = false;
            if (!game.flags) game.flags = {};
            game.flags.botl = true; // C :2303
            if (game.disp) game.disp.botl = true;
        }
        if (game.flags?.botl) continue; // C :2305 disp.botl (flags is the live store)
        const this_unhilite = curr?.time ?? 0; // C :2308
        if (this_unhilite > 0
            && (next_unhilite === 0 || this_unhilite < next_unhilite)
            && hilite_reset_needed(curr, this_unhilite + 1)) { // C :2309–2311
            next_unhilite = this_unhilite; // C :2312
            if (next_unhilite < game.gb.bl_hilite_moves) { // C :2313
                if (!game.flags) game.flags = {};
                game.flags.botl = true; // C :2314
                if (game.disp) game.disp.botl = true;
            }
        }
    }
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
// exp_percent_changing (C :2117).
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
// — per-field delivery into the windowport's status buffer. tty_procs
// installs tty_status_update (wintty.c:158); the scored port has no proc
// table, so the tty function is the call (status_enablefield precedent).
function status_update(fld, val, chg, pc, color, hilites) {
    tty_status_update(fld, val, chg, pc, color, hilites);
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
    // the glyph half of the encoding. svc rndencode has no JS port yet so
    // that read stays undefined-safe; the gold showsyms slot landed with
    // assign_graphics (display.js) and reads the C :1579 slot.
    {
        const rndencode = game.svc?.context?.rndencode;
        const goldsym = game.gs?.showsyms?.[COIN_CLASS + SYM_OFF_O]; // C :1579
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
        reset = hilite_reset_needed(prev, game.gb?.bl_hilite_moves ?? 0); // C :1578
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

// C `windowprocs.wincap2` (winprocs.h) — the live caps word. Shape mirrors
// options.js windowprocs_wincap2 (:1343–1349): the installed tty value once
// display.js install_tty_wincap2 has run, else the const.js TTY_WINCAP2
// model (full unix tty set including the four status bits, const.js).
function windowprocs_wincap2() {
    const wp = game.windowprocs;
    if (wp && typeof wp === 'object' && Object.hasOwn(wp, 'wincap2')) {
        return wp.wincap2 | 0;
    }
    return TTY_WINCAP2;
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
    // C :1671/:1674 read windowprocs.wincap2 live (single-port tty model:
    // installed value or const.js TTY_WINCAP2 — full unix tty set with
    // the status bits, so both arms push into tty_status_update).
    const wincap2 = windowprocs_wincap2();
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

// C botl.c:1722-1756 — status_finish(): windowport status teardown, called
// from freedynamicdata (save.c:1173, save-freeing teardown with no JS
// counterpart — named omission, end.js:522/sys.js:91 precedent).
// C :1739-1754 STATUS_HILITES arm is live (config.h:616).
export function status_finish() {
    // C :1727-1729 call the window port cleanup routine first. The tty
    // port leaves the proc null; the optional hook mirrors the C null
    // check (cmd.js:329 win_exit_nhwindows precedent).
    const hook = game.windowprocs?.win_status_finish;
    if (typeof hook === 'function') hook();
    // C :1731 free the alloc'd memory now. C frees static storage; JS
    // drops the refs (GC). Rows build on demand (:1634), so guard the
    // sparse shelf — an unbuilt row is already empty.
    const gbstats = game.gb?.blstats;
    for (let i = 0; i < MAXBLSTATS; i++) { // C :1732
        const r0 = gbstats?.[0]?.[i];
        const r1 = gbstats?.[1]?.[i];
        if (r0?.val) r0.val = null; // C :1733-1735 free + NULL
        if (r1?.val) r1.val = null; // C :1736-1738
        // C :1740-1742 null the hilite_rule cache (the thresholds list is
        // about to go away).
        if (r0) r0.hilite_rule = 0;
        if (r1) r1.hilite_rule = 0; // C :1742
        // C :1743-1753 walk the row-0 threshold chain freeing each node,
        // then NULL both mirrors (they alias, :1653). JS drops the head.
        if (r0?.thresholds) { // C :1743
            r0.thresholds = null;
            if (r1) r1.thresholds = null; // C :1750-1752
        }
    }
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

/* C botl.c:852 `int cond_idx[CONDITION_COUNT]` (extern via botl.h:158) —
 * display-order index scratch, filled + qsort(cond_cmp)'d by the condopt
 * init arm. Read by render_status (wintty.c:5074) for condition words. */
export const cond_idx = new Array(CONDITION_COUNT).fill(0);

/**
 * C ref: botl.c condopt `:1303–1329` — status-condition option setter.
 * `addr` is C's `boolean *addr`: null means the init request (choice :=
 * enabled for every row, sort-order reset, cond_idx sorted); otherwise the
 * caller passes `&condtests[idx].choice` and C sanity-checks the pointer —
 * JS carries the entry object instead and checks identity against
 * condtests[idx]. C callers: options.c pfxfn_cond_ do_init `:5002` (init),
 * parse_cond_option `:1366`.
 */
export function condopt(idx, addr, negated) {
    // C `:1308–1310` sanity check.
    if ((idx < 0 || idx >= CONDITION_COUNT)
        || (addr && addr !== condtests[idx]))
        return;

    if (!addr) { // C `:1312`
        // Special: init request — choices match defaults.
        if (!game.gc) game.gc = {}; // C decl.h:223 instance_globals_c (cond_menu precedent)
        game.gc.condmenu_sortorder = 0; // C `:1315`
        for (let i = 0; i < CONDITION_COUNT; ++i) { // C `:1316`
            cond_idx[i] = i; // C `:1317`
            condtests[i].choice = condtests[i].enabled; // C `:1318`
        }
        // C `:1320–1321` qsort(cond_cmp); useroptions are unique so no tie
        // survives the comparator — the contest stable sort (Constitution
        // §4) matches C on every input here (cond_menu precedent).
        cond_idx.sort(cond_cmp);
    } else { // C `:1322` (addr == &condtests[idx].choice)
        condtests[idx].enabled = negated ? false : true; // C `:1324`
        condtests[idx].choice = condtests[idx].enabled; // C `:1325`
        // Avoid lingering false positives if the test is no longer run.
        condtests[idx].test = false; // C `:1327`
    }
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
 * C ref: botl.c parse_cond_option `:1354–1371` — match a `cond_<name>`
 * option string against condtests[].useroption (leading-substring, minimum
 * 4 unless the name is shorter) and apply it via condopt. Returns 0 on a
 * match, 2 when the string lacks a `cond_`+name shape, 1 when no name
 * matches (C never returns 3; the pfxfn_cond_ `:5012` arm stays defensive).
 * Sole C caller: options.c pfxfn_cond_ do_set `:5006`.
 */
export function parse_cond_option(negated, opts) {
    const prefix = 'cond_'; // C `:1357`
    if (!opts || opts.length <= prefix.length) // C `:1359–1360`
        return 2;
    const uniqpart = opts.slice(prefix.length); // C `:1361`
    for (let i = 0; i < CONDITION_COUNT; ++i) { // C `:1362`
        const compareto = condtests[i].useroption; // C `:1363`
        const sl = compareto.length; // C `:1364` Strlen
        if (match_optname(uniqpart, compareto, (sl >= 4) ? 4 : sl, false)) { // C `:1365`
            condopt(i, condtests[i], negated); // C `:1366` &condtests[i].choice
            return 0; // C `:1367`
        }
    }
    return 1; // C `:1370` !0 indicates error
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
 * `status_hilite_menu_add` (`:3890–4302`) is wired below (both `:4370`
 * and `:4445–4447` sites).
 * Diagnostics use cfgfiles.js config_error_add; existing abbreviated
 * threshold diagnostics and omitted format arguments are map-named.
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
                if (strncmpi(name, initblstats[i].name, len) === 0) {
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
 * (C `:360-361`); anything else is CLR_MAX with a sinked message.
 * Exported for coloratt.c add_menu_coloring (options.js; C `:636`). */
export function match_str2clr(str, suppress_msg) {
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
 * complain message sinks.
 * Exported for coloratt.c add_menu_coloring (options.js; C `:642`). */
export function match_str2attr(str, complain) {
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
 * over-capacity arm (C `:2716-2717`); null input is C 0 (C `:2695-2696`),
 * which reads as [] here (sf < 1 fails the two ring callers; parse_condition
 * loops zero times and the mask still lands, C `:3292` + `:3343`). C counts
 * separators cut (sf at `:2716`), not stored segments, so the overflow
 * test runs on the pre-pop cut count: cap-1 cuts fails even with a
 * trailing separator, while cap-2 cuts plus trailing content succeeds. */
function splitsubfields(str, maxsf) {
    const MAX_SUBFIELDS = 16; // C :2690 #define
    if (str === null || str === undefined) return []; // C :2695-2696
    const cap = (maxsf === 0) ? MAX_SUBFIELDS : Math.min(maxsf, MAX_SUBFIELDS); // C :2700
    const text = String(str);
    if (!text.includes('+') && !text.includes('&')) return [text]; // C :2720-2723
    const parts = text.split(/[+&]/); // C :2705-2715 separator cut
    const cuts = parts.length - 1; // separators cut == C sf at `:2716`
    if (parts.length && parts[parts.length - 1] === '') parts.pop(); // C :2718-2719 no trailing empty
    if (cuts >= cap - 1) return null; // C :2716-2717
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
                if (strncmpi(s, condition_aliases[i].id, len) === 0) {
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
        const subfields = splitsubfields(how, 0) ?? []; // -1 overflow: loop skips, mask still lands (C `:2716-2717` + `:3343`)
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

/* C hacklib.c highc — live export from './hacklib.js' (clone removed D-3360). */

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
        if (strncmpi(name, altname, name.length) === 0)
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
                   && strncmpi(res, 'two', 3) !== 0) ? '2H-' : '';
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

/**
 * config.h:627 — `#define SCORE_ON_BOTL` is commented out, and the
 * linux.500 hints line `-DSCORE_ON_BOTL` is commented out too. The
 * contest binary does not call `botl_score`. The three C sites keep
 * that off arm; the function below is the on-arm body.
 */
export const SCORE_ON_BOTL = false;

/**
 * C ref: botl.c botl_score `:419–436` (`#ifdef SCORE_ON_BOTL`).
 * Known-container gold (`hidden_gold(FALSE)`) plus carried coin, less
 * starting gold with no penalty once it is gone, plus the depth bonus,
 * saturated onto `u.urexp` by `nowrap_add` (`integer.h:129`).
 * `gi.invent` is `game.invent`. `nowrap_add` is the end.js export of
 * that macro (not a second clone).
 * @returns {number}
 */
export function botl_score() {
    const u = game.u || {};
    // C :421 — (long) deepest_lev_reached(FALSE).
    const deepest = Math.trunc(Number(deepest_lev_reached(false)) || 0);
    // C :425 — money_cnt(gi.invent) + hidden_gold(FALSE).
    let umoney = money_cnt(game.invent) + hidden_gold(false);
    // C :427–428 — subtract starting gold; clamp a deficit to 0.
    umoney -= Math.trunc(Number(u.umoney0) || 0);
    if (umoney < 0) umoney = 0;
    // C :429–432 — 50 per depth below the first, then the deep bonus.
    const depthbonus = (50 * (deepest - 1))
        + (deepest > 30 ? 10000
            : deepest > 20 ? (1000 * (deepest - 20))
                : 0);
    // C :435 — nowrap_add(u.urexp, umoney + depthbonus).
    const urexp = Math.trunc(Number(u.urexp) || 0);
    return nowrap_add(urexp, umoney + depthbonus);
}

// C botl.c:962-1279 bot_via_windowport() (staticfn) — fill gb.blstats[idx]
// for the windowport status update, then evaluate_and_notify_windowport().
// C min(x,9999) caps hp/maxhp/pw/maxpw/gold match the tty formatter so the
// two display modes never disagree (:977-982). Property predicates expand
// the youprop.h macros against game.u (display.js _statusLine2 precedent
// for the shared arms); C macros with no JS export are read inline, never
// re-cloned as functions.
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

    // C :1029–1034. #ifdef SCORE_ON_BOTL (config.h:627 off) is `0L`.
    // The on-arm is flags.showscore ? botl_score() : 0L.
    if (SCORE_ON_BOTL && flags.showscore)
        bs[BL_SCORE].a.a_long = botl_score();
    else
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

// C botl.c:1284-1299 — stat_update_time() (staticfn): time-only windowport
// push, called from timebot()'s VIA_WINDOWPORT arm (botl.c:286-287).
export function stat_update_time() {
    const idx = now_or_before_idx; // C :1287 (no 0/1 toggle)
    const fld = BL_TIME; // C :1288

    // C :1290-1291 Time (moves): svm.moves is game.moves (:2506 precedent).
    game.gb.blstats[idx][fld].a.a_long = game.moves ?? 0;
    // C :1292 gv.valset[fld] = FALSE. gv.valset (decl.h:994) has no JS
    // mirror — bot_via_windowport keeps a local fill array — so pass a
    // false-filled shelf: eval_notify_windowport_field reads only [fld]
    // (:979), making this observationally identical here.
    const valset = new Array(MAXBLSTATS).fill(false);
    valset[fld] = false; // C :1292

    eval_notify_windowport_field(fld, valset, idx); // C :1294
    // C :1295-1298 WC2_FLUSH_STATUS push. Caps read the live single-port
    // tty model (same windowprocs_wincap2 helper as
    // evaluate_and_notify_windowport); the status bits are set, so the
    // arm pushes BL_FLUSH into tty_status_update.
    const wincap2 = windowprocs_wincap2();
    if ((wincap2 & WC2_FLUSH_STATUS) !== 0) { // C :1295
        status_update(BL_FLUSH, 0, 0, 0, NO_COLOR, null); // C :1296-1297
    }
    // C :1298 return (void).
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

// C botl.c:3351–3366 clear_status_hilites() — drop every threshold chain
// in both blstats buffers and zero the (now stale) hilite_rule caches
// (`:3363–3365`). C frees each node (`:3359–3362`); GC drops the chain
// here (status_hilite_linestr_done precedent). Unbuilt blstats is a no-op
// (C static zero-init frees nothing). Sole C caller: the hilite_status
// do_set negated arm (options.c:1867), a named omission (JS optfn null).
export function clear_status_hilites() {
    for (let i = 0; i < MAXBLSTATS; ++i) { // C `:3356`
        for (let b = 0; b <= 1; ++b) {
            const slot = game.gb?.blstats?.[b]?.[i];
            if (!slot) continue;
            slot.thresholds = null; // C `:3363` (+ free chain `:3359–3362`)
            slot.hilite_rule = null; // C `:3365` stale pointer
        }
    }
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

// C botl.c:3477–3485 count_status_hilites() — gather the linestr list,
// count every line (BL_FLUSH counts all, `:3465`), free the list
// (`:3481–3483`). C callers: the hilite_status get_val (options.c:1887)
// and the status-highlight-rules get_val (options.c:8461), both wired in
// js/options.js doset rows.
export function count_status_hilites() {
    status_hilite_linestr_gather(); // C `:3481`
    const count = status_hilite_linestr_countfield(BL_FLUSH); // C `:3482`
    status_hilite_linestr_done(); // C `:3483`
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
// a fresh string. impossible() arms (bad rel per behavior) are live via
// `void impossible(...)` (status_initialize `:357` precedent: sync caller,
// not awaited; corrupt-rule-only arms, no ported path reaches them).
// initblstats[].name is the JS field for C initblstats[].fldname
// (`:112–143` mirror `:703–737`).
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
        else void impossible('hl->behavior=percentage, rel error'); // C `:3617` (not awaited: sync caller, status_initialize :357 precedent)
        break;
    case BL_TH_UPDOWN: // C `:3619`
        if (hl.rel === LT_VALUE) behavebuf = 'down'; // C `:3620–3621`
        else if (hl.rel === GT_VALUE) behavebuf = 'up'; // C `:3622–3623`
        else if (hl.rel === EQ_VALUE) behavebuf = 'changed'; // C `:3624–3625`
        else void impossible('hl->behavior=updown, rel error'); // C `:3627` (not awaited: sync caller, status_initialize :357 precedent)
        break;
    case BL_TH_VAL_ABSOLUTE: // C `:3630`
        if (op) behavebuf = `${op}${hl.value?.a_int | 0}`; // C `:3631–3632`
        else void impossible('hl->behavior=absolute, rel error'); // C `:3633` (not awaited: sync caller, status_initialize :357 precedent)
        break;
    case BL_TH_TEXTMATCH: // C `:3635`
        if (hl.rel === TXT_VALUE && hl.textmatch?.[0]) behavebuf = `${hl.textmatch}`; // C `:3636–3637`
        else void impossible('hl->behavior=textmatch, rel or textmatch error'); // C `:3639` (not awaited: sync caller, status_initialize :357 precedent)
        break;
    case BL_TH_CONDITION: // C `:3641`
        if (hl.rel === EQ_VALUE) behavebuf = `${conditionbitmask2str(hl.value?.a_ulong ?? 0)}`; // C `:3642–3643`
        else void impossible('hl->behavior=condition, rel error'); // C `:3645` (not awaited: sync caller, status_initialize :357 precedent)
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
 * C callers are both inside status_hilite_menu_add (`:4057–4058`,
 * `:4088–4089`, wired below). This export is the call those sites make.
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
 * C ref: botl.c query_arrayvalue `:2747–2781` — PICK_ONE menu over
 * arr[arrmin..arrmax) with a_int = i + adj (`:2756`: 1 when arrmin > 0,
 * else arrmax); NULL slots are skipped (`:2763–2764`, the hutxt gap
 * between Satiated and Hungry). Cancel keeps arrmin - 1 (`:2752`).
 * create/start/end/select/destroy fold into one select_menu_pick_one
 * (choose_updownboth precedent); nul_glyphinfo / NO_COLOR /
 * MENU_ITEMFLAGS_NONE do not change the tty text row; cg.zeroany is
 * the fresh a_int on each row.
 *
 * C callers are all inside status_hilite_menu_add (`:4135–4137`
 * enc_stat, `:4148–4149` aligntxt, `:4161` hutxt, `:4199` rolelist,
 * wired below). This export is the call those sites make.
 *
 * @param {string} querystr end_menu prompt (`:2771`)
 * @param {Array<string|null>} arr value strings (null = C NULL gap slot)
 * @param {number} arrmin first index, inclusive
 * @param {number} arrmax end index, exclusive
 * @returns {Promise<number>} picked index, or arrmin - 1 on cancel
 */
export async function query_arrayvalue(querystr, arr, arrmin, arrmax) {
    let ret = (arrmin | 0) - 1; // C `:2752`
    const adj = (arrmin | 0) > 0 ? 1 : (arrmax | 0); // C `:2756`
    const rows = [];
    for (let i = (arrmin | 0); i < (arrmax | 0); i++) { // C `:2762`
        if (arr[i] == null) continue; // C `:2763–2764` NULL gap; "" is shown
        rows.push({ // C `:2765–2768`
            text: arr[i], selectable: true, attr: ATR_NONE, a_int: i + adj,
        });
    }
    // options.js statically imports this module (cond_menu precedent).
    const { select_menu_pick_one } = await import('./options.js');
    const res = await select_menu_pick_one(hiliteMenuRows(querystr, rows)); // C `:2771–2774`
    if (res.kind === 'pick' && res.item) { // C `:2775` res > 0
        ret = (res.item.a_int | 0) - adj; // C `:2776`
        // C `:2777` free(picks) — GC.
    }
    return ret; // C `:2780`
}

/**
 * C ref: botl.c query_conditions `:3109–3138` — PICK_ANY menu over
 * conditions[] with a_ulong = mask (`:3123`) and text[0] (`:3125`);
 * the return ORs every picked mask (`:3133–3134`), 0UL on cancel
 * (`:3112`). create/start/end/select/destroy fold into one
 * select_menu_pick_any (status_hilite_menu_fld precedent);
 * nul_glyphinfo / NO_COLOR / MENU_ITEMFLAGS_NONE do not change the
 * tty text row; cg.zeroany is the fresh a_ulong on each row.
 *
 * Sole C caller: status_hilite_menu_add `:4113` (wired below).
 * This export is the call that site makes.
 *
 * @returns {Promise<number>} OR of picked masks (C unsigned long), 0 on cancel
 */
export async function query_conditions() {
    let ret = 0; // C `:3112` 0UL
    const rows = [];
    for (let i = 0; i < conditions.length; i++) { // C `:3121` SIZE(conditions)
        rows.push({ // C `:3122–3125`
            text: conditions[i].text[0], selectable: true, attr: ATR_NONE,
            a_ulong: conditions[i].mask,
        });
    }
    const { select_menu_pick_any } = await import('./options.js');
    const picks = await select_menu_pick_any(hiliteMenuRows('Choose status conditions', rows)); // C `:3128–3131`
    const res = Array.isArray(picks) ? picks.length : 0; // cancel and finish-empty are both <= 0
    if (res > 0) { // C `:3132`
        for (let i = 0; i < res; i++) // C `:3133–3134`
            ret |= picks[i].a_ulong;
        // C `:3135` free(picks) — GC.
    }
    return ret >>> 0; // C `:3137` unsigned long
}

/**
 * C ref: botl.c status_hilite_menu_choose_field `:3672–3704` — PICK_ONE
 * menu over initblstats[].fldname with a_int = i + 1 (`:3690`); the
 * return is the picked blstats index (`:3700`), BL_FLUSH on cancel
 * (`:3675`). SCORE_ON_BOTL is off (config.h:627), so the BL_SCORE arm
 * (`:3684–3688`) is live: score is skipped while it has no thresholds.
 * create/start/end/select/destroy fold into one select_menu_pick_one
 * (choose_updownboth precedent); nul_glyphinfo / NO_COLOR /
 * MENU_ITEMFLAGS_NONE do not change the tty text row; cg.zeroany is
 * the fresh a_int on each row.
 *
 * Sole C caller: status_hilite_menu_add `:3905` (wired below).
 * This export is the call that site makes.
 *
 * @returns {Promise<number>} picked field index, or BL_FLUSH on cancel
 */
export async function status_hilite_menu_choose_field() {
    let fld = BL_FLUSH; // C `:3675`
    const rows = [];
    for (let i = 0; i < MAXBLSTATS; i++) { // C `:3683`
        // C `:3684–3688` #ifndef SCORE_ON_BOTL (off — config.h:627).
        if (initblstats[i].fld === BL_SCORE
            && !game.gb?.blstats?.[0]?.[BL_SCORE]?.thresholds)
            continue;
        rows.push({ // C `:3689–3692` fldname is JS `name`
            text: blstatFldName(i), selectable: true, attr: ATR_NONE, a_int: i + 1,
        });
    }
    const { select_menu_pick_one } = await import('./options.js');
    const res = await select_menu_pick_one(hiliteMenuRows('Select a hilite field:', rows)); // C `:3695–3698`
    if (res.kind === 'pick' && res.item) { // C `:3699` res > 0
        fld = (res.item.a_int | 0) - 1; // C `:3700`
        // C `:3701` free(picks) — GC.
    }
    return fld; // C `:3703`
}

/**
 * C ref: botl.c status_hilite_menu_choose_behavior `:3707–3808` — PICK_ONE
 * menu of the hilite behaviors one field supports, with C's accelerators
 * ('a' always-hilite, 'b' condition bitmask, 'c' value-changes, 'n'
 * number threshold, 'p' percentage threshold, 'C' critical HP, 't' text
 * match; a_int is the BL_TH_* behavior). A single-option field
 * (BL_CONDITION) auto-picks without a menu (`:3799–3801`); cancel keeps
 * the BL_TH_NONE - 1 init, an empty finish is BL_TH_NONE (`:3795–3798`).
 * create/start/end/select/destroy fold into one select_menu_pick_one
 * (choose_updownboth precedent); nul_glyphinfo / NO_COLOR /
 * MENU_ITEMFLAGS_NONE do not change the tty text row; cg.zeroany is
 * the fresh a_int on each row.
 *
 * select_menu_pick_one reports only pick/cancel: C's res == 0
 * (Enter/space with nothing preselected) and res == -1 (ESC) both land
 * as cancel. The fold is exact: the sole caller maps both to return
 * FALSE (origfld is a real field at both `:4370`/`:4446` sites, so the
 * BL_TH_NONE goto-choose_field arm is unreachable and no pline fires on
 * either path).
 *
 * Sole C caller: status_hilite_menu_add `:3923` (wired below).
 * @param {number} fld statusfields index
 * @returns {Promise<number>} behavior, BL_TH_NONE, or BL_TH_NONE - 1 on cancel
 */
export async function status_hilite_menu_choose_behavior(fld) {
    let beh = BL_TH_NONE - 1; // C `:3710` (res folds into the pick below)
    const f = fld | 0;
    let onlybeh = BL_TH_NONE, nopts = 0; // C `:3715`
    // C `:3716` clr = NO_COLOR — tty text row unaffected (precedent).

    if (f < 0 || f >= MAXBLSTATS) // C `:3718–3719`
        return BL_TH_NONE;

    const at = initblstats[f]?.anytype; // C `:3721`
    const fname = blstatFldName(f);
    const rows = [];
    if (f !== BL_CONDITION) { // C `:3726`
        onlybeh = BL_TH_ALWAYS_HILITE; // C `:3728` any.a_int
        rows.push({ // C `:3729–3731`
            text: `Always highlight ${fname}`, selectable: true,
            selector: 'a', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3732`
    }
    if (f === BL_CONDITION) { // C `:3735`
        onlybeh = BL_TH_CONDITION; // C `:3737`
        rows.push({ // C `:3738–3739`
            text: 'Bitmask of conditions', selectable: true,
            selector: 'b', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3740`
    }
    if (f !== BL_CONDITION && f !== BL_VERS) { // C `:3743`
        onlybeh = BL_TH_UPDOWN; // C `:3745`
        rows.push({ // C `:3746–3748`
            text: `${fname} value changes`, selectable: true,
            selector: 'c', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3749`
    }
    if (f !== BL_CAP && f !== BL_HUNGER // C `:3752–3753`
        && (at === ANY_INT || at === ANY_LONG)) {
        onlybeh = BL_TH_VAL_ABSOLUTE; // C `:3755`
        rows.push({ // C `:3756–3757`
            text: 'Number threshold', selectable: true,
            selector: 'n', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3758`
    }
    if ((initblstats[f]?.idxmax ?? -1) >= 0) { // C `:3761`
        onlybeh = BL_TH_VAL_PERCENTAGE; // C `:3763`
        rows.push({ // C `:3764–3765`
            text: 'Percentage threshold', selectable: true,
            selector: 'p', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3766`
    }
    if (f === BL_HP) { // C `:3769`
        onlybeh = BL_TH_CRITICALHP; // C `:3771`
        rows.push({ // C `:3772–3775`
            text: `Highlight critically low ${fname}`, selectable: true,
            selector: 'C', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3776`
    }
    if (initblstats[f]?.anytype === ANY_STR // C `:3779–3780`
        || f === BL_CAP || f === BL_HUNGER) {
        onlybeh = BL_TH_TEXTMATCH; // C `:3782`
        rows.push({ // C `:3783–3785`
            text: `${fname} text match`, selectable: true,
            selector: 't', attr: ATR_NONE, a_int: onlybeh,
        });
        nopts++; // C `:3786`
    }

    const prompt = `Select ${fname} field hilite behavior:`; // C `:3789–3790`
    if (nopts > 1) { // C `:3793`
        // options.js statically imports this module (cond_menu precedent).
        const { select_menu_pick_one } = await import('./options.js');
        const pick = await select_menu_pick_one(hiliteMenuRows(prompt, rows)); // C `:3794`
        if (pick.kind === 'pick' && pick.item) { // C `:3803` res > 0
            beh = pick.item.a_int | 0; // C `:3804`
            // C `:3805` free(picks) — GC.
        } else { // C `:3795–3798` res <= 0: none chosen or cancelled
            beh = BL_TH_NONE - 1; // cancel arm; the res == 0 twin folds here (doc comment)
        }
        // C `:3802` destroy_nhwindow — select_menu_pick_one dismisses.
    } else if (onlybeh !== BL_TH_NONE) { // C `:3799`
        beh = onlybeh; // C `:3800`
    }
    return beh; // C `:3807`
}

/* C botl.c:2215–2216 file statics for the `:4040` / `:4046` range plines. */
const threshold_value = 'hilite_status threshold ';
const is_out_of_range = ' is out of range';

/**
 * C ref: botl.c status_hilite_menu_add `:3890–4302` — the "add a hilite
 * rule" flow behind status_hilite_menu_fld: choose field (when called
 * with BL_FLUSH), choose behavior, choose value (threshold getlin plus
 * the up/down menu, the up/down menu alone, the conditions menu, the
 * text-match menu/getlin, or nothing — by behavior), choose color,
 * choose attribute, then store the rule (condition bits into
 * gc.cond_hilites, every other behavior via
 * status_hilite_add_threshold) with an "Added hilite ..." pline.
 * TRUE when a rule was added.
 *
 * The four C labels (choose_field, choose_behavior, choose_value,
 * choose_color) are a state loop; every goto is a label assignment in
 * C order. The threshold parse emulates C's in-place buffer (leading
 * spaces stay in the base, trailing stripped, operator/plus blanked,
 * '%' truncates — hacklib.c trimspaces) because the updownboth menu
 * and the color/attribute prompts read the edited buffer, not the
 * trimmed value. getlin's "" / ESC returns are C's NUL / ESC first
 * byte (getline.js contract). C's res == 0 / -1 menu pair folds into
 * the shared pick/cancel helpers exactly like the sibling choosers.
 *
 * C callers: status_hilite_menu_fld `:4370` and `:4445–4447` (both wired
 * below). `:668` is the prototype.
 * @param {number} origfld field to add for, or BL_FLUSH to choose one
 * @returns {Promise<boolean>} TRUE when a rule was added
 */
export async function status_hilite_menu_add(origfld) {
    let fld; // C `:3892`
    let behavior; // C `:3893`
    let lt_gt_eq; // C `:3894`
    let clr = NO_COLOR, atr = HL_UNDEF; // C `:3895`
    let hilite; // C `:3896` struct hilite_s
    let cond = 0; // C `:3897` unsigned long
    let colorqry = ''; // C `:3898` colorqry[BUFSZ]
    let attrqry = ''; // C `:3899` attrqry[BUFSZ]
    let retry = 0; // C `:3900`
    const ofld = origfld | 0;

    let label = 'choose_field';
    for (;;) {
    if (label === 'choose_field') { // C `:3902`
        fld = ofld; // C `:3903`
        if (fld === BL_FLUSH) { // C `:3904`
            fld = await status_hilite_menu_choose_field(); // C `:3905`
            /* C `:3906` isn't this redundant given what follows? */
            if (fld === BL_FLUSH) // C `:3907–3908`
                return false;
        }
        if (fld === BL_FLUSH) // C `:3911–3912`
            return false;

        colorqry = ''; // C `:3914`
        attrqry = ''; // C `:3915`

        hilite = { // C `:3917` memset zero (parse_status_hl2 shape)
            fld: 0, set: false, anytype: 0, value: zeroAnything(),
            behavior: 0, textmatch: '', rel: 0, coloridx: 0, next: null,
        };
        hilite.next = null; // C `:3918`
        hilite.set = false; // C `:3919` mark it "unset"
        hilite.fld = fld; // C `:3920`

        label = 'choose_behavior'; // C `:3922` fallthrough
        continue;
    }
    if (label === 'choose_behavior') { // C `:3922`
        behavior = await status_hilite_menu_choose_behavior(fld); // C `:3923`

        if (behavior === (BL_TH_NONE - 1)) { // C `:3925`
            return false; // C `:3926`
        } else if (behavior === BL_TH_NONE) { // C `:3927`
            if (ofld === BL_FLUSH) { label = 'choose_field'; continue; } // C `:3928–3929`
            return false; // C `:3930`
        }

        hilite.behavior = behavior; // C `:3933`

        label = 'choose_value'; // C `:3935` fallthrough
        continue;
    }
    if (label === 'choose_value') { // C `:3935`
        if (retry++ > 5) { // C `:3936`
            await pline("That's enough tries."); // C `:3937`
            return false; // C `:3938`
        }
        if (behavior === BL_TH_VAL_PERCENTAGE // C `:3940–3941`
            || behavior === BL_TH_VAL_ABSOLUTE) {
            // C `:3942–3947` inbuf/buf/aval/val/dt/gotnum/percent/inp/numstart/op.
            const percent = (behavior === BL_TH_VAL_PERCENTAGE);
            let val = 0, dt = ANY_INVALID;
            let gotnum = false;

            lt_gt_eq = NO_LTEQGT; // C `:3949` not set up yet
            const buf = `Enter ${percent ? 'percentage ' : ''}value for ${blstatFldName(fld)} threshold:`; // C `:3951–3953`
            /* C `:3950` inbuf[0] = '\0' preload folds into getlin
               (EDIT_GETLIN off — getline.js ignores bufp). */
            const inbuf = await getlin(buf); // C `:3954` getlin(buf, inbuf)
            if (inbuf === '' || inbuf[0] === '\x1b') { // C `:3955–3956` NUL / ESC
                label = 'choose_behavior'; continue;
            }

            // C `:3958` inp = numstart = trimspaces(inbuf): mutable buffer.
            const chars = [...inbuf];
            let end = chars.length; // trailing strip in place
            while (end > 0 && (chars[end - 1] === ' ' || chars[end - 1] === '\t')) end--;
            chars.length = end;
            let numstart = 0; // leading kept in base, skipped by pointer
            while (numstart < chars.length && (chars[numstart] === ' ' || chars[numstart] === '\t')) numstart++;
            let pos = numstart;
            if (pos >= chars.length) { // C `:3959–3960` !*inp
                label = 'choose_behavior'; continue;
            }

            /* C `:3962–3963` allow "<50%" / ">50" / "50" / "<=50%" ... */
            if (chars[pos] === '>' || chars[pos] === '<' || chars[pos] === '=') { // C `:3964`
                lt_gt_eq = (chars[pos] === '>') // C `:3965–3967`
                    ? ((chars[pos + 1] === '=') ? GE_VALUE : GT_VALUE)
                    : (chars[pos] === '<')
                        ? ((chars[pos + 1] === '=') ? LE_VALUE : LT_VALUE)
                        : EQ_VALUE;
                chars[pos++] = ' '; // C `:3968`
                numstart++; // C `:3969`
                if (lt_gt_eq === GE_VALUE || lt_gt_eq === LE_VALUE) { // C `:3970`
                    chars[pos++] = ' '; // C `:3971`
                    numstart++; // C `:3972`
                }
            }
            if (chars[pos] === '-') { // C `:3975`
                pos++; // C `:3976`
            } else if (chars[pos] === '+') { // C `:3977`
                chars[pos++] = ' '; // C `:3978`
                numstart++; // C `:3979`
            }
            while (pos < chars.length && digit(chars[pos])) { // C `:3981–3984`
                pos++;
                gotnum = true;
            }
            if (chars[pos] === '%') { // C `:3985`
                if (!percent) { // C `:3986`
                    await pline('Not expecting a percentage.'); // C `:3987`
                    label = 'choose_behavior'; continue; // C `:3988`
                }
                chars.length = pos; // C `:3990` *inp = '\0' [accepts trailing junk!]
            } else if (pos < chars.length) { // C `:3991–3992` some random characters
                await pline('"%s" is not a recognized number.', chars.slice(pos).join('')); // C `:3993`
                label = 'choose_value'; continue; // C `:3994`
            }
            if (!gotnum) { // C `:3996`
                await pline('Is that an invisible number?'); // C `:3997`
                label = 'choose_value'; continue; // C `:3998`
            }
            const op = (lt_gt_eq === LT_VALUE) ? '<' // C `:4000–4005`
                : (lt_gt_eq === LE_VALUE) ? '<='
                : (lt_gt_eq === GT_VALUE) ? '>'
                : (lt_gt_eq === GE_VALUE) ? '>='
                : (lt_gt_eq === EQ_VALUE) ? '='
                : ''; /* didn't specify lt_gt_eq with number */

            const aval = zeroAnything(); // C `:4007` aval = cg.zeroany
            dt = percent ? ANY_INT : initblstats[fld].anytype; // C `:4008`
            let numstr = chars.slice(numstart).join('');
            s_to_anything(aval, numstr, dt); // C `:4009`

            if (percent) { // C `:4011`
                val = aval.a_int; // C `:4012`
                if (initblstats[fld].idxmax === -1) { // C `:4013`
                    await pline("Field '%s' does not support percentage values.", // C `:4014–4015`
                        blstatFldName(fld));
                    behavior = BL_TH_VAL_ABSOLUTE; // C `:4016`
                    label = 'choose_value'; continue; // C `:4017`
                }
                /* C `:4019–4023` deliberate >-1 / <101 use stays palatable. */
                if ((val < 0 && (val !== -1 || lt_gt_eq !== GT_VALUE)) // C `:4024–4027`
                    || (val === 0 && lt_gt_eq === LT_VALUE)
                    || (val === 100 && lt_gt_eq === GT_VALUE)
                    || (val > 100 && (val !== 101 || lt_gt_eq !== LT_VALUE))) {
                    await pline("'%s%d%%' is not a valid percent value.", op, val); // C `:4028`
                    label = 'choose_value'; continue; // C `:4029`
                }
                /* C `:4031` restore suffix for the color/attribute prompts. */
                if (!numstr.includes('%')) // C `:4032–4033`
                    numstr += '%';

            /* C `:4035` reject negatives except AC and >-1; reject 0 for <. */
            } else if (dt === ANY_INT // C `:4036–4039`
                       && (aval.a_int < ((fld === BL_AC) ? -128
                                         : (lt_gt_eq === GT_VALUE) ? -1
                                           : (lt_gt_eq === LT_VALUE) ? 1 : 0))) {
                await pline("%s'%s%d'%s", threshold_value, // C `:4040–4041`
                    op, aval.a_int, is_out_of_range);
                label = 'choose_value'; continue; // C `:4042`
            } else if (dt === ANY_LONG // C `:4043–4045`
                       && (aval.a_long < ((lt_gt_eq === GT_VALUE) ? -1
                                          : (lt_gt_eq === LT_VALUE) ? 1 : 0))) {
                await pline("%s'%s%ld'%s", threshold_value, // C `:4046–4047`
                    op, aval.a_long, is_out_of_range);
                label = 'choose_value'; continue; // C `:4048`
            }

            if (lt_gt_eq === NO_LTEQGT) { // C `:4051`
                const ltok = (dt === ANY_INT) // C `:4052–4054`
                    ? (aval.a_int > 0 || fld === BL_AC)
                    : (aval.a_long > 0);
                /* C `:4055` gtok reads aval.a_long over the INT-written
                   union (LP64 zero-extended over zeroany); the value is
                   validated non-negative here, so both arms agree. */
                const along = (dt === ANY_INT) ? (aval.a_int | 0) : (aval.a_long | 0);
                const gtok = (!percent || along < 100);
                /* C `:4057–4058` str is the edited inbuf base (leading
                   kept, '+' blanked, '%' truncated — not the trimmed
                   value). JS strings are immutable, so the buffer above
                   is that base. */
                lt_gt_eq = await status_hilite_menu_choose_updownboth(
                    fld, chars.join(''), ltok, gtok);
                if (lt_gt_eq === NO_LTEQGT) { // C `:4059–4060`
                    label = 'choose_value'; continue;
                }
            }

            colorqry = `Choose a color for when ${blstatFldName(fld)} is ${ // C `:4063–4071`
                (lt_gt_eq === LT_VALUE) ? 'less than '
                : (lt_gt_eq === GT_VALUE) ? 'more than ' : ''}${numstr}${
                (lt_gt_eq === LE_VALUE) ? ' or less'
                : (lt_gt_eq === GE_VALUE) ? ' or more' : ''}:`;
            attrqry = `Choose attribute for when ${blstatFldName(fld)} is ${ // C `:4072–4080`
                (lt_gt_eq === LT_VALUE) ? 'less than '
                : (lt_gt_eq === GT_VALUE) ? 'more than ' : ''}${numstr}${
                (lt_gt_eq === LE_VALUE) ? ' or less'
                : (lt_gt_eq === GE_VALUE) ? ' or more' : ''}:`;

            hilite.rel = lt_gt_eq; // C `:4082`
            hilite.value = aval; // C `:4083`
        } else if (behavior === BL_TH_UPDOWN) { // C `:4084`
            if (initblstats[fld].anytype !== ANY_STR) { // C `:4085`
                const ltok = (fld !== BL_TIME), gtok = true; // C `:4086`

                lt_gt_eq = await status_hilite_menu_choose_updownboth( // C `:4088–4089`
                    fld, null, ltok, gtok);
                if (lt_gt_eq === NO_LTEQGT) { // C `:4090–4091`
                    label = 'choose_behavior'; continue;
                }
            } else { /* C `:4092` ANY_STR */
                /* C `:4093–4098` ordered string comparison is pointless
                   for title/dungeon-level/alignment; skip the one-choice
                   menu and just use 'changed'. */
                lt_gt_eq = EQ_VALUE; // C `:4099`
            }
            /* C `:4101–4105` / `:4106–4110`: LE/GE print "increases"
               (unreachable: the str==NULL menu offers LT/EQ/GT only). */
            const dirword = (lt_gt_eq === EQ_VALUE) ? 'changes'
                : (lt_gt_eq === LT_VALUE) ? 'decreases' : 'increases';
            colorqry = `Choose a color for when ${blstatFldName(fld)} ${dirword}:`;
            attrqry = `Choose attribute for when ${blstatFldName(fld)} ${dirword}:`;
            hilite.rel = lt_gt_eq; // C `:4111`
        } else if (behavior === BL_TH_CONDITION) { // C `:4112`
            cond = await query_conditions(); // C `:4113`
            if (!cond) { // C `:4114`
                if (ofld === BL_FLUSH) { label = 'choose_field'; continue; } // C `:4115–4116`
                return false; // C `:4117`
            }
            colorqry = `Choose a color for conditions ${conditionbitmask2str(cond)}:`; // C `:4119–4121`
            attrqry = `Choose attribute for conditions ${conditionbitmask2str(cond)}:`; // C `:4122–4124`
        } else if (behavior === BL_TH_TEXTMATCH) { // C `:4125`
            const qry_buf = `${(fld === BL_CAP // C `:4128–4133`
                || fld === BL_ALIGN
                || fld === BL_HUNGER
                || fld === BL_TITLE) ? 'Choose' : 'Enter'} ${blstatFldName(fld)} text value to match:`;
            if (fld === BL_CAP) { // C `:4134`
                const rv = await query_arrayvalue(qry_buf, // C `:4135–4137`
                    enc_stat, SLT_ENCUMBER, OVERLOADED + 1);

                if (rv < SLT_ENCUMBER) { // C `:4139–4140`
                    label = 'choose_behavior'; continue;
                }

                hilite.rel = TXT_VALUE; // C `:4142`
                hilite.textmatch = enc_stat[rv]; // C `:4143`
            } else if (fld === BL_ALIGN) { // C `:4144`
                const aligntxt = [ // C `:4145–4147`
                    'chaotic', 'neutral', 'lawful',
                ];
                const rv = await query_arrayvalue(qry_buf, // C `:4148–4149`
                    aligntxt, 0, 2 + 1);

                if (rv < 0) { // C `:4151–4152`
                    label = 'choose_behavior'; continue;
                }

                hilite.rel = TXT_VALUE; // C `:4154`
                hilite.textmatch = aligntxt[rv]; // C `:4155`
            } else if (fld === BL_HUNGER) { // C `:4156`
                const hutxt = [ // C `:4157–4160`
                    'Satiated', null, 'Hungry', 'Weak',
                    'Fainting', 'Fainted', 'Starved',
                ];
                const rv = await query_arrayvalue(qry_buf, hutxt, SATIATED, STARVED + 1); // C `:4161`

                if (rv < SATIATED) { // C `:4163–4164`
                    label = 'choose_behavior'; continue;
                }

                hilite.rel = TXT_VALUE; // C `:4166`
                hilite.textmatch = hutxt[rv]; // C `:4167`
            } else if (fld === BL_TITLE) { // C `:4168`
                /* C `:4169–4171` rolelist[3 * 9 + 1]; mbuf/fbuf/obuf[MAXVALWIDTH]. */
                const rolelist = [];
                const titles = game.urole?.title ?? game.urole?.rank; // C `:4174` gu.urole.rank[9]
                const ranks = Array.isArray(titles) ? titles : [];
                const female = !!game.flags?.female; // C `:4183` flags.female
                for (let i = 0; i < 9; i++) { // C `:4173`
                    const mbuf = `"${ranks[i]?.m ?? ''}"`; // C `:4174`
                    /* C `:4180–4181` else arm: the per-iteration fresh
                       strings already start empty. */
                    let fbuf = '', obuf = '';
                    if (ranks[i]?.f) { // C `:4175`
                        fbuf = `"${ranks[i].f}"`; // C `:4176`
                        obuf = `${female ? fbuf : mbuf} or ${female ? mbuf : fbuf}`; // C `:4177–4179`
                    }
                    if (female) { // C `:4183`
                        if (fbuf) // C `:4184–4185`
                            rolelist.push(fbuf);
                        rolelist.push(mbuf); // C `:4186`
                        if (obuf) // C `:4187–4188`
                            rolelist.push(obuf);
                    } else { // C `:4189`
                        rolelist.push(mbuf); // C `:4190`
                        if (fbuf) // C `:4191–4192`
                            rolelist.push(fbuf);
                        if (obuf) // C `:4193–4194`
                            rolelist.push(obuf);
                    }
                }
                rolelist.push('"none of the above (polymorphed)"'); // C `:4197`

                const rv = await query_arrayvalue(qry_buf, rolelist, 0, rolelist.length); // C `:4199`
                if (rv >= 0) { // C `:4200`
                    hilite.rel = TXT_VALUE; // C `:4201`
                    hilite.textmatch = rolelist[rv]; // C `:4202`
                }
                // C `:4204–4205` free(rolelist[]) — GC.
                if (rv < 0) { // C `:4206–4207`
                    label = 'choose_behavior'; continue;
                }
            } else { // C `:4208`
                /* C `:4211` inbuf[0] = '\0' preload folds into getlin
                   (EDIT_GETLIN off — getline.js ignores bufp). */
                const tminbuf = await getlin(qry_buf); // C `:4212` getlin(qry_buf, inbuf)
                if (tminbuf === '' || tminbuf[0] === '\x1b') { // C `:4213–4214`
                    label = 'choose_behavior'; continue;
                }

                hilite.rel = TXT_VALUE; // C `:4216`
                if (tminbuf.length < MAXVALWIDTH) // C `:4217–4218`
                    hilite.textmatch = tminbuf;
                else // C `:4219–4220`
                    return false;
            }
            colorqry = `Choose a color for when ${blstatFldName(fld)} is '${hilite.textmatch}':`; // C `:4222–4223`
            attrqry = `Choose attribute for when ${blstatFldName(fld)} is '${hilite.textmatch}':`; // C `:4224–4225`
        } else if (behavior === BL_TH_ALWAYS_HILITE) { // C `:4226`
            colorqry = `Choose a color to always hilite ${blstatFldName(fld)}:`; // C `:4227–4228`
            attrqry = `Choose attribute to always hilite ${blstatFldName(fld)}:`; // C `:4229–4230`
        }
        /* C has no arm for BL_TH_CRITICALHP/BL_TH_NONE: fall through
           with empty queries exactly like C. */

        label = 'choose_color'; // C `:4224` fallthrough
        continue;
    }
    if (label === 'choose_color') { // C `:4233`
        // options.js statically imports this module (cond_menu precedent).
        const { query_color, query_attr } = await import('./options.js');
        clr = await query_color(colorqry, NO_COLOR); // C `:4234`
        if (clr === -1) { // C `:4235`
            if (behavior !== BL_TH_ALWAYS_HILITE) { // C `:4236–4237`
                label = 'choose_value'; continue;
            } else { // C `:4238–4239`
                label = 'choose_behavior'; continue;
            }
        }
        atr = await query_attr(attrqry, ATR_NONE); // C `:4241`
        if (atr === -1) { // C `:4242–4243`
            label = 'choose_color'; continue;
        }

        if (behavior === BL_TH_CONDITION) { // C `:4245`
            const ch = ensureCondHilites(); // C `:4250–4270` gc.cond_hilites
            if (atr & HL_BOLD) ch[HL_ATTCLR_BOLD] = ((ch[HL_ATTCLR_BOLD] ?? 0) | cond) >>> 0; // C `:4250–4251`
            if (atr & HL_DIM) ch[HL_ATTCLR_DIM] = ((ch[HL_ATTCLR_DIM] ?? 0) | cond) >>> 0; // C `:4252–4253`
            if (atr & HL_ITALIC) ch[HL_ATTCLR_ITALIC] = ((ch[HL_ATTCLR_ITALIC] ?? 0) | cond) >>> 0; // C `:4254–4255`
            if (atr & HL_ULINE) ch[HL_ATTCLR_ULINE] = ((ch[HL_ATTCLR_ULINE] ?? 0) | cond) >>> 0; // C `:4256–4257`
            if (atr & HL_BLINK) ch[HL_ATTCLR_BLINK] = ((ch[HL_ATTCLR_BLINK] ?? 0) | cond) >>> 0; // C `:4258–4259`
            if (atr & HL_INVERSE) ch[HL_ATTCLR_INVERSE] = ((ch[HL_ATTCLR_INVERSE] ?? 0) | cond) >>> 0; // C `:4260–4261`
            if (atr === HL_NONE) { // C `:4262`
                ch[HL_ATTCLR_BOLD] = ((ch[HL_ATTCLR_BOLD] ?? 0) & ~cond) >>> 0; // C `:4263`
                ch[HL_ATTCLR_DIM] = ((ch[HL_ATTCLR_DIM] ?? 0) & ~cond) >>> 0; // C `:4264`
                ch[HL_ATTCLR_ITALIC] = ((ch[HL_ATTCLR_ITALIC] ?? 0) & ~cond) >>> 0; // C `:4265`
                ch[HL_ATTCLR_ULINE] = ((ch[HL_ATTCLR_ULINE] ?? 0) & ~cond) >>> 0; // C `:4266`
                ch[HL_ATTCLR_BLINK] = ((ch[HL_ATTCLR_BLINK] ?? 0) & ~cond) >>> 0; // C `:4267`
                ch[HL_ATTCLR_INVERSE] = ((ch[HL_ATTCLR_INVERSE] ?? 0) & ~cond) >>> 0; // C `:4268`
            }
            ch[clr] = ((ch[clr] ?? 0) | cond) >>> 0; // C `:4270`
            let clrbuf = strNsubst(clr2colorname(clr), ' ', '-', 0); // C `:4271`
            const tmpattr = hlattr2attrname(atr); // C `:4272` (buf/len fold into the return)
            if (tmpattr != null) // C `:4273–4274`
                clrbuf += `&${tmpattr}`;
            await pline('Added hilite condition/%s/%s', // C `:4275–4276`
                conditionbitmask2str(cond), clrbuf);
        } else { // C `:4277`
            hilite.coloridx = clr | (atr << 8); // C `:4280`
            hilite.anytype = initblstats[fld].anytype; // C `:4281`

            if (fld === BL_TITLE) { // C `:4283`
                const tail = strstri(hilite.textmatch, ' or ');
                if (tail !== null) { // C `:4283` != 0
                    /* C `:4284–4285` split "male-rank or female-rank" into
                       two distinct but otherwise identical rules. */
                    hilite.textmatch = hilite.textmatch.slice( // C `:4286` *p = '\0'
                        0, hilite.textmatch.length - tail.length);
                    /* C `:4287` new rule for male-rank. */
                    status_hilite_add_threshold(fld, hilite); // C `:4288`
                    await pline('Added hilite %s', status_hilite2str(hilite)); // C `:4289`
                    /* C `:4290–4294` transfer female-rank to the buffer
                       start (p += sizeof " or " - sizeof "" == 4). */
                    hilite.textmatch = tail.slice(4);
                    /* C `:4295` proceed with normal addition. */
                }
            }
            status_hilite_add_threshold(fld, hilite); // C `:4297`
            await pline('Added hilite %s', status_hilite2str(hilite)); // C `:4298`
        }
        reset_status_hilites(); // C `:4300`
        return true; // C `:4301`
    }
    }
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
 * botl.c:4300 is the tail of status_hilite_menu_add (wired above).
 * options.c:4035 is optfn_statushilites do_set (live in
 * js/options.js, gated on !opt_from_file like C).
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
 * Create (mode bit 2) loops status_hilite_menu_add while it returns
 * TRUE (`:4445–4447`).
 *
 * When the field has no lines yet, C calls status_hilite_menu_add first
 * (`:4370`); FALSE from that returns FALSE (`:4375`), TRUE re-gathers
 * and recounts (`:4371–4373`) and falls through — the "No current
 * hilites for %s" row (`:4392–4394`) shows when the re-gather is still
 * empty.
 *
 * Sole C caller: status_hilite_menu `:4555` (wired below). `:670` is
 * the prototype.
 * @param {number} fld
 * @returns {Promise<boolean>} acted
 */
async function status_hilite_menu_fld(fld) {
    let count = status_hilite_linestr_countfield(fld); // C `:4363`
    if (!count) { // C `:4369–4376`
        if (await status_hilite_menu_add(fld)) { // C `:4370`
            status_hilite_linestr_done(); // C `:4371`
            status_hilite_linestr_gather(); // C `:4372`
            count = status_hilite_linestr_countfield(fld); // C `:4373`
        } else {
            return false; // C `:4375`
        }
    }

    const rows = [];
    if (count) { // C `:4381`
        let hlstr = status_hilite_str; // C `:4382`
        while (hlstr) { // C `:4383–4391`
            if ((hlstr.fld | 0) === (fld | 0)) {
                rows.push({
                    text: hlstr.str, selectable: true, attr: ATR_NONE, a_int: hlstr.id | 0,
                });
            }
            hlstr = hlstr.next;
        }
    } else { // C `:4392–4394`
        rows.push({
            text: `No current hilites for ${blstatFldName(fld)}`,
            selectable: false, attr: ATR_NONE,
        });
    }
    rows.push({ text: '', selectable: false, attr: ATR_NONE }); // C `:4398` separator
    if (count) { // C `:4400`
        rows.push({ // C `:4401–4404` a_int -1, accelerator 'X'
            text: 'Remove selected hilites',
            selectable: true,
            selector: 'X',
            attr: ATR_NONE,
            a_int: -1,
        });
    }
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
        if (mode & 2) { // C `:4445–4447` create new hilites
            while (await status_hilite_menu_add(fld))
                acted = true;
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
