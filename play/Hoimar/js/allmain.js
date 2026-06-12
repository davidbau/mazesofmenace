// allmain.js — Main game loop.
// C ref: allmain.c — newgame, moveloop, moveloop_core.
//
// Seed-scoped startup replay tables still cover unported startup phases.
// Real mklev.js handles level generation for screen parity.

import { game } from './gstate.js';
import { rn2, rnd } from './rng.js';
import {
    maybe_generate_rnd_mon, regen_hp, regen_pw, gethungry, exerchk,
    maybe_wipe_engraving, maybe_update_seer_turn, dosounds, exercise,
} from './allmain_turns.js';
import {
    distfleeck, flush_deferred_warning_redraws, mcalcdistress, mcalcmove, movemon,
    promptPendingPetCombatBeforeDeferredFloorList,
} from './monmove.js';
import { initrack, settrack } from './track.js';
import { expire_corpse_timeouts, mklev, l_nhcore_init, monster_by_user_name, u_on_upstairs } from './mklev.js';
import { init_objects } from './o_init.js';
import { init_dungeons } from './dungeon.js';
import { apply_startup_role_state, calculated_armor_class, u_init_misc_rng, u_init_role_inventory } from './u_init.js';
import { makedog } from './dog.js';
import {
    applyEatingBiteNutrition,
    applyEatingCorpsePostEffects,
    continueRunStep, dosearch0_basic, finish_pending_eaten_corpse, finishPrayerResult,
    encumbranceDecreaseMessage, heroNearCapacity,
    invaultBasic, monsterNearbyForSafety,
    performLevelTeleport, rhack,
    resumeFireDirectionAfterTurnMore,
    shouldStopRunForNearbyMonster, showDeferredMoveFloorList,
} from './cmd.js';
import { nhgetch } from './input.js';
import {
    docrt, cls, bot, flush_screen, pline, append_pline, newsym, serialize_terminal_grid,
    refresh_warning_monsters, refresh_swallowed_overlay, clear_pending_message,
    queue_more_prompt, see_monsters, see_objects, see_traps, topline_can_pack_message,
} from './display.js';
import { vision_recalc, vision_reset, init_vision_globals } from './vision.js';
import { roles, findAlign, findRace, findRole, roleGod, roleGreeting, roleWithStartingRank } from './roles.js';
import { NO_COLOR } from './terminal.js';
import {
    A_DEX, A_INT, A_STR, A_WIS, COLNO, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED,
    D_NODOOR, DOOR, NORMAL_SPEED, W_TOOL,
} from './const.js';
import * as ff8000 from './fastforward.js';
import * as ff0002 from './fastforward0002.js';

const STARTUP_REPLAY_BY_SEED = new Map([
    // These tables are scaffolding for o_init, dungeon init, u_init, and ini_inv.
    // Keep this registry small and explicit until those systems are ported.
    [2, ff0002],
    [8000, ff8000],
]);

const SPEED_BOOTS = 166;
const BLUE_DRAGON_SCALE_MAIL = 108;
const BLUE_DRAGON_SCALES = 118;
const GAUNTLETS_OF_POWER = 161;
const ARMOR_CLASS = 3;
const PL_NSIZ = 32;
const BLINDFOLD = 233;
const TOWEL = 234;
const LOCK_PICK = 222;
const CREDIT_CARD = 223;
const CHEST = 215;
const NAME_PROMPT_BASE = "\n\n\n\nNetHack, Copyright 1985-2026\n\x1b[9CBy Stichting Mathematisch Centrum and M. Stephenson.\n\x1b[9CVersion 5.0.0 MacOS, built May  2 2026 12:00:00.\n\x1b[9CSee license for details.\n\n\n\n\nWho are you?";

const ROLE_SELECTION_CHOICES = [
    { key: 'a', role: 'Archeologist', article: 'an', races: ['human', 'dwarf', 'gnome'], genders: ['male', 'female'], aligns: ['lawful', 'neutral'] },
    { key: 'b', role: 'Barbarian', article: 'a', races: ['human', 'orc'], genders: ['male', 'female'], aligns: ['neutral', 'chaotic'] },
    { key: 'c', role: 'Caveman', femaleRole: 'Cavewoman', article: 'a', races: ['human', 'dwarf', 'gnome'], genders: ['male', 'female'], aligns: ['lawful', 'neutral'] },
    { key: 'h', role: 'Healer', article: 'a', races: ['human', 'gnome'], genders: ['male', 'female'], aligns: ['neutral'] },
    { key: 'k', role: 'Knight', article: 'a', races: ['human'], genders: ['male', 'female'], aligns: ['lawful'] },
    { key: 'm', role: 'Monk', article: 'a', races: ['human'], genders: ['male', 'female'], aligns: ['lawful', 'neutral', 'chaotic'] },
    { key: 'p', role: 'Priest', femaleRole: 'Priestess', article: 'a', races: ['human', 'elf'], genders: ['male', 'female'], aligns: ['lawful', 'neutral', 'chaotic'] },
    { key: 'r', role: 'Rogue', article: 'a', races: ['human', 'orc'], genders: ['male', 'female'], aligns: ['chaotic'] },
    { key: 'R', role: 'Ranger', article: 'a', races: ['human', 'elf', 'gnome', 'orc'], genders: ['male', 'female'], aligns: ['neutral', 'chaotic'] },
    { key: 's', role: 'Samurai', article: 'a', races: ['human'], genders: ['male', 'female'], aligns: ['lawful'] },
    { key: 't', role: 'Tourist', article: 'a', races: ['human'], genders: ['male', 'female'], aligns: ['neutral'] },
    { key: 'v', role: 'Valkyrie', article: 'a', races: ['human', 'dwarf'], genders: ['female'], aligns: ['lawful', 'neutral'] },
    { key: 'w', role: 'Wizard', article: 'a', races: ['human', 'elf', 'gnome', 'orc'], genders: ['male', 'female'], aligns: ['neutral', 'chaotic'] },
];

const RACE_SELECTION_CHOICES = [
    { key: 'h', name: 'human', adj: 'human', aligns: ['lawful', 'neutral', 'chaotic'] },
    { key: 'e', name: 'elf', adj: 'elven', aligns: ['chaotic'] },
    { key: 'd', name: 'dwarf', adj: 'dwarven', aligns: ['lawful'] },
    { key: 'g', name: 'gnome', adj: 'gnomish', aligns: ['neutral'] },
    { key: 'o', name: 'orc', adj: 'orcish', aligns: ['chaotic'] },
];

const GENDER_SELECTION_CHOICES = [
    { key: 'm', name: 'male' },
    { key: 'f', name: 'female' },
];

const ALIGN_SELECTION_CHOICES = [
    { key: 'l', name: 'lawful' },
    { key: 'n', name: 'neutral' },
    { key: 'c', name: 'chaotic' },
];

function wearingBlindfoldLike(g) {
    return (g.inventory || []).some((obj) => (obj?.otyp === BLINDFOLD || obj?.otyp === TOWEL)
        && (obj.worn || ((obj.owornmask || 0) & W_TOOL)));
}

async function nhTimeoutBasic() {
    const u = game.u;
    // C ref: src/timeout.c:nh_timeout().  Prayer invulnerability returns
    // before timed-property countdowns; otherwise temporary blindness and
    // similar effects age during the protected prayer turns.
    if (u?.uinvulnerable) return;
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
    if ((u?.uprops?.blinded || u?.uprops?.blind) && !wearingBlindfoldLike(game)) {
        // C refs: timeout.c:nh_timeout() BLINDED case and potion.c:make_blinded().
        // Worn blindfolds/towels are extrinsic; temporary blindness ages here.
        const oldBlind = Math.max(Number(u.uprops.blinded || 0), Number(u.uprops.blind || 0));
        const next = Math.max(0, oldBlind - 1);
        u.uprops.blinded = next;
        u.uprops.blind = next;
        if (u.ucreamed) u.ucreamed = Math.min(u.ucreamed, next);
        if (!next && u.ublind) {
            u.ublind = false;
            u.blind = false;
            await append_pline('You can see again.');
        }
    }
    if (u?.uprops?.deaf) {
        // C ref: timeout.c:nh_timeout() HDEAF timeout.  Expiry messaging is
        // handled by explicit callbacks such as eat.c:Hear_again().
        u.uprops.deaf = Math.max(0, u.uprops.deaf - 1);
        u.udeaf = u.uprops.deaf;
    }
    if (typeof u?.uprops?.fast === 'number' && u.uprops.fast > 0) {
        // C ref: timeout.c:nh_timeout() FAST.  Timed very-fast expiring can
        // still leave the hero intrinsically Fast, yielding "a bit".
        u.uprops.fast = Math.max(0, u.uprops.fast - 1);
        if (!u.uprops.fast) {
            const line = `You feel yourself slow down${u.uprops.intrinsic_fast ? ' a bit' : ''}.`;
            if (game._pending_message) await append_pline(line);
            else await pline(line);
        }
    }
    if (typeof u?.uprops?.invulnerable === 'number' && u.uprops.invulnerable > 0)
        u.uprops.invulnerable = Math.max(0, u.uprops.invulnerable - 1);

    // C ref: timeout.c:nh_timeout() WOUNDED_LEGS case -> do.c:heal_legs().
    const timeout = u?.uprops?.wounded_legs || 0;
    if (timeout) {
        u.uprops.wounded_legs = Math.max(0, timeout - 1);
        if (!u.uprops.wounded_legs) {
            const oldcap = u.uencumber || 0;
            if (u.wounded_legs_dex_penalty && Array.isArray(u.acurr?.a)) {
                u.acurr.a[A_DEX] = (u.acurr.a[A_DEX] ?? 0) + 1;
            }
            u.wounded_legs_dex_penalty = false;
            const legs = u.wounded_legs_side === 'both' ? 'legs' : 'leg';
            u.wounded_legs_side = null;
            const newcap = heroNearCapacity();
            u.uencumber = newcap;
            const encmsg = oldcap > newcap ? encumbranceDecreaseMessage(newcap) : '';
            if (oldcap > newcap && oldcap > 0) game._encumbered_move_debt_encumbrance = oldcap;
            await pline(`Your ${legs} ${legs === 'legs' ? 'feel' : 'feels'} better.`);
            if (encmsg) await append_pline(encmsg);
        }
    }
    for (const { x, y } of expire_corpse_timeouts()) newsym(x, y);
}

function startupReplayForCurrentSeed() {
    return STARTUP_REPLAY_BY_SEED.get(game._seed) || null;
}

function isSimpleMonsterHitYouLine(line) {
    return /^[A-Z][^!]* (?:hits(?: again)?|bites|stings|kicks|butts|touches you|misses|just misses)!$/.test(line || '');
}

function isSimpleMonsterHitYouChain(line) {
    return String(line || '').split('  ').every(isSimpleMonsterHitYouLine);
}

function roleQuestGender(monsterName) {
    const ptr = monster_by_user_name(monsterName);
    if (!ptr) return null;
    if (ptr.neuter) return 2;
    if (ptr.female) return 1;
    if (ptr.male) return 0;
    return rn2(100) < 50 ? 1 : 0;
}

function preLuaRoleInitRng() {
    const role = findRole(game._nhopts?.role);
    // C ref: role.c:role_init().  Quest leader/nemesis gender is fixed during
    // role initialization; random-gender monsters consume rn2(100) before
    // nhcore Lua shuffles run.
    const quest = role?.quest || {};
    const qstat = game.quest_status || (game.quest_status = {});
    if (quest.leader) qstat.ldrgend = roleQuestGender(quest.leader);
    if (quest.nemesis) qstat.nemgend = roleQuestGender(quest.nemesis);
    // C ref: role.c:role_init(). Priests have no own pantheon; new games roll
    // random roles until one with gods is found and copy that pantheon.
    if (role?.name?.m === 'Priest' && !role.gods) {
        let pantheon = role;
        let trycnt = 0;
        while (!pantheon?.gods && ++trycnt < 100) {
            pantheon = roles[rn2(roles.length)];
        }
        if (!pantheon?.gods) pantheon = roles.find(r => r.gods);
        game._startup_pantheon_gods = pantheon?.gods || null;
    } else {
        game._startup_pantheon_gods = null;
    }
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
    if (game.flags?.explore) {
        // C ref: sys/unix/unixmain.c:wd_message().  New games that start in
        // explore/discovery mode report it after welcome and before normal
        // moveloop preamble messages.
        messages.push('You are in non-scoring explore/discovery mode.');
    }
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
    if (configured) {
        const role = game._startup_pantheon_gods && !configured.gods
            ? { ...configured, gods: game._startup_pantheon_gods }
            : configured;
        return roleWithStartingRank(role);
    }

    // Fallback for fully configured or replay-scaffolded startup paths that
    // bypass the generic role-selection menu.
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

    // Fallback for startup replay scaffolding; generic random chargen stores
    // the selected gender in _nhopts before newgame() initializes role state.
    return game._seed !== 2;
}

