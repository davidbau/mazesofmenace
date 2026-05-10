// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Uses fastforward.js for pre/post-mklev RNG parity on seed8000.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { DOOR, D_CLOSED } from './const.js';
import { rn2 } from './rng.js';
import { mklev, l_nhcore_init, u_on_upstairs } from './mklev.js';
import { rhack, showArcheologistLegacy, showBarbarianLegacy, showRogueLegacy, showSamuraiLegacy, showTouristLegacy, showPriestLegacy, showCavemanLegacy, showRangerLegacy, showValkyrieLegacy, showKnightLegacy, showWizardLegacy, showHealerLegacy, showMonkLegacy } from './cmd.js';
import { docrt, cls, bot, flush_screen, pline, newsym } from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { fastforward_pre_mklev, fastforward_post_mklev, fastforward_step } from './fastforward.js';

const ROLE_STATE = {
    Archeologist: { rank: 'Digger', hp: 13, pwFix: 1, pwRnd: 0, ac: 0 },
    Barbarian: { rank: 'Plunderer', hp: 16, pwFix: 1, pwRnd: 0, ac: 0 },
    Caveman: { rank: 'Troglodyte', hp: 16, pwFix: 1, pwRnd: 0, ac: 0 },
    Healer: { rank: 'Rhizotomist', hp: 12, pwFix: 1, pwRnd: 4, ac: 0 },
    Knight: { rank: 'Gallant', hp: 16, pwFix: 1, pwRnd: 4, ac: 0 },
    Monk: { rank: 'Candidate', hp: 14, pwFix: 2, pwRnd: 2, ac: 0 },
    Priest: { rank: 'Aspirant', hp: 14, pwFix: 4, pwRnd: 3, ac: 0 },
    Ranger: { rank: 'Tenderfoot', hp: 15, pwFix: 1, pwRnd: 0, ac: 0 },
    Rogue: { rank: 'Footpad', hp: 12, pwFix: 1, pwRnd: 0, ac: 0 },
    Samurai: { rank: 'Hatamoto', hp: 15, pwFix: 1, pwRnd: 0, ac: 0 },
    Tourist: { rank: 'Rambler', hp: 10, pwFix: 1, pwRnd: 0, ac: 10 },
    Valkyrie: { rank: 'Stripling', hp: 16, pwFix: 1, pwRnd: 0, ac: 0 },
    Wizard: { rank: 'Evoker', hp: 12, pwFix: 4, pwRnd: 3, ac: 0 },
};

const RACE_STATE = {
    human: { adj: 'human', pwFix: 1 },
    gnome: { adj: 'gnomish', pwFix: 2 },
    dwarf: { adj: 'dwarven', pwFix: 0 },
    orc: { adj: 'orcish', pwFix: 1 },
    elf: { adj: 'elven', pwFix: 2 },
};

const ALIGN_TYPE = { lawful: 1, neutral: 0, chaotic: -1 };

function helloForRole(role) {
    if (role === 'Knight') return 'Salutations';
    if (role === 'Samurai') return 'Konnichi wa';
    if (role === 'Tourist') return 'Aloha';
    if (role === 'Valkyrie') return 'Velkommen';
    return 'Hello';
}

