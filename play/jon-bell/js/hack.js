// hack.js — C ref: hack.c.
import './allmain.js';
import { pooleffects_is_flyer } from './cmd.js';
import { set_msg_xy } from './pline.js';
import { BLINDED, CORR, FIRE_RES, FLYING, ICE, IS_AIR, IS_OBSTRUCTED, IS_STWALL, IS_TREE, IS_WATERWALL, LAVAWALL, LEVITATION, M_AP_FURNITURE, M_AP_OBJECT, M_AP_TYPE, ROOM, STONE, VIBRATING_SQUARE, W_NONDIGGABLE, isok, u_at } from './const.js';
import { mon_visible, time_botl_run_ended } from './display.js';
import { game } from './gstate.js';
import { dist2 } from './hacklib.js';
import { ENV } from './hostenv.js';
import { _is_lava_local, _is_pool_local, is_door_mappear } from './look.js';
import { is_pool_or_lava } from './dbridge.js';
import { closed_door } from './monmove.js';
import { trapname } from './trap.js';
import { Amonnam, hliquid } from './do_name.js';
import { an } from './objnam.js';
import { pline } from './pline.js';
import { pushRngLogEntry } from './rng.js';
import { classifyTerrain, invalidateTerrainStatus } from './terrain-status.js';
import { t_at } from './trap.js';
import { m_at } from './uhitm.js';
import { is_safemon } from './display.js';
import { acurr } from './attrib.js'; // relocate-fns
import { A_CON } from './const.js';
import { Is_airlevel, LEFT_SIDE, OVERLOADED, RIGHT_SIDE, UNENCUMBERED, Upolyd, WOUNDED_LEGS, W_ARMF } from './const.js'; // relocate-fns
import { acurrstr } from './dokick.js'; // relocate-fns
import { float_vs_flight } from './polyself.js'; // relocate-fns
import { _cwt, inv_weight_raw } from './weight.js'; // relocate-fns
import './cmd.js'; // relocate-fns
import { COLD_RES, DISINT_RES, FAST, INTRINSIC, INVIS, POISON_RES, SEE_INVIS, SHOCK_RES, SLEEP_RES, STEALTH, TELEPORT, TELEPORT_CONTROL, UNCHANGING } from './const.js'; // relocate-fns
import { flush_pending_messages } from './display.js'; // relocate-fns
import { deadhero, do_death_sequence } from './end.js'; // relocate-fns
import { You_hear } from './pline.js'; // relocate-fns
import { PM_ELF, PM_VALKYRIE, PM_WIZARD } from './pm.generated.js'; // relocate-fns
import { rehumanize } from './polyself.js'; // relocate-fns
import { newsym } from './display.js'; // relocate-fns
import { place_object, remove_object } from './mkobj.js'; // relocate-fns
import { Soundeffect, maybe_unhide_at } from './mon.js'; // relocate-fns
import { You_cant } from './pline.js'; // relocate-fns
import './cmd.js';
import { ceiling } from './dungeon.js'; // relocate-fns
import { ARTICLE_A, FAILEDUNTRAP, HALF_PHDAM, IS_SINK, I_SPECIAL, MAX_TYPE, MELT_ICE_AWAY, RLOC_NOMSG, TIMEOUT, is_pit } from './const.js'; // relocate-fns
import { Warning, sensemon } from './display.js'; // relocate-fns
import { hard_helmet } from './do_wear.js'; // relocate-fns
import { pending_death_is_final } from './end.js'; // relocate-fns
import { is_ice } from './engrave.js'; // relocate-fns
import { drain_pending_death_in_place } from './fastforward.js'; // relocate-fns
import { x_monnam } from './do_name.js'; // relocate-fns
import { mdamageu } from './mhitu.js'; // relocate-fns
import { helm_simple_name } from './objnam.js'; // relocate-fns
import { pickup } from './pickup.js'; // relocate-fns
import { d, rn2, rnd } from './rnd.js'; // relocate-fns
import './spoteffects.js'; // relocate-fns
import { mnexto } from './mon.js'; // relocate-fns
import { spot_time_left } from './timeout.js'; // relocate-fns
import { dotrap, float_down } from './trap.js'; // relocate-fns
import { Blind } from './vision.js'; // relocate-fns
import { COLNO, NO_ROOM, ROOMOFFSET, ROWNO, SHARED, SHARED_PLUS, SHOPBASE } from './const.js'; // relocate-fns
import './cmd.js'; // relocate-fns
import { D_BROKEN, D_NODOOR, IS_DOOR, Is_rogue_level, PASSES_WALLS } from './const.js'; // relocate-fns
import { PM_GRID_BUG } from './pm.generated.js'; // relocate-fns
import { block_door } from './shk.js'; // relocate-fns
import { _gp_uprop_he, lev_flags, lev_typ } from './trap.js';
import { goodpos } from './teleport.js'; // relocate-fns
import { exercise } from './attrib.js'; // relocate-fns
import { HVY_ENCUMBER } from './const.js'; // relocate-fns
import { gethungry } from './eat.js'; // relocate-fns
import { You } from './pline.js'; // relocate-fns
import { fall_asleep } from './timeout.js'; // relocate-fns
import * as cmdNS from './cmd.js'; // relocate-fns
import { DOOR, D_TRAPPED, IRONBARS, IS_WALL, LL_CONDUCT, NO_PART, SDOOR, SHOP_DOOR_COST } from './const.js'; // relocate-fns
import { watch_dig } from './dig.js'; // relocate-fns
import { morehungry } from './eat.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { dissolve_bars } from './monmove.js'; // relocate-fns
import { OC_WEIGHT } from './oc_weight.generated.js'; // relocate-fns
import { livelog_printf } from './pline.js'; // relocate-fns
import { add_damage, pay_for_damage } from './shk.js'; // relocate-fns
import { b_trapped } from './trap.js'; // relocate-fns
import { block_point, recalc_block_point } from './vision.js'; // relocate-fns
import { A_DEX, FROMFORM, FROMOUTSIDE, NO_KILLER_PREFIX, W_ARTI } from './const.js'; // relocate-fns
import { Boots_off, LEVITATION_BOOTS_OTYP_DW, RIN_LEVITATION_OTYP, Ring_off, off_msg, stop_donning } from './do_wear.js'; // relocate-fns
import { is_weptool } from './mhitm.js'; // relocate-fns
import { doname } from './objnam.js'; // relocate-fns
import { rn1 } from './rng.js'; // relocate-fns
import { selftouch } from './trap.js'; // relocate-fns
import { _fumble_hallucinating, stop_occupation } from './allmain.js'; // relocate-fns
import { cmdq_clear } from './cmd.js'; // relocate-fns
import { CQ_CANNED, FAINTING, Upolyd as _Upolyd } from './const.js'; // relocate-fns
import { canspotmon } from './display.js'; // relocate-fns
import { Armor_off, Armor_on, Boots_on, Cloak_off, Cloak_on, Gloves_off, Gloves_on, Helmet_off, Helmet_on, Shield_off, Shield_on, Shirt_off, Shirt_on } from './do_wear.js'; // relocate-fns
import { Finish_digestion, Hear_again } from './eat.js'; // relocate-fns
import { monPmname } from './makemon.js'; // relocate-fns
import monsPack from './makemon_mons.json' with { type: 'json' }; // relocate-fns
import { noattacks_mndx, stealarm_mu } from './mhitu.js'; // relocate-fns
import { onscary } from './monmove.js'; // relocate-fns
import { prayer_done } from './pray.js'; // relocate-fns
import { unstolenarm } from './steal.js'; // relocate-fns
import { check_leash } from './apply.js'; // relocate-fns
import { attacks } from './artifact.js'; // relocate-fns
import { adjalign } from './attrib.js'; // relocate-fns
import { drag_ball, move_bc } from './ball.js'; // relocate-fns
import { midnight } from './calendar.js'; // relocate-fns
import { AD_FIRE_ART, BOULDER_OTYP, OCLASS_COIN, SET_BOTL, STATUE_OTYP, S_GHOST, S_VORTEX, SetVoice, TIP_GETPOS, TRAP_EXPLANATIONS, TTY_MENU_ROWS, Underwater, WEB_TTYP, _Blind_cmd, _Breathless, _Cold_resistance, _Flying, _Levitation, _Underwater, _ansimpleoname, _bldr_Sokoban, _bldr_revive_nasty, _cmd_Hallucination, _digests, _dolook, _flush_travel_unsure, _glyph_at, _hero_Deaf, _hero_notake, _hero_youmonst, _hidesUnder_useupf, _hliquid, _is_hider_mndx, _is_lava, _is_pool, _levlAt, _likes_lava, _mh_a_monnam, _next2u, _norep, _objdescr_is, _pe_is_clinger, _pickupMenuCounts, _pickup_lift_list, _plineVFmt, _sortloot_within_class, _st_Punished, _st_Stealth, _st_is_floater, _the_str, _u_on_newpos_nearby, _uprop_active, bhp_bury_objs, bigmonst_cmd, cmd_from_func, cmdq_peek, confdir, do_reqmenu, flooreffects_is_lava, flooreffects_is_whirly, flooreffects_throws_rocks, hit_bars_hero, impossible_cmd, is_blade, is_flimsy, nh_delay_output, paranoid_query, pooleffects_Amphibious, pooleffects_Breathless, pooleffects_Flying, pooleffects_Levitation, pooleffects_Swimming, pooleffects_Wwalking, pooleffects_back_on_ground, pooleffects_ceiling_hider, pooleffects_dismount_steed, pooleffects_drown, pooleffects_grounded, pooleffects_hliquid, pooleffects_is_lava, pooleffects_is_pool, pooleffects_lava_effects, reset_occupations, stolen_value, type_is_pname, u_on_newpos_cmd, u_wield_art, verysmall_cmd } from './cmd.js'; // relocate-fns
import { menucolor_text } from './coloratt.js'; // relocate-fns
import { build_window_screen, menu_search_case, tty_window_offx } from './com_pager.js'; // relocate-fns
import { ACH_TOWN, AIR, ALTAR, ANTHOLE, ARTICLE_NONE, ARTICLE_THE, ARTICLE_YOUR, A_STR, BARRACKS, BEEHIVE, BRK_FROM_INV, BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK, CMDQ_EXTCMD, COCKNEST, CONFLICT, CONFUSION, COURT, DBWALL, DB_ICE, DB_LAVA, DB_MOAT, DB_UNDER, DELPHI, DISMOUNT_FELL, DISMOUNT_GENERIC, DOMOVE_RUSH, DOMOVE_WALK, DO_MOVE, DRAWBRIDGE_UP, D_CLOSED, D_ISOPEN, D_LOCKED, ECMD_OK, ECMD_TIME, ESHK, EXPL_FIERY, EXPL_FROSTY, EXPL_MAGICAL, FOUNTAIN, GP_ALLOW_U, GRAVE, HEADSTONE, HOLE, IS_FURNITURE, In_mines, In_sokoban, Is_waterlevel, LADDER, LAVAPOOL, LEPREHALL, MENU_TRADITIONAL, MOAT, MOD_ENCUMBER, MORGUE, M_AP_NOTHING, N_DIRS, OROOM, PARANOID_CONFIRM, PARANOID_SWIM, PLNMSG_BACK_ON_GROUND, POOL, PROT_FROM_SHAPE_CHANGERS, P_BASIC, P_RIDING, P_UNSKILLED, RUN_CRAWL, RUN_LEAP, RUN_TPORT, SCORR, SINK, SLT_ENCUMBER, STAIRS, STUNNED, SUPPRESS_SADDLE, SWAMP, TEMPLE, TEST_MOVE, TEST_TRAP, TEST_TRAV, THRONE, TRAPDOOR, TRAPNUM, TRAP_CLEARLY_IMMUNE, TRAVP_GUESS, TRAVP_TRAVEL, TRAVP_VALID, TREE, TT_BEARTRAP, TT_BURIEDBALL, TT_INFLOOR, TT_LAVA, TT_PIT, TT_WEB, WATER, WT_ELF, WT_TOOMUCH_DIAGONAL, W_NONPASSWALL, ZOO, has_mgivenname, xdir, ydir } from './const.js'; // relocate-fns
import * as _PROPIDS from './const.js'; // relocate-fns
import { is_ice as _is_ice, is_db_wall, is_pool, is_waterwall } from './dbridge.js'; // relocate-fns
import { DEFSYM_EXPLANATION } from './defsym_data.js'; // relocate-fns
import { BOULDER, buried_ball, buried_ball_to_punishment, dig_typ, is_pick, use_pick_axe2 } from './dig.js'; // relocate-fns
import { GLYPHCLS_INVIS, GLYPHCLS_MON, GLYPHCLS_OBJ, _topl_joins_snapshot, _topl_merge_result, _topl_snapshot_result, _topl_stash_result, _topline_more_pending, canseemon, capture_painted_frame_with_status, docrt, feel_location, flush_screen, force_more, glyph_is_invisible_at, glyph_is_warning_at, lone_frame_run_flush, map_invisible, map_object, nh_sprintf, obj_to_glyph, prepare_deferred_pline, show_travel_debug, status_r1_menu_docrt, unmap_invisible, unmap_object, wall_angle_is_stone } from './display.js'; // relocate-fns
import { boulder_hits_pool, flooreffects } from './do.js'; // relocate-fns
import { YMonnam, m_monnam, y_monnam } from './do_name.js'; // relocate-fns
import { xname } from './do_wear.js'; // relocate-fns
import { abuse_dog, sticks } from './dog.js'; // relocate-fns
import { dmgtype } from './dogmove.js'; // relocate-fns
import { breaktest } from './dothrow.js'; // relocate-fns
import { def_oc_syms_chars } from './drawing.js'; // relocate-fns
import { Invocation_lev as Invocation_lev_dgn, depth, get_level, room_discovered, surface } from './dungeon.js'; // relocate-fns
import { can_reach_floor, engr_at, wipe_engr_at } from './engrave.js'; // relocate-fns
import { experience, newexplevel } from './exper.js'; // relocate-fns
import { explode } from './explode.js'; // relocate-fns
import { FF_FAITHFUL } from './fastforward.js'; // relocate-fns
import { dxdy_to_dist_descr } from './getpos.js'; // relocate-fns
import { distmin, ing_suffix, s_suffix, upstart, visctrl } from './hacklib.js'; // relocate-fns
import { nhgetch } from './input.js'; // relocate-fns
import { record_achievement } from './insight.js'; // relocate-fns
import { carrying, freeinv, useupf, will_feel_cockatrice } from './invent.js'; // relocate-fns
import { doopen_indir } from './lock.js'; // relocate-fns
import { permonstTemplate, splitobj } from './makemon.js'; // relocate-fns
import { helpless } from './mhitm.js'; // relocate-fns
import { MONS_CWT } from './mklev.js'; // relocate-fns
import { maybe_adjust_hero_bubble, water_friction } from './mkmaze.js'; // relocate-fns
import { add_to_migration, obj_extract_self, obj_ice_effects } from './mkobj.js'; // relocate-fns
import { inside_room, search_special } from './mkroom.js'; // relocate-fns
import { curr_mon_load, hideunder, minliquid, seemimic, set_ustuck, wake_msg, wake_nearto } from './mon.js'; // relocate-fns
import { Resists_Elem, attacktype, attacktype_fordmg, locomotion } from './mondata.js'; // relocate-fns
import { accessible, can_fog, can_ooze, m_postmove_effect } from './monmove.js'; // relocate-fns
import { NHCORE_GETPOS_TIP, l_nhcore_call } from './nhlua.js'; // relocate-fns
import { The, Tobjnam, doname_with_price as _doname_with_price, Tobjnam as _objnam_Tobjnam, the as _the_objnam, bare_artifactname, makeplural as makeplural_objnam, otense, the } from './objnam.js'; // relocate-fns
import { PARANOID_CONFIRMATION_DEFAULT_BITS, map_menu_cmd } from './options.js'; // relocate-fns
import { waterbody_name } from './pager.js'; // relocate-fns
import { autopick_testobj, loot_mon, pickup as pickup_c } from './pickup.js'; // relocate-fns
import { You_feel, impossible as real_impossible, impossible as trapmove_impossible, verbalize } from './pline.js'; // relocate-fns
import { PM_AIR_ELEMENTAL, PM_DISPLACER_BEAST } from './pm.generated.js'; // relocate-fns
import { body_part, rehumanize as rehumanize_real } from './polyself.js'; // relocate-fns
import { intemple } from './priest.js'; // relocate-fns
import { set_cursor } from './read.js'; // relocate-fns
import { in_out_region, reg_damg, visible_region_at } from './region.js'; // relocate-fns
import { Hello } from './role.js'; // relocate-fns
import { selection_getpoint, selection_new, selection_setpoint } from './selvar.js'; // relocate-fns
import { IS_SHOP as IS_SHOP_ROOM, block_entry, costly_spot, addtobill as shk_addtobill, costly_spot as shk_costly_spot, find_objowner as shk_find_objowner, onbill as shk_onbill, subfrombill as shk_subfrombill, shop_keeper, u_entered_shop, u_left_shop } from './shk.js'; // relocate-fns
import { P_SKILL } from './skills.js'; // relocate-fns
import { On_stairs, stairway_at } from './stairs.js'; // relocate-fns
import { exercise_steed, rider_cant_reach, stucksteed } from './steed.js'; // relocate-fns
import { random_teleport_level, rloco } from './teleport.js'; // relocate-fns
import { peek_timer, spot_stop_timers, start_timer, stop_timer } from './timeout.js'; // relocate-fns
import { blow_up_landmine, climb_pit, deltrap, feeltrap, fill_pit, float_up, immune_to_trap, into_vs_onto, launch_obj, mintrap, reset_utrap, seetrap, sokoban_guilt, uteetering_at_seen_pit } from './trap.js'; // relocate-fns
import { menu_heading_text } from './tty_menu.js'; // relocate-fns
import { DEADMONSTER, do_attack, mon_nam, more_experienced, stumble_onto_mimic } from './uhitm.js'; // relocate-fns
import { Blind as _vision_Blind, cansee, couldsee, vision_recalc } from './vision.js'; // relocate-fns
import { use_skill, uwep_skill_type, weapon_descr } from './weapon.js'; // relocate-fns
import { setuwep } from './wield.js'; // relocate-fns
import { worm_cross } from './worm.js'; // relocate-fns

const _DIRTRACE = (typeof process !== 'undefined' && ENV
    && ENV.FF_DIRTRACE === '1');

// C ref: hack.c:906-913 may_dig(coordxy x, coordxy y)
//   struct rm *lev = &levl[x][y];
//   return (boolean) !((IS_STWALL(lev->typ) || IS_TREE(lev->typ))
//                      && (lev->wall_info & W_NONDIGGABLE));
// "intended to be called only on ROCKs or TREEs". wall_info is the shared
// `flags` bitfield. RNG: none.
export function may_dig(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev) return false;
    return !((IS_STWALL(lev.typ) || IS_TREE(lev.typ))
             && (lev.wall_info & W_NONDIGGABLE));
}

// C ref: rm.h NODIAG macro (hack.h:1419)
// #define NODIAG(monnum) ((monnum) == PM_GRID_BUG)
// PM_GRID_BUG = 116 (from pm.generated.js)
const PM_GRID_BUG_LA = 116;

export function NODIAG(monnum) { return (monnum | 0) === PM_GRID_BUG_LA; }

// C ref: hack.c:2448-2464 avoid_moving_on_trap(x, y, msg)
// Returns TRUE if there's a known, visible, non-vibrating-square trap at (x, y).
// (RNG-free: only reads trap state.)
export async function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);
    if (!trap) return false;
    if (!trap.tseen) return false;
    if (trap.ttyp === VIBRATING_SQUARE) return false;
    /* C hack.c:2456-2460 — rushes (run >= 2) report why they stopped. */
    if (msg && game.flags?.mention_walls) {
        set_msg_xy(x, y);
        await pline(`You stop in front of ${an(trapname(trap.ttyp | 0, false))}.`);
    }
    return true;
}

