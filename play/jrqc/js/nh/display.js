/* NetHack 5.0	display.c	$NHDT-Date: 1777000050 2026/04/23 19:07:30 $  $NHDT-Branch: NetHack-3.7 $:$NHDT-Revision: 1.263 $ */
/* Copyright (c) Dean Luick, with acknowledgements to Kevin Darcy */
/* and Dave Cohrs, 1990.                                          */
/* NetHack may be freely redistributed.  See license for details. */
/*
 *                      THE NEW DISPLAY CODE
 *
 * The old display code has been broken up into three parts: vision, display,
 * and drawing.  Vision decides what locations can and cannot be physically
 * seen by the hero.  Display decides _what_ is displayed at a given location.
 * Drawing decides _how_ to draw a monster, fountain, sword, etc.
 *
 * The display system uses information from the vision system to decide
 * what to draw at a given location.  The routines for the vision system
 * can be found in vision.c and vision.h.  The routines for display can
 * be found in this file (display.c) and display.h.  The drawing routines
 * are part of the window port.  See doc/window.txt for the drawing
 * interface.
 *
 * The display system deals with an abstraction called a glyph.  Anything
 * that could possibly be displayed has a unique glyph identifier.
 *
 * What is seen on the screen is a combination of what the hero remembers
 * and what the hero currently sees.  Objects and dungeon features (walls
 * doors, etc) are remembered when out of sight.  Monsters and temporary
 * effects are not remembered.  Each location on the level has an
 * associated glyph.  This is the hero's _memory_ of what he or she has
 * seen there before.
 *
 * Display rules:
 *
 *      If the location is in sight, display in order:
 *              visible (or sensed) monsters
 *              visible objects
 *              known traps
 *              background
 *
 *      If the location is out of sight, display in order:
 *              sensed monsters (via telepathy or persistent detection)
 *              warning (partly-sensed monster shown as an abstraction)
 *              memory
 *
 *      "Remembered, unseen monster" is handled like an object rather
 *      than a monster, and stays displayed whether or not it is in sight.
 *      It is removed when a visible or sensed or warned-of monster gets
 *      shown at its location or when searching or fighting reveals that
 *      no monster is there.
 *
 *
 * Here is a list of the major routines in this file to be used externally:
 *
 * newsym
 *
 * Possibly update the screen location (x,y).  This is the workhorse routine.
 * It is always correct --- where correct means following the in-sight/out-
 * of-sight rules.  **Most of the code should use this routine.**  This
 * routine updates the map and displays monsters.
 *
 *
 * map_background
 * map_object
 * map_trap or map_engraving
 * map_invisible
 * unmap_object
 *
 * If you absolutely must override the in-sight/out-of-sight rules, there
 * are two possibilities.  First, you can mess with vision to force the
 * location in sight then use newsym(), or you can  use the map_* routines.
 * The first has not been tried [no need] and the second is used in the
 * detect routines --- detect object, magic mapping, etc.  The map_*
 * routines *change* what the hero remembers.  All changes made by these
 * routines will be sticky --- they will survive screen redraws.  Do *not*
 * use these for things that only temporarily change the screen.  These
 * routines are also used directly by newsym().  unmap_object is used to
 * clear a remembered object when/if detection reveals it isn't there.
 *
 *
 * show_glyph
 *
 * This is direct (no processing in between) buffered access to the screen.
 * Temporary screen effects are run through this and its companion,
 * flush_screen().  There is yet a lower level routine, print_glyph(),
 * but this is unbuffered and graphic dependent (i.e. it must be surrounded
 * by graphic set-up and tear-down routines).  Do not use print_glyph().
 *
 *
 * see_monsters
 * see_objects
 * see_traps
 *
 * These are only used when something affects all of the monsters or
 * objects or traps.  For objects and traps, the only thing is hallucination.
 * For monsters, there are hallucination and changing from/to blindness, etc.
 *
 *
 * tmp_at
 *
 * This is a useful interface for displaying temporary items on the screen.
 * Its interface is different than previously, so look at it carefully.
 *
 *
 *
 * Parts of the rm structure that are used:
 *
 *      typ     - What is really there.
 *      glyph   - What the hero remembers.  This will never be a monster.
 *                Monsters "float" above this.
 *      lit     - True if the position is lit.  An optimization for
 *                lit/unlit rooms.
 *      waslit  - True if the position was *remembered* as lit.
 *      seenv   - A vector of bits representing the directions from which the
 *                hero has seen this position.  The vector's primary use is
 *                determining how walls are seen.  E.g. a wall sometimes looks
 *                like stone on one side, but is seen as wall from the other.
 *                Other uses are for unmapping detected objects and felt
 *                locations, where we need to know if the hero has ever
 *                seen the location.
 *      flags   - Additional information for the typ field.  Different for
 *                each typ.
 *      horizontal - Indicates whether the wall or door is horizontal or
 *                vertical.
 */
// tools/recorder-env/build/nethack-c/recorder/src/display.c: generated by transpiler/emit from the C source. Do not edit.
import * as $c from '../crt/index.js';
import { $C } from '../crt/index.js';
import * as $T from './types.js';
import { $G } from './globals.js';
import { AM } from './align.h.js';
import { alloc } from './alloc.js';
import { Sting_effects } from './artifact.js';
import { bot, timebot } from './botl.js';
import { isok } from './cmd.js';
import { CLR, NO_COLOR } from './color.h.js';
import { is_ice, is_pool, is_pool_or_lava } from './dbridge.js';
import { a11y, cg, disp, flags, gc, gd, gf, gg, gi, go, gs, gu, gv, gw, iflags, program_state, shield_static, svc, svd, svl, svm, u } from './decl.js';
import { COIN_CLASS, FOOD_CLASS, POTION_CLASS, S } from './defsym.h.js';
import { BACKTRACK, DISP_ALL, DISP_ALWAYS, DISP_BEAM, DISP_CHANGE, DISP_END, DISP_FLASH, DISP_FREEMEM, DISP_TETHER, GLYPH, GLYPH_INVISIBLE, GLYPH_NOTHING, GLYPH_UNEXPLORED, MAX_GLYPH, MG, MG_BW_LAVA, MG_BW_SINK, NO_GLYPH, NUM_ZAP, SHIELD_COUNT, altar_chaotic, altar_color_chaotic, altar_color_lawful, altar_color_neutral, altar_color_other, altar_color_unaligned, altar_lawful, altar_neutral, altar_other, altar_unaligned, docrtMapOnly, docrtNocls, docrtRecalc, docrtRefresh, expl_dark, expl_fiery, expl_frosty, expl_magical, expl_muddy, expl_noxious, expl_wet, explode_color_dark, explode_color_fiery, explode_color_frosty, explode_color_magical, explode_color_muddy, explode_color_noxious, explode_color_wet, gehennom_walls, gm_levelchange, knox_walls, main_walls, mines_walls, sokoban_walls, zap_color_acid, zap_color_death, zap_color_fire, zap_color_frost, zap_color_lightning, zap_color_missile, zap_color_poison_gas, zap_color_sleep } from './display.h.js';
import { _knowninvisible, _mon_visible, _mon_warning, canspotself, cmap_to_glyph, display_self, glyph_is_cmap, glyph_is_generic_object, glyph_is_invisible, glyph_is_monster, glyph_is_normal_generic_obj, glyph_is_nothing, glyph_is_pet, glyph_is_piletop_generic_obj, glyph_is_trap, glyph_is_unexplored, glyph_to_mon, monnum_to_glyph, objnum_to_glyph, warning_to_glyph } from './display.macros.js';
import { def_warnsyms, defsyms } from './drawing.js';
import { In_hell, In_mines, on_level, update_lastseentyp } from './dungeon.js';
import { Is_rogue_level, Is_waterlevel } from './dungeon.macros.js';
import { panic } from './end.js';
import { can_reach_floor, engr_at, engr_can_be_felt } from './engrave.js';
import { spot_shows_engravings } from './engrave.macros.js';
import { mapxy_valid } from './getpos.js';
import { COLNO, FALSE, ROWNO, TRUE } from './global.h.js';
import { glyph_to_cmap } from './glyphs.js';
import { CORPSTAT, ECMD, SYM_OFF_M, SYM_OFF_O, SYM_OFF_P, SYM_OFF_W, SYM_OFF_X } from './hack.h.js';
import { MATCH_WARN_OF_MON, distu } from './hack.macros.js';
import { dist2, sgn } from './hacklib.js';
import { sobj_at, update_inventory } from './invent.js';
import { nhUse } from './lint.macros.js';
import { has_mcorpsenm } from './mextra.macros.js';
import { cmap_to_type } from './mkroom.js';
import { iter_mons } from './mon.js';
import { FEMALE, M1, M3, MALE } from './monflag.h.js';
import { mons } from './monst.js';
import { MON, M_AP } from './monst.h.js';
import { DEADMONSTER, M_AP_TYPE, is_lightblocker_mappear } from './monst.macros.js';
import { PM } from './monsters.h.js';
import { observe_object } from './o_init.js';
import { OBJ } from './obj.h.js';
import { NUM_OBJECTS } from './objclass.h.js';
import { objects } from './objects.js';
import { BOULDER, CORPSE, FIRST_OBJECT, FIRST_REAL_GEM, FIRST_SPELL, LAST_GLASS_GEM, LAST_SPELL, STATUE } from './objects.h.js';
import { do_screen_description } from './pager.js';
import { NUMMONS } from './permonst.h.js';
import { impossible, pline_xy } from './pline.js';
import { BLINDED, CONFUSION, DETECT_MONSTERS, HALLUC, HALLUC_RES, INFRAVISION, SEE_INVIS, STUNNED, TELEPAT, WARNING, WARN_OF_MON } from './prop.h.js';
import { show_region, visible_region_at } from './region.js';
import { AIR, ALTAR, BLCORNER, BRCORNER, CLOUD, CORR, CROSSWALL, D, DB, DBWALL, DOOR, DRAWBRIDGE_DOWN, DRAWBRIDGE_UP, FOUNTAIN, GRAVE, HWALL, ICE, IRONBARS, LA, LADDER, LAVAPOOL, LAVAWALL, MOAT, POOL, ROOM, SCORR, SDOOR, SINK, STAIRS, STONE, SV0, SV1, SV2, SV3, SV4, SV5, SV6, SV7, TDWALL, THRONE, TLCORNER, TLWALL, TRCORNER, TREE, TRWALL, TUWALL, VWALL, WATER, WM, WM_MASK } from './rm.h.js';
import { ACCESSIBLE, IS_DOOR, IS_OBSTRUCTED, IS_POOL, IS_ROOM, IS_SDOOR, IS_STWALL, m_at } from './rm.macros.js';
import { rn2_on_display_rng } from './rnd.js';
import { known_branch_stairs, stairway_at } from './stairs.js';
import { H_IBM, MAXTCHARS, ROGUESET, SYM, WARNCOUNT } from './sym.h.js';
import { DARKROOMSYM, is_cmap_furniture, is_cmap_room, is_cmap_wall } from './sym.macros.js';
import { sysopt } from './sys.js';
import { t_at } from './trap.js';
import { BEAR_TRAP, NO_TRAP, WEB } from './trap.h.js';
import { is_pit } from './trap.macros.js';
import { block_point, unblock_point, vision_recalc } from './vision.js';
import { COULD_SEE, IN_SIGHT } from './vision.h.js';
import { cansee } from './vision.macros.js';
import { has_color } from './windows.js';
import { clear_nhwindow, curs, display_nhwindow, nh_delay_output, print_glyph } from './winprocs.macros.js';
import { see_wsegs, worm_known } from './worm.js';
import { BC } from './you.h.js';
import { Upolyd, next2u, u_at } from './you.macros.js';
import { Blind, Detect_monsters, Hallucination, Protection_from_shape_changers, Punished, See_invisible, Underwater, Warn_of_mon } from './youprop.macros.js';

const DETECTED = 2;
const PHYSICALLY_SEEN = 1;
const TMP_AT_MAX_GLYPHS = 160;
const GMAP_SET = 0x0001;
const GMAP_ROGUELEVEL = 0x0002;
const T_d = 0;
const T_l = 1;
const T_u = 2;
const T_r = 3;
const T_stone = 0;
const T_tlcorn = 1;
const T_trcorn = 2;
const T_hwall = 3;
const T_tdwall = 4;
const C_bl = 0;
const C_tl = 1;
const C_tr = 2;
const C_br = 3;
const C_trcorn = 0;
const C_brcorn = 1;
const C_blcorn = 2;
const C_tlwall = 3;
const C_tuwall = 4;
const C_crwall = 5;

let tmp_at$tglyph = null;   // static in tmp_at()
let swallowed$lastx = 0;   // static in swallowed()
let swallowed$lasty = 0;   // static in swallowed()
let under_water$lastx = 0;   // static in under_water()
let under_water$lasty = 0;   // static in under_water()
let under_water$dela = 0;   // static in under_water()
let under_ground$dela = 0;   // static in under_ground()
let cls$in_cls = 0;   // static in cls()
let flush_screen$flushing = 0;   // static in flush_screen()
let flush_screen$delay_flushing = 0;   // static in flush_screen()
const t_warn$warn_str = new Int8Array(38);   // static in t_warn()
/*
 * tmp_at()
 *
 * Temporarily place glyphs on the screen.  Do not call nh_delay_output().  It
 * is up to the caller to decide if it wants to wait [presently, everyone
 * but explode() wants to delay].
 *
 * Call:
 *      (DISP_BEAM,    glyph)   open, initialize glyph
 *      (DISP_FLASH,   glyph)   open, initialize glyph
 *      (DISP_ALWAYS,  glyph)   open, initialize glyph
 *      (DISP_CHANGE,  glyph)   change glyph
 *      (DISP_END,     0)       close & clean up (2nd argument doesn't matter)
 *      (DISP_FREEMEM, 0)       only used to prevent memory leak during exit)
 *      (x, y)                  display the glyph at the location
 *
 * DISP_BEAM   - Display the given glyph at each location, but do not erase
 *               any until the close call.
 * DISP_ALL    - Same as DISP_BEAM except glyph is shown at the specified
 *               spot even when that spot can't be seen.
 * DISP_TETHER - Display a tether glyph at each location, and the tethered
 *               object at the farthest location, but do not erase any
 *               until the return trip or close.
 * DISP_FLASH  - Display the given glyph at each location, but erase the
 *               previous location's glyph.
 * DISP_ALWAYS - Like DISP_FLASH, but vision is not taken into account.
 */
const tgfirst = new $T.tmp_glyph();
/*  glyph, ttychar, framecolor,
    { glyphflags, { NO_COLOR, sym.symidx },
    customcolor, color256idx, tileidx, u } */
const no_ginfo = new $T.glyphinfo();
/* Note that the 'glyph' argument is not used in the expansion
 * of this !UNBUFFERED_GLYPHINFO (default) variation, but is
 * a requirement for the UNBUFFERED_GLYPHINFO variation */
/* tile.c */
/* glyph, ttychar, framecolor, { glyphflags, { sym.symidx }, nhcolor,
                     tileidx, 0} */
export const nul_glyphinfo = new $T.glyphinfo();
/* from tile.c */
export const glyphmap = $c.recArray($T.glyph_map_entry, 9624);
/*
 * Reset the changed glyph borders so that none of the 3rd screen has
 * changed.
 */
const nul_gbuf = new $T.gbuf_entry();
/*
 *  This must be the same order as used for buzz() in zap.c.
 *  The zap_color_ and altar_color_ enums are in decl.h.
 */
export const zapcolors = new Int32Array(8);
export const altarcolors = new Int32Array(5);
export const explodecolors = new Int32Array(7);
/* main_walls, mines_walls, gehennom_walls, knox_walls, sokoban_walls */
export const wallcolors = new Int32Array(5);
/* ------------------------------------------------------------------------ */
/* This matrix is used here and in vision.c. */
export const seenv_matrix = $c.matrix(Uint8Array, [3, 3]);
/* ------------------------------------------------------------------------ */
/* T wall types, one for each row in wall_matrix[][]. */
/*
 * These are the column names of wall_matrix[][].  They are the "results"
 * of a tdwall pattern match.  All T walls are rotated so they become
 * a tdwall.  Then we do a single pattern match, but return the
 * correct result for the original wall by using different rows for
 * each of the wall types.
 */
const wall_matrix = $c.matrix(Int32Array, [4, 5]);
/* Cross wall types, one for each "solid" quarter.  Rows of cross_matrix[][].
 */
/*
 * These are the column names for cross_matrix[][].  They express results
 * in C_br (bottom right) terms.  All crosswalls with a single solid
 * quarter are rotated so the solid section is at the bottom right.
 * We pattern match on that, but return the correct result depending
 * on which row we're looking at.
 */
const cross_matrix = $c.matrix(Int32Array, [4, 6]);
/*
 *      See display.h for descriptions of tp_sensemon() through
 *      is_safemon().  Some of these were generating an awful lot of
 *      code "behind the curtain", particularly canspotmon() (which is
 *      still a macro but one that now expands to a pair of function
 *      calls rather than to a ton of special case checks).  Return
 *      values are all int 0 or 1, not boolean.
 *
 *      They're still implemented as macros within this file.
 */
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function tp_sensemon(mon) {   // display.c:166
    return !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) ? 1 : 0;
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function sensemon(mon) {   // display.c:173
    return (!u.uswallow || mon === u.ustuck) && (!u.uinwater || dist2(mon.mx, mon.my, u.ux, u.uy) <= 2 && is_pool(mon.mx, mon.my)) && (u.uprops[DETECT_MONSTERS].intrinsic || u.uprops[DETECT_MONSTERS].extrinsic || !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || (u.uprops[WARN_OF_MON].intrinsic || u.uprops[WARN_OF_MON].extrinsic) && ($c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0 || $c.andu64(svc.context.warntype.polyd, mon.data.mflags2) !== 0 || svc.context.warntype.species && svc.context.warntype.species === mon.data)) ? 1 : 0;
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function mon_warning(mon) {   // display.c:180
    return _mon_warning(mon);
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function mon_visible(mon) {   // display.c:187
    return _mon_visible(mon);
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function see_with_infrared(mon) {   // display.c:194
    return !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (u.uprops[INFRAVISION].intrinsic || u.uprops[INFRAVISION].extrinsic) && mon.data.mflags3 & M3.INFRAVISIBLE && (gv.viz_array.get(mon.my).get(mon.mx) & COULD_SEE) !== 0 ? 1 : 0;
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function canseemon(mon) {   // display.c:201
    return (mon.wormno ? worm_known(mon) : (gv.viz_array.get(mon.my).get(mon.mx) & IN_SIGHT) !== 0 || !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (u.uprops[INFRAVISION].intrinsic || u.uprops[INFRAVISION].extrinsic) && mon.data.mflags3 & M3.INFRAVISIBLE && (gv.viz_array.get(mon.my).get(mon.mx) & COULD_SEE) !== 0) && ((!mon.minvis || (u.uprops[SEE_INVIS].intrinsic || u.uprops[SEE_INVIS].extrinsic)) && !mon.mundetected) ? 1 : 0;
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function knowninvisible(mon) {   // display.c:208
    return _knowninvisible(mon);
}
/* #define knowninvisible() isn't useful here */
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function is_safemon(mon) {   // display.c:215
    return flags.safe_dog && mon.mpeaceful && ((mon.wormno ? worm_known(mon) : (gv.viz_array.get(mon.my).get(mon.mx) & IN_SIGHT) !== 0 || !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (u.uprops[INFRAVISION].intrinsic || u.uprops[INFRAVISION].extrinsic) && mon.data.mflags3 & M3.INFRAVISIBLE && (gv.viz_array.get(mon.my).get(mon.mx) & COULD_SEE) !== 0) && ((!mon.minvis || (u.uprops[SEE_INVIS].intrinsic || u.uprops[SEE_INVIS].extrinsic)) && !mon.mundetected) || (!u.uswallow || mon === u.ustuck) && (!u.uinwater || dist2(mon.mx, mon.my, u.ux, u.uy) <= 2 && is_pool(mon.mx, mon.my)) && (u.uprops[DETECT_MONSTERS].intrinsic || u.uprops[DETECT_MONSTERS].extrinsic || !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || (u.uprops[WARN_OF_MON].intrinsic || u.uprops[WARN_OF_MON].extrinsic) && ($c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0 || $c.andu64(svc.context.warntype.polyd, mon.data.mflags2) !== 0 || svc.context.warntype.species && svc.context.warntype.species === mon.data))) && !u.uprops[CONFUSION].intrinsic && !(u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic)) && !u.uprops[STUNNED].intrinsic ? 1 : 0;
}
/* #define is_safemon() isn't useful here */
/*
 *      End of former macro-only vision related (mostly) routines
 *      converted to functions.
 */
/*
 * magic_map_background()
 *
 * This function is similar to map_background (see below) except we pay
 * attention to and correct unexplored, lit ROOM and CORR spots.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function magic_map_background(x, y, show) {   // display.c:233
    let glyph = await back_to_glyph(x, y);   /* assumes hero can see x,y */
    const lev = $c.relem(svl.level.locations[x], y);
    /*
     * Correct for out of sight lit corridors and rooms that the hero
     * doesn't remember as lit.
     */
    if (!cansee(x, y) && !lev.waslit) {
        /* Floor spaces are dark if unlit.  Corridors are dark if unlit. */
        if (lev.typ === ROOM && glyph === cmap_to_glyph(S.room)) {
            glyph = flags.dark_room && iflags.wc_color
                ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) === S.stone ? GLYPH.CMAP_STONE_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) <= S.trwall ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.vwall + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) < S.altar ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.ndoor + GLYPH.CMAP_A_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) === S.altar ? 4008 : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) < S.arrow_trap + MAXTCHARS ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.grave + GLYPH.CMAP_B_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) <= S.goodpos ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.digbeam + GLYPH.CMAP_C_OFF : NO_GLYPH
                : GLYPH_NOTHING;
        } else if (lev.typ === CORR && glyph === cmap_to_glyph(S.litcorr)) {
            glyph = cmap_to_glyph(S.corr);
        }
    }
    if (svl.level.flags.hero_memory
        && (glyph_is_unexplored(lev.glyph) || glyph_is_cmap(lev.glyph))) {
        lev.glyph = glyph;
    }
    if (show) {
        await show_glyph(x, y, glyph);
    }
    update_lastseentyp(x, y);
}
/*
 * The routines map_background(), map_object(), and map_trap() could just
 * as easily be:
 *
 *      map_glyph(x,y,glyph,show)
 *
 * Which is called with the xx_to_glyph() in the call.  Then I can get
 * rid of 3 routines that don't do very much anyway.  And then stop
 * having to create fake objects and traps.  However, I am reluctant to
 * make this change.
 */
