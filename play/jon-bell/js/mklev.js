import { xname } from './do_wear.js';
import { WAND_CLASS } from './const.js';
import { TOOL_CLASS } from './const.js';
import { AMULET_CLASS } from './const.js';
import { CORPSE } from './const.js';
import { POT_OIL } from './const.js';
import { ARMOR_CLASS, FOOD_CLASS, GEM_CLASS, HEAVY_IRON_BALL, POTION_CLASS, POT_EXTRA_HEALING, POT_GAIN_ENERGY, POT_HEALING, POT_SPEED, RING_CLASS, SCROLL_CLASS, SCR_CONFUSE_MONSTER, SCR_ENCHANT_ARMOR, SCR_ENCHANT_WEAPON, SPBOOK_CLASS, SPE_HEALING, TALLOW_CANDLE, WAN_DIGGING, WEAPON_CLASS } from "./const.js"; // shared class/otyp constants
import { pline_mon } from './pline.js';
import { impossible_sync } from './display.js';
import { ledger_no as ledger_no_real } from './dungeon.js';
import { quest_monster_died } from './quest.js';
import { BALL_CLASS, CHAIN_CLASS, STRANGE_OBJECT } from './objnam.js';
import { is_quest_artifact } from './questpgr.js';
import { invocation_pos } from './hack.js';
import { coord_desc } from './getpos.js';
import { surface } from './dungeon.js';
import { removed_from_icebox } from './pickup.js';
import { explode } from './explode.js';
import { EXPL_FIERY } from './const.js';
import { xdir, ydir } from './const.js';
import { PM_PYROLISK, PM_ANGEL, PM_PESTILENCE, PM_STALKER } from './pm.generated.js';
import { Deaf as Deaf_live, rumor_file_open, rumor_rnd_line } from './display.js';
import { init_rumors } from './rumors.js';
import { Norep } from './pline.js';
import { You_feel } from './pline.js';
import { nonliving as lifesave_nonliving, BOULDER, G_GENOD, NON_PM, PM_HIGH_CLERIC, TIN } from './makemon.js';
import { m_useup as lifesave_m_useup } from './mthrowu.js';
import { discover_object as lifesave_discover_object, isWanNothingNodir, objdescr_is as objdescr_is_real } from './o_init.js';
import { s_suffix as lifesave_s_suffix, ordin as logdeadmon_ordin } from './hacklib.js';
import { wary_dog, dismount_steed as dismount_steed_mk, sticks, tamedog as tamedog_mk, newedog } from './dog.js';
import { m_into_limbo } from './mon.js';
import { MM_EDOG, MM_ESHK } from './const.js';
import { debugpline } from './display.js';
import { is_unicorn } from './makemon.js';
import { rndmonnum } from './mkobj.js';
import { mondied as mondied_ml } from './mon.js';
import { xkilled as xkilled_ml } from './mon.js';
import { cloneu } from './mhitu.js';
import { XKILL_NOMSG, DISMOUNT_GENERIC } from './const.js';
import { flooreffects_obj_meld, flooreffects_obj_nexto_xy, flooreffects_pudding_merge_message } from './cmd.js';
import { switch_terrain } from './hack.js';
import { useup as useup_inv } from './invent.js';
import { water_damage_chain as water_damage_chain_ml } from './trap.js';
import { is_youmonst } from './mhitm.js';
import { hliquid as hliquid_ml } from './do_name.js';
import { on_fire as on_fire_ml } from './mondata.js';
import { W_AMUL, HEALTHY_TIN, FLYING, LEVITATION } from './const.js';
import { is_mines_prize as is_mines_prize_real, is_soko_prize as is_soko_prize_real } from './cmd.js';
import { may_passwall, in_town, disturb_buried_zombies } from './hack.js';
import { fire_damage_chain } from './trap.js';
import { breaktest } from './dothrow.js';
import { mons_cnutrit } from './food_props.js';
import { unstuck as unstuck_mk, mon_leaving_level as mon_leaving_level_mk } from './mon.js';
import { m_unleash as m_unleash_mk } from './apply.js';
// @ts-nocheck
// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.
import { game, wizard } from './gstate.js';
import { def_oc_syms_chars } from './drawing.js';
import { BUFSZ, FODDERSHOP, M_AP_F_DKNOWN } from './const.js';
import { PM_PURPLE_WORM as PM_PURPLE_WORM_MK, PM_MAIL_DAEMON } from './pm.generated.js';
import { PM_PIRANHA, PM_ELECTRIC_EEL, PM_GREMLIN as PM_GREMLIN_ML, PM_IRON_GOLEM as PM_IRON_GOLEM_ML } from './pm.generated.js';
import { PM_GRAY_OOZE as PM_GRAY_OOZE_MK } from './pm.generated.js';
import { PM_YELLOW_DRAGON as PM_YELLOW_DRAGON_MC, PM_WHITE_UNICORN as PM_WHITE_UNICORN_MC, PM_BLACK_UNICORN as PM_BLACK_UNICORN_MC } from './pm.generated.js';
import { nexttodoor } from './mkroom.js';
import { OBJ_MINVENT, OBJ_LUAFREE } from './const.js';
import { fill_supply_chest, save_mtraits, free_omid, bless, curse, weight } from './mkobj.js'; // C mkobj.c:1888 weight()
import { cant_revive } from './read.js';
import { init_fruit_chain } from './options.js';
import { MKOBJ_OC_CLASS, MKOBJ_OC_PROB, MKOBJ_OCLASS_PROB_TOTALS, MKOBJ_SVB_BASES, } from './mkobj_data.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP, MKOBJ_OC_SKILL, } from './mkobj_erosion_meta.js';
import { GameMap, newobj, freed_obj_chunks } from './game.js';
import { rn1, pushRngLogEntry } from './rng.js';
import { rn2, rnd, rne, rnz, rnl as rnl_mc, d as d_ml } from './rnd.js';
import { put_saddle_on_mon, place_monster, poly_steed } from './steed.js';
import { minimal_monnam } from './do_name.js';
import { rndmonstAdj, rndmonnumAdj, newMonHp, assignMakemonFemale, isArmedMndx, mInitweap, mInitinv, makemonDomesticSaddle, levelDifficulty, Inhell, mkclass, mkclassAligned, peaceMinded, monGeno, permonstTemplate, newmextra, is_ndemon, is_dprince, propagate, grow_up } from './makemon.js';
import { dmgtype_fromattack, olfaction, set_mon_data } from './mondata.js';
import { m_in_air } from './mon.js';
import { splitobj } from './makemon.js'; // C mkobj.c:458 (re-export)
import { noteleport_level } from './teleport.js';
import { mon_set_minvis } from './worn.js';
import { more_experienced } from './exper.js';
import { dng_bottom } from './trap.js';
import { christen_monst } from './mhitm.js';
import { rndghostname, roguename, y_monnam, Amonnam } from './do_name.js';
import { update_inventory } from './invent.js';
import { seemimic } from './mon.js';
import { growl } from './sounds.js';
import { big_to_little, little_to_big, mon_hates_silver, passes_bars, resist_conflict, locomotion } from './mondata.js';
/* hideunder()'s "You see %s %s under %s." (C mon.c:4787-4796) */
import { ansimpleoname, ARTILIST, ARTI_NOGEN, ARTI_GEN_SPE, vtense, makeplural, getObjDescr, objName, simpleonames } from './objnam.js';
import { oname } from './do_name.js';
import { quest_info } from './questpgr.js';
import { artifact_exists } from './artifact.js';
/* C mkobj.c:1248 mksobj()'s SPE_NOVEL arm calls do_name.c's noveltitle(). */
import { noveltitle, safe_oname, mon_pmname } from './do_name.js';
import { nartifact_exist } from './artifact.js'; /* artifact.c:461-471 */
import { _ARTI_GIFT_INFO, _mk_artifact_by_align } from './cmd.js';
import { _artifact_origin } from './objnam.js';
import { ONAME_RANDOM } from './const.js';
import { set_quest_leader_m_id } from './cmd.js';
import { set_msg_xy } from './pline.js';
import { _earth_sense } from './cmd.js';
import { PLNMSG_HIDE_UNDER, PLNMSG_GROWL, Is_earthlevel } from './const.js';
import { PROT_FROM_SHAPE_CHANGERS } from './const.js';
import { DEFSYM_EXPLANATION } from './defsym_data.js';
/* C makemon.c:1384 mongets() — makemon's `mitem` block hands the extra
 * starting item over the same helper m_initweap uses. */
import { mongets } from './makemon.js';
import { monhaskey, m_can_break_boulder, can_fog, mon_track_clear, can_hide_under_obj } from './monmove.js';
import { mon_allowflags as mon_allowflags_mv } from './mon.js';
import { emits_light, set_malign, mbirth_limit, MAXMONNO, role_maligntyp } from './makemon.js';
import { findgold } from './steal.js';
import { attacktype_fordmg } from './mondata.js';
import { monflee, onscary } from './monmove.js';
import { which_armor } from './worn.js';
/* C wizard.c:605 nasty()'s before/after monster count. */
import { monster_census, msummon, newemin } from './minion.js';
import { aggravate as aggravate_real } from './wizard.js';
/* C makemon.c:1347-1349's light-source registration (light.c / monflag.h). */
import { new_light_source, del_light_source, obj_merge_light_sources, snuff_light_source } from './light.js';
import { artifact_light } from './artifact.js';
import { monst_to_any } from './hack.js';
import { get_obj_location } from './zap.js';
import { LS_MONSTER } from './const.js';
import { PM_WATCHMAN, PM_WATCH_CAPTAIN, PM_COCKATRICE, PM_CHICKATRICE, PM_GRID_BUG, PM_FLOATING_EYE, PM_AIR_ELEMENTAL, PM_FIRE_VORTEX, PM_FLAMING_SPHERE, PM_FIRE_ELEMENTAL, PM_SALAMANDER, PM_GREEN_SLIME, PM_MANES, PM_VAMPIRE, PM_VAMPIRE_LORD, PM_VLAD_THE_IMPALER, PM_VROCK, PM_HEZROU, PM_MINOTAUR, PM_WUMPUS, PM_LONG_WORM, PM_GIANT_EEL, PM_ARCHEOLOGIST, PM_WIZARD, PM_ELF, PM_BAT, PM_GIANT_BAT, PM_VAMPIRE_BAT, PM_GRAY_DRAGON, PM_NURSE, PM_GELATINOUS_CUBE, PM_STONE_GOLEM, PM_BABY_PURPLE_WORM,
         PM_ROTHE, PM_BARBARIAN, PM_NEANDERTHAL, PM_HORNED_DEVIL, PM_BALROG,
         PM_ASMODEUS, PM_DISPATER, PM_YEENOGHU, PM_ORCUS,
         PM_HUMAN_WEREJACKAL, PM_HUMAN_WERERAT, PM_HUMAN_WEREWOLF,
         PM_WEREJACKAL, PM_WERERAT, PM_WEREWOLF, PM_OWLBEAR,
         PM_STEAM_VORTEX, PM_VIOLET_FUNGUS, PM_SHRIEKER,
         PM_WHITE_UNICORN, PM_GRAY_UNICORN, PM_BLACK_UNICORN, PM_JELLYFISH,
         PM_PONY, PM_ORC, PM_CAVEMAN } from './pm.generated.js';
/* C makemon.c:1405-1409 — the long worm's tail. */
import { get_wormno, initworm, count_wsegs, place_worm_tail_randomly, worm_seg_clear_level,
         remove_worm as remove_worm_mk, wormgone as wormgone_mk,
         worm_cross } from './worm.js';
import { tt_oname, tt_doppel } from './topten.js';
import { enexto_core, enexto_out, rloc_to, rloc, tele_restrict } from './teleport.js';
import { deal_with_overcrowding, vamprises } from './mon.js';
import { registerSpLevSomexy } from './sp_lev_loc.js';
import { reset_xystart_size } from './sp_lev.js';
/* themerms.lua's 'Pillars' contents callback — lives with the other des.*
 * primitives it uses (sel_set_ter / get_location_coord). */
import { themerooms_contents_pillars, themerooms_contents_random_dungeon_feature, find_montype, get_location_coord, create_des_coder } from './sp_lev.js';
import { mkportal } from './mkmaze.js';
import { find_level, induced_align } from './dungeon.js';
import { selection_new, selection_setpoint, selection_getpoint, selection_getbounds, selection_do_grow } from './selvar.js';
import { nhlib_filler_region_rng_consume, nhlib_fill_storeroom_rng, nhlib_fill_buried_treasure_rng, nhlib_fill_ice_room_rng, nhlib_fill_cloud_room_rng, nhlib_percent, nhlib_fill_garden_rng, nhlib_math_random_two_arg, nhlib_fill_temple_of_gods_rng, nhlib_fill_ghost_rng, nhlib_fill_teleportation_hub_rng, } from './nhlib.js';
import { litstate_rnd } from './mkmap.js';
import { getbones } from './bones.js';
import { recalc_block_point } from './vision.js';
import { does_block, unblock_point } from './vision.js';
import { COULD_SEE, IN_SIGHT, TT_BURIEDBALL, NO_TRAP_FLAGS } from './const.js';
import { reset_utrap, mintrap } from './trap.js';
import { buried_ball_to_punishment } from './dig.js';
import { fracture_rock, montraits, zombie_can_dig, get_container_location } from './zap.js';
import { yname } from './objnam.js';
import { CONTAINED_TOO, BURIED_TOO } from './const.js';
import { is_pool } from './look.js';
import { flush_screen, force_more } from './display.js';
/* Vault guards are normally dismissed through mongone's common inventory
 * path; vault.c's grddead() must first clear any temporary corridor when the
 * guard is the special vault monster. */
import { grddead } from './vault.js';
/* C ref: mklev.c:928 — clear_level_structures() calls region.c's
 * clear_regions().  region.js imports m_poisongas_ok back from this file;
 * both edges are runtime-only function references, so the cycle resolves. */
import { clear_regions, create_gas_cloud, create_gas_cloud_selection, poisoncloud_at, visible_region_at } from './region.js';
/* C mon.c:5485 newcham() invokes the shared worn.c mon_break_armor helper
 * even during creation (its pronoun locals are evaluated before armor tests). */
import { mon_break_armor } from './worn.js';
import { FALSE_RUMORS, FALSE_RUMOR_OFFSETS, FALSE_RUMOR_SIZE, TRUE_RUMORS, TRUE_RUMOR_OFFSETS, TRUE_RUMOR_SIZE, ENGRAVE_LINES, ENGRAVE_OFFSETS, ENGRAVE_CHUNK_SIZE, EPITAPH_LINES, EPITAPH_OFFSETS, EPITAPH_CHUNK_SIZE, } from './engrave_data.js';
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import { new_mgivenname } from './do_name.js';
import monsPack from './makemon_mons.json' with { type: 'json' };
import corpseWeightPack from './eat_corpse_data.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { OC_WEIGHT } from './oc_weight.generated.js';
import { init_rect, rnd_rect, get_rect, split_rects, within_bounded_area } from './rect.js';
import { insert_branch } from './dungeon.js';
import { consumeDungeonInitRng } from './dungeon_rng.js';
import { paniclog } from './files.js';
import { registerStaticReset } from './statics.js';
import { PM_LEPRECHAUN, PM_DWARF, PM_GNOME } from './pm.generated.js';
import { distmin, dist2 } from './hacklib.js';
import { depth as depth_of_level } from './dungeon.js';
import { oinit } from './o_init.js';
import { LOW_PM, COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, IS_AIR, MAX_TYPE, INVALID_TYPE, NO_ROOM, AIR, CLOUD, THRONE, HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, D_NODOOR, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED, D_SECRET, OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED, Is_rogue_level, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST, LEPREHALL, MORGUE, BARRACKS, SWAMP, TEMPLE, SHOPBASE, SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE, DIR_N, DIR_S, DIR_E, DIR_W, DIR_180, IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL, SPACE_POS, isok, MATCH_WALL, W_NONDIGGABLE, W_NONPASSWALL, W_ARMG, FILL_NONE, FILL_NORMAL, WM_MASK, WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM, WM_T_LONG, WM_T_BL, WM_T_BR, WM_C_OUTER, WM_C_INNER, WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR, ICE, MOAT, POOL, WATER, TREE, LAVAPOOL, LAVAWALL, DBWALL, A_LAWFUL, Align2amask, LR_TELE, LR_UPTELE, LR_DOWNTELE, RLOC_NOMSG, NO_MINVENT, In_quest, In_endgame, In_mines, In_V_tower, Is_oracle_level, Is_waterlevel, CORPSTAT_INIT, CORPSTAT_FEMALE, CORPSTAT_MALE, CORPSTAT_NEUTER, CORPSTAT_SPE_VAL, CORPSTAT_NONE, G_GONE, FIRE_RES, NO_TRAP, TRAPNUM, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST, MKTRAP_NOFLAGS, MKTRAP_NOSPIDERONWEB, MKTRAP_SEEN, MKTRAP_MAZEFLAG, MKTRAP_NOVICTIM, is_pit, is_hole, Is_knox_level, ROT_AGE, TAINT_AGE, TROLL_REVIVE_CHANCE, DUST, BURN, MARK, ENGR_BLOOD, HEADSTONE, N_ENGRAVE, OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_BURIED, OBJ_DELETED, OBJ_INVENT, OBJ_MIGRATING, OBJ_ONBILL, ACCESSIBLE, u_at, GP_AVOID_MONPOS, GP_CHECKSCARY, MM_IGNOREWATER, MM_MINVIS, STRAT_WAITFORU, STRAT_CLOSE, STRAT_APPEARMSG, MM_NOWAIT, MM_EGD, MM_EPRI, MM_EMIN, MM_NOCOUNTBIRTH, MM_NOMSG, MM_MALE, MM_FEMALE, CORPSTAT_GENDER, ismnum, In_sokoban, ALLOW_MDISP, ALLOW_TRAPS, ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL, NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS, ALLOW_SANCT, ALLOW_SSM, NOGARLIC, CONFLICT, IS_TREE, IS_WATERWALL, DRAWBRIDGE_UP, DISPLACED, INVIS, W_ARMS, engulfing_u, POISON_RES, MAGICAL_BREATHING, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD, SET_LIT_NOCHANGE, ZAP_POS, is_xport, N_DIRS, Is_botlevel, Is_stronghold, XL_UP, XL_DOWN, XL_LEFT, XL_RIGHT, SP_COORD_IS_RANDOM,
/* mktemple()'s shrine bit (mkroom.c:618) */
AM_SHRINE,
/* selection_do_grow() direction mask — themerms.lua make_garden_walls' `data.sel:grow()`
 * defaults to "all" (nhlsel.c:631-640 growdirs2i[0] = W_ANY). */
W_ANY, W_ARM, MAX_SUBROOMS, LA_UP, LA_DOWN, DRAWBRIDGE_DOWN, } from './const.js';
import { themerooms_contents_twin_businesses } from './sp_lev.js';
import { is_pool_or_lava } from './dbridge.js';
import { closed_door } from './monmove.js';
import { may_dig } from './hack.js';
// C trap.c:456-590 has one maketrap body for level generation and play.
import { t_at, fill_pit, deltrap, maketrap } from './trap.js';
import { goodpos } from './teleport.js';
import { mon_knows_traps, mon_learns_traps } from './mondata.js';
import { m_carrying, linedup } from './mthrowu.js';
import { mon_adjust_speed, m_dowear, extract_from_minvent, update_mon_extrinsics as update_mon_extrinsics_md } from './worn.js';
/* prop.h-adjacent: trap.c's ALL_TRAPS sentinel for mon_learns_traps (const.js:2270). */
import { ALL_TRAPS } from './const.js';
import { thiefdead } from './steal.js';
import { rloco } from './teleport.js';
import { cansee, couldsee, block_point, vision_recalc, Blind as Blind_pickup } from './vision.js';
import { canseemon, canspotmon, newsym, sensemon, unmap_object, glyph_is_invisible_at, GLYPHCLS_INVIS, see_nearby_objects, map_location, swallowed } from './display.js';
import { pline, pline_The, You, You_hear, You_see } from './pline.js';
import { invalidateTerrainStatus } from './terrain-status.js';
/* rumors.c outrumor()'s is_fainted() guard.  CYCLIC (js/eat.js imports getrumor
 * from this file); is_fainted is a hoisted `export function`, so it resolves. */
import { set_tin_variety, is_fainted, food_disappears, eaten_stat, cant_finish_meal } from './eat.js';
import { mon_givit } from './mon.js';
import { book_disappears } from './spell.js';
import { impossible as lifecycle_impossible } from './pline.js';
import { LS_OBJECT } from './const.js';
/* m_calcdistress (mon.c:1180) arms — see the block above minliquid() below. */
import { were_change, is_were, new_were } from './were.js';
import { MON_FLOOR, BOLT_LIM, NC_SHOW_MSG, ARTICLE_YOUR, ARTICLE_THE, ARTICLE_A, SUPPRESS_SADDLE, ARTICLE_NONE } from './const.js';
import { MON_DETACH, MON_ENDGAME_FREE } from './const.js';
/* prop.h property indices for the Blind/Hallucination macros below.  Aliased
 * because this file already has locals named BLINDED-ish in other scopes. */
import { BLINDED as MK_BLINDED, HALLUC as MK_HALLUC, HALLUC_RES as MK_HALLUC_RES, TELEPAT as MK_TELEPAT, INVIS as MK_INVIS } from './const.js';
import { verbalize, display_text_window } from './cmd.js';
import { um_dist } from './apply.js';
/* mpickobj (steal.c:616) callees */
import { carry_obj_effects, count_unpaid, mergable, freeinv } from './invent.js';
import { obj_no_longer_held } from './do.js';
import { merged } from './invent.js';
import { oid_price_adjustment } from './shk.js';
import { shkgone } from './shk.js';
import { shkname } from './dokick.js';
import { is_ice, is_lava } from './dbridge.js';
import { subfrombill, find_objowner, onbill } from './shk.js';
/* in_rooms: the ONE implementation (js/shk.js:490, C hack.c:3497).  Imported and
 * re-exported so the modules that import it from here get the real body. */
import { costly_spot } from './shk.js';
import { in_rooms } from './hack.js';
import { W_SADDLE } from './const.js';
import { spot_stop_timers } from './timeout.js';
import { long_to_any } from './hack.js';
import { IS_ROOM, DB_UNDER, DB_ICE, DB_FLOOR, DB_MOAT, DB_LAVA, MELT_ICE_AWAY, TIMER_LEVEL, Is_juiblex_level } from './const.js';
import { shop_keeper } from './shk.js';
import { delete_contents } from './shk.js';
/* C shknam.c:793's on_level(&u.uz, &orcus_level); the real body from
 * js/dungeon.js (js/shk.js and js/priest.js now re-export the same one).
 * dungeon_branch_dnum is the canonical dungeon_branch() end2 scan. */
import { on_level, dungeon_branch_dnum, at_dgn_entrance } from './dungeon.js';
/* C zap.c:1458 obj_resists — the real body (js/dogmove.js).  It was imported
 * under an alias only because this file also declared a file-local
 * `function obj_resists(otmp, a, b) { return false; }` stub that shadowed it
 * for meatobj(); that stub is gone, so the plain name is the real body now. */
import { obj_resists, quickmimic as quickmimic_mk, finish_meating as finish_meating_mk } from './dogmove.js';
import { monstone, mon_to_stone } from './mon.js';
export { in_rooms };
import { x_monnam, noname_monnam, noit_mon_nam } from './do_name.js';
import { attacktype, poly_when_stoned } from './mondata.js';
/* ── newcham()'s equipment half, C mon.c:5484-5518.  Every import below is a
 * REAL body; where js/ has only a stub the call is spelled out locally next to
 * newcham instead (see MON_WEP_nc / possibly_unwield_nc / mselftouch_nc). ── */
import { Resists_Elem } from './mondata.js';                    /* C mondata.h resists_ston */
import { STONE_RES, NEED_WEAPON, NO_WEAPON_WANTED, NC_VIA_WAND_OR_SPELL } from './const.js';
import { setmnotwielded, mwepgone } from './weapon.js';
import { minstapetrify } from './trap.js'; /* C worn.c:290; trap.c:3927 */
import { mwelded } from './wield.js';                           /* C obj.h:434 */
import { wizdeadorgone } from './wizard.js';
import { record_achievement } from './insight.js';
import { PM_MEDUSA } from './pm.generated.js';
import { ACH_MEDU, LL_UMONST, LL_ACHIEVE } from './const.js';
import { livelog_printf } from './pline.js';
import { bypass_obj, setnotworn } from './worn.js';            /* C worn.c:1090 */
import { flooreffects } from './do.js';                      /* C do.c:161 */
import { stackobj } from './invent.js';                       /* C mkobj.c:2411 */
import { check_gear_next_turn, zombie_maker } from './mon.js';          /* C mon.c:5915 */
import { set_apparxy, dochugw } from './monmove.js';           /* C monmove.c:1421, 3735 */
/* C weapon.c:766's `distant_name(obj, doname)`.  This file used to carry local
 * THROW stubs for both names; the real bodies live in js/objnam.js and are
 * imported here under _nc names.  The stubs are GONE as of the shadow-body
 * audit — every call site in this file now goes through these aliases. */
import { readobjnam as readobjnam_mk, distant_name as distant_name_nc, doname as doname_nc, Tobjnam } from './objnam.js';
import { simpleonames as simpleonames_mk, an as an_mk, corpse_xname as corpse_xname_rc, The as The_rc } from './objnam.js';
import { DEFSYM_EXPLANATION as DEFSYM_EXPLANATION_MK } from './defsym_data.js';
import { Monnam as Monnam_rc } from './mcastu.js';
import { Adjmonnam as Adjmonnam_rc } from './do_name.js';
import { observe_object as observe_object_mk } from './o_init.js';
import { OC_NAME as OC_NAME_MK } from './oc_name_data.js';
import { obfree, deliver_obj_to_mon } from './dokick.js';
import { delobj as delobj_real } from './invent.js';
import { js_makemaz, mazexy, set_levltyp_lit, set_levltyp, bughack, bubbles_clear_level } from './mkmaze.js';
import { Invocation_lev } from './dungeon.js';
/* maybe_reset_pick — C lock.c:268; add_to_migration() below calls it when the
 * object leaving the level is a container.  RNG-free.  js/lock.js already
 * imports THIS module (wake_nearto, place_object); the resulting cycle is
 * inert because neither side calls the other during module evaluation. */
import { maybe_reset_pick } from './lock.js';
/* MIGR_TO_SPECIES (dungeon.h) — the destination code mksobj_migr_to_species()
 * stamps into owornmask; js/dokick.js's deliver_obj_to_mon() tests for it. */
import { MIGR_TO_SPECIES } from './const.js';
import { dmgtype } from './dogmove.js';
import { m_harmless_trap } from './trap.js';
import { mon_mattk_raw, expels_gu, digests_gu } from './mhitu.js';
import { is_pick } from './dig.js';
import { cvt_sdoor_to_door } from './detect.js';
import { unpunish } from './read.js';
import { bury_an_obj } from './dig.js';
import { CORPSTAT_BURIED } from './const.js';
import { m_at, mon_nam as mon_nam_wm, Monnam } from './uhitm.js';
import { experience, newexplevel } from './exper.js';
import { hastrack } from './track.js';
import { in_your_sanctuary, p_coaligned, priestini, mon_aligntyp, newepri } from './priest.js';
/* touch_artifact()'s hero branch and the artilist[] spfx/alignment/role columns
 * both already live in js/wizcmds.js; the monster branch below reads them there
 * rather than carrying a second copy. */
import { ARTI_PROPS, artifact_alignment, touch_artifact_youmonst } from './wizcmds.js';
import { getlin as getlin_wf } from './windows.js';
import { name_to_mon as name_to_mon_wf, name_to_monclass as name_to_monclass_wf } from './mondata.js';
import { healup } from './potion.js';
import { dryup as dryup_ml } from './fountain.js';
import { Upolyd } from './const.js';
/* getrumor()'s post-selection exercise(A_WIS, ...) — C rumors.c:175. */
import { A_WIS } from './const.js';
/* adjalign was used four times by setmangry() below (C mon.c setmangry — the
 * alignment penalties for angering a peaceful, a coaligned priest, or for
 * breaking Elbereth) with NO import, so every one of those was a bare
 * `ReferenceError: adjalign is not defined`.  js/attrib.js:452 has had the real
 * body all along; only the wire was missing. */
import { exercise, adjalign, ARTILIST_MTYPE } from './attrib.js';
import { attach_egg_hatch_timeout, start_timer, stop_timer, obj_stop_timers, begin_burn, end_burn } from './timeout.js';
import { ROT_ORGANIC, ROT_CORPSE, REVIVE_MON, ZOMBIFY_MON, SHRINK_GLOB, HATCH_EGG, TIMER_OBJECT, FIG_TRANSFORM } from './const.js';
/** @type {[number,number,number,number,number,number,number,number,number][]} */
const MONS_ROWS = monsPack.mons;
/** C permonst.pmnames[NUM_MGENDERS] per MON() row — the 5.0 canonical names.
 * Used only to resolve a themerms.lua monster string to an mndx. */
const MONS_PMNAMES_ROWS = monPmnamesPack.pmnames;
/* C global iflags (instance_flags) — used by minliquid, mondead, xkilled */
let iflags = { sad_feeling: false };
/** C hack.h MM_ASLEEP — monsters generated asleep */
const MM_ASLEEP = 0x00001000;
/** C hack.h MM_NOGRP — suppress creation of monster groups */
const MM_NOGRP = 0x00002000;
const M2_MALE = 0x00010000;
const M2_FEMALE = 0x00020000;
const M2_NEUTER = 0x00040000;
/** C monflag.h M2_SHAPESHIFTER */
const M2_SHAPESHIFTER = 0x00004000;
/** C monflag.h */
const G_NOCORPSE = 0x0010;
/** C role.c roles[] order — gu.urole.mnum (PM_) per initrole.
 * roles[] order is Arc Bar Cav Hea Kni Mon Pri ROG RAN Sam Tou Val Wiz (role.c
 * puts Rogue before Ranger so `-R` keeps its traditional meaning), while mons[]
 * puts `ranger` (338) before `rogue` (339) — hence the 339/338 pair at indices
 * 7 and 8.  The mnum field is the FIRST of struct Role's "important monsters"
 * shorts (you.h:191), i.e. the PLAYER-monster: role.c's Priest row reads
 * PM_CLERIC, ldrnum PM_ARCH_PRIEST.  This table previously held 338..350 —
 * every entry exactly +7, which is the quest-LEADER block (344 = "Lord
 * Carnarvon"), so uroleMnum() named a quest leader for every role.  The same
 * mapping, correct, is in js/topten.js `_TT_ROLE_MNUM`. */
const ROLE_INITROLE_TO_PM = Object.freeze([
    331, 332, 333, 334, 335, 336, 337, 339, 338, 340, 341, 342, 343,
]);
const POT_WATER = 322;
/** C objects.h — LEASH (TOOL_CLASS); leashmon overloads corpsenm (obj.h:161) */
const LEASH = 236;
/** C obj.h:384 — MAX_OIL_IN_FLASK, the age (oil amount) for a fresh POT_OIL */
import { MAX_OIL_IN_FLASK } from './const.js';
/** C objects.h — FIGURINE (not crystal ball; was mis-typed as 231) */
const FIGURINE = 241;
const EGG = 266;
const PM_HUMAN = 260;
/** monster symbols — C include/defsym.h MONSYM indices */
const S_KOBOLD = 11;
const S_ORC = 15;
const S_GNOME = 33;
const S_GIANT = 34;
const S_TROLL = 46;
const S_KOP = 37;
const S_HUMAN = 53;
const S_ZOMBIE = 52;
const S_LICH = 38;
const S_MUMMY = 39;
const S_VAMPIRE = 48;
const S_BAT = 28, S_VORTEX = 22, S_DOG = 4;
const S_DEMON = 56; /* '&' major demon */
const PM_WRAITH = 230; /* pm.generated.js PM_WRAITH = 230 */
/* Barracks squad monsters */
const PM_SOLDIER = 277;
const PM_KILLER_BEE = 1;
/* LUMP_OF_ROYAL_JELLY food (objects.h, between SLIME_MOLD=285 and CREAM_PIE=287) */
const LUMP_OF_ROYAL_JELLY = 286;
/** monsters.h indices (pm.generated.js; must match makemon tables) */
const PM_GIANT_SPIDER = 96;
const PM_LIZARD = 326;
const PM_LICHEN = 158;
const PM_BLACK_LIGHT = 119; /* C pm.generated.js — S_LIGHT class */
const PM_GHOST = 287;
const PM_DEATH = 311, PM_DEATH_R = PM_DEATH;
const PM_FAMINE = 313;
// Object/class constants — C ref: objclass.h enum objclass_classes, objects.h
const RANDOM_CLASS = 0;
const ILLOBJ_CLASS = 1;
import { COIN_CLASS } from "./const.js"; // objclass.h COIN_CLASS
const ROCK_CLASS = 14;
/** C: SPBOOK_no_NOVEL (0 - (int) SPBOOK_CLASS) */
import { SPBOOK_no_NOVEL } from './mkobj.js';
const GOLD_PIECE = 438;
/** C objects.h: first PROJECTILE arrow, then dart after bolt (MKOBJ array order; SVB[WEP]==ARROW) */
const ARROW = MKOBJ_SVB_BASES[WEAPON_CLASS]; /* FIRST_OBJECT aligned: arrow */
const DART = ARROW + 6; /* C order: arrows, bolts, dart (objects.h PROJECTILE/WEP list) */
const ROCK = 474;
const KELP_FROND = 275;
const SCR_TELEPORTATION = 333;
const BELL = 255;
const STATUE = 476;
const PM_SAMURAI = 340;
/** C align.h A_NONE */
const A_NONE = -128;
// Supply chest items (objects.h enum)
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const BAG_OF_HOLDING = 219;
const WAX_CANDLE = 225;
const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const WOODEN_HARP = 253;
const BELL_OF_OPENING = 263;
/* C include/artilist.h — the artifact numbers are that file's A() order, with
 * artilist[0] the "" placeholder: Excalibur is 1 and Demonbane is 12 (the same
 * count that gives js/cmd.js ART_OGRESMASHER 16 and ART_SUNSWORD 20). */
const ART_EXCALIBUR_MK = 1, ART_DEMONBANE_MK = 12;
/* C objects.h — food otyps for mksobj_init FOOD_CLASS (mkobj.c:914–975) */
const SLIME_MOLD = 285;
const GLOB_OF_GREEN_SLIME = 273;
const GLOB_OF_BLACK_PUDDING = 274;
const WAN_LIGHT = 410;
/** C mkobj.c:1064–1068 AMULET_CLASS curse branch */
const AMULET_OF_STRANGULATION = 203;
/** C mkobj.c may_generate_eroded — worm tooth / unicorn horn */
const WORM_TOOTH = 42;
const UNICORN_HORN = 261;
const WOOD = 8;
const IRON = 11;
const COPPER = 13;
const GLASS = 19;
const FOOD_RATION = 293;
const CRAM_RATION = 292;
const LEMBAS_WAFER = 291;
/** @type {number[]} permonst.cwt (corpse weight) per mons[] index — js/eat_corpse_data.json */
export const MONS_CWT = corpseWeightPack.cwt;
// Direction deltas

/* C artifact.c:2837 permapoisoned(obj) — currently only Grimtooth (artilist
 * order: NONARTIFACT, EXCALIBUR, STORMBRINGER, MJOLLNIR, CLEAVER, GRIMTOOTH
 * => 5).  Same local copy js/potion.js carries; js/objnam.js has a third,
 * unexported one. */
import { permapoisoned } from './artifact.js';
function uroleMnum() {
    const ir = game.flags?.initrole;
    if (typeof ir === 'number' && ir >= 0 && ir < ROLE_INITROLE_TO_PM.length)
        return ROLE_INITROLE_TO_PM[ir] | 0;
    return PM_HUMAN;
}
/** C mondata.h is_human — M2_HUMAN */
const M2_HUMAN_TOOL = 0x8;
function mons_is_human(mndx) {
    const r = MONS_ROWS[mndx | 0];
    return !!r && ((r[7] | 0) & M2_HUMAN_TOOL) !== 0;
}
/* C hack.h obj_to_any(obj) — the `anything` union wrapper.  This used to
 * return the object ITSELF, which was harmless only while stop_timer was a
 * no-op stub returning null; the real timeout.c API (now ported in
 * js/timeout.js) compares `arg.a_obj`, so the union shape is load-bearing. */
import { obj_to_any } from './hack.js';
// ── C mkobj.c mkobj_erosions + material helpers (mkobj.c:177-223,2272-2298, objnam.c:1195-1214, obj.h is_weptool) ──
function obj_oc_material(otyp) {
    return MKOBJ_OC_MATERIAL[otyp | 0] | 0;
}
export function is_rustprone(otmp) {
    return obj_oc_material(otmp.otyp) === IRON;
}
export function is_crackable(otmp) {
    return obj_oc_material(otmp.otyp) === GLASS && (otmp.oclass | 0) === ARMOR_CLASS;
}
export function is_corrodeable(otmp) {
    const m = obj_oc_material(otmp.otyp);
    return m === COPPER || m === IRON;
}
/* C objclass.h:193 — is_organic(otmp) := objects[otmp->otyp].oc_material <= WOOD */
function is_organic(otmp) {
    return obj_oc_material(otmp.otyp | 0) <= WOOD;
}
export function is_damageable(otmp) {
    return is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
        || is_corrodeable(otmp) || is_crackable(otmp);
}
/** C mkobj.c special_corpse */
function special_corpse(pmIdx) {
    const n = pmIdx | 0;
    if (n === PM_LIZARD || n === PM_LICHEN)
        return true;
    const mlet = MONS_ROWS[n][0] | 0;
    return mlet === S_TROLL || is_rider_pm(n);
}
export function is_rider_pm(pmIdx) {
    const n = pmIdx | 0;
    return n === PM_DEATH || n === PM_PESTILENCE || n === PM_FAMINE;
}

/**
 * C mkobj.c set_corpsenm — full port.
 */



export function _gm_migrating() {
    const g = game;
    if (!g.gm)
        g.gm = {};
    const d = Object.getOwnPropertyDescriptor(g.gm, 'migrating_objs');
    if (!d || !d.get) {
        /* seed from whichever spelling already holds a chain */
        const seed = (g.gm.migrating_objs !== undefined && g.gm.migrating_objs !== null)
            ? g.gm.migrating_objs
            : (g.migrating_objs ?? null);
        delete g.gm.migrating_objs;
        Object.defineProperty(g.gm, 'migrating_objs', {
            configurable: true,
            enumerable: true,
            get() { return game.migrating_objs ?? null; },
            set(v) { game.migrating_objs = v; },
        });
        g.migrating_objs = seed;
    }
    return g.gm;
}



/** C objects.h: POT_FULL_HEALING (potion base 297 + pos 18) */
const POT_FULL_HEALING = 315;
const SPE_NOVEL = 408;
const LEATHER_GLOVES_SHK = 159; /* matches u_init.js LEATHER_GLOVES_OTYP */
const ELVEN_CLOAK_SHK = 139; /* matches u_init.js ELVEN_CLOAK */
/* objects.h POTION() order around water: 317 booze, 318 sickness, 319 fruit
 * juice, 320 acid, 321 oil, 322 water (js/oc_name_data.js, the objects.h dump).
 * These two constants were each one too high — POT_BOOZE named POT_SICKNESS and
 * POT_FRUIT_JUICE named POT_ACID — so the health-food/liquor shop stock lists
 * below stocked the wrong potions.  js/potion.js:1147 has POT_BOOZE = 317. */
