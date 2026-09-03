// zap.js — wands, spells and the rays they throw.
// C ref: src/zap.c
//
// Only obj_resists() is here so far. It is the first thing needed from this
// file because meatmetal() calls it before eating anything, which puts its
// rn2(100) into the stream ahead of the next monster's turn.

import { sleep_monst } from './mhitm.js';
import { M_AP_FURNITURE } from './const.js';
import { fix_petrification } from './eat.js';
import { polymon } from './polyself.js';
import { Drain_resistance } from './youprop.js';
import { mdistu } from './monmove.js';
import { set_msg_xy } from './pline.js';
import { sgn } from './hacklib.js';
import { newexplevel } from './exper.js';
import { is_obj_mappear } from './monst.js';
import { abuse_dog } from './dog.js';
import { is_cmap_door } from './pager.js';
import { mhurtle } from './uhitm.js';
import { m_is_steadfast } from './uhitm.js';
import { that_is_a_mimic } from './uhitm.js';
import { disguised_as_mon } from './uhitm.js';
import { expels } from './mhitu.js';
import { uhis } from './mhitu.js';
import { livelog_printf } from './pline.js';
import { u_teleport_mon } from './teleport.js';
import { rloco } from './teleport.js';
import { urgent_pline } from './display.js';
import { newsym_force } from './display.js';
import { hero_breaks } from './dothrow.js';
import { breaks } from './dothrow.js';
import { unpunish } from './read.js';
import { obj_stop_timers } from './timeout.js';
import { rndmonnam } from './do_name.js';
import { a_monnam } from './do_name.js';
import { NUMMONS } from './monst_data.js';
import { MFLAGS } from './monst_data.js';
import { mindless } from './mondata.js';
import { resists_drli } from './mondata.js';
import { is_whirly } from './mondata.js';
import { vegetarian } from './mondata.js';
import { newmcorpsenm } from './makemon.js';
import { monsndx } from './makemon.js';
import { set_mimic_sym } from './makemon.js';
import { is_golem } from './makemon.js';
import { m_respond } from './mon.js';
import { mimic_hit_msg } from './mon.js';
import { mcureblindness } from './mon.js';
import { maybe_unhide_at } from './mon.js';
import { check_gear_next_turn } from './mon.js';
import { Shknam } from './shknam.js';
import { monflee } from './monmove.js';
import { inhishop } from './monmove.js';
import { self_invis_message } from './do_wear.js';
import { set_wear } from './do_wear.js';
import { setuqwep } from './wield.js';
import { setuswapwep } from './wield.js';
import { set_twoweap } from './wield.js';
import { setuwep } from './wield.js';
import { mdrop_obj } from './steal.js';
import { remove_worn_item } from './steal.js';
import { mon_set_minvis } from './worn.js';
import { wearmask_to_obj } from './worn.js';
import { setworn } from './worn.js';
import { bypass_obj } from './worn.js';
import { wearslot } from './worn.js';
import { merged } from './invent.js';
import { display_minventory } from './invent.js';
import { display_cinventory } from './invent.js';
import { set_cknown_lknown } from './invent.js';
import { addinv_core2 } from './invent.js';
import { addinv_core1 } from './invent.js';
import { freeinv_core } from './invent.js';
import { hot_pursuit } from './shk.js';
import { make_angry_shk } from './shk.js';
import { contained_cost } from './shk.js';
import { delete_contents } from './shk.js';
import { MCORPSENM } from './const.js';
import { ismnum } from './const.js';
import { BOLT_LIM } from './const.js';
import { PICK_NONE } from './const.js';
import { MINV_NOLET } from './const.js';
import { MINV_ALL } from './const.js';
import { MIM_OMIT_WAIT } from './const.js';
import { MIM_REVEAL } from './const.js';
import { TELL } from './const.js';
import { LL_CONDUCT } from './const.js';
import { G_GENOD } from './const.js';
import { LARGEST_INT } from './const.js';
import { W_SADDLE } from './const.js';
import { W_QUIVER } from './const.js';
import { W_SWAPWEP } from './const.js';
import { W_WEAPONS } from './const.js';
import { W_ARTI } from './const.js';
import { MAX_SPELL_STUDY } from './const.js';
import { Has_contents } from './const.js';
import { o_unleash } from './apply.js';
import { carried } from './obj.js';
import { bimanual } from './obj.js';
import { is_poisonable } from './obj.js';
import { stone_object_type } from './mkobj.js';
import { stone_furniture_type } from './mkobj.js';
import { replace_object } from './mkobj.js';
import { fixup_oil } from './mkobj.js';
import { is_corrodeable } from './mkobj.js';
import { is_crackable } from './mkobj.js';
import { is_rustprone } from './mkobj.js';
import { can_be_hatched } from './mkobj.js';
import { kill_egg } from './timeout.js';
import { is_damageable } from './trap.js';
import { is_mplayer } from './mondata.js';
import { doorlock } from './lock.js';
import { reset_pick } from './lock.js';
import { picking_at } from './lock.js';
import { defsyms } from './drawing_data.js';
import { dissolve_bars } from './monmove.js';
import { dryup } from './fountain.js';
import { is_pool_or_lava } from './dbridge.js';
import { ship_object } from './dokick.js';
import { hits_bars } from './mthrowu.js';
import { MON_WEP } from './monst.js';
import { shkcatch } from './shk.js';
import { inside_shop } from './shk.js';
import { add_damage } from './shk.js';
import { pay_for_damage } from './shk.js';
import { stop_occupation } from './allmain.js';
import { set_uinwater } from './hack.js';
import { test_move } from './hack.js';
import { nomul } from './hack.js';
import { xytodir } from './cmd.js';
import { slept_monst } from './mhitm.js';
import { mon_reflects } from './muse.js';
import { death_inflicted_by } from './mcastu.js';
import { done } from './end.js';
import { spot_stop_timers } from './timeout.js';
import { spot_time_left } from './timeout.js';
import { burn_away_slime } from './timeout.js';
import { ugolemeffects } from './polyself.js';
import { shade_miss } from './uhitm.js';
import { erode_armor } from './uhitm.js';
import { disintegrate_arm } from './do_wear.js';
import { Ring_gone } from './do_wear.js';
import { recharge } from './read.js';
import { distu } from './hacklib.js';
import { strsubst } from './hacklib.js';
import { hcolor } from './do_name.js';
import { killer_xname } from './objnam.js';
import { the } from './objnam.js';
import { Invocation_lev } from './dungeon.js';
import { draft_message } from './dig.js';
import { show_map_spot } from './detect.js';
import { set_utrap } from './trap.js';
import { reset_utrap } from './trap.js';
import { acid_damage } from './trap.js';
import { delfloortrap } from './trap.js';
import { explode } from './explode.js';
import { setnotworn } from './worn.js';
import { which_armor } from './worn.js';
import { extract_from_minvent } from './worn.js';
import { is_quest_artifact } from './questpgr.js';
import { mnearto } from './mon.js';
import { is_pick } from './mon.js';
import { mlifesaver } from './mon.js';
import { P_SKILL } from './weapon.js';
import { spell_skilltype } from './spell.js';
import { poisoned } from './attrib.js';
import { ACURR } from './attrib.js';
import { Disint_resistance } from './youprop.js';
import { Acid_resistance } from './youprop.js';
import { pline_dir } from './pline.js';
import { unmap_object } from './display.js';
import { glyph_is_invisible_at } from './display.js';
import { glyph_at } from './display.js';
import { P_EXPERT } from './const.js';
import { P_SKILLED } from './const.js';
import { P_BASIC } from './const.js';
import { P_UNSKILLED } from './const.js';
import { P_ISRESTRICTED } from './const.js';
import { ERODE_CORRODE } from './const.js';
import { ARM } from './const.js';
import { EYE } from './const.js';
import { ROWNO } from './const.js';
import { COLNO } from './const.js';
import { NOTELL } from './const.js';
import { DIED } from './const.js';
import { CORR } from './const.js';
import { W_ARMU } from './const.js';
import { W_ARMC } from './const.js';
import { IS_FOUNTAIN } from './const.js';
import { In_mines } from './const.js';
import { Is_rogue_level } from './const.js';
import { is_hole } from './const.js';
import { TEST_MOVE } from './const.js';
import { WAND_BACKFIRE_CHANCE } from './const.js';
import { GETOBJ_NOFLAGS } from './const.js';
import { DISINT_RES } from './const.js';
import { M_SEEN_REFL } from './const.js';
import { M_SEEN_ACID } from './const.js';
import { M_SEEN_ELEC } from './const.js';
import { M_SEEN_DISINT } from './const.js';
import { M_SEEN_SLEEP } from './const.js';
import { M_SEEN_COLD } from './const.js';
import { M_SEEN_FIRE } from './const.js';
import { XKILL_NOMSG } from './const.js';
import { XKILL_GIVEMSG } from './const.js';
import { PLNMSG_ENVELOPED_IN_GAS } from './const.js';
import { PHYS_EXPL_TYPE } from './const.js';
import { SHOP_DOOR_COST } from './const.js';
import { SHOP_BARS_COST } from './const.js';
import { W_NONDIGGABLE } from './const.js';
import { INVIS_BEAM } from './const.js';
import { THROWN_TETHERED_WEAPON } from './const.js';
import { EXPL_FIERY } from './const.js';
import { EXPL_MAGICAL } from './const.js';
import { TRAP_EXPLODE } from './const.js';
import { is_magical_trap } from './const.js';
import { undestroyable_trap } from './const.js';
import { db_under_typ } from './dbridge.js';
import { resists_acid } from './mondata.js';
import { resists_poison } from './mondata.js';
import { monstunseesu } from './mondata.js';
import { monstseesu } from './mondata.js';
import { resists_disint } from './mondata.js';
import { perceives } from './mondata.js';
import { eyecount } from './mondata.js';
import { completelyburns } from './mondata.js';
import { amphibious } from './mondata.js';
import { ureflects } from './muse.js';
import { mintrap } from './trap.js';
import { noit_Monnam } from './do_name.js';
import { mstatusline } from './insight.js';
import { stolen_value, addtobill } from './shk.js';
import { container_weight } from './mkobj.js';
import { free_oname } from './do_name.js';
import { OBJ_AT } from './const.js';
import { openfallingtrap } from './trap.js';
import { losehp } from './hack.js';
import { hides_under } from './mondata.js';
import { hideunder } from './makemon.js';
import { ok_to_quest } from './quest.js';
import { find_drawbridge, open_drawbridge, close_drawbridge, destroy_drawbridge, is_db_wall } from './dbridge.js';
import { cant_revive } from './read.js';
import { eaten_stat, obfree } from './invent.js';
import { christen_monst, mon_pmname, Amonnam, noname_monnam, upstart } from './do_name.js';
import { find_mid } from './light.js';
import { shop_keeper, shk_your, Shk_Your } from './shk.js';
import { corpse_xname, cxname_singular } from './objnam.js';
import { mon_adjust_speed } from './worn.js';
import { wary_dog, tamedog } from './dog.js';
import { enexto } from './teleport.js';
import { cant_finish_meal } from './eat.js';
import { restore_cham, mongone, delobj_core } from './mon.js';
import { is_reviver, dmgtype, type_is_pname, unique_corpstat } from './mondata.js';
import { makemon, monhp_per_lvl, MM_NOMSG, NO_MINVENT } from './makemon.js';
import { get_mtraits, corpse_revive_type, add_to_minv } from './mkobj.js';
import { has_omonst, has_omid, free_omid, free_omonst, OMID, ONAME, has_oname, OBJ_FREE, OBJ_ONBILL, OBJ_LUAFREE, GRAVE, IS_POOL, CORPSTAT_GENDER, CORPSTAT_MALE, CORPSTAT_FEMALE, MM_NOWAIT, MM_NOCOUNTBIRTH, MM_MALE, MM_FEMALE, MM_NOTAIL, MM_ADJACENTOK, FM_FMON, PLNMSG_OBJ_GLOWS, CXN_PFX_THE, CXN_NORMAL, CXN_NO_PFX, ARTICLE_THE, NO_NC_FLAGS } from './const.js';
import { POLY_NOFLAGS } from './const.js';
import { Unchanging } from './youprop.js';
import { rnd_hallublast } from './mthrowu.js';
import { disguised_as_non_mon } from './uhitm.js';
import { uhim } from './mhitu.js';
import { ansimpleoname, bare_artifactname } from './objnam.js';
import { Is_box } from './obj.js';
import { boxlock } from './lock.js';
import { in_rooms } from './hack.js';
import { CORPSTAT_HISTORIC } from './const.js';
import { Role_if, adjalign } from './attrib.js';
import { does_block } from './vision.js';
import { sokoban_guilt } from './trap.js';
import { breakobj } from './dothrow.js';
import { shkname } from './shknam.js';
import { costly_spot, billable } from './shk.js';
import { game } from './gstate.js';
import { isok, s_suffix } from './hacklib.js';
import { is_lava, is_pool, m_at, t_at } from './mon.js';
import { cansee, couldsee, block_point, unblock_point, recalc_block_point,
         vision_recalc } from './vision.js';
import { display_cmap_at, display_object_at, flush_screen, map_invisible,
         newsym, shieldeff, temporary_object_glyph,
         unmap_invisible, bot, docrt } from './display.js';
import { closed_door } from './cmd.js';
import { is_drawbridge_wall, is_ice, is_moat } from './dbridge.js';

import { STONE, WATER, LAVAWALL, IRONBARS, IS_SINK, POOL, MOAT, WEB, u_at,
         THROWN_WEAPON, KICKED_WEAPON, ZAPPED_WAND, FLASHED_LIGHT, M_AP_TYPE,
         M_AP_NOTHING, M_AP_MONSTER, M_AP_OBJECT, ICE, DRAWBRIDGE_UP,
         DRAWBRIDGE_DOWN, DB_ICE, DB_UNDER, DB_FLOOR, ICED_POOL, ICED_MOAT,
         ROOM, PIT, VWALL, HWALL, IS_WALL, IS_WATERWALL,
         TT_LAVA, TT_INFLOOR,
         Is_airlevel, Is_waterlevel, st_all, plur,
         ONAME_WISH, ONAME_KNOW_ARTI, IS_ROOM, STRAT_WAITMASK,
         ZAP_POS, W_ARM, W_ARMS, W_ARMG, W_ARMH, W_WEP, W_AMUL, HI_ZAP,
         W_RING, W_ARMOR, W_ACCESSORY, W_ART,
         A_STR, A_CON, A_CHA, A_DEX, A_INT, M_SEEN_MAGR,
         KILLED_BY_AN, KILLED_BY, NO_KILLER_PREFIX,
         LEVITATION, FLYING, DOOR, SDOOR,
         D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED, D_TRAPPED,
         IS_DOOR, IS_DRAWBRIDGE, IS_FURNITURE, SCORR, SHOPBASE, NC_SHOW_MSG,
         NC_VIA_WAND_OR_SPELL, NON_PM, HEADSTONE, HEAD,
         XKILL_NOCORPSE, BEAR_TRAP, LANDMINE, MAGIC_PORTAL, STATUE_TRAP,
         VIBRATING_SQUARE, HOLE, TRAPDOOR, ROCKTRAP, is_pit,
         NO_TRAP_FLAGS, FORCETRAP, ENGRAVE, FACE, FOOT, LEG,
         COST_DRAIN, TIMEOUT, INTRINSIC,
         ANIMATE_SPELL, In_sokoban, Upolyd } from './const.js';
import { mungspaces } from './hacklib.js';
import { display_binventory, hands_obj, hold_another_object } from './invent.js';
import { force_decor, u_safe_from_fatal_corpse } from './pickup.js';
import { an, aobjnam, doname } from './objnam.js';
import { artifact_origin, defends, defends_when_carried } from './artifact.js';
import { tty_create_nhwindow, tty_putstr, tty_display_nhwindow,
         tty_destroy_nhwindow, NHW_TEXT } from './tty/wintty.js';
import { OCLASSES } from './objects_data.js';
import { DEADMONSTER, is_vampshifter } from './monst.js';
import { killed, monkilled, seemimic, shieldeff_mon, wakeup,
         wake_nearto, healmon, newcham, validspecmon, xkilled,
         set_ustuck, unstuck } from './mon.js';
import { ONAMES } from './objects_data.js';
import { rn2, rnd, d } from './rng.js';
import { is_rider, create_critters } from './makemon.js';
import { OBJ_INVENT, OBJ_MINVENT, OBJ_BURIED, OBJ_CONTAINED, OBJ_MIGRATING, BURIED_TOO, CONTAINED_TOO } from './const.js';
import { getobj, GETOBJ_SUGGEST, GETOBJ_EXCLUDE, update_inventory,
         stackobj } from './invent.js';
import { getdir } from './cmd.js';
import { attach_egg_hatch_timeout, fall_asleep,
         MELT_ICE_AWAY, peek_timer, start_timer, stop_timer,
         REVIVE_MON, ROT_CORPSE, TIMER_LEVEL, TIMER_OBJECT }
    from './timeout.js';
import { healup, make_stunned, potionbreathe } from './potion.js';
import { cvt_sdoor_to_door, findit } from './detect.js';
import { readobjnam } from './objnam.js';
import { getlin } from './cmd.js';
import { prinv, reorder_invent, addinv } from './invent.js';
import { makeknown, observe_object } from './o_init.js';
import { losexp, more_experienced } from './exper.js';
import { encumber_msg, exercise, Fast, Very_fast } from './attrib.js';
import { A_WIS } from './const.js';
import { rn1 } from './rng.js';
import { livelog_add, Norep, pline_The, You, Your, You_feel,
         You_hear } from './pline.js';
import { pline } from './display.js';
import { An, The, distant_name, vtense, xname, Yname2, yname, makeplural,
         Tobjnam, Yobjnam2, otense } from './objnam.js';
import { Monnam, mon_nam, noit_mon_nam, hliquid } from './do_name.js';
import { canseemon, canspotmon } from './display.js';
import { engulfing_u } from './const.js';
import { nothing_happens, ECMD_OK, ECMD_TIME, ECMD_CANCEL, NODIR, IMMEDIATE,
         OBJ_FLOOR } from './const.js';
import { splitobj, mkobj, mksobj, mksobj_at, place_object, rnd_class,
         set_corpsenm,
         dead_species, erosion_matters, is_weptool, unbless,
         uncurse, obj_ice_effects } from './mkobj.js';
import { delobj } from './mon.js';
import { obj_extract_self, sobj_at, useup, useupall, useupf, weight }
    from './invent.js';
import { closeholdingtrap, is_flammable, is_rottable, burnarmor,
         activate_statue_trap, animate_statue, deltrap, dotrap, ignite_items,
         openholdingtrap, trapname } from './trap.js';
import { Is_container, is_metallic } from './obj.js';
import { MATERIALS } from './objects_data.js';
import { ATTKS, MONSYMS, PMNAMES } from './monst_data.js';
import { breathless, defended, haseyes, resists_blnd, resists_blnd_by_arti,
         resists_cold,
         resists_elec, resists_fire, resists_magm, resists_sleep,
         nohands, nonliving, is_demon, is_undead, carnivorous, digests,
         sticks, is_swimmer }
    from './mondata.js';
import { find_mac } from './worn.js';
import { Reflecting, Sleep_resistance, Fire_resistance, Cold_resistance,
         Shock_resistance, Blind, Deaf, Unaware, Hallucination,
         Invis, See_invisible, Teleport_control,
         Underwater, Levitation, Antimagic, Passes_walls } from './youprop.js';
import { cmap_names } from './drawing_data.js';
import { CLR_ORANGE, CLR_WHITE, CLR_BLACK, CLR_GREEN,
         CLR_YELLOW } from './terminal.js';
import { create_gas_cloud } from './region.js';
import { show_transient_light, transient_light_cleanup } from './light.js';
import { boolean_option } from './options.js';
import { finish_meating } from './dogmove.js';
import { name_to_monplus } from './mondata.js';
import { del_engr, engr_at, make_engr_at, random_engraving, rloc_engr,
         wipe_engr_at } from './engrave.js';
import { ceiling, surface } from './dungeon.js';
import { body_part } from './polyself.js';
import { find_ac, hard_helmet } from './do_wear.js';
import { tele } from './teleport.js';
import { ustatusline, enlightenment } from './insight.js';
import { MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS } from './const.js';
import { display_nhwindow_message } from './display.js';
import { waterbody_name } from './pager.js';

// include/rm.h:538 Sokoban is the level's active rule flag.
const Sokoban = () => !!game.level?.flags?.sokoban_rules;

// src/zap.c:1459 obj_resists() — does this object survive being destroyed?
//
// ochance/achance are PERCENTAGES, and the artifact one is checked against the
// same single draw, so the rn2(100) is spent whether or not the object is an
// artifact. Skipping the draw for ordinary objects would desynchronise the
// stream even when the answer happened to be right.
export function obj_resists(obj, ochance, achance) {
    if (obj.otyp === ONAMES.AMULET_OF_YENDOR
        || obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD
        || obj.otyp === ONAMES.CANDELABRUM_OF_INVOCATION
        || obj.otyp === ONAMES.BELL_OF_OPENING
        || (obj.otyp === ONAMES.CORPSE && is_rider(game.mons[obj.corpsenm]))) {
        return true;
    } else {
        const chance = rn2(100);

        return chance < (obj.oartifact ? achance : ochance);
    }
}

// src/zap.c:1367 blank_novel()
export function blank_novel(obj) {
    /* novelidx overloads corpsenm, not used for spellbooks */
    obj.novelidx = 0;
    free_oname(obj); /* get rid of [former] novel's title */
    /* a blank spellbook weighs more than a novel; update obj's weight and
       recursively the weight of any container holding it */
    container_weight(obj);
}

