// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { wseg_mon_at, worm_known, see_wsegs } from './worm.js';
import { money_cnt } from './u_init.js';
import { cansee, couldsee, vision_recalc } from './vision.js';
import { tty_putstr, tty_display_nhwindow } from './wintty.js';
import { rank, condtests, describe_level } from './botl.js';
import { near_capacity } from './hack.js';
import { NOT_HUNGRY, UNENCUMBERED, SICK, SICK_VOMITABLE, SICK_NONVOMITABLE, TT_LAVA,
         TT_BURIEDBALL, CONFUSION, DEAF, FLYING, HALLUC_RES, LEVITATION, SLIMED,
         STONED, STRANGLED, STUNNED, GLIB } from './const.js';
import { ACURR } from './attrib.js';
import { Unaware } from './eat.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, SDOOR, SCORR,
    IRONBARS, TREE, POOL, MOAT, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE,
    LAVAPOOL, LAVAWALL, ICE, AIR, CLOUD, WATER, DBWALL, DRAWBRIDGE_UP,
    DRAWBRIDGE_DOWN, D_BROKEN, LA_DOWN,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, SEE_INVIS, INVIS,
    BLINDED, INFRAVISION, TELEPAT, WARN_OF_MON, DETECT_MONSTERS, WARNING,
    NO_TRAP, BEAR_TRAP, PIT, SPIKED_PIT, WEB,
} from './const.js';
import { HALLUC, Is_waterlevel, isok, IS_STWALL, DB_UNDER, DB_ICE, DB_LAVA, DB_MOAT,
         M_AP_FURNITURE, WARNCOUNT, def_warnsyms, In_mines, In_sokoban,
         Is_knox_level, M_AP_NOTHING, M_AP_OBJECT, M_AP_MONSTER, M_AP_TYPE,
         PROT_FROM_SHAPE_CHANGERS, MCORPSENM, ACCESSIBLE } from './const.js';
import { ROGUESET } from './const.js';
import { visible_region_at, show_region } from './region.js';
import { In_hell } from './dungeon.js';
import { rn2_on_display_rng } from './rng.js';
import {
    objects, BOULDER, STATUE, CORPSE, POTION_CLASS, FIRST_REAL_GEM,
    LAST_GLASS_GEM, FIRST_SPELL, LAST_SPELL, FIRST_OBJECT, NUM_OBJECTS,
} from './objects.js';
import { pmname } from './do_name.js';
import { mons, NUMMONS, M3_INFRAVISIBLE, M1_MINDLESS, S_EEL, M1_FLY,
         PM_TENGU, PM_LONG_WORM_TAIL, M1_SEE_INVIS } from './monsters.js';
import { def_oc_syms } from './drawing.js';
import { observe_object } from './o_init.js';
import { is_pool, is_lava } from './makemon.js';
import { t_at } from './trap.js';
import { engr_at, sticks, can_reach_floor } from './engrave.js';
import { ENGRAVE, BURN, HEADSTONE } from './const.js';
import { NO_COLOR, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW, CLR_GREEN, CLR_CYAN,
         CLR_BLUE, CLR_BRIGHT_BLUE, CLR_RED, CLR_ORANGE, CLR_BLACK, CLR_MAGENTA,
         CLR_BRIGHT_MAGENTA, CLR_BRIGHT_GREEN, DEC_TO_UNICODE, ATR_INVERSE } from './terminal.js';

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

// C ref: symbols.c assign_graphics() -- gc.currentgraphics; the DECgraphics
// symset is the primary one, while the Rogue level shows the rogue symset
// (symbols.c init_rogue_symbols(): no DEC line drawing)
function dec_symset() {
    return /^decgraphics$/i.test(game.symset_name || '')
           && game.currentgraphics !== ROGUESET;
}

// C ref: drawing.c def_r_oc_syms[] -- object class symbols of the rogue symset
const def_r_oc_syms = [
    '\0', ']' /* ILLOBJ_SYM */, ')', ']', /* armor */
    '=',
    ',', /* amulet */
    '(', ':', /* food */
    '!', '?',
    '+', '/',
    '*', /* gold -- yes it's the same as gems */
    '*', '`',
    '0', '_', '.',
];

// C ref: symbols.c init_rogue_symbols() and display.c reset_glyphmap() --
// on the Rogue level (gc.currentgraphics == ROGUESET) a map cell uses the
// rogue symset: the default cmap symbols except '+' for doorways and
// '%' for stairs, def_r_oc_syms[] for objects, and no color (no
// H_IBM symset handling)
function rogue_cell_ch(ch, decgfx, kind, gid) {
    if (kind === 'obj' && gid && gid.otyp !== undefined && gid.otyp !== null)
        return def_r_oc_syms[objects[gid.otyp].oc_class];
    if (gid && gid.cmapidx !== undefined && gid.cmapidx !== null) {
        const i = gid.cmapidx;
        if (i === 12 || i === 13 || i === 14) /* S_ndoor, S_vodoor, S_hodoor */
            return '+';
        if (i === 25 || i === 26) /* S_upstair, S_dnstair */
            return '%';
    }
    if (decgfx)
        return DEF_CMAP_FOR_DEC[ch] ?? ch;
    return ch;
}

// ── Terrain to display character + color + DEC flag ──
// With symset:DECgraphics the DEC line-drawing glyphs are used;
// otherwise the default symbols.
function terrain_glyph(loc, x, y) {
    const tg = terrain_glyph_dec(loc, x, y);
    if (tg.dec && !dec_symset())
        /* the default symset doesn't color the branch wall variants */
        return { ch: tg.asc ?? DEF_CMAP_FOR_DEC[tg.ch] ?? tg.ch,
                 color: tg.wall ? NO_COLOR : tg.color, dec: false,
                 cmap: tg.cmap, cmapidx: tg.cmapidx };
    return { ch: tg.ch, color: tg.color, dec: tg.dec, cmap: tg.cmap,
             cmapidx: tg.cmapidx };
}

// C ref: display.h cmap_to_glyph() -- for the S_* symbols set_mimic_sym()
// gives a mimic's furniture disguise (M_AP_FURNITURE), in the
// remembered-glyph form; 'cmapidx' is glyph_to_cmap(). Walls are the
// branch's wall glyphs (cmap_walls_to_glyph()); S_altar is
// altar_to_glyph(AM_NEUTRAL).
const CMAP_NAMES = { 1: 'S_vwall', 2: 'S_hwall', 15: 'S_vcdoor', 16: 'S_hcdoor',
    22: 'S_corr', 25: 'S_upstair', 26: 'S_dnstair', 33: 'S_altar', 34: 'S_grave',
    35: 'S_throne', 36: 'S_sink', 37: 'S_fountain' };
