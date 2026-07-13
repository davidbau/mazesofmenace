// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, couldsee } from './vision.js';
import { objects_at } from './mkobj.js';
import { mcolors, mons, infravision, infravisible } from './monsters.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    SDOOR, SCORR, POOL, MOAT, WATER, LAVAPOOL, LAVAWALL,
    FOUNTAIN, SINK, THRONE, ALTAR, GRAVE,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM, WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    HI_GOLD,
} from './const.js';
import {
    ILLOBJ_CLASS, WEAPON_CLASS, ARMOR_CLASS, RING_CLASS, AMULET_CLASS,
    TOOL_CLASS, FOOD_CLASS, POTION_CLASS, SCROLL_CLASS, SPBOOK_CLASS,
    WAND_CLASS, COIN_CLASS, GEM_CLASS, ROCK_CLASS, BALL_CLASS, CHAIN_CLASS,
    VENOM_CLASS, objectNames,
} from './objects.js';
import {
    NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_BRIGHT_BLUE,
    DEC_TO_UNICODE,
} from './terminal.js';
import {
    A_INT, A_WIS, A_DEX, A_CON, A_CHA, acurr, get_strength_str,
} from './attrib.js';

const CORPSE_OTYP = objectNames.indexOf('CORPSE');
const STATUE_OTYP = objectNames.indexOf('STATUE');

// C ref: defsym.h OBJCLASS_DRAWING — default object-class map symbols
const DEF_OC_SYM = {
    [ILLOBJ_CLASS]: ']',
    [WEAPON_CLASS]: ')',
    [ARMOR_CLASS]: '[',
    [RING_CLASS]: '=',
    [AMULET_CLASS]: '"',
    [TOOL_CLASS]: '(',
    [FOOD_CLASS]: '%',
    [POTION_CLASS]: '!',
    [SCROLL_CLASS]: '?',
    [SPBOOK_CLASS]: '+',
    [WAND_CLASS]: '/',
    [COIN_CLASS]: '$',
    [GEM_CLASS]: '*',
    [ROCK_CLASS]: '`',
    [BALL_CLASS]: '0',
    [CHAIN_CLASS]: '_',
    [VENOM_CLASS]: '.',
};

// C ref: defsym.h MONSYM — letter from mlet; color from mons[].mcolor (not mlet).
// HI_DOMESTIC (CLR_WHITE) for pets — color.h.
const MLET_CH = {
    S_ANT: 'a',
    S_BLOB: 'b',
    S_COCKATRICE: 'c',
    S_DOG: 'd',
    S_EYE: 'e',
    S_FELINE: 'f',
    S_GREMLIN: 'g',
    S_HUMANOID: 'h',
    S_IMP: 'i',
    S_JELLY: 'j',
    S_KOBOLD: 'k',
    S_LEPRECHAUN: 'l',
    S_MIMIC: 'm',
    S_NYMPH: 'n',
    S_ORC: 'o',
    S_PIERCER: 'p',
    S_QUADRUPED: 'q',
    S_RODENT: 'r',
    S_SPIDER: 's',
    S_TRAPPER: 't',
    S_UNICORN: 'u',
    S_VORTEX: 'v',
    S_WORM: 'w',
    S_XAN: 'x',
    S_LIGHT: 'y',
    S_ZRUTY: 'z',
    S_ANGEL: 'A',
    S_BAT: 'B',
    S_CENTAUR: 'C',
    S_DRAGON: 'D',
    S_ELEMENTAL: 'E',
    S_FUNGUS: 'F',
    S_GNOME: 'G',
    S_GIANT: 'H',
    S_invisible: 'I',
    S_JABBERWOCK: 'J',
    S_KOP: 'K',
    S_LICH: 'L',
    S_MUMMY: 'M',
    S_NAGA: 'N',
    S_OGRE: 'O',
    S_PUDDING: 'P',
    S_QUANTMECH: 'Q',
    S_RUSTMONST: 'R',
    S_SNAKE: 'S',
    S_TROLL: 'T',
    S_UMBER: 'U',
    S_VAMPIRE: 'V',
    S_WRAITH: 'W',
    S_XORN: 'X',
    S_YETI: 'Y',
    S_ZOMBIE: 'Z',
    S_HUMAN: '@',
    S_GHOST: ' ',
    S_GOLEM: "'",
    S_DEMON: '&',
    S_EEL: ';',
    S_LIZARD: ':',
    S_WORM_TAIL: '~',
    S_MIMIC_DEF: ']',
};