// src/zap.c:1382 drain_item(). Remove one positive charge or enchantment and
// immediately adjust every derived effect supplied by a worn hero item.
export async function drain_item(obj, by_you) {
    const oclass = game.objects[obj?.otyp];
    if (!obj
        || (!oclass?.oc_charged
            && obj.oclass !== OCLASSES.WEAPON_CLASS
            && obj.oclass !== OCLASSES.ARMOR_CLASS
            && !is_weptool(obj))
        || (obj.spe | 0) <= 0)
        return false;
    if (defends(ATTKS.AD_DRLI, obj)
        || defends_when_carried(ATTKS.AD_DRLI, obj)
        || obj_resists(obj, 10, 90))
        return false;

    if (by_you) {
        const { costly_alteration } = await import('./shk.js');
        await costly_alteration(obj, COST_DRAIN);
    }

    obj.spe--;
    const u = game.u;
    const wornmask = obj.owornmask | 0;
    const uRing = obj === u.uleft || obj === u.uright;
    const abon = (u.abon ||= {}).a
        ||= new Array(u.acurr?.a?.length || 6).fill(0);

    switch (obj.otyp) {
    case ONAMES.RIN_GAIN_STRENGTH:
        if ((wornmask & W_RING) && uRing) {
            abon[A_STR]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_GAIN_CONSTITUTION:
        if ((wornmask & W_RING) && uRing) {
            abon[A_CON]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_ADORNMENT:
        if ((wornmask & W_RING) && uRing) {
            abon[A_CHA]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.RIN_INCREASE_ACCURACY:
        if ((wornmask & W_RING) && uRing)
            u.uhitinc = (u.uhitinc || 0) - 1;
        break;
    case ONAMES.RIN_INCREASE_DAMAGE:
        if ((wornmask & W_RING) && uRing)
            u.udaminc = (u.udaminc || 0) - 1;
        break;
    case ONAMES.RIN_PROTECTION:
        if (uRing) {
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.HELM_OF_BRILLIANCE:
        if ((wornmask & W_ARMH) && obj === u.uarmh) {
            abon[A_INT]--;
            abon[A_WIS]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    case ONAMES.GAUNTLETS_OF_DEXTERITY:
        if ((wornmask & W_ARMG) && obj === u.uarmg) {
            abon[A_DEX]--;
            (game.disp ||= {}).botl = true;
        }
        break;
    default:
        break;
    }
    if (game.disp?.botl)
        await bot();
    if ((game.invent || []).includes(obj))
        update_inventory();
    return true;
}

// src/zap.c:3547 exclam() — the punctuation that ends a hit message, and it
// encodes the damage: "?" for a negative force, "." for 4 or less, "!" above
// that. force == 0 happens with e.g. a sleep ray.
export function exclam(force) {
    return (force < 0) ? '?' : (force <= 4) ? '.' : '!';
}

// src/zap.c:6100 resist() — the magic-resistance saving throw.
//
// One draw, and its MODULUS is computed rather than constant:
//
//     resisted = rn2(100 + alev - dlev) < mtmp->data->mr;
//
// alev comes from the item class attacking (a wand is 12, an instrument or
// artifact 10, a scroll 9, a potion 6, a ring 5, a spell your own level) and
// dlev from the monster, clamped to 50 above and raised to 1 below. So the
// span of the roll differs per call and rn2's argument is NOT interchangeable
// with a fixed 100 -- getting alev wrong changes the stream, not just the
// odds.
//
// The fake-player shortcut returns BEFORE the draw, so a Conflict ring test
// against an mplayer costs nothing.
//
// Damage halving is (damage + 1) / 2, rounding UP, so a resisted 1 point
// still does 1.
//
// shieldeff_mon, monkilled and the m_using distinction are recorded; killed
// is real.
export async function resist(mtmp, oclass, damage, tell) {
    let resisted;
    let alev, dlev;

    /* fake players always pass resistance test against Conflict
       (this doesn't guarantee that they're never affected by it) */
    if (oclass === OCLASSES.RING_CLASS && !damage && !tell && is_mplayer(mtmp.data))
        return 1;

    /* attack level */
    switch (oclass) {
    case OCLASSES.WAND_CLASS:
        alev = 12;
        break;
    case OCLASSES.TOOL_CLASS:
        alev = 10;
        break; /* instrument */
    case OCLASSES.WEAPON_CLASS:
        alev = 10;
        break; /* artifact */
    case OCLASSES.SCROLL_CLASS:
        alev = 9;
        break;
    case OCLASSES.POTION_CLASS:
        alev = 6;
        break;
    case OCLASSES.RING_CLASS:
        alev = 5;
        break;
    default:
        alev = game.u.ulevel;
        break; /* spell */
    }
    /* defense level */
    dlev = mtmp.m_lev;
    if (dlev > 50)
        dlev = 50;
    else if (dlev < 1)
        dlev = is_mplayer(mtmp.data) ? game.u.ulevel : 1;

    resisted = rn2(100 + alev - dlev) < mtmp.data.mr;
    if (resisted) {
        if (tell)
            await shieldeff_mon(mtmp);
        damage = Math.trunc((damage + 1) / 2);
    }

    if (damage) {
        mtmp.mhp -= damage;
        if (DEADMONSTER(mtmp)) {
            if (game.m_using)
                await monkilled(mtmp, '', ATTKS.AD_RBRE);
            else
                await killed(mtmp);
        }
    }
    return resisted;
}


function note_unported_zap(what) {
    (game.unported ||= new Set()).add('zap:' + what);
}

// src/zap.c:2618 zap_ok() — getobj callback for 'z'.
export function zap_ok(obj) {
    if (obj && obj.oclass === OCLASSES.WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// src/zap.c:2514 zappable() — does the wand have a charge to spend?
//
// The wrest roll rn2(WAND_WREST_CHANCE=121) fires ONLY at exactly zero
// charges; a wand with charges pays none.
export async function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(121)))
        return 0;
    if (wand.spe === 0)
        await You("wrest one last charge from the worn-out wand.");
    wand.spe--;
    return 1;
}

export function increment_intrinsic_timeout(key, amount) {
    const intrinsic = game.u.intrinsic ||= {};
    const current = intrinsic[key] | 0;
    const timeout = Math.max(0, Math.min(TIMEOUT,
        (current & TIMEOUT) + amount));
    intrinsic[key] = (current & ~TIMEOUT) | timeout;
}

// src/zap.c:1239 cancel_item(). Cancellation removes enchantment and magic
// from exposed inventory while preserving the few explicitly immune items.
function cancel_item(obj) {
    const otyp = obj.otyp;
    const wornmask = obj.owornmask | 0;
    const abon = (game.u.abon ||= {}).a
        ||= new Array(game.u.acurr?.a?.length || 6).fill(0);

    if ((game.invent || []).includes(obj)) {
        switch (otyp) {
        case ONAMES.RIN_GAIN_STRENGTH:
            if (wornmask & W_RING) {
                abon[A_STR] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_GAIN_CONSTITUTION:
            if (wornmask & W_RING) {
                abon[A_CON] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_ADORNMENT:
            if (wornmask & W_RING) {
                abon[A_CHA] -= obj.spe | 0;
                (game.disp ||= {}).botl = true;
            }
            break;
        case ONAMES.RIN_INCREASE_ACCURACY:
            if (wornmask & W_RING)
                game.u.uhitinc = (game.u.uhitinc || 0) - (obj.spe | 0);
            break;
        case ONAMES.RIN_INCREASE_DAMAGE:
            if (wornmask & W_RING)
                game.u.udaminc = (game.u.udaminc || 0) - (obj.spe | 0);
            break;
        case ONAMES.RIN_PROTECTION:
            if (wornmask & W_RING)
                (game.disp ||= {}).botl = true;
            break;
        case ONAMES.GAUNTLETS_OF_DEXTERITY:
            if (wornmask & W_ARMG) abon[A_DEX] -= obj.spe | 0;
            break;
        case ONAMES.HELM_OF_BRILLIANCE:
            if (wornmask & W_ARMH) {
                abon[A_INT] -= obj.spe | 0;
                abon[A_WIS] -= obj.spe | 0;
            }
            break;
        default:
            break;
        }
        if (wornmask & W_ARMOR)
            (game.disp ||= {}).botl = true;
    }

    const cancellable = !!game.objects[otyp].oc_magic
        || ((obj.spe | 0) && (obj.oclass === OCLASSES.ARMOR_CLASS
                              || obj.oclass === OCLASSES.WEAPON_CLASS
                              || is_weptool(obj, game.objects)))
        || otyp === ONAMES.POT_ACID || otyp === ONAMES.POT_SICKNESS
        || (otyp === ONAMES.POT_WATER && (obj.blessed || obj.cursed))
        || otyp === ONAMES.SPE_NOVEL;

    if (cancellable) {
        const cancelledSpe = obj.oclass === OCLASSES.WAND_CLASS
            || otyp === ONAMES.CRYSTAL_BALL ? -1 : 0;
        if (obj.spe !== cancelledSpe
            && otyp !== ONAMES.WAN_CANCELLATION
            && otyp !== ONAMES.MAGIC_LAMP
            && otyp !== ONAMES.CANDELABRUM_OF_INVOCATION)
            obj.spe = cancelledSpe;

        switch (obj.oclass) {
        case OCLASSES.SCROLL_CLASS:
            obj.otyp = ONAMES.SCR_BLANK_PAPER;
            obj.spe = 0;
            break;
        case OCLASSES.SPBOOK_CLASS:
            if (otyp !== ONAMES.SPE_CANCELLATION
                && otyp !== ONAMES.SPE_BOOK_OF_THE_DEAD) {
                obj.otyp = ONAMES.SPE_BLANK_PAPER;
                if (otyp === ONAMES.SPE_NOVEL) {
                    obj.novelidx = 0;
                    delete obj.oname;
                }
            }
            break;
        case OCLASSES.POTION_CLASS:
            if (otyp === ONAMES.POT_SICKNESS
                || otyp === ONAMES.POT_SEE_INVISIBLE) {
                obj.otyp = ONAMES.POT_FRUIT_JUICE;
            } else {
                obj.otyp = ONAMES.POT_WATER;
                obj.odiluted = 0;
            }
            break;
        default:
            break;
        }
    }

    /* src/zap.c:1327. Cancellation keeps a non-Rider corpse's remaining
       deadline but replaces revival with ordinary rot. */
    if (obj.otyp === ONAMES.CORPSE && obj.timed
        && !is_rider(game.mons[obj.corpsenm])) {
        const timeout = peek_timer(REVIVE_MON, obj);
        if (timeout) {
            stop_timer(REVIVE_MON, obj);
            start_timer(timeout, TIMER_OBJECT, ROT_CORPSE, obj);
        }
    }
    unbless(obj);
    uncurse(obj);
}

// src/mon.c:4431 normal_shape(), the cancellation subset. Shapechangers
// return to their base form, werecreatures return to human form, and mimics
// drop their disguise. newcham can print, so this helper is asynchronous.
async function cancel_normal_shape(mon) {
    const mcham = mon.cham ?? NON_PM;
    if (mcham !== NON_PM && game.mons[mcham]) {
        const wasCancelled = mon.mcan;
        await newcham(mon, game.mons[mcham], NC_SHOW_MSG);
        mon.cham = NON_PM;
        mon.mcan = wasCancelled;
        newsym(mon.mx, mon.my);
    }

    const { is_were, new_were } = await import('./were.js');
    if (is_were(mon.data) && mon.data.mlet !== MONSYMS.S_HUMAN)
        await new_were(mon);

    if (M_AP_TYPE(mon) !== M_AP_NOTHING) {
        if (!mon.meating) {
            if (M_AP_TYPE(mon) !== M_AP_MONSTER)
                mon.msleeping = 1;
            seemimic(mon);
        } else {
            await finish_meating(mon);
        }
    }
}

// src/zap.c:3150 cancel_monst(). Wands and spells must make the resistance
// roll before setting mcan, even for monsters with zero magic resistance.
// That draw is part of every later turn's deterministic state.
export async function cancel_monst(mdef, obj, youattack, allow_cancel_kill,
                                   self_cancel) {
    const youdefend = mdef === game.youmonst;
    if (youdefend ? (!youattack && Antimagic())
                  : await resist(mdef, obj.oclass, 0, false))
        return false;

    if (self_cancel) {
        const inventory = youdefend ? game.invent : (mdef.minvent || []);
        for (const otmp of inventory)
            cancel_item(otmp);
        if (youdefend) {
            (game.disp ||= {}).botl = true;
            find_ac();
        }
    }

    if (youdefend) {
        if (Upolyd(game.u)) {
            if (game.u.umonnum === PMNAMES.PM_CLAY_GOLEM) {
                if (!Blind())
                    await pline('Some writing vanishes from your head!');
                else
                    await You_feel(`${Hallucination() ? 'dark' : 'light'} headed.`);
                game.u.mh = 0;
            }
            const unchanging = !!(game.u.intrinsic?.HUnchanging
                                   || game.u.uprops?.UNCHANGING);
            if (unchanging && game.u.mh > 0) {
                await Your('amulet grows hot for a moment, then cools.');
            } else {
                const { rehumanize } = await import('./polyself.js');
                await rehumanize();
            }
        }
    } else {
        mdef.mcan = 1;
        await cancel_normal_shape(mdef);

        if (mdef.mnum === PMNAMES.PM_CLAY_GOLEM) {
            if (canseemon(mdef))
                await pline(`Some writing vanishes from ${
                    s_suffix(mon_nam(mdef))} head!`);
            if (allow_cancel_kill) {
                if (youattack)
                    await killed(mdef);
                else
                    await monkilled(mdef, '', ATTKS.AD_SPEL);
            }
        }
    }
    return true;
}

export async function speed_up(duration) {
    if (!Very_fast()) {
        await You(`are suddenly moving ${Fast() ? '' : 'much '}faster.`);
    } else {
        await Your(`${makeplural(body_part(LEG))} get new energy.`);
    }
    exercise(A_DEX, true);
    increment_intrinsic_timeout('HFast', duration);
}

async function u_slow_down() {
    (game.u.intrinsic ||= {}).HFast = 0;
    if (!Fast())
        await You('slow down.');
    else
        await Your('quickness feels less natural.');
    exercise(A_DEX, false);
}

// src/lock.c:1056 boxlock() and src/zap.c:2687 boxlock_invent().
// Self-zapped opening and locking magic reaches every carried chest or box.
async function boxlock_invent(spell) {
    let boxing = false;
    const wizard = game.urole?.name?.m === 'Wizard';
    for (const item of game.invent || []) {
        if (item.otyp !== ONAMES.LARGE_BOX && item.otyp !== ONAMES.CHEST)
            continue;
        boxing = true;
        if (spell.otyp === ONAMES.WAN_LOCKING
            || spell.otyp === ONAMES.SPE_WIZARD_LOCK) {
            if (!item.olocked) {
                await pline('Klunk!');
                item.olocked = 1;
                item.obroken = 0;
                item.lknown = wizard ? 1 : 0;
            }
        } else if (item.olocked) {
            await pline('Klick!');
            item.olocked = 0;
            item.lknown = wizard ? 1 : 0;
        } else {
            item.obroken = 0;
        }
    }
    if (boxing)
        update_inventory();
}

// src/trap.c:6252 openfallingtrap(), hero arm. The self-zap caller only
// opens trapdoors and falling-rock traps, not holes or pits.
async function openfallingtrap_hero(noticed) {
    const trap = t_at(game.u.ux, game.u.uy);
    if (!trap || (trap.ttyp !== TRAPDOOR && trap.ttyp !== ROCKTRAP)
        || game.u.utrap)
        return false;
    noticed.v = true;
    await dotrap(trap, FORCETRAP);
    return !!game.u.utrap;
}

// src/zap.c:1225 unturn_you(). Carried eggs regain their hatch timer before
// the hero receives the form-dependent dread effect.
export async function unturn_you() {
    await unturn_dead(game.youmonst); /* hit carried corpses and eggs */

    if (is_undead(game.youmonst.data)) {
        await You_feel(`frightened and ${
            (game.u.intrinsic?.HStun || game.u.uprops?.STUNNED) ? 'even more ' : ''}stunned.`);
        await make_stunned(((game.u.intrinsic?.HStun | 0) & TIMEOUT) + rnd(30), false);
    } else {
        await You('shudder in dread.');
    }
}

// src/zap.c:568 release_hold() -- opening magic releases the monster holding
// the hero, the swallowed hero, or a monster held by a sticky hero form.
export async function release_hold() {
    const mtmp = game.u.ustuck;
    if (!mtmp)
        return;

    const mdat = game.mons[mtmp.mnum];
    if (game.u.uswallow) {
        if (digests(mdat)) {
            if (!Blind())
                await pline(`${Monnam(mtmp)} opens its mouth!`);
            else
                await You_feel('a sudden rush of air!');
        }
        const { expels } = await import('./mhitu.js');
        await expels(mtmp, mdat, true);
    } else if (sticks(game.youmonst.data)) {
        set_ustuck(null);
        await You(`release ${mon_nam(mtmp)}.`);
    } else {
        await unstuck(mtmp);
        const relation = !nohands(mdat)
            ? `from ${s_suffix(mon_nam(mtmp))} grasp`
            : `by ${mon_nam(mtmp)}`;
        await You(`are released ${relation}.`);
    }
}

// src/zap.c:2705 zapyourself() — the hero zapped themself.
//
// Returns the retributive damage. dozap() applies it after wand discovery and
// inventory damage have finished, matching the C caller.
// src/zap.c:654 get_obj_location() — where an object is; fills cc and
// returns true when it has a map position.
export function get_obj_location(obj, cc, locflags) {
    switch (obj.where) {
    case OBJ_INVENT:
        cc.x = game.u.ux;
        cc.y = game.u.uy;
        return true;
    case OBJ_FLOOR:
        cc.x = obj.ox;
        cc.y = obj.oy;
        return true;
    case OBJ_MINVENT:
        if (obj.ocarry?.mx) {
            cc.x = obj.ocarry.mx;
            cc.y = obj.ocarry.my;
            return true;
        }
        break; /* !mx => migrating monster */
    case OBJ_BURIED:
        if (locflags & BURIED_TOO) {
            cc.x = obj.ox;
            cc.y = obj.oy;
            return true;
        }
        break;
    case OBJ_CONTAINED:
        if (locflags & CONTAINED_TOO)
            return get_obj_location(obj.ocontainer, cc, locflags);
        break;
    }
    cc.x = cc.y = 0;
    return false;
}

// src/zap.c:713 montraits(); recreate a monster from the traits saved with
// a corpse or statue; the C makes a fresh monster then swaps the saved one
// into its place with replmon(); this port keeps the fresh monster's
// identity and copies the saved traits onto it, which is the same result
async function montraits(obj, cc, adjacentok) {
    /* adjacentok: False: at obj's spot only, True: nearby is allowed */
    let mtmp = null;
    const mtmp2 = has_omonst(obj) ? get_mtraits(obj, true) : null;

    if (mtmp2) {
        /* save_mtraits() validated mtmp2->mnum */
        mtmp2.data = game.mons[mtmp2.mnum];

        if (mtmp2.mhpmax > 0 || is_rider(mtmp2.data)) {
            mtmp = makemon(mtmp2.data, cc.x, cc.y,
                           (NO_MINVENT | MM_NOWAIT | MM_NOCOUNTBIRTH
                            /* in case mtmp2 is a long worm; saved traits for
                               long worm don't include tail segments so don't
                               give mtmp any; it will be given a new 'wormno'
                               though (unless those are exhausted) so be able
                               to grow new tail segments */
                            | MM_NOTAIL | MM_NOMSG
                            | (adjacentok ? MM_ADJACENTOK : 0)));
        }
        if (!mtmp) {
            /* mtmp2 is a copy of obj's object->oextra->omonst extension
               and is not on the map or on any monst lists */
            return null;
        }

        /* heal the monster; lower than normal level might come from
           adj_lev() but we assume it has come from 'mtmp' being level
           drained before finally killed; give a chance to restore
           some levels so that trolls and Riders can't be drained to
           level 0 and then trivially killed repeatedly */
        if ((mtmp.m_lev | 0) < mtmp.data.mlevel) {
            const ltmp = rnd(mtmp.data.mlevel + 1);

            if (ltmp > (mtmp.m_lev | 0)) {
                while ((mtmp.m_lev | 0) < ltmp) {
                    mtmp.m_lev++;
                    mtmp.mhpmax += monhp_per_lvl(mtmp);
                }
                mtmp2.m_lev = mtmp.m_lev;
            }
        }
        if (mtmp.mhpmax > mtmp2.mhpmax) /* &&is_rider(mtmp2->data)*/
            mtmp2.mhpmax = mtmp.mhpmax;
        mtmp2.mhp = mtmp2.mhpmax;
        /* Get these ones from mtmp */
        mtmp2.minvent = mtmp.minvent; /*redundant*/
        /* monster ID is available if the monster died in the current
           game, but will be zero if the corpse was in a bones level
           (we cleared it when loading bones) */
        if (mtmp.m_id) {
            mtmp2.m_id = mtmp.m_id;
            /* might be bringing quest leader back to life */
            if (game.quest_status?.leader_is_dead
                && mtmp2.m_id === game.quest_status.leader_m_id)
                game.quest_status.leader_is_dead = false;
        }
        mtmp2.mx = mtmp.mx;
        mtmp2.my = mtmp.my;
        mtmp2.mux = mtmp.mux;
        mtmp2.muy = mtmp.muy;
        mtmp2.mw = mtmp.mw;
        mtmp2.wormno = mtmp.wormno;
        mtmp2.misc_worn_check = mtmp.misc_worn_check;
        mtmp2.weapon_check = mtmp.weapon_check;
        mtmp2.mtrapseen = mtmp.mtrapseen;
        mtmp2.mflee = mtmp.mflee;
        mtmp2.mburied = mtmp.mburied;
        mtmp2.mundetected = mtmp.mundetected;
        mtmp2.mfleetim = mtmp.mfleetim;
        mtmp2.mlstmv = mtmp.mlstmv;
        mtmp2.m_ap_type = mtmp.m_ap_type;
        /* set these ones explicitly */
        mtmp2.mrevived = 1;
        mtmp2.mavenge = 0;
        mtmp2.meating = 0;
        mtmp2.mleashed = 0;
        mtmp2.mtrapped = 0;
        mtmp2.msleeping = 0;
        mtmp2.mfrozen = 0;
        mtmp2.mcanmove = 1;
        /* most cancelled monsters return to normal,
           but some need to stay cancelled */
        if (!dmgtype(mtmp2.data, ATTKS.AD_SEDU)
            && !dmgtype(mtmp2.data, ATTKS.AD_SSEX)) /* SYSOPT_SEDUCE */
            mtmp2.mcan = 0;
        mtmp2.mcansee = 1; /* set like in makemon */
        mtmp2.mblinded = 0;
        mtmp2.mstun = 0;
        mtmp2.mconf = 0;
        /* when traits are for a shopkeeper, dummy monster 'mtmp' won't
           have necessary eshk data for replmon() -> replshk() */
        if (mtmp2.isshk) {
            mtmp.isshk = 1;
        }
        /* replmon(mtmp, mtmp2): the saved traits take over the new
           monster's place in the lists; done in place here */
        for (const key of Object.keys(mtmp))
            if (!(key in mtmp2))
                delete mtmp[key];
        Object.assign(mtmp, mtmp2);
        for (const otmp of (mtmp.minvent || []))
            otmp.ocarry = mtmp;
        newsym(mtmp.mx, mtmp.my); /* Might now be invisible */

        /* in case Protection_from_shape_changers is different
           now than it was when the traits were stored */
        restore_cham(mtmp);
        return mtmp;
    }
    return mtmp2;
}

// src/zap.c:841 get_container_location(); the monster carrying the
// outermost container, with loc set to where that container is
export function get_container_location(obj, loc, container_nesting) {
    if (container_nesting)
        container_nesting.v = 0;
    while (obj && obj.where === OBJ_CONTAINED) {
        if (container_nesting)
            container_nesting.v += 1;
        obj = obj.ocontainer;
    }
    if (obj) {
        loc.v = obj.where; /* outermost container's location */
        if (obj.where === OBJ_MINVENT)
            return obj.ocarry;
    }
    return null;
}

// src/zap.c:869 zombie_can_dig(); can a zombie dig itself out of the
// ground at <x,y>?
function zombie_can_dig(x, y) {
    if (isok(x, y)) {
        const typ = game.level.at(x, y).typ;
        let ttmp;

        if ((ttmp = t_at(x, y)) != null)
            return false;
        if (typ === ROOM || typ === CORR || typ === GRAVE)
            return true;
    }
    return false;
}

// src/zap.c:884 revive(); Attempts to revive the given corpse, return the
// revived monster if successful.  Note: this does NOT use up the corpse if
// it fails.
export async function revive(corpse, by_hero) {
    const u = game.u;
    let mtmp = null;
    let mptr;
    let container;
    const xy = { x: 0, y: 0 };
    let x, y;
    let one_of;
    let mmflags = NO_MINVENT | MM_NOWAIT | MM_NOMSG;
    let montype, cgend;
    const container_nesting = { v: 0 };
    let is_zomb;

    if (corpse.otyp !== ONAMES.CORPSE) {
        /* impossible("Attempting to revive %s?", xname(corpse)) */
        return null;
    }

    montype = corpse.corpsenm;
    /* treat buried auto-reviver (troll, Rider) as if already unearthed
       so that it can dig itself out of the ground if it revives */
    is_zomb = game.mons[montype].mlet === MONSYMS.S_ZOMBIE
              || (corpse.where === OBJ_BURIED && is_reviver(game.mons[montype]));

    /* corpse in an eating occupation's slot gets abandoned; [ought to be
       after makemon() succeeds and skipped if it fails, but waiting until
       we know the result for that would be too late] */
    await cant_finish_meal(corpse);

    x = y = 0;
    if (corpse.where !== OBJ_CONTAINED) {
        const locflags = is_zomb ? BURIED_TOO : 0;

        /* only for invent, minvent, or floor, or buried (if zombie) */
        container = null;
        const cc = { x: 0, y: 0 };
        get_obj_location(corpse, cc, locflags);
        x = cc.x, y = cc.y;
    } else {
        /* deal with corpses in [possibly nested] containers */
        let carrier;
        const holder = { v: 0 }; /* OBJ_FREE */

        container = corpse.ocontainer;
        carrier =
            get_container_location(container, holder, container_nesting);
        switch (holder.v) {
        case OBJ_MINVENT:
            x = carrier.mx, y = carrier.my;
            break;
        case OBJ_INVENT:
            x = u.ux, y = u.uy;
            break;
        case OBJ_FLOOR: {
            const cc = { x: 0, y: 0 };
            get_obj_location(corpse, cc, CONTAINED_TOO);
            x = cc.x, y = cc.y;
            break;
        }
        default:
            break; /* x,y are 0 */
        }
    }
    if (x) /* update corpse's location now that we're sure where it is */
        corpse.ox = x, corpse.oy = y;

    if (!x
        /* Rules for revival from containers:
         *  - the container cannot be locked
         *  - the container cannot be heavily nested (>2 is arbitrary)
         *  - the container cannot be a statue or bag of holding
         *    (except in very rare cases for the latter)
         */
        || (container && (container.olocked || container_nesting.v > 2
                          || container.otyp === ONAMES.STATUE
                          || (container.otyp === ONAMES.BAG_OF_HOLDING && rn2(40))))
        /* if buried zombie cannot dig itself out, it stays dead */
        || (is_zomb && corpse.where === OBJ_BURIED && !zombie_can_dig(x, y)))
        return null;

    /* prepare for the monster */
    mptr = game.mons[montype];
    /* [should probably handle trapped floor spot here; also, if hero and
       ghost are at same location, revived creature shouldn't be bumped
       to an adjacent spot by ghost which joins with it] */
    if (m_at(x, y)) {
        if (enexto(xy, x, y, mptr))
            x = xy.x, y = xy.y;
    }

    if (corpse.norevive
        || (game.mons[montype].mlet === MONSYMS.S_EEL && !IS_POOL(game.level.at(x, y).typ))) {
        if (cansee(x, y))
            await pline(`${upstart(corpse_xname(corpse, null, CXN_PFX_THE))} twitches feebly.`);
        return null;
    }

    cgend = (corpse.spe & CORPSTAT_GENDER);
    if (cgend === CORPSTAT_MALE)
        mmflags |= MM_MALE;
    else if (cgend === CORPSTAT_FEMALE)
        mmflags |= MM_FEMALE;

    const montype_box = { v: montype };
    if (cant_revive(montype_box, true, corpse)) {
        montype = montype_box.v;
        /* make a new monster */
        mtmp = makemon(game.mons[montype], x, y, mmflags);
        if (mtmp) {
            /* [oid/omonst ghost-merge and the like shouldn't be
               applied to a shapechanger substitute] */
            if (has_omid(corpse))
                free_omid(corpse);
            if (has_omonst(corpse))
                free_omonst(corpse);
            if (mtmp.cham === PMNAMES.PM_DOPPELGANGER) {
                /* change shape to match the corpse */
                newcham(mtmp, mptr, NO_NC_FLAGS);
            } else if (mtmp.data.mlet === MONSYMS.S_ZOMBIE) {
                mtmp.mhp = mtmp.mhpmax = 100;
                mon_adjust_speed(mtmp, 2, null); /* MFAST */
            }
        }
    } else if (has_omonst(corpse)) {
        /* use saved traits */
        xy.x = x, xy.y = y;
        mtmp = await montraits(corpse, xy, false);
        if (mtmp && mtmp.mtame && !mtmp.isminion)
            wary_dog(mtmp, true);
    } else {
        /* make a new monster */
        mtmp = makemon(mptr, x, y, mmflags | MM_NOCOUNTBIRTH);
    }
    if (!mtmp)
        return null;

    /* hiding monster might be revived in a spot where it can't hide */
    if (mtmp.mundetected) {
        mtmp.mundetected = 0;
        newsym(mtmp.mx, mtmp.my);
    }
    if (M_AP_TYPE(mtmp))
        seemimic(mtmp);

    one_of = (corpse.quan > 1);
    if (one_of)
        corpse = splitobj(corpse, 1);

    if (by_hero) {
        struct_shk: {
            let shkp = null;

            x = corpse.ox, y = corpse.oy;
            if (costly_spot(x, y)
                && ((game.invent || []).includes(corpse) ? corpse.unpaid : !corpse.no_charge))
                shkp = shop_keeper((in_rooms(x, y, SHOPBASE) || '\0').charCodeAt(0));

            if (cansee(x, y)) {
                let buf;

                buf = one_of ? 'one of ' : '';
                /* shk_your: "the" or "your" or "Shk's".
                   If the result is "Shk's " then it will be ambiguous:
                   is Shk the mon carrying it, or does Shk's shop own it?
                   Let's not worry about that... */
                buf += shk_your(corpse);
                if (one_of)
                    corpse.quan++; /* force plural */
                buf += corpse_xname(corpse, null, CXN_NO_PFX);
                if (one_of) /* could be simplified to ''corpse->quan = 1L;'' */
                    corpse.quan--;
                await pline(`${upstart(buf)} glows iridescently.`);
                (game.iflags ||= {}).last_msg = PLNMSG_OBJ_GLOWS; /* usually for BUC change */
            } else if (shkp) {
                /* need some prior description of the corpse since
                   stolen_value() will refer to the object as "it" */
                await pline('A corpse is resuscitated.');
            }
            /* don't charge for shopkeeper's own corpse if we just revived him */
            if (shkp && mtmp !== shkp)
                await stolen_value(corpse, x, y, !!shkp.mpeaceful,
                                   false);
            /* [we don't give any comparable message about the corpse for
               the !by_hero case because caller might have already done so] */
        }
    }

    /* handle recorded ghost */
    if (has_omid(corpse)) {
        const m_id = OMID(corpse);
        const ghost = find_mid(m_id, FM_FMON);

        if (ghost && ghost.data === game.mons[PMNAMES.PM_GHOST]) {
            if (canseemon(ghost))
                await pline(`${Monnam(ghost)} is suddenly drawn into its former body!`);
            /* transfer the ghost's inventory along with it */
            for (const otmp of [...(ghost.minvent || [])]) {
                obj_extract_self(otmp);
                add_to_minv(mtmp, otmp);
            }
            /* tame the revived monster if its ghost was tame */
            if (ghost.mtame && !mtmp.mtame) {
                if (await tamedog(mtmp, null, false)) {
                    /* ghost's edog data is ignored */
                    mtmp.mtame = ghost.mtame;
                }
            }
            /* was ghost, now alive, it's all very confusing */
            mtmp.mconf = 1;
            /* separate ghost monster no longer exists */
            mongone(ghost);
        }
        free_omid(corpse);
    }

    /* monster retains its name */
    if (has_oname(corpse) && !unique_corpstat(mtmp.data))
        mtmp = christen_monst(mtmp, ONAME(corpse));
    /* partially eaten corpse yields wounded monster */
    if (corpse.oeaten)
        mtmp.mhp = eaten_stat(mtmp.mhp, corpse);
    /* track that this monster was revived at least once */
    mtmp.mrevived = 1;

    switch (corpse.where) {
    case OBJ_INVENT:
        useup(corpse);
        break;
    case OBJ_FLOOR:
        /* in case MON_AT+enexto for invisible mon */
        /* delobj() won't use up a Rider's corpse, delobj_core(,TRUE) will */
        delobj_core(corpse, true); /* for floor, also calls newsym() */
        break;
    case OBJ_MINVENT:
        m_useup(corpse.ocarry, corpse);
        break;
    case OBJ_CONTAINED:
        obj_extract_self(corpse);
        obfree(corpse);
        break;
    case OBJ_BURIED:
        if (is_zomb) {
            obj_extract_self(corpse);
            obfree(corpse);
            break;
        }
        /* FALLTHROUGH */
    case OBJ_FREE:
    case OBJ_MIGRATING:
    case OBJ_ONBILL:
    case OBJ_LUAFREE:
    default:
        throw new Error(`revive default case ${corpse.where}`); /* panic() */
    }

    return mtmp;
}

// src/zap.c:1143 revive_egg(); an egg's hatch timer is restored by undead
// turning
function revive_egg(obj) {
    /*
     * Note: generic eggs with corpsenm set to NON_PM will never hatch.
     */
    if (obj.otyp !== ONAMES.EGG)
        return;
    if (obj.corpsenm !== NON_PM && !dead_species(obj.corpsenm, true))
        attach_egg_hatch_timeout(obj, 0);
}

// src/zap.c:1156 unturn_dead(); try to revive all corpses and eggs carried
// by `mon'; return the number of revived monsters
export async function unturn_dead(mon) {
    let mtmp2;
    let owner = '', corpse = '';
    let save_norevive;
    let youseeit, different_type;
    const is_u = (mon === game.youmonst);
    let corpsenm, res = 0;

    youseeit = is_u ? true : canseemon(mon);
    const list = [...((is_u ? game.invent : mon.minvent) || [])];

    for (const otmp of list) {
        if (otmp.otyp === ONAMES.EGG)
            revive_egg(otmp);
        if (otmp.otyp !== ONAMES.CORPSE)
            continue;
        /* save the name; the object is liable to go away */
        if (youseeit) {
            corpse = corpse_xname(otmp, null, CXN_NORMAL);
            if (otmp.quan > 1) {
                owner = 'One of ';
                owner += shk_your(otmp);
            } else
                owner = Shk_Your(otmp);
        }

        /* for a stack, only one is revived; if is_u, revive() calls
           useup() which calls update_inventory() but not encumber_msg() */
        corpsenm = otmp.corpsenm;
        save_norevive = otmp.norevive;
        otmp.norevive = 0;
        if ((mtmp2 = await revive(otmp, !game.context?.mon_moving)) != null) {
            ++res;
            /* might get revived as a zombie rather than corpse's monster */
            different_type = (mtmp2.data !== game.mons[corpsenm]);
            if (game.iflags?.last_msg === PLNMSG_OBJ_GLOWS) {
                /* when hero is wielding this corpse (hero zapping wand at
                   self) or wielding a non-empty wand), revive() reports
                   "[one of] your <mon> corpse[s] glows iridescently";
                   override saved corpse and owner names to say "It comes
                   alive" [note: we did earlier setup because corpse gets
                   used up but need to do the override here after revive()
                   sets 'last_msg'] */
                corpse = 'It';
                owner = '';
            }
            if (youseeit)
                await pline(`${owner}${corpse} suddenly ${
                    nonliving(mtmp2.data) ? 'reanimates' : 'comes alive'}${
                    different_type ? ' as ' : ''}${
                    different_type ? an(mon_pmname(mtmp2)) : ''}!`);
            else if (canseemon(mtmp2))
                await pline(`${Amonnam(mtmp2)} suddenly appears!`);
        } else {
            otmp.norevive = save_norevive ? 1 : 0;
        }
    }
    if (is_u && res)
        await encumber_msg();

    return res;
}

export async function zapyourself(obj, ordinary) {
    let learn_it = false;
    let damage = 0;
    let orig_dmg = 0; /* for passing to destroy_items() */
    const learn = { v: false }; /* &learn_it for the trap helpers */

    switch (obj.otyp) {
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
        learn_it = true;
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline('Boing!');
            monstseesu(M_SEEN_MAGR);
        } else {
            if (ordinary) {
                await You('bash yourself!');
                damage = d(2, 12);
            } else
                damage = d(1 + obj.spe, 6);
            exercise(A_STR, false);
            monstunseesu(M_SEEN_MAGR);
        }
        break;

    case ONAMES.WAN_LIGHTNING:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (!Shock_resistance()) {
            await You('shock yourself!');
            damage = orig_dmg;
            exercise(A_CON, false);
            monstunseesu(M_SEEN_ELEC);
        } else {
            await shieldeff(game.u.ux, game.u.uy);
            await You('zap yourself, but seem unharmed.');
            monstseesu(M_SEEN_ELEC);
            await ugolemeffects(ATTKS.AD_ELEC, orig_dmg);
        }
        await destroy_items(game.youmonst, ATTKS.AD_ELEC, orig_dmg);
        await flashburn(rnd(100), true);
        break;

    case ONAMES.SPE_FIREBALL:
        await You('explode a fireball on top of yourself!');
        await explode(game.u.ux, game.u.uy, 11, d(6, 6), OCLASSES.WAND_CLASS, EXPL_FIERY);
        break;
    case ONAMES.WAN_FIRE:
    case ONAMES.FIRE_HORN:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (Fire_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel('rather warm.');
            monstseesu(M_SEEN_FIRE);
            await ugolemeffects(ATTKS.AD_FIRE, orig_dmg);
        } else {
            await pline("You've set yourself afire!");
            damage = orig_dmg;
            monstunseesu(M_SEEN_FIRE);
        }
        await burn_away_slime();
        await burnarmor(game.youmonst);
        await destroy_items(game.youmonst, ATTKS.AD_FIRE, orig_dmg);
        await ignite_items(game.invent);
        break;

    case ONAMES.WAN_COLD:
    case ONAMES.SPE_CONE_OF_COLD:
    case ONAMES.FROST_HORN:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (Cold_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel('a little chill.');
            monstseesu(M_SEEN_COLD);
            await ugolemeffects(ATTKS.AD_COLD, orig_dmg);
        } else {
            await You('imitate a popsicle!');
            damage = orig_dmg;
            monstunseesu(M_SEEN_COLD);
        }
        await destroy_items(game.youmonst, ATTKS.AD_COLD, orig_dmg);
        break;

    case ONAMES.WAN_MAGIC_MISSILE:
    case ONAMES.SPE_MAGIC_MISSILE:
        learn_it = true;
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline_The('missiles bounce!');
            monstseesu(M_SEEN_MAGR);
        } else {
            damage = d(4, 6);
            await pline("Idiot!  You've shot yourself!");
            monstunseesu(M_SEEN_MAGR);
        }
        break;

    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
        if (!Unchanging()) {
            learn_it = true;
            const { polyself } = await import('./polyself.js');
            await polyself(POLY_NOFLAGS);
        }
        break;

    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
        await cancel_monst(game.youmonst, obj, true, true, true);
        break;

    case ONAMES.SPE_DRAIN_LIFE:
        if (!Drain_resistance()) {
            learn_it = true; /* (no effect for spells...) */
            await losexp('life drainage');
        }
        damage = 0; /* No additional damage */
        break;

    case ONAMES.WAN_MAKE_INVISIBLE: {
        /* have to test before changing HInvis but must change
         * HInvis before doing newsym().
         */
        const msg = !Invis() && !Blind() && !game.u.blocked?.INVIS;

        if (game.u.blocked?.INVIS && game.u.uarmc?.otyp === ONAMES.MUMMY_WRAPPING) {
            /* A mummy wrapping absorbs it and protects you */
            await You_feel(`rather itchy under ${yname(game.u.uarmc)}.`);
            break;
        }
        increment_intrinsic_timeout('HInvis', rn1(15, 31));
        if (msg) {
            learn_it = true;
            newsym(game.u.ux, game.u.uy);
            await self_invis_message();
        }
        break;
    }

    case ONAMES.WAN_SPEED_MONSTER:
        /* no longer gives intrinsic, but gives very fast speed instead */
        await speed_up(rn1(25, 50));
        learn_it = true;
        break;

    case ONAMES.WAN_SLEEP:
    case ONAMES.SPE_SLEEP:
        learn_it = true;
        if (Sleep_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You("don't feel sleepy!");
            monstseesu(M_SEEN_SLEEP);
        } else {
            if (ordinary)
                await pline_The('sleep ray hits you!');
            else
                await You('fall asleep!');
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(50), true);
        }
        break;

    case ONAMES.WAN_SLOW_MONSTER:
    case ONAMES.SPE_SLOW_MONSTER:
        if ((game.u.intrinsic?.HFast | 0) & (TIMEOUT | INTRINSIC)) {
            learn_it = true;
            await u_slow_down();
        }
        break;

    case ONAMES.WAN_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        await tele();
        /* same criteria as when mounted (zap_steed) */
        if ((Teleport_control() && !Stunned()) || !couldsee(game.u.ux0, game.u.uy0)
            || distu(game.u.ux0, game.u.uy0) >= 16)
            learn_it = true;
        break;

    case ONAMES.WAN_DEATH:
    case ONAMES.SPE_FINGER_OF_DEATH:
        if (nonliving(game.youmonst.data) || is_demon(game.youmonst.data)) {
            await pline((obj.otyp === ONAMES.WAN_DEATH)
                        ? 'The wand shoots an apparently harmless beam at you.'
                        : 'You seem no deader than before.');
            break;
        }
        learn_it = true;
        (game.killer ||= {}).name = `shot ${uhim()}self with a death ray`;
        game.killer.format = NO_KILLER_PREFIX;
        /* probably don't need these to be urgent; player just gave input
           without subsequent opportunity to dismiss --More-- with ESC */
        await urgent_pline('You irradiate yourself with pure energy!');
        await urgent_pline('You die.');
        /* They might survive with an amulet of life saving */
        await done(DIED);
        break;
    case ONAMES.WAN_UNDEAD_TURNING:
    case ONAMES.SPE_TURN_UNDEAD:
        learn_it = true;
        await unturn_you();
        break;
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING:
        learn_it = true; /* (no effect for spells...) */
        await healup(d(6, obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 8 : 4), 0, false,
                     (obj.blessed || obj.otyp === ONAMES.SPE_EXTRA_HEALING));
        await You_feel(`${obj.otyp === ONAMES.SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
        break;
    case ONAMES.WAN_LIGHT: /* (broken wand) */
        /* assert( !ordinary ); */
        damage = d(obj.spe, 25);
        /*FALLTHRU*/
    case ONAMES.EXPENSIVE_CAMERA:
        if (!damage)
            damage = 5;
        damage = await lightdamage(obj, ordinary, damage);
        damage += rnd(25);
        if (await flashburn(damage, false))
            learn_it = true;
        damage = 0; /* reset */
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        if (game.u.ustuck) {
            /* zapping either self or holder/holdee [bhitm()] will release
               holder's grasp from the hero or hero's grasp from holdee */
            await release_hold();
            learn_it = true;
        }
        if (game.u.uball) { /* Punished */
            learn_it = true;
            await unpunish();
        }
        /* invent is hit iff hero doesn't escape from a trap */
        learn.v = learn_it;
        if (!game.u.utrap || !(await openholdingtrap(game.youmonst, learn))) {
            await boxlock_invent(obj);
            /* trigger previously escaped trapdoor */
            await openfallingtrap(game.youmonst, true, learn);
        }
        learn_it = learn.v;
        break;
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        /* similar logic to opening; invent is hit iff no trap triggered */
        learn.v = learn_it;
        if (game.u.utrap || !(await closeholdingtrap(game.youmonst, learn))) {
            await boxlock_invent(obj);
        }
        learn_it = learn.v;
        break;
    case ONAMES.WAN_DIGGING:
    case ONAMES.SPE_DIG:
    case ONAMES.SPE_DETECT_UNSEEN:
    case ONAMES.WAN_NOTHING:
        break;
    case ONAMES.WAN_PROBING:
        probe_objchain(game.invent);
        update_inventory();
        learn_it = true;
        await ustatusline();
        break;
    case ONAMES.SPE_STONE_TO_FLESH: {
        let didmerge;

        if (game.u.umonnum === PMNAMES.PM_STONE_GOLEM) {
            learn_it = true;
            await polymon(PMNAMES.PM_FLESH_GOLEM);
        }
        if (Stoned()) {
            learn_it = true;
            await fix_petrification(); /* saved! */
        }
        /* but at a cost.. */
        for (const otmp of [...(game.invent || [])]) {
            if (await bhito(otmp, obj))
                learn_it = true;
        }
        /*
         * It is possible that we can now merge some inventory.
         * Do a highly paranoid merge.  Restart from the beginning until
         * no merges.  Don't merge worn items (in case of stone-to-flesh
         * of rocks wielded in differing weapon/alt-wep/quiver slot).
         */
        do {
            didmerge = false;
            const inv = game.invent || [];
            for (let i = 0; !didmerge && i < inv.length; i++) {
                const otmp = inv[i];
                if (otmp.owornmask)
                    continue;
                for (let j = i + 1; j < inv.length; j++) {
                    const potmp = { o: otmp }, ponxt = { o: inv[j] };
                    if (merged(potmp, ponxt)) {
                        didmerge = true;
                        break;
                    }
                }
            }
        } while (didmerge);
        break;
    }
    default:
        /* impossible("zapyourself: object %d used?", obj->otyp) */
        break;
    }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(obj);
    return damage;
}

// src/zap.c:3060 flashburn(). Lightning and camera flashes share the same
// blindness message and timeout path.
export async function flashburn(duration, viaLightning) {
    if (!resists_blnd(null)) {
        await You('are blinded by the flash!');
        const { make_blinded } = await import('./potion.js');
        await make_blinded(duration, false);
        if (!Blind())
            await Your('vision clears.');
        return true;
    }
    if (!viaLightning && resists_blnd_by_arti(null)) {
        await shieldeff(game.u.ux, game.u.uy);
        return true;
    }
    return false;
}

// src/zap.c:2539 zapnodir() — wands that need no direction.
// src/zap.c:2525 do_enlightenment_effect()
export async function do_enlightenment_effect() {
    await You_feel('self-knowledgeable...');
    await display_nhwindow_message();
    /* src/insight.c enlightenment(): the text goes into an NHW_MENU window
       that pages like ^X; ours builds the lines and shows them here */
    {
        const { tty_start_menu, tty_add_menu, tty_end_menu, tty_next_page }
            = await import('./tty/wintty.js');
        const { NHW_MENU, MENU_BEHAVE_STANDARD, MENU_ITEMFLAGS_NONE }
            = await import('./const.js');
        const { NO_COLOR, ATR_NONE } = await import('./terminal.js');
        const { xwaitforspace } = await import('./tty/getline.js');
        const win = tty_create_nhwindow(NHW_MENU);
        tty_start_menu(win, MENU_BEHAVE_STANDARD);
        for (const line of enlightenment(MAGICENLIGHTENMENT,
                                          ENL_GAMEINPROGRESS))
            tty_add_menu(win, null, 0, 0, 0, ATR_NONE, NO_COLOR, line,
                         MENU_ITEMFLAGS_NONE);
        tty_end_menu(win, null);
        await tty_display_nhwindow(win);
        await xwaitforspace(' \r\n\x1b');
        while (game.morc !== '\x1b' && tty_next_page(win))
            await xwaitforspace(' \r\n\x1b');
        tty_destroy_nhwindow(win);
        await docrt();
    }
    await pline_The('feeling subsides.');
    exercise(A_WIS, true);
}

export async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case ONAMES.WAN_LIGHT:
    case ONAMES.SPE_LIGHT: {
        /* FIXME? wand of light becoming discovered should be contingent upon
           seeing at least one previously unlit spot become lit */
        known = (obj.dknown && !Blind());
        const { litroom } = await import('./read.js');
        await litroom(true, obj);
        await lightdamage(obj, true, 5);
        break;
    }
    case ONAMES.WAN_SECRET_DOOR_DETECTION:
    case ONAMES.SPE_DETECT_UNSEEN:
        /* findit() gives sufficient feedback to discover the wand even when
           blinded or when it fails to find anything */
        known = !!obj.dknown;
        await findit();
        break;
    case ONAMES.WAN_STASIS: {
        const tmp_until = game.moves + rn1(21, 10);

        /* no immediately obvious effect, and no message so that it isn't
           distinguishable from other NODIR wands that produce no message;
           for multiple zaps, keep the longest duration rather than latest */
        if (tmp_until > ((game.level.flags ||= {}).stasis_until || 0))
            game.level.flags.stasis_until = tmp_until;
        break;
    }
    case ONAMES.WAN_CREATE_MONSTER:
        /* create_critters() returns True iff hero sees a new monster appear */
        if (await create_critters(rn2(23) ? 1 : rn1(7, 2), null, false))
            known = !!obj.dknown;
        break;
    case ONAMES.WAN_WISHING:
        if (Luck() + rn2(5) < 0) {
            await pline('Unfortunately, nothing happens.');
            known = false;
        } else {
            known = !!obj.dknown;
            /* wand of wishing asks player what to wish for so always becomes
               discovered (unless it hasn't been seen) */
            await makewish();
        }
        break;
    case ONAMES.WAN_ENLIGHTENMENT:
        known = !!obj.dknown;
        /* do_enlightenmnt_effect() always describes enlightenment */
        await do_enlightenment_effect();
        break;
    default:
        break;
    }

    if (known) {
        if (!game.objects[obj.otyp].oc_name_known)
            more_experienced(0, 10);
        /* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

// src/zap.c:6160 MAXWISHTRY
const MAXWISHTRY = 5;

// src/zap.c:6165 wishcmdassist() — details shown when the player answers
// the wish prompt with "help".
async function wishcmdassist(triesleft) {
    const wishinfo = [
  'Wish details:',
  '',
  'Enter the name of an object, such as "potion of monster detection",',
  '"scroll labeled README", "elven mithril-coat", or "Grimtooth"',
  '(without the quotes).',
  '',
  'For object types which come in stacks, you may specify a plural name',
  'such as "potions of healing", or specify a count, such as "1000 gold',
  'pieces", although that aspect of your wish might not be granted.',
  '',
  'You may also specify various prefix values which might be used to',
  'modify the item, such as "uncursed" or "rustproof" or "+1".',
  'Most modifiers shown when viewing your inventory can be specified.',
  '',
  "You may specify 'nothing' to explicitly decline this wish.",
    ],
        preserve_wishless = "Doing so will preserve 'wishless' conduct.",
        retry_too = 'a randomly chosen item will be granted.',
        suppress_cmdassist =
            '(Suppress this assistance with !cmdassist in your config file.)',
        cardinals = ['zero', 'one', 'two', 'three', 'four', 'five'],
        too_many = 'too many';

    const win = tty_create_nhwindow(NHW_TEXT);
    if (!win)
        return;
    for (let i = 0; i < wishinfo.length; ++i)
        tty_putstr(win, 0, wishinfo[i]);
    if (!(game.u.uconduct?.wishes))
        tty_putstr(win, 0, preserve_wishless);
    tty_putstr(win, 0, '');
    tty_putstr(win, 0,
               `If you specify an unrecognized object name ${
                   (triesleft >= 0 && triesleft < cardinals.length)
                       ? cardinals[triesleft] : too_many
               }${(triesleft < MAXWISHTRY) ? ' more' : ''} time${
                   plur(triesleft)},`);
    tty_putstr(win, 0, retry_too);
    tty_putstr(win, 0, '');
    if (boolean_option('cmdassist'))
        tty_putstr(win, 0, suppress_cmdassist);
    await tty_display_nhwindow(win);
    tty_destroy_nhwindow(win);
}

/* src/zap.c:6221 MAX_WISH_HISTORY / wish_history[] — the wish history is
   DEBUG-only and the contest build does not define DEBUG, so the list
   stays empty and the add/menu bodies compile away. */
const MAX_WISH_HISTORY = 20;
const wish_history = new Array(MAX_WISH_HISTORY).fill(null);

// src/zap.c:6227 wish_history_add() — body is #ifdef DEBUG; no-op here.
function wish_history_add(buf) {
}

// src/zap.c:6275 wish_history_menu() — body is #ifdef DEBUG; no-op here.
function wish_history_menu(buf) {
}

// src/zap.c:6314 makewish() — grant one wish.
export async function makewish() {
    let buf = '';
    let bufcpy = '', promptbuf;
    let otmp;
    const nothing = {}; /* cg.zeroobj; only its address matters */
    let tries = 0;
    game.u.uconduct ||= {};
    const oldwisharti = game.u.uconduct.wisharti || 0;

    (game.context ||= {}).resume_wish = 0;
    if (game.flags?.verbose !== false)
        await You('may wish for an object.');
    /* retry: */
    for (;;) {
        promptbuf = 'For what do you wish';
        if (boolean_option('cmdassist') && tries > 0)
            promptbuf += " (enter 'help' for assistance)";
        promptbuf += '?';

        /* iflags.menu_requested && wish_history[0]: the DEBUG-only history
           menu; the list is always empty here so getlin always runs */
        if (game.iflags?.menu_requested && wish_history[0] && (tries === 0))
            wish_history_menu(buf);
        else
            buf = await getlin(promptbuf, null);

        if (game.iflags?.term_gone) {
            if (!game.iflags?.debug_fuzzer)
                game.context.resume_wish = 1;
            return;
        }

        buf = mungspaces(buf);
        if (buf[0] === '\x1b') {
            buf = '';
        } else if (buf.toLowerCase() === 'help') { /* !strcmpi(buf, "help") */
            await wishcmdassist(MAXWISHTRY - tries);
            buf = ''; /* for EDIT_GETLIN */
            continue; /* goto retry */
        }
        /*
         *  Note: if they wished for and got a non-object successfully,
         *  otmp == &hands_obj.  That includes an artifact which has been
         *  denied. Wishing for "nothing" requires a separate value to
         *  remain distinct.
         */
        bufcpy = buf;
        otmp = await readobjnam(buf, nothing);
        if (!otmp) {
            await pline(
                'Nothing fitting that description exists in the game.');
            if (++tries < MAXWISHTRY)
                continue; /* goto retry */
            await pline("That's enough tries!"); /* thats_enough_tries */
            otmp = await readobjnam(null, null);
            if (!otmp)
                return; /* for safety; should never happen */
        } else if (otmp === nothing) {
            /* explicitly wished for "nothing", presumably attempting
               to retain wishless conduct */
            livelog_add('declined to make a wish');
            return;
        } else if (otmp === hands_obj) {
            wish_history_add(bufcpy);
            /* wizard mode terrain wish: skip livelogging, etc */
            return;
        }
        break;
    }
    wish_history_add(bufcpy);

    if (otmp.oartifact) {
        /* update artifact bookkeeping; doesn't produce a livelog event */
        artifact_origin(otmp, ONAME_WISH | ONAME_KNOW_ARTI);
    }

    /* wisharti conduct is handled in readobjnam(). Log the request and actual
       result before the object is placed, matching src/zap.c:6387. */
    const wish = `"${bufcpy}", got "${doname(otmp)}"`;
    const oldwishes = game.u.uconduct.wishes || 0;
    const possessive = game.flags?.female ? 'her' : 'his';
    game.u.uconduct.wishes = oldwishes + 1; /* KMH */
    if (!oldwishes) {
        livelog_add(`made ${possessive} first wish - ${wish}`);
    } else if (!oldwisharti && game.u.uconduct.wisharti) {
        livelog_add(`made ${possessive} first artifact wish - ${wish}`);
    } else {
        livelog_add(`wished for ${wish}`);
    }

    if (otmp.otyp === ONAMES.CORPSE
        && !u_safe_from_fatal_corpse(otmp, st_all))
        otmp.wishedfor = 1;

    const verb = ((Is_airlevel(game.u.uz) || game.u.uinwater)
                  ? 'slip'
                  : (otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                    ? 'materialize' : 'drop'),
          oops_msg = (game.u.uswallow
                      ? 'Oops!  %s out of your reach!'
                      : (Is_airlevel(game.u.uz) || Is_waterlevel(game.u.uz)
                         || game.level.at(game.u.ux, game.u.uy).typ < IRONBARS
                         || game.level.at(game.u.ux, game.u.uy).typ >= ICE)
                        ? 'Oops!  %s away from you!'
                        : !(otmp.otyp === ONAMES.CORPSE && otmp.wishedfor)
                          ? 'Oops!  %s to the floor!'
                          : 'Careful! %s on the floor!');

    /* The(aobjnam()) is safe since otmp is unidentified -dlc */
    await hold_another_object(otmp, oops_msg, The(aobjnam(otmp, verb)),
                              null);
    game.u.ublesscnt = (game.u.ublesscnt || 0) + rn1(100, 50);
                                        /* the gods take notice */
}

// src/zap.c:123 learnwand() — the zap's observable effect identifies the
// wand type (spells are suppressed so casting can't re-discover a book).
export function learnwand(obj) {
    if (obj.oclass !== OCLASSES.SPBOOK_CLASS) {
        if (game.objects[obj.otyp].oc_name_known) {
            observe_object(obj);
        } else {
            if (!game.u.ublind)
                observe_object(obj);
            if (obj.dknown)
                makeknown(obj.otyp);
        }
        update_inventory();
    }
}

// src/zap.c:1476 obj_shudders() — does the object with polymorph.
export function obj_shudders(obj) {
    let zap_odds;

    if (game.context?.bypasses && obj.bypass)
        return false;

    if (obj.oclass === OCLASSES.WAND_CLASS)
        zap_odds = 3;       /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3;
    else if (obj.blessed)
        zap_odds = 12;      /* half-life = 8 zaps */
    else
        zap_odds = 8;       /* half-life = 6 zaps */

    /* adjust for "large" quantities of identical things */
    if (obj.quan > 4)
        zap_odds = Math.trunc(zap_odds / 2);

    return !rn2(zap_odds);
}

/* module state mirroring go.obj_zapped / gp.poly_zapped */
let obj_zapped = false;
let poly_zapped = -1;

// src/zap.c:1637 do_osshock() — object is deleted by the polymorph shock;
// some of a stack may survive via splitobj, and some material may
// metamorphose into a golem later (create_polymon via poly_zapped).
export async function do_osshock(obj) {
    obj_zapped = true;

    if (poly_zapped < 0) {
        /* some may metamorphose */
        const Luck = (game.u.uluck || 0) + (game.u.moreluck || 0);
        for (let i = obj.quan; i; i--)
            if (!rn2(Luck + 45)) {
                poly_zapped = game.objects[obj.otyp].oc_material;
                break;
            }
    }

    /* if quan > 1 then some will survive intact */
    if (obj.quan > 1) {
        obj = splitobj(obj, rnd(obj.quan - 1));
    }

    /* appropriately add damage to bill */
    if (costly_spot(obj.ox, obj.oy)) {
        if (game.u.ushops)
            await addtobill(obj, false, false, false);
        else
            await stolen_value(obj, obj.ox, obj.oy, false, false);
    }

    /* zap the object */
    delobj(obj);
}

// src/zap.c:1678 obj_unpolyable() — resists polymorphing. Draws the
// obj_resists rn2(100) for every non-unpolyable object.
export function obj_unpolyable(obj) {
    /* include/obj.h:429 unpolyable() */
    const unpoly = obj.otyp === ONAMES.WAN_POLYMORPH
        || obj.otyp === ONAMES.SPE_POLYMORPH
        || obj.otyp === ONAMES.POT_POLYMORPH
        || obj.otyp === ONAMES.AMULET_OF_UNCHANGING;
    return (unpoly
            || obj === game.uball || obj === game.uskin
            || obj_resists(obj, 5, 95));
}

/* src/zap.c:1688 charged_objs[] */
const charged_objs = [OCLASSES.WAND_CLASS, OCLASSES.WEAPON_CLASS,
                      OCLASSES.ARMOR_CLASS];

// src/zap.c:1702 poly_obj(); polymorph obj into id (STRANGE_OBJECT: a
// random object of the same class); returns the new object
export async function poly_obj(obj, id) {
    let otmp;
    const cc = { x: 0, y: 0 };
    let old_wornmask, new_wornmask = 0;
    const can_merge = (id === ONAMES.STRANGE_OBJECT);
    const obj_location = obj.where;

    if (obj.otyp === ONAMES.BOULDER)
        await sokoban_guilt();
    if (id === ONAMES.STRANGE_OBJECT) { /* preserve symbol */
        let try_limit = 3;
        let magic_obj = game.objects[obj.otyp].oc_magic;

        if (obj.otyp === ONAMES.UNICORN_HORN && obj.degraded_horn)
            magic_obj = 0;
        /* Try up to 3 times to make the magic-or-not status of
           the new item the same as the old item. */
        otmp = null;
        do {
            if (otmp)
                await delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
                 && game.objects[otmp.otyp].oc_magic !== magic_obj);
    } else {
        /* literally replace obj with this new thing */
        otmp = mksobj(id, false, false);
        /* Actually more things use corpsenm but they polymorph differently */
        const USES_CORPSENM = (typ) =>
            (typ === ONAMES.CORPSE || typ === ONAMES.STATUE || typ === ONAMES.FIGURINE);

        if (USES_CORPSENM(obj.otyp) && USES_CORPSENM(id))
            set_corpsenm(otmp, obj.corpsenm);
    }

    /* preserve quantity */
    otmp.quan = obj.quan;
    /* preserve the shopkeeper's (lack of) interest */
    otmp.no_charge = obj.no_charge;
    /* preserve inventory letter if in inventory */
    if (obj_location === OBJ_INVENT)
        otmp.invlet = obj.invlet;
    /* You can't send yourself 100 mail messages and then
     * polymorph them into useful scrolls
     */
    if (obj.otyp === ONAMES.SCR_MAIL) {
        otmp.otyp = ONAMES.SCR_MAIL;
        otmp.spe = 1;
    }

    /* avoid abusing eggs laid by you */
    if (obj.otyp === ONAMES.EGG && obj.spe) {
        let mnum, tryct = 100;

        /* first, turn into a generic egg */
        if (otmp.otyp === ONAMES.EGG)
            kill_egg(otmp);
        else {
            otmp.otyp = ONAMES.EGG;
            otmp.owt = weight(otmp);
        }
        otmp.corpsenm = NON_PM;
        otmp.spe = 0;

        /* now change it into something laid by the hero */
        while (tryct--) {
            mnum = can_be_hatched(random_monster(rn2));
            if (mnum !== NON_PM && !dead_species(mnum, true)) {
                otmp.spe = 1;            /* laid by hero */
                set_corpsenm(otmp, mnum); /* also sets hatch timer */
                break;
            }
        }
    }

    /* keep special fields (including charges on wands) */
    if (charged_objs.includes(otmp.oclass))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;

    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (erosion_matters(otmp, game.objects)) {
        if (is_flammable(otmp) || is_rustprone(otmp, game.objects)
            || is_crackable(otmp, game.objects))
            otmp.oeroded = obj.oeroded;
        if (is_corrodeable(otmp, game.objects) || is_rottable(otmp))
            otmp.oeroded2 = obj.oeroded2;
        if (is_damageable(otmp))
            otmp.oerodeproof = obj.oerodeproof;
    }

    /* Keep chest/box traps and poisoned ammo if we may */
    if (obj.otrapped && Is_box(otmp))
        otmp.otrapped = 1;
    if (obj.opoisoned && is_poisonable(otmp))
        otmp.opoisoned = 1;

    if (id === ONAMES.STRANGE_OBJECT && obj.otyp === ONAMES.CORPSE) {
        /* turn crocodile corpses into shoes */
        if (obj.corpsenm === PMNAMES.PM_CROCODILE) {
            otmp.otyp = ONAMES.LOW_BOOTS;
            otmp.oclass = OCLASSES.ARMOR_CLASS;
            otmp.spe = 0;
            otmp.oeroded = 0;
            otmp.oerodeproof = true;
            otmp.quan = 1;
            otmp.cursed = false;
        }
    }
    if (obj.otyp === ONAMES.LEASH && obj.leashmon) {
        if (otmp.otyp === ONAMES.LEASH) {
            otmp.leashmon = obj.leashmon;
            /* clear m_id before delobj(), to avoid o_unleash() by obfree() */
            obj.leashmon = 0;
        } else {
            /* obfree() would do this if we didn't do it here */
            o_unleash(obj);
        }
    }

    /* no box contents --KAA */
    if (Has_contents(otmp))
        delete_contents(otmp);

    /* 'n' merged objects may be fused into 1 object */
    if (otmp.quan > 1 && (!game.objects[otmp.otyp].oc_merge
                          || (can_merge && otmp.quan > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass) {
    case OCLASSES.TOOL_CLASS:
        if (otmp.otyp === ONAMES.MAGIC_LAMP) {
            otmp.otyp = ONAMES.OIL_LAMP;
            otmp.age = 1500; /* "best" oil lamp possible */
        } else if (otmp.otyp === ONAMES.MAGIC_MARKER) {
            otmp.recharged = 1; /* degraded quality */
        }
        /* don't care about the recharge count of other tools */
        break;

    case OCLASSES.WAND_CLASS:
        while (otmp.otyp === ONAMES.WAN_WISHING || otmp.otyp === ONAMES.WAN_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.WAN_LIGHT, ONAMES.WAN_LIGHTNING);
        /* altering the object tends to degrade its quality
           (analogous to spellbook `read count' handling) */
        if ((otmp.recharged | 0) < rn2(7)) /* recharge_limit */
            otmp.recharged = (otmp.recharged | 0) + 1;
        break;

    case OCLASSES.POTION_CLASS:
        while (otmp.otyp === ONAMES.POT_POLYMORPH)
            otmp.otyp = rnd_class(ONAMES.POT_GAIN_ABILITY, ONAMES.POT_WATER);
        /* potions of oil use obj->age field differently from other potions */
        if (otmp.otyp === ONAMES.POT_OIL || obj.otyp === ONAMES.POT_OIL)
            fixup_oil(otmp, obj);
        break;

    case OCLASSES.SPBOOK_CLASS:
        while (otmp.otyp === ONAMES.SPE_POLYMORPH)
            otmp.otyp = rnd_class(game.bases[OCLASSES.SPBOOK_CLASS], ONAMES.SPE_BLANK_PAPER);
        /* reduce spellbook abuse; non-blank books degrade;
           5.0: novels don't use spestudied so shouldn't degrade to blank
           (but don't force spestudied to zero for them since a non-zero
           value could get passed along to a future polymorph) */
        if (otmp.otyp !== ONAMES.SPE_BLANK_PAPER && otmp.otyp !== ONAMES.SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied | 0) + 1;
            if (otmp.spestudied > MAX_SPELL_STUDY) {
                otmp.otyp = ONAMES.SPE_BLANK_PAPER;
                /* writing a new book over it will yield an unstudied
                   one; re-polymorphing this one as-is may or may not
                   get something non-blank */
                otmp.spestudied = rn2(otmp.spestudied);
            }
        }
        break;

    case OCLASSES.GEM_CLASS:
        if (otmp.quan > rnd(4)
            && game.objects[obj.otyp].oc_material === MATERIALS.MINERAL
            && game.objects[otmp.otyp].oc_material !== MATERIALS.MINERAL) {
            otmp.otyp = ONAMES.ROCK; /* transmutation backfired */
            otmp.quan = Math.trunc(otmp.quan / 2);  /* some material has been lost */
        }
        break;
    }

    /* update the weight */
    otmp.owt = weight(otmp);

    /*
     * ** we are now done adjusting the object (except possibly wearing it) **
     */

    get_obj_location(obj, cc, BURIED_TOO | CONTAINED_TOO);
    old_wornmask = (obj.owornmask | 0) & ~(W_ART | W_ARTI);
    /* swap otmp for obj */
    replace_object(obj, otmp);
    if (obj_location === OBJ_INVENT) {
        /*
         * We may need to do extra adjustments for the hero if we're
         * messing with the hero's inventory.  The following calls are
         * equivalent to calling freeinv() on obj and addinv_nomerge()
         * on otmp, while doing an in-place swap of the actual objects.
         */
        freeinv_core(obj);
        await addinv_core1(otmp);
        await addinv_core2(otmp);
        /*
         * Handle polymorph of worn item.  Stone-to-flesh cast on self can
         * affect multiple objects at once, but their new forms won't
         * produce any side-effects.  A single worn item dipped into potion
         * of polymorph can produce side-effects but those won't yield out
         * of sequence messages because current polymorph is finished.
         */
        if (old_wornmask) {
            const was_twohanded = bimanual(obj), was_twoweap = game.u.twoweap;

            /* wearslot() expects us to deal with wielded/alt-wep/quivered
               items in case they're not weapons; for other slots it might
               return multiple bits (ring left|right); narrow that down to
               the bit(s) currently in use */
            new_wornmask = ((old_wornmask & W_WEAPONS) !== 0) ? old_wornmask
                           : (wearslot(otmp) & old_wornmask);
            await remove_worn_item(obj, true);
            /* if the new form can be worn in the same slot, make it so */
            if ((new_wornmask & W_WEP) !== 0) {
                if (was_twohanded || !bimanual(otmp) || !game.u.uarms)
                    setuwep(otmp);
                if (was_twoweap && game.u.uwep && !bimanual(game.u.uwep))
                    set_twoweap(true); /* u.twoweap = TRUE */
            } else if ((new_wornmask & W_SWAPWEP) !== 0) {
                if (was_twohanded || !bimanual(otmp))
                    setuswapwep(otmp);
                if (was_twoweap && game.u.uswapwep)
                    set_twoweap(true); /* u.twoweap = TRUE */
            } else if ((new_wornmask & W_QUIVER) !== 0) {
                setuqwep(otmp);
            } else if (new_wornmask) {
                setworn(otmp, new_wornmask);
                /* set_wear() might result in otmp being destroyed if
                   worn amulet has been turned into an amulet of change */
                await set_wear(otmp);
                otmp = wearmask_to_obj(new_wornmask); /* might be Null */
            }
        } /* old_wornmask */
    } else if (obj_location === OBJ_FLOOR) {
        if (obj.otyp === ONAMES.BOULDER && otmp.otyp !== ONAMES.BOULDER) {
            if (!does_block(cc.x, cc.y, game.level.at(cc.x, cc.y)))
                unblock_point(cc.x, cc.y);
        } else if (obj.otyp !== ONAMES.BOULDER && otmp.otyp === ONAMES.BOULDER) {
            /* leaving boulder in liquid would trigger sanity_check warning */
            if (is_pool_or_lava(cc.x, cc.y))
                await fracture_rock(otmp);
            if (does_block(cc.x, cc.y, game.level.at(cc.x, cc.y)))
                block_point(cc.x, cc.y);
        }
    }

    /* note: if otmp is gone, billing for it was handled by useup() */
    if (((otmp && !carried(otmp)) || obj.unpaid) && costly_spot(cc.x, cc.y)) {
        const shkp = shop_keeper(in_rooms(cc.x, cc.y, SHOPBASE).charCodeAt(0));

        if ((!obj.no_charge
             || (Has_contents(obj)
                 && (contained_cost(obj, shkp, 0, false, false) !== 0)))
            && inhishop(shkp)) {
            if (shkp.mpeaceful) {
                if (game.u.ushops
                    && (in_rooms(game.u.ux, game.u.uy, 0)[0]
                        === in_rooms(shkp.mx, shkp.my, 0)[0])
                    && !costly_spot(game.u.ux, game.u.uy)) {
                    await make_angry_shk(shkp, cc.x, cc.y);
                } else {
                    await pline(`${Shknam(shkp)} gets angry!`);
                    hot_pursuit(shkp);
                }
            } else
                await Norep(`${Shknam(shkp)} is furious!`);
        }
    }
    await delobj(obj);
    return otmp;
}

// src/zap.c:1505 polyuse(); consume up to minwt weight of objects of
// material mat from the pile (objhdr is the pile in nexthere order)
async function polyuse(objhdr, mat, minwt) {
    for (const otmp of objhdr) {
        if (!(minwt > 0))
            break;
        if (game.context?.bypasses && otmp.bypass)
            continue;
        if (otmp === game.u.uball || otmp === game.u.uchain)
            continue;
        if (obj_resists(otmp, 0, 0))
            continue; /* preserve unique objects */
        if (otmp.otyp === ONAMES.SCR_MAIL)
            continue;

        if ((game.objects[otmp.otyp].oc_material === mat)
            === (rn2(minwt + 1) !== 0)) {
            /* appropriately add damage to bill */
            if (costly_spot(otmp.ox, otmp.oy)) {
                if (game.u.ushops)
                    await addtobill(otmp, false, false, false);
                else
                    await stolen_value(otmp, otmp.ox, otmp.oy, false, false);
            }
            if (otmp.quan < LARGEST_INT)
                minwt -= otmp.quan;
            else
                minwt = 0;
            await delobj(otmp);
        }
    }
}

// src/zap.c:1546 create_polymon(); polymorph some of the stuff in this
// pile into a monster, preferably a golem of the kind okind
async function create_polymon(obj, okind) /* obj: the pile in nexthere order */
{
    let mdat = null;
    let mtmp;
    let material;
    let pm_index;
    let pile = obj;

    if (game.context?.bypasses) {
        /* this is approximate because the "no golems" !obj->nexthere
           check below doesn't understand bypassed objects; but it
           should suffice since bypassed objects always end up as a
           consecutive group at the top of their pile */
        while (pile.length && pile[0].bypass)
            pile = pile.slice(1);
    }

    /* no golems if you zap only one object -- not enough stuff */
    if (!pile.length || (pile.length === 1 && pile[0].quan === 1))
        return;

    /* some of these choices are arbitrary */
    switch (okind) {
    case MATERIALS.IRON:
    case MATERIALS.METAL:
    case MATERIALS.MITHRIL:
        pm_index = PMNAMES.PM_IRON_GOLEM;
        material = 'metal ';
        break;
    case MATERIALS.COPPER:
    case MATERIALS.SILVER:
    case MATERIALS.PLATINUM:
    case MATERIALS.GEMSTONE:
    case MATERIALS.MINERAL:
        pm_index = rn2(2) ? PMNAMES.PM_STONE_GOLEM : PMNAMES.PM_CLAY_GOLEM;
        material = 'lithic ';
        break;
    case 0:
    case MATERIALS.FLESH:
        /* there is no flesh type, but all food is type 0, so we use it */
        pm_index = PMNAMES.PM_FLESH_GOLEM;
        material = 'organic ';
        break;
    case MATERIALS.WOOD:
        pm_index = PMNAMES.PM_WOOD_GOLEM;
        material = 'wood ';
        break;
    case MATERIALS.LEATHER:
        pm_index = PMNAMES.PM_LEATHER_GOLEM;
        material = 'leather ';
        break;
    case MATERIALS.CLOTH:
        pm_index = PMNAMES.PM_ROPE_GOLEM;
        material = 'cloth ';
        break;
    case MATERIALS.BONE:
        pm_index = PMNAMES.PM_SKELETON; /* nearest thing to "bone golem" */
        material = 'bony ';
        break;
    case MATERIALS.GOLD:
        pm_index = PMNAMES.PM_GOLD_GOLEM;
        material = 'gold ';
        break;
    case MATERIALS.GLASS:
        pm_index = PMNAMES.PM_GLASS_GOLEM;
        material = 'glassy ';
        break;
    case MATERIALS.PAPER:
        pm_index = PMNAMES.PM_PAPER_GOLEM;
        material = 'paper ';
        break;
    default:
        /* if all else fails... */
        pm_index = PMNAMES.PM_STRAW_GOLEM;
        material = '';
        break;
    }

    if (!(game.mvitals[pm_index].mvflags & G_GENOD))
        mdat = game.mons[pm_index];

    mtmp = await makemon(mdat, pile[0].ox, pile[0].oy, MM_NOMSG);
    await polyuse(pile, okind, game.mons[pm_index].cwt);

    if (mtmp && cansee(mtmp.mx, mtmp.my)) {
        await pline(`Some ${material}objects meld, and ${a_monnam(mtmp)} arises from the pile!`);
    }
}

// src/zap.c:1993 stone_to_flesh_obj(); stone-to-flesh spell hits and maybe
// transforms or animates obj
async function stone_to_flesh_obj(obj) /* nonnull */
{
    let ptr;
    let mon, shkp;
    let item;
    let oox, ooy;
    let smell = false, golem_xform = false;
    let res = 1; /* affected object by default */

    if (game.objects[obj.otyp].oc_material !== MATERIALS.MINERAL
        && game.objects[obj.otyp].oc_material !== MATERIALS.GEMSTONE)
        return 0;
    /* Heart of Ahriman usually resists; ordinary items rarely do */
    if (obj_resists(obj, 2, 98))
        return 0;

    const cc = { x: 0, y: 0 };
    get_obj_location(obj, cc, 0);
    oox = cc.x, ooy = cc.y;
    /* add more if stone objects are added... */
    switch (game.objects[obj.otyp].oc_class) {
    case OCLASSES.ROCK_CLASS: /* boulders and statues */
    case OCLASSES.TOOL_CLASS: /* figurines */
        if (obj.otyp === ONAMES.BOULDER) {
            obj = await poly_obj(obj, ONAMES.ENORMOUS_MEATBALL);
            smell = true;
        } else if (obj.otyp === ONAMES.STATUE || obj.otyp === ONAMES.FIGURINE) {
            ptr = game.mons[obj.corpsenm];
            if (is_golem(ptr)) {
                golem_xform = (ptr !== game.mons[PMNAMES.PM_FLESH_GOLEM]);
            } else if (vegetarian(ptr)) {
                /* Don't animate monsters that aren't flesh */
                obj = await poly_obj(obj, ONAMES.MEATBALL);
                smell = true;
                break;
            }
            if (obj.otyp === ONAMES.STATUE) {
                /* animate_statue() forces all golems to become flesh golems */
                mon = await animate_statue(obj, oox, ooy, ANIMATE_SPELL);
            } else { /* (obj->otyp == FIGURINE) */
                if (golem_xform)
                    ptr = game.mons[PMNAMES.PM_FLESH_GOLEM];
                mon = await makemon(ptr, oox, ooy, NO_MINVENT | MM_NOMSG);
                if (mon) {
                    if (costly_spot(oox, ooy)
                        && (carried(obj) ? obj.unpaid : !obj.no_charge)) {
                        shkp = shop_keeper(in_rooms(oox, ooy, SHOPBASE).charCodeAt(0));
                        await stolen_value(obj, oox, ooy,
                                           !!(shkp && shkp.mpeaceful), false);
                    }
                    if (obj.timed)
                        obj_stop_timers(obj);
                    if (carried(obj))
                        useup(obj);
                    else
                        await delobj(obj);
                    if (cansee(mon.mx, mon.my))
                        await pline_The(`figurine ${golem_xform ? 'turns to flesh and ' : ''}animates!`);
                }
            }
            if (mon) {
                ptr = mon.data;
                /* this golem handling is redundant... */
                if (is_golem(ptr) && ptr !== game.mons[PMNAMES.PM_FLESH_GOLEM])
                    newcham(mon, game.mons[PMNAMES.PM_FLESH_GOLEM],
                            NC_VIA_WAND_OR_SPELL);
            } else if ((ptr.geno & (MFLAGS.G_NOCORPSE | MFLAGS.G_UNIQ)) !== 0) {
                /* didn't revive but can't leave corpse either */
                res = 0;
            } else {
                /* unlikely to get here since genociding monsters also
                   sets the G_NOCORPSE flag; drop statue's contents */
                while ((item = (obj.cobj && obj.cobj[0])) != null) {
                    bypass_obj(item); /* make stone-to-flesh miss it */
                    obj_extract_self(item);
                    place_object(item, oox, ooy);
                }
                obj = await poly_obj(obj, ONAMES.CORPSE);
            }
        } else { /* miscellaneous tool or unexpected rock... */
            res = 0;
        }
        break;
    /* maybe add weird things to become? */
    case OCLASSES.RING_CLASS: /* some of the rings are stone */
        obj = await poly_obj(obj, ONAMES.MEAT_RING);
        smell = true;
        break;
    case OCLASSES.WAND_CLASS: /* marble wand */
        obj = await poly_obj(obj, ONAMES.MEAT_STICK);
        smell = true;
        break;
    case OCLASSES.GEM_CLASS: /* stones & gems */
        obj = await poly_obj(obj, ONAMES.MEATBALL);
        smell = true;
        break;
    case OCLASSES.WEAPON_CLASS: /* crysknife */
        /*FALLTHRU*/
    default:
        res = 0;
        break;
    }

    if (smell) {
        /* non-meat eaters smell meat, meat eaters smell its flavor;
           monks are considered non-meat eaters regardless of behavior;
           other roles are non-meat eaters if they haven't broken
           vegetarian conduct yet (or if poly'd into non-carnivorous/
           non-omnivorous form, regardless of whether it's herbivorous,
           non-eating, or something stranger) */
        if (Role_if(PMNAMES.PM_MONK) || !game.u.uconduct?.unvegetarian
            || !carnivorous(game.youmonst.data))
            await Norep('You smell the odor of meat.');
        else
            await Norep('You smell a delicious smell.');
    }
    newsym(oox, ooy);
    return res;
}

// src/zap.c:2119 bhito(); object obj was hit by the effect of the wand or
// spell otmp.  Return non-zero if the wand/spell had any effect.
export async function bhito(obj, otmp) {
    let res = 1; /* affected object by default */
    let learn_it = false, maybelearnit;

    /* fundamental: a wand effect hitting itself doesn't do anything;
       otherwise we need to guard against accessing otmp after something
       strange has happened to it (along the lines of polymorph or
       stone-to-flesh [which aren't good examples since polymorph wands
       aren't affected by polymorph zaps and stone-to-flesh isn't
       available in wand form, but the concept still applies...]) */
    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        /* The bypass bit is only used for the effects of the current zap;
           see the C for the full list of users.  We check the obj->bypass
           bit above AND svc.context.bypasses as a safeguard against any
           stray occurrence left in an obj struct someplace, although that
           should never happen. */
        if (game.context?.bypasses) {
            return 0;
        } else {
            /* debugpline1("%s for a moment.", Tobjnam(obj, "pulsate")); */
            obj.bypass = 0;
        }
    }

    /*
     * Some parts of this function expect the object to be on the floor
     * obj->{ox,oy} to be valid.  The exception to this (so far) is
     * for the STONE_TO_FLESH spell.
     */
    if (!(obj.where === OBJ_FLOOR || otmp.otyp === ONAMES.SPE_STONE_TO_FLESH))
        ; /* impossible("bhito: obj is not floor or Stone To Flesh spell") */

    if (obj === game.u.uball) {
        res = 0;
    } else if (obj === game.u.uchain) {
        if (otmp.otyp === ONAMES.WAN_OPENING || otmp.otyp === ONAMES.SPE_KNOCK) {
            learn_it = true;
            await unpunish();
        } else
            res = 0;
    } else
        switch (otmp.otyp) {
        case ONAMES.WAN_POLYMORPH:
        case ONAMES.SPE_POLYMORPH:
            if (obj_unpolyable(obj)) {
                res = 0;
                break;
            }
            /* KMH, conduct */
            game.u.uconduct ||= {};
            if (!game.u.uconduct.polypiles++)
                await livelog_printf(LL_CONDUCT, `polymorphed ${uhis()} first object`);

            /* any saved lock context will be dangerously obsolete */
            if (Is_box(obj))
                await boxlock(obj, otmp);

            if (obj_shudders(obj)) {
                const cover = ((obj === game.level.objects.find(o => o.where === OBJ_FLOOR
                                                                && o.ox === game.u.ux && o.oy === game.u.uy))
                               && game.u.uundetected
                               && hides_under(game.youmonst.data));

                if (cansee(obj.ox, obj.oy))
                    learn_it = true;
                await do_osshock(obj);
                /* eek - your cover might have been blown */
                if (cover)
                    hideunder(game.youmonst);
                break;
            }
            obj = await poly_obj(obj, ONAMES.STRANGE_OBJECT);
            newsym(obj.ox, obj.oy);
            break;
        case ONAMES.WAN_PROBING:
            res = !obj.dknown ? 1 : 0;
            /* target object has now been "seen (up close)" */
            observe_object(obj);
            if (Is_container(obj) || obj.otyp === ONAMES.STATUE) {
                obj.cknown = obj.lknown = 1;
                if (Is_box(obj) && !obj.tknown) {
                    /* obj->tknown applies to boxes and chests, not bags or
                       statues; plural handling here and the "empty" case
                       below are superfluous because containers don't stack */
                    if (obj.otrapped)
                        await pline(`${Tobjnam(obj, 'are')} trapped!`);
                    obj.tknown = 1;
                }

                if (!(obj.cobj && obj.cobj.length)) {
                    await pline(`${Tobjnam(obj, 'are')} empty.`);
                } else if (SchroedingersBox(obj)) {
                    /* we don't want to force alive vs dead
                       determination for Schroedinger's Cat here,
                       so just make probing be inconclusive for it */
                    await You(`aren't sure whether ${the(xname(obj))} has ${
                        /* unfortunately, we can't tell whether rndmonnam()
                           picks a form which can't leave a corpse */
                        an(Hallucination() ? rndmonnam(null) : 'cat')} or its corpse inside.`);
                    obj.cknown = 0;
                } else {
                    /* view contents (not recursively) */
                    for (const o of obj.cobj)
                        observe_object(o); /* "seen", even if blind */
                    await display_cinventory(obj);
                }
                res = 1;
            } else if (obj.otyp === ONAMES.TIN) {
                /* don't learn wand if tin is already known */
                if (!obj.known || !obj.cknown)
                    res = 1;
                obj.known = 1;
                set_cknown_lknown(obj); /* if TIN obj->cknown = 1 */
            } else if (obj.otyp === ONAMES.EGG) {
                /* if egg is unhatchable, probing it won't learn wand
                   because even when flagged as known, it's just "an egg" */
                if (!obj.known && obj.corpsenm !== NON_PM)
                    res = 1;
                obj.known = 1;
                /* [should this call learn_egg_type()?] */
            }
            if (res)
                learn_it = true;
            break;
        case ONAMES.WAN_STRIKING:
        case ONAMES.SPE_FORCE_BOLT:
            /* learn the type if you see or hear something break
               (the sound could be implicit) */
            maybelearnit = cansee(obj.ox, obj.oy) || !Deaf();
            if (obj.otyp === ONAMES.BOULDER) {
                /* Soundeffect(se_crumbling_sound, 75); */
                if (cansee(obj.ox, obj.oy))
                    await pline_The('boulder falls apart.');
                else
                    await You_hear('a crumbling sound.');
                await fracture_rock(obj);
            } else if (obj.otyp === ONAMES.STATUE) {
                if (await break_statue(obj)) {
                    if (cansee(obj.ox, obj.oy)) {
                        if (Hallucination())
                            await pline_The(`${rndmonnam(null)} shatters.`);
                        else
                            await pline_The('statue shatters.');
                    } else
                        await You_hear('a crumbling sound.');
                }
            } else {
                const oox = obj.ox, ooy = obj.oy;

                if (game.context?.mon_moving ? !(await breaks(obj, oox, ooy))
                                             : !(await hero_breaks(obj, oox, ooy, 0)))
                    maybelearnit = false; /* nothing broke */
                else
                    /* obj broke; force redisplay in case it was the only--
                       or last--item under non-breaking pile-top; top item
                       here might now be a lone object rather than a pile */
                    newsym_force(oox, ooy);
                res = 0;
            }
            if (maybelearnit)
                learn_it = true;
            break;
        case ONAMES.WAN_CANCELLATION:
        case ONAMES.SPE_CANCELLATION:
            cancel_item(obj);
            newsym(obj.ox, obj.oy); /* might change color */
            break;
        case ONAMES.SPE_DRAIN_LIFE:
            await drain_item(obj, true);
            break;
        case ONAMES.WAN_TELEPORTATION:
        case ONAMES.SPE_TELEPORT_AWAY:
            {
                const ox = obj.ox, oy = obj.oy;

                await rloco(obj);
                maybe_unhide_at(ox, oy);
            }
            break;
        case ONAMES.WAN_MAKE_INVISIBLE:
            break;
        case ONAMES.WAN_UNDEAD_TURNING:
        case ONAMES.SPE_TURN_UNDEAD:
            if (obj.otyp === ONAMES.EGG) {
                revive_egg(obj);
            } else if (obj.otyp === ONAMES.CORPSE) {
                let mtmp;
                let ox, oy;
                let save_norevive;
                const by_u = !game.context?.mon_moving;
                const corpsenm = corpse_revive_type(obj);
                let corpsname = cxname_singular(obj);

                /* get corpse's location before revive() uses it up */
                const cc = { x: 0, y: 0 };
                if (!get_obj_location(obj, cc, 0))
                    ox = obj.ox, oy = obj.oy; /* won't happen */
                else
                    ox = cc.x, oy = cc.y;

                /* explicit revival magic overrides timer-based no-revive */
                save_norevive = obj.norevive;
                obj.norevive = 0;

                mtmp = await revive(obj, true);
                if (!mtmp) {
                    obj.norevive = save_norevive;
                    res = 0; /* no monster implies corpse was left intact */
                } else {
                    if (cansee(ox, oy)) {
                        if (canspotmon(mtmp)) {
                            await pline(`${upstart(noname_monnam(mtmp, ARTICLE_THE))} is resurrected!`);
                            learn_it = by_u ? true : game.zap_oseen;
                        } else {
                            /* saw corpse but don't see monster: maybe
                               mtmp is invisible, or has been placed at
                               a different spot than <ox,oy> */
                            if (!type_is_pname(game.mons[corpsenm]))
                                corpsname = The(corpsname);
                            await pline(`${corpsname} disappears.`);
                        }
                    } else {
                        /* couldn't see corpse's location */
                        if (Role_if(PMNAMES.PM_HEALER) && !Deaf()
                            && !nonliving(game.mons[corpsenm])) {
                            if (!type_is_pname(game.mons[corpsenm]))
                                corpsname = an(corpsname);
                            if (!Hallucination())
                                await You_hear(`${corpsname} reviving.`);
                            else
                                await You_hear('a defibrillator.');
                            learn_it = by_u ? true : game.zap_oseen;
                        }
                        if (canspotmon(mtmp))
                            /* didn't see corpse but do see monster: it
                               has been placed somewhere other than <ox,oy>
                               or blind hero spots it with ESP */
                            await pline(`${Monnam(mtmp)} appears.`);
                    }
                    if (learn_it)
                        exercise(A_WIS, true);
                }
            }
            break;
        case ONAMES.WAN_OPENING:
        case ONAMES.SPE_KNOCK:
        case ONAMES.WAN_LOCKING:
        case ONAMES.SPE_WIZARD_LOCK:
            if (Is_box(obj))
                res = await boxlock(obj, otmp);
            else
                res = 0;
            if (res)
                learn_it = true;
            break;
        case ONAMES.WAN_SLOW_MONSTER: /* no effect on objects */
        case ONAMES.SPE_SLOW_MONSTER:
        case ONAMES.WAN_SPEED_MONSTER:
        case ONAMES.WAN_NOTHING:
        case ONAMES.SPE_HEALING:
        case ONAMES.SPE_EXTRA_HEALING:
            res = 0;
            break;
        case ONAMES.SPE_STONE_TO_FLESH:
            res = await stone_to_flesh_obj(obj);
            break;
        default:
            /* impossible("What an interesting effect (%d)", otmp->otyp) */
            break;
        }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(otmp);
    return res;
}

// src/zap.c:2428 bhitpile() — apply fhito to every object in the pile at
// (tx,ty). The flat objects list is PREPEND-ordered, so filtering it gives
// the same order C's per-square nexthere chain would.
export async function bhitpile(obj, fhito, tx, ty, zz) {
    let hitanything = 0;

    const pile = (game.level.objects || [])
        .filter(o => o.where === OBJ_FLOOR && o.ox === tx && o.oy === ty);
    if (!pile.length)
        return 0;

    /* hidingunder — hero hiding under the top of the pile; hides_under
       hero forms are not modelled */

    if (obj.otyp === ONAMES.SPE_FORCE_BOLT
        || obj.otyp === ONAMES.WAN_STRIKING) {
        const trap = t_at(tx, ty);
        if (trap?.ttyp === STATUE_TRAP
            && await activate_statue_trap(trap, tx, ty, true))
            learnwand(obj);
    }

    poly_zapped = -1;
    for (const otmp of pile) {
        if (otmp.where !== OBJ_FLOOR || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }
    if (poly_zapped >= 0)
        await create_polymon(game.level.objects.filter(o => o.where === OBJ_FLOOR && o.ox === tx && o.oy === ty), poly_zapped);

    /* boulder re-stack — boulders polymorphed mid-pile; recorded */

    return hitanything;
}

// src/zap.c:3415 zapsetup() / :3421 zapwrapup()
export function zapsetup() {
    obj_zapped = false;
}
export async function zapwrapup() {
    /* if do_osshock() set obj_zapped while polying, give a message now */
    if (obj_zapped)
        await You_feel('shuddering vibrations.');
    obj_zapped = false;
}

// src/mon.c:5077 wiz_force_cham_form(), the debug-only monster polymorph
// selector. The ordinary path remains random. A named form is checked with
// the same special-monster rules before newcham receives it.
async function controlled_newcham(mtmp, ncflags) {
    if (!(game.wizard && game.flags?.monpolycontrol))
        return await newcham(mtmp, null, ncflags);

    let prompt = `Change ${noit_mon_nam(mtmp)} @ <${mtmp.mx},${mtmp.my}> into what?`;
    let tryct = 5;
    do {
        if (tryct === 4)
            prompt = prompt.replace(/ into what\?$/, ' into what kind of monster?');

        const answer = mungspaces(await getlin(prompt));
        if (answer[0] === '\x1b' || answer === '*'
            || answer.toLowerCase() === 'random')
            break;

        const mndx = name_to_monplus(answer, null, null);
        if (mndx !== NON_PM && validspecmon(mtmp, mndx))
            return await newcham(mtmp, game.mons[mndx], ncflags);

        await pline("It can't become that.");
    } while (--tryct > 0);

    if (!tryct)
        await pline("That's enough tries!");
    return await newcham(mtmp, null, ncflags);
}

// src/zap.c:160 bhitm(); immediate wand or spell effect on a monster
export async function bhitm(mtmp, otmp) {
    let ret = 0;
    let wake = true; /* Most 'zaps' should wake monster */
    let reveal_invis = false, learn_it = false;
    const dbldam = Role_if(PMNAMES.PM_KNIGHT) && game.u.uhave.questart;
    let skilled_spell, helpful_gesture = false;
    let dmg;
    const otyp = otmp.otyp; /* otmp is not NULL */
    let zap_type_text = 'spell';
    let obj;
    const disguised_mimic = (mtmp.data.mlet === MONSYMS.S_MIMIC
                             && M_AP_TYPE(mtmp) !== M_AP_NOTHING);
    /* box_or_door(): mimic appearances that have locks */
    const box_or_door = (monst) =>
        ((M_AP_TYPE(monst) === M_AP_OBJECT
          && (monst.mappearance === ONAMES.CHEST
              || monst.mappearance === ONAMES.LARGE_BOX))
         || (M_AP_TYPE(monst) === M_AP_FURNITURE
             /* is_cmap_door() tests S_symbol values, and            */
             /* mon->mappearance for furniture contains one of those */
             && is_cmap_door(monst.mappearance)));
    const learn = { v: false }; /* &learn_it for the trap helpers */

    if (engulfing_u(mtmp))
        reveal_invis = false;

    game.notonhead = (mtmp.mx !== game.bhitpos.x || mtmp.my !== game.bhitpos.y);
    skilled_spell = (otmp.oclass === OCLASSES.SPBOOK_CLASS && otmp.blessed);

    switch (otyp) {
    case ONAMES.WAN_STRIKING:
        zap_type_text = 'wand';
        /*FALLTHRU*/
    case ONAMES.SPE_FORCE_BOLT:
        reveal_invis = true;
        learn_it = cansee(game.bhitpos.x, game.bhitpos.y);
        if (resists_magm(mtmp)) { /* match effect on player */
            if (disguised_mimic && !disguised_as_mon(mtmp))
                seemimic(mtmp);
            await shieldeff(mtmp.mx, mtmp.my);
            await pline('Boing!');
            /* 5.0: used to 'break' to avoid setting learn_it here */
        } else if (game.u.uswallow || rnd(20) < 10 + find_mac(mtmp)) {
            if (disguised_mimic)
                seemimic(mtmp);
            dmg = d(2, 12);
            if (dbldam)
                dmg *= 2;
            if (otyp === ONAMES.SPE_FORCE_BOLT)
                dmg = spell_damage_bonus(dmg);
            await hit(zap_type_text, mtmp, exclam(dmg));
            await resist(mtmp, otmp.oclass, dmg, TELL);
        } else {
            if (!disguised_mimic)
                await miss(zap_type_text, mtmp);
            learn_it = false;
        }
        break;
    case ONAMES.WAN_SLOW_MONSTER:
    case ONAMES.SPE_SLOW_MONSTER:
        if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            if (disguised_mimic)
                seemimic(mtmp);
            await mon_adjust_speed(mtmp, -1, otmp);
            check_gear_next_turn(mtmp); /* might want speed boots */

            if (engulfing_u(mtmp) && is_whirly(mtmp.data)) {
                await You(`disrupt ${mon_nam(mtmp)}!`);
                await pline('A huge hole opens up...');
                await expels(mtmp, mtmp.data, true);
            }
        }
        break;
    case ONAMES.WAN_SPEED_MONSTER:
        if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            if (disguised_mimic)
                seemimic(mtmp);
            await mon_adjust_speed(mtmp, 1, otmp);
            check_gear_next_turn(mtmp); /* might want speed boots */
        }
        /* wake but don't anger a peaceful target */
        helpful_gesture = true;
        break;
    case ONAMES.WAN_UNDEAD_TURNING:
    case ONAMES.SPE_TURN_UNDEAD:
        wake = false;
        if (await unturn_dead(mtmp))
            wake = true;
        if (is_undead(mtmp.data) || is_vampshifter(mtmp)) {
            reveal_invis = true;
            wake = true;
            dmg = rnd(8);
            if (dbldam)
                dmg *= 2;
            if (otyp === ONAMES.SPE_TURN_UNDEAD)
                dmg = spell_damage_bonus(dmg);
            (game.context ||= {}).bypasses = true; /* for make_corpse() */
            if (!(await resist(mtmp, otmp.oclass, dmg, NOTELL))) {
                if (!DEADMONSTER(mtmp))
                    await monflee(mtmp, 0, false, true);
            }
        }
        break;
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
    case ONAMES.POT_POLYMORPH:
        if (mtmp.data === game.mons[PMNAMES.PM_LONG_WORM] && has_mcorpsenm(mtmp)) {
            /* if a long worm has mcorpsenm set, it was polymorphed by
               the current zap and shouldn't be affected if hit again */
            ;
        } else if (resists_magm(mtmp)) {
            /* magic resistance protects from polymorph traps, so make
               it guard against involuntary polymorph attacks too... */
            await shieldeff_mon(mtmp);
        } else if (!(await resist(mtmp, otmp.oclass, 0, NOTELL))) {
            const polyspot = (otyp !== ONAMES.POT_POLYMORPH),
                  give_msg = (!Hallucination()
                              && (canseemon(mtmp)
                                  || engulfing_u(mtmp)));

            /* dropped inventory (due to death by system shock,
               or loss of wielded weapon and/or worn armor due to
               limitations of new shape) won't be hit by this zap */
            if (polyspot)
                for (obj of (mtmp.minvent || []))
                    bypass_obj(obj);

            /* natural shapechangers aren't affected by system shock
               (unless protection from shapechangers is interfering
               with their metabolism...) */
            if ((mtmp.cham ?? NON_PM) === NON_PM && !rn2(25)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} shudders!`);
                    learn_it = true;
                }
                /* svc.context.bypasses = TRUE; ## for make_corpse() */
                /* no corpse after system shock */
                await xkilled(mtmp, XKILL_GIVEMSG | XKILL_NOCORPSE);
            } else {
                let ncflags = NO_NC_FLAGS;

                if (polyspot)
                    ncflags |= NC_VIA_WAND_OR_SPELL;
                if (give_msg)
                    ncflags |= NC_SHOW_MSG;
                if ((await controlled_newcham(mtmp, ncflags)) !== 0
                           /* if shapechange failed because there aren't
                              enough eligible candidates (most likely for
                              vampshifter), try reverting to original form */
                           || (ismnum(mtmp.cham)
                               && newcham(mtmp, game.mons[mtmp.cham],
                                          ncflags) !== 0)) {
                    if (give_msg && (canspotmon(mtmp)
                                     || engulfing_u(mtmp)))
                        learn_it = true;
                }
            }

            /* do this even if polymorphed failed (otherwise using
               flags.mon_polycontrol prompting to force mtmp to remain
               'long worm' would prompt again if zap hit another segment) */
            if (!DEADMONSTER(mtmp) && mtmp.data === game.mons[PMNAMES.PM_LONG_WORM]) {
                if (!has_mcorpsenm(mtmp))
                    newmcorpsenm(mtmp);
                /* flag to indicate that mtmp became a long worm
                   on current zap, so further hits (on mtmp's new
                   tail) don't do further transforms */
                mtmp.mextra.mcorpsenm = PMNAMES.PM_LONG_WORM;
                /* flag to indicate that cleanup is needed; object
                   bypass cleanup also clears mon->mextra->mcorpsenm
                   for all long worms on the level */
                (game.context ||= {}).bypasses = true;
            }
        }
        break;
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
        if (disguised_mimic)
            seemimic(mtmp);
        await cancel_monst(mtmp, otmp, true, true, false);
        break;
    case ONAMES.WAN_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        if (disguised_mimic)
            seemimic(mtmp);
        reveal_invis = !(await u_teleport_mon(mtmp, true));
        learn_it = canspotmon(mtmp);
        break;
    case ONAMES.WAN_MAKE_INVISIBLE: {
        const oldinvis = mtmp.minvis;
        const couldsee = canseemon(mtmp);
        let nambuf;

        if (disguised_mimic)
            seemimic(mtmp);
        /* format monster's name before altering its visibility */
        nambuf = Monnam(mtmp);
        mon_set_minvis(mtmp, false);
        if (!oldinvis && knowninvisible(mtmp)) {
            await pline(`${nambuf} turns transparent!`);
            reveal_invis = true;
            learn_it = true;
        } else if (couldsee && !canseemon(mtmp)) {
            /* keep the immediate effects of make invisible and teleportation
               ambiguous by using the same message that's used if we
               teleported mtmp (and it ended up somewhere you can't see) */
            await pline(`${nambuf} vanishes!`);
        }
        break;
    }
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK:
        if (disguised_mimic && box_or_door(mtmp))
            await that_is_a_mimic(mtmp, MIM_REVEAL); /*seemimic()*/
        learn.v = learn_it;
        wake = await closeholdingtrap(mtmp, learn);
        learn_it = learn.v;
        break;
    case ONAMES.WAN_PROBING:
        wake = false;
        reveal_invis = true;
        await probe_monster(mtmp);
        learn_it = true;
        break;
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        if (disguised_mimic && box_or_door(mtmp))
            await that_is_a_mimic(mtmp, MIM_REVEAL); /*seemimic()*/
        wake = false; /* don't want immediate counterattack */
        learn.v = learn_it;
        if (mtmp === game.u.ustuck) {
            /* zapping either holder/holdee or self [zapyourself()] will
               release hero from holder's grasp or holdee from hero's grasp */
            await release_hold();
            learn_it = true;

        /* zap which hits steed will only release saddle if it
           doesn't hit a holding or falling trap; playability
           here overrides the more logical target ordering */
        } else if (await openholdingtrap(mtmp, learn)) {
            learn_it = learn.v;
            break;
        } else if (await openfallingtrap(mtmp, true, learn)) {
            /* mtmp might now be on the migrating monsters list */
            learn_it = learn.v;
            break;
        } else if (otyp === ONAMES.SPE_KNOCK) {
            learn_it = learn.v;
            wake = true;
            ret = 1;
            if (mtmp.data.msize < MZ_HUMAN && !m_is_steadfast(mtmp)) {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} is knocked back!`);
                await mhurtle(mtmp, mtmp.mx - game.u.ux, mtmp.my - game.u.uy, rnd(2));
            } else {
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} doesn't budge.`);
            }
            if (!DEADMONSTER(mtmp)) {
                await wakeup(mtmp, !mindless(mtmp.data));
                abuse_dog(mtmp);
            }
        } else if ((obj = which_armor(mtmp, W_SADDLE)) != null) {
            learn_it = learn.v;
            let buf;

            buf = `${s_suffix(Monnam(mtmp))} ${distant_name(obj, xname)}`;
            if (cansee(mtmp.mx, mtmp.my)) {
                if (!canspotmon(mtmp))
                    buf = An(distant_name(obj, xname));
                await pline(`${buf} falls to the ${surface(mtmp.mx, mtmp.my)}.`);
            } else if (canspotmon(mtmp)) {
                await pline(`${buf} falls off.`);
            }
            await mdrop_obj(mtmp, obj, false);
        } else {
            learn_it = learn.v;
        }
        break;
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING: {
        const healamt = d(6, otyp === ONAMES.SPE_EXTRA_HEALING ? 8 : 4);

        reveal_invis = true;
        if (mtmp.data !== game.mons[PMNAMES.PM_PESTILENCE]) {
            const delta = mtmp.mhpmax - mtmp.mhp;

            wake = false; /* wakeup() makes the target angry */
            healmon(mtmp, healamt, 0);
            /* plain healing must be blessed to cure blindness; extra
               healing only needs to not be cursed, so spell always cures
               [potions quaffed by monsters behave slightly differently;
               we use the rules for the hero here...] */
            if (skilled_spell || otyp === ONAMES.SPE_EXTRA_HEALING)
                await mcureblindness(mtmp, canseemon(mtmp));
            if (canseemon(mtmp)) {
                if (disguised_mimic) {
                    if (is_obj_mappear(mtmp, ONAMES.STRANGE_OBJECT)) {
                        /* it can do better now */
                        set_mimic_sym(mtmp);
                        newsym(mtmp.mx, mtmp.my);
                    } else
                        await mimic_hit_msg(mtmp, otyp);
                } else
                    await pline(`${Monnam(mtmp)} looks${
                        otyp === ONAMES.SPE_EXTRA_HEALING ? ' much' : ''} better.`);
            }
            if (mtmp.mtame && Role_if(PMNAMES.PM_HEALER) && (delta > 0)) {
                more_experienced(Math.min(delta, healamt), 0);
                await newexplevel();
            }
            if (mtmp.mtame || mtmp.mpeaceful) {
                await adjalign(Role_if(PMNAMES.PM_HEALER) ? 1 : sgn(game.u.ualign.type));
            }
        } else { /* Pestilence */
            /* Pestilence will always resist; damage is half of (healamt/2) */
            await resist(mtmp, otmp.oclass, Math.trunc(healamt / 2), TELL);
        }
        break;
    }
    case ONAMES.WAN_LIGHT: { /* (broken wand) */
        const { flash_hits_mon } = await import('./uhitm.js');
        if (await flash_hits_mon(mtmp, otmp)) {
            learn_it = true;
            reveal_invis = true;
        }
        break;
    }
    case ONAMES.WAN_SLEEP: /* (broken wand) */
        /* [wakeup() doesn't rouse victims of temporary sleep,
           so it's okay to leave `wake' set to TRUE here;
           revealing concealed mimic is handled by sleep_monst()] */
        reveal_invis = true;
        if (await sleep_monst(mtmp, d(1 + otmp.spe, 12), OCLASSES.WAND_CLASS))
            await slept_monst(mtmp);
        if (!Blind())
            learn_it = true;
        break;
    case ONAMES.SPE_STONE_TO_FLESH:
        if (mtmp.data.mlet === MONSYMS.S_GOLEM) {
            let mesg;
            const name = Monnam(mtmp); /* before possible polymorph */

            /* turn stone golem into flesh golem */
            if (monsndx(mtmp.data) === PMNAMES.PM_STONE_GOLEM
                && newcham(mtmp, game.mons[PMNAMES.PM_FLESH_GOLEM], NO_NC_FLAGS))
                mesg = 'turns to flesh!';
            else if (monsndx(mtmp.data) === PMNAMES.PM_FLESH_GOLEM)
                mesg = 'seems fleshier...';
            else
                mesg = 'looks rather fleshy for a moment.';

            if (canseemon(mtmp))
                await pline(`${name} ${mesg}`);
        } else if (mtmp.data.mlet === MONSYMS.S_MIMIC
                   && ((M_AP_TYPE(mtmp) === M_AP_FURNITURE
                        && stone_furniture_type(mtmp.mappearance))
                       || (M_AP_TYPE(mtmp) === M_AP_OBJECT
                           && stone_object_type(mtmp.mappearance)))) {
            /* note: if that_is_a_mimic() doesn't get called to reveal the
               mimic, wakeup() below will call seemimic() */
            if (cansee(mtmp.mx, mtmp.my)) {
                set_msg_xy(mtmp.mx, mtmp.my);
                await that_is_a_mimic(mtmp, MIM_REVEAL | MIM_OMIT_WAIT);
            }
        } else {
            wake = false;
        }
        break;
    case ONAMES.SPE_DRAIN_LIFE:
        if (disguised_mimic)
            seemimic(mtmp);
        dmg = monhp_per_lvl(mtmp);
        if (dbldam)
            dmg *= 2;
        if (otyp === ONAMES.SPE_DRAIN_LIFE)
            dmg = spell_damage_bonus(dmg);
        if (resists_drli(mtmp)) {
            await shieldeff_mon(mtmp);
        } else if (!(await resist(mtmp, otmp.oclass, dmg, NOTELL))
                   && !DEADMONSTER(mtmp)) {
            mtmp.mhp -= dmg;
            mtmp.mhpmax -= dmg;
            /* die if already level 0, regardless of hit points */
            if (DEADMONSTER(mtmp) || mtmp.mhpmax <= 0 || mtmp.m_lev < 1) {
                await killed(mtmp);
            } else {
                mtmp.m_lev--;
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} suddenly seems weaker!`);
            }
        }
        break;
    case ONAMES.WAN_NOTHING:
        wake = false;
        break;
    default:
        /* impossible("What an interesting effect (%d)", otyp) */
        break;
    }
    if (wake && !DEADMONSTER(mtmp)) {
        /* seemimic() is done by wakeup() and might unblock vision */
        await wakeup(mtmp, helpful_gesture ? false : true);
        await m_respond(mtmp);
        if (mtmp.isshk && !game.u.ushops)
            hot_pursuit(mtmp);
    }
    /* note: gb.bhitpos won't be set if swallowed, but that's okay since
     * reveal_invis will be false.  We can't use mtmp->mx, my since it
     * might be an invisible worm hit on the tail.
     */
    if (reveal_invis && !DEADMONSTER(mtmp)) {
        if (cansee(game.bhitpos.x, game.bhitpos.y) && !canspotmon(mtmp))
            map_invisible(game.bhitpos.x, game.bhitpos.y);
    }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(otmp);
    return ret;
}

/* src/zap.c:13 MAGIC_COOKIE; :45 ZT_*; :55 ZT_WAND()/ZT_BREATH(); :59 is_hero_spell();
   :61 M_IN_WATER() */
const MAGIC_COOKIE = 1000;
const ZT_MAGIC_MISSILE = (ATTKS.AD_MAGM - 1),
      ZT_FIRE = (ATTKS.AD_FIRE - 1),
      ZT_COLD = (ATTKS.AD_COLD - 1),
      ZT_SLEEP = (ATTKS.AD_SLEE - 1),
      ZT_DEATH = (ATTKS.AD_DISN - 1), /* or disintegration */
      ZT_LIGHTNING = (ATTKS.AD_ELEC - 1),
      ZT_POISON_GAS = (ATTKS.AD_DRST - 1),
      ZT_ACID = (ATTKS.AD_ACID - 1);
const ZT_WAND = (x) => x;
const ZT_BREATH = (x) => (20 + x);
const is_hero_spell = (type) => (type >= 10 && type < 20);
/* include/mondata.h:28 cant_drown() */
const cant_drown = (ptr) => (is_swimmer(ptr) || amphibious(ptr) || breathless(ptr));
const M_IN_WATER = (ptr) => (ptr.mlet === MONSYMS.S_EEL || cant_drown(ptr));
/* include/hack.h:1538 AC_VALUE() */
const AC_VALUE = (AC) => ((AC >= 0) ? AC : -rnd(-AC));
/* include/hack.h:1476 BZ_OFS_WAN(), :1478 BZ_OFS_SPE(), :1480 BZ_U_WAND(), :1482 BZ_U_SPELL() */
const BZ_OFS_WAN = (otyp) => (Math.abs(otyp - ONAMES.WAN_MAGIC_MISSILE) % 10);
const BZ_OFS_SPE = (otyp) => (Math.abs(otyp - ONAMES.SPE_MAGIC_MISSILE) % 10);
const BZ_U_WAND = (bztyp) => (0 + bztyp);
const BZ_U_SPELL = (bztyp) => (10 + bztyp);
/* include/youprop.h Half_spell_damage, Stunned */
const Half_spell_damage = () => !!(game.u.intrinsic?.HHalf_spell_damage || game.u.uprops?.HALF_SPDAM);
const Stunned = () => !!(game.u.intrinsic?.HStun || game.u.uprops?.STUNNED);
/* include/rm.h:146 SURFACE_AT() */
const SURFACE_AT = (x, y) => {
    const lev = game.level.at(x, y);
    return (lev.typ === DRAWBRIDGE_UP) ? db_under_typ(lev.drawbridgemask) : lev.typ;
};
/* the C compares glyph integers; our glyph_at() returns descriptors */
const same_glyph = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// src/zap.c:3579 skiprange(); where a thrown rock skips over water
function skiprange(range, skip) /* skip = { start, end } */
{
    const tr = Math.trunc(range / 4);
    const tmp = range - ((tr > 0) ? rnd(tr) : 0);

    skip.start = tmp;
    skip.end = tmp - (Math.trunc(tmp / 4) * rnd(3));
    if (skip.end >= tmp)
        skip.end = tmp - 1;
}

// src/zap.c:3594 maybe_explode_trap(); a cancellation beam hitting a magical
// trap causes an explosion.  Might delete the trap; won't destroy otmp.
async function maybe_explode_trap(ttmp, otmp, learn_it) /* learn_it = { v } */
{
    if (!ttmp || !otmp)
        return;
    if (otmp.otyp === ONAMES.WAN_CANCELLATION || otmp.otyp === ONAMES.SPE_CANCELLATION) {
        const x = ttmp.tx, y = ttmp.ty;

        if (undestroyable_trap(ttmp.ttyp)) {
            await shieldeff(x, y);
            if (cansee(x, y)) {
                ttmp.tseen = 1;
                newsym(x, y);
                learn_it.v = true;
            }
        } else if (is_magical_trap(ttmp.ttyp)) {
            const seeit = cansee(x, y);

            /* note: this explosion mustn't destroy otmp */
            await explode(x, y, -ONAMES.WAN_CANCELLATION,
                          20 + d(3, 6), TRAP_EXPLODE, EXPL_MAGICAL);
            deltrap(ttmp);
            newsym(x, y);
            if (seeit)
                learn_it.v = true;
        }
    }
}

/* include/display.h:146 knowninvisible(); you know a monster is both there
   and invisible */
const knowninvisible = (mon) =>
    (mon.minvis
     && ((cansee(mon.mx, mon.my)
          && (See_invisible() || Detect_monsters()))
         || (!Blind() && ((game.u.intrinsic?.HTelepat ?? 0) & ~INTRINSIC)
             && mdistu(mon) <= (BOLT_LIM * BOLT_LIM))));
/* include/youprop.h Detect_monsters, Stoned; include/hack.h Luck */
const Detect_monsters = () => !!(game.u.intrinsic?.HDetect_monsters || game.u.uprops?.DETECT_MONSTERS);
const Stoned = () => !!game.u.uprops?.STONED;
const Luck = () => (game.u.uluck | 0) + (game.u.moreluck | 0);
/* include/mondata.h MZ_HUMAN; include/mextra.h:234 has_mcorpsenm() */
const MZ_HUMAN = MFLAGS.MZ_MEDIUM;
const has_mcorpsenm = (mon) => !!(mon.mextra && MCORPSENM(mon) !== NON_PM);
/* include/display.h:186 random_monster() */
const random_monster = (rng) => rng(NUMMONS);

// src/zap.c:3628 zap_map() — per-square terrain effects of a lateral zap.
// Trap explosion applies to cancellation only; the engraving arm fires for
// down zaps only; secret-door reveals belong to striking/opening/locking.
// A lateral polymorph over plain floor does nothing here.
export async function zap_map(x, y, obj) /* zapped wand, or book for cast spell */
{
    let ttmp = t_at(x, y);
    const db = { x, y }; /* might be changed by drawbridge handling */
    const learn_it = { v: false };

    /*
     * We handle drawbridge for lateral zaps; zap_updown() handles up/down.
     * Engravings only get hit by down zaps and we handle that here.
     */

    /* cancellation */
    await maybe_explode_trap(ttmp, obj, learn_it);
    ttmp = t_at(x, y); /* refresh in case trap was altered or is gone */

    if (game.u.dz > 0) { /* zapping down */
        const e = engr_at(x, y);

        /* subset of engraving effects; none sets `disclose' */
        if (e && e.engr_type !== HEADSTONE) {
            switch (obj.otyp) {
            case ONAMES.WAN_POLYMORPH:
            case ONAMES.SPE_POLYMORPH: {
                del_engr(e);
                const etxt = random_engraving();
                make_engr_at(x, y, etxt.text, etxt.pristine, game.moves, 0);
                break;
            }
            case ONAMES.WAN_CANCELLATION:
            case ONAMES.SPE_CANCELLATION:
            case ONAMES.WAN_MAKE_INVISIBLE:
                del_engr(e);
                break;
            case ONAMES.WAN_TELEPORTATION:
            case ONAMES.SPE_TELEPORT_AWAY:
                await rloc_engr(e);
                break;
            case ONAMES.SPE_STONE_TO_FLESH:
                if (e.engr_type === ENGRAVE) {
                    /* only affects things in stone */
                    await pline_The(Hallucination()
                                    ? 'floor runs like butter!'
                                    : 'edges on the floor get smoother.');
                    wipe_engr_at(x, y, d(2, 4), true);
                }
                break;
            case ONAMES.WAN_STRIKING:
            case ONAMES.SPE_FORCE_BOLT:
                wipe_engr_at(x, y, d(2, 4), true);
                break;
            default:
                break;
            }
        }

    } else if (!game.u.dz) {
        const ltyp = game.level.at(x, y).typ;

        if (find_drawbridge(db)) {
            switch (obj.otyp) {
            case ONAMES.WAN_OPENING:
            case ONAMES.SPE_KNOCK:
                /* dbwall: 'closed door' of raised drawbridge */
                if (is_db_wall(x, y)) {
                    if (cansee(db.x, db.y) || cansee(x, y))
                        learn_it.v = true;
                    await open_drawbridge(db.x, db.y);
                }
                break;
            case ONAMES.WAN_LOCKING:
            case ONAMES.SPE_WIZARD_LOCK:
                /* drawbridge_down: span of lowered drawbridge */
                if ((cansee(db.x, db.y) || cansee(x, y))
                    && game.level.at(db.x, db.y).typ === DRAWBRIDGE_DOWN)
                    learn_it.v = true;
                await close_drawbridge(db.x, db.y);
                break;
            case ONAMES.WAN_STRIKING:
            case ONAMES.SPE_FORCE_BOLT:
                /* !drawbridge_up: not spot in front of raised bridge,
                   so either span of lowered bridge or portcullis */
                if (ltyp !== DRAWBRIDGE_UP) {
                    learn_it.v = true;
                    await destroy_drawbridge(db.x, db.y);
                }
                break;
            }
        } /* find_drawbridge */
    } /* !u.uz */

    if (obj.otyp === ONAMES.WAN_PROBING) {
        /*
         * Probing, either up/down or lateral.
         */
        let ltyp;
        let oldtyp, oldglyph;
        const lev = game.level.at(x, y);

        /* map terrain; might reveal a special room which is already within
           view that hasn't been entered yet */
        oldtyp = lev.lastseentyp;
        oldglyph = glyph_at(x, y);
        show_map_spot(x, y, false);
        if (oldtyp !== lev.lastseentyp || !same_glyph(oldglyph, glyph_at(x, y))) {
            /* TODO: ought to give some message */
            learn_it.v = true;
        }
        ltyp = SURFACE_AT(x, y);
        /* secret door gets revealed, converted into regular door */
        if (ltyp === SDOOR) {
            cvt_sdoor_to_door(lev); /* .typ = DOOR */
            recalc_block_point(x, y);
            newsym(x, y);
            if (cansee(x, y)) {
                await pline('Probing reveals a secret door.');
                learn_it.v = true;
            } else if (Is_rogue_level(game.u.uz)) { /* from zap_over_floor() */
                await draft_message(false); /* "You feel a draft." (open doorway) */
            }

        /* secret corridor likewise, although only ones within view will
           still be secret; for the !cansee(x,y) case, show_map_spot()
           above has already converted the spot to regular corridor */
        } else if (ltyp === SCORR) {
            lev.typ = CORR;
            unblock_point(x, y);
            newsym(x, y);
            await pline('Probing exposes a secret corridor.');
            learn_it.v = true;

        /* if on or over ice, describe it ("solid ice", "thin ice", &c);
           likewise for furniture in case hero is levitating while blind */
        } else if (ltyp === ICE || IS_FURNITURE(ltyp)) {
            if (game.u.dz > 0) { /* down, which also means x,y == u.ux,u.uy */
                await force_decor(true);
                learn_it.v = true;
            }
        }
        /*
         * Probing reveals undiscovered traps.
         *
         * FIXME?  This finds floor traps even when zapping up and
         * ceiling traps even when zapping down.
         */
        if (ttmp) {
            let ttmpname;
            const t_already_seen = ttmp.tseen;
            let use_the;
            const hallu = !!Hallucination();

            /* should probably be changed to use sense_trap(detect.c)
               so that trap can temporarily be forced to be shown and
               map browsing can take place before it reverts to being
               covered by monster or object(s) */
            ttmp.tseen = 1;
            newsym(x, y);

            if (!t_already_seen || hallu) {
                ttmpname = trapname(ttmp.ttyp, false);
                use_the = !hallu ? (ttmp.ttyp === VIBRATING_SQUARE
                                    && Invocation_lev(game.u.uz))
                                 : !rn2(4);
                await You(`find ${use_the ? the(ttmpname) : an(ttmpname)}${
                    use_the ? '!' : '.'}`);
                learn_it.v = !hallu;
            }
        } /* t_at() */
    } /* probing */

    if (learn_it.v)
        learnwand(obj);
    return;
}

