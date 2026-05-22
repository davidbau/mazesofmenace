// display.js — Map rendering and terminal output.
// C refs: src/display.c, src/botl.c, win/tty.

import { game } from './gstate.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_ISOPEN, D_CLOSED, D_LOCKED, SDOOR, SCORR, FOUNTAIN, SINK,
    IRONBARS, MOAT, POOL, WATER, LAVAPOOL, LAVAWALL, ICE, TREE, CLOUD, GRAVE, THRONE, ALTAR,
    COULD_SEE, IN_SIGHT,
    WM_MASK, WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM,
    WM_T_LONG, WM_T_BL, WM_T_BR, WM_C_OUTER, WM_C_INNER,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    def_warnsyms, IS_POOL, IS_STWALL, MAGIC_PORTAL, BC_BALL, BC_CHAIN,
} from './const.js';
import {
    NO_COLOR, CLR_BROWN, CLR_BLUE, CLR_GRAY, CLR_WHITE, CLR_YELLOW, CLR_RED, CLR_ORANGE,
    CLR_BLACK, CLR_MAGENTA, CLR_CYAN, CLR_GREEN, CLR_BRIGHT_GREEN, CLR_BRIGHT_BLUE,
    CLR_BRIGHT_MAGENTA,
} from './terminal.js';
import { rn2_on_display_rng } from './rng.js';
import {
    DISPLAY_MONSTER_COLORS, DISPLAY_MONSTER_GLYPHS,
    DISPLAY_OBJECT_COLORS, DISPLAY_OBJECT_GLYPHS, FIRST_DISPLAY_OBJECT,
} from './monster_data.js';

const BOULDER = 465;
const CORPSE = 471;
const STATUE = 472;
const C_RANDOM_CORPSE = 265;
const C_SPE_DIG = 366;
const C_SPE_BLANK_PAPER = 407;
const GEM_CLASS = 14;
const ARROW_TRAP = 1;
const DART_TRAP = 2;
const ROCKTRAP = 3;
const SQKY_BOARD = 4;
const BEAR_TRAP = 5;
const LANDMINE = 6;
const ROLLING_BOULDER_TRAP = 7;
const SLP_GAS_TRAP = 8;
const RUST_TRAP = 9;
const FIRE_TRAP = 10;
const PIT_TRAP = 11;
const SPIKED_PIT = 12;
const HOLE = 13;
const TRAPDOOR = 14;
const TELEP_TRAP = 15;
const LEVEL_TELEP = 16;
const WEB = 18;
const STATUE_TRAP = 19;
const MAGIC_TRAP = 20;
const ANTI_MAGIC = 21;
const POLY_TRAP = 22;
const VIBRATING_SQUARE = 23;
const INFRARED_HIDDEN_MLETS = new Set(['blob', 'fungus', 'lizard', 'snake', 'spider', 'S']);

function display() {
    return game?.nhDisplay;
}

function writeText(row, col, text, color = NO_COLOR, attr = 0) {
    const d = display();
    if (!d) return;
    const str = String(text || '');
    for (let i = 0; i < str.length && col + i < d.cols; i++)
        d.setCell(col + i, row, str[i], color, attr);
}

function setCursorAfter(row, col, text, extra = 0) {
    const d = display();
    if (!d) return;
    let cursorCol = col + String(text || '').trimEnd().length + extra;
    let cursorRow = row;
    if (cursorCol >= d.cols) {
        cursorRow += Math.trunc(cursorCol / d.cols);
        cursorCol = (cursorCol % d.cols) + 1;
    }
    d.setCursor(cursorCol, cursorRow);
}

function glyphColor(color) {
    return color === CLR_BLACK || color === CLR_GRAY ? NO_COLOR : color;
}

function hallucinatesDisplay() {
    return (game._display_hallucinated_redraw || game._display_hallucinated_normal)
        && (game.u?._statusSuffix || '').includes('Hallu');
}

function isRogueLevel() {
    return !!game.level?.flags?.rogue_level;
}

export function strengthString(st) {
    if (st > 118) return String(st - 100).padStart(2, ' ');
    if (st === 118) return '18/**';
    if (st > 18) return `18/${String(st - 18).padStart(2, '0')}`;
    return String(st || '?');
}

const DEC_GLYPHS = {
    l: '┌',
    q: '─',
    k: '┐',
    x: '│',
    m: '└',
    j: '┘',
    t: '├',
    u: '┤',
    w: '┬',
    v: '┴',
    n: '┼',
    a: '▒',
    '~': '·',
};

function wallGlyph(decCh, asciiCh) {
    let color = NO_COLOR;
    if (game.level?.flags?.sokoban_rules && game.symset === 'DECgraphics') color = CLR_BLUE;
    else if (game.dungeons?.[game.u?.uz?.dnum]?.name === 'Gehennom') color = CLR_RED;
    else if (game.dungeons?.[game.u?.uz?.dnum]?.name === 'The Gnomish Mines') color = CLR_BROWN;
    return game.symset === 'DECgraphics'
        ? { ch: DEC_GLYPHS[decCh], color, dec: false }
        : { ch: asciiCh, color, dec: false };
}

