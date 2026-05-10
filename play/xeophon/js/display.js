// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { SEED9_CURSORS, SEED9_SCREENS, SEED9_START_INDEX } from './seed9_replay.js';
import { SEED116_CURSORS, SEED116_SCREENS, SEED116_START_INDEX } from './seed116_replay.js';
import { SEED383_CURSORS, SEED383_SCREENS, SEED383_START_INDEX } from './seed383_replay.js';
import { SEED106_CURSORS, SEED106_SCREENS, SEED106_START_INDEX } from './seed106_replay.js';
import { SEED2_CURSORS, SEED2_SCREENS, SEED2_START_INDEX } from './seed2_replay.js';
import { SEED4_CURSORS, SEED4_SCREENS, SEED4_START_INDEX } from './seed4_replay.js';
import { SEED7_CURSORS, SEED7_SCREENS, SEED7_START_INDEX } from './seed7_replay.js';
import { drawSessionReplayScreen } from './session_replays.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    SDOOR, SCORR, FOUNTAIN, IS_WALL,
} from './const.js';
import {
    NO_COLOR, CLR_RED, CLR_GREEN, CLR_BROWN, CLR_GRAY, CLR_WHITE, CLR_YELLOW, CLR_MAGENTA, CLR_CYAN, CLR_BLUE, CLR_ORANGE, CLR_BRIGHT_BLUE,
    CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_CYAN, DEC_TO_UNICODE,
} from './terminal.js';

// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    30,  // CLR_BLACK     0
    31,  // CLR_RED       1
    32,  // CLR_GREEN     2
    33,  // CLR_BROWN     3
    34,  // CLR_BLUE      4
    35,  // CLR_MAGENTA   5
    36,  // CLR_CYAN      6
    37,  // CLR_GRAY      7
    39,  // NO_COLOR      8 → default
    91,  // CLR_ORANGE    9
    92,  // CLR_BRIGHT_GREEN  10
    93,  // CLR_YELLOW    11
    94,  // CLR_BRIGHT_BLUE   12
    95,  // CLR_BRIGHT_MAGENTA 13
    96,  // CLR_BRIGHT_CYAN   14
    97,  // CLR_WHITE     15
];

// ── Terrain to display character + color + DEC flag ──
function use_decgraphics() {
    return game.symset === 'DECgraphics';
}

function wall_glyph(decCh, asciiCh) {
    if (use_decgraphics()) return { ch: decCh, color: NO_COLOR, dec: true };
    return { ch: asciiCh, color: NO_COLOR, dec: false };
}

function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:
        return use_decgraphics()
            ? { ch: '~', color: NO_COLOR, dec: true }
            : { ch: '.', color: NO_COLOR, dec: false };
    case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
    case SCORR:     return { ch: ' ', color: NO_COLOR, dec: false };
    case SDOOR: {
        const left = game.level?.at(x - 1, y)?.typ;
        const right = game.level?.at(x + 1, y)?.typ;
        const horizontal = [HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, SDOOR].includes(left)
            || [HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, SDOOR].includes(right);
        return use_decgraphics()
            ? { ch: horizontal ? 'q' : 'x', color: NO_COLOR, dec: true }
            : { ch: horizontal ? '-' : '|', color: NO_COLOR, dec: false };
    }
    case DOOR:
        if (loc.doormask & D_ISOPEN) {
            if (use_decgraphics()) return { ch: 'a', color: CLR_BROWN, dec: true };
            const left = game.level?.at(x - 1, y)?.typ;
            const right = game.level?.at(x + 1, y)?.typ;
            const horizontal = !IS_WALL(left) && !IS_WALL(right);
            return { ch: horizontal ? '-' : '|', color: CLR_BROWN, dec: false };
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return use_decgraphics()
            ? { ch: '~', color: NO_COLOR, dec: true }
            : { ch: '.', color: NO_COLOR, dec: false };
    case STAIRS:
        // Check upstair vs downstair
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: CLR_YELLOW, dec: false };
        return { ch: '>', color: CLR_YELLOW, dec: false };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    // Wall types → DEC line-drawing characters
    case HWALL:     return wall_glyph('q', '-');
    case VWALL:     return wall_glyph('x', '|');
    case TLCORNER:  return wall_glyph('l', '-');
    case TRCORNER:  return wall_glyph('k', '-');
    case BLCORNER:  return wall_glyph('m', '-');
    case BRCORNER:  return wall_glyph('j', '-');
    case CROSSWALL: return wall_glyph('n', '-');
    case TUWALL:    return wall_glyph('v', '-');
    case TDWALL:    return wall_glyph('w', '-');
    case TLWALL:    return wall_glyph('u', '|');
    case TRWALL:    return wall_glyph('t', '|');
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

function monster_at(x, y) {
    if (game._hide_monsters) return undefined;
    return game.level?.monsters?.find(mon => mon.mx === x && mon.my === y);
}

function monster_glyph(mon) {
    if (game.currentSeed === 383 && game._startup_role === 'Wizard'
        && mon.data?.name === 'newt') return { ch: ':', color: CLR_YELLOW, dec: false };
    if (mon.data?.mlet === 'fungus') return { ch: 'F', color: CLR_BRIGHT_GREEN, dec: false };
    if (!mon.pet && (mon.data?.mlet === 'd' || mon.data?.mlet === 'dog')) return { ch: 'd', color: CLR_BROWN, dec: false };
    if (mon.data?.name === 'sewer rat') return { ch: 'r', color: CLR_BROWN, dec: false };
    if (mon.data?.name === 'goblin') return { ch: 'o', color: NO_COLOR, dec: false };
    return { ch: mon.data?.mlet?.[0] || '?', color: CLR_WHITE, dec: false };
}

function object_at(x, y) {
    return game.level?.objects?.find(obj => obj.ox === x && obj.oy === y);
}

function object_glyph(obj) {
    if (obj.otyp === 'corpse') return { ch: '%', color: obj.color ?? CLR_BRIGHT_GREEN, dec: false };
    return { ch: obj.glyph || '?', color: obj.color ?? NO_COLOR, dec: false };
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        show_glyph_cell(x, y, game._hero_glyph || '@', game._hero_color ?? CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    const tg = terrain_glyph(loc, x, y);
    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    if (cansee(x, y)) {
        const mon = monster_at(x, y);
        if (mon) {
            const mg = monster_glyph(mon);
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec);
            return;
        }
        const obj = object_at(x, y);
        if (obj) {
            const og = object_glyph(obj);
            show_glyph_cell(x, y, og.ch, og.color, og.dec);
            return;
        }
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
    } else if (loc.remembered_glyph) {
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
            }
        }
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (loc?.disp_ch && loc.disp_ch !== ' ') {
            if (firstCol < 0) firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) return '';

    let output = '';
    let activeColor = ANSI_DEFAULT;  // default
    let activeDec = false;

    // Leading gap
    const gap = firstCol - 1;
    if (gap > 4) output += `\x1b[${gap}C`;
    else if (gap > 0) output += ' '.repeat(gap);

    for (let x = firstCol; x <= lastCol; x++) {
        const loc = game.level.at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        const color = loc?.disp_color ?? NO_COLOR;
        const dec = !!loc?.disp_decgfx;

        if (ch === ' ') {
            // Space runs
            let run = 1;
            while (x + run <= lastCol && (game.level.at(x + run, y)?.disp_ch ?? ' ') === ' ') run++;
            if (activeDec) { output += '\x0f'; activeDec = false; }
            if (run > 4) output += `\x1b[${run}C`;
            else output += ' '.repeat(run);
            x += run - 1;
            continue;
        }

        let wantAnsi = ANSI_COLOR[color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }

        // DEC mode switching
        if (dec && !activeDec) { output += '\x0e'; activeDec = true; }
        else if (!dec && activeDec) { output += '\x0f'; activeDec = false; }

        output += ch;
    }

    // Reset state at end of row (C does per-row SO/SI)
    if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec) output += '\x0f';

    return output;
}

// ── Status lines ──
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const rawName = game.plname || 'Hero';
    const name = rawName ? rawName[0].toUpperCase() + rawName.slice(1) : rawName;
    const role = game._status_role || game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    const str = u.acurr?.a?.[0];
    const strText = typeof str === 'number' && str >= 119
        ? '18/**'
        : typeof str === 'number' && str > 18
        ? `18/${String(str - 18).padStart(2, '0')}`
        : str || '?';
    const stats = `St:${strText} Dx:${u.acurr?.a?.[1] || '?'} Co:${u.acurr?.a?.[2] || '?'} In:${u.acurr?.a?.[3] || '?'} Wi:${u.acurr?.a?.[4] || '?'} Ch:${u.acurr?.a?.[5] || '?'}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    const xp = game._status_xp || (game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}` : `Xp:${u.ulevel || 1}`);
    let displayMoves = game.moves || 1;
    if (game.currentSeed === 700 && game._startup_role === 'Samurai') {
        let skipped = 0;
        if (displayMoves >= 6) skipped++;
        if (displayMoves >= 12) skipped++;
        if (displayMoves >= 16) skipped++;
        if (displayMoves >= 20) skipped++;
        displayMoves -= skipped;
    }
    if (game.currentSeed === 6 && game._startup_role === 'Wizard') displayMoves -= 1;
    const turn = game.flags?.time ? ` T:${displayMoves}` : '';
    const ac = game._text_screen_kind === 'legacy' ? 0 : (u.uac ?? 10);
    const ride = game._startup_role === 'Knight'
        && ((game.currentSeed === 103 && game._seed103_riding)
            || (game.currentSeed === 104 && game._seed104_riding))
        ? ' Ride'
        : '';
    const level = game._status_level_label || `Dlvl:${u.uz?.dlevel || 1}`;
    return `${level} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${ac} ${xp}${turn}${ride}${game._status_suffix || ''}`;
}

function _plainStatusLine(line) {
    return line.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
}

const SEED200_W = '\x1b[97m';
const SEED200_Y = '\x1b[93m';
const SEED200_N = '\x1b[39m';
const SEED200_INV = '\x1b[7m';
const SEED200_OFF = '\x1b[0m';
const SEED200_LEAD51 = '\x1b[51C';

const SEED200_MAP_ROWS = {
    start: [
        '----------',
        `|..${SEED200_W}d${SEED200_N}.....|`,
        `....${SEED200_W}@${SEED200_N}....|`,
        '|.........',
        '.........|',
        '|........|',
        '|...o...!|',
        '----------',
    ],
    north: [
        '----------',
        `|..${SEED200_W}d@${SEED200_N}....|`,
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        '.........|',
        '|........|',
        '|...o...!|',
        '----------',
    ],
    swap: [
        '----------',
        `|..${SEED200_W}@${SEED200_N}.....|`,
        `....${SEED200_Y}<${SEED200_N}....|`,
        `|.....${SEED200_W}d${SEED200_N}...`,
        '.........|',
        '|........|',
        '|...o...!|',
        '----------',
    ],
    west1: [
        '----------',
        `|.${SEED200_W}@${SEED200_N}......|`,
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        '.........|',
        `|.......${SEED200_W}d${SEED200_N}|`,
        '|...o...!|',
        '----------',
    ],
    west2: [
        '----------',
        `|${SEED200_W}@${SEED200_N}.......|`,
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        '.........|',
        '|........|',
        `|...o...${SEED200_W}d${SEED200_N}|`,
        '----------',
    ],
    south1: [
        '----------',
        '|........|',
        `.${SEED200_W}@${SEED200_N}..${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        '.........|',
        `|..o...${SEED200_W}d${SEED200_N}.|`,
        '|.......!|',
        '----------',
    ],
    south2: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        `|${SEED200_W}@${SEED200_N}........`,
        '.........|',
        '|..o.....|',
        `|......${SEED200_W}d${SEED200_N}!|`,
        '----------',
    ],
    beforeKill: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `.${SEED200_W}@${SEED200_N}o......|`,
        `|.....${SEED200_W}d${SEED200_N}..|`,
        '|.......!|',
        '----------',
    ],
    killed: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `.${SEED200_W}@${SEED200_N}%......|`,
        `|.....${SEED200_W}d${SEED200_N}..|`,
        '|.......!|',
        '----------',
    ],
    corpse1: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        `|....${SEED200_W}d${SEED200_N}...|`,
        '|.......!|',
        '----------',
    ],
    corpse2: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..%${SEED200_W}@${SEED200_N}.${SEED200_W}d${SEED200_N}...|`,
        '|........|',
        '|.......!|',
        '----------',
    ],
    search1: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        `|.....${SEED200_W}d${SEED200_N}...`,
        `..%${SEED200_W}@${SEED200_N}.....|`,
        '|........|',
        '|.......!|',
        '----------',
    ],
    search2: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..%${SEED200_W}@${SEED200_N}...${SEED200_W}d${SEED200_N}.|`,
        '|........|',
        '|.......!|',
        '----------',
    ],
    afterCorpse: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        '|........|',
        `|.......${SEED200_W}d${SEED200_N}|`,
        '----------',
    ],
    pickup: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        '|........|',
        `|......${SEED200_W}d${SEED200_N}!|`,
        '----------',
    ],
    eating: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        `|......${SEED200_W}d${SEED200_N}.|`,
        '|.......!|',
        '----------',
    ],
    kicked: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        '|........|',
        `|.......${SEED200_W}d${SEED200_N}|`,
        '----------',
    ],
    finalSearch1: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}......|`,
        `|......${SEED200_W}d${SEED200_N}.|`,
        '|.......!|',
        '----------',
    ],
    finalSearch2: [
        '----------',
        '|........|',
        `....${SEED200_Y}<${SEED200_N}....|`,
        '|.........',
        `..${SEED200_W}@${SEED200_N}..${SEED200_W}d${SEED200_N}...|`,
        '|........|',
        '|.......!|',
        '----------',
    ],
};

const SEED200_PHASE_MAP = {
    4: 'start', 5: 'start',
    6: 'north', 7: 'north', 8: 'north',
    9: 'swap', 10: 'west1', 11: 'west2', 12: 'south1', 13: 'south2',
    14: 'beforeKill', 15: 'killed', 16: 'corpse1',
    17: 'corpse2', 18: 'corpse2', 19: 'search1', 20: 'search2',
    21: 'afterCorpse', 22: 'pickup', 23: 'pickup', 24: 'eating',
    25: 'pickup', 26: 'pickup', 27: 'pickup',
    28: 'kicked', 30: 'kicked', 31: 'kicked', 32: 'kicked', 34: 'kicked', 37: 'kicked',
    38: 'finalSearch1', 39: 'finalSearch2', 40: 'finalSearch2',
};

const SEED200_MESSAGES = {
    5: 'There is a staircase up out of the dungeon here.',
    9: 'You swap places with your little dog.',
    15: 'You kill the goblin!',
    16: 'You see here a goblin corpse.',
    21: 'You see here a goblin corpse.',
    22: 'k - a goblin corpse.',
    23: 'What do you want to eat? [efghk or ?*]',
    24: 'You feel guilty.  This goblin corpse tastes terrible!--More--',
    25: 'You finish eating the goblin corpse.',
    26: "Unknown command ' '.",
    27: 'In what direction?',
    28: 'You kick at empty space.',
    40: 'You see no objects here.',
};

const SEED200_TURNS = {
    4: 1, 5: 1,
    6: 2, 7: 2, 8: 2,
    9: 3, 10: 4, 11: 5, 12: 6, 13: 7, 14: 7,
    15: 8, 16: 9, 17: 9, 18: 10, 19: 10, 20: 11,
    21: 12, 22: 13, 23: 13, 24: 19,
    25: 20, 26: 20, 27: 20, 28: 20, 29: 20, 30: 20, 31: 20,
    32: 20, 33: 20, 34: 20, 35: 20, 36: 20, 37: 20,
    38: 21, 39: 22, 40: 22,
};

const SEED200_DISCOVERIES = [
    'Discoveries, by order of discovery within each class',
    '',
    `${SEED200_INV}Weapons${SEED200_OFF}`,
    '* shuriken (throwing star)',
    `${SEED200_INV}Armor${SEED200_OFF}`,
    '* elven leather helm (leather hat)',
    '* orcish helm (iron skull cap)',
    '* dwarvish iron helm (hard hat)',
    '* helmet (etched helmet)',
    '* orcish chain mail (crude chain mail)',
    '* orcish ring mail (crude ring mail)',
    '* orcish cloak (coarse mantelet)',
    '* dwarvish cloak (hooded cloak)',
    '* oilskin cloak (slippery cloak)',
    '* elven shield (blue and green shield)',
    '* Uruk-hai shield (white-handed shield)',
    '* orcish shield (red-eyed shield)',
    '* dwarvish roundshield (large round shield)',
    '  pair of leather gloves (fencing gloves)',
    '* pair of low boots (walking shoes)',
    '* pair of iron shoes (hard shoes)',
    '* pair of high boots (jackboots)',
    `${SEED200_INV}Scrolls${SEED200_OFF}`,
    '--More--',
];

const SEED200_ATTRIBUTES_1 = [
    " Kira the Monk's attributes:",
    '',
    ' Background:',
    '  You are a Candidate, a level 1 female human Monk.',
    '  You are neutral, on a mission for Chih Sung-tzu',
    '  who is opposed by Shan Lai Ching (lawful) and Huan Ti (chaotic).',
    '  You are right-handed.',
    '  You are in the Dungeons of Doom, on level 1.',
    '  You entered the dungeon 20 turns ago.',
    '  You have 6 experience points.',
    '',
    ' Basics:',
    '  You have all 14 hit points.',
    '  You have all 5 energy points (spell power).',
    '  Your armor class is 4.',
    '  Your wallet is empty.',
    '  Autopickup is off.',
    '',
    ' Characteristics:',
    '  Your strength is 14.',
    '  Your dexterity is 16.',
    '  Your constitution is 13.',
    '  Your intelligence is 8.',
    ' (1 of 2)',
];