const POT_BOOZE = 317;
const POT_FRUIT_JUICE = 319;
/** C shknam.c:19 — special pseudo-class for health food stores */
const VEGETARIAN_CLASS_SHK = 19; /* MAXOCLASSES + 1 (18 classes 0-17 → 18 is used, +1=19) */
/* C shknam.c — shopkeeper name arrays (mirrors C static arrays exactly) */
const _shkgeneral = [
    "Hebiwerie", "Possogroenoe", "Asidonhopo", "Manlobbi",
    "Adjama", "Pakka Pakka", "Kabalebo", "Wonotobo",
    "Akalapi", "Sipaliwini",
    "Annootok", "Upernavik", "Angmagssalik",
    "Aklavik", "Inuvik", "Tuktoyaktuk", "Chicoutimi",
    "Ouiatchouane", "Chibougamau", "Matagami", "Kipawa",
    "Kinojevis", "Abitibi", "Maganasipi",
    "Akureyri", "Kopasker", "Budereyri", "Akranes",
    "Bordeyri", "Holmavik",
];
const _shkliquors = [
    "Njezjin", "Tsjernigof", "Ossipewsk", "Gorlowka",
    "Gomel",
    "Konosja", "Weliki Oestjoeg", "Syktywkar", "Sablja", "Narodnaja", "Kyzyl",
    "Walbrzych", "Swidnica", "Klodzko", "Raciborz", "Gliwice", "Brzeg",
    "Krnov", "Hradec Kralove",
    "Leuk", "Brig", "Brienz", "Thun", "Sarnen", "Burglen", "Elm", "Flims",
    "Vals", "Schuls", "Zum Loch",
];
const _shkbooks = [
    "Skibbereen", "Kanturk", "Rath Luirc", "Ennistymon",
    "Lahinch", "Kinnegad", "Lugnaquillia", "Enniscorthy",
    "Gweebarra", "Kittamagh", "Nenagh", "Sneem",
    "Ballingeary", "Kilgarvan", "Cahersiveen", "Glenbeigh",
    "Kilmihil", "Kiltamagh", "Droichead Atha", "Inniscrone",
    "Clonegal", "Lisnaskea", "Culdaff", "Dunfanaghy",
    "Inishbofin", "Kesh",
];
const _shkarmors = [
    "Demirci", "Kalecik", "Boyabai", "Yildizeli", "Gaziantep",
    "Siirt", "Akhalataki", "Tirebolu", "Aksaray", "Ermenak",
    "Iskenderun", "Kadirli", "Siverek", "Pervari", "Malasgirt",
    "Bayburt", "Ayancik", "Zonguldak", "Balya", "Tefenni",
    "Artvin", "Kars", "Makharadze", "Malazgirt", "Midyat",
    "Birecik", "Kirikkale", "Alaca", "Polatli", "Nallihan",
];
const _shkwands = [
    "Yr Wyddgrug", "Trallwng", "Mallwyd", "Pontarfynach", "Rhaeader",
    "Llandrindod", "Llanfair-ym-muallt", "Y-Fenni", "Maesteg", "Rhydaman",
    "Beddgelert", "Curig", "Llanrwst", "Llanerchymedd", "Caergybi",
    "Nairn", "Turriff", "Inverurie", "Braemar", "Lochnagar", "Kerloch",
    "Beinn a Ghlo", "Drumnadrochit", "Morven", "Uist", "Storr",
    "Sgurr na Ciche", "Cannich", "Gairloch", "Kyleakin", "Dunvegan",
];
const _shkrings = [
    "Feyfer", "Flugi", "Gheel", "Havic", "Haynin",
    "Hoboken", "Imbyze", "Juyn", "Kinsky", "Massis",
    "Matray", "Moy", "Olycan", "Sadelin", "Svaving",
    "Tapper", "Terwen", "Wirix", "Ypey",
    "Rastegaisa", "Varjag Njarga", "Kautekeino", "Abisko", "Enontekis",
    "Rovaniemi", "Avasaksa", "Haparanda", "Lulea", "Gellivare",
    "Oeloe", "Kajaani", "Fauske",
];
const _shkfoods = [
    "Djasinga", "Tjibarusa", "Tjiwidej", "Pengalengan",
    "Bandjar", "Parbalingga", "Bojolali", "Sarangan",
    "Ngebel", "Djombang", "Ardjawinangun", "Berbek",
    "Papar", "Baliga", "Tjisolok", "Siboga",
    "Banjoewangi", "Trenggalek", "Karangkobar", "Njalindoeng",
    "Pasawahan", "Pameunpeuk", "Patjitan", "Kediri",
    "Pemboeang", "Tringanoe", "Makin", "Tipor",
    "Semai", "Berhala", "Tegal", "Samoe",
];
const _shktools = [
    "Ymla", "Eed-morra", "Elan Lapinski", "Cubask", "Nieb", "Bnowr Falr",
    "Sperc", "Noskcirdneh", "Yawolloh", "Hyeghu", "Niskal", "Trahnil",
    "Htargcm", "Enrobwem", "Kachzi Rellim", "Regien", "Donmyar", "Yelpur",
    "Nosnehpets", "Stewe", "Renrut", "Senna Hut", "-Zlaw", "Nosalnef",
    "Rewuorb", "Rellenk", "Yad", "Cire Htims", "Y-crad", "Nenilukah",
    "Corsh", "Aned", "Dark Eery", "Niknar", "Lapu", "Lechaim",
    "Rebrol-nek", "AlliWar Wickson", "Oguhmk", "Telloc Cyaj",
];
const _shkhealthfoods = [
    "Ga'er", "Zhangmu", "Rikaze", "Jiangji", "Changdu",
    "Linzhi", "Shigatse", "Gyantse", "Ganden", "Tsurphu",
    "Lhasa", "Tsedong", "Drepung",
    "=Azura", "=Blaze", "=Breanna", "=Breezy", "=Dharma",
    "=Feather", "=Jasmine", "=Luna", "=Melody", "=Moonjava",
    "=Petal", "=Rhiannon", "=Starla", "=Tranquilla", "=Windsong",
    "=Zennia", "=Zoe", "=Zora",
];
const _shklight = [
    "Zarnesti", "Slanic", "Nehoiasu", "Ludus", "Sighisoara", "Nisipitu",
    "Razboieni", "Bicaz", "Dorohoi", "Vaslui", "Fetesti", "Tirgu Neamt",
    "Babadag", "Zimnicea", "Zlatna", "Jiu", "Eforie", "Mamaia",
    "Silistra", "Tulovo", "Panagyuritshte", "Smolyan", "Kirklareli", "Pernik",
    "Lom", "Haskovo", "Dobrinishte", "Varvara", "Oryahovo", "Troyan",
    "Lovech", "Sliven",
];
const _shkweapons = [
    /* Perigord */
    "Voulgezac", "Rouffiac", "Lerignac", "Touverac", "Guizengeard",
    "Melac", "Neuvicq", "Vanzac", "Picq", "Urignac",
    "Corignac", "Fleac", "Lonzac", "Vergt", "Queyssac",
    "Liorac", "Echourgnac", "Cazelon", "Eypau", "Carignan",
    "Monbazillac", "Jonzac", "Pons", "Jumilhac", "Fenouilledes",
    "Laguiolet", "Saujon", "Eymoutiers", "Eygurande", "Eauze",
    "Labouheyre",
];
/**
 * C shknam.c shtypes[] — shop type definitions.
 * Each entry: { name, symb, prob, shdist, iprobs, shknms }
 * iprobs: [{iprob, itype}] — itype>0 = class, itype<0 = -otyp (specific)
 * C: VEGETARIAN_CLASS = MAXOCLASSES+1 = 19
 */
const _shtypes = [
    /* 0: general store */
    { name: "general store", annotation: null, symb: RANDOM_CLASS, prob: 42, shknms: _shkgeneral,
        iprobs: [{ iprob: 100, itype: RANDOM_CLASS }] },
    /* 1: armor */
    { name: "used armor dealership", annotation: "armor shop", symb: ARMOR_CLASS, prob: 14, shknms: _shkarmors,
        iprobs: [{ iprob: 90, itype: ARMOR_CLASS }, { iprob: 10, itype: WEAPON_CLASS }] },
    /* 2: bookstore (scroll) */
    { name: "second-hand bookstore", annotation: "scroll shop", symb: SCROLL_CLASS, prob: 10, shknms: _shkbooks,
        iprobs: [{ iprob: 90, itype: SCROLL_CLASS }, { iprob: 10, itype: SPBOOK_CLASS }] },
    /* 3: liquor (potion) */
    { name: "liquor emporium", annotation: "potion shop", symb: POTION_CLASS, prob: 10, shknms: _shkliquors,
        iprobs: [{ iprob: 100, itype: POTION_CLASS }] },
    /* 4: weapons */
    { name: "antique weapons outlet", annotation: "weapon shop", symb: WEAPON_CLASS, prob: 5, shknms: _shkweapons,
        iprobs: [{ iprob: 90, itype: WEAPON_CLASS }, { iprob: 10, itype: ARMOR_CLASS }] },
    /* 5: food */
    { name: "delicatessen", annotation: "food shop", symb: FOOD_CLASS, prob: 5, shknms: _shkfoods,
        iprobs: [{ iprob: 83, itype: FOOD_CLASS },
            { iprob: 5, itype: -POT_FRUIT_JUICE },
            { iprob: 4, itype: -POT_BOOZE },
            { iprob: 5, itype: -POT_WATER },
            { iprob: 3, itype: -ICE_BOX }] },
    /* 6: rings */
    { name: "jewelers", annotation: "ring shop", symb: RING_CLASS, prob: 3, shknms: _shkrings,
        iprobs: [{ iprob: 85, itype: RING_CLASS },
            { iprob: 10, itype: GEM_CLASS },
            { iprob: 5, itype: AMULET_CLASS }] },
    /* 7: wands */
    { name: "quality apparel and accessories", annotation: "wand shop", symb: WAND_CLASS, prob: 3, shknms: _shkwands,
        iprobs: [{ iprob: 90, itype: WAND_CLASS },
            { iprob: 5, itype: -LEATHER_GLOVES_SHK },
            { iprob: 5, itype: -ELVEN_CLOAK_SHK }] },
    /* 8: tools */
    { name: "hardware store", annotation: "tool shop", symb: TOOL_CLASS, prob: 3, shknms: _shktools,
        iprobs: [{ iprob: 100, itype: TOOL_CLASS }] },
    /* 9: spellbooks */
    { name: "rare books", annotation: "bookstore", symb: SPBOOK_CLASS, prob: 3, shknms: _shkbooks,
        iprobs: [{ iprob: 90, itype: SPBOOK_CLASS }, { iprob: 10, itype: SCROLL_CLASS }] },
    /* 10: health food */
    { name: "health food store", annotation: "vegetarian food shop", symb: FOOD_CLASS, prob: 2, shknms: _shkhealthfoods,
        iprobs: [{ iprob: 70, itype: VEGETARIAN_CLASS_SHK },
            { iprob: 20, itype: -POT_FRUIT_JUICE },
            { iprob: 4, itype: -POT_HEALING },
            { iprob: 3, itype: -POT_FULL_HEALING },
            { iprob: 2, itype: -335 /* SCR_FOOD_DETECTION: base 323 + pos 12 */ },
            { iprob: 1, itype: -LUMP_OF_ROYAL_JELLY }] },
    /* 11: lighting (prob=0, special level only) */
    { name: "lighting store", annotation: "lighting shop", symb: TOOL_CLASS, prob: 0, shknms: _shklight,
        iprobs: [{ iprob: 30, itype: -WAX_CANDLE },
            { iprob: 44, itype: -TALLOW_CANDLE },
            { iprob: 5, itype: -BRASS_LANTERN },
            { iprob: 9, itype: -OIL_LAMP },
            { iprob: 3, itype: -MAGIC_LAMP },
            { iprob: 5, itype: -POT_OIL },
            { iprob: 2, itype: -WAN_LIGHT },
            { iprob: 1, itype: -332 /* SCR_LIGHT */ },
            { iprob: 1, itype: -372 /* SPE_LIGHT */ }] },
];
/* C shknam.c shtypes[i].name — the shop-type name u_entered_shop()
 * (js/shk.js) needs for "Welcome to <shk>'s <name>!".  The table itself stays
 * file-local; only the name is exported. */
export function shtype_name(i) {
    return _shtypes[i | 0]?.name ?? 'shop';
}
/* C shknam.c:874-890 shkname() Hallucination arm — pick a random non-unique
 * shop type (shtypes[rn2(num)], prob==0 ends the list), then a random name
 * from that type's list.  Returns the name, or null when C keeps the true one. */
export function shkname_halluc_pick() {
    let num;
    for (num = 0; num < _shtypes.length; num++)
        if (_shtypes[num].prob === 0)
            break;
    if (num <= 0)
        return null;
    const nlp = _shtypes[rn2(num)].shknms;
    num = nlp.length;
    if (num <= 0)
        return null;
    return nlp[rn2(num)];
}
/* C shknam.c:52 shtypes[] — the whole row, for saleable()'s iprobs scan
 * (js/shk.js).  shtype_name() above already exposes the `name` field; this
 * gives the `symb` and `iprobs` the same table carries. */
export function shtype_row(i) {
    return _shtypes[i | 0];
}








export function sp_levchn_lookup(uz) {
    if (!uz) return null;
    const chn = game._sp_levchn || [];
    for (let i = 0; i < chn.length; i++) {
        const sl = chn[i];
        if (sl.dlevel.dnum === uz.dnum && sl.dlevel.dlevel === uz.dlevel)
            return sl;
    }
    return null;
}
const FILL_READY = new Set(['minefill', 'hellfill', 'tower']);
const QUEST_FILL_READY = new Set([
    'Arc-fila', 'Arc-filb', 'Bar-fila', 'Bar-filb',
    'Pri-fila', 'Pri-filb', 'Wiz-fila', 'Wiz-filb',
    'Cav-fila', 'Hea-fila', 'Hea-filb', 'Kni-fila', 'Kni-filb', 'Mon-fila', 'Mon-filb',
    'Ran-fila', 'Ran-filb', 'Rog-fila', 'Rog-filb', 'Sam-fila', 'Sam-filb',
    'Tou-fila', 'Tou-filb', 'Val-filb', 'Cav-filb', 'Val-fila',
]);
/* C invent.c:4517 merged(&otmp, &obj) + shk.c:1187 obfree(obj, otmp), for
 * add_to_container()'s merge probe below.  `obj` arrives OBJ_FREE (C panics
 * otherwise) and `otmp` is already OBJ_CONTAINED, which is what makes most of
 * both C functions unreachable here; the unreachable arms are ASSERTED, not
 * assumed, in the same style as _merged_into_minv() further down this file.
 * RNG-FREE end to end: weight() and oid_price_adjustment() draw nothing, and
 * every arm that could draw (obj_no_longer_held's crysknife rn2(10)) sits in
 * add_to_container's OTHER omitted statement, not in this one. */
/* C shk.c:1204-1245 — merge the consumed object's bill entry into the
 * surviving stack, then remove the consumed entry from the keeper's bill. */




/* C ref: obj.h:158 Is_container(o) — LARGE_BOX..BAG_OF_TRICKS. */
function Is_container_otyp(otyp) {
    return otyp >= 214 && otyp <= 220;
}

/* svm.mvitals[mndx].mvflags: seeded from mons[].geno & G_NOCORPSE
 * (allmain.c:781) and gaining G_GENOD|G_NOCORPSE from genocide
 * (read.c:2748,2964) and G_EXTINCT/G_GONE at runtime. */
function mvitals_mvflags(mndx) {
    return ((MONS_ROWS[mndx][3] | 0) & G_NOCORPSE)
        | (game.mvitals?.[mndx]?.mvflags | 0);
}
/* C ref: makemon.c:1078-1139 — makemon_rnd_goodpos.
 * Pick a random accessible non-player non-monster position for a new monster.
 * Returns { x, y } on success, null on failure.
 * RNG sequence (source order): rn1(COLNO-3,2) [=rn2(77)+2] then rn2(ROWNO) per
 * do-while attempt (up to 50); rn2(2) per stairway in fallback stairs pass.
 * goodpos: with null mon + GP_AVOID_MONPOS mirrors goodpos_simple from teleport.c */
/* makemon()'s `ptr` argument reaches this file as an mndx, a permonst-ish object
 * with .mnum, or null; C just dereferences the permonst pointer.  Resolve to the
 * mndx so goodpos() can be handed a C-shaped `fakemon`. */
function makemonPtrMndx(mdat) {
    if (mdat == null) return NON_PM;
    if (typeof mdat === 'number') return mdat | 0;
    if (typeof mdat.mnum === 'number') return mdat.mnum | 0;
    if (typeof mdat.pmidx === 'number') return mdat.pmidx | 0;
    return NON_PM;
}



// C ref: mondata.h:144,149 — likes_gems(ptr) is (mflags2 & M2_JEWELS), and
//   #define is_unicorn(ptr) ((ptr)->mlet == S_UNICORN && likes_gems(ptr))
// S_UNICORN (defsym.h:319) also covers pony/horse/warhorse, which is exactly
// what likes_gems() screens out — only the three unicorns carry M2_JEWELS.
const S_UNICORN = 21;
const M2_JEWELS = 0x20000000;
// C ref: hack.h sgn(x)
function sgn_mklev(n) {
    return n > 0 ? 1 : (n < 0 ? -1 : 0);
}
// C ref: engrave.c — minimal engraving storage for wipe_engr_at
const _engr_map = new Map();

// C ref: rumors.c get_rnd_line — pick a line from a pre-built section by random byte offset.
// lines: array of decoded text lines, offsets: cumulative byte offset array (len = lines.length+1),
// sectionSize: total bytes in section, rngFn: rn2-compatible function.
function get_rnd_line_from_section(lines, offsets, sectionSize, rngFn, padlength) {
    // C ref: get_rnd_line retry loop — if random offset lands too far into a
    // long line (remaining bytes > padlength+1), retry up to 10 times total.
    // padlength is MD_PAD_RUMORS (60) for rumors/engrave, 0 to disable retry.
    let lo = 0, offset = 0;
    let trylimit = 10;
    do {
        offset = rngFn(sectionSize);
        lo = 0;
        let hi = lines.length - 1;
        while (lo < hi) {
            const mid = (lo + hi + 1) >> 1;
            if (offsets[mid] <= offset)
                lo = mid;
            else
                hi = mid - 1;
        }
        const remaining = offsets[lo + 1] - offset;
        if (!padlength || remaining <= padlength + 1)
            break;
    } while (--trylimit > 0);
    return lines[(lo + 1) % lines.length];
}
/* C hack.h:54-57 — outrumor()'s `mechanism` argument. */
export const BY_ORACLE = 0, BY_COOKIE = 1, BY_PAPER = 2, BY_OTHER = 9;




/** Export get_rnd_line_from_section for do_name.js bogusmon() — C reaches the
 *  same rumors.c get_rnd_line through get_rnd_text(BOGUSMONFILE, ...), just on
 *  the DISPLAY rng instead of rn2. */
export { get_rnd_line_from_section };
export function move_engr_at(x, y, tx, ty, ep) {
    _engr_map.delete(`${x},${y}`);
    ep.engr_x = tx;
    ep.engr_y = ty;
    _engr_map.set(`${tx},${ty}`, ep);
}
/* C sp_lev.c:690-695 flip_level moves each struct engr by rewriting engr_x/y in place; re-file an already-detached record under its new square. */
export function refile_engr_at(ep, tx, ty) {
    ep.engr_x = tx;
    ep.engr_y = ty;
    _engr_map.set(`${tx},${ty}`, ep);
}
/* C ref: engrave.c static `head_engr` — the live level engraving list, walked by
 * wizcmds.c:189 wiz_map (`for (ep = head_engr; ep; ep = ep->nxt_engr)`).  Our
 * store is a coordinate-keyed Map, so expose the same walk; each record is
 * tagged with the C struct's own engr_x/engr_y fields so a caller handed an `ep`
 * (display.c map_engraving) can read its position.  Display channel only. */
export function engravings_list() {
    const out = [];
    for (const [k, ep] of _engr_map) {
        const c = k.split(',');
        ep.engr_x = Number(c[0]);
        ep.engr_y = Number(c[1]);
        out.push(ep);
    }
    return out;
}
/* C ref: save.c:538 save_engravings() / restore.c:1167 rest_engravings() —
 * the engraving chain is LEVEL-scoped state that travels with the level file.
 * save_engravings() walks head_engr writing each record and then sets
 * head_engr = 0 (engrave.c:1581); rest_engravings() clears head_engr
 * (engrave.c:1590) and rebuilds it from the arriving level's records.
 *
 * This port keeps engravings in the coordinate-keyed _engr_map above rather
 * than a chain, so the save is a copy of the map and the restore replaces it
 * wholesale.  clear_level_structures() below still clears _engr_map on the
 * NEW-level path (mklev), which is the same net effect as C's save-then-build.
 * Both are RNG-free. */
export function engr_reset_text_pointers() {
    for (const ep of _engr_map.values()) {
        if ((ep.off | 0) > 0) {
            ep.text = ' '.repeat(ep.off | 0) + ep.text;
            ep.off = 0;
        }
    }
}

export { l_nhcore_init } from './nhlua.js';
import { nh_callback_run, NHCB_LVL_ENTER, nhl_init, nhl_loadlua, nhl_done } from './nhlua.js';
import { ENV } from './hostenv.js';
import { can_be_hatched, dead_species, dealloc_mextra, hideunder, minliquid, mongone, newcham, pm_to_cham, se_scratching, Soundeffect, undead_to_corpse, validspecmon, zombie_form } from './mon.js'; // relocate-fns
import { str_lines_maxlen, stripdigits, strsubst, upstart } from './hacklib.js'; // relocate-fns
import { antholemon, do_mkroom, fill_zoo, has_dnstairs, has_upstairs, inside_room, somex, somexy, somexyspace, somey } from './mkroom.js'; // relocate-fns
import { stairway_add, stairway_at } from './stairs.js'; // relocate-fns
import { Can_fall_thru, In_hell, Is_special, ledger_no, level_difficulty, single_level_branch, u_on_newpos } from './dungeon.js'; // relocate-fns
import { bound_digging, wallification } from './mkmaze.js'; // relocate-fns
import { get_shop_item, neweshk, stock_room } from './shknam.js'; // relocate-fns
import { set_wall_state } from './display.js'; // relocate-fns
import { makerogueghost, makeroguerooms } from './extralev.js'; // relocate-fns
import { getrumor } from './rumors.js'; // relocate-fns
import { sobj_at } from './invent.js'; // relocate-fns
import { attach_fig_transform_timeout } from './timeout.js'; // relocate-fns
import { mk_artifact } from './artifact.js';
import { MM_ADJACENTOK } from './const.js'; // relocate-fns
import { make_engr_at, make_grave, random_engraving, wipe_engr_at } from './engrave.js'; // relocate-fns
import { makemon, set_mimic_sym } from './makemon.js'; // relocate-fns
import { add_to_buried, add_to_container, dealloc_obj, is_flammable, is_rottable, mkcorpstat, mkgold, mkobj, mkobj_at, mksobj, mksobj_at, next_ident, obj_extract_self, place_object, set_corpsenm } from './mkobj.js'; // relocate-fns
import { build_room, check_room, create_room, dig_corridor, fill_special_room, mapfrag_get, maybe_add_door } from './sp_lev.js'; // relocate-fns
export { revive_corpse } from './do.js'; // relocate-fns
export { erosion_matters, rnd_class } from './objnam.js'; // relocate-fns
export { build_room, check_room, create_room, dig_corridor, fill_special_room } from './sp_lev.js'; // relocate-fns
export { splev_chr2typ_mklev }; // relocate-fns
export { add_to_buried, add_to_container, add_to_migration, add_to_minv, bcsign, blessorcurse, clear_dknown, clear_splitobjs, container_weight, dealloc_obj, dealloc_oextra, discard_minvent, dobjsfree, extract_nobj, free_omonst, is_flammable, mkcorpstat, mkgold, mkobj, mkobj_at, mksobj, mksobj_at, mksobj_migr_to_species, newoextra, newomid, next_ident, obj_extract_self, obj_ice_effects, place_object, remove_object, set_bknown, set_corpsenm, start_corpse_timeout, start_glob_timeout, unknow_object } from './mkobj.js'; // relocate-fns
export { BAG_OF_HOLDING, BRASS_LANTERN, KELP_FROND, MAGIC_LAMP, OIL_LAMP, PM_DEATH, PM_LIZARD, POT_WATER, WAN_LIGHT, WAX_CANDLE, WOOD, obj_oc_material }; // relocate-fns
export { makemon, set_mimic_sym } from './makemon.js'; // relocate-fns
export { ART_DEMONBANE_MK, ART_EXCALIBUR_MK, FIGURINE, LEASH, SLIME_MOLD, makemonPtrMndx, mvitals_mvflags }; // relocate-fns
export { mk_trap_statue, mkroll_launch } from './trap.js'; // relocate-fns
export { sgn_mklev }; // relocate-fns
export { del_engr_at, engr_at, make_engr_at, make_grave, random_engraving, rest_engravings, save_engravings, wipe_engr_at, wipeout_text } from './engrave.js'; // relocate-fns
export { mk_artifact, touch_artifact } from './artifact.js'; // relocate-fns
export { ONAME_NO_FLAGS, uroleMnum }; // relocate-fns
export { mpickobj } from './steal.js'; // relocate-fns
export { obj_sheds_light_mp }; // relocate-fns
export { inside_shop } from './shk.js'; // relocate-fns
export { attach_fig_transform_timeout } from './timeout.js'; // relocate-fns
export { G_HELL_NC, G_NOHELL_NC }; // relocate-fns
export { sobj_at } from './invent.js'; // relocate-fns
export { getrumor, outrumor } from './rumors.js'; // relocate-fns
export { makeroguerooms } from './extralev.js'; // relocate-fns
export { curse }; // relocate-fns
export { set_wall_state, xy_set_wall_state } from './display.js'; // relocate-fns
export { neweshk, shkname_is_pname, stock_room, veggy_item } from './shknam.js'; // relocate-fns
export { PM_LICHEN, SPE_NOVEL, TIN, VEGETARIAN_CLASS_SHK, _shkgeneral, _shkrings, _shktools, _shkwands }; // relocate-fns
export { place_lregion, wallification } from './mkmaze.js'; // relocate-fns
export { Can_fall_thru, In_hell, Is_special, level_difficulty, single_level_branch, u_on_newpos, u_on_rndspot } from './dungeon.js'; // relocate-fns
export { On_ladder, On_stairs, On_stairs_dn, On_stairs_up, known_branch_stairs, stairs_description, stairway_add, stairway_at, stairway_find_dir, stairway_find_from, stairway_free_all, u_on_dnstairs, u_on_sstairs, u_on_upstairs } from './stairs.js'; // relocate-fns
export { courtmon, somex, somexy, somey } from './mkroom.js'; // relocate-fns
export { A_NONE, CHEST, FOOD_CLASS, GOLD_PIECE, LARGE_BOX, LUMP_OF_ROYAL_JELLY, MM_ASLEEP, MM_NOGRP, PM_GHOST, PM_SOLDIER, RANDOM_CLASS, SPBOOK_CLASS, S_DEMON, WAND_CLASS, _shtypes }; // relocate-fns
export { c_eos, case_insensitive_comp, datamodel, digit, eos, highc, ing_suffix, lcase, letter, lowc, mungspaces, online2, onlyspace, ordin, strNsubst, str_end_is, str_start_is, strcasecpy, strip_newline, stripdigits, strkitten, strsubst, trimspaces, upstart, upwords, visctrl, xcrypt } from './hacklib.js'; // relocate-fns
export { alloc_itermonarr, angry_guards, can_be_hatched, can_touch_safely, copy_mextra, dead_species, dealloc_mextra, egg_type_from_parent, get_iter_mons, healmon, hide_monst, hideunder, iter_mons, kill_genocided_monsters, lifesaved_monster, m_poisongas_ok, m_respond, make_corpse, maybe_unhide_at, mcalcdistress, meatcorpse, meatobj, mfndpos, minliquid, mon_animal_list, mondead, mongone, monnear, newcham, pm_to_cham, rescham, restore_cham, restrap, see_monster_closeup, see_nearby_monsters, set_ustuck, setmangry, usmellmon, valid_vampshiftform, wake_msg, wake_nearby, wake_nearto, zombie_form } from './mon.js'; // relocate-fns
export { mon_allowflags } from './monmove.js';
export { AMULET_OF_STRANGULATION, BELL_OF_OPENING, BOULDER, CORPSE, EGG, GLOB_OF_BLACK_PUDDING, GLOB_OF_GREEN_SLIME, G_GENOD, G_NOCORPSE, Has_contents, ICE_BOX, M2_FEMALE, M2_MALE, M2_NEUTER, M2_SHAPESHIFTER, MONS_PMNAMES_ROWS, MONS_ROWS, MON_WEP_nc, MPICKOBJ_AT_ENGL, Monnam, Monnam_wm, NON_PM, PM_ARCHON_NC, PM_BLACK_LIGHT, PM_DEATH_R, PM_DOPPELGANGER_NC, PM_FAMINE, PM_FOG_CLOUD_NC, PM_HUMAN, PM_KILLER_BEE, PM_PESTILENCE, PM_STALKER, PM_VAMPIRE_BAT_NC, PM_VAMPIRE_LEADER_NC, PM_VAMPIRE_NC, PM_VLAD_THE_IMPALER_NC, PM_WOLF_NC, PM_WRAITH, Protection_from_shape_changers_nc, ROCK, ROCK_CLASS, SCROLL_CLASS, SPECIAL_PM_NC, STATUE, S_GHOST_MV, S_GIANT, S_GNOME, S_HUMAN, S_KOBOLD, S_KOP, S_ORC, S_TROLL, S_VAMPIRE, S_ZOMBIE, TOOL_CLASS, UNICORN_HORN, WEAPON_CLASS, WORM_TOOTH, _Blind_mk, _Hallucination_mk, _engr_map, is_lava_mv, is_mplayer_nc, is_organic, is_shapeshifter_nc, is_vampire_nc, is_vampshifter_nc, mindless_mv, mon_has_special_nc, mons_is_human, monsym_isupper_nc, mvitals_genod_nc, ofood, pline_mon, special_corpse, splitobj, throws_rocks_mv, vegan, weight }; // relocate-fns
// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
    // C mklev.c:1582 / dungeon.c:2836-2873: init_mapseen inserts even when
    // regenerating a discarded level. find_mapseen updates only the first.
    const entries = (g._mapseen_entries ||= []), lev = g.u.uz;
    entries.push({ ...lev, duplicate: entries.some(e => e.dnum === lev.dnum
        && e.dlevel === lev.dlevel), notreachable: false });
    {
        let gb = getbones();
        if (gb && typeof gb.then === 'function')
            gb = await gb;
        if (gb)
            return;
    }
    g.in_mklev = true;
    await makelevel();
    await level_finalize_topology();
    g.in_mklev = false;
    // Emit mapdump event
    const dnum = g.u?.uz?.dnum ?? 0;
    const dlevel = g.u?.uz?.dlevel ?? 1;
    const serial = ((g.mapdump_serial ?? 0) + 1);
    g.mapdump_serial = serial;
    pushRngLogEntry(`^mapdump[d${dnum}l${dlevel}_${String(serial).padStart(3, '0')}]`);
}
// C ref: mklev.c clear_level_structures()
export function clear_level_structures() {
    const g = game;
    g.fmon = null;
    /* C mklev.c:861-868 clears the `svl.level.monsters[x][y]` grid that
     * MON_AT()/m_at() read with an explicit per-cell loop.  This port has no grid;
     * the one part of it that is now tracked — the worm-segment squares, see
     * THE MAP-GRID GAP in js/worm.js — is module-global, so it is cleared here
     * where C's per-cell loop covers it.  (wheads[]/wtails[] themselves are C
     * per-level state saved and restored with the level; this port keeps them
     * module-global and never resets them, which is a separate pre-existing
     * gap — clearing them here would strand live worms on a revisit.) */
    worm_seg_clear_level();
    /* This port keeps the water-level bubble list module-global in js/mkmaze.js
     * (no counterpart in C's clear_level_structures()), so drop it here too. */
    bubbles_clear_level();
    g.fobj = null; // C mklev.c:869 — svl.level.objlist = NULL (mirrors fobj = svl.level.objlist in rm.h:476)
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    // C mklev.c:850-926 leaves gs.smeq intact; room creation initializes
    // individual entries, and later Lua loads can reuse the previous values.
    g.smeq ??= new Array(MAXNROFROOMS + 1).fill(0);
    g.level.doorindex = 0;
    g.level.doors = [];
    g.stairs = null;
    g.vault_x = -1;
    const lf = g.level.flags;
    lf.nfountains = 0;
    lf.nsinks = 0;
    lf.has_shop = false;
    lf.has_vault = false;
    lf.has_zoo = false;
    lf.has_court = false;
    lf.has_morgue = false;
    lf.graveyard = false;
    lf.has_beehive = false;
    lf.has_barracks = false;
    lf.has_temple = false;
    lf.has_swamp = false;
    lf.noteleport = false;
    lf.hardfloor = false;
    lf.nommap = false;
    lf.hero_memory = true;
    lf.shortsighted = false;
    lf.sokoban_rules = false;
    lf.is_maze_lev = false;
    lf.is_cavernous_lev = false;
    lf.arboreal = false;
    lf.has_town = false;
    lf.wizard_bones = false;
    lf.corrmaze = false;
    lf.temperature = In_hell(g.u?.uz) ? 1 : 0;
    lf.rndmongen = true;
    lf.deathdrops = true;
    lf.noautosearch = false;
    lf.fumaroles = false;
    lf.stormy = false;
    lf.stasis_until = 0;
    init_rect();
    /* C mklev.c:920 — clear_regions(), inside clear_level_structures().
     * Without it a gas cloud created on one level survives the level
     * change and keeps visible_region_at() true on the new level, which
     * would silently SUPPRESS create_gas_cloud's rn1(3,4) at monmove.c:682.
     * Consumes no RNG itself. */
    clear_regions();
    reset_xystart_size();
    /* C engrave.c:1580-1581 — head_engr = 0.  Engravings hang off the single
     * global head_engr chain (decl.c:85), but that chain is per-level in
     * effect: savelev() calls save_engravings() (save.c:538), which walks the
     * chain, dealloc_engr()s every node and sets head_engr = 0 (engrave.c:1581)
     * when leaving a level, and getlev() calls rest_engravings()
     * (restore.c:1167), which sets head_engr = 0 (engrave.c:1590) before
     * repopulating it from the arriving level's own saved records.  Either way
     * C enters a new level with head_engr empty, and mklev() then builds that
     * level's engravings from scratch.
     *
     * This port has no savelev/getlev (goto_level's revisit arm is
     * WIRE_PENDING, js/cmd.js:3938), so clear_level_structures() is the
     * boundary where the outgoing level's state is dropped — the same place
     * and the same reason clear_regions() sits directly above.  Without this,
     * _engr_map is a module global that outlives the level: an engraving made
     * on one level stays readable at the same (x,y) on the next.
     *
     * That is not inert.  maybe_smudge_engr (hack.c:3036-3041) draws rnd(5)
     * per hero square that HAS an engraving, so one stale entry is a spurious
     * rnd(5); read_engr_at likewise reports a nonexistent engraving.  Clearing
     * the map consumes no RNG itself. */
    _engr_map.clear();
    /* C mklev.c:923-926, the LAST statement of clear_level_structures():
     *     if (gl.lev_message) {
     *         free(gl.lev_message);
     *         gl.lev_message = (char *) 0;
     *     }
     * This was the one field of C's list still missing here — the gap
     * js/objnam.js:3620 filed against deliver_splev_message(), which is the
     * only reader.  A des.message() written for a level that is then never
     * arrived at leaked into the NEXT generated level's arrival topline.
     * Field-for-field against mklev.c:875-926 the rest of the list is now
     * complete: objlist / buriedobjlist / monlist / damagelist / bonesinfo /
     * nsubroom / subrooms are all members of the GameMap that `g.level = new
     * GameMap()` at the head of this function replaces wholesale, so they are
     * already zeroed; init_vault() is `g.vault_x = -1`; stairway_free_all() is
     * `g.stairs = null`. */
    game.lev_message = null;
    game.exclusion_zones = [];
}







/* ============================ end extralev.c ============================ */

// C ref: mklev.c makelevel()
async function makelevel() {
    await makelevel_generate();
    await makelevel_postprocess();
    // C mklev.c:1422: applies to special, maze and ordinary levels alike.
    await nh_callback_run(NHCB_LVL_ENTER);
}

