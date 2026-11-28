// zap.js -- zapping wands.
// C ref: zap.c
//
// Ported so far: the #zap command (dozap(), zap_ok(), zappable(),
// backfire()), learnwand(), zapyourself() (the cases sessions reach),
// zapnodir() (subset), zapsetup()/zapwrapup(), weffects() (IMMEDIATE
// wands go through bhit() in dothrow.js; rays and digging aren't ported
// yet).  For enlightenment: adtyp_to_prop(), u_adtyp_resistance_obj(),
// item_what().

import { rndmonnam } from './do_name.js';
import { adjalign } from './attrib.js';
import { PM_ARCHEOLOGIST } from './monsters.js';
import { obj_extract_self, place_object, level_objects_at, fixup_oil } from './mkobj.js';
import { sokoban_guilt } from './trap.js';
import { breakobj } from './dothrow.js';
import { shkname } from './shknam.js';
import { SHOPBASE, Role_if, CORPSTAT_HISTORIC } from './const.js';
import { in_rooms } from './hack.js';
import { billable, get_obj_location } from './shk.js';
import { impossible } from './hack.js';
import { game } from './gstate.js';
import { livelog_printf, urgent_pline, You_hear as You_hear_zp,
         You_hear } from './display.js';
import { LL_CONDUCT } from './const.js';
import { You, Your, pline, pline_The, pline_dir, pline_mon } from './display.js';
import { getobj, useupall } from './invent.js';
import { check_capacity } from './hack.js';
import { xytodir } from './hack.js';
import { rn2, rnd, rn1, d } from './rng.js';
import { getdir } from './cmd.js';
import { exercise } from './attrib.js';
import { losehp, Maybe_Half_Phys } from './trap.js';
import { more_experienced } from './exper.js';
import { observe_object, discover_object } from './o_init.js';
import { The, xname, Tobjnam, vtense, cloak_simple_name, suit_simple_name,
         helm_simple_name, gloves_simple_name, boots_simple_name,
         shirt_simple_name, shield_simple_name,
         simple_typename } from './objnam.js';
import { mon_nam } from './do_name.js';
import { resists_blnd, resists_blnd_by_arti, nohands, is_mplayer, is_whirly,
         mindless, digests, is_rider, eyecount,
         breathless } from './mondata.js';
import { make_blinded } from './potion.js';
import { body_part } from './insight.js';
import { ARM, POLY_NOFLAGS } from './const.js';
import { polyself } from './polyself.js';
import { fall_asleep } from './timeout.js';
import { monstseesu, monstunseesu } from './uhitm.js';
import { bhit } from './dothrow.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS, ECMD_OK,
         ECMD_CANCEL, ECMD_TIME, WAND_BACKFIRE_CHANCE, WAND_WREST_CHANCE,
         A_STR, A_WIS, KILLED_BY_AN, SLEEP_RES, M_SEEN_SLEEP,
         ZAPPED_WAND } from './const.js';
import { objects, WAND_CLASS, SPBOOK_CLASS, DWARVISH_CLOAK, NODIR, IMMEDIATE,
         WAN_SLEEP, SPE_SLEEP, WAN_NOTHING, WAN_OPENING, WAN_LOCKING,
         WAN_STASIS, WAN_CREATE_MONSTER, WAN_WISHING, WAN_ENLIGHTENMENT,
         WAN_LIGHT, WAN_SECRET_DOOR_DETECTION, WAN_DIGGING, SPE_DIG,
         WAN_MAGIC_MISSILE, WAN_LIGHTNING, SPE_MAGIC_MISSILE,
         SPE_FINGER_OF_DEATH, SPE_FORCE_BOLT, WAN_STRIKING, BOULDER,
         WAN_CANCELLATION, SPE_CANCELLATION, SPE_KNOCK, SPE_WIZARD_LOCK,
         WAN_PROBING, SchroedingersBox, Is_box,
         Is_container as Is_container_bm, is_weptool as is_weptool_ci,
         is_weptool as is_weptool_di, is_rustprone, is_crackable,
         is_corrodeable } from './objects.js';
import { PIT, SPIKED_PIT, STATUE_TRAP, HEADSTONE, DOOR, DBWALL,
         DB_DIR, DB_NORTH, DB_SOUTH, DB_EAST, DB_WEST, IS_DRAWBRIDGE,
         isok } from './const.js';
import { t_at, activate_statue_trap, trap_ice_effects } from './trap.js';
import { sobj_at, is_pool, is_lava } from './makemon.js';
import { delobj } from './invent.js';
import { addtobill, stolen_value } from './shk.js';
import { makemon } from './makemon.js';
import { a_monnam } from './do_name.js';
import { IRON, METAL, MITHRIL, COPPER, SILVER, PLATINUM, GEMSTONE,
         FLESH, WOOD, LEATHER, CLOTH, BONE, GOLD, GLASS, PAPER } from './objects.js';
import { MM_NOMSG, G_GENOD } from './const.js';
import * as M from './monsters.js';
import { mons } from './monsters.js';
import { mkobj, splitobj, weight, rnd_class, erosion_matters, is_flammable,
         is_rottable, is_damageable, is_poisonable } from './mkobj.js';
import { obj_resists } from './dogmove.js';
import { cansee, does_block, block_point, unblock_point } from './vision.js';
import { newsym, shieldeff } from './display.js';
import { costly_spot, shop_keeper, contained_cost, inhishop, make_angry_shk, hot_pursuit } from './shk.js';
import { Shknam } from './shknam.js';
import { Norep } from './display.js';
import { add_damage as add_damage_zp, pay_for_damage as pay_for_damage_zp } from './shk.js';
import { SHOP_DOOR_COST as SHOP_DOOR_COST_ZP, SHOP_BARS_COST as SHOP_BARS_COST_ZP } from './const.js';
import { LARGEST_INT, MAX_SPELL_STUDY, Has_contents } from './const.js';
import { STRANGE_OBJECT, WAN_POLYMORPH, SPE_POLYMORPH, POT_POLYMORPH,
         AMULET_OF_UNCHANGING, LARGE_BOX, CHEST, WAN_SLOW_MONSTER,
         SPE_SLOW_MONSTER, WAN_SPEED_MONSTER, SPE_HEALING, SPE_EXTRA_HEALING,
         WEAPON_CLASS, ARMOR_CLASS, TOOL_CLASS, POTION_CLASS, GEM_CLASS,
         UNICORN_HORN, EGG, CORPSE, LOW_BOOTS, LEASH, MAGIC_LAMP, OIL_LAMP,
         MAGIC_MARKER, POT_GAIN_ABILITY, POT_WATER, POT_OIL, SPE_BLANK_PAPER,
         SPE_NOVEL, ROCK, MINERAL } from './objects.js';
import { PM_CROCODILE } from './monsters.js';
import { AC_VALUE } from './rng.js';
import { m_at, closed_door } from './makemon.js';
import { RING_CLASS } from './objects.js';
import { You_feel } from './display.js';
import { enlightenment } from './insight.js';
import { tty_display_nhwindow } from './wintty.js';
import { MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS } from './const.js';
import { canspotmon, map_invisible, unmap_invisible } from './display.js';
import { find_mac } from './worn.js';
import { tmp_at, DISP_BEAM, DISP_CHANGE, DISP_END } from './display.js';
import { zap_dig, bury_objs } from './dig.js';
import { couldsee } from './vision.js';
import { SCROLL_CLASS, FOOD_CLASS, GLOB_OF_GREEN_SLIME, SCR_FIRE, SPE_FIREBALL,
         BRASS_LANTERN, CANDELABRUM_OF_INVOCATION, TALLOW_CANDLE,
         WAX_CANDLE } from './objects.js';
import { nomul } from './hack.js';
import { stop_occupation } from './allmain.js';
import { wakeup, monkilled, killed, shieldeff_mon } from './mon.js';
import { AD_RBRE } from './monsters.js';
import { STONE, LAVAWALL, IRONBARS, FOUNTAIN, ICE, STRAT_WAITMASK, WEB,
         IS_ROOM, IS_WALL, In_mines, Is_airlevel, ZAP_POS, SDOOR } from './const.js';
import { engr_at, wipe_engr_at } from './engrave.js';
import { M1_NOHANDS, M1_CONCEAL, AD_COLD, AD_FIRE, AD_ELEC, AD_ACID,
         AD_DISN, AD_MAGM } from './monsters.js';
import {
    COLD_RES, FIRE_RES, SHOCK_RES, ACID_RES, DISINT_RES, W_ARMOR, W_ACCESSORY,
    W_WEP, W_ART, W_ARMC, W_ARM, W_ARMU, W_ARMH, W_ARMG, W_ARMF, W_ARMS,
    W_AMUL, W_TOOL, W_RING, W_RINGL,
} from './const.js';
import { simpleonames } from './iactions.js';
import { Sleep_resistance, Antimagic, Blind, Hallucination, Deaf, Reflecting } from './youprop.js';
import { Luck } from './const.js';
import { breaks as breaks_zb, hero_breaks as hero_breaks_zb } from './dothrow.js';
import { newsym_force as newsym_force_zb } from './display.js';
import { STATUE as STATUE_ZB } from './objects.js';
import * as O_zy from './objects.js';
import { ANTIMAGIC as ANTIMAGIC_ZY, M_SEEN_MAGR as M_SEEN_MAGR_ZY,
         A_STR as A_STR_ZY, NO_KILLER_PREFIX as NO_KILLER_PREFIX_ZY,
         DIED as DIED_ZY } from './const.js';
import { M2_DEMON as M2_DEMON_ZY, M2_UNDEAD as M2_UNDEAD_ZY,
         S_GOLEM as S_GOLEM_ZY,
         S_VORTEX as S_VORTEX_ZY, mons as mons_zy,
         PM_MANES as PM_MANES_ZY } from './monsters.js';
import { killer as killer_zy } from './topten.js';
import { done as done_zy } from './end.js';
import { healup as healup_zy } from './potion.js';
import { delete_contents } from './invent.js';
import { findit } from './detect.js';
import { makewish } from './wizcmds.js';
import { create_critters as create_critters_zp } from './read.js';
import { SPE_LIGHT as SPE_LIGHT_ZN,
         SPE_DETECT_UNSEEN as SPE_DETECT_UNSEEN_ZN } from './objects.js';
import { litroom, lightdamage } from './read.js';
import { ACURR as ACURR_ZP } from './attrib.js';
import { A_INT as A_INT_ZP, A_DEX as A_DEX_ZP, A_CON as A_CON_ZP,
         P_ISRESTRICTED as P_ISRESTRICTED_ZP, P_UNSKILLED as P_UNSKILLED_ZP,
         P_BASIC as P_BASIC_ZP, P_SKILLED as P_SKILLED_ZP,
         P_EXPERT as P_EXPERT_ZP, NOTELL as NOTELL_ZP,
         M_SEEN_FIRE as M_SEEN_FIRE_ZP, M_SEEN_COLD as M_SEEN_COLD_ZP,
         M_SEEN_DISINT as M_SEEN_DISINT_ZP, M_SEEN_ELEC as M_SEEN_ELEC_ZP,
         M_SEEN_ACID as M_SEEN_ACID_ZP, M_SEEN_REFL,
         NON_PM as NON_PM_ZP, KILLED_BY as KILLED_BY_ZP,
         HALF_SPDAM as HALF_SPDAM_ZP, XKILL_GIVEMSG as XKILL_GIVEMSG_ZP,
         XKILL_NOMSG as XKILL_NOMSG_ZP, XKILL_NOCORPSE as XKILL_NOCORPSE_ZP,
         LEVITATION as LEVITATION_ZP, FLYING as FLYING_ZP,
         STUNNED as STUNNED_ZP, TIMEOUT as TIMEOUT_ZP,
         INTRINSIC as INTRINSIC_ZP, FAST as FAST_ZP, INVIS as INVIS_ZP,
         UNCHANGING as UNCHANGING_ZP, DRAIN_RES as DRAIN_RES_ZP,
         TELEPORT_CONTROL as TELEPORT_CONTROL_ZP, REFLECTING as REFLECTING_ZP,
         EYE as EYE_ZP, EXPL_FIERY as EXPL_FIERY_ZP,
         engulfing_u as engulfing_u_zp, u_at, M_AP_MONSTER as M_AP_MONSTER_ZP,
         } from './const.js';
import { P_SKILL as P_SKILL_ZP } from './weapon.js';
import { spell_skilltype as spell_skilltype_zp } from './spell.js';
import { resists_magm as resists_magm_zp, defended as defended_zp,
         resists_fire as resists_fire_zp, resists_cold as resists_cold_zp,
         resists_elec as resists_elec_zp, resists_poison as resists_poison_zp,
         resists_acid as resists_acid_zp, resists_disint as resists_disint_zp,
         is_demon as is_demon_zp, is_vampshifter as is_vampshifter_zp,
         is_undead as is_undead_zp, haseyes as haseyes_zp } from './mondata.js';
import { burnarmor as burnarmor_zp, ignite_items as ignite_items_zp,
         acid_damage as acid_damage_zp,
         sleep_monst as sleep_monst_zp } from './trap.js';
import { healmon as healmon_zp, mlifesaver as mlifesaver_zp, xkilled,
         completelyburns } from './mon.js';
import { PM_DEATH as PM_DEATH_ZP, PM_FAMINE as PM_FAMINE_ZP,
         PM_PESTILENCE as PM_PESTILENCE_ZP, PM_CYCLOPS as PM_CYCLOPS_ZP,
         PM_FLOATING_EYE as PM_FLOATING_EYE_ZP, PM_KNIGHT as PM_KNIGHT_ZP,
         AD_DRST as AD_DRST_ZP, M1_BREATHLESS as M1_BREATHLESS_ZP } from './monsters.js';
import { which_armor as which_armor_zp, setnotworn as setnotworn_zp,
         bypass_objlist as bypass_objlist_zp,
         nxt_unbypassed_obj as nxt_unbypassed_obj_zp } from './worn.js';
import { m_useup, rnd_hallublast } from './mthrowu.js';
import { uhim, uhis, ugolemeffects as ugolemeffects_zp,
         u_slow_down } from './mhitu.js';
import { burn_away_slime as burn_away_slime_zp,
         hliquid as hliquid_zp, potionbreathe as potionbreathe_zp,
         make_stunned as make_stunned_zp, incr_itimeout as incr_itimeout_zp,
         self_invis_message as self_invis_message_zp,
         speed_up as speed_up_zp } from './potion.js';
import { poisoned as poisoned_zp } from './attrib.js';
import { disintegrate_arm as disintegrate_arm_zp } from './do_wear.js';
import { death_inflicted_by as death_inflicted_by_zp, ureflects } from './mcastu.js';
import { is_quest_artifact as is_quest_artifact_zp } from './questpgr.js';
import { extract_from_minvent as extract_from_minvent_zp } from './steal.js';
import { obfree as obfree_zp, useup as useup_zp } from './invent.js';
import { SPE_BOOK_OF_THE_DEAD as SPE_BOOK_OF_THE_DEAD_ZP,
         RIN_SHOCK_RESISTANCE as RIN_SHOCK_RESISTANCE_ZP,
         is_metallic as is_metallic_zp } from './objects.js';
import { hcolor as hcolor_zp, Monnam } from './do_name.js';
import { recharge as recharge_zp } from './read.js';
import { Yname2 as Yname2_zp, yname as yname_zp, makeplural,
         distant_name } from './objnam.js';
import { s_suffix, upstart } from './hacklib.js';
import { mon_reflects } from './muse.js';
import { slept_monst } from './mhitm.js';
import { canseemon, sensemon as sensemon_zp, zapdir_to_glyph } from './display.js';
import { explode } from './explode.js';
import { losexp as losexp_zp } from './exper.js';
import { tele as tele_zp } from './teleport.js';
import { LOW_PM as LOW_PM_ZP } from './monsters.js';
import { Norep as Norep_zp } from './display.js';
import { delfloortrap as delfloortrap_zp } from './trap.js';
import { is_ice as is_ice_zp } from './dig.js';
import { create_gas_cloud as create_gas_cloud_zp } from './region.js';
import { dryup as dryup_zp } from './fountain.js';
import { W_NONDIGGABLE as W_NONDIGGABLE_ZP, D_NODOOR as D_NODOOR_ZP,
         D_BROKEN as D_BROKEN_ZP, SHOPBASE as SHOPBASE_ZP,
         Is_rogue_level as Is_rogue_level_zp } from './const.js';
import { cvt_sdoor_to_door as cvt_sdoor_to_door_zp } from './detect.js';
import { recalc_block_point as recalc_block_point_zp } from './vision.js';
import { in_rooms as in_rooms_zp } from './hack.js';
import { picking_at as picking_at_zp, reset_pick as reset_pick_zp,
         boxlock as boxlock_zy } from './lock.js';
import { unpunish as unpunish_zy } from './read.js';
import { display_minventory as display_minventory_bm } from './invent.js';
import { PICK_NONE as PICK_NONE_BM } from './const.js';
import { Punished as Punished_zy } from './youprop.js';
import { catch_lit as catch_lit_zp } from './trap.js';
import { useupf as useupf_zp } from './invent.js';
import { An as An_zp } from './objnam.js';
import { erode_armor as erode_armor_zp } from './uhitm.js';
import { POOL as POOL_ZP, ROOM as ROOM_ZP,
         NO_TRAP_FLAGS as NO_TRAP_FLAGS_ZP, DEAF as DEAF_ZP,
         PLNMSG_ENVELOPED_IN_GAS as PLNMSG_ENVELOPED_IN_GAS_ZP,
         Is_waterlevel as Is_waterlevel_zp } from './const.js';
import { maketrap as maketrap_zp, dotrap as dotrap_zp,
         mintrap as mintrap_zp } from './trap.js';
import { is_swimmer as is_swimmer_zp } from './mondata.js';
import { dissolve_bars } from './monmove.js';
import { DRAWBRIDGE_UP as DRAWBRIDGE_UP_ZP, DRAWBRIDGE_DOWN as DRAWBRIDGE_DOWN_ZP,
         DB_ICE as DB_ICE_ZP, DB_UNDER as DB_UNDER_ZP, DB_FLOOR as DB_FLOOR_ZP,
         ICED_POOL as ICED_POOL_ZP, ICED_MOAT as ICED_MOAT_ZP, MOAT as MOAT_ZP,
         VWALL as VWALL_ZP, HWALL as HWALL_ZP, TT_LAVA as TT_LAVA_ZP,
         MELT_ICE_AWAY as MELT_ICE_AWAY_ZP, COLNO as COLNO_ZP, ROWNO as ROWNO_ZP,
         isok as isok_zp, IS_WATERWALL as IS_WATERWALL_ZP } from './const.js';
import { waterbody_name as waterbody_name_zp } from './pager.js';
import { fix_wall_spines as fix_wall_spines_zp } from './mklev.js';
import { minliquid as minliquid_zp } from './mon.js';
import { spoteffects as spoteffects_zp } from './hack.js';
import { is_moat as is_moat_zp } from './makemon.js';
import { start_timer as start_timer_zp, long_to_any as long_to_any_zp,
         spot_time_left as spot_time_left_zp, spot_stop_timers as spot_stop_timers_zp } from './timeout.js';
import { TIMER_LEVEL as TIMER_LEVEL_ZP } from './const.js';
import { obj_ice_effects as obj_ice_effects_zp } from './mkobj.js';
import { mons as mons_rv, S_ZOMBIE as S_ZOMBIE_RV, S_TROLL as S_TROLL_RV,
         S_EEL as S_EEL_RV, PM_DEATH as PM_DEATH_RV,
         PM_PESTILENCE as PM_PESTILENCE_RV, PM_FAMINE as PM_FAMINE_RV,
         PM_DOPPELGANGER as PM_DOPPELGANGER_RV, M3_DISPLACES as M3_DISPLACES_RV,
         PM_GHOST as PM_GHOST_RV, G_UNIQ as G_UNIQ_RV } from './monsters.js';
import { G_GENOD as G_GENOD_RV, NON_PM as NON_PM_RV, ROOM as ROOM_RV,
         CORR as CORR_RV, GRAVE as GRAVE_RV, IS_POOL as IS_POOL_RV,
         BURIED_TOO as BURIED_TOO_RV, CONTAINED_TOO as CONTAINED_TOO_RV,
         NO_MINVENT as NO_MINVENT_RV, MM_NOWAIT as MM_NOWAIT_RV,
         MM_NOMSG as MM_NOMSG_RV, MM_NOCOUNTBIRTH as MM_NOCOUNTBIRTH_RV,
         MM_MALE as MM_MALE_RV, MM_FEMALE as MM_FEMALE_RV,
         CORPSTAT_GENDER as CORPSTAT_GENDER_RV, CORPSTAT_MALE as CORPSTAT_MALE_RV,
         CORPSTAT_FEMALE as CORPSTAT_FEMALE_RV, CXN_PFX_THE as CXN_PFX_THE_RV,
         CXN_SINGULAR as CXN_SINGULAR_RV, NO_NC_FLAGS as NO_NC_FLAGS_RV,
         RLOC_NOMSG as RLOC_NOMSG_RV, REVIVE_MON as REVIVE_MON_RV,
         ROT_CORPSE as ROT_CORPSE_RV, TIMER_OBJECT as TIMER_OBJECT_RV,
         PIT as PIT_RV, has_oname as has_oname_rv, ONAME as ONAME_rv,
         isok as isok_rv } from './const.js';
import { CORPSE as CORPSE_RV, STATUE as STATUE_RV,
         BAG_OF_HOLDING as BAG_OF_HOLDING_RV } from './objects.js';
import { makemon as makemon_rv, makemon_flush_msg as makemon_flush_msg_rv } from './makemon.js';
import { enexto as enexto_rv, rloc as rloc_rv } from './teleport.js';
import { corpse_xname as corpse_xname_rv, xname as xname_rv, an as an_rv,
         yname as yname_rv, The as The_rv } from './objnam.js';
import { Amonnam as Amonnam_rv, Adjmonnam as Adjmonnam_rv,
         mon_nam as mon_nam_rv, christen_monst as christen_monst_rv } from './do_name.js';
import { cant_revive as cant_revive_rv } from './read.js';
import { cant_finish_meal as cant_finish_meal_rv, eaten_stat as eaten_stat_rv } from './eat.js';
import { set_corpsenm as set_corpsenm_rv, obj_extract_self as obj_extract_self_rv } from './mkobj.js';
import { delobj_core as delobj_core_rv } from './invent.js';
import { newcham as newcham_rv, seemimic as seemimic_rv, zombie_form as zombie_form_rv } from './mon.js';
import { mon_adjust_speed as mon_adjust_speed_rv } from './worn.js';
import { rot_corpse as rot_corpse_rv } from './dig.js';
import { fill_pit as fill_pit_rv } from './muse.js';
import { locomotion as locomotion_rv } from './trap.js';
import { get_obj_location as get_obj_location_rv } from './shk.js';
import { obj_has_timer as obj_has_timer_rv } from './timeout.js';
import { dist2 as dist2_rv } from './hacklib.js';
import { get_mtraits as get_mtraits_rv } from './mkobj.js';
import { monhp_per_lvl as monhp_per_lvl_rv } from './makemon.js';
import { replmon as replmon_rv } from './mon.js';
import { restore_cham as restore_cham_rv } from './restore.js';
import { wary_dog as wary_dog_rv } from './dog.js';
import { dmgtype as dmgtype_rv } from './mondata.js';
import { AD_SEDU as AD_SEDU_RV, AD_SSEX as AD_SSEX_RV } from './monsters.js';
import { MM_NOTAIL as MM_NOTAIL_RV, MM_ADJACENTOK as MM_ADJACENTOK_RV } from './const.js';
import { defends as defends_di, defends_when_carried as defends_when_carried_di }
       from './artifact.js';
import { costly_alteration as costly_alteration_di } from './mkobj.js';
import { bot as bot_di } from './display.js';
import { COST_DRAIN as COST_DRAIN_DI, A_CON as A_CON_DI, A_CHA as A_CHA_DI,
         A_INT as A_INT_DI, A_DEX as A_DEX_DI } from './const.js';
import { AD_DRLI as AD_DRLI_DI } from './monsters.js';
import { RIN_GAIN_STRENGTH as RIN_GAIN_STRENGTH_DI,
         RIN_GAIN_CONSTITUTION as RIN_GAIN_CONSTITUTION_DI,
         RIN_ADORNMENT as RIN_ADORNMENT_DI,
         RIN_INCREASE_ACCURACY as RIN_INCREASE_ACCURACY_DI,
         RIN_INCREASE_DAMAGE as RIN_INCREASE_DAMAGE_DI,
         RIN_PROTECTION as RIN_PROTECTION_DI,
         HELM_OF_BRILLIANCE as HELM_OF_BRILLIANCE_DI,
         GAUNTLETS_OF_DEXTERITY as GAUNTLETS_OF_DEXTERITY_DI } from './objects.js';
import { killer_xname as killer_xname_zp } from './mthrowu.js';
import * as O_ci from './objects.js';
import { W_RING as W_RING_CI, W_ARMG as W_ARMG_CI, W_ARMH as W_ARMH_CI,
         W_ARMOR as W_ARMOR_CI, A_STR as A_STR_CI, A_CON as A_CON_CI,
         A_CHA as A_CHA_CI, A_DEX as A_DEX_CI, A_INT as A_INT_CI, A_WIS as A_WIS_CI,
         COST_CANCEL as COST_CANCEL_CI, COST_UNCURS as COST_UNCURS_CI,
         COST_UNBLSS as COST_UNBLSS_CI, ANTIMAGIC as ANTIMAGIC_CI,
         NOTELL as NOTELL_CI, BLINDED as BLINDED_CI } from './const.js';
import { PM_CLAY_GOLEM as PM_CLAY_GOLEM_CI } from './monsters.js';
import { costly_alteration as costly_alteration_ci, unbless as unbless_ci,
         uncurse as uncurse_ci } from './mkobj.js';
import { obj_to_any as obj_to_any_ci, peek_timer as peek_timer_ci,
         stop_timer as stop_timer_ci } from './timeout.js';
import { find_ac as find_ac_ci } from './u_init.js';
import { rehumanize as rehumanize_ci } from './polyself.js';
import { You_feel as You_feel_ci } from './display.js';
import { check_gear_next_turn as check_gear_next_turn_bm,
         DEADMONSTER as DEADMONSTER_BM } from './mon.js';
import { expels as expels_bm, unstuck as unstuck_bm } from './mhitu.js';
import { monflee as monflee_bm, m_respond as m_respond_bm } from './monmove.js';
import { bypass_obj as bypass_obj_bm, mon_set_minvis as mon_set_minvis_bm }
       from './worn.js';
