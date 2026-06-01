// fastforward.js — Auto-generated RNG replay for seed8000 starter session.
// Split into pre-mklev and post-mklev phases.
// The mklev RNG calls are now consumed by the real mklev.js implementation.
//
// Generated from: seed8000-tourist-starter.session.json

import { game } from "./gstate.js";
import { rn2, rnd } from "./rng.js";

// Pre-mklev startup: o_init shuffles, dungeon init, u_init_misc
// 303 leaf RNG calls (session indices 0-308)
export function fastforward_pre_mklev(options = {}) {
    if (!options.skipOInit) {
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
    }
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
    // init_castle_tune
    rn2(7); rn2(7); rn2(7); rn2(7); rn2(7);
    // u_init_misc
    if (game.u) game.u.uhandedness = rn2(10) ? 'right' : 'left';
}

export function fastforward_pre_mklev_after_o_init() {
    fastforward_pre_mklev({ skipOInit: true });
}

// Post-mklev startup: u_init_role, ini_inv, attributes, moveloop_preamble
// 124 leaf RNG calls (regenerated from session data)
function play(calls) {
    let last = null;
    for (const call of calls) {
        if (call.f === 'rn2') last = rn2(call.b);
        else if (call.f === 'rnd') last = rnd(call.b);
    }
    return last;
}

export function fastforward_post_mklev(options = {}) {
    const calls = [
        { f: 'rnd', b: 1000 }, { f: 'rn2', b: 20 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 },
        { f: 'rn2', b: 11 }, { f: 'rn2', b: 10 }, { f: 'rn2', b: 10 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 20 }, { f: 'rn2', b: 1 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 },
        { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 },
        { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 },
        { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 },
        { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 },
        { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 },
        { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 },
        { f: 'rn2', b: 6 }, { f: 'rnd', b: 1000 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 6 },
        { f: 'rn2', b: 3 }, { f: 'rn2', b: 4 }, { f: 'rn2', b: 5 }, { f: 'rn2', b: 7 },
        { f: 'rn2', b: 8 }, { f: 'rn2', b: 11 }, { f: 'rn2', b: 15 }, { f: 'rn2', b: 16 },
        { f: 'rn2', b: 21 }, { f: 'rn2', b: 15 }, { f: 'rn2', b: 10 }, { f: 'rn2', b: 6 },
        { f: 'rn2', b: 1 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 }, { f: 'rn2', b: 2 },
        { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 }, { f: 'rn2', b: 2 }, { f: 'rn2', b: 1 },
        { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 },
        { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 4 },
        { f: 'rn2', b: 1 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 10 }, { f: 'rn2', b: 11 },
        { f: 'rn2', b: 10 }, { f: 'rn2', b: 10 }, { f: 'rn2', b: 1 }, { f: 'rnd', b: 2 },
        { f: 'rn2', b: 70 }, { f: 'rn2', b: 1 }, { f: 'rn2', b: 1 }, { f: 'rnd', b: 2 },
        { f: 'rn2', b: 1 }, { f: 'rn2', b: 25 }, { f: 'rn2', b: 25 }, { f: 'rn2', b: 25 },
        { f: 'rn2', b: 20 }, { f: 'rn2', b: 1 }, { f: 'rnd', b: 2 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 },
        { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 100 }, { f: 'rn2', b: 20 },
        { f: 'rn2', b: 20 }, { f: 'rn2', b: 20 }, { f: 'rn2', b: 7 }, { f: 'rn2', b: 20 },
        { f: 'rn2', b: 20 }, { f: 'rn2', b: 20 }, { f: 'rnd', b: 9000 }, { f: 'rnd', b: 30 },
    ];
    const played = options.skipUInitRoleInventory ? calls.slice(87) : calls;
    const last = play(played);
    if (played.at(-1)?.f === 'rnd' && played.at(-1)?.b === 30) {
        game.context = game.context || {};
        game.context.seer_turn = last;
    }
}

export function fastforward_post_mklev_after_u_init_role_inventory() {
    fastforward_post_mklev({ skipUInitRoleInventory: true });
}