async function makelevel_generate() {
    const g = game;
    if ((g.wiz1_level?.dlevel ?? 0) === 0) { // C mklev.c:1259-1262.
        await lifecycle_impossible('makelevel() called when dungeon not yet initialized.');
        rn2(3); rn2(2); // nhl_init's nhlib.lua alignment shuffle.
        consumeDungeonInitRng();
        g._tune = Array.from({ length: 5 }, () => String.fromCharCode(65 + rn2(7))).join(''); // C dungeon.c:1111-1117,1312.
    }
    await oinit();
    clear_level_structures();
    // Reset postprocess trap accumulator for this level.
    // C ref: themerms.lua:1096 postprocess = {} resets after post_level_generate fires.
    _pendingTeleportTraps = 0;
    _pendingTeleportCoords = [];
    // C ref: themerms.lua:42 `local postprocess = {}` — the ordered postprocess table.
    // Entries are appended in insertion (room-creation) order and fired in that order
    // at post_level_generate (themerms.lua:1093 ipairs(postprocess)). We mirror the
    // ORDER here so dig-engraving / teleport-trap callbacks consume RNG in C order.
    _pendingPostprocess = [];
    const uz0 = g.u?.uz;
    // C ref: mklev.c:1267-1289 makelevel() — Is_special is checked FIRST, then
    // proto[0], then fill_lvl[0], then In_quest, then In_hell/medusa.  In_quest
    // is the one arm still missing (quest fill levels are unreached).
    const slev = Is_special(uz0);
    if (typeof process !== 'undefined' && ENV && ENV.FF_LEVELTRACE === '1')
        pushRngLogEntry(`^level_js[moves=${game.moves | 0} dnum=${uz0?.dnum | 0} dlevel=${uz0?.dlevel | 0}`
            + ` proto=${slev?.proto || ''} rndlevs=${slev?.rndlevs | 0}`
            + ` sp=${slev ? 1 : 0}]`);
    if (slev && !Is_rogue_level(uz0)) {
        await js_makemaz(slev.proto, slev);
        for (let ri = 0; ri < g.level.nroom; ri++) {
            const rr = g.level.rooms[ri];
            if (rr && rr.hx > 0)
                await fill_special_room(rr);
        }
        return;
    }
    const dgn = (g._dungeons_full || [])[uz0?.dnum ?? 0];
    const spAny = sp_levchn_lookup(uz0);
    if (spAny && !Is_rogue_level(uz0)) {
        /* C took the Is_special arm; this proto just isn't admitted. */
    }
    else if (dgn && dgn.proto) {
        /* C: makemaz("") — resolves the protofile from dungeons[dnum].proto
         * plus dunlev()/rndlevs (mkmaze.c:1139-1150), a name-building branch
         * js_makemaz does not port.  Vlad's Tower is the only user: its
         * three dungeon levels resolve to tower1, tower2, and tower3. */
        if (dgn.proto === 'tower') {
            const dunlev = uz0?.dlevel | 0; // C dungeon.c:1325: dunlev is dlevel.
            if (dunlev >= 1 && dunlev <= 3) {
                await js_makemaz(`tower${dunlev}`, null);
                return;
            }
        }
        if (FILL_READY.has(dgn.proto))
            throw new Error(`makelevel: dungeons[${uz0?.dnum}].proto="${dgn.proto}" admitted, but makemaz("")'s protofile-from-dunlev branch is not ported (mkmaze.c:1139-1150)`);
    }
    else if (dgn && dgn.fill_lvl) {
        if (FILL_READY.has(dgn.fill_lvl)) {
            await js_makemaz(dgn.fill_lvl, null);
            /* C mklev.c:1415-1418 — the chain falls out into the
             * fill_special_room loop; hellfill's temple region sets
             * has_temple there (sp_lev.c:2798). */
            for (let ri = 0; ri < g.level.nroom; ri++) {
                const rr = g.level.rooms[ri];
                if (rr && rr.hx > 0)
                    await fill_special_room(rr);
            }
            return;
        }
    }
    else if (In_quest(uz0)) {
        const filecode = game.urole?.filecode;
        const loc_lev = filecode ? find_level(`${filecode}-loca`) : null;
        if (filecode && loc_lev) {
            const fillname = `${filecode}-fil`
                + (((uz0?.dlevel | 0) < (loc_lev.dlevel.dlevel | 0)) ? 'a' : 'b');
            if (QUEST_FILL_READY.has(fillname)) {
                await js_makemaz(fillname, null);
                for (let ri = 0; ri < g.level.nroom; ri++) {
                    const rr = g.level.rooms[ri];
                    if (rr && rr.hx > 0)
                        await fill_special_room(rr);
                }
                return;
            }
        }
    }
    else {
        // C ref: mklev.c:1286-1289 — makemaz when In_hell or below Medusa
        // (same dungeon, deeper).  REACHED ONLY when no earlier arm matched,
        // which is why it now sits in the else: C's rn2(5) is evaluated by
        // `In_hell(&u.uz) || (rn2(5) && ...)` and is therefore NOT drawn at
        // all on a level whose dungeon carries a proto/fill_lvl.  Drawing it
        // unconditionally, as this did before, spent a leaf C never spent on
        // every Mines and Gehennom level.
        const medusa = g.medusa_level;
        if (In_hell(uz0) || (rn2(5) && medusa && uz0?.dnum === medusa.dnum
            && depth_of_level(uz0) > depth_of_level(medusa))) {
            await js_makemaz('', null);
            for (let ri = 0; ri < g.level.nroom; ri++) {
                const rr = g.level.rooms[ri];
                if (rr && rr.hx > 0)
                    await fill_special_room(rr);
            }
            return;
        }
    }
    // Regular level generation
    const dnum = g.u?.uz?.dnum ?? 0;
    const is_rogue = Is_rogue_level(uz0);
    if (is_rogue) {
        await makeroguerooms();
        await makerogueghost();
    } else {
        // C ref: mklev.c:373-390 — themes = gl.luathemes[u.uz.dnum] is cached
        // for the WHOLE branch's lifetime (set once, on the branch's first
        // single dodown() call restores only that one call's state snapshot,
        // so g._luathemes_loaded starts empty on every replay even when it is
        // really deep into a branch that has already generated many earlier
        // levels — causing a spurious re-shuffle (rng-trace: 14 dodown
        // records first-diverge at rnd_rect(rect.c:106) because of exactly
        // this). u.uz0 (the level we are descending FROM, set by goto_level
        // just before makelevel() runs) tells us whether we are continuing
        // within a branch we were already standing in: if so, that branch's
        // entrance level necessarily already ran through here once before, so
        // its theme (if any) is already cached and this level must NOT redraw
        // the nhlib.lua align shuffle.
        if (!g._luathemes_loaded)
            g._luathemes_loaded = {};
        if (dgn?.themerms && g._captureReplay && g.u?.uz0 && g.u.uz0.dnum === dnum)
            g._luathemes_loaded[dnum] = true;
        if (!g._luathemes_loaded[dnum] && dgn?.themerms) {
            const themes = await nhl_init();
            if (themes && await nhl_loadlua(themes, dgn.themerms)) {
                Object.defineProperty(g.gl ||= {}, 'luathemes', { value: { ...g.gl.luathemes, [dnum]: themes }, configurable: true });
                g._themedAlign = [1, 2, 3].map(i => themes.getGlobal('align').get(i));
                g._luathemes_loaded[dnum] = true;
                g.iflags.in_lua = false;
            } else {
                await nhl_done(themes);
                dgn.themerms = '';
            }
        }
        await makerooms();
    }
    if (g.level.nroom <= 0) throw new Error('makelevel: nroom > 0');
    sort_rooms();
    await generate_stairs();
    // Branch check
    const branchp = is_branchlev();
    // C ref: mklev.c:1314 room_threshold = branchp ? 4 : 3 (min rooms for a
    // random special room); incremented when a vault is added (mklev.c:1336).
    let room_threshold = branchp ? 4 : 3;
    /* C ref: mklev.c:1307-1308 `if (Is_rogue_level(&u.uz)) goto skip0;`
     * — a rogue level gets NO corridors, niches, vault or special room; the
     * goto lands on the place_branch() line below. */
    if (!is_rogue) {
    await makecorridors();
    await make_niches();
    if (g.vault_x !== -1) {
        const vw = { value: 1 }, vh = { value: 1 };
        const vx = { value: g.vault_x }, vy = { value: g.vault_y };
        if (check_room(vx, vw, vy, vh, true)) {
            add_room(vx.value, vy.value, vx.value + vw.value, vy.value + vh.value, true, VAULT, false);
            g.level.flags.has_vault = true;
            room_threshold++; /* C ref: mklev.c:1336 ++room_threshold */
            const vaultRoom = g.level.rooms[g.level.nroom - 1];
            if (vaultRoom)
                vaultRoom.needfill = FILL_NORMAL;
            /* C ref: mklev.c:1338 fill_special_room right after marking needfill */
            if (vaultRoom)
                await fill_special_room(vaultRoom);
            /* C ref: mklev.c:1331 mk_knox_portal(gv.vault_x + w, gv.vault_y + h) */
            await mk_knox_portal(vx.value + vw.value, vy.value + vh.value);
            /* C ref: mklev.c:1332-1333
             *   if (!svl.level.flags.noteleport && !rn2(3)) makevtele();
             * makevtele() is one line: makeniche(TELEP_TRAP).  The noteleport
             * guard short-circuits the draw, so it has to be on this side of it. */
            if (!g.level.flags.noteleport && !rn2(3))
                await makeniche(TELEP_TRAP);
        }
        else if (rnd_rect() && create_vault()) {
            // C ref: mklev.c:1342-1348 — rnd_rect()&&create_vault() fallback
            vx.value = g.level.rooms[g.level.nroom]?.lx ?? -1;
            vy.value = g.level.rooms[g.level.nroom]?.ly ?? -1;
            if (check_room(vx, vw, vy, vh, true)) {
                add_room(vx.value, vy.value, vx.value + vw.value, vy.value + vh.value, true, VAULT, false);
                g.level.flags.has_vault = true;
                room_threshold++; /* C ref: mklev.c:1336 ++room_threshold */
                const vaultRoom2 = g.level.rooms[g.level.nroom - 1];
                if (vaultRoom2)
                    vaultRoom2.needfill = FILL_NORMAL;
                if (vaultRoom2)
                    await fill_special_room(vaultRoom2);
                /* C: the `goto fill_vault` target — same tail as above. */
                await mk_knox_portal(vx.value + vw.value, vy.value + vh.value);
                if (!g.level.flags.noteleport && !rn2(3))
                    await makeniche(TELEP_TRAP);
            }
            else {
                if (g.level.rooms[g.level.nroom])
                    g.level.rooms[g.level.nroom].hx = -1;
            }
        }
    }
    // C ref: mklev.c:1352-1383 — make up to 1 special room, type depends on
    // depth. do_mkroom only sets rtype (+ needfill); rooms are stocked later.
    // Not on rogue levels (JS has no rogue level; guard kept for fidelity).
    {
        const uz = g.u?.uz;
        const u_depth = depth_of_level(uz) | 0;
        const medusaDepth = g.medusa_level ? (depth_of_level(g.medusa_level) | 0) : 0;
        const nroom = g.level.nroom | 0;
        if (wizard() && (g.env?.SHOPTYPE ?? ENV.SHOPTYPE)?.length <= BUFSZ / 2)
            await do_mkroom(SHOPBASE);
        else if (u_depth > 1 && u_depth < medusaDepth
            && nroom >= room_threshold && rn2(u_depth) < 3) {
            await do_mkroom(SHOPBASE);
        }
        else if (u_depth > 4 && !rn2(6)) {
            await do_mkroom(COURT);
        }
        else if (u_depth > 5 && !rn2(8) && !(g.mvitals?.[PM_LEPRECHAUN]?.mvflags & G_GONE)) {
            await do_mkroom(LEPREHALL);
        }
        else if (u_depth > 6 && !rn2(7)) {
            await do_mkroom(ZOO);
        }
        else if (u_depth > 8 && !rn2(5)) {
            await do_mkroom(TEMPLE);
        }
        else if (u_depth > 9 && !rn2(5) && !(g.mvitals?.[PM_KILLER_BEE]?.mvflags & G_GONE)) {
            await do_mkroom(BEEHIVE);
        }
        else if (u_depth > 11 && !rn2(6)) {
            await do_mkroom(MORGUE);
        }
        else if (u_depth > 12 && !rn2(8) && antholemon() !== null) {
            await do_mkroom(ANTHOLE);
        }
        else if (u_depth > 14 && !rn2(4) && !(g.mvitals?.[PM_SOLDIER]?.mvflags & G_GONE)) {
            await do_mkroom(BARRACKS);
        }
        else if (u_depth > 15 && !rn2(6)) {
            await do_mkroom(SWAMP);
        }
        else if (u_depth > 16 && !rn2(8) && !(g.mvitals?.[PM_COCKATRICE]?.mvflags & G_GONE)) {
            await do_mkroom(COCKNEST);
        }
    }
    } /* end of C's `goto skip0` span */
 /* skip0: */
    // Place dungeon branch
    if (branchp) {
        const prevstairs = g.stairs;
        await place_branch(branchp);
        /* C ref: mklev.c:1390-1395 — for main dungeon level 1, the stairs up
         * where the hero starts are branch stairs; mark them traversed (as if the
         * hero had just come down them) so known_branch_stairs() returns TRUE and
         * the start upstairs renders YELLOW (defsym S_brupstair).  Only the
         * newly-added branch stairway (head of the list) is marked. */
        if ((g.u?.uz?.dnum | 0) === 0 && (g.u?.uz?.dlevel | 0) === 1
            && g.stairs && g.stairs !== prevstairs) {
            g.stairs.u_traversed = true;
        }
    }
    // C ref: mklev.c:937-940 ROOM_IS_FILLABLE
    function room_is_fillable(croom) {
        return croom != null && croom.hx > 0
            && (croom.rtype === OROOM || croom.rtype === THEMEROOM)
            && croom.needfill === FILL_NORMAL;
    }
    // C ref: mklev.c:1397-1419 — bonus-item room countdown then fill_ordinary_room
    let fillable_room_count = 0;
    for (let ri = 0; ri < g.level.rooms.length; ri++) {
        const rc = g.level.rooms[ri];
        if (!rc || rc.hx <= 0)
            break;
        if (room_is_fillable(rc))
            fillable_room_count++;
    }
    let bonus_item_room_countdown = fillable_room_count ? rn2(fillable_room_count) : -1;
    /* C ref: mklev.c:1412-1420 — ordinary room contents before specials */
    for (let ri = 0; ri < g.level.nroom; ri++) {
        const rr = g.level.rooms[ri];
        if (!rr || rr.hx <= 0)
            break;
        const fillable = room_is_fillable(rr);
        await fill_ordinary_room(rr, !!(fillable && bonus_item_room_countdown === 0));
        if (fillable)
            bonus_item_room_countdown--;
    }
    /* C ref: mklev.c:1424–1426 — second pass fills all specials (vault again, etc.) */
    for (let ri = 0; ri < g.level.nroom; ri++) {
        const rr = g.level.rooms[ri];
        if (rr && rr.hx > 0)
            await fill_special_room(rr);
    }
}
async function makelevel_postprocess() {
    const g = game, dnum = g.u?.uz?.dnum ?? 0;
    if (g._luathemes_loaded?.[dnum]) {
        reset_xystart_size(); // C mklev.c:1183, before post_level_generate.
        g.iflags.in_lua = g.in_mk_themerooms = true; // C mklev.c:1184.
        g.themeroom_failed = false;
        await themerooms_post_level_generate();
        g.iflags.in_lua = g.in_mk_themerooms = false;
        wallification(1, 0, COLNO - 1, ROWNO - 1);
        if (g.gc) g.gc.coder = null;
    }
}
// C ref: themerms.lua:874-875, 982-1007 pre_themerooms_generate() / post_themerooms_generate()
let _debug_rm_idx = null;
let _debug_fill_idx = null;
function _lookup_themeroom_by_name(str, isfill) {
    if (!str)
        return null;
    const tbl = isfill ? THEMEROOM_FILL_META : THEMEROOM_META;
    const idx = tbl.findIndex(v => v.name === str);
    return idx >= 0 ? idx : null;
}
function _nh_debug_themerm(isfill) {
    if (!wizard())
        return null;
    const key = isfill ? 'THEMERMFILL' : 'THEMERM';
    const val = game.env?.[key] ?? ENV?.[key];
    return (val && val.length > 0) ? val : null;
}
async function pre_themerooms_generate() {
    const debug_themerm = _nh_debug_themerm(false);
    const debug_fill = _nh_debug_themerm(true);
    let xtrainfo = '';
    _debug_rm_idx = _lookup_themeroom_by_name(debug_themerm, false);
    _debug_fill_idx = _lookup_themeroom_by_name(debug_fill, true);
    if (debug_themerm !== null && _debug_rm_idx === null) {
        if (_lookup_themeroom_by_name(debug_themerm, true) !== null)
            xtrainfo = '; it is a fill type';
        await pline(`Warning: themeroom '${debug_themerm}' not found in themerooms${xtrainfo}`);
    }
    if (debug_fill !== null && _debug_fill_idx === null) {
        if (_lookup_themeroom_by_name(debug_fill, false) !== null)
            xtrainfo = '; it is a room type';
        await pline(`Warning: themeroom fill '${debug_fill}' not found in themeroom_fills${xtrainfo}`);
    }
}
async function post_themerooms_generate() {
    /* C ref: themerms.lua:1006-1007 post_themerooms_generate() — empty Lua hook */
}
// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    /* themerms.lua is_eligible: nh.level_difficulty() (dungeon.c:2027), not depth. */
    const difficulty = level_difficulty();
    let themeroom_tries = 0;
    // C mklev.c:392-399 — lua_getglobal(themes, "pre_themerooms_generate") + nhl_pcall_handle("makerooms-1")
    if (g._luathemes_loaded?.[g.u?.uz?.dnum ?? 0]) {
        create_des_coder();
        g.iflags.in_lua = g.in_mk_themerooms = true;
        g.themeroom_failed = false;
        await pre_themerooms_generate();
        g.iflags.in_lua = g.in_mk_themerooms = false;
    }
    while (g.level.nroom < (MAXNROFROOMS - 1) && rnd_rect()) {
        if (g.level.nroom >= Math.trunc(MAXNROFROOMS / 6) && rn2(2) && !tried_vault) {
            tried_vault = true;
            if (create_vault()) {
                g.vault_x = g.level.rooms[g.level.nroom]?.lx ?? -1;
                g.vault_y = g.level.rooms[g.level.nroom]?.ly ?? -1;
                if (g.level.rooms[g.level.nroom])
                    g.level.rooms[g.level.nroom].hx = -1;
            }
        }
        else {
            // Themed room selection (reservoir sampling)
            if (!g._luathemes_loaded?.[g.u?.uz?.dnum ?? 0]) {
                if (!create_room(-1, -1, -1, -1, -1, -1, OROOM, -1))
                    break;
            } else {
                // C mklev.c:412-421 — lua_getglobal(themes, "themerooms_generate") + nhl_pcall_handle("makerooms-2")
                g.iflags.in_lua = g.in_mk_themerooms = true;
                g.themeroom_failed = false;
                const ok = await themerooms_generate(difficulty);
                g.iflags.in_lua = g.in_mk_themerooms = false;
                if (!ok) {
                    g.themeroom_failed = true;
                    if (themeroom_tries++ > 10
                        || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                        break;
                }
            }
        }
    }
    // C mklev.c:428-435 — lua_getglobal(themes, "post_themerooms_generate") + nhl_pcall_handle("makerooms-3")
    if (g._luathemes_loaded?.[g.u?.uz?.dnum ?? 0]) {
        reset_xystart_size();
        g.iflags.in_lua = g.in_mk_themerooms = true;
        g.themeroom_failed = false;
        await post_themerooms_generate();
        g.iflags.in_lua = g.in_mk_themerooms = false;
    }
}
// C ref: themerms.lua themeroom_fills — fill pool for themed rooms.
// Order must match themerms.lua exactly; reservoir sampling depends on it.
const THEMEROOM_FILL_META = [
    { name: 'Ice room' },
    { name: 'Cloud room' },
    { name: 'Boulder room', mindiff: 4 },
    { name: 'Spider nest' },
    { name: 'Trap room' },
    { name: 'Garden', eligible: rm => rm.lit },
    { name: 'Buried treasure' },
    { name: 'Buried zombies' },
    { name: 'Massacre' },
    { name: 'Statuary' },
    { name: 'Light source', eligible: rm => !rm.lit },
    { name: 'Temple of the gods' },
    { name: 'Ghost of an Adventurer' },
    { name: 'Storeroom' },
    { name: 'Teleportation hub' },
];
// Themed room metadata — must match C's themerms.lua frequency table exactly.
// Generated from themeroom_meta.js (31 rooms).
const THEMEROOM_META = [
    { name: 'default', frequency: 1000 },
    { name: 'Fake Delphi', frequency: 1 },
    { name: 'Room in a room', frequency: 1 },
    { name: 'Huge room with another room inside', frequency: 1 },
    { name: 'Nesting rooms', frequency: 1 },
    { name: 'Default room with themed fill', frequency: 6 },
    { name: 'Unlit room with themed fill', frequency: 2 },
    { name: 'Room with both normal contents and themed fill', frequency: 2 },
    { name: 'Pillars', frequency: 1 },
    { name: 'Mausoleum', frequency: 1 },
    { name: 'Random dungeon feature', frequency: 1 },
    { name: 'L-shaped', frequency: 1 },
    { name: 'L-shaped, rot 1', frequency: 1 },
    { name: 'L-shaped, rot 2', frequency: 1 },
    { name: 'L-shaped, rot 3', frequency: 1 },
    { name: 'Blocked center', frequency: 1 },
    { name: 'Circular, small', frequency: 1 },
    { name: 'Circular, medium', frequency: 1 },
    { name: 'Circular, big', frequency: 1 },
    { name: 'T-shaped', frequency: 1 },
    { name: 'T-shaped, rot 1', frequency: 1 },
    { name: 'T-shaped, rot 2', frequency: 1 },
    { name: 'T-shaped, rot 3', frequency: 1 },
    { name: 'S-shaped', frequency: 1 },
    { name: 'S-shaped, rot 1', frequency: 1 },
    { name: 'Z-shaped', frequency: 1 },
    { name: 'Z-shaped, rot 1', frequency: 1 },
    { name: 'Cross', frequency: 1 },
    { name: 'Four-leaf clover', frequency: 1 },
    { name: 'Water-surrounded vault', frequency: 1 },
    { name: 'Twin businesses', frequency: 1, mindiff: 4 },
];
/*
 * C ref: themerms.lua — des.map map=[[...]] strings (stripdigits + str_lines_maxlen).
 * nhlua.c:splev_chr2typ — first matching row only (duplicate '-' rows in C are dead).
 */
const SPLEV_CH2TYP_ORDER = /** @type {readonly [string, number][]} */ ([
    [' ', STONE],
    ['#', CORR],
    ['.', ROOM],
    ['-', HWALL],
    ['|', VWALL],
    ['+', DOOR],
    ['A', AIR],
    ['C', CLOUD],
    ['S', SDOOR],
    ['H', SCORR],
    ['{', FOUNTAIN],
    ['\\', THRONE],
    ['K', SINK],
    ['}', MOAT],
    ['P', POOL],
    ['L', LAVAPOOL],
    ['Z', LAVAWALL],
    ['I', ICE],
    ['W', WATER],
    ['T', TREE],
    ['F', IRONBARS],
    ['x', MAX_TYPE],
    ['B', CROSSWALL],
    ['w', MATCH_WALL],
]);
/** C mapfrag_fromstr layout after stripdigits — rectangular lines padded to wid. */
function themeroom_mapfrag_from_lua(mapLua) {
    const data = stripdigits(mapLua);
    const rawLines = data.split('\n');
    const wid = str_lines_maxlen(data);
    const hei = rawLines.length;
    const lines = rawLines.map(line => line.padEnd(wid, ' '));
    return { wid, hei, lines };
}
function splev_chr2typ_mklev(ch) {
    for (let i = 0; i < SPLEV_CH2TYP_ORDER.length; i++) {
        const pair = SPLEV_CH2TYP_ORDER[i];
        if (ch === pair[0])
            return pair[1];
    }
    return INVALID_TYPE;
}
/**
 * C themerms.lua filler_region(ox, oy) calls des.region({region={ox,oy,ox,oy}, irregular=true, ...}).
 * In C lspo_region, flood_fill_rm starts at (mapPos.x+ox, mapPos.y+oy) and finds the bounding
 * box of all connected ROOM-type cells. That bounding box is passed to add_room().
 * The JS must do the same flood-fill to get bit-exact room dimensions.
 *
 * Key: 'Water-surrounded vault' uses des.region({region={3,3,3,3},...}) not filler_region.
 * Its flood origin is still (mapPos.x+3, mapPos.y+3).
 */
const THEMEROOM_MAP_FILLER_ORIGIN = {
    'L-shaped': { ox: 1, oy: 1 },
    'L-shaped, rot 1': { ox: 5, oy: 1 },
    'L-shaped, rot 2': { ox: 1, oy: 1 },
    'L-shaped, rot 3': { ox: 1, oy: 1 },
    'Blocked center': { ox: 1, oy: 1 },
    'Circular, small': { ox: 3, oy: 3 },
    'Circular, medium': { ox: 4, oy: 4 },
    'Circular, big': { ox: 5, oy: 5 },
    'T-shaped': { ox: 5, oy: 5 },
    'T-shaped, rot 1': { ox: 2, oy: 2 },
    'T-shaped, rot 2': { ox: 2, oy: 2 },
    'T-shaped, rot 3': { ox: 5, oy: 5 },
    'S-shaped': { ox: 2, oy: 2 },
    'S-shaped, rot 1': { ox: 5, oy: 5 },
    'Z-shaped': { ox: 5, oy: 5 },
    'Z-shaped, rot 1': { ox: 2, oy: 2 },
    'Cross': { ox: 6, oy: 6 },
    'Four-leaf clover': { ox: 6, oy: 6 },
    'Water-surrounded vault': { ox: 3, oy: 3 },
};
/**
 * C ref: mkmap.c flood_fill_rm() — flood-fill from (startX, startY), setting roomno=rmno
 * on all connected IS_ROOM cells (typ >= ROOM) and edge/roomno on adjacent wall/door cells.
 * Also tracks the bounding box and returns it. Mirrors C's flood_fill_rm (anyroom=TRUE).
 * Returns null if the start cell is not IS_ROOM type.
 */
function flood_fill_room_bbox(startX, startY, rmno, lit) {
    const startLoc = game.level.at(startX, startY);
    if (!startLoc || startLoc.typ < ROOM)
        return null;
    const setRoomno = (rmno !== undefined);
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const visited = new Set();
    const queue = [[startX, startY]];
    visited.add(startX * 256 + startY);
    while (queue.length > 0) {
        const [x, y] = queue.shift();
        if (x < minX)
            minX = x;
        if (x > maxX)
            maxX = x;
        if (y < minY)
            minY = y;
        if (y > maxY)
            maxY = y;
        const loc = game.level.at(x, y);
        if (setRoomno && loc) {
            loc.roomno = rmno;
            if (lit)
                loc.lit = true;
            // C flood_fill_rm anyroom=TRUE: mark adjacent wall/door cells as edges
            for (let ii = x - 1; ii <= x + 1; ii++)
                for (let jj = y - 1; jj <= y + 1; jj++) {
                    const wloc = game.level.at(ii, jj);
                    if (wloc && (IS_WALL(wloc.typ) || IS_DOOR(wloc.typ) || wloc.typ === SDOOR)) {
                        wloc.edge = true;
                        if (lit)
                            wloc.lit = true;
                        if (wloc.roomno === NO_ROOM)
                            wloc.roomno = rmno;
                        else if (wloc.roomno !== rmno)
                            wloc.roomno = SHARED;
                    }
                }
        }
        for (const [nx, ny] of [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]) {
            const key = nx * 256 + ny;
            if (!visited.has(key)) {
                const nloc = game.level.at(nx, ny);
                if (nloc && nloc.typ >= ROOM) {
                    visited.add(key);
                    queue.push([nx, ny]);
                }
            }
        }
    }
    return { minX, minY, maxX, maxY };
}
/*
 * C sp_lev.c:lspo_map — in_mk_themerooms, lr/tb -1, ox/oy -1, no croom:
 * redo_maploc loop with rn2(COLNO-1-mf.wid), rn2(ROWNO-mf.hei) and themed overlay check.
 */
/**
 * @returns {{x: number, y: number}|null} placement position on success, null on failure.
 * Returns the map fragment's top-left corner so callers can use it for add_room coords.
 */
export function themeroom_lspo_map_redo_maploc_rng(mf) {
    const lr = -1;
    const tb = -1;
    let tryct = 0;
    redomap: for (;;) {
        const x = 1 + rn2(COLNO - 1 - mf.wid);
        const y = rn2(ROWNO - mf.hei);
        const gxStart = x;
        const gyStart = y;
        const gxSize = mf.wid;
        const gySize = mf.hei;
        let isokp = true;
        for (let yy = gyStart - 1; yy < Math.min(ROWNO, gyStart + gySize) + 1; yy++) {
            for (let xx = gxStart - 1; xx < Math.min(COLNO, gxStart + gxSize) + 1; xx++) {
                if (!isok(xx, yy)) {
                    isokp = false;
                }
                else if (yy < gyStart || yy >= gyStart + gySize
                    || xx < gxStart || xx >= gxStart + gxSize) {
                    const loc = game.level.at(xx, yy);
                    if (!loc || loc.typ !== STONE || loc.roomno !== NO_ROOM)
                        isokp = false;
                }
                else {
                    const mptyp = mapfrag_get(mf, xx - gxStart, yy - gyStart);
                    if (mptyp >= MAX_TYPE)
                        continue;
                    const loc = game.level.at(xx, yy);
                    if (!loc || (loc.typ !== STONE && loc.typ !== mptyp)
                        || loc.roomno !== NO_ROOM) {
                        isokp = false;
                    }
                }
                if (!isokp) {
                    if (tryct++ < 100 && (lr === -1 || tb === -1))
                        continue redomap;
                    return null;
                }
            }
        }
        return { x: gxStart, y: gyStart };
    }
}
/** Multiline strings copied from nethack-c/dat/themerms.lua des.map blocks. */
const THEMEROOM_MAP_LUA = {
    'L-shaped': `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
--------`,
    'L-shaped, rot 1': `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
--------`,
    'L-shaped, rot 2': `--------
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    'L-shaped, rot 3': `--------
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    'Blocked center': `-----------
|.........|
|.........|
|.........|
|...LLL...|
|...LLL...|
|...LLL...|
|.........|
|.........|
|.........|
-----------`,
    'Circular, small': `xx---xx
x--.--x
--...--
|.....|
--...--
x--.--x
xx---xx`,
    'Circular, medium': `xx-----xx
x--...--x
--.....--
|.......|
|.......|
|.......|
--.....--
x--...--x
xx-----xx`,
    'Circular, big': `xxx-----xxx
x---...---x
x-.......-x
--.......--
|.........|
|.........|
|.........|
--.......--
x-.......-x
x---...---x
xxx-----xxx`,
    'T-shaped': `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
-----------`,
    'T-shaped, rot 1': `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    'T-shaped, rot 2': `-----------
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
    'T-shaped, rot 3': `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    'S-shaped': `-----xxx
|...|xxx
|...|xxx
|...----
|......|
|......|
|......|
----...|
xxx|...|
xxx|...|
xxx-----`,
    'S-shaped, rot 1': `xxx--------
xxx|......|
xxx|......|
----......|
|......----
|......|xxx
|......|xxx
--------xxx`,
    'Z-shaped': `xxx-----
xxx|...|
xxx|...|
----...|
|......|
|......|
|......|
|...----
|...|xxx
|...|xxx
-----xxx`,
    'Z-shaped, rot 1': `--------xxx
|......|xxx
|......|xxx
|......----
----......|
xxx|......|
xxx|......|
xxx--------`,
    Cross: `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
    'Cross': `xxx-----xxx
xxx|...|xxx
xxx|...|xxx
----...----
|.........|
|.........|
|.........|
----...----
xxx|...|xxx
xxx|...|xxx
xxx-----xxx`,
    'Four-leaf clover': `-----x-----
|...|x|...|
|...---...|
|.........|
---.....---
xx|.....|xx
---.....---
|.........|
|...---...|
|...|x|...|
-----x-----`,
    'Water-surrounded vault': `}}}}}}
}----}
}|..|}
}|..|}
}----}
}}}}}}`,
};
function is_themeroom_eligible(room, difficulty) {
    if (room.mindiff != null && difficulty < room.mindiff)
        return false;
    if (room.maxdiff != null && difficulty > room.maxdiff)
        return false;
    return true;
}
function is_fill_eligible(fill, rm, difficulty) {
    if (fill.mindiff != null && difficulty < fill.mindiff)
        return false;
    if (fill.maxdiff != null && difficulty > fill.maxdiff)
        return false;
    if (rm != null && fill.eligible != null)
        return fill.eligible(rm);
    return true;
}
// C ref: themerms.lua postprocess -- accumulated teleportation hub trap info.
// themeroom_fill_rng() accumulates here when Teleportation hub is picked.
// Consumed by themerooms_post_level_generate() at post_level_generate time.
// Reset at start of each makelevel() call.
let _pendingTeleportTraps = 0;
let _pendingTeleportCoords = []; // source coords (offset-adjusted) per trap
// C ref: themerms.lua:42 postprocess table. Ordered list of postprocess callbacks
// registered during fill-time, fired in insertion order at post_level_generate
// (themerms.lua:1093). Each entry: { kind: 'dig_engraving' | 'teleport_trap', ... }.
// Mirrors C insertion order so callbacks consume RNG in the same sequence as C.
let _pendingPostprocess = [];


/**
 * The level-generation callbacks the nhlib.js themeroom fills need to run C's
 * `des.monster{}` (sp_lev.c lspo_monster -> create_monster) rather than merely
 * consuming a guess at its RNG.  nhlib.js may not import mklev.js, so they are
 * handed in; this is the same `hooks` shape nhlib_fill_storeroom_rng takes.
 *
 * setSpecFlags applies create_monster's post-makemon spec writes
 * (sp_lev.c:2124 `mtmp->female = m->female`, sp_lev.c:2132-2133
 * `if (m->asleep > BOOL_RANDOM) mtmp->msleeping = m->asleep`) to the monster
 * makemon just returned; a generated group can put another monster at fmon.
 * Both fills that use this pass `asleep = true`, so msleeping is unconditional.
 *
 * @param {object} croom the mkroom being filled
 */
function themeroom_monster_fill_hooks(croom) {
    return {
        croom,
        inducedAlign: induced_align,
        somexy,
        makemon,
        setSpecFlags: (female, mtmp) => {
            if (!mtmp)
                return;
            mtmp.female = female ? 1 : 0;
            mtmp.msleeping = 1;  /* asleep = true */
        },
        /* C sp_lev.c:1977 — `if (MON_AT(x, y) && enexto(&cc, x, y, pm))`.
         * MON_AT is rm.h:506, i.e. m_at(). */
        monAt: (mx, my) => m_at(mx, my),
        /* C sp_lev.c:1963-1974 — preserve get_location_coord(random)'s inner
         * quiet/fallback behavior for des.monster placement. */
        getLocationCoord: (coord, humidity) =>
            get_location_coord(coord, humidity, croom, SP_COORD_IS_RANDOM),
        /* C teleport.c:198-203 — enexto(cc,xx,yy,mdat) is
         *   enexto_core(cc,xx,yy,mdat,GP_CHECKSCARY)
         *   || enexto_core(cc,xx,yy,mdat,NO_MM_FLAGS)
         * so a scary-square rejection costs a SECOND ring shuffle. */
        enexto: (mx, my, mndx) => {
            const fakemon = mndx == null ? null : { data: permonstTemplate(mndx), mnum: mndx, m_id: 0,
                wormno: 0, mx: 0, my: 0, minvent: null };
            return enexto_core(mx, my, fakemon, GP_CHECKSCARY)
                || enexto_core(mx, my, fakemon, 0 /* NO_MM_FLAGS */);
        },
        /* C sp_lev.c:1980 — inside_room(croom, x, y). */
        insideRoom: (mx, my) => inside_room(croom, mx, my),
        /* C sp_lev.c sel_set_feature: the terrain write only, no
         * nfountains++/blessedftn — mkfount()'s rn2(7) belongs to mklev.c's
         * own fountain maker, not to des.feature.  And nothing recounts
         * afterwards on an ordinary level (see mklev() above), so a themeroom
         * fountain stays UNCOUNTED in level.flags.nfountains, exactly as in C. */
        feature: (fx, fy) => {
            const loc = game.level?.at(fx, fy);
            if (loc && !IS_FURNITURE(loc.typ))
                loc.typ = FOUNTAIN;
        },
    };
}
/**
 * C ref: selvar.c selection_filter_percent:236-243 + nhlsel.c
 * l_selection_iterate:925-948 — the two halves of `selection.room():percentage(N)`
 * followed by `locs:iterate(func)`, which four themeroom fills use.
 *
 *   percentage(N)   draws rn2(100) once per cell of the room selection,
 *                   X-OUTER / Y-INNER (selvar.c:240-241)
 *   iterate(func)   visits the SURVIVING cells Y-OUTER / X-INNER
 *                   (nhlsel.c:935-936)
 *
 * The two orders are NOT the same sequence, so a fill that both draws per cell
 * and then acts per cell needs both: the draw order decides WHICH cells were
 * picked, the visit order decides in what order they consume RNG afterwards.
 *
 * roomRndcoordCells() is already this port's selection_from_mkroom (selvar.c:781)
 * — same `!edge && roomno == rmno` filter, same dx-outer dy-inner walk.
 *
 * The coordinates iterate() hands the Lua callback are room-RELATIVE
 * (cvt_to_relcoord, sp_lev.c:4793-4801) and get_location() adds croom->lx/ly
 * straight back on (sp_lev.c:1362-1365), so the net position is the absolute
 * cell and NO positional RNG is drawn on the way.
 */
function themeroom_percentage_cells(croom, pct) {
    const sel = [];
    for (const c of roomRndcoordCells(croom))
        if (rn2(100) < pct)
            sel.push(c);
    /* nhlsel.c:935-936 — iterate() is y-outer, x-inner. */
    sel.sort((a, b) => (a.y - b.y) || (a.x - b.x));
    return sel;
}
/**
 * C ref: sp_lev.c lspo_trap:4397-4470 + create_trap:1812-1846, restricted to
 * the EXPLICIT-COORDINATE form the themeroom fills use — `des.trap(name, x, y)`
 * (argc == 3) and `des.trap{ type=, x=, y=, spider_on_web= }`.
 *
 * With an explicit coord, create_trap takes the `croom` arm and
 * get_free_room_loc -> get_location_coord resolves to that exact cell; the cell
 * is ROOM, so get_free_room_loc's get_room_loc retry loop never runs and this
 * whole path draws NOTHING.  Every leaf comes out of mktrap().
 *
 * lspo_trap's defaults for both forms are spider_on_web = TRUE, seen = FALSE,
 * victim = TRUE (sp_lev.c:4405-4407, 4432-4434), so the only flag the fills
 * ever vary is MKTRAP_NOSPIDERONWEB.  MKTRAP_MAZEFLAG is unconditional in
 * create_trap (sp_lev.c:1817) and is inert here because `tm` is non-null.
 */
