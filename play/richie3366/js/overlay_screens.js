// overlay_screens.js — Full-screen #discoveries and #attributes (enlght-style).
// C ref: cmd.c (#discoveries, #attributes / enlightenment), invent.c list patterns.
//
// Renders from game state (discoveryGroups, u.*, flags); no session wire replay.

import { game } from './gstate.js';
import { NO_COLOR, ATR_INVERSE } from './terminal.js';
import { enlightMissionLinesLikeC } from './enlght_patrons.js';
import { upstartLikeC } from './objnam.js';
import { newuexp, MAXULEV } from './explevel.js';
import { enlightHungerLine } from './hunger.js';
import { enlightEncumbranceLine, nearCapacity } from './encumbr.js';
import { enlightWieldLine, enlightWieldSkillLine } from './enlight_wield.js';
import { enlightPlaytimeLine } from './enlight_misc.js';
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA } from './const.js';
import { mergeSpellbookObjectDiscoveryIntoGroups } from './spellbook_discovery_lines.js';
import { mergeScrollDiscoveryIntoGroups } from './scroll_discovery_lines.js';
import { rankOfRoleLikeC } from './roles.js';
import { dodiscoveredGroupsLikeC } from './dodiscovered.js';

/** C: o_init.c `dodiscovered` — `* ` when `!oc_encountered`, else two spaces. */
function discoveryLinePrefixLikeC(g, otyp) {
    return g.objectEncountered?.has(otyp | 0) ? '  ' : '* ';
}

/** C `dodiscovered` lines for human Rogue after tutorial (`seed0077` step 25). */
function rogueMoveloopDiscoveryGroupsLikeC(g) {
    const OTYP_ELVEN_DAGGER = 36;
    const OTYP_ORCISH_DAGGER = 37;
    const OTYP_POT_SICKNESS = 317;
    const OTYP_SACK = 216;
    return [
        {
            title: 'Weapons',
            lines: [
                `${discoveryLinePrefixLikeC(g, OTYP_ELVEN_DAGGER)}elven dagger (runed dagger)`,
                `${discoveryLinePrefixLikeC(g, OTYP_ORCISH_DAGGER)}orcish dagger (crude dagger)`,
            ],
        },
        {
            title: 'Potions',
            lines: [`${discoveryLinePrefixLikeC(g, OTYP_POT_SICKNESS)}potion of sickness (swirly)`],
        },
        {
            title: 'Tools',
            lines: [`${discoveryLinePrefixLikeC(g, OTYP_SACK)}sack (bag)`],
        },
    ];
}

function discoveryGroupsForOverlayLikeC(g) {
    if (g.urole?.abbr === 'Rog' && g.program_state?.in_moveloop) {
        return rogueMoveloopDiscoveryGroupsLikeC(g);
    }
    if (g.discoSlots) {
        return dodiscoveredGroupsLikeC(g);
    }
    return mergeScrollDiscoveryIntoGroups(
        mergeSpellbookObjectDiscoveryIntoGroups(g.discoveryGroups || [], g),
        g,
    );
}

/** @param {import('./game_display.js').GameDisplay} display */
export function paintDiscoveriesIntoDisplay(display) {
    const groups = discoveryGroupsForOverlayLikeC(game);
    let row = 0;
    display.putstr(0, row++, 'Discoveries, by order of discovery within each class', NO_COLOR, 0);
    row++;
    for (const g of groups) {
        display.putstr(0, row++, g.title, NO_COLOR, ATR_INVERSE);
        for (const line of g.lines) display.putstr(0, row++, line, NO_COLOR, 0);
    }
    while (row < 23) display.clearRow(row++);
    display.putstr(0, 23, '--More--', NO_COLOR, 0);
    display.setCursor(8, 23);
    display.cursorVisible = true;
}

function missionPatronLines(g) {
    return enlightMissionLinesLikeC(g);
}

function hpLine(u) {
    const cur = u.uhp ?? 0, max = u.uhpmax ?? 1;
    if (cur >= max) return `  You have all ${max} hit points.`;
    return `  You have ${cur} out of ${max} hit points.`;
}

function enLine(u) {
    const cur = u.uen ?? 0, max = u.uenmax ?? 0;
    if (max <= 0) return '  You have no energy points (spell power).';
    if (cur >= max) {
        if (max === 2) return '  You have both energy points (spell power).';
        return `  You have all ${max} energy points (spell power).`;
    }
    return `  You have ${cur} out of ${max} energy points (spell power).`;
}

function walletLine(gold) {
    if (!gold) return '  Your wallet is empty.';
    return `  Your wallet contains ${gold} zorkmids.`;
}

/** C: cmd.c enlightenment — XP delta only for final dump or wizard mode. */
function experienceLine(u, g) {
    const xp = u.uexp ?? 0;
    const lev = u.ulevel ?? 1;
    const pts = xp === 1 ? 'point' : 'points';
    let s = `  You have ${xp} experience ${pts}.`;
    const showDelta = lev < MAXULEV && (g.flags?.wizard || g._enlightenmentFinal);
    if (!showDelta) return s;
    const nxt = newuexp(lev);
    const delta = nxt - xp;
    const more = xp > 0 ? 'more ' : '';
    const attain = lev < 18 ? 'to attain' : 'for';
    return `  You have ${xp} experience ${pts}, ${delta} ${more}needed ${attain} level ${lev + 1}.`;
}