// C ref: hack.c:2466-2494 avoid_moving_on_liquid(x, y, msg) — static fn in C
// Returns TRUE if the hero should stop at the edge of a pool/lava.
// RNG-free; reads terrain type, hero flags, and seenv.
export async function avoid_moving_on_liquid(x, y, msg) {
    const u = game.u || {};
    const levHere = game.level?.at(u.ux | 0, u.uy | 0);
    const levThere = game.level?.at(x, y);
    if (!levThere) return false;
    /* C youprop.h:240-255: blocked properties do not lift the hero; a flying steed can. */
    const lp = u.uprops?.[LEVITATION], fp = u.uprops?.[FLYING];
    const levitation = !!((lp?.intrinsic || lp?.extrinsic) && !lp?.blocked);
    const flying = !!((fp?.intrinsic || fp?.extrinsic
        || (u.usteed && pooleffects_is_flyer(u.usteed.data))) && !fp?.blocked);
    const in_air = levitation || flying;
    /* C hack.c:59-65 Known_wwalking / Known_lwalking.  These are
     * knowledge predicates, not movement properties: the hero only knows
     * water walking when identified water-walking boots are worn (and is not
     * riding), while lava walking additionally requires known fire resistance
     * and boots marked erosion-proof and rust-known. */
    const uarmf = u.uarmf;
    const known_wwalking = !!(uarmf
        && (uarmf.otyp | 0) === 167 /* WATER_WALKING_BOOTS */
        && game._oc_name_known?.[167]
        && !u.usteed);
    const fireRes = u.uprops?.[FIRE_RES];
    const known_lwalking = !!(known_wwalking && fireRes
        && ((fireRes.intrinsic | 0) || (fireRes.extrinsic | 0))
        && uarmf.oerodeproof && uarmf.rknown);
    /* C condition: avoid if:
     * NOT ((levl[x][y].typ == levl[u.ux][u.uy].typ
     *       || (context.run < 2 && (!is_lava(x,y) || in_air))
     *       || context.travel)
     *      && (in_air || Known_lwalking || (is_pool(x,y) && Known_wwalking))
     *      && !(IS_WATERWALL || LAVAWALL))
     * AND is_pool_or_lava(x,y) && levl[x][y].seenv */
    const ctx = game.context || {};
    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const typHere = levHere?.typ ?? ROOM;
    const typThere = levThere.typ;
    const isLavaThere = _is_lava_local(x, y);
    const isPoolThere = _is_pool_local(x, y);
    /* safe conditions */
    const safe_terrain = (typThere === typHere
        || (run < 2 && (!isLavaThere || in_air))
        || travel);
    const safe_protected = (in_air || known_lwalking
        || (isPoolThere && known_wwalking));
    const notWaterwall = !(IS_WATERWALL(typThere) || typThere === LAVAWALL);
    if (safe_terrain && safe_protected && notWaterwall) return false;
    if (is_pool_or_lava(x, y) && levThere.seenv) {
        if (msg && game.flags?.mention_walls) {
            set_msg_xy(x, y);
            await pline(`You stop at the edge of the ${hliquid(isPoolThere ? 'water' : 'lava')}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c:4046-4066 end_running(boolean and_travel)
// Clears context.run, optionally clears travel/travel1/mv, clears multi if > 0.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export function end_running(and_travel) {
    const ctx = game.context;
    if (!ctx) return;
    const wasRunning = !!(ctx.run | 0);
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_enter[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} andTravel=${and_travel?1:0} moves=${game.moves|0}]`);
    /* C hack.c:4131-4136 — `if (svc.context.run) { svc.context.run = 0;
     *     if (flags.time) disp.time_botl = TRUE; ... }'.  moveloop_core suppresses
     * the turn counter's status update for the whole run (allmain.c:262), so the
     * stop is what puts the current svm.moves back on the physical line. */
    if (ctx.run | 0) time_botl_run_ended();
    ctx.run = 0;
    /* C hack.c:4141-4143 — only a real run stop with terrainstatus enabled
     * invalidates/reclassifies the status terrain. */
    if (wasRunning && game.flags?.terrainstatus) {
        invalidateTerrainStatus();
        classifyTerrain();
    }
    if (and_travel) {
        ctx.travel = 0;
        ctx.travel1 = 0;
        ctx.mv = 0;
    }
    if (game.gt && game.gt.travelmap)
        game.gt.travelmap = null;
    if ((game.multi | 0) > 0) {
        game.multi = 0;
    }
    if (ENV.FF_RUN_TRACE === '1')
        pushRngLogEntry(`^run_end_exit[run=${ctx.run|0} multi=${game.multi|0} move=${ctx.move?1:0} mv=${ctx.mv?1:0} travel=${ctx.travel?1:0} timeBotl=${game.disp?.time_botl|0} frozen=${game._timeBotlFrozenMoves ?? -1} moves=${game.moves|0}]`);
}

// C ref: hack.c:3814-3975 lookaround(void) — RNG-FREE run-stop predicate.
// Scans the 3×3 neighborhood of the hero and stops the run (nomul(0)) on:
//   - a visible non-safe monster in the path
//   - a known trap ahead
//   - a closed door orthogonally ahead
//   - a pool/lava ahead that would be dangerous
//   - a corridor intersection (corrct > 1 in run==2 mode)
// May rewrite u.dx/u.dy/u.last_str_turn for corridor turns.
// Consumes NO RNG.
// WIRE_PENDING: stage-B-run-dispatch — will be called from moveloop_core multi>0 loop.
export async function lookaround() {
    const u = game.u;
    if (!u) return;
    const ctx = game.context || {};

    /* C hack.c:3907-3910 — grid bugs stop if moving diagonal */
    if (NODIAG(u.umonnum | 0) && u.dx && u.dy) {
        await pline('You cannot move diagonally.');
        nomul(0);
        return;
    }

    /* C hack.c:3829-3830 — Blind or run==0: return without scanning */
    const bp = u.uprops?.[BLINDED];
    const blind = !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
        && !(bp.blocked | 0);
    if (blind || !(ctx.run)) return;

    const run = ctx.run | 0;
    const travel = !!ctx.travel;
    const ux = u.ux | 0, uy = u.uy | 0;
    const dx = u.dx | 0, dy = u.dy | 0;

    let corrct = 0, noturn = 0;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;

    /* FF_DIRTRACE emit at a STOP exit (a nomul(0); return inside the scan). The
     * tail-of-function emit covers the no-stop / turn-resolution exits; this one
     * covers the early stop returns so the instrument shows the run-STOP cause
     * (e.g. the closed-door stop at hack.c:3884 that ends the run faithfully). */
    const _emitStop = (reason) => {
        if (!_DIRTRACE) return;
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=0 turnApplied=0 turnI=na stop=1 reason=${reason}]`);
    };

    /* C hack.c:3831-3939: nested x/y loop over 3×3 neighborhood */
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            const infront = (x === ux + dx && y === uy + dy);
            /* ignore out of bounds and hero's own cell */
            if (!isok(x, y) || u_at(x, y)) continue;
            /* grid bugs: ignore diagonals */
            if (NODIAG(u.umonnum | 0) && x !== ux && y !== uy) continue;

            const lev = game.level?.at(x, y);
            if (!lev) continue;
            const typ = lev.typ;

            /* monster check */
            /* C m_at(): the map grid, which also holds long worm tail segments */
            const mtmp = m_at(x, y);
            if (mtmp != null
                && M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                && M_AP_TYPE(mtmp) !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* C hack.c:3849-3855: stop for visible hostile, or infront non-travel */
                if ((run !== 1 && !is_safemon(mtmp))
                    || (infront && !travel)) {
                    /* C hack.c:3853-3855: pline_xy(x, y,
                     *     "%s blocks your path.", upstart(a_monnam(mtmp))).
                     * Amonnam is exactly that naming composition.  pline()'s
                     * normal path updates the topline synchronously, so this
                     * awaits completion before stopping the run (apart
                     * from the same display-name stream C may use while
                     * hallucinating). */
                    if (game.flags?.mention_walls) {
                        set_msg_xy(x, y);
                        await pline(`${Amonnam(mtmp)} blocks your path.`);
                    }
                    nomul(0);
                    _emitStop(`monster@${x},${y}:tame${mtmp.mtame | 0}:peace${mtmp.mpeaceful | 0}:infront${infront ? 1 : 0}`);
                    return;
                }
            }

            /* stone is never interesting */
            if (typ === STONE) continue;
            /* skip the square we're moving away from */
            if (x === ux - dx && y === uy - dy) continue;

            /* trap check: avoid_moving_on_trap(x, y, infront && run > 1) */
            if (await avoid_moving_on_trap(x, y, infront && run > 1)) {
                if (run === 1) {
                    /* goto bcorr — treat as corridor */
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (infront) {
                    nomul(0);
                    _emitStop('trap-infront');
                    return;
                }
                /* run != 1 and !infront: fall through to the IS_OBSTRUCTED/etc check */
            }

            /* uninteresting terrain: obstructed/room/air/ice */
            if (IS_OBSTRUCTED(typ) || typ === ROOM
                || IS_AIR(typ) || typ === ICE) {
                continue;
            } else if (closed_door(x, y) || (mtmp && is_door_mappear(mtmp))) {
                /* closed door? */
                if (x !== ux && y !== uy) continue; /* ignore if diagonal */
                if (run !== 1 && !travel) {
                    /* C hack.c:3974-3977 */
                    if (game.flags?.mention_walls) {
                        set_msg_xy(x, y);
                        await pline('You stop in front of the door.');
                    }
                    nomul(0);
                    _emitStop('closed-door');
                    return;
                }
                /* orthogonal closed door → treat as corridor (bcorr) */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (typ === CORR) {
                /* corridor */
                const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                    corrct, noturn, i0, x0, y0, m0);
                corrct = bcorr_res.corrct;
                noturn = bcorr_res.noturn;
                i0 = bcorr_res.i0;
                x0 = bcorr_res.x0;
                y0 = bcorr_res.y0;
                m0 = bcorr_res.m0;
                continue;
            } else if (is_pool_or_lava(x, y)) {
                if (infront && await avoid_moving_on_liquid(x, y, true)) {
                    nomul(0);
                    _emitStop('liquid');
                    return;
                }
                continue;
            } else {
                /* e.g. objects, trap, stairs */
                if (run === 1) {
                    const bcorr_res = _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
                        corrct, noturn, i0, x0, y0, m0);
                    corrct = bcorr_res.corrct;
                    noturn = bcorr_res.noturn;
                    i0 = bcorr_res.i0;
                    x0 = bcorr_res.x0;
                    y0 = bcorr_res.y0;
                    m0 = bcorr_res.m0;
                    continue;
                }
                if (run === 8) continue;
                if (mtmp) continue;
                /* off-axis continue checks */
                if (((x === ux - dx) && (y !== uy + dy))
                    || ((y === uy - dy) && (x !== ux + dx)))
                    continue;
                /* fall through to stop */
                nomul(0);
                _emitStop('obstruction');
                return;
            }
        }
    }

    /* C hack.c:4025-4028: corrct > 1 in run==2 → widen corridor → stop */
    if (corrct > 1 && run === 2) {
        if (game.flags?.mention_walls)
            await pline('The corridor widens here.');
        nomul(0);
        _emitStop('corridor-widens');
        return;
    }

    /* C hack.c:3946-3974: corridor turn resolution — may rewrite u.dx/u.dy */
    let _turnGate = false, _turnApplied = false, _turnI = null;
    if ((run === 1 || run === 3 || run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        _turnGate = true;
        let i;
        if (i0 === 2) {
            if (dx === y0 - uy && dy === ux - x0)
                i = 2;  /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (dx && dy) {
            if ((dx === dy && y0 === uy) || (dx !== dy && y0 !== uy))
                i = -1; /* half turn left */
            else
                i = 1;  /* half turn right */
        } else {
            if ((x0 - ux === y0 - uy && !dy)
                || (x0 - ux !== y0 - uy && dy))
                i = 1;  /* half turn right */
            else
                i = -1; /* half turn left */
        }
        i += (u.last_str_turn | 0);
        _turnI = i;
        if (i <= 2 && i >= -2) {
            _turnApplied = true;
            u.last_str_turn = i;
            u.dx = x0 - ux;
            u.dy = y0 - uy;
        }
    }
    if (_DIRTRACE) {
        pushRngLogEntry(
            `^ff_dirtrace[moves=${game.moves | 0} ux=${ux} uy=${uy}`
            + ` dxIn=${dx} dyIn=${dy} dxOut=${u.dx | 0} dyOut=${u.dy | 0}`
            + ` run=${run} corrct=${corrct} noturn=${noturn} m0=${m0} i0=${i0}`
            + ` x0=${x0} y0=${y0} lst=${u.last_str_turn | 0}`
            + ` turnGate=${_turnGate ? 1 : 0} turnApplied=${_turnApplied ? 1 : 0}`
            + ` turnI=${_turnI == null ? 'na' : _turnI}`
            + ` stop=${(game.multi | 0) === 0 ? 1 : 0}]`);
    }
}

/* Helper: bcorr block — corridor counting logic (C hack.c:3894-3920).
 * Takes current corridor-tracking state and returns updated state.
 * Returns null to signal "skip this cell" (C's 'continue' from inside bcorr).
 *
 * C uses goto bcorr which jumps into the CORR else-if branch at label bcorr:.
 * The label is at the start of the inner if(typ!=ROOM) block, so all goto bcorr
 * sites run the same logic and then the outer 'continue' at line 3920.
 *
 * Important: when i > 2 inside bcorr, C does 'continue' WITHOUT incrementing
 * corrct.  We signal this by returning the state unchanged (same as skip). */
function _bcorr(x, y, ux, uy, dx, dy, run, mtmp,
    corrct, noturn, i0, x0, y0, m0) {
    /* C hack.c:3895: if (levl[u.ux][u.uy].typ != ROOM) — hero is in corridor */
    const levHero = game.level?.at(ux, uy);
    if (levHero && levHero.typ !== ROOM) {
        /* running or traveling: run==1/3/8 */
        if (run === 1 || run === 3 || run === 8) {
            /* i = dist2(x, y, u.ux+u.dx, u.uy+u.dy) */
            const i = dist2(x, y, ux + dx, uy + dy);
            /* C: if (i > 2) continue — skip cell, do NOT increment corrct */
            if (i > 2) {
                return { corrct, noturn, i0, x0, y0, m0 };
            }
            /* mark noturn if this corridor is not orthogonally next to prev */
            if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                noturn = 1;
            /* prefer the closer/orthogonal option */
            if (i < i0) {
                i0 = i;
                x0 = x;
                y0 = y;
                m0 = mtmp ? 1 : 0;
            }
        }
        corrct++;
    }
    return { corrct, noturn, i0, x0, y0, m0 };
}


/* C include/weight.h */
const WT_WEIGHTCAP_STRCON = 25; /* str+con multiplied by this */

const WT_WEIGHTCAP_SPARE = 50;

const WT_WOUNDEDLEG_REDUCT = 100;

const MAX_CARR_CAP = 1000;

const WT_HUMAN = 1450; /* C weight.h — weight of human body; Upolyd cap rescale */

/* C monflag.h sizes / mlets / mflags2 used by the Upolyd capacity rescale. */
const MZ_HUMAN = 2; /* == MZ_MEDIUM */

const S_NYMPH = 14;

const M2_STRONG = 0x04000000;
const M1_FLY = 0x00000001; /* monflag.h */
const COIN_CLASS = 12; /* objclass.h */

export function weight_cap() {
    const u = game.u;
    if (!u) return 1;

    const levPropW = (u.uprops && u.uprops[LEVITATION]) ? u.uprops[LEVITATION] : null;
    const save_ELev = levPropW ? (levPropW.extrinsic | 0) : 0;
    if (game.afternmv === 'Boots_on' && levPropW && (save_ELev & W_ARMF)) {
        levPropW.extrinsic = save_ELev & ~W_ARMF;
        float_vs_flight();
    }

    let carrcap = (WT_WEIGHTCAP_STRCON * (acurrstr(u) + (acurr(u, A_CON) | 0)))
                  + WT_WEIGHTCAP_SPARE;

    /* Upolyd branch (hack.c:4277-4287) — consistent with can_carry() in mon.c.
     *   if (youmonst.data->mlet == S_NYMPH)            carrcap = MAX_CARR_CAP;
     *   else if (!youmonst.data->cwt)                  carrcap *= msize / MZ_HUMAN;
     *   else if (!strongmonst || (strongmonst && cwt > WT_HUMAN))
     *                                                  carrcap *= cwt / WT_HUMAN; */
    if (Upolyd(u)) {
        const yd = game.youmonst && game.youmonst.data;
        if (yd) {
            const cwt = _cwt(yd.pmidx | 0);
            const strong = ((yd.mflags2 | 0) & M2_STRONG) !== 0;
            if ((yd.mlet | 0) === S_NYMPH) {
                carrcap = MAX_CARR_CAP;
            } else if (!cwt) {
                carrcap = Math.trunc((carrcap * (yd.msize | 0)) / MZ_HUMAN);
            } else if (!strong || (strong && cwt > WT_HUMAN)) {
                carrcap = Math.trunc((carrcap * cwt) / WT_HUMAN);
            }
        }
    }

    /* Levitation || Is_airlevel || strong-steed (hack.c:4289).
     * C youprop.h:240: Levitation = ((HLevitation || ELevitation) && !BLevitation).
     * Read the conferred property (e.g. ring of levitation just worn → ELevitation
     * set by setworn); this gives the hero MAX carrying capacity, dropping the
     * encumbrance state.  weight_cap also masks BLevitation&I_SPECIAL (hack.c:4309)
     * — the I_SPECIAL bit is cleared for the capacity check. */
    const levProp = (u.uprops && u.uprops[LEVITATION]) ? u.uprops[LEVITATION] : null;
    const HLevitation = levProp ? (levProp.intrinsic | 0) : 0;
    const ELevitation = levProp ? (levProp.extrinsic | 0) : 0;
    const BLevitation = levProp ? ((levProp.blocked | 0) & ~I_SPECIAL) : 0;
    const Levitation = (HLevitation || ELevitation) && !BLevitation;
    const Is_airlevel_wc = Is_airlevel(game.u?.uz);
    /* C hack.c:4326 `u.usteed && strongmonst(u.usteed->data)` */
    const _steedData = u.usteed ? (u.usteed.data || null) : null;
    const strongSteed = !!(_steedData && ((_steedData.mflags2 | 0) & M2_STRONG));
    if (Levitation || Is_airlevel_wc || strongSteed) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP)
            carrcap = MAX_CARR_CAP;
        // C hack.c:4330 / youprop.h:253: flight includes a flying steed.
        const flight = u.uprops?.[FLYING];
        const Flying = !!((flight?.intrinsic | 0) || (flight?.extrinsic | 0)
            || ((u.usteed?.data?.mflags1 | 0) & M1_FLY))
            && !(flight?.blocked | 0);
        if (!Flying) {
            /* hack.c:4293-4296 — EWounded_legs & LEFT_SIDE / RIGHT_SIDE. */
            const wprop = u.uprops ? u.uprops[WOUNDED_LEGS] : null;
            const eWoundedLegs = wprop ? (wprop.extrinsic | 0) : 0;
            if (eWoundedLegs & LEFT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (eWoundedLegs & RIGHT_SIDE) carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }

    /* hack.c:4338-4343 — BLevitation was masked above; C restores the saved
     * value and calls float_vs_flight(), which RECOMPUTES the I_SPECIAL block
     * from the current u.utrap.  So a weight_cap() call (bot() via
     * near_capacity) after trapmove() zeroed u.utrap but before reset_utrap()
     * drops the block, and reset_utrap(TRUE) then sees was_Lev true and prints
     * no float_up message. */
    /* C hack.c:4338-4343 — undo the boot-delay mask and re-block Flying. */
    if (levPropW && (levPropW.extrinsic | 0) !== save_ELev) {
        levPropW.extrinsic = save_ELev;
        float_vs_flight();
    }
    if (levProp && ((levProp.blocked | 0) & I_SPECIAL)) float_vs_flight();

    return Math.max(carrcap, 1); /* never return 0 */
}

/* C hack.c:4315 inv_weight() — returns (sum_owt - weight_cap). */
export function inv_weight() {
    return inv_weight_raw() - weight_cap();
}

/* C hack.c:4336 calc_capacity(xtra_wt). */
export function calc_capacity(xtra_wt) {
    const wc = weight_cap();        /* C: gw.wc set inside inv_weight() */
    const wt = (inv_weight_raw() - wc) + (xtra_wt | 0);
    if (wt <= 0)
        return UNENCUMBERED;
    if (wc <= 1)
        return OVERLOADED;
    const cap = Math.trunc((wt * 2) / wc) + 1;
    return Math.min(cap, OVERLOADED);
}

/* C hack.c:4348 near_capacity() = calc_capacity(0). */
export function near_capacity() {
    return calc_capacity(0);
}

/* C hack.c:4354 max_capacity() = inv_weight() - 2*weight_cap(). */
export function max_capacity() {
    const wc = weight_cap();
    return (inv_weight_raw() - wc) - (2 * wc);
}

/* C ref: hack.c:4219 losehp(n, knam, k_format) — apply hit-point loss to the
 * current monster form or the hero's ordinary HP, then resolve rehumanization
 * or death before returning to the caller. */
export async function losehp(n, knam, k_format) {
    const u = game.u;
    if (!u)
        return;
    n |= 0;
    // C's preceding pline has completed update_topl/more before losehp starts.
    // Drain the port's queued pages while they still show the pre-damage HP.
    /* C runs no flush_screen between the preceding pline and losehp's
     * SET_BOTL (hack.c:4265): status dirtied since that pline's own
     * flush_screen (kick_ouch's set_wounded_legs, dokick.c:900-901, ATEMP(A_DEX)--)
     * is not on the physical line until a later bot().  The port's drain below
     * must not paint it. */
    const _d0 = (game.disp ||= {});
    const _bl = _d0.botl, _blx = _d0.botlx;
    _d0.botl = 0; _d0.botlx = 0;
    /* ...and neither is the map: the port's drain below flushes the gbuf
     * (kick_ouch's feel_location paint), which C does not do here, so a later
     * display_nhwindow(WIN_MESSAGE) that blocks without flushing (vamp_shift,
     * monmove.c:2391) still shows the terminal as of the pline's own flush. */
    const _lff0 = game._lastFlushFrame;
    await flush_pending_messages();
    if (_lff0) game._lastFlushFrame = _lff0;
    if (_bl) _d0.botl = _bl;
    if (_blx) _d0.botlx = _blx;
    (game.disp ||= {}).botl = 1;
    end_running(true);
    if (Upolyd(u)) {
        u.mh = (u.mh | 0) - (n | 0);
        showdamage(n); /* C hack.c:4269 */
        if ((u.mhmax | 0) < (u.mh | 0)) u.mhmax = u.mh;
        if ((u.mh | 0) < 1) {
            await rehumanize();
        } else {
            const p = u.uprops?.[UNCHANGING];
            if ((n | 0) > 0 && (u.mh | 0) * 10 < (u.mhmax | 0)
                && ((p?.intrinsic | 0) || (p?.extrinsic | 0))) await maybe_wail();
        }
        return;
    }
    u.uhp = (u.uhp | 0) - (n | 0);
    showdamage(n); /* C hack.c:4280 */
    if ((u.uhp | 0) > (u.uhpmax | 0))
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if ((u.uhp | 0) < 1) {
        /* C hack.c:4248-4250 writes svk.killer, which is the struct
         * formatkiller() (topten.c:172) reads for the tombstone and the score
         * line.  This wrote a DIFFERENT object, `game.killer`, that nothing
         * reads — so a hero killed by a falling rock or a thrown potion got an
         * empty killer name on the stone. */
        if (!game.svk) game.svk = {};
        if (!game.svk.killer)
            game.svk.killer = { id: 0, format: 0, name: '', next: null };
        game.svk.killer.format = k_format | 0;
        game.svk.killer.name = knam || '';
        /* Preserve hack.c:4287's source-specific urgent death line across the
         * port's deferred async death boundary. */
        deadhero(0 /* DIED */, { urgentDeathLine: true });
        await do_death_sequence({ inPlace: true });
    } else if ((n | 0) > 0 && (u.uhp | 0) * 10 < (u.uhpmax | 0)) {
        await maybe_wail();
    }
}

/* ══ C hack.c:4210-4241 maybe_wail() ═════════════════════════════════════════
 * The "you are nearly dead" warning, fired by losehp() once the hero drops
 * below a tenth of max HP.  RNG-FREE.
 *
 * gw.wailmsg is a global that throttles it to once per 50 moves; this port had
 * no such field, so it is introduced here under C's name on `game`.  The
 * powers[] list and the >= 4 threshold are C's, verbatim; the intrinsic test is
 * `u.uprops[powers[i]].intrinsic & INTRINSIC` (youprop.h), the same uprops
 * spelling js/ writes elsewhere (see the note in js/const.js). */
/* seffects.h enum sound_effect_entries (se_zero_invalid = 0 first) */
const se_wailing_of_the_banshee = 193;

const _WAIL_POWERS = [TELEPORT, SEE_INVIS, POISON_RES, COLD_RES, SHOCK_RES,
                      FIRE_RES, SLEEP_RES, DISINT_RES, TELEPORT_CONTROL,
                      STEALTH, FAST, INVIS];

async function maybe_wail() {
    const g = game, u = g.u;
    /* C hack.c:4217-4220 */
    if ((g.moves | 0) <= ((g.wailmsg | 0) + 50))
        return;
    g.wailmsg = g.moves | 0;
    if (g._touch_artifact_blast_msg) {
        const _bm = g._touch_artifact_blast_msg;
        g._touch_artifact_blast_msg = null;
        await pline(_bm);
    }
    /* C you.h:240/290 Role_if/Race_if — gu.urole.mnum / gu.urace.mnum, the same
     * readers js/cmd.js:254 and js/cmd.js:11131 use. */
    const role = (g.urole && g.urole.mnum) | 0;
    const race = (g.urace && g.urace.mnum) | 0;
    const isWiz = role === PM_WIZARD, isValk = role === PM_VALKYRIE;
    if (isWiz || race === PM_ELF || isValk) {
        /* C hack.c:4221-4237 */
        const who = (isWiz || isValk) ? (g.urole?.name?.m ?? 'Wizard') : 'Elf';
        if ((u.uhp | 0) === 1) {
            await pline(`${who} is about to die.`);
        } else {
            let powercnt = 0;
            for (const pw of _WAIL_POWERS)
                if (((u.uprops?.[pw]?.intrinsic | 0) & INTRINSIC) !== 0)
                    ++powercnt;
            await pline(powercnt >= 4
                ? `${who}, all your powers will be lost...`
                : `${who}, your life force is running out.`);
        }
        return;
    }
    /* C hack.c:4239-4241 — Soundeffect() then You_hear(); js/pline.js's
     * You_hear carries the Deaf/unaware guard and both prefixes. */
    Soundeffect(se_wailing_of_the_banshee, 75);
    const what = (u.uhp | 0) === 1 ? 'the wailing of the Banshee...'
                                   : 'the howling of the CwnAnnwn...';
    await You_hear(what);
}


// movobj(obj, ox, oy) — hack.c:824-833.
export function movobj(obj, ox, oy) {
    remove_object(obj);
    maybe_unhide_at(obj.ox | 0, obj.oy | 0);
    newsym(obj.ox | 0, obj.oy | 0);
    place_object(obj, ox, oy);
    newsym(ox, oy);
}

/** C ref: hack.c:4514 money_cnt — walk invent chain, return COIN_CLASS obj quan. */
export function money_cnt(otmp) {
    for (; otmp; otmp = otmp.nobj) {
        if ((otmp.oclass | 0) === COIN_CLASS)
            return otmp.quan;
    }
    return 0;
}

/* C ref: pline.c You_cant(const char *line, ...) — "You can't %s!". */
/* C ref: hack.c:4370 check_capacity(str) —
 *     if (near_capacity() >= EXT_ENCUMBER) {
 *         if (str) pline(str); else You_cant("do that while carrying so much stuff.");
 *         return TRUE;
 *     }
 *     return FALSE;
 * EXT_ENCUMBER = 4 (hack.h encumbrance levels: Unencumbered=0, Burdened=1,
 * Stressed=2, Strained=3, Overtaxed=4, Overloaded=5) — same threshold
 * js/cmd.js's own check_capacity uses. */
const EAT_EXT_ENCUMBER = 4;

export async function check_capacity(qbuf) {
    if (near_capacity() >= EAT_EXT_ENCUMBER) {
        if (qbuf) await pline(qbuf);
        else await You_cant('do that while carrying so much stuff.');
        return true;
    }
    return false;
}

const S_PIERCER = 16; // defsym.h

function terrain(x, y) {
    return game.level?.locations?.[x]?.[y]?.typ ?? STONE;
}

export async function spoteffects(pick) {
    const g = game, u = g.u;
    let trap = t_at(u.ux, u.uy);
    const trapflag = g.iflags?.failing_untrap ? FAILEDUNTRAP : 0;
    // C function statics belong to this game, including across nested calls.
    const state = g._spoteffectsState ||= {
        depth: 0, x: 0, y: 0, terrain: STONE, trap: null, trapType: 0,
    };
    if (state.depth && u.ux === state.x && u.uy === state.y
        && state.terrain === terrain(u.ux, u.uy)
        && (!state.trap || !trap || trap.ttyp === state.trapType)) return;
    if (g.iflags?.in_lava_effects) return;

    ++state.depth;
    state.terrain = terrain(u.ux, u.uy);
    state.x = u.ux;
    state.y = u.uy;
    try {
        if (state.terrain !== terrain(u.ux0, u.uy0)
            || g.iflags?.terrain_typ === MAX_TYPE)
            await switch_terrain();
        if (await pooleffects(true)) return;
        await check_special_room(false);

        const lev = () => u.uprops?.[LEVITATION] || {};
        const levitating = () => !!((lev().intrinsic | 0) || (lev().extrinsic | 0))
            && !(lev().blocked | 0);
        if (IS_SINK(terrain(u.ux, u.uy)) && levitating())
            await dosinkfall();

        if (!g.in_steed_dismounting) {
            if (trap && ((lev().intrinsic | 0) & TIMEOUT) === 1
                && !((lev().extrinsic | 0)
                     || ((lev().intrinsic | 0) & ~(I_SPECIAL | TIMEOUT)))) {
                if (rn2(2)) {
                    const prop = lev();
                    prop.intrinsic = ((prop.intrinsic | 0) & ~TIMEOUT)
                        | Math.min(TIMEOUT, ((prop.intrinsic | 0) & TIMEOUT) + 1);
                } else if (await float_down(I_SPECIAL | TIMEOUT, 0)) {
                    trap = null;
                    pick = false;
                }
            }
            const pit = trap && is_pit(trap.ttyp);
            if (pick && !pit) await pickup(1);
            if (trap && (!state.trap || state.trapType !== trap.ttyp)) {
                state.trap = trap;
                state.trapType = trap.ttyp;
                try {
                    await dotrap(trap, trapflag);
                } finally {
                    state.trap = null;
                    state.trapType = 0;
                }
            }
            if (pick && pit) await pickup(1);
        }

        if (Warning() && is_ice(u.ux, u.uy)) {
            const left = spot_time_left(u.ux, u.uy, MELT_ICE_AWAY);
            if (left && left < 15) {
                const warnings = ['The ice seems very soft and slushy.',
                    'You feel the ice shift beneath you!', 'The ice, is gonna BREAK!'];
                await pline(warnings[left < 5 ? 2 : left < 10 ? 1 : 0]);
            }
        }

        await spoteffects_mon_underfoot();
    } finally {
        if (!--state.depth) {
            state.terrain = STONE;
            state.x = state.y = 0;
        }
    }
}

/* C ref: hack.c:3416-3454 — spoteffects()' last block: a monster on the
 * hero's new square (a piercer drops, anything else surprises) is moved off
 * with mnexto().  Shared with teleds()' inline spoteffects (js/teleport.js). */
export async function spoteffects_mon_underfoot() {
    const u = game.u;
    const mon = m_at(u.ux, u.uy);
    if (mon && !u.uswallow) {
        mon.mundetected = mon.msleeping = 0;
        if ((mon.data?.mlet | 0) === S_PIERCER) {
            await pline(`${Amonnam(mon)} suddenly drops from the ${ceiling(u.ux, u.uy)}!`);
            if (mon.mtame) {
                // The tame piercer jumps to greet the hero.
            } else if (hard_helmet(u.uarmh)) {
                await pline(`Its blow glances off your ${helm_simple_name(u.uarmh)}.`);
            } else if ((u.uac | 0) + 3 <= rnd(20)) {
                await pline(`You are almost hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
            } else {
                await pline(`You are hit by ${x_monnam(mon, ARTICLE_A, 'falling', 0, true)}!`);
                let damage = d(4, 6);
                const half = u.uprops?.[HALF_PHDAM];
                if ((half?.intrinsic | 0) || (half?.extrinsic | 0))
                    damage = Math.trunc((damage + 1) / 2);
                const deathBefore = game._pendingDeath || null;
                await mdamageu(mon, damage);
                /* C hack.c:3439 mdamageu -> done_in_by: "You die..." pages
                 * inside done(), before hack.c:3454's mnexto moves the
                 * piercer off the hero's square, and done() never returns
                 * unless the death is escaped. */
                if (game._pendingDeath && game._pendingDeath !== deathBefore) {
                    await drain_pending_death_in_place();
                    if (pending_death_is_final()) return;
                }
            }
        } else if (mon.mtame) {
            await pline(`${Amonnam(mon)} jumps near you from the ${ceiling(u.ux, u.uy)}.`);
        } else if (mon.mpeaceful) {
            const name = Blind() && !sensemon(mon) ? 'something'
                : x_monnam(mon, ARTICLE_A, null, 0, false);
            await pline(`You surprise ${name}!`);
            mon.mpeaceful = 0;
        } else {
            await pline(`${Amonnam(mon)} attacks you by surprise!`);
        }
        await mnexto(mon, RLOC_NOMSG);
    }
}

/* C ref: hack.c:697-760 in_rooms(x, y, typewanted) — return the room numbers
 * that <x,y> belongs to, filtered by room type.  C returns a NUL-terminated
 * char string of room numbers built backwards from the end of a static buffer;
 * this returns the same numbers, in the same order, as an array (every JS
 * caller in this file already consumes the stub's array form).
 *
 * C's goodtype(rno) macro:
 *   !typewanted
 *   || (typefound = svr.rooms[rno - ROOMOFFSET].rtype) == typewanted
 *   || (typewanted == SHOPBASE && typefound > SHOPBASE)
 * i.e. SHOPBASE is a "any shop" wildcard, since each shop kind is SHOPBASE+n.
 */
export function in_rooms(x, y, typewanted) {
    const buf = [];
    const rooms = game.level?.rooms ?? [];
    const goodtype = (rno) => {
        if (!typewanted)
            return true;
        const typefound = rooms[rno - ROOMOFFSET]?.rtype | 0;
        return typefound === typewanted
            || (typewanted === SHOPBASE && typefound > SHOPBASE);
    };
    const roomno_at = (xx, yy) =>
        (game.level?.locations?.[xx]?.[yy]?.roomno | 0);

    let rno = roomno_at(x, y);
    let step;
    switch (rno) {
    case NO_ROOM:
        return buf;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default: /* i.e. a regular room # */
        if (goodtype(rno))
            buf.unshift(rno);
        return buf;
    }

    /* C hack.c:721-737 — scan the 3x3 (or 2x2, for SHARED's step 2) window
     * around <x,y> collecting every distinct good-type room number. */
    let min_x = x - 1, max_x = x + 1;
    if (x < 1)
        min_x += step;
    else if (x >= COLNO)
        max_x -= step;

    let min_y = y - 1, max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO) {
        max_y_offset -= step;
    }

    for (let xx = min_x; xx <= max_x; xx += step) {
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = roomno_at(xx, min_y + yy);
            if (rno >= ROOMOFFSET && !buf.includes(rno) && goodtype(rno))
                buf.unshift(rno);
        }
    }
    return buf;
}

function _gp_Passes_walls() { return _gp_uprop_he(PASSES_WALLS); }

/* ---------------------------------------------------------------------------
 * crawl_destination — can the hero crawl from water to <x,y>?
 * C ref: nethack-c/src/hack.c:3992-4017
 *   boolean crawl_destination(coordxy x, coordxy y)
 * RNG: none of its own (goodpos()'s rn2(13) never fires for the hero, whose
 * mdat->mlet is never S_EEL on the crawl path).
 * ---------------------------------------------------------------------------
 */
export function crawl_destination(x, y) {
    const u = game.u || {};

    /* is location ok in general? */
    if (!goodpos(x, y, game.youmonst, 0))
        return false;

    /* orthogonal movement is unrestricted when destination is ok */
    if (x === u.ux || y === u.uy)
        return true;

    /* diagonal movement has some restrictions */
    if ((u.umonnum | 0) === PM_GRID_BUG) /* hack.h:1419 NODIAG(monnum) */
        return false; /* poly'd into a grid bug... */
    if (_gp_Passes_walls())
        return true; /* or a xorn... */
    /* pool could be next to a door, conceivably even inside a shop */
    if (IS_DOOR(lev_typ(x, y)) && (!doorless_door(x, y) || block_door(x, y)))
        return false;
    /* finally, are we trying to squeeze through a too-narrow gap? */
    return !(bad_rock(game.youmonst?.data, u.ux, y)
             && bad_rock(game.youmonst?.data, x, u.uy)
             && cant_squeeze_thru(game.youmonst));
}

/* C hack.c:3035 overexert_hp: use the current form's HP; otherwise interrupt
 * occupation and sleep. Melee, kicking, and turn upkeep share this body. */
export async function overexert_hp() {
    const _oeU = game.u || {};
    const _polyd = Upolyd(_oeU);
    const _hpKey = _polyd ? 'mh' : 'uhp';
    const _hpVal = (_oeU[_hpKey] | 0);
    if (_hpVal > 1) {
        _oeU[_hpKey] = _hpVal - 1;
        (game.disp ||= {}).botl = 1;
    }
    else {
        /* C hack.c:3043-3045: You(), exercise, then fall_asleep().  It
         * awaits stop_occupation(), which is synchronous in C but can
         * complete an async meal in this port. */
        await You("pass out from exertion!");
        exercise(A_CON, false);
        await fall_asleep(-10, false);
    }
}

/* C hack.c:3051 overexertion: hunger precedes encumbrance damage, and the
 * live multi countdown determines whether combat must stop. */
export async function overexertion() {
    await gethungry(); /* fires rn2(20) inside gethungry [eat.c:3191] */
    if (((game.moves | 0) % 3) !== 0 && near_capacity() >= HVY_ENCUMBER) {
        await overexert_hp();
    }
    return (game.multi | 0) < 0;
}

const M1_METALLIVORE = 0x80000000; /* monflag.h */

/* C hack.h:80 #define SHOP_WALL_DMG (10L * ACURRSTR) */
function SHOP_WALL_DMG() { return 10 * acurrstr(game.u); }

// C hack.c:647-824 still_chewing(): boulders take priority over their terrain.
export async function still_chewing(x, y) {
    const g = game;
    const u = g.u;
    const lev = g.level.at(x, y);
    const boulder = sobj_at(475 /* BOULDER */, x, y);
    const resetDig = () => {
        g.context.digging = { pos: { x: 0, y: 0 }, level: null, down: false,
            chew: false, warned: false, effort: 0 };
    };
    g.context = g.context || {};
    if (!g.context.digging) resetDig();
    const d = g.context.digging;
    if (d.down) { resetDig(); }
    const dg = g.context.digging;
    const obstructed = IS_OBSTRUCTED(lev.typ);
    const metallivore = ((g.youmonst.data.mflags1 | 0) & M1_METALLIVORE) !== 0; /* metallivorous() */
    if (!boulder && ((obstructed && !may_dig(x, y))
        || (lev.typ === IRONBARS && (lev.wall_info & W_NONDIGGABLE)))) {
        await pline('You hurt your teeth on the %s.'.replace('%s',
            lev.typ === IRONBARS ? 'bars' : IS_TREE(lev.typ) ? 'tree' : 'hard stone'));
        nomul(0);
        return true;
    }
    if (lev.typ === IRONBARS && metallivore && u.uhunger > 1500) {
        await pline('You are too full to eat the bars.');
        nomul(0);
        return true;
    }
    // C hack.c:669-674 / 689-698 / 713-716: iron bars are "bar" in the start
    // message and "bars" in the continue message (C ref hack.c:703-716).
    const isbars = lev.typ === IRONBARS;
    const what = boulder ? 'boulder' : IS_TREE(lev.typ) ? 'tree' : obstructed ? 'rock' : isbars ? 'bar' : 'door';
    const udaminc = u.udaminc | 0;
    if (!dg.chew || dg.pos.x !== x || dg.pos.y !== y
        || !dg.level || dg.level.dnum !== u.uz.dnum || dg.level.dlevel !== u.uz.dlevel) {
        dg.down = false;
        dg.chew = true;
        dg.warned = false;
        dg.pos = { x, y };
        dg.level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
        dg.effort = (obstructed && !IS_TREE(lev.typ) ? 30 : 60) + udaminc;
        await pline(`You start chewing ${(boulder || IS_TREE(lev.typ) || isbars) ? 'on a' : 'a hole in the'} ${what}.`);
        await watch_dig(null, x, y, false);
        return true;
    }
    dg.effort = (dg.effort | 0) + 30 + udaminc;
    if (dg.effort <= 100) {
        if (g.flags?.verbose)
            await pline(`You ${dg.chew ? 'continue' : 'begin'} chewing on the ${!boulder && isbars ? 'bars' : what}.`);
        dg.chew = true;
        await watch_dig(null, x, y, false);
        return true;
    }
    // Okay, you've chewed through something
    if (!(u.uconduct.food | 0))
        livelog_printf(LL_CONDUCT, 'ate for the first time, by chewing through %s',
            boulder ? 'a boulder' : IS_TREE(lev.typ) ? 'a tree' : obstructed ? 'rock' : isbars ? 'iron bars' : 'a door');
    u.uconduct.food = (u.uconduct.food | 0) + 1;
    u.uhunger = (u.uhunger | 0) + rnd(20); /* hack.c:735 — a GAIN, not morehungry */
    let digtxt = null, dmgtxt = null;
    if (boulder) {
        await cmdNS._delobj_useupf(boulder);
        await pline('You eat the boulder.');
        if (obstructed || closed_door(x, y) || sobj_at(475 /* BOULDER */, x, y)) {
            block_point(x, y);
            resetDig();
            return true;
        }
    } else if (IS_WALL(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage(x, y, SHOP_WALL_DMG());
            dmgtxt = 'damage';
        }
        digtxt = 'chew a hole in the wall.';
        if (g.level.flags.is_maze_lev) {
            lev.typ = ROOM;
        } else if (g.level.flags.is_cavernous_lev && !cmdNS.in_town(x, y)) {
            lev.typ = CORR;
        } else {
            lev.typ = DOOR;
            lev.doormask = D_NODOOR;
        }
    } else if (IS_TREE(lev.typ)) {
        digtxt = 'chew through the tree.';
        lev.typ = ROOM;
    } else if (isbars) {
        if (metallivore) await morehungry(-OC_WEIGHT[477 /* HEAVY_IRON_BALL */]);
        digtxt = u.ux === x && u.uy === y ? 'devour the iron bars.' : 'eat through the bars.';
        await dissolve_bars(x, y);
    } else if (lev.typ === SDOOR) {
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            await b_trapped('secret door', NO_PART);
        } else {
            digtxt = 'chew through the secret door.';
            lev.doormask = D_BROKEN;
        }
        lev.typ = DOOR;
    } else if (IS_DOOR(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage(x, y, SHOP_DOOR_COST);
            dmgtxt = 'break';
        }
        if ((lev.doormask | 0) & D_TRAPPED) {
            lev.doormask = D_NODOOR;
            await b_trapped('door', NO_PART);
        } else {
            digtxt = 'chew through the door.';
            lev.doormask = D_BROKEN;
        }
    } else { /* STONE or SCORR */
        digtxt = 'chew a passage through the rock.';
        lev.typ = CORR;
    }
    recalc_block_point(x, y);
    newsym(x, y);
    if (digtxt) await pline(`You ${digtxt}`);
    if (dmgtxt) await pay_for_damage(dmgtxt, false);
    resetDig();
    return false;
}

const WEAPON_CLASS = 2;

function halfPhysical(damage) {
    const p = game.u?.uprops?.[HALF_PHDAM];
    return ((p?.intrinsic | 0) || (p?.extrinsic | 0))
        ? Math.trunc((damage + 1) / 2) : damage;
}

