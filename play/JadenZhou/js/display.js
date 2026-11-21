// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { money_cnt } from './u_init.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { rank } from './botl.js';
import { ACURR } from './attrib.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, SDOOR, SCORR,
    IRONBARS, TREE, POOL, MOAT, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE,
    LAVAPOOL, LAVAWALL, ICE, AIR, CLOUD, WATER, DBWALL, DRAWBRIDGE_UP,
    DRAWBRIDGE_DOWN, D_BROKEN, LA_DOWN,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, SEE_INVIS,
    BLINDED, INFRAVISION, TELEPAT, WARN_OF_MON, DETECT_MONSTERS, WARNING,
    NO_TRAP, BEAR_TRAP, PIT, SPIKED_PIT, WEB,
} from './const.js';
import { HALLUC, Is_waterlevel, isok, IS_STWALL } from './const.js';
import {
    objects, BOULDER, STATUE, CORPSE, POTION_CLASS, FIRST_REAL_GEM,
    LAST_GLASS_GEM, FIRST_SPELL, LAST_SPELL,
} from './objects.js';
import { mons, M3_INFRAVISIBLE, M1_MINDLESS } from './monsters.js';
import { def_oc_syms } from './drawing.js';
import { observe_object } from './o_init.js';
import { is_pool } from './makemon.js';
import { t_at } from './trap.js';
import { engr_at } from './engrave.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_GREEN, CLR_CYAN,
         CLR_BLUE, CLR_BRIGHT_BLUE, CLR_RED, CLR_ORANGE, CLR_BLACK, CLR_MAGENTA,
         CLR_BRIGHT_MAGENTA, CLR_BRIGHT_GREEN, DEC_TO_UNICODE } from './terminal.js';

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

// C ref: defsym.h PCHAR() default symbols for the DEC line-drawing
// symbols the DECgraphics symset (dat/symbols) substitutes
const DEF_CMAP_FOR_DEC = {
    '~': '.',                               /* S_room, S_ndoor */
    'q': '-', 'x': '|',                     /* S_hwall, S_vwall */
    'l': '-', 'k': '-', 'm': '-', 'j': '-', /* corners */
    'n': '-', 'v': '-', 'w': '-',           /* S_crwall, S_tuwall, S_tdwall */
    'u': '|', 't': '|',                     /* S_tlwall, S_trwall */
};

// ── Terrain to display character + color + DEC flag ──
// With symset:DECgraphics the DEC line-drawing glyphs are used;
// otherwise the default symbols.
function terrain_glyph(loc, x, y) {
    const tg = terrain_glyph_dec(loc, x, y);
    if (tg.dec && !/^decgraphics$/i.test(game.symset_name || ''))
        return { ch: tg.asc ?? DEF_CMAP_FOR_DEC[tg.ch] ?? tg.ch, color: tg.color, dec: false,
                 cmap: tg.cmap };
    return { ch: tg.ch, color: tg.color, dec: tg.dec, cmap: tg.cmap };
}

// C ref: stairs.c stairway_at()
export function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: stairs.c known_branch_stairs() -- hero knows where the stairs go
function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== game.u?.uz?.dnum && sway.u_traversed);
}

// ── wall modes (display.c set_wall_state() .. wall_angle()) ──

// C ref: rm.h wall mode bits kept in wall_info & WM_MASK
const WM_W_LEFT = 1, WM_W_RIGHT = 2;      /* vertical or horizontal wall */
const WM_W_TOP = WM_W_LEFT, WM_W_BOTTOM = WM_W_RIGHT;
const WM_C_OUTER = 1, WM_C_INNER = 2;     /* corner wall */
const WM_T_LONG = 1, WM_T_BL = 2, WM_T_BR = 3; /* T wall */
const WM_X_TL = 1, WM_X_TR = 2, WM_X_BL = 3, WM_X_BR = 4, /* cross wall */
    WM_X_TLBR = 5, WM_X_BLTR = 6;
const WM_MASK = 0x07;
// C ref: rm.h seen vector bits
const SV0 = 0x01, SV1 = 0x02, SV2 = 0x04, SV3 = 0x08,
    SV4 = 0x10, SV5 = 0x20, SV6 = 0x40, SV7 = 0x80;

// C ref: display.c check_pos()
/*
 * Return 'which' if position is implies an unfinished exterior.  Return
 * zero otherwise.  Unfinished implies outer area is rock or a corridor.
 */
function check_pos(x, y, which) {
    if (!isok(x, y))
        return which;
    const type = game.level.at(x, y).typ;
    /* Everything below POOL, excluding TREE */
    if (IS_STWALL(type) || type === CORR || type === SCORR || type === SDOOR)
        return which;
    return 0;
}

// C ref: display.c more_than_one() (the !WA_VERBOSE macro)
/* Return TRUE if more than one is non-zero. */
function more_than_one(x, y, a, b, c) {
    return !!((a && (b | c)) || (b && (a | c)) || (c && (a | b)));
}

// C ref: display.c set_twall()
/* Return the wall mode for a T wall. */
function set_twall(x0, y0, x1, y1, x2, y2, x3, y3) {
    const is_1 = check_pos(x1, y1, WM_T_LONG);
    const is_2 = check_pos(x2, y2, WM_T_BL);
    const is_3 = check_pos(x3, y3, WM_T_BR);
    if (more_than_one(x0, y0, is_1, is_2, is_3))
        return 0;
    return is_1 + is_2 + is_3;
}

// C ref: display.c set_wall()
/* Return wall mode for a horizontal or vertical wall. */
function set_wall(x, y, horiz) {
    let is_1, is_2;

    if (horiz) {
        is_1 = check_pos(x, y - 1, WM_W_TOP);
        is_2 = check_pos(x, y + 1, WM_W_BOTTOM);
    } else {
        is_1 = check_pos(x - 1, y, WM_W_LEFT);
        is_2 = check_pos(x + 1, y, WM_W_RIGHT);
    }
    if (more_than_one(x, y, is_1, is_2, 0))
        return 0;
    return is_1 + is_2;
}

// C ref: display.c set_corn()
/* Return a wall mode for a corner wall. (x4,y4) is the "inner" position. */
function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {
    const is_1 = check_pos(x1, y1, 1);
    const is_2 = check_pos(x2, y2, 1);
    const is_3 = check_pos(x3, y3, 1);
    const is_4 = check_pos(x4, y4, 1); /* inner location */

    /*
     * All 4 should not be true.  So if the inner location is rock,
     * use it.  If all of the outer 3 are true, use outer.  We currently
     * can't cover the case where only part of the outer is rock, so
     * we just say that all the walls are finished (if not overridden
     * by the inner section).
     */
    if (is_4)
        return WM_C_INNER;
    else if (is_1 && is_2 && is_3)
        return WM_C_OUTER;
    return 0; /* finished walls on all sides */
}

// C ref: display.c set_crosswall()
/* Return mode for a crosswall. */
function set_crosswall(x, y) {
    const is_1 = check_pos(x - 1, y - 1, 1);
    const is_2 = check_pos(x + 1, y - 1, 1);
    const is_3 = check_pos(x + 1, y + 1, 1);
    const is_4 = check_pos(x - 1, y + 1, 1);

    let wmode = is_1 + is_2 + is_3 + is_4;
    if (wmode > 1) {
        if (is_1 && is_3 && (is_2 + is_4 === 0))
            wmode = WM_X_TLBR;
        else if (is_2 && is_4 && (is_1 + is_3 === 0))
            wmode = WM_X_BLTR;
        else
            wmode = 0;
    } else if (is_1)
        wmode = WM_X_TL;
    else if (is_2)
        wmode = WM_X_TR;
    else if (is_3)
        wmode = WM_X_BR;
    else if (is_4)
        wmode = WM_X_BL;

    return wmode;
}

