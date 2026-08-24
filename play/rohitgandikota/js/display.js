// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { money_cnt } from './invent.js';
import { ONAMES, OCLASSES } from './objects_data.js';
import { update_topl } from './tty/topl.js';
import { xwaitforspace } from './tty/getline.js';
import { term_start_color } from './tty/termcap.js';
import { rank, bot_conditions } from './botl.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { Infravision, Hallucination } from './youprop.js';
import { observe_object } from './o_init.js';
import { distu } from './hacklib.js';
import { ACURR } from './attrib.js';
import { t_at } from './mon.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_BROKEN, SDOOR, ICE,
    IRONBARS, TREE, LADDER, ALTAR, GRAVE, THRONE, SINK, FOUNTAIN,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN,
    AIR, CLOUD, HI_METAL, HI_GOLD, LA_DOWN, IS_DOOR,
    SCORR, isok, IS_STWALL, IS_SDOOR,
    WM_MASK, WM_W_TOP, WM_W_BOTTOM, WM_W_LEFT, WM_W_RIGHT,
    WM_C_OUTER, WM_C_INNER, WM_T_LONG, WM_T_BL, WM_T_BR,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
} from './const.js';
import { engr_at } from './engrave.js';
import { nhgetch } from './input.js';
import { def_monsyms, def_oc_syms, cmap_names, defsyms } from './drawing_data.js';
import { showsym } from './symbols.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_BRIGHT_BLUE,
         CLR_GREEN, CLR_BLUE, CLR_RED, CLR_ORANGE, CLR_CYAN, CLR_BLACK,
         CLR_MAGENTA, CLR_BRIGHT_MAGENTA, CLR_BRIGHT_GREEN,
         DEC_TO_UNICODE } from './terminal.js';

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

/* src/stairs.c:180 known_branch_stairs() and stairway_at() — needed to pick
   S_brupstair over S_upstair for the displayed glyph, the same test
   back_to_glyph() makes at display.c:2346. */
export function stairway_at(x, y) {
    for (let st = game.stairs; st; st = st.next)
        if (st.sx === x && st.sy === y) return st;
    return null;
}
export function known_branch_stairs(sway) {
    return !!(sway && sway.tolev?.dnum !== game.u?.uz?.dnum
              && sway.u_traversed);
}

const CM = cmap_names;

// src/display.c:2938 map_glyphinfo() — a glyph becomes a symbol by looking its
// cmap index up in the ACTIVE symbol set. back_to_glyph() below picks the cmap
// index and a colour; this applies gs.showsyms[] on top, which is what makes a
// configuration without OPTIONS=symset:DECgraphics draw '-', '|' and '.'
// instead of the DEC line-drawing set.
function terrain_glyph(loc, x, y) {
    const g = back_to_glyph(loc, x, y);
    const sym = (g.cmap !== undefined) ? showsym(g.cmap) : null;
    return sym ? { ...g, ch: sym.ch, dec: sym.dec } : g;
}

/* src/display.c:2336 — the wall arms of back_to_glyph(). */
/* ------------------------------------------------------------------ *
 * Wall modes.  set_wall_state() runs once per level from mklev and
 * stores a WM_* mode in each wall square's wall_info; wall_angle()
 * reads the mode plus the square's seenv to decide which wall glyph
 * (or blank stone) the hero actually gets to see.
 * ------------------------------------------------------------------ */

// src/display.c:3129 check_pos()
function check_pos(x, y, which) {
    if (!isok(x, y))
        return which;
    const type = game.level.at(x, y)?.typ ?? STONE;
    /* Everything below POOL, excluding TREE */
    if (IS_STWALL(type) || type === CORR || type === SCORR || IS_SDOOR(type))
        return which;
    return 0;
}

// src/display.c:3156 more_than_one()
function more_than_one(a, b, c) {
    return (a && (b | c)) || (b && (a | c)) || (c && (a | b));
}

// src/display.c:3161 set_twall() — wall mode for a T wall.
function set_twall(x0, y0, x1, y1, x2, y2, x3, y3) {
    const is_1 = check_pos(x1, y1, WM_T_LONG);
    const is_2 = check_pos(x2, y2, WM_T_BL);
    const is_3 = check_pos(x3, y3, WM_T_BR);
    if (more_than_one(is_1, is_2, is_3))
        return 0;
    return is_1 + is_2 + is_3;
}

// src/display.c:3186 set_wall() — wall mode for a horizontal or vertical wall.
function set_wall(x, y, horiz) {
    let is_1, is_2;
    if (horiz) {
        is_1 = check_pos(x, y - 1, WM_W_TOP);
        is_2 = check_pos(x, y + 1, WM_W_BOTTOM);
    } else {
        is_1 = check_pos(x - 1, y, WM_W_LEFT);
        is_2 = check_pos(x + 1, y, WM_W_RIGHT);
    }
    if (more_than_one(is_1, is_2, 0))
        return 0;
    return is_1 + is_2;
}

// src/display.c:3206 set_corn() — (x4,y4) is the "inner" position.
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
    if (is_1 && is_2 && is_3)
        return WM_C_OUTER;
    return 0; /* finished walls on all sides */
}