/*
 * map_background()
 *
 * Make the real background part of our map.  This routine assumes that
 * the hero can physically see the location.  Update the screen if directed.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function map_background(x, y, show) {   // display.c:279
    const glyph = await back_to_glyph(x, y);
    if (svl.level.flags.hero_memory) {
        svl.level.locations[x][y].glyph = glyph;
    }
    if (show) {
        await show_glyph(x, y, glyph);
    }
}
/*
 * map_trap()
 *
 * Map the trap and print it out if directed.  This routine assumes that the
 * hero can physically see the location.
 */
/**
 * @param {$T.trap | null} trap struct trap *
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function map_trap(trap, show) {   // display.c:296
    const x = trap.tx;
    const y = trap.ty;
    const glyph = S.arrow_trap + trap.ttyp - 1 === S.stone ? GLYPH.CMAP_STONE_OFF : S.arrow_trap + trap.ttyp - 1 <= S.trwall ? S.arrow_trap + trap.ttyp - 1 - S.vwall + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) : S.arrow_trap + trap.ttyp - 1 < S.altar ? S.arrow_trap + trap.ttyp - 1 - S.ndoor + GLYPH.CMAP_A_OFF : S.arrow_trap + trap.ttyp - 1 === S.altar ? 4008 : S.arrow_trap + trap.ttyp - 1 < S.arrow_trap + MAXTCHARS ? S.arrow_trap + trap.ttyp - 1 - S.grave + GLYPH.CMAP_B_OFF : S.arrow_trap + trap.ttyp - 1 <= S.goodpos ? S.arrow_trap + trap.ttyp - 1 - S.digbeam + GLYPH.CMAP_C_OFF : NO_GLYPH;
    if (svl.level.flags.hero_memory) {
        svl.level.locations[x][y].glyph = glyph;
    }
    if (show) {
        await show_glyph(x, y, glyph);
    }
}
/*
 * map_engraving()
 *
 * Map the engraving and print it out if directed.
 */
/**
 * @param {$T.engr | null} ep struct engr *
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function map_engraving(ep, show) {   // display.c:313
    const x = ep.engr_x;
    const y = ep.engr_y;
    const glyph = (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) === S.stone ? GLYPH.CMAP_STONE_OFF : (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) <= S.trwall ? (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) - S.vwall + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) : (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) < S.altar ? (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) - S.ndoor + GLYPH.CMAP_A_OFF : (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) === S.altar ? 4008 : (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) < S.arrow_trap + MAXTCHARS ? (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) - S.grave + GLYPH.CMAP_B_OFF : (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) <= S.goodpos ? (svl.level.locations[ep.engr_x][ep.engr_y].typ === CORR ? S.engrcorr : S.engroom) - S.digbeam + GLYPH.CMAP_C_OFF : NO_GLYPH;
    if (svl.level.flags.hero_memory) {
        svl.level.locations[x][y].glyph = glyph;
    }
    if (show) {
        await show_glyph(x, y, glyph);
    }
}
/*
 * map_object()
 *
 * Map the given object.  This routine assumes that the hero can physically
 * see the location of the object.  Update the screen if directed.
 * [Note: feel_location() -> map_location() -> map_object() contradicts
 * the claim here that the hero can see obj's <ox,oy>.]
 */
/**
 * @param {$T.obj | null} obj struct obj *
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function map_object(obj, show) {   // display.c:333
    let $t1, $t2, $t3, $t4;
    const x = obj.ox;
    const y = obj.oy;
    let glyph = obj.otyp === STATUE ? u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) + (!rn2_on_display_rng(2) ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0 : obj.corpsenm + ((obj.spe & CORPSTAT.GENDER) === CORPSTAT.FEMALE ? obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.STATUE_FEM_PILETOP_OFF : GLYPH.STATUE_FEM_OFF : obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.STATUE_MALE_PILETOP_OFF : GLYPH.STATUE_MALE_OFF) | 0 : u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? ($t1 = await rn2_on_display_rng(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT | 0, go.otg_temp = $t1) === CORPSE ? await rn2_on_display_rng(NUMMONS) + GLYPH.BODY_OFF | 0 : go.otg_temp + GLYPH.OBJ_OFF | 0 : obj.otyp === CORPSE ? obj.corpsenm + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.BODY_PILETOP_OFF : GLYPH.BODY_OFF) | 0 : !obj.dknown && (obj.oclass === POTION_CLASS || obj.otyp >= FIRST_REAL_GEM && obj.otyp <= LAST_GLASS_GEM || obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL) ? obj.oclass + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.OBJ_PILETOP_OFF : GLYPH.OBJ_OFF) : obj.otyp + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.OBJ_PILETOP_OFF : GLYPH.OBJ_OFF);
    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if (glyph_is_generic_object(glyph) && cansee(x, y) && !Hallucination()) {
        /* these 'r' and 'neardist' calculations match distant_name(objnam.c)
           and see_nearby_objects(below); we assume that this is a lone
           object or a pile-top, not something below the top of a pile */
        /* neardist produces a small square with rounded corners */
        const r = u.xray_range > 2 ? u.xray_range : 2;
        const neardist = Math.imul(Math.imul(r, r), 2) - r | 0;   /* same as r*r + r*(r-1) */
        if (distu(x, y) <= neardist) {
            await observe_object(obj);
            glyph = obj.otyp === STATUE ? u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) + (!rn2_on_display_rng(2) ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0 : obj.corpsenm + ((obj.spe & CORPSTAT.GENDER) === CORPSTAT.FEMALE ? obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.STATUE_FEM_PILETOP_OFF : GLYPH.STATUE_FEM_OFF : obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.STATUE_MALE_PILETOP_OFF : GLYPH.STATUE_MALE_OFF) | 0 : u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? ($t2 = await rn2_on_display_rng(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT | 0, go.otg_temp = $t2) === CORPSE ? await rn2_on_display_rng(NUMMONS) + GLYPH.BODY_OFF | 0 : go.otg_temp + GLYPH.OBJ_OFF | 0 : obj.otyp === CORPSE ? obj.corpsenm + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.BODY_PILETOP_OFF : GLYPH.BODY_OFF) | 0 : !obj.dknown && (obj.oclass === POTION_CLASS || obj.otyp >= FIRST_REAL_GEM && obj.otyp <= LAST_GLASS_GEM || obj.otyp >= FIRST_SPELL && obj.otyp <= LAST_SPELL) ? obj.oclass + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.OBJ_PILETOP_OFF : GLYPH.OBJ_OFF) : obj.otyp + (obj.where === OBJ.FLOOR && (go.otg_otmp = svl.level.objects[obj.ox][obj.oy].v.v_nexthere) !== null && (obj.otyp !== BOULDER || go.otg_otmp.otyp === BOULDER) ? GLYPH.OBJ_PILETOP_OFF : GLYPH.OBJ_OFF);
        }
    }
    if (svl.level.flags.hero_memory) {
        /* MRKR: While hallucinating, statues are seen as random monsters */
        /*       but remembered as random objects.                        */
        if (Hallucination() && obj.otyp === STATUE) {
            $t4 = ($t3 = await rn2_on_display_rng(NUM_OBJECTS - FIRST_OBJECT) + FIRST_OBJECT | 0, go.otg_temp = $t3) === CORPSE ? await rn2_on_display_rng(NUMMONS) + GLYPH.BODY_OFF | 0 : go.otg_temp + GLYPH.OBJ_OFF | 0, svl.level.locations[x][y].glyph = $t4;
        } else {
            svl.level.locations[x][y].glyph = glyph;
        }
    }
    if (show) {
        await show_glyph(x, y, glyph);
    }
}
/*
 * map_invisible()
 *
 * Make the hero remember that a square contains an invisible monster.
 * This is a special case in that the square will continue to be displayed
 * this way even when the hero is close enough to see it.  To get rid of
 * this and display the square's actual contents, use unmap_object() followed
 * by newsym() if necessary.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function map_invisible(x, y) {   // display.c:378
    if (x !== u.ux || y !== u.uy) {
        /* don't display I at hero's location */
        if (svl.level.flags.hero_memory) {
            svl.level.locations[x][y].glyph = GLYPH_INVISIBLE;
        }
        await show_glyph(x, y, GLYPH_INVISIBLE);
    }
}
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<number>} boolean
 */
export async function unmap_invisible(x, y) {   // display.c:388
    if (isok(x, y) && svl.level.locations[x][y].glyph === GLYPH_INVISIBLE) {
        await unmap_object(x, y);
        await newsym(x, y);
        return TRUE;
    }
    return FALSE;
}
/*
 * unmap_object()
 *
 * Remove something from the map when the hero realizes it's not there
 * anymore.  Replace it with background or known trap, but not with
 * any other remembered object.  If this is used for detection, a full
 * screen update is imminent anyway; if this is used to get rid of an
 * invisible monster notation, we might have to call newsym().
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function unmap_object(x, y) {   // display.c:409
    let trap = null, ep = null, $t1, $t2;
    if (!svl.level.flags.hero_memory) {
        return;
    }
    if ((trap = t_at(x, y)) !== null && trap.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
        await map_trap(trap, 0);
    } else if (svl.level.locations[x][y].seenv) {
        const lev = $c.relem(svl.level.locations[x], y);
        if (spot_shows_engravings(x, y)
            && (ep = engr_at(x, y)) !== null && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
            if (cansee(x, y)) {
                ep.erevealed = 1;
            }
            await map_engraving(ep, 0);
        } else {
            await map_background(x, y, 0);
        }
        /* turn remembered dark room squares dark */
        if (!lev.waslit && lev.glyph === cmap_to_glyph(S.room)
            && lev.typ === ROOM) {
            $t1 = cmap_to_glyph(S.stone), lev.glyph = $t1;
        }
    } else {
        $t2 = cmap_to_glyph(S.stone), svl.level.locations[x][y].glyph = $t2;   /* default val */
    }
}
/*
 * map_location()
 *
 * Make whatever at this location show up.  This is only for non-living
 * things.  This will not handle feeling invisible objects correctly.
 *
 * Internal to display.c, this is a #define for speed.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} show int
 * @returns {Promise<void>}
 */
export async function map_location(x, y, show) {   // display.c:475
    let obj = null, trap = null, ml_ep = null, _ml_reg = null;
    do {
        if ((obj = svl.level.objects[x][y]) && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
            await map_object(obj, show);
        } else if ((trap = t_at(x, y)) && trap.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
            await map_trap(trap, show);
        } else if ((svl.level.locations[x][y].typ === CORR || svl.level.locations[x][y].typ === ICE || svl.level.locations[x][y].typ === ROOM) && (ml_ep = engr_at(x, y)) !== null && ml_ep.erevealed && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
            await map_engraving(ml_ep, show);
        } else {
            await map_background(x, y, show);
        }
        update_lastseentyp(x, y);
        if (show && !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (_ml_reg = visible_region_at(x, y)) !== null) {
            await show_region(_ml_reg, x, y);
        }
    } while (0);
}
/* display something on monster layer; may need to fixup object layer */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} monglyph int
 * @returns {Promise<void>}
 */
async function show_mon_or_warn(x, y, monglyph) {   // display.c:482
    let o = null;
    /* "remembered, unseen monster" is tracked by object layer so if we're
       putting something on monster layer at same spot, stop remembering
       that; if an object is in view there, start remembering it instead */
    if (svl.level.locations[x][y].glyph === GLYPH_INVISIBLE) {
        await unmap_object(x, y);
        if (cansee(x, y) && (o = svl.level.objects[x][y]) !== null) {
            await map_object(o, FALSE);
        }
    }
    await show_glyph(x, y, monglyph);
}
/*
 * display_monster()
 *
 * Note that this is *not* a map_XXXX() function!  Monsters sort of float
 * above everything.
 *
 * Yuck.  Display body parts by recognizing that the display position is
 * not the same as the monster position.  Currently the only body part is
 * a worm tail.
 *
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {$T.monst | null} mon struct monst *
 * @param {number} sightflags int
 * @param {number} worm_tail boolean
 * @returns {Promise<void>}
 */
async function display_monster(x, y, mon, sightflags, worm_tail) {   // display.c:514
    let obj = new $T.obj(), num = 0, $t1;
    /* display position */
    /* monster to display */
    /* 1 if the monster is physically seen;
     * 2 if detected using Detect_monsters */
    /* mon is actually a worm tail */
    const mon_mimic = M_AP_TYPE(mon) !== M_AP.NOTHING ? 1 : 0;
    const sensed = mon_mimic && (Protection_from_shape_changers()
        || (!u.uswallow || mon === u.ustuck) && (!u.uinwater || dist2(mon.mx, mon.my, u.ux, u.uy) <= 2 && is_pool(mon.mx, mon.my)) && (u.uprops[DETECT_MONSTERS].intrinsic || u.uprops[DETECT_MONSTERS].extrinsic || !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || (u.uprops[WARN_OF_MON].intrinsic || u.uprops[WARN_OF_MON].extrinsic) && ($c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0 || $c.andu64(svc.context.warntype.polyd, mon.data.mflags2) !== 0 || svc.context.warntype.species && svc.context.warntype.species === mon.data))) ? 1 : 0;
    const mgendercode = mon.female ? FEMALE : MALE;
    /*
     * We must do the mimic check first.  If the mimic is mimicking something,
     * and the location is in sight, we have to change the hero's memory
     * so that when the position is out of sight, the hero remembers what
     * the mimic was mimicking.
     */
    if (mon_mimic && sightflags === PHYSICALLY_SEEN) {
        switch (M_AP_TYPE(mon)) {
            default:
                await impossible($C`display_monster:  bad m_ap_type value [ = %d ]`,
                    mon.m_ap_type);
            case M_AP.NOTHING:
                /*FALLTHRU*/
                await show_glyph(x, y, (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.data.pmidx) + (mon.female === 0 ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0);
                break;
            case M_AP.FURNITURE:
                {
                    /*
                     * This is a poor man's version of map_background().  I can't
                     * use map_background() because we are overriding what is in
                     * the 'typ' field.  Maybe have map_background()'s parameters
                     * be (x,y,glyph) instead of just (x,y).
                     *
                     * mappearance is currently set to an S_ index value in
                     * makemon.c.
                     */
                    const sym = mon.mappearance | 0;
                    const glyph = (sym === S.stone ? GLYPH.CMAP_STONE_OFF : sym <= S.trwall ? (sym - S.vwall | 0) + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) | 0 : sym < S.altar ? (sym - S.ndoor | 0) + GLYPH.CMAP_A_OFF | 0 : sym === S.altar ? 4008 : sym < S.arrow_trap + MAXTCHARS ? (sym - S.grave | 0) + GLYPH.CMAP_B_OFF | 0 : sym <= S.goodpos ? (sym - S.digbeam | 0) + GLYPH.CMAP_C_OFF | 0 : NO_GLYPH);
                    svl.level.locations[x][y].glyph = glyph;
                    if (!sensed) {
                        await show_glyph(x, y, glyph);
                        /* override real topology with mimic's fake one */
                        $t1 = $c.i8(cmap_to_type(sym)), svl.lastseentyp[x][y] = $t1;
                    }
                    break;
                }
            case M_AP.OBJECT:
                {
                    /* Make a fake object to send to map_object(). */
                    obj.$copyFrom(cg.zeroobj);
                    obj.ox = x;
                    obj.oy = y;
                    obj.otyp = $c.i16(mon.mappearance);
                    /* might be mimicking a corpse or statue */
                    obj.corpsenm = has_mcorpsenm(mon) ? mon.mextra.mcorpsenm : PM.TENGU;
                    await map_object(obj, !sensed ? 1 : 0);
                    break;
                }
            case M_AP.MONSTER:
                {
                    const mndx = u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.mappearance | 0;
                    await show_glyph(x, y, monnum_to_glyph(mndx, mgendercode));
                    break;
                }   /* case M_AP_MONSTER */
        }   /* switch M_AP_TYPE() */
    }
    /* If mimic is unsuccessfully mimicking something, display the monster. */
    if (!mon_mimic || sensed) {
        /* [ALI] Only use detected glyphs when monster wouldn't be
         * visible by any other means.
         *
         * There are no glyphs for "detected pets" so we have to
         * decide whether to display such things as detected or as tame.
         * If both are being highlighted in the same way, it doesn't
         * matter, but if not, showing them as pets is preferrable.
         */
        if (mon.mtame && !Hallucination()) {
            if (worm_tail) {
                num = (PM.LONG_WORM_TAIL + (mgendercode === MALE ? GLYPH.PET_MALE_OFF : GLYPH.PET_FEM_OFF));
            } else {
                num = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.data.pmidx) + (mon.female === 0 ? GLYPH.PET_MALE_OFF : GLYPH.PET_FEM_OFF) | 0;
            }
        } else if (sightflags === DETECTED) {
            if (worm_tail) {
                num = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : PM.LONG_WORM_TAIL) + (mgendercode === MALE ? GLYPH.DETECT_MALE_OFF : GLYPH.DETECT_FEM_OFF) | 0;
            } else {
                num = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.data.pmidx) + (mon.female === 0 ? GLYPH.DETECT_MALE_OFF : GLYPH.DETECT_FEM_OFF) | 0;
            }
        } else {
            if (worm_tail) {
                num = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : PM.LONG_WORM_TAIL) + (mgendercode === MALE ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0;
            } else {
                num = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.data.pmidx) + (mon.female === 0 ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0;
            }
        }
        await show_mon_or_warn(x, y, num);
        mon.meverseen = 1;
    }
}
/*
 * display_warning()
 *
 * This is also *not* a map_XXXX() function!  Monster warnings float
 * above everything just like monsters do, but only if the monster
 * is not showing.
 *
 * Do not call for worm tails.
 */
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {Promise<void>}
 */
async function display_warning(mon) {   // display.c:634
    let glyph = 0;
    const x = mon.mx;
    const y = mon.my;
    if ((u.uprops[WARNING].intrinsic || u.uprops[WARNING].extrinsic) && !mon.mpeaceful && dist2(mon.mx, mon.my, u.ux, u.uy) < 100 && $c.div32(mon.m_lev, 4) >= svc.context.warnlevel) {
        const wl = Hallucination() ? rn2_on_display_rng(WARNCOUNT - 1) + 1 | 0
            : warning_of(mon);
        glyph = warning_to_glyph(wl);
    } else if (MATCH_WARN_OF_MON(mon)) {
        glyph = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mon.data.pmidx) + (mon.female === 0 ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0;
    } else {
        await impossible($C`display_warning did not match warning type?`);
        return;
    }
    await show_mon_or_warn(x, y, glyph);
}
/**
 * @param {$T.monst | null} mon struct monst *
 * @returns {number} int
 */
export function warning_of(mon) {   // display.c:654
    let wl = 0;
    let tmp = 0;
    if ((u.uprops[WARNING].intrinsic || u.uprops[WARNING].extrinsic) && !mon.mpeaceful && dist2(mon.mx, mon.my, u.ux, u.uy) < 100 && $c.div32(mon.m_lev, 4) >= svc.context.warnlevel) {
        tmp = $c.div32(mon.m_lev, 4);   /* match display.h */
        wl = tmp > WARNCOUNT - 1 ? WARNCOUNT - 1 : tmp;
    }
    return wl;
}
/* used by newsym() to decide whether to show a monster or a visible gas
   cloud region when both are at the same spot; caller deals with region */
/**
 * @param {$T.monst | null} mon struct monst *
 * @param {number} mx coordxy
 * @param {number} my coordxy
 * @returns {number} boolean
 */
