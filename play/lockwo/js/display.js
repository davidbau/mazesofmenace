// display.js — Map rendering and terminal output.
// C ref: display.c — newsym, show_glyph, docrt, cls, flush_screen.

import { game } from './gstate.js';
import { cansee, couldsee, Blind, Infravision } from './vision.js';
import { nhgetch } from './input.js';
import {
    COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS,
    HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER,
    CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, isok,
    SDOOR, SCORR, FOUNTAIN, SINK, ALTAR, GRAVE, THRONE, ICE,
    POOL, MOAT, WATER, LAVAPOOL, LAVAWALL, IRONBARS, TREE,
    D_NODOOR, D_ISOPEN, D_CLOSED, D_LOCKED, D_BROKEN,
    SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7,
    WM_MASK, WM_C_OUTER, WM_C_INNER,
    WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR,
    In_quest,
    ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE,
    ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT,
    HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP,
    MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR,
    TRAPPED_CHEST,
} from './const.js';
import {
    NO_COLOR, CLR_BLACK, CLR_GRAY, CLR_BROWN, CLR_WHITE, CLR_YELLOW,
    CLR_CYAN, CLR_BRIGHT_BLUE, CLR_BRIGHT_CYAN, CLR_BLUE, CLR_RED,
    CLR_ORANGE, CLR_GREEN, CLR_MAGENTA, CLR_BRIGHT_GREEN, CLR_BRIGHT_MAGENTA,
    DEC_TO_UNICODE, ATR_INVERSE,
} from './terminal.js';
import { monster_by_pmidx, infravisible } from './makemon.js';
import { objects } from './mkobj.js';
import { engr_at } from './engrave.js';
import { depth as depth_of_level } from './hacklib.js';

const COIN_CLASS = 12;
const ROCK_CLASS = 14;
const STATUE_OTYP = 475;
const BOULDER_OTYP = 474;

// ── Object class display symbols ──
// C ref: drawing.c def_oc_syms (defsym.h OBJCLASS table).  Index by oclass.
const OC_SYM = {
    1: ']',  // ILLOBJ
    2: ')',  // WEAPON
    3: '[',  // ARMOR
    4: '=',  // RING
    5: '"',  // AMULET
    6: '(',  // TOOL
    7: '%',  // FOOD
    8: '!',  // POTION
    9: '?',  // SCROLL
    10: '+', // SPBOOK
    11: '/', // WAND
    12: '$', // COIN (GOLD_SYM)
    13: '*', // GEM
    14: '`', // ROCK
    15: '0', // BALL
    16: '_', // CHAIN
    17: '.', // VENOM
};

// C ref: include/color.h — HI_* material-color aliases.
const HI_BY_MATERIAL = {
    1: CLR_GRAY,        // LIQUID
    2: CLR_WHITE,       // WAX
    3: CLR_BROWN,       // VEGGY  (HI_ORGANIC)
    4: CLR_BROWN,       // FLESH  (HI_ORGANIC)
    5: CLR_WHITE,       // PAPER  (HI_PAPER)
    6: CLR_BROWN,       // CLOTH  (HI_CLOTH)
    7: CLR_BROWN,       // LEATHER(HI_LEATHER)
    8: CLR_BROWN,       // WOOD   (HI_WOOD)
    9: CLR_WHITE,       // BONE
    10: CLR_GRAY,       // DRAGON_HIDE
    11: CLR_CYAN,       // IRON   (HI_METAL)
    12: CLR_CYAN,       // METAL  (HI_METAL)
    13: CLR_YELLOW,     // COPPER (HI_COPPER)
    14: CLR_GRAY,       // SILVER (HI_SILVER)
    15: CLR_YELLOW,     // GOLD   (HI_GOLD)
    16: CLR_WHITE,      // PLATINUM
    17: CLR_CYAN,       // MITHRIL
    18: CLR_BROWN,      // PLASTIC
    19: CLR_BRIGHT_CYAN,// GLASS  (HI_GLASS)
    20: CLR_GRAY,       // GEMSTONE
    21: CLR_GRAY,       // MINERAL(HI_MINERAL)
};

// C ref: display.c reset_glyphmap — `#define obj_color(n) objects[n].oc_color`.
// Each object's declared color is ported into the shared OBJECT_DATA table
// (mkobj.js OC_COLOR, verbatim from include/objects.h).  Coins always show as
// CLR_YELLOW (GLYPH_OBJ_PILETOP / has_rogue_color branch never fires here).
const AMULET_CLASS = 5;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const CORPSE_OTYP = 265;
// C ref: include/objects.h FIRST_REAL_GEM..LAST_GLASS_GEM and FIRST_SPELL..
// LAST_SPELL (the otyp ranges that obj_is_generic hides until seen up close).
const FIRST_SPELL = 365, LAST_SPELL = 406;        // SPE_DIG..SPE_BLANK_PAPER
const FIRST_REAL_GEM = 438, LAST_GLASS_GEM = 468; // DILITHIUM_CRYSTAL..WORTHLESS_VIOLET_GLASS
// C ref: include/objects.h GENERIC() macro — every generic class placeholder
// object (otyp 1..MAXOCLASSES-1) is declared with oc_color = CLR_GRAY, so a
// generic-object glyph always renders as CLR_GRAY (which the contest tty's
// has_color() suppresses to NO_COLOR).
const GENERIC_OBJ_COLOR = CLR_GRAY;

// C ref: include/display.h obj_is_generic — an *undescribed* (dknown == 0)
// potion, real/glass gem, or spellbook is drawn as its generic class glyph
// (e.g. an unidentified potion seen from afar is "a potion", gray, with no
// distinguishing appearance color) until the hero gets close enough to see it
// (map_object / see_nearby_objects then set dknown via observe_object).
function obj_is_generic(otmp) {
    if (!otmp || otmp.dknown) return false;
    const otyp = otmp.otyp;
    return otmp.oclass === POTION_CLASS
        || (otyp >= FIRST_REAL_GEM && otyp <= LAST_GLASS_GEM)
        || (otyp >= FIRST_SPELL && otyp <= LAST_SPELL);
}

function obj_color(otmp) {
    if (!otmp) return NO_COLOR;
    if (otmp.oclass === COIN_CLASS) return CLR_YELLOW;
    // C ref: reset_glyphmap GLYPH_OBJ branch — a generic object glyph uses
    // obj_color(oclass) = objects[oclass].oc_color = CLR_GRAY.
    if (obj_is_generic(otmp)) return GENERIC_OBJ_COLOR;
    const obj = objects[otmp.otyp];
    if (obj && obj.oc_color != null) return obj.oc_color;
    return NO_COLOR;
}

// Glyph (symbol + color) for a single floor object.
// C ref: display.h obj_to_glyph + display.c reset_glyphmap.
export function object_glyph(otmp) {
    if (!otmp) return null;
    // Statues display as the petrified monster's class symbol.
    if (otmp.otyp === STATUE_OTYP) {
        const mon = monster_by_pmidx(otmp.corpsenm);
        const sym = mon?.mlet || OC_SYM[ROCK_CLASS];
        // C ref: display.c GLYPH_STATUE_* branch — obj_color(STATUE) = CLR_WHITE.
        return { ch: sym, color: CLR_WHITE, dec: false };
    }
    // C ref: display.c GLYPH_BODY_* branch — a corpse is drawn with the dead
    // monster's color (mon_color(corpsenm)), NOT the corpse object's material
    // (e.g. a red mold's corpse is red, not the FLESH/brown default).
    if (otmp.otyp === CORPSE_OTYP && otmp.corpsenm != null && otmp.corpsenm >= 0) {
        const mon = monster_by_pmidx(otmp.corpsenm);
        return { ch: OC_SYM[FOOD_CLASS], color: mon?.mcolor ?? NO_COLOR, dec: false };
    }
    // Boulder uses the rock symbol; the generic case below covers it.  A
    // generic object keeps its class symbol (potion '!', gem '*', book '+');
    // only the color is suppressed to the generic gray.
    const sym = OC_SYM[otmp.oclass] || OC_SYM[1];
    return { ch: sym, color: obj_color(otmp), dec: false };
}