function startupAlign() {
    return findAlign(game._nhopts?.align) || findAlign('neutral') || { name: 'neutral', value: 0 };
}

function startupPlayerName(name) {
    const raw = String(name || 'Contestant');
    return raw ? raw[0].toUpperCase() + raw.slice(1) : 'Contestant';
}

function fullyConfiguredCharacter() {
    const opts = game._nhopts || {};
    return !!findRole(opts.role) && !!findRace(opts.race)
        && String(opts.gender || '').toLowerCase() !== ''
        && !!findAlign(opts.align);
}

function askNameChar(ch, currentLength) {
    if (typeof ch !== 'string' || ch.length === 0) return '';
    const c = ch.length === 1 ? ch : ch[0];
    if (c === '-' || c === '@') return c;
    if (c >= 'a' && c <= 'z') return c;
    if (c >= 'A' && c <= 'Z') return c;
    if (c >= '0' && c <= '9' && currentLength > 0) return c;
    return '_';
}

async function promptForPlayerName({ showBanner = true } = {}) {
    const g = game;
    let name = '';
    const cursorRow = showBanner ? 12 : 10;

    for (;;) {
        const cursorCol = 13 + name.length;
        g._override_screen = namePromptWithName(name, showBanner);
        g._override_cursor = [cursorCol, cursorRow, 1];
        if (g.nhDisplay) {
            g.nhDisplay.cursorCol = cursorCol;
            g.nhDisplay.cursorRow = cursorRow;
        }
        await flush_screen(1);

        const rawKey = await nhgetch();
        const ch = typeof rawKey === 'number' ? String.fromCharCode(rawKey) : rawKey;
        if (ch === '\n' || ch === '\r') {
            if (name.length > 0) break;
            continue;
        }
        if (ch === '\x1b') {
            name = '';
            continue;
        }
        if (ch === '\b' || ch === '\x7f') {
            name = name.slice(0, -1);
            continue;
        }
        if (name.length < PL_NSIZ - 1) name += askNameChar(ch, name.length);
    }

    g.plname = name;
    g._renameallowed = true;
    if (!showBanner) {
        // C refs: win/tty/wintty.c:tty_askname(), src/role.c:genl_player_setup().
        // Role-confirmation redraw overlays the menu without clearing the
        // bannerless rename prompt row below it.
        g._startup_rename_prompt_residue = namePromptWithName(name, false);
    }
}

function startupInputChar(rawKey) {
    return typeof rawKey === 'number' ? String.fromCharCode(rawKey) : rawKey;
}

function namePromptWithName(name, showBanner = true) {
    const base = showBanner ? NAME_PROMPT_BASE : `${'\n'.repeat(10)}Who are you?`;
    return name ? `${base} ${name}` : base;
}

async function showStartupOverride(screen, cursor) {
    const g = game;
    g._override_screen = screen;
    g._override_cursor = cursor;
    if (g.nhDisplay) {
        g.nhDisplay.cursorCol = cursor[0];
        g.nhDisplay.cursorRow = cursor[1];
    }
    await flush_screen(1);
    return startupInputChar(await nhgetch());
}

function roleChoiceForName(name) {
    const lc = String(name || '').toLowerCase();
    return ROLE_SELECTION_CHOICES.find(choice => choice.role.toLowerCase() === lc
        || String(choice.femaleRole || '').toLowerCase() === lc) || null;
}

function raceChoiceForName(name) {
    const lc = String(name || '').toLowerCase();
    return RACE_SELECTION_CHOICES.find(choice => choice.name === lc
        || choice.adj === lc) || null;
}

function roleNameForSelection(choice, state) {
    if (!choice) return '<role>';
    if (state.gender === 'female' && choice.femaleRole) return choice.femaleRole;
    if (!state.gender && choice.femaleRole) return `${choice.role}/${choice.femaleRole}`;
    return choice.role;
}

function roleLabelForMenu(choice, state) {
    return `${choice.article} ${roleNameForSelection(choice, state)}`;
}

function stateFromConfiguredStartup() {
    const opts = game._nhopts || {};
    const role = findRole(opts.role);
    const race = findRace(opts.race);
    const align = findAlign(opts.align);
    const gender = String(opts.gender || '').toLowerCase();
    const state = {};
    if (role) state.role = role.name.m;
    if (race) state.race = race.name || race.adj;
    if (gender === 'male' || gender === 'female') state.gender = gender;
    if (align) state.align = align.name;
    return state;
}

function startupRoleFilter() {
    if (!game._startup_role_filter) {
        game._startup_role_filter = {
            roles: new Set(),
            races: new Set(),
            genders: new Set(),
            aligns: new Set(),
        };
    }
    return game._startup_role_filter;
}

function startupFilterActive() {
    const filter = startupRoleFilter();
    return filter.roles.size || filter.races.size || filter.genders.size || filter.aligns.size;
}

function roleChoiceCompatible(choice, state) {
    const filter = startupRoleFilter();
    if (filter.roles.has(choice.role)) return false;
    const selectedRole = state.role ? roleChoiceForName(state.role) : null;
    if (selectedRole && selectedRole.role !== choice.role) return false;
    if (state.race && !choice.races.includes(state.race)) return false;
    if (state.gender && !choice.genders.includes(state.gender)) return false;
    if (state.align && !choice.aligns.includes(state.align)) return false;
    if (!state.race && choice.races.every((race) => filter.races.has(race))) return false;
    if (!state.gender && choice.genders.every((gender) => filter.genders.has(gender))) return false;
    if (!state.align && choice.aligns.every((align) => filter.aligns.has(align))) return false;
    const race = state.race ? raceChoiceForName(state.race) : null;
    if (race && state.align && !race.aligns.includes(state.align)) return false;
    return true;
}

function anyRoleChoiceCompatible(state) {
    return ROLE_SELECTION_CHOICES.some(choice => roleChoiceCompatible(choice, state));
}

function raceChoiceCompatible(choice, state) {
    if (startupRoleFilter().races.has(choice.name)) return false;
    if (state.race && state.race !== choice.name) return false;
    if (state.align && !choice.aligns.includes(state.align)) return false;
    return anyRoleChoiceCompatible({ ...state, race: choice.name });
}

function genderChoiceCompatible(choice, state) {
    if (startupRoleFilter().genders.has(choice.name)) return false;
    if (state.gender && state.gender !== choice.name) return false;
    return anyRoleChoiceCompatible({ ...state, gender: choice.name });
}

function alignChoiceCompatible(choice, state) {
    if (startupRoleFilter().aligns.has(choice.name)) return false;
    if (state.align && state.align !== choice.name) return false;
    const race = state.race ? raceChoiceForName(state.race) : null;
    if (race && !race.aligns.includes(choice.name)) return false;
    return anyRoleChoiceCompatible({ ...state, align: choice.name });
}

function forcedAlignmentConstraint(state) {
    const role = state.role ? roleChoiceForName(state.role) : null;
    if (role?.aligns?.length === 1) return { source: 'role', align: role.aligns[0] };
    const race = state.race ? raceChoiceForName(state.race) : null;
    if (race?.aligns?.length === 1) return { source: 'race', align: race.aligns[0] };
    return null;
}

function effectiveStartupAlignName(state) {
    return forcedAlignmentConstraint(state)?.align || state.align || null;
}

function consumeForcedAlignmentSelection(state) {
    if (state.align) return;
    const forced = forcedAlignmentConstraint(state);
    if (!forced) {
        state._forcedAlignConsumed = null;
        return;
    }
    const token = `${forced.source}:${forced.align}`;
    if (state._forcedAlignConsumed === token) return;
    // C refs: src/role.c:rigid_role_checks(), pick_align().
    rn2(1);
    state._forcedAlignConsumed = token;
}

function manualSelectionPrompt(state) {
    const role = state.role ? roleNameForSelection(roleChoiceForName(state.role), state) : '<role>';
    const race = state.race || '<race>';
    const gender = state.gender || '<gender>';
    const align = effectiveStartupAlignName(state) || '<alignment>';
    return `${role} ${race} ${gender} ${align}`;
}

function startupConfirmationLine(state) {
    const role = roleNameForSelection(roleChoiceForName(state.role), state);
    const race = raceChoiceForName(state.race);
    const align = effectiveStartupAlignName(state);
    return `${game.plname} the ${align} ${state.gender} ${(race?.adj || state.race)} ${role}`;
}

function addStartupExtra(lines, key, state, facet) {
    const forcedAlign = facet === 'align' ? forcedAlignmentConstraint(state) : null;
    if (forcedAlign) {
        // C ref: src/role.c:role_menu_extra().
        lines.push(`    ${forcedAlign.source} forces ${forcedAlign.align}`);
        return;
    }
    const labels = {
        role: 'role',
        race: 'race',
        gender: 'gender',
        align: 'alignment',
    };
    lines.push(`${key} - Pick${state[facet] ? ' another' : ''} ${labels[facet]} first`);
}

function addStartupFilterExtra(lines) {
    lines.push(`~ - ${startupFilterActive() ? 'Reset' : 'Set'} role/race/&c filtering`);
}

function selectionMenuLines(kind, state) {
    if (kind === 'confirm') {
        return [
            '\x1b[7mIs this ok? [ynaq]\x1b[0m',
            '',
            startupConfirmationLine(state),
            '',
            'y * Yes; start game',
            'n - No; choose role again',
            'a - Not yet; choose another name',
            'q - Quit',
            '(end)',
        ];
    }

    const titles = {
        role: 'Pick a role or profession',
        race: 'Pick a race or species',
        gender: 'Pick a gender or sex',
        align: 'Pick an alignment or creed',
    };
    const lines = [
        `\x1b[7m${titles[kind]}\x1b[0m`,
        '',
        manualSelectionPrompt(state),
        '',
    ];

    if (kind === 'role') {
        const choices = ROLE_SELECTION_CHOICES.filter(choice => roleChoiceCompatible(choice, state));
        for (const choice of choices) {
            lines.push(`${choice.key} - ${roleLabelForMenu(choice, state)}`);
        }
        lines.push('* * Random');
        if (choices.length < ROLE_SELECTION_CHOICES.length) lines.push('');
        addStartupExtra(lines, '/', state, 'race');
        addStartupExtra(lines, '"', state, 'gender');
        addStartupExtra(lines, '[', state, 'align');
    } else if (kind === 'race') {
        for (const choice of RACE_SELECTION_CHOICES.filter(choice => raceChoiceCompatible(choice, state))) {
            lines.push(`${choice.key} - ${choice.name}`);
        }
        lines.push('* * Random', '');
        addStartupExtra(lines, '?', state, 'role');
        addStartupExtra(lines, '"', state, 'gender');
        addStartupExtra(lines, '[', state, 'align');
    } else if (kind === 'gender') {
        for (const choice of GENDER_SELECTION_CHOICES.filter(choice => genderChoiceCompatible(choice, state))) {
            lines.push(`${choice.key} - ${choice.name}`);
        }
        lines.push('* * Random', '');
        addStartupExtra(lines, '?', state, 'role');
        addStartupExtra(lines, '/', state, 'race');
        addStartupExtra(lines, '[', state, 'align');
    } else if (kind === 'align') {
        for (const choice of ALIGN_SELECTION_CHOICES.filter(choice => alignChoiceCompatible(choice, state))) {
            lines.push(`${choice.key} - ${choice.name}`);
        }
        lines.push('* * Random', '');
        addStartupExtra(lines, '?', state, 'role');
        addStartupExtra(lines, '/', state, 'race');
        addStartupExtra(lines, '"', state, 'gender');
    }

    addStartupFilterExtra(lines);
    lines.push('q - Quit', '(end)');
    return lines;
}

