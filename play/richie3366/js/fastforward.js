// fastforward.js — Transitional RNG harness (NOT a design target).
//
// Blocks below replay leaf PRNG calls captured from a reference session so the
// ISAAC stream stays aligned while init/mklev/moveloop pieces are still stubs.
// They must be deleted or narrowed as real ports land:
//   • fastforward_pre_mklev / post_mklev → u_init.c (mklev fill
//     + mineralize run in mklev.js makelevel / level_finalize_topology).
//   • Per-turn tail: allmain.js moveloop_core → monmove.js + moveloop_aux.js
//     (replacing fastforward_step); this file keeps startup fill/replay only.
//
// Session JSON was only the extraction source; behavior must converge by
// matching C, not by tuning to fixtures.
//
// Derived from a frozen reference session RNG log (historical extraction).

import { runUInitRoleRngAfterMklevLikeC } from "./u_init_post_mklev.js";

// Pre-mklev: u_init remainder (init_objects + init_dungeons in o_init.js / dungeon_init.js)
export function fastforward_pre_mklev() {
    /* init_objects + init_dungeons — js/o_init.js, js/dungeon_init.js */
}

/** @deprecated Use runUInitRoleRngAfterMklevLikeC from u_init_post_mklev.js */
export function fastforward_post_mklev() {
    runUInitRoleRngAfterMklevLikeC();
}
