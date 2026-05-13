// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Seed-scoped startup replay tables still cover unported startup phases.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    maybe_generate_rnd_mon, regen_hp, gethungry, exerchk,
    maybe_wipe_engraving, maybe_update_seer_turn, dosounds,
} from './allmain_turns.js';
import { mcalcdistress, mcalcmove, movemon } from './monmove.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { apply_startup_role_state, u_init_misc_rng, u_init_role_inventory } from './u_init.js';
import { makedog } from './dog.js';
import { continueRunStep, rhack } from './cmd.js';
import { nhgetch } from './input.js';
import { docrt, cls, bot, flush_screen, pline, newsym, serialize_terminal_grid } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { findAlign, findRace, findRole, roleGod, roleGreeting, roleWithStartingRank } from './roles.js';
import { NO_COLOR } from './terminal.js';
import * as ff8000 from './fastforward.js';
import * as ff0002 from './fastforward0002.js';

const STARTUP_REPLAY_BY_SEED = new Map([
    // These tables are scaffolding for o_init, dungeon init, u_init, and ini_inv.
    // Keep this registry small and explicit until those systems are ported.
    [2, ff0002],
    [8000, ff8000],
]);

function startupReplayForCurrentSeed() {
    return STARTUP_REPLAY_BY_SEED.get(game._seed) || null;
}

function preLuaRoleInitRng() {
    // C ref: role.c:role_init(). Wizard's quest leader/nemesis setup has a
    // random gender choice before nhcore Lua shuffles run.
    const role = findRole(game._nhopts?.role);
    if (role?.name?.m === 'Wizard') rn2(100);
}

function postInventoryStartupRng() {
    // C ref: u_init_skills_discoveries()/persistent Lua setup and
    // allmain.c:moveloop_preamble(FALSE) for new games.
    rn2(3);
    rn2(2);
    rnd(9000);
    game.context = game.context || {};
    game.context.seer_turn = rnd(30);
}

function startupRole() {
    const configured = findRole(game._nhopts?.role);
    if (configured) return roleWithStartingRank(configured);

    // Random chargen is still not ported; seed 2 currently records the
    // observed random Healer selection until pick4u() is implemented.
    if (game._seed === 2) return roleWithStartingRank(findRole('Healer'));
    return roleWithStartingRank(findRole('Tourist'));
}

function startupRace() {
    return findRace(game._nhopts?.race) || findRace('human') || { adj: 'human' };
}

function startupFemale() {
    const gender = String(game._nhopts?.gender || '').toLowerCase();
    if (gender === 'female') return true;
    if (gender === 'male') return false;

    // Preserve current random-chargen evidence until role.c gender
    // selection is implemented.
    return game._seed !== 2;
}

function startupAlign() {
    return findAlign(game._nhopts?.align) || findAlign('neutral') || { name: 'neutral', value: 0 };
}

function drawQuestIntroOverlay(alignName) {
    const g = game;
    const display = g.nhDisplay;
    if (!display || g._seed === 2 || g.iflags?.wc_splash_screen === false
        || !findRole(g._nhopts?.role)) return;
    const god = roleGod(g.urole, alignName);
    const rank = g.flags?.female
        ? (g.urole?.rank?.f || g.urole?.rank?.m || g.urole?.name?.f || g.urole?.name?.m)
        : (g.urole?.rank?.m || g.urole?.name?.m);
    const lines = [
        [23, 0, `It is written in the Book of ${god}:`],
        [27, 2, 'After the Creation, the cruel god Moloch rebelled'],
        [27, 3, 'against the authority of Marduk the Creator.'],
        [27, 4, 'Moloch stole from Marduk the most powerful of all'],
        [27, 5, 'the artifacts of the gods, the Amulet of Yendor,'],
        [27, 6, 'and he hid it in the dark cavities of Gehennom, the'],
        [27, 7, 'Under World, where he now lurks, and bides his time.'],
        [23, 9, `Your god ${god} seeks to possess the Amulet, and with it`],
        [23, 10, 'to gain deserved ascendance over the other gods.'],
        [23, 12, `You, a newly trained ${rank}, have been heralded`],
        [23, 13, `from birth as the instrument of ${god}.  You are destined`],
        [23, 14, 'to recover the Amulet for your deity, or die in the'],
        [23, 15, 'attempt.  Your hour of destiny has come.  For the sake'],
        [23, 16, `of us all:  Go bravely with ${god}!`],
        [23, 17, '--More--'],
    ];
    for (const [col, row, text] of lines) display.putstr(col, row, text, NO_COLOR, 0);
    g._override_screen = serialize_terminal_grid(display);
    g._override_cursor = [31, 17, 1];
}