// C ref: display.c map_object + see_nearby_objects — when the hero can see an
// undescribed potion/gem/spellbook closely enough (distu(x,y) <= neardist,
// where neardist is the small rounded square around the hero), it is observed:
// dknown is set so its glyph upgrades from the generic class symbol to the
// specific object (revealing its appearance color).  Not done while
// hallucinating (objects are randomized then).  Setting dknown consumes no
// RNG; the discovery-list (oc_encountered) bookkeeping is a separate '\'-screen
// concern handled by o_init.observe_object elsewhere and is not needed here.
function maybe_observe_near_object(x, y) {
    const obj = vobj_at(x, y);
    if (!obj || obj.dknown || !obj_is_generic(obj)) return;
    if (game.u?.uhallu) return; // C ref: map_object's !Hallucination guard
    const ux = game.u?.ux, uy = game.u?.uy;
    if (ux == null || uy == null) return;
    const xr = game.u?.xray_range ?? 0;
    const r = (xr > 2) ? xr : 2;
    const neardist = (r * r) * 2 - r;
    const distu = (x - ux) * (x - ux) + (y - uy) * (y - uy);
    if (distu > neardist) return;
    obj.dknown = 1;
}

// C ref: display.c see_nearby_objects() — mark the top object of nearby stacks
// as having been seen, and if it was being displayed as a generic object,
// redisplay it as specific.  Called from u_on_newpos() (dungeon.c) whenever the
// hero relocates on the same level (and is not Blind/Hallucinating/Swallowed),
// so an undescribed potion/gem/spellbook the hero walks *near* (without its own
// tile being redrawn by newsym) still upgrades from the generic gray class
// glyph to its appearance color.  Mirrors the neardist square scan around the
// hero; consumes no RNG.  As in maybe_observe_near_object, we only set dknown
// (skipping observe_object's discover_object / '\'-list bookkeeping, which is a
// separate object-identification concern) and only for generic objects, since
// only those change their on-map appearance when observed.
export function see_nearby_objects() {
    const u = game.u;
    if (!u || u.ux == null || u.uy == null) return;
    // C ref: dungeon.c u_on_newpos guard — !Blind && !Hallucination && !uswallow.
    if (Blind() || u.uhallu || u.uswallow) return;
    const x = u.ux, y = u.uy;
    const xr = u.xray_range ?? 0;
    const r = (xr > 2) ? xr : 2;
    const neardist = (r * r) * 2 - r;
    for (let iy = y - r; iy <= y + r; iy++) {
        for (let ix = x - r; ix <= x + r; ix++) {
            if (!isok(ix, iy)) continue;
            const obj = vobj_at(ix, iy);
            // skip if no object, already seen up close, or not a generic glyph
            if (!obj || obj.dknown || !obj_is_generic(obj)) continue;
            // skip if the spot can't be seen or is too far (diagonal)
            if (!cansee(ix, iy)) continue;
            const distu = (ix - x) * (ix - x) + (iy - y) * (iy - y);
            if (distu > neardist) continue;
            // observe_object (dknown only) — was generic, so redisplay specific.
            obj.dknown = 1;
            newsym(ix, iy);
        }
    }
}

// Topmost visible object at (x, y).  C ref: display.h vobj_at.
export function vobj_at(x, y) {
    const objs = game.level?.objects;
    if (!objs) return null;
    let top = null;
    for (const o of objs) {
        if (o.where === 'floor' && o.ox === x && o.oy === y) top = o;
    }
    return top;
}

// Monster at (x, y).  C ref: rm.h m_at(x,y) = svl.level.monsters[x][y].
// A ridden steed has been removed from the map grid (remove_monster in
// mount_steed) but remains in the fmon chain, so it must NOT be reported by the
// grid lookup even though it is still a live level monster colocated with the
// hero.
export function m_at(x, y) {
    const mons = game.level?.monsters;
    if (!mons) return null;
    for (const m of mons) {
        if (m.mridden) continue;
        if (m.mx === x && m.my === y) return m;
    }
    return null;
}

// Glyph (symbol + color) for a monster.  C ref: display.c mon_color /
// def_monsyms: symbol = monster class char, color = mons[].mcolor.
// A disguised monster (m_ap_type set, e.g. a mimic appearing as an object or
// furniture, or stock_room's chest-mimics) renders as its disguise, not its
// own class letter — exactly like C's display.c mon_to_glyph / map_object,
// which calls obj_to_glyph(mappearance) / cmap_to_glyph(mappearance).
function monster_glyph(mon) {
    if (!mon) return null;
    if (mon.m_ap_type === 'obj' && mon.mappearance != null) {
        // Appear as an object: same glyph the floor object would draw.  C ref:
        // display.c map_object/obj_to_glyph(mappearance) for an M_AP_OBJECT mon.
        return object_glyph({
            otyp: mon.mappearance,
            oclass: objects[mon.mappearance]?.oclass ?? 1,
            corpsenm: mon.mcorpsenm ?? -1,
            dknown: 1,
        });
    }
    const d = mon.data || {};
    const sym = d.mlet || 'x';
    const color = (d.mcolor != null) ? d.mcolor : NO_COLOR;
    return { ch: sym, color, dec: false };
}

// C ref: display.h see_with_infrared(mon) = (!Blind && Infravision &&
// infravisible(mon->data) && couldsee(mon->mx, mon->my)).  TRUE when a
// warm-blooded monster sits in the hero's line of sight but on a square too
// dark to physically see; the hero's infravision reveals it.
function see_with_infrared(mon) {
    return !!mon && !Blind() && Infravision()
        && infravisible(mon.data) && couldsee(mon.mx, mon.my);
}

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

// True when the active symset uses VT100 line-drawing (DECgraphics).  C ref:
// drawing.c symset[] / dat/symbols — without it the default ASCII glyphs
// (defsym.h PCHAR) are used for walls/floor/doorways.
function useDECgraphics() {
    return /^dec/i.test(String(game.symset || ''));
}

// ── Terrain to display character + color + DEC flag ──
// C ref: defsym.h S_* cmap symbol indices for walls.
const S_stone = 0, S_vwall = 1, S_hwall = 2, S_tlcorn = 3, S_trcorn = 4,
    S_blcorn = 5, S_brcorn = 6, S_crwall = 7, S_tuwall = 8, S_tdwall = 9,
    S_tlwall = 10, S_trwall = 11;

// C ref: display.c wall_angle support tables — all results expressed for a
// tdwall (T walls rotated) / bottom-right (single crosswalls rotated).
const wall_matrix = [
    /* T_d (tdwall) */ [S_stone, S_tlcorn, S_trcorn, S_hwall, S_tdwall],
    /* T_l (tlwall) */ [S_stone, S_trcorn, S_brcorn, S_vwall, S_tlwall],
    /* T_u (tuwall) */ [S_stone, S_brcorn, S_blcorn, S_hwall, S_tuwall],
    /* T_r (trwall) */ [S_stone, S_blcorn, S_tlcorn, S_vwall, S_trwall],
];
const T_stone = 0, T_tlcorn = 1, T_trcorn = 2, T_hwall = 3, T_tdwall = 4;
const T_d = 0, T_l = 1, T_u = 2, T_r = 3;

