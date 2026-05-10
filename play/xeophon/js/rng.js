// rng.js — PRNG wrappers around ISAAC64.
// C ref: src/rnd.c — core and display RNG contexts.

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';

let _rngLog = [];
let _rngLogEnabled = false;
let _displayRngLogEnabled = false;

function seedBytes(seed) {
    let s = BigInt(seed) & 0xFFFFFFFFFFFFFFFFn;
    const bytes = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        bytes[i] = Number(s & 0xFFn);
        s >>= 8n;
    }
    return bytes;
}

export function initRng(seed, { resetLog = true } = {}) {
    game.currentSeed = seed;
    const bytes = seedBytes(seed);
    game.coreCtx = isaac64_init(bytes);
    game.displayCtx = isaac64_init(bytes);
    game.rng = { core: game.coreCtx, display: game.displayCtx };
    if (resetLog) _rngLog = [];
}

export function enableRngLog({ reset = true } = {}) {
    _rngLogEnabled = true;
    if (reset) _rngLog = [];
}
export function getRngLog() { return _rngLog; }
export function truncateRngLog(length) { _rngLog.length = length; }
export function pushRngLogEntry(entry) { if (_rngLogEnabled) _rngLog.push(entry); }
export function enableDisplayRngLog(enabled = true) { _displayRngLogEnabled = !!enabled; }

function logRng(name, args, value) {
    if (_rngLogEnabled) _rngLog.push(`${name}(${args})=${value}`);
}

function RND(x) {
    const val = isaac64_next_uint64(game.coreCtx);
    return Number(val % BigInt(x));
}

export function consumeCoreRng(x) {
    if (x <= 0) return 0;
    return RND(x);
}

function DISPLAY_RND(x) {
    const val = isaac64_next_uint64(game.displayCtx);
    return Number(val % BigInt(x));
}

// C ref: rn2(x) — random number 0..x-1
export function rn2(x) {
    if (x <= 0) return 0;
    const val = RND(x);
    logRng('rn2', `${x}`, val);
    return val;
}

// C ref: rnd(x) — random number 1..x
export function rnd(x) {
    if (x <= 0) return 0;
    const val = RND(x) + 1;
    logRng('rnd', `${x}`, val);
    return val;
}

// C ref: rn1(x, y) — random number y..y+x-1
export function rn1(x, y) { return rn2(x) + y; }

// C ref: d(n, x) — roll n dice of x sides
export function d(n, x) {
    const origN = n;
    let tmp = n;
    while (n-- > 0) tmp += RND(x);
    logRng('d', `${origN},${x}`, tmp);
    return tmp;
}

// C ref: rnl(x) — random number biased by Luck
export function rnl(x) {
    let adjustment = (game.u?.uluck || 0) + (game.u?.moreluck || 0);
    if (x <= 15) adjustment = Math.trunc((Math.abs(adjustment) + 1) / 3) * Math.sign(adjustment);

    let i = RND(x);
    if (adjustment && rn2(37 + Math.abs(adjustment))) {
        i -= adjustment;
        if (i < 0) i = 0;
        else if (i >= x) i = x - 1;
    }
    logRng('rnl', `${x}`, i);
    return i;
}

// C ref: rne(x) — exponentially distributed
// Internal rn2 calls are logged (matching C's PRNG log format).
export function rne(x, traceInternal = true) {
    const ulevel = game.u?.ulevel || 1;
    const utmp = ulevel < 15 ? 5 : Math.trunc(ulevel / 3);
    let tmp = 1;
    while (tmp < utmp && !(traceInternal ? rn2(x) : RND(x))) tmp++;
    logRng('rne', `${x}`, tmp);
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
    logRng('rnz', `${i}`, x);
    return x;
}

export function rn2_on_display_rng(x) {
    const val = DISPLAY_RND(x);
    if (_rngLogEnabled && _displayRngLogEnabled) _rngLog.push(`~drn2(${x})=${val}`);
    return val;
}

export function rnd_on_display_rng(x) {
    return rn2_on_display_rng(x) + 1;
}

export const c_d = d;
export const lua_d = d;