export function cmap_to_glyph(sym) {
    let tg;
    switch (sym) {
    case 1: /* S_vwall */
        tg = { ch: 'x', color: dec_wall_color(), dec: true, wall: true };
        break;
    case 2: /* S_hwall */
        tg = { ch: 'q', color: dec_wall_color(), dec: true, wall: true };
        break;
    case 15: /* S_vcdoor */
    case 16: /* S_hcdoor */
        tg = { ch: '+', color: CLR_BROWN, dec: false };
        break;
    case 25: /* S_upstair */
        tg = { ch: '<', color: CLR_GRAY, dec: false };
        break;
    case 26: /* S_dnstair */
        tg = { ch: '>', color: CLR_GRAY, dec: false };
        break;
    case 33: /* S_altar */
        tg = { ch: '{', color: CLR_GRAY, dec: true, asc: '_' };
        break;
    case 34: /* S_grave */
        tg = { ch: '|', color: CLR_WHITE, dec: false };
        break;
    case 35: /* S_throne */
        tg = { ch: '\\', color: CLR_YELLOW, dec: false };
        break;
    case 36: /* S_sink */
        tg = { ch: '{', color: CLR_WHITE, dec: false };
        break;
    case 37: /* S_fountain */
        tg = { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
        break;
    case 22: /* S_corr */
        tg = { ch: '#', color: CLR_GRAY, dec: false };
        break;
    default:
        throw new Error(`cmap_to_glyph(): cmap symbol ${sym} not ported yet`);
    }
    if (tg.dec && !dec_symset())
        tg = { ch: tg.asc ?? DEF_CMAP_FOR_DEC[tg.ch] ?? tg.ch,
               color: tg.wall ? NO_COLOR : tg.color, dec: false };
    return { ch: tg.ch, color: tg.color, decgfx: tg.dec, cmap: CMAP_NAMES[sym],
             cmapidx: sym };
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
const S_corr_g = { ch: '#', color: CLR_GRAY, dec: false, cmap: 'S_corr', cmapidx: 22 };
const S_litcorr_g = { ch: '#', color: CLR_WHITE, dec: false, cmap: 'S_litcorr',
                      cmapidx: 23 };

// C ref: display.h cmap_walls_to_glyph() + display.c reset_glyphmap()
// wall_color(): the color of the hero's branch's wall glyphs under the
// DECgraphics symset, which gives the branch variants custom colors
// (G_vwall_mines: /brown, ..._gehennom: /red, ..._knox: /yellow,
// ..._sokoban: /blue); the main dungeon's walls keep the default.
function dec_wall_color() {
    const uz = game.u?.uz;
    if (!uz || !game.dungeons) return NO_COLOR;
    return In_mines(uz) ? CLR_BROWN
        : In_hell(uz) ? CLR_RED
          : Is_knox_level(uz) ? CLR_YELLOW
            : In_sokoban(uz) ? CLR_BLUE
              : NO_COLOR;
}

// C ref: display.c back_to_glyph() -- the background glyph of a spot,
// as { ch, color, dec } with the DECgraphics symset's line-drawing
// characters (dat/symbols "DECgraphics") where it overrides defsym.h;
// terrain_glyph() maps those back to the defsym.h defaults (asc) otherwise.
function terrain_glyph_dec(loc, x, y) {
    const typ = loc.typ;
    const arboreal = !!game.level?.flags?.arboreal;
    /* cmapidx: the defsym.h S_* index (glyph_to_cmap()) */
    const S_stone = { ch: ' ', color: NO_COLOR, dec: false, cmapidx: 0 };
    const S_tree = { ch: 'g', color: CLR_GREEN, dec: true, asc: '#', cmapidx: 18 };
    const S_room = { ch: '~', color: NO_COLOR, dec: true, cmap: 'S_room', cmapidx: 19 }; /* '.' */
    const S_ndoor = { ch: '~', color: CLR_GRAY, dec: true, cmapidx: 12 };   /* '.' */
    const S_hwall = { ch: 'q', color: NO_COLOR, dec: true, cmapidx: 2 };   /* '-' */
    const S_vwall = { ch: 'x', color: NO_COLOR, dec: true, cmapidx: 1 };   /* '|' */
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
        /* the wall glyph varies by dungeon branch (display.h
           cmap_walls_to_glyph()); the DECgraphics symset colors the
           branch variants (dat/symbols G_<wall>_mines: /brown etc.) */
        const wc = dec_wall_color();
        switch (wall_angle(loc)) {
        case 'S_tree':   return S_tree;
        case 'S_hwall':  return { ...S_hwall, color: wc, wall: true };    // ─
        case 'S_vwall':  return { ...S_vwall, color: wc, wall: true };    // │
        case 'S_tlcorn': return { ch: 'l', color: wc, dec: true, wall: true, cmapidx: 3 };  // ┌
        case 'S_trcorn': return { ch: 'k', color: wc, dec: true, wall: true, cmapidx: 4 };  // ┐
        case 'S_blcorn': return { ch: 'm', color: wc, dec: true, wall: true, cmapidx: 5 };  // └
        case 'S_brcorn': return { ch: 'j', color: wc, dec: true, wall: true, cmapidx: 6 };  // ┘
        case 'S_crwall': return { ch: 'n', color: wc, dec: true, wall: true, cmapidx: 7 };  // ┼
        case 'S_tuwall': return { ch: 'v', color: wc, dec: true, wall: true, cmapidx: 8 };  // ┴
        case 'S_tdwall': return { ch: 'w', color: wc, dec: true, wall: true, cmapidx: 9 };  // ┬
        case 'S_tlwall': return { ch: 'u', color: wc, dec: true, wall: true, cmapidx: 10 };  // ┤
        case 'S_trwall': return { ch: 't', color: wc, dec: true, wall: true, cmapidx: 11 };  // ├
        default:         return S_stone;
        }
    }
    case DOOR:
        if (loc.doormask) {
            if (loc.doormask & D_BROKEN)
                return S_ndoor;
            else if (loc.doormask & D_ISOPEN) /* S_hodoor '|' / S_vodoor '-' */
                return { ch: 'a', color: CLR_BROWN, dec: true, asc: loc.horizontal ? '|' : '-',
                         cmapidx: loc.horizontal ? 14 : 13 };
            else /* else is closed: S_hcdoor / S_vcdoor */
                return { ch: '+', color: CLR_BROWN, dec: false,
                         cmapidx: loc.horizontal ? 16 : 15 };
        }
        return S_ndoor;
    case IRONBARS:  return { ch: '|', color: CLR_CYAN, dec: true, asc: '#', cmapidx: 17 };  /* S_bars */
    case TREE:      return S_tree;
    case POOL:
    case MOAT:      return { ch: '`', color: CLR_BLUE, dec: true, asc: '}', cmapidx: 38 };  /* S_pool */
    case STAIRS:
    case LADDER: {
        let down;
        if (loc.ladder) down = !!(loc.ladder & LA_DOWN);
        else down = !(game.level?.upstair?.x === x && game.level?.upstair?.y === y);
        /* S_brupstair/S_brdnstair (and ladders) for known branch stairs */
        const br = known_branch_stairs(stairway_at(x, y));
        /* S_upstair 25, S_dnstair 26, S_upladder 27, S_dnladder 28,
           S_brupstair 29 .. S_brdnladder 32 */
        const cmapidx = (br ? 29 : 25) + (typ === LADDER ? 2 : 0) + (down ? 1 : 0);
        if (typ === LADDER)
            return { ch: down ? 'z' : 'y', color: br ? CLR_YELLOW : CLR_BROWN,
                     dec: true, asc: down ? '>' : '<', cmapidx };
        return { ch: down ? '>' : '<', color: br ? CLR_YELLOW : CLR_GRAY, dec: false,
                 cmapidx };
    }
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false, cmapidx: 37 };
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false, cmapidx: 36 };
    case ALTAR:     return { ch: '{', color: CLR_GRAY, dec: true, asc: '_', cmapidx: 33 };  /* S_altar */
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false, cmapidx: 34 };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false, cmapidx: 35 };
    case LAVAPOOL:  return { ch: '`', color: CLR_RED, dec: true, asc: '}', cmapidx: 40 };
    case LAVAWALL:  return { ch: '`', color: CLR_ORANGE, dec: true, asc: '}', cmapidx: 41 };
    case ICE:       return { ch: '~', color: CLR_CYAN, dec: true, asc: '.', cmapidx: 39 };
    case AIR:       return { ch: ' ', color: CLR_CYAN, dec: false, cmapidx: 46 };
    case CLOUD:     return { ch: '#', color: CLR_GRAY, dec: false, cmapidx: 47 };
    case WATER:     return { ch: '`', color: CLR_BLUE, dec: true, asc: '}', cmapidx: 48 };
    case DBWALL:    return { ch: '#', color: CLR_BROWN, dec: false,
                             cmapidx: loc.horizontal ? 45 : 44 };
    case DRAWBRIDGE_UP: return S_room;
    case DRAWBRIDGE_DOWN: return { ch: '~', color: CLR_BROWN, dec: true, asc: '#',
                                   cmapidx: loc.horizontal ? 43 : 42 };
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
// objpile: the glyph is one of the *_PILETOP glyphs (MG_OBJPILE)
// gid: which glyph of its range it is, when known: { otyp, corpsenm } for
// an object glyph (glyph_to_obj(), glyph_to_body_corpsenm()), { cmapidx }
// for a cmap glyph (glyph_to_cmap()), { mndx } for a monster glyph
// (glyph_to_mon())
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0,
                                kind = 'cmap', objpile = false, gid = null) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (game.currentgraphics === ROGUESET) {
        ch = rogue_cell_ch(ch, decgfx, kind, gid);
        decgfx = false;
        color = NO_COLOR;
    }
    loc.disp_ch = ch;
    loc.disp_color = color;
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    /* which glyph range the shown glyph comes from (glyph_is_monster(),
       glyph_is_object(), glyph_is_trap(), glyph_is_invisible(), ...) */
    loc.disp_kind = kind;
    loc.disp_objpile = !!objpile;
    loc.disp_gid = gid;
    loc.gnew = 1;
}

/* the glyph identity fields of a glyph (see show_glyph_cell()) */
function glyph_gid(glyph) {
    if (glyph.otyp === undefined && glyph.cmapidx === undefined
        && glyph.mndx === undefined)
        return null;
    return { otyp: glyph.otyp, corpsenm: glyph.corpsenm,
             cmapidx: glyph.cmapidx, mndx: glyph.mndx };
}

// C ref: wintty.c tty_print_glyph() -- the video attribute a map cell is
// printed with. MG_PET with hilite_pet gives iflags.wc2_petattr (worked
// out by display_monster() into disp_attr); otherwise MG_OBJPILE with
// hilite_pile is shown in inverse when use_inverse is on. Like the tty,
// this is decided when the glyph is printed, from the current options.
function tty_glyph_attr(loc) {
    if (loc.disp_attr)
        return loc.disp_attr;
    if (loc.disp_objpile && game.iflags?.hilite_pile
        && game.iflags?.wc_inverse !== false)
        return ATR_INVERSE;
    return 0;
}

/* the glyph range of a remembered glyph (lev->glyph): map_object(),
   map_trap(), map_engraving() and map_invisible() mark theirs; the rest
   are background (cmap) glyphs */
export function glyph_kind(rg) {
    return !rg ? 'cmap' : rg.kind === 'mon' ? 'mon'
           : rg.invisible ? 'invisible' : rg.obj ? 'obj'
           : rg.trap ? 'trap' : rg.engr ? 'engr' : 'cmap';
}

// C ref: mkroom.c cmap_to_type() -- indexed by defsym.h S_* (S_stone 0 ..
// S_water 48, in defsym.h order); the catchall is STONE
const CMAP_TO_TYPE = [
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL,
    DOOR, DOOR, DOOR, DOOR, DOOR,         /* S_ndoor .. S_hcdoor */
    IRONBARS, TREE, ROOM, ROOM,           /* S_bars, S_tree, S_room, S_darkroom */
    STONE, CORR, CORR, STONE,             /* S_engroom, S_corr, S_litcorr, S_engrcorr */
    STAIRS, STAIRS, LADDER, LADDER,       /* S_upstair .. S_dnladder */
    STONE, STONE, STONE, STONE,           /* branch stairs/ladders */
    ALTAR, GRAVE, THRONE, SINK, FOUNTAIN, POOL, ICE, LAVAPOOL, LAVAWALL,
    DRAWBRIDGE_DOWN, DRAWBRIDGE_DOWN, DBWALL, DBWALL, /* S_vodbridge .. S_hcdbridge */
    AIR, CLOUD, WATER,
];
export function cmap_to_type(sym) {
    return CMAP_TO_TYPE[sym] ?? STONE;
}

// C ref: dbridge.c db_under_typ()
export function db_under_typ(mask) {
    switch (mask & DB_UNDER) {
    case DB_ICE: return ICE;
    case DB_LAVA: return LAVAPOOL;
    case DB_MOAT: return MOAT;
    default: return STONE;
    }
}