function rememberedWallGlyph(loc, decCh, asciiCh) {
    const seenv = (loc?.seenv || 0) & 0xff;
    if (!seenv) return loc?.waslit ? wallGlyph(decCh, asciiCh) : { ch: ' ', color: NO_COLOR, dec: false };
    const mode = (loc.wall_info || 0) & WM_MASK;
    switch (loc.typ) {
    case VWALL:
        if (mode === WM_W_LEFT && !(seenv & (SV1 | SV2 | SV3 | SV4 | SV5)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_W_RIGHT && !(seenv & (SV0 | SV1 | SV5 | SV6 | SV7)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    case HWALL:
        if (mode === WM_W_TOP && !(seenv & (SV3 | SV4 | SV5 | SV6 | SV7)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_W_BOTTOM && !(seenv & (SV0 | SV1 | SV2 | SV3 | SV7)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    case TLCORNER:
        if (mode === WM_C_OUTER && !(seenv & (SV3 | SV4 | SV5)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_C_INNER && !(seenv & ~SV4))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    case TRCORNER:
        if (mode === WM_C_OUTER && !(seenv & (SV5 | SV6 | SV7)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_C_INNER && !(seenv & ~SV6))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    case BLCORNER:
        if (mode === WM_C_OUTER && !(seenv & (SV1 | SV2 | SV3)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_C_INNER && !(seenv & ~SV2))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    case BRCORNER:
        if (mode === WM_C_OUTER && !(seenv & (SV7 | SV0 | SV1)))
            return { ch: ' ', color: NO_COLOR, dec: false };
        if (mode === WM_C_INNER && !(seenv & ~SV0))
            return { ch: ' ', color: NO_COLOR, dec: false };
        break;
    }
    return wallGlyph(decCh, asciiCh);
}

function wallResultGlyph(kind) {
    switch (kind) {
    case 'stone': return { ch: ' ', color: NO_COLOR, dec: false };
    case 'vwall': return wallGlyph('x', '|');
    case 'hwall': return wallGlyph('q', '-');
    case 'tlcorn': return wallGlyph('l', '-');
    case 'trcorn': return wallGlyph('k', '-');
    case 'blcorn': return wallGlyph('m', '-');
    case 'brcorn': return wallGlyph('j', '-');
    case 'tuwall': return wallGlyph('v', '-');
    case 'tdwall': return wallGlyph('w', '-');
    case 'tlwall': return wallGlyph('u', '|');
    case 'trwall': return wallGlyph('t', '|');
    case 'crwall': return wallGlyph('n', '-');
    default: return { ch: ' ', color: NO_COLOR, dec: false };
    }
}

function only(seenv, bits) {
    return (seenv & bits) && !(seenv & ~bits);
}

function wallModeNeighbor(x, y, which) {
    if (x < 0 || x >= COLNO || y < 0 || y >= ROWNO) return which;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_STWALL(typ) || typ === CORR || typ === SCORR || typ === SDOOR) ? which : 0;
}

function currentTWallMode(loc, x, y) {
    let long = 0, bl = 0, br = 0;
    if (loc.typ === TDWALL) {
        long = wallModeNeighbor(x, y - 1, WM_T_LONG);
        bl = wallModeNeighbor(x - 1, y + 1, WM_T_BL);
        br = wallModeNeighbor(x + 1, y + 1, WM_T_BR);
    } else if (loc.typ === TUWALL) {
        long = wallModeNeighbor(x, y + 1, WM_T_LONG);
        bl = wallModeNeighbor(x + 1, y - 1, WM_T_BL);
        br = wallModeNeighbor(x - 1, y - 1, WM_T_BR);
    } else if (loc.typ === TLWALL) {
        long = wallModeNeighbor(x + 1, y, WM_T_LONG);
        bl = wallModeNeighbor(x - 1, y - 1, WM_T_BL);
        br = wallModeNeighbor(x - 1, y + 1, WM_T_BR);
    } else if (loc.typ === TRWALL) {
        long = wallModeNeighbor(x - 1, y, WM_T_LONG);
        bl = wallModeNeighbor(x + 1, y + 1, WM_T_BL);
        br = wallModeNeighbor(x + 1, y - 1, WM_T_BR);
    }
    return (long && (bl || br)) || (bl && br) ? 0 : long + bl + br;
}

function tWallGlyph(loc, decCh, asciiCh) {
    let seenv = (loc?.seenv || 0) & 0xff;
    if (!seenv) return loc?.waslit ? wallGlyph(decCh, asciiCh) : { ch: ' ', color: NO_COLOR, dec: false };

    const matrix = {
        [TDWALL]: ['stone', 'tlcorn', 'trcorn', 'hwall', 'tdwall'],
        [TLWALL]: ['stone', 'trcorn', 'brcorn', 'vwall', 'tlwall'],
        [TUWALL]: ['stone', 'brcorn', 'blcorn', 'hwall', 'tuwall'],
        [TRWALL]: ['stone', 'blcorn', 'tlcorn', 'vwall', 'trwall'],
    };
    const row = matrix[loc.typ];
    if (loc.typ === TUWALL) seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
    if (loc.typ === TLWALL) seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
    if (loc.typ === TRWALL) seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;

    let col = 0;
    switch ((loc.wall_info || 0) & WM_MASK) {
    case 0:
        if (seenv === SV4) col = 1;
        else if (seenv === SV6) col = 2;
        else if (seenv & (SV3 | SV5 | SV7) || ((seenv & SV4) && (seenv & SV6))) col = 4;
        else if (seenv & (SV0 | SV1 | SV2)) col = seenv & (SV4 | SV6) ? 4 : 3;
        break;
    case WM_T_LONG:
        if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = 1;
        else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = 2;
        else if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = 4;
        break;
    case WM_T_BL:
        if (only(seenv, SV4 | SV5)) col = 1;
        else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = 3;
        else if (!only(seenv, SV6)) col = 4;
        break;
    case WM_T_BR:
        if (only(seenv, SV5 | SV6)) col = 2;
        else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7))) col = 3;
        else if (!only(seenv, SV4)) col = 4;
        break;
    }
    return wallResultGlyph(row[col]);
}

function crossWallGlyph(loc) {
    let seenv = (loc?.seenv || 0) & 0xff;
    if (!seenv) return loc?.waslit ? wallGlyph('n', '-') : { ch: ' ', color: NO_COLOR, dec: false };

    const mode = (loc.wall_info || 0) & WM_MASK;
    if (!mode) {
        if (seenv === SV0) return wallResultGlyph('brcorn');
        if (seenv === SV2) return wallResultGlyph('blcorn');
        if (seenv === SV4) return wallResultGlyph('tlcorn');
        if (seenv === SV6) return wallResultGlyph('trcorn');
        if (!(seenv & ~(SV0 | SV1 | SV2)) && (seenv & SV1 || seenv === (SV0 | SV2))) return wallResultGlyph('tuwall');
        if (!(seenv & ~(SV2 | SV3 | SV4)) && (seenv & SV3 || seenv === (SV2 | SV4))) return wallResultGlyph('trwall');
        if (!(seenv & ~(SV4 | SV5 | SV6)) && (seenv & SV5 || seenv === (SV4 | SV6))) return wallResultGlyph('tdwall');
        if (!(seenv & ~(SV0 | SV6 | SV7)) && (seenv & SV7 || seenv === (SV0 | SV6))) return wallResultGlyph('tlwall');
        return wallResultGlyph('crwall');
    }

    const matrix = {
        [WM_X_BL]: ['brcorn', 'blcorn', 'tlcorn', 'tuwall', 'trwall', 'crwall'],
        [WM_X_TL]: ['blcorn', 'tlcorn', 'trcorn', 'trwall', 'tdwall', 'crwall'],
        [WM_X_TR]: ['tlcorn', 'trcorn', 'brcorn', 'tdwall', 'tlwall', 'crwall'],
        [WM_X_BR]: ['trcorn', 'brcorn', 'blcorn', 'tlwall', 'tuwall', 'crwall'],
    };
    let row = matrix[mode];
    if (mode === WM_X_TL) seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
    if (mode === WM_X_TR) seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;
    if (mode === WM_X_BL) seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
    if (row) {
        if (seenv === SV4) return wallResultGlyph('stone');
        seenv &= ~SV4;
        let col = 5;
        if (seenv === SV0) col = 1;
        else if (seenv & (SV2 | SV3)) {
            if (seenv & (SV5 | SV6 | SV7)) col = 5;
            else if (seenv & (SV0 | SV1)) col = 4;
            else col = 2;
        } else if (seenv & (SV5 | SV6)) {
            if (seenv & (SV1 | SV2 | SV3)) col = 5;
            else if (seenv & (SV0 | SV7)) col = 3;
            else col = 0;
        } else if (seenv & SV1) col = seenv & SV7 ? 5 : 4;
        else if (seenv & SV7) col = seenv & SV1 ? 5 : 3;
        return wallResultGlyph(row[col]);
    }

    if (mode === WM_X_TLBR) {
        if (only(seenv, SV1 | SV2 | SV3)) return wallResultGlyph('blcorn');
        if (only(seenv, SV5 | SV6 | SV7)) return wallResultGlyph('trcorn');
        if (only(seenv, SV0 | SV4)) return wallResultGlyph('stone');
        return wallResultGlyph('crwall');
    }
    if (mode === WM_X_BLTR) {
        if (only(seenv, SV0 | SV1 | SV7)) return wallResultGlyph('brcorn');
        if (only(seenv, SV3 | SV4 | SV5)) return wallResultGlyph('tlcorn');
        if (only(seenv, SV2 | SV6)) return wallResultGlyph('stone');
        return wallResultGlyph('crwall');
    }
    return wallResultGlyph('stone');
}

function terrainGlyph(loc, x, y) {
    switch (loc?.typ) {
    case STONE: return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM: return isRogueLevel() || game.symset !== 'DECgraphics'
        ? { ch: '.', color: NO_COLOR, dec: false }
        : { ch: DEC_GLYPHS['~'], color: NO_COLOR, dec: false };
    case CORR: return {
        ch: '#',
        color: (loc._litScrollWhite || game.flags?.lit_corridor || (loc.lit && (game.viz_array?.[y]?.[x] & IN_SIGHT))) ? CLR_WHITE : NO_COLOR,
        dec: false,
    };
    case SCORR: return { ch: ' ', color: NO_COLOR, dec: false };
    case SDOOR:
        return loc.horizontal
            ? rememberedWallGlyph({ ...loc, typ: HWALL }, 'q', '-')
            : rememberedWallGlyph({ ...loc, typ: VWALL }, 'x', '|');
    case DOOR:
        if (isRogueLevel() && !(loc.doormask & (D_CLOSED | D_LOCKED))) return { ch: '.', color: NO_COLOR, dec: false };
        if (loc.doormask & D_ISOPEN) return {
            ch: game.symset === 'DECgraphics' ? DEC_GLYPHS.a : '-',
            color: CLR_BROWN,
            dec: false,
        };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return game.symset === 'DECgraphics'
            ? { ch: DEC_GLYPHS['~'], color: NO_COLOR, dec: false }
            : { ch: '.', color: NO_COLOR, dec: false };
    case STAIRS:
        if (isRogueLevel()) return { ch: '%', color: loc.stairColor ?? NO_COLOR, dec: false };
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: loc.stairColor ?? ((game.u?.uz?.dlevel ?? 1) === 1 ? CLR_YELLOW : NO_COLOR), dec: false };
        return { ch: '>', color: loc.stairColor ?? NO_COLOR, dec: false };
    case FOUNTAIN: return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case SINK: return { ch: '{', color: CLR_WHITE, dec: false };
    case IRONBARS: return { ch: '#', color: CLR_CYAN, dec: false };
    case MOAT:
    case POOL: return game.symset === 'DECgraphics'
        ? { ch: '\x0e`\x0f', color: CLR_BLUE, dec: false }
        : { ch: '}', color: CLR_BLUE, dec: false };
    case WATER: return game.symset === 'DECgraphics'
        ? { ch: '\x0e`\x0f', color: CLR_BRIGHT_BLUE, dec: false }
        : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL: return game.symset === 'DECgraphics'
        ? { ch: '\x0e`\x0f', color: CLR_RED, dec: false }
        : { ch: '}', color: CLR_RED, dec: false };
    case LAVAWALL: return game.symset === 'DECgraphics'
        ? { ch: '\x0e`\x0f', color: CLR_ORANGE, dec: false }
        : { ch: '}', color: CLR_ORANGE, dec: false };
    case ICE: return { ch: '.', color: CLR_CYAN, dec: false };
    case TREE: return { ch: '\x0eg\x0f', color: CLR_GREEN, dec: false };
    case CLOUD: return { ch: '#', color: CLR_GRAY, dec: false };
    case GRAVE: return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE: return { ch: '\\', color: CLR_YELLOW, dec: false };
    case ALTAR: return { ch: game.symset === 'DECgraphics' ? '\x0e{\x0f' : '_', color: NO_COLOR, dec: false };
    case HWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('q', '-') : rememberedWallGlyph(loc, 'q', '-');
    case VWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('x', '|') : rememberedWallGlyph(loc, 'x', '|');
    case TLCORNER: return game.level?.flags?.sokoban_rules ? wallGlyph('l', '-') : rememberedWallGlyph(loc, 'l', '-');
    case TRCORNER: return game.level?.flags?.sokoban_rules ? wallGlyph('k', '-') : rememberedWallGlyph(loc, 'k', '-');
    case BLCORNER: return game.level?.flags?.sokoban_rules ? wallGlyph('m', '-') : rememberedWallGlyph(loc, 'm', '-');
    case BRCORNER: return game.level?.flags?.sokoban_rules ? wallGlyph('j', '-') : rememberedWallGlyph(loc, 'j', '-');
    case CROSSWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('n', '-') : crossWallGlyph(loc);
    case TUWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('v', '-') : tWallGlyph({ ...loc, wall_info: (loc.wall_info & ~WM_MASK) | currentTWallMode(loc, x, y) }, 'v', '-');
    case TDWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('w', '-') : tWallGlyph({ ...loc, wall_info: (loc.wall_info & ~WM_MASK) | currentTWallMode(loc, x, y) }, 'w', '-');
    case TLWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('u', '|') : tWallGlyph({ ...loc, wall_info: (loc.wall_info & ~WM_MASK) | currentTWallMode(loc, x, y) }, 'u', '|');
    case TRWALL: return game.level?.flags?.sokoban_rules ? wallGlyph('t', '|') : tWallGlyph({ ...loc, wall_info: (loc.wall_info & ~WM_MASK) | currentTWallMode(loc, x, y) }, 't', '|');
    default: return { ch: ' ', color: NO_COLOR, dec: false };
    }
}

function monsterAt(x, y) {
    if (game.u?.blind) return undefined;
    const mon = game.level?.monsters?.find(candidate =>
        candidate.mx === x && candidate.my === y
        && !candidate._hide_for_bones_prompt);
    if (mon?.mundetected) return undefined;
    if (mon?.minvis && !game.u?.seeInvisible) return undefined;
    if (mon?._hide_for_door_open) return undefined;
    if (mon?._hide_for_bullwhip_more) return undefined;
    if (mon?._hide_for_web_more) return undefined;
    if (mon?._hide_for_queued_kill_more) return undefined;
    const stalePet = game._stale_queued_kill_pet;
    if (stalePet?.mon === mon) return undefined;
    return mon;
}

function objectAt(x, y) {
    const loc = game.level?.at(x, y);
    if ((IS_POOL(loc?.typ) && !game.u?.underwater) || loc?.typ === LAVAPOOL || loc?.typ === LAVAWALL) return null;
    const objects = game.level?.objects || [];
    for (let i = objects.length - 1; i >= 0; i--) {
        const obj = objects[i];
        if (obj._sokoRandom && game.level?.flags?.sokoban_rules
            && Math.max(Math.abs((obj.ox ?? 0) - (game.u?.ux ?? 0)), Math.abs((obj.oy ?? 0) - (game.u?.uy ?? 0))) > (obj._sokoRandomRange ?? 3))
            continue;
        if (!obj.hidden && obj.ox === x && obj.oy === y) return obj;
    }
    return null;
}

function engravingAt(x, y) {
    return game.level?.engravings?.find(engr => engr.x === x && engr.y === y && engr.text);
}

function trapAt(x, y) {
    const loc = game.level?.at(x, y);
    if ((IS_POOL(loc?.typ) && !game.u?.underwater) || loc?.typ === LAVAPOOL || loc?.typ === LAVAWALL) return null;
    const trap = game.level?.traps?.find(item => item.tx === x && item.ty === y);
    if (!trap) return null;
    if (trap.ttyp === HOLE && (game.viz_array?.[y]?.[x] & IN_SIGHT)) trap.tseen = true;
    return trap.tseen ? trap : null;
}

const PAIR_DISCOVERY_RE = /\b(?:boots|shoes|gloves)$/i;

function addObservedDiscovery(section, name, text = name) {
    if (!section || !name || !text) return;
    game._discoveries ??= [];
    if ((game._discoveries || []).some(entry => entry.section === section && entry.name === name)) return;
    const entry = { section, name, text, starred: false };
    if (section === 'Armor' && /^pair of /.test(name)) {
        const index = game._discoveries.findIndex(item =>
            item.section === 'Armor' && !item.starred && !/^pair of /.test(item.name || ''));
        if (index >= 0) {
            game._discoveries.splice(index, 0, entry);
            return;
        }
    }
    game._discoveries.push(entry);
}

export function recordObservedObjectDiscovery(obj) {
    if (!obj || (game.u?._statusSuffix || '').includes('Hallu')) return;
    if (obj.cls === 'amulet' || obj.glyph === '"') {
        const appearance = String(obj.appearance || '').trim();
        if (appearance) addObservedDiscovery('Amulets', 'amulet', `amulet (${appearance})`);
        return;
    }
    if (obj.cls === 'armor' || obj.glyph === '[') {
        const description = String(obj.appearance || '').trim();
        if (!description) return;
        const name = PAIR_DISCOVERY_RE.test(description) ? `pair of ${description}` : description;
        addObservedDiscovery('Armor', name);
        return;
    }
    if (obj.otyp === GEM_CLASS || obj.cls === 'gem' || obj.glyph === '*') {
        const actual = String(obj.actualKind || obj.kind || '').toLowerCase();
        if (actual === 'touchstone' || actual === 'flint stone' || actual === 'luckstone' || actual === 'loadstone') return;
        const description = String(obj.gemDescription || '').trim();
        if (description && description !== 'rock') addObservedDiscovery('Gems/Stones', description);
    }
}

function visibleRegionAt(x, y) {
    return (game.level?.regions || []).find(reg =>
        reg.visible !== false && reg.ttl !== -2
        && reg.coords?.some(coord => coord.x === x && coord.y === y));
}

function trapGlyph(trap) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case BEAR_TRAP:
        return { ch: '^', color: CLR_CYAN };
    case ROCKTRAP:
    case STATUE_TRAP:
        return { ch: '^', color: CLR_GRAY };
    case ROLLING_BOULDER_TRAP:
        return { ch: '^', color: NO_COLOR };
    case SQKY_BOARD:
    case HOLE:
    case TRAPDOOR:
        return { ch: '^', color: CLR_BROWN };
    case LANDMINE:
        return { ch: '^', color: CLR_RED };
    case SLP_GAS_TRAP:
    case MAGIC_TRAP:
    case ANTI_MAGIC:
        return { ch: '^', color: CLR_BRIGHT_BLUE };
    case RUST_TRAP:
        return { ch: '^', color: CLR_BLUE };
    case FIRE_TRAP:
        return { ch: '^', color: CLR_ORANGE };
    case PIT_TRAP:
    case SPIKED_PIT:
        return { ch: '^', color: NO_COLOR };
    case TELEP_TRAP:
    case LEVEL_TELEP:
        return { ch: '^', color: CLR_MAGENTA };
    case MAGIC_PORTAL:
        return { ch: '^', color: CLR_BRIGHT_MAGENTA };
    case WEB:
        return { ch: '"', color: CLR_GRAY };
    case POLY_TRAP:
        return { ch: '^', color: CLR_BRIGHT_GREEN };
    case VIBRATING_SQUARE:
        return { ch: '~', color: CLR_MAGENTA };
    default:
        return { ch: '^', color: CLR_BROWN };
    }
}

const MONSTER_COLORS = {
    jackal: CLR_BROWN,
    fox: CLR_RED,
    kobold: CLR_BROWN,
    'sewer rat': CLR_BROWN,
    'grid bug': CLR_MAGENTA,
    lichen: CLR_BRIGHT_GREEN,
    'kobold zombie': CLR_BROWN,
    goblin: NO_COLOR,
    newt: CLR_YELLOW,
    'little dog': CLR_WHITE,
    dog: CLR_WHITE,
    'large dog': CLR_WHITE,
};
function monsterGlyph(mon, detected = false) {
    if (!detected && mon.appearGlyph) return { ch: mon.appearGlyph, color: mon.appearColor ?? NO_COLOR, dec: false };
    if (!detected && mon.appearObj != null) return { ch: '(', color: mon.appearColor ?? CLR_BROWN, dec: false };
    if (hallucinatesDisplay()) {
        const monIndex = rn2_on_display_rng(DISPLAY_MONSTER_GLYPHS.length);
        return { ch: DISPLAY_MONSTER_GLYPHS[monIndex] || '?', color: DISPLAY_MONSTER_COLORS[monIndex] ?? CLR_WHITE, dec: false };
    }
    if (mon.pet) return { ch: mon.data?.mlet?.[0] || 'd', color: mon.data?.name === 'pony' ? CLR_BROWN : CLR_WHITE, dec: false };
    if (mon.data?.name === 'guard') return { ch: '@', color: CLR_BLUE, dec: false };
    const color = mon.data?.color ?? MONSTER_COLORS[mon.data?.name] ?? CLR_WHITE;
    if (mon.data?.glyph) return { ch: mon.data.glyph, color, dec: false };
    if (mon.data?.mlet === 'fungus') return { ch: 'F', color, dec: false };
    if (mon.data?.mlet === 'lizard') return { ch: ':', color, dec: false };
    if (mon.data?.mlet === 'zombie') return { ch: 'Z', color, dec: false };
    return { ch: mon.data?.mlet?.[0] || '?', color, dec: false };
}

function objectGlyph(obj) {
    if (hallucinatesDisplay()) {
        if (obj.otyp === STATUE) {
            const monIndex = rn2_on_display_rng(DISPLAY_MONSTER_GLYPHS.length);
            rn2_on_display_rng(2);
            return { ch: DISPLAY_MONSTER_GLYPHS[monIndex] || '?', color: DISPLAY_MONSTER_COLORS[monIndex] ?? CLR_WHITE, dec: false };
        }
        const objectIndex = rn2_on_display_rng(DISPLAY_OBJECT_GLYPHS.length);
        if (objectIndex + FIRST_DISPLAY_OBJECT === C_RANDOM_CORPSE) {
            const monIndex = rn2_on_display_rng(DISPLAY_MONSTER_GLYPHS.length);
            return { ch: '%', color: DISPLAY_MONSTER_COLORS[monIndex] ?? CLR_WHITE, dec: false };
        }
        const objectNumber = objectIndex + FIRST_DISPLAY_OBJECT;
        const color = objectNumber >= C_SPE_DIG && objectNumber < C_SPE_BLANK_PAPER
            ? game._object_descriptions?.spellbookColors?.[objectNumber - C_SPE_DIG] ?? DISPLAY_OBJECT_COLORS[objectIndex]
            : DISPLAY_OBJECT_COLORS[objectIndex];
        return { ch: DISPLAY_OBJECT_GLYPHS[objectIndex] || '?', color: color ?? NO_COLOR, dec: false };
    }
    if (obj.otyp === 'corpse' || obj.otyp === CORPSE) {
        const storedColor = obj.color;
        const fallbackColor = MONSTER_COLORS[obj.corpsenm?.name] ?? NO_COLOR;
        return { ch: '%', color: storedColor == null || storedColor === NO_COLOR ? fallbackColor : storedColor, dec: false };
    }
    const revealPotionColor = obj.dknown;
    if (obj.glyph === '!' && obj._appearance_color != null && revealPotionColor)
        return { ch: '!', color: glyphColor(obj._appearance_color), dec: false };
    if (obj.glyph === '=') return { ch: '=', color: obj.color ?? NO_COLOR, dec: false };
    if (obj.cls === 'spellbook' || obj.glyph === '+')
        return { ch: '+', color: obj.dknown ? obj.color ?? NO_COLOR : NO_COLOR, dec: false };
    if (obj.cls === 'scroll' || obj.glyph === '?') return { ch: '?', color: CLR_WHITE, dec: false };
    if (obj.otyp === GEM_CLASS || obj.cls === 'gem') {
        const color = obj.color === NO_COLOR ? obj._display_color ?? NO_COLOR : obj.color ?? obj._display_color ?? NO_COLOR;
        const dx = (obj.ox ?? 0) - (game.u?.ux ?? 0);
        const dy = (obj.oy ?? 0) - (game.u?.uy ?? 0);
        if (dx * dx + dy * dy <= 6) obj._color_seen = true;
        return { ch: obj.glyph || '*', color: obj._color_seen ? color : NO_COLOR, dec: false };
    }
    if (obj.otyp === 1 && obj.glyph === ')' && obj.color == null)
        return { ch: ')', color: CLR_CYAN, dec: false };
    return { ch: obj.glyph || '?', color: obj.color ?? NO_COLOR, dec: false };
}

export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = glyphColor(color);
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
}

export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    const canSee = !!(game.viz_array?.[y]?.[x] & COULD_SEE);
    const visible = !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
    if (visible) {
        loc.waslit = !!loc.lit;
        loc.lastseentyp = loc.typ;
        loc.lastseendoormask = loc.doormask;
        loc.lastseenwall_info = loc.wall_info;
    }
    const remembered = visible || loc.map_invisible || loc.seenv || loc.waslit || loc.lastseentyp != null;
    const mon = game._revealing_level_map ? undefined : game.u?.blind
        ? game.level?.monsters?.find(candidate =>
            candidate.mx === x && candidate.my === y
            && !candidate.mundetected
            && !candidate._hide_for_bones_prompt)
        : monsterAt(x, y);
    const warningMon = game._revealing_level_map ? undefined : game.level?.monsters?.find(candidate =>
        candidate.mx === x && candidate.my === y);
    let warning = null;
    if (warningMon && game.u?.warning && !warningMon.mpeaceful && !warningMon.pet) {
        const dx = x - (game.u?.ux ?? 0);
        const dy = y - (game.u?.uy ?? 0);
        if (dx * dx + dy * dy < 100) {
            const level = Math.min(def_warnsyms.length - 1, Math.trunc((warningMon.m_lev ?? warningMon.data?.mlevel ?? 0) / 4));
            if (level >= (game._warnlevel ?? 1)) warning = def_warnsyms[level];
        }
    }
    if ((!visible || warningMon?.mundetected) && warning) {
        if (hallucinatesDisplay()) warning = def_warnsyms[rn2_on_display_rng(def_warnsyms.length - 1) + 1];
        show_glyph_cell(x, y, warning.ch, warning.color, false);
        return;
    }
    const obj = objectAt(x, y);
    const hasInfravision = game.u?.infravision || ['dwarven', 'elven', 'gnomish', 'orcish'].includes(game.urace?.adj);
    const heroRange = Math.max(Math.abs(x - (game.u?.ux ?? 0)), Math.abs(y - (game.u?.uy ?? 0)));
    const monsterVisible = visible && !(loc.typ === ROOM && !loc.lit && heroRange > 1);
    const infraredHidden = INFRARED_HIDDEN_MLETS.has(mon?.data?.mlet || mon?.mlet);
    const seesInfrared = mon && canSee && !monsterVisible && !game.u?.blind && hasInfravision
        && !infraredHidden && !mon.data?.mindless && !mon.data?.nonliving && !mon.data?.name?.endsWith(' golem');
    if (game.u?.ux === x && game.u?.uy === y) {
        if (game.u.usteed) {
            const glyph = monsterGlyph(game.u.usteed);
            show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec);
            return;
        }
        if (!game.u.invisible || game.u.seeInvisible || game.u.blind) {
            show_glyph_cell(x, y, game.u._glyph || '@', isRogueLevel() ? NO_COLOR : (game.u._glyphColor ?? CLR_WHITE), false);
            return;
        }
    }
    if (!remembered && !seesInfrared) {
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
        return;
    }

    let visibleObjectGlyph = null;
    if (visible) {
        if (obj) {
            obj.seen = true;
            obj._hide_until_seen = false;
            const dx = x - (game.u?.ux ?? 0);
            const dy = y - (game.u?.uy ?? 0);
            if (dx * dx + dy * dy <= 6) {
                obj.dknown = true;
                recordObservedObjectDiscovery(obj);
            }
            const glyph = objectGlyph(obj);
            visibleObjectGlyph = glyph;
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, dec: glyph.dec };
        } else {
            loc.remembered_glyph = null;
        }
    }
    if (!game.u?.blind && mon && (monsterVisible || seesInfrared)) {
        const glyph = monsterGlyph(mon);
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec, game._hilite_pet && mon.pet ? 1 : 0);
        return;
    }
    if (mon?.appearGlyph && remembered
        && Math.max(Math.abs(x - (game.u?.ux ?? 0)), Math.abs(y - (game.u?.uy ?? 0))) <= 2) {
        const glyph = monsterGlyph(mon);
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec);
        return;
    }
    if (loc.map_invisible) {
        show_glyph_cell(x, y, 'I', NO_COLOR, false);
        return;
    }
    const feltPunishmentObject = game.u?.blind
        && ((obj === game.u?.uball && (game.u?._bcFelt & BC_BALL))
            || (obj === game.u?.uchain && (game.u?._bcFelt & BC_CHAIN)));
    if (obj && (visible || obj.seen || feltPunishmentObject || (obj.otyp === BOULDER && !obj._hide_until_seen))) {
        const glyph = visibleObjectGlyph || objectGlyph(obj);
        const pileAttr = game._hilite_pile
            && (game.level?.objects || []).filter(item => !item.hidden && !item.transientProjectile && item.ox === x && item.oy === y).length > 1
            ? 1 : 0;
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec, pileAttr);
        return;
    }

    if (game.u?.blind && game.u?._bcFeltGlyph?.x === x && game.u._bcFeltGlyph.y === y) {
        const glyph = game.u._bcFeltGlyph;
        show_glyph_cell(x, y, glyph.ch, glyph.color ?? NO_COLOR, false);
        return;
    }

    const region = visible ? visibleRegionAt(x, y) : null;
    if (region?.type === 'gas_cloud') {
        show_glyph_cell(x, y, '#', region.damage ? CLR_GREEN : CLR_GRAY, false);
        return;
    }

    const staleProjectile = game._stale_projectile_marks?.find(mark => mark.x === x && mark.y === y);
    if (staleProjectile) {
        show_glyph_cell(x, y, staleProjectile.ch, staleProjectile.color, false);
        return;
    }

    const engr = engravingAt(x, y);
    if (engr && loc.typ !== GRAVE) {
        show_glyph_cell(x, y, loc.typ === CORR ? '#' : '`', CLR_BRIGHT_BLUE, false);
        return;
    }

    if (!visible && loc.remembered_glyph) {
        const glyph = loc.remembered_glyph;
        const color = glyph.ch === '+' && loc.typ === DOOR ? CLR_BROWN : glyph.color ?? NO_COLOR;
        show_glyph_cell(x, y, glyph.ch, color, glyph.dec);
        return;
    }

    if (trapAt(x, y)) {
        const trap = trapAt(x, y);
        const glyph = trapGlyph(trap);
        show_glyph_cell(x, y, glyph.ch, glyph.color, false);
        return;
    }

    const terrainLoc = !visible && loc.lastseentyp != null
        ? {
            ...loc,
            typ: loc.lastseentyp,
            doormask: loc.lastseendoormask ?? loc.doormask,
            wall_info: loc.lastseenwall_info ?? loc.wall_info,
        }
        : loc;
    const glyph = terrainGlyph(terrainLoc, x, y);
    show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec);
}

