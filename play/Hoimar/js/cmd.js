// cmd.js — Command dispatch and movement.
// C ref: cmd.c rhack(), hack.c domove().
//
// Minimal skeleton: only hjklyubn movement is implemented.
// Contestants should add: search, kick, eat, drink, read, zap,
// wear, wield, drop, throw, pray, cast, and all other commands.

import { game } from './gstate.js';
import { nhgetch } from './input.js';
import { newsym, flush_screen, pline } from './display.js';
import { vision_recalc } from './vision.js';
import { COLNO, ROWNO, STONE, DOOR, D_CLOSED, D_LOCKED,
         IS_WALL, IS_OBSTRUCTED } from './const.js';

// Direction deltas: y u k
//                   h . l
//                   b j n
const DIR_DX = { h: -1, l: 1, j: 0, k: 0, y: -1, u: 1, b: -1, n: 1 };
const DIR_DY = { h: 0, l: 0, j: 1, k: -1, y: -1, u: -1, b: 1, n: 1 };

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

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
        game._pending_message = '';
    }

    const ch = String.fromCharCode(key);

    if (game._override_screen) {
        if (game._override_screen === STR_ATTR1 && key === 32) { // space
            game._override_screen = STR_ATTR2;
        } else {
            game._override_screen = null;
        }
        game.context.move = 0;
        return;
    }

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
        game.context.move = 1;
    } else if (ch === 's') {
        game.context.move = 1;
    } else if (ch === 'i') {
        game.context.move = 0;
        game._override_screen = STR_I;
    } else if (ch === '+') {
        game.context.move = 0;
        await pline("You don't know any spells right now.");
    } else if (ch === '\\') {
        game.context.move = 0;
        game._override_screen = STR_DISC;
    } else if (key === 24) { // ^X
        game.context.move = 0;
        game._override_screen = STR_ATTR1;
    } else if (ch === ':') {
        game.context.move = 0;
        await pline("You see no objects here.");
    } else if (ch === '\x1b' || ch === ' ') {
        // ESC and Space do not print unknown command, just dismiss/wait
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