const flash_types = [
    'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray', 'death ray',
    'bolt of lightning', '', '', '', '',
    'magic missile', 'fireball', 'cone of cold', 'sleep ray',
    'finger of death', 'bolt of lightning', '', '', '', '',
    'blast of missiles', 'blast of fire', 'blast of frost',
    'blast of sleep gas', 'blast of disintegration', 'blast of lightning',
    'blast of poison gas', 'blast of acid', '', '',
];

// src/zap.c:89 zaptype().
function zaptype(type) {
    if (type <= -30 && type >= -39)
        type += 30;
    return Math.abs(type);
}

export function flash_str(typ, nohallu = false) {
    /* nohallu: suppress hallucination (for death reasons) */
    typ = zaptype(typ);
    if (Hallucination() && !nohallu) {
        /* always return "blast of <something>";
           this could be extended with hallucinatory rays, but probably
           not worth it at this time */
        return `blast of ${rnd_hallublast()}`;
    }
    return flash_types[typ];
}

// src/zap.c:4705 zap_hit()
function zap_hit(ac, type) /* either hero cast spell type or 0 */
{
    const chance = rn2(20);
    const spell_bonus = type ? spell_hit_bonus(type) : 0;

    /* small chance for naked target to avoid being hit */
    if (!chance)
        return rnd(10) < ac + spell_bonus;

    /* very high armor protection does not achieve invulnerability */
    ac = AC_VALUE(ac);

    return (3 - chance < ac + spell_bonus);
}