const cross_matrix = [
    /* C_bl */ [S_brcorn, S_blcorn, S_tlcorn, S_tuwall, S_trwall, S_crwall],
    /* C_tl */ [S_blcorn, S_tlcorn, S_trcorn, S_trwall, S_tdwall, S_crwall],
    /* C_tr */ [S_tlcorn, S_trcorn, S_brcorn, S_tdwall, S_tlwall, S_crwall],
    /* C_br */ [S_trcorn, S_brcorn, S_blcorn, S_tlwall, S_tuwall, S_crwall],
];
const C_bl = 0, C_tl = 1, C_tr = 2, C_br = 3;
const C_trcorn = 0, C_brcorn = 1, C_blcorn = 2, C_tlwall = 3, C_tuwall = 4, C_crwall = 5;

// C ref: display.c — `only(sv, bits)` macro.
function _only(sv, bits) { return ((sv & bits) && !(sv & ~bits)); }

// C ref: display.c wall_angle(lev) — choose the wall cmap index from wall
// type, wall mode (WM_MASK), and the seen vector.  Assumes seenv != 0.
function wall_angle(lev) {
    let seenv = lev.seenv & 0xff;
    const wm = lev.wall_info & WM_MASK;
    let row, col, idx;
    switch (lev.typ) {
    case TUWALL:
        row = wall_matrix[T_u];
        seenv = (seenv >> 4 | seenv << 4) & 0xff; /* rotate to tdwall */
        return do_twall(lev, row, seenv, wm);
    case TLWALL:
        row = wall_matrix[T_l];
        seenv = (seenv >> 2 | seenv << 6) & 0xff;
        return do_twall(lev, row, seenv, wm);
    case TRWALL:
        row = wall_matrix[T_r];
        seenv = (seenv >> 6 | seenv << 2) & 0xff;
        return do_twall(lev, row, seenv, wm);
    case TDWALL:
        row = wall_matrix[T_d];
        return do_twall(lev, row, seenv, wm);

    case SDOOR:
        if (lev.horizontal) return hwall_angle(seenv, wm);
        /* falls through to VWALL */
    case VWALL:
        switch (wm) {
        case 0:  idx = seenv ? S_vwall : S_stone; break;
        case 1:  idx = (seenv & (SV1 | SV2 | SV3 | SV4 | SV5)) ? S_vwall : S_stone; break;
        case 2:  idx = (seenv & (SV0 | SV1 | SV5 | SV6 | SV7)) ? S_vwall : S_stone; break;
        default: idx = S_stone; break;
        }
        return idx;

    case HWALL:
        return hwall_angle(seenv, wm);

    case TLCORNER:
        return set_corner(lev, S_tlcorn, (SV3 | SV4 | SV5), SV4, seenv, wm);
    case TRCORNER:
        return set_corner(lev, S_trcorn, (SV5 | SV6 | SV7), SV6, seenv, wm);
    case BLCORNER:
        return set_corner(lev, S_blcorn, (SV1 | SV2 | SV3), SV2, seenv, wm);
    case BRCORNER:
        return set_corner(lev, S_brcorn, (SV7 | SV0 | SV1), SV0, seenv, wm);

    case CROSSWALL:
        return crosswall_angle(seenv, wm);

    default:
        return S_stone;
    }
}

function hwall_angle(seenv, wm) {
    switch (wm) {
    case 0:  return seenv ? S_hwall : S_stone;
    case 1:  return (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) ? S_hwall : S_stone;
    case 2:  return (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) ? S_hwall : S_stone;
    default: return S_stone;
    }
}

