// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, clear_path, couldsee } from './vision.js';
import { rn2Display } from './rng.js';
import { MONSTER_DATA } from './monster_data.js';
import { OBJECT_CLASS } from './object_data.js';
import { getObjectColor } from './o_init.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, SDOOR, SCORR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    TREE, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, ICE, AIR, CLOUD,
    DBWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE, DB_FLOOR,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    AM_MASK, AM_CHAOTIC, AM_NEUTRAL, AM_LAWFUL, AM_SANCTUM,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST,
    M_AP_OBJECT, IS_POOL, IS_WALL,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, WM_MASK,
    WM_C_OUTER, WM_C_INNER, WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    WARNCOUNT, STR18, STR19, def_warnsyms, Is_rogue_level,
    M3_INFRAVISIBLE, In_endgame, Is_astralevel, Is_waterlevel, Is_firelevel,
    Is_airlevel, Is_earthlevel, Is_knox_level,
    SATIATED, NOT_HUNGRY, HUNGRY, WEAK, FAINTING, FAINTED, STARVED,
} from './const.js';
import { depth, distmin, dist2 } from './hacklib.js';
import {
    NO_COLOR, CLR_BLACK, CLR_BLUE, CLR_GREEN, CLR_CYAN, CLR_GRAY, CLR_BROWN,
    CLR_RED, CLR_MAGENTA, CLR_WHITE, CLR_ORANGE, CLR_YELLOW, CLR_BRIGHT_GREEN,
    CLR_BRIGHT_BLUE, CLR_BRIGHT_MAGENTA,
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
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const RING_CLASS = 4;
const GEM_CLASS = 13;
const FIRST_OBJECT = 18;
const NUM_OBJECTS = OBJECT_CLASS.length - 1;
const FIRST_REAL_GEM = 439;
const LAST_GLASS_GEM = 469;
const FIRST_SPELL = 366;
const LAST_SPELL = 407;
const CORPSE = 265;
const STATUE = 476;
const GAUNTLETS_OF_POWER = 161;
const LONG_WORM_TAIL_DATA = MONSTER_DATA.find(m => m[0] === 'LONG_WORM_TAIL') || null;
const M1_MINDLESS = 0x00010000;

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

function primary_decgraphics() {
    return String(game._nhopts?.symset || '').toLowerCase() === 'decgraphics';
}

function dark_room_color_display() {
    // C defaults: optlist.h enables dark_room, and tty runs with color.
    return game.flags?.dark_room !== false && game.flags?.color !== false;
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

function obj_nearby_observation_modeled(obj) {
    if (!obj || obj.dknown) return false;
    return obj_is_generic(obj)
        || obj.oclass === SCROLL_CLASS
        || obj.oclass === RING_CLASS
        || obj.oclass === WAND_CLASS;
}

function observe_object(obj) {
    if (!obj) return;
    obj.dknown = true;
    if (typeof obj.otyp === 'number') {
        const order = Array.isArray(game.discoveryOrder)
            ? game.discoveryOrder
            : (game.discoveryOrder = []);
        if (!order.includes(obj.otyp)) order.push(obj.otyp);
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
    if (obj?.otyp === CORPSE) {
        // C ref: include/display.h:corpse_to_glyph().
        const mdat = monster_data_for_corpsenm(obj.corpsenm);
        return { ch: '%', color: mdat?.[7] ?? getObjectColor(CORPSE) ?? NO_COLOR };
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
        const base = GENERIC_OBJECT_GLYPH[obj.oclass] || { ch: obj.ch || '?', color: NO_COLOR };
        const r = Math.max(game.u?.xray_range || 0, 2);
        const neardist = (r * r) * 2 - r;
        const nearHero = dist2(x, y, game.u?.ux ?? 0, game.u?.uy ?? 0) <= neardist;
        return {
            ch: base.ch,
            color: nearHero ? (obj.color ?? getObjectColor(obj.otyp) ?? base.color) : base.color,
        };
    }
    return { ch: obj.ch || '?', color: obj.color ?? NO_COLOR };
}

function object_pile_display_attr(x, y, obj) {
    // C refs: include/display.h:obj_is_piletop(),
    // src/options.c:opt_hilite_pile.  The tty renderer marks the top glyph
    // for a stack of distinct floor objects when hilite_pile is enabled.
    if (!game.iflags?.hilite_pile || !obj) return 0;
    let count = 0;
    for (const candidate of game.level?.objects || []) {
        if (candidate.ox === x && candidate.oy === y && ++count > 1)
            return ATR_INVERSE;
    }
    return 0;
}

export function object_glyph_for_menu(obj) {
    // C ref: invent.c:display_pickinv().  Menu entries still compute
    // obj_to_glyph(..., rn2_on_display_rng) even when the tty menu renders
    // text-only inventory rows.
    return object_glyph_for_display(obj, 0, 0, false);
}

function is_known_branch_stair(x, y) {
    const currentDnum = game.u?.uz?.dnum ?? 0;
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y && st.isbranch
            && st.u_traversed && st.tolev?.dnum !== currentDnum) return true;
    return false;
}

function altarColor(loc) {
    // C refs: include/display.h:altar_to_glyph(), src/display.c:altarcolors[].
    const mask = loc?.altarmask ?? loc?.flags ?? 0;
    if ((mask & AM_SANCTUM) === AM_SANCTUM) return CLR_BRIGHT_MAGENTA;
    switch (mask & AM_MASK) {
    case AM_CHAOTIC:
    case AM_NEUTRAL:
    case AM_LAWFUL:
        return CLR_GRAY;
    default:
        return CLR_RED;
    }
}

function drawbridge_under_type(loc) {
    // C ref: display.c:back_to_glyph(), rm.h:drawbridgemask.
    switch ((loc?.drawbridgemask ?? loc?.flags ?? 0) & DB_UNDER) {
    case DB_MOAT: return MOAT;
    case DB_LAVA: return LAVAPOOL;
    case DB_ICE: return ICE;
    case DB_FLOOR: return ROOM;
    default: return ROOM;
    }
}

// ── Terrain to display character + color + DEC flag ──
export function terrain_glyph(loc, x, y) {
    const typ = display_wall_type(loc, x, y);
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
        case SINK:      return { ch: '{', color: NO_COLOR, dec: false };
        case ALTAR:     return { ch: '_', color: NO_COLOR, dec: false };
        case GRAVE:     return { ch: '|', color: NO_COLOR, dec: false };
        case TREE:      return { ch: '#', color: NO_COLOR, dec: false };
        case POOL:
        case MOAT:
        case WATER:
        case LAVAPOOL:
        case LAVAWALL:
            return { ch: '`', color: NO_COLOR, dec: false };
        case ICE:
            return { ch: '.', color: NO_COLOR, dec: false };
        case DBWALL:
            return { ch: '#', color: NO_COLOR, dec: false };
        case DRAWBRIDGE_UP:
            return terrain_glyph({ ...loc, typ: drawbridge_under_type(loc) }, x, y);
        case DRAWBRIDGE_DOWN:
            return { ch: '.', color: NO_COLOR, dec: false };
        default:        return { ch: '?', color: NO_COLOR, dec: false };
        }
    }
    const wallColor = (game.level?.flags?.red_walls || hell_level_display())
        ? CLR_RED
        : Is_knox_level(game.u?.uz) ? CLR_YELLOW
        : game.level?.flags?.sokoban_rules ? (primary_decgraphics() ? CLR_BLUE : NO_COLOR)
            : game.level?.flags?.mines_walls ? CLR_BROWN : NO_COLOR;
    if (!primary_decgraphics()) {
        switch (typ) {
        case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
        case ROOM:      return { ch: '.', color: NO_COLOR, dec: false };
        case CORR:
            return { ch: '#', color: (loc.waslit || game.flags?.lit_corridor) ? CLR_WHITE : NO_COLOR, dec: false };
        case DOOR:
            if (loc.doormask & D_ISOPEN) {
                // C refs: src/display.c:back_to_glyph(), include/defsym.h.
                // NetHack's legacy names describe the doorway orientation:
                // vertical open doors draw '-' and horizontal open doors draw '|'.
                return { ch: loc.horizontal ? '|' : '-', color: CLR_BROWN, dec: false };
            }
            if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
            return { ch: '.', color: NO_COLOR, dec: false };
        case SDOOR:
            return secret_door_horizontal(loc, x, y)
                ? { ch: '-', color: wallColor, dec: false }
                : { ch: '|', color: wallColor, dec: false };
        case STAIRS:
            {
                const color = is_known_branch_stair(x, y) ? CLR_YELLOW : CLR_GRAY;
                if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
                    return { ch: '<', color, dec: false };
                return { ch: '>', color, dec: false };
            }
        case HWALL:
        case TLCORNER:
        case TRCORNER:
        case BLCORNER:
        case BRCORNER:
        case CROSSWALL:
        case TUWALL:
        case TDWALL:
            return { ch: '-', color: wallColor, dec: false };
        case VWALL:
        case TLWALL:
        case TRWALL:
            return { ch: '|', color: wallColor, dec: false };
        case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
        case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
        case ALTAR:     return { ch: '_', color: altarColor(loc), dec: false };
        case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
        case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
        case TREE:      return { ch: '#', color: CLR_GREEN, dec: false };
        case POOL:
        case MOAT:
            return { ch: '}', color: CLR_BLUE, dec: false };
        case WATER:
            return { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
        case LAVAPOOL:
            return { ch: '}', color: CLR_RED, dec: false };
        case LAVAWALL:
            return { ch: '}', color: CLR_ORANGE, dec: false };
        case ICE:
            return { ch: '.', color: CLR_CYAN, dec: false };
        case DBWALL:
            return { ch: '#', color: CLR_BROWN, dec: false };
        case DRAWBRIDGE_UP:
            return terrain_glyph({ ...loc, typ: drawbridge_under_type(loc) }, x, y);
        case DRAWBRIDGE_DOWN:
            return { ch: '.', color: CLR_BROWN, dec: false };
        case AIR:
            return { ch: ' ', color: CLR_CYAN, dec: false };
        case CLOUD:
            return { ch: '#', color: CLR_GRAY, dec: false };
        default:        return { ch: '?', color: NO_COLOR, dec: false };
        }
    }
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    case CORR:
        // C ref: display.c:glyph_to_sym().  Normal and lit corridors share
        // '#', so lit corridors are forced to white to remain distinguishable.
        return { ch: '#', color: (loc.waslit || game.flags?.lit_corridor) ? CLR_WHITE : NO_COLOR, dec: false };
    case DOOR:
        if (loc.doormask & D_ISOPEN) {
            // DECgraphics maps both horizontal and vertical open doors to
            // the checkerboard open-door glyph.
            return { ch: 'a', color: CLR_BROWN, dec: true };
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
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case ALTAR:
        // C ref: dat/symbols DECGraphics S_altar uses the raw DEC payload
        // byte '{'; the harness cell decoder preserves that byte.
        return { ch: '{', color: altarColor(loc), dec: false };
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
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
    case ICE:
        return { ch: '~', color: CLR_CYAN, dec: true };
    case DBWALL:
        return { ch: '#', color: CLR_BROWN, dec: false };
    case DRAWBRIDGE_UP:
        return terrain_glyph({ ...loc, typ: drawbridge_under_type(loc) }, x, y);
    case DRAWBRIDGE_DOWN:
        return { ch: '~', color: CLR_BROWN, dec: true };
    case AIR:
        // C ref: display.c:back_to_glyph() S_air.
        return { ch: ' ', color: CLR_CYAN, dec: false };
    case CLOUD:
        // C refs: include/defsym.h:S_cloud, dat/symbols DECGraphics.
        return { ch: '#', color: CLR_GRAY, dec: false };
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

function display_wall_type(loc, x, y) {
    // C ref: display.c:wall_angle(). For wallification glyphs, NetHack
    // derives the visible wall character from terrain type plus seenv.
    const seenv = (loc.seenv || 0) & 0xff;
    const mode = (loc.wall_info || 0) & WM_MASK;
    if (!seenv) {
        switch (loc.typ) {
        case SDOOR:
        case HWALL:
        case VWALL:
        case TLCORNER:
        case TRCORNER:
        case BLCORNER:
        case BRCORNER:
        case CROSSWALL:
        case TUWALL:
        case TDWALL:
        case TLWALL:
        case TRWALL:
            return STONE;
        default:
            return loc.typ;
        }
    }
    let rotated = seenv;
    let row = null;
    switch (loc.typ) {
    case CROSSWALL:
        return display_crosswall_type(loc, seenv);
    case SDOOR:
        return secret_door_wall_type(loc, x, y, seenv);
    case VWALL:
        switch (mode) {
        case 0:
            return VWALL;
        case 1:
            return seenv & (SV1 | SV2 | SV3 | SV4 | SV5) ? VWALL : STONE;
        case 2:
            return seenv & (SV0 | SV1 | SV5 | SV6 | SV7) ? VWALL : STONE;
        default:
            return STONE;
        }
    case HWALL:
        switch (mode) {
        case 0:
            return HWALL;
        case 1:
            return seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? HWALL : STONE;
        case 2:
            return seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? HWALL : STONE;
        default:
            return STONE;
        }
    case TLCORNER:
        return display_corner_type(TLCORNER, seenv, mode, SV3 | SV4 | SV5, SV4);
    case TRCORNER:
        return display_corner_type(TRCORNER, seenv, mode, SV5 | SV6 | SV7, SV6);
    case BLCORNER:
        return display_corner_type(BLCORNER, seenv, mode, SV1 | SV2 | SV3, SV2);
    case BRCORNER:
        return display_corner_type(BRCORNER, seenv, mode, SV7 | SV0 | SV1, SV0);
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

    const col = display_twall_column(rotated, mode);
    return row[col];
}

function display_corner_type(which, seenv, mode, outer, inner) {
    // C ref: display.c:wall_angle() set_corner().
    switch (mode) {
    case 0:
        return which;
    case WM_C_OUTER:
        return seenv & outer ? which : STONE;
    case WM_C_INNER:
        return seenv & ~inner ? which : STONE;
    default:
        return STONE;
    }
}

function secret_door_wall_type(loc, x, y, seenv) {
    // SDOOR falls through to the HWALL/VWALL wall-angle cases in C.
    if (secret_door_horizontal(loc, x, y)) {
        const mode = (loc.wall_info || 0) & WM_MASK;
        if (mode === 1) return seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? HWALL : STONE;
        if (mode === 2) return seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? HWALL : STONE;
        return HWALL;
    }
    const mode = (loc.wall_info || 0) & WM_MASK;
    if (mode === 1) return seenv & (SV1 | SV2 | SV3 | SV4 | SV5) ? VWALL : STONE;
    if (mode === 2) return seenv & (SV0 | SV1 | SV5 | SV6 | SV7) ? VWALL : STONE;
    return VWALL;
}

function display_twall_column(seenv, mode) {
    // C ref: display.c:wall_angle(), TDWALL/T*WALL cases after rotation.
    switch (mode) {
    case 0:
        if (seenv === SV4) return 1;
        if (seenv === SV6) return 2;
        if ((seenv & (SV3 | SV5 | SV7)) || ((seenv & SV4) && (seenv & SV6))) return 4;
        if (seenv & (SV0 | SV1 | SV2)) return (seenv & (SV4 | SV6)) ? 4 : 3;
        return 0;
    case WM_T_LONG:
        if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) return 1;
        if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) return 2;
        if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) return 4;
        return 0;
    case WM_T_BL:
        if (onlySeenv(seenv, SV4 | SV5)) return 1;
        if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) return 3;
        if (onlySeenv(seenv, SV6)) return 0;
        return 4;
    case WM_T_BR:
        if (onlySeenv(seenv, SV5 | SV6)) return 2;
        if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7))) return 3;
        if (onlySeenv(seenv, SV4)) return 0;
        return 4;
    default:
        return 0;
    }
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
    let ch = '^';
    let color = CLR_GRAY;
    // C ref: defsym.h trap PCHAR rows via rm.h:trap_to_defsym().
    switch (trap.ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case BEAR_TRAP:
        color = CLR_CYAN;
        break;
    case SQKY_BOARD:
    case HOLE:
    case TRAPDOOR:
        color = CLR_BROWN;
        break;
    case LANDMINE:
        color = CLR_RED;
        break;
    case SLP_GAS_TRAP:
    case MAGIC_TRAP:
    case ANTI_MAGIC:
        color = CLR_BRIGHT_BLUE;
        break;
    case RUST_TRAP:
        color = CLR_BLUE;
        break;
    case FIRE_TRAP:
    case TRAPPED_DOOR:
    case TRAPPED_CHEST:
        color = CLR_ORANGE;
        break;
    case PIT:
    case SPIKED_PIT:
        color = CLR_BLACK;
        break;
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case VIBRATING_SQUARE:
        color = CLR_MAGENTA;
        break;
    case MAGIC_PORTAL:
        color = CLR_BRIGHT_MAGENTA;
        break;
    case WEB:
        ch = '"';
        break;
    case POLY_TRAP:
        color = CLR_BRIGHT_GREEN;
        break;
    case ROCKTRAP:
    case ROLLING_BOULDER_TRAP:
    case STATUE_TRAP:
    default:
        break;
    }
    return { ch, color, dec: false };
}