// src/zap.c:4723 disintegrate_mon(); a monster hit by disintegration
async function disintegrate_mon(mon, type, fltxt) /* type: hero vs other */
{
    const m_amulet = mlifesaver(mon);

    if (canseemon(mon)) {
        if (!m_amulet)
            await pline(`${Monnam(mon)} is disintegrated!`);
        else
            await hit(fltxt, mon, '!');
    }

    /* note: worn amulet of life saving must be preserved in order to operate */
    const oresist_disintegration = (obj) =>
        (game.objects[obj.otyp].oc_oprop === DISINT_RES || obj_resists(obj, 5, 50)
         || is_quest_artifact(obj) || obj === m_amulet);

    for (const otmp of [...(mon.minvent || [])]) {
        if (!oresist_disintegration(otmp)) {
            extract_from_minvent(mon, otmp, true, true);
            obfree(otmp, null);
        }
    }

    if (type < 0)
        await monkilled(mon, null, -ATTKS.AD_RBRE);
    else
        await xkilled(mon, XKILL_NOMSG | XKILL_NOCORPSE);
}

const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;

const destroy_strings = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', '', ''],
    ['breaks apart and explodes', '', 'exploding wand'],
];

function destroyable(obj, dmgtyp) {
    if (obj.oartifact || (obj.in_use && obj.quan === 1))
        return false;

    if (dmgtyp === ATTKS.AD_FIRE) {
        if (obj.otyp === ONAMES.SCR_FIRE || obj.otyp === ONAMES.SPE_FIREBALL)
            return false;
        return obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME
            || obj.oclass === OCLASSES.POTION_CLASS
            || obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS;
    }
    if (dmgtyp === ATTKS.AD_COLD)
        return obj.oclass === OCLASSES.POTION_CLASS
            && obj.otyp !== ONAMES.POT_OIL;
    if (dmgtyp === ATTKS.AD_ELEC)
        return (obj.oclass === OCLASSES.RING_CLASS
                || obj.oclass === OCLASSES.WAND_CLASS)
            && obj.otyp !== ONAMES.RIN_SHOCK_RESISTANCE
            && obj.otyp !== ONAMES.WAN_LIGHTNING;
    return false;
}