async function themeroom_des_trap(type, x, y, spider_on_web) {
    let mktrap_flags = MKTRAP_MAZEFLAG;
    if (!spider_on_web)
        mktrap_flags |= MKTRAP_NOSPIDERONWEB;
    await mktrap(type, mktrap_flags, null, { x, y });
}
async function themeroom_fill_trap_room(croom) {
    const traps = [ARROW_TRAP, DART_TRAP, ROCKTRAP, BEAR_TRAP,
                   LANDMINE, SLP_GAS_TRAP, RUST_TRAP, ANTI_MAGIC];
    /* themerms.lua:107 — shuffle() runs BEFORE the percentage roll. */
    nhlib_shuffle_inplace(traps);
    for (const c of themeroom_percentage_cells(croom, 30))
        await themeroom_des_trap(traps[0], c.x, c.y, true);
}
const MASSACRE_MONNAMES = [
    'apprentice', 'warrior', 'ninja', 'thug',
    'hunter', 'acolyte', 'abbot', 'page',
    'attendant', 'neanderthal', 'chieftain',
    'student', 'wizard', 'valkyrie', 'tourist',
    'samurai', 'rogue', 'ranger', 'priestess',
    'priest', 'monk', 'knight', 'healer',
    'cavewoman', 'caveman', 'barbarian',
    'archeologist',
];
/* C sp_lev.c:3692-3699 — the montype name scan, exactly as lspo_object runs it. */
function massacre_montype_index(name) {
    for (let i = 0; i < MONS_PMNAMES_ROWS.length; i++) {
        const row = MONS_PMNAMES_ROWS[i];
        if (!row)
            continue;
        /* C tests pmnames[NEUTRAL], then [MALE], then [FEMALE]; all three are
         * tested for the same row before moving on, so which slot matches does
         * not change WHICH row wins. */
        for (const nm of row)
            if (nm && nm.toLowerCase() === name)
                return i;
    }
    return NON_PM;
}
async function themeroom_fill_massacre(croom) {
    /* nhlib.lua:9-10 math.random(n) is 1 + nh.rn2(n). */
    let idx = nhlib_math_random_two_arg(1, MASSACRE_MONNAMES.length);
    /* nhlib.lua:36 d(5,5) — five math.random(1,5). */
    let ncorpses = 0;
    for (let i = 0; i < 5; i++)
        ncorpses += nhlib_math_random_two_arg(1, 5);
    for (let i = 0; i < ncorpses; i++) {
        if (nhlib_percent(10))
            idx = nhlib_math_random_two_arg(1, MASSACRE_MONNAMES.length);
        const mnum = massacre_montype_index(MASSACRE_MONNAMES[idx - 1]);
        /* C sp_lev.c create_object:2202 — get_location_coord(DRY, croom,
         * random), i.e. one somexy(croom). */
        const pos = { x: 0, y: 0 };
        if (!somexy(croom, pos))
            continue;
        /* create_object:2213 — mksobj_at(o->id, x, y, TRUE, !named); no name=
         * field here, so named is FALSE and artif is TRUE. */
        const otmp = await mksobj_at(CORPSE, pos.x, pos.y, true, true);
        /* create_object:2260-2265 — `if (o->corpsenm != NON_PM) ...
         * set_corpsenm(otmp, o->corpsenm)`.  This is the SECOND corpse timer:
         * set_corpsenm stops the one mksobj just started and starts another. */
        if (otmp && mnum !== NON_PM)
            set_corpsenm(otmp, mnum);
        /* lspo_object:3706-3714 — for a CORPSE with no historic/male/female
         * field, spe is the empty CORPSTAT flag word; create_object:2231 then
         * assigns it because spe != -127. */
        if (otmp)
            otmp.spe = 0;
        /* create_object:2422-2423 — `if (!(o->containment & SP_OBJ_CONTENT))
         * stackobj(otmp);`.  Two massacre corpses of the same species landing on
         * one square merge into one stack in C, so the pet's dog_goal() scan
         * (dogmove.c:529) sees one object where this port saw two. */
        if (otmp)
            await stackobj(otmp);
    }
}
async function themeroom_fill_statuary(croom) {
    /* nhlib.lua:30-38 d(dice, faces) sums `dice` rolls of math.random(1, faces);
     * math.random's 2-arg shim (nhlib.lua:9-10) is nh.random(lo, hi + 1 - lo),
     * i.e. lo + rn2(extent).  d(5,5) is therefore five rn2(5). */
    let nstatues = 0;
    for (let i = 0; i < 5; i++)
        nstatues += nhlib_math_random_two_arg(1, 5);
    for (let i = 0; i < nstatues; i++) {
        /* C sp_lev.c create_object:2203 — get_location_coord(DRY, croom, random). */
        const pos = { x: 0, y: 0 };
        if (!somexy(croom, pos))
            continue;
        /* create_object:2213 — mksobj_at(o->id, x, y, TRUE, !named); the spec
         * carries no name= field, so named is FALSE and artif is TRUE.
         * create_object:2229-2230 — `if (o->spe != -127) otmp->spe = o->spe;`.
         * lspo_object's STATUE arm (sp_lev.c:3706-3713) sets tmpobj.spe =
         * lflags for this spec, and the bare { id = "statue" } of
         * themerms.lua:195 carries no historic/male/female, so lflags is 0
         * and the assignment DISCARDS the gender mksobj just rolled
         * (mkobj.c:1222).  spe 0 = CORPSTAT_RANDOM: on a stone-to-flesh
         * revive, trap.c:766-771 passes no MM_MALE/MM_FEMALE, so
         * makemon.c:1279 draws the rn2(2) gender roll for genderless
         * corpsenm.  Without this the rolled CORPSTAT_FEMALE/MALE survived
         * and animate_statue skipped that draw. */
        const stat = await mksobj_at(STATUE, pos.x, pos.y, true, true);
        stat.spe = 0;
    }
    /* themerms.lua:196 — d(3) is the ONE-argument form, nhlib.lua:33
     * `return math.random(1, dice)`, so a single rn2(3). */
    const ntraps = nhlib_math_random_two_arg(1, 3);
    for (let i = 0; i < ntraps; i++) {
        /* C sp_lev.c create_trap:1823 — get_free_room_loc(croom, random). */
        const pos = { x: 0, y: 0 };
        if (!somexy(croom, pos))
            continue;
        await themeroom_des_trap(STATUE_TRAP, pos.x, pos.y, true);
    }
}
async function themeroom_des_object(otyp, x, y) {
    return await mksobj_at(otyp, x, y, true, true);
}
async function themeroom_fill_boulder_room(croom) {
    for (const c of themeroom_percentage_cells(croom, 30)) {
        if (nhlib_percent(50))
            await themeroom_des_object(BOULDER, c.x, c.y);
        else
            await themeroom_des_trap(ROLLING_BOULDER_TRAP, c.x, c.y, true);
    }
}
async function themeroom_fill_spider_nest(croom, difficulty) {
    const spooders = difficulty > 8;
    for (const c of themeroom_percentage_cells(croom, 30)) {
        const spider_on_web = spooders && nhlib_percent(80);
        await themeroom_des_trap(WEB, c.x, c.y, spider_on_web);
    }
}
// C ref: themerms.lua themeroom_fill() lines 1009-1048
// Reservoir-samples one fill from THEMEROOM_FILL_META using rn2().
// Called immediately after des.room() creates the room (inside lspo_room in C).
// Fill contents are not yet ported; the divergence will move past this point.
async function themeroom_fill_rng(aroom, difficulty) {
    const rm = { lit: !!aroom.rlit };
    let pick = null;
    if (_debug_fill_idx !== null) {
        if (is_fill_eligible(THEMEROOM_FILL_META[_debug_fill_idx], rm, difficulty)) {
            pick = THEMEROOM_FILL_META[_debug_fill_idx];
        } else {
            await pline(`Warning: fill '${THEMEROOM_FILL_META[_debug_fill_idx].name}' is not eligible in room that generated it`);
            return;
        }
    } else {
        let total_frequency = 0;
        for (const fill of THEMEROOM_FILL_META) {
            if (!is_fill_eligible(fill, rm, difficulty))
                continue;
            const this_frequency = fill.frequency || 1;
            total_frequency += this_frequency;
            if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
                pick = fill;
            }
        }
        if (!pick) {
            await lifecycle_impossible('no eligible themed room fills?');
            return;
        }
    }
    // Execute fill content RNG for fills that call somex/somey to place items.
    // C ref: themerms.lua themeroom_fill() line 1048: themeroom_fills[pick].contents(rm)
    if (pick !== null && aroom && aroom.lx != null) {
        const w = aroom.hx - aroom.lx + 1;
        const h = aroom.hy - aroom.ly + 1;
        if (pick.name === 'Ice room') {
            // themerms.lua:49-57 — `local ice = selection.room()` then, under
            // percent(25), `ice:iterate(ice_melter)` draws one nh.rn2(1000) per
            // SET point.  Same selection.room() cell count as Storeroom below.
            // themerms.lua:50 des.terrain(ice, "I") runs BEFORE the melt draws:
            // sel_set_ter -> set_levltyp_lit(ICE); sp_lev.c:4625 icedpool only
            // when splev_init_present (not for a themeroom).
            /* nhlsel.c:938-940 l_selection_iterate walks y-outer, x-inner,
             * unlike the dx-outer order roomRndcoordCells returns, so the
             * i-th nh.rn2(1000) melt time lands on the i-th cell in row-major order. */
            const iceCells = roomRndcoordCells(aroom).sort((p, q) => (p.y - q.y) || (p.x - q.x));
            for (const c of iceCells) {
                const loc = game.level?.at(c.x, c.y);
                if (loc) loc.typ = ICE;
            }
            /* themerms.lua:52-54 nh.start_timer_at -> nhlua.c:1635-1639:
             * spot_stop_timers + start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY). */
            nhlib_fill_ice_room_rng(iceCells.length, (i, when) => {
                const c = iceCells[i];
                spot_stop_timers(c.x, c.y, MELT_ICE_AWAY);
                start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, long_to_any((c.x << 16) | c.y));
            }, 1000 - levelDifficulty() * 100);
        }
        else if (pick.name === 'Cloud room') {
            // C themerms.lua:62-70 — des.monster({id="fog cloud", asleep=true})
            // per (numpoints/4) iterations, then des.gas_cloud (RNG-free).
            // The fill used to draw only somex/somey per iteration and create
            // nothing, because its makemon reached nhlib.js through the
            // `registerNhlibMakemon` module-global that no file in js/ ever
            // called.  It also skipped find_montype's rn2(2) gender fallback
            // fog cloud runs leaves 316..324 where this fill drew 2.
            const fogCells = roomRndcoordCells(aroom);
            await nhlib_fill_cloud_room_rng(fogCells.length, w, h,
                themeroom_monster_fill_hooks(aroom));
            /* C themerms.lua:68 des.gas_cloud({ selection = fog }).  The
             * selection cloud is permanent by default (ttl=-1) and suppresses
             * each fog monster's one-cell m_everyturn_effect vapor while it
             * remains inside the room. */
            create_gas_cloud_selection(fogCells, 0);
        }
        else if (pick.name === 'Boulder room') {
            await themeroom_fill_boulder_room(aroom);
        }
        else if (pick.name === 'Spider nest') {
            await themeroom_fill_spider_nest(aroom, difficulty);
        }
        else if (pick.name === 'Trap room') {
            await themeroom_fill_trap_room(aroom);
        }
        else if (pick.name === 'Garden') {
            // C themerms.lua:116-129 — des.monster({id="wood nymph",
            // asleep=true}) + percent(30) des.feature("fountain") per
            // (numpoints/6) iterations.  Same two gaps as the cloud room minus
            // find_montype's draw (PM_WOOD_NYMPH is M2_FEMALE, so C's gender
            // arm takes no rn2(2)) — the induced_align rn2(3) was missing, the
            // nymph was never created, and the fountain's drawn coordinate was
            // discarded instead of being written to the map.
            await nhlib_fill_garden_rng(roomRndcoordCells(aroom).length, w, h,
                themeroom_monster_fill_hooks(aroom));
            // C themerms.lua:128-129 — the Garden fill's LAST statement:
            //   table.insert(postprocess, { handler = make_garden_walls,
            //                               data = { sel = selection.room() } });
            // selection.room() (nhlsel.c:432 l_selection_room ->
            // selvar.c selection_from_mkroom) snapshots gc.coder->croom's cells
            // HERE, at fill time; the handler runs later, at post_level_generate.
            // Registering consumes no RNG.  Missing this registration was worth
            _pendingPostprocess.push({ kind: 'garden_walls',
                cells: roomRndcoordCells(aroom) });
        }
        else if (pick.name === 'Buried treasure') {
            // C ref: themerms.lua themeroom_fills["Buried treasure"].contents (lines 134-148):
            //   des.object({ id = "chest", buried = true, contents = function(otmp)
            //     ... for i = 1, d(3,4) do des.object() end });
            // The previous JS model (nhlib_fill_buried_treasure_rng) only consumed the
            // chest's somex/somey placement, then stopped — so JS skipped the chest object
            // (and its auto-stocked mkbox_cnts contents, its burial, and the d(3,4) contents).
            // C creates: chest object → mkbox_cnts auto-fill → bury → d(3,4) random contents.
            //
            // 1. des.object({id="chest"}) → sp_lev.c create_object():
            //    C ref: sp_lev.c create_object:2203 get_location_coord.
            const _chestXY = {};
            const _chestPos = somexy(aroom, _chestXY) ? _chestXY : null;
            //    then mksobj_at(CHEST, x, y, init=TRUE): mksobj(CHEST,TRUE) →
            //      next_ident + mksobj_init (olocked rn2(5) + otrapped rn2(10) + tknown)
            //      + mkbox_cnts(chest) (auto-stocks the container — the recursive
            //    C ref: mkobj.c mksobj:1186 / mksobj_init CHEST:1083-1093 / mkbox_cnts:514.
            //    artif = !named (sp_lev.c create_object:2212); the spec carries no
            //    name= field, so named is FALSE and artif is TRUE.  Inert for a
            //    TOOL_CLASS chest (mksobj_init only consults artif in the
            //    WEAPON_CLASS/ARMOR_CLASS arms), but the argument is C's.
            const _chest = await mksobj(CHEST, true, true);
            // C ref: themerms.lua:136-142 — the chest's contents() callback registers a
            // make_dig_engraving postprocess entry (the buried chest is the dig target).
            // Registering consumes no RNG; the deferred callback (post_level_generate)
            // xobj.NO_OBJ is nil for a real chest, so the registration always fires.
            // C themerms.lua:140-141 — data = { x = xobj.ox, y = xobj.oy } (the
            // text points toward).  The chest is placed at the somexy coord above.
            _pendingPostprocess.push({ kind: 'dig_engraving',
                data: { x: _chestPos ? (_chestPos.x | 0) : 0,
                        y: _chestPos ? (_chestPos.y | 0) : 0 } });
            // 2. buried=true → bury_an_obj(chest)  C ref: dig.c:1990-2034.
            //    obj_resists(chest, 0, 0): non-special tool → rn2(100), never resists.
            //    A wooden chest is organic and not under ice, so the organic branch
            //    fires obj_resists(chest, 5, 95) → rn2(100), then (not resisting)
            //    start_timer(250 + rnd(250)) → rnd(250).
            //    C ref: zap.c obj_resists:1458-1472 (rn2(100) for a generated otyp);
            //           dig.c:2031-2034 the organic rot-timer rnd(250).
            // at <x,y>, then a container has its auto-stocked contents thrown away
            // (delete_contents, sp_lev.c:2342-2345) before the callback restocks it.
            if (_chestPos) {
                _chest.ox = _chestPos.x | 0;
                _chest.oy = _chestPos.y | 0;
                place_object(_chest, _chest.ox, _chest.oy);
            }
            while (_chest.cobj) {
                const _old = _chest.cobj;
                obj_extract_self(_old);
                obj_stop_timers(_old);
            }
            _chest.owt = weight(_chest);
            obj_resists(_chest, 0, 0); // bury_an_obj obj_resists(chest,0,0)
            // dig.c:2027-2028 — the timer starts only when the 5% resist roll fails.
            if (is_organic(_chest) && !obj_resists(_chest, 5, 95)) {
                // dig.c:2033-2034 start_timer(250L + rnd(250), TIMER_OBJECT,
                // ROT_ORGANIC, obj_to_any(otmp)) — a REAL timer: when it fires,
                // rot_organic (dig.c:2125) buries the chest's contents.
                start_timer(250 + rnd(250), TIMER_OBJECT, ROT_ORGANIC, obj_to_any(_chest));
            }
            // dig.c:2045 bury_an_obj: obj_extract_self + add_to_buried(chest).  The
            // chest and each content object it later receives ride the buried chain
            // (restobjchn numbers every one of them with next_ident on a bones load).
            obj_extract_self(_chest);
            add_to_buried(_chest);
            // 3. contents callback: for i = 1, d(3,4) do des.object() end.
            //    d(3,4) is nhlib.lua d(): 3 dice each rn2(4)+1.  C ref: nhlib.lua:36/10.
            let nContents = 0;
            for (let die = 0; die < 3; die++)
                nContents += rn2(4) + 1;
            for (let ci = 0; ci < nContents; ci++) {
                // des.object() (no id) → create_object: get_location_coord(random) →
                //   somexy, then mksobj_at(RANDOM, x, y, TRUE): mkobj(RANDOM_CLASS)
                //   (rnd(100) class pick @mkobj.c:281, rnd(1000) @mkobj.c:290, next_ident,
                //    mksobj_init/blessorcurse).  Added to the chest's contents (no burial).
                //   C ref: sp_lev.c create_object:2203/2213, mkobj.c mkobj:1238.
                //   artif is C's `!named` (sp_lev.c:2210).  themerms.lua:143-145 calls
                //   des.object() with no argument at all, so o->name.str is NULL, named
                //   is FALSE and artif is TRUE.  Passing FALSE here skipped mksobj_init's
                //   artifact roll — rn2(20 + 10*nartifact_exist()) for a WEAPON_CLASS
                //   pick (mkobj.c:889) and rn2(40 + 10*nartifact_exist()) for an
                //   ARMOR_CLASS one (mkobj.c:1098) — so JS left mksobj_init one draw
                //   early and ran into mkobj_erosions while C was still inside it.
                somexy(aroom, {});
                const _content = await mkobj(RANDOM_CLASS, true);
                // sp_lev.c:2330-2340: the object lands in the buried chest.
                if (_content) {
                    obj_extract_self(_content);
                    await add_to_container(_chest, _content);
                }
            }
            _chest.owt = weight(_chest);
        }
        else if (pick.name === 'Buried zombies') {
            // C ref: themerms.lua themeroom_fills["Buried zombies"].contents (lines 150-169)
            // nhlib_fill_buried_zombies_rng only consumed shuffle+somexy+rn2(21), missing
            // the full C mkobj RNG path: next_ident + rndmonst_adj + gender rn2(2)? +
            // set_corpsenm#1 (start_corpse_timeout from mksobj) + set_corpsenm#2
            // (start_corpse_timeout from lspo_object after mksobj_at) + bury_an_obj obj_resists.
            // Fix: call mksobj(CORPSE) to consume the variable mkobj RNG, then model
            // the second set_corpsenm (lspo_object:2263) and bury_an_obj:2007 paths.
            // C ref: mkobj.c:1390 start_corpse_timeout, sp_lev.c:2263 set_corpsenm,
            //        dig.c:2007 bury_an_obj obj_resists, themerms.lua:167 start_timer.
            {
                const zombSize = difficulty > 6 ? 8 : difficulty >= 4 ? 6 : 4;
                const nz = Math.trunc(w * h / 2);
                const zombifiable = [59, 165, 72, 44]; // kobold, gnome, orc, dwarf
                if (difficulty > 3) zombifiable.push(264, 260); // elf, human
                if (difficulty > 6) zombifiable.push(174, 169); // ettin, giant
                for (let zi = 0; zi < nz; zi++) {
                    // 1. shuffle(zombifiable) — rn2(zombSize..2)
                    //    C: nhlib.lua:18 for i = #list, 2, -1 do math.random(i) end
                    for (let j = zombSize; j >= 2; j--) {
                        const k = rn2(j);
                        [zombifiable[j - 1], zombifiable[k]] =
                            [zombifiable[k], zombifiable[j - 1]];
                    }
                    // 2. des.object(corpse,buried) → get_location → somexy(croom)
                    //    C ref: sp_lev.c:1227-1239 — retry loop until is_ok_location passes.
                    //    For irregular rooms, somexy() itself retries rn2(w)+rn2(h) until
                    //    finding a cell with the correct roomno (mkroom.c somexy:100+ loop).
                    //    For regular rooms, somexy() returns on first try.
                    //    Use the actual somexy() call to get correct retry count.
                    const corpsePos = {};
                    somexy(aroom, corpsePos);
                    // 3. mksobj_at(CORPSE,x,y,TRUE) inside C lspo_object:
                    //    a. mksobj(CORPSE,init=TRUE) → next_ident + mksobj_init(rndmonnum)
                    //       + spe gender rn2(2)? + set_corpsenm#1 → start_corpse_timeout#1
                    //    (place_object follows in C but consumes no RNG)
                    const _corpse = await mksobj(CORPSE, true, false);
                    // 3a'. lspo_object:3706-3714 gives a corpse with no
                    //     historic/male/female field spe = 0, and create_object
                    //     (sp_lev.c:2230-2231) assigns it over mksobj's gender.
                    _corpse.spe = 0;
                    // 3b. lspo_object:2263 set_corpsenm(specific_pm) → start_corpse_timeout#2
                    //     Zombifiable are never PM_LIZARD/PM_LICHEN/S_TROLL/rider, so
                    //     always rnz(25) = rn2(1000)+rne(4)+rn2(2). gz.zombify=0 during mklev.
                    set_corpsenm(_corpse, zombifiable[0]);
                    place_object(_corpse, corpsePos.x, corpsePos.y);
                    // 4. bury_an_obj:2007 obj_resists(corpse,0,0), then move it
                    obj_resists(_corpse, 0, 0);
                    obj_extract_self(_corpse);
                    add_to_buried(_corpse);
                    // 5. o:start_timer("zombify-mon", math.random(990,1010)) → rn2(21)
                    //    C ref: themerms.lua:167
                    obj_stop_timers(_corpse);
                    start_timer(990 + rn2(21), TIMER_OBJECT, ZOMBIFY_MON,
                                obj_to_any(_corpse));
                }
            }
        }
        else if (pick.name === 'Massacre') {
            await themeroom_fill_massacre(aroom);
        }
        else if (pick.name === 'Statuary') {
            await themeroom_fill_statuary(aroom);
        }
        else if (pick.name === 'Light source') {
            const lampPos = {};
            if (somexy(aroom, lampPos)) {
                const lamp = await mksobj_at(OIL_LAMP, lampPos.x, lampPos.y, true, false);
                if (lamp)
                    begin_burn(lamp, false);
            }
        }
        else if (pick.name === 'Temple of the gods') {
            // C ref: themerms.lua:214-218 — des.altar({align=align[1/2/3]}) × 3.
            // Each des.altar() calls create_altar() → get_free_room_loc(croom, random_coord).
            // get_free_room_loc:
            //   1. First try: get_location_coord(random) → get_location(random) → somexy → somex+somey.
            //   2. If levl[x][y].typ != ROOM (e.g. already ALTAR from prior placement): retry loop
            //      via get_room_loc → somexy until ROOM found (up to 100 tries).
            // After success, create_altar calls set_levltyp(x,y,ALTAR) → marks cell as ALTAR.
            // Subsequent altars may hit an already-placed ALTAR cell and need extra somexy calls.
            // C ref: sp_lev.c:1386-1404 get_free_room_loc, sp_lev.c:1361-1375 get_room_loc,
            //        sp_lev.c:2455 create_altar→get_free_room_loc, sp_lev.c:2467 set_levltyp(ALTAR).
            for (let altarI = 0; altarI < 3; altarI++) {
                // First try: get_location_coord(random) → get_location → somexy (somex+somey).
                const c = {};
                somexy(aroom, c);
                const firstLoc = game.level.at(c.x, c.y);
                if (firstLoc && firstLoc.typ !== ROOM) {
                    // Retry: get_room_loc → somexy until ROOM found (up to 100 tries).
                    // C ref: sp_lev.c:1396-1399 — do { get_room_loc } while (typ!=ROOM && trycnt<=100).
                    let trycnt = 0;
                    while (trycnt++ <= 100) {
                        somexy(aroom, c);
                        const retryLoc = game.level.at(c.x, c.y);
                        if (retryLoc && retryLoc.typ === ROOM)
                            break;
                    }
                }
                // Mark the placed altar so subsequent altars know the cell is taken.
                // C ref: sp_lev.c:2467 create_altar: set_levltyp(x, y, ALTAR).
                const placedLoc = game.level.at(c.x, c.y);
                if (placedLoc && placedLoc.typ === ROOM) {
                    placedLoc.typ = ALTAR;
                    /* lspo_altar get_table_align (sp_lev.c): align = align[altarI+1] */
                    const nm = (game._themedAlign || ['law', 'neutral', 'chaos'])[altarI];
                    placedLoc.altarmask = Align2amask(nm === 'law' ? A_LAWFUL : nm === 'neutral' ? 0 : -1);
                }
            }
        }
        else if (pick.name === 'Ghost of an Adventurer') {
            // C ref: themerms.lua:223 — loc = selection.room():rndcoord(0).
            // selection.room() (selvar.c:781 selection_from_mkroom) sets every cell in
            // [lx..hx]x[ly..hy] whose levl[x][y].roomno == rmno AND !edge.  rndcoord
            // (selvar.c:302) then counts those set cells (idx), fires c = rn2(idx) and
            // returns the c-th set cell in dx-outer dy-inner traversal order.  The
            // ghost monster AND all its dropped objects are placed at that single loc.
            // The previous port consumed rn2(w*h) but discarded the coordinate, placing
            // the ghost (PM_GHOST=287) at (0,0) — a phantom monster whose spurious
            const ghostCells = roomRndcoordCells(aroom);
            // Place the ghost's dropped objects at the same rndcoord loc (C themerms
            // ghost fill: des.object({coord=loc})); mkobj_at = mkobj + place_object
            // (place_object is RNG-free, so the RNG stream is unchanged vs the prior
            // bare mkobj — only the object now lands on the map instead of leaking).
            const ghostMkobjAt = async (oclass, artif, ox, oy) => {
                const otmp = await mkobj_at(oclass, ox, oy, artif);
                if (otmp) {
                    otmp.blessed = false;   /* buc="not-blessed" (see below) */
                    /* C sp_lev.c:2281-2282: des.object without eroded clears erosion */
                    otmp.oeroded = otmp.oeroded2 = 0;
                    otmp.oerodeproof = 0;
                }
                // C sp_lev.c:2422-2423: des.object stacks after applying BUC.
                await stackobj(otmp);
                return otmp;
            };
            // The fill's dagger/bow/arrow are `id=` specs, not `class=` specs, so C
            // takes create_object's mksobj_at branch (sp_lev.c:2212-2213,
            // `mksobj_at(o->id, x, y, TRUE, !named)`) and NEVER draws mkobj()'s
            // class-selection rnd(mkobj.c:289).  Routing them through mkobj_at (as
            // this fill did) inserted one spurious leaf per object.
            // buc="not-blessed" is C create_object's `case 6: unbless(otmp)` — RNG-free,
            // applied after mksobj_init's blessorcurse has already rolled.
            const ghostMksobjAt = async (otyp, ox, oy) => {
                const otmp = await mksobj_at(otyp, ox, oy, true, true);
                if (otmp) {
                    otmp.blessed = false;
                    /* C sp_lev.c:2281-2282: des.object without eroded clears erosion */
                    otmp.oeroded = otmp.oeroded2 = 0;
                    otmp.oerodeproof = 0;
                }
                // C sp_lev.c:2422-2423: the explicit object-id path stacks too.
                await stackobj(otmp);
                return otmp;
            };
            // C ref: themerms.lua:225 ghost spec has asleep=true, waiting=true.  makemon
            // is async, so the fill awaits it before proceeding to the ghost's objects.
            // Set the spec flags after creation completes (sp_lev.c:2133 /
            // sp_lev.c:2162).  STRAT_WAITFORU keeps the ghost in dochug's WAITMASK
            // early-exit (monmove.c:739) until it can see the hero.
            const ghostMakemon = async (mndx, mx, my, flags) => {
                const p = await makemon(mndx, mx, my, flags);
                const gh = game.fmon;
                if (gh && (gh.mnum === mndx || gh.mndx === mndx)) {
                    gh.msleeping = 1;               // asleep = true (sp_lev.c:2133)
                    gh.mstrategy = (gh.mstrategy | 0) | STRAT_WAITFORU; // waiting = true
                }
                return p;
            };
            await nhlib_fill_ghost_rng(ghostCells, ghostMakemon, ghostMkobjAt, ghostMksobjAt);
        }
        else if (pick.name === 'Storeroom') {
            // C themerms.lua:250-262 — des.object("chest") / des.monster({class="m",
            // appear_as="obj:chest"}).  Both are REAL creations in C; the fill used to
            // draw only somex/somey for each and create nothing, because the three
            // register* hooks js/nhlib.js declares for this have no caller in js/.
            // C themerms.lua:252 `selection.room():percentage(30)`.  The
            // percentage roll is one rn2(100) per SET point of the selection
            // (selvar.c:239-241), and selection.room() sets only the cells whose
            // levl[x][y].roomno == rmno and !edge (selvar.c:792-796) — NOT the
            // whole lx..hx/ly..hy box.  On a map-first theme room those differ:
            // so `w * h` drew NINE selection rolls C never made and that was the
            // existing mirror of selection_from_mkroom (it is what Cloud room,
            // Garden, Ghost and Teleportation hub already count with), and it
            // agrees with w*h exactly on an ordinary rectangular room.
            await nhlib_fill_storeroom_rng(roomRndcoordCells(aroom).length, w, h, {
                lx: aroom.lx, ly: aroom.ly,
                chestOtyp: CHEST,
                inducedAlign: induced_align,
                /* C sp_lev.c:1956 pm = mkclass(class, G_NOGEN) with class =
                 * def_char_to_monclass('m') = S_MIMIC; mkclass forwards A_NONE. */
                mkclassMimic: () => mkclassAligned(13 /* S_MIMIC */, 0x0200 /* G_NOGEN */, A_NONE),
                makemon: async (pm, mx, my, mmflags) => {
                    const before = game.fmon;
                    const p = await makemon(pm, mx, my, mmflags);
                    const mt = game.fmon;
                    const mndx = mt ? (mt.mnum ?? mt.mndx) : null;
                    if (mt && mt !== before && mndx != null
                        && ((MONS_ROWS[mndx]?.[0] | 0) === 13 /* S_MIMIC */)
                        && !Protection_from_shape_changers_nc()) { /* sp_lev.c:2006 */
                        mt.m_ap_type = 2 /* M_AP_OBJECT */;
                        mt.mappearance = CHEST;
                    }
                    return p;
                },
                mksobjAt: mksobj_at,
                /* C sp_lev.c:1977 — `if (MON_AT(x, y) && enexto(&cc, x, y, pm))`.
                 * MON_AT is rm.h:506, i.e. m_at(). */
                monAt: (mx, my) => m_at(mx, my),
                /* m.coord is SP_COORD_PACK_RANDOM(0): route it through the
                 * shared packed-coordinate helper, including its inner retry. */
                getLocationCoord: (coord, humidity) =>
                    get_location_coord(coord, humidity, aroom, SP_COORD_IS_RANDOM),
                /* C teleport.c:198-203 — enexto(cc,xx,yy,mdat) is
                 *   enexto_core(cc,xx,yy,mdat,GP_CHECKSCARY)
                 *   || enexto_core(cc,xx,yy,mdat,NO_MM_FLAGS)
                 * so a scary-square rejection costs a SECOND ring shuffle.
                 * enexto_core wants the C-shaped `fakemon` goodpos() builds
                 * from the permonst, same as the two makemon call sites above. */
                enexto: (mx, my, pm) => {
                    const mndx = makemonPtrMndx(pm);
                    const fakemon = (pm == null || mndx === NON_PM) ? null
                        : { data: permonstTemplate(mndx), mnum: mndx, m_id: 0,
                            wormno: 0, mx: 0, my: 0, minvent: null };
                    return enexto_core(mx, my, fakemon, GP_CHECKSCARY)
                        || enexto_core(mx, my, fakemon, 0 /* NO_MM_FLAGS */);
                },
                /* C sp_lev.c:1980 — inside_room(croom, x, y); croom is the
                 * themeroom whose contents closure is running. */
                insideRoom: (mx, my) => inside_room(aroom, mx, my),
            });
        }
        else if (pick.name === 'Teleportation hub') {
            // Accumulate trap info for post_level_generate deferred callback.
            // C ref: themerms.lua:268-276 -- each trap registers make_a_trap in postprocess.
            //
            // Build selection.room():filter_mapchar(".") for this room: all ROOM cells
            // in (lx..hx, ly..hy) in x-outer y-inner order (mirrors C selection traversal).
            // C ref: nhlsel.c selection_from_mkroom iterates y then x inside lx..hx/ly..hy,
            //        BUT selection_filter_mapchar iterates x then y (x-outer y-inner).
            //        selvar.c selection_rndcoord also iterates x-outer y-inner.
            const hubRoomCells = [];
            for (let cx = aroom.lx; cx <= aroom.hx; cx++)
                for (let cy = aroom.ly; cy <= aroom.hy; cy++) {
                    const hloc = game.level.at(cx, cy);
                    if (hloc && hloc.typ === ROOM)
                        hubRoomCells.push({ x: cx, y: cy });
                }
            /* aroom.lx is C's croom->lx -- the origin l_selection_rndcoord
             * subtracts before themerms.lua:270 tests `pos.x > 0`. */
            const hubResult = nhlib_fill_teleportation_hub_rng(hubRoomCells, aroom.lx);
            _pendingTeleportTraps += hubResult.count;
            for (const coord of hubResult.srcCoords) {
                _pendingTeleportCoords.push(coord);
                // C ref: themerms.lua:272-276 — each trap registers a make_a_trap
                // postprocess entry in insertion order.
                _pendingPostprocess.push({ kind: 'teleport_trap', src: coord });
            }
        }
    }
}
// C ref: mklev.c:1428 themerooms_post_level_generate() -> sp_lev.c lua post_level_generate()
// -> themerms.lua:1092-1097 post_level_generate() -> make_a_trap() for each teleport trap.
//
// make_a_trap (themerms.lua:1081-1089): for each registered teleportation hub trap,
// picks a destination using:
//   repeat
//     data.teledest = locs:rndcoord(1);  -- rn2(remaining ROOM cell count), removeit=true
//   until (data.teledest.x ~= data.coord.x and data.teledest.y ~= data.coord.y);
//   des.trap(data)   -- -> create_trap -> mktrap -> rnd(4) victim check (always consumed)
//
// C ref: nhlsel.c l_selection_not() -> selection_clear(sel,1) = ALL bits set, then
//        selection_filter_mapchar(ROOM) keeps only levl[x][y].typ==ROOM cells.
//        selection_rndcoord counts set bits (idx), then calls rn2(idx), iterates x-outer y-inner.
// C ref: selvar.c selection_filter_mapchar() iterates full map bounds (0..COLNO-1, 0..ROWNO-1).
//
// Retry condition (C-faithful): dest.x == src.x OR dest.y == src.y (retry if either matches).
// srcCoords store ABSOLUTE trap cell coords; since both data.coord and teledest have matching
// -1 offsets that cancel, the effective condition is abs_dest_x == abs_src_x || abs_dest_y == abs_src_y.
//
// After the destination is picked, des.trap(data) calls mktrap() which evaluates
// rnd(4) as part of the victim-placement guard (mklev.c:2147). The body of that
// guard is NOT entered for TELEP_TRAP (kind < HOLE || kind == MAGIC_TRAP = FALSE),
// but rnd(4) is still consumed because conditions before it in the && chain are TRUE.
// C ref: mklev.c:2145-2154.
async function themerooms_post_level_generate() {
    // C ref: themerms.lua:1093 post_level_generate() iterates the postprocess table in
    // insertion order, firing each handler. Two handler kinds consume RNG:
    //   - make_dig_engraving (themerms.lua:1052) — registered by Buried treasure fill.
    //   - make_a_trap        (themerms.lua:1081) — registered by Teleportation hub fill.
    if (_pendingPostprocess.length === 0)
        return;
    // then selection_rndcoord traversal (x-outer, y-inner, full map bounds).
    // C ref: selvar.c selection_filter_mapchar() iterates x from 0..COLNO-1, y from 0..ROWNO-1.
    // No postprocess handler alters levl[][].typ, so this snapshot is valid for all entries.
    const roomCells = [];
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = game.level.at(x, y);
            if (loc && loc.typ === ROOM)
                roomCells.push({ x, y });
        }
    // Fire each registered postprocess callback in insertion order.
    // (make_garden_walls does NOT consult roomCells, so an empty ROOM-cell set
    // must not skip it — only the two rndcoord handlers below need one.)
    for (const entry of _pendingPostprocess) {
        if (roomCells.length === 0 && entry.kind !== 'garden_walls')
            continue;
        if (entry.kind === 'dig_engraving') {
            // C ref: themerms.lua:1052-1054 make_dig_engraving:
            // selection_rndcoord (selvar.c:302) consumes exactly one rn2(roomCells.length).
            // des.engraving({coord=pos,type="burn",text=...}) uses an explicit coord, so
            // get_location_coord/make_engr_at(BURN) consume no further RNG (engrave.c:409).
            const _idx = rn2(roomCells.length);
            const _pos = roomCells[_idx];
            // C themerms.lua:1052-1068 make_dig_engraving — burn "Dig <direction>"
            // pointing from the engraving cell toward the buried chest (data.x/y).
            //   tx = data.x - pos.x - 1;  ty = data.y - pos.y;
            // l_selection_rndcoord (nhlsel.c:412-421) returns pos RELATIVE: with no
            // coder croom it subtracts gx.xstart/gy.ystart (sp_lev.c:208-209: 1, 0),
            // while xobj.ox/oy are absolute.  So lua's `data.x - pos.x - 1` is
            // ox - (x - 1) - 1 = ox - x.
            const _tx = (entry.data ? (entry.data.x | 0) : 0) - _pos.x;
            const _ty = (entry.data ? (entry.data.y | 0) : 0) - _pos.y;
            let _dig = '';
            if (_tx === 0 && _ty === 0) {
                _dig = ' here';
            } else {
                if (_tx !== 0)
                    _dig = ` ${Math.abs(_tx)} ${_tx > 0 ? 'east' : 'west'}`;
                if (_ty !== 0)
                    _dig += ` ${Math.abs(_ty)} ${_ty > 0 ? 'south' : 'north'}`;
            }
            // des.engraving({coord=pos, type="burn", text="Dig"..dig}) → make_engr_at(BURN).
            make_engr_at(_pos.x, _pos.y, 'Dig' + _dig, null, 0, BURN);
        }
        else if (entry.kind === 'teleport_trap') {
            // C ref: themerms.lua:1081-1088 make_a_trap.
            const src = entry.src;
            // Each make_a_trap call creates a fresh locs selection (not shared).
            // Clone the current room cell list for this trap's repeat loop.
            const locs = roomCells.slice();
            // repeat...until dest.x ~= src.x and dest.y ~= src.y
            // C ref: themerms.lua:1084-1086
            let destX, destY;
            do {
                // selection_rndcoord: rn2(locs.length), then pick that index, remove it.
                const idx = rn2(locs.length);
                const dest = locs[idx];
                destX = dest.x;
                destY = dest.y;
                // Remove picked cell (removeit=1 in C)
                locs.splice(idx, 1);
            } while (src && !(destX !== src.x && destY !== src.y));
            const _gl = (game.gl = game.gl || {});
            const _xstart = (game.gx?.xstart) | 0;
            const _ystart = (game.gy?.ystart) | 0;
            /* C sp_lev.c:4445-4451 — lspo_trap stashes the `teledest` coord in
             * gl.launchplace (yes, the launch field: trap.h:23 aliases the two),
             * and maketrap's TELEP_TRAP arm adds xstart/ystart back on.  The Lua
             * side already subtracted them in l_selection_rndcoord
             * (nhlsel.c:415-421), so subtract here to hand maketrap the same
             * Lua-visible value C hands it. */
            _gl.launchplace = { x: destX - _xstart, y: destY - _ystart };
            await mktrap(TELEP_TRAP, MKTRAP_MAZEFLAG | MKTRAP_SEEN, null,
                         { x: src.x, y: src.y });
            /* C sp_lev.c:4468 — `gl.launchplace.x = gl.launchplace.y = 0;` right
             * after create_trap returns, so the next trap does not inherit it. */
            _gl.launchplace = { x: 0, y: 0 };
        }
        else if (entry.kind === 'garden_walls') {
            // C ref: themerms.lua:1071-1078 make_garden_walls(data)
            //   local sel = data.sel:grow();
            //   des.replace_terrain({ selection = sel, fromterrain="w", toterrain="T" });
            //   des.replace_terrain({ selection = sel, fromterrain="S", toterrain="A" });
            // ONE grow, reused by BOTH passes (`sel` is a single Lua local).
            const sel = selection_new();
            for (const c of entry.cells)
                selection_setpoint(c.x, c.y, sel, 1);
            // l_selection_grow (nhlsel.c:631-651) clones first, then grows the
            // clone; data.sel is never mutated.  We already built a fresh
            // selection from the snapshot, so the clone is implicit.
            // dir defaults to "all" = W_ANY, which includes the diagonals
            // (every orthogonal pair is present in the mask).
            selection_do_grow(sel, W_ANY);
            garden_replace_terrain(sel, MATCH_WALL, TREE);
            garden_replace_terrain(sel, SDOOR, AIR);
        }
    }
    _pendingPostprocess = [];
}
/**
 * The selection form of C's lspo_replace_terrain (sp_lev.c:5051-5140) with the
 * defaults themerms.lua's make_garden_walls supplies: no mapfragment, no
 * region, chance=100, lit=SET_LIT_NOCHANGE.  Inlined here rather than routed
 * through js/sp_lev.js's lspo_replace_terrain for the same reason
 * themeroom_map_contents_pre_filler() inlines the region form: the themeroom
 * fills are a hand-driven simulation of the Lua, so there is no LuaTable to
 * hand it and no des-coder lifetime to manage.
 *
 * RNG order (Cardinal Rule 2): x-outer / y-inner over the selection's bounds,
 * starting at max(1, rect.lx); rn2(100) is drawn ONLY where the terrain-match
 * predicate is already true, mirroring C's `&&` short-circuit.
 */
