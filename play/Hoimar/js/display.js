// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee } from './vision.js';
import { rn2Display } from './rng.js';
import { MONSTER_DATA } from './monster_data.js';
import { OBJECT_CLASS } from './object_data.js';
import { getObjectColor } from './o_init.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, SDOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    TREE, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, CLOUD,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    LANDMINE, SLP_GAS_TRAP, HOLE, TRAPDOOR, MAGIC_PORTAL, MAGIC_TRAP, ANTI_MAGIC,
    M_AP_OBJECT, IS_POOL, IS_WALL,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, WM_MASK,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    WARNCOUNT, def_warnsyms, Is_rogue_level,
} from './const.js';
import { depth, distmin, dist2 } from './hacklib.js';
import {
    NO_COLOR, CLR_BLACK, CLR_BLUE, CLR_GREEN, CLR_GRAY, CLR_BROWN, CLR_RED,
    CLR_WHITE, CLR_ORANGE, CLR_YELLOW, CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA,
    ATR_INVERSE, ATR_BOLD, ATR_UNDERLINE, DEC_TO_UNICODE,
} from './terminal.js';
import { roleRankForLevel } from './roles.js';

// ── ANSI color codes ──
// Maps CLR_* constants (0-15) to ANSI SGR color codes.
// C ref: wintty.c term_start_color
const ANSI_DEFAULT = 39;
const ANSI_COLOR = [
    90,  // CLR_BLACK     0 (tty wc2_darkgray)
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
const COLOR_BY_ANSI = new Map(ANSI_COLOR.map((ansi, color) => [ansi, color]));

const POTION_CLASS = 8;
const SPBOOK_CLASS = 10;
const GEM_CLASS = 13;
const FIRST_OBJECT = 18;
const NUM_OBJECTS = OBJECT_CLASS.length - 1;
const FIRST_REAL_GEM = 439;
const LAST_GLASS_GEM = 469;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const CORPSE = 265;
const STATUE = 476;

const GENERIC_OBJECT_GLYPH = {
    [POTION_CLASS]: { ch: '!', color: CLR_GRAY },
    [SPBOOK_CLASS]: { ch: '+', color: CLR_GRAY },
    [GEM_CLASS]: { ch: '*', color: CLR_GRAY },
};

const OBJECT_CLASS_CHARS = {
    1: ']',
    2: ')',
    3: '[',
    4: '=',
    5: '"',
    6: '(',
    7: '%',
    8: '!',
    9: '?',
    10: '+',
    11: '/',
    12: '$',
    13: '*',
    14: '`',
    15: '0',
    16: '_',
    17: '.',
};

const ROGUE_OBJECT_CLASS_CHARS = {
    ...OBJECT_CLASS_CHARS,
    3: ']',
    5: ',',
    7: ':',
    12: '*',
};

const MONSTER_SYMBOLS = {
    S_ANT: 'a', S_BLOB: 'b', S_COCKATRICE: 'c', S_DOG: 'd',
    S_EYE: 'e', S_FELINE: 'f', S_GREMLIN: 'g', S_HUMANOID: 'h',
    S_IMP: 'i', S_JELLY: 'j', S_KOBOLD: 'k', S_LEPRECHAUN: 'l',
    S_MIMIC: 'm', S_NYMPH: 'n', S_ORC: 'o', S_PIERCER: 'p',
    S_QUADRUPED: 'q', S_RODENT: 'r', S_SPIDER: 's', S_TRAPPER: 't',
    S_UNICORN: 'u', S_VORTEX: 'v', S_WORM: 'w', S_XAN: 'x',
    S_LIGHT: 'y', S_ZRUTY: 'z', S_ANGEL: 'A', S_BAT: 'B',
    S_CENTAUR: 'C', S_DRAGON: 'D', S_ELEMENTAL: 'E', S_FUNGUS: 'F',
    S_GNOME: 'G', S_GIANT: 'H', S_JABBERWOCK: 'J', S_KOP: 'K',
    S_LICH: 'L', S_MUMMY: 'M', S_NAGA: 'N', S_OGRE: 'O',
    S_PUDDING: 'P', S_QUANTMECH: 'Q', S_RUSTMONST: 'R', S_SNAKE: 'S',
    S_TROLL: 'T', S_UMBER: 'U', S_VAMPIRE: 'V', S_WRAITH: 'W',
    S_XORN: 'X', S_YETI: 'Y', S_ZOMBIE: 'Z', S_GOLEM: '\'',
    S_HUMAN: '@', S_GHOST: ' ', S_DEMON: '&', S_EEL: ';',
    S_LIZARD: ':', S_WORM_TAIL: '~',
};

function tty_color(color) {
    return color === CLR_GRAY || color === CLR_BLACK ? NO_COLOR : color;
}

function rogue_level_display() {
    return Is_rogue_level(game.u?.uz);
}

function hell_level_display() {
    const uz = game.u?.uz;
    return !!game.dungeons?.[uz?.dnum ?? 0]?.flags?.hellish;
}

function object_class_char(oclass) {
    const table = rogue_level_display() ? ROGUE_OBJECT_CLASS_CHARS : OBJECT_CLASS_CHARS;
    return table[oclass] || '?';
}

function obj_is_generic(obj) {
    if (!obj || obj.dknown) return false;
    const otyp = obj.otyp ?? -1;
    return obj.oclass === POTION_CLASS
        || (otyp >= FIRST_REAL_GEM && otyp <= LAST_GLASS_GEM)
        || (otyp >= FIRST_SPELL && otyp <= LAST_SPELL);
}

function observe_object(obj) {
    if (!obj) return;
    obj.dknown = true;
    if (typeof obj.otyp === 'number') {
        const encountered = game.encounteredObjects || (game.encounteredObjects = new Set());
        if (typeof encountered.add === 'function') encountered.add(obj.otyp);
    }
}

function hallucinated_statue_glyph() {
    // C ref: display.h:statue_to_glyph() consumes random_monster() and rng(2).
    const mdat = MONSTER_DATA[rn2Display(MONSTER_DATA.length)] || null;
    rn2Display(2);
    if (!mdat) return { ch: '?', color: NO_COLOR };
    return {
        ch: MONSTER_SYMBOLS[mdat[1]] ?? 'm',
        color: mdat[7] ?? NO_COLOR,
    };
}

function random_object_glyph_for_display() {
    // C ref: display.h:random_obj_to_glyph().
    const otyp = rn2Display(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT;
    if (otyp === CORPSE) {
        const mdat = MONSTER_DATA[rn2Display(MONSTER_DATA.length)] || null;
        return { ch: '%', color: mdat?.[7] ?? NO_COLOR };
    }
    const oclass = OBJECT_CLASS[otyp];
    return {
        ch: object_class_char(oclass),
        color: getObjectColor(otyp) ?? NO_COLOR,
    };
}

function monster_data_for_corpsenm(corpsenm) {
    if (Number.isInteger(corpsenm)) return MONSTER_DATA[corpsenm] || null;
    if (typeof corpsenm === 'string') return MONSTER_DATA.find(m => m[0] === corpsenm) || null;
    if (corpsenm && typeof corpsenm === 'object') {
        return MONSTER_DATA.find(m => m[0] === corpsenm.name)
            || [corpsenm.name, corpsenm.mlet, 0, 0, 0, 0, 0, corpsenm.color ?? NO_COLOR];
    }
    return null;
}

function object_glyph_for_display(obj, x, y, visible) {
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) {
        if (obj?.otyp === STATUE) return hallucinated_statue_glyph();
        return random_object_glyph_for_display();
    }
    if (obj?.otyp === STATUE) {
        const mdat = monster_data_for_corpsenm(obj.corpsenm);
        if (mdat) {
            return {
                ch: MONSTER_SYMBOLS[mdat[1]] ?? (obj.ch || '?'),
                color: obj.color ?? getObjectColor(STATUE) ?? NO_COLOR,
            };
        }
    }

    let generic = obj_is_generic(obj);
    if (generic && visible && !game.u?.uhallucination) {
        const r = Math.max(game.u?.xray_range || 0, 2);
        const neardist = (r * r) * 2 - r;
        if (dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0) <= neardist) {
            observe_object(obj);
            generic = false;
        }
    }

    if (generic) {
        return GENERIC_OBJECT_GLYPH[obj.oclass] || { ch: obj.ch || '?', color: obj.color ?? NO_COLOR };
    }
    return { ch: obj.ch || '?', color: obj.color ?? NO_COLOR };
}