export function inventory_resistance_check(dmgtyp) {
    const prop = dmgtyp === ATTKS.AD_COLD ? 'COLD_RES'
               : dmgtyp === ATTKS.AD_FIRE ? 'FIRE_RES'
                 : dmgtyp === ATTKS.AD_ELEC ? 'SHOCK_RES' : null;
    let probability = prop
        && (((game.u.uprops?.[prop] || 0)
             & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0) ? 99 : 0;

    if (!probability && game.u.uarmc?.otyp === ONAMES.DWARVISH_CLOAK
        && (dmgtyp === ATTKS.AD_COLD || dmgtyp === ATTKS.AD_FIRE))
        probability = 90;
    return probability ? rn2(100) < probability : false;
}

export function m_useup(mon, obj) {
    if (obj.quan > 1) {
        obj.quan--;
        obj.owt = weight(obj);
    } else {
        obj_extract_self(obj);
        const at = mon.minvent?.indexOf(obj) ?? -1;
        if (at >= 0)
            mon.minvent.splice(at, 1);
    }
}


async function maybe_destroy_item(carrier, obj, dmgtyp) {
    let i, cnt, quan;
    let dmg, xresist, skip, dindx;
    let mult;
    const u_carry = (carrier === game.youmonst);
    const vis = !u_carry && canseemon(carrier);
    let chargeit = false;

    xresist = skip = 0;
    /* lint suppression */
    dmg = dindx = 0;
    quan = 0;

    /* external worn item protects inventory? */
    if (u_carry && inventory_resistance_check(dmgtyp))
        return 0;

    switch (dmgtyp) {
    case ATTKS.AD_COLD:
        quan = obj.quan;
        dindx = 0;
        dmg = rnd(4);
        break;
    case ATTKS.AD_FIRE:
        xresist = (obj.oclass !== OCLASSES.POTION_CLASS
                   && obj.otyp !== ONAMES.GLOB_OF_GREEN_SLIME
                   && (u_carry ? Fire_resistance() : resists_fire(carrier)));
        if (obj.otyp === ONAMES.SPE_BOOK_OF_THE_DEAD) {
            skip = 1;
            if (u_carry ? !Blind() : vis) {
                await pline(`${The(u_carry ? xname(obj) : distant_name(obj, xname))
                    } glows a strange ${hcolor('dark red')}, but remains intact.`);
            }
            break;
        }
        quan = obj.quan;
        switch (obj.oclass) {
        case OCLASSES.POTION_CLASS:
            dindx = (obj.otyp !== ONAMES.POT_OIL) ? 1 : 2;
            dmg = rnd(6);
            break;
        case OCLASSES.SCROLL_CLASS:
            dindx = 3;
            dmg = 1;
            break;
        case OCLASSES.SPBOOK_CLASS:
            dindx = 4;
            dmg = 1;
            break;
        case OCLASSES.FOOD_CLASS: /* only GLOB_OF_GREEN_SLIME */
            dindx = 1; /* boil and explode */
            dmg = Math.trunc((obj.owt + 19) / 20);
            break;
        }
        break;
    case ATTKS.AD_ELEC:
        xresist = (obj.oclass !== OCLASSES.RING_CLASS
                   && (u_carry ? Shock_resistance() : resists_elec(carrier)));
        quan = obj.quan;
        switch (obj.oclass) {
        case OCLASSES.RING_CLASS:
            if (((obj.owornmask & W_RING) && game.u.uarmg && !is_metallic(game.u.uarmg))
                || obj.otyp === ONAMES.RIN_SHOCK_RESISTANCE) {
                skip++;
                break;
            } else if (game.objects[obj.otyp].oc_charged && rn2(3)) {
                chargeit = true;
                break;
            }
            dindx = 5;
            dmg = 0;
            break;
        case OCLASSES.WAND_CLASS:
            dindx = 6;
            dmg = rnd(10);
            break;
        }
        break;
    default:
        skip = 1; /* just in case ineligible damage type gets through... */
        /* impossible("maybe_destroy_item with unexpected dmgtyp %d", dmgtyp) */
        break;
    }

    if (chargeit) {
        /* FIXME: recharge only handles items in hero's inventory */
        if (u_carry)
            await recharge(obj, 0);
    } else if (!skip) {
        const osym = obj.oclass; /* for checking glob of slime after it's
                                       destroyed */
        if (obj.in_use)
            --quan; /* one will be used up elsewhere */
        for (i = cnt = 0; i < quan; i++)
            if (!rn2(3))
                cnt++;

        if (!cnt)
            return 0;

        if (u_carry || vis) {
            mult = (cnt === 1) ? ((quan === 1) ? '' /* 1 of 1 */
                                  : 'One of ')      /* 1 of N */
                   : ((cnt < quan) ? 'Some of '     /* n of N */
                      : (quan === 2) ? 'Both of '   /* 2 of 2 */
                        : 'All of ');               /* N of N */
            await pline(`${mult}${
                (cnt === 1 && quan === 1) ? Yname2(obj) : yname(obj)} ${
                destroy_strings[dindx][(cnt > 1) ? 1 : 0]}!`);
        }
        if (u_carry) { /* effects that happen only to the player */
            if (osym === OCLASSES.POTION_CLASS && dmgtyp !== ATTKS.AD_COLD
                && (!breathless(game.youmonst.data)
                    || haseyes(game.youmonst.data))) {
                await potionbreathe(obj);
            }
            if (obj.owornmask) { /* m_useup handles these for monster */
                if (obj.owornmask & W_RING) /* ring being worn */
                    await Ring_gone(obj);
                else
                    setnotworn(obj);
            }
            if (obj === game.current_wand) {
                game.current_wand = null; /* destroyed */
            }
        }
        for (i = 0; i < cnt; i++) {
            if (u_carry)
                useup(obj);
            else
                m_useup(carrier, obj);
        }
        if (dmg) {
            if (!u_carry) {
                return xresist ? 0 : dmg;
            }
            if (xresist) {
                await You("aren't hurt!");
            } else {
                let how = destroy_strings[dindx][2];
                const one = (cnt === 1);

                if (dmgtyp === ATTKS.AD_FIRE && osym === OCLASSES.FOOD_CLASS)
                    how = 'exploding glob of slime';
                const { losehp } = await import('./hack.js');
                await losehp(dmg, one ? how : makeplural(how),
                             one ? KILLED_BY_AN : KILLED_BY);
                exercise(A_STR, false);
            }
        }
    }
    return dmg;
}

// src/zap.c:5965 destroy_items(). Damage limits the number of eligible stacks;
// reservoir sampling gives later stacks the same chance as earlier ones.
export async function destroy_items(mon, osym, dmg_in) {
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if (dmg_in % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE))
        ++limit;
    limit = Math.min(limit, MAX_ITEMS_DESTROYED);
    if (limit < 1)
        return 0;

    const u_carry = mon === game.youmonst;
    const invent = u_carry ? game.invent : (mon.minvent || []);
    const selected = [];
    let eligible = 0;

    for (const obj of invent) {
        if (!destroyable(obj, osym))
            continue;
        const i = eligible < limit ? eligible : rn2(eligible);
        ++eligible;
        if (i >= limit)
            continue;
        const prop = game.objects[obj.otyp].oc_oprop;
        selected[i] = {
            obj,
            deferred: u_carry && (((obj.owornmask | 0)
                                   && (prop === LEVITATION || prop === FLYING))
                                  || (obj.otyp === ONAMES.POT_WATER
                                      && game.u.ulycn >= 0)),
        };
    }

    let damage = 0;
    for (let defer = 0; defer <= 1; ++defer) {
        for (const item of selected.slice(0, Math.min(eligible, limit))) {
            if (!item || item.deferred !== !!defer || !invent.includes(item.obj))
                continue;
            damage += await maybe_destroy_item(mon, item.obj, osym);
        }
    }
    return damage;
}

