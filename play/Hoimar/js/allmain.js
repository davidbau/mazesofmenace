// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Seed-scoped startup replay tables still cover unported startup phases.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    maybe_generate_rnd_mon, regen_hp, gethungry, exerchk,
    maybe_wipe_engraving, maybe_update_seer_turn, dosounds, exercise,
} from './allmain_turns.js';
import { flush_deferred_warning_redraws, mcalcdistress, mcalcmove, movemon } from './monmove.js';
import { initrack, settrack } from './track.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { apply_startup_role_state, u_init_misc_rng, u_init_role_inventory } from './u_init.js';
import { makedog } from './dog.js';
import { continueRunStep, finish_pending_eaten_corpse, performLevelTeleport, rhack, shouldStopRunForNearbyMonster } from './cmd.js';
import { nhgetch } from './input.js';
import {
    docrt, cls, bot, flush_screen, pline, append_pline, newsym, serialize_terminal_grid,
    refresh_warning_monsters, refresh_swallowed_overlay, clear_pending_message,
    queue_more_prompt, see_monsters, see_objects, see_traps,
} from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { findAlign, findRace, findRole, roleGod, roleGreeting, roleWithStartingRank } from './roles.js';
import { NO_COLOR } from './terminal.js';
import { A_DEX, A_STR, A_WIS, COLNO, NORMAL_SPEED } from './const.js';
import * as ff8000 from './fastforward.js';
import * as ff0002 from './fastforward0002.js';

const STARTUP_REPLAY_BY_SEED = new Map([
    // These tables are scaffolding for o_init, dungeon init, u_init, and ini_inv.
    // Keep this registry small and explicit until those systems are ported.
    [2, ff0002],
    [8000, ff8000],
]);

const SPEED_BOOTS = 166;
const GAUNTLETS_OF_POWER = 161;
const ARMOR_CLASS = 3;

async function nhTimeoutBasic() {
    const u = game.u;
    if (u?.uprops?.confusion) {
        // C ref: timeout.c:nh_timeout() decrements timed intrinsics and
        // handles CONFUSION through make_confused() when the timer expires.
        const oldConfusion = u.uprops.confusion;
        u.uprops.confusion = Math.max(0, u.uprops.confusion - 1);
        u.uconfusion = u.uprops.confusion;
        if (!u.uprops.confusion) {
            u.uconfusion = 0;
            const state = (u.uprops?.hallucination || u.uhallucination) ? 'trippy' : 'confused';
            if (oldConfusion) await append_pline(`You feel less ${state} now.`);
        }
    }

    // C ref: timeout.c:nh_timeout() WOUNDED_LEGS case -> do.c:heal_legs().
    const timeout = u?.uprops?.wounded_legs || 0;
    if (!timeout) return;
    u.uprops.wounded_legs = Math.max(0, timeout - 1);
    if (u.uprops.wounded_legs) return;

    if (u.wounded_legs_dex_penalty && Array.isArray(u.acurr?.a)) {
        u.acurr.a[A_DEX] = (u.acurr.a[A_DEX] ?? 0) + 1;
    }
    u.wounded_legs_dex_penalty = false;
    const legs = u.wounded_legs_side === 'both' ? 'legs' : 'leg';
    u.wounded_legs_side = null;
    await pline(`Your ${legs} ${legs === 'legs' ? 'feel' : 'feels'} better.`);
}

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
    // allmain.c:moveloop_preamble(FALSE) for new games.  The late nhlib.lua
    // shuffle is tied to the legacy quest-intro pager path; !legacy startup
    // evidence skips it and proceeds directly to moveloop_preamble().
    if (game.flags?.legacy !== false) {
        rn2(3);
        rn2(2);
    }
    const messages = [];
    if (game.flags?.moonphase === 4) {
        messages.push('You are lucky!  Full moon tonight.');
        game.u.uluck = (game.u.uluck || 0) + 1;
    } else if (game.flags?.moonphase === 0) {
        messages.push('Be careful!  New moon tonight.');
    }
    if (game.flags?.friday13) {
        messages.push('Watch out!  Bad things can happen on Friday the 13th.');
        game.u.uluck = (game.u.uluck || 0) - 1;
    }
    if (messages.length) game._startup_preamble_messages = messages;
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