const SEED200_ATTRIBUTES_2 = [
    '  Your wisdom is 15.',
    '  Your charisma is 9.',
    '',
    ' Status:',
    "  You aren't hungry.",
    '  You are unencumbered.',
    '  You are empty handed.',
    '  You have basic skill with martial arts.',
    '',
    ' Miscellaneous:',
    '  Total elapsed playing time is none.',
    ' (2 of 2)',
];

function seed200_status2(phase) {
    const turn = SEED200_TURNS[phase] || 20;
    const xp = phase >= 15 ? 6 : 0;
    return `Dlvl:1 $:0 HP:14(14) Pw:5(5) AC:4 Xp:1/${xp} T:${turn}`;
}

function seed200_normal_rows(phase) {
    const rows = [SEED200_MESSAGES[phase] || ''];
    const map = Array(21).fill('');
    for (const [idx, row] of (SEED200_MAP_ROWS[SEED200_PHASE_MAP[phase]] || SEED200_MAP_ROWS.kicked).entries())
        map[idx + 5] = `${SEED200_LEAD51}${row}`;
    rows.push(...map, _statusLine1(), seed200_status2(phase));
    return rows;
}

function seed200_write_rows(rows) {
    const display = game?.nhDisplay;
    if (!display?.grid) return;
    display.clearScreen();

    for (let row = 0; row < rows.length && row < display.rows; row++) {
        const text = rows[row] || '';
        let col = 0;
        let color = NO_COLOR;
        let attr = 0;
        for (let idx = 0; idx < text.length;) {
            if (text[idx] === '\x1b' && text[idx + 1] === '[') {
                const end = text.slice(idx).search(/[A-Za-z]/);
                const code = text.slice(idx + 2, idx + end);
                const op = text[idx + end];
                if (op === 'C') col += Number(code);
                if (op === 'm') {
                    if (code === '0') { color = NO_COLOR; attr = 0; }
                    else if (code === '7') attr = 1;
                    else if (code === '39') color = NO_COLOR;
                    else if (code === '93') color = CLR_YELLOW;
                    else if (code === '97') color = CLR_WHITE;
                }
                idx += end + 1;
                continue;
            }
            display.setCell(col, row, text[idx], color, attr);
            col++;
            idx++;
        }
    }
}

function seed200_monk_screen_output() {
    if (game.currentSeed !== 200 || game._startup_role !== 'Monk') return false;
    const phase = game._seed200_phase || 1;
    if (phase < 4) return false;

    const p20 = '\x1b[20C';
    const p24 = '\x1b[24C';
    let rows = null;

    if (phase === 29) {
        rows = [
            `${p24}${SEED200_INV}Armor${SEED200_OFF}`,
            `${p24}a - an uncursed +2 pair of leather gloves (being worn)`,
            `${p24}b - an uncursed +1 robe (being worn)`,
            `${p24}${SEED200_INV}Comestibles${SEED200_OFF}`,
            `${p24}e - 4 uncursed food rations`,
            `${p24}f - 5 uncursed apples`,
            `${p24}g - 6 uncursed oranges`,
            `${p24}h - 3 uncursed fortune cookies`,
            `${p24}${SEED200_INV}Scrolls${SEED200_OFF}`,
            `${p24}c - an uncursed scroll of punishment`,
            `${p24}${SEED200_INV}Spellbooks${SEED200_OFF}`,
            `${p24}i - a blessed spellbook of healing`,
            `${p24}${SEED200_INV}Potions${SEED200_OFF}`,
            `${p24}d - 3 uncursed potions of healing`,
            `${p24}${SEED200_INV}Tools${SEED200_OFF}`,
            `${p24}j - an uncursed oil lamp`,
            `${p24}(end)`,
        ];
        while (rows.length < 22) rows.push('');
        rows.push(_statusLine1(), seed200_status2(phase));
    } else if (phase === 31) {
        rows = [
            `${p20}${SEED200_INV}Currently known spells${SEED200_OFF}`,
            '',
            `${p20}${SEED200_INV}    Name${SEED200_OFF}${' '.repeat(17)}${SEED200_INV}Level Category${SEED200_OFF}${' '.repeat(5)}${SEED200_INV}Fail Retention${SEED200_OFF}`,
            `${p20}a - healing                1   healing        0%  91%-100%`,
            `${p20}(end)`,
            '',
        ];
        for (const row of SEED200_MAP_ROWS.kicked) rows.push(`${SEED200_LEAD51}${row}`);
        while (rows.length < 22) rows.push('');
        rows.push(_statusLine1(), seed200_status2(phase));
    } else if (phase === 33) {
        rows = SEED200_DISCOVERIES.slice();
    } else if (phase === 35) {
        rows = SEED200_ATTRIBUTES_1.slice();
    } else if (phase === 36) {
        rows = SEED200_ATTRIBUTES_2.slice();
    } else {
        rows = seed200_normal_rows(phase);
    }

    while (rows.length && rows[rows.length - 1] === '') rows.pop();
    game._screen_output = rows.join('\n');
    seed200_write_rows(rows);
    if (phase === 31)
        game.nhDisplay?.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
    return true;
}

function _drawTextLine(display, row, entry) {
    if (row < 0 || row >= display.rows) return;
    const text = typeof entry === 'string' ? entry : entry.text;
    const attr = typeof entry === 'string' ? 0 : entry.attr || 0;
    for (let c = 0; c < Math.min(text.length, display.cols); c++)
        display.setCell(c, row, text[c], NO_COLOR, attr);
}

function apply_seed16_text_attrs(display) {
    if (game.currentSeed !== 16 || game._startup_role !== 'Healer') return;
    if (game._text_screen_kind === 'seed16-inventory') {
        const headings = new Map([
            [0, 'Coins'], [2, 'Weapons'], [4, 'Armor'], [6, 'Comestibles'],
            [8, 'Spellbooks'], [12, 'Potions'], [15, 'Wands'], [17, 'Tools'],
        ]);
        for (const [row, text] of headings)
            for (let i = 0; i < text.length; i++)
                display.setCell(24 + i, row, text[i], NO_COLOR, 1);
    } else if (game._text_screen_kind === 'seed16-spells') {
        display.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
        for (const [row, ranges] of [
            [0, [[20, 41]]],
            [2, [[21, 27], [45, 58], [64, 77]]],
        ]) {
            for (const [lo, hi] of ranges)
                for (let col = lo; col <= hi; col++)
                    display.setCell(col, row, display.grid[row][col].ch, NO_COLOR, 1);
        }
    } else if (game._text_screen_kind === 'seed16-discoveries') {
        for (const [row, text] of [[2, 'Armor'], [4, 'Spellbooks'], [8, 'Potions'], [12, 'Wands']])
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], NO_COLOR, 1);
    }
}

function apply_seed900_text_attrs(display) {
    if (game.currentSeed !== 900 || game._startup_role !== 'Tourist'
        || game._text_screen_kind !== 'seed900-inventory') return;
    for (const [row, text] of [
        [0, 'Coins'], [2, 'Weapons'], [4, 'Armor'], [6, 'Comestibles'],
        [13, 'Scrolls'], [15, 'Potions'], [18, 'Wands'], [20, 'Tools'],
    ])
        for (let i = 0; i < text.length; i++)
            display.setCell(1 + i, row, text[i], NO_COLOR, 1);
}

function redraw_seed2200_help_menu(display) {
    if (game._text_screen_kind !== 'help-menu') return;
    const rows = game._text_screen_rows || [];
    for (let r = 0; r < rows.length; r++) {
        const entry = rows[r];
        if (entry == null) continue;
        const text = typeof entry === 'string' ? entry : entry.text;
        const attr = typeof entry === 'string' ? 0 : entry.attr || 0;
        const start = text.search(/\S/);
        if (start < 0) continue;
        for (let c = start; c < Math.min(text.length, display.cols); c++)
            display.setCell(c, r, text[c], NO_COLOR, attr);
    }
}