function garden_replace_terrain(sel, fromtyp, totyp) {
    const rect = { lx: 0, ly: 0, hx: 0, hy: 0 };
    selection_getbounds(sel, rect);
    for (let x = Math.max(1, rect.lx); x <= rect.hx; x++) {
        for (let y = rect.ly; y <= rect.hy; y++) {
            if (!selection_getpoint(x, y, sel))
                continue;
            const curtyp = game.level.at(x, y)?.typ ?? 0;
            const matches = (fromtyp === MATCH_WALL && IS_STWALL(curtyp))
                || curtyp === fromtyp;
            /* chance defaults to 100, so rn2(100) < 100 always holds — but the
               draw is C's and must be consumed. */
            if (matches && rn2(100) < 100)
                set_levltyp_lit(x, y, totyp, SET_LIT_NOCHANGE);
        }
    }
    /* C: `if (freesel) selection_free(sel, TRUE)` — freesel is FALSE for a
       caller-supplied selection, so `sel` survives for the second pass. */
}
// C ref: sp_lev.c rnddoor() -- picks random door state from 5-element array.
// array = { D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED } -- ROLL_FROM = rn2(5).
function splev_rnddoor() {
    return [D_NODOOR, D_BROKEN, D_ISOPEN, D_CLOSED, D_LOCKED][rn2(5)];
}
// C ref: sp_lev.c create_door() — consumes RNG for a des.door() call with
// wall="all" and pos=-1 (random wall and position).
//
// Called when a themeroom's contents callback includes des.door({...}).
// In C, lspo_door() → create_door() via a room_door struct.
//
// Parameters:
//   room: the mkroom object (parent room receiving the door)
//   ddMask: initial doormask (-1 = random via rnddoor; D_SECRET = secret door)
//   ddSecret: 0 or 1 from the door type
//
// RNG consumption for mask=-1 (state="random"), secret=0:
//   Fixed: rn2(3); if rn2(3)==0: rn2(5) [D_ISOPEN check], if rn2(5)!=0: rn2(6)
//          [D_LOCKED check]; if mask != D_ISOPEN: rn2(25) [D_TRAPPED].
//   Loop: rn2(4) [wall] + rn2(dim) [position along wall]. Repeat if okdoor fails.
//
// C ref: sp_lev.c:1715-1807
function splev_create_door_rng(room, ddMask, ddSecret) {
    // sp_lev.c:1726 — if mask == -1, determine door type
    let mask = ddMask;
    if (mask === -1) {
        if (!ddSecret) {
            // sp_lev.c:1729
            if (!rn2(3)) {
                // sp_lev.c:1730-1738 — open/locked/closed selection
                if (!rn2(5)) {
                    mask = D_ISOPEN;
                }
                else if (!rn2(6)) {
                    mask = D_LOCKED;
                }
                else {
                    mask = D_CLOSED;
                }
                if (mask !== D_ISOPEN && !rn2(25)) {
                    mask |= D_TRAPPED;
                }
            }
            else {
                mask = D_NODOOR;
            }
        }
        else {
            // sp_lev.c:1741-1747 — secret door type
            if (!rn2(5)) {
                mask = D_LOCKED;
            }
            else {
                mask = D_CLOSED;
            }
            if (!rn2(20)) {
                mask |= D_TRAPPED;
            }
        }
    }
    // sp_lev.c:1751-1799 — wall selection loop (trycnt < 100)
    // For a subroom inside a themeroom, all 4 directions are valid (surrounded by ROOM tiles).
    // The loop consumes rn2(4) for wall direction, rn2(dim) for position.
    // In the common case (fresh inner subroom in ROOM tiles), the first iteration succeeds.
    for (let trycnt = 0; trycnt < 100; trycnt++) {
        const wallDir = rn2(4); // sp_lev.c:1755 switch(rn2(4))
        let x, y;
        let posRng;
        const width = room.hx - room.lx; // hx - lx (= inner width - 1)
        const height = room.hy - room.ly; // hy - ly (= inner height - 1)
        switch (wallDir) {
            case 0: // W_NORTH: y = ly-1, x = lx + rn2(1+hx-lx)
                y = room.ly - 1;
                posRng = 1 + width;
                x = room.lx + rn2(posRng);
                // sp_lev.c:1762: check tile above (y-1) is not obstructed
                if (!isok(x, y - 1))
                    continue;
                {
                    const above = game.level.at(x, y - 1);
                    if (!above || IS_OBSTRUCTED(above.typ))
                        continue;
                }
                break;
            case 1: // W_SOUTH: y = hy+1, x = lx + rn2(1+hx-lx)
                y = room.hy + 1;
                posRng = 1 + width;
                x = room.lx + rn2(posRng);
                if (!isok(x, y + 1))
                    continue;
                {
                    const below = game.level.at(x, y + 1);
                    if (!below || IS_OBSTRUCTED(below.typ))
                        continue;
                }
                break;
            case 2: // W_WEST: x = lx-1, y = ly + rn2(1+hy-ly)
                x = room.lx - 1;
                posRng = 1 + height;
                y = room.ly + rn2(posRng);
                if (!isok(x - 1, y))
                    continue;
                {
                    const left = game.level.at(x - 1, y);
                    if (!left || IS_OBSTRUCTED(left.typ))
                        continue;
                }
                break;
            case 3: // W_EAST: x = hx+1, y = ly + rn2(1+hy-ly)
                x = room.hx + 1;
                posRng = 1 + height;
                y = room.ly + rn2(posRng);
                if (!isok(x + 1, y))
                    continue;
                {
                    const right = game.level.at(x + 1, y);
                    if (!right || IS_OBSTRUCTED(right.typ))
                        continue;
                }
                break;
            default:
                continue;
        }
        if (okdoor(x, y)) {
            // C ref: sp_lev.c create_door():1804-1806 — set_levltyp + doormask assignment.
            const loc = game.level.at(x, y);
            if (loc) {
                loc.typ = ddSecret ? SDOOR : DOOR;
                loc.doormask = mask; // doormask is alias for loc.flags via game.js getter/setter
                // C: add_doors_to_room_mklev() called after contents callback picks up DOOR tiles.
                // Call add_door here to keep doorct/doorindex in sync with C.
                add_door(x, y, room);
            }
            break;
        }
    }
}
// C ref: sp_lev.c lspo_door() — des.door({ state="random", wall="all" })
// msk = doorstates2i[0] = -1 (random); typ = rnddoor() = rn2(5).
// tmpd.secret = (typ == D_SECRET) ? 1 : 0 — D_SECRET not in rnddoor set, so secret=0.
// tmpd.mask = msk = -1.
// sp_lev.c:1709-1727
function splev_lspo_door_random_wall_rng(room) {
    const typ = splev_rnddoor(); // sp_lev.c:4709: typ = rnddoor()
    const secret = (typ === D_SECRET) ? 1 : 0; // always 0 since rnddoor never returns D_SECRET
    splev_create_door_rng(room, -1, secret);
}
// C ref: sp_lev.c lspo_door() — des.door({ state="secret", wall="all" })
// msk = D_SECRET; typ = msk (no rnddoor call); tmpd.secret = 1; tmpd.mask = D_SECRET.
// In create_door with mask=D_SECRET (not -1): skip the mask-determination block entirely.
// sp_lev.c:4705-4727
function splev_lspo_door_secret_wall_rng(room) {
    // msk = D_SECRET → not -1 → no rnddoor(); no mask determination; loop for wall position.
    // secret=1, mask=D_SECRET — but since mask != -1, the rn2(5)/rn2(20) secret block is skipped.
    splev_create_door_rng(room, D_SECRET, 1);
}
// C ref: themerms.lua "Fake Delphi" (themerms.lua:292-305) contents callback.
// Outer room (w=11, h=9, filled=1) is already built as aroom.
// Contents:
//   des.room({ type="ordinary", x=4, y=3, w=3, h=3, filled=1,
//              contents = function()
//                 des.door({ state="random", wall="all" });
//              end });
// RNG sequence:
//   1. build_room(mkr=aroom, {x:4,y:3,w:3,h:3,chance:100}) → rn2(100) + create_subroom:
//      x,y,w,h all fixed → no rnd() calls; litstate_rnd(-1) → rnd() + maybe rn2(77)
//   2. inner contents: splev_lspo_door_random_wall_rng(innerRoom)
//      → rn2(5) [rnddoor] + rn2(3) [mask] + ... + rn2(4) [wall] + rn2(dim)
// C ref: sp_lev.c lspo_room:4088-4107, themerms.lua:292-305
function themerooms_contents_fake_delphi(outerRoom) {
    const innerSpec = {
        chance: 100,
        rtype: OROOM,
        x: 4, y: 3, w: 3, h: 3,
        rlit: -1,
        needfill: FILL_NORMAL,
        joined: true,
        xalign: -1, yalign: -1,
    };
    const innerRoom = build_room(innerSpec, outerRoom); // rn2(100) + create_subroom
    if (innerRoom) {
        // inner contents: des.door({ state="random", wall="all" })
        splev_lspo_door_random_wall_rng(innerRoom);
    }
    /* C sp_lev.c:4104-4105: a failed subroom sets themeroom_failed */
    return !!innerRoom;
}
// C ref: themerms.lua "Room in a room" (themerms.lua:308-320) contents callback.
// Outer room (all-random dims, filled=1) is already built as aroom.
// Contents:
//   des.room({ type="ordinary",
//              contents = function()
//                 des.door({ state="random", wall="all" });
//              end });
// RNG sequence:
//   1. build_room(mkr=aroom, {x:-1,y:-1,w:-1,h:-1,chance:100}) → rn2(100) + create_subroom:
//      x=-1 → rnd(width-w); y=-1 → rnd(height-h); w=-1 → rnd(width-3); h=-1 → rnd(height-3)
//      All four rnd() calls; litstate_rnd(-1) → rnd() + maybe rn2(77)
//   2. inner contents: splev_lspo_door_random_wall_rng(innerRoom)
// C ref: sp_lev.c lspo_room:4088-4107, themerms.lua:308-320
function themerooms_contents_room_in_a_room(outerRoom) {
    const innerSpec = {
        chance: 100,
        rtype: OROOM,
        x: -1, y: -1, w: -1, h: -1,
        rlit: -1,
        // themerms.lua:312: des.room({type="ordinary"}) — no filled= param.
        // lspo_room default inside in_mk_themerooms: filled=0 → FILL_NONE.
        needfill: FILL_NONE,
        joined: true,
        xalign: -1, yalign: -1,
    };
    const innerRoom = build_room(innerSpec, outerRoom); // rn2(100) + create_subroom (4 rnd calls)
    if (innerRoom) {
        // inner contents: des.door({ state="random", wall="all" })
        splev_lspo_door_random_wall_rng(innerRoom);
    }
    /* C sp_lev.c:4104-4105: a failed subroom sets themeroom_failed */
    return !!innerRoom;
}
// C ref: themerms.lua "Huge room with another room inside" (themerms.lua:323-341).
// Outer room (w=rn2(10)+11, h=rn2(5)+8, filled=1) is already built as aroom.
// Contents:
//   if (percent(90)) then                          -- rn2(100)
//     des.room({ type="ordinary", filled=1,
//                contents = function()
//                   des.door({ state="random", wall="all" }); -- door 1
//                   if (percent(50)) then           -- rn2(100)
//                     des.door({ state="random", wall="all" }); -- door 2
//                   end
//                end });
//   end
// C ref: sp_lev.c lspo_room:4088-4107, themerms.lua:323-341
function themerooms_contents_huge_room_inner(outerRoom) {
    let ok = true;
    // nhlib.lua:44: percent(90) = math.random(0,99) < 90 = rn2(100) < 90
    if (rn2(100) < 90) { // themerms.lua:328: if (percent(90))
        const innerSpec = {
            chance: 100,
            rtype: OROOM,
            x: -1, y: -1, w: -1, h: -1,
            rlit: -1,
            needfill: FILL_NORMAL, // filled=1
            joined: true,
            xalign: -1, yalign: -1,
        };
        const innerRoom = build_room(innerSpec, outerRoom);
        if (innerRoom) {
            // inner contents: des.door (door 1)
            splev_lspo_door_random_wall_rng(innerRoom);
            // themerms.lua:333: if (percent(50))
            if (rn2(100) < 50) { // nhlib.lua:44: percent(50) = rn2(100) < 50
                splev_lspo_door_random_wall_rng(innerRoom);
            }
        }
        else
            ok = false; /* C sp_lev.c:4104-4105 themeroom_failed */
    }
    return ok;
}
// C ref: themerms.lua "Nesting rooms" (themerms.lua:344-373).
// Outer room (w=9+rn2(4), h=9+rn2(4), filled=1) already built as aroom.
//
// Contents outer (rm = outerRoom passed by lspo_room):
//   des.room({ type="ordinary", w=wid, h=hei, filled=1,
//      contents = function()
//         if (percent(90)) then                               -- rn2(100)
//            des.room({ type="ordinary", filled=1,
//               contents = function()
//                  des.door({ state="random", wall="all" });  -- door A
//                  if (percent(15)) then                      -- rn2(100)
//                     des.door({ state="random", wall="all" }); -- door B
//                  end
//               end });
//         end
//         des.door({ state="random", wall="all" });           -- door C
//         if (percent(15)) then                               -- rn2(100)
//            des.door({ state="random", wall="all" });        -- door D
//         end
//      end });
// C ref: sp_lev.c lspo_room:4088-4107, themerms.lua:344-373
function themerooms_contents_nesting_rooms(outerRoom) {
    // outerRoom dimensions (outer room's inner play area)
    const outerWidth = outerRoom.hx - outerRoom.lx + 1; // rm.width
    const outerHeight = outerRoom.hy - outerRoom.ly + 1; // rm.height
    const widMin = Math.floor(outerWidth / 2);
    const widRange = outerWidth - 2 + 1 - widMin; // = outerWidth - 1 - widMin
    const wid = widMin + rn2(widRange);
    const heiMin = Math.floor(outerHeight / 2);
    const heiRange = outerHeight - 2 + 1 - heiMin;
    const hei = heiMin + rn2(heiRange);
    // Middle room: des.room({w=wid, h=hei, filled=1})
    const midSpec = {
        chance: 100,
        rtype: OROOM,
        x: -1, y: -1, w: wid, h: hei,
        rlit: -1,
        needfill: FILL_NORMAL, // filled=1
        joined: true,
        xalign: -1, yalign: -1,
    };
    // create_subroom with x=-1,y=-1 (w,h fixed): rnd(outerWidth-wid) + rnd(outerHeight-hei) + litstate_rnd
    const midRoom = build_room(midSpec, outerRoom);
    let ok = !!midRoom; /* C sp_lev.c:4104-4105: failed subroom => themeroom_failed */
    if (midRoom) {
        // Middle room contents:
        // themerms.lua:354: if (percent(90))
        if (rn2(100) < 90) {
            const innerSpec = {
                chance: 100,
                rtype: OROOM,
                x: -1, y: -1, w: -1, h: -1,
                rlit: -1,
                needfill: FILL_NORMAL,
                joined: true,
                xalign: -1, yalign: -1,
            };
            const innerRoom = build_room(innerSpec, midRoom);
            if (!innerRoom)
                ok = false;
            if (innerRoom) {
                // themerms.lua:357: des.door (door A)
                splev_lspo_door_random_wall_rng(innerRoom);
                // themerms.lua:358: if (percent(15)) door B
                if (rn2(100) < 15) {
                    splev_lspo_door_random_wall_rng(innerRoom);
                }
            }
        }
        // themerms.lua:364: des.door (door C) — always
        splev_lspo_door_random_wall_rng(midRoom);
        // themerms.lua:365: if (percent(15)) door D
        if (rn2(100) < 15) {
            splev_lspo_door_random_wall_rng(midRoom);
        }
    }
    return ok;
}
/* C you.h:297 Race_if(X) = (gu.urace.mnum == (X)); js/roles.js:613 sets
 * game.urace.mnum from RACE_PM_MNUM, i.e. a real PM_ index.  Verified by NAME
 * against js/makemon_pmnames.json (dwarf 44, gnome 165) rather than trusted
 * from js/pm.generated.js, which is still spelled with 3.7 monster names. */
const PM_DWARF_MZ = 44;
const PM_GNOME_MZ = 165;
// C ref: themerms.lua "Mausoleum" (themerms.lua:420-443).
// Outer room (w=5+rn2(3)*2, h=5+rn2(3)*2, type="themed") already built as aroom.
//
// Contents outer (rm = outerRoom):
//   des.room({ type="themed", x=(rm.width-1)/2, y=(rm.height-1)/2, w=1, h=1,
//              joined=false,
//              contents = function()
//                 if (percent(50)) then                        -- rn2(100)
//                    local mons = { "M","V","L","Z" };
//                    shuffle(mons);                            -- rn2(4)+rn2(3)+rn2(2)
//                    des.monster({ class=mons[1], x=0,y=0, waiting=1 }); -- mkclassAligned
//                 else
//                    des.object({ id="corpse", montype="@", coord={0,0} }); -- no RNG
//                 end
//                 if (percent(20)) then                        -- rn2(100)
//                    des.door({ state="secret", wall="all" }); -- create_door (no rnddoor, mask=D_SECRET)
//                 end
//              end });
// C ref: sp_lev.c lspo_room:4088-4107, themerms.lua:420-443
async function themerooms_contents_mausoleum(outerRoom) {
    const outerWidth = outerRoom.hx - outerRoom.lx + 1;
    const outerHeight = outerRoom.hy - outerRoom.ly + 1;
    // themerms.lua:424-439: inner 1x1 "crypt" at center
    const cryptX = Math.trunc((outerWidth - 1) / 2);
    const cryptY = Math.trunc((outerHeight - 1) / 2);
    const cryptSpec = {
        chance: 100,
        rtype: THEMEROOM, // type="themed"
        x: cryptX, y: cryptY, w: 1, h: 1,
        rlit: -1,
        needfill: FILL_NONE, // default for themed rooms: needfill=0
        joined: false, // joined=false
        xalign: -1, yalign: -1,
    };
    // create_subroom with x=cryptX, y=cryptY, w=1, h=1 (all fixed): litstate_rnd only
    const cryptRoom = build_room(cryptSpec, outerRoom);
    if (cryptRoom) {
        // themerms.lua:428: if (percent(50))
        if (rn2(100) < 50) {
            // themerms.lua:429-431: shuffle(mons) → rn2(4)+rn2(3)+rn2(2)
            const monsSyms = [S_MUMMY, S_VAMPIRE, S_LICH, S_ZOMBIE]; // "M","V","L","Z"
            // nhlib.lua shuffle: for i=#list,2,-1 do j=math.random(i); swap(list[i],list[j]) end
            // math.random(4) = 1+rn2(4); math.random(3) = 1+rn2(3); math.random(2) = 1+rn2(2)
            for (let i = monsSyms.length; i >= 2; i--) {
                const j = rn2(i); // nhlib.lua: math.random(i) = 1+rn2(i); 0-indexed: j in [0,i-1]
                const tmp = monsSyms[i - 1];
                monsSyms[i - 1] = monsSyms[j];
                monsSyms[j] = tmp;
            }
            // themerms.lua:431: des.monster({ class=mons[1], x=0,y=0, waiting=1 })
            //
            // This is lspo_monster's TABLE form (sp_lev.c:3273-3378).  Every
            // get_table_*_opt here defaults without drawing, get_table_montype
            // returns NON_PM (no "id"/"montype" key) so no gender roll fires,
            // and tmpmons.sp_amask stays AM_SPLEV_RANDOM.  Then create_monster.
            //
            // create_monster's FIRST act is
            //     amask = sp_amask_to_amask(m->sp_amask)   (sp_lev.c:1945)
            // and for AM_SPLEV_RANDOM that is induced_align(80) — one rn2(3) in
            // the Dungeons of Doom, since it is neither a special level nor an
            // aligned branch, so neither rn2(100) arm fires (dungeon.c:1999-2015).
            // This call is BEFORE mkclass, and omitting it was the first RNG
            // (dungeon.c:2012) against our rn2(9) @mkclass_aligned.
            // C ref: sp_lev.c sp_amask_to_amask():1907-1920, create_monster():1945
            const G_NOGEN = 0x0200;
            const A_NONE = -128;
            induced_align(80);
            // sp_lev.c:1956 — class is set and id is NON_PM, so
            //     pm = mkclass(class, G_NOGEN) = mkclass_aligned(class, G_NOGEN, A_NONE)
            const cryptPm = mkclassAligned(monsSyms[0], G_NOGEN, A_NONE);
            // sp_lev.c:1959-1961 — the Mines dwarf/gnome own-race suppression.
            // Guarded on In_mines first: themerooms are a room-and-corridor
            // (mklev makerooms) feature and the Mines are makemaz/mkmap levels,
            // than asserted away.  your_race(ptr) is monflag.h's
            // (ptr->mflags2 & gu.urace.selfmask) != 0.
            let cryptPmEff = cryptPm;
            if (In_mines(game.u?.uz) && cryptPmEff != null
                && (((permonstTemplate(cryptPmEff)?.mflags2) | 0)
                    & ((game.urace?.selfmask) | 0)) !== 0
                && (((game.urace?.mnum) | 0) === PM_DWARF_MZ
                    || ((game.urace?.mnum) | 0) === PM_GNOME_MZ)
                && rn2(3))
                cryptPmEff = null;
            // sp_lev.c:1963-1975 — get_location_coord with an EXPLICIT coord
            // (x=0,y=0) inside croom: get_location's `*x >= 0` arm just adds
            // croom->lx/ly and draws nothing (sp_lev.c:1222-1225).  The 1x1
            // crypt is empty, so the MON_AT/enexto retry does not fire either.
            const cryptMx = cryptRoom.lx | 0, cryptMy = cryptRoom.ly | 0;
            // sp_lev.c:1982-1988 — sp_amask IS AM_SPLEV_RANDOM and the id is
            // NON_PM (not a PM_ARCHEOLOGIST..PM_WIZARD player-monster), so this
            // is plain makemon(pm, x, y, mm_flags=NO_MM_FLAGS).  C calls it even
            // when pm is NULL (the class was genocided) — that is the
            // "settle for a random monster" comment at sp_lev.c:1957.
            const cryptMon = await makemon(cryptPmEff, cryptMx, cryptMy, 0);
            if (cryptMon) {
                // sp_lev.c:2124 — mtmp->female = m->female.  The table form left
                // tmpmons.female at BOOL_RANDOM and lspo_monster:3348-3349 then
                // forced it to 0, so this OVERWRITES makemon's random gender.
                cryptMon.female = 0;
                // sp_lev.c:2160-2167 — waiting=1.
                cryptMon.mstrategy = (cryptMon.mstrategy | 0) | STRAT_WAITFORU;
                // ...and a vampire that makemon already shifted into bat/fog/wolf
                // form shifts BACK, because this theme room did not ask for an
                // appear_as.  vampshifted(mon) is monst.h:220
                // is_vampshifter(mon) && !is_vampire(mon->data).
                if (is_vampshifter_nc(cryptMon) && !is_vampire_nc(cryptMon.data))
                    await newcham(cryptMon, cryptMon.cham | 0, 0 /* NO_NC_FLAGS */);
            }
        }
        else {
            // themerms.lua:433: des.object({ id="corpse", montype="@", coord={0,0} })
            // montype="@" is a 1-char class symbol (S_HUMAN).  lspo_object parses
            // it via pm = mkclass(def_char_to_monclass('@'), G_NOGEN|G_IGNORE) and
            // sets tmpobj.corpsenm = monsndx(pm) (sp_lev.c:3691-3708).  Then
            // create_object (sp_lev.c:2212-2263) does mksobj_at(CORPSE) FIRST (its
            // own rndmonnum + set_corpsenm/start_corpse_timeout), and AFTER that
            // applies the montype override: o->corpsenm != NON_PM → set_corpsenm(
            // otmp, o->corpsenm) (sp_lev.c:2259-2263), which fires a SECOND
            // start_corpse_timeout for the resolved montype PM.
            // C ref: mkclass(class, spc) = mkclass_aligned(class, spc, A_NONE)
            //   (makemon.c:1872).
            const G_NOGEN = 0x0200;
            const G_IGNORE = 0x8000;
            const A_NONE = -128;
            // sp_lev.c:3691-3708 — montype resolution at Lua-arg parse time.
            const montypePm = mkclassAligned(S_HUMAN, G_NOGEN | G_IGNORE, A_NONE);
            // create_object then makes the CORPSE object itself — the previous JS
            // model stopped after the montype mkclass resolution and skipped the
            // object (C placed a corpse JS did not — the creation gap, first
            // mksobj(CORPSE, init=TRUE) fires: next_ident (corpse o_id),
            // mksobj_init CORPSE → corpsenm = rndmonnum() (rndmonst_adj loop),
            // gender, then set_corpsenm → start_corpse_timeout (here the random
            // corpsenm is often a no-rnz PM like LICHEN, so this set may consume
            // no rnz).
            // C ref: sp_lev.c create_object → mksobj_at(CORPSE,...) → mkobj.c mksobj:1186,
            //   mksobj_init CORPSE corpsenm:1208 (rndmonnum→rndmonst_adj),
            //   set_corpsenm:1227 → start_corpse_timeout:1414.
            // create_object is mksobj_AT (sp_lev.c:2212): the corpse is PLACED
            // in the crypt.  coord={0,0} is get_location's explicit-coord arm,
            // croom->lx/ly plus 0 (sp_lev.c:1222-1225), no draw; artif=!named.
            const corpse = await mksobj_at(CORPSE, cryptRoom.lx | 0, cryptRoom.ly | 0,
                                           true, true);
            // C sp_lev.c:2259-2263 — apply the montype-resolved corpsenm override.
            // monsndx(pm) is just the PM index mkclass already returned.  This is
            // the SECOND set_corpsenm; for the resolved HUMAN PM (non-LIZARD/LICHEN)
            if (montypePm != null && montypePm !== NON_PM) {
                set_corpsenm(corpse, montypePm);
            }
        }
        // themerms.lua:435: if (percent(20))
        if (rn2(100) < 20) {
            // themerms.lua:436: des.door({ state="secret", wall="all" })
            splev_lspo_door_secret_wall_rng(cryptRoom);
        }
    }
    return !!cryptRoom; /* C sp_lev.c:4104-4105: failed subroom => themeroom_failed */
}
/**
 * The des.map() contents callback for the map-first themerooms, up to (but not
 * including) their trailing filler_region() call — which the caller consumes
 * separately via nhlib_filler_region_rng_consume().
 *
 * Only 'Blocked center' has a body ahead of filler_region; every other
 * map-first themeroom's contents is `function(m) filler_region(a,b); end`.
 *
 * C ref: themerms.lua:535-543
 *   contents = function(m)
 *      if (percent(30)) then
 *         local terr = { "-", "P" };
 *         shuffle(terr);
 *         des.replace_terrain({ region = {1,1, 9,9},
 *                               fromterrain = "L", toterrain = terr[1] });
 *      end
 *      filler_region(1,1);
 *   end
 *
 * @param {string} name themeroom name (THEMEROOM_META entry)
 * @param {{x: number, y: number}} mapPos map-fragment origin = gx.xstart/gy.ystart
 */
function themeroom_map_contents_pre_filler(name, mapPos) {
    if (name !== 'Blocked center')
        return;
    // nhlib.lua:43-45 percent(30) → math.random(0,99) → nh.random(0,100) → rn2(100).
    if (rn2(100) >= 30)
        return;
    // nhlib.lua:17-22 shuffle over a 2-element list: one iteration, i = 2,
    // j = math.random(2) = 1 + rn2(2) (nhlib.lua:8), then swap list[2],list[j].
    const terr = ['-', 'P'];
    for (let i = terr.length; i >= 2; i--) {
        const j = 1 + rn2(i);
        const tmp = terr[i - 1];
        terr[i - 1] = terr[j - 1];
        terr[j - 1] = tmp;
    }
    const totyp = splev_chr2typ_mklev(terr[0]);
    if (totyp === INVALID_TYPE || totyp >= MAX_TYPE)
        return;
    const fromtyp = LAVAPOOL; /* fromterrain = "L" */
    // C sp_lev.c:5093-5119 lspo_replace_terrain, region form. gc.coder->croom is
    // NULL inside a themeroom des.map (no des.room was entered), so get_location
    // adds gx.xstart/gy.ystart — i.e. the map-fragment origin.
    const rx1 = mapPos.x + 1, ry1 = mapPos.y + 1;
    const rx2 = mapPos.x + 9, ry2 = mapPos.y + 9;
    // selection_getbounds over the points selection_setpoint actually set
    // (C clamps the same way when building the selection).
    const lx = Math.max(rx1, 0), hx = Math.min(rx2, COLNO - 1);
    const ly = Math.max(ry1, 0), hy = Math.min(ry2, ROWNO - 1);
    // C sp_lev.c:5122-5135 — x outer, y inner; rn2(100) is drawn ONLY where the
    // terrain-match predicate is true (`&&` short-circuit), chance defaults 100.
    for (let x = Math.max(1, lx); x <= hx; x++)
        for (let y = ly; y <= hy; y++) {
            const loc = game.level.at(x, y);
            if (loc && loc.typ === fromtyp && rn2(100) < 100)
                set_levltyp_lit(x, y, totyp, SET_LIT_NOCHANGE);
        }
}
/**
 * nhlib.lua:17-22 shuffle(list), in place, 0-indexed.
 *
 *   for i = #list, 2, -1 do local j = math.random(i); list[i],list[j] = list[j],list[i] end
 *
 * math.random(i) is nhlib.lua:6-8's one-arg shim, `1 + nh.rn2(i)`, so the draw
 * is rn2(i) with i counting DOWN from #list to 2 — the decreasing-modulus
 * signature that identifies a shuffle in a C trace.
 */
function nhlib_shuffle_inplace(list) {
    for (let i = list.length; i >= 2; i--) {
        const j = rn2(i); /* math.random(i) = 1 + rn2(i); 0-indexed: j in [0,i-1] */
        const tmp = list[i - 1];
        list[i - 1] = list[j];
        list[j] = tmp;
    }
    return list;
}
/** Resolved from the extracted objects[] name table (js/oc_name_data.js), not
 * hand-typed: objects.h is an X-macro file with no `#define WAN_TELEPORTATION`
 * text to grep.  SCR_TELEPORTATION (333) and WAN_DIGGING (428) are already
 * declared at the top of this file. */