// C ref: display.c xy_set_wall_state()
/* called for every <x,y> by set_wall_state() and for specific <x,y> during
   vault wall repair */
export function xy_set_wall_state(x, y) {
    let wmode;
    const lev = game.level.at(x, y);
    if (!lev) return;

    switch (lev.typ) {
    case SDOOR:
        wmode = set_wall(x, y, lev.horizontal ? 1 : 0);
        break;
    case VWALL:
        wmode = set_wall(x, y, 0);
        break;
    case HWALL:
        wmode = set_wall(x, y, 1);
        break;
    case TDWALL:
        wmode = set_twall(x, y, x, y - 1, x - 1, y + 1, x + 1, y + 1);
        break;
    case TUWALL:
        wmode = set_twall(x, y, x, y + 1, x + 1, y - 1, x - 1, y - 1);
        break;
    case TLWALL:
        wmode = set_twall(x, y, x + 1, y, x - 1, y - 1, x - 1, y + 1);
        break;
    case TRWALL:
        wmode = set_twall(x, y, x - 1, y, x + 1, y + 1, x + 1, y - 1);
        break;
    case TLCORNER:
        wmode = set_corn(x - 1, y - 1, x, y - 1, x - 1, y, x + 1, y + 1);
        break;
    case TRCORNER:
        wmode = set_corn(x, y - 1, x + 1, y - 1, x + 1, y, x - 1, y + 1);
        break;
    case BLCORNER:
        wmode = set_corn(x, y + 1, x - 1, y + 1, x - 1, y, x + 1, y - 1);
        break;
    case BRCORNER:
        wmode = set_corn(x + 1, y, x + 1, y + 1, x, y + 1, x - 1, y - 1);
        break;
    case CROSSWALL:
        wmode = set_crosswall(x, y);
        break;
    default:
        wmode = -1; /* don't set wall info */
        break;
    }

    if (wmode >= 0)
        lev.wall_info = ((lev.wall_info || 0) & ~WM_MASK) | wmode;
}

// C ref: display.c set_wall_state()
/* Called from mklev.  Scan the level and set the wall modes. */
export function set_wall_state() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            xy_set_wall_state(x, y);
}

// C ref: display.c wall_matrix[][] -- T wall results, rows T_d, T_l,
// T_u, T_r; columns T_stone, T_tlcorn, T_trcorn, T_hwall, T_tdwall
const T_d = 0, T_l = 1, T_u = 2, T_r = 3;
const T_stone = 0, T_tlcorn = 1, T_trcorn = 2, T_hwall = 3, T_tdwall = 4;
const wall_matrix = [
    ['S_stone', 'S_tlcorn', 'S_trcorn', 'S_hwall', 'S_tdwall'], /* tdwall */
    ['S_stone', 'S_trcorn', 'S_brcorn', 'S_vwall', 'S_tlwall'], /* tlwall */
    ['S_stone', 'S_brcorn', 'S_blcorn', 'S_hwall', 'S_tuwall'], /* tuwall */
    ['S_stone', 'S_blcorn', 'S_tlcorn', 'S_vwall', 'S_trwall'], /* trwall */
];

// C ref: display.c cross_matrix[][] -- crosswall results, rows C_bl,
// C_tl, C_tr, C_br; columns C_trcorn .. C_crwall
const C_bl = 0, C_tl = 1, C_tr = 2, C_br = 3;
const C_trcorn = 0, C_brcorn = 1, C_blcorn = 2, C_tlwall = 3, C_tuwall = 4,
    C_crwall = 5;
const cross_matrix = [
    ['S_brcorn', 'S_blcorn', 'S_tlcorn', 'S_tuwall', 'S_trwall', 'S_crwall'],
    ['S_blcorn', 'S_tlcorn', 'S_trcorn', 'S_trwall', 'S_tdwall', 'S_crwall'],
    ['S_tlcorn', 'S_trcorn', 'S_brcorn', 'S_tdwall', 'S_tlwall', 'S_crwall'],
    ['S_trcorn', 'S_brcorn', 'S_blcorn', 'S_tlwall', 'S_tuwall', 'S_crwall'],
];

// C ref: display.c wall_angle()
/* Return the defsym (as its name) for a wall the hero has seen, from the
   wall mode and the directions it was seen from (lev->seenv). */
