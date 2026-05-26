// nhl_rng.js — Lua-side ISAAC64 context (NHL / nh.* / math.random shim).
// C ref: rng.c lua context; nhlua.c nh.rn2 / nh.random (Lua-facing draws).
// Recorder patch 004 tags Lua call sites — JS logs same `rn2(` / `rnd(` line shape when enabled.

import { isaac64_init, isaac64_next_uint64 } from './isaac64.js';
import { game } from './gstate.js';
import { pushRngLogEntry } from './rng.js';

function RND_lua(x) {
    const ctx = game.luaCtx;
    if (!ctx) return 0;
    const val = isaac64_next_uint64(ctx);
    return Number(val % BigInt(x));
}

/** C: nh.rn2(n) — 0..n-1 on Lua RNG stream */
export function nhlRn2LikeC(n) {
    const x = n | 0;
    if (x <= 0) return 0;
    const v = RND_lua(x);
    if (game._rngLogLuaEnabled) pushRngLogEntry(`rn2(${x})=${v}`);
    return v;
}

/** C: nh.random(a) or nh.random(a,b) — same as nhl_random in nhlua.c */
export function nhlRandomLikeC(a, b) {
    if (b === undefined) return nhlRn2LikeC(a | 0);
    const lo = a | 0;
    const span = b | 0;
    return lo + nhlRn2LikeC(span);
}

/**
 * Seed Lua ISAAC from core seed bytes XOR tag (independent stream vs core).
 * C upstream may share or split streams; contest README expects a distinct Lua channel.
 * @param {Uint8Array|number[]} coreBytes — same 8 bytes passed to core isaac64_init
 */
export function initLuaRngFromCoreBytesLikeC(coreBytes) {
    const tag = [0x4e, 0x48, 0x4c, 0x4c, 0x55, 0x41, 0x52, 0x31]; /* "NHLLUAR1" */
    const out = new Uint8Array(8);
    for (let i = 0; i < 8; i++) {
        out[i] = (coreBytes[i] | 0) ^ tag[i];
    }
    game.luaCtx = isaac64_init(out);
}

/** Enable `rn2(` lines for Lua draws (same log channel as core for harness position checks). */
export function enableLuaRngLogLikeC(on) {
    game._rngLogLuaEnabled = !!on;
}