function mon_overrides_region(mon, mx, my) {   // display.c:668
    /* might be Null */
    /* won't match mon->mx,my if long worm's tail */
    /* this is redundant because newsym() doesn't call us when swallowed */
    if (u.uswallow && (!mon || mon !== u.ustuck)) {
        return FALSE;
    }
    if (mon) {
        /* when not a worm tail, show mon if sensed rather than seen */
        if (mx === mon.mx && my === mon.my
            && ((!u.uswallow || mon === u.ustuck) && (!u.uinwater || dist2(mon.mx, mon.my, u.ux, u.uy) <= 2 && is_pool(mon.mx, mon.my)) && (u.uprops[DETECT_MONSTERS].intrinsic || u.uprops[DETECT_MONSTERS].extrinsic || !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || (u.uprops[WARN_OF_MON].intrinsic || u.uprops[WARN_OF_MON].extrinsic) && ($c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0 || $c.andu64(svc.context.warntype.polyd, mon.data.mflags2) !== 0 || svc.context.warntype.species && svc.context.warntype.species === mon.data)) || (u.uprops[WARNING].intrinsic || u.uprops[WARNING].extrinsic) && !mon.mpeaceful && dist2(mon.mx, mon.my, u.ux, u.uy) < 100 && $c.div32(mon.m_lev, 4) >= svc.context.warnlevel)) {
            return TRUE;
        }
        /* even if worm tail;
           check whether the spot is adjacent and 'mon' would be visible
           there if the gas cloud wasn't interfering with normal vision;
           _mon_visible() handles mon->mundetected; don't need to check
           infravision when monster is adjacent */
        const r = u.xray_range > 1 ? u.xray_range : 1;
        if (!Blind() && _mon_visible(mon)
            && M_AP_TYPE(mon) !== M_AP.FURNITURE
            && M_AP_TYPE(mon) !== M_AP.OBJECT
            && distu(mx, my) <= Math.imul(r, r + 1 | 0)) {
            return TRUE;
        }
    }
    /* if not overriding region for current mon, propagate "remembered,
       unseen monster" */
    return svl.level.locations[mx][my].glyph === GLYPH_INVISIBLE ? TRUE : FALSE;
}
/* map or status window might not be ready for output during level creation
   or game restoration (something like u.usteed which affects display of
   the hero and also a status condition might not be set up yet) */
/**
 * @returns {number} boolean
 */
export function suppress_map_output() {   // display.c:715
    return _suppress_map_output();
}
/*
 * feel_newsym()
 *
 * When hero knows what happened to location, even when blind.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function feel_newsym(x, y) {   // display.c:726
    if (Blind()) {
        await feel_location(x, y);
    } else {
        await newsym(x, y);
    }
}
/*
 * feel_location()
 *
 * Feel the given location.  This assumes that the hero is blind and that
 * the given position is either the hero's or one of the eight squares
 * adjacent to the hero (except for a boulder push).
 * If an invisible monster has gone away, that will be discovered.  If an
 * invisible monster has appeared, this will _not_ be discovered since
 * searching only finds one monster per turn so we must check that separately.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function feel_location(x, y) {   // display.c:746
    let boulder = null, mon = null, ep = null, obj = null, trap = null, ml_ep = null, _ml_reg = null, $t1, $t2, $t3, $t4, $t5;
    /* replicate safeguards used by newsym(); might not be required here */
    if (_suppress_map_output()) {
        return;
    }
    if (!isok(x, y)) {
        return;
    }
    const lev = $c.relem(svl.level.locations[x], y);
    /* If hero's memory of an invisible monster is accurate, we want to keep
     * him from detecting the same monster over and over again on each turn.
     * We must return (so we don't erase the monster).  (We must also, in the
     * search function, be sure to skip over previously detected 'I's.)
     */
    if (glyph_is_invisible(lev.glyph) && m_at(x, y)) {
        return;
    }
    /* The hero can't feel non pool locations while under water
       except for lava and ice. */
    if (Underwater() && !Is_waterlevel(u.uz)
        && !is_pool_or_lava(x, y) && !is_ice(x, y)) {
        return;
    }
    /* Set the seen vector as if the hero had seen it.
       It doesn't matter if the hero is levitating or not. */
    set_seenv(lev, u.ux, u.uy, x, y);
    if (!can_reach_floor(FALSE)) {
        /*
         * Levitation Rules.  It is assumed that the hero can feel the state
         * of the walls around herself and can tell if she is in a corridor,
         * room, or doorway.  Boulders are felt because they are large enough.
         * Anything else is unknown because the hero can't reach the ground.
         * This makes things difficult.
         *
         * Check (and display) in order:
         *
         *      + Stone, walls, and closed doors.
         *      + Boulders.  [see a boulder before a doorway]
         *      + doors.
         *      + Room/water positions
         *      + Everything else (hallways!)
         */
        if (IS_OBSTRUCTED(lev.typ)
            || IS_DOOR(lev.typ)
            && lev.flags & (D.LOCKED | D.CLOSED)) {
            await map_background(x, y, 1);
        } else if ((boulder = sobj_at(BOULDER, x, y)) !== null) {
            await map_object(boulder, 1);
        } else if (IS_DOOR(lev.typ)) {
            await map_background(x, y, 1);
        } else if (IS_ROOM(lev.typ) || IS_POOL(lev.typ)) {
            /*
             * An open room or water location.  Normally we wouldn't touch
             * this, but we have to get rid of remembered boulder symbols.
             * This will only occur in rare occasions when the hero goes
             * blind and doesn't find a boulder where expected (something
             * came along and picked it up).  We know that there is not a
             * boulder at this location.  Show fountains, pools, etc.
             * underneath if already seen.  Otherwise, show the appropriate
             * floor symbol.
             *
             * Similarly, if the hero digs a hole in a wall or feels a
             * location that used to contain an unseen monster.  In these
             * cases, there's no reason to assume anything was underneath,
             * so just show the appropriate floor symbol.  If something was
             * embedded in the wall, the glyph will probably already
             * reflect that.  Don't change the symbol in this case.
             *
             * This isn't quite correct.  If the boulder was on top of some
             * other objects they should be seen once the boulder is removed.
             * However, we have no way of knowing that what is there now
             * was there then.  So we let the hero have a lapse of memory.
             * We could also just display what is currently on the top of the
             * object stack (if anything).
             */
            let do_room_glyph = FALSE;
            if (lev.glyph === objnum_to_glyph(BOULDER)
                || glyph_is_invisible(lev.glyph)) {
                if (lev.typ !== ROOM && lev.seenv) {
                    await map_background(x, y, 1);
                } else {
                    do_room_glyph = TRUE;
                }
            } else if (lev.glyph >= cmap_to_glyph(S.stone)
                && lev.glyph < cmap_to_glyph(S.darkroom)) {
                do_room_glyph = TRUE;
            }
            if (do_room_glyph) {
                $t1 = flags.dark_room && iflags.wc_color
                    && !Is_rogue_level(u.uz)
                    ? cmap_to_glyph(S.darkroom)
                    : lev.waslit ? cmap_to_glyph(S.room)
                    : cmap_to_glyph(S.stone), lev.glyph = $t1;
                await show_glyph(x, y, lev.glyph);
            }
        } else {
            /* We feel it (I think hallways are the only things left). */
            await map_background(x, y, 1);
            /* Corridors are never felt as lit (unless remembered that way) */
            /* (lit_corridor only).                                         */
            if (lev.typ === CORR && lev.glyph === cmap_to_glyph(S.litcorr)
                && !lev.waslit) {
                await show_glyph(x, y, ($t2 = cmap_to_glyph(S.corr), lev.glyph = $t2));
            } else if (lev.typ === ROOM && flags.dark_room && iflags.wc_color
                && lev.glyph === cmap_to_glyph(S.room)) {
                await show_glyph(x, y, ($t3 = cmap_to_glyph(S.darkroom), lev.glyph = $t3));
            }
        }
    } else {
        if ((ep = engr_at(x, y)) !== null && engr_can_be_felt(ep)) {
            ep.erevealed = 1;
        }
        do {
            if ((obj = svl.level.objects[x][y]) && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                await map_object(obj, 1);
            } else if ((trap = t_at(x, y)) && trap.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                await map_trap(trap, 1);
            } else if ((svl.level.locations[x][y].typ === CORR || svl.level.locations[x][y].typ === ICE || svl.level.locations[x][y].typ === ROOM) && (ml_ep = engr_at(x, y)) !== null && ml_ep.erevealed && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                await map_engraving(ml_ep, 1);
            } else {
                await map_background(x, y, 1);
            }
            update_lastseentyp(x, y);
            if (1 && !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (_ml_reg = visible_region_at(x, y)) !== null) {
                await show_region(_ml_reg, x, y);
            }
        } while (0);
        if (Punished()) {
            /*
             * A ball or chain is only felt if it is first on the object
             * location list.  Otherwise, we need to clear the felt bit ---
             * something has been dropped on the ball/chain.  If the bit is
             * not cleared, then when the ball/chain is moved it will drop
             * the wrong glyph.
             *
             * Note: during unpunish() we can be called by delobj() when
             * destroying uchain while uball hasn't been cleared yet (so
             * Punished will still yield True but uchain might not be part
             * of the floor list anymore).
             */
            if ($G.uchain && $G.uchain.where === OBJ.FLOOR
                && $G.uchain.ox === x && $G.uchain.oy === y
                && svl.level.objects[x][y] === $G.uchain) {
                u.bc_felt = u.bc_felt | BC.CHAIN;
            } else {
                u.bc_felt = u.bc_felt & ~BC.CHAIN;   /* do not feel the chain */
            }
            if ($G.uball && $G.uball.where === OBJ.FLOOR
                && $G.uball.ox === x && $G.uball.oy === y
                && svl.level.objects[x][y] === $G.uball) {
                u.bc_felt = u.bc_felt | BC.BALL;
            } else {
                u.bc_felt = u.bc_felt & ~BC.BALL;   /* do not feel the ball */
            }
        }
        /* Floor spaces are dark if unlit.  Corridors are dark if unlit. */
        if (lev.typ === ROOM && lev.glyph === cmap_to_glyph(S.room)
            && (!lev.waslit || flags.dark_room && iflags.wc_color)) {
            await show_glyph(x, y, ($t4 = (flags.dark_room ? S.darkroom : S.stone) === S.stone ? GLYPH.CMAP_STONE_OFF : (flags.dark_room ? S.darkroom : S.stone) <= S.trwall ? (flags.dark_room ? S.darkroom : S.stone) - S.vwall + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) : (flags.dark_room ? S.darkroom : S.stone) < S.altar ? (flags.dark_room ? S.darkroom : S.stone) - S.ndoor + GLYPH.CMAP_A_OFF : (flags.dark_room ? S.darkroom : S.stone) === S.altar ? 4008 : (flags.dark_room ? S.darkroom : S.stone) < S.arrow_trap + MAXTCHARS ? (flags.dark_room ? S.darkroom : S.stone) - S.grave + GLYPH.CMAP_B_OFF : (flags.dark_room ? S.darkroom : S.stone) <= S.goodpos ? (flags.dark_room ? S.darkroom : S.stone) - S.digbeam + GLYPH.CMAP_C_OFF : NO_GLYPH, lev.glyph = $t4));
        } else if (lev.typ === CORR && lev.glyph === cmap_to_glyph(S.litcorr)
            && !lev.waslit) {
            await show_glyph(x, y, ($t5 = cmap_to_glyph(S.corr), lev.glyph = $t5));
        }
    }
    /* draw monster on top if we can sense it */
    if (!u_at(x, y) && (mon = svl.level.monsters[x][y]) !== null && ((!u.uswallow || mon === u.ustuck) && (!u.uinwater || dist2(mon.mx, mon.my, u.ux, u.uy) <= 2 && is_pool(mon.mx, mon.my)) && (u.uprops[DETECT_MONSTERS].intrinsic || u.uprops[DETECT_MONSTERS].extrinsic || !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || (u.uprops[WARN_OF_MON].intrinsic || u.uprops[WARN_OF_MON].extrinsic) && ($c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0 || $c.andu64(svc.context.warntype.polyd, mon.data.mflags2) !== 0 || svc.context.warntype.species && svc.context.warntype.species === mon.data)))) {
        await display_monster(x, y, mon,
            !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || MATCH_WARN_OF_MON(mon)
            ? PHYSICALLY_SEEN
            : DETECTED,
            mon && (x !== mon.mx || y !== mon.my) ? 1 : 0);
    }
}
/*
 * newsym()
 *
 * Possibly put a new glyph at the given location.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function newsym(x, y) {   // display.c:917
    let lev = null, ep = null, mon = null, see_it = 0, worm_tail = 0, errfunc = null, reg = null, see_self = 0, obj = null, trap = null, ml_ep = null, _ml_reg = null, show = 0, trap$2 = null, tt = 0, obj$2 = null, trap$3 = null, ml_ep$2 = null, _ml_reg$2 = null, obj$3 = null, trap$4 = null, ml_ep$3 = null, _ml_reg$3 = null, $goto = null, $t1, $t2, $t3, $t4;
    /* don't try to produce map output when level is in a state of flux */
    if (_suppress_map_output()) {
        return;
    }
    /* should never happen; same error handling as u_on_newpos() */
    if (!isok(x, y)) {
        errfunc = x < 0 || y < 0 || x > COLNO - 1 || y > ROWNO - 1 ? panic
            : impossible;   /* misuse of column 0 is less severe */
        await errfunc($C`newsym: attempting screen update for <%d,%d>`, x, y);
        return;
    }
    /* only permit updating the hero when swallowed */
    if (u.uswallow) {
        if (u_at(x, y)) {
            await display_self();
        }
        return;
    }
    if (Underwater() && !Is_waterlevel(u.uz)) {
        /* when underwater, don't do anything unless <x,y> is an
           adjacent water or lava or ice position */
        if (!(is_pool_or_lava(x, y) || is_ice(x, y)) || !next2u(x, y)) {
            return;
        }
    }
    lev = $c.relem(svl.level.locations[x], y);
    /* Can physically see the location. */
    if (cansee(x, y)) {
        reg = visible_region_at(x, y);
        /*
         * Don't use templit here:  E.g.
         *
         *      lev->waslit = !!(lev->lit || templit(x,y));
         *
         * Otherwise we have the "light pool" problem, where non-permanently
         * lit areas just out of sight stay remembered as lit.  They should
         * re-darken.
         *
         * Perhaps ALL areas should revert to their "unlit" look when
         * out of sight.
         */
        lev.waslit = (lev.lit !== 0 ? 1 : 0) & 1;   /* remember lit condition */
        mon = svl.level.monsters[x][y];
        worm_tail = mon && (x !== mon.mx || y !== mon.my) ? 1 : 0;
        if ((ep = engr_at(x, y)) !== null) {
            ep.erevealed = 1;   /* even when covered by objects or a monster */
        }
        /*
         * Normal region shown only on accessible positions, but
         * poison clouds and steam clouds also shown above lava,
         * pools and moats.
         * However, sensed monsters (via detection or telepathy or
         * warning) take precedence over all regions.
         * Adjacent monsters also take precedence if they would be
         * seen when there's no gas region.
         *
         * FIXME:
         *  The adjacency checking [in mon_overrides_region()] works
         *  when the hero is outside the region and the monster is
         *  inside, and when they're both inside, but not when the
         *  hero is inside and monster outside (because 'reg' will be
         *  Null for mon's <x,y>).  Checking whether hero is inside
         *  a region for every newsym() seems excessive.  The hero is
         *  usually blind when in a gas cloud so the problem is less
         *  noticeable then it might otherwise be.
         */
        if (reg && (ACCESSIBLE(lev.typ)
            || reg.visible && is_pool_or_lava(x, y))) {
            if (!mon_overrides_region(mon, x, y)) {
                await show_region(reg, x, y);
                return;
            }
        }
        if (u_at(x, y)) {
            see_self = canspotself();
            /* update map information for <u.ux,u.uy> (remembered topology
               and object/known trap/terrain glyph) but only display it if
               hero can't see him/herself, then show self if appropriate */
            do {
                if ((obj = svl.level.objects[x][y]) && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                    await map_object(obj, !see_self ? 1 : 0);
                } else if ((trap = t_at(x, y)) && trap.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                    await map_trap(trap, !see_self ? 1 : 0);
                } else if ((svl.level.locations[x][y].typ === CORR || svl.level.locations[x][y].typ === ICE || svl.level.locations[x][y].typ === ROOM) && (ml_ep = engr_at(x, y)) !== null && ml_ep.erevealed && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                    await map_engraving(ml_ep, !see_self ? 1 : 0);
                } else {
                    await map_background(x, y, !see_self ? 1 : 0);
                }
                update_lastseentyp(x, y);
                if (!see_self && !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (_ml_reg = visible_region_at(x, y)) !== null) {
                    await show_region(_ml_reg, x, y);
                }
            } while (0);
            if (see_self) {
                await display_self();
            }
        } else {
            show = FALSE;
            see_it = mon && ((!mon.minvis || (u.uprops[SEE_INVIS].intrinsic || u.uprops[SEE_INVIS].extrinsic)) && !mon.mundetected
                || !worm_tail && (!($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range)
                || MATCH_WARN_OF_MON(mon))) ? 1 : 0;
            if (mon && (see_it || !worm_tail && Detect_monsters())) {
                if (mon.mtrapped) {
                    trap$2 = t_at(x, y);
                    tt = trap$2 ? trap$2.ttyp : NO_TRAP;
                    /* if monster is in a physical trap, you see trap too */
                    if (tt === BEAR_TRAP || is_pit(tt) || tt === WEB) {
                        trap$2.tseen = 1;
                    }
                }
                do {
                    /* map under the monster */
                    if ((obj$2 = svl.level.objects[x][y]) && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_object(obj$2, show);
                    } else if ((trap$3 = t_at(x, y)) && trap$3.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_trap(trap$3, show);
                    } else if ((svl.level.locations[x][y].typ === CORR || svl.level.locations[x][y].typ === ICE || svl.level.locations[x][y].typ === ROOM) && (ml_ep$2 = engr_at(x, y)) !== null && ml_ep$2.erevealed && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_engraving(ml_ep$2, show);
                    } else {
                        await map_background(x, y, show);
                    }
                    update_lastseentyp(x, y);
                    if (show && !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (_ml_reg$2 = visible_region_at(x, y)) !== null) {
                        await show_region(_ml_reg$2, x, y);
                    }
                } while (0);
                /* also gets rid of any invisibility glyph */
                await display_monster(x, y, mon,
                    see_it ? PHYSICALLY_SEEN : DETECTED,
                    worm_tail);
            } else if (mon && ((u.uprops[WARNING].intrinsic || u.uprops[WARNING].extrinsic) && !mon.mpeaceful && dist2(mon.mx, mon.my, u.ux, u.uy) < 100 && $c.div32(mon.m_lev, 4) >= svc.context.warnlevel) && !worm_tail) {
                await display_warning(mon);
            } else if (glyph_is_invisible(lev.glyph)) {
                await map_invisible(x, y);
            } else {
                do {
                    /* map the location */
                    if ((obj$3 = svl.level.objects[x][y]) && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_object(obj$3, 1);
                    } else if ((trap$4 = t_at(x, y)) && trap$4.tseen && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_trap(trap$4, 1);
                    } else if ((svl.level.locations[x][y].typ === CORR || svl.level.locations[x][y].typ === ICE || svl.level.locations[x][y].typ === ROOM) && (ml_ep$3 = engr_at(x, y)) !== null && ml_ep$3.erevealed && !(is_pool(x, y) && !u.uinwater || svl.level.locations[x][y].typ === LAVAPOOL || svl.level.locations[x][y].typ === LAVAWALL)) {
                        await map_engraving(ml_ep$3, 1);
                    } else {
                        await map_background(x, y, 1);
                    }
                    update_lastseentyp(x, y);
                    if (1 && !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (_ml_reg$3 = visible_region_at(x, y)) !== null) {
                        await show_region(_ml_reg$3, x, y);
                    }
                } while (0);
            }
        }
        /* Can't see the location. */
    } else {
        D1: for (;;) {
            switch ($goto) {
            case null: case "show_mem":
                if ($goto !== "show_mem" && u_at(x, y)) {
                    await feel_location(u.ux, u.uy);   /* forces an update */
                    if (canspotself()) {
                        await display_self();
                    }
                } else if ($goto !== "show_mem" && ((mon = svl.level.monsters[x][y]) !== null
                    && ((see_it = !($c.andu64(mon.data.mflags1, M1.MINDLESS) !== 0) && ((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked && (u.uprops[TELEPAT].intrinsic || u.uprops[TELEPAT].extrinsic) || u.uprops[TELEPAT].extrinsic && dist2(mon.mx, mon.my, u.ux, u.uy) <= u.unblind_telepat_range) || MATCH_WARN_OF_MON(mon)
                    || !((u.uprops[BLINDED].intrinsic || u.uprops[BLINDED].extrinsic) && !u.uprops[BLINDED].blocked) && (u.uprops[INFRAVISION].intrinsic || u.uprops[INFRAVISION].extrinsic) && mon.data.mflags3 & M3.INFRAVISIBLE && (gv.viz_array.get(mon.my).get(mon.mx) & COULD_SEE) !== 0
                    && ((!mon.minvis || (u.uprops[SEE_INVIS].intrinsic || u.uprops[SEE_INVIS].extrinsic)) && !mon.mundetected) ? 1 : 0) !== 0
                    || Detect_monsters() && !(mon && (x !== mon.mx || y !== mon.my))))) {
                    /* Seen or sensed monsters are printed every time.
                       This also gets rid of any invisibility glyph. */
                    await display_monster(x, y, mon, see_it ? 0 : DETECTED,
                        mon && (x !== mon.mx || y !== mon.my) ? TRUE : FALSE);
                } else if ($goto !== "show_mem" && (mon && ((u.uprops[WARNING].intrinsic || u.uprops[WARNING].extrinsic) && !mon.mpeaceful && dist2(mon.mx, mon.my, u.ux, u.uy) < 100 && $c.div32(mon.m_lev, 4) >= svc.context.warnlevel) && !(mon && (x !== mon.mx || y !== mon.my)))) {
                    await display_warning(mon);
                    /*
                     * If the location is remembered as being both dark (waslit is false)
                     * and lit (glyph is a lit room or lit corridor) then it was either:
                     *
                     *      (1) A dark location that the hero could see through night
                     *          vision.
                     *      (2) Darkened while out of the hero's sight.  This can happen
                     *          when cursed scroll of light is read.
                     *
                     * In either case, we have to manually correct the hero's memory to
                     * match waslit.  Deciding when to change waslit is non-trivial.
                     *
                     *  Note:  If flags.lit_corridor is set, then corridors act like room
                     *         squares.  That is, they light up if in night vision range.
                     *         If flags.lit_corridor is not set, then corridors will
                     *         remain dark unless lit by a light spell and may darken
                     *         again, as discussed above.
                     *
                     * These checks and changes must be here and not in back_to_glyph().
                     * They are dependent on the position being out of sight.
                     */
                } else if ($goto !== "show_mem" && Is_rogue_level(u.uz)) {
                    if (lev.glyph === cmap_to_glyph(S.litcorr) && lev.typ === CORR) {
                        await show_glyph(x, y, ($t1 = cmap_to_glyph(S.corr), lev.glyph = $t1));
                    } else if (lev.glyph === cmap_to_glyph(S.room) && lev.typ === ROOM
                        && !lev.waslit) {
                        await show_glyph(x, y, ($t2 = cmap_to_glyph(S.stone), lev.glyph = $t2));
                    } else {
                        $goto = "show_mem"; continue D1;
                    }
                } else if ($goto !== "show_mem" && (!lev.waslit || flags.dark_room && iflags.wc_color)) {
                    if (lev.glyph === cmap_to_glyph(S.litcorr) && lev.typ === CORR) {
                        await show_glyph(x, y, ($t3 = cmap_to_glyph(S.corr), lev.glyph = $t3));
                    } else if (lev.glyph === cmap_to_glyph(S.room) && lev.typ === ROOM) {
                        await show_glyph(x, y, ($t4 = ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) === S.stone ? GLYPH.CMAP_STONE_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) <= S.trwall ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.vwall + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) < S.altar ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.ndoor + GLYPH.CMAP_A_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) === S.altar ? 4008 : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) < S.arrow_trap + MAXTCHARS ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.grave + GLYPH.CMAP_B_OFF : ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) <= S.goodpos ? ((svd.dungeon_topology.d_rogue_level.dlevel || svd.dungeon_topology.d_rogue_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_rogue_level) ? S.stone : S.darkroom) - S.digbeam + GLYPH.CMAP_C_OFF : NO_GLYPH, lev.glyph = $t4));
                    } else {
                        $goto = "show_mem"; continue D1;
                    }
                } else {
                    $goto = null;   // show_mem:
                    await show_glyph(x, y, lev.glyph);
                }
            }
            break;
        }
    }
}
/*
 * shieldeff()
 *
 * Put magic shield pyrotechnics at the given location.  This *could* be
 * pulled into a platform dependent routine for fancier graphics if desired.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function shieldeff(x, y) {   // display.c:1110
    let i = 0;
    if (!flags.sparkle) {
        return;
    }
    if (cansee(x, y)) {
        /* Don't see anything if can't see the location */
        for (i = 0; i < SHIELD_COUNT; i = i + 1) {
            await show_glyph(x, y, shield_static[i] === S.stone ? GLYPH.CMAP_STONE_OFF : shield_static[i] <= S.trwall ? (shield_static[i] - S.vwall | 0) + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) | 0 : shield_static[i] < S.altar ? (shield_static[i] - S.ndoor | 0) + GLYPH.CMAP_A_OFF | 0 : shield_static[i] === S.altar ? 4008 : shield_static[i] < S.arrow_trap + MAXTCHARS ? (shield_static[i] - S.grave | 0) + GLYPH.CMAP_B_OFF | 0 : shield_static[i] <= S.goodpos ? (shield_static[i] - S.digbeam | 0) + GLYPH.CMAP_C_OFF | 0 : NO_GLYPH);
            await flush_screen(1);   /* make sure the glyph shows up */
            await nh_delay_output()();
        }
        await newsym(x, y);   /* restore the old information */
    }
}
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<number>} int
 */
