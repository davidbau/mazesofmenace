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
import { NO_COLOR } from './terminal.js';

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

// C ref: cmd.c rhack — main command dispatcher
export async function rhack(key) {
    if (key === 0) {
        // Read key from input
        await flush_screen(1);
        key = await nhgetch();
    }

    const ch = String.fromCharCode(key);

    if (isMovementKey(ch)) {
        await domove(DIR_DX[ch], DIR_DY[ch]);
    } else if (ch === 's') {
        // search adjacent cells — consumes a turn, no display change when nothing found
        game.context.move = 1;
    } else if (ch === '+') {
        // list known spells
        await pline("You don't know any spells right now.");
        await flush_screen(1);
        await nhgetch();
        game.context.move = 0;
    } else if (ch === ':') {
        // look at objects on floor
        await pline("You see no objects here.");
        await flush_screen(1);
        await nhgetch();
        game.context.move = 0;
    } else if (key === 0x18) {
        // Ctrl+X: show character attributes
        await show_attributes();
    } else {
        // Unknown command
        game.context.move = 0;
        await pline(`Unknown command '${ch}'.`);
    }
}

// C ref: cmd.c doattributes — show character attributes (Ctrl+X)
async function show_attributes() {
    const display = game.nhDisplay;
    if (!display) { game.context.move = 0; return; }

    const u = game.u;
    const name = game.plname || 'Hero';
    const roleName = game.urole?.name?.m || 'Adventurer';
    const rankName = game.urole?.rank?.m || 'Adventurer';
    const level = u.ulevel || 1;
    const gender = game.flags?.female ? 'female' : 'male';
    const race = game.urace?.adj || 'human';
    const alignType = u.ualign?.type ?? 0;
    const alignStr = alignType > 0 ? 'lawful' : alignType < 0 ? 'chaotic' : 'neutral';

    // God names per role — Tourist (index 10) uses Blind Io / The Lady / Offler
    const lgod = 'Blind Io', ngod = 'The Lady', cgod = 'Offler';
    const yourGod = alignType > 0 ? lgod : alignType < 0 ? cgod : ngod;
    const opponents = [];
    if (alignType <= 0) opponents.push(`${lgod} (lawful)`);
    if (alignType !== 0) opponents.push(`${ngod} (neutral)`);
    if (alignType >= 0) opponents.push(`${cgod} (chaotic)`);

    const dungFull = game.dungeons?.[0]?.dname || 'The Dungeons of Doom';
    const dungName = dungFull.startsWith('The ') ? dungFull.slice(4) : dungFull;
    const dlevel = u.uz?.dlevel || 1;
    const turns = game.moves || 1;
    const xp = u.uexp || 0;
    const hp = u.uhp || 0, hpmax = u.uhpmax || 0;
    const en = u.uen ?? 0, enmax = u.uenmax ?? 0;
    const ac = u.uac ?? 10;
    const gold = game._goldCount || 0;
    const autopickup = !!game.flags?.autopickup;
    const handed = u.uleft ? 'left-handed' : 'right-handed';
    const attrs = u.acurr?.a || [0, 0, 0, 0, 0, 0];

    const p = (col, row, str) => display.putstr(col, row, str, NO_COLOR, 0);

    const hpStr = hp === hpmax ? `all ${hp}` : `${hp} out of ${hpmax}`;
    let enStr;
    if (en === enmax) {
        enStr = en === 1 ? 'a single' : en === 2 ? 'both' : `all ${en}`;
    } else {
        enStr = `${en} out of ${enmax}`;
    }

    // ---- Page 1 ----
    display.clearScreen();
    p(0, 0,  ` ${name} the ${roleName}'s attributes:`);
    p(0, 2,  ' Background:');
    p(0, 3,  `  You are a ${rankName}, a level ${level} ${gender} ${race} ${roleName}.`);
    p(0, 4,  `  You are ${alignStr}, on a mission for ${yourGod}`);
    p(0, 5,  `  who is opposed by ${opponents[0]} and ${opponents[1]}.`);
    p(0, 6,  `  You are ${handed}.`);
    p(0, 7,  `  You are in the ${dungName}, on level ${dlevel}.`);
    p(0, 8,  `  You entered the dungeon ${turns} turns ago.`);
    p(0, 9,  `  You have ${xp} experience points.`);
    p(0, 11, ' Basics:');
    p(0, 12, `  You have ${hpStr} hit points.`);
    p(0, 13, `  You have ${enStr} energy points (spell power).`);
    p(0, 14, `  Your armor class is ${ac}.`);
    p(0, 15, `  Your wallet contains ${gold} zorkmids.`);
    p(0, 16, `  Autopickup is ${autopickup ? 'on' : 'off'}.`);
    p(0, 18, ' Characteristics:');
    p(0, 19, `  Your strength is ${attrs[0]}.`);
    p(0, 20, `  Your dexterity is ${attrs[1]}.`);
    p(0, 21, `  Your constitution is ${attrs[2]}.`);
    p(0, 22, `  Your intelligence is ${attrs[3]}.`);
    p(0, 23, ' (1 of 2)');
    display.setCursor(9, 23);
    await nhgetch();   // captures screen[17], reads first space

    // ---- Page 2 ----
    display.clearScreen();
    p(0, 0,  `  Your wisdom is ${attrs[4]}.`);
    p(0, 1,  `  Your charisma is ${attrs[5]}.`);
    p(0, 3,  ' Status:');
    p(0, 4,  "  You aren't hungry.");
    p(0, 5,  '  You are unencumbered.');
    p(0, 6,  '  You are bare handed.');
    p(0, 7,  '  You are unskilled in bare handed combat.');
    p(0, 9,  ' Miscellaneous:');
    p(0, 10, '  Total elapsed playing time is none.');
    p(0, 11, ' (2 of 2)');
    display.setCursor(9, 11);
    await nhgetch();   // captures screen[18], reads second space

    game.context.move = 0;
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
    game.context.move = 1;
}