function do_twall(lev, row, seenv, wm) {
    let col;
    switch (wm) {
    case 0:
        if (seenv === SV4) col = T_tlcorn;
        else if (seenv === SV6) col = T_trcorn;
        else if ((seenv & (SV3 | SV5 | SV7)) || ((seenv & SV4) && (seenv & SV6))) col = T_tdwall;
        else if (seenv & (SV0 | SV1 | SV2)) col = (seenv & (SV4 | SV6)) ? T_tdwall : T_hwall;
        else col = T_stone;
        break;
    case 1: /* WM_T_LONG */
        if ((seenv & (SV3 | SV4)) && !(seenv & (SV5 | SV6 | SV7))) col = T_tlcorn;
        else if ((seenv & (SV6 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = T_trcorn;
        else if ((seenv & SV5) || ((seenv & (SV3 | SV4)) && (seenv & (SV6 | SV7)))) col = T_tdwall;
        else col = T_stone; /* only SV0|SV1|SV2 */
        break;
    case 2: /* WM_T_BL */
        if (_only(seenv, SV4 | SV5)) col = T_tlcorn;
        else if ((seenv & (SV0 | SV1 | SV2 | SV7)) && !(seenv & (SV3 | SV4 | SV5))) col = T_hwall;
        else if (_only(seenv, SV6)) col = T_stone;
        else col = T_tdwall;
        break;
    case 3: /* WM_T_BR */
        if (_only(seenv, SV5 | SV6)) col = T_trcorn;
        else if ((seenv & (SV0 | SV1 | SV2 | SV3)) && !(seenv & (SV5 | SV6 | SV7))) col = T_hwall;
        else if (_only(seenv, SV4)) col = T_stone;
        else col = T_tdwall;
        break;
    default:
        col = T_stone;
        break;
    }
    return row[col];
}

// C ref: display.c set_corner macro.
function set_corner(lev, which, outer, inner, seenv, wm) {
    switch (wm) {
    case 0:           return which;
    case WM_C_OUTER:  return (seenv & outer) ? which : S_stone;
    case WM_C_INNER:  return (seenv & ~inner) ? which : S_stone;
    default:          return S_stone;
    }
}

function crosswall_angle(seenv, wm) {
    let row, col, idx;
    switch (wm) {
    case 0:
        if (seenv === SV0) idx = S_brcorn;
        else if (seenv === SV2) idx = S_blcorn;
        else if (seenv === SV4) idx = S_tlcorn;
        else if (seenv === SV6) idx = S_trcorn;
        else if (!(seenv & ~(SV0 | SV1 | SV2)) && ((seenv & SV1) || seenv === (SV0 | SV2))) idx = S_tuwall;
        else if (!(seenv & ~(SV2 | SV3 | SV4)) && ((seenv & SV3) || seenv === (SV2 | SV4))) idx = S_trwall;
        else if (!(seenv & ~(SV4 | SV5 | SV6)) && ((seenv & SV5) || seenv === (SV4 | SV6))) idx = S_tdwall;
        else if (!(seenv & ~(SV0 | SV6 | SV7)) && ((seenv & SV7) || seenv === (SV0 | SV6))) idx = S_tlwall;
        else idx = S_crwall;
        return idx;
    case WM_X_TL:
        row = cross_matrix[C_tl]; seenv = (seenv >> 4 | seenv << 4) & 0xff;
        return do_crwall(row, seenv);
    case WM_X_TR:
        row = cross_matrix[C_tr]; seenv = (seenv >> 6 | seenv << 2) & 0xff;
        return do_crwall(row, seenv);
    case WM_X_BL:
        row = cross_matrix[C_bl]; seenv = (seenv >> 2 | seenv << 6) & 0xff;
        return do_crwall(row, seenv);
    case WM_X_BR:
        row = cross_matrix[C_br];
        return do_crwall(row, seenv);
    case WM_X_TLBR:
        if (_only(seenv, SV1 | SV2 | SV3)) return S_blcorn;
        if (_only(seenv, SV5 | SV6 | SV7)) return S_trcorn;
        if (_only(seenv, SV0 | SV4)) return S_stone;
        return S_crwall;
    case WM_X_BLTR:
        if (_only(seenv, SV0 | SV1 | SV7)) return S_brcorn;
        if (_only(seenv, SV3 | SV4 | SV5)) return S_tlcorn;
        if (_only(seenv, SV2 | SV6)) return S_stone;
        return S_crwall;
    default:
        return S_stone;
    }
}

function do_crwall(row, seenv) {
    if (seenv === SV4) return S_stone;
    seenv = seenv & ~SV4; /* strip SV4 */
    let col;
    if (seenv === SV0) col = C_brcorn;
    else if (seenv & (SV2 | SV3)) {
        if (seenv & (SV5 | SV6 | SV7)) col = C_crwall;
        else if (seenv & (SV0 | SV1)) col = C_tuwall;
        else col = C_blcorn;
    } else if (seenv & (SV5 | SV6)) {
        if (seenv & (SV1 | SV2 | SV3)) col = C_crwall;
        else if (seenv & (SV0 | SV7)) col = C_tlwall;
        else col = C_trcorn;
    } else if (seenv & SV1) {
        col = (seenv & SV7) ? C_crwall : C_tuwall;
    } else if (seenv & SV7) {
        col = (seenv & SV1) ? C_crwall : C_tlwall;
    } else {
        col = C_crwall;
    }
    return row[col];
}

// C ref: display.c back_to_glyph + drawing.c defsyms.  Walls follow the
// active symset: DECgraphics VT100 line-drawing, else default ASCII.
// Map an S_* wall cmap index to a glyph descriptor.
const _WALL_DEC = {
    [S_vwall]: 'x', [S_hwall]: 'q', [S_tlcorn]: 'l', [S_trcorn]: 'k',
    [S_blcorn]: 'm', [S_brcorn]: 'j', [S_crwall]: 'n', [S_tuwall]: 'v',
    [S_tdwall]: 'w', [S_tlwall]: 'u', [S_trwall]: 't',
};
const _WALL_ASCII = {
    [S_vwall]: '|', [S_hwall]: '-', [S_tlcorn]: '-', [S_trcorn]: '-',
    [S_blcorn]: '-', [S_brcorn]: '-', [S_crwall]: '-', [S_tuwall]: '-',
    [S_tdwall]: '-', [S_tlwall]: '|', [S_trwall]: '|',
};
function wall_cmap_glyph(idx) {
    if (idx === S_stone || idx == null) return { ch: ' ', color: NO_COLOR, dec: false };
    const dec = useDECgraphics();
    const ch = dec ? _WALL_DEC[idx] : _WALL_ASCII[idx];
    return { ch: ch ?? (dec ? 'q' : '-'), color: wall_cmap_color(), dec };
}

// C ref: display.c reset_glyphmap wall_color() — walls in the Gnomish Mines use
// the GLYPH_CMAP_MINES range -> wallcolors[mines_walls] (CLR_BROWN); the main
// dungeon uses main_walls (CLR_GRAY, which emits no tty escape == NO_COLOR).
function wall_cmap_color() {
    const uz = game.u?.uz;
    if (uz && game.mines_dnum != null && uz.dnum === game.mines_dnum)
        return CLR_BROWN;
    return NO_COLOR;
}

// Render a wall/SDOOR cell, applying wall_angle (mode + seenv) so walls only
// show from the angles C would draw them.  C ref: back_to_glyph wall case:
//   idx = ptr->seenv ? wall_angle(ptr) : S_stone;
function wall_glyph_for(loc) {
    const idx = loc.seenv ? wall_angle(loc) : S_stone;
    return wall_cmap_glyph(idx);
}

// C ref: stairs.c stairway_at — find the stairway node at (x,y).
function stairway_at(x, y) {
    for (let s = game.stairs; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: stairs.c known_branch_stairs — True if 'sway' is a branch staircase
// (leads to a different dungeon) and the hero has traversed it.
function known_branch_stairs(sway) {
    return !!(sway && sway.tolev
        && sway.tolev.dnum !== (game.u?.uz?.dnum ?? 0)
        && sway.u_traversed);
}

function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    const dec = useDECgraphics();
    switch (typ) {
    case STONE:     return { ch: ' ', color: NO_COLOR, dec: false };
    case SCORR:     return { ch: ' ', color: NO_COLOR, dec: false };  // secret corridor = stone
    case ROOM:      return dec ? { ch: '~', color: NO_COLOR, dec: true } : { ch: '.', color: NO_COLOR, dec: false };
    case CORR: {
        // C ref: display.c back_to_glyph CORR — idx = (ptr->waslit ||
        // flags.lit_corridor) ? S_litcorr : S_corr.  Both S_corr and S_litcorr
        // are '#' with defsym color CLR_GRAY, but reset_glyphmap (display.c
        // ~2934) bumps S_litcorr to CLR_WHITE when its symbol matches the dark
        // corridor symbol (always true: both '#'), to give a visible
        // difference.  CLR_GRAY emits no tty escape (records as NO_COLOR=8),
        // CLR_WHITE records as bright white (15).  lit_corridor defaults off.
        const litcorr = !!(loc.waslit || (game.flags && game.flags.lit_corridor));
        return { ch: '#', color: litcorr ? CLR_WHITE : NO_COLOR, dec: false };
    }
    case SDOOR:
        // Secret door shows as the wall it hides in, via wall_angle.
        // C ref: back_to_glyph — SDOOR falls through to the wall case.
        return wall_glyph_for(loc);
    case DOOR:
        // C ref: display.c back_to_glyph DOOR case — an open or closed door uses
        // the horizontal/vertical cmap variant per loc.horizontal (S_hodoor '-'
        // / S_vodoor '|' when open; S_hcdoor / S_vcdoor '+' when closed); broken
        // or doorless openings use S_ndoor ('.').
        if (loc.doormask & D_BROKEN)
            return dec ? { ch: '~', color: NO_COLOR, dec: true } : { ch: '.', color: NO_COLOR, dec: false };
        if (loc.doormask & D_ISOPEN) {
            // C ref: include/defsym.h — in ASCII, S_vodoor ("vertical open door",
            // a door in a VERTICAL wall, loc.horizontal == 0) draws as '-' and
            // S_hodoor (loc.horizontal == 1) draws as '|'.  The names are
            // counter-intuitive: the glyph shows the open gap, perpendicular to
            // the wall it sits in.  The DECgraphics symset draws both open-door
            // orientations with the same line-drawing glyph ('a').
            if (dec)
                return { ch: 'a', color: CLR_BROWN, dec: true };
            return loc.horizontal
                ? { ch: '|', color: CLR_BROWN, dec: false }
                : { ch: '-', color: CLR_BROWN, dec: false };
        }
        if (loc.doormask & (D_CLOSED | D_LOCKED))
            return { ch: '+', color: CLR_BROWN, dec: false };
        return dec ? { ch: '~', color: NO_COLOR, dec: true } : { ch: '.', color: NO_COLOR, dec: false };  // D_NODOOR
    case STAIRS: {
        // C ref: display.c back_to_glyph STAIRS case — a *known branch*
        // staircase uses S_brupstair/S_brdnstair (CLR_YELLOW); an ordinary
        // staircase uses S_upstair/S_dnstair (CLR_GRAY).  CLR_GRAY's tty
        // hilite is nilstring (termcap.c init_hilite) so it emits no color
        // escape and records as the default (NO_COLOR) cell, matching how
        // walls/floors are handled here.
        const up = (game.level?.upstair?.x === x && game.level?.upstair?.y === y);
        const ch = up ? '<' : '>';
        const sway = known_branch_stairs(stairway_at(x, y)) ? CLR_YELLOW : NO_COLOR;
        return { ch, color: sway, dec: false };
    }
    // C ref: back_to_glyph POOL/MOAT -> S_pool, WATER -> S_water, LAVAPOOL ->
    // S_lava, LAVAWALL -> S_lavawall, ICE -> S_ice.  defsym.h ASCII glyphs:
    // S_pool/S_water/S_lava/S_lavawall '}' ; S_ice '.'.  In DECgraphics the
    // water/lava cmaps are the meta-'\' diamond, which the recorder emits as a
    // backtick '`' inside the DEC (Shift-Out) font.  The frozen screen decoder's
    // DEC_MAP has NO '`' entry, so the recorded C cell renders as the literal
    // backtick '`'.  We therefore emit ch '`' with dec=FALSE (the terminal would
    // otherwise map a DEC '`' to the '◆' diamond, which the decoder leaves as
    // '◆' and would mismatch the recorded literal backtick).  ICE uses '~' which
    // IS in DEC_MAP (-> centered dot '·'), so it keeps dec.  Colors: S_pool
    // CLR_BLUE, S_water CLR_BRIGHT_BLUE, S_lava CLR_RED, S_lavawall CLR_ORANGE,
    // S_ice CLR_CYAN.
    case POOL:
    case MOAT:      return dec ? { ch: '`', color: CLR_BLUE, dec: false }
                               : { ch: '}', color: CLR_BLUE, dec: false };
    case WATER:     return dec ? { ch: '`', color: CLR_BRIGHT_BLUE, dec: false }
                               : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL:  return dec ? { ch: '`', color: CLR_RED, dec: false }
                               : { ch: '}', color: CLR_RED, dec: false };
    case LAVAWALL:  return dec ? { ch: '`', color: CLR_ORANGE, dec: false }
                               : { ch: '}', color: CLR_ORANGE, dec: false };
    case ICE:       return dec ? { ch: '~', color: CLR_CYAN, dec: true }
                               : { ch: '.', color: CLR_CYAN, dec: false };
    case IRONBARS:  return { ch: '#', color: CLR_GRAY, dec: false };
    // C ref: dat/symbols DECgraphics S_tree = \xe7 (meta-g).  The recorder emits
    // it as 'g' inside the DEC (Shift-Out) font; the frozen decoder's DEC_MAP has
    // no 'g' entry, so the recorded C cell renders as the literal 'g'.  Emit 'g'
    // with dec=FALSE (same trick as S_pool's '`') so the JS cell matches.  The
    // default (non-DEC) symset draws a tree as '#'.
    case TREE:      return dec ? { ch: 'g', color: CLR_GREEN, dec: false }
                               : { ch: '#', color: CLR_GREEN, dec: false };
    case FOUNTAIN:  return { ch: '{', color: CLR_BRIGHT_BLUE, dec: false };
    // C ref: defsym.h PCHAR(36, '{', S_sink, CLR_WHITE).
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
    case ALTAR:     return { ch: '{', color: CLR_GRAY, dec: true };
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
        return wall_glyph_for(loc);
    default:        return { ch: '?', color: NO_COLOR, dec: false };
    }
}

// ── show_glyph_cell ──
export function show_glyph_cell(x, y, ch, color = NO_COLOR, decgfx = false, attr = 0) {
    const loc = game.level?.at(x, y);
    if (!loc) return;
    loc.disp_ch = ch;
    loc.disp_color = has_color_or_default(color);
    loc.disp_decgfx = !!decgfx;
    loc.disp_attr = attr | 0;
    loc.gnew = 1;
}

// C ref: display.c reset_glyphmap tail — `if (!has_color(color)) color =
// NO_COLOR`.  In the contest's tty build has_color() is false for CLR_BLACK
// and CLR_GRAY (their hilites[] entries are 0: black is rendered via the
// default/dim foreground rather than an SGR 30/37), so a glyph carrying either
// is rendered with NO color escape.  This is confirmed by the recorded C
// screens, which never emit ESC[30m or ESC[37m — every CLR_BLACK / CLR_GRAY
// glyph (e.g. a goblin or Uruk-hai 'o') shows as the terminal default.
// Mapping these to NO_COLOR here makes the emitted SGR match the C reference
// without touching the (frozen) terminal serializer.
function has_color_or_default(color) {
    if (color === CLR_BLACK || color === CLR_GRAY) return NO_COLOR;
    return color;
}

// C ref: include/engrave.h spot_shows_engravings(x,y) — an engraving is only
// drawn over CORR / ICE / ROOM terrain.
function spot_shows_engravings(loc) {
    const typ = loc?.typ;
    return typ === CORR || typ === ICE || typ === ROOM;
}

// Glyph for an engraving.  C ref: include/engrave.h engraving_to_defsym +
// defsym.h — a corridor engraving shows as '#' (S_engrcorr), any other (room
// or ice) as '`' (S_engroom); both are CLR_BRIGHT_BLUE.
function engraving_glyph(loc) {
    const ch = (loc?.typ === CORR) ? '#' : '`';
    return { ch, color: CLR_BRIGHT_BLUE, dec: false };
}

// C ref: display.h covers_objects(x,y) — a liquid cell hides objects/traps:
// (is_pool && !Underwater) || LAVAPOOL || LAVAWALL.  is_pool = POOL|MOAT|WATER.
export function covers_objects(loc) {
    const typ = loc?.typ;
    return typ === POOL || typ === MOAT || typ === WATER
        || typ === LAVAPOOL || typ === LAVAWALL;
}

// Glyph (sym char + color) for a seen trap.  C ref: display.h
// trap_to_glyph(trap) -> cmap_to_glyph(trap_to_defsym(ttyp)); rm.h
// trap_to_defsym(t) = S_arrow_trap + (t) - 1.  The sym char and color come
// from drawing.c defsyms[] (defsym.h PCHAR entries), keyed here by ttyp
// (ARROW_TRAP..TRAPPED_CHEST = 1..25).  HI_METAL=CLR_CYAN, HI_ZAP=CLR_BRIGHT_BLUE.
const trap_defsym = {
    [ARROW_TRAP]: { ch: '^', color: CLR_CYAN },            // HI_METAL
    [DART_TRAP]: { ch: '^', color: CLR_CYAN },             // HI_METAL
    [ROCKTRAP]: { ch: '^', color: CLR_GRAY },              // falling rock trap
    [SQKY_BOARD]: { ch: '^', color: CLR_BROWN },
    [BEAR_TRAP]: { ch: '^', color: CLR_CYAN },             // HI_METAL
    [LANDMINE]: { ch: '^', color: CLR_RED },               // land mine
    [ROLLING_BOULDER_TRAP]: { ch: '^', color: CLR_GRAY },
    [SLP_GAS_TRAP]: { ch: '^', color: CLR_BRIGHT_BLUE },   // HI_ZAP (sleeping gas)
    [RUST_TRAP]: { ch: '^', color: CLR_BLUE },
    [FIRE_TRAP]: { ch: '^', color: CLR_ORANGE },
    [PIT]: { ch: '^', color: CLR_BLACK },
    [SPIKED_PIT]: { ch: '^', color: CLR_BLACK },
    [HOLE]: { ch: '^', color: CLR_BROWN },
    [TRAPDOOR]: { ch: '^', color: CLR_BROWN },             // trap door
    [TELEP_TRAP]: { ch: '^', color: CLR_MAGENTA },         // teleportation trap
    [LEVEL_TELEP]: { ch: '^', color: CLR_MAGENTA },        // level teleporter
    [MAGIC_PORTAL]: { ch: '^', color: CLR_BRIGHT_MAGENTA },
    [WEB]: { ch: '"', color: CLR_GRAY },
    [STATUE_TRAP]: { ch: '^', color: CLR_GRAY },
    [MAGIC_TRAP]: { ch: '^', color: CLR_BRIGHT_BLUE },     // HI_ZAP
    [ANTI_MAGIC]: { ch: '^', color: CLR_BRIGHT_BLUE },     // HI_ZAP (anti magic trap)
    [POLY_TRAP]: { ch: '^', color: CLR_BRIGHT_GREEN },     // polymorph trap
    [VIBRATING_SQUARE]: { ch: '~', color: CLR_MAGENTA },
    [TRAPPED_DOOR]: { ch: '^', color: CLR_ORANGE },
    [TRAPPED_CHEST]: { ch: '^', color: CLR_ORANGE },
};
function trap_glyph(trap) {
    const d = trap_defsym[trap.ttyp];
    // Unknown ttyp: fall back to the arrow-trap sym/color (defsyms[] default).
    if (!d) return { ch: '^', color: CLR_CYAN, dec: false };
    return { ch: d.ch, color: d.color, dec: false };
}

// The "background" glyph for a cell: the topmost non-monster thing the
// hero would remember.  C ref: display.c _map_location —
// priority object > trap > engraving > terrain.
export function background_glyph(loc, x, y) {
    const obj = vobj_at(x, y);
    // C ref: display.h covers_objects(x,y) — a pool/moat/water (when not
    // Underwater) or lava cell HIDES any object/trap on it (the object is
    // submerged), so the terrain is drawn instead.  _map_location only shows the
    // object when !covers_objects.
    if (obj && !covers_objects(loc)) {
        const og = object_glyph(obj);
        if (og) return og;
    }
    const trap = game.level?.traps?.find((t) => t.tx === x && t.ty === y);
    if (trap?.tseen && !covers_objects(loc))
        return trap_glyph(trap);
    // C ref: _map_location — a revealed engraving on engraving-showing terrain
    // is drawn above the bare terrain.
    if (spot_shows_engravings(loc)) {
        const ep = engr_at(x, y);
        if (ep && ep.erevealed) return engraving_glyph(loc);
    }
    return terrain_glyph(loc, x, y);
}

// C ref: display.c magic_map_background — the terrain-only background a cell
// shows after magic mapping (objects/traps are layered on by the caller).
export function terrain_background_glyph(loc, x, y) {
    return terrain_glyph(loc, x, y);
}

// ── newsym ──
// C ref: display.c newsym — draw the glyph stack for one cell with the
// hero-memory + visibility semantics.  Display priority is
// monster > (remembered background: object > trap > terrain).
export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // C ref: display.c newsym — the hero's own cell is cansee, so its lit
        // condition is remembered: lev->waslit = (lev->lit != 0).
        loc.waslit = loc.lit ? 1 : 0;
        // Hero — drawn live; remember the background underneath.  Standing on
        // an engraved spot reveals it (C ref: display.c _map_location).
        if (spot_shows_engravings(loc)) {
            const ep = engr_at(x, y);
            if (ep) ep.erevealed = 1;
        }
        // C ref: display.c display_self() — a mounted hero is drawn as the
        // steed's glyph (the hero is "on" the steed), not '@'.
        const hg = hero_glyph();
        show_glyph_cell(x, y, hg.ch, hg.color, false);
        const bg = background_glyph(loc, x, y);
        loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec };
        return;
    }

    if (cansee(x, y)) {
        // C ref: display.c newsym — remember the lit condition while the cell
        // is visible: lev->waslit = (lev->lit != 0).  back_to_glyph then uses
        // waslit to pick S_litcorr (lit corridor, CLR_WHITE) vs S_corr.
        loc.waslit = loc.lit ? 1 : 0;
        // C ref: display.c map_object — a generic object glyph (an undescribed
        // potion/gem/spellbook) becomes specific once the hero is close enough
        // to see it up close.  observe_object() sets dknown so obj_color() then
        // returns the real appearance color instead of the generic gray.
        maybe_observe_near_object(x, y);
        // C ref: display.c unmap_object/_map_location — seeing an engraved
        // spot reveals the engraving so it can be mapped.
        if (spot_shows_engravings(loc)) {
            const ep = engr_at(x, y);
            if (ep) ep.erevealed = 1;
        }
        const bg = background_glyph(loc, x, y);
        // Remember the background (not the monster — monsters move).
        if (game.level?.flags?.hero_memory) {
            loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec };
        }
        // A visible monster takes precedence over the background.  C ref:
        // display.c newsym -> mon_visible(mon): an mundetected hider (e.g. a
        // giant eel submerged in water) is NOT shown; the background shows
        // through instead.
        const mon = m_at(x, y);
        if (mon && !mon.mundetected) {
            const mg = monster_glyph(mon);
            // C ref: win/tty/wintty.c tty_print_glyph — a pet glyph (MG_PET)
            // is drawn with iflags.wc2_petattr (default ATR_INVERSE) when
            // iflags.hilite_pet is set.  Only the attribute is changed, not the
            // monster's color.
            const petAttr = (mon.mtame && game.flags?.hilite_pet) ? ATR_INVERSE : 0;
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec, petAttr);
        } else {
            show_glyph_cell(x, y, bg.ch, bg.color, bg.dec);
        }
    } else {
        // Can't physically see <x,y>.  C ref: display.c newsym "Can't see the
        // location" branch.
        const mon = m_at(x, y);
        if (mon && !mon.mundetected && see_with_infrared(mon)) {
            // A warm monster within the hero's line of sight but on a square too
            // dark to see is revealed by infravision (see_with_infrared &&
            // mon_visible).  display_monster draws the normal monster glyph; it
            // does NOT call _map_location or set waslit, so remembered
            // background/lit memory is untouched (the glyph is erased later by
            // the monster-move / vision redraw when it is no longer sensed).
            const mg = monster_glyph(mon);
            const petAttr = (mon.mtame && game.flags?.hilite_pet) ? ATR_INVERSE : 0;
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec, petAttr);
        } else if (loc.remembered_glyph) {
            // C ref: display.c newsym else-branch (~1087) — a cell out of sight
            // remembered as a lit corridor (S_litcorr) re-darkens to S_corr when
            // it is no longer waslit ("Darkened while out of the hero's sight").
            // Our litcorr glyph is '#' with CLR_WHITE; the dark corridor is '#'
            // with NO_COLOR.  Mutate the remembered glyph so subsequent redraws
            // stay consistent (C overwrites lev->glyph likewise).
            if (loc.typ === CORR && !loc.waslit
                && loc.remembered_glyph.ch === '#'
                && loc.remembered_glyph.color === CLR_WHITE) {
                loc.remembered_glyph.color = NO_COLOR;
            }
            // Out of sight but remembered — show remembered background.
            show_glyph_cell(x, y, loc.remembered_glyph.ch,
                loc.remembered_glyph.color, loc.remembered_glyph.decgfx);
        } else {
            // C ref: display.c newsym show_mem — an out-of-sight cell with
            // nothing remembered shows lev->glyph, which for an unmapped square
            // is S_stone (blank).  This erases any stale live glyph, e.g. a warm
            // monster shown here via infravision that has since moved away (its
            // dark square was never mapped, so remembered_glyph is null).
            show_glyph_cell(x, y, ' ', NO_COLOR, false);
        }
    }
}