async function tether_glyph(x, y) {   // display.c:1127
    const tdx = u.ux - x;
    const tdy = u.uy - y;
    return await zapdir_to_glyph(sgn(tdx), sgn(tdy), 2);
}
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function tmp_at(x, y) {   // display.c:1174
    let tmp = null, i = 0, i$2 = 0;
    switch (x) {
        case DISP_BEAM:
        case DISP_ALL:
        case DISP_TETHER:
        case DISP_FLASH:
        case DISP_ALWAYS:
            if (!tmp_at$tglyph) {
                tmp = tgfirst;
            } else {
                /* nested effect; we need dynamic memory */
                tmp = $c.asRec(await alloc(664), $T.tmp_glyph, 664);
            }
            tmp.prev = tmp_at$tglyph;
            tmp_at$tglyph = tmp;
            tmp_at$tglyph.sidx = 0;
            tmp_at$tglyph.style = x;
            tmp_at$tglyph.glyph = y;
            await flush_screen(0);   /* flush buffered glyphs */
            return;
        case DISP_FREEMEM:
            /* in case game ends with tmp_at() in progress */
            while (tmp_at$tglyph) {
                tmp = tmp_at$tglyph.prev;
                if (tmp_at$tglyph !== tgfirst) {
                    $c.free(tmp_at$tglyph);
                }
                tmp_at$tglyph = tmp;
            }
            return;
        default:
            break;
    }
    if (!tmp_at$tglyph) {
        await panic($C`tmp_at: tglyph not initialized`);
    } else {
        switch (x) {
            case DISP_CHANGE:
                tmp_at$tglyph.glyph = y;
                break;
            case DISP_END:
                if (tmp_at$tglyph.style === DISP_BEAM || tmp_at$tglyph.style === DISP_ALL) {
                    /* Erase (reset) from source to end */
                    for (i = 0; i < tmp_at$tglyph.sidx; i = i + 1) {
                        await newsym(tmp_at$tglyph.saved[i].x, tmp_at$tglyph.saved[i].y);
                    }
                } else if (tmp_at$tglyph.style === DISP_TETHER) {
                    if (y === BACKTRACK && tmp_at$tglyph.sidx > 1) {
                        /* backtrack */
                        for (i$2 = tmp_at$tglyph.sidx - 1 | 0; i$2 > 0; i$2 = i$2 - 1) {
                            await newsym(tmp_at$tglyph.saved[i$2].x, tmp_at$tglyph.saved[i$2].y);
                            await show_glyph(tmp_at$tglyph.saved[i$2 - 1 | 0].x,
                                tmp_at$tglyph.saved[i$2 - 1 | 0].y, tmp_at$tglyph.glyph);
                            await flush_screen(0);   /* make sure it shows up */
                            await nh_delay_output()();
                        }
                        tmp_at$tglyph.sidx = 1;
                    }
                    for (i$2 = 0; i$2 < tmp_at$tglyph.sidx; i$2 = i$2 + 1) {
                        await newsym(tmp_at$tglyph.saved[i$2].x, tmp_at$tglyph.saved[i$2].y);
                    }
                } else {
                    /* DISP_FLASH or DISP_ALWAYS */
                    if (tmp_at$tglyph.sidx) {   /* been called at least once */
                        await newsym(tmp_at$tglyph.saved[0].x, tmp_at$tglyph.saved[0].y);
                    }
                }
                /* tglyph->sidx = 0; -- about to be freed, so not necessary */
                tmp = tmp_at$tglyph.prev;
                if (tmp_at$tglyph !== tgfirst) {
                    $c.free(tmp_at$tglyph);
                }
                tmp_at$tglyph = tmp;
                break;
            default:
                /* do it */
                if (!isok(x, y)) {
                    break;
                }
                if (tmp_at$tglyph.style === DISP_BEAM || tmp_at$tglyph.style === DISP_ALL) {
                    if (tmp_at$tglyph.style !== DISP_ALL && !cansee(x, y)) {
                        break;
                    }
                    if (tmp_at$tglyph.sidx >= TMP_AT_MAX_GLYPHS) {
                        break;   /* too many locations */
                    }
                    /* save pos for later erasing */
                    tmp_at$tglyph.saved[tmp_at$tglyph.sidx].x = x;
                    tmp_at$tglyph.saved[tmp_at$tglyph.sidx].y = y;
                    tmp_at$tglyph.sidx = tmp_at$tglyph.sidx + 1 | 0;
                } else if (tmp_at$tglyph.style === DISP_TETHER) {
                    if (tmp_at$tglyph.sidx >= TMP_AT_MAX_GLYPHS) {
                        break;   /* too many locations */
                    }
                    if (tmp_at$tglyph.sidx) {
                        const px = tmp_at$tglyph.saved[tmp_at$tglyph.sidx - 1 | 0].x;
                        const py = tmp_at$tglyph.saved[tmp_at$tglyph.sidx - 1 | 0].y;
                        await show_glyph($c.i16(px), $c.i16(py), await tether_glyph($c.i16(px), $c.i16(py)));
                    }
                    /* save pos for later use or erasure */
                    tmp_at$tglyph.saved[tmp_at$tglyph.sidx].x = x;
                    tmp_at$tglyph.saved[tmp_at$tglyph.sidx].y = y;
                    tmp_at$tglyph.sidx = tmp_at$tglyph.sidx + 1 | 0;
                } else {
                    /* DISP_FLASH/ALWAYS */
                    if (tmp_at$tglyph.sidx) {
                        /* not first call, so reset previous pos */
                        await newsym(tmp_at$tglyph.saved[0].x, tmp_at$tglyph.saved[0].y);
                        tmp_at$tglyph.sidx = 0;   /* display is presently up to date */
                    }
                    if (!cansee(x, y) && tmp_at$tglyph.style !== DISP_ALWAYS) {
                        break;
                    }
                    tmp_at$tglyph.saved[0].x = x;
                    tmp_at$tglyph.saved[0].y = y;
                    tmp_at$tglyph.sidx = 1;
                }
                await show_glyph(x, y, tmp_at$tglyph.glyph);   /* show it */
                await flush_screen(0);   /* make sure it shows up */
                break;
        }   /* end switch */
    }
}
/*
 * flash_glyph_at(x, y, glyph, repeatcount)
 *
 * Briefly flash between the passed glyph and the glyph that's
 * meant to be at the location.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} tg int
 * @param {number} rpt int
 * @returns {Promise<void>}
 */
export async function flash_glyph_at(x, y, tg, rpt) {   // display.c:1305
    let i = 0, glyph = new Int32Array(2), $t1;
    rpt = Math.imul(rpt, 2);   /* two loop iterations per 'count' */
    glyph[0] = tg;
    $t1 = svl.level.flags.hero_memory ? svl.level.locations[x][y].glyph
        : await back_to_glyph(x, y), glyph[1] = $t1;
    /* even iteration count (guaranteed) ends with glyph[1] showing;
       caller might want to override that, but no newsym() calls here
       in case caller has tinkered with location visibility */
    for (i = 0; i < rpt; i = i + 1) {
        await show_glyph(x, y, glyph[$c.rem32(i, 2)]);
        await flush_screen(1);
        await nh_delay_output()();
    }
}
/*
 * swallowed()
 *
 * The hero is swallowed.  Show a special graphics sequence for this.  This
 * bypasses all of the display routines and messes with buffered screen
 * directly.  This method works because both vision and display check for
 * being swallowed.
 */
/**
 * @param {number} first int
 * @returns {Promise<void>}
 */
export async function swallowed(first) {   // display.c:1332
    let x = 0, y = 0;
    /* last swallowed position */
    if (first) {
        await cls();
        await bot();
    } else {
        /* Clear old location */
        for (y = $c.i16(swallowed$lasty - 1); y <= swallowed$lasty + 1; y = $c.i16(y + 1)) {
            for (x = $c.i16(swallowed$lastx - 1); x <= swallowed$lastx + 1; x = $c.i16(x + 1)) {
                if (isok(x, y)) {
                    await show_glyph(x, y, GLYPH_UNEXPLORED);
                }
            }
        }
    }
    const swallower = u.ustuck.data.pmidx;
    /* assume isok(u.ux,u.uy) */
    const left_ok = isok($c.i16(u.ux - 1), u.uy);
    const rght_ok = isok($c.i16(u.ux + 1), u.uy);
    /*
     *  Display the hero surrounded by the monster's stomach.
     */
    if (isok(u.ux, $c.i16(u.uy - 1))) {
        if (left_ok) {
            await show_glyph($c.i16(u.ux - 1), $c.i16(u.uy - 1),
                await swallow_to_glyph(swallower, S.sw_tl));
        }
        await show_glyph(u.ux, $c.i16(u.uy - 1), await swallow_to_glyph(swallower, S.sw_tc));
        if (rght_ok) {
            await show_glyph($c.i16(u.ux + 1), $c.i16(u.uy - 1),
                await swallow_to_glyph(swallower, S.sw_tr));
        }
    }
    if (left_ok) {
        await show_glyph($c.i16(u.ux - 1), u.uy, await swallow_to_glyph(swallower, S.sw_ml));
    }
    await display_self();
    if (rght_ok) {
        await show_glyph($c.i16(u.ux + 1), u.uy, await swallow_to_glyph(swallower, S.sw_mr));
    }
    if (isok(u.ux, $c.i16(u.uy + 1))) {
        if (left_ok) {
            await show_glyph($c.i16(u.ux - 1), $c.i16(u.uy + 1),
                await swallow_to_glyph(swallower, S.sw_bl));
        }
        await show_glyph(u.ux, $c.i16(u.uy + 1), await swallow_to_glyph(swallower, S.sw_bc));
        if (rght_ok) {
            await show_glyph($c.i16(u.ux + 1), $c.i16(u.uy + 1),
                await swallow_to_glyph(swallower, S.sw_br));
        }
    }
    /* Update the swallowed position. */
    swallowed$lastx = u.ux;
    swallowed$lasty = u.uy;
}
/*
 * under_water()
 *
 * Similar to swallowed() in operation.  Shows hero when underwater
 * except when in water level.  Special routines exist for that.
 */
/**
 * @param {number} mode int
 * @returns {Promise<void>}
 */
export async function under_water(mode) {   // display.c:1395
    let x = 0, y = 0;
    /* swallowing has a higher precedence than under water */
    if (Is_waterlevel(u.uz) || u.uswallow) {
        return;
    }
    /* full update */
    if (mode === 1 || under_water$dela) {
        await cls();
        under_water$dela = FALSE;
        /* delayed full update */
    } else if (mode === 2) {
        under_water$dela = TRUE;
        return;
        /* limited update */
    } else {
        for (y = $c.i16(under_water$lasty - 1); y <= under_water$lasty + 1; y = $c.i16(y + 1)) {
            for (x = $c.i16(under_water$lastx - 1); x <= under_water$lastx + 1; x = $c.i16(x + 1)) {
                if (isok(x, y)) {
                    await show_glyph(x, y, GLYPH_UNEXPLORED);
                }
            }
        }
    }
    /*
     * TODO?  Should this honor Xray radius rather than force radius 1?
     */
    for (x = $c.i16(u.ux - 1); x <= u.ux + 1; x = $c.i16(x + 1)) {
        for (y = $c.i16(u.uy - 1); y <= u.uy + 1; y = $c.i16(y + 1)) {
            if (isok(x, y) && (is_pool_or_lava(x, y) || is_ice(x, y))) {
                if (Blind() && !u_at(x, y)) {
                    await show_glyph(x, y, GLYPH_UNEXPLORED);
                } else {
                    await newsym(x, y);
                }
            }
        }
    }
    under_water$lastx = u.ux;
    under_water$lasty = u.uy;
}
/*
 *      under_ground()
 *
 *      Very restricted display.  You can only see yourself.
 */
/**
 * @param {number} mode int
 * @returns {Promise<void>}
 */
export async function under_ground(mode) {   // display.c:1445
    /* swallowing has a higher precedence than under ground */
    if (u.uswallow) {
        return;
    }
    /* full update */
    if (mode === 1 || under_ground$dela) {
        await cls();
        under_ground$dela = FALSE;
        /* delayed full update */
    } else if (mode === 2) {
        under_ground$dela = TRUE;
        return;
        /* limited update */
    } else {
        await newsym(u.ux, u.uy);
    }
}
/* ======================================================================== */
/*
 * Loop through all of the monsters and update them.  Called when:
 *      + going blind & telepathic
 *      + regaining sight & telepathic
 *      + getting and losing infravision
 *      + hallucinating
 *      + doing a full screen redraw
 *      + see invisible times out or a ring of see invisible is taken off
 *        or intrinsic see invisible is stolen by a gremlin
 *      + when a potion of see invisible is quaffed or a ring of see
 *        invisible is put on
 *      + gaining telepathy when blind [givit() in eat.c, pleased() in pray.c]
 *      + losing telepathy while blind [xkilled() in mon.c, attrcurse() in
 *        sit.c]
 */
/**
 * @returns {Promise<void>}
 */
export async function see_monsters() {   // display.c:1487
    let mon = null;
    let new_warn_obj_cnt = 0;
    if (gd.defer_see_monsters) {
        return;
    }
    /* steed and unseen engulfer/holder/holdee are recognized via touch
       even if they aren't going to be rendered; other monsters
       may get flagged as having been seen by display_monster() if it's
       called by newsym() */
    if (u.usteed) {
        u.usteed.meverseen = 1;
    }
    if (u.ustuck) {
        u.ustuck.meverseen = 1;
    }
    /* loop through level.monsters (aka fmon) */
    for (mon = svl.level.monlist; mon; mon = mon.nmon) {
        if (DEADMONSTER(mon)) {
            continue;
        }
        if ($c.and64(mon.mstate, MON.STILL_ARRIVING) !== 0) {
            continue;
        }
        await newsym(mon.mx, mon.my);
        if (mon.wormno) {
            await see_wsegs(mon);
        }
        if (Warn_of_mon()
            && $c.andu64(svc.context.warntype.obj, mon.data.mflags2) !== 0) {
            new_warn_obj_cnt = new_warn_obj_cnt + 1 | 0;
        }
    }
    /*
     * Make Sting glow blue or stop glowing if required.
     */
    if (new_warn_obj_cnt !== gw.warn_obj_cnt) {
        await Sting_effects(new_warn_obj_cnt);
        gw.warn_obj_cnt = new_warn_obj_cnt;
    }
    /* when mounted, hero's location gets caught by monster loop */
    if (!u.usteed) {
        await newsym(u.ux, u.uy);
    }
}
/**
 * @param {$T.monst | null} mtmp struct monst *
 */
function mimic_light_blocking(mtmp) {   // display.c:1532
    if (mtmp.minvis && is_lightblocker_mappear(mtmp)) {
        if (See_invisible()) {
            block_point(mtmp.mx, mtmp.my);
        } else {
            unblock_point(mtmp.mx, mtmp.my);
        }
    }
}
/*
 * Block/unblock light depending on what a mimic is mimicking and if it's
 * invisible or not.  Should be called only when the state of See_invisible
 * changes.
 */
/**
 * @returns {Promise<void>}
 */
export async function set_mimic_blocking() {   // display.c:1548
    await iter_mons(mimic_light_blocking);
}
/*
 * Loop through all of the object *locations* and update them.  Called when
 *      + hallucinating.
 */
/**
 * @returns {Promise<void>}
 */
export async function see_objects() {   // display.c:1558
    let obj = null;
    for (obj = svl.level.objlist; obj; obj = obj.nobj) {
        if (svl.level.objects[obj.ox][obj.oy] === obj) {
            await newsym(obj.ox, obj.oy);
        }
    }
    /* Qt's "paper doll" subset of persistent inventory shows map tiles
       for objects which aren't on the floor so not handled by above loop;
       inventory which includes glyphs should also be affected, so do this
       for all interfaces in case any feature that for persistent inventory */
    await update_inventory();
}
/* mark the top object of nearby stacks as having been seen, and if
   that object was being displayed as generic, redisplay it as specific */
/**
 * @returns {Promise<void>}
 */