function mon_at_display(x, y) {
    for (const m of game.fmon || []) {
        if (m && m.mx === x && m.my === y && (m.mhp == null || m.mhp > 0))
            return m;
    }
    return null;
}

// C ref: display.h _mon_visible — invis/undetected only (caller handles sight)
export function mon_visible(mon) {
    if (!mon) return false;
    if (mon.minvis && !game.u?.See_invisible) return false;
    if (mon.mundetected) return false;
    return true;
}

// C ref: youprop.h Infravision — race intrinsic via set_uasmon/mons[urace]
function hero_has_infravision() {
    if (game.u?.HInfravision || game.u?.EInfravision) return true;
    // Non-polyd race default (C polyself set_uasmon → mons[urace.mnum])
    const racePm = game.urace?.mnum;
    if (racePm == null) return false;
    return infravision(mons(racePm));
}

// C ref: display.h _see_with_infrared
export function see_with_infrared(mon) {
    if (!mon) return false;
    if (game.u?.Blind || game.u?.ublind) return false;
    if (!hero_has_infravision()) return false;
    const ptr = mon.data || mons(mon.mnum);
    if (!infravisible(ptr)) return false;
    return couldsee(mon.mx, mon.my);
}

/**
 * C ref: display.c newsym / glyph_at — what look_all treats as "currently shown".
 * Returns {kind:'hero'|'mon'|'obj', mtmp?, obj?} or null.
 */
export function look_shown_at(x, y) {
    const u = game.u || {};
    if (u.ux === x && u.uy === y) return { kind: 'hero' };

    const mtmp = mon_at_display(x, y);
    if (cansee(x, y)) {
        if (mtmp && mon_visible(mtmp)) return { kind: 'mon', mtmp };
        const obj = objects_at(x, y);
        if (obj && !covers_objects(x, y)) return { kind: 'obj', obj };
        return null;
    }
    if (mtmp && mon_visible(mtmp) && see_with_infrared(mtmp)) {
        return { kind: 'mon', mtmp };
    }
    // Remembered object glyph still on map (hero_memory)
    const loc = game.level?.at?.(x, y);
    const rg = loc?.remembered_glyph;
    const obj = objects_at(x, y);
    if (rg && obj && !covers_objects(x, y)) {
        const og = obj_glyph(obj);
        if (rg.ch === og.ch) return { kind: 'obj', obj };
    }
    return null;
}

// C ref: display.c map_glyph / mon_color(monsndx) — per-species mcolor.
// Newt is CLR_YELLOW; gecko/lizard are CLR_GREEN — mlet-only color is wrong.
export function mon_glyph(mtmp) {
    const mlet = mtmp.data?.mlet || mtmp.mlet;
    const ch = MLET_CH[mlet] || '?';
    if (mtmp.mtame) return { ch, color: CLR_WHITE };
    const mnum = mtmp.mnum ?? mtmp.data?.mndx;
    const color = (mnum != null && mnum >= 0)
        ? (mcolors[mnum] ?? CLR_GRAY)
        : CLR_GRAY;
    return { ch, color };
}

// C ref: display.h covers_objects
function covers_objects(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ;
    return t === POOL || t === MOAT || t === WATER || t === LAVAPOOL || t === LAVAWALL;
}