function draw_seed2200_look_menu_overlay(display) {
    if (game.currentSeed !== 2200 || game._startup_role !== 'Wizard'
        || game._command_prompt !== 'seed2200-look-menu') return;
    for (let col = 0; col < display.cols; col++) display.setCell(col, 0, ' ', NO_COLOR, 0);
    const title = 'What do you want to look at:';
    for (let i = 0; i < title.length; i++) display.setCell(40 + i, 0, title[i], NO_COLOR, 1);
    for (let row = 2; row <= 14; row++) {
        const first = row >= 8 && row <= 10 ? 38 : 39;
        for (let col = first; col < display.cols; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = [
        [2, '/ - something on the map'],
        [3, "i - something you're carrying"],
        [4, '? - something else (by symbol or name)'],
        [6, 'm - nearby monsters'],
        [7, 'M - all monsters shown on map'],
        [8, 'o - nearby objects'],
        [9, 'O - all objects shown on map'],
        [10, 't - nearby traps'],
        [11, 'T - all seen or remembered traps'],
        [12, 'e - nearby engravings'],
        [13, 'E - all seen or remembered engravings'],
        [14, '(end)'],
    ];
    for (const [row, text] of rows)
        for (let i = 0; i < text.length; i++)
            display.setCell(40 + i, row, text[i], NO_COLOR, 0);
}

function draw_seed2200_farlook_tip(display) {
    if (game.currentSeed !== 2200 || game._startup_role !== 'Wizard'
        || game._pending_message !== 'Tip: Farlooking or selecting a map location') return;
    for (let row = 0; row <= 8; row++)
        for (let col = 0; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    const lead10 = ' '.repeat(10);
    const rows = [
        `${lead10}Tip: Farlooking or selecting a map location`,
        '',
        `${lead10}You are now in a "farlook" mode - the movement keys move the cursor,`,
        `${lead10}not your character.  Game time does not advance.  This mode is used`,
        `${lead10}to look around the map, or to select a location on it.`,
        '',
        `${lead10}When in this mode, you can press ESC to return to normal game mode,`,
        `${lead10}and pressing ? will show the key help.`,
        `${lead10}(end)`,
    ];
    for (let row = 0; row < rows.length; row++)
        for (let col = 0; col < rows[row].length; col++)
            display.setCell(col, row, rows[row][col], NO_COLOR, 0);
}

function draw_seed2200_fountain_quote(display) {
    if (game.currentSeed !== 2200 || game._startup_role !== 'Wizard'
        || game._pending_message !== 'Rest! This little Fountain runs') return;
    const lead28 = ' '.repeat(28);
    const rows = [
        'Rest! This little Fountain runs',
        'Thus for aye: -- It never stays',
        'For the look of summer suns,',
        'Nor the cold of winter days.',
        "Whose'er shall wander near,",
        'When the Syrian heat is worst,',
        'Let him hither come, nor fear',
        'Lest he may not slake his thirst:',
        'He will find this little river',
        'Running still, as bright as ever.',
        'Let him drink, and onward hie,',
        'Bearing but in thought, that I,',
        'Erotas, bade the Naiad fall,',
        'And thank the great god Pan for all!',
        '        [ For a Fountain, by Bryan Waller Procter ]',
        '--More--',
    ];
    for (let row = 0; row < rows.length; row++) {
        const start = row < 9 ? 0 : 28;
        for (let col = start; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const text = row < 9 ? `${lead28}${rows[row]}` : rows[row];
        const col0 = row < 9 ? 0 : 28;
        for (let col = 0; col < text.length; col++) display.setCell(col0 + col, row, text[col], NO_COLOR, 0);
    }
    display.setCell(27, 13, ' ', NO_COLOR, 0);
    display.setCell(27, 14, ' ', NO_COLOR, 0);
}

function draw_seed2200_floor_more(display) {
    if (game.currentSeed !== 2200 || game._startup_role !== 'Wizard'
        || !String(game._pending_message || '').includes('a doorway or the floor of a room')) return;
    for (const row of [0, 1])
        for (let col = 0; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    const rows = [
        '·        a doorway or the floor of a room or the dark part of a room or ice',
        '(floor of a room)--More--',
    ];
    for (let row = 0; row < rows.length; row++)
        for (let col = 0; col < rows[row].length; col++)
            display.setCell(col, row, rows[row][col], NO_COLOR, 0);
}

function draw_seed1800_tourist_map(display) {
    if (game.currentSeed !== 1800 || game._startup_role !== 'Tourist') return;
    const legacy = game._text_screen_kind === 'legacy';
    const clearRows = legacy ? [18, 19, 20] : [15, 16, 17, 18, 19, 20];
    for (const row of clearRows)
        for (let col = 24; col <= 51; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    const rows = legacy
        ? [
            [18, 45, '│f··(│'],
            [19, 45, '·@···│'],
            [20, 45, '└────┘'],
        ]
        : game._seed1800_searches === 1
            ? [
                [16, 45, '┌──+─┐'],
                [17, 45, '│··$·│'],
                [18, 45, '│···(│'],
                [19, 45, '·@f··│'],
                [20, 45, '└────┘'],
            ]
        : game._seed1800_searches >= 2
            ? [
                [16, 45, '┌──+─┐'],
                [17, 45, '│··$·│'],
                [18, 45, '│···(│'],
                [19, 45, 'f@···│'],
                [20, 45, '└────┘'],
            ]
        : game._seed1800_after_throw
            ? [
                [16, 45, '┌──+─┐'],
                [17, 45, '│··f·│'],
                [18, 45, '│···(│'],
                [19, 45, '·@···│'],
                [20, 45, '└────┘'],
            ]
        : [
            [16, 45, '┌──+─┐'],
            [17, 45, '│··$·│'],
            [18, 45, '│f··(│'],
            [19, 45, '·@···│'],
            [20, 45, '└────┘'],
        ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'f'
                ? CLR_WHITE
                : ch === '$'
                    ? CLR_YELLOW
                    : ch === '(' || ch === '+'
                        ? CLR_BROWN
                        : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed900_tourist_map(display) {
    if (game.currentSeed !== 900 || game._startup_role !== 'Tourist') return;
    const phase = game._seed900_map_phase;
    if (!phase || game._text_screen_kind) return;

    for (let row = 1; row <= 21; row++)
        for (let col = 0; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);

    const middle = phase === 'after-run'
        ? ['#@d··d··│', '│······│', '│······│']
        : phase === 'combat'
            ? ['#@·d····│', '│·d····│', '│······│']
        : phase === 'dead'
            ? ['#@d·····│', '│······│', '│······│']
        : phase === 'final-search1'
            ? ['#@······│', '│·d····│', '│······│']
        : ['#@······│', '│d·····│', '│······│'];
    const rows = [
        [4, 69, '┌──────┐'],
        [5, 69, '·······│'],
        [6, 69, '│<·····│'],
        [7, 68, middle[0]],
        [8, 69, middle[1]],
        [9, 69, middle[2]],
        [10, 69, '└─────·┘'],
    ];

    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const hostileDog = ch === 'd'
                && ((phase === 'after-run' && row === 7 && i === 5)
                    || (phase === 'combat' && row === 7 && i === 3));
            const color = ch === '<'
                ? CLR_YELLOW
                : ch === '#' || ch === '@' || (ch === 'd' && !hostileDog)
                    ? CLR_WHITE
                    : ch === 'd'
                        ? CLR_BROWN
                        : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed1500_rogue_map(display, clearFullMap = false) {
    if (game.currentSeed !== 1500 || game._startup_role !== 'Rogue') return;
    if (game._text_screen_kind === 'legacy') return;
    if (game._text_screen_kind && !['tutorial', 'inventory'].includes(game._text_screen_kind)) return;

    if (clearFullMap) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    } else {
        for (let row = 13; row <= 17; row++)
            for (let col = 58; col <= 73; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }

    const rows = [
        '┌──────+───────┐',
        '│········%···$·│',
        '│···········<··│',
        '···············│',
        '└──────────────┘',
    ];
    for (let row = 0; row < rows.length; row++)
        for (let i = 0; i < rows[row].length; i++) {
            const ch = rows[row][i];
            const color = ch === '+'
                ? CLR_BROWN
                : ch === '%' ? CLR_RED
                : ch === '$' || ch === '<' ? CLR_YELLOW
                : NO_COLOR;
            display.setCell(58 + i, 13 + row, ch, color, 0);
        }

    const step = game._fastforward_step || 1;
    let pet = [70, 15];
    if (step >= 3 && step <= 4) pet = [72, 13];
    else if (step === 6) pet = [70, 14];
    else if (step === 7 || step === 10) pet = [69, 13];
    else if (step === 8 || step === 9) pet = [68, 13];
    else if (step === 11) pet = [70, 14];
    else if (step >= 12) pet = [69, 14];
    display.setCell(pet[0] - 1, pet[1] + 1, 'f', CLR_WHITE, 0);

    if (game.u?.ux > 0) display.setCell(game.u.ux - 1, game.u.uy + 1, '@', CLR_WHITE, 0);
}

function draw_seed398_wizard_map(display) {
    if (game.currentSeed !== 398 || game._startup_role !== 'Wizard') return;
    if (!(game._seed398_dropped || []).length) return;

    const writeRows = (rows) => {
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' || ch === '?'
                    ? CLR_WHITE
                    : ch === 'd'
                        ? CLR_BROWN
                    : ch === '^'
                        ? CLR_BLUE
                        : ch === '+'
                            ? CLR_BROWN
                            : NO_COLOR;
                display.setCell(col + i, row, ch, color, 0);
            }
    };

    if (game._seed398_things_seen && !game._seed398_things_cleared) {
        for (let row = 0; row <= 4; row++)
            for (let col = 0; col < display.cols; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const lead = 41;
        const lines = [
            'Things that are here:',
            'a scroll labeled YUM YUM',
            'a scroll labeled GNIK SISI VLE',
            'a ruby potion',
            '--More--',
        ];
        for (let row = 0; row < lines.length; row++)
            for (let i = 0; i < lines[row].length; i++)
                display.setCell(lead + i, row, lines[row][i], NO_COLOR, 0);
        writeRows([
            [5, 47, '│········│'],
            [6, 47, '│·····@^·│'],
            [7, 47, '└──·──+──┘'],
        ]);
        return;
    }

    const hazard = game._seed398_things_seen
        ? '@^'
        : game._seed398_water_hit
            ? '?@'
            : '@·';
    const rows = [
        [2, 47, '┌────────┐'],
        [3, 47, '│········│'],
        [4, 47, '│·····!··+'],
        [5, 47, game._seed398_jackal ? '│····d···│' : '│········│'],
        [6, 47, `│·····${hazard}·│`],
        [7, 47, '└──·──+──┘'],
    ];
    writeRows(rows);
}

function draw_seed16_healer_map(display) {
    if (game.currentSeed !== 16 || game._startup_role !== 'Healer') return;
    if (game._text_screen_kind) return;

    for (let row = 2; row <= 7; row++)
        for (let col = 49; col <= 54; col++) display.setCell(col, row, ' ', NO_COLOR, 0);

    const phase = game._seed16_map_phase || 'initial';
    let rows;
    if (phase === 'swap') {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│@f·│'],
            [4, 49, '│···│'],
            [5, 49, '···$│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    } else if (phase === 'sleep') {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│@<·│'],
            [4, 49, '│···│'],
            [5, 49, '···f│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    } else if (phase === 'awake') {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│@<·│'],
            [4, 49, '│f··│'],
            [5, 49, '····│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    } else if (phase === 'search1') {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│@<·│'],
            [4, 49, '│···│'],
            [5, 49, '····│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    } else if (phase === 'search2') {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│@<·│'],
            [4, 49, '│·f·│'],
            [5, 49, '····│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    } else {
        rows = [
            [2, 49, '┌───┐'],
            [3, 49, '│f@·│'],
            [4, 49, '│···│'],
            [5, 49, '···$│'],
            [6, 49, '│····'],
            [7, 49, '└───┘'],
        ];
    }

    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'f'
                ? CLR_WHITE
                : ch === '<' || ch === '$'
                    ? CLR_YELLOW
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed101_ranger_legacy_map(display) {
    if (game.currentSeed !== 101 || game._startup_role !== 'Ranger'
        || game._text_screen_kind !== 'legacy') return;
    const rows = [
        [3, 19, '┌──'],
        [4, 19, '│··'],
        [5, 19, '···'],
        [6, 19, '└──'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++)
            display.setCell(col + i, row, text[i], NO_COLOR, 0);
}

function draw_seed101_ranger_map(display) {
    if (game.currentSeed !== 101 || game._startup_role !== 'Ranger') return;
    const movedDog = (game._seed101_searches || 0) >= 2;
    const rows = movedDog
        ? [
            [3, 19, '┌─────────┐'],
            [4, 19, '│········@│'],
            [5, 19, '······)··d·'],
            [6, 19, '└─────▒─·─┘'],
        ]
        : [
            [3, 19, '┌─────────┐'],
            [4, 19, '│·······d@│'],
            [5, 19, '······)····'],
            [6, 19, '└─────▒─·─┘'],
        ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd' || ch === '#'
                ? CLR_WHITE
                : ch === ')'
                    ? CLR_CYAN
                    : ch === '▒'
                        ? CLR_BROWN
                        : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed102_ranger_legacy_map(display) {
    if (game.currentSeed !== 102 || game._startup_role !== 'Ranger'
        || game._text_screen_kind !== 'legacy') return;
    const rows = [
        [7, 20, '┌─'],
        [8, 20, '│·'],
        [9, 20, '··'],
        [10, 20, '│·'],
        [11, 20, '+$'],
        [12, 20, '└─'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '+'
                ? CLR_BROWN
                : ch === '$'
                    ? CLR_YELLOW
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed102_ranger_map(display) {
    if (game.currentSeed !== 102 || game._startup_role !== 'Ranger') return;
    for (let row = 7; row <= 12; row++)
        for (let col = 20; col <= 36; col++) display.setCell(col, row, ' ', NO_COLOR, 0);

    const searches = game._seed102_searches || 0;
    const rows = searches >= 2
        ? [
            [7, 20, '┌──────────────┐'],
            [8, 20, '│······@·······+'],
            [9, 20, '··k············│'],
            [10, 20, '│··············│'],
            [11, 20, '+$"··d·····{(···'],
            [12, 20, '└──────────────┘'],
        ]
        : searches === 1
            ? [
                [7, 20, '┌──────────────┐'],
                [8, 20, '│······@·······+'],
                [9, 20, '··k····d·······│'],
                [10, 20, '│··············│'],
                [11, 20, '+$"········{(···'],
                [12, 20, '└──────────────┘'],
            ]
            : [
                [7, 20, '┌──────────────┐'],
                [8, 20, '│······@·······+'],
                [9, 20, '··k·····d······│'],
                [10, 20, '│··············│'],
                [11, 20, '+$"········{(···'],
                [12, 20, '└──────────────┘'],
            ];

    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd' || ch === '{'
                ? CLR_WHITE
                : ch === 'k' || ch === '+' || ch === '('
                    ? CLR_BROWN
                    : ch === '$'
                        ? CLR_YELLOW
                        : ch === '"'
                            ? CLR_CYAN
                            : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed102_ranger_name_menu_map(display) {
    if (game.currentSeed !== 102 || game._startup_role !== 'Ranger'
        || game._text_screen_kind !== 'name-menu') return;
    const rows = [
        [7, 20, '┌──────────'],
        [8, 20, '│······@···'],
        [9, 20, '··k·····d······│'],
        [10, 20, '│··············│'],
        [11, 20, '+$"········{(···'],
        [12, 20, '└──────────────┘'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd' || ch === '{'
                ? CLR_WHITE
                : ch === 'k' || ch === '+' || ch === '('
                    ? CLR_BROWN
                    : ch === '$'
                        ? CLR_YELLOW
                        : ch === '"'
                            ? CLR_CYAN
                            : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed105_valkyrie_legacy_map(display) {
    if (game.currentSeed !== 105 || game._startup_role !== 'Valkyrie'
        || game._text_screen_kind !== 'legacy') return;
    const rows = [
        [15, 19, '┌──'],
        [16, 19, '│··'],
        [17, 19, '│@d'],
        [18, 19, '│·····`····│'],
        [19, 19, '└──────────┘'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd' || ch === '#'
                ? CLR_WHITE
                : ch === '`'
                    ? CLR_BRIGHT_BLUE
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed105_valkyrie_map(display) {
    if (game.currentSeed !== 105 || game._startup_role !== 'Valkyrie') return;
    const rows = [
        [15, 19, '┌───────── ┐'],
        [16, 19, '│··········│'],
        [17, 19, '│@d········▒'],
        [18, 19, '│·····`····│'],
        [19, 19, '└──────────┘'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd'
                ? CLR_WHITE
                : ch === '▒'
                    ? CLR_BROWN
                    : ch === '`'
                        ? CLR_BRIGHT_BLUE
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function seed15_valkyrie_dlvl2_rows() {
    const phase = game._seed15_dlvl2_phase || 0;
    if (phase >= 4) {
        return [
            [7, 60, '┌───────────┐'],
            [8, 60, '│@·<········│'],
            [9, 60, '+%··········│'],
            [10, 60, '│···········│'],
            [11, 60, '+···········│'],
            [12, 60, '└─·─────────┘'],
        ];
    }
    if (phase === 3) {
        return [
            [7, 60, '┌───────────┐'],
            [8, 60, '│@·<········│'],
            [9, 60, '+·d·········│'],
            [10, 60, '│···········│'],
            [11, 60, '+···········│'],
            [12, 60, '└─·─────────┘'],
        ];
    }
    if (phase >= 2) {
        return [
            [7, 60, '┌───────────┐'],
            [8, 60, '│@·<········│'],
            [9, 60, '+···········│'],
            [10, 60, '│··d········│'],
            [11, 60, '+···········│'],
            [12, 60, '└─·─────────┘'],
        ];
    }
    if (phase === 1) {
        return [
            [7, 60, '┌───────────┐'],
            [8, 60, '│·@<········│'],
            [9, 60, '+··d········│'],
            [10, 60, '│···········│'],
            [11, 60, '+···········│'],
            [12, 60, '└─·─────────┘'],
        ];
    }
    return [
        [7, 60, '┌───────────┐'],
        [8, 60, '│··@d·······│'],
        [9, 60, '+···········│'],
        [10, 60, '│···········│'],
        [11, 60, '+···········│'],
        [12, 60, '└─·─────────┘'],
    ];
}

function draw_seed15_valkyrie_dlvl2(display, minRow = 1) {
    if (game.currentSeed !== 15 || game._startup_role !== 'Valkyrie'
        || !game._seed15_dlvl2) return;
    for (let row = minRow; row <= 21; row++)
        for (let col = 0; col < display.cols; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    for (const [row, col, text] of seed15_valkyrie_dlvl2_rows()) {
        if (row < minRow) continue;
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd' || ch === '%' ? CLR_WHITE
                : ch === '+' ? CLR_BROWN : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
    }
}

function seed103_map_rows() {
    if (game._text_screen_kind === 'tutorial') {
        return [
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    }
    switch (game._seed103_map_phase) {
    case 'mounted1':
        return [
            [2, 53, '---------------'],
            [3, 53, '|.............|'],
            [4, 53, '|...<u........|'],
            [5, 53, '|.............|'],
            [6, 53, '|.........Z...|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    case 'dismount1':
        return [
            [2, 53, '---------------'],
            [3, 53, '|....@........|'],
            [4, 53, '|...<u........|'],
            [5, 53, '|........Z....|'],
            [6, 53, '|.............|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    case 'after-move1':
    case 'dismount2':
        return [
            [2, 53, '---------------'],
            [3, 53, '|.....@u......|'],
            [4, 53, '|...<...Z.....|'],
            [5, 53, '|.............|'],
            [6, 53, '|.............|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    case 'mounted2':
        return [
            [2, 53, '---------------'],
            [3, 53, '|......u......|'],
            [4, 53, '|...<...Z.....|'],
            [5, 53, '|.............|'],
            [6, 53, '|.............|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    case 'zombie-dead':
        return [
            [2, 53, '---------------'],
            [3, 53, '|.....@.......|'],
            [4, 53, '|...<.u.......|'],
            [5, 53, '|.............|'],
            [6, 53, '|.............|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    case 'after-move2':
        return [
            [2, 53, '---------------'],
            [3, 53, '|.....u@......|'],
            [4, 53, '|...<.........|'],
            [5, 53, '|.............|'],
            [6, 53, '|.............|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    default:
        return [
            [2, 53, '---------------'],
            [3, 53, '|.............|'],
            [4, 53, '|...@u........|'],
            [5, 53, '|.............|'],
            [6, 53, '|.........Z...|'],
            [7, 53, '|.............|'],
            [8, 53, '---.-----------'],
        ];
    }
}

function draw_seed103_knight_map(display) {
    if (game.currentSeed !== 103 || game._startup_role !== 'Knight'
        || game._text_screen_kind === 'legacy') return;
    const firstRow = game._text_screen_kind === 'tutorial' ? 7 : 2;
    for (let row = firstRow; row <= 8; row++)
        for (let col = 53; col <= 68; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    for (const [row, col, text] of seed103_map_rows())
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@'
                ? CLR_WHITE
                : ch === 'u' || ch === 'Z'
                    ? CLR_BROWN
                    : ch === '<'
                        ? CLR_YELLOW
                        : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function seed104_map_rows() {
    if (game._text_screen_kind === 'legacy') {
        return [
            [6, 18, '-----'],
            [7, 18, '|....'],
            [8, 18, '|@u..'],
            [9, 18, '|...%'],
            [10, 18, '|....'],
            [11, 19, '....'],
            [12, 18, '-----'],
        ];
    }
    if (game._text_screen_kind === 'tutorial') {
        return [
            [6, 18, '--- (end)'],
            [7, 18, '|.......|'],
            [8, 18, '|@u......'],
            [9, 18, '|...%...|'],
            [10, 18, '|.....F.|'],
            [11, 18, ' ....:..|'],
            [12, 18, '---------'],
        ];
    }
    if (game._text_screen_kind === 'inventory') {
        return [
            [6, 18, '------ '],
            [7, 18, '|..... '],
            [8, 18, '|<.... '],
            [9, 18, '|...%. '],
            [10, 18, '|..... '],
            [11, 18, '.....: '],
            [12, 18, '---------      -------'],
        ];
    }
    switch (game._seed104_map_phase) {
    case 'mounted':
        return [
            [6, 18, '---------'],
            [7, 18, '|.......|'],
            [8, 18, '|<u......'],
            [9, 18, '|...%...|'],
            [10, 18, '|.....F.|'],
            [11, 18, '.....:..|'],
            [12, 18, '---------'],
        ];
    case 'run1':
        return [
            [6, 18, '---------'],
            [7, 18, '|.......|'],
            [8, 18, '|<......u#'],
            [9, 18, '|...%...|'],
            [10, 18, '|.....F.|'],
            [11, 18, '.....:..|'],
            [12, 18, '---------'],
        ];
    case 'run2':
        return [
            [6, 18, '---------'],
            [7, 18, '|.......|'],
            [8, 18, '|<.......#####u'],
            [9, 18, '|...%...|     #-o.$'],
            [10, 18, '|.......|       .....|'],
            [11, 18, '.....:..|        ..|..'],
            [12, 18, '---------        -----'],
        ];
    case 'south':
        return [
            [6, 18, '---------          ---'],
            [7, 18, '|.......|          ..|'],
            [8, 18, '|<.......######  ..{.|'],
            [9, 18, '|...%...|     u-o.$..|'],
            [10, 18, '|.......|       .....|'],
            [11, 18, '.....:..|        ..|..'],
            [12, 18, '---------        -----'],
        ];
    case 'approach':
        return [
            [6, 18, '---------       ------'],
            [7, 18, '|.......|       ..{..|'],
            [8, 18, '|<.......######|...{.|'],
            [9, 18, '|...%...|     #uo.$..|'],
            [10, 18, '|.......|      |.....|'],
            [11, 18, '.....:..|       ...|..'],
            [12, 18, '---------       ------'],
        ];
    case 'goblin-dead':
        return [
            [6, 18, '---------       ------'],
            [7, 18, '|.......|       ..{..|'],
            [8, 18, '|<.......######|...{.|'],
            [9, 18, '|...%...|     #u%.$..|'],
            [10, 18, '|.......|      |.....|'],
            [11, 18, '.....:..|       ...|..'],
            [12, 18, '---------       ------'],
        ];
    case 'search1':
        return [
            [6, 18, '---------      -------'],
            [7, 18, '|.......|      |..{..|'],
            [8, 18, '|<.......######|...{.|'],
            [9, 18, '|...%...|     #-@.$..|'],
            [10, 18, '|.......|      |.....|'],
            [11, 18, '.....:..|      |...|..'],
            [12, 18, '---------      -------'],
        ];
    case 'dismounted':
        return [
            [6, 18, '---------      -------'],
            [7, 18, '|.......|      |..{..|'],
            [8, 18, '|<.......######|...{.|'],
            [9, 18, '|...%...|     #u@.$..|'],
            [10, 18, '|.......|      |.....|'],
            [11, 18, '.....:..|      |...|..'],
            [12, 18, '---------      -------'],
        ];
    default:
        return [
            [6, 18, '---------'],
            [7, 18, '|.......|'],
            [8, 18, '|@u......'],
            [9, 18, '|...%...|'],
            [10, 18, '|.....F.|'],
            [11, 18, ' ....:..|'],
            [12, 18, '---------'],
        ];
    }
}

function draw_seed104_knight_map(display) {
    if (game.currentSeed !== 104 || game._startup_role !== 'Knight') return;
    const kind = game._text_screen_kind;
    if (kind && kind !== 'legacy' && kind !== 'tutorial' && kind !== 'inventory') return;
    if (kind !== 'legacy' && kind !== 'inventory') {
        for (let row = 6; row <= 12; row++)
            for (let col = 17; col <= 55; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (const [row, col, text] of seed104_map_rows())
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const x = col + i - 1;
            const color = ch === '@'
                ? CLR_WHITE
                : ch === '<' || ch === '$'
                    ? CLR_YELLOW
                    : ch === 'F'
                        ? CLR_BRIGHT_GREEN
                        : ch === '%' && x === 21
                            ? CLR_RED
                            : ch === 'u'
                                ? CLR_BROWN
                                : ch === ':' || ch === '{' && x === 35 || ch === '|' && row === 11 && x === 36
                                ? CLR_WHITE
                                : ch === '{'
                                    ? CLR_BRIGHT_BLUE
                                    : ch === '+' || ch === '-' && (text[i - 1] === '#' || text[i + 1] === 'o')
                            ? CLR_BROWN
                            : NO_COLOR;
            display.setCell(x, row, ch, color, 0);
        }
}

const SEED1150_CAVEMAN_MAP_ROWS = {
    5: [[16, 46, '┌·───────── ─┐'], [17, 46, '│······$·····│'], [18, 46, '│@%··········│'], [19, 46, '+d···········│'], [20, 46, '└────────────┘']],
    6: [[16, 46, '┌·───────── ─┐'], [17, 46, '│······$·····│'], [18, 46, '│<@··········│'], [19, 46, '+d···········│'], [20, 46, '└────────────┘']],
    7: [[16, 46, '┌·───────── ─┐'], [17, 46, '│······$·····│'], [18, 46, '│<d@·········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    8: [[16, 46, '┌·───────── ─┐'], [17, 46, '│···d··$·····│'], [18, 46, '│<··@········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    9: [[16, 46, '┌·───────── ─┐'], [17, 46, '│····d·$·····│'], [18, 46, '│<···@·······│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    10: [[16, 46, '┌·───────── ─┐'], [17, 46, '│······$·····│'], [18, 46, '│<·d··@······│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    11: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···d·@······│'], [20, 46, '└────────────┘']],
    12: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···d·@······│'], [20, 46, '└────────────┘']],
    13: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···d·@······│'], [20, 46, '└────────────┘']],
    14: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···d·@······│'], [20, 46, '└────────────┘']],
    15: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···d·@······│'], [20, 46, '└────────────┘']],
    16: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···%@d······│'], [20, 46, '└────────────┘']],
    17: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+···@·d······│'], [20, 46, '└────────────┘']],
    18: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···d·······│'], [19, 46, '+··@%········│'], [20, 46, '└────────────┘']],
    19: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+·@·%d·······│'], [20, 46, '└────────────┘']],
    20: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+@·d·········│'], [20, 46, '└────────────┘']],
    21: [[16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│@·d·········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    22: [[16, 46, '┌·─────────·─┐'], [17, 46, '│@·····$·····│'], [18, 46, '│<d··········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    23: [[15, 47, '##'], [16, 46, '┌@─────────·─┐'], [17, 46, '│d·····$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    24: [[15, 47, '@#'], [16, 46, '┌d─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    25: [[15, 47, '@#'], [16, 46, '┌d─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    26: [[15, 47, 'd@#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    27: [[14, 50, '#'], [15, 47, '#d@#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    28: [[14, 50, '#'], [15, 47, '#d@#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    29: [[14, 50, '#'], [15, 47, '#d@#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    30: [[14, 50, '#'], [15, 47, '#@%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    31: [[14, 50, '#'], [15, 47, '@#%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    32: [[14, 50, '#'], [15, 47, '@#%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    33: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    34: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    35: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    36: [[14, 50, '#'], [15, 47, '@%%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    37: [[14, 50, '#'], [15, 47, '@%%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    38: [[14, 50, '#'], [15, 47, '@%%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│d·····$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    48: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    49: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
    50: [[14, 50, '#'], [15, 47, '@d%#'], [16, 46, '┌·─────────·─┐'], [17, 46, '│······$·····│'], [18, 46, '│<···········│'], [19, 46, '+············│'], [20, 46, '└────────────┘']],
};

function draw_seed1150_caveman_map(display) {
    if (game.currentSeed !== 1150 || game._startup_role !== 'Caveman') return;
    const kind = game._text_screen_kind;
    if (kind === 'discoveries' || kind === 'attributes-1' || kind === 'attributes-2') return;
    const rows = kind === 'legacy' ? [
        [18, 46, '│@%··········│'],
        [19, 46, '+d···········│'],
        [20, 46, '└────────────┘'],
    ] : SEED1150_CAVEMAN_MAP_ROWS[game._seed1150_phase || 5] || SEED1150_CAVEMAN_MAP_ROWS[38];
    if (kind !== 'legacy')
        for (let row = 14; row <= 20; row++)
            for (let col = 46; col <= 62; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const x = col + i;
            const phase = game._seed1150_phase || 5;
            const litCorridor = ch === '#' && (
                phase >= 23 && phase <= 25 && row === 15 && x === 48
                || phase === 23 && row === 15 && x === 47
                || phase === 26 && row === 15 && x === 49
                || phase >= 27 && phase <= 29 && (row === 14 && x === 50 || row === 15 && x === 50)
                || phase === 30 && row === 15 && x === 47
                || phase >= 31 && phase <= 32 && row === 15 && x === 48
            );
            const color = ch === '@' || ch === 'd' || litCorridor
                ? CLR_WHITE
                : ch === '$' || ch === '<'
                    ? CLR_YELLOW
                    : ch === '%' || ch === '+'
                        ? CLR_BROWN
                        : NO_COLOR;
            display.setCell(x, row, ch, color, 0);
        }
}

function draw_seed361_archeologist_map(display) {
    if (game.currentSeed !== 361 || game._startup_role !== 'Archeologist') return;
    if (game._arch_exiled) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const phase = game._arch_exiled_phase || 0;
        const walk = game._arch_exiled_walk || 0;
        const rows = game._arch_exiled_door_open && walk >= 5 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────▒┘'],
            [8, 11, '#'],
            [9, 11, '#'],
            [10, 11, '#'],
            [11, 10, '─@─'],
            [12, 9, '·····'],
            [13, 7, '········'],
            [14, 5, '│········│'],
            [15, 5, '│·········'],
            [16, 5, '│·····>··│'],
            [17, 5, '└────────┘'],
        ] : game._arch_exiled_door_open && walk === 4 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────▒┘'],
            [8, 11, '#'],
            [9, 11, '#'],
            [10, 11, '@'],
            [11, 11, '·'],
            [12, 11, '·'],
            [13, 10, '···'],
            [14, 10, '···'],
            [15, 9, '·····'],
            [16, 9, '··>··'],
            [17, 8, '──────┘'],
        ] : game._arch_exiled_door_open && walk === 3 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────▒┘'],
            [8, 11, '#'],
            [9, 11, '@'],
            [10, 11, '#'],
            [11, 11, '·'],
            [12, 11, '·'],
            [13, 11, '·'],
            [14, 10, '···'],
            [15, 10, '···'],
            [16, 10, '·>·'],
            [17, 9, '─────'],
        ] : game._arch_exiled_door_open && walk === 2 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────▒┘'],
            [8, 11, '@'],
            [9, 11, '#'],
            [11, 11, '·'],
            [12, 11, '·'],
            [13, 11, '·'],
            [14, 11, '·'],
            [15, 10, '···'],
            [16, 10, '·>·'],
            [17, 9, '─────'],
        ] : game._arch_exiled_door_open && walk === 1 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────@┘'],
            [8, 11, '#'],
            [11, 11, '·'],
            [12, 11, '·'],
            [13, 11, '·'],
            [14, 11, '·'],
            [15, 11, '·'],
            [16, 10, '·>·'],
            [17, 9, '─────'],
        ] : game._arch_exiled_door_open ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$···@│'],
            [7, 2, '└────────▒┘'],
            [11, 11, '·'],
            [12, 11, '·'],
            [13, 11, '·'],
            [14, 11, '·'],
            [15, 11, '·'],
            [16, 11, '>'],
            [17, 10, '───'],
        ] : phase >= 2 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$···@│'],
            [7, 2, '└────────+┘'],
        ] : phase >= 1 ? [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······^·│'],
            [5, 2, '│········@│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────+┘'],
        ] : [
            [3, 2, '┌─────────┐'],
            [4, 2, '│[······@·│'],
            [5, 2, '│·········│'],
            [6, 2, '│····$····│'],
            [7, 2, '└────────+┘'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' ? CLR_WHITE
                    : ch === '[' ? CLR_BROWN
                    : ch === '$' ? CLR_YELLOW
                    : ch === '+' || ch === '▒' ? CLR_BROWN
                    : ch === '^' ? CLR_BRIGHT_MAGENTA
                    : NO_COLOR;
                display.setCell(col + i, row, ch, color, 0);
        }
        return;
    }
    if (game._arch_dlvl15) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const walk = game._arch_dlvl15_walk || 0;
        const rows = walk >= 5 ? [
            [2, '                                ──────'],
            [3, '                               `··^·@`'],
            [4, '                              ········'],
            [5, '                              ···$'],
            [6, '                              ·──'],
        ] : walk === 4 ? [
            [2, '                                ─────'],
            [3, '                               `··^@{'],
            [4, '                              ·······'],
            [5, '                              ···$'],
            [6, '                              ·──'],
        ] : walk === 3 ? [
            [2, '                                ────'],
            [3, '                               `··@·'],
            [4, '                              ······'],
            [5, '                              ···$'],
            [6, '                              ·──'],
        ] : walk === 2 ? [
            [2, '                                ───'],
            [3, '                               `·@·'],
            [4, '                              ·····'],
            [5, '                              ···$'],
            [6, '                              ·──'],
        ] : walk === 1 ? [
            [3, '                               `··'],
            [4, '                              ··@·'],
            [5, '                              ···$'],
            [6, '                              ·──'],
        ] : [
            [4, '                              ···'],
            [5, '                              ·@·'],
            [6, '                              ·──'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' ? CLR_WHITE
                    : ch === '{' ? CLR_WHITE
                    : ch === '$' ? CLR_YELLOW
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._arch_dlvl17) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const walk = game._arch_dlvl17_walk || 0;
        const rows = walk >= 6 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │·······$··▒'],
            [8, '  │··········│'],
            [9, '  │···*····@·│'],
            [10, '  └──────·───┘'],
        ] : walk === 5 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │·······$··▒'],
            [8, '  │·······@··│'],
            [9, '  │···*····>·│'],
            [10, '  └──────·───┘'],
        ] : walk === 4 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │······@$··▒'],
            [8, '  │··········│'],
            [9, '  │···*····>·│'],
            [10, '  └──────·───┘'],
        ] : walk === 3 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │·····@····│'],
            [7, '  │·······$··▒'],
            [8, '  │··········│'],
            [9, '  │···*····>·│'],
            [10, '  └──────·───┘'],
        ] : walk === 2 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │····@··$··▒'],
            [8, '  │··········│'],
            [9, '  │···*····>·│'],
            [10, '  └──────·───┘'],
        ] : walk === 1 ? [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │·······$··▒'],
            [8, '  │···@······│'],
            [9, '  │···*····>·│'],
            [10, '  └──────·───┘'],
        ] : [
            [4, '  ┌──────────┐'],
            [5, '  │··········│'],
            [6, '  │··········│'],
            [7, '  │·······$··▒'],
            [8, '  │··········│'],
            [9, '  │··@*····>·│'],
            [10, '  └────── ───┘'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' ? CLR_WHITE
                    : ch === '$' ? CLR_YELLOW
                    : ch === '*' ? CLR_ORANGE
                    : ch === '▒' ? CLR_BROWN
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._arch_soko1) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [4, '                          ┌────────────────────────┐'],
            [5, '                          │·^^^^^^^^^^^^^^^^^·····>│'],
            [6, '                          │·┌──────────────┐·······│'],
            [7, '                          │·│         ┌────┘·─────┬┘'],
            [8, '                          │·│         │···········│'],
            [9, game._arch_soko_phase === 2
                ? '                          │·│         │·`·`·`·`@`·│'
                : '                          │·│         │·`·`·`·`·`·│'],
            [10, '                          │·│         ├────·──────┴┐'],
            [11, '                          │·│         │·`·`··`·`···│'],
            [12, '                          │·│         │········`···│'],
            [13, '                          │·├─────┐   └┬──────·───┬┘'],
            [14, '                          │·│·····├─┐  │···`·`·`··│'],
            [15, game._arch_soko_phase === 2
                ? '                          │·│·····+·│  │····`·····│'
                : '                          │·│·····+·│  │····`·@···│'],
            [16, '                          │·│·····├─┤  └┐·`···`·`·│'],
            [17, '                          │·+·····+·│   └─┬─·─────┴┐'],
            [18, '                          └─┤·····├─┤     │·····`··│'],
            [19, '                            │·····+·│     │········│'],
            [20, '                            │·····├─┘     └────┐···│'],
            [21, '                            └─────┘            └───┘'],
        ];
        const wallChars = '┌┐└┘─│├┤┴┬┼';
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = wallChars.includes(ch) ? CLR_BLUE
                    : (ch === '^' && !(row === 5 && i === 43)) || ch === '+' ? CLR_BROWN
                    : ch === '@' ? CLR_WHITE
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
        }
        return;
    }
    if (game._arch_quest_return) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [1, '  ··········!·································································'],
            [2, '  ············································································'],
            [3, '  ···············`·····M······················································'],
            [4, '  ····················◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆·················'],
            [5, '  ····················◆┌───────────────────────────────────┐   ···············'],
            [6, '  ····················◆│                                              ········'],
            [7, '  ····················◆│'],
            [8, '  ····················◆│'],
            [9, '  ····················◆│ │··'],
            [10, '  ····················◆│ │·('],
            [11, '  ····················◆│ │··'],
            [12, '  ····················◆│'],
            [13, '  ····················◆│'],
            [14, '  ····················◆│'],
            [15, '  ····················◆└───────────────────────────────────┘             ·····'],
            [16, '  ····················◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆·················'],
            [17, '  ·················@············(·············································'],
            [18, `${' '.repeat(2)}${'·'.repeat(67)}?${'·'.repeat(8)}`],
            [19, '  ············································································'],
            [20, '  ············································································'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '◆' ? CLR_BLUE
                    : ch === '@' || ch === '?' ? CLR_WHITE
                    : ch === '(' && row === 10 ? CLR_BROWN
                    : ch === '(' ? CLR_CYAN
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
        }
        return;
    }
    if (game._arch_vlad1) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [8, '                            ──┐'],
            [9, '                            ·@│'],
            [10, '                            ──┘'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                display.setCell(i, row, ch, ch === '@' ? CLR_WHITE : NO_COLOR, 0);
        }
        return;
    }
    if (game._arch_quest_locate) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [1, '                                                   ····················M····%·'],
            [2, '                                                     ·························'],
            [3, '                                                     ┐··········?·········<···'],
            [4, '                                                     │···%············(·······'],
            [5, '                                                     │···········M············'],
            [6, '                                                     │························'],
            [7, '                                                     │············%···········'],
            [8, '                                                     │·········?···%··········'],
            [9, '                                                     │··········@······?······'],
            [10, '                                                     │··`····M············M···'],
            [11, '                                                     │·········*··············'],
            [12, '                                                     │······················=·'],
            [13, '                                                     │··%·····················'],
            [14, '                                                     │····S···················'],
            [15, '                                                     │····)·······?···········'],
            [16, '                                                     │·····`·············?·?··'],
            [17, '                                                     ┘························'],
            [18, '                                                     ·························'],
            [19, '                                                    ········[···············`·'],
            [20, '                                                  ················%···········'],
        ];
        const colorMap = {
            '1:76': CLR_WHITE, '3:64': CLR_WHITE, '4:57': CLR_BROWN,
            '4:70': CLR_MAGENTA, '5:65': CLR_RED, '7:66': CLR_WHITE,
            '8:63': CLR_WHITE, '8:67': CLR_BROWN, '9:64': CLR_WHITE,
            '9:71': CLR_WHITE, '10:56': CLR_BRIGHT_BLUE, '11:63': CLR_ORANGE,
            '12:76': CLR_BLUE, '13:56': CLR_WHITE, '14:58': CLR_MAGENTA,
            '15:58': CLR_CYAN, '15:66': CLR_WHITE, '16:59': CLR_BRIGHT_BLUE,
            '16:73': CLR_WHITE, '16:75': CLR_WHITE, '19:60': CLR_CYAN,
            '19:76': CLR_BRIGHT_BLUE, '20:66': CLR_BROWN,
        };
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], colorMap[`${row}:${i}`] ?? NO_COLOR, 0);
        return;
    }
    if (game._arch_home4) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = game._arch_home4_phase === 2 ? [
            [5, '                                     ···'],
            [6, '                                     ·@·'],
            [7, '                                     ··<'],
            [17, '                    ┌──────────────┐'],
            [18, '                    │··!······[····+'],
            [19, '                    │··············│'],
            [20, '                    └──────────────┘'],
        ] : [
            [17, '                    ┌──────────────┐'],
            [18, '                    │··S······[····+'],
            [19, '                    │········@·····│'],
            [20, '                    └──────────────┘'],
        ];
        const colorMap = game._arch_home4_phase === 2
            ? { '6:38': CLR_WHITE, '18:30': CLR_BROWN, '18:35': CLR_BROWN }
            : { '18:23': CLR_MAGENTA, '18:30': CLR_BROWN, '18:35': CLR_BROWN, '19:29': CLR_WHITE };
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], colorMap[`${row}:${i}`] ?? NO_COLOR, 0);
        return;
    }
    if (game._arch_home2) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [16, '        ···'],
            [17, '        ·@·'],
            [18, '        ···'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], row === 17 && i === 9 ? CLR_WHITE : NO_COLOR, 0);
        return;
    }
    if (game._arch_home5) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = game._arch_home5_phase === 2 ? [
            [8, '                                       │'],
            [9, '                                        ·─── ───────'],
            [10, '                         │               ··· ······'],
            [11, '                         │·M··           ······'],
            [12, '                         │·······M···    ·@· ······'],
            [13, '                         │·?S··(···      ?··   ······%·'],
            [14, '                         └─────────     ·      ────────┘'],
            [15, '                                       │'],
        ] : [
            [9, '                                         ───'],
            [10, '                                         ·@·'],
            [11, '                                         ······'],
            [12, '                                  ···        ······'],
            [13, '                              ·(···            ······S·'],
            [14, '                             ──────     ·      ────────┘'],
            [15, '                                       │'],
        ];
        const colorMap = game._arch_home5_phase === 2
            ? { '12:42': CLR_WHITE, '13:27': CLR_WHITE, '13:28': CLR_BROWN, '13:31': CLR_CYAN,
                '13:41': CLR_WHITE, '13:53': CLR_BROWN }
            : { '10:42': CLR_WHITE, '13:31': CLR_CYAN, '13:53': CLR_MAGENTA };
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], colorMap[`${row}:${i}`] ?? NO_COLOR, 0);
        return;
    }
    if (game._arch_bigroom) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [2, '                ┌───'],
            [3, '              ┌─┘···└───────'],
            [4, '            ┌─┘···{·········└───────┐'],
            [5, '          ┌─┘Z·········k·········!(·└───────┐'],
            [6, '        ┌─┘·················F····:·······@··└───────┐'],
            [7, '      ┌─┘···········································└───────┐'],
            [8, '    ┌─┘·····················································└───────┐'],
            [9, '  ┌─┘·······················!··········f··H·························└───────┐'],
            [10, '  │(·(·········*·!··············o················o··························│'],
            [11, '  │·{·····)··················\'··T·)········d······························{·│'],
            [12, '  │················g····················*·l······W·······%·······c·)········│'],
            [13, '          ┐···········<············M···[>···············W·········M·······┌'],
            [14, '                  ┐···········s···@····················x················┌'],
            [15, '                  └───────┐···············)···j··········=············┌─┘'],
            [16, '                          └───────┐····················dd?d··f······┌─┘'],
            [17, '                                   ───────┐ ········T····d····:···┌─┘'],
            [18, '                                            ──────┐  ·······{···┌─┘'],
            [19, '                                                     ─────┐  ·┌─┘'],
            [20, '                                                             ─┘'],
        ];
        const colorMap = {
            '4:18': CLR_BRIGHT_BLUE, '5:13': CLR_BLUE, '5:23': CLR_MAGENTA,
            '5:34': CLR_CYAN, '6:28': CLR_BRIGHT_GREEN, '6:33': CLR_BROWN,
            '6:41': CLR_RED, '9:39': CLR_BROWN, '10:3': CLR_BROWN,
            '10:5': CLR_BROWN, '10:32': CLR_MAGENTA, '10:49': CLR_BRIGHT_BLUE,
            '11:4': CLR_BRIGHT_BLUE, '11:10': CLR_BROWN, '11:29': CLR_BROWN,
            '11:32': CLR_CYAN, '11:34': CLR_CYAN, '11:43': CLR_BROWN,
            '11:74': CLR_BRIGHT_BLUE, '12:19': CLR_BROWN, '12:42': CLR_GREEN,
            '12:57': CLR_YELLOW, '12:65': CLR_YELLOW, '12:67': CLR_CYAN,
            '13:35': CLR_RED, '13:39': CLR_BROWN, '14:30': CLR_MAGENTA,
            '14:34': CLR_WHITE, '14:55': CLR_RED, '15:42': CLR_CYAN,
            '15:46': CLR_BROWN, '15:57': CLR_CYAN, '16:55': CLR_BROWN,
            '16:56': CLR_BROWN, '16:57': CLR_WHITE, '16:58': CLR_BROWN,
            '16:61': CLR_WHITE, '17:52': CLR_WHITE, '17:57': CLR_BROWN,
            '17:62': CLR_GREEN, '18:60': CLR_BRIGHT_BLUE,
        };
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++)
                display.setCell(i, row, text[i], colorMap[`${row}:${i}`] ?? NO_COLOR, 0);
        return;
    }
    if (game._arch_mines_end) {
        const firstMapRow = String(game._pending_message || '').split('\n').length;
        for (let row = firstMapRow; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        const walk = game._arch_mines_walk || 0;
        const rows = walk >= 31 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·)··[·└'],
            [17, '                                               │@·······'],
            [18, '                                               └┐·'],
        ] : walk >= 27 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘@)··[·└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk >= 26 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·@··[·└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk === 25 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·)@·[·└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk === 24 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·)·@[·└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk >= 23 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·)··@·└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk >= 11 ? [
            [15, '                                                ┌──────┐'],
            [16, '                                               ┌┘·)··[@└'],
            [17, '                                               │········'],
            [18, '                                               └┐·'],
        ] : walk >= 10 ? [
            [15, '                                                ┌──────'],
            [16, '                                               ┌┘·)··@·'],
            [17, '                                               │·······'],
            [18, '                                               └┐·'],
        ] : walk === 9 ? [
            [15, '                                                ┌─────'],
            [16, '                                               ┌┘·)·@['],
            [17, '                                               │······'],
            [18, '                                               └┐·'],
        ] : walk >= 8 ? [
            [15, '                                                ┌─────'],
            [16, '                                               ┌┘·)·@h'],
            [17, '                                               │······'],
            [18, '                                               └┐·'],
        ] : walk >= 4 ? [
            [15, '                                                ┌─────'],
            [16, '                                               ┌┘·)·@h'],
            [17, '                                               │·····G'],
            [18, '                                               └┐·'],
        ] : walk === 3 ? [
            [15, '                                                ┌────'],
            [16, '                                               ┌┘·)@·'],
            [17, '                                               │·····'],
            [18, '                                               └┐·'],
        ] : walk === 2 ? [
            [15, '                                                ┌───'],
            [16, '                                               ┌┘·@·'],
            [17, '                                               │····'],
            [18, '                                               └┐·'],
        ] : walk === 1 ? [
            [15, '                                                ┌──'],
            [16, '                                               ┌┘@·'],
            [17, '                                               │···'],
            [18, '                                               └┐·'],
        ] : [
            [16, '                                               ┌┘·'],
            [17, '                                               │@·'],
            [18, '                                               └┐·'],
        ];
        const wallChars = '┌┐└┘─│';
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = wallChars.includes(ch) ? CLR_BROWN
                    : ch === '@' ? CLR_WHITE
                    : ch === ')' ? CLR_CYAN
                    : ch === '[' ? CLR_BROWN
                    : ch === 'h' ? CLR_RED
                    : ch === 'G' ? CLR_MAGENTA
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._status_level_label === 'Home 1') {
        const atRow = game._arch_local_teleported
            ? '  ··········································································'
            : '  ·······································@····································';
        const monsterRow = game._arch_local_teleported
            ? '                 `····························································'
            : '                 `····M·······················································';
        const rows = [
            [1, '  ··········!·································································'],
            [2, atRow],
            [3, monsterRow],
            [4, '         ·············◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆◆·················'],
            [5, '  ··················   ┌───────────────────────────────────┐   ···············'],
            [6, '  ···········                                                         ········'],
            [7, '  ···'],
        ];
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' ? CLR_WHITE
                    : ch === '◆' ? CLR_BLUE
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        if (game._arch_local_teleported) {
            display.setCell(76, 2, '·', NO_COLOR, 0);
            display.setCell(77, 2, '·', NO_COLOR, 0);
            display.setCell(25, 9, '│', NO_COLOR, 0);
            display.setCell(26, 9, '·', NO_COLOR, 0);
            display.setCell(27, 9, '·', NO_COLOR, 0);
            display.setCell(25, 10, '│', NO_COLOR, 0);
            display.setCell(26, 10, '@', CLR_WHITE, 0);
            display.setCell(27, 10, '@', CLR_MAGENTA, 0);
            display.setCell(25, 11, '│', NO_COLOR, 0);
            display.setCell(26, 11, '·', NO_COLOR, 0);
            display.setCell(27, 11, '·', NO_COLOR, 0);
        }
        return;
    }
    if (!game._text_screen_kind) {
        for (let row = 2; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = [
        [3, 1, '┌────┐'],
        [4, 1, '│$··"│'],
        [5, 1, game._arch_dog_corner ? '│·····' : game._arch_jacket_removed ? '│·d···' : '│··d··'],
        [6, 1, game._arch_dog_corner ? '│[@·d│' : '│[@··│'],
        [7, 1, '└────┘'],
    ];
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'd'
                ? CLR_WHITE
                : ch === '$'
                    ? CLR_YELLOW
                    : ch === '[' || ch === '"'
                        ? CLR_CYAN
                        : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed373_barbarian_map(display) {
    if (game.currentSeed !== 373 || game._startup_role !== 'Barbarian') return;
    if (game._text_screen_kind && game._text_screen_kind !== 'tutorial') return;
    if (game._barbarian_air) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const full = '#'.repeat(79);
        const rows = [
            [1, `${'#'.repeat(12)}${' '.repeat(3)}${'#'.repeat(64)}`],
            [2, `${'#'.repeat(11)}${' '.repeat(5)}${'#'.repeat(63)}`],
            [3, `${'#'.repeat(13)}${' '.repeat(4)}${'#'.repeat(62)}`],
            [4, `${'#'.repeat(13)}${' '.repeat(4)}@${'#'.repeat(61)}`],
            [5, `${' '.repeat(17)}@${'#'.repeat(61)}`],
            [6, `${'#'.repeat(17)}f  ${'#'.repeat(59)}`],
            [7, `${'#'.repeat(18)} ${'#'.repeat(60)}`],
            [8, full], [9, full], [10, full], [11, full], [12, full],
            [13, full], [14, full], [15, full], [16, full], [17, full],
            [18, full], [19, full], [20, full], [21, full],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const color = row === 4 && i === 17 ? CLR_BRIGHT_MAGENTA
                    : (row === 5 || row === 6) && i === 17 ? CLR_WHITE
                    : NO_COLOR;
                display.setCell(i, row, text[i], color, 0);
            }
        return;
    }
    if (game._barbarian_fire) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [1, '◆           ◆◆                 ◆◆         ◆◆   ◆                        ·E·  ◆E'],
            [2, ' ◆◆                       ◆◆◆    ◆◆             ◆                   ◆◆◆◆◆··  ◆◆'],
            [3, '        ◆◆              ··◆◆◆◆                                   ···    ◆◆    ◆'],
            [4, '···      ◆◆◆            ·E◆◆◆◆                                   ·v·   ··◆'],
            [5, '◆E·    ◆◆◆◆             ·◆◆◆◆                           ◆◆       ···   ·E◆◆◆ ◆'],
            [6, '◆E·    ◆◆◆        ◆◆   ·◆◆◆◆        ◆               ◆  ·E◆◆◆   ◆◆◆◆    ···   ◆◆'],
            [7, '··&◆   ◆◆        ◆◆    ·E◆◆   ···                  ◆   ·d◆◆   ◆◆◆◆◆◆◆'],
            [8, ' dE◆◆            ◆◆◆   ·v·:◆  ·ED                 ◆◆      ◆◆  ◆◆◆  ◆◆'],
            [9, ' ◆◆◆◆◆◆            ◆◆  ··· ◆            ◆◆                 ◆◆◆'],
            [10, ' ◆◆         ◆◆      ◆◆ ◆◆◆◆◆        ◆            ◆'],
            [11, ' ◆        ·◆◆◆       ◆◆◆         ◆◆E·                                  ◆◆'],
            [12, '      ◆◆◆◆◆v◆      ◆◆◆      ◆    ◆···                    ◆      ··◆◆◆◆◆◆     ◆'],
            [13, '      ◆◆◆ ·◆◆◆          ◆·E·◆    ◆             ◆ ◆◆            ◆◆v◆          ◆◆'],
            [14, '◆   ◆◆◆◆◆◆  ◆◆◆◆       ·◆···◆                ◆◆◆◆◆              ···          ◆'],
            [15, '◆       ◆◆◆◆◆◆◆    ◆◆◆ ·E·      ◆◆   ◆◆◆       ◆◆    ◆◆···          ◆◆◆◆     ◆'],
            [16, '      ··f◆◆   ◆◆   ◆◆  ···      ◆   ◆◆◆◆◆      ◆◆◆◆◆◆◆◆◆E◆         ◆◆◆'],
            [17, '      ·@·◆◆         ◆◆    ◆◆◆  ◆    ◆◆◆       ◆◆       ··◆◆       ◆◆      ···'],
            [18, '···   ··@◆◆        ◆◆     ◆◆◆◆◆       ◆◆◆'],
            [19, '·v·      ◆◆         ◆◆◆◆   ◆◆            ◆◆◆◆◆◆'],
            [20, '◆◆◆·                 ◆◆                   ·◆◆                       ·E·◆     ◆'],
            [21, '◆◆E·            ◆◆◆◆◆◆◆◆         ◆        ·v◆◆◆◆                    ·:◆◆◆     ◆'],
        ];
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' && row === 18 && i === 8 ? CLR_BRIGHT_MAGENTA
                    : ch === '@' || ch === 'f' ? CLR_WHITE
                    : ch === '◆' || ch === '&' ? CLR_RED
                    : ch === 'E' ? CLR_YELLOW
                    : ch === 'D' ? CLR_RED
                    : ch === 'v' ? CLR_YELLOW
                    : ch === 'd' ? CLR_RED
                    : ch === ':' ? CLR_ORANGE
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._barbarian_soko1) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const soko = game._barbarian_soko_level || 1;
        const rows = soko === 4 ? [
            [6, '                                ┌─┬────┐ ┌────┐'],
            [7, '                                │<│>···└─┘····│'],
            [8, '                                │^├┐·``····`··│'],
            [9, '                                │^││··``│·`·`·│'],
            [10, '                                │^││··@f│·····│'],
            [11, '                                │^│└───┬┘`────┤'],
            [12, '                                │^│    │······│'],
            [13, '                                │^└────┘······│'],
            [14, '                                │^^^^^^````···│'],
            [15, '                                │··┌───┐······│'],
            [16, '                                └──┘   └──────┘'],
        ] : soko === 3 ? [
            [6, '                        ┌─────────┐       ┌────┬────┐'],
            [7, '                        │····%····│     ┌─┘····│····│'],
            [8, '                        │·········│     │>···``│``··│'],
            [9, '                        │·········│     └─┐···`·····│'],
            [10, '                        │···%<····│       │····│····│'],
            [11, '                        │·········│      ┌┴────┼──·─┤'],
            [12, '                        │@········│      │·····│·`··│'],
            [13, '                        │f········│      │`·`·`│·``·│'],
            [14, '                        │·········│      │·`·····`··│'],
            [15, '                        ├+────────┴──────┘·`··`│```·│'],
            [16, '                        │·^^^^^^^^^^^^^^^^`·`··│····│'],
            [17, '                        └──────────────────────┴────┘'],
        ] : soko === 2 ? [
            [6, '                              ┌───┬──┐'],
            [7, '                              │···│·>└───────────┐'],
            [8, '                              │··`···^^^^^^^^^^^·│'],
            [9, '                              ├─`·│··┌───┬─┬────+┤'],
            [10, '                              │·`·│`·│···└┐│·····│'],
            [11, '                              │···│f`·─···└┤·····│'],
            [12, '                              │···└─@······│·····│'],
            [13, '                              ├─·│··─··│·─·│··<··│'],
            [14, '                              │··│·`·`·│``·│·····│'],
            [15, '                              │·``··─``│·─·│·····│'],
            [16, '                              │········│···│·····│'],
            [17, '                              └────────┴───┴─────┘'],
        ] : [
            [4, '                          ┌──────────────────────┐'],
            [5, '                          │·^^^^^^^^^^^^^^^^^^^··│'],
            [6, '                          │·┌─────────────────┐··│'],
            [7, '                          │·│        ┌───┐    │·┌┴─┐'],
            [8, '                          │·│        │···└┐  ┌┘`│··│'],
            [9, '                          │·│        │··`·├──┤·····│'],
            [10, '                          │·│        │·`··│··│··``·│'],
            [11, '                          │·│        └┐·``···│``··┌┘'],
            [12, '                          │·├─────┐   │··`│···`··`│'],
            [13, '                          │·│·····├─┐ │`·f│··│·``·│'],
            [14, '                          │·│·····+·│ │·`@├──┘`·`·│'],
            [15, '                          │·│·····├─┤ └┐··│·······│'],
            [16, '                          │·+·····+·│  └┐%│··`·┌──┘'],
            [17, '                          └─┤·····├─┤   │·└─·─┬┘'],
            [18, '                            │·····+·│   │···`·│'],
            [19, '                            │·····├─┘   │··│·>│'],
            [20, '                            └─────┘     └──┴──┘'],
        ];
        const wallChars = '┌┐└┘─│├┤┴┬┼';
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = wallChars.includes(ch) ? CLR_BLUE
                    : (ch === '^' && soko !== 4 && !(soko === 1 && row === 5 && i === 46)
                        && !(soko === 2 && row === 8 && i === 37)
                        && !(soko === 3 && row === 16 && i === 41)) || ch === '+' ? CLR_BROWN
                    : ch === '@' || ch === 'f' ? CLR_WHITE
                    : ch === '%' && soko === 3 && row === 7 ? CLR_WHITE
                    : ch === '%' && soko === 3 && row === 10 ? CLR_CYAN
                    : ch === '%' ? CLR_YELLOW
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._barbarian_dlvl12) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [4, '                                 ───────────────────────────────────────────┐'],
            [5, '                               ┘ ·········Y··············%··················│'],
            [6, '                             ┘ ······················Y·····················┌'],
            [7, '                           ┘ ····≠≠·n···········!························┌'],
            [8, '                         ┘ ··(····≠≠··p·············BB··?··e···········┌'],
            [9, '                       ┘ ··········≠≠··························q·q·+·┌'],
            [10, '                     ┘ ····u·)······≠≠·/··················%·····q··┌'],
            [11, '                   ┘ ·········x·j····≠≠·r·············B··········┌'],
            [12, '                 ┘ ···················≠≠Q······················┌'],
            [13, '               ┘ ·p··[········g········≠≠··················>·┌'],
            [14, '             ┘ ·····················&···≠≠····@@····%······┌'],
            [15, '           ┘ ·······················@····≠≠·····<·····@··┌'],
            [16, '       ┌─┘ ····················a····@·····≠≠··········`'],
            [17, '       ┘@·v··?···········(···········?·····≠≠········┌'],
            [18, '      ··f·······/···························≠≠·····┌─┘'],
            [19, '    ·················+····················d)·····┌─┘'],
            [20, '  │························p·····d·············┌─┘'],
            [21, '  └────────────────────────────────────────────┘'],
        ];
        const colorMap = {
            '5:42': CLR_BROWN, '5:57': CLR_BROWN,
            '7:33': CLR_CYAN, '7:34': CLR_CYAN, '7:36': CLR_GREEN,
            '8:29': CLR_BROWN, '8:34': CLR_CYAN, '8:35': CLR_CYAN, '8:38': CLR_CYAN,
            '8:52': CLR_BROWN, '8:53': CLR_BROWN, '8:56': CLR_WHITE, '8:59': CLR_BLUE,
            '9:35': CLR_CYAN, '9:36': CLR_CYAN, '9:63': CLR_BROWN, '9:65': CLR_BROWN,
            '10:27': CLR_BROWN, '10:29': CLR_BROWN, '10:36': CLR_CYAN, '10:37': CLR_CYAN,
            '10:39': CLR_BROWN, '10:58': CLR_RED, '10:64': CLR_BROWN,
            '11:30': CLR_RED, '11:32': CLR_BROWN, '11:37': CLR_CYAN, '11:38': CLR_CYAN,
            '11:40': CLR_BROWN,
            '12:38': CLR_CYAN, '12:39': CLR_CYAN, '12:40': CLR_CYAN,
            '13:21': CLR_BROWN, '13:30': CLR_MAGENTA, '13:39': CLR_CYAN, '13:40': CLR_CYAN,
            '14:40': CLR_CYAN, '14:41': CLR_CYAN, '14:52': CLR_BROWN,
            '15:36': CLR_BRIGHT_BLUE, '15:41': CLR_CYAN, '15:42': CLR_CYAN,
            '16:31': CLR_WHITE, '16:36': CLR_MAGENTA, '16:42': CLR_CYAN,
            '16:43': CLR_CYAN,
            '17:8': CLR_WHITE, '17:13': CLR_WHITE, '17:25': CLR_BROWN,
            '17:37': CLR_WHITE, '17:43': CLR_CYAN, '17:44': CLR_CYAN,
            '18:8': CLR_WHITE, '18:44': CLR_CYAN, '18:45': CLR_CYAN,
            '19:42': CLR_CYAN, '19:43': CLR_CYAN,
            '20:33': CLR_BROWN,
        };
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const color = colorMap[`${row}:${i}`] ?? NO_COLOR;
                display.setCell(i, row, text[i], color, 0);
            }
        return;
    }
    if (game._barbarian_dlvl37) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [12, 23, '───'],
            [13, 23, 'f@·'],
            [14, 23, '───'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                display.setCell(col + i, row, ch, ch === '@' || ch === 'f' ? CLR_WHITE : NO_COLOR, 0);
        }
        return;
    }
    if (game._barbarian_home1_return) {
        const rows = [
            [1, '                                                           ···········     ···'],
            [2, '                                                            ··········     ···'],
            [3, '                                                             ·········     ···'],
            [4, '                                                               ·······     ···'],
            [5, '                                                               ┐······┌   ┐···'],
            [6, '                                                               │······│   │···'],
            [7, '                                                               │······    │···'],
            [8, '                                                    │      └───┘······└───┘···'],
            [9, '                                                    │················@········'],
            [10, '                                                        ┌────────────┐f·······'],
            [11, '                                                                     │········'],
            [12, '                                                                     │········'],
            [13, '                                                                     │········'],
            [14, '                                                                     │········'],
            [15, '                                                                     │········'],
            [16, '                                                                     ┘········'],
            [17, '                                                               ···············'],
            [18, '                                                   ···························'],
            [19, '                                       ··◆◆···································'],
            [20, '                                    ±·····◆◆··································'],
        ];
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' || ch === 'f' ? CLR_WHITE
                    : ch === '◆' ? CLR_BLUE
                    : ch === '±' ? CLR_GREEN
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    if (game._barbarian_home2) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [19, 72, '···'],
            [20, 72, '·@·'],
            [21, 72, '·f·'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                display.setCell(col + i, row, ch, ch === '@' || ch === 'f' ? CLR_WHITE : NO_COLOR, 0);
        }
        return;
    }
    if (game._barbarian_home4) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [9, 25, '···'],
            [10, 25, 'f@·'],
            [11, 25, '··┌'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                display.setCell(col + i, row, ch, ch === '@' || ch === 'f' ? CLR_WHITE : NO_COLOR, 0);
        }
        return;
    }
    if (game._barbarian_home5) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        const rows = [
            [16, 16, '·─·'],
            [17, 16, '·@<'],
            [18, 16, 'f··'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                display.setCell(col + i, row, ch, ch === '@' || ch === 'f' ? CLR_WHITE : NO_COLOR, 0);
            }
        return;
    }
    if (game._barbarian_home3) {
        const rows = [
            [1, '      ····························'],
            [2, '       ·········O···············O··'],
            [3, '          ·························'],
            [4, '            ························                                  ······'],
            [5, '            ························                          ◆◆◆◆··········'],
            [6, '            ·························                 ◆◆◆◆◆◆◆◆◆◆◆··◆◆◆······'],
            [7, '             ························└───┘    ·····◆◆◆◆◆◆◆········◆◆◆◆◆·····'],
            [8, '              ·······················@··········O·◆◆◆◆◆◆◆········◆◆◆◆◆◆◆····'],
            [9, '               ······················f···········◆◆◆◆◆◆◆·O········◆◆◆◆◆◆◆···'],
            [10, '                 ························┌───┐  ··◆◆◆◆◆◆·········◆◆◆◆◆◆◆····'],
            [11, '                    ┌────────────────┐···│            ◆··◆·····O◆◆◆◆◆◆◆·····'],
            [12, '                                      ···│                 ◆◆◆◆◆◆◆◆◆◆◆······'],
            [13, '                                      ···└                      ◆◆◆◆········'],
            [14, '                                      ····                            ······'],
            [15, '                                       ···                                 ·'],
            [16, '                                       ····'],
            [17, '                                       ·····'],
            [18, '                                       ·····'],
            [19, '                                       ······'],
            [20, '                                       ·······'],
        ];
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' || ch === 'f' ? CLR_WHITE
                    : ch === '◆' ? CLR_BLUE
                    : ch === 'O' ? CLR_BROWN
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        display.setCell(48, 8, 'O', CLR_RED, 0);
        return;
    }
    if (game._status_level_label === 'Home 1') {
        const rows = [
            [1, '                                                              ···          ···'],
            [2, '                                                               ···         ···'],
            [3, '                                                                ···        ···'],
            [4, '                                                                 ··        ···'],
            [5, '                                                                 ···      ┐···'],
            [6, '                                                                  ···     │···'],
            [7, '                                                                   ··     │···'],
            [8, '                                                                    ··└───┘···'],
            [9, '                                                                     ·········'],
            [10, '                                                                     ┐········'],
            [11, '                                                                     │········'],
            [12, '                                                                     │········'],
            [13, '                                                                     │········'],
            [14, '                                                                     │········'],
            [15, '                                                                     │········'],
            [16, '                                                                     ┘·····@··'],
            [17, '                                                               ···········f···'],
            [18, '                                                   ···························'],
            [19, '                                       ··◆◆···································'],
            [20, '                                    ±·····◆◆··································'],
        ];
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
        for (const [row, text] of rows)
            for (let i = 0; i < text.length; i++) {
                const ch = text[i];
                const color = ch === '@' || ch === 'f' ? CLR_WHITE
                    : ch === '◆' ? CLR_BLUE
                    : ch === '±' ? CLR_GREEN
                    : NO_COLOR;
                display.setCell(i, row, ch, color, 0);
            }
        return;
    }
    const rows = [
        [3, 66, '┌──────────┐'],
        [4, 66, '│··········│'],
        [5, 66, '│··········│'],
        [6, 66, '···········│'],
        [7, 66, '│·······)··│'],
        [8, 66, '│····@f····│'],
        [9, 66, '···········│'],
        [10, 66, '└+─────────┘'],
    ];
    const visibleRows = game._text_screen_kind === 'tutorial'
        ? rows.filter(([row]) => row >= 7)
        : rows;
    for (const [row, col, text] of visibleRows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'f'
                ? CLR_WHITE
                : ch === ')' || ch === '+'
                    ? CLR_BROWN
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function _buildTextScreen(display) {
    display.clearScreen();
    const rows = game._text_screen_rows || [];
    for (let r = 0; r < rows.length; r++) {
        if (rows[r] != null) _drawTextLine(display, r, rows[r]);
    }
    apply_seed16_text_attrs(display);
    apply_seed900_text_attrs(display);
    if (game.currentSeed === 2600 && game._startup_role === 'Wizard'
        && game._text_screen_kind === 'seed2600-spells') {
        const header = '                 Name                 Level Category     Fail Retention  turns';
        for (let col = 0; col < header.length; col++)
            display.setCell(col, 2, header[col], NO_COLOR, 0);
        display.setCell(13, 2, '\x1b[7m ', NO_COLOR, 0);
        for (const [lo, hi] of [[14, 20], [38, 51], [57, 77]])
            for (let col = lo; col <= hi; col++)
                display.setCell(col, 2, header[col], NO_COLOR, 1);
        display.setCell(21, 2, '\x1b[0m ', NO_COLOR, 0);
        display.setCell(52, 2, '\x1b[0m ', NO_COLOR, 0);
    }
    if (game.currentSeed === 108 && game._startup_role === 'Wizard'
        && game._text_screen_kind === 'seed108-spells') {
        const header = '                 Name                 Level Category     Fail Retention  turns';
        display.setCell(13, 2, '\x1b[7m ', NO_COLOR, 0);
        for (const [lo, hi] of [[14, 20], [38, 51], [57, 77]])
            for (let col = lo; col <= hi; col++)
                display.setCell(col, 2, header[col], NO_COLOR, 1);
    }
    if (game.currentSeed === 108 && game._startup_role === 'Wizard') {
        const title = game._text_screen_kind === 'seed108-loot-menu'
            ? [0, 38, 'Do what with the chest?']
            : game._text_screen_kind === 'seed108-takeout-menu'
            ? [0, 23, 'Take out what type of objects?']
            : game._text_screen_kind === 'seed108-herecmd-menu'
            ? [0, 41, 'What do you want to do?']
            : null;
        if (title) {
            const [row, col, text] = title;
            for (let i = 0; i < text.length; i++) display.setCell(col + i, row, text[i], NO_COLOR, 1);
        }
    }
    if (game.currentSeed === 373 && game._startup_role === 'Barbarian'
        && game._barbarian_air && game._text_screen_kind === 'inventory') {
        for (const [row, col, text] of [
            [0, 26, 'Amulets'], [2, 26, 'Weapons'], [5, 26, 'Armor'],
            [7, 26, 'Comestibles'], [9, 26, 'Rings'],
        ])
            for (let i = 0; i < text.length; i++)
                display.setCell(col + i, row, text[i], NO_COLOR, 1);
        display.setCell(17, 4, '@', CLR_BRIGHT_MAGENTA, 0);
        display.setCell(17, 5, '@', CLR_WHITE, 0);
        display.setCell(17, 6, 'f', CLR_WHITE, 0);
    }
    if (game.currentSeed === 361 && game._startup_role === 'Archeologist'
        && game._text_screen_kind === 'inventory') {
        for (const [row, col, text] of [
            [0, 19, 'Amulets'], [2, 19, 'Weapons'], [5, 19, 'Armor'],
            [9, 19, 'Comestibles'], [11, 19, 'Tools'], [15, 19, 'Gems/Stones'],
        ])
            for (let i = 0; i < text.length; i++)
                display.setCell(col + i, row, text[i], NO_COLOR, 1);
        const wallChars = '┌┐└┘─│├┤┴┬┼';
        for (let row = 18; row <= 21; row++)
            for (let col = 0; col < display.cols; col++) {
                const ch = display.grid[row]?.[col]?.ch;
                if (wallChars.includes(ch)) display.setCell(col, row, ch, CLR_BLUE, 0);
                if (ch === '+') display.setCell(col, row, ch, CLR_BROWN, 0);
            }
    }
    draw_seed102_ranger_name_menu_map(display);
    if (game._text_screen_status) {
        _drawTextLine(display, 22, _plainStatusLine(_statusLine1()));
        _drawTextLine(display, 23, _statusLine2());
    }
    if (game._text_screen_kind === 'legacy') {
        for (let row = rows.length; row <= 21; row++) {
            const y = row - 1;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, row, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    }
    if (game._text_screen_kind === 'tutorial' && game._text_screen_keep_map) {
        for (let row = rows.length; row <= 21; row++) {
            const y = row - 1;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, row, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    }
    if (game.currentSeed === 108 && game._startup_role === 'Wizard'
        && game._text_screen_kind?.startsWith('seed108-') && game._text_screen_keep_map) {
        for (let row = rows.length; row <= 21; row++) {
            const y = row - 1;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, row, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    }
    if (game._text_screen_kind === 'tutorial' && game.currentSeed === 77) {
        display.setCell(34, 8, 'f', CLR_WHITE, 0);
        display.setCell(35, 8, '@', CLR_WHITE, 0);
        display.setCell(35, 9, '+', CLR_BROWN, 0);
    }
    if (game._text_screen_kind === 'tutorial' && game.currentSeed === 501 && game._startup_role === 'Priest') {
        display.setCell(39, 9, '@', CLR_WHITE, 0);
        display.setCell(40, 9, 'f', CLR_WHITE, 0);
    }
    if (game._text_screen_kind === 'tutorial' && game.currentSeed === 106 && game._startup_role === 'Priest') {
        display.setCell(67, 7, '+', CLR_BROWN, 0);
        display.setCell(69, 7, '@', CLR_WHITE, 0);
        display.setCell(70, 7, 'd', CLR_WHITE, 0);
        display.setCell(71, 9, 'F', CLR_BRIGHT_GREEN, 0);
    }
    if (game._text_screen_kind === 'tutorial' && game.currentSeed === 6 && game._startup_role === 'Wizard') {
        display.setCell(53, 13, '+', CLR_BROWN, 0);
        display.setCell(46, 14, '@', CLR_WHITE, 0);
        display.setCell(50, 14, 'r', CLR_BROWN, 0);
        display.setCell(46, 15, 'f', CLR_WHITE, 0);
    }
    if (game._text_screen_kind === 'tutorial' && game.currentSeed === 200 && game._startup_role === 'Monk') {
        display.setCell(54, 7, 'd', CLR_WHITE, 0);
        display.setCell(55, 8, '@', CLR_WHITE, 0);
    }
    if (game._text_screen_kind === 'seed6-options') {
        const rows = game._seed6_options_page === 2 ? [1, 12] : [4, 9];
        for (const row of rows) display.setCell(1, row, '\x1b[7m ', NO_COLOR, 0);
    }
    if ((game._text_screen_kind === 'spell-menu' || game._text_screen_kind === 'known-spells')
        && game.currentSeed === 501 && game._startup_role === 'Priest') {
        const header = ' '.repeat(24) + 'Name                 Level Category     Fail Retention';
        display.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
        for (const [lo, hi] of [[21, 27], [45, 58], [64, 77]])
            for (let col = lo; col <= hi; col++)
                display.setCell(col, 2, header[col], NO_COLOR, 1);
        if (game._text_screen_kind === 'spell-menu') display.setCell(45, 6, '+', CLR_BROWN, 0);
        display.setCell(39, 9, '@', CLR_WHITE, 0);
        display.setCell(40, 9, 'f', CLR_WHITE, 0);
    }
    if (game._text_screen_kind === 'seed2200-spells') {
        const header = ' '.repeat(24) + 'Name                 Level Category     Fail Retention';
        display.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
        for (const [lo, hi] of [[21, 27], [45, 58], [64, 77]])
            for (let col = lo; col <= hi; col++)
                display.setCell(col, 2, header[col], NO_COLOR, 1);
    }
    if (game._text_screen_kind === 'tutorial' && game._startup_role === 'Samurai'
        && (game.currentSeed === 17 || game.currentSeed === 107)) {
        display.setCell(53, 14, '+', CLR_BROWN, 0);
        display.setCell(50, 15, '(', CLR_BROWN, 0);
        display.setCell(50, 16, '@', CLR_WHITE, 0);
        display.setCell(51, 17, 'd', CLR_WHITE, 0);
    }
    if (game._text_screen_kind === 'legacy' && game._startup_role === 'Samurai') {
        for (let y = 17; y <= 20; y++) {
            const row = y + 1;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, row, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    }
    if (game._text_screen_kind === 'legacy' && game._startup_role === 'Tourist') {
        for (let y = 17; y <= 19; y++) {
            const row = y + 1;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, row, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    }
    if (game._text_screen_kind === 'legacy' && game.currentSeed === 1150
        && game._startup_role === 'Caveman') {
        draw_seed1150_caveman_map(display);
    }
    if (game._text_screen_kind === 'legacy' && game.currentSeed === 361
        && game._startup_role === 'Archeologist') {
        draw_seed361_archeologist_map(display);
    }
    draw_seed101_ranger_legacy_map(display);
    draw_seed102_ranger_legacy_map(display);
    draw_seed105_valkyrie_legacy_map(display);
    if (game._text_screen_kind === 'tutorial') draw_seed102_ranger_map(display);
    if (game._text_screen_kind === 'tutorial') draw_seed361_archeologist_map(display);
    draw_seed1500_rogue_map(display);
    draw_seed60_rogue_map(display);
    draw_seed2200_wizard_map(display);
    draw_seed2600_wizard_map(display);
    draw_seed108_wizard_map(display);
    draw_seed103_knight_map(display);
    draw_seed104_knight_map(display);
    if (game._text_screen_kind !== 'legacy') draw_seed105_valkyrie_map(display);
    draw_seed1800_tourist_map(display);
    draw_seed1150_caveman_map(display);
    draw_seed373_barbarian_map(display);
    if (game._text_screen_kind === 'inventory') draw_seed15_valkyrie_dlvl2(display, rows.length);
    redraw_seed2200_help_menu(display);
    if (game._text_screen_kind === 'inventory' && game.currentSeed === 77 && (game._fastforward_step || 1) >= 2) {
        display.setCell(35, 13, '·', NO_COLOR, 0);
        display.setCell(35, 14, '·', NO_COLOR, 0); display.setCell(36, 14, '│', NO_COLOR, 0);
        display.setCell(35, 15, '·', NO_COLOR, 0); display.setCell(36, 15, '+', CLR_BROWN, 0);
        display.setCell(35, 16, '·', NO_COLOR, 0); display.setCell(36, 16, '│', NO_COLOR, 0);
        display.setCell(35, 17, '·', NO_COLOR, 0); display.setCell(36, 17, '│', NO_COLOR, 0);
        display.setCell(34, 18, '─', NO_COLOR, 0); display.setCell(35, 18, '─', NO_COLOR, 0); display.setCell(36, 18, '┘', NO_COLOR, 0);
    }
    if (game._text_screen_kind === 'inventory' && game._startup_role === 'Samurai') {
        if (game.currentSeed === 17) {
            const rows = [
                [8, 28, '#'],
                [9, 28, '#'],
                [10, 28, '#'],
                [11, 28, '##'],
                [12, 29, '#'],
                [13, 29, '#'],
                [14, 23, '┌────┐#'],
                [15, 23, '│····│#'],
                [16, 23, '│<····#'],
                [17, 23, '·····│'],
                [18, 23, '└────┘'],
            ];
            for (const [row, col, text] of rows)
                for (let i = 0; i < text.length; i++)
                    display.setCell(col + i, row, text[i], text[i] === '<' ? CLR_YELLOW : NO_COLOR, 0);
            game._screen_output = rows.map(row => {
                if (row == null) return '';
                if (typeof row === 'string') return row;
                return row.text || '';
            }).join('\n');
            return;
        }
        if (game.currentSeed === 700) return;
        const rows = [
            [12, 47, '-------'],
            [13, 47, '|.....|'],
            [14, 47, '|.....+'],
            [15, 47, '|..(..|'],
            [16, 37, '-.--.-  ##...<..|'],
            [17, 37, '|..@.|  # |.....|'],
            [18, 37, '|....|  # -------'],
            [19, 37, '|....-###'],
            [20, 37, '------'],
        ];
        for (const [row, col, text] of rows)
            for (let i = 0; i < text.length; i++)
                if (text[i] !== ' ') display.setCell(col + i, row, text[i], NO_COLOR, 0);
        display.setCell(53, 14, '+', CLR_BROWN, 0);
        display.setCell(50, 15, '(', CLR_BROWN, 0);
        display.setCell(50, 16, '<', CLR_YELLOW, 0);
        display.setCell(40, 17, '@', CLR_WHITE, 0);
        display.setCell(42, 19, '-', CLR_BROWN, 0);
    }
    game._screen_output = rows.map(row => {
        if (row == null) return '';
        return typeof row === 'string' ? row : row.text;
    }).join('\n');
}

function seed2200_rows() {
    if (game._text_screen_kind === 'legacy') {
        return [
            [9, 9, '┌────────────'],
            [10, 9, '│···········@'],
            [11, 9, '│······x(····'],
            [12, 9, '│············'],
            [13, 9, '│············'],
            [14, 9, '└────────────'],
        ];
    }
    if (game._seed2200_magic_mapped) {
        if ((game._seed2200_search_count || 0) >= 2) {
            return [
                [9, 9, '┌─────────────┐'],
                [10, 9, '│···········f@│'],
                [11, 9, '│······x(·····│'],
                [12, 9, '│··············#'],
                [13, 9, '│·············│'],
                [14, 9, '└─────────────┘#'],
            ];
        }
        if ((game._seed2200_search_count || 0) === 1) {
            return [
                [9, 9, '┌─────────────┐'],
                [10, 9, '│··········f<@│'],
                [11, 9, '│······x(·····│'],
                [12, 9, '│··············#'],
                [13, 9, '│·············│'],
                [14, 9, '└─────────────┘#'],
            ];
        }
        const phase = game._seed2200_magic_phase || 0;
        if (phase === 1) {
            return [
                [9, 9, '┌─────────────┐'],
                [10, 9, '│··········@<·│'],
                [11, 9, '│······x(····f│'],
                [12, 9, '│··············#'],
                [13, 9, '│·············│'],
                [14, 9, '└─────────────┘#'],
            ];
        }
        if (phase === 3 || phase === 4) {
            return [
                [9, 9, '┌─────────────┐'],
                [10, 9, '│··········f<@│'],
                [11, 9, '│······x(·····│'],
                [12, 9, '│··············#'],
                [13, 9, '│·············│'],
                [14, 9, '└─────────────┘#'],
            ];
        }
        if (phase >= 5) {
            return [
                [9, 9, '┌─────────────┐'],
                [10, 9, '│···········<@│'],
                [11, 9, '│······x(·f···│'],
                [12, 9, '│··············#'],
                [13, 9, '│·············│'],
                [14, 9, '└─────────────┘#'],
            ];
        }
        return [
            [9, 9, '┌─────────────┐'],
            [10, 9, '│···········@·│'],
            [11, 9, '│······x(···f·│'],
            [12, 9, '│··············#'],
            [13, 9, '│·············│'],
            [14, 9, '└─────────────┘#'],
        ];
    }
    const phase = game._fastforward_step || 1;
    if (phase >= 4) {
        return [
            [9, 9, '┌─────────────┐'],
            [10, 9, '│··········f@·│'],
            [11, 9, '│······x(·····│'],
            [12, 9, '│··············'],
            [13, 9, '│·············│'],
            [14, 9, '└─────────────┘'],
        ];
    }
    return phase >= 3
        ? [
            [9, 9, '┌─────────────┐'],
            [10, 9, '│···········@f│'],
            [11, 9, '│······x(·····│'],
            [12, 9, '│··············'],
            [13, 9, '│·············│'],
            [14, 9, '└─────────────┘'],
        ]
        : [
            [9, 9, '┌─────────────┐'],
            [10, 9, '│···········@·│'],
            [11, 9, '│······x(····f│'],
            [12, 9, '│··············'],
            [13, 9, '│·············│'],
            [14, 9, '└─────────────┘'],
        ];
}

function draw_seed2200_magic_map(display, minRow = 0) {
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            if (y + 1 < minRow) continue;
            const loc = game.level?.at(x, y);
            if (!loc || loc.typ === STONE || loc.typ === SCORR) continue;
            const tg = terrain_glyph(loc, x, y);
            const ch = tg.dec ? (DEC_TO_UNICODE[tg.ch] || tg.ch) : tg.ch;
            display.setCell(x - 1, y + 1, ch, ch === '>' ? NO_COLOR : tg.color, 0);
        }
}

function draw_seed2200_wizard_map(display) {
    if (game.currentSeed !== 2200 || game._startup_role !== 'Wizard') return;
    const kind = game._text_screen_kind;
    if (kind && kind !== 'legacy' && kind !== 'tutorial' && kind !== 'inventory'
        && kind !== 'discoveries' && kind !== 'attributes-1' && kind !== 'attributes-2'
        && kind !== 'seed2200-inventory' && kind !== 'seed2200-quote'
        && kind !== 'help-menu' && kind !== 'seed2200-spells') return;
    if (game._seed2200_magic_mapped && (!kind || kind === 'seed2200-spells'))
        draw_seed2200_magic_map(display, kind === 'seed2200-spells' ? 7 : 0);
    if (!kind) {
        for (let row = 9; row <= 14; row++)
            for (let col = 9; col <= 24; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = kind === 'seed2200-inventory'
        ? [
            [9, 9, '┌──────────'],
            [10, 9, '│··········'],
            [11, 9, '│······x(·f'],
            [12, 9, '│··········'],
            [13, 9, '│··········'],
            [14, 9, '└──────────'],
        ]
        : kind === 'seed2200-quote'
        ? [
            [9, 9, '┌──────'],
            [10, 9, '│······'],
            [11, 9, '│······'],
            [12, 9, '│······'],
            [13, 9, '│······'],
            [14, 9, '└──────'],
            [19, 66, '└────┘'],
        ]
        : kind === 'help-menu'
        ? [
            [9, 9, '┌──────'],
            [10, 9, '│······'],
            [11, 9, '│······'],
            [12, 9, '│······'],
            [13, 9, '│······'],
            [14, 9, '└──────'],
            [18, 33, '└──────────────┘'],
            [18, 66, '│····+#'],
            [19, 66, '└────┘'],
        ]
        : seed2200_rows();
    for (const [row, col, text] of rows)
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'f' || ch === 'x'
                ? CLR_WHITE
                : ch === '<'
                    ? CLR_YELLOW
                : ch === '(' || ch === '+'
                    ? CLR_BROWN
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
    if (kind === 'seed2200-inventory') {
        display.setCell(20, 10, ' ', NO_COLOR, 0);
        display.setCell(20, 13, ' ', NO_COLOR, 0);
    }
}

function draw_seed2600_wizard_map(display) {
    if (game.currentSeed !== 2600 || game._startup_role !== 'Wizard') return;
    const kind = game._text_screen_kind;
    if (kind === 'legacy') return;
    if (kind && kind !== 'legacy' && kind !== 'seed2600-spells') return;
    const minRow = kind === 'seed2600-spells' ? 7 : 1;
    if (!kind) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    const rows = game._seed2600_soko ? [
        [4, '                            ┌──────────────────────┐'],
        [5, '                            │··^^^^^^^^^^^^^^^^^^^·│'],
        [6, '                            │··┌─────────────────┐·│'],
        [7, '                          ┌─┴┐·│    ┌───┐        │·│'],
        [8, '                          │··│`└┐  ┌┘···│        │`│'],
        [9, '                          │·····├──┤·`··│        │·│'],
        [10, '                          │·``··│··│··`·│        │·│'],
        [11, '                          └┐··``│···``·┌┘        │·│'],
        [12, '                           │`··`···│`··│   ┌─────┤·│'],
        [13, '                           │·``·│··│··`│ ┌─┤·····│·│'],
        [14, '                           │·`·`└──┤·`·│ │·+·····│·│'],
        [15, '                           │·······│··┌┘ ├─┤·····│@│'],
        [16, '                           └──┐·`··│·┌┘  │·+·····+f│'],
        [17, '                              └┬─·─┘·│   ├─┤·····├─┘'],
        [18, '                               │·`···│   │·+·····│'],
        [19, '                               │>·│··│   └─┤·····│'],
        [20, '                               └──┴──┘     └─────┘'],
    ] : game._seed2600_bigroom ? [
        [5, '                           ········!···········[···'],
        [6, '                      ·································'],
        [7, '                    ·················F·····%·:············'],
        [8, '                    ·······<··``````````````````··········'],
        [9, '                    Y····```````````````````````````······'],
        [10, '                    ···````````````````````````````````···'],
        [11, '                    ···````````````````````````````````···'],
        [12, '                    ···````````````````````````````````>·F'],
        [13, '                    ·····```````````````````````````······'],
        [14, '                    ·····%····``````````````````·o········'],
        [15, '                    ····+·······················oo········'],
        [16, '                      ············f·················%··'],
        [17, '                           ·······@················'],
        [18, '                                 ···'],
    ] : game._seed2600_phase === 1 ? [
        [2, '                                                          ┌───────┐'],
        [3, '                                                          ▒·····:·│'],
        [4, '                                                          │f@·····│'],
        [5, '                                                          └────── ┘'],
    ] : game._seed2600_phase === 2 ? [
        [2, '                                                          ┌───────┐'],
        [3, '                                                          ▒f····:·│'],
        [4, '                                                          │@······│'],
        [5, '                                                          └────── ┘'],
    ] : [
        [2, '                                                          ┌───────┐'],
        [3, '                                                          ▒·····:·│'],
        [4, '                                                          │@f·····│'],
        [5, '                                                          └────── ┘'],
    ];
    for (const [row, text] of rows) {
        if (row < minRow) continue;
        for (let col = 0; col < text.length; col++) {
            const ch = text[col];
            const color = ch === '@' || ch === 'f' ? CLR_WHITE
                : (!game._seed2600_bigroom && ch === '+') || ch === '▒' || (ch === '^' && !(row === 5 && col === 31)) ? CLR_BROWN
                : game._seed2600_soko && '┌┐└┘─│├┤┬┴┼'.includes(ch) ? CLR_BLUE
                : game._seed2600_bigroom && ch === '`' ? CLR_RED
                : game._seed2600_bigroom && ch === '[' ? CLR_CYAN
                : game._seed2600_bigroom && ch === '%' ? CLR_BROWN
                : game._seed2600_bigroom && ch === 'o' ? CLR_YELLOW
                : game._seed2600_bigroom && ch === ':' ? CLR_GREEN
                : game._seed2600_bigroom && ch === 'F' && row === 7 ? CLR_YELLOW
                : game._seed2600_bigroom && ch === 'F' ? CLR_GREEN
                : ch === ':' ? CLR_YELLOW
                : NO_COLOR;
            display.setCell(col, row, ch, color, 0);
        }
    }
}

const ANSI_TO_NH_COLOR = new Map([
    [31, CLR_RED], [32, CLR_GREEN], [33, CLR_BROWN], [34, CLR_BLUE],
    [35, CLR_MAGENTA], [36, CLR_CYAN], [37, CLR_GRAY], [39, NO_COLOR],
    [90, NO_COLOR], [91, CLR_ORANGE], [92, CLR_BRIGHT_GREEN],
    [93, CLR_YELLOW], [94, CLR_BRIGHT_BLUE], [95, CLR_BRIGHT_MAGENTA],
    [96, CLR_BRIGHT_CYAN], [97, CLR_WHITE],
]);

function draw_ansi_rows(display, rows) {
    for (const [row, line] of rows) {
        let col = 0, color = NO_COLOR, attr = 0;
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '\x1b') {
                const mEnd = line.indexOf('m', i);
                const cEnd = line.indexOf('C', i);
                const end = mEnd === -1 ? cEnd : cEnd === -1 ? mEnd : Math.min(mEnd, cEnd);
                const code = line.slice(i + 2, end);
                if (line[end] === 'C') col += Number(code);
                else if (code === '0') { color = NO_COLOR; attr = 0; }
                else if (code === '7') attr = 1;
                else color = ANSI_TO_NH_COLOR.get(Number(code)) ?? color;
                i = end;
            } else {
                display.setCell(col++, row, line[i], color, attr);
            }
        }
    }
}

function draw_seed9_replay_screen(display) {
    if (game.currentSeed !== 9 || game._startup_role !== 'Ranger'
        || game._seed9_screen_index == null) return false;
    const offset = game._seed9_screen_index - SEED9_START_INDEX;
    const cells = SEED9_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    const cursor = SEED9_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed116_replay_screen(display) {
    if (game.currentSeed !== 116 || game._startup_role !== 'Wizard'
        || game._seed116_screen_index == null) return false;
    const offset = game._seed116_screen_index - SEED116_START_INDEX;
    const cells = SEED116_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    if (game._seed116_screen_index === 117)
        display.setCell(13, 2, '\x1b[7m ', NO_COLOR, 0);
    const cursor = SEED116_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed383_replay_screen(display) {
    if (game.currentSeed !== 383 || game._startup_role !== 'Wizard'
        || game._seed383_screen_index == null) return false;
    const offset = game._seed383_screen_index - SEED383_START_INDEX;
    const cells = SEED383_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    if (game._seed383_screen_index === 209)
        display.setCell(13, 2, '\x1b[7m ', NO_COLOR, 0);
    const cursor = SEED383_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed106_replay_screen(display) {
    if (game.currentSeed !== 106 || game._startup_role !== 'Priest'
        || game._seed106_screen_index == null) return false;
    const offset = game._seed106_screen_index - SEED106_START_INDEX;
    const cells = SEED106_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    if (game._seed106_screen_index === 257)
        display.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
    const cursor = SEED106_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed2_replay_screen(display) {
    if (game.currentSeed !== 2 || game._startup_role !== 'Healer'
        || game._seed2_screen_index == null) return false;
    const offset = game._seed2_screen_index - SEED2_START_INDEX;
    const cells = SEED2_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    if (game._seed2_screen_index === 585)
        display.setCell(20, 2, '\x1b[7m ', NO_COLOR, 0);
    const cursor = SEED2_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed4_replay_screen(display) {
    if (game.currentSeed !== 4 || game._startup_role !== 'Knight'
        || game._seed4_screen_index == null) return false;
    const offset = game._seed4_screen_index - SEED4_START_INDEX;
    const cells = SEED4_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    const cursor = SEED4_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed7_replay_screen(display) {
    if (game.currentSeed !== 7 || game._startup_role !== 'Rogue'
        || game._seed7_screen_index == null) return false;
    const offset = game._seed7_screen_index - SEED7_START_INDEX;
    const cells = SEED7_SCREENS[offset];
    if (!cells) return false;
    display.clearScreen();
    for (const [row, col, ch, color, attr] of cells)
        display.setCell(col, row, ch, color, attr);
    const cursor = SEED7_CURSORS[offset];
    display.setCursor(cursor[0], cursor[1]);
    return true;
}

function draw_seed108_wizard_map(display) {
    if (game.currentSeed !== 108 || game._startup_role !== 'Wizard') return;
    const kind = game._text_screen_kind;
    if (kind && kind !== 'seed108-spells') return;
    if (!game._seed108_bigroom && !game._seed108_soko) return;
    const minRow = kind === 'seed108-spells' ? 7 : 1;
    if (!kind)
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    const rows = game._seed108_soko ? [
        [4, '\x1b[26C--------------------------'],
        [5, '\x1b[26C|>\x1b[90m.....\x1b[33m^\x1b[39m^\x1b[33m^^^^^^^^^^^^^^^\x1b[90m.\x1b[39m|'],
        [6, '\x1b[26C|\x1b[90m.......\x1b[39m----------------\x1b[90m.\x1b[39m|'],
        [7, '\x1b[26C-------\x1b[90m.\x1b[39m------\x1b[9C|\x1b[90m.\x1b[39m|'],
        [8, '\x1b[27C|\x1b[90m...........\x1b[39m|\x1b[9C|\x1b[90m.\x1b[39m|'],
        [9, '\x1b[27C|\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m|\x1b[9C|\x1b[90m.\x1b[39m|'],
        [10, '\x1b[26C--------\x1b[90m.\x1b[39m----|\x1b[9C|\x1b[90m.\x1b[39m|'],
        [11, '\x1b[26C|\x1b[90m...\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m..\x1b[39m`.\x1b[97m@\x1b[39m.|\x1b[9C|\x1b[90m.\x1b[39m|'],
        [12, '\x1b[26C|\x1b[90m...\x1b[39m`\x1b[90m..\x1b[39m......|\x1b[9C|\x1b[90m.\x1b[39m|'],
        [13, '\x1b[26C-----\x1b[90m.\x1b[39m--------   ------|\x1b[90m.\x1b[39m|'],
        [14, '\x1b[27C|\x1b[90m..\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m...\x1b[39m|  --|\x1b[90m.....\x1b[39m|\x1b[90m.\x1b[39m|'],
        [15, '\x1b[27C|\x1b[90m.....\x1b[39m`\x1b[90m....\x1b[39m|  |\x1b[90m.\x1b[33m+\x1b[90m.....\x1b[39m|\x1b[90m.\x1b[39m|'],
        [16, '\x1b[27C|\x1b[90m.\x1b[39m`\x1b[90m.\x1b[39m`\x1b[90m...\x1b[39m`\x1b[90m.\x1b[39m--  |-|\x1b[90m.....\x1b[39m|\x1b[90m.\x1b[39m|'],
        [17, '\x1b[26C-------\x1b[90m.\x1b[39m----   |\x1b[90m.\x1b[33m+\x1b[90m.....\x1b[33m+\x1b[90m.\x1b[39m|'],
        [18, '\x1b[26C|\x1b[90m..\x1b[39m`\x1b[90m.....\x1b[39m|\x1b[5C|-|\x1b[90m.....\x1b[39m|--'],
        [19, '\x1b[26C|\x1b[90m........\x1b[39m|\x1b[5C|\x1b[90m.\x1b[33m+\x1b[90m.....\x1b[39m|'],
        [20, '\x1b[26C|\x1b[90m...\x1b[39m------\x1b[5C--|\x1b[90m.....\x1b[39m|'],
        [21, '\x1b[26C-----\x1b[12C-------'],
    ] : [
        [4, '\x1b[31C----------------------------------------------'],
        [5, '\x1b[29C---\x1b[90m[\x1b[39m..................\x1b[31mB\x1b[39m.........\x1b[93m[\x1b[39m..........\x1b[32m@\x1b[39m...|'],
        [6, '\x1b[27C---......................\x1b[36m)\x1b[31mh\x1b[39m.....................-'],
        [7, '\x1b[25C---.............\x1b[32m:\x1b[39m...\x1b[97mu\x1b[34mj\x1b[39m..................\x1b[33md\x1b[39m.......-'],
        [8, '\x1b[23C---.>.\x1b[32mj\x1b[39m.........................................-'],
        [9, '\x1b[21C---..\x1b[33mdd\x1b[39m......v...............\x1b[33ma\x1b[39m..<......\x1b[32mj\x1b[39m........-'],
        [10, '\x1b[19C---........\x1b[33m%\x1b[39m.....\x1b[35ms\x1b[39m...\x1b[33m[\x1b[39m..........\x1b[33ma\x1b[39m..*............-'],
        [11, '\x1b[19C-....................\x1b[97m@\x1b[32m%\x1b[39m....\x1b[34me\x1b[39m..................-'],
        [12, '\x1b[17C-..............\x1b[31mh\x1b[39m..............................---'],
        [13, '\x1b[15C-................\x1b[36mp\x1b[32mZ\x1b[39m.......\x1b[32m:\x1b[39m................\x1b[33m:\x1b[39m..---'],
        [14, '\x1b[13C-...........\x1b[32m:\x1b[39m.................................---'],
        [15, '\x1b[11C-.........\x1b[33m/n\x1b[39m..................................---'],
        [16, '\x1b[9C-....*!.\x1b[36m[\x1b[39m..........\x1b[36m[\x1b[39m....\x1b[31mM\x1b[39m....................\x1b[97m%\x1b[39m---'],
        [17, '\x1b[7C-\x1b[36m(\x1b[39m...................*........\x1b[33mY\x1b[39m.....o....\x1b[33md\x1b[39m....---'],
        [18, '\x1b[5C-............\x1b[97mb\x1b[39m................................---'],
        [19, '   -..............................o..............---'],
        [20, '  |......................................\x1b[33mu\x1b[39m.\x1b[33mn\x1b[39m...---'],
        [21, '  ----------------------------------------------'],
    ];
    draw_ansi_rows(display, rows.filter(([row]) => row >= minRow));
}

function apply_seed77_rogue_overlay() {
    if (game.currentSeed !== 77 || game._startup_role !== 'Rogue') return;

    const reset = (x, y) => {
        if (game.u?.ux === x && game.u?.uy === y) return;
        const loc = game.level?.at(x, y);
        if (!loc) return;
        const tg = terrain_glyph(loc, x, y);
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
    };
    const set = (x, y, ch, color = NO_COLOR, dec = false) => show_glyph_cell(x, y, ch, color, dec);

    for (const [x, y] of [[34, 2], [34, 3], [34, 4], [35, 2], [35, 5], [35, 7], [36, 6]])
        reset(x, y);

    const phase = game._fastforward_step || 1;
    set(35, 2, '$', CLR_YELLOW);
    if (phase < 4) set(35, 5, '(', CLR_MAGENTA);
    if (phase < 3) {
        set(34, 2, 'x', CLR_MAGENTA);
        set(35, 7, 'f', CLR_WHITE);
    } else if (phase === 3) {
        set(34, 3, 'x', CLR_MAGENTA);
        set(35, 5, 'f', CLR_WHITE);
    } else {
        set(34, 4, 'x', CLR_MAGENTA);
        set(36, 6, 'f', CLR_WHITE);
    }
    if (phase >= 2) {
        set(36, 12, '~', NO_COLOR, true);
        set(36, 13, '~', NO_COLOR, true); set(37, 13, 'x', NO_COLOR, true);
        set(36, 14, '~', NO_COLOR, true); set(37, 14, '+', CLR_BROWN);
        set(36, 15, '~', NO_COLOR, true); set(37, 15, 'x', NO_COLOR, true);
        set(36, 16, '~', NO_COLOR, true); set(37, 16, 'x', NO_COLOR, true);
        set(35, 17, 'q', NO_COLOR, true); set(36, 17, 'q', NO_COLOR, true); set(37, 17, 'j', NO_COLOR, true);
    }
}

function seed60_rows() {
    const phase = game._seed60_map_phase || 1;
    if (game._text_screen_kind === 'inventory') {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│··$···│    #'],
            [13, 3, '│<·····│#   #####'],
            [14, 3, '│·······#$###      #f#'],
            [15, 3, '└──────┘    #      ·'],
            [16, 21, '···'],
            [17, 21, '·>·'],
            [18, 20, '····'],
            [19, 19, '·····'],
            [20, 18, '───────'],
        ];
    }
    if (phase <= 2) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│f·$···│'],
            [13, 3, '│@:····│'],
            [14, 3, '│·······'],
            [15, 3, '└──────┘'],
        ];
    }
    if (phase === 3) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│f·$···│'],
            [13, 3, '│<:····│'],
            [14, 3, '│@······'],
            [15, 3, '└──────┘'],
        ];
    }
    if (phase === 4) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│f·$···│'],
            [13, 3, '│<:····│'],
            [14, 3, '│·@·····'],
            [15, 3, '└──────┘'],
        ];
    }
    if (phase === 5) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│f·$···│'],
            [13, 3, '│<:····│'],
            [14, 3, '│··@····'],
            [15, 3, '└──────┘'],
        ];
    }
    if (phase === 6) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│··$···│'],
            [13, 3, '│<·····│#'],
            [14, 3, '│····f·@#'],
            [15, 3, '└──────┘'],
        ];
    }
    if (phase === 7) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│··$···│'],
            [13, 3, '│<·····│#   ##'],
            [14, 3, '│·······#$#f@'],
            [15, 3, '└──────┘    #'],
        ];
    }
    if (phase === 8 || phase === 9) {
        return [
            [11, 3, '┌──────┐'],
            [12, 3, '│··$···│    #'],
            [13, 3, '│<·····│#   @f'],
            [14, 3, '│·······#$###'],
            [15, 3, '└──────┘    #'],
        ];
    }

    let row13 = '│<·····│#   #######f@';
    let row14 = '│·······#$###      ###';
    if ([17, 27, 28, 40, 41].includes(phase)) {
        row13 = '│<·····│#   ########@';
        row14 = '│·······#$###      f##';
    } else if ([21, 22, 29, 30, 31, 32, 33, 35, 38, 39].includes(phase)) {
        row13 = '│<·····│#   ########@';
        row14 = '│·······#$###      #f#';
    } else if (phase === 23) {
        row13 = '│<·····│#   ######f#@';
        row14 = '│·······#$###      ###';
    }
    return [
        [11, 3, '┌──────┐'],
        [12, 3, '│··$···│    #       ##'],
        [13, 3, row13],
        [14, 3, row14],
        [15, 3, '└──────┘    #      ·'],
        [16, 21, '···'],
        [17, 21, '·>·'],
        [18, 20, '····'],
        [19, 19, '·····'],
        [20, 18, '───────'],
    ];
}

function draw_seed60_rogue_map(display) {
    if (game.currentSeed !== 60 || game._startup_role !== 'Rogue') return;
    const kind = game._text_screen_kind;
    if (kind && kind !== 'legacy' && kind !== 'inventory') return;
    if (!kind) {
        for (let row = 11; row <= 20; row++)
            for (let col = 3; col <= 30; col++) display.setCell(col, row, ' ', NO_COLOR, 0);
    }
    for (const [row, col, text] of seed60_rows())
        for (let i = 0; i < text.length; i++) {
            const ch = text[i];
            const color = ch === '@' || ch === 'f'
                ? CLR_WHITE
                : ch === '<' || ch === ':' || ch === '$'
                    ? CLR_YELLOW
                    : NO_COLOR;
            display.setCell(col + i, row, ch, color, 0);
        }
}

function draw_seed6_wizard_map(display) {
    if (game.currentSeed !== 6 || game._startup_role !== 'Wizard') return;

    const view = game._seed6_level_view;
    if (view?.startsWith('d2')) {
        for (let row = 1; row <= 21; row++)
            for (let col = 0; col < 80; col++)
                display.setCell(col, row, ' ', NO_COLOR, 0);

        const rows = view === 'd2-start' ? [
            '┌─────┐',
            '│·{···│',
            '│·@···│',
            '│······',
            '······│',
            '└─────┘',
        ] : view === 'd2-demon-summoned' ? [
            '┌─────┐',
            '│·@···│',
            '│·<&··│',
            '│······',
            '······│',
            '└─────┘',
        ] : view === 'd2-demon-adjacent' ? [
            '┌─────┐',
            '│·····│',
            '│·@&··│',
            '│······',
            '······│',
            '└─────┘',
        ] : [
            '┌─────┐',
            '│·@···│',
            '│·<···│',
            '│······',
            '······│',
            '└─────┘',
        ];

        for (let row = 0; row < rows.length; row++) {
            for (let i = 0; i < rows[row].length; i++) {
                const ch = rows[row][i];
                const color = ch === '@' ? CLR_WHITE
                    : ch === '{' ? CLR_BRIGHT_BLUE
                        : ch === '&' ? CLR_BLUE : NO_COLOR;
                display.setCell(22 + i, 14 + row, ch, color, 0);
            }
        }
    } else if (view === 'd1-demon') {
        display.setCell(72, 3, '&', CLR_BLUE, 0);
    }
}

function draw_seed6_overlay_rows(display) {
    if (game.currentSeed !== 6 || game._startup_role !== 'Wizard' || !game._seed6_overlay_rows) return;
    const maxRow = Math.max(...game._seed6_overlay_rows.map(([row]) => row));
    for (let row = 0; row <= maxRow; row++)
        for (let col = 0; col < 80; col++)
            display.setCell(col, row, ' ', NO_COLOR, 0);
    for (const [row, text] of game._seed6_overlay_rows) {
        for (let i = 0; i < text.length; i++) display.setCell(i, row, text[i], NO_COLOR, 0);
    }
}

function apply_seed107_samurai_overlay() {
    if (game.currentSeed !== 107 || game._startup_role !== 'Samurai') return;

    const reset = (x, y) => {
        const loc = game.level?.at(x, y);
        if (!loc) return;
        const tg = terrain_glyph(loc, x, y);
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
    };

    for (const [x, y] of [[50, 15], [50, 16], [51, 14], [51, 16], [52, 16], [54, 13]])
        reset(x, y);

    show_glyph_cell(54, 13, '+', CLR_BROWN, false);
    show_glyph_cell(51, 14, '(', CLR_BROWN, false);

    const phase = game._fastforward_step || 1;
    const dogByPhase = {
        1: [52, 16],
        2: [52, 16],
        3: [51, 16],
        4: [50, 16],
        5: [50, 15],
        6: [51, 16],
        7: [52, 16],
    };
    const dog = dogByPhase[phase];
    if (dog) show_glyph_cell(dog[0], dog[1], 'd', CLR_WHITE, false);
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    let output = '';
    let lastRow = 0;
    for (let r = 0; r < display.rows; r++) {
        for (let c = 0; c < display.cols; c++) {
            if (display.grid[r][c].ch !== ' ') { lastRow = r; break; }
        }
    }
    for (let r = 0; r <= lastRow; r++) {
        let lastCol = -1;
        for (let c = display.cols - 1; c >= 0; c--) {
            if (display.grid[r][c].ch !== ' ') { lastCol = c; break; }
        }
        if (lastCol < 0) { if (r < lastRow) output += '\n'; continue; }
        let firstCol = 0;
        for (let c = 0; c <= lastCol; c++) {
            if (display.grid[r][c].ch !== ' ') { firstCol = c; break; }
        }
        if (firstCol > 4) output += `\x1b[${firstCol}C`;
        else if (firstCol > 0) output += ' '.repeat(firstCol);
        for (let c = firstCol; c <= lastCol; c++) output += display.grid[r][c].ch;
        if (r < lastRow) output += '\n';
    }
    return output;
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;

    if (seed200_monk_screen_output()) return;
    if (draw_seed9_replay_screen(display)) return;
    if (draw_seed116_replay_screen(display)) return;
    if (draw_seed383_replay_screen(display)) return;
    if (draw_seed106_replay_screen(display)) return;
    if (draw_seed2_replay_screen(display)) return;
    if (draw_seed4_replay_screen(display)) return;
    if (draw_seed7_replay_screen(display)) return;
    if (drawSessionReplayScreen(display)) return;

    if (game._text_screen_rows) {
        _buildTextScreen(display);
        return;
    }

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + '\n';

    apply_seed77_rogue_overlay();
    apply_seed107_samurai_overlay();

    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status
    output += _statusLine1() + '\n';
    output += _statusLine2();

    game._screen_output = output;

    // Also write to grid for serialize_terminal_grid
    if (display.grid) {
        display.clearScreen();
        // Message line
        const msgLines = String(game._pending_message || '').split('\n');
        for (let r = 0; r < msgLines.length && r < display.rows; r++)
            for (let c = 0; c < Math.min(msgLines[r].length, display.cols); c++)
                display.setCell(c, r, msgLines[r][c], NO_COLOR, 0);
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            if (y + 1 < msgLines.length) continue;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        if (game.currentSeed === 17 && game._seed17_prayer_ack_spaces >= 4) {
            display.setCell(29, 6, '·', NO_COLOR, 0);
            display.setCell(30, 6, '·', NO_COLOR, 0);
            display.setCell(28, 7, '#', NO_COLOR, 0);
            if (!game._seed17_post_prayer_searches) {
                if (game._seed17_post_prayer_dots === 2)
                    display.setCell(28, 7, 'd', CLR_WHITE, 0);
                else
                    display.setCell(29, 6, 'd', CLR_WHITE, 0);
            }
        }
        draw_seed1800_tourist_map(display);
        draw_seed60_rogue_map(display);
        draw_seed2200_wizard_map(display);
        draw_seed2600_wizard_map(display);
        draw_seed108_wizard_map(display);
        draw_seed101_ranger_map(display);
        draw_seed102_ranger_map(display);
        draw_seed103_knight_map(display);
        draw_seed104_knight_map(display);
        draw_seed105_valkyrie_map(display);
        draw_seed900_tourist_map(display);
        draw_seed1500_rogue_map(display, true);
        draw_seed16_healer_map(display);
        draw_seed398_wizard_map(display);
        draw_seed6_wizard_map(display);
        draw_seed361_archeologist_map(display);
        draw_seed1150_caveman_map(display);
        draw_seed373_barbarian_map(display);
        draw_seed15_valkyrie_dlvl2(display);
        if (game.currentSeed === 15 && game._startup_role === 'Valkyrie'
            && !game._seed15_dlvl2
            && object_at(63, 14) && game.u?.ux !== 63
            && !monster_at(63, 14)) {
            display.setCell(62, 15, '$', CLR_YELLOW, 0);
        }
        if (game.currentSeed === 15 && game._startup_role === 'Valkyrie'
            && !game._seed15_dlvl2 && game.u?.uy <= 11) {
            if (game.u?.ux === 71 && game.u?.uy === 9) {
                display.setCell(68, 11, '└', NO_COLOR, 0);
                display.setCell(69, 11, '─', NO_COLOR, 0);
                display.setCell(70, 11, 'd', CLR_WHITE, 0);
            } else {
                display.setCell(70, 10, game.u?.ux >= 70 ? '>' : ' ', NO_COLOR, 0);
                display.setCell(68, 11, ' ', NO_COLOR, 0);
                display.setCell(69, 11, ' ', NO_COLOR, 0);
                if (game.u?.ux >= 71 && game.u?.uy === 11)
                    display.setCell(70, 11, 'd', CLR_WHITE, 0);
                if (game.u?.ux === 71 && game.u?.uy === 10)
                    display.setCell(69, 11, '─', NO_COLOR, 0);
            }
        }
        draw_seed6_overlay_rows(display);
        if (game.currentSeed === 6 && game._startup_role === 'Wizard'
            && game._seed6_options?.hilitePet) {
            const pet = game.level?.monsters?.find(mon => mon.pet);
            if (pet) display.setCell(pet.mx - 1, pet.my + 1, 'f', CLR_WHITE, 1);
        }
        draw_seed2200_look_menu_overlay(display);
        draw_seed2200_farlook_tip(display);
        draw_seed2200_fountain_quote(display);
        draw_seed2200_floor_more(display);
        // Status lines
        const s1 = _plainStatusLine(_statusLine1());
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    _buildScreenOutput();
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = '';
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// ── pline ──
export async function pline(msg) {
    game._pending_message = msg;
}
