import { C } from '../c-runtime/context.js';
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
/*#define WA_VERBOSE*/
/* give (x,y) locations for all "bad" spots */
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
export function tp_sensemon(mon)
{
    mon=C.ptr(mon);
    return (Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))));
}

export function sensemon(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(Number(!!((Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number((mon)==C.display_read_you_ustuck(C.u)))))&&(Number(!!(Number(!((C.field(C.u,"you","uinwater").value)))||(Number(!!(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2)&&C.i32(C.is_pool(C.display_read_monst_mx(mon),C.display_read_monst_my(mon)))))))))))&&(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))||(Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))))))));
}

export function mon_warning(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc)))))));
}

export function mon_visible(mon)
{
    mon=C.ptr(mon);
    return (Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value)))));
}

export function see_with_infrared(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"]))))))&&((C.i32((C.i32(C.display_read_permonst_mflags3(C.display_read_monst_data(mon)))&512))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&1)))!=0)))));
}

export function canseemon(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(((C.i32(C.field(mon,"monst","wormno").value)?C.i32(C.worm_known(mon)):(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&2)))!=0))||(Number(!!(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"]))))))&&((C.i32((C.i32(C.display_read_permonst_mflags3(C.display_read_monst_data(mon)))&512))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&1)))!=0))))))))))&&(Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value))))))));
}

export function knowninvisible(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(C.i32(C.field((mon),"monst","minvis").value)&&(Number(!!((Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&2)))!=0))&&(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"]))))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))))))))||(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(C.i64((C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])&C.i64((~(C.i64((C.i64((67108864n|33554432n))|16777216n))))))))))&&Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=(C.i32((8*8)))))))))))));
}

/* #define knowninvisible() isn't useful here */
export function is_safemon(mon)
{
    mon=C.ptr(mon);
    return (Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.display_read_flag_safe_dog(C.flags))&&C.i32(C.field((mon),"monst","mpeaceful").value)))&&(Number(!!((Number(!!(((C.i32(C.field(mon,"monst","wormno").value)?C.i32(C.worm_known(mon)):(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&2)))!=0))||(Number(!!(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"]))))))&&((C.i32((C.i32(C.display_read_permonst_mflags3(C.display_read_monst_data(mon)))&512))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&1)))!=0))))))))))&&(Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value))))))))||(Number(!!(Number(!!((Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number((mon)==C.display_read_you_ustuck(C.u)))))&&(Number(!!(Number(!((C.field(C.u,"you","uinwater").value)))||(Number(!!(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2)&&C.i32(C.is_pool(C.display_read_monst_mx(mon),C.display_read_monst_my(mon)))))))))))&&(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))||(Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon)))))))))))))))))))))))&&Number(!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.CONFUSION)*C.sizes["struct prop"])))))&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))))))&&Number(!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.STUNNED)*C.sizes["struct prop"]))))));
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
export function magic_map_background(x,y,show)
{
    x=C.i16(x);
    y=C.i16(y);
    show=C.i32(show);
    let glyph=back_to_glyph(x,y);
    /* assumes hero can see x,y */
    let lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    /*
     * Correct for out of sight lit corridors and rooms that the hero
     * doesn't remember as lit.
     */
    if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))&&Number(!(C.field(lev,"rm","waslit").value))))) {
        /* Floor spaces are dark if unlit.  Corridors are dark if unlit. */
        if(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)&&Number(glyph==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))) (glyph=((Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags)))))?(((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<=C.S_trwall))?(C.i32((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<C.S_altar))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<=C.S_goodpos))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):C.GLYPH_NOTHING_OFF));
 else if(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)&&Number(glyph==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))) (glyph=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
    }
    if(Number(!!(C.i32(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value)&&(Number(!!((Number((C.display_read_rm_glyph(lev))==C.GLYPH_UNEXPLORED_OFF))||(Number(!!(Number((C.display_read_rm_glyph(lev))>=C.GLYPH_CMAP_STONE_OFF)&&Number((C.display_read_rm_glyph(lev))<(C.i32((C.GLYPH_CMAP_C_OFF+(C.i32(((C.i32((C.S_goodpos-C.S_digbeam)))+1)))))))))))))))) (C.field(lev,"rm","glyph").value=glyph);
    if(show) show_glyph(x,y,glyph);
    C.update_lastseentyp(x,y);
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
export function map_background(x,y,show)
{
    x=C.i16(x);
    y=C.i16(y);
    show=C.i32(show);
    let glyph=back_to_glyph(x,y);
    if(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value) (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
    if(show) show_glyph(x,y,glyph);
}

/*
 * map_trap()
 *
 * Map the trap and print it out if directed.  This routine assumes that the
 * hero can physically see the location.
 */
export function map_trap(trap,show)
{
    trap=C.ptr(trap);
    show=C.i32(show);
    let x=C.display_read_trap_tx(trap); let y=C.display_read_trap_ty(trap);
    let glyph=(((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<=C.S_trwall))?(C.i32((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<C.S_altar))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32((C.i32((C.S_arrow_trap+((C.i32(C.field((trap),"trap","ttyp").value)))))-1))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))));
    if(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value) (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
    if(show) show_glyph(x,y,glyph);
}

/*
 * map_engraving()
 *
 * Map the engraving and print it out if directed.
 */
export function map_engraving(ep,show)
{
    ep=C.ptr(ep);
    show=C.i32(show);
    let x=C.display_read_engr_engr_x(ep); let y=C.display_read_engr_engr_y(ep);
    let glyph=(((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))<=C.S_trwall))?(C.i32((C.i32((((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))<C.S_altar))?(C.i32(((C.i32((((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))<=C.S_goodpos))?(C.i32(((C.i32((((((Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_engr_engr_x(ep))*(C.sizes["struct rm"]*21))+Number(C.display_read_engr_engr_y(ep))*C.sizes["struct rm"]))==C.CORR))?C.S_engrcorr:C.S_engroom)))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))));
    if(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value) (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
    if(show) show_glyph(x,y,glyph);
}

/*
 * map_object()
 *
 * Map the given object.  This routine assumes that the hero can physically
 * see the location of the object.  Update the screen if directed.
 * [Note: feel_location() -> map_location() -> map_object() contradicts
 * the claim here that the hero can see obj's <ox,oy>.]
 */
export function map_object(obj,show)
{
    obj=C.ptr(obj);
    show=C.i32(show);
    let x=C.display_read_obj_ox(obj); let y=C.display_read_obj_oy(obj);
    let glyph=(((Number(C.i32(C.display_read_obj_otyp(obj))==C.STATUE))?((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"]))))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.display_read_obj_corpsenm(obj)+(((Number((C.i32((C.i32(C.display_read_obj_spe(obj))&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"]))))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.display_read_instance_globals_o_otg_temp(C.go)+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.display_read_obj_otyp(obj))==C.CORPSE))?((C.i32((C.display_read_obj_corpsenm(obj)+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((obj),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.display_read_obj_oclass(obj))==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.display_read_obj_otyp(obj))<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))>=C.FIRST_SPELL)&&(Number(C.i32(C.display_read_obj_otyp(obj))<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.display_read_obj_oclass(obj))+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.display_read_obj_otyp(obj))+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))))))));
    /* if this object is already displayed as a generic object, it might
       become a specific one now */
    if(Number(!!(Number(!!((Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))))))) {
        /* these 'r' and 'neardist' calculations match distant_name(objnam.c)
           and see_nearby_objects(below); we assume that this is a lone
           object or a pile-top, not something below the top of a pile */
        let r=((Number(C.display_read_you_xray_range(C.u)>2))?C.display_read_you_xray_range(C.u):2); let neardist=C.i32((C.i32(((C.i32((r*r)))*2))-r));
        /* neardist produces a small square with rounded corners */
        /* same as r*r + r*(r-1) */
        if(Number(C.dist2((x),(y),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=neardist)) {
            C.observe_object(obj);
            (glyph=(((Number(C.i32(C.display_read_obj_otyp(obj))==C.STATUE))?((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"]))))))))))?(C.i32((((C.rn2_on_display_rng(C.NUMMONS)))+(((Number(!(C.rn2_on_display_rng(2))))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):(C.i32((C.display_read_obj_corpsenm(obj)+(((Number((C.i32((C.i32(C.display_read_obj_spe(obj))&3)))==1))?(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_STATUE_FEM_PILETOP_OFF:C.GLYPH_STATUE_FEM_OFF)):(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_STATUE_MALE_PILETOP_OFF:C.GLYPH_STATUE_MALE_OFF))))))))):(((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"]))))))))))?(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.display_read_instance_globals_o_otg_temp(C.go)+C.GLYPH_OBJ_OFF))))):((Number(C.i32(C.display_read_obj_otyp(obj))==C.CORPSE))?((C.i32((C.display_read_obj_corpsenm(obj)+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_BODY_PILETOP_OFF:C.GLYPH_BODY_OFF)))))):((Number(!!(Number(!(C.field((obj),"obj","dknown").value))&&(Number(!!(Number(!!(Number(C.i32(C.display_read_obj_oclass(obj))==C.POTION_CLASS)||(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))>=C.FIRST_REAL_GEM)&&(Number(C.i32(C.display_read_obj_otyp(obj))<=C.LAST_GLASS_GEM)))))))||(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))>=C.FIRST_SPELL)&&(Number(C.i32(C.display_read_obj_otyp(obj))<=C.LAST_SPELL)))))))))))?((C.i32((C.i32(C.display_read_obj_oclass(obj))+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF)))))):((C.i32((C.i32(C.display_read_obj_otyp(obj))+(((Number(!!(Number(!!(Number(C.i32(C.display_read_obj_where(obj))==1)&&(Number(((C.field(C.go,"instance_globals_o","otg_otmp").value=C.display_read_vptrs_v_nexthere(C.display_address_obj_v(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value))))!=0))))&&(Number(!!(Number(C.i32(C.display_read_obj_otyp(obj))!=C.BOULDER)||Number(C.i32(C.display_read_obj_otyp(C.display_read_instance_globals_o_otg_otmp(C.go)))==C.BOULDER)))))))?C.GLYPH_OBJ_PILETOP_OFF:C.GLYPH_OBJ_OFF))))))))))));
        }
    }
    if(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value) {
        /* MRKR: While hallucinating, statues are seen as random monsters */
        /*       but remembered as random objects.                        */
        if(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))&&Number(C.i32(C.display_read_obj_otyp(obj))==C.STATUE)))) {
            (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=(((Number(((C.field(C.go,"instance_globals_o","otg_temp").value=(C.i32((C.rn2_on_display_rng(C.i32((C.NUM_OBJECTS-C.FIRST_OBJECT)))+C.FIRST_OBJECT)))))==C.CORPSE))?(C.i32(((C.rn2_on_display_rng(C.NUMMONS))+C.GLYPH_BODY_OFF))):(C.i32((C.display_read_instance_globals_o_otg_temp(C.go)+C.GLYPH_OBJ_OFF))))));
        } else {
            (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
        }
    }
    if(show) show_glyph(x,y,glyph);
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
export function map_invisible(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!!(Number(C.i32(x)!=C.i32(C.display_read_you_ux(C.u)))||Number(C.i32(y)!=C.i32(C.display_read_you_uy(C.u)))))) {
        /* don't display I at hero's location */
        if(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value) (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=C.GLYPH_INVIS_OFF);
        show_glyph(x,y,C.GLYPH_INVIS_OFF);
    }
}

export function unmap_invisible(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!!(C.isok(x,y)&&(Number((C.display_read_rm_glyph((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.GLYPH_INVIS_OFF))))) {
        unmap_object(x,y);
        newsym(x,y);
        return (C.i8(1));
    }
    return (C.i8(0));
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
export function unmap_object(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let trap;
    let ep;
    if(Number(!(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value))) return;
    if(Number(!!(Number(!!(Number(((trap=C.t_at(x,y)))!=0)&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
        map_trap(trap,0);
    } else if(C.display_read_rm_seenv((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"])) {
        let lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
        if(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ep=C.engr_at(x,y)))!=0)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
            if((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))) (C.field(ep,"engr","erevealed").value=C.u32(1));
            map_engraving(ep,0);
        } else {
            map_background(x,y,0);
        }
        /* turn remembered dark room squares dark */
        if(Number(!!(Number(!!(Number(!(C.field(lev,"rm","waslit").value))&&Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))&&Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)))) (C.field(lev,"rm","glyph").value=(((Number((C.S_stone)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_stone)<=C.S_trwall))?(C.i32((C.i32(((C.S_stone)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_stone)<C.S_altar))?(C.i32(((C.i32(((C.S_stone)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_stone)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_stone)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_stone)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_stone)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_stone)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
    } else {
        (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=(((Number((C.S_stone)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_stone)<=C.S_trwall))?(C.i32((C.i32(((C.S_stone)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_stone)<C.S_altar))?(C.i32(((C.i32(((C.S_stone)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_stone)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_stone)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_stone)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_stone)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_stone)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        /* default val */
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
export function map_location(x,y,show)
{
    x=C.i16(x);
    y=C.i16(y);
    show=C.i32(show);
    do {
        let obj;
        let trap;
        let ml_ep;
        let _ml_reg;
        if(Number(!!(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
            map_object(obj,show);
        } else if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
            map_trap(trap,show);
        } else if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ml_ep=C.engr_at(x,y)))!=0)))&&C.i32(C.field(ml_ep,"engr","erevealed").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
            map_engraving(ml_ep,show);
        } else {
            map_background(x,y,show);
        }
        C.update_lastseentyp(x,y);
        if(Number(!!(Number(!!(show&&Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))))&&Number(((_ml_reg=C.visible_region_at(x,y)))!=0)))) C.show_region(_ml_reg,x,y);
    } while(0);
}

/* display something on monster layer; may need to fixup object layer */
export function show_mon_or_warn(x,y,monglyph)
{
    x=C.i16(x);
    y=C.i16(y);
    monglyph=C.i32(monglyph);
    let o;
    /* "remembered, unseen monster" is tracked by object layer so if we're
       putting something on monster layer at same spot, stop remembering
       that; if an object is in view there, start remembering it instead */
    if((Number((C.display_read_rm_glyph((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.GLYPH_INVIS_OFF))) {
        unmap_object(x,y);
        if(Number(!!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))&&Number(((o=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))!=0)))) map_object(o,C.i32((C.i8(0))));
    }
    show_glyph(x,y,monglyph);
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
export function display_monster(x,y,mon,sightflags,worm_tail)
{
    x=C.i16(x);
    y=C.i16(y);
    mon=C.ptr(mon);
    sightflags=C.i32(sightflags);
    worm_tail=C.i8(worm_tail);
    const stackFrame=C.stackSave();
    try {
    /* display position */
    /* monster to display */
    /* 1 if the monster is physically seen;
                             * 2 if detected using Detect_monsters */
    /* mon is actually a worm tail */
    let mon_mimic=C.i8((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(mon))&7)))!=C.M_AP_NOTHING)));
    let sensed=(Number(!!(C.i32(mon_mimic)&&(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.PROT_FROM_SHAPE_CHANGERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.PROT_FROM_SHAPE_CHANGERS)*C.sizes["struct prop"]))))||(Number(!!(Number(!!((Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number((mon)==C.display_read_you_ustuck(C.u)))))&&(Number(!!(Number(!((C.field(C.u,"you","uinwater").value)))||(Number(!!(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2)&&C.i32(C.is_pool(C.display_read_monst_mx(mon),C.display_read_monst_my(mon)))))))))))&&(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))||(Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon)))))))))))))))))))))))); let mgendercode=(C.i32(C.field(mon,"monst","female").value)?C.FEMALE:C.MALE);
    /*
     * We must do the mimic check first.  If the mimic is mimicking something,
     * and the location is in sight, we have to change the hero's memory
     * so that when the position is out of sight, the hero remembers what
     * the mimic was mimicking.
     */
    if(Number(!!(C.i32(mon_mimic)&&(Number(sightflags==1))))) {
        switch((C.i32((C.i32(C.display_read_monst_m_ap_type(mon))&7)))) {
            default:
                C.variadic(0,C.literal("display_monster:  bad m_ap_type value [ = %d ]"),C.i32(C.display_read_monst_m_ap_type(mon)));
            ;
            /*FALLTHRU*/
            case (C.M_AP_NOTHING):
                show_glyph(x,y,(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(mon))))))+(((Number(C.i32(C.field((mon),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
            break;
            case (C.M_AP_FURNITURE):
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
                    let sym=C.i32(C.display_read_monst_mappearance(mon)); let glyph=(((Number((sym)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((sym)<=C.S_trwall))?(C.i32((C.i32(((sym)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((sym)<C.S_altar))?(C.i32(((C.i32(((sym)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((sym)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((sym)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((sym)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((sym)<=C.S_goodpos))?(C.i32(((C.i32(((sym)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))));
                    (C.field(((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]),"rm","glyph").value=glyph);
                    if(Number(!(sensed))) {
                        show_glyph(x,y,glyph);
                        /* override real topology with mimic's fake one */
                        (C.cell(((C.display_address_instance_globals_saved_l_lastseentyp(C.svl)+Number(x)*(1*21))+Number(y)*1),"signed char").value=C.i8(C.cmap_to_type(sym)));
                    }
                    break;
                }            case (C.M_AP_OBJECT):
{
                    /* Make a fake object to send to map_object(). */
                    let obj=C.stackAlloc(C.sizes["struct obj"]);
                    C.copy(obj,C.display_address_const_globals_zeroobj(C.cg),C.sizes["struct obj"]);
                    (C.field(obj,"obj","ox").value=x);
                    (C.field(obj,"obj","oy").value=y);
                    (C.field(obj,"obj","otyp").value=C.i16(C.display_read_monst_mappearance(mon)));
                    /* might be mimicking a corpse or statue */
                    (C.field(obj,"obj","corpsenm").value=((Number(!!(C.display_read_monst_mextra(mon)&&Number((C.display_read_mextra_mcorpsenm(C.display_read_monst_mextra(mon)))!=C.NON_PM))))?(C.display_read_mextra_mcorpsenm(C.display_read_monst_mextra(mon))):C.PM_TENGU));
                    map_object(obj,Number(!(sensed)));
                    break;
                }            case (C.M_AP_MONSTER):
{
                    let mndx=(((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32(C.display_read_monst_mappearance(mon))));
                    show_glyph(x,y,(C.i32(((mndx)+(((Number((mgendercode)==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
                    break;
                }            /* case M_AP_MONSTER */
        }
        /* switch M_AP_TYPE() */
    }
    /* If mimic is unsuccessfully mimicking something, display the monster. */
    if(Number(!!(Number(!(mon_mimic))||sensed))) {
        let num;
        /* [ALI] Only use detected glyphs when monster wouldn't be
         * visible by any other means.
         *
         * There are no glyphs for "detected pets" so we have to
         * decide whether to display such things as detected or as tame.
         * If both are being highlighted in the same way, it doesn't
         * matter, but if not, showing them as pets is preferrable.
         */
        if(Number(!!(C.i32(C.display_read_monst_mtame(mon))&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))))))) {
            if(worm_tail) (num=(C.i32(((C.PM_LONG_WORM_TAIL)+(((Number((mgendercode)==C.MALE))?C.GLYPH_PET_MALE_OFF:C.GLYPH_PET_FEM_OFF))))));
 else (num=(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(mon))))))+(((Number(C.i32(C.field((mon),"monst","female").value)==0))?C.GLYPH_PET_MALE_OFF:C.GLYPH_PET_FEM_OFF))))));
        } else if(Number(sightflags==2)) {
            if(worm_tail) (num=(C.i32((((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.PM_LONG_WORM_TAIL)))+(((Number((mgendercode)==C.MALE))?C.GLYPH_DETECT_MALE_OFF:C.GLYPH_DETECT_FEM_OFF))))));
 else (num=(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(mon))))))+(((Number(C.i32(C.field((mon),"monst","female").value)==0))?C.GLYPH_DETECT_MALE_OFF:C.GLYPH_DETECT_FEM_OFF))))));
        } else {
            if(worm_tail) (num=(C.i32((((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.PM_LONG_WORM_TAIL)))+(((Number((mgendercode)==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
 else (num=(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(mon))))))+(((Number(C.i32(C.field((mon),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
        }
        show_mon_or_warn(x,y,num);
        (C.field(mon,"monst","meverseen").value=C.u32(1));
    }
    } finally {C.stackRestore(stackFrame); }
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
export function display_warning(mon)
{
    mon=C.ptr(mon);
    let x=C.display_read_monst_mx(mon); let y=C.display_read_monst_my(mon);
    let glyph;
    if((Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc)))))))) {
        let wl=((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?C.i32((C.rn2_on_display_rng(C.i32((6-1)))+1)):warning_of(mon));
        (glyph=(C.i32(((wl)+C.GLYPH_WARNING_OFF))));
    } else if((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))) {
        (glyph=(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(mon))))))+(((Number(C.i32(C.field((mon),"monst","female").value)==0))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))));
    } else {
        C.variadic(1,C.literal("display_warning did not match warning type?"));
        return;
    }
    show_mon_or_warn(x,y,glyph);
}

export function warning_of(mon)
{
    mon=C.ptr(mon);
    let wl=0; let tmp=0;
    if((Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc)))))))) {
        (tmp=(C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))));
        /* match display.h */
        (wl=((Number(tmp>C.i32((6-1))))?C.i32((6-1)):tmp));
    }
    return wl;
}