function engraving_at(x, y) {
    return (game.level?.engravings || []).find(ep => ep.x === x && ep.y === y) || null;
}

function spot_shows_engravings(loc) {
    return loc?.typ === ROOM || loc?.typ === CORR || loc?.typ === ICE;
}

function engraving_glyph(loc) {
    // C refs: include/engrave.h:engraving_to_defsym(), defsym.h:S_engroom.
    return { ch: loc?.typ === CORR ? '#' : '`', color: CLR_BRIGHT_BLUE, dec: false };
}

function monster_glyph(mon, wormTail = false) {
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
    if (wormTail) {
        // C ref: display.c:display_monster() renders long-worm body cells
        // as PM_LONG_WORM_TAIL while m_at() still returns the head monster.
        return {
            ch: MONSTER_SYMBOLS[LONG_WORM_TAIL_DATA?.[1] ?? 'S_WORM_TAIL'] ?? '~',
            color: LONG_WORM_TAIL_DATA?.[7] ?? mon?.color ?? NO_COLOR,
            dec: false,
        };
    }
    if (mon?.m_ap_type === M_AP_OBJECT) {
        const otyp = mon.mappearance;
        if (mon.mcorpsenm != null && (otyp === STATUE || otyp === CORPSE)) {
            // C ref: display.c:display_monster() builds a fake object for
            // mimics, so monster-based statues/corpses render through
            // map_object() with MCORPSENM().
            return object_glyph_for_display({
                otyp,
                oclass: OBJECT_CLASS[otyp],
                ch: object_class_char(OBJECT_CLASS[otyp]),
                color: getObjectColor(otyp) ?? NO_COLOR,
                corpsenm: mon.mcorpsenm,
                dknown: true,
            }, mon.mx ?? 0, mon.my ?? 0, true);
        }
        const oclass = OBJECT_CLASS[otyp];
        return {
            ch: object_class_char(oclass),
            color: getObjectColor(otyp) ?? NO_COLOR,
            dec: false,
        };
    }
    return { ch: mon.ch, color: mon.color, dec: false };
}