// C ref: dungeon.c update_lastseentyp() -- svl.lastseentyp[][] is kept on
// the level (game.level.lastseentyp), zeroed when the level is made
export function update_lastseentyp(x, y) {
    const L = game.level;
    const lev = L.at(x, y);
    let ltyp = lev.typ;
    let mtmp;

    if (ltyp === DRAWBRIDGE_UP)
        ltyp = db_under_typ(lev.drawbridgemask ?? lev.flags);
    if ((mtmp = mon_at_loc(x, y)) !== null
        && mtmp.m_ap_type === M_AP_FURNITURE && canseemon(mtmp))
        ltyp = cmap_to_type(mtmp.mappearance);
    lastseentyp_array()[x][y] = ltyp;
}

/* svl.lastseentyp[][], made (zeroed) on first use for the level */
function lastseentyp_array() {
    const L = game.level;
    if (!L.lastseentyp) {
        L.lastseentyp = [];
        for (let c = 0; c < COLNO; c++)
            L.lastseentyp.push(new Array(ROWNO).fill(0));
    }
    return L.lastseentyp;
}

// C ref: display.c show_glyph() -- for a glyph in the remembered/glyph_at()
// form
export function show_glyph(x, y, glyph) {
    show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0,
                    glyph.kind ?? glyph_kind(glyph), glyph.piletop,
                    glyph_gid(glyph));
}

// C ref: display.c back_to_glyph() -- in the remembered-glyph form
export function back_to_glyph(x, y) {
    return rememb_glyph(terrain_glyph(game.level.at(x, y), x, y));
}

// C ref: display.h trap_to_glyph() -- in the remembered-glyph form
export function trap_to_glyph(trap) {
    const [ch, color] = TRAP_DEFSYMS[trap.ttyp - 1];
    return { ch, color, decgfx: false, trap: true };
}

// C ref: display.c glyph_at() -- the glyph shown at a map spot (gbuf)
export function glyph_at(x, y) {
    const loc = game.level.at(x, y);
    return { ch: loc.disp_ch ?? ' ', color: loc.disp_color ?? NO_COLOR,
             decgfx: !!loc.disp_decgfx, kind: loc.disp_kind ?? 'cmap',
             piletop: !!loc.disp_objpile, ...(loc.disp_gid || {}) };
}

// C ref: defsym.h MONSYMS -- def_monsyms[].sym, indexed by mlet (S_ANT = 1)
const def_monsyms = " abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ@ '&;:~]";

// C ref: display.h m_at() via level.monsters[][]
function mon_at_loc(x, y) {
    for (const m of game.level?.monsters || [])
        if (m.mx === x && m.my === y && !m.dead) return m;
    return wseg_mon_at(x, y); /* a long worm's tail segment */
}

// C ref: display.h mon_visible(): not invisible (or hero sees invisible)
// and not hiding
export function mon_visible(mon) {
    const See_invisible = !!(game.u?.uprops?.[SEE_INVIS]?.intrinsic
                             || game.u?.uprops?.[SEE_INVIS]?.extrinsic);
    return (!mon.minvis || See_invisible) && !mon.mundetected;
}

/* C ref: display.h canspotself(), canseeself(), senseself();
   youprop.h Invisible, See_invisible, Unblind_telepat, Detect_monsters */
export function canspotself() {
    const u = game.u;
    const inv = u.uprops[INVIS];
    const Invis = !!((inv.intrinsic || inv.extrinsic) && !inv.blocked);
    const See_invisible = uprop(SEE_INVIS)
                          || (game.youmonst.data.mflags1 & M1_SEE_INVIS) !== 0;
    const Invisible = Invis && !See_invisible;
    const canseeself = Blind() || !!u.uswallow
                       || (!Invisible && !u.uundetected);
    const senseself = !!u.uprops[TELEPAT]?.extrinsic /* Unblind_telepat */
                      || uprop(DETECT_MONSTERS);
    return canseeself || senseself;
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
    return (mon.wormno ? worm_known(mon)
                       : (cansee(mon.mx, mon.my) || see_with_infrared(mon)))
           && mon_visible(mon);
}