/* used by newsym() to decide whether to show a monster or a visible gas
   cloud region when both are at the same spot; caller deals with region */
export function mon_overrides_region(mon,mx,my)
{
    mon=C.ptr(mon);
    mx=C.i16(mx);
    my=C.i16(my);
    /* might be Null */
    /* won't match mon->mx,my if long worm's tail */
    let r;
    /* this is redundant because newsym() doesn't call us when swallowed */
    if(Number(!!(C.i32(C.field(C.u,"you","uswallow").value)&&(Number(!!(Number(!(mon))||Number(mon!=C.display_read_you_ustuck(C.u)))))))) return (C.i8(0));
    if(mon) {
        /* when not a worm tail, show mon if sensed rather than seen */
        if(Number(!!(Number(!!(Number(C.i32(mx)==C.i32(C.display_read_monst_mx(mon)))&&Number(C.i32(my)==C.i32(C.display_read_monst_my(mon)))))&&(Number(!!((Number(!!(Number(!!((Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number((mon)==C.display_read_you_ustuck(C.u)))))&&(Number(!!(Number(!((C.field(C.u,"you","uinwater").value)))||(Number(!!(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2)&&C.i32(C.is_pool(C.display_read_monst_mx(mon),C.display_read_monst_my(mon)))))))))))&&(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))||(Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))))))))||(Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc))))))))))))) return (C.i8(1));
        /* even if worm tail;
           check whether the spot is adjacent and 'mon' would be visible
           there if the gas cloud wasn't interfering with normal vision;
           _mon_visible() handles mon->mundetected; don't need to check
           infravision when monster is adjacent */
        (r=((Number(C.display_read_you_xray_range(C.u)>1))?C.display_read_you_xray_range(C.u):1));
        if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value)))))))&&Number((C.i32((C.i32(C.display_read_monst_m_ap_type(mon))&7)))!=C.M_AP_FURNITURE)))&&Number((C.i32((C.i32(C.display_read_monst_m_ap_type(mon))&7)))!=C.M_AP_OBJECT)))&&Number(C.dist2((mx),(my),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.i32((r*(C.i32((r+1))))))))) return (C.i8(1));
    }
    /* if not overriding region for current mon, propagate "remembered,
       unseen monster" */
    return C.i8(((Number((C.display_read_rm_glyph((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(mx)*(C.sizes["struct rm"]*21))+Number(my)*C.sizes["struct rm"]))==C.GLYPH_INVIS_OFF))?C.i32((C.i8(1))):C.i32((C.i8(0)))));
}

/* map or status window might not be ready for output during level creation
   or game restoration (something like u.usteed which affects display of
   the hero and also a status condition might not be set up yet) */
export function suppress_map_output()
{
    return C.i8((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state)))));
}

/*
 * feel_newsym()
 *
 * When hero knows what happened to location, even when blind.
 */
export function feel_newsym(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))) feel_location(x,y);
 else newsym(x,y);
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
export function feel_location(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let lev;
    let boulder;
    let mon;
    let ep;
    /* replicate safeguards used by newsym(); might not be required here */
    if((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state))))) return;
    if(Number(!(C.isok(x,y)))) return;
    (lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    /* If hero's memory of an invisible monster is accurate, we want to keep
     * him from detecting the same monster over and over again on each turn.
     * We must return (so we don't erase the monster).  (We must also, in the
     * search function, be sure to skip over previously detected 'I's.)
     */
    if(Number(!!((Number((C.display_read_rm_glyph(lev))==C.GLYPH_INVIS_OFF))&&(C.cell(((C.display_address_dlevel_t_monsters(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))) return;
    /* The hero can't feel non pool locations while under water
       except for lava and ice. */
    if(Number(!!(Number(!!(Number(!!(C.i32((C.field(C.u,"you","uinwater").value))&&Number(!(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))))))&&Number(!(C.is_pool_or_lava(x,y)))))&&Number(!(C.is_ice(x,y)))))) return;
    /* Set the seen vector as if the hero had seen it.
       It doesn't matter if the hero is levitating or not. */
    set_seenv(lev,C.display_read_you_ux(C.u),C.display_read_you_uy(C.u),x,y);
    if(Number(!(C.can_reach_floor((C.i8(0)))))) {
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
        if(Number(!!((Number(C.i32((C.display_read_rm_typ(lev)))<C.POOL))||(Number(!!((Number(C.i32((C.display_read_rm_typ(lev)))==C.DOOR))&&(C.i32((C.i32(C.field(lev,"rm","flags").value)&(C.i32((8|4)))))))))))) {
            map_background(x,y,1);
        } else if(Number(((boulder=C.sobj_at(C.BOULDER,x,y)))!=0)) {
            map_object(boulder,1);
        } else if((Number(C.i32((C.display_read_rm_typ(lev)))==C.DOOR))) {
            map_background(x,y,1);
        } else if(Number(!!((Number(C.i32((C.display_read_rm_typ(lev)))>=C.ROOM))||(Number(!!(Number(C.i32((C.display_read_rm_typ(lev)))>=C.POOL)&&Number(C.i32((C.display_read_rm_typ(lev)))<=C.DRAWBRIDGE_UP))))))) {
            let do_room_glyph;
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
            (do_room_glyph=(C.i8(0)));
            if(Number(!!(Number(C.display_read_rm_glyph(lev)==(C.i32(((C.BOULDER)+C.GLYPH_OBJ_OFF))))||(Number((C.display_read_rm_glyph(lev))==C.GLYPH_INVIS_OFF))))) {
                if(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))!=C.ROOM)&&C.i32(C.display_read_rm_seenv(lev))))) map_background(x,y,1);
 else (do_room_glyph=(C.i8(1)));
            } else if(Number(!!(Number(C.display_read_rm_glyph(lev)>=(((Number((C.S_stone)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_stone)<=C.S_trwall))?(C.i32((C.i32(((C.S_stone)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_stone)<C.S_altar))?(C.i32(((C.i32(((C.S_stone)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_stone)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_stone)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_stone)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_stone)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_stone)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(C.display_read_rm_glyph(lev)<(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))) {
                (do_room_glyph=(C.i8(1)));
            }
            if(do_room_glyph) {
                (C.field(lev,"rm","glyph").value=((Number(!!(Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags))))&&Number(!(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))))))))?(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((C.i32(C.field(lev,"rm","waslit").value)?(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):(((Number((C.S_stone)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_stone)<=C.S_trwall))?(C.i32((C.i32(((C.S_stone)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_stone)<C.S_altar))?(C.i32(((C.i32(((C.S_stone)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_stone)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_stone)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_stone)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_stone)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_stone)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))))));
                show_glyph(x,y,C.display_read_rm_glyph(lev));
            }
        } else {
            /* We feel it (I think hallways are the only things left). */
            map_background(x,y,1);
            /* Corridors are never felt as lit (unless remembered that way) */
            /* (lit_corridor only).                                         */
            if(Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)&&Number(C.display_read_rm_glyph(lev)==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))&&Number(!(C.field(lev,"rm","waslit").value))))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else if(Number(!!(Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)&&C.i32(C.display_read_flag_dark_room(C.flags))))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags))))&&Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
        }
    } else {
        if(Number(!!(Number(((ep=C.engr_at(x,y)))!=0)&&C.i32(C.engr_can_be_felt(ep))))) (C.field(ep,"engr","erevealed").value=C.u32(1));
        do {
            let obj;
            let trap;
            let ml_ep;
            let _ml_reg;
            if(Number(!!(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                map_object(obj,1);
            } else if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                map_trap(trap,1);
            } else if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ml_ep=C.engr_at(x,y)))!=0)))&&C.i32(C.field(ml_ep,"engr","erevealed").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                map_engraving(ml_ep,1);
            } else {
                map_background(x,y,1);
            }
            C.update_lastseentyp(x,y);
            if(Number(!!(Number(!!(1&&Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))))&&Number(((_ml_reg=C.visible_region_at(x,y)))!=0)))) C.show_region(_ml_reg,x,y);
        } while(0);
        if((Number(C.global("uball").value!=0))) {
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
            if(Number(!!(Number(!!(Number(!!(Number(!!(C.global("uchain").value&&Number(C.i32(C.display_read_obj_where(C.global("uchain").value))==1)))&&Number(C.i32(C.display_read_obj_ox(C.global("uchain").value))==C.i32(x))))&&Number(C.i32(C.display_read_obj_oy(C.global("uchain").value))==C.i32(y))))&&Number(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value==C.global("uchain").value)))) (C.field(C.u,"you","bc_felt").value=C.i32(C.display_read_you_bc_felt(C.u)|2));
 else (C.field(C.u,"you","bc_felt").value=C.i32(C.display_read_you_bc_felt(C.u)&C.i32((~2))));
            /* do not feel the chain */
            if(Number(!!(Number(!!(Number(!!(Number(!!(C.global("uball").value&&Number(C.i32(C.display_read_obj_where(C.global("uball").value))==1)))&&Number(C.i32(C.display_read_obj_ox(C.global("uball").value))==C.i32(x))))&&Number(C.i32(C.display_read_obj_oy(C.global("uball").value))==C.i32(y))))&&Number(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value==C.global("uball").value)))) (C.field(C.u,"you","bc_felt").value=C.i32(C.display_read_you_bc_felt(C.u)|1));
 else (C.field(C.u,"you","bc_felt").value=C.i32(C.display_read_you_bc_felt(C.u)&C.i32((~1))));
            /* do not feel the ball */
        }
        /* Floor spaces are dark if unlit.  Corridors are dark if unlit. */
        if(Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)&&Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))&&(Number(!!(Number(!(C.field(lev,"rm","waslit").value))||(Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags))))))))))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))<=C.S_trwall))?(C.i32((C.i32((((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))<C.S_altar))?(C.i32(((C.i32((((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32((((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number(((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))<=C.S_goodpos))?(C.i32(((C.i32((((C.i32(C.display_read_flag_dark_room(C.flags))?C.S_darkroom:C.S_stone))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else if(Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)&&Number(C.display_read_rm_glyph(lev)==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))))&&Number(!(C.field(lev,"rm","waslit").value))))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
    }
    /* draw monster on top if we can sense it */
    if(Number(!!(Number(!!(Number(!((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))))&&Number(((mon=(C.cell(((C.display_address_dlevel_t_monsters(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)))&&(Number(!!(Number(!!((Number(!!(Number(!(C.field(C.u,"you","uswallow").value))||Number((mon)==C.display_read_you_ustuck(C.u)))))&&(Number(!!(Number(!((C.field(C.u,"you","uinwater").value)))||(Number(!!(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2)&&C.i32(C.is_pool(C.display_read_monst_mx(mon),C.display_read_monst_my(mon)))))))))))&&(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))||(Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))))))))))) display_monster(x,y,mon,((Number(!!((Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon)))))))))))))))?1:2),C.i8((Number(!!((mon)&&(Number(!!((Number(C.i32(x)!=C.i32(C.display_read_monst_mx(mon))))||(Number(C.i32(y)!=C.i32(C.display_read_monst_my(mon))))))))))));
}

/*
 * newsym()
 *
 * Possibly put a new glyph at the given location.
 */
export function newsym(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let lev;
    let ep;
    let mon;
    let see_it;
    let worm_tail;
    /* don't try to produce map output when level is in a state of flux */
    if((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state))))) return;
    /* should never happen; same error handling as u_on_newpos() */
    if(Number(!(C.isok(x,y)))) {
        let errfunc;
        (errfunc=((Number(!!(Number(!!(Number(!!(Number(C.i32(x)<0)||Number(C.i32(y)<0)))||Number(C.i32(x)>C.i32((80-1)))))||Number(C.i32(y)>C.i32((21-1))))))?"panic":"impossible"));
        /* misuse of column 0 is less severe */
        C.dynamicVariadic((errfunc),0,C.literal("newsym: attempting screen update for <%d,%d>"),C.i32(x),C.i32(y));
        return;
    }
    /* only permit updating the hero when swallowed */
    if(C.field(C.u,"you","uswallow").value) {
        if((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))) show_glyph(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u),(((Number(!!(C.display_read_you_usteed(C.u)&&(Number(!!((Number(!!(Number(!(C.field(C.display_read_you_usteed(C.u),"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(C.display_read_you_usteed(C.u),"monst","mundetected").value))))))))?(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(C.display_read_you_usteed(C.u)))))))+(((Number(C.i32(C.field((C.display_read_you_usteed(C.u)),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))||Number(!(C.display_read_flag_showrace(C.flags))))))?C.display_read_you_umonnum(C.u):C.i32(C.display_read_Race_mnum(C.display_address_instance_globals_u_urace(C.gu)))))+(((Number((((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+(((Number(((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
        return;
    }
    if(Number(!!(C.i32((C.field(C.u,"you","uinwater").value))&&Number(!(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))))))) {
        /* when underwater, don't do anything unless <x,y> is an
           adjacent water or lava or ice position */
        if(Number(!!(Number(!((Number(!!(C.i32(C.is_pool_or_lava(x,y))||C.i32(C.is_ice(x,y)))))))||Number(!((Number(C.dist2(((x)),((y)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=2))))))) return;
    }
    (lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]));
    /* Can physically see the location. */
    if((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))) {
        let reg=C.visible_region_at(x,y);
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
        (C.field(lev,"rm","waslit").value=C.u32((Number(C.i32(C.field(lev,"rm","lit").value)!=0))));
        /* remember lit condition */
        (mon=(C.cell(((C.display_address_dlevel_t_monsters(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct monst *").value));
        (worm_tail=C.i8((Number(!!((mon)&&(Number(!!((Number(C.i32(x)!=C.i32(C.display_read_monst_mx(mon))))||(Number(C.i32(y)!=C.i32(C.display_read_monst_my(mon))))))))))));
        if(Number(((ep=C.engr_at(x,y)))!=0)) (C.field(ep,"engr","erevealed").value=C.u32(1));
        /* even when covered by objects or a monster */
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
        if(Number(!!(reg&&(Number(!!((Number(C.i32((C.display_read_rm_typ(lev)))>=C.DOOR))||(Number(!!(C.i32(C.display_read_NhRegion_visible(reg))&&C.i32(C.is_pool_or_lava(x,y))))))))))) {
            if(Number(!(mon_overrides_region(mon,x,y)))) {
                C.show_region(reg,x,y);
                return;
            }
        }
        if((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))) {
            let see_self=(Number(!!((Number(!!(Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))||C.i32(C.field(C.u,"you","uswallow").value)))||(Number(!!(Number(!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"]))))))&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))))))&&Number(!(C.field(C.u,"you","uundetected").value))))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))))))));
            /* update map information for <u.ux,u.uy> (remembered topology
               and object/known trap/terrain glyph) but only display it if
               hero can't see him/herself, then show self if appropriate */
            do {
                let obj;
                let trap;
                let ml_ep;
                let _ml_reg;
                if(Number(!!(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                    map_object(obj,Number(!(see_self)));
                } else if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                    map_trap(trap,Number(!(see_self)));
                } else if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ml_ep=C.engr_at(x,y)))!=0)))&&C.i32(C.field(ml_ep,"engr","erevealed").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                    map_engraving(ml_ep,Number(!(see_self)));
                } else {
                    map_background(x,y,Number(!(see_self)));
                }
                C.update_lastseentyp(x,y);
                if(Number(!!(Number(!!(Number(!(see_self))&&Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))))&&Number(((_ml_reg=C.visible_region_at(x,y)))!=0)))) C.show_region(_ml_reg,x,y);
            } while(0);
            if(see_self) show_glyph(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u),(((Number(!!(C.display_read_you_usteed(C.u)&&(Number(!!((Number(!!(Number(!(C.field(C.display_read_you_usteed(C.u),"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(C.display_read_you_usteed(C.u),"monst","mundetected").value))))))))?(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(C.display_read_you_usteed(C.u)))))))+(((Number(C.i32(C.field((C.display_read_you_usteed(C.u)),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))||Number(!(C.display_read_flag_showrace(C.flags))))))?C.display_read_you_umonnum(C.u):C.i32(C.display_read_Race_mnum(C.display_address_instance_globals_u_urace(C.gu)))))+(((Number((((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+(((Number(((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
        } else {
            let show=(C.i8(0));
            (see_it=Number(!!(mon&&(Number(!!((Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value)))))||(Number(!!(Number(!(worm_tail))&&(Number(!!((Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))))))))))))));
            if(Number(!!(mon&&(Number(!!(see_it||(Number(!!(Number(!(worm_tail))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))))))))))) {
                if(C.field(mon,"monst","mtrapped").value) {
                    let trap=C.t_at(x,y);
                    let tt=(trap?C.i32(C.field(trap,"trap","ttyp").value):C.NO_TRAP);
                    /* if monster is in a physical trap, you see trap too */
                    if(Number(!!(Number(!!(Number(tt==C.BEAR_TRAP)||(Number(!!(Number((tt)==C.PIT)||Number((tt)==C.SPIKED_PIT))))))||Number(tt==C.WEB)))) (C.field(trap,"trap","tseen").value=C.u32(1));
                }
                do {
                    let obj;
                    let trap;
                    let ml_ep;
                    let _ml_reg;
                    if(Number(!!(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_object(obj,C.i32(show));
                    } else if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_trap(trap,C.i32(show));
                    } else if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ml_ep=C.engr_at(x,y)))!=0)))&&C.i32(C.field(ml_ep,"engr","erevealed").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_engraving(ml_ep,C.i32(show));
                    } else {
                        map_background(x,y,C.i32(show));
                    }
                    C.update_lastseentyp(x,y);
                    if(Number(!!(Number(!!(C.i32(show)&&Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))))&&Number(((_ml_reg=C.visible_region_at(x,y)))!=0)))) C.show_region(_ml_reg,x,y);
                } while(0);
                /* map under the monster */
                /* also gets rid of any invisibility glyph */
                display_monster(x,y,mon,(see_it?1:2),worm_tail);
            } else if(Number(!!(Number(!!(mon&&(Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc)))))))))&&Number(!(worm_tail))))) {
                display_warning(mon);
            } else if((Number((C.display_read_rm_glyph(lev))==C.GLYPH_INVIS_OFF))) {
                map_invisible(x,y);
            } else {
                do {
                    let obj;
                    let trap;
                    let ml_ep;
                    let _ml_reg;
                    if(Number(!!(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct obj *").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_object(obj,1);
                    } else if(Number(!!(Number(!!(((trap=C.t_at(x,y)))&&C.i32(C.field(trap,"trap","tseen").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_trap(trap,1);
                    } else if(Number(!!(Number(!!(Number(!!((Number(!!(Number(!!(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.CORR)||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ICE)))||Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number((x))*(C.sizes["struct rm"]*21))+Number((y))*C.sizes["struct rm"]))==C.ROOM))))&&Number(((ml_ep=C.engr_at(x,y)))!=0)))&&C.i32(C.field(ml_ep,"engr","erevealed").value)))&&Number(!((Number(!!(Number(!!((Number(!!(C.i32(C.is_pool(x,y))&&Number(!((C.field(C.u,"you","uinwater").value))))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAPOOL))))||(Number(C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]))==C.LAVAWALL)))))))))) {
                        map_engraving(ml_ep,1);
                    } else {
                        map_background(x,y,1);
                    }
                    C.update_lastseentyp(x,y);
                    if(Number(!!(Number(!!(1&&Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))))&&Number(((_ml_reg=C.visible_region_at(x,y)))!=0)))) C.show_region(_ml_reg,x,y);
                } while(0);
                /* map the location */
            }
        }
        /* Can't see the location. */
    } else {
        if((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))) {
            feel_location(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u));
            /* forces an update */
            if((Number(!!((Number(!!(Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))||C.i32(C.field(C.u,"you","uswallow").value)))||(Number(!!(Number(!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.INVIS)*C.sizes["struct prop"]))))))&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))))))&&Number(!(C.field(C.u,"you","uundetected").value))))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))))))))) show_glyph(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u),(((Number(!!(C.display_read_you_usteed(C.u)&&(Number(!!((Number(!!(Number(!(C.field(C.display_read_you_usteed(C.u),"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(C.display_read_you_usteed(C.u),"monst","mundetected").value))))))))?(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(C.display_read_you_usteed(C.u)))))))+(((Number(C.i32(C.field((C.display_read_you_usteed(C.u)),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))||Number(!(C.display_read_flag_showrace(C.flags))))))?C.display_read_you_umonnum(C.u):C.i32(C.display_read_Race_mnum(C.display_address_instance_globals_u_urace(C.gu)))))+(((Number((((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+(((Number(((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
        } else if(Number(!!(Number(((mon=(C.cell(((C.display_address_dlevel_t_monsters(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(8*21))+Number(y)*8),"struct monst *").value)))!=0)&&(Number(!!(Number(((see_it=(Number(!!(Number(!!((Number(!!((Number(!((Number((C.u64((C.display_read_permonst_mflags1(C.display_read_monst_data(mon))&C.u64(65536n))))!=C.u64(0n))))))&&(Number(!!((Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"])))))))||(Number(!!((C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.TELEPAT)*C.sizes["struct prop"]))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<=C.display_read_you_unblind_telepat_range(C.u))))))))))))||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&(Number(!!(Number(!!(Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))||Number((C.u64((C.display_read_warntype_info_polyd(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0))))||(Number(!!(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&&(Number(C.display_read_warntype_info_species(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))==C.display_read_monst_data(mon))))))))))))))||(Number(!!((Number(!!(Number(!!(Number(!!(Number(!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))))&&(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.INFRAVISION)*C.sizes["struct prop"]))))))&&((C.i32((C.i32(C.display_read_permonst_mflags3(C.display_read_monst_data(mon)))&512))))))&&(Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(C.display_read_monst_my(mon))*8),"unsigned char *").value+Number(C.display_read_monst_mx(mon))*1),"unsigned char").value)&1)))!=0)))))&&(Number(!!((Number(!!(Number(!(C.field(mon,"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(mon,"monst","mundetected").value)))))))))))))!=0)||(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.DETECT_MONSTERS)*C.sizes["struct prop"]))))&&Number(!((Number(!!((mon)&&(Number(!!((Number(C.i32(x)!=C.i32(C.display_read_monst_mx(mon))))||(Number(C.i32(y)!=C.i32(C.display_read_monst_my(mon))))))))))))))))))))) {
            /* Seen or sensed monsters are printed every time.
               This also gets rid of any invisibility glyph. */
            display_monster(x,y,mon,(see_it?0:2),C.i8(((Number(!!((mon)&&(Number(!!((Number(C.i32(x)!=C.i32(C.display_read_monst_mx(mon))))||(Number(C.i32(y)!=C.i32(C.display_read_monst_my(mon))))))))))?C.i32((C.i8(1))):C.i32((C.i8(0))))));
        } else if(Number(!!(Number(!!(mon&&(Number(!!(Number(!!(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARNING)*C.sizes["struct prop"]))))&&Number(!(C.field((mon),"monst","mpeaceful").value))))&&(Number(C.dist2((C.display_read_monst_mx(mon)),(C.display_read_monst_my(mon)),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))<100))))&&(Number(((C.i32(Math.trunc((C.i32(C.display_read_monst_m_lev(mon))/4)))))>=C.display_read_context_info_warnlevel(C.display_address_instance_globals_saved_c_context(C.svc)))))))))&&Number(!((Number(!!((mon)&&(Number(!!((Number(C.i32(x)!=C.i32(C.display_read_monst_mx(mon))))||(Number(C.i32(y)!=C.i32(C.display_read_monst_my(mon))))))))))))))) {
            display_warning(mon);
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
        } else if(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))) {
            if(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else if(Number(!!(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)))&&Number(!(C.field(lev,"rm","waslit").value))))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_stone)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_stone)<=C.S_trwall))?(C.i32((C.i32(((C.S_stone)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_stone)<C.S_altar))?(C.i32(((C.i32(((C.S_stone)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_stone)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_stone)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_stone)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_stone)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_stone)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else {show_mem();return;} /* original goto show_mem */
        } else if(Number(!!(Number(!(C.field(lev,"rm","waslit").value))||(Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags)))))))) {
            if(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else if(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)))) show_glyph(x,y,(C.field(lev,"rm","glyph").value=(((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<=C.S_trwall))?(C.i32((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<C.S_altar))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))<=C.S_goodpos))?(C.i32(((C.i32(((((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))))));
 else {show_mem();return;} /* original goto show_mem */
        } else {
            show_mem();
        }
    }
    function show_mem(){
                show_glyph(x,y,C.display_read_rm_glyph(lev));
    }
}