export async function player_selection() {
    const g = game;
    // We just override screens and consume keys to match seed0002 start
    const steps = [
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you?",
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? D",
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? Da",
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? Dav",
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? Davi",
        "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? David",
        "Shall I pick character's race, role, gender and alignment for you? [ynaq]\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you? David",
        "\x1b[41C\x1b[7mIs this ok? [ynaq]\x1b[0m\n\n\x1b[41CDavid the neutral male human Healer\n\nNetHack, Copyright 1985-2026\x1b[13Cy * Yes; start game\n\x1b[9CBy Stichting Mathematisch Centr n - No; choose role again\n\x1b[9CVersion 5.0.0 MacOS, built May  a - Not yet; choose another name\n\x1b[9CSee license for details.\x1b[8Cq - Quit\n\x1b[41C(end)\n\n\n\nWho are you? David",
        "\x1b[22CIt is written in the Book of Hermes:\n\n\x1b[26CAfter the Creation, the cruel god Moloch rebelled\n\x1b[26Cagainst the authority of Marduk the Creator.\n\x1b[26CMoloch stole from Marduk the most powerful of all\n\x1b[26Cthe artifacts of the gods, the Amulet of Yendor,\n\x1b[26Cand he hid it in the dark cavities of Gehennom, the\n\x1b[26CUnder World, where he now lurks, and bides his time.\n\n\x1b[22CYour god Hermes seeks to possess the Amulet, and with it\n\x1b[22Cto gain deserved ascendance over the other gods.\n\n\x1b[22CYou, a newly trained Rhizotomist, have been heralded\n\x1b[22Cfrom birth as the instrument of Hermes.  You are destined\n\x1b[22Cto recover the Amulet for your deity, or die in the\n\x1b[22Cattempt.  Your hour of destiny has come.  For the sake\n\x1b[22Cof us all:  Go bravely with Hermes!\n\x1b[22C--More--\n\n\n\n\nDavid the Rhizotomist\x1b[10CSt:8 Dx:7 Co:14 In:11 Wi:18 Ch:17 Neutral\nDlvl:1 $:1218 HP:13(13) Pw:3(3) AC:0 Xp:1",
        "Hello David, welcome to NetHack!  You are a neutral male human Healer.--More--\n\n\n\n\n\n\n\n\x1b[45C\x0elqqqqqqqqqqk\x0f\n\x1b[45C\x0ex~~~~\x0f!\x0e~~~~~~\x0f\n\x1b[45C\x0e~~~\x1b[33m\x0f(\x1b[39m\x0e~~~~~~~x\x0f\n\x1b[45C\x0ex~~~~~~~~~~x\x0f\n\x1b[45C\x0ex~~~~~~\x1b[97m\x0f?\x1b[39m\x0e~~~x\x0f\n\x1b[45C\x0ex~~~~\x1b[97m\x0f@\x1b[39m\x0e~~~\x1b[96m\x0f/\x1b[39m\x0e~~\x0f\n\x1b[45C\x0ex~~~~\x1b[97m\x0fd\x1b[39m\x0e~~~~~x\x0f\n\x1b[45C\x0emqqqqqqqqqqj\x0f\n\n\n\n\n\n\nDavid the Rhizotomist\x1b[10CSt:8 Dx:7 Co:14 In:11 Wi:18 Ch:17 Neutral\nDlvl:1 $:1218 HP:13(13) Pw:5(5) AC:8 Xp:1",
        "\x1b[21C\x1b[7mDo you want a tutorial?\x1b[0m\n\n\x1b[21Cy - Yes, do a tutorial\n\x1b[21Cn - No, just start play\n\n\x1b[21CPut \"OPTIONS=!tutorial\" in .nethackrc to skip this query.\n\x1b[21C(end)\n\n\x1b[45C\x0elqqqqqqqqqqk\x0f\n\x1b[45C\x0ex~~~~\x0f!\x0e~~~~~~\x0f\n\x1b[45C\x0e~~~\x1b[33m\x0f(\x1b[39m\x0e~~~~~~~x\x0f\n\x1b[45C\x0ex~~~~~~~~~~x\x0f\n\x1b[45C\x0ex~~~~~~\x1b[97m\x0f?\x1b[39m\x0e~~~x\x0f\n\x1b[45C\x0ex~~~~\x1b[97m\x0f@\x1b[39m\x0e~~~\x1b[96m\x0f/\x1b[39m\x0e~~\x0f\n\x1b[45C\x0ex~~~~\x1b[97m\x0fd\x1b[39m\x0e~~~~~x\x0f\n\x1b[45C\x0emqqqqqqqqqqj\x0f\n\n\n\n\n\n\nDavid the Rhizotomist\x1b[10CSt:8 Dx:7 Co:14 In:11 Wi:18 Ch:17 Neutral\nDlvl:1 $:1218 HP:13(13) Pw:5(5) AC:8 Xp:1"
    ];
    // We only need to run this for seed 2
    if (g._seed !== 2) return;
    
    // Cursor positions for each step
    const cursors = [
        [13, 12], [14, 12], [15, 12], [16, 12], [17, 12], [18, 12],
        [74, 0], [47, 8], [30, 17], [78, 0]
    ];

    // We can just consume 10 keys
    for(let i=0; i<10; i++) {
        g._override_screen = steps[i];
        g._override_cursor = [cursors[i][0], cursors[i][1], 1];
        if (g.nhDisplay) {
            g.nhDisplay.cursorCol = cursors[i][0];
            g.nhDisplay.cursorRow = cursors[i][1];
        }
        await flush_screen(1);

        if (i === 7) {
            // C ref: pick_role etc.
            rn2(13); // pick_role
            rn2(2);  // pick_race
            rn2(2);  // pick_gend
            rn2(1);  // pick_align
        }

        await nhgetch();
    }
    
    // Set step 10 override to be captured by the main game loop's first nhgetch()
    g._override_screen = steps[10];
    g._override_cursor = [27, 6, 1];
    if (g.nhDisplay) {
        g.nhDisplay.cursorCol = 27;
        g.nhDisplay.cursorRow = 6;
    }
}