// C ref: display.h _tp_sensemon()
export function tp_sensemon(mon) {
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

// C ref: display.c show_mon_or_warn()
// (the glyph is passed as its ch/color/kind, plus the MG_PET attribute and
// glyph identity, as show_glyph_cell() takes it)
function show_mon_or_warn(x, y, ch, color, kind, attr = 0, gid = null) {
    let o;

    /* "remembered, unseen monster" is tracked by object layer so if we're
       putting something on monster layer at same spot, stop remembering
       that; if an object is in view there, start remembering it instead */
    if (glyph_is_invisible(game.level.at(x, y).remembered_glyph)) {
        unmap_object(x, y);
        if (cansee(x, y) && (o = vobj_at(x, y)) != null)
            map_object(o, false);
    }

    show_glyph_cell(x, y, ch, color, false, attr, kind, false, gid);
}

// C ref: display.c display_warning()
/*
 * This is also *not* a map_XXXX() function!  Monster warnings float
 * above everything just like monsters do, but only if the monster
 * is not showing.
 *
 * Do not call for worm tails.
 */
function display_warning(mon) {
    const x = mon.mx, y = mon.my;

    if (mon_warning(mon)) {
        const wl = Hallucination() ? rn2_on_display_rng(WARNCOUNT - 1) + 1
                                   : warning_of(mon);

        /* glyph = warning_to_glyph(wl) */
        show_mon_or_warn(x, y, def_warnsyms[wl].ch, def_warnsyms[wl].color,
                         'warning');
    } else if (MATCH_WARN_OF_MON(mon)) {
        /* glyph = mon_to_glyph(mon, rn2_on_display_rng): what_mon() */
        const ptr = Hallucination() ? mons[rn2_on_display_rng(NUMMONS)]
                                    : mon.data;
        show_mon_or_warn(x, y, def_monsyms[ptr.mlet] ?? '?',
                         ptr.mcolor ?? NO_COLOR, 'mon');
    } else {
        console.error('impossible: display_warning did not match warning type?');
        return;
    }
}

// C ref: display.c warning_of()
export function warning_of(mon) {
    let wl = 0, tmp = 0;

    if (mon_warning(mon)) {
        tmp = Math.trunc((mon.m_lev || 0) / 4); /* match display.h */
        wl = (tmp > WARNCOUNT - 1) ? WARNCOUNT - 1 : tmp;
    }
    return wl;
}

// C ref: display.h sightflags for display_monster()
const PHYSICALLY_SEEN = 1, DETECTED = 2;

// C ref: display.c display_monster()
// The monster's own glyph is shown as before this port: mon_to_glyph(),
// in its mons[] color, with pet_to_glyph()'s MG_PET attribute; detected
// glyphs show the same way (not ported separately); worm tails show as
// PM_LONG_WORM_TAIL.
function display_monster(
    x, y,        /* display position */
    mon,         /* monster to display */
    sightflags,  /* 1 if the monster is physically seen;
                  * 2 if detected using Detect_monsters */
    worm_tail) { /* mon is actually a worm tail */
    const mon_mimic = (M_AP_TYPE(mon) !== M_AP_NOTHING);
    const sensed = (mon_mimic && (uprop(PROT_FROM_SHAPE_CHANGERS)
                                  || sensemon(mon)));

    /*
     * We must do the mimic check first.  If the mimic is mimicking something,
     * and the location is in sight, we have to change the hero's memory
     * so that when the position is out of sight, the hero remembers what
     * the mimic was mimicking.
     */
    if (mon_mimic && (sightflags === PHYSICALLY_SEEN)) {
        switch (M_AP_TYPE(mon)) {
        default:
            throw new Error(`display_monster: bad m_ap_type value [ = ${mon.m_ap_type} ]`);

        case M_AP_FURNITURE: {
            /*
             * This is a poor man's version of map_background().  I can't
             * use map_background() because we are overriding what is in
             * the 'typ' field.  Maybe have map_background()'s parameters
             * be (x,y,glyph) instead of just (x,y).
             *
             * mappearance is currently set to an S_ index value in
             * makemon.c.
             */
            const sym = mon.mappearance, glyph = cmap_to_glyph(sym);

            game.level.at(x, y).remembered_glyph = glyph;
            if (!sensed) {
                show_glyph(x, y, glyph);
                /* override real topology with mimic's fake one */
                lastseentyp_array()[x][y] = cmap_to_type(sym);
            }
            break;
        }

        case M_AP_OBJECT: {
            /* Make a fake object to send to map_object(). */
            const obj = {
                /* obj = cg.zeroobj */
                otyp: mon.mappearance, oclass: 0, dknown: 0, quan: 0,
                where: 'OBJ_FREE',
                ox: x, oy: y,
                /* might be mimicking a corpse or statue */
                corpsenm: (MCORPSENM(mon) !== -1 /* has_mcorpsenm(mon) */)
                          ? MCORPSENM(mon) : PM_TENGU,
            };
            map_object(obj, !sensed);
            break;
        }

        case M_AP_MONSTER: {
            /* what_mon((int) mon->mappearance, rn2_on_display_rng) */
            const mndx = Hallucination() ? rn2_on_display_rng(NUMMONS)
                                         : mon.mappearance;
            const ptr = mons[mndx];

            /* show_glyph(x, y, monnum_to_glyph(mndx, mgendercode)) */
            show_glyph_cell(x, y, def_monsyms[ptr.mlet] ?? '?',
                            ptr.mcolor ?? NO_COLOR, false, 0, 'mon', false,
                            { mndx });
            break;
        } /* case M_AP_MONSTER */
        } /* switch M_AP_TYPE() */
    }

    /* If mimic is unsuccessfully mimicking something, display the monster. */
    if (!mon_mimic || sensed) {
        /*
         * There are no glyphs for "detected pets" so we have to
         * decide whether to display such things as detected or as tame.
         * If both are being highlighted in the same way, it doesn't
         * matter, but if not, showing them as pets is preferrable.
         */
        let mndx;
        if (mon.mtame && !Hallucination()) {
            /* petnum_to_glyph(PM_LONG_WORM_TAIL) / pet_to_glyph(mon, ...) */
            mndx = worm_tail ? PM_LONG_WORM_TAIL : mon.data.pmidx;
        } else {
            /* (sightflags == DETECTED: detected_monnum_to_glyph() /
               detected_mon_to_glyph(), shown like the plain glyph here)
               monnum_to_glyph(what_mon(PM_LONG_WORM_TAIL,
                                        rn2_on_display_rng)) /
               mon_to_glyph(mon, rn2_on_display_rng) */
            mndx = what_mon(worm_tail ? PM_LONG_WORM_TAIL : mon.data.pmidx,
                            rn2_on_display_rng);
        }
        const ptr = mons[mndx];
        const ch = def_monsyms[ptr.mlet] ?? '?';
        /* a tame monster gets pet_to_glyph() (mon->mtame && !Hallucination),
           whose glyphs have MG_PET; wintty.c tty_print_glyph() shows those
           with iflags.wc2_petattr when hilite_pet is on */
        const attr = (mon.mtame && !Hallucination() && game.iflags?.wc_hilite_pet)
                     ? game.iflags.wc2_petattr : 0;
        show_mon_or_warn(x, y, ch, ptr.mcolor ?? NO_COLOR, 'mon', attr,
                         { mndx });
        mon.meverseen = 1;
    }
}

// C ref: you.h Hallucination
export function Hallucination() {
    const p = game.u?.uprops?.[HALLUC];
    return !!(p?.intrinsic || p?.extrinsic);
}

// C ref: display.h newsym_rn2 (rn2_on_display_rng) -- the display RNG is
// separate from the core one; only hallucination draws from it here
export function newsym_rn2(x) {
    return rn2_on_display_rng(x);
}

// C ref: display.h covers_objects()
export function covers_objects(x, y) {
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
// (the *_PILETOP_OFF ranges) are marked 'piletop': they map like the plain
// ones but with MG_OBJPILE, which tty shows only with hilite_pile.
// 'otyp' is glyph_to_obj() (the generic glyphs' objects[] index is the
// class), 'corpsenm' glyph_to_statue_corpsenm()/glyph_to_body_corpsenm().
export function obj_to_glyph(obj, rng) {
    if (obj.otyp === STATUE)
        return statue_to_glyph(obj, rng);
    if (Hallucination())
        return random_obj_to_glyph(rng);
    if (obj.otyp === CORPSE)
        return { ch: def_oc_syms[objects[CORPSE].oc_class],
                 color: mons[obj.corpsenm].mcolor ?? NO_COLOR, decgfx: false, obj: true,
                 piletop: obj_is_piletop(obj), otyp: CORPSE,
                 corpsenm: obj.corpsenm };
    const generic = obj_is_generic(obj);
    const offset = generic ? obj.oclass : obj.otyp;
    /* 'generic' marks glyph_is_generic_object(): objects[] 1 ..
       FIRST_OBJECT - 2 (offset 0 is the strange object's own glyph) */
    return { ch: def_oc_syms[objects[offset].oc_class],
             color: objects[offset].oc_color, decgfx: false,
             generic: generic && offset > 0 && offset < FIRST_OBJECT - 1,
             obj: true, piletop: obj_is_piletop(obj), otyp: offset };
}

// C ref: display.h random_monster()
/* won't return STRANGE_OBJECT or the generic objects */
function random_monster(rng) {
    return rng(NUMMONS);
}

// C ref: display.h random_object()
function random_object(rng) {
    return rng(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT;
}

// C ref: display.h what_mon() -- a random monster when hallucinating
export function what_mon(mon, rng) {
    return Hallucination() ? random_monster(rng) : mon;
}

// C ref: display.h random_obj_to_glyph() -- a random object's glyph (never
// a pile-top one); a random CORPSE becomes a random monster's body glyph
export function random_obj_to_glyph(rng) {
    const otg_temp = random_object(rng); /* go.otg_temp */
    if (otg_temp === CORPSE) {
        const mndx = random_monster(rng); /* + GLYPH_BODY_OFF */
        return { ch: def_oc_syms[objects[CORPSE].oc_class],
                 color: mons[mndx].mcolor ?? NO_COLOR, decgfx: false, obj: true,
                 piletop: false, otyp: CORPSE, corpsenm: mndx };
    }
    /* otg_temp + GLYPH_OBJ_OFF */
    return { ch: def_oc_syms[objects[otg_temp].oc_class],
             color: objects[otg_temp].oc_color, decgfx: false,
             generic: false, obj: true, piletop: false, otyp: otg_temp };
}

// C ref: display.h statue_to_glyph() -- while hallucinating, a statue
// shows as a random monster (a GLYPH_MON_MALE_OFF/GLYPH_MON_FEM_OFF glyph)
function statue_to_glyph(obj, rng) {
    if (Hallucination()) {
        const mndx = random_monster(rng);
        /* (!(rng)(2)) ? GLYPH_MON_MALE_OFF : GLYPH_MON_FEM_OFF */
        const female = !!rng(2);
        const ptr = mons[mndx];
        return { ch: def_monsyms[ptr.mlet] ?? '?', color: ptr.mcolor ?? NO_COLOR,
                 decgfx: false, kind: 'mon', mndx, female };
    }
    return { ch: def_monsyms[mons[obj.corpsenm].mlet] ?? '?',
             color: objects[STATUE].oc_color, decgfx: false, obj: true,
             piletop: obj_is_piletop(obj), otyp: STATUE,
             corpsenm: obj.corpsenm };
}

// C ref: display.h obj_is_piletop() -- the object is on the floor and its
// spot's pile (level.objects[ox][oy]) has a second object (->nexthere);
// a boulder hides the pile except when on top of another boulder. The pile
// is read from the floor chain the way place_object() orders it: boulders
// on top, then the rest, newest first.
function obj_is_piletop(obj) {
    if (obj.where !== 'OBJ_FLOOR')
        return false;
    let boulders = 0, count = 0;
    for (const o of game.level?.objects || []) {
        if (o.ox !== obj.ox || o.oy !== obj.oy || o.where !== 'OBJ_FLOOR')
            continue;
        count++;
        if (o.otyp === BOULDER) boulders++;
    }
    if (count < 2)
        return false;
    /* go.otg_otmp, the pile's second object, is a boulder only when the
       pile has two or more of them */
    return obj.otyp !== BOULDER || boulders >= 2;
}

// C ref: display.c map_object()
export function map_object(obj, show) {
    const x = obj.ox, y = obj.oy;
    const loc = game.level.at(x, y);
    let glyph = obj_to_glyph(obj, newsym_rn2);

    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if (glyph.generic /* glyph_is_generic_object(glyph) */
        && cansee(x, y) && !Hallucination()) {
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

        if (Hallucination() && obj.otyp === STATUE) {
            loc.remembered_glyph = random_obj_to_glyph(newsym_rn2);
        } else {
            loc.remembered_glyph = glyph;
        }
    }
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0,
                        glyph.kind ?? 'obj',
                        glyph.piletop, glyph_gid(glyph));
}

// C ref: display.c see_objects()
export function see_objects() {
    for (const obj of (game.level?.objects || []).slice())
        if (obj.where === 'OBJ_FLOOR' && vobj_at(obj.ox, obj.oy) === obj)
            newsym(obj.ox, obj.oy);

    /* update_inventory(): perm_invent isn't ported */
}

// C ref: display.c see_traps()
export function see_traps() {
    for (const trap of (game.level?.traps || []).slice()) {
        /* glyph = _glyph_at(trap->tx, trap->ty) */
        if (game.level.at(trap.tx, trap.ty).disp_kind === 'trap') /* glyph_is_trap() */
            newsym(trap.tx, trap.ty);
    }
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
// (lev->glyph): the "remembered, unseen monster" 'I'; also takes a
// glyph_at() glyph (its kind)
export function glyph_is_invisible(rg) {
    return !!rg?.invisible || rg?.kind === 'invisible';
}

// C ref: display.h glyph_is_warning() -- for a glyph_at() glyph
export function glyph_is_warning(glyph) {
    return glyph?.kind === 'warning';
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
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0, 'invisible');
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

// C ref: display.c magic_map_background()
/*
 * This function is similar to map_background (see below) except we pay
 * attention to and correct unexplored, lit ROOM and CORR spots.
 */
export function magic_map_background(x, y, show) {
    let glyph = back_to_glyph(x, y); /* assumes hero can see x,y */
    const lev = game.level.at(x, y);

    /*
     * Correct for out of sight lit corridors and rooms that the hero
     * doesn't remember as lit.
     */
    if (!cansee(x, y) && !lev.waslit) {
        /* Floor spaces are dark if unlit.  Corridors are dark if unlit. */
        if (lev.typ === ROOM && glyph.cmap === 'S_room')
            /* cmap_to_glyph(DARKROOMSYM): JS remembers S_darkroom spots
               as S_room (see newsym()) */
            glyph = (game.flags.dark_room !== false
                     && game.iflags.wc_color !== false)
                        ? glyph
                        : GLYPH_NOTHING;
        else if (lev.typ === CORR && glyph.cmap === 'S_litcorr')
            glyph = rememb_glyph(S_corr_g);
    }
    if (game.level.flags?.hero_memory
        /* glyph_is_unexplored(lev->glyph) || glyph_is_cmap(lev->glyph) */
        && glyph_kind(lev.remembered_glyph) === 'cmap')
        lev.remembered_glyph = glyph;
    if (show)
        show_glyph(x, y, glyph);

    update_lastseentyp(x, y);
}

/* GLYPH_NOTHING, shown as blank */
const GLYPH_NOTHING = { ch: ' ', color: NO_COLOR, decgfx: false, cmap: 'nothing' };
/* GLYPH_INVISIBLE in the remembered-glyph form: S_invisible 'I',
   invis_color() NO_COLOR */
export const GLYPH_INVISIBLE = { ch: 'I', color: NO_COLOR, decgfx: false,
                                 invisible: true };

// C ref: display.h mon_to_glyph() -- in the glyph_at() form; 'rng' is
// used by what_mon() when hallucinating
export function mon_to_glyph(mon, rng) {
    const mndx = Hallucination() ? rng(NUMMONS) /* random_monster(rng) */
                                 : mon.data.pmidx;
    const ptr = mons[mndx];
    return { ch: def_monsyms[ptr.mlet] ?? '?', color: ptr.mcolor ?? NO_COLOR,
             decgfx: false, kind: 'mon', mndx };
}

// C ref: display.c flash_glyph_at()
/*
 * flash_glyph_at(x, y, glyph, repeatcount)
 *
 * Briefly flash between the passed glyph and the glyph that's
 * meant to be at the location.
 */
export async function flash_glyph_at(x, y, tg, rpt) {
    const glyph = [];

    rpt *= 2; /* two loop iterations per 'count' */
    glyph[0] = tg;
    glyph[1] = (game.level.flags?.hero_memory)
               ? (game.level.at(x, y).remembered_glyph
                  ?? { ch: ' ', color: NO_COLOR, decgfx: false }) /* unexplored */
               : back_to_glyph(x, y);
    /* even iteration count (guaranteed) ends with glyph[1] showing;
       caller might want to override that, but no newsym() calls here
       in case caller has tinkered with location visibility */
    for (let i = 0; i < rpt; i++) {
        show_glyph(x, y, glyph[i % 2]);
        await flush_screen(1);
        /* nh_delay_output(): display timing only */
    }
}

/* a glyph_at() glyph in the remembered-glyph form (lev->glyph = glyph) */
export function glyph_at_to_remembered(glyph) {
    const rg = { ch: glyph.ch, color: glyph.color, decgfx: glyph.decgfx };
    switch (glyph.kind) {
    case 'obj':
        rg.obj = true;
        rg.piletop = glyph.piletop;
        rg.otyp = glyph.otyp;
        if (glyph.corpsenm !== undefined)
            rg.corpsenm = glyph.corpsenm;
        break;
    case 'trap':
        rg.trap = true;
        break;
    case 'invisible':
        rg.invisible = true;
        break;
    case 'engr':
        rg.engr = true;
        break;
    default:
        if (glyph.cmapidx !== undefined)
            rg.cmapidx = glyph.cmapidx;
        break;
    }
    return rg;
}

// C ref: display.c map_background()
export function map_background(x, y, show) {
    const loc = game.level.at(x, y);
    const tg = terrain_glyph(loc, x, y);
    if (game.level.flags?.hero_memory)
        loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                 cmap: tg.cmap, cmapidx: tg.cmapidx };
    if (show)
        show_glyph_cell(x, y, tg.ch, tg.color, tg.dec, 0, 'cmap', false,
                        tg.cmapidx !== undefined ? { cmapidx: tg.cmapidx } : null);
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
export function map_trap(trap, show) {
    const x = trap.tx, y = trap.ty;
    const [ch, color] = TRAP_DEFSYMS[trap.ttyp - 1]; /* trap_to_glyph(trap) */
    const glyph = { ch, color, decgfx: false, trap: true };

    if (game.level.flags?.hero_memory)
        game.level.at(x, y).remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0, 'trap');
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
export function map_engraving(ep, show) {
    const x = ep.engr_x, y = ep.engr_y;
    /* engraving_to_glyph(ep): engrave.h engraving_to_defsym() is
       S_engrcorr on a corridor, else S_engroom; DECgraphics doesn't
       change either */
    const glyph = (game.level.at(x, y).typ === CORR)
        ? { ch: '#', color: CLR_BRIGHT_BLUE, decgfx: false, engr: true }  /* S_engrcorr */
        : { ch: '`', color: CLR_BRIGHT_BLUE, decgfx: false, engr: true }; /* S_engroom */

    if (game.level.flags?.hero_memory)
        game.level.at(x, y).remembered_glyph = glyph;
    if (show)
        show_glyph_cell(x, y, glyph.ch, glyph.color, glyph.decgfx, 0, 'engr');
}

// C ref: display.c _map_location() -- gas
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

    update_lastseentyp(x, y);
    let ml_reg;
    if (show && !Blind() && (ml_reg = visible_region_at(x, y)) != null)
        show_region(ml_reg, x, y);
}

// C ref: display.c mon_overrides_region()
/* used by newsym() to decide whether to show a monster or a visible gas
   cloud region when both are at the same spot; caller deals with region */
function mon_overrides_region(
    mon, /* might be Null */
    mx, my) /* won't match mon->mx,my if long worm's tail */
{
    const u = game.u;
    let r;

    /* this is redundant because newsym() doesn't call us when swallowed */
    if (u.uswallow && (!mon || mon !== u.ustuck))
        return false;

    if (mon) {
        /* when not a worm tail, show mon if sensed rather than seen */
        if (mx === mon.mx && my === mon.my
            && (sensemon(mon) || mon_warning(mon)))
            return true;

        /* even if worm tail;
           check whether the spot is adjacent and 'mon' would be visible
           there if the gas cloud wasn't interfering with normal vision;
           _mon_visible() handles mon->mundetected; don't need to check
           infravision when monster is adjacent */
        r = ((u.xray_range || 0) > 1) ? u.xray_range : 1;
        if (!Blind() && mon_visible(mon)
            && mon.m_ap_type !== M_AP_FURNITURE
            && mon.m_ap_type !== M_AP_OBJECT
            && ((mx - u.ux) ** 2 + (my - u.uy) ** 2) <= r * (r + 1))
            return true;
    }

    /* if not overriding region for current mon, propagate "remembered,
       unseen monster" */
    return glyph_is_invisible(game.level.at(mx, my).remembered_glyph) ? true : false;
}

// C ref: display.c newsym_force() -- newsym() plus marking the spot as
// needing to be redrawn (gbuf[y][x].gnew)
export function newsym_force(x, y) {
    newsym(x, y);
    const loc = game.level?.at(x, y);
    if (loc)
        loc.gnew = 1;
}

/* C ref: display.h tmp_at() styles */
export const DISP_BEAM = -1, DISP_ALL = -2, DISP_TETHER = -3, DISP_FLASH = -4,
    DISP_ALWAYS = -5, DISP_CHANGE = -6, DISP_END = -7, DISP_FREEMEM = -8;
const TMP_AT_MAX_GLYPHS = 80 * 2; /* COLNO * 2 */
let tmp_at_glyph = null; /* static struct tmp_glyph *tglyph */

/* C ref: display.h enum zap_colors, display.c zapcolors[] */
const zapcolors = [ CLR_BRIGHT_BLUE /* HI_ZAP */, CLR_ORANGE, CLR_WHITE,
    CLR_BRIGHT_BLUE /* HI_ZAP */, CLR_BLACK, CLR_WHITE, CLR_GREEN,
    CLR_YELLOW ];
/* C ref: display.h enum explode_colors, display.c explodecolors[] */
const explodecolors = [ CLR_BLACK, CLR_GREEN, CLR_BROWN, CLR_BLUE,
    CLR_MAGENTA, CLR_ORANGE, CLR_WHITE ];
const NUM_ZAP = 8;

// C ref: display.c zapdir_to_glyph() -- the S_vbeam, S_hbeam, S_lslant or
// S_rslant symbol (defsym.h; DECgraphics draws the first two as line
// drawing characters) in the color of the beam type
export function zapdir_to_glyph(dx, dy, beam_type) {
    if (beam_type >= NUM_ZAP) {
        /* impossible("zapdir_to_glyph:  illegal beam type") */
        beam_type = 0;
    }
    dx = (dx === dy) ? 2 : (dx && dy) ? 3 : dx ? 1 : 0;
    const dec = dec_symset() && dx < 2;
    const ch = dec ? ['x', 'q'][dx] : ['|', '-', '\\', '/'][dx];
    return { ch, color: zapcolors[beam_type], decgfx: dec, kind: 'zap',
             cmapidx: 74 /* S_vbeam */ + dx };
}

// C ref: display.h explosion_to_glyph() -- the S_expl_tl..S_expl_br symbol
// idx (0..8, defsym.h; DECgraphics replaces four of them) in the color of
// the explosion type
export function explosion_to_glyph(expltype, idx) {
    const asc = ['/', '-', '\\', '|', ' ', '|', '\\', '-', '/'];
    const decs = [null, 'o', null, 'x', null, 'x', null, 's', null];
    const dec = dec_symset() && !!decs[idx];
    return { ch: dec ? decs[idx] : asc[idx], color: explodecolors[expltype],
             decgfx: dec, kind: 'explode', cmapidx: 96 /* S_expl_tl */ + idx };
}

// C ref: display.c tmp_at() -- DISP_BEAM, DISP_ALL, DISP_FLASH and
// DISP_ALWAYS (DISP_TETHER isn't ported yet).  A beam's glyphs are drawn
// (a --More-- during a zap shows them) and the spots the beam covered are
// remembered and newsym()'d by DISP_END, which also redraws terrain the
// beam changed (e.g. a wall dug by a zap).  A flashed glyph
// (a missile in flight) is drawn at its one spot; the next pline()'s
// flush_screen(1) shows it, as C's flush_screen(0) here would.
export function tmp_at(x, y) {
    switch (x) {
    case DISP_BEAM:
    case DISP_ALL:
    case DISP_FLASH:
    case DISP_ALWAYS:
        tmp_at_glyph = { prev: tmp_at_glyph, saved: [], style: x, glyph: y };
        /* flush_screen(0): buffered glyphs are flushed at the next input */
        return;
    case DISP_TETHER:
        throw new Error('tmp_at(): tether style not ported yet');
    case DISP_FREEMEM:
        tmp_at_glyph = null;
        return;
    default:
        break;
    }

    const tglyph = tmp_at_glyph;
    if (!tglyph)
        throw new Error('tmp_at: tglyph not initialized'); /* panic() */
    switch (x) {
    case DISP_CHANGE:
        tglyph.glyph = y;
        break;
    case DISP_END:
        if (tglyph.style === DISP_BEAM || tglyph.style === DISP_ALL) {
            /* Erase (reset) from source to end */
            for (const p of tglyph.saved)
                newsym(p.x, p.y);
        } else { /* DISP_FLASH or DISP_ALWAYS */
            if (tglyph.saved.length) /* been called at least once */
                newsym(tglyph.saved[0].x, tglyph.saved[0].y);
        }
        tmp_at_glyph = tglyph.prev;
        break;
    default: /* do it */
        if (!isok(x, y))
            break;
        if (tglyph.style === DISP_BEAM || tglyph.style === DISP_ALL) {
            if (tglyph.style !== DISP_ALL && !cansee(x, y))
                break;
            if (tglyph.saved.length >= TMP_AT_MAX_GLYPHS)
                break; /* too many locations */
            /* save pos for later erasing */
            tglyph.saved.push({ x, y });
            /* show_glyph(x, y, tglyph->glyph): callers whose beam glyph
               isn't ported yet pass 0 and nothing is drawn */
            if (tglyph.glyph)
                show_glyph(x, y, tglyph.glyph); /* show it */
        } else { /* DISP_FLASH/ALWAYS */
            if (tglyph.saved.length) { /* not first call, so reset previous pos */
                newsym(tglyph.saved[0].x, tglyph.saved[0].y);
                tglyph.saved = []; /* display is presently up to date */
            }
            if (!cansee(x, y) && tglyph.style !== DISP_ALWAYS)
                break;
            tglyph.saved = [{ x, y }];
            show_glyph(x, y, tglyph.glyph); /* show it */
            /* flush_screen(0): shown by the next flush */
        }
        break;
    }
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

    /* only permit updating the hero when swallowed */
    if (game.u?.uswallow) {
        if (game.u.ux === x && game.u.uy === y)
            display_self();
        return;
    }

    /* C ref: display.c newsym(): when the spot can be seen, remember its
       lit condition (not templit, so that temporarily lit spots re-darken
       out of sight), and an engraving there is revealed, even when
       covered by objects or a monster */
    if (cansee(x, y)) {
        const reg = visible_region_at(x, y);
        loc.waslit = (loc.lit ? 1 : 0); /* remember lit condition */
        const rmon = mon_at_loc(x, y);
        const ep = engr_at(x, y);
        if (ep)
            ep.erevealed = 1;
        /*
         * Normal region shown only on accessible positions, but
         * poison clouds and steam clouds also shown above lava,
         * pools and moats.
         * However, sensed monsters (via detection or telepathy or
         * warning) take precedence over all regions.
         * Adjacent monsters also take precedence if they would be
         * seen when there's no gas region.
         */
        if (reg && (ACCESSIBLE(loc.typ)
                    || (reg.visible && (is_pool(x, y) || is_lava(x, y))))) {
            if (!mon_overrides_region(rmon, x, y)) {
                show_region(reg, x, y);
                return;
            }
        }
    }

    if (game.u?.ux === x && game.u?.uy === y) {
        // Hero: update the remembered spot under the hero, then show self
        if (cansee(x, y)) {
            const see_self = canspotself();

            /* update map information for <u.ux,u.uy> (remembered topology,
               object, known trap) but don't display it unless we're blind
               or can't see ourself */
            _map_location(x, y, !see_self);
            if (!see_self)
                return;
        } else {
            if (!canspotself())
                throw new Error('newsym(): feel_location() of an unseen hero spot not ported yet');
            const tg = terrain_glyph(loc, x, y);
            loc.remembered_glyph = { ch: tg.ch, color: tg.color, decgfx: tg.dec,
                                     cmap: tg.cmap, cmapidx: tg.cmapidx };
            /* C ref: display.c feel_location(): Corridors are never felt
               as lit (unless remembered that way) (lit_corridor only). */
            if (loc.typ === CORR && loc.remembered_glyph.cmap === 'S_litcorr'
                && !loc.waslit)
                loc.remembered_glyph = rememb_glyph(S_corr_g);
        }
        display_self();
        return;
    }

    let mon, see_it_nv = false;
    /* Can physically see the location. */
    if (cansee(x, y)) {
        mon = mon_at_loc(x, y);
        const worm_tail = is_worm_tail(mon, x, y);
        const see_it = !!mon && (mon_visible(mon)
                                 || (!worm_tail && (tp_sensemon(mon)
                                                    || MATCH_WARN_OF_MON(mon))));
        if (mon && (see_it || (!worm_tail && uprop(DETECT_MONSTERS)))) {
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
            display_monster(x, y, mon, see_it ? PHYSICALLY_SEEN : DETECTED,
                            worm_tail);
        } else if (mon && mon_warning(mon) && !worm_tail) {
            display_warning(mon);
        } else if (glyph_is_invisible(loc.remembered_glyph)) {
            map_invisible(x, y);
        } else {
            _map_location(x, y, true); /* map the location */
        }

    /* Can't see the location. */
    } else if ((mon = mon_at_loc(x, y)) !== null
               && ((see_it_nv = (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon)
                                 || (see_with_infrared(mon)
                                     && mon_visible(mon))))
                   || (uprop(DETECT_MONSTERS) && !is_worm_tail(mon, x, y)))) {
        /* Seen or sensed monsters are printed every time.
           This also gets rid of any invisibility glyph. */
        display_monster(x, y, mon, see_it_nv ? 0 : DETECTED,
                        is_worm_tail(mon, x, y));
    } else if (mon && mon_warning(mon) && !is_worm_tail(mon, x, y)) {
        display_warning(mon);
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
            loc.remembered_glyph.color, loc.remembered_glyph.decgfx, 0,
            glyph_kind(loc.remembered_glyph), loc.remembered_glyph.piletop,
            glyph_gid(loc.remembered_glyph));
    } else {
        /* show_mem: never seen, the unexplored glyph (blank) */
        show_glyph_cell(x, y, ' ', NO_COLOR, false);
    }
}