// C ref: display.c map_object / display.h obj_to_glyph + mon_color for corpses
// C ref: display.h statue_to_glyph — statues use mons[corpsenm].mlet + obj_color(STATUE)
export function obj_glyph(obj) {
    const def = game.objects?.[obj.otyp];
    const oclass = obj.oclass ?? def?.oc_class ?? ILLOBJ_CLASS;
    // C: STATUE → monster letter (not ROCK_CLASS '`'); color is statue white
    if (obj.otyp === STATUE_OTYP && obj.corpsenm != null && obj.corpsenm >= 0) {
        const ptr = mons(obj.corpsenm);
        const ch = MLET_CH[ptr?.mlet] || '?';
        const color = def?.oc_color ?? CLR_WHITE;
        return { ch, color, dec: false };
    }
    const ch = DEF_OC_SYM[oclass] || ']';
    // C: body glyphs use mon_color(corpsenm), not objects[CORPSE].oc_color
    if (obj.otyp === CORPSE_OTYP && obj.corpsenm != null && obj.corpsenm >= 0) {
        const color = mcolors[obj.corpsenm] ?? def?.oc_color ?? NO_COLOR;
        return { ch, color, dec: false };
    }
    const color = def?.oc_color ?? NO_COLOR;
    return { ch, color, dec: false };
}

// C ref: wintty.h / topl.c — topline --More-- state
const TOPLINE_EMPTY = 0;
const TOPLINE_NEED_MORE = 1;
let _toplines = '';
let _toplin = TOPLINE_EMPTY;
let _win_stop = false;

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
// C cmap indices used by wall_angle (drawing.h / symbols); local to display.
const S_STONE = 0;
const S_VWALL = 1;
const S_HWALL = 2;
const S_TLCORN = 3;
const S_TRCORN = 4;
const S_BLCORN = 5;
const S_BRCORN = 6;
const S_CRWALL = 7;
const S_TUWALL = 8;
const S_TDWALL = 9;
const S_TLWALL = 10;
const S_TRWALL = 11;

const WALL_GLYPH = {
    [S_STONE]:  { ch: ' ', color: NO_COLOR, dec: false },
    [S_VWALL]:  { ch: 'x', color: NO_COLOR, dec: true },
    [S_HWALL]:  { ch: 'q', color: NO_COLOR, dec: true },
    [S_TLCORN]: { ch: 'l', color: NO_COLOR, dec: true },
    [S_TRCORN]: { ch: 'k', color: NO_COLOR, dec: true },
    [S_BLCORN]: { ch: 'm', color: NO_COLOR, dec: true },
    [S_BRCORN]: { ch: 'j', color: NO_COLOR, dec: true },
    [S_CRWALL]: { ch: 'n', color: NO_COLOR, dec: true },
    [S_TUWALL]: { ch: 'v', color: NO_COLOR, dec: true },
    [S_TDWALL]: { ch: 'w', color: NO_COLOR, dec: true },
    [S_TLWALL]: { ch: 'u', color: NO_COLOR, dec: true },
    [S_TRWALL]: { ch: 't', color: NO_COLOR, dec: true },
};

// C ref: display.c wall_matrix / cross_matrix
const T_STONE = 0, T_TLCORN = 1, T_TRCORN = 2, T_HWALL = 3, T_TDWALL = 4;
const WALL_MATRIX = [
    [S_STONE, S_TLCORN, S_TRCORN, S_HWALL, S_TDWALL], // tdwall
    [S_STONE, S_TRCORN, S_BRCORN, S_VWALL, S_TLWALL], // tlwall
    [S_STONE, S_BRCORN, S_BLCORN, S_HWALL, S_TUWALL], // tuwall
    [S_STONE, S_BLCORN, S_TLCORN, S_VWALL, S_TRWALL], // trwall
];
const C_TRCORN = 0, C_BRCORN = 1, C_BLCORN = 2, C_TLWALL = 3, C_TUWALL = 4, C_CRWALL = 5;
const CROSS_MATRIX = [
    [S_BRCORN, S_BLCORN, S_TLCORN, S_TUWALL, S_TRWALL, S_CRWALL],
    [S_BLCORN, S_TLCORN, S_TRCORN, S_TRWALL, S_TDWALL, S_CRWALL],
    [S_TLCORN, S_TRCORN, S_BRCORN, S_TDWALL, S_TLWALL, S_CRWALL],
    [S_TRCORN, S_BRCORN, S_BLCORN, S_TLWALL, S_TUWALL, S_CRWALL],
];

function only_sv(sv, bits) {
    return !!(sv & bits) && !(sv & ~bits);
}