function wall_angle(lev) {
    let seenv = (lev.seenv || 0) & 0xff;
    let row, col, idx;
    const wmode = (lev.wall_info || 0) & WM_MASK;
    const only = (sv, bits) => !!((sv & bits) && !(sv & ~bits));

    switch (lev.typ) {
    case TUWALL:
    case TLWALL:
    case TRWALL:
    case TDWALL:
        if (lev.typ === TUWALL) {
            row = wall_matrix[T_u];
            seenv = (seenv >> 4 | seenv << 4) & 0xff; /* rotate to tdwall */
        } else if (lev.typ === TLWALL) {
            row = wall_matrix[T_l];
            seenv = (seenv >> 2 | seenv << 6) & 0xff; /* rotate to tdwall */
        } else if (lev.typ === TRWALL) {
            row = wall_matrix[T_r];
            seenv = (seenv >> 6 | seenv << 2) & 0xff; /* rotate to tdwall */
        } else {
            row = wall_matrix[T_d];
        }
        /* do_twall: */
        switch (wmode) {
        case 0:
            if (seenv === SV4) {
                col = T_tlcorn;
            } else if (seenv === SV6) {
                col = T_trcorn;
            } else if ((seenv & (SV3 | SV5 | SV7))
                       || ((seenv & SV4) && (seenv & SV6))) {
                col = T_tdwall;
            } else if (seenv & (SV0 | SV1 | SV2)) {
                col = (seenv & (SV4 | SV6) ? T_tdwall : T_hwall);
            } else {
                /* t_warn(lev) */
                col = T_stone;
            }
            break;
        case WM_T_LONG:
            if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) {
                col = T_tlcorn;
            } else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) {
                col = T_trcorn;
            } else if ((seenv & SV5)
                       || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) {
                col = T_tdwall;
            } else {
                /* only SV0|SV1|SV2 */
                col = T_stone;
            }
            break;
        case WM_T_BL:
            if (only(seenv, SV4 | SV5))
                col = T_tlcorn;
            else if ((seenv & (SV0 | SV1 | SV2 | SV7))
                     && !(seenv & (SV3 | SV4 | SV5)))
                col = T_hwall;
            else if (only(seenv, SV6))
                col = T_stone;
            else
                col = T_tdwall;
            break;
        case WM_T_BR:
            if (only(seenv, SV5 | SV6))
                col = T_trcorn;
            else if ((seenv & (SV0 | SV1 | SV2 | SV3))
                     && !(seenv & (SV5 | SV6 | SV7)))
                col = T_hwall;
            else if (only(seenv, SV4))
                col = T_stone;
            else
                col = T_tdwall;
            break;
        default:
            /* impossible("wall_angle: unknown T wall mode %d") */
            col = T_stone;
            break;
        }
        idx = row[col];
        break;

    case SDOOR:
    case VWALL:
    case HWALL:
        if (lev.typ === SDOOR && lev.arboreal_sdoor) {
            idx = 'S_tree';
            break;
        }
        if (lev.typ === HWALL || (lev.typ === SDOOR && lev.horizontal)) {
            /* horiz: */
            switch (wmode) {
            case 0:
                idx = seenv ? 'S_hwall' : 'S_stone';
                break;
            case 1:
                idx = seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? 'S_hwall' : 'S_stone';
                break;
            case 2:
                idx = seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? 'S_hwall' : 'S_stone';
                break;
            default:
                idx = 'S_stone';
                break;
            }
        } else {
            switch (wmode) {
            case 0:
                idx = seenv ? 'S_vwall' : 'S_stone';
                break;
            case 1:
                idx = seenv & (SV1 | SV2 | SV3 | SV4 | SV5) ? 'S_vwall' : 'S_stone';
                break;
            case 2:
                idx = seenv & (SV0 | SV1 | SV5 | SV6 | SV7) ? 'S_vwall' : 'S_stone';
                break;
            default:
                idx = 'S_stone';
                break;
            }
        }
        break;

    case TLCORNER:
    case TRCORNER:
    case BLCORNER:
    case BRCORNER: {
        /* set_corner(idx, lev, which, outer, inner, name) */
        const [which, outer, inner] =
            (lev.typ === TLCORNER) ? ['S_tlcorn', SV3 | SV4 | SV5, SV4]
            : (lev.typ === TRCORNER) ? ['S_trcorn', SV5 | SV6 | SV7, SV6]
            : (lev.typ === BLCORNER) ? ['S_blcorn', SV1 | SV2 | SV3, SV2]
            : ['S_brcorn', SV7 | SV0 | SV1, SV0];
        switch (wmode) {
        case 0:
            idx = which;
            break;
        case WM_C_OUTER:
            idx = seenv & outer ? which : 'S_stone';
            break;
        case WM_C_INNER:
            idx = seenv & ~inner ? which : 'S_stone';
            break;
        default:
            idx = 'S_stone';
            break;
        }
        break;
    }

    case CROSSWALL:
        switch (wmode) {
        case 0:
            if (seenv === SV0)
                idx = 'S_brcorn';
            else if (seenv === SV2)
                idx = 'S_blcorn';
            else if (seenv === SV4)
                idx = 'S_tlcorn';
            else if (seenv === SV6)
                idx = 'S_trcorn';
            else if (!(seenv & ~(SV0 | SV1 | SV2))
                     && ((seenv & SV1) || seenv === (SV0 | SV2)))
                idx = 'S_tuwall';
            else if (!(seenv & ~(SV2 | SV3 | SV4))
                     && ((seenv & SV3) || seenv === (SV2 | SV4)))
                idx = 'S_trwall';
            else if (!(seenv & ~(SV4 | SV5 | SV6))
                     && ((seenv & SV5) || seenv === (SV4 | SV6)))
                idx = 'S_tdwall';
            else if (!(seenv & ~(SV0 | SV6 | SV7))
                     && ((seenv & SV7) || seenv === (SV0 | SV6)))
                idx = 'S_tlwall';
            else
                idx = 'S_crwall';
            break;

        case WM_X_TL:
        case WM_X_TR:
        case WM_X_BL:
        case WM_X_BR:
            if (wmode === WM_X_TL) {
                row = cross_matrix[C_tl];
                seenv = (seenv >> 4 | seenv << 4) & 0xff;
            } else if (wmode === WM_X_TR) {
                row = cross_matrix[C_tr];
                seenv = (seenv >> 6 | seenv << 2) & 0xff;
            } else if (wmode === WM_X_BL) {
                row = cross_matrix[C_bl];
                seenv = (seenv >> 2 | seenv << 6) & 0xff;
            } else {
                row = cross_matrix[C_br];
            }
            /* do_crwall: */
            if (seenv === SV4) {
                idx = 'S_stone';
            } else {
                seenv = seenv & ~SV4; /* strip SV4 */
                if (seenv === SV0) {
                    col = C_brcorn;
                } else if (seenv & (SV2 | SV3)) {
                    if (seenv & (SV5 | SV6 | SV7))
                        col = C_crwall;
                    else if (seenv & (SV0 | SV1))
                        col = C_tuwall;
                    else
                        col = C_blcorn;
                } else if (seenv & (SV5 | SV6)) {
                    if (seenv & (SV1 | SV2 | SV3))
                        col = C_crwall;
                    else if (seenv & (SV0 | SV7))
                        col = C_tlwall;
                    else
                        col = C_trcorn;
                } else if (seenv & SV1) {
                    col = seenv & SV7 ? C_crwall : C_tuwall;
                } else if (seenv & SV7) {
                    col = seenv & SV1 ? C_crwall : C_tlwall;
                } else {
                    /* impossible("wall_angle: bottom of crwall check") */
                    col = C_crwall;
                }
                idx = row[col];
            }
            break;

        case WM_X_TLBR:
            if (only(seenv, SV1 | SV2 | SV3))
                idx = 'S_blcorn';
            else if (only(seenv, SV5 | SV6 | SV7))
                idx = 'S_trcorn';
            else if (only(seenv, SV0 | SV4))
                idx = 'S_stone';
            else
                idx = 'S_crwall';
            break;

        case WM_X_BLTR:
            if (only(seenv, SV0 | SV1 | SV7))
                idx = 'S_brcorn';
            else if (only(seenv, SV3 | SV4 | SV5))
                idx = 'S_tlcorn';
            else if (only(seenv, SV2 | SV6))
                idx = 'S_stone';
            else
                idx = 'S_crwall';
            break;

        default:
            /* impossible("wall_angle: unknown crosswall mode") */
            idx = 'S_stone';
            break;
        }
        break;

    default:
        /* impossible("wall_angle: unexpected wall type %d") */
        idx = 'S_stone';
    }
    return idx;
}

/* C ref: defsym.h S_corr, S_litcorr; display.c map_glyphinfo(): when
   S_litcorr has the same symbol as S_corr (it does in the default and
   DECgraphics symsets) it is shown in CLR_WHITE to tell them apart.
   'cmap' lets newsym() and feel_location() recognize the remembered
   glyph (lev->glyph == cmap_to_glyph(S_litcorr)). */
const S_corr_g = { ch: '#', color: CLR_GRAY, dec: false, cmap: 'S_corr' };
const S_litcorr_g = { ch: '#', color: CLR_WHITE, dec: false, cmap: 'S_litcorr' };

