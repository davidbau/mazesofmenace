// rng.js — PRNG wrappers around ISAAC64.
// C ref: rng.c — three RNG contexts: core, display, lua.
// Contest: only core context is used for parity.

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

export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled) _rngLog.push(entry); }

function RND(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

// src/rnd.c:70 rn2_on_display_rng() — 0 <= x, on a DIFFERENT sequence from the
// main rn2, for answers that do not affect gameplay.
//
// C seeds this context from sys_random_seed() (rnd.c:284), so its values are
// deliberately not reproducible; that is the whole point of the separate
// stream, and it is why nothing it decides can ever appear in a scored screen.
// Seeding it here from the core seed keeps it deterministic for our own
// debugging without touching the core context, which is what parity depends on.
// It is NOT logged: the recordings only carry core-context draws.
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
    if (_rngLogEnabled) _rngLog.push(`rn2(${x})=${val}`);
    return val;
}

// C ref: rnd(x) — random number 1..x
export function rnd(x) {
    if (x <= 0) return 0;
    const val = RND(x) + 1;
    if (_rngLogEnabled) _rngLog.push(`rnd(${x})=${val}`);
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