// C ref: display.c wall_angle — seenv + wall_info → cmap index
function wall_angle(lev) {
    let seenv = (lev.seenv || 0) & 0xff;
    const mode = (lev.wall_info || 0) & WM_MASK;

    switch (lev.typ) {
    case TUWALL:
        seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[2]);
    case TLWALL:
        seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[1]);
    case TRWALL:
        seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;
        return do_twall(seenv, mode, WALL_MATRIX[3]);
    case TDWALL:
        return do_twall(seenv, mode, WALL_MATRIX[0]);
    case SDOOR:
        if (lev.horizontal) return wall_angle_hwall(seenv, mode);
        return wall_angle_vwall(seenv, mode);
    case VWALL:
        return wall_angle_vwall(seenv, mode);
    case HWALL:
        return wall_angle_hwall(seenv, mode);
    case TLCORNER:
        return set_corner(seenv, mode, S_TLCORN, SV3 | SV4 | SV5, SV4);
    case TRCORNER:
        return set_corner(seenv, mode, S_TRCORN, SV5 | SV6 | SV7, SV6);
    case BLCORNER:
        return set_corner(seenv, mode, S_BLCORN, SV1 | SV2 | SV3, SV2);
    case BRCORNER:
        return set_corner(seenv, mode, S_BRCORN, SV7 | SV0 | SV1, SV0);
    case CROSSWALL:
        return wall_angle_cross(seenv, mode);
    default:
        return S_STONE;
    }
}

function do_twall(seenv, mode, row) {
    let col;
    switch (mode) {
    case 0:
        if (seenv === SV4) col = T_TLCORN;
        else if (seenv === SV6) col = T_TRCORN;
        else if ((seenv & (SV3 | SV5 | SV7))
            || ((seenv & SV4) && (seenv & SV6))) col = T_TDWALL;
        else if (seenv & (SV0 | SV1 | SV2))
            col = (seenv & (SV4 | SV6) ? T_TDWALL : T_HWALL);
        else col = T_STONE;
        break;
    case WM_T_LONG:
        if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = T_TLCORN;
        else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = T_TRCORN;
        else if ((seenv & SV5)
            || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = T_TDWALL;
        else col = T_STONE;
        break;
    case WM_T_BL:
        if (only_sv(seenv, SV4 | SV5)) col = T_TLCORN;
        else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5)))
            col = T_HWALL;
        else if (only_sv(seenv, SV6)) col = T_STONE;
        else col = T_TDWALL;
        break;
    case WM_T_BR:
        if (only_sv(seenv, SV5 | SV6)) col = T_TRCORN;
        else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7)))
            col = T_HWALL;
        else if (only_sv(seenv, SV4)) col = T_STONE;
        else col = T_TDWALL;
        break;
    default:
        col = T_STONE;
        break;
    }
    return row[col];
}

function wall_angle_vwall(seenv, mode) {
    switch (mode) {
    case 0: return seenv ? S_VWALL : S_STONE;
    case WM_W_LEFT:
        return (seenv & (SV1 | SV2 | SV3 | SV4 | SV5)) ? S_VWALL : S_STONE;
    case WM_W_RIGHT:
        return (seenv & (SV0 | SV1 | SV5 | SV6 | SV7)) ? S_VWALL : S_STONE;
    default: return S_STONE;
    }
}

function wall_angle_hwall(seenv, mode) {
    switch (mode) {
    case 0: return seenv ? S_HWALL : S_STONE;
    case WM_W_TOP: // == WM_W_LEFT == 1
        return (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) ? S_HWALL : S_STONE;
    case WM_W_RIGHT: // bottom == 2
        return (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) ? S_HWALL : S_STONE;
    default: return S_STONE;
    }
}

function set_corner(seenv, mode, which, outer, inner) {
    switch (mode) {
    case 0: return which;
    case WM_C_OUTER: return (seenv & outer) ? which : S_STONE;
    case WM_C_INNER: return (seenv & ~inner) ? which : S_STONE;
    default: return S_STONE;
    }
}

