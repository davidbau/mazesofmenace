// rng.js — dice functions, ported from rnd.c.
// C ref: rnd.c — RND, rn2, rnl, rnd, d, rne, rnz, shuffle_int_array.
// Also covers the hack.h macros that roll dice: rn1, ROLL_FROM, AC_VALUE.
// Contest: only the core RNG context is scored.

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';

let _rngLog = [];
let _rngLogEnabled = false;

// C ref: rnd.c init_isaac64() — seed bytes are the unsigned long, little-endian.
export function initRng(seed) {
    game.currentSeed = seed;
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    game.coreCtx = isaac64_init(bytes);
    /* options.c: init_random(rn2); init_random(rn2_on_display_rng); --
       sys_random_seed() returns the same NETHACK_SEED for both */
    game.dispCtx = isaac64_init(bytes);
    _rngLog = [];
}

// ── Caller tracing (method rule: "match every roll, including who rolls it") ──
// Off unless a dev tool sets globalThis.__TELEPORT_CALLER_TRACE = true. When on,
// each log entry gets " @ <caller>" appended, mirroring the C recorder's
// " @ fn(file:line)" tail. The official scorer strips everything after " @ ",
// so this never affects scoring.
//
// Attribution matches the C recorder (hack.h rng-log macros):
//  - A roll is attributed to the function containing the call site.
//  - Rolls inside the rnd.c helpers (rnl, rne, rnz, shuffle_int_array) and
//    inside the dice macros (rn1, ROLL_FROM, AC_VALUE) count for the outer
//    function. These names are skipped when walking the JS stack, so ports may
//    implement the macros as JS functions.
//  - Lua-side rolls carry the Lua tag (e.g. "nh.rn2(themerms.lua:123)").
//    Ported Lua code must make them inside withRngCaller(tag, fn).
//  - Builtin callback frames (forEach, map, ...) and anonymous functions are
//    skipped, so a roll inside an arrow callback counts for the enclosing
//    named function. Keep rolls inside the function C rolls them in.
const RNG_HELPERS = new Set([
    'RND', 'rn2', 'rnd', 'rn1', 'rnl', 'rne', 'rnz', 'd', 'c_d', 'lua_d',
    'shuffle_int_array', 'ROLL_FROM', 'AC_VALUE',
    'rngCallerTag', 'computeCallerTag', 'logRoll', 'withRngCaller', 'rn2_fnptr',
    'rn2_on_display_rng', 'rnd_on_display_rng',
]);
const BUILTIN_FRAMES = new Set([
    '<anonymous>', 'forEach', 'map', 'filter', 'reduce', 'reduceRight', 'some',
    'every', 'find', 'findIndex', 'flatMap', 'sort', 'call', 'apply', 'from',
    'next', 'Generator', 'processTicksAndRejections', 'new',
]);
let _explicitCaller = null;

// Run fn with every roll attributed to tag (used by ported Lua scripts).
export function withRngCaller(tag, fn) {
    const saved = _explicitCaller;
    _explicitCaller = tag;
    try { return fn(); } finally { _explicitCaller = saved; }
}

// The C recorder's caller context is sticky: hack.h's rng macros set it at each
// wrapped call site and it stays until the next one. _lastTag mirrors that.
let _lastTag = '';

export function rngCallerTag() {
    if (!globalThis.__TELEPORT_CALLER_TRACE) return '';
    _lastTag = computeCallerTag();
    return _lastTag;
}

function computeCallerTag() {
    if (_explicitCaller) return ` @ ${_explicitCaller}`;
    const saved = Error.stackTraceLimit;
    Error.stackTraceLimit = 40;
    const stack = new Error().stack || '';
    Error.stackTraceLimit = saved;
    for (const line of stack.split('\n').slice(1)) {
        const m = /^\s*at (?:async )?(?:new )?([^\s(]+)/.exec(line);
        if (!m) continue;
        const name = m[1].split('.').pop();
        if (RNG_HELPERS.has(name) || BUILTIN_FRAMES.has(name)) continue;
        return ` @ ${name}`;
    }
    return ' @ ?';
}

function logRoll(fn, args, result) {
    if (_rngLogEnabled) _rngLog.push(`${fn}(${args})=${result}` + rngCallerTag());
}

export function enableRngLog() { _rngLogEnabled = true; _rngLog = []; }
export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled) _rngLog.push(entry); }

// C ref: rnd.c RND() (USE_ISAAC64) — next 64-bit value mod x. Not logged.
function RND(x) {
    return Number(isaac64_next_uint64(game.coreCtx) % BigInt(x));
}