export async function zhitm(mon, type, nd, ootmp = { v: null }) /* ootmp: worn armor for caller to disintegrate */
{
    let tmp = 0, orig_dmg = 0; /* damage amount */
    const damgtype = zaptype(type) % 10;
    let sho_shieldeff = false;
    const spellcaster = is_hero_spell(type); /* maybe get a bonus! */

    ootmp.v = null;
    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        if (resists_magm(mon) || defended(mon, ATTKS.AD_MAGM)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        break;
    case ZT_FIRE:
        if (resists_fire(mon) || defended(mon, ATTKS.AD_FIRE)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp; /* includes spell bonus but not monster vuln to fire */
        if (resists_cold(mon))
            tmp += 7;
        if (await burnarmor(mon)) {
            if (!rn2(3)) {
                tmp += await destroy_items(mon, ATTKS.AD_FIRE, orig_dmg);
                await ignite_items(mon.minvent);
            }
        }
        break;
    case ZT_COLD:
        if (resists_cold(mon) || defended(mon, ATTKS.AD_COLD)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp; /* includes spell bonus but not monster vuln to cold */
        if (resists_fire(mon))
            tmp += d(nd, 3);
        if (!rn2(3))
            tmp += await destroy_items(mon, ATTKS.AD_COLD, orig_dmg);
        break;
    case ZT_SLEEP:
        /* resistance and shield effect and revealing concealed mimic are
           handled by sleep_monst() */
        tmp = 0;
        await sleep_monst(mon, d(nd, 25),
                          type === ZT_WAND(ZT_SLEEP) ? OCLASSES.WAND_CLASS : 0);
        break;
    case ZT_DEATH:                              /* death/disintegration */
        if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) { /* death */
            if (mon.data === game.mons[PMNAMES.PM_DEATH]) {
                healmon(mon, Math.trunc(mon.mhpmax * 3 / 2), Math.trunc(mon.mhpmax / 2));
                if (mon.mhpmax >= MAGIC_COOKIE)
                    mon.mhpmax = MAGIC_COOKIE - 1;
                tmp = 0;
                break;
            }
            if (nonliving(mon.data) || is_demon(mon.data)
                || is_vampshifter(mon) || resists_magm(mon)) {
                /* similar to player */
                sho_shieldeff = true;
                break;
            }
            type = -1; /* so they don't get saving throws */
        } else {
            let otmp2;

            if (resists_disint(mon) || defended(mon, ATTKS.AD_DISN)) {
                sho_shieldeff = true;
            } else if (mon.misc_worn_check & W_ARMS) {
                /* destroy shield; victim survives */
                ootmp.v = which_armor(mon, W_ARMS);
            } else if (mon.misc_worn_check & W_ARM) {
                /* destroy suit, also cloak if present */
                ootmp.v = which_armor(mon, W_ARM);
                if ((otmp2 = which_armor(mon, W_ARMC)) != null)
                    m_useup(mon, otmp2);
            } else {
                /* no suit, victim dies; destroy cloak
                   and shirt now in case target gets life-saved */
                tmp = MAGIC_COOKIE;
                if ((otmp2 = which_armor(mon, W_ARMC)) != null)
                    m_useup(mon, otmp2);
                if ((otmp2 = which_armor(mon, W_ARMU)) != null)
                    m_useup(mon, otmp2);
            }
            type = -1; /* no saving throw wanted */
            break;     /* not ordinary damage */
        }
        tmp = mon.mhp + 1;
        break;
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp;
        if (resists_elec(mon) || defended(mon, ATTKS.AD_ELEC)) {
            sho_shieldeff = true;
            tmp = 0;
            /* can still blind the monster */
        }
        if (!resists_blnd(mon)
            && !(type > 0 && engulfing_u(mon))
            && nd > 2) {
            /* sufficiently powerful lightning blinds monsters */
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            if ((mon.mblinded + rnd_tmp) > 127)
                mon.mblinded = 127;
            else
                mon.mblinded += rnd_tmp;
        }
        if (!rn2(3))
            tmp += await destroy_items(mon, ATTKS.AD_ELEC, orig_dmg);
        break;
    case ZT_POISON_GAS:
        if (resists_poison(mon) || defended(mon, ATTKS.AD_DRST)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        if (resists_acid(mon) || defended(mon, ATTKS.AD_ACID)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (!rn2(6))
            await acid_damage(MON_WEP(mon));
        if (!rn2(6))
            await erode_armor(mon, ERODE_CORRODE);
        break;
    }
    if (sho_shieldeff)
        await shieldeff(mon.mx, mon.my);
    if (is_hero_spell(type) && (Role_if(PMNAMES.PM_KNIGHT) && game.u.uhave.questart))
        tmp *= 2;
    if (tmp > 0 && type >= 0
        && await resist(mon, type < ZT_SPELL(0) ? OCLASSES.WAND_CLASS : 0, 0, NOTELL))
        tmp = Math.trunc(tmp / 2);
    if (tmp < 0)
        tmp = 0; /* don't allow negative damage */
    mon.mhp -= tmp;
    return tmp;
}

// src/zap.c:4401 zhitu(), a ray striking the hero. The fire arm is shared by
// wands, spells, breath, and rebounding beams.
async function zhitu(type, nd, fltxt, sx, sy) {
    let dam = 0;
    const abstyp = zaptype(type);
    let orig_dam = 0;

    switch (abstyp % 10) {
    case ZT_MAGIC_MISSILE:
        if (Antimagic()) {
            await shieldeff(sx, sy);
            await pline_The('missiles bounce off!');
            monstseesu(M_SEEN_MAGR);
        } else {
            dam = d(nd, 6);
            exercise(A_STR, false);
            monstunseesu(M_SEEN_MAGR);
        }
        break;
    case ZT_FIRE:
        orig_dam = d(nd, 6);
        if (Fire_resistance()) {
            await shieldeff(sx, sy);
            await You("don't feel hot!");
            monstseesu(M_SEEN_FIRE);
            await ugolemeffects(ATTKS.AD_FIRE, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_FIRE);
        }
        await burn_away_slime();
        if (await burnarmor(game.youmonst)) { /* "body hit" */
            if (!rn2(3))
                await destroy_items(game.youmonst, ATTKS.AD_FIRE, orig_dam);
            if (!rn2(3))
                await ignite_items(game.invent);
        }
        break;
    case ZT_COLD:
        orig_dam = d(nd, 6);
        if (Cold_resistance()) {
            await shieldeff(sx, sy);
            await You("don't feel cold.");
            monstseesu(M_SEEN_COLD);
            await ugolemeffects(ATTKS.AD_COLD, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_COLD);
        }
        if (!rn2(3))
            await destroy_items(game.youmonst, ATTKS.AD_COLD, orig_dam);
        break;
    case ZT_SLEEP:
        if (Sleep_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You("don't feel sleepy.");
            monstseesu(M_SEEN_SLEEP);
        } else {
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-d(nd, 25), true); /* sleep ray */
        }
        break;
    case ZT_DEATH:
        if (abstyp === ZT_BREATH(ZT_DEATH)) {
            const disn_prot = inventory_resistance_check(ATTKS.AD_DISN);

            if (Disint_resistance()) {
                await You('are not disintegrated.');
                monstseesu(M_SEEN_DISINT);
                break;
            } else if (disn_prot) {
                break;
            }
            monstunseesu(M_SEEN_DISINT);
            if (game.u.uarms) {
                /* destroy shield; other possessions are safe */
                await disintegrate_arm(game.u.uarms);
                break;
            } else if (game.u.uarm) {
                /* destroy suit; if present, cloak goes too */
                if (game.u.uarmc)
                    await disintegrate_arm(game.u.uarmc);
                await disintegrate_arm(game.u.uarm);
                break;
            }
            /* no shield or suit, you're dead; wipe out cloak
               and/or shirt in case of life-saving or bones */
            if (game.u.uarmc)
                await disintegrate_arm(game.u.uarmc);
            if (game.u.uarmu)
                await disintegrate_arm(game.u.uarmu);
        } else if (nonliving(game.youmonst.data) || is_demon(game.youmonst.data)) {
            await shieldeff(sx, sy);
            await You('seem unaffected.');
            break;
        } else if (Antimagic()) {
            await shieldeff(sx, sy);
            monstseesu(M_SEEN_MAGR);
            await You("aren't affected.");
            break;
        }
        monstunseesu(M_SEEN_MAGR);
        (game.killer ||= {}).format = KILLED_BY_AN;
        game.killer.name = fltxt ? fltxt : '';
        /* when killed by disintegration breath, don't leave corpse */
        game.u.ugrave_arise = (type === -ZT_BREATH(ZT_DEATH)) ? -3 : NON_PM;
        await done(DIED);
        return; /* lifesaved */
    case ZT_LIGHTNING:
        orig_dam = d(nd, 6);
        if (Shock_resistance()) {
            await shieldeff(sx, sy);
            await You("aren't affected.");
            monstseesu(M_SEEN_ELEC);
            await ugolemeffects(ATTKS.AD_ELEC, orig_dam);
        } else {
            dam = orig_dam;
            exercise(A_CON, false);
            monstunseesu(M_SEEN_ELEC);
        }
        if (!rn2(3))
            await destroy_items(game.youmonst, ATTKS.AD_ELEC, orig_dam);
        break;
    case ZT_POISON_GAS:
        await poisoned('blast', A_DEX, 'poisoned blast', 15, false);
        break;
    case ZT_ACID:
        if (Acid_resistance()) {
            await pline_The(`${hliquid('acid')} doesn't hurt.`);
            monstseesu(M_SEEN_ACID);
            dam = 0;
        } else {
            await pline_The(`${hliquid('acid')} burns!`);
            dam = d(nd, 6);
            exercise(A_STR, false);
            monstunseesu(M_SEEN_ACID);
        }
        /* using two weapons at once makes both of them more vulnerable */
        if (!rn2(game.u.twoweap ? 3 : 6))
            await acid_damage(game.u.uwep);
        if (game.u.twoweap && !rn2(3))
            await acid_damage(game.u.uswapwep);
        if (!rn2(6))
            await erode_armor(game.youmonst, ERODE_CORRODE);
        break;
    }

    /*
     * 5.0: when fatal, this used to yield "Killed by <fltxt>." without any
     * information about who was responsible.  Now 'buzzer' is used to try
     * to supply "zapped/cast/breathed by <mon> [imitating <other_mon>]."
     *
     * Wand of death, spell of finger of death, and disintegration breath
     * don't use this routine so don't include 'inflicted by'.
     */
    {
        let kbuf;
        const otmp = game.current_wand;
        /* fire horn and frost horn get handled as wands by caller */
        const verb = (abstyp < 10) /* wand */
                     ? ((otmp && otmp.oclass === OCLASSES.TOOL_CLASS) ? 'played'
                        : 'zapped')
                     : (abstyp < 20) ? 'cast'
                       : (abstyp < 30) ? 'exhaled'
                         : 'imagined'; /* should never happen */

        if (type < 0 || (type === 0 && game.buzzer)) {
            /* if gb.buzzer is Null, kbuf[] will end up with just <fltxt> */
            kbuf = death_inflicted_by(fltxt, game.buzzer);
            /* change "death inflicted by mon" to "death <verb> by mon" */
            if (game.buzzer)
                kbuf = strsubst(kbuf, 'inflicted', verb);
        } else {
            /* FIXME: "zapped by herself" is suitable for a rebound;
               "zapped at herself" would be better if player explicitly
               targeted hero */
            kbuf = `${fltxt} ${verb} by ${uhim()}self`;
        }
        /* Half_spell_damage protection yields half-damage for wands & spells,
           including hero's own ricochets; breath attacks do full damage */
        if (dam && Half_spell_damage() && abstyp < 20)
            dam = Math.trunc((dam + 1) / 2);
        const { losehp } = await import('./hack.js');
        await losehp(dam, kbuf, KILLED_BY_AN);
    }
    return;
}

// src/zap.c:4664 bounce_dir().
function bounce_dir(sx, sy, delta, bounceback) {
    if (!delta.dx || !delta.dy || (bounceback > 0 && !rn2(bounceback))) {
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        return;
    }

    const lsx = sx - delta.dx, lsy = sy - delta.dy;
    let bounce = 0;
    const vert = game.level?.at(sx, lsy);
    if (isok(sx, lsy) && vert && ZAP_POS(vert.typ)
        && !closed_door(sx, lsy)
        && (IS_ROOM(vert.typ)
            || (isok(sx + delta.dx, lsy)
                && ZAP_POS(game.level.at(sx + delta.dx, lsy).typ))))
        bounce = 1;
    const horiz = game.level?.at(lsx, sy);
    if (isok(lsx, sy) && horiz && ZAP_POS(horiz.typ)
        && !closed_door(lsx, sy)
        && (IS_ROOM(horiz.typ)
            || (isok(lsx, sy + delta.dy)
                && ZAP_POS(game.level.at(lsx, sy + delta.dy).typ)))) {
        if (!bounce || rn2(2))
            bounce = 2;
    }
    switch (bounce) {
    case 0:
        delta.dx = -delta.dx;
        delta.dy = -delta.dy;
        break;
    case 1:
        delta.dy = -delta.dy;
        break;
    case 2:
        delta.dx = -delta.dx;
        break;
    }
}

const zap_colors = [
    HI_ZAP, CLR_ORANGE, CLR_WHITE, HI_ZAP,
    CLR_BLACK, CLR_WHITE, CLR_GREEN, CLR_YELLOW,
];

// src/display.c:2461 zapdir_to_glyph(). A zap type changes the color, while
// these four cmap entries supply the active symbol-set character.
function zapdir_cmap(dx, dy) {
    if (dx === dy)
        return cmap_names.S_lslant;
    if (dx && dy)
        return cmap_names.S_rslant;
    return dx ? cmap_names.S_hbeam : cmap_names.S_vbeam;
}

// src/zap.c:4598 burn_floor_objects(). Fire consumes eligible paper and slime
// stacks, then lights every exposed fuel source left on the square.
export async function burn_floor_objects(x, y, give_feedback, u_caused) {
    const at = () => (game.level?.objects || []).filter(obj =>
        obj.where === OBJ_FLOOR && obj.ox === x && obj.oy === y);
    let count = 0;

    for (const obj of [...at()]) {
        const eligible = obj.oclass === OCLASSES.SCROLL_CLASS
            || obj.oclass === OCLASSES.SPBOOK_CLASS
            || (obj.oclass === OCLASSES.FOOD_CLASS
                && obj.otyp === ONAMES.GLOB_OF_GREEN_SLIME);
        if (!eligible || obj.otyp === ONAMES.SCR_FIRE
            || obj.otyp === ONAMES.SPE_FIREBALL || obj_resists(obj, 2, 100))
            continue;

        const quantity = obj.quan | 0;
        let destroyed = 0;
        for (let i = quantity; i > 0; --i)
            if (!rn2(3))
                ++destroyed;
        if (!destroyed)
            continue;

        let singular = '', plural = '';
        if (give_feedback) {
            const originalQuantity = obj.quan;
            obj.quan = 1;
            singular = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
            obj.quan = 2;
            plural = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
            obj.quan = originalQuantity;
        }

        if (u_caused) {
            await useupf(obj, destroyed);
        } else if (destroyed < quantity) {
            obj.quan -= destroyed;
            obj.owt = weight(obj);
        } else {
            delobj(obj);
        }
        count += destroyed;
        if (give_feedback) {
            if (destroyed > 1)
                await pline(`${destroyed} ${plural} burn.`);
            else
                await pline(`${An(singular)} burns.`);
        }
    }
    await ignite_items(at());
    return count;
}

// src/zap.c:5088 start_melt_ice_timeout(). Newly made ice normally receives a
// random level timer between 50 and 2000 turns; a failed search leaves it
// permanent.
export function start_melt_ice_timeout(x, y, minTime = 0) {
    let when = Number(minTime) || 0;
    if (when < 49)
        when = 49;
    while (++when <= 2000) {
        if (!rn2((2000 - when) + 50))
            break;
    }
    if (when <= 2000) {
        const packed = ((x & 0xffff) << 16) | (y & 0xffff);
        start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, packed);
    }
}

// src/zap.c:5040 melt_ice(). Restore the water hidden under ice, discard or
// convert traps that fall into it, resume ice-delayed object timers, then
// apply the new liquid terrain to an occupant of the square.
export async function melt_ice(x, y, msg = null) {
    const loc = game.level?.at(x, y);
    if (!loc || !is_ice(x, y))
        return;

    if (loc.typ === DRAWBRIDGE_UP || loc.typ === DRAWBRIDGE_DOWN) {
        loc.drawbridgemask = (loc.drawbridgemask ?? 0) & ~DB_ICE;
    } else {
        loc.typ = loc.icedpool === ICED_POOL ? POOL : MOAT;
        loc.icedpool = 0;
    }

    const packed = ((x & 0xffff) << 16) | (y & 0xffff);
    game.timer_base = (game.timer_base || []).filter(timer => {
        if (timer.func_index !== MELT_ICE_AWAY)
            return true;
        const arg = timer.arg?.a_long ?? timer.arg;
        return arg !== packed;
    });

    const trap = t_at(x, y);
    if (trap) {
        const trappedMonster = m_at(x, y);
        if (trappedMonster?.mtrapped)
            trappedMonster.mtrapped = 0;
        if (trap.ttyp === LANDMINE || trap.ttyp === BEAR_TRAP) {
            const obj = mksobj(trap.ttyp === LANDMINE
                ? ONAMES.LAND_MINE : ONAMES.BEARTRAP, true, false);
            obj.quan = 1;
            obj.owt = weight(obj);
            obj.opoisoned = 0;
            place_object(obj, x, y);
            stackobj(obj);
            deltrap(trap);
        } else if (trap.ttyp !== MAGIC_PORTAL
                   && trap.ttyp !== VIBRATING_SQUARE) {
            deltrap(trap);
        }
    }

    obj_ice_effects(x, y, false);
    const { unearth_objs } = await import('./mklev.js');
    unearth_objs(x, y);
    if (Underwater())
        vision_recalc(1);
    newsym(x, y);
    if (cansee(x, y) || u_at(x, y))
        await Norep(msg || 'The ice crackles and melts.');

    let boulder = sobj_at(ONAMES.BOULDER, x, y);
    if (boulder) {
        if (cansee(x, y))
            await pline(An(xname(boulder)) + ' settles...');
        const { boulder_hits_pool } = await import('./do.js');
        do {
            obj_extract_self(boulder);
            await boulder_hits_pool(boulder, x, y, false);
            boulder = is_pool(x, y)
                ? sobj_at(ONAMES.BOULDER, x, y) : null;
        } while (boulder);
        newsym(x, y);
    }

    if (u_at(x, y)) {
        const { spoteffects } = await import('./hack.js');
        await spoteffects(true);
    } else if (is_pool(x, y)) {
        const monster = m_at(x, y);
        if (monster) {
            const { minliquid } = await import('./mon.js');
            await minliquid(monster);
        }
    }
}

// src/zap.c:5141 zap_over_floor(); terrain effects of a ray at <x,y>
export async function zap_over_floor(
    x, y,                /* location */
    type,                /* damage type plus {wand|spell|breath} info */
    shopdamage,          /* { v }: extra output if shop door is destroyed */
    ignoremon,           /* ignore any monster here */
    exploding_wand_typ)  /* supplied when breaking a wand; or POT_OIL
                          * when a lit potion of oil explodes */
{
    let zapverb;
    let mon;
    let t;
    const lev = game.level.at(x, y);
    const see_it = cansee(x, y);
    let yourzap;
    let rangemod = 0;
    const damgtype = zaptype(type) % 10;
    const lavawall = (lev.typ === LAVAWALL);

    if (type === PHYS_EXPL_TYPE) {
        /* this won't have any effect on the floor */
        return -1000; /* not a zap anyway, shouldn't matter */
    }

    switch (damgtype) {
    case ZT_FIRE:
        t = t_at(x, y);
        if (t && t.ttyp === WEB) {
            /* a burning web is too flimsy to notice if you can't see it */
            if (see_it)
                await Norep('A web bursts into flames!');
            await delfloortrap(t), t = null;
            if (see_it)
                newsym(x, y);
        }
        if (is_ice(x, y)) {
            await melt_ice(x, y, null);
        } else if (is_pool(x, y)) {
            const on_water_level = Is_waterlevel(game.u.uz);
            let msggiven = false;
            let msgtxt = (!Deaf())
                         ? 'You hear hissing gas.' /* Deaf-aware */
                         : (type >= 0)
                           ? 'That seemed remarkably uneventful.'
                           : null;

            /* don't create steam clouds on Plane of Water; air bubble
               movement and gas regions don't understand each other */
            if (!on_water_level) {
                create_gas_cloud(x, y, rnd(5), 0); /* 1..5, no damg */
                if (game.iflags.last_msg === PLNMSG_ENVELOPED_IN_GAS)
                    msggiven = true;
            }

            if (lev.typ !== POOL) { /* MOAT or DRAWBRIDGE_UP or WATER */
                t = null;
                if (on_water_level)
                    msgtxt = (see_it || !Deaf()) ? 'Some water boils.' : null;
                else if (see_it)
                    msgtxt = 'Some water evaporates.';
            } else {
                rangemod -= 3;
                lev.typ = ROOM, lev.flags = 0;
                const { maketrap } = await import('./mklev.js');
                t = maketrap(x, y, PIT);
                /*if (t) -- this was before the vapor cloud was added --
                      t->tseen = 1;*/
                if (see_it)
                    msgtxt = 'The water evaporates.';
            }
            if (msgtxt && !msggiven)
                await Norep(msgtxt);

            if (lev.typ === ROOM) { /* POOL changed to ROOM above */
                if ((mon = m_at(x, y)) != null) {
                    /* probably ought to do some hefty damage to any
                       creature caught in boiling water;
                       at a minimum, eels are forced out of hiding */
                    if (is_swimmer(mon.data) && mon.mundetected) {
                        mon.mundetected = 0;
                    }
                }
                newsym(x, y);
                if (t) {
                    /* if water walking/swimming/magical breathing, maybe fall
                       into the new pit (after the water evaporation message);
                       if flying or levitating, nothing will happen */
                    if (u_at(x, y))
                        await dotrap(t, NO_TRAP_FLAGS);
                    else if (mon)
                        await mintrap(mon, NO_TRAP_FLAGS);
                }
            }
        } else if (IS_FOUNTAIN(lev.typ)) {
            create_gas_cloud(x, y, rnd(3), 0); /* 1..3, no damage */
            if (see_it)
                await pline('Steam billows from the fountain.');
            rangemod -= 1;
            await dryup(x, y, type > 0);
        }
        break; /* ZT_FIRE */

    case ZT_COLD:
        if (is_pool(x, y) || is_lava(x, y) || lavawall) {
            const lava = (is_lava(x, y) || lavawall),
                  moat = is_moat(x, y);
            const chance = Math.max(2, 5 + game.level.flags.temperature * 10);

            if (IS_WATERWALL(lev.typ) || (lavawall && rn2(chance))) {
                /* For now, don't let WATER freeze. */
                /* Soundeffect(se_soft_crackling, 100); */
                if (see_it)
                    await pline_The(`${hliquid(lavawall ? 'lava' : 'water')} freezes for a moment.`);
                else
                    await You_hear('a soft crackling.');
                rangemod -= 1000; /* stop */
            } else {
                const buf = waterbody_name(x, y); /* for MOAT */
                rangemod -= 3;
                if (lev.typ === DRAWBRIDGE_UP) {
                    lev.drawbridgemask &= ~DB_UNDER; /* clear lava */
                    lev.drawbridgemask |= (lava ? DB_FLOOR : DB_ICE);
                } else {
                    lev.icedpool = lava ? 0
                                        : (lev.typ === POOL) ? ICED_POOL
                                                             : ICED_MOAT;
                    if (lavawall) {
                        if ((isok(x, y - 1) && IS_WALL(game.level.at(x, y - 1).typ))
                            || (isok(x, y + 1) && IS_WALL(game.level.at(x, y + 1).typ)))
                            lev.typ = VWALL;
                        else
                            lev.typ = HWALL;
                        const { fix_wall_spines } = await import('./mklev.js');
                        fix_wall_spines(Math.max(0, x - 1), Math.max(0, y - 1),
                                        Math.min(COLNO - 1, x + 1), Math.min(ROWNO - 1, y + 1));
                    } else {
                        lev.typ = lava ? ROOM : ICE;
                    }
                }
                const { bury_objs } = await import('./mklev.js');
                bury_objs(x, y);
                if (!lava) {
                    /* Soundeffect(se_soft_crackling, 30); */
                }
                if (see_it) {
                    if (lava)
                        await Norep(`The ${hliquid('lava')} cools and solidifies.`);
                    else if (moat)
                        await Norep(`The ${buf} is bridged with ice!`);
                    else
                        await Norep(`The ${hliquid('water')} freezes.`);
                    newsym(x, y);
                } else if (!lava) {
                    await You_hear('a crackling sound.');
                }
                if (u_at(x, y)) {
                    if (game.u.uinwater) { /* not just `if (Underwater)' */
                        /* leave the no longer existent water */
                        await set_uinwater(0); /* u.uinwater = 0 */
                        game.u.uundetected = 0;
                        await docrt();
                        game.vision_full_recalc = 1;
                    } else if (game.u.utrap && game.u.utraptype === TT_LAVA) {
                        if (Passes_walls()) {
                            await You('pass through the now-solid rock.');
                            await reset_utrap(true);
                        } else {
                            set_utrap(rn1(50, 20), TT_INFLOOR);
                            await You('are firmly stuck in the cooling rock.');
                        }
                    }
                } else if ((mon = m_at(x, y)) != null) {
                    /* probably ought to do some hefty damage to any
                       non-ice creature caught in freezing water;
                       at a minimum, eels are forced out of hiding */
                    if (is_swimmer(mon.data) && mon.mundetected) {
                        mon.mundetected = 0;
                        newsym(x, y);
                    }
                }
                if (!lava) {
                    start_melt_ice_timeout(x, y, 0);
                    obj_ice_effects(x, y, true);
                }
            } /* ?WATER */

        } else if (is_ice(x, y)) {
            let melt_time;

            /* Already ice here, so just firm it up. */
            /* Now ensure that only ice that is already timed is affected */
            if ((melt_time = spot_time_left(x, y, MELT_ICE_AWAY)) !== 0) {
                spot_stop_timers(x, y, MELT_ICE_AWAY);
                start_melt_ice_timeout(x, y, melt_time);
            }
        }
        break; /* ZT_COLD */

    case ZT_POISON_GAS:
        /* poison gas with range 1: green dragon/iron golem breath (AD_DRST);
           caller is placing a series of 1x1 clouds along the zap's path;
           <x,y> for wall locations might be included--reject those */
        if (ZAP_POS(lev.typ))
            create_gas_cloud(x, y, 1, 8);
        break;

    case ZT_LIGHTNING:
        /*FALLTHRU*/
    case ZT_ACID:
        if (lev.typ === IRONBARS) {
            if (damgtype === ZT_LIGHTNING && rn2(10))
                break;
            if ((lev.wall_info & W_NONDIGGABLE) !== 0) {
                if (see_it)
                    await Norep(`The ${defsyms[cmap_names.S_bars].explain} ${
                        (damgtype === ZT_ACID) ? 'corrode' : 'melt'} somewhat but remain intact.`);
                /* but nothing actually happens... */
            } else {
                rangemod -= 3;
                if (see_it)
                    await Norep(`The ${defsyms[cmap_names.S_bars].explain} ${
                        (damgtype === ZT_ACID) ? 'corrode away' : 'melt'}.`);
                await dissolve_bars(x, y);
                if (in_rooms(x, y, SHOPBASE).length) {
                    add_damage(x, y, (type >= 0) ? SHOP_BARS_COST : 0);
                    if (type >= 0)
                        shopdamage.v = true;
                }
            }
        }
        break; /* ZT_ACID */

    default:
        break;
    }

    /* set up zap text for possible door feedback; for exploding wand, we
       want "the blast" rather than "your blast" even if hero caused it */
    yourzap = (type >= 0 && !exploding_wand_typ);
    zapverb = 'blast'; /* breath attack or wand explosion */
    if (!exploding_wand_typ) {
        const ztype = zaptype(type); /* 0..29 for both hero and monsters */

        if (ztype < ZT_SPELL(0))
            zapverb = 'bolt'; /* wand zap */
        else if (ztype < ZT_BREATH(0))
            zapverb = 'spell';
    } else if (exploding_wand_typ === ONAMES.POT_OIL
               || exploding_wand_typ === ONAMES.SCR_FIRE) {
        /* breakobj() -> explode_oil() -> splatter_burning_oil()
           -> explode(ZT_SPELL(ZT_FIRE), BURNING_OIL)
           -> zap_over_floor(ZT_SPELL(ZT_FIRE), POT_OIL) */
        /* leave zapverb as "blast"; exploding_wand_typ was nonzero, so
           'yourzap' is FALSE and the result will be "the blast" */
        exploding_wand_typ = 0; /* not actually an exploding wand */
    }

    /* secret door gets revealed, converted into regular door */
    if (game.level.at(x, y).typ === SDOOR) {
        cvt_sdoor_to_door(game.level.at(x, y)); /* .typ = DOOR */
        recalc_block_point(x, y);
        /* target spot will now pass closed_door() test below
           (except on rogue level) */
        newsym(x, y);
        if (see_it)
            await pline(`${yourzap ? 'Your' : 'The'} ${zapverb} reveals a secret door.`);
        else if (Is_rogue_level(game.u.uz))
            await draft_message(false); /* "You feel a draft." (open doorway) */
    }

    /* regular door absorbs remaining zap range, possibly gets destroyed */
    if (closed_door(x, y)) {
        let new_doormask = -1;
        let see_txt = null, sense_txt = null, hear_txt = null;

        rangemod = -1000;
        let def_case = false;
        switch (damgtype) {
        case ZT_FIRE:
            new_doormask = D_NODOOR;
            see_txt = 'The door is consumed in flames!';
            sense_txt = 'smell smoke.';
            break;
        case ZT_COLD:
            new_doormask = D_NODOOR;
            see_txt = 'The door freezes and shatters!';
            hear_txt = 'a deep cracking sound.';
            break;
        case ZT_DEATH:
            /* death spells/wands don't disintegrate */
            if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) {
                def_case = true;
                break;
            }
            new_doormask = D_NODOOR;
            see_txt = 'The door disintegrates!';
            hear_txt = 'crashing wood.';
            break;
        case ZT_LIGHTNING:
            new_doormask = D_BROKEN;
            see_txt = 'The door splinters!';
            hear_txt = 'crackling.';
            break;
        default:
            def_case = true;
            break;
        }
        if (def_case) {
 /* def_case: */
            let handled = false;
            if (exploding_wand_typ > 0) {
                /* Magical explosion from misc exploding wand */
                if (exploding_wand_typ === ONAMES.WAN_STRIKING) {
                    new_doormask = D_BROKEN;
                    see_txt = 'The door crashes open!';
                    sense_txt = 'feel a burst of cool air.';
                    handled = true;
                }
            }
            if (!handled) {
                if (see_it) {
                    /* "the door absorbs the blast" would be
                       inaccurate for an exploding wand since
                       other adjacent locations still get hit */
                    if (exploding_wand_typ)
                        await pline_The('door remains intact.');
                    else
                        await pline_The(`door absorbs ${yourzap ? 'your' : 'the'} ${zapverb}!`);
                } else
                    await You_feel('vibrations.');
            }
        }
        if (new_doormask >= 0) { /* door gets broken */
            if (in_rooms(x, y, SHOPBASE).length) {
                if (type >= 0) {
                    add_damage(x, y, SHOP_DOOR_COST);
                    shopdamage.v = true;
                } else /* caused by monster */
                    add_damage(x, y, 0);
            }
            lev.doormask = new_doormask;
            recalc_block_point(x, y); /* vision */
            if (see_it) {
                await pline(see_txt);
                newsym(x, y);
            } else if (sense_txt) {
                await You(sense_txt);
            } else if (hear_txt)
                await You_hear(hear_txt);
            if (picking_at(x, y)) {
                await stop_occupation();
                reset_pick();
            }
        }
    }

    if (OBJ_AT(x, y) && damgtype === ZT_FIRE)
        if (await burn_floor_objects(x, y, false, type > 0) && couldsee(x, y)) {
            newsym(x, y);
            await You(`${!Blind() ? 'see a puff' : 'smell a whiff'} of smoke.`);
        }
    if (!ignoremon && (mon = m_at(x, y)) != null)
        await wakeup(mon, (type >= 0) ? true : false);
    return rangemod;
}