/*
 * shieldeff()
 *
 * Put magic shield pyrotechnics at the given location.  This *could* be
 * pulled into a platform dependent routine for fancier graphics if desired.
 */
export function shieldeff(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let i;
    if(Number(!(C.display_read_flag_sparkle(C.flags)))) return;
    if((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))) {
        /* Don't see anything if can't see the location */
        for((i=0);Number(i<21);((i=C.i32((i+1)))-1)) {
            show_glyph(x,y,(((Number((C.cell((C.shield_static+Number(i)*4),"int").value)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.cell((C.shield_static+Number(i)*4),"int").value)<=C.S_trwall))?(C.i32((C.i32(((C.cell((C.shield_static+Number(i)*4),"int").value)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.cell((C.shield_static+Number(i)*4),"int").value)<C.S_altar))?(C.i32(((C.i32(((C.cell((C.shield_static+Number(i)*4),"int").value)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.cell((C.shield_static+Number(i)*4),"int").value)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.cell((C.shield_static+Number(i)*4),"int").value)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.cell((C.shield_static+Number(i)*4),"int").value)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.cell((C.shield_static+Number(i)*4),"int").value)<=C.S_goodpos))?(C.i32(((C.i32(((C.cell((C.shield_static+Number(i)*4),"int").value)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
            flush_screen(1);
            /* make sure the glyph shows up */
            C.indirect(0,(C.display_read_window_procs_win_delay_output(C.windowprocs)));
        }
        newsym(x,y);
        /* restore the old information */
    }
}

export function tether_glyph(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let tdx; let tdy;
    (tdx=C.i32((C.i32(C.display_read_you_ux(C.u))-C.i32(x))));
    (tdy=C.i32((C.i32(C.display_read_you_uy(C.u))-C.i32(y))));
    return zapdir_to_glyph(C.sgn(tdx),C.sgn(tdy),2);
}

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
/* previously updated positions */
/* index of next unused slot in saved[] */
/* either DISP_BEAM or DISP_FLASH or DISP_ALWAYS */
/* glyph to use when printing */
export function tmp_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    
    let tmp;
    switch(C.i32(x)) {
        case ((C.i32((-1)))):
            case ((C.i32((-2)))):
                case ((C.i32((-3)))):
                    case ((C.i32((-4)))):
                        case ((C.i32((-5)))):
                            if(Number(!(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))) (tmp=C.staticAddress("tgfirst"));
 else (tmp=C.alloc(C.u32(BigInt(C.sizes["struct tmp_glyph"]))));
        /* nested effect; we need dynamic memory */
        (C.field(tmp,"tmp_glyph","prev").value=C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value);
        (C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value=tmp);
        (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=0);
        (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","style").value=C.i32(x));
        (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","glyph").value=C.i32(y));
        flush_screen(0);
        /* flush buffered glyphs */
        return;
        case ((C.i32((-8)))):
            /* in case game ends with tmp_at() in progress */
            while(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value) {
                (tmp=C.display_read_tmp_glyph_prev(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));
                if(Number(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value!=C.staticAddress("tgfirst"))) C.free(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value);
                (C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value=tmp);
            }
        return;
        default:
            break;
    }
    if(Number(!(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))) {
        C.variadic(2,C.literal("tmp_at: tglyph not initialized"));
    } else {
        switch(C.i32(x)) {
            case ((C.i32((-6)))):
                (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","glyph").value=C.i32(y));
            break;
            case ((C.i32((-7)))):
                if(Number(!!(Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-1))))||Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-2))))))) {
                    let i;
                    /* Erase (reset) from source to end */
                    for((i=0);Number(i<C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));((i=C.i32((i+1)))-1)) newsym(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]));

                } else if(Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-3))))) {
                    let i;
                    if(Number(!!(Number(C.i32(y)==(C.i32((-1))))&&Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)>1)))) {
                        /* backtrack */
                        for((i=C.i32((C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)-1)));Number(i>0);((i=C.i32((i-1)))+1)) {
                            newsym(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]));
                            show_glyph(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.i32((i-1)))*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.i32((i-1)))*C.sizes["struct nhcoord"]),C.display_read_tmp_glyph_glyph(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));
                            flush_screen(0);
                            /* make sure it shows up */
                            C.indirect(1,(C.display_read_window_procs_win_delay_output(C.windowprocs)));
                        }
                        (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=1);
                    }
                    for((i=0);Number(i<C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));((i=C.i32((i+1)))-1)) newsym(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(i)*C.sizes["struct nhcoord"]));

                } else {
                    /* DISP_FLASH or DISP_ALWAYS */
                    if(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)) newsym(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]));
                    /* been called at least once */
                }
            /* tglyph->sidx = 0; -- about to be freed, so not necessary */
            (tmp=C.display_read_tmp_glyph_prev(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));
            if(Number(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value!=C.staticAddress("tgfirst"))) C.free(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value);
            (C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value=tmp);
            break;
            default:
                /* do it */
                if(Number(!(C.isok(x,y)))) break;
            if(Number(!!(Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-1))))||Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-2))))))) {
                if(Number(!!(Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)!=(C.i32((-2))))&&Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))))) break;
                if(Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)>=(C.i32((80*2))))) break;
                /* too many locations */
                /* save pos for later erasing */
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))*C.sizes["struct nhcoord"]),"nhcoord","x").value=x);
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))*C.sizes["struct nhcoord"]),"nhcoord","y").value=y);
                (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=C.i32(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+1));
            } else if(Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)==(C.i32((-3))))) {
                if(Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)>=(C.i32((80*2))))) break;
                /* too many locations */
                if(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)) {
                    let px; let py;
                    (px=C.i32(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.i32((C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)-1)))*C.sizes["struct nhcoord"])));
                    (py=C.i32(C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.i32((C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)-1)))*C.sizes["struct nhcoord"])));
                    show_glyph(C.i16(px),C.i16(py),tether_glyph(C.i16(px),C.i16(py)));
                }
                /* save pos for later use or erasure */
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))*C.sizes["struct nhcoord"]),"nhcoord","x").value=x);
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value))*C.sizes["struct nhcoord"]),"nhcoord","y").value=y);
                (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=C.i32(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+1));
            } else {
                /* DISP_FLASH/ALWAYS */
                if(C.display_read_tmp_glyph_sidx(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)) {
                    /* not first call, so reset previous pos */
                    newsym(C.display_read_nhcoord_x(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]),C.display_read_nhcoord_y(C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]));
                    (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=0);
                    /* display is presently up to date */
                }
                if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))&&Number(C.display_read_tmp_glyph_style(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)!=(C.i32((-5))))))) break;
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]),"nhcoord","x").value=x);
                (C.field((C.display_address_tmp_glyph_saved(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value)+Number(0)*C.sizes["struct nhcoord"]),"nhcoord","y").value=y);
                (C.field(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value,"tmp_glyph","sidx").value=1);
            }
            show_glyph(x,y,C.display_read_tmp_glyph_glyph(C.cell(C.staticAddress("tmp_at.tglyph"),"struct tmp_glyph *").value));
            /* show it */
            flush_screen(0);
            /* make sure it shows up */
            break;
        }
        /* end switch */
    }
}

/*
 * flash_glyph_at(x, y, glyph, repeatcount)
 *
 * Briefly flash between the passed glyph and the glyph that's
 * meant to be at the location.
 */
export function flash_glyph_at(x,y,tg,rpt)
{
    x=C.i16(x);
    y=C.i16(y);
    tg=C.i32(tg);
    rpt=C.i32(rpt);
    const stackFrame=C.stackSave();
    try {
    let i; let glyph=C.stackAlloc((4*2));
    (rpt=C.i32(rpt*2));
    /* two loop iterations per 'count' */
    (C.cell((glyph+Number(0)*4),"int").value=tg);
    (C.cell((glyph+Number(1)*4),"int").value=(C.i32((C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","hero_memory").value))?C.display_read_rm_glyph((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]):back_to_glyph(x,y)));
    /* even iteration count (guaranteed) ends with glyph[1] showing;
       caller might want to override that, but no newsym() calls here
       in case caller has tinkered with location visibility */
    for((i=0);Number(i<rpt);((i=C.i32((i+1)))-1)) {
        show_glyph(x,y,C.cell((glyph+Number(C.i32((i%2)))*4),"int").value);
        flush_screen(1);
        C.indirect(2,(C.display_read_window_procs_win_delay_output(C.windowprocs)));
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * swallowed()
 *
 * The hero is swallowed.  Show a special graphics sequence for this.  This
 * bypasses all of the display routines and messes with buffered screen
 * directly.  This method works because both vision and display check for
 * being swallowed.
 */
export function swallowed(first)
{
    first=C.i32(first);
    
    /* last swallowed position */
    let swallower; let left_ok; let rght_ok;
    if(first) {
        cls();
        C.bot();
    } else {
        let x; let y;
        /* Clear old location */
        for((y=C.i16(C.i32((C.i32(C.cell(C.staticAddress("swallowed.lasty"),"short").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.cell(C.staticAddress("swallowed.lasty"),"short").value)+1)));((y=C.i16((y+1)))-1)) for((x=C.i16(C.i32((C.i32(C.cell(C.staticAddress("swallowed.lastx"),"short").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.cell(C.staticAddress("swallowed.lastx"),"short").value)+1)));((x=C.i16((x+1)))-1)) if(C.isok(x,y)) show_glyph(x,y,C.GLYPH_UNEXPLORED_OFF);


    }
    (swallower=C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(C.display_read_you_ustuck(C.u))))));
    /* assume isok(u.ux,u.uy) */
    (left_ok=C.isok(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))-1))),C.display_read_you_uy(C.u)));
    (rght_ok=C.isok(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))+1))),C.display_read_you_uy(C.u)));
    /*
     *  Display the hero surrounded by the monster's stomach.
     */
    if(C.isok(C.display_read_you_ux(C.u),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))-1))))) {
        if(left_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))-1))),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))-1))),swallow_to_glyph(swallower,C.S_sw_tl));
        show_glyph(C.display_read_you_ux(C.u),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))-1))),swallow_to_glyph(swallower,C.S_sw_tc));
        if(rght_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))+1))),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))-1))),swallow_to_glyph(swallower,C.S_sw_tr));
    }
    if(left_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))-1))),C.display_read_you_uy(C.u),swallow_to_glyph(swallower,C.S_sw_ml));
    show_glyph(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u),(((Number(!!(C.display_read_you_usteed(C.u)&&(Number(!!((Number(!!(Number(!(C.field(C.display_read_you_usteed(C.u),"monst","minvis").value))||(Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])))))))&&Number(!(C.field(C.display_read_you_usteed(C.u),"monst","mundetected").value))))))))?(C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):C.i32((C.display_read_permonst_pmidx(C.display_read_monst_data(C.display_read_you_usteed(C.u)))))))+(((Number(C.i32(C.field((C.display_read_you_usteed(C.u)),"monst","female").value)==0))?C.GLYPH_RIDDEN_MALE_OFF:C.GLYPH_RIDDEN_FEM_OFF))))):(((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_NOTHING))?(C.i32(((((Number(!!((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))||Number(!(C.display_read_flag_showrace(C.flags))))))?C.display_read_you_umonnum(C.u):C.i32(C.display_read_Race_mnum(C.display_address_instance_globals_u_urace(C.gu)))))+(((Number((((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_FURNITURE))?(((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_trwall))?(C.i32((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.S_altar))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))<=C.S_goodpos))?(C.i32(((C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):((Number((C.i32((C.i32(C.display_read_monst_m_ap_type(C.display_address_instance_globals_y_youmonst(C.gy)))&7)))==C.M_AP_OBJECT))?(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+C.GLYPH_OBJ_OFF))):(C.i32(((C.i32(C.display_read_monst_mappearance(C.display_address_instance_globals_y_youmonst(C.gy))))+(((Number(((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0)))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))))));
    if(rght_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))+1))),C.display_read_you_uy(C.u),swallow_to_glyph(swallower,C.S_sw_mr));
    if(C.isok(C.display_read_you_ux(C.u),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))+1))))) {
        if(left_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))-1))),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))+1))),swallow_to_glyph(swallower,C.S_sw_bl));
        show_glyph(C.display_read_you_ux(C.u),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))+1))),swallow_to_glyph(swallower,C.S_sw_bc));
        if(rght_ok) show_glyph(C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))+1))),C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))+1))),swallow_to_glyph(swallower,C.S_sw_br));
    }
    /* Update the swallowed position. */
    (C.cell(C.staticAddress("swallowed.lastx"),"short").value=C.display_read_you_ux(C.u));
    (C.cell(C.staticAddress("swallowed.lasty"),"short").value=C.display_read_you_uy(C.u));
}

/*
 * under_water()
 *
 * Similar to swallowed() in operation.  Shows hero when underwater
 * except when in water level.  Special routines exist for that.
 */
export function under_water(mode)
{
    mode=C.i32(mode);
    
    
    let x; let y;
    /* swallowing has a higher precedence than under water */
    if(Number(!!(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))||C.i32(C.field(C.u,"you","uswallow").value)))) return;
    /* full update */
    if(Number(!!(Number(mode==1)||C.i32(C.cell(C.staticAddress("under_water.dela"),"signed char").value)))) {
        cls();
        (C.cell(C.staticAddress("under_water.dela"),"signed char").value=(C.i8(0)));
        /* delayed full update */
    } else if(Number(mode==2)) {
        (C.cell(C.staticAddress("under_water.dela"),"signed char").value=(C.i8(1)));
        return;
        /* limited update */
    } else {
        for((y=C.i16(C.i32((C.i32(C.cell(C.staticAddress("under_water.lasty"),"short").value)-1))));Number(C.i32(y)<=C.i32((C.i32(C.cell(C.staticAddress("under_water.lasty"),"short").value)+1)));((y=C.i16((y+1)))-1)) for((x=C.i16(C.i32((C.i32(C.cell(C.staticAddress("under_water.lastx"),"short").value)-1))));Number(C.i32(x)<=C.i32((C.i32(C.cell(C.staticAddress("under_water.lastx"),"short").value)+1)));((x=C.i16((x+1)))-1)) if(C.isok(x,y)) show_glyph(x,y,C.GLYPH_UNEXPLORED_OFF);


    }
    /*
     * TODO?  Should this honor Xray radius rather than force radius 1?
     */
    for((x=C.i16(C.i32((C.i32(C.display_read_you_ux(C.u))-1))));Number(C.i32(x)<=C.i32((C.i32(C.display_read_you_ux(C.u))+1)));((x=C.i16((x+1)))-1)) for((y=C.i16(C.i32((C.i32(C.display_read_you_uy(C.u))-1))));Number(C.i32(y)<=C.i32((C.i32(C.display_read_you_uy(C.u))+1)));((y=C.i16((y+1)))-1)) if(Number(!!(C.isok(x,y)&&(Number(!!(C.i32(C.is_pool_or_lava(x,y))||C.i32(C.is_ice(x,y)))))))) {
        if(Number(!!((Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))&&Number(!(C.display_read_prop_blocked(C.display_address_you_uprops(C.u)+Number(C.BLINDED)*C.sizes["struct prop"]))))))&&Number(!((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))))))) show_glyph(x,y,C.GLYPH_UNEXPLORED_OFF);
 else newsym(x,y);
    }


    (C.cell(C.staticAddress("under_water.lastx"),"short").value=C.display_read_you_ux(C.u));
    (C.cell(C.staticAddress("under_water.lasty"),"short").value=C.display_read_you_uy(C.u));
}

/*
 *      under_ground()
 *
 *      Very restricted display.  You can only see yourself.
 */