const WAN_TELEPORTATION = 424;
async function themeroom_water_surrounded_vault_contents_rng(mapPos) {
    /* themerms.lua:776-777 — the two tables, in source order. */
    /* The three names verbatim from themerms.lua:776 — the list Lua shuffles is
     * a list of NAME STRINGS, and des.monster resolves the winner through
     * find_montype (which also draws the gender fallback).  Resolving them to
     * mons[] indices here, as this stand-in used to, is what dropped that draw. */
    const nastyUndead = ['giant zombie', 'ettin zombie', 'vampire lord'];
    const chestSpots = [[2, 2], [3, 2], [2, 3], [3, 3]];
    /* themerms.lua:779 shuffle(chest_spots) */
    nhlib_shuffle_inplace(chestSpots);
    /* themerms.lua:789-793 — local itm = obj.new(escape_items[math.random(#escape_items)]).
     * math.random(n) = 1 + rn2(n) (nhlib.lua:6-8), so the draw is rn2(4). */
    const escapeItems = ["scroll of teleportation", "ring of teleportation",
        "wand of teleportation", "wand of digging"];
    /* obj.new(<string>) is nhlobj.c:350's readobjnam path: the real body draws
     * rnd_otyp_by_namedesc (objnam.c:3522), mksobj, and the non-wizard
     * quantity roll rnd(6) for an oc_merge item (objnam.c:5077). */
    const itm = await readobjnam_mk(escapeItems[rn2(escapeItems.length)], null);
    const itmOtyp = itm.otyp | 0;
    /* themerms.lua:794-805 — if the escape item is glass, the chest holding it is
     * forced unlocked so the hero need not kick it open.  itm:class()["material"]
     * is objects[otyp].oc_material AFTER o_init's shuffle (which swaps materials
     * in lockstep with descriptions for the whole-class ranges), so read the
     * runtime map, not the canonical table.
     *
     * RNG-NEUTRAL: create_object applies o->locked AFTER mksobj_at returns
     * (sp_lev.c:2285), so mksobj_init's rn2(5) and the mkbox_cnts rn2(n+1) it
     * feeds are already spent whichever branch is taken. */
    const itmMaterial = (game._objMaterials && game._objMaterials[itmOtyp] != null)
        ? (game._objMaterials[itmOtyp] | 0)
        : (MKOBJ_OC_MATERIAL[itmOtyp] | 0);
    /* create_object: mksobj_at(o->id, x, y, TRUE, !named) — named is false here,
     * so artif = TRUE (inert for a container; mksobj only consults artif for the
     * mkobj artifact roll). */
    const box = await mksobj_at(CHEST, mapPos.x + chestSpots[0][0],
        mapPos.y + chestSpots[0][1], true, true);
    if (itmMaterial === GLASS && box)
        box.olocked = false;
    /* themerms.lua:805 box:addcontent(itm) — RNG-free. */
    if (box)
        await add_to_container(box, itm);
    /* themerms.lua:807-809 — for i = 2, #chest_spots do des.object(...) end */
    for (let i = 1; i < chestSpots.length; i++)
        await mksobj_at(CHEST, mapPos.x + chestSpots[i][0],
            mapPos.y + chestSpots[i][1], true, true);
    nhlib_shuffle_inplace(nastyUndead);
    const { id: nastyId, mgend: nastyGend } = find_montype(nastyUndead[0]);
    induced_align(80);
    /* sp_amask == AM_SPLEV_RANDOM and the id is not a PM_ARCHEOLOGIST..PM_WIZARD
     * player-monster, so create_monster:1985 takes plain makemon(pm, x, y,
     * mm_flags=0).  The coord is explicit, so get_location_coord draws nothing. */
    const mtmp = await makemon((game.mvitals?.[nastyId]?.mvflags & G_GONE) ? null : nastyId, mapPos.x + 2, mapPos.y + 2, 0);
    /* C sp_lev.c:2124 `mtmp->female = m->female` — makemon has already rolled a
     * random gender (makemon.c:1279); create_monster overwrites it with the one
     * find_montype drew.  The spec sets no asleep/waiting, so nothing else. */
    if (mtmp)
        mtmp.female = (nastyGend === 1 /* FEMALE */) ? 1 : 0;
    /* themerms.lua:813 des.exclusion({type="teleport", region={2,2,3,3}}) —
     * lspo_exclusion (sp_lev.c:5505-5539): RNG-free, but is_exclusion_zone
     * (mkmaze.c:317) makes put_lregion_here reject these squares for a
     * level-teleport arrival, costing C one more rn2(79)/rn2(21) pair per hit.
     * Both corners go through get_location_coord, i.e. map-relative. */
    if (!game.exclusion_zones)
        game.exclusion_zones = [];
    game.exclusion_zones.unshift({ zonetype: LR_TELE,
                                   lx: mapPos.x + 2, ly: mapPos.y + 2,
                                   hx: mapPos.x + 3, hy: mapPos.y + 3 });
}
// C ref: themerms.lua themerooms_generate()
// "default" usually wins (frequency 1000 vs others ~1-10).
async function themerooms_generate(difficulty) {
    const prevLua = game.in_mk_themerooms;
    game.in_mk_themerooms = true;
    let pick = null;
    if (_debug_rm_idx !== null) {
        let actualrm = _lookup_themeroom_by_name('default', false);
        if (nhlib_percent(50)) {
            if (is_themeroom_eligible(THEMEROOM_META[_debug_rm_idx], difficulty)) {
                actualrm = _debug_rm_idx;
            } else {
                await pline(`Warning: themeroom '${THEMEROOM_META[_debug_rm_idx].name}' is ineligible`);
            }
        }
        pick = THEMEROOM_META[actualrm];
    } else if (_debug_fill_idx !== null) {
        const actualrm = _lookup_themeroom_by_name(nhlib_percent(50) ? 'Default room with themed fill' : 'default', false);
        pick = THEMEROOM_META[actualrm];
    } else {
        let total_frequency = 0;
        for (const meta of THEMEROOM_META) {
            if (!is_themeroom_eligible(meta, difficulty))
                continue;
            const this_frequency = meta.frequency || 1;
            total_frequency += this_frequency;
            if (this_frequency > 0 && rn2(total_frequency) < this_frequency) {
                pick = meta;
            }
        }
        if (!pick) {
            await lifecycle_impossible('no eligible themed rooms?');
            game.in_mk_themerooms = prevLua;
            return false;
        }
    }
    // Map-first themed rooms (des.map only): C sp_lev.c lspo_map redo_maploc + overlay check.
    const mapLua = THEMEROOM_MAP_LUA[ /** @type {keyof typeof THEMEROOM_MAP_LUA} */(pick.name)];
    if (mapLua) {
        const mf = themeroom_mapfrag_from_lua(mapLua);
        // C: lspo_map sets gt.themeroom_failed on overlay / bounds failure; core checks it after Lua returns.
        const mapPos = themeroom_lspo_map_redo_maploc_rng(mf);
        if (!mapPos) {
            game.in_mk_themerooms = prevLua;
            return false;
        }
        // C: lspo_map "Load the map" section (sp_lev.c:6286-6306) — writes map tiles to levl.
        // Without this, subsequent check_room calls see STONE instead of map tiles and diverge
        // on rn2(3) calls / in_mk_themerooms early-return path (sp_lev.c:1452-1459).
        // lit=FALSE (0) — des.map() has no 'lit' param, so get_table_boolean_opt gives FALSE.
        for (let tyy = 0; tyy < mf.hei; tyy++) {
            for (let txx = 0; txx < mf.wid; txx++) {
                const mptyp = mapfrag_get(mf, txx, tyy);
                if (mptyp === INVALID_TYPE || mptyp >= MAX_TYPE)
                    continue;
                const loc = game.level.at(mapPos.x + txx, mapPos.y + tyy);
                if (loc) {
                    loc.typ = mptyp;
                    /* lit=FALSE from des.map({}) with no 'lit' param, but sel_set_ter ->
                     * set_levltyp_lit keeps lava lit (mkmaze.c:99-100, 136-137); a later
                     * L->P replace_terrain (NOCHANGE) leaves those pools lit. */
                    loc.lit = (mptyp === LAVAPOOL || mptyp === LAVAWALL) ? 1 : 0;
                    loc.flags = 0;
                    loc.horizontal = (mptyp === HWALL || mptyp === IRONBARS);
                    loc.roomno = 0;
                    loc.edge = false;
                }
            }
        }
        // C: the des.map() contents callback runs BEFORE filler_region for the
        // themerooms whose Lua contents body has statements ahead of it.
        themeroom_map_contents_pre_filler(pick.name, mapPos);
        // C themerms.lua:764-815 — 'Water-surrounded vault' is the ONE map-first
        // themeroom whose contents() is not `filler_region(a,b)`: it opens with
        // des.region({region={3,3,3,3}, type="themed", irregular=true, filled=0,
        // joined=false}) and then stocks four chests and a nasty undead.  Firing
        // filler_region's percent(30) for it was a draw C never makes — on
        // 19646, one leaf ahead of C's rnd(4) @litstate_rnd(mkmap.c:446), and
        // every leaf after it was off by one.
        const isWaterVault = pick.name === 'Water-surrounded vault';
        // C: themerms.lua filler_region() -> percent(30) then des.region(..., filled=1, ...)
        const fillerIsThemed = isWaterVault ? false : nhlib_filler_region_rng_consume();
        // C: lspo_region calls litstate_rnd(rlit) before flood_fill_rm + add_room.
        // filler_region uses des.region({..., rlit=-1 (default)}) → litstate_rnd(-1).
        const regionLit = litstate_rnd(-1);
        // C: lspo_region with irregular=true calls smeq[nroom]=nroom + flood_fill_rm + add_room()
        // → svn.nroom++. This happens whenever in_mk_themerooms=true and irregular=true,
        // regardless of percent(30) outcome. filler_region always uses irregular=true.
        // rtype: ordinary when fillerIsThemed=false, themed when true (matches filler_region logic).
        // The vault's des.region passes type="themed" unconditionally.
        const mapRoomRtype = (isWaterVault || fillerIsThemed) ? THEMEROOM : OROOM;
        // C flood_fill_rm sets roomno on all connected IS_ROOM cells BEFORE add_room.
        // rmno = svn.nroom + ROOMOFFSET (same as the room's eventual roomnoidx + ROOMOFFSET).
        const irregRmno = game.level.nroom + ROOMOFFSET;
        // C flood_fill_rm finds the bounding box of ROOM cells reachable from the filler_region
        // origin point. This matches C's add_room(gm.min_rx, gm.min_ry, gm.max_rx, gm.max_ry).
        const fillerOrigin = THEMEROOM_MAP_FILLER_ORIGIN[pick.name];
        let roomLx = mapPos.x, roomLy = mapPos.y;
        let roomHx = mapPos.x + mf.wid - 1, roomHy = mapPos.y + mf.hei - 1;
        if (fillerOrigin) {
            const bbox = flood_fill_room_bbox(mapPos.x + fillerOrigin.ox, mapPos.y + fillerOrigin.oy, irregRmno, regionLit);
            if (bbox) {
                roomLx = bbox.minX;
                roomLy = bbox.minY;
                roomHx = bbox.maxX;
                roomHy = bbox.maxY;
            }
        }
        else {
            // No specific origin: flood-fill from interior (mapPos+1,mapPos+1) to set roomno.
            // C uses dx1,dy1 which is the des.region start point — use center of map fragment.
            const startX = mapPos.x + Math.trunc(mf.wid / 2);
            const startY = mapPos.y + Math.trunc(mf.hei / 2);
            flood_fill_room_bbox(startX, startY, irregRmno, regionLit);
        }
        game.smeq[game.level.nroom] = game.level.nroom;
        add_room(roomLx, roomLy, roomHx, roomHy, false, mapRoomRtype, true);
        // C: lspo_region sets troom->irregular=TRUE, needjoining=joined (default TRUE), rlit, needfill.
        const addedMapRoom = game.level.rooms[game.level.nroom - 1];
        if (addedMapRoom) {
            addedMapRoom.irregular = true;
            // filler_region's des.region takes lspo_region's joined default (TRUE);
            // the vault's passes joined=false — the moat must not be corridored into.
            addedMapRoom.needjoining = !isWaterVault;
            addedMapRoom.rlit = regionLit ? 1 : 0;
            // filled=1 in filler_region, filled=0 in the vault's des.region.
            addedMapRoom.needfill = isWaterVault ? FILL_NONE : FILL_NORMAL;
        }
        if (isWaterVault) {
            // C themerms.lua:779-813 — the rest of the vault's des.map contents,
            // which run after its des.region returns (see the function header).
            await themeroom_water_surrounded_vault_contents_rng(mapPos);
        }
        // C: lspo_region contents callback fires themeroom_fill when percent(30) was true
        else if (fillerIsThemed) {
            await themeroom_fill_rng(addedMapRoom || { rlit: regionLit ? 1 : 0 }, difficulty);
        }
        game.in_mk_themerooms = prevLua;
        return true;
    }
    // C ref: themerms.lua — des.room path: build_room() then create_room, etc.
    // C ref: sp_lev.c build_room() — rn2(100) < chance before create_room.
    // Three room types call themeroom_fill as their contents callback (sp_lev.c lspo_room:4099-4103).
    const isFillRoom = pick.name === 'Default room with themed fill'
        || pick.name === 'Unlit room with themed fill'
        || pick.name === 'Room with both normal contents and themed fill';
    // C ref: themerms.lua — rooms with des.room({type="themed",...}) get rtype=THEMEROOM (not OROOM).
    // generate_stairs_room_good excludes THEMEROOM rooms at phase>=2.
    // These rooms use type="themed": fill rooms, Pillars, Mausoleum, Twin businesses.
    const isThemeRtype = isFillRoom
        || pick.name === 'Pillars'
        || pick.name === 'Mausoleum'
        || pick.name === 'Twin businesses';
    // C ref: themerms.lua — compute room dimensions matching Lua nh.rn2 calls
    // before des.room(). Rooms with fixed dims: Fake Delphi (w=11,h=9),
    // Pillars (w=10,h=10), Twin businesses (w=9,h=5).
    // Rooms with random dims call nh.rn2 BEFORE build_room in Lua, so we
    // must emit those RNG calls here to stay in sync with C's RNG sequence.
    let roomW = -1, roomH = -1;
    if (pick.name === 'Fake Delphi') {
        // C themerms.lua:294: des.room({ type="ordinary", w=11, h=9, ... })
        roomW = 11;
        roomH = 9;
    }
    else if (pick.name === 'Huge room with another room inside') {
        // C themerms.lua:325: w = nh.rn2(10)+11, h = nh.rn2(5)+8
        roomW = rn2(10) + 11;
        roomH = rn2(5) + 8;
    }
    else if (pick.name === 'Nesting rooms') {
        // C themerms.lua:346: w = 9 + nh.rn2(4), h = 9 + nh.rn2(4)
        roomW = 9 + rn2(4);
        roomH = 9 + rn2(4);
    }
    else if (pick.name === 'Pillars') {
        // C themerms.lua:402: des.room({ type="themed", w=10, h=10, ... })
        roomW = 10;
        roomH = 10;
    }
    else if (pick.name === 'Mausoleum') {
        // C themerms.lua:422: w = 5 + nh.rn2(3)*2, h = 5 + nh.rn2(3)*2
        roomW = 5 + rn2(3) * 2;
        roomH = 5 + rn2(3) * 2;
    }
    else if (pick.name === 'Random dungeon feature') {
        // C themerms.lua:448-449: local wid = 3 + nh.rn2(3)*2; local hei = 3 + nh.rn2(3)*2
        roomW = 3 + rn2(3) * 2;
        roomH = 3 + rn2(3) * 2;
    }
    else if (pick.name === 'Twin businesses') {
        // C themerms.lua:824: des.room({ type="themed", w=9, h=5, ... })
        roomW = 9;
        roomH = 5;
    }
    const roomSpec = {
        chance: 100, // C default: get_table_int_opt(L, "chance", 100)
        rtype: isThemeRtype ? THEMEROOM : OROOM,
        x: -1, y: -1, w: roomW, h: roomH,
        // C lspo_room: lit=0 for "Unlit room with themed fill", else -1 (random)
        rlit: pick.name === 'Unlit room with themed fill' ? 0 : -1,
        // C sp_lev.c:4083-4084: themed-rtype rooms default needfill=0 (FILL_NONE) unless filled=1.
        // isThemeRtype rooms (isFillRoom + Pillars/Mausoleum/Twin) all use type="themed" in Lua.
        // Only 'Room with both normal contents and themed fill' has filled=1 among themed rooms.
        // Non-isThemeRtype rooms (default, Fake Delphi, etc.) use type="ordinary" with filled=1.
        needfill: isThemeRtype && pick.name !== 'Room with both normal contents and themed fill'
            ? FILL_NONE : FILL_NORMAL,
        joined: true,
        xalign: -1, yalign: -1
    };
    const aroom = build_room(roomSpec, null); // mkr=null → top-level room
    /* C sp_lev.c:4104-4113: a failed (sub)room sets gt.themeroom_failed, which
     * makerooms() (mklev.c:418-421) reads to decide whether to break out. */
    let contentsOk = true;
    // C ref: sp_lev.c lspo_room:4099-4103 — contents callback fires immediately after build_room.
    if (aroom && isFillRoom) {
        await themeroom_fill_rng(aroom, difficulty);
    }
    // C ref: themerms.lua — 5 themed room types with contents callbacks.
    // Each calls build_room (for subrooms) and splev_lspo_door_*_rng to emit the
    // exact RNG consumed by C's Lua contents callbacks. Only fires when build_room
    if (aroom && pick.name === 'Fake Delphi') {
        // C ref: themerms.lua:292-305 — outer des.room contents: inner des.room + des.door
        contentsOk = themerooms_contents_fake_delphi(aroom);
    }
    else if (aroom && pick.name === 'Room in a room') {
        // C ref: themerms.lua:308-320 — outer des.room contents: inner des.room + des.door
        contentsOk = themerooms_contents_room_in_a_room(aroom);
    }
    else if (aroom && pick.name === 'Huge room with another room inside') {
        // C ref: themerms.lua:323-341 — percent(90) + inner des.room + 2x des.door + percent(50)
        contentsOk = themerooms_contents_huge_room_inner(aroom);
    }
    else if (aroom && pick.name === 'Nesting rooms') {
        // C ref: themerms.lua:344-373 — math.random dims + nested rooms + doors + percent guards
        contentsOk = themerooms_contents_nesting_rooms(aroom);
    }
    else if (aroom && pick.name === 'Mausoleum') {
        // C ref: themerms.lua:420-443 — 1x1 crypt + percent(50) + shuffle + des.monster + percent(20)
        contentsOk = await themerooms_contents_mausoleum(aroom);
    }
    else if (aroom && pick.name === 'Twin businesses') {
        // C ref: themerms.lua:818-866
        contentsOk = themerooms_contents_twin_businesses(aroom);
    }
    else if (aroom && pick.name === 'Pillars') {
        // C ref: themerms.lua:398-416 — shuffle(terr) (6 draws) + 16 des.terrain
        themerooms_contents_pillars(aroom);
    }
    else if (aroom && pick.name === 'Random dungeon feature') {
        // C ref: themerms.lua:450-457 — shuffle(feature) (4 draws) + 1 des.terrain
        themerooms_contents_random_dungeon_feature(aroom);
    }
    /* C sp_lev.c:4100 — lspo_room calls add_doors_to_room_mklev(tmpcr) after the
     * contents callback and spo_endroom, for the top-level themed room too.
     * That links a subroom's door (already added to the subroom by
     * splev_create_door_rng) to the PARENT as well, so the parent's doorct is
     * 2 where this port left it 1 and makeniche's `doorct == 1 && rn2(5)`
     * (mklev.c:741) drew a spurious rn2(5). */
    if (aroom)
        add_doors_to_room_mklev(aroom);
    game.in_mk_themerooms = prevLua;
    return !!aroom && contentsOk;
}
// C ref: sp_lev.c:5544-5555 add_doors_to_room_mklev()
function add_doors_to_room_mklev(croom) {
    const map = game.level;
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = isok(x, y) ? map.at(x, y) : null;
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                maybe_add_door(x, y, croom);
        }
    for (let i = 0; i < (croom.nsubrooms | 0); i++)
        add_doors_to_room_mklev(croom.sbrooms[i]);
}
function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}
// C ref: mklev.c add_subroom() — register a subroom under a parent room
export function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
    if ((game.level._nsubroom | 0) >= MAXNROFROOMS)
        throw new Error('level has too many subrooms');
    if ((proom.nsubrooms | 0) >= MAX_SUBROOMS)
        throw new Error('room has too many subrooms');
    // C: croom = &gs.subrooms[gn.nsubroom] — fill pre-allocated slot
    const croom = (game.level._subrooms && game.level._subrooms[game.level._nsubroom])
        || {};
    croom.lx = lowx;
    croom.ly = lowy;
    croom.hx = hix;
    croom.hy = hiy;
    croom.rtype = rtype;
    croom.rlit = lit ? 1 : 0;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.needjoining = !special;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    croom.roomnoidx = MAXNROFROOMS + 1 + game.level._nsubroom;
    croom.needfill = 0;
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, false);
    game.level._subrooms[game.level._nsubroom] = croom;
    game.level.rooms[croom.roomnoidx] = croom;
    proom.sbrooms[proom.nsubrooms++] = croom;
    game.level._nsubroom++;
    if (game.level._nsubroom <= MAXNROFROOMS) {
        game.level._subrooms[game.level._nsubroom] = { hx: -1 };
        game.level.rooms[MAXNROFROOMS + 1 + game.level._nsubroom] = game.level._subrooms[game.level._nsubroom];
    }
}
// C ref: mklev.c add_room()
export function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
    if ((g.level.nroom | 0) >= MAXNROFROOMS)
        throw new Error('level has too many rooms');
    const croom = {
        lx: lowx, ly: lowy, hx: hix, hy: hiy,
        rtype, rlit: lit ? 1 : 0,
        doorct: 0, fdoor: g.level.doorindex,
        irregular: false, needjoining: !special,
        nsubrooms: 0, sbrooms: [],
        roomnoidx: g.level.nroom,
        needfill: 0,
    };
    do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, true);
    g.level.rooms[g.level.nroom] = croom;
    g.level.nroom++;
    /* C mklev.c:316-317 — croom++; croom->hx = -1; unconditionally:
     * svr.rooms[MAXNROFROOMS] is the top-level half's sentinel slot. */
    g.level.rooms[g.level.nroom] = { hx: -1 };
}
// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, rtype, special, is_room) {
    const map = game.level;
    if (!lowx)
        lowx++;
    if (!lowy)
        lowy++;
    if (hix >= COLNO - 1)
        hix = COLNO - 2;
    if (hiy >= ROWNO - 1)
        hiy = ROWNO - 2;
    if (lit) {
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = Math.max(lowy - 1, 0); y <= hiy + 1; y++)
                if (map.at(x, y))
                    map.at(x, y).lit = true;
        croom.rlit = 1;
    }
    else {
        croom.rlit = 0;
    }
    croom.lx = lowx;
    croom.hx = hix;
    croom.ly = lowy;
    croom.hy = hiy;
    croom.rtype = rtype;
    croom.doorct = 0;
    croom.fdoor = game.level.doorindex;
    croom.irregular = false;
    croom.nsubrooms = 0;
    croom.sbrooms = [];
    if (!special) {
        croom.needjoining = true;
        for (let x = lowx - 1; x <= hix + 1; x++)
            for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
                const loc = map.at(x, y);
                if (loc) {
                    loc.typ = HWALL;
                    loc.horizontal = true;
                }
            }
        for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc) {
                    loc.typ = VWALL;
                    loc.horizontal = false;
                }
            }
        for (let x = lowx; x <= hix; x++)
            for (let y = lowy; y <= hiy; y++) {
                const loc = map.at(x, y);
                if (loc)
                    loc.typ = ROOM;
            }
        if (is_room) {
            const tl = map.at(lowx - 1, lowy - 1);
            const tr = map.at(hix + 1, lowy - 1);
            const bl = map.at(lowx - 1, hiy + 1);
            const br = map.at(hix + 1, hiy + 1);
            if (tl)
                tl.typ = TLCORNER;
            if (tr)
                tr.typ = TRCORNER;
            if (bl)
                bl.typ = BLCORNER;
            if (br)
                br.typ = BRCORNER;
        }
        else {
            wallification(lowx - 1, lowy - 1, hix + 1, hiy + 1);
        }
    }
}
// C ref: mklev.c sort_rooms()
function sort_rooms() {
    const g = game;
    const n = g.level.nroom;
    const oldToNew = new Array(n).fill(0);
    const liveRooms = g.level.rooms.slice(0, n)
        .sort((a, b) => (a?.lx || 0) - (b?.lx || 0));
    /* C mklev.c:210-216 qsorts only svr.rooms[0..nroom); the subroom half
     * (gs.subrooms = &svr.rooms[MAXNROFROOMS + 1], decl.c:1169) is untouched.
     * Themed rooms build their subrooms before sort_rooms runs (mklev.c:1295-1301),
     * so carry that half across the slice or rooms[roomno - ROOMOFFSET] reads
     * undefined for every subroom cell. */
    const oldRooms = g.level.rooms;
    g.level.rooms = liveRooms;
    for (let i = MAXNROFROOMS + 1; i < oldRooms.length; i++)
        if (oldRooms[i])
            g.level.rooms[i] = oldRooms[i];
    if (n < MAXNROFROOMS)
        g.level.rooms[n] = { hx: -1 };
    for (let i = 0; i < n; i++) {
        if (g.level.rooms[i]) {
            oldToNew[g.level.rooms[i].roomnoidx] = i;
            g.level.rooms[i].roomnoidx = i;
        }
    }
    for (let x = 1; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = g.level.at(x, y);
            const rno = loc?.roomno ?? 0;
            if (rno >= ROOMOFFSET && rno < MAXNROFROOMS + 1) {
                loc.roomno = oldToNew[rno - ROOMOFFSET] + ROOMOFFSET;
            }
        }
}
// C ref: mklev.c topologize()
export function topologize(croom) {
    if (!croom || croom.irregular)
        return;
    const roomno = (croom.roomnoidx ?? -1) + ROOMOFFSET;
    const lowx = croom.lx, lowy = croom.ly;
    const hix = croom.hx, hiy = croom.hy;
    if (!game.level || roomno < ROOMOFFSET)
        return;
    if ((game.level.at(lowx, lowy)?.roomno ?? 0) === roomno)
        return;
    for (let x = lowx; x <= hix; x++)
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc)
                loc.roomno = roomno;
        }
    for (let x = lowx - 1; x <= hix + 1; x++)
        for (let y = lowy - 1; y <= hiy + 1; y += (hiy - lowy + 2)) {
            const loc = game.level.at(x, y);
            if (loc) {
                loc.edge = true;
                loc.roomno = loc.roomno ? SHARED : roomno;
            }
        }
    for (let x = lowx - 1; x <= hix + 1; x += (hix - lowx + 2))
        for (let y = lowy; y <= hiy; y++) {
            const loc = game.level.at(x, y);
            if (loc) {
                loc.edge = true;
                loc.roomno = loc.roomno ? SHARED : roomno;
            }
        }
}
// ============================================================
// Corridors
// ============================================================
function good_rm_wall_doorpos(x, y, dir, room) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(room) + ROOMOFFSET;
    if (!isok(x, y) || !room.needjoining)
        return false;
    const loc = map.at(x, y);
    if (!loc)
        return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL || IS_DOOR(loc.typ) || loc.typ === SDOOR))
        return false;
    if (bydoor(x, y))
        return false;
    const tx = x + xdir[dir], ty = y + ydir[dir];
    if (!isok(tx, ty))
        return false;
    const tloc = map.at(tx, ty);
    if (!tloc || IS_OBSTRUCTED(tloc.typ))
        return false;
    if (rmno !== tloc.roomno)
        return false;
    return true;
}
// C ref: mklev.c finddpos_shift()
function finddpos_shift(xp, yp, dir, aroom) {
    const rdir = DIR_180(dir);
    const dx = xdir[rdir];
    const dy = ydir[rdir];
    if (good_rm_wall_doorpos(xp.value, yp.value, rdir, aroom))
        return true;
    /* irregular rooms may have the room wall away from the room rectangular
       area; go into the area until we encounter something */
    if (aroom.irregular) {
        let rx = xp.value, ry = yp.value;
        let fail = false;
        const map = game.level;
        while (!fail && isok(rx, ry)) {
            const loc = map.at(rx, ry);
            if (!loc || (loc.typ !== STONE && loc.typ !== CORR))
                break;
            rx += dx;
            ry += dy;
            if (good_rm_wall_doorpos(rx, ry, rdir, aroom)) {
                xp.value = rx;
                yp.value = ry;
                return true;
            }
            const loc2 = map.at(rx, ry);
            if (!loc2 || (loc2.typ !== STONE && loc2.typ !== CORR))
                fail = true;
            if (rx < aroom.lx || rx > aroom.hx || ry < aroom.ly || ry > aroom.hy)
                fail = true;
        }
    }
    return false;
}
// C ref: mklev.c finddpos()
async function finddpos(cc, dir, aroom) {
    let x1, y1, x2, y2;
    switch (dir) {
        case DIR_N:
            x1 = aroom.lx;
            x2 = aroom.hx;
            y1 = y2 = aroom.ly - 1;
            break;
        case DIR_S:
            x1 = aroom.lx;
            x2 = aroom.hx;
            y1 = y2 = aroom.hy + 1;
            break;
        case DIR_W:
            x1 = x2 = aroom.lx - 1;
            y1 = aroom.ly;
            y2 = aroom.hy;
            break;
        case DIR_E:
            x1 = x2 = aroom.hx + 1;
            y1 = aroom.ly;
            y2 = aroom.hy;
            break;
        default: await lifecycle_impossible("finddpos: illegal dir"); return false;
    }
    let tryct = 0;
    let x, y;
    do {
        x = (x2 - x1) ? rn1(x2 - x1 + 1, x1) : x1;
        y = (y2 - y1) ? rn1(y2 - y1 + 1, y1) : y1;
        const xp = { value: x }, yp = { value: y };
        if (finddpos_shift(xp, yp, dir, aroom)) {
            cc.x = xp.value;
            cc.y = yp.value;
            return true;
        }
    } while (++tryct < 20);
    for (x = x1; x <= x2; x++)
        for (y = y1; y <= y2; y++) {
            const xp = { value: x }, yp = { value: y };
            if (finddpos_shift(xp, yp, dir, aroom)) {
                cc.x = xp.value;
                cc.y = yp.value;
                return true;
            }
        }
    cc.x = x1;
    cc.y = y1;
    return false;
}
export function maybe_sdoor(chance) {
    const d = depth_of_level(game.u?.uz);
    return (d > 2) && !rn2(Math.max(2, chance));
}
// C ref: mklev.c dosdoor()
async function dosdoor(x, y, aroom, type) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc)
        return;
    /* C mklev.c:617 — `*in_rooms(x, y, SHOPBASE)`.  This read SHOPBASE as 0
     * ("any room"), which was harmless only while in_rooms returned []; with the
     * real body a 0 here would make EVERY door a shop door. */
    const shdoor = in_rooms(x, y, SHOPBASE).length > 0;
    if (!IS_WALL(loc.typ))
        type = DOOR;
    loc.typ = type;
    if (type === DOOR) {
        if (!rn2(3)) {
            if (!rn2(5))
                loc.flags = D_ISOPEN;
            else if (!rn2(6))
                loc.flags = D_LOCKED;
            else
                loc.flags = D_CLOSED;
            if (loc.flags !== D_ISOPEN && !shdoor
                && level_difficulty() >= 5 && !rn2(25))
                loc.flags |= D_TRAPPED;
        }
        else {
            loc.flags = shdoor ? D_ISOPEN : D_NODOOR;
        }
        if (Is_rogue_level(game.u?.uz))
            loc.flags = D_NODOOR;
        if (loc.flags & D_TRAPPED) {
            const S_MIMIC = 13;
            const PM_SMALL_MIMIC = 64, PM_LARGE_MIMIC = 65, PM_GIANT_MIMIC = 66;
            const mimicsAllGone = ((game.mvitals?.[PM_SMALL_MIMIC]?.mvflags | 0) & G_GONE)
                && ((game.mvitals?.[PM_LARGE_MIMIC]?.mvflags | 0) & G_GONE)
                && ((game.mvitals?.[PM_GIANT_MIMIC]?.mvflags | 0) & G_GONE);
            if (level_difficulty() >= 9 && !rn2(5) && !mimicsAllGone) {
                loc.flags = D_NODOOR;
                const mtmp = await makemon(mkclass(S_MIMIC, 0), x, y, 0 /* NO_MM_FLAGS */);
                if (mtmp)
                    await set_mimic_sym(mtmp);
            }
        }
    }
    else {
        if (shdoor || !rn2(5))
            loc.flags = D_LOCKED;
        else
            loc.flags = D_CLOSED;
        if (!shdoor && level_difficulty() >= 4 && !rn2(20))
            loc.flags |= D_TRAPPED;
    }
    add_door(x, y, aroom);
}
export async function dodoor(x, y, aroom) {
    await dosdoor(x, y, aroom, maybe_sdoor(8) ? SDOOR : DOOR);
}
export function add_door(x, y, aroom) {
    const g = game;
    if (!g.level.doors)
        g.level.doors = [];
    for (let i = 0; i < aroom.doorct; i++) {
        const d = g.level.doors[aroom.fdoor + i];
        if (d && d.x === x && d.y === y)
            return;
    }
    if (aroom.doorct === 0)
        aroom.fdoor = g.level.doorindex;
    aroom.doorct++;
    for (let tmp = g.level.doorindex; tmp > aroom.fdoor; tmp--)
        g.level.doors[tmp] = g.level.doors[tmp - 1];
    // C mklev.c:598-602 visits only top-level rooms here; subrooms share
    // rooms[]'s upper half and are shifted once by the separate loop below.
    for (let i = 0; i < g.level.nroom; i++) {
        const broom = g.level.rooms[i];
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0))
            continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor)
            broom.fdoor++;
    }
    const subrooms = g.level._subrooms || [];
    const nsub = (g.level._nsubroom != null) ? (g.level._nsubroom | 0) : subrooms.length;
    for (let i = 0; i < nsub; i++) {
        const broom = subrooms[i];
        if (!broom || broom.hx <= 0 || broom === aroom || !(broom.doorct > 0))
            continue;
        if ((broom.fdoor ?? 0) >= aroom.fdoor)
            broom.fdoor++;
    }
    g.level.doors[aroom.fdoor] = { x, y };
    g.level.doorindex++;
}
function bydoor(x, y) {
    const map = game.level;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (!isok(x + dx, y + dy))
            continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
            return true;
    }
    return false;
}
export function okdoor(x, y) {
    const map = game.level;
    const loc = map.at(x, y);
    if (!loc)
        return false;
    if (!(loc.typ === HWALL || loc.typ === VWALL))
        return false;
    if (bydoor(x, y))
        return false;
    return ((isok(x - 1, y) && !IS_OBSTRUCTED(map.at(x - 1, y).typ))
        || (isok(x + 1, y) && !IS_OBSTRUCTED(map.at(x + 1, y).typ))
        || (isok(x, y - 1) && !IS_OBSTRUCTED(map.at(x, y - 1).typ))
        || (isok(x, y + 1) && !IS_OBSTRUCTED(map.at(x, y + 1).typ)));
}
// C ref: mklev.c join()
async function join(a, b, nxcor) {
    pushRngLogEntry('>join');
    const g = game;
    const croom = g.level.rooms[a];
    const troom = g.level.rooms[b];
    if (!croom || !troom) {
        pushRngLogEntry('<join');
        return;
    }
    if (!croom.needjoining || !troom.needjoining) {
        pushRngLogEntry('<join');
        return;
    }
    if (troom.hx < 0 || croom.hx < 0) {
        pushRngLogEntry('<join');
        return;
    }
    let dx, dy;
    const cc = { x: 0, y: 0 }, tt = { x: 0, y: 0 };
    if (troom.lx > croom.hx) {
        dx = 1;
        dy = 0;
        if (!await finddpos(cc, DIR_E, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!await finddpos(tt, DIR_W, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else if (troom.hy < croom.ly) {
        dy = -1;
        dx = 0;
        if (!await finddpos(cc, DIR_N, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!await finddpos(tt, DIR_S, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else if (troom.hx < croom.lx) {
        dx = -1;
        dy = 0;
        if (!await finddpos(cc, DIR_W, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!await finddpos(tt, DIR_E, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else {
        dy = 1;
        dx = 0;
        if (!await finddpos(cc, DIR_S, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!await finddpos(tt, DIR_N, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    const xx = cc.x, yy = cc.y;
    const tx = tt.x - dx, ty = tt.y - dy;
    if (nxcor) {
        const loc = game.level.at(xx + dx, yy + dy);
        if (loc && loc.typ !== STONE) {
            pushRngLogEntry('<join');
            return;
        }
    }
    const org = { x: xx + dx, y: yy + dy };
    const dest = { x: tx, y: ty };
    const npoints = { value: 0 };
    const ftyp = g.level.flags.arboreal ? ROOM : CORR;
    const dig_result = await dig_corridor(org, dest, npoints, nxcor, ftyp, STONE);
    if ((npoints.value > 0) && (okdoor(xx, yy) || !nxcor))
        await dodoor(xx, yy, croom);
    if (!dig_result) {
        pushRngLogEntry('<join');
        return;
    }
    if (okdoor(tt.x, tt.y) || !nxcor)
        await dodoor(tt.x, tt.y, troom);
    if (g.smeq[a] < g.smeq[b])
        g.smeq[b] = g.smeq[a];
    else
        g.smeq[a] = g.smeq[b];
    pushRngLogEntry('<join');
}
// C ref: mklev.c makecorridors()
export async function makecorridors() {
    const g = game;
    let any = true;
    for (let a = 0; a < g.level.nroom - 1; a++) {
        await join(a, a + 1, false);
        if (!rn2(50))
            break;
    }
    for (let a = 0; a < g.level.nroom - 2; a++)
        if (g.smeq[a] !== g.smeq[a + 2])
            await join(a, a + 2, false);
    for (let a = 0; any && a < g.level.nroom; a++) {
        any = false;
        for (let b = 0; b < g.level.nroom; b++)
            if (g.smeq[a] !== g.smeq[b]) {
                await join(a, b, false);
                any = true;
            }
    }
    if (g.level.nroom > 2) {
        const count = rn2(g.level.nroom) + 4;
        for (let i = 0; i < count; i++) {
            let a = rn2(g.level.nroom);
            let b = rn2(g.level.nroom - 2);
            if (b >= a)
                b += 2;
            await join(a, b, true);
        }
    }
}
// C ref: mklev.c:1805-1811 occupied() = t_at(x,y) || IS_FURNITURE(levl[x][y].typ)
// || is_lava(x,y) || is_pool(x,y) || invocation_pos(x,y).
export function occupied(x, y) {
    // t_at(x,y) means a trap blocks the tile.
    const traps = game.level.traps;
    if (traps && traps.some(t => t.tx === x && t.ty === y))
        return true;
    // C mklev.c:1806 tests only levl[x][y].typ, never the stairway list: after
    // #wizloadlua re-fills a level, stale gs.stairs nodes sit on non-STAIRS
    // terrain and C treats those squares as free.
    const loc = game.level.at(x, y);
    if ((loc && IS_FURNITURE(loc.typ))
        || is_lava(x, y) || is_pool(x, y))
        return true;
    return invocation_pos(x, y);
}
/* C ref: selvar.c:781 selection_from_mkroom + selvar.c:284 selection_rndcoord.
 * Builds the ordered list of cells rndcoord(selection.room()) would index over:
 * every cell in [lx..hx]x[ly..hy] with levl[x][y].roomno == rmno AND !edge, in
 * dx-outer dy-inner traversal order (the exact order selection_rndcoord walks the
 * selection's bbox).  rn2(list.length) then selects the list[c]-th cell.  Returns
 * the cell array (possibly empty). */
function roomRndcoordCells(croom, roomIdxHint) {
    const rooms = game.level?.rooms ?? [];
    let roomIdx = (typeof roomIdxHint === 'number' && roomIdxHint >= 0)
        ? roomIdxHint : rooms.indexOf(croom);
    if (roomIdx < 0) roomIdx = 0;
    const rmno = roomIdx + ROOMOFFSET;
    const cells = [];
    /* selection_rndcoord traverses dx-outer dy-inner (selvar.c:303-304). */
    for (let dx = croom.lx; dx <= croom.hx; dx++)
        for (let dy = croom.ly; dy <= croom.hy; dy++) {
            if (!isok(dx, dy)) continue;
            const loc = game.level?.at(dx, dy);
            if (loc && !loc.edge && (loc.roomno | 0) === rmno)
                cells.push({ x: dx, y: dy });
        }
    return cells;
}
// ============================================================
// Stairs
// ============================================================
function generate_stairs_room_good(croom, phase) {
    /* C mklev.c:2200-2215 */
    return !!(croom && (croom.needjoining || (phase < 0))
        && ((!has_dnstairs(croom) && !has_upstairs(croom)) || phase < 1)
        && (croom.rtype === OROOM
            || ((phase < 2) && croom.rtype === THEMEROOM)));
}
function generate_stairs_find_room() {
    const g = game;
    if (!g.level.nroom)
        return null;
    for (let phase = 2; phase > -1; phase--) {
        const candidates = [];
        for (let i = 0; i < g.level.nroom; i++)
            if (generate_stairs_room_good(g.level.rooms[i], phase))
                candidates.push(i);
        if (candidates.length > 0) {
            const pick = rn2(candidates.length);
            return g.level.rooms[candidates[pick]];
        }
    }
    return g.level.rooms[rn2(g.level.nroom)];
}
// C ref: display.c:2287-2427 glyph_to_cmap(back_to_glyph(x, y))
function _mkstairs_cmap_idx(ptr) {
    if (!ptr)
        return 0; // S_stone
    switch (ptr.typ) {
        case SCORR:
        case STONE:
            return game.level?.flags?.arboreal ? 18 : 0; // S_tree : S_stone
        case ROOM:
            return 19; // S_room
        case CORR:
            return (ptr.waslit || game.flags?.lit_corridor) ? 23 : 22; // S_litcorr : S_corr
        case SDOOR:
            if (ptr.arboreal_sdoor || ptr.candig)
                return 18; // S_tree
            /* FALLTHRU */
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
            return ptr.seenv ? 1 : 0; // wall_angle(ptr) ("wall") : S_stone ("stone")
        case DOOR:
            if (ptr.doormask) {
                if (ptr.doormask & D_BROKEN)
                    return 12; // S_ndoor
                if (ptr.doormask & D_ISOPEN)
                    return ptr.horizontal ? 14 : 13; // S_hodoor : S_vodoor
                return ptr.horizontal ? 16 : 15; // S_hcdoor : S_vcdoor
            }
            return 12; // S_ndoor
        case IRONBARS: return 17; // S_bars
        case TREE: return 18; // S_tree
        case POOL:
        case MOAT: return 38; // S_pool
        case STAIRS:
            return (ptr.ladder & LA_DOWN) ? 26 : 25; // S_dnstair : S_upstair
        case LADDER:
            return (ptr.ladder & LA_DOWN) ? 28 : 27; // S_dnladder : S_upladder
        case FOUNTAIN: return 37; // S_fountain
        case SINK: return 36; // S_sink
        case ALTAR: return 33; // S_altar
        case GRAVE: return 34; // S_grave
        case THRONE: return 35; // S_throne
        case LAVAPOOL: return 40; // S_lava
        case LAVAWALL: return 41; // S_lavawall
        case ICE: return 39; // S_ice
        case AIR: return 46; // S_air
        case CLOUD: return 47; // S_cloud
        case WATER: return 48; // S_water
        case DBWALL: return ptr.horizontal ? 45 : 44; // S_hcdbridge : S_vcdbridge
        case DRAWBRIDGE_UP:
            switch (ptr.drawbridgemask & DB_UNDER) {
                case DB_MOAT: return 38; // S_pool
                case DB_LAVA: return 40; // S_lava
                case DB_ICE: return 39; // S_ice
                case DB_FLOOR: return 19; // S_room
                default: return 19;
            }
        case DRAWBRIDGE_DOWN: return ptr.horizontal ? 43 : 42; // S_hodbridge : S_vodbridge
        default: return 19; // S_room
    }
}
export function mkstairs(x, y, up, croom, force = false) {
    const g = game;
    if (!x || !isok(x, y)) {
        impossible_sync("mkstairs:  bogus stair attempt at <%d,%d>", x, y);
        return;
    }
    const loc = g.level.at(x, y);
    if (force && loc)
        loc.typ = ROOM;
    const ltyp = loc ? loc.typ : STONE; /* somexyspace() allows ice */
    if (ltyp !== ROOM && ltyp !== CORR && ltyp !== ICE) {
        const sidx = _mkstairs_cmap_idx(loc);
        impossible_sync("mkstairs:  placing stairs %s on %s at <%d,%d>",
            up ? "up" : "down", DEFSYM_EXPLANATION[sidx] ?? "stone", x, y);
    }
    const _uz = g.u?.uz;
    const _dlev = (_uz?.dlevel ?? 1) | 0;
    const _dunlevs = (g.dungeons?.[(_uz?.dnum ?? 0) | 0]?.num_dunlevs | 0);
    if (_dlev === (up ? 1 : _dunlevs))
        return;
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    /* C mklev.c:2193-2196 — the stairway list is the only record C keeps;
     * set_levltyp() honours CAN_OVERWRITE_TERRAIN, so the type is not
     * forced afterwards. */
    stairway_add(x, y, !!up, false, dest);
    set_levltyp(x, y, STAIRS);
    if (loc)
        loc.ladder = up ? LA_UP : LA_DOWN;
}
async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    if (!Is_botlevel(g.u?.uz)) {
        const croom = generate_stairs_find_room();
        if (!croom) throw new Error(`generate_stairs: failed to find a room! (${g.level.nroom})`);
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 0, croom);
        }
    }
    // Up stairs only if not level 1
    if ((g.u?.uz?.dlevel ?? 1) !== 1) {
        const croom = generate_stairs_find_room();
        if (!croom) throw new Error(`generate_stairs: failed to find a room! (${g.level.nroom})`);
        if (croom) {
            if (!somexyspace(croom, pos)) {
                pos.x = somex(croom);
                pos.y = somey(croom);
            }
            mkstairs(pos.x, pos.y, 1, croom);
        }
    }
}
// ============================================================
// Niches
// ============================================================
function cardinal_nextto_room(aroom, x, y) {
    const map = game.level;
    const rmno = game.level.rooms.indexOf(aroom) + ROOMOFFSET;
    for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        if (!isok(x + dx, y + dy))
            continue;
        const loc = map.at(x + dx, y + dy);
        if (loc && !loc.edge && loc.roomno === rmno)
            return true;
    }
    return false;
}
async function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!await finddpos(dd, DIR_S, aroom))
            return null;
    }
    else {
        dy = -1;
        if (!await finddpos(dd, DIR_N, aroom))
            return null;
    }
    const xx = dd.x, yy = dd.y;
    const niche = game.level.at(xx, yy + dy);
    const back = game.level.at(xx, yy - dy);
    if (!niche || niche.typ !== STONE)
        return null;
    if (!back || IS_POOL(back.typ) || IS_FURNITURE(back.typ))
        return null;
    if (!cardinal_nextto_room(aroom, xx, yy))
        return null;
    return { dy, xx, yy };
}
// C ref: mklev.c trap_engravings[TRAPNUM] — engraving text for trap niches (mklev.c:736)
const trap_engravings = [
    null, null, null, null, null, null, null, null, null, null, null, null, null, null,
    /* 14: TRAPDOOR */ "Vlad was here",
    /* 15: TELEP_TRAP */ "ad aerarium",
    /* 16: LEVEL_TELEP */ "ad aerarium",
    null, null, null, null, null, null, null, null, null,
];
async function makeniche(trap_type) {
    const g = game;
    let vct = 8;
    while (vct--) {
        const aroom = g.level.rooms[rn2(g.level.nroom)];
        if (!aroom || aroom.rtype !== OROOM)
            continue;
        if (aroom.doorct === 1 && rn2(5))
            continue;
        const niche = await place_niche(aroom);
        if (!niche)
            continue;
        const { dy, xx, yy } = niche;
        const rm = g.level.at(xx, yy + dy);
        if (!rm)
            continue;
        if (trap_type || !rn2(4)) {
            rm.typ = SCORR;
            if (trap_type) {
                let actualTrap = trap_type;
                if (is_hole(actualTrap) && !Can_fall_thru(game.u?.uz))
                    actualTrap = ROCKTRAP;
                const ttmp = await maketrap(xx, yy + dy, actualTrap);
                // C: if (ttmp) { if (trap_type != ROCKTRAP) ttmp->once=1; trap_engravings check }
                if (ttmp) {
                    if (actualTrap !== ROCKTRAP)
                        ttmp.once = true;
                    const engrText = trap_engravings[actualTrap];
                    if (engrText) {
                        make_engr_at(xx, yy - dy, engrText, null, 0, DUST);
                        wipe_engr_at(xx, yy - dy, 5, false);
                    }
                }
            }
            await dosdoor(xx, yy, aroom, SDOOR);
        }
        else {
            rm.typ = CORR;
            if (rn2(7)) {
                await dosdoor(xx, yy, aroom, rn2(5) ? SDOOR : DOOR);
            }
            else {
                const loc = g.level.at(xx, yy);
                if (!rn2(5) && loc && IS_WALL(loc.typ)) {
                    loc.typ = IRONBARS;
                    if (rn2(3)) {
                        // C mklev.c:786-788: mkcorpstat(CORPSE, NULL, mkclass(S_HUMAN, 0), xx, yy+dy, TRUE)
                        const TRUE = 1;
                        const pm = mkclassAligned(S_HUMAN, 0, A_NONE);
                        await mkcorpstat(CORPSE, null, pm, xx, yy + dy, TRUE);
                    }
                }
                if (!g.level.flags.noteleport) {
                    await mksobj_at(SCR_TELEPORTATION, xx, yy + dy, true, false);
                }
                if (!rn2(3)) {
                    await mkobj_at(RANDOM_CLASS, xx, yy + dy, true);
                }
            }
        }
        return;
    }
}
async function make_niches() {
    const g = game;
    let ct = rnd(Math.trunc(g.level.nroom / 2) + 1);
    const dep = depth_of_level(g.u?.uz) | 0;
    let ltptr = (!g.level.flags.noteleport && dep > 15);
    let vamp = (dep > 5 && dep < 25);
    while (ct--) {
        if (ltptr && !rn2(6)) {
            ltptr = false;
            await makeniche(LEVEL_TELEP);
        }
        else if (vamp && !rn2(6)) {
            vamp = false;
            await makeniche(TRAPDOOR);
        }
        else {
            await makeniche(NO_TRAP);
        }
    }
}
// ============================================================
// Branch placement
// ============================================================
// C ref: nethack-c/src/dungeon.c:1464-1473 Is_branchlev()
// Returns the branch whose end1 or end2 matches the current dungeon level,
// or null if no branch exits from/to this level.
// Prefers game._dungeon_branches (RNG-computed by consumeDungeonInitRng,
// mirrors svb.branches) over the legacy game.branches approximation.
function is_branchlev() {
    const g = game;
    const brlist = g._dungeon_branches || g.branches;
    if (!brlist)
        return null;
    const dnum = g.u?.uz?.dnum ?? 0;
    const dlevel = g.u?.uz?.dlevel ?? 1;
    for (const br of brlist) {
        if (!br?.end1_floating
            && br?.end1?.dnum === dnum && br?.end1?.dlevel === dlevel)
            return br;
        if (br?.end2?.dnum === dnum && br?.end2?.dlevel === dlevel)
            return br;
    }
    return null;
}
/* C mklev.c:1659-1673 find_branch_room(coord *mp)
 *     struct mkroom *croom = 0;
 *     if (svn.nroom == 0) {
 *         mazexy(mp);                  // already verifies location
 *     } else {
 *         croom = generate_stairs_find_room();
 *         assert(croom != NULL);
 *         if (!somexyspace(croom, mp))
 *             impossible("Can't place branch!");
 *     }
 *     return croom;
 * The nroom == 0 arm is a random maze (makemaz's fallback leaves nroom at 0),
 * and it needs mkmaze.c's mazexy(), which now has a JS body — it used to be a
 * named throw because it did not.  Skipping it silently was never an option:
 * mazexy draws a rnd(x_maze_max)/rnd(y_maze_max) pair per attempt.
 * impossible() logs and returns in C (pline.c:587-637), so the failed
 * somexyspace falls through with mp untouched, exactly as here. */
export async function find_branch_room(mp) {
    const g = game;
    if (!g.level.nroom) {
        mazexy(mp); /* already verifies location */
        return null;
    }
    const croom = generate_stairs_find_room();
    if (croom)
        if (!somexyspace(croom, mp)) await lifecycle_impossible("Can't place branch!");
    return croom;
}
/* C ref: dungeon.c:1870-1886 dungeon_branch(s) — the branch whose end2 lies in
 * dungeon `dnum`.  C looks the dnum up by name; the two names this port needs
 * ("Fort Ludios", "The Quest") already have their dnum on game (knox_level.dnum
 * and quest_dnum), so the name lookup is folded into the caller.  Forwards to
 * dungeon_branch_dnum — the ONE canonical end2 scan in js/dungeon.js — so this
 * file keeps no second body.  The undefined-dnum arm has no C counterpart (C
 * resolves a name, and dname_to_dnum panics on an unknown one); the not-found
 * arm now throws exactly as C's panic() does instead of returning null. */
function dungeon_branch_by_dnum(dnum) {
    if (dnum === undefined || dnum === null)
        return null;
    return dungeon_branch_dnum(dnum);
}
async function mk_knox_portal(x, y) {
    const g = game;
    const knox = g.knox_level;
    const br = dungeon_branch_by_dnum(knox?.dnum);
    if (!br)
        return; /* only the undefined-dnum defensive arm; a resolved dnum that
                 * matches no branch throws, as C's dungeon_branch() panics */
    let source;
    /* C mklev.c:2632 — on_level(&knox_level, &br->end1): the REAL on_level
     * port (js/dungeon.js:57), not a hand-inlined dnum/dlevel test. */
    if (knox && on_level(knox, br.end1)) {
        source = br.end2;
    }
    else {
        /* C mklev.c:2636 — disallow Knox branch on a level with one branch already */
        if (is_branchlev())
            return;
        source = br.end1;
    }
    /* C mklev.c:2644 — "Already set or 2/3 chance of deferring until a later
     * level."  `rn2(3) && !wizard`: C evaluates rn2(3) FIRST, so the draw is
     * spent even in wizard mode, where the deferral never triggers. */
    if (!br.end1_floating || (rn2(3) && !wizard()))
        return;
    const uz = g.u?.uz;
    const u_depth = depth_of_level(uz) | 0;
    /* C mklev.c:2647-2651 — in the main dungeon, not at the Quest entrance,
     * beneath 10 and above Medusa. */
    if (!(uz && uz.dnum === g.oracle_level?.dnum
        && !at_dgn_entrance("The Quest")
        && u_depth > 10
        && u_depth < (depth_of_level(g.medusa_level) | 0)))
        return;
    /* C mklev.c:2653-2657 — adjust source to be current level and re-insert. */
    source.dnum = uz.dnum;
    source.dlevel = uz.dlevel;
    br.end1_floating = false;
    insert_branch(br, true);
    await debugpline('mklev.c', 'Made knox portal.'); /* C mklev.c:2656 debugpline0 */
    await place_branch(br, x, y);
}
/* C mklev.c:1676-1687 pos_to_room() — the room containing <x,y>, or null. */
function pos_to_room(x, y) {
    const g = game;
    for (let i = 0; i < (g.level.nroom | 0); i++) {
        const curr = g.level.rooms[i];
        if (inside_room(curr, x, y))
            return curr;
    }
    return null;
}
// C ref: nethack-c/src/mklev.c:1701-1757 place_branch()
// Places branch staircase or portal for the current dungeon level.
// Mirrors the C logic: guards on !br/made_branch, determines dest and
// make_stairs from branch type and which end we are on, then calls
// stairway_add / set_levltyp (STAIRS) / ladder direction.
// BR_* constants match dungeon_rng.js: STAIR=0, NO_END1=1, NO_END2=2, PORTAL=3.
export async function place_branch(branchp, x, y) {
    const g = game;
    /* C ref: mklev.c:1715 — return if no branch or already placed */
    if (!branchp || g.made_branch)
        return;
    const mp = { x: 0, y: 0 };
    /* C ref: mklev.c:1708-1715 — the x==0 arm finds random coords; the x!=0
     * arm only calls pos_to_room(x, y), whose return value C discards. */
    if (!x) {
        await find_branch_room(mp);
    }
    else {
        pos_to_room(x, y);
        mp.x = x;
        mp.y = y;
    }
    const dnum = g.u?.uz?.dnum ?? 0;
    const dlevel = g.u?.uz?.dlevel ?? 1;
    const on_end1 = (branchp.end1?.dnum === dnum && branchp.end1?.dlevel === dlevel);
    /* C ref: mklev.c:1717-1725 */
    const dest = on_end1 ? branchp.end2 : branchp.end1;
    /* BR_NO_END1=1, BR_NO_END2=2; make_stairs false iff type matches the end we're on */
    const BR_NO_END1 = 1;
    const BR_NO_END2 = 2;
    const BR_PORTAL = 3;
    const brtype = branchp.type ?? 0;
    const make_stairs = on_end1 ? (brtype !== BR_NO_END1) : (brtype !== BR_NO_END2);
    /* C ref: mklev.c:1727-1739 */
    if (brtype === BR_PORTAL) {
        const ucf = g.u?.ucamefrom;
        if (g.iflags?.debug_fuzzer && (ucf?.dnum || ucf?.dlevel))
            await mkportal(mp.x, mp.y, ucf.dnum, ucf.dlevel);
        else
            await mkportal(mp.x, mp.y, dest?.dnum ?? 0, dest?.dlevel ?? 0);
    }
    else if (make_stairs) {
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        set_levltyp(mp.x, mp.y, STAIRS);
        const loc = g.level?.at(mp.x, mp.y);
        if (loc)
            loc.ladder = goes_up ? LA_UP : LA_DOWN;
    }
    /* C ref: mklev.c:1756 — set made_branch regardless */
    g.made_branch = true;
}
// ============================================================
// Fill ordinary room
// ============================================================
/** C ref: mklev.c traptype_roguelvl */
function traptype_roguelvl() {
    switch (rn2(7)) {
        default:
            return BEAR_TRAP;
        case 1:
            return ARROW_TRAP;
        case 2:
            return DART_TRAP;
        case 3:
            return TRAPDOOR;
        case 4:
            return PIT;
        case 5:
            return SLP_GAS_TRAP;
        case 6:
            return RUST_TRAP;
    }
}
/** C ref: mklev.c traptype_rnd */
function traptype_rnd(mktrapflags) {
    const lvl = level_difficulty();
    let kind = rnd(TRAPNUM - 1);
    switch (kind) {
        case TRAPPED_DOOR:
        case TRAPPED_CHEST:
            kind = NO_TRAP;
            break;
        case MAGIC_PORTAL:
        case VIBRATING_SQUARE:
            kind = NO_TRAP;
            break;
        case ROLLING_BOULDER_TRAP:
        case SLP_GAS_TRAP:
            if (lvl < 2)
                kind = NO_TRAP;
            break;
        case LEVEL_TELEP:
            if (lvl < 5 || game.level?.flags?.noteleport
                || single_level_branch())
                kind = NO_TRAP;
            break;
        case SPIKED_PIT:
            if (lvl < 5)
                kind = NO_TRAP;
            break;
        case LANDMINE:
            if (lvl < 6)
                kind = NO_TRAP;
            break;
        case WEB:
            if (lvl < 7 && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
                kind = NO_TRAP;
            break;
        case STATUE_TRAP:
        case POLY_TRAP:
            if (lvl < 8)
                kind = NO_TRAP;
            break;
        case FIRE_TRAP:
            if (!Inhell())
                kind = NO_TRAP;
            break;
        case TELEP_TRAP:
            if (game.level?.flags?.noteleport)
                kind = NO_TRAP;
            break;
        case HOLE:
            if (rn2(7))
                kind = NO_TRAP;
            break;
    }
    return kind;
}
function find_okay_roompos(croom, crd) {
    let tryct = 0;
    do {
        if (++tryct > 200)
            return false;
        if (!somexyspace(croom, crd))
            return false;
    } while (occupied(crd.x, crd.y) || bydoor(crd.x, crd.y));
    return true;
}
async function mktrap_victim(trap) {
    const lvl = level_difficulty();
    const kind = trap.ttyp;
    const x = trap.tx, y = trap.ty;
    /* C mklev.c:1825 */
    if (!(x > 0 && x < COLNO && y >= 0 && y < ROWNO))
        throw new Error(`mktrap_victim: assertion failed: <${x},${y}> off map`);
    let trap_item = null;
    switch (kind) {
        case ARROW_TRAP:
            trap_item = (await mksobj(ARROW, true, false));
            trap_item.opoisoned = 0; /* mklev.c ~1841 */
            break;
        case DART_TRAP:
            trap_item = (await mksobj(DART, true, false));
            break;
        case ROCKTRAP:
            trap_item = (await mksobj(ROCK, true, false));
            break;
        default: break;
    }
    if (trap_item)
        place_object(trap_item, x, y);
    do {
        const cls = [WEAPON_CLASS, TOOL_CLASS, FOOD_CLASS, GEM_CLASS][rn2(4)];
        const otmp = await mkobj(cls, false);
        curse(otmp);
        /* C mklev.c:1877-1885 — "for mktrap_victim(), PIT is actually an exploded
         * LANDMINE": if a fragile object has been created, destroy it. */
        if (kind === PIT && breaktest(otmp)) {
            await dealloc_obj(otmp);
        } else {
            place_object(otmp, x, y);
        }
    } while (!rn2(5));
    /* C mklev.c:1890 — Place a corpse.  PM_* are the pm.generated.js
     * imports; rn1(PM_WIZARD - PM_ARCHEOLOGIST, ...) is rn2(12), mklev.c:1931 */
    let victim_mnum;
    switch (rn2(15)) {
        case 0:
            victim_mnum = PM_ELF;
            if (kind === SLP_GAS_TRAP && !(lvl <= 2 && rn2(2)))
                victim_mnum = PM_HUMAN;
            break;
        case 1:
        case 2:
            victim_mnum = PM_DWARF;
            break;
        case 3:
        case 4:
        case 5:
            victim_mnum = PM_ORC;
            break;
        case 6:
        case 7:
        case 8:
        case 9:
            victim_mnum = PM_GNOME;
            if (!rn2(10)) {
                const otmp = await mksobj(rn2(4) ? TALLOW_CANDLE : WAX_CANDLE, true, false);
                otmp.quan = 1;
                otmp.owt = weight(otmp);
                curse(otmp);
                place_object(otmp, x, y);
                if (!game.level.at(x, y).lit)
                    begin_burn(otmp, false);
            }
            break;
        default:
            victim_mnum = PM_HUMAN;
            break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    const otmp = await mkcorpstat(CORPSE, null, victim_mnum, x, y, CORPSTAT_INIT);
    // C mklev.c:1933 — otmp->age -= (TAINT_AGE + 1); died too long ago to safely eat.
    // No RNG. Makes the trap-victim corpse "old" so dogfood()/eat classify it as
    // rotted (peek_at_iced_corpse_age(obj) + 50 <= moves is always true at age=-50).
    if (otmp)
        otmp.age -= (TAINT_AGE + 1);
}
async function mktrap_room(croom) {
    const mktrapflags = MKTRAP_NOFLAGS;
    const uz = game.u?.uz ?? { dnum: 0, dlevel: 1 };
    let kind;
    if (Is_rogue_level(uz)) {
        kind = traptype_roguelvl();
    }
    else if (Inhell() && !rn2(5)) {
        kind = FIRE_TRAP;
    }
    else {
        do {
            kind = traptype_rnd(mktrapflags);
        } while (kind === NO_TRAP);
    }
    if (is_hole(kind) && !Can_fall_thru(uz))
        kind = ROCKTRAP;
    const pos = { x: 0, y: 0 };
    // C mklev.c:2091-2104 — retry occupied cells and pits/holes under boulders.
    let tryct = 0;
    do {
        if (++tryct > 200 || !somexyspace(croom, pos)) return;
    } while (occupied(pos.x, pos.y) || ((is_pit(kind) || is_hole(kind)) && sobj_at(BOULDER, pos.x, pos.y)));
    const trap = await maketrap(pos.x, pos.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    /* C mklev.c:2114-2115 — WEB trap always spawns a giant spider unless MKTRAP_NOSPIDERONWEB */
    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
        await makemon(PM_GIANT_SPIDER, pos.x, pos.y, 0 /* NO_MM_FLAGS */);
    const lvl = level_difficulty();
    if (game.in_mklev && kind !== NO_TRAP
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            trap.ttyp = PIT;
            trap.tseen = true;
        }
        await mktrap_victim(trap);
    }
}
function mkfount(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    /* C mklev.c:2293 — set_levltyp() recounts the level's features
     * (mkmaze.c:106-108), and mkfount() then increments on top of that. */
    /* C mklev.c:2293 — set_levltyp() recounts every fountain/sink (mkmaze.c:107),
     * then the explicit nfountains++ below counts this one a second time. */
    if (!set_levltyp(pos.x, pos.y, FOUNTAIN))
        return;
    const loc = game.level?.at(pos.x, pos.y);
    /* C mklev.c:2293 — set_levltyp() runs count_level_features() (mkmaze.c:106-108),
     * a full recount (themeroom fountains included), and THEN nfountains++ below. */
    if (loc) {
        if (!set_levltyp(pos.x, pos.y, FOUNTAIN))
            return;
        // C ref: rm.h:391 — blessedftn aliases horizontal (same 1-bit field).
        // Setting blessedftn=1 also sets horizontal=1 in C's struct rm.
        if (!rn2(7)) {
            loc.blessedftn = 1;
            loc.horizontal = 1;
        }
        game.level.flags.nfountains++;
    }
}
/** C ref: mklev.c mksink */
function mksink(croom) {
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    /* C mklev.c:2325-2328 — set_levltyp() recounts tracked features, then
     * mksink() increments nsinks once. */
    if (!set_levltyp(pos.x, pos.y, SINK))
        return;
    game.level.flags.nsinks++;
}
function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM)
        return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    if (!set_levltyp(pos.x, pos.y, ALTAR))
        return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc)
        return;
    const al = rn2(A_LAWFUL + 2) - 1;
    // C rm.h:214 #define altarmask flags (aliased on rmProto in js/game.js:79)
    loc.altarmask = Align2amask(al);
}
async function mkgrave_room(croom) {
    /* C mklev.c:2358-2361 — dobell's initializer draws rn2(10) BEFORE the
     * rtype check, so a THEMEROOM still consumes the draw. */
    const dobell = !rn2(10);
    if (croom.rtype !== OROOM)
        return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = await mksobj(GOLD_PIECE, true, false);
        if (gold) {
            gold.quan = rnd(20) + level_difficulty() * rnd(5);
            gold.owt = weight(gold);
            gold.ox = pos.x;
            gold.oy = pos.y;
            add_to_buried(gold);
        }
    }
    for (let tryct = rn2(5); tryct > 0; tryct--) {
        const otmp = await mkobj(RANDOM_CLASS, true);
        if (!otmp)
            return;
        curse(otmp);
        otmp.ox = pos.x;
        otmp.oy = pos.y;
        add_to_buried(otmp);
    }
    if (dobell)
        await mksobj_at(BELL, pos.x, pos.y, true, false);
}

// C mklev.c:2410-2496 — the Book of the Dead opens the way to the Sanctum.
export async function mkinvokearea() {
    const g = game;
    const u = g.u;
    const inv = g.svi.inv_pos;
    await pline_The('floor shakes violently under you!');

    let xmin = inv.x, xmax = inv.x, ymin = inv.y, ymax = inv.y;
    let wallct = mkinvk_check_wall(xmin, ymin);
    for (let dist = 1; !wallct && dist < 7; ++dist) {
        --xmin;
        ++xmax;
        if (dist !== 3) {
            --ymin;
            ++ymax;
            for (let i = xmin + 1; i < xmax; ++i) {
                if (mkinvk_check_wall(i, ymin)) ++wallct;
                if (mkinvk_check_wall(i, ymax)) ++wallct;
            }
        }
        if (!wallct) {
            for (let i = ymin; i <= ymax; ++i) {
                if (mkinvk_check_wall(xmin, i)) ++wallct;
                if (mkinvk_check_wall(xmax, i)) ++wallct;
            }
        }
    }
    if (wallct)
        await pline_The('walls around you begin to bend and crumble!');
    // C display_nhwindow(WIN_MESSAGE, TRUE), before changing the terrain.
    if (g._pending_message) {
        const shown = g._pending_message;
        const morc = await force_more(shown);
        /* topl.c:232-235: ESC sets WIN_STOP at once.  This more() is raised by
         * display_nhwindow, not by a pline's update_topl, so no owner is
         * redrawn afterwards: the next pline is already suppressed. */
        if (morc === 27 && g._topl_win_stop_armed) {
            g._topl_win_stop_armed = false;
            g._topl_win_stop = true;
            g._topl_win_stop_buf = shown;
        }
    }

    if (u.utrap) {
        if (u.utraptype === TT_BURIEDBALL)
            await buried_ball_to_punishment();
        await reset_utrap(false);
    }
    xmin = xmax = inv.x;
    ymin = ymax = inv.y;
    await mkinvpos(xmin, ymin, 0);
    for (let dist = 1; dist < 7; ++dist) {
        --xmin;
        ++xmax;
        if (dist !== 3) {
            --ymin;
            ++ymax;
            for (let i = xmin + 1; i < xmax; ++i) {
                await mkinvpos(i, ymin, dist);
                await mkinvpos(i, ymax, dist);
            }
        }
        for (let i = ymin; i <= ymax; ++i) {
            await mkinvpos(xmin, i, dist);
            await mkinvpos(xmax, i, dist);
        }
        await flush_screen(1);
        // nh_delay_output() is a window-port delay, with no game-state effect.
    }
    await You('are standing at the top of a stairwell leading down!');
    mkstairs(u.ux, u.uy, 0, null, false);
    newsym(u.ux, u.uy);
    g.vision_full_recalc = 1;
}

// C mklev.c:2503-2597 — preserve the ring order, including monster effects.
async function mkinvpos(x, y, dist) {
    const g = game;
    const x_maze_min = 2;
    const y_maze_min = 2;
    const xmax = g.gx?.x_maze_max ?? ((COLNO - 1) & ~1);
    const ymax = g.gy?.y_maze_max ?? ((ROWNO - 1) & ~1);
    if (!within_bounded_area(x, y, x_maze_min, y_maze_min, xmax, ymax)) {
        if (dist < (7 - 2)) {
            const msg = `mkinvpos: <${x},${y}> (${dist}) off map edge!`;
            if (!isok(x, y)) throw new Error(msg);
            await lifecycle_impossible(msg);
        }
        return;
    }
    const lev = g.level.at(x, y);
    let ttmp = t_at(x, y);
    if (ttmp) deltrap(ttmp);

    let make_rocks = dist !== 1 && dist !== 4 && dist !== 5;
    let otmp;
    while ((otmp = sobj_at(BOULDER, x, y)) !== null) {
        if (make_rocks) {
            await fracture_rock(otmp);
            make_rocks = false;
        } else {
            obj_extract_self(otmp);
            await obfree(otmp, null);
        }
    }

    lev.seenv = 0;
    lev.flags = 0; // C doormask aliases rm.flags.
    if (dist < 6) lev.lit = true;
    lev.waslit = true;
    lev.horizontal = false;
    g.viz_array[y][x] = dist < 6 ? IN_SIGHT | COULD_SEE : COULD_SEE;
    switch (dist) {
    case 1:
        if (is_pool(x, y)) break;
        lev.typ = ROOM;
        ttmp = await maketrap(x, y, FIRE_TRAP);
        if (ttmp) ttmp.tseen = true;
        break;
    case 0:
    case 2:
    case 3:
    case 6:
        lev.typ = ROOM;
        break;
    case 4:
    case 5:
        lev.typ = MOAT;
        break;
    default:
        await lifecycle_impossible('mkinvpos called with dist %d', dist);
        break;
    }

    const mon = m_at(x, y);
    if (mon) {
        if (mon.m_ap_type) seemimic(mon);
        if (t_at(x, y))
            await mintrap(mon, NO_TRAP_FLAGS);
        else
            await minliquid(mon);
    }
    if (!does_block(x, y)) unblock_point(x, y);
    newsym(x, y);
}

// C mklev.c:2603-2614 — lava maze walls do not trigger the crumble message.
function mkinvk_check_wall(x, y) {
    if (!isok(x, y)) return 0;
    const ltyp = game.level.at(x, y).typ;
    return IS_STWALL(ltyp) || ltyp === IRONBARS ? 1 : 0;
}

async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM))
        return;
    const nsub = croom.nsubrooms | 0;
    for (let si = 0; si < nsub; si++) {
        const subroom = croom.sbrooms?.[si];
        if (!subroom)
            return await lifecycle_impossible("fill_ordinary_room: Null subroom");
        await fill_ordinary_room(subroom, false);
    }
    if (croom.needfill !== FILL_NORMAL)
        return;
    const pos = { x: 0, y: 0 };
    /* mklev.c:982 (u.uhave.amulet || !rn2(3)) — short-circuit when carrying amulet */
    const haveAmulet = !!(g.u?.uhave?.amulet);
    let x;
    /* C mklev.c:984-986 — if spider placed, put a web under it */
    if ((haveAmulet || !rn2(3)) && somexyspace(croom, pos)) {
        const tmonst = await makemon(null, pos.x, pos.y, MM_NOGRP); // C mklev.c:983
        if (tmonst && tmonst.mnum === PM_GIANT_SPIDER && !occupied(pos.x, pos.y))
            await maketrap(pos.x, pos.y, WEB);
    }
    let trycnt = 0;
    x = 8 - Math.trunc(level_difficulty() / 6);
    if (x <= 1)
        x = 2;
    while (!rn2(x) && ++trycnt < 1000)
        await mktrap_room(croom);
    if (!rn2(3) && somexyspace(croom, pos))
        await mkgold(0, pos.x, pos.y);
    const uz = g.u?.uz ?? { dnum: 0, dlevel: 1 };
    let skip_chests = false;
    /* mklev.c:996 Is_rogue_level — skip fountain through graffiti */
    if (!Is_rogue_level(uz)) {
        if (!rn2(10))
            mkfount(croom);
        if (!rn2(60))
            mksink(croom);
        if (!rn2(60))
            mkaltar(croom);
        x = 80 - (depth_of_level(uz) * 2);
        if (x < 2)
            x = 2;
        if (!rn2(x))
            await mkgrave_room(croom);
        if (!rn2(20) && somexyspace(croom, pos))
            await mkcorpstat(STATUE, null, null, pos.x, pos.y, CORPSTAT_INIT);
        if (bonus_items && somexyspace(croom, pos)) {
            const branchp = is_branchlev();
            const oracle_dlevel = g.oracle_level?.dlevel ?? 5;
            const oracle_dnum = g.oracle_level?.dnum ?? 0;
            const mines_dn = g.mines_dnum;
            /* mklev.c:1037–1039 mines branch entrance food */
            const mines_bonus_room = branchp
                && mines_dn !== undefined
                && (uz.dnum ?? 0) !== mines_dn
                && (branchp.end1?.dnum === mines_dn
                    || branchp.end2?.dnum === mines_dn);
            if (mines_bonus_room) {
                await mksobj_at(rn2(5) < 3 ? FOOD_RATION : rn2(2) ? CRAM_RATION : LEMBAS_WAFER, pos.x, pos.y, true, false);
            }
            else if ((uz.dnum ?? 0) === oracle_dnum
                && (uz.dlevel ?? 1) < oracle_dlevel && rn2(3)) {
                /* W6.3 wiring: fill_supply_chest mirrors C mklev.c:1055-1132 and
                 * ALSO links created items into supply_chest.cobj via
                 * add_to_container.  The previous inline loop created items
                 * but never added them to the container — leaving cobj=null
                 * and producing many fobj[*].contents_count divergences. */
                const supply_chest = await mksobj_at(rn2(3) ? CHEST : LARGE_BOX, pos.x, pos.y, false, false);
                if (supply_chest)
                    await fill_supply_chest(supply_chest, depth_of_level(uz));
                skip_chests = true;
            }
        }
        if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos))
            await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
        /* mklev.c:1150-1162 */
        const absDepthAbs = Math.abs(depth_of_level(uz));
        if (!rn2(27 + 3 * absDepthAbs)) {
            const { text: engrText, pristine: engrPristine } = await random_engraving();
            let gx = pos.x;
            let gy = pos.y;
            do {
                somexyspace(croom, pos);
                gx = pos.x;
                gy = pos.y;
            } while (g.level?.at(gx, gy)?.typ !== ROOM && !rn2(40));
            if (g.level?.at(gx, gy)?.typ === ROOM)
                make_engr_at(gx, gy, engrText, engrPristine, 0, MARK);
        }
    }
    skip_nonrogue: trycnt = 0;
    if (!rn2(3) && somexyspace(croom, pos)) {
        await mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        while (!rn2(5)) {
            if (++trycnt > 100)
                { await lifecycle_impossible("trycnt overflow4"); break; }
            if (somexyspace(croom, pos))
                await mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        }
    }
}
// ============================================================
// Mineralize
// ============================================================
function water_has_kelp(x, y, kelp_pool, kelp_moat) {
    const loc = game.level.at(x, y);
    if (!loc)
        return false;
    /* C mklev.c:1434-1435 — WATER only counts when NOT on the plane of water */
    if (kelp_pool && (loc.typ === POOL || (loc.typ === WATER && !Is_waterlevel(game.u?.uz))) && !rn2(kelp_pool))
        return true;
    if (kelp_moat && loc.typ === MOAT && !rn2(kelp_moat))
        return true;
    return false;
}
async function mineralize_kelp(kelp_pool, kelp_moat) {
    if (kelp_pool < 0)
        kelp_pool = 10;
    if (kelp_moat < 0)
        kelp_moat = 30;
    for (let x = 2; x < COLNO - 2; x++)
        for (let y = 1; y < ROWNO - 1; y++)
            if (water_has_kelp(x, y, kelp_pool, kelp_moat))
                await mksobj_at(KELP_FROND, x, y, true, false);
}
/* C ref: mklev.c:1456–1549 mineralize — place gold/gem deposits and kelp */
export async function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
    if (kelp_pool < 0)
        kelp_pool = 10;
    if (kelp_moat < 0)
        kelp_moat = 30;
    /* Place kelp, except on the plane of water */
    if (!skip_lvl_checks && In_endgame(game.u?.uz))
        return;
    await mineralize_kelp(kelp_pool, kelp_moat);
    /* determine if it is even allowed; almost all special levels are excluded */
    if (!skip_lvl_checks
        && (In_hell(game.u?.uz) || In_V_tower(game.u?.uz) || Is_rogue_level(game.u?.uz)
            || game.level?.flags?.arboreal
            || (Is_special(game.u?.uz) && !Is_oracle_level(game.u?.uz)
                && (!In_mines(game.u?.uz) || Is_special(game.u?.uz)?.flags?.town))))
        return;
    /* basic level-related probabilities */
    const absDepth = depth_of_level(game.u?.uz);
    const dunLevel = game.u?.uz?.dlevel ?? 1;
    if (goldprob < 0)
        goldprob = 20 + Math.trunc(absDepth / 3);
    if (gemprob < 0)
        gemprob = Math.trunc(goldprob / 4);
    /* mines have more goodies */
    if (!skip_lvl_checks) {
        if (In_mines(game.u?.uz)) {
            goldprob *= 2;
            gemprob *= 3;
        }
        else if (In_quest(game.u?.uz)) {
            goldprob = Math.trunc(goldprob / 4);
            gemprob = Math.trunc(gemprob / 6);
        }
    }
    /* Seed rock areas with gold and/or gems */
    const map = game.level;
    for (let x = 2; x < COLNO - 2; x++) {
        for (let y = 1; y < ROWNO - 1; y++) {
            const loc = map.at(x, y);
            const locBelow = map.at(x, y + 1);
            if (!loc || !locBelow)
                continue;
            if (locBelow.typ !== STONE) {
                y += 2;
                continue;
            }
            if (loc.typ !== STONE) {
                y += 1;
                continue;
            }
            const n = (d) => { const l = map.at(x + d[0], y + d[1]); return l && l.typ === STONE; };
            if (!(loc.wall_info & W_NONDIGGABLE)
                && n([0, -1]) && n([1, -1]) && n([-1, -1])
                && n([1, 0]) && n([-1, 0])
                && n([1, 1]) && n([-1, 1])) {
                if (rn2(1000) < goldprob) {
                    const otmp = await mksobj(GOLD_PIECE, false, false);
                    if (otmp) {
                        otmp.ox = x;
                        otmp.oy = y;
                        otmp.quan = 1 + rnd(goldprob * 3);
                        otmp.owt = weight(otmp);
                        if (!rn2(3))
                            add_to_buried(otmp);
                        else
                            place_object(otmp, x, y);
                    }
                }
                if (rn2(1000) < gemprob) {
                    for (let cnt = rnd(2 + Math.trunc(dunLevel / 3)); cnt > 0; cnt--) {
                        const otmp = await mkobj(GEM_CLASS, false);
                        if (otmp) {
                            if (otmp.otyp === ROCK) {
                                await dealloc_obj(otmp);
                            }
                            else {
                                otmp.ox = x;
                                otmp.oy = y;
                                if (!rn2(3))
                                    add_to_buried(otmp);
                                else
                                    place_object(otmp, x, y);
                            }
                        }
                    }
                }
            }
        }
    }
}
export async function level_finalize_topology() {
    bound_digging();
    /* C ref: mklev.c level_finalize_topology — mineralize(-1,-1,-1,-1,FALSE) */
    await mineralize(-1, -1, -1, -1, false);
    game.in_mklev = false;
    /* C mklev.c:1552-1555 — xstart/ystart aren't saved with the level and
     * would throw off coordinates in later lua-loads: gx.xstart = gy.ystart = 0 */
    if (game.gx) game.gx.xstart = 0;
    if (game.gy) game.gy.ystart = 0;
    /* C mklev.c:1564-1568.  A morgue is an event-level marker which is
     * cleared once entered, whereas graveyard persists to reduce undead
     * corpse drops.  Finalization promotes the former to the latter after
     * makelevel() has filled the room. */
    if (game.level?.flags?.has_morgue)
        game.level.flags.graveyard = true;
    if (!game.level?.flags?.is_maze_lev) {
        const nroom = game.level?.nroom ?? 0;
        for (let i = 0; i < nroom; i++)
            topologize(game.level.rooms?.[i]);
    }
    set_wall_state();
    const rooms = game.level?.rooms ?? [];
    for (let i = 0; i < rooms.length; i++) {
        const rm = rooms[i];
        if (rm && rm.rtype != null)
            rm.orig_rtype = rm.rtype;
    }
}








/* C ref: mklev.c:835 count_level_features(void) — count fountains + sinks. */
export function count_level_features() {
    const lev = game.level;
    lev.flags.nfountains = lev.flags.nsinks = 0;
    for (let y = 0; y < ROWNO; y++)
        for (let x = 1; x < COLNO; x++) {
            const typ = lev.locations[x][y].typ;
            if (typ === FOUNTAIN)
                lev.flags.nfountains++;
            else if (typ === SINK)
                lev.flags.nsinks++;
        }
}


/* C ref: include/artifact.h:16-40 — the SPFX_* bits touch_artifact() and
 * bane_applies() read.  Suffixed _MK because js/wizcmds.js declares the same
 * C constants module-privately for the hero branch; both are transcribed from
 * the same header rather than one importing the other's spelling. */
const SPFX_RESTR_MK  = 0x00000002;
const SPFX_INTEL_MK  = 0x00000004;
const SPFX_DMONS_MK  = 0x00100000;
const SPFX_DCLAS_MK  = 0x00200000;
const SPFX_DFLAG1_MK = 0x00400000;
const SPFX_DFLAG2_MK = 0x00800000;
const SPFX_DALIGN_MK = 0x01000000;
const SPFX_DBONUS_MK = 0x01F00000;
/* C include/align.h A_NONE.  ART_EXCALIBUR — the one artifact C exempts from
 * the monster badclass test — is already declared above as ART_EXCALIBUR_MK. */
const A_NONE_MK = -128;


/* C artifact.c:929-973 for a non-hero toucher (`yours` FALSE).  Synchronous and
 * RNG-free, so sync callers (dogmove.js can_carry -> can_touch_safely) can use it. */
export function touch_artifact_mon(otmp, mtmp) {
    const arti = (otmp && (otmp.oartifact | 0)) || 0;
    if (!arti) return true;
    const oart = ARTI_PROPS[arti];
    if (!oart) return true;
    const ptr = mtmp.data;
    /* C artifact.c:920 — all quest artifacts are self-willed. */
    const self_willed = (oart.spfx & SPFX_INTEL_MK) !== 0;
    const al = artifact_alignment(arti);

    let badclass, badalign;
    /* C mondata.h is_covetous(ptr): ptr->mflags3 & M3_COVETOUS (0x001f);
     * is_mplayer(ptr): the PM_ARCHEOLOGIST..PM_WIZARD player-monster block. */
    const covetous = ((ptr.mflags3 | 0) & 0x001f) !== 0;
    const mplayer = is_mplayer_nc((mtmp.data?.pmidx ?? mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0);
    if (!covetous && !mplayer) {
        /* C artifact.c:930-933 */
        badclass = self_willed && oart.role && arti !== ART_EXCALIBUR_MK;
        badalign = (oart.spfx & SPFX_RESTR_MK) !== 0
                   && al !== A_NONE_MK
                   && (al !== mon_aligntyp(mtmp));
    } else {
        /* C artifact.c:934-937 — an M3_WANTSxxx monster or a fake player. */
        badclass = badalign = false;
    }
    /* C artifact.c:941-942 */
    if (!badalign)
        badalign = bane_applies_mk(arti, mtmp);

    /* C artifact.c:944-950.  `!yours` is TRUE here, so the second disjunct
     * never reaches rn2(4) and the body returns 0 with no draw. */
    if (((badclass || badalign) && self_willed) || badalign)
        return false;

    /* C artifact.c:962-971 — the pline arms are `if (yours)` only. */
    if (badclass && badalign && self_willed)
        return false;

    return true; /* C artifact.c:973 */
}

/* C ref: artifact.c:992-1005 bane_applies(oart, mon).  C copies the artilist
 * entry and masks its spfx down to SPFX_DBONUS before asking spec_applies, so
 * spec_applies' SPFX_ATTK arm — the only arm that can draw rn2(100) — is
 * unreachable from here BY CONSTRUCTION, and so is its `!(spfx & (DBONUS|ATTK))`
 * early-out (DBONUS is non-zero or we never got here).  What remains is
 * artifact.c:1020-1034, five pure struct reads. */
function bane_applies_mk(arti, mtmp) {
    const oart = ARTI_PROPS[arti];
    if (!oart || (oart.spfx & SPFX_DBONUS_MK) === 0)
        return false;
    const spfx = oart.spfx & SPFX_DBONUS_MK;   /* C: atmp.spfx &= SPFX_DBONUS */
    const mtype = ARTILIST_MTYPE[arti] | 0;
    const ptr = mtmp.data;
    /* C artifact.c:1020-1034, with `yours` FALSE throughout. */
    if (spfx & SPFX_DMONS_MK)
        return ((mtmp.data?.pmidx ?? mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0) === mtype;
    if (spfx & SPFX_DCLAS_MK)
        return mtype === (ptr.mlet | 0);
    if (spfx & SPFX_DFLAG1_MK)
        return ((ptr.mflags1 | 0) & mtype) !== 0;
    if (spfx & SPFX_DFLAG2_MK)
        return ((ptr.mflags2 | 0) & mtype) !== 0;
    if (spfx & SPFX_DALIGN_MK) {
        const ma = ptr.maligntyp | 0;
        return (ma === A_NONE_MK) || (Math.sign(ma) !== artifact_alignment(arti));
    }
    return false;
}

export function canseemon_unported(m) { return canseemon(m); }
export function pline_mon_unported(m, fmt, ...args) {
    return pline_mon(m, fmt, ...args);
}
export function Monnam_unported(m) { return Monnam_wm(m); }
/* C do_name.c:1367 Monnam(mon) — upstart(mon_nam(mon)).  mon_nam lives in
 * js/uhitm.js, from which this file already imports m_at, so the edge exists;
 * js/mcastu.js's Monnam is not importable here because mcastu imports
 * wake_nearto FROM this file. */
function Monnam_wm(mon) {
    return Monnam(mon);
}








/* wizard.c:494 — route the rare Erinys aggravation path to the canonical body. */
export function aggravate_stub() { return aggravate_real(); }








function m_poisongas_ok_resists_poison(mon) {
    const rbits = (mon.data.mresists | 0) | (mon.mextrinsics | 0) | (mon.mintrinsics | 0);
    return (rbits & 0x20 /* MR_POISON */) !== 0;
}



export { can_hide_under_obj };











export const OC_MERGE = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,  // [0-19]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1,  // [20-39]
    1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [40-59]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [60-79]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [80-99]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [100-119]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [120-139]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [140-159]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [160-179]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [180-199]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [200-219]
    0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [220-239]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [240-259]
    0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [260-279]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [280-299]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [300-319]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [320-339]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [340-359]
    1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [360-379]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [380-399]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [400-419]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,  // [420-439]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [440-459]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 1,  // [460-479]
    1, 0,  // [480-481]
]);
/* C objclass.h — oc_uses_known bitfield for each object type */
export const OC_USES_KNOWN = new Uint8Array([
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1,  // [0-19]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [20-39]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [40-59]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [60-79]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [80-99]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [100-119]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [120-139]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [140-159]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0,  // [160-179]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [180-199]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 0,  // [200-219]
    1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0,  // [220-239]
    1, 0, 1, 0, 0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 1, 1,  // [240-259]
    1, 1, 1, 1, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [260-279]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0,  // [280-299]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [300-319]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [320-339]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [340-359]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [360-379]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [380-399]
    0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,  // [400-419]
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0, 0,  // [420-439]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [440-459]
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,  // [460-479]
    0, 0,  // [480-481]
]);









/* constant: ONAME_NO_FLAGS */
const ONAME_NO_FLAGS = 0;

/* C worn.c:1376-1417 extract_from_minvent — canonical port exported from worn.js */
export { extract_from_minvent };

/* obfree: the local throwing stub that stood here shadowed js/dokick.js's
 * real body (C shk.c:1186-1272) for discard_minvent() above.  Imported at
 * :145 instead. */







/* mkobj.c:458-503 splitobj — imported from js/mkobj.js (line 61); the 
 * mklev.js export list above re-exports it. */

/* Stub: vegan — not yet ported (macro) */
/* C mondata.h:231-238 — #define vegan(ptr).  C's `(ptr) != &mons[PM_X]` tests
 * are pointer identity against the mons[] row; this port's permonst objects are
 * built fresh per call by permonstTemplate(), so the equivalent test is on the
 * row index it carries (`pmidx`).
 *
 * defsym.h MONSYM ordinals: BLOB 2, JELLY 10, VORTEX 22, LIGHT 25,
 * ELEMENTAL 31, FUNGUS 32, PUDDING 42, GHOST 54, GOLEM 55. */
const S_BLOB_MD = 2, S_JELLY_MD = 10, S_VORTEX_MD = 22, S_LIGHT_MD = 25,
      S_ELEMENTAL_MD = 31, S_FUNGUS_MD = 32, S_PUDDING_MD = 42,
      S_GHOST_MD = 54, S_GOLEM_MD = 55;
const PM_STALKER_MD = 153, PM_BLACK_PUDDING_MD = 209,
      PM_LEATHER_GOLEM_MD = 253, PM_FLESH_GOLEM_MD = 255, PM_SHADE_MD = 288;

function vegan(ptr) {
    if (!ptr)
        return false;
    const mlet = ptr.mlet | 0, idx = ptr.pmidx | 0;
    /* C mondata.h noncorporeal(ptr): mlet == S_GHOST || ptr == &mons[PM_SHADE] */
    const noncorporeal = (mlet === S_GHOST_MD) || (idx === PM_SHADE_MD);
    return mlet === S_BLOB_MD || mlet === S_JELLY_MD
        || mlet === S_FUNGUS_MD || mlet === S_VORTEX_MD
        || mlet === S_LIGHT_MD
        || (mlet === S_ELEMENTAL_MD && idx !== PM_STALKER_MD)
        || (mlet === S_GOLEM_MD && idx !== PM_FLESH_GOLEM_MD
            && idx !== PM_LEATHER_GOLEM_MD)
        || noncorporeal;
}

/* C mondata.h:239-241 — #define vegetarian(ptr) */
export function vegetarian(ptr) {
    if (!ptr)
        return false;
    return vegan(ptr)
        || ((ptr.mlet | 0) === S_PUDDING_MD
            && (ptr.pmidx | 0) !== PM_BLACK_PUDDING_MD);
}






/* C ref: pline.c:435-452 You_hear — imported from js/display.js, which is this
 * port's pline.c.  It was `throw new Error('not yet ported: You_hear')`, and
 * the three call sites above (:13921 "a slurping sound.", :13937 "%s slurping
 * sound%s.", :14000 "a masticating sound.") are all on m_consume_obj's live
 * path, so any one of them ENDED the replay. */

/* distant_name: the local throwing stub that stood here SHADOWED
 * js/objnam.js's real body (objnam.c:347-408) for meatobj()'s two call sites
 * and meatcorpse()'s one.  Deleted; those three now call distant_name_nc,
 * the alias this file already imports at :143 and already uses at :15922 and
 * :16679.  The side effect the shadow deleted is the whole point of the
 * function: C brackets the FAR branch with ++gd.distantname / --gd.distantname
 * (objnam.c:401-403), which xname() reads to suppress setting obj->dknown,
 * so formatting a distant object through the raw formatter marks it
 * identified forever. */





export function resists_ston(mtmp) {
    return Resists_Elem(mtmp, STONE_RES);
}

export function resists_poison(mtmp) {
    if (!mtmp)
        return false;
    const data = mtmp.data
        || ((mtmp.mnum ?? mtmp.pmidx) != null
            ? permonstTemplate((mtmp.mnum ?? mtmp.pmidx) | 0) : null);
    const rbits = ((data ? (data.mresists | 0) : 0)
                   | (mtmp.mextrinsics | 0) | (mtmp.mintrinsics | 0));
    return (rbits & 0x20 /* MR_POISON, monflag.h:66 */) !== 0;
}

/* C mon.c:1372 — mstoning(obj) is true for food whose monster corpse
 * petrifies.  Keep the corpsenm validity check separate from the predicate,
 * matching C's `ofood(obj) && ismnum(obj->corpsenm)` short-circuit. */
function ofood(otmp) {
    return !!otmp && ((otmp.otyp | 0) === CORPSE
        || (otmp.otyp | 0) === EGG || (otmp.otyp | 0) === TIN);
}


/* C obj.h:321-324 — food that can trigger a monster polymorph. */
const AD_POLY = 43;
export function polyfood(otmp) {
    if (!ofood(otmp) || (otmp.corpsenm | 0) < LOW_PM)
        return false;
    const cm = pm_to_cham(otmp.corpsenm | 0);
    if ((cm | 0) !== NON_PM)
        return true;
    const data = permonstTemplate(otmp.corpsenm | 0);
    return !!dmgtype_fromattack(data, AD_POLY, -1);
}

/* C mondata.h:75 — exact species exceptions for green-slime attacks. */
export function slimeproof(data) {
    if (!data)
        return false;
    const pm = data.pmidx ?? data.mnum ?? data.mndx;
    return (pm | 0) === PM_GREEN_SLIME
        || (pm | 0) === PM_FIRE_VORTEX
        || (pm | 0) === PM_FLAMING_SPHERE
        || (pm | 0) === PM_FIRE_ELEMENTAL
        || (pm | 0) === PM_SALAMANDER
        || (data.mlet | 0) === S_GHOST_MV;
}

/* doname: likewise deleted.  Its only references in this file were as the
 * `func` argument of the three distant_name() calls above; with those moved
 * to doname_nc (js/objnam.js, imported at :143) it had no caller left. */

const MPICKOBJ_AT_ENGL = 11; /* monattk.h:22 — engulf */
const MPICKOBJ_OBJ_MINVENT = 4; /* obj.h — OBJ_MINVENT */
function Has_contents(o) { return !!o.cobj; }

/* C ref: nethack-c-v5/upstream/src/light.c:761-772
 *   obj_sheds_light(obj) → obj_is_burning(obj)
 *                        → obj->lamplit && (ignitable(obj) || artifact_light(obj))
 * The `lamplit` conjunct is first and short-circuits.  The lamplit arm used to
 * throw UNPORTED-CALLEE because "neither of which is ported"; artifact_light IS
 * ported now (js/light.js, landed with begin_burn) and ignitable is obj.h's
 * otyp macro, so the predicate is answerable in full.  otyps from
 * js/oc_name_data.js OC_NAME; BRASS_LANTERN/OIL_LAMP/MAGIC_LAMP are already
 * declared at the head of this file. */
const OSL_TALLOW_CANDLE = 224, OSL_WAX_CANDLE = 225, OSL_CANDELABRUM = 262,
      OSL_POT_OIL = 321;
/* C obj.h:429-433 ignitable(otmp). */
function ignitable_mp(obj) {
    const t = obj.otyp | 0;
    return t === BRASS_LANTERN || t === OIL_LAMP
        || (t === MAGIC_LAMP && (obj.spe | 0) > 0)
        || t === OSL_CANDELABRUM || t === OSL_TALLOW_CANDLE
        || t === OSL_WAX_CANDLE || t === OSL_POT_OIL;
}
function obj_sheds_light_mp(obj) {
    if (!obj.lamplit)
        return false;
    return ignitable_mp(obj) || artifact_light(obj);
}


function _Blind_mk() {
    const u = game.u;
    if (!u) return false;
    const bp = u.uprops && u.uprops[MK_BLINDED];
    return !!bp && !!((bp.intrinsic | 0) || (bp.extrinsic | 0))
            && !(bp.blocked | 0);
}
function _Hallucination_mk() {
    const u = game.u;
    if (!u) return false;
    const hh = (u.uprops && u.uprops[MK_HALLUC]) ? (u.uprops[MK_HALLUC].intrinsic | 0) : 0;
    const hr = u.uprops && u.uprops[MK_HALLUC_RES];
    const res = ((hr?.intrinsic | 0) || (hr?.extrinsic | 0));
    return !!hh && !res;
}

/* C ref: nethack-c/include/youprop.h — Blind is a compound macro; here only
 * the u.uprops[BLINDED] half plus the creamed-eyes counter are needed, and the
 * mpickobj call site is already guarded by obj_sheds_light. */
function Blind_mp() {
    const p = game.u?.uprops?.[MK_BLINDED];
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}

function _ofield(o, name) {
    return (o && Object.hasOwn(o, name)) ? o[name] : 0;
}




/* C ref: pline.c:435-452 pline_mon(mtmp, line, ...) —
 *     if (mtmp == &gy.youmonst) set_msg_xy(0, 0); else set_msg_xy(mx, my);
 *     vpline(line, the_args);
 * i.e. a message-origin coordinate (js/cmd.js:33561's set_msg_xy is a
 * documented no-op: this port has no message-colour channel) followed by an
 * ordinary pline.  js/display.js's pline already does the printf expansion via
 * nh_sprintf, so the varargs must be FORWARDED — the sibling shims in
 * js/dig.js:903 and js/mcastu.js:271 drop them and would print a literal
 * "%s gets angry!".
 *
 * This was `throw new Error('not yet ported: pline_mon')`, reached the moment
 * setmangry() (:15332) angers a peaceful humanoid.  See the Monnam note above:
 * the two throws sat on the same line of the same C statement. */


/* pline() is NOT redefined here.  C ref: pline.c:113 pline() — one function,
 * one body.  The real port lives in js/display.js (the tty topline composer)
 * and is imported at the top of this file; the local throw-stub that used to
 * sit here shadowed it for every pline() call in this module. */





/* C ref: mklev.c:2046 mktrap — general trap placement entry (num, flags, croom, tm).
   Reuses existing maketrap, mktrap_room, mktrap_victim. */
let mktrap_err = 0; // C mklev.c:2036: diagnostic only on the first invalid call.
registerStaticReset('mklev.mktrap_err', () => { mktrap_err = 0; });
export async function mktrap(num, mktrapflags, croom, tm) {
    const lvl = level_difficulty();
    /* C mklev.c:2055-2066 — argument-validation paniclog path; non-fatal */
    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG)) {
        if (!mktrap_err++)
            paniclog('mktrap', `args (${num},${mktrapflags},null room,null location) are invalid`);
        return;
    }
    
    /* C mklev.c:2069 — no traps in pools */
    if (tm && is_pool_or_lava(tm.x, tm.y))
        return;
    
    let kind;
    if (num > NO_TRAP && num < TRAPNUM) {
        kind = num;
    } else if (Is_rogue_level(game.u?.uz)) {
        kind = traptype_roguelvl();
    } else if (Inhell() && !rn2(5)) {
        kind = FIRE_TRAP;
    } else {
        do {
            kind = traptype_rnd(mktrapflags);
        } while (kind === NO_TRAP);
    }
    
    if (is_hole(kind) && !Can_fall_thru(game.u?.uz))
        kind = ROCKTRAP;
    
    let m = { x: 0, y: 0 };
    if (tm) {
        m.x = tm.x;
        m.y = tm.y;
    } else {
        let tryct = 0;
        const avoid_boulder = (is_pit(kind) || is_hole(kind));
        do {
            if (++tryct > 200)
                return;
            if (mktrapflags & MKTRAP_MAZEFLAG) {
                mazexy(m);
            } else if (croom && !somexyspace(croom, m))
                return;
        } while (occupied(m.x, m.y)
                 || (avoid_boulder && sobj_at(BOULDER, m.x, m.y)));
    }
    
    const trap = await maketrap(m.x, m.y, kind);
    kind = trap ? trap.ttyp : NO_TRAP;
    
    /* C mklev.c:2114-2115 — WEB trap always spawns a giant spider */
    if (kind === WEB && !(mktrapflags & MKTRAP_NOSPIDERONWEB))
        await makemon(PM_GIANT_SPIDER, m.x, m.y, 0 /* NO_MM_FLAGS */);
    
    if (trap && (mktrapflags & MKTRAP_SEEN))
        trap.tseen = true;
    
    /* C mklev.c:2118-2120 — MAGIC_PORTAL destination from u.ucamefrom */
    if (kind === MAGIC_PORTAL && (game.u?.ucamefrom?.dnum || game.u?.ucamefrom?.dlevel)) {
        trap.dst.dnum = game.u.ucamefrom.dnum;
        trap.dst.dlevel = game.u.ucamefrom.dlevel;
    }
    
    if (game.in_mklev
        && kind !== NO_TRAP && !(mktrapflags & MKTRAP_NOVICTIM)
        && lvl <= rnd(4)
        && kind !== SQKY_BOARD && kind !== RUST_TRAP
        && !(kind === ROLLING_BOULDER_TRAP
             && trap.launch?.x === trap.tx && trap.launch?.y === trap.ty)
        && !is_pit(kind) && (kind < HOLE || kind === MAGIC_TRAP)) {
        if (kind === LANDMINE) {
            trap.ttyp = PIT;
            trap.tseen = true;
        }
        await mktrap_victim(trap);
    }
}