// src/display.c:3236 set_crosswall()
function set_crosswall(x, y) {
    const is_1 = check_pos(x - 1, y - 1, 1);
    const is_2 = check_pos(x + 1, y - 1, 1);
    const is_3 = check_pos(x + 1, y + 1, 1);
    const is_4 = check_pos(x - 1, y + 1, 1);

    let wmode = is_1 + is_2 + is_3 + is_4;
    if (wmode > 1) {
        if (is_1 && is_3 && (is_2 + is_4 === 0)) {
            wmode = WM_X_TLBR;
        } else if (is_2 && is_4 && (is_1 + is_3 === 0)) {
            wmode = WM_X_BLTR;
        } else {
            wmode = 0;
        }
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

// src/display.c:3275 xy_set_wall_state() — also used for vault wall repair.
export function xy_set_wall_state(x, y) {
    const lev = game.level.at(x, y);
    if (!lev) return;
    let wmode;

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
        lev.wall_info = ((lev.wall_info ?? 0) & ~WM_MASK) | wmode;
}

// src/display.c:3329 set_wall_state() — called from mklev; scan the level
// and set the wall modes.
export function set_wall_state() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            xy_set_wall_state(x, y);
}

/* src/display.c:3397 — T wall types, one for each row in wall_matrix[][]. */
const T_d = 0, T_l = 1, T_u = 2, T_r = 3;
/* Columns: results of a tdwall pattern match; all T walls are rotated to
   tdwall first. */
const T_stone = 0, T_tlcorn = 1, T_trcorn = 2, T_hwall = 3, T_tdwall = 4;

// src/display.c:3416 wall_matrix[][]
const wall_matrix = [
    [CM.S_stone, CM.S_tlcorn, CM.S_trcorn, CM.S_hwall, CM.S_tdwall], /* tdwall */
    [CM.S_stone, CM.S_trcorn, CM.S_brcorn, CM.S_vwall, CM.S_tlwall], /* tlwall */
    [CM.S_stone, CM.S_brcorn, CM.S_blcorn, CM.S_hwall, CM.S_tuwall], /* tuwall */
    [CM.S_stone, CM.S_blcorn, CM.S_tlcorn, CM.S_vwall, CM.S_trwall], /* trwall */
];

/* src/display.c:3423 — cross wall rows, one per "solid" quarter. */
const C_bl = 0, C_tl = 1, C_tr = 2, C_br = 3;
/* Columns express results in C_br terms. */
const C_trcorn = 0, C_brcorn = 1, C_blcorn = 2, C_tlwall = 3, C_tuwall = 4,
      C_crwall = 5;

// src/display.c:3444 cross_matrix[][]
const cross_matrix = [
    [CM.S_brcorn, CM.S_blcorn, CM.S_tlcorn, CM.S_tuwall, CM.S_trwall, CM.S_crwall],
    [CM.S_blcorn, CM.S_tlcorn, CM.S_trcorn, CM.S_trwall, CM.S_tdwall, CM.S_crwall],
    [CM.S_tlcorn, CM.S_trcorn, CM.S_brcorn, CM.S_tdwall, CM.S_tlwall, CM.S_crwall],
    [CM.S_trcorn, CM.S_brcorn, CM.S_blcorn, CM.S_tlwall, CM.S_tuwall, CM.S_crwall],
];

// src/display.c:3513 wall_angle() — which wall glyph (as a cmap index) the
// seen angle and wall mode allow the hero to perceive. C's t_warn()
// diagnostics are omitted; the fall-back result is kept.
// The `only(sv, bits)` macro from C wall_angle.
function only(sv, bits) { return (sv & bits) && !(sv & ~bits); }

function wall_angle(lev) {
    let seenv = (lev.seenv ?? 0) & 0xff;
    let row, idx;

    switch (lev.typ) {
    case TUWALL:
        row = wall_matrix[T_u];
        seenv = (seenv >> 4 | seenv << 4) & 0xff; /* rotate to tdwall */
        idx = do_twall(lev, row, seenv);
        break;
    case TLWALL:
        row = wall_matrix[T_l];
        seenv = (seenv >> 2 | seenv << 6) & 0xff; /* rotate to tdwall */
        idx = do_twall(lev, row, seenv);
        break;
    case TRWALL:
        row = wall_matrix[T_r];
        seenv = (seenv >> 6 | seenv << 2) & 0xff; /* rotate to tdwall */
        idx = do_twall(lev, row, seenv);
        break;
    case TDWALL:
        row = wall_matrix[T_d];
        idx = do_twall(lev, row, seenv);
        break;

    case SDOOR:
        if (lev.horizontal)
            idx = hwall_angle(lev, seenv);
        else
            idx = vwall_angle(lev, seenv);
        break;
    case VWALL:
        idx = vwall_angle(lev, seenv);
        break;
    case HWALL:
        idx = hwall_angle(lev, seenv);
        break;

    case TLCORNER:
        idx = set_corner(lev, seenv, CM.S_tlcorn, (SV3 | SV4 | SV5), SV4);
        break;
    case TRCORNER:
        idx = set_corner(lev, seenv, CM.S_trcorn, (SV5 | SV6 | SV7), SV6);
        break;
    case BLCORNER:
        idx = set_corner(lev, seenv, CM.S_blcorn, (SV1 | SV2 | SV3), SV2);
        break;
    case BRCORNER:
        idx = set_corner(lev, seenv, CM.S_brcorn, (SV7 | SV0 | SV1), SV0);
        break;

    case CROSSWALL:
        switch ((lev.wall_info ?? 0) & WM_MASK) {
        case 0:
            if (seenv === SV0)
                idx = CM.S_brcorn;
            else if (seenv === SV2)
                idx = CM.S_blcorn;
            else if (seenv === SV4)
                idx = CM.S_tlcorn;
            else if (seenv === SV6)
                idx = CM.S_trcorn;
            else if (!(seenv & ~(SV0 | SV1 | SV2))
                     && (seenv & SV1 || seenv === (SV0 | SV2)))
                idx = CM.S_tuwall;
            else if (!(seenv & ~(SV2 | SV3 | SV4))
                     && (seenv & SV3 || seenv === (SV2 | SV4)))
                idx = CM.S_trwall;
            else if (!(seenv & ~(SV4 | SV5 | SV6))
                     && (seenv & SV5 || seenv === (SV4 | SV6)))
                idx = CM.S_tdwall;
            else if (!(seenv & ~(SV0 | SV6 | SV7))
                     && (seenv & SV7 || seenv === (SV0 | SV6)))
                idx = CM.S_tlwall;
            else
                idx = CM.S_crwall;
            break;

        case WM_X_TL:
            row = cross_matrix[C_tl];
            seenv = (seenv >> 4 | seenv << 4) & 0xff;
            idx = do_crwall(row, seenv);
            break;
        case WM_X_TR:
            row = cross_matrix[C_tr];
            seenv = (seenv >> 6 | seenv << 2) & 0xff;
            idx = do_crwall(row, seenv);
            break;
        case WM_X_BL:
            row = cross_matrix[C_bl];
            seenv = (seenv >> 2 | seenv << 6) & 0xff;
            idx = do_crwall(row, seenv);
            break;
        case WM_X_BR:
            row = cross_matrix[C_br];
            idx = do_crwall(row, seenv);
            break;

        case WM_X_TLBR:
            if (only(seenv, SV1 | SV2 | SV3))
                idx = CM.S_blcorn;
            else if (only(seenv, SV5 | SV6 | SV7))
                idx = CM.S_trcorn;
            else if (only(seenv, SV0 | SV4))
                idx = CM.S_stone;
            else
                idx = CM.S_crwall;
            break;

        case WM_X_BLTR:
            if (only(seenv, SV0 | SV1 | SV7))
                idx = CM.S_brcorn;
            else if (only(seenv, SV3 | SV4 | SV5))
                idx = CM.S_tlcorn;
            else if (only(seenv, SV2 | SV6))
                idx = CM.S_stone;
            else
                idx = CM.S_crwall;
            break;

        default:
            idx = CM.S_stone;
            break;
        }
        break;

    default:
        idx = CM.S_stone;
        break;
    }

    return idx;
}

/* The `do_twall` goto target in C wall_angle — T wall dispatch after the
   seen vector has been rotated into tdwall terms. */
function do_twall(lev, row, seenv) {
    let col;
    switch ((lev.wall_info ?? 0) & WM_MASK) {
    case 0:
        if (seenv === SV4) {
            col = T_tlcorn;
        } else if (seenv === SV6) {
            col = T_trcorn;
        } else if (seenv & (SV3 | SV5 | SV7)
                   || ((seenv & SV4) && (seenv & SV6))) {
            col = T_tdwall;
        } else if (seenv & (SV0 | SV1 | SV2)) {
            col = (seenv & (SV4 | SV6) ? T_tdwall : T_hwall);
        } else {
            col = T_stone;
        }
        break;
    case WM_T_LONG:
        if (seenv & (SV3 | SV4) && !(seenv & (SV5 | SV6 | SV7))) {
            col = T_tlcorn;
        } else if (seenv & (SV6 | SV7) && !(seenv & (SV3 | SV4 | SV5))) {
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
        col = T_stone;
        break;
    }
    return row[col];
}

/* The `do_crwall` goto target in C wall_angle — crosswall dispatch after
   rotation into bottom-right terms. */
function do_crwall(row, seenv) {
    if (seenv === SV4)
        return CM.S_stone;

    let col;
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
        col = C_crwall;
    }
    return row[col];
}

/* The `set_corner` macro in C wall_angle. */
function set_corner(lev, seenv, which, outer, inner) {
    switch ((lev.wall_info ?? 0) & WM_MASK) {
    case 0:
        return which;
    case WM_C_OUTER:
        return seenv & outer ? which : CM.S_stone;
    case WM_C_INNER:
        return seenv & ~inner ? which : CM.S_stone;
    default:
        return CM.S_stone;
    }
}

/* The VWALL/HWALL arms of C wall_angle. */
function vwall_angle(lev, seenv) {
    switch ((lev.wall_info ?? 0) & WM_MASK) {
    case 0:
        return seenv ? CM.S_vwall : CM.S_stone;
    case 1:
        return seenv & (SV1 | SV2 | SV3 | SV4 | SV5) ? CM.S_vwall : CM.S_stone;
    case 2:
        return seenv & (SV0 | SV1 | SV5 | SV6 | SV7) ? CM.S_vwall : CM.S_stone;
    default:
        return CM.S_stone;
    }
}

function hwall_angle(lev, seenv) {
    switch ((lev.wall_info ?? 0) & WM_MASK) {
    case 0:
        return seenv ? CM.S_hwall : CM.S_stone;
    case 1:
        return seenv & (SV3 | SV4 | SV5 | SV6 | SV7) ? CM.S_hwall : CM.S_stone;
    case 2:
        return seenv & (SV0 | SV1 | SV2 | SV3 | SV7) ? CM.S_hwall : CM.S_stone;
    default:
        return CM.S_stone;
    }
}

/* src/display.c:2336 — every wall arm of back_to_glyph is
   `idx = ptr->seenv ? wall_angle(ptr) : S_stone`. A wall whose seen angle
   or wall mode gives S_stone draws as blank even while in sight. */
function wall_glyph(loc) {
    const idx = loc.seenv ? wall_angle(loc) : CM.S_stone;
    if (idx === CM.S_stone)
        return { ch: ' ', color: NO_COLOR, dec: false, cmap: CM.S_stone };
    const d = defsyms[idx];
    return { ch: d.ch, color: NO_COLOR, dec: d.dec, cmap: idx };
}

/* include/defsym.h:157 — the trap span of defsyms[], '^' for every entry
   except S_web ('"') and S_vibrating_square ('~'), indexed by cmap. C reads
   the colour straight out of defsyms[]; tools/gen-drawing.mjs does not emit
   the colour column yet, so the trap span is transcribed here from defsym.h
   rather than guessed. */
const trap_cmap_color = {
    49: CLR_CYAN,   50: CLR_CYAN,   51: CLR_GRAY,   52: CLR_BROWN,
    53: CLR_CYAN,   54: CLR_RED,    55: CLR_GRAY,   56: CLR_BRIGHT_BLUE,
    57: CLR_BLUE,   58: CLR_ORANGE, 59: CLR_BLACK,  60: CLR_BLACK,
    61: CLR_BROWN,  62: CLR_BROWN,  63: CLR_MAGENTA, 64: CLR_MAGENTA,
    65: CLR_BRIGHT_MAGENTA, 66: CLR_GRAY, 67: CLR_GRAY, 68: CLR_BRIGHT_BLUE,
    69: CLR_BRIGHT_BLUE, 70: CLR_BRIGHT_GREEN, 71: CLR_MAGENTA,
    72: CLR_ORANGE, 73: CLR_ORANGE,
};

// include/rm.h:497 trap_to_defsym() — S_arrow_trap + ttyp - 1.
function trap_glyph(trap) {
    const cmap = CM.S_arrow_trap + trap.ttyp - 1;
    const sym = showsym(cmap);
    return { ch: sym ? sym.ch : '^', color: trap_cmap_color[cmap] ?? NO_COLOR,
             cmap };
}

// include/display.h:218 covers_objects() / :222 covers_traps() — a pool or
// lava square hides what is under it.
function covers_traps(x, y) {
    const loc = game.level?.at(x, y);
    return !!loc && (loc.typ === POOL || loc.typ === MOAT || loc.typ === WATER
                     || loc.typ === LAVAPOOL || loc.typ === LAVAWALL);
}

// ── src/display.c:2302 back_to_glyph() — terrain to cmap index + colour ──
function back_to_glyph(loc, x, y) {
    const typ = loc.typ;
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false, cmap: CM.S_stone };
    case ROOM:      return { ch: '~', color: NO_COLOR, dec: true, cmap: CM.S_room };  // DEC middle dot
    case CORR: {
        /* src/display.c:2302 back_to_glyph() picks S_litcorr when the cell
           was lit or lit_corridor is set; :248 map_background() drops back
           to S_corr when the cell is neither seen nor waslit. Both share
           '#', so map_glyphinfo (display.c:2938) paints the lit one
           CLR_WHITE "to provide a visible difference". */
        const lit = (loc.waslit || game.flags?.lit_corridor)
                    && (loc.waslit || cansee(x, y));
        return { ch: '#', color: lit ? CLR_WHITE : NO_COLOR, dec: false,
                 cmap: lit ? CM.S_litcorr : CM.S_corr };
    }
    // src/display.c:2324 — '+' when shut, '-'/'|' when open. The open glyphs
    // read backwards from their names: S_vodoor is '-' and S_hodoor is '|'
    // (include/defsym.h:104-105), so the orientation test is inverted.
    //
    // D_NODOOR and D_BROKEN both map to S_ndoor, which defsym.h gives as '.'.
    // Under DECgraphics that renders as the same middle dot the floor uses, so
    // this keeps the floor glyph: substituting a literal '.' cost 24 screens.
    case DOOR:
        if (loc.doormask & D_ISOPEN)
            /* dat/symbols, "start: DECgraphics":
             *     S_vodoor: \xe1   # meta-a, checkerboard
             *     S_hodoor: \xe1   # meta-a, checkerboard
             * Both open-door orientations are the SAME DEC glyph, so the
             * defsym.h '-' / '|' pair never reaches a DECgraphics screen.
             * horizontal is irrelevant here. */
            return { ch: 'a', color: CLR_BROWN, dec: true,
                     cmap: loc.horizontal ? CM.S_hodoor : CM.S_vodoor };
        if (loc.doormask & (D_CLOSED | D_LOCKED))
            return { ch: '+', color: CLR_BROWN, dec: false,
                     cmap: loc.horizontal ? CM.S_hcdoor : CM.S_vcdoor };
        return { ch: '~', color: NO_COLOR, dec: true, cmap: CM.S_ndoor };
    case STAIRS: {
        /* include/defsym.h:120 — S_upstair and S_dnstair are CLR_GRAY;
           S_brupstair and S_brdnstair are CLR_YELLOW. The colour is a
           property of the SYMBOL, not of whether the hero has seen it: a
           branch staircase is yellow the moment it is drawn. This used to
           key off a `stair_seen` flag, which is not a thing C has. */
        const branch = known_branch_stairs(stairway_at(x, y));
        const scol = branch ? CLR_YELLOW : NO_COLOR;
        if (game.level?.upstair?.x === x && game.level?.upstair?.y === y)
            return { ch: '<', color: scol, dec: false,
                     cmap: branch ? CM.S_brupstair : CM.S_upstair };
        return { ch: '>', color: scol, dec: false,
                 cmap: branch ? CM.S_brdnstair : CM.S_dnstair };
    }
    // Wall types → DEC line-drawing characters
    /* src/display.c:2336 — every wall arm is `ptr->seenv ? wall_angle(ptr)
       : S_stone`. A wall the hero has never seen a FACE of draws as blank,
       even while it is in sight: walking down a dark corridor lights the
       corridor squares but leaves the rock beside them unmapped. */
    case HWALL: case VWALL:
    case TLCORNER: case TRCORNER: case BLCORNER: case BRCORNER:
    case CROSSWALL: case TUWALL: case TDWALL:
    case TLWALL: case TRWALL:
        return wall_glyph(loc);
    // src/display.c:2304 — a SECRET door looks exactly like the wall it hides
    // in, so it falls through to the HWALL/VWALL case.
    /* The rest of the terrain, from include/defsym.h with dat/symbols'
       "start: DECgraphics" overrides applied. Where a DEC entry exists it
       wins; where none does, defsym.h's ASCII character stands (fountain,
       sink, throne, grave and the stairs have no DEC entry).

       None of these had a case at all, so every one fell through to the
       default and drew as blank. */
    case IRONBARS:  return { ch: '|', color: HI_METAL, dec: true, cmap: CM.S_bars };   // \xfc
    case TREE:      return { ch: 'g', color: CLR_GREEN, dec: true, cmap: CM.S_tree };  // \xe7
    case LADDER: {
        /* src/display.c:2352 — the direction comes from the square's own
           `ladder` field, not from a level-wide coordinate:
               idx = (ptr->ladder & LA_DOWN) ? S_dnladder : S_upladder;
           defsym.h:122-123 gives '<' / '>', both CLR_BROWN, overridden by
           dat/symbols to \xf9 / \xfa. */
        const lbranch = known_branch_stairs(stairway_at(x, y));
        return (loc.ladder & LA_DOWN)
            ? { ch: 'z', color: CLR_BROWN, dec: true,
                cmap: lbranch ? CM.S_brdnladder : CM.S_dnladder }
            : { ch: 'y', color: CLR_BROWN, dec: true,
                cmap: lbranch ? CM.S_brupladder : CM.S_upladder };
    }
    case ALTAR:     return { ch: '{', color: CLR_GRAY, dec: true, cmap: CM.S_altar };   // \xfb
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false, cmap: CM.S_grave };
    case THRONE:    return { ch: '\\', color: HI_GOLD, dec: false, cmap: CM.S_throne };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false, cmap: CM.S_sink };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false, cmap: CM.S_fountain };
    case POOL:
    case MOAT:      return { ch: '`', color: CLR_BLUE, dec: true, cmap: CM.S_pool };   // \xe0
    case WATER:     return { ch: '`', color: CLR_BRIGHT_BLUE, dec: true, cmap: CM.S_water };
    case LAVAPOOL:  return { ch: '`', color: CLR_RED, dec: true, cmap: CM.S_lava };
    case LAVAWALL:  return { ch: '`', color: CLR_ORANGE, dec: true, cmap: CM.S_lavawall };
    case ICE:       return { ch: '~', color: CLR_CYAN, dec: true, cmap: CM.S_ice };   // \xfe
    case DRAWBRIDGE_DOWN:                                  /* S_[vh]odbridge */
        return { ch: '~', color: CLR_BROWN, dec: true,
                 cmap: loc.horizontal ? CM.S_hodbridge : CM.S_vodbridge };
    case DRAWBRIDGE_UP:                                    /* S_[vh]cdbridge */
        return { ch: '#', color: CLR_BROWN, dec: false,
                 cmap: loc.horizontal ? CM.S_hcdbridge : CM.S_vcdbridge };
    case AIR:       return { ch: ' ', color: CLR_CYAN, dec: false, cmap: CM.S_air };
    case CLOUD:     return { ch: '#', color: CLR_GRAY, dec: false, cmap: CM.S_cloud };
    case SDOOR:     return wall_glyph(loc);

    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