export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
}

export function refreshHallucinatedMap(forward = false) {
    if (!hallucinatesDisplay()) return;

    const monsters = game.level?.monsters || [];
    const monsterOrder = monsters.map((_, i) => forward ? i : monsters.length - 1 - i);
    for (const i of monsterOrder) {
        const mon = monsters[i];
        if (mon.dead || mon.mhp <= 0 || mon._hide_for_bones_prompt) continue;
        const x = mon.mx;
        const y = mon.my;
        const visible = !!(game.viz_array?.[y]?.[x] & IN_SIGHT);
        if (visible && monsterAt(x, y) === mon) {
            const glyph = monsterGlyph(mon);
            show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.dec, game._hilite_pet && mon.pet ? 1 : 0);
            continue;
        }
        if (mon.mpeaceful || mon.pet || !game.u?.warning) continue;
        const dx = x - (game.u?.ux ?? 0);
        const dy = y - (game.u?.uy ?? 0);
        if (dx * dx + dy * dy >= 100) continue;
        const level = Math.min(def_warnsyms.length - 1, Math.trunc((mon.m_lev ?? mon.data?.mlevel ?? 0) / 4));
        if (level < (game._warnlevel ?? 1)) continue;
        const warning = def_warnsyms[rn2_on_display_rng(def_warnsyms.length - 1) + 1];
        show_glyph_cell(x, y, warning.ch, warning.color, false);
    }
    if (!game.u?.usteed && game.u?.ux > 0 && (!game.u.invisible || game.u.seeInvisible || game.u.blind))
        show_glyph_cell(game.u.ux, game.u.uy, game.u._glyph || '@',
            isRogueLevel() ? NO_COLOR : (game.u._glyphColor ?? CLR_WHITE), false);

    const objects = game.level?.objects || [];
    const pickup = game._hallu_refresh_after_monster_pickup;
    game._hallu_refresh_after_monster_pickup = null;
    if (pickup) {
        const mon = monsterAt(pickup.x, pickup.y);
        const visible = !!(game.viz_array?.[pickup.y]?.[pickup.x] & IN_SIGHT);
        if (mon && visible) {
            const glyph = monsterGlyph(mon);
            show_glyph_cell(pickup.x, pickup.y, glyph.ch, glyph.color, glyph.dec, game._hilite_pet && mon.pet ? 1 : 0);
        }
    }
    for (let index = 0; index < objects.length; index++) {
        const i = forward ? index : objects.length - 1 - index;
        const obj = objects[i];
        if (obj.hidden || obj.ox == null || obj.oy == null) continue;
        if (objectAt(obj.ox, obj.oy) !== obj) continue;
        const visible = !!(game.viz_array?.[obj.oy]?.[obj.ox] & IN_SIGHT);
        if (!visible || monsterAt(obj.ox, obj.oy)) continue;
        const glyph = objectGlyph(obj);
        show_glyph_cell(obj.ox, obj.oy, glyph.ch, glyph.color, glyph.dec);
    }

    for (const trap of game.level?.traps || []) {
        if (!trap.tseen) continue;
        const visible = !!(game.viz_array?.[trap.ty]?.[trap.tx] & IN_SIGHT);
        if (!visible || monsterAt(trap.tx, trap.ty) || objectAt(trap.tx, trap.ty)) continue;
        const glyph = trapGlyph(trap);
        show_glyph_cell(trap.tx, trap.ty, glyph.ch, glyph.color, false);
    }
}