export async function see_nearby_objects() {   // display.c:1576
    let obj = null, ix = 0, iy = 0;
    const x = u.ux;
    const y = u.uy;
    /* these 'r' and 'neardist' calculations match distant_name(objnam.c) */
    /* neardist produces a small square with rounded corners */
    const r = u.xray_range > 2 ? u.xray_range : 2;
    const neardist = Math.imul(Math.imul(r, r), 2) - r | 0;   /* same as r*r + r*(r-1) */
    /* [note: this could be optimized to avoid the distu() calculations] */
    for (iy = $c.i16(y - r | 0); iy <= (y + r | 0); iy = $c.i16(iy + 1)) {
        for (ix = $c.i16(x - r | 0); ix <= (x + r | 0); ix = $c.i16(ix + 1)) {
            if (!isok(ix, iy)) {
                continue;
            }
            /* skip if no object or the object has already been marked as
               having been seen up close */
            if ((obj = svl.level.objects[ix][iy]) === null || obj.dknown) {
                continue;
            }
            /* skip if the spot can't be seen or is too far (diagonal) */
            if (!cansee(ix, iy) || distu(ix, iy) > neardist) {
                continue;
            }
            await observe_object(obj);
            /* operate on remembered glyph rather than current one */
            const glyph = svl.level.locations[ix][iy].glyph;
            if (glyph_is_generic_object(glyph)) {
                await newsym_force(ix, iy);
            }
        }
    }
}
/*
 * Update hallucinated traps.
 */
/**
 * @returns {Promise<void>}
 */
export async function see_traps() {   // display.c:1611
    let trap = null;
    for (trap = gf.ftrap; trap; trap = trap.ntrap) {
        const glyph = gg.gbuf[trap.ty][trap.tx].glyphinfo.glyph;
        if (glyph_is_trap(glyph)) {
            await newsym(trap.tx, trap.ty);
        }
    }
}
/*
 * Put the cursor on the hero.  Flush all accumulated glyphs before doing it.
 */
/**
 * @returns {Promise<void>}
 */
export async function curs_on_u() {   // display.c:1687
    await flush_screen(1);   /* Flush waiting glyphs & put cursor on hero */
}
/* the #redraw command */
/**
 * @returns {Promise<number>} int
 */
export async function doredraw() {   // display.c:1694
    await docrt();
    return ECMD.OK;
}
/* the main refresh-the-screen routine */
/**
 * @returns {Promise<void>}
 */
export async function docrt() {   // display.c:1702
    await docrt_flags(docrtRecalc);
}
/* docrt() with finer control */
/**
 * @param {number} refresh_flags int
 * @returns {Promise<void>}
 */
export async function docrt_flags(refresh_flags) {   // display.c:1709
    let x = 0, y = 0, lev = null, maponly = 0, redrawonly = 0, nocls = 0;
    maponly = (refresh_flags & docrtMapOnly) !== 0 ? 1 : 0;
    redrawonly = (refresh_flags & docrtRefresh) !== 0 ? 1 : 0;
    nocls = (refresh_flags & docrtNocls) !== 0 ? 1 : 0;
    if (!u.ux || program_state.in_docrt) {
        return;   /* display isn't ready yet */
    }
    program_state.in_docrt = TRUE;
    post_map$: {
        if (redrawonly) {
            await redraw_map(FALSE);
            break post_map$;
        }
        if (u.uswallow) {
            await swallowed(1);
            break post_map$;
        }
        if (Underwater() && !Is_waterlevel(u.uz)) {
            await under_water(1);
            break post_map$;
        }
        if (u.uburied) {
            /* [not implemented] */
            await under_ground(1);
            break post_map$;
        }
        /* shut down vision */
        await vision_recalc(2);
        /*
         * This routine assumes that cls() does the following:
         *      + fills the physical screen with the symbol for rock
         *      + clears the glyph buffer
         */
        if (!nocls) {
            await cls();
        }
        /* display memory */
        for (x = 1; x < COLNO; x = $c.i16(x + 1)) {
            lev = svl.level.locations[x][0];
            for (y = 0; y < ROWNO; y = $c.i16(y + 1), lev = $c.radd(lev, 1)) {
                await show_glyph(x, y, lev.glyph);
            }
        }
        /* see what is to be seen */
        await vision_recalc(0);
        /* overlay with monsters */
        await see_monsters();
    }
    if (!maponly) {
        /* perm_invent */
        await update_inventory();
        /* status */
        disp.botlx = TRUE;   /* force a redraw of the bottom lines */
        /* note: caller needs to call bot() to actually redraw status */
    }
    program_state.in_docrt = FALSE;
}
/* for panning beyond a clipped region; resend the current map data to
   the interface rather than use docrt()'s regeneration of that data */
/**
 * @param {number} cursor_on_u boolean
 * @returns {Promise<void>}
 */
export async function redraw_map(cursor_on_u) {   // display.c:1778
    let x = 0, y = 0, glyph = 0, bkglyphinfo = new $T.glyphinfo();
    bkglyphinfo.$copyFrom(nul_glyphinfo);
    /*
     * Not sure whether this is actually necessary; save and restore did
     * used to get much too involved with each dungeon level as it was
     * read and written.
     *
     * !u.ux: display isn't ready yet; (restoring || !on_level()): was part
     * of cliparound() but interface shouldn't access this much internals
     */
    if (!u.ux || suppress_map_output() || !on_level(u.uz0, u.uz)) {
        return;
    }
    /*
     * This yields sensible clipping when #terrain+getpos is in
     * progress and the screen displays something other than what
     * the map would currently be showing.
     */
    for (y = 0; y < ROWNO; y = $c.i16(y + 1)) {
        for (x = 1; x < COLNO; x = $c.i16(x + 1)) {
            glyph = gg.gbuf[y][x].glyphinfo.glyph;   /* not levl[x][y].glyph */
            await get_bkglyph_and_framecolor(x, y, new $c.FieldRef(bkglyphinfo, "glyph", "i32"),
                new $c.FieldRef(bkglyphinfo, "framecolor", "u32"));
            await print_glyph()($G.WIN_MAP, x, y,
                x < 0 || y < 0 || x >= COLNO || y >= ROWNO ? no_ginfo : gg.gbuf[y][x].glyphinfo, bkglyphinfo);
        }
    }
    await flush_screen(cursor_on_u);
    nhUse(glyph);
}
/*
 * =======================================================
 */
export function reglyph_darkroom() {   // display.c:1818
    let x = 0, y = 0, $t1, $t2, $t3, $t4, $t5;
    for (x = 1; x < COLNO; x = $c.i16(x + 1)) {
        for (y = 0; y < ROWNO; y = $c.i16(y + 1)) {
            const lev = $c.relem(svl.level.locations[x], y);
            if (!flags.dark_room) {
                if (lev.glyph === cmap_to_glyph(S.corr)
                    && lev.waslit) {
                    $t1 = cmap_to_glyph(S.litcorr), lev.glyph = $t1;
                }
            } else {
                if (lev.glyph === cmap_to_glyph(S.litcorr)
                    && !cansee(x, y)) {
                    $t2 = cmap_to_glyph(S.corr), lev.glyph = $t2;
                }
            }
            if (!flags.dark_room || !iflags.wc_color
                || Is_rogue_level(u.uz)) {
                if (lev.glyph === cmap_to_glyph(S.darkroom)) {
                    $t3 = lev.waslit ? cmap_to_glyph(S.room)
                        : GLYPH_NOTHING, lev.glyph = $t3;
                }
            } else {
                if (lev.glyph === cmap_to_glyph(S.room) && lev.seenv
                    && lev.waslit && !cansee(x, y)) {
                    $t4 = cmap_to_glyph(S.darkroom), lev.glyph = $t4;
                } else if (lev.glyph === GLYPH_NOTHING
                    && lev.typ === ROOM && lev.seenv && !cansee(x, y)) {
                    $t5 = cmap_to_glyph(S.darkroom), lev.glyph = $t5;
                }
            }
        }
    }
    if (flags.dark_room && iflags.wc_color) {
        gs.showsyms[S.darkroom] = gs.showsyms[S.room];
    } else {
        gs.showsyms[S.darkroom] = gs.showsyms[SYM.NOTHING + SYM_OFF_X];
    }
}
/* ======================================================================== */
/* Glyph Buffering (3rd screen) =========================================== */
/* FIXME: This is a dirty hack, because newsym() doesn't distinguish
 * between object piles and single objects, it doesn't mark the location
 * for update. */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function newsym_force(x, y) {   // display.c:1863
    await newsym(x, y);
    gg.gbuf[y][x].gnew = 1;
    if (gg.gbuf_start[y] > x) {
        gg.gbuf_start[y] = x;
    }
    if (gg.gbuf_stop[y] < x) {
        gg.gbuf_stop[y] = x;
    }
}
/*
 * Store the glyph in the 3rd screen for later flushing.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} glyph int
 * @returns {Promise<void>}
 */
export async function show_glyph(x, y, glyph) {   // display.c:1877
    let glyphinfo = new $T.glyphinfo(), buf = new Int8Array(256), cc = new $T.nhcoord(), firstmatch = [null];
    let show_glyph_change = FALSE;
    /* don't process map glyphs when saving, restoring, or in_mklev */
    if (_suppress_map_output()) {
        return;
    }
    //if (glyph == 3972 || glyph == 3988)
    //    __debugbreak();
    /*
     * Check for bad positions and glyphs.
     */
    if (!isok(x, y)) {
        let text = $C``;
        let offset = -1;
        /* column 0 is invalid, but it's often used as a flag, so ignore it */
        if (x === 0) {
            return;
        }
        /*
         *  This assumes an ordering of the offsets.  See display.h for
         *  the definition.
         */
        if (glyph < 0 || glyph >= MAX_GLYPH) {
            /* invalid location and also invalid glyph */
            text = $C`invalid`;
        } else if ((offset = glyph - GLYPH.NOTHING_OFF | 0) >= 0) {
            text = $C`nothing`;
        } else if ((offset = glyph - GLYPH.UNEXPLORED_OFF | 0) >= 0) {
            text = $C`unexplored`;
        } else if ((offset = glyph - GLYPH.STATUE_FEM_PILETOP_OFF | 0) >= 0) {
            text = $C`statue of a female monster at top of a pile`;
        } else if ((offset = glyph - GLYPH.STATUE_MALE_PILETOP_OFF | 0) >= 0) {
            text = $C`statue of a male monster at top of a pile`;
        } else if ((offset = glyph - GLYPH.BODY_PILETOP_OFF | 0) >= 0) {
            text = $C`body at top of a pile`;
        } else if ((offset = glyph - GLYPH.OBJ_PILETOP_OFF | 0) >= 0) {
            text = glyph_is_piletop_generic_obj(glyph)
                ? $C`generic object at top of a pile`
                : $C`object at top of a pile`;
        } else if ((offset = glyph - GLYPH.STATUE_FEM_OFF | 0) >= 0) {
            text = $C`statue of female monster`;
        } else if ((offset = glyph - GLYPH.STATUE_MALE_OFF | 0) >= 0) {
            text = $C`statue of male monster`;
        } else if ((offset = glyph - GLYPH.WARNING_OFF | 0) >= 0) {
            /* warn flash */
            text = $C`warning explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_FROSTY_OFF | 0) >= 0) {
            text = $C`frosty explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_FIERY_OFF | 0) >= 0) {
            text = $C`fiery explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_MAGICAL_OFF | 0) >= 0) {
            text = $C`magical explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_WET_OFF | 0) >= 0) {
            text = $C`wet explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_MUDDY_OFF | 0) >= 0) {
            text = $C`muddy explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_NOXIOUS_OFF | 0) >= 0) {
            text = $C`noxious explosion`;
        } else if ((offset = glyph - GLYPH.EXPLODE_DARK_OFF | 0) >= 0) {
            text = $C`dark explosion`;
        } else if ((offset = glyph - GLYPH.SWALLOW_OFF | 0) >= 0) {
            text = $C`swallow`;
        } else if ((offset = glyph - GLYPH.CMAP_C_OFF | 0) >= 0) {
            text = $C`cmap C`;
        } else if ((offset = glyph - GLYPH.ZAP_OFF | 0) >= 0) {
            text = $C`zap`;
        } else if ((offset = glyph - GLYPH.CMAP_B_OFF | 0) >= 0) {
            text = $C`cmap B`;
        } else if ((offset = glyph - GLYPH.ALTAR_OFF | 0) >= 0) {
            text = $C`altar`;
        } else if ((offset = glyph - GLYPH.CMAP_A_OFF | 0) >= 0) {
            text = $C`cmap A`;
        } else if ((offset = glyph - GLYPH.CMAP_SOKO_OFF | 0) >= 0) {
            text = $C`sokoban dungeon walls`;
        } else if ((offset = glyph - GLYPH.CMAP_KNOX_OFF | 0) >= 0) {
            text = $C`knox dungeon walls`;
        } else if ((offset = glyph - GLYPH.CMAP_GEH_OFF | 0) >= 0) {
            text = $C`gehennom dungeon walls`;
        } else if ((offset = glyph - GLYPH.CMAP_MINES_OFF | 0) >= 0) {
            text = $C`gnomish mines dungeon walls`;
        } else if ((offset = glyph - GLYPH.CMAP_MAIN_OFF | 0) >= 0) {
            text = $C`main dungeon walls`;
        } else if ((offset = glyph - GLYPH.CMAP_STONE_OFF | 0) >= 0) {
            text = $C`stone`;
        } else if ((offset = glyph - GLYPH.OBJ_OFF | 0) >= 0) {
            text = glyph_is_normal_generic_obj(glyph)
                ? $C`generic object`
                : $C`object`;
        } else if ((offset = glyph - GLYPH.RIDDEN_FEM_OFF | 0) >= 0) {
            text = $C`ridden female monster`;
        } else if ((offset = glyph - GLYPH.RIDDEN_MALE_OFF | 0) >= 0) {
            text = $C`ridden male monster`;
        } else if ((offset = glyph - GLYPH.BODY_OFF | 0) >= 0) {
            text = $C`body`;
        } else if ((offset = glyph - GLYPH.DETECT_FEM_OFF | 0) >= 0) {
            text = $C`detected female monster`;
        } else if ((offset = glyph - GLYPH.DETECT_MALE_OFF | 0) >= 0) {
            text = $C`detected male monster`;
        } else if ((offset = glyph - GLYPH.INVIS_OFF | 0) >= 0) {
            text = $C`invisible monster`;
        } else if ((offset = glyph - GLYPH.PET_FEM_OFF | 0) >= 0) {
            text = $C`female pet`;
        } else if ((offset = glyph - GLYPH.PET_MALE_OFF | 0) >= 0) {
            text = $C`male pet`;
        } else if ((offset = glyph - GLYPH.MON_FEM_OFF | 0) >= 0) {
            text = $C`female monster`;
        } else if ((offset = glyph - GLYPH.MON_MALE_OFF) >= 0) {
            text = $C`male monster`;
        }
        await impossible($C`show_glyph:  bad pos <%d,%d> with glyph %d [%s %d].`,
            x, y, glyph, text, offset);
        return;
    } else if (glyph < 0 || glyph >= MAX_GLYPH) {
        /* valid location but invalid glyph */
        await impossible($C`show_glyph:  bad glyph %d [max %d] at <%d,%d>.`,
            glyph, MAX_GLYPH, x, y);
        return;
    }
    /* without UNBUFFERED_GLYPHINFO defined the glyphinfo values are buffered
       alongside the glyphs themselves for better performance, increased
       buffer size */
    map_glyphinfo(x, y, glyph, 0, glyphinfo);
    const oldglyph = gg.gbuf[y][x].glyphinfo.glyph;
    if (a11y.glyph_updates && !a11y.mon_notices_blocked
        && !program_state.in_docrt && !program_state.gameover
        && !program_state.in_getlev && !program_state.stopprint
        && !_suppress_map_output()
        && (oldglyph !== glyph || gg.gbuf[y][x].gnew)) {
        const c = glyph_to_cmap(glyph);
        if ((glyph_is_nothing(oldglyph) || glyph_is_unexplored(oldglyph)
            || is_cmap_furniture(c))
            && !is_cmap_wall(c) && !is_cmap_room(c)) {
            if (a11y.mon_notices && glyph_is_monster(glyph)
                || (oldglyph >= GLYPH.MON_MALE_OFF && oldglyph < GLYPH.MON_MALE_OFF + NUMMONS || oldglyph >= GLYPH.MON_FEM_OFF && oldglyph < GLYPH.MON_FEM_OFF + NUMMONS || (oldglyph >= GLYPH.PET_MALE_OFF && oldglyph < GLYPH.PET_MALE_OFF + NUMMONS || oldglyph >= GLYPH.PET_FEM_OFF && oldglyph < GLYPH.PET_FEM_OFF + NUMMONS) || (oldglyph >= GLYPH.RIDDEN_MALE_OFF && oldglyph < GLYPH.RIDDEN_MALE_OFF + NUMMONS || oldglyph >= GLYPH.RIDDEN_FEM_OFF && oldglyph < GLYPH.RIDDEN_FEM_OFF + NUMMONS) || (oldglyph >= GLYPH.DETECT_MALE_OFF && oldglyph < GLYPH.DETECT_MALE_OFF + NUMMONS || oldglyph >= GLYPH.DETECT_FEM_OFF && oldglyph < GLYPH.DETECT_FEM_OFF + NUMMONS))
                || u_at(x, y)) {
                /* nothing */
            } else {
                show_glyph_change = TRUE;
            }
        }
    }
    /* flags might change (single object vs pile, monster tamed or pet
       gone feral), color might change (altar's alignment converted by
       invisible hero), but ttychar normally won't change unless the
       glyph does too (changing boulder symbol would be an exception,
       but that triggers full redraw so doesn't matter here); still,
       be thorough and check everything */
    if (gg.gbuf[y][x].glyphinfo.glyph !== glyph
        || gg.gbuf[y][x].glyphinfo.ttychar !== glyphinfo.ttychar
        || gg.gbuf[y][x].glyphinfo.gm.customcolor !== glyphinfo.gm.customcolor
        || gg.gbuf[y][x].glyphinfo.gm.glyphflags !== glyphinfo.gm.glyphflags
        || gg.gbuf[y][x].glyphinfo.gm.sym.color !== glyphinfo.gm.sym.color
        || gg.gbuf[y][x].glyphinfo.gm.tileidx !== glyphinfo.gm.tileidx
        || iflags.use_background_glyph) {
        gg.gbuf[y][x].glyphinfo.glyph = glyph;
        gg.gbuf[y][x].gnew = 1;
        gg.gbuf[y][x].glyphinfo.glyph = glyphinfo.glyph;
        gg.gbuf[y][x].glyphinfo.ttychar = glyphinfo.ttychar;
        gg.gbuf[y][x].glyphinfo.gm.$copyFrom(glyphinfo.gm);
        if (gg.gbuf_start[y] > x) {
            gg.gbuf_start[y] = x;
        }
        if (gg.gbuf_stop[y] < x) {
            gg.gbuf_stop[y] = x;
        }
    }
    if (show_glyph_change) {
        const sym = 0;
        firstmatch[0] = null;
        const tmp_accessiblemsg = a11y.accessiblemsg;
        a11y.accessiblemsg = TRUE;
        cc.x = x, cc.y = y;
        await do_screen_description(cc.$clone(), TRUE, sym, new $c.Ptr(buf, 0), new $c.Ptr(firstmatch, 0), null);
        await pline_xy(x, y, $C`%s.`, firstmatch[0]);
        a11y.accessiblemsg = tmp_accessiblemsg;
    }
}
/*
 * Turn the 3rd screen into UNEXPLORED that needs to be refreshed.
 */
export function clear_glyph_buffer() {   // display.c:2107
    let x = 0, y = 0, $t1;
    let gptr = gg.gbuf[0][0];
    const giptr = gptr.glyphinfo;
    nul_gbuf.gnew = giptr.ttychar !== nul_gbuf.glyphinfo.ttychar
        || giptr.gm.sym.color !== nul_gbuf.glyphinfo.gm.sym.color
        || giptr.gm.glyphflags
        !== nul_gbuf.glyphinfo.gm.glyphflags
        || giptr.gm.customcolor
        !== nul_gbuf.glyphinfo.gm.customcolor
        || giptr.gm.tileidx !== nul_gbuf.glyphinfo.gm.tileidx
        ? 1 : 0;
    for (y = 0; y < ROWNO; y = $c.i16(y + 1)) {
        gptr = gg.gbuf[y][0];
        for (x = COLNO; x; x = $c.i16(x - 1)) {
            ($t1 = gptr, gptr = $c.radd($t1, 1), $t1).$copyFrom(nul_gbuf);
        }
        gg.gbuf_start[y] = 1;
        gg.gbuf_stop[y] = COLNO - 1;
    }
}
/* used by tty after menu or text popup has temporarily overwritten the map
   and it has been erased so shows spaces, not necessarily S_unexplored */
/**
 * @param {number} start coordxy
 * @param {number} stop coordxy
 * @param {number} y coordxy
 * @returns {Promise<void>}
 */