// C ref: rnd.c rn2() — 0 <= rn2(x) < x.
// The released C build has no x <= 0 check (RND(0) is undefined behaviour);
// a correct port never calls rn2(0), so we keep the skeleton's guard instead of
// letting BigInt % 0n throw.
export function rn2(x) {
    if (x <= 0) return 0;
    const result = RND(x);
    logRoll('rn2', x, result);
    return result;
}

// C ref: rn2 passed as a function pointer (rumors.c get_rnd_line via getrumor /
// get_rnd_text, detect.c and zap.c random_object/random_monster(rn2), apply.c
// obj_to_glyph(corpse, rn2)). Writing bare `rn2` skips hack.h's caller-setting
// macro, so in C these rolls carry the LAST caller tag set by an earlier
// wrapped roll, not the function that actually rolls. Pass rn2_fnptr wherever
// C passes `rn2` without calling it; values are identical to rn2.
export function rn2_fnptr(x) {
    if (x <= 0) return 0;
    const result = RND(x);
    if (_rngLogEnabled) {
        const tag = globalThis.__TELEPORT_CALLER_TRACE ? _lastTag : '';
        _rngLog.push(`rn2(${x})=${result}` + tag);
    }
    return result;
}

// C ref: rnd.c rn2_on_display_rng() -- 0 <= x < x on the DISP sequence,
// which doesn't affect gameplay; the recorder logs it only when
// NETHACK_RNGLOG_DISP is set (it isn't), so it isn't logged here.
export function rn2_on_display_rng(x) {
    const result = Number(isaac64_next_uint64(game.dispCtx) % BigInt(x));
    // Debug only (off unless a dev tool sets the flag): mirrors the recorder's
    // NETHACK_RNGLOG_DISP "~drn2(x) = r" lines so display-RNG order can be diffed.
    if (_rngLogEnabled && globalThis.__TELEPORT_DISP_LOG)
        _rngLog.push(`~drn2(${x})=${result}`);
    return result;
}

// C ref: rnd.c rnd_on_display_rng()
export function rnd_on_display_rng(x) {
    return rn2_on_display_rng(x) + 1;
}

// C ref: Luck macro (you.h) — u.uluck + u.moreluck.
function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

// C ref: rnd.c rnl() — 0 <= rnl(x) < x, adjusted by Luck.
// The internal rn2 is logged (attributed to the outer caller); RND is not.
export function rnl(x) {
    let adjustment = Luck();
    if (x <= 15) {
        // Luck/3 rounded away from 0
        adjustment = Math.trunc((Math.abs(adjustment) + 1) / 3) * Math.sign(adjustment);
    }
    let i = RND(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    logRoll('rnl', x, i);
    return i;
}

// C ref: rnd.c rnd() — 1 <= rnd(x) <= x.
export function rnd(x) {
    const result = RND(x) + 1;
    logRoll('rnd', x, result);
    return result;
}

// C ref: hack.h rn1(x, y) macro — rn2(x) + y.
export function rn1(x, y) { return rn2(x) + y; }

// C ref: rnd.c d() — NdX. Uses RND directly and logs ONE entry "d(n,x)=sum".
export function d(n, x) {
    let tmp = n;
    for (let k = n; k > 0; k--) tmp += RND(x);
    logRoll('d', `${n},${x}`, tmp);
    return tmp;
}

// C ref: rnd.c rne() — 1 <= rne(x) <= max(u.ulevel/3, 5). Internal rn2s logged.
export function rne(x) {
    const ulevel = game.u?.ulevel || 1;
    const utmp = ulevel < 15 ? 5 : Math.trunc(ulevel / 3);
    let tmp = 1;
    while (tmp < utmp && !rn2(x)) tmp++;
    logRoll('rne', x, tmp);
    return tmp;
}

// C ref: rnd.c rnz() — long arithmetic, truncating division. Internal rolls logged.
export function rnz(i) {
    let x = i;
    let tmp = 1000;
    tmp += rn2(1000);
    tmp *= rne(4);
    if (rn2(2)) { x *= tmp; x = Math.trunc(x / 1000); }
    else { x *= 1000; x = Math.trunc(x / tmp); }
    logRoll('rnz', i, x);
    return x;
}

// C ref: rnd.c shuffle_int_array() — in-place Fisher-Yates via rn2.
export function shuffle_int_array(indices, count) {
    for (let i = count - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap === i) continue;
        const temp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = temp;
    }
}

// C ref: hack.h ROLL_FROM(array) macro — array[rn2(SIZE(array))].
export function ROLL_FROM(array) { return array[rn2(array.length)]; }

// C ref: hack.h AC_VALUE(AC) macro — AC >= 0 ? AC : -rnd(-AC).
export function AC_VALUE(ac) { return ac >= 0 ? ac : -rnd(-ac); }

export const c_d = d;
export const lua_d = d;