function monster_display_attr(mon) {
    // C refs: win/tty/wintty.c:tty_print_glyph(), src/options.c:opt_hilite_pet().
    if (!mon?.mtame || !game.iflags?.hilite_pet) return 0;
    return game.iflags.wc2_petattr || ATR_INVERSE;
}

function active_pet_kill_more_overlay() {
    const overlay = game._pet_kill_more_overlay || null;
    if (!overlay?.mon || !game._more) return null;
    if (overlay.line && !(game._pending_message || '').includes(overlay.line))
        return null;
    return overlay;
}

function monster_at_display(x, y) {
    const overlay = active_pet_kill_more_overlay();
    if (overlay && x === overlay.x && y === overlay.y)
        return { mon: overlay.mon, wormTail: false };
    const monsters = game.level?.monsters || [];
    const head = monsters.find(m => m.mx === x && m.my === y);
    if (overlay && head === overlay.mon && x === overlay.oldX && y === overlay.oldY)
        return null;
    if (head) return { mon: head, wormTail: false };
    const tail = monsters.find(m => (m.wsegs || []).some(seg => seg.wx === x && seg.wy === y));
    return tail ? { mon: tail, wormTail: true } : null;
}

function monster_visible(mon) {
    // C ref: display.h:_mon_visible().  newsym() only draws a monster in
    // physical sight when it is not an undetected hider and not unseen
    // invisible.
    if (!mon || mon.mundetected) return false;
    if (mon._opened_unseen_door) return false;
    if (mon.minvis && !(game.u?.usee_invisible || game.u?.uprops?.see_invisible)) return false;
    const loc = game.level?.at(mon.mx, mon.my);
    // C ref: include/display.h:_mon_visible().  Terrain is already handled by
    // cansee()/region rules; vault guards can be shown on temporary stone or
    // fake-corridor entry cells when the location is visible.
    if (loc && (loc.typ === AIR || loc.typ === CLOUD)
        && mon.data?.mlet === 'S_VORTEX'
        && game.u?.ux > 0 && cansee(mon.mx, mon.my)
        && !clear_path(game.u.ux, game.u.uy, mon.mx, mon.my)) return false;
    return true;
}

function hero_has_infravision() {
    return !game.u?.ublind
        && !game.u?.uprops?.blind
        && !game.u?.uprops?.blinded
        && !!game.u?.uprops?.infravision;
}

function see_with_infrared(mon) {
    // C ref: include/display.h:_see_with_infrared().
    return !!mon
        && hero_has_infravision()
        && !!(mon.data?.mflags3 & M3_INFRAVISIBLE)
        && couldsee(mon.mx, mon.my);
}

function tp_sensemon(mon) {
    // C ref: include/display.h:_tp_sensemon().  Extrinsic telepathy works
    // while sighted, but only within the worn-item range.
    if (!mon || ((mon.data?.mflags1 ?? 0) & M1_MINDLESS)) return false;
    const blind = !!(game.u?.ublind || game.u?.uprops?.blind || game.u?.uprops?.blinded);
    const telepathic = !!(game.u?.uprops?.telepathic || game.u?.uprops?.telepat);
    if (blind) return telepathic;
    const range = game.u?.unblind_telepat_range;
    return telepathic
        && typeof range === 'number'
        && range >= 0
        && dist2(game.u?.ux ?? 0, game.u?.uy ?? 0, mon.mx, mon.my) <= range;
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
    for (const mon of game.level?.monsters || []) {
        newsym(mon.mx, mon.my);
        for (const seg of mon.wsegs || []) newsym(seg.wx, seg.wy);
    }
}