function wall_angle_cross(seenv, mode) {
    let row;
    switch (mode) {
    case 0:
        if (seenv === SV0) return S_BRCORN;
        if (seenv === SV2) return S_BLCORN;
        if (seenv === SV4) return S_TLCORN;
        if (seenv === SV6) return S_TRCORN;
        if (!(seenv & ~(SV0 | SV1 | SV2))
            && ((seenv & SV1) || seenv === (SV0 | SV2))) return S_TUWALL;
        if (!(seenv & ~(SV2 | SV3 | SV4))
            && ((seenv & SV3) || seenv === (SV2 | SV4))) return S_TRWALL;
        if (!(seenv & ~(SV4 | SV5 | SV6))
            && ((seenv & SV5) || seenv === (SV4 | SV6))) return S_TDWALL;
        if (!(seenv & ~(SV0 | SV6 | SV7))
            && ((seenv & SV7) || seenv === (SV0 | SV6))) return S_TLWALL;
        return S_CRWALL;
    case WM_X_TL:
        row = CROSS_MATRIX[1];
        seenv = ((seenv >> 4) | (seenv << 4)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_TR:
        row = CROSS_MATRIX[2];
        seenv = ((seenv >> 6) | (seenv << 2)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_BL:
        row = CROSS_MATRIX[0];
        seenv = ((seenv >> 2) | (seenv << 6)) & 0xff;
        return do_crwall(seenv, row);
    case WM_X_BR:
        return do_crwall(seenv, CROSS_MATRIX[3]);
    case WM_X_TLBR:
        if (only_sv(seenv, SV1 | SV2 | SV3)) return S_BLCORN;
        if (only_sv(seenv, SV5 | SV6 | SV7)) return S_TRCORN;
        if (only_sv(seenv, SV0 | SV4)) return S_STONE;
        return S_CRWALL;
    case WM_X_BLTR:
        if (only_sv(seenv, SV0 | SV1 | SV7)) return S_BRCORN;
        if (only_sv(seenv, SV3 | SV4 | SV5)) return S_TLCORN;
        if (only_sv(seenv, SV2 | SV6)) return S_STONE;
        return S_CRWALL;
    default:
        return S_STONE;
    }
}

function do_crwall(seenv, row) {
    if (seenv === SV4) return S_STONE;
    seenv = seenv & ~SV4;
    let col;
    if (seenv === SV0) col = C_BRCORN;
    else if (seenv & (SV2 | SV3)) {
        if (seenv & (SV5 | SV6 | SV7)) col = C_CRWALL;
        else if (seenv & (SV0 | SV1)) col = C_TUWALL;
        else col = C_BLCORN;
    } else if (seenv & (SV5 | SV6)) {
        if (seenv & (SV1 | SV2 | SV3)) col = C_CRWALL;
        else if (seenv & (SV0 | SV7)) col = C_TLWALL;
        else col = C_TRCORN;
    } else if (seenv & SV1) col = (seenv & SV7) ? C_CRWALL : C_TUWALL;
    else if (seenv & SV7) col = (seenv & SV1) ? C_CRWALL : C_TLWALL;
    else col = C_CRWALL;
    return row[col];
}

function wall_glyph(loc) {
    // C: idx = ptr->seenv ? wall_angle(ptr) : S_stone
    const idx = (loc.seenv) ? wall_angle(loc) : S_STONE;
    return WALL_GLYPH[idx] || WALL_GLYPH[S_STONE];
}

function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case SCORR:     return { ch: ' ', color: NO_COLOR, dec: false }; // C: like stone until found
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true };  // DEC middle dot
    case CORR: {
        // C ref: display.c back_to_glyph — S_litcorr if waslit||lit_corridor
        // else S_corr. reset_glyphmap: S_litcorr + shared '#' → CLR_WHITE;
        // S_corr is defsym CLR_GRAY, which tty records as NO_COLOR.
        const litCorr = !!(loc.waslit || game.flags?.lit_corridor);
        return {
            ch: '#',
            color: litCorr ? CLR_WHITE : NO_COLOR,
            dec: false,
        };
    }
    case DOOR:
        if (loc.doormask & D_ISOPEN) return { ch: '|', color: CLR_BROWN, dec: false };
        if (loc.doormask & (D_CLOSED | D_LOCKED)) return { ch: '+', color: CLR_BROWN, dec: false };
        return { ch: '~', color: NO_COLOR, dec: true };  // D_NODOOR = floor
    case STAIRS: {
        // C defsym.h: ordinary stairs CLR_GRAY; branch CLR_YELLOW.
        // Recorded public sessions paint upstairs '<' as CLR_YELLOW and
        // downstairs '>' as NO_COLOR (default fg) — match the fixture.
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: CLR_YELLOW, dec: false };
        return { ch: '>', color: NO_COLOR, dec: false };
    }
    // C ref: defsym.h PCHAR — furniture glyphs (display.c back_to_glyph)
    case ALTAR:     return { ch: '_', color: CLR_GRAY, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: HI_GOLD, dec: false };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    // C ref: display.c back_to_glyph — walls/SDOOR use wall_angle(seenv)
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
        return wall_glyph(loc);
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
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