// C ref: display.c back_to_glyph() -- the background glyph of a spot,
// as { ch, color, dec } with the DECgraphics symset's line-drawing
// characters (dat/symbols "DECgraphics") where it overrides defsym.h;
// terrain_glyph() maps those back to the defsym.h defaults (asc) otherwise.
function terrain_glyph_dec(loc, x, y) {
    const typ = loc.typ;
    const arboreal = !!game.level?.flags?.arboreal;
    const S_stone = { ch: ' ', color: NO_COLOR, dec: false };
    const S_tree = { ch: 'g', color: CLR_GREEN, dec: true, asc: '#' };
    const S_room = { ch: '~', color: NO_COLOR, dec: true, cmap: 'S_room' }; /* '.' */
    const S_ndoor = { ch: '~', color: CLR_GRAY, dec: true };   /* '.' */
    const S_hwall = { ch: 'q', color: NO_COLOR, dec: true };   /* '-' */
    const S_vwall = { ch: 'x', color: NO_COLOR, dec: true };   /* '|' */
    switch (typ) {
    case SCORR:
    case STONE:     return arboreal ? S_tree : S_stone;
    case ROOM:      return S_room;
    case CORR:
        /* idx = (ptr->waslit || flags.lit_corridor) ? S_litcorr : S_corr */
        return (loc.waslit || game.flags?.lit_corridor) ? S_litcorr_g : S_corr_g;
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
    case SDOOR: {
        /* idx = ptr->seenv ? wall_angle(ptr) : S_stone */
        if (!loc.seenv)
            return S_stone;
        switch (wall_angle(loc)) {
        case 'S_tree':   return S_tree;
        case 'S_hwall':  return S_hwall;                                  // ─
        case 'S_vwall':  return S_vwall;                                  // │
        case 'S_tlcorn': return { ch: 'l', color: NO_COLOR, dec: true };  // ┌
        case 'S_trcorn': return { ch: 'k', color: NO_COLOR, dec: true };  // ┐
        case 'S_blcorn': return { ch: 'm', color: NO_COLOR, dec: true };  // └
        case 'S_brcorn': return { ch: 'j', color: NO_COLOR, dec: true };  // ┘
        case 'S_crwall': return { ch: 'n', color: NO_COLOR, dec: true };  // ┼
        case 'S_tuwall': return { ch: 'v', color: NO_COLOR, dec: true };  // ┴
        case 'S_tdwall': return { ch: 'w', color: NO_COLOR, dec: true };  // ┬
        case 'S_tlwall': return { ch: 'u', color: NO_COLOR, dec: true };  // ┤
        case 'S_trwall': return { ch: 't', color: NO_COLOR, dec: true };  // ├
        default:         return S_stone;
        }
    }
    case DOOR:
        if (loc.doormask) {
            if (loc.doormask & D_BROKEN)
                return S_ndoor;
            else if (loc.doormask & D_ISOPEN) /* S_hodoor '|' / S_vodoor '-' */
                return { ch: 'a', color: CLR_BROWN, dec: true, asc: loc.horizontal ? '|' : '-' };
            else /* else is closed: S_hcdoor / S_vcdoor */
                return { ch: '+', color: CLR_BROWN, dec: false };
        }
        return S_ndoor;
    case IRONBARS:  return { ch: '|', color: CLR_CYAN, dec: true, asc: '#' };  /* S_bars */
    case TREE:      return S_tree;
    case POOL:
    case MOAT:      return { ch: '`', color: CLR_BLUE, dec: true, asc: '}' };  /* S_pool */
    case STAIRS:
    case LADDER: {
        let down;
        if (loc.ladder) down = !!(loc.ladder & LA_DOWN);
        else down = !(game.level?.upstair?.x === x && game.level?.upstair?.y === y);
        /* S_brupstair/S_brdnstair (and ladders) for known branch stairs */
        const br = known_branch_stairs(stairway_at(x, y));
        if (typ === LADDER)
            return { ch: down ? 'z' : 'y', color: br ? CLR_YELLOW : CLR_BROWN,
                     dec: true, asc: down ? '>' : '<' };
        return { ch: down ? '>' : '<', color: br ? CLR_YELLOW : CLR_GRAY, dec: false };
    }
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case ALTAR:     return { ch: '{', color: CLR_GRAY, dec: true, asc: '_' };  /* S_altar */
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
    case LAVAPOOL:  return { ch: '`', color: CLR_RED, dec: true, asc: '}' };
    case LAVAWALL:  return { ch: '`', color: CLR_ORANGE, dec: true, asc: '}' };
    case ICE:       return { ch: '~', color: CLR_CYAN, dec: true, asc: '.' };
    case AIR:       return { ch: ' ', color: CLR_CYAN, dec: false };
    case CLOUD:     return { ch: '#', color: CLR_GRAY, dec: false };
    case WATER:     return { ch: '`', color: CLR_BLUE, dec: true, asc: '}' };
    case DBWALL:    return { ch: '#', color: CLR_BROWN, dec: false };
    case DRAWBRIDGE_UP: return S_room;
    case DRAWBRIDGE_DOWN: return { ch: '~', color: CLR_BROWN, dec: true, asc: '#' };
    default:        return S_room;
    }
}

// C ref: termcap.c init_hilite() -- hilites[CLR_GRAY] = hilites[NO_COLOR]
// = 0, so term_start_color() emits nothing for gray: it shows as default.
// With the use_darkgray option (iflags.wc2_darkgray, on by default)
// hilites[CLR_BLACK] is bright black, color index 8 like NO_COLOR (the
// recorder's nomux_set_fg() makes the same remap); without it, black is
// shown as blue.
function tty_color(color) {
    if (color === undefined || color === CLR_GRAY)
        return NO_COLOR;
    if (color === CLR_BLACK)
        return (game.iflags?.wc2_darkgray !== false) ? NO_COLOR : CLR_BLUE;
    return color;
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

// C ref: defsym.h MONSYMS -- def_monsyms[].sym, indexed by mlet (S_ANT = 1)
const def_monsyms = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ '&;:~]";

// C ref: display.h m_at() via level.monsters[][]
function mon_at_loc(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && !m.dead) return m;
    return null;
}

// C ref: display.h mon_visible(): not invisible (or hero sees invisible)
// and not hiding
export function mon_visible(mon) {
    const See_invisible = !!(game.u?.uprops?.[SEE_INVIS]?.intrinsic
                             || game.u?.uprops?.[SEE_INVIS]?.extrinsic);
    return (!mon.minvis || See_invisible) && !mon.mundetected;
}

/* C ref: youprop.h -- the hero's property tests canspotmon() needs */
function uprop(p) {
    const P = game.u?.uprops?.[p];
    return !!(P && (P.intrinsic || P.extrinsic));
}
/* C ref: youprop.h Blind -- ((HBlinded || EBlinded) && !BBlinded) */
export function Blind() {
    const P = game.u?.uprops?.[BLINDED];
    return !!(P && (P.intrinsic || P.extrinsic) && !P.blocked);
}

// C ref: display.h _see_with_infrared()
function see_with_infrared(mon) {
    return !Blind() && uprop(INFRAVISION)
           && (mon.data.mflags3 & M3_INFRAVISIBLE) !== 0
           && couldsee(mon.mx, mon.my);
}

// C ref: display.h _canseemon()
export function canseemon(mon) {
    if (mon.wormno)
        throw new Error('canseemon(): worm_known() not ported yet');
    return (cansee(mon.mx, mon.my) || see_with_infrared(mon))
           && mon_visible(mon);
}

// C ref: display.h _tp_sensemon()
function tp_sensemon(mon) {
    const u = game.u;
    const P = u.uprops?.[TELEPAT];
    const Blind_telepat = !!(P && (P.intrinsic || P.extrinsic));
    const Unblind_telepat = !!(P && P.extrinsic);
    const mdistu = (mon.mx - u.ux) ** 2 + (mon.my - u.uy) ** 2;
    return (mon.data.mflags1 & M1_MINDLESS) === 0
           && ((Blind() && Blind_telepat)
               || (Unblind_telepat
                   && mdistu <= (u.unblind_telepat_range ?? 0)));
}

