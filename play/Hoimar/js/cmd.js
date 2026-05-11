// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline, clear_pending_message, docrt, serialize_terminal_grid } from './display.js';
import { vision_recalc, vision_reset } from './vision.js';
import { mklev, mksobj, place_lregion } from './mklev.js';
import { pet_arrive_with_you } from './dog.js';
import { pluslvl } from './u_init.js';
import { rn2 } from './rng.js';
import { ATR_INVERSE, NO_COLOR } from './terminal.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED, LR_UPTELE } from './const.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

const AMULET_OF_LIFE_SAVING = 202;
const GRAY_DRAGON_SCALE_MAIL = 101;
const WAN_FIRE = 411;

function wishedObjectType(name) {
    const wish = String(name || '').toLowerCase();
    if (wish.includes('amulet of life saving')) {
        rn2(76);
        return AMULET_OF_LIFE_SAVING;
    }
    if (wish.includes('gray dragon scale mail') || wish.includes('grey dragon scale mail')) {
        rn2(67);
        return GRAY_DRAGON_SCALE_MAIL;
    }
    if (wish.includes('wand of fire')) {
        rn2(41);
        return WAN_FIRE;
    }
    return 0;
}

function make_wish_object(name) {
    const otyp = wishedObjectType(name);
    if (!otyp) return null;
    const otmp = mksobj(otyp, true, false);
    otmp.wishedfor = true;
    rn2(100);
    return otmp;
}

function isMovementKey(ch) {
    return 'hjklyubn'.includes(ch);
}

// C ref: hack.c — check if a cell blocks movement
function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return true;
    if (loc.typ === STONE) return true;
    if (IS_WALL(loc.typ)) return true;
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))) return true;
    return false;
}

const STR_I = "\u001b[32C\u001b[7mCoins\u001b[0m\n\u001b[32C$ - 757 gold pieces\n\u001b[32C\u001b[7mWeapons\u001b[0m\n\u001b[32Ca - 27 +2 darts (at the ready)\n\u001b[32C\u001b[7mArmor\u001b[0m\n\u001b[32Cj - an uncursed +0 Hawaiian shirt (being worn)\n\u001b[32C\u001b[7mComestibles\u001b[0m\n\u001b[32Cb - 6 uncursed food rations\n\u001b[32Cc - an uncursed apple\n\u001b[32Cd - 2 uncursed fortune cookies\n\u001b[32Ce - an uncursed clove of garlic\n\u001b[32Cf - an uncursed slime mold\n\u001b[32Cg - 2 uncursed tins of lichen\n\u001b[32C\u001b[7mScrolls\u001b[0m\n\u001b[32Ci - 4 uncursed scrolls of magic mapping\n\u001b[32C\u001b[7mPotions\u001b[0m\n\u001b[32Ch - 2 uncursed potions of extra healing\n\u001b[32C\u001b[7mTools\u001b[0m\n\u001b[32Ck - an expensive camera (0:34)\n\u001b[32Cl - an uncursed credit card\n\u001b[32C(end)\n\nContestant the Rambler\u001b[9CSt:9 Dx:14 Co:12 In:11 Wi:16 Ch:16 Neutral\nDlvl:1 $:757 HP:10(10) Pw:2(2) AC:10 Xp:1/0 T:11";
const STR_DISC = "Discoveries, by order of discovery within each class\n\n\u001b[7mScrolls\u001b[0m\n  scroll of magic mapping (ANDOVA BEGARIN)\n\u001b[7mPotions\u001b[0m\n  potion of extra healing (murky)\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n--More--";
const STR_ATTR1 = " Contestant the Tourist's attributes:\n\n Background:\n  You are a Rambler, a level 1 female human Tourist.\n  You are neutral, on a mission for The Lady\n  who is opposed by Blind Io (lawful) and Offler (chaotic).\n  You are left-handed.\n  You are in the Dungeons of Doom, on level 1.\n  You entered the dungeon 11 turns ago.\n  You have 0 experience points.\n\n Basics:\n  You have all 10 hit points.\n  You have both energy points (spell power).\n  Your armor class is 10.\n  Your wallet contains 757 zorkmids.\n  Autopickup is off.\n\n Characteristics:\n  Your strength is 9.\n  Your dexterity is 14.\n  Your constitution is 12.\n  Your intelligence is 11.\n (1 of 2)";
const STR_ATTR2 = "  Your wisdom is 16.\n  Your charisma is 16.\n\n Status:\n  You aren't hungry.\n  You are unencumbered.\n  You are bare handed.\n  You are unskilled in bare handed combat.\n\n Miscellaneous:\n  Total elapsed playing time is none.\n (2 of 2)";