function is_known_branch_stair(x, y) {
    const currentDnum = game.u?.uz?.dnum ?? 0;
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y && st.isbranch
            && st.u_traversed && st.tolev?.dnum !== currentDnum) return true;
    return false;
}

// ── Terrain to display character + color + DEC flag ──
function terrain_glyph(loc, x, y) {
    const typ = display_wall_type(loc);
    if (rogue_level_display()) {
        switch (typ) {
        case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
        case ROOM:      return { ch: '.', color: NO_COLOR, dec: false };
        case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
        case DOOR:      return { ch: '+', color: NO_COLOR, dec: false };
        case SDOOR:     return loc.horizontal
            ? { ch: '-', color: NO_COLOR, dec: false }
            : { ch: '|', color: NO_COLOR, dec: false };
        case STAIRS:    return { ch: '%', color: NO_COLOR, dec: false };
        case HWALL:
        case TLCORNER:
        case TRCORNER:
        case BLCORNER:
        case BRCORNER:
        case CROSSWALL:
        case TUWALL:
        case TDWALL:
            return { ch: '-', color: NO_COLOR, dec: false };
        case VWALL:
        case TLWALL:
        case TRWALL:
            return { ch: '|', color: NO_COLOR, dec: false };
        case FOUNTAIN:  return { ch: '{', color: NO_COLOR, dec: false };
        case SINK:      return { ch: '#', color: NO_COLOR, dec: false };
        case ALTAR:     return { ch: '_', color: NO_COLOR, dec: false };
        case GRAVE:     return { ch: '|', color: NO_COLOR, dec: false };
        case TREE:      return { ch: '#', color: NO_COLOR, dec: false };
        case POOL:
        case MOAT:
        case WATER:
        case LAVAPOOL:
        case LAVAWALL:
            return { ch: '`', color: NO_COLOR, dec: false };
        default:        return { ch: '?', color: NO_COLOR, dec: false };
        }
    }
    const wallColor = (game.level?.flags?.red_walls || hell_level_display())
        ? CLR_RED
        : game.level?.flags?.sokoban_rules ? CLR_BLUE
            : game.level?.flags?.mines_walls ? CLR_BROWN : NO_COLOR;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    case CORR:      return { ch: '#', color: NO_COLOR, dec: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) {
            return loc.horizontal
                ? { ch: '|', color: CLR_BROWN, dec: false }
                : { ch: 'a', color: CLR_BROWN, dec: true };
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // D_NODOOR = floor
    case SDOOR:
        // C ref: display.c:wall_angle().  Undiscovered secret doors render
        // as their underlying wall orientation until they are revealed.
        return secret_door_horizontal(loc, x, y)
            ? { ch: 'q', color: wallColor, dec: true }
            : { ch: 'x', color: wallColor, dec: true };
    case STAIRS:
        {
            const color = is_known_branch_stair(x, y) ? CLR_YELLOW : CLR_GRAY;
            if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
                return { ch: '<', color, dec: false };
            return { ch: '>', color, dec: false };
        }
    // Wall types → DEC line-drawing characters
    case HWALL:     return { ch: 'q', color: wallColor, dec: true };  // ─
    case VWALL:     return { ch: 'x', color: wallColor, dec: true };  // │
    case TLCORNER:  return { ch: 'l', color: wallColor, dec: true };  // ┌
    case TRCORNER:  return { ch: 'k', color: wallColor, dec: true };  // ┐
    case BLCORNER:  return { ch: 'm', color: wallColor, dec: true };  // └
    case BRCORNER:  return { ch: 'j', color: wallColor, dec: true };  // ┘
    case CROSSWALL: return { ch: 'n', color: wallColor, dec: true };  // ┼
    case TUWALL:    return { ch: 'v', color: wallColor, dec: true };  // ┴
    case TDWALL:    return { ch: 'w', color: wallColor, dec: true };  // ┬
    case TLWALL:    return { ch: 'u', color: wallColor, dec: true };  // ┤
    case TRWALL:    return { ch: 't', color: wallColor, dec: true };  // ├
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case SINK:      return { ch: '#', color: CLR_GRAY, dec: false };
    case ALTAR:     return { ch: '_', color: CLR_GRAY, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_GRAY, dec: false };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
    case TREE:      return { ch: 'g', color: CLR_GREEN, dec: false };
    case POOL:
    case MOAT:
        // C ref: display.c:back_to_glyph() S_pool.  The tty DECgraphics wire
        // glyph for liquid surfaces is the backtick diamond byte.
        return { ch: '`', color: CLR_BLUE, dec: false };
    case WATER:
        return { ch: '`', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL:
        return { ch: '`', color: CLR_RED, dec: false };
    case LAVAWALL:
        return { ch: '`', color: CLR_ORANGE, dec: false };
    case CLOUD:
        // C ref: include/defsym.h:S_cloud.
        return { ch: '#', color: CLR_GRAY, dec: false };
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

function display_wall_type(loc) {
    // C ref: display.c:wall_angle(). For wallification glyphs, NetHack
    // derives the visible wall character from terrain type plus seenv.
    const seenv = (loc.seenv || 0) & 0xff;
    if (!seenv || (((loc.wall_info || 0) & WM_MASK) && loc.typ !== CROSSWALL)) return loc.typ;
    let rotated = seenv;
    let row = null;
    switch (loc.typ) {
    case CROSSWALL:
        return display_crosswall_type(loc, seenv);
    case TDWALL:
        row = [STONE, TLCORNER, TRCORNER, HWALL, TDWALL];
        break;
    case TLWALL:
        rotated = ((seenv >> 2) | (seenv << 6)) & 0xff;
        row = [STONE, TRCORNER, BRCORNER, VWALL, TLWALL];
        break;
    case TUWALL:
        rotated = ((seenv >> 4) | (seenv << 4)) & 0xff;
        row = [STONE, BRCORNER, BLCORNER, HWALL, TUWALL];
        break;
    case TRWALL:
        rotated = ((seenv >> 6) | (seenv << 2)) & 0xff;
        row = [STONE, BLCORNER, TLCORNER, VWALL, TRWALL];
        break;
    default:
        return loc.typ;
    }

    let col = 0;
    if (rotated === SV4) col = 1;
    else if (rotated === SV6) col = 2;
    else if ((rotated & (SV3 | SV5 | SV7)) || ((rotated & SV4) && (rotated & SV6))) col = 4;
    else if (rotated & (SV0 | SV1 | SV2)) col = (rotated & (SV4 | SV6)) ? 4 : 3;
    return row[col];
}

function onlySeenv(seenv, bits) {
    return !!((seenv & bits) && !(seenv & ~bits));
}

function display_crosswall_type(loc, seenv) {
    // C ref: display.c:wall_angle(), CROSSWALL case.
    const mode = (loc.wall_info || 0) & WM_MASK;
    switch (mode) {
    case 0:
        if (seenv === SV0) return BRCORNER;
        if (seenv === SV2) return BLCORNER;
        if (seenv === SV4) return TLCORNER;
        if (seenv === SV6) return TRCORNER;
        if (!(seenv & ~(SV0 | SV1 | SV2)) && ((seenv & SV1) || seenv === (SV0 | SV2)))
            return TUWALL;
        if (!(seenv & ~(SV2 | SV3 | SV4)) && ((seenv & SV3) || seenv === (SV2 | SV4)))
            return TRWALL;
        if (!(seenv & ~(SV4 | SV5 | SV6)) && ((seenv & SV5) || seenv === (SV4 | SV6)))
            return TDWALL;
        if (!(seenv & ~(SV0 | SV6 | SV7)) && ((seenv & SV7) || seenv === (SV0 | SV6)))
            return TLWALL;
        return CROSSWALL;
    case WM_X_TL:
    case WM_X_TR:
    case WM_X_BL:
    case WM_X_BR: {
        const crossMatrix = [
            [BRCORNER, BLCORNER, TLCORNER, TUWALL, TRWALL, CROSSWALL],
            [BLCORNER, TLCORNER, TRCORNER, TRWALL, TDWALL, CROSSWALL],
            [TLCORNER, TRCORNER, BRCORNER, TDWALL, TLWALL, CROSSWALL],
            [TRCORNER, BRCORNER, BLCORNER, TLWALL, TUWALL, CROSSWALL],
        ];
        let rowIdx = 0;
        let rotated = seenv;
        if (mode === WM_X_TL) {
            rowIdx = 1;
            rotated = ((seenv >> 4) | (seenv << 4)) & 0xff;
        } else if (mode === WM_X_TR) {
            rowIdx = 2;
            rotated = ((seenv >> 6) | (seenv << 2)) & 0xff;
        } else if (mode === WM_X_BL) {
            rowIdx = 0;
            rotated = ((seenv >> 2) | (seenv << 6)) & 0xff;
        } else {
            rowIdx = 3;
        }
        if (rotated === SV4) return STONE;
        rotated &= ~SV4;
        let col = 5; // C_crwall
        if (rotated === SV0) col = 1;
        else if (rotated & (SV2 | SV3)) {
            if (rotated & (SV5 | SV6 | SV7)) col = 5;
            else if (rotated & (SV0 | SV1)) col = 4;
            else col = 2;
        } else if (rotated & (SV5 | SV6)) {
            if (rotated & (SV1 | SV2 | SV3)) col = 5;
            else if (rotated & (SV0 | SV7)) col = 3;
            else col = 0;
        } else if (rotated & SV1) col = (rotated & SV7) ? 5 : 4;
        else if (rotated & SV7) col = (rotated & SV1) ? 5 : 3;
        return crossMatrix[rowIdx][col];
    }
    case WM_X_TLBR:
        if (onlySeenv(seenv, SV1 | SV2 | SV3)) return BLCORNER;
        if (onlySeenv(seenv, SV5 | SV6 | SV7)) return TRCORNER;
        if (onlySeenv(seenv, SV0 | SV4)) return STONE;
        return CROSSWALL;
    case WM_X_BLTR:
        if (onlySeenv(seenv, SV0 | SV1 | SV7)) return BRCORNER;
        if (onlySeenv(seenv, SV3 | SV4 | SV5)) return TLCORNER;
        if (onlySeenv(seenv, SV2 | SV6)) return STONE;
        return CROSSWALL;
    default:
        return STONE;
    }
}

function secret_door_horizontal(loc, x, y) {
    if (loc.horizontal) return true;
    const wallish = (spot) => spot && (IS_WALL(spot.typ) || spot.typ === SDOOR);
    const leftRight = wallish(game.level?.at(x - 1, y)) && wallish(game.level?.at(x + 1, y));
    const upDown = wallish(game.level?.at(x, y - 1)) && wallish(game.level?.at(x, y + 1));
    if (leftRight && !upDown) return true;
    if (upDown && !leftRight) return false;
    return !!loc.horizontal;
}

function trap_glyph(trap) {
    if (!trap) return null;
    let color = CLR_GRAY;
    if (trap.ttyp === HOLE || trap.ttyp === TRAPDOOR) color = CLR_BROWN;
    else if (trap.ttyp === LANDMINE) color = CLR_RED;
    else if (trap.ttyp === SLP_GAS_TRAP || trap.ttyp === ANTI_MAGIC) color = CLR_BRIGHT_BLUE;
    else if (trap.ttyp === MAGIC_PORTAL || trap.ttyp === MAGIC_TRAP) color = CLR_BRIGHT_MAGENTA;
    return { ch: '^', color, dec: false };
}

function monster_glyph(mon) {
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) {
        // C ref: display.h:mon_to_glyph() -> what_mon(..., rn2_on_display_rng).
        const mdat = MONSTER_DATA[rn2Display(MONSTER_DATA.length)] || null;
        if (mdat) {
            return {
                ch: MONSTER_SYMBOLS[mdat[1]] ?? 'm',
                color: mdat[7] ?? NO_COLOR,
                dec: false,
            };
        }
    }
    if (mon?.m_ap_type === M_AP_OBJECT) {
        const otyp = mon.mappearance;
        const oclass = OBJECT_CLASS[otyp];
        return {
            ch: object_class_char(oclass),
            color: getObjectColor(otyp) ?? NO_COLOR,
            dec: false,
        };
    }
    return { ch: mon.ch, color: mon.color, dec: false };
}

function monster_visible(mon) {
    // C ref: display.h:_mon_visible().  newsym() only draws a monster in
    // physical sight when it is not an undetected hider and not unseen
    // invisible.
    if (!mon || mon.mundetected) return false;
    if (mon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) return false;
    return true;
}

function warning_glyph(mon) {
    // C ref: display.h:_mon_warning(), display.c:warning_of() and
    // display_warning(). Warning floats over unseen hostile monsters.
    if (!game.u?.uprops?.warning || mon?.mpeaceful) return null;
    if (dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) >= 100) return null;
    const realLevel = Math.trunc((mon.m_lev ?? mon.data?.mlevel ?? 0) / 4);
    if (realLevel < (game.context?.warnlevel ?? 1)) return null;
    let level;
    if ((game.u?.uprops?.hallucination || game.u?.uhallucination)
        && (game._hallucination_warning_rng_active || game._monster_move_warning_rng_active)) {
        level = rn2Display(WARNCOUNT - 1) + 1;
    } else {
        level = realLevel;
    }
    return def_warnsyms[Math.min(WARNCOUNT - 1, Math.max(0, level))] || null;
}

export function refresh_warning_monsters() {
    if (!game.u?.uprops?.warning) return;
    for (const mon of game.level?.monsters || []) newsym(mon.mx, mon.my);
}

export function see_monsters() {
    for (const mon of game.level?.monsters || []) {
        if (mon.dead || mon.mhp <= 0) continue;
        newsym(mon.mx, mon.my);
    }
    if (game.u?.ux > 0) newsym(game.u.ux, game.u.uy);
}

export function see_objects() {
    const seen = new Set();
    for (const obj of game.level?.objects || []) {
        const key = `${obj.ox},${obj.oy}`;
        if (seen.has(key)) continue;
        seen.add(key);
        newsym(obj.ox, obj.oy);
    }
}

export function see_traps() {
    for (const trap of game.level?.traps || []) {
        const loc = game.level?.at(trap.tx, trap.ty);
        if (!trap.tseen || loc?.disp_ch !== '^') continue;
        newsym(trap.tx, trap.ty);
    }
}

function show_premapped_mimics() {
    if (!game.level?.flags?.premapped) return;
    for (const mon of game.level.monsters || []) {
        if (mon.m_ap_type !== M_AP_OBJECT) continue;
        const loc = game.level.at(mon.mx, mon.my);
        if (!loc?.lit || distmin(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) > 2) continue;
        const mg = monster_glyph(mon);
        loc.remembered_glyph = { ch: mg.ch, color: mg.color, decgfx: mg.dec };
        show_glyph_cell(mon.mx, mon.my, mg.ch, mg.color, mg.dec);
    }
}

function terrain_covers_objects(loc) {
    // C ref: display.h:covers_objects(). Pools cover objects unless the hero
    // is underwater; lava always covers objects and traps.
    const underwater = !!(game.u?.uprops?.underwater || game.u?.underwater || game.Underwater);
    return ((IS_POOL(loc.typ) && !underwater) || loc.typ === LAVAPOOL || loc.typ === LAVAWALL);
}

export function map_level_for_wizard() {
    // C refs: wizcmds.c:wiz_map(), detect.c:do_mapping().
    if (!game.level) return;
    const savedHallucination = game.u?.uprops?.hallucination;
    const savedUHallucination = game.u?.uhallucination;
    if (game.u?.uprops) game.u.uprops.hallucination = 0;
    if (game.u) game.u.uhallucination = 0;

    for (const trap of game.level.traps || []) trap.tseen = true;

    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (!loc) continue;
            if (IS_WALL(loc.typ) || loc.typ === SDOOR) loc.seenv = 0xff;
            loc.waslit = true;
            const trap = (game.level.traps || []).find(t => t.tx === x && t.ty === y);
            const covered = terrain_covers_objects(loc);
            let glyph = terrain_glyph(loc, x, y);
            if (trap?.tseen && !covered) glyph = trap_glyph(trap);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx: !!glyph.dec };
            show_glyph_cell(x, y, glyph.ch, glyph.color, !!glyph.dec);
        }
    }
    see_monsters();

    if (game.u?.uprops) game.u.uprops.hallucination = savedHallucination;
    if (game.u) game.u.uhallucination = savedUHallucination;
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = rogue_level_display() ? NO_COLOR : tty_color(color);
    loc.disp_decgfx = rogue_level_display() ? false : !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