export function under_ground(mode)
{
    mode=C.i32(mode);
    
    /* swallowing has a higher precedence than under ground */
    if(C.field(C.u,"you","uswallow").value) return;
    /* full update */
    if(Number(!!(Number(mode==1)||C.i32(C.cell(C.staticAddress("under_ground.dela"),"signed char").value)))) {
        cls();
        (C.cell(C.staticAddress("under_ground.dela"),"signed char").value=(C.i8(0)));
        /* delayed full update */
    } else if(Number(mode==2)) {
        (C.cell(C.staticAddress("under_ground.dela"),"signed char").value=(C.i8(1)));
        return;
        /* limited update */
    } else {
        newsym(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u));
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
export function see_monsters()
{
    let mon;
    let new_warn_obj_cnt=0;
    if(C.display_read_instance_globals_d_defer_see_monsters(C.gd)) return;
    /* steed and unseen engulfer/holder/holdee are recognized via touch
       even if they aren't going to be rendered; other monsters
       may get flagged as having been seen by display_monster() if it's
       called by newsym() */
    if(C.display_read_you_usteed(C.u)) (C.field(C.display_read_you_usteed(C.u),"monst","meverseen").value=C.u32(1));
    if(C.display_read_you_ustuck(C.u)) (C.field(C.display_read_you_ustuck(C.u),"monst","meverseen").value=C.u32(1));
    /* loop through level.monsters (aka fmon) */
    for((mon=C.display_read_dlevel_t_monlist(C.display_address_instance_globals_saved_l_level(C.svl)));mon;(mon=C.display_read_monst_nmon(mon))) {
        if((Number(C.display_read_monst_mhp(mon)<1))) continue;
        if(Number((C.i64((C.display_read_monst_mstate(mon)&C.i64(256))))!=C.i64(0))) continue;
        newsym(C.display_read_monst_mx(mon),C.display_read_monst_my(mon));
        if(C.field(mon,"monst","wormno").value) C.see_wsegs(mon);
        if(Number(!!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.WARN_OF_MON)*C.sizes["struct prop"]))))&&Number((C.u64((C.display_read_warntype_info_obj(C.display_address_context_info_warntype(C.display_address_instance_globals_saved_c_context(C.svc)))&C.display_read_permonst_mflags2(C.display_read_monst_data(mon)))))!=C.u64(0n))))) ((new_warn_obj_cnt=C.i32((new_warn_obj_cnt+1)))-1);
    }
    /*
     * Make Sting glow blue or stop glowing if required.
     */
    if(Number(new_warn_obj_cnt!=C.display_read_instance_globals_w_warn_obj_cnt(C.gw))) {
        C.Sting_effects(new_warn_obj_cnt);
        (C.field(C.gw,"instance_globals_w","warn_obj_cnt").value=new_warn_obj_cnt);
    }
    /* when mounted, hero's location gets caught by monster loop */
    if(Number(!(C.display_read_you_usteed(C.u)))) newsym(C.display_read_you_ux(C.u),C.display_read_you_uy(C.u));
}

export function mimic_light_blocking(mtmp)
{
    mtmp=C.ptr(mtmp);
    if(Number(!!(C.i32(C.field(mtmp,"monst","minvis").value)&&(Number(!!((Number(!!(Number((C.i32((C.i32(C.display_read_monst_m_ap_type(mtmp))&7)))==C.M_AP_OBJECT)&&Number(C.display_read_monst_mappearance(mtmp)==C.u32((C.BOULDER))))))||(Number(!!(Number((C.i32((C.i32(C.display_read_monst_m_ap_type(mtmp))&7)))==C.M_AP_FURNITURE)&&(Number(!!(Number(!!(Number(!!(Number(C.display_read_monst_mappearance(mtmp)==C.u32(C.S_hcdoor))||Number(C.display_read_monst_mappearance(mtmp)==C.u32(C.S_vcdoor))))||Number(C.display_read_monst_mappearance(mtmp)<C.u32(C.S_ndoor))))||Number(C.display_read_monst_mappearance(mtmp)==C.u32(C.S_tree)))))))))))))) {
        if((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.SEE_INVIS)*C.sizes["struct prop"]))))) C.block_point(C.i32(C.display_read_monst_mx(mtmp)),C.i32(C.display_read_monst_my(mtmp)));
 else C.unblock_point(C.i32(C.display_read_monst_mx(mtmp)),C.i32(C.display_read_monst_my(mtmp)));
    }
}

/*
 * Block/unblock light depending on what a mimic is mimicking and if it's
 * invisible or not.  Should be called only when the state of See_invisible
 * changes.
 */
export function set_mimic_blocking()
{
    C.iter_mons(C.ownedFunctionPointer("mimic_light_blocking"));
}

/*
 * Loop through all of the object *locations* and update them.  Called when
 *      + hallucinating.
 */
export function see_objects()
{
    let obj;
    for((obj=C.display_read_dlevel_t_objlist(C.display_address_instance_globals_saved_l_level(C.svl)));obj;(obj=C.display_read_obj_nobj(obj))) if(Number((C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(C.display_read_obj_ox(obj))*(8*21))+Number(C.display_read_obj_oy(obj))*8),"struct obj *").value)==obj)) newsym(C.display_read_obj_ox(obj),C.display_read_obj_oy(obj));

    /* Qt's "paper doll" subset of persistent inventory shows map tiles
       for objects which aren't on the floor so not handled by above loop;
       inventory which includes glyphs should also be affected, so do this
       for all interfaces in case any feature that for persistent inventory */
    C.update_inventory();
}

/* mark the top object of nearby stacks as having been seen, and if
   that object was being displayed as generic, redisplay it as specific */
export function see_nearby_objects()
{
    let obj;
    let glyph;
    let ix; let iy; let x=C.display_read_you_ux(C.u); let y=C.display_read_you_uy(C.u);
    /* these 'r' and 'neardist' calculations match distant_name(objnam.c) */
    let r=((Number(C.display_read_you_xray_range(C.u)>2))?C.display_read_you_xray_range(C.u):2); let neardist=C.i32((C.i32(((C.i32((r*r)))*2))-r));
    /* neardist produces a small square with rounded corners */
    /* same as r*r + r*(r-1) */
    /* [note: this could be optimized to avoid the distu() calculations] */
    for((iy=C.i16(C.i32((C.i32(y)-r))));Number(C.i32(iy)<=C.i32((C.i32(y)+r)));(iy=C.i16((iy+1)))) for((ix=C.i16(C.i32((C.i32(x)-r))));Number(C.i32(ix)<=C.i32((C.i32(x)+r)));(ix=C.i16((ix+1)))) {
        if(Number(!(C.isok(ix,iy)))) continue;
        /* skip if no object or the object has already been marked as
               having been seen up close */
        if(Number(!!(Number(((obj=(C.cell(((C.display_address_dlevel_t_objects(C.display_address_instance_globals_saved_l_level(C.svl))+Number(ix)*(8*21))+Number(iy)*8),"struct obj *").value)))==0)||C.i32(C.field(obj,"obj","dknown").value)))) continue;
        /* skip if the spot can't be seen or is too far (diagonal) */
        if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(iy)*8),"unsigned char *").value+Number(ix)*1),"unsigned char").value)&2)))!=0))))||Number(C.dist2((ix),(iy),C.display_read_you_ux(C.u),C.display_read_you_uy(C.u))>neardist)))) continue;
        C.observe_object(obj);
        /* operate on remembered glyph rather than current one */
        (glyph=C.display_read_rm_glyph((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(ix)*(C.sizes["struct rm"]*21))+Number(iy)*C.sizes["struct rm"]));
        if((Number(!!((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))||(Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1)))))))))) newsym_force(ix,iy);
    }

}

/*
 * Update hallucinated traps.
 */
export function see_traps()
{
    let trap;
    let glyph;
    for((trap=C.display_read_instance_globals_f_ftrap(C.gf));trap;(trap=C.display_read_trap_ntrap(trap))) {
        (glyph=C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(C.display_read_trap_ty(trap))*(C.sizes["gbuf_entry"]*80))+Number(C.display_read_trap_tx(trap))*C.sizes["gbuf_entry"])));
        if((Number(!!(Number((glyph)>=((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave))))))))&&Number((glyph)<(C.i32((((C.i32((C.GLYPH_CMAP_B_OFF+(C.i32((C.S_arrow_trap-C.S_grave)))))))+(C.i32((C.TRAPNUM-1))))))))))) newsym(C.display_read_trap_tx(trap),C.display_read_trap_ty(trap));
    }
}

/*  glyph, ttychar, framecolor,
    { glyphflags, { NO_COLOR, sym.symidx },
    customcolor, color256idx, tileidx, u } */
/* Note that the 'glyph' argument is not used in the expansion
 * of this !UNBUFFERED_GLYPHINFO (default) variation, but is
 * a requirement for the UNBUFFERED_GLYPHINFO variation */
/* tile.c */
/* glyph, ttychar, framecolor, { glyphflags, { sym.symidx }, nhcolor,
                     tileidx, 0} */
/* glyph_map */
/* from tile.c */
/*
 * Put the cursor on the hero.  Flush all accumulated glyphs before doing it.
 */
export function curs_on_u()
{
    flush_screen(1);
    /* Flush waiting glyphs & put cursor on hero */
}

/* the #redraw command */
export function doredraw()
{
    docrt();
    return 0;
}

/* the main refresh-the-screen routine */
export function docrt()
{
    docrt_flags(C.docrtRecalc);
}

/* docrt() with finer control */
export function docrt_flags(refresh_flags)
{
    refresh_flags=C.i32(refresh_flags);
    let x; let y;
    let lev;
    let maponly=C.i8(Number((C.i32((refresh_flags&C.docrtMapOnly)))!=0)); let redrawonly=C.i8(Number((C.i32((refresh_flags&C.docrtRefresh)))!=0)); let nocls=C.i8(Number((C.i32((refresh_flags&C.docrtNocls)))!=0));
    if(Number(!!(Number(!(C.display_read_you_ux(C.u)))||C.display_read_sinfo_in_docrt(C.program_state)))) return;
    /* display isn't ready yet */
    (C.field(C.program_state,"sinfo","in_docrt").value=C.i32((C.i8(1))));
    post_map: {
        if(redrawonly) {
            redraw_map((C.i8(0)));
            break post_map; /* original goto post_map */
        }
        if(C.field(C.u,"you","uswallow").value) {
            swallowed(1);
            break post_map; /* original goto post_map */
        }
        if(Number(!!(C.i32((C.field(C.u,"you","uinwater").value))&&Number(!(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_water_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))))))) {
            under_water(1);
            break post_map; /* original goto post_map */
        }
        if(C.field(C.u,"you","uburied").value) {
            /* [not implemented] */
            under_ground(1);
            break post_map; /* original goto post_map */
        }
        /* shut down vision */
        C.vision_recalc(2);
        /*
     * This routine assumes that cls() does the following:
     *      + fills the physical screen with the symbol for rock
     *      + clears the glyph buffer
     */
        if(Number(!(nocls))) cls();
        /* display memory */
        for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) {
            (lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(0)*C.sizes["struct rm"]));
            for((y=C.i16(0));Number(C.i32(y)<21);(((y=C.i16((y+1)))-1),((lev=C.ptr((lev+Number(C.sizes["struct rm"]))))-Number(C.sizes["struct rm"])))) show_glyph(x,y,C.display_read_rm_glyph(lev));

        }
        /* see what is to be seen */
        C.vision_recalc(0);
        /* overlay with monsters */
        see_monsters();
    }
    if(Number(!(maponly))) {
        /* perm_invent */
        C.update_inventory();
        /* status */
        (C.field(C.disp,"display_hints","botlx").value=(C.i8(1)));
        /* force a redraw of the bottom lines */
        /* note: caller needs to call bot() to actually redraw status */
    }
    (C.field(C.program_state,"sinfo","in_docrt").value=C.i32((C.i8(0))));
}

/* for panning beyond a clipped region; resend the current map data to
   the interface rather than use docrt()'s regeneration of that data */
export function redraw_map(cursor_on_u)
{
    cursor_on_u=C.i8(cursor_on_u);
    const stackFrame=C.stackSave();
    try {
    let x; let y;
    let glyph;
    let bkglyphinfo=C.stackAlloc(C.sizes["struct glyphinfo"]); C.copy(bkglyphinfo,C.staticAddress("nul_glyphinfo"),C.sizes["struct glyphinfo"]);
    /*
     * Not sure whether this is actually necessary; save and restore did
     * used to get much too involved with each dungeon level as it was
     * read and written.
     *
     * !u.ux: display isn't ready yet; (restoring || !on_level()): was part
     * of cliparound() but interface shouldn't access this much internals
     */
    if(Number(!!(Number(!!(Number(!(C.display_read_you_ux(C.u)))||C.i32(suppress_map_output())))||Number(!(C.on_level(C.display_address_you_uz0(C.u),C.display_address_you_uz(C.u))))))) return;
    /*
     * This yields sensible clipping when #terrain+getpos is in
     * progress and the screen displays something other than what
     * the map would currently be showing.
     */
    for((y=C.i16(0));Number(C.i32(y)<21);(y=C.i16((y+1)))) for((x=C.i16(1));Number(C.i32(x)<80);(x=C.i16((x+1)))) {
        (glyph=C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])));
        /* not levl[x][y].glyph */
        get_bkglyph_and_framecolor(x,y,C.display_address_glyphinfo_glyph(bkglyphinfo),C.display_address_glyphinfo_framecolor(bkglyphinfo));
        C.indirect(3,(C.display_read_window_procs_win_print_glyph(C.windowprocs)),C.global("WIN_MAP").value,x,y,(((Number(!!(Number(!!(Number(!!(Number(C.i32((x))<0)||Number(C.i32((y))<0)))||Number(C.i32((x))>=80)))||Number(C.i32((y))>=21))))?C.staticAddress("no_ginfo"):C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number((y))*(C.sizes["gbuf_entry"]*80))+Number((x))*C.sizes["gbuf_entry"]))),bkglyphinfo);
    }

    flush_screen(C.i32(cursor_on_u));
    ((glyph));
    } finally {C.stackRestore(stackFrame); }
}

/*
 * =======================================================
 */
export function reglyph_darkroom()
{
    let x; let y;
    for((x=C.i16(1));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        let lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
        if(Number(!(C.display_read_flag_dark_room(C.flags)))) {
            if(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&C.i32(C.field(lev,"rm","waslit").value)))) (C.field(lev,"rm","glyph").value=(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        } else {
            if(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_litcorr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_litcorr)<=C.S_trwall))?(C.i32((C.i32(((C.S_litcorr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_litcorr)<C.S_altar))?(C.i32(((C.i32(((C.S_litcorr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_litcorr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_litcorr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_litcorr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_litcorr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_litcorr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))))) (C.field(lev,"rm","glyph").value=(((Number((C.S_corr)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_corr)<=C.S_trwall))?(C.i32((C.i32(((C.S_corr)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_corr)<C.S_altar))?(C.i32(((C.i32(((C.S_corr)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_corr)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_corr)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_corr)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_corr)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_corr)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        }
        if(Number(!!(Number(!!(Number(!(C.display_read_flag_dark_room(C.flags)))||Number(!(C.display_read_instance_flags_wc_color(C.iflags)))))||((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))))) {
            if(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))) (C.field(lev,"rm","glyph").value=(C.i32(C.field(lev,"rm","waslit").value)?(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))):C.GLYPH_NOTHING_OFF));
        } else {
            if(Number(!!(Number(!!(Number(!!(Number(C.display_read_rm_glyph(lev)==(((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))))&&C.i32(C.display_read_rm_seenv(lev))))&&C.i32(C.field(lev,"rm","waslit").value)))&&Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))))) (C.field(lev,"rm","glyph").value=(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
 else if(Number(!!(Number(!!(Number(!!(Number(C.display_read_rm_glyph(lev)==C.GLYPH_NOTHING_OFF)&&Number(C.i32(C.display_read_rm_typ(lev))==C.ROOM)))&&C.i32(C.display_read_rm_seenv(lev))))&&Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))))) (C.field(lev,"rm","glyph").value=(((Number((C.S_darkroom)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_darkroom)<=C.S_trwall))?(C.i32((C.i32(((C.S_darkroom)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_darkroom)<C.S_altar))?(C.i32(((C.i32(((C.S_darkroom)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_darkroom)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_darkroom)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_darkroom)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_darkroom)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_darkroom)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
        }
    }

    if(Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags))))) (C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.S_darkroom)*1),"unsigned char").value=C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.S_room)*1),"unsigned char").value);
 else (C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.S_darkroom)*1),"unsigned char").value=C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.SYM_NOTHING+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value);
}

/* ======================================================================== */
/* Glyph Buffering (3rd screen) =========================================== */
/* FIXME: This is a dirty hack, because newsym() doesn't distinguish
 * between object piles and single objects, it doesn't mark the location
 * for update. */
export function newsym_force(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    newsym(x,y);
    (C.field(((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]),"gbuf_entry","gnew").value=C.i8(1));
    if(Number(C.i32(C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value)>C.i32(x))) (C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value=x);
    if(Number(C.i32(C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value)<C.i32(x))) (C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value=x);
}

/*
 * Store the glyph in the 3rd screen for later flushing.
 */