import { ismnum as ismnum_bm, NC_SHOW_MSG as NC_SHOW_MSG_BM,
         NC_VIA_WAND_OR_SPELL as NC_VIA_WAND_OR_SPELL_BM,
         MIM_REVEAL as MIM_REVEAL_BM, MIM_OMIT_WAIT as MIM_OMIT_WAIT_BM,
         W_SADDLE as W_SADDLE_BM, M_AP_TYPE as M_AP_TYPE_BM,
         M_AP_NOTHING as M_AP_NOTHING_BM, M_AP_OBJECT as M_AP_OBJECT_BM,
         M_AP_FURNITURE as M_AP_FURNITURE_BM, TELL as TELL_BM,
         BOLT_LIM as BOLT_LIM_BM, Role_if as Role_if_bm,
         MINV_ALL as MINV_ALL_BM, MINV_NOLET as MINV_NOLET_BM } from './const.js';
import { that_is_a_mimic as that_is_a_mimic_bm, m_is_steadfast as m_is_steadfast_bm,
         set_ustuck as set_ustuck_bm, flash_hits_mon as flash_hits_mon_bm } from './uhitm.js';
import { mhurtle as mhurtle_bm } from './dothrow.js';
import { abuse_dog as abuse_dog_bm } from './dog.js';
import { surface as surface_bm } from './iactions.js';
import { mdrop_obj as mdrop_obj_bm } from './steal.js';
import { mcureblindness as mcureblindness_bm } from './muse.js';
import { is_obj_mappear as is_obj_mappear_bm } from './pager.js';
import { set_mimic_sym as set_mimic_sym_bm } from './makemon.js';
import { newexplevel as newexplevel_bm } from './exper.js';
import { adjalign as adjalign_bm } from './attrib.js';
import { resists_drli as resists_drli_bm, monsndx as monsndx_bm } from './mondata.js';
import { hot_pursuit as hot_pursuit_bm } from './shk.js';
import { noit_Monnam as noit_Monnam_bm } from './do_name.js';
import { mstatusline as mstatusline_bm } from './insight.js';
import { sticks as sticks_bm } from './engrave.js';
import { u_teleport_mon, rloco } from './teleport.js';
import { closeholdingtrap as closeholdingtrap_bm, openholdingtrap as openholdingtrap_bm,
         openfallingtrap as openfallingtrap_bm } from './trap.js';
import { See_invisible as See_invisible_bm, Detect_monsters as Detect_monsters_bm,
         HTelepat as HTelepat_bm } from './youprop.js';
import { S_MIMIC as S_MIMIC_BM, S_LIGHT as S_LIGHT_BM, MZ_HUMAN as MZ_HUMAN_BM,
         PM_HEALER as PM_HEALER_BM, PM_STONE_GOLEM as PM_STONE_GOLEM_BM,
         PM_FLESH_GOLEM as PM_FLESH_GOLEM_BM, PM_AIR_ELEMENTAL as PM_AIR_ELEMENTAL_BM,
         PM_LONG_WORM as PM_LONG_WORM_BM, M1_MINDLESS as M1_MINDLESS_BM,
         AD_DGST as AD_DGST_BM, AT_ENGL as AT_ENGL_BM } from './monsters.js';
import { WAN_UNDEAD_TURNING as WAN_UNDEAD_TURNING_BM,
         SPE_TURN_UNDEAD as SPE_TURN_UNDEAD_BM,
         WAN_TELEPORTATION as WAN_TELEPORTATION_BM,
         SPE_TELEPORT_AWAY as SPE_TELEPORT_AWAY_BM,
         WAN_MAKE_INVISIBLE as WAN_MAKE_INVISIBLE_BM,
         SPE_STONE_TO_FLESH as SPE_STONE_TO_FLESH_BM,
         SPE_DRAIN_LIFE as SPE_DRAIN_LIFE_BM, FIGURINE as FIGURINE_BM,
         TIN as TIN_BM } from './objects.js';
import { glyph_at, db_under_typ } from './display.js';
import { show_map_spot, cvt_sdoor_to_door } from './detect.js';
import { recalc_block_point } from './vision.js';
import { Is_rogue_level, IS_FURNITURE, SCORR, CORR, VIBRATING_SQUARE } from './const.js';
import { draft_message } from './dig.js';
import { trapname } from './trap.js';
import { Invocation_lev } from './mklev.js';
import { the } from './iactions.js';
import { an } from './objnam.js';
import { unpunish } from './read.js';
import { hideunder_async } from './makemon.js';
import { maybe_unhide_at } from './mon.js';
import { fill_pit } from './muse.js';
import { Ring_gone } from './do_wear.js';
import { dead_species } from './mkobj.js';
import { attach_egg_hatch_timeout } from './timeout.js';
import { vision_recalc } from './vision.js';
import { set_uinwater } from './trap.js';
import { docrt } from './display.js';
import { ustatusline } from './insight.js';
import { unearth_objs } from './dig.js';
import { mksobj, set_corpsenm } from './mkobj.js';
import { STATUE, FIGURINE } from './objects.js';
import { W_ARTI, BURIED_TOO, CONTAINED_TOO } from './const.js';
import { force_decor } from './pickup.js';
import { is_db_wall, open_drawbridge, close_drawbridge, destroy_drawbridge } from './dbridge.js';
import { set_msg_xy } from './display.js';
import { o_unleash } from './apply.js';
import { cmap_to_glyph } from './display.js';
import { RIGHT_HANDED, DISP_FLASH, N_DIRS, xdir, ydir, IS_SINK } from './const.js';
import { Fumbling } from './youprop.js';
import { dmgval } from './weapon.js';
import { thitu } from './mthrowu.js';
import { endmultishot } from './end.js';
import { wake_nearto } from './mon.js';
import { throwit_mon_hit } from './dothrow.js';

/* C ref: defsym.h S_boomleft, S_boomright (showsym[] indexes) */
const S_boomleft = 80, S_boomright = 81;

// C ref: zap.c learnwand()
export function learnwand(obj) {
    /* For a wand (or wand-like tool) zapped by the player, if the
       effect was observable (determined by caller; usually seen, but
       possibly heard or felt if the hero is blinded) then discover the
       object type provided that the object itself is known (as more
       than just "a wand").  If object type is already discovered and
       we observed the effect, mark the individual wand as having been
       seen.  Suppress spells (which use fake spellbook object for `obj')
       so that casting a spell won't re-discover its forgotten book. */
    if (obj.oclass !== SPBOOK_CLASS) {
        /* if type already discovered, treat this item has having been seen
           even if hero is currently blinded (skips redundant makeknown) */
        if (objects[obj.otyp].oc_name_known) {
            observe_object(obj, Hallucination()); /* will usually be dknown already */

        /* otherwise discover it if item itself has been or can be seen */
        } else {
            /* in case it was picked up while blind and then zapped without
               examining inventory after regaining sight (bypassing xname) */
            if (!Blind())
                observe_object(obj, Hallucination());
            /* make the discovery iff we know what we're manipulating */
            if (obj.dknown)
                discover_object(obj.otyp, true, true, true); /* makeknown() */
        }
        /* update_inventory(): no perm_invent */
    }
}

// C ref: zap.c resist() -- monster mtmp resists the effect of an object
// of class oclass, taking `damage' (halved if resisted); a synchronous C
// caller can't await killed()/monkilled(), so a fatal `damage' stops
// unless the caller (resist_async()) passes deadout to do the killing
export function resist(mtmp, oclass, damage, tell, deadout = null) {
    let resisted;
    let alev, dlev;

    /* fake players always pass resistance test against Conflict
       (this doesn't guarantee that they're never affected by it) */
    if (oclass === RING_CLASS && !damage && !tell && is_mplayer(mtmp.data))
        return 1;

    /* attack level */
    switch (oclass) {
    case WAND_CLASS:
        alev = 12;
        break;
    case TOOL_CLASS:
        alev = 10;
        break; /* instrument */
    case WEAPON_CLASS:
        alev = 10;
        break; /* artifact */
    case SCROLL_CLASS:
        alev = 9;
        break;
    case POTION_CLASS:
        alev = 6;
        break;
    case RING_CLASS:
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
        if (tell) {
            /* shieldeff_mon(mtmp) prints "<Mon> resists!": the async
               caller resist_async() awaits it */
            if (!deadout)
                throw new Error('resist(): shieldeff_mon() from a synchronous caller not ported yet (use resist_async())');
            deadout.shield = true;
        }
        damage = Math.trunc((damage + 1) / 2);
    }

    if (damage) {
        mtmp.mhp -= damage;
        if (mtmp.mhp < 1) { /* DEADMONSTER(mtmp) */
            if (!deadout)
                throw new Error('resist(): killing the monster (monkilled()/killed()) not ported yet');
            deadout.dead = true;
        }
    }
    return resisted ? 1 : 0;
}

// C ref: zap.c resist() -- for async callers: the fatal-damage path awaits
// monkilled()/killed()
export async function resist_async(mtmp, oclass, damage, tell) {
    const out = { dead: false, shield: false };
    const resisted = resist(mtmp, oclass, damage, tell, out);
    if (out.shield) /* if (tell) shieldeff_mon(mtmp), before the damage */
        await shieldeff_mon(mtmp);
    if (out.dead) {
        if (game.m_using)
            await monkilled(mtmp, "", AD_RBRE);
        else
            await killed(mtmp);
    }
    return resisted;
}

// C ref: zap.c do_enlightenment_effect()
export async function do_enlightenment_effect() {
    await You_feel("self-knowledgeable...");
    await tty_display_nhwindow(game.WIN_MESSAGE, false);
    await enlightenment(MAGICENLIGHTENMENT, ENL_GAMEINPROGRESS);
    await pline_The("feeling subsides.");
    await exercise(A_WIS, true);
}

/* C ref: mextra.h has_mcorpsenm() (newmextra() sets mcorpsenm to NON_PM) */
function has_mcorpsenm_bm(mon) {
    return !!mon.mextra && mon.mextra.mcorpsenm !== undefined
        && mon.mextra.mcorpsenm !== NON_PM_ZP;
}


// C ref: display.c knowninvisible() (display.h _knowninvisible())
function knowninvisible(mon) {
    return !!(mon.minvis
              && ((cansee(mon.mx, mon.my)
                   && (See_invisible_bm() || Detect_monsters_bm()))
                  || (!Blind() && (HTelepat_bm() & ~INTRINSIC_ZP)
                      && dist2_rv(mon.mx, mon.my, game.u.ux, game.u.uy) /* mdistu() */
                         <= (BOLT_LIM_BM * BOLT_LIM_BM))));
}

// C ref: uhitm.c disguised_as_mon()
function disguised_as_mon(mtmp) {
    return (M_AP_TYPE_BM(mtmp) && M_AP_TYPE_BM(mtmp) === M_AP_MONSTER_ZP);
}

/* C ref: sym.h S_* -- the screen symbols used by is_cmap_door() and
   stone_furniture_type() */
const S_vwall_BM = 1, S_trwall_BM = 11, S_vodoor_BM = 13, S_hcdoor_BM = 16,
    S_upstair_BM = 25, S_dnstair_BM = 26, S_brupstair_BM = 29,
    S_brdnstair_BM = 30, S_altar_BM = 33, S_throne_BM = 35, S_sink_BM = 36;

/* C ref: sym.h is_cmap_door() */
function is_cmap_door_bm(i) { return i >= S_vodoor_BM && i <= S_hcdoor_BM; }

// C ref: mkobj.c stone_object_type()
/* potential mimic shapes that should be undone by stone-to-flesh;
   not used for objects that will be transformed when hit by stone-to-flesh */
function stone_object_type(mappearance) {
    const otyp = mappearance;

    /* we exclude wands, rings, and gems even though some qualify as stone;
       there aren't any weapons or armor classified as made out of stone */
    return (otyp === BOULDER || otyp === STATUE_ZB || otyp === FIGURINE_BM);
}

// C ref: mkobj.c stone_furniture_type()
/* possible mimic shapes that are affected by stone-to-flesh;
   mappearance for furniture is a display symbol rather than a terrain type */
function stone_furniture_type(mappearance) {
    const sym = mappearance;

    switch (sym) {
    case S_upstair_BM:
    case S_dnstair_BM:
    case S_brupstair_BM:
    case S_brdnstair_BM:
    case S_altar_BM:
    case S_throne_BM:
    case S_sink_BM: /* stone sink is iffy; metal might be more appropriate */
        return true;
    default:
        if (sym >= S_vwall_BM && sym <= S_trwall_BM)
            return true;
        break;
    }
    return false;
}

/* C ref: decl.c c_obj_colors[] */
const c_obj_colors = [
    "black", "red", "green", "brown", "blue", "magenta", "cyan", "gray",
    "transparent", "orange", "bright green", "yellow", "bright blue",
    "bright magenta", "bright cyan", "white",
];

// C ref: mon.c mimic_hit_msg()
async function mimic_hit_msg(mtmp, otyp) {
    const ap = mtmp.mappearance;

    switch (M_AP_TYPE_BM(mtmp)) {
    case M_AP_NOTHING_BM:
    case M_AP_FURNITURE_BM:
    case M_AP_MONSTER_ZP:
        break;
    case M_AP_OBJECT_BM:
        if (otyp === SPE_HEALING || otyp === SPE_EXTRA_HEALING) {
            await pline_mon(mtmp, `${The(simple_typename(ap))} seems a more vivid ${
                c_obj_colors[objects[ap].oc_color]} than before.`);
        }
        break;
    }
}

// C ref: zap.c bhitm() -- monster mtmp was hit by the effect of wand or
// spell otmp
export async function bhitm(mtmp, otmp) {
    const g = game;
    const u = g.u;
    let ret = 0;
    let wake = true; /* Most 'zaps' should wake monster */
    let reveal_invis = false, learn_it = false;
    const dbldam = Role_if_bm(PM_KNIGHT_ZP) && !!u.uhave?.questart;
    let skilled_spell, helpful_gesture = false;
    let dmg;
    const otyp = otmp.otyp; /* otmp is not NULL */
    let zap_type_text = "spell";
    let obj;
    const disguised_mimic = (mtmp.data.mlet === S_MIMIC_BM
                             && M_AP_TYPE_BM(mtmp) !== M_AP_NOTHING_BM);
    /* box_or_door(): mimic appearances that have locks */
    const box_or_door = (monst) =>
        ((M_AP_TYPE_BM(monst) === M_AP_OBJECT_BM
          && (monst.mappearance === CHEST
              || monst.mappearance === LARGE_BOX))
         || (M_AP_TYPE_BM(monst) === M_AP_FURNITURE_BM
             /* is_cmap_door() tests S_symbol values, and            */
             /* mon->mappearance for furniture contains one of those */
             && is_cmap_door_bm(monst.mappearance)));

    if (engulfing_u_zp(mtmp))
        reveal_invis = false;

    if (!g.bhitpos)
        g.bhitpos = { x: 0, y: 0 }; /* C's gb.bhitpos is a zeroed global */
    g.notonhead = (mtmp.mx !== g.bhitpos.x || mtmp.my !== g.bhitpos.y);
    skilled_spell = (otmp.oclass === SPBOOK_CLASS && !!otmp.blessed);

    switch (otyp) {
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        if (otyp === WAN_STRIKING)
            zap_type_text = "wand";
        /*FALLTHRU*/
        reveal_invis = true;
        learn_it = cansee(g.bhitpos.x, g.bhitpos.y);
        if (resists_magm_zp(mtmp)) { /* match effect on player */
            if (disguised_mimic && !disguised_as_mon(mtmp))
                seemimic_rv(mtmp);
            await shieldeff(mtmp.mx, mtmp.my);
            await pline("Boing!");
            /* 5.0: used to 'break' to avoid setting learn_it here */
        } else if (u.uswallow || rnd(20) < 10 + find_mac(mtmp)) {
            if (disguised_mimic)
                seemimic_rv(mtmp);
            dmg = d(2, 12);
            if (dbldam)
                dmg *= 2;
            if (otyp === SPE_FORCE_BOLT)
                dmg = spell_damage_bonus(dmg);
            await hit(zap_type_text, mtmp, exclam(dmg));
            await resist_async(mtmp, otmp.oclass, dmg, TELL_BM);
        } else {
            if (!disguised_mimic)
                await miss(zap_type_text, mtmp);
            learn_it = false;
        }
        break;
    case WAN_SLOW_MONSTER:
    case SPE_SLOW_MONSTER:
        if (!resist(mtmp, otmp.oclass, 0, NOTELL_ZP)) {
            if (disguised_mimic)
                seemimic_rv(mtmp);
            await mon_adjust_speed_rv(mtmp, -1, otmp);
            check_gear_next_turn_bm(mtmp); /* might want speed boots */

            if (engulfing_u_zp(mtmp) && is_whirly(mtmp.data)) {
                await You(`disrupt ${mon_nam(mtmp)}!`);
                await pline("A huge hole opens up...");
                await expels_bm(mtmp, mtmp.data, true);
            }
        }
        break;
    case WAN_SPEED_MONSTER:
        if (!resist(mtmp, otmp.oclass, 0, NOTELL_ZP)) {
            if (disguised_mimic)
                seemimic_rv(mtmp);
            await mon_adjust_speed_rv(mtmp, 1, otmp);
            check_gear_next_turn_bm(mtmp); /* might want speed boots */
        }
        /* wake but don't anger a peaceful target */
        helpful_gesture = true;
        break;
    case WAN_UNDEAD_TURNING_BM:
    case SPE_TURN_UNDEAD_BM:
        wake = false;
        if (unturn_dead(mtmp))
            wake = true;
        if (is_undead_zp(mtmp.data) || is_vampshifter_zp(mtmp)) {
            reveal_invis = true;
            wake = true;
            dmg = rnd(8);
            if (dbldam)
                dmg *= 2;
            if (otyp === SPE_TURN_UNDEAD_BM)
                dmg = spell_damage_bonus(dmg);
            g.context.bypasses = true; /* for make_corpse() */
            if (!(await resist_async(mtmp, otmp.oclass, dmg, NOTELL_ZP))) {
                if (!DEADMONSTER_BM(mtmp))
                    await monflee_bm(mtmp, 0, false, true);
            }
        }
        break;
    case WAN_POLYMORPH:
    case SPE_POLYMORPH:
    case POT_POLYMORPH:
        if (mtmp.data === mons_zy[PM_LONG_WORM_BM] && has_mcorpsenm_bm(mtmp)) {
            /* if a long worm has mcorpsenm set, it was polymorphed by
               the current zap and shouldn't be affected if hit again */
            ;
        } else if (resists_magm_zp(mtmp)) {
            /* magic resistance protects from polymorph traps, so make
               it guard against involuntary polymorph attacks too... */
            await shieldeff_mon(mtmp);
        } else if (!resist(mtmp, otmp.oclass, 0, NOTELL_ZP)) {
            const polyspot = (otyp !== POT_POLYMORPH),
                give_msg = (!Hallucination()
                            && (canseemon(mtmp)
                                || engulfing_u_zp(mtmp)));

            /* dropped inventory (due to death by system shock,
               or loss of wielded weapon and/or worn armor due to
               limitations of new shape) won't be hit by this zap */
            if (polyspot) /* (JS minvent arrays are oldest first) */
                for (obj of (mtmp.minvent || []).slice().reverse())
                    bypass_obj_bm(obj);

            /* natural shapechangers aren't affected by system shock
               (unless protection from shapechangers is interfering
               with their metabolism...) */
            if (mtmp.cham === NON_PM_ZP && !rn2(25)) {
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} shudders!`);
                    learn_it = true;
                }
                /* svc.context.bypasses = TRUE; ## for make_corpse() */
                /* no corpse after system shock */
                await xkilled(mtmp, XKILL_GIVEMSG_ZP | XKILL_NOCORPSE_ZP);
            } else {
                let ncflags = NO_NC_FLAGS_RV;

                if (polyspot)
                    ncflags |= NC_VIA_WAND_OR_SPELL_BM;
                if (give_msg)
                    ncflags |= NC_SHOW_MSG_BM;
                if ((await newcham_rv(mtmp, null, ncflags)) !== 0
                           /* if shapechange failed because there aren't
                              enough eligible candidates (most likely for
                              vampshifter), try reverting to original form */
                           || (ismnum_bm(mtmp.cham)
                               && (await newcham_rv(mtmp, mons_zy[mtmp.cham],
                                                    ncflags)) !== 0)) {
                    if (give_msg && (canspotmon(mtmp)
                                     || engulfing_u_zp(mtmp)))
                        learn_it = true;
                }
            }

            /* do this even if polymorphed failed (otherwise using
               flags.mon_polycontrol prompting to force mtmp to remain
               'long worm' would prompt again if zap hit another segment) */
            if (!DEADMONSTER_BM(mtmp) && mtmp.data === mons_zy[PM_LONG_WORM_BM]) {
                if (!mtmp.mextra) mtmp.mextra = {}; /* newmcorpsenm(mtmp) */
                /* flag to indicate that mtmp became a long worm
                   on current zap, so further hits (on mtmp's new
                   tail) don't do further transforms */
                mtmp.mextra.mcorpsenm = PM_LONG_WORM_BM; /* MCORPSENM(mtmp) */
                /* flag to indicate that cleanup is needed; object
                   bypass cleanup also clears mon->mextra->mcorpsenm
                   for all long worms on the level */
                g.context.bypasses = true;
            }
        }
        break;
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        if (disguised_mimic)
            seemimic_rv(mtmp);
        await cancel_monst(mtmp, otmp, true, true, false);
        break;
    case WAN_TELEPORTATION_BM:
    case SPE_TELEPORT_AWAY_BM:
        if (disguised_mimic)
            seemimic_rv(mtmp);
        reveal_invis = !(await u_teleport_mon(mtmp, true));
        learn_it = canspotmon(mtmp);
        break;
    case WAN_MAKE_INVISIBLE_BM: {
        const oldinvis = mtmp.minvis;
        const couldsee_it = canseemon(mtmp);

        if (disguised_mimic)
            seemimic_rv(mtmp);
        /* format monster's name before altering its visibility */
        const nambuf = Monnam(mtmp);
        mon_set_minvis_bm(mtmp, false);
        if (!oldinvis && knowninvisible(mtmp)) {
            await pline(`${nambuf} turns transparent!`);
            reveal_invis = true;
            learn_it = true;
        } else if (couldsee_it && !canseemon(mtmp)) {
            /* keep the immediate effects of make invisible and teleportation
               ambiguous by using the same message that's used if we
               teleported mtmp (and it ended up somewhere you can't see) */
            await pline(`${nambuf} vanishes!`);
        }
        break;
    }
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK: {
        if (disguised_mimic && box_or_door(mtmp))
            await that_is_a_mimic_bm(mtmp, MIM_REVEAL_BM); /*seemimic()*/
        const noticed = { v: learn_it }; /* &learn_it */
        wake = await closeholdingtrap_bm(mtmp, noticed);
        learn_it = noticed.v;
        break;
    }
    case WAN_PROBING:
        wake = false;
        reveal_invis = true;
        await probe_monster(mtmp);
        learn_it = true;
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
        if (disguised_mimic && box_or_door(mtmp))
            await that_is_a_mimic_bm(mtmp, MIM_REVEAL_BM); /*seemimic()*/
        wake = false; /* don't want immediate counterattack */
        if (mtmp === u.ustuck) {
            /* zapping either holder/holdee or self [zapyourself()] will
               release hero from holder's grasp or holdee from hero's grasp */
            await release_hold();
            learn_it = true;

        /* zap which hits steed will only release saddle if it
           doesn't hit a holding or falling trap; playability
           here overrides the more logical target ordering */
        } else {
            const noticed = { v: learn_it }; /* &learn_it */
            const held = await openholdingtrap_bm(mtmp, noticed);
            learn_it = noticed.v;
            if (held)
                break;
            const fell = await openfallingtrap_bm(mtmp, true, noticed);
            learn_it = noticed.v;
            if (fell) {
                /* mtmp might now be on the migrating monsters list */
                break;
            } else if (otyp === SPE_KNOCK) {
                wake = true;
                ret = 1;
                if (mtmp.data.msize < MZ_HUMAN_BM && !m_is_steadfast_bm(mtmp)) {
                    if (canseemon(mtmp))
                        await pline(`${Monnam(mtmp)} is knocked back!`);
                    await mhurtle_bm(mtmp, mtmp.mx - u.ux, mtmp.my - u.uy, rnd(2));
                } else {
                    if (canseemon(mtmp))
                        await pline(`${Monnam(mtmp)} doesn't budge.`);
                }
                if (!DEADMONSTER_BM(mtmp)) {
                    await wakeup(mtmp, !mindless(mtmp.data));
                    await abuse_dog_bm(mtmp);
                }
            } else if ((obj = which_armor_zp(mtmp, W_SADDLE_BM))) {
                let buf = `${s_suffix(Monnam(mtmp))} ${distant_name(obj, xname)}`;

                if (cansee(mtmp.mx, mtmp.my)) {
                    if (!canspotmon(mtmp))
                        buf = An_zp(distant_name(obj, xname));
                    await pline(`${buf} falls to the ${surface_bm(mtmp.mx, mtmp.my)}.`);
                } else if (canspotmon(mtmp)) {
                    await pline(`${buf} falls off.`);
                }
                await mdrop_obj_bm(mtmp, obj, false);
            }
        }
        break;
    case SPE_HEALING:
    case SPE_EXTRA_HEALING: {
        const healamt = d(6, otyp === SPE_EXTRA_HEALING ? 8 : 4);

        reveal_invis = true;
        if (mtmp.data !== mons_zy[PM_PESTILENCE_ZP]) {
            const delta = mtmp.mhpmax - mtmp.mhp;

            wake = false; /* wakeup() makes the target angry */
            healmon_zp(mtmp, healamt, 0);
            /* plain healing must be blessed to cure blindness; extra
               healing only needs to not be cursed, so spell always cures
               [potions quaffed by monsters behave slightly differently;
               we use the rules for the hero here...] */
            if (skilled_spell || otyp === SPE_EXTRA_HEALING)
                await mcureblindness_bm(mtmp, canseemon(mtmp));
            if (canseemon(mtmp)) {
                if (disguised_mimic) {
                    if (is_obj_mappear_bm(mtmp, STRANGE_OBJECT)) {
                        /* it can do better now */
                        set_mimic_sym_bm(mtmp);
                        newsym(mtmp.mx, mtmp.my);
                    } else
                        await mimic_hit_msg(mtmp, otyp);
                } else
                    await pline(`${Monnam(mtmp)} looks${
                        otyp === SPE_EXTRA_HEALING ? " much" : ""} better.`);
            }
            if (mtmp.mtame && Role_if_bm(PM_HEALER_BM) && (delta > 0)) {
                more_experienced(Math.min(delta, healamt), 0);
                await newexplevel_bm();
            }
            if (mtmp.mtame || mtmp.mpeaceful) {
                adjalign_bm(Role_if_bm(PM_HEALER_BM) ? 1
                                                     : Math.sign(u.ualign.type));
            }
        } else { /* Pestilence */
            /* Pestilence will always resist; damage is half of (healamt/2) */
            await resist_async(mtmp, otmp.oclass, Math.trunc(healamt / 2), TELL_BM);
        }
        break;
    }
    case WAN_LIGHT: /* (broken wand) */
        if (await flash_hits_mon_bm(mtmp, otmp)) {
            learn_it = true;
            reveal_invis = true;
        }
        break;
    case WAN_SLEEP: /* (broken wand) */
        /* [wakeup() doesn't rouse victims of temporary sleep,
           so it's okay to leave `wake' set to TRUE here;
           revealing concealed mimic is handled by sleep_monst()] */
        reveal_invis = true;
        if (await sleep_monst_zp(mtmp, d(1 + otmp.spe, 12), WAND_CLASS))
            await slept_monst(mtmp);
        if (!Blind())
            learn_it = true;
        break;
    case SPE_STONE_TO_FLESH_BM:
        if (mtmp.data.mlet === S_GOLEM_ZY) {
            let mesg;
            const name = Monnam(mtmp); /* before possible polymorph */

            /* turn stone golem into flesh golem */
            if (monsndx_bm(mtmp.data) === PM_STONE_GOLEM_BM
                && (await newcham_rv(mtmp, mons_zy[PM_FLESH_GOLEM_BM], NO_NC_FLAGS_RV)))
                mesg = "turns to flesh!";
            else if (monsndx_bm(mtmp.data) === PM_FLESH_GOLEM_BM)
                mesg = "seems fleshier...";
            else
                mesg = "looks rather fleshy for a moment.";

            if (canseemon(mtmp))
                await pline(`${name} ${mesg}`);
        } else if (mtmp.data.mlet === S_MIMIC_BM
                   && ((M_AP_TYPE_BM(mtmp) === M_AP_FURNITURE_BM
                        && stone_furniture_type(mtmp.mappearance))
                       || (M_AP_TYPE_BM(mtmp) === M_AP_OBJECT_BM
                           && stone_object_type(mtmp.mappearance)))) {
            /* note: if that_is_a_mimic() doesn't get called to reveal the
               mimic, wakeup() below will call seemimic() */
            if (cansee(mtmp.mx, mtmp.my)) {
                set_msg_xy(mtmp.mx, mtmp.my);
                await that_is_a_mimic_bm(mtmp, MIM_REVEAL_BM | MIM_OMIT_WAIT_BM);
            }
        } else {
            wake = false;
        }
        break;
    case SPE_DRAIN_LIFE_BM:
        if (disguised_mimic)
            seemimic_rv(mtmp);
        dmg = monhp_per_lvl_rv(mtmp);
        if (dbldam)
            dmg *= 2;
        if (otyp === SPE_DRAIN_LIFE_BM)
            dmg = spell_damage_bonus(dmg);
        if (resists_drli_bm(mtmp)) {
            await shieldeff_mon(mtmp);
        } else if (!(await resist_async(mtmp, otmp.oclass, dmg, NOTELL_ZP))
                   && !DEADMONSTER_BM(mtmp)) {
            mtmp.mhp -= dmg;
            mtmp.mhpmax -= dmg;
            /* die if already level 0, regardless of hit points */
            if (DEADMONSTER_BM(mtmp) || mtmp.mhpmax <= 0 || mtmp.m_lev < 1) {
                await killed(mtmp);
            } else {
                mtmp.m_lev--;
                if (canseemon(mtmp))
                    await pline(`${Monnam(mtmp)} suddenly seems weaker!`);
            }
        }
        break;
    case WAN_NOTHING:
        wake = false;
        break;
    default:
        impossible(`What an interesting effect (${otyp})`);
        break;
    }
    if (wake && !DEADMONSTER_BM(mtmp)) {
        /* seemimic() is done by wakeup() and might unblock vision */
        await wakeup(mtmp, helpful_gesture ? false : true);
        await m_respond_bm(mtmp);
        if (mtmp.isshk && !(u.ushops && u.ushops[0]))
            hot_pursuit_bm(mtmp);
    }
    /* note: gb.bhitpos won't be set if swallowed, but that's okay since
     * reveal_invis will be false.  We can't use mtmp->mx, my since it
     * might be an invisible worm hit on the tail.
     */
    if (reveal_invis && !DEADMONSTER_BM(mtmp)) {
        if (cansee(g.bhitpos.x, g.bhitpos.y) && !canspotmon(mtmp))
            map_invisible(g.bhitpos.x, g.bhitpos.y);
    }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(otmp);
    return ret;
}