function drawGrid() {
    const d = display();
    if (!d) return;

    if (game._redraw_level_after_more && game._pending_message && game._message_more) {
        const more = '--More--';
        const inlineMore = !game._message_more_line
            && game._pending_message.length < d.cols - more.length;
        writeText(0, 0, ' '.repeat(d.cols), NO_COLOR);
        writeText(0, 0, game._pending_message, NO_COLOR);
        if (inlineMore) {
            writeText(0, game._pending_message.length, more, NO_COLOR);
            setCursorAfter(0, game._pending_message.length, more);
        } else {
            writeText(1, 0, ' '.repeat(d.cols), NO_COLOR);
            writeText(1, 0, `${game._message_more_line || ''}${more}`, NO_COLOR);
            setCursorAfter(1, 0, `${game._message_more_line || ''}${more}`);
        }
        return;
    }

    d.clearScreen();

    if (game.program_state?.gameover && game._pending_message === 'Be seeing you...') {
        writeText(0, 0, game._pending_message, NO_COLOR);
        d.setCursor(0, 1);
        return;
    }

    if (game._detect_monsters_display) {
        if (game.u?.ux > 0) d.setCell(game.u.ux - 1, game.u.uy + 1, game.u._glyph || '@', game.u._glyphColor ?? CLR_WHITE, 0);
        for (const mon of game.level?.monsters || []) {
            const glyph = monsterGlyph(mon, true);
            d.setCell(mon.mx - 1, mon.my + 1, glyph.ch, glyphColor(glyph.color), glyph.attr || 0);
        }
    } else {
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                let ch = loc?.disp_ch || ' ';
                let color = loc?.disp_color ?? NO_COLOR;
                let attr = loc?.disp_attr ?? 0;
                const visibleTrap = trapAt(x, y);
                if (visibleTrap && ch !== ' ' && !(game.u?.ux === x && game.u?.uy === y) && !monsterAt(x, y) && !objectAt(x, y)) {
                    const glyph = trapGlyph(visibleTrap);
                    ch = glyph.ch;
                    color = glyphColor(glyph.color);
                    attr = 0;
                }
                if ((game.flags?.lit_corridor || loc?._litScrollWhite) && loc?.typ === CORR && ch === '#' && !(game.viz_array?.[y]?.[x] & IN_SIGHT)) color = NO_COLOR;
                const visibleObj = ch === '!' || ch === '*' ? objectAt(x, y) : null;
                if (visibleObj?._appearance_color != null) {
                    const dx = x - (game.u?.ux ?? 0);
                    const dy = y - (game.u?.uy ?? 0);
                    if (dx * dx + dy * dy <= 6) visibleObj.dknown = true;
                }
                const revealPotionColor = visibleObj?.dknown;
                if (visibleObj?._appearance_color != null && revealPotionColor) color = glyphColor(visibleObj._appearance_color);
                if (visibleObj && (visibleObj.glyph === '*' || visibleObj.otyp === GEM_CLASS || visibleObj.cls === 'gem')) {
                    const gemColor = visibleObj.color === NO_COLOR
                        ? visibleObj._display_color ?? NO_COLOR
                        : visibleObj.color ?? visibleObj._display_color ?? NO_COLOR;
                    const dx = x - (game.u?.ux ?? 0);
                    const dy = y - (game.u?.uy ?? 0);
                    if (dx * dx + dy * dy <= 6) visibleObj._color_seen = true;
                    color = visibleObj._color_seen ? gemColor : NO_COLOR;
                }
                if (ch === ' ') continue;
                d.setCell(x - 1, y + 1, ch, color, attr);
            }
        }
        for (const mon of game.level?.monsters || []) {
            if (mon === game.u?.usteed) continue;
            if (!mon.pet || mon.mx !== game.u?.ux || mon.my !== game.u?.uy) continue;
            const track = mon.mtrack?.[0];
            const loc = track && game.level?.at(track.x, track.y);
            if (!loc || !(game.viz_array?.[track.y]?.[track.x] & IN_SIGHT)) continue;
            const glyph = monsterGlyph(mon);
            d.setCell(track.x - 1, track.y + 1, glyph.ch, glyphColor(glyph.color), glyph.attr || 0);
        }
        const stalePet = game._stale_queued_kill_pet;
        if (stalePet?.mon) {
            const glyph = monsterGlyph(stalePet.mon);
            d.setCell(
                stalePet.x - 1,
                stalePet.y + 1,
                glyph.ch,
                glyphColor(glyph.color),
                game._hilite_pet && stalePet.mon.pet ? 1 : 0,
            );
        }
    }

    if (game._transient_beam_cells
        && (game._pending_message || game._message_more || game._queued_message_after_more || game._death_cause)) {
        for (const cell of game._transient_beam_cells)
            d.setCell(cell.x - 1, cell.y + 1, cell.ch, cell.color ?? CLR_ORANGE, cell.attr || 0);
    }

    if (game._terrain_known_only) {
        const spots = [];
        if (game.u?.ux > 0) spots.push([game.u.ux, game.u.uy]);
        for (const mon of game.level?.monsters || []) spots.push([mon.mx, mon.my]);
        for (const obj of game.level?.objects || []) spots.push([obj.ox, obj.oy]);
        for (const trap of game.level?.traps || []) spots.push([trap.tx, trap.ty]);
        const seen = new Set();
        for (const [x, y] of spots) {
            if (!x && !y) continue;
            const key = `${x},${y}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const loc = game.level?.at(x, y);
            if (!loc) continue;
            if (!loc.disp_ch || loc.disp_ch === ' ') continue;
            const glyph = terrainGlyph(loc, x, y);
            d.setCell(x - 1, y + 1, glyph.ch, glyphColor(glyph.color), glyph.attr || 0);
        }
    }

    let cursorSet = false;
    if (game._intro_lines) {
        for (const [row, col, text] of game._intro_lines) {
            const clearCol = Math.min(col, 22);
            writeText(row, clearCol, ' '.repeat(Math.max(0, d.cols - clearCol)), NO_COLOR);
            writeText(row, col, text, NO_COLOR);
        }
        const moreLine = game._intro_lines.find(([, , text]) => String(text).includes('--More--'));
        if (moreLine) {
            setCursorAfter(moreLine[0], moreLine[1], moreLine[2]);
            cursorSet = true;
        }
    } else if (game._tutorial_prompt) {
        const lines = [
            [0, 'Do you want a tutorial?'],
            [2, 'y - Yes, do a tutorial'],
            [3, 'n - No, just start play'],
            [4, ''],
            [5, 'Put "OPTIONS=!tutorial" in .nethackrc to skip this query.'],
            ...(game._tutorial_prompt_invalid ? [[6, "(Please choose 'y' or 'n'.)"], [7, '(end)']] : [[6, '(end)']]),
        ];
        for (const [row, text] of lines) {
            writeText(row, 20, ' '.repeat(Math.max(0, d.cols - 20)), NO_COLOR);
            writeText(row, 21, text, NO_COLOR, row === 0 ? 1 : 0);
        }
        const endLine = lines.find(([row, text]) => row >= 6 && text === '(end)');
        if (endLine) {
            setCursorAfter(endLine[0], 21, endLine[1], 1);
            cursorSet = true;
        }
    } else if (game._overlay_lines) {
        const clearCol = game._overlay_hide_status
            ? 0
            : game._overlay_clear_col ?? Math.min(...game._overlay_lines.map(([, col]) => col));
        for (let row = 0; row < (game._overlay_clear_rows || 0); row++)
            writeText(row, clearCol, ' '.repeat(d.cols - clearCol), NO_COLOR);
        for (const [row, col, text, attr = 0, color = NO_COLOR] of game._overlay_lines) {
            if ((attr & 1) && String(text).startsWith(' ') && String(text) !== ' ') {
                d.setCell(col, row, '', color, attr);
                writeText(row, col + 1, text, color, attr);
                continue;
            }
            writeText(row, col, text, color, attr);
        }
        const moreLine = [...game._overlay_lines].reverse()
            .find(([, , text]) => String(text).includes('--More--'));
        const endLine = [...game._overlay_lines].reverse()
            .find(([, , text]) => String(text).trimEnd().endsWith('(end)'));
        if (game._overlay_cursor) {
            d.setCursor(game._overlay_cursor[0], game._overlay_cursor[1]);
            cursorSet = true;
        } else if (moreLine) {
            const text = String(moreLine[2]);
            const idx = text.indexOf('--More--');
            setCursorAfter(moreLine[0], moreLine[1] + idx, '--More--');
            cursorSet = true;
        } else if (endLine) {
            setCursorAfter(endLine[0], endLine[1], endLine[2], 1);
            cursorSet = true;
        } else if (game._overlay_hide_status) {
            const lastLine = [...game._overlay_lines].reverse()
                .find(([, , text]) => String(text).trimEnd());
            if (lastLine) {
                setCursorAfter(lastLine[0], lastLine[1], lastLine[2]);
                cursorSet = true;
            }
        } else if (game._swallow_overlay_active && game._pending_message && !game._message_more) {
            const pendingMessage = String(game._pending_message || '');
            if (game._command_mode === 'extendedCommand') {
                d.setCursor(2 + String(game._extended_command || '').length, 0);
                cursorSet = true;
            } else if (game._command_mode === 'wizardWish'
                       || game._command_mode === 'wizGenesisMonster'
                       || game._command_mode === 'polyselfMonster'
                       || game._command_mode === 'engraveText'
                       || game._command_mode === 'annotateText'
                       || game._command_mode === 'callPotionText'
                       || game._command_mode === 'callScrollText'
                       || game._command_mode === 'farlookSpecify'
                       || game._command_mode === 'levelTeleportText'
                       || game._command_mode === 'levelChangeText'
                       || game._command_mode === 'vaultGuardName'
                       || pendingMessage.startsWith('Count: ')) {
                if (pendingMessage.startsWith('Count: ')) d.setCursor(pendingMessage.length, 0);
                else {
                    const entry = game._command_mode === 'wizardWish' ? game._wish_text
                        : game._command_mode === 'wizGenesisMonster' ? game._wizgenesis_text
                        : game._command_mode === 'polyselfMonster' ? game._polyself_text
                        : game._command_mode === 'engraveText' ? game._engrave_text
                        : game._command_mode === 'annotateText' ? game._annotate_text
                        : game._command_mode === 'callPotionText' ? game._call_potion_text
                        : game._command_mode === 'callScrollText' ? game._call_scroll_text
                        : game._command_mode === 'farlookSpecify' ? game._farlook_specify
                        : game._command_mode === 'levelTeleportText' ? game._level_teleport_text
                        : game._command_mode === 'levelChangeText' ? game._level_change_text
                        : game._command_mode === 'vaultGuardName' ? game._vault_guard_name
                        : '';
                    d.setCursor(pendingMessage.length + (entry ? 0 : 1), 0);
                }
                cursorSet = true;
            } else if ((game._command_mode && pendingMessage.includes('?'))
                       || /direction:$/i.test(pendingMessage)
                       || game._command_mode === 'readObject'
                       || game._command_mode === 'spellDirection'
                       || game._command_mode === 'throwDirection'
                       || game._command_mode === 'zapDirection'
                       || game._command_mode === 'zapPolymorphDirection') {
                d.setCursor(pendingMessage.trimEnd().length + 1, 0);
                cursorSet = true;
            }
        }
    } else if (game._pending_message && !game._hide_pending_message_once) {
        const more = '--More--';
        const pendingMessage = game._pending_message;
        const pendingMore = game._message_more;
        const inlineMore = pendingMore
            && !game._message_more_line
            && pendingMessage.length < d.cols - more.length;
        const extendedWrap = game._command_mode === 'extendedCommand'
            && !pendingMore
            && pendingMessage.length > d.cols - 1;
        writeText(0, 0, ' '.repeat(d.cols), NO_COLOR);
        if (extendedWrap) {
            writeText(0, 0, pendingMessage.slice(0, d.cols - 1), NO_COLOR);
            writeText(1, 0, ' '.repeat(d.cols), NO_COLOR);
            const continuation = pendingMessage.slice(d.cols - 1, d.cols + 2);
            writeText(1, 0, continuation, NO_COLOR);
            d.setCursor(Math.min(continuation.length, pendingMessage.length - (d.cols - 1)), 1);
            cursorSet = true;
        } else {
            writeText(0, 0, pendingMessage, NO_COLOR);
        }
        if (inlineMore) {
            writeText(0, pendingMessage.length, more, NO_COLOR);
            setCursorAfter(0, pendingMessage.length, more);
            cursorSet = true;
        } else if (pendingMore) {
            writeText(1, 0, ' '.repeat(d.cols), NO_COLOR);
            writeText(1, 0, `${game._message_more_line || ''}${more}`, NO_COLOR);
            setCursorAfter(1, 0, `${game._message_more_line || ''}${more}`);
            cursorSet = true;
        } else if (game._command_mode === 'fountainDetectPos') {
            d.setCursor((game._fountain_detect_x || game.u?.ux || 1) - 1, (game._fountain_detect_y || game.u?.uy || 0) + 1);
            cursorSet = true;
        } else if (game._command_mode === 'farlookCursor'
                   || game._command_mode === 'jumpCursor'
                   || game._command_mode === 'teleportCursor') {
            d.setCursor((game._farlook_x || game.u?.ux || 1) - 1, (game._farlook_y || game.u?.uy || 0) + 1);
            cursorSet = true;
        } else if (game._command_mode === 'travelCursor') {
            d.setCursor((game._farlook_x || game.u?.ux || 1) - 1, (game._farlook_y || game.u?.uy || 0) + 1);
            cursorSet = true;
        } else if (game._command_mode === 'terrainKnownView') {
            d.setCursor((game.u?.ux || 1) - 1, (game.u?.uy || 0) + 1);
            cursorSet = true;
        } else if (game._command_mode === 'extendedCommand' && !extendedWrap) {
            d.setCursor(2 + String(game._extended_command || '').length, 0);
            cursorSet = true;
        } else if (game._command_mode === 'wizardWish'
                   || game._command_mode === 'wizGenesisMonster'
                   || game._command_mode === 'polyselfMonster'
                   || game._command_mode === 'engraveText'
                   || game._command_mode === 'annotateText'
                   || game._command_mode === 'callPotionText'
                   || game._command_mode === 'callScrollText'
                   || game._command_mode === 'farlookSpecify'
                   || game._command_mode === 'levelTeleportText'
                   || game._command_mode === 'levelChangeText'
                   || game._command_mode === 'optionsFruit'
                   || game._command_mode === 'vaultGuardName'
                   || game._pending_message.startsWith('Count: ')) {
            if (game._pending_message.startsWith('Count: ')) d.setCursor(String(game._pending_message || '').length, 0);
            else {
                const entry = game._command_mode === 'wizardWish' ? game._wish_text
                    : game._command_mode === 'wizGenesisMonster' ? game._wizgenesis_text
                    : game._command_mode === 'polyselfMonster' ? game._polyself_text
                    : game._command_mode === 'engraveText' ? game._engrave_text
                    : game._command_mode === 'annotateText' ? game._annotate_text
                    : game._command_mode === 'callPotionText' ? game._call_potion_text
                    : game._command_mode === 'callScrollText' ? game._call_scroll_text
                    : game._command_mode === 'farlookSpecify' ? game._farlook_specify
                    : game._command_mode === 'levelTeleportText' ? game._level_teleport_text
                    : game._command_mode === 'levelChangeText' ? game._level_change_text
                    : game._command_mode === 'optionsFruit' ? game._options_fruit_text
                    : game._command_mode === 'vaultGuardName' ? game._vault_guard_name
                    : '';
                d.setCursor(String(game._pending_message || '').length + (entry ? 0 : 1), 0);
            }
            cursorSet = true;
        } else if ((game._command_mode && game._pending_message.includes('?'))
                   || /direction:$/i.test(game._pending_message)
                   || game._command_mode === 'readObject'
                   || game._command_mode === 'spellDirection'
                   || game._command_mode === 'throwDirection'
                   || game._command_mode === 'zapDirection'
                   || game._command_mode === 'zapPolymorphDirection'
                   || game._command_mode === 'wizardWish') {
            setCursorAfter(0, 0, game._pending_message, 1);
            cursorSet = true;
        }
    }
    if (!cursorSet && game._cursor_override) {
        d.setCursor(game._cursor_override[0], game._cursor_override[1]);
        cursorSet = true;
    }

    if (!game._overlay_hide_status && !game._overlay_hide_status_only) {
        d.renderStatus(game.u);
        if (game._overlay_lines) {
            const clearCol = game._overlay_clear_col ?? Math.min(...game._overlay_lines.map(([, col]) => col));
            for (const row of new Set(game._overlay_lines.filter(([line]) => line >= 22).map(([line]) => line)))
                writeText(row, clearCol, ' '.repeat(d.cols - clearCol), NO_COLOR);
            for (const [row, col, text, attr = 0, color = NO_COLOR] of game._overlay_lines) {
                if (row < 22) continue;
                writeText(row, col, text, color, attr);
            }
        }
        if (!cursorSet && game.u?.ux > 0) {
            d.setCursor(game.u.ux - 1, game.u.uy + 1);
        }
    }
}

export async function flush_screen(_mode) {
    drawGrid();
}

export async function cls() {
    display()?.clearScreen();
    game._pending_message = '';
    game._message_more = 0;
    game._overlay_lines = null;
    game._overlay_hide_status = 0;
    game._overlay_hide_status_only = 0;
}

export async function bot() {}

export async function pline(msg) {
    const text = String(msg || '');
    game._last_pline_message = text;
    game._pending_message = text;
    game._message_more = 0;
    game._overlay_lines = null;
    game._overlay_hide_status = 0;
    game._overlay_hide_status_only = 0;
}
