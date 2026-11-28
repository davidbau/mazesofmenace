// hack.js — movement and carrying-capacity routines.
// C ref: hack.c
//
// Ported so far: weight_cap(), inv_weight(), calc_capacity(),
// near_capacity(), lookaround(), domove()/domove_core() and test_move()
// for the parts reached so far; in_rooms(), move_update() and
// check_special_room() (its shop and special room messages aren't ported
// yet).

import { feeltrap } from './trap.js';
import { just_an } from './objnam.js';
import { mintrap, Trap_Effect_Finished, Trap_Caught_Mon, Trap_Killed_Mon,
         Trap_Moved_Mon } from './trap.js';
import { NO_TRAP_FLAGS, LL_CONDUCT, ParanoidTrap, ParanoidSwim,
         ParanoidConfirm, is_pit } from './const.js';
import { abuse_dog } from './dog.js';
import { adjalign } from './attrib.js';
import { livelog_printf, You_feel, verbalize, You_hear } from './display.js';
import { experience, more_experienced, newexplevel } from './exper.js';
import { monsndx, throws_rocks, amorphous, verysmall, bigmonst, hides_under,
         is_whirly, slithy, noncorporeal, is_clinger, strongmonst, tunnels,
         needspick, is_hider, noattacks } from './mondata.js';
import { breaktest } from './dothrow.js';
import { splitobj } from './mkobj.js';
import { setuwep } from './wield.js';
import { freeinv } from './invent.js';
import { AIR } from './const.js';
import { loot_mon } from './pickup.js';
import { dismount_steed } from './steed.js';
import { DISMOUNT_FELL, DISMOUNT_GENERIC, BRK_BY_HERO, BRK_FROM_INV, BRK_MELEE,
         BRK_KNOWN2BREAK, BRK_KNOWN2NOTBREAK } from './const.js';
import { hit_bars } from './mthrowu.js';
import { ansimpleoname } from './iactions.js';
import { helpless } from './monmove.js';
import { game } from './gstate.js';
import { rn2, rnd, d } from './rng.js';
import { S_PIERCER } from './monsters.js';
import { Amonnam } from './do_name.js';
import { ceiling } from './dungeon.js';
import { hard_helmet } from './do_wear.js';
import { helm_simple_name } from './objnam.js';
import { ARTICLE_A, RLOC_NOMSG } from './const.js';
import { Half_physical_damage } from './youprop.js';
import { mdamageu } from './mhitu.js';
import { mnexto } from './teleport.js';
import { ACURR, acurrstr, exercise } from './attrib.js';
import {
    A_CON, WT_WEIGHTCAP_STRCON, WT_WEIGHTCAP_SPARE, MAX_CARR_CAP, WT_HUMAN,
    WT_WOUNDEDLEG_REDUCT, UNENCUMBERED, OVERLOADED, LEVITATION,
    FLYING, WOUNDED_LEGS, LEFT_SIDE, RIGHT_SIDE, I_SPECIAL, Is_airlevel,
    isok, HALLUC, STONED, SLIMED, STRANGLED, SICK, M_AP_FURNITURE, M_AP_OBJECT,
    CONFUSION, STUNNED, BLINDED, WWALKING, STONE, ROOM, CORR, ICE, LAVAWALL,
    IS_OBSTRUCTED, IS_AIR, IS_WATERWALL,
    FUMBLING, PASSES_WALLS, DBWALL, IRONBARS, SHOPBASE, SLT_ENCUMBER, A_DEX,
    Is_waterlevel, HEADSTONE, GP_ALLOW_U, PROT_FROM_SHAPE_CHANGERS,
    D_BROKEN, D_NODOOR, NO_ROOM, SHARED, SHARED_PLUS, ROOMOFFSET, COLNO,
    ROWNO, xdir, ydir, DO_MOVE, TEST_MOVE, WT_TOOMUCH_DIAGONAL, IS_DOOR,
    IS_FURNITURE, SCORR, SDOOR, TREE, OROOM, P_AXE, ACCESSIBLE, IS_STWALL,
    TEMPLE, ZOO, SWAMP, COURT, LEPREHALL, MORGUE, BEEHIVE, COCKNEST, ANTHOLE,
    BARRACKS, DELPHI, THRONE, STEALTH, WT_ELF, WATER, POOL, LAVAPOOL, FIRE_RES,
} from './const.js';
import { waterbody_name } from './pager.js';
import { has_ceiling, record_achievement } from './insight.js';
import { ing_suffix, visctrl, upstart, NODIAG, s_suffix } from './hacklib.js';
import { cmd_from_func } from './cmd.js';
import { S_NYMPH, M2_STRONG, M2_ROCKTHROW, MZ_HUMAN, AT_BOOM, M1_HIDE,
         PM_GRID_BUG, mons, M1_TUNNEL, M1_NEEDPICK, M1_AMORPHOUS, MZ_SMALL,
         MZ_LARGE, M1_CONCEAL, S_VORTEX, PM_AIR_ELEMENTAL, M1_SLITHY, S_GHOST,
         PM_ORACLE, S_EEL, PM_DISPLACER_BEAST, M2_PNAME, AT_EXPL } from './monsters.js';
import { m_at, is_pool, is_lava, closed_door, may_passwall, sobj_at, goodpos,
         place_monster, accessible } from './makemon.js';
import { dig_typ, use_pick_axe2 } from './dig.js';
import { pline, canspotmon, mon_visible, newsym, sensemon, You, Your,
         You_cant, pline_The, There, unmap_invisible, unmap_object, map_invisible,
         glyph_is_invisible, map_object } from './display.js';
import { vision_recalc, couldsee, cansee } from './vision.js';
import { launch_obj, blow_up_landmine } from './trap.js';
import { Tobjnam, otense } from './objnam.js';
import { fill_pit } from './muse.js';
import { flooreffects } from './do.js';
import { useupf } from './invent.js';
import { bury_objs } from './dig.js';
import { ROLL, LAUNCH_KNOWN, IN_SIGHT, W_NONDIGGABLE } from './const.js';
import { glyph_at, Norep, feel_location, glyph_is_warning, pline_dir, pline_xy,
         pline_mon, set_msg_xy } from './display.js';
import { carrying } from './invent.js';
import { WAN_DIGGING, is_pick } from './objects.js';
import { u_at, Is_rogue_level, Upolyd } from './const.js';
import { fall_asleep } from './timeout.js';
import { t_at, VIBRATING_SQUARE, WEB, climb_pit, reset_utrap,
         sokoban_guilt } from './trap.js';
import { TT_BEARTRAP, TT_PIT, TT_WEB, TT_LAVA, TT_INFLOOR, TT_BURIEDBALL, TT_NONE } from './const.js';
import { ART_STING } from './artilist.js';
import { buried_ball, buried_ball_to_punishment } from './dig.js';
import { surface } from './iactions.js';
import { hliquid } from './potion.js';
import { dist2, distmin } from './hacklib.js';
import { selection_new, selection_free, selection_getpoint,
         selection_setpoint } from './selvar.js';
import { onscary, m_postmove_effect, can_fog } from './monmove.js';
import { COIN_CLASS, BOULDER, PICK_AXE, DWARVISH_MATTOCK, STATUE, WEAPON_CLASS,
         TOOL_CLASS, objects, WATER_WALKING_BOOTS } from './objects.js';
import { back_to_cmap, defsyms_explanation } from './pager.js';
import { u_on_newpos } from './mklev.js';
import { room_discovered } from './dungeon.js';
import { inside_room } from './sp_lev.js';
import { boulder_hits_pool } from './do.js';
import { ACH_TOWN } from './const.js';
import { RUN_TPORT, RUN_LEAP } from './const.js';
import { flush_screen as flush_screen_hk } from './display.js';
import { doopen_indir } from './lock.js';
import { do_attack } from './uhitm.js';
import { x_monnam, YMonnam, m_monnam, mon_nam, ARTICLE_NONE, ARTICLE_THE,
         ARTICLE_YOUR, SUPPRESS_SADDLE } from './do_name.js';
import { curr_mon_load } from './dogmove.js';
import { bad_rock, passes_bars, minliquid } from './mon.js';
import { engr_at, wipe_engr_at, can_reach_floor } from './engrave.js';
import { an, xname, The } from './objnam.js';
import { the } from './iactions.js';
import { obj_extract_self, place_object, level_objects_at } from './mkobj.js';
import { a_monnam, y_monnam } from './do_name.js';
import { set_ustuck, stumble_onto_mimic } from './uhitm.js';
import { CONFLICT, HVY_ENCUMBER } from './const.js';
import { gethungry } from './eat.js';
import { AT_ENGL, AT_HUGS, AD_STCK, AD_RUST, AD_CORR, M1_METALLIVORE } from './monsters.js';
import { WT_SQUEEZABLE_INV, A_STR, LANDMINE, SPIKED_PIT, PIT, HOLE, TRAPDOOR,
         LEVEL_TELEP, TELEP_TRAP, ROLLING_BOULDER_TRAP } from './const.js';
import { CORPSE } from './objects.js';
import { is_flyer, is_floater, dmgtype, digests } from './mondata.js';
import { float_vs_flight } from './polyself.js';
import { pickup } from './pickup.js';
import { shop_keeper, u_left_shop, u_entered_shop, costly_spot } from './shk.js';
import { IS_THRONE, IS_GRAVE, IS_FOUNTAIN, IS_ALTAR, D_ISOPEN, STAIRS,
         ECMD_TIME, ECMD_OK } from './const.js';
import { dotrap } from './trap.js';
import { immune_to_trap, into_vs_onto, u_locomotion, trapname,
         TRAPNUM } from './trap.js';
import { TRAP_CLEARLY_IMMUNE } from './const.js';
import { visible_region_at, reg_damg, in_out_region } from './region.js';
import { paranoid_query, floor_pile_at } from './cmd.js';
import { FROMOUTSIDE, MAX_TYPE, NO_TRAP, FAILEDUNTRAP, TIMEOUT, WARNING,
         IS_SINK } from './const.js';
import { M1_CLING, PM_SOLDIER, PM_SERGEANT, PM_LIEUTENANT, PM_CAPTAIN } from './monsters.js';
import { midnight } from './calendar.js';
import { Hello } from './role.js';
import { search_special } from './sounds.js';
import { DEAF } from './const.js';
import { wake_msg, seemimic, maybe_unhide_at, disturb_buried_zombies } from './mon.js';
import { drag_ball, move_bc } from './ball.js';
import { worm_cross } from './worm.js';
import {
    Fire_resistance, Cold_resistance, Punished, Stunned, Confusion, Blind, Hallucination,
    Fumbling, Warning, Stealth, Conflict, Levitation, Flying, HWwalking, EWwalking, Wwalking,
    Swimming, Amphibious, Breathless, Underwater, Passes_walls, Protection_from_shape_changers
} from './youprop.js';
import { l_nhcore_call } from './nhlua.js';
import { NUM_TIPS, TIP_ENHANCE, TIP_SWIM, TIP_UNTRAP_MON, TIP_GETPOS,
         NHCORE_GETPOS_TIP } from './const.js';
import { intemple } from './priest.js';
import { stucksteed, exercise_steed } from './steed.js';
import { drown, lava_effects, is_waterwall, set_uinwater, back_on_ground } from './trap.js';
import { docrt as docrt_pe } from './display.js';
import { PLNMSG_BACK_ON_GROUND, SWIMMING, MAGICAL_BREATHING } from './const.js';
import { M1_SWIM, M1_AMPHIBIOUS, M1_BREATHLESS } from './monsters.js';
import { map_object as map_object_hk } from './display.js';
import { is_ice as is_ice_sf } from './dig.js';
import { objdescr_is as objdescr_is_sf } from './o_init.js';
import { resists_cold as resists_cold_sf } from './mondata.js';
import { COLD_RES as COLD_RES_SF } from './const.js';
import { hideunder } from './makemon.js';
import { float_up as float_up_ht } from './trap.js';
import { DRAWBRIDGE_UP as DRAWBRIDGE_UP_SC, DB_UNDER as DB_UNDER_SC,
         DB_ICE as DB_ICE_SC, ICE as ICE_SC,
         MELT_ICE_AWAY as MELT_ICE_AWAY_SC } from './const.js';
import { spot_time_left as spot_time_left_sc,
         spot_stop_timers as spot_stop_timers_sc } from './timeout.js';
import { obj_ice_effects as obj_ice_effects_sc } from './mkobj.js';
import { is_rider } from './mondata.js';
import { PM_WIZARD_OF_YENDOR } from './monsters.js';
import { enexto, rloc_to } from './teleport.js';
import { revive_corpse } from './zap.js';
import { rn1 } from './rng.js';
import { doname } from './objnam.js';
import { losehp, selftouch, Maybe_Half_Phys } from './trap.js';
import { Ring_off, Boots_off, stop_donning, off_msg } from './do_wear.js';
import { LEVITATION_BOOTS, RIN_LEVITATION, is_weptool } from './objects.js';
import { NO_KILLER_PREFIX, W_ARTI, FROMFORM } from './const.js';
import { W_NONDIGGABLE as W_NONDIGGABLE_sc, IS_TREE, IS_WALL, DOOR as DOOR_sc,
         D_TRAPPED as D_TRAPPED_sc, NO_PART as NO_PART_sc,
         SHOP_DOOR_COST as SHOP_DOOR_COST_sc, P_RIDING as P_RIDING_hk,
         P_BASIC as P_BASIC_hk } from './const.js';
import { on_level as on_level_sc, assign_level as assign_level_sc } from './dungeon.js';
import { HEAVY_IRON_BALL as HEAVY_IRON_BALL_sc } from './objects.js';
import { metallivorous as metallivorous_sc } from './mondata.js';
import { sobj_at as sobj_at_sc, closed_door as closed_door_sc } from './makemon.js';
import { may_dig as may_dig_sc, watch_dig as watch_dig_sc, digging_ctx as digging_ctx_sc,
         clear_digging as clear_digging_sc } from './dig.js';
import { delobj as delobj_sc } from './invent.js';
import { block_point as block_point_sc, recalc_block_point as recalc_block_point_sc } from './vision.js';
import { add_damage as add_damage_sc, pay_for_damage as pay_for_damage_sc } from './shk.js';
import { acurrstr as acurrstr_sc } from './attrib.js';
import { morehungry as morehungry_sc } from './eat.js';
import { dissolve_bars as dissolve_bars_sc } from './monmove.js';
import { b_trapped as b_trapped_sc } from './trap.js';
import { autopick_testobj as autopick_testobj_hk } from './pickup.js';
import { P_SKILL as P_SKILL_hk } from './weapon.js';
import { uwep_skill_type as uwep_skill_type_fw, use_skill as use_skill_fw } from './weapon.js';
import { P_UNSKILLED as P_UNSKILLED_fw } from './const.js';
import { u_wield_art as u_wield_art_fw, is_blade as is_blade_fw } from './objects.js';
import { ART_STING as ART_STING_fw } from './artilist.js';
import { attacks as attacks_fw } from './artifact.js';
import { AD_FIRE as AD_FIRE_fw } from './monsters.js';
import { bare_artifactname as bare_artifactname_fw } from './iactions.js';
import { weapon_descr as weapon_descr_fw } from './insight.js';
import { makeplural as makeplural_fw } from './objnam.js';
import { You_cant as You_cant_fw } from './display.js';
import { deltrap as deltrap_fw } from './trap.js';
import { check_leash } from './apply.js';

// C's impossible() (pline.c) is not ported yet.
export function impossible(msg) { console.error(`impossible: ${msg}`); }

// C ref: hack.c revive_nasty()
export async function revive_nasty(x, y, msg) {
    let mtmp;
    const cc = { x: 0, y: 0 };
    let revived = false;

    /* for (otmp = svl.level.objects[x][y]; otmp; otmp = otmp2):
       the pile at <x,y> from the floor chain, read before any revival */
    const pile = level_objects_at(x, y);
    for (const otmp of pile) {
        if (otmp.otyp === CORPSE
            && (is_rider(mons[otmp.corpsenm])
                || otmp.corpsenm === PM_WIZARD_OF_YENDOR)) {
            /* move any living monster already at that location */
            if ((mtmp = m_at(x, y)) && enexto(cc, x, y, mtmp.data))
                await rloc_to(mtmp, cc.x, cc.y);
            if (msg)
                await Norep(msg);
            revived = !!(await revive_corpse(otmp));
        }
    }

    /* this location might not be safe, if not, move revived monster */
    if (revived) {
        mtmp = m_at(x, y);
        if (mtmp && !goodpos(x, y, mtmp, 0)
            && enexto(cc, x, y, mtmp.data)) {
            await rloc_to(mtmp, cc.x, cc.y);
        }
        /* else impossible? */
    }

    return revived;
}

// C ref: hack.c weight_cap()
export function weight_cap() {
    const g = game;
    const u = g.u;
    const lev = u.uprops[LEVITATION];
    const save_BLev = lev.blocked;
    let carrcap;

    /* boots of levitation being put on (afternmv == Boots_on): donning
       armor over several turns isn't ported yet */
    /* levitation is blocked by being trapped in the floor, but it still
       functions enough in that situation to enhance carrying capacity */
    lev.blocked &= ~I_SPECIAL;

    carrcap = (WT_WEIGHTCAP_STRCON * (acurrstr() + ACURR(A_CON)))
              + WT_WEIGHTCAP_SPARE;
    if (u.umonnum !== u.umonster) { /* Upolyd */
        const ptr = g.youmonst.data;
        /* consistent with can_carry() in mon.c */
        if (ptr.mlet === S_NYMPH)
            carrcap = MAX_CARR_CAP;
        else if (!ptr.cwt)
            carrcap = Math.trunc((carrcap * ptr.msize) / MZ_HUMAN);
        else if (!strongmonst(ptr)
                 || (strongmonst(ptr) && (ptr.cwt > WT_HUMAN)))
            carrcap = Math.trunc(carrcap * ptr.cwt / WT_HUMAN);
    }

    /* C ref: youprop.h Levitation, Flying (BFlying: not ported yet) */
    const Levitation = (lev.intrinsic || lev.extrinsic) && !lev.blocked;
    const Flying = !!(u.uprops[FLYING].intrinsic || u.uprops[FLYING].extrinsic);
    if (Levitation || Is_airlevel(u.uz) /* pugh@cornell */
        || (u.usteed && strongmonst(u.usteed.data))) {
        carrcap = MAX_CARR_CAP;
    } else {
        if (carrcap > MAX_CARR_CAP)
            carrcap = MAX_CARR_CAP;
        if (!Flying) {
            const EWounded_legs = u.uprops[WOUNDED_LEGS].extrinsic;
            if (EWounded_legs & LEFT_SIDE)
                carrcap -= WT_WOUNDEDLEG_REDUCT;
            if (EWounded_legs & RIGHT_SIDE)
                carrcap -= WT_WOUNDEDLEG_REDUCT;
        }
    }

    if (lev.blocked !== save_BLev) {
        lev.blocked = save_BLev;
        /* float_vs_flight(): not ported yet */
    }

    return Math.max(carrcap, 1); /* never return 0 */
}

