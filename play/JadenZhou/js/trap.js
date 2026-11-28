// trap.js — trap creation.
// C ref: trap.c maketrap(), t_at() (in trap.c as of 3.7), choose_trapnote(),
// dng_bottom(), hole_destination(), mkroll_launch(), find_random_launch_coord(),
// isclearpath().
//
// Not ported yet: shop damage,
// set_levltyp()'s object/timer side effects, Sokoban bookkeeping.

import { adjattrib } from './attrib.js';
import { A_CHA, CONFUSION } from './const.js';
import { tamedog } from './dog.js';
import { seffects } from './read.js';
import { SPE_REMOVE_CURSE, LAND_MINE as LAND_MINE_OBJ, BEARTRAP as BEARTRAP_OBJ } from './objects.js';
import { fracture_rock } from './zap.js';
import { change_luck } from './attrib.js';
import { helpless } from './monmove.js';
import { impossible } from './hack.js';
import { is_hole, is_pit } from './const.js';
import { rehumanize } from './polyself.js';
import { game } from './gstate.js';
import { thitu, m_carrying as m_carrying_tr } from './mthrowu.js';
import { count_wsegs } from './worm.js';
import { obfree } from './invent.js';
import { get_obj_location } from './shk.js';
import { tty_display_nhwindow } from './wintty.js';
import { create_gas_cloud } from './region.js';
import { A_STR, FREE_ACTION } from './const.js';
import { the } from './iactions.js';
import { xname, suit_simple_name, cloak_simple_name, gloves_simple_name,
         helm_simple_name } from './objnam.js';
import { observe_object } from './o_init.js';
import { poisoned } from './attrib.js';
import { A_CON, UNCHANGING } from './const.js';
import { TELEPORT, POISON_RES, COLD_RES, SHOCK_RES, DISINT_RES, TELEPORT_CONTROL,
         STEALTH, FAST, INTRINSIC } from './const.js';
import { PM_WIZARD, PM_ELF, PM_VALKYRIE } from './monsters.js';
import { rn2, rnl } from './rng.js';
import { dunlev, dunlevs_in_dungeon, In_hell } from './dungeon.js';
import {
    ROOM, CORR, DOOR, STONE, SCORR, SDOOR, DRAWBRIDGE_UP,
    IS_FURNITURE, IS_WALL, IS_POOL, IS_ROOM, LAVAPOOL, In_quest,
    CORPSTAT_NONE, MM_NOCOUNTBIRTH, MM_NOMSG,
    TOOKPLUNGE, VIASITTING, HURTLING, isok,
    DEAF, BOLT_LIM, FORCETRAP, FORCEBUNGLE,
} from './const.js';
import { mons, S_UNICORN, M2_JEWELS, S_VORTEX, M1_AMORPHOUS, M1_UNSOLID,
         M1_CLING, MZ_SMALL, PM_AIR_ELEMENTAL, PM_CAVE_SPIDER,
         PM_GIANT_SPIDER, PM_IRON_GOLEM, AD_SLEE, AD_FIRE, AD_MAGM,
         M1_MINDLESS, M1_METALLIVORE, MZ_HUGE, PM_PIT_FIEND,
       } from './monsters.js';
import { is_flyer, is_floater, defended, resists_sleep, resists_fire,
         resists_magm, mon_knows_traps, mon_learns_traps, mons_see_trap,
         likes_gems, mindless, hides_under, amorphous, unsolid, is_whirly,
         metallivorous, breathless, acidic, extra_nasty, unique_corpstat,
         is_clinger, resists_ston, is_unicorn, flaming, webmaker, attacktype,
         throws_rocks, nohands, likes_lava } from './mondata.js';
import { STATUE, BOULDER, objects, ARROW, DART, ROCK, CORPSE, TOWEL, GEMSTONE,
         MINERAL, RING_CLASS, IRON, stone_missile, Is_container,
         bimanual as bimanual_tr, bimanual, is_corrodeable,
         is_crackable } from './objects.js';
import { rnd, d } from './rng.js';
import { FAILEDUNTRAP, W_ARMF, W_ARMH, W_ARMS, W_ARMG, W_ARMC, W_ARM, W_ARMU,
         W_WEP, W_SWAPWEP, WT_ELF, STONE_RES } from './const.js';
import { AD_RBRE, AD_PHYS, AT_MAGC, AT_BREA, M1_BREATHLESS, M1_ACID,
         M2_NASTY, S_MIMIC, S_GIANT, S_DRAGON, PM_OWLBEAR, PM_BUGBEAR,
         PM_TITANOTHERE, PM_BALUCHITHERIUM, PM_PURPLE_WORM, PM_JABBERWOCK,
         PM_BALROG, PM_KRAKEN, PM_MASTODON, PM_ORION, PM_NORN, PM_CYCLOPS,
         PM_LORD_SURTUR, PM_GELATINOUS_CUBE, PM_FIRE_VORTEX,
         PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_GREMLIN,
         PM_PIT_VIPER, PM_PAPER_GOLEM, PM_STRAW_GOLEM, PM_WOOD_GOLEM,
         PM_LEATHER_GOLEM, PM_COCKATRICE, PM_CHICKATRICE } from './monsters.js';
import { passes_walls, monsndx, Resists_Elem } from './mondata.js';
import { mksobj, place_object } from './mkobj.js';
import { stackobj } from './invent.js';
import { dmgval } from './weapon.js';
import { doname } from './objnam.js';
import { monkilled, maybe_unhide_at } from './mon.js';
import { find_mac, which_armor } from './worn.js';
import { mtele_trap, mlevel_tele_trap, tele_trap, level_tele_trap } from './teleport.js';
import { Can_fall_thru } from './mklev.js';
import {
    Fire_resistance, Sleep_resistance, Antimagic, Punished, Blind, Hallucination, Deaf,
    Fumbling, Wounded_legs, Teleportation, Teleport_control, Levitation, Flying, Wwalking,
    Swimming, Amphibious, Breathless, Underwater, Passes_walls, Half_spell_damage,
    Half_physical_damage, Lifesaved, Unaware as Unaware_dr
} from './youprop.js';
import { Upolyd, Luck } from './const.js';
import { uprop } from './youprop.js';
import { rndmonnum_adj, mkcorpstat, add_to_container, weight } from './mkobj.js';
import { makemon, sobj_at, is_pool, is_lava, closed_door, goodpos } from './makemon.js';
import { crawl_destination } from './hack.js';
import { linedup } from './monmove.js';
import { xdir, ydir, N_DIRS, ZAP_POS, is_xport } from './const.js';
import { mongone, wake_nearto, wake_nearby } from './mon.js';
import { newsym, pline, urgent_pline, You_feel, You_hear, shieldeff } from './display.js';
import { done } from './end.js';
import { killer } from './topten.js';
import { DIED } from './const.js';
import { cansee, couldsee } from './vision.js';
import { m_in_air } from './monmove.js';
import { canseemon, set_msg_xy } from './display.js';
import { mon_nam, Monnam, Amonnam } from './do_name.js';
import { self_invis_message } from './potion.js';
import { perceives, pm_invisible } from './mondata.js';
import { INVIS, SEE_INVIS } from './const.js';
import { IS_AIR, Is_knox_level } from './const.js';
import { just_an } from './objnam.js';
import { seemimic, shieldeff_mon as shieldeff_mon_tp } from './mon.js';
import { resist } from './zap.js';
import { M_AP_FURNITURE, M_AP_OBJECT, NOTELL } from './const.js';
import { dist2, sgn, upstart, mdistu } from './hacklib.js';
import { rn1 } from './rng.js';
import { nomul, end_running } from './hack.js';
import { exercise, ATEMP } from './attrib.js';
import { body_part } from './insight.js';
import { encumber_msg } from './pickup.js';
import { You, Your, pline_The, Norep } from './display.js';
import { fill_pit } from './muse.js';
import { YMonnam } from './do_name.js';
import { tty_clear_nhwindow } from './wintty.js';
import { is_rottable, costly_alteration } from './mkobj.js';
import { remove_worn_item, extract_from_minvent } from './steal.js';
import { delobj } from './invent.js';
import { Yobjnam2 } from './objnam.js';
import { inventory_resistance_check } from './zap.js';
import { AD_ACID } from './monsters.js';
import { COST_BURN, COST_RUST, COST_ROT, COST_CORRODE,
         COST_CRACK } from './const.js';
import { float_vs_flight } from './polyself.js';
import { touch_petrifies } from './mondata.js';
import { obj_pmname, an } from './objnam.js';
import { uwepgone, uswapwepgone } from './wield.js';
import { s_suffix } from './hacklib.js';
import { strsubst as strsubst_tr } from './hacklib.js';
import { nolimbs as nolimbs_tr } from './mondata.js';
import { m_at } from './makemon.js';
import { ROLL as ROLL_L, LAUNCH_KNOWN as LAUNCH_KNOWN_L,
         LAUNCH_UNSEEN as LAUNCH_UNSEEN_L, DISP_FLASH as DISP_FLASH_L,
         DISP_END as DISP_END_L, IRONBARS as IRONBARS_L,
         D_BROKEN as D_BROKEN_L, IS_OBSTRUCTED as IS_OBSTRUCTED_L,
         IS_STWALL as IS_STWALL_L, IS_TREE as IS_TREE_L } from './const.js';
import { M2_ROCKTHROW as M2_ROCKTHROW_L } from './monsters.js';
import { canspotmon as canspotmon_l, You_see as You_see_l,
         tmp_at as tmp_at_l, obj_to_glyph as obj_to_glyph_l } from './display.js';
import { obj_extract_self as obj_extract_self_l,
         splitobj as splitobj_l } from './mkobj.js';
import { distmin as distmin_l } from './hacklib.js';
import { an as an_l } from './objnam.js';
import { rn2_on_display_rng as rn2_on_display_rng_l } from './rng.js';
import { mpickobj as mpickobj_l } from './steal.js';
import { ohitmon as ohitmon_l, hits_bars as hits_bars_l } from './mthrowu.js';
import { stop_occupation as stop_occupation_l } from './allmain.js';
import { down_gate as down_gate_l, ship_object as ship_object_l,
         flooreffects as flooreffects_l } from './do.js';
import { recalc_block_point as recalc_block_point_l } from './vision.js';
import { scatter as scatter_l } from './explode.js';
import { MAY_DESTROY as MAY_DESTROY_L, MAY_HIT as MAY_HIT_L,
         MAY_FRACTURE as MAY_FRACTURE_L, VIS_EFFECTS as VIS_EFFECTS_L,
         IS_DOOR as IS_DOOR_L, DRAWBRIDGE_DOWN as DRAWBRIDGE_DOWN_L,
         DRAWBRIDGE_UP as DRAWBRIDGE_UP_L, ICE as ICE_L,
         Is_waterlevel as Is_waterlevel_l, Is_airlevel as Is_airlevel_l
       } from './const.js';
import { del_engr_at as del_engr_at_l } from './engrave.js';
import { is_drawbridge_wall as is_drawbridge_wall_l } from './dbridge.js';
import { find_drawbridge as find_drawbridge_l } from './zap.js';
import { fillholetyp as fillholetyp_l, unearth_objs as unearth_objs_l,
         grounded } from './dig.js';
import { M1_SLITHY, M1_NOLIMBS } from './monsters.js';
import { CAN_OF_GREASE, SCROLL_CLASS, SPBOOK_CLASS, POTION_CLASS,
         GRAY_DRAGON_SCALE_MAIL, YELLOW_DRAGON_SCALE_MAIL, GRAY_DRAGON_SCALES,
         YELLOW_DRAGON_SCALES, ROBE, MUMMY_WRAPPING, ALCHEMY_SMOCK,
         is_metallic, is_rustprone, OBJ_NAME, OBJ_DESCR } from './objects.js';
import { erosion_matters, is_flammable } from './mkobj.js';
import { TRAP_NOT_IMMUNE, TRAP_CLEARLY_IMMUNE, TRAP_HIDDEN_IMMUNE,
         In_endgame, In_sokoban, Is_earthlevel, FIRE_RES } from './const.js';
import { AMULET_OF_YENDOR, SCR_FIRE, SPE_FIREBALL } from './objects.js';
import { carrying as carrying_tr } from './invent.js';
import { helm_simple_name as helm_simple_name_tr, aobjnam as aobjnam_tr } from './objnam.js';
import { vtense, makeplural, yname, cxname } from './objnam.js';
import { hliquid } from './potion.js';
import { SCR_BLANK_PAPER, SCR_MAIL, SPE_BLANK_PAPER, SPE_BOOK_OF_THE_DEAD,
         SPE_NOVEL, POT_ACID, POT_WATER, OILSKIN_SACK, ICE_BOX, LARGE_BOX,
         CHEST } from './objects.js';
import { TT_BURIEDBALL } from './const.js';
import { LEG, BOTH_SIDES } from './const.js';
import { on_level, at_dgn_entrance } from './dungeon.js';
import { is_neuter } from './mondata.js';
import { ART_MAGICBANE } from './artilist.js';
import { defends_when_carried } from './artifact.js';
import { is_quest_artifact } from './questpgr.js';
import { LEVITATION, FLYING, FUMBLING, ANTIMAGIC, HALF_PHDAM, HALF_SPDAM,
         PASSES_WALLS, DEAF as DEAF_PROP, WOUNDED_LEGS, TIMEOUT, FROMOUTSIDE,
         TT_BEARTRAP, TT_PIT, TT_NONE, FOOT, SPINE, HEAD, ARM,
         KILLED_BY_AN, KILLED_BY, A_DEX, RIGHT_SIDE, LEFT_SIDE,
         SLEEP_RES, BLINDED, HALLUC, HALLUC_RES, NO_MM_FLAGS,
       } from './const.js';
import { xytodir as xytodir_tr } from './hack.js';
import { DIR_180 as DIR_180_TR, DIR_ERR as DIR_ERR_TR } from './const.js';
import { wakeup as wakeup_ht } from './mon.js';
import { melt_ice } from './zap.js';
import { split_mon } from './potion.js';
import { AD_RUST, AD_ELEC } from './monsters.js';
import { Shock_resistance } from './youprop.js';
import { M_SEEN_ELEC, M_SEEN_FIRE } from './const.js';
import { useup as useup_tr } from './invent.js';
import { begin_burn } from './timeout.js';
import { dismount_steed } from './steed.js';
import { DISMOUNT_POLY, DISMOUNT_GENERIC } from './const.js';
import { setmangry, mlifesaver } from './mon.js';
import { Boots_off, hard_helmet as hard_helmet_tr } from './do_wear.js';
import { discover_object } from './o_init.js';
import { costly_spot } from './shk.js';
import { noit_Monnam as noit_Monnam_ht, y_monnam as y_monnam_ht } from './do_name.js';
import { vision_recalc as vision_recalc_ht } from './vision.js';
import { adjalign as adjalign_ht } from './attrib.js';
import { You_feel as You_feel_ht } from './display.js';
import { set_malign as set_malign_ht } from './makemon.js';
import { m_next2u as m_next2u_ht, A_LAWFUL as A_LAWFUL_HT,
         TT_LAVA as TT_LAVA_HT, TT_INFLOOR as TT_INFLOOR_HT,
         TT_BURIEDBALL as TT_BURIEDBALL_HT, TT_BEARTRAP as TT_BEARTRAP_HT,
         TT_PIT as TT_PIT_HT, TT_WEB as TT_WEB_HT, FORCETRAP as FORCETRAP_HT,
         NOWEBMSG as NOWEBMSG_HT } from './const.js';
import { G_UNIQ as G_UNIQ_HT, S_HUMAN as S_HUMAN_HT,
         M1_MINDLESS as M1_MINDLESS_HT } from './monsters.js';
import { BRASS_LANTERN as BRASS_LANTERN_TR, OIL_LAMP as OIL_LAMP_TR,
         MAGIC_LAMP as MAGIC_LAMP_TR, TALLOW_CANDLE as TALLOW_CANDLE_TR,
         WAX_CANDLE as WAX_CANDLE_TR, POT_OIL as POT_OIL_TR,
         CANDELABRUM_OF_INVOCATION as CANDELABRUM_OF_INVOCATION_TR } from './objects.js';
import { destroy_items as destroy_items_tr,
         burn_floor_objects as burn_floor_objects_tr,
         melt_ice as melt_ice_tr } from './zap.js';
import { minuhpmax as minuhpmax_tr, setuhpmax as setuhpmax_tr } from './attrib.js';
import { losexp as losexp_tr } from './exper.js';
import { burn_away_slime as burn_away_slime_tr } from './potion.js';
import { M_SEEN_FIRE as M_SEEN_FIRE_TR } from './const.js';
import { Drain_resistance as Drain_resistance_tr } from './youprop.js';
import { AD_FIRE as AD_FIRE_TR } from './monsters.js';
import { is_ice as is_ice_tr } from './dig.js';
import { x_monnam as x_monnam_tr } from './do_name.js';
import { ARTICLE_THE as ARTICLE_THE_TR, ARTICLE_NONE as ARTICLE_NONE_TR,
         SUPPRESS_SADDLE as SUPPRESS_SADDLE_TR,
         NO_KILLER_PREFIX as NO_KILLER_PREFIX_TR,
         has_mgivenname as has_mgivenname_tr,
         RECURSIVETRAP } from './const.js';
import { PM_RANGER as PM_RANGER_TR } from './monsters.js';
import { on_level as on_level_tr } from './dungeon.js';
import { unplacebc as unplacebc_tr, ballfall as ballfall_tr,
         placebc as placebc_tr } from './ball.js';
import { ECMD_OK as ECMD_OK_TR, ECMD_TIME as ECMD_TIME_TR,
         HVY_ENCUMBER as HVY_ENCUMBER_TR, HAND as HAND_TR } from './const.js';
import { near_capacity as near_capacity_tr } from './hack.js';
import { getdir as getdir_tr } from './cmd.js';
import { sticks as sticks_tr, can_reach_floor as can_reach_floor_tr } from './engrave.js';
import { welded as welded_tr } from './wield.js';
import { makeplural as makeplural_tr } from './objnam.js';
import { body_part as body_part_tr } from './insight.js';
import { mon_nam as mon_nam_tr } from './do_name.js';
import { surface as surface_tr } from './iactions.js';
import { I_SPECIAL, WWALKING, SWIMMING, W_SADDLE, NO_TRAP_FLAGS } from './const.js';
import { pickup as pickup_tr } from './pickup.js';
import { M1_NOHANDS as M1_NOHANDS_TR, mons as mons_tr, PM_CAVE_SPIDER as PM_CAVE_SPIDER_TR,
         PM_GIANT_SPIDER as PM_GIANT_SPIDER_TR } from './monsters.js';
import { is_ice as is_ice_bg } from './dig.js';
import { strcmpi as strcmpi_bg } from './hacklib.js';
import { copynchars as copynchars_tp } from './hacklib.js';
import { rank_of as rank_of_tp } from './botl.js';
import { PLNMSG_BACK_ON_GROUND as PLNMSG_BACK_ON_GROUND_BG } from './const.js';
import { SWIMMING as SWIMMING_DR, MAGICAL_BREATHING as MAGICAL_BREATHING_DR,
         TELEPORT as TELEPORT_DR, TELEPORT_CONTROL as TELEPORT_CONTROL_DR,
         FIRE_RES as FIRE_RES_DR, LIFESAVED as LIFESAVED_DR,
         IS_WATERWALL as IS_WATERWALL_DR, IS_AIR as IS_AIR_DR,
         Is_waterlevel as Is_waterlevel_dr, UNENCUMBERED as UNENCUMBERED_DR,
         SLT_ENCUMBER as SLT_ENCUMBER_DR, DROWNING as DROWNING_DR,
         BURNING as BURNING_DR, DISSOLVED as DISSOLVED_DR, STONE as STONE_DR,
         TELEDS_ALLOW_DRAG as TELEDS_ALLOW_DRAG_DR,
         TELEDS_TELEPORT as TELEDS_TELEPORT_DR, TT_LAVA as TT_LAVA_DR } from './const.js';
import { M1_SWIM as M1_SWIM_DR, M1_AMPHIBIOUS as M1_AMPHIBIOUS_DR,
         M1_BREATHLESS as M1_BREATHLESS_DR, PM_GREMLIN as PM_GREMLIN_DR,
         PM_IRON_GOLEM as PM_IRON_GOLEM_DR, PM_WATER_ELEMENTAL as PM_WATER_ELEMENTAL_DR,
         PM_STEAM_VORTEX as PM_STEAM_VORTEX_DR, PM_FOG_CLOUD as PM_FOG_CLOUD_DR } from './monsters.js';
import { LOADSTONE as LOADSTONE_DR, SCR_FIRE as SCR_FIRE_DR,
         SPE_FIREBALL as SPE_FIREBALL_DR, SPE_BOOK_OF_THE_DEAD as SPE_BOOK_OF_THE_DEAD_DR,
         objects as objects_dr, POTION_CLASS as POTION_CLASS_DR,
         is_organic as is_organic_dr } from './objects.js';
import { switch_terrain as switch_terrain_dr, inv_cnt as inv_cnt_dr,
         near_capacity as near_capacity_dr, spoteffects as spoteffects_dr } from './hack.js';
import { welded as welded_dr } from './wield.js';
import { mons as mons_dr, PM_FIRE_ELEMENTAL as PM_FIRE_ELEMENTAL_DR,
         PM_SALAMANDER as PM_SALAMANDER_DR } from './monsters.js';
import { remove_worn_item as remove_worn_item_dr } from './steal.js';
import { dropx as dropx_dr } from './do.js';
import { feel_newsym as feel_newsym_dr, update_lastseentyp as update_lastseentyp_dr } from './display.js';
import { waterbody_name as waterbody_name_dr } from './pager.js';
import { can_teleport as can_teleport_dr } from './mondata.js';
import { unmul as unmul_dr } from './allmain.js';
import { teleds as teleds_dr, safe_teleds as safe_teleds_dr } from './teleport.js';
import { done as done_dr } from './end.js';
import { burn_away_slime as burn_away_slime_dr } from './potion.js';
import { useupall as useupall_dr } from './invent.js';
import { obj_resists as obj_resists_dr, finish_meating } from './dogmove.js';
import { setnotworn as setnotworn_fd } from './worn.js';
import { otense as otense_fd, Yname2 as Yname2_fd } from './objnam.js';
import { DRAGON_HIDE as DRAGON_HIDE_FD, WAN_FIRE as WAN_FIRE_FD,
         FIRE_HORN as FIRE_HORN_FD } from './objects.js';
import { liquid_flow as liquid_flow_l } from './dig.js';
import { ceiling as ceiling_tr } from './dungeon.js';
import { mbodypart as mbodypart_tr } from './insight.js';
import { schedule_goto, UTOTYPE_FALLING, UTOTYPE_NONE } from './do.js';
import { impact_drop } from './dokick.js';
import { next_to_u, domagicportal } from './teleport.js';
import { ceiling_hider } from './engrave.js';
import { find_hell, assign_level, depth } from './dungeon.js';
import { Is_stronghold } from './const.js';
import { polyself as polyself_tp } from './polyself.js';
import { newcham as newcham_tp } from './mon.js';
import { POLY_NOFLAGS as POLY_NOFLAGS_TP, NC_SHOW_MSG as NC_SHOW_MSG_TP } from './const.js';
import { WAND_CLASS as WAND_CLASS_TP } from './objects.js';
import { resists_blnd as resists_blnd_tr } from './mondata.js';
import { make_blinded as make_blinded_tr, incr_itimeout as incr_itimeout_tr } from './potion.js';
import { monstseesu as monstseesu_tr, monstunseesu as monstunseesu_tr } from './uhitm.js';
import { M_SEEN_SLEEP as M_SEEN_SLEEP_TR, NOWEBMSG as NOWEBMSG_TR,
         FAILEDUNTRAP as FAILEDUNTRAP_TR, VIASITTING as VIASITTING_TR,
         A_STR as A_STR_TR, TT_WEB as TT_WEB_TR } from './const.js';
import { fall_asleep as fall_asleep_tr } from './timeout.js';
import { ACURR as ACURR_tr } from './attrib.js';
import { SLIMED as SLIMED_SL, TIMEOUT as TIMEOUT_SL } from './const.js';
import { cant_revive } from './read.js';
import { montraits } from './zap.js';
import { wary_dog } from './dog.js';
import { quest_info } from './questpgr.js';
import { christen_monst, rndmonnam, a_monnam } from './do_name.js';
import { m_dowear } from './worn.js';
import { is_golem, nonliving } from './makemon.js';
import { is_vampshifter } from './mondata.js';
import { map_invisible } from './display.js';
import { shop_keeper, stolen_value, shk_your } from './shk.js';
import { in_rooms } from './hack.js';
import { has_oname, ONAME, OBJ_AT, M_AP_TYPE, Role_if, u_at, ismnum,
         AS_OK, AS_NO_MON, AS_MON_IS_UNIQUE, CORPSTAT_GENDER, CORPSTAT_MALE,
         CORPSTAT_FEMALE, CORPSTAT_HISTORIC, NO_MINVENT, MM_MALE, MM_FEMALE,
         MM_ADJACENTOK, ANIMATE_NORMAL, ANIMATE_SHATTER, ANIMATE_SPELL,
         NO_NC_FLAGS, SHOPBASE } from './const.js';
import { MS_GUARDIAN, PM_DOPPELGANGER, PM_FLESH_GOLEM, PM_ARCHEOLOGIST,
         M1_CONCEAL } from './monsters.js';
import { number_leashed, unleash_all } from './apply.js';
import { buried_ball as buried_ball_tr } from './dig.js';
import { is_animal as is_animal_tr } from './mondata.js';
import { Lev_at_will as Lev_at_will_tr } from './youprop.js';
import { poly_when_stoned } from './mondata.js';
import { mon_to_stone, vamp_stone, xkilled, monstone } from './mon.js';
import { mon_adjust_speed } from './worn.js';
import { XKILL_NOMSG, CXN_PFX_THE } from './const.js';
import { livelog_printf } from './display.js';
import { ordin } from './hacklib.js';
import { LL_MINORAC, LL_DUMP } from './const.js';
import { corpse_xname } from './objnam.js';
import { mwepgone } from './weapon.js';
import { poly_obj } from './zap.js';
import { update_mon_extrinsics } from './worn.js';
import { mpickobj } from './steal.js';
import { IRON_SHOES, KICKING_BOOTS } from './objects.js';
import { SADDLE as SADDLE_LM } from './objects.js';
import { level_difficulty } from './dungeon.js';
import { The } from './objnam.js';
import { make_stunned } from './potion.js';
import { HStun } from './youprop.js';
import { NO_PART } from './const.js';
import { STONING } from './const.js';
import { Stone_resistance } from './youprop.js';
import { PM_STONE_GOLEM } from './monsters.js';
import { polymon } from './polyself.js';
import { bury_an_obj } from './dig.js';
import { destroy_drawbridge } from './dbridge.js';
import { maybe_dunk_boulders } from './apply.js';
import { spot_checks } from './hack.js';
import { sellobj } from './shk.js';
import { pline_mon } from './display.js';
import { CAN_OVERWRITE_TERRAIN } from './mkmaze.js';
import { ROLL_FROM } from './rng.js';
import { rndcolor } from './do_name.js';
import { stagger } from './uhitm.js';
import { Stunned, Halluc_resistance, HHallucination } from './youprop.js';
import { make_hallucinated } from './potion.js';


// C ref: trap.c mk_trap_statue()
/* create a "living" statue at x,y */
function mk_trap_statue(x, y) {
    let mtmp, otmp, statue, mptr;
    let trycount = 10;

    do { /* avoid ultimately hostile co-aligned unicorn */
        mptr = mons[rndmonnum_adj(3, 6)];
    } while (--trycount > 0 && is_unicorn(mptr)
             && sgn(game.u.ualign.type) === sgn(mptr.maligntyp));
    statue = mkcorpstat(STATUE, null, mptr, x, y, CORPSTAT_NONE);
    mtmp = makemon(mons[statue.corpsenm], 0, 0, MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp)
        return; /* should never happen */
    /* C's minvent chain head is the most recently added item; JS keeps
       minvent as an array with the newest last */
    while (mtmp.minvent && mtmp.minvent.length) {
        otmp = mtmp.minvent.pop();
        otmp.owornmask = 0;
        /* obj_extract_self(otmp) */
        otmp.where = 'OBJ_FREE';
        add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);
    mongone(mtmp);
}

export const NO_TRAP = 0;
export const ARROW_TRAP = 1;
export const DART_TRAP = 2;
export const ROCKTRAP = 3;
export const SQKY_BOARD = 4;
export const BEAR_TRAP = 5;
export const LANDMINE = 6;
export const ROLLING_BOULDER_TRAP = 7;
export const SLP_GAS_TRAP = 8;
export const RUST_TRAP = 9;
export const FIRE_TRAP = 10;
export const PIT = 11;
export const SPIKED_PIT = 12;
export const HOLE = 13;
export const TRAPDOOR = 14;
export const TELEP_TRAP = 15;
export const LEVEL_TELEP = 16;
export const MAGIC_PORTAL = 17;
export const WEB = 18;
export const STATUE_TRAP = 19;
export const MAGIC_TRAP = 20;
export const ANTI_MAGIC = 21;
export const POLY_TRAP = 22;
export const VIBRATING_SQUARE = 23;
export const TRAPPED_DOOR = 24;
export const TRAPPED_CHEST = 25;
export const TRAPNUM = 26;

// C ref: trap.h is_pit(), is_hole(), unhideable_trap(), undestroyable_trap()
export function unhideable_trap(ttyp) { return ttyp === HOLE; }
export function undestroyable_trap(ttyp) {
    return ttyp === MAGIC_PORTAL || ttyp === VIBRATING_SQUARE;
}

function ftraps() {
    const lvl = game.level;
    if (!lvl.traps) lvl.traps = [];
    return lvl.traps;
}

// C ref: trap.c t_at()
export function t_at(x, y) {
    for (const trap of ftraps())
        if (trap.tx === x && trap.ty === y)
            return trap;
    return null;
}

// C ref: trap.c floor_trigger()
/* used for both the hero and monsters */
export function floor_trigger(ttyp) {
    switch (ttyp) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
    case SQKY_BOARD:
    case BEAR_TRAP:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case SLP_GAS_TRAP:
    case RUST_TRAP:
    case FIRE_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        return true;
    default:
        return false;
    }
}

// C ref: trap.c check_in_air()
/* return TRUE if monster mtmp is up in the air, considering trap flags */
export function check_in_air(mtmp, trflags) {
    const is_you = (mtmp === game.youmonst),
          plunged = (trflags & (TOOKPLUNGE | VIASITTING)) !== 0;

    return ((trflags & HURTLING) !== 0
            || (is_you ? Levitation() : is_floater(mtmp.data))
            || ((is_you ? Flying() : is_flyer(mtmp.data)) && !plunged));
}

/* C ref: youprop.h -- the hero's properties used by the trap code;
   BLevitation/BFlying are uprops[].blocked */
/* C ref: hack.h Maybe_Half_Phys() */
export function Maybe_Half_Phys(dmg) {
    return Half_physical_damage() ? Math.trunc((dmg + 1) / 2) : dmg;
}