function prop(index) {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    return u.uprops[index] || (u.uprops[index] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
}

function levitatingProp() { return prop(LEVITATION); }

function flyingProp() { return prop(FLYING); }

function floorObjects() {
    const u = game.u || {};
    return game.level?.levelObjects?.[u.ux | 0]?.[u.uy | 0] || null;
}

/** C hack.c:836 dosinkfall(). */
export async function dosinkfall() {
    const g = game;
    const u = g.u || (g.u = {});
    const hp = levitatingProp();
    const fp = flyingProp();
    let levBoots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS_OTYP_DW);
    const innateLev = ((hp.intrinsic | 0) & (FROMOUTSIDE | FROMFORM)) !== 0;
    const blockedLev = (hp.blocked | 0) === I_SPECIAL;
    const ufall = !innateLev && !blockedLev
        && !((fp.intrinsic | 0) || (fp.extrinsic | 0));

    if (!ufall) {
        await pline((innateLev || blockedLev)
            ? 'You wobble unsteadily for a moment.'
            : 'You gain control of your flight.');
    } else {
        const saveELev = hp.extrinsic | 0;
        const saveHLev = hp.intrinsic | 0;
        hp.extrinsic = 0;
        hp.intrinsic = 0;
        await pline('You crash to the floor!');
        const damage = rn1(8, 25 - (acurr(u, A_CON) | 0));
        await losehp(halfPhysical(damage), 'fell onto a sink', NO_KILLER_PREFIX);
        if (g._pendingDeath)
            await do_death_sequence({ inPlace: true });
        exercise(A_DEX, false);
        await selftouch('Falling, you');
        for (let obj = floorObjects(); obj; obj = obj.nexthere) {
            if ((obj.oclass | 0) !== WEAPON_CLASS && !is_weptool(obj))
                continue;
            await pline(`You fell on ${(await doname(obj))}.`);
            await losehp(halfPhysical(rnd(3)), 'fell onto a sink', NO_KILLER_PREFIX);
            if (g._pendingDeath)
                await do_death_sequence({ inPlace: true });
            exercise(A_CON, false);
        }
        hp.extrinsic = saveELev;
        hp.intrinsic = saveHLev;
    }

    if (ufall || levBoots)
        await stop_donning(levBoots ? u.uarmf : null);

    /* stop_donning may have removed boots that were still being put on. */
    levBoots = !!(u.uarmf && (u.uarmf.otyp | 0) === LEVITATION_BOOTS_OTYP_DW);

    hp.extrinsic = (hp.extrinsic | 0) & ~W_ARTI;
    hp.intrinsic = ((hp.intrinsic | 0) & ~(I_SPECIAL | TIMEOUT)) + 1;
    if (u.uleft && (u.uleft.otyp | 0) === RIN_LEVITATION_OTYP) {
        const ring = u.uleft;
        await Ring_off(ring);
        await off_msg(ring);
    }
    if (u.uright && (u.uright.otyp | 0) === RIN_LEVITATION_OTYP) {
        const ring = u.uright;
        await Ring_off(ring);
        await off_msg(ring);
    }
    if (levBoots && u.uarmf) {
        const boots = u.uarmf;
        await Boots_off();
        await off_msg(boots);
    }
    hp.intrinsic = ((hp.intrinsic | 0) - 1) | 0;
    float_vs_flight();
}

export let _travel_unsure_pending = false;
export function set__travel_unsure_pending(v) { _travel_unsure_pending = v; }

export function nomul(nval) {
    const g = game;
    const cur = (g.multi | 0);
    if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
        const st = (new Error().stack || '').split('\n').slice(2, 5)
            .map((l) => (l.match(/\/(js\/[a-z_0-9]+\.js:\d+)/) || [, '?'])[1]).join(' <- ');
        pushRngLogEntry(`^ml_nomul[nval=${nval} cur=${cur} moves=${g.moves | 0} from=${st}]`);
    }
    if (cur < nval)
        return;
    if (g.disp && cur >= 0)
        g.disp.botl = 1;
    if (g.u) {
        g.u.uinvulnerable = false;
        g.u.usleep = 0;
    }
    g.multi = nval | 0;
    if (nval === 0) {
        g.multi_reason = null;
        g.multireasonbuf = '';
    }
    end_running(true);
    cmdq_clear(CQ_CANNED);
}

// C ref: hack.c:4085 unmul(msg_override) — fires when a multi<0 countdown
// completes. Sets gm.multi=0, prints nomovemsg, clears multi_reason, then runs
// ga.afternmv (the scheduled callback) exactly once, clearing it first.
// afternmv is stored as a string tag (the faithful JS analogue of C's function
// pointer); we dispatch it through afternmv_dispatch().  The armor *_off
// callbacks are RNG-free (do_wear.c:909 Armor_off etc.).
export async function unmul(msg_override) {
    const g = game;
    /* C hack.c:4179 `disp.botl = TRUE;` — the whole status line (T: included, even
     * while a run suppresses time_botl) repaints at the nomovemsg pline's flush. */
    (g.disp ||= {}).botl = 1;
    g.multi = 0;
    if (msg_override != null)
        g.nomovemsg = msg_override;
    else if (g.nomovemsg == null || g.nomovemsg === 0) /* C's NULL (steal.c:550 `= 0`) */
        g.nomovemsg = 'You can move again.';
    /* C hack.c:4185 `if (*gn.nomovemsg)` — non-empty, which is exactly JS
     * string truthiness once the null case above is handled. */
    if (g.nomovemsg) {
        const _survived = g.nomovemsg.slice(0, 18).toLowerCase() === 'you survived that ';
        await pline(g.nomovemsg);
        /* C hack.c:4192-4194 — follow "You survived that attempt" with the current
         * form when polymorphed (Ugender: you.h:555). */
        if (_Upolyd(g.u) && _survived) {
            const _ug = (g.u.mfemale ? 1 : 0);
            await pline(`You are ${an(monPmname(g.u.umonnum | 0, _ug))}.`);
        }
    }
    g.nomovemsg = null;
    /* C hack.c:4197 — unmul clears u.usleep (set by fall_asleep, timeout.c:972;
     * a stale value made mattacku's mhitu.c:940 "combat awakens you" rn2(10)
     * fire for a woken hero). */
    if (g.u) g.u.usleep = 0;
    /* C hack.c:4198 `gm.multi_reason = NULL, gm.multireasonbuf[0] = '\0';` */
    g.multi_reason = null;
    g.multireasonbuf = '';
    /* C ref: hack.c:4200-4207 — clear afternmv BEFORE calling it. */
    if (g.afternmv) {
        const tag = g.afternmv;
        g.afternmv = null;
        await afternmv_dispatch(tag);
    }
}

/* afternmv string-tag → callback dispatch (faithful analogue of the C
 * ga.afternmv function pointer). Stage 1: armor *_off callbacks only.
 * Returns each callback result so unmul awaits messages, terrain effects,
 * and any death/lifesaving caused by removing protection. */
async function afternmv_dispatch(tag) {
    switch (tag) {
        case 'eatmdone': return (await import('./eat.js')).eatmdone();
        case 'stealarm':   return stealarm_mu(); /* steal.c:165 */
        case 'unstolenarm': return unstolenarm(); /* steal.c:146 */
        case 'Finish_digestion': return Finish_digestion(); /* eat.c:3961 */
        case 'Armor_off':  return Armor_off();
        case 'Shield_off': return Shield_off();
        case 'Helmet_off': return Helmet_off();
        case 'Gloves_off': return Gloves_off();
        case 'Boots_off':  return Boots_off();
        case 'Cloak_off':  return Cloak_off();
        case 'Shirt_off':  return Shirt_off();
        /* Donning (*_on) callbacks — Stage 4 (do_wear.c:887 Armor_on et al.).
         * RNG-free AC/intrinsic recompute, fired by unmul when the dressing
         * countdown (nomul(-oc_delay)) completes. */
        case 'Armor_on':   return Armor_on();
        case 'Shield_on':  return Shield_on();
        case 'Helmet_on':  return Helmet_on();
        case 'Gloves_on':  return Gloves_on();
        case 'Boots_on':   return Boots_on();
        case 'Cloak_on':   return Cloak_on();
        case 'Shirt_on':   return Shirt_on();
        /* prayer_done — C ref: pray.c:2276, scheduled by dopray()'s nomul(-3).
         * Fired by unmul when the 3-turn praying countdown completes. */
        case 'prayer_done': return prayer_done();
        /* Hear_again — C ref: eat.c:1800, scheduled by rottenfood()'s
         * nomul(-rnd(10)) knockout arm (eat.c:1850).  Draws rn2(2) when the
         * unconsciousness countdown completes. */
        case 'Hear_again': return Hear_again();
        /* stealarm — C ref: steal.c:165, scheduled by steal()'s armor arm. */
        case 'stealarm': return (await import('./mhitu.js')).stealarm();
        case 'unfaint': {
            Hear_again();
            if ((game.u.uhs | 0) > FAINTING)
                game.u.uhs = FAINTING;
            await stop_occupation();
            if (game.disp) game.disp.botl = 1;
            return undefined;
        }
        default: return undefined;
    }
}

// C ref: hack.c:4022 monster_nearby(void) — TRUE if a hostile, spottable,
// non-helpless monster occupies one of the 8 squares adjacent to the hero.
// moveloop_core (allmain.c:563) calls this after the occupation callback; if it
// returns TRUE the occupation is interrupted (stop_occupation()).  This is what
// turn 15 and breaks the `learn` occupation before its delay counts to 0.
const M1_HIDE = 0x00000100; /* monflag.h */

export function monster_nearby() {
    const g = game;
    const u = g.u || {};
    const ux = u.ux | 0, uy = u.uy | 0;
    const hallu = _fumble_hallucinating();
    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y) || (x === ux && y === uy))
                continue;
            const mtmp = m_at(x, y);
            if (!mtmp)
                continue;
            // The faithful/fastforward monster roster carries the species index
            // (mnum/mndx), not a full permonst pointer — resolve flags by mndx.
            /* C allmain.c:563 -> monster_nearby() tests mtmp->data; a
             * polymorphed monster's current form can differ from mndx. */
            const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
            // C: skip mimicked furniture/objects (M_AP_FURNITURE/OBJECT).
            const apType = (mtmp.m_ap_type | 0) & 0x7; // M_AP_TYPE
            if (apType === 1 /* M_AP_FURNITURE */ || apType === 2 /* M_AP_OBJECT */)
                continue;
            // C: hostile-and-can-attack (or hallucinating).  noattacks_mndx is
            // the mndx-keyed form of noattacks(mtmp->data).
            if (!(hallu || (!mtmp.mpeaceful && !noattacks_mndx(mndx))))
                continue;
            // C hack.c:4121: is_hider tests the current form's M1_HIDE bit.
            if (mtmp.mundetected
                && ((mtmp.data?.mflags1 ?? monsPack.mons[mndx]?.[6] ?? 0) & M1_HIDE))
                continue;
            // C: not helpless (asleep/frozen).  Our roster tracks mcanmove.
            if (!mtmp.mcanmove || mtmp.msleeping)
                continue;
            // C hack.c:4123: !onscary(u.ux, u.uy, mtmp) — a monster scared by
            // the hero's square (Elbereth, scare monster) does not interrupt.
            if (onscary(ux, uy, mtmp))
                continue;
            // C: canspotmon — hero can see or sense it.
            if (!canspotmon(mtmp))
                continue;
            if (typeof process !== 'undefined' && ENV && ENV.FF_MLTRACE === '1') {
                pushRngLogEntry(`^ml_near[x=${x | 0} y=${y | 0} mndx=${mndx | 0}`
                    + ` peaceful=${mtmp.mpeaceful ? 1 : 0} canmove=${mtmp.mcanmove === false ? 0 : 1}`
                    + ` frozen=${mtmp.mfrozen | 0} sleeping=${mtmp.msleeping | 0}`
                    + ` moves=${g.moves | 0} multi=${g.multi | 0}]`);
            }
            return true;
        }
    }
    return false;
}

/* Bounded run/door context telemetry for replay diagnosis.  The trace is
 * deliberately kept in the existing RNG-log side channel so the diagnostic
 * replay can collect it without changing the scorer protocol.  It records
 * state at command and domove boundaries only; it never reads or advances
 * RNG and is inert unless FF_RUNTRACE=1 is explicitly set. */
function ffRunTrace(tag, fields = '') {
    if (typeof process !== 'undefined' && ENV?.FF_RUNTRACE === '1') {
        const g = game;
        pushRngLogEntry(`^runtrace[tag=${tag} frame=${g._ff_last_input_frame ?? -1}`
            + ` moves=${g.moves | 0} multi=${g.multi | 0}`
            + ` run=${g.context?.run | 0} mv=${g.context?.mv ? 1 : 0}`
            + ` move=${g.context?.move ? 1 : 0} dx=${g.u?.dx | 0} dy=${g.u?.dy | 0}`
            + ` ux=${g.u?.ux | 0} uy=${g.u?.uy | 0}${fields ? ` ${fields}` : ''}]`);
    }
}

// C ref: hack.c — check if a cell blocks movement
/* C ref: hack.c:1056-1068 — the mention_walls description of a square the hero
 * just bumped into:
 *     glyph = back_to_glyph(x, y);
 *     sym = glyph_is_cmap(glyph) ? glyph_to_cmap(glyph) : -1;
 *     if (sym == S_stone) Strcpy(buf, "solid stone");
 *     else if (sym >= 0)  Strcpy(buf, an(defsyms[sym].explanation));
 * defsym.h's PCHAR2 `desc` column (the one drawing.c compiles into
 * defsyms[].explanation) is the SHORT name, so every VWALL..TRWALL variant
 * reads "wall", not "vertical wall".  back_to_glyph (display.c:2354-2372)
 * resolves SCORR — and any wall or SDOOR the hero has not seen (`!seenv`) —
 * to S_stone, which hack.c then spells "solid stone" rather than running it
 * through an(). */
function _blocked_background_desc(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return 'solid stone';
    const typ = loc.typ | 0;
    if (typ === STONE || typ === SCORR) {
        /* display.c:2296 — idx = arboreal ? S_tree : S_stone */
        return game.level?.flags?.arboreal ? an('tree') : 'solid stone';
    }
    if (typ === SDOOR && loc.candig)  /* arboreal_sdoor, display.c:2305 */
        return an('tree');
    if (IS_WALL(typ) || typ === SDOOR)
        return wall_angle_is_stone(loc) ? 'solid stone' : an('wall');
    if (typ === TREE)
        return an('tree');
    if (typ === IRONBARS)
        return an('iron bars');
    if (typ === DBWALL)
        return an('wall');
    /* C hack.c:1067's non-cmap diagnostic is unreachable here: display.c's
     * back_to_glyph only bypasses cmap_to_glyph for ALTAR, never an obstacle. */
    return 'solid stone';
}

function blocksMove(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return true;
    if (IS_OBSTRUCTED(loc.typ) || loc.typ === IRONBARS) {
        /* C hack.c:1012 — Passes_walls && may_passwall: not blocked. */
        if (_uprop_active('PASSES_WALLS') && may_passwall(x, y))
            return false;
        /* C hack.c:1023-1035 — IRONBARS: !(Passes_walls || passes_bars(youmonst.data))
         * blocks; a polyformed hero (vortex, amorphous, unsolid, ...) passes.
         * The Underwater arm (hack.c:1019) precedes it and always blocks. */
        if (loc.typ === IRONBARS && !_Underwater()
            && (_uprop_active('PASSES_WALLS') || _passes_bars_hero()))
            return false;
        return true;
    }
    /* C ref: hack.c:1075-1077 — a closed door blocks unless Passes_walls
     * (the `if (Passes_walls)` arm of test_move, which does nothing). */
    if (loc.typ === DOOR && (loc.doormask & (D_CLOSED | D_LOCKED))
        && !_uprop_active('PASSES_WALLS') && !can_ooze(_hero_youmonst()))
        return true;
    return false;
}

// C ref: hack.c:3978 doorless_door(x, y) — TRUE for a doorway that has no door
// hung in it (only D_NODOOR / D_BROKEN), so diagonal access is allowed.  On the
// rogue level all doors are doorless but diagonal access is disallowed, so they
// are treated as if a door were present (return FALSE).  A door with any of
// D_ISOPEN/D_CLOSED/D_LOCKED set is a real (non-doorless) door → FALSE.
export function doorless_door(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev || !IS_DOOR(lev.typ))
        return false;
    /* C hack.c:3987 — all rogue-level doors disallow diagonal access. */
    if (Is_rogue_level(game.u?.uz))
        return false;
    /* C hack.c:3989 — !(doormask & ~(D_NODOOR | D_BROKEN)). */
    return !((lev.doormask | 0) & ~(D_NODOOR | D_BROKEN));
}

// C ref: timeout.c spot_time_left(coordxy,coordxy,short) — not yet ported.
function spot_checks_spot_time_left(x, y, func_index) { return spot_time_left(x, y, func_index); }

// C ref: timeout.c spot_stop_timers(coordxy,coordxy,short) — not yet ported.
function spot_checks_spot_stop_timers(x, y, func_index) { return spot_stop_timers(x, y, func_index); }

// C ref: hack.c obj_ice_effects(coordxy,coordxy,boolean) — not yet ported.
function spot_checks_obj_ice_effects(x, y, do_buried) { return obj_ice_effects(x, y, do_buried); }