// C ref: hack.c inv_weight()
/* returns how far beyond the normal capacity the hero is carrying */
export function inv_weight() {
    const g = game;
    let otmp = g.invent;
    let wt = 0;

    while (otmp) {
        if (otmp.oclass === COIN_CLASS)
            wt += Math.trunc((otmp.quan + 50) / 100);
        else if (otmp.otyp !== BOULDER || !throws_rocks(g.youmonst.data))
            wt += otmp.owt;
        otmp = otmp.nobj;
    }
    g.wc = weight_cap();
    return (wt - g.wc);
}

// C ref: hack.c calc_capacity()
export function calc_capacity(xtra_wt) {
    const wt = inv_weight() + xtra_wt;
    let cap;

    if (wt <= 0)
        return UNENCUMBERED;
    if (game.wc <= 1)
        return OVERLOADED;
    cap = Math.trunc((wt * 2) / game.wc) + 1;
    return Math.min(cap, OVERLOADED);
}

// C ref: hack.c trapmove()
/* try to escape being stuck in a trapped state by walking out of it;
   return true iff moving should continue to intended destination
   (all failures and most successful escapes leave hero at original spot) */
async function trapmove(x, y, /* targeted destination, <u.ux+u.dx,u.uy+u.dy> */
                        desttrap) /* nonnull if another trap at <x,y> */ {
    const u = game.u;
    let anchored = false;
    let predicament, culprit;
    const steedname = !u.usteed ? null : y_monnam(u.usteed);
    let wriggle_free = false;

    if (!u.utrap)
        return true; /* sanity check */

    /*
     * Note: caller should call reset_utrap() when we set u.utrap to 0.
     */

    switch (u.utraptype) {
    case TT_BEARTRAP:
        if (game.flags.verbose) {
            predicament = "caught in a bear trap";
            if (u.usteed)
                await Norep(`${upstart(steedname)} is ${predicament}.`);
            else
                await Norep(`You are ${predicament}.`);
        }
        /* [why does diagonal movement give quickest escape?] */
        if ((u.dx && u.dy) || !rn2(5))
            u.utrap--;
        if (!u.utrap)
            wriggle_free = true; /* goto wriggle_free */
        break;
    case TT_PIT:
        if (desttrap && desttrap.tseen
            && is_pit(desttrap.ttyp))
            return true; /* move into adjacent pit */
        /* try to escape; position stays same regardless of success */
        await climb_pit();
        break;
    case TT_WEB:
        if (game.uwep && game.uwep.oartifact === ART_STING) {
            /* escape trap but don't move and don't destroy it */
            u.utrap = 0; /* caller will call reset_utrap() */
            await pline("Sting cuts through the web!");
            break;
        }
        if (--u.utrap) {
            if (game.flags.verbose) {
                predicament = "stuck to the web";
                if (u.usteed)
                    await Norep(`${upstart(steedname)} is ${predicament}.`);
                else
                    await Norep(`You are ${predicament}.`);
            }
        } else {
            if (u.usteed)
                await pline(`${upstart(steedname)} breaks out of the web.`);
            else
                await You("disentangle yourself.");
        }
        break;
    case TT_LAVA:
        if (game.flags.verbose) {
            predicament = "stuck in the lava";
            if (u.usteed)
                await Norep(`${upstart(steedname)} is ${predicament}.`);
            else
                await Norep(`You are ${predicament}.`);
        }
        if (!is_lava(x, y)) {
            u.utrap--;
            if ((u.utrap & 0xff) === 0) {
                u.utrap = 0;
                if (u.usteed)
                    await You(`lead ${steedname} to the edge of the ${
                        hliquid("lava")}.`);
                else
                    await You(`pull yourself to the edge of the ${
                        hliquid("lava")}.`);
            }
        }
        u.umoved = true;
        break;
    case TT_INFLOOR:
    case TT_BURIEDBALL:
        anchored = (u.utraptype === TT_BURIEDBALL);
        if (anchored) {
            const cc = { x: u.ux, y: u.uy };

            /* can move normally within radius 1 of buried ball */
            if (buried_ball(cc) && dist2(x, y, cc.x, cc.y) <= 2) {
                /* ugly hack: we need to issue some message here
                   in case "you are chained to the buried ball"
                   was the most recent message given, otherwise
                   our next attempt to move out of tether range
                   after this successful move would have its
                   can't-do-that message suppressed by Norep */
                if (game.flags.verbose)
                    await Norep("You move within the chain's reach.");
                return true;
            }
        }
        if (--u.utrap) {
            if (game.flags.verbose) {
                if (anchored) {
                    predicament = "chained to the";
                    culprit = "buried ball";
                } else {
                    predicament = "stuck in the";
                    culprit = surface(u.ux, u.uy);
                }
                if (u.usteed) {
                    if (anchored)
                        await Norep(`You and ${steedname} are ${predicament} ${
                            culprit}.`);
                    else
                        await Norep(`${upstart(steedname)} is ${predicament} ${
                            culprit}.`);
                } else
                    await Norep(`You are ${predicament} ${culprit}.`);
            }
        } else {
            wriggle_free = true;
        }
        break;
    case TT_NONE:
        impossible("trapmove: trapped in nothing?");
        break;
    default:
        impossible(`trapmove: stuck in unknown trap? (${u.utraptype})`);
        break;
    }
    if (wriggle_free) {
        /* wriggle_free: */
        if (u.usteed)
            await pline(`${upstart(steedname)} finally ${
                !anchored ? "lurches" : "wrenches the ball"} free.`);
        else
            await You(`finally ${
                !anchored ? "wriggle" : "wrench the ball"} free.`);
        if (anchored)
            await buried_ball_to_punishment();
    }
    return false;
}

// C ref: hack.c u_rooted()
export async function u_rooted() {
    if (!game.youmonst.data.mmove) {
        await You(`are rooted ${Levitation() || Is_airlevel(game.u.uz)
                                || Is_waterlevel(game.u.uz)
                                ? "in place" : "to the ground"}.`);
        nomul(0);
        return true;
    }
    return false;
}

// C ref: hack.c near_capacity()
export function near_capacity() {
    return calc_capacity(0);
}

// C ref: hack.c pickup_checks()
/* return 1 if a pickup was attempted (time passes), 0 if not, -1 if the
   normal pickup can proceed, -2 to loot an engulfer's inventory */
async function pickup_checks() {
    const u = game.u;

    /* uswallow case added by GAN 01/29/87 */
    if (u.uswallow) {
        if (!u.ustuck.minvent) {
            if (digests(u.ustuck.data)) {
                await You(`pick up ${s_suffix(mon_nam(u.ustuck))} tongue.`);
                await pline("But it's kind of slimy, so you drop it.");
            } else
                await You(`don't ${Blind() ? "feel" : "see"} anything in here to pick up.`);
            return 1;
        } else {
            return -2; /* loot the monster inventory */
        }
    }
    if (is_pool(u.ux, u.uy))
        throw new Error('pickup_checks(): picking things up in water not ported yet');
    if (is_lava(u.ux, u.uy))
        throw new Error('pickup_checks(): picking things up in lava not ported yet');
    if (!(game.level.objects || []).some(o => o.ox === u.ux && o.oy === u.uy
                                         && o.where === 'OBJ_FLOOR')) { /* !OBJ_AT() */
        const lev = game.level.at(u.ux, u.uy);

        if (IS_THRONE(lev.typ))
            await pline(`It must weigh${lev.looted ? " almost" : ""} a ton!`);
        else if (IS_SINK(lev.typ))
            await pline_The("plumbing connects it to the floor.");
        else if (IS_GRAVE(lev.typ))
            await You("don't need a gravestone.  Yet.");
        else if (IS_FOUNTAIN(lev.typ))
            await You(`could drink the ${hliquid("water")}...`);
        else if (IS_DOOR(lev.typ) && (lev.doormask & D_ISOPEN))
            await pline("It won't come off the hinges.");
        else if (IS_ALTAR(lev.typ))
            await pline("Moving the altar would be a very bad idea.");
        else if (lev.typ === STAIRS)
            await pline_The("stairs are solidly affixed.");
        else
            await pline("There is nothing here to pick up."); /* There() */
        return 0;
    }
    const traphere = t_at(u.ux, u.uy);
    if (!can_reach_floor(traphere && is_pit(traphere.ttyp)))
        throw new Error('pickup_checks(): "You cannot reach the <surface>." not ported yet');
    return -1; /* can do normal pickup */
}

// C ref: hack.c dopickup() -- the #pickup command
export async function dopickup() {
    const count = game.command_count || 0;
    let ret;

    game.multi = 0; /* always reset */

    if ((ret = await pickup_checks()) >= 0) {
        return ret ? ECMD_TIME : ECMD_OK;
    } else if (ret === -2) {
        const tmpcount = { passed_info: -count };
        return (await loot_mon(game.u.ustuck, tmpcount, null)) ? ECMD_TIME
                                                              : ECMD_OK;
    } /* else ret == -1 */

    return (await pickup(-count)) ? ECMD_TIME : ECMD_OK;
}

// C ref: hack.c max_capacity()
export function max_capacity() {
    const wt = inv_weight();

    return (wt - (2 * game.wc));
}

// C ref: hack.c inv_cnt()
export function inv_cnt(incl_gold) {
    let otmp = game.invent;
    let ct = 0;

    while (otmp) {
        if (incl_gold || otmp.invlet !== '$') /* GOLD_SYM */
            ct++;
        otmp = otmp.nobj;
    }
    return ct;
}

// C ref: hack.c check_capacity()
export async function check_capacity(str) {
    if (near_capacity() >= 4 /* EXT_ENCUMBER */) {
        if (str)
            await pline(str);
        else
            await You_cant("do that while carrying so much stuff.");
        return 1;
    }
    return 0;
}

// C ref: hack.c overexertion()
/* used to be called in attack() after hitum();
   now also called after an action that took a lot of effort */
export async function overexertion() {
    /* this used to be part of domove() when moving to a monster's
       position, but is now called by do_attack() so that it doesn't
       execute if you decline to attack a peaceful monster */
    await gethungry();
    if ((game.moves % 3) !== 0 && near_capacity() >= HVY_ENCUMBER) {
        await overexert_hp();
    }
    return (game.multi < 0); /* might have fainted (forced to sleep) */
}

// C ref: hack.c overexert_hp()
/* HP loss or passing out from overexerting yourself */
export async function overexert_hp() {
    const u = game.u;

    if (!Upolyd() ? (u.uhp > 1) : (u.mh > 1)) {
        if (!Upolyd()) u.uhp -= 1; else u.mh -= 1;
        game.disp_botl = true;
    } else {
        await You("pass out from exertion!");
        await exercise(A_CON, false);
        await fall_asleep(-10, false);
    }
}

// C ref: hack.c monster_nearby()
export function monster_nearby() {
    const u = game.u;
    const Hallucination = !!(u.uprops[HALLUC]?.intrinsic || u.uprops[HALLUC]?.extrinsic);

    /* Also see the similar check in dochugw() in monmove.c */
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            if (!isok(x, y) || (x === u.ux && y === u.uy))
                continue;
            const mtmp = m_at(x, y);
            if (mtmp
                && mtmp.m_ap_type !== M_AP_FURNITURE
                && mtmp.m_ap_type !== M_AP_OBJECT
                && (Hallucination
                    || (!mtmp.mpeaceful && !noattacks(mtmp.data)))
                && (!(mtmp.data.mflags1 & M1_HIDE) || !mtmp.mundetected)
                && !(mtmp.msleeping || !mtmp.mcanmove) /* !helpless() */
                && !onscary(u.ux, u.uy, mtmp) && canspotmon(mtmp))
                return 1;
        }
    return 0;
}

// C ref: do.c danger_uprops()
function danger_uprops() {
    const p = game.u.uprops;
    const on = (i) => !!(p[i]?.intrinsic || p[i]?.extrinsic);
    return (on(STONED) || on(SLIMED) || on(STRANGLED) || on(SICK));
}

// C ref: do.c cmd_safety_prevention() -- flagcounter names the game
// field C passes by address
export async function cmd_safety_prevention(ucverb, cmddesc, act, flagcounter) {
    const g = game;
    if (g.flags.safe_wait !== false && !g.iflags.menu_requested && !g.multi) {
        let buf = '';
        /* iflags.cmdassist (default on) || !(*flagcounter)++ */
        let assist = (g.iflags.cmdassist !== false);
        if (!assist) {
            const prev = g[flagcounter] || 0;
            g[flagcounter] = prev + 1;
            assist = !prev;
        }
        if (assist) /* visctrl(cmd_from_func(do_reqmenu)): the default 'm' */
            buf = `  Use 'm' prefix to force ${cmddesc}.`;
        if (monster_nearby()) {
            await Norep(`${act}${buf}`);
            return true;
        } else if (danger_uprops()) {
            await Norep(`${ucverb} doesn't feel like a good idea right now.`);
            return true;
        }
    }
    g[flagcounter] = 0;
    return false;
}

// C ref: display.h _is_safemon() -- is_safemon(mon)
export function is_safemon(mtmp) {
    const P = game.u.uprops;
    const has = (p) => !!(P[p]?.intrinsic || P[p]?.extrinsic);
    return game.flags.safe_dog !== false && mtmp.mpeaceful && canspotmon(mtmp)
           && !has(CONFUSION) && !has(HALLUC) && !has(STUNNED);
}

// C ref: defsym.h S_vcdoor, S_hcdoor (pchar indices)
const S_vcdoor = 15, S_hcdoor = 16;

// C ref: monst.h is_door_mappear()
export function is_door_mappear(mon) {
    return mon.m_ap_type === M_AP_FURNITURE
           && (mon.mappearance === S_hcdoor || mon.mappearance === S_vcdoor);
}

// C ref: dbridge.c is_pool_or_lava()
export function is_pool_or_lava(x, y) {
    return is_pool(x, y) || is_lava(x, y);
}