// C ref: hack.c losehp() -- the not-polymorphed case
export async function losehp(n, knam, k_format) {
    const u = game.u;
    game.disp_botl = true; /* u.uhp or u.mh is changing */
    end_running(true);
    if (Upolyd()) {
        u.mh -= n;
        /* showdamage(n): the showdamage option isn't ported (default off) */
        if (u.mhmax < u.mh)
            u.mhmax = u.mh;
        if (u.mh < 1)
            await rehumanize();
        else if (n > 0 && u.mh * 10 < u.mhmax
                 && (u.uprops[UNCHANGING].intrinsic
                     || u.uprops[UNCHANGING].extrinsic)) /* Unchanging */
            await maybe_wail();
        return;
    }

    u.uhp -= n;
    /* showdamage(n): the showdamage option isn't ported (default off) */
    if (u.uhp > u.uhpmax)
        u.uhpmax = u.uhp; /* perhaps n was negative */
    if (u.uhp < 1) {
        killer().format = k_format;
        if (killer().name !== knam) /* the thing that killed you */
            killer().name = knam ? knam : "";
        await urgent_pline("You die...");
        await done(DIED);
    } else if (n > 0 && u.uhp * 10 < u.uhpmax)
        await maybe_wail();
}

// C ref: hack.c maybe_wail()
export async function maybe_wail() {
    const powers = [ TELEPORT, SEE_INVIS, POISON_RES, COLD_RES,
                     SHOCK_RES, FIRE_RES, SLEEP_RES, DISINT_RES,
                     TELEPORT_CONTROL, STEALTH, FAST, INVIS ];
    const u = game.u;

    if (game.moves <= (game.wailmsg || 0) + 50)
        return;

    game.wailmsg = game.moves;
    if (game.urole.mnum === PM_WIZARD || game.urace.mnum === PM_ELF
        || game.urole.mnum === PM_VALKYRIE) { /* Role_if(), Race_if() */
        let who, i, powercnt;

        who = (game.urole.mnum === PM_WIZARD || game.urole.mnum === PM_VALKYRIE)
              ? game.urole.name.m : "Elf";
        if (u.uhp === 1) {
            await pline(`${who} is about to die.`);
        } else {
            for (i = 0, powercnt = 0; i < powers.length; ++i)
                if (u.uprops[powers[i]].intrinsic & INTRINSIC)
                    ++powercnt;

            await pline((powercnt >= 4) ? `${who}, all your powers will be lost...`
                                        : `${who}, your life force is running out.`);
        }
    } else {
        /* Soundeffect(se_wailing_of_the_banshee, 75): no sound */
        await You_hear(u.uhp === 1 ? "the wailing of the Banshee..."
                                   : "the howling of the CwnAnnwn...");
    }
}

// C ref: do.c set_wounded_legs()
export async function set_wounded_legs(side, timex) {
    const u = game.u;
    const W = u.uprops[WOUNDED_LEGS];
    /* KMH -- STEED
     * If you are riding, your steed gets the wounded legs instead.
     * You still call this function, but don't lose hp.
     * Caller is also responsible for adjusting messages.
     */
    game.disp_botl = true;
    if (!Wounded_legs())
        u.atemp.a[A_DEX]--;

    if (!Wounded_legs() || (W.intrinsic & TIMEOUT) < timex)
        W.intrinsic = (W.intrinsic & ~TIMEOUT) | (timex & TIMEOUT); /* set_itimeout() */
    /* the leg being wounded and its timeout might differ from one
       attack to the next, but we don't track the legs separately;
       5.0: both legs will ultimately heal together */
    W.extrinsic |= side;
    await encumber_msg();
}

// C ref: do.c heal_legs()
export async function heal_legs(
    how) /* 0: ordinary, 1: dismounting steed, 2: limbs turn to stone */
{
    const u = game.u;
    const W = u.uprops[WOUNDED_LEGS];

    if (Wounded_legs()) {
        game.disp_botl = true;
        if (u.atemp.a[A_DEX] < 0)
            u.atemp.a[A_DEX]++;

        /* when mounted, wounded legs applies to the steed;
           during petrification countdown, "your limbs turn to stone"
           before the final stages and that calls us (how==2) to cure
           wounded legs, but we want to suppress the feel better message */
        if (!u.usteed && how !== 2) {
            let legs = body_part(LEG);

            if ((W.extrinsic & BOTH_SIDES) === BOTH_SIDES)
                legs = makeplural(legs);
            /* this used to say "somewhat better" but that was
               misleading since legs are being fully healed */
            await pline(`Your ${legs} ${vtense(legs, "feel")} better.`);
        }

        W.intrinsic = W.extrinsic = 0;

        /* Wounded_legs reduces carrying capacity, so we want
           an encumbrance check when they're healed.  However,
           while dismounting, first steed's legs get healed,
           then hero is dropped to floor and a new encumbrance
           check is made [in dismount_steed()].  So don't give
           encumbrance feedback during the dismount stage
           because it could seem to be shown out of order and
           it might be immediately contradicted [able to carry
           more when steed becomes healthy, then possible floor
           feedback, then able to carry less when back on foot]. */
        if (how === 0)
            await encumber_msg();
    }
}

// C ref: trap.c set_utrap()
export function set_utrap(tim, typ) {
    const u = game.u;
    /* if we get here through reset_utrap(), the caller of that might
       have already set u.utrap to 0 so this check won't be sufficient
       in that situation; caller will need to set context.botl itself */
    if (!u.utrap !== !tim)
        game.disp_botl = true;

    u.utrap = tim;
    u.utraptype = tim ? typ : TT_NONE;

    float_vs_flight(); /* maybe block Lev and/or Fly */
}

// C ref: trap.c reset_utrap()
export async function reset_utrap(msg) {
    const was_Lev = Levitation(), was_Fly = Flying();

    set_utrap(0, 0);

    if (msg) {
        if (!was_Lev && Levitation())
            await float_up();
        if (!was_Fly && Flying())
            await You("can fly.");
    }
}

// C ref: trap.c float_up()
export async function float_up() {
    const u = game.u;

    game.disp_botl = true;
    if (u.utrap) {
        if (u.utraptype === TT_PIT) {
            await reset_utrap(false);
            await You(`float up, out of the ${trapname(PIT, false)}!`);
            game.vision_full_recalc = 1; /* vision limits change */
            await fill_pit(u.ux, u.uy);
        } else if (u.utraptype === TT_LAVA_HT /* molten lava */
                   || u.utraptype === TT_INFLOOR_HT) { /* solidified lava */
            await Your(`body pulls upward, but your ${
                makeplural(body_part(LEG))} are still stuck.`);
        } else if (u.utraptype === TT_BURIEDBALL) { /* tethered */
            const cc = { x: u.ux, y: u.uy };

            /* caveat: this finds the first buried iron ball within
               one step of the specified location, not necessarily the
               buried [former] uball at the original anchor point */
            buried_ball_tr(cc);
            /* being chained to the floor blocks levitation from floating
               above that floor but not from enhancing carrying capacity */
            await You(`feel lighter, but your ${body_part(LEG)} is still chained to the ${
                IS_ROOM(game.level.at(cc.x, cc.y).typ) ? "floor" : "ground"}.`);
        } else if (u.utraptype === WEB) {
            await You(`float up slightly, but you are still stuck in the ${
                trapname(WEB, false)}.`);
        } else { /* bear trap */
            await You(`float up slightly, but your ${body_part(LEG)} is still stuck.`);
        }
        /* when still trapped, float_vs_flight() below will block levitation */
    } else if (u.uinwater) {
        await spoteffects_dr(true);
    } else if (u.uswallow) {
        /* FIXME: this isn't correct for trapper/lurker above */
        if (is_animal_tr(u.ustuck.data))
            await You(`float away from the ${surface_tr(u.ux, u.uy)}.`);
        else
            await You(`spiral up into ${mon_nam(u.ustuck)}.`);
    } else if (Hallucination()) {
        await pline("Up, up, and awaaaay!  You're walking on air!");
    } else if (Is_airlevel_l(u.uz)) {
        await You("gain control over your movements.");
    } else {
        await You("start to float in the air!");
    }
    if (u.usteed && !is_floater(u.usteed.data)
        && !is_flyer(u.usteed.data)) {
        if (Lev_at_will_tr()) {
            await pline(`${Monnam(u.usteed)} magically floats up!`);
        } else {
            await You(`cannot stay on ${mon_nam(u.usteed)}.`);
            await dismount_steed(DISMOUNT_GENERIC);
        }
    }
    if (Flying())
        await You("are no longer able to control your flight.");
    float_vs_flight(); /* set BFlying, also BLevitation if still trapped */
    /* levitation gives maximum carrying capacity, so encumbrance
       state might be reduced */
    await encumber_msg();
    return;
}

// C ref: trap.c float_down()
/* stop levitating */
export async function float_down(
    hmask,
    emask) /* might cancel timeout */
{
    const u = game.u;
    const lev = uprop(LEVITATION);
    let trap = null;
    let current_dungeon_level;
    let no_msg = false;

    lev.intrinsic &= ~hmask;
    lev.extrinsic &= ~emask;
    if (Levitation())
        return 0; /* maybe another ring/potion/boots */
    if (lev.blocked) { /* BLevitation */
        /* if blocked by terrain, we haven't actually been levitating so
           we don't give any end-of-levitation feedback or side-effects,
           but if blocking is solely due to being trapped in/on floor,
           do give some feedback but skip other float_down() effects */
        const trapped = (lev.blocked === I_SPECIAL);

        float_vs_flight();
        if (trapped && u.utrap) /* u.utrap => paranoia */
            throw new Error('float_down(): no longer trying to float up not ported yet');
        await encumber_msg(); /* carrying capacity might have changed */
        return 0;
    }
    game.disp_botl = true;
    nomul(0); /* stop running or resting */
    if (uprop(FLYING).blocked) { /* BFlying */
        /* controlled flight no longer overridden by levitation */
        float_vs_flight(); /* clears BFlying & I_SPECIAL
                            * unless hero is stuck in floor */
        if (Flying()) {
            await You("have stopped levitating and are now flying.");
            await encumber_msg(); /* carrying capacity might have changed */
            return 1;
        }
    }
    if (u.uswallow)
        throw new Error('float_down(): engulfed hero not ported yet');

    if (game.uball && game.uball.where !== 'OBJ_INVENT' /* !carried(uball) */)
        throw new Error('float_down(): Punished ball in a pool or pit not ported yet');
    /* check for falling into pool - added by GAN 10/20/86 */
    if (!Flying()) {
        if (!u.uswallow && u.ustuck)
            throw new Error('float_down(): losing hold of u.ustuck not ported yet');
        /* kludge alert:
         * drown() and lava_effects() print various messages almost
         * every time they're called which conflict with the "fall
         * into" message below.  Thus, we want to avoid printing
         * confusing, duplicate or out-of-order messages.
         * Use knowledge of the two routines as a hack -- this
         * should really be handled differently -dlc
         */
        const wwalk = uprop(WWALKING), swim = uprop(SWIMMING);
        if (is_pool(u.ux, u.uy) && !(wwalk.intrinsic || wwalk.extrinsic)
            && !(swim.intrinsic || swim.extrinsic) && !u.uinwater)
            throw new Error('float_down(): drown() not ported yet');

        if (is_lava(u.ux, u.uy) && !game.iflags.in_lava_effects)
            throw new Error('float_down(): lava_effects() not ported yet');
    }
    if (!trap) {
        trap = t_at(u.ux, u.uy);
        if (Is_airlevel_l(u.uz)) {
            await You("begin to tumble in place.");
        } else if (Is_waterlevel_l(u.uz) && !no_msg) {
            await You_feel("heavier."); /* You_feel() */
        /* u.uinwater msgs already in spoteffects()/drown() */
        } else if (!u.uinwater && !no_msg) {
            if (!(emask & W_SADDLE)) {
                if (game.level.flags.sokoban_rules && trap) { /* Sokoban */
                    throw new Error('float_down(): Sokoban air currents not ported yet');
                } else if (u.usteed && (is_floater(u.usteed.data)
                                        || is_flyer(u.usteed.data))) {
                    await You("settle more firmly in the saddle.");
                } else if (Hallucination()) {
                    await pline(`Bummer!  You've ${is_pool(u.ux, u.uy)
                                                  ? "splashed down"
                                                  : "hit the ground"}.`);
                } else {
                    await You(`float gently to the ${surface_tr(u.ux, u.uy)}.`);
                }
            }
        }
    }

    /* levitation gives maximum carrying capacity, so having it end
       potentially triggers greater encumbrance; do this after
       'come down' messages, before trap activation or autopickup */
    await encumber_msg();

    /* can't rely on u.uz0 for detecting trap door-induced level change;
       it gets changed to reflect the new level before we can check it */
    current_dungeon_level = { dnum: u.uz.dnum, dlevel: u.uz.dlevel };
    if (trap) {
        switch (trap.ttyp) {
        case STATUE_TRAP:
            break;
        case HOLE:
        case TRAPDOOR:
            if (!Can_fall_thru(u.uz) || u.ustuck)
                break;
            /*FALLTHRU*/
        default:
            if (!u.utrap) /* not already in the trap */
                await dotrap(trap, NO_TRAP_FLAGS);
        }
    }
    if (!Is_airlevel_l(u.uz) && !Is_waterlevel_l(u.uz) && !u.uswallow
        /* falling through trap door calls goto_level,
           and goto_level does its own pickup() call */
        && u.uz.dnum === current_dungeon_level.dnum
        && u.uz.dlevel === current_dungeon_level.dlevel) /* on_level() */
        await pickup_tr(1);
    return 1;
}