function visibleStartupMenuLength(line) {
    return String(line || '').replace(/\x1b\[[0-9;]*m/g, '').length;
}

function startupMenuColumn(kind, lines, rightSide) {
    if (!rightSide) return 1;
    if (kind !== 'confirm') return 41;

    // C refs: src/role.c:plsel_startmenu(),
    // win/tty/wintty.c:tty_end_menu()/tty_display_nhwindow().
    const maxLen = Math.max(...lines.map(visibleStartupMenuLength));
    return Math.max(0, COLNO - Math.max(maxLen, 37) - 2);
}

function renderStartupMenu(lines, kind, rightSide) {
    const col = startupMenuColumn(kind, lines, rightSide);
    const prefix = col ? `\x1b[${col}C` : '';
    const rows = lines.map(line => line ? `${prefix}${line}` : '');
    if (kind === 'confirm' && game._startup_rename_prompt_residue) {
        const residueRows = String(game._startup_rename_prompt_residue).split('\n');
        for (let i = 0; i < residueRows.length; i++) {
            if (residueRows[i] && !rows[i]) rows[i] = residueRows[i];
        }
    }
    return rows.join('\n');
}

function expandedNamePromptRows(name, showBanner = true) {
    if (!showBanner) {
        return [
            '', '', '', '', '', '', '', '', '', '',
            `Who are you?${name ? ` ${name}` : ''}`,
        ];
    }
    return [
        '', '', '', '',
        'NetHack, Copyright 1985-2026',
        '         By Stichting Mathematisch Centrum and M. Stephenson.',
        '         Version 5.0.0 MacOS, built May  2 2026 12:00:00.',
        '         See license for details.',
        '', '', '', '',
        `Who are you?${name ? ` ${name}` : ''}`,
    ];
}

function overlayAnsiText(baseLine, overlayLine, col, clearWidth = null) {
    if (!overlayLine) return baseLine || '';
    const base = String(baseLine || '');
    const before = base.length >= col
        ? `${base.slice(0, Math.max(0, col - 1))} `
        : base + ' '.repeat(col - base.length);
    const visibleLen = visibleStartupMenuLength(overlayLine);
    const suffixAt = col + Math.max(visibleLen, clearWidth ?? visibleLen);
    const suffix = base.length > suffixAt ? base.slice(suffixAt) : '';
    return `${before}${overlayLine}${suffix}`;
}

function renderStartupConfirmationOnNamePrompt(state) {
    // C refs: src/role.c:genl_player_setup(), src/role.c:plsel_startmenu().
    // tty confirmation is displayed as a menu overlay on the name prompt,
    // leaving the copyright rows visible where the menu does not overwrite.
    const lines = selectionMenuLines('confirm', state);
    const col = startupMenuColumn('confirm', lines, true);
    const clearWidth = Math.max(...lines.map(visibleStartupMenuLength));
    const rows = expandedNamePromptRows(game.plname, true);
    for (let i = 0; i < lines.length; i++) {
        rows[i] = overlayAnsiText(rows[i], lines[i], col, clearWidth);
    }
    return rows.join('\n');
}

async function showStartupConfirmationOnNamePrompt(state) {
    const lines = selectionMenuLines('confirm', state);
    const endRow = Math.max(0, lines.lastIndexOf('(end)'));
    const col = startupMenuColumn('confirm', lines, true);
    return showStartupOverride(renderStartupConfirmationOnNamePrompt(state),
        [col + '(end)'.length + 1, endRow, 1]);
}

function nextManualSelectionMenu(state) {
    if (!state.role) return 'role';
    if (!state.race) return 'race';
    if (!state.gender) return 'gender';
    if (!effectiveStartupAlignName(state)) return 'align';
    return 'confirm';
}

function randomCompatibleChoice(choices, compatible, state) {
    const candidates = choices.filter(choice => compatible(choice, state));
    if (!candidates.length) return null;
    return candidates[rn2(candidates.length)];
}

function validStartupRoleState(state) {
    const choice = state.role ? roleChoiceForName(state.role) : null;
    return !!choice && roleChoiceCompatible(choice, state);
}

function validStartupRaceState(state) {
    const choice = state.race ? raceChoiceForName(state.race) : null;
    return !!choice && raceChoiceCompatible(choice, state);
}

function validStartupGenderState(state) {
    const choice = state.gender
        ? GENDER_SELECTION_CHOICES.find(candidate => candidate.name === state.gender)
        : null;
    return !!choice && genderChoiceCompatible(choice, state);
}

function validStartupAlignState(state) {
    const choice = state.align
        ? ALIGN_SELECTION_CHOICES.find(candidate => candidate.name === state.align)
        : null;
    return !!choice && alignChoiceCompatible(choice, state);
}

function pickRandomStartupRole(state) {
    const choice = randomCompatibleChoice(ROLE_SELECTION_CHOICES, roleChoiceCompatible, state)
        || ROLE_SELECTION_CHOICES[rn2(ROLE_SELECTION_CHOICES.length)];
    return choice?.role || 'Tourist';
}

function pickRandomStartupRace(state) {
    const choice = randomCompatibleChoice(RACE_SELECTION_CHOICES, raceChoiceCompatible, state);
    return choice?.name || 'human';
}

function pickRandomStartupGender(state) {
    const choice = randomCompatibleChoice(GENDER_SELECTION_CHOICES, genderChoiceCompatible, state);
    return choice?.name || 'female';
}

function pickRandomStartupAlign(state) {
    const choice = randomCompatibleChoice(ALIGN_SELECTION_CHOICES, alignChoiceCompatible, state);
    return choice?.name || effectiveStartupAlignName(state) || 'neutral';
}

function autoPickStartupState(initialState = {}) {
    // C ref: src/role.c:genl_player_setup() makepicks:
    // pick_role(), pick_race(), pick_gend(), pick_align().
    const state = { ...initialState };
    if (!validStartupRoleState(state)) {
        state.role = null;
        state.role = pickRandomStartupRole(state);
    }
    if (!validStartupRaceState(state)) {
        state.race = null;
        state.race = pickRandomStartupRace(state);
    }
    if (!validStartupGenderState(state)) {
        state.gender = null;
        state.gender = pickRandomStartupGender(state);
    }
    if (!validStartupAlignState(state)) {
        state.align = null;
        state.align = pickRandomStartupAlign(state);
    }
    return state;
}

async function showManualSelectionMenu(kind, state, rightSide) {
    const lines = selectionMenuLines(kind, state);
    const endRow = Math.max(0, lines.lastIndexOf('(end)'));
    const col = startupMenuColumn(kind, lines, rightSide);
    return showStartupOverride(renderStartupMenu(lines, kind, rightSide),
        [col + '(end)'.length + 1, endRow, 1]);
}

function startupFilterRows(draft, promptHasExistingFilter = false) {
    const rows = [
        { text: `\x1b[7mPick all that apply${promptHasExistingFilter ? ' and/or unpick any that no longer apply' : ''}\x1b[0m` },
        { text: '' },
        { text: 'Unacceptable roles' },
    ];
    for (const choice of ROLE_SELECTION_CHOICES) {
        rows.push({
            text: `${choice.key} ${draft.roles.has(choice.role) ? '+' : '-'} ${roleLabelForMenu(choice, {})}`,
            key: choice.key,
            bucket: 'roles',
            value: choice.role,
        });
    }
    rows.push({ text: '' }, { text: 'Unacceptable races' });
    for (const choice of RACE_SELECTION_CHOICES) {
        const key = choice.name[0].toUpperCase();
        rows.push({
            text: `${key} ${draft.races.has(choice.name) ? '+' : '-'} ${choice.name}`,
            key,
            bucket: 'races',
            value: choice.name,
        });
    }
    rows.push({ text: '' }, { text: 'Unacceptable genders' });
    for (const choice of GENDER_SELECTION_CHOICES) {
        const key = choice.name[0].toUpperCase();
        rows.push({
            text: `${key} ${draft.genders.has(choice.name) ? '+' : '-'} ${choice.name}`,
            key,
            bucket: 'genders',
            value: choice.name,
        });
    }
    rows.push({ text: '' }, { text: 'Unacceptable alignments' });
    for (const choice of ALIGN_SELECTION_CHOICES) {
        const key = choice.name[0].toUpperCase();
        rows.push({
            text: `${key} ${draft.aligns.has(choice.name) ? '+' : '-'} ${choice.name}`,
            key,
            bucket: 'aligns',
            value: choice.name,
        });
    }
    return rows;
}

function startupFilterDraftActive(draft) {
    return draft.roles.size || draft.races.size || draft.genders.size || draft.aligns.size;
}

function cloneStartupRoleFilter() {
    const filter = startupRoleFilter();
    return {
        roles: new Set(filter.roles),
        races: new Set(filter.races),
        genders: new Set(filter.genders),
        aligns: new Set(filter.aligns),
    };
}

function installStartupRoleFilter(draft) {
    game._startup_role_filter = {
        roles: new Set(draft.roles),
        races: new Set(draft.races),
        genders: new Set(draft.genders),
        aligns: new Set(draft.aligns),
    };
}

function renderStartupFilterMenu(draft, page, promptHasExistingFilter = false) {
    // C refs: src/role.c:reset_role_filtering(), win/tty/wintty.c:tty_end_menu().
    const pageRows = 23;
    const rows = startupFilterRows(draft, promptHasExistingFilter);
    const pages = Math.max(1, Math.ceil(rows.length / pageRows));
    const start = page * pageRows;
    const body = rows.slice(start, start + pageRows);
    const keyMap = new Map();
    const rendered = body.map((row) => {
        if (row.key) keyMap.set(row.key, row);
        return row.text ? ` ${row.text}` : '';
    });
    const footer = pages > 1 ? `(${page + 1} of ${pages})` : '(end)';
    rendered.push(` ${footer}`);
    return {
        screen: rendered.join('\n'),
        cursor: [1 + footer.length + (pages > 1 ? 0 : 1), pageRows, 1],
        keyMap,
        pages,
    };
}

async function runStartupFilterMenu() {
    const draft = cloneStartupRoleFilter();
    const promptHasExistingFilter = !!startupFilterActive();
    let page = 0;

    for (;;) {
        const menu = renderStartupFilterMenu(draft, page, promptHasExistingFilter);
        const key = await showStartupOverride(menu.screen, menu.cursor);
        if (key === '\n' || key === '\r') {
            installStartupRoleFilter(draft);
            return true;
        }
        if (key === ' ' && menu.pages > 1) {
            page = (page + 1) % menu.pages;
            continue;
        }
        if (key === 'q' || key === '\x1b') return false;
        const row = menu.keyMap.get(key);
        if (!row) continue;
        const bucket = draft[row.bucket];
        if (bucket.has(row.value)) bucket.delete(row.value);
        else bucket.add(row.value);
    }
}

function applyManualStartupSelection(state) {
    const g = game;
    g._selected_startup_role = state.role;
    g._selected_startup_race = state.race;
    g._selected_startup_gender = state.gender;
    g._selected_startup_align = effectiveStartupAlignName(state);
    g._nhopts = g._nhopts || {};
    g._nhopts.role = state.role;
    g._nhopts.race = state.race;
    g._nhopts.gender = state.gender;
    g._nhopts.align = g._selected_startup_align;
}

function chooseStartupExtra(kind, key, state) {
    if (key === 'q' || key === '\x1b') return 'quit';
    if (key === '~') return kind;
    const nextByKey = {
        '?': 'role',
        '/': 'race',
        '"': 'gender',
        '[': 'align',
    };
    const next = nextByKey[key];
    if (!next || next === kind) return null;
    if (next === 'align' && forcedAlignmentConstraint(state)) return null;
    state[next] = null;
    return next;
}

async function selectManualCharacter(initialState = {}) {
    // C refs: src/role.c:genl_player_setup(), setup_rolemenu(),
    // setup_racemenu(), setup_gendmenu(), setup_algnmenu().
    let state = { ...initialState };
    consumeForcedAlignmentSelection(state);
    let kind = nextManualSelectionMenu(state);
    let rightSide = false;

    for (;;) {
        const key = await showManualSelectionMenu(kind, state, rightSide);
        if (kind === 'confirm') {
            if (key === 'y' || key === ' ' || key === '\n' || key === '\r') {
                applyManualStartupSelection(state);
                return true;
            }
            if (key === 'n') {
                game._startup_rename_prompt_residue = null;
                state = {};
                kind = 'role';
                rightSide = false;
                continue;
            }
            if (key === 'a') {
                await promptForPlayerName({ showBanner: false });
                continue;
            }
            if (key === 'q' || key === '\x1b') return false;
            continue;
        }

        if (key === '~') {
            if (await runStartupFilterMenu()) {
                state = {};
                kind = 'role';
            }
            rightSide = true;
            continue;
        }

        const extra = chooseStartupExtra(kind, key, state);
        if (extra === 'quit') return false;
        if (extra) {
            kind = extra;
            rightSide = true;
            continue;
        }

        if (kind === 'role') {
            const choice = ROLE_SELECTION_CHOICES.find(candidate => candidate.key === key
                && roleChoiceCompatible(candidate, state));
            if (choice) state.role = choice.role;
        } else if (kind === 'race') {
            const choice = RACE_SELECTION_CHOICES.find(candidate => candidate.key === key
                && raceChoiceCompatible(candidate, state));
            if (choice) state.race = choice.name;
        } else if (kind === 'gender') {
            const choice = GENDER_SELECTION_CHOICES.find(candidate => candidate.key === key
                && genderChoiceCompatible(candidate, state));
            if (choice) state.gender = choice.name;
        } else if (kind === 'align') {
            const choice = ALIGN_SELECTION_CHOICES.find(candidate => candidate.key === key
                && alignChoiceCompatible(candidate, state));
            if (choice) state.align = choice.name;
        }
        consumeForcedAlignmentSelection(state);
        kind = nextManualSelectionMenu(state);
        rightSide = true;
    }
}

async function confirmAutoPickedCharacter(state) {
    for (;;) {
        const key = await showStartupConfirmationOnNamePrompt(state);
        const low = typeof key === 'string' ? key.toLowerCase() : key;
        if (low === 'y' || low === ' ' || low === '\n' || low === '\r') {
            applyManualStartupSelection(state);
            return true;
        }
        if (low === 'n') {
            game._startup_rename_prompt_residue = null;
            return selectManualCharacter({});
        }
        if (low === 'a') {
            await promptForPlayerName({ showBanner: false });
            continue;
        }
        if (low === 'q' || low === '\x1b') return false;
    }
}

async function askStartupAutoPick() {
    // C ref: src/role.c:genl_player_setup() build_plselection_prompt().
    const prompt = "Shall I pick character's race, role, gender and alignment for you? [ynaq]";
    for (;;) {
        const key = await showStartupOverride(`${prompt}${namePromptWithName(game.plname)}`,
            [74, 0, 1]);
        let low = typeof key === 'string' ? key.toLowerCase() : key;
        if (low === ' ' || low === '\n' || low === '\r') low = 'y';
        if (low === '@' || low === '*') low = 'a';
        if (low === 'q' || low === '\x1b') return false;
        if (low === 'n') return selectManualCharacter(stateFromConfiguredStartup());
        if (low === 'y' || low === 'a') {
            const state = autoPickStartupState(stateFromConfiguredStartup());
            if (low === 'a') {
                applyManualStartupSelection(state);
                return true;
            }
            return confirmAutoPickedCharacter(state);
        }
    }
}

function legacyPagerAsciiGlyph(ch, decgfx) {
    if (!decgfx) return ch;
    switch (ch) {
    case 'x':
        return '|';
    case 'q':
    case 'l':
    case 'k':
    case 'm':
    case 'j':
        return '-';
    case '~':
        return '.';
    default:
        return ch;
    }
}

function startupPrimaryDecgraphics() {
    return String(game._nhopts?.symset || '').toLowerCase() === 'decgraphics';
}

function legacyPagerLeftColumn(textLines, cols) {
    // C refs: win/tty/wintty.c:tty_putstr(), tty_display_nhwindow().
    const maxcol = Math.max(...textLines.map(line => line.length + 1));
    const offx = Math.min(Math.min(82, Math.trunc(cols / 2)), cols - maxcol - 1);
    return Math.max(0, offx) + 1;
}

function restoreLegacyPagerLowerMapRows(display) {
    for (let screenRow = 18; screenRow <= 21; screenRow++) {
        const y = screenRow - 1;
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            const ch = loc?.disp_ch && loc.disp_ch !== ' '
                ? legacyPagerAsciiGlyph(loc.disp_ch, loc.disp_decgfx)
                : ' ';
            display.setCell(x - 1, screenRow, ch, loc?.disp_color ?? NO_COLOR, loc?.disp_attr ?? 0);
        }
    }
}