// ── show_glyph_cell ──
// `glyph` is the provenance of what is displayed — C keeps a glyph NUMBER in
// its buffer (gbuf) and every classifier (glyph_is_monster & friends) reads
// it back; this port keeps a descriptor object: { kind: 'hero'|'mon'|'obj'
// |'cmap'|'nothing', mon?, obj?, cmap? }.
// src/display.c gbuf[][] — what is currently PAINTED, kept apart from the
// level so that switching levels does not silently repaint the screen. Only
// clear_glyph_buffer() empties it, which is what leaves the old map under
// the "You descend the stairs.--More--" prompt.
export function gbuf_at(x, y) {
    const rows = (game.gbuf ||= []);
    return (rows[y] ||= [])[x];
}

export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0, glyph = undefined) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    /* Debug-only cell watch (never set during scoring): log who writes a
       watched map cell. globalThis.__cell_watch = {cells: [[x,y],...]} */
    if (globalThis.__cell_watch
        && globalThis.__cell_watch.cells.some(([wx, wy]) => wx === x && wy === y))
        console.error(`CELLWATCH (${x},${y}) ch=${JSON.stringify(ch)} dec=${!!decgfx}\n`
            + (new Error().stack || '').split('\n').slice(2, 6).join('\n'));
    const rows = (game.gbuf ||= []);
    (rows[y] ||= [])[x] = {
        disp_ch: ch,
        disp_color: color,
        disp_decgfx: !!decgfx,
        disp_attr: attr | 0,
        disp_glyph: glyph,
        gnew: 1,       /* src/display.c gbuf_entry.gnew — not yet flushed */
    };
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.disp_glyph = glyph;
    loc.gnew = 1;
}