// C ref: display.h MATCH_WARN_OF_MON()
function MATCH_WARN_OF_MON(mon) {
    const wt = game.context.warntype || {};
    return uprop(WARN_OF_MON)
           && (((wt.obj ?? 0) & mon.data.mflags2) !== 0
               || ((wt.polyd ?? 0) & mon.data.mflags2) !== 0
               || (!!wt.species && wt.species === mon.data));
}

// C ref: display.h _sensemon()
export function sensemon(mon) {
    const u = game.u;
    if (u.uinwater)
        throw new Error('sensemon(): Underwater not ported yet');
    return (!u.uswallow || mon === u.ustuck)
           && (uprop(DETECT_MONSTERS) || tp_sensemon(mon)
               || MATCH_WARN_OF_MON(mon));
}

// C ref: display.h canspotmon()
export function canspotmon(mon) {
    return canseemon(mon) || sensemon(mon);
}

// C ref: display.c is_worm_tail() -- the monster found at <x,y> is
// there only by a tail segment
function is_worm_tail(mon, x, y) {
    return !!mon && (x !== mon.mx || y !== mon.my);
}

// C ref: display.h _mon_warning()
function mon_warning(mon) {
    const u = game.u;
    return uprop(WARNING) && !mon.mpeaceful
           && ((mon.mx - u.ux) ** 2 + (mon.my - u.uy) ** 2) < 100 /* mdistu() */
           && Math.trunc((mon.m_lev || 0) / 4) >= (game.context.warnlevel || 0);
}

// C ref: display.c display_monster() -- the plain case: the monster's own
// glyph (mon_to_glyph()), in its mons[] color; mimic appearances,
// ridden-steed flags and warnings are not ported yet
function display_monster(x, y, mon) {
    const ptr = mon.data;
    const ch = def_monsyms[ptr.mlet] ?? '?';
    /* a tame monster gets pet_to_glyph() (mon->mtame && !Hallucination),
       whose glyphs have MG_PET; wintty.c tty_print_glyph() shows those
       with iflags.wc2_petattr when hilite_pet is on */
    const attr = (mon.mtame && !Hallucination() && game.iflags?.wc_hilite_pet)
                 ? game.iflags.wc2_petattr : 0;
    show_glyph_cell(x, y, ch, ptr.mcolor ?? NO_COLOR, false, attr);
}

// C ref: you.h Hallucination
export function Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: display.h newsym_rn2 (rn2_on_display_rng) -- the display RNG is
// separate from the core one; only hallucination draws from it here
function newsym_rn2(x) {
    throw new Error('newsym_rn2(): rn2_on_display_rng not ported yet');
}

// C ref: display.h covers_objects()
function covers_objects(x, y) {
    const typ = game.level.at(x, y).typ;
    return (is_pool(x, y) && !game.u?.uinwater) || typ === LAVAPOOL
           || typ === LAVAWALL;
}

// C ref: display.h vobj_at() -> level.objects[x][y], the top of the pile.
// game.level.objects is fobj (newest first); place_object() puts a
// non-boulder under any boulders, so a boulder is on top when there is one.
export function vobj_at(x, y) {
    let top = null;
    for (const o of game.level?.objects || []) {
        if (o.ox !== x || o.oy !== y || o.where !== 'OBJ_FLOOR') continue;
        if (o.otyp === BOULDER) return o;
        if (!top) top = o;
    }
    return top;
}

// C ref: display.h obj_is_generic()
function obj_is_generic(obj) {
    return !obj.dknown
        && (obj.oclass === POTION_CLASS
            || (obj.otyp >= FIRST_REAL_GEM && obj.otyp <= LAST_GLASS_GEM)
            || (obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL));
}

// C ref: display.h obj_to_glyph() + display.c reset_glyphmap() -- the
// glyph is kept as the { ch, color, decgfx } it maps to: statues show the
// monster's class symbol in the statue's color, corpses '%' in the
// monster's color, generic objects the class's generic object (objects[]
// index oclass), the rest their own objects[] entry; the boulder uses
// SYM_BOULDER, which defaults to the rock class symbol. Pile-top glyphs
// differ only in MG_OBJPILE, which tty shows only with hilite_pile.
function obj_to_glyph(obj, rng) {
    if (obj.otyp === STATUE) {
        if (Hallucination()) rng(2);
        return { ch: def_monsyms[mons[obj.corpsenm].mlet] ?? '?',
                 color: objects[STATUE].oc_color, decgfx: false };
    }
    if (Hallucination()) rng(2);
    if (obj.otyp === CORPSE)
        return { ch: def_oc_syms[objects[CORPSE].oc_class],
                 color: mons[obj.corpsenm].mcolor ?? NO_COLOR, decgfx: false };
    const generic = obj_is_generic(obj);
    const offset = generic ? obj.oclass : obj.otyp;
    /* 'generic' marks glyph_is_generic_object() */
    return { ch: def_oc_syms[objects[offset].oc_class],
             color: objects[offset].oc_color, decgfx: false, generic };
}

// C ref: display.c map_object()
function map_object(obj, show) {
    const x = obj.ox, y = obj.oy;
    const loc = game.level.at(x, y);
    let glyph = obj_to_glyph(obj, newsym_rn2);

    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if (obj_is_generic(obj) && cansee(x, y) && !Hallucination()) {
        const u = game.u;
        const r = (u.xray_range > 2) ? u.xray_range : 2,
            /* neardist produces a small square with rounded corners */
            neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */
        const dx = x - u.ux, dy = y - u.uy;

        if (dx * dx + dy * dy <= neardist) {
            observe_object(obj, Hallucination());
            glyph = obj_to_glyph(obj, newsym_rn2);
        }
    }

    if (game.level.flags?.hero_memory) {
        /* MRKR: While hallucinating, statues are seen as random monsters */
        /*       but remembered as random objects.                        */
        loc.remembered_glyph = glyph;
    }
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx);
}

// C ref: display.c see_nearby_objects()
/* mark the top object of nearby stacks as having been seen, and if
   that object was being displayed as generic, redisplay it as specific */
export function see_nearby_objects() {
    const u = game.u;
    let obj;
    const x = u.ux, y = u.uy;
    /* these 'r' and 'neardist' calculations match distant_name(objnam.c) */
    const r = (u.xray_range > 2) ? u.xray_range : 2,
        /* neardist produces a small square with rounded corners */
        neardist = (r * r) * 2 - r; /* same as r*r + r*(r-1) */

    for (let iy = y - r; iy <= y + r; ++iy)
        for (let ix = x - r; ix <= x + r; ++ix) {
            if (!isok(ix, iy))
                continue;
            /* skip if no object or the object has already been marked as
               having been seen up close */
            if ((obj = vobj_at(ix, iy)) === null || obj.dknown)
                continue;
            /* skip if the spot can't be seen or is too far (diagonal) */
            if (!cansee(ix, iy)
                || (ix - u.ux) ** 2 + (iy - u.uy) ** 2 > neardist) /* distu() */
                continue;

            observe_object(obj, Hallucination());
            /* operate on remembered glyph rather than current one */
            if (game.level.at(ix, iy).remembered_glyph?.generic)
                newsym_force(ix, iy);
        }
}