// C ref: hack.c avoid_moving_on_trap()
async function avoid_moving_on_trap(x, y, msg) {
    const trap = t_at(x, y);

    if (trap && trap.tseen
        /* the vibrating square is implemented as a trap but treated as if
           it were a type of terrain */
        && trap.ttyp !== VIBRATING_SQUARE) {
        if (msg && game.flags.mention_walls) {
            set_msg_xy(x, y);
            await You(`stop in front of ${an(trapname(trap.ttyp, false))}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c avoid_moving_on_liquid()
async function avoid_moving_on_liquid(x, y, msg) {
    const u = game.u;
    const P = u.uprops;
    const has = (p) => !!(P[p]?.intrinsic || P[p]?.extrinsic);
    const in_air = has(LEVITATION) || has(FLYING);
    const loc = game.level.at(x, y);
    /* Known_wwalking/Known_lwalking: whether worn water/lava walking boots
       are identified isn't tracked yet; only intrinsic water walking */
    const Known_wwalking = has(WWALKING);
    const Known_lwalking = false;

    /* don't stop if you're not on a transition between terrain types... */
    if ((loc.typ === game.level.at(u.ux, u.uy).typ
         /* or you are using shift-dir running and the transition isn't
            dangerous... */
         || (game.context.run < 2 && (!is_lava(x, y) || in_air))
         || game.context.travel)
        /* and you know you won't fall in */
        && (in_air || Known_lwalking || (is_pool(x, y) && Known_wwalking))
        && !(IS_WATERWALL(loc.typ) || loc.typ === LAVAWALL)) {
        return false; /* liquid is safe to traverse */
    } else if (is_pool_or_lava(x, y) && loc.seenv) {
        if (msg && game.flags.mention_walls) {
            set_msg_xy(x, y);
            await You(`stop at the edge of the ${
                hliquid(is_pool(x, y) ? "water" : "lava")}.`);
        }
        return true;
    }
    return false;
}

// C ref: hack.c lookaround()
export async function lookaround() {
    const g = game;
    const u = g.u;
    let x0 = 0, y0 = 0, m0 = 1, i0 = 9;
    let i;
    let corrct = 0, noturn = 0;
    let mtmp;
    const Blind = !!(u.uprops[BLINDED]?.intrinsic || u.uprops[BLINDED]?.extrinsic);

    /* Grid bugs stop if trying to move diagonal, even if blind.  Maybe */
    /* they polymorphed while in the middle of a long move. */
    if (u.umonnum === PM_GRID_BUG /* NODIAG(u.umonnum) */ && u.dx && u.dy) {
        await pline("You cannot move diagonally.");
        nomul(0);
        return;
    }

    if (Blind || g.context.run === 0)
        return;
    for (let x = u.ux - 1; x <= u.ux + 1; x++)
        for (let y = u.uy - 1; y <= u.uy + 1; y++) {
            const infront = (x === u.ux + u.dx && y === u.uy + u.dy);
            let stop = false, bcorr = false;

            /* ignore out of bounds, and our own location */
            if (!isok(x, y) || (x === u.ux && y === u.uy))
                continue;
            /* (grid bugs) ignore diagonals */
            if (u.umonnum === PM_GRID_BUG && x !== u.ux && y !== u.uy)
                continue;

            /* can we see a monster there? */
            if ((mtmp = m_at(x, y)) != null
                && mtmp.m_ap_type !== M_AP_FURNITURE
                && mtmp.m_ap_type !== M_AP_OBJECT
                && mon_visible(mtmp)) {
                /* running movement and not a hostile monster */
                /* OR it blocks our move direction and we're not traveling */
                if ((g.context.run !== 1 && !is_safemon(mtmp))
                    || (infront && !g.context.travel)) {
                    if (g.flags.mention_walls)
                        await pline_xy(x, y, `${upstart(a_monnam(mtmp))} blocks your path.`);
                    nomul(0); /* goto stop */
                    return;
                }
            }

            const loc = g.level.at(x, y);
            /* stone is never interesting */
            if (loc.typ === STONE)
                continue;
            /* ignore the square we're moving away from */
            if (x === u.ux - u.dx && y === u.uy - u.dy)
                continue;

            /* stop for traps, sometimes */
            if (await avoid_moving_on_trap(x, y, (infront && g.context.run > 1))) {
                if (g.context.run === 1)
                    bcorr = true; /* goto bcorr: if you must */
                else if (infront)
                    stop = true; /* goto stop */
            }

            if (!bcorr && !stop) {
                /* more uninteresting terrain */
                if (IS_OBSTRUCTED(loc.typ) || loc.typ === ROOM
                    || IS_AIR(loc.typ) || loc.typ === ICE) {
                    continue;
                } else if (closed_door(x, y) || (mtmp && is_door_mappear(mtmp))) {
                    /* a closed door? */
                    /* ignore if diagonal */
                    if (x !== u.ux && y !== u.uy)
                        continue;
                    if (g.context.run !== 1 && !g.context.travel) {
                        if (g.flags.mention_walls) {
                            set_msg_xy(x, y);
                            await You("stop in front of the door.");
                        }
                        stop = true; /* goto stop */
                    } else {
                        /* orthogonal to a closed door, consider it a
                           corridor */
                        bcorr = true; /* goto bcorr */
                    }
                } else if (loc.typ === CORR) {
                    bcorr = true; /* corridor */
                } else if (is_pool_or_lava(x, y)) {
                    if (infront && await avoid_moving_on_liquid(x, y, true))
                        stop = true; /* goto stop */
                    else
                        continue;
                } else { /* e.g. objects or trap or stairs */
                    if (g.context.run === 1)
                        bcorr = true; /* goto bcorr */
                    else if (g.context.run === 8)
                        continue;
                    else if (mtmp)
                        continue; /* d */
                    else if (((x === u.ux - u.dx) && (y !== u.uy + u.dy))
                             || ((y === u.uy - u.dy) && (x !== u.ux + u.dx)))
                        continue;
                    else
                        stop = true;
                }
            }
            if (bcorr) {
                /* bcorr: */
                if (g.level.at(u.ux, u.uy).typ !== ROOM) {
                    /* running or traveling */
                    if (g.context.run === 1 || g.context.run === 3
                        || g.context.run === 8) {
                        /* distance from x,y to location we're moving to */
                        i = dist2(x, y, u.ux + u.dx, u.uy + u.dy);
                        /* ignore if not on or directly adjacent to it */
                        if (i > 2)
                            continue;
                        /* x,y is (adjacent to) the location we're moving to;
                           if we've seen one corridor, and x,y is not directly
                           orthogonally next to it, mark noturn */
                        if (corrct === 1 && dist2(x, y, x0, y0) !== 1)
                            noturn = 1;
                        /* if previous x,y was diagonal, now x,y is
                           orthogonal (or this is first time we're here) */
                        if (i < i0) {
                            i0 = i;
                            x0 = x;
                            y0 = y;
                            m0 = mtmp ? 1 : 0;
                        }
                    }
                    corrct++;
                }
                continue;
            }
            /* stop: */
            nomul(0);
            return;
        } /* end for loops */

    if (corrct > 1 && g.context.run === 2) {
        if (g.flags.mention_walls)
            await pline("The corridor widens here.");
        nomul(0); /* goto stop */
        return;
    }
    if ((g.context.run === 1 || g.context.run === 3 || g.context.run === 8)
        && !noturn && !m0 && i0
        && (corrct === 1 || (corrct === 2 && i0 === 1))) {
        /* make sure that we do not turn too far */
        if (i0 === 2) {
            if (u.dx === y0 - u.uy && u.dy === u.ux - x0)
                i = 2; /* straight turn right */
            else
                i = -2; /* straight turn left */
        } else if (u.dx && u.dy) {
            if ((u.dx === u.dy && y0 === u.uy) || (u.dx !== u.dy && y0 !== u.uy))
                i = -1; /* half turn left */
            else
                i = 1; /* half turn right */
        } else {
            if ((x0 - u.ux === y0 - u.uy && !u.dy)
                || (x0 - u.ux !== y0 - u.uy && u.dy))
                i = 1; /* half turn right */
            else
                i = -1; /* half turn left */
        }

        i += u.last_str_turn || 0;
        if (i <= 2 && i >= -2) {
            u.last_str_turn = i;
            u.dx = x0 - u.ux;
            u.dy = y0 - u.uy;
        }
    }
}

// C ref: hack.c end_running()
export function end_running(and_travel) {
    const g = game;
    /* moveloop() suppresses time_botl when context.run is non-zero; when
       running stops, update 'time' even if other botl status is unchanged */
    if (g.context.run) {
        g.context.run = 0;
        if (g.flags.time)
            g.disp_time_botl = true;
        /* flags.terrainstatus: classify_terrain() isn't ported yet */
    }

    /* 'context.mv' isn't travel but callers who want to end travel
       all clear it too */
    if (and_travel)
        g.context.travel = g.context.travel1 = g.context.mv = 0;
    if (g.travelmap) {
        selection_free(g.travelmap, true);
        g.travelmap = null;
    }
    /* cancel multi */
    if (g.multi > 0)
        g.multi = 0;
}

// C ref: hack.c u_simple_floortyp()
/* Return a simplified floor solid/liquid state based on hero's state */
function u_simple_floortyp(x, y) {
    const ptr = game.youmonst.data;
    /* grounded(): !is_flyer && !is_floater && (!is_clinger || !has_ceiling) */
    const grounded = !is_flyer(ptr) && !is_floater(ptr)
                     && (!is_clinger(ptr) || !has_ceiling(game.u.uz));
    const u_in_air = (Levitation() || Flying() || !grounded);

    if (isok(x, y) && IS_WATERWALL(game.level.at(x, y).typ)) /* is_waterwall() */
        return WATER; /* wall of water, fly/lev does not matter */
    if (game.level.at(x, y).typ === LAVAWALL)
        return LAVAWALL; /* wall of lava, fly/lev does not matter */
    if (!u_in_air) {
        if (is_pool(x, y))
            return POOL;
        if (is_lava(x, y))
            return LAVAPOOL;
    }
    return ROOM;
}

// C ref: hack.c Known_wwalking, Known_lwalking
/* XXX: if more sources of water walking than just boots are added,
   cause_known(insight.c) should be externified and used for this */
function Known_wwalking() {
    const uarmf = game.uarmf;
    return !!(uarmf && uarmf.otyp === WATER_WALKING_BOOTS
              && objects[WATER_WALKING_BOOTS].oc_name_known
              && !game.u.usteed);
}
function Known_lwalking() {
    return Known_wwalking() && Fire_resistance()
           && !!game.uarmf.oerodeproof && !!game.uarmf.rknown;
}

// C ref: hack.c swim_move_danger()
/* Is it dangerous for hero to move to x,y due to water or lava? */
async function swim_move_danger(x, y) {
    const u = game.u;
    const newtyp = u_simple_floortyp(x, y);
    const liquid_wall = IS_WATERWALL(newtyp) || newtyp === LAVAWALL;

    if (Underwater() && (is_pool(x, y) || IS_WATERWALL(newtyp)))
        return false;

    if ((newtyp !== u_simple_floortyp(u.ux, u.uy))
        && !Stunned() && !Confusion() && game.level.at(x, y).seenv
        && (is_pool(x, y) || is_lava(x, y) || liquid_wall)) {

        /* FIXME: This can be exploited to identify ring of fire resistance
         * if the player is wearing it unidentified and has identified
         * fireproof boots of water walking and is walking over lava. However,
         * this is such a marginal case that it may not be worth fixing. */
        if ((is_pool(x, y) && !Known_wwalking())
            /* is_lava(ux,uy): don't move onto/over lava with known
               lava-walking because it isn't completely safe, but do
               continue to move over lava if already doing so */
            || (is_lava(x, y) && !Known_lwalking() && !is_lava(u.ux, u.uy))
            || liquid_wall) {
            if (game.context.nopick) {
                /* moving with m-prefix */
                game.context.tips = (game.context.tips || 0) | (1 << TIP_SWIM);
                return false;
            } else if (ParanoidSwim() || liquid_wall) {
                await You(`avoid ${ing_suffix(u_locomotion("step"))} into the ${
                    waterbody_name(x, y)}.`);
                await handle_tip(TIP_SWIM);
                return true;
            }
        }
    }
    return false;
}

// C ref: hack.c handle_tip() -- maybe show a helpful gameplay tip?
// returns True if tip gets shown
export async function handle_tip(tip) {
    if (game.flags.tips === false) /* flags.tips: On by default */
        return false;

    const ctx = game.context;
    if (tip >= 0 && tip < NUM_TIPS && !((ctx.tips || 0) & (1 << tip))) {
        ctx.tips = (ctx.tips || 0) | (1 << tip);
        /* the "Tip:" prefix is a hint to use of OPTIONS=!tips to suppress */
        switch (tip) {
        case TIP_ENHANCE:
            await pline("(Tip: use the #enhance command to advance them.)");
            break;
        case TIP_SWIM:
            await pline(`(Tip: use '${visctrl(cmd_from_func("do_reqmenu"))}' prefix to step in if you really want to.)`);
            break;
        case TIP_UNTRAP_MON:
            await pline("(Tip: perhaps #untrap would help?)");
            break;
        case TIP_GETPOS:
            await l_nhcore_call(NHCORE_GETPOS_TIP);
            break;
        default:
            impossible(`Unknown tip in handle_tip(${tip})`);
            break;
        }
        return true;
    }
    return false;
}

// C ref: hack.c nomul()
export function nomul(nval) {
    const g = game;
    if (g.multi < nval)
        return;              /* This is a bug fix by ab@unido */
    if (g.multi >= 0) g.disp_botl = true;
    g.u.uinvulnerable = 0; /* Kludge to avoid ctrl-C bug -dlc */
    g.u.usleep = 0;
    g.multi = nval;
    if (nval === 0)
        g.multi_reason = null;
    end_running(true);
    g.cmdq = []; /* cmdq_clear(CQ_CANNED) */
}

/* ── C ref: hack.c domove() and the parts of domove_core() reached so far ── */

/* C ref: rm.h Sokoban -- svl.level.flags.sokoban_rules */
function Sokoban() { return !!game.level.flags.sokoban_rules; }
/* C ref: monst.h helpless(), mundisplaceable() */
function mundisplaceable(mon) {
    return !!(mon.ispriest || mon.isshk || mon.isgd
              || mon.data === mons[PM_ORACLE]
              || (game.quest_status?.leader_m_id
                  && mon.m_id === game.quest_status.leader_m_id));
}

/* C ref: decl.c dirs_ord[] -- reordered directions, cardinals first */
const dirs_ord = [0 /* DIR_W */, 2 /* DIR_N */, 4 /* DIR_E */, 6 /* DIR_S */,
                  1 /* DIR_NW */, 3 /* DIR_NE */, 5 /* DIR_SE */, 7 /* DIR_SW */];

// C ref: hack.c u_maybe_impaired()
export function u_maybe_impaired() {
    return (Stunned() || (Confusion() && !rn2(5)));
}

// C ref: cmd.c confdir()
export function confdir(force_impairment) {
    const u = game.u;
    if (force_impairment || u_maybe_impaired()) {
        const kmax = NODIAG(u.umonnum) ? (8 / 2) : 8,
              k = dirs_ord[rn2(kmax)];

        u.dx = xdir[k];
        u.dy = ydir[k];
    }
}

// C ref: cmd.c xytodir() -- convert an x,y pair into a direction code
export function xytodir(x, y) {
    for (let dd = 0; dd < 8; dd++)
        if (x === xdir[dd] && y === ydir[dd])
            return dd;
    return -1; /* DIR_ERR */
}

// C ref: cmd.c directionname()
export function directionname(dir) {
    const dirnames = [
        "west",      "northwest", "north",     "northeast", "east",
        "southeast", "south",     "southwest", "down",      "up",
    ];

    if (dir < 0 || dir >= 10)
        return "invalid";
    return dirnames[dir];
}

// C ref: hack.c in_rooms()
/* returns the room numbers (each + ROOMOFFSET) the spot is in, as a string
   of character codes like C's char buf; typewanted 0 means any room type */
export function in_rooms(x, y, typewanted) {
    const rooms = game.level.rooms;
    let ptr = '';
    let typefound;
    let step;

    const goodtype = (rno) =>
        (!typewanted
         || (typefound = rooms[rno - ROOMOFFSET].rtype) === typewanted
         || (typewanted === SHOPBASE && typefound > SHOPBASE));

    let rno = game.level.at(x, y)?.roomno ?? NO_ROOM;
    switch (rno) {
    case NO_ROOM:
        return ptr;
    case SHARED:
        step = 2;
        break;
    case SHARED_PLUS:
        step = 1;
        break;
    default: /* i.e. a regular room # */
        if (goodtype(rno))
            ptr = String.fromCharCode(rno) + ptr;
        return ptr;
    }

    let min_x = x - 1;
    let max_x = x + 1;
    if (x < 1)
        min_x += step;
    else if (x >= COLNO)
        max_x -= step;

    let min_y = y - 1;
    let max_y_offset = 2;
    if (min_y < 0) {
        min_y += step;
        max_y_offset -= step;
    } else if ((min_y + max_y_offset) >= ROWNO)
        max_y_offset -= step;

    for (x = min_x; x <= max_x; x += step) {
        for (let yy = 0; yy <= max_y_offset; yy += step) {
            rno = game.level.at(x, min_y + yy)?.roomno ?? NO_ROOM;
            if (rno >= ROOMOFFSET && !ptr.includes(String.fromCharCode(rno))
                && goodtype(rno))
                ptr = String.fromCharCode(rno) + ptr;
        }
    }
    return ptr;
}

// C ref: hack.c move_update()
export function move_update(newlev) {
    const u = game.u;
    const rooms = game.level.rooms;

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
    u.urooms = in_rooms(u.ux, u.uy, 0);

    let entered = '', shops = '', shops_entered = '';
    for (const c of u.urooms) {
        if (!u.urooms0.includes(c))
            entered += c;
        if (rooms[c.charCodeAt(0) - ROOMOFFSET].rtype >= SHOPBASE) { /* IS_SHOP() */
            shops += c;
            if (!u.ushops0.includes(c))
                shops_entered += c;
        }
    }
    u.uentered = entered;
    u.ushops = shops;
    u.ushops_entered = shops_entered;

    /* filter u.ushops0 -> u.ushops_left */
    let left = '';
    for (const c of u.ushops0)
        if (!u.ushops.includes(c))
            left += c;
    u.ushops_left = left;
}

// C ref: hack.c in_town()
export function in_town(x, y) {
    let has_subrooms = false;

    if (!game.level.flags.has_town)
        return false;

    /*
     * See if (x,y) is in a room with subrooms, if so, assume it's the
     * town.  If there are no subrooms, the whole level is in town.
     */
    for (const sroom of game.level.rooms) {
        if (!sroom || !(sroom.hx > 0)) break;
        if (sroom.nsubrooms > 0) {
            has_subrooms = true;
            if (inside_room(sroom, x, y))
                return true;
        }
    }

    return !has_subrooms;
}

// C ref: hack.c check_special_room()
/* possibly deliver a one-time room entry message; the special room
   messages other than shops aren't ported yet */
export async function check_special_room(newlev) {
    const u = game.u;
    const rooms = game.level.rooms;

    move_update(newlev);

    if (u.ushops0)
        await u_left_shop(u.ushops_left, newlev);

    /*
     * Check for attaining 'entered Mine Town' achievement.
     * Most of the Mine Town variations have the town in one large room
     * containing a bunch of subrooms; we check for entering that large
     * room.  However, two of the variations cover the whole level rather
     * than include a room with subrooms.  We need to check for town entry
     * before the possible early return for not having entered a room in
     * case we have arrived in the town but have not entered any room.
     */
    if (game.level.flags?.has_town && !game.context?.achieveo?.minetn_reached
        && u.uz.dnum === game.dungeon_topology.d_mines_dnum /* In_mines() */
        && in_town(u.ux, u.uy)) {
        record_achievement(ACH_TOWN);
        if (!game.context.achieveo) game.context.achieveo = {};
        game.context.achieveo.minetn_reached = true;
    }

    if (!u.uentered && !u.ushops_entered) /* implied by newlev */
        return; /* no entrance messages necessary */

    /* Did we just enter a shop? */
    if (u.ushops_entered)
        await u_entered_shop(u.ushops_entered);

    for (const c of u.uentered) {
        const roomno = c.charCodeAt(0) - ROOMOFFSET;
        let rt = rooms[roomno].rtype;
        let msg_given = true;

        /* Did we just enter some other special room? */
        /* vault.c insists that a vault remain a VAULT,
         * and temples should remain TEMPLEs,
         * but everything else gives a message only the first time */
        switch (rt) {
        case ZOO:
            await pline("Welcome to David's treasure zoo!");
            break;
        case SWAMP:
            await pline(`It ${Blind() ? "feels" : "looks"} rather ${
                Blind() ? "humid" : "muddy"} down here.`);
            break;
        case COURT:
            await You(`enter an opulent${
                /* the throne room in Sam quest home level lacks a throne */
                !furniture_present(THRONE, roomno) ? "" : " throne"} room!`);
            break;
        case LEPREHALL:
            await You("enter a leprechaun hall!");
            break;
        case MORGUE:
            if (midnight()) {
                const run = u_locomotion("Run");

                await pline(`${run} away!  ${run} away!`);
            } else
                await You("have an uncanny feeling...");
            break;
        case BEEHIVE:
            await You("enter a giant beehive!");
            break;
        case COCKNEST:
            await You("enter a disgusting nest!");
            break;
        case ANTHOLE:
            await You("enter an anthole!");
            break;
        case BARRACKS:
            if (monstinroom(mons[PM_SOLDIER], roomno)
                || monstinroom(mons[PM_SERGEANT], roomno)
                || monstinroom(mons[PM_LIEUTENANT], roomno)
                || monstinroom(mons[PM_CAPTAIN], roomno))
                await You("enter a military barracks!");
            else
                await You("enter an abandoned barracks.");
            break;
        case DELPHI: {
            const oracle = monstinroom(mons[PM_ORACLE], roomno);

            if (oracle) {
                /* SetVoice(oracle, 0, 80, 0): no voices */
                if (!oracle.mpeaceful)
                    await verbalize(`You're in Delphi, ${game.plname}.`);
                else
                    await verbalize(`${Hello(null)}, ${game.plname}, welcome to Delphi!`);
            } else
                msg_given = false;
            break;
        }
        case TEMPLE:
            await intemple(roomno + ROOMOFFSET);
            /* FALLTHRU */
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
                switch (rt) {
                case COURT:
                    game.level.flags.has_court = 0;
                    break;
                case SWAMP:
                    game.level.flags.has_swamp = 0;
                    break;
                case MORGUE:
                    game.level.flags.has_morgue = 0;
                    break;
                case ZOO:
                    game.level.flags.has_zoo = 0;
                    break;
                case BARRACKS:
                    game.level.flags.has_barracks = 0;
                    break;
                case TEMPLE:
                    game.level.flags.has_temple = 0;
                    break;
                case BEEHIVE:
                    game.level.flags.has_beehive = 0;
                    break;
                }
            }
            if (rt === COURT || rt === SWAMP || rt === MORGUE || rt === ZOO)
                for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
                    if (mtmp.mhp <= 0) /* DEADMONSTER() */
                        continue;
                    if (!isok(mtmp.mx, mtmp.my)
                        || roomno !== game.level.at(mtmp.mx, mtmp.my).roomno)
                        continue;
                    if (!Stealth() && !rn2(3)) { /* Stealth */
                        await wake_msg(mtmp, false);
                        mtmp.msleeping = 0;
                    }
                }
        }
    }
}

// C ref: hack.c monstinroom()
function monstinroom(mdat, roomno) {
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if (mtmp.mhp <= 0) /* DEADMONSTER() */
            continue;
        if (mtmp.data === mdat
            && in_rooms(mtmp.mx, mtmp.my, 0).includes(String.fromCharCode(roomno + ROOMOFFSET)))
            return mtmp;
    }
    return null;
}

// C ref: hack.c furniture_present()
/* check whether room contains a particular type of furniture */
function furniture_present(furniture, roomno) {
    let x, y;
    const sroom = game.level.rooms[roomno];

    const ly = sroom.ly, hy = sroom.hy;
    const lx = sroom.lx, hx = sroom.hx;
    /* the inside_room() check handles irregularly shaped rooms */
    for (y = ly; y <= hy; ++y)
        for (x = lx; x <= hx; ++x)
            if (game.level.at(x, y).typ === furniture && inside_room(sroom, x, y))
                return true;
    return false;
}

/* C ref: youprop.h Levitation, Flying -- with the BLevitation/BFlying
   blocks (uprops[].blocked), as switch_terrain() needs them */
function sp_prop(p) {
    return game.u.uprops[p] || { intrinsic: 0, extrinsic: 0, blocked: 0 };
}
function sp_Levitation() {
    const p = sp_prop(LEVITATION);
    return !!((p.intrinsic || p.extrinsic) && !p.blocked);
}
function sp_Flying() {
    const p = sp_prop(FLYING);
    return !!((p.intrinsic || p.extrinsic
               || (game.u.usteed && is_flyer(game.u.usteed.data)))
              && !p.blocked);
}