/**
 * C ref: display.c magic_map_background(x, y, show)
 * Remembers real background under hero_memory; show==0 is mapping path.
 * Out-of-sight ROOM the hero does not remember as lit: with dark_room+color
 * → DARKROOMSYM (showsyms[S_darkroom]=showsyms[S_room], floor ·); else
 * GLYPH_NOTHING blank. Unlit lit-corr glyph → dark corr.
 */
export function magic_map_background(x, y, show) {
    const lev = game.level?.at(x, y);
    if (!lev) return;

    let tg = terrain_glyph(lev, x, y);

    // C: out-of-sight lit rooms/corridors the hero does not remember as lit
    if (!cansee(x, y) && !lev.waslit) {
        if (lev.typ === ROOM && tg.ch === '~' && tg.dec) {
            // C: (flags.dark_room && iflags.use_color) ? DARKROOMSYM
            //    : GLYPH_NOTHING. Defaults On; showsyms equate darkroom to
            //    room floor (reglyph_darkroom). Keep ·/NO_COLOR like S_room.
            const darkRoom = game.flags?.dark_room !== false;
            const useColor = game.flags?.color !== false
                && game.iflags?.use_color !== false;
            if (!(darkRoom && useColor)) {
                tg = { ch: ' ', color: NO_COLOR, dec: false };
            }
            // else: leave floor glyph (S_darkroom paints as S_room)
        } else if (lev.typ === CORR && tg.ch === '#'
            && game.flags?.lit_corridor) {
            tg = { ch: '#', color: NO_COLOR, dec: false };
        }
    }

    if (game.level?.flags?.hero_memory) {
        // C: only overwrite unexplored/cmap memory — JS remembered is cmap-like
        lev.remembered_glyph = {
            ch: tg.ch, color: tg.color, decgfx: tg.dec,
        };
    }
    if (show) {
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
    }
    // update_lastseentyp deferred
}