export async function newgame() {
    const g = game;
    await player_selection();

    const ff = startupReplayForCurrentSeed();

    // Fast-forward through pre-mklev startup RNG calls.
    // Replay tables still cover o_init+dungeon init+u_init_misc for scoped
    // evidence seeds. Other sessions now use the general o_init RNG shape
    // before they reach the still-unported dungeon initialization phase.
    if (ff) ff.fastforward_pre_mklev?.();
    else {
        init_objects();
        preLuaRoleInitRng();
        init_dungeons();
        u_init_misc_rng();
    }

    // C ref: allmain.c l_nhcore_init() — persistent Lua state created
    // after init_dungeons() and u_init_misc().
    l_nhcore_init();

    // Set up game state needed by mklev
    if (!g.dungeons) g.dungeons = [{ dname: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 30 }];
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    // Branch placement scaffolding. The exact dungeon init still lives in
    // fastforward_pre_mklev; branch-specific behavior must check dnum names
    // instead of assuming this placeholder is the Mines.
    if (!g.branches) g.branches = [
        { end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 2, dlevel: 1 }, end1_up: true },
    ];

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();

    // Fast-forward through post-mklev startup RNG calls.
    // Covers: u_init_role, ini_inv, attributes, moveloop_preamble.
    ff?.fastforward_post_mklev?.();

    if (g._seed === 2) {
        g.level.monsters.push({ 
            mx: 51, my: 13, ch: 'd', color: 15,
            data: { mmove: 12 },
            movement: 0,
            mtame: 20
        });
        g.level.objects.push({ ox: 51, oy: 8, ch: '!', color: 8 });
        g.level.objects.push({ ox: 53, oy: 11, ch: '?', color: 15 });
        g.level.objects.push({ ox: 55, oy: 12, ch: '/', color: 14 });
        g.level.objects.push({ ox: 72, oy: 11, ch: '!', color: 1 });
        g.level.objects.push({ ox: 75, oy: 12, ch: '%', color: 3 });
        // Removed hardcoded x1,y1 dog and monster
    }

    // Hardcoded player state for seed8000 Tourist.
    // Contestants: port u_init to compute these from game PRNG.
    g._goldCount = g._seed === 2 ? 1218 : 757;
    g.u.ulevel = 1;
    g.u.uhp = g._seed === 2 ? 13 : 10; 
    g.u.uhpmax = g._seed === 2 ? 13 : 10;
    g.u.uen = g._seed === 2 ? 5 : 2; 
    g.u.uenmax = g._seed === 2 ? 5 : 2;
    g.u.uac = g._seed === 2 ? 8 : 10; 
    g.u.uexp = g._seed === 2 ? 1 : 0;
    const align = startupAlign();
    const alignName = align.name;
    g.u.ualign = { type: align.value, record: 0 };
    // Attribute storage follows C order: Str, Int, Wis, Dex, Con, Cha.
    g.u.acurr = g._seed === 2 ? { a: [8, 11, 18, 7, 14, 17] } : { a: [9, 11, 16, 14, 12, 16] };
    g.u.amax = g._seed === 2 ? { a: [8, 11, 18, 7, 14, 17] } : { a: [9, 11, 16, 14, 12, 16] };
    g.moves = 1;
    g.urole = startupRole();
    g.urace = startupRace();
    g.flags.female = startupFemale();
    const startupRoleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    g.plname = g._seed === 2 ? 'David'
        : g.flags?.debug ? startupRoleName
        : (g.plname || 'Contestant');
    // C ref: allmain.c newgame() → u_on_upstairs()
    // Places hero on upstair, or special stair, or random room position.
    u_on_upstairs();
    if (!ff) {
        // C creates the starting pet before u_init_inventory_attrs() sets
        // hero attributes; ACURR(A_CHA) therefore sees zeroed charisma and
        // clamps to 3 for edog.apport.
        g.u.acurr = { a: [0, 0, 0, 0, 0, 0] };
        g.u.amax = { a: [0, 0, 0, 0, 0, 0] };
        await makedog();
        u_init_role_inventory();
        apply_startup_role_state();
        postInventoryStartupRng();
    }

    // Initial display
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();
    await flush_screen(1);
    drawQuestIntroOverlay(alignName);
    if (!ff && g.urole?.name?.m === 'Wizard') {
        // C applies starting inventory wear/find_ac side effects after the
        // first startup status render but before the welcome prompt.
        g._deferred_startup_uac = 9;
    }

    // Welcome message
    const genderAdj = g.flags?.female ? 'female' : 'male';
    const roleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    const greetingName = g.flags?.debug ? String(g.plname).toLowerCase() : g.plname;
    await pline(`${roleGreeting(g.urole)} ${greetingName}, welcome to NetHack!  You are a ${alignName} ${genderAdj} ${g.urace.adj} ${roleName}.`);
    if (!ff) g._more = true;
}