// C ref: hack.c switch_terrain()
/* moving onto different terrain might cause Lev or Fly to toggle */
export async function switch_terrain() {
    const u = game.u;
    const lev = game.level.at(u.ux, u.uy);
    const blocklev = (IS_OBSTRUCTED(lev.typ) || closed_door(u.ux, u.uy)
                      || IS_WATERWALL(lev.typ)
                      || lev.typ === LAVAWALL);
    const was_levitating = sp_Levitation(), was_flying = sp_Flying();
    const BLev = sp_prop(LEVITATION), BFly = sp_prop(FLYING);

    if (blocklev) {
        /* called from spoteffects(), stop levitating but skip float_down() */
        if (sp_Levitation())
            await You_cant("levitate in here.");
        BLev.blocked |= FROMOUTSIDE;
    } else if (BLev.blocked) {
        BLev.blocked &= ~FROMOUTSIDE;
        /* we're probably levitating now; if not, we must be chained
           to a buried iron ball so get float_up() feedback for that */
        if (sp_Levitation() || BLev.blocked)
            await float_up_ht();
    }
    /* the same terrain that blocks levitation also blocks flight */
    if (blocklev) {
        if (sp_Flying())
            await You_cant("fly in here.");
        BFly.blocked |= FROMOUTSIDE;
    } else if (BFly.blocked) {
        BFly.blocked &= ~FROMOUTSIDE;
        float_vs_flight(); /* maybe toggle (BFlying & I_SPECIAL) */
        if (sp_Flying())
            await You("start flying.");
    }
    if ((sp_Levitation() !== was_levitating) || (sp_Flying() !== was_flying))
        game.disp_botl = true; /* update Lev/Fly status condition */

    /* if (flags.terrainstatus) classify_terrain(): the option isn't
       ported */
}

// C ref: hack.c pooleffects()
/* extracted from spoteffects; called by spoteffects to check for entering or
   leaving a pool of water/lava, and by moveloop to check for staying on one;
   returns true to skip rest of spoteffects */