// C ref: zap.c release_hold()
/* hero is held by a monster or engulfed or holding a monster and has zapped
   opening/unlocking magic at holder/engulfer/holdee or at self */
export async function release_hold() {
    const u = game.u;
    const mtmp = u.ustuck;

    if (!mtmp) {
        impossible("release_hold when not held?");
    } else if (u.uswallow) { /* possible for sticky hero to be swallowed */
        if (digests(mtmp.data)) {
            if (!Blind())
                await pline(`${Monnam(mtmp)} opens its mouth!`);
            else
                await You_feel("a sudden rush of air!");
        }
        /* gives "you get regurgitated" or "you get expelled from <mon>" */
        await expels_bm(mtmp, mtmp.data, true);
    } else if (sticks_bm(game.youmonst.data)) {
        /* order matters if 'holding' status condition is enabled;
           set_ustuck() will set flag for botl update, You() pline will
           trigger a status update with "UHold" removed */
        set_ustuck_bm(null);
        await You(`release ${mon_nam(mtmp)}.`);
    } else { /* held but not swallowed */
        let relbuf;

        await unstuck_bm(u.ustuck);
        if (!nohands(mtmp.data))
            relbuf = `from ${s_suffix(mon_nam(mtmp))} grasp`;
        else
            relbuf = `by ${mon_nam(mtmp)}`;
        await You(`are released ${relbuf}.`);
    }
}

// C ref: zap.c probe_objchain()
function probe_objchain(chain) {
    for (const otmp of chain) {
        observe_object(otmp, Hallucination()); /* treat as "seen" */
        if (Is_container_bm(otmp) || otmp.otyp === STATUE_ZB) {
            otmp.lknown = 1;
            if (!SchroedingersBox(otmp))
                otmp.cknown = 1;
        } else if (otmp.otyp === TIN_BM)
            otmp.known = 1;
    }
}

// C ref: zap.c probe_monster()
export async function probe_monster(mtmp) {
    await mstatusline_bm(mtmp);
    if (game.notonhead)
        return; /* don't show minvent for long worm tail */

    if (mtmp.minvent && mtmp.minvent.length) {
        probe_objchain(mtmp.minvent.slice().reverse()); /* C chain order */
        await display_minventory_bm(mtmp, MINV_ALL_BM | MINV_NOLET_BM | PICK_NONE_BM,
                                    null);
    } else {
        await pline(`${noit_Monnam_bm(mtmp)} is not carrying anything${
            engulfing_u_zp(mtmp) ? " besides you" : ""}.`);
    }
}

// C ref: zap.c bhito() -- object obj was hit by the effect of the wand
// or spell otmp; returns nonzero if obj was affected
export async function bhito(obj, otmp) {
    const g = game;
    const u = g.u;
    let res = 1; /* affected object by default */
    let learn_it = false;

    /* fundamental: a wand effect hitting itself doesn't do anything;
       otherwise we need to guard against accessing otmp after something
       strange has happened to it (along the lines of polymorph or
       stone-to-flesh [which aren't good examples since polymorph wands
       aren't affected by polymorph zaps and stone-to-flesh isn't
       available in wand form, but the concept still applies...]) */
    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        /* The bypass bit is currently only used as follows: (see C) */
        if (g.context.bypasses) {
            return 0;
        } else {
            /* debugpline1("%s for a moment.", Tobjnam(obj, "pulsate")) */
            obj.bypass = 0;
        }
    }

    /*
     * Some parts of this function expect the object to be on the floor
     * obj->{ox,oy} to be valid.  The exception to this (so far) is
     * for the STONE_TO_FLESH spell.
     */
    if (obj === g.uball) {
        res = 0;
    } else if (obj === g.uchain) {
        if (otmp.otyp === WAN_OPENING || otmp.otyp === SPE_KNOCK) {
            learn_it = true;
            await unpunish();
        } else
            res = 0;
    } else
        switch (otmp.otyp) {
        case WAN_POLYMORPH:
        case SPE_POLYMORPH:
            if (obj_unpolyable(obj)) {
                res = 0;
                break;
            }
            /* KMH, conduct */
            if (!u.uconduct.polypiles++)
                livelog_printf(LL_CONDUCT, `polymorphed ${uhis()} first object`);

            /* any saved lock context will be dangerously obsolete */
            if (Is_box(obj))
                await boxlock_zy(obj, otmp);

            if (obj_shudders(obj)) {
                const top = level_objects_at(u.ux, u.uy)[0] || null;
                const cover = ((obj === top) && u.uundetected
                               && (g.youmonst.data.mflags1 & M1_CONCEAL) !== 0);

                if (cansee(obj.ox, obj.oy))
                    learn_it = true;
                do_osshock(obj);
                /* eek - your cover might have been blown */
                if (cover)
                    await hideunder_async(g.youmonst);
                break;
            }
            obj = await poly_obj(obj, STRANGE_OBJECT);
            newsym(obj.ox, obj.oy);
            break;
        case WAN_STRIKING:
        case SPE_FORCE_BOLT: {
            /* learn the type if you see or hear something break
               (the sound could be implicit) */
            let maybelearnit = cansee(obj.ox, obj.oy) || !Deaf();
            if (obj.otyp === BOULDER) {
                /* Soundeffect(se_crumbling_sound, 75) */
                if (cansee(obj.ox, obj.oy))
                    await pline_The("boulder falls apart.");
                else
                    await You_hear("a crumbling sound.");
                await fracture_rock(obj);
            } else if (obj.otyp === STATUE_ZB) {
                if (await break_statue(obj)) {
                    if (cansee(obj.ox, obj.oy)) {
                        if (Hallucination())
                            await pline_The(`${rndmonnam(null)} shatters.`);
                        else
                            await pline_The("statue shatters.");
                    } else
                        await You_hear("a crumbling sound.");
                }
            } else {
                const oox = obj.ox, ooy = obj.oy;

                if (g.context.mon_moving ? !(await breaks_zb(obj, oox, ooy))
                                         : !(await hero_breaks_zb(obj, oox, ooy, 0)))
                    maybelearnit = false; /* nothing broke */
                else
                    /* obj broke; force redisplay in case it was the only--
                       or last--item under non-breaking pile-top; top item
                       here might now be a lone object rather than a pile */
                    newsym_force_zb(oox, ooy);
                res = 0;
            }
            if (maybelearnit)
                learn_it = true;
            break;
        }
        case WAN_SLOW_MONSTER: /* no effect on objects */
        case SPE_SLOW_MONSTER:
        case WAN_SPEED_MONSTER:
        case WAN_NOTHING:
        case SPE_HEALING:
        case SPE_EXTRA_HEALING:
            res = 0;
            break;
        case WAN_TELEPORTATION_BM:
        case SPE_TELEPORT_AWAY_BM: {
            const ox = obj.ox, oy = obj.oy;

            await rloco(obj);
            maybe_unhide_at(ox, oy);
            break;
        }
        default:
            throw new Error(`bhito(): wand/spell ${otmp.otyp} hitting an object not ported yet`);
        }
    /* if effect was observable then discover the wand type provided
       that the wand itself has been seen */
    if (learn_it)
        learnwand(otmp);
    return res;
}


/* C ref: obj.h unpolyable() */
function unpolyable(o) {
    return o.otyp === WAN_POLYMORPH || o.otyp === SPE_POLYMORPH
        || o.otyp === POT_POLYMORPH || o.otyp === AMULET_OF_UNCHANGING;
}

// C ref: zap.c drain_item()
/* Remove a positive enchantment or charge from obj,
 * possibly carried by you or a monster
 */
export function drain_item(obj, by_you) {
    const u = game.u;
    let u_ring;

    /* Is this a charged/enchanted object? */
    if (!obj
        || (!objects[obj.otyp].oc_charged && obj.oclass !== WEAPON_CLASS
            && obj.oclass !== ARMOR_CLASS && !is_weptool_di(obj))
        || obj.spe <= 0)
        return false;
    if (defends_di(AD_DRLI_DI, obj) || defends_when_carried_di(AD_DRLI_DI, obj)
        || obj_resists(obj, 10, 90))
        return false;

    /* Charge for the cost of the object */
    if (by_you)
        costly_alteration_di(obj, COST_DRAIN_DI);

    /* Drain the object and any implied effects */
    obj.spe--;
    u_ring = (obj === game.uleft) || (obj === game.uright);
    switch (obj.otyp) {
    case RIN_GAIN_STRENGTH_DI:
        if ((obj.owornmask & W_RING) && u_ring) {
            u.abon.a[A_STR]--;
            game.disp_botl = true;
        }
        break;
    case RIN_GAIN_CONSTITUTION_DI:
        if ((obj.owornmask & W_RING) && u_ring) {
            u.abon.a[A_CON_DI]--;
            game.disp_botl = true;
        }
        break;
    case RIN_ADORNMENT_DI:
        if ((obj.owornmask & W_RING) && u_ring) {
            u.abon.a[A_CHA_DI]--;
            game.disp_botl = true;
        }
        break;
    case RIN_INCREASE_ACCURACY_DI:
        if ((obj.owornmask & W_RING) && u_ring)
            u.uhitinc--;
        break;
    case RIN_INCREASE_DAMAGE_DI:
        if ((obj.owornmask & W_RING) && u_ring)
            u.udaminc--;
        break;
    case RIN_PROTECTION_DI:
        if (u_ring)
            game.disp_botl = true; /* bot() will recalc u.uac */
        break;
    case HELM_OF_BRILLIANCE_DI:
        if ((obj.owornmask & W_ARMH) && (obj === game.uarmh)) {
            u.abon.a[A_INT_DI]--;
            u.abon.a[A_WIS]--;
            game.disp_botl = true;
        }
        break;
    case GAUNTLETS_OF_DEXTERITY_DI:
        if ((obj.owornmask & W_ARMG) && (obj === game.uarmg)) {
            u.abon.a[A_DEX_DI]--;
            game.disp_botl = true;
        }
        break;
    default:
        break;
    }
    if (game.disp_botl)
        bot_di();
    /* if (carried(obj)) update_inventory(): no perm_invent */
    return true;
}

// C ref: zap.c obj_shudders()
export function obj_shudders(obj) {
    let zap_odds;

    if (game.context.bypasses && obj.bypass)
        return false;

    if (obj.oclass === WAND_CLASS)
        zap_odds = 3; /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3; /* half-life = 2 zaps */
    else if (obj.blessed)
        zap_odds = 12; /* half-life = 8 zaps */
    else
        zap_odds = 8; /* half-life = 6 zaps */

    /* adjust for "large" quantities of identical things */
    if (obj.quan > 4)
        zap_odds = Math.trunc(zap_odds / 2);

    return !rn2(zap_odds);
}


// C ref: zap.c do_osshock() -- assumes obj is on the floor
export function do_osshock(obj) {
    const g = game;

    /* MAIL_STRUCTURES: SCR_MAIL isn't in this build */
    g.obj_zapped = true;

    if (g.poly_zapped < 0) {
        /* some may metamorphose */
        for (let i = obj.quan; i; i--)
            if (!rn2(Luck() + 45)) {
                g.poly_zapped = objects[obj.otyp].oc_material;
                break;
            }
    }

    /* if quan > 1 then some will survive intact */
    if (obj.quan > 1) {
        if (obj.quan > LARGEST_INT)
            obj = splitobj(obj, rnd(30000));
        else
            obj = splitobj(obj, rnd(obj.quan - 1));
    }

    /* appropriately add damage to bill */
    if (costly_spot(obj.ox, obj.oy))
        throw new Error('do_osshock(): billing for shop goods not ported yet');

    /* zap the object */
    delobj(obj);
}

// C ref: zap.c obj_unpolyable() -- returns TRUE if obj resists polymorphing
export function obj_unpolyable(obj) {
    return (unpolyable(obj)
            || obj === game.uball || obj === game.uskin
            || obj_resists(obj, 5, 95));
}

/* classes of items whose current charge count carries over across polymorph
 */
const charged_objs = [WAND_CLASS, WEAPON_CLASS, ARMOR_CLASS];

// C ref: mkobj.c replace_object() -- the floor and free cases
function replace_object(obj, otmp) {
    otmp.where = obj.where;
    switch (obj.where) {
    case 'OBJ_FREE':
        /* do nothing */
        break;
    case 'OBJ_FLOOR': {
        /* otmp takes obj's place in fobj and in the pile at <ox,oy> */
        const fobj = game.level.objects;
        otmp.ox = obj.ox;
        otmp.oy = obj.oy;
        const i = fobj.indexOf(otmp);
        if (i >= 0)
            fobj.splice(i, 1);
        fobj.splice(fobj.indexOf(obj), 1, otmp);
        obj.where = 'OBJ_FREE'; /* extract_nobj() leaves obj free */
        break;
    }
    case 'OBJ_MINVENT': {
        /* otmp takes obj's place in the carrier's minvent; extract_nobj()
           leaves obj free */
        const minvent = obj.ocarry.minvent;
        otmp.ocarry = obj.ocarry;
        minvent.splice(minvent.indexOf(obj), 1, otmp);
        obj.where = 'OBJ_FREE';
        obj.ocarry = null;
        break;
    }
    default:
        throw new Error(`replace_object(): where=${obj.where} not ported yet`);
    }
}

// C ref: zap.c fracture_rock()
/* used by buzz(); also used by scatter() and by monster-on-boulder code */
export async function fracture_rock(obj) { /* no texts here! */
    const by_you = !game.context.mon_moving;
    const loc = by_you ? get_obj_location(obj, 0) : null;

    if (by_you && loc && costly_spot(loc[0], loc[1])) {
        const [x, y] = loc;
        const shkpp = { v: null };
        const objroom = in_rooms(x, y, SHOPBASE).charCodeAt(0) || 0;

        if (billable(shkpp, obj, objroom, false)) {
            /* shop message says "you owe <shk> <$> for it!" so we need
               to precede that with a message explaining what "it" is */
            await You(`fracture ${s_suffix(shkname(shkpp.v))} ${xname(obj)}.`);
            /* breakobj won't destroy fracturing statue or boulder but
               will charge for shop goods */
            await breakobj(obj, x, y, true, false);
        }
    }
    if (by_you && obj.otyp === BOULDER)
        sokoban_guilt();

    obj.otyp = ROCK;
    obj.oclass = GEM_CLASS;
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.dknown = obj.bknown = obj.rknown = 0;
    obj.known = objects[obj.otyp].oc_uses_known ? 0 : 1;
    delete obj.oextra; /* dealloc_oextra(obj) */

    if (obj.where === 'OBJ_FLOOR') {
        obj_extract_self(obj); /* move rocks back on top */
        place_object(obj, obj.ox, obj.oy);
        if (!does_block(obj.ox, obj.oy, game.level.at(obj.ox, obj.oy))) {
            unblock_point(obj.ox, obj.oy);
            /* need immediate update in case this is a striking/force bolt
               zap that is about hit more things */
            vision_recalc(0);
        }
        if (cansee(obj.ox, obj.oy))
            newsym(obj.ox, obj.oy);
    }
}

// C ref: zap.c break_statue()
/* handle statue hit by striking/force bolt/pick-axe */
export async function break_statue(obj) {
    /* [obj is assumed to be on floor, so no get_obj_location() needed] */
    const trap = t_at(obj.ox, obj.oy);
    let item;
    const by_you = !game.context.mon_moving;

    if (trap && trap.ttyp === STATUE_TRAP
        && await activate_statue_trap(trap, obj.ox, obj.oy, true))
        return false;
    /* drop any objects contained inside the statue */
    while ((item = (obj.cobj && obj.cobj.length) ? obj.cobj[0] : null) !== null) {
        obj_extract_self(item);
        place_object(item, obj.ox, obj.oy);
    }
    if (by_you && Role_if(PM_ARCHEOLOGIST)
        && (obj.spe & CORPSTAT_HISTORIC)) {
        await You_feel("guilty about damaging such a historic statue.");
        adjalign(-1);
    }
    obj.spe = 0;
    await fracture_rock(obj);
    return true;
}

// C ref: zap.c poly_obj()
/*
 * Polymorph the object to the given object ID.  If the ID is STRANGE_OBJECT
 * then pick random object from the source's class (this is the standard
 * "polymorph" case).  If ID is set to a specific object, inhibit fusing
 * n objects into 1.  This could have been added as a flag, but currently
 * it is tied to not being the standard polymorph case. The new polymorphed
 * object replaces obj in its link chains.  Return value is a pointer to
 * the new object.
 */