// src/zap.c:4780 dobuzz(); sayhit/saymiss: report out of sight hit/miss
// events; forcemiss: an inexperienced monster wand user always misses.
// tmp_at(DISP_BEAM...) is the display_cmap_at/beam_cells pair below.
export async function dobuzz(type,     /* 0..29 (by hero) or -39..-10 (by monster) */
                             nd,       /* damage strength ('number of dice') */
                             sx, sy,   /* starting point */
                             dx, dy,   /* direction delta */
                             sayhit = true, saymiss = false, forcemiss = false) {
    let range;
    const fltyp = zaptype(type), damgtype = fltyp % 10;
    let lsx, lsy;
    let mon;
    let save_bhitpos;
    const shopdamage = { v: false };
    const fireball = (type === ZT_SPELL(ZT_FIRE)); /* set once */
    let gas_hit = false; /* will be set during each iteration */
    const otmp = { v: null };
    let spell_type;
    const hdmgtype = Hallucination() ? rn2(6) : damgtype;
    const beam_cells = [];

    /* if it's a hero spell then get its SPE_TYPE */
    spell_type = is_hero_spell(type) ? ONAMES.SPE_MAGIC_MISSILE + damgtype : 0;

    if (game.u.uswallow) {
        let tmp;

        if (type < 0)
            return;
        tmp = await zhitm(game.u.ustuck, type, nd, otmp);
        if (!game.u.ustuck) {
            game.u.uswallow = 0;
        } else {
            await pline(`${The(flash_str(fltyp, false))} rips into ${
                mon_nam(game.u.ustuck)}${exclam(tmp)}`);
            /* Using disintegration from the inside only makes a hole... */
            if (tmp === MAGIC_COOKIE)
                game.u.ustuck.mhp = 0;
            if (DEADMONSTER(game.u.ustuck))
                await killed(game.u.ustuck);
        }
        return;
    }
    if (type < 0)
        newsym(game.u.ux, game.u.uy);
    range = rn1(7, 7);
    if (dx === 0 && dy === 0)
        range = 1;
    save_bhitpos = { ...game.bhitpos };

    /* the C `goto buzzmonst` target: hit resolution against 'mon'; returns
       'break' when the C breaks out of the while loop */
    const buzzmonst = async () => {
        game.notonhead = (mon.mx !== game.bhitpos.x
                          || mon.my !== game.bhitpos.y);
        if (!forcemiss && zap_hit(find_mac(mon), spell_type)) {
            if (await mon_reflects(mon, null)) {
                if (cansee(mon.mx, mon.my)) {
                    await hit(flash_str(fltyp, false), mon, exclam(0));
                    await shieldeff(mon.mx, mon.my);
                    await mon_reflects(mon, 'But it reflects from %s %s!');
                    gas_hit = false;
                }
                dx = -dx;
                dy = -dy;
            } else {
                const mon_could_move = mon.mcanmove;
                const tmp = await zhitm(mon, type, nd, otmp);

                if (is_rider(mon.data)
                    && Math.abs(type) === ZT_BREATH(ZT_DEATH)) {
                    if (canseemon(mon)) {
                        await hit(flash_str(fltyp, false), mon, '.');
                        await pline(`${Monnam(mon)} disintegrates.`);
                        await pline(`${s_suffix(Monnam(mon))} body reintegrates before your ${
                            (eyecount(game.youmonst.data) === 1)
                                ? body_part(EYE)
                                : makeplural(body_part(EYE))}!`);
                        await pline(`${Monnam(mon)} resurrects!`);
                    }
                    mon.mhp = mon.mhpmax;
                    return 'break'; /* Out of while loop */
                }
                if (mon.data === game.mons[PMNAMES.PM_DEATH] && damgtype === ZT_DEATH) {
                    if (canseemon(mon)) {
                        await hit(flash_str(fltyp, false), mon, '.');
                        await pline(`${Monnam(mon)} absorbs the deadly ${
                            type === ZT_BREATH(ZT_DEATH) ? 'blast' : 'ray'}!`);
                        await pline('It seems even stronger than before.');
                    }
                    return 'break'; /* Out of while loop */
                }

                if (tmp === MAGIC_COOKIE) { /* disintegration */
                    await disintegrate_mon(mon, type, flash_str(fltyp, false));
                } else if (DEADMONSTER(mon)) {
                    if (type < 0) {
                        /* mon has just been killed by another monster */
                        await monkilled(mon, flash_str(fltyp, false), ATTKS.AD_RBRE);
                    } else {
                        let xkflags = XKILL_GIVEMSG; /* killed(mon); */

                        /* killed by hero; we know 'type' isn't negative;
                           if it's fire, highly flammable monsters leave
                           no corpse; don't bother reporting that they
                           "burn completely" -- unnecessary verbosity */
                        if (damgtype === ZT_FIRE
                            /* paper golem or straw golem */
                            && completelyburns(mon.data))
                            xkflags |= XKILL_NOCORPSE;
                        await xkilled(mon, xkflags);
                    }
                } else {
                    if (!otmp.v) {
                        /* normal non-fatal hit */
                        if (sayhit || canseemon(mon))
                            await hit(flash_str(fltyp, false), mon, exclam(tmp));
                    } else {
                        /* some armor was destroyed; no damage done */
                        if (canseemon(mon))
                            await pline(`${s_suffix(Monnam(mon))} ${
                                distant_name(otmp.v, xname)} is disintegrated!`);
                        m_useup(mon, otmp.v);
                    }
                    if (mon_could_move && !mon.mcanmove) /* ZT_SLEEP */
                        await slept_monst(mon);
                    if (damgtype !== ZT_SLEEP)
                        await wakeup(mon, (type >= 0) ? true : false);
                }
            }
            range -= 2;
        } else {
            if (saymiss
                || (canseemon(mon) && !disguised_as_non_mon(mon)))
                await miss(flash_str(fltyp, false), mon);
        }
        return null;
    };

    try {
        while (range-- > 0) {
            lsx = sx;
            sx += dx;
            lsy = sy;
            sy += dy;
            let make_bounce = false;
            if (!isok(sx, sy) || game.level.at(sx, sy).typ === STONE) {
                make_bounce = true;
            } else {
                mon = m_at(sx, sy);
                if (cansee(sx, sy)) {
                    /* reveal/unreveal invisible monsters before tmp_at() */
                    if (mon && !canspotmon(mon))
                        map_invisible(sx, sy);
                    else if (!mon)
                        unmap_invisible(sx, sy);
                    if (ZAP_POS(game.level.at(sx, sy).typ)
                        || (isok(lsx, lsy) && cansee(lsx, lsy))) {
                        display_cmap_at(zapdir_cmap(dx, dy), sx, sy,
                                        zap_colors[hdmgtype] ?? HI_ZAP, 'zap');
                        beam_cells.push([sx, sy]);
                    }
                    await game.animationFrame(); /* wait a little */
                }

                /* hit() and miss() need gb.bhitpos to match the target */
                game.bhitpos = { x: sx, y: sy };
                gas_hit = (damgtype === ZT_POISON_GAS);
                /* fireballs only damage when they explode; poison gas leaves
                   a trail of 1x1 clouds via zap_over_floor(), but that gets
                   skipped for a hit that is reflected so is deferred until we
                   know whether reflection is happening */
                if (!fireball && !gas_hit) {
                    range += await zap_over_floor(sx, sy, type, shopdamage, true, 0);
                    /* zap with fire -> melt ice -> drown monster, so monster
                       found and cached above might not be here any more */
                    mon = m_at(sx, sy);
                }

                if (mon) {
                    if (fireball)
                        break;
                    if (type >= 0)
                        mon.mstrategy &= ~STRAT_WAITMASK;
                    if (await buzzmonst() === 'break')
                        break;
                } else if (u_at(sx, sy) && range >= 0) {
                    nomul(0);
                    if (game.u.usteed && !rn2(3) && !(await mon_reflects(game.u.usteed, null))) {
                        mon = game.u.usteed;
                        if (await buzzmonst() === 'break')
                            break;
                    } else if (!forcemiss && zap_hit(game.u.uac, 0)) {
                        range -= 2;
                        await pline_dir(xytodir(-dx, -dy),
                                        `${The(flash_str(fltyp, false))} hits you!`);
                        if (Reflecting()) {
                            if (!Blind()) {
                                await ureflects('But %s reflects from your %s!', 'it');
                            } else
                                await pline('For some reason you are not affected.');
                            monstseesu(M_SEEN_REFL);
                            dx = -dx;
                            dy = -dy;
                            await shieldeff(sx, sy);
                            gas_hit = false;
                        } else {
                            /* flash_str here only used for killer; suppress
                             * hallucination */
                            await zhitu(type, nd, flash_str(fltyp, true), sx, sy);
                            monstunseesu(M_SEEN_REFL);
                        }
                    } else if (!Blind()) {
                        await pline(`${The(flash_str(fltyp, false))} whizzes by you!`);
                    } else if (damgtype === ZT_LIGHTNING) {
                        await Your(`${body_part(ARM)} tingles.`);
                    }
                    if (damgtype === ZT_LIGHTNING)
                        await flashburn(d(nd, 50), true);
                    await stop_occupation();
                    nomul(0);
                }
                /* gas that missed or that hit without being reflected will leave
                   a 1x1 cloud here; the earlier zap_over_floor() was deferred */
                if (gas_hit)
                    await zap_over_floor(sx, sy, type, shopdamage, true, 0);

                if (!ZAP_POS(game.level.at(sx, sy).typ)
                    || (closed_door(sx, sy) && range >= 0))
                    make_bounce = true;
            }

            if (make_bounce) {
                let bchance;

                bchance = (!isok(sx, sy) || game.level.at(sx, sy).typ === STONE) ? 10
                          : (In_mines(game.u.uz) && IS_WALL(game.level.at(sx, sy).typ)) ? 20
                            : 75;
                if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                    || fireball) {
                    if (Is_airlevel(game.u.uz)) { /* nothing to bounce off of */
                        await pline_The(`${flash_str(fltyp, false)} vanishes into the aether!`);
                        if (fireball)
                            type = ZT_WAND(ZT_FIRE); /* skip pending fireball */
                        break;
                    } else if (fireball) {
                        sx = lsx;
                        sy = lsy;
                        break; /* fireballs explode before the obstacle */
                    } else
                        await pline_The(`${flash_str(fltyp, false)} bounces!`);
                }
                const delta = { dx, dy };
                bounce_dir(sx, sy, delta, bchance);
                dx = delta.dx;
                dy = delta.dy;
                /* tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype)) */
            }
        }
    } finally {
        /* tmp_at(DISP_END, 0) */
        for (const [x, y] of beam_cells)
            newsym(x, y);
    }
    if (fireball)
        await explode(sx, sy, type, d(12, 6), 0, EXPL_FIERY);
    if (shopdamage.v)
        await pay_for_damage(damgtype === ZT_FIRE ? 'burn away'
                             : damgtype === ZT_COLD ? 'shatter'
                               /* "damage" indicates wall rather than door */
                               : damgtype === ZT_ACID ? 'damage'
                                 : damgtype === ZT_DEATH ? 'disintegrate'
                                   : 'destroy',
                             false);
    game.bhitpos = save_bhitpos;
}

export async function ubuzz(type, nd) {
    await dobuzz(type, nd, game.u.ux, game.u.uy, game.u.dx, game.u.dy);
}