const SWALLOW_CHARS = [
    ['/', 'o', '\\'],
    ['│', '@', '│'],
    ['\\', 's', '/'],
];

function swallowed_overlay_key() {
    if (!game._swallowed_map_active || !game.u?.ustuck) return null;
    return `${game.u.ux},${game.u.uy}`;
}

function current_swallowed_overlay() {
    return game._swallowed_latched_overlay || build_swallowed_overlay();
}

function build_swallowed_overlay() {
    const key = swallowed_overlay_key();
    if (!key) return null;
    if (game._swallowed_overlay?.key === key) return game._swallowed_overlay;

    const ux = game.u.ux;
    const uy = game.u.uy;
    const overlay = new Map();

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const x = ux + dx;
            const y = uy + dy;
            if (x < 1 || x >= COLNO || y < 0 || y >= ROWNO) continue;
            const ch = SWALLOW_CHARS[dy + 1][dx + 1];
            if (ch === '@') {
                overlay.set(`${x},${y}`, { ch, color: CLR_WHITE });
                continue;
            }
            let color = game.u.ustuck.data?.color ?? CLR_GREEN;
            if (game.u?.uhallucination || game.u?.uprops?.hallucination) {
                const mdat = MONSTER_DATA[rn2Display(MONSTER_DATA.length)] || null;
                color = mdat ? (mdat[7] ?? NO_COLOR) : color;
            }
            overlay.set(`${x},${y}`, { ch, color });
        }
    }

    game._swallowed_overlay = { key, cells: overlay };
    return game._swallowed_overlay;
}