export async function poly_obj(obj, id) {
    const g = game;
    let otmp;
    let ox = 0, oy = 0;
    const can_merge = (id === STRANGE_OBJECT);
    const obj_location = obj.where;

    if (obj.otyp === BOULDER)
        sokoban_guilt();
    if (id === STRANGE_OBJECT) { /* preserve symbol */
        let try_limit = 3;
        let magic_obj = !!objects[obj.otyp].oc_magic;

        if (obj.otyp === UNICORN_HORN && obj.degraded_horn)
            magic_obj = false;
        /* Try up to 3 times to make the magic-or-not status of
           the new item the same as the old item. */
        otmp = null;
        do {
            if (otmp)
                delobj(otmp);
            otmp = mkobj(obj.oclass, false);
        } while (--try_limit > 0
                 && !!objects[otmp.otyp].oc_magic !== magic_obj);
    } else {
        /* literally replace obj with this new thing */
        otmp = mksobj(id, false, false);
        /* Actually more things use corpsenm but they polymorph differently */
        const USES_CORPSENM = (typ) =>
            (typ === CORPSE || typ === STATUE || typ === FIGURINE);

        if (USES_CORPSENM(obj.otyp) && USES_CORPSENM(id))
            set_corpsenm(otmp, obj.corpsenm);
    }

    /* preserve quantity */
    otmp.quan = obj.quan;
    /* preserve the shopkeeper's (lack of) interest */
    otmp.no_charge = obj.no_charge;
    /* preserve inventory letter if in inventory */
    if (obj_location === 'OBJ_INVENT')
        otmp.invlet = obj.invlet;
    /* MAIL_STRUCTURES: SCR_MAIL isn't in this build */

    /* avoid abusing eggs laid by you */
    if (obj.otyp === EGG && obj.spe)
        throw new Error('poly_obj(): hero-laid egg not ported yet');

    /* keep special fields (including charges on wands) */
    if (charged_objs.includes(otmp.oclass))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;

    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (erosion_matters(otmp)) {
        if (is_flammable(otmp) || is_rustprone(otmp) || is_crackable(otmp))
            otmp.oeroded = obj.oeroded;
        if (is_corrodeable(otmp) || is_rottable(otmp))
            otmp.oeroded2 = obj.oeroded2;
        if (is_damageable(otmp))
            otmp.oerodeproof = obj.oerodeproof;
    }

    /* Keep chest/box traps and poisoned ammo if we may */
    if (obj.otrapped && Is_box(otmp))
        otmp.otrapped = 1;
    if (obj.otrapped /* opoisoned */ && is_poisonable(otmp))
        otmp.otrapped /* opoisoned */ = 1;

    if (id === STRANGE_OBJECT && obj.otyp === CORPSE) {
        /* turn crocodile corpses into shoes */
        if (obj.corpsenm === PM_CROCODILE) {
            otmp.otyp = LOW_BOOTS;
            otmp.oclass = ARMOR_CLASS;
            otmp.spe = 0;
            otmp.oeroded = 0;
            otmp.oerodeproof = 1;
            otmp.quan = 1;
            otmp.cursed = 0;
        }
    }
    if (obj.otyp === LEASH && obj.leashmon) {
        if (otmp.otyp === LEASH) {
            otmp.leashmon = obj.leashmon;
            /* clear m_id before delobj(), to avoid o_unleash() by obfree() */
            obj.leashmon = 0;
        } else {
            /* obfree() would do this if we didn't do it here */
            o_unleash(obj);
        }
    }

    /* no box contents --KAA */
    if (Has_contents(otmp) && otmp.cobj.length)
        delete_contents(otmp);

    /* 'n' merged objects may be fused into 1 object */
    if (otmp.quan > 1 && (!objects[otmp.otyp].oc_merge
                          || (can_merge && otmp.quan > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass) {
    case TOOL_CLASS:
        if (otmp.otyp === MAGIC_LAMP) {
            otmp.otyp = OIL_LAMP;
            otmp.age = 1500; /* "best" oil lamp possible */
        } else if (otmp.otyp === MAGIC_MARKER) {
            otmp.recharged = 1; /* degraded quality */
        }
        /* don't care about the recharge count of other tools */
        break;

    case WAND_CLASS:
        while (otmp.otyp === WAN_WISHING || otmp.otyp === WAN_POLYMORPH)
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        /* altering the object tends to degrade its quality
           (analogous to spellbook `read count' handling) */
        if ((otmp.recharged || 0) < rn2(7)) /* recharge_limit */
            otmp.recharged = (otmp.recharged || 0) + 1;
        break;

    case POTION_CLASS:
        while (otmp.otyp === POT_POLYMORPH)
            otmp.otyp = rnd_class(POT_GAIN_ABILITY, POT_WATER);
        /* potions of oil use obj->age field differently from other potions */
        if (otmp.otyp === POT_OIL || obj.otyp === POT_OIL)
            fixup_oil(otmp, obj);
        break;

    case SPBOOK_CLASS:
        while (otmp.otyp === SPE_POLYMORPH)
            otmp.otyp = rnd_class(g.bases[SPBOOK_CLASS], SPE_BLANK_PAPER);
        /* reduce spellbook abuse; non-blank books degrade;
           5.0: novels don't use spestudied so shouldn't degrade to blank
           (but don't force spestudied to zero for them since a non-zero
           value could get passed along to a future polymorph) */
        if (otmp.otyp !== SPE_BLANK_PAPER && otmp.otyp !== SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied || 0) + 1;
            if (otmp.spestudied > MAX_SPELL_STUDY) {
                otmp.otyp = SPE_BLANK_PAPER;
                /* writing a new book over it will yield an unstudied
                   one; re-polymorphing this one as-is may or may not
                   get something non-blank */
                otmp.spestudied = rn2(otmp.spestudied);
            }
        }
        break;

    case GEM_CLASS:
        if (otmp.quan > rnd(4)
            && objects[obj.otyp].oc_material === MINERAL
            && objects[otmp.otyp].oc_material !== MINERAL) {
            otmp.otyp = ROCK; /* transmutation backfired */
            otmp.quan = Math.trunc(otmp.quan / 2); /* some material has been lost */
        }
        break;
    }

    /* update the weight */
    otmp.owt = weight(otmp);

    /*
     * ** we are now done adjusting the object (except possibly wearing it) **
     */

    const oloc = get_obj_location(obj, BURIED_TOO | CONTAINED_TOO);
    if (oloc)
        [ox, oy] = oloc;
    const old_wornmask = (obj.owornmask || 0) & ~(W_ART | W_ARTI);
    if (obj_location !== 'OBJ_FLOOR' && obj_location !== 'OBJ_MINVENT')
        /* OBJ_INVENT: freeinv_core(), addinv_core1/2() and the worn-item
           handling (old_wornmask); OBJ_CONTAINED, OBJ_BURIED */
        throw new Error(`poly_obj(): object at where=${obj_location} (worn ${old_wornmask}) not ported yet`);
    /* swap otmp for obj */
    replace_object(obj, otmp);
    if (obj_location === 'OBJ_FLOOR') {
        if (obj.otyp === BOULDER && otmp.otyp !== BOULDER) {
            if (!does_block(ox, oy, g.level.at(ox, oy)))
                unblock_point(ox, oy);
        } else if (obj.otyp !== BOULDER && otmp.otyp === BOULDER) {
            /* leaving boulder in liquid would trigger sanity_check warning */
            if (is_pool(ox, oy) || is_lava(ox, oy)) /* is_pool_or_lava() */
                await fracture_rock(otmp);
            if (does_block(ox, oy, g.level.at(ox, oy)))
                block_point(ox, oy);
        }
    }

    /* note: if otmp is gone, billing for it was handled by useup() */
    if (((otmp && otmp.where !== 'OBJ_INVENT') || obj.unpaid)
        && costly_spot(ox, oy)) {
        const shkp = shop_keeper(in_rooms(ox, oy, SHOPBASE).charCodeAt(0) || 0);

        if ((!obj.no_charge
             || (Has_contents(obj)
                 && (contained_cost(obj, shkp, 0, false, false) !== 0)))
            && inhishop(shkp)) {
            if (shkp.mpeaceful) {
                if (g.u.ushops && g.u.ushops.length
                    && ((in_rooms(g.u.ux, g.u.uy, 0).charCodeAt(0) || 0)
                        === (in_rooms(shkp.mx, shkp.my, 0).charCodeAt(0) || 0))
                    && !costly_spot(g.u.ux, g.u.uy)) {
                    await make_angry_shk(shkp, ox, oy);
                } else {
                    await pline(`${Shknam(shkp)} gets angry!`);
                    hot_pursuit(shkp);
                }
            } else
                await Norep(`${Shknam(shkp)} is furious!`);
        }
    }
    delobj(obj);
    return otmp;
}

// C ref: zap.c polyuse()
/* Use up at least minwt number of things made of material mat.
 * There's also a chance that other stuff will be used up.  Finally,
 * there's a random factor here to keep from always using the stuff
 * at the top of the pile.
 */
async function polyuse(objhdr, mat, minwt) {
    const g = game;
    if (!objhdr)
        return;
    const pile = level_objects_at(objhdr.ox, objhdr.oy);

    for (let i = pile.indexOf(objhdr); minwt > 0 && i >= 0 && i < pile.length; i++) {
        const otmp = pile[i]; /* otmp2 = otmp->nexthere */
        if (g.context.bypasses && otmp.bypass)
            continue;
        if (otmp === g.uball || otmp === g.uchain)
            continue;
        if (obj_resists(otmp, 0, 0))
            continue; /* preserve unique objects */

        if ((objects[otmp.otyp].oc_material === mat)
            === (rn2(minwt + 1) !== 0)) {
            /* appropriately add damage to bill */
            if (costly_spot(otmp.ox, otmp.oy)) {
                if (g.u.ushops && g.u.ushops.length)
                    await addtobill(otmp, false, false, false);
                else
                    await stolen_value(otmp, otmp.ox, otmp.oy, false, false);
            }
            if (otmp.quan < LARGEST_INT)
                minwt -= otmp.quan;
            else
                minwt = 0;
            delobj(otmp);
        }
    }
}

// C ref: zap.c create_polymon()
/*
 * Polymorph some of the stuff in this pile into a monster, preferably
 * a golem of the kind okind.
 */
async function create_polymon(obj, okind) {
    const g = game;
    let mdat = null;
    let mtmp;
    let material;
    let pm_index;

    if (g.context.bypasses && obj) {
        /* this is approximate because the "no golems" !obj->nexthere
           check below doesn't understand bypassed objects; but it
           should suffice since bypassed objects always end up as a
           consecutive group at the top of their pile */
        const pile = level_objects_at(obj.ox, obj.oy);
        let i = pile.indexOf(obj);
        while (obj && obj.bypass)
            obj = pile[++i] || null; /* obj->nexthere */
    }

    /* no golems if you zap only one object -- not enough stuff */
    if (!obj)
        return;
    {
        const pile = level_objects_at(obj.ox, obj.oy);
        const nexthere = pile[pile.indexOf(obj) + 1] || null;
        if (!nexthere && obj.quan === 1)
            return;
    }

    /* some of these choices are arbitrary */
    switch (okind) {
    case IRON:
    case METAL:
    case MITHRIL:
        pm_index = M.PM_IRON_GOLEM;
        material = "metal ";
        break;
    case COPPER:
    case SILVER:
    case PLATINUM:
    case GEMSTONE:
    case MINERAL:
        pm_index = rn2(2) ? M.PM_STONE_GOLEM : M.PM_CLAY_GOLEM;
        material = "lithic ";
        break;
    case 0:
    case FLESH:
        /* there is no flesh type, but all food is type 0, so we use it */
        pm_index = M.PM_FLESH_GOLEM;
        material = "organic ";
        break;
    case WOOD:
        pm_index = M.PM_WOOD_GOLEM;
        material = "wood ";
        break;
    case LEATHER:
        pm_index = M.PM_LEATHER_GOLEM;
        material = "leather ";
        break;
    case CLOTH:
        pm_index = M.PM_ROPE_GOLEM;
        material = "cloth ";
        break;
    case BONE:
        pm_index = M.PM_SKELETON; /* nearest thing to "bone golem" */
        material = "bony ";
        break;
    case GOLD:
        pm_index = M.PM_GOLD_GOLEM;
        material = "gold ";
        break;
    case GLASS:
        pm_index = M.PM_GLASS_GOLEM;
        material = "glassy ";
        break;
    case PAPER:
        pm_index = M.PM_PAPER_GOLEM;
        material = "paper ";
        break;
    default:
        /* if all else fails... */
        pm_index = M.PM_STRAW_GOLEM;
        material = "";
        break;
    }

    if (!(g.mvitals[pm_index].mvflags & G_GENOD))
        mdat = mons[pm_index];

    mtmp = makemon(mdat, obj.ox, obj.oy, MM_NOMSG);
    await polyuse(obj, okind, mons[pm_index].cwt);

    if (mtmp && cansee(mtmp.mx, mtmp.my)) {
        await pline(`Some ${material}objects meld, and ${
            a_monnam(mtmp)} arises from the pile!`);
    }
}

// C ref: zap.c get_mon_location()
/* returns [x, y], or null for a migrating or buried monster (C returns
   FALSE with *xp = *yp = 0) */
export function get_mon_location(
    mon,
    locflags) /* non-zero means get location even if monster is buried */
{
    const u = game.u;
    if (mon === game.youmonst || (u.usteed && mon === u.usteed)) {
        return [u.ux, u.uy];
    } else if (mon.mx > 0 && (!mon.mburied || locflags)) {
        return [mon.mx, mon.my];
    } else { /* migrating or buried */
        return null;
    }
}

// C ref: zap.c bhitpile()
export async function bhitpile(
    obj,          /* wand or fake spellbook for type of zap */
    fhito,        /* callback for each object being hit */
    tx, ty,       /* target location */
    zz) {         /* direction for up/down zaps */
    const g = game;
    const u = g.u;
    let otmp;
    let first;
    let hitanything = 0;
    /* svl.level.objects[tx][ty] chain, top of the pile first */
    const pile_at = () => level_objects_at(tx, ty);

    if (!pile_at().length)
        return 0;

    /* if hiding underneath an object and zapping up or down, the top item
       is either the only thing hit (up) or is skipped (down) */
    const hidingunder = (zz !== 0 && u.uundetected
                         && (g.youmonst.data.mflags1 & M1_CONCEAL) !== 0);
    first = true;

    if (obj.otyp === SPE_FORCE_BOLT || obj.otyp === WAN_STRIKING) {
        const t = t_at(tx, ty);
        const topofpile = pile_at()[0] || null; /* svl.level.objects[tx][ty] */

        /* We can't settle for the default calling sequence of
           bhito(otmp) -> break_statue(otmp) -> activate_statue_trap(ox,oy)
           because that last call might end up operating on our `next_obj'
           (below), rather than on the current object, if it happens to
           encounter a statue which mustn't become animated. */
        if (t && t.ttyp === STATUE_TRAP
            && await activate_statue_trap(t, tx, ty, true))
            learnwand(obj);
        /* assume zapping up or down while hiding under the top item can
           still activate the trap even if it's below (when zapping up)
           or above (when zapping down) */
        if ((pile_at()[0] || null) !== topofpile)
            first = false; /* top item was statue which activated */
    }

    g.poly_zapped = -1;
    /* next_obj = otmp->nexthere is taken before each call, so iterate
       over a snapshot of the pile */
    for (otmp of pile_at()) {
        if (hidingunder) {
            if (first) {
                first = false; /* reset for next item */
                if (zz > 0) /* down when hiding-under skips first item */
                    continue;
            } else {
                /* !first */
                if (zz < 0) /* up when hiding-under skips rest of pile */
                    continue;
            }
        }
        if (otmp.where !== 'OBJ_FLOOR' || otmp.ox !== tx || otmp.oy !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }

    if (g.poly_zapped >= 0)
        await create_polymon(pile_at()[0] || null, g.poly_zapped);

    /* when boulders are present they're expected to be on top; with
       multiple boulders it's possible for some to have been changed into
       non-boulders (polymorph, stone-to-flesh) while ones beneath resist,
       so re-stack pile if there are any non-boulders above boulders */
    let prevotyp = BOULDER;
    for (otmp of pile_at()) {
        if (otmp.otyp === BOULDER && prevotyp !== BOULDER)
            throw new Error('bhitpile(): recreate_pile_at() not ported yet');
        prevotyp = otmp.otyp;
    }

    if (hidingunder) /* pile might have been destroyed or dispersed */
        maybe_unhide_at(tx, ty);

    await fill_pit(tx, ty);

    return hitanything;
}

// C ref: dbridge.c find_drawbridge() -- returns the drawbridge location
// (in *pos) for a drawbridge span or its wall, or null
export function find_drawbridge(x, y) {
    const lev = (xx, yy) => game.level.at(xx, yy);

    if (IS_DRAWBRIDGE(lev(x, y).typ))
        return { x, y };
    /* is_drawbridge_wall() */
    if (lev(x, y).typ !== DOOR && lev(x, y).typ !== DBWALL)
        return null;
    const dbdir = (xx, yy) => (lev(xx, yy).drawbridgemask ?? 0) & DB_DIR;
    if (isok(x + 1, y) && IS_DRAWBRIDGE(lev(x + 1, y).typ)
        && dbdir(x + 1, y) === DB_WEST)
        return { x: x + 1, y };
    if (isok(x - 1, y) && IS_DRAWBRIDGE(lev(x - 1, y).typ)
        && dbdir(x - 1, y) === DB_EAST)
        return { x: x - 1, y };
    if (isok(x, y - 1) && IS_DRAWBRIDGE(lev(x, y - 1).typ)
        && dbdir(x, y - 1) === DB_SOUTH)
        return { x, y: y - 1 };
    if (isok(x, y + 1) && IS_DRAWBRIDGE(lev(x, y + 1).typ)
        && dbdir(x, y + 1) === DB_NORTH)
        return { x, y: y + 1 };
    return null;
}

// C ref: zap.c zap_map() -- occurs before hitting monsters or objects and
// handles wands or spells that don't dish out 'elemental' damage
export async function zap_map(x, y, obj) { /* zapped wand, or book for cast spell */
    const u = game.u;
    const ttmp = t_at(x, y);
    let dbx = x, dby = y; /* might be changed by drawbridge handling */
    let learn_it = false;

    /* cancellation: maybe_explode_trap(ttmp, obj, &learn_it) */
    if (ttmp && (obj.otyp === WAN_CANCELLATION || obj.otyp === SPE_CANCELLATION))
        throw new Error('zap_map(): maybe_explode_trap() not ported yet');

    if (u.dz > 0) { /* zapping down */
        const e = engr_at(x, y);
        if (e && e.engr_type !== HEADSTONE)
            throw new Error('zap_map(): zapping down at an engraving not ported yet');
    } else if (!u.dz) {
        const ltyp = game.level.at(x, y).typ;
        const db = find_drawbridge(dbx, dby);

        if (db) {
            dbx = db.x, dby = db.y;
            switch (obj.otyp) {
            case WAN_OPENING:
            case SPE_KNOCK:
                /* dbwall: 'closed door' of raised drawbridge */
                if (is_db_wall(x, y)) {
                    if (cansee(dbx, dby) || cansee(x, y))
                        learn_it = true;
                    await open_drawbridge(dbx, dby);
                }
                break;
            case WAN_LOCKING:
            case SPE_WIZARD_LOCK:
                /* drawbridge_down: span of lowered drawbridge */
                if ((cansee(dbx, dby) || cansee(x, y))
                    && game.level.at(dbx, dby).typ === DRAWBRIDGE_DOWN_ZP)
                    learn_it = true;
                await close_drawbridge(dbx, dby);
                break;
            case WAN_STRIKING:
            case SPE_FORCE_BOLT:
                /* !drawbridge_up: not spot in front of raised bridge,
                   so either span of lowered bridge or portcullis */
                if (ltyp !== DRAWBRIDGE_UP_ZP) {
                    learn_it = true;
                    await destroy_drawbridge(dbx, dby);
                }
                break;
            }
        } /* find_drawbridge */
    } /* !u.uz */

    if (obj.otyp === WAN_PROBING) {
        /*
         * Probing, either up/down or lateral.
         */
        const lv = game.level;

        /* map terrain; might reveal a special room which is already within
           view that hasn't been entered yet */
        const oldtyp = lv.lastseentyp?.[x]?.[y] ?? 0;
        const oldglyph = glyph_at(x, y);
        show_map_spot(x, y, false);
        if (oldtyp !== (lv.lastseentyp?.[x]?.[y] ?? 0) || oldglyph !== glyph_at(x, y)) {
            /* TODO: ought to give some message */
            learn_it = true;
        }
        const lev = lv.at(x, y);
        const ltyp = (lev.typ === DRAWBRIDGE_UP_ZP) /* SURFACE_AT(x, y) */
            ? db_under_typ(lev.drawbridgemask || 0) : lev.typ;
        /* secret door gets revealed, converted into regular door */
        if (ltyp === SDOOR) {
            cvt_sdoor_to_door(lev); /* .typ = DOOR */
            recalc_block_point(x, y);
            newsym(x, y);
            if (cansee(x, y)) {
                await pline("Probing reveals a secret door.");
                learn_it = true;
            } else if (Is_rogue_level(u.uz)) { /* from zap_over_floor() */
                await draft_message(false); /* "You feel a draft." (open doorway) */
            }

        /* secret corridor likewise, although only ones within view will
           still be secret; for the !cansee(x,y) case, show_map_spot()
           above has already converted the spot to regular corridor */
        } else if (ltyp === SCORR) {
            lev.typ = CORR;
            unblock_point(x, y);
            newsym(x, y);
            await pline("Probing exposes a secret corridor.");
            learn_it = true;

        /* if on or over ice, describe it ("solid ice", "thin ice", &c);
           likewise for furniture in case hero is levitating while blind */
        } else if (ltyp === ICE || IS_FURNITURE(ltyp)) {
            if (u.dz > 0) { /* down, which also means x,y == u.ux,u.uy */
                await force_decor(true);
                learn_it = true;
            }
        }
        /*
         * Probing reveals undiscovered traps.
         *
         * FIXME?  This finds floor traps even when zapping up and
         * ceiling traps even when zapping down.
         */
        if (ttmp) {
            const t_already_seen = ttmp.tseen;
            const hallu = Hallucination();

            /* should probably be changed to use sense_trap(detect.c)
               so that trap can temporarily be forced to be shown and
               map browsing can take place before it reverts to being
               covered by monster or object(s) */
            ttmp.tseen = 1;
            newsym(x, y);

            if (!t_already_seen || hallu) {
                const ttmpname = trapname(ttmp.ttyp, false);
                const use_the = !hallu ? (ttmp.ttyp === VIBRATING_SQUARE
                                          && Invocation_lev(u.uz))
                                       : !rn2(4);
                await You(`find ${use_the ? the(ttmpname) : an(ttmpname)}${
                    use_the ? '!' : '.'}`);
                learn_it = !hallu;
            }
        } /* t_at() */
    } /* probing */

    if (learn_it)
        learnwand(obj);
}

// C ref: zap.c zappable()
/*
 * zappable - returns 1 if zap is available, 0 otherwise.
 *            it removes a charge from the wand if zappable.
 * added by GAN 11/03/86
 */
export async function zappable(wand) {
    if (wand.spe < 0 || (wand.spe === 0 && rn2(WAND_WREST_CHANCE)))
        return 0;
    if (wand.spe === 0)
        await You("wrest one last charge from the worn-out wand.");
    wand.spe--;
    return 1;
}

// C ref: zap.c zapnodir()
/*
 * zapnodir - zaps a NODIR wand/spell.
 * Won't get here if wand has no charges (unless wresting 1 last charge).
 */
export async function zapnodir(obj) {
    let known = false;

    switch (obj.otyp) {
    case WAN_LIGHT:
    case SPE_LIGHT_ZN:
        /* FIXME? wand of light becoming discovered should be contingent upon
           seeing at least one previously unlit spot become lit */
        known = !!(obj.dknown && !Blind());
        await litroom(true, obj);
        await lightdamage(obj, true, 5);
        break;
    case WAN_SECRET_DOOR_DETECTION:
    case SPE_DETECT_UNSEEN_ZN:
        /* findit() gives sufficient feedback to discover the wand even when
           blinded or when it fails to find anything */
        known = !!obj.dknown;
        await findit();
        break;
    case WAN_STASIS: {
        const tmp_until = game.moves + rn1(21, 10);

        /* no immediately obvious effect, and no message so that it isn't
           distinguishable from other NODIR wands that produce no message;
           for multiple zaps, keep the longest duration rather than latest */
        if (tmp_until > (game.level.flags.stasis_until || 0))
            game.level.flags.stasis_until = tmp_until;
        break;
    }
    case WAN_CREATE_MONSTER:
        /* create_critters() returns True iff hero sees a new monster appear */
        if (await create_critters_zp(rn2(23) ? 1 : rn1(7, 2), null, false))
            known = !!obj.dknown;
        break;
    case WAN_WISHING:
        if ((game.u.uluck || 0) + (game.u.moreluck || 0) + rn2(5) < 0) { /* Luck */
            await pline("Unfortunately, nothing happens.");
            known = false;
        } else {
            known = !!obj.dknown;
            /* wand of wishing asks player what to wish for so always becomes
               discovered (unless it hasn't been seen) */
            await makewish();
        }
        break;
    case WAN_ENLIGHTENMENT:
        known = !!obj.dknown;
        /* do_enlightenmnt_effect() always describes enlightenment */
        await do_enlightenment_effect();
        break;
    default:
        break;
    }

    if (known) {
        if (!objects[obj.otyp].oc_name_known)
            more_experienced(0, 10);
        /* effect was observable; discover the wand type provided
           that the wand itself has been seen */
        learnwand(obj);
    }
}

// C ref: zap.c backfire()
async function backfire(otmp) {
    otmp.in_use = 1; /* in case losehp() is fatal */
    await pline(`${The(xname(otmp))} suddenly explodes!`);
    const dmg = d(otmp.spe + 2, 6);
    await losehp(Maybe_Half_Phys(dmg), "exploding wand", KILLED_BY_AN);
    useupall(otmp);
}

// C ref: zap.c zap_ok() -- getobj callback for object to zap
export function zap_ok(obj) {
    if (obj && obj.oclass === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

// C ref: zap.c dozap() -- #zap command, 'z'
export async function dozap() {
    const g = game;
    const u = g.u;
    let obj, damage;

    if (nohands(g.youmonst.data)) {
        await You("aren't able to zap anything in your current form.");
        return ECMD_OK;
    }
    if (await check_capacity(null))
        return ECMD_OK;
    obj = await getobj("zap", zap_ok, GETOBJ_NOFLAGS);
    if (!obj)
        return ECMD_CANCEL;

    check_unpaid(obj);

    const need_dir = objects[obj.otyp].oc_dir !== NODIR;
    if (!(await zappable(obj))) {
        await pline("Nothing happens."); /* pline1(nothing_happens) */
    } else if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        await backfire(obj); /* the wand blows up in your face! */
        await exercise(A_STR, false);
        /* 'obj' is gone; skip update_inventory() because
           backfire() -> useupall() -> freeinv() did it */
        return ECMD_TIME;
    } else if (need_dir && !(await getdir(null))) {
        if (!Blind())
            await pline(`${The(xname(obj))} glows and fades.`);
        /* make him pay for knowing !NODIR */
    } else if (need_dir && !u.dx && !u.dy && !u.dz) {
        if ((damage = await zapyourself(obj, true)) !== 0) {
            const buf = `zapped ${uhim()}self with ${killer_xname_zp(obj)}`;

            await losehp(Maybe_Half_Phys(damage), buf, NO_KILLER_PREFIX_ZY);
        }
    } else {
        /*      Are we having fun yet?
         * weffects -> buzz(obj->otyp) -> zhitm (temple priest) ->
         * attack -> hitum -> known_hitum -> ghod_hitsu ->
         * buzz(AD_ELEC) -> destroy_items(AD_ELEC) ->
         * useup -> obfree -> dealloc_obj -> free(obj)
         */
        g.current_wand = obj;
        await weffects(obj);
        obj = g.current_wand;
        g.current_wand = null;
    }
    if (obj && obj.spe < 0) {
        await pline(`${Tobjnam(obj, "turn")} to dust.`);
        useupall(obj); /* calls freeinv() -> update_inventory() */
    } /* else update_inventory(): no perm_invent; maybe used a charge */
    return ECMD_TIME;
}

// C ref: shk.c check_unpaid() -> check_unpaid_usage(otmp, FALSE)
export function check_unpaid(otmp) {
    if (!otmp.unpaid || !game.u.ushops || !game.u.ushops[0]
        || (otmp.spe <= 0 && objects[otmp.otyp].oc_charged))
        return;
    throw new Error('check_unpaid(): usage fee for unpaid item not ported yet');
}

// C ref: zap.c boxlock_invent()
/* Lock or unlock all boxes in inventory */
async function boxlock_invent(obj) {
    let otmp, nextobj;
    let boxing = false;

    /* (un)lock carried boxes */
    for (otmp = game.invent; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (Is_box(otmp)) {
            await boxlock_zy(otmp, obj);
            boxing = true;
        }
    }
    if (boxing) {
        /* update_inventory(): no perm_invent; in case any box->lknown
           has changed */
    }
}

// C ref: zap.c zapyourself()
/* you've zapped yourself with a wand or spell (or broken a wand) */
export async function zapyourself(obj, ordinary) {
    let learn_it = false;
    let damage = 0;
    let orig_dmg = 0; /* for passing to destroy_items() */
    const u = game.u;

    switch (obj.otyp) {
    case O_zy.WAN_STRIKING:
    case O_zy.SPE_FORCE_BOLT:
        learn_it = true;
        if (u.uprops[ANTIMAGIC_ZY].intrinsic || u.uprops[ANTIMAGIC_ZY].extrinsic) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline("Boing!");
            monstseesu(M_SEEN_MAGR_ZY);
        } else {
            if (ordinary) {
                await You("bash yourself!");
                damage = d(2, 12);
            } else
                damage = d(1 + obj.spe, 6);
            await exercise(A_STR_ZY, false);
            monstunseesu(M_SEEN_MAGR_ZY);
        }
        break;

    case O_zy.WAN_LIGHTNING:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (!uhave_zp(SHOCK_RES)) { /* !Shock_resistance */
            await You("shock yourself!");
            damage = orig_dmg;
            await exercise(A_CON_ZP, false);
            monstunseesu(M_SEEN_ELEC_ZP);
        } else {
            await shieldeff(game.u.ux, game.u.uy);
            await You("zap yourself, but seem unharmed.");
            monstseesu(M_SEEN_ELEC_ZP);
            await ugolemeffects_zp(AD_ELEC, orig_dmg);
        }
        await destroy_items(game.youmonst, AD_ELEC, orig_dmg);
        await flashburn(rnd(100), true);
        break;

    case O_zy.SPE_FIREBALL:
        await You("explode a fireball on top of yourself!");
        await explode(u.ux, u.uy, 11, d(6, 6), WAND_CLASS, EXPL_FIERY_ZP);
        break;
    case O_zy.WAN_FIRE:
    case O_zy.FIRE_HORN:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (uhave_zp(FIRE_RES)) { /* Fire_resistance */
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel("rather warm.");
            monstseesu(M_SEEN_FIRE_ZP);
            await ugolemeffects_zp(AD_FIRE, orig_dmg);
        } else {
            await pline("You've set yourself afire!");
            damage = orig_dmg;
            monstunseesu(M_SEEN_FIRE_ZP);
        }
        await burn_away_slime_zp();
        await burnarmor_zp(game.youmonst);
        await destroy_items(game.youmonst, AD_FIRE, orig_dmg);
        await ignite_items_zp(game.invent);
        break;

    case O_zy.WAN_COLD:
    case O_zy.SPE_CONE_OF_COLD:
    case O_zy.FROST_HORN:
        learn_it = true;
        orig_dmg = d(12, 6);
        if (uhave_zp(COLD_RES)) { /* Cold_resistance */
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel("a little chill.");
            monstseesu(M_SEEN_COLD_ZP);
            await ugolemeffects_zp(AD_COLD, orig_dmg);
        } else {
            await You("imitate a popsicle!");
            damage = orig_dmg;
            monstunseesu(M_SEEN_COLD_ZP);
        }
        await destroy_items(game.youmonst, AD_COLD, orig_dmg);
        break;

    case O_zy.WAN_MAGIC_MISSILE:
    case O_zy.SPE_MAGIC_MISSILE:
        learn_it = true;
        if (Antimagic()) {
            await shieldeff(game.u.ux, game.u.uy);
            await pline_The("missiles bounce!");
            monstseesu(M_SEEN_MAGR_ZY);
        } else {
            damage = d(4, 6);
            await pline("Idiot!  You've shot yourself!");
            monstunseesu(M_SEEN_MAGR_ZY);
        }
        break;

    case O_zy.WAN_POLYMORPH:
    case O_zy.SPE_POLYMORPH:
        if (!uhave_zp(UNCHANGING_ZP)) { /* !Unchanging */
            learn_it = true;
            await polyself(POLY_NOFLAGS);
        }
        break;

    case O_zy.WAN_CANCELLATION:
    case O_zy.SPE_CANCELLATION:
        await cancel_monst(game.youmonst, obj, true, true, true);
        break;

    case O_zy.SPE_DRAIN_LIFE:
        if (!uhave_zp(DRAIN_RES_ZP)) { /* !Drain_resistance */
            learn_it = true; /* (no effect for spells...) */
            await losexp_zp("life drainage");
        }
        damage = 0; /* No additional damage */
        break;

    case O_zy.WAN_MAKE_INVISIBLE: {
        /* have to test before changing HInvis but must change
         * HInvis before doing newsym().
         */
        const inv = u.uprops[INVIS_ZP];
        const BInvis = !!inv.blocked;
        const Invis = !!(inv.intrinsic || inv.extrinsic) && !BInvis;
        const msg = !Invis && !Blind() && !BInvis;

        if (BInvis && game.uarmc.otyp === O_zy.MUMMY_WRAPPING) {
            /* A mummy wrapping absorbs it and protects you */
            await You_feel(`rather itchy under ${yname_zp(game.uarmc)}.`);
            break;
        }
        incr_itimeout_zp(INVIS_ZP, rn1(15, 31));
        if (msg) {
            learn_it = true;
            newsym(u.ux, u.uy);
            await self_invis_message_zp();
        }
        break;
    }

    case O_zy.WAN_SPEED_MONSTER:
        /* no longer gives intrinsic, but gives very fast speed instead */
        await speed_up_zp(rn1(25, 50));
        learn_it = true;
        break;

    case WAN_SLEEP:
    case SPE_SLEEP:
        learn_it = true;
        if (Sleep_resistance()) {
            await shieldeff(game.u.ux, game.u.uy);
            await You("don't feel sleepy!");
            monstseesu(M_SEEN_SLEEP);
        } else {
            if (ordinary)
                await pline_The("sleep ray hits you!");
            else
                await You("fall asleep!");
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-rnd(50), true);
        }
        break;

    case O_zy.WAN_SLOW_MONSTER:
    case O_zy.SPE_SLOW_MONSTER:
        if (u.uprops[FAST_ZP].intrinsic & (TIMEOUT_ZP | INTRINSIC_ZP)) {
            learn_it = true;
            await u_slow_down();
        }
        break;

    case O_zy.WAN_TELEPORTATION:
    case O_zy.SPE_TELEPORT_AWAY:
        await tele_zp();
        /* same criteria as when mounted (zap_steed) */
        if ((uhave_zp(TELEPORT_CONTROL_ZP) && !u.uprops[STUNNED_ZP].intrinsic)
            || !couldsee(u.ux0, u.uy0)
            || ((u.ux - u.ux0) ** 2 + (u.uy - u.uy0) ** 2) >= 16) /* distu() */
            learn_it = true;
        break;

    case O_zy.WAN_DEATH:
    case O_zy.SPE_FINGER_OF_DEATH: {
        const ptr = game.youmonst.data;
        if (nonliving_zy(ptr) || (ptr.mflags2 & M2_DEMON_ZY) /* is_demon() */) {
            await pline((obj.otyp === O_zy.WAN_DEATH)
                        ? "The wand shoots an apparently harmless beam at you."
                        : "You seem no deader than before.");
            break;
        }
        learn_it = true;
        killer_zy().name = `shot ${uhim()}self with a death ray`;
        killer_zy().format = NO_KILLER_PREFIX_ZY;
        /* probably don't need these to be urgent; player just gave input
           without subsequent opportunity to dismiss --More-- with ESC */
        await urgent_pline("You irradiate yourself with pure energy!");
        await urgent_pline("You die.");
        /* They might survive with an amulet of life saving */
        await done_zy(DIED_ZY);
        break;
    }
    case O_zy.WAN_UNDEAD_TURNING:
    case O_zy.SPE_TURN_UNDEAD:
        learn_it = true;
        await unturn_you();
        break;
    case O_zy.SPE_HEALING:
    case O_zy.SPE_EXTRA_HEALING:
        learn_it = true; /* (no effect for spells...) */
        await healup_zy(d(6, obj.otyp === O_zy.SPE_EXTRA_HEALING ? 8 : 4), 0, false,
                        !!(obj.blessed || obj.otyp === O_zy.SPE_EXTRA_HEALING));
        await You_feel(`${obj.otyp === O_zy.SPE_EXTRA_HEALING ? "much " : ""}better.`);
        break;
    case O_zy.WAN_LIGHT: /* (broken wand) */
        /* assert( !ordinary ); */
        damage = d(obj.spe, 25);
        /*FALLTHRU*/
    case O_zy.EXPENSIVE_CAMERA: // eslint-disable-line no-fallthrough
        if (!damage)
            damage = 5;
        damage = await lightdamage(obj, ordinary, damage);
        damage += rnd(25);
        if (await flashburn(damage, false))
            learn_it = true;
        damage = 0; /* reset */
        break;
    case WAN_OPENING:
    case SPE_KNOCK: {
        if (u.ustuck) {
            /* zapping either self or holder/holdee [bhitm()] will release
               holder's grasp from the hero or hero's grasp from holdee */
            await release_hold();
            learn_it = true;
        }
        if (Punished_zy()) {
            learn_it = true;
            await unpunish_zy();
        }
        /* invent is hit iff hero doesn't escape from a trap */
        const noticed = { v: learn_it }; /* &learn_it */
        let hit_invent = !u.utrap;
        if (!hit_invent) {
            hit_invent = !(await openholdingtrap_bm(game.youmonst, noticed));
            learn_it = noticed.v;
        }
        if (hit_invent) {
            await boxlock_invent(obj);
            /* trigger previously escaped trapdoor */
            noticed.v = learn_it;
            await openfallingtrap_bm(game.youmonst, true, noticed);
            learn_it = noticed.v;
        }
        break;
    }
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK: {
        /* similar logic to opening; invent is hit iff no trap triggered */
        const noticed = { v: learn_it }; /* &learn_it */
        if (u.utrap || !(await closeholdingtrap_bm(game.youmonst, noticed))) {
            learn_it = noticed.v;
            await boxlock_invent(obj);
        } else
            learn_it = noticed.v;
        break;
    }
    case O_zy.WAN_DIGGING:
    case O_zy.SPE_DIG:
    case O_zy.SPE_DETECT_UNSEEN:
    case WAN_NOTHING:
        break;
    case WAN_PROBING: {
        const inv = []; /* probe_objchain(invent): invent is a nobj chain */
        for (let o = game.invent; o; o = o.nobj)
            inv.push(o);
        probe_objchain(inv);
        /* update_inventory(): no perm_invent */
        learn_it = true;
        await ustatusline();
        break;
    }
    case O_zy.SPE_STONE_TO_FLESH:
        throw new Error('zapyourself(): stone to flesh on yourself not ported yet');
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

/* C ref: mondata.h nonliving() */
function nonliving_zy(ptr) {
    return (ptr.mflags2 & M2_UNDEAD_ZY) !== 0 || ptr === mons_zy[PM_MANES_ZY]
           || ptr.mlet === S_GOLEM_ZY || ptr.mlet === S_VORTEX_ZY;
}

// C ref: zap.c zapsetup() -- used by do_break_wand() was well as by weffects()
export function zapsetup() {
    game.obj_zapped = false;
}

// C ref: zap.c zapwrapup()
export async function zapwrapup() {
    /* if do_osshock() set obj_zapped while polying, give a message now */
    if (game.obj_zapped)
        await You("feel shuddering vibrations."); /* You_feel() */
    game.obj_zapped = false;
}

// C ref: zap.c weffects() -- called for various wand and spell effects
export async function weffects(obj) {
    const g = game;
    const u = g.u;
    const otyp = obj.otyp;
    let disclose = false;
    const was_unkn = !objects[otyp].oc_name_known;

    await exercise(A_WIS, true);
    if (u.usteed && (objects[otyp].oc_dir !== NODIR) && !u.dx && !u.dy
        && (u.dz > 0)) {
        throw new Error('weffects(): zap_steed() not ported yet');
    } else if (objects[otyp].oc_dir === IMMEDIATE) {
        zapsetup(); /* reset obj_zapped */
        if (u.uswallow) {
            await bhitm(u.ustuck, obj);
            /* [how about `bhitpile(u.ustuck->minvent)' effect?] */
        } else if (u.dz) {
            throw new Error('weffects(): zap_updown() not ported yet');
        } else {
            const pobj = { obj };
            await bhit(u.dx, u.dy, rn1(8, 6), ZAPPED_WAND, bhitm, bhito, pobj);
            obj = pobj.obj;
        }
        await zapwrapup(); /* give feedback for obj_zapped */

    } else if (objects[otyp].oc_dir === NODIR) {
        await zapnodir(obj);

    } else {
        /* neither immediate nor directionless */

        if (otyp === WAN_DIGGING || otyp === SPE_DIG)
            await zap_dig();
        else if (otyp >= SPE_MAGIC_MISSILE && otyp <= SPE_FINGER_OF_DEATH)
            /* BZ_U_SPELL(BZ_OFS_SPE(otyp)) */
            await ubuzz(10 + Math.abs(otyp - SPE_MAGIC_MISSILE) % 10,
                        Math.trunc(u.ulevel / 2) + 1);
        else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING)
            /* BZ_U_WAND(BZ_OFS_WAN(otyp)) */
            await ubuzz(Math.abs(otyp - WAN_MAGIC_MISSILE) % 10,
                        (otyp === WAN_MAGIC_MISSILE) ? 2 : 6);
        else
            throw new Error('weffects: unexpected spell or wand'); /* impossible() */
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced(0, 10);
    }
}

// C ref: zap.c adtyp_to_prop()
/* convert attack damage AD_foo to property resistance */
function adtyp_to_prop(dmgtyp) {
    switch (dmgtyp) {
    case AD_COLD:
        return COLD_RES;
    case AD_FIRE:
        return FIRE_RES;
    case AD_ELEC:
        return SHOCK_RES;
    case AD_ACID:
        return ACID_RES;
    case AD_DISN:
        return DISINT_RES;
    default:
        break;
    }
    return 0; /* prop_types start at 1 */
}

// C ref: zap.c inventory_resistance_check()
/* Rolls to see whether an object in inventory resists damage from the
   given damage type, due to an equipped item protecting it. */
export function inventory_resistance_check(dmgtyp) {
    const prob = u_adtyp_resistance_obj(dmgtyp);

    if (!prob)
        return false;

    return rn2(100) < prob;
}

// C ref: zap.c u_adtyp_resistance_obj()
/* Is hero wearing or wielding an object with resistance to attack
   damage type? Returns the percentage protection that the object gives. */
export function u_adtyp_resistance_obj(dmgtyp) {
    const prop = adtyp_to_prop(dmgtyp);

    if (!prop)
        return 0;

    /* FIXME? these percentages (99 and 90) seem too high... */

    /* items that give an extrinsic resistance when worn or wielded or
       carried give 99% protection to your items */
    if ((game.u.uprops[prop].extrinsic & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART))
        !== 0)
        return 99;

    /* worn dwarvish cloaks give 90% protection against heat and cold to
       carried items */
    if (game.uarmc && game.uarmc.otyp === DWARVISH_CLOAK
        && (dmgtyp === AD_COLD || dmgtyp === AD_FIRE))
        return 90;

    return 0;
}

// C ref: zap.c item_what()
/* for enlightenment; currently only useful in wizard mode; cf from_what() */
export function item_what(dmgtyp) {
    let whatbuf = "";
    let what = null;
    const prop = adtyp_to_prop(dmgtyp);
    const xtrinsic = game.u.uprops[prop].extrinsic;

    if (game.flags.debug) { /* wizard */
        if (!prop || !xtrinsic) {
            ; /* 'what' stays Null */
        } else if (xtrinsic & W_ARMC) {
            what = cloak_simple_name(game.uarmc);
        } else if (xtrinsic & W_ARM) {
            what = suit_simple_name(game.uarm); /* "dragon {scales,mail}" */
        } else if (xtrinsic & W_ARMU) {
            what = shirt_simple_name(game.uarmu);
        } else if (xtrinsic & W_ARMH) {
            what = helm_simple_name(game.uarmh);
        } else if (xtrinsic & W_ARMG) {
            what = gloves_simple_name(game.uarmg);
        } else if (xtrinsic & W_ARMF) {
            what = boots_simple_name(game.uarmf);
        } else if (xtrinsic & W_ARMS) {
            what = shield_simple_name(game.uarms);
        } else if (xtrinsic & (W_AMUL | W_TOOL)) {
            what = simpleonames((xtrinsic & W_AMUL) ? game.uamul : game.ublindf);
        } else if (xtrinsic & W_RING) {
            if ((xtrinsic & W_RING) === W_RING) /* both */
                what = "rings";
            else
                what = simpleonames((xtrinsic & W_RINGL) ? game.uleft : game.uright);
        } else if (xtrinsic & W_WEP) {
            what = simpleonames(game.uwep);
        }
        /* format the output to be ready for enl_msg() to append it to
           "Your items {are,were} protected against <damage-type>" */
        if (what) /* strlen(what) will be less than 30 */
            whatbuf = ` by your ${what.slice(0, 40)}`;
    }
    return whatbuf;
}

// C ref: zap.c exclam()
export function exclam(force) {
    /* force == 0 occurs e.g. with sleep ray */
    /* note that large force is usual with wands so that !! would
            require information about hand/weapon/wand */
    return (force < 0) ? "?" : (force <= 4) ? "." : "!";
}

// C ref: zap.c flashburn()
/* light blinding: returns True if it blinds */
export async function flashburn(duration, via_lightning) {
    if (!resists_blnd(game.youmonst)) {
        await You("are blinded by the flash!"); /* are_blinded_by_the_flash */
        await make_blinded(duration, false);
        if (!Blind())
            await Your("vision quickly clears."); /* Your1(vision_clears) */
        return true;
    }
    /* if blinding is resisted due to magical equipment (Sunsword), give
       a sparkle animation (even if also resisted due to being blind)
       _unless_ this is lightning-induced */
    if (!via_lightning && resists_blnd_by_arti(game.youmonst)) {
        await shieldeff(game.u.ux, game.u.uy);
        return true;
    }
    return false;
}

// C ref: zap.c hit()
export async function hit(
    str,     /* zap text or missile name */
    mtmp,    /* target; for missile, might be hero */
    force) { /* usually either "." or "!" via exclam() */
    const g = game;
    const verbosely = (mtmp === g.youmonst
                       || ((g.flags.verbose ?? true)
                           && (cansee(g.bhitpos.x, g.bhitpos.y)
                               || canspotmon(mtmp)
                               /* engulfing_u(mtmp) */
                               || (g.u.uswallow && mtmp === g.u.ustuck))));

    await pline(`${The(str)} ${vtense(str, "hit")} ${
        verbosely ? mon_nam(mtmp) : "it"}${force}`);
}

// C ref: zap.c miss()
export async function miss(str, mtmp) {
    const g = game;
    await pline(`${The(str)} ${vtense(str, "miss")} ${
        ((cansee(g.bhitpos.x, g.bhitpos.y) || canspotmon(mtmp))
         && (g.flags.verbose ?? true)) ? mon_nam(mtmp) : "it"}.`);
}

/* C ref: zap.c ZT_* -- zap types (AD_foo - 1) */
const ZT_MAGIC_MISSILE = 0, ZT_FIRE = 1, ZT_COLD = 2, ZT_SLEEP = 3,
    ZT_DEATH = 4, ZT_LIGHTNING = 5, ZT_POISON_GAS = 6, ZT_ACID = 7;
function ZT_WAND(x) { return x; }
function ZT_SPELL(x) { return 10 + x; }
function ZT_BREATH(x) { return 20 + x; }
/* C ref: zap.c is_hero_spell() */
function is_hero_spell(type) { return type >= 10 && type < 20; }
/* C ref: hack.h PHYS_EXPL_TYPE */
const PHYS_EXPL_TYPE = -1;

const flash_types = [
    "magic missile", /* Wands must be 0-9 */
    "bolt of fire", "bolt of cold", "sleep ray", "death ray",
    "bolt of lightning", "", "", "", "",

    "magic missile", /* Spell equivalents must be 10-19 */
    "fireball", "cone of cold", "sleep ray", "finger of death",
    "bolt of lightning", /* there is no spell, used for retribution */
    "", "", "", "",

    "blast of missiles", /* Dragon breath equivalents 20-29*/
    "blast of fire", "blast of frost", "blast of sleep gas",
    "blast of disintegration", "blast of lightning",
    "blast of poison gas", "blast of acid", "", ""
];

// C ref: zap.c zaptype() -- convert monster zap/spell/breath value to hero
// zap/spell/breath value
function zaptype(type) {
    if (type <= -30 && -39 <= type) /* monster wand zap */
        type += 30; /* first convert -39..-30 to -9..0 so that abs()
                     * will yield 0..9 (hero wand zap) for it */
    type = Math.abs(type);
    return type;
}

// C ref: zap.c flash_str()
export function flash_str(typ, nohallu) { /* suppress hallucination (for death reasons) */
    typ = zaptype(typ);
    if (Hallucination() && !nohallu) {
        /* always return "blast of foo" for simplicity;
           this could be extended with hallucinatory rays, but probably
           not worth it at this time */
        return `blast of ${rnd_hallublast()}`;
    }
    return flash_types[typ];
}

// C ref: zap.c bounce_dir()
function bounce_dir(sx, sy, dd, bounceback) {
    const lev = (x, y) => game.level.at(x, y);
    if (!dd.dx || !dd.dy || (bounceback > 0 && !rn2(bounceback))) {
        dd.dx = -dd.dx;
        dd.dy = -dd.dy;
    } else {
        let rmn;
        let bounce = 0;
        const lsy = sy - dd.dy;
        const lsx = sx - dd.dx;

        if (isok(sx, lsy) && ZAP_POS(rmn = lev(sx, lsy).typ)
            && !closed_door(sx, lsy)
            && (IS_ROOM(rmn) || (isok(sx + dd.dx, lsy)
                                 && ZAP_POS(lev(sx + dd.dx, lsy).typ))))
            bounce = 1;
        if (isok(lsx, sy) && ZAP_POS(rmn = lev(lsx, sy).typ)
            && !closed_door(lsx, sy)
            && (IS_ROOM(rmn) || (isok(lsx, sy + dd.dy)
                                 && ZAP_POS(lev(lsx, sy + dd.dy).typ))))
            if (!bounce || rn2(2))
                bounce = 2;
        switch (bounce) {
        case 0:
            dd.dx = -dd.dx;
            /*FALLTHRU*/
        case 1: // eslint-disable-line no-fallthrough
            dd.dy = -dd.dy;
            break;
        case 2:
            dd.dx = -dd.dx;
            break;
        }
    }
}

// C ref: zap.c zap_hit() -- will zap/spell/breath attack score a hit
// against armor class `ac'?
function zap_hit(ac, type) { /* either hero cast spell type or 0 */
    const chance = rn2(20);
    const spell_bonus = type ? spell_hit_bonus(type) : 0;

    /* small chance for naked target to avoid being hit */
    if (!chance)
        return rnd(10) < ac + spell_bonus;

    /* very high armor protection does not achieve invulnerability */
    ac = AC_VALUE(ac);

    return (3 - chance < ac + spell_bonus);
}

// C ref: zap.c spell_damage_bonus()
/* adjust damage of a hero's spell by Int and experience level */
function spell_damage_bonus(
    dmg) { /* base amount to be adjusted by bonus or penalty */
    const intell = ACURR_ZP(A_INT_ZP);

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

// C ref: zap.c spell_hit_bonus()
/*
 * Generate the to-hit bonus for a spell.  Based on the hero's skill in
 * spell class and dexterity.
 */
function spell_hit_bonus(skill) {
    let hit_bon = 0;
    const dex = ACURR_ZP(A_DEX_ZP);

    switch (P_SKILL_ZP(spell_skilltype_zp(skill))) {
    case P_ISRESTRICTED_ZP:
    case P_UNSKILLED_ZP:
        hit_bon = -4;
        break;
    case P_BASIC_ZP:
        hit_bon = 0;
        break;
    case P_SKILLED_ZP:
        hit_bon = 2;
        break;
    case P_EXPERT_ZP:
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

// C ref: zap.c boomhit()
/* process thrown boomerang, which travels a curving path...
 * A multi-shot volley ought to have all missiles in flight at once,
 * but we're called separately for each one.  We terminate the volley
 * early on a failed catch since continuing to throw after being hit
 * is too obviously silly.
 */
export async function boomhit(obj, dx, dy) {
    const g = game;
    const u = g.u;
    let i, ct;
    let boom; /* showsym[] index  */
    let mtmp;
    const counterclockwise = (u.uhandedness === RIGHT_HANDED); /* URIGHTY;
                                                     ULEFTY => clockwise */
    let nhits = Math.max(1, obj.spe + 1);

    /* counterclockwise traversal patterns, from @ to 1 then on through to 9
     *  ..........................54.................................
     *  ..................43.....6..3....765.........................
     *  ..........32.....5..2...7...2...8...4....87..................
     *  .........4..1....6..1...8..1....9...3...9..6.....98..........
     *  ..21@....5...@...7..@....9@......@12....@...5...@..7.....@9..
     *  .3...9....6..9....89.....................1..4...1..6....1..8.
     *  .4...8.....78.............................23....2..5...2...7.
     *  ..567............................................34....3..6..
     *  ........................................................45...
     * (invert rows for corresponding clockwise patterns)
     */

    g.bhitpos.x = u.ux;
    g.bhitpos.y = u.uy;
    boom = counterclockwise ? S_boomleft : S_boomright;
    i = xytodir(dx, dy);
    await tmp_at(DISP_FLASH, cmap_to_glyph(boom));
    for (ct = 0; ct < 10; ct++) {
        i = (i + N_DIRS) % N_DIRS; /* DIR_CLAMP(i) */
        boom = (S_boomleft + S_boomright - boom); /* toggle */
        await tmp_at(DISP_CHANGE, cmap_to_glyph(boom)); /* change glyph */
        dx = xdir[i];
        dy = ydir[i];
        g.bhitpos.x += dx;
        g.bhitpos.y += dy;
        if (!isok(g.bhitpos.x, g.bhitpos.y)) {
            g.bhitpos.x -= dx;
            g.bhitpos.y -= dy;
            break;
        }
        if ((mtmp = m_at(g.bhitpos.x, g.bhitpos.y))) {
            await m_respond_bm(mtmp);
            if (nhits-- < 0) {
                await tmp_at(DISP_END, 0);
                return mtmp;
            } else if (await throwit_mon_hit(obj, mtmp) || !g.thrownobj) {
                break;
            }
        }
        if (!ZAP_POS(g.level.at(g.bhitpos.x, g.bhitpos.y).typ)
            || closed_door(g.bhitpos.x, g.bhitpos.y)) {
            g.bhitpos.x -= dx;
            g.bhitpos.y -= dy;
            break;
        }
        if (u_at(g.bhitpos.x, g.bhitpos.y)) { /* ct == 9 */
            if (Fumbling() || rn2(20) >= ACURR_ZP(A_DEX_ZP)) {
                const dam = dmgval(obj, g.youmonst);
                const pobj = { obj };

                /* we hit ourselves */
                await thitu(10 + obj.spe, Maybe_Half_Phys(dam), pobj,
                            "boomerang");
                obj = pobj.obj;
                endmultishot(true);
                break;
            } else { /* we catch it */
                await tmp_at(DISP_END, 0);
                await You("skillfully catch the boomerang.");
                return g.youmonst;
            }
        }
        await tmp_at(g.bhitpos.x, g.bhitpos.y);
        /* nh_delay_output() */
        if (IS_SINK(g.level.at(g.bhitpos.x, g.bhitpos.y).typ)) {
            /* Soundeffect(se_boomerang_klonk, 75) */
            if (!Deaf())
                await pline("Klonk!");
            await wake_nearto(g.bhitpos.x, g.bhitpos.y, 20);
            break; /* boomerang falls on sink */
        }
        /* ct==0, initial position, we want next delta to be same;
           ct==5, opposite position, repeat delta undoes first one */
        if (ct % 5 !== 0)
            i = counterclockwise ? (i + 7) % N_DIRS /* DIR_LEFT(i) */
                                 : (i + 1) % N_DIRS; /* DIR_RIGHT(i) */
    }
    await tmp_at(DISP_END, 0); /* do not leave last symbol */
    return null;
}

// C ref: zap.c zhitm()
/* returns damage to mon */
async function zhitm(
    mon,     /* monster being hit */
    type,    /* zap or breath type */
    nd,      /* number of hit dice to use */
    ootmp) { /* to return worn armor for caller to disintegrate */
    let tmp = 0, orig_dmg = 0; /* damage amount */
    const damgtype = zaptype(type) % 10;
    let sho_shieldeff = false;
    const spellcaster = is_hero_spell(type); /* maybe get a bonus! */

    ootmp.v = null;
    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        if (resists_magm_zp(mon) || defended_zp(mon, AD_MAGM)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        break;
    case ZT_FIRE:
        if (resists_fire_zp(mon) || defended_zp(mon, AD_FIRE)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp; /* includes spell bonus but not monster vuln to fire */
        if (resists_cold_zp(mon))
            tmp += 7;
        if (await burnarmor_zp(mon)) {
            if (!rn2(3)) {
                tmp += await destroy_items(mon, AD_FIRE, orig_dmg);
                await ignite_items_zp(mon.minvent);
            }
        }
        break;
    case ZT_COLD:
        if (resists_cold_zp(mon) || defended_zp(mon, AD_COLD)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster)
            tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp; /* includes spell bonus but not monster vuln to cold */
        if (resists_fire_zp(mon))
            tmp += d(nd, 3);
        if (!rn2(3))
            tmp += await destroy_items(mon, AD_COLD, orig_dmg);
        break;
    case ZT_SLEEP:
        /* resistance and shield effect and revealing concealed mimic are
           handled by sleep_monst() */
        tmp = 0;
        await sleep_monst_zp(mon, d(nd, 25),
                       type === ZT_WAND(ZT_SLEEP) ? WAND_CLASS : 0);
        break;
    case ZT_DEATH:                                   /* death/disintegration */
        if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) { /* death */
            if (mon.data === mons_zy[PM_DEATH_ZP]) {
                healmon_zp(mon, Math.trunc(mon.mhpmax * 3 / 2),
                           Math.trunc(mon.mhpmax / 2));
                if (mon.mhpmax >= MAGIC_COOKIE)
                    mon.mhpmax = MAGIC_COOKIE - 1;
                tmp = 0;
                break;
            }
            if (nonliving_zy(mon.data) || is_demon_zp(mon.data)
                || is_vampshifter_zp(mon) || resists_magm_zp(mon)) {
                /* similar to player */
                sho_shieldeff = true;
                break;
            }
            type = -1; /* so they don't get saving throws */
        } else {
            let otmp2;

            if (resists_disint_zp(mon) || defended_zp(mon, AD_DISN)) {
                sho_shieldeff = true;
            } else if (mon.misc_worn_check & W_ARMS) {
                /* destroy shield; victim survives */
                ootmp.v = which_armor_zp(mon, W_ARMS);
            } else if (mon.misc_worn_check & W_ARM) {
                /* destroy suit, also cloak if present */
                ootmp.v = which_armor_zp(mon, W_ARM);
                if ((otmp2 = which_armor_zp(mon, W_ARMC)) != null)
                    m_useup(mon, otmp2);
            } else {
                /* no suit, victim dies; destroy cloak
                   and shirt now in case target gets life-saved */
                tmp = MAGIC_COOKIE;
                if ((otmp2 = which_armor_zp(mon, W_ARMC)) != null)
                    m_useup(mon, otmp2);
                if ((otmp2 = which_armor_zp(mon, W_ARMU)) != null)
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
        if (resists_elec_zp(mon) || defended_zp(mon, AD_ELEC)) {
            sho_shieldeff = true;
            tmp = 0;
            /* can still blind the monster */
        }
        if (!resists_blnd(mon)
            && !(type > 0 && engulfing_u_zp(mon))
            && nd > 2) {
            /* sufficiently powerful lightning blinds monsters */
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            if (((mon.mblinded || 0) + rnd_tmp) > 127)
                mon.mblinded = 127;
            else
                mon.mblinded = (mon.mblinded || 0) + rnd_tmp;
        }
        if (!rn2(3))
            tmp += await destroy_items(mon, AD_ELEC, orig_dmg);
        break;
    case ZT_POISON_GAS:
        if (resists_poison_zp(mon) || defended_zp(mon, AD_DRST_ZP)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        if (resists_acid_zp(mon) || defended_zp(mon, AD_ACID)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (!rn2(6))
            await acid_damage_zp(mon.mw); /* MON_WEP(mon) */
        if (!rn2(6))
            await erode_armor_zp(mon, ERODE_CORRODE_ZP);
        break;
    }
    if (sho_shieldeff)
        await shieldeff(mon.mx, mon.my);
    if (is_hero_spell(type)
        && (game.urole.mnum === PM_KNIGHT_ZP && game.u.uhave?.questart))
        tmp *= 2;
    if (tmp > 0 && type >= 0
        && resist(mon, type < ZT_SPELL(0) ? WAND_CLASS : 0, 0, NOTELL_ZP))
        tmp = Math.trunc(tmp / 2);
    if (tmp < 0)
        tmp = 0; /* don't allow negative damage */
    mon.mhp -= tmp;
    return tmp;
}

// C ref: zap.c zhitu()
async function zhitu(
    type, nd,
    fltxt,
    sx, sy) {
    const g = game;
    const u = g.u;
    let dam = 0;
    const abstyp = zaptype(type);
    let orig_dam = 0;

    switch (abstyp % 10) {
    case ZT_MAGIC_MISSILE:
        if (Antimagic()) {
            await shieldeff(sx, sy);
            await pline_The("missiles bounce off!");
            monstseesu(M_SEEN_MAGR_ZY);
        } else {
            dam = d(nd, 6);
            await exercise(A_STR, false);
            monstunseesu(M_SEEN_MAGR_ZY);
        }
        break;
    case ZT_FIRE:
        orig_dam = d(nd, 6);
        if (uhave_zp(FIRE_RES)) { /* Fire_resistance */
            await shieldeff(sx, sy);
            await You("don't feel hot!");
            monstseesu(M_SEEN_FIRE_ZP);
            await ugolemeffects_zp(AD_FIRE, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_FIRE_ZP);
        }
        await burn_away_slime_zp();
        if (await burnarmor_zp(g.youmonst)) { /* "body hit" */
            if (!rn2(3))
                await destroy_items(g.youmonst, AD_FIRE, orig_dam);
            if (!rn2(3))
                await ignite_items_zp(g.invent);
        }
        break;
    case ZT_COLD:
        orig_dam = d(nd, 6);
        if (uhave_zp(COLD_RES)) { /* Cold_resistance */
            await shieldeff(sx, sy);
            await You("don't feel cold.");
            monstseesu(M_SEEN_COLD_ZP);
            await ugolemeffects_zp(AD_COLD, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_COLD_ZP);
        }
        if (!rn2(3))
            await destroy_items(g.youmonst, AD_COLD, orig_dam);
        break;
    case ZT_SLEEP:
        if (Sleep_resistance()) {
            await shieldeff(u.ux, u.uy);
            await You("don't feel sleepy.");
            monstseesu(M_SEEN_SLEEP);
        } else {
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-d(nd, 25), true); /* sleep ray */
        }
        break;
    case ZT_DEATH:
        if (abstyp === ZT_BREATH(ZT_DEATH)) {
            const disn_prot = inventory_resistance_check(AD_DISN);

            if (uhave_zp(DISINT_RES)) { /* Disint_resistance */
                await You("are not disintegrated.");
                monstseesu(M_SEEN_DISINT_ZP);
                break;
            } else if (disn_prot) {
                break;
            }
            monstunseesu(M_SEEN_DISINT_ZP);
            if (g.uarms) {
                /* destroy shield; other possessions are safe */
                await disintegrate_arm_zp(g.uarms);
                break;
            } else if (g.uarm) {
                /* destroy suit; if present, cloak goes too */
                if (g.uarmc)
                    await disintegrate_arm_zp(g.uarmc);
                await disintegrate_arm_zp(g.uarm);
                break;
            }
            /* no shield or suit, you're dead; wipe out cloak
               and/or shirt in case of life-saving or bones */
            if (g.uarmc)
                await disintegrate_arm_zp(g.uarmc);
            if (g.uarmu)
                await disintegrate_arm_zp(g.uarmu);
        } else if (nonliving_zy(g.youmonst.data) || is_demon_zp(g.youmonst.data)) {
            await shieldeff(sx, sy);
            await You("seem unaffected.");
            break;
        } else if (Antimagic()) {
            await shieldeff(sx, sy);
            monstseesu(M_SEEN_MAGR_ZY);
            await You("aren't affected.");
            break;
        }
        monstunseesu(M_SEEN_MAGR_ZY);
        killer_zy().format = KILLED_BY_AN;
        killer_zy().name = fltxt ? fltxt : "";
        /* when killed by disintegration breath, don't leave corpse */
        u.ugrave_arise = (type === -ZT_BREATH(ZT_DEATH)) ? -3 : NON_PM_ZP;
        await done_zy(DIED_ZY);
        return; /* lifesaved */
    case ZT_LIGHTNING:
        orig_dam = d(nd, 6);
        if (uhave_zp(SHOCK_RES)) { /* Shock_resistance */
            await shieldeff(sx, sy);
            await You("aren't affected.");
            monstseesu(M_SEEN_ELEC_ZP);
            await ugolemeffects_zp(AD_ELEC, orig_dam);
        } else {
            dam = orig_dam;
            await exercise(A_CON_ZP, false);
            monstunseesu(M_SEEN_ELEC_ZP);
        }
        if (!rn2(3))
            await destroy_items(g.youmonst, AD_ELEC, orig_dam);
        break;
    case ZT_POISON_GAS:
        await poisoned_zp("blast", A_DEX_ZP, "poisoned blast", 15, false);
        break;
    case ZT_ACID:
        if (uhave_zp(ACID_RES)) { /* Acid_resistance */
            await pline_The(`${hliquid_zp("acid")} doesn't hurt.`);
            monstseesu(M_SEEN_ACID_ZP);
            dam = 0;
        } else {
            await pline_The(`${hliquid_zp("acid")} burns!`);
            dam = d(nd, 6);
            await exercise(A_STR, false);
            monstunseesu(M_SEEN_ACID_ZP);
        }
        /* using two weapons at once makes both of them more vulnerable */
        if (!rn2(u.twoweap ? 3 : 6))
            await acid_damage_zp(g.uwep);
        if (u.twoweap && !rn2(3))
            await acid_damage_zp(g.uswapwep);
        if (!rn2(6))
            await erode_armor_zp(game.youmonst, ERODE_CORRODE_ZP);
        break;
    }

    /*
     * 5.0: when fatal, this used to yield "Killed by <fltxt>." without any
     * information about who was responsible.  Now 'buzzer' is used to try
     * to supply "zapped/cast/breathed by <mon> [imitating <other_mon>]."
     */
    {
        let kbuf;
        const otmp = g.current_wand;
        /* fire horn and frost horn get handled as wands by caller */
        const verb = (abstyp < 10) /* wand */
                     ? ((otmp && otmp.oclass === TOOL_CLASS) ? "played"
                        : "zapped")
                     : (abstyp < 20) ? "cast"
                       : (abstyp < 30) ? "exhaled"
                         : "imagined"; /* should never happen */

        if (type < 0 || (type === 0 && g.buzzer)) {
            /* if gb.buzzer is Null, kbuf[] will end up with just <fltxt> */
            kbuf = death_inflicted_by_zp(fltxt, g.buzzer || null);
            /* change "death inflicted by mon" to "death <verb> by mon" */
            if (g.buzzer)
                kbuf = kbuf.replace("inflicted", verb); /* strsubst() */
        } else {
            /* FIXME: "zapped by herself" is suitable for a rebound;
               "zapped at herself" would be better if player explicitly
               targeted hero */
            kbuf = `${fltxt} ${verb} by ${uhim()}self`;
        }
        /* Half_spell_damage protection yields half-damage for wands & spells,
           including hero's own ricochets; breath attacks do full damage */
        if (dam && uhave_zp(HALF_SPDAM_ZP) && abstyp < 20)
            dam = Math.trunc((dam + 1) / 2);
        await losehp(dam, kbuf, KILLED_BY_AN);
    }
}

// C ref: zap.c disintegrate_mon()
async function disintegrate_mon(
    mon,
    type, /* hero vs other */
    fltxt) {
    const m_amulet = mlifesaver_zp(mon);

    if (canseemon(mon)) {
        if (!m_amulet)
            await pline(`${Monnam(mon)} is disintegrated!`);
        else
            await hit(fltxt, mon, "!");
    }

    /* note: worn amulet of life saving must be preserved in order to operate */
    const oresist_disintegration = (obj) =>
        (objects[obj.otyp].oc_oprop === DISINT_RES || obj_resists(obj, 5, 50)
         || is_quest_artifact_zp(obj) || obj === m_amulet);

    for (const otmp of (mon.minvent || []).slice().reverse()) {
        if (!oresist_disintegration(otmp)) {
            extract_from_minvent_zp(mon, otmp, true, true);
            obfree_zp(otmp, null);
        }
    }

    if (type < 0)
        await monkilled(mon, null, -AD_RBRE);
    else
        await xkilled(mon, XKILL_NOMSG_ZP | XKILL_NOCORPSE_ZP);
}

/* C ref: zap.c destroy_strings[] -- also used in trap.c */
const destroy_strings = [
    [ "freezes and shatters", "freeze and shatter", "shattered potion" ],
    [ "boils and explodes", "boil and explode", "boiling potion" ],
    [ "ignites and explodes", "ignite and explode", "exploding potion" ],
    [ "catches fire and burns", "catch fire and burn", "burning scroll" ],
    [ "catches fire and burns", "", "burning book" ],
    [ "turns to dust and vanishes", "", "" ],
    [ "breaks apart and explodes", "", "exploding wand" ],
];

// C ref: zap.c destroyable()
/* Return TRUE if obj is eligible to pass to maybe_destroy_item given
 * the type of elemental damage it's being subjected to.
 * Note that things like the Book of the Dead are eligible even though they
 * won't get destroyed, because it will attempt to be destroyed but print a
 * special message instead. */
function destroyable(obj, adtyp) {
    if (obj.oartifact) {
        /* don't destroy artifacts */
        return false;
    }
    if (obj.in_use && obj.quan === 1) {
        /* not available for destroying */
        return false;
    }
    if (adtyp === AD_FIRE) {
        /* fire-magic items are immune */
        if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL) {
            return false;
        }
        if (obj.otyp === GLOB_OF_GREEN_SLIME || obj.oclass === POTION_CLASS
            || obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
            return true;
        }
    } else if (adtyp === AD_COLD) {
        /* non-water potions don't freeze and shatter */
        if (obj.oclass === POTION_CLASS && obj.otyp !== POT_OIL) {
            return true;
        }
    } else if (adtyp === AD_ELEC) {
        if (obj.oclass !== RING_CLASS && obj.oclass !== WAND_CLASS) {
            return false;
        }
        /* electric-magic items are immune */
        if (obj.otyp !== RIN_SHOCK_RESISTANCE_ZP && obj.otyp !== WAN_LIGHTNING) {
            return true;
        }
    }
    return false;
}

// C ref: zap.c maybe_destroy_item()
/* guts of destroy_items();
   caller must decide whether obj is eligible, though there's one case (Book
   of the Dead) in which an eligible item shouldn't be destroyed (it prints a
   special message instead).
   Returns the amount of damage done, but it's used differently depending on
   whether it's the player or a monster having an item destroyed: players lose
   the HP and possibly die in this function, and the return value is unused,
   whereas monsters return the damage to their caller to be taken off later */
async function maybe_destroy_item(
    carrier,
    obj,
    dmgtyp) {
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
    case AD_COLD:
        quan = obj.quan;
        dindx = 0;
        dmg = rnd(4);
        break;
    case AD_FIRE:
        xresist = (obj.oclass !== POTION_CLASS
                   && obj.otyp !== GLOB_OF_GREEN_SLIME
                   && (u_carry ? uhave_zp(FIRE_RES) : resists_fire_zp(carrier)));
        if (obj.otyp === SPE_BOOK_OF_THE_DEAD_ZP) {
            skip = 1;
            if (u_carry ? !Blind() : vis) {
                await pline(`${The(u_carry ? xname(obj) : distant_name(obj, xname))} glows a strange ${
                    hcolor_zp("dark red")}, but remains intact.`);
            }
            break;
        }
        quan = obj.quan;
        switch (obj.oclass) {
        case POTION_CLASS:
            dindx = (obj.otyp !== POT_OIL) ? 1 : 2;
            dmg = rnd(6);
            break;
        case SCROLL_CLASS:
            dindx = 3;
            dmg = 1;
            break;
        case SPBOOK_CLASS:
            dindx = 4;
            dmg = 1;
            break;
        case FOOD_CLASS: /* only GLOB_OF_GREEN_SLIME */
            dindx = 1; /* boil and explode */
            dmg = Math.trunc((obj.owt + 19) / 20);
            break;
        }
        break;
    case AD_ELEC:
        xresist = (obj.oclass !== RING_CLASS
                   && (u_carry ? uhave_zp(SHOCK_RES) : resists_elec_zp(carrier)));
        quan = obj.quan;
        switch (obj.oclass) {
        case RING_CLASS:
            if (((obj.owornmask & W_RING) && game.uarmg && !is_metallic_zp(game.uarmg))
                || obj.otyp === RIN_SHOCK_RESISTANCE_ZP) {
                skip++;
                break;
            } else if (objects[obj.otyp].oc_charged && rn2(3)) {
                chargeit = true;
                break;
            }
            dindx = 5;
            dmg = 0;
            break;
        case WAND_CLASS:
            dindx = 6;
            dmg = rnd(10);
            break;
        }
        break;
    default:
        skip = 1; /* just in case ineligible damage type gets through... */
        /* impossible("maybe_destroy_item with unexpected dmgtyp %d") */
        break;
    }

    if (chargeit) {
        /* FIXME: recharge only handles items in hero's inventory */
        if (u_carry)
            await recharge_zp(obj, 0);
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
            mult = (cnt === 1) ? ((quan === 1) ? "" /* 1 of 1 */
                                  : "One of ")      /* 1 of N */
                   : ((cnt < quan) ? "Some of "     /* n of N */
                      : (quan === 2) ? "Both of "   /* 2 of 2 */
                        : "All of ");               /* N of N */
            await pline(`${mult}${(cnt === 1 && quan === 1) ? Yname2_zp(obj)
                                                            : yname_zp(obj)} ${
                destroy_strings[dindx][(cnt > 1) ? 1 : 0]}!`);
        }
        if (u_carry) { /* effects that happen only to the player */
            if (osym === POTION_CLASS && dmgtyp !== AD_COLD
                && (!breathless(game.youmonst.data)
                    || haseyes_zp(game.youmonst.data))) {
                await potionbreathe_zp(obj);
            }
            if (obj.owornmask) { /* m_useup handles these for monster */
                if (obj.owornmask & W_RING) /* ring being worn */
                    await Ring_gone(obj);
                else
                    setnotworn_zp(obj);
            }
            if (obj === game.current_wand) {
                game.current_wand = null; /* destroyed */
            }
        }
        for (i = 0; i < cnt; i++) {
            if (u_carry)
                useup_zp(obj);
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

                if (dmgtyp === AD_FIRE && osym === FOOD_CLASS)
                    how = "exploding glob of slime";
                await losehp(dmg, one ? how : makeplural(how),
                             one ? KILLED_BY_AN : KILLED_BY_ZP);
                await exercise(A_STR, false);
            }
        }
    }
    return dmg;
}

/* scaling factor; dmg/5 stacks will be subjected to destroy_items() */
const DMG_DESTROY_SCALE = 5;
/* largest amount of stacks that will be destroyed in a single call */
const MAX_ITEMS_DESTROYED = 20;

// C ref: zap.c destroy_items()
/* target items of specified class in mon's inventory for possible destruction
   return total amount of damage inflicted, though this is unused if mon is
   the player */
export async function destroy_items(
    mon,     /* monster whose invent is being subjected to
              * destruction */
    dmgtyp,  /* AD_**** - currently only cold, fire, elec */
    dmg_in) { /* the amount of HP damage the attack dealt */
    let obj;
    let i, defer;
    let limit; /* max amount of item stacks destroyed, based on damage */
    const items_to_destroy = [];
    let elig_stacks = 0; /* number of destroyable objects found so far */
    const u_carry = (mon === game.youmonst);
    /* the hero's invent chain or the monster's minvent in chain order */
    const objchn = () => (u_carry ? game.invent
                          : (mon.minvent || []).slice().reverse());
    let dmg_out = 0; /* damage caused by items getting destroyed */
    let where = null; /* NOBJ_STATES */

    /* initialize items_to_destroy */
    for (i = 0; i < MAX_ITEMS_DESTROYED; ++i) {
        /* 0 should not be a valid o_id for anything */
        items_to_destroy.push({ oid: 0, otmp: null, deferred: false });
    }

    /* don't straight up destroy all items with an equal chance; limit it
       based on the amount of damage being dealt by the source of the item
       destruction */
    limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if (dmg_in % DMG_DESTROY_SCALE > rn2(DMG_DESTROY_SCALE)) {
        limit++; /* dmg = 9: 20% chance of limit=1, 80% of limit=2, etc */
    }
    if (limit > MAX_ITEMS_DESTROYED) {
        /* in case of incredibly high damage, prevent from overflowing
         * items_to_destroy */
        limit = MAX_ITEMS_DESTROYED;
    }
    if (limit < 1) {
        return 0; /* nothing destroyed */
    }

    bypass_objlist_zp(objchn(), false); /* clear bypass bit for invent */

    while ((obj = nxt_unbypassed_obj_zp(objchn())) !== null) {
        if (!destroyable(obj, dmgtyp))
            continue; /* this dmg type can't destroy this obj */

        /* obj is eligible; maybe add it to items_to_destroy */
        i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks);
        /* do this afterwards to avoid not filling items_to_destroy[0] */
        elig_stacks++;
        if (i < 0 || i >= limit) {
            /* random index was too high; mollify analyzer by including < 0 */
            continue;
        }
        items_to_destroy[i].oid = obj.o_id;
        items_to_destroy[i].otmp = obj;
        if (where === null)
            where = obj.where;
        /* else if (where != obj->where)
            impossible("destroy_item: items in multiple chains"); */

        /* if loss of this item might dump us onto a trap, hold off
           until later because potential recursive destroy_items() will
           result in setting bypass bits on whole chain--we would skip
           the rest as already processed once control returns here */
        if (u_carry
            && ((obj.owornmask !== 0
                 && (objects[obj.otyp].oc_oprop === LEVITATION_ZP
                     || objects[obj.otyp].oc_oprop === FLYING_ZP))
                /* destroyed wands and potions of polymorph don't trigger
                   polymorph so don't need to be deferred */
                || (obj.otyp === POT_WATER && game.u.ulycn >= LOW_PM_ZP
                    && ((game.u.umonnum !== game.u.umonster) ? obj.blessed
                                                             : obj.cursed)))) {
            items_to_destroy[i].deferred = true;
        } else {
            items_to_destroy[i].deferred = false;
        }
    }
    if (elig_stacks > limit) {
        elig_stacks = limit; /* so we can loop up to elig_stacks */
    }
    for (defer = 0; defer <= 1; ++defer) {
        /* if we saved some items for later (most likely just a worn ring
           of levitation) and they're still in inventory, handle them on the
           second iteration of the loop */
        for (i = 0; i < elig_stacks; ++i) {
            obj = items_to_destroy[i].otmp;
            if (obj && obj.o_id === items_to_destroy[i].oid
                && obj.where === where
                && (items_to_destroy[i].deferred === (defer === 1))) {
                dmg_out += await maybe_destroy_item(mon, obj, dmgtyp);
                items_to_destroy[i].otmp = null;
            }
        }
    }
    /* almost certainly not everything was destroyed; clear bypass bit after
       it was set earlier */
    bypass_objlist_zp(objchn(), false);
    return dmg_out;
}

// C ref: zap.c revive_egg()
function revive_egg(obj) { /* nonnull */
    /*
     * Note: generic eggs with corpsenm set to NON_PM will never hatch.
     */
    if (obj.otyp !== EGG)
        return;
    if (obj.corpsenm !== NON_PM_ZP && !dead_species(obj.corpsenm, true))
        attach_egg_hatch_timeout(obj, 0);
}

// C ref: zap.c unturn_dead()
/* try to revive all corpses and eggs carried by `mon' */
function unturn_dead(mon) {
    const is_u = (mon === game.youmonst);
    const chain = is_u ? [] : (mon.minvent || []).slice().reverse();
    if (is_u)
        for (let o = game.invent; o; o = o.nobj)
            chain.push(o);
    const res = 0;

    for (const otmp of chain) {
        if (otmp.otyp === EGG)
            revive_egg(otmp);
        if (otmp.otyp !== CORPSE)
            continue;
        throw new Error('unturn_dead(): revive() not ported yet');
    }
    return res;
}

// C ref: zap.c unturn_you()
async function unturn_you() {
    unturn_dead(game.youmonst); /* hit carried corpses and eggs */

    if (is_undead_zp(game.youmonst.data)) {
        const HStun = game.u.uprops[STUNNED_ZP].intrinsic;
        await You_feel(`frightened and ${HStun ? "even more " : ""}stunned.`);
        await make_stunned_zp((HStun & TIMEOUT_ZP) + rnd(30), false);
    } else {
        await You("shudder in dread.");
    }
}

// C ref: zap.c ubuzz()
export async function ubuzz(type, nd) {
    await dobuzz(type, nd, game.u.ux, game.u.uy, game.u.dx, game.u.dy,
                 true, false, false);
}

// C ref: zap.c buzz()
export async function buzz(type, nd, sx, sy, dx, dy) {
    await dobuzz(type, nd, sx, sy, dx, dy, true, false, false);
}

// C ref: zap.c dobuzz()
/*
 * type ==   0 to   9 : you zapping a wand
 * type ==  10 to  19 : you casting a spell
 * type ==  20 to  29 : you breathing as a monster
 * type == -10 to -19 : monster casting spell
 * type == -20 to -29 : monster breathing at you
 * type == -30 to -39 : monster zapping a wand
 * called with dx = dy = 0 for vertical bolts
 */
export async function dobuzz(
    type,              /* 0..29 (by hero) or -39..-10 (by monster) */
    nd,                /* damage strength ('number of dice') */
    sx, sy,            /* starting point */
    dx, dy,            /* direction delta */
    sayhit, saymiss,   /* report out of sight hit/miss events */
    forcemiss) {
    const g = game;
    const u = g.u;
    let range;
    const fltyp = zaptype(type), damgtype = fltyp % 10;
    let lsx = sx, lsy = sy;
    let mon;
    const shopdamage = { v: false };
    const fireball = (type === ZT_SPELL(ZT_FIRE)); /* set once */
    let gas_hit = false; /* will be set during each iteration */
    let otmp;
    const hdmgtype = Hallucination() ? rn2(6) : damgtype;

    /* if it's a hero spell then get its SPE_TYPE */
    const spell_type = is_hero_spell(type) ? SPE_MAGIC_MISSILE + damgtype : 0;

    if (u.uswallow) {
        let tmp;

        if (type < 0)
            return;
        const ootmp = { v: null };
        tmp = await zhitm(u.ustuck, type, nd, ootmp);
        otmp = ootmp.v;
        if (!u.ustuck) {
            u.uswallow = 0;
        } else {
            await pline(`${The(flash_str(fltyp, false))} rips into ${
                mon_nam(u.ustuck)}${exclam(tmp)}`);
            /* Using disintegration from the inside only makes a hole... */
            if (tmp === MAGIC_COOKIE)
                u.ustuck.mhp = 0;
            if (u.ustuck.mhp < 1) /* DEADMONSTER() */
                await killed(u.ustuck);
        }
        return;
    }
    if (type < 0)
        newsym(u.ux, u.uy);
    range = rn1(7, 7);
    if (dx === 0 && dy === 0)
        range = 1;
    const save_bhitpos = g.bhitpos ? { x: g.bhitpos.x, y: g.bhitpos.y } : g.bhitpos;

    await tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype));
    zaploop:
    while (range-- > 0) {
        lsx = sx;
        sx += dx;
        lsy = sy;
        sy += dy;
        let make_bounce = false;
        if (!isok(sx, sy) || g.level.at(sx, sy).typ === STONE) {
            make_bounce = true; /* goto make_bounce */
        } else {
            mon = m_at(sx, sy);
            if (cansee(sx, sy)) {
                /* reveal/unreveal invisible monsters before tmp_at() */
                if (mon && !canspotmon(mon))
                    map_invisible(sx, sy);
                else if (!mon)
                    unmap_invisible(sx, sy);
                if (ZAP_POS(g.level.at(sx, sy).typ)
                    || (isok(lsx, lsy) && cansee(lsx, lsy)))
                    await tmp_at(sx, sy);
                /* nh_delay_output(): wait a little */
            }

            /* hit() and miss() need gb.bhitpos to match the target */
            g.bhitpos = { x: sx, y: sy };
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

            let buzzmonst = false;
            if (mon) {
                if (fireball)
                    break;
                if (type >= 0)
                    mon.mstrategy = (mon.mstrategy || 0) & ~STRAT_WAITMASK;
                buzzmonst = true;
            } else if (u_at(sx, sy) && range >= 0) {
                nomul(0);
                if (u.usteed && !rn2(3) && !await mon_reflects(u.usteed, null)) {
                    mon = u.usteed;
                    buzzmonst = true; /* goto buzzmonst */
                } else {
                    if (!forcemiss && zap_hit(u.uac, 0)) {
                        range -= 2;
                        await pline_dir(xytodir(-dx, -dy),
                                        `${The(flash_str(fltyp, false))} hits you!`);
                        if (Reflecting()) {
                            if (!Blind()) {
                                await ureflects("But %s reflects from your %s!",
                                                "it");
                            } else
                                await pline("For some reason you are not affected.");
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
            }
            if (buzzmonst) {
                /* buzzmonst: */
                g.notonhead = (mon.mx !== g.bhitpos.x || mon.my !== g.bhitpos.y);
                if (!forcemiss && zap_hit(find_mac(mon), spell_type)) {
                    if (await mon_reflects(mon, null)) {
                        if (cansee(mon.mx, mon.my)) {
                            await hit(flash_str(fltyp, false), mon, exclam(0));
                            await shieldeff(mon.mx, mon.my);
                            await mon_reflects(mon, "But it reflects from %s %s!");
                            gas_hit = false;
                        }
                        dx = -dx;
                        dy = -dy;
                    } else {
                        const mon_could_move = mon.mcanmove;
                        const ootmp = { v: null };
                        const tmp = await zhitm(mon, type, nd, ootmp);
                        otmp = ootmp.v;

                        if (is_rider(mon.data)
                            && Math.abs(type) === ZT_BREATH(ZT_DEATH)) {
                            if (canseemon(mon)) {
                                await hit(flash_str(fltyp, false), mon, ".");
                                await pline(`${Monnam(mon)} disintegrates.`);
                                await pline(`${s_suffix(Monnam(mon))} body reintegrates before your ${
                                    (eyecount(g.youmonst.data) === 1)
                                        ? body_part(EYE_ZP)
                                        : makeplural(body_part(EYE_ZP))}!`);
                                await pline(`${Monnam(mon)} resurrects!`);
                            }
                            mon.mhp = mon.mhpmax;
                            break zaploop; /* Out of while loop */
                        }
                        if (mon.data === mons_zy[PM_DEATH_ZP] && damgtype === ZT_DEATH) {
                            if (canseemon(mon)) {
                                await hit(flash_str(fltyp, false), mon, ".");
                                await pline(`${Monnam(mon)} absorbs the deadly ${
                                    type === ZT_BREATH(ZT_DEATH) ? "blast" : "ray"}!`);
                                await pline("It seems even stronger than before.");
                            }
                            break zaploop; /* Out of while loop */
                        }

                        if (tmp === MAGIC_COOKIE) { /* disintegration */
                            await disintegrate_mon(mon, type, flash_str(fltyp, false));
                        } else if (mon.mhp < 1) { /* DEADMONSTER(mon) */
                            if (type < 0) {
                                /* mon has just been killed by another monster */
                                await monkilled(mon, flash_str(fltyp, false), AD_RBRE);
                            } else {
                                let xkflags = XKILL_GIVEMSG_ZP; /* killed(mon); */

                                /* killed by hero; we know 'type' isn't negative;
                                   if it's fire, highly flammable monsters leave
                                   no corpse; don't bother reporting that they
                                   "burn completely" -- unnecessary verbosity */
                                if (damgtype === ZT_FIRE
                                    /* paper golem or straw golem */
                                    && completelyburns(mon.data))
                                    xkflags |= XKILL_NOCORPSE_ZP;
                                await xkilled(mon, xkflags);
                            }
                        } else {
                            if (!otmp) {
                                /* normal non-fatal hit */
                                if (sayhit || canseemon(mon))
                                    await hit(flash_str(fltyp, false), mon, exclam(tmp));
                            } else {
                                /* some armor was destroyed; no damage done */
                                if (canseemon(mon))
                                    await pline(`${s_suffix(Monnam(mon))} ${
                                        distant_name(otmp, xname)} is disintegrated!`);
                                m_useup(mon, otmp);
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
            }
            /* gas that missed or that hit without being reflected will leave
               a 1x1 cloud here; the earlier zap_over_floor() was deferred */
            if (gas_hit)
                await zap_over_floor(sx, sy, type, shopdamage, true, 0);
        }

        if (make_bounce
            || !ZAP_POS(g.level.at(sx, sy).typ)
            || (closed_door(sx, sy) && range >= 0)) {
            /* make_bounce: */
            const bchance = (!isok(sx, sy) || g.level.at(sx, sy).typ === STONE) ? 10
                : (In_mines(u.uz) && IS_WALL(g.level.at(sx, sy).typ)) ? 20
                    : 75;
            if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy))
                || fireball) {
                if (Is_airlevel(u.uz)) { /* nothing to bounce off of */
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
            const dd = { dx, dy };
            bounce_dir(sx, sy, dd, bchance);
            dx = dd.dx, dy = dd.dy;
            await tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype));
        }
    }
    await tmp_at(DISP_END, 0);
    if (fireball)
        await explode(sx, sy, type, d(12, 6), 0, EXPL_FIERY_ZP);
    if (shopdamage.v)
        await pay_for_damage_zp(damgtype === ZT_FIRE ? "burn away"
                                : damgtype === ZT_COLD ? "shatter"
                                  /* "damage" indicates wall rather than door */
                                  : damgtype === ZT_ACID ? "damage"
                                    : damgtype === ZT_DEATH ? "disintegrate"
                                      : "destroy",
                                false);
    g.bhitpos = save_bhitpos;
}

// C ref: zap.c melt_ice()
export async function melt_ice(x, y, msg) {
    const g = game;
    const lev = g.level.at(x, y);
    let otmp, mtmp;

    if (!msg)
        msg = "The ice crackles and melts.";
    if (lev.typ === DRAWBRIDGE_UP_ZP || lev.typ === DRAWBRIDGE_DOWN_ZP) {
        lev.drawbridgemask &= ~DB_ICE_ZP; /* revert to DB_MOAT */
    } else { /* lev->typ == ICE */
        lev.typ = (lev.icedpool === ICED_POOL_ZP ? POOL_ZP : MOAT_ZP);
        lev.icedpool = 0;
    }
    spot_stop_timers_zp(x, y, MELT_ICE_AWAY_ZP); /* no more ice to melt away */
    if (t_at(x, y))
        await trap_ice_effects(x, y, true); /* TRUE because ice_is_melting */
    obj_ice_effects_zp(x, y, false);
    unearth_objs(x, y);
    if (g.u.uinwater) /* Underwater */
        vision_recalc(1);
    newsym(x, y);
    if (cansee(x, y) || u_at(x, y))
        await Norep_zp(msg);
    if ((otmp = sobj_at(O_zy.BOULDER, x, y)) !== null && otmp !== undefined)
        throw new Error('melt_ice(): a boulder settling into the pool (boulder_hits_pool()) not ported yet');
    if (u_at(x, y))
        await spoteffects_zp(true); /* possibly drown, notice objects */
    else if (is_pool(x, y) && (mtmp = m_at(x, y)) !== null && mtmp !== undefined)
        await minliquid_zp(mtmp);
}

// C ref: zap.c start_melt_ice_timeout()
/*
 * Usually start a melt_ice timer; sometimes the ice will become
 * permanent instead.
 */
export function start_melt_ice_timeout(x, y,
                                       min_time) { /* <x,y>'s old melt timeout (deleted by time we get here) */
    const MIN_ICE_TIME = 50, MAX_ICE_TIME = 2000;
    let when = min_time;

    if (when < MIN_ICE_TIME - 1)
        when = MIN_ICE_TIME - 1;

    /* random timeout; surrounding ice locations ought to be a factor... */
    while (++when <= MAX_ICE_TIME)
        if (!rn2((MAX_ICE_TIME - when) + MIN_ICE_TIME))
            break;

    /* if we're within MAX_ICE_TIME, install a melt timer;
       otherwise, omit it to leave this ice permanent */
    if (when <= MAX_ICE_TIME) {
        const where = (x << 16) | y;

        start_timer_zp(when, TIMER_LEVEL_ZP, MELT_ICE_AWAY_ZP,
                       long_to_any_zp(where));
    }
}

// C ref: zap.c zap_over_floor()
export async function zap_over_floor(
    x, y,              /* location */
    type,              /* damage type plus {wand|spell|breath} info */
    shopdamage,        /* extra output if shop door is destroyed */
    ignoremon,         /* ignore any monster here */
    exploding_wand_typ) { /* supplied when breaking a wand; or POT_OIL
                           * when a lit potion of oil explodes */
    const g = game;
    const lev = g.level.at(x, y);
    const see_it = cansee(x, y);
    let rangemod = 0;
    const damgtype = zaptype(type) % 10;
    const lavawall = (lev.typ === LAVAWALL);
    let t;

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
                await Norep_zp("A web bursts into flames!");
            await delfloortrap_zp(t), t = null;
            if (see_it)
                newsym(x, y);
        }
        if (is_ice_zp(x, y)) {
            await melt_ice(x, y, null);
        } else if (is_pool(x, y)) {
            const on_water_level = Is_waterlevel_zp(g.u.uz);
            let msggiven = false;
            let msgtxt = (!Deaf())
                         ? "You hear hissing gas." /* Deaf-aware */
                         : (type >= 0)
                           ? "That seemed remarkably uneventful."
                           : null;

            /* don't create steam clouds on Plane of Water; air bubble
               movement and gas regions don't understand each other */
            if (!on_water_level) {
                await create_gas_cloud_zp(x, y, rnd(5), 0); /* 1..5, no damg */
                if (g.iflags.last_msg === PLNMSG_ENVELOPED_IN_GAS_ZP)
                    msggiven = true;
            }

            if (lev.typ !== POOL_ZP) { /* MOAT or DRAWBRIDGE_UP or WATER */
                t = null;
                if (on_water_level)
                    msgtxt = (see_it || !Deaf()) ? "Some water boils." : null;
                else if (see_it)
                    msgtxt = "Some water evaporates.";
            } else {
                rangemod -= 3;
                lev.typ = ROOM_ZP, lev.flags = 0;
                t = maketrap_zp(x, y, PIT);
                /*if (t) -- this was before the vapor cloud was added --
                      t->tseen = 1;*/
                if (see_it)
                    msgtxt = "The water evaporates.";
            }
            if (msgtxt && !msggiven)
                await Norep_zp(msgtxt);

            if (lev.typ === ROOM_ZP) { /* POOL changed to ROOM above */
                let mon;
                if ((mon = m_at(x, y)) !== null && mon !== undefined) {
                    /* probably ought to do some hefty damage to any
                       creature caught in boiling water;
                       at a minimum, eels are forced out of hiding */
                    if (is_swimmer_zp(mon.data) && mon.mundetected) {
                        mon.mundetected = 0;
                    }
                } else {
                    mon = null;
                }
                newsym(x, y);
                if (t) {
                    /* if water walking/swimming/magical breathing, maybe fall
                       into the new pit (after the water evaporation message);
                       if flying or levitating, nothing will happen */
                    if (u_at(x, y))
                        await dotrap_zp(t, NO_TRAP_FLAGS_ZP);
                    else if (mon)
                        await mintrap_zp(mon, NO_TRAP_FLAGS_ZP);
                }
            }
        } else if (lev.typ === FOUNTAIN) { /* IS_FOUNTAIN() */
            await create_gas_cloud_zp(x, y, rnd(3), 0); /* 1..3, no damage */
            if (see_it)
                await pline("Steam billows from the fountain.");
            rangemod -= 1;
            await dryup_zp(x, y, type > 0);
        }
        break; /* ZT_FIRE */

    case ZT_COLD:
        if (is_pool(x, y) || is_lava(x, y) || lavawall) {
            const lava = (is_lava(x, y) || lavawall),
                  moat = is_moat_zp(x, y);
            const chance = Math.max(2, 5 + (g.level.flags.temperature || 0) * 10);

            if (IS_WATERWALL_ZP(lev.typ) || (lavawall && rn2(chance))) {
                /* For now, don't let WATER freeze. */
                /* Soundeffect(se_soft_crackling, 100); */
                if (see_it)
                    await pline_The(`${hliquid_zp(lavawall ? "lava" : "water")} freezes for a moment.`);
                else
                    await You_hear_zp("a soft crackling.");
                rangemod -= 1000; /* stop */
            } else {
                const buf = waterbody_name_zp(x, y); /* for MOAT */
                rangemod -= 3;
                if (lev.typ === DRAWBRIDGE_UP_ZP) {
                    lev.drawbridgemask &= ~DB_UNDER_ZP; /* clear lava */
                    lev.drawbridgemask |= (lava ? DB_FLOOR_ZP : DB_ICE_ZP);
                } else {
                    lev.icedpool = lava ? 0
                                        : (lev.typ === POOL_ZP) ? ICED_POOL_ZP
                                                                : ICED_MOAT_ZP;
                    if (lavawall) {
                        if ((isok_zp(x, y - 1) && IS_WALL(g.level.at(x, y - 1).typ))
                            || (isok_zp(x, y + 1) && IS_WALL(g.level.at(x, y + 1).typ)))
                            lev.typ = VWALL_ZP;
                        else
                            lev.typ = HWALL_ZP;
                        fix_wall_spines_zp(Math.max(0, x - 1), Math.max(0, y - 1),
                                           Math.min(COLNO_ZP - 1, x + 1),
                                           Math.min(ROWNO_ZP - 1, y + 1));
                    } else {
                        lev.typ = lava ? ROOM_ZP : ICE;
                    }
                }
                await bury_objs(x, y);
                /* if (!lava) Soundeffect(se_soft_crackling, 30); */
                if (see_it) {
                    if (lava)
                        await Norep_zp(`The ${hliquid_zp("lava")} cools and solidifies.`);
                    else if (moat)
                        await Norep_zp(`The ${buf} is bridged with ice!`);
                    else
                        await Norep_zp(`The ${hliquid_zp("water")} freezes.`);
                    newsym(x, y);
                } else if (!lava) {
                    await You_hear_zp("a crackling sound.");
                }
                let mon;
                if (u_at(x, y)) {
                    if (g.u.uinwater) { /* not just `if (Underwater)' */
                        /* leave the no longer existent water */
                        await set_uinwater(0); /* u.uinwater = 0 */
                        g.u.uundetected = 0;
                        await docrt();
                        g.vision_full_recalc = 1;
                    } else if (g.u.utrap && g.u.utraptype === TT_LAVA_ZP) {
                        throw new Error('zap_over_floor(): hero stuck in cooling lava not ported yet');
                    }
                } else if ((mon = m_at(x, y)) !== null && mon !== undefined) {
                    /* probably ought to do some hefty damage to any
                       non-ice creature caught in freezing water;
                       at a minimum, eels are forced out of hiding */
                    if (is_swimmer_zp(mon.data) && mon.mundetected) {
                        mon.mundetected = 0;
                        newsym(x, y);
                    }
                }
                if (!lava) {
                    start_melt_ice_timeout(x, y, 0);
                    obj_ice_effects_zp(x, y, true);
                }
            } /* ?WATER */

        } else if (is_ice_zp(x, y)) {
            let melt_time;

            /* Already ice here, so just firm it up. */
            /* Now ensure that only ice that is already timed is affected */
            if ((melt_time = spot_time_left_zp(x, y, MELT_ICE_AWAY_ZP)) !== 0) {
                spot_stop_timers_zp(x, y, MELT_ICE_AWAY_ZP);
                start_melt_ice_timeout(x, y, melt_time);
            }
        }
        break; /* ZT_COLD */

    case ZT_POISON_GAS:
        /* poison gas with range 1: green dragon/iron golem breath (AD_DRST);
           caller is placing a series of 1x1 clouds along the zap's path;
           <x,y> for wall locations might be included--reject those */
        if (ZAP_POS(lev.typ))
            await create_gas_cloud_zp(x, y, 1, 8);
        break;

    case ZT_LIGHTNING:
    case ZT_ACID: // eslint-disable-line no-fallthrough
        if (lev.typ === IRONBARS) {
            if (damgtype === ZT_LIGHTNING && rn2(10))
                break;
            if ((lev.wall_info & W_NONDIGGABLE_ZP) !== 0) {
                if (see_it)
                    await Norep_zp(`The iron bars ${
                        (damgtype === ZT_ACID) ? "corrode" : "melt"} somewhat but remain intact.`);
                /* but nothing actually happens... */
            } else {
                rangemod -= 3;
                if (see_it)
                    await Norep_zp(`The iron bars ${
                        (damgtype === ZT_ACID) ? "corrode away" : "melt"}.`);
                await dissolve_bars(x, y);
                if (in_rooms_zp(x, y, SHOPBASE_ZP).length) {
                    add_damage_zp(x, y, (type >= 0) ? SHOP_BARS_COST_ZP : 0);
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
    const yourzap = (type >= 0 && !exploding_wand_typ);
    let zapverb = "blast"; /* breath attack or wand explosion */
    if (!exploding_wand_typ) {
        const ztype = zaptype(type); /* 0..29 for both hero and monsters */

        if (ztype < ZT_SPELL(0))
            zapverb = "bolt"; /* wand zap */
        else if (ztype < ZT_BREATH(0))
            zapverb = "spell";
    } else if (exploding_wand_typ === POT_OIL
               || exploding_wand_typ === SCR_FIRE) {
        /* breakobj() -> explode_oil() -> splatter_burning_oil()
           -> explode(ZT_SPELL(ZT_FIRE), BURNING_OIL)
           -> zap_over_floor(ZT_SPELL(ZT_FIRE), POT_OIL) */
        /* leave zapverb as "blast"; exploding_wand_typ was nonzero, so
           'yourzap' is FALSE and the result will be "the blast" */
        exploding_wand_typ = 0; /* not actually an exploding wand */
    }

    /* secret door gets revealed, converted into regular door */
    if (lev.typ === SDOOR) {
        cvt_sdoor_to_door_zp(lev); /* .typ = DOOR */
        recalc_block_point_zp(x, y);
        /* target spot will now pass closed_door() test below
           (except on rogue level) */
        newsym(x, y);
        if (see_it)
            await pline(`${yourzap ? "Your" : "The"} ${zapverb} reveals a secret door.`);
        else if (Is_rogue_level_zp(g.u.uz))
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
            new_doormask = D_NODOOR_ZP;
            see_txt = "The door is consumed in flames!";
            sense_txt = "smell smoke.";
            break;
        case ZT_COLD:
            new_doormask = D_NODOOR_ZP;
            see_txt = "The door freezes and shatters!";
            hear_txt = "a deep cracking sound.";
            break;
        case ZT_DEATH:
            /* death spells/wands don't disintegrate */
            if (Math.abs(type) !== ZT_BREATH(ZT_DEATH)) {
                def_case = true; /* goto def_case */
                break;
            }
            new_doormask = D_NODOOR_ZP;
            see_txt = "The door disintegrates!";
            hear_txt = "crashing wood.";
            break;
        case ZT_LIGHTNING:
            new_doormask = D_BROKEN_ZP;
            see_txt = "The door splinters!";
            hear_txt = "crackling.";
            break;
        default:
            def_case = true;
            break;
        }
        if (def_case) {
            /* def_case: */
            if (exploding_wand_typ > 0
                /* Magical explosion from misc exploding wand */
                && exploding_wand_typ === O_zy.WAN_STRIKING) {
                new_doormask = D_BROKEN_ZP;
                see_txt = "The door crashes open!";
                sense_txt = "feel a burst of cool air.";
            } else if (see_it) {
                /* "the door absorbs the blast" would be
                   inaccurate for an exploding wand since
                   other adjacent locations still get hit */
                if (exploding_wand_typ)
                    await pline_The("door remains intact.");
                else
                    await pline_The(`door absorbs ${yourzap ? "your" : "the"} ${zapverb}!`);
            } else
                await You_feel("vibrations.");
        }
        if (new_doormask >= 0) { /* door gets broken */
            if (in_rooms_zp(x, y, SHOPBASE_ZP).length) {
                if (type >= 0) {
                    add_damage_zp(x, y, SHOP_DOOR_COST_ZP);
                    shopdamage.v = true;
                } else /* caused by monster */
                    add_damage_zp(x, y, 0);
            }
            lev.doormask = new_doormask;
            recalc_block_point_zp(x, y); /* vision */
            if (see_it) {
                await pline(see_txt);
                newsym(x, y);
            } else if (sense_txt) {
                await You(sense_txt);
            } else if (hear_txt)
                await You_hear_zp(hear_txt);
            if (picking_at_zp(x, y)) {
                await stop_occupation();
                reset_pick_zp();
            }
        }
    }

    if ((g.level.objects || []).some(o => o.ox === x && o.oy === y) /* OBJ_AT() */
        && damgtype === ZT_FIRE)
        if (await burn_floor_objects(x, y, false, type > 0) && couldsee(x, y)) {
            newsym(x, y);
            await You(`${!Blind() ? "see a puff" : "smell a whiff"} of smoke.`);
        }
    let mon;
    if (!ignoremon && (mon = m_at(x, y)) !== null && mon !== undefined)
        await wakeup(mon, (type >= 0) ? true : false);
    return rangemod;
}

// C ref: zap.c mon_spell_hits_spot()
/* monster has cast flames or frost at target on <x,y>; called by mcastu() */
export async function mon_spell_hits_spot(
    caster, /* UNUSED */
    adtyp, /* canonical damage type */
    x, y) /* so far, only used for targeting <u.ux,u.uy> */
{
    void caster;
    /* "shower of missiles" or [hypothetical] "acid rain" attack:
       thoroughly clobber an engraving (unless its type makes it be
       scuff-protected); zap_over_floor() doesn't handle this */
    if (adtyp === AD_MAGM || adtyp === AD_ACID) {
        const ep = engr_at(x, y);
        const etext = ep ? ep.engr_txt.actual_text : null;

        if (etext)
            wipe_engr_at(x, y, etext.length + d(6, 6), true);
        /* hero and player will still remember prior text until the spot
           is re-examined (lookhere or move off and back on) */
    }

    /* hit items and/or terrain; only matters for AD_FIRE and AD_COLD but
       accept any basic damage type that zap_over_floor() might handle */
    if (adtyp >= AD_MAGM && adtyp <= AD_ACID) {
        const shopdummy = { v: false }; /* zap_over_floor() requires this
                                             * even though it's only used when
                                             * zapdmgtyp is non-negative */
        const zt_typ = adtyp - 1,            /* convert AD_xxxx to ZT_xxxx */
            zapdmgtyp = -ZT_SPELL(zt_typ);   /* damage is from monster spell */

        await zap_over_floor(x, y, zapdmgtyp, shopdummy, true, 0);
    } /* else impossible("Unsupported damage type (%d) for
         mon_spell_hits_spot.", adtyp) */
}


// C ref: zap.c burn_floor_objects() -- burn scrolls and spellbooks on
// floor at position x,y; return the number of scrolls and spellbooks burned
export async function burn_floor_objects(
    x, y,
    give_feedback, /* caller needs to decide about visibility checks */
    u_caused) {
    let cnt = 0;

    for (const obj of level_objects_at(x, y)) {
        if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
            || (obj.oclass === FOOD_CLASS
                && obj.otyp === GLOB_OF_GREEN_SLIME)) {
            if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL
                || obj_resists(obj, 2, 100))
                continue;
            const scrquan = obj.quan; /* number present */
            let delquan = 0;          /* number to destroy */
            for (let i = scrquan; i > 0; i--)
                if (!rn2(3))
                    delquan++;
            if (delquan) {
                let buf1, buf2;
                /* save name before potential delobj() */
                if (give_feedback) {
                    obj.quan = 1;
                    buf1 = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
                    obj.quan = 2;
                    buf2 = u_at(x, y) ? xname(obj) : distant_name(obj, xname);
                    obj.quan = scrquan;
                }
                /* useupf(), which charges, only if hero caused damage */
                if (u_caused)
                    useupf_zp(obj, delquan);
                else if (delquan < scrquan) {
                    obj.quan -= delquan;
                    obj.owt = weight(obj);
                } else
                    delobj(obj);
                cnt += delquan;
                if (give_feedback) {
                    if (delquan > 1)
                        await pline(`${delquan} ${buf2} burn.`);
                    else
                        await pline(`${An_zp(buf1)} burns.`);
                }
            }
        }
    }
    /* This also ignites floor items, but does not change cnt
       because they weren't consumed. */
    /* ignite_items(svl.level.objects[x][y]), along the nexthere chain */
    for (const obj of level_objects_at(x, y))
        if (!obj.lamplit && !obj.in_use)
            await catch_lit_zp(obj);
    return cnt;
}


/* C ref: zap.c MAGIC_COOKIE */
const MAGIC_COOKIE = 1000;
/* C ref: youprop.h property tests used by zhitu()/zapyourself() */
function uhave_zp(p) {
    const q = game.u.uprops[p];
    return !!(q && (q.intrinsic || q.extrinsic));
}
// C ref: uhitm.c disguised_as_non_mon()
function disguised_as_non_mon(mtmp) {
    return (!sensemon_zp(mtmp)
            && !!mtmp.m_ap_type
            && mtmp.m_ap_type !== M_AP_MONSTER_ZP);
}

/* C ref: hack.h ERODE_CORRODE */
const ERODE_CORRODE_ZP = 3;


/* C ref: mondata.h is_reviver(), is_displacer() */
function is_reviver_rv(ptr) { return is_rider(ptr) || ptr.mlet === S_TROLL_RV; }
function is_displacer_rv(ptr) { return ((ptr.mflags3 || 0) & M3_DISPLACES_RV) !== 0; }
/* C ref: obj.h has_omonst(), has_omid(), OMID(); mextra.c free_omonst(),
   free_omid() */
function has_omonst_rv(obj) { return !!obj.oextra?.omonst; }
function has_omid_rv(obj) { return !!(obj.oextra?.omid || obj.omid); }
function free_omonst_rv(obj) { if (obj.oextra) delete obj.oextra.omonst; }
function free_omid_rv(obj) {
    if (obj.oextra) delete obj.oextra.omid;
    delete obj.omid;
}

// C ref: zap.c get_container_location() -- returns the following
// information about the outermost container: loc.v gets set to
// OBJ_INVENT, OBJ_FLOOR, OBJ_BURIED (returning null) or OBJ_MINVENT
// (returning the monster); nesting.v is updated with the nesting depth of
// the containers if applicable
function get_container_location(obj, loc, container_nesting) {
    if (container_nesting)
        container_nesting.v = 0;
    while (obj && obj.where === 'OBJ_CONTAINED') {
        if (container_nesting)
            container_nesting.v += 1;
        obj = obj.ocontainer;
    }
    if (obj) {
        loc.v = obj.where; /* outermost container's location */
        if (obj.where === 'OBJ_MINVENT')
            return obj.ocarry;
    }
    return null;
}

// C ref: zap.c zombie_can_dig() -- can zombie dig the location at x,y
function zombie_can_dig(x, y) {
    if (isok_rv(x, y)) {
        const typ = game.level.at(x, y).typ;

        if (t_at(x, y) != null)
            return false;
        if (typ === ROOM_RV || typ === CORR_RV || typ === GRAVE_RV)
            return true;
    }
    return false;
}

// C ref: zap.c montraits()
/* used by revive() and animate_statue() */
export async function montraits(
    obj,
    cc,
    adjacentok) /* False: at obj's spot only,
                 * True: nearby is allowed */
{
    let mtmp = null;
    const mtmp2 = has_omonst_rv(obj) ? get_mtraits_rv(obj, true) : null;

    if (mtmp2) {
        /* save_mtraits() validated mtmp2->mnum */
        mtmp2.data = mons_rv[mtmp2.mnum];

        if (mtmp2.mhpmax > 0 || is_rider(mtmp2.data)) {
            mtmp = await makemon_revive(mtmp2.data, cc.x, cc.y,
                           (NO_MINVENT_RV | MM_NOWAIT_RV | MM_NOCOUNTBIRTH_RV
                            /* in case mtmp2 is a long worm; saved traits for
                               long worm don't include tail segments so don't
                               give mtmp any; it will be given a new 'wormno'
                               though (unless those are exhausted) so be able
                               to grow new tail segments */
                            | MM_NOTAIL_RV | MM_NOMSG_RV
                            | (adjacentok ? MM_ADJACENTOK_RV : 0)));
        }
        if (!mtmp) {
            /* mtmp2 is a copy of obj's object->oextra->omonst extension
               and is not on the map or on any monst lists */
            /* dealloc_monst(mtmp2) */
            return null;
        }

        /* heal the monster; lower than normal level might come from
           adj_lev() but we assume it has come from 'mtmp' being level
           drained before finally killed; give a chance to restore
           some levels so that trolls and Riders can't be drained to
           level 0 and then trivially killed repeatedly */
        if (mtmp.m_lev < mtmp.data.mlevel) {
            const ltmp = rnd(mtmp.data.mlevel + 1);

            if (ltmp > mtmp.m_lev) {
                while (mtmp.m_lev < ltmp) {
                    mtmp.m_lev++;
                    mtmp.mhpmax += monhp_per_lvl_rv(mtmp);
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
            const qs = game.quest_status;
            if (qs?.leader_is_dead
                /* leader_is_dead implies leader_m_id is valid */
                && mtmp2.m_id === qs.leader_m_id)
                qs.leader_is_dead = false;
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
        /* SYSOPT_SEDUCE is on in the recorded games */
        if (!dmgtype_rv(mtmp2.data, AD_SEDU_RV)
            && (!dmgtype_rv(mtmp2.data, AD_SSEX_RV)))
            mtmp2.mcan = 0;
        mtmp2.mcansee = 1; /* set like in makemon */
        mtmp2.mblinded = 0;
        mtmp2.mstun = 0;
        mtmp2.mconf = 0;
        /* when traits are for a shopkeeper, dummy monster 'mtmp' won't
           have necessary eshk data for replmon() -> replshk() */
        if (mtmp2.isshk) {
            /* neweshk(mtmp); *ESHK(mtmp) = *ESHK(mtmp2); ...; and
               replmon()'s replshk() */
            throw new Error('montraits(): shopkeeper traits (replshk()) not ported yet');
        }
        replmon_rv(mtmp, mtmp2);
        newsym(mtmp2.mx, mtmp2.my); /* Might now be invisible */

        /* in case Protection_from_shape_changers is different
           now than it was when the traits were stored */
        restore_cham_rv(mtmp2);
    }
    return mtmp2;
}

/* makemon() for revive(): makemon()'s dochugw() for an occupied hero is
   async in this port, so it is run by makemon_flush_msg() right after
   makemon() returns (see the Norep() comment in makemon()) */
async function makemon_revive(ptr, x, y, mmflags) {
    let mtmp;
    game.makemon_want_msg = true;
    try {
        mtmp = makemon_rv(ptr, x, y, mmflags);
    } finally {
        game.makemon_want_msg = false;
    }
    await makemon_flush_msg_rv();
    return mtmp;
}

// C ref: zap.c revive()
/*
 * Attempt to revive the given corpse, return the revived monster if
 * successful.  Note: this does NOT use up the corpse if it fails.
 * If corpse->quan is more than 1, only one corpse will be affected
 * and only one monster will be resurrected.
 */
export async function revive(corpse, by_hero) {
    let mtmp = null;
    let mptr;
    let container;
    const xy = { x: 0, y: 0 };
    let x, y;
    let one_of;
    let mmflags = NO_MINVENT_RV | MM_NOWAIT_RV | MM_NOMSG_RV;
    let cgend;
    const container_nesting = { v: 0 };

    if (corpse.otyp !== CORPSE_RV) {
        impossible(`Attempting to revive ${xname_rv(corpse)}?`);
        return null;
    }
    const montype = { v: corpse.corpsenm };
    /* treat buried auto-reviver (troll, Rider?) like a zombie
       so that it can dig itself out of the ground if it revives */
    const is_zomb = mons_rv[montype.v].mlet === S_ZOMBIE_RV
              || (corpse.where === 'OBJ_BURIED' && is_reviver_rv(mons_rv[montype.v]));

    /* if this corpse is being eaten, stop doing that; this should be done
       after makemon() succeeds and skipped if it fails, but waiting until
       we know the result for that would be too late */
    await cant_finish_meal_rv(corpse);

    x = y = 0;
    if (corpse.where !== 'OBJ_CONTAINED') {
        const locflags = is_zomb ? BURIED_TOO_RV : 0;

        /* only for invent, minvent, or floor, or if zombie, buried */
        container = null;
        const loc = get_obj_location_rv(corpse, locflags);
        if (loc)
            [x, y] = loc;
    } else {
        /* deal with corpses in [possibly nested] containers */
        const holder = { v: 'OBJ_FREE' };

        container = corpse.ocontainer;
        const carrier = get_container_location(container, holder,
                                               container_nesting);
        switch (holder.v) {
        case 'OBJ_MINVENT':
            x = carrier.mx, y = carrier.my;
            break;
        case 'OBJ_INVENT':
            x = game.u.ux, y = game.u.uy;
            break;
        case 'OBJ_FLOOR': {
            const loc = get_obj_location_rv(corpse, CONTAINED_TOO_RV);
            if (loc)
                [x, y] = loc;
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
                          || container.otyp === STATUE_RV
                          || (container.otyp === BAG_OF_HOLDING_RV && rn2(40))))
        /* if buried zombie cannot dig itself out, do not revive */
        || (is_zomb && corpse.where === 'OBJ_BURIED' && !zombie_can_dig(x, y)))
        return null;

    /* prepare for the monster */
    mptr = mons_rv[montype.v];
    /* [should probably handle recorporealization first; if corpse and
       ghost are at same location, revived creature shouldn't be bumped
       to an adjacent spot by ghost which joins with it] */
    if (m_at(x, y)) { /* MON_AT(x, y) */
        if (enexto_rv(xy, x, y, mptr))
            x = xy.x, y = xy.y;
    }

    if (corpse.norevive
        || (mons_rv[montype.v].mlet === S_EEL_RV
            && !IS_POOL_RV(game.level.at(x, y).typ))) {
        if (cansee(x, y))
            await pline(`${upstart(corpse_xname_rv(corpse, null,
                                                      CXN_PFX_THE_RV))} twitches feebly.`);
        return null;
    }

    /* applicable when montraits/corpse->oextra->omonst aren't used */
    cgend = (corpse.spe & CORPSTAT_GENDER_RV);
    if (cgend === CORPSTAT_MALE_RV)
        mmflags |= MM_MALE_RV;
    else if (cgend === CORPSTAT_FEMALE_RV)
        mmflags |= MM_FEMALE_RV;

    if (cant_revive_rv(montype, true, corpse)) {
        /* make a zombie or doppelganger instead */
        /* note: montype has changed; mptr keeps old value for newcham() */
        mtmp = await makemon_revive(mons_rv[montype.v], x, y, mmflags);
        if (mtmp) {
            /* skip ghost handling */
            if (has_omid_rv(corpse))
                free_omid_rv(corpse);
            if (has_omonst_rv(corpse))
                free_omonst_rv(corpse);
            if (mtmp.cham === PM_DOPPELGANGER_RV) {
                /* change shape to match the corpse */
                await newcham_rv(mtmp, mptr, NO_NC_FLAGS_RV);
            } else if (mtmp.data.mlet === S_ZOMBIE_RV) {
                mtmp.mhp = mtmp.mhpmax = 100;
                await mon_adjust_speed_rv(mtmp, 2, null); /* MFAST */
            }
        }
    } else if (has_omonst_rv(corpse)) {
        /* use saved traits */
        xy.x = x, xy.y = y;
        mtmp = await montraits(corpse, xy, false);
        if (mtmp && mtmp.mtame && !mtmp.isminion)
            await wary_dog_rv(mtmp, true);
    } else {
        /* make a new monster */
        mtmp = await makemon_revive(mptr, x, y, mmflags | MM_NOCOUNTBIRTH_RV);
    }
    if (!mtmp)
        return null;

    /* hiders shouldn't already be re-hidden when they revive */
    if (mtmp.mundetected) {
        mtmp.mundetected = 0;
        newsym(mtmp.mx, mtmp.my);
    }
    if (mtmp.m_ap_type) /* M_AP_TYPE(mtmp) */
        seemimic_rv(mtmp);

    one_of = (corpse.quan > 1);
    if (one_of)
        corpse = splitobj(corpse, 1);

    /* if this is caused by the hero there might be a shop charge */
    if (by_hero) {
        /* costly_spot()/shop_keeper(), the "%s glows iridescently."
           message and stolen_value() */
        throw new Error('revive(): by_hero shop handling not ported yet');
    }

    /* handle recorporealization of an active ghost */
    if (has_omid_rv(corpse)) {
        const m_id = corpse.oextra?.omid || corpse.omid; /* OMID(corpse) */
        const ghost = (game.level.monsters || []).find(
            m => m.m_id === m_id && !m.dead); /* find_mid(m_id, FM_FMON) */
        if (ghost && ghost.data === mons_rv[PM_GHOST_RV])
            throw new Error('revive(): ghost recorporealization not ported yet');
        free_omid_rv(corpse);
    }

    /* monster retains its name */
    if (has_oname_rv(corpse) && !((mtmp.data.geno & G_UNIQ_RV) !== 0))
        mtmp = christen_monst_rv(mtmp, ONAME_rv(corpse));
    /* partially eaten corpse yields wounded monster */
    if (corpse.oeaten)
        mtmp.mhp = eaten_stat_rv(mtmp.mhp, corpse);
    /* track that this monster was revived at least once */
    mtmp.mrevived = 1;

    /* finally, get rid of the corpse--it's gone now */
    switch (corpse.where) {
    case 'OBJ_INVENT':
        useup_zp(corpse);
        break;
    case 'OBJ_FLOOR':
        /* not useupf(), which charges;
           delobj() won't use up a Rider's corpse, delobj_core(,TRUE) will */
        delobj_core_rv(corpse, true); /* for floor, also calls newsym() */
        break;
    case 'OBJ_MINVENT':
        m_useup(corpse.ocarry, corpse);
        break;
    case 'OBJ_CONTAINED':
        /* obj_extract_self() will update corpse->ocontainer->owt */
        obj_extract_self_rv(corpse);
        obfree_zp(corpse, null);
        break;
    case 'OBJ_BURIED':
        if (is_zomb) {
            obj_extract_self_rv(corpse);
            obfree_zp(corpse, null);
            break;
        }
        /*FALLTHRU*/
    default:
        throw new Error(`revive default case ${corpse.where}`); /* panic() */
    }

    return mtmp;
}

// C ref: do.c revive_corpse()
/*
 * Return TRUE if we created a monster for the corpse.  If successful, the
 * corpse is gone.
 */
export async function revive_corpse(corpse) {
    let mtmp, mcarry;
    let container = null;
    const container_where = { v: 0 };

    const where = corpse.where;
    const montype = corpse.corpsenm;
    /* treat buried auto-reviver (troll, Rider?) like a zombie
       so that it can dig itself out of the ground if it revives */
    const is_zomb = (mons_rv[montype].mlet === S_ZOMBIE_RV
               || (where === 'OBJ_BURIED' && is_reviver_rv(mons_rv[montype])));
    const is_uwep = (corpse === game.uwep);
    const chewed = (corpse.oeaten !== 0 && !!corpse.oeaten);
    const cname = corpse_xname_rv(corpse, chewed ? "bite-covered" : null,
                                  CXN_SINGULAR_RV);
    mcarry = (where === 'OBJ_MINVENT') ? corpse.ocarry : null;
    /* mcarry is NULL for (where == OBJ_BURIED and OBJ_CONTAINED) now */

    const cloc = get_obj_location_rv(corpse, CONTAINED_TOO_RV | BURIED_TOO_RV);
    const [corpsex, corpsey] = cloc || [0, 0];

    if (where === 'OBJ_CONTAINED') {
        container = corpse.ocontainer;
        const mtmp2 = get_container_location(container, container_where, null);
        /* container_where is outermost container's location even if nested */
        if (container_where.v === 'OBJ_MINVENT' && mtmp2)
            mcarry = mtmp2;
    }
    mtmp = await revive(corpse, false); /* corpse is gone if successful */

    if (mtmp) {
        switch (where) {
        case 'OBJ_INVENT':
            if (is_uwep)
                await pline_The(`${cname} writhes out of your grasp!`);
            else
                await You_feel("squirming in your backpack!");
            break;

        case 'OBJ_FLOOR':
            if (cansee(corpsex, corpsey) || canseemon(mtmp)) {
                let effect = "";

                if (mtmp.data === mons_rv[PM_DEATH_RV])
                    effect = " in a whirl of spectral skulls";
                else if (mtmp.data === mons_rv[PM_PESTILENCE_RV])
                    effect = " in a churning pillar of flies";
                else if (mtmp.data === mons_rv[PM_FAMINE_RV])
                    effect = " in a ring of withered crops";

                if (canseemon(mtmp)) {
                    await pline(`${chewed ? Adjmonnam_rv(mtmp, "bite-covered")
                                          : Monnam(mtmp)} rises from the dead${effect}!`);
                } else {
                    await pline(`${The_rv(cname)} disappears${effect}!`);
                }
            }
            break;

        case 'OBJ_MINVENT': /* probably a nymph's */
            if (cansee(mtmp.mx, mtmp.my)) {
                if (mcarry && canseemon(mcarry))
                    await pline(`Startled, ${mon_nam_rv(mcarry)} drops ${an_rv(cname)} as it ${
                        canspotmon(mtmp) ? "revives" : "disappears"}!`);
                else if (canspotmon(mtmp))
                    await pline(`${chewed ? Adjmonnam_rv(mtmp, "bite-covered")
                                          : Monnam(mtmp)} suddenly appears!`);
            }
            break;
        case 'OBJ_CONTAINED': {
            /* Could use x_monnam(..., AUGMENT_IT) but that'd say "someone"
               for humanoid monsters, which seems like a distinction the hero
               doesn't have knowledge to make here. */
            const mnam = canspotmon(mtmp) ? Amonnam_rv(mtmp) : "Something";

            if (!container) {
                impossible("reviving corpse from non-existent container");
            } else if (mcarry && canseemon(mcarry)) {
                await pline(`${mnam} writhes out of ${yname_rv(container)}!`);
            } else if (container_where.v === 'OBJ_INVENT') {
                const sackname = an_rv(xname_rv(container));
                await pline(`${mnam} ${locomotion_rv(mtmp.data, "writhes")} out of ${
                    sackname} in your pack!`);
            } else if (container_where.v === 'OBJ_FLOOR'
                       && cansee(corpsex, corpsey)) {
                const sackname = an_rv(xname_rv(container));
                await pline(`${mnam} escapes from ${sackname}!`);
            }
            break;
        }
        case 'OBJ_BURIED':
            if (is_zomb) {
                maketrap_zp(mtmp.mx, mtmp.my, PIT_RV);
                if (cansee(mtmp.mx, mtmp.my)) {
                    const ttmp = t_at(mtmp.mx, mtmp.my);
                    if (ttmp)
                        ttmp.tseen = true;
                    await pline(`${canspotmon(mtmp) ? Amonnam_rv(mtmp) : "Something"
                                } claws itself out of the ground!`);
                    newsym(mtmp.mx, mtmp.my);
                } else if (dist2_rv(mtmp.mx, mtmp.my, game.u.ux, game.u.uy)
                           < 5 * 5) { /* mdistu(mtmp) */
                    /* Soundeffect(se_scratching, 50); */
                    await You_hear_zp("scratching noises.");
                }
                await fill_pit_rv(mtmp.mx, mtmp.my);
                break;
            }
            /*FALLTHRU*/
        default:
            /* we should be able to handle the other cases... */
            impossible(`revive_corpse: lost corpse @ ${where}`);
            break;
        }
        return true;
    }
    return false;
}

// C ref: do.c revive_mon()
/* Revive the corpse via a timeout. */
export async function revive_mon(arg, timeout) {
    const body = arg.a_obj;
    const mptr = mons_rv[body.corpsenm];
    let mtmp;

    void timeout; /* UNUSED */
    /* corpse will revive somewhere else if there is a monster in the way;
       Riders get a chance to try to bump the obstacle out of their way */
    const loc = (is_displacer_rv(mptr) && body.where === 'OBJ_FLOOR')
                ? get_obj_location_rv(body, 0) : null;
    if (loc && (mtmp = m_at(loc[0], loc[1])) != null
        && (game.level.flags.stasis_until || 0) < game.moves) {
        const [x, y] = loc;
        const notice_it = canseemon(mtmp); /* before rloc() */
        const monname = Monnam(mtmp);

        if (await rloc_rv(mtmp, RLOC_NOMSG_RV)) {
            if (notice_it && !canseemon(mtmp))
                await pline(`${monname} vanishes.`);
            else if (!notice_it && canseemon(mtmp))
                await pline(`${Monnam(mtmp)} appears.`); /* not pre-rloc monname */
            else if (notice_it && dist2_rv(mtmp.mx, mtmp.my, x, y) > 2)
                await pline(`${monname} teleports.`); /* saw it and still see it */
        }
    }

    /* if we succeed, the corpse is gone */
    if (!(await revive_corpse(body))) {
        let when;
        let action;

        if (is_rider(mptr) && rn2(99)) { /* Rider usually tries again */
            /* action = REVIVE_MON; when = rider_revival_time(body, TRUE); */
            throw new Error('revive_mon(): rider_revival_time() not ported yet');
        } else { /* rot this corpse away */
            if (!obj_has_timer_rv(body, ROT_CORPSE_RV))
                await You_feel(`${is_rider(mptr) ? "much " : ""}less hassled.`);
            action = ROT_CORPSE_RV;
            when = d(5, 50) - (game.moves - body.age);
            if (when < 1)
                when = 1;
        }
        if (!obj_has_timer_rv(body, action))
            start_timer_zp(when, TIMER_OBJECT_RV, action, arg);
    }
}

// C ref: do.c zombify_mon()
/* Timeout callback. Revive the corpse as a zombie. */
export async function zombify_mon(arg, timeout) {
    const body = arg.a_obj;
    const zmon = zombie_form_rv(mons_rv[body.corpsenm]);

    if (zmon !== NON_PM_RV && !(game.mvitals[zmon].mvflags & G_GENOD_RV)) {
        if (has_omid_rv(body))
            free_omid_rv(body);
        if (has_omonst_rv(body))
            free_omonst_rv(body);

        set_corpsenm_rv(body, zmon);
        await revive_mon(arg, timeout);
    } else {
        await rot_corpse_rv(arg, timeout);
    }
}

// C ref: zap.c melt_ice_away()
/* timer callback routine: melt ice at a location */
export async function melt_ice_away(arg, timeout) {
    const where = arg.a_long;
    const save_mon_moving = game.context.mon_moving; /* will be False */

    /* melt_ice -> minliquid -> mondead|xkilled shouldn't credit/blame hero */
    game.context.mon_moving = 1; /* hero isn't causing this ice to melt */
    const y = (where & 0xFFFF);
    const x = ((where >> 16) & 0xFFFF);
    /* melt_ice does newsym when appropriate */
    await melt_ice(x, y, "Some ice melts away.");
    game.context.mon_moving = save_mon_moving;
}

// C ref: zap.c cancel_item()
/* cancel obj, possibly carried by you or a monster */
export function cancel_item(obj) {
    const u = game.u;
    const otyp = obj.otyp;

    if (obj.where === 'OBJ_INVENT') { /* carried(obj) */
        /* handle items being worn by hero */
        switch (otyp) {
        case O_ci.RIN_GAIN_STRENGTH:
            if ((obj.owornmask & W_RING_CI) !== 0) {
                u.abon.a[A_STR_CI] -= obj.spe;
                game.disp_botl = true;
            }
            break;
        case O_ci.RIN_GAIN_CONSTITUTION:
            if ((obj.owornmask & W_RING_CI) !== 0) {
                u.abon.a[A_CON_CI] -= obj.spe;
                game.disp_botl = true;
            }
            break;
        case O_ci.RIN_ADORNMENT:
            if ((obj.owornmask & W_RING_CI) !== 0) {
                u.abon.a[A_CHA_CI] -= obj.spe;
                game.disp_botl = true;
            }
            break;
        case O_ci.RIN_INCREASE_ACCURACY:
            if ((obj.owornmask & W_RING_CI) !== 0)
                u.uhitinc -= obj.spe;
            break;
        case O_ci.RIN_INCREASE_DAMAGE:
            if ((obj.owornmask & W_RING_CI) !== 0)
                u.udaminc -= obj.spe;
            break;
        case O_ci.RIN_PROTECTION:
            if ((obj.owornmask & W_RING_CI) !== 0)
                game.disp_botl = true;
            break;
        case O_ci.GAUNTLETS_OF_DEXTERITY:
            if ((obj.owornmask & W_ARMG_CI) !== 0) {
                u.abon.a[A_DEX_CI] -= obj.spe;
                game.disp_botl = true;
            }
            break;
        case O_ci.HELM_OF_BRILLIANCE:
            if ((obj.owornmask & W_ARMH_CI) !== 0) {
                u.abon.a[A_INT_CI] -= obj.spe;
                u.abon.a[A_WIS_CI] -= obj.spe;
                game.disp_botl = true;
            }
            break;
        default:
            if ((obj.owornmask & W_ARMOR_CI) !== 0) /* AC */
                game.disp_botl = true;
            break;
        }
    }
    /* cancelled item might not be in hero's possession but
       cancellation is presumed to be instigated by hero */
    if (O_ci.objects[otyp].oc_magic
        || (obj.spe && (obj.oclass === O_ci.ARMOR_CLASS
                        || obj.oclass === O_ci.WEAPON_CLASS || is_weptool_ci(obj)))
        || otyp === O_ci.POT_ACID
        || otyp === O_ci.POT_SICKNESS
        || (otyp === O_ci.POT_WATER && (obj.blessed || obj.cursed))
        /* not magic; cancels to blank spellbook */
        || otyp === O_ci.SPE_NOVEL) {
        const cancelled_spe = (obj.oclass === O_ci.WAND_CLASS
                               || otyp === O_ci.CRYSTAL_BALL) ? -1 : 0;

        if (obj.spe !== cancelled_spe
            && otyp !== O_ci.WAN_CANCELLATION /* can't cancel cancellation */
            && otyp !== O_ci.MAGIC_LAMP /* cancelling doesn't remove djinni */
            && otyp !== O_ci.CANDELABRUM_OF_INVOCATION) {
            costly_alteration_ci(obj, COST_CANCEL_CI);
            obj.spe = cancelled_spe;
        }
        switch (obj.oclass) {
        case O_ci.SCROLL_CLASS:
            costly_alteration_ci(obj, COST_CANCEL_CI);
            obj.otyp = O_ci.SCR_BLANK_PAPER;
            obj.spe = 0;
            break;
        case O_ci.SPBOOK_CLASS:
            if (otyp !== O_ci.SPE_CANCELLATION && otyp !== O_ci.SPE_BOOK_OF_THE_DEAD) {
                costly_alteration_ci(obj, COST_CANCEL_CI);
                obj.otyp = O_ci.SPE_BLANK_PAPER;
                /* cancelling a novel is more involved than a spellbook */
                if (otyp === O_ci.SPE_NOVEL) /* old type */
                    throw new Error('cancel_item(): blank_novel() not ported yet');
            }
            break;
        case O_ci.POTION_CLASS:
            costly_alteration_ci(obj, (otyp !== O_ci.POT_WATER) ? COST_CANCEL_CI
                                 : obj.cursed ? COST_UNCURS_CI : COST_UNBLSS_CI);
            if (otyp === O_ci.POT_SICKNESS || otyp === O_ci.POT_SEE_INVISIBLE) {
                /* sickness is "biologically contaminated" fruit juice;
                   cancel it and it just becomes fruit juice...
                   whereas see invisible tastes like "enchanted" fruit
                   juice, it similarly cancels */
                obj.otyp = O_ci.POT_FRUIT_JUICE;
            } else {
                obj.otyp = O_ci.POT_WATER;
                obj.odiluted = 0; /* same as any other water */
            }
            break;
        }
    }
    /* cancelling a troll's corpse prevents it from reviving (on its own;
       does not affect undead turning induced revival) */
    if (obj.otyp === O_ci.CORPSE && obj.timed
        && !is_rider(mons_rv[obj.corpsenm])) {
        const a = obj_to_any_ci(obj);
        const timout = peek_timer_ci(REVIVE_MON_RV, a);

        if (timout) {
            stop_timer_ci(REVIVE_MON_RV, a);
            start_timer_zp(timout, TIMER_OBJECT_RV, ROT_CORPSE_RV, a);
        }
    }

    unbless_ci(obj);
    uncurse_ci(obj);
    return;
}

// C ref: zap.c cancel_monst()
/* cancel a monster (possibly the hero); inventory is cancelled only
   if the monster is zapping itself directly, since otherwise the
   effect is too strong.  currently non-hero monsters do not zap
   themselves with cancellation. */
export async function cancel_monst(mdef, obj, youattack, allow_cancel_kill, self_cancel) {
    const u = game.u;
    const writing_vanishes = (whose) => `Some writing vanishes from ${whose} head!`;
    const your = "your"; /* should be extern */
    const youdefend = (mdef === game.youmonst);

    if (youdefend ? (!youattack && uhave_zp(ANTIMAGIC_CI))
                  : resist(mdef, obj.oclass, 0, NOTELL_CI))
        return false; /* resisted cancellation */

    if (self_cancel) { /* 1st cancel inventory */
        let otmp;

        if (youdefend) {
            for (otmp = game.invent; otmp; otmp = otmp.nobj)
                cancel_item(otmp);
        } else {
            for (otmp of (mdef.minvent || []))
                cancel_item(otmp);
        }

        if (youdefend) {
            game.disp_botl = true; /* potential AC change */
            find_ac_ci();
            /* update_inventory(); -- handled by caller */
        }
    }

    /* now handle special cases */
    if (youdefend) {
        if (u.umonnum !== u.umonster) { /* Upolyd: includes lycanthrope in creature form */
            /*
             * Return to normal form unless Unchanging.
             * Hero in clay golem form dies if Unchanging.
             * Does not cure lycanthropy or stop timed random polymorph.
             */
            if (u.umonnum === PM_CLAY_GOLEM_CI) {
                if (!uhave_zp(BLINDED_CI))
                    await pline(writing_vanishes(your));
                else /* note: "dark" rather than "heavy" is intentional... */
                    await You_feel_ci(`${Hallucination_ci() ? "dark" : "light"} headed.`);
                u.mh = 0; /* fatal; death handled by rehumanize() */
            }
            if (uhave_zp(UNCHANGING_ZP) && u.mh > 0)
                await pline("Your amulet grows hot for a moment, then cools.");
            else
                await rehumanize_ci();
        }
    } else {
        mdef.mcan = 1;
        /* force shapeshifter into its base form or mimic to unhide */
        throw new Error('cancel_monst(): normal_shape() not ported yet');
    }
    return true;
}