export async function row_refresh(start, stop, y) {   // display.c:2147
    let x = 0, bkglyphinfo = new $T.glyphinfo();
    let gptr = gg.gbuf[0][0];
    bkglyphinfo.$copyFrom(nul_glyphinfo);
    const giptr = gptr.glyphinfo;
    const force = giptr.ttychar !== nul_gbuf.glyphinfo.ttychar
        || giptr.gm.sym.color !== nul_gbuf.glyphinfo.gm.sym.color
        || giptr.gm.glyphflags !== nul_gbuf.glyphinfo.gm.glyphflags
        || giptr.gm.customcolor !== nul_gbuf.glyphinfo.gm.customcolor
        || giptr.gm.tileidx !== nul_gbuf.glyphinfo.gm.tileidx
        ? 1 : 0;
    for (x = start; x <= stop; x = $c.i16(x + 1)) {
        gptr = $c.relem(gg.gbuf[y], x);
        const glyph = gptr.glyphinfo.glyph;
        await get_bkglyph_and_framecolor(x, y, new $c.FieldRef(bkglyphinfo, "glyph", "i32"),
            new $c.FieldRef(bkglyphinfo, "framecolor", "u32"));
        if (force || glyph !== GLYPH_UNEXPLORED
            || bkglyphinfo.framecolor !== NO_COLOR) {
            await print_glyph()($G.WIN_MAP, x, y,
                x < 0 || y < 0 || x >= COLNO || y >= ROWNO ? no_ginfo : gg.gbuf[y][x].glyphinfo, bkglyphinfo);
        }
    }
}
/**
 * @returns {Promise<void>}
 */
export async function cls() {   // display.c:2189
    if (cls$in_cls) {
        return;
    }
    cls$in_cls = TRUE;
    await display_nhwindow()($G.WIN_MESSAGE, FALSE);   /* flush messages */
    disp.botlx = TRUE;   /* force update of botl window */
    await clear_nhwindow()($G.WIN_MAP);   /* clear physical screen */
    clear_glyph_buffer();   /* force gbuf[][].glyph to unexplored */
    cls$in_cls = FALSE;
}
/*
 * Synch the third screen with the display.
 */
/**
 * @param {number} cursor_on_u int
 * @returns {Promise<void>}
 */
export async function flush_screen(cursor_on_u) {   // display.c:2208
    let x = 0, y = 0, bkglyphinfo = new $T.glyphinfo(), bkglyph = Int32Array.of(0), i = 0;
    /* Prevent infinite loops on errors:
     *      flush_screen->print_glyph->impossible->pline->flush_screen
     */
    bkglyphinfo.$copyFrom(nul_glyphinfo);
    /* 5.0: don't update map, status, or perm_invent during save/restore */
    if (_suppress_map_output()) {
        return;
    }
    if (cursor_on_u === -1) {
        flush_screen$delay_flushing = !flush_screen$delay_flushing ? 1 : 0;
    }
    if (flush_screen$delay_flushing) {
        return;
    }
    if (flush_screen$flushing) {
        return;   /* if already flushing then return */
    }
    flush_screen$flushing = 1;
    if (program_state.done_hup) {
        return;
    }
    /* get this done now, before we place the cursor on the hero */
    if (disp.botl || disp.botlx) {
        await bot();
    } else if (disp.time_botl) {
        await timebot();
    }
    for (y = 0; y < ROWNO; y = $c.i16(y + 1)) {
        let gptr = $c.relem(gg.gbuf[y], x = gg.gbuf_start[y]);
        for (; x <= gg.gbuf_stop[y]; gptr = $c.radd(gptr, 1), x = $c.i16(x + 1)) {
            await get_bkglyph_and_framecolor(x, y, new $c.Ptr(bkglyph, 0),
                new $c.FieldRef(bkglyphinfo, "framecolor", "u32"));
            if (gptr.gnew
                || gw.wsettings.map_frame_color !== NO_COLOR
                && bkglyphinfo.framecolor !== NO_COLOR) {
                /* map_glyphinfo() won't touch framecolor */
                map_glyphinfo(x, y, bkglyph[0], 0, bkglyphinfo);
                await print_glyph()($G.WIN_MAP, x, y,
                    x < 0 || y < 0 || x >= COLNO || y >= ROWNO ? no_ginfo : gg.gbuf[y][x].glyphinfo,
                    bkglyphinfo);
                gptr.gnew = 0;
            }
        }
    }
    {
        for (i = 0; i < ROWNO; i = i + 1) {
            gg.gbuf_start[i] = COLNO - 1;
            gg.gbuf_stop[i] = 0;
        }
    }
    /* after map update, before display_nhwindow(WIN_MAP) */
    if (cursor_on_u) {
        await curs()($G.WIN_MAP, u.ux, u.uy);   /* move cursor to the hero */
    }
    await display_nhwindow()($G.WIN_MAP, FALSE);
    flush_screen$flushing = 0;
}
/* ======================================================================== */
/*
 * back_to_glyph()
 *
 * Use the information in the rm structure at the given position to create
 * a glyph of a background.
 *
 * I had to add a field in the rm structure (horizontal) so that we knew
 * if open doors and secret doors were horizontal or vertical.  Previously,
 * the screen symbol had the horizontal/vertical information set at
 * level generation time.
 *
 * I used the 'ladder' field (really doormask) for deciding if stairwells
 * were up or down.  I didn't want to check the upstairs and dnstairs
 * variables.
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {Promise<number>} int
 */
export async function back_to_glyph(x, y) {   // display.c:2287
    let idx = 0, sway = null;
    let bypass_glyph = NO_GLYPH;
    const ptr = $c.relem(svl.level.locations[x], y);
    switch (ptr.typ) {
        case SCORR:
        case STONE:
            idx = svl.level.flags.arboreal ? S.tree : S.stone;
            break;
        case ROOM:
            idx = S.room;
            break;
        case CORR:
            idx = ptr.waslit || flags.lit_corridor ? S.litcorr : S.corr;
            break;
        case SDOOR:
            if (ptr.candig) {
                idx = S.tree;
                break;
            }
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
            /*FALLTHRU*/
            idx = ptr.seenv ? await wall_angle(ptr) : S.stone;
            break;
        case DOOR:
            if (ptr.flags) {
                if (ptr.flags & D.BROKEN) {
                    idx = S.ndoor;
                } else if (ptr.flags & D.ISOPEN) {
                    idx = ptr.horizontal ? S.hodoor : S.vodoor;
                } else {
                    /* else is closed */
                    idx = ptr.horizontal ? S.hcdoor : S.vcdoor;
                }
            } else {
                idx = S.ndoor;
            }
            break;
        case IRONBARS:
            idx = S.bars;
            break;
        case TREE:
            idx = S.tree;
            break;
        case POOL:
        case MOAT:
            idx = S.pool;
            break;
        case STAIRS:
            sway = stairway_at(x, y);
            if (known_branch_stairs(sway)) {
                idx = ptr.flags & LA.DOWN ? S.brdnstair : S.brupstair;
            } else {
                idx = ptr.flags & LA.DOWN ? S.dnstair : S.upstair;
            }
            break;
        case LADDER:
            sway = stairway_at(x, y);
            if (known_branch_stairs(sway)) {
                idx = ptr.flags & LA.DOWN ? S.brdnladder : S.brupladder;
            } else {
                idx = ptr.flags & LA.DOWN ? S.dnladder : S.upladder;
            }
            break;
        case FOUNTAIN:
            idx = S.fountain;
            break;
        case SINK:
            idx = S.sink;
            break;
        case ALTAR:
            idx = S.altar;   /* not really used */
            bypass_glyph = (ptr.flags & AM.SANCTUM) === AM.SANCTUM ? GLYPH.ALTAR_OFF + altar_other : (ptr.flags & AM.MASK) === AM.LAWFUL ? GLYPH.ALTAR_OFF + altar_lawful : (ptr.flags & AM.MASK) === AM.NEUTRAL ? GLYPH.ALTAR_OFF + altar_neutral : (ptr.flags & AM.MASK) === AM.CHAOTIC ? GLYPH.ALTAR_OFF + altar_chaotic : GLYPH.ALTAR_OFF + altar_unaligned;
            break;
        case GRAVE:
            idx = S.grave;
            break;
        case THRONE:
            idx = S.throne;
            break;
        case LAVAPOOL:
            idx = S.lava;
            break;
        case LAVAWALL:
            idx = S.lavawall;
            break;
        case ICE:
            idx = S.ice;
            break;
        case AIR:
            idx = S.air;
            break;
        case CLOUD:
            idx = S.cloud;
            break;
        case WATER:
            idx = S.water;
            break;
        case DBWALL:
            idx = ptr.horizontal ? S.hcdbridge : S.vcdbridge;
            break;
        case DRAWBRIDGE_UP:
            switch (ptr.flags & DB.UNDER) {
                case DB.MOAT:
                    idx = S.pool;
                    break;
                case DB.LAVA:
                    idx = S.lava;
                    break;
                case DB.ICE:
                    idx = S.ice;
                    break;
                case DB.FLOOR:
                    idx = S.room;
                    break;
                default:
                    await impossible($C`Strange db-under: %d`,
                        ptr.flags & DB.UNDER);
                    idx = S.room;   /* something is better than nothing */
                    break;
            }
            break;
        case DRAWBRIDGE_DOWN:
            idx = ptr.horizontal ? S.hodbridge : S.vodbridge;
            break;
        default:
            await impossible($C`back_to_glyph:  unknown level type [ = %d ]`, ptr.typ);
            idx = S.room;
            break;
    }
    return bypass_glyph !== NO_GLYPH ? bypass_glyph : (idx === S.stone ? GLYPH.CMAP_STONE_OFF : idx <= S.trwall ? (idx - S.vwall | 0) + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) | 0 : idx < S.altar ? (idx - S.ndoor | 0) + GLYPH.CMAP_A_OFF | 0 : idx === S.altar ? 4008 : idx < S.arrow_trap + MAXTCHARS ? (idx - S.grave | 0) + GLYPH.CMAP_B_OFF | 0 : idx <= S.goodpos ? (idx - S.digbeam | 0) + GLYPH.CMAP_C_OFF | 0 : NO_GLYPH);
}
/*
 * swallow_to_glyph()
 *
 * Convert a monster number and a swallow location into the correct glyph.
 * If you don't want a patchwork monster while hallucinating, decide on
 * a random monster in swallowed() and don't use what_mon() here.
 */
/**
 * @param {number} mnum int
 * @param {number} loc int
 * @returns {Promise<number>} int
 */
async function swallow_to_glyph(mnum, loc) {   // display.c:2437
    const m_3 = (u.uprops[HALLUC].intrinsic && !(u.uprops[HALLUC_RES].intrinsic || u.uprops[HALLUC_RES].extrinsic) ? await rn2_on_display_rng(NUMMONS) : mnum) << 3;
    if (loc < S.sw_tl || S.sw_br < loc) {
        await impossible($C`swallow_to_glyph: bad swallow location`);
        loc = S.sw_br;
    }
    return (m_3 | (loc - S.sw_tl | 0)) + GLYPH.SWALLOW_OFF | 0;
}
/*
 * zapdir_to_glyph()
 *
 * Change the given zap direction and beam type into a glyph.  Each beam
 * type has four glyphs, one for each of the symbols below.  The order of
 * the zap symbols [0-3] as defined in defsym.h are:
 *
 *      |  S_vbeam      ( 0, 1) or ( 0,-1)
 *      -  S_hbeam      ( 1, 0) or (-1, 0)
 *      \  S_lslant     ( 1, 1) or (-1,-1)
 *      /  S_rslant     (-1, 1) or ( 1,-1)
 */
/**
 * @param {number} dx int
 * @param {number} dy int
 * @param {number} beam_type int
 * @returns {Promise<number>} int
 */
export async function zapdir_to_glyph(dx, dy, beam_type) {   // display.c:2461
    if (beam_type >= NUM_ZAP) {
        await impossible($C`zapdir_to_glyph:  illegal beam type`);
        beam_type = 0;
    }
    dx = dx === dy ? 2 : dx && dy ? 3 : dx ? 1 : 0;
    return (beam_type << 2 | dx) + GLYPH.ZAP_OFF | 0;
}
/*
 * Utility routine for dowhatis() used to find out the glyph displayed at
 * the location.  This isn't necessarily the same as the glyph in the levl
 * structure, so we must check the "third screen".
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {number} int
 */
export function glyph_at(x, y) {   // display.c:2478
    if (x < 0 || y < 0 || x >= COLNO || y >= ROWNO) {
        return cmap_to_glyph(S.room);   /* XXX */
    }
    return gg.gbuf[y][x].glyphinfo.glyph;   /* _glyph_at(x,y) */
}
/* ginfo declared at file scope */
/*
 * Get the glyph for the background so that it can potentially
 * be merged into graphical window ports to improve the appearance
 * of stuff on dark room squares and the plane of air etc.
 * [This should be using background as recorded for #overview rather
 * than current data from the map.]
 *
 * Also get the frame color to use for highlighting the map location
 * for some purpose.
 *
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {*} bkglyph int *
 * @param {*} framecolor uint32 *
 * @returns {Promise<void>}
 */
async function get_bkglyph_and_framecolor(x, y, bkglyph, framecolor) {   // display.c:2507
    let idx = 0;
    let tmp_bkglyph = GLYPH_UNEXPLORED;
    const lev = $c.relem(svl.level.locations[x], y);
    if (iflags.use_background_glyph && lev.seenv !== 0
        && gg.gbuf[y][x].glyphinfo.glyph !== GLYPH_UNEXPLORED) {
        switch (lev.typ) {
            case SCORR:
            case STONE:
                idx = svl.level.flags.arboreal ? S.tree : S.stone;
                break;
            case ROOM:
                idx = S.room;
                break;
            case CORR:
                idx = lev.waslit || flags.lit_corridor ? S.litcorr : S.corr;
                break;
            case ICE:
                idx = S.ice;
                break;
            case AIR:
                idx = S.air;
                break;
            case CLOUD:
                idx = S.cloud;
                break;
            case POOL:
            case MOAT:
                idx = S.pool;
                break;
            case WATER:
                idx = S.water;
                break;
            case LAVAPOOL:
                idx = S.lava;
                break;
            case LAVAWALL:
                idx = S.lavawall;
                break;
            default:
                idx = S.room;
                break;
        }
        if (!cansee(x, y) && (!lev.waslit || flags.dark_room)) {
            /* Floor spaces and corridors are dark if unlit. */
            if (lev.typ === CORR && idx === S.litcorr) {
                idx = S.corr;
            } else if (idx === S.room) {
                idx = flags.dark_room && iflags.wc_color
                    ? DARKROOMSYM() : S.stone;
            }
        }
        if (idx !== S.room) {
            tmp_bkglyph = (idx === S.stone ? GLYPH.CMAP_STONE_OFF : idx <= S.trwall ? (idx - S.vwall | 0) + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) | 0 : idx < S.altar ? (idx - S.ndoor | 0) + GLYPH.CMAP_A_OFF | 0 : idx === S.altar ? 4008 : idx < S.arrow_trap + MAXTCHARS ? (idx - S.grave | 0) + GLYPH.CMAP_B_OFF | 0 : idx <= S.goodpos ? (idx - S.digbeam | 0) + GLYPH.CMAP_C_OFF | 0 : NO_GLYPH);
        }
    }
    bkglyph.set(0, tmp_bkglyph);
    /* this guard should be unnecessary */
    if (iflags.bgcolors
        && gw.wsettings.map_frame_color !== NO_COLOR && await mapxy_valid(x, y)) {
        framecolor.set(0, gw.wsettings.map_frame_color);
    } else {
        framecolor.set(0, NO_COLOR);
    }
}
/* masks for per-level variances kept in gg.glyphmap_perlevel_flags */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} glyph int
 * @param {number} mgflags unsigned int
 * @param {$T.glyphinfo | null} glyphinfo glyph_info *
 */
export function map_glyphinfo(x, y, glyph, mgflags, glyphinfo) {   // display.c:2594
    /* verify hero or steed (not something underneath
       when hero is invisible without see invisible,
       or a temporary display effect like an explosion);
       this is only approximate, because hero might be
       mimicking an object (after eating mimic corpse or
       if polyd into mimic) or furniture (only if polyd) */
    const is_you = u_at(x, y)
        && glyph_is_monster(glyph) ? 1 : 0;
    const gmap = $c.relem(glyphmap, glyph);
    glyphinfo.gm.$copyFrom(gmap);   /* glyphflags, sym.symidx, sym.color, tileidx */
    /*
     * Only hero tinkering permitted on-the-fly (who).
     * Unique glyphs in glyphmap[] determine everything else (what).
     *
     * (Note: if hero is invisible without see invisible, he/she usually
     * can't see himself/herself.  This applies to accessibility hacks
     * as well as to regular display.)
     */
    if (is_you) {
        if (!iflags.wc_color || Upolyd() || glyph !== ((u.umonnum !== u.umonster || !flags.showrace ? u.umonnum : gu.urace.mnum) + (((u.umonnum !== u.umonster ? u.mfemale : flags.female) ? 1 : 0) === MALE ? GLYPH.MON_MALE_OFF : GLYPH.MON_FEM_OFF) | 0)) {
            /* color tweak not needed (!use_color) or not wanted (poly'd
               or riding--which uses steed's color, not hero's) */
        } else if (HAS_ROGUE_IBM_GRAPHICS()
            && gs.symset[gc.currentgraphics].nocolor === 0) {
            /* actually player should be yellow-on-gray if in corridor */
            glyphinfo.gm.sym.color = CLR.YELLOW;
        } else if (flags.showrace) {
            /* for showrace, non-human hero is displayed by the symbol of
               corresponding type of monster rather than by '@' (handled
               by newsym()); we change the color to same as human hero */
            glyphinfo.gm.sym.color = CLR.WHITE;
        }
        /* accessibility
          This unchanging display character for hero was requested by
          a blind player to enhance screen reader use.
          Turn on override symbol if caller hasn't specified NOOVERRIDE. */
        if (sysopt.accessibility === 1 && !((mgflags & MG.FLAG_NOOVERRIDE) >>> 0)) {
            const offset = SYM.HERO_OVERRIDE + SYM_OFF_X;
            if ($c.and64(gg.glyphmap_perlevel_flags, GMAP_ROGUELEVEL)
                ? go.ov_rogue_syms[offset]
                : go.ov_primary_syms[offset]) {
                glyphinfo.gm.sym.symidx = offset;
            }
        }
        glyphinfo.gm.glyphflags = (glyphinfo.gm.glyphflags | MG.HERO) >>> 0;
    }
    if (sysopt.accessibility === 1
        && (mgflags & MG.FLAG_NOOVERRIDE) >>> 0 && glyph_is_pet(glyph)) {
        /* one more accessibility kludge;
           turn off override symbol if caller has specified NOOVERRIDE */
        glyphinfo.gm.sym.symidx = mons[glyph_to_mon(glyph)].mlet + SYM_OFF_M;
    }
    glyphinfo.ttychar = gs.showsyms[glyphinfo.gm.sym.symidx];
    glyphinfo.glyph = glyph;
}
/**
 * @param {number} cmap int
 * @returns {number} int
 */
function cmap_to_roguecolor(cmap) {   // display.c:2699
    let color = NO_COLOR;
    if (gs.symset[gc.currentgraphics].nocolor) {
        return NO_COLOR;
    }
    if (cmap >= S.vwall && cmap <= S.hcdoor) {
        color = CLR.BROWN;
    } else if (cmap >= S.arrow_trap && cmap <= S.polymorph_trap) {
        color = CLR.MAGENTA;
    } else if (cmap === S.corr || cmap === S.litcorr) {
        color = CLR.GRAY;
    } else if (cmap >= S.room && cmap <= S.water
        && cmap !== S.darkroom) {
        color = CLR.GREEN;
    } else {
        color = NO_COLOR;
    }
    return color;
}
/*
   reset_glyphmap(trigger)

   The glyphmap likely needs to be re-calculated for the following triggers:

   gm_levelchange    called when the player has gone to a new level.

   gm_symchange      called if someone has interactively altered the symbols
                     for the game, most likely at the options menu.

   gm_optionchange   The game settings have been toggled and some of them
                     are configured to trigger a reset_glyphmap()

   gm_accessibility_change  One of the accessibility flags has changed.

*/
/**
 * @param {number} trigger enum glyphmap_change_triggers
 */