/* C mon.c:3144-3162 (mondead): a dead Kop may come back.
 *     switch (rnd(5)) {
 *     case 1: if (stway) { makemon(data, stway->sx, stway->sy, 0); break; }
 *             FALLTHRU
 *     case 2: makemon(data, 0, 0, 0); break;
 *     default: break; }
 * stway = stairway_find_type_dir(FALSE, FALSE) (stairs.c:88-95, a down
 * staircase), looked up before the roll. */
export async function kop_revival(mtmp) {
    if ((mtmp.data?.mlet ?? -1) !== S_KOP)
        return;
    let stway = null;
    for (let t = game.stairs; t; t = t.next)
        if (!t.isladder && !t.up) { stway = t; break; }
    const data = mtmp.data;
    switch (rnd(5)) {
    case 1:
        if (stway) {
            await makemon(data, stway.sx, stway.sy, 0);
            break;
        }
        /* FALLTHRU */
    case 2:
        await makemon(data, 0, 0, 0);
        break;
    default:
        break;
    }
}

/* C mon.c:2997-3067 logdeadmon(): every death path records the first
 * Medusa defeat, after unshapeshifting and incrementing mvitals[].died, else
 * livelogs a unique or shopkeeper kill.  livelog_mon_nam (mon.c:2991-2992) is
 * x_monnam(EXACT_NAME, hack.h 0x1F; const.js has it wrong): SUPPRESS_HALLUCINATION keeps x_monnam off rndmonnam,
 * but shkname() still tests Hallucination itself (shknam.c:873-890), so a
 * hallucinating hero's shopkeeper kill draws rn2(num) + rn2(names) here. */