// C ref: trap.c climb_pit()
/* shared code for climbing out of a pit */
export async function climb_pit() {
    const u = game.u;

    if (!u.utrap || u.utraptype !== TT_PIT)
        return;

    const pitname = trapname(PIT, false);
    if (Passes_walls()) {
        /* marked as trapped so they can pick things up */
        await You(`ascend from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!rn2(2) && sobj_at(BOULDER, u.ux, u.uy)) {
        await Your(`${body_part(LEG)} gets stuck in a crevice.`);
        await tty_display_nhwindow(game.WIN_MESSAGE, false);
        tty_clear_nhwindow(game.WIN_MESSAGE);
        await You(`free your ${body_part(LEG)}.`);
    } else if ((Flying() || is_clinger(game.youmonst.data))
               && !game.level.flags.sokoban_rules) {
        /* eg fell in pit, then poly'd to a flying monster;
           or used '>' to deliberately enter it */
        await You(`${u_locomotion("climb")} from the ${pitname}.`);
        await reset_utrap(false);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (!(--u.utrap) || m_easy_escape_pit(game.youmonst)) {
        await reset_utrap(false);
        await You(`${(game.level.flags.sokoban_rules && Levitation())
                       ? "struggle against the air currents and float"
                       : u.usteed ? "ride" : "crawl"} to the edge of the ${
                   pitname}.`);
        await fill_pit(u.ux, u.uy);
        game.vision_full_recalc = 1; /* vision limits change */
    } else if (u.dz || game.flags.verbose) {
        /* these should use 'pitname' rather than "pit" for hallucination
           but that would nullify Norep (this message can be repeated
           many times without further user intervention by using a run
           attempt to keep retrying to escape from the pit) */
        if (u.usteed)
            await Norep(`${YMonnam(u.usteed)} is still in a pit.`);
        else
            await Norep((Hallucination() && !rn2(5))
                            ? "You've fallen, and you can't get up."
                            : "You are still in a pit.");
    }
}

// C ref: defsym.h trap PCHAR() explanations, indexed by
// trap_to_defsym(ttyp) - S_arrow_trap (rm.h: S_arrow_trap + ttyp - 1)
export const trap_explanations = [
    "arrow trap", "dart trap", "falling rock trap", "squeaky board",
    "bear trap", "land mine", "rolling boulder trap", "sleeping gas trap",
    "rust trap", "fire trap", "pit", "spiked pit", "hole", "trap door",
    "teleportation trap", "level teleporter", "magic portal", "web",
    "statue trap", "magic trap", "anti-magic field", "polymorph trap",
    "vibrating square", "trapped door", "trapped chest",
];

// C ref: trap.c immune_to_trap()
/*
 * Returns:
 *  TRAP_NOT_IMMUNE = not immune at the moment;
 *  TRAP_CLEARLY_IMMUNE = obviously immune (if player is polymorphed, assume
 *    they know which traps they are immune to in their current form);
 *  TRAP_HIDDEN_IMMUNE = immune but in non-obvious way such as an unidentified
 *    item or hidden intrinsic providing a resistance; the player should still
 *    be warned of this trap, while monsters implicitly know they're immune.
 */
export function immune_to_trap(mon, ttype) {
    if (!mon)
        return TRAP_NOT_IMMUNE; /* impossible("immune_to_trap: null monster") */
    const pm = mon.data;
    const is_you = (mon === game.youmonst);
    const u = game.u;
    /* C ref: wizard.c mon_has_amulet() -- youmonst.minvent is empty */
    const mon_has_amulet = (m) => !is_you
        && (m.minvent || []).some(o => o.otyp === AMULET_OF_YENDOR);
    /* C ref: dungeon.c has_ceiling() */
    const has_ceiling = (lev) => !(In_endgame(lev) && !Is_earthlevel(lev));

    switch (ttype) {
    case ARROW_TRAP:
    case DART_TRAP:
    case ROCKTRAP:
        /* can hit anything; even noncorporeal monsters might get a blessed
           projectile */
        return TRAP_NOT_IMMUNE;
    case BEAR_TRAP:
        if (pm.msize <= MZ_SMALL
            || amorphous(pm) || is_whirly(pm) || unsolid(pm))
            return TRAP_CLEARLY_IMMUNE;
        /*FALLTHRU*/
    case SQKY_BOARD:
    case LANDMINE:
    case ROLLING_BOULDER_TRAP:
    case HOLE:
    case TRAPDOOR:
    case PIT:
    case SPIKED_PIT:
        /* ground-based traps, which can be evaded by levitation, flying, or
           hanging to the ceiling */
        if (game.level.flags.sokoban_rules && (is_pit(ttype) || is_hole(ttype)))
            return TRAP_NOT_IMMUNE;
        if (In_sokoban(u.uz) && ttype === ROLLING_BOULDER_TRAP)
            return TRAP_CLEARLY_IMMUNE; /* not dangerous in Sokoban */
        if (is_floater(pm) || is_flyer(pm)
            || (is_clinger(pm) && has_ceiling(u.uz)))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && (Levitation() || Flying()))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case SLP_GAS_TRAP:
        if (breathless(pm))
            return TRAP_CLEARLY_IMMUNE;
        else if (!is_you && resists_sleep(mon))
            return TRAP_CLEARLY_IMMUNE;
        else if (is_you && Sleep_resistance())
            return TRAP_HIDDEN_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case LEVEL_TELEP:
    case TELEP_TRAP:
        /* consider unintended teleporting to be an adverse effect; if in
           the endgame or carrying the Amulet, the teleport trap won't work
           anyway, so anything hitting it is immune. */
        if (In_endgame(u.uz) || mon_has_amulet(mon))
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case POLY_TRAP:
        if (resists_magm(mon))
            /* covers Antimagic for player */
            return (is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE);
        return TRAP_NOT_IMMUNE;
    case STATUE_TRAP:
        /* no effect on monsters, only affects players */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case WEB:
        /* most of this code is lifted from mu_maybe_destroy_web */
        if (webmaker(pm) || amorphous(pm) || is_whirly(pm) || flaming(pm)
            || unsolid(pm) || pm === mons[PM_GELATINOUS_CUBE])
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case ANTI_MAGIC:
        /* doesn't hurt any non-magic-resistant monster with no magic */
        if (is_you) {
            if (Antimagic())
                return TRAP_NOT_IMMUNE;
            else if (u.uenmax === 0)
                /* player won't lose HP and can't lose more Pw */
                return TRAP_HIDDEN_IMMUNE;

        /* following conditional lifted from mintrap ANTI_MAGIC logic */
        } else if (!resists_magm(mon)
                   && (mon.mcan || (!attacktype(pm, AT_MAGC)
                                    && !attacktype(pm, AT_BREA)))) {
            return TRAP_CLEARLY_IMMUNE;
        }
        return TRAP_NOT_IMMUNE;
    case RUST_TRAP: {
        /* harmful if wearing anything rustable or if mon is an iron golem */
        if (pm === mons[PM_IRON_GOLEM])
            return TRAP_NOT_IMMUNE;

        const objs = [];
        if (is_you)
            for (let o = game.invent; o; o = o.nobj) objs.push(o);
        else
            objs.push(...(mon.minvent || []).slice().reverse());
        for (const obj of objs) {
            /* rust traps can currently hit only worn armor and weapons */
            if (objects[obj.otyp].oc_material === IRON /* is_rustprone() */
                && obj.owornmask) {
                if (is_you && (obj === game.uquiver
                               || (obj === game.uswapwep && !u.twoweap)))
                    continue;
                return TRAP_NOT_IMMUNE;
            }
        }
        return TRAP_CLEARLY_IMMUNE;
    }
    case MAGIC_TRAP:
        /* for player, any number of bad effects;
           for monsters, only replicates fire trap, so fall through */
        if (is_you)
            return TRAP_NOT_IMMUNE;
        /*FALLTHRU*/
    case FIRE_TRAP: { /* can always destroy items being carried */
        /* harmful if not resistant or if carrying anything that could burn */
        if (is_you ? !(uprop(FIRE_RES).intrinsic || uprop(FIRE_RES).extrinsic)
                   : !resists_fire(mon))
            return TRAP_NOT_IMMUNE;

        const objs = [];
        if (is_you)
            for (let o = game.invent; o; o = o.nobj) objs.push(o);
        else
            objs.push(...(mon.minvent || []).slice().reverse());
        for (const obj of objs) {
            if (obj.oclass === SCROLL_CLASS || obj.oclass === POTION_CLASS
                || obj.oclass === SPBOOK_CLASS
                || (obj.owornmask && is_flammable(obj))) {
                if ((obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL)
                    /* mon knows scroll of fire or spellbook of fireball
                       won't be affected; hero knows iff this one has been
                       seen and its type has been discovered */
                    && (!is_you
                        || (obj.dknown && objects[obj.otyp].oc_name_known)))
                    continue;
                return TRAP_NOT_IMMUNE;
            }
        }
        return (is_you ? TRAP_HIDDEN_IMMUNE : TRAP_CLEARLY_IMMUNE);
    }
    case MAGIC_PORTAL:
        /* never hurts anything, but player is considered non-immune so they
           can be asked about entering it */
        if (!is_you)
            return TRAP_CLEARLY_IMMUNE;
        return TRAP_NOT_IMMUNE;
    case VIBRATING_SQUARE:
        return TRAP_CLEARLY_IMMUNE;
    default:
        /* impossible("immune_to_trap: unknown trap type %u", ttype) */
        return TRAP_NOT_IMMUNE;
    }
}

// C ref: trap.c cnv_trap_obj()
/* Replace trap with object(s).  Helge Hafting */
export async function cnv_trap_obj(otyp, cnt, ttmp, bury_it) {
    const otmp = mksobj(otyp, true, false);
    let mtmp;

    otmp.quan = cnt;
    otmp.owt = weight(otmp);
    /* Only dart traps are capable of being poisonous */
    if (otyp !== DART)
        otmp.opoisoned = 0;
    place_object(otmp, ttmp.tx, ttmp.ty);
    if (bury_it) {
        /* magical digging first disarms this trap, then will unearth it */
        bury_an_obj(otmp, null);
    } else {
        /* Sell your own traps only... */
        if (ttmp.madeby_u)
            await sellobj(otmp, ttmp.tx, ttmp.ty);
        stackobj(otmp);
    }
    newsym(ttmp.tx, ttmp.ty);
    if (game.u.utrap && u_at(ttmp.tx, ttmp.ty))
        await reset_utrap(true);
    if (((mtmp = m_at(ttmp.tx, ttmp.ty)) != null) && mtmp.mtrapped)
        mtmp.mtrapped = 0;
    deltrap(ttmp);
}

// C ref: trap.c into_vs_onto()
/* whether moving to a trap location is moving "into" the trap or "onto" it */
export function into_vs_onto(traptype) {
    switch (traptype) {
    case BEAR_TRAP:
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TELEP_TRAP:
    case LEVEL_TELEP:
    case MAGIC_PORTAL:
    case WEB:
        return true;
    }
    return false;
}

/* C ref: trap.c trapname() 'static const char *const halu_trapnames[]' */
const halu_trapnames = [
    /* riffs on actual nethack traps */
    "bottomless pit", "polymorphism trap", "devil teleporter",
    "falling boulder trap", "anti-anti-magic field", "weeping gas trap",
    "queasy board", "electrified web", "owlbear trap", "sand mine",
    "vacillating triangle",
    /* some traps found in nethack variants */
    "death trap", "disintegration trap", "ice trap", "monochrome trap",
    /* plausible real-life traps */
    "axeblade trap", "pool of boiling oil", "pool of quicksand",
    "field of caltrops", "buzzsaw trap", "spiked floor", "revolving wall",
    "uneven floor", "finger trap", "jack-in-a-box", "yellow snow",
    "booby trap", "rat trap", "poisoned nail", "snare", "whirlpool",
    "trip wire", "roach motel (tm)",
    /* sci-fi */
    "negative space", "tensor field", "singularity", "imperial fleet",
    "black hole", "thermal detonator", "event horizon",
    "entoptic phenomenon",
    /* miscellaneous suggestions */
    "sweet-smelling gas vent", "phone booth", "exploding runes",
    "never-ending elevator", "slime pit", "warp zone", "illusory floor",
    "pile of poo", "honey trap", "tourist trap",
    "banana peel", "garden rake", "whoopie cushion", "box and stick trap",
    "fly trap", "legal trap", "pit of snakes", "pollywog trap",
    "slippery slope", "thirst trap", "suntrap",
];

// C ref: trap.c trapname()
export function trapname(ttyp, override) /* if True, ignore Hallucination */ {
    if (Hallucination() && !override) {
        const total_names = TRAPNUM + halu_trapnames.length;
        let nameidx = rn2_on_display_rng_l(total_names + 1);

        if (nameidx === total_names) {
            const u = game.u;
            const fem = Upolyd() ? u.mfemale : game.flags.female;
            const urole = game.urole;
            /* static char roletrap[33]; [17 + 5 + 1] should suffice */
            let roletrap;

            /* inspired by "tourist trap" */
            roletrap = copynchars_tp(
                rn2(3) ? ((fem && urole.name.f) ? urole.name.f
                                                : urole.name.m)
                       : rank_of_tp(u.ulevel, urole.mnum /* Role_switch */, fem),
                33 - 6); /* (sizeof roletrap - sizeof " trap") */
            roletrap += " trap";
            return roletrap.toLowerCase(); /* lcase() */
        } else if (nameidx >= TRAPNUM) {
            nameidx -= TRAPNUM;
            return halu_trapnames[nameidx];
        } /* else use an actual trap type */
        if (nameidx !== NO_TRAP)
            ttyp = nameidx;
    }
    return trap_explanations[ttyp - 1];
}

// C ref: hack.c u_locomotion()
export function u_locomotion(def) {
    const capitalize = (def[0] === def[0].toUpperCase());

    /* regular locomotion() takes a monster type rather than a specific
       monster, so can't tell whether it is operating on hero */
    if (Levitation())
        return capitalize ? "Float" : "float";
    if (Flying())
        return capitalize ? "Fly" : "fly";
    return locomotion(game.youmonst.data, def);
}

// C ref: mondata.c locomotion()
export function locomotion(ptr, def) {
    const capitalize = (def[0] === def[0].toUpperCase());
    const levitate = ["float", "Float", "wobble", "Wobble"];
    const flys = ["fly", "Fly", "flutter", "Flutter"];
    const flyl = ["fly", "Fly", "stagger", "Stagger"];
    const slither = ["slither", "Slither", "falter", "Falter"];
    const ooze = ["ooze", "Ooze", "tremble", "Tremble"];
    const immobile = ["wiggle", "Wiggle", "pulsate", "Pulsate"];
    const crawl = ["crawl", "Crawl", "falter", "Falter"];
    const idx = capitalize ? 1 : 0;

    return (is_floater(ptr) ? levitate[idx]
            : (is_flyer(ptr) && ptr.msize <= MZ_SMALL) ? flys[idx]
              : (is_flyer(ptr) && ptr.msize > MZ_SMALL) ? flyl[idx]
                : (ptr.mflags1 & M1_SLITHY) ? slither[idx]
                  : amorphous(ptr) ? ooze[idx]
                    : !ptr.mmove ? immobile[idx]
                      : ((ptr.mflags1 & M1_NOLIMBS) === M1_NOLIMBS) ? crawl[idx] /* nolimbs() */
                        : def);
}

// C ref: trap.c conjoined_pits()
export function conjoined_pits(trap2, trap1, u_entering_trap2) {
    const u = game.u;

    if (!trap1 || !trap2)
        return false;
    if (!isok(trap2.tx, trap2.ty) || !isok(trap1.tx, trap1.ty)
        || !is_pit(trap2.ttyp)
        || !is_pit(trap1.ttyp)
        || (u_entering_trap2 && !(u.utrap && u.utraptype === TT_PIT)))
        return false;
    const dx = sgn(trap2.tx - trap1.tx);
    const dy = sgn(trap2.ty - trap1.ty);
    const diridx = xytodir_tr(dx, dy);
    if (diridx !== DIR_ERR_TR) {
        const adjidx = DIR_180_TR(diridx);
        if ((trap1.conjoined & (1 << diridx))
            && (trap2.conjoined & (1 << adjidx)))
            return true;
    }
    return false;
}

// C ref: trap.c adj_nonconjoined_pit()
function adj_nonconjoined_pit(adjtrap) {
    const u = game.u;
    const trap_with_u = t_at(u.ux0, u.uy0);

    if (trap_with_u && adjtrap && u.utrap && u.utraptype === TT_PIT
        && is_pit(trap_with_u.ttyp) && is_pit(adjtrap.ttyp)) {
        if (xytodir_tr(u.dx, u.dy) !== DIR_ERR_TR)
            return true;
    }
    return false;
}

// C ref: trap.c dotrap()
export async function dotrap(trap, trflags) {
    const u = game.u;
    const ttype = trap.ttyp;
    const already_seen = trap.tseen;
    let forcetrap = ((trflags & FORCETRAP) !== 0
                     || (trflags & FAILEDUNTRAP) !== 0);
    const forcebungle = (trflags & FORCEBUNGLE) !== 0,
          plunged = (trflags & TOOKPLUNGE) !== 0,
          conj_pit = conjoined_pits(trap, t_at(u.ux0, u.uy0), true),
          adj_pit = adj_nonconjoined_pit(trap);
    const madeby_u = trap.madeby_u ? 1 : 0;

    nomul(0);

    if (fixed_tele_trap(trap)) {
        trflags |= FORCETRAP;
        forcetrap = true;
    }

    /* KMH -- You can't escape the Sokoban level traps */
    if (game.level.flags.sokoban_rules && (is_pit(ttype) || is_hole(ttype))) {
        /* The "air currents" message is still appropriate -- even when
         * the hero isn't flying or levitating -- because it conveys the
         * reason why the player cannot escape the trap with a dexterity
         * check, clinging to the ceiling, etc.
         */
        await pline(`Air currents pull you down into ${a_your[madeby_u]} ${
            trapname(ttype, true)}!`); /* do force "pit" while hallucinating */
        /* then proceed to normal trap effect */
    } else if (!forcetrap) {
        if (floor_trigger(ttype) && check_in_air(game.youmonst, trflags)) {
            if (already_seen) {
                await You(`${u_locomotion("step")} over ${
                    (ttype === ARROW_TRAP && !trap.madeby_u)
                    ? "an" : a_your[madeby_u]} ${trapname(ttype, false)}.`);
            }
            return;
        }
        if (already_seen && !Fumbling() && !undestroyable_trap(ttype)
            && ttype !== ANTI_MAGIC && !forcebungle && !plunged
            && !conj_pit && !adj_pit
            && (!rn2(5) || (is_pit(ttype) && is_clinger(game.youmonst.data)))) {
            await You(`escape ${(ttype === ARROW_TRAP && !trap.madeby_u)
                                ? "an" : a_your[madeby_u]} ${
                trapname(ttype, false)}.`);
            return;
        }
    }

    if (u.usteed)
        mon_learns_traps(u.usteed, ttype);
    mons_see_trap(trap);

    /*
     * Note:
     *  Most references to trap types here don't use trapname() for
     *  hallucination.  This could be considered to be a bug but doing
     *  that would hide the actual trap situation from the player which
     *  would be somewhat harsh for what's usually a minor impairment.
     */

    await trapeffect_selector(game.youmonst, trap, trflags);
}

// C ref: trap.h fixed_tele_trap()
export function fixed_tele_trap(t) {
    return (t.ttyp === TELEP_TRAP && isok(t.launch.x, t.launch.y));
}

// C ref: trap.h enum trap_result
export const Trap_Effect_Finished = 0;
export const Trap_Is_Gone = 0;
export const Trap_Caught_Mon = 1;
export const Trap_Killed_Mon = 2;
export const Trap_Moved_Mon = 3; /* new location, or new level */

/* mondata.h */

// C ref: trap.c trapeffect_sqky_board()
async function trapeffect_sqky_board(mtmp, trap, trflags) {
    /* tsnds[] / Soundeffect(): sound effects aren't ported */
    const forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (Flying() && (trflags & VIASITTING) !== 0));

    if (mtmp === game.youmonst) {
        if ((Levitation() || Flying()) && !forcetrap) {
            if (!Blind()) {
                seetrap(trap);
                if (Hallucination())
                    await You("notice a crease in the linoleum.");
                else
                    await You("notice a loose board below you.");
            }
        } else {
            seetrap(trap);
            await pline(`A board beneath you ${
                Deaf() ? "vibrates" : "squeaks "}${
                Deaf() ? "" : trapnote(trap, false)}${
                Deaf() ? "" : " loudly"}.`);
            await wake_nearby(false);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (m_in_air(mtmp))
            return Trap_Effect_Finished;
        /* stepped on a squeaky board */
        if (in_sight) {
            if (!Deaf()) {
                await pline_mon(mtmp, `A board beneath ${mon_nam(mtmp)} squeaks ${
                    trapnote(trap, false)} loudly.`);
                seetrap(trap);
            } else if (!mindless(mtmp.data)) {
                await pline_mon(mtmp, `${Monnam(mtmp)} stops momentarily and appears to cringe.`);
            }
        } else {
            /* same near/far threshold as mzapmsg() */
            const range = couldsee(mtmp.mx, mtmp.my) /* 9 or 5 */
                ? (BOLT_LIM + 1) : (BOLT_LIM - 3);

            await You_hear(`${trapnote(trap, false)} squeak ${
                (mdistu(mtmp) <= range * range)
                    ? "nearby" : "in the distance"}.`);
        }
        /* wake up nearby monsters */
        await wake_nearto(mtmp.mx, mtmp.my, 40);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c static strings
const a_your = ["a", "your"];
const tower_of_flame = "tower of flame";
const A_gush_of_water_hits = "A gush of water hits";

/* C ref: mondata.h passes_rocks(), grounded(); obj.h stone_missile();
   trap.c completelyrusts */
export function passes_rocks(ptr) { return passes_walls(ptr) && !unsolid(ptr); }

// C ref: trap.c wearing_iron_shoes()
export function wearing_iron_shoes(mtmp) {
    const armf = which_armor(mtmp, W_ARMF);
    return !!armf && objects[armf.otyp].oc_material === IRON;
}

// C ref: trap.c sokoban_guilt()
/* used for various things which cause Sokoban rule violations */
export function sokoban_guilt() {
    if (game.level.flags.sokoban_rules) { /* Sokoban */
        game.u.uconduct.sokocheat++;
        change_luck(-1);
        /*
         * TODO:
         *  Issue some feedback so that player can learn that whatever
         *  he/she just did is a naughty thing to do in sokoban and
         *  should probably be avoided in future....
         *
         *  Caveat:  doing this might introduce message sequencing
         *  issues, depending upon feedback during the various actions
         *  which trigger Sokoban luck penalties.
         */
    }
}

// C ref: trap.c feeltrap()
/* like seetrap() but overrides vision */
export function feeltrap(trap) {
    trap.tseen = 1;
    /* map_trap(trap, 1): newsym() below redisplays the remembered trap */
    /* in case it's beneath something, redisplay the something */
    newsym(trap.tx, trap.ty);
}

// C ref: trap.c trap_ice_effects()
/* used for ice melting (and freezing) */
export async function trap_ice_effects(x, y, ice_is_melting) {
    const ttmp = t_at(x, y);

    if (ttmp && ice_is_melting) {
        let mtmp;

        if (((mtmp = m_at(x, y)) != null) && mtmp.mtrapped)
            mtmp.mtrapped = 0;
        if (ttmp.ttyp === LANDMINE || ttmp.ttyp === BEAR_TRAP) {
            /* landmine or bear trap set on top of the ice falls
               into the water */
            const otyp = (ttmp.ttyp === LANDMINE) ? LAND_MINE_OBJ : BEARTRAP_OBJ;
            await cnv_trap_obj(otyp, 1, ttmp, true);
        } else {
            if (!undestroyable_trap(ttmp.ttyp))
                deltrap(ttmp);
        }
    }
}

// C ref: trap.c deltrap()
export function deltrap(trap) {
    const traps = ftraps();

    if (is_pit(trap.ttyp) && trap.conjoined)
        throw new Error('deltrap(): clear_conjoined_pits() not ported yet');
    const i = traps.indexOf(trap);
    if (i < 0)
        throw new Error('deltrap: no preceding trap!');
    traps.splice(i, 1);
    if (game.level.flags.sokoban_rules
        && (trap.ttyp === PIT || trap.ttyp === HOLE))
        maybe_finish_sokoban();
    /* dealloc_trap(trap): garbage collected */
}

// C ref: trap.c maybe_finish_sokoban()
/* called when a trap has been deleted or had its ttyp replaced */
function maybe_finish_sokoban() {
    if (game.level.flags.sokoban_rules && !game.in_mklev) {
        /* scan all remaining traps, ignoring any created by the hero;
           if this level has no more pits or holes, the current sokoban
           puzzle has been solved */
        let found = false;
        for (const t of ftraps()) {
            if (t.madeby_u)
                continue;
            if (t.ttyp === PIT || t.ttyp === HOLE) {
                found = true;
                break;
            }
        }
        if (!found) {
            /* for livelog to report the sokoban depth in the way that
               players tend to think about it: 1 for entry level, 4 for top */
            const sokonum = game.dungeons[game.u.uz.dnum].entry_lev - game.u.uz.dlevel + 1;

            /* we've passed the last trap without finding a pit or hole;
               clear the sokoban_rules flag so that luck penalties for
               things like breaking boulders or jumping will no longer
               be given, and restrictions on diagonal moves are lifted */
            game.level.flags.sokoban_rules = 0; /* Sokoban = 0 */
            /* log the completion event regardless of whether or not
               any normal in-game feedback has just been given */
            livelog_printf(LL_MINORAC | LL_DUMP,
                           `completed ${sokonum}${ordin(sokonum)} Sokoban level`);
        }
    }
}

// C ref: trap.c t_missile()
/* make a single arrow/dart/rock for a trap to shoot or drop */
function t_missile(otyp, trap) {
    const otmp = mksobj(otyp, true, false);

    otmp.quan = 1;
    otmp.owt = weight(otmp);
    otmp.otrapped /* opoisoned */ = 0;
    otmp.ox = trap.tx, otmp.oy = trap.ty;
    return otmp;
}

// C ref: trap.c thitm()
/* Monster is hit by trap. */
async function thitm(tlev,          /* missile's attack level */
                     mon,           /* target */
                     obj,           /* missile; might be Null */
                     d_override,    /* non-zero: force hit for this amount
                                       of damage */
                     nocorpse) {    /* True: a trap is completely burning
                                       up the target */
    let strike;
    let trapkilled = false;

    if (d_override)
        strike = 1;
    else if (obj)
        strike = (find_mac(mon) + tlev + obj.spe <= rnd(20));
    else
        strike = (find_mac(mon) + tlev <= rnd(20));

    /* Actually more accurate than thitu, which doesn't take
     * obj->spe into account.
     */
    if (!strike) {
        if (obj && cansee(mon.mx, mon.my))
            await pline_mon(mon, `${Monnam(mon)} is almost hit by ${doname(obj)}!`);
    } else {
        let dam = 1;
        const harmless = (obj && stone_missile(obj)
                          && passes_rocks(mon.data));

        if (obj && cansee(mon.mx, mon.my))
            await pline_mon(mon, `${Monnam(mon)} is hit by ${doname(obj)}${
                harmless ? " but is not harmed." : "!"}`);
        if (d_override) {
            dam = d_override;
        } else if (obj) {
            dam = dmgval(obj, mon);
            if (dam < 1)
                dam = 1;
        }
        if (!harmless) {
            mon.mhp -= dam;
            if (mon.mhp <= 0) {
                const xx = mon.mx, yy = mon.my;

                await monkilled(mon, "", nocorpse ? -AD_RBRE : AD_PHYS);
                if (mon.mhp <= 0) { /* DEADMONSTER(mon) */
                    newsym(xx, yy);
                    trapkilled = true;
                }
            }
        } else {
            strike = 0; /* harmless; don't use up the missile */
        }
    }
    if (obj && (!strike || d_override)) {
        place_object(obj, mon.mx, mon.my);
        stackobj(obj);
    } else if (obj) {
        /* dealloc_obj(obj): garbage collected */
    }

    return trapkilled;
}

// C ref: trap.c trapeffect_arrow_trap()
async function trapeffect_arrow_trap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        const u = game.u;
        if (trap.once && trap.tseen && !rn2(15)) {
            /* Soundeffect(se_loud_click, 100) */
            await You_hear("a loud click!");
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        seetrap(trap);
        await pline("An arrow shoots out at you!");
        otmp = t_missile(ARROW, trap);
        const dam = dmgval(otmp, game.youmonst);
        const oref = { obj: otmp };
        if (u.usteed && !rn2(2) && await steedintrap(trap, otmp)) {
            ; /* nothing */
        } else if (await thitu(8, Maybe_Half_Phys(dam), oref, "arrow")) {
            otmp = oref.obj;
            if (otmp)
                obfree(otmp, null);
        } else {
            otmp = oref.obj;
            place_object(otmp, u.ux, u.uy);
            if (!Blind())
                observe_object(otmp, Hallucination());
            stackobj(otmp);
            newsym(u.ux, u.uy);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline_mon(mtmp, `${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(ARROW, trap);
        if (in_sight)
            seetrap(trap);
        if (await thitm(8, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_dart_trap()
async function trapeffect_dart_trap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        const u = game.u;
        const oldumort = u.umortality || 0;

        if (trap.once && trap.tseen && !rn2(15)) {
            /* Soundeffect(se_soft_click, 30) */
            await You_hear("a soft click.");
            deltrap(trap);
            newsym(u.ux, u.uy);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        seetrap(trap);
        await pline("A little dart shoots out at you!");
        otmp = t_missile(DART, trap);
        if (!rn2(6))
            otmp.otrapped /* opoisoned */ = 1;
        const dam = dmgval(otmp, game.youmonst);
        const oref = { obj: otmp };
        if (u.usteed && !rn2(2) && await steedintrap(trap, otmp)) {
            ; /* nothing */
        } else if (await thitu(7, Maybe_Half_Phys(dam), oref, "little dart")) {
            otmp = oref.obj;
            if (otmp) {
                if (otmp.otrapped /* opoisoned */)
                    await poisoned("dart", A_CON, "little dart",
                                   /* if damage triggered life-saving,
                                      poison is limited to attrib loss */
                                   ((u.umortality || 0) > oldumort) ? 0 : 10,
                                   true);
                obfree(otmp, null);
            }
        } else {
            otmp = oref.obj;
            place_object(otmp, u.ux, u.uy);
            if (!Blind())
                observe_object(otmp, Hallucination());
            stackobj(otmp);
            newsym(u.ux, u.uy);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline_mon(mtmp, `${Monnam(mtmp)} triggers a trap but nothing happens.`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(DART, trap);
        if (!rn2(6))
            otmp.otrapped /* opoisoned */ = 1;
        if (in_sight)
            seetrap(trap);
        if (await thitm(7, mtmp, otmp, 0, false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_rocktrap()
async function trapeffect_rocktrap(mtmp, trap, trflags) {
    let otmp;

    if (mtmp === game.youmonst) {
        const u = game.u;
        let harmless = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            await pline(`A trap door in ${the(ceiling_tr(u.ux, u.uy))} opens, but nothing falls out!`);
            deltrap(trap);
            newsym(u.ux, u.uy);
        } else {
            let dmg = d(2, 6); /* should be std ROCK dmg? */

            trap.once = 1;
            feeltrap(trap);
            otmp = t_missile(ROCK, trap);
            place_object(otmp, u.ux, u.uy);

            await pline(`A trap door in ${the(ceiling_tr(u.ux, u.uy))} opens and ${
                an_l(xname(otmp))} falls on your ${body_part(HEAD)}!`);
            if (game.uarmh) {
                /* normally passes_rocks() would protect against a falling
                   rock, but not when wearing a helmet */
                if (passes_rocks(game.youmonst.data)) {
                    await pline(`Unfortunately, you are wearing ${
                        an_l(helm_simple_name_tr(game.uarmh))}.`); /* helm or hat */
                    dmg = 2;
                } else if (hard_helmet_tr(game.uarmh)) {
                    await pline("Fortunately, you are wearing a hard helmet.");
                    dmg = 2;
                } else if (game.flags.verbose) {
                    await pline(`${Yname2_fd(game.uarmh)} does not protect you.`);
                }
            } else if (passes_rocks(game.youmonst.data)) {
                await pline("It passes harmlessly through you.");
                harmless = true;
            }
            if (!Blind())
                observe_object(otmp, Hallucination());
            stackobj(otmp);
            newsym(u.ux, u.uy); /* map the rock */

            if (!harmless) {
                await losehp(Maybe_Half_Phys(dmg), "falling rock", KILLED_BY_AN);
                await exercise(A_STR, false);
            }
        }
        return Trap_Effect_Finished;
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        let trapkilled = false;

        if (trap.once && trap.tseen && !rn2(15)) {
            if (in_sight && see_it)
                await pline_mon(mtmp, `A trap door above ${mon_nam(mtmp)} opens, but nothing falls out!`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
            return Trap_Is_Gone;
        }
        trap.once = 1;
        otmp = t_missile(ROCK, trap);
        if (in_sight)
            seetrap(trap);
        if (await thitm(0, mtmp, otmp, d(2, 6), false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_bear_trap()
async function trapeffect_bear_trap(mtmp, trap, trflags) {
    const is_you = mtmp === game.youmonst,
          forcetrap = ((trflags & FORCETRAP) !== 0
                       || (trflags & FAILEDUNTRAP) !== 0
                       || (is_you && (trflags & VIASITTING) !== 0));

    if (is_you) {
        const dmg = d(2, 4);
        const u = game.u;
        const A_Your = ["A", "Your"];
        const madeby_u = trap.madeby_u ? 1 : 0;

        if ((Levitation() || Flying()) && !forcetrap)
            return Trap_Effect_Finished;
        feeltrap(trap);
        if (amorphous(game.youmonst.data) || is_whirly(game.youmonst.data)
            || unsolid(game.youmonst.data)) {
            await pline(`${A_Your[madeby_u]} bear trap closes harmlessly through you.`);
            return Trap_Effect_Finished;
        }
        if (!u.usteed && game.youmonst.data.msize <= MZ_SMALL) {
            await pline(`${A_Your[madeby_u]} bear trap closes harmlessly over you.`);
            return Trap_Effect_Finished;
        }
        set_utrap(rn1(4, 4), TT_BEARTRAP);
        if (u.usteed) {
            await pline(`${A_Your[madeby_u]} bear trap closes on ${
                s_suffix(mon_nam(u.usteed))} ${mbodypart_tr(u.usteed, FOOT)}!`);
            if (await thitm(0, u.usteed, null, dmg, false))
                await reset_utrap(true); /* steed died, hero not trapped */
        } else {
            await pline(`${A_Your[madeby_u]} bear trap closes on your ${
                body_part(FOOT)}!`);
            if (u.umonnum === PM_OWLBEAR || u.umonnum === PM_BUGBEAR)
                await You("howl in anger!");
            if (wearing_iron_shoes(mtmp))
                await pline(`${Yname2_fd(game.uarmf)} protects your leg.`);
            else {
                await set_wounded_legs(rn2(2) ? RIGHT_SIDE : LEFT_SIDE, rn1(10, 10));
                await losehp(Maybe_Half_Phys(dmg), "bear trap", KILLED_BY_AN);
            }
        }
        await exercise(A_DEX, false);
    } else {
        const mptr = mtmp.data;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;

        if (mptr.msize > MZ_SMALL && !amorphous(mptr) && !m_in_air(mtmp)
            && !is_whirly(mptr) && !unsolid(mptr)) {
            mtmp.mtrapped = 1;
            if (in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} is caught in ${
                    a_your[trap.madeby_u ? 1 : 0]} bear trap!`);
                seetrap(trap);
            } else {
                if (mptr === mons[PM_OWLBEAR]
                    || mptr === mons[PM_BUGBEAR]) {
                    /* Soundeffect(se_roar, 100) */
                    await You_hear("the roaring of an angry bear!");
                }
            }
        } else if (forcetrap) {
            if (in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} evades ${
                    a_your[trap.madeby_u ? 1 : 0]} bear trap!`);
                seetrap(trap);
            }
        }
        if (mtmp.mtrapped && !wearing_iron_shoes(mtmp))
            trapkilled = await thitm(0, mtmp, null, d(2, 4), false);

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: mhitm.c sleep_monst()
/* `mon' is hit by a sleep attack; return 1 if it's affected, 0 otherwise */
export async function sleep_monst(mon, amt, how) {
    /* reveal mimic unless already asleep or paralyzed (won't be 'busy') */
    if (how >= 0 && !mon.msleeping && !mon.mfrozen
        && mon.data.mlet === S_MIMIC && (mon.m_ap_type === M_AP_FURNITURE
                                         || mon.m_ap_type === M_AP_OBJECT))
        seemimic(mon);

    if (resists_sleep(mon) || defended(mon, AD_SLEE)
        || (how >= 0 && resist(mon, how, 0, NOTELL))) {
        await shieldeff(mon.mx, mon.my);
    } else if (mon.mcanmove) {
        finish_meating(mon); /* terminate any meal-in-progress */
        amt += (mon.mfrozen || 0);
        if (amt > 0) { /* sleep for N turns */
            mon.mcanmove = 0;
            mon.mfrozen = Math.min(amt, 127);
        } else { /* sleep until awakened */
            mon.msleeping = 1;
        }
        return 1;
    }
    return 0;
}

// C ref: trap.c trapeffect_slp_gas_trap()
async function trapeffect_slp_gas_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        if (Sleep_resistance() || breathless(game.youmonst.data)) {
            await You("are enveloped in a cloud of gas!");
            monstseesu_tr(M_SEEN_SLEEP_TR);
        } else {
            await pline("A cloud of gas puts you to sleep!");
            await fall_asleep_tr(-rnd(25), true);
            monstunseesu_tr(M_SEEN_SLEEP_TR);
        }
        await steedintrap(trap, null);
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        if (!resists_sleep(mtmp) && !breathless(mtmp.data)
            && !helpless(mtmp)) {
            if (await sleep_monst(mtmp, rnd(25), -1) && in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} suddenly falls asleep!`);
                seetrap(trap);
            }
        }
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c water_damage()
/* Get an object wet and damage it appropriately.
   Returns an erosion return value (ER_*). */
export async function water_damage(
    obj,   /* might be Null; return ER_NOTHING if so */
    ostr,  /* if non-Null, use instead of cxname() in messages */
    force) /* if True, skip luck-based protection check */
{
    const ER_NOTHING = 0, ER_GREASED = 1, ER_DAMAGED = 2;
    const in_invent = !!obj && obj.where === 'OBJ_INVENT'; /* carried(obj) */
    let described = false;

    if (!obj)
        return ER_NOTHING;

    if (obj.lamplit) /* splash_lit(obj) */
        throw new Error('water_damage(): splash_lit() not ported yet');

    if (!ostr)
        ostr = cxname(obj);

    if (obj.otyp === CAN_OF_GREASE && obj.spe > 0) {
        return ER_NOTHING;
    } else if (obj.otyp === TOWEL && obj.spe < 7) {
        /* wet_a_towel(obj, -rnd(7 - obj->spe), TRUE) */
        throw new Error('water_damage(): wet_a_towel() not ported yet');
    } else if (obj.greased) {
        if (!rn2(2)) {
            obj.greased = 0;
            if (in_invent) {
                await pline_The(`grease on ${yname(obj)} washes off.`);
                described = true; /* used to modify potion feedback */
                /* update_inventory(): no perm_invent */
            }
            /* ungreased potions of acid will always be destroyed by water */
            if (obj.otyp === POT_ACID) {
                void described;
                throw new Error('water_damage(): pot_acid_damage() not ported yet');
            }
        }
        return ER_GREASED;
    } else if (Is_container(obj)
               && (!Waterproof_container(obj) || (obj.cursed && !rn2(3)))) {
        if (in_invent) {
            await pline(`Some ${hliquid("water")} gets into your ${ostr}!`);
            game.mentioned_water = !Hallucination();
        }
        await water_damage_chain(obj.cobj, false);
        return ER_DAMAGED; /* contents were damaged */
    } else if (Waterproof_container(obj)) {
        if (in_invent && !Blind() && !Underwater()) {
            await pline_The(`${hliquid("water")} cannot get into your ${ostr}.`);
            game.mentioned_water = !Hallucination();
            /* makeknown(obj->otyp): if an oilskin sack, discover it;
               doesn't matter for chest, large box, ice box */
            throw new Error('water_damage(): makeknown() of a waterproof container not ported yet');
        }
        /* not actually damaged, but because we /didn't/ get the "water
           gets into!" message, the player now has more information and
           thus we need to waste any potion they may have used (also,
           flavourwise the water is now on the floor) */
        return ER_DAMAGED;
    } else if (!force && (Luck() + 5) > rn2(20)) {
        /*  chance per item of sustaining damage:
            *   max luck:               10%
            *   avg luck (Luck==0):     75%
            *   awful luck (Luck<-4):  100%
            */
        return ER_NOTHING;
    } else if (obj.oclass === SCROLL_CLASS) {
        if (obj.otyp === SCR_BLANK_PAPER
            || obj.otyp === SCR_MAIL) /* MAIL_STRUCTURES */
            return 0;
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, "fade")}.`);

        obj.otyp = SCR_BLANK_PAPER;
        obj.dknown = 0;
        obj.spe = 0;
        /* if (in_invent) update_inventory(): no perm_invent */
        return ER_DAMAGED;
    } else if (obj.oclass === SPBOOK_CLASS) {
        const otyp = obj.otyp;

        if (otyp === SPE_BOOK_OF_THE_DEAD) {
            throw new Error('water_damage(): Book of the Dead not ported yet');
        } else if (otyp === SPE_BLANK_PAPER) {
            return 0;
        }
        if (in_invent)
            await Your(`${ostr} ${vtense(ostr, "fade")}.`);

        obj.otyp = SPE_BLANK_PAPER;
        /* same re-init as over-reading or polymorph; matters if it gets
           polymorphed into non-blank; doesn't matter if eventually written
           on since that replaces it with new book and studied count of 0 */
        if (obj.spestudied)
            obj.spestudied = rn2(obj.spestudied);
        obj.dknown = 0;
        /* blanking a novel is more involved than blanking a spellbook */
        if (otyp === SPE_NOVEL) /* old type */
            throw new Error('water_damage(): blank_novel() not ported yet');
        /* if (in_invent) update_inventory(): no perm_invent */
        return ER_DAMAGED;
    } else if (obj.oclass === POTION_CLASS) {
        if (obj.otyp === POT_ACID) {
            throw new Error('water_damage(): pot_acid_damage() not ported yet');
        } else if (obj.odiluted) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, "dilute")} further.`);

            obj.otyp = POT_WATER;
            obj.dknown = 0;
            obj.blessed = obj.cursed = 0;
            obj.odiluted = 0;
            /* if (in_invent) update_inventory(): no perm_invent */
            return ER_DAMAGED;
        } else if (obj.otyp !== POT_WATER) {
            if (in_invent)
                await Your(`${ostr} ${vtense(ostr, "dilute")}.`);

            obj.odiluted++;
            /* if (in_invent) update_inventory(): no perm_invent */
            return ER_DAMAGED;
        }
    } else {
        return await erode_obj(obj, ostr, ERODE_RUST, EF_NONE);
    }
    return ER_NOTHING;
}

// C ref: trap.c water_damage_chain()
/* "obj" is the first object of a chain: an array (the pile at a map spot,
   top first, standing in for ->nexthere, or a container's cobj[]), or the
   head of an ->nobj chain (inventory); here only picks the link in C */
export async function water_damage_chain(obj, here) {
    const is_arr = Array.isArray(obj);
    void here;
    if (!obj || (is_arr && !obj.length))
        return;

    /* initialize acid context: so far, neither seen (dknown) potions of
       acid nor unseen have exploded during this water damage sequence */
    game.acid_ctx = { dkn_boom: 0, unk_boom: 0, ctx_valid: true };
    /* we don't want to permanently overwrite bhitpos below, since we can get
       here from scenarios where it was in use up the call stack (e.g. thrown
       item hurtling the levitating hero into a wall of water) */
    if (!game.bhitpos)
        game.bhitpos = { x: 0, y: 0 };
    const save_bhitpos = { x: game.bhitpos.x, y: game.bhitpos.y };
    /* erode_obj() relies on bhitpos if target objects aren't carried by
       the hero or a monster, to check visibility controlling feedback */
    const loc = obj_location(is_arr ? obj[0] : obj);
    if (loc)
        game.bhitpos.x = loc.x, game.bhitpos.y = loc.y;

    if (is_arr) {
        for (const otmp of obj.slice())
            await water_damage(otmp, null, false);
    } else {
        let otmp;
        for (; obj; obj = otmp) {
            otmp = obj.nobj;
            await water_damage(obj, null, false);
        }
    }

    /* reset acid context and bhitpos */
    game.acid_ctx = { dkn_boom: 0, unk_boom: 0, ctx_valid: false };
    game.bhitpos.x = save_bhitpos.x, game.bhitpos.y = save_bhitpos.y;
}

/* C ref: mkobj.c get_obj_location(obj, &x, &y, CONTAINED_TOO) */
function obj_location(obj) {
    for (let o = obj; o; o = o.ocontainer) {
        switch (o.where) {
        case 'OBJ_INVENT':
            return { x: game.u.ux, y: game.u.uy };
        case 'OBJ_FLOOR':
            return { x: o.ox, y: o.oy };
        case 'OBJ_MINVENT':
            if (o.ocarry && o.ocarry.mx)
                return { x: o.ocarry.mx, y: o.ocarry.my };
            return null;
        case 'OBJ_CONTAINED':
            continue;
        default:
            return null;
        }
    }
    return null;
}

/* C ref: obj.h Waterproof_container(), Is_box() */
function Waterproof_container(o) {
    return o.otyp === OILSKIN_SACK || o.otyp === ICE_BOX
           || o.otyp === LARGE_BOX || o.otyp === CHEST;
}


// C ref: trap.c delfloortrap() -- Destroy a trap that emanates from the
// floor.
export async function delfloortrap(ttmp) {
    /* some of these are arbitrary -dlc */
    if (ttmp && ((ttmp.ttyp === SQKY_BOARD) || (ttmp.ttyp === BEAR_TRAP)
                 || (ttmp.ttyp === LANDMINE) || (ttmp.ttyp === FIRE_TRAP)
                 || is_pit(ttmp.ttyp)
                 || is_hole(ttmp.ttyp)
                 || (ttmp.ttyp === TELEP_TRAP) || (ttmp.ttyp === LEVEL_TELEP)
                 || (ttmp.ttyp === WEB) || (ttmp.ttyp === MAGIC_TRAP)
                 || (ttmp.ttyp === ANTI_MAGIC))) {
        let mtmp;

        if (game.u.ux === ttmp.tx && game.u.uy === ttmp.ty) {
            if (game.u.utraptype !== TT_BURIEDBALL)
                await reset_utrap(true);
        } else if ((mtmp = m_at(ttmp.tx, ttmp.ty)) != null) {
            mtmp.mtrapped = 0;
        }
        deltrap(ttmp);
        return true;
    }
    return false;
}


/* C ref: trap.h erode types, EF_* flags */
const ERODE_BURN = 0, ERODE_RUST = 1, ERODE_ROT = 2, ERODE_CORRODE = 3,
      ERODE_CRACK = 4;
const EF_NONE = 0, EF_GREASE = 0x01, EF_DESTROY = 0x02, EF_VERBOSE = 0x04,
      EF_PAY = 0x08;
const MAX_ERODE = 3;

// C ref: trap.c erode_obj() -- the rust case, as reached from water_damage()
/* returns ER_DAMAGED, ER_GREASED, ER_NOTHING or ER_DESTROYED */
export async function erode_obj(otmp, ostr, type, ef_flags) {
    const ER_NOTHING = 0, ER_GREASED = 1, ER_DAMAGED = 2, ER_DESTROYED = 3;
    const action = ["smoulder", "rust", "rot", "corrode", "crack"],
          msg = ["burnt", "rusted", "rotten", "corroded", "cracked"],
          bythe = ["heat", "oxidation", "decay", "corrosion", "impact"];
    let vulnerable = false, is_primary = true;
    let check_grease = (ef_flags & EF_GREASE) !== 0;
    const print = (ef_flags & EF_VERBOSE) !== 0;
    let crackers = false; /* True: different feedback if otmp destroyed */
    let cost_type;

    if (!otmp)
        return ER_NOTHING;

    const victim = (otmp.where === 'OBJ_INVENT') ? game.youmonst
                   : (otmp.where === 'OBJ_MINVENT') ? otmp.ocarry : null;
    const uvictim = (victim === game.youmonst);
    const vismon = !!victim && (victim !== game.youmonst) && canseemon(victim);
    /* Is gb.bhitpos correct here? Ugh. */
    const bhx = game.bhitpos?.x ?? 0, bhy = game.bhitpos?.y ?? 0;
    const visobj = (!victim && cansee(bhx, bhy)
                    && (!is_pool(bhx, bhy)
                        || (dist2(bhx, bhy, game.u.ux, game.u.uy) < 3 /* next2u() */
                            && !!game.u.uinwater /* Underwater */)));

    switch (type) {
    case ERODE_BURN:
        if (uvictim && inventory_resistance_check(AD_FIRE))
            return ER_NOTHING;
        vulnerable = is_flammable(otmp);
        check_grease = false;
        cost_type = COST_BURN;
        break;
    case ERODE_RUST:
        vulnerable = is_rustprone(otmp);
        cost_type = COST_RUST;
        break;
    case ERODE_ROT:
        vulnerable = is_rottable(otmp);
        check_grease = false;
        is_primary = false;
        cost_type = COST_ROT;
        break;
    case ERODE_CORRODE:
        if (uvictim && inventory_resistance_check(AD_ACID))
            return ER_NOTHING;
        vulnerable = is_corrodeable(otmp);
        is_primary = false;
        cost_type = COST_CORRODE;
        break;
    case ERODE_CRACK: /* crystal armor */
        vulnerable = is_crackable(otmp);
        is_primary = true;
        crackers = true;
        cost_type = COST_CRACK;
        break;
    default:
        impossible("Invalid erosion type in erode_obj");
        return ER_NOTHING;
    }
    const erosion = is_primary ? otmp.oeroded : otmp.oeroded2;

    if (!ostr)
        ostr = cxname(otmp);
    /* 'visobj' messages insert "the"; probably ought to switch to the() */
    if (visobj && !(uvictim || vismon) && ostr.toLowerCase().startsWith("the "))
        ostr = ostr.slice(4);

    if (check_grease && otmp.greased) {
        await grease_protect(otmp, ostr, victim);
        return ER_GREASED;
    } else if (!erosion_matters(otmp)) {
        return ER_NOTHING;
    } else if (!vulnerable || (otmp.oerodeproof && otmp.rknown)) {
        if (game.flags.verbose && print && (uvictim || vismon))
            await pline(`${uvictim ? "Your" : s_suffix(Monnam(victim))} ${ostr} ${
                vtense(ostr, "are")} not affected by ${bythe[type]}.`);
        return ER_NOTHING;
    } else if (otmp.oerodeproof || (otmp.blessed && !rnl(4))) {
        if (game.flags.verbose && (print || otmp.oerodeproof)
            && (uvictim || vismon || visobj)) {
            await pline(`Somehow, ${uvictim ? "your"
                                    : !vismon ? "the" /* visobj */
                                      : s_suffix(mon_nam(victim))} ${ostr} ${
                vtense(ostr, "are")} not affected by the ${bythe[type]}.`);
        }
        /* We assume here that if the object is protected because it
         * is blessed, it still shows some minor signs of wear, and
         * the hero can distinguish this from an object that is
         * actually proof against damage.
         */
        if (otmp.oerodeproof) {
            otmp.rknown = 1;
            /* update_inventory() */
        }
        return ER_NOTHING;
    } else if (erosion < MAX_ERODE) {
        const adverb = (erosion + 1 === MAX_ERODE) ? " completely"
                       : erosion ? " further" : "";

        if (uvictim || vismon || visobj) {
            await pline(`${uvictim ? "Your"
                           : !vismon ? "The" /* visobj */
                             : s_suffix(Monnam(victim))} ${ostr} ${
                vtense(ostr, action[type])}${adverb}!`);
        }

        if (ef_flags & EF_PAY)
            costly_alteration(otmp, cost_type);

        if (is_primary)
            otmp.oeroded++;
        else
            otmp.oeroded2++;

        /* if (victim == &gy.youmonst) update_inventory(): no perm_invent */
        return ER_DAMAGED;
    } else if (ef_flags & EF_DESTROY) {
        otmp.in_use = 1; /* in case of hangup during message w/ --More-- */
        if (uvictim || vismon || visobj) {
            let actbuf;

            if (!crackers)
                actbuf = `${vtense(ostr, action[type])} away`;
            else
                actbuf = "shatters";
            await pline(`${uvictim ? "Your"
                           : !vismon ? "The" /* visobj */
                             : s_suffix(Monnam(victim))} ${ostr} ${actbuf}!`);
        }
        if (ef_flags & EF_PAY)
            costly_alteration(otmp, cost_type);

        if (otmp.owornmask) {
            /* unwear otmp before deleting it */
            if (otmp.where === 'OBJ_INVENT') {
                /* otmp remains in hero's invent; if we get here because
                   it is being burned up by lava, we don't need to worry
                   about unwearing levitation boots and having that
                   trigger float_down to then fall in again; if such
                   were being worn, they wouldn't be in the lava now */
                await remove_worn_item(otmp, true); /* calls Cloak_off(),&c */
            } else if (otmp.where === 'OBJ_MINVENT') {
                /* results in otmp->where==OBJ_FREE; delobj() doesn't care */
                extract_from_minvent(otmp.ocarry, otmp, true, false);
            } else { /* worn but not in hero invent or monster minvent ? */
                impossible(`erode_obj(${type}): destroying strangely worn item`);
                otmp.owornmask = 0; /* otherwise a second complaint (about
                                     * deleting a worn item) will ensue */
            }
        }
        delobj(otmp);
        return ER_DESTROYED;
    } else {
        if (game.flags.verbose && print) {
            if (uvictim)
                await Your(`${ostr} ${vtense(ostr, Blind() ? "feel" : "look")
                           } completely ${msg[type]}.`);
            else if (vismon || visobj)
                await pline(`${!vismon ? "The" : s_suffix(Monnam(victim))} ${
                    ostr} ${vtense(ostr, "look")} completely ${msg[type]}.`);
        }
        return ER_NOTHING;
    }
}

// C ref: trap.c grease_protect()
/* Protect an item from erosion with grease. Returns TRUE if the grease
 * wears off.
 */
export async function grease_protect(otmp, ostr, victim) {
    const txt = "protected by the layer of grease!";
    const vismon = !!victim && (victim !== game.youmonst) && canseemon(victim);

    if (ostr) {
        if (victim === game.youmonst)
            await Your(`${ostr} ${vtense(ostr, "are")} ${txt}`);
        else if (vismon)
            await pline(`${Monnam(victim)}'s ${ostr} ${vtense(ostr, "are")} ${txt}`);
    } else if (victim === game.youmonst || vismon) {
        await pline(`${Yobjnam2(otmp, "are")} ${txt}`);
    }
    if (!rn2(2)) {
        otmp.greased = 0;
        if (otmp.where === 'OBJ_INVENT') {
            await pline_The("grease dissolves.");
            /* update_inventory(): no perm_invent */
        }
        return true;
    }
    return false;
}

// C ref: trap.c trapeffect_rust_trap()
async function trapeffect_rust_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        seetrap(trap);

        /* Unlike monsters, traps cannot aim their rust attacks at
         * you, so instead of looping through and taking either the
         * first rustable one or the body, we take whatever we get,
         * even if it is not rustable.
         */
        switch (rn2(5)) {
        case 0:
            await pline(`${A_gush_of_water_hits} you on the ${body_part(HEAD)}!`);
            await water_damage(game.uarmh, game.uarmh ? helm_simple_name(game.uarmh) : null, true);
            break;
        case 1:
            await pline(`${A_gush_of_water_hits} your left ${body_part(ARM)}!`);
            if (await water_damage(game.uarms, "shield", true) !== 0 /* ER_NOTHING */)
                break;
            if (u.twoweap || (game.uwep && bimanual(game.uwep)))
                await water_damage(u.twoweap ? game.uswapwep : game.uwep, null, true);
            /* uglovecheck: */
            await water_damage(game.uarmg, gloves_simple_name(game.uarmg), true);
            break;
        case 2:
            await pline(`${A_gush_of_water_hits} your right ${body_part(ARM)}!`);
            await water_damage(game.uwep, null, true);
            /* goto uglovecheck */
            await water_damage(game.uarmg, gloves_simple_name(game.uarmg), true);
            break;
        default:
            await pline(`${A_gush_of_water_hits} you!`);
            /* note: exclude primary and secondary weapons from splashing
               because cases 1 and 2 target them [via water_damage()] */
            for (let otmp = game.invent, nextobj; otmp; otmp = nextobj) {
                nextobj = otmp.nobj;
                if (otmp.lamplit && otmp !== game.uwep
                    && (otmp !== game.uswapwep || !u.twoweap))
                    throw new Error('trapeffect_rust_trap(): splash_lit() not ported yet');
            }
            if (game.uarmc)
                await water_damage(game.uarmc, cloak_simple_name(game.uarmc), true);
            else if (game.uarm)
                await water_damage(game.uarm, suit_simple_name(game.uarm), true);
            else if (game.uarmu)
                await water_damage(game.uarmu, "shirt", true);
        }
        /* update_inventory(): no perm_invent window */

        if (u.umonnum === PM_IRON_GOLEM) {
            const dam = u.mhmax;

            await You("are covered with rust!");
            await losehp(Maybe_Half_Phys(dam), "rusting away", KILLED_BY);
        } else if (u.umonnum === PM_GREMLIN && rn2(3)) {
            await split_mon(game.youmonst, null);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;
        const mptr = mtmp.data;
        let target;

        if (in_sight)
            seetrap(trap);
        switch (rn2(5)) {
        case 0:
            if (in_sight)
                await pline_mon(mtmp, `${A_gush_of_water_hits} ${mon_nam(mtmp)} on the ${
                    mbodypart_tr(mtmp, HEAD)}!`);
            target = which_armor(mtmp, W_ARMH);
            await water_damage(target, helm_simple_name(target), true);
            break;
        case 1:
            if (in_sight)
                await pline_mon(mtmp, `${A_gush_of_water_hits} ${mon_nam(mtmp)}'s left ${
                    mbodypart_tr(mtmp, ARM)}!`);
            target = which_armor(mtmp, W_ARMS);
            if (await water_damage(target, "shield", true) !== 0 /* ER_NOTHING */)
                break;
            target = mtmp.mw; /* MON_WEP(mtmp) */
            if (target && bimanual(target))
                await water_damage(target, null, true);
            /* mglovecheck: */
            target = which_armor(mtmp, W_ARMG);
            await water_damage(target, gloves_simple_name(target), true);
            break;
        case 2:
            if (in_sight)
                await pline_mon(mtmp, `${A_gush_of_water_hits} ${mon_nam(mtmp)}'s right ${
                    mbodypart_tr(mtmp, ARM)}!`);
            await water_damage(mtmp.mw, null, true);
            /* goto mglovecheck */
            target = which_armor(mtmp, W_ARMG);
            await water_damage(target, gloves_simple_name(target), true);
            break;
        default:
            if (in_sight)
                await pline(`${A_gush_of_water_hits} ${mon_nam(mtmp)}!`);
            for (const otmp of mtmp.minvent || [])
                if (otmp.lamplit
                    /* exclude weapon(s) because cases 1 and 2 do them */
                    && (otmp.owornmask & (W_WEP | W_SWAPWEP)) === 0)
                    throw new Error('trapeffect_rust_trap(): splash_lit() not ported yet');
            if ((target = which_armor(mtmp, W_ARMC)) != null)
                await water_damage(target, cloak_simple_name(target), true);
            else if ((target = which_armor(mtmp, W_ARM)) != null)
                await water_damage(target, suit_simple_name(target), true);
            else if ((target = which_armor(mtmp, W_ARMU)) != null)
                await water_damage(target, "shirt", true);
        }

        if (mptr === mons[PM_IRON_GOLEM]) { /* completelyrusts(mptr) */
            if (in_sight)
                await pline_mon(mtmp, `${Monnam(mtmp)} ${!mlifesaver(mtmp) ? "falls"
                                               : "starts to fall"} to pieces!`);
            await monkilled(mtmp, null, AD_RUST);
            if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
                trapkilled = true;
        } else if (mptr === mons[PM_GREMLIN] && rn2(3)) {
            await split_mon(mtmp, null);
        }

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c burnarmor()
/* called when you're hit by fire (dofiretrap,buzz,zapyourself,explode);
   returns TRUE if hit on torso */
export async function burnarmor(victim) {
    let item;
    let buf;
    let mat_idx, oldspe;

    if (!victim)
        return 0;
    const hitting_u = (victim === game.youmonst);

    /* burning damage may dry wet towel */
    item = hitting_u ? carrying_tr(TOWEL) : m_carrying_tr(victim, TOWEL);
    while (item) {
        if (item.otyp === TOWEL && item.spe > 0) { /* is_wet_towel(item) */
            oldspe = item.spe;
            const amt = rn2(oldspe + 1);
            void amt;
            throw new Error('burnarmor(): dry_a_towel() not ported yet');
        }
        item = next_obj_tr(victim, hitting_u, item); /* item = item->nobj */
    }

    /* #define burn_dmg(obj, descr) erode_obj(obj, descr, ERODE_BURN, EF_GREASE) */
    const burn_dmg = async (obj, descr) =>
        erode_obj(obj, descr, ERODE_BURN, EF_GREASE);
    while (true) {
        switch (rn2(5)) {
        case 0:
            item = hitting_u ? game.uarmh : which_armor(victim, W_ARMH);
            if (item) {
                mat_idx = objects[item.otyp].oc_material;
                buf = `${materialnm_tr[mat_idx]} ${helm_simple_name_tr(item)}`;
            }
            if (!await burn_dmg(item, item ? buf : "helmet"))
                continue;
            break;
        case 1:
            item = hitting_u ? game.uarmc : which_armor(victim, W_ARMC);
            if (item) {
                await burn_dmg(item, cloak_simple_name(item));
                return true;
            }
            item = hitting_u ? game.uarm : which_armor(victim, W_ARM);
            if (item) {
                await burn_dmg(item, xname(item));
                return true;
            }
            item = hitting_u ? game.uarmu : which_armor(victim, W_ARMU);
            if (item)
                await burn_dmg(item, "shirt");
            return true;
        case 2:
            item = hitting_u ? game.uarms : which_armor(victim, W_ARMS);
            if (!await burn_dmg(item, "wooden shield"))
                continue;
            break;
        case 3:
            item = hitting_u ? game.uarmg : which_armor(victim, W_ARMG);
            if (!await burn_dmg(item, "gloves"))
                continue;
            break;
        case 4:
            item = hitting_u ? game.uarmf : which_armor(victim, W_ARMF);
            if (!await burn_dmg(item, "boots"))
                continue;
            break;
        }
        break; /* Out of while loop */
    }

    return false;
}

/* C ref: decl.c materialnm[] */
const materialnm_tr = [ "mysterious", "liquid", "wax", "organic", "flesh",
    "paper", "cloth", "leather", "wooden", "bone", "dragonhide",
    "iron", "metal", "copper", "silver", "gold", "platinum",
    "mithril", "plastic", "glass", "gemstone", "stone" ];
/* burnarmor()'s 'item = item->nobj': the next object in the hero's or
   monster's inventory chain (monster minvent arrays are kept newest last) */
function next_obj_tr(victim, hitting_u, item) {
    if (hitting_u)
        return item.nobj || null;
    const chain = (victim.minvent || []).slice().reverse();
    const i = chain.indexOf(item);
    return (i >= 0 && i + 1 < chain.length) ? chain[i + 1] : null;
}

// C ref: trap.c acid_damage()
export async function acid_damage(obj) {
    /* Scrolls but not spellbooks can be erased by acid. */
    if (!obj)
        return;

    const victim = (obj.where === 'OBJ_INVENT') ? game.youmonst /* carried() */
                   : (obj.where === 'OBJ_MINVENT') ? obj.ocarry : null;
    const vismon = !!victim && (victim !== game.youmonst) && canseemon(victim);

    if (victim === game.youmonst && inventory_resistance_check(AD_ACID))
        return;

    if (obj.greased) {
        await grease_protect(obj, null, victim);
    } else if (obj.oclass === SCROLL_CLASS && obj.otyp !== SCR_BLANK_PAPER) {
        if (obj.otyp !== SCR_BLANK_PAPER && obj.otyp !== SCR_MAIL) {
            if (!Blind()) {
                if (victim === game.youmonst)
                    await Your(`${aobjnam_tr(obj, "fade")}.`);
                else if (vismon)
                    await pline(`${s_suffix(Monnam(victim))} ${aobjnam_tr(obj, "fade")}.`);
            }
        }
        obj.otyp = SCR_BLANK_PAPER;
        obj.spe = 0;
        obj.dknown = 0;
    } else
        await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
}

// C ref: trap.c ignite_items()
/* Ignite ignitable items (limited to light sources) in the given object
   chain, due to some external source of fire.  The object chain should
   be somewhere exposed, like someone's open inventory or the floor.
   (Hero inventory is an nobj chain, a monster's minvent an array kept
   newest last.) */
export async function ignite_items(objchn) {
    const list = [];
    if (Array.isArray(objchn))
        list.push(...objchn.slice().reverse());
    else
        for (let o = objchn; o; o = o.nobj)
            list.push(o);
    for (const obj of list) {
        /* ignitable items like lamps and candles will catch fire */
        if (!obj.lamplit && !obj.in_use)
            await catch_lit(obj);
    }
}

// C ref: apply.c catch_lit()
/* Called when potentially lightable object is affected by fire_damage().
   Return TRUE if object becomes lit and FALSE otherwise --ALI */
export async function catch_lit(obj) {
    const ignitable = (obj.otyp === BRASS_LANTERN_TR || obj.otyp === OIL_LAMP_TR
        || (obj.otyp === MAGIC_LAMP_TR && obj.spe > 0)
        || obj.otyp === CANDELABRUM_OF_INVOCATION_TR
        || obj.otyp === TALLOW_CANDLE_TR || obj.otyp === WAX_CANDLE_TR
        || obj.otyp === POT_OIL_TR);
    const age_is_relative = (obj.otyp === BRASS_LANTERN_TR
        || obj.otyp === OIL_LAMP_TR || obj.otyp === CANDELABRUM_OF_INVOCATION_TR
        || obj.otyp === TALLOW_CANDLE_TR || obj.otyp === WAX_CANDLE_TR
        || obj.otyp === POT_OIL_TR);

    let loc;
    if (!obj.lamplit && ignitable && (loc = get_obj_location(obj, 0)) !== null) {
        if (((obj.otyp === MAGIC_LAMP_TR /* spe==0 => no djinni inside */
              /* spe==0 => no candles attached */
              || obj.otyp === CANDELABRUM_OF_INVOCATION_TR) && obj.spe === 0)
            /* age_is_relative && age==0 && still-exists means out of fuel */
            || (age_is_relative && obj.age === 0)
            /* lantern is classified as ignitable() but not by fire */
            || obj.otyp === BRASS_LANTERN_TR)
            return false;
        if (obj.otyp === CANDELABRUM_OF_INVOCATION_TR && obj.cursed)
            return false;
        if ((obj.otyp === OIL_LAMP_TR || obj.otyp === MAGIC_LAMP_TR)
            /* once lit, cursed lamp is as good as non-cursed one, so failure
               to light is a minor inconvenience to make cursed be worse */
            && obj.cursed && !rn2(2))
            return false;

        const [x, y] = loc;
        if (obj.where === 'OBJ_INVENT' || cansee(x, y)) {
            if (obj.where === 'OBJ_FLOOR' && cansee(x, y))
                set_msg_xy(x, y);
            await pline(`${Yname2_fd(obj)} ${
                /* "catches light!" or "feels warm." */
                otense_fd(obj, Blind() ? "feel" : "catch")} ${
                Blind() ? "warm." : "light!"}`);
        }
        if (obj.otyp === POT_OIL_TR)
            discover_object(obj.otyp, true, true, true); /* makeknown() */
        if (obj.where === 'OBJ_INVENT' /* carried(obj) */ && obj.unpaid
            && costly_spot(game.u.ux, game.u.uy))
            throw new Error('catch_lit(): bill_dummy_object() not ported yet');
        begin_burn(obj, false);
        return true;
    }
    return false;
}

// C ref: trap.c trapeffect_fire_trap()
async function trapeffect_fire_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        await dofiretrap(null);
    } else {
        const tx = trap.tx, ty = trap.ty;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(tx, ty);
        let trapkilled = false;
        const mptr = mtmp.data;
        const orig_dmg = d(2, 4);

        if (in_sight)
            await pline_mon(mtmp, `A ${tower_of_flame} erupts from the ${
                surface_tr(mtmp.mx, mtmp.my)} under ${mon_nam(mtmp)}!`);
        else if (see_it) { /* evidently `mtmp' is invisible */
            set_msg_xy(mtmp.mx, mtmp.my);
            await You_see_l(`a ${tower_of_flame} erupt from the ${
                surface_tr(mtmp.mx, mtmp.my)}!`);
        }
        if (resists_fire(mtmp)) {
            if (in_sight) {
                await shieldeff(mtmp.mx, mtmp.my);
                await pline(`${Monnam(mtmp)} is uninjured.`);
            }
        } else {
            let num = orig_dmg, alt;
            let immolate = false;

            /* paper burns very fast, assume straw is tightly packed
               and burns a bit slower
               (note: this is inconsistent with mattackm()'s AD_FIRE
               damage where completelyburns() includes straw golem) */
            switch (mptr) {
            case mons[PM_PAPER_GOLEM]:
                immolate = true;
                alt = mtmp.mhpmax;
                break;
            case mons[PM_STRAW_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 2);
                break;
            case mons[PM_WOOD_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 4);
                break;
            case mons[PM_LEATHER_GOLEM]:
                alt = Math.trunc(mtmp.mhpmax / 8);
                break;
            default:
                alt = 0;
                break;
            }
            if (alt > num)
                num = alt;

            if (await thitm(0, mtmp, null, num, immolate))
                trapkilled = true;
            else {
                mtmp.mhpmax -= rn2(num + 1);
                if (mtmp.mhp > mtmp.mhpmax)
                    mtmp.mhp = mtmp.mhpmax;
            }
        }
        if (await burnarmor(mtmp) || rn2(3)) {
            const xtradmg = await destroy_items_tr(mtmp, AD_FIRE_TR, orig_dmg);
            await ignite_items(mtmp.minvent);
            if (!(mtmp.mhp < 1)) { /* !DEADMONSTER(mtmp) */
                mtmp.mhp -= xtradmg;
                if (mtmp.mhp < 1) { /* NOW it's dead */
                    await monkilled(mtmp, "", AD_FIRE_TR);
                    trapkilled = true;
                }
            }
        }
        if (await burn_floor_objects_tr(tx, ty, see_it, false)
            && !see_it && dist2(tx, ty, game.u.ux, game.u.uy) <= 3 * 3)
            await You("smell smoke.");
        if (is_ice_tr(tx, ty))
            await melt_ice_tr(tx, ty, null);
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            trapkilled = true;
        if (see_it && t_at(tx, ty))
            seetrap(t_at(tx, ty));

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}


// C ref: trap.c dofiretrap()
async function dofiretrap(
    box) { /* null for floor trap */
    const u = game.u;
    const see_it = !Blind();
    let orig_dmg, num, alt;
    orig_dmg = num = d(2, 4);

    /* Bug: for box case, the equivalent of burn_floor_objects() ought
     * to be done upon its contents.
     */

    if ((box && box.where !== 'OBJ_INVENT' /* !carried(box) */)
        ? is_pool(box.ox, box.oy) : Underwater()) {
        await pline(`A cascade of steamy bubbles erupts from ${
            the(box ? xname(box) : surface_tr(u.ux, u.uy))}!`);
        if (Fire_resistance())
            await You("are uninjured.");
        else
            await losehp(rnd(3), "boiling water", KILLED_BY);
        return;
    }
    await pline(`A ${tower_of_flame} ${box ? "bursts" : "erupts"} from ${
        the(box ? xname(box) : surface_tr(u.ux, u.uy))}!`);
    if (Fire_resistance()) {
        await shieldeff(game.u.ux, game.u.uy);
        monstseesu_tr(M_SEEN_FIRE_TR);
        num = rn2(2);
    } else if (Upolyd()) {
        switch (u.umonnum) {
        case PM_PAPER_GOLEM:
            alt = u.mhmax;
            break;
        case PM_STRAW_GOLEM:
            alt = Math.trunc(u.mhmax / 2);
            break;
        case PM_WOOD_GOLEM:
            alt = Math.trunc(u.mhmax / 4);
            break;
        case PM_LEATHER_GOLEM:
            alt = Math.trunc(u.mhmax / 8);
            break;
        default:
            alt = 0;
            break;
        }
        if (alt > num)
            num = alt;
        if (u.mhmax > mons[u.umonnum].mlevel)
            u.mhmax -= rn2(Math.min(u.mhmax, num + 1)), game.disp_botl = true;
        if (u.mh > u.mhmax)
            u.mh = u.mhmax, game.disp_botl = true;
        monstunseesu_tr(M_SEEN_FIRE_TR);
    } else {
        const uhpmin = minuhpmax_tr(1), olduhpmax = u.uhpmax;

        num = d(2, 4);
        if (u.uhpmax > uhpmin) {
            u.uhpmax -= rn2(Math.min(u.uhpmax, num + 1)), game.disp_botl = true;
        } /* note: no 'else' here */
        if (u.uhpmax < uhpmin) {
            setuhpmax_tr(Math.min(olduhpmax, uhpmin), false); /* sets disp.botl */
            if (!Drain_resistance_tr())
                await losexp_tr(null); /* never fatal when 'drainer' is Null */
        }
        if (u.uhp > u.uhpmax)
            u.uhp = u.uhpmax, game.disp_botl = true;
        monstunseesu_tr(M_SEEN_FIRE_TR);
    }
    if (!num)
        await You("are uninjured.");
    else
        await losehp(num, tower_of_flame, KILLED_BY_AN); /* fire damage */
    await burn_away_slime_tr();

    if (await burnarmor(game.youmonst) || rn2(3)) {
        await destroy_items_tr(game.youmonst, AD_FIRE_TR, orig_dmg);
        await ignite_items(game.invent);
    }
    if (!box && await burn_floor_objects_tr(u.ux, u.uy, see_it, true) && !see_it)
        await You("smell paper burning.");
    if (is_ice_tr(u.ux, u.uy))
        await melt_ice_tr(u.ux, u.uy, null);
}

// C ref: trap.c instapetrify()
/* Combine cockatrice checks into single functions to avoid repeating code. */
export async function instapetrify(str) {
    if (Stone_resistance())
        return;
    if (poly_when_stoned(game.youmonst.data) && await polymon(PM_STONE_GOLEM))
        return;
    await urgent_pline("You turn to stone...");
    killer().format = KILLED_BY;
    if (str !== killer().name)
        killer().name = str ? str : "";
    await done(STONING);
}

// C ref: trap.c minstapetrify()
export async function minstapetrify(mon, byplayer) {
    if (resists_ston(mon))
        return;
    if (poly_when_stoned(mon.data)) {
        await mon_to_stone(mon);
        return;
    }
    if (!(await vamp_stone(mon)))
        return;

    /* give a "<mon> is slowing down" message and also remove
       intrinsic speed (comparable to similar effect on the hero) */
    await mon_adjust_speed(mon, -3, null);

    if (cansee(mon.mx, mon.my))
        await pline_mon(mon, `${Monnam(mon)} turns to stone.`);
    if (byplayer) {
        game.stoned = true;
        await xkilled(mon, XKILL_NOMSG);
    } else
        await monstone(mon);
}

// C ref: trap.c selftouch()
export async function selftouch(arg) {
    const g = game;
    let kbuf;
    let corpse_pmname;

    if (g.uwep && g.uwep.otyp === CORPSE
        && touch_petrifies(mons[g.uwep.corpsenm])
        && !Stone_resistance()) {
        corpse_pmname = obj_pmname(g.uwep);
        await pline(`${arg} touch the ${corpse_pmname} corpse.`);
        kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse if we can't handle it */
        if (!g.uarmg && !Stone_resistance())
            uwepgone();
    }
    /* Or your secondary weapon, if wielded [hypothetical; we don't
       allow two-weapon combat when either weapon is a corpse] */
    if (g.u.twoweap && g.uswapwep && g.uswapwep.otyp === CORPSE
        && touch_petrifies(mons[g.uswapwep.corpsenm])
        && !Stone_resistance()) {
        corpse_pmname = obj_pmname(g.uswapwep);
        await pline(`${arg} touch the ${corpse_pmname} corpse.`);
        kbuf = `${an(corpse_pmname)} corpse`;
        await instapetrify(kbuf);
        /* life-saved; unwield the corpse */
        if (!g.uarmg && !Stone_resistance())
            uswapwepgone();
    }
}

// C ref: trap.c mselftouch()
export async function mselftouch(mon, arg, byplayer) {
    const mwep = mon.mw; /* MON_WEP(mon) */

    if (mwep && mwep.otyp === CORPSE
        && (mwep.corpsenm === PM_COCKATRICE || mwep.corpsenm === PM_CHICKATRICE)
        && !resists_ston(mon)) {
        if (cansee(mon.mx, mon.my)) {
            await pline_mon(mon, `${arg ? arg : ""}${arg ? mon_nam(mon) : Monnam(mon)} touches ${
                corpse_xname(mwep, null, CXN_PFX_THE)}.`);
        }
        await minstapetrify(mon, byplayer);
        /* if life-saved, might not be able to continue wielding */
        if (!(mon.mhp < 1) /* !DEADMONSTER(mon) */
            && !which_armor(mon, W_ARMG) && !resists_ston(mon))
            mwepgone(mon);
    }
}

// C ref: trap.c trapeffect_pit()
async function trapeffect_pit(mtmp, trap, trflags) {
    const ttype = trap.ttyp;
    /* relevant_spikes is initially always true for spiked pits, but
       set to false if the spikes are found to not be relevant */
    let relevant_spikes = ttype === SPIKED_PIT;

    if (mtmp === game.youmonst) {
        const u = game.u;
        const Sokoban = game.level.flags.sokoban_rules;
        const plunged = (trflags & TOOKPLUNGE) !== 0;
        const viasitting = (trflags & VIASITTING) !== 0;
        const conj_pit = conjoined_pits(trap, t_at(u.ux0, u.uy0), true);
        const adj_pit = adj_nonconjoined_pit(trap);
        const already_known = trap.tseen ? true : false;
        const madeby_u = trap.madeby_u ? 1 : 0;
        const A_Your = ["A", "Your"];
        let deliberate = false;
        let steed_article = ARTICLE_THE_TR;

        /* suppress article in various steed messages when using its
           name (which won't occur when hallucinating) */
        if (u.usteed && has_mgivenname_tr(u.usteed) && !Hallucination())
            steed_article = ARTICLE_NONE_TR;

        /* KMH -- You can't escape the Sokoban level traps */
        if (!Sokoban && (Levitation() || (Flying() && !plunged && !viasitting)))
            return Trap_Effect_Finished;
        feeltrap(trap);
        if (!Sokoban && is_clinger(game.youmonst.data) && !plunged) {
            if (already_known) {
                await You_see_l(`${a_your[madeby_u]} ${
                    ttype === SPIKED_PIT ? "spiked " : ""}pit below you.`);
            } else {
                await pline(`${A_Your[madeby_u]} pit ${
                    ttype === SPIKED_PIT ? "full of spikes " : ""}opens up under you!`);
                await You("don't fall in!");
            }
            return Trap_Effect_Finished;
        }
        if (!Sokoban) {
            let verbbuf = '';

            if (u.usteed) {
                if ((trflags & RECURSIVETRAP) !== 0)
                    verbbuf = `and ${x_monnam_tr(u.usteed, steed_article, null,
                                                 SUPPRESS_SADDLE_TR, false)} fall`;
                else
                    verbbuf = `lead ${x_monnam_tr(u.usteed, steed_article, "poor",
                                                  SUPPRESS_SADDLE_TR, false)}`;
            } else if (game.iflags.menu_requested && already_known) {
                await You(`carefully ${u_locomotion("lower yourself")} into the pit.`);
                deliberate = true;
            } else if (conj_pit) {
                await You("move into an adjacent pit.");
            } else if (adj_pit) {
                await You(`stumble over debris${
                    !rn2(5) ? " between the pits" : ""}.`);
            } else {
                verbbuf = !plunged ? "fall" : (Flying() ? "dive" : "plunge");
            }
            if (verbbuf)
                await You(`${verbbuf} into ${a_your[madeby_u]} pit!`);
        }
        /* wumpus reference */
        if (game.urole.mnum === PM_RANGER_TR && !trap.madeby_u && !trap.once
            && In_quest(u.uz) && on_level_tr(u.uz, game.dungeon_topology.d_qlocate_level)) {
            await pline("Fortunately it has a bottom after all...");
            trap.once = 1;
        } else if (u.umonnum === PM_PIT_VIPER || u.umonnum === PM_PIT_FIEND) {
            await pline("How pitiful.  Isn't that the pits?");
        }
        if (relevant_spikes && wearing_iron_shoes(mtmp)) {
            await pline(`${Yname2_fd(game.uarmf)} protects you from the sharp iron spikes.`);
            relevant_spikes = false;
        } else if (relevant_spikes) {
            const predicament = "on a set of sharp iron spikes";

            if (u.usteed) {
                await pline(`${upstart(x_monnam_tr(u.usteed, steed_article, "poor",
                                                      SUPPRESS_SADDLE_TR, false))} ${
                    conj_pit ? "steps" : "lands"} ${predicament}!`);
            } else
                await You(`${conj_pit ? "step" : "land"} ${predicament}!`);
        }
        /* FIXME:
         * if hero gets killed here, setting u.utrap in advance will
         * show "you were trapped in a pit" during disclosure's display
         * of enlightenment, but hero is dying *before* becoming trapped.
         */
        set_utrap(rn1(6, 2), TT_PIT);
        if (!await steedintrap(trap, null)) {
            if (relevant_spikes) {
                const oldumort = u.umortality;

                await losehp(Maybe_Half_Phys(rnd(conj_pit ? 4 : adj_pit ? 6 : 10)),
                       /* note: these don't need locomotion() handling;
                          if fatal while poly'd and Unchanging, the
                          death reason will be overridden with
                          "killed while stuck in creature form" */
                       plunged
                       ? "deliberately plunged into a pit of iron spikes"
                       : (conj_pit || deliberate)
                         ? "stepped into a pit of iron spikes"
                         : adj_pit
                           ? "stumbled into a pit of iron spikes"
                           : "fell into a pit of iron spikes",
                       NO_KILLER_PREFIX_TR);
                if (!rn2(6))
                    await poisoned("spikes", A_STR,
                             (conj_pit || adj_pit || deliberate)
                             ? "stepping on poison spikes"
                             : "fall onto poison spikes",
                             /* if damage triggered life-saving,
                                poison is limited to attrib loss */
                             (u.umortality > oldumort) ? 0 : 8, false);
            } else {
                /* plunging flyers take spike damage but not pit damage */
                if (!conj_pit && !deliberate
                    && !(plunged && (Flying() || is_clinger(game.youmonst.data))))
                    await losehp(Maybe_Half_Phys(rnd(adj_pit ? 3 : 6)),
                           plunged ? "deliberately plunged into a pit"
                           : "fell into a pit",
                           NO_KILLER_PREFIX_TR);
            }
            if (game.uball /* Punished */ && game.uball.where !== 'OBJ_INVENT') {
                unplacebc_tr();
                await ballfall_tr();
                await placebc_tr();
            }
            if (!conj_pit)
                await selftouch("Falling, you");
            game.vision_full_recalc = 1; /* vision limits change */
            await exercise(A_STR, false);
            await exercise(A_DEX, false);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        let trapkilled = false;
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const Sokoban = game.level.flags.sokoban_rules;
        const inescapable = (forcetrap || (Sokoban && !trap.madeby_u));
        const mptr = mtmp.data;
        let fallverb;

        fallverb = "falls";
        if (!grounded(mptr) || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
            if (forcetrap && !Sokoban) {
                /* openfallingtrap; not inescapable here */
                if (in_sight) {
                    seetrap(trap);
                    await pline_mon(mtmp, `${Monnam(mtmp)} doesn't fall into the pit.`);
                }
                return Trap_Effect_Finished;
            }
            if (!inescapable)
                return Trap_Effect_Finished; /* avoids trap */
            fallverb = "is dragged"; /* sokoban pit */
        }
        if (!passes_walls(mptr))
            mtmp.mtrapped = 1;
        if (in_sight) {
            await pline_mon(mtmp, `${Monnam(mtmp)} ${fallverb} into ${
                a_your[trap.madeby_u ? 1 : 0]} pit!`);
            if (mptr === mons[PM_PIT_VIPER]
                || mptr === mons[PM_PIT_FIEND])
                await pline("How pitiful.  Isn't that the pits?");
            seetrap(trap);
        }
        await mselftouch(mtmp, "Falling, ", false);
        if (wearing_iron_shoes(mtmp)) relevant_spikes = false;
        if (mtmp.mhp < 1 /* DEADMONSTER(mtmp) */
            || await thitm(0, mtmp, null, rnd(relevant_spikes ? 10 : 6), false))
            trapkilled = true;

        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_hole()
async function trapeffect_hole(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        if (!Can_fall_thru(game.u.uz)) {
            seetrap(trap); /* normally done in fall_through */
            /* impossible("dotrap: %ss cannot exist on this level.") */
            return Trap_Effect_Finished; /* don't activate it after all */
        }
        await fall_through(true, (trflags & TOOKPLUNGE));
    } else {
        const tt = trap.ttyp;
        const mptr = mtmp.data;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const Sokoban = game.level.flags.sokoban_rules;
        const inescapable = (forcetrap || (Sokoban && !trap.madeby_u));

        if (!Can_fall_thru(game.u.uz)) {
            /* impossible("mintrap: %ss cannot exist on this level.") */
            return Trap_Effect_Finished; /* don't activate it after all */
        }
        if (!grounded(mptr) || (mtmp.wormno && count_wsegs(mtmp) > 5)
            || mptr.msize >= MZ_HUGE) {
            if (forcetrap && !Sokoban) {
                /* openfallingtrap; not inescapable here */
                if (in_sight) {
                    seetrap(trap);
                    if (tt === TRAPDOOR)
                        await pline_mon(mtmp, `A trap door opens, but ${mon_nam(mtmp)} doesn't fall through.`);
                    else /* (tt == HOLE) */
                        await pline_mon(mtmp, `${Monnam(mtmp)} doesn't fall through the hole.`);
                }
                return Trap_Effect_Finished; /* inescapable = FALSE; */
            }
            if (inescapable) { /* sokoban hole */
                if (in_sight) {
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems to be yanked down!`);
                    seetrap(trap);
                }
            } else
                return Trap_Effect_Finished;
        }
        return trapeffect_level_telep(mtmp, trap, trflags);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c fall_through()
export async function fall_through(
    td, /* td == TRUE : trap door or hole */
    ftflags) {
    const u = game.u;
    const Sokoban = game.level.flags.sokoban_rules;
    const dtmp = { dnum: 0, dlevel: 0 };
    let msgbuf = '';
    let dont_fall = null;
    let newlevel;
    let t = null;
    let controlled_flight = false;

    /* we'll fall even while levitating in Sokoban; otherwise, if we
       won't fall and won't be told that we aren't falling, give up now */
    if (Blind() && Levitation() && !Sokoban)
        return;

    newlevel = dunlev(u.uz); /* current level */
    newlevel++;

    if (td) {
        t = t_at(u.ux, u.uy);
        feeltrap(t);
        if (!Sokoban && !(ftflags & TOOKPLUNGE)) {
            if (t.ttyp === TRAPDOOR)
                await pline("A trap door opens up under you!");
            else
                await pline("There's a gaping hole under you!");
        }
    } else
        await pline_The(`${surface_tr(u.ux, u.uy)} opens up under you!`);

    const lev = game.level.at(u.ux, u.uy);
    if (Sokoban && Can_fall_thru(u.uz)) {
        ; /* KMH -- You can't escape the Sokoban level traps */
    } else if (Levitation() || u.ustuck
               /* levl[u.ux][u.uy].candig (rm.h: #define arboreal_sdoor candig) */
               || (!Can_fall_thru(u.uz) && !(lev.candig || lev.arboreal_sdoor))
               || ((Flying() || is_clinger(game.youmonst.data)
                    || (ceiling_hider(game.youmonst.data) && u.uundetected))
                   && !(ftflags & TOOKPLUNGE))) {
        dont_fall = "don't fall in.";
    } else if (game.youmonst.data.msize >= MZ_HUGE) {
        dont_fall = "don't fit through.";
    } else if (!(await next_to_u())) {
        dont_fall = "are jerked back by your pet!";
    }
    if (dont_fall) {
        await You(dont_fall); /* You1() */
        /* hero didn't fall through, but any objects here might */
        await impact_drop(null, u.ux, u.uy, 0);
        if (!td) {
            await tty_display_nhwindow(game.WIN_MESSAGE, false);
            await pline_The("opening under you closes up.");
        }
        return;
    }
    if ((Flying() || is_clinger(game.youmonst.data))
        && (ftflags & TOOKPLUNGE) && td && t) {
        if (Flying())
            controlled_flight = true;
        await You(`${Flying() ? "swoop" : "deliberately drop"} down ${
            (t.ttyp === TRAPDOOR) ? "through the trap door"
                                  : "into the gaping hole"}!`);
    }

    if (u.ushops && u.ushops.length) /* *u.ushops */
        throw new Error('fall_through(): shopdig(1) not ported yet');
    if (Is_stronghold(u.uz)) {
        find_hell(dtmp);
    } else {
        let dist;

        if (t) {
            assign_level(dtmp, t.dst);
            /* don't fall beyond the bottom, in case this came from a bones
               file with different dungeon size  */
            clamp_hole_destination(dtmp);
        } else {
            dtmp.dnum = u.uz.dnum;
            dtmp.dlevel = newlevel;
        }
        dist = depth(dtmp) - depth(u.uz);
        if (dist > 1)
            await You(`${controlled_flight ? "fly" : "fall"} down a ${
                dist > 3 ? "very " : ""}${dist > 2 ? "deep " : ""}shaft!`);
    }
    if (!td)
        msgbuf = `The hole in the ${ceiling_tr(u.ux, u.uy)} above you closes up.`;

    schedule_goto(dtmp, !Flying() ? UTOTYPE_FALLING : UTOTYPE_NONE, null,
                  !td ? msgbuf : null);
}

// C ref: trap.c trapeffect_telep_trap()
async function trapeffect_telep_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        await tele_trap(trap);
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);

        await mtele_trap(mtmp, trap, in_sight);
        return Trap_Moved_Mon;
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_level_telep()
async function trapeffect_level_telep(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        seetrap(trap);
        await level_tele_trap(trap, trflags);
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);

        return mlevel_tele_trap(mtmp, trap, forcetrap, in_sight);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_magic_portal()
async function trapeffect_magic_portal(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        feeltrap(trap);
        await domagicportal(trap);
    } else {
        return trapeffect_level_telep(mtmp, trap, trflags);
    }
}

// C ref: trap.c mu_maybe_destroy_web()
async function mu_maybe_destroy_web(mtmp, domsg, trap) {
    const isyou = (mtmp === game.youmonst);
    const mptr = mtmp.data;

    if (amorphous(mptr) || is_whirly(mptr) || flaming(mptr)
        || unsolid(mptr) || mptr === mons[PM_GELATINOUS_CUBE]) {
        const x = trap.tx;
        const y = trap.ty;

        if (flaming(mptr) || acidic(mptr)) {
            if (domsg) {
                if (isyou)
                    throw new Error('mu_maybe_destroy_web(): hero branch not ported yet');
                else
                    await pline_mon(mtmp, `${Monnam(mtmp)} ${
                        (flaming(mptr)) ? "burns" : "dissolves"} ${
                        a_your[trap.madeby_u ? 1 : 0]} spider web!`);
            }
            deltrap(trap);
            newsym(x, y);
            return true;
        }
        if (domsg) {
            if (isyou) {
                throw new Error('mu_maybe_destroy_web(): hero branch not ported yet');
            } else {
                await pline_mon(mtmp, `${Monnam(mtmp)} flows through ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web.`);
                seetrap(trap);
            }
        }
        return true;
    }
    return false;
}

// C ref: trap.c trapeffect_web()
async function trapeffect_web(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        let webmsgok = (trflags & NOWEBMSG_TR) === 0;
        const forcetrap = ((trflags & FORCETRAP) !== 0
                           || (trflags & FAILEDUNTRAP_TR) !== 0);
        const viasitting = (trflags & VIASITTING_TR) !== 0;

        /* suppress article in various steed messages when using its
           name (which won't occur when hallucinating) */
        let steed_article = ARTICLE_THE_TR;
        if (u.usteed && has_mgivenname_tr(u.usteed) && !Hallucination())
            steed_article = ARTICLE_NONE_TR;

        feeltrap(trap);
        if (await mu_maybe_destroy_web(game.youmonst, webmsgok, trap))
            return Trap_Effect_Finished;
        if (webmaker(game.youmonst.data)) {
            if (webmsgok)
                await pline(trap.madeby_u ? "You take a walk on your web."
                            : "There is a spider web here.");
            return Trap_Effect_Finished;
        }
        if (webmsgok) {
            let verbbuf;

            if (forcetrap || viasitting) {
                verbbuf = "are caught by";
            } else if (u.usteed) {
                verbbuf = `lead ${x_monnam_tr(u.usteed, steed_article, "poor",
                                              SUPPRESS_SADDLE_TR, false)} into`;
            } else {
                verbbuf = `${u_locomotion("stumble")} into`;
            }
            await You(`${verbbuf} ${a_your[trap.madeby_u ? 1 : 0]} spider web!`);
        }

        /* time will be adjusted below */
        set_utrap(1, TT_WEB_TR);

        /* Time stuck in the web depends on your/steed's strength. */
        {
            let tim;
            const str = ACURR_tr(A_STR_TR);

            /* If mounted, the steed gets trapped.  Use mintrap
             * to do all the work.  If mtrapped is set as a result,
             * unset it and set utrap instead.  In the case of a
             * strongmonst and mintrap said it's trapped, use a
             * short but non-zero trap time.  Otherwise, monsters
             * have no specific strength, so use player strength.
             * This gets skipped for webmsgok, which implies that
             * the steed isn't a factor.
             */
            if (u.usteed && webmsgok)
                throw new Error('trapeffect_web(): steed caught in web (mintrap()) not ported yet');
            if (str <= 3)
                tim = rn1(6, 6);
            else if (str < 6)
                tim = rn1(6, 4);
            else if (str < 9)
                tim = rn1(4, 4);
            else if (str < 12)
                tim = rn1(4, 2);
            else if (str < 15)
                tim = rn1(2, 2);
            else if (str < 18)
                tim = rnd(2);
            else if (str < 69)
                tim = 1;
            else {
                tim = 0;
                if (webmsgok)
                    await You(`tear through ${a_your[trap.madeby_u ? 1 : 0]} web!`);
                deltrap(trap);
                newsym(u.ux, u.uy); /* get rid of trap symbol */
            }
            set_utrap(tim, TT_WEB_TR);
        }
    } else {
        /* Monster in a web. */
        let tear_web;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const forcetrap = ((trflags & FORCETRAP) !== 0);
        const mptr = mtmp.data;

        if (webmaker(mptr))
            return Trap_Effect_Finished;
        if (await mu_maybe_destroy_web(mtmp, in_sight, trap))
            return Trap_Effect_Finished;
        tear_web = false;
        const mndx = monsndx(mptr);
        let caught_default = true;
        switch (mndx) {
        case PM_OWLBEAR: /* Eric Backus */
        case PM_BUGBEAR:
            if (!in_sight) {
                /* Soundeffect(se_roar, 60) */
                await You_hear("the roaring of a confused bear!");
                mtmp.mtrapped = 1;
                caught_default = false;
            }
            break; /* FALLTHRU to default unless !in_sight */
            /* this list is fairly arbitrary; it deliberately
               excludes wumpus & giant/ettin zombies/mummies */
        case PM_TITANOTHERE:
        case PM_BALUCHITHERIUM:
        case PM_PURPLE_WORM:
        case PM_JABBERWOCK:
        case PM_IRON_GOLEM:
        case PM_BALROG:
        case PM_KRAKEN:
        case PM_MASTODON:
        case PM_ORION:
        case PM_NORN:
        case PM_CYCLOPS:
        case PM_LORD_SURTUR:
            tear_web = true;
            caught_default = false;
            break;
        default:
            break;
        }
        if (caught_default) { /* default: */
            if (mptr.mlet === S_GIANT
                /* exclude baby dragons and relatively short worms */
                || (mptr.mlet === S_DRAGON && extra_nasty(mptr))
                || (mtmp.wormno && count_wsegs(mtmp) > 5)) {
                tear_web = true;
            } else if (in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} is caught in ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web.`);
                seetrap(trap);
            }
            mtmp.mtrapped = tear_web ? 0 : 1;
        }
        if (tear_web) {
            if (in_sight)
                await pline_mon(mtmp, `${Monnam(mtmp)} tears through ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web!`);
            deltrap(trap);
            newsym(mtmp.mx, mtmp.my);
        } else if (forcetrap && !mtmp.mtrapped) {
            if (in_sight) {
                await pline_mon(mtmp, `${Monnam(mtmp)} avoids ${
                    a_your[trap.madeby_u ? 1 : 0]} spider web!`);
                seetrap(trap);
            }
        }
        return mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

/* C ref: obj.h has_omonst(); mondata.h unique_corpstat(), hides_under() */
function has_omonst(obj) { return !!obj.oextra?.omonst; }
/* C ref: invent.c nxtobj(obj, type, TRUE) -- the floor's nexthere chain
   (level.objects, top first, restricted to obj's spot) */
function nxtobj_here(obj, type) {
    const objs = game.level.objects || [];
    for (let i = objs.indexOf(obj) + 1; i > 0 && i < objs.length; i++) {
        const o = objs[i];
        if (o.ox === obj.ox && o.oy === obj.oy && o.where === 'OBJ_FLOOR'
            && o.otyp === type)
            return o;
    }
    return null;
}

// C ref: trap.c animate_statue()
/*
 * Animate the given statue.  May have been via shatter attempt, trap,
 * or stone to flesh spell.  Return a monster if successfully animated.
 * If the monster is animated, the object is deleted.  If fail_reason
 * is non-null, then fill in the reason for failure (or success).
 * (fail_reason is a { v } holder here.)
 */
export async function animate_statue(statue, x, y, cause, fail_reason) {
    const g = game;
    const u = g.u;
    const historic_statue_is_gone = "that the historic statue is now gone";
    const mnum = { v: statue.corpsenm };
    let mptr = mons[mnum.v];
    let mon = null, shkp;
    let item;
    const cc = { x: 0, y: 0 };
    const historic = (Role_if(PM_ARCHEOLOGIST)
                      && (statue.spe & CORPSTAT_HISTORIC) !== 0);
    let golem_xform = false, use_saved_traits;
    let comes_to_life;
    let statuename;

    if (cant_revive(mnum, true, statue)) {
        /* mnum has changed; we won't be animating this statue as itself */
        if (mnum.v !== PM_DOPPELGANGER)
            mptr = mons[mnum.v];
        use_saved_traits = false;
    } else if (is_golem(mptr) && cause === ANIMATE_SPELL) {
        /* statue of any golem hit by stone-to-flesh becomes flesh golem */
        golem_xform = (mptr !== mons[PM_FLESH_GOLEM]);
        mnum.v = PM_FLESH_GOLEM;
        mptr = mons[PM_FLESH_GOLEM];
        use_saved_traits = (has_omonst(statue) && !golem_xform);
    } else {
        use_saved_traits = has_omonst(statue);
    }

    if (use_saved_traits) {
        /* restore a petrified monster */
        cc.x = x, cc.y = y;
        mon = await montraits(statue, cc, (cause === ANIMATE_SPELL));
        if (mon && mon.mtame && !mon.isminion)
            await wary_dog(mon, true);
    } else {
        const sgend = (statue.spe & CORPSTAT_GENDER);
        let mmflags = (NO_MINVENT | MM_NOMSG
                       | ((sgend === CORPSTAT_MALE) ? MM_MALE : 0)
                       | ((sgend === CORPSTAT_FEMALE) ? MM_FEMALE : 0));

        /* statues of unique monsters from bones or wishing end
           up here (cant_revive() sets mnum to be doppelganger;
           mptr reflects the original form for use by newcham()) */
        if ((mnum.v === PM_DOPPELGANGER && mptr !== mons[PM_DOPPELGANGER])
            /* block quest guards from other roles */
            || (mptr.msound === MS_GUARDIAN
                && quest_info(MS_GUARDIAN) !== mnum.v)) {
            mmflags |= MM_NOCOUNTBIRTH | MM_ADJACENTOK;
            mon = makemon(mons[PM_DOPPELGANGER], x, y, mmflags);
            /* if hero has protection from shape changers, cham field will
               be NON_PM; otherwise, set form to match the statue */
            if (mon && ismnum(mon.cham))
                await newcham_tp(mon, mptr, NO_NC_FLAGS);
        } else {
            if (cause === ANIMATE_SPELL)
                mmflags |= MM_ADJACENTOK;
            mon = makemon(mptr, x, y, mmflags);
        }
    }

    if (!mon) {
        if (fail_reason)
            fail_reason.v = unique_corpstat(mons[statue.corpsenm])
                                ? AS_MON_IS_UNIQUE
                                : AS_NO_MON;
        return null;
    }

    /* if statue has been named, give same name to the monster */
    if (has_oname(statue) && !unique_corpstat(mon.data))
        mon = christen_monst(mon, ONAME(statue));
    /* mimic statue becomes seen mimic; other hiders won't be hidden */
    if (M_AP_TYPE(mon))
        seemimic(mon);
    else
        mon.mundetected = 0;
    mon.msleeping = 0;
    if (cause === ANIMATE_NORMAL || cause === ANIMATE_SHATTER) {
        /* trap always releases hostile monster */
        mon.mtame = 0; /* (might be petrified pet tossed onto trap) */
        mon.mpeaceful = 0;
        set_malign_ht(mon);
    }

    comes_to_life = !canspotmon_l(mon) ? "disappears"
                    : golem_xform ? "turns into flesh"
                      : (nonliving(mon.data) || is_vampshifter(mon))
                        ? "moves"
                        : "comes to life";
    if (u_at(x, y) || cause === ANIMATE_SPELL) {
        /* "the|your|Manlobbi's statue [of a wombat]" */
        shkp = shop_keeper(in_rooms(mon.mx, mon.my, SHOPBASE).charCodeAt(0) || 0);
        statuename = `${shk_your(statue)}${
            (cause === ANIMATE_SPELL
             /* avoid "of a shopkeeper" if it's Manlobbi himself
                (if carried, it can't be unpaid--hence won't be
                described as "Manlobbi's statue"--because there
                wasn't any living shk when statue was picked up) */
             && (mon !== shkp || statue.where === 'OBJ_INVENT' /* carried() */))
                ? xname(statue)
                : "statue"}`;
        await pline(`${upstart(statuename)} ${comes_to_life}!`);
    } else if (Hallucination()) { /* They don't know it's a statue */
        await pline_The(`${rndmonnam(null)} suddenly seems more animated.`);
    } else if (cause === ANIMATE_SHATTER) {
        if (cansee(x, y))
            statuename = `${shk_your(statue)}${xname(statue)}`;
        else
            statuename = "a statue";
        await pline(`Instead of shattering, ${statuename} suddenly ${
            comes_to_life}!`);
    } else { /* cause == ANIMATE_NORMAL */
        set_msg_xy(x, y);
        await You(`find ${canspotmon_l(mon) ? a_monnam(mon) : "something"
                  } posing as a statue.`);
        if (!canspotmon_l(mon) && Blind())
            map_invisible(x, y);
        await stop_occupation_l();
    }

    /* if this isn't caused by a monster using a wand of striking,
       there might be consequences for the hero */
    if (!g.context.mon_moving) {
        /* if statue is owned by a shop, hero will have to pay for it;
           stolen_value gives a message (about debt or use of credit)
           which refers to "it" so needs to follow a message describing
           the object ("the statue comes to life" one above) */
        if (cause !== ANIMATE_NORMAL && costly_spot(x, y)
            && ((statue.where === 'OBJ_INVENT') /* carried() */
                ? statue.unpaid : !statue.no_charge)
            && (shkp = shop_keeper(in_rooms(x, y, SHOPBASE).charCodeAt(0) || 0)) != null
            /* avoid charging for Manlobbi's statue of Manlobbi
               if stone-to-flesh is used on petrified shopkeep */
            && mon !== shkp)
            await stolen_value(statue, x, y, !!shkp.mpeaceful, false);

        if (historic) {
            await You_feel_ht(`guilty ${historic_statue_is_gone}.`);
            adjalign_ht(-1);
        }
    } else {
        if (historic && cansee(x, y))
            await You_feel_ht(`regret ${historic_statue_is_gone}.`);
        /* no alignment penalty */
    }

    /* transfer any statue contents to monster's inventory */
    while ((item = (statue.cobj && statue.cobj.length) ? statue.cobj[0] : null) != null) {
        obj_extract_self_l(item);
        mpickobj_l(mon, item);
    }
    m_dowear(mon, true);
    /* in case statue is wielded and hero zaps stone-to-flesh at self */
    if (statue.owornmask)
        await remove_worn_item(statue, true);
    /* statue no longer exists */
    delobj(statue);

    /* avoid hiding under nothing */
    if (u_at(x, y) && Upolyd() && hides_under(g.youmonst.data)
        && !OBJ_AT(x, y))
        u.uundetected = 0;

    if (fail_reason)
        fail_reason.v = AS_OK;
    return mon;
}

// C ref: trap.c activate_statue_trap()
/*
 * You've either stepped onto a statue trap's location or you've triggered a
 * statue trap by searching next to it or by trying to break it with a wand
 * or pick-axe.
 */
export async function activate_statue_trap(trap, x, y, shatter) {
    let mtmp = null;
    let otmp = sobj_at(STATUE, x, y);
    const fail_reason = { v: 0 };

    /*
     * Try to animate the first valid statue.  Stop the loop when we
     * actually create something or the failure cause is not because
     * the mon was unique.
     */
    deltrap(trap);
    while (otmp) {
        mtmp = await animate_statue(otmp, x, y,
                                    shatter ? ANIMATE_SHATTER : ANIMATE_NORMAL,
                                    fail_reason);
        if (mtmp || fail_reason.v !== AS_MON_IS_UNIQUE)
            break;

        otmp = nxtobj_here(otmp, STATUE);
    }

    feel_newsym_dr(x, y);
    return mtmp;
}

// C ref: trap.c trapeffect_statue_trap()
async function trapeffect_statue_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        await activate_statue_trap(trap, game.u.ux, game.u.uy, false);
    } else {
        /* monsters don't trigger statue traps */
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c steedintrap()
/* 0 if trap doesn't affect steed, 1 if it does, 2 if steed dies */
async function steedintrap(trap, otmp) {
    const u = game.u;
    const steed = u.usteed;
    let trapkilled = false, steedhit = false;

    if (!steed || !trap)
        return Trap_Effect_Finished;
    const tt = trap.ttyp;
    steed.mx = u.ux;
    steed.my = u.uy;

    switch (tt) {
    case SLP_GAS_TRAP:
        if (!resists_sleep(steed) && !breathless(steed.data)
            && !helpless(steed)) {
            if (await sleep_monst(steed, rnd(25), -1))
                /* no in_sight check here; you can feel it even if blind */
                await pline(`${Monnam(steed)} suddenly falls asleep!`);
        }
        steedhit = true;
        break;
    case PIT:
    case SPIKED_PIT:
        trapkilled = (steed.mhp < 1 /* DEADMONSTER(steed) */
                      || await thitm(0, steed, null, rnd((tt === PIT) ? 6 : 10),
                                     false));
        steedhit = true;
        break;
    case ARROW_TRAP:
        if (!otmp) {
            impossible("steed hit by non-existent arrow?");
            return Trap_Effect_Finished;
        }
        trapkilled = await thitm(8, steed, otmp, 0, false);
        steedhit = true;
        break;
    case DART_TRAP:
        if (!otmp) {
            impossible("steed hit by non-existent dart?");
            return Trap_Effect_Finished;
        }
        trapkilled = await thitm(7, steed, otmp, 0, false);
        steedhit = true;
        break;
    case LANDMINE:
        trapkilled = await thitm(0, steed, null, rnd(16), false);
        steedhit = true;
        break;
    case POLY_TRAP:
        if (!resists_magm(steed) && !resist(steed, WAND_CLASS_TP, 0, NOTELL)) {
            /* newcham() will probably end up calling poly_steed() */
            await newcham_tp(steed, null, NC_SHOW_MSG_TP);
        }
        steedhit = true;
        break;
    default:
        break;
    }

    if (trapkilled) {
        await dismount_steed(DISMOUNT_POLY);
        return Trap_Killed_Mon;
    }
    return steedhit ? 1 : 0;
}

// C ref: trap.c domagictrap()
async function domagictrap() {
    const u = game.u;
    const fate = rnd(20);

    /* What happened to the poor sucker? */

    if (fate < 10) {
        /* Most of the time, it creates some monsters. */
        let cnt = rnd(4);

        /* blindness effects */
        if (!resists_blnd_tr(game.youmonst)) {
            await You("are momentarily blinded by a flash of light!");
            await make_blinded_tr(rn1(5, 10), false);
            if (!Blind())
                await Your("vision quickly clears."); /* Your1(vision_clears) */
        } else if (!Blind()) {
            await You_see_l("a flash of light!");
        }

        /* deafness effects */
        if (!Deaf()) {
            /* Soundeffect(se_deafening_roar_atmospheric, 100); */
            await You_hear("a deafening roar!");
            incr_itimeout_tr(DEAF, rn1(20, 30));
            game.disp_botl = true;
        } else {
            /* magic vibrations still hit you */
            await You_feel("rankled.");
            incr_itimeout_tr(DEAF, rn1(5, 15));
            game.disp_botl = true;
        }
        while (cnt--)
            makemon(null, u.ux, u.uy, NO_MM_FLAGS);
        /* roar: wake monsters in vicinity, after placing trap-created ones */
        await wake_nearto(u.ux, u.uy, 7 * 7);
        /* [flash: should probably also hit nearby gremlins with light] */
    } else {
        switch (fate) {
        case 10:
            /* sometimes nothing happens */
            break;
        case 11: { /* toggle intrinsic invisibility */
            const inv = u.uprops[INVIS], seeinv = u.uprops[SEE_INVIS];
            const Invis = (inv.intrinsic || inv.extrinsic) && !inv.blocked;
            const See_invisible = !!(seeinv.intrinsic || seeinv.extrinsic
                                     || perceives(game.youmonst.data));

            /* Soundeffect(se_low_hum, 100); */
            await You_hear("a low hum.");
            if (!Invis) {
                if (!Blind())
                    await self_invis_message();
            } else if (!inv.extrinsic && !pm_invisible(game.youmonst.data)) {
                if (!Blind()) {
                    if (!See_invisible)
                        await You("can see yourself again!");
                    else
                        await pline("You can't see through yourself anymore."); /* You_cant() */
                }
            } else {
                /* If we're invisible from another source */
                await You_feel(`a little more ${inv.intrinsic ? "obvious" : "hidden"} now.`);
            }
            inv.intrinsic = inv.intrinsic ? 0 : (inv.intrinsic | FROMOUTSIDE);
            newsym(u.ux, u.uy);
            break;
        }
        case 12: /* a flash of fire */
            await dofiretrap(null);
            break;

        /* odd feelings */
        case 13:
            await pline(`A shiver runs up and down your ${body_part(SPINE)}!`);
            break;
        case 14:
            await You_hear(Hallucination() ? "the moon howling at you."
                                           : "distant howling.");
            break;
        case 15:
            if (on_level(u.uz, game.dungeon_topology.d_qstart_level))
                await You_feel(`${(game.flags.female
                                   || (Upolyd() && is_neuter(game.youmonst.data)))
                                  ? "oddly " : ""}like the prodigal son.`);
            else
                await You(`suddenly yearn for ${
                    Hallucination() ? "Cleveland"
                    : (In_quest(u.uz) || at_dgn_entrance("The Quest"))
                      ? "your nearby homeland"
                      : "your distant homeland"}.`);
            break;
        case 16:
            await Your("pack shakes violently!");
            break;
        case 17:
            await You(Hallucination() ? "smell hamburgers." : "smell charred flesh.");
            break;
        case 18:
            await You_feel("tired.");
            break;

        /* very occasionally something nice happens. */
        case 19: { /* tame nearby monsters */
            let i, j;
            let mtmp;

            await adjattrib(A_CHA, 1, false);
            for (i = -1; i <= 1; i++)
                for (j = -1; j <= 1; j++) {
                    if (!isok(u.ux + i, u.uy + j))
                        continue;
                    mtmp = m_at(u.ux + i, u.uy + j);
                    if (mtmp)
                        await tamedog(mtmp, null, true);
                }
            break;
        }
        case 20: { /* uncurse stuff */
            const save_conf = u.uprops[CONFUSION].intrinsic;

            /* pseudo = cg.zeroobj: force 'uncursed' and zero out oextra */
            /* used to be SCR_REMOVE_CURSE but that could cause seffects()
               to have hero discover scroll of remove curse */
            const pseudo = { otyp: 0, oclass: 0, quan: 0, blessed: 0, cursed: 0, spe: 0 }; /* cg.zeroobj */
            pseudo.otyp = SPE_REMOVE_CURSE;
            pseudo.oclass = SPBOOK_CLASS;
            u.uprops[CONFUSION].intrinsic = 0;
            await seffects(pseudo);
            u.uprops[CONFUSION].intrinsic = save_conf;
            break;
        }
        default:
            break;
        }
    }
}

// C ref: trap.c drain_en()
export async function drain_en(n, max_already_drained) {
    const u = game.u;
    let mesg;
    let punct = max_already_drained ? '!' : '.';

    /*
     * FIXME?
     *  u.uenmax should probably have a higher minimum than 0;
     *  perhaps u.ulevel or (u.ulevel + 1) / 2
     */
    if (u.uenmax < 1) {
        /* energy is completely gone */
        if (u.uen || u.uenmax) { /* paranoia */
            u.uen = u.uenmax = 0;
            game.disp_botl = true;
        }
        mesg = "momentarily lethargic";
    } else {
        /* throttle further loss a bit when there's not much left to lose */
        if (n > Math.trunc((u.uen + u.uenmax) / 3))
            n = rnd(n);

        mesg = "your magical energy drain away";
        if (n > u.uen)
            punct = '!';

        u.uen -= n;
        if (u.uen < 0) {
            u.uenmax -= rnd(-u.uen);
            if (u.uenmax < 0)
                u.uenmax = 0;
            u.uen = 0;
        } else if (u.uen > u.uenmax) {
            /* uen might be greater than uenmax if caller reduced uenmax
               and then we throttled the loss being applied to current */
            u.uen = u.uenmax;
        }
        game.disp_botl = true;
    }
    /* after manipulating u.uen,uenmax and setting context.botl, so
       that You_feel() -> pline() will update status before the message */
    await You_feel(`${mesg}${punct}`);
}

// C ref: trap.c trapeffect_magic_trap()
async function trapeffect_magic_trap(mtmp, trap, trflags) {
    if (mtmp === game.youmonst) {
        const u = game.u;
        seetrap(trap);
        if (!rn2(30)) {
            deltrap(trap);
            newsym(u.ux, u.uy); /* update position */
            await You("are caught in a magical explosion!");
            await losehp(rnd(10), "magical explosion", KILLED_BY_AN);
            await Your("body absorbs some of the magical energy!");
            u.uen = (u.uenmax += 2);
            if (u.uenmax > u.uenpeak)
                u.uenpeak = u.uenmax;
            return Trap_Effect_Finished;
        } else {
            await domagictrap();
        }
        await steedintrap(trap, null);
    } else {
        /* A magic trap.  Monsters usually immune. */
        if (!rn2(21))
            return trapeffect_fire_trap(mtmp, trap, trflags);
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_anti_magic()
async function trapeffect_anti_magic(mtmp, /* monster, possibly youmonst */
                                     trap, /* trap->ttyp == ANTI_MAGIC */
                                     trflags) {
    if (wearing_iron_shoes(mtmp)) {
        const shoes = which_armor(mtmp, W_ARMF);
        /* iron shoes protect against antimagic traps only if
           positively enchanted; the trap drains the enchantment
           rather than the wearer */
        if (shoes.spe > 0) {
            /* no message if a monster does this, it isn't visible enough */
            if (mtmp === game.youmonst)
                throw new Error('trapeffect_anti_magic(): "lethargic aura" (yname(), costly_alteration()) not ported yet');
            shoes.spe -= 1;
            /* update_inventory() */
            return Trap_Effect_Finished;
        }
    }

    if (mtmp === game.youmonst) {
        const u = game.u;
        let drain, halfd;
        let exclaim_it = false;

        seetrap(trap);
        if (Antimagic()) {
            let dmgval2 = rnd(4);
            const hp = Upolyd() ? u.mh : u.uhp;

            /* Half_XXX_damage has opposite its usual effect (approx)
               but isn't cumulative if hero has more than one */
            if (Half_physical_damage() || Half_spell_damage())
                dmgval2 += rnd(4);
            /* give Magicbane wielder dose of own medicine */
            if (game.uwep && game.uwep.oartifact === ART_MAGICBANE)
                dmgval2 += rnd(4);
            /* having an artifact--other than own quest one--which
               confers magic resistance simply by being carried
               also increases the effect */
            let otmp;
            for (otmp = game.invent; otmp; otmp = otmp.nobj)
                if (otmp.oartifact && !is_quest_artifact(otmp)
                    && defends_when_carried(AD_MAGM, otmp))
                    break;
            if (otmp)
                dmgval2 += rnd(4);
            if (Passes_walls())
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            await You_feel((dmgval2 >= hp) ? "unbearably torpid!"
                           : (dmgval2 >= Math.trunc(hp / 4)) ? "very lethargic."
                             : "sluggish.");
            /* opposite of magical explosion */
            await losehp(dmgval2, "anti-magic implosion", KILLED_BY_AN);
        }

        /* if the drain amount is more than hero's maximum energy then up
           to half of the amount comes directly out of maximum, the rest
           comes out of current energy; drain_en() lowers the current
           amount and when doing so it will take even more from maximum
           if the new current value would drop below zero */
        drain = d(2, 6); /* 2d6 => 2..12 */
        halfd = rnd(Math.trunc(drain / 2)); /* 1..drain/2 (round down) */
        if (u.uenmax > drain) { /* [was u.uenmax > halfd] */
            u.uenmax -= halfd; /* drain_en() will set context.botl */
            drain -= halfd;
            exclaim_it = true;
        }
        await drain_en(drain, exclaim_it);
    } else {
        let trapkilled = false;
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);
        const mptr = mtmp.data;

        /* similar to hero's case, more or less */
        if (!resists_magm(mtmp)) { /* lose spell energy */
            if (!mtmp.mcan && (attacktype(mptr, AT_MAGC)
                               || attacktype(mptr, AT_BREA))) {
                mtmp.mspec_used = (mtmp.mspec_used || 0) + d(2, 6);
                if (in_sight) {
                    seetrap(trap);
                    await pline_mon(mtmp, `${Monnam(mtmp)} seems lethargic.`);
                }
            }
        } else { /* take some damage */
            let otmp;
            let dmgval2 = rnd(4);

            if ((otmp = mtmp.mw) != null /* MON_WEP(mtmp) */
                && otmp.oartifact === ART_MAGICBANE) /* is_art() */
                dmgval2 += rnd(4);
            otmp = (mtmp.minvent || []).find(
                o => o.oartifact && defends_when_carried(AD_MAGM, o));
            if (otmp)
                dmgval2 += rnd(4);
            if (passes_walls(mptr))
                dmgval2 = Math.trunc((dmgval2 + 3) / 4);

            if (in_sight)
                seetrap(trap);
            mtmp.mhp -= dmgval2;
            if (mtmp.mhp < 1)
                await monkilled(mtmp,
                                in_sight
                                ? "compression from an anti-magic field"
                                : null,
                                -AD_MAGM);
            if (mtmp.mhp < 1)
                trapkilled = true;
            if (see_it)
                newsym(trap.tx, trap.ty);
        }
        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c trapeffect_landmine()
async function trapeffect_landmine(mtmp, trap, trflags) {
    let damage = rnd(16);
    /* iron shoes protect against much of the damage from the
       explosion, but you still take some damage (and wound legs)
       because they can't fully block the blast */
    if (wearing_iron_shoes(mtmp))
        damage = Math.trunc((damage + 3) / 4);

    if (mtmp === game.youmonst) {
        const u = game.u;
        const already_seen = trap.tseen;
        const forcetrap = ((trflags & FORCETRAP) !== 0
                           || (trflags & FAILEDUNTRAP) !== 0);
        const forcebungle = (trflags & FORCEBUNGLE) !== 0;
        let steed_mid = 0;
        let saddle = null;

        if ((Levitation() || Flying()) && !forcetrap) {
            if (!already_seen && rn2(3))
                return Trap_Effect_Finished;
            feeltrap(trap);
            await pline(`${already_seen ? "There is" : "You discover"} ${
                trap.madeby_u ? "the trigger of your mine" : "a trigger"
                } in a pile of soil below you.`);
            if (already_seen && rn2(3))
                return Trap_Effect_Finished;
            /* Soundeffect(se_kaablamm_of_mine, 80): no sound */
            await pline(`KAABLAMM!!!  ${forcebungle ? "Your inept attempt sets"
                                                    : "The air currents set"} ${
                already_seen ? a_your[trap.madeby_u ? 1 : 0] : ""}${
                already_seen ? " land mine" : "it"} off!`);
        } else {
            /* prevent landmine from killing steed, throwing you to
             * the ground, and then that same landmine affecting you
             * again because it hasn't been deleted yet
             */
            /* C's static recursive_mine is per-game state here */
            if (game.recursive_mine)
                return Trap_Effect_Finished;
            feeltrap(trap);
            await pline(`KAABLAMM!!!  You triggered ${
                a_your[trap.madeby_u ? 1 : 0]} land mine!`);
            if (u.usteed)
                steed_mid = u.usteed.m_id;
            game.recursive_mine = true;
            await steedintrap(trap, null);
            game.recursive_mine = false;
            saddle = sobj_at(SADDLE_LM, u.ux, u.uy);
            await set_wounded_legs(LEFT_SIDE, rn1(35, 41));
            await set_wounded_legs(RIGHT_SIDE, rn1(35, 41));
            await exercise(A_DEX, false);
        }
        /* add a pit before calling losehp so bones won't keep the landmine;
           blow_up_landmine() will remove pit afterwards if inappropriate */
        trap.ttyp = PIT;
        trap.madeby_u = false;
        await losehp(Maybe_Half_Phys(damage), "land mine", KILLED_BY_AN);
        await blow_up_landmine(trap);
        if (steed_mid && saddle && !u.usteed)
            throw new Error('trapeffect_landmine(): keep_saddle_with_steedcorpse() not ported yet');
        newsym(u.ux, u.uy); /* update trap symbol */
        /* fall recursively into the pit... */
        if ((trap = t_at(u.ux, u.uy)) !== null && trap !== undefined)
            await dotrap(trap, RECURSIVETRAP);
        await fill_pit(u.ux, u.uy);
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === game.u.usteed);
        const tx = trap.tx, ty = trap.ty;
        let trapkilled = false;

        /* heavier monsters are more likely to set off a land mine; on the
           other hand, any mon lighter than the trigger weight is immune */
        const MINE_TRIGGER_WT = Math.trunc(WT_ELF / 2);
        if (rn2(mtmp.data.cwt + 1) < MINE_TRIGGER_WT)
            return Trap_Effect_Finished;
        if (m_in_air(mtmp)) {
            const already_seen = trap.tseen;

            if (in_sight && !already_seen) {
                await pline_mon(mtmp,
                                `A trigger appears in a pile of soil below ${mon_nam(mtmp)}.`);
                seetrap(trap);
            }
            if (rn2(3))
                return Trap_Effect_Finished;
            if (in_sight) {
                newsym(mtmp.mx, mtmp.my);
                await pline(`The air currents set ${
                    already_seen ? "a land mine" : "it"} off!`);
            }
        } else if (in_sight) {
            newsym(mtmp.mx, mtmp.my);
            await pline_mon(mtmp, `${!Deaf() ? "KAABLAMM!!!  " : ""}${Monnam(mtmp)} triggers ${
                a_your[trap.madeby_u ? 1 : 0]} land mine!`);
        }
        if (!in_sight && !Deaf())
            await pline("Kaablamm!  You hear an explosion in the distance!");
        await blow_up_landmine(trap);
        /* explosion might have destroyed a drawbridge; don't
           dish out more damage if monster is already dead */
        if (mtmp.mhp < 1 /* DEADMONSTER(mtmp) */
            || await thitm(0, mtmp, null, damage, false)) {
            trapkilled = true;
        } else {
            /* monsters recursively fall into new pit */
            if (await mintrap(mtmp, trflags | FORCETRAP) === Trap_Killed_Mon)
                trapkilled = true;
        }
        /* a boulder may fill the new pit, crushing monster */
        await fill_pit(tx, ty); /* thitm may have already destroyed the trap */
        if (mtmp.mhp < 1) /* DEADMONSTER(mtmp) */
            trapkilled = true;
        if (unconscious()) {
            game.multi = -1;
            game.nomovemsg = "The explosion awakens you!";
        }
        return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
            ? Trap_Caught_Mon : Trap_Effect_Finished;
    }
}

// C ref: trap.c blow_up_landmine()
export async function blow_up_landmine(trap) {
    const g = game;
    const x = trap.tx, y = trap.ty;
    const lev = g.level.at(x, y);
    let typ;

    const old_typ = lev.typ;
    await scatter_l(x, y, 4,
                    MAY_DESTROY_L | MAY_HIT_L | MAY_FRACTURE_L | VIS_EFFECTS_L,
                    null);
    del_engr_at_l(x, y);
    await wake_nearto(x, y, 400);
    if (IS_DOOR_L(lev.typ))
        lev.doormask = D_BROKEN_L;
    /* destroy drawbridge if present */
    if (lev.typ === DRAWBRIDGE_DOWN_L || is_drawbridge_wall_l(x, y) >= 0) {
        /* if under the portcullis, the bridge is adjacent */
        let dbx = x, dby = y;
        const db = find_drawbridge_l(dbx, dby);
        if (db) {
            dbx = db.x, dby = db.y;
            await destroy_drawbridge(dbx, dby);
        }
    }
    trap = t_at(x, y); /* expected to be null after destruction */
    /* or could be null if scatter blew up oil which melted ice */
    /* convert landmine into pit */
    if (trap) {
        if (Is_waterlevel_l(g.u.uz) || Is_airlevel_l(g.u.uz)) {
            /* no pits here */
            deltrap(trap);
        } else {
            /* fill pit with water, if applicable */
            typ = fillholetyp_l(x, y, false);
            if (typ !== ROOM) {
                lev.typ = typ;
                await liquid_flow_l(x, y, typ, trap,
                                    cansee(x, y) ? "The hole fills with %s!"
                                                 : null);
            } else {
                trap.ttyp = PIT;       /* explosion creates a pit */
                trap.madeby_u = 0;     /* resulting pit isn't yours */
                seetrap(trap);         /* and it isn't concealed */
            }
        }
    }
    await fill_pit(x, y);
    await maybe_dunk_boulders(x, y);
    recalc_block_point_l(x, y);
    spot_checks(x, y, old_typ);
}

// C ref: trap.c clamp_hole_destination()
export function clamp_hole_destination(dlev) {
    const bottom = dng_bottom(dlev);

    dlev.dlevel = Math.min(dlev.dlevel, bottom);
    return dlev;
}

// C ref: trap.c trapeffect_rolling_boulder_trap()
async function trapeffect_rolling_boulder_trap(mtmp, trap, trflags) {
    void trflags;
    if (mtmp === game.youmonst) {
        let style = ROLL_L | (trap.tseen ? LAUNCH_KNOWN_L : 0);

        feeltrap(trap);
        await pline(`${!Deaf() ? "Click!  " : ""}You trigger a rolling boulder trap!`);
        if (!await launch_obj(BOULDER, trap.launch.x, trap.launch.y,
                              trap.launch2.x, trap.launch2.y, style)) {
            /* if this is a known trap, the player may have known there wasn't
               a lined up boulder, so use a shorter message to avoid --More--
               spam */
            if (style & LAUNCH_KNOWN_L)
                await pline("No boulder was released.");
            else
                await pline("Fortunately for you, no boulder was released.");
        }
    } else {
        if (!m_in_air(mtmp)) {
            const in_sight = (mtmp === game.u.usteed
                              || (cansee(mtmp.mx, mtmp.my)
                                  && canspotmon_l(mtmp)));
            const style = ROLL_L | (in_sight ? 0 : LAUNCH_UNSEEN_L);
            let trapkilled = false;

            newsym(mtmp.mx, mtmp.my);
            if (in_sight)
                await pline_mon(mtmp, `${!Deaf() ? "Click!  " : ""}${Monnam(mtmp)} triggers ${
                    trap.tseen ? "a rolling boulder trap" : "something"}.`);
            if (await launch_obj(BOULDER, trap.launch.x, trap.launch.y,
                                 trap.launch2.x, trap.launch2.y, style)) {
                if (in_sight)
                    trap.tseen = 1;
                if (mtmp.mhp < 1) /* DEADMONSTER() */
                    trapkilled = true;
            }
            return trapkilled ? Trap_Killed_Mon : mtmp.mtrapped
                ? Trap_Caught_Mon : Trap_Effect_Finished;
        }
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c launch_drop_spot()
function launch_drop_spot(obj, x, y) {
    if (!game.launchplace)
        game.launchplace = { x: 0, y: 0 };
    if (!obj) {
        game.launchplace.obj = null;
        game.launchplace.x = 0;
        game.launchplace.y = 0;
    } else {
        game.launchplace.obj = obj;
        game.launchplace.x = x;
        game.launchplace.y = y;
    }
}

// C ref: trap.c launch_obj()
/*
 * Move obj from (x1,y1) to (x2,y2)
 *
 * Return 0 if no object was launched.
 *        1 if an object was launched and placed somewhere.
 *        2 if an object was launched, but used up.
 */
export async function launch_obj(otyp, x1, y1, x2, y2, style) {
    const g = game;
    const u = g.u;
    let mtmp;
    let otmp, otmp2;
    let dx, dy;
    let x, y;
    let singleobj;
    let used_up = false, otherside = false;
    let dist, tmp, delaycnt = 0;

    otmp = sobj_at(otyp, x1, y1);
    /* Try the other side too, for rolling boulder traps */
    if (!otmp && otyp === BOULDER) {
        otherside = true;
        otmp = sobj_at(otyp, x2, y2);
    }
    if (!otmp)
        return 0;
    if (otherside) { /* swap 'em */
        const tx = x1, ty = y1;

        x1 = x2;
        y1 = y2;
        x2 = tx;
        y2 = ty;
    }

    if (otmp.quan === 1) {
        obj_extract_self_l(otmp);
        maybe_unhide_at(otmp.ox, otmp.oy);
        singleobj = otmp;
        otmp = null;
    } else {
        singleobj = splitobj_l(otmp, 1);
        obj_extract_self_l(singleobj);
    }
    newsym(x1, y1);
    /* in case you're using a pick-axe to chop the boulder that's being
       launched (perhaps a monster triggered it), destroy context so that
       the next dig attempt never thinks that you're resuming
       the previous effort */
    const digging = g.context.digging;
    if ((otyp === BOULDER || otyp === STATUE) && digging && digging.pos
        && singleobj.ox === digging.pos.x
        && singleobj.oy === digging.pos.y)
        g.context.digging = { pos: { x: 0, y: 0 }, level: { dnum: 0, dlevel: 0 },
                              lastdigtime: 0, down: false, chew: false,
                              warned: false, quiet: false, effort: 0 };

    dist = distmin_l(x1, y1, x2, y2);
    x = g.bhitpos.x = x1;
    y = g.bhitpos.y = y1;
    dx = Math.sign(x2 - x1);
    dy = Math.sign(y2 - y1);
    let roll = false;
    switch (style) {
    case ROLL_L | LAUNCH_UNSEEN_L:
        if (otyp === BOULDER) {
            if (cansee(x1, y1)) {
                await You_see_l(`${an_l(xname(singleobj))} start to roll.`);
            } else if (Hallucination()) {
                await You_hear("someone bowling.");
            } else {
                await You_hear(`rumbling ${(dist2(x1, y1, u.ux, u.uy) <= 4 * 4)
                                           ? "nearby" : "in the distance"}.`);
            }
        }
        style &= ~LAUNCH_UNSEEN_L;
        roll = true;
        break;
    case ROLL_L | LAUNCH_KNOWN_L:
        /* use otrapped as a flag to ohitmon */
        singleobj.otrapped = 1;
        style &= ~LAUNCH_KNOWN_L;
        roll = true;
        break;
    case ROLL_L:
        roll = true;
        break;
    default:
        break;
    }
    /* roll: */
    if (roll)
        delaycnt = 2;
    /* default: */
    if (!delaycnt)
        delaycnt = 1;
    /* if (!cansee(x, y)) curs_on_u(); -- display only */
    tmp_at_l(DISP_FLASH_L, obj_to_glyph_l(singleobj, rn2_on_display_rng_l));
    tmp_at_l(x, y);
    /* Mark a spot to place object in bones files to prevent
     * loss of object. Use the starting spot to ensure that
     * a rolling boulder will still launch, which it wouldn't
     * do if left midstream. Unfortunately we can't use the
     * target resting spot, because there are some things/situations
     * that would prevent it from ever getting there (bars), and we
     * can't tell that yet.
     */
    launch_drop_spot(singleobj, x, y);

    /* Set the object in motion */
    while (dist-- > 0 && !used_up) {
        let t;

        tmp_at_l(x, y);
        tmp = delaycnt;
        void tmp; /* nh_delay_output() only if hero sees it: display timing */

        /*
         * TEMPORARY?  github issue #1490 by BartekCupial reports a
         * segfault when boulder rolls out of bounds.
         */
        if (!isok(g.bhitpos.x + dx, g.bhitpos.y + dy)) {
            x2 = x, y2 = y; /* use current spot for final boulder placement */
            break;
        }

        x = (g.bhitpos.x += dx);
        y = (g.bhitpos.y += dy);

        if ((mtmp = m_at(x, y)) != null) {
            if (otyp === BOULDER && throws_rocks(mtmp.data)) {
                if (rn2(3)) {
                    if (cansee(x, y))
                        await pline_mon(mtmp, `${Monnam(mtmp)} snatches the boulder.`);
                    singleobj.otrapped = 0;
                    await mpickobj_l(mtmp, singleobj);
                    used_up = true;
                    launch_drop_spot(null, 0, 0);
                    break;
                }
            }
            if (await ohitmon_l(mtmp, singleobj, (style === ROLL_L) ? -1 : dist,
                                false)) {
                used_up = true;
                launch_drop_spot(null, 0, 0);
                break;
            }
        } else if (u.ux === x && u.uy === y) {
            const dam = dmgval(singleobj, g.youmonst);
            const objp = { obj: singleobj };

            if (g.multi)
                nomul(0);
            if (await thitu(9 + singleobj.spe, Maybe_Half_Phys(dam),
                            objp, null))
                await stop_occupation_l();
            singleobj = objp.obj;
        }
        if (style === ROLL_L) {
            if (down_gate_l(x, y) !== -1) {
                if (await ship_object_l(singleobj, x, y, false)) {
                    used_up = true;
                    launch_drop_spot(null, 0, 0);
                    break;
                }
            }
            if ((t = t_at(x, y)) != null
                && otyp === BOULDER) {
                switch (t.ttyp) {
                case LANDMINE:
                    if (rn2(10) > 2) {
                        if (cansee(x, y))
                            set_msg_xy(x, y);
                        await pline(`KAABLAMM!!!${cansee(x, y)
                            ? "  The rolling boulder triggers a land mine."
                            : ""}`);
                        deltrap(t);
                        del_engr_at_l(x, y);
                        place_object(singleobj, x, y);
                        singleobj.otrapped = 0;
                        await fracture_rock(singleobj);
                        await scatter_l(x, y, 4,
                                        MAY_DESTROY_L | MAY_HIT_L | MAY_FRACTURE_L
                                            | VIS_EFFECTS_L,
                                        null);
                        if (cansee(x, y))
                            newsym(x, y);
                        used_up = true;
                        launch_drop_spot(null, 0, 0);
                    }
                    break;
                case LEVEL_TELEP:
                case TELEP_TRAP:
                    throw new Error('launch_obj(): rolling boulder into a teleport trap not ported yet');
                case PIT:
                case SPIKED_PIT:
                case HOLE:
                case TRAPDOOR:
                    /* the boulder won't be used up if there is a
                       monster in the trap; stop rolling anyway */
                    x2 = x, y2 = y; /* stops here */
                    if (await flooreffects_l(singleobj, x2, y2, "fall")) {
                        used_up = true;
                        launch_drop_spot(null, 0, 0);
                    }
                    dist = -1; /* stop rolling immediately */
                    break;
                default:
                    break;
                }

                if (used_up || dist === -1)
                    break; /* from 'while' loop */
            }
            if (await flooreffects_l(singleobj, x, y, "fall")) {
                used_up = true;
                launch_drop_spot(null, 0, 0);
                break;
            }
            if (otyp === BOULDER && (otmp2 = sobj_at(BOULDER, x, y)) != null) {
                let bmsg = " as one boulder sets another in motion";
                const fx = x + dx, fy = y + dy;

                if (!isok(fx, fy) || !dist
                    || IS_OBSTRUCTED_L(g.level.at(fx, fy).typ))
                    bmsg = " as one boulder hits another";

                await You_hear(`a loud crash${cansee(x, y) ? bmsg : ""}!`);
                obj_extract_self_l(otmp2);
                /* pass off the otrapped flag to the next boulder */
                otmp2.otrapped = singleobj.otrapped;
                singleobj.otrapped = 0;
                place_object(singleobj, x, y);
                singleobj = otmp2;
                otmp2 = null;
                await wake_nearto(x, y, 10 * 10);
            }
        }
        if (otyp === BOULDER && closed_door(x, y)) {
            if (cansee(x, y)) {
                set_msg_xy(x, y);
                await pline_The("boulder crashes through a door.");
            }
            g.level.at(x, y).doormask = D_BROKEN_L;
            if (dist)
                recalc_block_point_l(x, y);
        }

        /* if about to hit something, do so now */
        if (dist > 0 && isok(x + dx, y + dy)) {
            const fx = x + dx, fy = y + dy;
            const typ = g.level.at(fx, fy).typ;

            if (typ === IRONBARS_L) {
                x2 = x, y2 = y; /* object stops here */
                const objp = { obj: singleobj };
                const hb = await hits_bars_l(objp, x2, y2, fx, fy, !rn2(20), 0);
                singleobj = objp.obj;
                if (hb) {
                    if (!singleobj) {
                        used_up = true;
                        launch_drop_spot(null, 0, 0);
                    }
                    break;
                }
            } else if (IS_STWALL_L(typ) || IS_TREE_L(typ)) {
                x2 = x, y2 = y; /* object stops here */
                if (!Deaf())
                    await pline("Thump!");
                await wake_nearto(x2, y2, 16);
                break;
            }
        }
    } /* while dist > 0 */
    tmp_at_l(DISP_END_L, 0);
    launch_drop_spot(null, 0, 0);
    if (!used_up) {
        singleobj.otrapped = 0;
        place_object(singleobj, x2, y2);
        newsym(x2, y2);
        return 1;
    }
    return 2;
}

// C ref: trap.c trapeffect_selector()
// C ref: trap.c trapeffect_poly_trap()
async function trapeffect_poly_trap(mtmp, trap, trflags) {
    const u = game.u;

    if (mtmp === game.youmonst) {
        const viasitting = (trflags & VIASITTING) !== 0;
        let verbbuf;

        seetrap(trap);
        if (viasitting)
            verbbuf = "trigger"; /* follows "You sit down." */
        else if (u.usteed)
            /* x_monnam(u.usteed, steed_article, NULL, SUPPRESS_SADDLE) */
            throw new Error('trapeffect_poly_trap(): steed onto a polymorph trap not ported yet');
        else
            verbbuf = `${u_locomotion("step")} onto`;
        await You(`${verbbuf} a polymorph trap!`);
        if (wearing_iron_shoes(mtmp)) {
            /* deltrap(), "%s warps strangely.", poly_obj(uarmf), prinv() */
            throw new Error('trapeffect_poly_trap(): iron shoes warping not ported yet');
        } else if (Antimagic()
                   || (u.uprops[UNCHANGING].intrinsic
                       || u.uprops[UNCHANGING].extrinsic)) { /* Unchanging */
            await shieldeff(game.u.ux, game.u.uy);
            await You_feel("momentarily different.");
            /* Trap did nothing; don't remove it --KAA */
        } else {
            await steedintrap(trap, null);
            deltrap(trap); /* delete trap before polymorph */
            newsym(u.ux, u.uy); /* get rid of trap symbol */
            await You_feel("a change coming over you.");
            await polyself_tp(POLY_NOFLAGS_TP);
        }
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === u.usteed);

        if (wearing_iron_shoes(mtmp)) {
            /* remove and readd the shoes to forcibly unwear them */
            let shoes = which_armor(mtmp, W_ARMF);
            extract_from_minvent(mtmp, shoes, true, true);
            if (mpickobj(mtmp, shoes)) {
                impossible("re-equipping iron shoes destroyed them?");
                return Trap_Effect_Finished;
            }
            shoes = await poly_obj(
                shoes, shoes.otyp === IRON_SHOES ? KICKING_BOOTS : IRON_SHOES);
            /* now equip them again */
            if (shoes) {
                mtmp.misc_worn_check = (mtmp.misc_worn_check || 0) | W_ARMF;
                shoes.owornmask = W_ARMF;
                await update_mon_extrinsics(mtmp, shoes, true, true);
            }
        } else if (resists_magm(mtmp)) {
            await shieldeff_mon_tp(mtmp);
        } else if (!resist(mtmp, WAND_CLASS_TP, 0, NOTELL)) {
            await newcham_tp(mtmp, null, NC_SHOW_MSG_TP);
            if (in_sight)
                seetrap(trap);
        }
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapeffect_vibrating_square()
async function trapeffect_vibrating_square(mtmp, trap, trflags) {
    const u = game.u;

    if (mtmp === game.youmonst) {
        feeltrap(trap);
        /* messages handled elsewhere; the trap symbol is merely to mark the
           square for future reference */
    } else {
        const in_sight = canseemon(mtmp) || (mtmp === u.usteed);
        const see_it = cansee(mtmp.mx, mtmp.my);

        if (see_it && !Blind()) {
            seetrap(trap); /* before messages */
            if (in_sight) {
                let buf, monnm = mon_nam(mtmp);

                if (nolimbs_tr(mtmp.data) || m_in_air(mtmp)) {
                    /* just "beneath <mon>" */
                    buf = monnm;
                } else {
                    buf = s_suffix(monnm) + " ";
                    /* avoid "beneath 'rear paws'" or 'rear hooves' */
                    buf += strsubst_tr(makeplural(mbodypart_tr(mtmp, FOOT)),
                                       "rear ", "");
                }
                await You_see_l(`a strange vibration beneath ${buf}.`);
            } else {
                /* notice something (hearing uses a larger threshold
                   for 'nearby') */
                await You_see_l(`the ground vibrate ${
                    (mdistu(mtmp) <= 2 * 2) ? "nearby" : "in the distance"}.`);
            }
        }
    }
    return Trap_Effect_Finished;
}

async function trapeffect_selector(mtmp, trap, trflags) {
    switch (trap.ttyp) {
    case ARROW_TRAP:
        return trapeffect_arrow_trap(mtmp, trap, trflags);
    case DART_TRAP:
        return trapeffect_dart_trap(mtmp, trap, trflags);
    case ROCKTRAP:
        return trapeffect_rocktrap(mtmp, trap, trflags);
    case SQKY_BOARD:
        return trapeffect_sqky_board(mtmp, trap, trflags);
    case BEAR_TRAP:
        return trapeffect_bear_trap(mtmp, trap, trflags);
    case SLP_GAS_TRAP:
        return trapeffect_slp_gas_trap(mtmp, trap, trflags);
    case RUST_TRAP:
        return trapeffect_rust_trap(mtmp, trap, trflags);
    case FIRE_TRAP:
        return trapeffect_fire_trap(mtmp, trap, trflags);
    case PIT:
    case SPIKED_PIT:
        return trapeffect_pit(mtmp, trap, trflags);
    case HOLE:
    case TRAPDOOR:
        return trapeffect_hole(mtmp, trap, trflags);
    case LEVEL_TELEP:
        return trapeffect_level_telep(mtmp, trap, trflags);
    case TELEP_TRAP:
        return trapeffect_telep_trap(mtmp, trap, trflags);
    case WEB:
        return trapeffect_web(mtmp, trap, trflags);
    case STATUE_TRAP:
        return trapeffect_statue_trap(mtmp, trap, trflags);
    case MAGIC_TRAP:
        return trapeffect_magic_trap(mtmp, trap, trflags);
    case ANTI_MAGIC:
        return trapeffect_anti_magic(mtmp, trap, trflags);
    case LANDMINE:
        return trapeffect_landmine(mtmp, trap, trflags);
    case MAGIC_PORTAL:
        return trapeffect_magic_portal(mtmp, trap, trflags);
    case ROLLING_BOULDER_TRAP:
        return trapeffect_rolling_boulder_trap(mtmp, trap, trflags);
    case POLY_TRAP:
        return trapeffect_poly_trap(mtmp, trap, trflags);
    case VIBRATING_SQUARE:
        return trapeffect_vibrating_square(mtmp, trap, trflags);
    default:
        /* impossible("%s encountered a strange trap of type %d.") */
        break;
    }
    return Trap_Effect_Finished;
}

// C ref: trap.c trapnote()
function trapnote(trap, noprefix) {
    const tnnames = [
        "C note",  "D flat", "D note",  "E flat",
        "E note",  "F note", "F sharp", "G note",
        "G sharp", "A note", "B flat",  "B note",
    ];
    const tn = tnnames[trap.tnote];
    return (!noprefix ? just_an(tn) : '') + tn;
}

// C ref: trap.c seetrap()
export function seetrap(trap) {
    if (!trap.tseen) {
        trap.tseen = 1;
        newsym(trap.tx, trap.ty);
    }
}

// C ref: trap.c m_easy_escape_pit()
/* can monster escape from a pit easily */
function m_easy_escape_pit(mtmp) {
    return (mtmp.data === mons[PM_PIT_FIEND]
            || mtmp.data.msize >= MZ_HUGE);
}

// C ref: trap.c mintrap()
export async function mintrap(mtmp, mintrapflags) {
    const trap = t_at(mtmp.mx, mtmp.my);
    const mptr = mtmp.data;
    let trap_result = Trap_Effect_Finished;

    if (!trap) {
        mtmp.mtrapped = 0;      /* perhaps teleported? */
    } else if (mtmp.mtrapped) { /* is currently in the trap */
        if (!trap.tseen && cansee(mtmp.mx, mtmp.my) && canseemon(mtmp)
            && (is_pit(trap.ttyp) || trap.ttyp === BEAR_TRAP
                || trap.ttyp === HOLE
                || trap.ttyp === WEB)) {
            /* If you come upon an obviously trapped monster, then
               you must be able to see the trap it's in too. */
            seetrap(trap);
        }

        if (!rn2(40) || (is_pit(trap.ttyp) && m_easy_escape_pit(mtmp))) {
            if (sobj_at(BOULDER, mtmp.mx, mtmp.my)
                && is_pit(trap.ttyp)) {
                if (!rn2(2)) {
                    mtmp.mtrapped = 0;
                    if (canseemon(mtmp))
                        await pline_mon(mtmp, `${Monnam(mtmp)} pulls free...`);
                    await fill_pit(mtmp.mx, mtmp.my);
                }
            } else {
                if (canseemon(mtmp)) {
                    set_msg_xy(mtmp.mx, mtmp.my);
                    if (is_pit(trap.ttyp))
                        await pline(`${Monnam(mtmp)} climbs ${
                            m_easy_escape_pit(mtmp) ? "easily " : ""}out of the pit.`);
                    else if (trap.ttyp === BEAR_TRAP || trap.ttyp === WEB)
                        await pline(`${Monnam(mtmp)} pulls free of the ${
                            trapname(trap.ttyp, false)}.`);
                }
                mtmp.mtrapped = 0;
            }
        } else if (metallivorous(mptr)) {
            if (trap.ttyp === BEAR_TRAP) {
                if (canseemon(mtmp))
                    await pline_mon(mtmp, `${Monnam(mtmp)} eats a bear trap!`);
                deltrap(trap);
                mtmp.meating = 5;
                mtmp.mtrapped = 0;
            } else if (trap.ttyp === SPIKED_PIT) {
                if (canseemon(mtmp))
                    await pline_mon(mtmp, `${Monnam(mtmp)} munches on some spikes!`);
                trap.ttyp = PIT;
                mtmp.meating = 5;
            }
        }
        trap_result = mtmp.mtrapped ? Trap_Caught_Mon : Trap_Effect_Finished;
    } else {
        const tt = trap.ttyp;
        let forcetrap = ((mintrapflags & FORCETRAP) !== 0);
        const forcebungle = (mintrapflags & FORCEBUNGLE) !== 0;
        /* monster has seen such a trap before */
        const already_seen = (mon_knows_traps(mtmp, tt)
                              || (tt === HOLE && !mindless(mptr)));

        if (fixed_tele_trap(trap)) {
            mintrapflags |= FORCETRAP;
            forcetrap = true;
        }

        if (mtmp === game.u.usteed) {
            ; /* true when called from dotrap, inescapable is not an option */
        } else if (game.level.flags.sokoban_rules && (is_pit(tt) || is_hole(tt))
                   && !trap.madeby_u) {
            ; /* nothing here, the trap effects will handle messaging */
        } else if (!forcetrap) {
            if (floor_trigger(tt) && check_in_air(mtmp, mintrapflags)) {
                return Trap_Effect_Finished;
            }
            if (already_seen && rn2(4) && !forcebungle)
                return Trap_Effect_Finished;
        }

        mon_learns_traps(mtmp, tt);
        mons_see_trap(trap);

        /* Monster is aggravated by being trapped by you.
           Recognizing who made the trap isn't completely
           unreasonable; everybody has their own style. */
        if (trap.madeby_u && rnl(5))
            await setmangry(mtmp, false);

        trap_result = await trapeffect_selector(mtmp, trap, mintrapflags);

        /* mtmp can't stay hiding under an object if trapped in non-pit
           (mtmp hiding under object at armed bear trap location, hero
           zaps wand of locking or spell of wizard lock at spot triggering
           the trap and trapping mtmp there) */
        if (!(mtmp.mhp < 1) && mtmp.mtrapped) {
            const alreadyspotted = canspotmon_l(mtmp);

            maybe_unhide_at(mtmp.mx, mtmp.my);
            if (!alreadyspotted && canseemon(mtmp))
                await pline_mon(mtmp, `${Amonnam(mtmp)} appears.`);
        }
    }
    return trap_result;
}

/* mondata.h */

// C ref: trap.c m_harmless_trap()
/* is trap ttmp harmless to monster mtmp? */
export function m_harmless_trap(mtmp, ttmp) {
    const mdat = mtmp.data;
    const Sokoban = game.level.flags.sokoban_rules;

    /* this handles most of the traps, but those are still included
       in the switch case below for completeness */
    if (!Sokoban && floor_trigger(ttmp.ttyp) && check_in_air(mtmp, 0))
        return true;

    switch (ttmp.ttyp) {
    case ARROW_TRAP:
        break;
    case DART_TRAP:
        break;
    case ROCKTRAP:
        break;
    case SQKY_BOARD:
        break;
    case BEAR_TRAP:
        if (mdat.msize <= MZ_SMALL || amorphous(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case LANDMINE:
        break;
    case ROLLING_BOULDER_TRAP:
        break;
    case SLP_GAS_TRAP:
        if (resists_sleep(mtmp) || defended(mtmp, AD_SLEE))
            return true;
        break;
    case RUST_TRAP:
        if (mdat !== mons[PM_IRON_GOLEM])
            return true;
        break;
    case FIRE_TRAP:
        if (resists_fire(mtmp) || defended(mtmp, AD_FIRE))
            return true;
        break;
    case PIT:
    case SPIKED_PIT:
    case HOLE:
    case TRAPDOOR:
        if (is_clinger(mdat) && !Sokoban)
            return true;
        break;
    case TELEP_TRAP:
        break;
    case LEVEL_TELEP:
        break;
    case MAGIC_PORTAL:
        break;
    case WEB:
        if (amorphous(mdat) || webmaker(mdat)
            || is_whirly(mdat) || unsolid(mdat))
            return true;
        break;
    case STATUE_TRAP:
        return true;
    case MAGIC_TRAP:
        return true; /* usually */
    case ANTI_MAGIC:
        if (resists_magm(mtmp) || defended(mtmp, AD_MAGM))
            return true;
        break;
    case POLY_TRAP:
        break;
    case VIBRATING_SQUARE:
        return true;
    default:
        /* impossible("m_harmless_trap: unknown trap %i") */
        break;
    }

    return false;
}

// C ref: trap.c choose_trapnote()
function choose_trapnote(ttmp) {
    const tavail = new Array(12).fill(0), tpick = new Array(12).fill(0);
    let tcnt = 0;

    for (const t of ftraps())
        if (t.ttyp === SQKY_BOARD && t !== ttmp)
            tavail[t.tnote] = 1;
    /* now populate tpick[] with the available indices */
    for (let k = 0; k < 12; ++k)
        if (tavail[k] === 0)
            tpick[tcnt++] = k;
    /* choose an unused note; if all are in use, pick a random one */
    return (tcnt > 0) ? tpick[rn2(tcnt)] : rn2(12);
}

// C ref: trap.c dng_bottom()
function dng_bottom(lev) {
    let bottom = dunlevs_in_dungeon(lev);

    /* when in the upper half of the quest, don't fall past the
       middle "quest locate" level if hero hasn't been there yet */
    if (In_quest(lev)) {
        const qlocate_depth = game.dungeon_topology.d_qlocate_level.dlevel;

        /* deepest reached < qlocate implies current < qlocate */
        /* dunlev_reached(lev): svd.dungeons[lev->dnum].dunlev_ureached */
        if (game.dungeons[lev.dnum].dunlev_ureached < qlocate_depth)
            bottom = qlocate_depth; /* early cut-off */
    } else if (In_hell(lev)) {
        if (!game.u.uevent?.invoked)
            bottom -= 1;
    }
    return bottom;
}

// C ref: trap.c hole_destination()
function hole_destination(dst) {
    const bottom = dng_bottom(game.u.uz);

    dst.dnum = game.u.uz.dnum;
    dst.dlevel = dunlev(game.u.uz);
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}

// C ref: trap.c find_random_launch_coord()
/* try to find a random coordinate where launching a rolling boulder
   could work. return TRUE if found, with coordinate in cc. */
function find_random_launch_coord(ttmp, cc) {
    let tmp;
    let success = false;
    const bcc = { x: 0, y: 0 };
    let distance;
    let mindist = 4;
    let trycount = 0;
    let dx, dy;
    let x, y;

    if (!ttmp || !cc || game.level.flags.sokoban_rules) /* Sokoban */
        return false;

    x = ttmp.tx;
    y = ttmp.ty;

    const launchplace = game.launchplace || { x: 0, y: 0 };
    bcc.x = ttmp.tx + launchplace.x;
    bcc.y = ttmp.ty + launchplace.y;
    if (isok(bcc.x, bcc.y) && linedup(ttmp.tx, ttmp.ty, bcc.x, bcc.y, 1)) {
        cc.x = bcc.x;
        cc.y = bcc.y;
        return true;
    }

    if (ttmp.ttyp === ROLLING_BOULDER_TRAP)
        mindist = 2;
    distance = rn1(5, 4); /* 4..8 away */
    tmp = rn2(N_DIRS); /* randomly pick a direction to try first */
    while (distance >= mindist) {
        dx = xdir[tmp];
        dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        /* Prevent boulder from being placed on water */
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && (is_pool(x + distance * dx, y + distance * dy)
                || is_lava(x + distance * dx, y + distance * dy))) /* is_pool_or_lava() */
            success = false;
        else
            success = isclearpath(cc, distance, dx, dy);
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            let success_otherway;

            bcc.x = x;
            bcc.y = y;
            success_otherway = isclearpath(bcc, distance, -(dx), -(dy));
            if (!success_otherway)
                success = false;
        }
        if (success)
            break;
        if (++tmp > 7)
            tmp = 0;
        if ((++trycount % 8) === 0)
            --distance;
    }
    return success;
}

// C ref: trap.c mkroll_launch()
function mkroll_launch(ttmp, x, y, otyp, ocount) {
    let otmp;
    const cc = { x: 0, y: 0 };
    let success = false;

    success = find_random_launch_coord(ttmp, cc);

    if (!success) {
        /* create the trap without any ammo, launch pt at trap location */
        cc.x = x;
        cc.y = y;
    } else {
        otmp = mksobj(otyp, true, false);
        otmp.quan = ocount;
        otmp.owt = weight(otmp);
        place_object(otmp, cc.x, cc.y);
        stackobj(otmp);
    }
    ttmp.launch = { x: cc.x, y: cc.y };
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    } else
        ttmp.launch_otyp = otyp;
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}

// C ref: trap.c isclearpath()
function isclearpath(cc, distance, dx, dy) {
    let t;
    let typ;
    let x, y;

    x = cc.x;
    y = cc.y;
    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y))
            return false;
        typ = game.level.at(x, y).typ;
        if (!ZAP_POS(typ) || closed_door(x, y))
            return false;
        if ((t = t_at(x, y)) != null
            && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp)))
            return false;
    }
    cc.x = x;
    cc.y = y;
    return true;
}

// C ref: trap.c maketrap()
export function maketrap(x, y, typ) {
    let oldplace;
    let ttmp;
    const lev = game.level.at(x, y);

    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST)
        return null;

    if ((ttmp = t_at(x, y)) !== null) {
        if (undestroyable_trap(ttmp.ttyp))
            return null;
        oldplace = true;
        /* u.utrap handling: the hero isn't on the level during mklev */
    } else if (!CAN_OVERWRITE_TERRAIN(lev.typ) /* stairs */
               || IS_POOL(lev.typ) || lev.typ === LAVAPOOL
               || (IS_FURNITURE(lev.typ) && (typ !== PIT && typ !== HOLE))
               || (lev.typ === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)
               || (IS_AIR(lev.typ) && typ !== MAGIC_PORTAL)
               || (typ === LEVEL_TELEP
                   && Is_knox_level(game.u.uz))) { /* single_level_branch() */
        /* no trap on top of furniture (caller usually screens the
           location to inhibit this, but wizard mode wishing doesn't)
           and no level teleporter in branch with only one level */
        return null;
    } else {
        oldplace = false;
        ttmp = { tx: x, ty: y };
    }
    /* [re-]initialize all fields except ntrap (handled below) and <tx,ty> */
    ttmp.launch = { x: -1, y: -1 }; /* force error if used before set */
    ttmp.dst = { dnum: -1, dlevel: -1 };
    ttmp.madeby_u = 0;
    ttmp.once = 0;
    ttmp.tseen = unhideable_trap(typ);
    ttmp.ttyp = typ;

    switch (typ) {
    case SQKY_BOARD:
        ttmp.tnote = choose_trapnote(ttmp);
        break;
    case STATUE_TRAP: /* create a "living" statue */
        mk_trap_statue(x, y);
        break;
    case ROLLING_BOULDER_TRAP: /* boulder will roll towards trigger */
        mkroll_launch(ttmp, x, y, BOULDER, 1);
        break;
    case PIT:
    case SPIKED_PIT:
        ttmp.conjoined = 0;
        /* FALLTHRU */
    case HOLE:
    case TRAPDOOR:
        if (is_hole(typ))
            hole_destination(ttmp.dst);
        /* shop damage (in_rooms(x, y, SHOPBASE)): no shops filled yet */
        if (lev.typ === DRAWBRIDGE_UP) {
            /* drawbridges aren't generated by this port yet */
        } else if (IS_ROOM(lev.typ)) {
            /* set_levltyp(x, y, ROOM) */
            lev.typ = ROOM;
        } else if (lev.typ === STONE || lev.typ === SCORR) {
            lev.typ = CORR;
        } else if (IS_WALL(lev.typ) || lev.typ === SDOOR) {
            lev.typ = game.level.flags.is_maze_lev ? ROOM
                      : game.level.flags.is_cavernous_lev ? CORR
                        : DOOR;
        }
        lev.flags = 0;

        unearth_objs_l(x, y);
        recalc_block_point_l(x, y);
        break;
    case TELEP_TRAP: {
        /* gl.launchplace is only set by special-level loaders */
        const launchplace = game.launchplace || { x: 0, y: 0 };
        if (isok(launchplace.x, launchplace.y)) {
            ttmp.launch.x = game.xstart + launchplace.x; /* teledest */
            ttmp.launch.y = game.ystart + launchplace.y;
            if (ttmp.launch.x === x && ttmp.launch.y === y) {
                /* impossible("making fixed-dest tele trap pointing to itself") */
            }
        }
        break;
    }
    }

    if (!oldplace) {
        /* C prepends to gf.ftrap */
        ftraps().unshift(ttmp);
    }
    return ttmp;
}

// C ref: trap.c rnd_nextto_goodpos()
/* pick a random goodpos() next to x,y and write its coordinates to xy;
   returns TRUE if found, FALSE if not */
export function rnd_nextto_goodpos(xy, mtmp) {
    let i, j;
    const is_u = (mtmp === game.youmonst);
    let nx, ny, k;
    const dirs = new Array(N_DIRS);

    for (i = 0; i < N_DIRS; ++i)
        dirs[i] = i;
    for (i = N_DIRS; i > 0; --i) {
        j = rn2(i);
        k = dirs[j];
        dirs[j] = dirs[i - 1];
        dirs[i - 1] = k;
    }
    for (i = 0; i < N_DIRS; ++i) {
        nx = xy.x + xdir[dirs[i]];
        ny = xy.y + ydir[dirs[i]];
        /* crawl_destination and goodpos both include an isok() check */
        if (is_u ? crawl_destination(nx, ny) : goodpos(nx, ny, mtmp, 0)) {
            xy.x = nx;
            xy.y = ny;
            return true;
        }
    }
    return false;
}

/* C ref: trap.c blindgas[] */
const blindgas = ["humid", "odorless", "pungent", "chilling",
                  "acrid", "biting"];

// C ref: trap.c chest_trap()
/* only called when the player is doing something to the chest directly;
   returns True if chest is destroyed, False if it remains in play */
export async function chest_trap(obj, bodypart, disarm) {
    const u = game.u;
    let otmp = obj;
    let msg;

    const loc = get_obj_location(obj, 0); /* might be carried */
    if (loc)
        obj.ox = loc[0], obj.oy = loc[1];

    otmp.tknown = 0;   /* for xname(); will be set to 1 below */
    otmp.otrapped = 0; /* trap is one-shot; clear flag first in case
                        * chest kills you and ends up in bones file */
    await You(disarm ? "set it off!" : "trigger a trap!");
    await tty_display_nhwindow(game.WIN_MESSAGE, false);
    if (Luck() > -13 && rn2(13 + Luck()) > 7) { /* saved by luck */
        /* trap went off, but good luck prevents damage */
        switch (rn2(13)) {
        case 12:
        case 11:
            msg = "explosive charge is a dud";
            break;
        case 10:
        case 9:
            msg = "electric charge is grounded";
            break;
        case 8:
        case 7:
            msg = "flame fizzles out";
            break;
        case 6:
        case 5:
        case 4:
            msg = "poisoned needle misses";
            break;
        case 3:
        case 2:
        case 1:
        case 0:
            msg = "gas cloud blows away";
            break;
        default:
            msg = null;
            break;
        }
        if (msg)
            await pline(`But luckily the ${msg}!`);
    } else {
        switch (rn2(20) ? ((Luck() >= 13) ? 0 : rn2(13 - Luck())) : rn2(26)) {
        case 25:
        case 24:
        case 23:
        case 22:
        case 21:
            throw new Error('chest_trap(): exploding chest not ported yet');
        case 20:
        case 19:
        case 18:
        case 17:
            await pline(`A cloud of noxious gas billows from ${the(xname(obj))}.`);
            if (rn2(3))
                await poisoned("gas cloud", A_STR, "cloud of poison gas", 15,
                               false);
            else
                await create_gas_cloud(obj.ox, obj.oy, 1, 8);
            await exercise(A_CON, false);
            break;
        case 16:
        case 15:
        case 14:
        case 13:
            await You_feel(`a needle prick your ${body_part(bodypart)}.`);
            await poisoned("needle", A_CON, "poisoned needle", 10, false);
            await exercise(A_CON, false);
            break;
        case 12:
        case 11:
        case 10:
        case 9:
            await dofiretrap(obj);
            break;
        case 8:
        case 7:
        case 6: {
            let dmg = d(4, 4);
            const orig_dmg = dmg;

            await You("are jolted by a surge of electricity!");
            if (Shock_resistance()) {
                await shieldeff(game.u.ux, game.u.uy);
                await You("don't seem to be affected.");
                monstseesu_tr(M_SEEN_ELEC);
                dmg = 0;
            } else {
                monstunseesu_tr(M_SEEN_ELEC);
            }
            await destroy_items_tr(game.youmonst, AD_ELEC, orig_dmg);
            if (dmg)
                await losehp(dmg, "electric shock", KILLED_BY_AN);
            break;
        } /* case 6 */
        case 5:
        case 4:
        case 3:
            if (!(uprop(FREE_ACTION).intrinsic || uprop(FREE_ACTION).extrinsic)) {
                await pline("Suddenly you are frozen in place!");
                nomul(-d(5, 6));
                game.multi_reason = "frozen by a trap";
                await exercise(A_DEX, false);
                game.nomovemsg = "You can move again."; /* You_can_move_again */
            } else
                await You("momentarily stiffen.");
            break;
        case 2:
        case 1:
        case 0:
            await pline(`A cloud of ${Blind() ? ROLL_FROM(blindgas) : rndcolor()} gas billows from ${
                the(xname(obj))}.`);
            if (!Stunned()) {
                if (Hallucination())
                    await pline("What a groovy feeling!");
                else
                    await You(`${stagger(game.youmonst.data, "stagger")}${
                        Halluc_resistance() ? ""
                                            : Blind() ? " and get dizzy"
                                                      : " and your vision blurs"}...`);
            }
            await make_stunned((HStun() & TIMEOUT) + rn1(7, 16), false);
            await make_hallucinated(
                (HHallucination() & TIMEOUT) + rn1(5, 16), false, 0);
            break;
        default:
            break;
        }
        game.disp_botl = true; /* bot(): to get immediate botl re-display */
    }

    obj.tknown = 1; /* hero knows chest is no longer trapped */
    return false;
}

// C ref: trap.c b_trapped()
/* used for doors (also tins).  can be used for anything else that opens. */
export async function b_trapped(item, bodypart) {
    const lvl = level_difficulty(),
        dmg = rnd(5 + (lvl < 5 ? lvl : 2 + Math.trunc(lvl / 2)));

    /* Soundeffect(se_kaboom, 80) */
    await pline(`KABOOM!!  ${The(item)} was booby-trapped!`);
    await wake_nearby(false);
    await losehp(Maybe_Half_Phys(dmg), "explosion", KILLED_BY_AN);
    await exercise(A_STR, false);
    if (bodypart !== NO_PART)
        await exercise(A_CON, false);
    await make_stunned((HStun() & TIMEOUT) + dmg, true);
}

// C ref: trap.c dountrap() -- the #untrap command
export async function dountrap() {
    if (!(await could_untrap(true, false)))
        return ECMD_OK_TR;

    return (await untrap(false, 0, 0, null)) ? ECMD_TIME_TR : ECMD_OK_TR;
}

// C ref: trap.c could_untrap()
/* preliminary checks for dountrap(); also used for autounlock */
export async function could_untrap(verbosely, check_floor) {
    let buf = '';
    const ptr = game.youmonst.data;

    if (near_capacity_tr() >= HVY_ENCUMBER_TR) {
        buf = "You're too strained to do that.";
    } else if ((nohands(ptr) && !webmaker(ptr)) || !ptr.mmove) {
        buf = "And just how do you expect to do that?";
    } else if (game.u.ustuck && sticks_tr(ptr)) {
        buf = `You'll have to let go of ${mon_nam_tr(game.u.ustuck)} first.`;
    } else if (game.u.ustuck || (welded_tr(game.uwep) && bimanual_tr(game.uwep))) {
        buf = `Your ${makeplural_tr(body_part_tr(HAND_TR))} seem to be too busy for that.`;
    } else if (check_floor && !can_reach_floor_tr(false)) {
        /* only checked here for autounlock of chest/box and that will
           be !verbosely so precise details of the message don't matter */
        buf = `You can't reach the ${surface_tr(game.u.ux, game.u.uy)}.`;
    }
    if (buf) {
        if (verbosely)
            await pline(buf);
        return 0;
    }
    return 1;
}

// C ref: trap.c untrap() -- only the usual case's direction prompt is
// ported; the rest stops explicitly
export async function untrap(force, rx, ry, container) {
    /* 'force' is true for #invoke; if carrying MKoT, make it be true
       for #untrap or autounlock (has_magic_key()) */
    void force;
    if (!rx && !container) {
        /* usual case */
        if (!(await getdir_tr(null)))
            return 0;
        throw new Error('untrap(): untrapping in a direction not ported yet');
    }
    throw new Error('untrap(): autounlock untrap not ported yet');
}

// C ref: trap.c back_on_ground()
/* print a message about being back on the ground after leaving a pool */
export async function back_on_ground(rescued) {
    const g = game;
    const u = g.u;
    let preposit = (Levitation() || Flying()) ? "over" : "on";
    let surf = surface_tr(u.ux, u.uy), you_are_back;

    if (is_ice_bg(u.ux, u.uy)) {
        /* "on ice" */
        throw new Error('back_on_ground(): ice_descr() not ported yet');
    } else if (!strcmpi_bg(surf, "floor") || !strcmpi_bg(surf, "ground")) {
        /* "on solid ground" */
        surf = "solid ground";
    } else if (!strcmpi_bg(surf, "bridge") || !strcmpi_bg(surf, "altar")
               || !strcmpi_bg(surf, "headstone")) {
        /* "on a bridge" */
        surf = an_l(surf);
    } else if (!strcmpi_bg(surf, "stairs") || !strcmpi_bg(surf, "lava")
               || !strcmpi_bg(surf, "bottom")) {
        /* "on the stairs" */
        surf = the(surf);
    } else { /* "cloud", "air", "air bubble", "wall", "fountain", "doorway" */
        /* "in a cloud", "in the air" */
        surf = (surf === "air") ? the(surf) : an_l(surf);
        preposit = "in";
    }
    if (rescued) {
        you_are_back = "You find yourself";
    } else {
        you_are_back = g.flags.verbose ? "You are back" : "Back";
    }
    await pline(`${you_are_back} ${preposit} ${surf}.`);
    g.iflags.last_msg = PLNMSG_BACK_ON_GROUND_BG;
}

// C ref: hack.c is_waterwall()
export function is_waterwall(x, y) {
    if (isok(x, y) && IS_WATERWALL_DR(game.level.at(x, y).typ))
        return true;
    return false;
}

// C ref: hack.c set_uinwater()
export async function set_uinwater(in_out) {
    if (in_out !== (game.u.uinwater ? 1 : 0)) {
        game.u.uinwater = in_out ? 1 : 0;
        await switch_terrain_dr();
    }
}

// C ref: trap.c emergency_disrobe()
/* returns TRUE if hero can get rid of enough stuff to crawl out of water */
async function emergency_disrobe(lostsome) {
    const g = game;
    let invc = inv_cnt_dr(true);

    while (near_capacity_dr() > (Punished() ? UNENCUMBERED_DR : SLT_ENCUMBER_DR)) {
        let obj, nextobj, otmp = null;
        let i;

        /* Pick a random object */
        if (invc > 0) {
            i = rn2(invc);
            for (obj = g.invent; obj; obj = nextobj) {
                nextobj = obj.nobj;
                /*
                 * Undroppables are: body armor, boots, gloves,
                 * amulets, and rings because of the time and effort
                 * in removing them + loadstone and other cursed stuff
                 * for obvious reasons.  Also, any item in the midst
                 * of being taken off or stolen.
                 */
                if (!((obj.otyp === LOADSTONE_DR && obj.cursed) || obj === g.uamul
                      || obj === g.uleft || obj === g.uright || obj === g.ublindf
                      || obj === g.uarm || obj === g.uarmc || obj === g.uarmg
                      || obj === g.uarmf || obj === g.uarmu
                      || (obj.cursed && (obj === g.uarmh || obj === g.uarms))
                      || welded_dr(obj)
                      || obj.o_id === g.stealoid || obj.in_use))
                    otmp = obj;
                /* reached the mark and found some stuff to drop? */
                if (--i < 0 && otmp)
                    break;

                /* else continue */
            }
        }
        if (!otmp)
            return false; /* nothing to drop! */
        if (otmp.owornmask)
            await remove_worn_item_dr(otmp, false);
        lostsome.v = true;
        await dropx_dr(otmp);
        invc--;
    }
    return true;
}

// C ref: trap.c rescued_from_terrain()
/* life-saving or divine rescue has attempted to get the hero out of hostile
   terrain and put hero in an unexpected spot or failed due to overfull level */
export async function rescued_from_terrain(how) {
    const find_yourself = "find yourself";
    const u = game.u;
    const lev = game.level.at(u.ux, u.uy);
    let mesggiven = false;

    switch (how) {
    case DROWNING_DR:
        if (is_pool(u.ux, u.uy)) {
            await You(`${find_yourself} ${
                (Is_waterlevel_dr(u.uz) || IS_WATERWALL_DR(lev.typ))
                  ? "in the midst" : "on top"} of ${hliquid("water")}.`);
            mesggiven = true;
        } else if (IS_AIR_DR(lev.typ)) {
            await You(`${find_yourself} in ${
                Is_waterlevel_dr(u.uz) ? "an air bubble" : "mid air"}.`);
            mesggiven = true;
        }
        break;
    case BURNING_DR: /* moved onto lava without fire resistance */
    case DISSOLVED_DR: /* sunk into lava while fire resistant */
        if (is_pool(u.ux, u.uy)) {
            await You(`${find_yourself} ${
                u.uinwater ? "in" : "on"} ${hliquid("water")}.`);
            mesggiven = true;
        } else if (is_lava(u.ux, u.uy)) {
            await You(`${find_yourself} on top of ${hliquid("molten lava")}.`);
            mesggiven = true;
        }
        break;
    default:
        break;
    }
    if (!mesggiven)
        await back_on_ground(true);

    game.iflags.last_msg = PLNMSG_BACK_ON_GROUND_BG; /* for describe_decor() */
    /* feedback just disclosed this */
    update_lastseentyp_dr(u.ux, u.uy);
    game.iflags.prev_decor = game.level.lastseentyp?.[u.ux]?.[u.uy] ?? STONE_DR;
}

// C ref: trap.c drown()
/* return TRUE iff player relocated */
export async function drown() {
    const g = game;
    const u = g.u;
    let pool_of_water;
    let inpool_ok = false;
    let i;
    let x, y;
    const is_solid = is_waterwall(u.ux, u.uy);

    feel_newsym_dr(u.ux, u.uy); /* in case Blind, map the water here */
    /* happily wading in the same contiguous pool */
    if (u.uinwater && is_pool(u.ux - u.dx, u.uy - u.dy)
        && (Swimming() || Amphibious() || Breathless())) {
        /* water effects on objects every now and then */
        if (!rn2(5))
            inpool_ok = true;
        else
            return false;
    }

    if (!u.uinwater) {
        await You(`${is_solid ? "plunge" : "fall"} into the ${
            waterbody_name_dr(u.ux, u.uy)}${
            (Amphibious() || Swimming() || Breathless()) ? '.' : '!'}`);
        if (!Swimming() && !is_solid)
            await You(`sink like ${Hallucination() ? "the Titanic" : "a rock"}.`);
    }

    await water_damage_chain(g.invent, false);

    if (u.umonnum === PM_GREMLIN_DR && rn2(3)) {
        await split_mon(g.youmonst, null);
    } else if (u.umonnum === PM_IRON_GOLEM_DR) {
        await You("rust!");
        i = Maybe_Half_Phys(d(2, 6));
        if (u.mhmax > i)
            u.mhmax -= i;
        await losehp(i, "rusting away", KILLED_BY);
    }
    if (inpool_ok)
        return false;

    if ((i = number_leashed()) > 0) {
        await pline_The(`leash${(i > 1) ? "es" : ""} slip${
            (i > 1) ? "" : "s"} loose.`);
        unleash_all();
    }

    if (Amphibious() || Breathless() || Swimming()) {
        /* "But you aren't drowning.", touch bottom, set_uinwater(1),
           under_water(1) */
        throw new Error('drown(): staying under water (under_water()) not ported yet');
    }
    if ((Teleportation() || can_teleport_dr(g.youmonst.data)) && !Unaware_dr()
        && (Teleport_control() || rn2(3) < Luck() + 2)) {
        throw new Error('drown(): teleport spell out of the water not ported yet');
    }
    if (u.usteed) {
        await dismount_steed(DISMOUNT_GENERIC);
        if (!is_pool(u.ux, u.uy))
            return true;
    }
    /* if sleeping, wake up now so that we don't crawl out of water
       while still asleep; we can't do that the same way that waking
       due to combat is handled; note unmul() clears u.usleep */
    if (u.usleep)
        await unmul_dr("Suddenly you wake up!");
    /* being doused will revive from fainting */
    if (u.uhs === 5 /* is_fainted() */)
        throw new Error('drown(): reset_faint() not ported yet');

    x = u.ux, y = u.uy;
    const xy = { x, y };
    /* have to be able to move in order to crawl */
    if (g.multi >= 0 && g.youmonst.data.mmove
        && rnd_nextto_goodpos(xy, g.youmonst)) {
        x = xy.x, y = xy.y;
        const lost = { v: false };
        /* time to do some strip-tease... */
        const succ = Is_waterlevel_dr(u.uz) ? true : await emergency_disrobe(lost);

        await You(`try to crawl out of the ${hliquid("water")}.`);
        if (lost.v)
            await You("dump some of your gear to lose weight...");
        if (succ) {
            await pline("Pheew!  That was close.");
            await teleds_dr(x, y, TELEDS_ALLOW_DRAG_DR);
            return true;
        }
        /* still too much weight */
        await pline("But in vain.");
    }
    await set_uinwater(1); /* u.uinwater = 1 */
    await urgent_pline("You drown.");
    /* first pass is survivable by using up an amulet of life-saving or by
       answering no to "Die?" in explore|wizard mode; second pass can only
       be survivable via the latter */
    for (i = 0; i < 2; i++) {
        /* killer format and name are reconstructed every iteration
           because lifesaving resets them */
        pool_of_water = waterbody_name_dr(u.ux, u.uy);
        killer().format = KILLED_BY_AN;
        /* avoid "drowned in [a] water" */
        if (pool_of_water === "water")
            pool_of_water = "deep water", killer().format = KILLED_BY;
        /* avoid "drowned in _a_ limitless water" on Plane of Water */
        else if (pool_of_water === "limitless water")
            killer().format = KILLED_BY;
        killer().name = pool_of_water;
        await done_dr(DROWNING_DR);
        /* oops, we're still alive.  better get out of the water. */
        if (await safe_teleds_dr(TELEDS_ALLOW_DRAG_DR | TELEDS_TELEPORT_DR))
            break; /* successful life-save */
        /* nowhere safe to land; repeat drowning loop... */
        await pline("You're still drowning.");
    }

    if (u.uinwater)
        await set_uinwater(0); /* u.uinwater = 0 */
    await rescued_from_terrain(DROWNING_DR);
    return true;
}

// C ref: trap.c unconscious()
export function unconscious() {
    if (game.multi >= 0)
        return false;

    return !!(game.u.usleep
              || (game.nomovemsg
                  && (game.nomovemsg.startsWith("You awake")
                      || game.nomovemsg.startsWith("You regain con")
                      || game.nomovemsg.startsWith("You are consci"))));
}

const lava_killer = "molten lava";

// C ref: trap.c lava_effects()
/* return TRUE iff hero changes location while surviving the problem */
export async function lava_effects() {
    const g = game;
    const u = g.u;
    let obj, obj2, nextobj;
    let usurvive, boil_away;
    let protect_oid = 0;
    let burncount = 0, burnmesgcount = 0;
    const dmg = d(6, 6); /* only applicable for water walking */

    if (g.iflags.in_lava_effects) {
        /* debugpline0("Skipping recursive lava_effects()."); */
        return false;
    }
    feel_newsym_dr(u.ux, u.uy); /* in case Blind, map the lava here */
    await burn_away_slime_dr();
    if (likes_lava(g.youmonst.data))
        return false;

    usurvive = Fire_resistance() || (Wwalking() && dmg < u.uhp);
    /*
     * A timely interrupt might manage to salvage your life
     * but not your gear.  For scrolls and potions this
     * will destroy whole stacks, where fire resistant hero
     * survivor only loses partial stacks via destroy_items().
     *
     * Flag items to be destroyed before any messages so
     * that player causing hangup at --More-- won't get an
     * emergency save file created before item destruction.
     */
    if (!usurvive) {
        for (obj = g.invent; obj; obj = nextobj) {
            nextobj = obj.nobj;
            if (obj.in_use) { /* remove_worn_item() sets in_use */
                /* one item can be protected from burning up */
                if (!protect_oid) {
                    protect_oid = obj.o_id;
                    obj.in_use = 0;
                } else {
                    console.error(`impossible: lava_effects: #${obj.o_id} is already in use; so is #${protect_oid}.`);
                }
                continue;
            }
            /* set obj->in_use for items which will be destroyed below */
            if ((is_organic_dr(obj) || obj.oclass === POTION_CLASS_DR)
                && !obj.oerodeproof
                && objects_dr[obj.otyp].oc_oprop !== FIRE_RES_DR
                && obj.otyp !== SCR_FIRE_DR && obj.otyp !== SPE_FIREBALL_DR
                && !obj_resists_dr(obj, 0, 0)) /* for invocation items */
                obj.in_use = 1;
        }
    }

    /* Check whether we should burn away boots *first* so we know whether to
     * make the player sink into the lava. Assumption: water walking only
     * comes from boots.
     */
    if (g.uarmf && (g.uarmf.in_use
                    || (is_organic_dr(g.uarmf) && !g.uarmf.oerodeproof))) {
        obj = g.uarmf;
        await pline(`${Yobjnam2(obj, "burst")} into flame!`);
        ++burnmesgcount;
        g.iflags.in_lava_effects = (g.iflags.in_lava_effects || 0) + 1; /* (see above) */
        await Boots_off();
        if (obj.o_id !== protect_oid)
            useup_tr(obj);
        g.iflags.in_lava_effects--;
        ++burncount;
    }

    burn_stuff: {
    if (!Fire_resistance()) {
        if (Wwalking()) {
            await pline_The(`${hliquid("lava")} here burns you!`);
            if (usurvive) {
                await losehp(dmg, lava_killer, KILLED_BY); /* lava damage */
                break burn_stuff;
            }
        } else
            await You(`fall into the ${waterbody_name_dr(u.ux, u.uy)}!`);

        usurvive = Lifesaved() || !!g.flags.explore /* discover */;
        if (g.flags.debug) /* wizard */
            usurvive = true;

        /* prevent remove_worn_item() -> Boots_off(WATER_WALKING_BOOTS) ->
           spoteffects() -> lava_effects() recursion */
        g.iflags.in_lava_effects = (g.iflags.in_lava_effects || 0) + 1;

        for (obj = g.invent; obj; obj = obj2) {
            obj2 = obj.nobj;
            if (obj.o_id === protect_oid) {
                /* skip protected item; caller expects to retain access */
                obj.in_use = 1; /* was cleared when setting protect_oid */
            } else if (obj.otyp === SPE_BOOK_OF_THE_DEAD_DR) {
                if (usurvive && !Blind())
                    throw new Error('lava_effects(): Book of the Dead glow not ported yet');
            } else if (obj.in_use) {
                if (obj.owornmask) {
                    if (usurvive) {
                        await pline(`${Yobjnam2(obj, "burst")} into flame!`);
                        ++burnmesgcount;
                    }
                    await remove_worn_item_dr(obj, true);
                }
                useupall_dr(obj);
                ++burncount;
            }
        }
        if (usurvive && burncount > burnmesgcount)
            await pline(`${(burnmesgcount > 0)
                    ? ((burncount - burnmesgcount === 1) ? "Another" : "Other")
                    : ((burncount === 1) ? "An" : "Some")} item${
                  (burncount - burnmesgcount === 1) ? "" : "s"} in your inventory ${
                  (burncount - burnmesgcount === 1) ? "has" : "have"} been destroyed.`);

        /* s/he died... */
        boil_away = (u.umonnum === PM_WATER_ELEMENTAL_DR
                     || u.umonnum === PM_STEAM_VORTEX_DR
                     || u.umonnum === PM_FOG_CLOUD_DR);
        /* burn to death; if hero is life-saved on the first pass, try
           to teleport to safety; if that fails, burn all over again */
        for (burncount = 0; burncount < 2; ++burncount) {
            u.uhp = -1;
            /* killer format and name are reconstructed every iteration
               because lifesaving resets them */
            killer().format = KILLED_BY;
            killer().name = lava_killer;
            await urgent_pline(`You ${boil_away ? "boil away"
                                                : "burn to a crisp"}...`);
            await done_dr(BURNING_DR);
            if (await safe_teleds_dr(TELEDS_ALLOW_DRAG_DR | TELEDS_TELEPORT_DR))
                break; /* successful life-save */
            /* nowhere safe to land; repeat burning loop */
            await pline("You're still burning.");
        }

        g.iflags.in_lava_effects--;

        if (burncount === 2) {
            /* life-saved twice and failed to be teleported to safety
               both times */
            throw new Error('lava_effects(): surviving the lava twice not ported yet');
        }
        await rescued_from_terrain(BURNING_DR);

        /* normally done via safe_teleds() -> teleds() -> spoteffects() but
           spoteffects() was no-op when called with nonzero in_lava_effects */
        await spoteffects_dr(false); /* suppress auto-pickup for this landing... */

        return true;
    } else if (!Wwalking() && (!u.utrap || u.utraptype !== TT_LAVA_DR)) {
        boil_away = !Fire_resistance();
        /* if not fire resistant, sink_into_lava() will quickly be fatal;
           hero needs to escape immediately */
        set_utrap(rn1(4, 4) + ((boil_away ? 2 : rn1(4, 12)) << 8), TT_LAVA_DR);
        await You(`sink into the ${waterbody_name_dr(u.ux, u.uy)}${
            !boil_away ? ", but it only burns slightly"
                       : " and are about to be immolated"}!`);
        if (Fire_resistance())
            monstseesu_tr(M_SEEN_FIRE);
        else
            monstunseesu_tr(M_SEEN_FIRE);
        if (u.uhp > 1)
            await losehp(!boil_away ? 1 : Math.trunc(u.uhp / 2), lava_killer,
                         KILLED_BY); /* lava damage */
    }
    } /* burn_stuff */

    /* burn_stuff: */
    await destroy_items_tr(g.youmonst, AD_FIRE_TR, dmg);
    await ignite_items(g.invent);
    return false;
}

// C ref: trap.c fire_damage()
/* Set an item on fire.  Return whether the object was destroyed. */
export async function fire_damage(
    obj,
    force, /* if True, skip luck-based protection check */
    x, y) { /* where to place contents of burned up container */
    let chance;
    const in_sight = !Blind() && couldsee(x, y); /* Don't care if it's lit */
    let dindx;

    /* object might light in a controlled manner */
    if (await catch_lit(obj))
        return false;

    if (Is_container(obj) || obj.otyp === STATUE) {
        switch (obj.otyp) {
        case STATUE:
        case ICE_BOX:
            return false; /* Immune */
        case CHEST:
            chance = 40;
            break;
        case LARGE_BOX:
            chance = 30;
            break;
        default:
            chance = 20;
            break;
        }
        if ((!force && (Luck() + 5) > rn2(chance))
            /* note: containers aren't subject to erosion so are never
               marked fireproof/corrodeproof/&c */
            /*|| (is_flammable(obj) && obj->oerodeproof)*/
            ) {
            return false;
        }
        /* Container is burnt up - dump contents out */
        if (in_sight)
            await pline(`${Yname2_fd(obj)} catches fire and burns.`);
        if (obj.cobj && obj.cobj.length) { /* Has_contents(obj) */
            if (in_sight)
                await pline("Its contents fall out.");
            /* for (otmp = obj->cobj; otmp; otmp = ncobj): cobj[] is kept
               in C's chain order (newest first) */
            for (const otmp of obj.cobj.slice()) {
                obj_extract_self_l(otmp);
                if (!(await flooreffects_l(otmp, x, y, "")))
                    place_object(otmp, x, y);
            }
        }
        setnotworn_fd(obj);
        delobj(obj);
        return true;
    } else if (!force && (Luck() + 5) > rn2(20)) {
        /*  chance per item of sustaining damage:
          *     max luck (Luck==13):    10%
          *     avg luck (Luck==0):     75%
          *     awful luck (Luck<-4):  100%
          */
        return false;
    } else if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS) {
        if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL)
            return false;
        if (obj.otyp === SPE_BOOK_OF_THE_DEAD) {
            if (in_sight)
                await pline(`Smoke rises from ${the(xname(obj))}.`);
            return false;
        }
        dindx = (obj.oclass === SCROLL_CLASS) ? 3 : 4;
        if (in_sight)
            await pline(`${Yname2_fd(obj)} ${
                destroy_strings_fd[dindx][(obj.quan > 1) ? 1 : 0]}.`);
        setnotworn_fd(obj);
        delobj(obj);
        return true;
    } else if (obj.oclass === POTION_CLASS) {
        dindx = (obj.otyp !== POT_OIL_TR) ? 1 : 2;
        if (in_sight)
            await pline(`${Yname2_fd(obj)} ${
                destroy_strings_fd[dindx][(obj.quan > 1) ? 1 : 0]}.`);
        setnotworn_fd(obj);
        delobj(obj);
        return true;
    } else if (await erode_obj(obj, null, ERODE_BURN, EF_DESTROY)
               === 3 /* ER_DESTROYED */) {
        return true;
    }
    return false;
}

/* C ref: zap.c destroy_strings[] (the rows fire_damage() uses) */
const destroy_strings_fd = [
    [ "freezes and shatters", "freeze and shatter", "shattered potion" ],
    [ "boils and explodes", "boil and explode", "boiling potion" ],
    [ "ignites and explodes", "ignite and explode", "exploding potion" ],
    [ "catches fire and burns", "catch fire and burn", "burning scroll" ],
    [ "catches fire and burns", "", "burning book" ],
    [ "turns to dust and vanishes", "", "" ],
    [ "breaks apart and explodes", "", "exploding wand" ],
];

// C ref: trap.c fire_damage_chain()
/*
 * Apply fire_damage() to an entire chain.
 *
 * Return number of objects destroyed. --ALI
 *
 * "chain" is the chain in C's order: an array (the pile at a map spot, top
 * first, standing in for ->nexthere, or a monster's minvent reversed into
 * C's newest-first order), or the head of an ->nobj chain (hero inventory);
 * "here" only picks the link in C.
 */
export async function fire_damage_chain(chain, force, here, x, y) {
    let num = 0;

    void here;
    /* erode_obj() relies on bhitpos if target objects aren't carried by
       the hero or a monster, to check visibility controlling feedback */
    if (!game.bhitpos)
        game.bhitpos = { x: 0, y: 0 };
    game.bhitpos.x = x, game.bhitpos.y = y;

    if (Array.isArray(chain)) {
        for (const obj of chain.slice()) {
            if (await fire_damage(obj, force, x, y))
                ++num;
        }
    } else {
        let nobj;
        for (let obj = chain; obj; obj = nobj) {
            nobj = obj.nobj;
            if (await fire_damage(obj, force, x, y))
                ++num;
        }
    }

    if (num && (Blind() && !couldsee(x, y)))
        await You("smell smoke.");
    return num;
}

// C ref: trap.c lava_damage()
/* obj has been thrown or dropped into lava; damage is worse than mere fire */
export async function lava_damage(obj, x, y) {
    const otyp = obj.otyp, ocls = obj.oclass;

    /* the Amulet, invocation items, and Rider corpses are never destroyed
       (let Book of the Dead fall through to fire_damage() to get feedback) */
    if (obj_resists_dr(obj, 0, 0) && otyp !== SPE_BOOK_OF_THE_DEAD)
        return false;
    /* destroy liquid (venom), wax, veggy, flesh, paper (except for scrolls
       and books--let fire damage deal with them), cloth, leather, wood, bone
       unless it's inherently or explicitly fireproof or contains something;
       note: potions are glass so fall through to fire_damage() and boil */
    if (objects[otyp].oc_material < DRAGON_HIDE_FD
        && ocls !== SCROLL_CLASS && ocls !== SPBOOK_CLASS
        && objects[otyp].oc_oprop !== FIRE_RES
        && otyp !== WAN_FIRE_FD && otyp !== FIRE_HORN_FD
        /* assumes oerodeproof isn't overloaded for some other purpose on
           non-eroding items */
        && !obj.oerodeproof
        /* fire_damage() knows how to deal with containers and contents */
        && !(obj.cobj && obj.cobj.length) /* !Has_contents(obj) */) {
        if (cansee(x, y)) {
            /* this feedback is pretty clunky and can become very verbose
               when former contents of a burned container get here via
               flooreffects() */
            if (obj === game.thrownobj || obj === game.kickedobj)
                await pline(`${(obj.quan !== 1) /* is_plural(obj) */
                               ? "They" : "It"} ${otense_fd(obj, "burn")} up!`);
            else
                await You_see_l(`${doname(obj)} hit lava and burn up!`);
        }
        if (obj.where === 'OBJ_INVENT') { /* carried(obj): shouldn't happen */
            await remove_worn_item_dr(obj, true);
            useupall_dr(obj);
        } else
            delobj(obj);
        return true;
    }
    return await fire_damage(obj, true, x, y);
}

// C ref: trap.c sink_into_lava()
/* called each turn by moveloop() while hero is trapped in lava */
export async function sink_into_lava() {
    const u = game.u;
    const sink_deeper = "You sink deeper into the lava.";

    if (!u.utrap || u.utraptype !== TT_LAVA_DR) {
        ; /* do nothing; this usually won't happen but could after
           * polymorphing from a flier into a ceiling hider and then hiding;
           * allmain() only checks whether the hero is at a lava location,
           * not whether he or she is currently sinking */
    } else if (!is_lava(u.ux, u.uy)) {
        await reset_utrap(false); /* this shouldn't happen either */
    } else if (!u.uinvulnerable) {
        /* ordinarily we'd have to be fire resistant to survive long
           enough to become stuck in lava, but it can happen without
           resistance if water walking boots allow survival and then
           get burned up; u.utrap time will be quite short in that case */
        if (!Fire_resistance())
            u.uhp = Math.trunc((u.uhp + 2) / 3);

        u.utrap -= (1 << 8);
        if (u.utrap < (1 << 8)) {
            killer().format = KILLED_BY;
            killer().name = "molten lava";
            await urgent_pline("You sink below the surface and die.");
            await burn_away_slime_dr(); /* add insult to injury? */
            await done_dr(DISSOLVED_DR);
            /* can only get here via life-saving; try to get away from lava */
            await reset_utrap(true);
            /* levitation or flight have become unblocked, otherwise Tport */
            if (!Levitation() && !Flying())
                await safe_teleds_dr(TELEDS_ALLOW_DRAG_DR | TELEDS_TELEPORT_DR);
        } else if (!u.umoved) {
            /* can't fully turn into slime while in lava, but might not
               have it be burned away until you've come awfully close */
            const Slimed = uprop(SLIMED_SL).intrinsic;
            if (Slimed && rnd(10 - 1) >= (Slimed & TIMEOUT_SL)) {
                await pline(sink_deeper);
                await burn_away_slime_dr();
            } else {
                await Norep(sink_deeper);
            }
            u.utrap += rnd(4);
        }
    }
}

/* C ref: decl.c c_common_strings.c_the_your[] */
const the_your_ht = ["the", "your"];

// C ref: trap.c reward_untrap()
async function reward_untrap(ttmp, mtmp) {
    if (!ttmp.madeby_u) {
        if (rnl(10) < 8 && !mtmp.mpeaceful && !helpless(mtmp)
            && !mtmp.mfrozen && !(mtmp.data.mflags1 & M1_MINDLESS_HT) /* mindless() */
            && !(mtmp.data.geno & G_UNIQ_HT) /* unique_corpstat() */
            && mtmp.data.mlet !== S_HUMAN_HT) {
            mtmp.mpeaceful = 1;
            set_malign_ht(mtmp); /* reset alignment */
            await pline(`${Monnam(mtmp)} is grateful.`);
        }
        /* Helping someone out of a trap is a nice thing to do.
           A lawful may be rewarded, but not too often.  */
        if (!rn2(3) && !rnl(8) && game.u.ualign.type === A_LAWFUL_HT) {
            adjalign_ht(1);
            await You_feel_ht("that you did the right thing.");
        }
    }
}

// C ref: trap.c openholdingtrap()
/* for magic unlocking; returns true if targeted monster (which might
   be hero) gets untrapped; the trap remains intact */
export async function openholdingtrap(
    mon,
    noticed) { /* noticed.v set to true iff hero notices the effect;
                * otherwise left with its previous value intact */
    const u = game.u;
    let t;
    let buf;
    let trapdescr = null, which = null;
    let ishero = (mon === game.youmonst);

    if (!mon)
        return false;
    if (mon === u.usteed)
        ishero = true;

    t = t_at(ishero ? u.ux : mon.mx, ishero ? u.uy : mon.my);

    if (ishero && u.utrap) { /* all u.utraptype values are holding traps */
        /* there might not be any trap at hero's spot for tt_buriedball;
           conversely, there might be an unrelated trap at that spot */
        if (!t) {
            t = { tseen: 0, madeby_u: 0, tx: 0, ty: 0, ttyp: 0 };
            /* fallback 't' is now nonNull, t->tseen and t->madeby_u are 0 */
        }
        which = the_your_ht[(!t || !t.tseen || !t.madeby_u) ? 0 : 1];

        switch (u.utraptype) {
        case TT_LAVA_HT:
            trapdescr = "molten lava";
            break;
        case TT_INFLOOR_HT:
            /* solidified lava, so not "floor" even if within a room */
            trapdescr = "ground";
            break;
        case TT_BURIEDBALL_HT:
            trapdescr = "your anchor";
            which = "";
            break;
        case TT_BEARTRAP_HT:
        case TT_PIT_HT:
        case TT_WEB_HT:
            /* defsyms[S_web / S_pit / S_bear_trap].explanation */
            trapdescr = (u.utraptype === TT_WEB_HT) ? "web"
                        : (u.utraptype === TT_PIT_HT) ? "pit"
                          : "bear trap";
            break;
        default:
            /* lint suppression in case 't' is unexpectedly Null
               or u.utraptype has new value we don't know about yet */
            trapdescr = "trap";
            break;
        }
    } else {
        /* if no trap here or it's not a holding trap, we're done */
        if (!t || (t.ttyp !== BEAR_TRAP && t.ttyp !== WEB))
            return false;
        trapdescr = trapname(t.ttyp, false);
    }
    if (which === null)
        which = t.tseen ? the_your_ht[t.madeby_u ? 1 : 0]
                        : "aeiouAEIOU".includes(trapdescr[0]) ? "an" : "a"; /* vowels[] */
    if (which)
        which = which + " ";

    if (ishero) {
        if (!u.utrap)
            return false;
        noticed.v = true;
        if (!u.usteed)
            buf = "You are";
        else if (u.utraptype === TT_BURIEDBALL_HT)
            buf = `You and ${y_monnam_ht(u.usteed)} are`;
        else
            buf = `${noit_Monnam_ht(u.usteed)} is`;
        /* give release message before untrap in case it triggers a message */
        await pline(`${buf} released from ${which}${trapdescr}.`);
        /* might float up if Levitation is being unblocked */
        game.vision_full_recalc = 1; /* vision limits can change (pit escape) */
        await reset_utrap(true);
        if (game.vision_full_recalc)
            vision_recalc_ht(0);
    } else {
        if (!mon.mtrapped)
            return false;
        mon.mtrapped = 0;
        if (canspotmon_l(mon)) {
            noticed.v = true;
            await pline(`${Monnam(mon)} is released from ${which}${trapdescr}.`);
        } else if (cansee(t.tx, t.ty) && t.tseen) {
            noticed.v = true;
            if (t.ttyp === WEB)
                await pline(`Something is released from ${which}${trapdescr}.`);
            else /* BEAR_TRAP */
                await pline(`${which ? which[0].toUpperCase() + which.slice(1)
                                     : which}${trapdescr} opens.`); /* upstart() */
        }
        /* might pacify monster if adjacent */
        if (rn2(2) && m_next2u_ht(mon))
            await reward_untrap(t, mon);
    }
    return true;
}

// C ref: trap.c closeholdingtrap()
/* for magic locking; returns true if targeted monster (which might
   be hero) gets hit by a trap (might avoid actually becoming trapped) */
export async function closeholdingtrap(
    mon,
    noticed) { /* noticed.v set to true iff hero notices the effect;
                * otherwise left with its previous value intact */
    const u = game.u;
    let t;
    let dotrapflags;
    let ishero = (mon === game.youmonst), result;

    if (!mon)
        return false;
    if (mon === u.usteed)
        ishero = true;
    t = t_at(ishero ? u.ux : mon.mx, ishero ? u.uy : mon.my);
    /* if no trap here or it's not a holding trap, we're done */
    if (!t || (t.ttyp !== BEAR_TRAP && t.ttyp !== WEB))
        return false;

    if (ishero) {
        if (u.utrap)
            return false; /* already trapped */
        noticed.v = true;
        dotrapflags = FORCETRAP_HT;
        /* dotrap calls mintrap when mounted hero encounters a web */
        if (u.usteed)
            dotrapflags |= NOWEBMSG_HT;
        await dotrap(t, dotrapflags | FORCETRAP_HT);
        result = (u.utrap !== 0);
    } else {
        if (mon.mtrapped)
            return false; /* already trapped */
        /* you notice it if you see the trap close/tremble/whatever
           or if you sense the monster who becomes trapped */
        noticed.v = cansee(t.tx, t.ty) || canspotmon_l(mon);
        result = ((await mintrap(mon, FORCETRAP_HT)) !== Trap_Effect_Finished);
    }
    return result;
}

// C ref: trap.c openfallingtrap()
/* for magic unlocking; returns true if targeted monster (which might
   be hero) gets hit by a trap (target might avoid its effect) */
export async function openfallingtrap(
    mon,
    trapdoor_only,
    noticed) { /* noticed.v set to true iff hero notices the effect; */
               /* otherwise left with its previous value intact */
    const u = game.u;
    let t;
    let ishero = (mon === game.youmonst), result;

    if (!mon)
        return false;
    if (mon === u.usteed)
        ishero = true;
    t = t_at(ishero ? u.ux : mon.mx, ishero ? u.uy : mon.my);
    /* if no trap here or it's not a falling trap, we're done
       (note: falling rock traps have a trapdoor in the ceiling) */
    if (!t || ((t.ttyp !== TRAPDOOR && t.ttyp !== ROCKTRAP)
               && (trapdoor_only || (t.ttyp !== HOLE && !is_pit(t.ttyp)))))
        return false;

    if (ishero) {
        if (u.utrap)
            return false; /* already trapped */
        noticed.v = true;
        await dotrap(t, FORCETRAP_HT);
        result = (u.utrap !== 0);
    } else {
        if (mon.mtrapped)
            return false; /* already trapped */
        /* you notice it if you see the trap close/tremble/whatever
           or if you sense the monster who becomes trapped */
        noticed.v = cansee(t.tx, t.ty) || canspotmon_l(mon);
        /* monster will be angered; mintrap doesn't handle that */
        await wakeup_ht(mon, true);
        result = ((await mintrap(mon, FORCETRAP_HT)) !== Trap_Effect_Finished);
        /* mon might now be on the migrating monsters list */
    }
    return result;
}