// C ref: display.h glyph_is_invisible() -- for a remembered glyph
// (lev->glyph): the "remembered, unseen monster" 'I'
export function glyph_is_invisible(rg) {
    return !!rg?.invisible;
}

// C ref: display.c map_invisible()
/*
 * Make the hero remember that a square contains an invisible monster.
 * This is a special case in that the square will continue to be displayed
 * this way even when the hero is close enough to see it.  To get rid of
 * this and display the square's actual contents, use unmap_object() followed
 * by newsym() if necessary.
 */
export function map_invisible(x, y) {
    if (x !== game.u.ux || y !== game.u.uy) { /* don't display I at hero's location */
        /* GLYPH_INVISIBLE: S_invisible 'I', invis_color() NO_COLOR */
        const glyph = { ch: 'I', color: NO_COLOR, decgfx: false, invisible: true };
        if (game.level.flags?.hero_memory)
            game.level.at(x, y).remembered_glyph = glyph;
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx);
    }
}

// C ref: display.c unmap_invisible()
export function unmap_invisible(x, y) {
    if (isok(x, y) && glyph_is_invisible(game.level.at(x, y).remembered_glyph)) {
        unmap_object(x, y);
        newsym(x, y);
        return true;
    }
    return false;
}

// C ref: display.c unmap_object()
/*
 * Remove something from the map when the hero realizes it's not there any
 * more.  Replace it with background or known trap, but not with any other
 * If this is used for detection, a full screen update is imminent anyway;
 * if this is used to get rid of an invisible monster notation, we might have
 * to call newsym().
 */
export function unmap_object(x, y) {
    let trap, ep;

    if (!game.level.flags?.hero_memory)
        return;

    const lev = game.level.at(x, y);
    if ((trap = t_at(x, y)) !== null && trap && trap.tseen
        && !covers_objects(x, y) /* covers_traps() */) {
        map_trap(trap, false);
    } else if (lev.seenv) {
        if (spot_shows_engravings(x, y)
            && (ep = engr_at(x, y)) !== null && ep
            && !covers_objects(x, y) /* covers_traps() */) {
            if (cansee(x, y))
                ep.erevealed = 1;
            map_engraving(ep, false);
        } else {
            map_background(x, y, false);
        }

        /* turn remembered dark room squares dark */
        if (!lev.waslit && lev.remembered_glyph?.cmap === 'S_room'
            && lev.typ === ROOM)
            lev.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false,
                                     cmap: 'S_stone' };
    } else {
        lev.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false,
                                 cmap: 'S_stone' }; /* default val */
    }
}

// C ref: display.c map_background()
function map_background(x, y, show) {
    const loc = game.level.at(x, y);
    const tg = terrain_glyph(loc, x, y);
    if (game.level.flags?.hero_memory)
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                 cmap: tg.cmap };
    if (show)
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec);
}

// C ref: defsym.h trap PCHAR()s, S_arrow_trap .. S_trapped_chest: the
// default symbol and color, indexed by trap_to_defsym(ttyp) - S_arrow_trap
// (rm.h: S_arrow_trap + ttyp - 1); the DECgraphics symset doesn't change
// them.  HI_METAL is CLR_CYAN, HI_ZAP is CLR_BRIGHT_BLUE.
const TRAP_DEFSYMS = [
    ['^', CLR_CYAN],           /* S_arrow_trap */
    ['^', CLR_CYAN],           /* S_dart_trap */
    ['^', CLR_GRAY],           /* S_falling_rock_trap */
    ['^', CLR_BROWN],          /* S_squeaky_board */
    ['^', CLR_CYAN],           /* S_bear_trap */
    ['^', CLR_RED],            /* S_land_mine */
    ['^', CLR_GRAY],           /* S_rolling_boulder_trap */
    ['^', CLR_BRIGHT_BLUE],    /* S_sleeping_gas_trap */
    ['^', CLR_BLUE],           /* S_rust_trap */
    ['^', CLR_ORANGE],         /* S_fire_trap */
    ['^', CLR_BLACK],          /* S_pit */
    ['^', CLR_BLACK],          /* S_spiked_pit */
    ['^', CLR_BROWN],          /* S_hole */
    ['^', CLR_BROWN],          /* S_trap_door */
    ['^', CLR_MAGENTA],        /* S_teleportation_trap */
    ['^', CLR_MAGENTA],        /* S_level_teleporter */
    ['^', CLR_BRIGHT_MAGENTA], /* S_magic_portal */
    ['"', CLR_GRAY],           /* S_web */
    ['^', CLR_GRAY],           /* S_statue_trap */
    ['^', CLR_BRIGHT_BLUE],    /* S_magic_trap */
    ['^', CLR_BRIGHT_BLUE],    /* S_anti_magic_trap */
    ['^', CLR_BRIGHT_GREEN],   /* S_polymorph_trap */
    ['~', CLR_MAGENTA],        /* S_vibrating_square */
    ['^', CLR_ORANGE],         /* S_trapped_door */
    ['^', CLR_ORANGE],         /* S_trapped_chest */
];

// C ref: display.c map_trap()
/*
 * Map the trap and print it out if directed.  This routine assumes that the
 * hero can physically see the location.
 */
function map_trap(trap, show) {
    const x = trap.tx, y = trap.ty;
    const [ch, color] = TRAP_DEFSYMS[trap.ttyp - 1]; /* trap_to_glyph(trap) */
    const glyph = { ch, color, decgfx: false };

    if (game.level.flags?.hero_memory)
        game.level.at(x, y).remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx);
}

// C ref: engrave.h spot_shows_engravings()
function spot_shows_engravings(x, y) {
    const typ = game.level.at(x, y).typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

// C ref: display.c map_engraving()
/*
 * Map the engraving and print it out if directed.
 */
function map_engraving(ep, show) {
    const x = ep.engr_x, y = ep.engr_y;
    /* engraving_to_glyph(ep): engrave.h engraving_to_defsym() is
       S_engrcorr on a corridor, else S_engroom; DECgraphics doesn't
       change either */
    const glyph = (game.level.at(x, y).typ === CORR)
        ? { ch: '#', color: CLR_BRIGHT_BLUE, decgfx: false }  /* S_engrcorr */
        : { ch: '`', color: CLR_BRIGHT_BLUE, decgfx: false }; /* S_engroom */

    if (game.level.flags?.hero_memory)
        game.level.at(x, y).remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx);
}

// C ref: display.c _map_location() -- update_lastseentyp() and gas
// regions (show_region()) are not ported yet
function _map_location(x, y, show) {
    let obj, trap, ml_ep;
    if ((obj = vobj_at(x, y)) && !covers_objects(x, y)) {
        map_object(obj, show);
    } else if ((trap = t_at(x, y))
               && trap.tseen && !covers_objects(x, y) /* covers_traps() */) {
        map_trap(trap, show);
    } else if (spot_shows_engravings(x, y)
               && (ml_ep = engr_at(x, y)) !== null
               && ml_ep.erevealed
               && !covers_objects(x, y) /* covers_traps() */) {
        map_engraving(ml_ep, show);
    } else {
        map_background(x, y, show);
    }
}

// C ref: display.c newsym_force() -- newsym() plus marking the spot as
// needing to be redrawn (gbuf[y][x].gnew)
export function newsym_force(x, y) {
    newsym(x, y);
    const loc = game.level?.at(x, y);
    if (loc)
        loc.gnew = 1;
}