// C ref: hack.c:4488-4512 spot_checks(coordxy x, coordxy y, schar old_typ).
export function spot_checks(x, y, old_typ) {
    const loc = _levlAt(x, y);
    const new_typ = loc.typ | 0;
    let db_ice_now = false;

    switch (old_typ) {
    case DRAWBRIDGE_UP:
        db_ice_now = ((loc.drawbridgemask | 0) & DB_UNDER) === DB_ICE;
        /* falls through */
    case ICE:
        if ((new_typ !== old_typ)
            || (old_typ === DRAWBRIDGE_UP && !db_ice_now)) {
            if (spot_checks_spot_time_left(x, y, MELT_ICE_AWAY)) {
                spot_checks_spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
            spot_checks_obj_ice_effects(x, y, false);
        }
        break;
    }
}

/* C ref: hack.c:914 may_passwall(coordxy x, coordxy y) — returns true iff
 * the location at (x, y) is passable through (not a stone wall or a
 * non-passable wall). A stone wall is never passable. A wall is passable
 * only if it is NOT marked with the W_NONPASSWALL flag.  In C, returns
 * (boolean) which is a typedef for unsigned char, so we return a true boolean. */
export function may_passwall(x, y) {
    const g = game;
    const lev = g.level.at(x, y);
    return !(IS_STWALL(lev.typ) && (lev.wall_info & W_NONPASSWALL));
}

/* C ref: hack.c:921 bad_rock(mdat,x,y) — returns true if location is obstructed
 * by a boulder that can't be moved (Sokoban) or by terrain impassable to mdat. */
export function bad_rock(mdat, x, y) {
    // Sokoban check — C macro Sokoban → svl.level.flags.sokoban_rules
    const sokoban = !!(game.level?.flags?.sokoban_rules ?? game.sokoban);
    if (sokoban && sobj_at(BOULDER_OTYP, x, y)) return true;

    const loc = game.level?.at(x, y);
    const typ = loc ? (loc.typ | 0) : STONE;
    if (!IS_OBSTRUCTED(typ)) return false;

    const mf1 = mdat ? (mdat.mflags1 | 0) : 0;
    const tunnels_val = (mf1 & 0x20) !== 0;   // M1_TUNNEL
    const needspick_val = (mf1 & 0x40) !== 0;  // M1_NEEDPICK
    const passes_walls_val = (mf1 & 0x08) !== 0; // M1_WALLWALK

    if ((!tunnels_val || needspick_val || !may_dig(x, y))
        && !(passes_walls_val && may_passwall(x, y))) {
        return true;
    }
    return false;
}

export function cant_squeeze_thru(mon) {
    const ptr = mon.data;
    const is_hero = (mon === game.youmonst);
    const mf1 = (ptr.mflags1 | 0);
    const mlet = (ptr.mlet | 0);
    const msize = (ptr.msize | 0);
    const pmidx = (ptr.pmidx | 0);

    if (is_hero ? _uprop_active('PASSES_WALLS') : ((mf1 & 0x08) !== 0))
        return 0;

    /* too big? */
    /* C mondata.h:12 bigmonst(ptr) = (ptr->msize >= MZ_LARGE); monflag.h:181
     * MZ_LARGE = 3.  (This used to test >= 4, i.e. MZ_HUGE, letting every
     * MZ_LARGE monster squeeze through a tight diagonal that C refuses.) */
    const big = (msize >= 3);                             /* MZ_LARGE */
    const amorphous   = (mf1 & 0x04) !== 0;                /* M1_AMORPHOUS */
    const whirly      = (mlet === S_VORTEX || pmidx === PM_AIR_ELEMENTAL); /* mondata.h:58 */
    const noncorporeal = (mlet === S_GHOST);
    const slithy      = (mf1 & 0x00080000) !== 0;          /* M1_SLITHY */
    if (big && !(amorphous || whirly || noncorporeal || slithy || can_fog(mon)))
        return 1;

    /* lugging too much junk? */
    let amt;
    if (is_hero) {
        amt = inv_weight() + weight_cap();
    } else {
        /* Inline curr_mon_load — use owt to avoid globby access */
        amt = 0;
        for (let obj = mon.minvent; obj; obj = obj.nobj) {
            if (obj.otyp !== BOULDER || !flooreffects_throws_rocks(ptr))
                amt += (obj.owt | 0); // C mon.c:1919 curr_mon_load
        }
    }
    if (amt > WT_TOOMUCH_DIAGONAL)
        return 2;

    /* Sokoban restriction applies to hero only */
    const sokoban = !!(game.level?.flags?.sokoban_rules ?? game.sokoban);
    if (is_hero && sokoban)
        return 3;

    return 0;
}

export function u_maybe_impaired() {
    const up = game.u?.uprops;
    const Stunned = (up?.[STUNNED]?.intrinsic) | 0;
    const Confusion = (up?.[CONFUSION]?.intrinsic) | 0;
    return !!(Stunned || (Confusion && !rn2(5)));
}

/* C hack.c:2342 air_turbulence() — does the plane of air disturb movement? */
async function air_turbulence() {
    if (Is_airlevel(game.u.uz) && rn2(4) && !_Levitation() && !_Flying()) {
        switch (rn2(3)) {
        case 0:
            await pline('You tumble in place.');
            exercise(A_DEX, false);
            break;
        case 1:
            await You_cant('control your movements very well.');
            break;
        case 2:
            await pline("It's hard to walk in thin air.");
            exercise(A_DEX, true);
            break;
        }
        return true;
    }
    return false;
}

function impaired_movement(dx, dy) {
    const u = game.u;
    if (!u_maybe_impaired())
        return { blocked: false, dx, dy };
    let tries = 0;
    let x, y;
    do {
        if (tries++ > 50) {
            nomul(0);
            return { blocked: true, dx: u.dx | 0, dy: u.dy | 0 };
        }
        confdir(true);
        x = u.ux + u.dx;
        y = u.uy + u.dy;
    } while (!isok(x, y) || bad_rock(game.youmonst?.data, x, y));
    return { blocked: false, dx: u.dx | 0, dy: u.dy | 0 };
}

/* C hack.c:2365 water_turbulence(): does water disturb the movement?
 * Returns {done, dx, dy}; the new direction is also left in u.dx/u.dy. */
async function water_turbulence(dx, dy) {
    const u = game.u;
    if (u.uinwater) {
        u.dx = dx | 0;
        u.dy = dy | 0;
        const wtmod = pooleffects_Swimming() ? MOD_ENCUMBER : SLT_ENCUMBER;
        await water_friction();
        if (!u.dx && !u.dy) {
            nomul(0);
            return { done: true, dx: 0, dy: 0 };
        }
        const x = u.ux + u.dx, y = u.uy + u.dy;
        let wtcap;
        if (isok(x, y) && !is_pool(x, y) && !Is_waterlevel(u.uz)
            && (wtcap = near_capacity()) > wtmod) {
            await pline("You are carrying too much to climb out of the water.");
            nomul(0);
            return { done: true, dx: u.dx | 0, dy: u.dy | 0 };
        }
        return { done: false, dx: u.dx | 0, dy: u.dy | 0 };
    }
    return { done: false, dx, dy };
}

/* C hack.c:2400 slippery_ice_fumbling().  Ice does not move the hero on the
 * current turn; it arms the FROMOUTSIDE fumbling bit so slip_or_trip() runs on
 * the next turn.  Keep the draw before impaired_movement(), exactly where C
 * places it in domove_core. */
function slippery_ice_fumbling() {
    const u = game.u || {};
    if (!u.uprops)
        u.uprops = {};
    const p = u.uprops[_PROPIDS.FUMBLING]
        || (u.uprops[_PROPIDS.FUMBLING] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
    const onIce = !_Levitation() && _is_ice(u.ux | 0, u.uy | 0);
    const steed = u.usteed;
    const data = steed?.data || _hero_youmonst().data;
    /* resists_cold(iceskater) is a suppressor (hack.c:2403), unlike the
     * Cold_resistance in the rn2 denominator, which is the hero's. */
    const coldRes = Resists_Elem(steed || _hero_youmonst(), COLD_RES);
    const heroColdRes = _Cold_resistance();
    const flyer = _Flying(); // C hack.c:2403 includes the rider's Flying.
    const floater = _st_is_floater(data);
    const clinger = _pe_is_clinger(data);
    const whirly = flooreffects_is_whirly(data);
    const snowBoots = !!u.uarmf && _objdescr_is(u.uarmf, "snow boots");
    if (onIce && !snowBoots && !coldRes && !flyer && !floater && !clinger && !whirly) {
        /* hack.c:2407: Cold_resistance (hero's) only changes the denominator. */
        if (!rn2(heroColdRes ? 3 : 2)) {
            p.intrinsic = ((p.intrinsic | 0) & ~TIMEOUT) | FROMOUTSIDE | 1;
        }
    } else if ((p.intrinsic | 0) & FROMOUTSIDE) {
        p.intrinsic = (p.intrinsic | 0) & ~FROMOUTSIDE;
    }
}

/* C hack.c:2648-2710 escape_from_sticky_mon().  A hero who is held by a
 * monster cannot simply walk away: this check runs after the movement
 * direction has been resolved and before m_at()/attack dispatch.  The
 * rn2(8)/rn2(40) choice is therefore part of the movement stream, even when
 * the holder remains in place. */
export async function escape_from_sticky_mon(x, y) {
    const u = game.u || {};
    const holder = u.ustuck;
    if (!holder || ((x | 0) === (holder.mx | 0) && (y | 0) === (holder.my | 0)))
        return false;

    /* C m_next2u(): a holder that is no longer adjacent has fled, teleported,
     * or otherwise released the hero. */
    const adjacent = Math.max(Math.abs((holder.mx | 0) - (u.ux | 0)),
                              Math.abs((holder.my | 0) - (u.uy | 0))) <= 1;
    if (!adjacent) {
        set_ustuck(null);
        return false;
    }

    /* When polymorphed into a sticking form, u.ustuck points at the monster
     * held by the hero rather than the monster holding the hero. */
    if (sticks(game.youmonst?.data)) {
        set_ustuck(null);
        await pline(`You release ${y_monnam(holder)}.`);
        return false;
    }

    /* A tame, non-conflicting holder is always released.  The random check is
     * skipped in that case, matching C's switch fall-through. */
    const asleep = !(holder.mcanmove | 0);
    const roll = holder.mcanmove ? rn2(40) : rn2(8);
    if (roll === 3 && asleep) {
        holder.mfrozen = 1;
        holder.msleeping = 0;
    }
    const escape = roll <= 2 || (!((game.u?.uprops?.[CONFLICT]?.intrinsic | 0)
                                   || (game.u?.uprops?.[CONFLICT]?.extrinsic | 0))
                                && !(holder.mconf | 0) && (holder.mtame | 0));
    if (escape) {
        set_ustuck(null);
        await pline(`You pull free from ${y_monnam(holder)}.`);
        return false;
    }
    await pline(`You cannot escape from ${y_monnam(holder)}!`);
    nomul(0);
    return true;
}

export async function set_uinwater(in_out) {
    const u = game.u;
    if ((in_out ? 1 : 0) !== (u.uinwater | 0)) {
        u.uinwater = in_out ? 1 : 0;
        await switch_terrain();             /* C hack.c:3220-3226 */
    }
}

/* C ref: hack.c:1695 u_rooted() — check if rooted (mmove == 0).
 * If rooted, display message and call nomul(0). Returns true if rooted. */
export function u_rooted() {
    const g = game;
    const ym = _hero_youmonst();
    if (!ym.data.mmove) {
        You("are rooted %s.",
            _Levitation() || Is_airlevel(g.u.uz) || Is_waterlevel(g.u.uz)
                ? "in place"
                : "to the ground");
        nomul(0);
        return true;
    }
    return false;
}

/* was `return 'the ' + x` — missing both the "already has 'the '" and the
 * "proper name, no article" C arms.  Same class as the money_cnt/hliquid
 * re-points above.  Real body: js/objnam.js:1852 the(str) (C: objnam.c:2169
 * the()), sync, no RNG. Already imported into this file as `_the_objnam`
 * (see line ~203) for other call sites, so this just repoints to the
 * existing binding rather than adding a new import. Note: within dosit()
 * itself the two `the(xname(obj))` call sites use the file's OTHER,
 * independently-correct `_the_str()` helper (line ~17231, same C logic),
 * so this repoint's live callers are invocation_message() (line ~39631)
 * and any future dosit call site that reaches for `_the` by name. */
function _the(x) { return _the_objnam(x); }

async function _pickup_menu(atTile, count = 0) {
    // C pickup.c:765-776: a count chooses PICK_ONE; otherwise use PICK_ANY.
    const g = game;
    /* C: flags.inv_order display order (options.c:136 def_inv_order) and the
     * class heading names (invent.c:4790 names[], indexed by oclass). */
    const INV_ORDER = [12, 5, 2, 3, 7, 9, 10, 8, 4, 11, 6, 13, 14, 15, 16];
    const CLASS_NAME = {
        1: 'Illegal objects', 2: 'Weapons', 3: 'Armor', 4: 'Rings',
        5: 'Amulets', 6: 'Tools', 7: 'Comestibles', 8: 'Potions',
        9: 'Scrolls', 10: 'Spellbooks', 11: 'Wands', 12: 'Coins',
        13: 'Gems/Stones', 14: 'Boulders/Statues', 15: 'Iron balls',
        16: 'Chains',
    };
    /* C pickup.c:1079-1084: pickup has no USE_INVLET, so only loot/full
     * enables SORTLOOT_LOOT.  options.c:7208 defaults an unset option to loot.
     * Without it, invent.c:479 retains subclass/discovery sorting but skips
     * name/BUCX sorting and breaks ties by the original nexthere order. */
    const sortloot = g.flags.sortloot ?? 'l';
    const loot = sortloot === 'f' || sortloot === 'l';
    /* C pickup.c:1111-1117 (FEEL_COCKATRICE, set only for the uncounted
     * "Pick up what?" query, :774): a corpse the hero will feel stops the menu
     * before anything is painted and falls back to look_here(0, NOFLAGS). */
    if (!count && atTile.some(o => (o.otyp | 0) === 265 /* CORPSE */
                                   && will_feel_cockatrice(o, false))) {
        await _dolook();
        return null;
    }
    const lettered = []; /* {letter(code), obj, selected} */
    const classOrder = []; /* classes present, in inv_order */
    for (const oc of (game.flags?.inv_order || INV_ORDER))
        if (atTile.some(o => (o.oclass | 0) === oc)) classOrder.push(oc);
    /* any class not in inv_order (shouldn't occur here) appended last */
    for (const o of atTile) {
        const oc = o.oclass | 0;
        if (!classOrder.includes(oc)) classOrder.push(oc);
    }
    let letterCode = 97; /* 'a' */
    let first = true;
    /* C wintty.c tty_end_menu: pages break every 23 mlist entries (title and
     * blank row included, headings too) and the accelerator letter restarts
     * at 'a' at each page start; a letter wraps 'z' -> 'A'. */
    let mrow = 2;
    /* C pickup.c:1068,1131-1138: class headings (let_to_name) are printed only
     * when INVORDER_SORT is set, which pickup() ORs in only with
     * flags.sortpack (pickup.c:773).  With !sortpack the menu is one flat
     * run in sortloot() order: SORTLOOT_LOOT (def_srt_order class rank, then
     * subclass/name) when sortloot is f/l, else the nexthere chain order. */
    const flatMenu = g.flags.sortpack === false;
    const DEF_SRT = [12, 5, 4, 11, 8, 9, 10, 13, 7, 6, 2, 3, 14, 15, 16];
    const menuGroups = flatMenu
        ? [{ oc: null, list: loot
            ? (() => {
                const rank = (o) => { const i = DEF_SRT.indexOf(o.oclass | 0);
                    return i < 0 ? DEF_SRT.length + 1 : i; };
                const out = [];
                for (const r of [...new Set(atTile.map(rank))].sort((x, y) => x - y)) {
                    const cls = atTile.filter(o => rank(o) === r);
                    out.push(..._sortloot_within_class(cls, cls[0].oclass | 0, loot));
                }
                return out;
            })()
            : atTile.slice() }]
        : classOrder.map(oc => ({ oc, list: _sortloot_within_class(atTile, oc, loot) }));
    for (const { oc, list } of menuGroups) {
        if (!flatMenu) {
        if (mrow % 23 === 0) letterCode = 97;
        mrow++; /* class heading row */
        }
        for (const o of list) {
            /* C pickup.c:1131 evaluates each menu item's glyph once, even
             * though tty does not paint it. Hallucination uses display RNG. */
            obj_to_glyph(o);
            if (mrow % 23 === 0) letterCode = 97;
            let acc;
            if (first && (o.oclass | 0) === OCLASS_COIN) {
                acc = 36; /* '$' — no letter consumed (add_menu) */
            } else {
                acc = letterCode;
                letterCode = (letterCode === 122) ? 65 : letterCode + 1;
            }
            lettered.push({ letter: acc, obj: o, selected: false,
                            page: Math.trunc(mrow / 23) });
            mrow++;
            first = false;
        }
    }
    /* C pickup.c:1141 add_menu(..., doname_with_price(curr), ...) — one namer, used both
     * by the page paint and by the "%c - %s" string tty_add_menu STORES, which
     * is what MENU_SEARCH's pmatchi() matches against (wintty.c:1714). */
    /* The name is computed ONCE per entry (add_menu stores the string); a
     * repaint must not re-run doname, whose currency() draws rn2 while
     * Hallucination (invent.c:1550). */
    const _pickup_nameOf = async (it) => it.nameStr ??= await _doname_with_price(it.obj);
    /* C wintty.c:1466-1470 — a page-entry paint marks a selected count==-1
     * entry '*', while set_item_state's in-place rewrite (wintty.c:1175)
     * marks it '+'; '#' is a typed count, '-' unselected.  This renderer
     * repaints per key, so each entry carries its last-painted indicator. */
    const _indInPlace = (e) => e.selected ? ((e.count | 0) > 0 ? '#' : '+') : '-';
    const _indFresh = (e) => e.selected ? ((e.count | 0) > 0 ? '#' : '*') : '-';
    /* Render helper: the menu window lines with current selection state. */
    async function renderLines() {
        const out = [];
        out.push(menu_heading_text(count ? `Pick ${count} of what?` : 'Pick up what?'));
        out.push('');
        for (const oc of (flatMenu ? [null] : classOrder)) {
            if (!flatMenu) out.push(menu_heading_text(CLASS_NAME[oc] ?? 'Items'));
            for (const it of lettered) {
                if (!flatMenu && (it.obj.oclass | 0) !== oc) continue; /* already in menu order */
                // C windows.c:1803-1805 applies MENUCOLOR to the description;
                // wintty.c:1442-1447 leaves the selector and indicator unstyled.
                out.push(`${String.fromCharCode(it.letter)} ${it.ind ?? _indInPlace(it)} ${menucolor_text(await _pickup_nameOf(it))}`);
            }
        }
        out.push('(end)');
        return out;
    }
    const initial = await renderLines();
    /* C wintty.c:1908-1938: clamp offx at zero; an offx-zero menu clears
     * the screen just like a tall menu or one with menu_overlay disabled.
     * tty_end_menu:2728-2732 also clips overlong entries to cols - 2. */
    const cornerCol = tty_window_offx(initial, 'end');
    const fullScreen = initial.length >= TTY_MENU_ROWS || cornerCol === 1
        || g.iflags?.menu_overlay === false || g.iflags?.menu_overlay === 0;
    const WIN_COL = fullScreen ? 1 : cornerCol;
    const uac = g.u?.uac ?? 0;
    const endRow = initial.length - 1;
    const endCursorCol = WIN_COL + '(end)'.length + 1;
    /* C wintty.c tty_end_menu: a menu taller than the terminal paginates at 23
     * content rows with a "(N of M)" footer; bare selectors act on the
     * visible page only. */
    const tall = initial.length > 24;
    const pageCount = tall ? Math.ceil((initial.length - 1) / 23) : 1;
    let page = 0;
    let pageFresh = true;
    const pageFooter = () => `(${page + 1} of ${pageCount})`;
    let cancelled = false;
    let _pickCount = 0;
    /* C ref: getline.c:213 — a MENU_SEARCH's tty_getlin ends with
     * clear_nhwindow(WIN_MESSAGE), blanking screen row 0 (the window's title
     * text with it) for the rest of this select_menu() call. */
    let titleErased = false;
    const frameRows = async () => {
        const lines = await renderLines();
        if (titleErased) lines[0] = '';
        if (tall) {
            const body = lines.slice(0, -1);
            const pl = [...body.slice(page * 23, page * 23 + 23), pageFooter()];
            while (pl.length < 24) pl.push('');
            return build_window_screen(pl, WIN_COL, uac, 0, undefined, fullScreen).split('\n');
        }
        return build_window_screen(lines, WIN_COL, uac, undefined, undefined, fullScreen).split('\n');
    };
    while (true) {
        /* Entering a page repaints it whole (C wintty.c:1398-1500, the
         * page_start==0 branch paints every in-view entry fresh). */
        if (pageFresh) {
            for (const e of lettered)
                if (!tall || e.page === page)
                    e.ind = _indFresh(e);
            pageFresh = false;
        }
        g._screen_output = (await frameRows()).join('\n');
        if (tall)
            set_cursor(1 + pageFooter().length,
                       Math.min(23, initial.length - 1 - page * 23));
        else
            set_cursor(endCursorCol, endRow);
        let k = await nhgetch();
        /* C wintty.c:1553-1561 — an accelerator of a current-page entry
         * (resp[0..resp_len)) is an explicit choice, never remapped; every
         * other key goes through map_menu_cmd, so a custom menu command key
         * (menu_next_page:; …) drives the arm of its default alias.  Mapped
         * keys cannot be digits/letters/class chars (illegal_menu_cmd_key). */
        if (!lettered.some(e => e.letter === k && (!tall || e.page === page)))
            k = map_menu_cmd(k);
        /* C wintty.c:1604-1613: ESC while counting only stops the count. */
        if (k === 27 /* ESC */ && _pickCount > 0) { _pickCount = 0; continue; }
        if (k === 27 /* ESC */) { cancelled = true; break; }
        /* RETURN / ENTER confirms from any page; SPACE pages forward and
         * confirms on the last page (wintty.c process_menu_window). */
        if (k === 10 || k === 13) break;
        if (k === 32 || (tall && k === 0x3e /* '>' */)) {
            if (page < pageCount - 1) { page++; pageFresh = true; continue; }
            if (k === 32) break;
            continue;
        }
        if (tall && k === 0x3c /* '<' */) { if (page > 0) { page--; pageFresh = true; } continue; }
        /* C wintty.c:1637-1651: '^'/'|' also repaint only on a page change. */
        if (tall && k === 0x5e /* '^' */) { if (page > 0) { page = 0; pageFresh = true; } continue; }
        if (tall && k === 0x7c /* '|' */) { if (page < pageCount - 1) { page = pageCount - 1; pageFresh = true; } continue; }
        /* C wintty.c process_menu_window: digits build a count (a leading '0'
         * is not a count); the next item accelerator selects WITH that count,
         * shown as '#' rather than '+' (set_item_state / tty_add_menu). */
        if ((k >= 0x31 && k <= 0x39) || (k === 0x30 && _pickCount > 0)) {
            _pickCount = _pickCount * 10 + (k - 0x30);
            continue;
        }
        // C wintty.c:1352-1379,1742-1750: group accelerators invert the
        // matching entries on every page; PICK_ONE requires a unique match.
        const group = lettered.filter(e =>
            def_oc_syms_chars[e.obj.oclass] === String.fromCharCode(k));
        const distinct = group.filter(e => e.letter !== k).length;
        const hasGroup = lettered.some(e => def_oc_syms_chars[e.obj.oclass]
            && def_oc_syms_chars[e.obj.oclass] !== String.fromCharCode(e.letter));
        if (hasGroup && group.length && (distinct || k === 36)
            && (!count || distinct === 1)) {
            // C wintty.c:1247-1310: deselection clears a pending item count;
            // selection applies the typed count independently to each item.
            for (const e of group) {
                e.selected = !e.selected;
                if (!e.selected) e.count = -1;
                else if (_pickCount > 0) e.count = _pickCount;
                e.ind = _indInPlace(e); /* set_item_state writes '+' */
            }
            _pickCount = 0;
            if (count) break;
            continue;
        }
        const it = lettered.find((e) => e.letter === k && (!tall || e.page === page));
        if (it) {
            const counting = _pickCount > 0;
            if (it.selected) {
                if (counting) it.count = _pickCount;
                else { it.selected = false; it.count = -1; }
            } else {
                it.selected = true;
                it.count = counting ? _pickCount : -1;
            }
            it.ind = _indInPlace(it); /* set_item_state writes '+' */
            _pickCount = 0;
            if (count) break; // C wintty.c:1757: PICK_ONE finishes on selection.
            continue;
        }
        /* C ref: wintty.c:1519-1535 xwaitforspace(resp) — a key outside resp
         * rings the bell and is re-read inside the wait, so a live count
         * survives it. */
        if (!(k >= 0x30 && k <= 0x39) && '<>^|,\\~.-@:'.indexOf(String.fromCharCode(k)) < 0)
            continue;
        _pickCount = 0;
        if (k === 0x3a /* ':' MENU_SEARCH */) {
            /* C ref: wintty.c:1700-1730.  query_objlist opens this menu
             * PICK_ANY (pickup.c:1101), so every pmatchi() hit toggles and the
             * menu stays up.  `lettered` is already in mlist order. */
            const mlist = [];
            for (const e of lettered)
                mlist.push({
                    str: `${String.fromCharCode(e.letter)} - ${await _pickup_nameOf(e)}`, e,
                });
            const finished = await menu_search_case(
                count ? 'ONE' : 'ANY', mlist,
                frameRows,
                (curr) => {
                    curr.e.selected = !curr.e.selected;
                    curr.e.ind = _indInPlace(curr.e); /* set_item_state: '+' */
                });
            titleErased = true;
            if (finished) break;
            continue;
        }
        const MENU_SELECT_ALL = 0x2e /* '.' */, MENU_UNSELECT_ALL = 0x2d /* '-' */,
              MENU_INVERT_ALL = 0x40 /* '@' */, MENU_SELECT_PAGE = 0x2c /* ',' */,
              MENU_UNSELECT_PAGE = 0x5c /* '\\' */, MENU_INVERT_PAGE = 0x7e /* '~' */;
        if (count) continue; // PICK_ONE has no bulk selection; nothing is selected yet.
        const _onPage = (e) => !tall || e.page === page;
        if (k === MENU_SELECT_ALL || k === MENU_SELECT_PAGE) {
            for (const e of lettered)
                if (k === MENU_SELECT_ALL || _onPage(e)) { e.selected = true; e.ind = _indInPlace(e); }
            continue;
        }
        if (k === MENU_UNSELECT_ALL || k === MENU_UNSELECT_PAGE) {
            for (const e of lettered)
                if (k === MENU_UNSELECT_ALL || _onPage(e)) { e.selected = false; e.ind = _indInPlace(e); }
            continue;
        }
        if (k === MENU_INVERT_ALL || k === MENU_INVERT_PAGE) {
            for (const e of lettered)
                if (k === MENU_INVERT_ALL || _onPage(e)) { e.selected = !e.selected; e.ind = _indInPlace(e); }
            continue;
        }
        /* C tty: non-accelerator keys are ignored; the menu stays up. */
    }
    g._pending_message = '';
    /* C wintty.c:966-979: dismissing an offx-zero pickup menu redraws
     * and flushes the map. windows.c:1856-1864 keeps bot() disabled until
     * select_menu returns; the next status paint lands over that map. */
    if (fullScreen) {
        const oldBotDisabled = g._bot_disabled;
        g._bot_disabled = true;
        try {
            await docrt(false, g._screen_output);
            await flush_screen(1);
        } finally {
            g._bot_disabled = oldBotDisabled;
        }
        status_r1_menu_docrt();
        g._r1botAfterMap = g.level;
        g._r1textOver = true;
        g._statusBlankAfterDocrt = true;
    }
    await flush_screen(1);
    if (cancelled) return null;
    /* C pickup.c:1106 menu_item.count — a count typed before the accelerator
     * rides along to pickup_object(obj, count); carried here per object. */
    return lettered.filter(it => it.selected).map((it) => {
        if (it.count > 0) _pickupMenuCounts.set(it.obj, it.count);
        else _pickupMenuCounts.delete(it.obj);
        return it.obj;
    });
}

/* C pickup.c dopickup() returns ECMD_TIME when a turn was used, else ECMD_OK; rhack
 * then runs reset_cmd_vars() for the ECMD_OK case (clears a pending F prefix). */
export async function dopickup() {
    await dopickup_body();
    return game.context.move ? ECMD_TIME : ECMD_OK;
}

async function dopickup_body() {
    // C hack.c dopickup: the count limits pickup quantity, not command repeats.
    const count = game.command_count | 0; // C hack.c:3880, before resetting multi.
    game.multi = 0;
    const u = game.u;
    if (!u) { game.context.move = 0; return; }
    const ux = u.ux | 0;
    const uy = u.uy | 0;
    const lvlObjs = game.level?.levelObjects;
    /* C ref: hack.c:3794-3802 pickup_checks() uswallow arm: an empty engulfer
     * gives "You don't see anything in here to pick up." and returns 1
     * (time taken); a non-empty one is the -2 loot-the-monster path. */
    if (u.uswallow && u.ustuck && !u.ustuck.minvent) {
        if (_digests(u.ustuck.data)) {
            await pline(`You pick up ${s_suffix(mon_nam(u.ustuck))} tongue.`);
            await pline("But it's kind of slimy, so you drop it.");
        } else {
            await pline(`You don't ${_vision_Blind() ? 'feel' : 'see'} anything in here to pick up.`);
        }
        game.context.move = 1;
        return;
    }
    if (u.uswallow) {
        const info = { passed_info: -count };
        game.context.move = await loot_mon(u.ustuck, info) ? 1 : 0;
        return;
    }
    /* C ref: hack.c:3811-3831 pickup_checks() pool and lava arms, which run
     * before the empty-tile test and the reach test.  Each returns 0 (no turn). */
    const _pcFloats = _st_is_floater(game.youmonst?.data) || _pe_is_clinger(game.youmonst?.data);
    // C youprop.h:260: water walking is suppressed on the Plane of Water.
    const _pcWwalking = _uprop_active('WWALKING') && !Is_waterlevel(u.uz);
    if (_is_pool(ux, uy)) {
        if (_pcWwalking || _pcFloats || (_Flying() && !_Breathless())) {
            await pline(`You cannot dive into the ${_hliquid('water')} to pick things up.`);
            game.context.move = 0;
            return;
        } else if (!_Underwater()) {
            await You_cant(`even see the bottom, let alone pick up something.`);
            game.context.move = 0;
            return;
        }
    }
    if (_is_lava(ux, uy)) {
        if (_pcWwalking || _pcFloats || (_Flying() && !_Breathless())) {
            await You_cant('reach the bottom to pick things up.');
            game.context.move = 0;
            return;
        } else if (!_likes_lava()) {
            await pline('You would burn to a crisp trying to pick things up.');
            game.context.move = 0;
            return;
        }
    }
    if (!lvlObjs?.[ux]?.[uy]) {
        const lev = game.level?.at(ux, uy);
        const typ = lev?.typ | 0;
        let msg;
        if (typ === THRONE)
            msg = `It must weigh${lev.looted ? ' almost' : ''} a ton!`;
        else if (typ === SINK)
            msg = 'The plumbing connects it to the floor.';
        else if (typ === GRAVE)
            msg = "You don't need a gravestone.  Yet.";
        else if (typ === FOUNTAIN)
            msg = `You could drink the ${_hliquid('water')}...`;
        else if (typ === DOOR && (lev.doormask & D_ISOPEN))
            msg = "It won't come off the hinges.";
        else if (typ === ALTAR)
            msg = 'Moving the altar would be a very bad idea.';
        else if (typ === STAIRS)
            msg = 'The stairs are solidly affixed.';
        else
            msg = 'There is nothing here to pick up.';
        await pline(msg);
        await flush_screen(1);
        game.context.move = 0;
        return;
    }
    if (lvlObjs?.[ux]?.[uy]) {
        const traphere = t_at(ux, uy);
        if (!can_reach_floor(!!(traphere && is_pit(traphere.ttyp)))) {
            if (traphere && uteetering_at_seen_pit(traphere)) {
                await pline('You cannot reach the bottom of the pit.');
            } else if (u.usteed && P_SKILL(P_RIDING) < P_BASIC) {
                await rider_cant_reach();
            } else if (_vision_Blind()) {
                await pline('You cannot reach anything here.');
            } else {
                let surf = surface(ux, uy);
                if (traphere) {
                    if (traphere.ttyp === HOLE) surf = 'edge of the hole';
                    else if (traphere.ttyp === TRAPDOOR) surf = 'trap door';
                }
                await pline(`You cannot reach the ${surf}.`);
            }
            game.context.move = 0;
            return;
        }
    }
    // C pickup.c:724-731: a form with M1_NOTAKE reaches check_here(FALSE)
    // and returns without trying to lift anything or spending a turn.
    if (_hero_notake()) {
        const tried = await pickup_c(-count);
        game.context.move = tried ? 1 : 0;
        return;
    }
    // All pickup_checks refusals precede the pickup capacity snapshot.
    const _oldcap = near_capacity();
    /* C ref: pickup.c pickup() — gather the objects on the hero's tile (the
     * svl.level.objects[ux][uy] nexthere chain) and decide which to lift.  With
     * the default MENU_FULL style a manual ',' pickup calls
     * query_objlist("Pick up what?", ...) with AUTOSELECT_SINGLE|INVORDER_SORT:
     *   - 0 objects  → "nothing here" (picked===0 branch below),
     *   - 1 object   → AUTOSELECT_SINGLE lifts it with NO menu,
     *   - >=2 objects → the PICK_ANY "Pick up what?" menu (pickup.c:774); only
     *     the toggled items are lifted, in menu (inv_order) display order — that
     *     order drives the pickup_object() invlet assignment (the prinv letters).
     * RNG-free throughout (the menu reads and lift_object for non-over-weight,
     * non-coin items consume no rn2). */
    const atTile = [];
    for (let o = lvlObjs?.[ux]?.[uy] ?? null; o; o = o.nexthere) atTile.push(o);
    if (atTile.length >= 1 && !u.uswallow
        && game.flags?.menu_style === MENU_TRADITIONAL
        && !game.iflags?.menu_requested) {
        /* C hack.c:3876-3892 dopickup() → pickup(-count) → pickup.c:787-902: with
         * menustyle:traditional (and no 'm' prefix) the old-style interface runs —
         * "There are several objects here" / "What kinds of thing do you want to
         * pick up? [..]" and the per-object ynaq loop — implemented by js/pickup.js
         * pickup().  Its own pickup_object path does the lifting and encumbrance. */
        const tried = await pickup_c(-count);
        if (FF_FAITHFUL)
            game.context.move = tried ? 1 : 0;
        else
            game.context.move = 0;
        return;
    }
    if (u.uchain) {
        const _ci = atTile.indexOf(u.uchain);
        if (_ci >= 0) {
            atTile.splice(_ci, 1);
            if (atTile.length === 0) { game.context.move = 0; return; }
        }
    }
    // C pickup.c:765-772,1004-1009: n_or_more filters the counted PICK_ONE list.
    if (count && atTile.length) {
        for (let i = atTile.length - 1; i >= 0; i--)
            if ((atTile[i].quan | 0) < count) atTile.splice(i, 1);
        if (!atTile.length) { game.context.move = 0; return; }
    }
    let pickOrder;
    if (atTile.length >= 2) {
        pickOrder = (await _pickup_menu(atTile, count)) ?? [];
    } else {
        /* 0 or 1 object: AUTOSELECT_SINGLE lifts the lone item (no menu). */
        pickOrder = atTile.slice();
    }
    if (count) for (const obj of pickOrder) _pickupMenuCounts.set(obj, count);
    const picked = await _pickup_lift_list(pickOrder, _oldcap);
    /* C pickup.c:895-896 — pickup()'s tail: `if (!u.uswallow) { if (hides_under(
     * gy.youmonst.data)) (void) hideunder(&gy.youmonst); ... }`.  A polymorphed
     * hider (scorpion) re-hides on the objects it just left behind. */
    if (!game.u.uswallow) {
        const _hd = game.youmonst?.data;
        if (_hd && ((_hd.mflags1 | 0) & 0x80) !== 0)
            hideunder(game.youmonst);
    }
    if (picked === 0 && pickOrder.length > 0) {
        game.context.move = FF_FAITHFUL ? 1 : 0;
        return;
    }
    if (FF_FAITHFUL) {
        game.context.move = picked > 0 ? 1 : 0;
    } else {
        game.context.move = 0;
    }
}

// C ref: hack.c:2021-2097 — force-fight a spider web with your weapon.
async function domove_fight_web(x, y) {
    const u = game.u;
    const { uwep, uswapwep } = u;
    const trap = t_at(x, y);

    if (game.context?.forcefight && trap && trap.ttyp === WEB_TTYP && trap.tseen) {
        const wtype = uwep_skill_type();
        const wskill_minus_2 = Math.max(P_SKILL(wtype), P_UNSKILLED) - 2;
        // C draws before either artifact or weapon-suitability checks.
        const roll = rn2(uwep ? 20 : (45 - 5 * wskill_minus_2));

        if (uwep && (u_wield_art(ART_STING)
                     || (uwep.oartifact && attacks(AD_FIRE_ART, uwep)))) {
            await pline('%s %s through the web!', bare_artifactname(uwep),
                        u_wield_art(ART_STING) ? 'cuts' : 'burns');
        } else if (uwep && !is_blade(uwep)
                   && (!u.twoweap || !is_blade(uswapwep))) {
            const uwepbuf = weapon_descr(uwep);
            const scndbuf = u.twoweap ? weapon_descr(uswapwep) : '';
            const onewep = !scndbuf || uwepbuf === scndbuf;
            let uwepstr, scndstr = '';

            if (['armor', 'food', 'venom'].includes(uwepbuf.toLowerCase())) {
                uwepstr = uwepbuf;
            } else if (uwep.quan === 1 && !(u.twoweap && onewep)) {
                uwepstr = an(uwepbuf);
            } else {
                uwepstr = makeplural_objnam(uwepbuf);
            }
            if (!onewep) {
                scndstr = uswapwep.quan === 1 ? an(scndbuf)
                                             : makeplural_objnam(scndbuf);
            }
            await You_cant('cut a web with %s%s%s!', uwepstr,
                           !onewep ? ' or ' : '', !onewep ? scndstr : '');
            return true;
        } else if (roll > (acurrstr(u) - 2
                           + (uwep ? uwep.spe + wskill_minus_2 : 0))) {
            await You('%s ineffectually at some of the strands.',
                      uwep ? 'hack' : 'thrash');
            return true;
        } else {
            await You('%s through the web.', uwep ? 'cut' : 'punch');
            await use_skill(wtype, 1);
        }

        deltrap(trap);
        newsym(x, y);
        return true;
    }
    return false;
}

/* C hack.c:2310-2311 — the(defsyms[glyph_to_cmap(back_to_glyph(x, y))].explanation)
 * for a solid square.  js/ has no back_to_glyph returning a cmap index, so map
 * the terrain typ to the S_* row display.c:2294-2420 would pick and read
 * DEFSYM_EXPLANATION (drawing.c defsyms) for it. */
function _fight_terrain_explanation(typ, x, y, loc) {
    let sym;
    /* C display.c:2296 back_to_glyph: STONE/SCORR -> arboreal ? S_tree : S_stone;
     * display.c:2305 an arboreal_sdoor (candig alias) is S_tree too. */
    if (typ === STONE || typ === SCORR) sym = game.level?.flags?.arboreal ? 18 : 0;
    else if (typ === SDOOR && loc && loc.candig) sym = 18;
    /* C display.c:2372 back_to_glyph: a wall/SDOOR whose seen faces show no
     * wall (wall_angle() == S_stone) names "stone". */
    else if (typ === DBWALL) sym = loc?.horizontal ? 45 : 44;
    else if ((typ === SDOOR || IS_WALL(typ)) && loc && wall_angle_is_stone(loc)) sym = 0;
    else if (typ === SDOOR) sym = 1;                        // S_vwall/S_hwall -> "wall"
    else if (IS_WALL(typ)) sym = 1;                         // S_vwall..S_trwall -> "wall"
    else if (typ === TREE) sym = 18;                        // S_tree
    else if (typ === IRONBARS) sym = 17;                    // S_bars
    else if (typ === POOL || typ === MOAT || typ === WATER) sym = 38; // S_pool / S_water
    else if (typ === LAVAPOOL) sym = 40;                    // S_lava
    else if (typ === LAVAWALL) sym = 41;                    // S_lavawall
    else if (typ === FOUNTAIN) sym = 37;                    // S_fountain
    else if (typ === SINK) sym = 36;                        // S_sink
    else if (typ === THRONE) sym = 35;                      // S_throne
    else if (typ === GRAVE) sym = 34;                       // S_grave
    else if (typ === ALTAR) sym = 33;                       // S_altar
    else if (typ === DRAWBRIDGE_UP) { // display.c:2404-2421: name what's underneath
        sym = ({ [DB_MOAT]: 38, [DB_LAVA]: 40, [DB_ICE]: 39 })[(loc?.drawbridgemask | 0) & DB_UNDER] ?? 19;
    }
    else if (typ === STAIRS || typ === LADDER) {
        const sw = stairway_at(x, y);
        const up = !!(sw && sw.up);
        /* C display.c:2346 back_to_glyph: S_br* only when known_branch_stairs(),
         * i.e. a branch AND u_traversed (stairs.c:180). */
        const br = !!(sw && sw.tolev && (sw.tolev.dnum | 0) !== ((game.u.uz && game.u.uz.dnum) | 0) && sw.u_traversed);
        sym = (typ === STAIRS ? 25 : 27) + (up ? 0 : 1) + (br ? 4 : 0);
    } else if (typ === DOOR) sym = 15;                      // closed door
    else return 'an unknown obstacle';
    return the(DEFSYM_EXPLANATION[sym]);
}

async function domove_fight_empty(x, y, dx, dy) {
    const u = game.u;
    const unknown_obstacle = 'an unknown obstacle';
    const off_edge = !isok(x, y);
    // C hack.c:2240 — off-edge force-fight clamps to <0,1> for array safety; we
    // only need the off_edge boolean since we don't index a real tile when off-edge.
    const loc = !off_edge ? game.level?.at(x, y) : null;
    const typ = loc ? (loc.typ | 0) : STONE;
    const explo = !!(Upolyd(u) && attacktype(game.youmonst?.data, 13 /* AT_EXPL */));
    // C hack.c:2252-2253 — solid = off_edge || !accessible || IS_FURNITURE.
    /* C hack.c:2252 calls accessible(x,y), not the terrain-only ACCESSIBLE
     * macro.  accessible() excludes a closed or locked door, so a force-fight
     * into one is described as a solid obstacle instead of "thin air". */
    const solid = off_edge || (!accessible(x, y) || IS_FURNITURE(typ));
    // C hack.c:2260-2262 — boulder = sobj_at(BOULDER, x, y).  This was the
    // but it is the call C makes, so make it.
    //
    // C hack.c:2266-2268 tests glyph_at(), not hero memory or any object
    // glyph: another object atop a statue hides it from the attack.
    //
    const underwater = Underwater(); // C hack.c:2260,2292
    // C hack.c:2233,2273: use the displayed glyph, including hallucinations.
    const glyph = !off_edge ? _glyph_at(x, y) : null;
    const monsterGlyph = glyph?.cls === GLYPHCLS_MON && !glyph_is_warning_at(x, y);
    let boulder = !off_edge && !underwater ? sobj_at(BOULDER, x, y) : null;
    if (!off_edge && !underwater) {
        if ((glyph?.cls === GLYPHCLS_OBJ && glyph.otyp === STATUE_OTYP)
            || (_cmd_Hallucination() && monsterGlyph))
            boulder = sobj_at(STATUE_OTYP, x, y);
    }
    /* C hack.c:2270-2277 — force fight at boulder/statue or wall/door while
     * wielding a pick/axe starts digging. */
    if (!off_edge && !underwater && game.context?.forcefight && u.uwep
        && dig_typ(u.uwep, x, y) !== 0 /* DIGTYP_UNDIGGABLE */
        && glyph?.cls !== GLYPHCLS_INVIS && !monsterGlyph) {
        /* a command-started dig: movemon runs before the first dig() (not autodig order) */
        game._digFromApply = true;
        await use_pick_axe2(u.uwep);
        if (!game.occupation) game._digFromApply = false;
        return true;
    }
    // C hack.c:2280-2286 — the square is about to become known empty:
    //   unmap_object(x, y);
    //   if (boulder) map_object(boulder, TRUE);
    //   newsym(x, y);
    // All three were dropped.  This is the live half of this call site: the
    // every one of them, clearing any remembered 'I' and re-deriving the cell.
    if (!off_edge) {
        unmap_object(x, y);
        if (boulder)
            map_object(boulder, true);
        newsym(x, y);
    }
    let buf;
    if (off_edge) {
        // C hack.c:2256-2260 — treat off-edge as solid rock (unknown_obstacle).
        buf = unknown_obstacle;
    } else if (boulder) {
        // C hack.c:2290-2291 — Strcpy(buf, ansimpleoname(boulder)).
        buf = _ansimpleoname(boulder);
    } else if (underwater && !is_pool(x, y)) {
        buf = Is_waterlevel(u.uz) && typ === AIR ? 'an air bubble' : 'nothing';
    } else if (solid) {
        // C hack.c:2302-2314 — name the obstacle.  The seenv/IS_STWALL/SDOOR/SCORR
        // defsyms[].explanation for every wall glyph is the short form "wall"
        // (include/defsym.h PCHAR2 desc column), so the(...) yields "the wall".
        const seenv = loc ? (loc.seenv | 0) : 0;
        if (seenv || IS_STWALL(typ) || typ === SDOOR || typ === SCORR) {
            buf = _fight_terrain_explanation(typ, x, y, loc);
        } else {
            buf = unknown_obstacle;
        }
    } else {
        // C hack.c:2318-2319 — accessible non-furniture target: "thin air".
        buf = 'thin air';
    }
    // C hack.c:2322-2325 — You("%s%s %s.",
    //   !(boulder||solid) ? "" : !explo ? "harmlessly " : "futilely ",
    //   explo ? "explode at" : "attack", buf);
    const adv = !(boulder || solid) ? '' : (!explo ? 'harmlessly ' : 'futilely ');
    const verb = explo ? 'explode at' : 'attack';
    await pline(`You ${adv}${verb} ${buf}.`);
    // C hack.c:2327 — nomul(0).  svc.context.move is left at 1 (the turn is spent).
    nomul(0);
    if (explo) {
        /* C hack.c:2328-2338 — no monster attacked, so explum() is bypassed:
         * wake_nearto, then explum(NULL, attk), u.mh = -1, rehumanize(). */
        const attk = attacktype_fordmg(game.youmonst?.data, 13 /* AT_EXPL */, -1 /* AD_ANY */);
        wake_nearto(u.ux, u.uy, 7 * 7);
        if (attk) {
            /* C uhitm.c:4893-4927 explum(NULL, attk): d() first, unconditionally */
            const tmp = d(attk.damn | 0, attk.damd | 0);
            const adtyp = attk.adtyp | 0;
            if (adtyp === 3 /* AD_COLD */ || adtyp === 2 /* AD_FIRE */ || adtyp === 6 /* AD_ELEC */) {
                await explode(u.ux, u.uy, (adtyp - 1) + 20, tmp, MON_EXPLODE_CMD,
                    adtyp === 2 ? EXPL_FIERY : adtyp === 3 ? EXPL_FROSTY : EXPL_MAGICAL);
            }
            wake_nearto(u.ux, u.uy, 7 * 7);
        }
        u.mh = -1; /* dead in the current form */
        await rehumanize_real();
    }
    // C ref: tty topline persistence — keep the message on the topline through the
    // next nhgetch, mirroring the do_attack _resultMessage handling above.
    if (game._pending_message) {
        game._resultMessage = game._pending_message;
        /* In a run/rush continuation the loop's _run_commit_result folds
         * _resultMessage onto the live _pending_message; leaving the text in both
         * prints it twice ("You attack thin air.  You attack thin air."), where C
         * has one gt.toplines.  Hand the line over to the result channel. */
        game._pending_message = '';
    }
    return true;
}

const MON_EXPLODE_CMD = 20; /* const.js MON_EXPLODE (MAXOCLASSES + 2) */

/* C ref: mondata.c:552-563 passes_bars(mptr), for gy.youmonst.data.
 *     passes_walls || amorphous || unsolid || is_whirly || verysmall
 *     || dmgtype(AD_RUST) || dmgtype(AD_CORR) || metallivorous
 *     || (slithy && !bigmonst)
 * Read only by test_move's IRONBARS arm.  monflag.h bit values are the ones
 * js/monmove.js already resolved for _passes_bars_mv; msize/mlet come off the
 * same permonst row.  The two dmgtype() terms need the attack table, which
 * makemon.js indexes by pmidx — the hero's permonst carries pmidx, so they are
 * evaluated exactly as C does rather than dropped. */
function _passes_bars_hero() {
    const ym = _hero_youmonst().data || {};
    const mf1 = (ym.mflags1 | 0) >>> 0;
    const M1_AMORPHOUS = 0x00000004, M1_WALLWALK = 0x00000008,
          M1_SLITHY = 0x00080000, M1_UNSOLID = 0x00100000,
          M1_METALLIVORE = 0x80000000;
    const MZ_SMALL = 1, MZ_LARGE = 3;
    const S_VORTEX = 22;             /* mondata.h mlet S_VORTEX → is_whirly */
    const msize = ym.msize | 0;
    if (mf1 & (M1_WALLWALK | M1_AMORPHOUS | M1_UNSOLID))
        return true;
    if ((ym.mlet | 0) === S_VORTEX)
        return true;
    if (msize < MZ_SMALL)
        return true;
    if (mf1 & M1_METALLIVORE)
        return true;
    if ((mf1 & M1_SLITHY) && msize < MZ_LARGE)
        return true;
    const shim = { pmidx: (ym.pmidx ?? (game.u?.umonnum | 0)) | 0 };
    return !!(dmgtype(shim, 24) || dmgtype(shim, 42));
}

function _sgn_travel(n) { return n < 0 ? -1 : (n > 0 ? 1 : 0); }

/* C ref: mondata.h:32-33 tunnels(ptr)/needspick(ptr) for gy.youmonst.data. */
function _hero_tunnels() { return (((_hero_youmonst().data?.mflags1) | 0) & 0x00000020) !== 0; }

function _hero_needspick() { return (((_hero_youmonst().data?.mflags1) | 0) & 0x00000040) !== 0; }

export function test_move(ux, uy, dx, dy, mode) {
    if (mode === DO_MOVE)
        throw new Error('test_move: DO_MOVE is handled inline by domove_core');
    const g = game;
    const u = g.u;
    const x = ux + dx, y = uy + dy;

    /* C hack.c:998 — svc.context.door_opened = FALSE on every entry. */
    g.context = g.context || {};
    g.context.door_opened = false;

    if (!isok(x, y))
        return false;

    const tmpr = g.level?.at(x, y);
    if (!tmpr)
        return false;
    const typ = tmpr.typ | 0;
    const Passes_walls = _uprop_active('PASSES_WALLS');
    const Underwater = _Underwater();

    /* ── C hack.c:1009-1073: physical obstacles, the square we are going to ── */
    if (IS_OBSTRUCTED(typ) || typ === IRONBARS) {
        if (Passes_walls && may_passwall(x, y)) {
            /* do nothing */
        } else if (Underwater) {
            return false;
        } else if (typ === IRONBARS) {
            if (!(Passes_walls || _passes_bars_hero()))
                return false;
        } else if (_hero_tunnels() && !_hero_needspick()) {
            /* C:1036-1040 — "Eat the rock"; the still_chewing() call is
             * DO_MOVE-only, so a predicate call falls straight through. */
        } else if (g.flags?.autodig && !(g.context.run | 0) && !(g.context.nopick | 0)
                   && u.uwep && is_pick(u.uwep)) {
            /* C:1041-1046 — autodig; use_pick_axe2 is DO_MOVE-only but the
             * FALSE return is not. */
            return false;
        } else {
            return false;
        }
    } else if (IS_DOOR(typ)) {
        /* C's control flow here is a `goto testdiag` OUT of the closed-door
         * chain INTO the open-door branch, so the two cannot be nested the way
         * they read.  Exactly two of the closed-door arms reach testdiag —
         * TEST_TRAV and TEST_TRAP through the final `else` — and the other
         * three (Passes_walls / ooze / tunnel) fall past the whole IS_DOOR
         * block without any diagonal test at all.  Hence the explicit flag. */
        let do_testdiag = false;
        if (closed_door(x, y)) {
            if (Passes_walls) {
                /* do nothing */
            } else if (can_ooze(_hero_youmonst())) {
                /* C:1078-1081 — "You ooze under the door." is DO_MOVE-only. */
            } else if (Underwater) {
                return false;
            } else if (_hero_tunnels() && !_hero_needspick()) {
                /* C:1085-1089 — eat the door; still_chewing is DO_MOVE-only. */
            } else {
                /* C:1130-1133 — in TEST_TRAV/TEST_TRAP a closed door is NOT an
                 * outright refusal: control jumps to the `testdiag` label, so
                 * travel routes THROUGH closed doors (findtravelpath charges
                 * them a radius penalty of its own instead).  Any other mode
                 * returns FALSE. */
                if (mode !== TEST_TRAV && mode !== TEST_TRAP)
                    return false;
                do_testdiag = true;
            }
        } else {
            do_testdiag = true;
        }
        if (do_testdiag) {
            /* C:1135-1145 testdiag — diagonal moves into an intact doorway. */
            if (dx && dy && !Passes_walls
                && (!doorless_door(x, y) || block_door(x, y)))
                return false;
        }
    }

    /* ── C hack.c:1148-1173: the tight diagonal ── */
    const ymdata = _hero_youmonst().data;
    if (dx && dy && bad_rock(ymdata, ux, y) && bad_rock(ymdata, x, uy)) {
        switch (cant_squeeze_thru(_hero_youmonst())) {
        case 3: case 2: case 1:
            return false;
        default:
            break; /* can squeeze through */
        }
    } else if (dx && dy && worm_cross(ux, uy, x, y)) {
        return false;
    }

    /* ── C hack.c:1174-1200: travel avoids known traps and known liquid ──
     * "Pick travel path that does not require crossing a trap.  Avoid water and
     * lava using the usual running rules.  (but not u.ux/u.uy because
     * findtravelpath walks toward u.ux/u.uy)"
     * Note the return value: TRUE for TEST_TRAP (which is asking "is there a
     * hazard here?"), FALSE for the other predicate modes. */
    if ((g.context.run | 0) === 8 && !u_at(x, y)) {
        const t = t_at(x, y);
        if (t && t.tseen && (t.ttyp | 0) !== VIBRATING_SQUARE_TRAVEL)
            return (mode === TEST_TRAP);

        if ((tmpr.seenv && is_pool_or_lava(x, y))
            && ((IS_WATERWALL(typ) || typ === LAVAWALL)
                || !(_Levitation() || _Flying()
                     || (is_pool(x, y) ? _Known_wwalking()
                         : (_Known_lwalking() && _is_lava(u.ux | 0, u.uy | 0))))))
            return (mode === TEST_TRAP);
    }

    if (mode === TEST_TRAP)
        return false; /* do not move through traps */

    /* ── C hack.c:1205-1212: can't move diagonally OUT of an intact doorway ── */
    const ust = g.level?.at(ux, uy);
    if (dx && dy && !Passes_walls && ust && IS_DOOR(ust.typ | 0)
        && (!doorless_door(ux, uy) || block_entry(x, y)))
        return false;

    /* ── C hack.c:1214-1248: boulders ── */
    const Sokoban = _bldr_Sokoban(); /* hack.c:1215: level's active rules */
    if (sobj_at(BOULDER, x, y) && (Sokoban || !Passes_walls)) {
        if (mode !== TEST_TRAV && (g.context.run | 0) >= 2
            && !(_Blind_cmd() || _cmd_Hallucination())
            && !could_move_onto_boulder(x, y, u.dx | 0, u.dy | 0))
            return false;
        if (mode === TEST_TRAV) {
            /* never travel through boulders in Sokoban */
            if (Sokoban)
                return false;
            /* don't pick two boulders in a row, unless there's a way thru */
            if (sobj_at(BOULDER, ux, uy) && !Sokoban) {
                const wand = carrying(WAN_DIGGING_TRAVEL);
                if (!Passes_walls
                    && !could_move_onto_boulder(ux, uy, u.dx | 0, u.dy | 0)
                    && !(_hero_tunnels() && !_hero_needspick())
                    && !carrying(PICK_AXE_TRAVEL) && !carrying(DWARVISH_MATTOCK_TRAVEL)
                    && !(wand && !(game._oc_name_known && game._oc_name_known[wand.otyp | 0])))
                    return false;
            }
        }
        /* assume you'll be able to push it when you get there... */
    }

    /* OK, it is a legal place to move. */
    return true;
}

const VIBRATING_SQUARE_TRAVEL = 23;

const PICK_AXE_TRAVEL = 259;

const DWARVISH_MATTOCK_TRAVEL = 71;

const WAN_DIGGING_TRAVEL = 428;

/* C ref: decl.c:81-82 dirs_ord[] = { DIR_W, DIR_N, DIR_E, DIR_S, DIR_NW,
 * DIR_NE, DIR_SE, DIR_SW } with hack.h:641-648 DIR_W=0, DIR_NW=1, DIR_N=2,
 * DIR_NE=3, DIR_E=4, DIR_SE=5, DIR_S=6, DIR_SW=7 — cardinals first.  The
 * ORDER IS LOAD-BEARING: findtravelpath's BFS keeps the FIRST direction that
 * reaches a square (`else if (!travel[nx][ny])`), so a different ordering
 * yields a different, equally-short path and the hero walks somewhere else. */
const _DIRS_ORD_TRAVEL = [0, 2, 4, 6, 1, 3, 5, 7];

export function findtravelpath(mode) {
    const g = game;
    const u = g.u;
    if (!g.gt) g.gt = {};
    if (!g.gt.travelmap)
        g.gt.travelmap = selection_new();

    /* C:1269-1288 — travel to an adjacent, reachable location uses normal
     * movement rules. */
    if ((mode === TRAVP_TRAVEL || mode === TRAVP_VALID) && (g.context.travel1 | 0)
        && _next2u(u.tx | 0, u.ty | 0)
        && crawl_destination(u.tx | 0, u.ty | 0)) {
        end_running(false);
        if (test_move(u.ux | 0, u.uy | 0, (u.tx | 0) - (u.ux | 0),
                      (u.ty | 0) - (u.uy | 0), TEST_MOVE)) {
            if (mode === TRAVP_TRAVEL) {
                u.dx = (u.tx | 0) - (u.ux | 0);
                u.dy = (u.ty | 0) - (u.uy | 0);
                nomul(0);
                g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
            }
            return true;
        }
        if (mode === TRAVP_TRAVEL)
            g.context.run = 8;
    }

    if ((u.tx | 0) !== (u.ux | 0) || (u.ty | 0) !== (u.uy | 0)) {
        /* C:1290-1297 locals.  `travel` is the per-square BFS radius matrix. */
        const travel = new Int16Array(COLNO * ROWNO);
        const travelstepx = [new Int16Array(COLNO * ROWNO), new Int16Array(COLNO * ROWNO)];
        const travelstepy = [new Int16Array(COLNO * ROWNO), new Int16Array(COLNO * ROWNO)];
        let tx, ty, ux, uy;
        let n = 1, set = 0, radius = 1, i;

        /* C:1299-1312 — when guessing (or validating) the BFS runs FROM the
         * hero TOWARD the target; when actually travelling it runs from the
         * target back to the hero. */
        if (mode === TRAVP_GUESS || mode === TRAVP_VALID) {
            tx = u.ux | 0; ty = u.uy | 0;
            ux = u.tx | 0; uy = u.ty | 0;
        } else {
            tx = u.tx | 0; ty = u.ty | 0;
            ux = u.ux | 0; uy = u.uy | 0;
        }

        /* C's `noguess:` label — the TRAVP_GUESS pass jumps back here once it
         * has picked a reachable stand-in destination. */
        noguess: for (;;) {
            travel.fill(0);
            travelstepx[0][0] = tx;
            travelstepy[0][0] = ty;
            n = 1; /* C sets n=1 at declaration and again before the re-entry */

            while (n !== 0) {
                let nn = 0;

                for (i = 0; i < n; i++) {
                    const x = travelstepx[set][i], y = travelstepy[set][i];
                    /* no diagonal movement for grid bugs */
                    const dirmax = NODIAG(u.umonnum | 0) ? 4 : N_DIRS;
                    let alreadyrepeated = false;

                    for (let dir = 0; dir < dirmax; ++dir) {
                        const nx = x + xdir[_DIRS_ORD_TRAVEL[dir]];
                        const ny = y + ydir[_DIRS_ORD_TRAVEL[dir]];

                        if (!isok(nx, ny)
                            || ((mode === TRAVP_GUESS) && !couldsee(nx, ny)))
                            continue;
                        /* C:1370-1392 — closed doors and boulders usually cause
                         * a delay, so prefer another path: re-queue <x,y> once
                         * (without touching the travel matrix) so this branch
                         * of the search falls behind by three radii. */
                        if ((!_uprop_active('PASSES_WALLS') && !can_ooze(_hero_youmonst())
                             && closed_door(x, y))
                            || (sobj_at(BOULDER, x, y)
                                && !could_move_onto_boulder(x, y, u.dx | 0, u.dy | 0))
                            || test_move(x, y, nx - x, ny - y, TEST_TRAP)) {
                            if (travel[y * COLNO + x] > radius - 3) {
                                if (!alreadyrepeated) {
                                    travelstepx[1 - set][nn] = x;
                                    travelstepy[1 - set][nn] = y;
                                    /* don't change travel matrix! */
                                    nn++;
                                    alreadyrepeated = true;
                                }
                                continue;
                            }
                        }
                        if (test_move(x, y, nx - x, ny - y, TEST_TRAV)
                            && (g.level?.at(nx, ny)?.seenv
                                || (!_Blind_cmd() && couldsee(nx, ny)))) {
                            if (nx === ux && ny === uy) {
                                if (mode === TRAVP_TRAVEL || mode === TRAVP_VALID) {
                                    const visited
                                        = selection_getpoint(x, y, g.gt.travelmap);
                                    u.dx = x - ux;
                                    u.dy = y - uy;
                                    if (mode === TRAVP_TRAVEL
                                        && (((x === (u.tx | 0)) && (y === (u.ty | 0)))
                                            || visited)) {
                                        nomul(0);
                                        /* reset run so domove run checks work */
                                        g.context.run = 8;
                                        if (visited)
                                            set__travel_unsure_pending(true);
                                        else
                                            g.iflags.travelcc.x = g.iflags.travelcc.y = 0;
                                    }
                                    selection_setpoint(u.ux | 0, u.uy | 0,
                                                       g.gt.travelmap, 1);
                                    return true;
                                }
                            } else if (!travel[ny * COLNO + nx]) {
                                travelstepx[1 - set][nn] = nx;
                                travelstepy[1 - set][nn] = ny;
                                travel[ny * COLNO + nx] = radius;
                                nn++;
                            }
                        }
                    }
                }
                show_travel_debug(travelstepx[1 - set], travelstepy[1 - set], nn, 1);
                n = nn;
                set = 1 - set;
                radius++;
            }

            /* C:1447-1513 — if guessing, find the best location in the travel
             * matrix and go there instead. */
            if (mode === TRAVP_GUESS) {
                let px = tx, py = ty; /* pick location */
                let dist, nxtdist, d2, nd2;
                let ctrav, ptrav = COLNO * ROWNO;

                dist = distmin(ux, uy, tx, ty);
                d2 = dist2(ux, uy, tx, ty);
                for (tx = 1; tx < COLNO; ++tx)
                    for (ty = 0; ty < ROWNO; ++ty)
                        if (couldsee(tx, ty) && (ctrav = travel[ty * COLNO + tx]) > 0) {
                            nxtdist = distmin(ux, uy, tx, ty);
                            if (nxtdist === dist && ctrav < ptrav) {
                                nd2 = dist2(ux, uy, tx, ty);
                                if (nd2 < d2) {
                                    /* prefer non-zigzag path */
                                    px = tx; py = ty; d2 = nd2; ptrav = ctrav;
                                }
                            } else if (nxtdist < dist) {
                                px = tx; py = ty; dist = nxtdist;
                                d2 = dist2(ux, uy, tx, ty);
                                ptrav = ctrav;
                            }
                        }

                if (u_at(px, py)) {
                    /* no guesses, just go in the general direction */
                    u.dx = _sgn_travel((u.tx | 0) - (u.ux | 0));
                    u.dy = _sgn_travel((u.ty | 0) - (u.uy | 0));
                    if (test_move(u.ux | 0, u.uy | 0, u.dx | 0, u.dy | 0, TEST_MOVE)) {
                        selection_setpoint(u.ux | 0, u.uy | 0, g.gt.travelmap, 1);
                        return true;
                    }
                    break noguess; /* C: goto found */
                }
                show_travel_debug([px], [py], 1, 2);
                tx = px; ty = py;
                ux = u.ux | 0; uy = u.uy | 0;
                set = 0;
                n = radius = 1;
                mode = TRAVP_TRAVEL;
                continue noguess;
            }
            return false;
        }
    }

    /* C's `found:` label */
    u.dx = 0;
    u.dy = 0;
    nomul(0);
    return false;
}

export async function domove(dx, dy) {
    const g = game;
    const u = g.u;
    const _ux1 = u.ux | 0, _uy1 = u.uy | 0;
    ffRunTrace('domove-enter', `argdx=${dx | 0} argdy=${dy | 0}`);
    g.gd = g.gd || {};
    /* C hack.c:2708 — gd.domove_succeeded = 0L before domove_core(). */
    g.gd.domove_succeeded = 0;
    await domove_core(dx, dy);
    /* findtravelpath's deferred You("stop, unsure which way to go.") (hack.c:1411):
     * every travel step funnels through here, not only dotravel_target's first. */
    await _flush_travel_unsure();
    /* C hack.c:2977-2979 — the hero-moved block inside domove_core.  Kept in the
     * wrapper because domove_core's many early-return paths all share the single
     * "did the hero end up somewhere else" test. */
    if ((u.ux | 0) !== _ux1 || (u.uy | 0) !== _uy1) {
        /* gd.domove_succeeded is NOT set here: C sets it only at hack.c:2966,
         * ported in domove_core's walk tail.  An early-return relocation such
         * as drag_ball's "jerked back by the iron ball" (ball.c:811-812) moves
         * the hero without it, so C's domove() does not maybe_smudge_engr. */
        /* C hack.c:2968 — `u.umoved = TRUE;`, the very next statement inside the
         * same `if (u.ux0 != u.ux || u.uy0 != u.uy)` block.  It had no writer
         * here: only the TT_LAVA edge-crawl arm below (C trap.c:5410) ever set
         * u.umoved, so an ordinary walk left it FALSE.  The reader that cares is
         * allmain.c:119 `if (u.usteed && u.umoved) moveamt = mcalcmove(u.usteed,
         * TRUE)` — the mounted hero's per-turn movement ration.  With u.umoved
         * stuck FALSE a rider would take the un-mounted branch every turn; with
         * it stuck TRUE (no reset — see js/allmain.js's `u.umoved = false` at C
         * allmain.c:513) the steed branch would fire on turns C skips, e.g. the
         * mount turn itself, which consumes no hero movement. */
        u.umoved = true;
    }
    /* C hack.c:2711-2713 */
    if (((g.gd.domove_succeeded | 0) & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0) {
        _maybe_smudge_engr(_ux1, _uy1, u.ux | 0, u.uy | 0);
        maybe_adjust_hero_bubble(); /* C hack.c:2712 */
    }
    /* C hack.c:2715 — gd.domove_attempting = 0L. */
    g.gd.domove_attempting = 0;
    g.kickedloc.x = 0;
    g.kickedloc.y = 0;
    ffRunTrace('domove-exit', `from=${_ux1},${_uy1} to=${u.ux | 0},${u.uy | 0}`);
}

/* C ref: artilist.h — artilist[0] is a dummy "" entry, artilist[7] is Sting
 * (Excalibur=1, Stormbringer=2, Mjollnir=3, Cleaver=4, Grimtooth=5, Orcrist=6,
 * Sting=7).  Matches js/objnam.js's artifact-name table comment "/* 7 *\/". */
const ART_STING = 7;

// C ref: hack.c:1550-1692 trapmove(x, y, desttrap) — while u.utrap is set (the
// hero is stuck in a trap), resolve one turn's escape attempt for the CURRENT
// trap type instead of completing the move toward (x,y).  Returns true when
// the hero is free to proceed with the ordinary move this turn (caller falls
// through to test_move); false means the turn is spent struggling in place
// consulted or decremented, so the hero silently walks free of a web trap
// C keeps it pinned to for several turns — causing the hero's position to
// desync from C's within a few keystrokes.
async function trapmove(x, y, desttrap) {
    const u = game.u;
    if (!u.utrap) return true; /* sanity check, C hack.c:1558-1559 */
    const usteed = u.usteed || null;
    const steedname = usteed ? y_monnam(usteed) : null;
    let anchored = false;
    switch (u.utraptype | 0) {
    case TT_BEARTRAP: {
        if (game.flags?.verbose) {
            const predicament = 'caught in a bear trap';
            if (usteed) _norep(`${upstart(steedname)} is ${predicament}.`);
            else _norep(`You are ${predicament}.`);
        }
        /* [why does diagonal movement give quickest escape?] */
        if ((u.dx && u.dy) || !rn2(5)) u.utrap = (u.utrap | 0) - 1;
        if (!u.utrap) {
            if (usteed) await pline(`${upstart(steedname)} finally lurches free.`);
            else await pline(`You finally wriggle free.`);
        }
        break;
    }
    case TT_PIT: {
        if (desttrap && desttrap.tseen && is_pit(desttrap.ttyp)) return true;
        /* try to escape; position stays same regardless of success */
        await climb_pit();
        break;
    }
    case TT_WEB: {
        if (u_wield_art(ART_STING)) {
            /* escape trap but don't move and don't destroy it */
            u.utrap = 0; /* caller will call reset_utrap() */
            await pline('Sting cuts through the web!');
            break;
        }
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap) {
            if (game.flags?.verbose) {
                if (usteed) _norep(`${upstart(steedname)} is stuck to the web.`);
                else _norep(`You are stuck to the web.`);
            }
        } else {
            if (usteed) await pline(`${upstart(steedname)} breaks out of the web.`);
            else await pline(`You disentangle yourself.`);
        }
        break;
    }
    case TT_LAVA: {
        if (game.flags?.verbose) {
            const predicament = 'stuck in the lava';
            if (usteed) _norep(`${upstart(steedname)} is ${predicament}.`);
            else _norep(`You are ${predicament}.`);
        }
        if (!_is_lava(x, y)) {
            u.utrap = (u.utrap | 0) - 1;
            if (((u.utrap | 0) & 0xff) === 0) {
                u.utrap = 0;
                if (usteed) await pline(`You lead ${steedname} to the edge of the ${hliquid('lava')}.`);
                else await pline(`You pull yourself to the edge of the ${hliquid('lava')}.`);
            }
        }
        u.umoved = true;
        break;
    }
    case TT_INFLOOR:
    case TT_BURIEDBALL: {
        anchored = (u.utraptype | 0) === TT_BURIEDBALL;
        if (anchored) {
            const cc = { x: u.ux, y: u.uy };
            /* can move normally within radius 1 of buried ball */
            if (buried_ball(cc) && dist2(x, y, cc.x, cc.y) <= 2) {
                if (game.flags?.verbose) _norep(`You move within the chain's reach.`);
                return true;
            }
        }
        u.utrap = (u.utrap | 0) - 1;
        if (u.utrap) {
            if (game.flags?.verbose) {
                const predicament = anchored ? 'chained to the buried ball' : `stuck in the ${surface(u.ux, u.uy)}`;
                if (usteed) _norep(anchored ? `You and ${steedname} are chained to the buried ball.` : `${upstart(steedname)} is ${predicament}.`);
                else _norep(`You are ${predicament}.`);
            }
        } else {
            if (usteed) await pline(`${upstart(steedname)} finally ${!anchored ? 'lurches' : 'wrenches the ball'} free.`);
            else await pline(`You finally ${!anchored ? 'wriggle' : 'wrench the ball'} free.`);
            if (anchored) await buried_ball_to_punishment();
        }
        break;
    }
    case 0: /* TT_NONE, hack.c:1682 */
        await trapmove_impossible('trapmove: trapped in nothing?');
        break;
    default:
        await trapmove_impossible('trapmove: stuck in unknown trap? (%d)', u.utraptype | 0);
        break;
    }
    return false;
}

async function _domove_before_leash(newx, newy) {
    const u = game.u;
    /* C ref: hack.c:2948-2954 — reset_occupations(); if running (run && run < 8)
     * and the new tile is a door, obstruction, or furniture, stop the run
     * (nomul(0)).  RNG-free.  run==1 for shift-runs, so run<8 holds. */
    reset_occupations();
    if (game.context?.run && (game.context.run | 0) < 8) {
        const tmpr = game.level?.at(newx, newy);
        if (tmpr && (IS_DOOR(tmpr.typ) || IS_OBSTRUCTED(tmpr.typ)
            || IS_FURNITURE(tmpr.typ))) {
            nomul(0);
        }
    }
    /* C ref: hack.c:2939-2941 — your tread on the ground may disturb the
     * slumber of nearby zombies. */
    if (!_Levitation() && !_Flying() && !_st_Stealth()
        && ((MONS_CWT[u.umonnum | 0] | 0) >= Math.trunc(WT_ELF / 2)))
        disturb_buried_zombies(u.ux | 0, u.uy | 0);
    /* C ref: hack.c:2943-2945 — after the zombie-disturbing check:
     *     if (hides_under(youmonst.data) || youmonst.data->mlet == S_EEL
     *         || u.dx || u.dy)
     *         (void) hideunder(&youmonst);
     */
    {
        const _yd = game.youmonst?.data;
        if (_yd && (((_yd.mflags1 | 0) & 0x80) !== 0 || (_yd.mlet | 0) === 57
                    || (u.dx | 0) || (u.dy | 0)))
            hideunder(game.youmonst);
    }
    /* C hack.c:2959-2963: moving ends object/furniture mimicry on every path. */
    if ((u.dx || u.dy) && (M_AP_TYPE(game.youmonst) === M_AP_OBJECT
                          || M_AP_TYPE(game.youmonst) === M_AP_FURNITURE))
        game.youmonst.m_ap_type = M_AP_NOTHING;
}

async function _domove_spot_tail(newx, newy) {
    const u = game.u;
    if (game._bc_move && _st_Punished()) {
        const bc = game._bc_move;
        move_bc(0, bc.control, bc.ballx, bc.bally, bc.chainx, bc.chainy);
    }
    // C hack.c:2979-2980: a failed travel path can leave the hero in place.
    // Only a hero who moved this turn runs the landing effects.
    /* C hack.c:2965-2968 — domove_succeeded is set BEFORE spoteffects(), so a
     * move whose landing effects relocate the hero (drown() crawl-out) still
     * counts as a successful walk for domove()'s maybe_adjust_hero_bubble. */
    if ((u.ux0 | 0) !== (u.ux | 0) || (u.uy0 | 0) !== (u.uy | 0))
        game.gd.domove_succeeded = ((game.gd.domove_succeeded | 0)
            | ((game.gd.domove_attempting | 0) & (DOMOVE_RUSH | DOMOVE_WALK)));
    if (u.umoved)
        await spoteffects(true);
    // The command topline survives moveloop's post-rhack channel reset.
    if (game._pending_message) _topl_stash_result();
    if (game._bc_move && game._bc_move.cause_delay) {
        nomul(-2);
        game.multi_reason = 'dragging an iron ball';
        game.nomovemsg = '';
    }
}

const WT_SQUEEZABLE_INV = 850;      /* weight.h:24 */

const M2_ROCKTHROW_BLDR = 0x08000000; /* monflag.h:149 */

const MZ_SMALL_BLDR = 1;            /* monflag.h:178 */

const LANDMINE_TTYP = 6, PIT_TTYP = 11, SPIKED_PIT_TTYP = 12,
      HOLE_TTYP = 13, TRAPDOOR_TTYP = 14, TELEP_TRAP_TTYP = 15,
      LEVEL_TELEP_TTYP = 16, ROLLING_BOULDER_TRAP_TTYP = 7;

/* C mondata.h:134 throws_rocks(ptr) / mondata.h:11 verysmall(ptr) */
function _bldr_throws_rocks(ptr) {
    return !!ptr && ((ptr.mflags2 | 0) & M2_ROCKTHROW_BLDR) !== 0;
}

function _bldr_verysmall(ptr) {
    return !!ptr && (ptr.msize | 0) < MZ_SMALL_BLDR;
}

function _bldr_Blind() { return _vision_Blind(); }

/* C hack.c:139-140 squeezeablylightinvent() */
function _bldr_squeezeablylightinvent() {
    return !game.invent || inv_weight() <= (WT_SQUEEZABLE_INV * -1);
}

/* C display.h glyph_is_invisible(levl[x][y].glyph) — the remembered 'I' mark. */
function _bldr_glyph_is_invisible(x, y) {
    const loc = game.level?.at(x, y);
    return !!(loc && loc.remembered_glyph
              && loc.remembered_glyph.cls === GLYPHCLS_INVIS);
}

/* C display.h glyph_to_obj(glyph_at(x,y)) == BOULDER — is the square already
 * REMEMBERED as holding a boulder?  Only read on the Blind path. */
function _bldr_remembered_as_boulder(x, y) {
    /* glyph_at() reads gg.gbuf, the painted glyph; a !hero_memory level (the
     * Plane of Water) never writes levl[x][y].glyph, so memory is not enough. */
    const g = _glyph_at(x, y);
    return !!(g && g.cls === 'obj' && (g.otyp | 0) === BOULDER);
}

/* C hack.c:143-163 could_move_onto_boulder(sx, sy).  C reads u.dx/u.dy; the
 * move delta is threaded through explicitly here for the same reason
 * domove_core takes (dx, dy) rather than reading u.dx. */
function could_move_onto_boulder(sx, sy, dx, dy) {
    const u = game.u;
    /* can if able to phaze through rock (must be poly'd, so not riding) */
    if (_uprop_active('PASSES_WALLS'))
        return true;
    /* can't when riding */
    if (u.usteed)
        return false;
    /* can if a giant, unless doing so allows hero to pass into a
       diagonal squeeze at the same time */
    if (_bldr_throws_rocks(_hero_youmonst().data)) {
        const a = game.level?.at(u.ux | 0, sy), b = game.level?.at(sx, u.uy | 0);
        return (!dx || !dy
                || !(IS_OBSTRUCTED(a ? (a.typ | 0) : STONE)
                     && IS_OBSTRUCTED(b ? (b.typ | 0) : STONE)));
    }
    /* can if tiny (implies carrying very little else couldn't move at all) */
    if (_bldr_verysmall(_hero_youmonst().data))
        return true;
    /* can squeeze to spot if carrying extremely little, otherwise can't */
    return _bldr_squeezeablylightinvent();
}

async function dopush(sx, sy, rx, ry, otmp, costly) {
    const u = game.u;
    {
        /* give boulder pushing feedback if this is a different boulder than
           the last one pushed or if it's been at least 2 turns since we last
           pushed this boulder; unlike with Norep(), intervening messages
           don't cause it to repeat, only doing something else in the
           meantime.  gb.bldrpush_oid / gb.bldrpushtime are per-game C globals
           (decl), so they live on `game` here. */
        if ((otmp.o_id | 0) !== (game._bldrpush_oid | 0)) {
            game._bldrpushtime = (game.moves | 0) + 1;
            game._bldrpush_oid = (otmp.o_id | 0);
        }
        const mvs = game.moves | 0, pushtime = game._bldrpushtime | 0;
        const givemesg = (mvs > pushtime + 2) || (mvs < pushtime);
        const what = givemesg ? _the_str(xname(otmp)) : null;
        if (!u.usteed) {
            const easypush = _bldr_throws_rocks(_hero_youmonst().data);
            if (givemesg)
                await pline(`With ${easypush ? 'little' : 'great'} effort you move ${what}.`);
            if (!easypush)
                exercise(A_STR, true);
        } else {
            if (givemesg)
                await pline(`${YMonnam(u.usteed)} moves ${what}.`);
        }
        game._bldrpushtime = mvs;
    }

    /* Move the boulder *after* the message. */
    if (_bldr_glyph_is_invisible(rx, ry))
        unmap_object(rx, ry);
    otmp.next_boulder = 0;
    movobj(otmp, rx, ry); /* does newsym(rx,ry) */
    if (_bldr_Blind()) {
        feel_location(rx, ry);
        feel_location(sx, sy);
    } else {
        newsym(sx, sy);
    }
    let shkp;
    if (costly && !shk_costly_spot(rx, ry)) {
        await shk_addtobill(otmp, false, false, false);
    } else if (!costly && shk_costly_spot(rx, ry) && otmp.unpaid
               && (shkp = shop_keeper(in_rooms(rx, ry, SHOPBASE)?.[0]))
               && (await shk_onbill(otmp, shkp, true))) {
        await shk_subfrombill(otmp, shkp);
    } else if (otmp.unpaid
               && (shkp = await shk_find_objowner(otmp, sx, sy))
               && !in_rooms(rx, ry, SHOPBASE).includes(ESHK(shkp)?.shoproom)) {
        await stolen_value(otmp, sx, sy, true, false);
    }
}

/* C hack.c:243-256 cannot_push_msg(otmp, sx, sy) */
async function cannot_push_msg(otmp, sx, sy) {
    const u = game.u;
    const what = _the_str(xname(otmp));
    if (u.usteed)
        await pline(`${YMonnam(u.usteed)} tries to move ${what}, but cannot.`);
    else
        await pline(`You try to move ${what}, but in vain.`);
    if (_bldr_Blind())
        feel_location(sx, sy);
}

/* C hack.c:258-312 cannot_push(otmp, sx, sy) — returns 0 (hero may step onto
 * the boulder's square anyway) or -1 (hero stays put). */
async function cannot_push(otmp, sx, sy, dx, dy) {
    if (_bldr_throws_rocks(_hero_youmonst().data)) {
        /* C hack.c:261-302: a giant can step over a boulder and may pick it
         * up immediately when autopick is enabled and inventory has room. */
        const BOULDER_OTYP = 475;
        const canpickup = !_bldr_Sokoban()
            && (inv_cnt(false) < 52 || !carrying(BOULDER_OTYP));
        const willpickup = canpickup
            // C hack.c:275: flags.pickup; autopickup defaults Off (optlist.h:184).
            && !!game.flags?.pickup
            && !game.context?.nopick
            && await autopick_testobj(otmp, true);
        const ridingSkill = P_SKILL(37);
        if (game.u.usteed && ridingSkill < P_BASIC) {
            await pline(`You aren't skilled enough to ${willpickup ? 'pick up' : 'push aside'} ${_the_str(xname(otmp))} from ${y_monnam(game.u.usteed)}.`);
        } else {
            await pline(`However, you ${willpickup ? 'easily pick it up' : 'maneuver over it'}${canpickup && !willpickup ? ' and could pick it up' : ''}.`);
            sokoban_guilt();
        }
        return 0;
    }

    if (could_move_onto_boulder(sx, sy, dx, dy)) {
        await pline('However, you can squeeze yourself into a small opening.');
        sokoban_guilt();
        return 0;
    } else {
        return -1;
    }
}

/* C hack.c:314-324 rock_disappear_msg(otmp) */
async function rock_disappear_msg(otmp) {
    const u = game.u;
    if (u.usteed)
        await pline(`${YMonnam(u.usteed)} pushes ${_the_str(xname(otmp))} and suddenly it disappears!`);
    else
        await pline(`You push ${_the_str(xname(otmp))} and suddenly it disappears!`);
}

/* C hack.c:326-333 moverock_done(sx, sy) */
function moverock_done(sx, sy) {
    for (let otmp = game.level?.levelObjects?.[sx]?.[sy]; otmp; otmp = otmp.nexthere)
        if ((otmp.otyp | 0) === BOULDER)
            otmp.next_boulder = 0; /* resume normal xname() for this obj */
}

/* C hack.c:335-345 moverock(void) */
async function moverock(dx, dy) {
    const u = game.u;
    const sx = (u.ux | 0) + dx, sy = (u.uy | 0) + dy; /* boulder starting position */
    const ret = await moverock_core(sx, sy, dx, dy);
    moverock_done(sx, sy);
    if (game._pending_message && !game._resultMessage) {
        _topl_stash_result();
    }
    return ret;
}

/* C hack.c:347-434 moverock_core(sx, sy) */
async function moverock_core(sx, sy, dx, dy) {
    const u = game.u;
    let otmp;
    let firstboulder = true;

    while ((otmp = sobj_at(BOULDER, sx, sy)) != null) {
        if (_bldr_Blind() && !_bldr_remembered_as_boulder(sx, sy)) {
            await pline('That feels like a boulder.');
            map_object(otmp, true);
            nomul(0);
            return -1;
        }

        /* when otmp->next_boulder is 1, xname() will format it as
           "next boulder" instead of just "boulder" */
        otmp.next_boulder = firstboulder ? 0 : 1;
        firstboulder = false;

        /* make sure that this boulder is visible as the top object */
        if (otmp !== game.level?.levelObjects?.[sx]?.[sy])
            movobj(otmp, sx, sy);

        const rx = (u.ux | 0) + 2 * dx; /* boulder destination position */
        const ry = (u.uy | 0) + 2 * dy;
        nomul(0);

        /* using m<dir> towards an adjacent boulder steps over/onto it if
           poly'd into a giant or squeezes under/beside it if small/light
           enough but is a no-op in other circumstances */
        if (game.context?.nopick) {
            const oldglyph = _glyph_at(sx, sy); /* before feel_location(); C hack.c:387 glyph_at */
            let res;

            feel_location(sx, sy); /* same for all 3 if/else-if/else cases */
            if (_bldr_throws_rocks(_hero_youmonst().data)) {
                await pline(`You ${u_locomotion('step')} over a boulder here.`);
                sokoban_guilt();
                res = 0; /* move to <sx,sy> */
            } else if (could_move_onto_boulder(sx, sy, dx, dy)) {
                /* C hack.c:401 tests the Flying macro (youprop.h:253), whose
                 * (u.usteed && is_flyer(u.usteed->data)) arm makes a flying
                 * steed fly; _Flying() is that macro, _uprop_active is not. */
                await pline(`You squeeze yourself ${_Flying() ? 'over' : 'against'} the boulder.`);
                sokoban_guilt();
                res = 0; /* move to <sx,sy> */
            } else {
                await pline('There is a boulder in your way.');
                /* C hack.c:409: compare the displayed glyph, including object
                 * identity; remembered symbols can agree while glyphs differ. */
                if (JSON.stringify(_glyph_at(sx, sy)) !== JSON.stringify(oldglyph))
                    game.context.door_opened = game.context.move = true;
                res = -1; /* don't move to <sx,sy>, so no soko guilt */
            }
            return res;
        }
        if (_Levitation() || Is_airlevel(u.uz)) {
            if (_bldr_Blind())
                feel_location(sx, sy);
            await pline(`You don't have enough leverage to push ${_the_str(xname(otmp))}.`);
            return -1;
        }
        if (_bldr_verysmall(_hero_youmonst().data) && !u.usteed) {
            if (_bldr_Blind())
                feel_location(sx, sy);
            await pline(`You're too small to push that ${xname(otmp)}.`);
            return await cannot_push(otmp, sx, sy, dx, dy);
        }
        const rloc = isok(rx, ry) ? game.level?.at(rx, ry) : null;
        const rtyp = rloc ? (rloc.typ | 0) : STONE;
        if (isok(rx, ry) && !IS_OBSTRUCTED(rtyp) && rtyp !== IRONBARS
            && (!IS_DOOR(rtyp) || !(dx && dy) || doorless_door(rx, ry))
            && !sobj_at(BOULDER, rx, ry)) {
            const ttmp = t_at(rx, ry);
            const mtmp = m_at(rx, ry);
            let costly = false;
            try {
                costly = !!(costly_spot(sx, sy)
                            && shop_keeper(in_rooms(sx, sy, SHOPBASE)?.[0]));
            } catch {
                costly = false;
            }

            /* KMH -- Sokoban doesn't let you push boulders diagonally */
            if (_bldr_Sokoban() && dx && dy) {
                if (_bldr_Blind())
                    feel_location(sx, sy);
                /* C ref: hack.c:445 pline("%s won't roll diagonally on this %s.",
                 *     The(xname(otmp)), surface(sx, sy)); — The() capitalizes,
                 * not the()/_the_str(). */
                await pline(`${The(xname(otmp))} won't roll diagonally on this ${surface(sx, sy)}.`);
                return await cannot_push(otmp, sx, sy, dx, dy);
            }

            if (await _bldr_revive_nasty(rx, ry, 'You sense movement on the other side.')) {
                return -1;
            }

            if (mtmp && !_bldr_noncorporeal(mtmp)
                && (!mtmp.mtrapped || !(ttmp && is_pit(ttmp.ttyp | 0)))) {
                let deliver_part1 = false;

                if (_bldr_Blind())
                    feel_location(sx, sy);
                if (canspotmon(mtmp)) {
                    await pline(`There's ${_mh_a_monnam(mtmp)} on the other side.`);
                    deliver_part1 = true;
                } else {
                    await You_hear(`a monster behind ${_the_str(xname(otmp))}.`);
                    if (!_hero_Deaf())
                        deliver_part1 = true;
                    map_invisible(rx, ry);
                }
                if (game.flags?.verbose !== false) {
                    const you_or_steed = u.usteed ? y_monnam(u.usteed) : 'you';
                    await pline(`${deliver_part1 ? "Perhaps that's why " : ''}`
                        + `${deliver_part1 ? you_or_steed : upstart(you_or_steed)}`
                        + ` cannot move ${deliver_part1 ? 'it' : _the_str(xname(otmp))}.`);
                }
                return await cannot_push(otmp, sx, sy, dx, dy);
            }

            if (closed_door(rx, ry)) {
                await cannot_push_msg(otmp, sx, sy);
                return await cannot_push(otmp, sx, sy, dx, dy);
            }

            /* at this point the boulder should be able to move (though
               potentially into something like a trap, pool, or lava) */

            /* rumbling disturbs buried zombies */
            disturb_buried_zombies(sx, sy);

            if (ttmp) {
                /* if a trap operates on the boulder, don't attempt to move any
                   others at this location; return -1 if another boulder is in
                   hero's way, or 0 if he should advance to the vacated boulder
                   position */
                switch (ttmp.ttyp | 0) {
                case LANDMINE_TTYP:
                    if (rn2(10)) {
                        obj_extract_self(otmp);
                        place_object(otmp, rx, ry);
                        newsym(sx, sy);
                        /* C hack.c:504-521 / trap.c:3171 blow_up_landmine. */
                        await pline(`${(!_hero_Deaf() || !_bldr_Blind()) ? 'KAABLAMM!!' : 'Gadzooks'}!  ${Tobjnam(otmp, 'trigger')} ${ttmp.madeby_u ? 'your' : 'a'} land mine.`);
                        await blow_up_landmine(ttmp);
                        await fill_pit(game.u.ux | 0, game.u.uy | 0);
                        if (cansee(rx, ry)) newsym(rx, ry);
                        return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                    }
                    break;
                case SPIKED_PIT_TTYP:
                case PIT_TTYP:
                    obj_extract_self(otmp);
                    /* C hack.c:529-533 vision kludge to get messages right;
                     * the pit will temporarily be seen even if this is one
                     * among multiple boulders. */
                    if (!_bldr_Blind() && game.viz_array?.[ry])
                        game.viz_array[ry][rx] |= 0x2; /* IN_SIGHT */
                    if (!await flooreffects(otmp, rx, ry, "fall")) {
                        place_object(otmp, rx, ry);
                    }
                    if (mtmp && !_bldr_Blind())
                        newsym(rx, ry);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                case HOLE_TTYP:
                case TRAPDOOR_TTYP:
                    /* C hack.c:548-566 — the boulder plugs the opening and
                     * everything on the destination square is buried. */
                    if (_bldr_Blind())
                        await pline(`Kerplunk!  You no longer feel ${_the_str(xname(otmp))}.`);
                    else
                        await pline(`${Tobjnam(otmp, ttmp.ttyp === TRAPDOOR_TTYP ? 'trigger' : 'fall')}`
                            + `${ttmp.ttyp === TRAPDOOR_TTYP ? '' : ' into'} and ${otense(otmp, 'plug')} a `
                            + `${ttmp.ttyp === TRAPDOOR_TTYP ? 'trap door' : 'hole'} in the ${surface(rx, ry)}!`);
                    deltrap(ttmp);
                    await useupf(otmp, 1);
                    await bhp_bury_objs(rx, ry);
                    const _holeLoc = game.level?.at(rx, ry);
                    if (_holeLoc) {
                        _holeLoc.wall_info = (_holeLoc.wall_info | 0) & ~0x08; /* W_NONDIGGABLE */
                        _holeLoc.candig = true;
                    }
                    if (cansee(rx, ry))
                        newsym(rx, ry);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                case LEVEL_TELEP_TTYP:
                case TELEP_TRAP_TTYP:
                    if ((ttmp.ttyp | 0) === LEVEL_TELEP_TTYP) {
                        const _newlev = random_teleport_level();
                        if ((_newlev | 0) === (depth(u.uz) | 0)) {
                            await dopush(sx, sy, rx, ry, otmp, costly);
                            continue;
                        }
                        await rock_disappear_msg(otmp);
                        otmp.next_boulder = 0;
                        if (costly) await stolen_value(otmp, rx, ry, !ttmp.tseen, false);
                        obj_extract_self(otmp);
                        add_to_migration(otmp);
                        const _dest = get_level(_newlev);
                        otmp.ox = _dest.dnum | 0;
                        otmp.oy = _dest.dlevel | 0;
                        otmp.owornmask = 0; /* MIGR_RANDOM */
                    } else {
                        await rock_disappear_msg(otmp);
                        otmp.next_boulder = 0;
                        await rloco(otmp);
                    }
                    seetrap(ttmp);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                case ROLLING_BOULDER_TRAP_TTYP: {
                    /* C hack.c:596-612: the boulder continues until it reaches
                     * one of the trap's launch spots or the map edge, then
                     * launch_obj(BOULDER, sx, sy, tox, toy,
                     * ROLL | LAUNCH_KNOWN) rolls it from the pushed square. */
                    let tox = rx, toy = ry;
                    while (isok(tox + (u.dx | 0), toy + (u.dy | 0))) {
                        tox += u.dx | 0;
                        toy += u.dy | 0;
                        if (tox === (ttmp.launch?.x | 0) && toy === (ttmp.launch?.y | 0))
                            break;
                        if (tox === (ttmp.launch2?.x | 0) && toy === (ttmp.launch2?.y | 0))
                            break;
                    }
                    await pline(`${_objnam_Tobjnam(otmp, 'suddenly roll')} away from you!`);
                    feeltrap(ttmp);
                    await launch_obj(BOULDER, sx, sy, tox, toy, 0x01 | 0x80);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                }
                default:
                    break; /* boulder not affected by this trap */
                }
            }

            if (await boulder_hits_pool(otmp, rx, ry, true))
                continue;

            /* Re-link at top of fobj chain so that pile order is preserved
               when level is restored. */
            if (otmp !== game.fobj) {
                remove_object(otmp);
                place_object(otmp, otmp.ox, otmp.oy);
            }
            await dopush(sx, sy, rx, ry, otmp, costly);
        } else {
            await cannot_push_msg(otmp, sx, sy);
            return await cannot_push(otmp, sx, sy, dx, dy);
        }
    }
    return 0;
}

/* C mondata.h noncorporeal(ptr) — mlet == S_GHOST. */
function _bldr_noncorporeal(mtmp) {
    const S_GHOST = 54; /* monsym.h */
    return !!mtmp && (mtmp.data ? (mtmp.data.mlet | 0) : -1) === S_GHOST;
}

/* C hack.c:2615-2633 carrying_too_much() — "carrying too much to be able to
 * move?".  botl.h: SLT_ENCUMBER 1 .. OVERLOADED 5. */
async function _carrying_too_much() {
    const u = game.u;
    if (!u)
        return false;
    const wtcap = near_capacity() | 0;
    const polyd = !!Upolyd(u);
    const lowHp = polyd
        ? ((u.mh | 0) < 5 && (u.mh | 0) !== (u.mhmax | 0))
        : ((u.uhp | 0) < 10 && (u.uhp | 0) !== (u.uhpmax | 0));
    if ((wtcap >= OVERLOADED || (wtcap > SLT_ENCUMBER && lowHp))
        && !Is_airlevel(u.uz)) {
        if (wtcap < OVERLOADED) {
            await pline("You don't have enough stamina to move.");
            exercise(A_CON, false);
        } else {
            await pline('You collapse under your load.');
        }
        nomul(0);
        return true;
    }
    return false;
}

function _domove_set_prev_pos(x, y) {
    const u = game.u;
    u.ux0 = u.ux;
    u.uy0 = u.uy;
    /* C hack.c:2782-2783 — gb.bhitpos = (x, y), read later by erode_obj's visobj */
    (game.gb ||= {}).bhitpos = game.bhitpos = { x: x | 0, y: y | 0 };
}

async function _domove_bump_mon(mtmp, x, y, glyphInvis = glyph_is_invisible_at(x, y), glyphWarn = glyph_is_warning_at(x, y)) {
    const ctx = game.context || {};
    if (!(ctx.nopick | 0) || (ctx.travel | 0)
        || !(canspotmon(mtmp)
             || glyphInvis
             || glyphWarn))
        return false;

    const u = game.u || {};
    const protectedShape = !!(u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
                              || u.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic);
    if (M_AP_TYPE(mtmp) && !protectedShape && !sensemon(mtmp)) {
        await stumble_onto_mimic(mtmp);
    } else if ((mtmp.mpeaceful | 0) && !_cmd_Hallucination()) {
        await pline(`Pardon me, ${m_monnam(mtmp)}.`);
    } else {
        await pline(`You move right into ${mon_nam(mtmp)}.`);
    }
    return true;
}

async function _domove_execute_pet_swap(mtmp, newx, newy) {
    const u = game.u;
    /* C hack.c:2097-2232 — preserve domove_swap_with_pet's ordered
     * refusal tests.  The caller has already saved u.ux0/u.uy0 and
     * selected the pet at (newx,newy); C resumes u at the pet square
     * while evaluating the swap. Both the boulder snapshot and the pet-trap
     * test inspect the destination square. */
    const oldx = u.ux, oldy = u.uy;
    u.ux = newx; u.uy = newy;
    if (game.youmonst?.data) m_postmove_effect(game.youmonst);
    u.ux = oldx; u.uy = oldy;
    /* C hack.c:2881-2887: the steed moves and practices riding before the
     * swap can be refused.  The ordinary movement tail is bypassed here. */
    if (u.usteed) {
        u.ux = newx;
        u.uy = newy;
        u.usteed.mx = newx;
        u.usteed.my = newy;
        await exercise_steed();
        u.ux = oldx;
        u.uy = oldy;
    }
    /* C hack.c:2874,2105 — u.ux/u.uy were already advanced to the pet's
     * square (u.ux += u.dx), so u_with_boulder tests the DESTINATION. */
    const petBoulder = sobj_at(BOULDER, newx, newy);
    mtmp.mundetected = 0;
    if (M_AP_TYPE(mtmp))
        seemimic(mtmp);
    u.ux = newx;
    u.uy = newy;
    const petTrap = mtmp.mtrapped ? t_at(newx, newy) : null;
    if (!mtmp.mtrapped || !petTrap)
        mtmp.mtrapped = 0;
    let refusal = null;
    if (mtmp.mtrapped && petTrap && is_pit(petTrap.ttyp | 0)
        && sobj_at(BOULDER, newx, newy)) {
        /* C sets didnt_move and emits no message in this arm. */
        refusal = true;
    } else if (oldx !== newx && oldy !== newy
               && ((mtmp.data?.pmidx ?? mtmp.pmidx) | 0) === PM_GRID_BUG) {
        refusal = `You stop.  ${YMonnam(mtmp)} can't move diagonally.`;
    } else if (petBoulder
               && !(verysmall_cmd(mtmp.data)
                    && (!mtmp.minvent || curr_mon_load(mtmp) <= 600))) {
        refusal = `You stop.  ${YMonnam(mtmp)} won't fit into the same spot that you're at.`;
    } else if (oldx !== newx && oldy !== newy
               && bad_rock(mtmp.data, newx, oldy)
               && bad_rock(mtmp.data, oldx, newy)
               && (bigmonst_cmd(mtmp.data)
                   || curr_mon_load(mtmp) > 600)) {
        refusal = `You stop.  ${YMonnam(mtmp)} won't fit through.`;
    } else if (mtmp.mpeaceful && mtmp.mtrapped && petTrap) {
        const what = trapname(petTrap.ttyp | 0, false);
        let trapPhrase = `that ${what}`;
        if (!petTrap.tseen) {
            feeltrap(petTrap);
            trapPhrase = an(what);
        }
        await pline(`You stop.  ${YMonnam(mtmp)} can't move out of ${trapPhrase}.`);
        await handle_tip(TIP_UNTRAP_MON);
        refusal = true;
    } else if (mtmp.mpeaceful) {
        const oldGood = goodpos(oldx, oldy, mtmp, 0);
        const pmidx = (mtmp.data?.pmidx ?? mtmp.pmidx) | 0;
        const immovable = !!(mtmp.ispriest || mtmp.isshk || mtmp.isgd
            || pmidx === PM_ORACLE
            || (game.svq?.quest_status?.leader_m_id != null
                && mtmp.m_id === game.svq.quest_status.leader_m_id));
        if (!oldGood || t_at(oldx, oldy) != null || immovable)
            refusal = `You stop.  ${YMonnam(mtmp)} doesn't want to swap places.`;
    }
    if (refusal) {
        if (refusal !== true)
            await pline(refusal);
        /* C hack.c:2922-2954 — every refusal reaches the common
         * reposition/reset tail and still consumes the move.  That tail is
         * the full hack.c:2934 u_on_newpos(u.ux, u.uy), whose same-level arm
         * runs see_nearby_objects() (dungeon.c:1598): a refused swap still
         * observes the adjacent pile tops, setting dknown, which mergable()
         * compares when a fresh corpse later lands on one of them. */
        u_on_newpos_cmd(oldx, oldy);
        await _u_on_newpos_nearby();
        await _domove_before_leash(newx, newy);
        await check_leash(oldx, oldy);
        await _domove_spot_tail(newx, newy);
        await runmode_delay_output();
        return;
    }
    /* C domove_swap_with_pet:2165-2166 — remove_monster(x,y); place_monster(mtmp, u.ux0, u.uy0) */
    mtmp.mtrapped = 0;
    /* u.ux0, u.uy0 set to old hero position; pet moves there */
    u.ux0 = oldx;
    u.uy0 = oldy;
    /* C hack.c:2886-2887 — u.ux += u.dx; u.uy += u.dy (hero moves to target) */
    u.ux = newx;
    u.uy = newy;
    /* C domove_swap_with_pet:2165-2166 — place monster at hero's old position */
    mtmp.mx = oldx;
    mtmp.my = oldy;
    /* C domove_swap_with_pet:2167-2168 — newsym(x,y); newsym(u.ux0,u.uy0) */
    newsym(newx, newy);
    newsym(oldx, oldy);
    const _verb_swap = mtmp.mpeaceful ? 'swap places with' : 'frighten';
    const _swap_named = !!has_mgivenname(mtmp);
    const _monref = x_monnam(
        mtmp,
        (mtmp.mtame | 0) ? ARTICLE_YOUR
        : (!_swap_named && !type_is_pname(mtmp.data)) ? ARTICLE_THE
        : ARTICLE_NONE,
        ((mtmp.mpeaceful | 0) && !(mtmp.mtame | 0)) ? 'peaceful' : null,
        _swap_named ? SUPPRESS_SADDLE : 0, false);
    await pline(`You ${_verb_swap} ${_monref}.`);
    // C hack.c:2179-2227: displacement can trap or kill the monster.
    const trapResult = await minliquid(mtmp) ? 2 /* Trap_Killed_Mon */
        : await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
    switch (trapResult) {
    case 0: // Trap_Effect_Finished
        break;
    case 1: // Trap_Caught_Mon
    case 3: // Trap_Moved_Mon
        abuse_dog(mtmp);
        adjalign(-3);
        break;
    case 2: { // Trap_Killed_Mon
        const conduct = (u.uconduct ||= {});
        if (!(conduct.killer | 0))
            livelog_printf(LL_CONDUCT, 'killed for the first time');
        conduct.killer = (conduct.killer | 0) + 1;
        const mndx = mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum;
        more_experienced(experience(mtmp, game.mvitals?.[mndx]?.died | 0), 0);
        await newexplevel();
        if (rn2(4)) {
            await pline('You feel guilty about losing your pet like this.');
            u.ugangr = (u.ugangr | 0) + 1;
            adjalign(-15);
        }
        break;
    }
    default:
        await real_impossible("that's strange, unknown mintrap result!");
        break;
    }
    if (game._pending_message) {
        const _prevRes = game._resultMessage;
        if (_prevRes) {
            const _aHint = (game._resultMessageJoins
                && game._resultMessageJoins.src === _prevRes)
                ? game._resultMessageJoins.joins.slice()
                : _topl_joins_snapshot(_prevRes);
            game._resultMessage = _topl_merge_result(_prevRes,
                game._pending_message, _aHint);
            game._resultMessageJoins = {
                src: game._resultMessage,
                joins: (_topl_joins_snapshot(game._resultMessage) || []).slice(),
            };
        } else {
            game._resultMessage = game._pending_message;
        }
        /* The copy above deliberately LEAVES the text on the live topline
         * (_maybe_snapshot_painted_screen splits _pending_message during
         * the movemon block and needs the whole accumulated line there),
         * so the same message is now in BOTH buffers.  Record what was
         * copied: a later stash of the live line into the same channel —
         * read_engr_at's, when the swap lands on an engraved square —
         * must not append its own prefix back onto itself.  See
         * js/display.js _topl_snapshot_result. */
        _topl_snapshot_result(game._pending_message);
    }
    await _u_on_newpos_nearby();
    await _domove_before_leash(newx, newy);
    await check_leash(oldx, oldy);
    /* C hack.c:2965-2969 — "Clean old position" before vision_recalc(1). */
    u.umoved = true;
    newsym(oldx, oldy);
    vision_recalc(1);
    await invocation_message(); /* C hack.c:2973 */
    await _domove_spot_tail(newx, newy);
    /* C hack.c:2990 — the swap falls through to domove_core's final
     * runmode_delay_output(), same as the ordinary walk's tail. */
    await runmode_delay_output();
}

// C ref: hack.c domove_core — execute a movement (existing body, unchanged,
// verbatim — only the function name and export keyword change)
async function domove_core(dx, dy) {
    const u = game.u;
    /* C ref: hack.c:2720-2723 — domove_core's ball&chain LOCALS
     * (bc_control, ballx/bally, chainx/chainy, cause_delay).  drag_ball()
     * fills them at hack.c:2861 and the post-move tail reads them back at
     * :2977 and :2984, so they have to survive the intervening awaits;
     * _domove_spot_tail() is a separate JS function, hence a per-move scratch
     * record on `game` rather than true locals.  Cleared HERE (C re-initialises
     * them on every domove_core entry) so a tail can never read a previous
     * move's drag. */
    game._bc_move = null;
    /* C ref: hack.c:2724-2728 — the FIRST statement of domove_core:
     *     if (svc.context.travel) {
     *         if (!findtravelpath(TRAVP_TRAVEL))
     *             (void) findtravelpath(TRAVP_GUESS);
     *         svc.context.travel1 = 0;
     *     }
     * findtravelpath writes u.dx/u.dy — that is how travel steers.  This port's
     * domove_core takes the delta as ARGUMENTS (see the wrapper above), so the
     * freshly-computed u.dx/u.dy are copied back over them here; every C read
     * downstream is of u.dx/u.dy, which findtravelpath has already set.
     * RNG-free: findtravelpath only calls test_move's predicate modes. */
    if (game.context && game.context.travel) {
        if (!findtravelpath(TRAVP_TRAVEL))
            findtravelpath(TRAVP_GUESS);
        game.context.travel1 = 0;
        /* findtravelpath's pline happens before the hero moves (hack.c:1411),
         * so a --More-- it raises freezes the map at the pre-move position. */
        await _flush_travel_unsure();
        dx = u.dx | 0;
        dy = u.dy | 0;
    }
    if (typeof process !== 'undefined' && ENV && ENV.FF_DIRTRACE === '1') {
        try {
            const { pushRngLogEntry } = await import('./rng.js');
            pushRngLogEntry(`^ff_domove[moves=${game.moves | 0} ux=${u.ux | 0} uy=${u.uy | 0}`
                + ` dx=${dx | 0} dy=${dy | 0} udx=${u.dx | 0} udy=${u.dy | 0}`
                + ` run=${game.context && game.context.run | 0} multi=${game.multi | 0}`
                + ` lst=${u.last_str_turn | 0}]`);
        } catch { /* ignore */ }
    }
    if (await _carrying_too_much())
        return;
    /* C hack.c:2745-2748 — x = u.ux + u.dx; y = u.uy + u.dy;
     *                      if (impaired_movement(&x, &y)) return;
     * A confused or stunned hero's direction is re-rolled here, BEFORE anything
     * else in the move draws, and u_maybe_impaired()'s rn2(5) is spent whenever
     * Confusion is set even when the re-roll does not happen.  u.dx/u.dy are
     * written first because confdir() and everything it feeds read them. */
    u.dx = dx | 0;
    u.dy = dy | 0;
    let swallowed_mon = null;
    if ((u.uswallow | 0) && u.ustuck) {
        u.dx = 0;
        u.dy = 0;
        dx = 0;
        dy = 0;
        u_on_newpos_cmd(u.ustuck.mx | 0, u.ustuck.my | 0);
        await _u_on_newpos_nearby(); // hack.c:2736 u_on_newpos -> earth_sense (dungeon.c:1600)
        swallowed_mon = u.ustuck;
    } else {
        if (await air_turbulence())
            return;
        slippery_ice_fumbling();
        const im = impaired_movement(dx, dy);
        if (im.blocked)
            return;
        dx = im.dx;
        dy = im.dy;
        const wt = await water_turbulence(dx, dy);
        if (wt.done)
            return;
        dx = wt.dx;
        dy = wt.dy;
    }
    const newx = u.ux + dx;
    const newy = u.uy + dy;
    /* C hack.c:2586-2610 move_out_of_bounds(), called at :2754 — BEFORE
     * `u.ux0 = u.ux` (:2780), so a rush into the map edge leaves <ux0,uy0> at
     * the square the hero stepped FROM and URETREATING() stays true. */
    if (!(u.uswallow | 0) && !isok(newx, newy)) {
        if (game.context?.forcefight) {
            await domove_fight_empty(newx, newy, dx, dy);
            return;
        }
        if (game.flags?.mention_walls) {
            let mdx = dx, mdy = dy;
            if (mdx && mdy) { /* diagonal */
                if (isok(newx, u.uy)) mdx = 0;
                else if (isok(u.ux, newy)) mdy = 0;
            }
            await pline(`You have already gone as far ${dxdy_to_dist_descr(mdx, mdy, true)} as possible.`);
        }
        nomul(0);
        game.context.move = 0;
        return;
    }
    /* C hack.c:2500-2516, called by domove_core at :2758.  A run/rush must
     * notice a known trap before the target-monster attack path.  For a true
     * rush (run >= 2), C stops before entering the square, clears context.move,
     * and reports the trap when mention_walls is enabled.  Ordinary run mode
     * (run == 1) ends the repeat but still takes this first step. */
    if (!(u.uswallow | 0) && (game.context?.run | 0)) {
        const wouldStop = (game.context.run | 0) >= 2;
        if (await avoid_moving_on_trap(newx, newy, wouldStop)
            || (_vision_Blind() && await avoid_moving_on_liquid(newx, newy, wouldStop))) {
            nomul(0);
            if (wouldStop) {
                game.context.move = 0;
                return;
            }
        }
    }
    /* C hack.c:2788-2790 — escape_from_sticky_mon() is evaluated before the
     * target monster lookup.  A failed escape spends this turn in place;
     * successful release falls through to the ordinary m_at/attack path. */
    if (!(u.uswallow | 0) && await escape_from_sticky_mon(newx, newy))
        return;
    /* C ref: hack.c domove — check for monster at target tile and dispatch
     * to do_attack (uhitm.c::do_attack). W21.2 added MON_AT occupancy check
     * to goodpos_simple so JS pet placement now matches C; W21.3 wires the
     * do_attack call.
     * C hack.c:2737 `mtmp = u.ustuck` on the swallowed arm — the engulfer is
     * on the hero's own square, so m_at would usually find it too, but C names
     * it outright and a stale monster grid must not be able to lose it. */
    const mtmp = swallowed_mon || m_at(newx, newy);
    let _petSwapMon = null;
    /* C hack.c:2785 `glyph = glyph_at(x, y)` is taken once, before do_attack and
     * the displacement, and hack.c:2794/2889-2890 read that snapshot. */
    let _glyphInvis = false, _glyphWarn = false;
    if (mtmp) {
        /* C hack.c:2768 sits inside domove_core's NOT-swallowed arm (:2739-2784);
         * a swallowed hero's mtmp = u.ustuck skips it, so a run key attacks. */
        if (game.context?.run && !swallowed_mon && !is_safemon(mtmp)) {
            const blindCheck = _uprop_active('BLINDED');
            /* named for the C macro it is (youprop.h:359) — this file's other
             * ported guards keep the C spelling, and it keeps the guard
             * greppable from the C side. */
            const Protection_from_shape_changers = !!(
                game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.intrinsic
                || game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS]?.extrinsic);
            if ((!blindCheck && mon_visible(mtmp)
                 && ((M_AP_TYPE(mtmp) !== M_AP_FURNITURE
                      && M_AP_TYPE(mtmp) !== M_AP_OBJECT)
                     || Protection_from_shape_changers))
                || sensemon(mtmp)) {
                /* C ref: hack.c:2781-2784 — nomul(0); context.move = 0; return. */
                nomul(0);
                game.context.move = 0;
                return;
            }
        }
        // C hack.c:2791: contact with a hostile stops repeated movement,
        // including a blind encounter which attack_checks aborts before combat.
        if (!is_safemon(mtmp) || game.context?.forcefight)
            nomul(0);
        _domove_set_prev_pos(newx, newy);
        _glyphInvis = glyph_is_invisible_at(newx, newy);
        _glyphWarn = glyph_is_warning_at(newx, newy);
        /* C hack.c:2794 — m-prefix movement into a known monster is handled
         * before domove_attackmon_at(), hence before do_attack's rn2(7) pet
         * displacement test. */
        if (await _domove_bump_mon(mtmp, newx, newy, _glyphInvis, _glyphWarn))
            return;
        /* C ref: hack.c domove_attackmon_at — returns TRUE if movement blocked.
         * do_attack returns false for the is_safemon swap path (rn2(7) consumed
         * inside do_attack uhitm.c:475 then returns FALSE at line 510).
         * W22.5: Don't return unconditionally after do_attack — check for
         * the pet-swap path (domove_core:2932 domove_swap_with_pet). */
        /* C hack.c:1968-1970 domove_attackmon_at — only attack if we know it's
         * there, or with F, or if it hides_under / is an eel (do_attack prints
         * the "Wait!" message).  A ceiling hider (rock piercer) that is still
         * mundetected is NOT attacked: the hero walks onto it and
         * spoteffects (hack.c:3417-3446) has it drop. */
        const _S_EEL_MLET = 57;
        let _displaceu = false;
        const blocked = (game.context?.forcefight || !mtmp.mundetected
            || sensemon(mtmp)
            || ((_hidesUnder_useupf(mtmp.data)
                 || (mtmp.data?.mlet | 0) === _S_EEL_MLET)
                && !is_safemon(mtmp)))
            ? await (async () => {
                /* C hack.c:1972-1984 — a displacer beast may decide to swap
                 * places with the hero instead of being attacked. */
                const ux0 = u.ux | 0, uy0 = u.uy | 0;
                _displaceu = (((mtmp.data?.pmidx ?? mtmp.pmidx) | 0) === PM_DISPLACER_BEAST
                    && !rn2(2)
                    && (mtmp.mux | 0) === ux0 && (mtmp.muy | 0) === uy0
                    && !helpless(mtmp)
                    && !mtmp.meating && !mtmp.mtrapped
                    && !u.utrap && !u.ustuck && !u.usteed
                    && !(dx && dy
                         && (NODIAG(u.umonnum | 0)
                             || (bad_rock(mtmp.data, newx, uy0)
                                 && bad_rock(mtmp.data, ux0, newy))
                             || (bad_rock(game.youmonst?.data, ux0, newy)
                                 && bad_rock(game.youmonst?.data, newx, uy0))))
                    && goodpos(ux0, uy0, mtmp, GP_ALLOW_U));
                return _displaceu ? false : await do_attack(newx, newy);
            })() : false;
        if (_displaceu) {
            /* C hack.c:2861-2864: punishment also applies to involuntary swaps. */
            if (_st_Punished()) {
                const control = { value: 0 }, delay = { value: false };
                const bx = { value: 0 }, by = { value: 0 };
                const cx = { value: 0 }, cy = { value: 0 };
                if (!await drag_ball(newx, newy, control, bx, by, cx, cy, delay, true))
                    return;
                game._bc_move = {
                    control: control.value, ballx: bx.value, bally: by.value,
                    chainx: cx.value, chainy: cy.value, cause_delay: !!delay.value,
                };
            }
            /* C hack.c:2866-2868 — the region check follows the !displaceu
             * block, so a displacer-beast swap also updates hero_inside. */
            if (!in_out_region(newx, newy))
                return;
            /* C hack.c:2887-2910 — the monster takes the hero's old square. */
            const ox = u.ux | 0, oy = u.uy | 0;
            u.ux0 = ox;
            u.uy0 = oy;
            u.ux = newx;
            u.uy = newy;
            if (game.youmonst?.data) m_postmove_effect(game.youmonst);
            const noticed_it = canspotmon(mtmp) || _glyphInvis
                || _glyphWarn;
            mtmp.mx = ox;
            mtmp.my = oy;
            newsym(newx, newy);
            newsym(ox, oy);
            mtmp.mux = newx;
            mtmp.muy = newy;
            await pline(`${!noticed_it ? 'Something' : YMonnam(mtmp)} swaps places with you...`);
            if (!canspotmon(mtmp))
                map_invisible(ox, oy);
            game.context.mon_moving = 1;
            if (!(await minliquid(mtmp)))
                await mintrap(mtmp, 0 /* NO_TRAP_FLAGS */);
            game.context.mon_moving = 0;
            await _u_on_newpos_nearby();
            await _domove_before_leash(newx, newy);
            await check_leash(ox, oy);
            /* C hack.c:2965-2969 — "Clean old position"; the generic moved-hero
             * block redraws u.ux0,u.uy0 again (a second hallucination draw). */
            u.umoved = true;
            newsym(ox, oy);
            vision_recalc(1);
            await invocation_message();
            await _domove_spot_tail(newx, newy);
            await runmode_delay_output();
            return;
        }
        if (game._pending_message)
            game._attackPublished = true;
        if (blocked) return;
        const _mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        if (is_safemon(mtmp) && !(_is_hider_mndx(_mndx) && (mtmp.mundetected | 0))) {
            _petSwapMon = mtmp;
        }
        /* Non-safemon do_attack returned FALSE (leprechaun dodge, uhitm.c:556-563):
         * domove_attackmon_at returns FALSE (hack.c:1987-1989), so domove_core
         * falls through to domove_fight_empty / the ordinary move (hack.c:2798+). */
    }
    _domove_set_prev_pos(newx, newy);
    /* Hand the line over to the result channel (as domove_fight_empty's tail
     * does): a run/travel continuation's _run_commit_result folds _resultMessage
     * onto _pending_message, so leaving it in both doubles C's one gt.toplines
     * ("Clonk!  ...  Clonk!  Clonk!  ..." while traveling into iron bars). */
    if (await domove_fight_ironbars(newx, newy)) {
        if (game._pending_message) {
            game._resultMessage = game._pending_message;
            game._pending_message = '';
        }
        return;
    }
    if (await domove_fight_web(newx, newy)) {
        if (game._pending_message) {
            game._resultMessage = game._pending_message;
            game._pending_message = '';
        }
        return;
    }
    if (game.context?.forcefight
        || (glyph_is_invisible_at(newx, newy) && !m_at(newx, newy)
            && !(game.context?.nopick))) {
        await domove_fight_empty(newx, newy, dx, dy);
        return;
    }
    /* C hack.c:2812-2818 — not attacking, so try to move; a helpless steed
     * refuses ("Your horse won't move!") and the turn is still spent:
     *     (void) unmap_invisible(x, y);
     *     if ((u.dx || u.dy) && u.usteed && stucksteed(FALSE)) {
     *         nomul(0);
     *         return;
     *     } */
    unmap_invisible(newx, newy);
    if ((dx || dy) && u.usteed && stucksteed(false)) {
        nomul(0);
        return;
    }
    /* C hack.c:2820-2821: immobile forms spend the move rooted in place. */
    if (u_rooted())
        return;
    {
        const ParanoidTrap = !!(((game.flags?.paranoia_bits
                                 ?? PARANOID_CONFIRMATION_DEFAULT_BITS) | 0) & 0x0800); /* PARANOID_TRAP, flag.h:94 */
        const ParanoidConfirm = !!(((game.flags?.paranoia_bits
                                    ?? PARANOID_CONFIRMATION_DEFAULT_BITS) | 0) & PARANOID_CONFIRM);
        const _up = u.uprops || {};
        const Stunned = (_up[STUNNED]?.intrinsic) | 0;
        const Confusion = (_up[CONFUSION]?.intrinsic) | 0;
        const Hallucination = _cmd_Hallucination();
        const _Blind = _vision_Blind();
        const _newreg = visible_region_at(newx, newy);
        const _oldreg = _newreg ? visible_region_at(u.ux | 0, u.uy | 0) : null;
        if (ParanoidTrap && !_Blind && !Stunned && !Confusion && !Hallucination
            /* skip if player used 'm' prefix or is moving recklessly */
            && (!(game.context?.nopick) || game.context?.run)
            && _newreg
            && (!_oldreg || (reg_damg(_newreg) > 0 && reg_damg(_oldreg) === 0))
            /* check whether attempted move will be viable (TEST_MOVE) */
            && test_move(u.ux | 0, u.uy | 0, (newx - u.ux) | 0, (newy - u.uy) | 0, TEST_MOVE)) {
            const qbuf = `${upstart(u_locomotion("step"))} into that ${reg_damg(_newreg) > 0 ? 'poison gas' : 'vapor'} cloud?`;
            if (!(await paranoid_query(ParanoidConfirm, qbuf))) {
                /* C hack.c:2569-2571 — declined: stop, don't move, don't spend turn. */
                nomul(0);
                game.context.move = 0;
                /* topl.c:544-548 leaves the answered prompt TOPLINE_NON_EMPTY, so a
                 * later pline replaces it without --More--; paranoid_query already
                 * parked it in _topl_sticky (not a pending _resultMessage). */
                return;
            }
        }
        const _ptrap = t_at(newx, newy);
        if (ParanoidTrap && !Stunned && !Confusion
            /* skip if player used 'm' prefix or is moving recklessly */
            && (!(game.context?.nopick) || (game.context?.run))
            /* check for discovered trap */
            && _ptrap && _ptrap.tseen
            /* check whether attempted move will be viable (TEST_MOVE) */
            && test_move(u.ux | 0, u.uy | 0, (newx - u.ux) | 0, (newy - u.uy) | 0, TEST_MOVE)
            /* override confirmation if the trap is harmless to the hero */
            && ((await immune_to_trap(_hero_youmonst(), _ptrap.ttyp | 0)) !== TRAP_CLEARLY_IMMUNE
                || Hallucination)) {
            /* Hallucination: all traps still show as ^, so pick a random type. */
            const traptype = Hallucination ? rnd(TRAPNUM - 1) : (_ptrap.ttyp | 0);
            const into = into_vs_onto(traptype);
            const _expl = TRAP_EXPLANATIONS[(traptype | 0) - 1] || 'trap';
            const qbuf = `Really ${u_locomotion("step")} ${into ? 'into' : 'onto'} that ${_expl}?`;
            if (!(await paranoid_query(ParanoidConfirm, qbuf))) {
                /* C hack.c:2583-2586 — declined: stop, don't move, don't spend turn. */
                nomul(0);
                game.context.move = 0;
                if (!ParanoidConfirm && !game.iflags?.query_menu)
                    game._resultMessage = qbuf + ' [yn] (n)';
                return;
            }
        }
    }
    /* C ref: hack.c:2840-2851 domove_core — while stuck in a trap (u.utrap set),
     * resolve one turn's escape attempt via trapmove() BEFORE the ordinary
     * test_move (the door/autodig/blocksMove chain below).  A false return
     * means the hero is still stuck this turn: the move is abandoned without
     * spending time on test_move at all (position unchanged, turn consumed
     * by the struggle).  reset_utrap(TRUE) mirrors C's SET_BOTL() + the
     * levitation/flying resume message when the escape frees the hero. */
    if (u.utrap) {
        const _trapMoved = await trapmove(newx, newy, null);
        if (!u.utrap) {
            await reset_utrap(true);
        }
        if (game._pending_message && !game._resultMessage) {
            game._resultMessage = game._pending_message;
            game._pending_message = '';
        }
        if (!_trapMoved) return;
    }
    /* C ref: hack.c domove_core — IS_DOOR && closed_door path (hack.c:1072-1133).
     * When autoopen is on (default) and hero is not running/confused/stunned/fumbling,
     * walking into a closed door triggers doopen_indir rather than blocking.
     * C hack.c:1097: if (flags.autoopen && !svc.context.run && !Confusion && !Stunned && !Fumbling)
     *     int tmp = doopen_indir(x, y);
     *     svc.context.door_opened = !closed_door(x, y);
     *     svc.context.move = (ux != u.ux || uy != u.uy);  — hero didn't move
     * TEST_MOVE_RETURN(FALSE) at hack.c:1141 — hero stays put after door attempt. */
    /* C hack.c:998 — test_move() clears door_opened on every entry; this
     * inline DO_MOVE arm must too, or a stale TRUE from an earlier door open
     * reaches the moverock() failure test at hack.c:2843-2848. */
    game.context.door_opened = false;
    const blocksLoc = game.level?.at(newx, newy);
    const isClosedDoor = blocksLoc && blocksLoc.typ === DOOR &&
        (blocksLoc.doormask & (D_CLOSED | D_LOCKED));
    /* C ref: hack.c:1075-1077 — `if (closed_door(x, y)) { ... if (Passes_walls)
     * ; (do nothing)`.  A Passes_walls hero is not refused by a closed door
     * at all: control falls past the IS_DOOR chain and the move proceeds onto
     * the door square, where spoteffects -> switch_terrain (hack.c:3189)
     * then says "You can't levitate in here." when levitating.  Mirrors the
     * Passes_walls branch of the test_move mirror above. */
    /* C hack.c:1075-1077: feel the door even when phasing through it. */
    if (isClosedDoor && _uprop_active('BLINDED'))
        feel_location(newx, newy);
    if (isClosedDoor && !_uprop_active('PASSES_WALLS')) {
        ffRunTrace('closed-door', `nx=${newx} ny=${newy} mask=${blocksLoc.doormask | 0}`
            + ` auto=${game.flags?.autoopen === false ? 0 : 1}`
            + ` impaired=${_uprop_active('CONFUSION') || _uprop_active('STUNNED') || _uprop_active('FUMBLING') ? 1 : 0}`);
        if (typeof process !== 'undefined' && ENV && ENV.FF_DOORTRACE === '1')
            pushRngLogEntry(`^doortrace[ux=${u.ux|0} uy=${u.uy|0} nx=${newx} ny=${newy} mask=${blocksLoc.doormask|0} run=${game.context?.run?1:0} auto=${game.flags?.autoopen===false?0:1}]`);
        /* C hack.c:1078-1084: oozing precedes underwater and autoopen. */
        if (can_ooze(_hero_youmonst())) {
            await You('ooze under the door.');
        } else if (_Underwater()) {
            await pline('There is an obstacle there.');
            game.context.move = 0;
            nomul(0);
            return;
        } else {
        /* C hack.c:1085-1089 — eat the door (DO_MOVE).  Preceded by the
         * Passes_walls / can_ooze / Underwater arms, which fall past it. */
        if (!_uprop_active('PASSES_WALLS') && !can_ooze(_hero_youmonst())
            && !_Underwater() && _hero_tunnels() && !_hero_needspick()) {
            if (await still_chewing(newx, newy)) {
                game.context.move = 0;
                nomul(0);
                return;
            }
        }
        if (closed_door(newx, newy)) { /* hack.c:1092: chewing skips autoopen/bumping. */
        /* C hack.c:1094-1096 — amorphous hero (can_ooze failed: carrying too much). */
        if ((_hero_youmonst().data.mflags1 & 0x04) !== 0) /* M1_AMORPHOUS */
            await pline("You try to ooze under the door, but can't squeeze your possessions through.");
        /* Autoopen is on by default (flags.autoopen = On per optlist.h:178).
         * Guards: !context.run, !Confusion, !Stunned, !Fumbling — all four modelled. */
        const autoopen = (game.flags?.autoopen !== false); /* defaults On */
        const ctxRun = !!(game.context?.run);
        /* C ref: hack.c:1097-1098 — the autoopen guard is
         *     flags.autoopen && !svc.context.run
         *     && !Confusion && !Stunned && !Fumbling
         * This port carried only the !run term, so a confused / stunned /
         * fumbling hero auto-opened the door where C instead falls to the
         * hack.c:1110 `x == ux || y == uy` arm and — because Stunned/Fumbling
         * also satisfy that arm's inner test — emits "Ouch!  You bump into a
         * door.", spends the exercise(A_DEX) rn2(2), and nomul(0)s. */
        const _impairedOpen = _uprop_active('CONFUSION') || _uprop_active('STUNNED')
            || _uprop_active('FUMBLING');
        if (autoopen && !ctxRun && !_impairedOpen) {
            const _tmp = await doopen_indir(newx, newy);
            /* C hack.c:1098-1108 — if 'autounlock' includes Kick, a kick may be
             * queued after doopen_indir(); the door hasn't opened, but fake it
             * so the canned kick executes as the next command. */
            const _cq = cmdq_peek(CQ_CANNED);
            if (_tmp === ECMD_OK && _cq && _cq.typ === CMDQ_EXTCMD
                && _cq.ec_entry?.func === 'dokick')
                game.context.door_opened = true;
            else
                game.context.door_opened = !closed_door(newx, newy);
            /* C hack.c:1109 — svc.context.move = (ux != u.ux || uy != u.uy) = 0 (hero didn't move) */
            game.context.move = 0;
            /* C hack.c:2843-2848: a failed autoopen cancels the move even
             * without a repeat count.  nomul(0) also requests the status
             * paint which refreshes a clock suppressed by an earlier run. */
            if (!game.context.door_opened) nomul(0);
            return;
        }
        if (newx === u.ux || newy === u.uy) {
            if (_uprop_active('BLINDED') || _uprop_active('STUNNED')
                || acurr(u, A_DEX) < 10 || _uprop_active('FUMBLING')) {
                if (u.usteed) {
                    /* hack.c:1114-1115 */
                    await pline(`You can't lead ${y_monnam(u.usteed)} through that closed door.`);
                } else {
                    await pline('Ouch!  You bump into a door.');
                    exercise(A_DEX, false);
                }
                game.context.door_opened = true;
                game.context.move = 1;
                nomul(0);
            } else {
                await pline('That door is closed.');
                game.context.move = 0;
                nomul(0);
            }
            return;
        }
        }
        }
    }
    else if (blocksLoc && IS_DOOR(blocksLoc.typ)
        && !((blocksLoc.doormask | 0) & (D_CLOSED | D_LOCKED))) {
        if (dx && dy && !_uprop_active('PASSES_WALLS')
            && (!doorless_door(newx, newy) || block_door(newx, newy))) {
            /* C hack.c:1143-1144 — inside `if (mode == DO_MOVE)`, before the
             * message: `if (Blind) feel_location(x, y);`.  No RNG. */
            if (_uprop_active('BLINDED'))
                feel_location(newx, newy);
            if (_Underwater() || game.flags?.mention_walls) {
                await pline(`You can't move diagonally into an intact doorway.`);
            }
            game.context.move = 0;
            nomul(0);
            return;
        }
    }
    /* C ref: hack.c:1010-1012 — the FIRST statement of test_move's
     *     if (IS_OBSTRUCTED(tmpr->typ) || tmpr->typ == IRONBARS) { ... }
     * block, ahead of every arm inside it (Passes_walls, Underwater, the
     * iron-bars chew, still_chewing, autodig, and the mention_walls naming):
     *     if (Blind && mode == DO_MOVE) feel_location(x, y);
     * This whole path is DO_MOVE.  Nothing here draws RNG. */
    {
        const _obLoc = game.level?.at(newx, newy);
        if (_obLoc && (IS_OBSTRUCTED(_obLoc.typ) || _obLoc.typ === IRONBARS)
            && _uprop_active('BLINDED'))
            feel_location(newx, newy);
    }
    /* C hack.c:1024-1030 — iron bars: a rust/corrosion/metallivorous hero
     * chews them (DO_MOVE); still_chewing() TRUE returns FALSE from test_move. */
    {
        const _bl = game.level?.at(newx, newy);
        if (_bl && _bl.typ === IRONBARS
            && !_uprop_active('PASSES_WALLS') && !_Underwater()) {
            const _ym = _hero_youmonst().data || {};
            const _shim = { pmidx: (_ym.pmidx ?? (u.umonnum | 0)) | 0 };
            if ((dmgtype(_shim, 24) || dmgtype(_shim, 42)
                 || (((_ym.mflags1 | 0) >>> 0) & 0x80000000))
                && await still_chewing(newx, newy)) {
                game.context.move = 0;
                nomul(0);
                return;
            }
        }
    }
    /* C hack.c:1036-1040 — "Eat the rock": a tunneler without a pick chews
     * (DO_MOVE); still_chewing() TRUE returns FALSE from test_move. */
    {
        const _tl = game.level?.at(newx, newy);
        if (_tl && IS_OBSTRUCTED(_tl.typ) && _tl.typ !== IRONBARS
            && !(_uprop_active('PASSES_WALLS') && may_passwall(newx, newy))
            && !_Underwater()
            && _hero_tunnels() && !_hero_needspick()) {
            if (await still_chewing(newx, newy)) {
                game.context.move = 0;
                nomul(0);
                return;
            }
        }
    }
    {
        const _loc = game.level?.at(newx, newy);
        const _isObstruction = _loc &&
            (_loc.typ === STONE || IS_WALL(_loc.typ) || IS_OBSTRUCTED(_loc.typ));
        if (_isObstruction
            && !_Underwater()
            && !(_uprop_active('PASSES_WALLS') && may_passwall(newx, newy))
            && game.flags?.autodig
            && !(game.context?.run)
            && !(game.context?.nopick)
            && u.uwep && is_pick(u.uwep)) {
            /* set the dig direction from the move delta (C: u.dx/u.dy already set
             * by set_move_cmd; the plain-move path passes dx/dy as args). */
            u.dx = dx; u.dy = dy; u.dz = 0;
            await use_pick_axe2(u.uwep);
            if (game._pending_message) {
                _topl_stash_result();
            }
            /* C hack.c:1046,2843-2848: test_move returns FALSE after
             * autodig, so domove_core cancels this move even when the pick
             * cannot dig the target.  Any dig occupation runs separately. */
            game.context.move = 0;
            nomul(0);
            /* TEST_MOVE_RETURN(FALSE) — the hero does not move; the occupation
             * driver (allmain.js) runs dig() across the following turns. */
            return;
        }
    }
    if (blocksMove(newx, newy)) {
        {
            const _bl = game.level?.at(newx, newy);
            if (_Underwater() && _bl && (IS_OBSTRUCTED(_bl.typ) || _bl.typ === IRONBARS)
                && !(_uprop_active('PASSES_WALLS') && may_passwall(newx, newy))) {
                /* C hack.c:1019-1021 — the Underwater arm precedes the IRONBARS arm:
                 *     else if (Underwater) { if (mode == DO_MOVE) There("is an obstacle there."); return FALSE; }
                 * Reached from the water-level swim: the hero is underwater and the
                 * square he is pushed into is obstructed. */
                await pline('There is an obstacle there.');
            } else if (_bl && _bl.typ === IRONBARS) {
                /* C hack.c:1032-1035 — the IRONBARS arm precedes the generic
                 * "It's %s." naming arm and has its own message. */
                if (game.flags?.mention_walls)
                    await pline('You cannot pass through the bars.');
            } else if (_bl && IS_OBSTRUCTED(_bl.typ)) {
                if (is_db_wall(newx, newy)) {          /* hack.c:1050-1051 */
                    await pline('That drawbridge is up!');
                } else if (_uprop_active('PASSES_WALLS') && !may_passwall(newx, newy)
                           && In_sokoban(u.uz)) {          /* hack.c:1052-1055 */
                    /* soko restriction stays even after puzzle is solved */
                    await pline('The Sokoban walls resist your ability.');
                } else if (game.flags?.mention_walls) { /* hack.c:1056-1068 */
                    /* pline_dir(xytodir(dx, dy), ...): set_msg_dir = hero + dir */
                    set_msg_xy(newx, newy);
                    await pline(`It's ${_blocked_background_desc(newx, newy)}.`);
                }
            }
        }
        // Can't move there.
        // C ref: hack.c:2851-2858 — !test_move(...DO_MOVE) with !door_opened:
        //   svc.context.move = 0; nomul(0); return;
        // The nomul(0) is what STOPS a run that walks into an impassable tile
        // (e.g. a corridor dead-end / stone ahead); without it the moveloop_core
        // multi>0 loop would re-issue domove forever.  For a non-run walk into a
        // wall, multi is 0 so nomul(0) is a no-op (C-faithful either way).
        game.context.move = 0;
        nomul(0);
        return;
    }
    {
        const _ydat = game.youmonst?.data;
        if (dx && dy && _ydat
            && bad_rock(_ydat, u.ux | 0, newy) && bad_rock(_ydat, newx, u.uy | 0)) {
            const _sq = cant_squeeze_thru(game.youmonst);
            if (_sq === 3 || _sq === 2 || _sq === 1) {
                await pline(_sq === 3 ? 'You cannot pass that way.'
                    : _sq === 2 ? 'You are carrying too much to get through.'
                        : 'Your body is too large to fit through.');
                game.context.move = 0;
                nomul(0);
                return;
            }
        } else if (dx && dy && worm_cross(u.ux | 0, u.uy | 0, newx, newy)) {
            /* C ref: hack.c:1172-1176 */
            await pline(`${YMonnam(m_at(u.ux | 0, newy))} is in your way.`);
            game.context.move = 0;
            nomul(0);
            return;
        }
    }
    {
        const _ust = game.level?.at(u.ux, u.uy);
        if (dx && dy && !_uprop_active('PASSES_WALLS') && _ust && IS_DOOR(_ust.typ)
            && (!doorless_door(u.ux, u.uy) || block_entry(newx, newy))) {
            if (game.flags?.mention_walls) {
                await pline(`You can't move diagonally out of an intact doorway.`);
            }
            game.context.move = 0;
            nomul(0);
            return;
        }
    }
    if (sobj_at(BOULDER, newx, newy) && (_bldr_Sokoban() || !_uprop_active('PASSES_WALLS'))) {
        if ((game.context?.run | 0) >= 2
            && !(_bldr_Blind() || _cmd_Hallucination())
            && !could_move_onto_boulder(newx, newy, dx, dy)) {
            if (game.flags?.mention_walls) {
                set_msg_xy(newx, newy); // C hack.c:1220 pline_dir
                await pline('A boulder blocks your path.');
            }
            game.context.move = 0;
            nomul(0);
            return;
        }
        /* tunneling monsters will chew before pushing */
        const _ydat = _hero_youmonst().data;
        const _tunnels = !!_ydat && ((_ydat.mflags1 | 0) & 0x20) !== 0;   /* M1_TUNNEL */
        const _needspick = !!_ydat && ((_ydat.mflags1 | 0) & 0x40) !== 0; /* M1_NEEDPICK */
        if (_tunnels && !_needspick && !_bldr_Sokoban()) {
            /* hack.c:1227-1228 — still_chewing() TRUE makes test_move FALSE, and
             * domove then sets context.move = 0 (no time passes). */
            if (await still_chewing(newx, newy)) {
                if (!game.context?.door_opened) {
                    game.context.move = 0;
                    nomul(0);
                }
                return;
            }
        } else if ((await moverock(dx, dy)) < 0) {
            /* TEST_MOVE_RETURN(FALSE) — hack.c:2843-2848 domove_core:
             *   if (!svc.context.door_opened) { svc.context.move = 0; nomul(0); } */
            if (!game.context?.door_opened) {
                game.context.move = 0;
                nomul(0);
            }
            /* The push messages went to _pending_message; C's tty topline
             * persists until the next nhgetch, so hand them to _resultMessage
             * exactly as the do_attack / autodig paths do. */
            if (game._pending_message) {
                _topl_stash_result();
            }
            return;
        }
    }
    /* C ref: hack.c:2851-2856 domove_core — "Is it dangerous to swim in water
     * or lava?".  Sits between a successful test_move(DO_MOVE) and the actual
     * move; a TRUE return aborts without spending the turn. */
    if (await swim_move_danger(newx, newy)) {
        game.context.move = 0;
        nomul(0);
        return;
    }
    if (_st_Punished()) {
        const bc_control = { value: 0 };
        const ballx = { value: 0 }, bally = { value: 0 };
        const chainx = { value: 0 }, chainy = { value: 0 };
        const cause_delay = { value: false };
        if (!await drag_ball(newx, newy, bc_control, ballx, bally, chainx, chainy,
                       cause_delay, true))
            return;
        game._bc_move = {
            control: bc_control.value,
            ballx: ballx.value, bally: bally.value,
            chainx: chainx.value, chainy: chainy.value,
            cause_delay: !!cause_delay.value,
        };
    }
    /* C ref: hack.c:2866-2868 — Check regions entering/leaving (clears/sets
     * the hero_inside flag of gas clouds; without it a cloud the hero walked
     * out of keeps hurting her). */
    if (!in_out_region(newx, newy))
        return;
    if (_petSwapMon) {
        await _domove_execute_pet_swap(_petSwapMon, newx, newy);
        return;
    }
    // Move the hero
    const oldx = u.ux, oldy = u.uy;
    u.ux0 = oldx;
    u.uy0 = oldy;
    u.ux = newx;
    u.uy = newy;
    /* C hack.c:2877 — m_postmove_effect(&gy.youmonst) right after the tentative
     * move: a hero polyed into a hezrou/steam vortex leaves a gas cloud at
     * u.ux0,u.uy0 (rn1(3,4) at region.c:1303). */
    if (game.youmonst && game.youmonst.data)
        m_postmove_effect(game.youmonst);
    if (u.usteed) {
        u.usteed.mx = newx;
        u.usteed.my = newy;
        await exercise_steed();
    }
    // C hack.c: vision_recalc paints the new hero position.
    await _u_on_newpos_nearby();
    await _domove_before_leash(newx, newy);
    await check_leash(oldx, oldy);
    if (oldx !== newx || oldy !== newy) {
        u.umoved = true;
        newsym(oldx, oldy);
        vision_recalc(1);
        await invocation_message(); /* C hack.c:2973 */
    }
    await _domove_spot_tail(newx, newy);
    /* C hack.c:2990 — domove_core ends with runmode_delay_output(): while
     * running/travelling it sets time_botl and curs_on_u() -> flush_screen(1)
     * -> bot() paints the status BEFORE moveloop's moves++. */
    await runmode_delay_output();
}

// of the old and new hero squares, wipe_engr_at consumes rnd(5) whenever an
// engraving exists there and is not a HEADSTONE.
function _maybe_smudge_engr(x1, y1, x2, y2) {
    if (!can_reach_floor(true)) return;
    let ep = engr_at(x1, y1);
    if (ep && ep.engr_type !== HEADSTONE)
        wipe_engr_at(x1, y1, rnd(5), false);
    if ((x2 !== x1 || y2 !== y1)) {
        ep = engr_at(x2, y2);
        if (ep && ep.engr_type !== HEADSTONE)
            wipe_engr_at(x2, y2, rnd(5), false);
    }
}

/* C hack.c:4514 - rounddiv(long x, int y): integer division with rounding */
export function rounddiv(x, y) {
    let r, m;
    let divsgn = 1;

    if (y === 0)
        throw new Error("division by zero in rounddiv");
    else if (y < 0) {
        divsgn = -divsgn;
        y = -y;
    }
    if (x < 0) {
        divsgn = -divsgn;
        x = -x;
    }
    r = Math.trunc(x / y);
    m = x % y;
    if (2 * m >= y)
        r++;

    return divsgn * r;
}

/* C hack.c:964 - invocation_pos(coordxy x, coordxy y): check if (x,y) is the invocation position */
export function invocation_pos(x, y) {
    const g = game;
    /* svi.inv_pos is a zero-initialized global in C (decl.c); it is <0,0>
     * until mkmaze.c place_invpos() sets it. */
    return Boolean(Invocation_lev_dgn(g.u.uz) && x === (g.svi?.inv_pos?.x ?? 0) && y === (g.svi?.inv_pos?.y ?? 0));
}

/* C hack.c:3064 - invocation_message(): special clue-msg when on the Invocation position */
export async function invocation_message() {
    const u = game.u;
    const g = game;
    const CANDELABRUM_OF_INVOCATION = 262;
    const FOOT = 5;

    if (invocation_pos(u.ux, u.uy) && !On_stairs(u.ux, u.uy)) {
        let buf;
        const otmp = carrying(CANDELABRUM_OF_INVOCATION);

        nomul(0); /* stop running or travelling */
        if (u.usteed)
            buf = "beneath " + y_monnam(u.usteed);
        else if (_Levitation() || _Flying())
            buf = "beneath you";
        else
            buf = "under your " + makeplural_objnam(body_part(FOOT));

        await You_feel("a strange vibration %s.", buf);
        u.uevent.uvibrated = 1;
        if (otmp && otmp.spe === 7 && otmp.lamplit)
            await pline("%s %s!", upstart(_the(xname(otmp))),
                  (_vision_Blind() ? "throbs palpably" : "glows with a strange light"));
    }
}

/* C hack.c:73-103: clear the union without changing its address. */
function zero_tmp_anything() {
    const any = ((game.gt ||= {}).tmp_anything ||= {});
    for (const key of Object.keys(any)) delete any[key];
    return Object.assign(any, game.cg?.zeroany);
}

/* C hack.c:81 - long_to_any(long lng): convert a long to an anything union
 * Returns a pointer to gt.tmp_anything with the long value set. */
export function long_to_any(lng) {
    const g = game;
    // Ensure gt exists
    if (!g.gt) g.gt = {};
    // Ensure cg exists
    if (!g.cg) g.cg = {};
    // cg.zeroany is a zero-initialized anything union
    if (!g.cg.zeroany) g.cg.zeroany = {};
    // C: gt.tmp_anything = cg.zeroany;
    g.gt.tmp_anything = zero_tmp_anything();
    // C: gt.tmp_anything.a_long = lng;
    g.gt.tmp_anything.a_long = lng;
    // C: return &gt.tmp_anything;
    return g.gt.tmp_anything;
}

/* C ref: hack.c:1744 notice_all_mons(boolean reset)
 * Accessibility: announce all spotted monsters, sorted by distance (closest first).
 * If reset is true, clears mspotted for unspottable monsters even when cnt==0.
 */
export async function notice_all_mons(reset) {
    const g = game;
    const a11y = g.a11y;
    if (a11y && a11y.mon_notices && !a11y.mon_notices_blocked) {
        let mtmp, i = 0, cnt = 0;

        /* first pass: count spottable monsters */
        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) <= 0)  /* DEADMONSTER */
                continue;
            if (canspotmon(mtmp))
                cnt++;
            else if (reset)
                mtmp.mspotted = false;
        }
        if (!cnt)
            return;

        let arr = new Array(cnt);

        /* second pass: collect spottable monsters */
        for (mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) <= 0)
                continue;
            if (!canspotmon(mtmp))
                mtmp.mspotted = false;
            else if (i < cnt)
                arr[i++] = mtmp;
        }

        if (i) {
            /* C hack.c:1735 notice_mons_cmp: distu is squared Euclidean distance. */
            const u = g.u;
            arr.sort(function(a, b) {
                const da = dist2(a.mx, a.my, u.ux, u.uy);
                const db = dist2(b.mx, b.my, u.ux, u.uy);
                return da - db;
            });

            for (let j = 0; j < i; j++)
                await notice_mon(arr[j]);
        }
    }
}