export function reset_glyphmap(trigger) {   // display.c:2739
    let glyph = 0, offset = 0;
    let color = NO_COLOR;
    /* condense multiple tests in macro version down to single */
    const has_rogue_ibm_graphics = HAS_ROGUE_IBM_GRAPHICS();
    const has_rogue_color = has_rogue_ibm_graphics
        && gs.symset[gc.currentgraphics].nocolor === 0 ? 1 : 0;
    if (trigger === gm_levelchange) {
        gg.glyphmap_perlevel_flags = 0;
    }
    if (!gg.glyphmap_perlevel_flags) {
        /*
         *    GMAP_SET                0x00000001
         *    GMAP_ROGUELEVEL         0x00000002
         */
        gg.glyphmap_perlevel_flags = $c.or64(gg.glyphmap_perlevel_flags, GMAP_SET);
        if (Is_rogue_level(u.uz)) {
            gg.glyphmap_perlevel_flags = $c.or64(gg.glyphmap_perlevel_flags, GMAP_ROGUELEVEL);
        }
    }
    for (glyph = 0; glyph < MAX_GLYPH; glyph = glyph + 1) {
        const gmap = $c.relem(glyphmap, glyph);
        gmap.glyphflags = 0;
        /*
         *  Map the glyph to a character and color.
         *
         *  Warning:  For speed, this makes an assumption on the order of
         *            offsets.  The order is set in display.h.
         */
        if ((offset = glyph - GLYPH.NOTHING_OFF | 0) >= 0) {
            gmap.sym.symidx = SYM.NOTHING + SYM_OFF_X;
            color = NO_COLOR;
            gmap.glyphflags = (gmap.glyphflags | MG.NOTHING) >>> 0;
        } else if ((offset = glyph - GLYPH.UNEXPLORED_OFF | 0) >= 0) {
            gmap.sym.symidx = SYM.UNEXPLORED + SYM_OFF_X;
            color = NO_COLOR;
            gmap.glyphflags = (gmap.glyphflags | MG.UNEXPL) >>> 0;
        } else if ((offset = glyph - GLYPH.STATUE_FEM_PILETOP_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? objects[STATUE].oc_color : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.STATUE | MG.FEMALE | MG.OBJPILE)) >>> 0;
        } else if ((offset = glyph - GLYPH.STATUE_MALE_PILETOP_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? objects[STATUE].oc_color : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.STATUE | MG.MALE | MG.OBJPILE)) >>> 0;
        } else if ((offset = glyph - GLYPH.BODY_PILETOP_OFF | 0) >= 0) {
            gmap.sym.symidx = objects[CORPSE].oc_class + SYM_OFF_O;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.CORPSE | MG.OBJPILE)) >>> 0;
        } else if ((offset = glyph - GLYPH.OBJ_PILETOP_OFF | 0) >= 0) {
            gmap.sym.symidx = objects[offset].oc_class + SYM_OFF_O;
            if (offset === BOULDER) {
                gmap.sym.symidx = SYM.BOULDER + SYM_OFF_X;
            }
            if (has_rogue_color) {
                switch (objects[offset].oc_class) {
                    case COIN_CLASS:
                        color = CLR.YELLOW;
                        break;
                    case FOOD_CLASS:
                        color = CLR.RED;
                        break;
                    default:
                        color = CLR.BRIGHT_BLUE;
                        break;
                }
            } else {
                color = iflags.wc_color ? objects[offset].oc_color : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | MG.OBJPILE) >>> 0;
        } else if ((offset = glyph - GLYPH.STATUE_FEM_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? objects[STATUE].oc_color : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.STATUE | MG.FEMALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.STATUE_MALE_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? objects[STATUE].oc_color : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.STATUE | MG.MALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.WARNING_OFF | 0)
            >= 0) {
            /* warn flash */
            gmap.sym.symidx = offset + SYM_OFF_W | 0;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? def_warnsyms[offset].color : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.EXPLODE_FROSTY_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_frosty] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_FIERY_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_fiery] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_MAGICAL_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_magical] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_WET_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_wet] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_MUDDY_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_muddy] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_NOXIOUS_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_noxious] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.EXPLODE_DARK_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.expl_tl + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? explodecolors[expl_dark] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.SWALLOW_OFF | 0) >= 0) {
            /* see swallow_to_glyph() in display.c */
            gmap.sym.symidx = S.sw_tl + (offset & 7) + SYM_OFF_P;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset >> 3].mcolor : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.CMAP_C_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.digbeam + offset | 0) + SYM_OFF_P;
            if (has_rogue_color) {
                color = cmap_to_roguecolor(S.digbeam + offset | 0);
            } else {
                color = iflags.wc_color ? defsyms[S.digbeam + offset | 0].color : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.ZAP_OFF | 0) >= 0) {
            /* see zapdir_to_glyph() in display.c */
            gmap.sym.symidx = S.vbeam + (offset & 3) + SYM_OFF_P;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? zapcolors[offset >> 2] : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.CMAP_B_OFF | 0) >= 0) {
            const cmap = S.grave + offset | 0;
            const sym = gs.showsyms[cmap + SYM_OFF_P];
            gmap.sym.symidx = cmap + SYM_OFF_P;
            color = iflags.wc_color ? defsyms[cmap].color : NO_COLOR;
            if (!iflags.wc_color) {
                let spec_cmap = 0;
                /* try to provide a visible difference between water and lava
                   if they use the same symbol and color is disabled;
                   similar for floor and ice, for fountain vs sink, and for
                   corridor engravings (CMAP_A below) */
                switch (cmap) {
                    case S.lava:
                    case S.lavawall:
                        if (sym === gs.showsyms[S.pool + SYM_OFF_P]
                            || sym === gs.showsyms[S.water + SYM_OFF_P]) {
                            spec_cmap = MG_BW_LAVA;
                        }
                        break;
                    case S.ice:
                        if (sym === gs.showsyms[S.room + SYM_OFF_P]
                            || sym === gs.showsyms[S.darkroom + SYM_OFF_P]) {
                            spec_cmap = MG.BW_ICE;
                        }
                        break;
                    case S.sink:
                        if (sym === gs.showsyms[S.fountain + SYM_OFF_P]) {
                            spec_cmap = MG_BW_SINK;
                        }
                        break;
                }
                gmap.glyphflags = (gmap.glyphflags | spec_cmap) >>> 0;
            } else if (has_rogue_color) {
                color = cmap_to_roguecolor(cmap);
            }
        } else if ((offset = glyph - GLYPH.ALTAR_OFF | 0) >= 0) {
            /* unaligned, chaotic, neutral, lawful, other altar */
            gmap.sym.symidx = S.altar + SYM_OFF_P;
            if (has_rogue_color) {
                color = cmap_to_roguecolor(S.altar);
            } else {
                color = iflags.wc_color ? altarcolors[offset] : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.CMAP_A_OFF | 0) >= 0) {
            const cmap$2 = S.ndoor + offset | 0;
            gmap.sym.symidx = cmap$2 + SYM_OFF_P;
            color = iflags.wc_color ? defsyms[cmap$2].color : NO_COLOR;
            const sym$2 = gs.showsyms[gmap.sym.symidx];
            /*
             *   Some specialty color mappings not hardcoded in data init
             */
            if (has_rogue_color) {
                color = cmap_to_roguecolor(cmap$2);
                /* provide a visible difference if normal and lit corridor
                   use the same symbol */
            } else if (cmap$2 === S.litcorr
                && sym$2 === gs.showsyms[S.corr + SYM_OFF_P]) {
                color = CLR.WHITE;
                /* likewise for corridor and engraving-in-corridor */
            } else if (cmap$2 === S.engrcorr
                && (sym$2 === gs.showsyms[S.corr + SYM_OFF_P]
                || sym$2 === gs.showsyms[S.litcorr + SYM_OFF_P])) {
                gmap.glyphflags = (gmap.glyphflags | MG.BW_ENGR) >>> 0;
            }
        } else if ((offset = glyph - GLYPH.CMAP_SOKO_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.vwall + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? wallcolors[sokoban_walls] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.CMAP_KNOX_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.vwall + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? wallcolors[knox_walls] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.CMAP_GEH_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.vwall + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? wallcolors[gehennom_walls] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.CMAP_MINES_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.vwall + offset | 0) + SYM_OFF_P;
            color = iflags.wc_color ? wallcolors[mines_walls] : NO_COLOR;
        } else if ((offset = glyph - GLYPH.CMAP_MAIN_OFF | 0) >= 0) {
            gmap.sym.symidx = (S.vwall + offset | 0) + SYM_OFF_P;
            if (has_rogue_color) {
                color = cmap_to_roguecolor(S.vwall + offset | 0);
            } else {
                color = iflags.wc_color ? wallcolors[main_walls] : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.CMAP_STONE_OFF | 0) >= 0) {
            gmap.sym.symidx = SYM_OFF_P;
            color = iflags.wc_color ? defsyms[S.stone].color : NO_COLOR;
        } else if ((offset = glyph - GLYPH.OBJ_OFF | 0) >= 0) {
            gmap.sym.symidx = objects[offset].oc_class + SYM_OFF_O;
            if (offset === BOULDER) {
                gmap.sym.symidx = SYM.BOULDER + SYM_OFF_X;
            }
            if (has_rogue_color) {
                switch (objects[offset].oc_class) {
                    case COIN_CLASS:
                        color = CLR.YELLOW;
                        break;
                    case FOOD_CLASS:
                        color = CLR.RED;
                        break;
                    default:
                        color = CLR.BRIGHT_BLUE;
                        break;
                }
            } else {
                color = iflags.wc_color ? objects[offset].oc_color : NO_COLOR;
            }
        } else if ((offset = glyph - GLYPH.RIDDEN_FEM_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            /* This currently implies that the hero is here -- monsters */
            /* don't ride (yet...).  Should we set it to yellow like in */
            /* the monster case below?  There is no equivalent in rogue.
             */
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.RIDDEN | MG.FEMALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.RIDDEN_MALE_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.RIDDEN | MG.MALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.BODY_OFF | 0) >= 0) {
            gmap.sym.symidx = objects[CORPSE].oc_class + SYM_OFF_O;
            if (has_rogue_color) {
                color = CLR.RED;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | MG.CORPSE) >>> 0;
        } else if ((offset = glyph - GLYPH.DETECT_FEM_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            /* Disabled for now; anyone want to get reverse video to work? */
            /* is_reverse = TRUE; */
            gmap.glyphflags = (gmap.glyphflags | (MG.DETECT | MG.FEMALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.DETECT_MALE_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            /* Disabled for now; anyone want to get reverse video to work? */
            /* is_reverse = TRUE; */
            gmap.glyphflags = (gmap.glyphflags | (MG.DETECT | MG.MALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.INVIS_OFF | 0) >= 0) {
            gmap.sym.symidx = SYM.INVISIBLE + SYM_OFF_X;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | MG.INVIS) >>> 0;
        } else if ((offset = glyph - GLYPH.PET_FEM_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.PET | MG.FEMALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.PET_MALE_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | (MG.PET | MG.MALE)) >>> 0;
        } else if ((offset = glyph - GLYPH.MON_FEM_OFF | 0) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = NO_COLOR;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | MG.FEMALE) >>> 0;
        } else if ((offset = glyph - GLYPH.MON_MALE_OFF) >= 0) {
            gmap.sym.symidx = mons[offset].mlet + SYM_OFF_M;
            if (has_rogue_color) {
                color = CLR.YELLOW;
            } else {
                color = iflags.wc_color ? mons[offset].mcolor : NO_COLOR;
            }
            gmap.glyphflags = (gmap.glyphflags | MG.MALE) >>> 0;
        }
        /* This was requested by a blind player to enhance screen reader use
         */
        if (sysopt.accessibility === 1 && (gmap.glyphflags & MG.PET) >>> 0 !== 0) {
            const pet_override = $c.and64(gg.glyphmap_perlevel_flags, GMAP_ROGUELEVEL)
                ? go.ov_rogue_syms[SYM.PET_OVERRIDE + SYM_OFF_X]
                : go.ov_primary_syms[SYM.PET_OVERRIDE + SYM_OFF_X];
            if (gs.showsyms[pet_override] !== 32) {
                gmap.sym.symidx = SYM.PET_OVERRIDE + SYM_OFF_X;
            }
        }
        /* Turn off color if no color defined, or rogue level w/o PC graphics.
         */
        if (!has_color(color)
            || $c.and64(gg.glyphmap_perlevel_flags, GMAP_ROGUELEVEL)
            && !has_rogue_color || !iflags.wc_color) {
            color = NO_COLOR;
        }
        gmap.sym.color = color;
    }
    gg.glyph_reset_timestamp = svm.moves;
}
/* ------------------------------------------------------------------------ */
/* Wall Angle ------------------------------------------------------------- */
/* count of positions flagged as bad */
/* WA_VERBOSE */
/*
 * Return 'which' if position is implies an unfinished exterior.  Return
 * zero otherwise.  Unfinished implies outer area is rock or a corridor.
 *
 * Things that are ambiguous: lava
 */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} which int
 * @returns {number} int
 */
function check_pos(x, y, which) {   // display.c:3130
    if (!isok(x, y)) {
        return which;
    }
    const type = svl.level.locations[x][y].typ;
    /* Everything below POOL, excluding TREE */
    if (IS_STWALL(type) || type === CORR || type === SCORR || IS_SDOOR(type)) {
        return which;
    }
    return 0;
}
/* Return TRUE if more than one is non-zero. */
/*ARGSUSED*/
/* Return the wall mode for a T wall. */
/**
 * @param {number} x0 coordxy
 * @param {number} y0 coordxy
 * @param {number} x1 coordxy
 * @param {number} y1 coordxy
 * @param {number} x2 coordxy
 * @param {number} y2 coordxy
 * @param {number} x3 coordxy
 * @param {number} y3 coordxy
 * @returns {number} int
 */
function set_twall(x0, y0, x1, y1, x2, y2, x3, y3) {   // display.c:3162
    let wmode = 0;
    /* used #if WA_VERBOSE */
    const is_1 = check_pos(x1, y1, WM.T_LONG);
    const is_2 = check_pos(x2, y2, WM.T_BL);
    const is_3 = check_pos(x3, y3, WM.T_BR);
    if (is_1 && is_2 | is_3 || is_2 && is_1 | is_3 || is_3 && is_1 | is_2) {
        wmode = 0;
    } else {
        wmode = (is_1 + is_2 | 0) + is_3 | 0;
    }
    return wmode;
}
/* Return wall mode for a horizontal or vertical wall. */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @param {number} horiz int
 * @returns {number} int
 */
function set_wall(x, y, horiz) {   // display.c:3187
    let wmode = 0, is_1 = 0, is_2 = 0;
    if (horiz) {
        is_1 = check_pos(x, $c.i16(y - 1), WM.W_LEFT);
        is_2 = check_pos(x, $c.i16(y + 1), WM.W_RIGHT);
    } else {
        is_1 = check_pos($c.i16(x - 1), y, WM.W_LEFT);
        is_2 = check_pos($c.i16(x + 1), y, WM.W_RIGHT);
    }
    if (is_1 && is_2 | 0 || is_2 && is_1 | 0 || 0) {
        wmode = 0;
    } else {
        wmode = is_1 + is_2 | 0;
    }
    return wmode;
}
/* Return a wall mode for a corner wall. (x4,y4) is the "inner" position. */
/**
 * @param {number} x1 coordxy
 * @param {number} y1 coordxy
 * @param {number} x2 coordxy
 * @param {number} y2 coordxy
 * @param {number} x3 coordxy
 * @param {number} y3 coordxy
 * @param {number} x4 coordxy
 * @param {number} y4 coordxy
 * @returns {number} int
 */
function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {   // display.c:3208
    let wmode = 0;
    const is_1 = $c.i16(check_pos(x1, y1, 1));
    const is_2 = $c.i16(check_pos(x2, y2, 1));
    const is_3 = $c.i16(check_pos(x3, y3, 1));
    const is_4 = $c.i16(check_pos(x4, y4, 1));   /* inner location */
    /*
     * All 4 should not be true.  So if the inner location is rock,
     * use it.  If all of the outer 3 are true, use outer.  We currently
     * can't cover the case where only part of the outer is rock, so
     * we just say that all the walls are finished (if not overridden
     * by the inner section).
     */
    if (is_4) {
        wmode = WM.C_INNER;
    } else if (is_1 && is_2 && is_3) {
        wmode = WM.C_OUTER;
    } else {
        wmode = 0;   /* finished walls on all sides */
    }
    return wmode;
}
/* Return mode for a crosswall. */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 * @returns {number} int
 */
function set_crosswall(x, y) {   // display.c:3240
    const is_1 = $c.i16(check_pos($c.i16(x - 1), $c.i16(y - 1), 1));
    const is_2 = $c.i16(check_pos($c.i16(x + 1), $c.i16(y - 1), 1));
    const is_3 = $c.i16(check_pos($c.i16(x + 1), $c.i16(y + 1), 1));
    const is_4 = $c.i16(check_pos($c.i16(x - 1), $c.i16(y + 1), 1));
    let wmode = $c.i16(is_1 + is_2 + is_3 + is_4);
    if (wmode > 1) {
        if (is_1 && is_3 && is_2 + is_4 === 0) {
            wmode = WM.X_TLBR;
        } else if (is_2 && is_4 && is_1 + is_3 === 0) {
            wmode = WM.X_BLTR;
        } else {
            wmode = 0;
        }
    } else if (is_1) {
        wmode = WM.X_TL;
    } else if (is_2) {
        wmode = WM.X_TR;
    } else if (is_3) {
        wmode = WM.X_BR;
    } else if (is_4) {
        wmode = WM.X_BL;
    }
    return wmode;
}
/* called for every <x,y> by set_wall_state() and for specific <x,y> during
   vault wall repair */
/**
 * @param {number} x coordxy
 * @param {number} y coordxy
 */
export function xy_set_wall_state(x, y) {   // display.c:3276
    let wmode = 0;
    const lev = $c.relem(svl.level.locations[x], y);
    switch (lev.typ) {
        case SDOOR:
            wmode = $c.i16(set_wall(x, y, lev.horizontal));
            break;
        case VWALL:
            wmode = $c.i16(set_wall(x, y, 0));
            break;
        case HWALL:
            wmode = $c.i16(set_wall(x, y, 1));
            break;
        case TDWALL:
            wmode = $c.i16(set_twall(x, y, x, $c.i16(y - 1), $c.i16(x - 1), $c.i16(y + 1), $c.i16(x + 1), $c.i16(y + 1)));
            break;
        case TUWALL:
            wmode = $c.i16(set_twall(x, y, x, $c.i16(y + 1), $c.i16(x + 1), $c.i16(y - 1), $c.i16(x - 1), $c.i16(y - 1)));
            break;
        case TLWALL:
            wmode = $c.i16(set_twall(x, y, $c.i16(x + 1), y, $c.i16(x - 1), $c.i16(y - 1), $c.i16(x - 1), $c.i16(y + 1)));
            break;
        case TRWALL:
            wmode = $c.i16(set_twall(x, y, $c.i16(x - 1), y, $c.i16(x + 1), $c.i16(y + 1), $c.i16(x + 1), $c.i16(y - 1)));
            break;
        case TLCORNER:
            wmode = $c.i16(set_corn($c.i16(x - 1), $c.i16(y - 1), x, $c.i16(y - 1), $c.i16(x - 1), y, $c.i16(x + 1), $c.i16(y + 1)));
            break;
        case TRCORNER:
            wmode = $c.i16(set_corn(x, $c.i16(y - 1), $c.i16(x + 1), $c.i16(y - 1), $c.i16(x + 1), y, $c.i16(x - 1), $c.i16(y + 1)));
            break;
        case BLCORNER:
            wmode = $c.i16(set_corn(x, $c.i16(y + 1), $c.i16(x - 1), $c.i16(y + 1), $c.i16(x - 1), y, $c.i16(x + 1), $c.i16(y - 1)));
            break;
        case BRCORNER:
            wmode = $c.i16(set_corn($c.i16(x + 1), y, $c.i16(x + 1), $c.i16(y + 1), x, $c.i16(y + 1), $c.i16(x - 1), $c.i16(y - 1)));
            break;
        case CROSSWALL:
            wmode = $c.i16(set_crosswall(x, y));
            break;
        default:
            wmode = -1;   /* don't set wall info */
            break;
    }
    if (wmode >= 0) {
        lev.flags = ((lev.flags & ~WM_MASK | wmode) >>> 0) & 31;
    }
}
/* Called from mklev.  Scan the level and set the wall modes. */
export function set_wall_state() {   // display.c:3330
    let x = 0, y = 0;
    for (x = 0; x < COLNO; x = $c.i16(x + 1)) {
        for (y = 0; y < ROWNO; y = $c.i16(y + 1)) {
            xy_set_wall_state(x, y);
        }
    }
    /* check if any bad positions found */
    /* only prcoordxy once */
    /* WA_VERBOSE */
}
/* negative: -1, zero: 0, positive +1; same as sgn() function (hacklib.c) */
/* Set the seen vector of lev as if seen from (x0,y0) to (x,y). */
/**
 * @param {$T.rm | null} lev struct rm *
 * @param {number} x0 coordxy
 * @param {number} y0 coordxy
 * @param {number} x coordxy
 * @param {number} y coordxy
 */
function set_seenv(lev, x0, y0, x, y) {   // display.c:3369
    /* from */
    /*  to  */
    const dx = $c.i16(x - x0);
    const dy = $c.i16(y0 - y);
    lev.seenv = $c.u8(lev.seenv | seenv_matrix[(dy < 0 ? -1 : dy !== 0 ? 1 : 0) + 1][(dx < 0 ? -1 : dx !== 0 ? 1 : 0) + 1]);
}
/* Called by blackout(vault.c) when vault guard removes temporary corridor,
   turning spot <x0,y0> back into stone; <x1,y1> is an adjacent spot. */
/**
 * @param {$T.rm | null} lev struct rm *
 * @param {number} x0 coordxy
 * @param {number} y0 coordxy
 * @param {number} x1 coordxy
 * @param {number} y1 coordxy
 */
export function unset_seenv(lev, x0, y0, x1, y1) {   // display.c:3384
    /* &levl[x1][y1] */
    /* from */
    /*  to; abs(x1-x0)==1 && abs(y0-y1)==1 */
    const dx = $c.i16(x1 - x0);
    const dy = $c.i16(y0 - y1);
    lev.seenv = $c.u8(lev.seenv & ~seenv_matrix[dy + 1][dx + 1]);
}
/* Print out a T wall warning and all interesting info. */
/**
 * @param {$T.rm | null} lev struct rm *
 * @returns {Promise<void>}
 */