// C ref: display.c set_seenv() -- mark the side of the spot seen from
// <x0,y0> (vision.c seenv_matrix[][])
const fl_seenv_matrix = [[SV2, SV1, SV0], [SV3, 0xFF, SV7], [SV4, SV5, SV6]];
function set_seenv(lev, x0, y0, x, y) {
    const dx = x - x0, dy = y0 - y;
    lev.seenv = (lev.seenv || 0) | fl_seenv_matrix[Math.sign(dy) + 1][Math.sign(dx) + 1];
}

// C ref: engrave.c engr_can_be_felt()
function engr_can_be_felt(ep) {
    switch (ep.engr_type) {
    case ENGRAVE:
    case HEADSTONE:
    case BURN:
        return true;
    default:
        return false;
    }
}

// C ref: display.c feel_location()
/*
 * Feel the given location.  This assumes that the hero is blind and that
 * the given position is either the hero's or one of the eight squares
 * adjacent to the hero (except for a boulder push).
 */
export function feel_location(x, y) {
    const u = game.u;
    let mon;

    /* replicate safeguards used by newsym(); might not be required here */
    if (game.in_mklev) /* _suppress_map_output() */
        return;
    if (!isok(x, y))
        return;
    const lev = game.level.at(x, y);
    /* If hero's memory of an invisible monster is accurate, we want to keep
     * him from detecting the same monster over and over again on each turn.
     * We must return (so we don't erase the monster).
     */
    if (glyph_is_invisible(lev.remembered_glyph) && mon_at_loc(x, y))
        return;

    /* The hero can't feel non pool locations while under water
       except for lava and ice. */
    if (u.uinwater)
        throw new Error('feel_location(): Underwater not ported yet');

    /* Set the seen vector as if the hero had seen it.
       It doesn't matter if the hero is levitating or not. */
    set_seenv(lev, u.ux, u.uy, x, y);

    if (!can_reach_floor(false)) {
        throw new Error('feel_location(): levitation rules not ported yet');
    } else {
        const ep = engr_at(x, y);
        if (ep && engr_can_be_felt(ep))
            ep.erevealed = 1;

        _map_location(x, y, true);

        if (game.uball) { /* Punished */
            /*
             * A ball or chain is only felt if it is first on the object
             * location list.  Otherwise, we need to clear the felt bit ---
             * something has been dropped on the ball/chain.  If the bit is
             * not cleared, then when the ball/chain is moved it will drop
             * the wrong glyph.
             */
            const uchain = game.uchain, uball = game.uball;
            if (uchain && uchain.where === 'OBJ_FLOOR'
                && uchain.ox === x && uchain.oy === y
                && vobj_at(x, y) === uchain)
                u.bc_felt |= 0x02; /* BC_CHAIN */
            else
                u.bc_felt &= ~0x02; /* do not feel the chain */

            if (uball && uball.where === 'OBJ_FLOOR'
                && uball.ox === x && uball.oy === y
                && vobj_at(x, y) === uball)
                u.bc_felt |= 0x01; /* BC_BALL */
            else
                u.bc_felt &= ~0x01; /* do not feel the ball */
        }

        /* Floor spaces are dark if unlit.  Corridors are dark if unlit.
           (JS remembers no S_darkroom glyphs; see newsym()) */
        if (lev.typ === ROOM && lev.remembered_glyph?.cmap === 'S_room'
            && (!lev.waslit || (game.flags.dark_room !== false
                                && game.iflags.wc_color !== false))) {
            lev.remembered_glyph = { ch: ' ', color: NO_COLOR, decgfx: false,
                                     cmap: 'S_stone' };
            show_glyph(x, y, lev.remembered_glyph);
        } else if (lev.typ === CORR && lev.remembered_glyph?.cmap === 'S_litcorr'
                   && !lev.waslit) {
            lev.remembered_glyph = rememb_glyph(S_corr_g);
            show_glyph(x, y, lev.remembered_glyph);
        }
    }
    /* draw monster on top if we can sense it */
    if (!(u.ux === x && u.uy === y) && (mon = mon_at_loc(x, y)) !== null
        && sensemon(mon))
        display_monster(x, y, mon,
                        (tp_sensemon(mon) || MATCH_WARN_OF_MON(mon))
                            ? PHYSICALLY_SEEN : DETECTED,
                        is_worm_tail(mon, x, y));
}