export function show_glyph(x,y,glyph)
{
    x=C.i16(x);
    y=C.i16(y);
    glyph=C.i32(glyph);
    const stackFrame=C.stackSave();
    try {
    let glyphinfo=C.stackAlloc(C.sizes["struct glyphinfo"]);
    let show_glyph_change=(C.i8(0));
    let oldglyph;
    /* don't process map glyphs when saving, restoring, or in_mklev */
    if((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state))))) return;
    //if (glyph == 3972 || glyph == 3988)
    //    __debugbreak();
    /*
     * Check for bad positions and glyphs.
     */
    if(Number(!(C.isok(x,y)))) {
        let text=C.literal("");
        let offset=C.i32((-1));
        /* column 0 is invalid, but it's often used as a flag, so ignore it */
        if(Number(C.i32(x)==0)) return;
        /*
         *  This assumes an ordering of the offsets.  See display.h for
         *  the definition.
         */
        if(Number(!!(Number(glyph<0)||Number(glyph>=C.MAX_GLYPH)))) {
            /* invalid location and also invalid glyph */
            (text=C.literal("invalid"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_NOTHING_OFF)))))>=0)) {
            (text=C.literal("nothing"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_UNEXPLORED_OFF)))))>=0)) {
            (text=C.literal("unexplored"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_FEM_PILETOP_OFF)))))>=0)) {
            (text=C.literal("statue of a female monster at top of a pile"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_MALE_PILETOP_OFF)))))>=0)) {
            (text=C.literal("statue of a male monster at top of a pile"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_BODY_PILETOP_OFF)))))>=0)) {
            (text=C.literal("body at top of a pile"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_OBJ_PILETOP_OFF)))))>=0)) {
            (text=(((Number(!!(Number((glyph)>C.GLYPH_OBJ_PILETOP_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_PILETOP_OFF+C.FIRST_OBJECT))-1))))))?C.literal("generic object at top of a pile"):C.literal("object at top of a pile"))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_FEM_OFF)))))>=0)) {
            (text=C.literal("statue of female monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_MALE_OFF)))))>=0)) {
            (text=C.literal("statue of male monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_WARNING_OFF)))))>=0)) {
            /* warn flash */
            (text=C.literal("warning explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_FROSTY_OFF)))))>=0)) {
            (text=C.literal("frosty explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_FIERY_OFF)))))>=0)) {
            (text=C.literal("fiery explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_MAGICAL_OFF)))))>=0)) {
            (text=C.literal("magical explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_WET_OFF)))))>=0)) {
            (text=C.literal("wet explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_MUDDY_OFF)))))>=0)) {
            (text=C.literal("muddy explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_NOXIOUS_OFF)))))>=0)) {
            (text=C.literal("noxious explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_DARK_OFF)))))>=0)) {
            (text=C.literal("dark explosion"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_SWALLOW_OFF)))))>=0)) {
            (text=C.literal("swallow"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_C_OFF)))))>=0)) {
            (text=C.literal("cmap C"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_ZAP_OFF)))))>=0)) {
            (text=C.literal("zap"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_B_OFF)))))>=0)) {
            (text=C.literal("cmap B"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_ALTAR_OFF)))))>=0)) {
            (text=C.literal("altar"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_A_OFF)))))>=0)) {
            (text=C.literal("cmap A"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_SOKO_OFF)))))>=0)) {
            (text=C.literal("sokoban dungeon walls"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_KNOX_OFF)))))>=0)) {
            (text=C.literal("knox dungeon walls"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_GEH_OFF)))))>=0)) {
            (text=C.literal("gehennom dungeon walls"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_MINES_OFF)))))>=0)) {
            (text=C.literal("gnomish mines dungeon walls"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_MAIN_OFF)))))>=0)) {
            (text=C.literal("main dungeon walls"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_STONE_OFF)))))>=0)) {
            (text=C.literal("stone"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_OBJ_OFF)))))>=0)) {
            (text=(((Number(!!(Number((glyph)>C.GLYPH_OBJ_OFF)&&Number((glyph)<C.i32((C.i32((C.GLYPH_OBJ_OFF+C.FIRST_OBJECT))-1))))))?C.literal("generic object"):C.literal("object"))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_RIDDEN_FEM_OFF)))))>=0)) {
            (text=C.literal("ridden female monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_RIDDEN_MALE_OFF)))))>=0)) {
            (text=C.literal("ridden male monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_BODY_OFF)))))>=0)) {
            (text=C.literal("body"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_DETECT_FEM_OFF)))))>=0)) {
            (text=C.literal("detected female monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_DETECT_MALE_OFF)))))>=0)) {
            (text=C.literal("detected male monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_INVIS_OFF)))))>=0)) {
            (text=C.literal("invisible monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_PET_FEM_OFF)))))>=0)) {
            (text=C.literal("female pet"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_PET_MALE_OFF)))))>=0)) {
            (text=C.literal("male pet"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_MON_FEM_OFF)))))>=0)) {
            (text=C.literal("female monster"));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_MON_MALE_OFF)))))>=0)) {
            (text=C.literal("male monster"));
        }
        C.variadic(3,C.literal("show_glyph:  bad pos <%d,%d> with glyph %d [%s %d]."),C.i32(x),C.i32(y),glyph,text,offset);
        return;
    } else if(Number(!!(Number(glyph<0)||Number(glyph>=C.MAX_GLYPH)))) {
        /* valid location but invalid glyph */
        C.variadic(4,C.literal("show_glyph:  bad glyph %d [max %d] at <%d,%d>."),glyph,C.MAX_GLYPH,C.i32(x),C.i32(y));
        return;
    }
    /* without UNBUFFERED_GLYPHINFO defined the glyphinfo values are buffered
       alongside the glyphs themselves for better performance, increased
       buffer size */
    map_glyphinfo(x,y,glyph,C.u32(0),glyphinfo);
    (oldglyph=C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])));
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(C.i32(C.display_read_accessibility_data_glyph_updates(C.a11y))&&Number(!(C.display_read_accessibility_data_mon_notices_blocked(C.a11y)))))&&Number(!(C.display_read_sinfo_in_docrt(C.program_state)))))&&Number(!(C.display_read_sinfo_gameover(C.program_state)))))&&Number(!(C.display_read_sinfo_in_getlev(C.program_state)))))&&Number(!(C.display_read_sinfo_stopprint(C.program_state)))))&&Number(!((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state))))))))&&(Number(!!(Number(oldglyph!=glyph)||C.i32(C.display_read_gbuf_entry_gnew((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])))))))) {
        let c=C.glyph_to_cmap(glyph);
        if(Number(!!(Number(!!((Number(!!(Number(!!((Number((oldglyph)==C.GLYPH_NOTHING_OFF))||(Number((oldglyph)==C.GLYPH_UNEXPLORED_OFF))))||(Number(!!(Number((c)>=C.S_upstair)&&Number((c)<=C.S_fountain)))))))&&Number(!((Number(!!(Number((c)>=C.S_stone)&&Number((c)<=C.S_trwall))))))))&&Number(!((Number(!!(Number((c)>=C.S_room)&&Number((c)<=C.S_darkroom))))))))) {
            if(Number(!!(Number(!!((Number(!!(C.i32(C.display_read_accessibility_data_mon_notices(C.a11y))&&(Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((glyph)>=C.GLYPH_MON_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_MON_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS))))))))))))))))||((Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_MON_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_MON_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_PET_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_PET_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((oldglyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((oldglyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((oldglyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS))))))))))))))))||(Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))))) {
                ;
                /* nothing */
            } else {
                (show_glyph_change=(C.i8(1)));
            }
        }
    }
    if(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(!!(Number(C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]))!=glyph)||Number(C.display_read_glyphinfo_ttychar(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]))!=C.display_read_glyphinfo_ttychar(glyphinfo))))||Number(C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])))!=C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(glyphinfo)))))||Number(C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])))!=C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(glyphinfo)))))||Number(C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]))))!=C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo))))))||Number(C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]))))!=C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(glyphinfo))))))||C.i32(C.display_read_instance_flags_use_background_glyph(C.iflags))))) {
        /* flags might change (single object vs pile, monster tamed or pet
           gone feral), color might change (altar's alignment converted by
           invisible hero), but ttychar normally won't change unless the
           glyph does too (changing boulder symbol would be an exception,
           but that triggers full redraw so doesn't matter here); still,
           be thorough and check everything */
        (C.field(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]),"glyphinfo","glyph").value=glyph);
        (C.field(((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]),"gbuf_entry","gnew").value=C.i8(1));
        (C.field(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]),"glyphinfo","glyph").value=C.display_read_glyphinfo_glyph(glyphinfo));
        (C.field(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]),"glyphinfo","ttychar").value=C.display_read_glyphinfo_ttychar(glyphinfo));
        C.copy(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"])),C.display_address_glyphinfo_gm(glyphinfo),C.sizes["struct glyph_map_entry"]);
        if(Number(C.i32(C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value)>C.i32(x))) (C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value=x);
        if(Number(C.i32(C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value)<C.i32(x))) (C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value=x);
    }
    if(show_glyph_change) {
        let buf=C.stackAlloc((1*256));
        let cc=C.stackAlloc(C.sizes["struct nhcoord"]);
        let sym=0;
        let firstmatch=C.local("char *",0);
        let tmp_accessiblemsg=C.display_read_accessibility_data_accessiblemsg(C.a11y);
        (C.field(C.a11y,"accessibility_data","accessiblemsg").value=(C.i8(1)));
        ((C.field(cc,"nhcoord","x").value=x),(C.field(cc,"nhcoord","y").value=y));
        C.do_screen_description(cc,(C.i8(1)),sym,buf,firstmatch.address,0);
        C.variadic(5,x,y,C.literal("%s."),firstmatch.value);
        (C.field(C.a11y,"accessibility_data","accessiblemsg").value=tmp_accessiblemsg);
    }
    } finally {C.stackRestore(stackFrame); }
}

/*
 * Reset the changed glyph borders so that none of the 3rd screen has
 * changed.
 */
/* gnew */
/* glyphinfo.glyph, glyphinfo.ttychar */
/* glyphinfo.gm */
/*
 * Turn the 3rd screen into UNEXPLORED that needs to be refreshed.
 */
export function clear_glyph_buffer()
{
    let x; let y;
    let gptr=((C.display_address_instance_globals_g_gbuf(C.gg)+Number(0)*(C.sizes["gbuf_entry"]*80))+Number(0)*C.sizes["gbuf_entry"]);
    let giptr=C.display_address_gbuf_entry_glyphinfo(gptr);
    (C.field(C.staticAddress("nul_gbuf"),"gbuf_entry","gnew").value=C.i8(((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.display_read_glyphinfo_ttychar(giptr)!=C.display_read_glyphinfo_ttychar(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf"))))||Number(C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(giptr)))!=C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf"))))))))||Number(C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(giptr))!=C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))||Number(C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(giptr))!=C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))||Number(C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(giptr)))!=C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))))?1:0)));
    for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        (gptr=((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(0)*C.sizes["gbuf_entry"]));
        for((x=C.i16(80));x;((x=C.i16((x-1)))+1)) {
            C.copy(((gptr=C.ptr((gptr+Number(C.sizes["gbuf_entry"]))))-Number(C.sizes["gbuf_entry"])),C.staticAddress("nul_gbuf"),C.sizes["gbuf_entry"]);
        }
        (C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value=C.i16(1));
        (C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value=C.i16(C.i32((80-1))));
    }
}

/* used by tty after menu or text popup has temporarily overwritten the map
   and it has been erased so shows spaces, not necessarily S_unexplored */
export function row_refresh(start,stop,y)
{
    start=C.i16(start);
    stop=C.i16(stop);
    y=C.i16(y);
    const stackFrame=C.stackSave();
    try {
    let x;
    let glyph;
    let force;
    let gptr=((C.display_address_instance_globals_g_gbuf(C.gg)+Number(0)*(C.sizes["gbuf_entry"]*80))+Number(0)*C.sizes["gbuf_entry"]);
    let bkglyphinfo=C.stackAlloc(C.sizes["struct glyphinfo"]); C.copy(bkglyphinfo,C.staticAddress("nul_glyphinfo"),C.sizes["struct glyphinfo"]);
    let giptr=C.display_address_gbuf_entry_glyphinfo(gptr);
    (force=C.i8(((Number(!!(Number(!!(Number(!!(Number(!!(Number(C.display_read_glyphinfo_ttychar(giptr)!=C.display_read_glyphinfo_ttychar(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf"))))||Number(C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(giptr)))!=C.display_read_classic_representation_color(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf"))))))))||Number(C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(giptr))!=C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))||Number(C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(giptr))!=C.display_read_glyph_map_entry_customcolor(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))||Number(C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(giptr)))!=C.i32(C.display_read_glyph_map_entry_tileidx(C.display_address_glyphinfo_gm(C.display_address_gbuf_entry_glyphinfo(C.staticAddress("nul_gbuf")))))))))?1:0)));
    for((x=start);Number(C.i32(x)<=C.i32(stop));((x=C.i16((x+1)))-1)) {
        (gptr=((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]));
        (glyph=C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo(gptr)));
        get_bkglyph_and_framecolor(x,y,C.display_address_glyphinfo_glyph(bkglyphinfo),C.display_address_glyphinfo_framecolor(bkglyphinfo));
        if(Number(!!(Number(!!(C.i32(force)||Number(glyph!=C.GLYPH_UNEXPLORED_OFF)))||Number(C.display_read_glyphinfo_framecolor(bkglyphinfo)!=C.u32(8))))) {
            C.indirect(4,(C.display_read_window_procs_win_print_glyph(C.windowprocs)),C.global("WIN_MAP").value,x,y,(((Number(!!(Number(!!(Number(!!(Number(C.i32((x))<0)||Number(C.i32((y))<0)))||Number(C.i32((x))>=80)))||Number(C.i32((y))>=21))))?C.staticAddress("no_ginfo"):C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number((y))*(C.sizes["gbuf_entry"]*80))+Number((x))*C.sizes["gbuf_entry"]))),bkglyphinfo);
        }
    }
    } finally {C.stackRestore(stackFrame); }
}

export function cls()
{
    
    if(C.cell(C.staticAddress("cls.in_cls"),"signed char").value) return;
    (C.cell(C.staticAddress("cls.in_cls"),"signed char").value=(C.i8(1)));
    C.indirect(5,(C.display_read_window_procs_win_display_nhwindow(C.windowprocs)),C.global("WIN_MESSAGE").value,(C.i8(0)));
    /* flush messages */
    (C.field(C.disp,"display_hints","botlx").value=(C.i8(1)));
    /* force update of botl window */
    C.indirect(6,(C.display_read_window_procs_win_clear_nhwindow(C.windowprocs)),C.global("WIN_MAP").value);
    /* clear physical screen */
    clear_glyph_buffer();
    /* force gbuf[][].glyph to unexplored */
    (C.cell(C.staticAddress("cls.in_cls"),"signed char").value=(C.i8(0)));
}

/*
 * Synch the third screen with the display.
 */