async function t_warn(lev) {   // display.c:3453
    let wname = null;
    /* 5.0: non-T_wall cases added after shop repair (via breaching a wall,
       using locking magic to put a door there, then unlocking the door;
       D_CLOSED carried over to the wall) triggered warning for "unknown" */
    switch (lev.typ) {
        case TUWALL:
            wname = $C`tuwall`;
            break;
        case TLWALL:
            wname = $C`tlwall`;
            break;
        case TRWALL:
            wname = $C`trwall`;
            break;
        case TDWALL:
            wname = $C`tdwall`;
            break;
        case VWALL:
            wname = $C`vwall`;
            break;
        case HWALL:
            wname = $C`hwall`;
            break;
        case TLCORNER:
            wname = $C`tlcorner`;
            break;
        case TRCORNER:
            wname = $C`trcorner`;
            break;
        case BLCORNER:
            wname = $C`blcorner`;
            break;
        case BRCORNER:
            wname = $C`brcorner`;
            break;
        default:
            wname = $C`unknown`;
            break;
    }
    await impossible(new $c.Ptr(t_warn$warn_str, 0), wname, lev.flags & WM_MASK,
        lev.seenv);
}
/*
 * Return the correct graphics character index using wall type, wall mode,
 * and the seen vector.  It is expected that seenv is non zero.
 *
 * All T-wall vectors are rotated to be TDWALL.  All single crosswall
 * blocks are rotated to bottom right.  All double crosswall are rotated
 * to W_X_BLTR.  All results are converted back.
 *
 * The only way to understand this is to take out pen and paper and
 * draw diagrams.  See rm.h for more details on the wall modes and
 * seen vector (SV).
 */
/**
 * @param {$T.rm | null} lev struct rm *
 * @returns {Promise<number>} int
 */
async function wall_angle(lev) {   // display.c:3513
    let seenv = 0, row = null, col = 0, idx = 0, $goto = null;
    seenv = lev.seenv & 255;
    S1: for (;;) {
        switch ($goto !== null ? $goto : lev.typ) {
            case TUWALL:
                row = new $c.Ptr(wall_matrix[T_u], 0);
                seenv = ((seenv >>> 4 | seenv << 4 >>> 0) >>> 0 & 255) >>> 0;   /* rotate to tdwall */
                $goto = "do_twall"; continue S1;
            case TLWALL:
                row = new $c.Ptr(wall_matrix[T_l], 0);
                seenv = ((seenv >>> 2 | seenv << 6 >>> 0) >>> 0 & 255) >>> 0;   /* rotate to tdwall */
                $goto = "do_twall"; continue S1;
            case TRWALL:
                row = new $c.Ptr(wall_matrix[T_r], 0);
                seenv = ((seenv >>> 6 | seenv << 2 >>> 0) >>> 0 & 255) >>> 0;   /* rotate to tdwall */
                $goto = "do_twall"; continue S1;
            case TDWALL:
                row = new $c.Ptr(wall_matrix[T_d], 0);
            case "do_twall":
                $goto = null;   // do_twall:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        if (seenv === SV4) {
                            col = T_tlcorn;
                        } else if (seenv === SV6) {
                            col = T_trcorn;
                        } else if ((seenv & (SV3 | SV5 | SV7)) >>> 0
                            || (seenv & SV4) >>> 0 && (seenv & SV6) >>> 0) {
                            col = T_tdwall;
                        } else if ((seenv & (SV0 | SV1 | SV2)) >>> 0) {
                            col = (seenv & (SV4 | SV6)) >>> 0 ? T_tdwall : T_hwall;
                        } else {
                            await t_warn(lev);
                            col = T_stone;
                        }
                        break;
                    case WM.T_LONG:
                        if ((seenv & (SV3 | SV4)) >>> 0 && !((seenv & (SV5 | SV6 | SV7)) >>> 0)) {
                            col = T_tlcorn;
                        } else if ((seenv & (SV6 | SV7)) >>> 0 && !((seenv & (SV3 | SV4 | SV5)) >>> 0)) {
                            col = T_trcorn;
                        } else if ((seenv & SV5) >>> 0
                            || (seenv & (SV3 | SV4)) >>> 0 && (seenv & (SV6 | SV7)) >>> 0) {
                            col = T_tdwall;
                        } else {
                            /* only SV0|SV1|SV2 */
                            if (!((seenv & (SV0 | SV1 | SV2)) >>> 0 && !((seenv & 4294967288) >>> 0))) {
                                await t_warn(lev);
                            }
                            col = T_stone;
                        }
                        break;
                    case WM.T_BL:
                        if ((seenv & (SV4 | SV5)) >>> 0 && !((seenv & 4294967247) >>> 0)) {
                            col = T_tlcorn;
                        } else if ((seenv & (SV0 | SV1 | SV2 | SV7)) >>> 0
                            && !((seenv & (SV3 | SV4 | SV5)) >>> 0)) {
                            col = T_hwall;
                        } else if ((seenv & SV6) >>> 0 && !((seenv & 4294967231) >>> 0)) {
                            col = T_stone;
                        } else {
                            col = T_tdwall;
                        }
                        break;
                    case WM.T_BR:
                        if ((seenv & (SV5 | SV6)) >>> 0 && !((seenv & 4294967199) >>> 0)) {
                            col = T_trcorn;
                        } else if ((seenv & (SV0 | SV1 | SV2 | SV3)) >>> 0
                            && !((seenv & (SV5 | SV6 | SV7)) >>> 0)) {
                            col = T_hwall;
                        } else if ((seenv & SV4) >>> 0 && !((seenv & 4294967279) >>> 0)) {
                            col = T_stone;
                        } else {
                            col = T_tdwall;
                        }
                        break;
                    default:
                        await impossible($C`wall_angle: unknown T wall mode %d`,
                            lev.flags & WM_MASK);
                        col = T_stone;
                        break;
                }
                idx = row.get(col);
                break;
            case SDOOR:
                if (lev.candig) {
                    idx = S.tree;
                    break;
                }
                if (lev.horizontal) {
                    $goto = "horiz"; continue S1;
                }
            case VWALL:
                /*FALLTHRU*/
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = seenv ? S.vwall : S.stone;
                        break;
                    case 1:
                        idx = (seenv & (SV1 | SV2 | SV3 | SV4 | SV5)) >>> 0 ? S.vwall : S.stone;
                        break;
                    case 2:
                        idx = (seenv & (SV0 | SV1 | SV5 | SV6 | SV7)) >>> 0 ? S.vwall : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown vwall mode %d`,
                            lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case HWALL:
            case "horiz":
                $goto = null;   // horiz:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = seenv ? S.hwall : S.stone;
                        break;
                    case 1:
                        idx = (seenv & (SV3 | SV4 | SV5 | SV6 | SV7)) >>> 0 ? S.hwall : S.stone;
                        break;
                    case 2:
                        idx = (seenv & (SV0 | SV1 | SV2 | SV3 | SV7)) >>> 0 ? S.hwall : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown hwall mode %d`,
                            lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case TLCORNER:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = S.tlcorn;
                        break;
                    case WM.C_OUTER:
                        idx = (seenv & (SV3 | SV4 | SV5)) >>> 0 ? S.tlcorn : S.stone;
                        break;
                    case WM.C_INNER:
                        idx = (seenv & 4294967279) >>> 0 ? S.tlcorn : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown %s mode %d`, $C`tlcorn`, lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case TRCORNER:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = S.trcorn;
                        break;
                    case WM.C_OUTER:
                        idx = (seenv & (SV5 | SV6 | SV7)) >>> 0 ? S.trcorn : S.stone;
                        break;
                    case WM.C_INNER:
                        idx = (seenv & 4294967231) >>> 0 ? S.trcorn : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown %s mode %d`, $C`trcorn`, lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case BLCORNER:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = S.blcorn;
                        break;
                    case WM.C_OUTER:
                        idx = (seenv & (SV1 | SV2 | SV3)) >>> 0 ? S.blcorn : S.stone;
                        break;
                    case WM.C_INNER:
                        idx = (seenv & 4294967291) >>> 0 ? S.blcorn : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown %s mode %d`, $C`blcorn`, lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case BRCORNER:
                switch (lev.flags & WM_MASK) {
                    case 0:
                        idx = S.brcorn;
                        break;
                    case WM.C_OUTER:
                        idx = (seenv & (SV7 | SV0 | SV1)) >>> 0 ? S.brcorn : S.stone;
                        break;
                    case WM.C_INNER:
                        idx = (seenv & 4294967294) >>> 0 ? S.brcorn : S.stone;
                        break;
                    default:
                        await impossible($C`wall_angle: unknown %s mode %d`, $C`brcorn`, lev.flags & WM_MASK);
                        idx = S.stone;
                        break;
                }
                break;
            case CROSSWALL:
                S2: for (;;) {
                    switch ($goto !== null ? $goto : lev.flags & WM_MASK) {
                        case 0:
                            if (seenv === SV0) {
                                idx = S.brcorn;
                            } else if (seenv === SV2) {
                                idx = S.blcorn;
                            } else if (seenv === SV4) {
                                idx = S.tlcorn;
                            } else if (seenv === SV6) {
                                idx = S.trcorn;
                            } else if (!((seenv & 4294967288) >>> 0)
                                && ((seenv & SV1) >>> 0 || seenv === (SV0 | SV2))) {
                                idx = S.tuwall;
                            } else if (!((seenv & 4294967267) >>> 0)
                                && ((seenv & SV3) >>> 0 || seenv === (SV2 | SV4))) {
                                idx = S.trwall;
                            } else if (!((seenv & 4294967183) >>> 0)
                                && ((seenv & SV5) >>> 0 || seenv === (SV4 | SV6))) {
                                idx = S.tdwall;
                            } else if (!((seenv & 4294967102) >>> 0)
                                && ((seenv & SV7) >>> 0 || seenv === (SV0 | SV6))) {
                                idx = S.tlwall;
                            } else {
                                idx = S.crwall;
                            }
                            break;
                        case WM.X_TL:
                            row = new $c.Ptr(cross_matrix[C_tl], 0);
                            seenv = ((seenv >>> 4 | seenv << 4 >>> 0) >>> 0 & 255) >>> 0;
                            $goto = "do_crwall"; continue S2;
                        case WM.X_TR:
                            row = new $c.Ptr(cross_matrix[C_tr], 0);
                            seenv = ((seenv >>> 6 | seenv << 2 >>> 0) >>> 0 & 255) >>> 0;
                            $goto = "do_crwall"; continue S2;
                        case WM.X_BL:
                            row = new $c.Ptr(cross_matrix[C_bl], 0);
                            seenv = ((seenv >>> 2 | seenv << 6 >>> 0) >>> 0 & 255) >>> 0;
                            $goto = "do_crwall"; continue S2;
                        case WM.X_BR:
                            row = new $c.Ptr(cross_matrix[C_br], 0);
                        case "do_crwall":
                            $goto = null;   // do_crwall:
                            if (seenv === SV4) {
                                idx = S.stone;
                            } else {
                                seenv = (seenv & 4294967279) >>> 0;   /* strip SV4 */
                                if (seenv === SV0) {
                                    col = C_brcorn;
                                } else if ((seenv & (SV2 | SV3)) >>> 0) {
                                    if ((seenv & (SV5 | SV6 | SV7)) >>> 0) {
                                        col = C_crwall;
                                    } else if ((seenv & (SV0 | SV1)) >>> 0) {
                                        col = C_tuwall;
                                    } else {
                                        col = C_blcorn;
                                    }
                                } else if ((seenv & (SV5 | SV6)) >>> 0) {
                                    if ((seenv & (SV1 | SV2 | SV3)) >>> 0) {
                                        col = C_crwall;
                                    } else if ((seenv & (SV0 | SV7)) >>> 0) {
                                        col = C_tlwall;
                                    } else {
                                        col = C_trcorn;
                                    }
                                } else if ((seenv & SV1) >>> 0) {
                                    col = (seenv & SV7) >>> 0 ? C_crwall : C_tuwall;
                                } else if ((seenv & SV7) >>> 0) {
                                    col = (seenv & SV1) >>> 0 ? C_crwall : C_tlwall;
                                } else {
                                    await impossible($C`wall_angle: bottom of crwall check`);
                                    col = C_crwall;
                                }
                                idx = row.get(col);
                            }
                            break;
                        case WM.X_TLBR:
                            if ((seenv & (SV1 | SV2 | SV3)) >>> 0 && !((seenv & 4294967281) >>> 0)) {
                                idx = S.blcorn;
                            } else if ((seenv & (SV5 | SV6 | SV7)) >>> 0 && !((seenv & 4294967071) >>> 0)) {
                                idx = S.trcorn;
                            } else if ((seenv & (SV0 | SV4)) >>> 0 && !((seenv & 4294967278) >>> 0)) {
                                idx = S.stone;
                            } else {
                                idx = S.crwall;
                            }
                            break;
                        case WM.X_BLTR:
                            if ((seenv & (SV0 | SV1 | SV7)) >>> 0 && !((seenv & 4294967164) >>> 0)) {
                                idx = S.brcorn;
                            } else if ((seenv & (SV3 | SV4 | SV5)) >>> 0 && !((seenv & 4294967239) >>> 0)) {
                                idx = S.tlcorn;
                            } else if ((seenv & (SV2 | SV6)) >>> 0 && !((seenv & 4294967227) >>> 0)) {
                                idx = S.stone;
                            } else {
                                idx = S.crwall;
                            }
                            break;
                        default:
                            await impossible($C`wall_angle: unknown crosswall mode`);
                            idx = S.stone;
                            break;
                    }
                    break;
                }
                break;
            default:
                await impossible($C`wall_angle: unexpected wall type %d`, lev.typ);
                idx = S.stone;
        }
        break;
    }
    return idx;
}
/*
 * c++ 20 has problems with some of the display.h macros because
 * comparisons and bit-fiddling and math between different enums
 * is deprecated.
 * Create function versions of some of the macros used in some
 * NetHack c++ source files (Qt) for use there.
 */
/**
 * @param {number} cmap int
 * @returns {number} int
 */
export function fn_cmap_to_glyph(cmap) {   // display.c:3797
    return (cmap === S.stone ? GLYPH.CMAP_STONE_OFF : cmap <= S.trwall ? (cmap - S.vwall | 0) + (In_mines(u.uz) ? GLYPH.CMAP_MINES_OFF : In_hell(u.uz) ? GLYPH.CMAP_GEH_OFF : (svd.dungeon_topology.d_knox_level.dlevel || svd.dungeon_topology.d_knox_level.dnum) && on_level(u.uz, svd.dungeon_topology.d_knox_level) ? GLYPH.CMAP_KNOX_OFF : u.uz.dnum === svd.dungeon_topology.d_sokoban_dnum ? GLYPH.CMAP_SOKO_OFF : GLYPH.CMAP_MAIN_OFF) | 0 : cmap < S.altar ? (cmap - S.ndoor | 0) + GLYPH.CMAP_A_OFF | 0 : cmap === S.altar ? 4008 : cmap < S.arrow_trap + MAXTCHARS ? (cmap - S.grave | 0) + GLYPH.CMAP_B_OFF | 0 : cmap <= S.goodpos ? (cmap - S.digbeam | 0) + GLYPH.CMAP_C_OFF | 0 : NO_GLYPH);
}
function _suppress_map_output() {
    return gi.in_mklev || program_state.saving || program_state.restoring || program_state.done_hup ? 1 : 0;
}
function HAS_ROGUE_IBM_GRAPHICS() {
    return gc.currentgraphics === ROGUESET && gs.symset[gc.currentgraphics].handling === H_IBM ? 1 : 0;
}

export function $init() {
    tgfirst.$copyFrom(new $T.tmp_glyph());
    no_ginfo.$copyFrom(new $T.glyphinfo());
    no_ginfo.glyph = NO_GLYPH;
    no_ginfo.ttychar = 32;
    no_ginfo.framecolor = NO_COLOR;
    no_ginfo.gm.glyphflags = MG.BADXY;
    no_ginfo.gm.sym.color = NO_COLOR;
    no_ginfo.gm.sym.symidx = 0;
    no_ginfo.gm.customcolor = 0;
    no_ginfo.gm.color256idx = 0;
    no_ginfo.gm.tileidx = 0;
    no_ginfo.gm.u = null;
    nul_glyphinfo.$copyFrom(new $T.glyphinfo());
    nul_glyphinfo.glyph = NO_GLYPH;
    nul_glyphinfo.ttychar = 32;
    nul_glyphinfo.framecolor = NO_COLOR;
    /* glyph_map */
    nul_glyphinfo.gm.glyphflags = MG.UNEXPL;
    nul_glyphinfo.gm.sym.color = NO_COLOR;
    nul_glyphinfo.gm.sym.symidx = SYM.UNEXPLORED + SYM_OFF_X;
    nul_glyphinfo.gm.customcolor = 0;
    nul_glyphinfo.gm.color256idx = 0;
    nul_glyphinfo.gm.tileidx = 0;
    nul_glyphinfo.gm.u = null;
    for (let $i0 = 0; $i0 < 9624; $i0++) {
        glyphmap[$i0].$copyFrom(new $T.glyph_map_entry());
    }
    $c.init(glyphmap, [
        { glyphflags: 0, sym: { color: NO_COLOR, symidx: 0 },
          customcolor: 0,
          color256idx: 0, tileidx: 0,
          u: null }
    ]);
    nul_gbuf.$copyFrom(new $T.gbuf_entry());
    nul_gbuf.gnew = 0;   /* gnew */
    nul_gbuf.glyphinfo.glyph = GLYPH_UNEXPLORED;
    nul_gbuf.glyphinfo.ttychar = 32;
    nul_gbuf.glyphinfo.framecolor = NO_COLOR;
    /* glyphinfo.glyph, glyphinfo.ttychar */
    /* glyphinfo.gm */
    nul_gbuf.glyphinfo.gm.glyphflags = MG.UNEXPL;
    nul_gbuf.glyphinfo.gm.sym.color = NO_COLOR;
    nul_gbuf.glyphinfo.gm.sym.symidx = 0;
    nul_gbuf.glyphinfo.gm.customcolor = 0;
    nul_gbuf.glyphinfo.gm.color256idx = 0;
    nul_gbuf.glyphinfo.gm.tileidx = 0;
    nul_gbuf.glyphinfo.gm.u = null;
    zapcolors.fill(0);
    $c.init(zapcolors, [
        zap_color_missile,
        zap_color_fire,
        zap_color_frost,
        zap_color_sleep,
        zap_color_death,
        zap_color_lightning,
        zap_color_poison_gas,
        zap_color_acid
    ]);
    altarcolors.fill(0);
    $c.init(altarcolors, [
        altar_color_unaligned,
        altar_color_chaotic,
        altar_color_neutral,
        altar_color_lawful,
        altar_color_other
    ]);
    explodecolors.fill(0);
    $c.init(explodecolors, [
        explode_color_dark,
        explode_color_noxious,
        explode_color_muddy,
        explode_color_wet,
        explode_color_magical,
        explode_color_fiery,
        explode_color_frosty
    ]);
    wallcolors.fill(0);
    $c.init(wallcolors, [
        CLR.GRAY,
        CLR.GRAY,
        CLR.GRAY,
        CLR.GRAY,
        CLR.GRAY
    ]);
    for (let $i0 = 0; $i0 < 3; $i0++) {
        seenv_matrix[$i0].fill(0);
    }
    $c.init(seenv_matrix, [
        [4, 2, 1],
        [8, 255, 128],
        [16, 32, 64]
    ]);
    for (let $i0 = 0; $i0 < 4; $i0++) {
        wall_matrix[$i0].fill(0);
    }
    $c.init(wall_matrix, [
        [S.stone, S.tlcorn, S.trcorn, S.hwall, S.tdwall],   /* tdwall */
        [S.stone, S.trcorn, S.brcorn, S.vwall, S.tlwall],   /* tlwall */
        [S.stone, S.brcorn, S.blcorn, S.hwall, S.tuwall],   /* tuwall */
        [S.stone, S.blcorn, S.tlcorn, S.vwall, S.trwall]   /* trwall */
    ]);
    for (let $i0 = 0; $i0 < 4; $i0++) {
        cross_matrix[$i0].fill(0);
    }
    $c.init(cross_matrix, [
        [S.brcorn, S.blcorn, S.tlcorn, S.tuwall, S.trwall, S.crwall],
        [S.blcorn, S.tlcorn, S.trcorn, S.trwall, S.tdwall, S.crwall],
        [S.tlcorn, S.trcorn, S.brcorn, S.tdwall, S.tlwall, S.crwall],
        [S.trcorn, S.brcorn, S.blcorn, S.tlwall, S.tuwall, S.crwall]
    ]);
    tmp_at$tglyph = null;
    swallowed$lastx = 0;
    swallowed$lasty = 0;
    under_water$lastx = 0;
    under_water$lasty = 0;
    under_water$dela = 0;
    under_ground$dela = 0;
    cls$in_cls = 0;
    flush_screen$flushing = 0;
    flush_screen$delay_flushing = 0;
    t_warn$warn_str.fill(0);
    t_warn$warn_str.set([119, 97, 108, 108, 95, 97, 110, 103, 108, 101, 58, 32, 37, 115, 58, 32, 99, 97, 115, 101, 32, 37, 100, 58, 32, 115, 101, 101, 110, 118, 32, 61, 32, 48, 120, 37, 120]);   // "wall_angle: %s: case %d: seenv = 0x%x"
}