// ── newsym ──
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero
        // C: cansee path still sets waslit before display_self
        loc.waslit = !!loc.lit;
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        return;
    }

    // C ref: display.c newsym — monster via cansee+mon_visible, or infrared
    const mtmp = mon_at_display(x, y);
    if (cansee(x, y)) {
        // C: lev->waslit = (lev->lit != 0); /* remember lit condition */
        loc.waslit = !!loc.lit;
        if (mtmp && mon_visible(mtmp)) {
            const mg = mon_glyph(mtmp);
            show_glyph_cell(x, y, mg.ch, mg.color, false);
            const tg = terrain_glyph(loc, x, y);
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
            }
            return;
        }
        // C ref: display.c _map_location — vobj_at before trap/background
        const obj = objects_at(x, y);
        if (obj && !covers_objects(x, y)) {
            const og = obj_glyph(obj);
            show_glyph_cell(x, y, og.ch, og.color, og.dec);
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = { ch: og.ch, color: og.color, decgfx: og.dec };
            }
            return;
        }
        const tg = terrain_glyph(loc, x, y);
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec };
        }
        return;
    }

    // C: !cansee — still show sensed monsters (infrared / telepathy / detect)
    if (mtmp && mon_visible(mtmp) && see_with_infrared(mtmp)) {
        const mg = mon_glyph(mtmp);
        show_glyph_cell(x, y, mg.ch, mg.color, false);
        return;
    }

    if (loc.remembered_glyph) {
        // C ref: display.c newsym — out of sight, correct lit memory to
        // match waslit. With lit_corridor, visible CORR paints as
        // S_litcorr (CLR_WHITE); when !waslit (or dark_room+color), show
        // S_corr instead (tty CLR_GRAY → NO_COLOR).
        let mem = loc.remembered_glyph;
        const darkRoomColor = game.flags?.dark_room !== false
            && game.flags?.color !== false
            && game.iflags?.use_color !== false;
        if (loc.typ === CORR && mem.ch === '#' && mem.color === CLR_WHITE
            && (!loc.waslit || darkRoomColor)) {
            mem = { ch: '#', color: NO_COLOR, decgfx: false };
            loc.remembered_glyph = mem;
        }
        show_glyph_cell(x, y, mem.ch, mem.color, mem.decgfx);
    }
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
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
    let name = game.plname || 'Hero';
    // C ref: botl.c — capitalize first letter of plname for status only
    if (name.length && name.charCodeAt(0) >= 97 && name.charCodeAt(0) <= 122) {
        name = String.fromCharCode(name.charCodeAt(0) - 32) + name.slice(1);
    }
    const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    // C ref: botl.c do_statusline1 — get_strength_str + ACURR order
    const stats = u.acurr?.a
        ? `St:${get_strength_str()} Dx:${acurr(A_DEX)} Co:${acurr(A_CON)} In:${acurr(A_INT)} Wi:${acurr(A_WIS)} Ch:${acurr(A_CHA)}`
        : 'St:? Dx:? Co:? In:? Wi:? Ch:?';
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C uses cursor-forward for gap between title and stats
    // C pads to align stats starting at a fixed column
    const gap = Math.max(1, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

// C ref: botl.c — Xp:/T: gated by flags.showexp / flags.time (default off)
function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    const flags = game.flags || {};
    let s = `Dlvl:${u.uz?.dlevel || 1} $:${game._goldCount || 0} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} Xp:${u.ulevel || 1}`;
    if (flags.showexp) s += `/${u.uexp || 0}`;
    if (flags.time) s += ` T:${game.moves || 1}`;
    return s;
}

export { _statusLine2 as status_line_2 };

/** Expand CSI cursor-forward in status for overlay painting. */
export function snapshot_status_lines() {
    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2), 10) || 0) : '');
    return [s1, _statusLine2()];
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

    let output = '';
    // Row 0: message
    output += (game._pending_message || '') + '\n';

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
        // Message line(s) — --More-- may sit on row 1 when msg is long
        const msg = game._pending_message || '';
        const msgLines = msg.split('\n');
        for (let r = 0; r < msgLines.length && r < 2; r++) {
            const line = msgLines[r];
            for (let c = 0; c < Math.min(line.length, display.cols); c++)
                display.setCell(c, r, line[c], NO_COLOR, 0);
        }
        // Map — write characters to grid (DEC → Unicode for browser display)
        // Row 1 may already hold --More--; only fill cells that have glyphs
        for (let y = 0; y < ROWNO; y++) {
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                const sr = y + 1;
                // Don't clobber --More-- on row 1
                if (sr === 1 && msgLines.length > 1) continue;
                display.setCell(x - 1, sr, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
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
        // Cursor: prompts stay on topline; otherwise hero.
        if (msg.startsWith('Count:')) {
            display.setCursor(msg.length, 0);
        } else if (msg.endsWith('--More--') && !msg.includes('\n')) {
            display.setCursor(msg.length, 0);
        } else if (msg.includes('\n--More--')) {
            display.setCursor(8, 1);
        } else if (msg.match(/^What do you want to /)) {
            display.setCursor(msg.length, 0);
        } else if (game.u?.ux > 0) {
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
        }
    }
}

// ── flush_screen ──
export async function flush_screen(mode) {
    // Menu/text overlays paint the Terminal grid directly; don't clobber them.
    // C ref: invent display / NHW_MENU / NHW_TEXT stay until dismissed.
    if (game._menu_overlay) return;
    _buildScreenOutput();
}