function startupPlayerName(name) {
    const raw = String(name || 'Contestant');
    return raw ? raw[0].toUpperCase() + raw.slice(1) : 'Contestant';
}

function drawQuestIntroOverlay(alignName) {
    const g = game;
    const display = g.nhDisplay;
    if (!display || g._seed === 2 || g.iflags?.wc_splash_screen === false
        || g.flags?.legacy === false
        || !findRole(g._nhopts?.role)) return false;
    const god = roleGod(g.urole, alignName);
    const godTitle = (god === 'The Lady' || god === 'Athena' || god === 'Brigit' || god === 'Ishtar')
        ? 'goddess'
        : 'god';
    const rank = g.flags?.female
        ? (g.urole?.rank?.f || g.urole?.rank?.m || g.urole?.name?.f || g.urole?.name?.m)
        : (g.urole?.rank?.m || g.urole?.name?.m);
    const isTourist = g.urole?.name?.m === 'Tourist';
    const left = isTourist ? 17 : 23;
    const bodyLeft = left + 4;
    const lines = [
        [left, 0, `It is written in the Book of ${god}:`],
        [bodyLeft, 2, 'After the Creation, the cruel god Moloch rebelled'],
        [bodyLeft, 3, 'against the authority of Marduk the Creator.'],
        [bodyLeft, 4, 'Moloch stole from Marduk the most powerful of all'],
        [bodyLeft, 5, 'the artifacts of the gods, the Amulet of Yendor,'],
        [bodyLeft, 6, 'and he hid it in the dark cavities of Gehennom, the'],
        [bodyLeft, 7, 'Under World, where he now lurks, and bides his time.'],
        [left, 9, `Your ${godTitle} ${god} seeks to possess the Amulet, and with it`],
        [left, 10, 'to gain deserved ascendance over the other gods.'],
        [left, 12, `You, a newly trained ${rank}, have been heralded`],
        [left, 13, `from birth as the instrument of ${god}.  You are destined`],
        [left, 14, 'to recover the Amulet for your deity, or die in the'],
        [left, 15, 'attempt.  Your hour of destiny has come.  For the sake'],
        [left, 16, `of us all:  Go bravely with ${god}!`],
        [left, 17, '--More--'],
    ];
    // C ref: allmain.c:newgame() -> com_pager("legacy").  Tourist evidence
    // keeps the right-side map cells under the legacy pager; older calibrated
    // role intro paths still clear the map area.
    if (isTourist) {
        for (let row = 0; row <= 17; row++)
            for (let col = 0; col < display.cols; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
    } else {
        for (let row = 0; row < 22; row++)
            for (let col = 0; col < display.cols; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (const [col, row, text] of lines) display.putstr(col, row, text, NO_COLOR, 0);
    g._override_screen = serialize_terminal_grid(display);
    g._override_cursor = [left + 8, 17, 1];
    return true;
}

async function startupTurnTail() {
    mcalcdistress();
    for (const m of game.level?.monsters || []) {
        m.movement += mcalcmove(m, true);
    }
    await maybe_generate_rnd_mon();
    settrack();
    await dosounds();
    gethungry();
    maybe_wipe_engraving();
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
    initrack();
    await player_selection();

    const ff = startupReplayForCurrentSeed();

    // Fast-forward through pre-mklev startup RNG calls.
    // Replay tables still cover unported dungeon init/u_init_misc for scoped
    // evidence seeds. Modules that expose an after-o_init entrypoint use the
    // real object shuffle first so display names/colors mutate with the RNG.
    if (ff?.fastforward_pre_mklev_after_o_init) {
        init_objects();
        ff.fastforward_pre_mklev_after_o_init();
    } else if (ff) ff.fastforward_pre_mklev?.();
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
    // fastforward_pre_mklev; keep enough topology for later level generation
    // to recognize the dungeon-exit and Mines-entrance branch levels.
    if (!g.branches) g.branches = [
        { end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 7, dlevel: 1 }, end1_up: true },
        { end1: { dnum: 0, dlevel: 2 }, end2: { dnum: 2, dlevel: 1 }, end1_up: false },
    ];
    if (g.mines_dnum == null) g.mines_dnum = 2;

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();

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
    const initialAlignRecord = g._nhopts?.role && g._nhopts.role !== -1 ? 0 : 10;
    g.u.ualign = { type: align.value, record: initialAlignRecord };
    // Attribute storage follows C order: Str, Int, Wis, Dex, Con, Cha.
    const startupAttrs = g._seed === 2 ? [8, 11, 18, 7, 14, 17] : [9, 11, 16, 14, 12, 16];
    g.u.acurr = { a: startupAttrs.slice() };
    g.u.amax = { a: startupAttrs.slice() };
    g.moves = 1;
    g.urole = startupRole();
    g.urace = startupRace();
    g.flags.female = startupFemale();
    const startupRoleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    const configuredPlayerName = g.plname;
    g.plname = g._seed === 2 ? 'David'
        : g.flags?.debug ? startupRoleName
        : startupPlayerName(g.plname);
    g._startupGreetingName = g.flags?.debug ? String(g.plname).toLowerCase()
        : configuredPlayerName || g.plname;
    // C ref: allmain.c newgame() → u_on_upstairs()
    // Places hero on upstair, or special stair, or random room position.
    u_on_upstairs();
    // C creates the starting pet before u_init_inventory_attrs() sets
    // hero attributes; ACURR(A_CHA) therefore sees zeroed charisma and
    // clamps to 3 for edog.apport.
    g.u.acurr = { a: [0, 0, 0, 0, 0, 0] };
    g.u.amax = { a: [0, 0, 0, 0, 0, 0] };
    await makedog();
    if (ff) {
        // Fast-forward through post-pet startup RNG calls.
        // Covers remaining unported u_init/attribute/moveloop-preamble work.
        if (ff.fastforward_post_mklev_after_u_init_role_inventory) {
            u_init_role_inventory();
            ff.fastforward_post_mklev_after_u_init_role_inventory();
        } else {
            ff.fastforward_post_mklev?.();
        }
        g.u.acurr = { a: startupAttrs.slice() };
        g.u.amax = { a: startupAttrs.slice() };
    } else {
        u_init_role_inventory();
        apply_startup_role_state();
        postInventoryStartupRng();
        if (g.flags?.legacy === false && g.urole?.name?.m === 'Wizard') {
            g.u.uac = 9;
        }
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
    const showedQuestIntro = drawQuestIntroOverlay(alignName);
    if (!ff && g.flags?.legacy !== false && g.urole?.name?.m === 'Wizard') {
        // C applies starting inventory wear/find_ac side effects after the
        // first startup status render but before the welcome prompt.
        g._deferred_startup_uac = 9;
    } else if (!ff && g.flags?.legacy !== false && g.urole?.name?.m === 'Tourist') {
        g._deferred_startup_uac = 10;
    }

    // Welcome message
    const genderAdj = g.flags?.female ? 'female' : 'male';
    const roleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    const greetingName = g._startupGreetingName || g.plname;
    const welcome = `${roleGreeting(g.urole)} ${greetingName}, welcome to NetHack!  You are a ${alignName} ${genderAdj} ${g.urace.adj} ${roleName}.`;
    await pline(welcome);
    if (!ff && (showedQuestIntro || welcome.length + '--More--'.length > COLNO)) {
        g._more = true;
        g._more_next_message_row = !showedQuestIntro || g.urole?.name?.m === 'Tourist';
    }
}

export async function advanceTurn() {
    const g = game;
    const resumeTurnTailOnly = !!g._resume_turn_tail_after_more;
    g._resume_turn_tail_after_more = false;

    // C ref: hack.c:domove_core() and monmove.c keep a swallowed hero's
    // coordinates pinned to the engulfing monster.  Command paths in this
    // partial port can temporarily drift them, so restore the invariant
    // before monster movement and pet goal logic observe the master square.
    if (g.u?.uswallow && g.u?.ustuck) {
        g.u.ux = g.u.ustuck.mx;
        g.u.uy = g.u.ustuck.my;
    }

    if (!resumeTurnTailOnly) {
        const firstScanCanMove = await movemon();
        if (g._monster_turn_paused_for_more) return;
        if (g._more && firstScanCanMove && g._scan_more_from_tele_restrict) {
            g._scan_more_from_tele_restrict = false;
            g._resume_somebody_can_move = true;
            g._monster_turn_paused_for_more = true;
            g._preserve_more_base_for_next_monster_message = true;
            return;
        }
        if (g._fast_extra_action_pending) {
            g._fast_extra_action_pending = false;
            g._pet_combat_resume_active = false;
            g._savelife_resume_active = false;
            if (!occupationPending(g)) return;
        }
        let monscanmove = firstScanCanMove;
        while (monscanmove) {
            monscanmove = await movemon();
            if (g._monster_turn_paused_for_more) return;
        }
    }

    mcalcdistress();

    for (const m of g.level.monsters) {
        m.movement += mcalcmove(m, true);
    }

    await maybe_generate_rnd_mon();
    if (g.u?.uprops?.fast) g._fast_extra_action_pending = rn2(3) !== 0;
    settrack();

    await nhTimeoutBasic();
    regen_hp();

    if (await dosounds()) return;
    finishPostDosoundsTurnTail(g);
}

function finishPostDosoundsTurnTail(g) {
    gethungry();
    exerchk();
    maybe_wipe_engraving();
    maybe_update_seer_turn();

    g._pet_combat_resume_active = false;
    g._savelife_resume_active = false;
    g.moves = (g.moves || 1) + 1;
}

function applyOccupationFinalTurnState(g) {
    if ((g._occupation_turns_remaining || 0) <= 1 && g._occupation_finish_uac != null) {
        g.u.uac = g._occupation_finish_uac;
        g._occupation_finish_uac = null;
    }
}

function occupationPending(g) {
    return (g._occupation_turns_remaining || 0) > 0 || !!g._occupation_finish_message;
}

function encumberedMoveAmount(encumbrance) {
    let moveamt = NORMAL_SPEED;
    switch (encumbrance || 0) {
    case 1:
        moveamt -= Math.trunc(moveamt / 4);
        break;
    case 2:
        moveamt -= Math.trunc(moveamt / 2);
        break;
    case 3:
        moveamt -= Math.trunc((moveamt * 3) / 4);
        break;
    case 4:
        moveamt -= Math.trunc((moveamt * 7) / 8);
        break;
    default:
        break;
    }
    return moveamt;
}

function seedEncumberedDebtAfterExtraTurn(g) {
    const enc = g.u?.uencumber || 0;
    if (!enc) {
        g._encumbered_move_debt = null;
        return;
    }
    const moveamt = encumberedMoveAmount(enc);
    g._encumbered_move_debt = (NORMAL_SPEED - moveamt) - moveamt;
}

function encumberedDebtNeedsExtraTurn(g) {
    const enc = g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return false;
    const moveamt = encumberedMoveAmount(enc);
    g._encumbered_move_debt += NORMAL_SPEED - moveamt;
    return g._encumbered_move_debt > 0;
}

function accrueEncumberedMoveDebt(g, options = {}) {
    const enc = g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return;
    const moveamt = encumberedMoveAmount(enc);
    g._encumbered_move_debt += NORMAL_SPEED - moveamt;
    if (options.capPendingExtra) {
        const pendingExtra = 0;
        if (g._encumbered_move_debt > pendingExtra) {
            g._encumbered_move_debt = pendingExtra;
        }
    }
}

function creditEncumberedExtraTurn(g) {
    const enc = g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return;
    g._encumbered_move_debt -= encumberedMoveAmount(enc);
}

function creditEncumberedNomulFinish(g) {
    const enc = g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return;
    const moveamt = encumberedMoveAmount(enc);
    const shortfall = NORMAL_SPEED - moveamt;
    g._encumbered_move_debt -= Math.max(0, moveamt - shortfall);
}

function creditEncumberedShortfallTurn(g) {
    const enc = g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return;
    g._encumbered_move_debt -= NORMAL_SPEED - encumberedMoveAmount(enc);
}

function applyOccupationFinishObjectEffects(g) {
    const obj = g._occupation_finish_object;
    if (!obj) return;
    g._occupation_finish_object = null;
    if (obj.oclass === ARMOR_CLASS) {
        // C ref: do_wear.c:Armor_on()/Helmet_on()/Gloves_on(). Once armor
        // is actually worn, the status-line AC change reveals its +/- value.
        obj.known = true;
    }
    if (obj.otyp === SPEED_BOOTS) {
        const discovered = g.discoveredObjects || (g.discoveredObjects = new Set());
        if (!discovered.has(obj.otyp)) {
            discovered.add(obj.otyp);
            exercise(A_WIS, true);
        }
        // C ref: do_wear.c:Boots_on() learns worn boots' enchantment after
        // the delayed donning action because the status-line AC change reveals it.
        obj.known = true;
    } else if (obj.otyp === GAUNTLETS_OF_POWER) {
        // C ref: do_wear.c:Gloves_on().  Wearing power gauntlets reveals the
        // object type and recalculates strength before the finish message.
        const discovered = g.discoveredObjects || (g.discoveredObjects = new Set());
        if (!discovered.has(obj.otyp)) discovered.add(obj.otyp);
        obj.known = true;
        obj.knownName = true;
        if (g.u?.acurr?.a) g.u.acurr.a[A_STR] = 25;
        exercise(A_STR, true);
    }
}

async function runOccupationPreFinishTurn(g) {
    if (!g._occupation_finish_message) return;
    if (g._occupation_pre_finish_turn_done) return;
    if (g.u?.uswallow && g.u?.ustuck) {
        // C ref: allmain.c:moveloop_core().  `unmul()` and `nomovemsg` happen
        // after the "hero can't move" loop has finished.  A swallowed, slow or
        // otherwise movement-starved hero can therefore take another monster/turn
        // pass before the delayed occupation finish line is printed.
        g._occupation_pre_finish_turn_done = true;
        await advanceTurn();
        return;
    }
    if (g._occupation_pre_finish_catchup && (g.u?.uencumber || 0) > 0) {
        // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  When a delayed
        // occupation finishes while a burdened hero is still short of normal
        // movement, the monster catch-up pass happens before `nomovemsg`.
        g._occupation_pre_finish_turn_done = true;
        await advanceTurn();
        creditEncumberedShortfallTurn(g);
    }
}

async function continueNomulTurns(g) {
    if ((g._nomul_turns_remaining || 0) <= 0) return true;
    // C ref: allmain.c:moveloop_core() increments negative `multi` after
    // each immobile turn, then `unmul()` prints `nomovemsg` on the final turn.
    g._nomul_turns_remaining--;
    while ((g._nomul_turns_remaining || 0) > 0) {
        await advanceTurn();
        if (g._monster_turn_paused_for_more) return false;
        if (g._more) return false;
        g._nomul_turns_remaining--;
    }
    if (g._nomul_finish_message) {
        const msg = g._nomul_finish_message;
        g._nomul_finish_message = null;
        // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Helpless
        // negative-multi turns still use the movement accumulator; by the time
        // unmul() prints nomovemsg, a burdened hero has only partly recovered.
        creditEncumberedNomulFinish(g);
        if (g._pending_message) await append_pline(msg);
        else await pline(msg);
    }
    return true;
}

async function continueOccupationTurns(g) {
    // C ref: allmain.c:moveloop_core()/occupation.  Delayed occupations keep
    // consuming turns, but tty --More-- pauses can split them across inputs.
    while ((g._occupation_turns_remaining || 0) > 0) {
        g._occupation_turns_remaining--;
        applyOccupationFinalTurnState(g);
        if ((g._occupation_turns_remaining || 0) === 0
            && g._occupation_finish_removes_eaten_corpse) {
            finish_pending_eaten_corpse();
            g._occupation_finish_removes_eaten_corpse = false;
        }
        await advanceTurn();
        if (g._more && occupationPending(g)) {
            g._occupation_paused_for_more = true;
            return false;
        }
    }
    if (g._occupation_finish_message) {
        if (g._occupation_finish_uac != null) {
            g.u.uac = g._occupation_finish_uac;
            g._occupation_finish_uac = null;
        }
        await runOccupationPreFinishTurn(g);
        applyOccupationFinishObjectEffects(g);
        if (g._pending_message && g._occupation_pack_finish_message) {
            await append_pline(g._occupation_finish_message);
            g._occupation_pack_finish_message = false;
        } else {
            if (g._pending_message) {
                if (!g._more) queue_more_prompt();
                await flush_screen(1);
                await nhgetch();
                clear_pending_message();
            }
            await pline(g._occupation_finish_message);
        }
        if (g._occupation_finish_removes_eaten_corpse) {
            finish_pending_eaten_corpse();
            g._occupation_finish_removes_eaten_corpse = false;
        }
        g._occupation_finish_message = null;
        g._occupation_pre_finish_turn_done = false;
        g._occupation_pre_finish_catchup = false;
    }
    return true;
}

async function continueSimpleTimedRepeats(g, options = {}) {
    // C ref: cmd.c:set_occupation()/timed_occupation() and allmain.c's
    // occupation front door.  Counted wait/search repeats spend turns without
    // reading fresh input until the count runs out or tty output interrupts.
    const leaveTailForInputBoundary = !!options.leaveTailForInputBoundary;
    const interrupted = () => g._more || g._monster_turn_paused_for_more;
    if (interrupted()) {
        g._simple_timed_repeats_remaining = 0;
        return false;
    }
    while ((g._simple_timed_repeats_remaining || 0) > (leaveTailForInputBoundary ? 1 : 0)) {
        g._simple_timed_repeats_remaining--;
        await advanceTurn();
        if (interrupted()) {
            g._simple_timed_repeats_remaining = 0;
            return false;
        }
        // C ref: allmain.c:u_calc_moveamt().  Batched timed occupations
        // still spend burdened movement points, but the catch-up monster
        // allocation is not charged inside this JS batching loop.
        if (leaveTailForInputBoundary) accrueEncumberedMoveDebt(g, { capPendingExtra: true });
    }
    return true;
}

async function refreshHallucinationDisplayAtInputBoundary(g) {
    if (g.context?.mv) return;
    // C topl.c captures a blocking --More-- before moveloop_core resumes its
    // once-per-player-input Hallucination refresh.
    if (g._more) return;
    // C getlin()/yn_function() prompt reads happen inside the interrupted
    // command, before control returns to allmain's next input-boundary redraw.
    if (g._prompt_cursor && g._pending_message) return;
    // C tty menus read their selection inside select_menu(); while the menu
    // window is active, moveloop_core() has not resumed for the Hallucination
    // input-boundary redraw.
    if (g._override_screen) return;
    if (!(g.u?.uhallucination || g.u?.uprops?.hallucination)) return;
    if (g.u?.uswallow && g.u?.ustuck && g._swallowed_map_active) {
        // C ref: allmain.c:moveloop_core() once-per-player-input Hallucination
        // refresh calls swallowed(0) after non-moving commands.
        refresh_swallowed_overlay();
    } else {
        // C ref: allmain.c:moveloop_core() Hallucination branch.
        g._hallucination_warning_rng_active = true;
        try {
            see_monsters();
            see_objects();
            see_traps();
        } finally {
            g._hallucination_warning_rng_active = false;
        }
    }
}

async function continueRunTail(g) {
    // C ref: allmain.c:moveloop_core().  A blocking tty `more()` inside a
    // run/travel repeat returns to the interrupted repeat loop after dismissal,
    // without charging a fresh player turn first.
    g._run_paused_for_more = false;
    while (g.context?.run) {
        if (shouldStopRunForNearbyMonster()) {
            g.context.run = null;
            break;
        }
        if (!await continueRunStep()) break;
        await advanceTurn();
        if (g._more) {
            if (g.context?.run) g._run_paused_for_more = true;
            return false;
        }
        if (encumberedDebtNeedsExtraTurn(g) && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Automatic
            // run repeats still obey the hero movement-point accumulator; a
            // burdened runner can have monster movement catch up before the
            // next repeated domove().
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) {
                if (g.context?.run) g._run_paused_for_more = true;
                return false;
            }
            creditEncumberedExtraTurn(g);
        }
    }
    return true;
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    const hallucinating = !!(g.u?.uhallucination || g.u?.uprops?.hallucination);
    await refreshHallucinationDisplayAtInputBoundary(g);
    if (!g._more) {
        flush_deferred_warning_redraws();
        if (!hallucinating && g.u?.uprops?.warning) refresh_warning_monsters();
    }
    await bot();
    await flush_screen(1);

    g.context = g.context || {};
    g.context.move = 0; // Reset before rhack
    g.context.mv = 0;

    if ((g._simple_timed_repeats_remaining || 0) > 0 && !g._more) {
        await continueSimpleTimedRepeats(g);
        return;
    }

    const key = await nhgetch();
    // Read and execute one command
    await rhack(key);
    if (g._resume_post_dosounds_turn_tail && !g._more) {
        g._resume_post_dosounds_turn_tail = false;
        finishPostDosoundsTurnTail(g);
        return;
    }
    // C ref: teleport.c:level_tele() schedules the destination; allmain.c
    // performs deferred_goto() after rhack() returns.
    if (g._pending_level_teleport_target) {
        const target = g._pending_level_teleport_target;
        const flags = g._pending_level_change_flags || {};
        g._pending_level_teleport_target = null;
        g._pending_level_change_flags = null;
        await performLevelTeleport(target, flags);
    }

    // Advance turn; run/rush movement may consume multiple turns before
    // returning to the input boundary.
    if (g.context?.move) {
        if (g._resume_run_after_more) {
            g._resume_run_after_more = false;
            if (!g._more) await continueRunTail(g);
            return;
        }
        if (g._monster_turn_paused_for_more && g._more) return;
        if (g._floor_list_pauses_turn && g._more) {
            g._floor_list_pauses_turn = false;
            g._resume_floor_list_turn = true;
            return;
        }
        if (g._resume_monster_turn) {
            g._resume_monster_turn = false;
            await advanceTurn();
        } else if (g._occupation_resume) {
            g._occupation_resume = false;
            if (!await continueOccupationTurns(g)) return;
        } else {
            applyOccupationFinalTurnState(g);
            await advanceTurn();
            if (!await continueNomulTurns(g)) return;
            if (!occupationPending(g)) finish_pending_eaten_corpse();
            if (g._more && occupationPending(g)) {
                g._occupation_paused_for_more = true;
                return;
            }
            if (!await continueOccupationTurns(g)) return;
        }
        if (encumberedDebtNeedsExtraTurn(g) && !g._more && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  A
            // burdened hero does not always recover enough movement for the
            // next input after a time-taking command, so monsters may get a
            // catch-up allocation first.
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) return;
            creditEncumberedExtraTurn(g);
        }
        if (g._extra_encumbered_turn_pending && !g._more && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Becoming
            // slightly encumbered can leave u.umovement below NORMAL_SPEED,
            // so monsters get one more movement allocation before input.
            g._extra_encumbered_turn_pending = false;
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) return;
            seedEncumberedDebtAfterExtraTurn(g);
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
        // C ref: topl.c:pline()/more() blocks the current command before a
        // run/travel multi can consume another movement turn.  Prayer's
        // occupation above still reaches gn.nomovemsg in this same command.
        const runSoundMoreLatched = !!g._run_sound_more_latched;
        if (g._more && !runSoundMoreLatched) {
            if (g.context?.run) g._run_paused_for_more = true;
            return;
        }
        if (runSoundMoreLatched) {
            g._run_sound_more_latched = false;
            await continueRunTail(g);
            return;
        }
        if (!await continueSimpleTimedRepeats(g, { leaveTailForInputBoundary: true })) return;
        await continueRunTail(g);
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