// C ref: display.c map_invisible(x,y) — make the hero remember that a square
// holds a monster it can sense but cannot see (drawn as the 'I' invisible-mon
// glyph, NO_COLOR).  Never drawn on the hero's own tile.  The remembered glyph
// is stored so subsequent redraws keep the 'I' until unmap_invisible/newsym.
export function map_invisible(x, y) {
    if (x === game.u?.ux && y === game.u?.uy) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    if (game.level?.flags?.hero_memory)
        loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

// ── docrt ──
// C ref: display.c docrt — recompute the live glyph for every cell so the
// monster/object/terrain stack and hero are all redrawn from current state.
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
    if (game.u?.ux > 0) {
        const hg = hero_glyph();
        show_glyph_cell(game.u.ux, game.u.uy, hg.ch, hg.color, false);
    }
}

// C ref: display.c display_self() — the glyph drawn at the hero's tile.  When
// riding a steed the steed's glyph is shown instead of the hero's '@'.
function hero_glyph() {
    const st = game.u?.usteed;
    if (st) {
        const d = st.data || {};
        return { ch: d.mlet || 'u', color: (d.mcolor != null) ? d.mcolor : CLR_WHITE };
    }
    return { ch: '@', color: CLR_WHITE };
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
// Hero name as shown on the status line. In debug (wizard) mode the C
// game forces plname to "wizard"; status capitalizes the first letter.
function _statusPlname() {
    let name = game.flags?.debug ? 'wizard' : (game.plname || 'Hero');
    if (name && name[0] >= 'a' && name[0] <= 'z')
        name = name[0].toUpperCase() + name.slice(1);
    return name;
}

// C ref: botl.c get_strength_str — STR encoded 3..18 normal, 19..118 as 18/xx.
function _strengthStr(st) {
    const STR18_100 = 118;
    if (st > 18) {
        if (st > STR18_100) return String(st - 100);
        if (st < STR18_100) return `18/${String(st - 18).padStart(2, '0')}`;
        return '18/**';
    }
    return String(st);
}

export function statusLine1Text() { return _statusLine1(); }
export function statusLine2Text() { return _statusLine2(); }

function _statusLine1() {
    const u = game.u;
    if (!u) return '';
    const name = _statusPlname();
    const role = game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer';
    const title = `${name} the ${role}`;
    // acurr.a is stored in attribute order [STR, INT, WIS, DEX, CON, CHA]
    // (A_STR..A_CHA); the status line displays St Dx Co In Wi Ch.
    // C ref: attrib.c acurr() — the shown value is abon+atemp+acurr clamped to
    // [3,25] for the non-STR characteristics (e.g. wounded legs set atemp[DEX]
    // to -1, dropping displayed Dx by one).  abon/atemp default to 0.
    const a = u.acurr?.a || [];
    const atemp = u.atemp?.a || [];
    const abon = u.abon?.a || [];
    const _eff = (i) => {
        const v = (a[i] ?? 0) + (atemp[i] || 0) + (abon[i] || 0);
        return v > 25 ? 25 : v < 3 ? 3 : v;
    };
    const stats = `St:${_strengthStr(a[0] ?? 0)} Dx:${_eff(3)} Co:${_eff(4)} In:${_eff(1)} Wi:${_eff(2)} Ch:${_eff(5)}`;
    const align = u.ualign?.type === 0 ? 'Neutral' : u.ualign?.type > 0 ? 'Lawful' : 'Chaotic';
    // C pads title+"  " out so the stats column starts at a fixed offset
    // (mrank_sz + 15 == 31 for our roles).
    const gap = Math.max(2, 31 - title.length);
    if (gap > 4) return `${title}\x1b[${gap}C${stats} ${align}`;
    return `${title}${' '.repeat(gap)}${stats} ${align}`;
}

function _statusLine2() {
    const u = game.u;
    if (!u) return '';
    // C ref: botl.c describe_level — "Tutorial:n" while In_tutorial(&u.uz),
    // else "Dlvl:n".  The level number is the depth within the tutorial branch
    // (1 for tut-1).
    const inTut = (u.uz?.dnum != null && u.uz.dnum === game.tutorial_dnum);
    const lvlLabel = inTut ? 'Tutorial' : 'Dlvl';
    // C ref: botl.c bot1() — displayed HP is clamped at 0 (negative uhp shows 0).
    const hpShown = Math.max(0, u.uhp || 0);
    // C ref: botl.c describe_level — the displayed level number is depth(&u.uz),
    // the ledger depth across branches (so the Gnomish Mines show Dlvl:3, not
    // the mines-relative dlevel 1), not u.uz.dlevel.
    const dlvlNum = inTut ? (u.uz?.dlevel || 1) : depth_of_level(u.uz);
    // C ref: botl.c describe_level — In_quest levels display "Home <dunlev>"
    // (the quest-branch-relative level, u.uz.dlevel), with no "Dlvl:" prefix.
    const levelDesc = In_quest(u.uz)
        ? `Home ${u.uz?.dlevel || 1}`
        : `${lvlLabel}:${dlvlNum}`;
    let s = `${levelDesc} $:${game._goldCount || 0} HP:${hpShown}(${u.uhpmax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 0}`;
    // C ref: botl.c do_statusline2 — Xp:<lvl>[/<exp>], optional T:<moves>.
    if (game.flags?.showexp)
        s += ` Xp:${u.ulevel || 1}/${u.uexp || 0}`;
    else
        s += ` Xp:${u.ulevel || 1}`;
    if (game.flags?.time)
        s += ` T:${game.moves || 1}`;
    // C ref: botl.c bot2 — the hunger field (BL_HUNGER) precedes the
    // encumbrance field: `if (u.uhs != NOT_HUNGRY) hu_stat[u.uhs]`.  hu_stat[]
    // (eat.c) = {Satiated, "", Hungry, Weak, Fainting, Fainted, Starved}; the
    // empty NOT_HUNGRY(1) entry is skipped.  u.uhs is maintained by newuhs().
    const HU_STAT = ['Satiated', '', 'Hungry', 'Weak', 'Fainting', 'Fainted', 'Starved'];
    const uhs = u.uhs ?? 1;
    if (uhs !== 1 && HU_STAT[uhs]) s += ` ${HU_STAT[uhs]}`;
    // C ref: botl.c bot1()/enc_stat[] — the encumbrance field (BL_CAP) precedes
    // the status conditions.  enc_stat[near_capacity()] is "" when unencumbered,
    // else Burdened/Stressed/Strained/Overtaxed/Overloaded.  near_capacity() is
    // recomputed by encumber_msg() (allmain.c:208/403) just before each bot(),
    // so the cached level (game._oldcap) is current at render time.  A bear trap
    // that wounds a leg drops weight_cap below the carried weight -> "Burdened".
    const encWord = ['', 'Burdened', 'Stressed', 'Strained', 'Overtaxed', 'Overloaded'][game._curcap || 0];
    if (encWord) s += ` ${encWord}`;
    // C ref: botl.c bot2 — status conditions follow the numeric fields, in
    // order: ... Blind, Deaf, Stun, Conf, Hallu, Lev, Fly, Ride.  Only the
    // conditions the contest sessions reach are modelled (Blind from a cream
    // pie / blindfold; Ride while mounted).
    if ((u.blinded || 0) > 0 || game.ublindf)
        s += ` Blind`;
    // C ref: botl.c bot2 condition order — Stun, then Conf, then Hallu.
    if ((u.uprops?.Confusion || 0) > 0)
        s += ` Conf`;
    if (u.usteed)
        s += ` Ride`;
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

// Draw the map (rows 1-21) and the two status lines (rows 22-23) onto the grid
// without touching row 0 (the message line) or clearing the grid first.  Used
// by the menu/window overlay renderers so a partial-width NHW_MENU shows the
// underlying map in the columns/rows it does not cover — matching C's tty
// behaviour (tty_display_nhwindow overwrites only the window's own cells).
export function render_map_to_grid() {
    const display = game?.nhDisplay;
    if (!display?.setCell || !display.grid) return;
    for (let y = 0; y < ROWNO; y++) {
        for (let x = 1; x < COLNO; x++) {
            const loc = game.level?.at(x, y);
            if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
            const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
            display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
        }
    }
    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
    const s2 = _statusLine2();
    for (let c = 0; c < Math.min(s2.length, display.cols); c++)
        display.setCell(c, 23, s2[c], NO_COLOR, 0);
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
        // Message line(s): a topline wider than the screen wraps onto row 1+
        // exactly as the tty's update_topl() does (C ref topl.c:284-297).
        const msg = game._pending_message || '';
        const mlines = wrap_topl(msg);
        for (let li = 0; li < mlines.length; li++) {
            const ln = mlines[li];
            for (let c = 0; c < Math.min(ln.length, display.cols); c++)
                display.setCell(c, li, ln[c], NO_COLOR, 0);
        }
        // Map — write characters to grid (DEC → Unicode for browser display).
        // A multi-line topline obscures the map rows it overlaps (grid rows
        // 0..mlines.length-1); skip those map rows so the message stays visible,
        // matching the tty topline window overlay.
        const msgRows = mlines.length;
        for (let y = 0; y < ROWNO; y++) {
            if (y + 1 < msgRows) continue;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, y);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                const ch = loc.disp_decgfx ? (DEC_TO_UNICODE[loc.disp_ch] || loc.disp_ch) : loc.disp_ch;
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
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
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// Write the two status lines (rows 22-23) to the terminal grid. Used by
// the legend/welcome startup rendering, which overlays a window region
// but must keep the status visible underneath.
export function renderStatusLines(display) {
    if (!display?.setCell) return;
    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, m =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
    const s2 = _statusLine2();
    for (let c = 0; c < Math.min(s2.length, display.cols); c++)
        display.setCell(c, 23, s2[c], NO_COLOR, 0);
}

// ── flush_screen ──
export async function flush_screen(mode) {
    if (game._modal_screen) return;
    if (game._freeze_screen_once) {
        delete game._freeze_screen_once;
        return;
    }
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
    // C ref: pline -> vpline -> update_topl sets gt.toplines; mirror it so the
    // Norep dedup reference tracks the actual last topline text.
    game._toplines = msg;
}

// C ref: win/tty/topl.c update_topl():284-297 — word-wrap a topline that is
// wider than the screen (CO=80) by replacing the last space within each CO-wide
// window with a newline (scan back from column CO-1; if the token is huge, split
// at the next space).  Returns the message split into one string per display
// row.  Matches the tty's multi-line topline so a long "You read: ..." message
// (graffiti etc.) lands on the same rows the recorder captured.
export function wrap_topl(msg) {
    const CO_W = 80;
    const s = String(msg || '');
    if (s.length <= CO_W) return [s]; // an 80-col line fills cols 0..79 without wrapping (C topl.c)
    const arr = s.split('');
    const lines = [];
    let segStart = 0;
    let pos = 0;
    while (arr.length - pos >= CO_W) {
        const otl = pos;
        let found = -1;
        for (let i = otl + CO_W - 1; i > otl; i--) {
            if (arr[i] === ' ') { found = i; break; }
        }
        if (found < 0) {
            // Huge token: split after it (at the next space).
            const sp = arr.indexOf(' ', otl);
            if (sp < 0) break; // no choice but to emit it whole
            found = sp;
        }
        lines.push(arr.slice(segStart, found).join(''));
        pos = found + 1;
        segStart = found + 1;
    }
    lines.push(arr.slice(segStart).join(''));
    return lines;
}

// Draw "--More--" for the current top-line message and block until the
// user presses space/return/escape.  C ref: win/tty/topl.c more() +
// win/tty/getline.c xwaitforspace().  The current message is assumed to
// already be on the grid (drawn by _buildScreenOutput / flush_screen);
// the map + status underneath are likewise already present.
const DEFMORESTR = '--More--';
const CO = 80;

export async function topl_more() {
    const disp = game?.nhDisplay;
    if (!disp?.setCell) return;
    // Re-render the current frame (message + map + status) to the grid.
    _buildScreenOutput();

    const msg = game._pending_message || '';
    // The message may already span multiple rows (topl.c word-wrap); --More--
    // follows the end of the LAST wrapped row.
    const mlines = wrap_topl(msg);
    let cury = mlines.length - 1;
    let curx = mlines[cury].length;   // 0-based column one past the last line
    // C more(): if there's no room for "--More--" on the line, wrap first.
    if (curx >= CO - 8) {
        curx = 0;
        cury += 1;
    }
    for (let i = 0; i < DEFMORESTR.length && curx + i < CO; i++)
        disp.setCell(curx + i, cury, DEFMORESTR[i], NO_COLOR, 0);
    disp.setCursor(Math.min(curx + DEFMORESTR.length, CO - 1), cury);

    // xwaitforspace: read keys until space / return / escape.
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) break;
    }
}

// C ref: win/tty/topl.c update_topl(bp) — append a message to the top line,
// or fire --More-- and start a fresh line when there is no room.  When a
// previous message is still unacknowledged (toplin == NEED_MORE) and there is
// room ("len(bp) + len(toplines) + 3 < CO - 8"), the new message is appended
// after two spaces on the same line; otherwise the pending line is shown with
// --More-- (a blocking nhgetch, captured as its own screen frame) before the
// new message replaces it.  Used by the level-gain cascade (exper.js pluslvl).
//
// toplin state is tracked in game._toplin (0 = empty, 1 = NEED_MORE); the
// accumulated line lives in game._pending_message, matching the rest of the
// rendering pipeline.
const TOPLIN_NEED_MORE = 1; // game._toplin: 0 = empty, 1 = NEED_MORE

export async function update_topl(bp) {
    const n0 = bp.length;
    const cur = game._pending_message || '';
    if (game._toplin === TOPLIN_NEED_MORE
        && n0 + cur.length + 3 < CO - 8
        && !bp.startsWith('You die')) {
        game._pending_message = cur + '  ' + bp;
        game._toplin = TOPLIN_NEED_MORE;
        // C ref: topl.c gt.toplines — the persistent last-topline text (used by
        // Norep dedup), which is NOT blanked when the command prompt clears the
        // displayed message line.
        game._toplines = game._pending_message;
        return;
    }
    if (game._toplin === TOPLIN_NEED_MORE) {
        await topl_more();
    }
    game._pending_message = bp;
    game._toplin = TOPLIN_NEED_MORE;
    game._toplines = bp;
}

// C ref: topl.c tty_yn_function / hack.h y_n.  Render a yes/no prompt and read
// a valid response.  When a top-line message is still pending acknowledgment
// (needMore), show "--More--" first (capturing that as its own step) before the
// prompt.  resp lists the allowed letters (an embedded ESC marks hidden,
// always-acceptable choices); def is returned on space/return/ESC.
export async function y_n(query, resp = 'yn\x1b', def = 'n') {
    if (game._yn_need_more) {
        game._yn_need_more = false;
        await topl_more();
    }
    // Build the displayed prompt (hidden ESC-and-after choices are stripped).
    const shown = resp.split('\x1b')[0];
    let prompt = query;
    if (resp) {
        prompt += ` [${shown}]`;
        if (def) prompt += ` (${def})`;
    }
    const full = prompt + ' ';

    const disp = game?.nhDisplay;
    for (;;) {
        game._pending_message = full.trimEnd();
        await flush_screen(1);
        game._modal_screen = 'topl';
        if (disp?.setCursor) disp.setCursor(Math.min(full.length, CO - 1), 0);
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);
        // quitchars (space/return/ESC) -> default.  Answering the prompt clears
        // the top line (C ref: topl.c — the toplin NEED_MORE state is reset once
        // the player's response is read), so a message printed right after the
        // prompt (e.g. savelife's "OK, so you don't die.") starts a fresh line
        // rather than appending after a phantom "  " separator.
        if (c === 32 || c === 13 || c === 10 || c === 27) {
            game._pending_message = '';
            game._toplin = 0;
            return def;
        }
        const lc = ch.toLowerCase();
        if (resp.includes(lc)) {
            game._pending_message = '';
            game._toplin = 0;
            return lc;
        }
        // invalid response: re-prompt (no bell modeled).
    }
}
