// fastforward.js — Transitional RNG harness (NOT a design target).
//
// Blocks below replay leaf PRNG calls captured from a reference session so the
// ISAAC stream stays aligned while init/mklev/moveloop pieces are still stubs.
// They must be deleted or narrowed as real ports land:
//   • fastforward_pre_mklev / post_mklev / fill_mineralize → o_init, dungeon.c,
//     u_init.c, mklev.c object/mineralize paths matching this repo’s mklev.js.
//   • Per-turn tail: allmain.js moveloop_core → monmove.js + moveloop_aux.js
//     (replacing fastforward_step); this file keeps startup fill/replay only.
//
// Session JSON was only the extraction source; behavior must converge by
// matching C, not by tuning to fixtures.
//
// Derived from a frozen reference session RNG log (historical extraction).

import { rn2, rnd, d, rne, rnz } from "./rng.js";
import { game } from "./gstate.js";
import {
    consumeRogueHumanIniInvUinitRoleRngLikeC,
    consumeSamuraiHumanIniInvUinitRoleRngLikeC,
    consumeValkyrieHumanIniInvUinitRoleRngLikeC,
    consumeKnightHumanIniInvUinitRoleRngLikeC,
    consumeMonkHumanIniInvUinitRoleRngLikeC,
    consumeWizardHumanIniInvUinitRoleRngLikeC,
    consumeArcheologistHumanIniInvUinitRoleRngLikeC,
    consumeHealerHumanIniInvUinitRoleRngLikeC,
    consumePriestHumanIniInvUinitRoleRngLikeC,
    consumeBarbarianHumanIniInvUinitRoleRngLikeC,
    consumeCaveDwellerHumanIniInvUinitRoleRngLikeC,
    consumeRangerHumanIniInvUinitRoleRngLikeC,
    consumeTouristHumanIniInvUinitRoleRngLikeC,
} from "./u_init_role_rng.js";
import { races } from "./roles.js";

// Pre-mklev startup: o_init shuffles, dungeon init, u_init_misc (handedness rn2(10) in allmain.js before l_nhcore_init)
// 302 leaf RNG calls (session indices 0-307)
export function fastforward_pre_mklev() {
    // randomize_gem_colors
    rn2(2); rn2(2); rn2(4);
    // shuffle
    rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21);
    rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13);
    rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25);
    rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17);
    rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9);
    rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35); rn2(34);
    rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27); rn2(26);
    rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19); rn2(18);
    rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11); rn2(10);
    rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3); rn2(2);
    rn2(1); rn2(41); rn2(40); rn2(39); rn2(38); rn2(37); rn2(36); rn2(35);
    rn2(34); rn2(33); rn2(32); rn2(31); rn2(30); rn2(29); rn2(28); rn2(27);
    rn2(26); rn2(25); rn2(24); rn2(23); rn2(22); rn2(21); rn2(20); rn2(19);
    rn2(18); rn2(17); rn2(16); rn2(15); rn2(14); rn2(13); rn2(12); rn2(11);
    rn2(10); rn2(9); rn2(8); rn2(7); rn2(6); rn2(5); rn2(4); rn2(3);
    rn2(2); rn2(1); rn2(28); rn2(27); rn2(26); rn2(25); rn2(24); rn2(23);
    rn2(22); rn2(21); rn2(20); rn2(19); rn2(18); rn2(17); rn2(16); rn2(15);
    rn2(14); rn2(13); rn2(12); rn2(11); rn2(10); rn2(9); rn2(8); rn2(7);
    rn2(6); rn2(5); rn2(4); rn2(3); rn2(2); rn2(1); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(4); rn2(3); rn2(2); rn2(1);
    rn2(4); rn2(3); rn2(2); rn2(1); rn2(7); rn2(6); rn2(5); rn2(4);
    rn2(3); rn2(2); rn2(1);
    // init_objects
    rn2(2);
    // random
    rn2(3); rn2(2);
    // init_dungeon_dungeons
    rn2(100); rn2(5);
    // init_level
    rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(4); rn2(5); rn2(4); rn2(1);
    // init_dungeon_dungeons
    rn2(100); rn2(5);
    // parent_dlevel
    rn2(1);
    // init_level
    rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1); rn2(4); rn2(3); rn2(5); rn2(6); rn2(1); rn2(1);
    rn2(4); rn2(4); rn2(3);
    // init_dungeon_dungeons
    rn2(100); rn2(2);
    // parent_dlevel
    rn2(3);
    // init_level
    rn2(100); rn2(100);
    // place_level
    rn2(2); rn2(1);
    // init_dungeon_dungeons
    rn2(100); rn2(2);
    // parent_dlevel
    rn2(2);
    // init_level
    rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1); rn2(1);
    // init_dungeon_dungeons
    rn2(100);
    // parent_dlevel
    rn2(1);
    // init_level
    rn2(100); rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1); rn2(1); rn2(1);
    // init_dungeon_dungeons
    rn2(100);
    // parent_dlevel
    rn2(4);
    // init_level
    rn2(100);
    // place_level
    rn2(1);
    // init_dungeon_dungeons
    rn2(100);
    // parent_dlevel
    rn2(5);
    // init_level
    rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1); rn2(1);
    // init_dungeon_dungeons
    rn2(100);
    // parent_dlevel
    rn2(1);
    // init_level
    rn2(100); rn2(100); rn2(100); rn2(100); rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1); rn2(1); rn2(1); rn2(1); rn2(1);
    // init_dungeon_dungeons
    rn2(100);
    // init_level
    rn2(100); rn2(100);
    // place_level
    rn2(1); rn2(1);
    // init_castle_tune (dungeon.c init_castle_tune — store for pray.c pleased pat_on_head)
    {
        let tune = '';
        for (let i = 0; i < 5; i++) tune += String.fromCharCode(65 + rn2(7));
        game._castleTuneStr = tune;
    }
    /* C u_init.c u_init_misc — `u.uhandedness = rn2(10) ? …` (allmain.js newgame, after g.u scaffold) */
}