/* C hack.c:2662-2668 — showdamage(int dmg)
 * Display damage taken if iflags.showdamage is set and dmg != 0.
 * Prints "[HP <negative-dmg>, <remaining-hp> left]"
 */
export function showdamage(dmg) {
    const u = game.u;
    const iflags = game.iflags;

    // if (!iflags.showdamage || !dmg) return;
    if (!iflags || !iflags.showdamage || !dmg) {
        return;
    }

    // pline("[HP %i, %i left]", -dmg, Upolyd ? u.mh : u.uhp);
    /* C you.h:554 Upolyd; `u.Upolyd` is a field nothing in js/ ever assigns. */
    const remaining_hp = (u && (u.umonnum | 0) !== (u.umonster | 0)) ? (u.mh | 0) : (u && u.uhp ? (u.uhp | 0) : 0);
    pline("[HP %i, %i left]", -dmg, remaining_hp);
}

/* ── handle_tip (hack.c:1852) ── */
const NUM_TIPS = 4;

const TIP_ENHANCE = 0;

const TIP_SWIM = 1;

const TIP_UNTRAP_MON = 2;

/* maybe show a helpful gameplay tip? returns True if tip gets shown */
export async function handle_tip(tip) {
    /* C ref: flags.tips defaults ON (OPTIONS=!tips turns it off); the JS
     * flags object has no default entry for it, so undefined means "not
     * explicitly disabled" here, not "off". */
    if (game.flags.tips === false)
        return false;
    if (!game.context.tips)
        game.context.tips = [];

    if (tip >= 0 && tip < NUM_TIPS && !game.context.tips[tip]) {
        game.context.tips[tip] = true;
        /* the "Tip:" prefix is a hint to use of OPTIONS=!tips to suppress */
        switch (tip) {
        case TIP_ENHANCE:
            await pline("(Tip: use the #enhance command to advance them.)");
            break;
        case TIP_SWIM:
            /* C hack.c:1865: honor the current request-menu binding. */
            await pline("(Tip: use '"
                        + visctrl(cmd_from_func(do_reqmenu))
                        + "' prefix to step in if you really want to.)");
            break;
        case TIP_UNTRAP_MON:
            await pline("(Tip: perhaps #untrap would help?)");
            break;
        case TIP_GETPOS:
            await l_nhcore_call(NHCORE_GETPOS_TIP);
            break;
        default:
            impossible_cmd("Unknown tip in handle_tip(%i)", tip);
            break;
        }
        return true;
    }
    return false;
}