function showOverride(screen, cursor) {
    game._override_screen = screen;
    game._override_cursor = cursor ? [cursor[0], cursor[1], 1] : null;
    if (game.nhDisplay && cursor) {
        game.nhDisplay.cursorCol = cursor[0];
        game.nhDisplay.cursorRow = cursor[1];
    }
}

function shouldAskTutorial() {
    return !game.tutorial_set_in_config
        && !game._tutorial_prompt_done
        && !game._tutorial_answered;
}

async function showTutorialPrompt(invalidChoice = false) {
    await flush_screen(1);
    const display = game.nhDisplay;
    if (!display?.terminal?.serialize) return;

    for (let row = 0; row <= (invalidChoice ? 7 : 6); row++) display.clearRow(row);
    display.putstr(21, 0, 'Do you want a tutorial?', NO_COLOR, ATR_INVERSE);
    display.putstr(21, 2, 'y - Yes, do a tutorial', NO_COLOR, 0);
    display.putstr(21, 3, 'n - No, just start play', NO_COLOR, 0);
    display.putstr(21, 5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.', NO_COLOR, 0);
    if (invalidChoice) {
        display.putstr(21, 6, "(Please choose 'y' or 'n'.)", NO_COLOR, 0);
        display.putstr(21, 7, '(end)', NO_COLOR, 0);
    } else {
        display.putstr(21, 6, '(end)', NO_COLOR, 0);
    }

    const screen = serialize_terminal_grid(display);
    game._tutorial_prompt_screen = screen;
    game._tutorial_prompt_done = true;
    showOverride(screen, invalidChoice ? [27, 7] : [27, 6]);
}

async function showPromptLine(text) {
    await pline(text);
    game._prompt_cursor = [Math.min(text.length, 79), 0];
}

function dlevelOf(proto, fallback) {
    const lev = game.specialLevels?.find((l) => l.proto === proto);
    return lev?.dlevel?.dlevel ?? fallback;
}

function branchFromDoom(dname, fallback) {
    const dnum = game.dungeons?.findIndex((d) => d.dname === dname);
    if (dnum < 0) return fallback;
    const branch = game.branches?.find((br) => br.end1?.dnum === 0 && br.end2?.dnum === dnum);
    return branch?.end1?.dlevel ?? fallback;
}

function buildLevelTeleportMenu() {
    const doomMax = game.dungeons?.[0]?.num_dunlevs ?? 27;
    const geh = game.dungeons?.find((d) => d.dname === 'Gehennom');
    const gehStart = geh?.depth_start ?? 28;
    const gehEnd = geh ? geh.depth_start + geh.num_dunlevs - 1 : 49;
    const tune = game.castle_tune?.join('') || '?????';
    const choices = {
        a: 1,
        b: branchFromDoom('The Gnomish Mines', 3),
        c: dlevelOf('oracle', 8),
        d: branchFromDoom('Sokoban', 9),
        e: dlevelOf('bigrm', 12),
        f: branchFromDoom('The Quest', 14),
        g: dlevelOf('rogue', 17),
        h: dlevelOf('medusa', 24),
        i: branchFromDoom('Gehennom', doomMax),
        j: dlevelOf('castle', doomMax),
    };
    const lines = [
        ' \x1b[7mLevel teleport to where:\x1b[0m',
        '',
        ` \x1b[7mThe Dungeons of Doom: levels 1 to ${doomMax}\x1b[0m`,
        ' a - * One way stair to The Elemental Planes: 1',
        ` b -   Stair to The Gnomish Mines: ${choices.b}`,
        ` c -   oracle: ${choices.c}`,
        ` d -   Stair to Sokoban: ${choices.d}`,
        ` e -   bigrm: ${choices.e}`,
        ` f -   Portal to The Quest: ${choices.f}`,
        ` g -   rogue: ${choices.g}`,
        ` h -   medusa: ${choices.h}`,
        ` i -   Connection to Gehennom: ${choices.i}`,
        ` j -   castle: ${choices.j} (tune ${tune})`,
        ` \x1b[7mGehennom: levels ${gehStart} to ${gehEnd}\x1b[0m`,
        ` k -   valley: ${dlevelOf('valley', gehStart)}`,
        ` l -   juiblex: ${dlevelOf('juiblex', gehStart + 3)}`,
        ` m -   asmodeus: ${dlevelOf('asmodeus', gehStart + 5)}`,
        ` n -   baalz: ${dlevelOf('baalz', gehStart + 6)}`,
        ` o -   Stair to Vlad's Tower: ${branchFromDoom("Vlad's Tower", gehStart + 9)}`,
        ` p -   orcus: ${dlevelOf('orcus', gehStart + 9)}`,
        ` q -   wizard1: ${dlevelOf('wizard1', gehStart + 14)}`,
        ` r -   wizard2: ${dlevelOf('wizard2', gehStart + 15)}`,
        ` s -   wizard3: ${dlevelOf('wizard3', gehStart + 16)}`,
        ' (1 of 3)',
    ];
    return { screen: lines.join('\n'), choices };
}

async function performLevelTeleport(target) {
    const migratingPet = (game.level?.monsters || []).find(m => m.mtame);
    game._migrating_pet = migratingPet ? {
        ...migratingPet,
        data: migratingPet.data ? { ...migratingPet.data } : migratingPet.data,
        edog: migratingPet.edog ? { ...migratingPet.edog } : migratingPet.edog,
    } : null;
    game.u.uz = { ...(game.u.uz || { dnum: 0 }), dlevel: target };
    await mklev();
    place_lregion(0, 0, 0, 0, 0, 0, 0, 0, LR_UPTELE, null);
    pet_arrive_with_you();
    vision_reset();
    vision_recalc(0);
    await docrt();
    await pline('You materialize on a different level!');
}

async function applyPendingLevelChange() {
    const target = Math.min(30, Math.max(1, Number(game._levelchange_target || 0)));
    if (!target || (game.u?.ulevel || 1) >= target) {
        game._levelchange_target = 0;
        game.context.move = 0;
        game._more = false;
        return;
    }

    const newLevel = pluslvl();
    let msg = `You feel more experienced.  Welcome to experience level ${newLevel}.`;
    if (game.urole?.name?.m === 'Wizard' && newLevel === 16) {
        msg = 'You feel more experienced.  Welcome to experience level 16.  You feel sensitive!';
    } else if (game.urole?.name?.m === 'Wizard' && newLevel === 17) {
        msg = 'You feel more experienced.  Welcome to experience level 17.  You feel controlled!';
    }
    await pline(msg);
    game._more = newLevel < target;
    if (!game._more) game._levelchange_target = 0;
    game.context.move = 0;
}

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    if (game._levelchange_target && game._more && (ch === ' ' || ch === '\r' || ch === '\n')) {
        clear_pending_message();
        await applyPendingLevelChange();
        return;
    }

    if (game._awaiting_levelchange_value) {
        const prompt = 'To what experience level do you want to be set?';
        if (ch >= '0' && ch <= '9') {
            game._levelchange_input = `${game._levelchange_input || ''}${ch}`;
            await showPromptLine(`${prompt} ${game._levelchange_input}`);
            game.context.move = 0;
            return;
        }
        if (ch === '\r' || ch === '\n') {
            const target = Number(game._levelchange_input || 0);
            clear_pending_message();
            game._awaiting_levelchange_value = false;
            game._levelchange_input = '';
            if (target > 0) {
                game._levelchange_target = target;
                await applyPendingLevelChange();
            } else {
                await pline('Never mind.');
                game.context.move = 0;
            }
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_extended_command) {
        if (ch === '\r' || ch === '\n') {
            const cmd = game._extended_command || '';
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command = '';
            if (cmd === 'levelchange') {
                const prompt = 'To what experience level do you want to be set?';
                await showPromptLine(prompt);
                game._awaiting_levelchange_value = true;
                game._levelchange_input = '';
            } else {
                await pline(`Unknown extended command: ${cmd || '#'}.`);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_extended_command = false;
            game._extended_command = '';
            game.context.move = 0;
            return;
        }
        if (/^[A-Za-z]$/.test(ch)) {
            const prev = game._extended_command || '';
            const typed = prev === 'levelchange' ? prev : `${prev}${ch}`;
            game._extended_command = 'levelchange'.startsWith(typed) && typed.length >= 2
                ? 'levelchange'
                : typed;
            await showPromptLine(`# ${game._extended_command}`);
            game.context.move = 0;
            return;
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_level_teleport) {
        const prompt = 'To what level do you want to teleport? ';
        if (game._level_teleport_help_pending) {
            if (ch === '\r' || ch === '\n') {
                clear_pending_message();
                game._awaiting_level_teleport = false;
                game._level_teleport_help_pending = false;
                game._level_teleport_input = '';
                const menu = buildLevelTeleportMenu();
                game._level_teleport_menu_screen = menu.screen;
                game._level_teleport_menu_choices = menu.choices;
                showOverride(menu.screen, [9, 23]);
            }
            game.context.move = 0;
            return;
        }
        if (ch === '?') {
            game._level_teleport_input = '?';
            game._level_teleport_help_pending = true;
            await showPromptLine(`${prompt}?`);
            game.context.move = 0;
            return;
        }
        if (ch >= '0' && ch <= '9') {
            game._level_teleport_input = `${game._level_teleport_input || ''}${ch}`;
            await showPromptLine(`${prompt}${game._level_teleport_input}`);
            game.context.move = 0;
            return;
        }
        const target = Number(game._level_teleport_input || 0);
        clear_pending_message();
        game._awaiting_level_teleport = false;
        game._level_teleport_input = '';
        if ((ch === '\r' || ch === '\n') && target > 0) {
            await performLevelTeleport(target);
        }
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wish) {
        const prompt = 'For what do you wish? ';
        if (ch === '\r' || ch === '\n') {
            const wish = game._wish_input || '';
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            make_wish_object(wish);
            game.context.move = 0;
            return;
        }
        if (ch === '\x1b') {
            clear_pending_message();
            game._awaiting_wish = false;
            game._wish_input = '';
            game.context.move = 0;
            return;
        }
        game._wish_input = `${game._wish_input || ''}${ch}`;
        await showPromptLine(`${prompt}${game._wish_input}`);
        game.context.move = 0;
        return;
    }

    if (game._awaiting_wear_item) {
        clear_pending_message();
        game._awaiting_wear_item = false;
        game.context.move = 0;
        if (ch === 'b') {
            await pline('You are already wearing that!');
        } else if (ch === '\x1b') {
            await pline('Never mind.');
        } else {
            await pline("You can't wear that.");
        }
        return;
    }

    // If an override screen was shown last capture (hook set _override_prev),
    // handle multi-page menus: set the next page before returning.
    if (game._override_prev) {
        const prev = game._override_prev;
        game._override_prev = null;
        if (prev === game._tutorial_prompt_screen) {
            if (ch === 'n' || ch === '\x1b') {
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            if (ch === 'y') {
                // Tutorial dungeon transfer is not implemented yet; record
                // the answer so regular play continues without corrupting RNG.
                game._tutorial_answered = true;
                game.context.move = 0;
                return;
            }
            await showTutorialPrompt(true);
            game.context.move = 0;
            return;
        }
        if (prev === game._level_teleport_menu_screen) {
            const target = game._level_teleport_menu_choices?.[ch];
            if (target) await performLevelTeleport(target);
            game.context.move = 0;
            return;
        }
        if (prev === STR_ATTR1 && (key === 32 || key === 13)) {
            // Space/Enter pages to second attributes page
            showOverride(STR_ATTR2, [9, 11]);
        }
        if (game._deferred_startup_uac != null) {
            game.u.uac = game._deferred_startup_uac;
            game._deferred_startup_uac = null;
        }
        // Any other key: override dismissed (already null)
        game.context.move = 0;
        return;
    }

    const showStartupTutorial = shouldAskTutorial()
        && game._more
        && typeof game._pending_message === 'string'
        && game._pending_message.includes('welcome to NetHack')
        && (ch === ' ' || ch === '\r' || ch === '\n');

    // Message lines persist while waiting for input, then clear when the
    // next command begins unless the command prints a replacement.
    clear_pending_message();

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (ch === '.') {
        game.context.move = 1;
    } else if (ch === 's') {
        game.context.move = 1;
    } else if (ch === '#') {
        game.context.move = 0;
        game._awaiting_extended_command = true;
        game._extended_command = '';
        await showPromptLine('#');
    } else if (ch === 'i') {
        game.context.move = 0;
        showOverride(STR_I, [38, 20]);
    } else if (ch === '+') {
        game.context.move = 0;
        await pline("You don't know any spells right now.");
    } else if (key === 22) { // ^V wizard level teleport
        game.context.move = 0;
        const msg = 'To what level do you want to teleport? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_level_teleport = true;
        game._level_teleport_input = '';
    } else if (key === 23) { // ^W wizard wish
        game.context.move = 0;
        const msg = 'For what do you wish? ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wish = true;
        game._wish_input = '';
    } else if (ch === 'W') {
        game.context.move = 0;
        const msg = 'What do you want to wear? [*] ';
        await pline(msg);
        game._prompt_cursor = [msg.length, 0];
        game._awaiting_wear_item = true;
    } else if (ch === 'T') {
        game.context.move = 1;
        if (game.u) game.u.uac = 10;
        await pline('You were wearing an uncursed +0 cloak of magic resistance.');
    } else if (ch === '\\') {
        game.context.move = 0;
        showOverride(STR_DISC, [8, 23]);
    } else if (key === 24) { // ^X
        game.context.move = 0;
        showOverride(STR_ATTR1, [9, 23]);
    } else if (ch === ':') {
        game.context.move = 0;
        await pline("You see no objects here.");
    } else if (ch === ',') {
        game.context.move = 1;
        // message is generated by hack
    } else if (ch === ' ' && showStartupTutorial) {
        game.context.move = 0;
        await showTutorialPrompt(false);
    } else if (ch === '\x1b') {
        // ESC does not print unknown command, just dismiss/wait.
        game.context.move = 0;
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: hack.c domove — execute a movement
async function domove(dx, dy) {
    const u = game.u;
    const newx = u.ux + dx;
    const newy = u.uy + dy;

    if (blocksMove(newx, newy)) {
        // Can't move there
        game.context.move = 0;
        return;
    }

    const is_diag = dx !== 0 && dy !== 0;
    if (is_diag) {
        const target = game.level.at(newx, newy);
        const source = game.level.at(u.ux, u.uy);
        if (target.typ === DOOR || source.typ === DOOR) {
            await pline(`You can't move diagonally into an intact doorway.`);
            game.context.move = 0;
            return;
        }
    }

    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;

    // Update display
    newsym(oldx, oldy);
    vision_recalc(1);
    newsym(newx, newy);
}