/* a terrain glyph in the remembered-glyph form (lev->glyph) */
function rememb_glyph(tg) {
    return { ch: tg.ch, color: tg.color, decgfx: tg.dec, cmap: tg.cmap,
             cmapidx: tg.cmapidx };
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
        await swallowed(1);
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
                    show_glyph_cell(x, y, gl.ch, gl.color, gl.decgfx, 0, glyph_kind(gl),
                                    gl.piletop, glyph_gid(gl));
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

// C ref: display.c see_monsters()
export function see_monsters() {
    const u = game.u;
    let new_warn_obj_cnt = 0;

    if (game.defer_see_monsters)
        return;

    /* steed and unseen engulfer/holder/holdee are recognized via touch
       even if they aren't going to be rendered; other monsters
       may get flagged as having been seen by display_monster() if it's
       called by newsym() */
    if (u.usteed)
        u.usteed.meverseen = 1;
    if (u.ustuck)
        u.ustuck.meverseen = 1;

    /* loop through level.monsters (aka fmon), in fmon order */
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if (mon.dead || mon.mhp < 1) /* DEADMONSTER(mon) */
            continue;
        if (((mon.mstate || 0) & MON_STILL_ARRIVING) !== 0)
            continue;
        newsym(mon.mx, mon.my);
        if (mon.wormno)
            see_wsegs(mon);
        if (uprop(WARN_OF_MON)
            && ((game.context.warntype?.obj ?? 0) & mon.data.mflags2) !== 0)
            new_warn_obj_cnt++;
    }

    /*
     * Make Sting glow blue or stop glowing if required.
     */
    if (new_warn_obj_cnt !== (game.warn_obj_cnt || 0))
        throw new Error('see_monsters(): Sting_effects() not ported yet');

    /* when mounted, hero's location gets caught by monster loop */
    if (!u.usteed)
        newsym(u.ux, u.uy);
}
const MON_STILL_ARRIVING = 0x100; /* C ref: monst.h */