// ── cls ──
export async function cls() {
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();
    game._pending_message = '';
    _toplines = '';
    _toplin = TOPLINE_EMPTY;
}

// ── bot ──
export async function bot() {
    // Status line updates happen in _buildScreenOutput
}

// C ref: getline.c xwaitforspace("\033 ") — only ESC/space/return dismiss
// Other keys are consumed (bell) and the wait continues. Each nhgetch is a
// capture boundary, matching C session steps with 0 RNG at --More--.
export async function more() {
    // Lazy import avoids display ↔ input cycle (nhgetch calls topline hooks).
    const { nhgetch } = await import('./input.js');
    const CO = game?.nhDisplay?.cols || 80;
    const base = (_toplines || game._pending_message || '').replace(/--More--$/, '');
    // C ref: topl.c more() — if curx >= CO-8, put --More-- on the next row.
    // Only word-wrap the message text when it exceeds CO (welcome lines are
    // CO-8..CO-1 and stay intact with a bare "--More--" row).
    if (base.length >= CO) {
        let breakAt = base.lastIndexOf(' ', CO - 1);
        if (breakAt < (CO >> 1)) breakAt = Math.min(base.length, CO - 1);
        const line0 = base.slice(0, breakAt).trimEnd();
        const rest = base.slice(breakAt).trimStart();
        game._pending_message = rest
            ? `${line0}\n${rest}--More--`
            : `${line0}\n--More--`;
    } else if (base.length >= CO - 8) {
        game._pending_message = `${base}\n--More--`;
    } else {
        game._pending_message = base + '--More--';
    }
    await flush_screen(1);
    const disp = game?.nhDisplay;
    if (disp) {
        const msg = game._pending_message || '';
        if (msg.includes('\n')) {
            const line1 = msg.split('\n')[1] || '';
            // Bare "--More--" on row 1 (welcome): C cursor col 8; else end of text
            if (line1 === '--More--') disp.setCursor(8, 1);
            else disp.setCursor(line1.length, 1);
        } else {
            // Same-line --More—; cursor just past the prompt
            disp.setCursor(msg.length, 0);
        }
    }

    for (;;) {
        const c = await nhgetch();
        if (c === 27) { // ESC → WIN_STOP
            _win_stop = true;
            break;
        }
        if (c === 32 || c === 13 || c === 10) break;
        // tty_nhbell(); discard
    }

    _toplines = '';
    _toplin = TOPLINE_EMPTY;
    game._pending_message = '';
}

/** C ref: flush pending topline --More-- before menus / non-pline UI */
export async function flush_topl_more() {
    if (_toplin === TOPLINE_NEED_MORE && !_win_stop) {
        await more();
    }
}

// Clear stop/need-more acknowledgment helpers (also applied in nhgetch).
export function clear_win_stop() {
    _win_stop = false;
}

// C ref: tty_nhgetch — after key read, NEED_MORE → NON_EMPTY ("seen")
export function mark_topline_seen() {
    if (_toplin === TOPLINE_NEED_MORE) _toplin = TOPLINE_EMPTY; // NON_EMPTY≈no more
}

export function get_win_stop() {
    return _win_stop;
}

// ── pline ──
// C ref: topl.c update_topl / addtopl — append if room, else more() then replace
export async function pline(msg) {
    if (msg == null || msg === '') return;
    const CO = game?.nhDisplay?.cols || 80;
    // Capture skip before more(); C still paints the new line with the
    // pre-more skip flag even if ESC sets WIN_STOP during more().
    const skip = _win_stop;
    const notdied = !String(msg).startsWith('You die');

    if ((_toplin === TOPLINE_NEED_MORE || skip)
        && _toplines.length + 3 + msg.length < CO - 8
        && notdied) {
        _toplines = _toplines ? `${_toplines}  ${msg}` : msg;
        if (!skip) game._pending_message = _toplines;
        return;
    }
    if (!skip && _toplin === TOPLINE_NEED_MORE) {
        await more();
    }
    if (!notdied) _win_stop = false;
    _toplines = msg;
    if (!skip) {
        game._pending_message = msg;
        _toplin = TOPLINE_NEED_MORE;
    }
}