// src/display.c:2159 clear_glyph_buffer()
export function clear_glyph_buffer() {
    game.gbuf = [];
}

// C glyph_at() (display.h:200) — what the glyph buffer holds for the spot.
// A cell nothing was ever drawn to reads as unexplored, the same default C
// fills gbuf with.
export function glyph_at(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return { kind: 'unexplored' };
    if (loc.disp_glyph) return loc.disp_glyph;
    if (loc.disp_ch && loc.disp_ch !== ' ')
        return { kind: 'cmap', cmap: cmap_names.S_stone };
    return loc.seenv ? { kind: 'nothing' } : { kind: 'unexplored' };
}

// ── newsym ──
/* include/display.h:894 obj_to_glyph() — a CORPSE does NOT become an object
   glyph. It becomes `corpsenm + GLYPH_BODY_OFF`, a BODY glyph, and a body
   glyph takes the colour of the MONSTER it came from rather than
   objects[CORPSE].oc_color. Drawing every corpse the object's brown was wrong
   for every species that is not brown: seed1500's first frame differs by
   exactly one cell, a red '%' we drew brown.

   The symbol is unchanged, because def_oc_syms[FOOD_CLASS] and the body
   glyph's symbol are both '%'. */
// include/display.h:806 obj_is_generic() — an undetailed (!dknown) potion,
// real/glass gem, or spellbook displays as its CLASS's generic glyph.
function obj_is_generic(obj) {
    return !obj.dknown
           && (obj.oclass === OCLASSES.POTION_CLASS
               || (obj.otyp >= ONAMES.FIRST_REAL_GEM
                   && obj.otyp <= ONAMES.LAST_GLASS_GEM)
               || (obj.otyp >= ONAMES.FIRST_SPELL
                   && obj.otyp <= ONAMES.LAST_SPELL));
}

function floor_object_glyph(obj, x, y) {
    /* src/display.c:340 _map_location() — if the object would display as
       generic but the hero can see the spot from nearby (same radius as
       distant_name(): r = max(u.xray_range, 2), neardist = 2r²−r), mark
       it as seen up close first; it is then drawn as the specific object. */
    if (x !== undefined && obj_is_generic(obj) && cansee(x, y)
        && !Hallucination()) {
        const r = ((game.u?.xray_range ?? -1) > 2) ? game.u.xray_range : 2;
        const neardist = r * r * 2 - r;
        if (distu(x, y) <= neardist)
            observe_object(obj);
    }
    const oc = game.objects?.[obj.otyp];
    let color = oc?.oc_color ?? NO_COLOR;
    let sym = def_oc_syms[obj.oclass] || '?';
    /* the glyph descriptor mirrors C's obj_to_glyph(): a statue and a corpse
       get their own glyph ranges (GLYPH_STATUE_OFF / GLYPH_BODY_OFF), which
       is what glyph_is_statue() tests in do_screen_description() */
    const gdesc = { kind: 'obj', otyp: obj.otyp, oclass: obj.oclass,
                    corpsenm: obj.corpsenm,
                    statue: obj.otyp === ONAMES.STATUE && obj.corpsenm >= 0,
                    body: obj.otyp === ONAMES.CORPSE && obj.corpsenm >= 0 };

    /* include/display.h:950 statue_to_glyph() — a STATUE becomes
       corpsenm + GLYPH_STATUE_*_OFF, i.e. it is drawn with the MONSTER's
       symbol and colour, not the object's. Unlike a corpse, where only the
       colour changes because both glyphs use '%', a statue's SYMBOL changes
       too: we were drawing '`' where C draws the creature's letter. */
    if (obj.otyp === ONAMES.STATUE && obj.corpsenm >= 0) {
        /* src/display.c:2829 — the statue takes the MONSTER's symbol
           but the STATUE OBJECT's colour:
               sym.symidx = mons[offset].mlet + SYM_OFF_M;
               obj_color(STATUE);
           so a grid bug statue is an 'x' in stone grey, not in the
           grid bug's magenta. */
        const mptr = game.mons?.[obj.corpsenm];
        if (mptr)
            sym = def_monsyms[mptr.mlet] || sym;
        color = game.objects?.[ONAMES.STATUE]?.oc_color ?? color;
    } else if (obj.otyp === ONAMES.CORPSE && obj.corpsenm >= 0) {
        color = game.mons?.[obj.corpsenm]?.mcolor ?? color;
    } else if (obj_is_generic(obj)) {
        /* include/display.h:940 generic_obj_to_glyph() — the generic glyph
           is oclass + GLYPH_OBJ_OFF, whose colour comes from the dummy
           class entry objects[oclass] (grey), not from the shuffled
           description of the specific otyp. */
        color = game.objects?.[obj.oclass]?.oc_color ?? color;
        gdesc.generic = true;
    }
    return { ch: sym, color, dec: false, glyph: gdesc };
}

/* swallowed() state: last drawn position (C statics) */
let swallowed_lastx = 0, swallowed_lasty = 0;

// src/display.c:1332 swallowed() — display the hero surrounded by the
// engulfer's interior. first=1 clears the screen and redraws the status
// line; later calls just erase the old 3x3 patch.
export async function swallowed(first) {
    const u = game.u;

    if (first) {
        await cls();
        bot();
    } else {
        for (let y = swallowed_lasty - 1; y <= swallowed_lasty + 1; y++)
            for (let x = swallowed_lastx - 1; x <= swallowed_lastx + 1; x++)
                if (isok(x, y))
                    show_glyph_cell(x, y, ' ', NO_COLOR, false, 0,
                                    { kind: 'unexplored' });
    }

    const swallower = u.ustuck ? game.mons[u.ustuck.mnum] : null;
    const swcolor = swallower?.mcolor ?? NO_COLOR;
    const sw = (name) => {
        const idx = defsyms.findIndex(d => d.name === name);
        const s = showsym(idx);
        return { ch: s ? s.ch : '?', dec: s ? s.dec : false, cmap: idx };
    };
    const put = (x, y, name) => {
        const g = sw(name);
        show_glyph_cell(x, y, g.ch, swcolor, g.dec, 0,
                        { kind: 'swallow', cmap: g.cmap });
    };
    const left_ok = isok(u.ux - 1, u.uy);
    const rght_ok = isok(u.ux + 1, u.uy);

    if (isok(u.ux, u.uy - 1)) {
        if (left_ok) put(u.ux - 1, u.uy - 1, 'S_sw_tl');
        put(u.ux, u.uy - 1, 'S_sw_tc');
        if (rght_ok) put(u.ux + 1, u.uy - 1, 'S_sw_tr');
    }
    if (left_ok) put(u.ux - 1, u.uy, 'S_sw_ml');
    show_glyph_cell(u.ux, u.uy, '@', CLR_WHITE, false, 0, { kind: 'hero' });
    if (rght_ok) put(u.ux + 1, u.uy, 'S_sw_mr');
    if (isok(u.ux, u.uy + 1)) {
        if (left_ok) put(u.ux - 1, u.uy + 1, 'S_sw_bl');
        put(u.ux, u.uy + 1, 'S_sw_bc');
        if (rght_ok) put(u.ux + 1, u.uy + 1, 'S_sw_br');
    }

    swallowed_lastx = u.ux;
    swallowed_lasty = u.uy;
}