export function flush_screen(cursor_on_u)
{
    cursor_on_u=C.i32(cursor_on_u);
    const stackFrame=C.stackSave();
    try {
    /* Prevent infinite loops on errors:
     *      flush_screen->print_glyph->impossible->pline->flush_screen
     */
    
    
    let x; let y;
    let bkglyphinfo=C.stackAlloc(C.sizes["struct glyphinfo"]); C.copy(bkglyphinfo,C.staticAddress("nul_glyphinfo"),C.sizes["struct glyphinfo"]);
    let bkglyph=C.local("int",0);
    /* 5.0: don't update map, status, or perm_invent during save/restore */
    if((Number(!!(Number(!!(Number(!!(C.i32(C.display_read_instance_globals_i_in_mklev(C.gi))||C.display_read_sinfo_saving(C.program_state)))||C.display_read_sinfo_restoring(C.program_state)))||C.display_read_sinfo_done_hup(C.program_state))))) return;
    if(Number(cursor_on_u==C.i32((-1)))) (C.cell(C.staticAddress("flush_screen.delay_flushing"),"int").value=Number(!(C.cell(C.staticAddress("flush_screen.delay_flushing"),"int").value)));
    if(C.cell(C.staticAddress("flush_screen.delay_flushing"),"int").value) return;
    if(C.cell(C.staticAddress("flush_screen.flushing"),"int").value) return;
    /* if already flushing then return */
    (C.cell(C.staticAddress("flush_screen.flushing"),"int").value=1);
    if(C.display_read_sinfo_done_hup(C.program_state)) return;
    /* get this done now, before we place the cursor on the hero */
    if(Number(!!(C.i32(C.display_read_display_hints_botl(C.disp))||C.i32(C.display_read_display_hints_botlx(C.disp))))) C.bot();
 else if(C.display_read_display_hints_time_botl(C.disp)) C.timebot();
    for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) {
        let gptr=((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number((x=C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(y)*2),"short").value))*C.sizes["gbuf_entry"]);
        for(;Number(C.i32(x)<=C.i32(C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(y)*2),"short").value));(((gptr=C.ptr((gptr+Number(C.sizes["gbuf_entry"]))))-Number(C.sizes["gbuf_entry"])),((x=C.i16((x+1)))-1))) {
            get_bkglyph_and_framecolor(x,y,bkglyph.address,C.display_address_glyphinfo_framecolor(bkglyphinfo));
            if(Number(!!(C.i32(C.display_read_gbuf_entry_gnew(gptr))||(Number(!!(Number(C.display_read_win_settings_map_frame_color(C.display_address_instance_globals_w_wsettings(C.gw))!=C.u32(8))&&Number(C.display_read_glyphinfo_framecolor(bkglyphinfo)!=C.u32(8)))))))) {
                /* map_glyphinfo() won't touch framecolor */
                map_glyphinfo(x,y,bkglyph.value,C.u32(0),bkglyphinfo);
                C.indirect(7,(C.display_read_window_procs_win_print_glyph(C.windowprocs)),C.global("WIN_MAP").value,x,y,(((Number(!!(Number(!!(Number(!!(Number(C.i32((x))<0)||Number(C.i32((y))<0)))||Number(C.i32((x))>=80)))||Number(C.i32((y))>=21))))?C.staticAddress("no_ginfo"):C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number((y))*(C.sizes["gbuf_entry"]*80))+Number((x))*C.sizes["gbuf_entry"]))),bkglyphinfo);
                (C.field(gptr,"gbuf_entry","gnew").value=C.i8(0));
            }
        }
    }
{
        let i;
        for((i=0);Number(i<21);((i=C.i32((i+1)))-1)) {
            (C.cell((C.display_address_instance_globals_g_gbuf_start(C.gg)+Number(i)*2),"short").value=C.i16(C.i32((80-1))));
            (C.cell((C.display_address_instance_globals_g_gbuf_stop(C.gg)+Number(i)*2),"short").value=C.i16(0));
        }
    }    ;
    /* after map update, before display_nhwindow(WIN_MAP) */
    if(cursor_on_u) C.indirect(8,(C.display_read_window_procs_win_curs(C.windowprocs)),C.global("WIN_MAP").value,C.i32(C.display_read_you_ux(C.u)),C.i32(C.display_read_you_uy(C.u)));
    /* move cursor to the hero */
    C.indirect(9,(C.display_read_window_procs_win_display_nhwindow(C.windowprocs)),C.global("WIN_MAP").value,(C.i8(0)));
    (C.cell(C.staticAddress("flush_screen.flushing"),"int").value=0);
    } finally {C.stackRestore(stackFrame); }
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
export function back_to_glyph(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let idx; let bypass_glyph=C.MAX_GLYPH;
    let ptr=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    let sway;
    switch(C.i32(C.display_read_rm_typ(ptr))) {
        case (C.SCORR):
            case (C.STONE):
                (idx=(C.i32(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","arboreal").value)?C.S_tree:C.S_stone));
        break;
        case (C.ROOM):
            (idx=C.S_room);
        break;
        case (C.CORR):
            (idx=((Number(!!(C.i32(C.field(ptr,"rm","waslit").value)||C.i32(C.display_read_flag_lit_corridor(C.flags)))))?C.S_litcorr:C.S_corr));
        break;
        case (C.SDOOR):
            if(C.field(ptr,"rm","candig").value) {
                (idx=C.S_tree);
                break;
            }
        ;
        /*FALLTHRU*/
        case (C.HWALL):
            case (C.VWALL):
                case (C.TLCORNER):
                    case (C.TRCORNER):
                        case (C.BLCORNER):
                            case (C.BRCORNER):
                                case (C.CROSSWALL):
                                    case (C.TUWALL):
                                        case (C.TDWALL):
                                            case (C.TLWALL):
                                                case (C.TRWALL):
                                                    (idx=(C.i32(C.display_read_rm_seenv(ptr))?wall_angle(ptr):C.S_stone));
        break;
        case (C.DOOR):
            if(C.field(ptr,"rm","flags").value) {
                if(C.i32((C.i32(C.field(ptr,"rm","flags").value)&1))) (idx=C.S_ndoor);
 else if(C.i32((C.i32(C.field(ptr,"rm","flags").value)&2))) (idx=(C.i32((C.field(ptr,"rm","horizontal").value))?C.S_hodoor:C.S_vodoor));
 else (idx=(C.i32((C.field(ptr,"rm","horizontal").value))?C.S_hcdoor:C.S_vcdoor));
                /* else is closed */
            } else (idx=C.S_ndoor);
        break;
        case (C.IRONBARS):
            (idx=C.S_bars);
        break;
        case (C.TREE):
            (idx=C.S_tree);
        break;
        case (C.POOL):
            case (C.MOAT):
                (idx=C.S_pool);
        break;
        case (C.STAIRS):
            (sway=C.stairway_at(x,y));
        if(C.known_branch_stairs(sway)) (idx=((C.i32((C.i32(C.field(ptr,"rm","flags").value)&2)))?C.S_brdnstair:C.S_brupstair));
 else (idx=((C.i32((C.i32(C.field(ptr,"rm","flags").value)&2)))?C.S_dnstair:C.S_upstair));
        break;
        case (C.LADDER):
            (sway=C.stairway_at(x,y));
        if(C.known_branch_stairs(sway)) (idx=((C.i32((C.i32(C.field(ptr,"rm","flags").value)&2)))?C.S_brdnladder:C.S_brupladder));
 else (idx=((C.i32((C.i32(C.field(ptr,"rm","flags").value)&2)))?C.S_dnladder:C.S_upladder));
        break;
        case (C.FOUNTAIN):
            (idx=C.S_fountain);
        break;
        case (C.SINK):
            (idx=C.S_sink);
        break;
        case (C.ALTAR):
            (idx=C.S_altar);
        /* not really used */
        (bypass_glyph=(((Number((C.i32((C.i32((C.field(ptr,"rm","flags").value))&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32((C.i32((C.field(ptr,"rm","flags").value))&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32((C.i32((C.field(ptr,"rm","flags").value))&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32((C.i32((C.field(ptr,"rm","flags").value))&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))));
        break;
        case (C.GRAVE):
            (idx=C.S_grave);
        break;
        case (C.THRONE):
            (idx=C.S_throne);
        break;
        case (C.LAVAPOOL):
            (idx=C.S_lava);
        break;
        case (C.LAVAWALL):
            (idx=C.S_lavawall);
        break;
        case (C.ICE):
            (idx=C.S_ice);
        break;
        case (C.AIR):
            (idx=C.S_air);
        break;
        case (C.CLOUD):
            (idx=C.S_cloud);
        break;
        case (C.WATER):
            (idx=C.S_water);
        break;
        case (C.DBWALL):
            (idx=(C.i32((C.field(ptr,"rm","horizontal").value))?C.S_hcdbridge:C.S_vcdbridge));
        break;
        case (C.DRAWBRIDGE_UP):
            switch(C.i32((C.i32(C.field(ptr,"rm","flags").value)&28))) {
                case (0):
                    (idx=C.S_pool);
                break;
                case (4):
                    (idx=C.S_lava);
                break;
                case (8):
                    (idx=C.S_ice);
                break;
                case (16):
                    (idx=C.S_room);
                break;
                default:
                    C.variadic(6,C.literal("Strange db-under: %d"),C.i32((C.i32(C.field(ptr,"rm","flags").value)&28)));
                (idx=C.S_room);
                /* something is better than nothing */
                break;
            }
        break;
        case (C.DRAWBRIDGE_DOWN):
            (idx=(C.i32((C.field(ptr,"rm","horizontal").value))?C.S_hodbridge:C.S_vodbridge));
        break;
        default:
            C.variadic(7,C.literal("back_to_glyph:  unknown level type [ = %d ]"),C.i32(C.display_read_rm_typ(ptr)));
        (idx=C.S_room);
        break;
    }
    return ((Number(bypass_glyph!=C.MAX_GLYPH))?bypass_glyph:(((Number((idx)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((idx)<=C.S_trwall))?(C.i32((C.i32(((idx)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((idx)<C.S_altar))?(C.i32(((C.i32(((idx)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((idx)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((idx)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((idx)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((idx)<=C.S_goodpos))?(C.i32(((C.i32(((idx)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
}

/*
 * swallow_to_glyph()
 *
 * Convert a monster number and a swallow location into the correct glyph.
 * If you don't want a patchwork monster while hallucinating, decide on
 * a random monster in swallowed() and don't use what_mon() here.
 */
export function swallow_to_glyph(mnum,loc)
{
    mnum=C.i32(mnum);
    loc=C.i32(loc);
    let m_3=C.i32(((((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC)*C.sizes["struct prop"])&&Number(!((Number(!!(C.display_read_prop_intrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])||C.display_read_prop_extrinsic(C.display_address_you_uprops(C.u)+Number(C.HALLUC_RES)*C.sizes["struct prop"])))))))))?(C.rn2_on_display_rng(C.NUMMONS)):mnum))<<3));
    if(Number(!!(Number(loc<C.S_sw_tl)||Number(C.S_sw_br<loc)))) {
        C.variadic(8,C.literal("swallow_to_glyph: bad swallow location"));
        (loc=C.S_sw_br);
    }
    return C.i32(((C.i32((m_3|(C.i32((loc-C.S_sw_tl))))))+C.GLYPH_SWALLOW_OFF));
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
export function zapdir_to_glyph(dx,dy,beam_type)
{
    dx=C.i32(dx);
    dy=C.i32(dy);
    beam_type=C.i32(beam_type);
    if(Number(beam_type>=8)) {
        C.variadic(9,C.literal("zapdir_to_glyph:  illegal beam type"));
        (beam_type=0);
    }
    (dx=((Number(dx==dy))?2:((Number(!!(dx&&dy)))?3:(dx?1:0))));
    return C.i32((((C.i32(((C.i32((beam_type<<2)))|dx))))+C.GLYPH_ZAP_OFF));
}

/*
 * Utility routine for dowhatis() used to find out the glyph displayed at
 * the location.  This isn't necessarily the same as the glyph in the levl
 * structure, so we must check the "third screen".
 */
export function glyph_at(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    if(Number(!!(Number(!!(Number(!!(Number(C.i32(x)<0)||Number(C.i32(y)<0)))||Number(C.i32(x)>=80)))||Number(C.i32(y)>=21)))) return (((Number((C.S_room)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((C.S_room)<=C.S_trwall))?(C.i32((C.i32(((C.S_room)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((C.S_room)<C.S_altar))?(C.i32(((C.i32(((C.S_room)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((C.S_room)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((C.S_room)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((C.S_room)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((C.S_room)<=C.S_goodpos))?(C.i32(((C.i32(((C.S_room)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))));
    /* XXX */
    return C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]));
    /* _glyph_at(x,y) */
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
export function get_bkglyph_and_framecolor(x,y,bkglyph,framecolor)
{
    x=C.i16(x);
    y=C.i16(y);
    bkglyph=C.ptr(bkglyph);
    framecolor=C.ptr(framecolor);
    let idx; let tmp_bkglyph=C.GLYPH_UNEXPLORED_OFF;
    let lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    if(Number(!!(Number(!!(C.i32(C.display_read_instance_flags_use_background_glyph(C.iflags))&&Number(C.i32(C.display_read_rm_seenv(lev))!=0)))&&(Number(C.display_read_glyphinfo_glyph(C.display_address_gbuf_entry_glyphinfo((C.display_address_instance_globals_g_gbuf(C.gg)+Number(y)*(C.sizes["gbuf_entry"]*80))+Number(x)*C.sizes["gbuf_entry"]))!=C.GLYPH_UNEXPLORED_OFF))))) {
        switch(C.i32(C.display_read_rm_typ(lev))) {
            case (C.SCORR):
                case (C.STONE):
                    (idx=(C.i32(C.field(C.display_address_dlevel_t_flags(C.display_address_instance_globals_saved_l_level(C.svl)),"levelflags","arboreal").value)?C.S_tree:C.S_stone));
            break;
            case (C.ROOM):
                (idx=C.S_room);
            break;
            case (C.CORR):
                (idx=((Number(!!(C.i32(C.field(lev,"rm","waslit").value)||C.i32(C.display_read_flag_lit_corridor(C.flags)))))?C.S_litcorr:C.S_corr));
            break;
            case (C.ICE):
                (idx=C.S_ice);
            break;
            case (C.AIR):
                (idx=C.S_air);
            break;
            case (C.CLOUD):
                (idx=C.S_cloud);
            break;
            case (C.POOL):
                case (C.MOAT):
                    (idx=C.S_pool);
            break;
            case (C.WATER):
                (idx=C.S_water);
            break;
            case (C.LAVAPOOL):
                (idx=C.S_lava);
            break;
            case (C.LAVAWALL):
                (idx=C.S_lavawall);
            break;
            default:
                (idx=C.S_room);
            break;
        }
        if(Number(!!(Number(!((Number((C.i32((C.i32(C.cell((C.cell((C.display_read_instance_globals_v_viz_array(C.gv)+Number(y)*8),"unsigned char *").value+Number(x)*1),"unsigned char").value)&2)))!=0))))&&(Number(!!(Number(!(C.field(lev,"rm","waslit").value))||C.i32(C.display_read_flag_dark_room(C.flags)))))))) {
            /* Floor spaces and corridors are dark if unlit. */
            if(Number(!!(Number(C.i32(C.display_read_rm_typ(lev))==C.CORR)&&Number(idx==C.S_litcorr)))) (idx=C.S_corr);
 else if(Number(idx==C.S_room)) (idx=((Number(!!(C.i32(C.display_read_flag_dark_room(C.flags))&&C.i32(C.display_read_instance_flags_wc_color(C.iflags)))))?((((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.S_stone:C.S_darkroom)):C.S_stone));
        }
        if(Number(idx!=C.S_room)) (tmp_bkglyph=(((Number((idx)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((idx)<=C.S_trwall))?(C.i32((C.i32(((idx)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((idx)<C.S_altar))?(C.i32(((C.i32(((idx)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((idx)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((idx)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((idx)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((idx)<=C.S_goodpos))?(C.i32(((C.i32(((idx)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH))))))));
    }
    (C.cell(bkglyph,"int").value=tmp_bkglyph);
    /* this guard should be unnecessary */
    if(Number(!!(Number(!!(C.i32(C.display_read_instance_flags_bgcolors(C.iflags))&&Number(C.display_read_win_settings_map_frame_color(C.display_address_instance_globals_w_wsettings(C.gw))!=C.u32(8))))&&C.i32(C.mapxy_valid(x,y))))) (C.cell(framecolor,"unsigned int").value=C.display_read_win_settings_map_frame_color(C.display_address_instance_globals_w_wsettings(C.gw)));
 else (C.cell(framecolor,"unsigned int").value=C.u32(8));
}

/* masks for per-level variances kept in gg.glyphmap_perlevel_flags */
export function map_glyphinfo(x,y,glyph,mgflags,glyphinfo)
{
    x=C.i16(x);
    y=C.i16(y);
    glyph=C.i32(glyph);
    mgflags=C.u32(mgflags);
    glyphinfo=C.ptr(glyphinfo);
    let offset;
    let is_you=C.i8((Number(!!((Number(!!(Number(C.i32((x))==C.i32(C.display_read_you_ux(C.u)))&&Number(C.i32((y))==C.i32(C.display_read_you_uy(C.u))))))&&(Number(!!(Number(!!(Number(!!((Number(!!((Number(!!(Number((glyph)>=C.GLYPH_MON_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_MON_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS))))))))))))||(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))))))))))));
    /* verify hero or steed (not something underneath
                         when hero is invisible without see invisible,
                         or a temporary display effect like an explosion);
                         this is only approximate, because hero might be
                         mimicking an object (after eating mimic corpse or
                         if polyd into mimic) or furniture (only if polyd) */
    let gmap=(C.staticAddress("glyphmap")+Number(glyph)*C.sizes["struct glyph_map_entry"]);
    C.copy(C.display_address_glyphinfo_gm(glyphinfo),gmap,C.sizes["struct glyph_map_entry"]);
    /* glyphflags, sym.symidx, sym.color, tileidx */
    /*
     * Only hero tinkering permitted on-the-fly (who).
     * Unique glyphs in glyphmap[] determine everything else (what).
     *
     * (Note: if hero is invisible without see invisible, he/she usually
     * can't see himself/herself.  This applies to accessibility hacks
     * as well as to regular display.)
     */
    if(is_you) {
        if(Number(!!(Number(!!(Number(!(C.display_read_instance_flags_wc_color(C.iflags)))||(Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))))||Number(glyph!=(C.i32(((((Number(!!((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))||Number(!(C.display_read_flag_showrace(C.flags))))))?C.display_read_you_umonnum(C.u):C.i32(C.display_read_Race_mnum(C.display_address_instance_globals_u_urace(C.gu)))))+(((Number((((((((Number(C.display_read_you_umonnum(C.u)!=C.display_read_you_umonster(C.u)))?C.i32(C.field(C.u,"you","mfemale").value):C.i32(C.display_read_flag_female(C.flags))))?1:0))))==C.MALE))?C.GLYPH_MON_MALE_OFF:C.GLYPH_MON_FEM_OFF))))))))) {
            ;
            /* color tweak not needed (!use_color) or not wanted (poly'd
                 or riding--which uses steed's color, not hero's) */
        } else if(Number(!!((Number(!!(Number(C.display_read_instance_globals_c_currentgraphics(C.gc)==C.ROGUESET)&&(Number(C.u32(C.display_read_symsetentry_handling(C.display_address_instance_globals_s_symset(C.gs)+Number(C.display_read_instance_globals_c_currentgraphics(C.gc))*C.sizes["struct symsetentry"]))==C.u32((C.H_IBM)))))))&&Number(C.i32(C.field((C.display_address_instance_globals_s_symset(C.gs)+Number(C.display_read_instance_globals_c_currentgraphics(C.gc))*C.sizes["struct symsetentry"]),"symsetentry","nocolor").value)==0)))) {
            /* actually player should be yellow-on-gray if in corridor */
            (C.field(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo)),"classic_representation","color").value=11);
        } else if(C.display_read_flag_showrace(C.flags)) {
            /* for showrace, non-human hero is displayed by the symbol of
               corresponding type of monster rather than by '@' (handled
               by newsym()); we change the color to same as human hero */
            (C.field(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo)),"classic_representation","color").value=15);
        }
        /* accessibility
          This unchanging display character for hero was requested by
          a blind player to enhance screen reader use.
          Turn on override symbol if caller hasn't specified NOOVERRIDE. */
        if(Number(!!(Number(C.display_read_sysopt_s_accessibility(C.sysopt)==1)&&Number(!((C.u32((mgflags&C.u32(1))))))))) {
            (offset=C.i32((C.SYM_HERO_OVERRIDE+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            if(((C.i64((C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)&C.i64(2))))?C.i32(C.cell((C.display_address_instance_globals_o_ov_rogue_syms(C.go)+Number(offset)*1),"unsigned char").value):C.i32(C.cell((C.display_address_instance_globals_o_ov_primary_syms(C.go)+Number(offset)*1),"unsigned char").value))) (C.field(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo)),"classic_representation","symidx").value=offset);
        }
        (C.field(C.display_address_glyphinfo_gm(glyphinfo),"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(C.display_address_glyphinfo_gm(glyphinfo))|C.u32(1)));
    }
    if(Number(!!(Number(!!(Number(C.display_read_sysopt_s_accessibility(C.sysopt)==1)&&(C.u32((mgflags&C.u32(1))))))&&(Number(!!((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))||(Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS))))))))))))) {
        /* one more accessibility kludge;
           turn off override symbol if caller has specified NOOVERRIDE */
        (C.field(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo)),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number((((Number(!!(Number((glyph)>=C.GLYPH_MON_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_FEM_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_MON_FEM_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_MON_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_MON_MALE_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_MON_MALE_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_PET_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_FEM_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_PET_FEM_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_PET_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_PET_MALE_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_PET_MALE_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_DETECT_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_FEM_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_DETECT_FEM_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_DETECT_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_DETECT_MALE_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_DETECT_MALE_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_FEM_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_FEM_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_RIDDEN_FEM_OFF))):((Number(!!(Number((glyph)>=C.GLYPH_RIDDEN_MALE_OFF)&&Number((glyph)<(C.i32((C.GLYPH_RIDDEN_MALE_OFF+C.NUMMONS)))))))?(C.i32(((glyph)-C.GLYPH_RIDDEN_MALE_OFF))):C.NUMMONS))))))))))*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
    }
    (C.field(glyphinfo,"glyphinfo","ttychar").value=C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.display_read_classic_representation_symidx(C.display_address_glyph_map_entry_sym(C.display_address_glyphinfo_gm(glyphinfo))))*1),"unsigned char").value));
    (C.field(glyphinfo,"glyphinfo","glyph").value=glyph);
}

/*
 *  This must be the same order as used for buzz() in zap.c.
 *  The zap_color_ and altar_color_ enums are in decl.h.
 */
/* main_walls, mines_walls, gehennom_walls, knox_walls, sokoban_walls */
/* default init value is to match defsym[S_vwall + n].color (CLR_GRAY) */
/* CLR_GRAY, CLR_BROWN, CLR_RED, CLR_GRAY, CLR_BRIGHT_BLUE, */
export function cmap_to_roguecolor(cmap)
{
    cmap=C.i32(cmap);
    let color=8;
    if(C.field((C.display_address_instance_globals_s_symset(C.gs)+Number(C.display_read_instance_globals_c_currentgraphics(C.gc))*C.sizes["struct symsetentry"]),"symsetentry","nocolor").value) return 8;
    if(Number(!!(Number(cmap>=C.S_vwall)&&Number(cmap<=C.S_hcdoor)))) (color=3);
 else if(Number(!!(Number(cmap>=C.S_arrow_trap)&&Number(cmap<=C.S_polymorph_trap)))) (color=5);
 else if(Number(!!(Number(cmap==C.S_corr)||Number(cmap==C.S_litcorr)))) (color=7);
 else if(Number(!!(Number(!!(Number(cmap>=C.S_room)&&Number(cmap<=C.S_water)))&&Number(cmap!=C.S_darkroom)))) (color=2);
 else (color=8);
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
export function reset_glyphmap(trigger)
{
    let glyph;
    let offset;
    let color=8;
    /* condense multiple tests in macro version down to single */
    let has_rogue_ibm_graphics=C.i8((Number(!!(Number(C.display_read_instance_globals_c_currentgraphics(C.gc)==C.ROGUESET)&&(Number(C.u32(C.display_read_symsetentry_handling(C.display_address_instance_globals_s_symset(C.gs)+Number(C.display_read_instance_globals_c_currentgraphics(C.gc))*C.sizes["struct symsetentry"]))==C.u32((C.H_IBM)))))))); let has_rogue_color=C.i8((Number(!!(C.i32(has_rogue_ibm_graphics)&&Number(C.i32(C.field((C.display_address_instance_globals_s_symset(C.gs)+Number(C.display_read_instance_globals_c_currentgraphics(C.gc))*C.sizes["struct symsetentry"]),"symsetentry","nocolor").value)==0)))));
    if(Number(C.u32(trigger)==C.u32(C.gm_levelchange))) (C.field(C.gg,"instance_globals_g","glyphmap_perlevel_flags").value=C.i64(0));
    if(Number(!(C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)))) {
        /*
         *    GMAP_SET                0x00000001
         *    GMAP_ROGUELEVEL         0x00000002
         */
        (C.field(C.gg,"instance_globals_g","glyphmap_perlevel_flags").value=C.i64(C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)|C.i64(1)));
        if(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_rogue_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))) {
            (C.field(C.gg,"instance_globals_g","glyphmap_perlevel_flags").value=C.i64(C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)|C.i64(2)));
        }
    }
    for((glyph=0);Number(glyph<C.MAX_GLYPH);(glyph=C.i32((glyph+1)))) {
        let gmap=(C.staticAddress("glyphmap")+Number(glyph)*C.sizes["struct glyph_map_entry"]);
        (C.field(gmap,"glyph_map_entry","glyphflags").value=0);
        /*
         *  Map the glyph to a character and color.
         *
         *  Warning:  For speed, this makes an assumption on the order of
         *            offsets.  The order is set in display.h.
         */
        if(Number(((offset=(C.i32((glyph-C.GLYPH_NOTHING_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_NOTHING+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            (color=8);
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(1024)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_UNEXPLORED_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_UNEXPLORED+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            (color=8);
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(2048)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_FEM_PILETOP_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(C.STATUE)*C.sizes["struct objclass"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((C.i32((64|8192))|128))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_MALE_PILETOP_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(C.STATUE)*C.sizes["struct objclass"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((C.i32((64|4096))|128))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_BODY_PILETOP_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_objclass_oc_class(C.objects+Number(C.CORPSE)*C.sizes["struct objclass"]))+(C.i32(((0)+C.MAXPCHARS))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((2|128))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_OBJ_PILETOP_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_objclass_oc_class(C.objects+Number(offset)*C.sizes["struct objclass"]))+(C.i32(((0)+C.MAXPCHARS))))));
            if(Number(offset==C.BOULDER)) (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            if(has_rogue_color) {
                switch(C.i32(C.display_read_objclass_oc_class(C.objects+Number(offset)*C.sizes["struct objclass"]))) {
                    case (C.COIN_CLASS):
                        (color=11);
                    break;
                    case (C.FOOD_CLASS):
                        (color=1);
                    break;
                    default:
                        (color=12);
                    break;
                }
            } else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(offset)*C.sizes["struct objclass"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(128)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_FEM_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(C.STATUE)*C.sizes["struct objclass"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((64|8192))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_STATUE_MALE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(C.STATUE)*C.sizes["struct objclass"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((64|4096))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_WARNING_OFF)))))>=0)) {
            /* warn flash */
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((offset+(C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_symdef_color(C.def_warnsyms+Number(offset)*C.sizes["struct symdef"])):8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_FROSTY_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_frosty)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_FIERY_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_fiery)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_MAGICAL_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_magical)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_WET_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_wet)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_MUDDY_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_muddy)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_NOXIOUS_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_noxious)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_EXPLODE_DARK_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_expl_tl+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("explodecolors")+Number(C.expl_dark)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_SWALLOW_OFF)))))>=0)) {
            /* see swallow_to_glyph() in display.c */
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32(((C.i32((C.S_sw_tl+(C.i32((offset&7))))))+(0))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(C.i32((offset>>3)))*C.sizes["struct permonst"])):8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_C_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_digbeam+offset))+(0))));
            if(has_rogue_color) (color=cmap_to_roguecolor(C.i32((C.S_digbeam+offset))));
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_symdef_color(C.defsyms+Number(C.i32((C.S_digbeam+offset)))*C.sizes["struct symdef"])):8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_ZAP_OFF)))))>=0)) {
            /* see zapdir_to_glyph() in display.c */
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32(((C.i32((C.S_vbeam+(C.i32((offset&3))))))+(0))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("zapcolors")+Number((C.i32((offset>>2))))*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_B_OFF)))))>=0)) {
            let cmap=C.i32((C.S_grave+offset));
            let sym=C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((cmap+(0))))*1),"unsigned char").value);
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((cmap+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_symdef_color(C.defsyms+Number(cmap)*C.sizes["struct symdef"])):8));
            if(Number(!(C.display_read_instance_flags_wc_color(C.iflags)))) {
                let spec_cmap=C.u32(0);
                /* try to provide a visible difference between water and lava
                   if they use the same symbol and color is disabled;
                   similar for floor and ice, for fountain vs sink, and for
                   corridor engravings (CMAP_A below) */
                switch(cmap) {
                    case (C.S_lava):
                        case (C.S_lavawall):
                            if(Number(!!(Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_pool+(0))))*1),"unsigned char").value))||Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_water+(0))))*1),"unsigned char").value))))) (spec_cmap=C.u32(256));
                    break;
                    case (C.S_ice):
                        if(Number(!!(Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_room+(0))))*1),"unsigned char").value))||Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_darkroom+(0))))*1),"unsigned char").value))))) (spec_cmap=C.u32(512));
                    break;
                    case (C.S_sink):
                        if(Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_fountain+(0))))*1),"unsigned char").value))) (spec_cmap=C.u32(512));
                    break;
                }
                (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|spec_cmap));
            } else if(has_rogue_color) {
                (color=cmap_to_roguecolor(cmap));
            }
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_ALTAR_OFF)))))>=0)) {
            /* unaligned, chaotic, neutral, lawful, other altar */
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.S_altar+(0))));
            if(has_rogue_color) (color=cmap_to_roguecolor(C.S_altar));
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("altarcolors")+Number(offset)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_A_OFF)))))>=0)) {
            let sym; let cmap=C.i32((C.S_ndoor+offset));
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((cmap+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_symdef_color(C.defsyms+Number(cmap)*C.sizes["struct symdef"])):8));
            (sym=C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.display_read_classic_representation_symidx(C.display_address_glyph_map_entry_sym(gmap)))*1),"unsigned char").value));
            /*
             *   Some specialty color mappings not hardcoded in data init
             */
            if(has_rogue_color) {
                (color=cmap_to_roguecolor(cmap));
                /* provide a visible difference if normal and lit corridor
               use the same symbol */
            } else if(Number(!!(Number(cmap==C.S_litcorr)&&Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_corr+(0))))*1),"unsigned char").value))))) {
                (color=15);
                /* likewise for corridor and engraving-in-corridor */
            } else if(Number(!!(Number(cmap==C.S_engrcorr)&&(Number(!!(Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_corr+(0))))*1),"unsigned char").value))||Number(sym==C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(C.i32((C.S_litcorr+(0))))*1),"unsigned char").value)))))))) {
                (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(512)));
            }
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_SOKO_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_vwall+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("wallcolors")+Number(C.sokoban_walls)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_KNOX_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_vwall+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("wallcolors")+Number(C.knox_walls)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_GEH_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_vwall+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("wallcolors")+Number(C.gehennom_walls)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_MINES_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_vwall+offset))+(0))));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("wallcolors")+Number(C.mines_walls)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_MAIN_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32((C.S_vwall+offset))+(0))));
            if(has_rogue_color) (color=cmap_to_roguecolor(C.i32((C.S_vwall+offset))));
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.cell((C.staticAddress("wallcolors")+Number(C.main_walls)*4),"int").value:8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_CMAP_STONE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=(0));
            (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_symdef_color(C.defsyms+Number(C.S_stone)*C.sizes["struct symdef"])):8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_OBJ_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_objclass_oc_class(C.objects+Number(offset)*C.sizes["struct objclass"]))+(C.i32(((0)+C.MAXPCHARS))))));
            if(Number(offset==C.BOULDER)) (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_BOULDER+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            if(has_rogue_color) {
                switch(C.i32(C.display_read_objclass_oc_class(C.objects+Number(offset)*C.sizes["struct objclass"]))) {
                    case (C.COIN_CLASS):
                        (color=11);
                    break;
                    case (C.FOOD_CLASS):
                        (color=1);
                    break;
                    default:
                        (color=12);
                    break;
                }
            } else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_objclass_oc_color(C.objects+Number(offset)*C.sizes["struct objclass"])):8));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_RIDDEN_FEM_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            /* This currently implies that the hero is here -- monsters */
            /* don't ride (yet...).  Should we set it to yellow like in */
            /* the monster case below?  There is no equivalent in rogue.
                 */
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((32|8192))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_RIDDEN_MALE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((32|4096))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_BODY_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_objclass_oc_class(C.objects+Number(C.CORPSE)*C.sizes["struct objclass"]))+(C.i32(((0)+C.MAXPCHARS))))));
            if(has_rogue_color) (color=1);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(2)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_DETECT_FEM_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            /* Disabled for now; anyone want to get reverse video to work? */
            /* is_reverse = TRUE; */
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((8|8192))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_DETECT_MALE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            /* Disabled for now; anyone want to get reverse video to work? */
            /* is_reverse = TRUE; */
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((8|4096))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_INVIS_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_INVISIBLE+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
            if(has_rogue_color) (color=8);
 else (color=8);
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(4)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_PET_FEM_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((16|8192))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_PET_MALE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) (color=8);
 else (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32((C.i32((16|4096))))));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_MON_FEM_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) {
                (color=8);
            } else {
                (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            }
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(8192)));
        } else if(Number(((offset=(C.i32((glyph-C.GLYPH_MON_MALE_OFF)))))>=0)) {
            (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.i32(C.display_read_permonst_mlet(C.mons+Number(offset)*C.sizes["struct permonst"]))+(C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES))))));
            if(has_rogue_color) {
                (color=11);
            } else {
                (color=(C.i32(C.display_read_instance_flags_wc_color(C.iflags))?C.i32(C.display_read_permonst_mcolor(C.mons+Number(offset)*C.sizes["struct permonst"])):8));
            }
            (C.field(gmap,"glyph_map_entry","glyphflags").value=C.u32(C.display_read_glyph_map_entry_glyphflags(gmap)|C.u32(4096)));
        }
        /* This was requested by a blind player to enhance screen reader use
         */
        if(Number(!!(Number(C.display_read_sysopt_s_accessibility(C.sysopt)==1)&&Number((C.u32((C.display_read_glyph_map_entry_glyphflags(gmap)&C.u32(16))))!=C.u32(0))))) {
            let pet_override=(((C.i64((C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)&C.i64(2))))?C.i32(C.cell((C.display_address_instance_globals_o_ov_rogue_syms(C.go)+Number(C.i32((C.SYM_PET_OVERRIDE+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value):C.i32(C.cell((C.display_address_instance_globals_o_ov_primary_syms(C.go)+Number(C.i32((C.SYM_PET_OVERRIDE+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))))*1),"unsigned char").value)));
            if(Number(C.i32(C.cell((C.display_address_instance_globals_s_showsyms(C.gs)+Number(pet_override)*1),"unsigned char").value)!=32)) (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","symidx").value=C.i32((C.SYM_PET_OVERRIDE+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6))))));
        }
        /* Turn off color if no color defined, or rogue level w/o PC graphics.
         */
        if(Number(!!((Number(!!(Number(!(C.has_color(color)))||(Number(!!((C.i64((C.display_read_instance_globals_g_glyphmap_perlevel_flags(C.gg)&C.i64(2))))&&Number(!(has_rogue_color))))))))||Number(!(C.display_read_instance_flags_wc_color(C.iflags)))))) (color=8);
        (C.field(C.display_address_glyph_map_entry_sym(gmap),"classic_representation","color").value=color);
    }
    (C.field(C.gg,"instance_globals_g","glyph_reset_timestamp").value=C.display_read_instance_globals_saved_m_moves(C.svm));
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
export function check_pos(x,y,which)
{
    x=C.i16(x);
    y=C.i16(y);
    which=C.i32(which);
    let type;
    if(Number(!(C.isok(x,y)))) return which;
    (type=C.i32(C.display_read_rm_typ((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"])));
    /* Everything below POOL, excluding TREE */
    if(Number(!!(Number(!!(Number(!!((Number((type)<=C.DBWALL))||Number(type==C.CORR)))||Number(type==C.SCORR)))||(Number((type)==C.SDOOR))))) return which;
    return 0;
}

/* Return TRUE if more than one is non-zero. */
/*ARGSUSED*/
/* Return the wall mode for a T wall. */
export function set_twall(x0,y0,x1,y1,x2,y2,x3,y3)
{
    x0=C.i16(x0);
    y0=C.i16(y0);
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    x3=C.i16(x3);
    y3=C.i16(y3);
    /* used #if WA_VERBOSE */
    let wmode; let is_1; let is_2; let is_3;
    (is_1=check_pos(x1,y1,1));
    (is_2=check_pos(x2,y2,2));
    (is_3=check_pos(x3,y3,3));
    if((Number(!!(Number(!!((Number(!!((is_1)&&(C.i32(((is_2)|(is_3)))))))||(Number(!!((is_2)&&(C.i32(((is_1)|(is_3)))))))))||(Number(!!((is_3)&&(C.i32(((is_1)|(is_2))))))))))) {
        (wmode=0);
    } else {
        (wmode=C.i32((C.i32((is_1+is_2))+is_3)));
    }
    return wmode;
}

/* Return wall mode for a horizontal or vertical wall. */
export function set_wall(x,y,horiz)
{
    x=C.i16(x);
    y=C.i16(y);
    horiz=C.i32(horiz);
    let wmode; let is_1; let is_2;
    if(horiz) {
        (is_1=check_pos(x,C.i16(C.i32((C.i32(y)-1))),1));
        (is_2=check_pos(x,C.i16(C.i32((C.i32(y)+1))),2));
    } else {
        (is_1=check_pos(C.i16(C.i32((C.i32(x)-1))),y,1));
        (is_2=check_pos(C.i16(C.i32((C.i32(x)+1))),y,2));
    }
    if((Number(!!(Number(!!((Number(!!((is_1)&&(C.i32(((is_2)|(0)))))))||(Number(!!((is_2)&&(C.i32(((is_1)|(0)))))))))||(Number(!!((0)&&(C.i32(((is_1)|(is_2))))))))))) {
        (wmode=0);
    } else {
        (wmode=C.i32((is_1+is_2)));
    }
    return wmode;
}

/* Return a wall mode for a corner wall. (x4,y4) is the "inner" position. */
export function set_corn(x1,y1,x2,y2,x3,y3,x4,y4)
{
    x1=C.i16(x1);
    y1=C.i16(y1);
    x2=C.i16(x2);
    y2=C.i16(y2);
    x3=C.i16(x3);
    y3=C.i16(y3);
    x4=C.i16(x4);
    y4=C.i16(y4);
    let wmode; let is_1; let is_2; let is_3; let is_4;
    (is_1=C.i16(check_pos(x1,y1,1)));
    (is_2=C.i16(check_pos(x2,y2,1)));
    (is_3=C.i16(check_pos(x3,y3,1)));
    (is_4=C.i16(check_pos(x4,y4,1)));
    /* inner location */
    /*
     * All 4 should not be true.  So if the inner location is rock,
     * use it.  If all of the outer 3 are true, use outer.  We currently
     * can't cover the case where only part of the outer is rock, so
     * we just say that all the walls are finished (if not overridden
     * by the inner section).
     */
    if(is_4) {
        (wmode=C.i16(2));
    } else if(Number(!!(Number(!!(C.i32(is_1)&&C.i32(is_2)))&&C.i32(is_3)))) (wmode=C.i16(1));
 else (wmode=C.i16(0));
    /* finished walls on all sides */
    return C.i32(wmode);
}

/* Return mode for a crosswall. */
export function set_crosswall(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let wmode; let is_1; let is_2; let is_3; let is_4;
    (is_1=C.i16(check_pos(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1))),1)));
    (is_2=C.i16(check_pos(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1))),1)));
    (is_3=C.i16(check_pos(C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1))),1)));
    (is_4=C.i16(check_pos(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1))),1)));
    (wmode=C.i16(C.i32((C.i32((C.i32((C.i32(is_1)+C.i32(is_2)))+C.i32(is_3)))+C.i32(is_4)))));
    if(Number(C.i32(wmode)>1)) {
        if(Number(!!(Number(!!(C.i32(is_1)&&C.i32(is_3)))&&(Number(C.i32((C.i32(is_2)+C.i32(is_4)))==0))))) {
            (wmode=C.i16(5));
        } else if(Number(!!(Number(!!(C.i32(is_2)&&C.i32(is_4)))&&(Number(C.i32((C.i32(is_1)+C.i32(is_3)))==0))))) {
            (wmode=C.i16(6));
        } else {
            (wmode=C.i16(0));
        }
    } else if(is_1) (wmode=C.i16(1));
 else if(is_2) (wmode=C.i16(2));
 else if(is_3) (wmode=C.i16(4));
 else if(is_4) (wmode=C.i16(3));
    return C.i32(wmode);
}