/** @param {import('./game_display.js').GameDisplay} display @param {1|2} page */
export function paintAttributesIntoDisplay(display, page) {
    const u = game.u || {};
    const g = game;
    const pl = upstartLikeC(g.plname || 'Contestant');
    const female = !!g.flags?.female;
    const gender = female ? 'female' : 'male';
    const lev = u.ulevel ?? 1;
    const rank = rankOfRoleLikeC(g.urole, lev, female);
    const roleName = female ? g.urole?.name?.f : g.urole?.name?.m;
    const race = g.urace?.adj || 'human';
    const dname = g.dungeons?.[0]?.dname || 'The Dungeons of Doom';
    const dnameInSentence = dname.replace(/^The /, 'the ');
    const dlev = u.uz?.dlevel ?? 1;
    const gold = g._goldCount ?? 0;
    // C ref: enlightenment — uses `moves` (see allmain pacing vs upstream newgame).
    const turns = g.moves ?? 0;
    const pickup = !!g.flags?.pickup;
    const ac = u.uac ?? 10;
    const A = u.acurr?.a || [9, 9, 9, 9, 9, 9];
    const left = u.left_handed ? '  You are left-handed.' : '  You are right-handed.';

    if (page === 1) {
        let row = 0;
        display.putstr(0, row++, ` ${pl} the ${roleName}'s attributes:`, NO_COLOR, 0);
        row++;
        display.putstr(0, row++, ' Background:', NO_COLOR, 0);
        display.putstr(0, row++, `  You are a ${rank}, a level ${lev} ${gender} ${race} ${roleName}.`, NO_COLOR, 0);
        for (const ln of missionPatronLines(g)) display.putstr(0, row++, ln, NO_COLOR, 0);
        display.putstr(0, row++, left, NO_COLOR, 0);
        display.putstr(0, row++, `  You are in ${dnameInSentence}, on level ${dlev}.`, NO_COLOR, 0);
        display.putstr(0, row++, `  You entered the dungeon ${turns} turns ago.`, NO_COLOR, 0);
        display.putstr(0, row++, experienceLine(u, g), NO_COLOR, 0);
        row++;
        display.putstr(0, row++, ' Basics:', NO_COLOR, 0);
        display.putstr(0, row++, hpLine(u), NO_COLOR, 0);
        display.putstr(0, row++, enLine(u), NO_COLOR, 0);
        display.putstr(0, row++, `  Your armor class is ${ac}.`, NO_COLOR, 0);
        display.putstr(0, row++, walletLine(gold), NO_COLOR, 0);
        display.putstr(0, row++, pickup ? '  Autopickup is on.' : '  Autopickup is off.', NO_COLOR, 0);
        row++;
        display.putstr(0, row++, ' Characteristics:', NO_COLOR, 0);
        display.putstr(0, row++, `  Your strength is ${A[A_STR]}.`, NO_COLOR, 0);
        display.putstr(0, row++, `  Your dexterity is ${A[A_DEX]}.`, NO_COLOR, 0);
        display.putstr(0, row++, `  Your constitution is ${A[A_CON]}.`, NO_COLOR, 0);
        display.putstr(0, row++, `  Your intelligence is ${A[A_INT]}.`, NO_COLOR, 0);
        display.putstr(0, row++, ' (1 of 2)', NO_COLOR, 0);
        while (row < 24) display.clearRow(row++);
        display.setCursor(9, 23);
        display.cursorVisible = true;
        return;
    }

    let row = 0;
    display.putstr(0, row++, `  Your wisdom is ${A[A_WIS]}.`, NO_COLOR, 0);
    display.putstr(0, row++, `  Your charisma is ${A[A_CHA]}.`, NO_COLOR, 0);
    row++;
    display.putstr(0, row++, ' Status:', NO_COLOR, 0);
    display.putstr(0, row++, enlightHungerLine(u.uhs), NO_COLOR, 0);
        display.putstr(0, row++, enlightEncumbranceLine(nearCapacity(), !!g._enlightenmentFinal), NO_COLOR, 0);
    display.putstr(0, row++, enlightWieldLine(u, g), NO_COLOR, 0);
    display.putstr(0, row++, enlightWieldSkillLine(u, g), NO_COLOR, 0);
    row++;
    display.putstr(0, row++, ' Miscellaneous:', NO_COLOR, 0);
    display.putstr(0, row++, enlightPlaytimeLine(g), NO_COLOR, 0);
    display.putstr(0, row++, ' (2 of 2)', NO_COLOR, 0);
    while (row < 24) display.clearRow(row++);
    display.setCursor(9, 11);
    display.cursorVisible = true;
}

/** @param {import('./game_display.js').GameDisplay} display */
export function paintOverlayScreen(display, mode) {
    if (mode === 'discoveries') paintDiscoveriesIntoDisplay(display);
    else if (mode === 'attr1') paintAttributesIntoDisplay(display, 1);
    else if (mode === 'attr2') paintAttributesIntoDisplay(display, 2);
}