// src/display.c:1574 see_nearby_objects() — mark the top object of nearby
// stacks as having been seen, and if that object was being displayed as
// generic, redisplay it as specific.  Called from u_on_newpos() whenever the
// hero moves on the same level.
export function see_nearby_objects() {
    const x = game.u.ux, y = game.u.uy;
    /* these 'r' and 'neardist' calculations match distant_name(objnam.c) */
    const r = ((game.u?.xray_range ?? -1) > 2) ? game.u.xray_range : 2;
    const neardist = r * r * 2 - r;

    for (let iy = y - r; iy <= y + r; ++iy)
        for (let ix = x - r; ix <= x + r; ++ix) {
            if (!isok(ix, iy))
                continue;
            /* skip if no object or the object has already been marked as
               having been seen up close */
            const obj = (game.level?.objects || [])
                            .find(o => o.ox === ix && o.oy === iy);
            if (!obj || obj.dknown)
                continue;
            /* skip if the spot can't be seen or is too far (diagonal) */
            if (!cansee(ix, iy) || distu(ix, iy) > neardist)
                continue;

            const was_generic = obj_is_generic(obj);
            observe_object(obj);
            /* C tests the remembered glyph: only a generic-displayed
               object needs a redisplay after being observed */
            if (was_generic)
                newsym(ix, iy);
        }
}

export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    /* src/display.c:967 — `lev->waslit = (lev->lit != 0)`, inside newsym's
       cansee() branch and BEFORE the hero-specific handling, so the hero's own
       square is updated too. C deliberately uses lev->lit rather than
       templit(): otherwise a non-permanently lit area just out of sight would
       stay remembered as lit ("the light pool problem"). Without this, a
       square that a scroll of light had just lit kept waslit clear, so
       back_to_glyph picked S_corr over S_litcorr and the corridor stayed
       default-coloured instead of white. */
    if (cansee(x, y))
        loc.waslit = loc.lit ? 1 : 0;

    if (game.u?.ux === x && game.u?.uy === y) {
        /* Hero. Map memory keeps the topmost non-monster layer, so an object
           underfoot is what the cell reverts to after stepping off —
           src/display.c _map_location() sets lev->glyph to the object glyph,
           and display_self() draws '@' over it. */
        show_glyph_cell(x, y, '@', CLR_WHITE, false, 0, { kind: 'hero' });
        const under = (game.level?.objects || [])
                          .find(o => o.ox === x && o.oy === y);
        const tg = under ? floor_object_glyph(under, x, y)
                         : terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                 glyph: tg.glyph
                                     ?? { kind: 'cmap', cmap: tg.cmap } };
        return;
    }

    // src/display.c newsym() picks in priority order: hero, then monster, then
    // object, then trap, then terrain. Only the cell in sight is redrawn; a
    // remembered glyph is what the hero recalls of somewhere no longer
    // visible. Memory (lev->glyph in C, _map_location()) stores the object
    // layer too — a monster is drawn OVER it and is not itself remembered.
    if (cansee(x, y)) {
        /* C shows the TOP of the pile, and our object list is newest-first
           (place_object prepends), so the first match is the top. */
        const obj = (game.level?.objects || [])
                        .find(o => o.ox === x && o.oy === y);
        const memg = obj ? floor_object_glyph(obj, x, y)
                         : (engraving_glyph(loc, x, y)
                            || terrain_glyph(loc, x, y));
        if (game.level?.flags?.hero_memory)
            loc.remembered_glyph = { ch: memg.ch, color: memg.color,
                                     decgfx: memg.dec,
                                     glyph: memg.glyph
                                         ?? { kind: 'cmap', cmap: memg.cmap } };

        const mon = (game.level?.monsters || [])
                        .find(m => m.mx === x && m.my === y && m.mhp > 0
                                   && !m.msleeping_hidden);
        if (mon) {
            show_glyph_cell(x, y, def_monsyms[mon.data.mlet] || '?',
                            mon.data.mcolor ?? NO_COLOR, false, 0,
                            { kind: 'mon', mon });
            return;
        }

        if (obj) {
            show_glyph_cell(x, y, memg.ch, memg.color, memg.dec, 0, memg.glyph);
            return;
        }
    } else {
        /* src/display.c newsym(), the can't-see branch: a monster the hero
           senses, or sees with infravision, is still displayed */
        const mon = (game.level?.monsters || [])
                        .find(m => m.mx === x && m.my === y && m.mhp > 0
                                   && !m.msleeping_hidden);
        if (mon && (sensemon(mon)
                    || (see_with_infrared(mon) && mon_visible(mon)))) {
            show_glyph_cell(x, y, def_monsyms[mon.data.mlet] || '?',
                            mon.data.mcolor ?? NO_COLOR, false, 0,
                            { kind: 'mon', mon });
            return;
        }
    }

    /* src/display.c:455 _map_location() — the TRAP layer sits between the
       object layer and the engraving/background one:
           else if ((trap = t_at(x,y)) && trap->tseen && !covers_traps(x,y))
               map_trap(trap, show);
       It was missing entirely, so a trap the hero had already discovered was
       never drawn: seed0002 knew about the dart trap at (75,12) with tseen
       set from step 87 on and still painted plain floor there. */
    {
        const trap = t_at(x, y);
        if (trap && trap.tseen && !covers_traps(x, y)) {
            const tg = trap_glyph(trap);
            if (game.level?.flags?.hero_memory)
                loc.remembered_glyph = { ch: tg.ch, color: tg.color,
                                         decgfx: false,
                                         glyph: { kind: 'cmap', cmap: tg.cmap } };
            if (cansee(x, y)) {
                show_glyph_cell(x, y, tg.ch, tg.color, false, 0,
                                { kind: 'cmap', cmap: tg.cmap });
                return;
            }
        }
    }

    /* src/display.c:422 map_location():
     *
     *     if (spot_shows_engravings(x, y)
     *         && (ep = engr_at(x, y)) != 0 && !covers_traps(x, y)) {
     *         if (cansee(x, y)) ep->erevealed = 1;
     *         map_engraving(ep, 0);
     *     } else {
     *         map_background(x, y, 0);
     *     }
     *
     * An engraving REPLACES the background glyph. We generate engravings
     * (js/engrave.js) but drew the plain floor over them, so seed0105's very
     * first frame was one cell wrong and every one of its 30 steps failed.
     */
    /* src/display.c newsym(), the out-of-sight arm: a dangerous monster the
       hero cannot see but is Warned of floats above the memory as a digit.
       display_warning() -> warning_of(): level/4 clamped to 1..5; colors from
       drawing.c def_warnsyms (1-3 red, 4 magenta, 5 bright magenta). */
    if (!cansee(x, y)) {
        const wmon = (game.level?.monsters || [])
            .find(m => m.mx === x && m.my === y && m.mhp > 0);
        if (wmon && mon_warning(wmon)) {
            let wl = ((wmon.m_lev ?? 0) / 4) | 0;
            if (wl > 5) wl = 5;
            if (wl < 1) wl = 1;
            const warncolor = [CLR_WHITE, 1, 1, 1, 5, 13];
            show_glyph_cell(x, y, String(wl), warncolor[wl], false, 0,
                            { kind: 'warn', wl });
            return;
        }
    }

    const tg = engraving_glyph(loc, x, y) || terrain_glyph(loc, x, y);
    // Only update display/memory if cell is IN_SIGHT (lit and visible)
    if (cansee(x, y)) {
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec, 0,
                        { kind: 'cmap', cmap: tg.cmap });
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                     glyph: { kind: 'cmap', cmap: tg.cmap } };
        }
    } else if (loc.remembered_glyph) {
        /* src/display.c:852,898 — "Corridors are never felt as lit":
           a remembered lit corridor reverts to the dark one (S_corr) when
           the cell is out of sight and not waslit; C rewrites lev->glyph. */
        if (loc.typ === CORR && loc.remembered_glyph.color === CLR_WHITE
            && !loc.waslit)
            loc.remembered_glyph = { ch: '#', color: NO_COLOR, decgfx: false,
                                     glyph: { kind: 'cmap', cmap: CM.S_corr } };
        // Out of sight but remembered — show remembered glyph
        show_glyph_cell(x, y, loc.remembered_glyph.ch,
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx, 0,
            loc.remembered_glyph.glyph);
    } else {
        /* src/display.c map_location(): out of sight with NO memory is
           GLYPH_UNEXPLORED — painted blank. Without this, a glyph drawn
           here by the sensed/infravision arm above survives after the
           monster leaves. */
        show_glyph_cell(x, y, ' ', NO_COLOR, false, 0,
                        { kind: 'unexplored' });
    }
}