// C artifact.c:526-532 confers_luck(obj) — LUCKSTONE always confers luck;
// otherwise only an artifact with the SPFX_LUCK special-ability bit does.
// confers_luck is imported from ./artifact.js below
/* C hack.c:97-103 — obj_to_any(struct obj *obj): wrap an obj pointer in the
 * shared `anything` union.
 *     anything *
 *     obj_to_any(struct obj *obj)
 *     {
 *         gt.tmp_anything = cg.zeroany;
 *         gt.tmp_anything.a_obj = obj;
 *         return &gt.tmp_anything;
 *     }
 * gt.tmp_anything is a single FILE-STATIC union that every *_to_any() shares
 * and overwrites, and the return is its address — so the caller's pointer goes
 * stale on the next conversion; consumers storing its value must copy it. */
export function obj_to_any(obj) {
    const g = game;
    if (!g.gt) g.gt = {};
    if (!g.cg) g.cg = {};
    if (!g.cg.zeroany) g.cg.zeroany = {};
    // C: gt.tmp_anything = cg.zeroany;
    g.gt.tmp_anything = zero_tmp_anything();
    // C: gt.tmp_anything.a_obj = obj;
    g.gt.tmp_anything.a_obj = obj;
    g.gt.tmp_anything.a_monst = obj; // hack.c:89-103: pointer arms alias.
    /* JS timer elements compare the inactive union arm too; use the same
     * canonical object-wrapper shape as timeout.js/mklev.js. */
    g.gt.tmp_anything.a_long = null;
    // C: return &gt.tmp_anything;
    return g.gt.tmp_anything;
}