/* called for every <x,y> by set_wall_state() and for specific <x,y> during
   vault wall repair */
export function xy_set_wall_state(x,y)
{
    x=C.i16(x);
    y=C.i16(y);
    let wmode;
    let lev=((C.display_address_dlevel_t_locations(C.display_address_instance_globals_saved_l_level(C.svl))+Number(x)*(C.sizes["struct rm"]*21))+Number(y)*C.sizes["struct rm"]);
    switch(C.i32(C.display_read_rm_typ(lev))) {
        case (C.SDOOR):
            (wmode=C.i16(set_wall(x,y,C.i32(C.i16(C.field(lev,"rm","horizontal").value)))));
        break;
        case (C.VWALL):
            (wmode=C.i16(set_wall(x,y,0)));
        break;
        case (C.HWALL):
            (wmode=C.i16(set_wall(x,y,1)));
        break;
        case (C.TDWALL):
            (wmode=C.i16(set_twall(x,y,x,C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1))))));
        break;
        case (C.TUWALL):
            (wmode=C.i16(set_twall(x,y,x,C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1))))));
        break;
        case (C.TLWALL):
            (wmode=C.i16(set_twall(x,y,C.i16(C.i32((C.i32(x)+1))),y,C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1))))));
        break;
        case (C.TRWALL):
            (wmode=C.i16(set_twall(x,y,C.i16(C.i32((C.i32(x)-1))),y,C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1))))));
        break;
        case (C.TLCORNER):
            (wmode=C.i16(set_corn(C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1))),x,C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)-1))),y,C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1))))));
        break;
        case (C.TRCORNER):
            (wmode=C.i16(set_corn(x,C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1))),C.i16(C.i32((C.i32(x)+1))),y,C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1))))));
        break;
        case (C.BLCORNER):
            (wmode=C.i16(set_corn(x,C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)-1))),y,C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)-1))))));
        break;
        case (C.BRCORNER):
            (wmode=C.i16(set_corn(C.i16(C.i32((C.i32(x)+1))),y,C.i16(C.i32((C.i32(x)+1))),C.i16(C.i32((C.i32(y)+1))),x,C.i16(C.i32((C.i32(y)+1))),C.i16(C.i32((C.i32(x)-1))),C.i16(C.i32((C.i32(y)-1))))));
        break;
        case (C.CROSSWALL):
            (wmode=C.i16(set_crosswall(x,y)));
        break;
        default:
            (wmode=C.i16(C.i32((-1))));
        /* don't set wall info */
        break;
    }
    if(Number(C.i32(wmode)>=0)) (C.field(lev,"rm","flags").value=C.u32(C.i32(((C.i32((C.i32(C.field(lev,"rm","flags").value)&C.i32((~7)))))|C.i32(wmode)))));
}

/* Called from mklev.  Scan the level and set the wall modes. */
export function set_wall_state()
{
    let x; let y;
    for((x=C.i16(0));Number(C.i32(x)<80);((x=C.i16((x+1)))-1)) for((y=C.i16(0));Number(C.i32(y)<21);((y=C.i16((y+1)))-1)) xy_set_wall_state(x,y);


    /* check if any bad positions found */
    /* only prcoordxy once */
    /* WA_VERBOSE */
}

/* ------------------------------------------------------------------------ */
/* This matrix is used here and in vision.c. */
/* negative: -1, zero: 0, positive +1; same as sgn() function (hacklib.c) */
/* Set the seen vector of lev as if seen from (x0,y0) to (x,y). */
export function set_seenv(lev,x0,y0,x,y)
{
    lev=C.ptr(lev);
    x0=C.i16(x0);
    y0=C.i16(y0);
    x=C.i16(x);
    y=C.i16(y);
    /* from */
    /*  to  */
    let dx=C.i16(C.i32((C.i32(x)-C.i32(x0)))); let dy=C.i16(C.i32((C.i32(y0)-C.i32(y))));
    (C.field(lev,"rm","seenv").value=C.u8(C.display_read_rm_seenv(lev)|C.i32(C.cell(((C.staticAddress("seenv_matrix")+Number(C.i32((((Number(C.i32((dy))<0)?C.i32((-1)):(Number(C.i32((dy))!=0))))+1)))*(1*3))+Number(C.i32((((Number(C.i32((dx))<0)?C.i32((-1)):(Number(C.i32((dx))!=0))))+1)))*1),"unsigned char").value)));
}

/* Called by blackout(vault.c) when vault guard removes temporary corridor,
   turning spot <x0,y0> back into stone; <x1,y1> is an adjacent spot. */
export function unset_seenv(lev,x0,y0,x1,y1)
{
    lev=C.ptr(lev);
    x0=C.i16(x0);
    y0=C.i16(y0);
    x1=C.i16(x1);
    y1=C.i16(y1);
    /* &levl[x1][y1] */
    /* from */
    /*  to; abs(x1-x0)==1 && abs(y0-y1)==1 */
    let dx=C.i16(C.i32((C.i32(x1)-C.i32(x0)))); let dy=C.i16(C.i32((C.i32(y0)-C.i32(y1))));
    (C.field(lev,"rm","seenv").value=C.u8(C.display_read_rm_seenv(lev)&C.i32((~C.i32(C.cell(((C.staticAddress("seenv_matrix")+Number(C.i32((C.i32(dy)+1)))*(1*3))+Number(C.i32((C.i32(dx)+1)))*1),"unsigned char").value)))));
}

/* ------------------------------------------------------------------------ */
/* T wall types, one for each row in wall_matrix[][]. */
/*
 * These are the column names of wall_matrix[][].  They are the "results"
 * of a tdwall pattern match.  All T walls are rotated so they become
 * a tdwall.  Then we do a single pattern match, but return the
 * correct result for the original wall by using different rows for
 * each of the wall types.
 */
/* tdwall */
/* tlwall */
/* tuwall */
/* trwall */
/* Cross wall types, one for each "solid" quarter.  Rows of cross_matrix[][].
 */
/*
 * These are the column names for cross_matrix[][].  They express results
 * in C_br (bottom right) terms.  All crosswalls with a single solid
 * quarter are rotated so the solid section is at the bottom right.
 * We pattern match on that, but return the correct result depending
 * on which row we're looking at.
 */
