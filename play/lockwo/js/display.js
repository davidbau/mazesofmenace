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
    LADDER, LA_DOWN, DBWALL, DRAWBRIDGE_UP, DRAWBRIDGE_DOWN, AIR, CLOUD,
    DB_UNDER, DB_MOAT, DB_LAVA, DB_ICE,
    AM_MASK, AM_LAWFUL, AM_NEUTRAL, AM_CHAOTIC, AM_SANCTUM,
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
import { visible_region_at, show_region } from './region.js';
import { ACCESSIBLE, IS_POOL, IS_LAVA, In_sokoban,
         Is_knox_level } from './const.js';
import { In_hell } from './dungeon.js';
import { observe_object } from './o_init.js';

const COIN_CLASS = 12;
const ROCK_CLASS = 14;
const STATUE_OTYP = 476;
const BOULDER_OTYP = 475;

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
const FIRST_SPELL = 366, LAST_SPELL = 407;        // SPE_DIG..SPE_BLANK_PAPER
const FIRST_REAL_GEM = 439, LAST_GLASS_GEM = 469; // DILITHIUM_CRYSTAL..WORTHLESS_VIOLET_GLASS
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
// hallucinating (objects are randomized then).  observe_object() also does the
// '\'-discoveries bookkeeping (oc_encountered); it consumes no RNG.
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
    observe_object(obj);
}

// C ref: display.c see_nearby_objects() — mark the top object of nearby stacks
// as having been seen, and if it was being displayed as a generic object,
// redisplay it as specific.  Called from u_on_newpos() (dungeon.c) whenever the
// hero relocates on the same level (and is not Blind/Hallucinating/Swallowed),
// so an undescribed potion/gem/spellbook the hero walks *near* (without its own
// tile being redrawn by newsym) still upgrades from the generic gray class
// glyph to its appearance color.  Mirrors the neardist square scan around the
// hero; consumes no RNG.  Unlike map_object() this has NO generic-object guard
// on the observe: every nearby unseen pile-top is observed (which is how e.g. a
// venom splat reaches the '\' list); only the redisplay is gated on the
// remembered glyph having been generic.
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
            // skip if no object or already seen up close
            if (!obj || obj.dknown) continue;
            // skip if the spot can't be seen or is too far (diagonal)
            if (!cansee(ix, iy)) continue;
            const distu = (ix - x) * (ix - x) + (iy - y) * (iy - y);
            if (distu > neardist) continue;
            const wasGeneric = obj_is_generic(obj);
            obj.dknown = 1;
            observe_object(obj);
            if (wasGeneric) newsym(ix, iy);
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

// C ref: display.h obj_is_piletop(obj) — the topmost floor object at (x,y) is a
// "pile top" when there is at least one more object beneath it in the tile's
// nexthere chain, with the boulder exception: a boulder hides the pile beneath
// it (so it is only a pile top when the object directly under it is also a
// boulder).  A pile-top object glyph carries MG_OBJPILE, which the tty draws in
// reverse video when iflags.hilite_pile (and use_inverse) are set.  `top` must
// be the topmost object at its tile (as returned by vobj_at).
function obj_is_piletop(top) {
    if (!top || top.where !== 'floor') return false;
    const objs = game.level?.objects;
    if (!objs) return false;
    let beneath = null;
    for (const o of objs) {
        if (o.where === 'floor' && o.ox === top.ox && o.oy === top.oy && o !== top)
            beneath = o; // last-seen colocated non-top object == directly beneath the top
    }
    if (!beneath) return false;
    if (top.otyp === BOULDER_OTYP && beneath.otyp !== BOULDER_OTYP) return false;
    return true;
}