// C ref: hack.c impact_disturbs_zombies(obj,violent) — maybe disturb buried
// zombies when an object is dropped or thrown nearby.
export function impact_disturbs_zombies(obj, violent) {
    /* if object won't make a noticeable impact, let buried zombies rest */
    if (obj.owt < (violent ? 10 : 100) || is_flimsy(obj))
        return;

    disturb_buried_zombies(obj.ox, obj.oy);
}

// C ref: hack.c disturb_buried_zombies(coordxy,coordxy) — reduce zombification
// timeout of buried zombies around x,y.
export function disturb_buried_zombies(x, y) {
    const g = game;
    const CORPSE = 265;
    const ZOMBIFY_MON = 3;   // REVIVE_MON + 1
    const TIMER_OBJECT = 3;

    for (let otmp = g.level.buriedobjlist; otmp; otmp = otmp.nobj) {
        let t;
        if (otmp.otyp === CORPSE && otmp.timed
            && otmp.ox >= x - 1 && otmp.ox <= x + 1
            && otmp.oy >= y - 1 && otmp.oy <= y + 1
            && (t = peek_timer(ZOMBIFY_MON, obj_to_any(otmp))) > 0) {
            t = stop_timer(ZOMBIFY_MON, obj_to_any(otmp));
            start_timer(Math.max(1, Math.trunc(t * 2 / 3)), TIMER_OBJECT,
                        ZOMBIFY_MON, obj_to_any(otmp));
        }
    }
}