// include/engrave.h:50 spot_shows_engravings(), include/display.h:633
// engraving_to_glyph() -> engraving_to_defsym(), include/defsym.h:114,118.
//
// S_engroom and S_engrcorr are both CLR_BRIGHT_BLUE; only the character
// differs, and it is picked from the terrain the engraving sits on.
function engraving_glyph(loc, x, y) {
    const typ = loc?.typ;
    if (!(typ === CORR || typ === ICE || typ === ROOM))
        return null;

    const ep = engr_at(x, y);
    if (!ep)
        return null;

    /* covers_traps() needs the trap-covering objects; nothing generated on an
       early level covers an engraving. */
    if (cansee(x, y))
        ep.erevealed = 1;

    return typ === CORR
        ? { ch: '#', color: CLR_BRIGHT_BLUE, dec: false, cmap: CM.S_engrcorr }
        : { ch: '`', color: CLR_BRIGHT_BLUE, dec: false, cmap: CM.S_engroom };
}

// ── docrt ──
export async function docrt() {
    if (!game.level) return;

    /* src/display.c:1739 — docrt_flags() clears first unless docrtNocls.
       cls() flushes the message window, so an unacknowledged message gets
       its --More-- BEFORE the map is wiped and repainted; that is why C
       shows the old level under "You descend the stairs.--More--". */
    await cls();

    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level.at(x, y);
            if (loc?.remembered_glyph) {
                show_glyph_cell(x, y, loc.remembered_glyph.ch,
                    loc.remembered_glyph.color, loc.remembered_glyph.decgfx, 0,
                    loc.remembered_glyph.glyph);
            }
        }
    /* src/display.c:1761 — "overlay with monsters": see_monsters() runs a
       newsym over every live monster, which is what brings the pet back
       after a menu overlay is dismissed and the map redrawn from memory. */
    for (const mtmp of game.level.monsters || []) {
        if (mtmp.mhp <= 0) continue;
        newsym(mtmp.mx, mtmp.my);
    }
    if (game.u?.ux > 0)
        show_glyph_cell(game.u.ux, game.u.uy, '@', CLR_WHITE, false, 0,
                        { kind: 'hero' });

    /* C's docrt() only refills the glyph buffer; the physical paint comes
       from the flush its caller always reaches before the next input (the
       moveloop, pline(), or wintty's erase arm). Many port call sites were
       written without that trailing flush, so docrt flushes here itself —
       inside goto_level's flush_screen(-1) bracket this is a no-op and the
       old level stays painted, exactly as in C. */
    await flush_screen(0);
}