// C ref: display.c row_refresh()
// Redraw map row y, columns start..stop, from the glyph buffer (here the
// per-location disp_* fields) onto the map window (offy 1, offx 0).
export function row_refresh(start, stop, y) {
    const display = game?.nhDisplay;
    if (!display || !game.level) return;
    for (let x = Math.max(start, 1); x <= stop && x < COLNO; x++) {
        const loc = game.level.at(x, y);
        if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
        const ch = loc.disp_decgfx ? dec_cell_char(loc.disp_ch) : loc.disp_ch;
        display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), tty_glyph_attr(loc));
    }
}

// A DEC special-graphics character as the terminal grid holds it. The tty
// recordings decode only the VT100 line-drawing set (box corners and
// rules, checkerboard, centered dot) to Unicode; the other alternate
// charset letters ('g' plus-minus for S_tree, '`' diamond, 'f' degree,
// '|' not-equal, ...) stay as their ASCII letters (frozen/screen-decode.mjs
// DEC_MAP), so only that subset is converted.
const DEC_LINE_DRAWING = 'lqkxmjtuwvna~';
function dec_cell_char(ch) {
    return DEC_LINE_DRAWING.includes(ch) ? (DEC_TO_UNICODE[ch] || ch) : ch;
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
    const Upolyd = (u.umonnum !== u.umonster);
    /* C ref: botl.c do_statusline1(): titl = !Upolyd ? rank()
       : pmname(&mons[u.umonnum], Ugender); when poly'd, capitalize
       each word of the monster name */
    let role;
    if (Upolyd) {
        const Ugender = (Upolyd ? u.mfemale : game.flags.female) ? 1 : 0;
        const titl = pmname(mons[u.umonnum], Ugender);
        role = titl.split('').map((c, i) =>
            (i === 0 || titl[i - 1] === ' ') ? c.toUpperCase() : c).join('');
    } else {
        role = game.urole?.rank ? rank() : 'Adventurer'; // C ref: botl.c rank()
    }
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
    const Upolyd = (u.umonnum !== u.umonster);
    /* BL_HD replaces BL_XP and BL_EXP while polymorphed */
    const expr = Upolyd ? `HD:${mons[u.umonnum].mlevel}`
                 : game.flags?.showexp ? `Xp:${u.ulevel || 1}/${u.uexp || 0}`
                                       : `Xp:${u.ulevel || 1}`;
    const tmmv = game.flags?.time ? ` T:${game.moves}` : '';
    /* BL_HUNGER and BL_CAP (wintty.c status_fieldfmt " %s", with the
       hunger text's trailing blanks suppressed), then BL_CONDITION */
    const hunger = (u.uhs !== undefined && u.uhs !== NOT_HUNGRY)
        ? ` ${STAT_HU[u.uhs].replace(/ +$/, '')}` : '';
    const cap = near_capacity();
    const capstr = (cap > UNENCUMBERED) ? ` ${STAT_ENC[cap]}` : '';
    /* BL_LEVELDESC: describe_level(buf, 1), with wintty.c's
       tty_status_update() suppressing its trailing blanks */
    const leveldesc = describe_level(1)[1].replace(/ +$/, '');
    /* botl.c bot_via_windowport(): BL_HP is u.uhp, but not below 0
       (gameover sets u.uhp to -1) */
    const hpval = Math.max((Upolyd ? u.mh : u.uhp) || 0, 0);
    const hpmax = (Upolyd ? u.mhmax : u.uhpmax) || 0;
    /* encglyph(objnum_to_glyph(GOLD_PIECE)): the gold symbol of the current
       symset */
    const goldsym = (game.currentgraphics === ROGUESET) ? '*' : '$';
    const line = `${leveldesc} ${goldsym}:${Math.min(money_cnt(game.invent), 999999)} HP:${hpval}(${hpmax}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 10} ${expr}${tmmv}${hunger}${capstr}${status_conditions()}`;
    /* make_things_fit(): shrinking or truncating an overlong line */
    if (line.length > 79)
        throw new Error('_statusLine2(): make_things_fit() shrinking not ported yet');
    return line;
}

/* C ref: eat.c hu_stat[], botl.c enc_stat[] */
const STAT_HU = ["Satiated", "        ", "Hungry  ", "Weak    ",
                 "Fainting", "Fainted ", "Starved "];
const STAT_ENC = ["", "Burdened", "Stressed", "Strained", "Overtaxed",
                  "Overloaded"];

/* C ref: botl.c conditions[] -- ranking and full text (txt1), in bl_*
   order; condtests[] (botl.js) holds the matching enabled flags */
const STAT_CONDITIONS = [
    [20, "Bare"], [10, "Blind"], [20, "Busy"], [10, "Conf"], [10, "Deaf"],
    [15, "Iron"], [10, "Fly"], [6, "FoodPois"], [20, "Glow"], [2, "Grab"],
    [10, "Hallu"], [20, "Held"], [20, "Icy"], [8, "InLava"], [10, "Lev"],
    [20, "Parlyz"], [10, "Ride"], [20, "Zzz"], [6, "Slime"], [20, "Slip"],
    [6, "Stone"], [4, "Strngl"], [10, "Stun"], [15, "Submrg"],
    [6, "TermIll"], [20, "Teth"], [20, "Trap"], [20, "Out"], [20, "WLegs"],
    [20, "UHold"],
];
const bl_bareh = 0, bl_blind = 1, bl_busy = 2, bl_conf = 3, bl_deaf = 4,
    bl_elf_iron = 5, bl_fly = 6, bl_foodpois = 7, bl_glowhands = 8,
    bl_grab = 9, bl_hallu = 10, bl_held = 11, bl_icy = 12, bl_inlava = 13,
    bl_lev = 14, bl_parlyz = 15, bl_ride = 16, bl_sleeping = 17,
    bl_slime = 18, bl_slippery = 19, bl_stone = 20, bl_strngl = 21,
    bl_stun = 22, bl_submerged = 23, bl_termill = 24, bl_tethered = 25,
    bl_trapped = 26, bl_unconsc = 27, bl_woundedl = 28, bl_holding = 29;
/* C ref: botl.c condopt(0, NULL, FALSE) cond_idx[] sorted by cond_cmp():
   ranking, then the condition text (strcmpi) */
const COND_IDX = STAT_CONDITIONS.map((_, i) => i).sort((a, b) => {
    const c1 = STAT_CONDITIONS[a][0], c2 = STAT_CONDITIONS[b][0];
    if (c1 !== c2)
        return c1 - c2;
    const t1 = STAT_CONDITIONS[a][1].toLowerCase(), t2 = STAT_CONDITIONS[b][1].toLowerCase();
    return t1 < t2 ? -1 : t1 > t2 ? 1 : 0;
});