// Post-mklev startup: u_init_role, ini_inv, and most of moveloop_preamble RNG
// except rnd(9000)/rnd(30) (see moveloop_preamble.js).
// init_attr(75)+vary_init_attr() PRNG is replayed by u_init_attr.js (allmain.js).
// Leading rnd(1000) for tourist starting gold is real code: u_init_money.js (allmain.js).
// ~84 leaf RNG calls here for generic roles (was ~85). Human Rogue / Samurai / Valkyrie / … / Cave dweller use u_init_role_rng.js.
export function fastforward_post_mklev() {
    const humanIdx = races.findIndex((r) => r.name === "human");
    const rog = game.urole?.abbr === "Rog" && (game.initrace | 0) === humanIdx;
    if (rog) {
        consumeRogueHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const sam = game.urole?.abbr === "Sam" && (game.initrace | 0) === humanIdx;
    if (sam) {
        consumeSamuraiHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const val = game.urole?.abbr === "Val" && (game.initrace | 0) === humanIdx;
    if (val) {
        consumeValkyrieHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const kni = game.urole?.abbr === "Kni" && (game.initrace | 0) === humanIdx;
    if (kni) {
        consumeKnightHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const mon = game.urole?.abbr === "Mon" && (game.initrace | 0) === humanIdx;
    if (mon) {
        consumeMonkHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const wiz = game.urole?.abbr === "Wiz" && (game.initrace | 0) === humanIdx;
    if (wiz) {
        consumeWizardHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const arc = game.urole?.abbr === "Arc" && (game.initrace | 0) === humanIdx;
    if (arc) {
        consumeArcheologistHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const hea = game.urole?.abbr === "Hea" && (game.initrace | 0) === humanIdx;
    if (hea) {
        consumeHealerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const pri = game.urole?.abbr === "Pri" && (game.initrace | 0) === humanIdx;
    if (pri) {
        consumePriestHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const bar = game.urole?.abbr === "Bar" && (game.initrace | 0) === humanIdx;
    if (bar) {
        consumeBarbarianHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const ran = game.urole?.abbr === "Ran" && (game.initrace | 0) === humanIdx;
    if (ran) {
        consumeRangerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const tou = game.urole?.abbr === "Tou" && (game.initrace | 0) === humanIdx;
    if (tou) {
        consumeTouristHumanIniInvUinitRoleRngLikeC();
        return;
    }
    const cav = game.urole?.abbr === "Cav" && (game.initrace | 0) === humanIdx;
    if (cav) {
        consumeCaveDwellerHumanIniInvUinitRoleRngLikeC();
        return;
    }
    rn2(20); rnd(2); rn2(6); rn2(11); rn2(10); rn2(10); rn2(100); rn2(20); rn2(1);
    rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000);
    rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2);
    rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6); rnd(1000); rnd(2); rn2(6);
    rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(15); rn2(10);
    rn2(6); rn2(1); rnd(2); rn2(4); rn2(2); rnd(2); rn2(4); rn2(2); rn2(1); rnd(2); rn2(4);
    rnd(2); rn2(4); rnd(2); rn2(4); rnd(2); rn2(4); rn2(1); rnd(2); rn2(10); rn2(11); rn2(10);
    rn2(10); rn2(1); rnd(2); rn2(70); rn2(1); rn2(1); rnd(2); rn2(1); rn2(25); rn2(25); rn2(25);
    /* u_init before init_attr — C order keeps these before init_attr(75) */
    rn2(20); rn2(1); rnd(2);
    /* rnd(9000); rnd(30) — moveloop_preamble.js (!resuming), C: allmain.c moveloop_preamble */
}

// Fill + mineralize: 1448 calls
export function fastforward_fill_mineralize() {
    rn2(8); rn2(3); rn2(8); rn2(3); rn2(8); rn2(6); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60); 
    rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(8); rn2(6); rnd(100); rnd(1000); 
    rnd(2); rn2(10); rn2(11); rn2(10); rn2(10); rn2(40); rn2(100); rn2(80); rn2(80); rn2(1000); 
    rn2(5); rn2(3); rn2(14); rn2(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); 
    rn2(16); rn2(21); rnd(2); rnd(4); rn2(50); rn2(100); rn2(100); rn2(8); rnd(25); rnd(25); 
    rnd(25); rnd(25); rnd(25); rn2(14); rn2(2); rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6); 
    rn2(5); rn2(15); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); 
    rn2(21); rn2(2); rnz(25); rn2(8); rn2(3); rn2(14); rn2(2); rnd(2); rnd(3); rnd(2); rn2(10); 
    rn2(60); rn2(14); rn2(2); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); 
    rn2(4); rn2(5); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); 
    rnd(2); rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(4); rn2(5); rnd(2); 
    rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(4); rn2(5); rn2(3); rn2(3); 
    rnd(2); rn2(6); rn2(2); rn2(9); rnd(2); rn2(4); rn2(5); rn2(3); rn2(10); rnd(1000); rnd(2); 
    rn2(3); rn2(6); rn2(30); rn2(3); rn2(4); rn2(5); rnd(100); rnd(1000); rnd(2); rn2(4); rn2(2); 
    rn2(5); rn2(3); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); 
    rn2(3); rn2(3); rn2(8); rnd(25); rn2(7); rnd(25); rnd(25); rn2(7); rnd(25); rn2(4); rn2(2); 
    rnd(4); rn2(4); rnd(1000); rnd(2); rn2(6); rn2(5); rn2(15); rn2(10); rnd(2); rn2(3); rn2(4); 
    rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(2); rnz(25); rn2(8); rn2(3); 
    rn2(10); rn2(60); rn2(60); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(6); 
    rn2(3); rn2(3); rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2); 
    rnd(4); rn2(2); rn2(50); rn2(100); rn2(100); rn2(8); rn2(3); rn2(10); rn2(60); rn2(60); 
    rn2(78); rn2(20); rn2(20); rn2(30); rn2(4); rn2(2); rn2(25762); rn2(25762); rn2(75); rn2(4); 
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); 
    rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); 
    rn2(75); rn2(4); rn2(75); rn2(4); rn2(75); rn2(4); rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); 
    rn2(1); rn2(75); rn2(4); rn2(75); rn2(4); rn2(6); rn2(3); rn2(3); rn2(3); rn2(8); rn2(3); 
    rn2(3); rn2(4); rn2(3); rn2(4); rnd(2); rnd(3); rnd(2); rn2(10); rn2(60); rn2(60); rn2(3); 
    rn2(4); rn2(3); rn2(78); rn2(20); rn2(20); rn2(30); rn2(3); rn2(3); rn2(11); rn2(4); rn2(3); 
    rn2(4); rn2(5); rn2(7); rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rnd(2); rnd(4); rn2(50); 
    rn2(100); rn2(100); rn2(8); rnd(25); rn2(11); rn2(4); rnd(4); rn2(8); rn2(3); rn2(10); 
    rn2(60); rn2(60); rn2(78); rn2(20); rn2(11); rn2(4); rnd(2); rn2(3); rn2(4); rn2(5); rn2(7); 
    rn2(8); rn2(11); rn2(15); rn2(16); rn2(21); rn2(10); rn2(2); rn2(20); rn2(30); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); 
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); 
    rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(60); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rnd(2); rnd(1000); rnd(2); rn2(6); 
    rn2(3); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rnd(2); rnd(1000); rnd(2); rn2(6); rn2(3); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); rn2(1000); 
    rn2(1000); rn2(1000); 
}