// ── Serialize a map row with DEC line-drawing and ANSI colors ──
function render_map_row(y) {
    if (!game.level) return '';
    let firstCol = -1, lastCol = -1;
    for (let x = 1; x < COLNO; x++) {
        const loc = gbuf_at(x, y);
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
        const loc = gbuf_at(x, y);
        const ch = loc?.disp_ch ?? ' ';
        const color = term_start_color(loc?.disp_color ?? NO_COLOR);
        const dec = !!loc?.disp_decgfx;

        if (ch === ' ') {
            // Space runs
            let run = 1;
            while (x + run <= lastCol && (gbuf_at(x + run, y)?.disp_ch ?? ' ') === ' ') run++;
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

// src/botl.c:20 get_strength_str() — Strength above 18 prints as 18/xx.
//
// include/attrib.h:36-37: STR18(x) is 18+x and STR19(x) is 100+x, so a stored
// 19 means 18/01 and a stored 119 means 19. Printing the raw number showed
// "St:19" where C shows "St:18/01" — the value was right, the rendering wasn't.
function get_strength_str() {
    const STR18 = (x) => 18 + x;
    const st = ACURR(0);                    /* ACURR(A_STR) as in C botl.c */

    if (st > 18) {
        if (st > STR18(100))
            return String(st - 100);
        else if (st < STR18(100))
            return `18/${String(st - 18).padStart(2, '0')}`;
        else
            return '18/**';
    }
    return String(st);
}

// ── Status lines ──
function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    /* src/botl.c:989 — the status line capitalises the first letter of the
       name; svp.plname itself is left as the player typed it. */
    const rawname = game.plname || 'Hero';
    const name = rawname.charAt(0).toUpperCase() + rawname.slice(1);
    /* src/botl.c rank() — the status line shows the RANK for the hero's
       experience level, not the role name. This read urole.rank.m, which only
       worked against the stub role record that used to be installed here. */
    const role = rank();
    const title = `${name} the ${role}`;
    /* src/botl.c:87 — u.acurr.a[] is indexed by the include/attrib.h enum
       (A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA), which is NOT the order the
       status line prints them in. This used to read a[0..5] straight through,
       which only worked while the values were a hardcoded array already
       written in display order. */
    const A_STR = 0, A_INT = 1, A_WIS = 2, A_DEX = 3, A_CON = 4, A_CHA = 5;
    /* src/botl.c:87 prints ACURR(x), never the raw array: abon and atemp
       (wounded legs' temporary Dex loss) are part of the shown value. */
    const at = (i) => (game.u?.acurr ? ACURR(i) : '?');
    const stats = `St:${get_strength_str()} Dx:${at(A_DEX)} Co:${at(A_CON)} `
                + `In:${at(A_INT)} Wi:${at(A_WIS)} Ch:${at(A_CHA)}`;
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
    /* src/botl.c bot2str() — BL_EXP is only appended when flags.showexp is on,
       and BL_TIME only when flags.time is. Both default OFF; seed8000's rc
       happens to turn them on, which is what made hardcoding them look right. */
    const f = game.flags || {};
    let s = `Dlvl:${u.uz?.dlevel || 1} $:${money_cnt(game.invent)}`
          + ` HP:${u.uhp || 0}(${u.uhpmax || 0})`
          + ` Pw:${u.uen || 0}(${u.uenmax || 0})`
          + ` AC:${u.uac ?? 0}`
          + ` Xp:${u.ulevel || 1}`;
    if (f.showexp) s += `/${u.uexp || 0}`;
    if (f.time) s += ` T:${game.moves || 1}`;
    s += bot_conditions();
    return s;
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
/* Paint one gbuf cell to the terminal grid. The DEC→Unicode translation
   is for the browser-facing grid; the frozen serializer re-encodes it. */
function _paint_map_cell(display, x, y) {
    const g = gbuf_at(x, y);
    if (!g) return;
    const raw = g.disp_ch || ' ';
    const ch = g.disp_decgfx ? (DEC_TO_UNICODE[raw] || raw) : raw;
    display.setCell(x - 1, y + 1, ch,
                    term_start_color(g.disp_color ?? NO_COLOR),
                    g.disp_attr ?? 0);
}

// src/display.c:3365 set_seenv() — set the seen vector of lev as if seen
// from (x0,y0) to (x,y). Note dy is inverted, as in C.
const seenv_matrix_d = [
    [SV2, SV1,   SV0],
    [SV3, 0xFF,  SV7],   /* SVALL center */
    [SV4, SV5,   SV6],
];
export function set_seenv(lev, x0, y0, x, y) {
    const dx = x - x0, dy = y0 - y;
    lev.seenv = (lev.seenv || 0)
        | seenv_matrix_d[Math.sign(dy) + 1][Math.sign(dx) + 1];
}

// src/display.c:746 feel_location() — the hero maps a square by touch:
// seen vector set as if seen, then the memory written from the level's
// truth (top object, else seen trap, else engraving/terrain), regardless
// of vision. The levitation feel rules and the underwater arm are gated.
export function feel_location(x, y) {
    if (!isok(x, y))
        return;
    const loc = game.level?.at(x, y);
    if (!loc)
        return;

    set_seenv(loc, game.u.ux, game.u.uy, x, y);

    if (game.u.uprops?.LEVITATION)
        (game.unported ||= new Set()).add('feel_location:levitation');

    /* _map_location(x, y, 1) */
    const obj = (game.level?.objects || [])
                    .find(o => o.ox === x && o.oy === y);
    const trap = t_at(x, y);
    const memg = obj ? floor_object_glyph(obj, x, y)
        : (trap && trap.tseen) ? trap_glyph(trap)
        : (engraving_glyph(loc, x, y) || terrain_glyph(loc, x, y));
    if (game.level?.flags?.hero_memory)
        loc.remembered_glyph = { ch: memg.ch, color: memg.color,
                                 decgfx: memg.dec,
                                 glyph: memg.glyph
                                     ?? { kind: 'cmap', cmap: memg.cmap } };
    /* map_background()/map_location() record the terrain type the hero
       has last seen here (svl.lastseentyp); callers compare it to learn
       whether feeling the spot taught the hero anything. */
    loc.lastseentyp = loc.typ;
    newsym(x, y);
}

// src/display.c:2147 row_refresh() — repaint map row y, columns start..stop,
// from the glyph buffer. Cells never drawn to stay blank, like C's
// GLYPH_UNEXPLORED skip.
export function row_refresh(start, stop, y) {
    const display = game?.nhDisplay;
    if (!display) return;
    for (let x = start; x <= stop; x++)
        _paint_map_cell(display, x, y);
}

/* win/tty/topl.c putsyms()/cl_end() — paint the pending topline text into
   the terminal grid. A wrapped message overlays map rows below row 0, and
   each painted row is blanked to the right edge, exactly the tty behavior.
   Painting is IMMEDIATE in C (pline writes to the terminal at once); the
   map, in contrast, only reaches the terminal at flush_screen(). */
export function paint_topline() {
    const display = game?.nhDisplay;
    if (!display) return;
    const CO = display.cols ?? 80;
    const msgLines = (game._pending_message || '').split('\n');
    for (let r = 0; r < msgLines.length && r < 24; r++) {
        const line = msgLines[r];
        for (let c = 0; c < CO; c++)
            display.setCell(c, r, c < line.length ? line[c] : ' ',
                            NO_COLOR, 0);
    }
}

// src/display.c:1912 flush_screen() — push every not-yet-flushed gbuf
// cell to the terminal, then park the cursor on the hero (any non-zero
// cursor_on_u does, as in C, where -1 is truthy). Until this runs, newsym
// writes are invisible: that is what leaves the OLD level on screen under
// the "You descend the stairs.--More--" prompt during goto_level.
export async function flush_screen(cursor_on_u) {
    const display = game?.nhDisplay;
    if (!display) return;

    /* src/display.c:1922 — cursor_on_u == -1 TOGGLES delayed flushing.
       goto_level brackets its body in a pair of flush_screen(-1) calls so
       that plines inside the level switch cannot repaint the map early;
       the closing call flips the flag back and falls through to a real
       flush. While delayed, bot() is suppressed too: the status row keeps
       the old level's Dlvl under "You descend the stairs.--More--". */
    if (cursor_on_u === -1)
        game._delay_flushing = !game._delay_flushing;
    if (game._delay_flushing)
        return;
    if (game._flushing)
        return;
    game._flushing = true;

    /* src/display.c:1939 — if (disp.botl || disp.botlx) bot();
       The port repaints unconditionally: the botl dirty flags are not
       tracked everywhere C sets them, and the repaint is idempotent. */
    await bot();

    const rows = game.gbuf || [];
    for (let y = 0; y < ROWNO; y++) {
        const row = rows[y];
        if (!row) continue;
        for (let x = 1; x < COLNO; x++) {
            const g = row[x];
            if (g && g.gnew) {
                _paint_map_cell(display, x, y);
                g.gnew = 0;
            }
        }
    }

    if (cursor_on_u) {
        /* curs_on_u() — unless getpos has parked the cursor elsewhere */
        if (game._map_cursor)
            display.setCursor(game._map_cursor.col, game._map_cursor.row);
        else if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
    game._flushing = false;
}

// src/display.c:2189 cls()
//
//     display_nhwindow(WIN_MESSAGE, FALSE); / * flush messages * /
//     disp.botlx = TRUE;
//     clear_nhwindow(WIN_MAP);
//     clear_glyph_buffer();
//
// The first line is the one that was missing. C FLUSHES the message window:
// win/tty/wintty.c's NHW_MESSAGE arm calls more() when a message is still
// unacknowledged, then clears it, leaving toplin == TOPLINE_EMPTY. Wiping the
// text without touching the flag left toplin at TOPLINE_NEED_MORE with nothing
// behind it, so the NEXT message took update_topl's joining branch and got
// glued onto an empty string -- two leading spaces, and seed8000's last two
// screens shifted right by two columns.
export async function cls() {
    if (game._in_cls)
        return;
    game._in_cls = true;

    /* display_nhwindow(WIN_MESSAGE, FALSE) — the more() comes FIRST, while
       the previous map is still painted; only then is the map cleared. */
    if (game._toplin === TOPLINE_NEED_MORE) {
        await more();
        game._toplin = TOPLINE_NEED_MORE;   /* more() reset it; force the erase */
        tty_clear_nhwindow_message(game._topl_cury || 0);
    }
    game._pending_message = '';
    game._toplin = TOPLINE_EMPTY;

    /* clear_nhwindow(WIN_MAP) — wintty's NHW_MAP arm falls through to
       clear_screen(): the WHOLE terminal blanks, status rows included, and
       context.botlx makes bot() repaint them before the next boundary.
       clear_glyph_buffer() empties the logical buffer. */
    clear_glyph_buffer();
    const display = game?.nhDisplay;
    if (display?.clearScreen) display.clearScreen();

    game._in_cls = false;
}

// src/botl.c bot() — repaint the two status rows. C gates the call on
// context.botl/botlx in moveloop; the repaint itself is unconditional and
// idempotent, so calling it every turn draws the same rows C would. The
// rows persist between calls: a blocking prompt inside a command (the
// goto_level --More--) shows the PREVIOUS turn's status, as C does.
export async function bot() {
    const display = game?.nhDisplay;
    if (!display) return;
    const CO = display.cols ?? 80;

    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
    for (let c = 0; c < CO; c++)
        display.setCell(c, 22, c < s1.length ? s1[c] : ' ', NO_COLOR, 0);
    const s2 = _statusLine2();
    for (let c = 0; c < CO; c++)
        display.setCell(c, 23, c < s2.length ? s2[c] : ' ', NO_COLOR, 0);
}

// include/wintty.h:85 — toplin states. NEED_MORE is 1 and NON_EMPTY is 2, the
// opposite of what their order in the header suggests.
export const TOPLINE_EMPTY = 0, TOPLINE_NEED_MORE = 1, TOPLINE_NON_EMPTY = 2,
             TOPLINE_SPECIAL_PROMPT = 3;

const defmorestr = '--More--';

// ── pline ──
//
// win/tty/topl.c update_topl() ends with `ttyDisplay->toplin =
// TOPLINE_NEED_MORE`, so EVERY message leaves the top line needing
// acknowledgement. The next thing that blocks calls more(), which draws
// "--More--" and CONSUMES A KEY. Without that, the key meant for the --More--
// is read by whatever comes next — which is how the tutorial menu ended up on
// its second pass.
export async function pline(msg) {
    /* src/pline.c:266-274 — a message settles any pending vision recalc and
       flushes the screen FIRST, so the map and status under it are current.
       During goto_level's flush_screen(-1) bracket the flush is a no-op and
       the old level stays painted, exactly as in C. */
    if (game.vision_full_recalc)
        vision_recalc(0);
    if (game.u?.ux)
        await flush_screen(1);

    /* src/pline.c vpline() -> putstr(WIN_MESSAGE) -> tty_putstr() ->
       update_topl(). Assigning the message straight into the top line skipped
       the state machine entirely: a second message overwrote the first instead
       of either joining it or raising --More-- and waiting for a key. */
    await update_topl(msg);
}

// win/tty/topl.c more() — draw the suffix, block for a key, clear the top line.
//
//     tty_curs(BASE_WINDOW, cw->curx + 1, cw->cury);
//     if (cw->curx >= CO - 8) topl_putsym('\n');
//     putsyms(defmorestr);
//     xwaitforspace("\033 ");
//     ...
//     ttyDisplay->toplin = TOPLINE_EMPTY;
//
// The suffix is appended at the message's own end column with NO separating
// space, and wraps to the next row only when that column is within 8 of the
// right edge.
export async function more() {
    /* C has already painted the message by the time more() runs — pline()
       writes straight to the tty. The map is NOT brought up to date here:
       whatever flush_screen last pushed is what sits under the --More--. */
    paint_topline();

    const display = game?.nhDisplay;
    const msg = game._pending_message || '';
    /* cury must outlive the paint block: tty_clear_nhwindow() erases through
       cw->cury, and that is set here by the same test that wraps the suffix.
       A message update_topl wrapped with '\n' already sits on multiple rows;
       the suffix goes at the end of the LAST one (tty_curs(BASE_WINDOW,
       cw->curx + 1, cw->cury)). */
    const mlines = msg.split('\n');
    let row = mlines.length - 1;
    if (display) {
        const CO = display.cols ?? 80;
        let col = mlines[mlines.length - 1].length;
        if (col >= CO - 8) { col = 0; row++; }
        for (let i = 0; i < defmorestr.length && col + i < CO; i++)
            display.setCell(col + i, row, defmorestr[i], NO_COLOR, 0);
        display.setCursor(Math.min(col + defmorestr.length, CO - 1), row);
    }
    /* win/tty/topl.c more(): xwaitforspace("\033 "), NOT a bare getch. Only
       space, ESC and newline dismiss the prompt; anything else rings the bell
       and waits again, so a movement key pressed at a --More-- is still
       waiting to be read as a command afterwards. */
    await xwaitforspace('\x1b ');

    /* win/tty/topl.c more():234 — ESC sets WIN_STOP: the player has asked to
       skip this turn's remaining messages. update_topl drops the paint (but
       still buffers) and tty_yn_function skips its own more() while set. */
    if (game.morc === '\x1b')
        game._win_stop = true;

    /* win/tty/wintty.c tty_display_nhwindow(), NHW_MESSAGE:
     *
     *     more();
     *     ttyDisplay->toplin = TOPLINE_NEED_MORE;   / * more resets this * /
     *     tty_clear_nhwindow(window);
     *
     * The reassignment looks redundant and is not: tty_clear_nhwindow() only
     * does its home()/cl_end() when toplin != TOPLINE_EMPTY, and more() has
     * just set it to EMPTY. Forcing it back is what makes the erase happen.
     *
     * Clearing only _pending_message left the text already painted into the
     * grid, so whatever drew next landed on top of it: seed0360's tutorial
     * prompt starts at column 21 and the first 21 columns still read
     * "Hello wizard, welcom".
     */
    game._toplin = TOPLINE_NEED_MORE;
    game._pending_message = '';
    tty_clear_nhwindow_message(row);
    game._toplin = TOPLINE_EMPTY;
}

// win/tty/wintty.c tty_clear_nhwindow(), the NHW_MESSAGE arm:
//
//     if (ttyDisplay->toplin != TOPLINE_EMPTY) {
//         home(); cl_end();
//         if (cw->cury) docorner(1, cw->cury + 1, 0);
//         cw->curx = cw->cury = 0;
//         ttyDisplay->toplin = TOPLINE_EMPTY;
//     }
//
// cl_end() erases to end of line, so the row becomes blanks rather than
// keeping stale glyphs. cury is non-zero only when the message wrapped, which
// for more() means the "--More--" suffix went to row 1.
export function tty_clear_nhwindow_message(cury) {
    if (game._toplin === TOPLINE_EMPTY)
        return;

    const display = game?.nhDisplay;
    if (display) {
        const CO = display.cols ?? 80;
        /* row 0 is the message window's own row: blank it */
        for (let c = 0; c < CO; c++)
            display.setCell(c, 0, ' ', NO_COLOR, 0);
        /* rows a wrapped message spilled onto belong to the map: C's
           docorner() repaints them from the glyph buffer */
        for (let r = 1; r <= (cury || 0); r++) {
            for (let c = 0; c < CO; c++)
                display.setCell(c, r, ' ', NO_COLOR, 0);
            for (let x = 1; x < COLNO; x++)
                _paint_map_cell(display, x, r - 1);
        }
    }
    game._toplin = TOPLINE_EMPTY;
}

/* ---- include/display.h vision predicates, and src/display.c is_safemon ----
   These are macros in the C, shared by every file that includes display.h, so
   they belong in one place rather than a private copy per module. */

// include/display.h:27 _mon_visible()
export function mon_visible(mon) {
    /* The hero can see the monster IF it is not invisible, is not an
       undetected hider, and neither you nor it is buried. */
    return (!mon.minvis || game.u.uprops?.SEE_INVIS)
        && !mon.mundetected
        && !(mon.mburied || game.u.uburied);
}

// include/display.h:55 _sensemon() — telepathy and monster detection. Every
// arm needs a hero property no early game has; each is recorded rather than
// assumed, so a session that does have one reports itself.
export function sensemon(mon) {
    if (game.u.uswallow || game.u.uprops?.DETECT_MONSTERS
        || game.u.uprops?.TELEPAT || game.u.uprops?.WARN_OF_MON)
        (game.unported ||= new Set()).add('display:sensemon');
    return false;
}

// include/display.h:106 _see_with_infrared() — caller must check
// invisibility; infravision doesn't see invisible monsters.
export function see_with_infrared(mon) {
    return !game.u.ublind && Infravision()
           && infravisible(game.mons[mon.mnum])
           && couldsee(mon.mx, mon.my);
}

/* include/mondata.h:155 infravisible() */
const infravisible = (ptr) => !!(ptr
                                 && (ptr.mflags3 & 512 /* M3_INFRAVISIBLE */));

// include/display.h:117 _canseemon()
export function canseemon(mon) {
    if (mon.wormno)
        (game.unported ||= new Set()).add('display:canseemon:worm_known');
    return (cansee(mon.mx, mon.my) || see_with_infrared(mon))
           && mon_visible(mon);
}

// include/display.h:129 canspotmon()
export function canspotmon(mon) {
    return canseemon(mon) || sensemon(mon);
}

// src/display.c map_invisible() — remember an 'I' marker for an unseen
// monster the hero bumped into or found by searching.
export function map_invisible(x, y) {
    if (x !== game.u.ux || y !== game.u.uy) {
        const loc = game.level?.at(x, y);
        if (game.level?.flags?.hero_memory && loc)
            loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false,
                                     glyph: { kind: 'invis' } };
        show_glyph_cell(x, y, 'I', NO_COLOR, false, 0, { kind: 'invis' });
    }
}

/* include/display.h glyph_is_invisible(levl[x][y].glyph) on the REMEMBERED
   glyph */
export function glyph_is_invisible_at(x, y) {
    return game.level?.at(x, y)?.remembered_glyph?.glyph?.kind === 'invis';
}

// src/display.c unmap_invisible() — clear a stale 'I' marker.
export function unmap_invisible(x, y) {
    if (isok(x, y) && glyph_is_invisible_at(x, y)) {
        const loc = game.level.at(x, y);
        /* unmap_object(): memory reverts to the background */
        const tg = terrain_glyph(loc, x, y);
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                 glyph: { kind: 'cmap', cmap: tg.cmap } };
        newsym(x, y);
    }
}

// src/display.c:215 is_safemon() / include/display.h:159 _is_safemon()
//
// Note it is mpeaceful, NOT mtame: it covers peacefuls as well as pets, which
// is why C's comment at uhitm.c:471 says "non-pets mustn't be forced to flee".
//
// safe_dog defaults ON (include/optlist.h:634), so this reads !== false rather
// than testing truthiness -- an unset option must behave as the C default.
// See NOTES, "Default-On options: read them defensively".
export function is_safemon(mon) {
    return !!(game.flags?.safe_dog !== false && mon.mpeaceful && canspotmon(mon)
              && !game.u.uprops?.CONFUSION && !game.u.uprops?.HALLUC
              && !game.u.uprops?.STUNNED);
}

// src/display.c:233 magic_map_background() — write the true terrain into map
// memory for one cell, with the dark-cell corrections: an unlit unseen room
// floor is remembered as NOTHING (dark rooms stay blank on a magic map) and
// an unlit unseen corridor is the dark form. Memory is only overwritten when
// it currently holds background (never a remembered object).
export function magic_map_background(x, y, show) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    let tg = terrain_glyph(loc, x, y);
    /* The recorded magic maps SHOW the floors of unvisited LIT rooms and
       blank only the unlit ones, so the lit bit stands in for waslit here
       (an unvisited room can never have waslit set). */
    if (!cansee(x, y) && !loc.waslit && !loc.lit) {
        if (loc.typ === ROOM && tg.cmap === cmap_names.S_room)
            tg = null;                          /* GLYPH_NOTHING */
        else if (loc.typ === CORR)
            tg = { ch: '#', color: NO_COLOR, dec: false,
                   cmap: cmap_names.S_corr };   /* dark corr */
    }

    /* glyph_is_unexplored(lev->glyph) || glyph_is_cmap(lev->glyph) — the
       remembered glyph is background (or absent), not an object. Object
       symbols stay; '+' only counts as an object when the terrain is not
       a door (a spellbook's '+' vs the door's own glyph). */
    const rg = loc.remembered_glyph;
    const objsyms = '])[="(%!?+/$*`0_.';
    /* object glyphs are never DEC; the door's own '+' is background */
    const is_obj_memory = rg && !rg.decgfx && objsyms.includes(rg.ch)
                          && !(rg.ch === '+' && IS_DOOR(loc.typ));
    if (game.level?.flags?.hero_memory && !is_obj_memory)
        loc.remembered_glyph = tg
            ? { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                glyph: { kind: 'cmap', cmap: tg.cmap } }
            : undefined;
    if (show && tg)
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec, 0,
                        { kind: 'cmap', cmap: tg.cmap });
}

// include/display.h:64 _mon_warning() — Warning, hostile, within 10 squares,
// and at least the context warnlevel.
function mon_warning(mon) {
    const u = game.u;
    const Warning = !!(u.uprops?.WARNING || u.intrinsic?.HWarning);
    if (!Warning || mon.mpeaceful)
        return false;
    const dx = mon.mx - u.ux, dy = mon.my - u.uy;
    if (dx * dx + dy * dy >= 100)
        return false;
    return (((mon.m_lev ?? 0) / 4) | 0) >= (game.context_warnlevel ?? 0);
}
