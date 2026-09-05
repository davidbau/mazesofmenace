// rng.js — PRNG wrappers around ISAAC64.
// C ref: rng.c — three RNG contexts: core, display, lua.
// Contest: core draws are scored directly; display draws affect screens.

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';
import { sgn } from './hacklib.js';

let _rngLog = [];
let _rngLogEnabled = false;

export function initRng(seed) {
    game.currentSeed = seed;
    // Convert seed to 8 little-endian bytes
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    game.coreCtx = isaac64_init(bytes);
    _rngLog = [];
}

export function enableRngLog() { _rngLogEnabled = true; _rngLog = []; }
/* debug-only: current draw count, for probe scripts */
export function rngLogLength() { return _rngLog.length; }

export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled) _rngLog.push(entry); }

function RND(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

// src/rnd.c:70 rn2_on_display_rng() — 0 <= x, on a DIFFERENT sequence from the
// main rn2, for answers that do not affect gameplay.
//
// C options.c initializes it through init_random(). The recorder's fixed-seed
// hook gives it the same initial seed as core. Its draws change hallucinated
// screens without advancing core RNG. Ordinary recordings omit these draws;
// NETHACK_RNGLOG_DISP enables them in the C diagnostic trace.
export function rn2_on_display_rng(x) {
    if (x <= 0) return 0;
    if (!game.dispCtx) {
        let s = BigInt(game.currentSeed || 0) & 0xFFFFFFFFFFFFFFFFn;
        const bytes = new Uint8Array(8);
        for (let i = 0; i < 8; i++) { bytes[i] = Number(s & 0xFFn); s >>= 8n; }
        game.dispCtx = isaac64_init(bytes);
    }
    return Number(isaac64_next_uint64(game.dispCtx) % BigInt(x));
}

// C ref: rn2(x) — random number 0..x-1
export function rn2(x) {
    if (x <= 0) return 0;
    const val = RND(x);
    if (_rngLogEnabled) _rngLog.push(_site(`rn2(${x})=${val}`));
    if (globalThis.__rng_stack_at !== undefined
        && _rngLog.length - 1 === globalThis.__rng_stack_at)
        console.error('RNGSTACK', _rngLog.length - 1,
                      new Error('x').stack.split('\n').slice(2, 8).join('\n'));
    if (globalThis.__rng_probe_at !== undefined
        && _rngLog.length - 1 === globalThis.__rng_probe_at.at)
        globalThis.__rng_probe_at.cb(_rngLog.length - 1);
    return val;
}

/* Debug-only: when game.rng_trace_sites is set (never during scoring), tag
   each logged draw with its first js/ caller so probe harnesses can
   attribute OUR draws the way C's recordings attribute theirs. */
function _site(entry) {
    if (!globalThis.__rng_trace_sites)
        return entry;
    const line = (new Error().stack || '').split('\n')
        .find(l => l.includes('/js/') && !l.includes('/js/rng.js')
                   && !l.includes('/js/zap.js'));
    return entry + ' @' + (line || '').trim().replace(/^at /, '')
        .replace(/.*\/js\//, 'js/').replace(/\)?$/, '');
}

// C ref: rnd(x) — random number 1..x
export function rnd(x) {
    if (x <= 0) return 0;
    const val = RND(x) + 1;
    if (_rngLogEnabled) _rngLog.push(`rnd(${x})=${val}`);
    /* debug-only seam (never set during scoring): stack-trace the draw at
       one exact log index — the untagged-rnd twin of __rng_trace_sites */
    if (globalThis.__rng_stack_at !== undefined
        && _rngLog.length - 1 === globalThis.__rng_stack_at)
        console.error('RNGSTACK', _rngLog.length - 1,
                      new Error('x').stack.split('\n').slice(2, 8).join('\n'));
    return val;
}

// include/hack.h:1535  #define rn1(x, y) (rn2(x) + (y))
// A macro, not a function: it logs as the inner rn2, never as "rn1(...)".
// Confirmed against the corpus, which contains zero rn1 entries.
export function rn1(x, y) { return rn2(x) + y; }

// src/rnd.c:175 d(n, x) — d(N,X) == NdX; n <= d(n,x) <= (n*x)
// Draws through RND() directly, NOT through rnd(), so the log carries one
// "d(n,x)=tmp" entry and no inner entries. Verified against the recordings:
// "d(11,8)=49 @ newmonhp(makemon.c:1042)" appears with no rnd() lines before it.
export function d(n, x) {
    const n_arg = n; /* C logs the original n; the loop below consumes it */
    let tmp = n;

    while (n--)
        tmp += RND(x);
    if (_rngLogEnabled) _rngLog.push(`d(${n_arg},${x})=${tmp}`);
    return tmp; /* Alea iacta est. -- J.C. */
}

// src/rnd.c:112 rnl(x) — 0 <= rnl(x) < x, sometimes subtracting Luck;
// good luck approaches 0, bad luck approaches (x-1).
// The initial draw is a raw RND(); the adjustment check is a real rn2() and
// therefore logs its own entry before this one.
export function rnl(x) {
    let adjustment = Luck();

    if (x <= 15) {
        /* for small ranges, use Luck/3 (rounded away from 0);
           also guard against architecture-specific differences
           of integer division involving negative values */
        adjustment = Math.trunc((Math.abs(adjustment) + 1) / 3) * sgn(adjustment);
    }

    let i = RND(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0)
            i = 0;
        else if (i >= x)
            i = x - 1;
    }
    if (_rngLogEnabled) _rngLog.push(`rnl(${x})=${i}`);
    return i;
}

// include/you.h:464  #define Luck (u.uluck + u.moreluck)
function Luck() {
    const u = game.u;
    return u ? (u.uluck || 0) + (u.moreluck || 0) : 0;
}

// C ref: rne(x) — exponentially distributed
// Internal rn2 calls are logged (matching C's PRNG log format).
export function rne(x) {
    const ulevel = game.u?.ulevel || 1;
    const utmp = ulevel < 15 ? 5 : Math.trunc(ulevel / 3);
    let tmp = 1;
    while (tmp < utmp && !rn2(x)) tmp++;
    if (_rngLogEnabled) _rngLog.push(`rne(${x})=${tmp}`);
    return tmp;
}

// C ref: rnz(i) — fuzzy random around i
// Internal rn2/rne calls are logged (matching C's PRNG log format).
export function rnz(i) {
    let x = i;
    let tmp = 1000;
    tmp += rn2(1000);
    tmp *= rne(4);
    if (rn2(2)) { x *= tmp; x = Math.trunc(x / 1000); }
    else { x *= 1000; x = Math.trunc(x / tmp); }
    if (_rngLogEnabled) _rngLog.push(`rnz(${i})=${x}`);
    return x;
}

export const c_d = d;
export const lua_d = d;
