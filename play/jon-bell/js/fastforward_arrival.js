// @ts-nocheck
// fastforward_arrival.js — Depth-aware makemon arrival RNG helper.
// C ref: nethack-c/src/allmain.c:286-290
//
//   if (!rn2(u.uevent.udemigod ? 25
//            : (depth(&u.uz) > depth(&stronghold_level)) ? 50
//            : 70))
//       (void) makemon((struct permonst *) 0, 0, 0, NO_MM_FLAGS);
//
// W23.8 audit surfaced 9 makemon-arrival-pin MEDIUM sites (steps 2-10 in
// fastforward.js) where the probability argument to rn2() was hardcoded as
// rn2(70) — the seed8000 Tourist/level-1 value.  Other sessions at different
// dungeon depths use rn2(50) (below stronghold) or rn2(25) (demi-god), so the
// pin causes RNG stream mismatches for those sessions.
//
// This module exports makemon_arrival_rng() which mirrors C's ternary exactly.
// W24.2 (fastforward.js owner) may import and call it to replace the 9 pins;
// L16 will wire it if W24.2 doesn't land first.
//
// File ownership: W24.7 (this file is INFRA — do not wire callers here).
import { rn2 } from "./rng.js";
import { game } from "./gstate.js";
import { depth } from "./hacklib.js";
// C ref: allmain.c:286-290 — "occasionally add another monster".
// Reads current hero position (u.uz) and demi-god flag (u.uevent.udemigod),
// then calls rn2(N) with the same N the C source would pick:
//   udemigod → 25
//   depth(u.uz) > depth(stronghold_level) → 50
//   otherwise → 70
// Returns void; the rn2() side-effect on the RNG stream is the entire purpose.
export function makemon_arrival_rng() {
    const g = game;
    const u = g?.u;
    const udemigod = u?.uevent?.udemigod;
    if (udemigod) {
        rn2(25);
        return;
    }
    // C: depth(&u.uz) > depth(&stronghold_level) ? 50 : 70
    // depth(lev) = dungeons[lev.dnum].depth_start + lev.dlevel - 1
    // stronghold_level is stored as g.stronghold_level (see js/const.js Is_stronghold).
    const uzDepth = depth(u?.uz ?? { dnum: 0, dlevel: 1 });
    const sl = g?.stronghold_level;
    const slDepth = sl ? depth(sl) : 26; // 26 = canonical stronghold depth (Valkyrie quest start)
    if (uzDepth > slDepth) {
        rn2(50);
    }
    else {
        rn2(70);
    }
}