export async function pooleffects(newspot) /* true if called by spoteffects */ {
    const u = game.u;

    /* check for leaving water */
    if (u.uinwater) {
        let still_inwater = false; /* assume we're getting out */

        if (!is_pool(u.ux, u.uy)) {
            if (Is_waterlevel(u.uz)) {
                await You("pop into an air bubble.");
                game.iflags.last_msg = PLNMSG_BACK_ON_GROUND;
            } else if (is_lava(u.ux, u.uy)) {
                await You(`leave the ${hliquid("water")}...`); /* oops! */
            } else {
                await back_on_ground(false);
            }
        } else if (Is_waterlevel(u.uz)) {
            still_inwater = true;
        } else if (sp_Levitation()) {
            await You(`pop out of the ${hliquid("water")} like a cork!`);
        } else if (sp_Flying()) {
            await You(`fly out of the ${hliquid("water")}.`);
        } else if (Wwalking()) {
            await You("slowly rise above the surface.");
        } else {
            still_inwater = true;
        }
        if (!still_inwater) {
            const was_underwater = (u.uinwater && !Is_waterlevel(u.uz));

            await set_uinwater(0); /* u.uinwater = 0; leave the water */
            if (was_underwater) { /* restore vision */
                await docrt_pe();
                game.vision_full_recalc = 1;
            }
        }
    }

    /* check for entering water or lava */
    if (!u.ustuck && !sp_Levitation() && !sp_Flying()
        && (is_pool(u.ux, u.uy) || is_lava(u.ux, u.uy))) {
        if (u.usteed && !(!is_flyer(u.usteed.data) && !is_floater(u.usteed.data)
                          && !is_clinger(u.usteed.data))) { /* !grounded() */
            /* floating or clinging steed keeps hero safe (is_flyer() test
               is redundant; it can't be true since Flying yielded false) */
            return false;
        } else if (u.usteed) {
            /* steed enters pool */
            await dismount_steed(Underwater() ? DISMOUNT_FELL : DISMOUNT_GENERIC);
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
        if (u.umonnum !== u.umonster && is_hider(mons[u.umonnum])
            && u.uundetected) /* Upolyd && ceiling_hider() */
            return false;

        /* drown(),lava_effects() return true if hero changes
           location while surviving the problem */
        if (is_lava(u.ux, u.uy)) {
            if (await lava_effects())
                return true;
        } else if ((!Wwalking() || is_waterwall(u.ux, u.uy))
                   && (newspot || !u.uinwater
                       || !(Swimming() || Amphibious() || Breathless()))) {
            if (await drown())
                return true;
        }
    }
    return false;
}

/* C ref: hack.c spoteffects() static locals */
let inspoteffects = 0;
let spotloc = { x: 0, y: 0 };
let spotterrain = STONE;
let spottrap = null;
let spottraptyp = NO_TRAP;

// C ref: hack.c dosinkfall()
async function dosinkfall() {
    const u = game.u;
    const fell_on_sink = "fell onto a sink";
    const HLev = sp_prop(LEVITATION), HFly = sp_prop(FLYING);
    let obj;
    let dmg;
    let lev_boots = !!(game.uarmf && game.uarmf.otyp === LEVITATION_BOOTS);
    const innate_lev = ((HLev.intrinsic & (FROMOUTSIDE | FROMFORM)) !== 0),
          /* to handle being chained to buried iron ball, trying to
             levitate but being blocked, then moving onto adjacent sink;
             no need to worry about being blocked by terrain because we
             couldn't be over a sink at the same time */
          blockd_lev = (HLev.blocked === I_SPECIAL),
          ufall = (!innate_lev && !blockd_lev
                   && !(HFly.intrinsic || HFly.extrinsic)); /* BFlying */

    if (!ufall) {
        await You((innate_lev || blockd_lev) ? "wobble unsteadily for a moment."
                                             : "gain control of your flight.");
    } else {
        const save_ELev = HLev.extrinsic, save_HLev = HLev.intrinsic;

        /* fake removal of levitation in advance so that final
           disclosure will be right in case this turns out to
           be fatal; fortunately the fact that rings and boots
           are really still worn has no effect on bones data */
        HLev.extrinsic = HLev.intrinsic = 0;
        await You("crash to the floor!");
        dmg = rn1(8, 25 - ACURR(A_CON));
        await losehp(Maybe_Half_Phys(dmg), fell_on_sink, NO_KILLER_PREFIX);
        await exercise(A_DEX, false);
        await selftouch("Falling, you");
        /* svl.level.objects[u.ux][u.uy] via ->nexthere */
        for (obj of floor_pile_at(u.ux, u.uy))
            if (obj.oclass === WEAPON_CLASS || is_weptool(obj)) {
                await You(`fell on ${doname(obj)}.`);
                await losehp(Maybe_Half_Phys(rnd(3)), fell_on_sink,
                             NO_KILLER_PREFIX);
                await exercise(A_CON, false);
            }
        HLev.extrinsic = save_ELev;
        HLev.intrinsic = save_HLev;
    }

    /*
     * Interrupt multi-turn putting on/taking off of armor (in which
     * case we reached the sink due to being teleported while busy;
     * in 3.4.3, Boots_on()/Boots_off() [called via (*afternmv)() when
     * 'multi' reaches 0] triggered a crash if we were donning/doffing
     * levitation boots [because the Boots_off() below causes 'uarmf'
     * to be null by the time 'afternmv' gets called]).
     *
     * Interrupt donning/doffing if we fall onto the sink, or if the
     * code below is going to remove levitation boots even when we
     * haven't fallen (innate floating or flying becoming unblocked).
     */
    if (ufall || lev_boots) {
        await stop_donning(lev_boots ? game.uarmf : null);
        /* recalculate in case uarmf just got set to null */
        lev_boots = !!(game.uarmf && game.uarmf.otyp === LEVITATION_BOOTS);
    }

    /* remove worn levitation items */
    HLev.extrinsic &= ~W_ARTI;
    HLev.intrinsic &= ~(I_SPECIAL | TIMEOUT);
    HLev.intrinsic++;
    if (game.uleft && game.uleft.otyp === RIN_LEVITATION) {
        obj = game.uleft;
        await Ring_off(obj);
        await off_msg(obj);
    }
    if (game.uright && game.uright.otyp === RIN_LEVITATION) {
        obj = game.uright;
        await Ring_off(obj);
        await off_msg(obj);
    }
    if (lev_boots) {
        obj = game.uarmf;
        await Boots_off();
        await off_msg(obj);
    }
    HLev.intrinsic--;
    /* probably moot; we're either still levitating or went
       through float_down(), but make sure BFlying is up to date */
    float_vs_flight();
}

// C ref: hack.c spoteffects()
export async function spoteffects(pick) {
    const u = game.u;
    let mtmp;
    let trap = t_at(u.ux, u.uy);
    const trapflag = game.iflags?.failing_untrap ? FAILEDUNTRAP : 0;

    /* prevent recursion from affecting the hero all over again
       [hero poly'd to iron golem enters water here, drown() inflicts
       damage that triggers rehumanize() which calls spoteffects()...] */
    if (inspoteffects && u.ux === spotloc.x && u.uy === spotloc.y
        /* except when reason is transformed terrain (ice -> water) */
        && spotterrain === game.level.at(u.ux, u.uy).typ
        /* or transformed trap (land mine -> pit) */
        && (!spottrap || !trap || trap.ttyp === spottraptyp))
        return;
    /* when float_down() puts hero into lava and she teleports out,
       defer spoteffects() until after "you are back on solid <surface>" */
    if (game.iflags?.in_lava_effects)
        return;

    ++inspoteffects;
    spotterrain = game.level.at(u.ux, u.uy).typ;
    spotloc = { x: u.ux, y: u.uy };

    /* moving onto different terrain might cause Lev or Fly to toggle;
      level change sets <ux0,uy0> to <ux,uy>, so this spotterrain
      check always fails then, but it also sets iflags.terrain_typ */
    if (spotterrain !== game.level.at(u.ux0, u.uy0).typ
        || (game.iflags?.terrain_typ ?? MAX_TYPE) === MAX_TYPE)
        await switch_terrain();

    /* if (pooleffects(TRUE)) goto spotdone; */
    if (!await pooleffects(true)) {
        await check_special_room(false);
        if (IS_SINK(game.level.at(u.ux, u.uy).typ) && sp_Levitation())
            await dosinkfall();
        if (!game.in_steed_dismounting) { /* if dismounting, check again later */
            const HLev = sp_prop(LEVITATION);

            /* if levitation is due to time out at the end of this
               turn, allowing it to do so could give the perception
               that a trap here is being triggered twice, so adjust
               the timeout to prevent that */
            if (trap && (HLev.intrinsic & TIMEOUT) === 1
                && !(HLev.extrinsic || (HLev.intrinsic & ~(I_SPECIAL | TIMEOUT))))
                throw new Error('spoteffects(): levitation timing out over a trap not ported yet');
            /*
             * If not a pit, pickup before triggering trap.
             * If pit, trigger trap before pickup.
             */
            const pit = (trap && is_pit(trap.ttyp));
            if (pick && !pit)
                await pickup(1);

            if (trap) {
                /*
                 * dotrap on a fire trap calls melt_ice() which triggers
                 * spoteffects() (again) which can trigger the same fire
                 * trap (again).  Use static spottrap to prevent that.
                 * We track spottraptyp because some traps morph (landmine
                 * to pit) and any new trap type should get triggered.
                 */
                if (!spottrap || spottraptyp !== trap.ttyp) {
                    spottrap = trap;
                    spottraptyp = trap.ttyp;
                    await dotrap(trap, trapflag); /* fall into arrow trap, etc. */
                    spottrap = null;
                    spottraptyp = NO_TRAP;
                }
            }
            if (pick && pit)
                await pickup(1);
        }
        /* Warning alerts you to ice danger */
        if (Warning() && is_ice_sf(u.ux, u.uy)) {
            const icewarnings = [
                "The ice seems very soft and slushy.",
                "You feel the ice shift beneath you!",
                "The ice, is gonna BREAK!", /* The Dead Zone */
            ];
            const time_left = spot_time_left_sc(u.ux, u.uy, MELT_ICE_AWAY_SC);

            if (time_left && time_left < 15)
                await pline(icewarnings[(time_left < 5) ? 2
                                        : (time_left < 10) ? 1
                                          : 0]);
        }

        if ((mtmp = m_at(u.ux, u.uy)) != null && !u.uswallow) {
            mtmp.mundetected = mtmp.msleeping = 0;
            switch (mtmp.data.mlet) {
            case S_PIERCER:
                await pline(`${Amonnam(mtmp)} suddenly drops from the ${
                    ceiling(u.ux, u.uy)}!`);
                if (mtmp.mtame) { /* jumps to greet you, not attack */
                    ;
                } else if (hard_helmet(game.uarmh)) {
                    await pline(`Its blow glances off your ${
                        helm_simple_name(game.uarmh)}.`);
                } else if (u.uac + 3 <= rnd(20)) {
                    await You(`are almost hit by ${
                        x_monnam(mtmp, ARTICLE_A, "falling", 0, true)}!`);
                } else {
                    let dmg;

                    await You(`are hit by ${
                        x_monnam(mtmp, ARTICLE_A, "falling", 0, true)}!`);
                    dmg = d(4, 6);
                    if (Half_physical_damage())
                        dmg = Math.trunc((dmg + 1) / 2);
                    await mdamageu(mtmp, dmg);
                }
                break;
            default: /* monster surprises you. */
                if (mtmp.mtame)
                    await pline(`${Amonnam(mtmp)} jumps near you from the ${
                        ceiling(u.ux, u.uy)}.`);
                else if (mtmp.mpeaceful) {
                    await You(`surprise ${(Blind() && !sensemon(mtmp))
                                          ? "something" : a_monnam(mtmp)}!`);
                    mtmp.mpeaceful = 0;
                } else
                    await pline(`${Amonnam(mtmp)} attacks you by surprise!`);
                break;
            }
            await mnexto(mtmp, RLOC_NOMSG); /* have to move the monster */
        }
    }
    /* spotdone: */
    if (!--inspoteffects) {
        spotterrain = STONE; /* 0 */
        spotloc = { x: 0, y: 0 };
    }
}

/* C ref: shk.c IS_SHOP() -- indexes rooms[] by its argument as given */
function IS_SHOP(x) {
    return (game.level.rooms?.[x]?.rtype ?? 0) >= SHOPBASE;
}


/* C ref: '*in_rooms(x, y, SHOPBASE)' -- the first char of the buffer,
   '\0' when the spot is in no shop */
function first_shop_rno(x, y) {
    const ptr = in_rooms(x, y, SHOPBASE);
    return ptr.length ? ptr.charCodeAt(0) : 0;
}

// C ref: shk.c block_door() -- shopkeepers aren't created by the JS
// port yet, so a shop door is never blocked
function block_door(x, y) {
    const roomno = first_shop_rno(x, y);

    if (roomno < 0 || !IS_SHOP(roomno))
        return false;
    if (!IS_DOOR(game.level.at(x, y).typ))
        return false;
    if (roomno !== ((game.u.ushops || '').charCodeAt(0) || 0))
        return false;
    if (shop_keeper(roomno))
        throw new Error('block_door(): shopkeepers not ported yet');
    return false;
}

// C ref: shk.c block_entry()
function block_entry(x, y) {
    const u = game.u;
    if (!(IS_DOOR(game.level.at(u.ux, u.uy).typ)
          && game.level.at(u.ux, u.uy).doormask === D_BROKEN))
        return false;

    const roomno = first_shop_rno(x, y);
    if (roomno < 0 || !IS_SHOP(roomno))
        return false;
    if (shop_keeper(roomno))
        throw new Error('block_entry(): shopkeepers not ported yet');
    return false;
}

// C ref: hack.c doorless_door()
export function doorless_door(x, y) {
    const lev_p = game.level.at(x, y);

    if (!IS_DOOR(lev_p.typ))
        return false;
    /* all rogue level doors are doorless but disallow diagonal access, so
       we treat them as if their non-existent doors were actually present */
    if (Is_rogue_level(game.u.uz))
        return false;
    return !(lev_p.doormask & ~(D_NODOOR | D_BROKEN));
}

// C ref: hack.c cant_squeeze_thru() -- the hero's case
function cant_squeeze_thru_u() {
    const ptr = game.youmonst.data;

    if (Passes_walls())
        return 0;

    /* too big? */
    if (bigmonst(ptr)
        && !(amorphous(ptr) || is_whirly(ptr) || noncorporeal(ptr)
             || slithy(ptr) || can_fog(game.youmonst)))
        return 1;

    /* lugging too much junk? */
    const amt = inv_weight() + weight_cap();
    if (amt > WT_TOOMUCH_DIAGONAL)
        return 2;

    /* Sokoban restriction applies to hero only */
    if (Sokoban())
        return 3;

    /* can squeeze through */
    return 0;
}

/* C ref: hack.c findtravelpath() mode values */
const TRAVP_TRAVEL = 0;
const TRAVP_GUESS = 1;
const TRAVP_VALID = 2;

/* C ref: monmove.c can_ooze() for the hero -- amorphous and carrying
   nothing (stuff_prevents_passage(), as test_move() approximates it) */
function can_ooze_u() {
    return amorphous(game.youmonst.data) && !game.invent;
}

// C ref: hack.c crawl_destination() -- used by findtravelpath() when the
// destination is one step away
export function crawl_destination(x, y) {
    const u = game.u;
    /* is location ok in general? */
    if (!goodpos(x, y, game.youmonst, 0))
        return false;

    /* orthogonal movement is unrestricted when destination is ok */
    if (x === u.ux || y === u.uy)
        return true;

    /* diagonal movement has some restrictions */
    if (NODIAG(u.umonnum))
        return false; /* poly'd into a grid bug... */
    if (Passes_walls())
        return true; /* or a xorn... */
    /* pool could be next to a door, conceivably even inside a shop */
    if (IS_DOOR(game.level.at(x, y).typ)
        && (!doorless_door(x, y) || block_door(x, y)))
        return false;
    /* finally, are we trying to squeeze through a too-narrow gap? */
    return !(bad_rock(game.youmonst.data, u.ux, y)
             && bad_rock(game.youmonst.data, x, u.uy)
             && cant_squeeze_thru_u());
}

// C ref: hack.c findtravelpath()
/*
 * Find a path from the destination (u.tx,u.ty) back to (u.ux,u.uy).
 * A shortest path is returned.  If guess is TRUE, consider various
 * inaccessible locations as valid intermediate path points.
 * Returns TRUE if a path was found.
 * gt.travelmap keeps track of map locations we've moved through
 * this travel session. It will be cleared once the travel stops.
 */
async function findtravelpath(mode) {
    const u = game.u;
    const ctx = game.context;

    if (!game.travelmap)
        game.travelmap = selection_new();
    /* if travel to adjacent, reachable location, use normal movement rules */
    if ((mode === TRAVP_TRAVEL || mode === TRAVP_VALID) && ctx.travel1
        /* was '&& distmin(u.ux, u.uy, u.tx, u.ty) == 1' */
        && distmin(u.ux, u.uy, u.tx, u.ty) === 1 /* next2u(): one step away */
        /* handle restricted diagonals */
        && crawl_destination(u.tx, u.ty)) {
        end_running(false);
        if (await test_move(u.ux, u.uy, u.tx - u.ux, u.ty - u.uy, TEST_MOVE)) {
            if (mode === TRAVP_TRAVEL) {
                u.dx = u.tx - u.ux;
                u.dy = u.ty - u.uy;
                nomul(0);
                game.iflags.travelcc = { x: 0, y: 0 };
            }
            return true;
        }
        if (mode === TRAVP_TRAVEL)
            ctx.run = 8;
    }
    if (u.tx !== u.ux || u.ty !== u.uy) {
        let travel;
        const travelstepx = [[], []];
        const travelstepy = [[], []];
        let tx, ty, ux, uy;
        let n = 1;      /* max offset in travelsteps */
        let set = 0;    /* two sets current and previous */
        let radius = 1; /* search radius */

        /* If guessing, first find an "obvious" goal location.  The obvious
         * goal is the position the player knows of, or might figure out
         * (couldsee) that is closest to the target on a straight path.
         */
        if (mode === TRAVP_GUESS || mode === TRAVP_VALID) {
            tx = u.ux;
            ty = u.uy;
            ux = u.tx;
            uy = u.ty;
        } else {
            tx = u.tx;
            ty = u.ty;
            ux = u.ux;
            uy = u.uy;
        }

        for (;;) { /* noguess: */
            travel = [];
            for (let i = 0; i < COLNO; i++)
                travel.push(new Array(ROWNO).fill(0));
            travelstepx[0][0] = tx;
            travelstepy[0][0] = ty;

            while (n !== 0) {
                let nn = 0;

                for (let i = 0; i < n; i++) {
                    const x = travelstepx[set][i];
                    const y = travelstepy[set][i];
                    /* no diagonal movement for grid bugs */
                    const dirmax = NODIAG(u.umonnum) ? 4 : 8; /* N_DIRS */
                    let alreadyrepeated = false;

                    for (let dir = 0; dir < dirmax; ++dir) {
                        const nx = x + xdir[dirs_ord[dir]];
                        const ny = y + ydir[dirs_ord[dir]];

                        /*
                         * When guessing and trying to travel as close as
                         * possible to an unreachable target space, don't
                         * include spaces that would never be picked as a
                         * guessed target in the travel matrix describing
                         * hero-reachable spaces.  This stops travel from
                         * getting confused and moving the hero back and
                         * forth in certain degenerate configurations of
                         * sight-blocking obstacles.
                         */
                        if (!isok(nx, ny)
                            || ((mode === TRAVP_GUESS) && !couldsee(nx, ny)))
                            continue;
                        if ((!Passes_walls() && !can_ooze_u()
                             && closed_door(x, y))
                            || (sobj_at(BOULDER, x, y)
                                && !could_move_onto_boulder(x, y))
                            || await test_move(x, y, nx - x, ny - y, TEST_TRAP)) {
                            /* closed doors and boulders usually cause a
                               delay, so prefer another path; however, giants
                               and tiny creatures can use m<dir> to move onto
                               a boulder's spot without pushing, so allow
                               boulders for them */
                            if (travel[x][y] > radius - 3) {
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
                        if (await test_move(x, y, nx - x, ny - y, TEST_TRAV)
                            && (game.level.at(nx, ny).seenv
                                || (!Blind() && couldsee(nx, ny)))) {
                            if (nx === ux && ny === uy) {
                                if (mode === TRAVP_TRAVEL || mode === TRAVP_VALID) {
                                    const visited
                                        = !!selection_getpoint(x, y, game.travelmap);
                                    u.dx = x - ux;
                                    u.dy = y - uy;
                                    if (mode === TRAVP_TRAVEL
                                        && ((x === u.tx && y === u.ty)
                                            || visited)) {
                                        nomul(0);
                                        /* reset run so domove run checks work */
                                        ctx.run = 8;
                                        if (visited)
                                            await You("stop, unsure which way to go.");
                                        else
                                            game.iflags.travelcc = { x: 0, y: 0 };
                                    }
                                    selection_setpoint(u.ux, u.uy,
                                                       game.travelmap, 1);
                                    return true;
                                }
                            } else if (!travel[nx][ny]) {
                                travelstepx[1 - set][nn] = nx;
                                travelstepy[1 - set][nn] = ny;
                                travel[nx][ny] = radius;
                                nn++;
                            }
                        }
                    }
                }

                /* iflags.trav_debug: DEBUG only */

                n = nn;
                set = 1 - set;
                radius++;
            }

            /* if guessing, find best location in travel matrix and go there */
            if (mode === TRAVP_GUESS) {
                let px = tx, py = ty; /* pick location */
                let dist, nxtdist, d2, nd2;
                let ctrav, ptrav = COLNO * ROWNO;

                dist = distmin(ux, uy, tx, ty);
                d2 = dist2(ux, uy, tx, ty);
                for (tx = 1; tx < COLNO; ++tx)
                    for (ty = 0; ty < ROWNO; ++ty)
                        if (couldsee(tx, ty) && (ctrav = travel[tx][ty]) > 0) {
                            nxtdist = distmin(ux, uy, tx, ty);
                            if (nxtdist === dist && ctrav < ptrav) {
                                nd2 = dist2(ux, uy, tx, ty);
                                if (nd2 < d2) {
                                    /* prefer non-zigzag path */
                                    px = tx;
                                    py = ty;
                                    d2 = nd2;
                                    ptrav = ctrav;
                                }
                            } else if (nxtdist < dist) {
                                px = tx;
                                py = ty;
                                dist = nxtdist;
                                d2 = dist2(ux, uy, tx, ty);
                                ptrav = ctrav;
                            }
                        }

                if (u_at(px, py)) {
                    /* no guesses, just go in the general direction */
                    u.dx = Math.sign(u.tx - u.ux);
                    u.dy = Math.sign(u.ty - u.uy);
                    if (await test_move(u.ux, u.uy, u.dx, u.dy, TEST_MOVE)) {
                        selection_setpoint(u.ux, u.uy, game.travelmap, 1);
                        return true;
                    }
                    break; /* goto found */
                }
                /* iflags.trav_debug: DEBUG only */
                tx = px;
                ty = py;
                ux = u.ux;
                uy = u.uy;
                set = 0;
                n = radius = 1;
                mode = TRAVP_TRAVEL;
                continue; /* goto noguess */
            }
            return false;
        }
    }

    /* found: */
    u.dx = 0;
    u.dy = 0;
    nomul(0);
    return false;
}

// C ref: hack.c is_valid_travelpt()
export async function is_valid_travelpt(x, y) {
    const u = game.u;
    const tx = u.tx;
    const ty = u.ty;
    const glyph = glyph_at(x, y);

    if (u_at(x, y))
        return true;
    /* glyph_is_cmap(glyph) && S_stone == glyph_to_cmap(glyph): the shown
       glyph is a background one that is blank and remembered as S_stone
       (a never-seen spot shows GLYPH_UNEXPLORED, which isn't cmap) */
    if (isok(x, y) && glyph.kind === 'cmap' && glyph.ch === ' '
        && game.level.at(x, y).remembered_glyph?.cmap === 'S_stone'
        && !game.level.at(x, y).seenv)
        return false;
    u.tx = x;
    u.ty = y;
    const ret = await findtravelpath(TRAVP_VALID);
    u.tx = tx;
    u.ty = ty;
    return ret;
}

/* C ref: hack.h test_move() modes */
const TEST_TRAV = 2; /* test a future travel location */
const TEST_TRAP = 3; /* check if a future travel loc is a trap */

// C ref: hack.c test_move()
export async function test_move(ux, uy, dx, dy, mode) {
    const u = game.u;
    const x = ux + dx;
    const y = uy + dy;

    game.context.door_opened = 0;

    if (!isok(x, y))
        return false;

    const tmpr = game.level.at(x, y);

    /*
     *  Check for physical obstacles.  First, the place we are going.
     */
    if (IS_OBSTRUCTED(tmpr.typ) || tmpr.typ === IRONBARS) {
        if (Blind() && mode === DO_MOVE)
            feel_location(x, y);
        if (Passes_walls() && may_passwall(x, y)) {
            ; /* do nothing */
        } else if (Underwater()) {
            if (mode === DO_MOVE)
                await There("is an obstacle there.");
            return false;
        } else if (tmpr.typ === IRONBARS) {
            const ydat = game.youmonst.data;
            if (mode === DO_MOVE
                && (dmgtype(ydat, AD_RUST)
                    || dmgtype(ydat, AD_CORR)
                    || (ydat.mflags1 & M1_METALLIVORE) !== 0) /* metallivorous() */
                && await still_chewing(x, y)) {
                return false;
            }
            if (!(Passes_walls() || passes_bars(ydat))) {
                if (mode === DO_MOVE && game.flags.mention_walls)
                    await You("cannot pass through the bars.");
                return false;
            }
        } else if (tunnels(game.youmonst.data)
                   && !needspick(game.youmonst.data)) {
            /* Eat the rock. */
            if (mode === DO_MOVE && await still_chewing(x, y))
                return false;
        } else if (game.flags.autodig && !game.context.run
                   && !game.context.nopick && game.uwep
                   && is_pick(game.uwep)) {
            /* MRKR: Automatic digging when wielding the appropriate tool */
            if (mode === DO_MOVE)
                /* (void) */ await use_pick_axe2(game.uwep);
            return false;
        } else {
            if (mode === DO_MOVE) {
                if (tmpr.typ === DBWALL) { /* is_db_wall() */
                    await pline("That drawbridge is up!");
                } else if (Passes_walls() && !may_passwall(x, y)
                           && Sokoban()) {
                    /* soko restriction stays even after puzzle is solved */
                    await pline_The("Sokoban walls resist your ability.");
                } else if (game.flags.mention_walls) {
                    /* glyph = back_to_glyph(x, y), sym = glyph_to_cmap(glyph)
                       (a background glyph is always a cmap one) */
                    const sym = back_to_cmap(x, y);
                    const buf = (sym === 0 /* S_stone */) ? "solid stone"
                                : an(defsyms_explanation[sym]);
                    await pline_dir(xytodir(dx, dy), `It's ${buf}.`);
                }
            }
            return false;
        }
    } else if (IS_DOOR(tmpr.typ)) {
        if (closed_door(x, y)) {
            if (Blind() && mode === DO_MOVE)
                feel_location(x, y);
            if (Passes_walls()) {
                ; /* do nothing */
            } else if (amorphous(game.youmonst.data) && !game.invent) {
                /* can_ooze(&youmonst): amorphous and carrying nothing
                   (the rest of can_ooze() isn't needed without
                   inventory) */
                if (mode === DO_MOVE)
                    await You("ooze under the door.");
            } else if (Underwater()) {
                if (mode === DO_MOVE)
                    await There("is an obstacle there.");
                return false;
            } else if (tunnels(game.youmonst.data)
                       && !needspick(game.youmonst.data)) {
                /* Eat the door. */
                if (mode === DO_MOVE && await still_chewing(x, y))
                    return false;
            } else {
                if (mode === DO_MOVE) {
                    if (amorphous(game.youmonst.data))
                        await You("try to ooze under the door,"
                                + " but can't squeeze your possessions through.");
                    if (game.flags.autoopen !== false && !game.context.run
                        && !Confusion() && !Stunned() && !Fumbling()) {
                        await doopen_indir(x, y);
                        /* if 'autounlock' includes Kick, we might have a
                           kick at the door queued up after doopen_indir():
                           the autounlock kick isn't ported (it throws) */
                        game.context.door_opened = !closed_door(x, y) ? 1 : 0;
                        game.context.move = (ux !== u.ux || uy !== u.uy) ? 1 : 0;
                    } else if (x === ux || y === uy) {
                        if (Blind() || Stunned() || ACURR(A_DEX) < 10
                            || Fumbling()) {
                            if (u.usteed) {
                                await You_cant(`lead ${y_monnam(u.usteed)} through that closed door.`);
                            } else {
                                await pline("Ouch!  You bump into a door.");
                                await exercise(A_DEX, false);
                            }
                            /* use current move; needed for the "ouch" case
                               but done for steed case too for consistency;
                               we haven't opened a door but we're going to
                               return False and without having 'door_opened'
                               set, 'move' would get reset by caller */
                            game.context.door_opened = game.context.move = 1;
                            /* since we've just lied about successfully
                               moving, we need to manually stop running */
                            nomul(0);
                        } else
                            await pline("That door is closed.");
                    }
                } else if (mode === TEST_TRAV || mode === TEST_TRAP) {
                    /* goto testdiag */
                    return !(dx && dy && !Passes_walls()
                             && (!doorless_door(x, y) || block_door(x, y)))
                           && await test_move_rest(ux, uy, dx, dy, mode, x, y);
                }
                return false;
            }
        } else {
            /* testdiag: */
            if (dx && dy && !Passes_walls()
                && (!doorless_door(x, y) || block_door(x, y))) {
                /* Diagonal moves into a door are not allowed. */
                if (mode === DO_MOVE) {
                    if (Blind())
                        feel_location(x, y);
                    if (Underwater() || game.flags.mention_walls)
                        await You_cant("move diagonally into an intact doorway.");
                }
                return false;
            }
        }
    }
    return await test_move_rest(ux, uy, dx, dy, mode, x, y);
}

/* the rest of test_move(), from the diagonal squeeze check on; split out
   so that the closed-door 'goto testdiag' of the travel modes can rejoin
   it */
async function test_move_rest(ux, uy, dx, dy, mode, x, y) {
    const u = game.u;
    if (dx && dy && bad_rock(game.youmonst.data, ux, y)
        && bad_rock(game.youmonst.data, x, uy)) {
        /* Move at a diagonal. */
        switch (cant_squeeze_thru_u()) {
        case 3:
            if (mode === DO_MOVE)
                await You("cannot pass that way.");
            return false;
        case 2:
            if (mode === DO_MOVE)
                await You("are carrying too much to get through.");
            return false;
        case 1:
            if (mode === DO_MOVE)
                await Your("body is too large to fit through.");
            return false;
        default:
            break; /* can squeeze through */
        }
    } else if (dx && dy && worm_cross(ux, uy, x, y)) {
        /* consecutive long worm segments are at <ux,y> and <x,uy> */
        if (mode === DO_MOVE)
            await pline(`${YMonnam(m_at(ux, y))} is in your way.`);
        return false;
    }

    /* Pick travel path that does not require crossing a trap.
     * Avoid water and lava using the usual running rules.
     * (but not u.ux/u.uy because findtravelpath walks toward u.ux/u.uy) */
    if (game.context.run === 8 && (mode !== DO_MOVE) && !u_at(x, y)) {
        const t = t_at(x, y);

        if (t && t.tseen && t.ttyp !== VIBRATING_SQUARE)
            return (mode === TEST_TRAP);

        /* FIXME: should be using lastseentyp[x][y] rather than seen vector
         */
        const lev = game.level.at(x, y);
        /* Known_wwalking/Known_lwalking: whether worn water/lava walking
           boots are identified isn't tracked yet; only intrinsic water
           walking (as in avoid_moving_on_liquid()) */
        const Known_wwalking = (HWwalking() || EWwalking());
        const Known_lwalking = false;
        if ((lev.seenv && is_pool_or_lava(x, y)) /* known pool/lava */
            && ((IS_WATERWALL(lev.typ) /* never enter wall of liquid */
                 || lev.typ === LAVAWALL)
                /* don't enter pool or lava (must be one of the two to
                   get here) unless flying or levitating or have known
                   water-walking for pool or known lava-walking and
                   already be on/over lava for lava */
                || !(Levitation() || Flying()
                     || (is_pool(x, y) ? Known_wwalking
                         : (Known_lwalking && is_lava(u.ux, u.uy))))))
            return (mode === TEST_TRAP);
    }

    if (mode === TEST_TRAP)
        return false; /* do not move through traps */

    const ust = game.level.at(ux, uy);

    /* Now see if other things block our way . . */
    if (dx && dy && !Passes_walls() && IS_DOOR(ust.typ)
        && (!doorless_door(ux, uy) || block_entry(x, y))) {
        /* Can't move at a diagonal out of a doorway with door. */
        if (mode === DO_MOVE && game.flags.mention_walls)
            await You_cant("move diagonally out of an intact doorway.");
        return false;
    }

    if (sobj_at(BOULDER, x, y) && (Sokoban() || !Passes_walls())) {
        if (mode !== TEST_TRAV && game.context.run >= 2
            && !(Blind() || Hallucination()) && !could_move_onto_boulder(x, y)) {
            if (mode === DO_MOVE && game.flags.mention_walls)
                await pline_dir(xytodir(dx, dy), "A boulder blocks your path.");
            return false;
        }
        if (mode === DO_MOVE) {
            /* tunneling monsters will chew before pushing */
            if (tunnels(game.youmonst.data) && !needspick(game.youmonst.data)
                && !Sokoban()) {
                if (await still_chewing(x, y))
                    return false;
            } else if ((await moverock()) < 0)
                return false;
        } else if (mode === TEST_TRAV) {
            let obj;

            /* never travel through boulders in Sokoban */
            if (Sokoban())
                return false;

            /* don't pick two boulders in a row, unless there's a way thru */
            if (sobj_at(BOULDER, ux, uy) && !Sokoban()) {
                if (!Passes_walls()
                    && !could_move_onto_boulder(ux, uy)
                    && !(tunnels(game.youmonst.data)
                         && !needspick(game.youmonst.data))
                    && !carrying(PICK_AXE) && !carrying(DWARVISH_MATTOCK)
                    && !((obj = carrying(WAN_DIGGING))
                         && !objects[obj.otyp].oc_name_known))
                    return false;
            }
        }
        /* assume you'll be able to push it when you get there... */
    }

    /* OK, it is a legal place to move. */
    return true;
}

// C ref: hack.c movobj()
export function movobj(obj, ox, oy) {
    /* optimize by leaving on the fobj chain? */
    obj_extract_self(obj); /* remove_object() */
    maybe_unhide_at(obj.ox, obj.oy);
    newsym(obj.ox, obj.oy);
    place_object(obj, ox, oy);
    newsym(ox, oy);
}

// C ref: hack.c still_chewing()
/*
 *  Chew on a wall, door, or boulder.  [What about statues?]
 *  Returns TRUE if still eating, FALSE when done.
 */
export async function still_chewing(x, y) {
    const u = game.u;
    const lev = game.level.at(x, y);
    const boulder = sobj_at_sc(BOULDER, x, y);
    let digtxt = null, dmgtxt = null;
    const digging = digging_ctx_sc();

    if (digging.down) /* not continuing prev dig (w/ pick-axe) */
        clear_digging_sc();

    if (!boulder
        && ((IS_OBSTRUCTED(lev.typ) && !may_dig_sc(x, y))
            /* may_dig() checks W_NONDIGGABLE but doesn't handle iron bars */
            || (lev.typ === IRONBARS && ((lev.wall_info ?? 0) & W_NONDIGGABLE_sc)))) {
        await You(`hurt your teeth on the ${
            (lev.typ === IRONBARS)
                ? "bars"
                : IS_TREE(lev.typ)
                    ? "tree"
                    : "hard stone"}.`);
        nomul(0);
        return 1;
    } else if (lev.typ === IRONBARS
               && metallivorous_sc(game.youmonst.data) && u.uhunger > 1500) {
        /* finishing eating via 'morehungry()' doesn't handle choking */
        await You("are too full to eat the bars.");
        nomul(0);
        return 1;
    } else if (!digging.chew
               || digging.pos.x !== x
               || digging.pos.y !== y
               || !on_level_sc(digging.level, u.uz)) {
        digging.down = false;
        digging.chew = true;
        digging.warned = false;
        digging.pos.x = x;
        digging.pos.y = y;
        assign_level_sc(digging.level, u.uz);
        /* solid rock takes more work & time to dig through */
        digging.effort =
            (IS_OBSTRUCTED(lev.typ) && !IS_TREE(lev.typ) ? 30 : 60) + u.udaminc;
        await You(`start chewing ${
            (boulder || IS_TREE(lev.typ) || lev.typ === IRONBARS)
                ? "on a"
                : "a hole in the"} ${
            boulder
                ? "boulder"
                : IS_TREE(lev.typ)
                    ? "tree"
                    : IS_OBSTRUCTED(lev.typ)
                        ? "rock"
                        : (lev.typ === IRONBARS)
                            ? "bar"
                            : "door"}.`);
        await watch_dig_sc(null, x, y, false);
        return 1;
    } else if ((digging.effort += (30 + u.udaminc)) <= 100) {
        if (game.flags.verbose)
            await You(`${digging.chew ? "continue" : "begin"} chewing on the ${
                boulder
                    ? "boulder"
                    : IS_TREE(lev.typ)
                        ? "tree"
                        : IS_OBSTRUCTED(lev.typ)
                            ? "rock"
                            : (lev.typ === IRONBARS)
                                ? "bars"
                                : "door"}.`);
        digging.chew = true;
        await watch_dig_sc(null, x, y, false);
        return 1;
    }

    /* Okay, you've chewed through something */
    if (!u.uconduct.food++)
        livelog_printf(LL_CONDUCT,
                       `ate for the first time, by chewing through ${
                       boulder ? "a boulder"
                       : IS_TREE(lev.typ) ? "a tree"
                         : IS_OBSTRUCTED(lev.typ) ? "rock"
                           : (lev.typ === IRONBARS) ? "iron bars"
                             : "a door"}`);
    u.uhunger += rnd(20);

    if (boulder) {
        delobj_sc(boulder);            /* boulder goes bye-bye */
        await You("eat the boulder."); /* yum */

        /*
         *  The location could still block because of
         *      1. More than one boulder
         *      2. Boulder stuck in a wall/stone/door.
         *
         *  [perhaps use does_block() below (from vision.c)]
         */
        if (IS_OBSTRUCTED(lev.typ) || closed_door_sc(x, y)
            || sobj_at_sc(BOULDER, x, y)) {
            block_point_sc(x, y); /* delobj will unblock the point */
            /* reset dig state */
            clear_digging_sc();
            return 1;
        }

    } else if (IS_WALL(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage_sc(x, y, 10 * acurrstr_sc()); /* SHOP_WALL_DMG */
            dmgtxt = "damage";
        }
        digtxt = "chew a hole in the wall.";
        if (game.level.flags.is_maze_lev) {
            lev.typ = ROOM;
        } else if (game.level.flags.is_cavernous_lev && !in_town(x, y)) {
            lev.typ = CORR;
        } else {
            lev.typ = DOOR_sc;
            lev.doormask = D_NODOOR;
        }
    } else if (IS_TREE(lev.typ)) {
        digtxt = "chew through the tree.";
        lev.typ = ROOM;
    } else if (lev.typ === IRONBARS) {
        if (metallivorous_sc(game.youmonst.data)) { /* should always be True here */
            /* arbitrary amount; unlike proper eating, nutrition is
               bestowed in a lump sum at the end */
            const nut = objects[HEAVY_IRON_BALL_sc].oc_weight;

            /* lesshungry() requires that victual be set up, so skip it;
               morehungry() of a negative amount will increase nutrition
               without any possibility of choking to death on the meal;
               updates hunger state and requests status update if changed */
            await morehungry_sc(-nut);
        }
        digtxt = u_at(x, y)
                 ? "devour the iron bars."
                 : "eat through the bars.";
        await dissolve_bars_sc(x, y);
    } else if (lev.typ === SDOOR) {
        if (lev.doormask & D_TRAPPED_sc) {
            lev.doormask = D_NODOOR;
            await b_trapped_sc("secret door", NO_PART_sc);
        } else {
            digtxt = "chew through the secret door.";
            lev.doormask = D_BROKEN;
        }
        lev.typ = DOOR_sc;

    } else if (IS_DOOR(lev.typ)) {
        if (in_rooms(x, y, SHOPBASE).length) {
            add_damage_sc(x, y, SHOP_DOOR_COST_sc);
            dmgtxt = "break";
        }
        if (lev.doormask & D_TRAPPED_sc) {
            lev.doormask = D_NODOOR;
            await b_trapped_sc("door", NO_PART_sc);
        } else {
            digtxt = "chew through the door.";
            lev.doormask = D_BROKEN;
        }

    } else { /* STONE or SCORR */
        digtxt = "chew a passage through the rock.";
        lev.typ = CORR;
    }

    recalc_block_point_sc(x, y); /* vision */
    newsym(x, y);
    if (digtxt)
        await You(digtxt); /* You1(): after newsym */
    if (dmgtxt)
        await pay_for_damage_sc(dmgtxt, false);
    clear_digging_sc();
    return 0;
}

// C ref: hack.c cannot_push_msg()
async function cannot_push_msg(otmp, sx, sy) {
    const what = the(xname(otmp));
    if (game.u.usteed)
        await pline(`${YMonnam(game.u.usteed)} tries to move ${what}, but cannot.`);
    else
        await You(`try to move ${what}, but in vain.`);
    if (Blind())
        feel_location(sx, sy);
}

// C ref: hack.c cannot_push()
async function cannot_push(otmp, sx, sy) {
    if (throws_rocks(game.youmonst.data)) {
        const
            canpickup = (!Sokoban()
                         /* similar exception as in can_lift():
                            when poly'd into a giant, you can
                            pick up a boulder if you have a free
                            slot or into the overflow ('#') slot
                            unless already carrying at least one */
                         && (inv_cnt(false) < 52 /* invlet_basic */
                             || !carrying(BOULDER))),
            willpickup = (canpickup
                          && (game.flags.pickup && !game.context.nopick)
                          && autopick_testobj_hk(otmp, true));

        if (game.u.usteed && P_SKILL_hk(P_RIDING_hk) < P_BASIC_hk) {
            await You(`aren't skilled enough to ${
                willpickup ? "pick up" : "push aside"} ${
                the(xname(otmp))} from ${y_monnam(game.u.usteed)}.`);
        } else {
            /*
             * will pick up:  you easily pick it up
             * can but won't: you maneuver over it and could pick it up
             * can't pick up: you maneuver over it (possibly followed
             *     by feedback from failed auto-pickup attempt)
             */
            await pline(`However, you ${
                willpickup ? "easily pick it up"
                           : "maneuver over it"}${
                (canpickup && !willpickup)
                           ? " and could pick it up"
                           : ""}.`);
            /* similar to dropping everything and squeezing onto
               a Sokoban boulder's spot, moving to same breaks the
               Sokoban rules because on next step you could go
               past it without pushing it to plug a pit or hole */
            sokoban_guilt();
        }
        return 0;
    }

    if (could_move_onto_boulder(sx, sy)) {
        await pline(
           "However, you can squeeze yourself into a small opening.");
        sokoban_guilt();
        return 0;
    } else {
        return -1;
    }
}

// C ref: hack.c could_move_onto_boulder()
/* can hero move onto a spot containing one or more boulders?
   used for m<dir> and travel and during boulder push failure */
function could_move_onto_boulder(sx, sy) {
    /* can if able to phaze through rock (must be poly'd, so not riding) */
    if (Passes_walls())
        return true;
    /* can't when riding */
    if (game.u.usteed)
        return false;
    /* can if a giant, unless doing so allows hero to pass into a
       diagonal squeeze at the same time */
    if (throws_rocks(game.youmonst.data))
        return (!game.u.dx || !game.u.dy
                || !(IS_OBSTRUCTED(game.level.at(game.u.ux, sy).typ)
                     && IS_OBSTRUCTED(game.level.at(sx, game.u.uy).typ)));
    /* can if tiny (implies carrying very little else couldn't move at all) */
    if (verysmall(game.youmonst.data))
        return true;
    /* can squeeze to spot if carrying extremely little, otherwise can't */
    /* squeezeablylightinvent() */
    return (!game.invent || inv_weight() <= (WT_SQUEEZABLE_INV * -1));
}

// C ref: hack.c dopush()
async function dopush(sx, sy, rx, ry, otmp, costly) {
    {
        let what;
        let givemesg, easypush;
        /* give boulder pushing feedback if this is a different
           boulder than the last one pushed or if it's been at
           least 2 turns since we last pushed this boulder;
           unlike with Norep(), intervening messages don't cause
           it to repeat, only doing something else in the meantime */
        if (otmp.o_id !== game.bldrpush_oid) {
            game.bldrpushtime = game.moves + 1;
            game.bldrpush_oid = otmp.o_id;
        }
        givemesg = (game.moves > game.bldrpushtime + 2
                    || game.moves < game.bldrpushtime);
        what = givemesg ? the(xname(otmp)) : null;
        if (!game.u.usteed) {
            easypush = throws_rocks(game.youmonst.data);
            if (givemesg)
                await pline(`With ${easypush ? "little" : "great"} effort you move ${what}.`);
            if (!easypush)
                await exercise(A_STR, true);
        } else {
            throw new Error('dopush(): steed pushing not ported yet');
        }
        game.bldrpushtime = game.moves;
    }

    /* Move the boulder *after* the message. */
    if (glyph_is_invisible(game.level.at(rx, ry).remembered_glyph))
        unmap_object(rx, ry);
    otmp.next_boulder = 0;
    movobj(otmp, rx, ry); /* does newsym(rx,ry) */
    if (Blind()) {
        feel_location(rx, ry);
        feel_location(sx, sy);
    } else {
        newsym(sx, sy);
    }
    if (costly || otmp.unpaid)
        throw new Error('dopush(): shop billing not ported yet');
}

// C ref: hack.c moverock()
async function moverock() {
    const sx = game.u.ux + game.u.dx, sy = game.u.uy + game.u.dy; /* boulder starting position */
    const ret = await moverock_core(sx, sy);
    /* moverock_done(sx, sy) */
    for (const otmp of game.level.objects || [])
        if (otmp.ox === sx && otmp.oy === sy && otmp.where === 'OBJ_FLOOR'
            && otmp.otyp === BOULDER)
            otmp.next_boulder = 0; /* resume normal xname() for this obj */
    return ret;
}

// C ref: hack.c moverock_core() -- pushing into teleport traps is not
// ported yet
async function moverock_core(sx, sy) {
    let rx, ry;
    let otmp, ttmp, mtmp;
    let costly, firstboulder = true;

    while ((otmp = sobj_at(BOULDER, sx, sy)) !== null && otmp) {
        if (Blind() && glyph_to_obj_hk(glyph_at(sx, sy)) !== BOULDER) {
            await pline("That feels like a boulder.");
            map_object_hk(otmp, true);
            nomul(0);
            return -1;
        }

        /* when otmp->next_boulder is 1, xname() will format it as
           "next boulder" instead of just "boulder" */
        otmp.next_boulder = firstboulder ? 0 : 1;
        firstboulder = false;

        /* make sure that this boulder is visible as the top object */
        const top = level_objects_at(sx, sy)[0] || null;
        if (otmp !== top)
            movobj(otmp, sx, sy);

        rx = game.u.ux + 2 * game.u.dx; /* boulder destination position */
        ry = game.u.uy + 2 * game.u.dy;
        nomul(0);

        /* using m<dir> towards an adjacent boulder steps over/onto it if
           poly'd into a giant or squeezes under/beside it if small/light
           enough but is a no-op in other circumstances unless move attempt
           reveals an unseen boulder or lack of remembered, unseen monster */
        if (game.context.nopick) {
            const oldglyph = glyph_at(sx, sy); /* before feel_location() */
            let res;

            feel_location(sx, sy); /* same for all 3 if/else-if/else cases */
            if (throws_rocks(game.youmonst.data)) {
                /* player has used 'm<dir>' to move, so step to boulder's
                   spot without pushing it */
                await You(`${u_locomotion("step")} over a boulder here.`);
                sokoban_guilt();
                res = 0; /* move to <sx,sy> */
            } else if (could_move_onto_boulder(sx, sy)) {
                await You(`squeeze yourself ${Flying() ? "over" : "against"} the boulder.`);
                sokoban_guilt();
                res = 0; /* move to <sx,sy> */
            } else {
                await There("is a boulder in your way.");
                /* use a move if hero learns something; see test_move() for
                   how/why 'context.door_opened' is being dragged into this */
                if (glyph_at(sx, sy) !== oldglyph)
                    game.context.door_opened = game.context.move = 1;
                res = -1; /* don't move to <sx,sy>, so no soko guilt */
            }
            return res;
        }
        if (Levitation() || Is_airlevel(game.u.uz)) {
            /* FIXME?  behavior in an air bubble on the water level should
               be similar to being on the air level; both cases probably
               ought to let push attempt proceed when flying (which implies
               not levitating) */
            if (Blind())
                feel_location(sx, sy);
            await You(`don't have enough leverage to push ${the(xname(otmp))}.`);
            /* Give them a chance to climb over it? */
            return -1;
        }
        if (verysmall(game.youmonst.data) && !game.u.usteed) {
            if (Blind())
                feel_location(sx, sy);
            await pline(`You're too small to push that ${xname(otmp)}.`);
            return await cannot_push(otmp, sx, sy);
        }
        if (isok(rx, ry) && !IS_OBSTRUCTED(game.level.at(rx, ry).typ)
            && game.level.at(rx, ry).typ !== IRONBARS
            && (!IS_DOOR(game.level.at(rx, ry).typ) || !(game.u.dx && game.u.dy)
                || doorless_door(rx, ry)) && !sobj_at(BOULDER, rx, ry)) {
            ttmp = t_at(rx, ry);
            mtmp = m_at(rx, ry);
            costly = !!(costly_spot(sx, sy)
                        && shop_keeper(first_shop_rno(sx, sy)));

            /* KMH -- Sokoban doesn't let you push boulders diagonally */
            if (Sokoban() && game.u.dx && game.u.dy) {
                if (Blind())
                    feel_location(sx, sy);
                await pline(`${The(xname(otmp))} won't roll diagonally on this ${surface(sx, sy)}.`);
                return await cannot_push(otmp, sx, sy);
            }

            if (await revive_nasty(rx, ry,
                                   "You sense movement on the other side.")) {
                return -1;
            }

            if (mtmp && !noncorporeal(mtmp.data)
                && (!mtmp.mtrapped || !(ttmp && is_pit(ttmp.ttyp)))) {
                let deliver_part1 = false;

                if (Blind())
                    feel_location(sx, sy);
                if (canspotmon(mtmp)) {
                    await pline(`There's ${a_monnam(mtmp)} on the other side.`);
                    deliver_part1 = true;
                } else {
                    /* Soundeffect(se_monster_behind_boulder, 50) */
                    await You_hear(`a monster behind ${the(xname(otmp))}.`);
                    const D = game.u.uprops[DEAF];
                    if (!(D.intrinsic || D.extrinsic || game.u.uroleplay?.deaf)) /* !Deaf */
                        deliver_part1 = true;
                    map_invisible(rx, ry);
                }
                if (game.flags?.verbose ?? true) {
                    const you_or_steed = game.u.usteed ? y_monnam(game.u.usteed) : "you";
                    await pline(`${deliver_part1 ? "Perhaps that's why " : ""}`
                                + `${deliver_part1 ? you_or_steed : upstart(you_or_steed)}`
                                + ` cannot move ${deliver_part1 ? "it" : the(xname(otmp))}.`);
                }
                return await cannot_push(otmp, sx, sy);
            }

            if (closed_door(rx, ry)) {
                await cannot_push_msg(otmp, sx, sy);
                return await cannot_push(otmp, sx, sy);
            }

            /* at this point the boulder should be able to move (though
               potentially into something like a trap, pool, or lava) */

            /* rumbling disturbs buried zombies */
            disturb_buried_zombies(sx, sy);

            if (ttmp) {
                /* if a trap operates on the boulder, don't attempt
                   to move any others at this location; return -1
                   if another boulder is in hero's way, or 0 if he
                   should advance to the vacated boulder position */
                switch (ttmp.ttyp) {
                case LANDMINE:
                    if (rn2(10)) {
                        const D = game.u.uprops[DEAF];
                        const deaf = !!(D.intrinsic || D.extrinsic || game.u.uroleplay?.deaf);
                        obj_extract_self(otmp);
                        place_object(otmp, rx, ry);
                        newsym(sx, sy);
                        await pline(`${(!deaf || !Blind()) ? "KAABLAMM!!" : "Gadzooks"}!  `
                                    + `${Tobjnam(otmp, "trigger")} ${ttmp.madeby_u ? "your" : "a"} land mine.`);
                        await blow_up_landmine(ttmp);
                        /* if the boulder remains, it should fill the pit */
                        await fill_pit(game.u.ux, game.u.uy);
                        if (cansee(rx, ry))
                            newsym(rx, ry);
                        return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                    }
                    break;
                case SPIKED_PIT:
                case PIT:
                    obj_extract_self(otmp);
                    /* vision kludge to get messages right;
                       the pit will temporarily be seen even
                       if this is one among multiple boulders */
                    if (!Blind())
                        game.viz_array[ry][rx] |= IN_SIGHT;
                    if (!(await flooreffects(otmp, rx, ry, "fall"))) {
                        place_object(otmp, rx, ry);
                    }
                    if (mtmp && !Blind())
                        newsym(rx, ry);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                case HOLE:
                case TRAPDOOR: {
                    /* Soundeffect(se_kerplunk_boulder_gone, 40) */
                    if (Blind())
                        await pline(`Kerplunk!  You no longer feel ${the(xname(otmp))}.`);
                    else
                        await pline(`${Tobjnam(otmp, (ttmp.ttyp === TRAPDOOR) ? "trigger" : "fall")}`
                                    + `${(ttmp.ttyp === TRAPDOOR) ? "" : " into"}`
                                    + ` and ${otense(otmp, "plug")} a`
                                    + ` ${(ttmp.ttyp === TRAPDOOR) ? "trap door" : "hole"}`
                                    + ` in the ${surface(rx, ry)}!`);
                    deltrap_fw(ttmp);
                    await useupf(otmp, 1);
                    await bury_objs(rx, ry);
                    const rlev = game.level.at(rx, ry);
                    rlev.wall_info = (rlev.wall_info ?? 0) & ~W_NONDIGGABLE;
                    rlev.candig = 1;
                    if (cansee(rx, ry))
                        newsym(rx, ry);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                }
                case LEVEL_TELEP:
                case TELEP_TRAP:
                    throw new Error('moverock_core(): pushing a boulder into a teleport trap not ported yet');
                case ROLLING_BOULDER_TRAP: {
                    let tox = rx;
                    let toy = ry;
                    /* the boulder continues until it reaches one of
                       the trap's launch spots or hits a wall / out-of-bounds */
                    while (isok(tox + game.u.dx, toy + game.u.dy)) {
                        tox += game.u.dx;
                        toy += game.u.dy;
                        if (tox === ttmp.launch.x && toy === ttmp.launch.y)
                            break;
                        if (tox === ttmp.launch2.x && toy === ttmp.launch2.y)
                            break;
                    }
                    await pline(`${Tobjnam(otmp, "suddenly roll")} away from you!`);
                    feeltrap(ttmp);
                    await launch_obj(BOULDER, sx, sy, tox, toy, ROLL | LAUNCH_KNOWN);
                    return sobj_at(BOULDER, sx, sy) ? -1 : 0;
                }
                default:
                    break; /* boulder not affected by this trap */
                }
            }

            if (await boulder_hits_pool(otmp, rx, ry, true))
                continue;

            /*
             * Re-link at top of fobj chain so that pile order is preserved
             * when level is restored.
             */
            if (otmp !== game.level.objects[0]) {
                obj_extract_self(otmp); /* remove_object() */
                place_object(otmp, otmp.ox, otmp.oy);
            }
            await dopush(sx, sy, rx, ry, otmp, costly);
        } else {
            await cannot_push_msg(otmp, sx, sy);
            return await cannot_push(otmp, sx, sy);
        }
    }
    return 0;
}

/* C ref: mondata.c sticks() */
function hero_sticks(ptr) {
    return (ptr.mattk || []).some(a => a.aatyp === AT_ENGL || a.aatyp === AT_HUGS
                                       || a.adtyp === AD_STCK);
}

// C ref: hack.c escape_from_sticky_mon() -- try to pull free from
// sticking monster, or you release a monster you're sticking to.
// returns TRUE if you lose your movement.
async function escape_from_sticky_mon(x, y) {
    const u = game.u;
    if (u.ustuck && (x !== u.ustuck.mx || y !== u.ustuck.my)) {
        let mtmp;

        if (!(Math.abs(u.ustuck.mx - u.ux) <= 1 && Math.abs(u.ustuck.my - u.uy) <= 1)) {
            /* perhaps it fled (or was teleported or ... ) */
            set_ustuck(null);
        } else if (hero_sticks(game.youmonst.data)) {
            /* When polymorphed into a sticking monster,
             * u.ustuck means it's stuck to you, not you to it.
             */
            mtmp = u.ustuck;
            set_ustuck(null);
            await You(`release ${y_monnam(mtmp)}.`);
        } else {
            /* If holder is asleep or paralyzed:
             *      37.5% chance of getting away,
             *      12.5% chance of waking/releasing it;
             * otherwise:
             *       7.5% chance of getting away.
             * If holder is tame and there is no conflict,
             * guaranteed escape.
             */
            let pullfree = false;
            switch (rn2(!u.ustuck.mcanmove ? 8 : 40)) {
            case 3:
                if (!u.ustuck.mcanmove) {
                    /* it's free to move on next turn */
                    u.ustuck.mfrozen = 1;
                    u.ustuck.msleeping = 0;
                }
                /*FALLTHRU*/
            default:
                if (Conflict() || u.ustuck.mconf || !u.ustuck.mtame) {
                    await You(`cannot escape from ${y_monnam(u.ustuck)}!`);
                    nomul(0);
                    return true;
                }
                /*FALLTHRU*/
            case 0:
            case 1:
            case 2:
                pullfree = true;
                break;
            }
            if (pullfree) {
                mtmp = u.ustuck;
                set_ustuck(null);
                await You(`pull free from ${y_monnam(mtmp)}.`);
            }
        }
    }
    return false;
}

/* C ref: hack.c carrying_too_much() */
async function carrying_too_much() {
    const u = game.u;
    let wtcap;
    const Upolyd = u.umonnum !== u.umonster;

    if (((wtcap = near_capacity()) >= OVERLOADED
         || (wtcap > SLT_ENCUMBER
             && (Upolyd ? (u.mh < 5 && u.mh !== u.mhmax)
                        : (u.uhp < 10 && u.uhp !== u.uhpmax))))
        && !Is_airlevel(u.uz)) {
        if (wtcap < OVERLOADED) {
            await You("don't have enough stamina to move.");
            await exercise(A_CON, false);
        } else
            await You("collapse under your load.");
        nomul(0);
        return true;
    }
    return false;
}

/* does the plane of air disturb movement? */
// C ref: hack.c air_turbulence()
async function air_turbulence() {
    if (Is_airlevel(game.u.uz) && rn2(4) && !Levitation() && !Flying()) {
        switch (rn2(3)) {
        case 0:
            await You("tumble in place.");
            await exercise(A_DEX, false);
            break;
        case 1:
            await You_cant_fw("control your movements very well.");
            break;
        case 2:
            await pline("It's hard to walk in thin air.");
            await exercise(A_DEX, true);
            break;
        }
        return true;
    }
    return false;
}

/* C ref: hack.c slippery_ice_fumbling() */
function slippery_ice_fumbling() {
    const u = game.u;
    let on_ice = !sp_Levitation() && is_ice_sf(u.ux, u.uy);
    const iceskater = u.usteed ? u.usteed : game.youmonst;
    const HFumbling = sp_prop(FUMBLING);

    if (on_ice) {
        const isd = iceskater.data;
        if ((game.uarmf && objdescr_is_sf(game.uarmf, "snow boots"))
            || resists_cold_sf(iceskater) || sp_Flying()
            || is_floater(isd) || is_clinger(isd)
            || is_whirly(isd)) {
            on_ice = false;
        } else if (!rn2((Cold_resistance()) ? 3 : 2)) {
            HFumbling.intrinsic |= FROMOUTSIDE;
            HFumbling.intrinsic &= ~TIMEOUT;
            HFumbling.intrinsic += 1; /* slip on next move */
        }
    }
    if (!on_ice && (HFumbling.intrinsic & FROMOUTSIDE))
        HFumbling.intrinsic &= ~FROMOUTSIDE;
}

/* C ref: hack.c impaired_movement() -- change movement dir if impaired.
   return TRUE if can't move */
function impaired_movement(xy) {
    const u = game.u;
    if (u_maybe_impaired()) {
        let tries = 0;

        do {
            if (tries++ > 50) {
                nomul(0);
                return true;
            }
            confdir(true);
            xy.x = u.ux + u.dx;
            xy.y = u.uy + u.dy;
        } while (!isok(xy.x, xy.y) || bad_rock(game.youmonst.data, xy.x, xy.y));
    }
    return false;
}

/* C ref: hack.c move_out_of_bounds() -- trying to move out-of-bounds? */
async function move_out_of_bounds(x, y) {
    const u = game.u;
    if (!isok(x, y)) {
        if (game.context.forcefight)
            return await domove_fight_empty(x, y);
        if (game.flags.mention_walls) {
            let dx = u.dx, dy = u.dy;

            if (dx && dy) { /* diagonal */
                /* only as far as possible diagonally if in very
                   corner; otherwise just report whichever of the
                   cardinal directions has reached its limit */
                if (isok(x, u.uy))
                    dx = 0;
                else if (isok(u.ux, y))
                    dy = 0;
            }
            await You(`have already gone as far ${directionname(xytodir(dx, dy))} as possible.`);
        }
        nomul(0);
        game.context.move = 0;
        return true;
    }
    return false;
}

/* C ref: hack.c avoid_running_into_trap_or_liquid() -- when running/
   rushing, avoid stepping on a known trap or pool of liquid.
   returns TRUE if avoided. */
async function avoid_running_into_trap_or_liquid(x, y) {
    const would_stop = (game.context.run >= 2);
    if (!game.context.run)
        return false;

    if (await avoid_moving_on_trap(x, y, would_stop)
        || (Blind() && await avoid_moving_on_liquid(x, y, would_stop))) {
        nomul(0);
        if (would_stop)
            game.context.move = 0;
        return would_stop;
    }
    return false;
}

// C ref: hack.c avoid_trap_andor_region()
/* if paranoid_confirm:Trap is enabled, check whether the next step forward
   needs player confirmation due to visible region or discovered trap;
   result: True => stop moving, False => proceed */
async function avoid_trap_andor_region(x, y) {
    const u = game.u;
    const ctx = game.context;
    let trap = null;
    let newreg, oldreg;

    /* treat entering a visible gas cloud region like entering a trap */
    if (ParanoidTrap() && !Blind() && !Stunned() && !Confusion() && !Hallucination()
        /* skip if player used 'm' prefix or is moving recklessly */
        && (!ctx.nopick || ctx.run)
        /* check for region(s) */
        && (newreg = visible_region_at(x, y)) != null
        && ((oldreg = visible_region_at(u.ux, u.uy)) == null
            /* if moving from one region into another, only ask for
               confirmation if the one potentially being entered inflicts
               damage (poison gas) and the one being exited doesn't (vapor) */
            || (reg_damg(newreg) > 0 && reg_damg(oldreg) === 0))
        /* check whether attempted move will be viable */
        && await test_move(u.ux, u.uy, u.dx, u.dy, TEST_MOVE)
        /* we don't override confirmation for poison resistance since the
           region also hinders hero's vision even if/when no damage is done */
    ) {
        const qbuf = `${u_locomotion("step")} into that ${
            (reg_damg(newreg) > 0) ? "poison gas" : "vapor"} cloud?`;
        if (!await paranoid_query(ParanoidConfirm(), upstart(qbuf))) {
            nomul(0);
            ctx.move = 0;
            return true;
        }
    }

    /* maybe ask player for confirmation before walking into known trap */
    if (ParanoidTrap() && !Stunned() && !Confusion()
        /* skip if player used 'm' prefix or is moving recklessly */
        && (!ctx.nopick || ctx.run)
        /* check for discovered trap */
        && (trap = t_at(x, y)) && trap.tseen
        /* check whether attempted move will be viable */
        && await test_move(u.ux, u.uy, u.dx, u.dy, TEST_MOVE)
        /* override confirmation if the trap is harmless to the hero */
        && (immune_to_trap(game.youmonst, trap.ttyp) !== TRAP_CLEARLY_IMMUNE
            /* Hallucination: all traps still show as ^, but the
               hero can't tell what they are, so treat as dangerous */
            || Hallucination())) {
        const traptype = (Hallucination() ? rnd(TRAPNUM - 1) : trap.ttyp);
        const into = into_vs_onto(traptype);

        /* defsyms[trap_to_defsym(traptype)].explanation, which is what
           trapname(traptype, TRUE) returns */
        const qbuf = `Really ${u_locomotion("step")} ${into ? "into" : "onto"} that ${
            trapname(traptype, true)}?`;
        /* handled like paranoid_confirm:pray; when paranoid_confirm:trap
           isn't set, don't ask at all but if it is set (checked above),
           ask via y/n if parnoid_confirm:confirm isn't also set or via
           yes/no if it is */
        if (!await paranoid_query(ParanoidConfirm(), qbuf)) {
            nomul(0);
            ctx.move = 0;
            return true;
        }
    }
    return false;
}

/* C ref: hack.c domove_bump_mon() -- the 'm' prefix */
async function domove_bump_mon(mtmp, glyph) {
    /* If they used a 'm' command, trying to move onto a monster
     * prints the below message and wastes a turn.  The exception is
     * if the monster is unseen and the player doesn't remember an
     * invisible monster--then, we fall through to do_attack() and
     * attack_check(), which still wastes a turn, but prints a
     * different message and makes the player remember the monster.
     */
    if (game.context.nopick && !game.context.travel
        && (canspotmon(mtmp) || glyph_is_invisible(glyph)
            || glyph_is_warning(glyph))) {
        if (mtmp.m_ap_type && !Protection_from_shape_changers()
            && !sensemon(mtmp))
            await stumble_onto_mimic(mtmp);
        else if (mtmp.mpeaceful && !Hallucination())
            /* m_monnam(): "dog" or "Fido", no "invisible dog" or "it" */
            await pline(`Pardon me, ${m_monnam(mtmp)}.`);
        else
            await You(`move right into ${mon_nam(mtmp)}.`);
        return true;
    }
    return false;
}

/* C ref: hack.c domove_attackmon_at() -- hero is moving, do we maybe
   attack a monster at (x,y)?  returns TRUE if hero movement is used up.
   sets displaceu, if hero and monster could swap places instead. */
async function domove_attackmon_at(mtmp, x, y, displaceu) {
    const u = game.u;
    /* only attack if we know it's there
     * or if we used the 'F' command to fight blindly
     * or if it hides_under, in which case we call do_attack() to print
     * the Wait! message.
     * This is different from ceiling hiders, who aren't handled in
     * do_attack().
     */
    if (game.context.forcefight || !mtmp.mundetected || sensemon(mtmp)
        || ((hides_under(mtmp.data) || mtmp.data.mlet === S_EEL)
            && !is_safemon(mtmp))) {
        /* target monster might decide to switch places with you... */
        displaceu.val = (mtmp.data === mons[PM_DISPLACER_BEAST] && !rn2(2)
                         && mtmp.mux === u.ux0 && mtmp.muy === u.uy0
                         && !helpless(mtmp)
                         && !mtmp.meating && !mtmp.mtrapped
                         && !u.utrap && !u.ustuck && !u.usteed
                         && !(u.dx && u.dy
                              && (NODIAG(u.umonnum)
                                  || (bad_rock(mtmp.data, x, u.uy0)
                                      && bad_rock(mtmp.data, u.ux0, y))
                                  || (bad_rock(game.youmonst.data, u.ux0, y)
                                      && bad_rock(game.youmonst.data, x, u.uy0))))
                         && goodpos(u.ux0, u.uy0, mtmp, GP_ALLOW_U));
        /* if not displacing, try to attack; note that it might evade;
           also, we don't attack tame or peaceful when safemon() */
        if (!displaceu.val) {
            if (await do_attack(mtmp))
                return true;
        }
    }
    return false;
}

// C ref: hack.c domove_fight_ironbars()
async function domove_fight_ironbars(x, y) {
    const u = game.u;
    if (game.context.forcefight && game.level.at(x, y).typ === IRONBARS
        && game.uwep) {
        let obj = game.uwep;
        let breakflags = (BRK_BY_HERO | BRK_FROM_INV | BRK_MELEE);

        if (breaktest(obj)) {
            if (obj.quan > 1)
                obj = splitobj(obj, 1);
            else
                setuwep(null);
            freeinv(obj);
            breakflags |= BRK_KNOWN2BREAK;
        } else {
            breakflags |= BRK_KNOWN2NOTBREAK;
        }

        await hit_bars({ obj }, u.ux, u.uy, x, y, breakflags);
        return true;
    }
    return false;
}

// C ref: hack.c domove_fight_web()
async function domove_fight_web(x, y) {
    const trap = t_at(x, y);
    const u = game.u, uwep = game.uwep, uswapwep = game.uswapwep;

    if (game.context.forcefight && trap && trap.ttyp === WEB && trap.tseen) {
        const wtype = uwep_skill_type_fw(),
            /* minus_2: restricted or unskilled: -1, basic: 0, skilled: 1,
               expert: 2, master: 3, grandmaster: 4 */
            wskill_minus_2 = Math.max(P_SKILL_hk(wtype), P_UNSKILLED_fw) - 2,
            /* higher value is worse for player; for weaponless, adjust the
               chance to succeed rather than maybe make two tries */
            roll = rn2(uwep ? 20 : (45 - 5 * wskill_minus_2));

        if (uwep && (u_wield_art_fw(ART_STING_fw)
                     || (uwep.oartifact && attacks_fw(AD_FIRE_fw, uwep)))) {
            /* guaranteed success */
            await pline(`${bare_artifactname_fw(uwep)} ${
                u_wield_art_fw(ART_STING_fw) ? "cuts" : "burns"} through the web!`);

        /* is_blade() includes daggers (which are classified as PIERCE)
           but doesn't include axes and slashing polearms */
        } else if (uwep && !is_blade_fw(uwep)
                   && (!u.twoweap || !is_blade_fw(uswapwep))) {
            let uwepstr = null, scndstr = null;

            /* when dual wielding, second weapon will only be mentioned
               if it has a different type description from primary */
            const uwepbuf = weapon_descr_fw(uwep);
            const scndbuf = u.twoweap ? weapon_descr_fw(uswapwep) : "";
            const onewep = !scndbuf || uwepbuf === scndbuf;
            if (uwepbuf.toLowerCase() === "armor" || uwepbuf.toLowerCase() === "food"
                || uwepbuf.toLowerCase() === "venom") { /* as-is */
                /* non-weapon item wielded, of a type where an() would
                   result in weird phrasing; dual wield not possible */
                uwepstr = uwepbuf;
            } else if (uwep.quan === 1 /* singular */
                       /* unless secondary is suppressed due to same type */
                       && !(u.twoweap && onewep)) {
                uwepstr = an(uwepbuf);
            } else { /* plural */
                uwepstr = makeplural_fw(uwepbuf);
            }
            if (!onewep) {
                scndstr = (uswapwep.quan === 1) ? an(scndbuf)
                                                : makeplural_fw(scndbuf);
            }
            await You_cant_fw(`cut a web with ${uwepstr}${
                !onewep ? " or " : ""}${!onewep ? scndstr : ""}!`);
            return true;

        /* weapon is ok; check whether hit is successful */
        } else if (roll > (acurrstr_sc() - 2 /* 1..19 */
                           /* for weaponless, 'roll' was adjusted above */
                           + (uwep ? uwep.spe + wskill_minus_2 : 0))) {
            /* TODO: add failures, maybe make an occupation? */
            await You(`${uwep ? "hack" : "thrash"} ineffectually at some of the strands.`);
            return true;

        /* hit has succeeded */
        } else {
            await You(`${uwep ? "cut" : "punch"} through the web.`);
            /* doesn't break "never hit with a wielded weapon" conduct */
            await use_skill_fw(wtype, 1);
        }

        deltrap_fw(trap);
        newsym(x, y);
        return true;
    }
    return false;
}

// C ref: hack.c domove_fight_empty() -- 'F' with no monster, or a
// remembered 'I' (the map's glyph at <x,y> is taken from the hero's map
// memory, which is what the displayed glyph is for a remembered 'I')
async function domove_fight_empty(x, y) {
    const unknown_obstacle = "an unknown obstacle";
    const u = game.u;
    const off_edge = !isok(x, y);
    const glyph_invis = !off_edge
                        && glyph_is_invisible(game.level.at(x, y).remembered_glyph);

    if (off_edge)
        x = 0, y = 1; /* for forcefight against the edge of the map; make
                       * sure 'bad' coordinates are within array bounds in
                       * case a bounds check gets overlooked; avoid <0,0>
                       * because m_at() might find a vault guard there */

    /* specifying 'F' with no monster wastes a turn */
    if (game.context.forcefight
        /* remembered an 'I' && didn't use a move command */
        || (glyph_invis && !m_at(x, y) && !game.context.nopick)) {
        let boulder = null;
        const explo = (u.umonnum !== u.umonster) /* Upolyd */
                      && (game.youmonst.data.mattk || []).some(a => a.aatyp === AT_EXPL);
        const solid = (off_edge || (!accessible(x, y)
                                    || IS_FURNITURE(game.level.at(x, y).typ)));
        let buf;

        if (off_edge) {
            /* treat as if solid rock, even on planes' levels */
            buf = unknown_obstacle;
        } else {
            if (!Underwater()) {
                boulder = sobj_at(BOULDER, x, y);
                /* if a statue is displayed at the target location,
                   player is attempting to attack it [and boulder
                   handling below is suitable for handling that] */
                const rg = game.level.at(x, y).remembered_glyph;
                if (rg && rg.statue)
                    throw new Error('domove_fight_empty(): attacking a displayed statue not ported yet');

                /* force fight at boulder/statue or wall/door while wielding
                   pick:  start digging to break the boulder or wall
                   (remembered 'I' and monster glyphs at the spot aren't
                   tracked by this port's map memory) */
                const glyph = glyph_at(x, y);
                if (game.context.forcefight
                    /* can we dig? */
                    && game.uwep && dig_typ(game.uwep, x, y)
                    /* should we dig? */
                    && !glyph_is_invisible(glyph)
                    && glyph.kind !== 'mon' /* !glyph_is_monster(glyph) */) {
                    await use_pick_axe2(game.uwep);
                    return true;
                }
            }

            /* about to become known empty -- remove 'I' if present */
            unmap_object(x, y);
            if (boulder)
                map_object(boulder, true);
            newsym(x, y);
            /* glyph = glyph_at(x, y): might have just changed; unused */

            if (boulder) {
                buf = ansimpleoname(boulder);
            } else if (Underwater() && !is_pool(x, y)) {
                /* Underwater, targeting non-water; the map just shows blank
                   because you don't see remembered terrain while underwater;
                   although the hero can attack an adjacent monster this way,
                   assume he can't reach out far enough to distinguish terrain */
                buf = (Is_waterlevel(u.uz) && game.level.at(x, y).typ === AIR)
                      ? "an air bubble"
                      : "nothing";
            } else if (solid) {
                /* glyph might indicate unseen terrain if hero is blind;
                   unlike searching, this won't reveal what that terrain is;
                   5.0: used to say "solid rock" for STONE, but that made it be
                   different from unmapped walls outside of rooms (and was wrong
                   on arboreal levels) */
                const lev = game.level.at(x, y);
                if (lev.seenv || IS_STWALL(lev.typ)
                    || lev.typ === SDOOR || lev.typ === SCORR) {
                    buf = the(defsyms_explanation[back_to_cmap(x, y)]);
                } else {
                    buf = unknown_obstacle;
                }
                /* note: 'solid' is misleadingly named and catches pools
                   of water and lava as well as rock and walls;
                   5.0: furniture too */
            } else {
                buf = "thin air";
            }
        }

        /* futile: */
        await You(`${!(boulder || solid) ? "" : !explo ? "harmlessly " : "futilely "}`
                  + `${explo ? "explode at" : "attack"} ${buf}.`);

        nomul(0);
        if (explo)
            throw new Error('domove_fight_empty(): explum() not ported yet');
        return true;
    }
    return false;
}

/* C ref: hack.c domove_swap_with_pet() */
async function domove_swap_with_pet(mtmp, x, y) {
    const u = game.u;
    /* if it turns out we can't actually move */
    let didnt_move = false;
    /* domove_core() has already moved the hero onto the pet's spot */
    const u_with_boulder = (sobj_at(BOULDER, u.ux, u.uy) != null);

    /* seemimic/newsym should be done before moving hero, otherwise
       the display code will draw the hero here before we possibly
       cancel the swap below (we can ignore steed mx,my here) */
    u.ux = u.ux0, u.uy = u.uy0;
    mtmp.mundetected = 0;
    if (mtmp.m_ap_type)
        seemimic(mtmp);
    u.ux = mtmp.mx, u.uy = mtmp.my; /* resume swapping positions */

    const trap = mtmp.mtrapped ? t_at(mtmp.mx, mtmp.my) : null;
    if (!trap)
        mtmp.mtrapped = 0;

    if (mtmp.mtrapped && is_pit(trap.ttyp)
        && sobj_at(BOULDER, trap.tx, trap.ty)) {
        /* can't swap places with pet pinned in a pit by a boulder */
        didnt_move = true;
    } else if (u.ux0 !== x && u.uy0 !== y && NODIAG(mtmp.data.pmidx)) {
        /* can't swap places when pet can't move to your spot */
        await You(`stop.  ${YMonnam(mtmp)} can't move diagonally.`);
        didnt_move = true;
    } else if (u_with_boulder
               && !(verysmall(mtmp.data)
                    && (!mtmp.minvent || curr_mon_load(mtmp) <= 600))) {
        /* can't swap places when pet won't fit there with the boulder */
        await You(`stop.  ${YMonnam(mtmp)} won't fit into the same spot that you're at.`);
        didnt_move = true;
    } else if (u.ux0 !== x && u.uy0 !== y && bad_rock(mtmp.data, x, u.uy0)
               && bad_rock(mtmp.data, u.ux0, y)
               && (bigmonst(mtmp.data) || (curr_mon_load(mtmp) > 600))) {
        /* can't swap places when pet won't fit thru the opening */
        await You(`stop.  ${YMonnam(mtmp)} won't fit through.`);
        didnt_move = true;
    } else if (mtmp.mpeaceful && mtmp.mtrapped) {
        /* all mtame are also mpeaceful, so this affects pets too */
        const what = trapname(trap.ttyp, false);
        let which = "that ";

        if (!trap.tseen) {
            feeltrap(trap); /* show on map once mtmp is out of the way */
            which = just_an(what); /* "a " or "an " */
        }
        await You(`stop.  ${YMonnam(mtmp)} can't move out of ${which}${what}.`);
        await handle_tip(TIP_UNTRAP_MON);
        didnt_move = true;
    } else if (mtmp.mpeaceful
               && (!goodpos(u.ux0, u.uy0, mtmp, 0)
                   || t_at(u.ux0, u.uy0) != null
                   || mundisplaceable(mtmp))) {
        /* displacing peaceful into unsafe or trapped space, or trying to
         * displace quest leader, Oracle, shk, priest, or vault guard */
        await You(`stop.  ${YMonnam(mtmp)} doesn't want to swap places.`);
        didnt_move = true;
    } else {
        mtmp.mtrapped = 0;
        /* remove_monster(x, y); place_monster(mtmp, u.ux0, u.uy0) */
        place_monster(mtmp, u.ux0, u.uy0);
        newsym(x, y);
        newsym(u.ux0, u.uy0);

        await You(`${mtmp.mpeaceful ? "swap places with" : "frighten"} ${x_monnam(mtmp,
                     mtmp.mtame ? ARTICLE_YOUR
                     : (!mtmp.mgivenname
                        && !(mtmp.data.mflags2 & M2_PNAME)) ? ARTICLE_THE
                     : ARTICLE_NONE,
                     (mtmp.mpeaceful && !mtmp.mtame) ? "peaceful" : null,
                     mtmp.mgivenname ? SUPPRESS_SADDLE : 0, false)}.`);

        /* check for displacing it into pools and traps */
        switch ((await minliquid(mtmp)) ? Trap_Killed_Mon
                : await mintrap(mtmp, NO_TRAP_FLAGS)) {
        case Trap_Effect_Finished:
            break;
        case Trap_Caught_Mon: /* trapped */
        case Trap_Moved_Mon: /* changed levels */
            /* there's already been a trap message, reinforce it */
            await abuse_dog(mtmp);
            adjalign(-3);
            break;
        case Trap_Killed_Mon:
            /* drowned or died...
             * you killed your pet by direct action, so get experience
             * and possibly penalties;
             * we want the level gain message, if it happens, to occur
             * before the guilt message below
             */
            {
                /* minliquid() and mintrap() call mondead() rather than
                   killed() so we duplicate some of the latter here */
                let tmp, mndx;

                if (!u.uconduct.killer++)
                    livelog_printf(LL_CONDUCT, "killed for the first time");
                mndx = monsndx(mtmp.data);
                tmp = experience(mtmp, game.mvitals[mndx].died);
                more_experienced(tmp, 0);
                await newexplevel(); /* will decide if you go up */
            }
            /* That's no way to treat a pet!  Your god gets angry.
             *
             * [This has always been pretty iffy.  Why does your
             * patron deity care at all, let alone enough to get mad?]
             */
            if (rn2(4)) {
                await You_feel("guilty about losing your pet like this.");
                u.ugangr = (u.ugangr || 0) + 1;
                adjalign(-15);
            }
            break;
        default:
            impossible("that's strange, unknown mintrap result!");
            break;
        }
    }
    return !didnt_move;
}

/* C ref: hack.h DOMOVE_WALK, DOMOVE_RUSH */
export const DOMOVE_WALK = 0x00000001;
export const DOMOVE_RUSH = 0x00000002;

/* C ref: hack.c domove_core() */
async function domove_core() {
    const u = game.u;
    const ctx = game.context;
    let mtmp;
    let x, y;
    /* ball&chain new positions, control for ball&chain, and
       cause_delay: dragging ball will skip a move */
    const bc = { chainx: 0, chainy: 0, ballx: 0, bally: 0,
                 bc_control: 0, cause_delay: false };
    const displaceu = { val: false }; /* involuntary swap */

    if (ctx.travel) {
        if (!(await findtravelpath(TRAVP_TRAVEL)))
            await findtravelpath(TRAVP_GUESS);
        ctx.travel1 = 0;
    }

    if (await carrying_too_much())
        return;

    if (u.uswallow) {
        u.dx = u.dy = 0;
        x = u.ustuck.mx, y = u.ustuck.my;
        await u_on_newpos(x, y); /* set u.ux,uy and handle CLIPPING */
        mtmp = u.ustuck;
    } else {
        if (await air_turbulence())
            return;

        /* check slippery ice */
        slippery_ice_fumbling();

        const xy = { x: u.ux + u.dx, y: u.uy + u.dy };
        if (impaired_movement(xy))
            return;
        x = xy.x, y = xy.y;

        /* turbulence might alter your actual destination:
           water_turbulence() */
        if (u.uinwater)
            throw new Error('domove_core(): water_turbulence() not ported yet');

        if (await move_out_of_bounds(x, y))
            return;

        if (await avoid_running_into_trap_or_liquid(x, y))
            return;

        if (await escape_from_sticky_mon(x, y))
            return;

        mtmp = m_at(x, y);
        if (mtmp && !is_safemon(mtmp)) {
            /* Don't attack if you're running, and can see it */
            /* It's fine to displace pets, though */
            /* We should never get here if forcefight */
            if (ctx.run && ((!Blind() && mon_visible(mtmp)
                             && ((mtmp.m_ap_type !== M_AP_FURNITURE
                                  && mtmp.m_ap_type !== M_AP_OBJECT)
                                 || Protection_from_shape_changers()))
                            || sensemon(mtmp))) {
                nomul(0);
                ctx.move = 0;
                return;
            }
        }
    }

    u.ux0 = u.ux;
    u.uy0 = u.uy;
    game.bhitpos = { x, y };
    const tmpr = game.level.at(x, y);
    const glyph = glyph_at(x, y);

    if (mtmp) {
        /* don't stop travel when displacing pets; if the
           displace fails for some reason, do_attack() in uhitm.c
           will stop travel rather than domove */
        if (!is_safemon(mtmp) || ctx.forcefight)
            nomul(0);

        if (await domove_bump_mon(mtmp, glyph))
            return;

        /* attack monster */
        if (await domove_attackmon_at(mtmp, x, y, displaceu))
            return;
    }

    if (!displaceu.val) {

        if (await domove_fight_ironbars(x, y))
            return;

        if (await domove_fight_web(x, y))
            return;

        if (await domove_fight_empty(x, y))
            return;

        unmap_invisible(x, y);
        /* not attacking an animal, so we try to move */
        if ((u.dx || u.dy) && u.usteed && await stucksteed(false)) {
            nomul(0);
            return;
        }

        if (await u_rooted())
            return;

        /* handling for paranoid_confirm:Trap which doubles as
           paranoid_confirm:Region */
        if (ParanoidTrap()) {
            if (await avoid_trap_andor_region(x, y))
                return;
        }

        if (u.utrap) { /* when u.utrap is True, displaceu is False */
            const moved = await trapmove(x, y, null);

            if (!u.utrap) {
                game.disp_botl = true;
                await reset_utrap(true); /* might resume levitation or flight */
            }
            /* might not have escaped, or did escape but remain in the same
               spot */
            if (!moved)
                return;
        }

        if (!await test_move(u.ux, u.uy, x - u.ux, y - u.uy, DO_MOVE)) {
            if (!ctx.door_opened) {
                ctx.move = 0;
                nomul(0);
            }
            return;
        }

        /* Is it dangerous to swim in water or lava? */
        if (await swim_move_danger(x, y)) {
            ctx.move = 0;
            nomul(0);
            return;
        }
    } /* !displaceu */

    /* Move ball and chain.  */
    if (Punished())
        if (!await drag_ball(x, y, bc, true))
            return;

    /* Check regions entering/leaving */
    if (!(await in_out_region(x, y)))
        return;

    mtmp = m_at(x, y);
    /* mtmp can be null at this point */

    /* tentatively move the hero plus steed; leave CLIPPING til later */
    u.ux += u.dx;
    u.uy += u.dy;

    await m_postmove_effect(game.youmonst);

    if (u.usteed) {
        u.usteed.mx = u.ux;
        u.usteed.my = u.uy;
        /* [if move attempt ends up being blocked, should training count?] */
        await exercise_steed(); /* train riding skill */
    }

    if (mtmp) {
        if (displaceu.val) {
            throw new Error('domove_core(): displacer beast swap not ported yet');
        /*
         * If safepet at destination then move the pet to the hero's
         * previous location using the same conditions as in do_attack().
         * there are special extenuating circumstances:
         * (1) if the pet dies then your god angers,
         * (2) if the pet gets trapped then your god may disapprove.
         *
         * Ceiling-hiding pets are skipped by this section of code, to
         * be caught by the normal falling-monster code.
         */
        } else if (is_safemon(mtmp)
                   && !(is_hider(mtmp.data) && mtmp.mundetected)) {
            if (!await domove_swap_with_pet(mtmp, x, y)) {
                u.ux = u.ux0, u.uy = u.uy0; /* didn't move after all */
            }
        }
    }  /* mtmp != NULL */

    /* tentative move above didn't handle CLIPPING, in case there was a
       monster in the way and the move attempt ended up being blocked;
       do a full re-position now, possibly back to where hero started */
    await u_on_newpos(u.ux, u.uy);

    /* reset_occupations(): occupations aren't ported yet */
    if (ctx.run) {
        if (ctx.run < 8)
            if (IS_DOOR(tmpr.typ) || IS_OBSTRUCTED(tmpr.typ)
                || IS_FURNITURE(tmpr.typ))
                nomul(0);
    }

    /* your tread on the ground may disturb the slumber of nearby zombies */
    if (!Levitation() && !Flying() && !Stealth()
        && game.youmonst.data.cwt >= Math.trunc(WT_ELF / 2))
        disturb_buried_zombies(u.ux, u.uy);
    if (hides_under(game.youmonst.data) || game.youmonst.data.mlet === S_EEL
        || u.dx || u.dy)
        hideunder(game.youmonst);

    await check_leash(u.ux0, u.uy0);

    if (u.ux0 !== u.ux || u.uy0 !== u.uy) {
        /* let caller know so that an evaluation may take place */
        game.domove_succeeded |= (game.domove_attempting & (DOMOVE_RUSH | DOMOVE_WALK));
        u.umoved = 1;
        /* Clean old position -- vision_recalc() will print our new one. */
        newsym(u.ux0, u.uy0);
        /* Since the hero has moved, adjust what can be seen/unseen. */
        vision_recalc(1); /* Do the work now in the recover time. */
        /* invocation_message(): only on the vibrating square level */
    }

    if (Punished()) /* put back ball and chain */
        move_bc(0, bc.bc_control, bc.ballx, bc.bally, bc.chainx, bc.chainy);

    if (u.umoved)
        await spoteffects(true);

    /* delay next move because of ball dragging */
    /* must come after we finished picking up, in spoteffects() */
    if (bc.cause_delay) {
        nomul(-2);
        game.multi_reason = "dragging an iron ball";
        game.nomovemsg = "";
    }

    await runmode_delay_output();
}

// C ref: hack.c runmode_delay_output()
export async function runmode_delay_output() {
    const g = game;
    if ((g.context.run || g.multi) && g.flags.runmode !== RUN_TPORT) {
        /* for tport mode, don't display anything until we've stopped;
           for normal (leap) mode, update display every 7th step
           (relative to turn counter; ought to be to start of running);
           for walk and crawl (visual debugging) modes, update the
           display after every step */
        if (g.flags.runmode !== RUN_LEAP || !(g.moves % 7)) {
            /* moveloop() suppresses time_botl when running */
            g.disp_time_botl = !!g.flags.time;
            await flush_screen_hk(1); /* curs_on_u() */
            /* nh_delay_output(): display timing only */
        }
    }
}

// C ref: hack.c domove()
export async function domove() {
    const u = game.u;
    const ux1 = u.ux, uy1 = u.uy;

    game.domove_succeeded = 0;
    await domove_core();
    /* domove_succeeded is available to make assessments now */
    if ((game.domove_succeeded & (DOMOVE_RUSH | DOMOVE_WALK)) !== 0) {
        maybe_smudge_engr(ux1, uy1, u.ux, u.uy);
        /* maybe_adjust_hero_bubble(): Plane of Water only */
    }
    game.domove_attempting = 0;

    game.kickedloc = { x: 0, y: 0 };
}

/* C ref: hack.c maybe_smudge_engr() */
function maybe_smudge_engr(x1, y1, x2, y2) {
    let ep;

    if (can_reach_floor(true)) {
        if ((ep = engr_at(x1, y1)) && ep.engr_type !== HEADSTONE)
            wipe_engr_at(x1, y1, rnd(5), false);
        if ((x2 !== x1 || y2 !== y1)
                && (ep = engr_at(x2, y2)) && ep.engr_type !== HEADSTONE)
            wipe_engr_at(x2, y2, rnd(5), false);
    }
}
/* C ref: display.h glyph_to_obj() for the JS glyph form: an object glyph
   keeps its objects[] index in 'otyp'; anything else is NUM_OBJECTS */
function glyph_to_obj_hk(glyph) {
    return (glyph && glyph.kind === 'obj' && glyph.otyp !== undefined
            && glyph.otyp !== null) ? glyph.otyp : -1;
}

// C ref: hack.c spot_checks()
export function spot_checks(x, y, old_typ) {
    const new_typ = game.level.at(x, y).typ;
    let db_ice_now = false;

    switch (old_typ) {
    case DRAWBRIDGE_UP_SC:
        db_ice_now = ((game.level.at(x, y).drawbridgemask & DB_UNDER_SC)
                      === DB_ICE_SC);
        /*FALLTHRU*/
    case ICE_SC:
        if ((new_typ !== old_typ)
            || (old_typ === DRAWBRIDGE_UP_SC && !db_ice_now)) {
            /* make sure there's no MELT_ICE_AWAY timer */
            if (spot_time_left_sc(x, y, MELT_ICE_AWAY_SC)) {
                spot_stop_timers_sc(x, y, MELT_ICE_AWAY_SC);
            }
            /* adjust things affected by the ice */
            obj_ice_effects_sc(x, y, false);
        }
        break;
    }
}

/* C ref: hack.c rounddiv() */
export function rounddiv(x, y) {
    let r, m;
    let divsgn = 1;

    if (y === 0)
        throw new Error('division by zero in rounddiv');
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