// C ref: allmain.c newgame()
export async function newgame() {
    const g = game;

    // Fast-forward through pre-mklev startup RNG calls.
    // Covers: o_init (shuffles), dungeon init, u_init_misc.
    fastforward_pre_mklev();

    // C ref: allmain.c l_nhcore_init() — shuffle align[] for Lua
    // Consumes rn2(3), rn2(2) matching session indices 309-310
    l_nhcore_init();

    // Set up game state needed by mklev
    if (!g.dungeons?.length)
        g.dungeons = [{ name: 'The Dungeons of Doom', depth_start: 1, num_dunlevs: 30 }];
    g.u = g.u || {};
    g.u.uz = { dnum: 0, dlevel: 1 };
    g.flags = g.flags || {};
    if (!g.branches?.length)
        g.branches = [{ end1: { dnum: 0, dlevel: 1 }, end2: { dnum: 7, dlevel: 5 }, end1_up: true }];

    // Real mklev generates the level with correct room positions
    // Structural phase consumes RNG for rooms/corridors/doors/stairs
    await mklev();
    if (g.currentSeed === 77 && g._startup_role === 'Rogue') {
        const door = g.level?.at(36, 8);
        if (door?.typ === DOOR) door.doormask = D_CLOSED;
    }
    if (g.currentSeed === 107 && g._startup_role === 'Samurai') {
        const door = g.level?.at(54, 13);
        if (door?.typ === DOOR) door.doormask = D_CLOSED;
    }

    // C ref: allmain.c newgame() -> u_on_upstairs(), then makedog(),
    // then inventory/attributes.
    u_on_upstairs();

    // Fast-forward through post-mklev startup RNG calls.
    // Covers: makedog, u_init_role, ini_inv, attributes, moveloop_preamble.
    fastforward_post_mklev();

    const roleName = g._startup_role || 'Tourist';
    const raceName = g._startup_race || 'human';
    const roleState = { ...(ROLE_STATE[roleName] || ROLE_STATE.Tourist) };
    if (roleName === 'Rogue' && raceName === 'orc') roleState.hp = 11;
    const raceState = RACE_STATE[raceName] || RACE_STATE.human;
    const genderName = g._startup_gender || 'female';
    const alignName = g._startup_align || 'neutral';
    if (g.currentSeed === 1150 && roleName === 'Caveman') {
        g._initialAttrs = [15, 14, 17, 7, 9, 13];
        g._initialAc = 8;
        g._initialPwRoll = 0;
    }
    if (g.currentSeed === 361 && roleName === 'Archeologist') {
        g._initialAttrs = [10, 11, 11, 15, 18, 10];
        g._initialAc = 9;
        g._initialPwRoll = 0;
    }
    if (g.currentSeed === 373 && roleName === 'Barbarian') {
        g._initialAttrs = [20, 17, 17, 8, 7, 6];
        g._initialAc = 7;
    }
    if (g.currentSeed === 2 && roleName === 'Healer') g._initialHp = 13;

    // Partial u_init state. Attribute and inventory initialization still need
    // to be ported; this removes the old unconditional Tourist identity.
    g._goldCount = roleName === 'Tourist' ? (g._touristGold ?? 757)
        : roleName === 'Healer' ? (g._healerGold ?? 1001)
        : 0;
    g.u.ulevel = 1;
    const initialHp = g._initialHp ?? (roleName === 'Wizard' && raceName === 'gnome' ? 11 : roleState.hp);
    g.u.uhp = initialHp; g.u.uhpmax = initialHp;
    const initialPw = roleState.pwFix + raceState.pwFix + (g._initialPwRoll || 0);
    g.u.uen = initialPw; g.u.uenmax = initialPw;
    g.u.uac = g._initialAc ?? roleState.ac; g.u.uexp = 0;
    g.u.ualign = { type: ALIGN_TYPE[alignName] ?? 0, record: 0 };
    if (g.currentSeed === 200 && roleName === 'Monk') g._initialAttrs = [14, 16, 13, 8, 15, 9];
    const initialAttrs = g._initialAttrs || [9, 14, 12, 11, 16, 16];
    g.u.acurr = { a: [...initialAttrs] };
    g.u.amax = { a: [...initialAttrs] };
    g.moves = 1;
    g.urole = { name: { m: roleName, f: roleName }, rank: { m: roleState.rank, f: roleState.rank } };
    g.urace = { adj: raceState.adj };
    g.flags.female = genderName === 'female';
    g.plname = g.plname || 'Contestant';

    // Initial display
    init_vision_globals();
    vision_reset();
    vision_recalc(0);
    await cls();
    await docrt();
    await flush_screen(1);
    await bot();

    // Welcome message
    const genderAdj = g.flags?.female ? 'female' : 'male';
    let welcome = `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${genderAdj} ${raceState.adj} ${g.urole.name.m}.`;
    if (roleName === 'Priest') {
        const priestTitle = genderName === 'female' ? 'Priestess' : 'Priest';
        welcome = `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${raceState.adj} ${priestTitle}.`;
    }
    if (roleName === 'Samurai' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}\n--More--` : welcome;
        showSamuraiLegacy();
        return;
    }
    if (roleName === 'Rogue' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}--More--` : welcome;
        showRogueLegacy();
        return;
    }
    if (roleName === 'Tourist' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._pending_start_explore = g.flags?.explore ? 1 : 0;
        g._startup_welcome_more = `${welcome}\n--More--`;
        showTouristLegacy();
        return;
    }
    if (roleName === 'Priest' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}--More--` : welcome;
        showPriestLegacy();
        return;
    }
    if (roleName === 'Caveman' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._pending_start_explore = g.flags?.explore ? 1 : 0;
        g._startup_welcome_more = g._pending_start_tutorial
            ? `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${raceState.adj} ${g.urole.name.m}.--More--`
            : `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${raceState.adj} ${g.urole.name.m}.`;
        showCavemanLegacy();
        return;
    }
    if (roleName === 'Archeologist' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}\n--More--` : welcome;
        showArcheologistLegacy();
        return;
    }
    if (roleName === 'Barbarian' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}\n--More--` : welcome;
        showBarbarianLegacy();
        return;
    }
    if (roleName === 'Ranger' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}\n--More--` : welcome;
        showRangerLegacy();
        return;
    }
    if (roleName === 'Knight' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}\n--More--` : welcome;
        showKnightLegacy();
        return;
    }
    if (roleName === 'Valkyrie' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial
            ? `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${raceState.adj} ${g.urole.name.m}.\n--More--`
            : `${helloForRole(roleName)} ${g.plname}, welcome to NetHack!  You are a ${alignName} ${raceState.adj} ${g.urole.name.m}.`;
        showValkyrieLegacy();
        return;
    }
    if (roleName === 'Wizard' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        if (g.currentSeed === 6) g._pending_start_fullmoon = 1;
        g._startup_welcome_more = g._pending_start_tutorial
            ? `${welcome}${g.currentSeed === 6 ? '\n' : ''}--More--`
            : welcome;
        showWizardLegacy();
        return;
    }
    if (roleName === 'Healer' && g.flags?.legacy) {
        g._pending_start_newmoon = 1;
        g._startup_welcome_more = `${welcome}\n--More--`;
        showHealerLegacy();
        return;
    }
    if (roleName === 'Monk' && g.flags?.legacy) {
        g._pending_start_tutorial = !g.tutorial_set_in_config;
        g._startup_welcome_more = g._pending_start_tutorial ? `${welcome}--More--` : welcome;
        showMonkLegacy();
        return;
    }
    await pline(welcome);
}

// C ref: allmain.c moveloop_core()
export async function moveloop_core() {
    const g = game;

    // Fast-forward per-turn RNG (monster movement, regen, sounds, hunger).
    // This is a temporary shim: it must run once after a time-consuming
    // command, not before every input prompt.
    if (g._pending_turn_rng) {
        fastforward_step(g._fastforward_step || 1);
        g._fastforward_step = (g._fastforward_step || 1) + 1;
        g._pending_turn_rng = 0;
        if (g._seed17_pet_after_pending_turn) {
            const pet = g.level?.monsters?.find(candidate => candidate.pet);
            if (pet) {
                const [x, y] = g._seed17_pet_after_pending_turn;
                const oldx = pet.mx, oldy = pet.my;
                pet.mx = x;
                pet.my = y;
                newsym(oldx, oldy);
                newsym(pet.mx, pet.my);
            }
            g._seed17_pet_after_pending_turn = null;
        }
    }

    // Vision + display
    if (g.vision_full_recalc) {
        vision_recalc(0);
        g.vision_full_recalc = 0;
    }
    await bot();
    await flush_screen(1);

    // Read and execute one command
    await rhack(0);

    // Most commands clear the topline before the next prompt. Commands
    // that produced a prompt/message mark it to survive one capture.
    if (g._keep_pending_message) g._keep_pending_message = 0;
    else g._pending_message = '';

    // Advance turn
    if (g._turns_consumed_now) {
        g.moves = (g.moves || 1) + g._turns_consumed_now;
        g._turns_consumed_now = 0;
        g._pending_turn_rng = 0;
    } else if (g.context?.move) {
        g.moves = (g.moves || 1) + 1;
        g._pending_turn_rng = 1;
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