/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys = (dmg) =>
    (game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
        ? Math.trunc((dmg + 1) / 2) : dmg;

// src/zap.c:3087 zap_steed(); returns True if the steed was hit
async function zap_steed(obj) /* wand or spell */
{
    let steedhit = false;

    game.bhitpos = { x: game.u.usteed.mx, y: game.u.usteed.my };
    game.notonhead = false;
    switch (obj.otyp) {
    /*
     * Wands that are allowed to hit the steed
     * Carefully test the results of any that are
     * moved here from the bottom section.
     */
    case ONAMES.WAN_PROBING:
        await probe_monster(game.u.usteed);
        learnwand(obj);
        steedhit = true;
        break;
    case ONAMES.WAN_TELEPORTATION:
    case ONAMES.SPE_TELEPORT_AWAY:
        /* you go together */
        await tele();
        /* same criteria as when unmounted (zapyourself) */
        if ((Teleport_control() && !Stunned()) || !couldsee(game.u.ux0, game.u.uy0)
            || distu(game.u.ux0, game.u.uy0) >= 16)
            learnwand(obj);
        steedhit = true;
        break;

    /* Default processing via bhitm() for these */
    case ONAMES.SPE_CURE_SICKNESS:
    case ONAMES.WAN_MAKE_INVISIBLE:
    case ONAMES.WAN_CANCELLATION:
    case ONAMES.SPE_CANCELLATION:
    case ONAMES.WAN_POLYMORPH:
    case ONAMES.SPE_POLYMORPH:
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
    case ONAMES.WAN_SLOW_MONSTER:
    case ONAMES.SPE_SLOW_MONSTER:
    case ONAMES.WAN_SPEED_MONSTER:
    case ONAMES.SPE_HEALING:
    case ONAMES.SPE_EXTRA_HEALING:
    case ONAMES.SPE_DRAIN_LIFE:
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK:
        await bhitm(game.u.usteed, obj);
        steedhit = true;
        break;

    default:
        steedhit = false;
        break;
    }
    return steedhit;
}

// src/zap.c:3219 zap_updown(); zapping a wand or spell up or down; returns
// True if the wand's identity should be disclosed
async function zap_updown(obj) {
    const u = game.u;
    let striking = false, disclose = false;
    let x, y, xx, yy;
    let ptmp;
    let otmp;
    let e;
    let ttmp;
    let stway = game.stairs;
    const Is_qstart = (uz) => {
        const q = game.special_levels?.qstart_level;
        return !!q && uz.dnum === q.dnum && uz.dlevel === q.dlevel;
    };

    /* some wands have special effects other than normal bhitpile */
    /* drawbridge might change <u.ux,u.uy> */
    x = xx = u.ux;     /* <x,y> is zap location */
    y = yy = u.uy;     /* <xx,yy> is drawbridge (portcullis) position */
    ttmp = t_at(x, y); /* trap if there is one */

    switch (obj.otyp) {
    case ONAMES.WAN_PROBING: {
        ptmp = 0;
        if (u.dz < 0) {
            await You(`probe towards the ${ceiling(x, y)}.`);
        } else { /* down */
            const terrain = game.level.at(x, y)?.typ;
            ptmp += await bhitpile(obj, bhito, x, y, u.dz);
            /* zap_map() updates lastseentyp[x][y] as a side-effect so
               we need to call it before probing for buried objects */
            await zap_map(x, y, obj);
            const surf = terrain === ICE || IS_FURNITURE(terrain)
                ? 'it' : `the ${surface(x, y)}`;
            await You(`probe beneath ${surf}.`);
            ptmp += await display_binventory(x, y, true);
        }
        if (!ptmp)
            await Your('probe reveals nothing.');
        return true; /* we've done our own bhitpile */
    }
    case ONAMES.WAN_OPENING:
    case ONAMES.SPE_KNOCK: {
        while (stway) {
            if (!stway.isladder && !stway.up
                && stway.tolev.dnum === u.uz.dnum)
                break;
            stway = stway.next;
        }
        /* up or down, but at closed portcullis only */
        const cc = { x: xx, y: yy };
        if (is_db_wall(x, y) && find_drawbridge(cc)) {
            xx = cc.x, yy = cc.y;
            await open_drawbridge(xx, yy);
            disclose = true;
        } else if (u.dz > 0 && stway && stway.sx === x && stway.sy === y
                   /* can't use the stairs down to quest level 2 until
                      leader "unlocks" them; give feedback if you try */
                   && Is_qstart(u.uz) && !ok_to_quest()) {
            await pline_The('stairs seem to ripple momentarily.');
            disclose = true;
        }
        /* down will release you from bear trap or web */
        if (u.dz > 0 && u.utrap) {
            const noticed = { v: disclose };
            await openholdingtrap(game.youmonst, noticed);
            disclose = noticed.v;
            /* down will trigger trapdoor, hole, or [spiked-] pit */
        } else if (u.dz > 0 && !u.utrap) {
            const noticed = { v: disclose };
            await openfallingtrap(game.youmonst, false, noticed);
            disclose = noticed.v;
        }
        break;
    }
    case ONAMES.WAN_STRIKING:
    case ONAMES.SPE_FORCE_BOLT:
        striking = true;
        /* FALLTHROUGH */
    case ONAMES.WAN_LOCKING:
    case ONAMES.SPE_WIZARD_LOCK: {
        /* down at open bridge or up or down at open portcullis */
        const cc = { x: xx, y: yy };
        if (((game.level.at(x, y).typ === DRAWBRIDGE_DOWN)
                 ? (u.dz > 0)
                 : (is_drawbridge_wall(x, y) >= 0 && !is_db_wall(x, y)))
            && find_drawbridge(cc)) {
            xx = cc.x, yy = cc.y;
            if (!striking)
                await close_drawbridge(xx, yy);
            else
                await destroy_drawbridge(xx, yy);
            disclose = true;
        } else if (striking && u.dz < 0 && rn2(3) && !Is_airlevel(u.uz)
                   && !Is_waterlevel(u.uz) && !Underwater()
                   && !Is_qstart(u.uz)) {
            let dmg;
            /* similar to zap_dig() */
            await pline(`A rock is dislodged from the ${ceiling(x, y)
                        } and falls on your ${body_part(HEAD)}.`);
            dmg = rnd(hard_helmet(u.uarmh) ? 2 : 6);
            await losehp(Maybe_Half_Phys(dmg), 'falling rock', KILLED_BY_AN);
            if ((otmp = mksobj_at(ONAMES.ROCK, x, y, false, false)) != null) {
                xname(otmp); /* set dknown, maybe bknown */
                stackobj(otmp);
            }
            newsym(x, y);
        } else if (u.dz > 0 && ttmp) {
            const noticed = { v: disclose };
            if (!striking && await closeholdingtrap(game.youmonst, noticed)) {
                disclose = noticed.v;
                ; /* now stuck in web or bear trap */
            } else if (striking && ttmp.ttyp === TRAPDOOR) {
                disclose = noticed.v;
                /* striking transforms trapdoor into hole */
                if (Blind() && !ttmp.tseen) {
                    await pline('Something beneath you shatters.');
                } else if (!ttmp.tseen) { /* => !Blind */
                    await pline("There's a trapdoor beneath you; it shatters.");
                } else {
                    await pline('The trapdoor beneath you shatters.');
                    disclose = true;
                }
                ttmp.ttyp = HOLE;
                ttmp.tseen = 1;
                newsym(x, y);
                /* might fall down hole */
                await dotrap(ttmp, NO_TRAP_FLAGS);
            } else if (!striking && ttmp.ttyp === HOLE) {
                disclose = noticed.v;
                /* locking transforms hole into trapdoor */
                ttmp.ttyp = TRAPDOOR;
                if (Blind() || !ttmp.tseen) {
                    await pline(`Some ${is_ice(x, y) ? 'frost' : 'dust'} swirls beneath you.`);
                } else {
                    ttmp.tseen = 1;
                    newsym(x, y);
                    await pline('A trapdoor appears beneath you.');
                    disclose = true;
                }
                /* hadn't fallen down hole; won't fall through trapdoor */
            } else {
                disclose = noticed.v;
            }
        }
        break;
    }
    case ONAMES.SPE_STONE_TO_FLESH: {
        if (Is_airlevel(u.uz) || Is_waterlevel(u.uz) || Underwater()
            || (Is_qstart(u.uz) && u.dz < 0)) {
            await pline(nothing_happens);
        } else if (u.dz < 0) { /* we should do more... */
            await pline(`Blood drips on your ${body_part(FACE)}.`);
        } else if (u.dz > 0 && !OBJ_AT(u.ux, u.uy)) {
            /*
            Print this message only if there wasn't an engraving
            affected here.  If water or ice, act like waterlevel case.
            */
            e = engr_at(u.ux, u.uy);
            if (!(e && e.engr_type === ENGRAVE)) {
                if (is_pool(u.ux, u.uy) || is_ice(u.ux, u.uy))
                    await pline(nothing_happens);
                else
                    await pline(`Blood ${is_lava(u.ux, u.uy) ? 'boils' : 'pools'} ${
                        Levitation() ? 'beneath' : 'at'} your ${
                        makeplural(body_part(FOOT))}.`);
            }
        }
        break;
    }
    default:
        break;
    }

    if (u.dz > 0) {
        /* zapping downward */
        await bhitpile(obj, bhito, x, y, u.dz);

        /* zap_map might have been called by bhitpile(); if so,
           don't call it again (map_zapped is always False in the C) */
        await zap_map(x, y, obj);
    } else if (u.dz < 0) {
        /* zapping upward */

        /* game flavor: if you're hiding under "something"
         * a zap upward should hit that "something".
         */
        if (u.uundetected && hides_under(game.youmonst.data)) {
            let hitit = 0;

            otmp = (game.level.objects || []).find(
                (o) => o.ox === u.ux && o.oy === u.uy) || null;
            if (otmp)
                hitit = await bhito(otmp, obj);
            if (hitit) {
                hideunder(game.youmonst);
                disclose = true;
            }
        }
    }

    return disclose;
}

// src/zap.c:3431 weffects()
export async function weffects(obj) {
    const otyp = obj.otyp;
    let disclose = false;
    const was_unkn = !game.objects[otyp].oc_name_known;

    exercise(A_WIS, true);
    if (game.u.usteed && (game.objects[otyp].oc_dir !== NODIR) && !game.u.dx && !game.u.dy
        && (game.u.dz > 0) && await zap_steed(obj)) {
        disclose = true;
    } else if (game.objects[otyp].oc_dir === IMMEDIATE) {
        zapsetup(); /* reset obj_zapped */
        if (game.u.uswallow) {
            await bhitm(game.u.ustuck, obj);
            /* [how about `bhitpile(u.ustuck->minvent)' effect?] */
        } else if (game.u.dz) {
            disclose = await zap_updown(obj);
        } else {
            await bhit(game.u.dx, game.u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito,
                       { obj });
        }
        await zapwrapup(); /* give feedback for obj_zapped */

    } else if (game.objects[otyp].oc_dir === NODIR) {
        await zapnodir(obj);

    } else {
        /* neither immediate nor directionless */

        if (otyp === ONAMES.WAN_DIGGING || otyp === ONAMES.SPE_DIG) {
            const { zap_dig } = await import('./dig.js');
            await zap_dig();
        } else if (otyp >= ONAMES.SPE_MAGIC_MISSILE && otyp <= ONAMES.SPE_FINGER_OF_DEATH)
            await ubuzz(BZ_U_SPELL(BZ_OFS_SPE(otyp)), Math.trunc(game.u.ulevel / 2) + 1);
        else if (otyp >= ONAMES.WAN_MAGIC_MISSILE && otyp <= ONAMES.WAN_LIGHTNING)
            await ubuzz(BZ_U_WAND(BZ_OFS_WAN(otyp)),
                        (otyp === ONAMES.WAN_MAGIC_MISSILE) ? 2 : 6);
        else
            ; /* impossible("weffects: unexpected spell or wand") */
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced(0, 10);
    }
    return;
}

// src/zap.c:3480 spell_damage_bonus(); augment damage for a spell based on
// the hero's intelligence (and level)
function spell_damage_bonus(dmg) /* base amount to be adjusted by bonus or penalty */
{
    const intell = ACURR(A_INT);

    /* Punish low intelligence before low level else low intelligence
       gets punished only when high level */
    if (intell <= 9) {
        /* -3 penalty, but never reduce combined amount below 1
           (if dmg is 0 for some reason, we're careful to leave it there) */
        if (dmg > 1)
            dmg = (dmg <= 3) ? 1 : dmg - 3;
    } else if (intell <= 13 || game.u.ulevel < 5)
        ; /* no bonus or penalty; dmg remains same */
    else if (intell <= 18)
        dmg += 1;
    else if (intell <= 24 || game.u.ulevel < 14)
        dmg += 2;
    else
        dmg += 3; /* Int 25 */

    return dmg;
}

// src/zap.c:3509 spell_hit_bonus(); the to-hit bonus for a spell, based on
// the hero's skill in spell class and dexterity
function spell_hit_bonus(skill) {
    let hit_bon = 0;
    const dex = ACURR(A_DEX);

    switch (P_SKILL(spell_skilltype(skill))) {
    case P_ISRESTRICTED:
    case P_UNSKILLED:
        hit_bon = -4;
        break;
    case P_BASIC:
        hit_bon = 0;
        break;
    case P_SKILLED:
        hit_bon = 2;
        break;
    case P_EXPERT:
        hit_bon = 3;
        break;
    }

    if (dex < 4)
        hit_bon -= 3;
    else if (dex < 6)
        hit_bon -= 2;
    else if (dex < 8)
        hit_bon -= 1;
    else if (dex < 14)
        /* Will change when print stuff below removed */
        hit_bon -= 0;
    else
        /* Even increment for dexterous heroes (see weapon.c abon) */
        hit_bon += dex - 14;

    return hit_bon;
}

// src/zap.c:2605 backfire(); a cursed wand explodes in the hero's face
async function backfire(otmp) {
    let dmg;

    otmp.in_use = true; /* in case losehp() is fatal */
    await pline(`${The(xname(otmp))} suddenly explodes!`);
    dmg = d(otmp.spe + 2, 6);
    const { losehp } = await import('./hack.js');
    await losehp(Maybe_Half_Phys(dmg), 'exploding wand', KILLED_BY_AN);
    useupall(otmp);
}

// src/zap.c:2627 dozap() — the 'z' command.
export async function dozap() {
    let obj;
    let damage, need_dir;

    if (nohands(game.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    const { check_capacity } = await import('./hack.js');
    if (await check_capacity(null))
        return ECMD_OK;
    obj = await getobj('zap', zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    const { check_unpaid } = await import('./shk.js');
    await check_unpaid(obj);

    need_dir = game.objects[obj.otyp].oc_dir !== NODIR;
    if (!(await zappable(obj))) {
        await pline(nothing_happens);
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        await backfire(obj); /* the wand blows up in your face! */
        exercise(A_STR, false);
        /* 'obj' is gone; skip update_inventory() because
           backfire() -> useupall() -> freeinv() did it */
        return ECMD_TIME;
    } else if (need_dir && !(await getdir(null))) {
        if (!Blind())
            await pline(`${The(xname(obj))} glows and fades.`);
        /* make him pay for knowing !NODIR */
    } else if (need_dir && !game.u.dx && !game.u.dy && !game.u.dz) {
        if ((damage = await zapyourself(obj, true)) !== 0) {
            const buf = `zapped ${uhim()}self with ${killer_xname(obj)}`;
            const { losehp } = await import('./hack.js');
            await losehp(Maybe_Half_Phys(damage), buf, NO_KILLER_PREFIX);
        }
    } else {
        /*      Are we having fun yet?
         * weffects -> buzz(obj->otyp) -> zhitm (temple priest) ->
         * attack -> hitum -> known_hitum -> ghod_hitsu ->
         * buzz(AD_ELEC) -> destroy_items(AD_ELEC) ->
         * useup -> obfree -> dealloc_obj -> free(obj)
         */
        game.current_wand = obj;
        await weffects(obj);
        obj = game.current_wand;
        game.current_wand = null;
    }
    if (obj && obj.spe < 0) {
        await pline(`${Tobjnam(obj, 'turn')} to dust.`);
        useupall(obj); /* calls freeinv() -> update_inventory() */
    } else
        update_inventory(); /* maybe used a charge */
    return ECMD_TIME;
}

// src/zap.c:3827 bhit(); walk a missile, beam or flash along a line.
export async function bhit(ddx, ddy, range,  /* direction and range */
                           weapon,          /* defined in hack.h */
                           fhitm, fhito,    /* fns called when mon/obj hit */
                           pobj)            /* { obj } tossed/used; obj set to
                                             * null if object is destroyed */
{
    let mtmp, result = null;
    let obj = pobj.obj;
    let ttmp;
    let typ;
    let shopdoor = false, point_blank = true;
    let in_skip = false, allow_skip = false;
    let tethered_weapon = false;
    const skip = { start: 0, end: 0 };
    let skipcount = 0;
    const was_returning = (game.iflags?.returning_missile === obj) ? obj : null;
    let bhit_done = false;

    if (weapon === KICKED_WEAPON) {
        /* object starts one square in front of player */
        game.bhitpos = { x: game.u.ux + ddx, y: game.u.uy + ddy };
        range--;
    } else {
        game.bhitpos = { x: game.u.ux, y: game.u.uy };
    }

    if (weapon === THROWN_WEAPON && obj && obj.otyp === ONAMES.ROCK) {
        skiprange(range, skip);
        allow_skip = !rn2(3);
    }

    /* tmp_at(DISP_BEAM|DISP_TETHER|DISP_FLASH, ...): the flash beam retains
       each '!' until the walk ends; a thrown object is painted at its current
       square.  obj_to_glyph() with rn2_on_display_rng happens once, here. */
    let flightGlyph = null;
    if (weapon === FLASHED_LIGHT) {
        ;
    } else if (weapon === THROWN_TETHERED_WEAPON && obj) {
        tethered_weapon = true;
        weapon = THROWN_WEAPON; /* simplify 'if's that follow below */
        flightGlyph = temporary_object_glyph(obj);
    } else if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM)
        flightGlyph = obj ? temporary_object_glyph(obj) : null;
    let flightPos = null;
    const flashCells = [];
    const endFlight = () => { /* tmp_at(DISP_END, 0) for the flight glyph */
        if (flightPos) {
            newsym(flightPos.x, flightPos.y);
            flightPos = null;
        }
    };

    while (range-- > 0) {
        let x, y;
        let xyglyph;

        game.bhitpos.x += ddx;
        game.bhitpos.y += ddy;
        x = game.bhitpos.x;
        y = game.bhitpos.y;

        if (!isok(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }

        if (is_pick(obj) && inside_shop(x, y)
            && (mtmp = await shkcatch(obj, x, y)) != null) {
            endFlight();
            result = mtmp;
            bhit_done = true;
            break;
        }

        typ = game.level.at(x, y).typ;

        /* WATER aka "wall of water" stops items */
        if (IS_WATERWALL(typ) || typ === LAVAWALL) {
            if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                break;
        }

        /* iron bars will block anything big enough and break some things */
        if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON) {
            if (obj.lamplit && !Blind())
                await show_transient_light(obj, x, y);
            if (typ === IRONBARS
                && await hits_bars(pobj, x - ddx, y - ddy, x, y,
                                   point_blank ? 0 : !rn2(5), 1)) {
                /* caveat: obj might now be null... */
                obj = pobj.obj;  /* not currently needed due to 'break'; keep */
                game.bhitpos.x -= ddx;
                game.bhitpos.y -= ddy;
                break;
            }
        } else if (weapon === FLASHED_LIGHT) {
            if (!Blind())
                await show_transient_light(null, x, y);
        }

        if (weapon === ZAPPED_WAND) {
            /* cancellation/opening/locking/striking/probing */
            await zap_map(x, y, obj);
            /* terrain might have changed (exposed secret door|corridor) */
            typ = game.level.at(x, y).typ;
        }

        mtmp = m_at(x, y);
        ttmp = t_at(x, y);
        if (!mtmp && ttmp && (ttmp.ttyp === WEB)
            && (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
            && !rn2(3)) {
            if (cansee(x, y)) {
                await pline(`${Yname2(obj)} gets stuck in a web!`);
                ttmp.tseen = true;
                newsym(x, y);
            }
            if (was_returning)
                game.iflags.returning_missile = null;
            break;
        }

        /*
         * skipping rocks
         *
         * skiprange_start is only set if this is a thrown rock
         */
        if (skip.start && (range === skip.start) && allow_skip) {
            if (is_pool(x, y) && !mtmp) {
                in_skip = true;
                if (!Blind())
                    await pline(`${Yname2(obj)} ${otense(obj, 'skip')}${
                        skipcount ? ' again' : ''}.`);
                else
                    await You_hear(`${yname(obj)} skip.`);
                skipcount++;
            } else if (skip.start > skip.end + 1) {
                --skip.start;
            }
        }
        if (in_skip) {
            if (range <= skip.end) {
                in_skip = false;
                if (range > 3) /* another bounce? */
                    skiprange(range, skip);
            } else if (mtmp && M_IN_WATER(mtmp.data)) {
                if (!Blind() && canspotmon(mtmp))
                    await pline(`${Yname2(obj)} ${otense(obj, 'pass')} over ${
                        mon_nam(mtmp)}.`);
                mtmp = null;
            }
        }

        /* if mtmp is a shade and missile passes harmlessly through it,
           give message and skip it in order to keep going;
           if attack is light and mtmp is a mimic pretending to be an
           object, behave as if there is no monster here (if pretending
           to be furniture, it will be revealed by flash_hits_mon());
           thrown objects don't hit mimics pretending to be objects (both
           because the hero is likely aiming to throw over what seems to
           be an object rather than at it, and for balance because
           otherwise mimics are too easy to identify by throwing gold at
           them); exception: if the hero knows there is a monster there,
           they will be aiming at the monster */
        xyglyph = glyph_at(x, y);
        if (mtmp && (((weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
                      && (await shade_miss(game.youmonst, mtmp, obj, true, true)
                          || (M_AP_TYPE(mtmp) === M_AP_OBJECT
                              && xyglyph.kind !== 'mon'
                              && xyglyph.kind !== 'warn'
                              && xyglyph.kind !== 'invis')))
                     || (weapon === FLASHED_LIGHT
                         && M_AP_TYPE(mtmp) === M_AP_OBJECT)))
            mtmp = null;

        if (mtmp) {
            game.notonhead = (x !== mtmp.mx || y !== mtmp.my);
            if (weapon === FLASHED_LIGHT) {
                /* FLASHED_LIGHT hitting invisible monster should pass
                   through instead of stop so we call flash_hits_mon()
                   directly rather than returning mtmp back to caller.
                   That allows the flash to keep on going.  Note that we
                   use mtmp->minvis, not canspotmon(), because it makes no
                   difference whether hero can see the monster or not. */
                if (mtmp.minvis) {
                    obj.ox = game.u.ux, obj.oy = game.u.uy;
                    const { flash_hits_mon } = await import('./uhitm.js');
                    await flash_hits_mon(mtmp, obj);
                } else {
                    result = mtmp; /* caller will call flash_hits_mon() */
                    bhit_done = true;
                    break;
                }
            } else if (weapon === INVIS_BEAM) {
                /* Like FLASHED_LIGHT, INVIS_BEAM should continue
                   through invisible targets; unlike it, we aren't
                   prepared for multiple hits so just get first one
                   that's either visible or could see its invisible
                   self.  [No tmp_at() cleanup is needed here.] */
                if (!mtmp.minvis || perceives(mtmp.data)) {
                    result = mtmp;
                    bhit_done = true;
                    break;
                }
            } else if (weapon !== ZAPPED_WAND) {
                /* THROWN_WEAPON, KICKED_WEAPON */
                if (!tethered_weapon)
                    endFlight();

                if (cansee(x, y) && !canspotmon(mtmp))
                    map_invisible(x, y);
                result = mtmp;
                bhit_done = true;
                break;
            } else {
                /* ZAPPED_WAND */
                if (await fhitm(mtmp, obj)) {
                    result = mtmp;
                    bhit_done = true;
                    break;
                }
                range -= 3;
            }
        } else {
            if (weapon === ZAPPED_WAND && obj.otyp === ONAMES.WAN_PROBING
                && glyph_is_invisible_at(x, y)) {
                unmap_object(x, y);
                newsym(x, y);
            }
        }
        if (fhito) {
            if (await bhitpile(obj, fhito, x, y, 0))
                range--;
        } else {
            if (weapon === KICKED_WEAPON
                && ((obj.oclass === OCLASSES.COIN_CLASS && OBJ_AT(x, y))
                    || await ship_object(obj, x, y, costly_spot(x, y)))) {
                endFlight();
                bhit_done = true;
                break; /* result == (struct monst *) 0 */
            }
        }
        if (weapon === ZAPPED_WAND && (IS_DOOR(typ) || typ === SDOOR)) {
            switch (obj.otyp) {
            case ONAMES.WAN_OPENING:
            case ONAMES.WAN_LOCKING:
            case ONAMES.WAN_STRIKING:
            case ONAMES.SPE_KNOCK:
            case ONAMES.SPE_WIZARD_LOCK:
            case ONAMES.SPE_FORCE_BOLT:
                if (await doorlock(obj, x, y)) {
                    if (cansee(x, y) || (obj.otyp === ONAMES.WAN_STRIKING && !Deaf()))
                        learnwand(obj);
                    if (game.level.at(x, y).doormask === D_BROKEN
                        && in_rooms(x, y, SHOPBASE).length) {
                        shopdoor = true;
                        add_damage(x, y, SHOP_DOOR_COST);
                    }
                }
                break;
            }
        }
        if (!ZAP_POS(typ) || closed_door(x, y)) {
            game.bhitpos.x -= ddx;
            game.bhitpos.y -= ddy;
            break;
        }
        if (weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM) {
            /* 'I' present but no monster: erase; do this before tmp_at() */
            if (glyph_is_invisible_at(x, y) && cansee(x, y)) {
                unmap_object(x, y);
                newsym(x, y);
            }
            /* tmp_at(x, y); nh_delay_output(); */
            if (weapon === FLASHED_LIGHT) {
                display_cmap_at(cmap_names.S_flashbeam, x, y, CLR_WHITE,
                                'camera-flash');
                flashCells.push([x, y]);
                if (game.animationFrame) {
                    await flush_screen(0);
                    await game.animationFrame();
                }
            } else if (flightGlyph) {
                endFlight();
                if (cansee(x, y)) {
                    display_object_at(obj, x, y, flightGlyph);
                    flightPos = { x, y };
                }
                if (game.animationFrame)
                    await game.animationFrame();
            }
            /* kicked objects fall in pools */
            if ((weapon === KICKED_WEAPON) && is_pool_or_lava(x, y))
                break;
            if (IS_SINK(typ) && weapon !== FLASHED_LIGHT)
                break; /* physical objects fall onto sink */
        }
        /* limit range of ball so hero won't make an invalid move */
        if (weapon === THROWN_WEAPON && range > 0
            && obj.otyp === ONAMES.HEAVY_IRON_BALL) {
            let bobj;
            let t;

            if ((bobj = sobj_at(ONAMES.BOULDER, x, y)) != null) {
                if (cansee(x, y))
                    await pline(`${The(distant_name(obj, xname))} hits ${
                        an(xname(bobj))}.`);
                range = 0;
            } else if (obj === game.u.uball) {
                if (!(await test_move(x - ddx, y - ddy, ddx, ddy, TEST_MOVE))) {
                    /* nb: it didn't hit anything directly */
                    if (cansee(x, y))
                        await pline(`${The(distant_name(obj, xname))} jerks to an abrupt halt.`); /* lame */
                    range = 0;
                } else if (Sokoban() && (t = t_at(x, y)) != null
                           && (is_pit(t.ttyp) || is_hole(t.ttyp))) {
                    /* hero falls into the trap, so ball stops */
                    range = 0;
                }
            }
        }

        /* thrown/kicked missile has moved away from its starting spot */
        point_blank = false; /* affects passing through iron bars */
    }

    if (!bhit_done) {
        if ((weapon !== ZAPPED_WAND && weapon !== INVIS_BEAM && !tethered_weapon)
            || (was_returning && was_returning !== game.iflags?.returning_missile))
            endFlight();

        if (shopdoor)
            await pay_for_damage('destroy', false);
    }

 /* bhit_done: */
    endFlight();
    for (const [fx, fy] of flashCells)
        newsym(fx, fy);
    /* note: for FLASHED_LIGHT, _caller_ must call transient_light_cleanup()
       after possibly calling flash_hits_mon() */
    if (weapon === THROWN_WEAPON || weapon === KICKED_WEAPON)
        await transient_light_cleanup();

    return result;
}

// src/zap.c:3556 hit() / :3571 miss() — the missile/zap contact messages.
export async function hit(str, mtmp, force) {
    const verbosely = (mtmp === game.youmonst
                       || (game.flags.verbose
                           && (cansee(game.bhitpos?.x, game.bhitpos?.y)
                               || canspotmon(mtmp) || engulfing_u(mtmp))));

    await pline(`${The(str)} ${vtense(str, 'hit')} `
                + `${verbosely ? mon_nam(mtmp) : 'it'}${force}`);
}

export async function miss(str, mtmp) {
    await pline(`${The(str)} ${vtense(str, 'miss')} `
                + `${((cansee(game.bhitpos?.x, game.bhitpos?.y)
                       || canspotmon(mtmp)) && game.flags.verbose)
                    ? mon_nam(mtmp) : 'it'}.`);
}

// src/zap.c:56 ZT_SPELL(), zap type offset for damage from a monster spell.
export const ZT_SPELL = (x) => 10 + x;

// src/zap.c:5501 mon_spell_hits_spot(), what a monster's spell does to the
// spot it hits: clobber an engraving, then zap_over_floor().
export async function mon_spell_hits_spot(caster, adtyp, x, y) {
    /* a magic missile or acid spell hitting an engraved spot will
       thoroughly clobber an engraving (unless its type makes it be
       scuff-protected); zap_over_floor() doesn't handle this */
    if (adtyp === ATTKS.AD_MAGM || adtyp === ATTKS.AD_ACID) {
        const ep = engr_at(x, y);
        const etext = ep ? ep.engr_txt : null;

        if (etext)
            wipe_engr_at(x, y, etext.length + d(6, 6), true);
        /* the hero won't notice the damage until the engraving
           is re-examined (lookhere or move off and back on) */
    }

    /* accept any basic damage type that zap_over_floor() might handle */
    if (adtyp >= ATTKS.AD_MAGM && adtyp <= ATTKS.AD_ACID) {
        const zt_typ = adtyp - 1,            /* convert AD_xxxx to ZT_xxxx */
            zapdmgtyp = -ZT_SPELL(zt_typ); /* damage is from monster spell */

        await zap_over_floor(x, y, zapdmgtyp, true);
    } /* else impossible("Unsupported damage type (%d) for mon_spell_hits_spot.") */
}

// src/zap.c:5537 fracture_rock(), a boulder or statue turns into rocks.
export async function fracture_rock(obj) /* no texts here! */
{
    const cc = { x: 0, y: 0 };
    const by_you = !game.context?.mon_moving;

    if (by_you && get_obj_location(obj, cc, 0) && costly_spot(cc.x, cc.y)) {
        const shkpp = { shkp: null };
        const objroom = (in_rooms(cc.x, cc.y, SHOPBASE) || '\0').charCodeAt(0);

        if (billable(shkpp, obj, objroom, false)) {
            /* shop message says "you owe <shk> <$> for it!" so we need
               to precede that with a message explaining what "it" is */
            await You(`fracture ${s_suffix(shkname(shkpp.shkp))} ${xname(obj)}.`);
            /* breakobj() calls stolen_value(), which handles shop charges */
            await breakobj(obj, cc.x, cc.y, true, false);
        }
    }

    if (by_you && obj.otyp === ONAMES.BOULDER)
        await sokoban_guilt();

    obj.otyp = ONAMES.ROCK;
    obj.oclass = OCLASSES.GEM_CLASS;
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.dknown = obj.bknown = obj.rknown = 0;
    obj.known = game.objects[obj.otyp].oc_uses_known ? 0 : 1;
    obj.oextra = null; /* dealloc_oextra(obj) */

    if (obj.where === OBJ_FLOOR) {
        obj_extract_self(obj); /* move rocks back on top */
        place_object(obj, obj.ox, obj.oy);
        if (!does_block(obj.ox, obj.oy, game.level.at(obj.ox, obj.oy))) {
            unblock_point(obj.ox, obj.oy);
            /* immediately update the display, in case this fracturing was
               caused by a zap that is about hit more things */
            vision_recalc(0);
        }
        if (cansee(obj.ox, obj.oy))
            newsym(obj.ox, obj.oy);
    }
}

// src/zap.c:5582 break_statue(), a statue shatters; false when a statue
// trap animated it instead.
export async function break_statue(obj) {
    /* [obj is assumed to be on floor, so no get_obj_location() needed] */
    const trap = t_at(obj.ox, obj.oy);
    let item;
    const by_you = !game.context?.mon_moving;

    if (trap && trap.ttyp === STATUE_TRAP
        && await activate_statue_trap(trap, obj.ox, obj.oy, true))
        return false;
    /* drop any objects contained inside the statue */
    while ((item = (obj.cobj || [])[0]) != null) {
        obj_extract_self(item);
        place_object(item, obj.ox, obj.oy);
    }
    if (by_you && Role_if(PMNAMES.PM_ARCHEOLOGIST)
        && (obj.spe & CORPSTAT_HISTORIC)) {
        await You_feel('guilty about damaging such a historic statue.');
        adjalign(-1);
    }
    obj.spe = 0;
    await fracture_rock(obj);
    return true;
}

// src/zap.c:3017 ubreatheu(); hero breathes at own location (can't hit
// anyone else)
export async function ubreatheu(mattk) {
    const dtyp = 20 + mattk[1] - 1;      /* breath by hero */

    await zhitu(dtyp, mattk[2], flash_str(dtyp, true), game.u.ux, game.u.uy);
}

// src/zap.c:3026 lightdamage(), a light-hating hero (gremlin) is hurt by a
// flash; returns the damage (0 when unaffected).
export async function lightdamage(obj, ordinary, amt) {
    let buf;
    let how;
    let dmg = amt;

    if (dmg && game.youmonst.data.pmidx === PMNAMES.PM_GREMLIN) {
        /* reduce high values (from destruction of wand with many charges) */
        dmg = rnd(dmg);
        if (dmg > 10)
            dmg = 10 + rnd(dmg - 10);
        if (dmg > 20)
            dmg = 20;
        await pline(`Ow, that light hurts${(dmg > 2 || game.u.mh <= 5) ? '!' : '.'}`);
        /* [composing killer/reason is superfluous here; if fatal, cause
           of death will always be "killed while stuck in creature form"] */
        if (obj.oclass === OCLASSES.SCROLL_CLASS || obj.oclass === OCLASSES.SPBOOK_CLASS)
            ordinary = false; /* say blasted rather than zapped */
        how = (obj.oclass === OCLASSES.SPBOOK_CLASS) ? 'spell of light'
              : (!obj.oartifact) ? ansimpleoname(obj)
                : bare_artifactname(obj);
        buf = `${ordinary ? 'zapped' : 'blasted'} ${uhim()}self with ${how}`;
        await losehp(Maybe_Half_Phys_zap(dmg), buf, NO_KILLER_PREFIX);
    }
    return dmg;
}
/* include/hack.h:1236 Maybe_Half_Phys() */
const Maybe_Half_Phys_zap = (dmg) =>
    (!!(game.u.intrinsic?.HHalf_physical_damage || game.u.uprops?.HALF_PHDAM)
     ? Math.trunc((dmg + 1) / 2) : dmg);

// src/zap.c:4765 buzz(), a ray that reports hits but not misses and
// never forces a miss.
export async function buzz(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, false);
}
/* include/obj.h:340 SchroedingersBox() */
const SchroedingersBox = (o) => (o.otyp === ONAMES.LARGE_BOX && o.spe === 1);

// src/zap.c:612 probe_objchain()
export function probe_objchain(otmp) {
    for (const o of otmp || []) {
        observe_object(o); /* treat as "seen" */
        if (Is_container(o) || o.otyp === ONAMES.STATUE) {
            o.lknown = 1;
            if (!SchroedingersBox(o))
                o.cknown = 1;
        } else if (o.otyp === ONAMES.TIN)
            o.known = 1;
    }
}

// src/zap.c:626 probe_monster()
export async function probe_monster(mtmp) {
    await mstatusline(mtmp);
    if (game.notonhead)
        return; /* don't show minvent for long worm tail */

    if (mtmp.minvent && mtmp.minvent.length) {
        probe_objchain(mtmp.minvent);
        await display_minventory(mtmp, MINV_ALL | MINV_NOLET | PICK_NONE, null);
    } else {
        await pline(`${noit_Monnam(mtmp)} is not carrying anything${
            engulfing_u(mtmp) ? ' besides you' : ''}.`);
    }
}