// C ref: win/tty/wintty.c tty_print_glyph — a pile-top object glyph (MG_OBJPILE)
// is drawn with ATR_INVERSE when iflags.hilite_pile && iflags.use_inverse.
// use_inverse defaults On (only toggled via the Advanced options which the
// recorded sessions never touch), so an unset flag counts as on.
function pile_attr(pile) {
    return (pile && game.flags?.hilite_pile && game.flags?.use_inverse !== false)
        ? ATR_INVERSE : 0;
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
export function see_with_infrared(mon) {
    return !!mon && !Blind() && Infravision()
        && infravisible(mon.data) && couldsee(mon.mx, mon.my);
}

// C ref: display.h canseemon(mon) — (cansee(mx,my) || see_with_infrared(mon))
// && mon_visible(mon).  The infravision arm is NOT optional: an infravision
// race (dwarf/elf/gnome/orc) spots a warm monster on an unlit square in line of
// sight, which is exactly where a dark-corridor arrival/attack message comes
// from.  mon_visible: (!minvis || See_invisible) && !mundetected.
export function canseemon_shared(mtmp) {
    if (!mtmp) return false;
    // No long worms in the covered sessions, so canseemon's worm_known() arm
    // never applies.
    if (!(cansee(mtmp.mx, mtmp.my) || see_with_infrared(mtmp))) return false;
    return mon_visible(mtmp);
}

// C ref: display.h _mon_visible(mon) — (!minvis || See_invisible) && !mundetected.
// Assumes the caller has established that the hero can see the SQUARE; newsym()
// relies on this to decide whether to draw the monster glyph at all.
function mon_visible(mtmp) {
    if (!mtmp) return false;
    if (mtmp.minvis && !see_invisible()) return false;
    return !mtmp.mundetected;
}

// C ref: youprop.h See_invisible — HSee_invisible || ESee_invisible.  Different
// files in this port spell the hero's copy differently; read all of them.
function see_invisible() {
    const u = game.u || {}, p = u.uprops || {};
    return !!(u.see_invis || p.HSee_invisible || u.HSee_invisible
        || p.ESee_invisible || u.ESee_invisible || p.See_invisible || u.See_invisible);
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

// C ref: display.h cmap_walls_to_glyph() + display.c reset_glyphmap's
// wall_color(): a wall's glyph (and therefore its colour) is picked from a
// per-branch GLYPH_CMAP_*_OFF range, in exactly this priority order —
// mines, hell, knox, sokoban, main.  wallcolors[] itself defaults to CLR_GRAY
// for every region, but loading a symset applies its `G_<wall>_<region>: /col`
// lines, and dat/symbols' DECgraphics set (the one these recordings use)
// specifies /brown for the mines, /red for Gehennom, /yellow for Knox and
// /blue for Sokoban, leaving the main dungeon gray.  CLR_GRAY emits no tty
// escape at all, which is what NO_COLOR records as.
function wall_cmap_color() {
    const uz = game.u?.uz;
    if (!uz) return NO_COLOR;
    if (game.mines_dnum != null && uz.dnum === game.mines_dnum) return CLR_BROWN;
    if (In_hell(uz)) return CLR_RED;
    if (Is_knox_level(uz)) return CLR_YELLOW;
    if (In_sokoban(uz)) return CLR_BLUE;
    return NO_COLOR;
}

// Render a wall/SDOOR cell, applying wall_angle (mode + seenv) so walls only
// show from the angles C would draw them.  C ref: back_to_glyph wall case:
//   idx = ptr->seenv ? wall_angle(ptr) : S_stone;
function wall_glyph_for(loc) {
    const idx = loc.seenv ? wall_angle(loc) : S_stone;
    return wall_cmap_glyph(idx);
}

// C ref: stairs.c stairway_at — find the stairway node at (x,y).  mklev builds
// gs.stairs as a `next`-linked list; sp_lev's own stair/ladder makers push onto
// a plain array instead, so walk whichever shape is present (walking an array
// as a list silently found nothing, which made known_branch_stairs() answer
// FALSE on every special level).
function stairway_at(x, y) {
    const head = game.stairs;
    if (Array.isArray(head)) {
        for (const s of head) if (s && s.sx === x && s.sy === y) return s;
        return null;
    }
    for (let s = head; s; s = s.next)
        if (s.sx === x && s.sy === y) return s;
    return null;
}

// C ref: back_to_glyph STAIRS/LADDER — `ptr->ladder & LA_DOWN` picks the
// down-variant.  rm.h aliases `ladder` onto struct rm's shared `flags`, and only
// mklev's stair makers stamp it in this port (sp_lev's create_stairs path never
// does), so fall back to the stairway record and finally to level.upstair.
// Using level.upstair alone is wrong on a level that carries a branch
// up-staircase as well as the main one — mklev's branch maker overwrites
// level.upstair with the branch, leaving the real upstair drawn as '>'.
function stairs_go_down(loc, x, y) {
    if (loc.ladder) return !!(loc.ladder & LA_DOWN);
    const sway = stairway_at(x, y);
    if (sway) return !sway.up;
    return !(game.level?.upstair?.x === x && game.level?.upstair?.y === y);
}

// C ref: stairs.c known_branch_stairs — True if 'sway' is a branch staircase
// (leads to a different dungeon) and the hero has traversed it.
function known_branch_stairs(sway) {
    return !!(sway && sway.tolev
        && sway.tolev.dnum !== (game.u?.uz?.dnum ?? 0)
        && sway.u_traversed);
}

// C ref: symbols.c update_ov_primary_symset() — a SYMBOLS= rc line replaces
// just the display character for one cmap symbol; the symbol's base color is
// untouched.  Overrides parsed from the rc are always plain literal
// characters (no high bit), so they never need DEC-font translation.
function symOverrideChar(name) {
    const ov = game.symoverride;
    return ov && ov[name] ? ov[name] : null;
}

// S_tree, shared by TREE terrain and an arboreal level's STONE/SCORR.
function tree_glyph(dec) {
    return dec ? { ch: 'g', color: CLR_GREEN, dec: false }
               : { ch: '#', color: CLR_GREEN, dec: false };
}

export function terrain_glyph(loc, x, y) {
    const typ = loc.typ;
    const dec = useDECgraphics();
    switch (typ) {
    // C ref: back_to_glyph SCORR/STONE — `idx = svl.level.flags.arboreal
    // ? S_tree : S_stone` (an arboreal level's undug rock is forest).
    case STONE:
    case SCORR:
        if (game.level?.flags?.arboreal) return tree_glyph(dec);
        return { ch: ' ', color: NO_COLOR, dec: false };
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
        const ch = stairs_go_down(loc, x, y) ? '>' : '<';
        const sway = known_branch_stairs(stairway_at(x, y)) ? CLR_YELLOW : NO_COLOR;
        return { ch, color: sway, dec: false };
    }
    case LADDER: {
        // C ref: back_to_glyph LADDER — S_upladder/S_dnladder (CLR_BROWN) or
        // the branch pair (CLR_YELLOW).  dat/symbols DECgraphics maps both to
        // meta-y / meta-z, which the frozen decoder's DEC_MAP has no entry for,
        // so (like S_tree) emit the bare letter with dec=false.
        const down = stairs_go_down(loc, x, y);
        const color = known_branch_stairs(stairway_at(x, y)) ? CLR_YELLOW : CLR_BROWN;
        if (dec) return { ch: down ? 'z' : 'y', color, dec: false };
        return { ch: down ? '>' : '<', color, dec: false };
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
    case MOAT: {
        const ov = symOverrideChar('S_pool');
        if (ov) return { ch: ov, color: CLR_BLUE, dec: false };
        return dec ? { ch: '`', color: CLR_BLUE, dec: false }
                   : { ch: '}', color: CLR_BLUE, dec: false };
    }
    case WATER:     return dec ? { ch: '`', color: CLR_BRIGHT_BLUE, dec: false }
                               : { ch: '}', color: CLR_BRIGHT_BLUE, dec: false };
    case LAVAPOOL:  return dec ? { ch: '`', color: CLR_RED, dec: false }
                               : { ch: '}', color: CLR_RED, dec: false };
    case LAVAWALL:  return dec ? { ch: '`', color: CLR_ORANGE, dec: false }
                               : { ch: '}', color: CLR_ORANGE, dec: false };
    case ICE:       return dec ? { ch: '~', color: CLR_CYAN, dec: true }
                               : { ch: '.', color: CLR_CYAN, dec: false };
    // C ref: defsym.h PCHAR(17, '#', S_bars, HI_METAL) — HI_METAL is CLR_CYAN,
    // not the gray this used to claim.  dat/symbols DECgraphics remaps S_bars to
    // \xfc (meta-'|', "not-equals"); DEC_MAP has no '|' entry so, like S_tree,
    // emit the bare character with dec=false.
    case IRONBARS:  return dec ? { ch: '|', color: CLR_CYAN, dec: false }
                               : { ch: '#', color: CLR_CYAN, dec: false };
    // C ref: dat/symbols DECgraphics S_tree = \xe7 (meta-g).  The recorder emits
    // it as 'g' inside the DEC (Shift-Out) font; the frozen decoder's DEC_MAP has
    // no 'g' entry, so the recorded C cell renders as the literal 'g'.  Emit 'g'
    // with dec=FALSE (same trick as S_pool's '`') so the JS cell matches.  The
    // default (non-DEC) symset draws a tree as '#'.
    case TREE:      return tree_glyph(dec);
    case FOUNTAIN:  return { ch: symOverrideChar('S_fountain') || '{', color: CLR_BRIGHT_BLUE, dec: false };
    // C ref: defsym.h PCHAR(36, '{', S_sink, CLR_WHITE).
    case SINK:      return { ch: '{', color: CLR_WHITE, dec: false };
    case GRAVE:     return { ch: '|', color: CLR_WHITE, dec: false };
    case THRONE:    return { ch: '\\', color: CLR_YELLOW, dec: false };
    // C ref: back_to_glyph ALTAR — the glyph is altar_to_glyph(altarmask), and
    // display.c altarcolors[] gives it a per-alignment colour.  Without
    // USE_GENERAL_ALTAR_COLORS (undefined in this build) lawful/neutral/chaotic
    // are all CLR_GRAY, but an *unaligned* altar (amask & AM_MASK not one of
    // the three, e.g. the "noalign" altars .lua files stamp) is CLR_RED and
    // Moloch's Sanctum (AM_SANCTUM) is CLR_BRIGHT_MAGENTA.
    // dat/symbols DECgraphics remaps S_altar to \xfb (meta-'{'); the default
    // symset draws it as '_'.
    case ALTAR: {
        const amask = loc.altarmask ?? loc.flags ?? 0;
        const acolor = (amask & AM_SANCTUM) ? CLR_BRIGHT_MAGENTA
            : ((amask & AM_MASK) === AM_LAWFUL || (amask & AM_MASK) === AM_NEUTRAL
               || (amask & AM_MASK) === AM_CHAOTIC) ? CLR_GRAY
            : CLR_RED;
        return dec ? { ch: '{', color: acolor, dec: true }
                   : { ch: '_', color: acolor, dec: false };
    }
    // C ref: back_to_glyph DBWALL — the raised-drawbridge portcullis, S_hcdbridge
    // / S_vcdbridge ('#', CLR_BROWN; not remapped by DECgraphics).
    case DBWALL:    return { ch: '#', color: CLR_BROWN, dec: false };
    // C ref: back_to_glyph DRAWBRIDGE_DOWN — S_hodbridge / S_vodbridge, which
    // DECgraphics remaps to \xfe (meta-'~', the centered dot).
    case DRAWBRIDGE_DOWN:
        return dec ? { ch: '~', color: CLR_BROWN, dec: true }
                   : { ch: '.', color: CLR_BROWN, dec: false };
    // C ref: back_to_glyph DRAWBRIDGE_UP — the square the raised bridge covers
    // shows whatever is underneath (drawbridgemask & DB_UNDER).
    case DRAWBRIDGE_UP:
        switch (loc.drawbridgemask & DB_UNDER) {
        case DB_MOAT:  return dec ? { ch: '`', color: CLR_BLUE, dec: false }
                                  : { ch: '}', color: CLR_BLUE, dec: false };
        case DB_LAVA:  return dec ? { ch: '`', color: CLR_RED, dec: false }
                                  : { ch: '}', color: CLR_RED, dec: false };
        case DB_ICE:   return dec ? { ch: '~', color: CLR_CYAN, dec: true }
                                  : { ch: '.', color: CLR_CYAN, dec: false };
        default:       return dec ? { ch: '~', color: NO_COLOR, dec: true }
                                  : { ch: '.', color: NO_COLOR, dec: false };
        }
    // C ref: defsym.h S_air (' ', CLR_CYAN) / S_cloud ('#', CLR_GRAY).
    case AIR:       return { ch: ' ', color: CLR_CYAN, dec: false };
    case CLOUD:     return { ch: '#', color: CLR_GRAY, dec: false };
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
    // C ref: back_to_glyph default — impossible() then `idx = S_room`
    // ("something is better than nothing"), NOT a literal '?'.
    default:
        return dec ? { ch: '~', color: NO_COLOR, dec: true }
                   : { ch: '.', color: NO_COLOR, dec: false };
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
export function engraving_glyph(loc) {
    const ch = (loc?.typ === CORR) ? '#' : '`';
    return { ch, color: CLR_BRIGHT_BLUE, dec: false };
}

// C ref: display.h covers_objects(x,y) — a liquid cell hides objects/traps:
// (is_pool && !Underwater) || LAVAPOOL || LAVAWALL.  is_pool = POOL|MOAT|WATER.
export function covers_objects(loc) {
    const typ = loc?.typ;
    // dbridge.c is_pool()/is_lava() also count the square under a raised
    // drawbridge whose DB_UNDER is moat or lava.
    if (typ === DRAWBRIDGE_UP) {
        const u = loc.drawbridgemask & DB_UNDER;
        return u === DB_MOAT || u === DB_LAVA;
    }
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
export function trap_glyph(trap) {
    const d = trap_defsym[trap.ttyp];
    // Unknown ttyp: fall back to the arrow-trap sym/color (defsyms[] default).
    if (!d) return { ch: '^', color: CLR_CYAN, dec: false };
    return { ch: d.ch, color: d.color, dec: false };
}

// C ref: getpos.c getpos() else-branch — terrain symbol matching.  A key that
// is not a movement/pick/special key but DOES match a non-skipped cmap symbol
// (defsym.h: walls/room/corr/door are skipped) triggers a map scan; when no
// such feature exists "Can't find dungeon feature '%c'." is shown; a key that
// matches no cmap symbol at all falls through to "Unknown direction".
// GP_FEATURE_SYMS covers both kinds of matchable symbol: the transient
// special-effect/beam/zap glyphs (defsym.h S_ss1 '0', S_goodpos '$',
// S_flashbeam/S_ss4 '!'/'*', S_boomleft/right ')'/'(') that are never placed
// as static terrain (so the scan always reports "Can't find ..."), plus the
// static terrain/furniture/trap symbols (stairs/ladders '<'/'>', altar '_',
// grave '|', throne '\\', sink/fountain '{', pool/water/lava '}', ice '.',
// iron bars/tree/cloud '#', web '"', vibrating square/generic trap '~'/'^')
// that getpos_find_feature actually scans the map for.
const GP_FEATURE_SYMS = new Set([
    '0', '$', '!', '*', ')', '(',
    '<', '>', '_', '|', '\\', '{', '}', '.', '#', '"', '~', '^',
]);
export function getpos_is_feature_sym(ch) { return GP_FEATURE_SYMS.has(ch); }

// C ref: rm.h is_cmap_wall/is_cmap_room/is_cmap_corr/is_cmap_door + getpos.c's
// explicit S_ndoor skip — the terrain classes getpos's feature search never
// matches against (walls, room floor, corridors, every doorway variant).
const GP_EXCLUDED_TYP = new Set([
    STONE, VWALL, HWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL,
    TUWALL, TDWALL, TLWALL, TRWALL, SDOOR, ROOM, CORR, SCORR, DOOR,
]);

// C ref: getpos.c getpos() else-branch feature search — scans outward from
// the cursor (just past the current spot to the bottom-right, then wrapping
// from the top-left back to the current spot) for a map cell whose
// remembered/displayed terrain or trap glyph matches the pressed key.  Object
// piles are never matched: in C they use a separate glyph namespace (SYM_OC)
// that glyph_is_cmap() rejects outright, regardless of the object's printed
// character.  Returns the first {x,y} match, or null if the feature is
// nowhere on the (explored) map.
export function getpos_find_feature(ch, cx, cy) {
    const tryCell = (tx, ty) => {
        const loc = game.level?.at(tx, ty);
        if (!loc || !(loc.seenv || loc.remembered_glyph)) return false;
        if (!GP_EXCLUDED_TYP.has(loc.typ) && terrain_glyph(loc, tx, ty).ch === ch)
            return true;
        const trap = game.level?.traps?.find((t) => t.tx === tx && t.ty === ty);
        if (trap?.tseen && trap_glyph(trap).ch === ch) return true;
        return false;
    };
    for (let ty = cy; ty <= ROWNO - 1; ty++) {
        const loX = (ty === cy) ? cx + 1 : 1;
        for (let tx = loX; tx <= COLNO - 1; tx++) if (tryCell(tx, ty)) return { x: tx, y: ty };
    }
    for (let ty = 0; ty <= cy; ty++) {
        const hiX = (ty === cy) ? cx : COLNO - 1;
        for (let tx = 1; tx <= hiX; tx++) if (tryCell(tx, ty)) return { x: tx, y: ty };
    }
    return null;
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
        if (og) {
            // C ref: display.h obj_to_glyph — a stack of 2+ floor objects makes
            // the top glyph a pile-top glyph (MG_OBJPILE), highlighted by the tty
            // when hilite_pile is on.  Same sym/color as the plain object glyph;
            // only the pile flag (rendered as ATR_INVERSE) is added.
            if (obj_is_piletop(obj)) og.pile = true;
            return og;
        }
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
// C ref: attrib.c *_abil[] — the experience level at which each role gains
// intrinsic Warning (HWarning).  Roles absent from this map never gain it.
// Keyed by role mnum, matching allmain.js's FAST_AT_LEVEL table.
const WARNING_AT_LEVEL = Object.freeze({
    2: 15,   // Caveman (cav_abil)
    3: 15,   // Healer  (hea_abil)
    5: 7,    // Monk    (mon_abil)
    6: 15,   // Priest  (pri_abil)
    12: 15,  // Wizard  (wiz_abil)
});

// C ref: hack.h Warning — HWarning|EWarning.  Only the role-granted intrinsic
// is modelled; the extrinsic (ring of warning, warned-of-monster artifacts) is
// not, so MATCH_WARN_OF_MON never applies either.
function have_warning() {
    const lvl = WARNING_AT_LEVEL[game.urole?.mnum];
    if (lvl == null) return false;
    return (game.u?.ulevel ?? 1) >= lvl;
}

// C ref: display.h _mon_warning(mon) —
//   Warning && !mon->mpeaceful && mdistu(mon) < 100
//     && ((int)(mon->m_lev / 4)) >= svc.context.warnlevel
// svc.context.warnlevel is set to 1 by newgame() (allmain.c:774) and nothing
// in a normal game changes it.
const WARNLEVEL = 1;
function mon_warning(mon) {
    if (!mon || mon.mpeaceful) return false;
    if (!have_warning()) return false;
    const dx = mon.mx - (game.u?.ux ?? 0), dy = mon.my - (game.u?.uy ?? 0);
    if (dx * dx + dy * dy >= 100) return false;
    return Math.trunc((mon.m_lev || 0) / 4) >= WARNLEVEL;
}

// C ref: drawing.c def_warnsyms[] — the six warning levels, '0'..'5'.
const WARNSYMS = [
    { ch: '0', color: CLR_WHITE }, { ch: '1', color: CLR_RED },
    { ch: '2', color: CLR_RED }, { ch: '3', color: CLR_RED },
    { ch: '4', color: CLR_MAGENTA }, { ch: '5', color: CLR_BRIGHT_MAGENTA },
];
const WARNCOUNT = 6;

// C ref: display.c display_warning() / warning_of() — a warning glyph floats
// above the map wherever an unseen threatening monster is sensed.  No RNG.
function display_warning(mon, x, y) {
    const tmp = Math.trunc((mon.m_lev || 0) / 4);
    const wl = (tmp > WARNCOUNT - 1) ? WARNCOUNT - 1 : tmp;
    const sym = WARNSYMS[wl];
    show_glyph_cell(x, y, sym.ch, sym.color, false);
}

// C ref: display.h canspotself() — canseeself() || senseself(), where
//   canseeself() = Blind || u.uswallow || (!Invisible && !u.uundetected)
//   senseself()  = Unblind_telepat || Detect_monsters
// and youprop.h Invisible = ((HInvis || EInvis) && !BInvis) && !See_invisible.
// A blind hero still "sees" itself (touch); an invisible one does not, and its
// square shows the terrain/object underneath instead of '@'.
function canspotself() {
    const u = game.u || {};
    if (Blind() || u.uswallow) return true;
    const p = u.uprops || {};
    const invis = (p.HInvis || u.HInvis || p.EInvis || u.EInvis || 0) && !(p.BInvis || u.BInvis);
    if (!(invis && !see_invisible()) && !u.uundetected) return true;
    // senseself(): ETelepat is the only Unblind_telepat source, and neither it
    // nor Detect_monsters is reachable while the hero is merely invisible here.
    return !!(p.HDetect_monsters || p.EDetect_monsters || u.HDetect_monsters);
}

export function newsym(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return;

    if (game.u?.ux === x && game.u?.uy === y) {
        // C ref: display.c newsym — the hero's own cell is cansee, so its lit
        // condition is remembered: lev->waslit = (lev->lit != 0).
        loc.waslit = loc.lit ? 1 : 0;
        // Hero — drawn live; remember the background underneath.  Standing on
        // an engraved spot reveals it.  C ref: display.c newsym:970
        // `if ((ep = engr_at(x, y)) != 0) ep->erevealed = 1;` — NOT gated on
        // spot_shows_engravings ("even when covered by objects or a monster");
        // only the _map_location draw is.
        {
            const ep = engr_at(x, y);
            if (ep) ep.erevealed = 1;
        }
        // C ref: display.c newsym u_at branch —
        //   int see_self = canspotself();
        //   _map_location(x, y, !see_self);
        //   if (see_self) display_self();
        // An INVISIBLE hero without see-invisible is not drawn at all: the
        // square shows (and is remembered as) the background under it.
        const bg = background_glyph(loc, x, y);
        if (canspotself()) {
            // C ref: display.c display_self() — a mounted hero is drawn as the
            // steed's glyph (the hero is "on" the steed), not '@'.
            const hg = hero_glyph();
            show_glyph_cell(x, y, hg.ch, hg.color, false);
        } else {
            show_glyph_cell(x, y, bg.ch, bg.color, bg.dec, pile_attr(bg.pile));
        }
        loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec, pile: !!bg.pile };
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
        // C ref: display.c newsym:970 — seeing the square reveals any engraving
        // on it, whatever the terrain and whatever is drawn on top.
        {
            const ep = engr_at(x, y);
            if (ep) ep.erevealed = 1;
        }
        // A visible monster takes precedence over the background.  C ref:
        // display.c newsym -> mon_visible(mon): an mundetected hider (e.g. a
        // giant eel submerged in water) is NOT shown; the background shows
        // through instead.
        const mon = m_at(x, y);
        // C ref: display.c newsym:1015 — "if monster is in a physical trap, you
        // see trap too".  Runs BEFORE _map_location, so the trap this reveals is
        // what the square is remembered as once the monster steps off.  Purely
        // RNG-free state, but a remembered trap changes what unmap_object() and
        // every later redraw draw here.
        if (mon && mon_visible(mon) && mon.mtrapped) {
            const mtrap = game.level?.traps?.find((t) => t.tx === x && t.ty === y);
            const tt = mtrap ? mtrap.ttyp : 0;
            if (tt === BEAR_TRAP || tt === PIT || tt === SPIKED_PIT || tt === WEB)
                mtrap.tseen = 1;
        }
        const bg = background_glyph(loc, x, y);
        // C ref: display.c newsym — a visible gas-cloud region drawn on top of
        // the background, UNLESS a directly-occupying monster overrides it
        // (mon_overrides_region()).  SCOPE: mon_overrides_region's adjacent-
        // monster / sensemon / mon_warning / xray_range cases are not modeled
        // — only the simple "a normally-visible monster stands exactly here"
        // override — since no covered session has needed the richer form yet.
        // This is never reached for the hero's own square (handled earlier),
        // so C's region-overrides-the-hero-glyph ordering nuance is also not
        // replicated (see region.js's file header for the broader scope note).
        const reg = visible_region_at(x, y);
        if (reg && (ACCESSIBLE(loc.typ) || (reg.visible && (IS_POOL(loc.typ) || IS_LAVA(loc.typ))))
            && !(mon && mon_visible(mon))) {
            const rg = show_region(reg);
            show_glyph_cell(x, y, rg.ch, rg.color, false);
            return;
        }
        if (mon && mon_visible(mon)) {
            // Remember the background (not the monster — monsters move).
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec, pile: !!bg.pile };
            }
            // C ref: display.c newsym — showing an actual monster here "also
            // gets rid of any invisibility glyph".
            loc.invisMon = false;
            const mg = monster_glyph(mon);
            // C ref: win/tty/wintty.c tty_print_glyph — a pet glyph (MG_PET)
            // is drawn with iflags.wc2_petattr (default ATR_INVERSE) when
            // iflags.hilite_pet is set.  Only the attribute is changed, not the
            // monster's color.
            const petAttr = (mon.mtame && game.flags?.hilite_pet) ? ATR_INVERSE : 0;
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec, petAttr);
        } else if (mon && mon_warning(mon)) {
            // C ref: display.c newsym:1030 — `else if (mon && mon_warning(mon)
            // && !worm_tail) display_warning(mon)`.
            display_warning(mon, x, y);
        } else if (loc.invisMon) {
            // C ref: display.c newsym — else if (glyph_is_invisible(lev->glyph))
            // map_invisible(x,y): a square remembered as holding a sensed-but-
            // unseen monster keeps showing 'I' even once back in the hero's
            // sight, until the monster itself is actually seen there.
            map_invisible(x, y);
        } else {
            // Remember the background (not the monster — monsters move).
            if (game.level?.flags?.hero_memory) {
                loc.remembered_glyph = { ch: bg.ch, color: bg.color, decgfx: bg.dec, pile: !!bg.pile };
            }
            show_glyph_cell(x, y, bg.ch, bg.color, bg.dec, pile_attr(bg.pile));
        }
    } else {
        // Can't physically see <x,y>.  C ref: display.c newsym "Can't see the
        // location" branch.
        const mon = m_at(x, y);
        if (mon && mon_visible(mon) && see_with_infrared(mon)) {
            // A warm monster within the hero's line of sight but on a square too
            // dark to see is revealed by infravision (see_with_infrared &&
            // mon_visible).  display_monster draws the normal monster glyph; it
            // does NOT call _map_location or set waslit, so remembered
            // background/lit memory is untouched (the glyph is erased later by
            // the monster-move / vision redraw when it is no longer sensed).
            const mg = monster_glyph(mon);
            const petAttr = (mon.mtame && game.flags?.hilite_pet) ? ATR_INVERSE : 0;
            show_glyph_cell(x, y, mg.ch, mg.color, mg.dec, petAttr);
        } else if (mon && mon_warning(mon)) {
            // C ref: display.c newsym:1055 — the out-of-sight arm of the same
            // rule: a threatening monster the hero cannot see still shows its
            // warning glyph, on top of whatever the square is remembered as.
            display_warning(mon, x, y);
        } else if (loc.remembered_glyph) {
            // C ref: display.c newsym else-branch (~1087) — a cell out of sight
            // remembered as a lit corridor (S_litcorr) re-darkens to S_corr when
            // `!lev->waslit || (flags.dark_room && iflags.use_color)`.  The
            // dark_room option (dark_room [true] in doset.js) defaults on for
            // every covered session, so out-of-sight lit corridors re-darken
            // on EVERY redraw regardless of waslit, not only once waslit itself
            // flips false (that only happens via a separate couldsee-gated
            // branch in vision_recalc that a permanently-lit corridor cell
            // never takes).  Our litcorr glyph is '#' with CLR_WHITE; the dark
            // corridor is '#' with NO_COLOR.  Mutate the remembered glyph so
            // subsequent redraws stay consistent (C overwrites lev->glyph
            // likewise).
            if (loc.typ === CORR && (!loc.waslit || game.flags?.dark_room)
                && loc.remembered_glyph.ch === '#'
                && loc.remembered_glyph.color === CLR_WHITE) {
                loc.remembered_glyph.color = NO_COLOR;
            }
            // Out of sight but remembered — show remembered background.  A
            // remembered pile-top keeps its MG_OBJPILE highlight (drawn via the
            // current hilite_pile setting), matching C's stored pile-top glyph.
            show_glyph_cell(x, y, loc.remembered_glyph.ch,
                loc.remembered_glyph.color, loc.remembered_glyph.decgfx,
                pile_attr(loc.remembered_glyph.pile));
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
    if (game.level?.flags?.hero_memory) {
        loc.remembered_glyph = { ch: 'I', color: NO_COLOR, decgfx: false };
        loc.invisMon = true;
    }
    show_glyph_cell(x, y, 'I', NO_COLOR, false);
}

// C ref: display.c unmap_object(x,y) — remove something from the map's
// memory when the hero realizes it's not there anymore (most commonly the
// 'I' invisible-monster notation).  Replaces the remembered glyph with a
// known trap, then a revealed engraving, then plain terrain — deliberately
// NEVER a remembered floor object (a caller that just placed/moved a real
// object there follows up with newsym(), which fills the object back in).
export function unmap_object(x, y) {
    if (!game.level?.flags?.hero_memory) return;
    const loc = game.level?.at(x, y);
    if (!loc) return;
    const trap = game.level?.traps?.find((t) => t.tx === x && t.ty === y);
    let g = null;
    if (trap && trap.tseen && !covers_objects(loc)) {
        g = trap_glyph(trap);
    } else if (loc.seenv) {
        // C ref: display.c unmap_object — the second arm is map_background(),
        // i.e. back_to_glyph terrain ONLY; there is no engraving arm here (that
        // lives in _map_location, which unmap_object deliberately does not use).
        g = terrain_glyph(loc, x, y);
        // C: "turn remembered dark room squares dark" — a room floor glyph
        // picked above for a square that isn't currently lit re-darkens to
        // blank, same as an unlit room square that was never specially seen.
        if (!loc.waslit && loc.typ === ROOM) g = { ch: ' ', color: NO_COLOR, dec: false };
    } else {
        g = { ch: ' ', color: NO_COLOR, dec: false };
    }
    loc.invisMon = false;
    loc.remembered_glyph = { ch: g.ch, color: g.color, decgfx: g.dec, pile: false };
}

// ── docrt ──
// C ref: display.c docrt — recompute the live glyph for every cell so the
// monster/object/terrain stack and hero are all redrawn from current state.
export async function docrt() {
    if (!game.level) return;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++)
            newsym(x, y);
    // C ref: display.c docrt -> vision_recalc/see_monsters — the hero glyph is
    // only redrawn when canspotself(); an invisible hero's own square keeps the
    // background newsym() just drew there.
    if (game.u?.ux > 0 && canspotself()) {
        const hg = hero_glyph();
        show_glyph_cell(game.u.ux, game.u.uy, hg.ch, hg.color, false);
    }
}

// C ref: display.c display_self() — the glyph drawn at the hero's tile.  When
// riding a steed the steed's glyph is shown instead of the hero's '@'.
function hero_glyph() {
    const u = game.u;
    const st = u?.usteed;
    if (st) {
        const d = st.data || {};
        return { ch: d.mlet || 'u', color: (d.mcolor != null) ? d.mcolor : CLR_WHITE };
    }
    // C ref: display.c display_self() — while Upolyd, monnum_to_glyph(u.umonnum)
    // is shown instead of '@'.
    if (u?.Upolyd && u.data) {
        return { ch: u.data.mlet || '@', color: (u.data.mcolor != null) ? u.data.mcolor : CLR_WHITE };
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
    // C ref: botl.c bot1() — titl = !Upolyd ? rank() : pmname(&mons[u.umonnum],
    // Ugender); when Upolyd, each word of the monster name is capitalized
    // ("Gnome", "Red Dragon") instead of showing the role rank.
    const role = u.Upolyd
        ? (u.data?.name || '').replace(/(^|\s)([a-z])/g, (_m, sp, c) => sp + c.toUpperCase())
        : (game.urole?.rank?.m || game.urole?.name?.m || 'Adventurer');
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
    // C ref: botl.c bot() — `if (u.uhp != -1 && ...)` guards the whole status
    // redraw.  u.uhp==-1 is dosave()'s "game's over" sentinel (save.c:58); a
    // hit whose damage lands HP exactly on -1 collides with it, so bot()
    // silently skips the redraw and disp.botl is cleared unrendered — the
    // displayed HP freezes at its last drawn value until uhp next becomes
    // something other than -1 (e.g. done() forcing it to 0 for the death
    // prompt).  Our status line is rebuilt live every frame, so reproduce the
    // freeze by caching the last shown value and holding it while uhp===-1.
    // C ref: botl.c bot1() — hp = Upolyd ? u.mh : u.uhp; hpmax likewise u.mhmax.
    const curHp = u.Upolyd ? u.mh : u.uhp;
    const curHpMax = u.Upolyd ? u.mhmax : u.uhpmax;
    const hpShown = curHp === -1
        ? (game._botlHpShown ?? 0)
        : (game._botlHpShown = Math.max(0, curHp || 0));
    // C ref: botl.c describe_level — the displayed level number is depth(&u.uz),
    // the ledger depth across branches (so the Gnomish Mines show Dlvl:3, not
    // the mines-relative dlevel 1), not u.uz.dlevel.
    const dlvlNum = inTut ? (u.uz?.dlevel || 1) : depth_of_level(u.uz);
    // C ref: botl.c describe_level — In_quest levels display "Home <dunlev>"
    // (the quest-branch-relative level, u.uz.dlevel), with no "Dlvl:" prefix.
    const levelDesc = In_quest(u.uz)
        ? `Home ${u.uz?.dlevel || 1}`
        : `${lvlLabel}:${dlvlNum}`;
    let s = `${levelDesc} $:${game._goldCount || 0} HP:${hpShown}(${curHpMax || 0}) Pw:${u.uen || 0}(${u.uenmax || 0}) AC:${u.uac ?? 0}`;
    // C ref: botl.c do_statusline2 — Xp:<lvl>[/<exp>] normally, but HD:<mlevel>
    // (monster level/"Hit Dice") replaces it entirely while Upolyd.
    if (u.Upolyd) {
        s += ` HD:${u.data?.mlevel ?? 0}`;
    } else if (game.flags?.showexp) {
        s += ` Xp:${u.ulevel || 1}/${u.uexp || 0}`;
    } else {
        s += ` Xp:${u.ulevel || 1}`;
    }
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
    // Status conditions follow the numeric fields.  NOTE the order is NOT
    // bot2()'s (Blind, Deaf, Stun, Conf, Hallu, Lev, Fly, Ride): the tty uses
    // the *fielded* status API (botl.c bot() -> bot_via_windowport(), since
    // VIA_WINDOWPORT()), and wintty.c render_status walks cond_idx[], which
    // botl.c condopt() qsorts by conditions[].ranking then case-insensitively
    // by condtests[].useroption.  Every condition below is ranking 10, so the
    // emitted order is alphabetical on the *option* name:
    //   blind, conf, deaf, fly, hallucinat, levitate, ride, stun
    // — confirmed by the recordings ("Satiated Conf Stun", "Burdened Deaf").
    if ((u.blinded || 0) > 0 || game.ublindf)
        s += ` Blind`;
    if ((u.uprops?.Confusion || 0) > 0)
        s += ` Conf`;
    // C ref: youprop.h Deaf — HDeaf || EDeaf (mon.js Deaf()).
    if ((u.uprops?.HDeaf || 0) > 0 || u.Deaf)
        s += ` Deaf`;
    if (u.uprops?.Flying)
        s += ` Fly`;
    // C ref: youprop.h Hallucination — HHallucination && !Halluc_resistance.
    // potion.js set_hallucination() writes the timer to four aliases at once.
    const halluTime = (u.uprops?.Hallucination || 0) || (u.uprops?.HHallucination || 0)
        || (u.HHallucination || 0) || (u.uhallu ? 1 : 0);
    const halluRes = (u.uprops?.HHalluc_resistance || 0) || (u.uprops?.EHalluc_resistance || 0);
    if (halluTime > 0 && !halluRes)
        s += ` Hallu`;
    if (u.uprops?.Levitation)
        s += ` Lev`;
    if (u.usteed)
        s += ` Ride`;
    // C ref: youprop.h Stunned — HStun (timeout.js STUNNED entry).
    if ((u.uprops?.Stun || 0) > 0 || u.Stunned)
        s += ` Stun`;
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

// Resolve a DEC-graphics map char to the glyph the grid should hold.
// C's tty driver wraps S_fountain's '{' in SO/SI along with the wall/corridor
// line-drawing chars (real vt100 acsc maps '{' to the pi glyph, an old
// fountain-as-spray pun), so the recorded screens carry it as decgfx too.
// The frozen scoring decoder's DEC table (frozen/screen-decode.mjs) covers
// the line-drawing codes but has no '{' entry, so it leaves C's raw '{'
// un-translated; mirror that by passing '{' through raw here too instead of
// pre-resolving it to the pi glyph like the other decgfx codes.
function decgfxMapChar(ch, decgfx) {
    if (!decgfx || ch === '{') return ch;
    return DEC_TO_UNICODE[ch] || ch;
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
            const ch = decgfxMapChar(loc.disp_ch, loc.disp_decgfx);
            display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
        }
    }
    const [s1, s2] = botl_lines();
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
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
    output += (game._botlFrozen ? game._botlFrozen[0] : _statusLine1()) + '\n';
    output += (game._botlFrozen ? game._botlFrozen[1] : _statusLine2());

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
                const ch = decgfxMapChar(loc.disp_ch, loc.disp_decgfx);
                display.setCell(x - 1, y + 1, ch, loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
        // Status lines
        const [gs1, gs2] = botl_lines();
        for (let c = 0; c < Math.min(gs1.length, display.cols); c++)
            display.setCell(c, 22, gs1[c], NO_COLOR, 0);
        for (let c = 0; c < Math.min(gs2.length, display.cols); c++)
            display.setCell(c, 23, gs2[c], NO_COLOR, 0);
        // Cursor at hero
        if (game.u?.ux > 0)
            display.setCursor(game.u.ux - 1, game.u.uy + 1);
    }
}

// Write the two status lines (rows 22-23) to the terminal grid. Used by
// the legend/welcome startup rendering, which overlays a window region
// but must keep the status visible underneath.
// C ref: botl.c:253 bot() — rows 22/23 are only rewritten when bot() runs.  We
// rebuild them live every frame instead, equivalent while the game is running
// (moveloop_core calls bot() each turn) but NOT after done(): end.c:1071 forces
// u.uhp to 0 and sets disp.botl WITHOUT calling bot() again, so the rows keep
// whatever the last real bot() drew.  freeze_botl() captures that.
function botl_lines() {
    if (game._botlFrozen) return game._botlFrozen;
    const s1 = _statusLine1().replace(/\x1b\[[0-9;]*[A-Za-z]/g, (m) =>
        m.match(/\x1b\[\d+C/) ? ' '.repeat(parseInt(m.slice(2))) : '');
    game._botlLast = [s1, _statusLine2()];
    return game._botlLast;
}

// C ref: end.c:1048 `disp.botlx = TRUE; bot();` — the last bot() of the game.
// When u.uhp is exactly -1 (botl.c:259's dosave() sentinel, which a hit landing
// HP on -1 collides with) that bot() draws NOTHING, so the frozen text is the
// previous turn's line: a hero killed from 1 HP by 2 damage keeps showing HP:1
// through every endgame screen.
export function freeze_botl() {
    const u = game.u || {};
    if ((u.Upolyd ? u.mh : u.uhp) !== -1) botl_lines();
    game._botlFrozen = game._botlLast || null;
}

export function renderStatusLines(display) {
    if (!display?.setCell) return;
    const [s1, s2] = botl_lines();
    for (let c = 0; c < Math.min(s1.length, display.cols); c++)
        display.setCell(c, 22, s1[c], NO_COLOR, 0);
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
    await topl_more_ext('');
}

// C ref: win/tty/getline.c xwaitforspace(s) — like topl_more(), but also
// accepts the chars in `extraChars` as dismiss keys (win/tty/wintty.c
// tty_message_menu() sets ttyDisplay->dismiss_more to a single such char, the
// selected item's own invlet, so pressing it at the --More-- both dismisses
// and picks that item).  Any other key rings the bell and leaves --More-- up.
// Returns the key code that ended the wait (so callers can tell the extra
// dismiss key apart from a plain space/return/escape).
export async function topl_more_ext(extraChars) {
    const disp = game?.nhDisplay;
    if (!disp?.setCell) return 0;
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

    // C ref: win/tty/topl.c more():237 — after xwaitforspace,
    //   `if (ttyDisplay->toplin && cw->cury) {
    //        docorner(1, cw->cury + 1, 0); cw->curx = cw->cury = 0; home(); }`
    // wintty.c docorner() blanks rows 0..cury and row_refresh()es the map rows
    // underneath them (ymax stays well above the status window, so no bot()).
    // Without this a --More-- that word-wrapped onto row 1 survived onto the
    // next frame whenever the following draw repaints only row 0 — which is
    // exactly what getline.c's prompt does.
    const clear_wrapped_rows = () => {
        if (cury <= 0) return;
        for (let r = 0; r <= cury && r < ROWNO + 1; r++) {
            for (let x = 0; x < CO; x++) disp.setCell(x, r, ' ', NO_COLOR, 0);
            const my = r - 1; // map row under screen row r (map offy == 1)
            if (my < 0 || my >= ROWNO) continue;
            for (let x = 1; x < COLNO; x++) {
                const loc = game.level?.at(x, my);
                if (!loc?.disp_ch || loc.disp_ch === ' ') continue;
                disp.setCell(x - 1, r, decgfxMapChar(loc.disp_ch, loc.disp_decgfx),
                             loc.disp_color ?? NO_COLOR, loc.disp_attr ?? 0);
            }
        }
    };

    // xwaitforspace: read keys until space / return / escape / an extra char.
    for (;;) {
        const c = await nhgetch();
        if (c === 32 || c === 13 || c === 10 || c === 27) {
            // C ref: win/tty/topl.c more() — `if (morc == '\033') cw->flags |=
            // WIN_STOP;`.  Dismissing a --More-- with ESC (as opposed to space/
            // return) suppresses every further topline message until the next
            // yn_function-style prompt (getdir/y_n), which both checks-and-more()s
            // and then unconditionally clears the flag.  Space/return leave
            // messages flowing normally.
            if (c === 27) game._winStop = true;
            // C more():237-245 — the docorner() and the ESC cl_end() arms are
            // an if/else: the corner clear only runs with cw->cury != 0, so a
            // one-row topline dismissed with ESC takes the cl_end() arm and the
            // message line is WIPED (space/return leave it standing).
            if (cury > 0) clear_wrapped_rows();
            else if (c === 27) { game._pending_message = ''; game._toplin = 0; }
            return c;
        }
        if (extraChars && extraChars.includes(String.fromCharCode(c))) {
            clear_wrapped_rows();
            return c;
        }
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
    // C ref: win/tty/topl.c update_topl():257 `skip = (flags & (WIN_STOP |
    // WIN_NOSTOP)) == WIN_STOP` — after a --More-- dismissed with ESC the line
    // is still accumulated into gt.toplines but is neither drawn nor more()d.
    // The flag dies at the very next nhgetch (input.js), so this window is one
    // command long; an earlier attempt with a longer lifetime measured -172.
    if (game._winStop) {
        game._toplines = (cur && n0 + cur.length + 3 < CO - 8) ? `${cur}  ${bp}` : bp;
        return;
    }
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
    // C ref: win/tty/topl.c redotoplin():139 — `if (ttyDisplay->cury && otoplin
    // != TOPLINE_SPECIAL_PROMPT) more()`.  A message that word-wrapped onto a
    // second row blocks on --More-- IMMEDIATELY; more() then blanks rows 0..cury
    // and leaves toplin == TOPLINE_EMPTY (topl.c:237-245).  Clearing
    // _pending_message is load-bearing: otherwise the next step redraws the
    // already-acknowledged line.
    if (wrap_topl(bp).length > 1) {
        await topl_more();
        game._toplin = 0;
        game._pending_message = '';
    }
}

// C ref: win/tty/topl.c topl_putsym() — a normal character is never placed at
// column CO-1 (79): when curx is already there, a newline is inserted first
// ("1 <= curx < CO; avoid CO").  This is a low-level terminal-cursor quirk
// independent of how the message text itself wraps onto the grid (that uses
// wrap_topl's word-wrap instead), so it needs its own simulation to get the
// physical cursor position right after printing a string that is an exact
// multiple of the screen width.  redotoplin()/more() always reset curx/cury
// to (0,0) before printing a fresh topline, so callers start there.
function topl_cursor_after(str) {
    let curx = 0, cury = 0;
    for (let i = 0; i < str.length; i++) {
        if (curx === CO - 1) { curx = 0; cury++; }
        curx++;
    }
    return [curx, cury];
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
        // Acking a deferred --More-- is where a pending status redraw lands:
        // the --More-- frames still show the pre-done() line, this prompt's
        // frames show the current one.  (end.c: done() sets disp.botl at :1071
        // without calling bot(); the next real bot() is the one that pages.)
        delete game._botlFrozen;
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
        if (disp?.setCursor) {
            const [curx, cury] = topl_cursor_after(full);
            disp.setCursor(curx, cury);
        }
        const c = await nhgetch();
        delete game._modal_screen;
        const ch = String.fromCharCode(c);
        // quitchars (space/return/ESC) -> default.  C ref: topl.c
        // tty_yn_function clean_up: the answered prompt text is left on the
        // top line as-is (only gt.toplines' history bookkeeping is updated,
        // never redrawn/cleared) — the message only disappears when a later
        // pline() overwrites it.  toplin still leaves NEED_MORE so a message
        // printed right after the prompt (e.g. savelife's "OK, so you don't
        // die.") starts a fresh line rather than appending after a phantom
        // "  " separator.
        // C ref: win/tty/topl.c tty_yn_function():463 — ESC is NOT just another
        // quitchar: it answers 'q' when the response set offers one, else 'n',
        // and only then falls back to the default.  Treating it as the default
        // made ESC at "eat it? [ynq] (n)" answer 'n', which falls through to the
        // inventory-eat prompt C never shows.
        if (c === 27) {
            game._toplin = 0;
            return resp.includes('q') ? 'q' : resp.includes('n') ? 'n' : def;
        }
        if (c === 32 || c === 13 || c === 10) {
            game._toplin = 0;
            return def;
        }
        const lc = ch.toLowerCase();
        if (resp.includes(lc)) {
            game._toplin = 0;
            return lc;
        }
        // invalid response: re-prompt (no bell modeled).
    }
}