// ── newsym ──
export function newsym(x, y) {
    /* don't try to produce map output when level is in a state of flux
       (C ref: display.c _suppress_map_output(); saving and restoring
       aren't flagged in this port) */
    if (game.in_mklev)
        return;
    const loc = game.level?.at(x, y);
    if (!loc) return;

    /* C ref: display.c newsym(): when the spot can be seen, remember its
       lit condition (not templit, so that temporarily lit spots re-darken
       out of sight), and an engraving there is revealed, even when
       covered by objects or a monster */
    if (cansee(x, y)) {
        loc.waslit = (loc.lit ? 1 : 0); /* remember lit condition */
        const ep = engr_at(x, y);
        if (ep)
            ep.erevealed = 1;
    }

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero: update the remembered spot under the hero, then show self
        if (cansee(x, y)) {
            _map_location(x, y, false);
        } else {
            const tg = terrain_glyph(loc, x, y);
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                     cmap: tg.cmap };
            /* C ref: display.c feel_location(): Corridors are never felt
               as lit (unless remembered that way) (lit_corridor only). */
            if (loc.typ === CORR && loc.remembered_glyph.cmap === 'S_litcorr'
                && !loc.waslit)
                loc.remembered_glyph = rememb_glyph(S_corr_g);
        }
        show_glyph_cell(x, y, '@', CLR_WHITE, false);
        return;
    }

    let mon;
    /* Can physically see the location. */
    if (cansee(x, y)) {
        mon = mon_at_loc(x, y);
        const worm_tail = is_worm_tail(mon, x, y);
        const see_it = !!mon && (mon_visible(mon)
                                 || (!worm_tail && (tp_sensemon(mon)
                                                    || MATCH_WARN_OF_MON(mon))));
        /* mimics' disguises (display_monster()'s M_AP_FURNITURE/OBJECT/
           MONSTER cases) aren't ported yet: the location under them is
           shown instead */
        if (mon && (see_it || (!worm_tail && uprop(DETECT_MONSTERS)))
            && !mon.m_ap_type) {
            if (mon.mtrapped) {
                const trap = t_at(x, y);
                const tt = trap ? trap.ttyp : NO_TRAP;

                /* if monster is in a physical trap, you see trap too */
                if (tt === BEAR_TRAP || tt === PIT || tt === SPIKED_PIT
                    || tt === WEB)
                    trap.tseen = 1;
            }
            _map_location(x, y, false); /* map under the monster */
            /* also gets rid of any invisibility glyph */
            display_monster(x, y, mon);
        } else if (mon && mon_warning(mon) && !worm_tail) {
            throw new Error('newsym(): display_warning() not ported yet');
        } else if (glyph_is_invisible(loc.remembered_glyph)) {
            map_invisible(x, y);
        } else {
            _map_location(x, y, true); /* map the location */
        }

    /* Can't see the location. */
    } else if ((mon = mon_at_loc(x, y)) !== null
               && (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
                   || (see_with_infrared(mon) && mon_visible(mon))
                   || (uprop(DETECT_MONSTERS) && !is_worm_tail(mon, x, y)))) {
        /* Seen or sensed monsters are printed every time.
           This also gets rid of any invisibility glyph.
           (display_monster() shows a disguised mimic only when it is
           physically seen or sensed through its disguise) */
        if (!mon.m_ap_type)
            display_monster(x, y, mon);
    } else if (mon && mon_warning(mon) && !is_worm_tail(mon, x, y)) {
        throw new Error('newsym(): display_warning() not ported yet');
    } else if (loc.remembered_glyph) {
        /* C ref: display.c newsym(), can't see the location: a spot
           remembered as both dark (waslit is false) and lit (glyph is a
           lit corridor) was seen by night vision (or lit_corridor), so
           correct the hero's memory to match waslit */
        if ((!loc.waslit || (game.flags.dark_room !== false
                             && game.iflags.wc_color !== false))
            && loc.typ === CORR && loc.remembered_glyph.cmap === 'S_litcorr')
            loc.remembered_glyph = rememb_glyph(S_corr_g);
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
    } else {
        /* show_mem: never seen, the unexplored glyph (blank) */
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
    }
}

/* a terrain glyph in the remembered-glyph form (lev->glyph) */
function rememb_glyph(tg) {
    return { ch: tg.ch, color: tg.color, decgfx: tg.dec, cmap: tg.cmap };
}

// C ref: display.h enum docrt_flags_bits
export const docrtRecalc = 0;  /* full docrt(), recalculate what the map should show */
export const docrtRefresh = 1; /* redraw_map(), draw what we think the map shows */
export const docrtMapOnly = 2; /* ORed with Recalc or Refresh; draw the map but not
                                * status or perminv */
export const docrtNocls = 4;

// C ref: display.c docrt()
/* the main refresh-the-screen routine */
export async function docrt() {
    await docrt_flags(docrtRecalc);
}

// C ref: display.c docrt_flags()
/* docrt() with finer control */
export async function docrt_flags(refresh_flags) {
    const u = game.u;
    const maponly = (refresh_flags & docrtMapOnly) !== 0,
        redrawonly = (refresh_flags & docrtRefresh) !== 0,
        nocls = (refresh_flags & docrtNocls) !== 0;

    if (!game.program_state) game.program_state = {};
    if (!u?.ux || !game.level || game.program_state.in_docrt)
        return; /* display isn't ready yet */

    game.program_state.in_docrt = true;

    if (redrawonly) {
        throw new Error('docrt_flags(): redraw_map() not ported yet');
    } else if (u.uswallow) {
        throw new Error('docrt_flags(): swallowed() not ported yet');
    } else if (u.uinwater && !Is_waterlevel(u.uz)) { /* Underwater */
        throw new Error('docrt_flags(): under_water() not ported yet');
    } else if (u.uburied) { /* [not implemented] */
        throw new Error('docrt_flags(): under_ground() not ported yet');
    } else {
        /* shut down vision */
        vision_recalc(2);

        /*
         * This routine assumes that cls() does the following:
         *      + fills the physical screen with the symbol for rock
         *      + clears the glyph buffer
         */
        if (!nocls)
            await cls();

        /* display memory: show_glyph(x, y, lev->glyph); a spot never
           seen has the unexplored glyph (shown as blank) */
        for (let x = 1; x < COLNO; x++)
            for (let y = 0; y < ROWNO; y++) {
                const lev = game.level.at(x, y);
                if (!lev) continue;
                const gl = lev.remembered_glyph;
                if (gl)
                    show_glyph_cell(x, y, gl.ch, gl.color, gl.decgfx);
                else
                    show_glyph_cell(x, y, ' ', NO_COLOR, false);
            }

        /* see what is to be seen */
        vision_recalc(0);

        /* overlay with monsters */
        see_monsters();
    }

    /* post_map: */
    if (!maponly) {
        /* perm_invent: update_inventory() -- no perm_invent window */
        /* status */
        game.disp_botlx = true; /* force a redraw of the bottom lines */
        /* note: caller needs to call bot() to actually redraw status */
    }
    game.program_state.in_docrt = false;
}

// C ref: display.c see_monsters() -- the newsym() of each monster's spot;
// warning and sensing updates are not ported yet
export function see_monsters() {
    for (const mon of game.level?.monsters || []) {
        if (mon.dead) continue;
        newsym(mon.mx, mon.my);
    }
}

