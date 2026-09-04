// rng.js — PRNG wrappers around ISAAC64.
// C ref: rnd.c — two ISAAC64 streams: core and display.
// Lua nh.rn2/nh.random uses core; the recorder adds Lua caller provenance.
// Display stream (rn2_on_display_rng) is seeded with the same bytes as core
// (options.c init_random(rn2) + init_random(rn2_on_display_rng)).

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';

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
    // C: separate isaac64_ctx for DISP; same seed material
    game.dispCtx = isaac64_init(bytes);
    _rngLog = [];
}

export function enableRngLog() { _rngLogEnabled = true; _rngLog = []; }
export function getRngLog() { return _rngLog; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled) _rngLog.push(entry); }

/*
 * Diagnostic caller tag. Off unless a harness sets
 * globalThis.__NH_RNG_TRACE = true (never in scored play): each logged
 * draw then carries " @ <jsFunction>(<file>:<line>)" the way the C
 * recorder tags its entries with __func__/__FILE__/__LINE__. Every
 * comparator strips the " @ ..." suffix before matching, so the tag is
 * free to the score and lets a first-diff name both sides. Node and
 * Chrome stack formats both carry "/js/<file>:<line>".
 */
function rngCaller() {
    const stack = String(new Error().stack || '').split('\n');
    for (const ln of stack.slice(1)) {
        if (ln.includes('/rng.js') || ln.includes('/isaac64.js')) continue;
        const m = /([\w$.<>]+)?\s*\(?[^()]*\/js\/([\w./-]+):(\d+)/.exec(ln);
        if (m) return `${m[1] ? m[1].replace(/^async /, '') : '?'}(${m[2]}:${m[3]})`;
    }
    return '?';
}
function logRng(entry) {
    if (!_rngLogEnabled) return;
    _rngLog.push(globalThis.__NH_RNG_TRACE ? `${entry} @ ${rngCaller()}` : entry);
}

function RND(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

/**
 * C ref: rnd.c rn2_on_display_rng — 0..x-1 on the display ISAAC stream.
 * Not logged into the core gameplay RNG log (contest ~drn2 is optional).
 */
export function rn2_on_display_rng(x) {
    if (x <= 0) return 0;
    if (!game.dispCtx) {
        game.dispCtx = isaac64_init(new Uint8Array(8));
    }
    const val = isaac64_next_uint64(game.dispCtx);
    return Number(val % BigInt(x));
}

/** C rnd.c rnd_on_display_rng `:167–171` — 1..x on the display stream. */
export function rnd_on_display_rng(x) {
    return rn2_on_display_rng(x) + 1;
}

function sgn(n) {
    return n < 0 ? -1 : n !== 0 ? 1 : 0;
}

// C ref: you.h Luck — u.uluck + u.moreluck
function Luck() {
    const u = game.u || {};
    return (u.uluck || 0) + (u.moreluck || 0);
}

// C ref: rn2(x) — random number 0..x-1
export function rn2(x) {
    if (x <= 0) return 0;
    const val = RND(x);
    logRng(`rn2(${x})=${val}`);
    return val;
}

// C ref: rnd(x) — random number 1..x
export function rnd(x) {
    if (x <= 0) return 0;
    const val = RND(x) + 1;
    logRng(`rnd(${x})=${val}`);
    return val;
}

// C ref: rnd.c rnl(x) — 0..x-1 with Luck bias; RND unlogged, internal rn2 logged
export function rnl(x) {
    if (x <= 0) return 0;
    let adjustment = Luck();
    if (x <= 15) {
        // C: (abs(adjustment) + 1) / 3 * sgn(adjustment)
        adjustment = Math.trunc((Math.abs(adjustment) + 1) / 3) * sgn(adjustment);
    }
    let i = RND(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    logRng(`rnl(${x})=${i}`);
    return i;
}

// C ref: rn1(x, y) — random number y..y+x-1
export function rn1(x, y) { return rn2(x) + y; }

// C ref: d(n, x) — roll n dice of x sides
export function d(n, x) {
    let sum = 0;
    for (let i = 0; i < n; i++) {
        // Use RND directly so only the outer d() is logged (matches C PRNG log)
        sum += 1 + RND(x);
    }
    logRng(`d(${n},${x})=${sum}`);
    return sum;
}

// C ref: rne(x) — exponentially distributed
// Internal rn2 calls are logged (matching C's PRNG log format).
export function rne(x) {
    const ulevel = game.u?.ulevel || 1;
    const utmp = ulevel < 15 ? 5 : Math.trunc(ulevel / 3);
    let tmp = 1;
    while (tmp < utmp && !rn2(x)) tmp++;
    logRng(`rne(${x})=${tmp}`);
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
    logRng(`rnz(${i})=${x}`);
    return x;
}

export const c_d = d;
export const lua_d = d;

/**
 * C ref: rnd.c shuffle_int_array — Fisher-Yates; skip swap when rn2(i+1)==i.
 * Mutates indices[0..count).
 */
export function shuffle_int_array(indices, count = indices?.length) {
    const n = count | 0;
    for (let i = n - 1; i > 0; i--) {
        const iswap = rn2(i + 1);
        if (iswap === i) continue;
        const temp = indices[i];
        indices[i] = indices[iswap];
        indices[iswap] = temp;
    }
}