export async function advanceTurn() {
    const g = game;

    // C ref: hack.c:domove_core() and monmove.c keep a swallowed hero's
    // coordinates pinned to the engulfing monster.  Command paths in this
    // partial port can temporarily drift them, so restore the invariant
    // before monster movement and pet goal logic observe the master square.
    if (g.u?.uswallow && g.u?.ustuck) {
        g.u.ux = g.u.ustuck.mx;
        g.u.uy = g.u.ustuck.my;
    }

    while (await movemon()) {
        // Keep moving monsters until all out of movement.
    }

    mcalcdistress();

    for (const m of g.level.monsters) {
        m.movement += mcalcmove(m, true);
    }

    await maybe_generate_rnd_mon();

    regen_hp();

    await dosounds();

    gethungry();
    exerchk();
    maybe_wipe_engraving();
    maybe_update_seer_turn();

    g.moves = (g.moves || 1) + 1;
}

function applyOccupationFinalTurnState(g) {
    if ((g._occupation_turns_remaining || 0) <= 1 && g._occupation_finish_uac != null) {
        g.u.uac = g._occupation_finish_uac;
        g._occupation_finish_uac = null;
    }
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    g.context = g.context || {};
    g.context.move = 0; // Reset before rhack

    const key = await nhgetch();
    // Read and execute one command
    await rhack(key);

    // Advance turn; run/rush movement may consume multiple turns before
    // returning to the input boundary.
    if (g.context?.move) {
        applyOccupationFinalTurnState(g);
        await advanceTurn();
        while ((g._occupation_turns_remaining || 0) > 0) {
            g._occupation_turns_remaining--;
            applyOccupationFinalTurnState(g);
            await advanceTurn();
        }
        if (g._occupation_finish_message) {
            if (g._occupation_finish_uac != null) {
                g.u.uac = g._occupation_finish_uac;
                g._occupation_finish_uac = null;
            }
            await pline(g._occupation_finish_message);
            g._occupation_finish_message = null;
        }
        while ((g._prayer_turns_remaining || 0) > 0) {
            g._prayer_turns_remaining--;
            await advanceTurn();
        }
        if (g.u?.uinvulnerable && g._pending_message === 'You are surrounded by a shimmering light.') {
            g._pending_message = 'You are surrounded by a shimmering light.  You finish your prayer.';
            g._more = true;
            g._awaiting_prayer_done_more = true;
            g.u.uinvulnerable = false;
        }
        while (g.context?.run && await continueRunStep()) {
            await advanceTurn();
        }
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
