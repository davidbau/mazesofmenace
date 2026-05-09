// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.

import { game } from './gstate.js';
import { rn2 } from './rng.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { fastforward_pre_mklev, fastforward_post_mklev, fastforward_step, fastforward_fill_mineralize } from './fastforward.js';
import { init_objects } from './o_init.js';
import { init_dungeons, init_castle_tune, u_init_misc } from './dungeon_init.js';
import { role_init_extra, roleNameToIdx, ROLE_WIZ } from './role_init.js';
import { rnd } from './rng.js';

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // Determine if character is fully specified in OPTIONS (no chargen RNG needed).
    // When role/race/gender/align are all set, tty_player_selection() skips rn2 calls.
    const iRole = roleNameToIdx(g.initRole);
    const isFullySpecified = (g.initRole !== undefined && g.initRole !== -1)
        && (g.initRace !== undefined && g.initRace !== -1)
        && (g.initGender !== undefined && g.initGender !== -1)
        && (g.initAlign !== undefined && g.initAlign !== -1);

    const wizard = !!(g.flags && g.flags.debug);

    if (isFullySpecified) {
        // Real pre-mklev init sequence (matches C for any fully-specified character).
        // C ref: allmain.c newgame() init order:
        //   init_objects() → role_init() extras → init_dungeons() (includes first Lua shuffle)
        //   → init_castle_tune() → [newpw for Wizard] → u_init_misc() → l_nhcore_init()
        init_objects();
        role_init_extra(iRole);

        // newpw() calls rnd(urole.enadv.inrnd) if inrnd > 0, then rnd(urace.enadv.inrnd) if > 0.
        // All race inrnd values are 0, so only the role matters.
        // C ref: exper.c newpw() called from u_init() at ulevel==0.
        // Role enadv.inrnd values (from role.c): Arc=0, Bar=0, Cav=0, Hea=4, Kni=4,
        //   Mon=2, Pri=3, Rog=0, Ran=0, Sam=0, Tou=0, Val=0, Wiz=3.
        const ROLE_ENADV_INRND = [0, 0, 0, 4, 4, 2, 3, 0, 0, 0, 0, 0, 3];
        const newpwInrnd = ROLE_ENADV_INRND[iRole] ?? 0;
        init_dungeons(wizard);
        init_castle_tune();
        if (newpwInrnd > 0) rnd(newpwInrnd);
        u_init_misc();
    } else {
        // Chargen RNG not yet implemented — fall back to fastforward (seed8000 only).
        fastforward_pre_mklev();
    }

    // C ref: allmain.c l_nhcore_init() — second Lua shuffle (nhcore.lua)
    l_nhcore_init();

    // Set up game state needed by mklev
    g.dungeons = [{ dname: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 30 }];
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    // Branch: Mines entrance on level 1 (for seed 8000)
    g.branches = [
        { end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 2, dlevel: 1 }, end1_up: true },
    ];

    // Real mklev generates the level with correct room positions
    await mklev();

    // Fill rooms + mineralize (fastforward — seed8000 only for now)
    fastforward_fill_mineralize();

    // Post-mklev startup (fastforward — seed8000 only for now)
    fastforward_post_mklev();

    // Hardcoded player state for seed8000 Tourist.
    g._goldCount = 757;
    g.u.ulevel = 1;
    g.u.uhp = 10; g.u.uhpmax = 10;
    g.u.uen = 2; g.u.uenmax = 2;
    g.u.uac = 10; g.u.uexp = 0;
    g.u.ualign = { type: 0, record: 0 };
    g.u.uleft = true;
    g.u.acurr = { a: [9, 14, 12, 11, 16, 16] };
    g.u.amax = { a: [9, 14, 12, 11, 16, 16] };
    g.moves = 1;
    g.urole = { name: { m: 'Tourist', f: 'Tourist' }, rank: { m: 'Rambler', f: 'Rambler' } };
    g.urace = { adj: 'human' };
    g.flags.female = true;
    g.plname = g.plname || 'Contestant';

    // C ref: allmain.c newgame() → u_on_upstairs()
    u_on_upstairs();

    // Initial display
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // Welcome message
    const alignName = 'neutral';
    const genderAdj = g.flags?.female ? 'female' : 'male';
    await pline(`Aloha ${g.plname}, welcome to NetHack!  You are a ${alignName} ${genderAdj} human ${g.urole.name.m}.`);
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // Fast-forward per-step RNG (monster movement, regen, sounds, hunger)
    const stepNum = (g.moves || 1) - 1;
    fastforward_step(stepNum);

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // Read and execute one command
    await rhack(0);

    // Clear message after command is processed
    g._pending_message = '';

    // Advance turn
    if (g.context?.move) {
        g.moves = (g.moves || 1) + 1;
    }
}

// C ref: allmain.c moveloop()
export async function moveloop(resuming) {
    vision_recalc(0);
    await docrt();
    await flush_screen(1);

    for (;;) {
        await moveloop_core();
        if (game.program_state?.gameover) break;
    }
}