// C ref: botl.c bot_via_windowport() condition tests, and wintty.c
// render_status() BL_CONDITION -- " Cond" for each condition in cond_idx
// order (cond_shrinklvl 0)
function status_conditions() {
    const u = game.u;
    const g = game;
    const P = p => u.uprops?.[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const has = p => !!((P(p).intrinsic || P(p).extrinsic) && !P(p).blocked);
    const test = new Array(STAT_CONDITIONS.length).fill(false);
    const enabled = i => !!condtests[i]?.enabled;

    if (P(SICK).intrinsic || P(SICK).extrinsic) {
        if (enabled(bl_foodpois)) test[bl_foodpois] = (u.usick_type & SICK_VOMITABLE) !== 0;
        if (enabled(bl_termill)) test[bl_termill] = (u.usick_type & SICK_NONVOMITABLE) !== 0;
    }
    if (u.utrap) {
        if (enabled(bl_inlava)) test[bl_inlava] = (u.utraptype === TT_LAVA);
        if (enabled(bl_tethered)) test[bl_tethered] = (u.utraptype === TT_BURIEDBALL);
        if (enabled(bl_trapped)) test[bl_trapped] = (!test[bl_inlava] && !test[bl_tethered]);
    }
    if (u.ustuck) {
        if (u.uswallow) {
            if (enabled(bl_held)) test[bl_held] = true;
        } else if (u.umonnum !== u.umonster
                   && sticks(g.youmonst.data)) {
            if (enabled(bl_holding)) test[bl_holding] = true;
        } else {
            if (enabled(bl_grab)) test[bl_grab] = (u.ustuck.data.mlet === S_EEL);
            if (enabled(bl_held)) test[bl_held] = !test[bl_grab];
        }
    }
    test[bl_blind] = Blind();
    test[bl_conf] = !!(P(CONFUSION).intrinsic || P(CONFUSION).extrinsic);
    test[bl_deaf] = !!(P(DEAF).intrinsic || P(DEAF).extrinsic);
    test[bl_fly] = !!((P(FLYING).intrinsic || P(FLYING).extrinsic
                       || (u.usteed && (u.usteed.data.mflags1 & M1_FLY)))
                      && !P(FLYING).blocked);
    test[bl_glowhands] = !!u.umconf;
    test[bl_hallu] = Hallucination() && !(P(HALLUC_RES).extrinsic);
    test[bl_lev] = has(LEVITATION);
    test[bl_ride] = !!u.usteed;
    test[bl_slime] = !!P(SLIMED).intrinsic;
    test[bl_stone] = !!P(STONED).intrinsic;
    test[bl_strngl] = !!P(STRANGLED).intrinsic;
    test[bl_stun] = !!(P(STUNNED).intrinsic || P(STUNNED).extrinsic);
    test[bl_submerged] = !!u.uinwater;
    if (enabled(bl_elf_iron)) test[bl_elf_iron] = false;
    if (enabled(bl_bareh)) test[bl_bareh] = (!g.uarmg && !g.uwep);
    if (enabled(bl_icy)) test[bl_icy] = (g.level.at(u.ux, u.uy).typ === ICE);
    if (enabled(bl_slippery)) test[bl_slippery] = !!P(GLIB).intrinsic;
    if (enabled(bl_woundedl))
        throw new Error('status_conditions(): Wounded_legs condition not ported yet');
    /* multi < 0: unconsc/parlyz/sleeping/busy are all opt_in and off */
    if (g.multi < 0 && (enabled(bl_unconsc) || enabled(bl_parlyz)
                        || enabled(bl_sleeping) || enabled(bl_busy)))
        throw new Error('status_conditions(): unconscious/paralyzed conditions not ported yet');

    let out = '';
    for (const ci of COND_IDX)
        if (enabled(ci) && test[ci])
            out += ` ${STAT_CONDITIONS[ci][1]}`;
    return out;
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
                const ch = loc.disp_decgfx ? dec_cell_char(loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, tty_color(loc.disp_color), tty_glyph_attr(loc));
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

    clear_glyph_buffer(); /* force gbuf[][].glyph to unexplored */
}

// C ref: display.c clear_glyph_buffer() -- the shown map glyphs (gbuf)
// become the unexplored glyph (blank)
function clear_glyph_buffer() {
    if (!game.level?.at)
        return;
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            if (game.level.at(x, y))
                show_glyph_cell(x, y, ' ', NO_COLOR, false);
}

// C ref: display.h display_self() -- the hero's glyph at <u.ux,u.uy>
function display_self() {
    const u = game.u;
    /* hero_glyph: monnum_to_glyph((Upolyd || !flags.showrace) ? u.umonnum
       : gu.urace.mnum, Ugender); a polymorphed hero shows the monster */
    if (u.umonnum !== u.umonster) { /* Upolyd */
        const ptr = mons[u.umonnum];
        show_glyph_cell(u.ux, u.uy, def_monsyms[ptr.mlet] ?? '?',
                        ptr.mcolor ?? NO_COLOR, false, 0, 'mon');
        return;
    }
    show_glyph_cell(u.ux, u.uy, '@', CLR_WHITE, false, 0, 'mon');
}

// C ref: display.c swallow_to_glyph()
/*
 * Convert a monster number and a swallow location into the correct glyph.
 * If you don't want a patchwork monster while hallucinating, decide on
 * a random monster in swallowed() and don't use what_mon() here.
 * Returns the glyph's monster (offset >> 3); 'loc' is S_sw_tl-relative.
 */
function swallow_to_glyph(mnum, loc) {
    const m_3 = what_mon(mnum, rn2_on_display_rng);

    if (loc < 0 || 7 < loc)
        throw new Error('swallow_to_glyph: bad swallow location');
    return m_3;
}

// C ref: display.c swallowed()
/*
 *  Display the hero surrounded by the monster's stomach (S_sw_tl ..
 *  S_sw_br, shown in the swallower's color).  With symset:DECgraphics the
 *  top/bottom centers and the sides are the line-drawing characters
 *  (dat/symbols "DECgraphics": S_sw_tc 'o', S_sw_ml/S_sw_mr 'x', S_sw_bc 's').
 */
let swallow_lastx = 0, swallow_lasty = 0; /* last swallowed position */
export async function swallowed(first) {
    const u = game.u;
    let left_ok, rght_ok;

    if (first) {
        await cls();
        bot();
    } else {
        /* Clear old location */
        for (let y = swallow_lasty - 1; y <= swallow_lasty + 1; y++)
            for (let x = swallow_lastx - 1; x <= swallow_lastx + 1; x++)
                if (isok(x, y))
                    show_glyph_cell(x, y, ' ', NO_COLOR, false); /* GLYPH_UNEXPLORED */
    }

    const swallower = u.ustuck.data.pmidx; /* monsndx(u.ustuck->data) */
    const dec = dec_symset();
    /* [S_sw_tl, S_sw_tc, S_sw_tr, S_sw_ml, S_sw_mr, S_sw_bl, S_sw_bc,
       S_sw_br]: { ch, dec } */
    const sym = dec
        ? [['/', false], ['o', true], ['\\', false], ['x', true], ['x', true],
           ['\\', false], ['s', true], ['/', false]]
        : [['/', false], ['-', false], ['\\', false], ['|', false], ['|', false],
           ['\\', false], ['-', false], ['/', false]];
    /* show_glyph(x, y, swallow_to_glyph(swallower, S_sw_tl + idx)) */
    const show_sw = (x, y, idx) => {
        const mnum = swallow_to_glyph(swallower, idx);
        /* reset_glyphmap(): mon_color(offset >> 3) */
        show_glyph_cell(x, y, sym[idx][0], mons[mnum].mcolor, sym[idx][1]);
    };

    /* assume isok(u.ux,u.uy) */
    left_ok = isok(u.ux - 1, u.uy);
    rght_ok = isok(u.ux + 1, u.uy);
    /*
     *  Display the hero surrounded by the monster's stomach.
     */
    if (isok(u.ux, u.uy - 1)) {
        if (left_ok)
            show_sw(u.ux - 1, u.uy - 1, 0); /* S_sw_tl */
        show_sw(u.ux, u.uy - 1, 1);         /* S_sw_tc */
        if (rght_ok)
            show_sw(u.ux + 1, u.uy - 1, 2); /* S_sw_tr */
    }

    if (left_ok)
        show_sw(u.ux - 1, u.uy, 3);         /* S_sw_ml */
    display_self();
    if (rght_ok)
        show_sw(u.ux + 1, u.uy, 4);         /* S_sw_mr */

    if (isok(u.ux, u.uy + 1)) {
        if (left_ok)
            show_sw(u.ux - 1, u.uy + 1, 5); /* S_sw_bl */
        show_sw(u.ux, u.uy + 1, 6);         /* S_sw_bc */
        if (rght_ok)
            show_sw(u.ux + 1, u.uy + 1, 7); /* S_sw_br */
    }

    /* Update the swallowed position. */
    swallow_lastx = u.ux;
    swallow_lasty = u.uy;
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
    /* this gets cleared after every pline message */
    if (game.iflags)
        game.iflags.last_msg = 0; /* PLNMSG_UNKNOWN */
}

// C ref: pline.c urgent_pline() -- vpline() with URGENT_MESSAGE: the tty
// (WC2_URGENT_MESG) gets the line with ATR_URGENT, which overrides a
// pending ESC at --More-- (WIN_STOP)
export async function urgent_pline(msg) {
    if (game.vision_full_recalc)
        vision_recalc(0);
    if (game.u?.ux)
        await flush_screen(1); /* %% */
    await tty_putstr(game.WIN_MESSAGE, 16 /* ATR_URGENT */, msg);
    /* this gets cleared after every pline message */
    if (game.iflags)
        game.iflags.last_msg = 0; /* PLNMSG_UNKNOWN */
}

// C ref: pline.c Norep() -- pline() with PLINE_NOREPEAT: msgtype_type()
// gives MSGTYP_NOREP (no MSGTYPE patterns are set), and vpline() skips a
// line that is the same as gp.prevmsg
export async function Norep(line) {
    if (line === game.prevmsg)
        return;
    await pline(line);
}

// C ref: pline.c You(), Your(), You_cant(), pline_The(), There() --
// pline() with the C prefix prepended
export async function You(line) { await pline(`You ${line}`); }
export async function Your(line) { await pline(`Your ${line}`); }
export async function You_cant(line) { await pline(`You can't ${line}`); }
export async function pline_The(line) { await pline(`The ${line}`); }
export async function There(line) { await pline(`There ${line}`); }

// C ref: pline.c You_feel()
export async function You_feel(line) {
    if (Unaware())
        await pline(`You dream that you feel ${line}`);
    else
        await pline(`You feel ${line}`);
}

// C ref: pline.c You_see()
export async function You_see(line) {
    if (Unaware())
        await pline(`You dream that you see ${line}`);
    else if (Blind()) /* caller should have caught this... */
        await pline(`You sense ${line}`);
    else
        await pline(`You see ${line}`);
}