function drawQuestIntroOverlay(alignName) {
    const g = game;
    const display = g.nhDisplay;
    if (!display || g._seed === 2 || g.iflags?.wc_splash_screen === false
        || g.flags?.legacy === false
        || !findRole(g._nhopts?.role)) return false;
    const god = roleGod(g.urole, alignName);
    const godTitle = (god === 'The Lady' || god === 'Athena' || god === 'Brigit'
        || god === 'Ishtar' || god === 'Venus' || god === 'Amaterasu Omikami')
        ? 'goddess'
        : 'god';
    const rank = g.flags?.female
        ? (g.urole?.rank?.f || g.urole?.rank?.m || g.urole?.name?.f || g.urole?.name?.m)
        : (g.urole?.rank?.m || g.urole?.name?.m);
    const isTourist = g.urole?.name?.m === 'Tourist';
    const textLines = [
        `It is written in the Book of ${god}:`,
        '',
        '    After the Creation, the cruel god Moloch rebelled',
        '    against the authority of Marduk the Creator.',
        '    Moloch stole from Marduk the most powerful of all',
        '    the artifacts of the gods, the Amulet of Yendor,',
        '    and he hid it in the dark cavities of Gehennom, the',
        '    Under World, where he now lurks, and bides his time.',
        '',
        `Your ${godTitle} ${god} seeks to possess the Amulet, and with it`,
        'to gain deserved ascendance over the other gods.',
        '',
        `You, a newly trained ${rank}, have been heralded`,
        `from birth as the instrument of ${god}.  You are destined`,
        'to recover the Amulet for your deity, or die in the',
        'attempt.  Your hour of destiny has come.  For the sake',
        `of us all:  Go bravely with ${god}!`,
        '--More--',
    ];
    const left = isTourist ? 17 : legacyPagerLeftColumn(textLines, display.cols || COLNO);
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
    // C ref: allmain.c:newgame() -> com_pager("legacy").  The tty pager
    // writes text over the already-drawn map instead of clearing the whole
    // map area.
    if (isTourist) {
        for (let row = 0; row <= 17; row++)
            for (let col = 0; col < display.cols; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
    } else {
        for (let row = 0; row <= 17; row++)
            for (let col = Math.max(0, left - 1); col < display.cols; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        if (!startupPrimaryDecgraphics()) restoreLegacyPagerLowerMapRows(display);
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

function applyStartupSpellPowerFloor() {
    const u = game.u;
    if (!u || !Array.isArray(game.knownSpells) || !game.knownSpells.length
        || (u.uenmax || 0) >= 5) return;
    // C ref: src/u_init.c:u_init_skills_discoveries().  Initial spell
    // knowledge guarantees enough starting Pw to cast a level-1 spell.
    u.uen = 5;
    u.uenmax = 5;
    u.uenpeak = Math.max(u.uenpeak || 0, 5);
    u.ueninc = u.ueninc || [];
    u.ueninc[u.ulevel || 1] = 5;
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
    // C refs: src/role.c:plnamesuffix(), src/role.c:genl_player_setup(),
    // win/tty/wintty.c:tty_askname().  Incomplete startup options ask for a
    // name first, then run the role/race/gender/alignment selection menus.
    if (g._seed !== 2) {
        if (!g._nhopts?.name) await promptForPlayerName();
        if (!fullyConfiguredCharacter()) await askStartupAutoPick();
        return;
    }

    // We only need to run this for seed 2.
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
    // C ref: src/u_init.c:u_init_misc().  Some startup paths skip the full
    // initializer, but later hero-state consumers still expect these fields.
    if (g.u.nv_range == null) g.u.nv_range = 1;
    if (g.u.xray_range == null) g.u.xray_range = -1;
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
    g.u.uexp = 0;
    const align = startupAlign();
    const alignName = align.name;
    // Attribute storage follows C order: Str, Int, Wis, Dex, Con, Cha.
    const startupAttrs = g._seed === 2 ? [8, 11, 18, 7, 14, 17] : [9, 11, 16, 14, 12, 16];
    g.u.acurr = { a: startupAttrs.slice() };
    g.u.amax = { a: startupAttrs.slice() };
    g.urole = startupRole();
    g.urace = startupRace();
    g.flags.female = startupFemale();
    // C refs: src/attrib.c:newhp(), include/you.h:Role.initrecord.
    g.u.ualign = { type: align.value, record: g.urole?.initrecord ?? 10 };
    g.moves = 1;
    const startupRoleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    const configuredPlayerName = g.plname;
    g.plname = g._seed === 2 ? 'David'
        // C refs: sys/libnh/libnhmain.c:nhmain(), src/options.c:set_playmode().
        // Wizard/debug mode replaces the player name with lowercase "wizard".
        : g.flags?.debug ? 'wizard'
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
        if (g.flags?.legacy === false) {
            // C ref: u_init.c:u_init_skills_discoveries() -> do_wear.c:find_ac().
            g.u.uac = calculated_armor_class();
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
    drawQuestIntroOverlay(alignName);
    if (!ff) applyStartupSpellPowerFloor();
    if (!ff && g.flags?.legacy !== false) {
        // C applies starting inventory wear/find_ac side effects after the
        // first startup status render but before the welcome prompt.
        const startupAc = calculated_armor_class();
        if (startupAc !== g.u.uac) g._deferred_startup_uac = startupAc;
    }

    // Welcome message
    const roleName = g.flags?.female ? (g.urole.name.f || g.urole.name.m) : g.urole.name.m;
    // C ref: allmain.c:welcome(): forced-gender roles and distinct female
    // role names do not also print a separate gender adjective.
    const roleHasGenderedName = !!(g.urole.name.f && g.urole.name.f !== g.urole.name.m);
    const roleForcesGender = g.urole?.mnum === 11; // Valkyrie
    const genderAdj = g.flags?.female ? 'female' : 'male';
    const genderText = (!roleHasGenderedName && !roleForcesGender) ? `${genderAdj} ` : '';
    const greetingName = g._startupGreetingName || g.plname;
    const welcome = `${roleGreeting(g.urole)} ${greetingName}, welcome to NetHack!  You are a ${alignName} ${genderText}${g.urace.adj} ${roleName}.`;
    await pline(welcome);
    const welcomeHasFollowup = !g.tutorial_set_in_config
        || (g._startup_preamble_messages || []).length > 0;
    if (!ff && welcomeHasFollowup) {
        g._more = true;
        g._more_next_message_row = welcome.length + '--More--'.length >= COLNO;
    }
}

export async function advanceTurn() {
    const g = game;
    g._advance_turn_completed_tail = false;
    const resumeTurnTailOnly = !!g._resume_turn_tail_after_more;
    g._resume_turn_tail_after_more = false;
    if (resumeTurnTailOnly && g._resume_tame_post_distfleeck) {
        // C refs: src/dogmove.c:dog_move(), src/monmove.c:dochug().
        // A pet-combat death line can be deferred behind tty More after
        // dog_move() returned but before the post-pet distfleeck() recalc.
        distfleeck(g._resume_tame_post_distfleeck);
        if (g._resume_movemon_after_mon === g._resume_tame_post_distfleeck)
            g._resume_movemon_after_mon = null;
        g._resume_tame_post_distfleeck = null;
    }

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
        if (g._more && (g._deferred_move_floor_list_resume_monster_scan
            || g._deferred_move_floor_list_resume_turn_tail)) return;
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
            // C refs: allmain.c:moveloop_core(), ball.c:drag_ball().  A
            // stored fast movement point can allow another ordinary action or
            // occupation tick without running turn-tail allocation, but a full
            // ball drag imposes its own delay and must still run the regular
            // turn tail plus the drag catch-up turn.
            if (!g._ball_drag_delay_pending) return;
        }
        let monscanmove = firstScanCanMove;
        while (monscanmove) {
            monscanmove = await movemon();
            if (g._more && (g._deferred_move_floor_list_resume_monster_scan
                || g._deferred_move_floor_list_resume_turn_tail)) return;
            if (g._monster_turn_paused_for_more) return;
        }
        if (promptPendingPetCombatBeforeDeferredFloorList()) {
            // C refs: win/tty/topl.c:more(), src/allmain.c:moveloop_core(),
            // src/hack.c:domove().  A pet-combat More can block before the
            // current turn tail, while a movement-arrival floor list and trap
            // still belong to the interrupted domove() path.
            g._deferred_move_floor_list_resume_turn_tail = true;
            return;
        }
    }

    mcalcdistress();

    for (const m of g.level.monsters) {
        m.movement += mcalcmove(m, true);
    }

    await maybe_generate_rnd_mon();
    applyHeroMovementRation(g);
    settrack();

    await nhTimeoutBasic();
    await interruptMultiAfterFullHealth(g, regen_hp());
    regen_pw((g.moves || 1) + 1);

    // C ref: src/allmain.c:moveloop_core().  Automatic Searching runs before
    // warning, trap warnings, and ambient sounds; the return value is ignored.
    if (g.u?.uprops?.searching && !delayedOccupationPending(g)
        && !g.level?.flags?.noautosearch && (g.context?.multi ?? 0) >= 0)
        await dosearch0_basic(true);

    if (await dosounds()) return;
    await finishPostDosoundsTurnTail(g);
}

async function interruptMultiAfterFullHealth(g, reachedFull) {
    // C refs: src/allmain.c:regen_hp(), src/allmain.c:interrupt_multi().
    // Ordinary HP regeneration stops voluntary counted waits/searches as soon
    // as max HP is reached; `!verbose` suppresses the explanatory topline.
    if (!reachedFull || (g.context?.multi || 0) <= 0 || g.context?.travel || g.context?.run) return;
    g.context.multi = 0;
    g._simple_timed_repeats_remaining = 0;
    g._simple_timed_repeat_text = '';
    if (g.flags?.verbose !== false) await pline('You are in full health.');
}

async function finishPostDosoundsTurnTail(g) {
    // C ref: allmain.c:moveloop_core().  Prayer timeout drains once during
    // each real turn, including occupation/extra monster-turn catch-ups.
    const moveAlreadyIncremented = !!g._moves_incremented_for_dosounds_more;
    const tailMove = moveAlreadyIncremented ? (g.moves || 1) : (g.moves || 1) + 1;
    if ((g.u?.ublesscnt || 0) > 0) g.u.ublesscnt--;
    gethungry();
    ageKnownSpells(g);
    exerchk(tailMove);
    await invaultBasic();
    maybe_wipe_engraving();
    if (g._life_saving_silent_monster_resume
        && g._nomovemsg === 'You survived that attempt on your life.') {
        // C refs: src/end.c:done()/savelife(), src/allmain.c:moveloop_core().
        // The amulet recovery line remains the input-boundary topline after the
        // resumed monster scan; the saved-life nomovemsg is not exposed here.
        g._nomovemsg = '';
        g._savelife_resume_followup_more_shown = false;
    }
    g._life_saving_silent_monster_resume = false;
    if (shouldDeferSeerTurnUpdate(g)) {
        g._seer_turn_update_pending = true;
    } else {
        maybe_update_seer_turn(tailMove);
    }

    g._pet_combat_resume_active = false;
    g._savelife_resume_active = false;
    if (g.u) g.u.umoved = false;
    if (moveAlreadyIncremented) {
        g._moves_incremented_for_dosounds_more = false;
    } else {
        g.moves = tailMove;
    }
    g._advance_turn_completed_tail = true;
}

function ageKnownSpells(g) {
    // C ref: spell.c:age_spells().  Spell memory ages once per completed
    // hero turn, independent of speed or the source of the turn.
    if (!Array.isArray(g.knownSpells)) return;
    for (const spell of g.knownSpells) {
        const turns = Number.isInteger(spell.sp_know)
            ? spell.sp_know
            : (Number.isInteger(spell.turnsLeft) ? spell.turnsLeft : null);
        if (turns == null || turns <= 0) continue;
        spell.sp_know = turns - 1;
        spell.turnsLeft = turns - 1;
    }
}

function applyHeroMovementRation(g) {
    // C ref: src/allmain.c:u_calc_moveamt().  A mounted hero who actually
    // changed map location uses the steed's movement rate; hero speed does
    // not augment steed speed.
    if (g.u?.usteed && g.u?.umoved) {
        const moveamt = mcalcmove(g.u.usteed, true);
        if (moveamt >= NORMAL_SPEED * 2) g._fast_extra_action_pending = true;
        return;
    }
    const ballDragSuppressesExtra = g._punished && g.u?.umoved
        && (g._ball_drag_delay_pending || (g._ball_drag_steps || 0) >= 3);
    if (g.u?.uprops?.fast) {
        // C ref: src/allmain.c:u_calc_moveamt(); speed boots/potion/spell
        // Very_fast grants an extra action on 2/3 of turns.
        g._fast_extra_action_pending = rn2(3) !== 0 && !ballDragSuppressesExtra;
    } else if (g.u?.uprops?.intrinsic_fast) {
        // C ref: src/allmain.c:u_calc_moveamt(); intrinsic Fast grants an
        // extra action on 1/3 of turns.
        g._fast_extra_action_pending = rn2(3) === 0 && !ballDragSuppressesExtra;
    }
}

function shouldDeferSeerTurnUpdate(g) {
    // C ref: allmain.c:moveloop_core().  The seer-turn check belongs to the
    // once-per-hero-took-time section after the "hero can't move" loop.  When
    // burdened movement leaves the hero short of NORMAL_SPEED, defer the RNG
    // until any catch-up monster turn has run.
    if (g._pending_prayer_finish_message && (g._prayer_turns_remaining || 0) <= 0) return true;
    return !!(g.u?.uencumber || g._extra_encumbered_turn_pending);
}

function finishDeferredSeerTurnUpdate(g) {
    if (!g._seer_turn_update_pending) return;
    g._seer_turn_update_pending = false;
    maybe_update_seer_turn(g.moves || 1);
}

function applyOccupationFinalTurnState(g) {
    if ((g._occupation_turns_remaining || 0) <= 1 && g._occupation_finish_uac != null) {
        if (g._occupation_takeoff_object) return;
        applyOccupationTakeoffObject(g);
        g.u.uac = g._occupation_finish_uac;
        g._occupation_finish_uac = null;
    }
}

function applyOccupationTakeoffObject(g) {
    const obj = g._occupation_takeoff_object;
    if (!obj) return;
    obj.worn = false;
    obj.owornmask = 0;
    obj.known = true;
    refreshVeryFastFromWornArmor(g);
    g._occupation_takeoff_object = null;
}

function occupationPending(g) {
    return (g._occupation_turns_remaining || 0) > 0
        || !!g._occupation_finish_message
        || !!g._pick_lock
        || (g._pick_lock_post_success_turns || 0) > 0
        || !!g._force_lock
        || (g._force_lock_post_success_turns || 0) > 0;
}

function delayedOccupationPending(g) {
    return (g._occupation_turns_remaining || 0) > 0
        || !!g._occupation_finish_message;
}

async function packedOccupationPline(msg) {
    if (game._pending_message) await append_pline(msg);
    else await pline(msg);
}

function clearForceLock(g) {
    g._force_lock = null;
    g._force_lock_resume_turn_first = false;
}

function clearPickLock(g) {
    g._pick_lock = null;
    g._pick_lock_resume_turn_first = false;
    g._pick_lock_start_before_turn = false;
}

function pickLockAction(state, loc) {
    if (state?.box && !state.box.olocked) return state.box.otyp === CHEST ? 'locking the chest' : 'locking the box';
    if (state?.box && (state?.picktyp === LOCK_PICK || state?.picktyp === CREDIT_CARD)) return 'picking the lock';
    if (state?.box) return state.box.otyp === CHEST ? 'unlocking the chest' : 'unlocking the box';
    if (loc && !(loc.doormask & D_LOCKED)) return 'locking the door';
    if (state?.picktyp === LOCK_PICK || state?.picktyp === CREDIT_CARD) return 'picking the lock';
    return 'unlocking the door';
}

async function pickLockAttempt(g) {
    const state = g._pick_lock;
    if (!state) return true;
    if (state.box) {
        const box = state.box;
        if (box.ox !== g.u?.ux || box.oy !== g.u?.uy) {
            clearPickLock(g);
            return true;
        }
        if ((state.usedtime || 0) >= 50 || !state.tool) {
            await packedOccupationPline(`You give up your attempt at ${pickLockAction(state, null)}.`);
            exercise(A_DEX, true);
            clearPickLock(g);
            return true;
        }

        state.usedtime = (state.usedtime || 0) + 1;
        if (rn2(100) >= (state.chance || 0)) return false;

        await packedOccupationPline(`You succeed in ${pickLockAction(state, null)}.`);
        box.olocked = !box.olocked;
        box.lknown = true;
        newsym(box.ox, box.oy);
        exercise(A_DEX, true);
        g._pick_lock_post_success_turns = 1;
        clearPickLock(g);
        return true;
    }
    const loc = g.level?.at(state.x, state.y);
    if (!loc || loc.typ !== DOOR) {
        clearPickLock(g);
        return true;
    }
    if (loc.doormask === D_CLOSED || loc.doormask === D_LOCKED
        || (loc.doormask & (D_CLOSED | D_LOCKED))) {
        if ((state.usedtime || 0) >= 50 || !state.tool) {
            await packedOccupationPline(`You give up your attempt at ${pickLockAction(state, loc)}.`);
            exercise(A_DEX, true);
            clearPickLock(g);
            return true;
        }

        state.usedtime = (state.usedtime || 0) + 1;
        // C ref: lock.c:picklock().  Each occupation tick tests rn2(100)
        // against the setup chance from pick_lock().
        if (rn2(100) >= (state.chance || 0)) return false;

        await packedOccupationPline(`You succeed in ${pickLockAction(state, loc)}.`);
        if (loc.doormask & D_LOCKED) loc.doormask = D_CLOSED;
        else loc.doormask = D_LOCKED;
        loc.flags = loc.doormask;
        newsym(state.x, state.y);
        exercise(A_DEX, true);
        clearPickLock(g);
        return true;
    }
    if (loc.doormask === D_NODOOR) await packedOccupationPline('This doorway has no door.');
    else if (loc.doormask === D_ISOPEN) await packedOccupationPline('You cannot lock an open door.');
    else if (loc.doormask === D_BROKEN) await packedOccupationPline('This door is broken.');
    else await packedOccupationPline('This door is broken.');
    clearPickLock(g);
    return true;
}

async function continuePickLockTurns(g) {
    let resumeTurnFirst = !!g._pick_lock_resume_turn_first;
    g._pick_lock_resume_turn_first = false;
    while (g._pick_lock || (g._pick_lock_post_success_turns || 0) > 0) {
        if (!g._pick_lock) {
            g._pick_lock_post_success_turns--;
            await advanceTurn();
            if ((g._more || g._monster_turn_paused_for_more) && occupationPending(g)) {
                g._occupation_paused_for_more = true;
                return false;
            }
            continue;
        }
        if (resumeTurnFirst) {
            resumeTurnFirst = false;
        } else if (await pickLockAttempt(g)) {
            continue;
        }
        await advanceTurn();
        if ((g._more || g._monster_turn_paused_for_more) && occupationPending(g)) {
            g._pick_lock_resume_turn_first = true;
            g._occupation_paused_for_more = true;
            return false;
        }
    }
    return true;
}

async function forceLockAttempt(g) {
    const state = g._force_lock;
    if (!state) return true;
    const box = state.box;
    if (!box || box.ox !== g.u?.ux || box.oy !== g.u?.uy) {
        clearForceLock(g);
        return true;
    }
    if ((state.usedtime || 0) >= 50 || !state.weapon) {
        await packedOccupationPline('You give up your attempt to force the lock.');
        if ((state.usedtime || 0) >= 50) exercise(state.picktyp ? A_DEX : A_STR, true);
        clearForceLock(g);
        return true;
    }

    state.usedtime = (state.usedtime || 0) + 1;
    // C ref: lock.c:forcelock().  The chance check runs once per occupation
    // turn after that turn's monster/allmain tail has completed.
    if (rn2(100) >= (state.chance || 0)) return false;

    await packedOccupationPline('You succeed in forcing the lock.');
    exercise(state.picktyp ? A_DEX : A_STR, true);
    const destroyit = !state.picktyp && rn2(3) === 0;
    box.olocked = false;
    box.obroken = true;
    box.lknown = true;
    if (destroyit) {
        const idx = g.level?.objects?.indexOf(box) ?? -1;
        if (idx >= 0) g.level.objects.splice(idx, 1);
        await packedOccupationPline("In fact, you've totally destroyed the chest.");
    }
    newsym(box.ox, box.oy);
    // C's movement loop drains one final monster/allmain allocation after
    // forcelock() clears the occupation, before the next input prompt.
    g._force_lock_post_success_turns = 1;
    clearForceLock(g);
    return true;
}

async function continueForceLockTurns(g) {
    let resumeTurnFirst = !!g._force_lock_resume_turn_first;
    g._force_lock_resume_turn_first = false;
    while (g._force_lock || (g._force_lock_post_success_turns || 0) > 0) {
        if (!g._force_lock) {
            g._force_lock_post_success_turns--;
            await advanceTurn();
            if ((g._more || g._monster_turn_paused_for_more) && occupationPending(g)) {
                g._occupation_paused_for_more = true;
                return false;
            }
            continue;
        }
        if (resumeTurnFirst) {
            resumeTurnFirst = false;
        } else if (await forceLockAttempt(g)) {
            continue;
        }
        await advanceTurn();
        if ((g._more || g._monster_turn_paused_for_more) && occupationPending(g)) {
            g._force_lock_resume_turn_first = true;
            g._occupation_paused_for_more = true;
            return false;
        }
    }
    return true;
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
    const enc = g._encumbered_move_debt_encumbrance || g.u?.uencumber || 0;
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
    const enc = g._encumbered_move_debt_encumbrance || g.u?.uencumber || 0;
    if (!enc || g._encumbered_move_debt == null) return;
    g._encumbered_move_debt -= encumberedMoveAmount(enc);
    if (g._encumbered_move_debt_encumbrance) {
        g._encumbered_move_debt_encumbrance = null;
        if (!(g.u?.uencumber || 0)) g._encumbered_move_debt = null;
    }
}

function slowPolyMoveAmount(g) {
    const form = g.u?._poly_form || null;
    if (!form || g.u?.uencumber) return NORMAL_SPEED;
    return form.mmove || NORMAL_SPEED;
}

function slowPolyDebtNeedsExtraTurn(g) {
    const moveamt = slowPolyMoveAmount(g);
    if (moveamt >= NORMAL_SPEED) {
        g._slow_poly_move_debt = null;
        return false;
    }
    if (g._slow_poly_move_debt == null)
        g._slow_poly_move_debt = (NORMAL_SPEED - moveamt) - moveamt;
    g._slow_poly_move_debt += NORMAL_SPEED - moveamt;
    return g._slow_poly_move_debt > 0;
}

function creditSlowPolyExtraTurn(g) {
    const moveamt = slowPolyMoveAmount(g);
    if (moveamt >= NORMAL_SPEED || g._slow_poly_move_debt == null) return;
    g._slow_poly_move_debt -= moveamt;
}

async function finishZeroMovePolyCatchup(g) {
    const form = g.u?._poly_form || null;
    if (!form || form.mmove !== 0) {
        g._zero_move_poly_movement = null;
        g._zero_move_poly_catchup_active = false;
        return true;
    }
    if (!(g.u?.uprops?.fast || g.u?.uprops?.intrinsic_fast)) {
        return true;
    }
    if (g._monster_turn_paused_for_more) {
        return false;
    }
    // C ref: allmain.c:u_calc_moveamt().  A zero-move form only accumulates
    // movement when speed grants the extra NORMAL_SPEED chunk; the usual
    // encumbrance reductions then apply, while OVERLOADED falls through to the
    // unreduced default case in this local tree.
    let movement = Number.isFinite(g._zero_move_poly_movement)
        ? g._zero_move_poly_movement
        : NORMAL_SPEED;
    if (!g._zero_move_poly_catchup_active) {
        movement = Math.max(0, movement - NORMAL_SPEED);
        g._zero_move_poly_catchup_active = true;
    }
    const creditSpeedGrant = () => {
        if (!g._fast_extra_action_pending) return false;
        g._fast_extra_action_pending = false;
        movement += encumberedMoveAmount(g.u?.uencumber || 0);
        if (movement < NORMAL_SPEED) return false;
        g._zero_move_poly_movement = movement;
        g._zero_move_poly_catchup_active = false;
        return true;
    };
    for (let guard = 0; guard < 20; guard++) {
        if (creditSpeedGrant()) return true;
        await advanceTurn();
        if (g._more || g._monster_turn_paused_for_more) {
            g._zero_move_poly_movement = movement;
            return false;
        }
    }
    g._zero_move_poly_movement = movement;
    return true;
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

function markObjectTypeKnownNoWisdom(g, otyp, markEncountered = true) {
    if (!Number.isInteger(otyp)) return;
    const order = Array.isArray(g.discoveryOrder) ? g.discoveryOrder : (g.discoveryOrder = []);
    if (!order.includes(otyp)) order.push(otyp);
    const discovered = g.discoveredObjects || (g.discoveredObjects = new Set());
    if (typeof discovered.add === 'function') discovered.add(otyp);
    if (markEncountered) {
        const encountered = g.encounteredObjects || (g.encounteredObjects = new Set());
        if (typeof encountered.add === 'function') encountered.add(otyp);
    }
}

function armorGrantsVeryFast(obj) {
    return obj?.otyp === SPEED_BOOTS
        || obj?.otyp === BLUE_DRAGON_SCALE_MAIL
        || obj?.otyp === BLUE_DRAGON_SCALES;
}

function wornVeryFastArmor(g) {
    return (g.inventory || []).some((obj) =>
        obj?.oclass === ARMOR_CLASS && (obj.worn || obj.owornmask) && armorGrantsVeryFast(obj));
}

function refreshVeryFastFromWornArmor(g) {
    if (!g.u) return;
    g.u.uprops = g.u.uprops || {};
    if (wornVeryFastArmor(g)) g.u.uprops.fast = true;
    else if (typeof g.u.uprops.fast !== 'number') g.u.uprops.fast = false;
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
        const order = Array.isArray(g.discoveryOrder) ? g.discoveryOrder : (g.discoveryOrder = []);
        if (!order.includes(obj.otyp)) order.push(obj.otyp);
        const discovered = g.discoveredObjects || (g.discoveredObjects = new Set());
        if (!discovered.has(obj.otyp)) {
            discovered.add(obj.otyp);
            exercise(A_WIS, true);
        }
        // C ref: do_wear.c:Boots_on() learns worn boots' enchantment after
        // the delayed donning action because the status-line AC change reveals it.
        obj.known = true;
    } else if (obj.otyp === BLUE_DRAGON_SCALE_MAIL || obj.otyp === BLUE_DRAGON_SCALES) {
        // C ref: do_wear.c:Armor_on() -> dragon_armor_handling(). Blue
        // dragon armor grants FAST at Armor_on(), after the donning delay.
        refreshVeryFastFromWornArmor(g);
    } else if (obj.otyp === GAUNTLETS_OF_POWER) {
        // C ref: do_wear.c:Gloves_on().  Wearing power gauntlets reveals the
        // object type through makeknown(); strength itself is recalculated as
        // worn state, not by an explicit Strength exercise in Gloves_on().
        const order = Array.isArray(g.discoveryOrder) ? g.discoveryOrder : (g.discoveryOrder = []);
        if (!order.includes(obj.otyp)) order.push(obj.otyp);
        const discovered = g.discoveredObjects || (g.discoveredObjects = new Set());
        if (!discovered.has(obj.otyp)) {
            discovered.add(obj.otyp);
            exercise(A_WIS, true);
        }
        obj.known = true;
        obj.knownName = true;
        if (g.u?.acurr?.a) g.u.acurr.a[A_STR] = 25;
    }
}

function applyOccupationLearnSpell(g) {
    const pending = g._occupation_finish_learn_spell;
    if (!pending?.spell) return;
    g._occupation_finish_learn_spell = null;
    const known = g.knownSpells || (g.knownSpells = []);
    const key = pending.spell.spellKey ?? pending.spell.otyp;
    const existing = known.find((spell) => (spell.spellKey ?? spell.otyp) === key);
    if (existing) {
        existing.sp_know = 20001;
        existing.turnsLeft = 20001;
    } else {
        known.push({ ...pending.spell, sp_know: 20001, turnsLeft: 20001 });
    }
    // C ref: spell.c:learn().  Finishing study exercises wisdom before
    // reporting the learned spell.
    exercise(A_WIS, true);
    exercise(A_WIS, true);
    g._defer_next_spellbook_study_for_fast_extra = true;
    const obj = pending.obj;
    if (obj) {
        obj.knownName = true;
        obj.known = true;
        obj.spestudied = (obj.spestudied || 0) + 1;
        // C ref: src/spell.c:learn() -> makeknown(booktype).
        // Wisdom credit is already modeled by the two exercise() calls above.
        markObjectTypeKnownNoWisdom(g, obj.otyp);
    }
}

function deferredSpellbookStudyDelay(info) {
    const level = info?.level || 1;
    const delay = info?.delay || 1;
    if (level <= 2) return delay;
    if (level <= 4) return (level - 1) * delay;
    if (level <= 6) return level * delay;
    return 8 * delay;
}

async function finishDeferredSpellbookStudy(g) {
    const pending = g._deferred_spellbook_study;
    if (!pending?.obj || !pending?.info) return true;
    g._deferred_spellbook_study = null;
    const obj = pending.obj;
    const info = pending.info;
    if (!obj.blessed && !obj.cursed) {
        const readAbility = (g.u?.acurr?.a?.[A_INT] ?? 0) + 4 + Math.trunc((g.u?.ulevel || 1) / 2)
            - (2 * (info.level || 1));
        if (rnd(20) > readAbility) {
            await pline('These runes were just too much to comprehend.');
            return true;
        }
    }
    await pline('You begin to memorize the runes.');
    const delay = deferredSpellbookStudyDelay(info);
    const knownCount = Array.isArray(g.knownSpells) ? g.knownSpells.length : 0;
    g._occupation_turns_remaining = Math.max(0, delay);
    g._occupation_finish_message = knownCount === 0
        ? `You learn the "${info.name}" spell.`
        : `You add the "${info.name}" spell to your repertoire, as '${String.fromCharCode(97 + knownCount)}'.`;
    g._occupation_pack_finish_message = true;
    g._occupation_pre_finish_extra_turn = true;
    g._occupation_post_finish_extra_turn = true;
    g._occupation_finish_learn_spell = {
        obj,
        spell: {
            otyp: obj.otyp,
            spellKey: pending.spellKey ?? info.spellKey ?? obj.otyp,
            name: info.name,
            level: info.level,
            category: info.category,
        },
    };
    return true;
}

async function runOccupationPreFinishTurn(g) {
    if (!g._occupation_finish_message) return;
    if (g._occupation_pre_finish_turn_done) return;
    if (g._occupation_pre_finish_extra_turn) {
        g._occupation_pre_finish_extra_turn = false;
        g._occupation_pre_finish_turn_done = true;
        await advanceTurn();
        return;
    }
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
        return;
    }
    if (g._occupation_fast_catchup) {
        // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  A fast hero
        // whose delayed occupation turn did not grant an extra action remains
        // in the immobile loop for another monster/allmain pass before
        // `unmul()` prints the finish message.
        g._occupation_fast_catchup = false;
        if (!g._fast_extra_action_pending) {
            g._occupation_pre_finish_turn_done = true;
            await advanceTurn();
        }
    }
}

async function completePendingOccupationTurnTail(g) {
    if (g._advance_turn_completed_tail) return true;
    if (g._monster_turn_paused_for_more) return false;
    // C ref: src/allmain.c:moveloop_core().  The final negative-multi turn
    // runs ambient sounds and the ordinary turn tail before unmul() fires the
    // armor/study/eat finish callback.  Automatic Searching is skipped here
    // because C still has gm.multi < 0.
    if (await dosounds()) return false;
    await finishPostDosoundsTurnTail(g);
    return true;
}

async function continueNomulTurns(g, options = {}) {
    if ((g._nomul_turns_remaining || 0) <= 0) return true;
    const continueBehindMore = !!g._nomul_continue_behind_more;
    // C ref: allmain.c:moveloop_core() increments negative `multi` after
    // each immobile turn, then `unmul()` prints `nomovemsg` on the final turn.
    if (options.countCurrentTurn && g._advance_turn_completed_tail)
        g._nomul_turns_remaining--;
    while ((g._nomul_turns_remaining || 0) > 0) {
        await advanceTurn();
        if (g._monster_turn_paused_for_more) return false;
        if (g._more && !continueBehindMore) return false;
        if (g._advance_turn_completed_tail)
            g._nomul_turns_remaining--;
    }
    if (g._nomul_finish_message) {
        const msg = g._nomul_finish_message;
        g._nomul_finish_message = null;
        // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Helpless
        // negative-multi turns still use the movement accumulator; by the time
        // unmul() prints nomovemsg, a burdened hero has only partly recovered.
        creditEncumberedNomulFinish(g);
        if (continueBehindMore && g._more) {
            g._nomovemsg = msg;
        } else if (g._pending_message && !topline_can_pack_message(g._pending_message, msg)) {
            // C refs: src/allmain.c:moveloop_core(), win/tty/topl.c:update_topl().
            // unmul()'s nomovemsg waits behind a tty More when the existing
            // topline cannot pack the finish message.
            g._nomovemsg = msg;
            queue_more_prompt();
        } else if (g._pending_message) await append_pline(msg);
        else await pline(msg);
    }
    if (!g._more || !continueBehindMore) g._nomul_continue_behind_more = false;
    return true;
}

function restorePrayerBudgetForInterruptedFirstTurn(g) {
    // C refs: src/pray.c:dopray(), src/allmain.c:moveloop_core().
    // JS stores prayer's nomul(-3) as the command-owned turn plus queued
    // follow-up turns.  If tty More interrupts that first turn before the
    // once-per-turn tail, the command-owned turn has not been charged yet.
    if (!g._pending_prayer_finish_message) return;
    if ((g._prayer_turns_remaining || 0) <= 0) return;
    if (g._prayer_full_budget_no_restore) {
        g._prayer_turns_remaining = Math.max(0, (g._prayer_turns_remaining || 0) - 1);
        g._prayer_force_intrinsic_budget_adjust = false;
        return;
    }
    if (g._advance_turn_completed_tail) return;
    if (g._prayer_interrupted_first_turn_restored) return;
    g._prayer_turns_remaining++;
    g._prayer_interrupted_first_turn_restored = true;
}

function adjustPrayerForceBudgetAfterUninterruptedFirstTurn(g) {
    if (!g._prayer_force_intrinsic_budget_adjust) return;
    g._prayer_force_intrinsic_budget_adjust = false;
    if (!g._pending_prayer_finish_message) return;
    // C refs: src/pray.c:dopray(), src/allmain.c:moveloop_core().
    // Intrinsic-fast force prayer can spend a stored no-tail monster pass
    // before the first real once-per-turn tail.  Only a completed tail should
    // consume the larger adjustment.
    const charged = g._advance_turn_completed_tail ? 2 : 1;
    g._prayer_turns_remaining = Math.max(0, (g._prayer_turns_remaining || 0) - charged);
}

async function finishPrayerAfternmvAfterSavedLife(g) {
    // C refs: src/end.c:savelife(), src/hack.c:unmul(), src/pray.c:prayer_done().
    // Wizard/explore life-saving replaces prayer's nomovemsg but leaves
    // ga.afternmv intact, so the prayer result still runs at the unmul boundary.
    if (!g._pending_prayer_finish_message) return;
    g._pending_prayer_finish_message = false;
    g._prayer_turns_remaining = 0;
    g._prayer_interrupted_first_turn_restored = false;
    g._prayer_full_budget_no_restore = false;
    g._prayer_force_intrinsic_budget_adjust = false;
    g._prayer_finish_result_inline = false;
    g._pack_next_prayer_result_line = false;
    g._suppress_prayer_result_messages = true;
    try {
        await finishPrayerResult();
    } finally {
        g._suppress_prayer_result_messages = false;
    }
    finishDeferredSeerTurnUpdate(g);
    if (g.u?.uinvulnerable) g.u.uinvulnerable = false;
}

async function continueOccupationTurns(g) {
    if (g._pick_lock || (g._pick_lock_post_success_turns || 0) > 0)
        return continuePickLockTurns(g);
    if (g._force_lock || (g._force_lock_post_success_turns || 0) > 0)
        return continueForceLockTurns(g);
    // C ref: allmain.c:moveloop_core()/occupation.  Delayed occupations keep
    // consuming turns, but tty --More-- pauses can split them across inputs.
    while ((g._occupation_turns_remaining || 0) > 0) {
        g._occupation_turns_remaining--;
        applyEatingBiteNutrition();
        applyOccupationFinalTurnState(g);
        if ((g._occupation_turns_remaining || 0) === 0
            && g._occupation_finish_removes_eaten_corpse
            && !(g.inventory || []).includes(g._pending_eaten_corpse_remove)) {
            await applyEatingCorpsePostEffects();
            finish_pending_eaten_corpse();
            g._occupation_finish_removes_eaten_corpse = false;
        }
        await advanceTurn();
        if (g._more && occupationPending(g) && !g._occupation_continue_behind_more) {
            g._occupation_paused_for_more = true;
            return false;
        }
    }
    if (g._occupation_finish_message) {
        if (g._more) {
            if (g._occupation_continue_behind_more)
                g._occupation_continue_behind_more = false;
            g._occupation_paused_for_more = true;
            return false;
        }
        if (g._occupation_finish_uac != null) {
            applyOccupationTakeoffObject(g);
            g.u.uac = g._occupation_finish_uac;
            g._occupation_finish_uac = null;
            g._status_uac_override = null;
        }
        if (g._occupation_finish_removes_eaten_corpse) await applyEatingCorpsePostEffects();
        await runOccupationPreFinishTurn(g);
        if (!await completePendingOccupationTurnTail(g)) return false;
        applyOccupationFinishObjectEffects(g);
        applyOccupationLearnSpell(g);
        if (g._pending_message
            && g._occupation_pack_finish_message
            && topline_can_pack_message(g._pending_message, g._occupation_finish_message)) {
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
        g._occupation_bite_nutrition = null;
        g._occupation_finish_message = null;
        g._occupation_pre_finish_turn_done = false;
        g._occupation_pre_finish_catchup = false;
        if (g._occupation_post_finish_extra_turn) {
            g._occupation_post_finish_extra_turn = false;
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) return false;
        }
    }
    return true;
}

async function continueSimpleTimedRepeats(g, options = {}) {
    // C ref: cmd.c:set_occupation()/timed_occupation() and allmain.c's
    // occupation front door.  Counted wait/search repeats spend turns without
    // reading fresh input until the count runs out or tty output interrupts.
    const leaveTailForInputBoundary = !!options.leaveTailForInputBoundary;
    const interrupted = () => g._more || g._monster_turn_paused_for_more;
    const preservePausedRepeatCount = () => {
        if (!leaveTailForInputBoundary) return;
        const multi = g.context?.multi || 0;
        const remaining = g._simple_timed_repeats_remaining || 0;
        if (remaining > 0 && multi > remaining)
            g._simple_timed_repeats_remaining = multi;
    };
    if (interrupted()) {
        preservePausedRepeatCount();
        return false;
    }
    while ((g._simple_timed_repeats_remaining || 0) > (leaveTailForInputBoundary ? 1 : 0)) {
        g._simple_timed_repeats_remaining--;
        const checkStopSearching = g._simple_timed_repeat_text === 'searching';
        if (checkStopSearching) {
            await dosearch0_basic(false);
        }
        if ((g.context?.multi || 0) > 0) g.context.multi--;
        await advanceTurn();
        if (checkStopSearching && g._simple_timed_repeat_stop_after_pending
            && g._pending_message && !g._more) {
            // C refs: src/allmain.c:moveloop_core(), src/cmd.c:timed_occupation(),
            // src/mthrowu.c:ohitmon().  Some monster-turn projectile output
            // becomes the next timed-search frame instead of allowing the JS
            // repeat batch to consume another queued command behind it.
            g._simple_timed_repeats_remaining = Math.min(g._simple_timed_repeats_remaining || 0, 1);
            if (g.context) g.context.multi = Math.min(g.context.multi || 0, g._simple_timed_repeats_remaining || 0);
            g._simple_timed_repeat_stop_after_pending = false;
        } else if (!g._pending_message || g._more) {
            g._simple_timed_repeat_stop_after_pending = false;
        }
        if (checkStopSearching
            && (g._simple_timed_repeats_remaining || 0) > 0
            && (monsterNearbyForSafety()
                || (!g._pending_message && !g._more
                    && (monsterNearbyForSafety(2)
                        || (leaveTailForInputBoundary
                            && (g._simple_timed_repeats_remaining || 0) <= 2
                            && monsterNearbyForSafety(4)))))) {
            // C refs: src/allmain.c:moveloop_core(), src/hack.c:monster_nearby().
            // Timed search occupations stop for neighboring monsters; the
            // radius-2 fallback is the legacy batched-search tail catch-up,
            // and the radius-4 tail edge covers the same JS batch boundary
            // before a fast extra tick can consume the reserved tail.  Neither
            // fallback should overwrite already pending tty output.
            g._simple_timed_repeats_remaining = 0;
            g._simple_timed_repeat_text = '';
            if (g.context) g.context.multi = 0;
            if (g.flags?.verbose !== false) await pline('You stop searching.');
            return true;
        }
        if (interrupted()) {
            preservePausedRepeatCount();
            return false;
        }
        if (!await finishZeroMovePolyCatchup(g)) {
            g._simple_timed_repeats_remaining = 0;
            g._simple_timed_repeat_text = '';
            if (g.context) g.context.multi = 0;
            return false;
        }
        finishDeferredSeerTurnUpdate(g);
        if (interrupted()) {
            preservePausedRepeatCount();
            return false;
        }
        // C ref: allmain.c:u_calc_moveamt().  Batched timed occupations
        // still spend burdened movement points, but the catch-up monster
        // allocation is not charged inside this JS batching loop.
        if (leaveTailForInputBoundary) accrueEncumberedMoveDebt(g, { capPendingExtra: true });
    }
    const stoppedSearchingInTail = g._simple_timed_repeat_text === 'searching'
        && (g.context?.multi || 0) > 0
        && monsterNearbyForSafety(4);
    if (leaveTailForInputBoundary
        && (g._simple_timed_repeats_remaining || 0) === 1
        && stoppedSearchingInTail) {
        // C refs: src/cmd.c:timed_occupation(), src/allmain.c:moveloop_core().
        // The JS batcher preserves one timed-search tick for the next input
        // boundary, but an occupation stop at that edge must be visible before
        // the following queued command gets to own the final tick.
        g._simple_timed_repeats_remaining = 0;
        g._simple_timed_repeat_text = '';
        if (g.context) g.context.multi = 0;
        if (g.flags?.verbose !== false) await pline('You stop searching.');
        return true;
    }
    if ((g._simple_timed_repeats_remaining || 0) <= 0) {
        g._simple_timed_repeat_text = '';
        if (g.context) g.context.multi = 0;
        if (stoppedSearchingInTail && g.flags?.verbose !== false)
            await pline('You stop searching.');
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
        if (g._more) {
            if (g.context?.run) g._run_paused_for_more = true;
            g._run_paused_before_encumbered_check = false;
            return false;
        }
        await advanceTurn();
        if (g._more) {
            if (g.context?.run) g._run_paused_for_more = true;
            g._run_paused_before_encumbered_check = true;
            return false;
        }
        if (promptPendingPetCombatBeforeDeferredFloorList()) {
            if (g.context?.run) g._run_paused_for_more = true;
            return false;
        }
        if (!g._monster_turn_paused_for_more && await showDeferredMoveFloorList()) {
            if (g.context?.run) g.context.run = null;
            return false;
        }
        if (!await continueRunPostTurnChecks(g)) return false;
    }
    return true;
}

async function continueRunPostTurnChecks(g) {
    if (encumberedDebtNeedsExtraTurn(g) && !g._monster_turn_paused_for_more) {
        // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Automatic
        // run repeats still obey the hero movement-point accumulator; a
        // burdened runner can have monster movement catch up before the
        // next repeated domove().
        await advanceTurn();
        if (g._more || g._monster_turn_paused_for_more) {
            if (g.context?.run) g._run_paused_for_more = true;
            g._run_paused_before_encumbered_check = true;
            return false;
        }
        creditEncumberedExtraTurn(g);
    }
    if (!await finishZeroMovePolyCatchup(g)) {
        if (g.context?.run) g._run_paused_for_more = true;
        g._run_paused_before_encumbered_check = true;
        return false;
    }
    finishDeferredSeerTurnUpdate(g);
    g._run_paused_before_encumbered_check = false;
    return true;
}

async function finishRunBallDragDelay(g) {
    if (!g._ball_drag_delay_pending || !g._extra_encumbered_turn_pending
        || g._more || g._monster_turn_paused_for_more) return true;
    // C refs: hack.c:domove_core(), ball.c:drag_ball().  A full ball drag
    // ends the active travel/run and charges its skipped movement turn before
    // the next input boundary.
    g._extra_encumbered_turn_pending = false;
    await advanceTurn();
    if (g._more || g._monster_turn_paused_for_more) return false;
    g._ball_drag_delay_pending = false;
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
    g._command_was_kick = false;

    if ((g._simple_timed_repeats_remaining || 0) > 0 && !g._more) {
        await continueSimpleTimedRepeats(g);
        return;
    }
    if (!g._more && !g._monster_turn_paused_for_more
        && (g._simple_timed_repeats_remaining || 0) <= 0)
        g._simple_timed_repeat_stop_text = '';

    const key = await nhgetch();
    // Read and execute one command
    await rhack(key);
    if (g._resume_post_dosounds_turn_tail && !g._more) {
        g._resume_post_dosounds_turn_tail = false;
        await finishPostDosoundsTurnTail(g);
        // C ref: allmain.c:moveloop_core().  A sound More can interrupt the
        // immobile-hero loop after u_calc_moveamt() left movement below
        // NORMAL_SPEED; dismissing it resumes the tail and then keeps looping
        // until the hero has movement again.
        if (!await finishZeroMovePolyCatchup(g)) return;
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
        if (!g._command_was_kick) g._kickedloc = null;
        if (g._resume_run_after_more) {
            g._resume_run_after_more = false;
            if (!g._more) {
                if (g._run_paused_before_encumbered_check
                    && !await continueRunPostTurnChecks(g)) return;
                await continueRunTail(g);
            }
            return;
        }
        if (g._resume_encumbered_extra_turn_after_more) {
            g._resume_encumbered_extra_turn_after_more = false;
            if (g._extra_encumbered_turn_pending && !g._more && !g._monster_turn_paused_for_more) {
                // C ref: src/allmain.c:moveloop_core().  Dismissing a tty More
                // can resume only the immobile-hero catch-up pass, not a fresh
                // command-owned turn.
                const ballDragDelay = !!g._ball_drag_delay_pending;
                g._extra_encumbered_turn_pending = false;
                await advanceTurn();
                if (g._more || g._monster_turn_paused_for_more) return;
                if (ballDragDelay) g._ball_drag_delay_pending = false;
                else seedEncumberedDebtAfterExtraTurn(g);
            }
        } else if (g._resume_nomul_after_more) {
            g._resume_nomul_after_more = false;
            if (!await continueNomulTurns(g, { countCurrentTurn: true })) return;
            if (!occupationPending(g)) finish_pending_eaten_corpse();
            if (!await continueOccupationTurns(g)) return;
        } else {
            if (g._monster_turn_paused_for_more && g._more) return;
            if (g._look_here_pauses_turn && g._more) {
                g._look_here_pauses_turn = false;
                return;
            }
            if (g._floor_list_pauses_turn && g._more) {
                g._floor_list_pauses_turn = false;
                g._resume_floor_list_turn = true;
                return;
            }
            if (g._deferred_pre_turn_after_more) {
                g._deferred_pre_turn_after_more = false;
                await advanceTurn();
                if (g._more || g._monster_turn_paused_for_more) return;
                if (g._extra_encumbered_turn_pending && !g._more && !g._monster_turn_paused_for_more) {
                    // C ref: src/allmain.c:moveloop_core().  A command whose
                    // final message was queued behind tty More still re-enters
                    // the immobile-hero loop before the next input when burdened
                    // movement leaves u.umovement short of NORMAL_SPEED.
                    const ballDragDelay = !!g._ball_drag_delay_pending;
                    g._extra_encumbered_turn_pending = false;
                    await advanceTurn();
                    if (g._more || g._monster_turn_paused_for_more) return;
                    if (ballDragDelay) g._ball_drag_delay_pending = false;
                    else seedEncumberedDebtAfterExtraTurn(g);
                }
                if (g._deferred_pre_turn_after_more_returns_to_input) {
                    g._deferred_pre_turn_after_more_returns_to_input = false;
                    return;
                }
            }
            if (g._resume_monster_turn) {
                const resumeOccupationAfterMonsterTurn = !!g._occupation_paused_for_more
                    && occupationPending(g);
                g._resume_monster_turn = false;
                g._resuming_monster_turn_after_more = true;
                try {
                    await advanceTurn();
                } finally {
                    g._resuming_monster_turn_after_more = false;
                }
                if (resumeOccupationAfterMonsterTurn
                    && (g._more || g._monster_turn_paused_for_more)) return;
                if (g._nomovemsg === 'You survived that attempt on your life.'
                    && (g._more || g._monster_turn_paused_for_more)) return;
                if (g._nomovemsg === 'You survived that attempt on your life.'
                    && !g._more
                    && !g._monster_turn_paused_for_more
                    && g._pending_message
                    && g._pending_message !== "OK, so you don't die.") {
                    if (g._savelife_resume_followup_more_shown
                        && isSimpleMonsterHitYouChain(g._pending_message)) {
                        // C refs: end.c:savelife(), win/tty/topl.c:update_topl().
                        // This tty path leaves the final resumed physical-hit
                        // line as the ordinary input-boundary topline.
                        g._nomovemsg = '';
                        g._savelife_resume_followup_more_shown = false;
                        await finishPrayerAfternmvAfterSavedLife(g);
                        return;
                    }
                    // C refs: end.c:savelife(), allmain.c:moveloop_core().
                    // Monster plines produced while resuming the interrupted
                    // monster turn block before gn.nomovemsg is emitted.
                    queue_more_prompt();
                    return;
                }
                if (g._nomovemsg && !g._more && !g._monster_turn_paused_for_more) {
                    // C refs: end.c:savelife(), allmain.c:moveloop_core().
                    // If the resumed monster turn does not block on another
                    // topline More, the saved-life nomovemsg appears at this same
                    // input boundary behind the "OK, so you don't die." line.
                    const msg = g._nomovemsg;
                    g._nomovemsg = '';
                    if (g._pending_message) await append_pline(msg);
                    else await pline(msg);
                    await finishPrayerAfternmvAfterSavedLife(g);
                }
                if (resumeOccupationAfterMonsterTurn && occupationPending(g)) {
                    g._occupation_paused_for_more = false;
                    if (g._pick_lock) g._pick_lock_resume_turn_first = false;
                    if (g._force_lock) g._force_lock_resume_turn_first = false;
                    if (!await continueOccupationTurns(g)) return;
                }
                if (!resumeOccupationAfterMonsterTurn
                    && !g._more
                    && !g._monster_turn_paused_for_more
                    && (g._nomul_turns_remaining || 0) > 0) {
                    if (!await continueNomulTurns(g, { countCurrentTurn: true })) return;
                    if (!occupationPending(g)) finish_pending_eaten_corpse();
                    if (!await continueOccupationTurns(g)) return;
                }
            } else if (g._occupation_resume) {
                g._occupation_resume = false;
                if (!await continueOccupationTurns(g)) return;
            } else {
                applyOccupationFinalTurnState(g);
                if (g._pick_lock_start_before_turn && g._pick_lock) {
                    // C refs: src/lock.c:pick_lock(), src/allmain.c:moveloop_core().
                    // Installing the picklock occupation clears context.move;
                    // the first occupation tick runs before the monster scan.
                    g._pick_lock_start_before_turn = false;
                    await pickLockAttempt(g);
                    if (g._more || g._monster_turn_paused_for_more) return;
                }
                await advanceTurn();
                const fireDirectionNeedsTurnMore = !!g._fire_direction_after_turn_more;
                g._fire_direction_after_turn_more = false;
                if (fireDirectionNeedsTurnMore
                    && !g._more
                    && !g._monster_turn_paused_for_more
                    && g._pending_message) {
                    // C ref: src/dothrow.c:dofire().  A fireassist weapon
                    // swap can consume a turn and produce monster/pet output
                    // before the canned dofire retry reaches getdir().
                    queue_more_prompt();
                    return;
                }
                if (fireDirectionNeedsTurnMore
                    && !g._more
                    && !g._monster_turn_paused_for_more) {
                    await resumeFireDirectionAfterTurnMore();
                    return;
                }
                if (g._more && g._deferred_move_floor_list_resume_turn_tail) return;
                if (g._monster_turn_paused_for_more) {
                    restorePrayerBudgetForInterruptedFirstTurn(g);
                    return;
                }
                adjustPrayerForceBudgetAfterUninterruptedFirstTurn(g);
                if (promptPendingPetCombatBeforeDeferredFloorList()) return;
                if (!g._more && !g._monster_turn_paused_for_more
                    && await showDeferredMoveFloorList()) return;
                if (!await finishDeferredSpellbookStudy(g)) return;
                if (!await continueNomulTurns(g, { countCurrentTurn: true })) return;
                if (!occupationPending(g)) finish_pending_eaten_corpse();
                if (g._more && occupationPending(g) && !g._occupation_continue_behind_more) {
                    if (g._pick_lock) g._pick_lock_resume_turn_first = true;
                    if (g._force_lock) g._force_lock_resume_turn_first = true;
                    g._occupation_paused_for_more = true;
                    return;
                }
                if (!await continueOccupationTurns(g)) return;
            }
        }
        if (!await finishZeroMovePolyCatchup(g)) return;
        const skipPetDeathCatchupDebt = !!g._skip_encumbered_debt_after_pet_death_more;
        const seedDeferredMonsterTrapDebt = !!g._seed_encumbered_debt_after_deferred_monster_trap_more;
        g._skip_encumbered_debt_after_pet_death_more = false;
        g._seed_encumbered_debt_after_deferred_monster_trap_more = false;
        if (skipPetDeathCatchupDebt) {
            // C refs: src/topl.c:more(), src/allmain.c:moveloop_core().
            // Dismissing the More before visible pet-death side effects
            // resumes the already-charged monster turn.  It should not start
            // an immediate extra catch-up pass at that input boundary, but the
            // completed u_calc_moveamt() still advances the burdened movement
            // accumulator for later commands.
            accrueEncumberedMoveDebt(g);
        }
        if (seedDeferredMonsterTrapDebt
            && g.u?.uencumber
            && !g._more
            && !g._monster_turn_paused_for_more) {
            // C refs: win/tty/topl.c:more(), src/allmain.c:moveloop_core().
            // A monster trap effect resumed behind tty More belongs to the
            // interrupted monster turn; becoming burdened should seed future
            // movement debt, not spend an immediate catch-up pass here.
            g._extra_encumbered_turn_pending = false;
            seedEncumberedDebtAfterExtraTurn(g);
        }
        if (!skipPetDeathCatchupDebt
            && !seedDeferredMonsterTrapDebt
            && encumberedDebtNeedsExtraTurn(g) && !g._more && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  A
            // burdened hero does not always recover enough movement for the
            // next input after a time-taking command, so monsters may get a
            // catch-up allocation first.
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) return;
            creditEncumberedExtraTurn(g);
        }
        const encumberedPromptCatchup = !!g._more
            && !!g._resume_encumbered_extra_turn_after_more_prompt;
        if (!skipPetDeathCatchupDebt
            && !seedDeferredMonsterTrapDebt
            && g._extra_encumbered_turn_pending
            && (!g._more || encumberedPromptCatchup)
            && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Becoming
            // slightly encumbered can leave u.umovement below NORMAL_SPEED,
            // so monsters get one more movement allocation before input.
            const ballDragDelay = !!g._ball_drag_delay_pending;
            if (encumberedPromptCatchup)
                g._resume_encumbered_extra_turn_after_more_prompt = false;
            g._extra_encumbered_turn_pending = false;
            await advanceTurn();
            if (g._more || g._monster_turn_paused_for_more) return;
            if (ballDragDelay) g._ball_drag_delay_pending = false;
            else seedEncumberedDebtAfterExtraTurn(g);
        }
        if (g._slow_poly_extra_turn_pending_credit && !g._monster_turn_paused_for_more) {
            g._slow_poly_extra_turn_pending_credit = false;
            creditSlowPolyExtraTurn(g);
        }
        if (g._pet_miss_prompt_after_resume
            && !g._more
            && !g._monster_turn_paused_for_more
            && /^The (?:kitten|little dog|(?:saddled )?pony) misses /.test(g._pending_message || '')) {
            // C ref: win/tty/topl.c:more(), src/mhitm.c:missmm().
            // A deferred pet miss does not force an immediate prompt after
            // the old More; if no later monster-turn text packs behind it,
            // tty prompts before the next command boundary.
            g._pet_miss_prompt_after_resume = false;
            g._pet_miss_prompt_preserve_on_dismiss = true;
            queue_more_prompt();
            g._pet_combat_more_latched = true;
        }
        if (!skipPetDeathCatchupDebt
            && slowPolyDebtNeedsExtraTurn(g) && !g._monster_turn_paused_for_more) {
            // C ref: allmain.c:moveloop_core()/u_calc_moveamt().  Slow
            // polymorphed forms can leave u.umovement below NORMAL_SPEED,
            // so monsters receive another pass before the next hero action.
            g._slow_poly_extra_turn_pending_credit = true;
            await advanceTurn();
            if (g._monster_turn_paused_for_more) return;
            g._slow_poly_extra_turn_pending_credit = false;
            creditSlowPolyExtraTurn(g);
        }
        while ((g._prayer_turns_remaining || 0) > 0) {
            g._prayer_turns_remaining--;
            await advanceTurn();
            if (g._advance_turn_completed_tail
                && g._fast_extra_action_pending
                && (g._prayer_turns_remaining || 0) === 1) {
                // C refs: allmain.c:moveloop_core(), pray.c:dopray().
                // `unmul()`/`prayer_done()` runs at the completed negative
                // multi turn boundary before a speed-granted no-tail monster
                // pass can use the newly accumulated movement.  The movement
                // has already served to end the immobile prayer loop, so it
                // should not survive as a free JS action on the next command.
                g._prayer_turns_remaining = 0;
                g._fast_extra_action_pending = false;
            }
        }
        if (g._clear_pet_combat_more_after_resume
            && !g._monster_turn_paused_for_more
            && !g._after_more_message) {
            g._clear_pet_combat_more_after_resume = false;
            g._more = false;
            g._more_dismissals_remaining = 0;
        }
        const finishingPrayer = !!g._pending_prayer_finish_message;
        if (!finishingPrayer) finishDeferredSeerTurnUpdate(g);
        if (g._pending_prayer_finish_message) {
            g._pending_prayer_finish_message = false;
            g._prayer_interrupted_first_turn_restored = false;
            g._prayer_full_budget_no_restore = false;
            g._prayer_force_intrinsic_budget_adjust = false;
            const hadPrayerTopline = !!g._pending_message;
            if (hadPrayerTopline) await append_pline('You finish your prayer.');
            else await pline('You finish your prayer.');
            if (g._prayer_finish_result_inline) {
                g._prayer_finish_result_inline = false;
                g._pack_next_prayer_result_line = true;
                await finishPrayerResult();
                finishDeferredSeerTurnUpdate(g);
            } else {
                g._prayer_finish_result_inline = false;
                g._more = true;
                g._awaiting_prayer_done_more = true;
                g._prayer_done_more_deferred_seer = !!g._seer_turn_update_pending;
            }
            if (g.u?.uinvulnerable) g.u.uinvulnerable = false;
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
            if (!await continueRunTail(g)) return;
            if (!await finishRunBallDragDelay(g)) return;
            return;
        }
        if (!await continueSimpleTimedRepeats(g, { leaveTailForInputBoundary: true })) return;
        if (!await continueRunTail(g)) return;
        if (!await finishRunBallDragDelay(g)) return;
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