/* Print out a T wall warning and all interesting info. */
export function t_warn(lev)
{
    lev=C.ptr(lev);
    
    let wname;
    /* 5.0: non-T_wall cases added after shop repair (via breaching a wall,
       using locking magic to put a door there, then unlocking the door;
       D_CLOSED carried over to the wall) triggered warning for "unknown" */
    switch(C.i32(C.display_read_rm_typ(lev))) {
        case (C.TUWALL):
            (wname=C.literal("tuwall"));
        break;
        case (C.TLWALL):
            (wname=C.literal("tlwall"));
        break;
        case (C.TRWALL):
            (wname=C.literal("trwall"));
        break;
        case (C.TDWALL):
            (wname=C.literal("tdwall"));
        break;
        case (C.VWALL):
            (wname=C.literal("vwall"));
        break;
        case (C.HWALL):
            (wname=C.literal("hwall"));
        break;
        case (C.TLCORNER):
            (wname=C.literal("tlcorner"));
        break;
        case (C.TRCORNER):
            (wname=C.literal("trcorner"));
        break;
        case (C.BLCORNER):
            (wname=C.literal("blcorner"));
        break;
        case (C.BRCORNER):
            (wname=C.literal("brcorner"));
        break;
        default:
            (wname=C.literal("unknown"));
        break;
    }
    C.variadic(10,C.staticAddress("t_warn.warn_str"),wname,C.i32((C.i32(C.field(lev,"rm","flags").value)&7)),C.u32(C.display_read_rm_seenv(lev)));
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
export function wall_angle(lev)
{
    lev=C.ptr(lev);
    let seenv=C.u32(C.i32((C.i32(C.display_read_rm_seenv(lev))&255)));
    let row;
    let col; let idx;
    switch(C.i32(C.display_read_rm_typ(lev))) {
        case (C.TUWALL):
            (row=(C.staticAddress("wall_matrix")+Number(2)*(4*5)));
        (seenv=C.u32(((C.u32((C.u32((seenv>>>4))|C.u32((seenv<<4)))))&C.u32(255))));
        /* rotate to tdwall */
        {do_twall();return idx;} /* original goto do_twall joins once, then exits wall switch */
        case (C.TLWALL):
            (row=(C.staticAddress("wall_matrix")+Number(1)*(4*5)));
        (seenv=C.u32(((C.u32((C.u32((seenv>>>2))|C.u32((seenv<<6)))))&C.u32(255))));
        /* rotate to tdwall */
        {do_twall();return idx;} /* original goto do_twall joins once, then exits wall switch */
        case (C.TRWALL):
            (row=(C.staticAddress("wall_matrix")+Number(3)*(4*5)));
        (seenv=C.u32(((C.u32((C.u32((seenv>>>6))|C.u32((seenv<<2)))))&C.u32(255))));
        /* rotate to tdwall */
        {do_twall();return idx;} /* original goto do_twall joins once, then exits wall switch */
        case (C.TDWALL):
            (row=(C.staticAddress("wall_matrix")+Number(0)*(4*5)));
        function do_twall(){
            switch(C.i32((C.i32(C.field(lev,"rm","flags").value)&7))) {
                case (0):
                    if(Number(seenv==C.u32((C.u8(16))))) {
                        (col=1);
                    } else if(Number(seenv==C.u32((C.u8(64))))) {
                        (col=2);
                    } else if(Number(!!(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(32)))))|C.i32((C.u8(128)))))))))||(Number(!!((C.u32((seenv&C.u32((C.u8(16))))))&&(C.u32((seenv&C.u32((C.u8(64)))))))))))) {
                        (col=4);
                    } else if(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4)))))))))) {
                        (col=((C.u32((seenv&C.u32((C.i32((C.i32((C.u8(16)))|C.i32((C.u8(64)))))))))?4:3)));
                    } else {
                        t_warn(lev);
                        (col=0);
                    }
                break;
                case (1):
                    if(Number(!!(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))))))&&Number(!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128))))))))))))))) {
                        (col=1);
                    } else if(Number(!!(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(64)))|C.i32((C.u8(128)))))))))&&Number(!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32))))))))))))))) {
                        (col=2);
                    } else if(Number(!!((C.u32((seenv&C.u32((C.u8(32))))))||(Number(!!((C.u32((seenv&C.u32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16))))))))))&&(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(64)))|C.i32((C.u8(128)))))))))))))))) {
                        (col=4);
                    } else {
                        /* only SV0|SV1|SV2 */
                        if(Number(!((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4)))))))))))))))))))) t_warn(lev);
                        (col=0);
                    }
                break;
                case (2):
                    if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.u8(16)))|C.i32((C.u8(32))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.u8(16)))|C.i32((C.u8(32)))))))))))))))))) (col=1);
 else if(Number(!!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4)))))|C.i32((C.u8(128))))))))))&&Number(!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32))))))))))))))) (col=3);
 else if((Number(!!((C.u32(((seenv)&C.u32(((C.u8(64)))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~C.i32(((C.u8(64)))))))))))))))) (col=0);
 else (col=4);
                break;
                case (3):
                    if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))))))))))))))) (col=2);
 else if(Number(!!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4)))))|C.i32((C.u8(8))))))))))&&Number(!((C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128))))))))))))))) (col=3);
 else if((Number(!!((C.u32(((seenv)&C.u32(((C.u8(16)))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~C.i32(((C.u8(16)))))))))))))))) (col=0);
 else (col=4);
                break;
                default:
                    C.variadic(11,C.literal("wall_angle: unknown T wall mode %d"),C.i32((C.i32(C.field(lev,"rm","flags").value)&7)));
                (col=0);
                break;
            }
            (idx=C.cell((row+Number(col)*4),"int").value);
        }
        do_twall();
        break;
        case (C.SDOOR):
            if(C.field(lev,"rm","candig").value) {
                (idx=C.S_tree);
                break;
            }
        if(C.field(lev,"rm","horizontal").value) {horiz();return idx;} /* original goto horiz joins once, then exits wall switch */
        ;
        /*FALLTHRU*/
        case (C.VWALL):
            switch(C.i32((C.i32(C.field(lev,"rm","flags").value)&7))) {
                case (0):
                    (idx=(seenv?C.S_vwall:C.S_stone));
                break;
                case (1):
                    (idx=(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.i32((C.u8(2)))|C.i32((C.u8(4)))))|C.i32((C.u8(8)))))|C.i32((C.u8(16)))))|C.i32((C.u8(32)))))))))?C.S_vwall:C.S_stone));
                break;
                case (2):
                    (idx=(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(32)))))|C.i32((C.u8(64)))))|C.i32((C.u8(128)))))))))?C.S_vwall:C.S_stone));
                break;
                default:
                    C.variadic(12,C.literal("wall_angle: unknown vwall mode %d"),C.i32((C.i32(C.field(lev,"rm","flags").value)&7)));
                (idx=C.S_stone);
                break;
            }
        break;
        case (C.HWALL):
            function horiz(){
                switch(C.i32((C.i32(C.field(lev,"rm","flags").value)&7))) {
                    case (0):
                        (idx=(seenv?C.S_hwall:C.S_stone));
                    break;
                    case (1):
                        (idx=(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32)))))|C.i32((C.u8(64)))))|C.i32((C.u8(128)))))))))?C.S_hwall:C.S_stone));
                    break;
                    case (2):
                        (idx=(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4)))))|C.i32((C.u8(8)))))|C.i32((C.u8(128)))))))))?C.S_hwall:C.S_stone));
                    break;
                    default:
                        C.variadic(13,C.literal("wall_angle: unknown hwall mode %d"),C.i32((C.i32(C.field(lev,"rm","flags").value)&7)));
                    (idx=C.S_stone);
                    break;
                }
            }
            horiz();
        break;
        case (C.TLCORNER):
            switch(C.i32((C.i32(C.field((lev),"rm","flags").value)&7))) {
                case (0):
                    (idx=C.S_tlcorn);
                break;
                case (1):
                    (idx=(C.u32((seenv&C.u32(((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32))))))))))?C.S_tlcorn:C.S_stone));
                break;
                case (2):
                    (idx=(C.u32((seenv&C.u32(C.i32((~C.i32(((C.u8(16)))))))))?C.S_tlcorn:C.S_stone));
                break;
                default:
                    C.variadic(14,C.literal("wall_angle: unknown %s mode %d"),C.literal("tlcorn"),C.i32((C.i32(C.field((lev),"rm","flags").value)&7)));
                (idx=C.S_stone);
                break;
            }
        ;
        break;
        case (C.TRCORNER):
            switch(C.i32((C.i32(C.field((lev),"rm","flags").value)&7))) {
                case (0):
                    (idx=C.S_trcorn);
                break;
                case (1):
                    (idx=(C.u32((seenv&C.u32(((C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128))))))))))?C.S_trcorn:C.S_stone));
                break;
                case (2):
                    (idx=(C.u32((seenv&C.u32(C.i32((~C.i32(((C.u8(64)))))))))?C.S_trcorn:C.S_stone));
                break;
                default:
                    C.variadic(15,C.literal("wall_angle: unknown %s mode %d"),C.literal("trcorn"),C.i32((C.i32(C.field((lev),"rm","flags").value)&7)));
                (idx=C.S_stone);
                break;
            }
        ;
        break;
        case (C.BLCORNER):
            switch(C.i32((C.i32(C.field((lev),"rm","flags").value)&7))) {
                case (0):
                    (idx=C.S_blcorn);
                break;
                case (1):
                    (idx=(C.u32((seenv&C.u32(((C.i32((C.i32((C.i32((C.u8(2)))|C.i32((C.u8(4)))))|C.i32((C.u8(8))))))))))?C.S_blcorn:C.S_stone));
                break;
                case (2):
                    (idx=(C.u32((seenv&C.u32(C.i32((~C.i32(((C.u8(4)))))))))?C.S_blcorn:C.S_stone));
                break;
                default:
                    C.variadic(16,C.literal("wall_angle: unknown %s mode %d"),C.literal("blcorn"),C.i32((C.i32(C.field((lev),"rm","flags").value)&7)));
                (idx=C.S_stone);
                break;
            }
        ;
        break;
        case (C.BRCORNER):
            switch(C.i32((C.i32(C.field((lev),"rm","flags").value)&7))) {
                case (0):
                    (idx=C.S_brcorn);
                break;
                case (1):
                    (idx=(C.u32((seenv&C.u32(((C.i32((C.i32((C.i32((C.u8(128)))|C.i32((C.u8(1)))))|C.i32((C.u8(2))))))))))?C.S_brcorn:C.S_stone));
                break;
                case (2):
                    (idx=(C.u32((seenv&C.u32(C.i32((~C.i32(((C.u8(1)))))))))?C.S_brcorn:C.S_stone));
                break;
                default:
                    C.variadic(17,C.literal("wall_angle: unknown %s mode %d"),C.literal("brcorn"),C.i32((C.i32(C.field((lev),"rm","flags").value)&7)));
                (idx=C.S_stone);
                break;
            }
        ;
        break;
        case (C.CROSSWALL):
            switch(C.i32((C.i32(C.field(lev,"rm","flags").value)&7))) {
                case (0):
                    if(Number(seenv==C.u32((C.u8(1))))) (idx=C.S_brcorn);
 else if(Number(seenv==C.u32((C.u8(4))))) (idx=C.S_blcorn);
 else if(Number(seenv==C.u32((C.u8(16))))) (idx=C.S_tlcorn);
 else if(Number(seenv==C.u32((C.u8(64))))) (idx=C.S_trcorn);
 else if(Number(!!(Number(!((C.u32((seenv&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(4))))))))))))))&&(Number(!!(C.u32((seenv&C.u32((C.u8(2)))))||Number(seenv==C.u32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(4)))))))))))))) (idx=C.S_tuwall);
 else if(Number(!!(Number(!((C.u32((seenv&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(4)))|C.i32((C.u8(8)))))|C.i32((C.u8(16))))))))))))))&&(Number(!!(C.u32((seenv&C.u32((C.u8(8)))))||Number(seenv==C.u32((C.i32((C.i32((C.u8(4)))|C.i32((C.u8(16)))))))))))))) (idx=C.S_trwall);
 else if(Number(!!(Number(!((C.u32((seenv&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(16)))|C.i32((C.u8(32)))))|C.i32((C.u8(64))))))))))))))&&(Number(!!(C.u32((seenv&C.u32((C.u8(32)))))||Number(seenv==C.u32((C.i32((C.i32((C.u8(16)))|C.i32((C.u8(64)))))))))))))) (idx=C.S_tdwall);
 else if(Number(!!(Number(!((C.u32((seenv&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(64)))))|C.i32((C.u8(128))))))))))))))&&(Number(!!(C.u32((seenv&C.u32((C.u8(128)))))||Number(seenv==C.u32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(64)))))))))))))) (idx=C.S_tlwall);
 else (idx=C.S_crwall);
                break;
                case (1):
                    (row=(C.staticAddress("cross_matrix")+Number(1)*(4*6)));
                (seenv=C.u32(((C.u32((C.u32((seenv>>>4))|C.u32((seenv<<4)))))&C.u32(255))));
                {do_crwall();return idx;} /* original goto do_crwall joins once, then exits wall switch */
                case (2):
                    (row=(C.staticAddress("cross_matrix")+Number(2)*(4*6)));
                (seenv=C.u32(((C.u32((C.u32((seenv>>>6))|C.u32((seenv<<2)))))&C.u32(255))));
                {do_crwall();return idx;} /* original goto do_crwall joins once, then exits wall switch */
                case (3):
                    (row=(C.staticAddress("cross_matrix")+Number(0)*(4*6)));
                (seenv=C.u32(((C.u32((C.u32((seenv>>>2))|C.u32((seenv<<6)))))&C.u32(255))));
                {do_crwall();return idx;} /* original goto do_crwall joins once, then exits wall switch */
                case (4):
                    (row=(C.staticAddress("cross_matrix")+Number(3)*(4*6)));
                function do_crwall(){
                    if(Number(seenv==C.u32((C.u8(16))))) {
                        (idx=C.S_stone);
                    } else {
                        (seenv=C.u32((seenv&C.u32(C.i32((~C.i32((C.u8(16)))))))));
                        /* strip SV4 */
                        if(Number(seenv==C.u32((C.u8(1))))) {
                            (col=1);
                        } else if(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(4)))|C.i32((C.u8(8)))))))))) {
                            if(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128)))))))))) (col=5);
 else if(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))))))) (col=4);
 else (col=2);
                        } else if(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))))))) {
                            if(C.u32((seenv&C.u32((C.i32((C.i32((C.i32((C.u8(2)))|C.i32((C.u8(4)))))|C.i32((C.u8(8)))))))))) (col=5);
 else if(C.u32((seenv&C.u32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(128)))))))))) (col=3);
 else (col=0);
                        } else if(C.u32((seenv&C.u32((C.u8(2)))))) {
                            (col=(C.u32((seenv&C.u32((C.u8(128)))))?5:4));
                        } else if(C.u32((seenv&C.u32((C.u8(128)))))) {
                            (col=(C.u32((seenv&C.u32((C.u8(2)))))?5:3));
                        } else {
                            C.variadic(18,C.literal("wall_angle: bottom of crwall check"));
                            (col=5);
                        }
                        (idx=C.cell((row+Number(col)*4),"int").value);
                    }
                }
                do_crwall();
                break;
                case (5):
                    if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.i32((C.u8(2)))|C.i32((C.u8(4)))))|C.i32((C.u8(8))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(2)))|C.i32((C.u8(4)))))|C.i32((C.u8(8)))))))))))))))))) (idx=C.S_blcorn);
 else if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(32)))|C.i32((C.u8(64)))))|C.i32((C.u8(128)))))))))))))))))) (idx=C.S_trcorn);
 else if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(16))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.u8(1)))|C.i32((C.u8(16)))))))))))))))))) (idx=C.S_stone);
 else (idx=C.S_crwall);
                break;
                case (6):
                    if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(128))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(1)))|C.i32((C.u8(2)))))|C.i32((C.u8(128)))))))))))))))))) (idx=C.S_brcorn);
 else if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.i32((C.u8(8)))|C.i32((C.u8(16)))))|C.i32((C.u8(32)))))))))))))))))) (idx=C.S_tlcorn);
 else if((Number(!!((C.u32(((seenv)&C.u32((C.i32((C.i32((C.u8(4)))|C.i32((C.u8(64))))))))))&&Number(!((C.u32(((seenv)&C.u32(C.i32((~(C.i32((C.i32((C.u8(4)))|C.i32((C.u8(64)))))))))))))))))) (idx=C.S_stone);
 else (idx=C.S_crwall);
                break;
                default:
                    C.variadic(19,C.literal("wall_angle: unknown crosswall mode"));
                (idx=C.S_stone);
                break;
            }
        break;
        default:
            C.variadic(20,C.literal("wall_angle: unexpected wall type %d"),C.i32(C.display_read_rm_typ(lev)));
        (idx=C.S_stone);
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
export function fn_cmap_to_glyph(cmap)
{
    cmap=C.i32(cmap);
    return (((Number((cmap)==C.S_stone))?C.GLYPH_CMAP_STONE_OFF:((Number((cmap)<=C.S_trwall))?(C.i32((C.i32(((cmap)-C.S_vwall))+((C.i32(C.In_mines(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_MINES_OFF:(C.i32(C.In_hell(C.display_address_you_uz(C.u)))?C.GLYPH_CMAP_GEH_OFF:(((Number(!!((Number(!!(C.i32(C.display_read_d_level_dlevel(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))||C.i32(C.display_read_d_level_dnum(C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd)))))))&&C.i32(C.on_level(C.display_address_you_uz(C.u),C.display_address_dgn_topology_d_knox_level(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))))?C.GLYPH_CMAP_KNOX_OFF:((Number(C.i32(C.display_read_d_level_dnum(C.display_address_you_uz(C.u)))==C.i32((C.display_read_dgn_topology_d_sokoban_dnum(C.display_address_instance_globals_saved_d_dungeon_topology(C.svd))))))?C.GLYPH_CMAP_SOKO_OFF:C.GLYPH_CMAP_MAIN_OFF)))))))):((Number((cmap)<C.S_altar))?(C.i32(((C.i32(((cmap)-C.S_ndoor)))+C.GLYPH_CMAP_A_OFF))):((Number((cmap)==C.S_altar))?(((Number((C.i32(((2)&16)))==16))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_other))):((Number((C.i32(((2)&7)))==4))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_lawful))):((Number((C.i32(((2)&7)))==2))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_neutral))):((Number((C.i32(((2)&7)))==1))?(C.i32((C.GLYPH_ALTAR_OFF+C.altar_chaotic))):(C.i32((C.GLYPH_ALTAR_OFF+C.altar_unaligned)))))))):((Number((cmap)<C.i32((C.S_arrow_trap+(C.i32((C.TRAPNUM-1)))))))?(C.i32(((C.i32(((cmap)-C.S_grave)))+C.GLYPH_CMAP_B_OFF))):((Number((cmap)<=C.S_goodpos))?(C.i32(((C.i32(((cmap)-C.S_digbeam)))+C.GLYPH_CMAP_C_OFF))):C.MAX_GLYPH)))))));
}

/* for 'onefile' processing where end of this file isn't necessarily the
   end of the source code seen by the compiler (there are lots of other
   macros defined above...) */
/*display.c*/
export const displayStaticInitializers = C => [
    {name:"tgfirst",type:"struct tmp_glyph",size:C.sizes["struct tmp_glyph"],values:0},
    {name:"tmp_at.tglyph",type:"struct tmp_glyph *",size:8,values:0},
    {name:"swallowed.lastx",type:"short",size:2,values:0},
    {name:"swallowed.lasty",type:"short",size:2,values:0},
    {name:"under_water.lastx",type:"short",size:2,values:0},
    {name:"under_water.lasty",type:"short",size:2,values:0},
    {name:"under_water.dela",type:"signed char",size:1,values:0},
    {name:"under_ground.dela",type:"signed char",size:1,values:0},
    {name:"no_ginfo",type:"struct glyphinfo",size:C.sizes["struct glyphinfo"],values:[C.MAX_GLYPH,32,C.u32(8),[C.u32(16384),[8,0],C.u32(0),C.u16(0),C.i16(0),0]]},
    {name:"nul_glyphinfo",type:"struct glyphinfo",size:C.sizes["struct glyphinfo"],values:[C.MAX_GLYPH,32,C.u32(8),[C.u32(2048),[8,C.i32((C.SYM_UNEXPLORED+(C.i32(((C.i32(((C.i32(((C.i32(((0)+C.MAXPCHARS)))+C.MAXOCLASSES)))+C.MAXMCLASSES)))+6)))))],C.u32(0),C.u16(0),C.i16(0),0]]},
    {name:"glyphmap",type:"struct glyph_map_entry[9624]",size:(C.sizes["struct glyph_map_entry"]*9624),values:[[0,[8,0],C.u32(0),C.u16(0),C.i16(0),0]]},
    {name:"nul_gbuf",type:"gbuf_entry",size:C.sizes["gbuf_entry"],values:[C.i8(0),[C.GLYPH_UNEXPLORED_OFF,C.i32(C.u32(32)),C.u32(8),[C.u32(2048),[8,0],C.u32(0),C.u16(0),C.i16(0),0]]]},
    {name:"cls.in_cls",type:"signed char",size:1,values:C.i8(0)},
    {name:"flush_screen.flushing",type:"int",size:4,values:0},
    {name:"flush_screen.delay_flushing",type:"int",size:4,values:0},
    {name:"zapcolors",type:"int[8]",size:(4*8),values:[C.zap_color_missile,C.zap_color_fire,C.zap_color_frost,C.zap_color_sleep,C.zap_color_death,C.zap_color_lightning,C.zap_color_poison_gas,C.zap_color_acid]},
    {name:"altarcolors",type:"int[5]",size:(4*5),values:[C.altar_color_unaligned,C.altar_color_chaotic,C.altar_color_neutral,C.altar_color_lawful,C.altar_color_other]},
    {name:"explodecolors",type:"int[7]",size:(4*7),values:[C.explode_color_dark,C.explode_color_noxious,C.explode_color_muddy,C.explode_color_wet,C.explode_color_magical,C.explode_color_fiery,C.explode_color_frosty]},
    {name:"wallcolors",type:"int[5]",size:(4*5),values:[7,7,7,7,7]},
    {name:"seenv_matrix",type:"unsigned char[3][3]",size:((1*3)*3),values:[[(C.u8(4)),(C.u8(2)),(C.u8(1))],[(C.u8(8)),(C.u8(255)),(C.u8(128))],[(C.u8(16)),(C.u8(32)),(C.u8(64))]]},
    {name:"wall_matrix",type:"int[4][5]",size:((4*4)*5),values:[[C.S_stone,C.S_tlcorn,C.S_trcorn,C.S_hwall,C.S_tdwall],[C.S_stone,C.S_trcorn,C.S_brcorn,C.S_vwall,C.S_tlwall],[C.S_stone,C.S_brcorn,C.S_blcorn,C.S_hwall,C.S_tuwall],[C.S_stone,C.S_blcorn,C.S_tlcorn,C.S_vwall,C.S_trwall]]},
    {name:"cross_matrix",type:"int[4][6]",size:((4*4)*6),values:[[C.S_brcorn,C.S_blcorn,C.S_tlcorn,C.S_tuwall,C.S_trwall,C.S_crwall],[C.S_blcorn,C.S_tlcorn,C.S_trcorn,C.S_trwall,C.S_tdwall,C.S_crwall],[C.S_tlcorn,C.S_trcorn,C.S_brcorn,C.S_tdwall,C.S_tlwall,C.S_crwall],[C.S_trcorn,C.S_brcorn,C.S_blcorn,C.S_tlwall,C.S_tuwall,C.S_crwall]]},
    {name:"t_warn.warn_str",type:"char[38]",size:(1*38),values:C.literal("wall_angle: %s: case %d: seenv = 0x%x")},
];