export function record_death_achievement(mndx, mtmp) {
    let howmany = game.mvitals?.[mndx]?.died | 0;

    if (mndx === PM_MEDUSA && howmany === 1) {
        record_achievement(ACH_MEDU);
    } else if (mtmp
               && ((((mtmp.data?.geno | 0) & 0x1000 /* G_UNIQ */)
                    && (mndx !== PM_HIGH_CLERIC || !mtmp.mrevived))
                   || (mtmp.isshk && !mtmp.mrevived))) {
        let shkdetail = '';
        const herodidit = !game.context?.mon_moving;

        if (mtmp.isshk) {
            howmany = 1;
            shkdetail = `, the ${shtype_name((mtmp.mextra?.eshk?.shoptype | 0) - SHOPBASE)} `
                + `${mtmp.female ? 'proprietrix' : 'proprietor'}${herodidit ? '' : ','}`;
        } else if (mndx === PM_HIGH_CLERIC) {
            howmany = 1;
        }
        if (howmany <= 3 || howmany === 5 || howmany === 10 || howmany === 25
            || (howmany % 50) === 0) {
            let xtra = '';
            let llevent_type = LL_UMONST;

            if (howmany === 1 || mtmp.iswiz || is_rider_pm(mndx))
                llevent_type |= LL_ACHIEVE;
            if (howmany > 1)
                xtra = ` (${howmany}${logdeadmon_ordin(howmany)} time)`;
            const mkilled = lifesave_nonliving(mtmp.data) ? 'destroyed' : 'killed';
            if (herodidit)
                livelog_printf(llevent_type, '%s %s%s%s', mkilled,
                               x_monnam(mtmp, ARTICLE_THE, null, 0x1F /* hack.h EXACT_NAME */, false),
                               shkdetail, xtra);
            else
                livelog_printf(llevent_type, '%s%s has been %s%s',
                               x_monnam(mtmp, ARTICLE_THE, null, 0x1F /* hack.h EXACT_NAME */, false),
                               shkdetail, mkilled, xtra);
        }
    }
}



/* C obj.h:79 OBJ_MINVENT == 4 (js/const.js:1118; this file's own const.js
 * import line does not carry it and is long enough already). */
const OBJ_MINVENT_MD = 4;

/* C steal.c:812-846 mdrop_obj(mon, obj, verbosely) — "drop one object taken
 * from a (possibly dead) monster's inventory". */
export async function mdrop_obj_md(mon, obj, verbosely) {
    const omx = mon.mx | 0, omy = mon.my | 0;
    const unwornmask = obj.owornmask | 0;
    obj.where = OBJ_MINVENT_MD;
    obj.ocarry = mon;
    const obj_name = await distant_name_nc(obj, doname_nc);

    /* C steal.c:825 extract_from_minvent(mon, obj, FALSE, TRUE).  The real port
     * is js/trap.js:7988 (worn.c:1377); this file's same-named export at :14900
     * is a throwing stub, hence the alias on the import. */
    await extract_from_minvent(mon, obj, false, true);
    /* C steal.c:826-833, the saddle arm:
     *     if (unwornmask && mon->mtame && (unwornmask & W_SADDLE) != 0L
     *         && !obj->unpaid && costly_spot(omx, omy)
     *         && strchr(in_rooms(u.ux, u.uy, SHOPBASE), levl[omx][omy].roomno))
     *         obj->no_charge = 1;
     * costly_spot() is js/shk.js's and in_rooms() returns the room numbers as
     * an array, so strchr() becomes includes().  The arm needs a TAME SADDLED
     * steed dying inside a shop the hero is standing in; it sets a
     * shop-billing flag and draws nothing. */
    if (unwornmask && mon.mtame && (unwornmask & W_SADDLE) !== 0
        && !obj.unpaid && costly_spot(omx, omy)
        && in_rooms(game.u.ux, game.u.uy, SHOPBASE)
            .includes(game.level?.locations?.[omx]?.[omy]?.roomno | 0))
        obj.no_charge = 1;
    /* C steal.c:835-836.  verbosely is (is_pet && flags.verbose) at the relobj
     * call site, and m_detach passes is_pet FALSE, so this never fires on the
     * path relobj_md() opens — kept because it is what makes the
     * distant_name() call above C's and not an invention. */
    if (verbosely && cansee(omx, omy))
        await pline_mon(mon, "%s drops %s.", Monnam(mon), obj_name);
    /* C steal.c:837-843.  obj_no_longer_held(obj) is done by place_object(),
     * as C's own comment at steal.c:834 says. */
    const _floorConsumed = await flooreffects(obj, omx, omy, "fall");
    if (!_floorConsumed) {
        await obj_no_longer_held(obj); /* C mkobj.c:2330 via place_object */
        place_object(obj, omx, omy);
        await stackobj(obj);
    }
    if ((mon.mhp | 0) >= 1 && unwornmask)
        await update_mon_extrinsics_md(mon, obj, false, true);
}

/* C steal.c:874-899 relobj(mtmp, show, is_pet) — "release the objects the
 * creature is carrying".  m_detach's call is relobj(mtmp, 1, FALSE), so show is
 * 1 and is_pet is FALSE; both are baked in here rather than carried as dead
 * parameters, the same specialisation js/dogmove.js's relobj_dead_dm makes. */
export async function relobj_md(mtmp) {
    const omx = mtmp.mx | 0, omy = mtmp.my | 0;

    /* C steal.c:882-889 — vault guard gold is removed rather than dropped. */
    if (mtmp.isgd) {
        const gold = findgold(mtmp.minvent);
        if (gold) {
            await extract_from_minvent(mtmp, gold, true, true);
            await obfree(gold, null);
        }
    }

    /* C steal.c:891-893:
     *     while ((otmp = (is_pet ? droppables(mtmp) : mtmp->minvent)) != 0)
     *         mdrop_obj(mtmp, otmp, is_pet && flags.verbose);
     * is_pet is FALSE, so the droppables() filter that lets a LIVE pet keep its
     * wielded and worn gear does not apply and the entire chain goes.  What
     * terminates the loop is mdrop_obj_md()'s extract_from_minvent(), which
     * unlinks the head each pass. */
    let otmp;
    while ((otmp = mtmp.minvent) != null)
        await mdrop_obj_md(mtmp, otmp, false);

    /* C steal.c:895-896 — show && cansee(omx, omy) -> newsym(omx, omy).  This
     * is the repaint that paints the dropped pile; it is a SECOND newsym, after
     * mon_leaving_level's, and C runs both in that order. */
    if (cansee(omx, omy))
        newsym(omx, omy);
}


/* C monsters.h indices (pm.generated.js) used by the newcham chain. Suffixed
 * _NC to stay clear of this file's existing PM_ and M-flag locals. */
const SPECIAL_PM_NC = monsPack.special_pm | 0;
const PM_WOLF_NC = 20;
const PM_FOG_CLOUD_NC = 106;
const PM_VAMPIRE_BAT_NC = 129;
const PM_VAMPIRE_NC = 226;
const PM_VAMPIRE_LEADER_NC = 227;
const PM_VLAD_THE_IMPALER_NC = 228;
const PM_DOPPELGANGER_NC = 270;
const PM_ARCHEOLOGIST_NC = 331;
const PM_WIZARD_NC = 343;
/* select_newcham_form()'s doppelganger arm: the quest-guardian block runs
 * [PM_STUDENT, PM_APPRENTICE] and the two difficulty caps read mons[].difficulty
 * of Archon (26) and jabberwock (18).  Verified by name against
 * js/makemon_pmnames.json rather than taken from js/pm.generated.js, which is
 * still spelled with 3.7 monster names. */
const PM_ARCHON_NC = 125;
/* C monflag.h G_HELL / G_NOHELL — the geno-word "only in / never in Gehennom"
 * bits pick_nasty() filters on.  js/makemon.js holds the same two values but
 * does not export them. */
const G_HELL_NC = 0x0400;
const G_NOHELL_NC = 0x0800;
const G_NOGEN_NC = 0x0200;
const G_UNIQ_NC = 0x1000;
const G_FREQ_NC = 0x0007;
const S_LICH_NC = S_LICH;

function is_mplayer_nc(mndx) {
    return mndx >= PM_ARCHEOLOGIST_NC && mndx <= PM_WIZARD_NC;
}
function is_shapeshifter_nc(ptr) { return ((ptr.mflags2 | 0) & M2_SHAPESHIFTER) !== 0; }
function is_vampire_nc(ptr) { return (ptr.mlet | 0) === S_VAMPIRE; }
function is_vampshifter_nc(mon) {
    const c = mon.cham | 0;
    return c === PM_VAMPIRE_NC || c === PM_VAMPIRE_LEADER_NC
        || c === PM_VLAD_THE_IMPALER_NC;
}
function mvitals_genod_nc(mndx) {
    return ((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD) !== 0;
}
/* C mondata.c monsym(ptr) → def_monsyms[ptr->mlet].sym; the rogue-level retries
 * only ask "is it uppercase".  js/sp_lev.js:3693 holds the same defsym.h table
 * but neither it nor its monsym() is exported, so mirror the uppercase test
 * here per this file's existing "duplicate trivial predicate" convention. */
const MONSYM_CHARS_NC = [
    undefined,
    'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j',
    'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't',
    'u', 'v', 'w', 'x', 'y', 'z', 'A', 'B', 'C', 'D',
    'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N',
    'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X',
    'Y', 'Z', '@', ' ', "'", '&', ';', ':', '~', ']',
];
function monsym_isupper_nc(mndx) {
    const s = MONSYM_CHARS_NC[MONS_ROWS[mndx]?.[0] | 0];
    return typeof s === 'string' && s >= 'A' && s <= 'Z';
}

/* C mcastu.c mon_has_special(mtmp) — exported from js/mcastu.js, but that module
 * already imports this one, so mirror the minvent walk rather than close the
 * import cycle. */
function mon_has_special_nc(mtmp) {
    const AMULET_OF_YENDOR = 213, BELL_OF_OPENING = 263,
          CANDELABRUM_OF_INVOCATION = 262, SPE_BOOK_OF_THE_DEAD = 409;
    for (let otmp = mtmp.minvent; otmp; otmp = otmp.nobj)
        if (otmp.otyp === AMULET_OF_YENDOR || otmp.oartifact >= 21 /* any_quest_artifact, obj.h:271 */
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}

/* C youprop.h:355-360 Protection_from_shape_changers. */
function Protection_from_shape_changers_nc() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0));
}














/* C makemon.c:1983 mkclass_poly(class) — like mkclass() but ignores alignment and
 * only skips G_NOGEN|G_UNIQ/genocided/hell-ness; monpolycontrol's class pick. */
export function mkclass_poly_nc(cls) {
    let first, last, num = 0;
    for (first = LOW_PM; first < SPECIAL_PM_NC; first++)
        if ((MONS_ROWS[first][0] | 0) === cls)
            break;
    if (first === SPECIAL_PM_NC)
        return NON_PM;
    let gmask = G_NOGEN_NC | G_UNIQ_NC; /* C makemon.c:1994 */
    if (rn2(9) || cls === S_LICH_NC /* C makemon.c:1997 */)
        gmask |= (Inhell() ? G_NOHELL_NC : G_HELL_NC);
    const ok = (m) => !mvitals_genod_nc(m) && ((MONS_ROWS[m][3] | 0) & gmask) === 0;
    for (last = first; last < SPECIAL_PM_NC && (MONS_ROWS[last][0] | 0) === cls; last++)
        if (ok(last))
            num += (MONS_ROWS[last][3] | 0) & G_FREQ_NC; /* C makemon.c:2002 */
    if (!num)
        return NON_PM;
    for (num = rnd(num); num > 0; first++)
        if (ok(first))
            num -= (MONS_ROWS[first][3] | 0) & G_FREQ_NC; /* C makemon.c:2002 */
    first--;
    return first;
}

/* C mon.c:5026 validvamp(mon, &mndx, monclass) — returns [ok, mndx]. */
export function validvamp_nc(mon, mndx, monclass) {
    if (!is_vampshifter_nc(mon))
        return [validspecmon(mon, mndx), mndx];
    if ((mon.cham | 0) === PM_VLAD_THE_IMPALER_NC && mon_has_special_nc(mon))
        return [true, PM_VLAD_THE_IMPALER_NC];
    if (ismnum(mndx) && is_shapeshifter_nc(permonstTemplate(mndx)))
        return [true, mon.cham | 0];
    if (mndx === PM_WOLF_NC)
        return [(mon.cham | 0) !== PM_VAMPIRE_NC, mndx];
    if (mndx === PM_FOG_CLOUD_NC || mndx === PM_VAMPIRE_BAT_NC)
        return [true, mndx];
    switch (monclass) {
    case S_VAMPIRE: mndx = mon.cham | 0; break;
    case S_BAT: mndx = PM_VAMPIRE_BAT_NC; break;
    case S_VORTEX: mndx = PM_FOG_CLOUD_NC; break;
    case S_DOG:
        if ((mon.cham | 0) !== PM_VAMPIRE_NC) { mndx = PM_WOLF_NC; break; }
        mndx = NON_PM; break;
    default: mndx = NON_PM; break;
    }
    return [mndx !== NON_PM, mndx];
}





/* C monst.h:210-211 MON_WEP(mon) == mon->mw, MON_NOWEP(mon) == (mon->mw = 0).
 * js/uhitm.js:6064 is what writes the slot (mon_wield_item) and js/uhitm.js:5445
 * setmnotwielded is what clears it; this is the read. */
function MON_WEP_nc(mon) { return mon.mw || null; }



export async function mselftouch_nc(mon, arg, byplayer) {
    const mwep = MON_WEP_nc(mon);

    if (mwep && (mwep.otyp | 0) === CORPSE
        && ((mwep.corpsenm | 0) === PM_COCKATRICE
            || (mwep.corpsenm | 0) === PM_CHICKATRICE)
        && !Resists_Elem(mon, STONE_RES)) {
        if (cansee(mon.mx, mon.my))
            await pline_mon(mon, '%s%s touches %s.', arg || '', arg ? mon_nam_wm(mon) : Monnam(mon),
                        corpse_xname_rc(mwep, null, 4 /* CXN_PFX_THE */));
        await minstapetrify(mon, byplayer);
        if (mon.mhp > 0 && !which_armor(mon, W_ARMG) && !Resists_Elem(mon, STONE_RES))
            mwepgone(mon);
    }
}










export async function clone_mon_ml(mon, x, y) {
    const G_EXTINCT_BIT = 0x01;
    const mndx = (mon.data?.pmidx ?? mon.mndx ?? mon.mnum ?? -1) | 0;
    if ((mon.mhp | 0) <= 1
        || (((game.mvitals?.[mndx]?.mvflags | 0) & G_EXTINCT_BIT) !== 0))
        return null;
    let mm = x === 0 ? { x: mon.mx | 0, y: mon.my | 0 } : { x, y };
    if (!isok(mm.x, mm.y))
        return null;
    if (m_at(mm.x, mm.y)) {
        const cc = enexto_out(mm.x, mm.y, mon.data);
        if (!cc || m_at(cc.x, cc.y))
            return null;
        mm = cc;
    }
    const m2 = { ...mon };
    m2.mextra = null;
    m2.nmon = game.fmon;
    game.fmon = m2;
    m2.m_id = next_ident();
    m2.mx = mm.x;
    m2.my = mm.y;
    m2.mundetected = 0;
    m2.mtrapped = 0;
    m2.mcloned = 1;
    m2.minvent = null;
    m2.mleashed = 0;
    m2.mhpmax = mon.mhpmax;
    m2.mhp = Math.trunc((mon.mhp | 0) / 2);
    mon.mhp = (mon.mhp | 0) - m2.mhp;
    m2.isshk = 0;
    m2.isgd = 0;
    m2.ispriest = 0;
    mon_track_clear(m2);
    place_monster(m2, m2.mx, m2.my); /* C makemon.c:898 */
    if (emits_light(m2.data))
        new_light_source(m2.mx, m2.my, emits_light(m2.data), LS_MONSTER,
                         monst_to_any(m2));
    if (mon.mextra?.mgivenname)
        christen_monst(m2, mon.mextra.mgivenname);
    else if (mon.isshk)
        christen_monst(m2, shkname(mon)); /* C makemon.c:905-906 */
    if (!game.context?.mon_moving && mon.mpeaceful) {
        const luck = game.u?.uluck | 0;
        if (mon.mtame)
            m2.mtame = rn2(Math.max(2 + luck, 2)) ? mon.mtame : 0;
        else
            m2.mpeaceful = rn2(Math.max(2 + luck, 2)) ? 1 : 0;
    }
    /* C makemon.c:921-947 — isminion takes precedence over mtame. */
    if (m2.isminion) {
        newemin(m2);
        Object.assign(m2.mextra.emin, mon.mextra.emin);
        const atyp = m2.mextra.emin.min_align | 0;
        m2.mextra.emin.renegade = ((atyp !== ((game.u?.ualign?.type) | 0)) ? 1 : 0)
            ^ (m2.mpeaceful ? 0 : 1);
    } else if (m2.mtame) {
        /* m2 is a copy of mon, tame but not init'ed; tamedog() will not re-tame
           a tame dog, so make it non-tame to get initialized properly. */
        m2.mtame = 0;
        if (await tamedog_mk(m2, null, false)) {
            Object.assign(m2.mextra.edog, mon.mextra.edog);
            m2.mextra.edog.ogoal = { ...mon.mextra.edog.ogoal }; /* by-value struct copy */
        }
    }
    set_malign(m2);
    newsym(m2.mx, m2.my);
    return m2;
}

/* C ref: potion.c:2873 split_mon(mon, mtmp).  Clone a gremlin or mold;
 * current and maximum HP are halved, with the odd point staying. */
export async function split_mon_ml(mon, mtmp) {
    // C potion.c:2881-2884: a non-null attacker supplies the heat's source.
    const reason = mtmp
        ? ` from ${mtmp === game.youmonst ? 'your' : lifesave_s_suffix(mon_nam_wm(mtmp))} heat`
        : '';
    if (is_youmonst(mon)) {
        const u = game.u;
        if (u.mh > u.mhmax) u.mh = u.mhmax;
        const m2 = u.mh > 1 ? await cloneu() : null;
        if (m2) {
            m2.mhpmax = Math.trunc(u.mhmax / 2);
            u.mhmax -= m2.mhpmax;
            // cloneu has already requested the status redraw.
            await You(`multiply${reason}!`); /* C potion.c:2894 You() */
        }
        return m2;
    }
    if ((mon.mhp | 0) > (mon.mhpmax | 0))
        mon.mhp = mon.mhpmax | 0;
    const m2 = (mon.mhp | 0) > 1 ? await clone_mon_ml(mon, 0, 0) : null;
    if (m2) {
        m2.mhpmax = Math.trunc((mon.mhpmax | 0) / 2);
        mon.mhpmax = (mon.mhpmax | 0) - m2.mhpmax;
        if (canspotmon(mon))
            await pline(`${Monnam_wm(mon)} multiplies${reason}!`);
    }
    return m2;
}

const MR_FIRE_ML = 0x01;          /* C monflag.h */




// ───────────────────────────────────────────────────────────────────────
// keystone-spec-movemon-mfndpos.md. Small direct/transitive C callees are
// ported inline below (charter_digest) rather than stubbed-and-thrown;
// documented at its definition instead of silently faked. Two carve-outs
// are load-bearing and shared with should_displace (already landed):
//   - MON_AT(nx,ny) is always "no other monster here" on replay — the
//     m_at() reading the never-populated game.fmon chain gives this for
//     free without a special case. Target: ~491/500 (98.2%), not 500/500.
//     which makes the poison-gas skip branch (mon.c:2228-2231)
//     unconditionally false regardless of m_poisongas_ok's true value —
//     computing that predicate faithfully would be moot, so it isn't.
// ───────────────────────────────────────────────────────────────────────

const M1_MINDLESS_MV = 0x00010000;
const M2_ROCKTHROW_MV = 0x08000000;

const S_GHOST_MV = 54;



// mondata.h predicates — all take the reconstructed permonst-like object
// (mon.data: pmidx/mlet/mflags1/mflags2/msize, from permonstTemplate via
// struct_reconstructor.js), matching C's `ptr->mflags1` style exactly.
function mindless_mv(ptr) { return ((ptr.mflags1 | 0) & M1_MINDLESS_MV) !== 0; }
function throws_rocks_mv(ptr) { return ((ptr.mflags2 | 0) & M2_ROCKTHROW_MV) !== 0; }










// C ref: dbridge.c:62 is_lava(x,y) — LAVAPOOL/LAVAWALL only; the
// DRAWBRIDGE_UP + DB_LAVA under-mask sub-case is omitted, the same
// simplification class as is_pool_mv's DRAWBRIDGE_UP handling above (rare,
function is_lava_mv(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === LAVAPOOL || t === LAVAWALL) return true;
    return t === DRAWBRIDGE_UP
        && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_LAVA;
}

















/* C pline.c:466-481 verbalize(line, ...) — a pline wrapped in double quotes
 * (the PLINE_VERBALIZE flag is a message-colour channel this port does not
 * model). */
function verbalize_sm(line) { pline('"' + line + '"'); }










registerSpLevSomexy(somexy);