export function refresh_swallowed_overlay() {
    game._swallowed_overlay = null;
    return build_swallowed_overlay();
}

export function apply_hallucination_display_transition(wasHallucinating, isHallucinating) {
    if (wasHallucinating === isHallucinating) return;
    if (!game.u?.uswallow || !game._swallowed_map_active || !game.u?.ustuck) {
        game._swallowed_overlay = null;
        return;
    }
    // C ref: potion.c:make_hallucinated() -> swallowed(0).
    // Use a fresh swallowed overlay so swallowed display RNG is consumed on
    // the same visual edge as the C path.
    game._swallowed_overlay = null;
    build_swallowed_overlay();
}

function swallowed_glyph_at(x, y) {
    const overlay = current_swallowed_overlay();
    if (!overlay) return null;
    return overlay.cells.get(`${x},${y}`) || null;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    // C ref: display.c:newsym(). While swallowed, ordinary map newsym()
    // calls do not redraw external monsters/objects/traps; swallowed()
    // owns the visible 3x3 stomach display.
    if (game.u?.uswallow) {
        if (game.u?.ux === x && game.u?.uy === y)
            show_glyph_cell(x, y, '@', CLR_WHITE, false);
        return;
    }

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    const mon = game.level?.monsters?.find(m => m.mx === x && m.my === y);
    const visible = cansee(x, y);

    if (!visible) {
        const wg = mon ? warning_glyph(mon) : null;
        if (wg) {
            show_glyph_cell(x, y, wg.ch, wg.color, false);
        } else if (loc.remembered_glyph) {
            // Out of sight but remembered - show remembered glyph.
            show_glyph_cell(x, y, loc.remembered_glyph.ch,
                loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
        } else {
            show_glyph_cell(x, y, ' ', NO_COLOR, false);
        }
        return;
    }

    // Contestants: add monster, object, and trap display here.
    let tg = terrain_glyph(loc, x, y);

    const trap = game.level?.traps?.find(t => t.tx === x && t.ty === y);
    const obj = game.level?.objects?.find(o => o.ox === x && o.oy === y);
    const covered = terrain_covers_objects(loc);

    let draw_ch = tg.ch;
    let draw_color = tg.color;
    let draw_dec = tg.dec;

    if (trap?.tseen && !covered) {
        const tr = trap_glyph(trap);
        draw_ch = tr.ch; draw_color = tr.color; draw_dec = tr.dec;
    }
    if (obj && !covered) {
        const og = object_glyph_for_display(obj, x, y, visible);
        draw_ch = og.ch; draw_color = og.color; draw_dec = false;
    }
    let memory_ch = draw_ch;
    let memory_color = draw_color;
    let memory_dec = draw_dec;
    if (obj && !covered && obj.otyp === STATUE
        && (game.u?.uprops?.hallucination || game.u?.uhallucination)) {
        // C ref: display.c:map_object(). Hallucinated statues are shown as
        // random monsters but remembered as separate random objects.
        const mem = random_object_glyph_for_display();
        memory_ch = mem.ch; memory_color = mem.color; memory_dec = false;
    }
    if (monster_visible(mon)) {
        const mg = monster_glyph(mon);
        draw_ch = mg.ch; draw_color = mg.color; draw_dec = mg.dec;
    } else if (mon) {
        const wg = warning_glyph(mon);
        if (wg) {
            draw_ch = wg.ch; draw_color = wg.color; draw_dec = false;
        }
    }

    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    show_glyph_cell(x, y, draw_ch, draw_color, draw_dec);
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = { ch: memory_ch, color: memory_color, decgfx: memory_dec };
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
    see_monsters();
    show_premapped_mimics();
    if (game.u?.ux > 0) show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    if (game._swallowed_map_active || game._swallowed_latched_overlay) {
        const overlay = current_swallowed_overlay();
        if (!overlay) return '';
        const [ux, uy] = overlay.key.split(',').map((v) => Number.parseInt(v, 10));
        if (y < uy - 1 || y > uy + 1) return '';
        const firstCol = Math.max(1, ux - 1);
        const lastCol = Math.min(COLNO - 1, ux + 1);
        let output = '';
        const gap = firstCol - 1;
        if (gap > 4) output += `\x1b[${gap}C`;
        else if (gap > 0) output += ' '.repeat(gap);
        let activeColor = ANSI_DEFAULT;
        for (let x = firstCol; x <= lastCol; x++) {
            const sg = swallowed_glyph_at(x, y) || { ch: ' ', color: NO_COLOR };
            const wantAnsi = ANSI_COLOR[sg.color] ?? ANSI_DEFAULT;
            if (wantAnsi !== activeColor) {
                output += `\x1b[${wantAnsi}m`;
                activeColor = wantAnsi;
            }
            output += sg.ch;
        }
        if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
        return output;
    }
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
    const name = game.plname || 'Hero';
    const role = roleRankForLevel(game.urole, u.ulevel || 1, !!game.flags?.female)
        || (game.flags?.female
            ? (game.urole?.rank?.f || game.urole?.name?.f || game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer')
            : (game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer'));
    const title = `${name} the ${role}`;
    const attrs = u.acurr?.a || [];
    const stats = `St:${attrs[0] || '?'} Dx:${attrs[3] || '?'} Co:${attrs[4] || '?'} In:${attrs[1] || '?'} Wi:${attrs[2] || '?'} Ch:${attrs[5] || '?'}`;
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
    const xp = game.flags?.showexp
        ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
        : `Xp:${u.ulevel || 1}`;
    const turn = game.flags?.time ? ` T:${game.moves || 1}` : '';
    const conditions = [];
    if (u.uprops?.hallucination || u.uhallucination) conditions.push('Hallu');
    const conditionText = conditions.length ? ` ${conditions.join(' ')}` : '';
    const hp = game._latched_status_uhp != null && (game._more || game._death_prompt_active)
        ? game._latched_status_uhp
        : (u.uhp || 0);
    const goldSymbol = rogue_level_display() ? '*' : '$';
    // C ref: botl.c:describe_level().
    const levelDesc = game.quest_dnum != null && u.uz?.dnum === game.quest_dnum
        ? `Home ${u.uz?.dlevel || 1}`
        : `Dlvl:${depth(u.uz)}`;
    return `${levelDesc} ${goldSymbol}:${game._goldCount || 0} HP:${hp}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${xp}${turn}${conditionText}`;
}

// ── Serialize terminal grid for screen comparison ──
export function serialize_terminal_grid(display) {
    const term = display?.terminal || display;
    if (term?.serialize) return term.serialize();
    return '';
}

function applySgr(params, state) {
    const values = params.length ? params : [0];
    for (const value of values) {
        if (value === 0) {
            state.color = NO_COLOR;
            state.attr = 0;
        } else if (value === 1) {
            state.attr |= ATR_BOLD;
        } else if (value === 22) {
            state.attr &= ~ATR_BOLD;
        } else if (value === 4) {
            state.attr |= ATR_UNDERLINE;
        } else if (value === 24) {
            state.attr &= ~ATR_UNDERLINE;
        } else if (value === 7) {
            state.attr |= ATR_INVERSE;
        } else if (value === 27) {
            state.attr &= ~ATR_INVERSE;
        } else if (value === 39) {
            state.color = NO_COLOR;
        } else if (COLOR_BY_ANSI.has(value)) {
            state.color = COLOR_BY_ANSI.get(value);
        }
    }
}

function renderOverrideScreen(display, screen) {
    if (display.clearScreen) display.clearScreen();
    const state = { row: 0, col: 0, color: NO_COLOR, attr: 0, dec: false };
    const text = String(screen || '');

    for (let i = 0; i < text.length && state.row < 24; i++) {
        const ch = text[i];
        if (ch === '\n') {
            state.row++;
            state.col = 0;
            continue;
        }
        if (ch === '\x0e') {
            state.dec = true;
            continue;
        }
        if (ch === '\x0f') {
            state.dec = false;
            continue;
        }
        if (ch === '\x1b' && text[i + 1] === '[') {
            let j = i + 2;
            while (j < text.length) {
                const code = text.charCodeAt(j);
                if (code >= 0x40 && code <= 0x7e) break;
                j++;
            }
            const final = text[j];
            const body = text.slice(i + 2, j);
            if (final === 'C') {
                state.col += Number.parseInt(body || '1', 10) || 1;
            } else if (final === 'm') {
                applySgr(body.split(';').filter(Boolean).map((v) => Number.parseInt(v, 10)), state);
            }
            i = j;
            continue;
        }

        if (state.col < 80) {
            display.setCell(
                state.col,
                state.row,
                state.dec ? (DEC_TO_UNICODE[ch] || ch) : ch,
                state.color,
                state.attr,
            );
        }
        state.col++;
    }

    const cursor = game._override_cursor || game._latched_more_cursor;
    if (cursor && display.setCursor) {
        display.setCursor(cursor[0], cursor[1]);
    }
}

// ── Build screen output ──
function _buildScreenOutput() {
    const display = game?.nhDisplay;
    if (!display) return;
    if (game._latched_more_screen) {
        renderOverrideScreen(display, game._latched_more_screen);
        return;
    }
    if (game._override_screen) {
        renderOverrideScreen(display, game._override_screen);
        return;
    }

    const floorListActive = Array.isArray(game._floor_list_lines) && game._floor_list_lines.length > 0;
    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + (game._more && !floorListActive ? '--More--' : '') + '\n';

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
        const msg = (game._pending_message || '') + (game._more && !floorListActive ? '--More--' : '');
        const pending = game._pending_message || '';
        if (game._more && game._more_next_message_row) {
            for (let c = 0; c < Math.min(pending.length, display.cols); c++)
                display.setCell(c, 0, pending[c], NO_COLOR, 0);
        } else {
            for (let c = 0; c < Math.min(msg.length, display.cols); c++)
                display.setCell(c, 0, msg[c], NO_COLOR, 0);
        }
        if (floorListActive && game._floor_list_show_more === false) {
            const col = game._floor_list_col ?? 41;
            for (let c = col; c < Math.min(msg.length, display.cols); c++)
                display.setCell(c, 0, msg[c], NO_COLOR, ATR_INVERSE);
        }
        // Map — write characters to grid (DEC → Unicode for browser display)
        if (!game._swallowed_map_active && !game._swallowed_latched_overlay) {
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const loc = game.level?.at(x, y);
                    if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                    const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                    display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
                }
            }
        } else {
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const sg = swallowed_glyph_at(x, y);
                    if (!sg) continue;
                    display.setCell(x - 1, y + 1, sg.ch, tty_color(sg.color), 0);
                }
            }
        }
        // Status lines
        const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
            m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
        for (let c = 0; c < Math.min(s1.length, display.cols); c++)
            display.setCell(c, 22, s1[c], NO_COLOR, 0);
        const s2 = _statusLine2();
        for (let c = 0; c < Math.min(s2.length, display.cols); c++)
            display.setCell(c, 23, s2[c], NO_COLOR, 0);
        if (floorListActive) {
            const col = game._floor_list_col ?? 41;
            for (let i = 0; i < game._floor_list_lines.length; i++) {
                const line = game._floor_list_lines[i] || '';
                const row = i + 1;
                const inverse = game._floor_list_show_more === false
                    && line
                    && line !== '(end)'
                    && !/^[a-z] [+-] /.test(line);
                for (let c = 0; c < display.cols - col; c++)
                    display.setCell(col + c, row, ' ', NO_COLOR, 0);
                for (let c = 0; c < Math.min(line.length, display.cols - col); c++)
                    display.setCell(col + c, row, line[c], NO_COLOR, inverse ? ATR_INVERSE : 0);
            }
            if (game._floor_list_show_more !== false) {
                const more = '--More--';
                const row = Math.min(21, game._floor_list_lines.length + 1);
                for (let c = 0; c < more.length; c++)
                    display.setCell(col + c, row, more[c], NO_COLOR, 0);
            }
        }
        if (game._more && game._more_next_message_row) {
            const more = `${game._message_continuation_row || ''}--More--`;
            for (let c = 0; c < display.cols; c++)
                display.setCell(c, 1, ' ', NO_COLOR, 0);
            for (let c = 0; c < Math.min(more.length, display.cols); c++)
                display.setCell(c, 1, more[c], NO_COLOR, 0);
        }
        // Cursor at the active blocking prompt before any map/prompt cursor.
        if (game._more && game._more_next_message_row) {
            const more = `${game._message_continuation_row || ''}--More--`;
            display.setCursor(Math.min(more.length, display.cols - 1), 1);
        }
        else if (msg && game._more && !floorListActive) display.setCursor(Math.min(msg.length, display.cols - 1), 0);
        else if (game._prompt_cursor) display.setCursor(game._prompt_cursor[0], game._prompt_cursor[1]);
        else if (game.u?.ux > 0)
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
    game._swallowed_overlay = null;
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

export async function append_pline(msg) {
    if (game._pending_message) {
        const packed = `${game._pending_message}  ${msg}`;
        game._pending_message = packed;
        if (packed.length >= (game.nhDisplay?.cols || COLNO)) queue_more_prompt();
    } else {
        await pline(msg);
    }
}

export function queue_more_prompt(count = 1) {
    game._more_dismissals_remaining = (game._more_dismissals_remaining || 0) + Math.max(1, count);
    game._more = true;
}

export function clear_pending_message() {
    game._pending_message = '';
    game._more = false;
    game._more_next_message_row = false;
    game._message_continuation_row = '';
    game._more_dismissals_remaining = 0;
    game._hero_melee_message_pending = false;
    game._pet_combat_more_latched = false;
    game._prompt_cursor = null;
    game._packed_monster_more_candidate = false;
    game._monster_more_accepts_any_key = false;
    game._floor_list_lines = null;
    game._floor_list_col = null;
    game._floor_list_show_more = true;
    game._floor_list_pauses_turn = false;
}