/* C hack.c:1994-2016 domove_fight_ironbars: force-fight iron bars with the
 * wielded weapon. */
async function domove_fight_ironbars(x, y) {
    const u = game.u;
    const loc = game.level?.locations?.[x]?.[y];
    const obj = u.uwep;
    if (game.context?.forcefight && loc && (loc.typ | 0) === IRONBARS && obj) {
        let flags = 0x01 | BRK_FROM_INV | 0x10; /* BRK_BY_HERO | FROM_INV | MELEE */
        let o = obj;
        if (breaktest(o)) {
            if ((o.quan | 0) > 1) o = await splitobj(o, 1);
            else await setuwep(null);
            freeinv(o);
            flags |= BRK_KNOWN2BREAK;
        } else {
            flags |= BRK_KNOWN2NOTBREAK;
        }
        await hit_bars_hero(o, u.ux, u.uy, x, y, acurrstr(u), flags);
        return true;
    }
    return false;
}

export async function runmode_delay_output() {
    if (((game.context?.run | 0) || (game.multi | 0)) && (game.flags?.runmode | 0) !== RUN_TPORT) {
        /* for tport mode, don't display anything until we've stopped;
           for normal (leap) mode, update display every 7th step
           (relative to turn counter; ought to be to start of running);
           for walk and crawl (visual debugging) modes, update the
           display after every step */
        if ((game.flags?.runmode | 0) !== RUN_LEAP || !((game.moves | 0) % 7)) {
            /* moveloop() suppresses time_botl when running */
            game.disp.time_botl = (game.flags?.time | 0);
            await flush_screen(1);
            /* stamp: this flush repainted the terminal (force_more_lone_frame) */
            game._runFlushSeq = (game._runFlushSeq | 0) + 1;
            lone_frame_run_flush();
            nh_delay_output();
            if ((game.flags?.runmode | 0) === RUN_CRAWL) {
                nh_delay_output();
                nh_delay_output();
                nh_delay_output();
                nh_delay_output();
            }
        }
    }
}

/* C hack.c:89 - monst_to_any(struct monst *mtmp): convert a monst pointer to an anything union
 * Returns a pointer to gt.tmp_anything with the monst value set. */
export function monst_to_any(mtmp) { return obj_to_any(mtmp); }

// C ref: hack.c:1708-1734 notice_mon — accessibility: announce newly spotted monster.
export async function notice_mon(mtmp) {
    const g = game;
    const a11y = g.a11y;
    if (a11y && a11y.mon_notices && !a11y.mon_notices_blocked) {
        const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
        const spot = canspotmon(mtmp)
            && !(_is_hider_mndx(mndx)
                 && (mtmp.mundetected
                     || M_AP_TYPE(mtmp) === M_AP_FURNITURE
                     || M_AP_TYPE(mtmp) === M_AP_OBJECT));

        if (spot && !mtmp.mspotted && !DEADMONSTER(mtmp)) {
            mtmp.mspotted = true;
            set_msg_xy(mtmp.mx, mtmp.my);
            const verb = canseemon(mtmp) ? 'see' : 'notice';
            const monname = x_monnam(mtmp,
                     mtmp.mtame ? ARTICLE_YOUR
                     : (!has_mgivenname(mtmp)
                        && !type_is_pname(mtmp.data)) ? ARTICLE_A
                     : ARTICLE_NONE,
                     (mtmp.mpeaceful && !mtmp.mtame) ? 'peaceful' : 0,
                     has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
            /* C ref: pline.c You(line, ...) == vpline(YouMessage("You ", line)).
             * The You imported at the head of this file (js/do_wear.js:2720) is a
             * throw-stub, and pline() takes a single string -- expand both here
             * rather than leave a guaranteed abort on the a11y path. */
            await pline('You ' + _plineVFmt('%s %s.', [verb, monname]));
        } else if (!spot) {
            mtmp.mspotted = false;
        }
    }
}

function move_update(newlev) {
    const g = game;
    const u = g.u || (g.u = {});
    u.urooms0 = u.urooms || '';
    u.ushops0 = u.ushops || '';
    if (newlev) {
        u.urooms = '';
        u.uentered = '';
        u.ushops = '';
        u.ushops_entered = '';
        u.ushops_left = u.ushops0;
        return;
    }
    u.urooms = String.fromCharCode(...in_rooms(u.ux | 0, u.uy | 0, 0));

    let uentered = '', ushops = '', ushops_entered = '';
    for (const ch of u.urooms) {
        if (u.urooms0.indexOf(ch) === -1)
            uentered += ch;
        if (IS_SHOP_ROOM(ch.charCodeAt(0) - ROOMOFFSET)) {
            ushops += ch;
            if (u.ushops0.indexOf(ch) === -1)
                ushops_entered += ch;
        }
    }
    u.uentered = uentered;
    u.ushops = ushops;
    u.ushops_entered = ushops_entered;

    /* filter u.ushops0 -> u.ushops_left */
    let left = '';
    for (const ch of u.ushops0)
        if (u.ushops.indexOf(ch) === -1)
            left += ch;
    u.ushops_left = left;
}

export function in_town(x, y) {
    const g = game;
    if (!g.level?.flags?.has_town)
        return false;
    let has_subrooms = false;
    const rooms = g.level.rooms || [];
    /* C walks `for (sroom = &svr.rooms[0]; sroom->hx > 0; sroom++)` — the
     * array is terminated by the first room with hx <= 0, not by nroom. */
    for (let i = 0; i < rooms.length; i++) {
        const sroom = rooms[i];
        if (!sroom || (sroom.hx | 0) <= 0)
            break;
        if ((sroom.nsubrooms | 0) > 0) {
            has_subrooms = true;
            if (inside_room(sroom, x, y))
                return true;
        }
    }
    return !has_subrooms;
}

function furniture_present(typ, roomno) {
    const room = (game.level?.rooms || [])[roomno | 0];
    if (!room) return false;
    for (let y = room.ly | 0; y <= (room.hy | 0); ++y) {
        for (let x = room.lx | 0; x <= (room.hx | 0); ++x) {
            const loc = game.level?.at(x, y);
            if (loc && (loc.typ | 0) === (typ | 0) && inside_room(room, x, y))
                return true;
        }
    }
    return false;
}

export function u_locomotion(def) {
    const capitalize = (def.charAt(0) === def.charAt(0).toUpperCase());
    return _Levitation() ? (capitalize ? "Float" : "float")
        : _Flying() ? (capitalize ? "Fly" : "fly")
            : locomotion(_hero_youmonst().data, def);
}

function monstinroom(mdat, roomno) {
    /* C `mtmp->data == mdat`: permonst identity, compared by mons[] index. */
    const want = mdat?.pmidx | 0;
    const marker = (roomno | 0) + ROOMOFFSET;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue;
        const data = mtmp.data;
        const idx = data?.pmidx != null ? (data.pmidx | 0) : (mtmp.mnum | 0);
        if (idx !== want) continue;
        const rooms = in_rooms(mtmp.mx | 0, mtmp.my | 0, 0) || '';
        if (rooms.includes(marker)) return mtmp;
    }
    return null;
}

// C macros / defines
const PM_SOLDIER = 277;

const PM_SERGEANT = 278;

const PM_LIEUTENANT = 280;

const PM_CAPTAIN = 281;

const PM_ORACLE = 274;

export async function check_special_room(newlev) {
    const g = game;
    const u = g.u || (g.u = {});

    move_update(newlev);
    if (u.ushops0 && u.ushops0.charCodeAt(0) !== 0)
        await u_left_shop(u.ushops_left, newlev);

    /* Check for attaining 'entered Mine Town' achievement */
    /* C: svl.level.flags.has_town.  This port's home for the level flags is
     * game.level.flags (js/sp_lev.js:4904 sets has_town there, js/mklev.js:4292
     * clears it); nothing in js/ has ever assigned `.svl`, so the old
     * `g.svl.level.flags` read was unconditionally undefined and this
     * achievement could not be awarded. */
    /* C hack.c:3647-3651.  The old guard required g.svc.context.achieveo to
     * ALREADY EXIST, so on a tree where nothing had created it the whole test
     * was dead — C reads `svc.context.achieveo.minetn_reached` out of a struct
     * that always exists and is zero-initialised.  Create it here instead of
     * treating its absence as "already reached". */
    if (g.level && g.level.flags && g.level.flags.has_town
        && In_mines(u.uz) && in_town(u.ux, u.uy)) {
        g.svc = g.svc || {};
        g.svc.context = g.svc.context || {};
        const achieveo = (g.svc.context.achieveo = g.svc.context.achieveo || {});
        if (!achieveo.minetn_reached) {
            record_achievement(ACH_TOWN);
            achieveo.minetn_reached = true;
        }
    }

    if ((!u.uentered || u.uentered.charCodeAt(0) === 0)
        && (!u.ushops_entered || u.ushops_entered.charCodeAt(0) === 0))
        return;

    /* Did we just enter a shop? */
    if (u.ushops_entered && u.ushops_entered.charCodeAt(0) !== 0)
        await u_entered_shop(u.ushops_entered);

    const rooms = g.level ? g.level.rooms : [];
    const level = g.level;
    const Blind = _uprop_active('BLINDED');
    const Stealth = _uprop_active('STEALTH');

    for (let i = 0; i < u.uentered.length; i++) {
        const ch = u.uentered.charCodeAt(i);
        if (ch === 0) break;
        const roomno = ch - ROOMOFFSET;
        let rt = rooms[roomno].rtype | 0;
        let msg_given = true;

        switch (rt) {
        case ZOO: {
            /* topl.c update_topl:262-265 — same instant-more() as COURT below:
             * a pending line plus this one that overflows (n0 + len + 3 >=
             * CO - 8) blocks at the --More-- BEFORE the wake loop's rn2(3). */
            const _zoo = "Welcome to David's treasure zoo!";
            const _zn0 = String(g._pending_message || '').length;
            if (_zn0 > 0 && !g._topl_win_stop && _zn0 + _zoo.length + 3 >= 80 - 8) {
                /* C pline.c:266-276 recalculates vision and flushes BEFORE
                 * update_topl() pages the standing message (topl.c:274). */
                prepare_deferred_pline(_zoo);
                const _zfrozen = capture_painted_frame_with_status();
                const _zprev = g._paintedSnapshot;
                if (_zfrozen) g._paintedSnapshot = _zfrozen;
                await force_more(g._pending_message, undefined, false, false, _zfrozen);
                g._paintedSnapshot = _zprev || null;
            }
            pline(_zoo);
            break;
        }
        case SWAMP:
            pline("It %s rather %s down here.", Blind ? "feels" : "looks",
                  Blind ? "humid" : "muddy");
            break;
        case COURT: {
            /* C topl.c update_topl:262-265 — a pline that does not fit after the
             * line already on the topline (n0 + strlen + 3 >= CO - 8) raises
             * more() at THAT instant, freezing the physical screen as of the
             * last flush: before the court wake loop below and before movemon.
             * This port otherwise pages at the end-of-turn flush over the live
             * (post-movemon) map.  Page the pending line over a frozen frame. */
            const _court = nh_sprintf("You enter an opulent%s room!",
                [!furniture_present(THRONE, roomno) ? "" : " throne"]);
            const _n0 = String(g._pending_message || '').length;
            if (_n0 > 0 && !g._topl_win_stop && _n0 + _court.length + 3 >= 80 - 8) {
                /* Same vpline flush before update_topl's blocking more(). */
                prepare_deferred_pline(_court);
                const _frozen = capture_painted_frame_with_status();
                const _prev = g._paintedSnapshot;
                if (_frozen) g._paintedSnapshot = _frozen;
                await force_more(g._pending_message, undefined, false, false, _frozen);
                g._paintedSnapshot = _prev || null;
            }
            You("enter an opulent%s room!",
                !furniture_present(THRONE, roomno) ? "" : " throne");
            break;
        }
        case LEPREHALL:
            You("enter a leprechaun hall!");
            break;
        case MORGUE:
            if (midnight()) {
                const run = u_locomotion("Run");
                pline("%s away!  %s away!", run, run);
            } else
                You("have an uncanny feeling...");
            break;
        case BEEHIVE:
            You("enter a giant beehive!");
            break;
        case COCKNEST:
            You("enter a disgusting nest!");
            break;
        case ANTHOLE:
            You("enter an anthole!");
            break;
        case BARRACKS:
            if (monstinroom({ pmidx: PM_SOLDIER }, roomno)
                || monstinroom({ pmidx: PM_SERGEANT }, roomno)
                || monstinroom({ pmidx: PM_LIEUTENANT }, roomno)
                || monstinroom({ pmidx: PM_CAPTAIN }, roomno))
                You("enter a military barracks!");
            else
                You("enter an abandoned barracks.");
            break;
        case DELPHI: {
            const oracle = monstinroom({ pmidx: PM_ORACLE }, roomno);
            if (oracle) {
                SetVoice(oracle, 0, 80, 0);
                if (!oracle.mpeaceful)
                    verbalize("You're in Delphi, %s.", g.plname ?? g.u?.plname ?? "");
                else
                    verbalize("%s, %s, welcome to Delphi!",
                              Hello(null), g.plname ?? g.u?.plname ?? "");
            } else
                msg_given = false;
            break;
        }
        case TEMPLE:
            await intemple(roomno + ROOMOFFSET);
            // FALLTHROUGH
        default:
            msg_given = (rt === TEMPLE || rt >= SHOPBASE);
            rt = 0;
            break;
        }

        if (msg_given)
            room_discovered(roomno);

        if (rt !== 0) {
            rooms[roomno].rtype = OROOM;
            if (!search_special(rt)) {
                /* No more room of that type */
                /* C: svl.level.flags.  `.svl` is never assigned in js/, so the
                 * old first arm was dead and this always took the g.level
                 * fallback; keep only the live one. */
                const lf = g.level ? g.level.flags : null;
                if (lf) {
                    switch (rt) {
                    case COURT:
                        lf.has_court = 0;
                        break;
                    case SWAMP:
                        lf.has_swamp = 0;
                        break;
                    case MORGUE:
                        lf.has_morgue = 0;
                        break;
                    case ZOO:
                        lf.has_zoo = 0;
                        break;
                    case BARRACKS:
                        lf.has_barracks = 0;
                        break;
                    case TEMPLE:
                        lf.has_temple = 0;
                        break;
                    case BEEHIVE:
                        lf.has_beehive = 0;
                        break;
                    }
                }
            }
            if (rt === COURT || rt === SWAMP || rt === MORGUE || rt === ZOO) {
                if (msg_given && _topline_more_pending() && g.nhDisplay?.onEmptyQueue
                    && g.nhDisplay.inputQueueLength === 0)
                    await force_more(g._pending_message);
                for (let mtmp = g.fmon; mtmp; mtmp = mtmp.nmon) {
                    if (DEADMONSTER(mtmp))
                        continue;
                    if (!isok(mtmp.mx, mtmp.my)
                        || roomno !== ((level.at(mtmp.mx, mtmp.my)?.roomno) | 0))
                        continue;
                    if (!Stealth && !rn2(3)) {
                        wake_msg(mtmp, false);
                        mtmp.msleeping = 0;
                    }
                }
            }
        }
    }
}

// C ref: hack.c:3151 pooleffects(boolean newspot) — pool/lava entry and
// exit handling for the hero. RNG-free (rng_calls_count: 0).
export async function pooleffects(newspot) {
    const g = game;
    const u = g.u || (g.u = {});

    /* check for leaving water */
    if (u.uinwater) {
        let still_inwater = false; /* assume we're getting out */

        if (!pooleffects_is_pool(u.ux, u.uy)) {
            if (Is_waterlevel(u.uz)) {
                You("pop into an air bubble.");
                g.iflags = g.iflags || {};
                g.iflags.last_msg = PLNMSG_BACK_ON_GROUND;
            } else if (pooleffects_is_lava(u.ux, u.uy)) {
                You(`leave the ${pooleffects_hliquid("water")}...`); /* oops! */
            } else {
                await pooleffects_back_on_ground(false);
            }
        } else if (Is_waterlevel(u.uz)) {
            still_inwater = true;
        } else if (pooleffects_Levitation()) {
            You(`pop out of the ${pooleffects_hliquid("water")} like a cork!`);
        } else if (pooleffects_Flying()) {
            You(`fly out of the ${pooleffects_hliquid("water")}.`);
        } else if (pooleffects_Wwalking()) {
            You("slowly rise above the surface.");
        } else {
            still_inwater = true;
        }
        if (!still_inwater) {
            const was_underwater = !!(u.uinwater && !Is_waterlevel(u.uz));

            await set_uinwater(0); /* u.uinwater = 0; leave the water */
            if (was_underwater) { /* restore vision */
                await docrt(true);
                g.vision_full_recalc = 1;
            }
        }
    }

    /* check for entering water or lava */
    if (!u.ustuck && !pooleffects_Levitation() && !pooleffects_Flying()
        && is_pool_or_lava(u.ux, u.uy)) {
        if (u.usteed && !pooleffects_grounded(u.usteed.data)) {
            /* floating or clinging steed keeps hero safe (is_flyer() test
               is redundant; it can't be true since Flying yielded false) */
            return false;
        } else if (u.usteed) {
            /* steed enters pool */
            await pooleffects_dismount_steed(u.uinwater ? DISMOUNT_FELL : DISMOUNT_GENERIC);
            /* dismount_steed() -> float_down() -> pickup()
               (float_down doesn't do autopickup on Air or Water) */
            if (Is_airlevel(u.uz) || Is_waterlevel(u.uz))
                return false;
            /* even if we actually end up at same location, float_down()
               has already done trap and pickup actions of spoteffects() */
            if (newspot)
                await check_special_room(false); /* spoteffects */
            return true;
        }
        /* not mounted */

        /* if hiding on ceiling then don't automatically enter pool */
        /* C hack.c:3293: ceiling_hider reads permonst fields, not packed rows. */
        if (Upolyd(u) && pooleffects_ceiling_hider(permonstTemplate(u.umonnum)) && u.uundetected)
            return false;

        /* drown(),lava_effects() return true if hero changes
           location while surviving the problem */
        if (pooleffects_is_lava(u.ux, u.uy)) {
            if (await pooleffects_lava_effects())
                return true;
        } else if ((!pooleffects_Wwalking() || is_waterwall(u.ux, u.uy))
                   && (newspot || !u.uinwater
                       || !(pooleffects_Swimming() || pooleffects_Amphibious() || pooleffects_Breathless()))) {
            if (await pooleffects_drown())
                return true;
        }
    }
    return false;
}

// C ref: hack.c:3102-3140 switch_terrain(void) — moving onto different
// terrain; might be going into solid rock, inhibiting levitation or flight,
// or coming back out of such, reinstating levitation/flying. RNG-free
// (rng_calls_count: 0).
export async function switch_terrain() {
    const u = game.u;
    const lev = game.level?.at(u.ux, u.uy);
    const typ = lev ? (lev.typ | 0) : 0;
    const blocklev = IS_OBSTRUCTED(typ) || closed_door(u.ux, u.uy)
                      || IS_WATERWALL(typ) || typ === LAVAWALL;
    u.uprops ||= [];
    const levProp = u.uprops[LEVITATION] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const flyProp = u.uprops[FLYING] ||= { intrinsic: 0, extrinsic: 0, blocked: 0 };
    const was_levitating = !!((levProp.intrinsic | 0) || (levProp.extrinsic | 0)) && !(levProp.blocked | 0);
    const was_flying = !!_Flying();

    if (blocklev) {
        /* called from spoteffects(), stop levitating but skip float_down() */
        if (was_levitating)
            await pline("You can't levitate in here.");
        levProp.blocked = (levProp.blocked | 0) | FROMOUTSIDE;
    } else if (levProp.blocked | 0) {
        levProp.blocked = ((levProp.blocked | 0) & ~FROMOUTSIDE) | 0;
        /* we're probably levitating now; if not, we must be chained
           to a buried iron ball so get float_up() feedback for that */
        const nowLevitating = !!((levProp.intrinsic | 0) || (levProp.extrinsic | 0)) && !(levProp.blocked | 0);
        if (nowLevitating || (levProp.blocked | 0))
            await float_up();
    }
    /* the same terrain that blocks levitation also blocks flight */
    if (blocklev) {
        const nowFlying = !!_Flying();
        if (nowFlying)
            await pline("You can't fly in here.");
        flyProp.blocked = (flyProp.blocked | 0) | FROMOUTSIDE;
    } else if (flyProp.blocked | 0) {
        flyProp.blocked = ((flyProp.blocked | 0) & ~FROMOUTSIDE) | 0;
        float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        /* [minor bug: we don't know whether this is beginning flight or
           resuming it; that could be tracked so that this message could
           be adjusted to "resume flying", but isn't worth the effort...] */
        const nowFlying2 = !!_Flying();
        if (nowFlying2)
            await pline("You start flying.");
    }
    const isLevitating = !!((levProp.intrinsic | 0) || (levProp.extrinsic | 0)) && !(levProp.blocked | 0);
    const isFlying = !!_Flying();
    if ((isLevitating !== was_levitating) || (isFlying !== was_flying))
        SET_BOTL(); /* update Lev/Fly status condition */
    if (game.flags?.terrainstatus)
        classifyTerrain(); /* C hack.c:3215-3216 */
}

// C ref: hack.c:4460 inv_cnt — count objects in inventory chain
export function inv_cnt(incl_gold) {
    const g = game;
    let otmp = g.invent;
    let ct = 0;

    while (otmp) {
        if (incl_gold || otmp.invlet !== 0x24 /* GOLD_SYM */)
            ct++;
        otmp = otmp.nobj;
    }
    return ct;
}

/* C hack.c:59-65 Known_wwalking / Known_lwalking — the hero KNOWS the terrain is
 * safe only when the boots are identified water-walking boots, worn, not while
 * riding; lava additionally needs fire resistance and known-erodeproof boots. */
function _Known_wwalking() {
    const u = game.u || {};
    const uarmf = u.uarmf;
    return !!(uarmf && uarmf.otyp === WATER_WALKING_BOOTS_SMD
              && (game._oc_name_known && game._oc_name_known[WATER_WALKING_BOOTS_SMD])
              && !u.usteed);
}

function _Known_lwalking() {
    const uarmf = game.u?.uarmf;
    return !!(_Known_wwalking() && _uprop_active('FIRE_RES')
              && uarmf.oerodeproof && uarmf.rknown);
}

/* C objects.h WATER_WALKING_BOOTS = 167.  This read 87, which is the SLING;
 * js/cmd.js:17759 carries the correct 167 as WATER_WALKING_BOOTS_SIT and its
 * comment already recorded that this copy "is wrong the same way".  The
 * comment's claim that js/do_wear.js uses the same literal is false — that file
 * names 167 too (js/do_wear.js:803). */
const WATER_WALKING_BOOTS_SMD = 167;

function _u_simple_floortyp(x, y) {
    const u_in_air = _Levitation() || _Flying()
        || !pooleffects_grounded(_hero_youmonst().data);
    const loc = _levlAt(x, y);
    const typ = loc ? (loc.typ | 0) : STONE;

    if (IS_WATERWALL(typ))
        return WATER; /* wall of water, fly/lev does not matter */
    if (typ === LAVAWALL)
        return LAVAWALL; /* wall of lava, fly/lev does not matter */
    if (!u_in_air) {
        // C dbridge.c:46-59: a raised bridge is water only over a moat.
        if (is_pool(x, y))
            return POOL;
        if (flooreffects_is_lava(x, y))
            return LAVAPOOL;
    }
    return ROOM;
}

async function swim_move_danger(x, y) {
    const u = game.u || {};
    const newtyp = _u_simple_floortyp(x, y);
    const liquid_wall = IS_WATERWALL(newtyp) || newtyp === LAVAWALL;
    const _up = u.uprops || {};
    /* uprops is keyed by the NUMERIC prop index (see u_maybe_impaired); the
       string keys STUNNED/CONFUSION are never written, so a confused hero
       wrongly got "You avoid stepping into ..." where C walks in. */
    const Stunned = (_up[STUNNED]?.intrinsic) | 0;
    const Confusion = (_up[CONFUSION]?.intrinsic) | 0;
    const loc = _levlAt(x, y);
    /* PARANOID_SWIM — see the block comment above. */
    /* options.c:7173 default bits when the field is absent; an rc line such as
       paranoid_confirmation:die trap replaces them and clears SWIM. */
    const ParanoidSwim = !!(((game.flags?.paranoia_bits
                              ?? PARANOID_CONFIRMATION_DEFAULT_BITS) | 0) & PARANOID_SWIM);

    if (Underwater() && (is_pool(x, y) || IS_WATERWALL(newtyp)))
        return false;

    if (newtyp !== _u_simple_floortyp(u.ux, u.uy)
        && !Stunned && !Confusion && loc && (loc.seenv | 0)
        && (is_pool(x, y) || flooreffects_is_lava(x, y)
            || liquid_wall)) {
        if ((is_pool(x, y) && !_Known_wwalking())
            /* is_lava(ux,uy): don't move onto/over lava with known
               lava-walking because it isn't completely safe, but do
               continue to move over lava if already doing so */
            || (flooreffects_is_lava(x, y) && !_Known_lwalking()
                && !flooreffects_is_lava(u.ux, u.uy))
            || liquid_wall) {
            if (game.context?.nopick) {
                /* moving with m-prefix */
                _swim_arm_tip();
                return false;
            } else if (ParanoidSwim || liquid_wall) {
                await pline(`You avoid ${ing_suffix(u_locomotion("step"))} into the ${waterbody_name(x, y)}.`);
                await handle_tip(TIP_SWIM);
                return true;
            }
        }
    }
    return false;
}

/* C hack.c:1909 `svc.context.tips |= (1 << TIP_SWIM);` — the m-prefix arm marks
 * the tip as already-given without printing it, so a later non-prefixed bump
 * stays silent.  handle_tip() reads the same game.context.tips array. */
function _swim_arm_tip() {
    if (!game.context.tips)
        game.context.tips = [];
    game.context.tips[TIP_SWIM] = true;
}