// C ref: display.c row_refresh()
// Redraw map row y, columns start..stop, from the glyph buffer (here the
// per-location disp_* fields) onto the map window (offy 1, offx 0).
export function row_refresh(start, stop, y) {
    const display = game?.nhDisplay;
    if (!display || !game.level) return;
    for (let x = Math.max(start, 1); x <= stop && x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
        const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
        display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), loc.disp_attr ?? 0);
    }
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
// C ref: attrib.h A_STR .. A_CHA
const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;

// C ref: botl.c get_strength_str()
function get_strength_str() {
    const st = ACURR(A_STR);

    if (st > 18) {
        if (st > 18 + 100) /* STR18(100) */
            return String(st - 100).padStart(2);
        else if (st < 18 + 100)
            return `18/${String(st - 18).padStart(2, '0')}`;
        else
            return "18/**";
    }
    return String(st);
}

function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    /* C ref: botl.c do_statusline1(): plname with its first letter capitalized */
    const pn = game.plname || 'Hero';
    const name = ('a' <= pn[0] && pn[0] <= 'z') ? pn[0].toUpperCase() + pn.slice(1) : pn;
    const role = game.urole?.rank ? rank() : 'Adventurer'; // C ref: botl.c rank()
    const title = `${name} the ${role}`;
    /* C ref: botl.c do_statusline1(): ACURR() of each attribute, in
       A_STR, A_DEX, A_CON, A_INT, A_WIS, A_CHA display order */
    const stats = `St:${get_strength_str()} Dx:${ACURR(A_DEX)} Co:${ACURR(A_CON)} In:${ACURR(A_INT)} Wi:${ACURR(A_WIS)} Ch:${ACURR(A_CHA)}`;
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
    /* C ref: botl.c do_statusline2(): experience is "Xp:N/pts" only with
       the showexp option, and the turn counter is shown only with time */
    const expr = game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
                                     : `Xp:${u.ulevel || 1}`;
    const tmmv = game.flags?.time ? ` T:${game.moves}` : '';
    return `Dlvl:${u.uz?.dlevel || 1} $:${Math.min(money_cnt(game.invent), 999999)} HP:${u.uhp || 0}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${expr}${tmmv}`;
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
// The map window (rows 1-21) and the status window (rows 22-23) are
// redrawn from the glyph buffer; row 0 and whatever rows a multi-line
// message is using belong to the tty message window (wintty.js topl).
function _buildScreenOutput(cursor_on_u) {
    const display = game?.nhDisplay;
    if (!display) return;

    let output = '';
    // Rows 1-21: map (rendered with DEC + ANSI, per-row SO/SI)
    output += '\n';
    for (let y = 0; y < ROWNO; y++) {
        output += render_map_row(y) + '\n';
    }

    // Row 22-23: status, as long as no screen clear has erased them
    // since bot() last drew them
    const [st1, st2] = (game.status_shown !== false && game._status_lines)
                       || ['', ''];
    output += st1 + '\n';
    output += st2;

    game._screen_output = output;

    if (display.grid) {
        const msgw = game.tty_wins?.[game.WIN_MESSAGE];
        const msgrows = (game.ttyDisplay?.toplin && msgw) ? msgw.cury + 1 : 1;
        // Map — write characters to grid (DEC → Unicode for browser display)
        for (let y = 0; y < ROWNO; y++) {
            if (y + 1 < msgrows) continue;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') {
                    display.setCell(x - 1, y + 1, ' ', NO_COLOR, 0);
                    continue;
                }
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), loc.disp_attr ?? 0);
            }
        }
        // Status lines (left alone while erased)
        if (game.status_shown !== false) {
            const s1 = st1.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
                m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
            for (let c = 0; c < display.cols; c++)
                display.setCell(c, 22, c < s1.length ? s1[c] : ' ', NO_COLOR, 0);
            const s2 = st2;
            for (let c = 0; c < display.cols; c++)
                display.setCell(c, 23, c < s2.length ? s2[c] : ' ', NO_COLOR, 0);
        }
        // C ref: display.c flush_screen(): if (cursor_on_u) curs(WIN_MAP, u.ux, u.uy)
        if (cursor_on_u && game.u?.ux > 0) {
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
            if (game.ttyDisplay) {
                game.ttyDisplay.curx = game.u.ux - 1;
                game.ttyDisplay.cury = game.u.uy + 1;
            }
        }
    }
}

// ── flush_screen ──
// C ref: display.c flush_screen()
/*
 * Synch the third screen with the display.
 */
export async function flush_screen(cursor_on_u) {
    /* C's static delay_flushing is kept in game, which is per game */
    if (cursor_on_u === -1)
        game.delay_flushing = !game.delay_flushing;
    if (game.delay_flushing)
        return;
    /* get this done now, before we place the cursor on the hero */
    if (game.disp_botl || game.disp_botlx)
        bot();
    _buildScreenOutput(cursor_on_u);
}

// ── cls ──
// C ref: display.c cls()
export async function cls() {
    const display = game?.nhDisplay;
    if (game.WIN_MESSAGE !== undefined && game.tty_wins?.[game.WIN_MESSAGE])
        await tty_display_nhwindow(game.WIN_MESSAGE, false); /* flush messages */
    game.disp_botlx = true;                   /* force update of botl window */
    if (display?.clearScreen) display.clearScreen();  /* clear_nhwindow(WIN_MAP) */
    if (game.status_shown !== undefined)
        game.status_shown = false; /* erase_tty_screen() */
}

// ── bot ──
// C ref: botl.c bot() -- the status lines are composed now (the tty status
// window keeps them until the next bot()); they are drawn on rows 22-23
// and again by each flush_screen() redraw.
export function bot() {
    /* gb.bot_disabled: set while windows.c select_menu() and getlin()
       have a menu or prompt up */
    if (game.bot_disabled)
        return;
    const display = game?.nhDisplay;
    if (game.u && game.u.uhp !== -1) {
        const st1 = _statusLine1(), st2 = _statusLine2();
        game._status_lines = [st1, st2];
        game.status_shown = true;
        if (display?.grid) {
            const s1 = st1.replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
                m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
            const rows = [s1, st2];
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < display.cols; c++)
                    display.setCell(c, 22 + r, c < rows[r].length ? rows[r][c] : ' ',
                                    NO_COLOR, 0);
            }
        }
    }
    game.disp_botl = game.disp_botlx = false;
}

// ── pline ──
// C ref: pline.c vpline() -- the plain message path: bring the map up to
// date (vision, flush_screen(1)) and put the line in the message window
// (tty update_topl(), which handles concatenation and --More--)
export async function pline(msg) {
    if (game.vision_full_recalc)
        vision_recalc(0);
    if (game.u?.ux)
        await flush_screen(1); /* %% */
    await tty_putstr(game.WIN_MESSAGE, 0, msg);
}

// C ref: pline.c You(), Your(), You_cant(), pline_The(), There() --
// pline() with the C prefix prepended
export async function You(line) { await pline(`You ${line}`); }
export async function Your(line) { await pline(`Your ${line}`); }
export async function You_cant(line) { await pline(`You can't ${line}`); }
export async function pline_The(line) { await pline(`The ${line}`); }
export async function There(line) { await pline(`There ${line}`); }