export function see_monsters() {
    for (const mon of game.level?.monsters || []) {
        if (mon.dead || mon.mhp <= 0) continue;
        newsym(mon.mx, mon.my);
        for (const seg of mon.wsegs || []) newsym(seg.wx, seg.wy);
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

export function see_nearby_objects() {
    if (game.u?.uprops?.hallucination || game.u?.uhallucination) return;
    const r = Math.max(game.u?.xray_range || 0, 2);
    const neardist = (r * r) * 2 - r;
    const ux = game.u?.ux ?? 0;
    const uy = game.u?.uy ?? 0;
    for (let y = uy - r; y <= uy + r; y++) {
        for (let x = ux - r; x <= ux + r; x++) {
            if (x <= 0 || y < 0) continue;
            const obj = (game.level?.objects || []).find((o) => o.ox === x && o.oy === y);
            if (!obj || obj.dknown) continue;
            if (!cansee(x, y) || dist2(x, y, ux, uy) > neardist) continue;
            // C ref: src/display.c:see_nearby_objects().  Nearby visible top
            // objects with descriptor/generic discovery front doors are
            // encountered before explicit floor naming; other classes still
            // rely on the naming path until full visibility parity is owned.
            if (obj_nearby_observation_modeled(obj)) observe_object(obj);
            newsym(x, y);
        }
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

function unmapped_object_memory(loc, x, y, visible) {
    // C ref: display.c:unmap_object().  Clearing remembered invisible/object
    // glyphs restores known trap/engraving/background memory, not any other
    // object that might now exist on an out-of-sight square.
    const covered = terrain_covers_objects(loc);
    const trap = game.level?.traps?.find(t => t.tx === x && t.ty === y);

    if (trap?.tseen && !covered) {
        const tr = trap_glyph(trap);
        return { ch: tr.ch, color: tr.color, decgfx: tr.dec };
    }

    if (loc.seenv) {
        const ep = engraving_at(x, y);
        if (ep && spot_shows_engravings(loc) && !covered) {
            if (visible) ep.erevealed = true;
            const eg = engraving_glyph(loc);
            return { ch: eg.ch, color: eg.color, decgfx: eg.dec };
        }

        if (!loc.waslit && loc.typ === ROOM)
            return { ch: ' ', color: NO_COLOR, decgfx: false };

        const tg = terrain_glyph(loc, x, y);
        return { ch: tg.ch, color: tg.color, decgfx: tg.dec };
    }

    return { ch: ' ', color: NO_COLOR, decgfx: false };
}

export function unmap_invisible_memory(x, y, options = {}) {
    // C refs: src/display.c:unmap_invisible(), src/display.c:unmap_object().
    // Ordinary newsym() preserves remembered invisible markers; explicit
    // probes clear them and restore trap/engraving/background memory.
    const loc = game.level?.at(x, y);
    if (loc?.remembered_glyph?.ch !== 'I') return false;
    loc.remembered_glyph = unmapped_object_memory(loc, x, y, cansee(x, y));
    if (options.redraw !== false) newsym(x, y);
    return true;
}

export function map_level_for_wizard(revealTraps = false) {
    // C refs: wizcmds.c:wiz_map(), detect.c:do_mapping(), detect.c:show_map_spot().
    if (!game.level) return;
    const savedHallucination = game.u?.uprops?.hallucination;
    const savedUHallucination = game.u?.uhallucination;
    if (game.u?.uprops) game.u.uprops.hallucination = 0;
    if (game.u) game.u.uhallucination = 0;

    if (revealTraps) {
        // C ref: wizcmds.c:wiz_map() marks every trap seen before do_mapping();
        // ordinary magic mapping does not pre-mark traps.
        for (const trap of game.level.traps || []) trap.tseen = true;
    }

    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (!loc) continue;
            const old = {
                ch: loc.disp_ch,
                color: loc.disp_color,
                decgfx: loc.disp_decgfx,
            };
            const visible = cansee(x, y);
            // C ref: detect.c:show_map_spot().  Mapping marks every
            // coordinate as seen, not just wall-angle terrain.
            loc.seenv = 0xff;
            if (loc.typ === SCORR) loc.typ = CORR;
            const trap = (game.level.traps || []).find(t => t.tx === x && t.ty === y);
            const covered = terrain_covers_objects(loc);
            let glyph = terrain_glyph(loc, x, y);
            let mappedForeground = false;
            if (trap?.tseen && !covered) {
                glyph = trap_glyph(trap);
                mappedForeground = true;
            } else if (!covered) {
                const ep = engraving_at(x, y);
                if (ep && spot_shows_engravings(loc)) {
                    // C ref: detect.c:show_map_spot(); magic mapping shows
                    // engravings after known traps and before old object glyphs.
                    ep.erevealed = true;
                    glyph = engraving_glyph(loc);
                    mappedForeground = true;
                }
            }
            if (!mappedForeground && !covered) {
                const obj = (game.level.objects || []).find(o => o.ox === x && o.oy === y);
                if (obj && old.ch) {
                    const og = object_glyph_for_display(obj, x, y, visible);
                    if (old.ch === og.ch && old.color === tty_color(og.color)) glyph = og;
                }
            }
            const decgfx = !!(glyph.dec ?? glyph.decgfx);
            loc.remembered_glyph = { ch: glyph.ch, color: glyph.color, decgfx };
            show_glyph_cell(x, y, glyph.ch, glyph.color, decgfx);
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
    loc.disp_decgfx = rogue_level_display() ? false : primary_decgraphics() && !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

function write_map_cell(display, x, y, loc, forceBlank = false) {
    if (!display || !loc) return;
    const raw = loc.disp_ch ?? ' ';
    const blank = raw === ' '
        && (loc.disp_color == null || loc.disp_color === CLR_GRAY || loc.disp_color === NO_COLOR)
        && !loc.disp_attr;
    if (blank && !forceBlank) return;
    const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[raw] || raw) : raw;
    display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
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

function hero_glyph() {
    // C ref: src/display.c:newsym().  When mounted, the hero's map square is
    // rendered with the steed's glyph/color rather than the ordinary @ glyph.
    if (game.u?.usteed) return monster_glyph(game.u.usteed);
    const form = game.u?._poly_form || null;
    return {
        ch: form?.glyph || '@',
        color: form?.color ?? CLR_WHITE,
        dec: false,
    };
}

function hero_visible_to_self() {
    // C refs: include/display.h:canseeself(), canspotself().  If the hero is
    // invisible without see-invisible, newsym() shows what is underneath.
    const u = game.u || {};
    if (u.uswallow) return true;
    if (u.ublind || u.blind || u.uprops?.blind || u.uprops?.blinded) return true;
    const invisible = !!(u.uinvis || u.Invis || u.uprops?.invisible);
    const seeInvisible = !!(u.usee_invisible || u.see_invisible
        || u.See_invisible || u.uprops?.see_invisible);
    const undetected = !!u.uundetected;
    return (!invisible || seeInvisible) && !undetected;
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    // C ref: display.c:newsym(). While swallowed, ordinary map newsym()
    // calls do not redraw external monsters/objects/traps; swallowed()
    // owns the visible 3x3 stomach display.
    if (game.u?.uswallow) {
        if (game.u?.ux === x && game.u?.uy === y) {
            const hg = hero_glyph();
            show_glyph_cell(x, y, hg.ch, hg.color, hg.dec);
        }
        return;
    }

    const visible = cansee(x, y);
    if (visible) loc.waslit = !!loc.lit;

    const monInfo = monster_at_display(x, y);
    const mon = monInfo?.mon || null;
    const wormTail = !!monInfo?.wormTail;

    if (!visible) {
        if (game.u?.ux === x && game.u?.uy === y && hero_visible_to_self()) {
            const hg = hero_glyph();
            show_glyph_cell(x, y, hg.ch, hg.color, hg.dec);
            return;
        }
        if (wormTail) {
            if (loc.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx,
                    loc.remembered_glyph.attr || 0);
            } else {
                show_glyph_cell(x, y, ' ', NO_COLOR, false);
            }
            return;
        }
        if (mon && (tp_sensemon(mon) || see_with_infrared(mon)) && monster_visible(mon)) {
            const mg = monster_glyph(mon, wormTail);
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec, monster_display_attr(mon));
            return;
        }
        const wg = mon ? warning_glyph(mon) : null;
        if (wg) {
            show_glyph_cell(x, y, wg.ch, wg.color, false);
        } else if (loc.remembered_glyph) {
            if (loc.typ === CORR && (!loc.waslit || dark_room_color_display())
                && loc.remembered_glyph.ch === '#'
                && loc.remembered_glyph.color === CLR_WHITE) {
                // C ref: display.c:newsym().  With dark_room+color, an
                // out-of-sight remembered lit corridor is redisplayed dark.
                const tg = terrain_glyph(loc, x, y);
                tg.color = NO_COLOR;
                loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
            }
            // Out of sight but remembered - show remembered glyph.
            const obj = game.level?.objects?.find(o => o.ox === x && o.oy === y);
            const attr = obj
                ? object_pile_display_attr(x, y, obj)
                : (loc.remembered_glyph.attr || 0);
            show_glyph_cell(x, y, loc.remembered_glyph.ch,
                loc.remembered_glyph.color, loc.remembered_glyph.decgfx, attr);
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
    let draw_attr = 0;

    if (trap?.tseen && !covered) {
        const tr = trap_glyph(trap);
        draw_ch = tr.ch; draw_color = tr.color; draw_dec = tr.dec;
        draw_attr = 0;
    }
    const ep = engraving_at(x, y);
    if (ep && spot_shows_engravings(loc) && !covered && (visible || ep.erevealed)) {
        if (visible) ep.erevealed = true;
        const eg = engraving_glyph(loc);
        draw_ch = eg.ch; draw_color = eg.color; draw_dec = eg.dec;
    }
    if (obj && !covered) {
        const og = object_glyph_for_display(obj, x, y, visible);
        draw_ch = og.ch; draw_color = og.color; draw_dec = false;
        draw_attr = object_pile_display_attr(x, y, obj);
    }
    let memory_ch = draw_ch;
    let memory_color = draw_color;
    let memory_dec = draw_dec;
    let memory_attr = draw_attr;
    if (obj && !covered && obj.otyp === STATUE
        && (game.u?.uprops?.hallucination || game.u?.uhallucination)) {
        // C ref: display.c:map_object(). Hallucinated statues are shown as
        // random monsters but remembered as separate random objects.
        const mem = random_object_glyph_for_display();
        memory_ch = mem.ch; memory_color = mem.color; memory_dec = false;
    }
    if (game.u?.ux === x && game.u?.uy === y) {
        if (game.level?.flags?.hero_memory)
            loc.remembered_glyph = { ch: memory_ch, color: memory_color, decgfx: memory_dec };
        if (hero_visible_to_self()) {
            const hg = hero_glyph();
            show_glyph_cell(x, y, hg.ch, hg.color, hg.dec);
        } else {
            show_glyph_cell(x, y, draw_ch, draw_color, draw_dec, draw_attr);
        }
        return;
    }
    let drewMonsterOrWarning = false;
    if (monster_visible(mon) || (!wormTail && tp_sensemon(mon))) {
        const mg = monster_glyph(mon, wormTail);
        draw_ch = mg.ch; draw_color = mg.color; draw_dec = mg.dec;
        draw_attr = monster_display_attr(mon);
        drewMonsterOrWarning = true;
    } else if (mon) {
        const wg = warning_glyph(mon);
        if (wg) {
            draw_ch = wg.ch; draw_color = wg.color; draw_dec = false;
            draw_attr = 0;
            drewMonsterOrWarning = true;
        }
    }

    if (!drewMonsterOrWarning && loc.remembered_glyph?.ch === 'I') {
        const mem = loc.remembered_glyph;
        show_glyph_cell(x, y, mem.ch, mem.color, mem.decgfx, mem.attr || 0);
        return;
    }

    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    show_glyph_cell(x, y, draw_ch, draw_color, draw_dec, draw_attr);
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = { ch: memory_ch, color: memory_color, decgfx: memory_dec, attr: memory_attr };
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc) {
                loc.disp_ch = undefined;
                loc.disp_color = undefined;
                loc.disp_decgfx = undefined;
                loc.disp_attr = 0;
            }
            if (!game.level?.flags?.hero_memory && cansee(x, y)) {
                // C ref: display.c:docrt().  Air-level cells keep a stored
                // map glyph, but visible cells are redrawn from current terrain.
                newsym(x, y);
            } else if (loc?.remembered_glyph) {
                const obj = game.level?.objects?.find(o => o.ox === x && o.oy === y);
                const attr = obj
                    ? object_pile_display_attr(x, y, obj)
                    : (loc.remembered_glyph.attr || 0);
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx, attr);
            }
        }
    see_monsters();
    show_premapped_mimics();
    if (game.u?.ux > 0) newsym(game.u.ux, game.u.uy);
    game._full_map_redraw_pending = true;
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

function render_known_terrain_row(y) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    const glyphs = new Map();
    for (let x = 1; x < COLNO; x++) {
        const loc = game.level.at(x, y);
        const known = loc?.disp_ch && loc.disp_ch !== ' ';
        if (!known) continue;
        // C ref: cmd.c:doterrain().  The first terrain-view choice shows the
        // known map without monsters, objects, and traps, so render the base
        // terrain instead of the remembered object/monster display layer.
        const glyph = terrain_glyph(loc, x, y);
        if (glyph.ch === '#' || glyph.ch === '>') glyph.color = NO_COLOR;
        glyphs.set(x, glyph);
        if (glyph.ch !== ' ') {
            if (firstCol < 0) firstCol = x;
            lastCol = x;
        }
    }
    if (firstCol < 0) return '';

    let output = '';
    let activeColor = ANSI_DEFAULT;
    let activeDec = false;
    const gap = firstCol - 1;
    if (gap > 4) output += `\x1b[${gap}C`;
    else if (gap > 0) output += ' '.repeat(gap);

    for (let x = firstCol; x <= lastCol; x++) {
        const glyph = glyphs.get(x) || { ch: ' ', color: NO_COLOR, dec: false };
        if (glyph.ch === ' ') {
            let run = 1;
            while (x + run <= lastCol && (glyphs.get(x + run)?.ch ?? ' ') === ' ') run++;
            if (activeDec) { output += '\x0f'; activeDec = false; }
            if (run > 4) output += `\x1b[${run}C`;
            else output += ' '.repeat(run);
            x += run - 1;
            continue;
        }

        const wantAnsi = ANSI_COLOR[glyph.color] ?? ANSI_DEFAULT;
        if (wantAnsi !== activeColor) {
            output += `\x1b[${wantAnsi}m`;
            activeColor = wantAnsi;
        }
        if (glyph.dec && !activeDec) { output += '\x0e'; activeDec = true; }
        else if (!glyph.dec && activeDec) { output += '\x0f'; activeDec = false; }
        output += glyph.ch;
    }

    if (activeColor !== ANSI_DEFAULT) output += `\x1b[${ANSI_DEFAULT}m`;
    if (activeDec) output += '\x0f';
    return output;
}

export function serialize_known_terrain_view_screen(message = '') {
    let output = `${message}\n`;
    for (let y = 0; y < ROWNO; y++) output += `${render_known_terrain_row(y)}\n`;
    output += `${_statusLine1()}\n`;
    output += _statusLine2();
    return output;
}

// ── Status lines ──
function wearing_power_gauntlets() {
    return (game.inventory || []).some((obj) => obj?.otyp === GAUNTLETS_OF_POWER
        && (obj.worn || obj.owornmask));
}

function strength_status_text(value) {
    if (value == null || value === '') return '?';
    if (typeof value === 'string') return value;
    let st = Number(value);
    if (!Number.isFinite(st) || st <= 0) return '?';

    // C refs: src/botl.c:get_strength_str(), src/attrib.c:acurr().
    // Stored strength uses 19..118 for 18/01..18/**; current JS still keeps
    // power gauntlets as raw 25, so normalize that equipment case here.
    if (st === 25 && wearing_power_gauntlets()) st = STR19(25);
    if (st > 18) {
        if (st > STR18(100)) return String(st - 100);
        if (st < STR18(100)) return `18/${String(st - 18).padStart(2, '0')}`;
        return '18/**';
    }
    return String(st);
}

function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const rawName = game.plname || 'Hero';
    // C ref: src/botl.c:do_statusline1().  The bottom line capitalizes the
    // first player-name character, while ustatusline() prints svp.plname raw.
    const name = rawName ? `${rawName[0].toUpperCase()}${rawName.slice(1)}` : rawName;
    const form = u._poly_form || null;
    const role = form?.title || roleRankForLevel(game.urole, u.ulevel || 1, !!game.flags?.female)
        || (game.flags?.female
            ? (game.urole?.rank?.f || game.urole?.name?.f || game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer')
            : (game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer'));
    const title = `${name} the ${role}`;
    const attrs = game._latched_status_attrs && game._more
        ? game._latched_status_attrs
        : (u.acurr?.a || []);
    const strength = strength_status_text(form?.strength ?? attrs[0]);
    const stats = `St:${strength} Dx:${attrs[3] || '?'} Co:${attrs[4] || '?'} In:${attrs[1] || '?'} Wi:${attrs[2] || '?'} Ch:${attrs[5] || '?'}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function hungerStateForDisplay(u) {
    if (Number.isInteger(u?.uhs)) return u.uhs;
    const h = Number.isFinite(u?.uhunger) ? u.uhunger : 900;
    if (h > 1000) return SATIATED;
    if (h > 150) return NOT_HUNGRY;
    if (h > 50) return HUNGRY;
    if (h > 0) return WEAK;
    return FAINTING;
}

function hungerStatusText(u) {
    switch (hungerStateForDisplay(u)) {
    case SATIATED:
        return 'Satiated';
    case HUNGRY:
        return 'Hungry';
    case WEAK:
        return 'Weak';
    case FAINTING:
        return 'Fainting';
    case FAINTED:
        return 'Fainted';
    case STARVED:
        return 'Starved';
    case NOT_HUNGRY:
    default:
        return '';
    }
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    const form = u._poly_form || null;
    const xp = form
        ? `HD:${form.hd || 1}`
        : game.flags?.showexp
        ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
        : `Xp:${u.ulevel || 1}`;
    const displayedTurn = game._latched_status_turn != null && (game._more || game._death_prompt_active)
        ? game._latched_status_turn
        : (game.moves || 1);
    const turn = game.flags?.time ? ` T:${displayedTurn}` : '';
    const conditions = [];
    const encStatus = ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'];
    const hunger = hungerStatusText(u);
    if (hunger) conditions.push(hunger);
    const statusEncumbrance = game._more && game._status_uencumber_override != null
        ? game._status_uencumber_override
        : (u.uencumber || 0);
    if (statusEncumbrance > 0) conditions.push(encStatus[statusEncumbrance] || 'Overloaded');
    if (u.uprops?.confusion || u.uconfusion) conditions.push('Conf');
    if (u.uprops?.hallucination || u.uhallucination) conditions.push('Hallu');
    if (u.uprops?.blinded || u.uprops?.blind || u.ublind) conditions.push('Blind');
    if (u.uprops?.deaf) conditions.push('Deaf');
    if (form?.fly) conditions.push('Fly');
    if (u.usteed) conditions.push('Ride');
    const conditionText = conditions.length ? ` ${conditions.join(' ')}` : '';
    const hp = game._latched_status_uhp != null && (game._more || game._death_prompt_active)
        ? game._latched_status_uhp
        : (u.uhp || 0);
    const gold = game._latched_status_gold != null
            && (game._more || game._clear_latched_status_gold_after_more)
        ? game._latched_status_gold
        : (game._goldCount || 0);
    const statusAcOverrideActive = game._status_uac_override != null
        && (game._status_uac_override_move == null || game._status_uac_override_move === game.moves);
    const ac = statusAcOverrideActive ? game._status_uac_override : (u.uac ?? 10);
    const goldSymbol = rogue_level_display() ? '*' : '$';
    // C ref: botl.c:describe_level().
    const levelDesc = Is_knox_level(u.uz)
        ? (game.dungeons?.[u.uz?.dnum]?.dname || 'Fort Ludios')
        : game.dungeons?.[u.uz?.dnum]?.dname === 'The Tutorial'
        ? `Tutorial:${u.uz?.dlevel || 1}`
        : game.quest_dnum != null && u.uz?.dnum === game.quest_dnum
        ? `Home ${u.uz?.dlevel || 1}`
        : In_endgame(u.uz)
        ? endgame_status_level_desc(u.uz)
        : `Dlvl:${depth(u.uz)}`;
    return `${levelDesc} ${goldSymbol}:${gold} HP:${hp}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${ac} ${xp}${turn}${conditionText}`;
}

function endgame_status_level_desc(uz) {
    // C refs: botl.c:describe_level(), dungeon.c:endgamelevelname().
    if (Is_astralevel(uz)) return 'Astral Plane';
    if (Is_waterlevel(uz)) return 'Water';
    if (Is_firelevel(uz)) return 'Fire';
    if (Is_airlevel(uz)) return 'Air';
    if (Is_earthlevel(uz)) return 'Earth';
    return `unknown plane #${depth(uz)}`;
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

export function renderTextScreen(display, screen, cursor = null) {
    if (!display) return;
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

    if (cursor && display.setCursor) {
        display.setCursor(cursor[0], cursor[1]);
    }
}

function activeSerializedTextScreen() {
    if (game._startup_legacy_pager_active && game._startup_legacy_pager_screen)
        return game._startup_legacy_pager_screen;
    if (game._tutorial_prompt_active && game._tutorial_prompt_screen)
        return game._tutorial_prompt_screen;
    if (game._spell_menu_active && game._spell_menu_screen)
        return game._spell_menu_screen;
    if (game._spell_cast_menu_active && game._spell_cast_menu_screen)
        return game._spell_cast_menu_screen;
    if (game._help_menu_active && game._help_menu_screen)
        return game._help_menu_screen;
    if (game._help_text_active && game._help_text_screen)
        return game._help_text_screen;
    if (game._options_window_active && game._options_window_screen)
        return game._options_window_screen;
    if (game._look_window_active && game._look_window_screen)
        return game._look_window_screen;
    if (game._travel_tip_screen_active && game._travel_tip_screen)
        return game._travel_tip_screen;
    if (game._terrain_window_active && game._terrain_window_screen)
        return game._terrain_window_screen;
    if (game._disclosure_window_active && game._disclosure_window_screen)
        return game._disclosure_window_screen;
    if (game._intrinsic_menu_active && game._intrinsic_menu_screen)
        return game._intrinsic_menu_screen;
    if (game._name_menu_active && game._name_menu_screen)
        return game._name_menu_screen;
    if (game._enhance_skills_active && game._enhance_skills_screen)
        return game._enhance_skills_screen;
    if (game._discovery_window_active && game._discovery_screen)
        return game._discovery_screen;
    if (game._attributes_window_active && game._attributes_screen)
        return game._attributes_screen;
    if (game._level_teleport_menu_active && game._level_teleport_menu_screen)
        return game._level_teleport_menu_screen;
    if (game._wizidentify_menu_active && game._wizidentify_menu_screen)
        return game._wizidentify_menu_screen;
    if (game._inventory_action_menu_active && game._inventory_action_menu_screen)
        return game._inventory_action_menu_screen;
    if (game._inventory_prompt_menu_active && game._inventory_prompt_menu_screen)
        return game._inventory_prompt_menu_screen;
    if (game._throw_inventory_menu_active) {
        if (game._throw_inventory_menu_page === 2 && game._throw_inventory_menu_page2_screen)
            return game._throw_inventory_menu_page2_screen;
        if (game._throw_inventory_menu_screen)
            return game._throw_inventory_menu_screen;
    }
    if (game._potion_menu_active && game._potion_menu_screen)
        return game._potion_menu_screen;
    if (game._inventory_menu_active) {
        if (game._inventory_menu_page === 2 && game._inventory_menu_page2_screen)
            return game._inventory_menu_page2_screen;
        if (game._inventory_menu_screen)
            return game._inventory_menu_screen;
    }
    if (game._pay_menu_active && game._pay_menu_screen)
        return game._pay_menu_screen;
    if (game._loot_menu_active && game._loot_menu_screen)
        return game._loot_menu_screen;
    if (game._herecmd_menu_active && game._herecmd_menu_screen)
        return game._herecmd_menu_screen;
    if (game._bones_unlink_prompt_active && game._bones_unlink_prompt_screen)
        return game._bones_unlink_prompt_screen;
    if (game._terminal_exit_screen_active && game._terminal_exit_screen)
        return game._terminal_exit_screen;
    if (game._direction_help_active && game._direction_help_screen)
        return game._direction_help_screen;
    if (game._getpos_help_active && game._getpos_help_screen)
        return game._getpos_help_screen;
    return null;
}

export function installSerializedScreenHook(display = game.nhDisplay) {
    const term = display?.terminal || display;
    if (!term?.serialize || term._teleportSerializeBase) return;
    const originalSerialize = term.serialize.bind(term);
    Object.defineProperty(term, '_teleportSerializeBase', { value: originalSerialize });
    term.serialize = () => activeSerializedTextScreen() || originalSerialize();
}

function currentLatchedMoreScreen() {
    if (!game._latched_more_screen) return '';
    if (!game._latched_more_use_pending_topline || !game._pending_message) {
        return game._latched_more_screen;
    }
    const rows = String(game._latched_more_screen).split('\n');
    while (rows.length < 24) rows.push('');
    rows[0] = `${game._pending_message}${game._more ? '--More--' : ''}`;
    if (game._more) {
        game._latched_more_cursor = [
            Math.min(terminalCellWidth(rows[0]), COLNO - 1),
            0,
            1,
        ];
    }
    return rows.slice(0, 24).join('\n');
}

// ── Build screen output ──
function _buildScreenOutput(options = {}) {
    const display = game?.nhDisplay;
    if (!display) return;
    if (game._latched_more_screen) {
        const screen = currentLatchedMoreScreen();
        renderTextScreen(display, screen, game._latched_more_cursor || null);
        return;
    }
    if (game._startup_legacy_pager_active && game._startup_legacy_pager_screen) {
        renderTextScreen(display, game._startup_legacy_pager_screen, game._startup_legacy_pager_cursor || null);
        return;
    }
    if (game._tutorial_prompt_active && game._tutorial_prompt_screen) {
        renderTextScreen(display, game._tutorial_prompt_screen, game._tutorial_prompt_cursor || null);
        return;
    }
    if (game._spell_menu_active && game._spell_menu_screen) {
        renderTextScreen(display, game._spell_menu_screen, game._spell_menu_cursor || null);
        return;
    }
    if (game._spell_cast_menu_active && game._spell_cast_menu_screen) {
        renderTextScreen(display, game._spell_cast_menu_screen, game._spell_cast_menu_cursor || null);
        return;
    }
    if (game._help_menu_active && game._help_menu_screen) {
        renderTextScreen(display, game._help_menu_screen, game._help_menu_cursor || null);
        return;
    }
    if (game._help_text_active && game._help_text_screen) {
        renderTextScreen(display, game._help_text_screen, game._help_text_cursor || null);
        return;
    }
    if (game._options_window_active && game._options_window_screen) {
        renderTextScreen(display, game._options_window_screen, game._options_window_cursor || null);
        return;
    }
    if (game._look_window_active && game._look_window_screen) {
        renderTextScreen(display, game._look_window_screen, game._look_window_cursor || null);
        return;
    }
    if (game._travel_tip_screen_active && game._travel_tip_screen) {
        renderTextScreen(display, game._travel_tip_screen, game._travel_tip_screen_cursor || null);
        return;
    }
    if (game._terrain_window_active && game._terrain_window_screen) {
        renderTextScreen(display, game._terrain_window_screen, game._terrain_window_cursor || null);
        return;
    }
    if (game._disclosure_window_active && game._disclosure_window_screen) {
        renderTextScreen(display, game._disclosure_window_screen, game._disclosure_window_cursor || null);
        return;
    }
    if (game._intrinsic_menu_active && game._intrinsic_menu_screen) {
        renderTextScreen(display, game._intrinsic_menu_screen, game._intrinsic_menu_cursor || null);
        return;
    }
    if (game._name_menu_active && game._name_menu_screen) {
        renderTextScreen(display, game._name_menu_screen, game._name_menu_cursor || null);
        return;
    }
    if (game._enhance_skills_active && game._enhance_skills_screen) {
        renderTextScreen(display, game._enhance_skills_screen, game._enhance_skills_cursor || null);
        return;
    }
    if (game._discovery_window_active && game._discovery_screen) {
        renderTextScreen(display, game._discovery_screen, game._discovery_cursor || null);
        return;
    }
    if (game._attributes_window_active && game._attributes_screen) {
        renderTextScreen(display, game._attributes_screen, game._attributes_cursor || null);
        return;
    }
    if (game._level_teleport_menu_active && game._level_teleport_menu_screen) {
        renderTextScreen(display, game._level_teleport_menu_screen, game._level_teleport_menu_cursor || null);
        return;
    }
    if (game._wizidentify_menu_active && game._wizidentify_menu_screen) {
        renderTextScreen(display, game._wizidentify_menu_screen, game._wizidentify_menu_cursor || null);
        return;
    }
    if (game._inventory_action_menu_active && game._inventory_action_menu_screen) {
        renderTextScreen(display, game._inventory_action_menu_screen, game._inventory_action_menu_cursor || null);
        return;
    }
    if (game._inventory_prompt_menu_active && game._inventory_prompt_menu_screen) {
        renderTextScreen(display, game._inventory_prompt_menu_screen, game._inventory_prompt_menu_cursor || null);
        return;
    }
    if (game._throw_inventory_menu_active) {
        if (game._throw_inventory_menu_page === 2 && game._throw_inventory_menu_page2_screen) {
            renderTextScreen(display, game._throw_inventory_menu_page2_screen, game._throw_inventory_menu_page2_cursor || null);
            return;
        }
        if (game._throw_inventory_menu_screen) {
            renderTextScreen(display, game._throw_inventory_menu_screen, game._throw_inventory_menu_cursor || null);
            return;
        }
    }
    if (game._potion_menu_active && game._potion_menu_screen) {
        renderTextScreen(display, game._potion_menu_screen, game._potion_menu_cursor || null);
        return;
    }
    if (game._inventory_menu_active) {
        if (game._inventory_menu_page === 2 && game._inventory_menu_page2_screen) {
            renderTextScreen(display, game._inventory_menu_page2_screen, game._inventory_menu_page2_cursor || null);
            return;
        }
        if (game._inventory_menu_screen) {
            renderTextScreen(display, game._inventory_menu_screen, game._inventory_menu_cursor || null);
            return;
        }
    }
    if (game._pay_menu_active && game._pay_menu_screen) {
        renderTextScreen(display, game._pay_menu_screen, game._pay_menu_cursor || null);
        return;
    }
    if (game._loot_menu_active && game._loot_menu_screen) {
        renderTextScreen(display, game._loot_menu_screen, game._loot_menu_cursor || null);
        return;
    }
    if (game._herecmd_menu_active && game._herecmd_menu_screen) {
        renderTextScreen(display, game._herecmd_menu_screen, game._herecmd_menu_cursor || null);
        return;
    }
    if (game._bones_unlink_prompt_active && game._bones_unlink_prompt_screen) {
        renderTextScreen(display, game._bones_unlink_prompt_screen, game._bones_unlink_prompt_cursor || null);
        return;
    }
    if (game._terminal_exit_screen_active && game._terminal_exit_screen) {
        renderTextScreen(display, game._terminal_exit_screen, game._terminal_exit_cursor || null);
        return;
    }
    if (game._direction_help_active && game._direction_help_screen) {
        renderTextScreen(display, game._direction_help_screen, game._direction_help_cursor || null);
        return;
    }
    if (game._getpos_help_active && game._getpos_help_screen) {
        renderTextScreen(display, game._getpos_help_screen, game._getpos_help_cursor || null);
        return;
    }
    const fullMapRedraw = !!options.fullMap
        || !!game._swallowed_map_active
        || !!game._swallowed_latched_overlay;
    const floorListActive = Array.isArray(game._floor_list_lines) && game._floor_list_lines.length > 0;
    const toplineResidue = (!game._pending_message && !game._more && !floorListActive)
        ? (game._topline_residue || '')
        : '';
    const toplineMessage = game._pending_message || toplineResidue;
    const moreSuffix = game._pending_message && game._more && !floorListActive ? '--More--' : '';
    let output = '';
    // Row 0: message
    output += toplineMessage + moreSuffix + '\n';

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
        if (fullMapRedraw) display.clearScreen();
        else {
            display.clearRow(0);
            display.clearRow(22);
            display.clearRow(23);
        }
        // Message line
        const msg = toplineMessage + moreSuffix;
        const pending = game._pending_message || toplineResidue;
        const wrapCols = game._pending_message_wrap_cols || 0;
        if (wrapCols && !game._more_next_message_row) {
            const first = msg.slice(0, wrapCols);
            const rest = msg.slice(wrapCols);
            for (let c = 0; c < Math.min(first.length, display.cols); c++)
                display.setCell(c, 0, first[c], NO_COLOR, 0);
            if (rest) {
                for (let c = 0; c < display.cols; c++)
                    display.setCell(c, 1, ' ', NO_COLOR, 0);
                for (let c = 0; c < Math.min(rest.length, display.cols); c++)
                    display.setCell(c, 1, rest[c], NO_COLOR, 0);
            }
        } else if (game._more && game._more_next_message_row) {
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
        if (!floorListActive && !fullMapRedraw && game._floor_list_last_clear) {
            const { clearCol, clearEnd, rows } = game._floor_list_last_clear;
            for (let row = 1; row <= Math.min(21, rows || 0); row++)
                for (let c = clearCol; c < Math.min(display.cols, clearEnd || display.cols); c++)
                    display.setCell(c, row, ' ', NO_COLOR, 0);
            game._floor_list_last_clear = null;
        } else if (!floorListActive) {
            game._floor_list_last_clear = null;
        }
        // Map — write characters to grid (DEC → Unicode for browser display)
        if (!game._swallowed_map_active && !game._swallowed_latched_overlay) {
            for (let y = 0; y < ROWNO; y++) {
                for (let x = 1; x < COLNO; x++) {
                    const loc = game.level?.at(x, y);
                    if (!loc) continue;
                    if (fullMapRedraw || loc.gnew) write_map_cell(display, x, y, loc, !!loc.gnew);
                    loc.gnew = 0;
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
            const clearCol = Math.max(0, col - 1);
            const maxLineLength = Math.max(0, ...game._floor_list_lines.map((line) => (line || '').length));
            const moreLength = game._floor_list_show_more !== false ? '--More--'.length : 0;
            const clearEnd = game._floor_list_clear_to_edge || game._floor_list_show_more !== false
                ? display.cols
                : Math.min(display.cols, Math.max(clearCol + 1, col + Math.max(maxLineLength, moreLength) + 1));
            game._floor_list_last_clear = {
                clearCol,
                clearEnd,
                rows: Math.min(21, game._floor_list_lines.length
                    + (game._floor_list_show_more !== false ? 1 : 0)),
            };
            for (let i = 0; i < game._floor_list_lines.length; i++) {
                const line = game._floor_list_lines[i] || '';
                const row = i + 1;
                const inverse = game._floor_list_show_more === false
                    && line
                    && line !== '(end)'
                    && !/^(?:[a-z]|\$) [+-] /.test(line);
                for (let c = clearCol; c < clearEnd; c++)
                    display.setCell(c, row, ' ', NO_COLOR, 0);
                for (let c = 0; c < Math.min(line.length, display.cols - col); c++)
                    display.setCell(col + c, row, line[c], NO_COLOR, inverse ? ATR_INVERSE : 0);
            }
            if (game._floor_list_show_more !== false) {
                const more = '--More--';
                const row = Math.min(21, game._floor_list_lines.length + 1);
                for (let c = clearCol; c < clearEnd; c++)
                    display.setCell(c, row, ' ', NO_COLOR, 0);
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
        else if (msg && game._more && !floorListActive)
            display.setCursor(Math.min(terminalCellWidth(msg), display.cols - 1), 0);
        else if (game._prompt_cursor) display.setCursor(game._prompt_cursor[0], game._prompt_cursor[1]);
        else if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    const fullMap = !!game._full_map_redraw_pending;
    const blockedByLatchedMore = fullMap && !!game._latched_more_screen;
    game._full_map_redraw_pending = false;
    _buildScreenOutput({ fullMap });
    if (blockedByLatchedMore) {
        // C refs: win/tty/topl.c:more(), src/display.c:docrt().
        // A full redraw requested while a tty More frame is latched must
        // survive until that frame is dismissed; rendering the old More screen
        // is not the redraw itself.
        game._full_map_redraw_pending = true;
    }
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._swallowed_overlay = null;
    game._pending_message = '';
    game._topline_residue = '';
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// ── pline ──
export async function pline(msg) {
    game._topline_residue = '';
    game._pending_message = msg;
    game._travel_description_pending = false;
    game._pending_message_wrap_cols = 0;
    game._last_topline_message = msg;
    game._last_topline_can_force_more = false;
}

export async function append_pline(msg) {
    if (game._pending_message) {
        const packed = `${game._pending_message}  ${msg}`;
        game._pending_message = packed;
        game._last_topline_message = packed;
        game._last_topline_can_force_more = false;
        if (packed.length >= (game.nhDisplay?.cols || COLNO)) queue_more_prompt();
    } else {
        await pline(msg);
    }
}

export function topline_can_pack_message(current, next) {
    // C ref: win/tty/topl.c:update_topl().
    const cols = game.nhDisplay?.cols || COLNO;
    const oldText = String(current || '');
    const nextText = String(next || '');
    return oldText.length > 0
        && nextText.length > 0
        && nextText.length + oldText.length + 3 < cols - 8
        && !nextText.startsWith('You die');
}

function isSimpleMonsterHitYouLineForStatus(line) {
    return /^[A-Z][^!]* (?:hits(?: again)?|bites|stings|kicks|butts|touches you|pricks(?: .+)?|misses|just misses)!$/.test(line || '');
}

function clearFatalPackedMonsterHitStatusLatch() {
    if (!game._monster_death_pending
        || !game._fatal_monster_attack_paused
        || !game._monster_fatal_preserve_hit_status) return;
    if (!(game.wizard || game.flags?.debug || game.flags?.explore)) return;
    const line = game._pending_message || '';
    if (!line.includes('  ')
        || !String(line).split('  ').every(isSimpleMonsterHitYouLineForStatus)) return;
    // C refs: src/mhitu.c:hitmu(), win/tty/topl.c:update_topl(),
    // src/end.c:done().  Wizard/explore fatal prompts advance packed simple
    // hit chains to HP 0; ordinary death/disclosure keeps the pre-fatal-hit
    // status until disclose() starts.
    game._monster_fatal_preserve_hit_status = false;
    game._death_preserve_latched_status = false;
    game._latched_status_uhp = 0;
}

export function queue_more_prompt(count = 1) {
    clearFatalPackedMonsterHitStatusLatch();
    game._more_dismissals_remaining = (game._more_dismissals_remaining || 0) + Math.max(1, count);
    game._more = true;
}

function terminalCellWidth(text) {
    let width = 0;
    const s = String(text || '');
    for (let i = 0; i < s.length; i++) {
        const ch = s[i];
        if (ch === '\x0e' || ch === '\x0f') continue;
        if (ch === '\x1b' && s[i + 1] === '[') {
            let j = i + 2;
            while (j < s.length && !/[A-Za-z]/.test(s[j])) j++;
            const final = s[j] || '';
            const body = s.slice(i + 2, j);
            if (final === 'C') width += Number(body || 1) || 1;
            i = j;
            continue;
        }
        width++;
    }
    return width;
}

export function clear_pending_message() {
    const petKillOverlay = game._pet_kill_more_overlay || null;
    game._pet_kill_more_overlay = null;
    const hadContinuationRow = !!(game._more_next_message_row || game._message_continuation_row);
    game._pending_message = '';
    game._simple_timed_repeat_stop_after_pending = false;
    game._travel_description_pending = false;
    game._topline_residue = '';
    game._pending_message_wrap_cols = 0;
    game._more = false;
    game._more_next_message_row = false;
    game._message_continuation_row = '';
    game._more_dismissals_remaining = 0;
    game._hero_melee_message_pending = false;
    game._pet_combat_more_latched = false;
    game._pet_combat_pending_boundary = false;
    game._pet_miss_prompt_after_resume = false;
    game._pet_miss_prompt_preserve_on_dismiss = false;
    game._prompt_cursor = null;
    game._packed_monster_more_candidate = false;
    game._monster_more_accepts_any_key = false;
    game._floor_list_lines = null;
    game._floor_list_col = null;
    game._floor_list_show_more = true;
    game._floor_list_clear_to_edge = false;
    game._floor_list_pauses_turn = false;
    if (petKillOverlay) {
        newsym(petKillOverlay.oldX, petKillOverlay.oldY);
        newsym(petKillOverlay.x, petKillOverlay.y);
    }
    if (hadContinuationRow) game._full_map_redraw_pending = true;
}
