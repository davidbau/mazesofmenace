import { Norep } from './display.js';
import { nonliving as lifesave_nonliving } from './makemon.js';
import { m_useup as lifesave_m_useup } from './trap.js';
import { discover_object as lifesave_discover_object } from './o_init.js';
import { s_suffix as lifesave_s_suffix } from './hacklib.js';
import { wary_dog } from './dog.js';
import { mondied as mondied_ml } from './makemon.js';
import { xkilled as xkilled_ml } from './uhitm.js';
import { XKILL_NOMSG } from './const.js';
import { water_damage_chain as water_damage_chain_ml } from './cmd.js';
import { hliquid as hliquid_ml } from './mhitm.js';
import { W_AMUL, HEALTHY_TIN } from './const.js';
import { may_passwall, in_town, breaktest, fire_damage_chain,
         is_mines_prize as is_mines_prize_real,
         is_soko_prize as is_soko_prize_real,
         disturb_buried_zombies } from './cmd.js';
import { mons_cnutrit } from './food_props.js';
import { unstuck as unstuck_mk, mon_leaving_level as mon_leaving_level_mk } from './dog.js';
// @ts-nocheck
// mklev.js — Level generation.
// C ref: mklev.c — makelevel, makerooms, makecorridors, generate_stairs.
// Also includes parts of sp_lev.c (create_room) and mkmap.c (litstate_rnd).
// room placement, corridors, doors, stairs, niches, and fill.
// Uses the real game PRNG (not a separate layout PRNG) for bit-exact parity.
import { game, wizard } from './gstate.js';
import { PM_PURPLE_WORM as PM_PURPLE_WORM_MK } from './pm.generated.js';
import { PM_PIRANHA, PM_ELECTRIC_EEL, PM_GREMLIN as PM_GREMLIN_ML, PM_IRON_GOLEM as PM_IRON_GOLEM_ML } from './pm.generated.js';
import { PM_GRAY_OOZE as PM_GRAY_OOZE_MK } from './pm.generated.js';
import { PM_YELLOW_DRAGON as PM_YELLOW_DRAGON_MC, PM_WHITE_UNICORN as PM_WHITE_UNICORN_MC, PM_BLACK_UNICORN as PM_BLACK_UNICORN_MC } from './pm.generated.js';
import { nexttodoor } from './mkroom.js';
import { OBJ_MINVENT } from './const.js';
import { fill_supply_chest } from './mkobj.js';
import { init_fruit_chain } from './options.js';
import { MKOBJ_OC_CLASS, MKOBJ_OC_PROB, MKOBJ_OCLASS_PROB_TOTALS, MKOBJ_SVB_BASES, } from './mkobj_data.js';
import { MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP, MKOBJ_OC_SKILL, } from './mkobj_erosion_meta.js';
import { GameMap, newobj } from './game.js';
import { rn2, rnd, rn1, rne, rnz, rnl as rnl_mc, d as d_ml, pushRngLogEntry } from './rng.js';
import { put_saddle_on_mon, place_monster } from './steed.js';
import { rndmonstAdj, rndmonnumAdj, newMonHp, assignMakemonFemale, isArmedMndx, mInitweap, mInitinv, makemonDomesticSaddle, levelDifficulty, Inhell, mkclass, mkclassAligned, peaceMinded, monGeno, permonstTemplate, dmgtype_fromattack, splitobj as splitobj_real, m_in_air, noteleport_level, newmextra, is_ndemon, is_dprince, propagate, olfaction, mon_set_minvis, set_mon_data, grow_up } from './makemon.js';
import { more_experienced } from './exper.js';
import { dng_bottom } from './trap.js';
import { big_to_little, little_to_big, mon_hates_silver, passes_bars, resist_conflict, rndghostname, christen_monst, roguename, y_monnam, locomotion, Amonnam,
/* growl: setmangry (:15355) calls C's mon.c growl() for a non-humanoid it has
 * just angered, and had NO binding for it in this module's scope — a
 * ReferenceError, not a stub.  js/shk.js also exports a `growl`; the one C
 * means here is mon.c's, which is js/mhitm.js's. */
         growl, seemimic, update_inventory } from './mhitm.js';
/* hideunder()'s "You see %s %s under %s." (C mon.c:4787-4796) */
import { ansimpleoname, ARTILIST, ARTI_NOGEN, ARTI_GEN_SPE, oname, vtense,
         quest_info, makeplural, artifact_exists as artifact_exists_real, getObjDescr } from './objnam.js';
const MS_LEADER = 36; /* C monflag.h MS_LEADER — your class leader */
/* C mkobj.c:1248 mksobj()'s SPE_NOVEL arm calls do_name.c's noveltitle(). */
import { noveltitle, safe_oname as safe_oname_real } from './do_name.js';
import { set_msg_xy, set_quest_leader_m_id } from './cmd.js';
import { PLNMSG_HIDE_UNDER, Is_earthlevel } from './const.js';
import { PROT_FROM_SHAPE_CHANGERS } from './const.js';
/* C makemon.c:1384 mongets() — makemon's `mitem` block hands the extra
 * starting item over the same helper m_initweap uses. */
import { mongets } from './m_initweap.js';
import { monhaskey, m_can_break_boulder, can_fog, mon_track_clear } from './monmove.js';
import { attacktype_fordmg, emits_light, monflee, onscary, set_malign, mbirth_limit, MAXMONNO, which_armor, findgold } from './makemon.js';
/* C wizard.c:605 nasty()'s before/after monster count. */
import { monster_census, msummon } from './sit.js';
import { aggravate as aggravate_real } from './mcastu.js';
/* C makemon.c:1347-1349's light-source registration (light.c / monflag.h). */
import { new_light_source, del_light_source, monst_to_any, artifact_light, obj_merge_light_sources } from './light.js';
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
import { enexto_core, enexto_out, rloc_to, rloc, tele_restrict, deal_with_overcrowding } from './teleport.js';
import { registerSpLevSomexy, reset_xystart_size } from './sp_lev_loc.js';
/* themerms.lua's 'Pillars' contents callback — lives with the other des.*
 * primitives it uses (sel_set_ter / get_location_coord). */
import { themerooms_contents_pillars, themerooms_contents_random_dungeon_feature, find_level, mkportal, induced_align, find_montype, get_location_coord,
    selection_new, selection_setpoint, selection_getpoint, selection_getbounds, selection_do_grow } from './sp_lev.js';
import { nhlib_filler_region_rng_consume, nhlib_fill_storeroom_rng, nhlib_fill_buried_treasure_rng, nhlib_fill_ice_room_rng, nhlib_fill_cloud_room_rng, nhlib_percent, nhlib_fill_garden_rng, nhlib_math_random_two_arg, nhlib_fill_temple_of_gods_rng, nhlib_fill_ghost_rng, nhlib_fill_teleportation_hub_rng, } from './nhlib.js';
import { litstate_rnd } from './mkmap.js';
import { chooseTrapnote } from './mklev_choose_trapnote.js';
import { getbones } from './bones.js';
import { recalc_block_point } from './vision.js';
/* Vault guards are normally dismissed through mongone's common inventory
 * path; vault.c's grddead() must first clear any temporary corridor when the
 * guard is the special vault monster. */
import { grddead } from './vault.js';
/* C ref: mklev.c:928 — clear_level_structures() calls region.c's
 * clear_regions().  region.js imports m_poisongas_ok back from this file;
 * both edges are runtime-only function references, so the cycle resolves. */
import { clear_regions, create_gas_cloud_selection, poisoncloud_at } from './region.js';
/* C mon.c:5485 newcham() invokes the shared worn.c mon_break_armor helper
 * even during creation (its pronoun locals are evaluated before armor tests). */
import { mon_break_armor } from './trap.js';
import { FALSE_RUMORS, FALSE_RUMOR_OFFSETS, FALSE_RUMOR_SIZE, TRUE_RUMORS, TRUE_RUMOR_OFFSETS, TRUE_RUMOR_SIZE, ENGRAVE_LINES, ENGRAVE_OFFSETS, ENGRAVE_CHUNK_SIZE, EPITAPH_LINES, EPITAPH_OFFSETS, EPITAPH_CHUNK_SIZE, } from './engrave_data.js';
import monMsizePack from './makemon_msize.json' with { type: 'json' };
import monsPack from './makemon_mons.json' with { type: 'json' };
import corpseWeightPack from './eat_corpse_data.json' with { type: 'json' };
import monPmnamesPack from './makemon_pmnames.json' with { type: 'json' };
import { OC_WEIGHT } from './oc_weight.generated.js';
import { init_rect, rnd_rect, get_rect, split_rects, within_bounded_area } from './rect.js';
import { insert_branch } from './dungeon_rng.js';
import { depth as depth_of_level, distmin, dist2 } from './hacklib.js';
import { oinit } from './o_init.js';
import { LOW_PM, COLNO, ROWNO, STONE, ROOM, CORR, DOOR, STAIRS, LADDER, IS_AIR, MAX_TYPE, INVALID_TYPE, NO_ROOM, AIR, CLOUD, THRONE, HWALL, VWALL, TLCORNER, TRCORNER, BLCORNER, BRCORNER, CROSSWALL, TUWALL, TDWALL, TLWALL, TRWALL, D_NODOOR, D_BROKEN, D_CLOSED, D_ISOPEN, D_LOCKED, D_TRAPPED, D_SECRET, OROOM, VAULT, THEMEROOM, ROOMOFFSET, MAXNROFROOMS, SHARED, Is_rogue_level, COURT, ZOO, BEEHIVE, ANTHOLE, COCKNEST, LEPREHALL, MORGUE, BARRACKS, SWAMP, TEMPLE, SHOPBASE, SDOOR, SCORR, IRONBARS, FOUNTAIN, SINK, ALTAR, GRAVE, DIR_N, DIR_S, DIR_E, DIR_W, DIR_180, IS_WALL, IS_STWALL, IS_DOOR, IS_OBSTRUCTED, IS_FURNITURE, IS_POOL, SPACE_POS, isok, MATCH_WALL, W_NONDIGGABLE, W_NONPASSWALL, W_ARMG, FILL_NONE, FILL_NORMAL, WM_MASK, WM_W_LEFT, WM_W_RIGHT, WM_W_TOP, WM_W_BOTTOM, WM_T_LONG, WM_T_BL, WM_T_BR, WM_C_OUTER, WM_C_INNER, WM_X_TL, WM_X_TR, WM_X_BL, WM_X_BR, WM_X_TLBR, WM_X_BLTR, ICE, MOAT, POOL, WATER, TREE, LAVAPOOL, LAVAWALL, DBWALL, A_LAWFUL, Align2amask, LR_TELE, LR_UPTELE, LR_DOWNTELE, RLOC_NOMSG, NO_MINVENT, In_quest, In_endgame, In_mines, In_V_tower, Is_oracle_level, Is_waterlevel, CORPSTAT_INIT, CORPSTAT_FEMALE, CORPSTAT_MALE, CORPSTAT_NEUTER, CORPSTAT_SPE_VAL, CORPSTAT_NONE, G_GONE, FIRE_RES, NO_TRAP, TRAPNUM, ARROW_TRAP, DART_TRAP, ROCKTRAP, SQKY_BOARD, BEAR_TRAP, LANDMINE, ROLLING_BOULDER_TRAP, SLP_GAS_TRAP, RUST_TRAP, FIRE_TRAP, PIT, SPIKED_PIT, HOLE, TRAPDOOR, TELEP_TRAP, LEVEL_TELEP, MAGIC_PORTAL, WEB, STATUE_TRAP, MAGIC_TRAP, ANTI_MAGIC, POLY_TRAP, VIBRATING_SQUARE, TRAPPED_DOOR, TRAPPED_CHEST, MKTRAP_NOFLAGS, MKTRAP_NOSPIDERONWEB, MKTRAP_SEEN, MKTRAP_MAZEFLAG, MKTRAP_NOVICTIM, is_pit, is_hole, Is_knox_level, ROT_AGE, TAINT_AGE, TROLL_REVIVE_CHANCE, DUST, BURN, MARK, ENGR_BLOOD, HEADSTONE, N_ENGRAVE, OBJ_FREE, OBJ_FLOOR, OBJ_CONTAINED, OBJ_BURIED, OBJ_DELETED, OBJ_INVENT, OBJ_MIGRATING, OBJ_ONBILL, ACCESSIBLE, u_at, GP_AVOID_MONPOS, GP_CHECKSCARY, MM_IGNOREWATER, MM_MINVIS, STRAT_WAITFORU, STRAT_CLOSE, STRAT_APPEARMSG, MM_NOWAIT, MM_EGD, MM_EPRI, MM_EMIN, MM_NOCOUNTBIRTH, MM_NOMSG, ismnum, In_sokoban, ALLOW_MDISP, ALLOW_TRAPS, ALLOW_U, ALLOW_M, ALLOW_TM, ALLOW_ALL, NOTONL, OPENDOOR, UNLOCKDOOR, BUSTDOOR, ALLOW_ROCK, ALLOW_WALL, ALLOW_DIG, ALLOW_BARS, ALLOW_SANCT, ALLOW_SSM, NOGARLIC, CONFLICT, IS_TREE, IS_WATERWALL, DRAWBRIDGE_UP, DISPLACED, INVIS, W_ARMS, engulfing_u, POISON_RES, MAGICAL_BREATHING, M_POISONGAS_OK, M_POISONGAS_MINOR, M_POISONGAS_BAD, SET_LIT_NOCHANGE, ZAP_POS, is_xport, N_DIRS, Is_botlevel, Is_stronghold, XL_UP, XL_DOWN, XL_LEFT, XL_RIGHT, SP_COORD_IS_RANDOM,
/* mktemple()'s shrine bit (mkroom.c:618) */
AM_SHRINE,
/* selection_do_grow() direction mask — themerms.lua make_garden_walls' `data.sel:grow()`
 * defaults to "all" (nhlsel.c:631-640 growdirs2i[0] = W_ANY). */
W_ANY, W_ARM, } from './const.js';
import { themerooms_contents_twin_businesses } from './sp_lev.js';
import { is_pool_or_lava, may_dig, closed_door } from './look.js';
import { t_at, deltrap, mon_knows_traps, mon_learns_traps, m_carrying, linedup, goodpos, mon_adjust_speed, m_dowear, unearth_objs,
         extract_from_minvent as extract_from_minvent_md,
         update_mon_extrinsics as update_mon_extrinsics_md } from './trap.js';
/* prop.h-adjacent: trap.c's ALL_TRAPS sentinel for mon_learns_traps (const.js:2270). */
import { ALL_TRAPS } from './const.js';
import { rloco as steal_rloco } from './steal.js';
import { cansee, couldsee, block_point, vision_recalc } from './vision.js';
import { canseemon, canspotmon, pline, newsym, sensemon, unmap_object, glyph_is_invisible_at, see_nearby_objects, You_hear, You_see, map_location } from './display.js';
import { invalidateTerrainStatus } from './terrain-status.js';
/* rumors.c outrumor()'s is_fainted() guard.  CYCLIC (js/eat.js imports getrumor
 * from this file); is_fainted is a hoisted `export function`, so it resolves. */
import { set_tin_variety, is_fainted, mon_givit, food_disappears } from './eat.js';
import { book_disappears } from './spell.js';
import { impossible as lifecycle_impossible } from './pline.js';
import { LS_OBJECT } from './const.js';
/* m_calcdistress (mon.c:1180) arms — see the block above minliquid() below. */
import { were_change, is_were, new_were } from './were.js';
import { MON_FLOOR, BOLT_LIM, NC_SHOW_MSG, ARTICLE_YOUR, ARTICLE_THE, ARTICLE_A, SUPPRESS_SADDLE } from './const.js';
import { MON_DETACH } from './const.js';
/* prop.h property indices for the Blind/Hallucination macros below.  Aliased
 * because this file already has locals named BLINDED-ish in other scopes. */
import { BLINDED as MK_BLINDED, HALLUC as MK_HALLUC, HALLUC_RES as MK_HALLUC_RES, TELEPAT as MK_TELEPAT, INVIS as MK_INVIS } from './const.js';
import { um_dist, verbalize, display_text_window } from './cmd.js';
/* mpickobj (steal.c:616) callees */
import { carry_obj_effects, count_unpaid, mergable, obj_no_longer_held, freeinv } from './cmd.js';
import { merged } from './hold_another_object.js';
import { oid_price_adjustment } from './shk.js';
import { subfrombill, find_objowner, onbill } from './shk.js';
/* in_rooms: the ONE implementation (js/shk.js:490, C hack.c:3497).  Imported and
 * re-exported so the modules that import it from here get the real body. */
import { in_rooms } from './shk.js';
import { add_damage } from './shk.js';
import { spot_stop_timers } from './timeout.js';
import { long_to_any } from './cmd.js';
import { IS_ROOM, DB_UNDER, DB_ICE, DB_FLOOR, DB_MOAT, DB_LAVA, MELT_ICE_AWAY, TIMER_LEVEL, SHOP_HOLE_COST, Is_juiblex_level } from './const.js';
import { shop_keeper } from './shk.js';
/* C shknam.c:793's on_level(&u.uz, &orcus_level); the real body, NOT
 * js/shk.js's or js/priest.js's throw-stub of the same name. */
import { on_level } from './dungeon.js';
/* C zap.c:1458 obj_resists — the real body (js/dogmove.js).  It was imported
 * under an alias only because this file also declared a file-local
 * `function obj_resists(otmp, a, b) { return false; }` stub that shadowed it
 * for meatobj(); that stub is gone, so the plain name is the real body now. */
import { obj_resists, quickmimic as quickmimic_mk, monstone } from './dogmove.js';
export { in_rooms };
import { attacktype, x_monnam, noname_monnam, poly_when_stoned } from './mhitm.js';
/* ── newcham()'s equipment half, C mon.c:5484-5518.  Every import below is a
 * REAL body; where js/ has only a stub the call is spelled out locally next to
 * newcham instead (see MON_WEP_nc / possibly_unwield_nc / mselftouch_nc). ── */
import { Resists_Elem } from './mhitm.js';                    /* C mondata.h resists_ston */
import { STONE_RES, NEED_WEAPON, NO_WEAPON_WANTED, NC_VIA_WAND_OR_SPELL } from './const.js';
import { setmnotwielded, mwepgone } from './uhitm.js';                  /* C worn.c:290 */
import { mwelded } from './cmd.js';                           /* C obj.h:434 */
import { bypass_obj, setnotworn } from './worn.js';            /* C worn.c:1090 */
import { flooreffects } from './cmd.js';                      /* C do.c:161 */
import { stackobj } from './sp_lev.js';                       /* C mkobj.c:2411 */
import { check_gear_next_turn, zombie_maker } from './makemon.js';          /* C mon.c:5915 */
import { set_apparxy, dochugw } from './monmove.js';           /* C monmove.c:1421, 3735 */
/* C weapon.c:766's `distant_name(obj, doname)`.  This file used to carry local
 * THROW stubs for both names; the real bodies live in js/objnam.js and are
 * imported here under _nc names.  The stubs are GONE as of the shadow-body
 * audit — every call site in this file now goes through these aliases. */
import { readobjnam as readobjnam_mk, distant_name as distant_name_nc, doname as doname_nc, Tobjnam } from './objnam.js';
import { simpleonames as simpleonames_mk, an as an_mk, corpse_xname as corpse_xname_rc, The as The_rc } from './objnam.js';
import { Monnam as Monnam_rc } from './mcastu.js';
import { Adjmonnam as Adjmonnam_rc } from './mhitm.js';
import { observe_object as observe_object_mk } from './o_init.js';
import { OC_NAME as OC_NAME_MK } from './oc_name_data.js';
import { obfree, delobj as delobj_real, deliver_obj_to_mon } from './dokick.js';
import { js_makemaz, mazexy, set_levltyp_lit, set_levltyp, bughack, bubbles_clear_level } from './mkmaze.js';
/* maybe_reset_pick — C lock.c:268; add_to_migration() below calls it when the
 * object leaving the level is a container.  RNG-free.  js/lock.js already
 * imports THIS module (wake_nearto, place_object); the resulting cycle is
 * inert because neither side calls the other during module evaluation. */
import { maybe_reset_pick } from './lock.js';
/* MIGR_TO_SPECIES (dungeon.h) — the destination code mksobj_migr_to_species()
 * stamps into owornmask; js/dokick.js's deliver_obj_to_mon() tests for it. */
import { MIGR_TO_SPECIES } from './const.js';
import { dmgtype, m_harmless_trap } from './dogmove.js';
import { mon_mattk_raw } from './mhitu.js';
import { unpunish } from './dig.js';
import { m_at, mon_nam as mon_nam_wm, experience, newexplevel } from './uhitm.js';
import { hastrack } from './track.js';
import { in_your_sanctuary, p_coaligned, priestini, mon_aligntyp } from './priest.js';
/* touch_artifact()'s hero branch and the artilist[] spfx/alignment/role columns
 * both already live in js/wizcmds.js; the monster branch below reads them there
 * rather than carrying a second copy. */
import { ARTI_PROPS, touch_artifact_youmonst } from './wizcmds.js';
import { healup, dryup as dryup_ml } from './potion.js';
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
import { ROT_CORPSE, REVIVE_MON, ZOMBIFY_MON, SHRINK_GLOB, HATCH_EGG, TIMER_OBJECT, FIG_TRANSFORM } from './const.js';
/** @type {[number,number,number,number,number,number,number,number,number][]} */
const MONS_ROWS = monsPack.mons;
/** C permonst.pmnames[NUM_MGENDERS] per MON() row — the 5.0 canonical names.
 * Used only to resolve a themerms.lua monster string to an mndx. */
const MONS_PMNAMES_ROWS = monPmnamesPack.pmnames;
const NON_PM = -1;
/* C global iflags (instance_flags) — used by minliquid, mondead, xkilled */
let iflags = { sad_feeling: false };
/** C const.h MM_ANGRY — monster starts hostile regardless of alignment */
const MM_ANGRY = 0x00000020;
/** C hack.h MM_ASLEEP — monsters generated asleep */
const MM_ASLEEP = 0x00001000;
/** C hack.h MM_NOGRP — suppress creation of monster groups */
const MM_NOGRP = 0x00002000;
/** C hack.h:1151 MM_ADJACENTOK — ok to use adjacent coordinates */
const MM_ADJACENTOK = 0x00000010;
/** C hack.h MM_NOTAIL (js/const.js:1581) — makemon.c:1161 allowtail. */
const MM_NOTAIL = 0x00004000;
/** C hack.h MM_NONAME — monster is not christened with a random name */
const MM_NONAME = 0x00000040;
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
const POT_OIL = 321;
const POT_WATER = 322;
/** C objects.h — LEASH (TOOL_CLASS); leashmon overloads corpsenm (obj.h:161) */
const LEASH = 236;
/** C obj.h:384 — MAX_OIL_IN_FLASK, the age (oil amount) for a fresh POT_OIL */
const MAX_OIL_IN_FLASK = 400;
/** C objects.h — FIGURINE (not crystal ball; was mis-typed as 231) */
const FIGURINE = 241;
const EGG = 266;
const PM_HUMAN = 260;
/** monster symbols — C include/defsym.h MONSYM indices */
const S_KOBOLD = 11;
const S_ORC = 15;
const S_HUMANOID = 8;
const S_GNOME = 33;
const S_GIANT = 34;
const S_TROLL = 46;
const S_KOP = 37;
const S_HUMAN = 53;
const S_ZOMBIE = 52;
const S_LICH = 38;
const S_MUMMY = 39;
const S_VAMPIRE = 48;
/** mkroom.c helpers: additional monster class symbols (defsym.h MONSYM) */
const S_DRAGON = 30;
const S_CENTAUR = 29;
const S_DEMON = 56; /* '&' major demon */
/** mkroom.c pm indices — pm.generated.js authoritative; these are aliases via NAMS bn= */
const PM_BUGBEAR = 45; /* pm.generated.js PM_BUGBEAR = 45 */
const PM_HOBGOBLIN = 71; /* pm.generated.js PM_HOBGOBLIN = 71 */
const PM_WRAITH = 230; /* pm.generated.js PM_WRAITH = 230 */
/* Throne rulers — NAMS("..king","..queen","..ruler/tyrant/monarch"), bn→ = same mons[] index */
const PM_GNOME_RULER = 168; /* = PM_GNOME_KING in pm.generated.js */
const PM_DWARF_RULER = 47; /* = PM_DWARF_KING in pm.generated.js */
const PM_ELVEN_MONARCH = 269; /* = PM_ELVENKING in pm.generated.js */
const PM_OGRE_TYRANT = 205; /* = PM_OGRE_KING in pm.generated.js */
/* Barracks squad monsters */
const PM_SOLDIER = 277;
const PM_SERGEANT = 278;
const PM_LIEUTENANT = 280;
const PM_CAPTAIN = 281;
/* Anthole ants */
const PM_SOLDIER_ANT = 2;
const PM_FIRE_ANT = 3;
const PM_GIANT_ANT = 0;
/* Beehive and gargoyle species */
const PM_QUEEN_BEE = 5;
const PM_KILLER_BEE = 1;
const PM_GARGOYLE = 41;
const PM_WINGED_GARGOYLE = 42;
/* MACE weapon (objects.h / m_initweap.js) */
const MACE_OTYP = 73; /* MACE — renamed to avoid collision */
/* LUMP_OF_ROYAL_JELLY food (objects.h, between SLIME_MOLD=285 and CREAM_PIE=287) */
const LUMP_OF_ROYAL_JELLY = 286;
/** monsters.h indices (pm.generated.js; must match makemon tables) */
const PM_GIANT_SPIDER = 96;
const PM_LIZARD = 326;
const PM_LICHEN = 158;
const PM_ETTIN = 174;
const PM_KOBOLD_ZOMBIE = 239;
const PM_ORC_ZOMBIE = 241;
const PM_GNOME_ZOMBIE = 240;
const PM_DWARF_ZOMBIE = 242;
const PM_ELF_ZOMBIE = 243;
const PM_HUMAN_ZOMBIE = 244;
const PM_ETTIN_ZOMBIE = 245;
const PM_GIANT_ZOMBIE = 247;
const PM_BLACK_LIGHT = 119; /* C pm.generated.js — S_LIGHT class */
const PM_STALKER = 153; /* C pm.generated.js — S_ELEMENTAL class */
const PM_GHOST = 287;
const PM_DEATH_R = 311;
const PM_PESTILENCE = 312;
const PM_ANGEL = 123; /* pm.generated.js PM_ANGEL */
const PM_ALIGNED_CLERIC = 275; /* = pm.generated.js PM_PRIEST (NetHack "aligned cleric") */
const PM_HIGH_CLERIC = 276; /* = pm.generated.js PM_HIGH_PRIEST */
/* C monflag.h geno bits */
const G_SGROUP = 0x0080; /* appear in small groups normally */
const G_LGROUP = 0x0040; /* appear in large groups normally */
const PM_FAMINE = 313;
/** C monflag.h M2_* subset for zombie_form */
const M2_ELF = 0x00000010;
const M2_DWARF = 0x00000020;
// Object/class constants — C ref: objclass.h enum objclass_classes, objects.h
const RANDOM_CLASS = 0;
const ILLOBJ_CLASS = 1;
const WEAPON_CLASS = 2;
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const AMULET_CLASS = 5;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
const COIN_CLASS = 12;
const GEM_CLASS = 13;
const ROCK_CLASS = 14;
const BALL_CLASS = 15;
const CHAIN_CLASS = 16;
const VENOM_CLASS = 17;
/** C: SPBOOK_no_NOVEL (0 - (int) SPBOOK_CLASS) */
const SPBOOK_no_NOVEL = -10;
/** C skills.h — ammo/missile skill range for is_multigen / is_poisonable (obj.h) */
const P_BOW = 20;
const P_SHURIKEN = 24;
const BOULDER = 475;
const GOLD_PIECE = 438;
/** C objects.h: first PROJECTILE arrow, then dart after bolt (MKOBJ array order; SVB[WEP]==ARROW) */
const ARROW = MKOBJ_SVB_BASES[WEAPON_CLASS]; /* FIRST_OBJECT aligned: arrow */
const DART = ARROW + 6; /* C order: arrows, bolts, dart (objects.h PROJECTILE/WEP list) */
const ROCK = 474;
const KELP_FROND = 275;
const SCR_TELEPORTATION = 333;
const BELL = 255;
const CORPSE = 265;
const STATUE = 476;
const SPE_BLANK_PAPER = 407;
/* C objects.h — armor otyps for mksobj_init ARMOR_CLASS (mkobj.c:1088-1091) */
const HELM_OF_OPPOSITE_ALIGNMENT = 99;
const SPLINT_MAIL = 124;
const GAUNTLETS_OF_FUMBLING = 160;
const FUMBLE_BOOTS = 171;
const LEVITATION_BOOTS = 172;
const PM_SAMURAI = 340;
/** C align.h A_NONE */
const A_NONE = -128;
// Supply chest items (objects.h enum)
const POT_HEALING = 307;
const POT_EXTRA_HEALING = 308;
const POT_SPEED = 302;
const POT_GAIN_ENERGY = 313;
const SCR_ENCHANT_WEAPON = 328;
const SCR_ENCHANT_ARMOR = 323;
const SCR_CONFUSE_MONSTER = 325;
const SCR_SCARE_MONSTER = 326;
const WAN_DIGGING = 428;
const SPE_HEALING = 374;
const LARGE_BOX = 214;
const CHEST = 215;
const ICE_BOX = 216;
const SACK = 217;
const OILSKIN_SACK = 218;
const BAG_OF_HOLDING = 219;
const BAG_OF_TRICKS = 220;
const TALLOW_CANDLE = 224;
const WAX_CANDLE = 225;
const BRASS_LANTERN = 226;
const OIL_LAMP = 227;
const MAGIC_LAMP = 228;
const EXPENSIVE_CAMERA = 229;
const CRYSTAL_BALL = 231;
const TINNING_KIT = 238;
const CAN_OF_GREASE = 240;
const MAGIC_MARKER = 242;
const MAGIC_FLUTE = 248;
const FROST_HORN = 250;
const FIRE_HORN = 251;
const HORN_OF_PLENTY = 252;
const WOODEN_HARP = 253;
const MAGIC_HARP = 254;
const DRUM_OF_EARTHQUAKE = 258;
const BELL_OF_OPENING = 263;
const STRANGE_OBJECT_MK = 0;
const TWO_HANDED_SWORD_MK = 55;
const POT_SICKNESS_MK = 318;
const SPE_DIG_MK = 366;
const PM_WIZARD_OF_YENDOR_MK = 285;
const PM_CROESUS_MK = 286;
/* C monflag.h ms_sounds — MS_NEMESIS; permonst.msound, not a monster index. */
const MS_NEMESIS_MK = 37;
/* C monflag.h:48 MS_BRIBE = 33 — "asks for money, or berates you". */
const MS_BRIBE_MK = 33;
/* C include/artilist.h — the artifact numbers are that file's A() order, with
 * artilist[0] the "" placeholder: Excalibur is 1 and Demonbane is 12 (the same
 * count that gives js/cmd.js ART_OGRESMASHER 16 and ART_SUNSWORD 20). */
const ART_EXCALIBUR_MK = 1, ART_DEMONBANE_MK = 12;
/* C mondata/monsters.h — the raven's PM index (js/makemon_pmnames.json row 128). */
const PM_RAVEN_MK = 128;
/* C objects.h — bec de corbin's otyp (js/oc_name_data.js row 70; js/m_initweap.js:107
 * and js/uhitm.js:3869 already spell the same number). */
const BEC_DE_CORBIN = 70;
/* C obj.h:441 u_wield_art(art) = is_art(uwep, art);
 * obj.h:439 is_art(o, art) = ((o) && (o)->oartifact == (art)). */
function u_wield_art_mk(art) {
    const uwep = (game.u && game.u.uwep) || null;
    return !!uwep && (uwep.oartifact | 0) === art;
}
/* C monflag.h ms_sounds — MS_LEADER (the row before MS_NEMESIS). */
const MS_LEADER_MK = 36;
const MEAT_RING = 270;
const TIN = 296;
/* C objects.h — food otyps for mksobj_init FOOD_CLASS (mkobj.c:914–975) */
const SLIME_MOLD = 285;
const CANDY_BAR = 288;
/** C obj.h Is_pudding — pudding globs in objects.h order after MEAT_RING */
const GLOB_OF_GRAY_OOZE = 271;
const GLOB_OF_BROWN_PUDDING = 272;
const GLOB_OF_GREEN_SLIME = 273;
const GLOB_OF_BLACK_PUDDING = 274;
const CARROT = 282;
const PM_SMALL_MIMIC = 64, PM_LARGE_MIMIC = 65, PM_GIANT_MIMIC = 66;
/** C monflag.h M1_OVIPAROUS */
const M1_OVIPAROUS = 0x00400000;
/** C mon.c dead_species / can_be_hatched G_GENOD flag (monflag.h) */
const G_GENOD = 0x02;
/** C objclass.h enum obj_material_types SILVER = 14 */
const SILVER_MATERIAL = 14;
/** C pm.h PM_ACID_BLOB — nonrotting_corpse (eat.c:58) */
const PM_ACID_BLOB = 6;
const DILITHIUM_CRYSTAL = 439;
const LUCKSTONE = 470;
const LOADSTONE = 471;
const WAN_LIGHT = 410;
const WAN_LIGHTNING = 434;
const WAN_CANCELLATION = 423;
/** C objects.h — WAN_FIRE (between WAN_DIGGING and WAN_LIGHTNING) */
const WAN_FIRE = 430;
/** C objects.h — contiguous NODIR wands WAN_LIGHT..WAN_STASIS (mkobj.c:1124–1125) */
const WAN_STASIS = 415;
const WAN_WISHING = 414;
/** C mkobj.c:1064–1068 AMULET_CLASS curse branch */
const AMULET_OF_STRANGULATION = 203;
const AMULET_OF_RESTFUL_SLEEP = 204;
const AMULET_OF_CHANGE = 206;
const AMULET_OF_YENDOR = 213;
/** C mkobj.c may_generate_eroded — worm tooth / unicorn horn */
const WORM_TOOTH = 42;
const UNICORN_HORN = 261;
/** C objclass.h obj_material_types (subset for mkobj_erosions) */
const LIQUID = 1;
const WOOD = 8;
const DRAGON_HIDE = 10;
const IRON = 11;
const COPPER = 13;
const PLASTIC = 18;
const GLASS = 19;
const P_NONE = 0;
const FOOD_RATION = 293;
const CRAM_RATION = 292;
const LEMBAS_WAFER = 291;
// DUST, ENGRAVE, BURN, MARK, ENGR_BLOOD, HEADSTONE imported from const.js above.
/** C mondata.h MZ_SMALL — verysmall(ptr) is (msize < MZ_SMALL) */
const MZ_SMALL = 1;
/** @type {number[]} permonst.msize per mons[] index (monflag.h MZ_*) */
const MONS_MSIZE = monMsizePack.msize;
/** @type {number[]} permonst.cwt (corpse weight) per mons[] index — js/eat_corpse_data.json */
export const MONS_CWT = corpseWeightPack.cwt;
// C ref: dungeon.c In_hell(d_level *) — svd.dungeons[lev->dnum].flags.hellish
// C ref: mon.c:2461 monnear(struct monst *mon, coordxy x, coordxy y)
export function monnear(mon, x, y) {
    const distance = dist2(mon.mx, mon.my, x, y);
    if (distance === 2 && mon.data.pmidx === PM_GRID_BUG)
        return false;
    return distance < 3;
}
export function In_hell(uz) {
    const lev = uz ?? game.u?.uz;
    if (!lev)
        return false;
    const flags = game.dungeons?.[lev.dnum]?.flags;
    if (!flags)
        return false;
    if (Array.isArray(flags))
        return flags.includes('hellish');
    if (typeof flags !== 'object')
        return false;
    return !!(flags.hellish);
}
// C ref: mkobj.c mkobjprobs / hellprobs / rogueprobs (iprob sums to 100)
const mkobjprobs = [
    { iprob: 10, iclass: WEAPON_CLASS },
    { iprob: 11, iclass: ARMOR_CLASS },
    { iprob: 20, iclass: FOOD_CLASS },
    { iprob: 8, iclass: TOOL_CLASS },
    { iprob: 7, iclass: GEM_CLASS },
    { iprob: 16, iclass: POTION_CLASS },
    { iprob: 16, iclass: SCROLL_CLASS },
    { iprob: 4, iclass: SPBOOK_CLASS },
    { iprob: 4, iclass: WAND_CLASS },
    { iprob: 3, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];
const rogueprobs = [
    { iprob: 12, iclass: WEAPON_CLASS },
    { iprob: 12, iclass: ARMOR_CLASS },
    { iprob: 22, iclass: FOOD_CLASS },
    { iprob: 22, iclass: POTION_CLASS },
    { iprob: 22, iclass: SCROLL_CLASS },
    { iprob: 5, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
];
const hellprobs = [
    { iprob: 20, iclass: WEAPON_CLASS },
    { iprob: 20, iclass: ARMOR_CLASS },
    { iprob: 16, iclass: FOOD_CLASS },
    { iprob: 12, iclass: TOOL_CLASS },
    { iprob: 10, iclass: GEM_CLASS },
    { iprob: 1, iclass: POTION_CLASS },
    { iprob: 1, iclass: SCROLL_CLASS },
    { iprob: 8, iclass: WAND_CLASS },
    { iprob: 8, iclass: RING_CLASS },
    { iprob: 4, iclass: AMULET_CLASS },
];
/* C mkobj.c boxiprobs[] — mkbox_cnts item class pick */
const boxiprobs = [
    { iprob: 18, iclass: GEM_CLASS },
    { iprob: 15, iclass: FOOD_CLASS },
    { iprob: 18, iclass: POTION_CLASS },
    { iprob: 18, iclass: SCROLL_CLASS },
    { iprob: 12, iclass: SPBOOK_CLASS },
    { iprob: 7, iclass: COIN_CLASS },
    { iprob: 6, iclass: WAND_CLASS },
    { iprob: 5, iclass: RING_CLASS },
    { iprob: 1, iclass: AMULET_CLASS },
];
const XLIM = 4;
const YLIM = 3;
// Direction deltas
const xdir = [-1, -1, 0, 1, 1, 1, 0, -1];
const ydir = [0, -1, -1, -1, 0, 1, 1, 1];
// Stairway list management
export function stairway_add(x, y, up, isladder, dest) {
    /* C ref: stairs.c:13-23 stairway_add — u_traversed starts FALSE; set TRUE
     * by mklev (dlvl1 start upstairs) or when the hero walks the stairs.  Drives
     * known_branch_stairs() → the YELLOW vs GRAY stair glyph color (display.c). */
    const node = { sx: x, sy: y, up, isladder, tolev: { ...dest },
                   u_traversed: false, next: game.stairs };
    game.stairs = node;
}
/* C ref: stairs.c:26-38 stairway_free_all — release the complete stairway
 * chain and leave the global head empty. JavaScript needs no explicit free,
 * but walking the links preserves the native list teardown semantics. */
export function stairway_free_all() {
    let node = game.stairs;
    while (node) {
        const next = node.next;
        node.next = null;
        node = next;
    }
    game.stairs = null;
}
// ── Stairway lookup ──
export function stairway_find_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.up === up)
            return s;
    return null;
}
export function stairway_find_special_dir(up) {
    for (let s = game.stairs; s; s = s.next)
        if (s.tolev.dnum !== (game.u?.uz?.dnum ?? 0) && s.up !== up)
            return s;
    return null;
}
// C ref: stairs.c:39-47 stairway_at — walk gs.stairs for the node whose
// sx/sy match (x,y); return it or NULL.
export function stairway_at(x, y) {
    let tmp = game.stairs;
    while (tmp && !(tmp.sx === x && tmp.sy === y))
        tmp = tmp.next;
    return tmp || null;
}
// C ref: stairs.c:147-151 On_stairs — is (x,y) a stairway?
export function On_stairs(x, y) {
    return stairway_at(x, y) != null;
}
// C ref: stairs.c:153-159 On_ladder — is (x,y) a ladder?
export function On_ladder(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && stway.isladder);
}
// C ref: stairs.c:161-167 On_stairs_up — is (x,y) an up-stair?
export function On_stairs_up(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && stway.up);
}
// C ref: stairs.c:169-175 On_stairs_dn — is (x,y) a down-stair?
export function On_stairs_dn(x, y) {
    const stway = stairway_at(x, y);
    return !!(stway && !stway.up);
}
// C ref: stairs.c:179-184 known_branch_stairs
export function known_branch_stairs(sway) {
    return !!(sway && sway.tolev.dnum !== game.u.uz.dnum && sway.u_traversed);
}
// C ref: stairs.c:63-77 stairway_find_from
export function stairway_find_from(fromdlev, isladder) {
    let tmp = game.stairs;
    while (tmp) {
        if (tmp.tolev.dnum === fromdlev.dnum
            && tmp.tolev.dlevel === fromdlev.dlevel
            && tmp.isladder == isladder)
            break;
        tmp = tmp.next;
    }
    return tmp || null;
}
// ── Hero placement (C ref: dungeon.c:1568-1601 u_on_newpos) ──
function u_on_newpos(x, y) {
    game.u.ux = x;
    game.u.uy = y;
    /* C dungeon.c:1588 — on a level transition, remember the arrival square
     * in ux0/uy0 before rebuilding nearby visibility. */
    const uz = game.u.uz, uz0 = game.u.uz0;
    if (uz && uz0
        && ((uz.dnum | 0) !== (uz0.dnum | 0)
            || (uz.dlevel | 0) !== (uz0.dlevel | 0))) {
        game.u.ux0 = x;
        game.u.uy0 = y;
        /* C dungeon.c:1590-1593 — refresh lastseentyp at the arrival square
         * before spoteffects() and force switch_terrain() once. */
        map_location(x, y, false);
        invalidateTerrainStatus();
    }
    /* C dungeon.c:1576-1578 — "ridden steed always shares hero's location":
     *     if (u.usteed)
     *         u.usteed->mx = u.ux, u.usteed->my = u.uy;
     * This is the invariant C's mon_sanity_check asserts (mon.c:273-277): the
     * steed stays on the fmon chain but off the level's monster grid, with its
     * <mx,my> tracking the hero.  Without it a rider who changed level or was
     * teleported left the steed standing on the old square. */
    if (game.u.usteed) {
        game.u.usteed.mx = x;
        game.u.usteed.my = y;
    }
    if (!_Blind_mk()
        && !_Hallucination_mk()
        && !(game.u.uswallow | 0))
        see_nearby_objects();
}
// C ref: mkmaze.c bad_location — mirrors C exactly.
// Returns TRUE when the location is unsuitable for hero/portal placement.
// C: occupied(x,y) || within_bounded_area(nlx/nly/nhx/nhy) ||
//    !(CORR&&maze || ROOM || AIR)
// occupied() = t_at || IS_FURNITURE || is_lava || is_pool || invocation_pos
function bad_location(x, y, nlx, nly, nhx, nhy) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return true;
    // C: occupied(x, y) — trap, furniture, lava, pool
    if (occupied(x, y))
        return true;
    // Excluded region (within_bounded_area)
    if (nlx && x >= nlx && x <= nhx && y >= nly && y <= nhy)
        return true;
    // Must be ROOM, (CORR in maze), or AIR
    if (loc.typ !== ROOM && loc.typ !== AIR
        && !(loc.typ === CORR && game.level?.flags?.is_maze_lev))
        return true;
    return false;
}
/* C ref: mkmaze.c:317-331 is_exclusion_zone.  Duplicated here rather than
 * imported from js/sp_lev.js (where the same function is module-local) for the
 * same reason sp_lev.js duplicates bad_location from this file: neither copy is
 * exported and widening either file's surface for ten lines is not worth the
 * extra import edge.  LR_DOWNTELE/LR_UPTELE also match a generic LR_TELE zone;
 * everything else needs an exact zonetype match. */
function lregion_is_exclusion_zone(type, x, y) {
    for (const ez of (game.exclusion_zones || [])) {
        const typeMatches =
            (type === LR_DOWNTELE && (ez.zonetype === LR_DOWNTELE || ez.zonetype === LR_TELE))
            || (type === LR_UPTELE && (ez.zonetype === LR_UPTELE || ez.zonetype === LR_TELE))
            || type === ez.zonetype;
        if (typeMatches
            && x >= ez.lx && x <= ez.hx && y >= ez.ly && y <= ez.hy)
            return true;
    }
    return false;
}
async function put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev) {
    const lregionTrace = typeof process !== 'undefined'
        && ENV?.FF_LREGION_TRACE === '1';
    if (lregionTrace)
        pushRngLogEntry(`^lregion_try[x=${x | 0},${y | 0} bounds=${lxSafe(nlx)},${lxSafe(nly)},${lxSafe(nhx)},${lxSafe(nhy)} oneshot=${oneshot ? 1 : 0}]`);
    if (bad_location(x, y, nlx, nly, nhx, nhy)
        || lregion_is_exclusion_zone(rtype, x, y)) {
        if (!oneshot) {
            return false; /* caller should try again */
        } else {
            /* C: must make do with the only location possible; avoid failure
               due to a misplaced trap.  undestroyable_trap() is MAGIC_PORTAL
               and VIBRATING_SQUARE only (trap.h). */
            const t = t_at(x, y);
            if (t && t.ttyp !== MAGIC_PORTAL && t.ttyp !== VIBRATING_SQUARE) {
                const mtrap = m_at(x, y);
                if (mtrap && mtrap.mtrapped)
                    mtrap.mtrapped = 0;
                deltrap(t);
            }
            if (bad_location(x, y, nlx, nly, nhx, nhy)
                || lregion_is_exclusion_zone(rtype, x, y))
                return false;
        }
    }
    /* "something" means the player in this case */
    const mtmp = m_at(x, y);
    if (mtmp) {
        if (lregionTrace)
            pushRngLogEntry(`^lregion_occupied[x=${x | 0},${y | 0} id=${mtmp.m_id | 0} mndx=${mtmp?.mndx ?? mtmp?.data?.pmidx ?? -1} oneshot=${oneshot ? 1 : 0}]`);
        /* move the monster if no choice, or just try again */
        if (oneshot) {
            await rloc(mtmp, RLOC_NOMSG);
        } else {
            return false;
        }
    }
    u_on_newpos(x, y);
    return true;
}

/* Keep telemetry formatting local so the probe cannot coerce undefined bounds
 * into an accidental gameplay read or throw while level-transition recovery is
 * still constructing its destination region. */
function lxSafe(v) { return Number.isFinite(v) ? (v | 0) : 0; }
// C ref: mkmaze.c:355-408 place_lregion — place hero (LR_UPTELE/LR_DOWNTELE)
export async function place_lregion(lx, ly, hx, hy, nlx, nly, nhx, nhy, rtype, lev) {
    if (!lx) {
        /* C mkmaze.c:366-373 also short-circuits `rtype == LR_BRANCH &&
           svn.nroom` to place_branch() here; unreachable from this copy, whose
           only caller (u_on_rndspot) always passes an LR_*TELE rtype. */
        lx = 1;
        hx = COLNO - 1;
        ly = 0;
        hy = ROWNO - 1;
    }
    if (lx < 1)
        lx = 1;
    if (hx > COLNO - 1)
        hx = COLNO - 1;
    if (ly < 0)
        ly = 0;
    if (hy > ROWNO - 1)
        hy = ROWNO - 1;
    // Probabilistic search
    const oneshot = (lx === hx && ly === hy);
    for (let trycnt = 0; trycnt < 200; trycnt++) {
        const x = rn1((hx - lx) + 1, lx);
        const y = rn1((hy - ly) + 1, ly);
        if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, oneshot, lev))
            return;
    }
    // Deterministic fallback
    for (let x = lx; x <= hx; x++)
        for (let y = ly; y <= hy; y++)
            if (await put_lregion_here(x, y, nlx, nly, nhx, nhy, rtype, true, lev))
                return;
    // C mkmaze.c:409
    await lifecycle_impossible("Couldn't place lregion type %d!", rtype);
}
// C ref: stairs.c u_on_sstairs — place hero on the special staircase, or
// fall through to a random arrival spot (u_on_rndspot).
export async function u_on_sstairs(upflag) {
    const stway = stairway_find_special_dir(upflag);
    if (stway) {
        u_on_newpos(stway.sx, stway.sy);
        return;
    }
    await u_on_rndspot(upflag);
}
// C ref: dungeon.c u_on_rndspot — place hero at a random location within
// the level's stored arrival region (game.updest/game.dndest, populated
// by fixup_special from a des.teleport_region/des.levregion call — see
// js/sp_lev.js's lspo_teleport_region and fixup_special).
export async function u_on_rndspot(upflag) {
    const up = (upflag & 1);
    if (upflag & 2) {
        /* C dungeon.c:1603-1610 — when leaving the Wizard's Tower, keep the
         * hero inside its exclusion rectangle if the destination is another
         * tower level.  Both directions use dndest's exclusion region. */
        const uz = game.u?.uz;
        const tower = [game.wiz1_level, game.wiz2_level, game.wiz3_level]
            .some(lv => lv && (lv.dnum | 0) === (uz?.dnum | 0)
                        && (lv.dlevel | 0) === (uz?.dlevel | 0));
        if (tower) {
            const d = game.dndest || {};
            await place_lregion(d.nlx || 0, d.nly || 0, d.nhx || 0, d.nhy || 0,
                          0, 0, 0, 0, LR_DOWNTELE, null);
            return;
        }
    }
    const d = up ? (game.updest || {}) : (game.dndest || {});
    await place_lregion(d.lx || 0, d.ly || 0, d.hx || 0, d.hy || 0,
                  d.nlx || 0, d.nly || 0, d.nhx || 0, d.nhy || 0,
                  up ? LR_UPTELE : LR_DOWNTELE, null);
    // C: switch_terrain() — verified no-op here, see summary above.
}
// C ref: stairs.c u_on_upstairs — place hero on upstairs or fallback
export async function u_on_upstairs() {
    const stway = stairway_find_dir(true);
    if (stway) {
        u_on_newpos(stway.sx, stway.sy);
        return;
    }
    // No upstair — try special stairs, then random.
    // C: u_on_sstairs(0); /* destination upstairs implies moving down */
    await u_on_sstairs(0);
}
// C ref: stairs.c:136-145 u_on_dnstairs — place hero on the dnstairs (or the
// special/branch equivalent).  Reached from goto_level's `up` arm when the new
// level carries no stairway back to the level just left.
export async function u_on_dnstairs() {
    const stway = stairway_find_dir(false);
    if (stway) {
        u_on_newpos(stway.sx, stway.sy);
        return;
    }
    // C: u_on_sstairs(1); /* destination dnstairs implies moving up */
    await u_on_sstairs(1);
}
// C ref: dungeon.c:1560-1600 u_on_newpos — exported for goto_level's
// stairway_find_from arm (do.c:1748/1766), which places the hero directly on
// the stairway leading back to u.uz0 rather than going through u_on_upstairs.
export { u_on_newpos };
// C dungeon.c level_difficulty() — use makemon helper (depth / amulet / endgame / builds_up)
export function level_difficulty() {
    return levelDifficulty() | 0;
}
export function single_level_branch(lev) {
    const uz = lev ?? game.u?.uz;
    if (!uz)
        return false;
    return Is_knox_level(uz);
}
// ============================================================
// Stub functions for object/monster/trap creation
// These consume the exact RNG calls that C makes.
// ============================================================
// C ref: mkobj.c:509-532 next_ident
// Returns the current context.ident value and advances it by rnd(2).
// Handles wrap-to-zero by forcing a non-zero ident (rnd(2)+1).
// Also initializes context.ident to 2 (matching allmain.c:846) if not set.
function next_ident() {
    const g = game;
    if (g.context == null)
        g.context = {};
    if (g.context.ident == null)
        g.context.ident = 2; /* id 1 is reserved for gy.youmonst */
    const res = g.context.ident;
    if (typeof process !== 'undefined' && ENV?.FF_IDENT_TRACE === '1') {
        const m = g.u?.uz?.dlevel;
        pushRngLogEntry(`^ident_trace[moves=${g.moves} dlevel=${m} ident=${res}]`);
    }
    g.context.ident += rnd(2);
    /* if ident has wrapped to 0, force it to be non-zero */
    if (!g.context.ident)
        g.context.ident = rnd(2) + 1; /* id 1 is reserved */
    return res;
}
/** C mkobj.c bcsign (1858–1860): !!blessed - !!cursed (-1 | 0 | 1). */
export function bcsign(otmp) {
    return (!!otmp?.blessed - !!otmp?.cursed) | 0;
}
/** Rings with oc_charged in C OBJECTS BITS (RING macro spec===1): adornment … protection → first 6 rings. */
function ringOcCharged(otyp) {
    const lo = MKOBJ_SVB_BASES[RING_CLASS] | 0;
    return otyp >= lo && otyp <= lo + 5;
}
/** C objects.h numbering from SVB[RING_CLASS] (173); see mkobj.c:1144–1147. */
const RIN_HUNGER = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 11;
const RIN_AGGRAVATE_MONSTER = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 12;
const RIN_TELEPORTATION = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 21;
const RIN_POLYMORPH = (MKOBJ_SVB_BASES[RING_CLASS] | 0) + 23;
// C ref: mkobj.c:1841-1855 blessorcurse(otmp, chance)
function blessorcurse(otmp, chance) {
    if (!otmp || otmp.blessed || otmp.cursed)
        return;
    /* if (!rn2(chance)) { if (!rn2(2)) curse; else bless; } */
    if (!rn2(chance)) {
        if (!rn2(2)) {
            otmp.blessed = false;
            otmp.cursed = true;
        }
        else {
            otmp.cursed = false;
            otmp.blessed = true;
        }
    }
}
// C artifact.c:461-471 nartifact_exist — count artifacts whose .exists bit is set.
function nartifact_exist() {
    const ae = game._artiexist || {};
    let a = 0;
    for (const k in ae)
        if (ae[k]) ++a;
    return a;
}
function mk_artifact(otmp, alignment, max_giftvalue, adjust_spe) {
    const by_align = (alignment !== A_NONE);
    if (by_align)
        return otmp; /* not ported — see above */
    const o_typ = otmp ? (otmp.otyp | 0) : 0;
    /* C: unique = !by_align && otmp && objects[o_typ].oc_unique.  An oc_unique
     * base type suppresses the whole eligible scan.  game._oc_unique is the
     * same table js/eat.js:2014 reads; absent means "not unique", which is
     * correct for every weapon/armor otyp these call sites can produce. */
    const unique = !!(otmp && game._oc_unique && game._oc_unique[o_typ]);

    /* C artifact.c:190-251 — gather eligible artifacts.  On the !by_align path
     * the loop body reduces to the three skips plus `a->otyp == o_typ`; the
     * alignment/race/Role_if half is by_align-only, and the
     * `a->gift_value > max_giftvalue && !Role_if(a->role)` skip is dead here
     * because every call site passes max_giftvalue = 99 and the largest
     * gift_value in artilist.h is 12. */
    const eligible = [];
    for (let m = 1; m <= ARTILIST.length; m++) {
        if (_arti_exists_bit_local(m))
            continue;
        if (ARTI_NOGEN.has(m) || unique)
            continue;
        if (ARTILIST[m - 1].otyp === o_typ)
            eligible.push(m);
    }

    if (!eligible.length)
        return otmp; /* C:299-310 — nothing appropriate; return the original */

    /* C artifact.c:259 — m = eligible[rn2(n)] */
    const m = eligible[rn2(eligible.length)];
    const a = ARTILIST[m - 1];
    /* C:280 — prevent erosion from generating */
    otmp.oeroded = otmp.oeroded2 = 0;
    /* C:281-284 — oname() promotes it (artifact_exists -> artifact_origin with
     * the ONAME_RANDOM default), then C re-asserts oartifact and re-runs
     * artifact_origin(otmp, ONAME_RANDOM) — both already done by oname here,
     * hence no second call. */
    oname(otmp, a.name, ONAME_NO_FLAGS);
    otmp.oartifact = m;
    if (adjust_spe) {
        /* C:285-297 — clamped into the "normal" range. */
        const new_spe = (otmp.spe | 0) + (ARTI_GEN_SPE[m] | 0);
        if (new_spe >= -10 && new_spe < 10)
            otmp.spe = new_spe;
    }
    return otmp;
}
/* C artifact.c:344 artiexist[m].exists, via the same game._artiexist store
 * js/objnam.js writes (an entry is either the legacy `true` or a full origin
 * record; both mean "exists"). */
function _arti_exists_bit_local(m) {
    const e = (game._artiexist || {})[m];
    return !!e && (e === true || !!e.exists);
}
/** C mon.c undead_to_corpse — index values from pm.generated.js JS PM order */
export function undead_to_corpse(mndx) {
    switch (mndx | 0) {
        case 239:
        case 187: return 59; /* kobold z/m -> kobold */
        case 242:
        case 190: return 44; /* dwarf z/m -> dwarf */
        case 240:
        case 188: return 165; /* gnome z/m -> gnome */
        case 241:
        case 189: return 72; /* orc z/m -> orc */
        case 243:
        case 191: return 264; /* elf z/m -> elf */
        case 226:
        case 227:
        case 244:
        case 192: return PM_HUMAN; /* vamp/vamp-lord, hum z/m */
        case 247:
        case 194: return 169; /* giant z/m -> giant */
        case 245:
        case 193: return 174; /* ettin z/m -> ettin */
        default: return mndx | 0;
    }
}
function uroleMnum() {
    const ir = game.flags?.initrole;
    if (typeof ir === 'number' && ir >= 0 && ir < ROLE_INITROLE_TO_PM.length)
        return ROLE_INITROLE_TO_PM[ir] | 0;
    return PM_HUMAN;
}
/* C ref: Role_if(PM_SAMURAI) — true when the hero's player role is Samurai.
 * The Samurai player-role index is initrole 9 (roles.js role table, mnum 9). */
const SAMURAI_INITROLE = 9;
function ROLE_IF_SAMURAI() {
    return (game.flags?.initrole | 0) === SAMURAI_INITROLE
        || (game.urole?.mnum | 0) === SAMURAI_INITROLE;
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
function obj_to_any(o) {
    return { a_obj: o, a_long: null };
}
function Is_mbag(o) {
    return o.otyp === BAG_OF_HOLDING || o.otyp === BAG_OF_TRICKS;
}
/* C mkobj.c mkbox_cnts (304–385) — stock containers; RNG must match for mklev */
async function mkbox_cnts(box) {
    let n;
    box.cobj = null;
    switch (box.otyp) {
        case ICE_BOX:
            n = 20;
            break;
        case CHEST:
            n = box.olocked ? 7 : 5;
            break;
        case LARGE_BOX:
            n = box.olocked ? 5 : 3;
            break;
        case SACK:
        case OILSKIN_SACK:
            if ((((game.moves) | 0) <= 1) && !game.in_mklev) {
                n = 0;
                break;
            }
        /* FALLTHRU */
        case BAG_OF_HOLDING:
            n = 1;
            break;
        default:
            n = 0;
            break;
    }
    for (n = rn2(n + 1); n > 0; n--) {
        let otmp;
        if (box.otyp === ICE_BOX) {
            otmp = (await mksobj(CORPSE, true, false));
            otmp.age = 0;
            if (otmp.timed) {
                /* C mkobj.c mkbox_cnts — an ice box's corpses do not rot.
                 * The func_index arguments were the STRINGS 'ROT_CORPSE' etc.,
                 * which no numeric timer entry could ever match; they are the
                 * timeout.h enum members. */
                stop_timer(ROT_CORPSE, obj_to_any(otmp));
                stop_timer(REVIVE_MON, obj_to_any(otmp));
                stop_timer(SHRINK_GLOB, obj_to_any(otmp));
            }
        }
        else {
            let tprob;
            let idx = 0;
            const iprobs = boxiprobs;
            for (tprob = rnd(100); (tprob -= iprobs[idx].iprob) > 0; idx++)
                continue;
            otmp = (await mkobj(iprobs[idx].iclass, false));
            if (otmp.oclass === COIN_CLASS) {
                otmp.quan = rnd(level_difficulty() + 2) * rnd(75);
                otmp.owt = weight(otmp);
            }
            else {
                while (otmp.otyp === ROCK) {
                    otmp.otyp = rnd_class(DILITHIUM_CRYSTAL, LOADSTONE);
                    if (otmp.quan > 2)
                        otmp.quan = 1;
                    otmp.owt = weight(otmp);
                }
            }
            if (box.otyp === BAG_OF_HOLDING) {
                if (Is_mbag(otmp)) {
                    otmp.otyp = SACK;
                    otmp.spe = 0;
                    otmp.owt = weight(otmp);
                }
                else {
                    while (otmp.otyp === WAN_CANCELLATION)
                        otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
                }
            }
        }
        await add_to_container(box, otmp);
    }
}
// ── C mkobj.c mkobj_erosions + material helpers (mkobj.c:177-223,2272-2298, objnam.c:1195-1214, obj.h is_weptool) ──
function obj_oc_material(otyp) {
    return MKOBJ_OC_MATERIAL[otyp | 0] | 0;
}
function obj_oc_skill(otyp) {
    return MKOBJ_OC_SKILL[otyp | 0] | 0;
}
function obj_oc_oprop(otyp) {
    return MKOBJ_OC_OPROP[otyp | 0] | 0;
}
function is_weptool(otmp) {
    return (otmp.oclass | 0) === TOOL_CLASS && obj_oc_skill(otmp.otyp) !== P_NONE;
}
export function erosion_matters(otmp) {
    const oc = otmp.oclass | 0;
    if (oc === TOOL_CLASS)
        return is_weptool(otmp);
    if (oc === WEAPON_CLASS || oc === ARMOR_CLASS || oc === BALL_CLASS || oc === CHAIN_CLASS)
        return true;
    return false;
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
export function is_flammable(otmp) {
    const otyp = otmp.otyp | 0;
    if (otyp === TALLOW_CANDLE || otyp === WAX_CANDLE)
        return false;
    if (obj_oc_oprop(otyp) === FIRE_RES || otyp === WAN_FIRE)
        return false;
    const omat = obj_oc_material(otyp);
    return (omat <= WOOD && omat !== LIQUID) || omat === PLASTIC;
}
export function is_rottable(otmp) {
    const omat = obj_oc_material(otmp.otyp | 0);
    return (omat <= WOOD && omat !== LIQUID) || omat === DRAGON_HIDE;
}
/* C objclass.h:193 — is_organic(otmp) := objects[otmp->otyp].oc_material <= WOOD */
function is_organic(otmp) {
    return obj_oc_material(otmp.otyp | 0) <= WOOD;
}
export function is_damageable(otmp) {
    return is_rustprone(otmp) || is_flammable(otmp) || is_rottable(otmp)
        || is_corrodeable(otmp) || is_crackable(otmp);
}
function may_generate_eroded(otmp) {
    const moves = (game.moves) | 0;
    if (moves <= 1 && !game.in_mklev)
        return false;
    if (otmp.oerodeproof || !erosion_matters(otmp) || !is_damageable(otmp))
        return false;
    const ot = otmp.otyp | 0;
    if (ot === WORM_TOOTH || ot === UNICORN_HORN)
        return false;
    if (otmp.oartifact)
        return false;
    return true;
}
/** C mkobj.c mkobj_erosions */
function mkobj_erosions(otmp) {
    if (may_generate_eroded(otmp)) {
        if (!rn2(100)) {
            otmp.oerodeproof = 1;
        }
        else {
            if (!rn2(80) && (is_flammable(otmp) || is_rustprone(otmp)
                || is_crackable(otmp))) {
                do {
                    otmp.oeroded = (otmp.oeroded | 0) + 1;
                } while ((otmp.oeroded | 0) < 3 && !rn2(9));
            }
            if (!rn2(80) && (is_rottable(otmp) || is_corrodeable(otmp))) {
                do {
                    otmp.oeroded2 = (otmp.oeroded2 | 0) + 1;
                } while ((otmp.oeroded2 | 0) < 3 && !rn2(9));
            }
        }
        if (!rn2(1000))
            otmp.greased = 1;
    }
}
/** C mkobj.c rider_revival_time */
function rider_revival_time(body, retry) {
    const minturn = retry ? 3 : (((body.corpsenm | 0) === PM_DEATH_R) ? 6 : 12);
    let when = minturn;
    for (; when < 67; when++)
        if (!rn2(3))
            break;
    return when;
}
/** C mon.c zombie_form */
export function zombie_form(pm) {
    switch (pm.mlet) {
        case S_ZOMBIE:
            return NON_PM;
        case S_KOBOLD:
            return PM_KOBOLD_ZOMBIE;
        case S_ORC:
            return PM_ORC_ZOMBIE;
        case S_GIANT:
            return pm.pmidx === PM_ETTIN ? PM_ETTIN_ZOMBIE : PM_GIANT_ZOMBIE;
        case S_HUMAN:
        case S_KOP:
            return (pm.mflags2 & M2_ELF) !== 0 ? PM_ELF_ZOMBIE : PM_HUMAN_ZOMBIE;
        case S_HUMANOID:
            if ((pm.mflags2 & M2_DWARF) !== 0)
                return PM_DWARF_ZOMBIE;
            return NON_PM;
        case S_GNOME:
            return PM_GNOME_ZOMBIE;
        default:
            return NON_PM;
    }
}
/** C mkobj.c special_corpse */
function special_corpse(pmIdx) {
    const n = pmIdx | 0;
    if (n === PM_LIZARD || n === PM_LICHEN)
        return true;
    const mlet = MONS_ROWS[n][0] | 0;
    return mlet === S_TROLL || is_rider_pm(n);
}
function is_rider_pm(pmIdx) {
    const n = pmIdx | 0;
    return n === PM_DEATH_R || n === PM_PESTILENCE || n === PM_FAMINE;
}
/**
 * C mkobj.c start_corpse_timeout — rotting jitter uses rnz (see mkobj.c:1414).
 * `when += rnz(rot_adjust) - rot_adjust` — first RNG inside `rnz` is rn2(1000).
 */
export function start_corpse_timeout(body) {
    if (body.corpsenm === PM_LIZARD || body.corpsenm === PM_LICHEN)
        return;
    let action = ROT_CORPSE;
    const rot_adjust = game.in_mklev ? 25 : 10;
    const moves = Math.max((game.moves) | 0, 1);
    let ageTurns = moves - (body.age | 0);
    let when;
    if (ageTurns > ROT_AGE)
        when = rot_adjust;
    else
        when = ROT_AGE - ageTurns;
    when += (rnz(rot_adjust) - rot_adjust) | 0;
    if (is_rider_pm(body.corpsenm | 0)) {
        action = REVIVE_MON;
        when = rider_revival_time(body, false);
    }
    else if ((MONS_ROWS[body.corpsenm | 0][0] | 0) === S_TROLL) {
        for (ageTurns = 2; ageTurns <= TAINT_AGE; ageTurns++)
            if (!rn2(TROLL_REVIVE_CHANCE)) { /* troll revives */
                action = REVIVE_MON;
                when = ageTurns;
                break;
            }
    }
    else if (!!game.flags?.zombify && zombie_form(permonstTemplate(body.corpsenm | 0)) !== NON_PM
        && !(body.norevive | 0)) {
        action = ZOMBIFY_MON;
        when = rn1(15, 5); /* 5..19 */
    }
    /* C mkobj.c:1436 (void) start_timer(when, TIMER_OBJECT, action,
     * obj_to_any(body)) — start_timer does the body.timed++ itself. */
    start_timer(when, TIMER_OBJECT, action, obj_to_any(body));
}

/* C mkobj.c:1473-1491 start_glob_timeout().  A zero delay requests the
 * ordinary randomized 23..27 turn interval; an explicit positive delay is
 * used when an overdue timer is caught up after returning to a level. */
export function start_glob_timeout(obj, when) {
    if (!obj?.globby)
        return;
    if (obj.timed)
        stop_timer(SHRINK_GLOB, obj_to_any(obj));
    if ((when | 0) < 1)
        when = 25 + rn2(5) - 2;
    start_timer(when | 0, TIMER_OBJECT, SHRINK_GLOB, obj_to_any(obj));
}
/**
 * C mkobj.c set_corpsenm — full port.
 */

/* C timeout.c:1204-1220 attach_fig_transform_timeout(). */
export function attach_fig_transform_timeout(obj) {
    stop_timer(FIG_TRANSFORM, obj_to_any(obj));
    start_timer(rnd(9000) + 200, TIMER_OBJECT, FIG_TRANSFORM, obj_to_any(obj));
}


export function set_corpsenm(obj, id) {
    const old_id = obj.corpsenm | 0;
    let when = 0;

    if (obj.timed) {
        if ((obj.otyp | 0) === EGG) {
            /* C mkobj.c:1302 stop_timer(HATCH_EGG, obj_to_any(obj)) — the
             * func_index was `null`, which matched no timer, so this always
             * returned 0 and the re-attach below always redrew the rnd() loop. */
            when = stop_timer(HATCH_EGG, obj_to_any(obj));
        } else {
            when = 0;
            obj_stop_timers(obj); /* corpse or figurine */
        }
    }

    if ((obj.otyp | 0) === CORPSE && (obj.oeaten | 0) !== 0
        && permonstTemplate(old_id).cnutrit !== permonstTemplate(id).cnutrit) {
        obj.oeaten = ((obj.oeaten * permonstTemplate(id).cnutrit
                       / permonstTemplate(old_id).cnutrit) >>> 0);
    }

    obj.corpsenm = id | 0;
    switch (obj.otyp | 0) {
        case CORPSE:
            start_corpse_timeout(obj);
            obj.owt = weight(obj);
            break;
        case FIGURINE:
            if (obj.corpsenm !== NON_PM && !dead_species_egg(obj.corpsenm | 0)
                && ((obj.where | 0) === OBJ_INVENT || (obj.where | 0) === 4 /* OBJ_MINVENT */))
                attach_fig_transform_timeout(obj);
            obj.owt = weight(obj);
            break;
        case EGG:
            if (obj.corpsenm !== NON_PM && !dead_species_egg(obj.corpsenm | 0))
                attach_egg_hatch_timeout(obj, when);
            break;
        default:
            obj.owt = weight(obj);
            break;
    }
}
// C ref: mkobj.c mksobj — create a specific object
async function mksobj(otyp, init, artif) {
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '3')
        pushRngLogEntry(`^mksobj[moves=${game.moves | 0} dlevel=${game.u?.uz?.dlevel | 0} otyp=${otyp | 0}]`);
    const oclass = MKOBJ_OC_CLASS[otyp] | 0;
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '1') {
        game.__mkobjTraceCount = (game.__mkobjTraceCount | 0) + 1;
        if ((game.__mkobjTraceCount | 0) <= 512)
            pushRngLogEntry(`^mkobj_trace[n=${game.__mkobjTraceCount | 0} otyp=${otyp | 0}`
                + ` class=${oclass} init=${init ? 1 : 0} artif=${artif ? 1 : 0}`
                + ` moves=${game.moves | 0}]`);
    }
    const mv = Math.max((game.moves) | 0, 1);
    /* `let`, not `const`: C's `struct obj *otmp` is REASSIGNED twice in this
       function's tail — mkobj.c:1248 `otmp = oname(otmp, noveltitle(...), ...)`
       and mkobj.c:1255 `otmp = mk_artifact(...)`.  The mk_artifact line below
       was already written against a `const` and would have thrown
       "Assignment to constant variable" the first time an oc_unique otyp
       reached mksobj(); it had not fired yet only because that path is rare. */
    let otmp = newobj({
        otyp,
        oclass,
        ox: 0,
        oy: 0,
        quan: 1,
        /* C mkobj.c:1150 `*otmp = cg.zeroobj;` — owt starts at ZERO, not 1.
         * mksobj overwrites it at :1258 with weight(otmp), so the initial value
         * is invisible for every otyp EXCEPT the one whose weight() reads it
         * back first: mkobj.c:2101 `if (obj->otyp == HEAVY_IRON_BALL &&
         * obj->owt != 0) return (int) obj->owt;`.  With 1 here that test was
         * true on a brand-new ball, so it weighed 1 instead of oc_weight 480 and
         * never reached "very heavy iron ball" (objnam.c:829) even after
         * punish()'s +160 bumps.  Inert until js/read.js punish() became the
         * first thing in the port that mksobj()s a ball. */
        owt: 0,
        cursed: false,
        blessed: false,
        olocked: false,
        spe: 0,
        corpsenm: NON_PM,
        age: mv,
        norevive: 0,
        /* C mkobj.c:1186 *otmp = cg.zeroobj — zero-initializes all fields */
        owornmask: 0, /* C mkobj.c zeroobj default; new object is not worn */
        oartifact: 0, timed: 0, bypass: 0, unpaid: 0, lamplit: 0,
        oeaten: 0, greased: 0, in_use: 0, globby: 0, oeroded: 0, oeroded2: 0,
        no_charge: 0, nomerge: 0, oerodeproof: 0, invlet: 0, otrapped: 0,
        obroken: 0,
        /* C obj.h:102 Bitfield(recharged, 3) — zero-initialized by
           *otmp = cg.zeroobj (mkobj.c:1188-1189); mksobj never assigns it
           * afterward, so every object starts with recharged=0. */
        recharged: 0,
        pickup_prev: 0, omigr_from_dnum: 0, omigr_from_dlevel: 0,
        usecount: 0, how_lost: 0,
        /* C mkobj.c:1192 otmp->where = OBJ_FREE */
        where: OBJ_FREE, /* OBJ_FREE=0; set by place_object when placed */
    });
    /* C mkobj.c:1188 — otmp->o_id = next_ident() */
    otmp.o_id = next_ident();
    /* C mkobj.c:1193 — unknow_object(otmp): "set up dknown and known: non-0
     * for some things".  Establishes known = oc_uses_known ? 0 : 1 (so wands,
     * rings, potions, scrolls, gems, spellbooks start known=1 for proper
     * merging) plus the dknown/bknown/rknown/cknown/lknown/tknown = 0 baseline.
     * Previously omitted, leaving known=undefined on every mksobj object; this
     * broke not_fully_identified() (objnam.c:1785) for fully-known starting
     * items, spuriously including them in the scroll-of-identify menu. */
    unknow_object(otmp);
    if (init)
        await mksobj_init(otmp, otyp, artif);
    /* C mkobj.c mksobj() after mksobj_init (1201–1230): corpsenm + CORPSTAT_* spe */
    const sw = (oclass === POTION_CLASS && otyp !== POT_OIL) ? POT_WATER : otyp;
    if (sw === CORPSE) {
        if (otmp.corpsenm === NON_PM) {
            otmp.corpsenm = undead_to_corpse(rndmonnum());
            /* C mkobj.c:1208 — svm.mvitals[corpsenm].mvflags & (G_NOCORPSE | G_GONE).
               mvflags is the DYNAMIC per-game state, seeded at start with
               (mons[i].geno & G_NOCORPSE) (allmain.c:853) and gaining G_GONE
               (genocide/extinction) bits at runtime. It is NOT the static
               mons[].geno field — geno's low bits are the G_FREQ creation
               frequency, which must not be misread as a genocide flag. */
            const cm = otmp.corpsenm | 0;
            const mvflags = ((MONS_ROWS[cm][3] | 0) & G_NOCORPSE)
                | ((game.mvitals?.[cm]?.mvflags | 0) & G_GONE);
            if ((mvflags & (G_NOCORPSE | G_GONE)) !== 0)
                otmp.corpsenm = uroleMnum();
        }
    }
    if (sw === CORPSE || sw === STATUE || sw === FIGURINE) {
        if (otmp.corpsenm === NON_PM)
            otmp.corpsenm = rndmonnum();
        if (otmp.corpsenm !== NON_PM) {
            const mf2 = MONS_ROWS[otmp.corpsenm][7] | 0;
            otmp.spe = (mf2 & M2_NEUTER) !== 0 ? CORPSTAT_NEUTER
                : (mf2 & M2_FEMALE) !== 0 ? CORPSTAT_FEMALE
                    : (mf2 & M2_MALE) !== 0 ? CORPSTAT_MALE
                        : (rn2(2) ? CORPSTAT_FEMALE : CORPSTAT_MALE);
        }
    }
    /* C mkobj.c:1227–1230 fallthrough sets corpsenm-derived state + corpse timer */
    if (sw === CORPSE || sw === STATUE || sw === FIGURINE || otyp === EGG) {
        set_corpsenm(otmp, otmp.corpsenm);
    }
    /* C mkobj.c:1231–1250 — the remaining switch arms. corpsenm is a union
       (obj.h:160–165: leashmon/fromsink/next_boulder/novelidx all #define to
       corpsenm), so these field=0 assignments overwrite the NON_PM (-1) that
       mksobj set at creation, leaving corpsenm == 0. */
    else if (sw === BOULDER) {
        /* C mkobj.c:1232–1237 — next_boulder overloads corpsenm; default
           NON_PM is non-zero so xname()'s "next boulder" case would fire
           when it shouldn't; explicitly set it to 0. */
        otmp.next_boulder = 0; /* #define next_boulder corpsenm → corpsenm = 0 */
    }
    else if (sw === POT_OIL || sw === POT_WATER) {
        /* C mkobj.c:1238–1245 — POT_OIL sets age then FALLTHRU to POT_WATER.
           sw collapses every non-POT_OIL potion to POT_WATER (line above), so
           this arm covers all POTION_CLASS objects. fromsink overloads
           corpsenm; clearing it leaves corpsenm == 0. */
        if (otyp === POT_OIL)
            otmp.age = MAX_OIL_IN_FLASK; /* amount of oil */
        otmp.fromsink = 0; /* #define fromsink corpsenm → corpsenm = 0 */
    }
    else if (sw === LEASH) {
        /* C mkobj.c:1246–1248 — leashmon overloads corpsenm; clearing it
           leaves corpsenm == 0. */
        otmp.leashmon = 0; /* #define leashmon corpsenm → corpsenm = 0 */
    }
    else if (sw === SPE_NOVEL) {
        otmp.novelidx = -1; /* "none of the above"; will be changed */
        const novidx = { value: otmp.novelidx | 0 }; /* C's `&otmp->novelidx` */
        const title = noveltitle(novidx);
        otmp.novelidx = novidx.value | 0;
        otmp = oname(otmp, title, ONAME_NO_FLAGS);
    }
    if (game._oc_unique && game._oc_unique[otmp.otyp | 0] && !otmp.oartifact)
        otmp = mk_artifact(otmp, A_NONE, 99, false);
    /* C mkobj.c:1258 — otmp->owt = weight(otmp); final weight computation
       after all init/corpsenm/switch handling. */
    otmp.owt = weight(otmp);
    return otmp;
}
const little_to_big_pm = little_to_big;
const big_to_little_pm = big_to_little;
/**
 * C mon.c can_be_hatched (mon.c:5534) — can mnum hatch from an egg?
 * Always calls rn2(77) (BREEDER_EGG) when lays_eggs is true.
 * KILLER_BEE (1) and GARGOYLE (41) short-circuit without rn2(77).
 */
export function can_be_hatched(mnum) {
    if (mnum === 364 /* PM_SCORPIUS */)
        mnum = 97 /* PM_SCORPION */;
    mnum = little_to_big_pm(mnum);
    if (mnum === 1 /* PM_KILLER_BEE */ || mnum === 41 /* PM_GARGOYLE */)
        return mnum;
    if (mnum >= 0 && mnum < MONS_ROWS.length
        && (MONS_ROWS[mnum][6] & M1_OVIPAROUS) !== 0) {
        /* BREEDER_EGG = !rn2(77) — always consumed when lays_eggs(mnum) */
        if (!rn2(77) || (mnum !== 5 /* PM_QUEEN_BEE */ && mnum !== 42 /* PM_WINGED_GARGOYLE */))
            return mnum;
    }
    return NON_PM;
}
export function dead_species(m_idx, egg) {
    /* generic eggs are unhatchable and have corpsenm of NON_PM */
    if (m_idx < LOW_PM)
        return true;
    /* For monsters with both baby and adult forms, genociding either form
       kills all eggs of that monster. */
    const alt_idx = egg ? big_to_little_pm(m_idx) : m_idx;
    const genod = (m) => (((game.mvitals && game.mvitals[m]
                            ? game.mvitals[m].mvflags : 0) | 0) & G_GENOD) !== 0;
    return genod(m_idx) || genod(alt_idx);
}
/* The egg=TRUE call shape mksobj/set_corpsenm use.  Kept as a named local so
 * the three call sites below read like C's `dead_species(mndx, TRUE)`. */
function dead_species_egg(mnum) {
    return dead_species(mnum, true);
}
/** C eat.c nonrotting_corpse macro (eat.c:58) */
function nonrotting_corpse_pm(mnum) {
    return mnum === PM_LIZARD || mnum === PM_LICHEN
        || is_rider_pm(mnum) || mnum === PM_ACID_BLOB;
}
/**
 * C eat.c set_tin_variety(otmp, RANDOM_TIN) (eat.c:1480-1485) — rn2(TTSZ-1)=rn2(15).
 * Returns variety index (0=ROTTEN, 1=HOMEMADE, ...).
 */
function tin_variety_random(mnum) {
    const ROTTEN_TIN = 0;
    const HOMEMADE_TIN = 1;
    let r = rn2(15); /* rn2(TTSZ - 1), TTSZ=16 */
    if (r === ROTTEN_TIN && nonrotting_corpse_pm(mnum))
        r = HOMEMADE_TIN;
    return r;
}
// C ref: mkobj.c mksobj_init — initialize object fields with RNG (mkobj.c:870-1176)
async function mksobj_init(otmp, otyp, artif) {
    const oc = MKOBJ_OC_CLASS[otyp] | 0;
    if (oc === WEAPON_CLASS) {
        /* C mkobj.c mksobj_init WEAPON_CLASS (mkobj.c:877-895)
         * 878: quan = is_multigen(otmp) ? rn1(6, 6) : 1 — hack.h rn1(x,y)=rn2(x)+y so leaf is rn2(6).
         * 887: is_poisonable(otmp) && !rn2(100) — obj.h: missile range or permapoisoned(Grimtooth);
         *    Grimtooth is assigned later via mk_artifact, so only missile-range matters here. */
        const sk = MKOBJ_OC_SKILL[otyp] | 0;
        const is_mgen = sk >= -P_SHURIKEN && sk <= -P_BOW;
        otmp.quan = is_mgen ? rn1(6, 6) : 1;
        if (!rn2(11)) {
            otmp.spe = rne(3);
            otmp.blessed = !!rn2(2);
        }
        else if (!rn2(10)) {
            curse(otmp);
            otmp.spe = -rne(3);
        }
        else {
            blessorcurse(otmp, 10);
        }
        if (is_mgen && !rn2(100))
            otmp.opoisoned = 1;
        if (artif && !rn2(20 + (10 * nartifact_exist())))
            mk_artifact(otmp, A_NONE, 99, true);
        mkobj_erosions(otmp);
        return;
    }
    if (oc === FOOD_CLASS) {
        /* C mkobj.c mksobj_init FOOD_CLASS (mkobj.c:896-976) */
        otmp.oeaten = 0;
        if (otyp === CORPSE) {
            /* C mkobj.c:899-911 — rndmonnum loop to find non-G_NOCORPSE corpse */
            let tryct = 50;
            do {
                otmp.corpsenm = undead_to_corpse(rndmonnum());
            } while (((MONS_ROWS[otmp.corpsenm][3] | 0) & G_NOCORPSE) !== 0
                && (--tryct > 0));
            if (tryct === 0)
                otmp.corpsenm = PM_HUMAN;
        }
        else if (otyp === EGG) {
            /* C mkobj.c:914-923 — rn2(3) at mkobj.c:916 is the divergence target */
            otmp.corpsenm = NON_PM; /* generic egg */
            if (!rn2(3))
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = can_be_hatched(rndmonnum());
                    if (mndx !== NON_PM && !dead_species_egg(mndx)) {
                        otmp.corpsenm = mndx; /* typed egg */
                        break;
                    }
                }
        }
        else if (otyp === TIN) {
            /* C mkobj.c:926-940 */
            otmp.corpsenm = NON_PM; /* empty so far */
            if (!rn2(6)) {
                otmp.spe = 1; /* SPINACH_TIN */
            }
            else {
                for (let tryct = 200; tryct > 0; --tryct) {
                    const mndx = undead_to_corpse(rndmonnum());
                    if (mons_cnutrit(mndx)
                        && ((MONS_ROWS[mndx][3] | 0) & G_NOCORPSE) === 0) {
                        otmp.corpsenm = mndx;
                        otmp.spe = -(tin_variety_random(mndx) + 1); /* RANDOM_TIN */
                        break;
                    }
                }
            }
            blessorcurse(otmp, 10);
        }
        else if (otyp === SLIME_MOLD) {
            if (!game.ffruit)
                init_fruit_chain();
            otmp.spe = game.svc.context.current_fruit;
            if (!game.flags) game.flags = {};
            game.flags.made_fruit = true;
        }
        else if (otyp === KELP_FROND) {
            /* C mkobj.c:946-948 */
            otmp.quan = rnd(2);
        }
        else if (otyp === CANDY_BAR) {
            /* C read.c:307-308 assign_candy_wrapper — rn2(SIZE(candy_wrappers)-1); 13 entries so SIZE-1=12 */
            otmp.spe = 1 + rn2(12);
        }
        /* C mkobj.c:956-975 Is_pudding check */
        if (otyp === GLOB_OF_GRAY_OOZE || otyp === GLOB_OF_BROWN_PUDDING
            || otyp === GLOB_OF_GREEN_SLIME || otyp === GLOB_OF_BLACK_PUDDING) {
            otmp.globby = 1;
            otmp.quan = 1;
            otmp.owt = OC_WEIGHT[otyp] | 0;
            otmp.known = otmp.dknown = 1;
            otmp.corpsenm = PM_GRAY_OOZE_MK + (otyp - GLOB_OF_GRAY_OOZE); /* mkobj.c:967 */
            start_glob_timeout(otmp, 0);
        }
        else {
            /* C mkobj.c:971-975 — general food quan=2 for non-special cases */
            if (otyp !== CORPSE && otyp !== MEAT_RING && otyp !== KELP_FROND && !rn2(6))
                otmp.quan = 2;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === GEM_CLASS) {
        /* C mkobj.c mksobj_init GEM_CLASS (mkobj.c:977–986) */
        otmp.corpsenm = 0;
        if (otyp === LOADSTONE)
            curse(otmp);
        else if (otyp === ROCK)
            otmp.quan = rn1(6, 6);
        else if (otyp !== LUCKSTONE && !rn2(6))
            otmp.quan = 2;
        else
            otmp.quan = 1;
        mkobj_erosions(otmp);
        return;
    }
    if (oc === ROCK_CLASS && otyp === STATUE) {
        /* C mkobj.c mksobj_init ROCK_CLASS + STATUE (mkobj.c:1151–1158) */
        otmp.corpsenm = rndmonnum();
        const msize = MONS_MSIZE[otmp.corpsenm] | 0;
        if (msize >= MZ_SMALL
            && rn2(Math.trunc(levelDifficulty() / 2) + 10) > 10) {
            await add_to_container(otmp, (await mkobj(SPBOOK_no_NOVEL, false)));
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === ARMOR_CLASS) {
        /* C mkobj.c mksobj_init ARMOR_CLASS (mkobj.c:1086–1115) */
        if (rn2(10)
            && (otyp === FUMBLE_BOOTS
                || otyp === LEVITATION_BOOTS
                || otyp === HELM_OF_OPPOSITE_ALIGNMENT
                || otyp === GAUNTLETS_OF_FUMBLING
                || !rn2(11))) {
            curse(otmp);
            otmp.spe = -rne(3);
        }
        else if (!rn2(10)) {
            otmp.blessed = rn2(2) !== 0;
            otmp.spe = rne(3);
        }
        else {
            blessorcurse(otmp, 10);
        }
        if (artif && !rn2(40 + (10 * nartifact_exist())))
            mk_artifact(otmp, A_NONE, 99, true);
        /* C ref: mkobj.c:1104-1113 "simulate lacquered armor for samurai":
         *   if (Role_if(PM_SAMURAI) && otmp->otyp == SPLINT_MAIL
         *       && (svm.moves <= 1 || In_quest(&u.uz)))
         *       otmp->oerodeproof = otmp->rknown = 1;
         * Role_if(PM_SAMURAI) is the role-index test (urole.malenum == PM_SAMURAI);
         * the player-role index for Samurai is initrole 9 (roles.js mnum 9).
         * (The "ROLE_INITROLE_TO_PM[] maps to quest-leader pms" note that used
         * to sit here described a DEFECT in that table, not a design: it was the
         * player-role list shifted +7.  Fixed above; the index compare here is
         * still correct and is left alone.) */
        if (ROLE_IF_SAMURAI() && otyp === SPLINT_MAIL
            && (((game.moves | 0) <= 1) || In_quest(game.u?.uz))) {
            otmp.oerodeproof = otmp.rknown = 1;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === TOOL_CLASS) {
        /* C mkobj.c mksobj_init TOOL_CLASS (mkobj.c:988–1059) */
        switch (otyp) {
            case TALLOW_CANDLE:
            case WAX_CANDLE:
                otmp.spe = 1;
                otmp.age = 20 * (otyp === TALLOW_CANDLE ? 10 : 20);
                otmp.lamplit = 0;
                otmp.quan = 1 + (rn2(2) ? rn2(7) : 0);
                blessorcurse(otmp, 5);
                break;
            case BRASS_LANTERN:
            case OIL_LAMP:
                otmp.spe = 1;
                otmp.age = rn1(500, 1000);
                otmp.lamplit = 0;
                blessorcurse(otmp, 5);
                break;
            case MAGIC_LAMP:
                otmp.spe = 1;
                otmp.lamplit = 0;
                blessorcurse(otmp, 2);
                break;
            case CHEST:
            case LARGE_BOX:
                otmp.olocked = !!rn2(5);
                otmp.otrapped = !rn2(10);
                otmp.tknown = !!(otmp.otrapped && !rn2(100));
            /* FALLTHRU */
            case ICE_BOX:
            case SACK:
            case OILSKIN_SACK:
            case BAG_OF_HOLDING:
                await mkbox_cnts(otmp);
                break;
            case EXPENSIVE_CAMERA:
            case TINNING_KIT:
            case MAGIC_MARKER:
                otmp.spe = rn1(70, 30);
                break;
            case CAN_OF_GREASE:
                otmp.spe = rn1(21, 5);
                blessorcurse(otmp, 10);
                break;
            case CRYSTAL_BALL:
                otmp.spe = rn1(5, 3);
                blessorcurse(otmp, 2);
                break;
            case HORN_OF_PLENTY:
            case BAG_OF_TRICKS:
                otmp.spe = rn1(18, 3);
                break;
            case FIGURINE: {
                let tryct = 0;
                do {
                    otmp.corpsenm = rndmonnumAdj(5, 10);
                } while (mons_is_human(otmp.corpsenm) && tryct++ < 30);
                blessorcurse(otmp, 4);
                break;
            }
            case BELL_OF_OPENING:
                otmp.spe = 3;
                break;
            case MAGIC_FLUTE:
            case MAGIC_HARP:
            case FROST_HORN:
            case FIRE_HORN:
            case DRUM_OF_EARTHQUAKE:
                otmp.spe = rn1(5, 4);
                break;
            default:
                break;
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === RING_CLASS) {
        /* C mkobj.c mksobj_init RING_CLASS (mkobj.c:1129–1150) */
        if (ringOcCharged(otyp)) {
            blessorcurse(otmp, 3);
            if (rn2(10)) {
                if (rn2(10) && bcsign(otmp))
                    otmp.spe = bcsign(otmp) * rne(3);
                else
                    otmp.spe = rn2(2) ? rne(3) : -rne(3);
            }
            if (otmp.spe === 0)
                otmp.spe = rn2(4) - rn2(3);
            if (otmp.spe < 0 && rn2(5))
                curse(otmp);
        }
        else if (rn2(10) && (otyp === RIN_TELEPORTATION
            || otyp === RIN_POLYMORPH
            || otyp === RIN_AGGRAVATE_MONSTER
            || otyp === RIN_HUNGER
            || !rn2(9))) {
            curse(otmp);
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === AMULET_CLASS) {
        /* C mkobj.c mksobj_init AMULET_CLASS (mkobj.c:1061–1070) */
        if (otyp === AMULET_OF_YENDOR) {
            const g = game;
            if (!g.svc)
                g.svc = {};
            if (!g.svc.context)
                g.svc.context = {};
            g.svc.context.made_amulet = true;
        }
        if (rn2(10) && (otyp === AMULET_OF_STRANGULATION
            || otyp === AMULET_OF_CHANGE
            || otyp === AMULET_OF_RESTFUL_SLEEP)) {
            curse(otmp);
        }
        else {
            blessorcurse(otmp, 10);
        }
        mkobj_erosions(otmp);
        return;
    }
    if (oc === SPBOOK_CLASS) {
        /* C mkobj.c mksobj_init SPBOOK_CLASS (mkobj.c:1082–1085) */
        otmp.spestudied = 0;
        blessorcurse(otmp, 17);
        mkobj_erosions(otmp);
        return;
    }
    if (oc === WAND_CLASS) {
        /* C mkobj.c mksobj_init WAND_CLASS (mkobj.c:1116–1127) */
        if (otyp === WAN_WISHING)
            otmp.spe = 1;
        else if (otyp === WAN_STASIS)
            otmp.spe = rn1(4, 3);
        else {
            const nodir = otyp >= WAN_LIGHT && otyp <= WAN_STASIS;
            otmp.spe = rn1(5, nodir ? 11 : 4);
        }
        blessorcurse(otmp, 17);
        otmp.recharged = 0;
        mkobj_erosions(otmp);
        return;
    }
    if (oc === POTION_CLASS || oc === SCROLL_CLASS) {
        const SCR_MAIL = 364;
        if (otyp !== SCR_MAIL)
            blessorcurse(otmp, 4);
    }
    mkobj_erosions(otmp);
}
// C ref: objnam.c rnd_class (5401–5417)
export function rnd_class(first, last) {
    let sum = 0;
    for (let i = first; i <= last; i++)
        sum += MKOBJ_OC_PROB[i] | 0;
    if (!sum)
        return rn1(last - first + 1, first);
    let x = rnd(sum);
    for (let i = first; i <= last; i++) {
        x -= MKOBJ_OC_PROB[i];
        if (x <= 0)
            return i;
    }
    return first;
}
function _gm_migrating() {
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

export function add_to_migration(obj) {
    const g = game;
    const gm = _gm_migrating();

    /* C: if (obj->where != OBJ_FREE) panic(...).  `where` is not written by
     * every js/ object producer, so an absent field is treated as OBJ_FREE
     * (what mksobj leaves behind) rather than as a violation. */
    const where = (obj.where === undefined || obj.where === null) ? OBJ_FREE : (obj.where | 0);
    if (where !== OBJ_FREE)
        throw new Error(`add_to_migration: obj where=${where}, not free`);

    /* C: obj->no_charge = 0 — only relevant while inside a shop */
    obj.no_charge = 0;

    /* C: if (Is_container(obj)) maybe_reset_pick(obj) — the lock-picking
     * context goes stale when the container leaves the level.  RNG-free.
     * Is_container(o) is objects[otyp].oc_class == TOOL_CLASS && otyp >=
     * LARGE_BOX && otyp <= BAG_OF_TRICKS; js/ spells the otyp range test three
     * times already (js/makemon.js:3857, js/shk.js:1304, js/mklev.js:4108) —
     * this is the range those agree on. */
    const LARGE_BOX_DK = 214, BAG_OF_TRICKS_DK = 220;
    if ((obj.otyp | 0) >= LARGE_BOX_DK && (obj.otyp | 0) <= BAG_OF_TRICKS_DK)
        maybe_reset_pick(obj);

    obj.where = OBJ_MIGRATING;
    obj.nobj = gm.migrating_objs;
    obj.omigr_from_dnum = (g.u?.uz?.dnum | 0);
    obj.omigr_from_dlevel = (g.u?.uz?.dlevel | 0);
    gm.migrating_objs = obj;
}

/* mksobj_migr_to_species — C ref: mkobj.c:252-266.  "used for extra orctown
 * loot": make the object, park it on the migrating chain, and mark it as owed
 * to the first monster of species `mflags2` that gets created anywhere
 * (makemon.c:1469 -> deliver_obj_to_mon below).
 *
 * C's home for this is mkobj.c (js/mklev.js), but the whole migration
 * machinery it depends on — add_to_migration, obj_extract_self,
 * deliver_obj_to_mon, add_to_minv — already lives in THIS file, and
 * js/mklev.js does not import js/dokick.js (adding that edge would close a
 * module cycle mklev<->dokick that does not exist today).  Kept here with the
 * C reference stated rather than opening the cycle for one function.
 *
 * NOTE obj.h:164 `#define migr_species corpsenm` — in C these are the SAME
 * FIELD.  js/dokick.js's deliver_obj_to_mon reads both spellings (`migr_species`
 * for the species test, `corpsenm` for the "&M2_ORC -> steal the gang name"
 * test), so both must be written or the ORC arm silently reads mksobj's
 * corpsenm = NON_PM (-1), whose & M2_ORC is non-zero — i.e. it would fire for
 * EVERY species. */
export async function mksobj_migr_to_species(otyp, mflags2, init, artif) {
    const otmp = await mksobj(otyp, init, artif);
    add_to_migration(otmp);
    otmp.owornmask = MIGR_TO_SPECIES;
    otmp.migr_species = mflags2 | 0;
    otmp.corpsenm = mflags2 | 0; /* same field in C — see note above */
    return otmp;
}

/* C mkobj.c:239-249 — mksobj_at: make specific object then place it */
async function mksobj_at(otyp, x, y, init, artif) {
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '2')
        pushRngLogEntry(`^mksobj_at[otyp=${otyp | 0} xy=${x | 0},${y | 0}]`);
    const otmp = await mksobj(otyp, init, artif);
    place_object(otmp, x, y);
    return otmp;
}
// C ref: mkobj.c mkobj (270–302)
// Use == for RANDOM_CLASS: C passes int 0 / FALSE; strict === misses boolean false
// from bad call sites and skips rnd(100), consuming rnd(2) in next_ident instead.
async function mkobj(oclass, artif) {
    let tprob;
    let i;
    let prob;
    // C invariant: objects[].oc_prob for GEM_CLASS is level-dependent --
    // mklev.c:1264 calls oinit()->setgemprobs(&u.uz) as the FIRST thing
    // the shared table already reflects the current dungeon level. This
    // function's own makelevel() (below) already calls oinit() the same
    // way, so this is a no-op RNG-free recompute in ordinary play -- but a
    // game.u.uz from state_before without re-running that level-entry step,
    // so MKOBJ_OC_PROB can still hold a stale (level-0 default) gem
    // distribution. Refresh it here so the GEM_CLASS walk below sees the
    // were __return__.otyp landing one GEM_CLASS slot off (e.g. obsidian
    oinit();
    if (oclass == RANDOM_CLASS) {
        const uz = game.u?.uz;
        const iprobs = Is_rogue_level(uz)
            ? rogueprobs
            : In_hell(uz)
                ? hellprobs
                : mkobjprobs;
        let idx = 0;
        for (tprob = rnd(100); (tprob -= iprobs[idx].iprob) > 0; idx++)
            continue;
        oclass = iprobs[idx].iclass;
    }
    if (oclass === SPBOOK_no_NOVEL) {
        i = rnd_class(MKOBJ_SVB_BASES[SPBOOK_CLASS], SPE_BLANK_PAPER);
        oclass = SPBOOK_CLASS;
    }
    else {
        prob = rnd(MKOBJ_OCLASS_PROB_TOTALS[oclass]);
        i = MKOBJ_SVB_BASES[oclass];
        while ((prob -= MKOBJ_OC_PROB[i]) > 0)
            ++i;
    }
    if ((MKOBJ_OC_CLASS[i] | 0) !== oclass)
        i = MKOBJ_SVB_BASES[oclass];
    if (typeof process !== 'undefined' && ENV?.FF_MKOBJ_TRACE === '1')
        pushRngLogEntry(`^mkobj_pick[class=${oclass | 0} otyp=${i | 0} artif=${artif ? 1 : 0}]`);
    return await mksobj(i, true, artif);
}
/* C mkobj.c:228-235 — mkobj_at: make random-class object then place it */
export async function mkobj_at(oclass, x, y, artif) {
    const otmp = await mkobj(oclass, artif);
    place_object(otmp, x, y);
    return otmp;
}
/* C mkobj.c:2004-2021 — mkgold: place or merge a gold pile at (x,y). */
export async function mkgold(amount, x, y) {
    const goldTrace = typeof process !== 'undefined' && ENV?.FF_MKGOLD_TRACE === '1';
    if (goldTrace)
        pushRngLogEntry(`^mkgold_enter[amount=${amount | 0} xy=${x | 0},${y | 0}]`);
    if (amount <= 0) {
        // C mkobj.c:2008-2010
        const depthVal = depth_of_level(game.u?.uz);
        const mul = rnd(Math.trunc(30 / Math.max(12 - depthVal, 2)));
        amount = 1 + rnd(level_difficulty() + 2) * mul;
    }
    // C invent.c:1612-1623 g_at(x,y) — walk the per-tile nexthere chain
    // (svl.level.objects[x][y]) for the first COIN_CLASS object. Was a
    // private _goldObjs Map keyed off mkgold's own prior calls in the same
    // is reconstructed from state_before, not from mkgold call history), so
    // the merge branch could never trigger under replay even when C's fobj
    // chain already had a gold pile there — walk the real levelObjects
    // chain instead, exactly like the existing sobj_at() helper.
    let gold = (game.level?.levelObjects?.[x]?.[y]) ?? null;
    while (gold && (gold.oclass | 0) !== COIN_CLASS)
        gold = gold.nexthere ?? null;
    if (goldTrace)
        pushRngLogEntry(`^mkgold_existing[xy=${x | 0},${y | 0} yes=${gold ? 1 : 0}]`);
    if (gold) {
        // C mkobj.c:2013-2015 — merge into existing pile (no new mksobj/next_ident)
        gold.quan += amount;
        // does not emit obroken/usecount/recharged — those ride the narrower
        // OBJ_CHAIN_FIELD_ORDER / STRUCT_FIELDS lists in
        // js/struct_reconstructor.js, neither of which backs this channel — so
        // an existing pile fetched off game.level.levelObjects during replay
        // can read these as `undefined`. C's cg.zeroobj-initialized gold
        // object has always carried them as 0, and nothing in NetHack ever
        // locks/breaks (obroken), recharges (recharged), or "uses"
        // (usecount/wishedfor) a COIN_CLASS object, so 0 is the true and only
        // value they can ever hold here; backfill rather than leave missing.
        if (gold.obroken === undefined) gold.obroken = 0;
        if (gold.usecount === undefined) gold.usecount = 0;
        if (gold.recharged === undefined) gold.recharged = 0;
    }
    else {
        // C mkobj.c:2016-2017 — mksobj_at(GOLD_PIECE, x, y, TRUE, FALSE) then set quan
        gold = (await mksobj_at(GOLD_PIECE, x, y, true, false));
        gold.quan = amount;
    }
    gold.owt = weight(gold);
    return gold;
}
// ── shknam.c port ─────────────────────────────────────────────────────────────
// C ref: nethack-c/src/shknam.c
/** C: PM_SHOPKEEPER (pm.generated.js index 271) */
const PM_SHOPKEEPER = 271;
/** C objects.h: POT_FULL_HEALING (potion base 297 + pos 18) */
const POT_FULL_HEALING = 315;
/** C objects.h otyp values needed by shknam.c */
const SCR_CHARGING = 342; /* scroll base 323 + pos 19 */
const TOUCHSTONE_SHK = 472; /* gem, matches u_init.js TOUCHSTONE_OTYP */
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
/* C shknam.c:439 shop_string(rtype) — actually dungeon.c:3441, the "short shop
 * description" #overview's print_mapseen annotates a level's shop with.  It
 * lives here because it is the only reader of shtypes[].annotation (mkroom.h:29,
 * "simpler name for #overview; Null if same"), the column this table was
 * missing entirely.  SHOPBASE == 14 (mkroom.h:66). */
export function shop_string(rtype) {
    const shoptype = (rtype | 0) - 14 /* SHOPBASE */;
    if (shoptype < 0)
        return 'untended shop';
    const row = _shtypes[shoptype];
    if (row && row.annotation)
        return row.annotation;
    if (row && row.name)
        return row.name;
    return 'shop?';   /* C's catchall */
}
/* C shknam.c:52 shtypes[] — the whole row, for saleable()'s iprobs scan
 * (js/shk.js).  shtype_name() above already exposes the `name` field; this
 * gives the `symb` and `iprobs` the same table carries. */
export function shtype_row(i) {
    return _shtypes[i | 0];
}
/* C shknam.c:829-838 get_shop_item(type) — rnd(100) weighted pick */
export function get_shop_item(type) {
    const shp = _shtypes[type];
    let j = rnd(100);
    for (let i = 0; i < shp.iprobs.length; i++) {
        j -= shp.iprobs[i].iprob;
        if (j <= 0)
            return shp.iprobs[i].itype;
    }
    return shp.iprobs[0].itype;
}
/* C shknam.c:378-405 — staticfn boolean veggy_item(struct obj *obj, int otyp).
 * Only the obj == NULL ("just a type") shape is reachable from shkveg(); C
 * pins corpsenm to PM_LICHEN in that case, calling it "veggy standin":
 *
 *     if (oclass == FOOD_CLASS) {
 *         if (objects[otyp].oc_material == VEGGY || otyp == EGG) return TRUE;
 *         if (otyp == TIN && corpsenm == NON_PM) return obj->spe == 1;
 *         if (otyp == TIN || otyp == CORPSE)
 *             return ismnum(corpsenm) && vegetarian(&mons[corpsenm]);
 *     }
 *
 * With corpsenm == PM_LICHEN the second arm cannot fire (PM_LICHEN != NON_PM,
 * and that arm is flagged "implies obj is non-null"), so the THIRD arm decides
 * TIN and CORPSE — and a lichen is S_FUNGUS, hence vegan, hence vegetarian.
 * Both therefore count. */
function veggy_item_type(otyp) {
    const VEGGY_MAT = 3; /* objclass.h VEGGY */
    const corpsenm = PM_LICHEN; /* C: veggy standin */
    if ((MKOBJ_OC_CLASS[otyp] | 0) !== FOOD_CLASS)
        return false;
    if ((MKOBJ_OC_MATERIAL[otyp] | 0) === VEGGY_MAT || otyp === EGG)
        return true;
    if (otyp === TIN || otyp === CORPSE)
        return ismnum(corpsenm) && vegetarian(permonstTemplate(corpsenm));
    return false;
}

function shkveg() {
    const foodStart = MKOBJ_SVB_BASES[FOOD_CLASS] | 0; /* 264 */
    const foodEnd = MKOBJ_SVB_BASES[FOOD_CLASS + 1] | 0; /* 297 */
    let ok = [];
    let maxprob = 0;
    for (let i = foodStart; i < foodEnd; i++) {
        if (veggy_item_type(i)) {
            ok.push(i);
            maxprob += (MKOBJ_OC_PROB[i] | 0);
        }
    }
    if (maxprob < 1)
        return foodStart; /* panic fallback */
    let prob = rnd(maxprob);
    for (let k = 0; k < ok.length; k++) {
        prob -= (MKOBJ_OC_PROB[ok[k]] | 0);
        if (prob <= 0)
            return ok[k];
    }
    return ok[0];
}
/* C shknam.c mkveggy_at(sx,sy) — make a random veggy food item */
async function mkveggy_at(sx, sy) {
    const otyp = shkveg();
    const obj = await mksobj_at(otyp, sx, sy, true, true);
    if (obj && obj.otyp === TIN)
        set_tin_variety(obj, HEALTHY_TIN); // C shknam.c:448
}
/*
 * C shknam.c:454-483 mkshobj_at(shp,sx,sy,mkspecl) — make shop object at cell.
 * C ref: nethack-c/src/shknam.c:454
 * RNG: rn2(100) (mimic check), then get_shop_item (rnd(100)), then mksobj/makemon init.
 */
async function mkshobj_at_shk(shp, shpIndx, sx, sy, mkspecl) {
    /* C: 3.6 tribute — special-case bookshops on first matching cell */
    if (mkspecl && (shp.name === "rare books" || shp.name === "second-hand bookstore")) {
        const novel = await mksobj_at(SPE_NOVEL, sx, sy, false, false);
        if (novel)
            (game.context = game.context || {}).tributeBookstock = true;
        return;
    }
    const depthVal = depth_of_level(game.u?.uz) | 0;
    /* C: rn2(100) < depth(&u.uz) && !MON_AT(sx,sy) && makemon(mimic) */
    if (rn2(100) < depthVal) {
        /* C: MON_AT(sx,sy) — check if monster present; JS: scan fmon */
        let hasMon = false;
        for (let m = game.fmon; m; m = m.nmon) {
            if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C MON_AT reads the grid, which m_detach cleared */
            if (m.mx === sx && m.my === sy) {
                hasMon = true;
                break;
            }
        }
        if (!hasMon) {
            const S_MIMIC = 13; /* defsym.h S_MIMIC */
            const ptr = mkclass(S_MIMIC);
            if (ptr != null) {
                /* C: makemon(ptr, sx, sy, NO_MM_FLAGS) */
                await makemon(ptr, sx, sy, 0);
                return;
            }
        }
    }
    const atype = get_shop_item(shpIndx);
    if (atype === VEGETARIAN_CLASS_SHK) {
        await mkveggy_at(sx, sy);
    }
    else if (atype < 0) {
        /* C: mksobj_at(-atype, sx, sy, TRUE, TRUE) */
        await mksobj_at(-atype, sx, sy, true, true);
    }
    else {
        /* C: mkobj_at(atype, sx, sy, TRUE) */
        await mkobj_at(atype, sx, sy, true);
    }
}
/*
 * C shknam.c:486-554 nameshk(shk, nlp) — assign shopkeeper name.
 * RNG: rn2(names_avail) only for shktools path or random fallback.
 * C ref: nethack-c/src/shknam.c:486
 */
function nameshk_shk(shk, nlp, shpNlpId) {
    const IS_SHKTOOLS = (shpNlpId === 8); /* index 8 = hardware store = _shktools */
    const IS_SHKLIGHT = (shpNlpId === 11); /* index 11 = lighting = _shklight */
    let shname = null;
    /* C: if (nlp == shklight && In_mines(&u.uz) && sptr->flags.town) → Izchak */
    if (IS_SHKLIGHT && In_mines(game.u?.uz)) {
        const sptr = Is_special(game.u?.uz);
        if (sptr?.flags?.town) {
            shname = "+Izchak";
            shk.female = 0;
        }
    }
    if (shname) {
        /* already set by Izchak special case */
        if (shk.mextra)
            shk.mextra.eshk = shk.mextra.eshk || {};
        if (shk.mextra?.eshk)
            shk.mextra.eshk.shknam = shname;
        return;
    }
    /* C: nseed = (int)((long)ubirthday / 257L) */
    const ubirthday = game.u?.ubirthday ?? 0;
    const nseed = Math.trunc(ubirthday / 257) | 0;
    let name_wanted = (shk.m_id | 0);
    name_wanted += (game.u?.uz ? ledger_no(game.u.uz) : 0);
    name_wanted += (nseed % 13) - (nseed % 5);
    if (name_wanted < 0)
        name_wanted += 18;
    shk.female = name_wanted & 1;
    const names_avail_init = nlp.length;
    let names_avail = names_avail_init;
    let curNlp = nlp;
    name_wanted = name_wanted % names_avail;
    for (let trycnt = 0; trycnt < 50; trycnt++) {
        if (IS_SHKTOOLS) {
            shname = curNlp[rn2(names_avail)]; /* C: shktools[rn2(names_avail)] */
            shk.female = 0;
        }
        else if (name_wanted < names_avail) {
            shname = curNlp[name_wanted];
        }
        else {
            const i = rn2(names_avail);
            if (i !== 0) {
                shname = curNlp[i - 1];
            }
            else if (curNlp !== _shkgeneral) {
                curNlp = _shkgeneral;
                names_avail = curNlp.length;
                continue;
            }
            else {
                shname = shk.female ? "-Lucrezia" : "+Dirk";
            }
        }
        /* C: gender prefix */
        if (shname[0] === '_' || shname[0] === '-')
            shk.female = 1;
        else if (shname[0] === '|' || shname[0] === '+')
            shk.female = 0;
        /* C: check name not already used */
        let nameUsed = false;
        for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
            if ((mtmp.mhp | 0) < 1 || !mtmp.isshk || mtmp === shk) /* C shknam.c:540 DEADMONSTER || mtmp==shk || !isshk */
                continue;
            if (mtmp.mextra?.eshk?.shknam === shname) {
                name_wanted = names_avail; /* trigger random pick next iter */
                nameUsed = true;
                break;
            }
        }
        if (!nameUsed)
            break;
    }
    /* C: strncpy(ESHK(shk)->shknam, shname, PL_NSIZ) */
    if (shk.mextra) {
        shk.mextra.eshk = shk.mextra.eshk || {};
        shk.mextra.eshk.shknam = (shname || "").slice(0, 32);
    }
}
/*
 * C shknam.c:556-567 neweshk(mtmp) — (re)attach a zeroed eshk substruct.
 * C ref: nethack-c/src/shknam.c:556
 */
export function neweshk(mtmp) {
    /* C: if (!mtmp->mextra) mtmp->mextra = newmextra(); */
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    /* C: if (!ESHK(mtmp)) ESHK(mtmp) = (struct eshk *) alloc(sizeof(struct eshk)); */
    if (!mtmp.mextra.eshk)
        mtmp.mextra.eshk = {};
    /* C: (void) memset((genericptr_t) ESHK(mtmp), 0, sizeof(struct eshk)); */
    for (const k of Object.keys(mtmp.mextra.eshk))
        delete mtmp.mextra.eshk[k];
    /* C: ESHK(mtmp)->parentmid = mtmp->m_id; */
    mtmp.mextra.eshk.parentmid = mtmp.m_id;
    /* C: ESHK(mtmp)->bill_p = (struct bill_x *) 0; */
    mtmp.mextra.eshk.bill_p = null;
}
/*
 * C ref: nethack-c/src/mon.c:2634 dealloc_mextra(struct monst *m) —
 * free each populated mextra substruct, reset mcorpsenm, free mextra itself.
 */
export function dealloc_mextra(m) {
    const x = m.mextra;
    if (x) {
        if (x.mgivenname)
            x.mgivenname = null;
        if (x.egd)
            x.egd = null;
        if (x.epri)
            x.epri = null;
        if (x.eshk)
            x.eshk = null;
        if (x.emin)
            x.emin = null;
        if (x.edog)
            x.edog = null;
        if (x.ebones)
            x.ebones = null;
        x.mcorpsenm = NON_PM;
        m.mextra = null;
    }
}
/*
 * C ref: nethack-c/src/mon.c:2582 copy_mextra(struct monst *mtmp2, struct monst *mtmp1)
 * Copy mextra substructs from mtmp1 to mtmp2.
 */
export function copy_mextra(mtmp2, mtmp1) {
    if (!mtmp2 || !mtmp1 || !mtmp1.mextra)
        return;

    if (!mtmp2.mextra)
        mtmp2.mextra = newmextra();

    if (mtmp1.mextra.mgivenname) {
        new_mgivenname(mtmp2, mtmp1.mextra.mgivenname.length + 1);
        mtmp2.mextra.mgivenname = mtmp1.mextra.mgivenname;
    }
    if (mtmp1.mextra.egd) {
        if (!mtmp2.mextra.egd)
            newegd(mtmp2);
        /* assert(has_egd(mtmp2)); */
        Object.assign(mtmp2.mextra.egd, mtmp1.mextra.egd);
    }
    if (mtmp1.mextra.epri) {
        if (!mtmp2.mextra.epri)
            newepri(mtmp2);
        /* assert(has_epri(mtmp2)); */
        Object.assign(mtmp2.mextra.epri, mtmp1.mextra.epri);
    }
    if (mtmp1.mextra.eshk) {
        if (!mtmp2.mextra.eshk)
            neweshk(mtmp2);
        /* assert(has_eshk(mtmp2)); */
        Object.assign(mtmp2.mextra.eshk, mtmp1.mextra.eshk);
    }
    if (mtmp1.mextra.emin) {
        if (!mtmp2.mextra.emin)
            newemin(mtmp2);
        /* assert(has_emin(mtmp2)); */
        Object.assign(mtmp2.mextra.emin, mtmp1.mextra.emin);
    }
    if (mtmp1.mextra.edog) {
        if (!mtmp2.mextra.edog)
            newedog(mtmp2);
        /* assert(has_edog(mtmp2)); */
        Object.assign(mtmp2.mextra.edog, mtmp1.mextra.edog);
    }
    if (mtmp1.mextra.ebones) {
        if (!mtmp2.mextra.ebones)
            newebones(mtmp2);
        /* assert(has_ebones(mtmp2)); */
        Object.assign(mtmp2.mextra.ebones, mtmp1.mextra.ebones);
    }
    /* C: if (has_mcorpsenm(mtmp1)) MCORPSENM(mtmp2) = MCORPSENM(mtmp1); */
    if (mtmp1.mextra.mcorpsenm !== undefined && mtmp1.mextra.mcorpsenm !== NON_PM)
        mtmp2.mextra.mcorpsenm = mtmp1.mextra.mcorpsenm;
}

/* C ref: vault.c:23-33 newegd(mtmp).  The C body memsets struct egd to zero and
 * then sets parentmid = mtmp->m_id -- which at makemon.c:1238 is still 0,
 * because m_id is not assigned until :1253.  The zeroed members are spelled out
 * here (mextra.h:77-90) so a reader of EGD(mon) sees C's initial values rather
 * than `undefined`; fakecorr is FCSIZ == ROWNO + COLNO entries. */
function newegd(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.egd) {
        const fakecorr = [];
        for (let i = 0; i < (ROWNO + COLNO); i++)
            fakecorr.push({ fx: 0, fy: 0, ftyp: 0, flags: 0 });
        mtmp.mextra.egd = {
            parentmid: mtmp.m_id | 0,
            fcbeg: 0, fcend: 0, vroom: 0,
            gdx: 0, gdy: 0, ogx: 0, ogy: 0,
            gdlevel: { dnum: 0, dlevel: 0 },
            warncnt: 0, dropgoldcnt: 0, gddone: 0, witness: 0,
            fakecorr,
        };
    }
}

function newepri(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.epri)
        mtmp.mextra.epri = {};
}

function newemin(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.emin)
        mtmp.mextra.emin = {};
}

function newebones(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.ebones)
        mtmp.mextra.ebones = {};
}

function new_mgivenname(mtmp, len) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    mtmp.mextra.mgivenname = mtmp.mextra.mgivenname || "";
}

function newedog(mtmp) {
    if (!mtmp.mextra)
        mtmp.mextra = newmextra();
    if (!mtmp.mextra.edog)
        mtmp.mextra.edog = {};
}
/*
 * C shknam.c:695-714 stock_room_goodpos(sroom,rmno,sh,sx,sy)
 * Returns true if (sx,sy) is a valid cell for placing shop inventory.
 */
function stock_room_goodpos(sroom, rmno, sh, sx, sy) {
    const loc = game.level?.at(sx, sy);
    if (!loc)
        return false;
    if (sroom.irregular) {
        if (loc.edge || (loc.roomno | 0) !== rmno)
            return false;
        const door = (game.level?.doors ?? [])[sh];
        if (door && distmin(sx, sy, door.x, door.y) <= 1)
            return false;
    }
    else {
        const door = (game.level?.doors ?? [])[sh];
        if (door) {
            if ((sx === sroom.lx && door.x === sx - 1)
                || (sx === sroom.hx && door.x === sx + 1)
                || (sy === sroom.ly && door.y === sy - 1)
                || (sy === sroom.hy && door.y === sy + 1))
                return false;
        }
    }
    if (!(loc.typ >= ROOM))
        return false; /* IS_ROOM */
    return true;
}
/* C dungeon.c ledger_no(lev) — `svd.dungeons[lev->dnum].ledger_start +
 * lev->dlevel`, the absolute level index across branches.  Was `return 0`
 * ("no dungeon tracking in JS") — but js/allmain.js:231 has built
 * game.dungeons[].ledger_start for a long time, and js/cmd.js:5523 already
 * carries this exact body under the name ledger_no_cmd.  The stub is load
 * bearing: nameshk() adds ledger_no(&u.uz) into the shopkeeper's name index, so
 * every shop below Dlvl 1 was named as if it were on Dlvl 0. */
function ledger_no(uz) {
    const dnum = (uz?.dnum | 0);
    const dlevel = (uz?.dlevel | 0);
    return dlevel + (game.dungeons?.[dnum]?.ledger_start | 0);
}
/*
 * C shknam.c:628-692 shkinit(shp, sroom) — create shopkeeper monster.
 * Returns sh (svd.doors index), or -1 on failure.
 * RNG: makemon + mkmonmoney(rnd(100)) + optional mongets(TOUCHSTONE/SCR_CHARGING) +
 *      nameshk(rn2 for shktools or random fallback).
 * C ref: nethack-c/src/shknam.c:628
 */
async function shkinit(shp, shpIndx, sroom) {
    /* C: sh = good_shopdoor(sroom, &sx, &sy) */
    let sh = -1, sx = 0, sy = 0;
    const rooms = game.level?.rooms ?? [];
    const roomIdx = rooms.indexOf(sroom);
    const rmno = (roomIdx >= 0 ? roomIdx : 0) + ROOMOFFSET;
    const doors = game.level?.doors ?? [];
    for (let i = 0; i < (sroom.doorct | 0); i++) {
        const di = (sroom.fdoor | 0) + i;
        let dx = doors[di]?.x ?? -1;
        let dy = doors[di]?.y ?? -1;
        if (sroom.irregular) {
            /* C: find cell inside room adjacent to door */
            if (isok(dx - 1, dy) && !game.level?.at(dx - 1, dy)?.edge
                && (game.level?.at(dx - 1, dy)?.roomno | 0) === rmno)
                dx--;
            else if (isok(dx + 1, dy) && !game.level?.at(dx + 1, dy)?.edge
                && (game.level?.at(dx + 1, dy)?.roomno | 0) === rmno)
                dx++;
            else if (isok(dx, dy - 1) && !game.level?.at(dx, dy - 1)?.edge
                && (game.level?.at(dx, dy - 1)?.roomno | 0) === rmno)
                dy--;
            else if (isok(dx, dy + 1) && !game.level?.at(dx, dy + 1)?.edge
                && (game.level?.at(dx, dy + 1)?.roomno | 0) === rmno)
                dy++;
            else
                continue;
        }
        else {
            /* C: adjust door coord to be inside room */
            if (dx === sroom.lx - 1)
                dx++;
            else if (dx === sroom.hx + 1)
                dx--;
            else if (dy === sroom.ly - 1)
                dy++;
            else if (dy === sroom.hy + 1)
                dy--;
            else
                continue;
        }
        sh = di;
        sx = dx;
        sy = dy;
        break;
    }
    if (sh < 0)
        return -1;
    /* C shknam.c:664 — the shopkeeper's door cell may already contain a
       monster from an earlier level-generation pass.  Relocate that monster
       before makemon; this insurance consumes the same rloc RNG pair as C. */
    const occupant = m_at(sx, sy);
    if (occupant)
        await rloc(occupant, 0x04 /* RLOC_NOMSG */);
    /* C: shk = makemon(&mons[PM_SHOPKEEPER], sx, sy, MM_ESHK) */
    const MM_ESHK = 0x00000200;
    const shk = await makemon(PM_SHOPKEEPER, sx, sy, MM_ESHK);
    if (!shk)
        return -1;
    /* C: attach eshk substruct (MM_ESHK causes neweshk in C makemon) */
    shk.mextra = shk.mextra || {};
    shk.mextra.eshk = shk.mextra.eshk || {};
    const eshkp = shk.mextra.eshk;
    /* C: shk->isshk = shk->mpeaceful = 1; shk->msleeping = 0 */
    shk.isshk = 1;
    shk.mpeaceful = 1;
    shk.msleeping = 0;
    /* C: eshkp->shoproom, shoptype, shoplevel, shd, shk.x/y, etc. */
    eshkp.shoproom = rmno;
    eshkp.shoplevel = { dnum: game.u.uz.dnum, dlevel: game.u.uz.dlevel };
    eshkp.shoptype = sroom.rtype;
    eshkp.shd = doors[sh] ? { x: doors[sh].x, y: doors[sh].y } : { x: 0, y: 0 };
    eshkp.shk_x = sx;
    eshkp.shk_y = sy;
    eshkp.robbed = 0;
    eshkp.credit = 0;
    eshkp.debit = 0;
    eshkp.loan = 0;
    eshkp.billct = 0;
    eshkp.visitct = 0;
    eshkp.customer = '';
    sroom.resident = shk;
    /* C: mkmonmoney(shk, 1000L + 30L * (long)rnd(100)) — 1 rnd call */
    const capital = 1000 + 30 * rnd(100);
    /* mkmonmoney: mksobj(GOLD_PIECE, FALSE, FALSE) — no init RNG; add to minvent */
    const goldObj = await mksobj(GOLD_PIECE, false, false);
    if (goldObj) {
        goldObj.quan = capital;
        goldObj.owt = capital * 4; /* C weight(gold): quan * 4 / 20 + ... simplified */
        await mpickobj(shk, goldObj);
    }
    /* C: if (shp->shknms == shkrings) mongets(shk, TOUCHSTONE) */
    if (shp.shknms === _shkrings) {
        const ts = await mksobj(TOUCHSTONE_SHK, true, false);
        if (ts)
            await mpickobj(shk, ts);
    }
    /* C: if (shktools || shkwands || (shkrings && rn2(2)) || (shkgeneral && rn2(5)))
     *    mongets(shk, SCR_CHARGING) */
    if (shp.shknms === _shktools || shp.shknms === _shkwands
        || (shp.shknms === _shkrings && rn2(2))
        || (shp.shknms === _shkgeneral && rn2(5))) {
        const sc = await mksobj(SCR_CHARGING, true, false);
        if (sc)
            await mpickobj(shk, sc);
    }
    /* C: nameshk(shk, shp->shknms) */
    nameshk_shk(shk, shp.shknms, shpIndx);
    return sh;
}
/* C ref: shk.c:567 inside_shop(x,y) — "x,y is strictly inside shop".  Returns
   the shop's roomno (>= ROOMOFFSET, truthy) or NO_ROOM(0).  A cell counts only
   when its roomno is a real room, it is NOT an edge (wall) cell, and that room
   is a shop (rtype >= SHOPBASE).  IS_SHOP(rno-ROOMOFFSET) === rooms[rno-
   ROOMOFFSET].rtype >= SHOPBASE (mirrors js/shk.js IS_SHOP). */
export function inside_shop(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc)
        return NO_ROOM;
    const rno = loc.roomno | 0;
    const room = game.level?.rooms?.[rno - ROOMOFFSET];
    if (rno < ROOMOFFSET || loc.edge || !room || (room.rtype | 0) < SHOPBASE)
        return NO_ROOM;
    return rno;
}
/*
 * C shknam.c:718-801 stock_room(shp_indx, sroom) — stock a shop room.
 * C ref: nethack-c/src/shknam.c:718
 */
export async function stock_room(shpIndx, sroom) {
    const shp = _shtypes[shpIndx | 0];
    if (!shp)
        return;
    /* C: if ((sh = shkinit(shp, sroom)) < 0) return; */
    const sh = await shkinit(shp, shpIndx, sroom);
    if (sh < 0)
        return;
    /* C: door fixup — no-door → open, sdoor → door, trapped → locked */
    const rooms = game.level?.rooms ?? [];
    const roomIdx2 = rooms.indexOf(sroom);
    const rmno = (roomIdx2 >= 0 ? roomIdx2 : 0) + ROOMOFFSET;
    const doors = game.level?.doors ?? [];
    const doorCell = game.level?.at(doors[sroom.fdoor]?.x, doors[sroom.fdoor]?.y);
    if (doorCell) {
        if ((doorCell.flags | 0) === D_NODOOR) {
            doorCell.flags = D_ISOPEN;
        }
        if ((doorCell.typ | 0) === SDOOR) {
            /* cvt_sdoor_to_door — mirrors detect.c:1590 */
            doorCell.typ = DOOR;
            let newmask = (doorCell.flags | 0) & ~WM_MASK;
            if (!(newmask & D_LOCKED))
                newmask |= D_CLOSED;
            doorCell.flags = newmask;
        }
        if ((doorCell.flags | 0) & D_TRAPPED)
            doorCell.flags = D_LOCKED;
        /* C: if door locked → engrave "Closed for inventory" outside */
        if ((doorCell.flags | 0) === D_LOCKED) {
            let m = doors[sroom.fdoor].x, n = doors[sroom.fdoor].y;
            const sx0 = m, sy0 = n;
            if (inside_shop(sx0 + 1, sy0))
                m--;
            else if (inside_shop(sx0 - 1, sy0))
                m++;
            if (inside_shop(sx0, sy0 + 1))
                n--;
            else if (inside_shop(sx0, sy0 - 1))
                n++;
            make_engr_at(m, n, "Closed for inventory", null, 0, DUST);
            const adjLoc = game.level?.at(m, n);
            if (adjLoc && adjLoc.typ !== CORR && adjLoc.typ !== ROOM) {
                /* C: Is_special(&u.uz) || *in_rooms(m,n,0) → ROOM : CORR */
                adjLoc.typ = (Is_special(game.u?.uz) || in_rooms(m, n, 0).length > 0)
                    ? ROOM : CORR;
            }
        }
    }
    /* C: tribute block — count goodpos cells, pick specialspot */
    let stockcount = 0, specialspot = 0;
    const tributeEnabled = !!(game.context?.tribute?.enabled)
        && !(game.context?.tributeBookstock);
    if (tributeEnabled) {
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++)
                if (stock_room_goodpos(sroom, rmno, sh, sx, sy))
                    stockcount++;
        specialspot = rnd(stockcount);
        stockcount = 0;
    }
    /* C: main cell loop — mkshobj_at for each eligible cell */
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            if (stock_room_goodpos(sroom, rmno, sh, sx, sy)) {
                stockcount++;
                await mkshobj_at_shk(shp, shpIndx, sx, sy, !!(stockcount && stockcount === specialspot));
            }
        }
    }
    if (game.orcus_level && on_level(game.u?.uz, game.orcus_level)) {
        const shkmon = shop_keeper(rmno);
        if (shkmon)
            await mongone(shkmon);
    }
    /* C: svl.level.flags.has_shop = TRUE */
    if (game.level?.flags)
        game.level.flags.has_shop = true;
}
/*
 * C mkroom.c:784-806 courtmon()
 * Returns PM_ index (or null if mkclass fails), mirroring C struct permonst*.
 * C ref: nethack-c/src/mkroom.c courtmon().
 */
export function courtmon() {
    const i = rn2(60) + rn2(3 * levelDifficulty());
    if (i > 100)
        return mkclass(S_DRAGON);
    else if (i > 95)
        return mkclass(S_GIANT);
    else if (i > 85)
        return mkclass(S_TROLL);
    else if (i > 75)
        return mkclass(S_CENTAUR);
    else if (i > 60)
        return mkclass(S_ORC);
    else if (i > 45)
        return PM_BUGBEAR;
    else if (i > 30)
        return PM_HOBGOBLIN;
    else if (i > 15)
        return mkclass(S_GNOME);
    else
        return mkclass(S_KOBOLD);
}
/*
 * C mkroom.c:479-500 morguemon()
 * Returns PM_ index or null.
 */
function morguemon() {
    const i = rn2(100);
    const hd = rn2(levelDifficulty());
    if (hd > 10 && i < 10) {
        const uz = game.u?.uz;
        if (Inhell() || In_endgame(uz)) {
            return mkclass(S_DEMON);
        }
        else {
            /* C: ndemon(A_NONE) = mkclass_aligned(S_DEMON,0,A_NONE) + is_ndemon check */
            const pm = mkclassAligned(S_DEMON, 0, A_NONE);
            if (pm !== null && pm >= 0 && is_ndemon(permonstTemplate(pm)))
                return pm;
            /* else fall through */
        }
    }
    if (hd > 8 && i > 85)
        return mkclass(S_VAMPIRE);
    return (i < 20) ? PM_GHOST
        : (i < 40) ? PM_WRAITH
            : mkclass(S_ZOMBIE);
}
/*
 * C mkroom.c:818-838 squadmon()
 * Returns PM_ index or null (if type genocided/gone).
 */
function squadmon() {
    const squadprob = [
        { pm: PM_SOLDIER, prob: 80 },
        { pm: PM_SERGEANT, prob: 15 },
        { pm: PM_LIEUTENANT, prob: 4 },
        { pm: PM_CAPTAIN, prob: 1 },
    ];
    const sel_prob = rnd(80 + levelDifficulty());
    let cpro = 0, mndx = -1;
    for (let i = 0; i < squadprob.length; i++) {
        cpro += squadprob[i].prob;
        if (cpro > sel_prob) {
            mndx = squadprob[i].pm;
            break;
        }
    }
    if (mndx < 0)
        mndx = squadprob[rn2(squadprob.length)].pm;
    const mv = game.mvitals?.[mndx]?.mvflags | 0;
    return (mv & G_GONE) ? null : mndx;
}
/*
 * C mkroom.c:503-528 antholemon()
 * Returns PM_ index or null.
 * C uses ubirthday (time_t); JS tracks it as game.u.ubirthday (default 0).
 */
function antholemon() {
    const ubirthday = game.u?.ubirthday ?? 0;
    let indx = (ubirthday | 0) % 3;
    indx += levelDifficulty();
    const anttypes = [PM_SOLDIER_ANT, PM_FIRE_ANT, PM_GIANT_ANT];
    let trycnt = 0, mtyp;
    do {
        mtyp = anttypes[(indx + trycnt) % 3];
    } while (++trycnt < 3 && (game.mvitals?.[mtyp]?.mvflags | 0) & G_GONE);
    return ((game.mvitals?.[mtyp]?.mvflags | 0) & G_GONE) ? null : mtyp;
}
/*
 * C mkroom.c:258-274 mk_zoo_thronemon(tx, ty)
 * Spawns a sleeping, hostile throne-room ruler and gives it a sceptre (MACE).
 * C: set_malign(mon) — no RNG, JS skips field update.
 * C: mongets(mon, MACE) — mksobj then add to minvent.
 */
async function mk_zoo_thronemon(tx, ty) {
    const i = rnd(levelDifficulty());
    const pm = (i > 9) ? PM_OGRE_TYRANT
        : (i > 5) ? PM_ELVEN_MONARCH
            : (i > 2) ? PM_DWARF_RULER
                : PM_GNOME_RULER;
    const mon = await makemon(pm, tx, ty, 0 /* NO_MM_FLAGS */);
    if (mon) {
        mon.msleeping = 1;
        mon.mpeaceful = 0;
        /* C: set_malign(mon) — no RNG, skip */
        /* C: mongets(mon, MACE) */
        const sceptre = await mksobj(MACE_OTYP, true, false);
        if (sceptre) {
            sceptre.nobj = mon.minvent ?? null;
            mon.minvent = sceptre;
        }
    }
}
export async function mk_tt_object(objtype, x, y) {
    /* C mkobj.c:2237: player statues never contain books */
    const initialize_it = (objtype !== STATUE);
    /* C mkobj.c:2238 */
    const otmp = await mksobj_at(objtype, x, y, initialize_it, false);

    /* C mkobj.c:2242 — tt_oname() draws its rnd(10) and returns NULL for the
     * empty scoreboard, so the body always runs; the call is NOT skippable. */
    if (!tt_oname(otmp)) {
        /* C mkobj.c:2243 */
        const pm = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);

        /* C mkobj.c:2246 — update weight for either, force timer sanity for
         * corpses.  C cannot reach here with a NULL otmp (mksobj_at "never
         * returns Null"); the guard is a JS-side crash shield only and costs
         * no RNG, since tt_oname(NULL) also returns early without drawing. */
        if (otmp)
            set_corpsenm(otmp, pm);
    }

    return otmp;
}
/*
 * C mkroom.c:277-453 fill_zoo(sroom)
 * Stock a special room with monsters and objects.
 * C ref: nethack-c/src/mkroom.c fill_zoo (line ~277).
 * Mirrors C control flow exactly for RNG parity.
 * Note: C's fill_zoo sets level.flags.has_* flags; JS fill_special_room already
 * sets them in its post-dispatch switch (sp_lev.c:2793+). To match C exactly
 * (which sets them inside fill_zoo), set them here too — the double-set is harmless.
 */
async function fill_zoo(sroom) {
    const type = sroom.rtype | 0;
    const sh = sroom.fdoor | 0;
    let goldlim = 0;
    let tx = 0, ty = 0;
    /* C: rmno = (int)((sroom - svr.rooms) + ROOMOFFSET) */
    const rooms = game.level?.rooms ?? [];
    const roomIdx = rooms.indexOf(sroom);
    const rmno = (roomIdx >= 0 ? roomIdx : 0) + ROOMOFFSET;
    /* ── Phase 1: pre-loop setup ── */
    switch (type) {
        case COURT: {
            if (game.level?.flags?.is_maze_lev) {
                /* C: search for IS_THRONE tile; goto throne_placed if found */
                let found = false;
                outer_loop: for (let tx2 = sroom.lx; tx2 <= sroom.hx; tx2++) {
                    for (let ty2 = sroom.ly; ty2 <= sroom.hy; ty2++) {
                        if (game.level.at(tx2, ty2)?.typ === THRONE) {
                            tx = tx2;
                            ty = ty2;
                            found = true;
                            break outer_loop;
                        }
                    }
                }
                /* C: if IS_THRONE found, go to throne_placed skipping somexyspace loop */
                if (!found) {
                    let mm = { x: 0, y: 0 }, tries = 100;
                    do {
                        somexyspace(sroom, mm);
                        tx = mm.x;
                        ty = mm.y;
                    } while (_occupied(tx, ty) && --tries > 0);
                }
            }
            else {
                /* C: i=100; do { somexyspace; tx=mm.x; ty=mm.y } while (occupied && --i>0) */
                let mm = { x: 0, y: 0 }, tries = 100;
                do {
                    somexyspace(sroom, mm);
                    tx = mm.x;
                    ty = mm.y;
                } while (_occupied(tx, ty) && --tries > 0);
            }
            /* C: throne_placed: mk_zoo_thronemon(tx, ty) */
            await mk_zoo_thronemon(tx, ty);
            break;
        }
        case BEEHIVE: {
            /* C mkroom.c:307-317 — center cell for queen bee */
            tx = sroom.lx + Math.trunc((sroom.hx - sroom.lx + 1) / 2);
            ty = sroom.ly + Math.trunc((sroom.hy - sroom.ly + 1) / 2);
            if (sroom.irregular) {
                const loc = game.level?.at(tx, ty);
                if (!loc || (loc.roomno | 0) !== rmno || loc.edge) {
                    const mm = { x: 0, y: 0 };
                    somexyspace(sroom, mm);
                    tx = mm.x;
                    ty = mm.y;
                }
            }
            break;
        }
        case ZOO:
        case LEPREHALL:
            goldlim = 500 * levelDifficulty();
            break;
        default:
            break;
    }
    /* ── Phase 2: per-cell monster and object loop ── */
    for (let sx = sroom.lx; sx <= sroom.hx; sx++) {
        for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
            const loc = game.level?.at(sx, sy);
            /* C mkroom.c:326-341 — skip ineligible cells */
            if (sroom.irregular) {
                if (!loc || (loc.roomno | 0) !== rmno || loc.edge)
                    continue;
                if (sroom.doorct) {
                    const door = (game.level?.doors ?? [])[sh];
                    if (door && distmin(sx, sy, door.x, door.y) <= 1)
                        continue;
                }
            }
            else {
                if (!loc || !SPACE_POS(loc.typ))
                    continue;
                if (sroom.doorct) {
                    const door = (game.level?.doors ?? [])[sh];
                    if (door) {
                        if ((sx === sroom.lx && door.x === sx - 1)
                            || (sx === sroom.hx && door.x === sx + 1)
                            || (sy === sroom.ly && door.y === sy - 1)
                            || (sy === sroom.hy && door.y === sy + 1))
                            continue;
                    }
                }
            }
            /* C mkroom.c:343-344 */
            if (type === COURT && loc?.typ === THRONE)
                continue;
            /* C mkroom.c:345-362 — pick monster type */
            let mdat;
            switch (type) {
                case COURT:
                    mdat = courtmon();
                    break;
                case BARRACKS:
                    mdat = squadmon();
                    break;
                case MORGUE:
                    mdat = morguemon();
                    break;
                case BEEHIVE:
                    mdat = (sx === tx && sy === ty) ? 5 /* PM_QUEEN_BEE */ : 1 /* PM_KILLER_BEE */;
                    break;
                case LEPREHALL:
                    mdat = 63 /* PM_LEPRECHAUN */;
                    break;
                case COCKNEST:
                    mdat = 10 /* PM_COCKATRICE  */;
                    break;
                case ANTHOLE:
                    mdat = antholemon();
                    break;
                default:
                    mdat = null;
                    break; /* ZOO → rndmonst */
            }
            /* C: makemon(mdat, sx, sy, MM_ASLEEP | MM_NOGRP) */
            const mon = await makemon(mdat, sx, sy, MM_ASLEEP | MM_NOGRP);
            if (mon) {
                mon.msleeping = 1;
                if (type === COURT && mon.mpeaceful) {
                    mon.mpeaceful = 0;
                    /* C: set_malign(mon) — no RNG, skip */
                }
            }
            /* C mkroom.c:370-419 — per-cell object placement */
            switch (type) {
                case ZOO:
                case LEPREHALL: {
                    let i;
                    if (sroom.doorct) {
                        const door = (game.level?.doors ?? [])[sh];
                        const distval = door ? dist2(sx, sy, door.x, door.y) : 0;
                        i = distval * distval; /* C: sq(distval) */
                    }
                    else {
                        i = goldlim;
                    }
                    if (i >= goldlim)
                        i = 5 * levelDifficulty();
                    goldlim -= i;
                    await mkgold(rn1(i, 10), sx, sy);
                    break;
                }
                case MORGUE:
                    if (!rn2(5))
                        await mk_tt_object(CORPSE, sx, sy);
                    if (!rn2(10))
                        await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                    if (!rn2(5))
                        make_grave(sx, sy, null);
                    break;
                case BEEHIVE:
                    if (!rn2(3))
                        await mksobj_at(LUMP_OF_ROYAL_JELLY, sx, sy, true, false);
                    break;
                case BARRACKS:
                    if (!rn2(20))
                        await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, sx, sy, true, false);
                    break;
                case COCKNEST:
                    if (!rn2(3)) {
                        const sobj = await mk_tt_object(STATUE, sx, sy);
                        if (sobj) {
                            for (let i2 = rn2(5); i2; i2--)
                                await add_to_container(sobj, (await mkobj(RANDOM_CLASS, false)));
                            sobj.owt = weight(sobj);
                        }
                    }
                    break;
                case ANTHOLE:
                    if (!rn2(3))
                        await mkobj_at(FOOD_CLASS, sx, sy, false);
                    break;
                default:
                    break;
            }
        }
    }
    /* ── Phase 3: post-loop (COURT chest+throne tile) ── */
    switch (type) {
        case COURT: {
            /* C mkroom.c:422-435 */
            const troneLoc = game.level?.at(tx, ty);
            if (troneLoc)
                troneLoc.typ = THRONE;
            const mm2 = { x: 0, y: 0 };
            somexyspace(sroom, mm2);
            const gold = await mksobj(GOLD_PIECE, true, false);
            if (gold) {
                gold.quan = rn1(50 * levelDifficulty(), 10);
                gold.owt = weight(gold);
            }
            const chest = await mksobj_at(CHEST, mm2.x, mm2.y, true, false);
            if (chest && gold) {
                await add_to_container(chest, gold);
                chest.owt = weight(chest);
                chest.spe = 2;
            }
            if (game.level?.flags)
                game.level.flags.has_court = true;
            break;
        }
        case BARRACKS:
            if (game.level?.flags)
                game.level.flags.has_barracks = true;
            break;
        case ZOO:
            if (game.level?.flags)
                game.level.flags.has_zoo = true;
            break;
        case MORGUE:
            if (game.level?.flags)
                game.level.flags.has_morgue = true;
            break;
        case BEEHIVE:
            if (game.level?.flags)
                game.level.flags.has_beehive = true;
            break;
        default:
            break;
    }
}
/*
 * _occupied(x, y) — check if a cell has a live monster.
 * Used by fill_zoo COURT throne-placement loop (C: occupied(tx,ty)).
 * Simplified: only check fmon chain (objects not relevant for throne spot).
 */
function _occupied(x, y) {
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
        if (m.mx === x && m.my === y)
            return true;
    }
    return false;
}
/*
 * C ref: sp_lev.c fill_special_room (~2737–2809)
 * Fill shops, vault gold, zoos — ordering and guards match C exactly.
 */
export async function fill_special_room(croom) {
    if (!croom)
        return;
    const nSub = croom.nsubrooms | 0;
    for (let i = 0; i < nSub; ++i)
        await fill_special_room(croom.sbrooms?.[i]);
    if (croom.rtype === OROOM || croom.rtype === THEMEROOM
        || croom.needfill === FILL_NONE)
        return;
    if (croom.needfill === FILL_NORMAL) {
        if (croom.rtype >= SHOPBASE) {
            await stock_room(croom.rtype - SHOPBASE, croom);
            game.level.flags.has_shop = true;
            return;
        }
        switch (croom.rtype) {
            case VAULT: {
                const uz = game.u?.uz;
                const spread = Math.trunc(Math.abs(depth_of_level(uz)) * 100);
                for (let x = croom.lx; x <= croom.hx; x++) {
                    for (let y = croom.ly; y <= croom.hy; y++) {
                        await mkgold(rn1(spread, 51), x, y);
                    }
                }
                break;
            }
            case COURT:
            case ZOO:
            case BEEHIVE:
            case ANTHOLE:
            case COCKNEST:
            case LEPREHALL:
            case MORGUE:
            case BARRACKS:
                await fill_zoo(croom);
                break;
            default:
                break;
        }
    }
    switch (croom.rtype) {
        case VAULT:
            game.level.flags.has_vault = true;
            break;
        case ZOO:
            game.level.flags.has_zoo = true;
            break;
        case COURT:
            game.level.flags.has_court = true;
            break;
        case MORGUE:
            game.level.flags.has_morgue = true;
            break;
        case BEEHIVE:
            game.level.flags.has_beehive = true;
            break;
        case BARRACKS:
            game.level.flags.has_barracks = true;
            break;
        case TEMPLE:
            game.level.flags.has_temple = true;
            break;
        case SWAMP:
            game.level.flags.has_swamp = true;
            break;
        default:
            break;
    }
}
function place_object(otmp, x, y) {
    if (!otmp)
        return;
    const xi = x | 0;
    const yi = y | 0;
    // C mkobj.c:2330 — otmp2 = svl.level.objects[x][y]
    let otmp2 = (game.level?.levelObjects?.[xi]?.[yi]) ?? null;
    // C mkobj.c:2340-2350 — insert into per-tile nexthere chain.
    // Non-boulder objects go under boulders so that display shows boulder on top
    // without needing to traverse the pile chain.
    if (otmp2 && otmp2.otyp === BOULDER && otmp.otyp !== BOULDER) {
        // C mkobj.c:2343-2344 — advance past all consecutive leading boulders
        while (otmp2.nexthere && otmp2.nexthere.otyp === BOULDER)
            otmp2 = otmp2.nexthere;
        // C mkobj.c:2345-2346 — insert otmp after the last consecutive boulder
        otmp.nexthere = otmp2.nexthere;
        otmp2.nexthere = otmp;
    }
    else {
        // C mkobj.c:2349-2350 — put on top of current pile (normal case)
        otmp.nexthere = otmp2;
        if (game.level?.levelObjects?.[xi])
            game.level.levelObjects[xi][yi] = otmp;
    }
    // C mkobj.c:2353-2356 — set position and ownership marker
    otmp.ox = xi;
    otmp.oy = yi;
    otmp.where = OBJ_FLOOR;
    otmp.nobj = game.fobj;
    game.fobj = otmp;
    if ((otmp.otyp | 0) === BOULDER && (!otmp2 || (otmp2.otyp | 0) !== BOULDER))
        block_point(xi, yi);
}
export function remove_object(otmp) {
    const x = otmp.ox | 0;
    const y = otmp.oy | 0;

    if ((otmp.where | 0) !== OBJ_FLOOR)
        throw new Error(`remove_object: obj where=${otmp.where}, not on floor`);
    // C mkobj.c:2627-2645 extract_nexthere(otmp, &svl.level.objects[x][y]).
    // so the real chain's topology (built from the "objects" side-channel)
    // stays intact when otmp is a same-o_id-but-different-instance match.
    {
        const cell = game.level?.levelObjects?.[x];
        const head = cell ? cell[y] : null;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nexthere) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nexthere: object lost');
        if (prev)
            prev.nexthere = match.nexthere;
        else if (cell)
            cell[y] = match.nexthere;
        otmp.nexthere = null;
    }
    // C mkobj.c:2600-2619 extract_nobj(otmp, &fobj) — same matched-node splice.
    {
        const head = game.fobj;
        let match = null, prev = null;
        for (let o = head; o; prev = o, o = o.nobj) {
            if (o === otmp || o.o_id === otmp.o_id) { match = o; break; }
        }
        if (!match)
            throw new Error('extract_nobj: object lost');
        if (prev)
            prev.nobj = match.nobj;
        else
            game.fobj = match.nobj;
        otmp.where = OBJ_FREE;
        otmp.nobj = null;
    }
    if ((otmp.otyp | 0) === BOULDER)
        recalc_block_point(x, y);
    if (otmp.timed)
        obj_timer_checks(otmp, x, y, 0);
}
/* C mkobj.c:2748 dealloc_obj: validate ownership, stop timers/lights, clear
 * transient references, then retain Lua-held objects or queue deletion. */
export async function dealloc_obj(obj) {
    if (obj.otyp === BOULDER)
        obj.next_boulder = 0;
    if (obj.where === OBJ_DELETED) {
        await lifecycle_impossible('dealloc_obj: obj already deleted (type=%d)', obj.otyp);
        return;
    } else if (obj.where !== OBJ_FREE && obj.where !== OBJ_LUAFREE_OES) {
        throw new Error(`panic: dealloc_obj: obj not free (type=${obj.otyp}, where=${obj.where})`);
    }
    if (obj.nobj)
        throw new Error('panic: dealloc_obj with nobj');
    if (obj.cobj)
        throw new Error('panic: dealloc_obj with cobj');
    if (obj === game.hands_obj) {
        await lifecycle_impossible('dealloc_obj with hands_obj');
        return;
    }
    if (obj.timed)
        obj_stop_timers(obj);
    if (obj_sheds_light_mp(obj)) {
        del_light_source(LS_OBJECT, { a_obj: obj });
        obj.lamplit = 0;
    }
    if (obj === game.thrownobj)
        game.thrownobj = null;
    if (obj === game.kickedobj)
        game.kickedobj = null;
    if (obj === game.context?.tin?.tin) {
        game.context.tin.tin = null;
        game.context.tin.o_id = 0;
    }
    const split = game.context?.objsplit;
    if (split && (obj.o_id === split.parent_oid || obj.o_id === split.child_oid))
        split.parent_oid = split.child_oid = 0;
    if (obj.lua_ref_cnt) {
        obj.where = OBJ_LUAFREE_OES;
        return;
    }
    if (!game.program_state.freeingdata) {
        obj.where = OBJ_DELETED;
        obj.nobj = game.objs_deleted || null;
        game.objs_deleted = obj;
    } else {
        dealloc_obj_real(obj);
    }
}
/* C ref: nethack-c/src/mkobj.c:2834 dobjsfree — free the objs_deleted queue.
 * Iterates go.objs_deleted, calling obj_extract_self + dealloc_obj_real on each. */
export function dobjsfree() {
    let otmp;
    while (game.objs_deleted) {
        otmp = game.objs_deleted;
        game.objs_deleted = otmp.nobj;
        if (otmp.where !== OBJ_DELETED)
            throw new Error(`dobjsfree: obj where=${otmp.where}, not OBJ_DELETED`);
        obj_extract_self(otmp);
        dealloc_obj_real(otmp);
    }
}
export function add_to_buried(obj) {
    if (!obj)
        return;
    /* C: panic if obj->where != OBJ_FREE — in JS just proceed */
    obj.where = OBJ_BURIED;
    if (game.level) {
        obj.nobj = game.level.buriedobjlist ?? null;
        game.level.buriedobjlist = obj;
    }
}

/* C mkobj.c:2399-2417 — obj_ice_effects: apply ice effects to objects at (x,y) */
export function obj_ice_effects(x, y, do_buried) {
    let otmp;

    for (otmp = (game.level?.levelObjects?.[x]?.[y]) ?? null; otmp; otmp = otmp.nexthere) {
        if (otmp.timed)
            obj_timer_checks(otmp, x, y, 0);
    }
    if (do_buried) {
        for (otmp = game.level?.buriedobjlist; otmp; otmp = otmp.nobj) {
            if (otmp.ox === x && otmp.oy === y) {
                if (otmp.timed)
                    obj_timer_checks(otmp, x, y, 0);
            }
        }
    }
}

// C ref: dungeon.c:1447-1457 Is_special() — walk the special-level
// chain (svs.sp_levchn), matched by (dnum,dlevel). game._sp_levchn is
// built by dungeon_rng.js at dungeon-init time and is ALREADY correct
// is the SINGLE firewall point that keeps every non-tut-1/tut-2 special
// level behaving exactly as today (Is_special returns null, as if this
// NOT allowlisted, and deliberately so.  Each blocked proto throws a DIFFERENT
// unported-callee during its .lua load, so admitting one crashes
// ITS OWN callee lands — they are independent ports, not one.  Their questtext
// firsttime entries are already ported below.
//
// drives the real load_special() against every dat/*-strt.lua WITHOUT touching
// this set and reports each blocker by name; add a proto only after the probe
// reports it `ok`, and only ONE AT A TIME (level generation is global — a wrong
//
// It resolves the C-side checkpoint coordinates (d3l1_002, ...) through the
// role-renamed level chain, so it reports where C actually stood — not where the
// under-reports exactly the protos that most need gating.
// — none of the three visits a *-strt level.  Admitting only Cav-strt and running
//
//   Wiz-strt           : lspo_region irregular region (same callee as Cav-strt)
//                        (was "mkmap (mines)"; mkmap landed in 7cbb4f54 and the
//                         blocker moved forward to the next unported opcode)
//   Mon-strt           : lspo_object STATUE/EGG/TIN/FIGURINE special-casing
//
// mk_mplayer dispatch (the four "knight" guards are PM_KNIGHT=335, inside the
// player-monster range [PM_ARCHEOLOGIST=331, PM_WIZARD=343], so C routes them
// through mplayer.c:117 mk_mplayer) and create_object's put_saddle_on_mon (the
// warhorse `inventory` closure). Both are now wired in js/sp_lev.js.
//
//
//    teleport.  Admitting Pri-strt therefore moves nothing measurable ... ADMIT
//
// but step 141, and the single remaining blocker was do_wear.c:820's "You speed
// signal.  It is worth re-reading how the arithmetic MOVED under the fix:
//   - admitted with the rn2(3) @ u_calc_moveamt still missing:  167 -> 162  (-5)
//   - admitted after that leaf is restored:                     167 -> 168  (+1)
// Same one-word diff, opposite verdict.  A proto loaded on a shifted RNG stream
// generates a DIFFERENT level and scores like a bug; admission is only ever
// measurable once the prefix into it is bit-exact.  Do not re-park a proto on a
// callees worth porting next are lvlfill_maze_grid (7: castle, asmodeus, orcus,
// wizard2, wizard3, fakewiz1, fakewiz2), lspo_region irregular/flood_fill_rm
// (6: Cav-strt, Wiz-strt, valley, Pri-loca, Wiz-loca, Cav-loca), create_object
// RANDOM_CLASS (4: Bar-loca, Mon-loca, Ran-loca, Val-loca), then create_altar
// priestini (2), lspo_map table-form (2), find_level LR_PORTAL by name (2).
// dat/<proto>.lua), so they need the variant-selection path, not just an opcode.
// step 189 the hero level-teleports to Dlvl 5, C's trace goes
// getbones(bones.c:645) -> the nhlib.lua `shuffle(align)` of a FRESH lua state
// -> build_room(sp_lev.c:2811), i.e. makemaz(slev->proto) on a special level,
// blocked, Is_special returned null there, JS fell through to regular themed-room
// generation, and every one of the 1,621 remaining steps rendered the wrong level.
// ┌───────────────────────────────────────────────────────────────────────────
// │ SUPERSEDED — castle IS in LOADER_READY (see the const below) and its
// │ -47 (below) -> -3 -> 0, with the -47 and -3 blocks each concluding that the
// │ cost belonged to castle's own generation.  It never did.
// │
// │ THE COROLLARY, because it explains all three wrong readings and generalises
// │ past castle: A PROTO'S PARKED ADMISSION COST IS NOT EVIDENCE ABOUT THE
// │ PROTO until the leaf stream PAST THE END OF ITS OWN GENERATION has been
// │ diffed.  A special level is the only thing that populates the arrival
// │ regions (des.teleport_region -> svu.updest / svd.dndest), so a defect in
// │ the ARRIVAL path is invisible until that level is admitted — and then it is
// │ charged to the level.  Re-park a proto only after diffing past its
// │ build_room tail into goto_level/place_lregion; a cost that survives THAT is
// │ a property of the level.
// └───────────────────────────────────────────────────────────────────────────
// the first entry whose blocker chain is fully cleared and which STILL must not
//   answers the level-teleport menu with "j" ("j -   castle: 25 (tune EEBGG)")
//   and C's trace goes getbones(bones.c:645) -> the nhlib.lua shuffle(align) of
//   a FRESH lua state, i.e. makemaz(slev->proto) on a special level.  With
//   castle blocked, Is_special returns null there and JS draws rn2(5) @
//   js/mklev.js:4513 — regular themed-room generation on the wrong level.  That
//   first screen divergence.
//   The blocker chain (lvlfill_maze_grid -> lspo_mazewalk's fill_empty_maze
//   tail (maze1xy + rndtrap) -> js/trap.js's three exported throwing stubs that
//   shadowed already-ported set_levltyp/recalc_block_point/spot_stop_timers)
//   from BLOCKED to `ok` (173 des.* opcodes, load_special completes).
//   the real castle is STRUCTURALLY right and moves the RNG axis a long way
//   (prefixMatch 8708 -> 12975 after the l_selection_setpoint fix below), but
//   its generation is still not leaf-exact, so the frames it now renders are
//   wrong where the old random level happened to coincide.  Cardinal Rule 4
//   NEXT BLOCKER, for whoever picks this up: the probe now reports
//   "not yet ported: mkroll_launch", and with castle admitted the first RNG
//   divergence is leaf 12975 — C rn2(3) @ induced_align(dungeon.c:2012) vs
// C trace until that is fixed.
//   call a method on a non-table value".  Those are the CONDITIONAL arms of
//   bigrm-2.lua:50 (`selection = darkness:grow()`) and bigrm-5.lua:33-34
//   (`selection.match("."):percentage(2):grow()`); the unconditional arms load
//   fine, which is why lua-level-load-probe and loader-chain both report
//   bigrm-2/-5 CHAIN-CLEARS and see none of this.  Port those two and the -27
//   should come back as a gain.
//   only appeared once the two render bugs ahead of this commit landed (the
//   golem class char and the stale 3.7 wand probabilities): with bigrm admitted
//   built leaf-exactly and still missed on 4 cells.  That is the general shape
//   and the reason the earlier -11 was not evidence against the level:
//   ADMITTING A SPECIAL LEVEL PAYS NOTHING UNTIL EVERY GLYPH ON IT IS RIGHT,
//   just after RNG ones.
//     baseline                                    4051
//     + the two render fixes, bigrm NOT admitted   4051   (+0 — invisible
//                                                          without the level)
//     + bigrm admitted                             4095   (+44)
// stable property of castle's own generation, not a stale coincidence, and it
// stays out.
//   [REFUTED — this sentence is the wrong conclusion this file exists to warn
//   about.  The -47 was the ARRIVAL path (lspo_drawbridge's raw map coords,
//   goto_level never reading svd.dndest, place_lregion missing
//   put_lregion_here), not castle's generation, and it went -47 -> -3 -> 0 as
//   evidence that the cost is intrinsic; it is only evidence that nothing in
//   the chain the level exercises had landed yet.  See the banner at the head
//   of these blocks.]
// Do NOT re-measure castle again without first closing the RNG
// the induced_align port (js/sp_lev.js, ae1cb942) which moved it to 12999 —
// next blocker `rn2(5) @ m_initinv(makemon.c:644)` vs JS rn2(50), the soldier
// body-armor rounds (makemon.c:637-646) on the castle's garrison.
// Contrast FILL_READY's minefill below, whose parked -60 DID go stale (to 0).
//
// generation chain: m_initinv's mercenary arm, the minotaur's 5.0 rn2(8), the
// long worm's tail, the des-coder leak, find_branch_room, the
// fill_special_room loop on the special-level arm, and squadmon's ROLL_FROM.
// THE COST HAS ALMOST ENTIRELY GONE, BUT IT IS STILL NEGATIVE:
//   castle NOT admitted   4168
// i.e. -47 -> -3.  So the old "stable property of castle's own generation"
// verdict was wrong — the cost was the unported chain, not the level — but
// castle STILL does not pay for itself and stays out under the measure-then-
// is `rn2(10) @ place_lregion(mkmaze.c:396)` at leaf 22802 of 120639
// the level and moved on to mineralize_kelp while C is still placing lregions.
// Close that and re-measure — this is now a near-miss, not a parked negative.
//
// -3 was never castle's own generation — that had already been leaf-exact for a
// while; it was three defects in the ARRIVAL, all outside sp_lev, that only a
// level declaring a teleport_region could expose:
//   1. lspo_drawbridge never called get_location_coord, so castle.lua:81's
//      map-relative (05,08) aimed at absolute (05,08) — off the map, STONE, and
//      create_drawbridge's IS_WALL guard silently declined.  The MOAT square C
//      turns into DRAWBRIDGE_UP stayed water and mineralize() drew one extra
//      water_has_kelp rn2(30).  (Leaf 22802.)
//   2. goto_level inlined `place_lregion(0,0,0,0,...)` for the level-teleport
//      arm instead of calling u_on_rndspot, on the premise that svu.updest /
//      svd.dndest "are always zero"; fixup_special had been filling them in
//      from des.teleport_region all along.  C searched a 10x21 strip, JS the
//      whole 79x21 map.  (Leaf 22803.)  C's do.c:1689-1691 zeroing of the two
//      regions before mklev() was also missing, so a special level's arrival
//      region would have leaked onto the next ordinary level.
//   3. place_lregion had no put_lregion_here: bad_location does not look at
//      monsters, and C re-rolls when a candidate square holds one.  C's third
//      candidate (5,5) held a maze monster; JS took it.  (Leaf 22808.)
// With all three closed the castle's whole generation AND arrival are leaf-exact
//   baseline (no fixes, castle out)       4807
//   three fixes in, castle admitted       4812   (castle itself: EXACTLY 0)
// still gains 2 — and castle's own admission is now cost-NEUTRAL rather than
// negative.  It is admitted on structural faithfulness (TOOLING_PHILOSOPHY #8)
// rooms-and-corridors level where C renders the stronghold, and its first RNG
// divergence stays pinned at leaf 8708 of 120639 (7% in) instead of 22810.
// cost as a property OF THE LEVEL.  It never was.  It was the arrival path that
// only a level declaring a teleport_region exercises.
//
// minend-1/-2/-3, soko2-1/-2, soko3-1/-2, soko4-1/-2, tower2, tower3, medusa-1,
// juiblex and baalz — the block above's "minetn/minend ... are multi-variant, so
// they need the variant-selection path, not just an opcode" is stale: minetn is
// admitted and multi-variant, so that path exists and minend loads through it.
// Only tower1 (js/lua/interp.js:1399), wizard3 and fakewiz1 (both
// js/sp_lev.js:6008) are still BLOCKED, and `rogue` has no dat/rogue.lua at all.
// LOADER_READY now, and the probe's BLOCKED verdict on wizard3/fakewiz1 was an
// artifact of the probe env having no sp_levchn — see the wizard3 note above
// LOADER_READY below.
//
//     minend OUT   6835 / 11405, 27 passing
//                                               coverage 801 -> 799)
// miss and JS renders a rooms-and-corridors level where C renders Mine's End, so
// admitting minend is structurally right — and it buys nothing today because
// (C `rn2(5) @distfleeck(monmove.c:538)` vs JS `rnd(12) @js/dig.js:878`
// mdig_tunnel, i.e. JS tunnels a mines monster C does not), so the level is
// built off a stream that is already wrong.  Close THAT first, then re-admit:
// this is the castle shape exactly (a proto's parked cost measures the unported
// chain around it, not the level), and per that banner the -2 should be
//
// IN, and the paragraph above was HALF right.  The leaf-43164 monmove root was
// closed (m_digweapon_check had a complete port and no call site; commit
// parked cost did not decay.  What made it pay was a SECOND link four leaves
// further down the same level-generation chain: js/m_initweap.js built the
// dwarvish mithril-coat with otyp 129 ("orcish chain mail", IRON) instead of
// 126 (MITHRIL), so every armed dwarf drew four mkobj_erosions leaves C never
// 6836 -> 6862.
// So do not carry forward "a parked negative decays".  Carry forward: a proto's
// parked cost measures THE UNPORTED CHAIN AROUND IT, the number tells you
// nothing about WHICH link is still missing, and re-measuring after closing one
// link is not evidence about the next.  Follow the RNG prefix (rng-prefix-match
// prefixMatch, which is monotone) rather than the admission's score delta.
//
// were tried and REVERTED.  Baseline for every row is the tree at a9544f8f,
//     + medusa                      6869   (-25: the SAME two deltas)
// AND THAT IS THE POINT: read those three rows together.  medusa alone
// reproduces the four-proto loss exactly, which invites the conclusion that the
// other three are free — and they are not, they cost 12 on their own.  ADMISSION
// COSTS DO NOT COMPOSE AND DO NOT SUBTRACT.  These protos all generate levels
// into the same dungeon state, so two admissions can hide each other's loss.
// Never infer one proto's cost by differencing two multi-proto runs; score the
// exact set you intend to ship.  (This is the same trap as the falsified
// "independent roots compose on merge" note, seen from the other side.)
// None of the four is admitted today.  When re-trying, do ONE proto per
// tower1 monster-inventory divergence (C next_ident @mkobj.c:521 at leaf 52757)
// is closed — every one of these levels is currently built off a stream that is
const LOADER_READY = new Set(['tut-1', 'tut-2', 'Arc-strt', 'Hea-strt', 'Tou-strt', 'Tou-loca', 'Tou-goal', 'Sam-strt', 'Bar-strt', 'Val-strt', 'Kni-strt', 'Kni-goal', 'Pri-strt', 'Pri-loca', 'Pri-goal', 'Bar-loca', 'knox', 'fire', 'air', 'oracle', 'valley', 'bigrm', 'castle', 'sanctum', 'asmodeus', 'juiblex', 'baalz', 'fakewiz1', 'fakewiz2', 'wizard1', 'wizard3', 'wizard2', 'orcus', 'minetn', 'minend', 'soko1', 'soko2', 'soko3', 'soko4', 'tower1', 'tower2', 'tower3', 'medusa', 'Wiz-strt', 'Wiz-loca', 'Arc-loca', 'Arc-goal', 'Bar-goal', 'Wiz-goal', 'Cav-goal', 'Cav-loca', 'Cav-strt', 'Hea-goal', 'Hea-loca', 'Kni-loca', 'Mon-goal', 'Mon-loca', 'Mon-strt', 'Ran-goal', 'Ran-loca', 'Ran-strt', 'Rog-goal', 'Rog-loca', 'Rog-strt', 'Sam-goal', 'Sam-loca', 'Val-loca', 'Val-goal', 'astral', 'earth', 'water']);
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
export function Is_special(uz) {
    const sl = sp_levchn_lookup(uz);
    return (sl && LOADER_READY.has(sl.proto)) ? sl : null;
}
const FILL_READY = new Set(['minefill', 'hellfill', 'tower']);
const QUEST_FILL_READY = new Set([
    'Arc-fila', 'Arc-filb', 'Bar-fila', 'Bar-filb',
    'Pri-fila', 'Pri-filb', 'Wiz-fila', 'Wiz-filb',
    'Cav-fila', 'Hea-fila', 'Hea-filb', 'Kni-fila', 'Kni-filb', 'Mon-fila', 'Mon-filb',
    'Ran-fila', 'Ran-filb', 'Rog-fila', 'Rog-filb', 'Sam-fila', 'Sam-filb',
    'Tou-fila', 'Tou-filb', 'Val-filb', 'Cav-filb', 'Val-fila',
]);
function curse(otmp) {
    if (!otmp)
        return;
    if ((otmp.oclass | 0) === COIN_CLASS)
        return;
    otmp.blessed = false;
    otmp.cursed = true;
    if ((otmp.otyp | 0) === BAG_OF_HOLDING)
        otmp.owt = weight(otmp);
}
const HEAVY_IRON_BALL = 477;
const CANDELABRUM_OF_INVOCATION = 262;
/* C mkobj.c:1889 weight(obj) — full weight of one object incl. container
 * contents / statue-of-monster heft / corpse-by-mons-cwt.  Was a broken
 * placeholder (`return otmp?.owt || 1`) that made every mksobj-family
 * owt assignment in this file a no-op; ported faithfully here since this
 * file (unlike js/weight.js, a replay-only simplification for inventory
 * reconstruction) always has live corpsenm/MONS_ROWS/MONS_CWT/MONS_MSIZE
 * data available for freshly-created objects.
 * The oeaten branches (CORPSE-with-oeaten, FOOD_CLASS-with-oeaten) are
 * omitted: every object this file's weight() is called on is newly
 * created via mksobj (obj.oeaten is always 0 from cg.zeroobj), so those
 * branches are unreachable here — matching C's actual behavior for this
 * call site, not a simplification of it. */
function weight(otmp) {
    if (!otmp) return 0;
    const otyp = otmp.otyp | 0;
    let wt = (otyp >= 0 && otyp < OC_WEIGHT.length) ? (OC_WEIGHT[otyp] | 0) : 0;
    const quan = otmp.quan | 0;
    if (quan < 1) return 0; /* C impossible() path */
    if (Object.prototype.hasOwnProperty.call(otmp, 'globby') && otmp.globby) return otmp.owt | 0;
    const isContainer = (otyp >= LARGE_BOX && otyp <= BAG_OF_TRICKS);
    if (isContainer || otyp === STATUE) {
        if (otyp === STATUE && ismnum(otmp.corpsenm)) {
            const msize = MONS_MSIZE[otmp.corpsenm] | 0;
            const minwt = (msize + msize + 1) * 100;
            wt = Math.trunc((3 * (MONS_CWT[otmp.corpsenm] | 0)) / 2);
            if (wt < minwt) wt = minwt;
            wt *= quan;
        }
        let cwt = 0;
        for (let c = otmp.cobj; c; c = c.nobj)
            cwt += weight(c);
        if (otyp === BAG_OF_HOLDING) {
            cwt = otmp.cursed ? (cwt * 2)
                : otmp.blessed ? Math.trunc((cwt + 3) / 4)
                    : Math.trunc((cwt + 1) / 2);
        }
        return wt + cwt;
    }
    if (otyp === CORPSE && ismnum(otmp.corpsenm)) {
        const long_wt = quan * (MONS_CWT[otmp.corpsenm] | 0);
        return long_wt > 2147483647 ? 2147483647 : long_wt;
    }
    if ((otmp.oclass | 0) === COIN_CLASS) {
        const cw = Math.trunc((quan + 50) / 100);
        return Math.max(cw, 1);
    }
    if (otyp === HEAVY_IRON_BALL && (otmp.owt | 0) !== 0) {
        return otmp.owt | 0;
    }
    if (otyp === CANDELABRUM_OF_INVOCATION && (otmp.spe | 0)) {
        return wt + (otmp.spe | 0) * (OC_WEIGHT[TALLOW_CANDLE] | 0);
    }
    return wt ? (wt * quan) : ((quan + 1) >> 1);
}
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

export async function add_to_container(container, obj) {
    if (obj.where !== OBJ_FREE)
        throw new Error(`panic: add_to_container: obj where=${obj.where}, not free`);
    if (container.where !== OBJ_INVENT && container.where !== 4 /* OBJ_MINVENT */)
        await obj_no_longer_held(obj);
    for (let otmp = container.cobj; otmp; otmp = otmp.nobj) {
        const target = { o: otmp }, source = { o: obj };
        if (await merged(target, source))
            return target.o;
    }
    obj.where = OBJ_CONTAINED;
    obj.ocontainer = container;
    obj.nobj = container.cobj;
    container.cobj = obj;
    return obj;
}
/* C invent.c:1465-1475 sobj_at — find a particular type of object at a map
 * location by walking the per-tile nexthere chain (svl.level.objects[x][y]),
 * returning the first obj whose otyp matches, or NULL (null) if none.
 *   for (otmp = svl.level.objects[x][y]; otmp; otmp = otmp->nexthere)
 *       if (otmp->otyp == otyp) break;
 *   return otmp;
 * game.level.levelObjects[x][y] is the JS mirror of C's objects[x][y]
 * (js/game.js GameMap.levelObjects). When the tile chain is empty the loop
 * exhausts and we return null, matching C's NULL pointer. */
function sobj_at(otyp, x, y) {
    let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
    while (otmp) {
        if (otmp.otyp === otyp)
            break;
        otmp = otmp.nexthere ?? null;
    }
    return otmp;
}
/* C mkobj.c:2068-2120 — mkcorpstat: make corpse/statue at (x,y) or random if x==0&&y==0 */
export async function mkcorpstat(objtyp, mtmp, pm, x, y, flags) {
    const init = (flags & CORPSTAT_INIT) !== 0;
    let otmp;
    /* C mkobj.c:2080-2085 — x==0&&y==0 means random placement (rloco); otherwise mksobj_at */
    if (x === 0 && y === 0) {
        otmp = (await mksobj(objtyp, init, false));
        /* rloco is not ported; object stays unplaced (no fobj entry) */
    }
    else {
        otmp = (await mksobj_at(objtyp, x, y, init, false));
    }
    otmp.spe = (flags & CORPSTAT_SPE_VAL) | 0;
    /* C: mkcorpstat_norevive is carried through envrmt, and a cancelled
     * monster's corpse is explicitly marked non-revivable (except riders). */
    otmp.norevive = (game.gm?.mkcorpstat_norevive ? 1 : 0);
    if (mtmp) {
        if (pm == null)
            pm = mtmp.data ?? mtmp.mndx ?? mtmp.mnum ?? null;
        const mndx = (pm !== null && typeof pm === 'object')
            ? (pm.pmidx ?? pm.mnum ?? NON_PM) | 0 : (pm | 0);
        if (mtmp.mcan && !is_rider_pm(mndx))
            otmp.norevive = 1;
    }
    if (pm != null) {
        const old_corpsenm = otmp.corpsenm;
        otmp.corpsenm = (pm !== null && typeof pm === 'object') ? (pm.pmidx | 0) : (pm | 0);
        otmp.owt = weight(otmp);
        /* C mkobj.c:2111–2115 — reschedule corpse decay when corpse type has special rotting/revival */
        if (objtyp === CORPSE
            && (!!game.flags?.zombify || special_corpse(old_corpsenm)
                || special_corpse(otmp.corpsenm))) {
            /* C mkcorpstat clears the timer installed by mksobj_at before
             * re-scheduling it for the overridden species. */
            obj_stop_timers(otmp);
            start_corpse_timeout(otmp);
        }
    }
    return otmp;
}
function rndmonnum() {
    return rndmonnumAdj(0, 0);
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
function makemon_rnd_goodpos(mon, gpflags, cc) {
    /* C makemon.c:1087 — gpflags |= GP_AVOID_MONPOS */
    gpflags |= GP_AVOID_MONPOS;
    let tryct = 0;
    let nx, ny;
    let good;
    /* C makemon.c:1088-1093 — do { pick random pos; test goodpos } while < 50 */
    do {
        nx = rn1(COLNO - 3, 2); /* rn2(COLNO-3)+2 = rn2(77)+2 */
        ny = rn2(ROWNO);
        /* C: (!gi.in_mklev && cansee(nx,ny)) ? FALSE : goodpos(nx, ny, mon, gpflags)
         * goodpos with null mon: isok + !u_at + !MON_AT(avoid_monpos) + accessible */
        if (!game.in_mklev && cansee(nx, ny)) {
            good = false;
        } else {
            good = makemon_goodpos_pos(nx, ny, mon, gpflags);
        }
    } while ((++tryct < 50) && !good);

    if (!good) {
        /* C makemon.c:1099-1131 — fallback: scan all map positions.
         * Two passes: bl=0 skips visible cells (pass skipped when in_mklev or Blind);
         * bl=1 ignores visibility. Pick first goodpos cell using (dx+xofs,dy+yofs) wrap. */
        const xofs = nx;
        const yofs = ny;
        /* C: bl = (gi.in_mklev || Blind) ? 1 : 0 */
        const Blind = _Blind_mk();
        let bl = (game.in_mklev || Blind) ? 1 : 0;
        let found = false;
        outer:
        for (; bl < 2; bl++) {
            /* C makemon.c:1105-1106 — if (!bl) gpflags &= ~GP_CHECKSCARY */
            if (!bl)
                gpflags &= ~GP_CHECKSCARY;
            for (let dx = 0; dx < COLNO; dx++) {
                for (let dy = 0; dy < ROWNO; dy++) {
                    nx = ((dx + xofs) % (COLNO - 1)) + 1;
                    ny = ((dy + yofs) % (ROWNO - 1)) + 1;
                    if (bl === 0 && cansee(nx, ny))
                        continue;
                    if (makemon_goodpos_pos(nx, ny, mon, gpflags)) {
                        found = true;
                        break outer;
                    }
                }
            }
            /* C makemon.c:1116-1130 — if bl==0 and monster can move, try stairways */
            if (bl === 0 && (!mon || (mon.data?.mmove | 0) !== 0)) {
                for (let stway = game.stairs; stway; stway = stway.next) {
                    /* C: stway->tolev.dnum == u.uz.dnum && !rn2(2) */
                    const uz_dnum = (game.u?.uz?.dnum ?? 0) | 0;
                    if ((stway.tolev?.dnum ?? 0) === uz_dnum && !rn2(2)) {
                        nx = stway.sx;
                        ny = stway.sy;
                        break;
                    }
                }
                if (makemon_goodpos_pos(nx, ny, mon, gpflags)) {
                    found = true;
                    break;
                }
            }
        }
        if (!found)
            return null;
    }
    cc.x = nx;
    cc.y = ny;
    return cc;
}
function makemon_goodpos_pos(x, y, mon, gpflags) {
    return !!goodpos(x, y, mon, gpflags);
}
/* C ref: makemon.c:81-147 m_initgrp — spawn a group of monsters of mtmp's
 * type around (x,y).  n = max group size (3 for m_initsgrp, 10 for m_initlgrp).
 *   cnt = rnd(n); then cnt /= (u.ulevel<3 ? 4 : u.ulevel<5 ? 2 : 1) [low-level
 *   swarm tuning], clamped to >=1.  For each remaining member: skip if the type
 *   is peace_minded (no peaceful groups), else enexto_gpflags() picks a spot and
 *   makemon(...|MM_NOGRP) creates it; the new mon is forced hostile + set_malign.
 * The HPUX/DGUX debug block (makemon.c:89-122) is a compiler-bug workaround under
 *   #if defined(__GNUC__) && (HPUX||DGUX) — not compiled on our target; omitted.
 * @param {{ mnum: number, mx: number, my: number }} mtmp
 * @param {number} x @param {number} y @param {number} n @param {number} mmflags */
async function m_initgrp(mtmp, x, y, n, mmflags) {
    const mndx = mtmp.mnum;
    /* C makemon.c:87 — int cnt = rnd(n); */
    let cnt = rnd(n);
    /* C makemon.c:108 — cut down on swarming at low character levels [mrs] */
    const ulevel = (game.u?.ulevel ?? 1) | 0;
    cnt = Math.trunc(cnt / (ulevel < 3 ? 4 : ulevel < 5 ? 2 : 1));
    /* C makemon.c:115-116 */
    if (!cnt)
        cnt++;
    /* C makemon.c:124-146 — place each member */
    let mmx = x, mmy = y;
    while (cnt--) {
        /* C makemon.c:127 — don't create groups of peaceful monsters */
        if (peaceMinded(mndx))
            continue;
        /* C makemon.c:134 — enexto_gpflags(&mm, mm.x, mm.y, mtmp->data, mmflags).
         * enexto_gpflags supplies a fake monster so goodpos evaluates the
         * species' terrain, water, boulder, and scary-square rules, then retries
         * without GP_CHECKSCARY if the first pass finds no square. */
        const fakemon = {
            m_id: 0,
            mnum: mndx,
            mx: mmx,
            my: mmy,
            data: permonstTemplate(mndx),
            wormno: 0,
        };
        const groupFlags = mmflags | 0;
        const cc = enexto_core(mmx, mmy, fakemon,
            GP_CHECKSCARY | groupFlags)
            || enexto_core(mmx, mmy, fakemon, groupFlags);
        if (cc) {
            mmx = cc.x;
            mmy = cc.y;
            /* C makemon.c:135 — makemon(mtmp->data, mm.x, mm.y, mmflags | MM_NOGRP).
             * makemon is async but a MM_NOGRP member never reaches the group-block
             * await, so it resolves synchronously and prepends the new monster to
             * game.fmon before returning (same invariant the ghost-fill path relies
             * on); read the member off the fmon head rather than awaiting. */
            await makemon(mndx, mmx, mmy, (mmflags | MM_NOGRP));
            const mon = game.fmon;
            if (mon && (mon.mnum === mndx)) {
                /* C makemon.c:137-139 — force hostile; set_malign has no RNG (skipped) */
                mon.mpeaceful = 0;
                mon.mavenge = 0;
            }
        }
    }
}
export async function set_mimic_sym(mon) {
    const Protection_from_shape_changers = false;
    if (!mon || Protection_from_shape_changers)
        return;
    /* local constants (objclass.h / objects.h / defsym.h / mextra.h) */
    const M_AP_OBJECT = 2, M_AP_FURNITURE = 1;
    const STRANGE_OBJECT = 0;
    const RANDOM_CLASS = 0, WEAPON_CLASS = 2, ARMOR_CLASS = 3, RING_CLASS = 4,
        AMULET_CLASS = 5, TOOL_CLASS = 6, FOOD_CLASS = 7, POTION_CLASS = 8,
        SCROLL_CLASS = 9, SPBOOK_CLASS = 10, WAND_CLASS = 11, COIN_CLASS = 12,
        GEM_CLASS = 13, ROCK_CLASS = 14, MAXOCLASSES = 18;
    const S_MIMIC_DEF = 60; /* defsym.h monsym sentinel (not an object class) */
    const DELPHI = 9, FODDERSHOP = 24; /* room rtypes (const.js) */
    /* PCHAR symbol values (defsym.h) for furniture disguises */
    const S_vwall = 1, S_hwall = 2, S_vcdoor = 15, S_hcdoor = 16,
        S_upstair = 25, S_dnstair = 26, S_altar = 33, S_grave = 34,
        S_throne = 35, S_sink = 36, S_fountain = 37;
    const AM_NONE = 0;
    /* PM_ARCHEOLOGIST / PM_WIZARD come from the file-level pm.generated.js
     * import (line 19); the former function-local copies (331/343) held the
     * same values but shadowed it. */
    const uz = game.u?.uz;
    const mx = mon.mx | 0, my = mon.my | 0;
    const loc = game.level?.at(mx, my);
    const typ = loc?.typ | 0;
    /* only valid for INSIDE of room */
    let roomno = ((loc?.roomno | 0) - ROOMOFFSET);
    let rt;
    if (roomno >= 0)
        rt = (game.level?.rooms?.[roomno]?.rtype | 0);
    else
        rt = 0; /* roomno < 0 case for GCC_WARN */

    let ap_type, appear, s_sym;
    const OBJ_AT = game.level?.levelObjects?.[mx]?.[my] ?? null;
    const assign_sym = async () => {
        if (s_sym === MAXOCLASSES) {
            const furnsyms = [S_upstair, S_upstair, S_dnstair, S_dnstair,
                S_altar, S_grave, S_throne, S_sink];
            ap_type = M_AP_FURNITURE;
            appear = furnsyms[rn2(furnsyms.length)]; /* ROLL_FROM */
        } else {
            ap_type = M_AP_OBJECT;
            if (s_sym === S_MIMIC_DEF) {
                appear = STRANGE_OBJECT;
            } else if (s_sym === COIN_CLASS) {
                appear = GOLD_PIECE;
            } else {
                const otmp = await mkobj(s_sym, false); /* C: mkobj((char)s_sym, FALSE) */
                appear = otmp ? (otmp.otyp | 0) : STRANGE_OBJECT;
                /* C obfree(otmp): JS GC handles the throwaway object */
            }
        }
    };
    /* syms[] (makemon.c) — object classes + two MAXOCLASSES + two S_MIMIC_DEF */
    const syms = [MAXOCLASSES, MAXOCLASSES, RING_CLASS, WAND_CLASS, WEAPON_CLASS,
        FOOD_CLASS, COIN_CLASS, SCROLL_CLASS, POTION_CLASS, ARMOR_CLASS,
        AMULET_CLASS, TOOL_CLASS, ROCK_CLASS, GEM_CLASS, SPBOOK_CLASS,
        S_MIMIC_DEF, S_MIMIC_DEF];

    if (OBJ_AT) {
        ap_type = M_AP_OBJECT;
        appear = OBJ_AT.otyp | 0;
    } else if (IS_DOOR(typ) || IS_WALL(typ) || typ === SDOOR || typ === SCORR) {
        ap_type = M_AP_FURNITURE;
        const lw = mx !== 0 ? (game.level?.at(mx - 1, my)?.typ | 0) : -1;
        if (mx !== 0 && (lw === HWALL || lw === TLCORNER || lw === TRWALL
            || lw === BLCORNER || lw === TDWALL || lw === CROSSWALL || lw === TUWALL))
            appear = Is_rogue_level(uz) ? S_hwall : S_hcdoor;
        else
            appear = Is_rogue_level(uz) ? S_vwall : S_vcdoor;
    } else if ((game.level?.flags?.is_maze_lev)
        && !(In_mines(uz) && in_town(game.u?.ux | 0, game.u?.uy | 0))
        && !In_sokoban(uz) && rn2(2)) {
        ap_type = M_AP_OBJECT;
        appear = STATUE;
    } else if (roomno < 0 && !t_at(mx, my)) {
        ap_type = M_AP_OBJECT;
        appear = BOULDER;
    } else if (rt === ZOO || rt === VAULT) {
        ap_type = M_AP_OBJECT;
        appear = GOLD_PIECE;
    } else if (rt === DELPHI) {
        if (rn2(2)) {
            ap_type = M_AP_OBJECT;
            appear = STATUE;
        } else {
            ap_type = M_AP_FURNITURE;
            appear = S_fountain;
        }
    } else if (rt === TEMPLE) {
        ap_type = M_AP_FURNITURE;
        appear = S_altar;
    } else if (rt >= SHOPBASE) {
        if (rn2(10) >= depth_of_level(uz)) {
            s_sym = S_MIMIC_DEF; /* -> STRANGE_OBJECT */
            await assign_sym();
        } else {
            s_sym = get_shop_item(rt - SHOPBASE);
            if (s_sym < 0) {
                ap_type = M_AP_OBJECT;
                appear = -s_sym;
            } else if (rt === FODDERSHOP && s_sym > MAXOCLASSES) {
                ap_type = M_AP_OBJECT;
                appear = rn2(2) ? LUMP_OF_ROYAL_JELLY : SLIME_MOLD;
            } else {
                if (s_sym === RANDOM_CLASS || s_sym >= MAXOCLASSES)
                    s_sym = syms[rn2(syms.length - 2) + 2];
                await assign_sym();
            }
        }
    } else {
        s_sym = syms[rn2(syms.length)]; /* ROLL_FROM(syms) */
        await assign_sym();
    }
    mon.m_ap_type = ap_type;
    mon.mappearance = appear;
    /* when appearing as an object based on a monster type, pick a shape */
    if (ap_type === M_AP_OBJECT
        && (appear === STATUE || appear === FIGURINE
            || appear === CORPSE || appear === EGG || appear === TIN)) {
        let mndx = rndmonnum();
        const nocorpse_ndx = ((MONS_ROWS[mndx]?.[3] | 0) & G_NOCORPSE) !== 0;
        if (appear === CORPSE && nocorpse_ndx)
            mndx = rn1(PM_WIZARD - PM_ARCHEOLOGIST + 1, PM_ARCHEOLOGIST);
        else if ((appear === EGG && !can_be_hatched(mndx))
            || (appear === TIN && nocorpse_ndx))
            mndx = NON_PM;
        mon.mcorpsenm = mndx;
    } else if (ap_type === M_AP_OBJECT && appear === SLIME_MOLD) {
        mon.mcorpsenm = (game.context?.current_fruit | 0);
        if (game.flags) game.flags.made_fruit = true;
    } else if (ap_type === M_AP_FURNITURE && appear === S_altar) {
        const algn = rn2(3) - 1; /* -1/0/+1 */
        /* C makemon.c:2542 `(Inhell && rn2(3)) ? AM_NONE : Align2amask(algn)`.
         * `Inhell` is a FUNCTION here (js/makemon.js:368), so the bare read was
         * ALWAYS TRUTHY and the rn2(3) fired on EVERY altar-mimic, everywhere in
         * the dungeon — an EXTRA RNG DRAW in level generation that C makes only
         * in Gehennom, where && short-circuits it away.  fn-truthy-lint HARD. */
        mon.mcorpsenm = (Inhell() && rn2(3)) ? AM_NONE : Align2amask(algn);
    } else if (mon.mcorpsenm != null) {
        mon.mcorpsenm = NON_PM;
    }
    /* C: if (does_block(mx,my)) block_point(mx,my) — a mimic disguised as a
     * wall/closed-door/boulder blocks light.  Only the furniture-wall/door and
     * boulder disguises are light-blockers; an object like STRANGE_OBJECT is not. */
    const mimicBlocks =
        (ap_type === M_AP_FURNITURE
            && (appear === S_hcdoor || appear === S_vcdoor
                || appear === S_hwall || appear === S_vwall))
        || (ap_type === M_AP_OBJECT && appear === BOULDER);
    if (mimicBlocks)
        block_point(mx, my);
}

// C ref: makemon.c:1140+ makemon — create a monster at (x,y) or random pos if x==y==0
// C ref: makemon.c:1214–1260 (rndmonst path), next_ident, newmonhp
export async function makemon(mdat, x, y, mmflags) {
    mmflags |= 0;
    if (typeof process !== 'undefined' && ENV?.FF_MAKEMON_TRACE === '1') {
        const g = game;
        const mndx = mdat == null ? -1 : makemonPtrMndx(mdat);
        pushRngLogEntry(`^makemon_trace[moves=${g.moves} dlevel=${g.u?.uz?.dlevel} mndx=${mndx} xy=${x},${y} flags=${mmflags}]`);
    }
    const byyou = (x === ((game.u?.ux ?? -1) | 0)) && (y === ((game.u?.uy ?? -1) | 0));
    /* C makemon.c:1159 — allow_minvent = ((mmflags & NO_MINVENT) == 0); cleared
     * at :1368 by a successful shapechanger newcham(). */
    let allow_minvent = (mmflags & NO_MINVENT) === 0;
    /* C makemon.c:1172-1174 — early exit when debug_mongen set, or (no rndmongen &&
     * random-monster request): mirrors `iflags.debug_mongen || (!rndmongen && !ptr)`.
     * JS omits debug_mongen (wizard mode not tracked); rndmongen guard is critical for
     * RNG parity — fastforward steps fire rn2(70) and call makemon(null,0,0,0) only
     * when the level has rndmongen=true, matching C's early-return. */
    if (mdat == null && !(game.level?.flags?.rndmongen ?? true)) {
        return null;
    }
    const gpflags = ((mmflags & MM_IGNOREWATER) ? MM_IGNOREWATER : 0)
                  | GP_CHECKSCARY | GP_AVOID_MONPOS;
    if (x === 0 && y === 0) {
        const cc = { x: 0, y: 0 };
        const fakemon = mdat == null ? null
            : { data: permonstTemplate(makemonPtrMndx(mdat)),
                mnum: makemonPtrMndx(mdat), m_id: 0, wormno: 0,
                mx: 0, my: 0, minvent: null };
        if (!makemon_rnd_goodpos(fakemon, gpflags, cc))
            return null;
        x = cc.x;
        y = cc.y;
    }
    else if (byyou && !game.in_mklev) {
        const fakemon2 = mdat == null ? null
            : { data: permonstTemplate(makemonPtrMndx(mdat)),
                mnum: makemonPtrMndx(mdat), m_id: 0, wormno: 0,
                mx: 0, my: 0, minvent: null };
        const cc2 = enexto_core(x, y, fakemon2, gpflags)
                 || enexto_core(x, y, fakemon2, gpflags & ~GP_CHECKSCARY);
        if (!cc2)
            return null;
        x = cc2.x;
        y = cc2.y;
    }
    if (m_at(x, y)) {
        if (!(mmflags & MM_ADJACENTOK))
            return null;
        /* C makemon.c:1196 — `enexto_core(&cc, x, y, ptr, gpflags)`; same
         * fakemon/gpflags fix as the byyou branch above. */
        const fakemon3 = mdat == null ? null
            : { data: permonstTemplate(makemonPtrMndx(mdat)),
                mnum: makemonPtrMndx(mdat), m_id: 0, wormno: 0,
                mx: 0, my: 0, minvent: null };
        const cc2 = enexto_core(x, y, fakemon3, gpflags);
        if (!cc2)
            return null;
        x = cc2.x;
        y = cc2.y;
    }
    const anymon = (mdat == null);
    let mndx = null;
    if (mdat == null) {
        const fakemon = { data: null, mnum: NON_PM, m_id: 0, wormno: 0,
                          mx: 0, my: 0, minvent: null };
        let tryct = 0;
        for (;;) {
            mndx = rndmonstAdj(0, 0);
            if (mndx == null)
                return null; /* no more monsters! */
            fakemon.mnum = mndx;
            fakemon.data = permonstTemplate(mndx);
            if (++tryct > 50)
                break;
            if (!((tryct === 1 && throws_rocks_mv(fakemon.data)
                   && In_sokoban(game.u?.uz))
                  || !goodpos(x, y, fakemon, gpflags)))
                break;
        }
    }
    else {
        mndx = makemonPtrMndx(mdat);
        if (mndx === NON_PM)
            mndx = null;
        /* C makemon.c:1202-1208: explicit species may be extinct, but must
         * never be genocided.  Placement attempts above still precede this
         * check; no monster allocation or birth accounting may follow it. */
        if (mndx != null && ((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD))
            return null;
    }
    if (mndx == null) {
        return null;
    }
    const countbirth = (mmflags & MM_NOCOUNTBIRTH) === 0;
    propagate(mndx, countbirth, false);
    /* C makemon.c:1251-1252 — mtmp->nmon = fmon; fmon = mtmp; */
    const mon = {
        mx: x,
        my: y,
        mnum: mndx,
        data: permonstTemplate(mndx),
        m_id: 0,
        m_lev: 0,
        mhp: 0,
        mhpmax: 0,
        msleeping: 0,
        mpeaceful: 0,
        minvent: null,
        nmon: null,
        minvis: 0, /* C makemon.c:1318-1320 — set TRUE for STALKER/BLACK_LIGHT below */
        perminvis: 0, /* C makemon.c:1319 */
        movement: 0,
        mstrategy: 0, /* C makemon.c:1237 *mtmp = cg.zeromonst; set from mflags3 at
                       * makemon.c:1461-1468 below */
        cham: NON_PM, /* C makemon.c:1356 — default "not a shapechanger" */
        mux: 0, /* C makemon.c:1393-1395 — updated by set_apparxy when byyou && !in_mklev */
        muy: 0, /* C makemon.c: companion to mux */
    };
    /* C makemon.c:1237-1246 — the MM_E* extended-data allocations, which run
     * before the fmon link.  RNG-free.  Only MM_EPRI is wired: it is the one
     * priestini() (js/priest.js) depends on, and EPRI(mtmp) reads
     * mtmp.mextra.epri, which nothing else creates.  The other four
     * (MM_EGD/MM_ESHK/MM_EDOG) still have their state elsewhere in this
     * port (mon.emin below, the eshk writers at :1990) and are deliberately
     * NOT re-homed here — that is a separate, wider change.
     * MM_EMIN IS now wired: mk_roamer (js/priest.js, C priest.c:722) passes it
     * and then writes EMIN(roamer)->min_align/renegade, which set_malign reads
     * as mtmp.mextra.emin.min_align (js/makemon.js:776).  No existing caller
     * passes MM_EMIN, so this allocation is unreachable except from mk_roamer;
     * it is RNG-free either way. */
    /* C makemon.c:1237-1238 — `if (mmflags & MM_EGD) newegd(mtmp);`.  The
     * comment above says MM_EGD "still has its state elsewhere in this port";
     * it does not — nothing in js/ writes mtmp.mextra.egd for a monster made by
     * makemon, and js/const.js EGD(mtmp) reads exactly that.  vault.c:407's
     * `makemon(&mons[PM_GUARD], x, y, MM_EGD | MM_NOMSG)` is the only caller
     * that passes the flag, and invault() writes EGD(guard)->vroom/gdx/gdy/
     * fakecorr[] on the very next lines.  RNG-free. */
    if (mmflags & MM_EGD)
        newegd(mon);
    if (mmflags & MM_EPRI)
        newepri(mon);
    if (mmflags & MM_EMIN)
        newemin(mon);
    mon.nmon = game.fmon;
    game.fmon = mon;
    // C: makemon.c:1253 mtmp->m_id = next_ident() — rnd(2)
    mon.m_id = next_ident();
    /* C makemon.c:1254-1256 —
     *     set_mon_data(mtmp, ptr);
     *     if (ptr->msound == MS_LEADER && quest_info(MS_LEADER) == mndx)
     *         svq.quest_status.leader_m_id = mtmp->m_id;
     * This is Qstat(leader_m_id)'s ONLY writer in the whole game, and it had no
     * JS counterpart: leader_m_id stayed 0 forever, so every reader of it —
     * quest_chat/quest_talk (quest.c:475,:497), dog.c:1250, mon.c:3139/:3677,
     * sounds.c:696, dothrow.c:1972, zap.c:773 — was permanently false.  RNG-free.
     */
    {
        const _ldrPtr = permonstTemplate(mndx);
        if ((_ldrPtr?.msound | 0) === MS_LEADER_MK && quest_info(MS_LEADER_MK) === mndx)
            set_quest_leader_m_id(mon.m_id);
    }
    newMonHp(mon, mndx);
    /* C makemon.c:1262–1281 — gender + corpse-related rn2(2) */
    assignMakemonFemale(mon, mndx, mmflags);
    /* C makemon.c:1281-1293 — the born-knowing block, absent from this port:
     *     if (In_sokoban(&u.uz) && !mindless(ptr)) {
     *         mon_learns_traps(mtmp, PIT);
     *         mon_learns_traps(mtmp, HOLE);
     *     }
     *     if (Is_stronghold(&u.uz) && !mindless(ptr))
     *         mon_learns_traps(mtmp, TRAPDOOR);
     *     if (ptr->msound == MS_LEADER || ptr->msound == MS_NEMESIS)
     *         mon_learns_traps(mtmp, ALL_TRAPS);
     *     if (Is_stronghold(&u.uz) || Is_knox(&u.uz) || In_endgame(&u.uz)
     *         || In_hell(&u.uz) || In_V_tower(&u.uz) || In_quest(&u.uz))
     *         mtmp->mwandexp = TRUE;
     * RNG-free, but both fields steer later RNG: mtrapseen decides whether
     * mfndpos() drops a trapped square (mon.c:2365, which sets the ARGUMENT of
     * m_move's rn2(4*(cnt-j))), and mwandexp picks buzz() vs
     * buzz_force_miss() for a monster's first wand shot (muse.c:1834). */
    {
        const _mkmPtr = permonstTemplate(mndx);
        const _mkmMsound = (_mkmPtr?.msound | 0);
        const _mkmMindless = mindless_mv(_mkmPtr || {});
        const _uz = game.u?.uz;
        if (In_sokoban(_uz) && !_mkmMindless) {
            mon_learns_traps(mon, PIT);
            mon_learns_traps(mon, HOLE);
        }
        if (Is_stronghold(_uz) && !_mkmMindless)
            mon_learns_traps(mon, TRAPDOOR);
        if (_mkmMsound === MS_LEADER_MK || _mkmMsound === MS_NEMESIS_MK)
            mon_learns_traps(mon, ALL_TRAPS);
        if (Is_stronghold(_uz) || Is_knox_level(_uz) || In_endgame(_uz)
            || Inhell(_uz) || In_V_tower(_uz) || In_quest(_uz))
            mon.mwandexp = true;
    }
    /* C makemon.c:1298 — mtmp->mcansee = mtmp->mcanmove = TRUE */
    mon.mcansee = 1;
    mon.mcanmove = 1;
    /* C makemon.c:1297 — mtmp->mgenmklev = gi.in_mklev (read by
     * mm_2way_aggression's zombie arm, mon.c:2413) */
    mon.mgenmklev = game.in_mklev ? 1 : 0;
    /* C makemon.c:1300 — mtmp->mpeaceful = (mmflags & MM_ANGRY) ? FALSE : peace_minded(ptr) */
    mon.mpeaceful = (mmflags & MM_ANGRY) !== 0 ? 0 : peaceMinded(mndx) ? 1 : 0;
    /* C makemon.c:1302 — MM_MINVIS is used by #wizgenesis.  It must run
     * after the monster has been placed/linked and after mpeaceful is set;
     * mon_set_minvis() also performs C's newsym refresh. */
    if (mmflags & MM_MINVIS)
        mon_set_minvis(mon, false);
    /* C makemon.c:1316-1321 — switch S_LIGHT/S_ELEMENTAL: STALKER and BLACK_LIGHT are perminvis */
    if (mndx === PM_STALKER || mndx === PM_BLACK_LIGHT) {
        mon.perminvis = 1; /* C: mtmp->perminvis = TRUE */
        mon.minvis = 1; /* C: mtmp->minvis = TRUE */
    }
    /* C makemon.c:1304-1307 — switch case S_MIMIC: pick the mimic's disguise
     * (m_ap_type/mappearance) and consume its appearance RNG.  Same switch as the
     * perminvis cases above (one mlet ⇒ one case), placed here to fire in C order
     * (after the makemon.c:1281 gender roll, before m_initinv). */
    if ((MONS_ROWS[mndx]?.[0] | 0) === 13 /* S_MIMIC */)
        await set_mimic_sym(mon);
    {
        const _mlet1315 = MONS_ROWS[mndx]?.[0] | 0;
        if ((_mlet1315 === 19 /* S_SPIDER */ || _mlet1315 === 45 /* S_SNAKE */)
                && game.in_mklev) {
            if (x && y)
                await mkobj_at(RANDOM_CLASS, x, y, true);
            hideunder(mon);
        }
    }
    if ((MONS_ROWS[mndx]?.[0] | 0) === 12 /* S_LEPRECHAUN, defsym.h:308 */)
        mon.msleeping = 1;
    switch (MONS_ROWS[mndx]?.[0] | 0) {
    case 57:
        if (game.in_mklev)
            hideunder(mon);
        break;
    case 36: /* S_JABBERWOCK */
    case 14:
        if (rn2(5) && !(game.u?.uhave?.amulet))
            mon.msleeping = 1;
        break;
    case 15: /* S_ORC */
        /* C you.h:297 Race_if(X) = (gu.urace.mnum == (X)); js/roles.js:588
         * sets game.urace.mnum from RACE_PM_MNUM, i.e. a real PM_ index. */
        if (((game.urace && game.urace.mnum) | 0) === PM_ELF)
            mon.mpeaceful = 0;
        break;
    case 21: /* S_UNICORN — a same-sign unicorn is peaceful; ponies, horses and
              * warhorses share the mlet and are screened out by is_unicorn's
              * likes_gems (M2_JEWELS) term. */
        {
            const _uptr = permonstTemplate(mndx);
            if (is_unicorn(_uptr)
                && sgn_mklev((game.u?.ualign?.type) | 0)
                   === sgn_mklev((_uptr?.maligntyp) | 0))
                mon.mpeaceful = 1;
        }
        break;
    case 28: /* S_BAT — real bats (not birds) are permanently hasted in hell */
        if (Inhell()
            && (mndx === PM_BAT || mndx === PM_GIANT_BAT
                || mndx === PM_VAMPIRE_BAT)) /* C mondata.h:103 is_bat(ptr) */
            mon_adjust_speed(mon, 2, null);
        break;
    }
    {
        const ct = emits_light(mon.data);
        if (ct > 0)
            new_light_source(mon.mx | 0, mon.my | 0, ct, LS_MONSTER,
                             monst_to_any(mon));
    }
    let mitem = STRANGE_OBJECT_MK;
    if (mndx === PM_VLAD_THE_IMPALER_NC)
        mitem = CANDELABRUM_OF_INVOCATION;
    mon.cham = NON_PM; /* C makemon.c:1355 — default "not a shapechanger" */
    {
        const mcham = pm_to_cham(mndx);
        if (!Protection_from_shape_changers_nc() && mcham !== NON_PM) {
            /* this is a shapechanger after all */
            mon.cham = mcham;
            /* Vlad stays in his normal shape so he can carry the Candelabrum */
            if (mndx !== PM_VLAD_THE_IMPALER_NC
                && await newcham(mon, null, 0 /* NO_NC_FLAGS */))
                allow_minvent = false;
        }
        else if (mndx === PM_WIZARD_OF_YENDOR_MK) {
            /* C makemon.c:1369-1374 */
            mon.iswiz = 1;
            game.context = game.context || {};
            game.context.no_of_wizards = (game.context.no_of_wizards | 0) + 1;
            if (game.context.no_of_wizards === 1 && Is_earthlevel(game.u?.uz))
                mitem = SPE_DIG_MK;
        }
        else if (mndx === PM_GHOST && (mmflags & MM_NONAME) === 0) {
            christen_monst(mon, rndghostname());
        }
        else if (mndx === PM_CROESUS_MK) {
            mitem = TWO_HANDED_SWORD_MK;
        }
        /* C role.c:2050-2052 role_init() rewrites mons[neminum].msound to
         * MS_NEMESIS, so the hero's own nemesis qualifies even when monsters.h
         * has another sound (Master of Thieves is static MS_LEADER; Tourist
         * nemesis).  mons[] is not mutated here; quest_info(MS_NEMESIS) is the
         * same test (see peaceMinded). */
        else if ((permonstTemplate(mndx)?.msound | 0) === MS_NEMESIS_MK
                 || quest_info(MS_NEMESIS_MK) === mndx) {
            mitem = BELL_OF_OPENING;
        }
        else if (mndx === PM_PESTILENCE) {
            mitem = POT_SICKNESS_MK;
        }
    }
    /* C makemon.c:1383-1384 — `if (mitem != STRANGE_OBJECT && allow_minvent)
     *     (void) mongets(mtmp, mitem);` */
    if (mitem !== STRANGE_OBJECT_MK && allow_minvent)
        await mongets(mon, mitem, async (otyp, init, artif) => (await mksobj(otyp, init, artif)));
    if (game.in_mklev) {
        if ((is_ndemon(permonstTemplate(mndx)) || mndx === PM_WUMPUS
             || mndx === PM_LONG_WORM || mndx === PM_GIANT_EEL)
            && !(game.u?.uhave?.amulet) && rn2(5))
            mon.msleeping = 1;
    } else if (byyou) {
        /* C makemon.c:1393-1394 — newsym(mx,my); set_apparxy(mtmp).  Runs BEFORE
         * m_initweap/m_initinv (makemon.c:1442-1445); a Displaced hero makes
         * set_apparxy draw (monmove.c:2239). */
        newsym(mon.mx | 0, mon.my | 0);
        set_apparxy(mon);
    }
    const _dpPtr = permonstTemplate(mndx);
    if (_dpPtr && is_dprince(_dpPtr) && (_dpPtr.msound | 0) === MS_BRIBE_MK) {
        mon.mpeaceful = mon.minvis = mon.perminvis = 1;
        mon.mavenge = 0;
        if (u_wield_art_mk(ART_EXCALIBUR_MK) || u_wield_art_mk(ART_DEMONBANE_MK)) {
            mon.mpeaceful = 0;
            mon.mtame = 0;
        }
    }
    if (mndx === PM_RAVEN_MK && game.u?.uwep
        && (game.u.uwep.otyp | 0) === BEC_DE_CORBIN)
        mon.mpeaceful = 1;
    if (mndx === PM_LONG_WORM && (mon.wormno = get_wormno()) !== 0) {
        initworm(mon, ((mmflags & MM_NOTAIL) === 0) ? rn2(5) : 0);
        if (count_wsegs(mon))
            place_worm_tail_randomly(mon, x, y);
    }
    const _geno = monGeno(mndx);
    if ((mndx === PM_ALIGNED_CLERIC || mndx === PM_HIGH_CLERIC)
            ? (mmflags & (MM_EPRI | MM_EMIN)) === 0
            : (mndx === PM_ANGEL && (mmflags & MM_EMIN) === 0 && !rn2(3))) {
        /* C makemon.c:1418-1428 — newemin(mtmp); EMIN(mtmp)->... */
        newemin(mon);
        const eminp = mon.mextra.emin;
        mon.isminion = 1;
        const min_align = rn2(3) - 1; /* C: no A_NONE */
        const renegade = (mmflags & MM_ANGRY) !== 0 ? 1 : (!rn2(3) ? 1 : 0);
        eminp.min_align = min_align;
        eminp.renegade = renegade;
        const ualType = (game.u?.ualign?.type ?? 0) | 0;
        mon.mpeaceful = (min_align === ualType) ? (renegade ? 0 : 1) : (renegade ? 1 : 0);
    }
    set_malign(mon); /* C makemon.c:1429 — having finished peaceful changes */
    /* C makemon.c:1431-1440 — group spawn: random monsters (anymon) of a grouping
     * species spawn an accompanying group (small via m_initsgrp n=3, large via
     * m_initlgrp n=10).  MM_NOGRP suppresses (prevents infinite recursion). */
    if (anymon && (mmflags & MM_NOGRP) === 0) {
        if ((_geno & G_SGROUP) && rn2(2)) {
            await m_initgrp(mon, mon.mx, mon.my, 3, mmflags); /* m_initsgrp */
        } else if (_geno & G_LGROUP) {
            if (rn2(3))
                await m_initgrp(mon, mon.mx, mon.my, 10, mmflags); /* m_initlgrp */
            else
                await m_initgrp(mon, mon.mx, mon.my, 3, mmflags); /* m_initsgrp */
        }
    }
    /* C makemon.c:1442–1453 — starting inventory + saddle only when allowed.
     * `allow_minvent` starts as ((mmflags & NO_MINVENT) == 0) at makemon.c:1159
     * and is cleared at :1368 when a shapechanger successfully takes a new form. */
    if (allow_minvent) {
        /* C makemon.c:1442–1445 — m_initweap only when is_armed(ptr); then m_initinv.
         * C is_armed(ptr) = attacktype(ptr, AT_WEAP). Ghost (AT_TUCH) is NOT armed even
         * though makemon_mons_armed.json incorrectly marks it as armed; guard against it. */
        if (isArmedMndx(mndx) && mndx !== PM_GHOST) {
            await mInitweap(mon, async (otyp, init, artif) => (await mksobj(otyp, init, artif)));
        }
        await mInitinv(mon, async (otyp, init, artif) => (await mksobj(otyp, init, artif)));
        await m_dowear(mon, true);
        if (makemonDomesticSaddle(mon, mndx, mmflags))
            await put_saddle_on_mon(null, mon); /* C makemon.c:1448-1453 */
    }
    const _mflags3 = (mon.data?.mflags3 ?? 0) >>> 0;
    if (_mflags3 && !(mmflags & MM_NOWAIT)) {
        if (_mflags3 & 0x0040 /* M3_WAITFORU */)
            mon.mstrategy = ((mon.mstrategy | 0) | STRAT_WAITFORU) >>> 0;
        if (_mflags3 & 0x0080 /* M3_CLOSE */)
            mon.mstrategy = ((mon.mstrategy | 0) | STRAT_CLOSE) >>> 0;
        if (_mflags3 & (0x00c0 /* M3_WAITMASK */ | 0x001f /* M3_COVETOUS */))
            mon.mstrategy = ((mon.mstrategy | 0) | STRAT_APPEARMSG) >>> 0;
    }
    if (allow_minvent && game.gm?.migrating_objs) {
        const DF_NONE = 0; /* dungeon.h — neither DF_RANDOM nor DF_ALL */
        await deliver_obj_to_mon(mon, 1, DF_NONE);
    }
    if (!game.in_mklev) {
        newsym(mon.mx | 0, mon.my | 0);
        /* C makemon.c:1475-1500 — the appearance message, previously unported:
         *     boolean exclaim = !(mmflags & MM_NOEXCLAM);
         *     if ((canseemon(mtmp) && (M_AP_TYPE == M_AP_NOTHING
         *                              || M_AP_TYPE == M_AP_MONSTER))
         *         || sensemon(mtmp)) {
         *         what = Amonnam(mtmp);
         *         if (M_AP_TYPE(mtmp) == M_AP_MONSTER) exclaim = TRUE;
         *     } else if (canseemon(mtmp)) { ...mhidden_description... }
         *     if (what) Norep("%s%s %s%s%c", what, exclaim ? " suddenly" : "",
         *                     vtense(what, "appear"),
         *                     next2u(x, y) ? " next to you" : ..., exclaim ? '!' : '.');
         * MM_NOEXCLAM is set only by #wizgenesis, which is why this reads
         * "A jackal appears next to you." and not "...suddenly appears!".
         * NOTE next2u()/distu() take the ORIGINAL x,y the caller asked for --
         * the hero's own square for a byyou creation -- not mtmp's relocated
         * position, so the " next to you" clause is unconditional there.
         * The mimic-masquerading-as-furniture arm needs mhidden_description,
         * which js/ has no body for; it is left out rather than approximated,
         * and a mimic makes no `what` so no message is emitted (C would). */
        if (!(mmflags & MM_NOMSG)) {
            const M_AP_NOTHING = 0, M_AP_MONSTER = 3, MM_NOEXCLAM_MK = 262144;
            let exclaim = !(mmflags & MM_NOEXCLAM_MK);
            let what = null;
            const apType = (mon.m_ap_type | 0);
            if ((canseemon(mon) && (apType === M_AP_NOTHING || apType === M_AP_MONSTER))
                || sensemon(mon)) {
                what = Amonnam(mon);
                if (apType === M_AP_MONSTER)
                    exclaim = true;
            } else if (canseemon(mon) && apType === 2 /* M_AP_OBJECT */
                       && Number.isInteger(mon.mappearance)
                       && OC_NAME_MK[mon.mappearance | 0] != null) {
                /* C makemon.c:1486-1489 — mimic masquerading as an object:
                 * mhidden_description(MHID_ARTICLE|MHID_ALTMON) (pager.c:205-233)
                 * names the object via object_from_map (pager.c:284-360), which
                 * for a mimic always makes a temporary mksobj(otyp, FALSE, FALSE)
                 * (the next_ident rnd(2) leaf).  The M_AP_FURNITURE arm needs
                 * defsyms explanations, which js/ lacks; it is left out. */
                /* pager.c:201 mhidden_description reads the REMEMBERED glyph
                 * (levl[x][y].glyph, hero_memory) and object_from_map
                 * (pager.c:284-300) takes glyph_to_obj() of it.  An undiscovered
                 * gem/spellbook mimic is remembered as the generic glyph, whose
                 * display.c:564-576 zeroobj index is STRANGE_OBJECT, hence
                 * "A strange object appears close by." rather than "A gem". */
                const rg = game.level?.at(mon.mx | 0, mon.my | 0)?.remembered_glyph;
                const glyphotyp = (rg && rg.cls === 'obj' && Number.isInteger(rg.otyp))
                    ? (rg.otyp | 0) : (mon.mappearance | 0);
                const fake = await mksobj(glyphotyp, false, false);
                if ((fake.oclass | 0) === 12 /* COIN_CLASS */)
                    fake.quan = 2;
                fake.where = 1;
                fake.ox = mon.mx | 0;
                fake.oy = mon.my | 0;
                const odx = (mon.mx | 0) - ((game.u?.ux ?? 0) | 0);
                const ody = (mon.my | 0) - ((game.u?.uy ?? 0) | 0);
                if (odx * odx + ody * ody <= 2) /* pager.c:1043 next2u */
                    observe_object_mk(fake);
                /* pager.c:229-231 — a STRANGE_OBJECT fake is named by
                 * obj_descr[STRANGE_OBJECT].oc_name, never simpleonames()
                 * (xname would give "glorkum ..."). */
                let nm = ((fake.otyp | 0) !== 0) ? simpleonames_mk(fake)
                                                 : 'strange object';
                if ((fake.quan | 0) === 1)
                    nm = an_mk(nm);
                what = upstart(nm);
            }
            if (what) {
                /* C hack.h next2u(x,y) = (distu(x,y) < 3); distu is the squared
                 * distance from the hero. */
                const dx = (x | 0) - ((game.u?.ux ?? 0) | 0);
                const dy = (y | 0) - ((game.u?.uy ?? 0) | 0);
                const distu = dx * dx + dy * dy;
                const where = (distu < 3) ? ' next to you'
                            : (distu <= BOLT_LIM * BOLT_LIM) ? ' close by' : '';
                /* C makemon.c:1492 uses Norep(): a repeat of the previous
                 * message (e.g. #wizgenesis 4 jackals) is not printed again. */
                await Norep(`${what}${exclaim ? ' suddenly' : ''} `
                      + `${vtense(what, 'appear')}${where}${exclaim ? '!' : '.'}`);
            }
        }
        /* C makemon.c:1495-1497 — "if discernable and a threat, stop fiddling
         * while Rome burns":  `if (go.occupation) (void) dochugw(mtmp, FALSE);`.
         * chug=FALSE skips dochug(); only the stop_occupation() test runs, so
         * a counted search is interrupted the moment the spawn lands (C's
         * stop appears in the SAME window as the appearance message). */
        if (game.occupation)
            await dochugw(mon, false);
    }
    return mon;
}
/* C dungeon.c:1648-1653 — Can_dig_down(lev).  Invocation_lev(lev) is
 * dungeon.c:2016-2021, In_hell && dlevel == num_dunlevs - 1; js/sp_lev.js:6605
 * carries the same local port and the same note about js/cmd.js's
 * Invocation_lev reading a game.invocation_level nothing ever writes. */
export function Can_dig_down(lev) {
    if (game.level?.flags?.hardfloor)
        return false;
    if (Is_botlevel(lev))
        return false;
    const dun = game.dungeons?.[lev?.dnum];
    const invocation = In_hell(lev) && !!dun
                       && lev.dlevel === (dun.num_dunlevs | 0) - 1;
    return !invocation;
}

/* C dungeon.c:1661-1665 — "Like Can_dig_down, but also allows falling through
 * on the stronghold level.  Normally, the bottom level of a dungeon resists
 * both digging and falling." */
export function Can_fall_thru(lev) {
    return Can_dig_down(lev) || Is_stronghold(lev);
}

// C ref: trap.c hole_destination — destination dlevel for holes or trapdoors
export function hole_destination(dst) {
    const uz = game.u?.uz ?? { dnum: 0, dlevel: 1 };
    const bottom = dng_bottom(uz);
    dst.dnum = uz.dnum;
    dst.dlevel = uz.dlevel;
    while (dst.dlevel < bottom) {
        dst.dlevel++;
        if (rn2(4))
            break;
    }
}
// C ref: mondata.h:144,149 — likes_gems(ptr) is (mflags2 & M2_JEWELS), and
//   #define is_unicorn(ptr) ((ptr)->mlet == S_UNICORN && likes_gems(ptr))
// S_UNICORN (defsym.h:319) also covers pony/horse/warhorse, which is exactly
// what likes_gems() screens out — only the three unicorns carry M2_JEWELS.
const S_UNICORN = 21;
const M2_JEWELS = 0x20000000;
function is_unicorn(ptr) {
    return !!ptr && (ptr.mlet | 0) === S_UNICORN
        && ((ptr.mflags2 >>> 0) & M2_JEWELS) !== 0;
}
// C ref: hack.h sgn(x)
function sgn_mklev(n) {
    return n > 0 ? 1 : (n < 0 ? -1 : 0);
}
/* Exported so js/trap.js — mk_trap_statue's C home (trap.c:389, staticfn, its
 * only C caller being maketrap at trap.c:509) — can call THIS body instead of
 * re-declaring its own.  The body stays here because its whole callee chain
 * (rndmonnumAdj, permonstTemplate, mkcorpstat, makemon, mongone,
 * sgn_mklev) is module-local to js/mklev.js. */
export async function mk_trap_statue(x, y) {
    let mndx = 0;
    let mptr = null;
    let trycount = 10;
    do {
        mndx = rndmonnumAdj(3, 6) | 0;
        mptr = permonstTemplate(mndx);
    } while (--trycount > 0 && is_unicorn(mptr)
             && sgn_mklev((game.u?.ualign?.type ?? 0) | 0)
                === sgn_mklev(mptr.maligntyp | 0));
    const statue = await mkcorpstat(STATUE, null, mndx, x, y, CORPSTAT_NONE);
    const mtmp = await makemon(statue.corpsenm | 0, 0, 0,
                               MM_NOCOUNTBIRTH | MM_NOMSG);
    if (!mtmp)
        return; /* should never happen */
    while (mtmp.minvent) {
        const otmp = mtmp.minvent;
        otmp.owornmask = 0;
        /* C mkobj.c obj_extract_self(), OBJ_MINVENT arm:
         *     extract_nobj(obj, &obj->ocarry->minvent);
         * every object taken here is the head of that list, so the unlink is
         * the head step of extract_nobj.  (The general obj_extract_self is
         * still an unported stub in this file; the other `where` arms are
         * unreachable from here — these objects were just created into this
         * monster's minvent by m_initweap/m_initinv.) */
        mtmp.minvent = otmp.nobj ?? null;
        otmp.nobj = null;
        otmp.ocarry = null;
        otmp.where = OBJ_FREE;
        await add_to_container(statue, otmp);
    }
    statue.owt = weight(statue);
    await mongone(mtmp);
}
export async function mongone(mdef) {
    mdef.mhp = 0;
    if (mdef.isgd && !await grddead(mdef))
        return;
    /* C mon.c:2728-2732 m_detach(), reached below by mongone(): remove a
     * mobile light source while the monster still has its map coordinates
     * and original permonst.  The temporary monster built by
     * mk_trap_statue() can itself emit light; leaving that source linked after
     * mongone() makes any_light_source() permanently true and schedules a
     * full vision repaint every monster turn. */
    if ((mdef.mx | 0) > 0 && emits_light(mdef.data))
        del_light_source(LS_MONSTER, monst_to_any(mdef));
    /* C steal.c:851-871 mdrop_special_objs(mdef) */
    for (let obj = mdef.minvent, next = null; obj; obj = next) {
        next = obj.nobj ?? null;
        if (obj_resists(obj, 0, 0)) {
            /* C mdrop_special_objs() keeps a resistant object by dropping it
             * at the monster's map position.  mongone() is reached for live
             * level monsters (the stock-room shopkeeper and statue path), so
             * the on-map arm is fully answerable by the canonical mdrop_obj
             * port in this file.  Migrating monsters have no valid map
             * destination here; retain the explicit guard for that separate
             * rloco-dependent arm rather than silently discarding the object.
             */
            if (mdef.mx || mdef.my) {
                await mdrop_obj_md(mdef, obj, false);
            } else {
                /* C steal.c:866-869 — remove the object from minvent and
                 * relocate it on this level's random valid square. */
                await extract_from_minvent_md(mdef, obj, true, true);
                await steal_rloco(obj);
            }
        }
    }
    while (mdef.minvent) {
        const otmp = mdef.minvent;
        /* C mkobj.c obj_extract_self(), OBJ_MINVENT arm:
         *     extract_nobj(obj, &obj->ocarry->minvent);
         * every object taken here is the head, so the unlink is that
         * function's head step — the same one mk_trap_statue below performs.
         * nobj must be read BEFORE dealloc_obj, which re-uses it as the
         * objs_deleted queue link. */
        mdef.minvent = otmp.nobj ?? null;
        otmp.nobj = null;
        otmp.ocarry = null;
        otmp.owornmask = 0;
        otmp.where = OBJ_FREE;
        await dealloc_obj(otmp);
        const _bstore = game.__bridge__ || (game.__bridge__ = {});
        const _bkey = 'objs_deleted.count';
        const _bcur = _bstore[_bkey] !== undefined ? Number(_bstore[_bkey]) : 0;
        _bstore[_bkey] = String(_bcur + 1);
    }
    /* C mon.c:2733 m_detach -> mon_leaving_level: vacate the map and newsym
     * (potion.c:2803 mongrantswish relies on it to clear the djinni). */
    /* m_at() skips mhp<=0 nodes but C's onmap test reads the grid, so
     * present the node as live for the duration of the call. */
    mdef.mhp = 1;
    await mon_leaving_level_mk(mdef);
    mdef.mhp = 0;
    if ((mdef.mstate | 0) & MON_DETACH) {
        /* C mon.c:2789-2792 `impossible("m_detach: ... already detached?")` —
         * mongone is never called twice on the same monster from any live
         * caller here, so this mirrors the impossible() by not double-flagging
         * rather than fabricating C's message-log side effect. */
    } else {
        mdef.mstate = (mdef.mstate | 0) | MON_DETACH;
    }
    /* C mon.c:2786-2787 m_detach(): `if (mtmp->wormno) wormgone(mtmp);` */
    if (mdef.wormno)
        wormgone_mk(mdef);
}
/* C ref: trap.c:3600-3626 isclearpath(cc, distance, dx, dy) — walk `distance`
 * steps from *cc in direction (dx,dy); on success *cc becomes the far endpoint.
 * No RNG. */
function isclearpath(cc, distance, dx, dy) {
    let x = cc.x, y = cc.y;
    while (distance-- > 0) {
        x += dx;
        y += dy;
        if (!isok(x, y))
            return false;
        const loc = game.level?.at(x, y);
        const typ = loc ? loc.typ : STONE;
        if (!ZAP_POS(typ) || closed_door(x, y))
            return false;
        const t = t_at(x, y);
        if (t && (is_pit(t.ttyp) || is_hole(t.ttyp) || is_xport(t.ttyp)))
            return false;
    }
    cc.x = x;
    cc.y = y;
    return true;
}
/* C ref: trap.c:3597-3654 find_random_launch_coord — pick a coordinate from
 * which a rolling boulder (or other launcher) could reach the trap.
 * RNG: rn1(5, 4) then rn2(N_DIRS), both unconditional once the gl.launchplace
 * shortcut misses; the retry loop itself draws nothing. */
function find_random_launch_coord(ttmp, cc) {
    let success = false;
    let mindist = 4;
    let trycount = 0;
    /* C rm.h:538 `#define Sokoban svl.level.flags.sokoban_rules` — the level
     * FLAG, not the dungeon (In_sokoban): a Sokoban level loaded outside the
     * Sokoban branch still sets it and draws nothing here. */
    if (!ttmp || !cc || (game.level?.flags?.sokoban_rules ?? game.sokoban))
        return false;
    const x = ttmp.tx, y = ttmp.ty;
    /* gl.launchplace is set only by lspo_trap on special levels (sp_lev.c:4441)
     * and reset to 0,0 otherwise, in which case bcc == (tx,ty) and linedup's
     * `if (!tbx && !tby) return FALSE` (mthrowu.c) rejects it. */
    const lp = game.gl?.launchplace ?? { x: 0, y: 0 };
    const bcc = { x: ttmp.tx + (lp.x | 0), y: ttmp.ty + (lp.y | 0) };
    if (isok(bcc.x, bcc.y) && linedup(ttmp.tx, ttmp.ty, bcc.x, bcc.y, 1)) {
        cc.x = bcc.x;
        cc.y = bcc.y;
        return true;
    }
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP)
        mindist = 2;
    let distance = rn1(5, 4); /* 4..8 away */
    let tmp = rn2(N_DIRS); /* randomly pick a direction to try first */
    while (distance >= mindist) {
        const dx = xdir[tmp];
        const dy = ydir[tmp];
        cc.x = x;
        cc.y = y;
        /* Prevent boulder from being placed on water */
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP
            && is_pool_or_lava(x + distance * dx, y + distance * dy))
            success = false;
        else
            success = isclearpath(cc, distance, dx, dy);
        if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
            bcc.x = x;
            bcc.y = y;
            const success_otherway = isclearpath(bcc, distance, -dx, -dy);
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
/* C ref: trap.c:3658-3691 mkroll_launch — place the launched object and record
 * the trap's launch/launch2 coordinates. No RNG of its own; all of it comes
 * from find_random_launch_coord (and mksobj(BOULDER) draws none). */
export async function mkroll_launch(ttmp, x, y, otyp, ocount) {
    const cc = { x: 0, y: 0 };
    const success = find_random_launch_coord(ttmp, cc);
    if (!success) {
        /* create the trap without any ammo, launch pt at trap location */
        cc.x = x;
        cc.y = y;
    }
    else {
        const otmp = await mksobj(otyp, true, false);
        otmp.quan = ocount;
        otmp.owt = weight(otmp);
        place_object(otmp, cc.x, cc.y);
        /* C: stackobj(otmp). The general stackobj is unported (js/sp_lev.js:3036);
         * it is RNG-free, and a boulder freshly made on its launch spot during
         * level generation has nothing on that square to merge with. */
    }
    ttmp.launch.x = cc.x;
    ttmp.launch.y = cc.y;
    if (ttmp.ttyp === ROLLING_BOULDER_TRAP) {
        ttmp.launch2 = { x: x - (cc.x - x), y: y - (cc.y - y) };
    }
    else {
        ttmp.launch_otyp = otyp;
    }
    newsym(ttmp.launch.x, ttmp.launch.y);
    return 1;
}
// C ref: trap.c:457 maketrap — create a trap at (x,y) of type typ.
// Mirrors: trap.c:464-590 field init, switch, and linked-list prepend to gf.ftrap.
// Simplified: the NEW-trap terrain screen (CAN_OVERWRITE_TERRAIN / pool / lava /
// furniture / AIR / single-level-branch, trap.c:478-489) is still omitted here —
// level-gen pre-screens positions.  The OLDPLACE branch (trap.c:466-477) is NOT
// optional and is now present: see below.
/* C ref: pline.c impossible() — a warning channel, not a fault.  js/trap.js's
 * maketrap twin spells its no-op the same way (impossible_ at js/trap.js:1612);
 * this file had no such helper because no ported body here reached one. */
function mklev_impossible(_msg, ..._args) { }
async function maketrap(x, y, typ) {
    // C trap.c:464-465 — TRAPPED_DOOR and TRAPPED_CHEST are never physical traps
    if (typ === TRAPPED_DOOR || typ === TRAPPED_CHEST)
        return null;
    const oldtrap = t_at(x, y);
    if (oldtrap && (oldtrap.ttyp === MAGIC_PORTAL || oldtrap.ttyp === VIBRATING_SQUARE))
        return null;
    const oldplace = !!oldtrap;
    const _ltLoc = game.level?.at(x, y);
    const _lt = _ltLoc ? (_ltLoc.typ | 0) : STONE;
    if (!oldplace
        && ((_lt === LADDER || _lt === STAIRS)
            || is_pool_or_lava(x, y)
            || (IS_FURNITURE(_lt) && typ !== PIT && typ !== HOLE)
            || (_lt === DRAWBRIDGE_UP && typ === MAGIC_PORTAL)
            || (IS_AIR(_lt) && typ !== MAGIC_PORTAL)
            || (typ === LEVEL_TELEP && single_level_branch(game.u?.uz))))
        return null;
    // C trap.c:490-495 — allocate new trap struct, zero fields
    const trap = oldtrap || {
        ttyp: typ,
        tx: x,
        ty: y,
        tseen: (typ === HOLE),
        once: false,
        launch: { x: -1, y: -1 }, // C: launch.x = launch.y = -1
        tnote: 0,
        dst: { dnum: -1, dlevel: -1 },
        ntrap: null, // C: ntrap pointer for gf.ftrap linked list
    };
    /* C trap.c:496-502 — "[re-]initialize all fields except ntrap ... and
     * <tx,ty>".  For a freshly built object these are already the values above;
     * for the oldplace path they are the re-init C performs.  tnote is NOT in
     * that list in C (it is a bitfield outside `vl`), so it is left alone and
     * only re-derived by the SQKY_BOARD arm below, exactly as in C. */
    trap.ttyp = typ;
    trap.once = false;
    /* C trap.c:501 — unhideable_trap(typ), i.e. HOLE only (trap.h:115). */
    trap.tseen = (typ === HOLE);
    trap.madeby_u = 0;
    trap.launch = { x: -1, y: -1 };
    /* C trap.h:23 — `#define teledest launch`: teledest IS the launch field, so
     * C's `ttmp->launch.x = ttmp->launch.y = -1` re-init (trap.c:497) clears it
     * too.  This port keeps the two under separate names, so clearing only
     * `launch` left a re-typed square carrying the PREVIOUS trap's destination. */
    trap.teledest = { x: -1, y: -1 };
    trap.dst = { dnum: -1, dlevel: -1 };
    if (!game.level)
        return trap;
    // C trap.c:506-508 — SQKY_BOARD: choose_trapnote
    if (typ === SQKY_BOARD)
        trap.tnote = chooseTrapnote(trap);
    // C trap.c:509-511 — STATUE_TRAP: create a "living" statue
    if (typ === STATUE_TRAP)
        await mk_trap_statue(x, y);
    // C trap.c:512-514 — ROLLING_BOULDER_TRAP: boulder will roll towards trigger
    if (typ === ROLLING_BOULDER_TRAP)
        await mkroll_launch(trap, x, y, BOULDER, 1);
    if (typ === PIT || typ === SPIKED_PIT) {
        // C trap.c:514-517 — `ttmp->conjoined = 0;` then FALLTHRU
        trap.conjoined = 0;
    }
    if (typ === PIT || typ === SPIKED_PIT || typ === HOLE || typ === TRAPDOOR) {
        const _lev = game.level.at(x, y);
        const _typNow = () => (_lev ? (_lev.typ | 0) : STONE);
        // C trap.c:521-522
        if (is_hole(typ))
            hole_destination(trap.dst);
        /* C trap.c:523-527 — schedule shop repair for a hole/pit dug in a shop. */
        if (in_rooms(x, y, SHOPBASE).length > 0
            && (is_hole(typ) || IS_DOOR(_typNow()) || IS_WALL(_typNow()))) {
            add_damage(x, y,
                       ((IS_DOOR(_typNow()) || IS_WALL(_typNow()))
                        && !game.context?.mon_moving) ? SHOP_HOLE_COST : 0);
        }
        /* C trap.c:529-561 — normalise the terrain the trap sits on. */
        let clear_flags = true; /* assume lev->flags needs to be reset */
        if (_typNow() === DRAWBRIDGE_UP) {
            clear_flags = false;
            const was_ice = _lev && (((_lev.drawbridgemask | 0) & DB_UNDER) === DB_ICE);
            if (_lev) {
                _lev.drawbridgemask = ((_lev.drawbridgemask | 0) & ~DB_UNDER) | DB_FLOOR;
            }
            if (was_ice) {
                obj_ice_effects(x, y, true);
                spot_stop_timers(x, y, MELT_ICE_AWAY);
            }
        }
        else if (IS_ROOM(_typNow())) {
            set_levltyp(x, y, ROOM);
        }
        /* C trap.c:549-554 — "some cases which can happen when digging down
         * while phasing thru solid areas" (and the makeniche niche, above). */
        else if (_typNow() === STONE || _typNow() === SCORR) {
            set_levltyp(x, y, CORR);
        }
        else if (IS_WALL(_typNow()) || _typNow() === SDOOR) {
            set_levltyp(x, y, game.level.flags?.is_maze_lev ? ROOM
                              : game.level.flags?.is_cavernous_lev ? CORR
                                : DOOR);
        }
        // C trap.c:560-561 — set_levltyp doesn't take care of this [yet?]
        if (clear_flags && _lev)
            _lev.flags = 0;
        // C trap.c:563-564
        await unearth_objs(x, y);
        recalc_block_point(x, y);
    }
    if (typ === TELEP_TRAP) {
        const lp = game.gl?.launchplace;
        const lpx = lp ? lp.x : undefined;
        const lpy = lp ? lp.y : undefined;
        if (isok(lpx, lpy)) {
            const xstart = (game.gx?.xstart) | 0;
            const ystart = (game.gy?.ystart) | 0;
            trap.teledest = { x: xstart + lpx, y: ystart + lpy };
            if (trap.teledest.x === x && trap.teledest.y === y)
                mklev_impossible('making fixed-dest tele trap pointing to itself');
        }
    }
    // C trap.c:578-583 — `if (!oldplace) { ttmp->ntrap = gf.ftrap; gf.ftrap
    // = ttmp; }`.  A REUSED trap is already on the chain (and already in the
    // legacy array); re-linking it would splice the list onto itself.
    if (!oldplace) {
        trap.ntrap = game.ftrap ?? null;
        game.ftrap = trap;
        // maintain legacy array for occupied() checks
        if (!game.level.traps)
            game.level.traps = [];
        game.level.traps.push(trap);
    }
    return trap;
}
// C ref: engrave.c — minimal engraving storage for wipe_engr_at
const _engr_map = new Map();
// C ref: engrave.c make_engr_at — create engraving at coordinates
function make_engr_at(x, y, text, pristine, epoch, engr_type) {
    if (text) {
        /* C engrave.c:427-436 — the engraving carries THREE copies of its text
         * (actual / remembered / pristine), all initialised to `s`, and the
         * pristine copy is overwritten with `pristine_s` only when that
         * argument is non-NULL:
         *     for (i = 0; i < text_states; ++i) Strcpy(ep->engr_txt[i], s);
         *     if (havepristine) Strcpy(ep->engr_txt[pristine_text], pristine_s);
         * so a NULL pristine_s means "pristine == actual", NOT "no pristine".
         * This store discarded the argument entirely, which made read_engr_at's
         * endpunct test (engrave.c:390-395) unanswerable — see _reveal_text in
         * js/cmd.js.
         *
         * `off` is C's `ep->engr_txt[actual_text] - engr_text_space(ep)`: the
         * pristine copy is indexed at the actual text's ORIGINAL buffer offset,
         * and wipe_engr_at advances that pointer past leading spaces it has
         * rubbed out.  Zero at creation, maintained below.
         *
         * C engrave.c:452 `ep->engr_type = (e_type > 0) ? e_type : rnd(N_ENGRAVE - 1);`
         * — a non-positive e_type is not "default to DUST", it is "pick one of the
         * N_ENGRAVE-1 non-HEADSTONE types at random" (rnd draws real RNG).  The one
         * live caller of this arm is zap_map's WAN_POLYMORPH/SPE_POLYMORPH engraving
         * rewrite (zap.c:3651-3656, `make_engr_at(x, y, etxt, pristinebuf,
         * svm.moves, 0)`), confirmed against the board: every make_engr_at record
         * with e_type===0 (5 of 300) consumes exactly one RNG draw in [1,5], every
         * other record consumes zero.  This store previously silently defaulted a
         * falsy engr_type to DUST and drew no RNG at all — draws that zap.js's own
         * (still-unported) polymorph arm will need the day it lands. */
        const et = engr_type | 0;
        _engr_map.set(`${x},${y}`, { text, remembered: text,
                                     pristine: pristine ?? text, off: 0,
                                     engr_time: epoch | 0,
                                     engr_type: (et > 0) ? et : rnd(N_ENGRAVE - 1) });
    }
}
// C ref: engrave.c is_ice(x,y) — check if level cell is ICE
function is_ice(x, y) {
    return game.level?.at(x, y)?.typ === ICE;
}
// C ref: engrave.c wipe_engr_at — degrade engraving at coordinates (engrave.c:271)
function wipe_engr_at(x, y, cnt, magical) {
    const ep = _engr_map.get(`${x},${y}`);
    if (!ep)
        return;
    if (ep.engr_type === HEADSTONE)
        return;
    if (ep.nowipeout)
        return;
    // C: if (ep->engr_type != BURN || is_ice(x,y) || (magical && !rn2(2)))
    const isBurn = (ep.engr_type === BURN);
    let doWipe;
    if (!isBurn) {
        doWipe = true;
    }
    else if (is_ice(x, y)) {
        doWipe = true;
    }
    else if (magical && !rn2(2)) {
        doWipe = true;
    }
    else {
        doWipe = false;
    }
    if (!doWipe)
        return;
    // C: if (ep->engr_type != DUST && ep->engr_type != ENGR_BLOOD) cnt = rn2(...) ? 0 : 1
    if (ep.engr_type !== DUST && ep.engr_type !== ENGR_BLOOD) {
        cnt = rn2(1 + Math.trunc(50 / (cnt + 1))) ? 0 : 1;
    }
    const newText = wipeout_text(ep.text, cnt, 0);
    // C: trim leading spaces, delete engraving if empty
    const trimmed = newText.replace(/^ +/, '');
    if (!trimmed) {
        _engr_map.delete(`${x},${y}`);
    }
    else {
        /* C engrave.c:284-285 `while (ep->engr_txt[actual_text][0] == ' ')
         * ep->engr_txt[actual_text]++;` — the pointer ADVANCES, it does not
         * shift the buffer, so the pristine copy stays aligned to the original
         * offsets and `off` is how far the actual text has moved. */
        ep.off = (ep.off | 0) + (newText.length - trimmed.length);
        ep.text = trimmed;
    }
}
function get_rnd_text_epitaph() {
    return get_rnd_line_from_section(EPITAPH_LINES, EPITAPH_OFFSETS, EPITAPH_CHUNK_SIZE, rn2, 60);
}
export function make_grave(x, y, text) {
    const loc = game.level?.at(x, y);
    const graveTrace = typeof process !== 'undefined' && ENV?.FF_GRAVE_TRACE === '1';
    if (graveTrace)
        pushRngLogEntry(`^grave_try[xy=${x | 0},${y | 0} typ=${loc?.typ ?? -1} trap=${t_at(x, y) ? 1 : 0}]`);
    if (!loc || (loc.typ !== ROOM && loc.typ !== GRAVE) || t_at(x, y))
        return;
    if (!set_levltyp(x, y, GRAVE))
        return;
    del_engr_at(x, y);
    if (!text)
        text = get_rnd_text_epitaph();
    make_engr_at(x, y, text, null, 0, HEADSTONE);
}
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
/* C rumors.c MD_PAD_RUMORS — expected padded line length handed to
   get_rnd_line() by every rumor/engrave/epitaph caller. */
const MD_PAD_RUMORS = 60;
/* C rumors.c:114 `static const char *cookie_marker = "[cookie] "` — makedefs
   tags the fortune-cookie-only rumors with this prefix.  17 of the 397 false
   rumors carry it; no true rumor does. */
const cookie_marker = '[cookie] ';

// C ref: rumors.c:117 getrumor(truth, rumor_buf, exclude_cookie)
//
// THE do-while IS LOAD-BEARING, NOT DECORATION.  When exclude_cookie is set
// (every caller except the BY_COOKIE/BY_PAPER reading path) and the line just
// drawn is cookie-tagged, C throws it away and rolls the WHOLE selection
// again — a fresh rn2(2) adjtruth AND a fresh rn2(section_size) offset.  The
// re-roll can land in the other pool, so the second draw's modulus differs
//
// RNG per iteration, in order: rn2(2) [rumors.c:151] then rn2(section_size)
// [rumors.c:167 -> get_rnd_line:465, itself up to 10 draws for pad rejection].
// After the loop, and only if it didn't run away, C exercises Wisdom — but
// NOT during level generation (`else if (!gi.in_mklev)`, rumors.c:174), which
// is why graffiti draw no exercise RNG and a fortune cookie does.
//
// truth: 1 = true rumor, -1 = false rumor, 0 = either (rn2(2) decides).
export function getrumor(truth, exclude_cookie) {
    let rumor_buf = '';
    let count = 0;
    let adjtruth = 0;
    do {
        rumor_buf = '';
        /*
         *  C rumors.c:145-150 —
         *  input:      1    0   -1
         *   rn2 \ +1  2=T  1=T  0=F
         *   adj./ +0  1=T  0=F -1=F
         */
        adjtruth = truth + rn2(2);
        switch (adjtruth) {
            case 2: /*(might let a bogus input arg sneak thru)*/
            case 1:
                rumor_buf = get_rnd_line_from_section(TRUE_RUMORS, TRUE_RUMOR_OFFSETS, TRUE_RUMOR_SIZE, rn2, MD_PAD_RUMORS);
                break;
            case 0: /* once here, 0 => false rather than "either" */
            case -1:
                rumor_buf = get_rnd_line_from_section(FALSE_RUMORS, FALSE_RUMOR_OFFSETS, FALSE_RUMOR_SIZE, rn2, MD_PAD_RUMORS);
                break;
            default:
                /* C impossible("strange truth value for rumor") */
                return 'Oops...';
        }
    } while (count++ < 50 && exclude_cookie && rumor_buf.startsWith(cookie_marker));
    /* C rumors.c:172-175 — if (count >= 50) impossible(...); else if
       (!gi.in_mklev) exercise(A_WIS, (adjtruth > 0)).  The in_mklev guard is
       C's own comment "avoid exercising wisdom for graffiti". */
    if (count < 50 && !game.in_mklev)
        exercise(A_WIS, adjtruth > 0);
    /* C rumors.c:177-186 — the reading paths keep a cookie rumor but show it
       without its marker. */
    if (!exclude_cookie && rumor_buf.startsWith(cookie_marker))
        rumor_buf = rumor_buf.slice(cookie_marker.length);
    return rumor_buf;
}
/* C hack.h:54-57 — outrumor()'s `mechanism` argument. */
export const BY_ORACLE = 0, BY_COOKIE = 1, BY_PAPER = 2, BY_OTHER = 9;

export async function outrumor(truth, mechanism) {
    const fortune_msg = 'This cookie has a scrap of paper inside.';
    const reading = (mechanism === BY_COOKIE || mechanism === BY_PAPER);

    if (reading) {
        /* deal with various things that prevent reading */
        if (is_fainted() && mechanism === BY_COOKIE) {
            return;
        } else if (_Blind_mk()) {
            if (mechanism === BY_COOKIE)
                await pline(fortune_msg);
            await pline('What a pity that you cannot read it!');
            return;
        }
    }

    let line = getrumor(truth, reading ? false : true);
    if (!line)
        line = 'NetHack rumors file closed for renovation.';
    switch (mechanism) {
    case BY_ORACLE:
        await pline('True to her word, the Oracle %ssays: ',
                    (!rn2(4) ? 'offhandedly '
                             : (!rn2(3) ? 'casually '
                                        : (rn2(2) ? 'nonchalantly ' : ''))));
        await verbalize('%s', line);
        /* [WIS exercised by getrumor()] */
        return;
    case BY_COOKIE:
        await pline(fortune_msg);
        /* FALLTHRU */
    case BY_PAPER:
        await pline('It reads:');
        break;
    }
    await pline(line);      /* C pline1(line) */
}

const ORACLE_RECORDS = [
    ["If thy wand hath run out of charges, thou mayst zap it again and again; though",
     "naught will happen at first, verily, thy persistence shall be rewarded, as",
     "one last charge may yet be wrested from it!"],
    ["Though the shopkeepers be wary, thieves have nevertheless stolen much by using",
     "their digging wands to hasten exits through the pavement."],
    ["If thou hast had trouble with rust on thine armor or weapons, thou shouldst",
     "know that thou canst prevent this by, while in a confused state, reading the",
     "magical parchments which normally are used to cause their enchantment.",
     "Unguents of lubrication may provide similar protection, albeit of a",
     "transitory nature."],
    ["Behold the cockatrice, whose diminutive stature belies its hidden might.  The",
     "cockatrice can petrify any ordinary being it contacts--save those wise",
     "adventurers who eat a dead lizard or blob of acid when they feel themselves",
     "slowly turning to stone."],
    ["While some wayfarers rely on scrounging finished armour in the dungeon, the",
     "resourceful know the mystical means by which mail may be fashioned out of",
     "scales from a dragon's hide."],
    ["It is customarily known among travelers that extra-healing draughts may clear",
     "thy senses when thou art addled by delusory visions.  But never forget, the",
     "lowly potion which makes one sick may be used for the same purpose."],
    ["While the consumption of lizard flesh or water beloved of the gods may clear",
     "the muddled head, the application of the horn of a creature of utmost purity",
     "can alleviate many other afflictions as well."],
    ["If thou wouldst travel quickly between distant locations, thou must be",
     "able to control thy teleports, and in a confused state misread the scroll",
     "which usually teleports thyself locally.  Daring adventurers have also",
     "performed the same feat sans need for scrolls or potions by stepping into",
     "a particular ambuscade."],
    ["Almost all adventurers who come this way hope to pass the dread Medusa.  To",
     "do this, the best advice is to keep thine eyes blindfolded and to cause the",
     "creature to espy its own reflection in a mirror."],
    ["And where it is written \"ad aerarium\", diligent searching will often reveal",
     "the way to a trap which sends one to the Magic Memory Vault, where the riches",
     "of Croesus are stored; however, escaping from the vault with its gold is much",
     "harder than getting in."],
    ["It is well known that wily shopkeepers raise their prices whene'er they",
     "espy the garish apparel of the approaching tourist or the countenance of a",
     "disfavored patron.  They favor the gentle of manner and the fair of face.",
     "The boor may expect unprofitable transactions."],
    ["The cliche of the kitchen sink swallowing any unfortunate rings that contact",
     "its pernicious surface reflecteth greater truth than many homilies, yet",
     "even so, few have developed the skill to identify enchanted rings by the",
     "transfigurations effected upon the voracious device's frame."],
    ["The meat of enchanted creatures ofttimes conveyeth magical properties",
     "unto the consumer.  A fresh corpse of floating eye doth fetch a high",
     "price among wizards for its utility in conferring Telepathy, by which",
     "the sightless may locate surrounding minds."],
    ["The detection of blessings and curses is in the domain of the gods.  They will",
     "make this information available to mortals who request it at their places of",
     "worship, or elsewhere for those mortals who devote themselves to the service",
     "of the gods."],
    ["At times, the gods may favor worthy supplicants with named blades whose",
     "powers echo throughout legend.  Learned wayfarers can reproduce blades of",
     "elven lineage, hated of the orcs, without the need for such intervention."],
    ["There are many stories of a mighty amulet, the origins of which are said",
     "to be ancient Yendor.  This amulet doth have awesome power, and the gods",
     "desire it greatly.  Mortals mayst tap only portions of its terrible",
     "abilities.  The stories tell of mortals seeing what their eyes cannot",
     "see and seeking places of magical transportation, while having this",
     "amulet in their possession.  Others say a mortal must wear the amulet to",
     "obtain these powers.  But verily, such power comes at great cost, to",
     "preserve the balance."],
    ["It is said that thou mayst gain entry to Moloch's sanctuary, if thou",
     "darest, from a place where the ground vibrateth in the deepest depths of",
     "Gehennom.  Thou needs must have the aid of three magical items.  The",
     "pure sound of a silver bell shall announce thee.  The terrible runes,",
     "read from Moloch's book, shall cause the earth to tremble mightily.  The",
     "light of an enchanted candelabrum shall show thee the way."],
    ["In the deepest recesses of the Dungeons of Doom, guarding access to the",
     "nether regions, there standeth a castle, wherein lieth a wand of wishes.",
     "If thou wouldst gain entry, bear with thee an instrument of music, for the",
     "pontlevis may be charmed down with the proper melody.  What notes comprise",
     "it only the gods know, but a musical mastermind may yet succeed by witful",
     "improvisation.  However, the less perspicacious are not without recourse,",
     "should they be prepared to circumambulate the castle to the postern."],
    ["The gods are said to be pleased when offerings are given to the",
     "priests who attend their temples, and they may grant various favors to",
     "those who do so.  But beware!  To be young and frugal is better than to",
     "be old and miserly."],
    ["The name of Elbereth may strike fear into the hearts of thine enemies, if",
     "thou dost write it upon the ground at thy feet.  If thou maintainest the",
     "utmost calm, thy safety will be aided greatly, but beware lest thy clumsy",
     "feet scuff the inscription, cancelling its potence, or thy wayward",
     "sword-arm break the truce."],
];

const SPECIAL_ORACLE = [
    '"...it is rather disconcerting to be confronted with the',
    'following theorem from [Baker, Gill, and Solovay, 1975].',
    '',
    'Theorem 7.18  There exist recursive languages A and B such that',
    '  (1)  P(A) == NP(A), and',
    '  (2)  P(B) != NP(B)',
    '',
    'This provides impressive evidence that the techniques that are',
    'currently available will not suffice for proving that P != NP or' + '          ',
    'that P == NP."  [Garey and Johnson, p. 185.]',
];
export async function outoracle(special, delphi) {
    const g = game;
    /* early return if all the oracularities are already exhausted */
    if ((g.oracle_flg | 0) < 0 || ((g.oracle_flg | 0) > 0 && !g.oracle_cnt))
        return;

    if ((g.oracle_flg | 0) === 0) {
        g.oracle_loc = [SPECIAL_ORACLE, ...ORACLE_RECORDS];
        g.oracle_cnt = g.oracle_loc.length;
        g.oracle_flg = 1;
    }
    if (g.oracle_cnt <= 1 && !special)
        return; /*(shouldn't happen)*/
    const oracle_idx = special ? 0 : rnd(g.oracle_cnt - 1);
    const rec = g.oracle_loc[oracle_idx];
    if (!special) /* move offset of very last one into this slot */
        g.oracle_loc[oracle_idx] = g.oracle_loc[--g.oracle_cnt];

    const lines = [];
    if (delphi)
        lines.push(special
                   ? 'The Oracle scornfully takes all your gold and says:'
                   : 'The Oracle meditates for a moment and then intones:');
    else
        lines.push('The message reads:');
    lines.push('');
    for (const l of rec)
        lines.push(l);
    await display_text_window(lines);   /* display_nhwindow(tmpwin, TRUE) */
}

// C ref: rumors.c get_rnd_text(ENGRAVEFILE, ...) — pick a random engraving text.
// Consumes rn2(ENGRAVE_CHUNK_SIZE). Returns the selected engraving text.
function get_rnd_text_engrave() {
    return get_rnd_line_from_section(ENGRAVE_LINES, ENGRAVE_OFFSETS, ENGRAVE_CHUNK_SIZE, rn2, 60);
}
// C ref: engrave.c rubouts[] — partial rubout table for character degradation.
const rubouts = [
    { from: 'A', to: '^' },
    { from: 'B', to: 'Pb[' },
    { from: 'C', to: '(' },
    { from: 'D', to: '|)[' },
    { from: 'E', to: '|FL[_' },
    { from: 'F', to: '|-' },
    { from: 'G', to: 'C(' },
    { from: 'H', to: '|-' },
    { from: 'I', to: '|' },
    { from: 'K', to: '|<' },
    { from: 'L', to: '|_' },
    { from: 'M', to: '|' },
    { from: 'N', to: '|\\' },
    { from: 'O', to: 'C(' },
    { from: 'P', to: 'F' },
    { from: 'Q', to: 'C(' },
    { from: 'R', to: 'PF' },
    { from: 'T', to: '|' },
    { from: 'U', to: 'J' },
    { from: 'V', to: '/\\' },
    { from: 'W', to: 'V/\\' },
    { from: 'Z', to: '/' },
    { from: 'b', to: '|' },
    { from: 'd', to: 'c|' },
    { from: 'e', to: 'c' },
    { from: 'g', to: 'c' },
    { from: 'h', to: 'n' },
    { from: 'j', to: 'i' },
    { from: 'k', to: '|' },
    { from: 'l', to: '|' },
    { from: 'm', to: 'nr' },
    { from: 'n', to: 'r' },
    { from: 'o', to: 'c' },
    { from: 'q', to: 'c' },
    { from: 'w', to: 'v' },
    { from: 'y', to: 'v' },
    { from: ':', to: '.' },
    { from: ';', to: ',:' },
    { from: ',', to: '.' },
    { from: '=', to: '-' },
    { from: '+', to: '-|' },
    { from: '*', to: '+' },
    { from: '@', to: '0' },
    { from: '0', to: 'C(' },
    { from: '1', to: '|' },
    { from: '6', to: 'o' },
    { from: '7', to: '/' },
    { from: '8', to: '3o' },
];
// C ref: engrave.c wipeout_text — degrade cnt characters in engr string (seed=0 uses rn2).
export function wipeout_text(engr, cnt, seed, rngFn = rn2) {
    const chars = engr.split('');
    const lth = chars.length;
    if (!lth || cnt <= 0)
        return engr;
    while (cnt-- > 0) {
        let nxt, use_rubout;
        if (!seed) {
            nxt = rngFn(lth);
            use_rubout = rngFn(4);
        }
        else {
            /* C keeps this as an unsigned int.  Math.imul is required here:
             * multiplying a 32-bit seed by 31 wraps before C takes the
             * BUFSZ-1 modulus.  Plain JS multiplication would silently lose
             * that wrap for seeds above 2^27. */
            seed >>>= 0;
            nxt = seed % lth;
            seed = Math.imul(seed, 31) >>> 0;
            seed %= 255; // BUFSZ-1 = 255 (C BUFSZ=256)
            use_rubout = seed & 3;
        }
        if (chars[nxt] === ' ')
            continue;
        if ('?.,\'`-|_'.indexOf(chars[nxt]) >= 0) {
            chars[nxt] = ' ';
            continue;
        }
        let i = rubouts.length;
        if (use_rubout) {
            for (i = 0; i < rubouts.length; i++) {
                if (chars[nxt] === rubouts[i].from) {
                    const wipeto = rubouts[i].to;
                    const ln = wipeto.length;
                    /* In C the seeded path advances the same local seed
                     * again; it does not consume the global RNG tape. */
                    if (seed) {
                        seed = Math.imul(seed, 31) >>> 0;
                        seed %= 255;
                    }
                    const j = seed ? seed % ln : rngFn(ln);
                    chars[nxt] = wipeto[j];
                    break;
                }
            }
        }
        if (i === rubouts.length)
            chars[nxt] = '?';
    }
    // trim trailing spaces
    let result = chars.join('');
    result = result.replace(/ +$/, '');
    return result;
}
// C ref: engrave.c random_engraving — pick a random engraving text and apply wipeout.
// Consumes rn2(4); if 0 uses ENGRAVEFILE else uses getrumor(0,...).
function random_engraving() {
    let pristine;
    if (!rn2(4)) {
        pristine = get_rnd_text_engrave();
    }
    else {
        /* C engrave.c:57 — getrumor(0, pristine_copy, TRUE): graffiti must
           never be a fortune-cookie rumor. */
        const rumor = getrumor(0, true);
        if (rumor && rumor.length > 0) {
            pristine = rumor;
        }
        else {
            pristine = get_rnd_text_engrave();
        }
    }
    const text = wipeout_text(pristine, Math.trunc(pristine.length / 4), 0);
    return { text, pristine };
}
/* in_rooms (C hack.c:3497-3559) — this file used to carry `return []`, a
 * file-local stub that SHADOWED the complete port in js/shk.js and was
 * re-exported from here, so js/cmd.js, js/dig.js, js/teleport.js and js/trap.js
 * all imported the empty one while js/dochug.js, js/dokick.js, js/lock.js,
 * js/monmove.js, js/muse.js and js/priest.js imported the real one.  The real
 * body is imported at the top of this file and re-exported here so that both
 * halves of the tree resolve to one implementation. */
// ============================================================
// Core mklev functions (ported from main project's mklev.js)
// ============================================================
// C ref: allmain.c l_nhcore_init()
// C ref: mon.c make_corpse() — drop a corpse (or species-specific remains) for a
// dead monster.  ORDINARY-MONSTER path only (the default_1 branch, mon.c:874):
// most melee/ranged kills.  The special-species cases (dragons → scales, golems →
// gems/chains/weapons, unicorns → horn, undead → old corpse, etc.) consume DIFFERENT
// switch.  Returns the created corpse object (already placed) or null (G_NOCORPSE).
//
// RNG sequence (mirrors C mkcorpstat(CORPSE, 0, mdat, x, y, INIT) → mksobj(CORPSE,
// init=TRUE)): next_ident rnd(2) → CORPSE-init random corpsenm via undead_to_corpse(
// rndmonnum()) [the rndmonst_adj rolls] → gender rn2(2) → set_corpsenm →
// start_corpse_timeout [rn2(1000)/rn2(4)/rne(4)/rn2(2)/rnz(10)].  The randomly-chosen
// corpsenm is then OVERRIDDEN to the dead monster's species (C: otmp->corpsenm =
// monsndx(ptr)); the random pick's RNG is consumed regardless — bug-for-bug faithful.
/* The eight mummies and eight zombies of C's mon.c:629-644 case list.  NOT the
 * same set as undead_to_corpse()'s (js/mklev.js:718), which also folds in the
 * two vampires — those have their own make_corpse arm (mon.c:622), not ported.
 * The zombie mndx constants are the file's existing ones (js/mklev.js:164-171);
 * the eight mummies had no constant here yet. */
const PM_KOBOLD_MUMMY = 187, PM_GNOME_MUMMY = 188, PM_ORC_MUMMY = 189,
      PM_DWARF_MUMMY = 190, PM_ELF_MUMMY = 191, PM_HUMAN_MUMMY = 192,
      PM_ETTIN_MUMMY = 193, PM_GIANT_MUMMY = 194;
const _MUMMY_ZOMBIE_MNDX = new Set([
    PM_KOBOLD_MUMMY, PM_DWARF_MUMMY, PM_GNOME_MUMMY, PM_ORC_MUMMY,
    PM_ELF_MUMMY, PM_HUMAN_MUMMY, PM_GIANT_MUMMY, PM_ETTIN_MUMMY,
    PM_KOBOLD_ZOMBIE, PM_DWARF_ZOMBIE, PM_GNOME_ZOMBIE, PM_ORC_ZOMBIE,
    PM_ELF_ZOMBIE, PM_HUMAN_ZOMBIE, PM_GIANT_ZOMBIE, PM_ETTIN_ZOMBIE,
]);
/* C ref: mkobj.c:2067 mkcorpstat(CORPSE, mtmp, ptr, x, y, CORPSTAT_INIT) with a
 * non-random <x,y>: mksobj_at(CORPSE, x, y, init=TRUE, FALSE), then override the
 * randomly-rolled corpsenm with monsndx(ptr) and re-fire the corpse timeout when
 * either the old or the new species is special.  The random pick's RNG is
 * consumed regardless — bug-for-bug faithful, see this function's header. */
async function _mkcorpstat_corpse(corpsenm, x, y, corpstatflags) {
    const otmp = await mksobj(CORPSE, true, false);
    /* C mkobj.c:2101 mkcorpstat — `otmp->spe = (corpstatflags & CORPSTAT_SPE_VAL)`.
     * RNG-free, but it is the corpse's recorded gender and make_corpse's caller
     * cannot set it any other way. */
    otmp.spe = ((corpstatflags | 0) & CORPSTAT_SPE_VAL) | 0;
    const old_corpsenm = otmp.corpsenm | 0;
    otmp.corpsenm = corpsenm | 0;
    otmp.owt = weight(otmp);
    if (otmp.otyp === CORPSE
        && (!!game.flags?.zombify || special_corpse(old_corpsenm)
            || special_corpse(otmp.corpsenm))) {
        start_corpse_timeout(otmp);
    }
    place_object(otmp, x | 0, y | 0);
    return otmp;
}
export async function make_corpse(mtmp, x, y, corpseflags) {
    const g = game;
    if (ENV.FF_DEATH_TRACE === '1')
        pushRngLogEntry(`^make_corpse[id=${mtmp.m_id|0} pm=${(mtmp.mndx ?? mtmp.mnum ?? -1)|0} pos=${x|0},${y|0}]`);
    const mndx = (mtmp.mndx ?? mtmp.mnum ?? 0) | 0;
    /* C mon.c:576-579 — make_corpse's own preamble, before the switch:
     *     if (mtmp->female) corpstatflags |= CORPSTAT_FEMALE;
     *     else if (!is_neuter(mtmp->data)) corpstatflags |= CORPSTAT_MALE;
     * RNG-free.  It was missing here, so every corpse this body made came out
     * with spe == 0 (neuter) whatever the monster was. */
    let corpstatflags = (corpseflags | 0) || CORPSTAT_NONE;
    if (mtmp.female) corpstatflags |= CORPSTAT_FEMALE;
    else if (((mtmp.data?.mflags2 | 0) & M2_NEUTER) === 0) corpstatflags |= CORPSTAT_MALE;
    if (_MUMMY_ZOMBIE_MNDX.has(mndx)) {
        const obj = await _mkcorpstat_corpse(undead_to_corpse(mndx), x, y,
                                       corpstatflags | CORPSTAT_INIT);
        obj.age = (obj.age | 0) - (TAINT_AGE + 1);
        newsym(x | 0, y | 0);
        return obj;
    }
    /* C mon.c:622-628 — vampires: the corpse of the BASE creature, old. */
    if (mndx === 226 /* PM_VAMPIRE */ || mndx === 227 /* PM_VAMPIRE_LEADER */) {
        const obj = await _mkcorpstat_corpse(undead_to_corpse(mndx), x, y,
                                       corpstatflags | CORPSTAT_INIT);
        obj.age = (obj.age | 0) - (TAINT_AGE + 1);
        newsym(x | 0, y | 0);
        return obj;
    }
    /* C mon.c:650-712 — golems leave their material instead of a corpse.
     * Each arm ends 'free_mgivenname(mtmp); break;' into the common tail
     * (mon.c:896-934), which here is just newsym (no name/stack modelling). */
    {
        const PM_PAPER_GOLEM_MC = 250, PM_ROPE_GOLEM_MC = 251, PM_GOLD_GOLEM_MC = 252,
              PM_LEATHER_GOLEM_MC = 253, PM_WOOD_GOLEM_MC = 254, PM_CLAY_GOLEM_MC = 256,
              PM_STONE_GOLEM_MC = 257, PM_GLASS_GOLEM_MC = 258, PM_IRON_GOLEM_MC = 259;
        const IRON_CHAIN_MC = 478, FIRST_GLASS_GEM_MC = 461, NUM_GLASS_GEMS_MC = 9,
              SCR_BLANK_PAPER_MC = 365, LEASH_MC = 236, BULLWHIP_MC = 82,
              GRAPPLING_HOOK_MC = 260, LEATHER_ARMOR_MC = 134, LEATHER_CLOAK_MC = 145,
              SADDLE_MC = 235, QUARTERSTAFF_MC = 79, SMALL_SHIELD_MC = 150, CLUB_MC = 77,
              ELVEN_SPEAR_MC = 28, BOOMERANG_MC = 26;
        let num, obj = null, golem = true;
        switch (mndx) {
        case PM_IRON_GOLEM_MC:
            num = d_ml(2, 6);
            while (num-- > 0) obj = await mksobj_at(IRON_CHAIN_MC, x, y, true, false);
            break;
        case PM_GLASS_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0)
                obj = await mksobj_at(FIRST_GLASS_GEM_MC + rn2(NUM_GLASS_GEMS_MC), x, y, true, false);
            break;
        case PM_CLAY_GOLEM_MC:
            obj = await mksobj_at(ROCK, x, y, false, false);
            obj.quan = rn2(20) + 50;
            obj.owt = weight(obj);
            break;
        case PM_STONE_GOLEM_MC:
            obj = await mkcorpstat(STATUE, null, mndx, x, y,
                                   corpstatflags & ~CORPSTAT_INIT);
            break;
        case PM_WOOD_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0) {
                obj = await mksobj_at(rn2(2) ? QUARTERSTAFF_MC
                                      : rn2(3) ? SMALL_SHIELD_MC
                                      : rn2(3) ? CLUB_MC
                                      : rn2(3) ? ELVEN_SPEAR_MC : BOOMERANG_MC,
                                      x, y, true, false);
            }
            break;
        case PM_ROPE_GOLEM_MC:
            num = rn2(3);
            while (num-- > 0)
                obj = await mksobj_at(rn2(2) ? LEASH_MC
                                      : rn2(3) ? BULLWHIP_MC : GRAPPLING_HOOK_MC,
                                      x, y, true, false);
            break;
        case PM_LEATHER_GOLEM_MC:
            num = d_ml(2, 4);
            while (num-- > 0)
                obj = await mksobj_at(rn2(4) ? LEATHER_ARMOR_MC
                                      : rn2(3) ? LEATHER_CLOAK_MC : SADDLE_MC,
                                      x, y, true, false);
            break;
        case PM_GOLD_GOLEM_MC:
            obj = await mkgold(200 - rnl_mc(101), x, y);
            break;
        case PM_PAPER_GOLEM_MC:
            num = rnd(4);
            while (num-- > 0) obj = await mksobj_at(SCR_BLANK_PAPER_MC, x, y, true, false);
            break;
        default:
            golem = false;
        }
        if (golem) {
            newsym(x | 0, y | 0);
            return obj;
        }
    }
    /* C mon.c:582-597 — gray/gold/silver fall through into the colored dragons: scales first (rn2 3, or 20 if revived), then
     * goto default_1.  The dragon order matches the scale order. */
    if (mndx >= PM_GRAY_DRAGON && mndx <= PM_YELLOW_DRAGON_MC) {
        if (!rn2(mtmp.mrevived ? 20 : 3)) {
            const sc = await mksobj_at(GRAY_DRAGON_SCALES_NC + mndx - PM_GRAY_DRAGON, x, y, false, false);
            sc.spe = 0;
            sc.cursed = sc.blessed = false;
        }
    }
    /* C mon.c:603-616 — unicorn horn (the "crumbles to dust" pline needs canseemon). */
    if (mndx >= PM_WHITE_UNICORN_MC && mndx <= PM_BLACK_UNICORN_MC) {
        if (mtmp.mrevived && rn2(2)) {
            if (canseemon(mtmp))
                await pline(`${lifesave_s_suffix(Monnam_wm(mtmp))} recently regrown horn crumbles to dust.`);
        } else {
            const h = await mksobj_at(UNICORN_HORN, x, y, true, false);
            if (h && mtmp.mrevived) h.degraded_horn = 1;
        }
    }
    /* C mon.c:617-619 */
    if (mndx === PM_LONG_WORM)
        await mksobj_at(WORM_TOOTH, x, y, true, false);
    // C mon.c:874 default_1 — G_NOCORPSE species drop nothing.
    // mvflags is the dynamic per-game state; G_NOCORPSE seeds from mons[].geno
    // (MONS row col 3) at game start, G_GONE accrues from genocide/extinction.
    const noCorpseStatic = (mndx >= 0 && mndx < MONS_ROWS.length)
        ? ((MONS_ROWS[mndx][3] | 0) & G_NOCORPSE) : 0;
    const goneDyn = (g.mvitals?.[mndx]?.mvflags | 0) & G_GONE;
    if ((noCorpseStatic | goneDyn) !== 0)
        return null;
    // C: mkcorpstat(CORPSE, KEEPTRAITS(mtmp) ? mtmp : 0, mdat, x, y, INIT).
    // KEEPTRAITS is false for an ordinary unnamed hostile (no extra-monst traits),
    // so the corpse carries no saved monster struct — mksobj(CORPSE, init=TRUE)
    // fires the random-corpsenm + timeout RNG, then we override corpsenm to mdat.
    const otmp = await _mkcorpstat_corpse(mndx, x, y, corpstatflags | CORPSTAT_INIT);
    // C mon.c:934-935 — make_corpse ends `stackobj(obj); newsym(x, y);`.  Every
    // newsym the death path issued before this one ran while the corpse did not
    // exist yet (mondead → m_detach → mon_leaving_level, mon.c:2725), so they
    // mergable() allows (C mon.c:934); 'obj' remains the survivor.
    await stackobj(otmp);
    newsym(x | 0, y | 0);
    return otmp;
}
// C ref: mon.c:5002-5012 valid_vampshiftform(base, form)
// Check if a vampire (base) can shift to a given form.
export function valid_vampshiftform(base, form) {
    if ((base | 0) >= LOW_PM && (MONS_ROWS[base | 0]?.[0] | 0) === S_VAMPIRE) {
        const PM_VAMPIRE_BAT = 129;
        const PM_FOG_CLOUD = 106;
        const PM_WOLF = 20;
        const PM_VAMPIRE = 226;
        if ((form | 0) === PM_VAMPIRE_BAT || (form | 0) === PM_FOG_CLOUD
            || ((form | 0) === PM_WOLF && (base | 0) !== PM_VAMPIRE))
            return true;
    }
    return false;
}
/** Export mksobj/mkobj for use by fastforward.js ini_inv_rng (u_init.c::ini_inv). */
export { mksobj, mkobj, mksobj_at, place_object };
export { mk_artifact };
export { dig_corridor };
export { sobj_at, next_ident };
/** Export wipe_engr_at for dochug monster-move engraving wipe (monmove.c:755). */
export { wipe_engr_at };
export { random_engraving };
/** Export get_rnd_line_from_section for do_name.js bogusmon() — C reaches the
 *  same rumors.c get_rnd_line through get_rnd_text(BOGUSMONFILE, ...), just on
 *  the DISPLAY rng instead of rn2. */
export { get_rnd_line_from_section };
/** Export make_engr_at / del_engr_at for the player engrave command (engrave.js
 *  doengrave / engrave occupation, engrave.c:409/462).  They share the _engr_map
 *  store so display.js engr_at() renders the player's engraving glyph. */
export { make_engr_at };
// C ref: engrave.c:462 del_engr_at(x,y) — delete any engraving at (x,y).
export function del_engr_at(x, y) {
    _engr_map.delete(`${x},${y}`);
}
// C ref: engrave.c engr_at — look up engraving record at (x,y).
// Returns the engraving object {text, engr_type} or null.
// display.js newsym uses this to render S_engroom / S_engrcorr glyphs.
export function engr_at(x, y) {
    return _engr_map.get(`${x},${y}`) ?? null;
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
export function save_engravings() {
    engr_reset_text_pointers();
    return new Map(_engr_map);
}
export function rest_engravings(saved) {
    _engr_map.clear();
    if (saved)
        for (const [k, ep] of saved)
            _engr_map.set(k, ep);
}
export { l_nhcore_init } from './nhlua.js';
import { nh_callback_run, NHCB_LVL_ENTER } from './nhlua.js';
import { ENV } from './hostenv.js';
// C ref: mklev.c mklev()
export async function mklev() {
    const g = game;
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
    /* C mklev.c:876 clears the whole svl.level struct, INCLUDING the
     * `monsters[x][y]` grid that MON_AT()/m_at() read.  This port has no grid;
     * the one part of it that is now tracked — the worm-segment squares, see
     * THE MAP-GRID GAP in js/worm.js — is module-global, so it is cleared here
     * where C's memset covers it.  (wheads[]/wtails[] themselves are C
     * per-level state saved and restored with the level; this port keeps them
     * module-global and never resets them, which is a separate pre-existing
     * gap — clearing them here would strand live worms on a revisit.) */
    worm_seg_clear_level();
    /* C mklev.c:876's memset of svl.level also drops the bubble list; this
     * port keeps it module-global in js/mkmaze.js, so drop it here too. */
    bubbles_clear_level();
    g.fobj = null; // C mklev.c:877 — svl.level.objlist = NULL (mirrors fobj = svl.level.objlist in rm.h:476)
    g.level = new GameMap();
    g.level.nroom = 0;
    g.level.rooms = [];
    g.made_branch = false;
    g.smeq = new Array(MAXNROFROOMS + 1).fill(0);
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
    /* C mklev.c:928 — clear_regions(), inside clear_level_structures().
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
    /* C mklev.c:931-934, the LAST statement of clear_level_structures():
     *     if (gl.lev_message) {
     *         free(gl.lev_message);
     *         gl.lev_message = (char *) 0;
     *     }
     * This was the one field of C's list still missing here — the gap
     * js/objnam.js:3620 filed against deliver_splev_message(), which is the
     * only reader.  A des.message() written for a level that is then never
     * arrived at leaked into the NEXT generated level's arrival topline.
     * Field-for-field against mklev.c:875-935 the rest of the list is now
     * complete: objlist / buriedobjlist / monlist / damagelist / bonesinfo /
     * nsubroom / subrooms are all members of the GameMap that `g.level = new
     * GameMap()` at the head of this function replaces wholesale, so they are
     * already zeroed; init_vault() is `g.vault_x = -1`; stairway_free_all() is
     * `g.stairs = null`. */
    game.lev_message = null;
    game.exclusion_zones = [];
}

/* C decl.h:819 `struct rogueroom r[3][3];` inside `struct grid gr` — a GLOBAL,
 * read by roguecorr()/miniwalk() after makeroguerooms() has filled it.  Same
 * lifetime here: module-level, rebuilt at the top of makeroguerooms(). */
const _rogue_r = [];
function _rogue_grid_reset() {
    _rogue_r.length = 0;
    for (let x = 0; x < 3; x++) {
        _rogue_r[x] = [];
        for (let y = 0; y < 3; y++)
            _rogue_r[x][y] = { rlx: 0, rly: 0, dx: 0, dy: 0,
                               real: false, doortable: 0, nroom: 0 };
    }
}

/* C extralev.c:20-42 */
function roguejoin(x1, y1, x2, y2, horiz) {
    let x, y, middle;

    if (horiz) {
        middle = x1 + rn2(x2 - x1 + 1);
        for (x = Math.min(x1, middle); x <= Math.max(x1, middle); x++)
            corr(x, y1);
        for (y = Math.min(y1, y2); y <= Math.max(y1, y2); y++)
            corr(middle, y);
        for (x = Math.min(middle, x2); x <= Math.max(middle, x2); x++)
            corr(x, y2);
    } else {
        middle = y1 + rn2(y2 - y1 + 1);
        for (y = Math.min(y1, middle); y <= Math.max(y1, middle); y++)
            corr(x1, y);
        for (x = Math.min(x1, x2); x <= Math.max(x1, x2); x++)
            corr(x, middle);
        for (y = Math.min(middle, y2); y <= Math.max(middle, y2); y++)
            corr(x2, y);
    }
}

/* C extralev.c:44-135 */
async function roguecorr(x, y, dir) {
    const g = game;
    let fromx, fromy, tox, toy;

    if (dir === XL_DOWN) {
        _rogue_r[x][y].doortable &= ~XL_DOWN;
        if (!_rogue_r[x][y].real) {
            fromx = _rogue_r[x][y].rlx;
            fromy = _rogue_r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = _rogue_r[x][y].rlx + rn2(_rogue_r[x][y].dx);
            fromy = _rogue_r[x][y].rly + _rogue_r[x][y].dy;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            /* C: impossible("down: no wall at %d,%d?") — diagnostic only */
            await dodoor(fromx, fromy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(fromx, fromy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            fromy++;
        }
        if (y >= 2) {
            /* C: impossible("down door from %d,%d going nowhere?") */
            return;
        }
        y++;
        _rogue_r[x][y].doortable &= ~XL_UP;
        if (!_rogue_r[x][y].real) {
            tox = _rogue_r[x][y].rlx;
            toy = _rogue_r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = _rogue_r[x][y].rlx + rn2(_rogue_r[x][y].dx);
            toy = _rogue_r[x][y].rly - 1;
            tox += 1 + 26 * x;
            toy += 7 * y;
            /* C: impossible("up: no wall at %d,%d?") */
            await dodoor(tox, toy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(tox, toy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            toy--;
        }
        roguejoin(fromx, fromy, tox, toy, false);
        return;
    } else if (dir === XL_RIGHT) {
        _rogue_r[x][y].doortable &= ~XL_RIGHT;
        if (!_rogue_r[x][y].real) {
            fromx = _rogue_r[x][y].rlx;
            fromy = _rogue_r[x][y].rly;
            fromx += 1 + 26 * x;
            fromy += 7 * y;
        } else {
            fromx = _rogue_r[x][y].rlx + _rogue_r[x][y].dx;
            fromy = _rogue_r[x][y].rly + rn2(_rogue_r[x][y].dy);
            fromx += 1 + 26 * x;
            fromy += 7 * y;
            /* C: impossible("down: no wall at %d,%d?") — C really does say
             * "down" here; ported as-is (Cardinal Rule 1), diagnostic only */
            await dodoor(fromx, fromy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(fromx, fromy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            fromx++;
        }
        if (x >= 2) {
            /* C: impossible("right door from %d,%d going nowhere?") */
            return;
        }
        x++;
        _rogue_r[x][y].doortable &= ~XL_LEFT;
        if (!_rogue_r[x][y].real) {
            tox = _rogue_r[x][y].rlx;
            toy = _rogue_r[x][y].rly;
            tox += 1 + 26 * x;
            toy += 7 * y;
        } else {
            tox = _rogue_r[x][y].rlx - 1;
            toy = _rogue_r[x][y].rly + rn2(_rogue_r[x][y].dy);
            tox += 1 + 26 * x;
            toy += 7 * y;
            /* C: impossible("left: no wall at %d,%d?") */
            await dodoor(tox, toy, g.level.rooms[_rogue_r[x][y].nroom]);
            {
                const loc = g.level.at(tox, toy);
                if (loc)
                    loc.doormask = D_NODOOR;
            }
            tox--;
        }
        roguejoin(fromx, fromy, tox, toy, true);
        return;
    }
    /* C: impossible("corridor in direction %d?", dir) */
}

/* C extralev.c:137-190 — modified walkfrom() from mkmaze.c */
function miniwalk(x, y) {
    let q, dir;
    const dirs = [0, 0, 0, 0];

    while (1) {
        q = 0;
        /* C: #define doorhere (gr.r[x][y].doortable) — a MACRO, so it
         * re-evaluates against the CURRENT x,y after the switch moves them.
         * That is load-bearing: the second `doorhere |= ...` in each arm
         * marks the DESTINATION cell, not the source. */
        if (x > 0 && (!(_rogue_r[x][y].doortable & XL_LEFT))
            && (!_rogue_r[x - 1][y].doortable || !rn2(10)))
            dirs[q++] = 0;
        if (x < 2 && (!(_rogue_r[x][y].doortable & XL_RIGHT))
            && (!_rogue_r[x + 1][y].doortable || !rn2(10)))
            dirs[q++] = 1;
        if (y > 0 && (!(_rogue_r[x][y].doortable & XL_UP))
            && (!_rogue_r[x][y - 1].doortable || !rn2(10)))
            dirs[q++] = 2;
        if (y < 2 && (!(_rogue_r[x][y].doortable & XL_DOWN))
            && (!_rogue_r[x][y + 1].doortable || !rn2(10)))
            dirs[q++] = 3;
        /* Rogue levels aren't just 3 by 3 mazes; they have some extra
         * connections, thus that 1/10 chance */
        if (!q)
            return;
        dir = dirs[rn2(q)];
        switch (dir) { /* Move in direction */
        case 0:
            _rogue_r[x][y].doortable |= XL_LEFT;
            x--;
            _rogue_r[x][y].doortable |= XL_RIGHT;
            break;
        case 1:
            _rogue_r[x][y].doortable |= XL_RIGHT;
            x++;
            _rogue_r[x][y].doortable |= XL_LEFT;
            break;
        case 2:
            _rogue_r[x][y].doortable |= XL_UP;
            y--;
            _rogue_r[x][y].doortable |= XL_DOWN;
            break;
        case 3:
            _rogue_r[x][y].doortable |= XL_DOWN;
            y++;
            _rogue_r[x][y].doortable |= XL_UP;
            break;
        }
        miniwalk(x, y);
    }
}

/* C extralev.c:192-275 */
export async function makeroguerooms() {
    const g = game;
    let x, y;

    _rogue_grid_reset();

    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            /* Note: we want to insure at least 1 room.  So, if the
             * first 8 are all dummies, force the last to be a room. */
            if (!rn2(5) && (g.level.nroom || (x < 2 && y < 2))) {
                /* Arbitrary: dummy rooms may only go where real ones do. */
                here.real = false;
                here.rlx = rn1(22, 2);
                here.rly = rn1((y === 2) ? 4 : 3, 2);
            } else {
                here.real = true;
                here.dx = rn1(22, 2); /* 2-23 long, plus walls */
                here.dy = rn1((y === 2) ? 4 : 3, 2); /* 2-5 high, plus walls */

                here.rlx = rnd(23 - here.dx + 1);
                here.rly = rnd(((y === 2) ? 5 : 4) - here.dy + 1);
                g.level.nroom++;
            }
            here.doortable = 0;
        }
    miniwalk(rn2(3), rn2(3));
    g.level.nroom = 0;
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            if (here.real) { /* Make a room */
                let lowx, lowy, hix, hiy;

                _rogue_r[x][y].nroom = g.level.nroom;
                g.smeq[g.level.nroom] = g.level.nroom;

                lowx = 1 + 26 * x + here.rlx;
                lowy = 7 * y + here.rly;
                hix = 1 + 26 * x + here.rlx + here.dx - 1;
                hiy = 7 * y + here.rly + here.dy - 1;
                /* Strictly speaking, it should be lit only if above
                 * level 10, but since Rogue rooms are only encountered
                 * below level 10, use !rn2(7). */
                add_room(lowx, lowy, hix, hiy, !rn2(7), OROOM, false);
            }
        }

    /* Now, add connecting corridors. */
    for (y = 0; y < 3; y++)
        for (x = 0; x < 3; x++) {
            const here = _rogue_r[x][y];
            if (here.doortable & XL_DOWN)
                await roguecorr(x, y, XL_DOWN);
            if (here.doortable & XL_RIGHT)
                await roguecorr(x, y, XL_RIGHT);
            /* C: impossible() for a leftover XL_LEFT / XL_UP */
        }
}

/* C extralev.c:277-285 */
function corr(x, y) {
    const loc = game.level.at(x, y);
    if (rn2(50)) {
        if (loc)
            loc.typ = CORR;
    } else {
        if (loc)
            loc.typ = SCORR;
    }
}

/* C extralev.c:287-353 */
export async function makerogueghost() {
    const g = game;
    let ghost, ghostobj, croom, x, y;

    if (!g.level.nroom)
        return; /* Should never happen */
    croom = g.level.rooms[rn2(g.level.nroom)];
    x = somex(croom);
    y = somey(croom);
    if (!(ghost = await makemon(PM_GHOST, x, y, 0 /* NO_MM_FLAGS */)))
        return;
    ghost.msleeping = 1;
    ghost = christen_monst(ghost, roguename());

    if (rn2(4)) {
        ghostobj = (await mksobj_at(_XL_FOOD_RATION, x, y, false, false));
        ghostobj.quan = rnd(7);
        ghostobj.owt = weight(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_MACE, x, y, false, false));
        ghostobj.spe = rnd(3);
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = (await mksobj_at(_XL_TWO_HANDED_SWORD, x, y, false, false));
        ghostobj.spe = rnd(5) - 2;
        if (rn2(4))
            curse(ghostobj);
    }
    ghostobj = (await mksobj_at(_XL_BOW, x, y, false, false));
    ghostobj.spe = 1;
    if (rn2(4))
        curse(ghostobj);

    ghostobj = (await mksobj_at(_XL_ARROW, x, y, false, false));
    ghostobj.spe = 0;
    ghostobj.quan = rn1(10, 25);
    ghostobj.owt = weight(ghostobj);
    if (rn2(4))
        curse(ghostobj);

    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_RING_MAIL, x, y, false, false));
        ghostobj.spe = rn2(3);
        if (!rn2(3))
            ghostobj.oerodeproof = true;
        if (rn2(4))
            curse(ghostobj);
    } else {
        ghostobj = (await mksobj_at(_XL_PLATE_MAIL, x, y, false, false));
        ghostobj.spe = rnd(5) - 2;
        if (!rn2(3))
            ghostobj.oerodeproof = true;
        if (rn2(4))
            curse(ghostobj);
    }
    if (rn2(2)) {
        ghostobj = (await mksobj_at(_XL_FAKE_AMULET_OF_YENDOR, x, y, true, false));
        ghostobj.known = true;
    }
}
/* otyps for makerogueghost's loot.  objects.h is an X-macro file with no
 * `#define <NAME>` text to grep, so these are the OC_NAME (js/oc_name_data.js)
 * row indices, each independently corroborated by an existing js/ site:
 *   ARROW 18 (m_initweap.js:44) TWO_HANDED_SWORD 55 (m_initweap.js:81)
 *   MACE 73 (m_initweap.js:99)  BOW 83 (m_initweap.js:109)
 *   PLATE_MAIL 121 / RING_MAIL 132 (makemon.js:1942,1944)
 *   FAKE_AMULET_OF_YENDOR 212 (eat.js:70, do_wear.js:1474)
 *   FOOD_RATION 293 (dogmove.js:1232, eat.js:1615) */
const _XL_ARROW = 18;
const _XL_TWO_HANDED_SWORD = 55;
const _XL_MACE = 73;
const _XL_BOW = 83;
const _XL_PLATE_MAIL = 121;
const _XL_RING_MAIL = 132;
const _XL_FAKE_AMULET_OF_YENDOR = 212;
const _XL_FOOD_RATION = 293;
/* ============================ end extralev.c ============================ */

// C ref: mklev.c makelevel()
async function makelevel() {
    await makelevel_generate();
    // C mklev.c:1422: applies to special, maze and ordinary levels alike.
    await nh_callback_run(NHCB_LVL_ENTER);
}

async function makelevel_generate() {
    const g = game;
    oinit();
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
            const dunlev = (uz0?.dlevel | 0) - (dgn.depth_start | 0) + 1;
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
        if (g._captureReplay && g.u?.uz0 && g.u.uz0.dnum === dnum)
            g._luathemes_loaded[dnum] = true;
        if (!g._luathemes_loaded[dnum]) {
            const themedAlign = ['law', 'neutral', 'chaos'];
            for (let i = themedAlign.length; i > 1; i--) {
                const j = rn2(i);
                [themedAlign[i - 1], themedAlign[j]] = [themedAlign[j], themedAlign[i - 1]];
            }
            g._luathemes_loaded[dnum] = true;
        }
        await makerooms();
    }
    if (g.level.nroom <= 0)
        return;
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
        if (u_depth > 1 && u_depth < medusaDepth
            && nroom >= room_threshold && rn2(u_depth) < 3) {
            await do_mkroom(SHOPBASE);
        }
        else if (u_depth > 4 && !rn2(6)) {
            await do_mkroom(COURT);
        }
        else if (u_depth > 5 && !rn2(8) /* && !(mvitals[LEPRECHAUN] & G_GONE) */) {
            await do_mkroom(LEPREHALL);
        }
        else if (u_depth > 6 && !rn2(7)) {
            await do_mkroom(ZOO);
        }
        else if (u_depth > 8 && !rn2(5)) {
            await do_mkroom(TEMPLE);
        }
        else if (u_depth > 9 && !rn2(5) /* && !(mvitals[KILLER_BEE] & G_GONE) */) {
            await do_mkroom(BEEHIVE);
        }
        else if (u_depth > 11 && !rn2(6)) {
            await do_mkroom(MORGUE);
        }
        else if (u_depth > 12 && !rn2(8) && antholemon() !== null) {
            await do_mkroom(ANTHOLE);
        }
        else if (u_depth > 14 && !rn2(4) /* && !(mvitals[SOLDIER] & G_GONE) */) {
            await do_mkroom(BARRACKS);
        }
        else if (u_depth > 15 && !rn2(6)) {
            await do_mkroom(SWAMP);
        }
        else if (u_depth > 16 && !rn2(8) /* && !(mvitals[COCKATRICE] & G_GONE) */) {
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
    if (g._luathemes_loaded?.[dnum]) {
        await themerooms_post_level_generate();
        wallification(1, 0, COLNO - 1, ROWNO - 1);
    }
}
// C ref: mklev.c makerooms()
async function makerooms() {
    const g = game;
    let tried_vault = false;
    const difficulty = depth_of_level(g.u?.uz);
    let themeroom_tries = 0;
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
            if (!(await themerooms_generate(difficulty))) {
                if (themeroom_tries++ > 10
                    || g.level.nroom >= Math.trunc(MAXNROFROOMS / 6))
                    break;
            }
        }
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
/** C stripdigits(hacklib.c) */
export function stripdigits(s) {
    let out = '';
    for (let i = 0; i < s.length; i++) {
        const c = s[i];
        if (c < '0' || c > '9')
            out += c;
    }
    return out;
}
/** C str_lines_maxlen(hacklib.c) */
export function str_lines_maxlen(str) {
    let maxLen = 0;
    let s1 = 0;
    while (s1 < str.length) {
        const nl = str.indexOf('\n', s1);
        const len = nl === -1 ? str.length - s1 : nl - s1;
        if (len > maxLen)
            maxLen = len;
        if (nl === -1)
            break;
        s1 = nl + 1;
    }
    return maxLen;
}
/** C mapfrag_fromstr layout after stripdigits — rectangular lines padded to wid. */
function themeroom_mapfrag_from_lua(mapLua) {
    const data = stripdigits(mapLua);
    const rawLines = data.split('\n');
    const wid = str_lines_maxlen(data);
    const hei = rawLines.length;
    const lines = rawLines.map(line => line.padEnd(wid, ' '));
    return { wid, hei, lines };
}
function splev_chr2typ(ch) {
    for (let i = 0; i < SPLEV_CH2TYP_ORDER.length; i++) {
        const pair = SPLEV_CH2TYP_ORDER[i];
        if (ch === pair[0])
            return pair[1];
    }
    return INVALID_TYPE;
}
export function mapfrag_get(mf, x, y) {
    if (y < 0 || x < 0 || y > mf.hei - 1 || x > mf.wid - 1)
        return INVALID_TYPE;
    const row = mf.lines[y];
    const ch = x < row.length ? row[x] : ' ';
    return splev_chr2typ(ch);
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

// C ref: mon.c:4455-4456 itermonarr / itermonsiz
// Static module globals for safe iteration over all monsters on the level
let itermonarr = null; // array of struct monst *
let itermonsiz = 0; // size in 'monst *' pointers

/**
 * The level-generation callbacks the nhlib.js themeroom fills need to run C's
 * `des.monster{}` (sp_lev.c lspo_monster -> create_monster) rather than merely
 * consuming a guess at its RNG.  nhlib.js may not import mklev.js, so they are
 * handed in; this is the same `hooks` shape nhlib_fill_storeroom_rng takes.
 *
 * setSpecFlags applies create_monster's post-makemon spec writes
 * (sp_lev.c:2124 `mtmp->female = m->female`, sp_lev.c:2132-2133
 * `if (m->asleep > BOOL_RANDOM) mtmp->msleeping = m->asleep`) to the monster
 * makemon just created.  The nhlib fills await makemon before invoking this
 * hook, so the fmon head still identifies that completed creation.
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
        setSpecFlags: (female) => {
            const mtmp = game.fmon;
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
            const fakemon = { data: permonstTemplate(mndx), mnum: mndx, m_id: 0,
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
         * carries no name= field, so named is FALSE and artif is TRUE. */
        await mksobj_at(STATUE, pos.x, pos.y, true, true);
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
            const iceCells = roomRndcoordCells(aroom);
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
            const _chestPos = somexy(aroom, {});
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
                rnd(250); // start_timer ROT_ORGANIC offset
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
                if (placedLoc && placedLoc.typ === ROOM)
                    placedLoc.typ = ALTAR;
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
                if (otmp)
                    otmp.blessed = false;   /* buc="not-blessed" (see below) */
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
                if (otmp)
                    otmp.blessed = false;
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
                        && ((MONS_ROWS[mndx]?.[0] | 0) === 13 /* S_MIMIC */)) {
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
            const _tx = (entry.data ? (entry.data.x | 0) : 0) - _pos.x - 1;
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
                // C: add_doors_to_room() called after contents callback picks up DOOR tiles.
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
            const corpse = await mksobj(CORPSE, true, false);
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
    const totyp = splev_chr2typ(terr[0]);
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
    await makemon(nastyId, mapPos.x + 2, mapPos.y + 2, 0);
    /* C sp_lev.c:2124 `mtmp->female = m->female` — makemon has already rolled a
     * random gender (makemon.c:1279); create_monster overwrites it with the one
     * find_montype drew.  The spec sets no asleep/waiting, so nothing else. */
    if (game.fmon)
        game.fmon.female = (nastyGend === 1 /* FEMALE */) ? 1 : 0;
    /* themerms.lua:813 des.exclusion({type="teleport", ...}) — RNG-free and
     * invisible to the 24x80 render; not modelled. */
}
// C ref: themerms.lua themerooms_generate()
// "default" usually wins (frequency 1000 vs others ~1-10).
async function themerooms_generate(difficulty) {
    const prevLua = game.in_mk_themerooms;
    game.in_mk_themerooms = true;
    let pick = null;
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
        game.in_mk_themerooms = prevLua;
        return false;
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
    /* C sp_lev.c:4100 — lspo_room calls add_doors_to_room(tmpcr) after the
     * contents callback and spo_endroom, for the top-level themed room too.
     * That links a subroom's door (already added to the subroom by
     * splev_create_door_rng) to the PARENT as well, so the parent's doorct is
     * 2 where this port left it 1 and makeniche's `doorct == 1 && rn2(5)`
     * (mklev.c:741) drew a spurious rn2(5). */
    if (aroom)
        add_doors_to_room(aroom);
    game.in_mk_themerooms = prevLua;
    return !!aroom && contentsOk;
}
// C ref: sp_lev.c:1090-1106 shared_with_room()
function shared_with_room(x, y, droom) {
    const map = game.level;
    const rmno = (droom.roomnoidx ?? map.rooms.indexOf(droom)) + ROOMOFFSET;
    if (!isok(x, y))
        return false;
    const loc0 = map.at(x, y);
    if ((loc0.roomno | 0) === rmno && !loc0.edge)
        return false;
    if (isok(x - 1, y) && (map.at(x - 1, y).roomno | 0) === rmno && x - 1 <= droom.hx)
        return true;
    if (isok(x + 1, y) && (map.at(x + 1, y).roomno | 0) === rmno && x + 1 >= droom.lx)
        return true;
    if (isok(x, y - 1) && (map.at(x, y - 1).roomno | 0) === rmno && y - 1 <= droom.hy)
        return true;
    if (isok(x, y + 1) && (map.at(x, y + 1).roomno | 0) === rmno && y + 1 >= droom.ly)
        return true;
    return false;
}
// C ref: sp_lev.c:1109-1120 maybe_add_door()
function maybe_add_door(x, y, droom) {
    const map = game.level;
    const rmno = (droom.roomnoidx ?? map.rooms.indexOf(droom)) + ROOMOFFSET;
    if (droom.hx >= 0
        && ((!droom.irregular && inside_room(droom, x, y))
            || (map.at(x, y).roomno | 0) === rmno
            || shared_with_room(x, y, droom))) {
        add_door(x, y, droom);
    }
}
// C ref: sp_lev.c:5544-5555 add_doors_to_room()
function add_doors_to_room(croom) {
    const map = game.level;
    for (let x = croom.lx - 1; x <= croom.hx + 1; x++)
        for (let y = croom.ly - 1; y <= croom.hy + 1; y++) {
            const loc = isok(x, y) ? map.at(x, y) : null;
            if (loc && (IS_DOOR(loc.typ) || loc.typ === SDOOR))
                maybe_add_door(x, y, croom);
        }
    for (let i = 0; i < (croom.nsubrooms | 0); i++)
        add_doors_to_room(croom.sbrooms[i]);
}
// C ref: sp_lev.c check_room()
export function check_room(lowx, ddx, lowy, ddy, vault) {
    const map = game.level;
    let hix = lowx.value + ddx.value, hiy = lowy.value + ddy.value;
    const xlim = XLIM + (vault ? 1 : 0);
    const ylim = YLIM + (vault ? 1 : 0);
    const s_lowx = lowx.value, s_ddx = ddx.value;
    const s_lowy = lowy.value, s_ddy = ddy.value;
    if (lowx.value < 3)
        lowx.value = 3;
    if (lowy.value < 2)
        lowy.value = 2;
    if (hix > COLNO - 3)
        hix = COLNO - 3;
    if (hiy > ROWNO - 3)
        hiy = ROWNO - 3;
    for (;;) {
        if (hix <= lowx.value || hiy <= lowy.value)
            return false;
        if (game.in_mk_themerooms
            && s_lowx !== lowx.value && s_ddx !== ddx.value
            && s_lowy !== lowy.value && s_ddy !== ddy.value) {
            return false;
        }
        let retry = false;
        for (let x = lowx.value - xlim; x <= hix + xlim && !retry; x++) {
            if (x <= 0 || x >= COLNO)
                continue;
            let y = Math.max(lowy.value - ylim, 0);
            const ymax = Math.min(hiy + ylim, ROWNO - 1);
            for (; y <= ymax; y++) {
                const loc = map.at(x, y);
                if (loc && loc.typ !== STONE) {
                    if (!rn2(3))
                        return false;
                    if (game.in_mk_themerooms)
                        return false;
                    if (x < lowx.value)
                        lowx.value = x + xlim + 1;
                    else
                        hix = x - xlim - 1;
                    if (y < lowy.value)
                        lowy.value = y + ylim + 1;
                    else
                        hiy = y - ylim - 1;
                    retry = true;
                    break;
                }
            }
        }
        if (!retry)
            break;
    }
    ddx.value = hix - lowx.value;
    ddy.value = hiy - lowy.value;
    if (game.in_mk_themerooms
        && s_lowx !== lowx.value && s_ddx !== ddx.value
        && s_lowy !== lowy.value && s_ddy !== ddy.value) {
        return false;
    }
    return true;
}
// C ref: sp_lev.c create_room()
export function create_room(x, y, w, h, xal, yal, rtype, rlit, _suppressMidlog) {
    if (!_suppressMidlog)
        pushRngLogEntry('>create_room');
    const result = _create_room_impl(x, y, w, h, xal, yal, rtype, rlit);
    if (!_suppressMidlog)
        pushRngLogEntry(`<create_room=${result ? 1 : 0}`);
    return result;
}
function _create_room_impl(x, y, w, h, xal, yal, rtype, rlit) {
    const g = game;
    let xabs = 0, yabs = 0;
    let r1 = null, r2 = null;
    let wtmp, htmp;
    let trycnt = 0;
    let vault = false;
    let xlim = XLIM, ylim = YLIM;
    if (rtype === -1)
        rtype = OROOM;
    if (rtype === VAULT) {
        vault = true;
        xlim++;
        ylim++;
    }
    rlit = litstate_rnd(rlit);
    do {
        wtmp = w;
        htmp = h;
        let xtmp = x, ytmp = y;
        let xaltmp = xal, yaltmp = yal;
        if ((xtmp < 0 && ytmp < 0 && wtmp < 0 && xaltmp < 0 && yaltmp < 0) || vault) {
            r1 = rnd_rect();
            if (!r1)
                return false;
            const hx = r1.hx, hy = r1.hy, lx = r1.lx, ly = r1.ly;
            let dx, dy;
            if (vault) {
                dx = dy = 1;
            }
            else {
                dx = 2 + rn2((hx - lx > 28) ? 12 : 8);
                dy = 2 + rn2(4);
                if (dx * dy > 50)
                    dy = Math.trunc(50 / dx);
            }
            const xborder = (lx > 0 && hx < COLNO - 1) ? 2 * xlim : xlim + 1;
            const yborder = (ly > 0 && hy < ROWNO - 1) ? 2 * ylim : ylim + 1;
            if (hx - lx < dx + 3 + xborder || hy - ly < dy + 3 + yborder) {
                r1 = null;
                continue;
            }
            xabs = lx + (lx > 0 ? xlim : 3)
                + rn2(hx - (lx > 0 ? lx : 3) - dx - xborder + 1);
            yabs = ly + (ly > 0 ? ylim : 2)
                + rn2(hy - (ly > 0 ? ly : 2) - dy - yborder + 1);
            if (ly === 0 && hy >= ROWNO - 1
                && (!g.level.nroom || !rn2(g.level.nroom))
                && (yabs + dy > Math.trunc(ROWNO / 2))) {
                yabs = rn1(3, 2);
                if (g.level.nroom < 4 && dy > 1)
                    dy--;
            }
            const lowx = { value: xabs }, ddx = { value: dx };
            const lowy = { value: yabs }, ddy = { value: dy };
            if (!check_room(lowx, ddx, lowy, ddy, vault)) {
                r1 = null;
                continue;
            }
            xabs = lowx.value;
            yabs = lowy.value;
            wtmp = ddx.value + 1;
            htmp = ddy.value + 1;
            r2 = { lx: xabs - 1, ly: yabs - 1, hx: xabs + wtmp, hy: yabs + htmp };
        }
        else { /* Only some parameters are random */
            // C ref: sp_lev.c create_room() else branch (line ~1581)
            let rndpos = 0;
            // SPLEV alignment constants (sp_lev.c local #defines)
            const SPLEV_LEFT = 1, SPLEV_CENTER = 3, SPLEV_RIGHT = 5;
            const TOP_ALIGN = 1, BOTTOM_ALIGN = 5;
            if (xtmp < 0 && ytmp < 0) { /* Position is RANDOM */
                xtmp = rnd(5);
                ytmp = rnd(5);
                rndpos = 1;
            }
            if (wtmp < 0 || htmp < 0) { /* Size is RANDOM */
                wtmp = rn1(15, 3);
                htmp = rn1(8, 2);
            }
            if (xaltmp === -1) /* Horizontal alignment is RANDOM */
                xaltmp = rnd(3);
            if (yaltmp === -1) /* Vertical alignment is RANDOM */
                yaltmp = rnd(3);
            /* Try to generate real (absolute) coordinates here! */
            xabs = Math.trunc(((xtmp - 1) * COLNO) / 5) + 1;
            yabs = Math.trunc(((ytmp - 1) * ROWNO) / 5) + 1;
            switch (xaltmp) {
                case SPLEV_LEFT:
                    break;
                case SPLEV_RIGHT:
                    xabs += Math.trunc(COLNO / 5) - wtmp;
                    break;
                case SPLEV_CENTER:
                    xabs += Math.trunc((Math.trunc(COLNO / 5) - wtmp) / 2);
                    break;
            }
            switch (yaltmp) {
                case TOP_ALIGN:
                    break;
                case BOTTOM_ALIGN:
                    yabs += Math.trunc(ROWNO / 5) - htmp;
                    break;
                case SPLEV_CENTER:
                    yabs += Math.trunc((Math.trunc(ROWNO / 5) - htmp) / 2);
                    break;
            }
            if (xabs + wtmp - 1 > COLNO - 2)
                xabs = COLNO - wtmp - 3;
            if (xabs < 2)
                xabs = 2;
            if (yabs + htmp - 1 > ROWNO - 2)
                yabs = ROWNO - htmp - 3;
            if (yabs < 2)
                yabs = 2;
            /* Try to find a rectangle that fits our room! */
            r2 = { lx: xabs - 1, ly: yabs - 1,
                hx: xabs + wtmp + rndpos, hy: yabs + htmp + rndpos };
            r1 = get_rect(r2);
            let dx = wtmp, dy = htmp;
            if (r1) {
                const lowx2 = { value: xabs }, ddx2 = { value: dx };
                const lowy2 = { value: yabs }, ddy2 = { value: dy };
                if (!check_room(lowx2, ddx2, lowy2, ddy2, vault)) {
                    r1 = null;
                }
                else {
                    xabs = lowx2.value;
                    yabs = lowy2.value;
                    // C: wtmp/htmp unchanged; xabs/yabs updated by check_room
                }
            }
        }
    } while (++trycnt <= 100 && !r1);
    if (!r1)
        return false;
    split_rects(r1, r2);
    if (!vault) {
        g.smeq[g.level.nroom] = g.level.nroom;
        add_room(xabs, yabs, xabs + wtmp - 1, yabs + htmp - 1, rlit, rtype, false);
    }
    else {
        if (!g.level.rooms[g.level.nroom])
            g.level.rooms[g.level.nroom] = {};
        g.level.rooms[g.level.nroom].lx = xabs;
        g.level.rooms[g.level.nroom].ly = yabs;
    }
    return true;
}
function create_vault() {
    return create_room(-1, -1, 2, 2, -1, -1, VAULT, true);
}
// C ref: sp_lev.c build_room() — wraps create_room/create_subroom with
// rtype chance check and post-creation topologize/needfill/needjoining.
// r = { chance, rtype, x, y, w, h, rlit, needfill, joined, xalign, yalign }
export function build_room(r, mkr) {
    // C: rn2(100) < r->chance — called unconditionally when chance != 0
    const rtype = (!r.chance || rn2(100) < r.chance) ? r.rtype : OROOM;
    let aroom;
    let okroom;
    if (mkr) {
        // Subroom: uses gs.subrooms / gn.nsubroom
        if (!game.level._subrooms)
            game.level._subrooms = [];
        if (game.level._nsubroom === undefined)
            game.level._nsubroom = 0;
        // Pre-allocate slot — C does aroom = &gs.subrooms[gn.nsubroom]
        // before create_subroom; add_subroom fills the same slot later.
        aroom = {};
        game.level._subrooms[game.level._nsubroom] = aroom;
        okroom = create_subroom(mkr, r.x, r.y, r.w, r.h, rtype, r.rlit);
    }
    else {
        // Top-level room: uses svr.rooms / svn.nroom
        pushRngLogEntry('>create_room');
        okroom = _create_room_impl(r.x, r.y, r.w, r.h, r.xalign, r.yalign, rtype, r.rlit);
        pushRngLogEntry(`<create_room=${okroom ? 1 : 0}`);
        aroom = okroom ? game.level.rooms[game.level.nroom - 1] : null;
    }
    if (okroom) {
        topologize(aroom);
        aroom.needfill = r.needfill;
        aroom.needjoining = r.joined;
        /* C sp_lev.c:4087-4089 (lspo_room): added a subroom, make parent
         * room irregular (so fill_zoo/somexy treat it as such) */
        if (mkr)
            mkr.irregular = true;
        return aroom;
    }
    return null;
}
// C ref: sp_lev.c create_subroom() — create a subroom inside parent room
function create_subroom(proom, x, y, w, h, rtype, rlit) {
    const width = proom.hx - proom.lx + 1;
    const height = proom.hy - proom.ly + 1;
    if (width < 4 || height < 4)
        return false;
    if (w === -1)
        w = rnd(width - 3);
    if (h === -1)
        h = rnd(height - 3);
    if (x === -1)
        x = rnd(width - w);
    if (y === -1)
        y = rnd(height - h);
    if (x === 1)
        x = 0;
    if (y === 1)
        y = 0;
    if ((x + w + 1) === width)
        x++;
    if ((y + h + 1) === height)
        y++;
    if (rtype === -1)
        rtype = OROOM;
    rlit = litstate_rnd(rlit);
    add_subroom(proom, proom.lx + x, proom.ly + y, proom.lx + x + w - 1, proom.ly + y + h - 1, rlit, rtype, false);
    return true;
}
// C ref: mklev.c add_subroom() — register a subroom under a parent room
export function add_subroom(proom, lowx, lowy, hix, hiy, lit, rtype, special) {
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
}
// C ref: mklev.c add_room()
export function add_room(lowx, lowy, hix, hiy, lit, rtype, special) {
    const g = game;
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
    if (g.level.nroom < MAXNROFROOMS) {
        g.level.rooms[g.level.nroom] = { hx: -1 };
    }
}
// C ref: mklev.c do_room_or_subroom()
function do_room_or_subroom(croom, lowx, lowy, hix, hiy, lit, _rtype, special, is_room) {
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
    croom.rtype = _rtype;
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
function finddpos(cc, dir, aroom) {
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
        default: return false;
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
// C ref: sp_lev.c dig_corridor()
async function dig_corridor(org, dest, npoints_out, nxcor, ftyp, btyp) {
    pushRngLogEntry('>dig_corridor');
    const result = await _dig_corridor_impl(org, dest, npoints_out, nxcor, ftyp, btyp);
    pushRngLogEntry(`<dig_corridor=${result ? 1 : 0}`);
    return result;
}
async function _dig_corridor_impl(org, dest, npoints_out, nxcor, ftyp, btyp) {
    const map = game.level;
    let dx = 0, dy = 0;
    let xx = org.x, yy = org.y;
    const tx = dest.x, ty = dest.y;
    let npoints = 0;
    if (npoints_out)
        npoints_out.value = 0;
    if (xx <= 0 || yy <= 0 || tx <= 0 || ty <= 0
        || xx > COLNO - 1 || tx > COLNO - 1 || yy > ROWNO - 1 || ty > ROWNO - 1)
        return false;
    if (tx > xx)
        dx = 1;
    else if (ty > yy)
        dy = 1;
    else if (tx < xx)
        dx = -1;
    else
        dy = -1;
    xx -= dx;
    yy -= dy;
    let cct = 0;
    while (xx !== tx || yy !== ty) {
        if (cct++ > 500 || (nxcor && !rn2(35)))
            return false;
        xx += dx;
        yy += dy;
        if (xx >= COLNO - 1 || xx <= 0 || yy <= 0 || yy >= ROWNO - 1)
            return false;
        const crm = map.at(xx, yy);
        if (!crm)
            return false;
        if (crm.typ === btyp) {
            if (ftyp === CORR && maybe_sdoor(100)) {
                npoints++;
                if (npoints_out)
                    npoints_out.value = npoints;
                crm.typ = SCORR;
            }
            else {
                npoints++;
                if (npoints_out)
                    npoints_out.value = npoints;
                crm.typ = ftyp;
                if (nxcor && !rn2(50)) {
                    await mksobj_at(BOULDER, xx, yy, true, false);
                }
            }
        }
        else if (crm.typ !== ftyp && crm.typ !== SCORR) {
            return false;
        }
        let dix = Math.abs(xx - tx);
        let diy = Math.abs(yy - ty);
        if ((dix > diy) && diy && !rn2(dix - diy + 1))
            dix = 0;
        else if ((diy > dix) && dix && !rn2(diy - dix + 1))
            diy = 0;
        if (dy && dix > diy) {
            const ddx = (xx > tx) ? -1 : 1;
            const ncr = map.at(xx + ddx, yy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dx = ddx;
                dy = 0;
                continue;
            }
        }
        else if (dx && diy > dix) {
            const ddy = (yy > ty) ? -1 : 1;
            const ncr = map.at(xx, yy + ddy);
            if (ncr && (ncr.typ === btyp || ncr.typ === ftyp || ncr.typ === SCORR)) {
                dy = ddy;
                dx = 0;
                continue;
            }
        }
        const straight = map.at(xx + dx, yy + dy);
        if (straight && (straight.typ === btyp || straight.typ === ftyp || straight.typ === SCORR))
            continue;
        if (dx) {
            dx = 0;
            dy = (ty < yy) ? -1 : 1;
        }
        else {
            dy = 0;
            dx = (tx < xx) ? -1 : 1;
        }
        const alt = map.at(xx + dx, yy + dy);
        if (alt && (alt.typ === btyp || alt.typ === ftyp || alt.typ === SCORR))
            continue;
        dy = -dy;
        dx = -dx;
    }
    if (npoints_out)
        npoints_out.value = npoints;
    return true;
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
    for (const broom of g.level.rooms || []) {
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
        if (!finddpos(cc, DIR_E, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!finddpos(tt, DIR_W, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else if (troom.hy < croom.ly) {
        dy = -1;
        dx = 0;
        if (!finddpos(cc, DIR_N, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!finddpos(tt, DIR_S, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else if (troom.hx < croom.lx) {
        dx = -1;
        dy = 0;
        if (!finddpos(cc, DIR_W, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!finddpos(tt, DIR_E, troom)) {
            pushRngLogEntry('<join');
            return;
        }
    }
    else {
        dy = 1;
        dx = 0;
        if (!finddpos(cc, DIR_S, croom)) {
            pushRngLogEntry('<join');
            return;
        }
        if (!finddpos(tt, DIR_N, troom)) {
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
    const ftyp = CORR;
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
    for (let i = 0; i < g.level.nroom; i++)
        g.smeq[i] = i;
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
// ============================================================
// Room helper functions
// ============================================================
/* C mkroom.c:665-677.  Exported (rather than re-derived) because
 * fixup_special()'s medusa arm in js/sp_lev.js calls both, and a second copy
 * would have to be kept in RNG lockstep with this one by hand. */
export function somex(croom) { return rn1(croom.hx - croom.lx + 1, croom.lx); }
export function somey(croom) { return rn1(croom.hy - croom.ly + 1, croom.ly); }
// C ref: mkroom.c inside_room()
function inside_room(croom, x, y) {
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? game.level.rooms.indexOf(croom);
        const i = idx + ROOMOFFSET;
        const loc = game.level.at(x, y);
        return !!(loc && !loc.edge && (loc.roomno | 0) === i);
    }
    return x >= croom.lx - 1 && x <= croom.hx + 1
        && y >= croom.ly - 1 && y <= croom.hy + 1;
}
// C ref: mkroom.c somexy()
export function somexy(croom, c) {
    let try_cnt = 0;
    let i;
    if (croom.irregular) {
        const idx = croom.roomnoidx ?? game.level.rooms.indexOf(croom);
        i = idx + ROOMOFFSET;
        while (try_cnt++ < 100) {
            c.x = somex(croom);
            c.y = somey(croom);
            const loc = game.level.at(c.x, c.y);
            if (loc && !loc.edge && (loc.roomno | 0) === i)
                return true;
        }
        for (c.x = croom.lx; c.x <= croom.hx; c.x++) {
            for (c.y = croom.ly; c.y <= croom.hy; c.y++) {
                const loc = game.level.at(c.x, c.y);
                if (loc && !loc.edge && (loc.roomno | 0) === i)
                    return true;
            }
        }
        return false;
    }
    if (!croom.nsubrooms) {
        c.x = somex(croom);
        c.y = somey(croom);
        return true;
    }
    outer: while (try_cnt++ < 100) {
        c.x = somex(croom);
        c.y = somey(croom);
        const loc = game.level.at(c.x, c.y);
        if (loc && IS_WALL(loc.typ))
            continue;
        const nsub = croom.nsubrooms | 0;
        for (i = 0; i < nsub; i++) {
            const sb = croom.sbrooms[i];
            if (inside_room(sb, c.x, c.y))
                continue outer;
        }
        break;
    }
    if (try_cnt >= 100)
        return false;
    return true;
}
// C ref: mklev.c:1815-1822 occupied() = t_at(x,y) || IS_FURNITURE(levl[x][y].typ)
// || is_lava(x,y) || is_pool(x,y) || invocation_pos(x,y).
export function occupied(x, y) {
    // t_at(x,y) means a trap blocks the tile.
    const traps = game.level.traps;
    if (traps && traps.some(t => t.tx === x && t.ty === y))
        return true;
    // every record, but stairway placement always is.
    if (stairway_at(x, y))
        return true;
    const loc = game.level.at(x, y);
    if (loc && (IS_FURNITURE(loc.typ)
                || loc.typ === LAVAPOOL || loc.typ === LAVAWALL
                || IS_POOL(loc.typ)))
        return true;
    const invocation_pos = false; /* stub — WIRE_PENDING: invocation_pos (hack.c:965) unported */
    return invocation_pos;
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
export function somexyspace(croom, c) {
    pushRngLogEntry('>somexyspace');
    let trycnt = 0;
    let okay;
    do {
        okay = somexy(croom, c) && isok(c.x, c.y) && !occupied(c.x, c.y);
        if (okay) {
            const loc = game.level.at(c.x, c.y);
            okay = loc && (loc.typ === ROOM || loc.typ === CORR || loc.typ === ICE);
        }
    } while (trycnt++ < 100 && !okay);
    pushRngLogEntry(`<somexyspace=${okay ? 1 : 0}`);
    return okay;
}
// ============================================================
// Stairs
// ============================================================
function generate_stairs_room_good(croom, phase) {
    if (!croom || croom.hx < 0)
        return false;
    if (!croom.needjoining && phase >= 0)
        return false;
    let hasDown = false, hasUp = false;
    for (let st = game.stairs; st; st = st.next) {
        const inRoom = st.sx >= croom.lx && st.sx <= croom.hx
            && st.sy >= croom.ly && st.sy <= croom.hy;
        if (!inRoom)
            continue;
        if (st.up)
            hasUp = true;
        else
            hasDown = true;
    }
    if (phase >= 1 && (hasDown || hasUp))
        return false;
    if (croom.rtype !== OROOM && !(phase < 2 && croom.rtype === THEMEROOM))
        return false;
    return true;
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
export function mkstairs(x, y, up, croom) {
    const g = game;
    const _uz = g.u?.uz;
    const _dlev = (_uz?.dlevel ?? 1) | 0;
    const _dunlevs = (g.dungeons?.[(_uz?.dnum ?? 0) | 0]?.num_dunlevs | 0);
    if (_dlev === (up ? 1 : _dunlevs))
        return;
    const loc = g.level.at(x, y);
    if (loc) {
        loc.typ = STAIRS;
        loc.ladder = up ? 1 : 2;
    }
    const dest = {
        dnum: g.u?.uz?.dnum ?? 0,
        dlevel: (g.u?.uz?.dlevel ?? 1) + (up ? -1 : 1),
    };
    stairway_add(x, y, !!up, false, dest);
    if (up)
        g.level.upstair = { x, y };
    else
        g.level.dnstair = { x, y };
}
async function generate_stairs() {
    const g = game;
    const pos = { x: 0, y: 0 };
    // Down stairs
    {
        const croom = generate_stairs_find_room();
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
// C ref: mkroom.c do_mkroom/mkshop/pick_room/isbig/invalid_shop_shape,
//        mklev.c:1352-1383 makelevel special-room else-if chain.
// ============================================================
// C ref: mkroom.c:43 isbig()
function isbig(sroom) {
    const area = (sroom.hx - sroom.lx + 1) * (sroom.hy - sroom.ly + 1);
    return area > 20;
}
// C ref: mkroom.c:641 has_dnstairs()
function has_dnstairs(sroom) {
    for (let st = game.stairs; st; st = st.next)
        if (!st.up && inside_room(sroom, st.sx, st.sy))
            return true;
    return false;
}
// C ref: mkroom.c:654 has_upstairs()
function has_upstairs(sroom) {
    for (let st = game.stairs; st; st = st.next)
        if (st.up && inside_room(sroom, st.sx, st.sy))
            return true;
    return false;
}
// C ref: mkroom.c:1051 invalid_shop_shape() — consumes no RNG.
function invalid_shop_shape(sroom) {
    const g = game;
    const door = (g.level?.doors ?? [])[sroom.fdoor | 0];
    if (!door)
        return true;
    const doorx = door.x, doory = door.y;
    let insidex = 0, insidey = 0, insidect = 0;
    for (let x = Math.max(doorx - 1, sroom.lx); x <= Math.min(doorx + 1, sroom.hx); x++) {
        for (let y = Math.max(doory - 1, sroom.ly); y <= Math.min(doory + 1, sroom.hy); y++) {
            const loc = g.level.at(x, y);
            if (loc && loc.typ === ROOM) {
                insidex = x;
                insidey = y;
                insidect++;
            }
        }
    }
    if (insidect < 1)
        return true; /* C: impossible(...); return TRUE */
    if (insidect === 1) {
        insidect = 0;
        for (let x = Math.max(insidex - 1, sroom.lx); x <= Math.min(insidex + 1, sroom.hx); x++) {
            for (let y = Math.max(insidey - 1, sroom.ly); y <= Math.min(insidey + 1, sroom.hy); y++) {
                if (x === insidex && y === insidey)
                    continue;
                const loc = g.level.at(x, y);
                if (loc && loc.typ === ROOM)
                    insidect++;
            }
        }
        if (insidect === 1)
            return true;
    }
    return false;
}
async function mkshop() {
    const g = game;
    let i = -1;
    /* gottype: scan rooms for first eligible shop room */
    let sroom = null;
    const rooms = g.level.rooms;
    for (let idx = 0;; idx++) {
        const r = rooms[idx];
        // C: if (sroom->hx < 0) return;  (rooms[] terminated by hx<0)
        if (!r || r.hx < 0)
            return;
        if (idx >= g.level.nroom) {
            /* C: impossible("rooms[] not closed by -1?"); return; */
            return;
        }
        if (r.rtype !== OROOM)
            continue;
        if (has_dnstairs(r) || has_upstairs(r))
            continue;
        if ((r.doorct | 0) === 1) {
            if (invalid_shop_shape(r))
                continue;
            sroom = r;
            break;
        }
    }
    /* C: light the room if not already lit */
    if (!sroom.rlit) {
        for (let x = sroom.lx - 1; x <= sroom.hx + 1; x++)
            for (let y = sroom.ly - 1; y <= sroom.hy + 1; y++) {
                const loc = g.level.at(x, y);
                if (loc)
                    loc.lit = 1;
            }
        sroom.rlit = 1;
    }
    if (i < 0) {
        /* C: pick a shop type at random via rnd(100) weighted by shtypes[].prob */
        let j = rnd(100);
        i = 0;
        while ((j -= _shtypes[i].prob) > 0)
            i++;
        /* big rooms cannot be wand or book shops -> general store */
        if (isbig(sroom) && (_shtypes[i].symb === WAND_CLASS || _shtypes[i].symb === SPBOOK_CLASS))
            i = 0;
    }
    sroom.rtype = SHOPBASE + i;
    topologize(sroom);
    /* C: stocked later in makelevel along with other special rooms */
    sroom.needfill = FILL_NORMAL;
}
// C ref: mkroom.c:220 pick_room() — used by mkzoo/mkswamp/mktemple bodies.
function pick_room(strict) {
    const g = game;
    const nroom = g.level.nroom | 0;
    if (nroom <= 0)
        return null;
    let idx = rn2(nroom);
    for (let count = nroom; count-- > 0; idx++) {
        if (idx === nroom)
            idx = 0;
        const sroom = g.level.rooms[idx];
        if (!sroom || sroom.hx < 0)
            return null;
        if (sroom.rtype !== OROOM)
            continue;
        if (!strict) {
            if (has_upstairs(sroom) || (has_dnstairs(sroom) && rn2(3)))
                continue;
        }
        else if (has_upstairs(sroom) || has_dnstairs(sroom))
            continue;
        /* C mkroom.c:238: `if (sroom->doorct == 1 || !rn2(5) || wizard)`.  C's ||
         * short-circuits left-to-right, so the wizard test never suppresses the
         * rn2(5) draw — it only rescues a room the rn2 rejected.  `wizard` is C's
         * debug playmode (js/options.js sets game.flags.debug for playmode:debug,
         * the same predicate js/cmd.js dopray() uses for pray.c:2233). */
        if ((sroom.doorct | 0) === 1 || !rn2(5) || !!(g.flags && g.flags.debug))
            return sroom;
    }
    return null;
}
// C ref: mkroom.c:245-256 mkzoo(int type) — pick an unused room and mark it as
// the given special type.  It does NOT stock the room: the C comment is
// explicit ("room does not get stocked at this time - it will get stocked at the
// end of makelevel()"), and the stocking runs through fill_special_room() →
// fill_zoo(), which is already ported (js/mklev.js:2764/2512).  All RNG mkzoo
// consumes is pick_room()'s.
function mkzoo(type) {
    const sroom = pick_room(false);
    if (sroom) {
        sroom.rtype = type;
        sroom.needfill = FILL_NORMAL;
    }
}
// C ref: mkroom.c:53 do_mkroom()
/* C ref: mkroom.c:585-597 shrine_pos(roomno) — the centre square of a room,
 * nudged by one on either odd axis.  Returns a coord; C hands back a pointer
 * to a static buf, which every caller copies out of before the next call. */
function shrine_pos(roomno) {
    const troom = game.level.rooms[roomno - ROOMOFFSET];
    const buf = { x: 0, y: 0 };
    let delta;

    /* if width and height are odd, placement will be the exact center;
       if either or both are even, center point is a hypothetical spot
       between map locations and placement will be adjacent to that */
    delta = (troom.hx | 0) - (troom.lx | 0);
    buf.x = (troom.lx | 0) + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.x++;
    delta = (troom.hy | 0) - (troom.ly | 0);
    buf.y = (troom.ly | 0) + Math.trunc(delta / 2);
    if ((delta % 2) && rn2(2))
        buf.y++;
    return buf;
}
/* C ref: mkroom.c:598-620 mktemple() —
 *
 *     if (!(sroom = pick_room(TRUE))) return;
 *     sroom->rtype = TEMPLE;
 *     shrine_spot = shrine_pos((int) ((sroom - svr.rooms) + ROOMOFFSET));
 *     lev = &levl[shrine_spot->x][shrine_spot->y];
 *     lev->typ = ALTAR;
 *     lev->altarmask = induced_align(80);
 *     priestini(&u.uz, sroom, shrine_spot->x, shrine_spot->y, FALSE);
 *     lev->altarmask |= AM_SHRINE;
 *     svl.level.flags.has_temple = 1;
 *
 * The AM_SHRINE bit is set AFTER priestini(), not before: priestini reads the
 * altar's alignment mask while placing the priest, so the order is load-bearing
 * and is kept. */
async function mktemple() {
    const g = game;
    const sroom = pick_room(true);
    if (!sroom)
        return;

    /* set up Priest and shrine */
    sroom.rtype = TEMPLE;
    const roomno = g.level.rooms.indexOf(sroom) + ROOMOFFSET;
    const shrine_spot = shrine_pos(roomno);
    const lev = g.level.at(shrine_spot.x, shrine_spot.y);
    if (lev) {
        lev.typ = ALTAR;
        lev.altarmask = induced_align(80);
    }
    await priestini(g.u.uz, sroom, shrine_spot.x, shrine_spot.y, false);
    if (lev)
        lev.altarmask = (lev.altarmask | 0) | AM_SHRINE;
    g.level.flags.has_temple = 1;
}
// C ref: mkroom.c:567-... mkswamp() — turn up to 5 rooms swampy.
async function mkswamp() {
    const g = game;
    let eelct = 0;
    for (let i = 0; i < 5; i++) {
        const sroom = g.level.rooms[rn2(g.level.nroom | 0)];
        if (!sroom || sroom.hx < 0 || sroom.rtype !== OROOM || has_upstairs(sroom)
            || has_dnstairs(sroom))
            continue;
        const rmno = g.level.rooms.indexOf(sroom) + ROOMOFFSET;
        sroom.rtype = SWAMP;
        for (let sx = sroom.lx; sx <= sroom.hx; sx++)
            for (let sy = sroom.ly; sy <= sroom.hy; sy++) {
                const lev = g.level.at(sx, sy);
                if (!IS_ROOM(lev.typ) || (lev.roomno | 0) !== rmno)
                    continue;
                let monAt = false;
                for (let m = g.fmon; m; m = m.nmon)
                    if ((m.mhp | 0) >= 1 && m.mx === sx && m.my === sy) { monAt = true; break; }
                if (!g.level.levelObjects?.[sx]?.[sy] && !monAt && !t_at(sx, sy)
                    && !nexttodoor(sx, sy)) {
                    if ((sx + sy) % 2) {
                        del_engr_at(sx, sy);
                        lev.typ = POOL;
                        if (!eelct || !rn2(4)) {
                            await makemon(rn2(5) ? PM_GIANT_EEL
                                : rn2(2) ? PM_PIRANHA : PM_ELECTRIC_EEL,
                                sx, sy, 0);
                            eelct++;
                        }
                    } else if (!rn2(4)) { /* swamps tend to be moldy */
                        await makemon(mkclass(32 /* S_FUNGUS */, 0), sx, sy, 0);
                    }
                }
            }
        g.level.flags.has_swamp = 1;
    }
}
async function do_mkroom(roomtype) {
    if (roomtype >= SHOPBASE) {
        await mkshop();
        return;
    }
    switch (roomtype) {
    case COURT:     mkzoo(COURT);     break;
    case ZOO:       mkzoo(ZOO);       break;
    case BEEHIVE:   mkzoo(BEEHIVE);   break;
    case MORGUE:    mkzoo(MORGUE);    break;
    case BARRACKS:  mkzoo(BARRACKS);  break;
    case LEPREHALL: mkzoo(LEPREHALL); break;
    case COCKNEST:  mkzoo(COCKNEST);  break;
    case ANTHOLE:   mkzoo(ANTHOLE);   break;
    case SWAMP:
        await mkswamp();
        break;
    case TEMPLE:
        await mktemple();
        break;
    default:
        /* C mkroom.c:87: impossible("Tried to make a room of type %d.") — logs
         * and returns; js/ models impossible() as a no-op (see js/steed.js:102). */
        break;
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
function place_niche(aroom) {
    let dy;
    const dd = { x: 0, y: 0 };
    if (rn2(2)) {
        dy = 1;
        if (!finddpos(dd, DIR_S, aroom))
            return null;
    }
    else {
        dy = -1;
        if (!finddpos(dd, DIR_N, aroom))
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
        const niche = place_niche(aroom);
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
                if (actualTrap !== ROCKTRAP)
                    ttmp.once = true;
                const engrText = trap_engravings[actualTrap];
                if (engrText) {
                    make_engr_at(xx, yy - dy, engrText, null, 0, DUST);
                    wipe_engr_at(xx, yy - dy, 5, false);
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
                        // C: mkcorpstat(CORPSE, NULL, mkclass(S_HUMAN, 0), xx, yy+dy, TRUE)
                        const pm = mkclassAligned(S_HUMAN, 0, A_NONE);
                        await mkcorpstat(CORPSE, null, pm, xx, yy + dy, 1);
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
    let ltptr = ((g.u?.uz?.dlevel ?? 1) > 15);
    let vamp = ((g.u?.uz?.dlevel ?? 1) > 5 && (g.u?.uz?.dlevel ?? 1) < 25);
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
export function find_branch_room(mp) {
    const g = game;
    if (!g.level.nroom) {
        mazexy(mp); /* already verifies location */
        return null;
    }
    const croom = generate_stairs_find_room();
    if (croom)
        somexyspace(croom, mp);
    return croom;
}
/* C ref: dungeon.c:2170-2185 dungeon_branch(s) — the branch whose end2 lies in
 * dungeon `dnum`.  C looks the dnum up by name; the two names this port needs
 * ("Fort Ludios", "The Quest") already have their dnum on game (knox_level.dnum
 * and quest_dnum), so the name lookup is folded into the caller. */
function dungeon_branch_by_dnum(dnum) {
    if (dnum === undefined || dnum === null)
        return null;
    const brlist = game._dungeon_branches || game.branches || [];
    for (const br of brlist)
        if (br?.end2?.dnum === dnum)
            return br;
    return null; /* C panics here; every dungeon.lua we load defines both */
}
/* C ref: dungeon.c:2187-2194 at_dgn_entrance(s) — on_level(&u.uz, &br->end1). */
function at_dgn_entrance_quest() {
    const br = dungeon_branch_by_dnum(game.quest_dnum);
    const uz = game.u?.uz;
    return !!(br && uz && br.end1?.dnum === uz.dnum && br.end1?.dlevel === uz.dlevel);
}
async function mk_knox_portal(x, y) {
    const g = game;
    const knox = g.knox_level;
    const br = dungeon_branch_by_dnum(knox?.dnum);
    if (!br)
        return; /* C: dungeon_branch() panics, so never returns */
    let source;
    if (knox && br.end1?.dnum === knox.dnum && br.end1?.dlevel === knox.dlevel) {
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
        && !at_dgn_entrance_quest()
        && u_depth > 10
        && u_depth < (depth_of_level(g.medusa_level) | 0)))
        return;
    /* C mklev.c:2653-2657 — adjust source to be current level and re-insert. */
    source.dnum = uz.dnum;
    source.dlevel = uz.dlevel;
    br.end1_floating = false;
    insert_branch(br, true);
    await place_branch(br, x, y);
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
    /* C ref: mklev.c:1718-1725 — the x==0 arm finds random coords; the x!=0 arm
     * only calls pos_to_room(x, y), whose return value C discards.  Before the
     * mk_knox_portal port this function had a single caller that always took the
     * x==0 arm, so the parameters were dropped and the search ran
     * unconditionally — which would have spent find_branch_room's RNG on a call
     * C makes with explicit coords. */
    if (!x) {
        find_branch_room(mp);
    }
    else {
        mp.x = x;
        mp.y = y;
    }
    const dnum = g.u?.uz?.dnum ?? 0;
    const dlevel = g.u?.uz?.dlevel ?? 1;
    const on_end1 = (branchp.end1?.dnum === dnum && branchp.end1?.dlevel === dlevel);
    /* C ref: mklev.c:1727-1735 */
    const dest = on_end1 ? branchp.end2 : branchp.end1;
    /* BR_NO_END1=1, BR_NO_END2=2; make_stairs false iff type matches the end we're on */
    const BR_NO_END1 = 1;
    const BR_NO_END2 = 2;
    const BR_PORTAL = 3;
    const brtype = branchp.type ?? 0;
    const make_stairs = on_end1 ? (brtype !== BR_NO_END1) : (brtype !== BR_NO_END2);
    /* C ref: mklev.c:1737-1748 */
    if (brtype === BR_PORTAL) {
        await mkportal(mp.x, mp.y, dest?.dnum ?? 0, dest?.dlevel ?? 0);
    }
    else if (make_stairs) {
        const goes_up = on_end1 ? !!branchp.end1_up : !branchp.end1_up;
        stairway_add(mp.x, mp.y, goes_up, false, dest || { dnum: 0, dlevel: 0 });
        const loc = g.level?.at(mp.x, mp.y);
        if (loc) {
            loc.typ = STAIRS;
            /* C ref: mklev.c:1748 levl[x][y].ladder = goes_up ? LA_UP : LA_DOWN */
            loc.ladder = goes_up ? 1 : 2;
        }
        if (goes_up)
            g.level.upstair = { x: mp.x, y: mp.y };
        else
            g.level.dnstair = { x: mp.x, y: mp.y };
    }
    /* C ref: mklev.c:1756 — set made_branch regardless */
    g.made_branch = true;
}
// ============================================================
// Wallification
// ============================================================
function isSolidTile(x, y) {
    if (!isok(x, y))
        return true;
    return IS_STWALL(game.level?.at(x, y)?.typ ?? STONE);
}
function isWallOrStone(x, y) {
    if (!isok(x, y))
        return 1;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (typ === STONE || isWallTile(x, y)) ? 1 : 0;
}
function isWallTile(x, y) {
    if (!isok(x, y))
        return 0;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    return (IS_WALL(typ) || IS_DOOR(typ) || typ === LAVAWALL
        || typ === WATER || typ === SDOOR || typ === IRONBARS) ? 1 : 0;
}
function extend_spine(locale, wall_there, dx, dy) {
    const nx = 1 + dx, ny = 1 + dy;
    if (!wall_there)
        return 0;
    if (dx) {
        if (locale[1][0] && locale[1][2] && locale[nx][0] && locale[nx][2])
            return 0;
        return 1;
    }
    if (locale[0][1] && locale[2][1] && locale[0][ny] && locale[2][ny])
        return 0;
    return 1;
}
function wall_cleanup(x1, y1, x2, y2) {
    const map = game.level;
    if (!map)
        return;
    /* C mkmaze.c:100-104 — the baalz insect's legs are walls inside solid
     * rock; the interior of gb.bughack.inarea is protected from the
     * surrounded-by-rock cull that would otherwise delete them. */
    const bh = bughack();
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            if (within_bounded_area(x, y, bh.inarea.x1, bh.inarea.y1,
                                    bh.inarea.x2, bh.inarea.y2))
                continue;
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL))
                continue;
            if (isSolidTile(x - 1, y - 1) && isSolidTile(x - 1, y) && isSolidTile(x - 1, y + 1)
                && isSolidTile(x, y - 1) && isSolidTile(x, y + 1)
                && isSolidTile(x + 1, y - 1) && isSolidTile(x + 1, y) && isSolidTile(x + 1, y + 1)) {
                loc.typ = STONE;
            }
        }
}
export function fix_wall_spines(x1, y1, x2, y2) {
    const spineArray = [VWALL, HWALL, HWALL, HWALL,
        VWALL, TRCORNER, TLCORNER, TDWALL,
        VWALL, BRCORNER, BLCORNER, TUWALL,
        VWALL, TLWALL, TRWALL, CROSSWALL];
    const map = game.level;
    if (!map)
        return;
    /* C mkmaze.c:151-158 — inside gb.bughack.inarea the neighbour test is
     * iswall(), not iswall_or_stone(), so the baalz insect's legs do not grow
     * spines into the surrounding rock. */
    const bh = bughack();
    for (let x = x1; x <= x2; x++)
        for (let y = y1; y <= y2; y++) {
            const loc = map.at(x, y);
            const typ = loc?.typ ?? STONE;
            if (!(IS_WALL(typ) && typ !== DBWALL))
                continue;
            const loc_f = within_bounded_area(x, y, bh.inarea.x1, bh.inarea.y1,
                                              bh.inarea.x2, bh.inarea.y2)
                ? isWallTile : isWallOrStone;
            const locale = [
                [loc_f(x - 1, y - 1), loc_f(x - 1, y), loc_f(x - 1, y + 1)],
                [loc_f(x, y - 1), 0, loc_f(x, y + 1)],
                [loc_f(x + 1, y - 1), loc_f(x + 1, y), loc_f(x + 1, y + 1)],
            ];
            const bits = (extend_spine(locale, isWallTile(x, y - 1), 0, -1) << 3)
                | (extend_spine(locale, isWallTile(x, y + 1), 0, 1) << 2)
                | (extend_spine(locale, isWallTile(x + 1, y), 1, 0) << 1)
                | extend_spine(locale, isWallTile(x - 1, y), -1, 0);
            if (bits)
                loc.typ = spineArray[bits];
        }
}
export function wallification(x1, y1, x2, y2) {
    wall_cleanup(x1, y1, x2, y2);
    fix_wall_spines(x1, y1, x2, y2);
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
        /* C mklev.c:1891-1898 — "for mktrap_victim(), PIT is actually an exploded
         * LANDMINE": if a fragile object has been created, destroy it. */
        if (kind === PIT && breaktest(otmp)) {
            await dealloc_obj(otmp);
        } else {
            place_object(otmp, x, y);
        }
    } while (!rn2(5));
    // Victim type
    const PM_ELF = 264, PM_DWARF = 44, PM_ORC = 72, PM_GNOME = 165, PM_HUMAN = 260;
    /* PM_ARCHEOLOGIST / PM_WIZARD come from the file-level pm.generated.js
     * import (line 19) — same values (331/343) as the removed local copies;
     * diff=12 → rn2(12) matches C mklev.c:1941 */
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
                const otmp = await mksobj(rn2(4) ? 224 : 225, true, false); // TALLOW_CANDLE / WAX_CANDLE
                otmp.quan = 1;
                otmp.owt = weight(otmp);
                curse(otmp);
                place_object(otmp, x, y);
            }
            break;
        default:
            victim_mnum = PM_HUMAN;
            break;
    }
    if (victim_mnum === PM_HUMAN && rn2(25))
        victim_mnum = rn1(PM_WIZARD - PM_ARCHEOLOGIST, PM_ARCHEOLOGIST);
    const otmp = await mkcorpstat(CORPSE, null, victim_mnum, x, y, 8); // CORPSTAT_INIT
    // C mklev.c:1943 — otmp->age -= (TAINT_AGE + 1); died too long ago to safely eat.
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
    const dungeon = game.dungeons?.[game.u?.uz?.dnum ?? 0];
    const canFallThru = (game.u?.uz?.dlevel ?? 1) < (dungeon?.num_dunlevs ?? 1);
    if (is_hole(kind) && !canFallThru)
        kind = ROCKTRAP;
    const pos = { x: 0, y: 0 };
    if (!somexyspace(croom, pos))
        return;
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
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = FOUNTAIN;
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
    const loc = game.level?.at(pos.x, pos.y);
    if (loc) {
        loc.typ = SINK;
        game.level.flags.nsinks++;
    }
}
function mkaltar(croom) {
    if (!croom || croom.rtype !== OROOM)
        return;
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    const loc = game.level?.at(pos.x, pos.y);
    if (!loc)
        return;
    loc.typ = ALTAR;
    const al = rn2(A_LAWFUL + 2) - 1;
    loc.flags = Align2amask(al);
}
async function mkgrave_room(croom) {
    if (croom.rtype !== OROOM)
        return;
    const dobell = !rn2(10);
    const pos = { x: 0, y: 0 };
    if (!find_okay_roompos(croom, pos))
        return;
    make_grave(pos.x, pos.y, dobell ? 'Saved by the bell!' : null);
    if (!rn2(3)) {
        const gold = await mksobj(GOLD_PIECE, true, false);
        if (gold) {
            const depth = game.u?.uz?.dlevel ?? 1;
            gold.quan = rnd(20) + depth * rnd(5);
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
async function fill_ordinary_room(croom, bonus_items) {
    const g = game;
    if (!croom || (croom.rtype !== OROOM && croom.rtype !== THEMEROOM))
        return;
    const nsub = croom.nsubrooms | 0;
    for (let si = 0; si < nsub; si++) {
        const subroom = croom.sbrooms?.[si];
        if (!subroom)
            return;
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
            await mkcorpstat(STATUE, null, null, pos.x, pos.y, 8);
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
                    await fill_supply_chest(supply_chest, uz.dlevel ?? 1);
                skip_chests = true;
            }
        }
        if (!skip_chests && !rn2(Math.trunc(g.level.nroom * 5 / 2)) && somexyspace(croom, pos))
            await mksobj_at(rn2(3) ? LARGE_BOX : CHEST, pos.x, pos.y, true, false);
        /* mklev.c:1150-1162 */
        const absDepthAbs = Math.abs(depth_of_level(uz));
        if (!rn2(27 + 3 * absDepthAbs)) {
            const { text: engrText, pristine: engrPristine } = random_engraving();
            let gx = pos.x;
            let gy = pos.y;
            do {
                somexyspace(croom, pos);
                gx = pos.x;
                gy = pos.y;
            } while (g.level?.at(gx, gy)?.typ !== ROOM && !rn2(40));
            if (g.level?.at(gx, gy)?.typ === ROOM && engrText)
                make_engr_at(gx, gy, engrText, engrPristine, 0, MARK);
        }
    }
    skip_nonrogue: trycnt = 0;
    if (!rn2(3) && somexyspace(croom, pos)) {
        await mkobj_at(RANDOM_CLASS, pos.x, pos.y, true);
        while (!rn2(5)) {
            if (++trycnt > 100)
                break;
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
    /* C mklev.c:1442-1444 — WATER only counts when NOT on the plane of water */
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
async function mineralize(kelp_pool, kelp_moat, goldprob, gemprob, skip_lvl_checks) {
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
// ============================================================
// Level finalize topology
// ============================================================
export function get_level_extends() {
    const map = game.level;
    let xmin = 0, xmax = COLNO - 1, ymin = 0, ymax = ROWNO - 1;
    let found = false, nonwall = false;
    for (xmin = 0; !found && xmin <= COLNO - 1; xmin++) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmin, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ))
                    nonwall = true;
            }
        }
    }
    xmin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (xmax = COLNO - 1; !found && xmax >= 0; xmax--) {
        for (let y = 0; y <= ROWNO - 1; y++) {
            const typ = map.at(xmax, y)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ))
                    nonwall = true;
            }
        }
    }
    xmax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (ymin = 0; !found && ymin <= ROWNO - 1; ymin++) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymin)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ))
                    nonwall = true;
            }
        }
    }
    ymin -= (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    found = false;
    nonwall = false;
    for (ymax = ROWNO - 1; !found && ymax >= 0; ymax--) {
        for (let x = xmin; x <= xmax; x++) {
            const typ = map.at(x, ymax)?.typ ?? STONE;
            if (typ !== STONE) {
                found = true;
                if (!IS_WALL(typ))
                    nonwall = true;
            }
        }
    }
    ymax += (nonwall || !game.level?.flags?.is_maze_lev) ? 2 : 1;
    return { xmin, xmax, ymin, ymax };
}
function bound_digging() {
    const map = game.level;
    const { xmin, xmax, ymin, ymax } = get_level_extends();
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++) {
            const loc = map.at(x, y);
            if (!loc)
                continue;
            if (IS_STWALL(loc.typ) && (y <= ymin || y >= ymax || x <= xmin || x >= xmax)) {
                /* C mkmaze.c:1455-1458 — boundary walls are non-diggable;
                 * one tile beyond the level extent is also non-passwall. */
                loc.wall_info |= W_NONDIGGABLE;
                if (y < ymin || y > ymax || x < xmin || x > xmax)
                    loc.wall_info |= W_NONPASSWALL;
            }
        }
}
/* C ref: display.c:3180 — check_pos: returns 'which' if pos implies unfinished exterior */
function check_pos(x, y, which) {
    if (!isok(x, y))
        return which;
    const typ = game.level?.at(x, y)?.typ ?? STONE;
    /* IS_STWALL(typ) = typ <= DBWALL; also CORR, SCORR, SDOOR */
    if (IS_STWALL(typ) || typ === CORR || typ === SCORR || typ === SDOOR)
        return which;
    return 0;
}
/* C ref: display.c:3206 — more_than_one(x,y,a,b,c): true if >1 of a,b,c is nonzero */
function more_than_one(a, b, c) {
    return ((a && (b | c)) || (b && (a | c)) || (c && (a | b))) ? true : false;
}
/* C ref: display.c:3210 — set_twall: wall mode for T wall */
function set_twall(x1, y1, x2, y2, x3, y3) {
    const is_1 = check_pos(x1, y1, WM_T_LONG);
    const is_2 = check_pos(x2, y2, WM_T_BL);
    const is_3 = check_pos(x3, y3, WM_T_BR);
    if (more_than_one(is_1, is_2, is_3))
        return 0;
    return is_1 + is_2 + is_3;
}
/* C ref: display.c:3236 — set_wall: wall mode for horizontal or vertical wall */
function set_wall(x, y, horiz) {
    let is_1, is_2;
    if (horiz) {
        is_1 = check_pos(x, y - 1, WM_W_TOP);
        is_2 = check_pos(x, y + 1, WM_W_BOTTOM);
    }
    else {
        is_1 = check_pos(x - 1, y, WM_W_LEFT);
        is_2 = check_pos(x + 1, y, WM_W_RIGHT);
    }
    if (more_than_one(is_1, is_2, 0))
        return 0;
    return is_1 + is_2;
}
/* C ref: display.c:3256 — set_corn: wall mode for corner wall; (x4,y4) is inner */
function set_corn(x1, y1, x2, y2, x3, y3, x4, y4) {
    const is_1 = check_pos(x1, y1, 1);
    const is_2 = check_pos(x2, y2, 1);
    const is_3 = check_pos(x3, y3, 1);
    const is_4 = check_pos(x4, y4, 1);
    if (is_4)
        return WM_C_INNER;
    if (is_1 && is_2 && is_3)
        return WM_C_OUTER;
    return 0;
}
/* C ref: display.c:3288 — set_crosswall: wall mode for crosswall */
function set_crosswall(x, y) {
    const is_1 = check_pos(x - 1, y - 1, 1);
    const is_2 = check_pos(x + 1, y - 1, 1);
    const is_3 = check_pos(x + 1, y + 1, 1);
    const is_4 = check_pos(x - 1, y + 1, 1);
    let wmode = is_1 + is_2 + is_3 + is_4;
    if (wmode > 1) {
        if (is_1 && is_3 && (is_2 + is_4 === 0))
            wmode = WM_X_TLBR;
        else if (is_2 && is_4 && (is_1 + is_3 === 0))
            wmode = WM_X_BLTR;
        else
            wmode = 0;
    }
    else if (is_1)
        wmode = WM_X_TL;
    else if (is_2)
        wmode = WM_X_TR;
    else if (is_3)
        wmode = WM_X_BR;
    else if (is_4)
        wmode = WM_X_BL;
    return wmode;
}
/* C ref: display.c:3326 — xy_set_wall_state: set WM bits in flags for one tile.
 * Exported for js/vault.js invault(), which recreates the wall_info bit mask of
 * the vault wall the guard breaches (vault.c:614). */
export function xy_set_wall_state(x, y) {
    const lev = game.level?.at(x, y);
    if (!lev)
        return;
    let wmode;
    switch (lev.typ) {
        case SDOOR:
            wmode = set_wall(x, y, lev.horizontal ? 1 : 0);
            break;
        case VWALL:
            wmode = set_wall(x, y, 0);
            break;
        case HWALL:
            wmode = set_wall(x, y, 1);
            break;
        case TDWALL:
            wmode = set_twall(x, y - 1, x - 1, y + 1, x + 1, y + 1);
            break;
        case TUWALL:
            wmode = set_twall(x, y + 1, x + 1, y - 1, x - 1, y - 1);
            break;
        case TLWALL:
            wmode = set_twall(x + 1, y, x - 1, y - 1, x - 1, y + 1);
            break;
        case TRWALL:
            wmode = set_twall(x - 1, y, x + 1, y + 1, x + 1, y - 1);
            break;
        case TLCORNER:
            wmode = set_corn(x - 1, y - 1, x, y - 1, x - 1, y, x + 1, y + 1);
            break;
        case TRCORNER:
            wmode = set_corn(x, y - 1, x + 1, y - 1, x + 1, y, x - 1, y + 1);
            break;
        case BLCORNER:
            wmode = set_corn(x, y + 1, x - 1, y + 1, x - 1, y, x + 1, y - 1);
            break;
        case BRCORNER:
            wmode = set_corn(x + 1, y, x + 1, y + 1, x, y + 1, x - 1, y - 1);
            break;
        case CROSSWALL:
            wmode = set_crosswall(x, y);
            break;
        default:
            wmode = -1; /* don't set wall info */
            break;
    }
    if (wmode >= 0) {
        /* C display.c:3375 — lev->wall_info = (lev->wall_info & ~WM_MASK) | wmode
         * wall_info is #define alias for flags (rm.h:202). */
        lev.wall_info = (lev.wall_info & ~WM_MASK) | wmode;
    }
}
/* C ref: display.c:3379 — set_wall_state: scan level, set wall modes */
export function set_wall_state() {
    for (let x = 0; x < COLNO; x++)
        for (let y = 0; y < ROWNO; y++)
            xy_set_wall_state(x, y);
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
/* C ref: hacklib.c:146 — lowc: force 'c' into lowercase.
 * Accepts a char code (number) or single-char string; returns same type. */
export function lowc(c) {
    if (typeof c === 'string') {
        const code = c.charCodeAt(0);
        return ('A'.charCodeAt(0) <= code && code <= 'Z'.charCodeAt(0)) ? String.fromCharCode(code | 0o40) : c;
    }
    return ('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) ? (c | 0o40) : c;
}
/* C ref: hacklib.c:125 — digit: test if char is a digit */
export function digit(c) {
    return '0'.charCodeAt(0) <= c && c <= '9'.charCodeAt(0);
}
/* C ref: hacklib.c:139 — highc: force 'c' to uppercase.
 * Accepts a char code (number) or single-char string; returns same type. */
export function highc(c) {
    if (typeof c === 'string') {
        const code = c.charCodeAt(0);
        return ('a'.charCodeAt(0) <= code && code <= 'z'.charCodeAt(0)) ? String.fromCharCode(code & ~0o40) : c;
    }
    return ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)) ? (c & ~0o40) : c;
}
/* C ref: hacklib.c:132 — letter: is 'c' a letter (note: '@' classed as letter)
 * Accepts either a char code (number) or a single-char string. */
export function letter(c) {
    if (typeof c === 'string') c = c.charCodeAt(0);
    return (('@'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0)) || ('a'.charCodeAt(0) <= c && c <= 'z'.charCodeAt(0)));
}
/* C ref: mkobj.c:626 — clear_splitobjs: reset split object context */
export function clear_splitobjs() {
    if (!game.svc)
        game.svc = {};
    if (!game.svc.context)
        game.svc.context = {};
    game.svc.context.objsplit = { parent_oid: 0, child_oid: 0 };
}
/* C ref: hacklib.c:257 — eos: return pointer to end of string (the NUL
 * terminator). In C this is `s + strlen(s)`; the only thing callers do with it
 * is index/pointer arithmetic relative to the string base (e.g. eos(s)-N to
 * address the last N chars). The faithful JS analogue of that pointer-as-offset
 * is the string length, so eos(s) === s.length and `eos(s) - N` is the start
 * index of the trailing N-char window — exactly what BSTRCMPI/singplur_lookup
 * consume. Append-style callers (Sprintf(eos(buf), ...)) are ported per-site as
 * `buf += ...`, so eos is never used for appending here. */
export function eos(s) {
    if (s === undefined || s === null) return s;
    return String(s.length);
}
/* version of eos() which takes a const* arg and returns that result */
export function c_eos(s) {
    if (s === undefined || s === null) return s;
    return String(s.length);
}
/* C ref: hacklib.c — str_end_is: check if str ends with chkstr */
export function str_end_is(str, chkstr) {
    let clen = chkstr.length;
    if (str.length >= clen)
        return !strncmp(str.slice(Number(eos(str)) - clen), chkstr, clen);
    return false;
}

// local strncmp (from js/topten.js, not exported)
function strncmp(a, b, n) {
    if (!a || !b) return a === b ? 0 : (a ? 1 : -1);
    for (let i = 0; i < n; i++) {
        if (i >= a.length && i >= b.length) return 0;
        if (i >= a.length) return -1;
        if (i >= b.length) return 1;
        if (a.charCodeAt(i) !== b.charCodeAt(i))
            return a.charCodeAt(i) - b.charCodeAt(i);
    }
    return 0;
}

/* C ref: hacklib.c:205 — mungspaces: condense whitespace runs to single spaces,
 * tabs→spaces, drop trailing space, stop at newline (in place). */
export function mungspaces(bp) {
    let c, p, p2;
    let was_space = true;

    const arr = bp.split('');
    p = 0;
    p2 = 0;

    while (p < arr.length && arr[p] !== '\0') {
        c = arr[p];
        if (c === '\n')
            break; /* treat newline the same as end-of-string */
        if (c === '\t')
            c = ' ';
        if (c !== ' ' || !was_space)
            arr[p2++] = c;
        was_space = (c === ' ');
        p++;
    }
    if (was_space && p2 > 0)
        p2--;
    arr[p2] = '\0';
    return arr.slice(0, p2).join('');
}
/* C ref: hacklib.c:227 — trimspaces: skip leading whitespace; remove trailing whitespace, in place */
export function trimspaces(txt) {
    /* leading whitespace will remain in the buffer */
    while (txt.length > 0 && (txt[0] === ' ' || txt[0] === '\t'))
        txt = txt.substring(1);
    const end = eos(txt);
    let endIdx = txt.length;
    while (endIdx > 0 && (txt[endIdx - 1] === ' ' || txt[endIdx - 1] === '\t')) {
        endIdx--;
    }
    return txt.substring(0, endIdx);
}
/* C ref: hacklib.c:463 — xcrypt: trivial XOR obfuscation of a string.
 * Writes into buf (which callers obtain via nextobuf()); returns buf.
 * In JS we build the result string directly and ignore buf. */
export function xcrypt(str, buf) {
    let result = "";
    let bitmask = 1;
    for (let i = 0; i < str.length; i++) {
        let ch = str.charCodeAt(i);
        if (ch & (32 | 64))
            ch ^= bitmask;
        result += String.fromCharCode(ch);
        if ((bitmask <<= 1) >= 32)
            bitmask = 1;
    }
    return result;
}
/* C ref: hacklib.c:599-615 — strsubst: substitute first occurrence of orig in bp */
export function strsubst(bp, orig, replacement) {
    let idx = bp.indexOf(orig);
    if (idx >= 0) {
        let tail = bp.substring(idx + orig.length);
        bp = bp.substring(0, idx) + replacement + tail;
    }
    return bp;
}
/* C ref: hacklib.c:621-655 — strNsubst: substitute nth occurrence of orig in inoutbuf;
   n==0 => all occurrences; orig=="" => insert replacement in front of Nth char;
   replacement=="" => delete old substring; returns number of substitutions made */
export function strNsubst(inoutbuf, orig, replacement, n) {
    const BUFSZ = 256;
    let len = orig.length;
    let ocount = 0;
    let rcount = 0;
    let result = "";
    const maxout = BUFSZ - 1; /* op < &workbuf[BUFSZ-1] */
    let i = 0;

    while (i < inoutbuf.length && result.length < maxout) {
        if ((len === 0 || inoutbuf.substring(i, i + len) === orig) &&
            (++ocount === n || n === 0)) {
            /* Nth match found — copy replacement (up to buffer limit) */
            for (let ri = 0; ri < replacement.length && result.length < maxout; ri++) {
                result += replacement[ri];
            }
            rcount++;
            if (len) {
                i += len; /* skip 'orig' */
                continue;
            }
        }
        /* no match (or len==0) so retain current character */
        if (result.length < maxout) {
            result += inoutbuf[i];
        }
        i++;
    }
    if (len === 0 && n === ocount + 1) {
        /* special case: orig=="" and n==strlen(inoutbuf)+1, append */
        for (let ri = 0; ri < replacement.length && result.length < maxout; ri++) {
            result += replacement[ri];
        }
        rcount++;
    }
    /* in C, if rcount>0, Strcpy(inoutbuf, workbuf); we can't mutate the JS arg,
       but the return value is rcount */
    return rcount;
}
/* C ref: hacklib.c:339-347 — strkitten: append a character to a string (in place)
 * C writes `*p++ = c; *p = '\0';` — a single SIGNED byte followed by the NUL
 * terminator. c==0 means C writes NUL then NUL: the string is unchanged.
 * c<0 stores one signed byte (e.g. -74 -> 0xB6), read back as Latin-1. */
export function strkitten(s, c) {
    return s + (c ? String.fromCharCode(c & 0xFF) : '');
}
/* C ref: hacklib.c:387-406 — strcasecpy: overwrite string, preserving old chars' case;
   for case-insensitive editions of makeplural() and makesingular();
   src might be shorter, same length, or longer than dst */
export function strcasecpy(dst, src) {
    let result = dst;
    let dst_exhausted = 0;
    let di = 0;
    let out = "";
    for (let si = 0; si < src.length; si++) {
        let ic = src.charCodeAt(si);
        if (ic === 0) break;
        if (!dst_exhausted && di >= dst.length) {
            dst_exhausted = 1;
        }
        let oc;
        if (dst_exhausted) {
            oc = di > 0 ? out.charCodeAt(di - 1) : 0;
        } else {
            oc = dst.charCodeAt(di);
        }
        /* chrcasecpy inline */
        let nc = ic;
        if (0x61 <= oc && oc <= 0x7a) {
            if (0x41 <= nc && nc <= 0x5a)
                nc += 0x20;
        } else if (0x41 <= oc && oc <= 0x5a) {
            if (0x61 <= nc && nc <= 0x7a)
                nc -= 0x20;
        }
        out += String.fromCharCode(nc);
        di++;
    }
    return out;
}
/* C ref: hacklib.c:688-695 — ordin: return ordinal suffix for a number */
export function ordin(n) {
    const dd = n % 10;
    if (dd === 0 || dd > 3 || Math.trunc((n % 100) / 10) === 1)
        return "th";
    else if (dd === 1)
        return "st";
    else if (dd === 2)
        return "nd";
    else
        return "rd";
}
/* C ref: hacklib.c:243 — strip_newline: remove \n from end of line; remove \r too if one is there */
export function strip_newline(str) {
    const p = str.lastIndexOf('\n');
    if (p >= 0) {
        if (p > 0 && str[p - 1] === '\r') {
            return str.substring(0, p - 1);
        }
        return str.substring(0, p);
    }
    if (str === '') return ' ';
    return str;
}
/* C ref: hacklib.c:532 — visctrl: return string representation of a non-printable
 * char. C rotates a static buffer pool so callers can hold several results; JS
 * strings are values so we return directly (matches strip_newline/eos idiom). */
export function visctrl(c) {
    let ccc = '';
    if ((c & 0x80) !== 0) {
        ccc += 'M';
        ccc += '-';
    }
    c = c & 0x7f;
    if (c < 0x20) {
        ccc += '^';
        ccc += String.fromCharCode(c | 0x40);
    } else if (c === 0x7f) {
        ccc += '^';
        ccc += String.fromCharCode(c & ~0x40);
    } else {
        ccc += String.fromCharCode(c);
    }
    return ccc;
}
/* C ref: mon.c:5551-5568 — egg_type_from_parent: convert parent monster type to
 * the egg type it lays. BREEDER_EGG macro expands to (!rn2(77)), so !BREEDER_EGG
 * is !(!rn2(77)) i.e. (rn2(77) != 0) — truthy when rn2(77) returned nonzero. */
export function egg_type_from_parent(mnum, force_ordinary) {
    if (force_ordinary || rn2(77)) {
        if (mnum === PM_QUEEN_BEE)
            mnum = PM_KILLER_BEE;
        else if (mnum === PM_WINGED_GARGOYLE)
            mnum = PM_GARGOYLE;
    }
    return mnum;
}
/* C ref: mon.c:516-528 — pm_to_cham: return monster index if chameleon, or NON_PM if not */
export function pm_to_cham(mndx) {
    let mcham = NON_PM;

    /*
     * As of 3.6.0 we just check M2_SHAPESHIFTER instead of having a
     * big switch statement with hardcoded shapeshifter types here.
     */
    if (ismnum(mndx) && (MONS_ROWS[mndx][7] & M2_SHAPESHIFTER) !== 0)
        mcham = mndx;
    return mcham;
}

/* C ref: hacklib.c:482-490 — onlyspace: is a string entirely whitespace? */
export function onlyspace(s) {
    for (let i = 0; i < s.length; i++)
        if (s[i] !== ' ' && s[i] !== '\t')
            return false;
    return true;
}

/* C ref: hacklib.c:153-162 — lcase: convert a string into all lowercase */
export function lcase(s) {
    const arr = s.split('');
    for (let i = 0; i < arr.length; i++) {
        const c = arr[i].charCodeAt(0);
        if ('A'.charCodeAt(0) <= c && c <= 'Z'.charCodeAt(0))
            arr[i] = String.fromCharCode(c | 0o40);
    }
    return arr.join('');
}

/* C ref: hacklib.c:177-183 — upstart: convert first character of a string to uppercase */
export function upstart(s) {
    if (s) {
        const arr = s.split('');
        arr[0] = String.fromCharCode(highc(arr[0].charCodeAt(0)));
        return arr.join('');
    }
    return s;
}

/* C ref: hacklib.c:186-202 — upwords: capitalize first letter of every word in a string (in place) */
export function upwords(s) {
    let space = true;
    const arr = s.split('');
    for (let i = 0; i < arr.length; i++) {
        const c = arr[i].charCodeAt(0);
        if (c === ' '.charCodeAt(0)) {
            space = true;
        } else if (space && letter(c)) {
            arr[i] = String.fromCharCode(highc(c));
            space = false;
        } else {
            space = false;
        }
    }
    return arr.join('');
}

/* C ref: mon.c:4460-4480 alloc_itermonarr(unsigned count)
 * Manages the itermonarr buffer used for safe iteration over all monsters.
 * Allocates, reallocates, or frees itermonarr based on the requested count.
 */
export function alloc_itermonarr(count) {
    /* if count is 0 or bigger than itermonsiz or much smaller than
       itermonsiz, release itermonarr (and reset itermonsiz to 0) */
    if (!count || count > itermonsiz || count + 40 < itermonsiz) {
        if (itermonarr)
            itermonarr = null;
        itermonsiz = 0;
    }
    /* when count is more than itermonsiz (including when that just
       got reset to 0), allocate a new instance of itermonarr;
       implies that count is greater than 0 */
    if (count > itermonsiz) {
        /* overallocate to reduce free/alloc-again thrashing when the
           number of monsters varies from turn to turn */
        itermonsiz = count + 20;
        itermonarr = new Array(itermonsiz);
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

/* C ref: mon.c:1945-1962 — can_touch_safely: can monster touch object safely?
 * Returns boolean: true if can safely touch, false otherwise.
 * No RNG consumption in this function.
 *
 * Macro implementations:
 * - touch_petrifies(ptr): ptr == &mons[PM_COCKATRICE] || ptr == &mons[PM_CHICKATRICE]
 * - is_rider(ptr): ptr == &mons[PM_DEATH_R] || ptr == &mons[PM_FAMINE] || ptr == &mons[PM_PESTILENCE]
 * - resists_ston(mon): Resists_Elem(mon, STONE_RES) — NOT YET PORTED, stub with throw
 * - touch_artifact(otmp, mtmp): C function — NOT YET PORTED, stub with throw
 * - is_covetous(ptr): ptr->mflags3 & M3_COVETOUS — NOT YET PORTED, stub with throw */
export async function can_touch_safely(mtmp, otmp) {
    const otyp = otmp.otyp | 0;
    const mdat = mtmp.data;
    const corpsenm = otmp.corpsenm | 0;

    /* First check: CORPSE && touch_petrifies && !wearing gloves && !resists stone */
    if (otyp === CORPSE) {
        /* touch_petrifies(ptr): check if ptr is &mons[PM_COCKATRICE] or &mons[PM_CHICKATRICE] */
        const petrifies = corpsenm === PM_COCKATRICE || corpsenm === PM_CHICKATRICE;

        if (petrifies && !(mtmp.misc_worn_check & W_ARMG)
            && !resists_ston(mtmp))
            return false;

        /* is_rider(ptr): check if ptr is &mons[PM_DEATH_R], &mons[PM_FAMINE], or &mons[PM_PESTILENCE] */
        const isRider = corpsenm === PM_DEATH_R || corpsenm === PM_FAMINE || corpsenm === PM_PESTILENCE;
        if (isRider)
            return false;
    }

    /* Second check: SILVER material && mon_hates_silver && (not BELL_OF_OPENING or !is_covetous) */
    /* objects[otyp].oc_material is the RUNTIME value: o_init.c:141-146 swaps it with
     * the description when shuffling whole classes (wands, rings, ...), so a wand
     * whose appearance is "silver" is silver whatever its otyp. */
    const _ocMat = (game._objMaterials && game._objMaterials[otyp] != null)
        ? (game._objMaterials[otyp] | 0) : MKOBJ_OC_MATERIAL[otyp | 0];
    if (_ocMat === SILVER_MATERIAL && mon_hates_silver(mtmp)) {
        if (otyp !== BELL_OF_OPENING
            || (((mdat?.mflags3 | 0) & 0x001f) === 0)) {
            return false;
        }
    }

    /* Third check: touch_artifact */
    if (!await touch_artifact(otmp, mtmp))
        return false;

    return true;
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

export async function touch_artifact(otmp, mtmp) {
    const arti = (otmp && (otmp.oartifact | 0)) || 0;
    /* C artifact.c:910-915 get_artifact(obj); ART_NONARTIFACT → return 1. */
    if (!arti) return true;
    const oart = ARTI_PROPS[arti];
    if (!oart) return true;

    /* C artifact.c:917 yours = (mon == &gy.youmonst).  gy.youmonst.m_id is 1
     * and next_ident() reserves it, the same convention js/trap.js and
     * hideunder above already use. */
    if (mtmp === game.youmonst || (mtmp && (mtmp.m_id | 0) === 1))
        return !!await touch_artifact_youmonst(otmp);

    return touch_artifact_mon(otmp, mtmp);
}

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

    let badclass, badalign;
    /* C mondata.h is_covetous(ptr): ptr->mflags3 & M3_COVETOUS (0x001f);
     * is_mplayer(ptr): the PM_ARCHEOLOGIST..PM_WIZARD player-monster block. */
    const covetous = ((ptr.mflags3 | 0) & 0x001f) !== 0;
    const mplayer = is_mplayer_nc(mtmp.data_mndx | 0);
    if (!covetous && !mplayer) {
        /* C artifact.c:930-933 */
        badclass = self_willed && oart.role && arti !== ART_EXCALIBUR_MK;
        badalign = (oart.spfx & SPFX_RESTR_MK) !== 0
                   && oart.al !== A_NONE_MK
                   && (oart.al !== mon_aligntyp(mtmp));
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
        return (mtmp.data_mndx | 0) === mtype;
    if (spfx & SPFX_DCLAS_MK)
        return mtype === (ptr.mlet | 0);
    if (spfx & SPFX_DFLAG1_MK)
        return ((ptr.mflags1 | 0) & mtype) !== 0;
    if (spfx & SPFX_DFLAG2_MK)
        return ((ptr.mflags2 | 0) & mtype) !== 0;
    if (spfx & SPFX_DALIGN_MK) {
        const ma = ptr.maligntyp | 0;
        return (ma === A_NONE_MK) || (Math.sign(ma) !== oart.al);
    }
    return false;
}
export function datamodel(retidx) {
    const MAX_D = 5;
    /* Static dm array from hacklib.c:1035-1044 */
    const dm = [
        { sz: [2, 4, 8, 8, 8], datamodel: "", dmplatform: "" },
        { sz: [2, 4, 4, 8, 4], datamodel: "ILP32LL64", dmplatform: "x86 32-bit" },
        { sz: [2, 4, 4, 8, 8], datamodel: "IL32LLP64", dmplatform: "Windows x64 64-bit" },
        { sz: [2, 4, 8, 8, 8], datamodel: "I32LP64", dmplatform: "Unix 64-bit" },
        { sz: [2, 8, 8, 8, 8], datamodel: "ILP64", dmplatform: "Unix ILP64" },
    ];
    const unknown = "Unknown";

    /* SIZE(dm) macro: (int)(sizeof(dm) / sizeof(dm[0])) */
    const dm_size = dm.length;

    for (let i = 1; i < dm_size; ++i) {
        let matchcount = 0;
        for (let j = 0; j < MAX_D; ++j) {
            if (dm[0].sz[j] === dm[i].sz[j])
                ++matchcount;
        }
        if (matchcount === MAX_D) {
            return (retidx === 0) ? dm[i].datamodel : dm[i].dmplatform;
        }
    }
    return unknown;
}

export function canseemon_unported(m) { return canseemon(m); }
export function pline_mon_unported(m, fmt, ...args) {
    return pline_mon(m, fmt, ...args);
}
export function Monnam_unported(m) { return Monnam_wm(m); }
/* C ref: mon.c:4311-4320 — wake_msg: print message when monster wakes up.
 * void wake_msg(struct monst *mtmp, boolean interesting)
 *
 * Prints a pline message if the monster is sleeping and can be seen by the player.
 * The message includes the monster's name and may add "!" or "." depending on
 * whether the wake-up is interesting, plus " It's alive!" for flesh golems.
 * These functions are not yet ported; they're stubbed here but won't execute
 * in recorded test cases (which have msleeping=0).
 */
export function wake_msg(mtmp, interesting) {
    if (mtmp.msleeping && canseemon(mtmp)) {
        const pmidx = mtmp?.data?.pmidx;
        const mndx = (typeof pmidx === 'number') ? (pmidx | 0)
            : (mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
        const suffix = mndx === PM_FLESH_GOLEM_WM() ? " It's alive!" : "";
        const punct = interesting ? "!" : ".";
        pline(Monnam_wm(mtmp) + " wakes up" + punct + suffix);
    }
}
let _pmFleshGolem = null;
function PM_FLESH_GOLEM_WM() {
    if (_pmFleshGolem === null) {
        _pmFleshGolem = -1;
        for (let i = 0; i < 400; i++) {
            const t = permonstTemplate(i);
            if (!t) continue;
            if ((t.pmnames || []).some((n) => n === 'flesh golem')) { _pmFleshGolem = i; break; }
        }
    }
    return _pmFleshGolem;
}
/* C do_name.c:1367 Monnam(mon) — upstart(mon_nam(mon)).  mon_nam lives in
 * js/uhitm.js, from which this file already imports m_at, so the edge exists;
 * js/mcastu.js's Monnam is not importable here because mcastu imports
 * wake_nearto FROM this file. */
function Monnam_wm(mon) {
    const s = mon_nam_wm(mon);
    return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/* C ref: mon.c:4392-4395 — wake_nearto: wake monsters near a location
 * void wake_nearto(coordxy x, coordxy y, int distance)
 *
 * Simple wrapper around wake_nearto_core, passing FALSE for petcall.
 */
export function wake_nearto(x, y, distance) {
    wake_nearto_core(x, y, distance, false);
}

/* C mon.c:4357-4368 wake_nearby(petcall).  This is deliberately separate
 * from wake_nearto(): a whistle's pet call also timestamps non-minion pets
 * and clears their movement tracks. */
export function wake_nearby(petcall) {
    const u = game.u || {};
    wake_nearto_core(u.ux | 0, u.uy | 0, (u.ulevel | 0) * 20, !!petcall);
}

function wake_nearto_core(x, y, distance, petcall) {
    /* C monst.h:179 STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU; both are
     * already imported from js/const.js at the top of this file. */
    const STRAT_WAITMASK_WNC = (STRAT_CLOSE | STRAT_WAITFORU) >>> 0;
    const G_UNIQ_WNC = 0x1000;             /* C monflag.h G_UNIQ (geno bit) */
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (distance === 0 || dist2(mtmp.mx | 0, mtmp.my | 0, x | 0, y | 0) < distance) {
            wake_msg(mtmp, false);
            mtmp.msleeping = 0;
            const geno = (mtmp.data ? (mtmp.data.geno | 0) : (monGeno(mtmp.mnum | 0) | 0));
            if (!(geno & G_UNIQ_WNC))
                mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK_WNC;
            if (!game.context?.mon_moving && petcall && mtmp.mtame) {
                if (!mtmp.isminion)
                    ((mtmp.mextra ||= {}).edog ||= {}).whistletime = game.moves | 0;
                mon_track_clear(mtmp);
            }
        }
    }
    disturb_buried_zombies(x | 0, y | 0);
}

/* C ref: mon.c:4111-4122 — m_respond: handle monster special responses
 * void m_respond(struct monst *mtmp)
 *
 * Handles special abilities and behaviors when a monster responds:
 * - If it's a shrieker and within 1 step of the hero, call m_respond_shrieker
 * - If it's a medusa and can see the hero, call m_respond_medusa
 * - If it's an erinys, not peaceful, and can see the hero, call aggravate
 */
export async function m_respond(mtmp) {
    const MS_SHRIEK = 18; /* C monflag.h ms_sounds */
    const couldsee_impl = couldsee;
    const um_dist_impl = um_dist;
    const PM_MEDUSA_CONST = 284; /* pm.generated.js PM_MEDUSA = 284 */
    const PM_ERINYS_CONST = 292; /* pm.generated.js PM_ERINYS = 292 */

    /* First check: shrieker that's close to the hero */
    if ((mtmp.data.msound | 0) === MS_SHRIEK && !um_dist_impl(mtmp.mx | 0, mtmp.my | 0, 1)) {
        await m_respond_shrieker(mtmp);
    }

    /* Second check: medusa that can see the hero */
    if ((mtmp.data.pmidx | 0) === PM_MEDUSA_CONST && couldsee_impl(mtmp.mx | 0, mtmp.my | 0)) {
        await m_respond_medusa(mtmp);
    }

    /* Third check: erinys that can see the hero (Erinyes will inform surrounding monsters of your crimes) */
    if ((mtmp.data.pmidx | 0) === PM_ERINYS_CONST && !mtmp.mpeaceful && m_canseeu(mtmp)) {
        aggravate_stub();
    }
}

/* Unported helper for m_respond shrieker case */
async function m_respond_shrieker(mtmp) {
    if (!game.u?. deaf)
        pline(`${Monnam(mtmp)} shrieks.`);
    /* C: !rn2(10) makemon(rn2(13) ? random : purple/baby-purple,0,0). */
    if (!rn2(10)) {
        await makemon(rn2(13) ? null : permonstTemplate(PM_BABY_PURPLE_WORM), 0, 0, MM_NOMSG);
    }
    aggravate_real();
}

/* Unported helper for m_respond medusa case */
async function m_respond_medusa(mtmp) {
    const attks = mon_mattk_raw(mtmp.data?.pmidx ?? mtmp.mnum) || [];
    const raw = attks.find(a => a && (a[0] | 0) === 15);
    if (!raw)
        return;
    const mattk = { aatyp: raw[0] | 0, adtyp: raw[1] | 0,
                    damn: raw[2] | 0, damd: raw[3] | 0 };
    const { gazemu } = await import('./mhitu.js');
    return gazemu(mtmp, mattk);
}

/* Unported helper: monster can see hero */
/* C vision.h:45-52 m_canseeu(m) —
 *     (!Invis || perceives(m->data)) && !Underwater && couldsee(m->mx, m->my)
 * with Invis = (HInvis || EInvis) && !BInvis and perceives = M1_SEE_INVIS.
 * This was `throw new Error('not yet ported: m_canseeu')`, which is reached by
 * adj_erinys (:11968) and by peacefuls_respond below.  js/mhitm.js:176 already
 * carries this exact body, unexported; the macro is four lines, so it is
 * written out against vision.h rather than routed through a new export edge
 * (mhitm.js imports wake_nearto FROM this file). */
function m_canseeu(mtmp) {
    const u = game.u || {};
    const ip = u.uprops?.[MK_INVIS];
    const Invis = !!(ip && (ip.intrinsic || ip.extrinsic) && !(ip.blocked | 0));
    const ptr = mtmp.data || permonstTemplate((mtmp.mnum ?? mtmp.mndx ?? -1) | 0);
    const perceives = !!(((ptr && ptr.mflags1) | 0) & 0x01000000 /* M1_SEE_INVIS */);
    return (!Invis || perceives) && !u.uinwater && couldsee(mtmp.mx | 0, mtmp.my | 0);
}

/* wizard.c:494 — route the rare Erinys aggravation path to the canonical body. */
export function aggravate_stub() { return aggravate_real(); }

/* C ref: mon.c:6015-6045 — see_nearby_monsters: show nearby monsters to the hero
 * void see_nearby_monsters(void)
 *
 * Iterates over the 3x3 grid centered on the hero. For each monster found,
 * if the hero can see it (or sense it when hidden), record the hit position
 * and call see_monster_closeup to display its close-up info.
 */
export function see_nearby_monsters() {
    /* C: Hallucination, Blind, Blind_telepat are flags/bitfields */
    const Hallucination = _Hallucination_mk();
    const Blind = _Blind_mk();
    const Blind_telepat = !!(game.u?.uprops?.[MK_TELEPAT]?.intrinsic
        || game.u?.uprops?.[MK_TELEPAT]?.extrinsic);

    if (Hallucination || (Blind && !Blind_telepat))
        return;

    const ux = game.u.ux | 0;
    const uy = game.u.uy | 0;
    const M_AP_MONSTER = 3; /* C decl.h: M_AP_MONSTER */

    for (let x = ux - 1; x <= ux + 1; x++) {
        for (let y = uy - 1; y <= uy + 1; y++) {
            if (!isok(x, y))
                continue;

            /* m_at(x, y): scan fmon list for monster at (x, y) */
            let mtmp = null;
            for (let m = game.fmon; m; m = m.nmon) {
                if ((m.mhp | 0) < 1) continue; /* DEADMONSTER — C m_at reads the grid, which m_detach cleared */
                if (m.mx === x && m.my === y) {
                    mtmp = m;
                    break;
                }
            }
            if (!mtmp)
                continue;

            /* C mon.c:6031 mndx = monsndx(mtmp->data).  mondata.h:10 defines
             * `#define monsndx(ptr) ((ptr)->pmidx)` — `struct permonst` has
             * NO `mndx` member, so the field to read is `pmidx`, the same
             * spelling the sibling see_monster_closeup below (and mklev.js
             * :8626/:8631) already uses on an fmon-walked monster. */
            let mndx = mtmp.data.pmidx | 0;
            if ((mtmp.m_ap_type | 0) === M_AP_MONSTER)
                mndx = mtmp.mappearance | 0;

            /* skip closeup handling if this mon type has already been done */
            if (game.mvitals?.[mndx]?.seen_close)
                continue;

            /* disguised mimics pass canseemon(); undetected hiders don't */
            if (canseemon(mtmp) || (mtmp.mundetected && sensemon(mtmp))) {
                if (!game.gb) game.gb = {};
                if (!game.gb.bhitpos) game.gb.bhitpos = {};
                game.gb.bhitpos.x = x;
                game.gb.bhitpos.y = y;
                if (!game.gn) game.gn = {};
                game.gn.notonhead = (x !== mtmp.mx || y !== mtmp.my);
                see_monster_closeup(mtmp, false);
            }
        }
    }
}

/* C ref: mon.c:5958-6013 — see_monster_closeup: mark individual monster type
 * as seen from close-up, if we haven't seen it nearby before.
 * void see_monster_closeup(struct monst *mtmp, boolean photo) */
export function see_monster_closeup(mtmp, photo) {
    const Hallucination = _Hallucination_mk();
    const Blind = _Blind_mk();
    const Blind_telepat = !!(game.u?.uprops?.[MK_TELEPAT]?.intrinsic
        || game.u?.uprops?.[MK_TELEPAT]?.extrinsic);

    if (Hallucination || (Blind && !Blind_telepat))
        return;

    const M_AP_MONSTER = 3;
    const M_AP_NOTHING = 0;
    const PM_LONG_WORM = 114;
    const PM_LONG_WORM_TAIL = 330;
    const PM_TOURIST = 341;

    let mndx = mtmp.data.pmidx | 0;
    if ((mtmp.m_ap_type | 0) === M_AP_MONSTER && !sensemon(mtmp))
        mndx = mtmp.mappearance | 0;
    if (mndx === PM_LONG_WORM && game.gn?.notonhead)
        mndx = PM_LONG_WORM_TAIL;

    if (!game.mvitals) game.mvitals = {};
    if (!game.mvitals[mndx]) game.mvitals[mndx] = {};
    if (!game.mvitals[mndx].seen_close) {
        game.mvitals[mndx].seen_close = 1;
        if (!game.context) game.context = {};
        if (!game.context.lifelist) game.context.lifelist = {};
        game.context.lifelist.total_seen_upclose = (game.context.lifelist.total_seen_upclose | 0) + 1;
    }

    /* hallucinatory monsters don't reach here--they're not recorded;
       being able to see invisible doesn't make invisible monsters show up
       on photos; likewise, telepathy allows hero to see hidden monsters
       but doesn't cause them to appear on photos */
    if (photo && !mtmp.minvis && !mtmp.mundetected
        && ((mtmp.m_ap_type | 0) === M_AP_NOTHING
            || (mtmp.m_ap_type | 0) === M_AP_MONSTER)) {
        if ((mtmp.m_ap_type | 0) === M_AP_MONSTER) /* cloned Wizard of Yendor */
            mndx = mtmp.mappearance | 0;

        if (!game.mvitals) game.mvitals = {};
        if (!game.mvitals[mndx]) game.mvitals[mndx] = {};
        if (!game.mvitals[mndx].photographed) {
            game.mvitals[mndx].photographed = 1;
            if (!game.context) game.context = {};
            if (!game.context.lifelist) game.context.lifelist = {};
            game.context.lifelist.total_photographed = (game.context.lifelist.total_photographed | 0) + 1;

            /* tourist earns points (toward EXP but not final score) for
               the first instance of each type of monster photographed;
               worm tail can be photographed but yields no EXP bonus */
            /* C you.h:247 Role_if(X) := (gu.urole.mnum == (X)).  `malenum` is
             * not a field js/roles.js:595 writes, so this test was dead. */
            if ((game.urole?.mnum ?? -1) === PM_TOURIST
                /* suppress extra points for photographing the pet that hero
                   started with (unless it has changed shape due to growing
                   up or being polymorphed) */
                && (mtmp.m_id !== game.context.startingpet_mid
                    || mndx !== game.context.startingpet_typ)
                /* monsndx() check covers worm tail and also disguised
                   Wizard of Yendor; experienced() won't yield a reasonable
                   value for those */
                && mndx === (mtmp.data.pmidx | 0)) {
                let tmp = experience(mtmp, 0);
                exp_log("owner=photo move=%ld mndx=%d level=%d exp=%ld gain=%d",
                        game.moves, mndx, game.u.ulevel, game.u.uexp, tmp);
                more_experienced(tmp, 0);
                newexplevel();
            }
        }
    }
}

export function hideunder(mtmp) {
    const M1_CONCEAL = 0x00000080; /* monflag.h */
    const S_EEL = 57;
    const is_u = mtmp === game.youmonst;
    const x = is_u ? game.u.ux : mtmp.mx;
    const y = is_u ? game.u.uy : mtmp.my;
    const seeit = game.in_mklev ? 0 : canseemon(mtmp);
    let undetected = false;
    /* C mon.c:4729-4731 — `const char *seenmon = 0, *seenobj = 0, *locomo = 0;` */
    let seenmon = null, seenobj = null, locomo = null;

    const isTrapped = is_u ? !!game.u.utrap : !!mtmp.mtrapped;
    let onNonPitTrap = false;
    if (!isTrapped) {
        const t = t_at(x, y);
        onNonPitTrap = !!(t && !is_pit(t.ttyp | 0));
    }

    if (mtmp === game.u.ustuck) {
        /* undetected stays FALSE: can't hide while holding/held by hero */
    } else if (isTrapped || onNonPitTrap) {
        /* undetected stays FALSE: trapped, or on/in/under a non-pit trap */
    } else if ((mtmp.data.mlet | 0) === S_EEL) {
        /* aquatic creatures only hide under water, not under objects */
        undetected = dbridge_is_pool(x, y) && !Is_waterlevel(game.u.uz)
            && (!game.u.uinwater || !couldsee(x, y));
        /* C mon.c:4749-4752 — assigned on `seeit` alone, NOT on `undetected`. */
        if (seeit) {
            seenobj = 'the water';
            locomo = 'dive';
        }
    } else if (((mtmp.data.mflags1 | 0) & M1_CONCEAL) !== 0) {
        /* hides_under(mtmp->data): hider-underers only hide under objects */
        let otmp = game.level?.levelObjects?.[x]?.[y] ?? null;
        if (otmp
            && can_hide_under_obj(otmp)
            && (!mtmp.mtame || !cursed_object_at_hu(x, y))
            && !is_pool_or_lava(x, y)) {
            /* C mon.c:4763-4764 — seenobj names the object at the TOP of the
             * pile, before the cockatrice-corpse skip below advances otmp. */
            if (seeit)
                seenobj = ansimpleoname(otmp);
            /* most monsters won't hide under a cockatrice/chickatrice
               corpse but can hide under a pile with more than just those */
            if (!resists_ston(mtmp)) {
                while (otmp && (otmp.otyp | 0) === CORPSE
                       && ((otmp.corpsenm | 0) === PM_COCKATRICE
                           || (otmp.corpsenm | 0) === PM_CHICKATRICE))
                    otmp = otmp.nexthere ?? null;
            }
            if (otmp) undetected = true;
        }
    }

    let oldundetctd;
    if (is_u) {
        oldundetctd = (game.u.uundetected | 0) !== 0;
        game.u.uundetected = undetected ? 1 : 0;
    } else {
        /* C mon.c:4782-4783 — computed on `seeit` alone, so a visible monster
         * that FAILS to hide still pays y_monnam()'s cost (which under
         * Hallucination draws RNG through rndmonnam()). */
        if (typeof process !== 'undefined' && ENV?.FF_HIDE_TRACE === '1')
            pushRngLogEntry(`^hide_trace[moves=${game.moves | 0} id=${mtmp.m_id | 0} xy=${mtmp.mx | 0},${mtmp.my | 0} seeit=${seeit ? 1 : 0} cansee=${canseemon(mtmp) ? 1 : 0} undetected=${undetected ? 1 : 0} hallu=${game.u?.uprops?.[MK_HALLUC]?.intrinsic ? 1 : 0}]`);
        if (seeit)
            seenmon = y_monnam(mtmp);
        /* C's boolean field is zero-initialized.  An absent JS field likewise
         * means false; `undefined !== 0` incorrectly treated a never-hidden
         * monster as hidden and caused an extra repaint when hideunder() ran. */
        oldundetctd = (mtmp.mundetected | 0) !== 0;
        mtmp.mundetected = undetected ? 1 : 0;
        /* C mon.c:4787-4796 — "the 'you see' message won't be shown for monster
         * hiding during level creation because 'seeit' will be 0 so 'seenmon'
         * and 'seenobj' will be Null". */
        if (undetected && seenmon && seenobj) {
            if (!locomo)
                locomo = locomotion(mtmp.data, 'hide');
            set_msg_xy(mtmp.mx, mtmp.my); /* pline() will reset this */
            You_see(`${seenmon} ${locomo} under ${seenobj}.`);
            /* C mon.c:4794-4795 — read back by mhitm.c:342-345 when the hider
             * is later revealed ("%s emerges from hiding."). */
            if (!game.iflags) game.iflags = {};
            game.iflags.last_msg = PLNMSG_HIDE_UNDER;
            if (!game.l) game.l = {};
            game.l.last_hider = mtmp.m_id;
        }
    }
    if (undetected !== oldundetctd) newsym(x, y);
    return undetected;
}

/* C ref: mon.c:4795-4817 — called when returning to a previously visited level */
export async function hide_monst(mon) {
    const M1_HIDE = 0x00000100; /* C monflag.h:93 (0x10 is M1_CLING) */
    const M1_CONCEAL = 0x00000080;
    const S_EEL = 57;
    const S_MIMIC = 13;
    const IN_SIGHT = 0x2;
    const COULD_SEE = 0x1;

    function is_hider(ptr) {
        return ((ptr.mflags1 | 0) & M1_HIDE) !== 0;
    }
    function hides_under(ptr) {
        return ((ptr.mflags1 | 0) & M1_CONCEAL) !== 0;
    }

    const hider_under = hides_under(mon.data) || (mon.data.mlet | 0) === S_EEL;

    if ((is_hider(mon.data) || hider_under)
        && !(mon.mundetected || (mon.m_ap_type | 0))) {
        const x = mon.mx | 0, y = mon.my | 0;
        const save_viz = game.viz_array[y][x];

        /* override vision, forcing hero to be unable to see monster's spot */
        game.viz_array[y][x] &= ~(IN_SIGHT | COULD_SEE);
        if (is_hider(mon.data))
            await restrap(mon);
        /* try again if mimic missed its 1/3 chance to hide */
        if ((mon.data.mlet | 0) === S_MIMIC && !(mon.m_ap_type | 0))
            await restrap(mon);
        game.viz_array[y][x] = save_viz;
        if (hider_under)
            hideunder(mon);
    }
}

/* C ref: mon.c:4660-4693 restrap(mtmp) — "unwatched hiders may hide again;
 * if so, returns True".
 *
 *   if (mtmp->mcan || M_AP_TYPE(mtmp) || cansee(mtmp->mx, mtmp->my)
 *       || rn2(3) || mtmp == u.ustuck
 *       || (mtmp->mtrapped && (t = t_at(mtmp->mx, mtmp->my)) != 0
 *           && !is_pit(t->ttyp))
 *       || (ceiling_hider(mtmp->data) && !has_ceiling(&u.uz))
 *       || (sensemon(mtmp) && m_next2u(mtmp)))
 *       return FALSE;
 *
 * The `||` chain short-circuits left to right, so rn2(3) is the FOURTH term:
 * it fires only for a non-cancelled, non-disguised, unseen hider, and it is
 * skipped entirely for anything the hero can see. That ordering is the RNG
 * contract — the terms AFTER rn2(3) consume nothing, so they change only the
 * return value (whether the monster forfeits its move), never the stream.
 *
 * monst.h:73     M_AP_TYPE(m)      = m->m_ap_type & M_AP_TYPMASK
 * you.h:560      m_next2u(m)       = distu(m->mx, m->my) <= 2
 * mondata.h:43   ceiling_hider(p)  = is_hider(p) && ((is_clinger(p)
 *                                    && p->mlet != S_MIMIC) || is_flyer(p))
 * dungeon.c:1690 has_ceiling(lev)  = !(In_endgame(lev) && !Is_earthlevel(lev))
 */
async function restrap(mtmp) {
    if (!mtmp) return false;
    const M_AP_TYPMASK_RS = 0x3;     /* monst.h M_AP_TYPMASK */
    const M1_FLY_RS = 0x00000001;    /* monflag.h:85 */
    const M1_CLING_RS = 0x00000010;  /* monflag.h:89 */
    const M1_HIDE_RS = 0x00000100;   /* monflag.h:93 */
    const S_MIMIC_RS = 13;
    const data = mtmp.data || {};
    const mf1 = (data.mflags1 | 0);

    if (mtmp.mcan | 0) return false;
    if (((mtmp.m_ap_type | 0) & M_AP_TYPMASK_RS) !== 0) return false;
    if (cansee(mtmp.mx | 0, mtmp.my | 0)) return false;
    if (ENV.FF_TURNTRACE === '1')
        pushRngLogEntry(`^restrap_js[moves=${game.moves | 0} id=${mtmp.m_id | 0}]`);
    if (rn2(3)) return false;
    if (game.u && mtmp === game.u.ustuck) return false;
    if (mtmp.mtrapped | 0) {
        const t = t_at(mtmp.mx | 0, mtmp.my | 0);
        if (t && !is_pit(t.ttyp | 0)) return false;
    }
    const is_hider_rs = (mf1 & M1_HIDE_RS) !== 0;
    const ceiling_hider = is_hider_rs
        && ((((mf1 & M1_CLING_RS) !== 0) && (data.mlet | 0) !== S_MIMIC_RS)
            || (mf1 & M1_FLY_RS) !== 0);
    if (ceiling_hider && !has_ceiling_rs()) return false;
    if (sensemon(mtmp) && distu_rs(mtmp.mx | 0, mtmp.my | 0) <= 2) return false;

    if ((data.mlet | 0) === S_MIMIC_RS) {
        /* The mimic needs to be awake to disguise itself as something else. */
        if ((mtmp.msleeping | 0) || (mtmp.mfrozen | 0))
            return false;
        await set_mimic_sym(mtmp);
        return true;
    } else if ((game.level?.at?.(mtmp.mx | 0, mtmp.my | 0)?.typ | 0) === ROOM) {
        mtmp.mundetected = 1;
        return true;
    }
    return false;
}
function has_ceiling_rs() {
    const uz = game.u?.uz;
    if (!uz) return true;
    return !(In_endgame(uz) && !Is_earthlevel_rs(uz));
}
function Is_earthlevel_rs(lev) {
    return Is_earthlevel(lev);
}
/* C monmove.c:177-180 distu(x, y) — dx*dx + dy*dy from the hero. */
function distu_rs(x, y) {
    const u = game.u;
    if (!u) return 0;
    const dx = (x | 0) - (u.ux | 0), dy = (y | 0) - (u.uy | 0);
    return (dx * dx) + (dy * dy);
}
export { restrap };

/* C ref: mon.c:4687-4711 — maybe_unhide_at(x, y): if a monster (or the hero)
 * at (x,y) is undetected and the terrain/object situation no longer
 * supports hiding there, call hideunder() to try to re-hide.
 * void maybe_unhide_at(coordxy x, coordxy y) */
export function maybe_unhide_at(x, y) {
    const M1_CONCEAL = 0x00000080; /* monflag.h */
    const S_EEL = 57;

    let mtmp = null;
    let undetected = false;
    let trapped = false;

    /* C: mtmp = m_at(x, y) — scan fmon chain for a live monster at (x, y). */
    for (let m = game.fmon; m; m = m.nmon) {
        if ((m.mhp | 0) > 0 && m.mx === x && m.my === y) {
            mtmp = m;
            break;
        }
    }
    if (mtmp !== null) {
        undetected = !!mtmp.mundetected;
        trapped = !!mtmp.mtrapped;
    } else if (u_at(x, y)) {
        mtmp = game.youmonst;
        undetected = !!game.u.uundetected;
        trapped = !!game.u.utrap;
    } else {
        return;
    }

    /* C mon.c:4704-4710. The `mtmp->data` dereferences sit INSIDE C's `&&`
     * chain, so C evaluates them only once `undetected` is true; hoisting
     * them above the `if` (as this port used to) made a *lazy* read eager and
     * threw on records where C never looks at ->data at all (that eager read
     * is what forced the third, reordered copy in js/cmd.js). Written here as
     * the same short-circuiting expression C has.
     *   hides_under(ptr) = ((ptr)->mflags1 & M1_CONCEAL) != 0  [mondata.h:35]
     *   OBJ_AT(x,y)      = svl.level.objects[x][y] != 0 */
    if (undetected
        && (((((mtmp.data.mflags1 | 0) & M1_CONCEAL) !== 0)
             && (!(game.level?.levelObjects?.[x]?.[y] ?? null) || trapped
                 || !can_hide_under_obj(game.level?.levelObjects?.[x]?.[y] ?? null)))
            || ((mtmp.data.mlet | 0) === S_EEL && !dbridge_is_pool(x, y))))
        hideunder(mtmp);
}

/* C ref: dbridge.c:45-58 is_pool(x,y) — POOL, MOAT, WATER, or is_moat(x,y).
 * is_moat is Juiblex-level-specific and not ported elsewhere in this repo
 * (see js/look.js _is_pool_local); same gap preserved here. Shared by
 * hideunder() and maybe_unhide_at(). */
function dbridge_is_pool(x, y) {
    const loc = game.level?.at?.(x, y);
    if (!loc) return false;
    const typ = loc.typ | 0;
    if (typ === POOL || typ === MOAT || typ === WATER) return true;
    return typ === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}

/* C ref: mondata.h macros used only by m_poisongas_ok (mon.c:311) — local
 * copies rather than imports, matching this file's is_vampshifter/S_EEL
 * per-callsite duplication convention for macro-shaped C helpers. */
function m_poisongas_ok_nonliving(ptr) {
    const is_undead = ((ptr.mflags2 | 0) & 0x00000002) !== 0; /* M2_UNDEAD */
    const is_golem = (ptr.mlet | 0) === 55; /* S_GOLEM */
    const weirdnonliving = is_golem || (ptr.mlet | 0) === 22; /* S_VORTEX */
    return is_undead || (ptr.pmidx | 0) === PM_MANES || weirdnonliving;
}
function m_poisongas_ok_is_vampshifter(mon) {
    return mon.cham === PM_VAMPIRE || mon.cham === PM_VAMPIRE_LORD
        || mon.cham === PM_VLAD_THE_IMPALER;
}
function m_poisongas_ok_breathless(ptr) {
    return ((ptr.mflags1 | 0) & 0x00000400) !== 0; /* M1_BREATHLESS */
}
function m_poisongas_ok_immune_poisongas(ptr) {
    return (ptr.pmidx | 0) === PM_HEZROU || (ptr.pmidx | 0) === PM_VROCK;
}
function m_poisongas_ok_resists_poison(mon) {
    const rbits = (mon.data.mresists | 0) | (mon.mextrinsics | 0) | (mon.mintrinsics | 0);
    return (rbits & 0x20 /* MR_POISON */) !== 0;
}

export function m_poisongas_ok(mtmp) {
    const is_you = (mtmp.m_id | 0) === 1;

    /* Non living, non breathing, immune monsters are not concerned */
    if (m_poisongas_ok_nonliving(mtmp.data) || m_poisongas_ok_is_vampshifter(mtmp)
        || m_poisongas_ok_breathless(mtmp.data) || m_poisongas_ok_immune_poisongas(mtmp.data))
        return M_POISONGAS_OK;
    /* not is_swimmer(); assume that non-fish are swimming on
       the surface and breathing the air above it periodically
       unless located at water spot on plane of water */
    const px = is_you ? game.u.ux : mtmp.mx;
    const py = is_you ? game.u.uy : mtmp.my;
    if (((mtmp.data.mlet | 0) === 57 /* S_EEL */ || Is_waterlevel(game.u.uz))
        && dbridge_is_pool(px, py))
        return M_POISONGAS_OK;
    /* exclude monsters with poison gas breath attack:
       adult green dragon and Chromatic Dragon (and iron golem,
       but nonliving() and breathless() tests also catch that) */
    if (attacktype_fordmg(mtmp.data, 12 /* AT_BREA */, 7 /* AD_DRST */)
        || attacktype_fordmg(mtmp.data, 12 /* AT_BREA */, 242 /* AD_RBRE */))
        return M_POISONGAS_OK;
    if (is_you) {
        const magBreathProp = game.u.uprops?.[MAGICAL_BREATHING];
        const magicalBreathing = !!((magBreathProp?.intrinsic | 0) || (magBreathProp?.extrinsic | 0));
        const isBreathless = magicalBreathing || m_poisongas_ok_breathless(mtmp.data);
        if (game.u.uinvulnerable || isBreathless || game.u.uinwater)
            return M_POISONGAS_OK;
    }
    const poisonRes = is_you
        ? (() => {
              const p = game.u.uprops?.[POISON_RES];
              return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
          })()
        : m_poisongas_ok_resists_poison(mtmp);
    if (poisonRes) return M_POISONGAS_MINOR;
    return M_POISONGAS_BAD;
}

/* C ref: dogmove.c:143-153 cursed_object_at(x,y) — TRUE if any object in the
 * pile at (x,y) is cursed. No RNG. */
function cursed_object_at_hu(x, y) {
    for (let otmp = game.level?.levelObjects?.[x]?.[y] ?? null; otmp; otmp = otmp.nexthere ?? null) {
        if (otmp.cursed) return true;
    }
    return false;
}

/* C ref: monmove.c:2140-2183 can_hide_under_obj(obj) — is this object type
 * one a monster can hide beneath. NO_HIDING_UNDER_STATUES is #ifdef'd out
 * in the C source (never defined), so the statue-exclusion loop at the end
 * is dead code and is not ported (matches js/monmove.js's port of the same
 * C function). */
export function can_hide_under_obj(obj) {
    let o = obj;
    if (!o || (o.where | 0) !== OBJ_FLOOR)
        return false;
    const t = t_at(o.ox | 0, o.oy | 0);
    if (t && !is_pit(t.ttyp | 0))
        return false;
    /* can't hide under small amount of coins unless non-coins are also
       present; we expect coins to be a single stack but don't assume that */
    if ((o.oclass | 0) === COIN_CLASS) {
        let coinquan = 0;
        do {
            coinquan += o.quan;
            if (coinquan >= 10)
                break; /* fall through to other checks */
            o = o.nexthere;
            if (!o)
                return false; /* whole pile was less than 10 coins */
        } while ((o.oclass | 0) === COIN_CLASS);
    }
    return true; /* can hide under the object */
}

export function shkname_is_pname(mtmp) {
    /* BLOCKED: C: const char *shknm = ESHK(mtmp)->shknam; */
    throw new Error('shkname_is_pname: ESHK(mtmp)->shknam not captured — harness gap');
}

/* C ref: hacklib.c:985-1001 — case_insensitive_comp
 * int case_insensitive_comp(const char *s1, const char *s2)
 *
 * Case-insensitive string comparison. Returns 0 if strings are equal
 * (ignoring case), or the difference between the first differing characters
 * when lowercased.
 */
export function case_insensitive_comp(s1, s2) {
    let u1, u2;
    let i = 0;
    for (;;) {
        // Get char code (0 if past string end — like C null terminator)
        u1 = (i < s1.length) ? s1.charCodeAt(i) : 0;
        u2 = (i < s2.length) ? s2.charCodeAt(i) : 0;

        // Ensure unsigned byte (0-255)
        u1 = u1 & 0xFF;
        u2 = u2 & 0xFF;

        // If u1 is uppercase (A-Z: 65-90), convert to lowercase (a-z: 97-122)
        if (u1 >= 65 && u1 <= 90) {
            u1 = u1 + 32;
        }

        // If u2 is uppercase (A-Z: 65-90), convert to lowercase (a-z: 97-122)
        if (u2 >= 65 && u2 <= 90) {
            u2 = u2 + 32;
        }

        // Check for null terminator or inequality
        if (u1 === 0 || u1 !== u2) {
            break;
        }

        i++;
    }

    return u1 - u2;
}

/* C ref: hacklib.c:276-302 — str_start_is: determine whether 'str' starts with 'chkstr',
 * possibly ignoring case; panics on huge strings */
export function str_start_is(str, chkstr, caseblind) {
    let t1, t2;
    let n = 2147483647; /* LARGEST_INT */
    let si = 0;

    while (--n) {
        if (si >= str.length)
            return (si >= chkstr.length); /* chkstr >= str */
        else if (si >= chkstr.length)
            return true; /* chkstr < str */
        t1 = caseblind ? lowc(str.charCodeAt(si)) : str.charCodeAt(si);
        t2 = caseblind ? lowc(chkstr.charCodeAt(si)) : chkstr.charCodeAt(si);
        si++;
        if (t1 !== t2)
            return false;
    }
    /* #if 0 ... panic("string too long") ... #endif */
    return true;
}

const ELVEN_SHIELD = 153; /* objects.h ARMOR() ELVEN_SHIELD; was 152 = SHIELD_OF_SHOCK_RESISTANCE */
const ORCISH_SHIELD = 155; /* objects.h ARMOR() ORCISH_SHIELD; was 154 = URUK_HAI_SHIELD */
const SHIELD_OF_REFLECTION = 158;
export function clear_dknown(obj) {
    /* C mkobj.c:829-831 dknowns[] = {WAND_CLASS, RING_CLASS, POTION_CLASS,
     * SCROLL_CLASS, GEM_CLASS, SPBOOK_CLASS, WEAPON_CLASS, TOOL_CLASS,
     * VENOM_CLASS, 0} — objclass.h enum values (defsym.h OBJCLASS list):
     * WEAPON=2, RING=4, TOOL=6, POTION=8, SCROLL=9, SPBOOK=10, WAND=11,
     * GEM=13, VENOM=17. Previous literal had WAND wrongly duplicating
     * WEAPON's 2 (so real wands never hit this branch), TOOL wrongly using
     * CHAIN_CLASS's 16, and VENOM wrongly using the out-of-range 21. */
    const dknowns = [11, 4, 8, 9, 13, 10, 2, 6, 17]; // WAND, RING, POTION, SCROLL, GEM, SPBOOK, WEAPON, TOOL, VENOM (oclass values)

    /* Base dknown setting: if oclass is in dknowns, dknown=0, else dknown=1 */
    let dknown_val = 0;
    for (let i = 0; i < dknowns.length; i++) {
        if (dknowns[i] === obj.oclass) {
            dknown_val = 0;
            break;
        }
        dknown_val = 1;
    }
    obj.dknown = dknown_val;

    /* Shields are never dknown */
    if ((obj.otyp >= ELVEN_SHIELD && obj.otyp <= ORCISH_SHIELD) ||
        obj.otyp === SHIELD_OF_REFLECTION) {
        obj.dknown = 0;
    }

    /* C mkobj.c:841-843 clear_dknown — oc_merge objects (incl. GOLD_PIECE)
     * are always dknown=0 so they merge visually regardless of class. */
    if ((obj.otyp >= 0 && obj.otyp < OC_MERGE.length && OC_MERGE[obj.otyp])) {
        obj.dknown = 0;
    }

    /* Puddings (globs) are always dknown */
    if (obj.otyp === GLOB_OF_GRAY_OOZE ||
        obj.otyp === GLOB_OF_BROWN_PUDDING ||
        obj.otyp === GLOB_OF_GREEN_SLIME ||
        obj.otyp === GLOB_OF_BLACK_PUDDING) {
        obj.dknown = 1;
    }
}

export async function kill_genocided_monsters() {
    let mtmp, mtmp2, kill_cham, mndx;

    for (mtmp = game.fmon; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (mtmp.mhp <= 0)
            continue;
        /* C mon.c:5646 mndx = monsndx(mtmp->data); mondata.h:10
         * `#define monsndx(ptr) ((ptr)->pmidx)` — permonst has no `mndx`. */
        mndx = mtmp.data.pmidx;
        kill_cham = (ismnum(mtmp.cham)
                     && ((game.mvitals?.[mtmp.cham]?.mvflags | 0) & G_GENOD));
        if (((game.mvitals?.[mndx]?.mvflags | 0) & G_GENOD) || kill_cham) {
            if (ismnum(mtmp.cham) && !kill_cham)
                await newcham(mtmp, null, 0);
            else
                await mondead(mtmp);
        }
        if (mtmp.minvent)
            kill_eggs(mtmp.minvent);
    }

    kill_eggs(game.invent);
    kill_eggs(game.fobj);
    kill_eggs(game.gm?.migrating_objs);
    kill_eggs(game.level?.buriedobjlist);
}

export async function mcalcdistress() {
    for (let mtmp = game.fmon, mtmp2; mtmp; mtmp = mtmp2) {
        mtmp2 = mtmp.nmon;
        if (!mtmp || mtmp.mhp <= 0 || (mtmp.mstate | 0) !== MON_FLOOR)
            continue;
        await m_calcdistress(mtmp);
    }
}

export function mon_animal_list(construct) {
    if (construct) {
        const SPECIAL_PM = monsPack.special_pm;
        const M1_ANIMAL = 0x00040000;
        const LOW_PM = 0;
        const animal_temp = [];
        let n = 0;

        for (let i = LOW_PM; i < SPECIAL_PM; i++) {
            // is_animal(mndx) checks (mons[i].mflags1 & M1_ANIMAL) !== 0
            // MONS_ROWS[i][6] is mflags1
            if ((MONS_ROWS[i][6] & M1_ANIMAL) !== 0) {
                animal_temp[n++] = i;
            }
        }

        // Allocate and copy the array to ga.animal_list
        if (game.ga === undefined) game.ga = {};
        game.ga.animal_list = animal_temp.slice(0, n);
        game.ga.animal_list_count = n;
    } else { /* release */
        if (game.ga === undefined) game.ga = {};
        if (game.ga.animal_list) {
            game.ga.animal_list = null;
        }
        game.ga.animal_list_count = 0;
    }
}

export function newoextra() {
    return {
        oname: null,
        omonst: null,
        omailcmd: null,
        omid: 0
    };
}

export function newomid(otmp) {
    otmp.oextra ||= newoextra();
    otmp.oextra.omid = 0;
    if (!otmp.oextra_present)
        otmp.oextra_present = 1;  /* oextra = newoextra() */
    otmp.oextra_omid = 0;
}

export function dealloc_oextra(o) {
    const x = o.oextra;
    if (x) {
        if (x.oname)
            x.oname = null;
        if (x.omonst)
            free_omonst(o);
        if (x.omailcmd)
            x.omailcmd = null;
        o.oextra = null;
    }
}

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
export function online2(x0, y0, x1, y1) {
    const dx = x0 - x1;
    const dy = y0 - y1;
    /*  If either delta is zero then they're on an orthogonal line,
     *  else if the deltas are equal (signs ignored) they're on a diagonal.
     */
    return (!dy || !dx || dy === dx || dy === -dx);
}

export function unknow_object(obj) {
    clear_dknown(obj); /* obj->dknown = 0; */

    obj.bknown = obj.rknown = 0;
    obj.cknown = obj.lknown = 0;
    obj.tknown = 0;
    /* for an existing object, awareness of charges or enchantment has
       gone poof...  [object types which don't use the known flag have
       it set True for some reason] */
    obj.known = OC_USES_KNOWN[obj.otyp] ? 0 : 1;
}

/* C ref: hacklib.c:426 — ing_suffix: construct a gerund (a verb formed by
 * appending "ing" to a noun). */
export function ing_suffix(s) {
    const vowel = "aeiouwy";
    let buf = s;
    let onoff = "";
    let p = eos(buf);          /* p = eos(buf) */

    /* onoff[0] = *p = *(p+1) = '\0' is satisfied by onoff = "" */
    if ((p >= 3 && buf.substring(p - 3).toLowerCase() === " on")
        || (p >= 4 && buf.substring(p - 4).toLowerCase() === " off")
        || (p >= 5 && buf.substring(p - 5).toLowerCase() === " with")) {
        p = buf.lastIndexOf(' ');      /* p = strrchr(buf, ' ') */
        onoff = buf.substring(p);      /* Strcpy(onoff, p) */
        buf = buf.substring(0, p);     /* *p = '\0' */
    }
    if (p >= 2 && buf.substring(p - 2).toLowerCase() === "er") {
        /* slither + ing — nothing here */
    } else if (p >= 3 && vowel.indexOf(buf[p - 1]) === -1
        && vowel.indexOf(buf[p - 2]) !== -1
        && vowel.indexOf(buf[p - 3]) === -1) {
        /* tip -> tipp + ing */
        buf = buf + buf[p - 1];        /* *p = *(p - 1); *(p + 1) = '\0' */
    } else if (p >= 2 && buf.substring(p - 2).toLowerCase() === "ie") {
        /* vie -> vy + ing */
        buf = buf.substring(0, p - 2) + 'y';  /* *(p - 2) = 'y'; *(p - 1) = '\0' */
    } else if (p >= 1 && buf[p - 1] === 'e') {
        /* grease -> greas + ing */
        buf = buf.substring(0, p - 1);        /* *(p - 1) = '\0' */
    }
    buf += "ing";                  /* Strcat(buf, "ing") */
    if (onoff)                     /* if (onoff[0]) */
        buf += onoff;              /* Strcat(buf, onoff) */
    return buf;
}

const _OTC_ROT_ICE_ADJUSTMENT = 2;
export function obj_timer_checks(otmp, x, y, force) {
    let tleft = 0;
    let action = ROT_CORPSE;
    let restart_timer = false;
    const on_floor = (otmp.where | 0) === OBJ_FLOOR;
    const buried = (otmp.where | 0) === OBJ_BURIED;
    const moves = (game.moves) | 0;

    /* Check for corpses just placed on or in ice */
    if ((otmp.otyp | 0) === CORPSE && (on_floor || buried) && is_ice(x, y)) {
        tleft = stop_timer(action, obj_to_any(otmp));
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, obj_to_any(otmp));
        }
        if (tleft !== 0) {
            otmp.on_ice = 1;
            tleft *= _OTC_ROT_ICE_ADJUSTMENT;
            restart_timer = true;
            const age = moves - (otmp.age | 0);
            otmp.age = moves - (age * _OTC_ROT_ICE_ADJUSTMENT);
        }
    /* Check for corpses coming off ice */
    } else if (force < 0 || ((otmp.otyp | 0) === CORPSE && otmp.on_ice
                             && !((on_floor || buried) && is_ice(x, y)))) {
        tleft = stop_timer(action, obj_to_any(otmp));
        if (tleft === 0) {
            action = REVIVE_MON;
            tleft = stop_timer(action, obj_to_any(otmp));
        }
        if (tleft !== 0) {
            otmp.on_ice = 0;
            tleft = Math.trunc(tleft / _OTC_ROT_ICE_ADJUSTMENT);
            restart_timer = true;
            const age = moves - (otmp.age | 0);
            otmp.age = (otmp.age | 0) + Math.trunc(age * (_OTC_ROT_ICE_ADJUSTMENT - 1) / _OTC_ROT_ICE_ADJUSTMENT);
        }
    }

    if (restart_timer)
        start_timer(tleft, TIMER_OBJECT, action, obj_to_any(otmp));
}

/* C mkobj.c:2557-2592. Dispatch by the object's actual owning chain. */
export function obj_extract_self(obj) {
    switch (obj.where) {
    case OBJ_FREE:
    case OBJ_LUAFREE_OES:
    case OBJ_DELETED:
        break;
    case OBJ_FLOOR:
        remove_object(obj);
        break;
    case OBJ_CONTAINED:
        extract_nobj(obj, obj.ocontainer, 'cobj');
        container_weight(obj.ocontainer);
        obj.ocontainer = null;
        break;
    case OBJ_INVENT:
        freeinv(obj);
        break;
    case OBJ_MINVENT:
        extract_nobj(obj, obj.ocarry, 'minvent');
        obj.ocarry = null;
        break;
    case OBJ_MIGRATING:
        extract_nobj(obj, game.gm, 'migrating_objs');
        break;
    case OBJ_BURIED:
        extract_nobj(obj, game.level, 'buriedobjlist');
        break;
    case OBJ_ONBILL:
        extract_nobj(obj, game, 'billobjs');
        break;
    default:
        throw new Error(`panic: obj_extract_self, where=${obj.where}`);
    }
}

/* C mkobj.c:2596-2615. (owner, key) is the JS address of the chain head.
 * Object identity, not o_id equality, determines which node is extracted. */
export function extract_nobj(obj, owner, key) {
    let curr = owner[key], prev = null;
    for (; curr; prev = curr, curr = curr.nobj) {
        if (curr === obj) {
            if (prev)
                prev.nobj = curr.nobj;
            else
                owner[key] = curr.nobj;
            break;
        }
    }
    if (!curr)
        throw new Error('panic: extract_nobj: object lost');
    obj.where = OBJ_FREE;
    obj.nobj = null;
}

/* C mkobj.c:2733-2738. Recompute each enclosing container after extraction. */
export function container_weight(container) {
    container.owt = weight(container);
    if (container.where === OBJ_CONTAINED)
        container_weight(container.ocontainer);
}
/* C obj.h:83 OBJ_LUAFREE == 8 (js/const.js:1122); not in this file's const.js
 * import list, and spelled locally the same way OBJ_MINVENT_MD is at :15911. */
const OBJ_LUAFREE_OES = 8;

/* C mkobj.c:2834 dealloc_obj_real — JavaScript GC owns the final release. */
function dealloc_obj_real(otmp) {
    /* The object has already been unlinked and marked OBJ_DELETED by obfree. */
    return;
}

/* C ref: mkobj.c:2527-2540 — discard_minvent */
export async function discard_minvent(mtmp, uncreate_artifacts) {
    let otmp;
    while ((otmp = mtmp.minvent) != null) {
        await extract_from_minvent(mtmp, otmp, true, true);
        if (uncreate_artifacts && otmp.oartifact)
            artifact_exists(otmp, safe_oname(otmp), false, ONAME_NO_FLAGS);
        await obfree(otmp, null);
    }
}

/* constant: ONAME_NO_FLAGS */
const ONAME_NO_FLAGS = 0;

export async function extract_from_minvent(mtmp, otmp, a, b) {
    return await extract_from_minvent_md(mtmp, otmp, a, b);
}

/* obfree: the local throwing stub that stood here shadowed js/dokick.js's
 * real body (C shk.c:1186-1272) for discard_minvent() above.  Imported at
 * :145 instead. */

function safe_oname(otmp) {
    return safe_oname_real(otmp);
}

function artifact_exists(otmp, name, a, b) {
    return artifact_exists_real(otmp, name, a, b);
}

/* C ref: mon.c:1520-1638 — meatobj: for gelatinous cubes (and other engulfers).
 * Returns 0 if nothing eaten/engulfed, 1 if something was eaten/engulfed,
 * 2 if monster polymorphed, 1 if monster changed form but didn't die. */
export async function meatobj(mtmp) {
    let otmp, otmp2;
    let ptr, original_mnum = mtmp.mnum;
    let count = 0, ecount = 0;
    let buf = "";
    let otmpname;


    /* eat organic objects, including cloth and wood, if present;
       engulf others, except huge rocks and metal attached to player */
    for (otmp = (game.level?.levelObjects?.[mtmp.mx]?.[mtmp.my]) ?? null; otmp; otmp = otmp2) {
        otmp2 = otmp.nexthere;

        /* avoid special items */
        if (is_mines_prize(otmp) || is_soko_prize(otmp))
            continue;

        /* touch sensitive items */
        if (otmp.otyp === CORPSE && (otmp.corpsenm === PM_DEATH_R || otmp.corpsenm === PM_FAMINE || otmp.corpsenm === PM_PESTILENCE)) {
            let ox = otmp.ox, oy = otmp.oy;
            let revived_it = await revive_corpse(otmp);

            newsym(ox, oy);
            if (!revived_it)
                continue;
            break;

        /* untouchable (or inaccessible) items */
        } else if ((otmp.otyp === CORPSE
                    && (otmp.corpsenm === PM_COCKATRICE || otmp.corpsenm === PM_CHICKATRICE)
                    && !resists_ston(mtmp))
                   || otmp.oclass === ROCK_CLASS
                   || otmp === game.u.uball || otmp === game.u.uchain
                   || otmp.otyp === SCR_SCARE_MONSTER) {
            continue;

        /* inedible items -- engulf these */
        } else if (!is_organic(otmp) || obj_resists(otmp, 5, 95)
                   || !await touch_artifact(otmp, mtmp)
                   || (otmp.otyp === AMULET_OF_STRANGULATION
                       || otmp.otyp === RIN_SLOW_DIGESTION)
                   || (otmp.opoisoned && !resists_poison(mtmp))
                   || (mstoning(otmp) && !resists_ston(mtmp))
                   || (otmp.otyp === GLOB_OF_GREEN_SLIME
                       && !slimeproof(mtmp.mnum))) {
            /* engulf */
            ++ecount;
            otmpname = (await distant_name_nc(otmp, doname_nc));
            if (ecount === 1)
                buf = Monnam(mtmp) + " engulfs " + otmpname + ".";
            else if (ecount === 2)
                buf = Monnam(mtmp) + " engulfs several objects.";
            obj_extract_self(otmp);
            await mpickobj(mtmp, otmp);

        /* lastly, edible items; yum! */
        } else {
            /* devour */
            ++count;
            if (cansee(mtmp.mx, mtmp.my)) {
                otmpname = (await distant_name_nc(otmp, doname_nc));
                if (game.flags.verbose)
                    pline_mon(mtmp, "%s eats %s!",
                              Monnam(mtmp), otmpname);
                if (otmp.oclass === SCROLL_CLASS
                    && objdescr_is(otmp, "YUM YUM"))
                    /* C ref: mon.c:1611 pline("Yum%c", otmp->blessed ? '!' : '.').
                     * js/display.js pline() takes one already-formatted string
                     * (no varargs/%-expansion), so the %c is expanded here. */
                    pline("Yum" + (otmp.blessed ? '!' : '.'));
            } else {
                Soundeffect(0, 30); /* se_slurping_sound: audio-only enum */
                if (game.flags.verbose)
                    You_hear("a slurping sound.");
            }
            await m_consume_obj(mtmp, otmp);
            ptr = mtmp.mnum;
            if (ptr !== original_mnum)
                return !ptr ? 2 : 1;
        }

        if (mtmp.minvis)
            newsym(mtmp.mx, mtmp.my);
    }

    if (ecount > 0) {
        if (cansee(mtmp.mx, mtmp.my) && game.flags.verbose && buf !== "")
            pline1(buf);
        else if (game.flags.verbose)
            You_hear("%s slurping sound%s.",
                     (ecount === 1) ? "a" : "several", plur(ecount));
    }
    return (count > 0 || ecount > 0) ? 1 : 0;
}

/* C ref: mon.c:1643-1711 — meatcorpse: monster eats a corpse off the ground
 * (for purple worms and other voracious monsters).
 * Return value: 0 = nothing eaten, 1 = ate a corpse, 2 = died. */
export async function meatcorpse(mtmp) {
    let otmp, ptr, corpsepm;
    const original_mnum = mtmp.mnum;
    const x = mtmp.mx, y = mtmp.my;


    /* skips past any globs */
    for (otmp = sobj_at(CORPSE, x, y); otmp;
         /* won't get back here if otmp is split or gets used up */
         otmp = nxtobj(otmp, CORPSE, true)) {

        corpsepm = permonstTemplate(otmp.corpsenm);
        /* skip some corpses */
        if (vegan(corpsepm) /* ignore veggy corpse even if omnivorous */
            /* don't eat harmful corpses */
            || (flesh_petrifies(corpsepm) && !resists_ston(mtmp)))
            continue;
        if (is_rider(corpsepm)) {
            const revived_it = await revive_corpse(otmp);

            newsym(x, y); /* corpse is gone; mtmp might be too so do this now
                             since we're bypassing the bottom of the loop */
            if (!revived_it)
                continue; /* revival failed? if so, corpse is gone */
            /* Successful Rider revival; unlike skipped corpses, don't
               just move on to next corpse as if nothing has happened. */
            break;
        }

        if (otmp.quan > 1)
            otmp = (await splitobj(otmp, 1));

        if (cansee(x, y) && canseemon(mtmp)) {
            /* call distant_name() for its possible side-effects even if
               the result won't be printed */
            const otmpname = await distant_name_nc(otmp, doname_nc);

            if (game.flags.verbose)
                pline_mon(mtmp, "%s eats %s!",
                          Monnam(mtmp), otmpname);
        } else {
            Soundeffect(se_masticating_sound, 50);
            if (game.flags.verbose)
                You_hear("a masticating sound.");
        }

        await m_consume_obj(mtmp, otmp);
        /* in case it polymorphed or died */
        ptr = mtmp.mnum;
        if (ptr !== original_mnum)
            return !ptr ? 2 : 1;

        /* Engulf & devour is instant, so don't set meating */
        if (mtmp.minvis)
            newsym(x, y);

        return 1;
    }
    return 0;
}

/* constant: se_masticating_sound (sounds.h enum) — Soundeffect is a no-op
 * stub, so the exact value carries no observable behavior. */
const se_masticating_sound = 0;

/* C invent.c:1479-1489 — find the next object of a given type in one of the
 * two object chains.  The traversal advances before testing, matching C's
 * `obj` starting point and preserving its null behavior. */
export function nxtobj(otmp, otyp, restrict_) {
    let next = otmp;
    do {
        next = restrict_ ? next?.nexthere : next?.nobj;
        if (!next)
            break;
    } while ((next.otyp | 0) !== (otyp | 0));
    return next || null;
}

/* mkobj.c:458-503 — use the canonical object-chain implementation from
 * makemon.js, which already owns the complete split bookkeeping. */
async function splitobj(otmp, num) { return await splitobj_real(otmp, num); }

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
function vegetarian(ptr) {
    if (!ptr)
        return false;
    return vegan(ptr)
        || ((ptr.mlet | 0) === S_PUDDING_MD
            && (ptr.pmidx | 0) !== PM_BLACK_PUDDING_MD);
}

function flesh_petrifies(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === 9 || (n | 0) === 10 || (n | 0) === 284;
}

function is_rider(ptr) {
    const n = ptr?.pmidx ?? ptr?.mnum ?? ptr?.mndx;
    return (n | 0) === PM_DEATH_R || (n | 0) === PM_FAMINE
        || (n | 0) === PM_PESTILENCE;
}

/* C mon.c:2451-2468 mm_displacement().  This is evaluated only when a
 * neighbour is occupied and the ordinary ALLOW_M aggression bit is absent;
 * keeping it here lets mfndpos admit exactly the cells a displacer may barge
 * through without changing the ordinary movement candidate set. */
const M3_DISPLACES_MK = 0x0400;
function mm_displacement_mk(magr, mdef) {
    const pa = magr?.data;
    const pd = mdef?.data;
    if (!pa || !pd || !((pa.mflags3 | 0) & M3_DISPLACES_MK)) return 0;
    if (((pd.mflags3 | 0) & M3_DISPLACES_MK)
        && ((magr.m_lev | 0) <= (mdef.m_lev | 0))) return 0;
    if ((magr.mx | 0) !== (mdef.mx | 0) && (magr.my | 0) !== (mdef.my | 0)
        && ((pa.pmidx ?? magr.mndx ?? magr.mnum) | 0) === PM_GRID_BUG) return 0;
    if ((mdef.mtrapped | 0) || ((mdef.wormno | 0) && count_wsegs(mdef))) return 0;
    const rider = is_rider(pa);
    if (!rider && (pa.msize | 0) < (pd.msize | 0)) return 0;
    return ALLOW_MDISP;
}

/* C mon.c:2385-2448 mm_2way_aggression() — the half of mm_aggression that
 * applies in both directions.  Only the W-tower pairing and the
 * zombie-maker-vs-zombifiable arm exist in 5.0. */
function mm_2way_aggression_mk(magr, mdef) {
    const uz = game.u?.uz;
    const same = (a, b) => !!a && !!b && (a.dnum | 0) === (b.dnum | 0)
        && (a.dlevel | 0) === (b.dlevel | 0);
    const wlev = same(uz, game.wiz1_level) || same(uz, game.wiz2_level)
        || same(uz, game.wiz3_level);
    if (wlev) {
        const dn = game.dndest;
        const inTower = (x, y) => !!dn && !!(dn.nlx | 0)
            && x >= (dn.nlx | 0) && x <= (dn.nhx | 0)
            && y >= (dn.nly | 0) && y <= (dn.nhy | 0);
        const hin = inTower(game.u.ux | 0, game.u.uy | 0);
        const ain = inTower(magr.mx | 0, magr.my | 0);
        const din = inTower(mdef.mx | 0, mdef.my | 0);
        if (hin ? (!ain || !din) : (ain || din))
            return 0;
    }
    if (zombie_maker(magr) && zombie_form(mdef.data) !== NON_PM) {
        if ((magr.mgenmklev | 0) && (mdef.mgenmklev | 0))
            return 0;
        const uniq = (m) => ((monGeno(m.data?.pmidx ?? m.mndx ?? m.mnum) | 0) & 0x1000) !== 0;
        if (!Is_stronghold(uz) && !uniq(magr) && !uniq(mdef))
            return ALLOW_M | ALLOW_TM;
    }
    return 0;
}

/* C mon.c:2451-2468 mm_aggression() */
function mm_aggression_mk(magr, mdef) {
    const mndx = (magr.data?.pmidx ?? magr.mndx ?? magr.mnum) | 0;
    if ((magr.mtame | 0) && (mdef.mtame | 0))
        return 0;
    if ((mndx === PM_PURPLE_WORM_MK || mndx === PM_BABY_PURPLE_WORM)
        && (mdef.data?.pmidx ?? mdef.mndx ?? mdef.mnum) === PM_SHRIEKER)
        return ALLOW_M | ALLOW_TM;
    return mm_2way_aggression_mk(magr, mdef) | mm_2way_aggression_mk(mdef, magr);
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

/* C mon.c:1338-1368 — dispose of the contents of an eaten container. */
async function meatbox_consume(mtmp, box) {
    if (!box?.cobj || !isok(mtmp.mx | 0, mtmp.my | 0))
        return;
    const engulf = (mtmp.mndx ?? mtmp.data?.pmidx ?? -1) === PM_GELATINOUS_CUBE;
    while (box.cobj) {
        const obj = box.cobj;
        box.cobj = obj.nobj ?? null;
        obj.nobj = null;
        obj.ocontainer = null;
        obj.where = OBJ_FREE;
        if (engulf)
            await mpickobj(mtmp, obj);
        else
            place_object(obj, mtmp.mx | 0, mtmp.my | 0);
    }
}

/* C mon.c:1392-1452 — consume an object after a monster has accepted it.
 * The object deletion and the ordinary food side effects are kept here rather
 * than duplicated in meatobj/meatcorpse.  A few rare aftermath helpers remain
 * explicit no-ops below because their JS ports do not exist yet; consuming the
 * object itself is still essential (and preserves delobj's obj_resists draw). */
export async function m_consume_obj(mtmp, otmp) {
    const ispet = !!(mtmp?.mtame | 0);

    /* C: non-pets heal by the raw objects[].oc_weight column. */
    if (!ispet && (mtmp.mhp | 0) < (mtmp.mhpmax | 0))
        healmon(mtmp, OC_WEIGHT[otmp.otyp | 0] | 0, 0);

    if (Has_contents(otmp))
        await meatbox_consume(mtmp, otmp);

    /* C's ball/chain cases call unpunish before deleting (or instead of it). */
    if (otmp === game.u?.uball) {
        await unpunish();
        await delobj_real(otmp);
        return;
    }
    if (otmp === game.u?.uchain) {
        await unpunish();
        return;
    }

    const corpsenm = ((otmp.otyp | 0) === CORPSE) ? (otmp.corpsenm | 0) : NON_PM;
    const deadmimic = ((otmp.otyp | 0) === CORPSE)
        && (corpsenm === PM_SMALL_MIMIC || corpsenm === PM_LARGE_MIMIC
            || corpsenm === PM_GIANT_MIMIC);
    const slimer = (otmp.otyp | 0) === GLOB_OF_GREEN_SLIME;
    const poly = polyfood(otmp);
    const grow = mlevelgain(otmp);
    const heal = mhealup(otmp);
    const eyes = (otmp.otyp | 0) === CARROT;
    const mstone = mstoning(otmp);
    const vis = canseemon(mtmp);

    /* C: delobj() is deliberately before all aftermath effects. */
    await delobj_real(otmp);

    if (poly || slimer)
        await newcham(mtmp, slimer ? PM_GREEN_SLIME : null,
                vis ? NC_SHOW_MSG : 0);
    if (grow && (ispet ? (mtmp.m_lev | 0) < ((mtmp.data?.mlevel | 0) + 15) : true))
        await grow_up(mtmp, null);
    /* C mon.c:1429-1434 — petrifying food either turns a golem into a stone
     * golem or creates a statue/rock through monstone(). */
    if (mstone) {
        if (poly_when_stoned(mtmp.data))
            await newcham(mtmp, PM_STONE_GOLEM, 0);
        else if (!resists_ston(mtmp))
            await monstone(mtmp);
    }
    if (heal)
        healmon(mtmp, mtmp.mhpmax | 0, 0);
    /* C muse.c:2872 mcureblindness(): carrots and healing food restore a
     * monster's sight.  Keep the state transition local; the canonical helper
     * is module-private in makemon.js, while this branch is RNG-free. */
    if ((eyes || heal) && !mtmp.mcansee) {
        mtmp.mcansee = 1;
        mtmp.mblinded = 0;
    }
    /* C mon.c:1446 quickmimic(): eating a mimic corpse ends a pet's
     * disguise meal immediately.  The shared dogmove helper performs the
     * meal/taming state cleanup and redraw. */
    if (ispet && deadmimic)
        await quickmimic_mk(mtmp);
    if (corpsenm !== NON_PM)
        mon_givit(mtmp, permonstTemplate(corpsenm));
}

export async function revive_corpse(otmp, do_msgs = true) {
    if (!otmp || (otmp.otyp | 0) !== CORPSE)
        return false;
    const mnum = otmp.corpsenm | 0;
    const wasBuried = (otmp.where | 0) === OBJ_BURIED;
    const mdat = permonstTemplate(mnum);
    if (!mdat || mnum < 0)
        return false;
    /* C do.c:2121-2133: name, location and wield state are read BEFORE
     * revive() consumes the corpse. */
    const where0 = otmp.where | 0;
    const chewed = (otmp.oeaten | 0) !== 0;
    const is_uwep = otmp === game.u?.uwep;
    const cname = corpse_xname_rc(otmp, chewed ? 'bite-covered' : null, 1 /* CXN_SINGULAR */);
    const corpsex = otmp.ox | 0, corpsey = otmp.oy | 0;
    let x = otmp.ox | 0, y = otmp.oy | 0;
    if (otmp.where === OBJ_FLOOR && !isok(x, y))
        return false;
    if (!isok(x, y)) {
        x = (game.u?.ux ?? 1) | 0;
        y = (game.u?.uy ?? 1) | 0;
    }
    /* C zap.c:947-950 resolves an occupied corpse square before makemon().
     * revive() doesn't pass MM_ADJACENTOK, so leaving this to makemon would
     * reject the revival instead of running enexto's randomized search. */
    if (m_at(x, y)) {
        const spot = enexto_out(x, y, mdat);
        if (spot) {
            x = spot.x | 0;
            y = spot.y | 0;
        }
    }
    /* C zap.c:895/1003: revive() suppresses inventory and waiting strategy,
     * and does not count the revived monster as a new birth. */
    const mon = await makemon(mdat, x, y,
                              NO_MINVENT | MM_NOWAIT | MM_NOMSG | MM_NOCOUNTBIRTH);
    if (!mon)
        return false;
    /* A timed corpse may be firing from the timeout queue right now; C's
     * object disposal removes every timer before the corpse leaves storage. */
    if (otmp.timed)
        obj_stop_timers(otmp);
    if (wasBuried || (otmp.where | 0) === OBJ_FLOOR) {
        const wasFloor = (otmp.where | 0) === OBJ_FLOOR;
        obj_extract_self(otmp);
        await dealloc_obj(otmp);
        if (wasFloor)
            newsym(otmp.ox | 0, otmp.oy | 0);
    } else {
        await delobj_real(otmp);
    }
    /* C do.c:2220-2238: a buried zombie digs out by creating a pit.  maketrap
     * unearths and stacks every other buried object on that square. */
    if (wasBuried && (mdat.mlet | 0) === S_ZOMBIE)
        await maketrap(mon.mx | 0, mon.my | 0, PIT);
    /* C do.c:2151-2183: revival messages (revive_corpse() only; a direct
     * revive() caller such as unturn_dead prints none of them). */
    if (!do_msgs) {
        /* silent */
    } else if (where0 === OBJ_INVENT) {
        if (is_uwep)
            await pline(`The ${cname} writhes out of your grasp!`);
        else
            await pline('You feel squirming in your backpack!');
    } else if (where0 === OBJ_FLOOR) {
        if (cansee(corpsex, corpsey) || canseemon(mon)) {
            const pmi = mon.mnum ?? mon.pmidx;
            let effect = '';
            if (pmi === PM_DEATH_R)
                effect = ' in a whirl of spectral skulls';
            else if (pmi === PM_PESTILENCE)
                effect = ' in a churning pillar of flies';
            else if (pmi === PM_FAMINE)
                effect = ' in a ring of withered crops';
            if (canseemon(mon))
                await pline(`${chewed ? Adjmonnam_rc(mon, 'bite-covered') : Monnam_rc(mon)} rises from the dead${effect}!`);
            else
                await pline(`${The_rc(cname)} disappears${effect}!`);
        }
    }
    return mon;
}

/* obj.h:435-436 — use the canonical achievement-object ID checks. */
function is_mines_prize(otmp) { return is_mines_prize_real(otmp); }
function is_soko_prize(otmp) { return is_soko_prize_real(otmp); }

export function resists_ston(mtmp) {
    if (!mtmp)
        return false;
    const data = mtmp.data
        || ((mtmp.mnum ?? mtmp.pmidx) != null
            ? permonstTemplate((mtmp.mnum ?? mtmp.pmidx) | 0) : null);
    const rbits = ((data ? (data.mresists | 0) : 0)
                   | (mtmp.mextrinsics | 0) | (mtmp.mintrinsics | 0));
    return (rbits & 0x80 /* MR_STONE, monflag.h:69 */) !== 0;
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
function mstoning(otmp) {
    if (!ofood(otmp) || !ismnum(otmp.corpsenm))
        return false;
    return flesh_petrifies(permonstTemplate(otmp.corpsenm | 0));
}

/* C obj.h:325-326 — the two special corpse foods consumed by monsters. */
function mlevelgain(otmp) {
    return ofood(otmp) && (otmp.corpsenm | 0) === PM_WRAITH;
}
function mhealup(otmp) {
    return ofood(otmp) && (otmp.corpsenm | 0) === PM_NURSE;
}

/* C obj.h:321-324 — food that can trigger a monster polymorph. */
const AD_POLY = 43;
function polyfood(otmp) {
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
        || (pm | 0) === PM_GHOST;
}

function Monnam(mtmp) {
    return Monnam_wm(mtmp);
}

/* doname: likewise deleted.  Its only references in this file were as the
 * `func` argument of the three distant_name() calls above; with those moved
 * to doname_nc (js/objnam.js, imported at :143) it had no caller left. */

const MPICKOBJ_LOST_NONE = 0, MPICKOBJ_LOST_THROWN = 1;
const MPICKOBJ_LOST_DROPPED = 2, MPICKOBJ_LOST_STOLEN = 3;
const MPICKOBJ_AT_ENGL = 11; /* monattk.h:22 — engulf */
const MPICKOBJ_OBJ_MINVENT = 4; /* obj.h — OBJ_MINVENT */
function Has_contents(o) { return !!o.cobj; }
export async function mpickobj(mtmp, otmp) {
    let freed_otmp;
    let snuff_otmp = false;

    /* C 622-632 */
    if (!otmp) {
        /* C: impossible("monster (%s) taking or picking up nothing?") */
        return 1;
    } else if (otmp === game.u?.uball || otmp === game.u?.uchain) {
        /* C: impossible("... taking or picking up attached ball/chain?") */
        return 0;
    }

    /* C 636-641: if a monster acquires a thrown or kicked object, the throwing
       or kicking code shouldn't continue to track and place it */
    if (otmp === game.thrownobj)
        game.thrownobj = 0;
    else if (otmp === game.kickedobj)
        game.kickedobj = 0;

    if (otmp.unpaid || (Has_contents(otmp) && count_unpaid(otmp.cobj))) {
        await subfrombill(otmp, (await find_objowner(otmp, otmp.ox, otmp.oy)));
    }

    /* C 647-656: don't want a hidden light source inside the monster */
    if (obj_sheds_light_mp(otmp) && attacktype(mtmp.data, MPICKOBJ_AT_ENGL)) {
        /* this is probably a burning object that you dropped or threw */
        if (engulfing_u(mtmp) && !Blind_mp())
            pline(`${Tobjnam(otmp, 'go')} out.`);
        snuff_otmp = true;
    }

    otmp.no_charge = 0;

    /* C 660-678: some object handling is only done if mtmp isn't a pet */
    if (!mtmp.mtame) {
        /* if monst is unseen, some info the hero knows about this object
           becomes lost */
        if (!canseemon(mtmp) && mtmp !== game.u?.ustuck)
            unknow_object(otmp);
        /* if otmp has flags set for how it left hero's inventory, change them */
        if (otmp.how_lost === MPICKOBJ_LOST_THROWN)
            otmp.how_lost = MPICKOBJ_LOST_STOLEN;
        else if (otmp.how_lost === MPICKOBJ_LOST_DROPPED)
            otmp.how_lost = MPICKOBJ_LOST_NONE;
    }

    /* C 679-680: must do carrying effects on the object prior to add_to_minv */
    carry_obj_effects(otmp);

    /* C 681-683: add_to_minv() might free otmp [if merged with something
       else], so we have to call it after doing the object checks */
    freed_otmp = (await add_to_minv(mtmp, otmp));

    /* C 684-686: and we had to defer this until the object is in mtmp's
       inventory */
    if (snuff_otmp && !artifact_light(otmp))
        end_burn(otmp, (otmp.otyp | 0) !== MAGIC_LAMP);

    return freed_otmp;
}

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



export async function add_to_minv(mon, obj) {
    if (obj.where !== OBJ_FREE)
        throw new Error(`panic: add_to_minv: obj where=${obj.where}, not free`);
    for (let otmp = mon.minvent; otmp; otmp = otmp.nobj) {
        const target = { o: otmp }, source = { o: obj };
        if (await merged(target, source))
            return 1;
    }
    obj.where = 4; /* OBJ_MINVENT */
    obj.ocarry = mon;
    obj.nobj = mon.minvent;
    mon.minvent = obj;
    return 0;
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
async function pline_mon(mtmp, fmt, ...args) {
    void mtmp; /* set_msg_xy(mtmp->mx, mtmp->my) — no screen channel here */
    await pline(fmt, ...args);
}

/* C o_init.c:352-363 — compare an object's randomized unidentified
 * description.  getObjDescr owns the shuffled description table; null objects
 * and objects without an appearance simply cannot match. */
function objdescr_is(otmp, str) {
    if (!otmp)
        return false;
    const descr = getObjDescr(otmp.otyp | 0);
    return descr != null && descr === str;
}

/* pline() is NOT redefined here.  C ref: pline.c:113 pline() — one function,
 * one body.  The real port lives in js/display.js (the tty topline composer)
 * and is imported at the top of this file; the local throw-stub that used to
 * sit here shadowed it for every pline() call in this module. */

/* Stub: Soundeffect — not yet ported */
function Soundeffect(se, vol) {
}

/* C pline.c:113 pline1 — literal topline message without formatting or a
 * separate pager operation.  The display port already accepts a complete
 * string, so this is the same synchronous call shape used by nearby ports. */
function pline1(buf) {
    pline(buf);
}

/* Stub: plur — not yet ported */
function plur(n) {
    return (n === 1) ? "" : "s";
}

/* RIN_SLOW_DIGESTION constant */
const RIN_SLOW_DIGESTION = 193;

/* C ref: mklev.c:2046 mktrap — general trap placement entry (num, flags, croom, tm).
   Reuses existing maketrap, mktrap_room, mktrap_victim. */
export async function mktrap(num, mktrapflags, croom, tm) {
    /* C mklev.c:2055-2066 — argument-validation paniclog path; non-fatal */
    if (!tm && !croom && !(mktrapflags & MKTRAP_MAZEFLAG)) {
        console.error('mktrap', `args (${num},${mktrapflags},null room,null location) are invalid`);
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
    
    const lvl = level_difficulty();
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

export function set_ustuck(mtmp) {
    /* C SET_BOTL(): the status line must be redrawn whenever the stuck
     * monster changes, including when clearing an existing attachment. */
    if (game.disp)
        game.disp.botl = 1;
    game.u.ustuck = mtmp;
    if (!game.u.ustuck) {
        game.u.uswallow = 0;
        game.u.uswldtim = 0;
    }
}

/* C mon.c:5597-5621 — cancel hatch timers for eggs belonging to a genocided
 * species, recursively covering container contents. */
function kill_eggs(objlist) {
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        if ((otmp.otyp | 0) === EGG) {
            if (dead_species(otmp.corpsenm | 0, true))
                stop_timer(HATCH_EGG, obj_to_any(otmp));
        } else if (Has_contents(otmp)) {
            kill_eggs(otmp.cobj);
        }
    }
}

/* Stub: mondead — not yet ported */
/* C mon.c:2827-2836: only a worn life-saving amulet can save this monster. */
export function mlifesaver(mon) {
    if (!lifesave_nonliving(mon.data) || m_poisongas_ok_is_vampshifter(mon)) {
        const amulet = which_armor(mon, W_AMUL);
        if (amulet?.otyp === 202 /* AMULET_OF_LIFE_SAVING */) return amulet;
    }
    return null;
}

/* C mon.c:2839-2884. Called before any death counters, drops or detachment. */
export async function lifesaved_monster(mon) {
    const amulet = mlifesaver(mon);
    if (!amulet) return;
    if (cansee(mon.mx, mon.my)) {
        await pline('But wait...');
        await pline(`${lifesave_s_suffix(Monnam_wm(mon))} medallion begins to glow!`);
        lifesave_discover_object(202, true, true, true);
        if (canseemon(mon)) {
            const explodes = attacktype(mon.data, 13 /* AT_EXPL */)
                || attacktype(mon.data, 14 /* AT_BOOM */);
            await pline(`${Monnam_wm(mon)} ${explodes ? 'reconstitutes' : 'looks much better'}!`);
        }
        await pline('The medallion crumbles to dust!');
    }
    await lifesave_m_useup(mon, amulet);
    check_gear_next_turn(mon);
    const survives = !((game.mvitals?.[mon.data.pmidx]?.mvflags | 0) & G_GENOD);
    mon.mcanmove = 1;
    mon.mfrozen = 0;
    if (mon.mtame && !mon.isminion) await wary_dog(mon, !survives);
    mon.mhpmax = Math.max(mon.mhpmax | 0, (mon.m_lev | 0) + 1, 10);
    mon.mhp = mon.mhpmax;
    if (!survives) {
        if (cansee(mon.mx, mon.my))
            await pline(`Unfortunately, ${mon_nam_wm(mon)} is still genocided...`);
        mon.mhp = 0;
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

export async function mondead(mtmp) {
    if (!mtmp)
        return;
    const beSad = !!game.iflags?.sad_feeling;
    if (game.iflags) game.iflags.sad_feeling = false;
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    /* FF_DEATH_TRACE is deliberately opt-in and RNG-neutral.  It records the
     * map state at the exact mondead boundary, which is the only useful point
     * for diagnosing cells hidden by a monster until its death repaint. */
    if (typeof process !== 'undefined' && ENV?.FF_DEATH_TRACE === '1') {
        const cell = game.level?.at(mx, my);
        pushRngLogEntry(`^mondead[x=${mx},y=${my},mndx=${(mtmp.mndx ?? mtmp.mnum ?? -1) | 0},` +
            `mhp=${mtmp.mhp | 0},typ=${cell?.typ ?? -1},seenv=${cell?.seenv ?? -1},` +
            `lit=${cell?.lit ? 1 : 0},waslit=${cell?.waslit ? 1 : 0},` +
            `minvent=${mtmp.minvent ? 1 : 0},wormno=${mtmp.wormno | 0}]`);
    }
    mtmp.mhp = 0; /* C mon.c: "be sure" */
    await lifesaved_monster(mtmp);
    if ((mtmp.mhp | 0) > 0) return;
    /* C mon.c:2728-2732 m_detach() — unlink a light source before the dead
     * monster is detached, while its original data and map coordinates are
     * still available.  dmonsfree() intentionally leaves the node linked for
     * one purge pass, so checking only mhp/_mapRemoved is too late. */
    if ((mx | 0) > 0 && emits_light(mtmp.data))
        del_light_source(LS_MONSTER, monst_to_any(mtmp));
    if (beSad) await pline('You have a sad feeling for a moment, then it passes.');
    mtmp.mtrapped = 0;
    await unstuck_mk(mtmp);
    /* C mon.c:3121 svm.mvitals[mndx].died++ (no rng), capped at 255. */
    const mndx = (mtmp.data?.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if (game.mvitals && mndx >= 0) {
        const mv = (game.mvitals[mndx] ||= { died: 0, mvflags: 0 });
        if ((mv.died | 0) < 255)
            mv.died = (mv.died | 0) + 1;
    }
    await kop_revival(mtmp);
    /* C mon.c:2707-2710, the wormno arm of mon_leaving_level(), which m_detach()
     * calls FIRST and which the inlined detach below stands in for:
     *     if (mon->wormno) remove_worm(mon); else remove_monster(mx, my);
     * The else arm is the fmon unlink just below.  The wormno arm is not — a
     * worm's segments are not fmon entries, they live in js/worm.js's _seg_occ,
     * this port's stand-in for svl.level.monsters[][].  Without it every dead
     * worm left its whole body behind as PHANTOM occupancy: nothing painted
     * wrong, but m_at() answered "occupied" where C answers "empty", which
     * silently SUPPRESSES the makemon() draws C makes there (makemon.c:1193's
     * MON_AT early return).  Position is C's: before the fmon unlink. */
    if (mtmp.wormno)
        remove_worm_mk(mtmp);
    mtmp.mstate = (mtmp.mstate | 0) | MON_DETACH;
    /* C mon.c:2718-2720, mon_leaving_level(), is explicit that mx/my must NOT
     * be zeroed here:
     *     #if 0   / * mustn't do this; too many places assume that the stale
     *              * monst->mx,my values are still valid * /
     *         mon->mx = mon->my = 0; / * off normal map * /
     *     #endif
     * This body deliberately leaves both fields at the death square (the
     * KEYSTONE-A note above says so) — the concrete reason is explode.c:1048-
     * 1058 mon_explodes(), which calls mondead(mon) and THEN reads mon->mx/
     * mon->my as the blast centre passed to explode(); zeroing them would blow
     * every AT_BOOM/AT_EXPL death (gas spore, exploding sphere) up at <0,0>
     * and silently drop the RNG draws a real blast makes.  js/uhitm.js's
     * unlink_mon() carries the same rule.  Do not add a `mtmp.mx = mtmp.my = 0`
     * here. */
    /* C mon.c:3170-3171, BEFORE m_detach: a monster the hero could not see was
     * being remembered as an 'I'; its death retires that marker.  newsym does
     * NOT do it (display.c:1032/1093 re-show the remembered glyph out of
     * sight).  (The header's gap list used to name this as still missing; that
     * was stale from before this call landed, and now reads CLOSED.) */
    if (glyph_is_invisible_at(mx, my))
        unmap_object(mx, my);
    /* C mon.c:2711 mon_leaving_level -> newsym(mx, my): repaint the cell the
     * monster just vacated.  RNG-free. */
    newsym(mx, my);
    await relobj_md(mtmp);
    /* C mon.c:2786-2787, near the END of m_detach():
     *     if (mtmp->wormno) wormgone(mtmp);
     * remove_worm() above took the body off the map; this discards the segment
     * chain and RELEASES THE SLOT, which is the half that compounds: without
     * it wheads[]/wtails[] leak one entry per dead worm and get_wormno() stops
     * handing out the numbers C hands out.  Order is C's — after
     * mon_leaving_level, not instead of it; both fire for the same worm, and
     * toss_wsegs()'s `if (curr->wx)` guard is what keeps the second one from
     * repainting cells remove_worm() has already zeroed. */
    if (mtmp.wormno)
        wormgone_mk(mtmp);
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
    await extract_from_minvent_md(mon, obj, false, true);
    /* C steal.c:826-833, the saddle arm:
     *     if (unwornmask && mon->mtame && (unwornmask & W_SADDLE) != 0L
     *         && !obj->unpaid && costly_spot(omx, omy)
     *         && strchr(in_rooms(u.ux, u.uy, SHOPBASE), levl[omx][omy].roomno))
     *         obj->no_charge = 1;
     * NOT PORTED, and named rather than silently dropped: costly_spot() has no
     * js/ definition at all (grep returns none), and the arm needs a TAME
     * SADDLED steed dying inside a shop the hero is standing in.  It sets a
     * shop-billing flag and draws nothing. */
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
        place_object(obj, omx, omy);
        await stackobj(obj);
    }
    if ((mon.mhp | 0) >= 1 && unwornmask)
        update_mon_extrinsics_md(mon, obj, false, true);
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
            await extract_from_minvent_md(mtmp, gold, true, true);
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
const PM_ORC_NC = 72;
const PM_FOG_CLOUD_NC = 106;
const PM_VAMPIRE_BAT_NC = 129;
const PM_GIANT_NC = 169;
const PM_VAMPIRE_NC = 226;
const PM_VAMPIRE_LEADER_NC = 227;
const PM_VLAD_THE_IMPALER_NC = 228;
const PM_ELF_NC = 264;
const PM_DOPPELGANGER_NC = 270;
const PM_SANDESTIN_NC = 301;
const PM_CHAMELEON_NC = 327;
const PM_ARCHEOLOGIST_NC = 331;
const PM_WIZARD_NC = 343;
/* obj.h Is_dragon_scales/Is_dragon_mail otyp bands — select_newcham_form()'s
 * `case NON_PM:` dragon-armor check.  Same values js/makemon.js already
 * anchors independently (:2863-2864, :4788-4789) for its own muse_newcham_mon. */
const GRAY_DRAGON_SCALE_MAIL_NC = 101;
const YELLOW_DRAGON_SCALE_MAIL_NC = 110;
const GRAY_DRAGON_SCALES_NC = 111;
const YELLOW_DRAGON_SCALES_NC = 120;
/* select_newcham_form()'s doppelganger arm: the quest-guardian block runs
 * [PM_STUDENT, PM_APPRENTICE] and the two difficulty caps read mons[].difficulty
 * of Archon (26) and jabberwock (18).  Verified by name against
 * js/makemon_pmnames.json rather than taken from js/pm.generated.js, which is
 * still spelled with 3.7 monster names. */
const PM_ARCHON_NC = 125;
const PM_JABBERWOCK_NC = 178;
const PM_STUDENT_NC = 369;
const PM_APPRENTICE_NC = 382;
/* C monflag.h */
const M1_NOTAKE_NC = 0x00000800;
const M1_NOHEAD_NC = 0x00008000;
const M1_HUMANOID_NC = 0x00020000;
const M1_ANIMAL_NC = 0x00040000;
const M2_NOPOLY_NC = 0x00000001;
/* C monflag.h G_HELL / G_NOHELL — the geno-word "only in / never in Gehennom"
 * bits pick_nasty() filters on.  js/makemon.js holds the same two values but
 * does not export them. */
const G_HELL_NC = 0x0400;
const G_NOHELL_NC = 0x0800;

/* C mondata.h:66/54/55/93/166/157/213 and monst.h:217. */
function is_animal_nc(ptr) { return ((ptr.mflags1 | 0) & M1_ANIMAL_NC) !== 0; }
function humanoid_nc(ptr) { return ((ptr.mflags1 | 0) & M1_HUMANOID_NC) !== 0; }
function notake_nc(ptr) { return ((ptr.mflags1 | 0) & M1_NOTAKE_NC) !== 0; }
function has_head_nc(ptr) { return ((ptr.mflags1 | 0) & M1_NOHEAD_NC) === 0; }
function polyok_nc(ptr) { return ((ptr.mflags2 | 0) & M2_NOPOLY_NC) === 0; }
function is_placeholder_nc(mndx) {
    return mndx === PM_ORC_NC || mndx === PM_GIANT_NC
        || mndx === PM_ELF_NC || mndx === PM_HUMAN;
}
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
/* C mon.c:4995 isspecmon — shopkeeper / priest / vault guard / quest leader. */
function isspecmon_nc(mon) {
    return !!(mon.isshk || mon.ispriest || mon.isgd
              || (game.quest_status && mon.m_id === game.quest_status.leader_m_id));
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
        if (otmp.otyp === AMULET_OF_YENDOR || otmp.oartifact
            || otmp.otyp === BELL_OF_OPENING
            || otmp.otyp === CANDELABRUM_OF_INVOCATION
            || otmp.otyp === SPE_BOOK_OF_THE_DEAD)
            return 1;
    return 0;
}

function Protection_from_shape_changers_nc() {
    const p = game.u?.uprops?.[PROT_FROM_SHAPE_CHANGERS];
    return !!p && !!((p.intrinsic | 0) || (p.extrinsic | 0));
}

/* C mondata.h:192 pm_invisible(ptr) — an identity test against two forms, NOT
 * an mflags1 bit (PM_BLACK_LIGHT / PM_STALKER are this file's locals). */
function pm_invisible_nc(mndx) {
    return mndx === PM_STALKER || mndx === PM_BLACK_LIGHT;
}

/* C wizard.c:31 nasties[] — the 44 forms nasty() summons and that
 * select_newcham_form()'s PM_SANDESTIN and PM_DOPPELGANGER arms roll from.
 * Order is load-bearing: pick_nasty() indexes it with rn2(44), so a permuted
 * table draws the right RNG and returns the wrong monster.
 *
 * Written as literal mons[] indices because js/pm.generated.js still carries
 * NetHack 3.7 SPELLINGS — 5.0 renamed elf-lord -> elf-noble, Elvenking ->
 * elven monarch, ogre king -> ogre tyrant and vampire lord -> vampire leader,
 * so `PM_ELF_NOBLE` etc. simply do not exist there.  Every index below was
 * verified against js/makemon_pmnames.json by NAME, in C's order. */
const NASTIES_NC = [
    /* neutral */
    10,  /* cockatrice */         174, /* ettin */
    153, /* stalker */            177, /* minotaur */
    235, /* owlbear */            115, /* purple worm */
    117, /* xan */                225, /* umber hulk */
    232, /* xorn */               120, /* zruty */
    83,  /* leocrotta */          86,  /* baluchitherium */
    237, /* carnivorous ape */    155, /* fire elemental */
    178, /* jabberwock */         259, /* iron golem */
    58,  /* ochre jelly */        208, /* green slime */
    39,  /* displacer beast */    211, /* genetic engineer */
    /* chaotic */
    149, /* black dragon */       146, /* red dragon */
    186, /* arch-lich */          227, /* vampire leader */
    49,  /* master mind flayer */ 213, /* disenchanter */
    42,  /* winged gargoyle */    175, /* storm giant */
    224, /* Olog-hai */           268, /* elf-noble */
    269, /* elven monarch */      205, /* ogre tyrant */
    281, /* captain */            40,  /* gremlin */
    /* lawful */
    145, /* silver dragon */      148, /* orange dragon */
    151, /* green dragon */       152, /* yellow dragon */
    202, /* guardian naga */      172, /* fire giant */
    122, /* Aleax */              121, /* couatl */
    291, /* horned devil */       293, /* barbed devil */
];

/* C wizard.c:537 pick_nasty(difcap) — "also used by newcham()".
 *
 *     int alt, res = ROLL_FROM(nasties);
 *     if (Is_rogue_level(&u.uz) && !isupper(monsym(&mons[res])))
 *         res = ROLL_FROM(nasties);
 *     alt = res;
 *     if (genocided || (difcap > 0 && mons[res].difficulty >= difcap)
 *         || (mons[res].geno & (Inhell ? G_NOHELL : G_HELL)) != 0)
 *         alt = big_to_little(res);
 *     if (alt != res && !genocided(alt)) {
 *         ... only non-juveniles can become the alternate choice ...
 *         res = alt;
 *     }
 *     return res;
 *
 * ROLL_FROM(a) (hack.h) is a[rn2(SIZE(a))], so the RNG cost is one rn2(44),
 * plus a second one only on the rogue level.  The juvenile filter compares the
 * ALTERNATE's neutral pmname against "baby " and the " hatchling"/" pup"/" cub"
 * suffixes, exactly as C's strncmp/strrchr pair does. */
export function pick_nasty(difcap) {
    let res = NASTIES_NC[rn2(NASTIES_NC.length)];

    /* We want monsters represented by uppercase on rogue level,
       but we don't try very hard. */
    if (Is_rogue_level(game.u?.uz) && !monsym_isupper_nc(res))
        res = NASTIES_NC[rn2(NASTIES_NC.length)];

    /* if genocided or too difficult or out of place, try a substitute
       when a suitable one exists (arch-lich -> master lich, master mind
       flayer -> mind flayer), but the substitutes are likely to be
       genocided too */
    let alt = res;
    const resGeno = MONS_ROWS[res][3] | 0;
    if (mvitals_genod_nc(res)
        || (difcap > 0 && (MONS_ROWS[res][2] | 0) >= difcap)
        /* note: nasty() -> makemon() ignores G_HELL|G_NOHELL; arch-lich and
           master lich are both flagged as hell-only; this filtering demotes
           arch-lich to master lich when outside of Gehennom (unless the
           latter has been genocided) */
        || (resGeno & (Inhell() ? G_NOHELL_NC : G_HELL_NC)) !== 0)
        alt = big_to_little(res);
    if (alt !== res && !mvitals_genod_nc(alt)) {
        const mnam = permonstTemplate(alt).pmnames[NEUTRAL_NC] || '';
        const lastspace = mnam.lastIndexOf(' ');
        const tail = lastspace < 0 ? null : mnam.slice(lastspace);

        /* only non-juveniles can become alternate choice */
        if (mnam.slice(0, 5) !== 'baby '
            && (tail === null
                || (tail !== ' hatchling' && tail !== ' pup' && tail !== ' cub')))
            res = alt;
    }

    return res;
}


export async function nasty(summoner) {
    const u = game.u;
    /* C:597 — "when a monster casts the 'summon nasties' spell, it gives
     * feedback; when random post-Wizard harassment casts that, we give it". */
    const mmflags = summoner ? MM_NOMSG : 0 /* NO_MM_FLAGS */;
    const MAXNASTIES = 10; /* C:601 — more than this can be created */
    let count, tmp, makeindex, s_cls, m_cls, difcap, trylimit, castalign;
    let mtmp;
    const bypos = { x: 0, y: 0 };

    /* C:603-605 — "some candidates may be created in groups, so simple count
     * of non-null makemon() return is inadequate". */
    const census = monster_census(false);

    if (!rn2(10) && Inhell()) {
        /* C:608-609 — this might summon a demon prince or lord */
        count = await msummon(null); /* summons like WoY */
    } else {
        count = 0;
        const sdata = summoner ? MONS_ROWS[(summoner.mnum ?? summoner.mndx ?? 0) | 0] : null;
        s_cls = sdata ? (sdata[0] | 0) : 0;
        difcap = sdata ? (sdata[2] | 0) : 0;          /* spellcasters */
        castalign = sdata ? Math.sign(sdata[4] | 0) : 0;
        tmp = ((u.ulevel | 0) > 3) ? Math.trunc((u.ulevel | 0) / 3) : 1;
        /* C:616-619 — if we don't have a casting monster, nasties appear around
         * the hero, otherwise around the spot the summoner thinks she's at. */
        bypos.x = u.ux | 0;
        bypos.y = u.uy | 0;
        for (let i = rnd(tmp); i > 0 && count < MAXNASTIES; --i) {
            for (let j = 0; j < 20; j++) {
                /* C:640-652 — "Don't create more spellcasters of the monster's
                 * level or higher--avoids chain summoners filling up the
                 * level."  C's `goto nextj` is this loop's `continue`. */
                trylimit = 10 + 1; /* 10 tries */
                let out_of_tries = false;
                do {
                    if (!--trylimit) { out_of_tries = true; break; }
                    makeindex = pick_nasty(difcap);
                    m_cls = MONS_ROWS[makeindex][0] | 0;
                } while ((difcap > 0 && (MONS_ROWS[makeindex][2] | 0) >= difcap
                          && attacktype(permonstTemplate(makeindex), AT_MAGC_NC))
                         || (s_cls === S_DEMON && m_cls === S_ANGEL_NC)
                         || (s_cls === S_ANGEL_NC && m_cls === S_DEMON));
                if (out_of_tries)
                    continue;   /* C: goto nextj */
                /* C:653-656 — do this after picking the monster to place. */
                if (summoner) {
                    const mm = enexto_out(summoner.mux | 0, summoner.muy | 0,
                                          permonstTemplate(makeindex));
                    if (!mm)
                        continue;
                    bypos.x = mm.x;
                    bypos.y = mm.y;
                }
                /* C:657-660 — "this honors genocide but overrides extinction;
                 * it ignores inside-hell-only & outside-hell-only". */
                mtmp = await makemon(permonstTemplate(makeindex), bypos.x, bypos.y, mmflags);
                if (mtmp) {
                    mtmp.msleeping = 0;
                    mtmp.mpeaceful = 0;
                    mtmp.mtame = 0;
                    set_malign(mtmp);
                } else {
                    /* C:663-679 — random monster to substitute for a genocided
                     * selection, then unmakemon() if it is a chain-summoning
                     * spellcaster or the wrong side of the demon/angel line.
                     * unmakemon() has no js body at all, so this arm cannot be
                     * completed; it is reachable only when the DIRECTLY chosen
                     * nasty has been genocided. */
                    throw new Error('nasty: the genocided-substitute arm is unported (wizard.c:663-679)');
                }

                if (mtmp) {
                    const mndx_new = (mtmp.mnum ?? mtmp.mndx ?? 0) | 0;
                    /* C:682-693 — creating an arch-lich or Archon caps the
                     * difficulty of every later pick. */
                    if (mndx_new === PM_ARCH_LICH_NC || mndx_new === PM_ARCHON_NC) {
                        tmp = Math.min(MONS_ROWS[PM_ARCHON_NC][2] | 0,      /* A:26 */
                                       MONS_ROWS[PM_ARCH_LICH_NC][2] | 0); /* L:31 */
                        if (!difcap || difcap > tmp)
                            difcap = tmp;
                    }
                    /* C:694-695 — delay first use of spell or breath attack. */
                    mtmp.mspec_used = rnd(4);

                    if (++count >= MAXNASTIES
                        || (MONS_ROWS[mndx_new][4] | 0) === 0
                        || Math.sign(MONS_ROWS[mndx_new][4] | 0) === castalign)
                        break;
                }
            } /* for j */
        } /* for i */
    }

    if (count)
        count = monster_census(false) - census;
    return count;
}
/* monsters.h ordinal, verified by NAME against js/makemon_pmnames.json (row 186
 * is "arch-lich"); PM_ARCHON_NC above is the companion. */
const PM_ARCH_LICH_NC = 186;
const S_ANGEL_NC = 27;    /* defsym.h:326 MONSYM(27, 'A', ANGEL, S_ANGEL, ...) */
const AT_MAGC_NC = 255;   /* monattk.h:29 */

/* C monflag.h:214 `enum mgender { MALE, FEMALE, NEUTRAL, ... }` — NEUTRAL is
 * the pmnames[] slot holding a form's canonical name. */
const NEUTRAL_NC = 2;

/* C role.c urole[].guardnum, in roles[] order (Arc, Bar, Cav, Hea, Kni, Mon,
 * Pri, Rog, Ran, Sam, Tou, Val, Wiz — Rogue precedes Ranger).  Read off role.c
 * and resolved to 5.0 mons[] rows by NAME via js/makemon_pmnames.json; note
 * ninja (378) is NOT a guardian and is deliberately absent. */
const ROLE_GUARDNUM_NC = [
    369, /* Arc: student */      370, /* Bar: chieftain */
    371, /* Cav: neanderthal */  372, /* Hea: attendant */
    373, /* Kni: page */         374, /* Mon: abbot */
    375, /* Pri: acolyte */      377, /* Rog: thug */
    376, /* Ran: hunter */       379, /* Sam: roshi */
    380, /* Tou: guide */        381, /* Val: warrior */
    382, /* Wiz: apprentice */
];
/* C gu.urole.guardnum.  js/makemon.js keys the same lookup on
 * game.flags.initrole; NON_PM when the role is unknown, which makes the
 * "avoid own role's guardian" test simply never fire. */
function guardnum_nc() {
    const roleIx = (game.flags?.initrole ?? -1) | 0;
    return (roleIx >= 0 && roleIx < ROLE_GUARDNUM_NC.length)
        ? ROLE_GUARDNUM_NC[roleIx] : NON_PM;
}

/* C mon.c:4941 pickvampshape(mon) — which form a vampire takes. */
function pickvampshape(mon) {
    let mndx = mon.cham | 0;
    let wolfchance = 10;
    /* avoid picking monsters with lowercase display symbols ('d' for wolf
       and 'v' for fog cloud) on rogue level */
    const uppercase_only = Is_rogue_level(game.u?.uz);

    switch (mndx) {
    case PM_VLAD_THE_IMPALER_NC:
        /* ensure Vlad can keep carrying the Candelabrum */
        if (mon_has_special_nc(mon))
            break; /* leave mndx as is */
        wolfchance = 3;
        /* FALLTHRU */
    case PM_VAMPIRE_LEADER_NC: /* vampire lord or Vlad can become wolf */
        if (!rn2(wolfchance) && !uppercase_only
            /* don't pick a walking form if that would lead to immediate
               drowning or immolation and reversion to vampire form */
            && !is_pool_or_lava(mon.mx, mon.my)) {
            mndx = PM_WOLF_NC;
            break;
        }
        /* FALLTHRU */
    case PM_VAMPIRE_NC: /* any vampire can become fog or bat */
        mndx = (!rn2(4) && !uppercase_only) ? PM_FOG_CLOUD_NC : PM_VAMPIRE_BAT_NC;
        break;
    }

    /* return to base form if chosen poly target has been genocided
       or randomly if already in an alternate form (to prevent always
       switching back and forth between bat and fog) */
    if (mvitals_genod_nc(mndx)
        || ((mon.mnum | 0) !== (mon.cham | 0) && !rn2(4)))
        return mon.cham | 0;

    return mndx;
}

/* C mon.c:5228 accept_newcham_form(mon, mndx) — returns the permonst to take on,
 * or null.  JS returns the mndx (or NON_PM); callers resolve via
 * permonstTemplate, since this port identifies forms by index not pointer. */
function accept_newcham_form(mon, mndx) {
    if (mndx === NON_PM)
        return NON_PM;
    const mdat = permonstTemplate(mndx);
    if (!mdat)
        return NON_PM;
    if (mvitals_genod_nc(mndx))
        return NON_PM;
    if (is_placeholder_nc(mndx))
        return NON_PM;
    /* select_newcham_form() might deliberately pick a player character type
       (random selection never does) which polyok() rejects */
    if (is_mplayer_nc(mndx))
        return mndx;
    /* shapeshifters are rejected by polyok() but allow a shapeshifter
       to take on its 'natural' form */
    if (is_shapeshifter_nc(mdat) && ismnum(mon.cham | 0) && mndx === (mon.cham | 0))
        return mndx;
    /* polyok() rules out M2_PNAME, M2_WERE, and all humans except Kops */
    return polyok_nc(mdat) ? mndx : NON_PM;
}

/* C mon.c:5117 validspecmon(mon, mndx) */
function validspecmon(mon, mndx) {
    if (mndx === NON_PM)
        return true; /* caller wants random */
    if (accept_newcham_form(mon, mndx) === NON_PM)
        return false; /* geno'd or !polyok */
    if (isspecmon_nc(mon)) {
        const ptr = permonstTemplate(mndx);
        /* reject notake because object manipulation is expected
           and nohead because speech capability is expected */
        if (notake_nc(ptr) || !has_head_nc(ptr))
            return false;
    }
    return true; /* potential new form is ok */
}

/* C mon.c:4855 pick_animal() — ga.animal_list is built once from every
 * is_animal() permonst in [LOW_PM, SPECIAL_PM) and cached for the process. */
let _animal_list_nc = null;
function pick_animal() {
    if (!_animal_list_nc) {
        const list = [];
        for (let i = LOW_PM; i < SPECIAL_PM_NC; i++) {
            if (is_animal_nc(permonstTemplate(i)))
                list.push(i);
        }
        _animal_list_nc = list;
    }
    let res = _animal_list_nc[rn2(_animal_list_nc.length)];
    /* rogue level should use monsters represented by uppercase letters only,
       but since chameleons aren't generated there we don't retry a lot */
    if (Is_rogue_level(game.u?.uz) && !monsym_isupper_nc(res))
        res = _animal_list_nc[rn2(_animal_list_nc.length)];
    return res;
}

/* C mon.c:5157 select_newcham_form(mon) — pick the mndx of the next form.
 *
 * The quest-guardian arm's [PM_STUDENT, PM_APPRENTICE] span and gu.urole.guardnum
 * are read from ROLE_GUARDNUM_NC below rather than js/makemon.js's ROLE_GUARDNUM,
 * which is stale: its entries (379..393) run off the end of the 383-row 5.0
 * mons[] table.  That is a live defect in peaceMinded(), not one this port
 * introduces, and it is left alone here rather than fixed in passing. */
function select_newcham_form(mon) {
    let mndx = NON_PM;
    let tryct;

    switch (mon.cham | 0) {
    case PM_SANDESTIN_NC:
        if (rn2(7))
            mndx = pick_nasty((MONS_ROWS[PM_ARCHON_NC][2] | 0) - 1);
        break;
    case PM_DOPPELGANGER_NC:
        if (!rn2(7)) {
            mndx = pick_nasty((MONS_ROWS[PM_JABBERWOCK_NC][2] | 0) - 1);
        } else if (rn2(3)) { /* role monsters */
            mndx = tt_doppel(mon);
        } else if (!rn2(3)) { /* quest guardians */
            mndx = rn1(PM_APPRENTICE_NC - PM_STUDENT_NC + 1, PM_STUDENT_NC);
            /* avoid own role's guardian */
            if (mndx === guardnum_nc())
                mndx = NON_PM;
        } else { /* general humanoids */
            tryct = 5;
            do {
                mndx = rn1(SPECIAL_PM_NC - LOW_PM, LOW_PM);
                const ptr = permonstTemplate(mndx);
                if (humanoid_nc(ptr) && polyok_nc(ptr))
                    break;
            } while (--tryct > 0);
            if (!tryct)
                mndx = NON_PM;
        }
        break;
    case PM_CHAMELEON_NC:
        if (!rn2(3))
            mndx = pick_animal();
        break;
    case PM_VLAD_THE_IMPALER_NC:
    case PM_VAMPIRE_LEADER_NC:
    case PM_VAMPIRE_NC:
        mndx = pickvampshape(mon);
        break;
    case NON_PM: { /* ordinary — dragon-scale-driven form, no RNG */
        /* C mon.c:5196-5204.  Was an empty branch: every EXISTING caller of
         * this function arrives with mon.cham already set to a real
         * shapechanger index (PM_SANDESTIN/DOPPELGANGER/CHAMELEON/vampire
         * family), so `mon.cham === NON_PM` was unreachable here until
         * newcham()'s own guard above was fixed to fall through for an
         * ordinary monster — see that fix's comment.  Deterministic: a
         * monster wearing dragon scales or dragon scale mail becomes the
         * matching dragon type; draws no RNG either way. */
        const m_armr = which_armor(mon, W_ARM);
        if (m_armr) {
            const otyp = m_armr.otyp | 0;
            if (otyp >= GRAY_DRAGON_SCALES_NC && otyp <= YELLOW_DRAGON_SCALES_NC)
                mndx = PM_GRAY_DRAGON + (otyp - GRAY_DRAGON_SCALES_NC);
            else if (otyp >= GRAY_DRAGON_SCALE_MAIL_NC && otyp <= YELLOW_DRAGON_SCALE_MAIL_NC)
                mndx = PM_GRAY_DRAGON + (otyp - GRAY_DRAGON_SCALE_MAIL_NC);
        }
        break;
    }
    }

    /* C mon.c:5209-5211 wizard-mode mon_polycontrol: wizard mode is not
     * modelled by this port, and the branch draws no RNG. */

    /* if no form was specified above, pick one at random now */
    if (mndx === NON_PM) {
        tryct = 50;
        do {
            mndx = rn1(SPECIAL_PM_NC - LOW_PM, LOW_PM);
        } while (--tryct > 0 && !validspecmon(mon, mndx)
                 /* try harder to select uppercase monster on rogue level */
                 && (tryct > 40 && Is_rogue_level(game.u?.uz)
                     && !monsym_isupper_nc(mndx)));
    }
    return mndx;
}

/* C mon.c:5256 mgender_from_permonst(mtmp, mdat) — a shapechanger might take on
 * a shape that forces a gender change. */
function mgender_from_permonst(mtmp, mdat) {
    if (((mdat.mflags2 | 0) & M2_MALE) !== 0) {
        mtmp.female = 0;
    } else if (((mdat.mflags2 | 0) & M2_FEMALE) !== 0) {
        mtmp.female = 1;
    } else if (((mdat.mflags2 | 0) & M2_NEUTER) === 0) {
        /* usually leave as-is; same chance to change as polymorphing hero;
           vampires use controlled shapechange and don't undergo gender change */
        if (!rn2(10) && !(is_vampire_nc(mdat) || is_vampshifter_nc(mtmp)))
            mtmp.female = mtmp.female ? 0 : 1;
    }
}


/* C monst.h:210-211 MON_WEP(mon) == mon->mw, MON_NOWEP(mon) == (mon->mw = 0).
 * js/uhitm.js:6064 is what writes the slot (mon_wield_item) and js/uhitm.js:5445
 * setmnotwielded is what clears it; this is the read. */
function MON_WEP_nc(mon) { return mon.mw || null; }
/* C monst.h:214 DEADMONSTER(mon) == mon->mhp < 1. */
function DEADMONSTER_nc(mon) { return (mon.mhp | 0) < 1; }
/* C monattk.h:28 AT_WEAP == 254 — the same literal js/dochug.js:165 and
 * js/dog.js:48 already carry (it is NOT 1; see js/monmove.js:1350). */
const AT_WEAP_NC = 254;
/* C monflag.h M2_ROCKTHROW / mondata.h throws_rocks(ptr).  Same literal this
 * file already spells at :17596 for its own mflags2 decode. */
const M2_ROCKTHROW_NC = 0x08000000;
function throws_rocks_nc(ptr) { return ((ptr.mflags2 | 0) & M2_ROCKTHROW_NC) !== 0; }

function obj_extract_from_minvent_nc(mon, obj) {
    let prev = null, curr = mon.minvent;
    while (curr && curr !== obj) { prev = curr; curr = curr.nobj; }
    if (!curr)
        return; /* C extract_nobj's impossible("extract_nobj: object lost") */
    if (prev)
        prev.nobj = curr.nobj;
    else
        mon.minvent = curr.nobj;
    obj.where = 0;
    obj.nobj = null;
    obj.ocarry = null;
}

async function possibly_unwield_nc(mon, polyspot) {
    let obj;
    const mw_tmp = MON_WEP_nc(mon);

    if (!mw_tmp)
        return;
    for (obj = mon.minvent; obj; obj = obj.nobj)
        if (obj === mw_tmp)
            break;
    if (!obj) { /* The weapon was stolen or destroyed */
        mon.mw = null; /* C MON_NOWEP(mon) */
        mon.weapon_check = NEED_WEAPON;
        return;
    }
    if (!attacktype(mon.data, AT_WEAP_NC)) {
        setmnotwielded(mon, mw_tmp);
        mon.weapon_check = NO_WEAPON_WANTED;
        /* if we're going to call distant_name(), do so before extract_self */
        if (cansee(mon.mx | 0, mon.my | 0)) {
            await pline_mon(mon, "%s drops %s.", Monnam(mon),
                      (await distant_name_nc(obj, doname_nc)));
            newsym(mon.mx | 0, mon.my | 0);
        }
        obj_extract_from_minvent_nc(mon, obj); /* C obj_extract_self(obj) */
        /* might be dropping object into water or lava */
        if (!await flooreffects(obj, mon.mx | 0, mon.my | 0, "drop")) {
            if (polyspot)
                bypass_obj(obj);
            place_object(obj, mon.mx | 0, mon.my | 0);
            await stackobj(obj);
        }
        return;
    }
    /* The remaining case where there is a change is where a monster is
     * polymorphed into a stronger/weaker monster with a different choice of
     * weapons.  ... Note that if there is no change, setting the check to
     * NEED_WEAPON is harmless. */
    if (!(mwelded(mw_tmp) && (mon.weapon_check | 0) === NO_WEAPON_WANTED))
        mon.weapon_check = NEED_WEAPON;
}

async function mselftouch_nc(mon, arg, byplayer) {
    const mwep = MON_WEP_nc(mon);

    if (mwep && (mwep.otyp | 0) === CORPSE
        && ((mwep.corpsenm | 0) === PM_COCKATRICE
            || (mwep.corpsenm | 0) === PM_CHICKATRICE)
        && !Resists_Elem(mon, STONE_RES)) {
        /* C minstapetrify(): forms covered by poly_when_stoned() become a
         * stone golem immediately.  This branch is synchronous (mon_to_stone
         * -> newcham) and must complete before the async death alternatives. */
        if (poly_when_stoned(mon.data)) {
            await newcham(mon, PM_STONE_GOLEM, 0);
            return;
        }
        if (!byplayer) {
            /* C minstapetrify(mon, FALSE): the monster-caused terminal path
             * is synchronous and its existing monstone helper preserves the
             * statue/death RNG.  Player-caused xkilled remains async below. */
            if (canseemon(mon))
                pline('%s turns to stone.', Monnam(mon));
            await monstone(mon);
            return;
        }
        /* C trap.c:3922-3931 — the player-caused path uses the same
         * petrification transition; mwepgone then removes the corpse if the
         * monster survives through life-saving.  Message delivery is deferred
         * here because this call site is synchronous during polymorph. */
        void arg;
        await monstone(mon);
        if (mon.mhp > 0 && !which_armor(mon, W_ARMG) && !Resists_Elem(mon, STONE_RES))
            mwepgone(mon);
    }
}

/* C mon.c:5806-5919 usmellmon().  This is deliberately synchronous: newcham
 * is synchronous and the display layer's pline() records the message before
 * its returned promise can suspend. */
export function usmellmon(mdat) {
    if (!mdat || !olfaction(game.youmonst?.data))
        return false;

    const mndx = (mdat.pmidx ?? mdat.mndx ?? mdat.mnum ?? -1) | 0;
    let nonspecific = false;
    switch (mndx) {
    case PM_ROTHE:
    case PM_MINOTAUR:
        pline('You notice a bovine smell.');
        return true;
    case PM_CAVEMAN: /* C PM_CAVE_DWELLER */
    case PM_BARBARIAN:
    case PM_NEANDERTHAL:
        pline('You smell body odor.');
        return true;
    case PM_HORNED_DEVIL:
    case PM_BALROG:
    case PM_ASMODEUS:
    case PM_DISPATER:
    case PM_YEENOGHU:
    case PM_ORCUS:
        return false;
    case PM_HUMAN_WEREJACKAL:
    case PM_HUMAN_WERERAT:
    case PM_HUMAN_WEREWOLF:
    case PM_WEREJACKAL:
    case PM_WERERAT:
    case PM_WEREWOLF:
    case PM_OWLBEAR:
        pline("You detect an odor reminiscent of an animal's den.");
        return true;
    case PM_STEAM_VORTEX:
        pline('You smell steam.');
        return true;
    case PM_GREEN_SLIME:
        pline('Something stinks.');
        return true;
    case PM_VIOLET_FUNGUS:
    case PM_SHRIEKER:
        pline('You smell mushrooms.');
        return true;
    case PM_WHITE_UNICORN:
    case PM_GRAY_UNICORN:
    case PM_BLACK_UNICORN:
    case PM_JELLYFISH:
        return false;
    default:
        nonspecific = true;
        break;
    }

    if (nonspecific) {
        switch (mdat.mlet | 0) {
        case 4: /* S_DOG */
            pline('You notice a dog smell.');
            return true;
        case 30: /* S_DRAGON */
            pline('You smell a dragon!');
            return true;
        case 32: /* S_FUNGUS */
            pline('Something smells moldy.');
            return true;
        case 21: /* S_UNICORN */
            pline('You detect a%s odor reminiscent of a stable.',
                  mndx === PM_PONY ? 'n' : ' strong');
            return true;
        case 52: /* S_ZOMBIE */
            pline('You smell rotting flesh.');
            return true;
        case 57: /* S_EEL */
            pline('You smell fish.');
            return true;
        case 15: { /* S_ORC */
            const M2_ORC = 0x00000080;
            const currentFormIsOrc = !!((game.youmonst?.data?.mflags2 | 0)
                                         & M2_ORC);
            const heroIsOrc = Upolyd(game.u)
                ? currentFormIsOrc
                : ((game.urace?.mnum | 0) === PM_ORC);
            pline(heroIsOrc ? 'You notice an attractive smell.'
                            : 'A foul stench makes you feel a little nauseated.');
            return true;
        }
        default:
            break;
        }
    }
    return false;
}

/* C mon.c:5277 newcham(mtmp, mdat, ncflags) — make a chameleon take on another
 * shape, or a polymorph target become a different monster.  Returns 1 if the
 * form actually changed.  `mdat` is an mndx here (NON_PM/null = caller wants a
 * random shape), matching this port's index-not-pointer permonst convention. */
export async function newcham(mtmp, mdat, ncflags) {
    let mndx;
    let tryct;
    const olddata = mtmp.mnum | 0;
    let newmndx = (mdat === null || mdat === undefined) ? NON_PM : (mdat | 0);

    const polyspot = ((ncflags | 0) & NC_VIA_WAND_OR_SPELL) !== 0;
    const msg = ((ncflags | 0) & NC_SHOW_MSG) !== 0;
    const seenorsensed = canspotmon(mtmp);

    /* C mon.c:5292-5306 — the `cham == NON_PM` (not-a-shapechanger) guards:
     * Riders and birth-limited species are immune, and a cancelled shapechanger
     * is uncancelled first.
     *
     * WAS an unconditional `return 0` for this whole branch.  That is correct
     * for every caller IN THIS FILE (mklev.js:5530/9857/14491/16509 and
     * decide_to_shapeshift above) — a chameleon/doppelganger/vampshifter
     * always arrives here with mtmp.cham already set to a real shapechanger
     * index, so none of them ever enters this branch and its contents were
     * dead code for them either way.  It stopped being universally true when
     * js/makemon.js's muse.c ports (MUSE_POLY_TRAP / MUSE_WAN_POLYMORPH /
     * MUSE_POT_POLYMORPH) started calling this newcham() for an ORDINARY
     * monster — cham === NON_PM, not a pre-existing shapechanger — and the
     * blanket return silently no-op'd their whole polymorph (use_misc board
     * rec#31/#32: C consumed 3 RNG draws and returned a changed monster; this
     * stub consumed 0 and returned unchanged).  is_rider() below is this
     * file's own existing stub (always false) — not a new simplification,
     * just inherited. */
    if ((mtmp.cham | 0) === NON_PM) {
        if (is_rider(mtmp.data))
            return 0;
        if (mbirth_limit(olddata) < MAXMONNO)
            return 0;
        if (mtmp.mcan && !Protection_from_shape_changers_nc()) {
            mtmp.cham = pm_to_cham(olddata);
            if ((mtmp.cham | 0) !== NON_PM)
                mtmp.mcan = 0;
        }
    }

    let oldname;
    if (msg) {
        oldname = upstart(x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_THE,
                                    null, SUPPRESS_SADDLE, false));
    }

    /* C mon.c:5314-5320 always computes l_oldname immediately after oldname,
     * even though most live callers never read it.  Under hallucination this
     * is observable: x_monnam() consumes the display RNG while preparing the
     * swallow/vampshifter fallback.  Keep the call (and its suppression arm)
     * so the later newsym/noname_monnam sequence starts at the same display
     * draw as C. */
    const l_oldname = x_monnam(mtmp, ARTICLE_THE, null,
        mtmp.mextra?.mgivenname ? SUPPRESS_SADDLE : 0, false);

    /* mdat = 0 -> caller wants a random monster shape */
    if (newmndx === NON_PM) {
        /* select_newcham_form() loops when resorting to random but it doesn't
           always pick that so we still retry here too */
        tryct = 20;
        do {
            mndx = select_newcham_form(mtmp);
            newmndx = accept_newcham_form(mtmp, mndx);
            /* for the first several tries we require upper-case on the rogue
               level (after that, we take whatever we get) */
            if (tryct > 15 && Is_rogue_level(game.u?.uz)
                && newmndx !== NON_PM && !monsym_isupper_nc(newmndx))
                newmndx = NON_PM;
            if (newmndx !== NON_PM)
                break;
        } while (--tryct > 0);
        if (!tryct)
            return 0;
    } else if (mvitals_genod_nc(newmndx)) {
        return 0; /* passed in mdat is genocided */
    }

    if (newmndx === olddata)
        return 0; /* still the same monster */

    const newdata = permonstTemplate(newmndx);
    mgender_from_permonst(mtmp, newdata);

    /* C mon.c:5356-5361 — throw a long worm's tail away and put the head back.
     * Reached when decide_to_shapeshift() turns a shapeshifter that had taken
     * long-worm form into something else; without it the new form keeps a
     * stale wormno and worm_move()s (rnd(5)/d(2,2)) that C never draws. */
    if (mtmp.wormno) {
        const wmx = mtmp.mx, wmy = mtmp.my;
        wormgone_mk(mtmp);
        place_monster(mtmp, wmx, wmy);
    }
    /* C mon.c:5344-5352 — endgame mplayer rank-title strip and seemimic()
     * revert: no RNG, and neither applies here. */

    /* (this code used to try to adjust the monster's health based on a normal
       one of its type but there are too many special cases, so just give the
       new form the same proportion of HP as its old one had) */
    const hpn = mtmp.mhp | 0;
    const hpd = mtmp.mhpmax | 0;
    /* set level and hit points */
    newMonHp(mtmp, newmndx);
    /* new hp: same fraction of max as before */
    mtmp.mhp = Math.trunc((hpn * (mtmp.mhp | 0)) / hpd);
    /* sanity check (potential overflow) */
    if (mtmp.mhp < 0 || mtmp.mhp > (mtmp.mhpmax | 0))
        mtmp.mhp = mtmp.mhpmax | 0;
    /* unlikely but not impossible; a 1HD creature with 1HP that changes into a
       0HD creature will require this statement */
    if (!mtmp.mhp)
        mtmp.mhp = 1;

    /* take on the new form... C mon.c:5385 set_mon_data(mtmp, mdat).
     * NOTE: this function's `olddata` is an MNDX (`mtmp.mnum | 0`, line above),
     * not a permonst — pm_invisible_nc(olddata) below reads it that way.  The
     * light-source swap needs the permonst, so grab it before it is replaced. */
    const oldPermonst = mtmp.data;
    set_mon_data(mtmp, newdata);

    /* C mon.c:5387-5395 — the leash arm: a just-created monster is not
     * leashed, so m_unleash/update_inventory cannot fire.  No RNG.
     *
     * C mon.c:5397-5405 — the light-source swap:
     *     if (emits_light(olddata) != emits_light(mtmp->data)) {
     *         if (emits_light(olddata)) del_light_source(LS_MONSTER, ...);
     *         if (emits_light(mtmp->data)) new_light_source(mtmp->mx, mtmp->my,
     *                          emits_light(mtmp->data), LS_MONSTER, ...);
     *     }
     * This block USED to carry a comment saying a just-created monster "is
     * neither leashed nor a registered light source".  The second half of that
     * stopped being true when makemon.c:1347's new_light_source landed: C
     * registers the source at makemon.c:1347, BEFORE the shapechanger arm at
     * makemon.c:1356 calls newcham, so a chameleon that rolls a gold dragon
     * (or a yellow light, or a fire elemental) arrives here with olddata dark
     * and newdata lit and must gain a source.  RNG-free either way. */
    {
        const oldLight = emits_light(oldPermonst);
        const newLight = emits_light(newdata);
        if (oldLight !== newLight) {
            if (oldLight)
                del_light_source(LS_MONSTER, monst_to_any(mtmp));
            if (newLight)
                new_light_source(mtmp.mx | 0, mtmp.my | 0, newLight,
                                 LS_MONSTER, monst_to_any(mtmp));
        }
    }

    if (!mtmp.perminvis || pm_invisible_nc(olddata))
        mtmp.perminvis = pm_invisible_nc(newmndx) ? 1 : 0;
    mtmp.minvis = mtmp.invis_blkd ? 0 : mtmp.perminvis;
    if (mtmp.mundetected)
        hideunder(mtmp);

    /* C mon.c:5411-5443 — the u.ustuck / u.uswallow arms cannot apply to a
     * monster makemon is still building. */

    if (newmndx === PM_LONG_WORM && (mtmp.wormno = get_wormno()) !== 0) {
        initworm(mtmp, rn2(5));
        place_worm_tail_randomly(mtmp, mtmp.mx | 0, mtmp.my | 0);
    }

    mtmp.meverseen = 0; /* never seen mon in present shape */
    newsym(mtmp.mx, mtmp.my);

    /* C mon.c:5455-5471 — the msg arms.  WAS a no-op comment claiming this is
     * unreachable under NO_NC_FLAGS: true only for makemon's shapechanger-
     * creation caller.  decide_to_shapeshift() (:16724 below, C mon.c:4928)
     * calls newcham(mon, ptr, NC_SHOW_MSG) on the live per-turn shapeshift
     * path, so `msg` DOES carry true there and this block was being silently
     * dropped for every such call. */
    if (msg) {
        if (!canspotmon(mtmp)) { /* can't see or sense it now */
            if (seenorsensed) /* could see or sense it before */
                pline_mon(mtmp, "%s disappears!", oldname);
            /* C mon.c:5465: smell the new form when it cannot be spotted. */
            usmellmon(newdata);
        } else if (!seenorsensed) { /* couldn't see/sense before, can now */
            const mnm = x_monnam(mtmp, mtmp.mtame ? ARTICLE_YOUR : ARTICLE_A,
                                  null, 0, false);
            pline_mon(mtmp, "%s appears!", upstart(mnm));
        } else { /* saw/sensed it before, still see/sense it now */
            pline_mon(mtmp, "%s turns into %s!", oldname,
                      /* "a <monster type>" even if it has a name assigned */
                      noname_monnam(mtmp, ARTICLE_A));
        }
    }

    /* when polymorph trap/wand/potion produces a vampire, turn it into a
       full-fledged vampshifter unless shape-changing is blocked */
    if ((mtmp.cham | 0) === NON_PM && is_vampire_nc(newdata)
        && !Protection_from_shape_changers_nc())
        mtmp.cham = pm_to_cham(newmndx);

    await possibly_unwield_nc(mtmp, polyspot); /* might lose use of weapon */
    /* C worn.c:1177 mon_break_armor — the real port, js/trap.js:8138.  Several
     * of ITS OWN helpers are stubs in that file (breakarm/sliparm/m_lose_armor/
     * can_saddle), which is a pre-existing gap in js/trap.js and not this
     * change's to fix; calling it is still strictly closer to C than skipping
     * it, and it draws no RNG on any arm reachable without a steed. */
    await mon_break_armor(mtmp, polyspot);
    if (!((mtmp.misc_worn_check | 0) & W_ARMG))
        await mselftouch_nc(mtmp, "No longer petrify-resistant, ",
                      !(game.context && game.context.mon_moving));
    check_gear_next_turn(mtmp);

    /* This ought to re-test can_carry() on each item in the inventory rather
     * than just checking ex-giants & boulders, but that'd be pretty expensive
     * to perform.  If implemented, then perhaps minvent should be sorted in
     * order to drop heaviest items first. */
    /* former giants can't continue carrying boulders */
    if (mtmp.minvent && !throws_rocks_nc(newdata)) {
        let otmp, otmp2;

        for (otmp = mtmp.minvent; otmp && !DEADMONSTER_nc(mtmp); otmp = otmp2) {
            otmp2 = otmp.nobj;
            if ((otmp.otyp | 0) === BOULDER) {
                /* this keeps otmp from being polymorphed in the same zap that
                   the monster that held it is polymorphed */
                if (polyspot)
                    bypass_obj(otmp);
                obj_extract_from_minvent_nc(mtmp, otmp); /* C obj_extract_self */
                /* probably ought to give some "drop" message here */
                if (await flooreffects(otmp, mtmp.mx | 0, mtmp.my | 0, ""))
                    continue;
                place_object(otmp, mtmp.mx | 0, mtmp.my | 0);
            }
        }
    }
    /* C mon.c:5517-5518 / steed.c:852 — a mounted hero adjusts in the saddle
     * after the steed changes form.  Armor handling above has already ensured
     * the saddle remains valid; preserve the observable transition message. */
    if (game.u && mtmp === game.u.usteed) {
        const changed = (olddata | 0) !== (mtmp.mnum | 0);
        pline(`You adjust yourself in the saddle on ${changed ? 'your new steed' : 'your steed'}.`);
    }

    /* old form might not have been affected by Elbereth but perhaps the
       new form is.  C mon.c:5522-5533.
     *
     * INERT ON THE TWO PATHS THAT REACH newcham TODAY, and deliberately ported
     * anyway.  svc.context.mon_moving is TRUE only inside movemon (C
     * allmain.c:210-216); js/zap.js's bhitm is a HERO zap and
     * decide_to_shapeshift runs from mcalcdistress at allmain.c:228, which is
     * AFTER mon_moving is cleared at :216.  It becomes live the moment a
     * MONSTER zaps a wand of polymorph (muse.c MUSE_WAN_POLYMORPH), which
     * js/makemon.js already routes through this function. */
    if (game.context && game.context.mon_moving) {
        /* give 'mtmp' a new chance to pinpoint hero's location */
        if (!u_at(mtmp.mux | 0, mtmp.muy | 0))
            set_apparxy(mtmp);
        /* if hero is on Elbereth or scare monster, mtmp in new form might
           become scared */
        if (!mtmp.mpeaceful
            && onscary(mtmp.mux | 0, mtmp.muy | 0, mtmp)
            && monnear(mtmp, mtmp.mux | 0, mtmp.muy | 0))
            await monflee(mtmp, rn1(9, 2), true, true); /* 2..10 turns */
    }

    return 1;
}


/* C hack.h:1532 mdistu(mon) — distu(mon->mx, mon->my), i.e. dist2 to the hero. */
function mdistu_mcd(mon) {
    const u = game.u || {};
    return dist2(mon.mx | 0, mon.my | 0, u.ux | 0, u.uy | 0);
}

/* C mondata.h is_male/is_female/is_neuter — permonst gender flags. */
function is_male_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_MALE) !== 0; }
function is_female_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_FEMALE) !== 0; }
function is_neuter_mcd(ptr) { return ((ptr.mflags2 | 0) & M2_NEUTER) !== 0; }
/* C mondata.h:52 amorphous(ptr) — M1_AMORPHOUS on mflags1. */
function amorphous_mcd(ptr) { return ((ptr.mflags1 | 0) & M1_AMORPHOUS_MV) !== 0; }

/* C monmove.c:307 mon_regen(mon, digest_meal) — regenerate lost hit points.
 * Consumes NO RNG.  js/monmove.js carries a copy of this function, but its
 * healmon() is a file-local THROWING stub that shadows this file's real port
 * (mklev.js healmon, C mon.c:4585), so that copy cannot be called; it has zero
 * callers.  Only the digest_meal=FALSE form is reachable from m_calcdistress,
 * so finish_meating (unported) is never entered from here. */
function mon_regen_mcd(mon, digest_meal) {
    if (((game.moves | 0) % 20) === 0 || regenerates_mcd(mon.data))
        healmon(mon, 1, 0);
    if (mon.mspec_used)
        mon.mspec_used = (mon.mspec_used | 0) - 1;
    if (digest_meal) {
        if (mon.meating) {
            mon.meating = (mon.meating | 0) - 1;
            if (mon.meating <= 0)
                finish_meating_mcd(mon);
        }
    }
}
/* C monflag.h M1_REGEN / mondata.h:80 regenerates(ptr). */
const M1_REGEN_MCD = 0x00800000;
function regenerates_mcd(ptr) { return ((ptr.mflags1 | 0) & M1_REGEN_MCD) !== 0; }
/* C monmove.c finish_meating — share dogmove's faithful body even if a future
 * caller enables the digest-meal form of this helper. */
function finish_meating_mcd(mon) {
    return finish_meating_mk(mon);
}

/* C mon.c:4872 decide_to_shapeshift(mon) — per-turn shape-change decision for a
 * monster whose `cham` names a shapechanger form.  `ptr` is a permonst pointer
 * in C; this port identifies forms by index, so NON_PM stands in for C's NULL
 * (both mean "newcham picks a random form").
 *
 * CARVE-OUT: the amorphous/closed_door displacement arm calls C's
 * enexto(&new_xy, mx, my, ptr); the ported engine here is teleport.js's
 * enexto_core(xx, yy), which ignores the permonst and entflags arguments (its
 * own documented carve-out — goodpos_simple stands in for goodpos).  That arm
 * requires a fog cloud standing on a closed door and draws no RNG of its own;
 * it is entered rather than skipped because skipping it would drop rloc_to's
 * side effects entirely. */
async function decide_to_shapeshift(mon) {
    let ptr = NON_PM;
    let mndx;
    const was_female = mon.female;
    let dochng = false;

    if (!is_vampshifter_nc(mon)) {
        /* regular shapeshifter; 'ptr' is Null */
        if (!(mon.mspec_used | 0) && !rn2(6)) {
            dochng = true;
            mon.mspec_used = 3 + rn2(10);
        }
    } else if (!((mon.mstrategy | 0) & STRAT_WAITFORU)) {
        /* The vampire has to be in good health (mhp) to maintain its shifted
         * form.  If we're shifted and getting low on hp, maybe shift back, or
         * if we're a fog cloud at full hp, maybe pick a different shape.
         * If we're not already shifted and in good health, maybe shift. */
        if (!is_vampire_nc(mon.data)) {
            if ((mon.mhp | 0) <= Math.trunc(((mon.mhpmax | 0) + 5) / 6) && rn2(4)
                && ismnum(mon.cham | 0)) {
                ptr = mon.cham | 0;
                dochng = true;
            } else if ((mon.mnum | 0) === PM_FOG_CLOUD_NC
                       && (mon.mhp | 0) === (mon.mhpmax | 0) && !rn2(4)
                       && (!canseemon(mon)
                           || mdistu_mcd(mon) > BOLT_LIM * BOLT_LIM)) {
                /* if a fog cloud, maybe change to wolf or vampire bat */
                mndx = pickvampshape(mon);
                if (ismnum(mndx)) {
                    ptr = mndx;
                    dochng = (ptr !== (mon.mnum | 0));
                }
            }
            if (dochng && amorphous_mcd(mon.data)
                && closed_door(mon.mx, mon.my)) {
                const new_xy = enexto_core(mon.mx, mon.my);
                if (new_xy)
                    await rloc_to(mon, new_xy.x, new_xy.y);
            }
        } else {
            if ((mon.mhp | 0) >= Math.trunc(9 * (mon.mhpmax | 0) / 10) && !rn2(6)
                && (!canseemon(mon)
                    || mdistu_mcd(mon) > BOLT_LIM * BOLT_LIM))
                dochng = true; /* 'ptr' stays Null */
        }
    }
    if (dochng) {
        if (await newcham(mon, ptr === NON_PM ? null : ptr, NC_SHOW_MSG)) {
            /* for vampshift, override the 10% chance for sex change
               (by forcing original gender in case that occurred) */
            if (is_vampshifter_nc(mon)) {
                const newptr = mon.data;
                if (!is_male_mcd(newptr) && !is_female_mcd(newptr)
                    && !is_neuter_mcd(newptr))
                    mon.female = was_female;
            }
        }
    }
}

/* C mon.c:1180 m_calcdistress(mtmp). */
async function m_calcdistress(mtmp) {
    /* must check non-moving monsters once/turn in case they managed
       to end up in water or lava; note: when not in liquid they regen,
       shape-shift, timeout temporary maladies just like other monsters */
    if ((mtmp.data.mmove | 0) === 0) {
        if (game.vision_full_recalc)
            vision_recalc(0);
        if (await minliquid(mtmp))
            return;
    }

    /* regenerate hit points */
    mon_regen_mcd(mtmp, false);

    /* possibly polymorph shapechangers and lycanthropes */
    if (ismnum(mtmp.cham | 0))
        await decide_to_shapeshift(mtmp);
    await were_change(mtmp);

    /* gradually time out temporary problems */
    if ((mtmp.mblinded | 0) && !(mtmp.mblinded = (mtmp.mblinded | 0) - 1))
        mtmp.mcansee = 1;
    if ((mtmp.mfrozen | 0) && !(mtmp.mfrozen = (mtmp.mfrozen | 0) - 1))
        mtmp.mcanmove = 1;
    if ((mtmp.mfleetim | 0) && !(mtmp.mfleetim = (mtmp.mfleetim | 0) - 1))
        mtmp.mflee = 0;

    /* C FIXME retained: mtmp->mlstmv ought to be updated here */
}

/* port-gen-minliquid-001: minliquid — check mtmp and water/lava for compatibility */
export async function minliquid(mtmp) {
    let res;
    res = await minliquid_core(mtmp);
    /* always clear the flag */
    iflags.sad_feeling = false;
    return res;
}

/* C ref: makemon.c:837 clone_mon(mon, x, y) — the shared body behind split_mon
 * and cutworm.  Placement goes through enexto (it DRAWS: collect_coords
 * shuffles rings) because MON_AT(mon's own square) is always true for x == 0.
 * Not ported here: the tame re-init (tamedog) and isminion/emin copy arms,
 * unreachable for the gremlin/mold callers (never tame, never a minion). */
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
    if (emits_light(m2.data))
        new_light_source(m2.mx, m2.my, emits_light(m2.data), LS_MONSTER,
                         monst_to_any(m2));
    if (mon.mextra?.mgivenname)
        christen_monst(m2, mon.mextra.mgivenname);
    if (!game.context?.mon_moving && mon.mpeaceful) {
        const luck = game.u?.uluck | 0;
        if (mon.mtame)
            m2.mtame = rn2(Math.max(2 + luck, 2)) ? mon.mtame : 0;
        else
            m2.mpeaceful = rn2(Math.max(2 + luck, 2)) ? 1 : 0;
    }
    set_malign(m2);
    newsym(m2.mx, m2.my);
    return m2;
}

/* C ref: potion.c:2873 split_mon(mon, mtmp) — monster arm only (the hero arm
 * is cloneu).  Clone a gremlin or mold; HP halved, odd point stays. */
async function split_mon_ml(mon, mtmp) {
    void mtmp;
    if ((mon.mhp | 0) > (mon.mhpmax | 0))
        mon.mhp = mon.mhpmax | 0;
    const m2 = (mon.mhp | 0) > 1 ? await clone_mon_ml(mon, 0, 0) : null;
    if (m2) {
        m2.mhpmax = Math.trunc((mon.mhpmax | 0) / 2);
        mon.mhpmax = (mon.mhpmax | 0) - m2.mhpmax;
        if (canspotmon(mon))
            await pline(`${Monnam_wm(mon)} multiplies!`);
    }
    return m2;
}

const M1_FLY_ML = 0x00000001;     /* C monflag.h */
const M1_CLING_ML = 0x00000010;
const M1_TPORT_ML = 0x02000000;
const S_EYE_ML = 5;               /* C defsym.h MONSYM(5, 'e', EYE, S_EYE, ...) */
const S_EEL_ML = 57;              /* C defsym.h:362 MONSYM(57, ';', EEL, S_EEL, ...) */
const M1_BREATHLESS_ML = 0x00000400; /* C monflag.h:95 */
const S_LIGHT_ML = 25;            /* C defsym.h MONSYM(25, 'y', LIGHT, S_LIGHT, ...) */
const MR_FIRE_ML = 0x01;          /* C monflag.h */
const M1_SWIM_ML = 0x00000002;       /* C monflag.h */
const M1_AMPHIBIOUS_ML = 0x00000200; /* C monflag.h */
/* C hack.h:1393 RLOC_MSG — imported by name everywhere else in this port; the
 * const.js export is the same 0x02. */
const RLOC_MSG_ML = 0x02;
async function minliquid_core(mtmp) {
    const ptr = mtmp && mtmp.data;
    if (!ptr) return 0;
    const mx = mtmp.mx | 0, my = mtmp.my | 0;
    const loc = game.level?.at(mx, my);
    const typ = loc ? (loc.typ | 0) : STONE;
    if (typeof process !== 'undefined' && ENV?.FF_LIQUID_TRACE === '1')
        pushRngLogEntry(`^liquid_trace[moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` mndx=${mtmp?.mndx ?? mtmp?.mnum ?? mtmp?.data?.pmidx ?? -1}`
            + ` xy=${mx},${my} typ=${typ}]`);
    /* C dbridge.c is_lava(x,y) — LAVAPOOL or LAVAWALL (the DRAWBRIDGE_UP
     * DB_LAVA case is not modelled anywhere in this port). */
    const is_lava_here = (typ === LAVAPOOL || typ === LAVAWALL)
        || (typ === DRAWBRIDGE_UP && ((loc?.drawbridgemask | 0) & DB_UNDER) === DB_LAVA);
    /* C mon.c:1126-1127 — inlava = is_lava(...) && !(is_flyer || is_floater).
     * mondata.h:19-20: is_flyer = mflags1 & M1_FLY; is_floater = mlet is
     * S_EYE or S_LIGHT. */
    const mf1 = ptr.mflags1 | 0, mlet = ptr.mlet | 0;
    const inlava = is_lava_here
        && !((mf1 & M1_FLY_ML) !== 0 || mlet === S_EYE_ML || mlet === S_LIGHT_ML);
    const inpool = dbridge_is_pool(mx, my)
        && (!((mf1 & M1_FLY_ML) !== 0 || mlet === S_EYE_ML || mlet === S_LIGHT_ML)
            || Is_waterlevel(game.u?.uz));
    /* C mon.c:1120 `boolean waterwall = is_waterwall(mtmp->mx, mtmp->my)`;
     * dbridge.c:38 is `isok(x,y) && IS_WATERWALL(levl[x][y].typ)`, and rm.h:141
     * is `IS_WATERWALL(typ) ((typ) == WATER)`.  It is a SEPARATE disjunct from
     * inpool in C's `else if (inpool || waterwall)`: a flyer over the Plane of
     * Water's WATER squares has inpool FALSE (is_flyer) and waterwall TRUE, so
     * this must be tested before the eel `else`, not inside the pool arm. */
    const waterwall = isok(mx, my) && IS_WATERWALL(typ);
    if (typeof process !== 'undefined' && ENV?.FF_LIQUID_TRACE === '2')
        pushRngLogEntry(`^liquid_decision[moves=${game.moves | 0} id=${mtmp?.m_id | 0}`
            + ` xy=${mx},${my} typ=${typ} lava=${is_lava_here ? 1 : 0}`
            + ` pool=${inpool ? 1 : 0} wall=${waterwall ? 1 : 0}`
            + ` tport=${(mf1 & M1_TPORT_ML) !== 0 ? 1 : 0}`
            + ` cling=${(mf1 & M1_CLING_ML) !== 0 ? 1 : 0}`
            + ` drown=${(mf1 & (M1_SWIM_ML | M1_AMPHIBIOUS_ML
                | M1_BREATHLESS_ML)) !== 0 ? 0 : 1}]`);
    /* C mon.c:990-1001 — `else if (mtmp->data == &mons[PM_IRON_GOLEM] && inpool
     * && !rn2(5))`: an iron golem in a pool rusts for d(2,6).  The PM_GREMLIN
     * split arm that precedes it (mon.c:983-989) stays a documented gap
     * (split_mon is not a faithful clone_mon here). */
    /* C mon.c:983-989 — gremlin in water/fountain multiplies:
     *     if (mtmp->data == &mons[PM_GREMLIN] && (inpool || infountain)
     *         && rn2(3)) {
     *         if (split_mon(mtmp, NULL)) dryup(mtmp->mx, mtmp->my, FALSE);
     *         if (inpool) water_damage_chain(mtmp->minvent, FALSE);
     *         return 0; }
     * (infountain = IS_FOUNTAIN(levl[x][y].typ), mon.c:1124.) */
    if ((ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) === PM_GREMLIN_ML
        && (inpool || typ === FOUNTAIN) && rn2(3)) {
        if (await split_mon_ml(mtmp, null))
            await dryup_ml(mx, my, false);
        if (inpool)
            await water_damage_chain_ml(mtmp.minvent || null, false);
        return 0;
    }
    if (inpool && (ptr.pmidx ?? mtmp.mndx ?? mtmp.mnum ?? -1) === PM_IRON_GOLEM_ML
        && !rn2(5)) {
        const dam = d_ml(2, 6);
        if (cansee(mx, my))
            await pline(`${Monnam_wm(mtmp)} rusts.`);
        mtmp.mhp = (mtmp.mhp | 0) - dam;
        if ((mtmp.mhpmax | 0) > dam)
            mtmp.mhpmax = (mtmp.mhpmax | 0) - dam;
        if ((mtmp.mhp | 0) < 1) {
            await mondied_ml(mtmp);
            if ((mtmp.mhp | 0) < 1)
                return 1;
        }
        await water_damage_chain_ml(mtmp.minvent || null, false);
        return 0;
    }
    if (!inlava && !inpool && !waterwall) {
        if (mlet === S_EEL_ML && !Is_waterlevel(game.u?.uz)
            && (mf1 & M1_BREATHLESS_ML) === 0) {
            if ((mtmp.mhp | 0) > 1 && rn2(mtmp.mhp | 0) > rn2(8))
                mtmp.mhp = (mtmp.mhp | 0) - 1;
            await monflee(mtmp, 2, false, false);
        }
        return 0;
    }
    if (!inlava && (inpool || waterwall)) {   /* C's `else if` — inlava wins */
        const is_clinger_ml = (mf1 & M1_CLING_ML) !== 0;
        /* C mondata.h:28 cant_drown(ptr) = is_swimmer || amphibious || breathless */
        const cant_drown_ml = (mf1 & (M1_SWIM_ML | M1_AMPHIBIOUS_ML
                                      | M1_BREATHLESS_ML)) !== 0;
        if ((waterwall || !is_clinger_ml) && !cant_drown_ml) {
            if ((mf1 & M1_TPORT_ML) !== 0 && !tele_restrict(mtmp)) {
                if (await rloc(mtmp, RLOC_MSG_ML))
                    return 0;
            }
        }
        if ((waterwall || !is_clinger_ml) && !cant_drown_ml) {
            /* C mon.c:1081-1101 — the drowning tail. */
            if (cansee(mx, my)) {
                if (game.context && game.context.mon_moving)
                    await pline(`${Monnam_wm(mtmp)} drowns.`);
                else
                    await pline(`You drown ${mon_nam_wm(mtmp)}.`);
            }
            if (engulfing_u(mtmp))
                await pline(`${Monnam_wm(mtmp)} sinks as ${hliquid_ml('water')} rushes in and flushes you out.`);
            if (game.context && game.context.mon_moving)
                await mondied_ml(mtmp); /* ok to leave corpse despite water */
            else
                await xkilled_ml(mtmp, XKILL_NOMSG);
            if (!((mtmp.mhp | 0) < 1)) {
                if (!m_in_air(mtmp)) {
                    await water_damage_chain_ml(mtmp.minvent || null, false);
                    if (!await rloc(mtmp, RLOC_NOMSG))
                        await deal_with_overcrowding(mtmp);
                }
                return 0;
            }
            return 1;
        }
        return 0;
    }
    if (!inlava)
        return 0;
    /* C mon.c:1163 — `if (!is_clinger(mtmp->data) && !likes_lava(mtmp->data))`. */
    const mndx = (ptr.pmidx ?? mtmp.data_mndx ?? mtmp.mndx ?? mtmp.mnum ?? -1) | 0;
    if ((mf1 & M1_CLING_ML) !== 0 || likes_lava_mv(mndx))
        return 0;
    /* C mon.c:1016-1022 — `if (can_teleport(mtmp->data) && !tele_restrict(mtmp))
     * { if (rloc(mtmp, RLOC_MSG)) return 0; }`. can_teleport(ptr) is
     * mondata.h:82 `(ptr->mflags1 & M1_TPORT) != 0`, i.e. M1_TPORT_ML above.
     * rloc() DRAWS (rnd(COLNO-1) + rn2(ROWNO) per placement attempt,
     * teleport.c:1850-1851) — this is the LAVA twin of the pool/waterwall
     * arm ported above at line ~16927; unlike that arm, a failed/skipped
     * teleport here falls through to the fire-resist check below rather
     * than returning immediately, exactly as C does. */
    if ((mf1 & M1_TPORT_ML) !== 0 && !tele_restrict(mtmp)) {
        if (await rloc(mtmp, RLOC_MSG_ML))
            return 0;
    }
    /* C monst.h:272 resists_fire(mon) = Resists_Elem(mon, FIRE_RES); the
     * non-hero term is `mon_resistancebits(mon) & MR_FIRE`, i.e.
     * data->mresists | mextrinsics | mintrinsics (monst.h:268) — the same
     * three-way read m_poisongas_ok_resists_poison above already uses. */
    const rbits = (ptr.mresists | 0) | (mtmp.mextrinsics | 0) | (mtmp.mintrinsics | 0);
    if ((rbits & MR_FIRE_ML) !== 0) {
        /* C mon.c:1028-1045 — fire resistance protects the monster itself,
         * but not its inventory.  The survivor loses one hit point, then
         * every carried item is exposed to fire before the monster is moved
         * off the lava.  This ordering is load-bearing: fire_damage_chain()
         * may consume inventory RNG before rloc() supplies the escape draws.
         */
        mtmp.mhp = (mtmp.mhp | 0) - 1;
        if ((mtmp.mhp | 0) < 1) {
            if (cansee(mx, my))
                pline(`${Monnam_wm(mtmp)} surrenders to the fire.`);
            await mondead(mtmp);
            return 1;
        }
        if (cansee(mx, my))
            pline(`${Monnam_wm(mtmp)} burns slightly.`);
        if (!m_in_air(mtmp) && !likes_lava_mv(mndx)) {
            await fire_damage_chain(mtmp.minvent || null, false, false, mx, my);
            if (!await rloc(mtmp, RLOC_MSG_ML))
                await deal_with_overcrowding(mtmp);
        }
        return 0;
    }
    /* C picks the verb from on_fire(mtmp->data, &mattk[0]): "boils away" /
     * "melts away" / "burns to a crisp".  on_fire is unported; "burns to a
     * crisp" is C's default arm.  Screen-only and only when the hero can see
     * the square, so it moves no rng either way. */
    if (cansee(mx, my))
        pline(`${Monnam_wm(mtmp)} burns to a crisp.`);
    await mondead(mtmp); /* no corpse */
    return 1;
}

/* C rnd.c:487 exp_log() writes the optional diagnostic experience log only.
 * It has no gameplay, display, or RNG effect, so the close-up photograph path
 * can safely continue when that diagnostic sink is unavailable. */
function exp_log(fmt, ...args) {
    return undefined;
}



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

// monflag.h bitflags used by mfndpos's own mondata.h-macro predicates.
const M1_SWIM_MV = 0x00000002;
const M1_AMORPHOUS_MV = 0x00000004;
const M1_WALLWALK_MV = 0x00000008;
const M1_TUNNEL_MV = 0x00000020;
const M1_NEEDPICK_MV = 0x00000040;
const M1_MINDLESS_MV = 0x00010000;
const M1_SLITHY_MV = 0x00080000;
const M1_SEE_INVIS_MV = 0x01000000;
const M2_ROCKTHROW_MV = 0x08000000;
const MZ_LARGE_MV = 3; /* monflag.h */

// defsym.h MONSYM enum (verified against nethack-c/include/defsym.h — 1-based,
// S_ANT=1..S_MIMIC_DEF=60).
const S_EEL_MV = 57;
const S_VORTEX_MV = 22;
const S_GHOST_MV = 54;

// objects.h otyp indices (established literal-constant convention used
// throughout this codebase — js/u_init.js, js/m_initweap.js, js/dig.js,
// js/dokick.js — rather than a generated table import).
const PICK_AXE_MV = 259;
const DWARVISH_MATTOCK_MV = 71;
const AXE_MV = 44;
const BATTLE_AXE_MV = 45;
const BOULDER_MV = 475;
const CLOVE_OF_GARLIC_MV = 284;

// monattk.h damage types (used by the IRONBARS dmgtype check).
const AD_RUST_MV = 24;
const AD_CORR_MV = 42;

// mondata.h predicates — all take the reconstructed permonst-like object
// (mon.data: pmidx/mlet/mflags1/mflags2/msize, from permonstTemplate via
// struct_reconstructor.js), matching C's `ptr->mflags1` style exactly.
function mindless_mv(ptr) { return ((ptr.mflags1 | 0) & M1_MINDLESS_MV) !== 0; }
function amorphous_mv(ptr) { return ((ptr.mflags1 | 0) & M1_AMORPHOUS_MV) !== 0; }
function is_swimmer_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SWIM_MV) !== 0; }
function passes_walls_mv(ptr) { return ((ptr.mflags1 | 0) & M1_WALLWALK_MV) !== 0; }
function tunnels_mv(ptr) { return ((ptr.mflags1 | 0) & M1_TUNNEL_MV) !== 0; }
function needspick_mv(ptr) { return ((ptr.mflags1 | 0) & M1_NEEDPICK_MV) !== 0; }
function slithy_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SLITHY_MV) !== 0; }
function unsolid_mv(ptr) { return ((ptr.mflags1 | 0) & 0x00100000) !== 0; } /* M1_UNSOLID */
function bigmonst_mv(ptr) { return (ptr.msize | 0) >= MZ_LARGE_MV; }
function noncorporeal_mv(ptr) { return (ptr.mlet | 0) === S_GHOST_MV; }
function throws_rocks_mv(ptr) { return ((ptr.mflags2 | 0) & M2_ROCKTHROW_MV) !== 0; }
function perceives_mv(ptr) { return ((ptr.mflags1 | 0) & M1_SEE_INVIS_MV) !== 0; }
function is_whirly_mv(ptr, mndx) { return (ptr.mlet | 0) === S_VORTEX_MV || mndx === PM_AIR_ELEMENTAL; }
function likes_lava_mv(mndx) { return mndx === PM_FIRE_ELEMENTAL || mndx === PM_SALAMANDER; }

// C ref: rm.h Sokoban — svl.level.flags.sokoban_rules (js/makemon.js
// sokobanRules() precedent, mirrored locally to avoid a needless import).
function Sokoban_mv() { return !!(game.level?.flags?.sokoban_rules ?? game.sokoban); }

// channel (js/mcastu.js propOn()/Invis() precedent; not exported there, so
// mirrored locally).
function Displaced_mv() {
    const p = game.u?.uprops?.[DISPLACED];
    return !!(p && (p.intrinsic || p.extrinsic));
}
function Invis_mv() {
    const p = game.u?.uprops?.[INVIS];
    return !!(p && (p.intrinsic || p.extrinsic) && !p.blocked);
}

// C ref: hack.c:921 bad_rock(mdat,x,y).
function bad_rock_mv(mdat, x, y) {
    if (Sokoban_mv() && sobj_at(BOULDER_MV, x, y)) return true;
    const loc = game.level?.at(x, y);
    const typ = loc ? (loc.typ | 0) : STONE;
    if (!IS_OBSTRUCTED(typ)) return false;
    if ((!tunnels_mv(mdat) || needspick_mv(mdat) || !may_dig(x, y))
        && !(passes_walls_mv(mdat) && may_passwall(x, y))) {
        return true;
    }
    return false;
}

// C ref: hack.c:934 cant_squeeze_thru(mon). `mon` is never the hero in this
// are structurally omitted (they can never fire). curr_mon_load walks
function cant_squeeze_thru_mv(mon) {
    const mdat = mon.data;
    if (passes_walls_mv(mdat)) return 0;
    if (bigmonst_mv(mdat)
        && !(amorphous_mv(mdat) || is_whirly_mv(mdat, mon.data_mndx) || noncorporeal_mv(mdat)
             || slithy_mv(mdat) || can_fog_mv(mon))) {
        return 1;
    }
    let amt = 0;
    for (let o = mon.minvent; o; o = o.nobj) {
        if ((o.otyp | 0) !== BOULDER_MV || !throws_rocks_mv(mdat)) amt += (o.owt | 0);
    }
    if (amt > 600 /* weight.h WT_TOOMUCH_DIAGONAL */) return 2;
    return 0;
}

// C ref: monmove.c:2365 can_fog(mon) — REAL now (js/monmove.js:3315, exported).
//   if (!(svm.mvitals[PM_FOG_CLOUD].mvflags & G_GENOD) && is_vampshifter(mtmp)
//       && !Protection_from_shape_changers && !stuff_prevents_passage(mtmp))
//       return TRUE;
// stuff_prevents_passage inventory walk all live in js/monmove.js, exported,
// and are already what js/cmd.js:23843 calls at the cant_squeeze_thru site.
// Both mfndpos uses here are the SAME C predicate — the diagonal tight-squeeze
// test (hack.c:964, via cant_squeeze_thru) and the closed-door amorphous test
// (mon.c:2234) — so they re-point together.  RNG-free.
const can_fog_mv = can_fog;

// C ref: worm.c:898 worm_cross(x1,y1,x2,y2) — REAL now (js/worm.js:466,
// state in js/worm.js and the full port has lived there since the long-worm
// work.  mon.c:2253's arm ("mustn't pass between adjacent long worm segments,
// but can attack that way") drops a diagonal candidate square, and every
// mfndpos `continue` is RNG-load-bearing: cnt is the argument of m_move's
// mtrack draw rn2(4 * (cnt - j)) at monmove.c:1963.
const worm_cross_mv = worm_cross;

// C ref: include/trap.h:125
//   #define fixed_tele_trap(t) ((t)->ttyp == TELEP_TRAP \
//                               && isok((t)->teledest.x,(t)->teledest.y))
// The old caption's premise ("STRUCT_FIELDS['struct trap *'] has no
// teledest is real state in js/, defaulted to {-1,-1} at maketrap
// (js/mklev.js:6187) and set from a des.trap({teledest=...}) at mklev.js:6292 /
// trap.js:1538, and js/teleport.js:935 already branches on isok(teledest) at
// the HERO's side of the same trap.  isok(-1,-1) is false, so an ordinary
// teleport trap is still not "fixed" — this only differs on a Lua-placed
// fixed-destination trap, which is the case mon.c:2361 exists for.
function fixed_tele_trap_mv(ttmp) {
    return (ttmp.ttyp | 0) === TELEP_TRAP
        && isok((ttmp.teledest?.x | 0), (ttmp.teledest?.y | 0));
}

// C ref: monmove.c:242 onscary(x,y,mtmp) — REAL now (js/makemon.js:4546).
// The "established precedent" this stub cited was a chain of copies of the
// same false, and it is RNG-load-bearing HERE in a way it is not at the
// find_defensive/find_misc sites: mfndpos's `cnt` is the argument of m_move's
// mtrack draw `rn2(4 * (cnt - j))` (monmove.c:1963), so one wrongly-kept
// candidate square shifts that argument for every later candidate AND lets the
// mfndpos for the yellow light at (57,5) returns cnt=7 and this port returned
// cnt=8 — first RNG divergence at leaf 10348, C rn2(24) vs JS rn2(28), and the
// 'y' ended one row south of where C put it for the rest of the segment.
const onscary_mv = onscary;

// C ref: rm.h is_pool(x,y) — same POOL|MOAT|WATER|DRAWBRIDGE_UP check as
// js/dokick.js:20-25 (keystone spec §7; not exported from either existing
// copy, so inlined here rather than imported).
function is_pool_mv(x, y) {
    const loc = game.level?.at(x, y);
    if (!loc) return false;
    const t = loc.typ | 0;
    if (t === POOL || t === MOAT || t === WATER) return true;
    return t === DRAWBRIDGE_UP
        && !Is_juiblex_level(game.u?.uz)
        && ((loc.drawbridgemask | 0) & DB_UNDER) === DB_MOAT;
}

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

// C ref: mon.c:2044 monlineu(mon,nx,ny) = online2(nx,ny,mon->mux,mon->muy).
function monlineu_mv(mon, nx, ny) { return online2(nx, ny, mon.mux, mon.muy); }

// C ref: worn.c:998 which_armor(mon,flag) — monster branch only (mfndpos
// never calls this for the hero); walks minvent for owornmask & flag.
function which_armor_mv(mon, flag) {
    for (let o = mon.minvent; o; o = o.nobj) {
        if (((o.owornmask | 0) & flag) !== 0) return o;
    }
    return null;
}

const P_AXE_MV = 3; /* skills.h P_AXE */
function is_axe_mv(obj) {
    if (!obj) return false;
    const oc = obj.oclass | 0;
    if (oc !== WEAPON_CLASS && oc !== TOOL_CLASS) return false;
    return (MKOBJ_OC_SKILL[obj.otyp | 0] | 0) === P_AXE_MV;
}

// C ref: mon.c:2126-2370 mfndpos(mon,data,flag) — return count of acceptable
// neighbour positions, filling data->poss[]/info[] in place (fixed 9-slot
// buffers, matching mfndpos.h's `coord poss[9]; long info[9];`).
export function mfndpos(mon, data, flag) {
    const x = mon.mx | 0;
    const y = mon.my | 0;
    // WIRING FIX (movemon integration spec): `mon.data` (a materialized
    // permonst-shaped object) and `mon.data_mndx` only exist on the
    // reconstructMonst) — LIVE monst objects created by makemon/makedog
    // never get a `.data` field (verified: no `.data =` assignment exists
    // anywhere in js/makemon.js or js/dog.js), only `.mndx`/`.mnum` (the
    // monsndx() convention every sibling mon.c-family port already uses,
    // e.g. js/monmove.js:mfndpos_nontame, js/dogmove.js:mfndpos_stub). The
    // prior direct `mon.data.mlet` / `mon.data_mndx` reads crashed with
    // "Cannot read properties of undefined (reading 'mlet')" the instant
    // this function was wired into a live dog_move/m_move call (the leaf
    // populates `.data`/`.data_mndx`, so this path was untested on live
    // state). permonstTemplate(mndx) is the SAME materializer
    // reconstructMonst itself calls — reusing it here keeps mdat's shape
    // identical on both the replay and live paths.
    const mndx = (mon.data_mndx ?? mon.mndx ?? mon.mnum) | 0;
    const mdat = mon.data ?? permonstTemplate(mndx);
    const nowloc = game.level?.at(x, y);
    const nowtyp = nowloc ? (nowloc.typ | 0) : STONE;

    // C mon.c:2150 memset(data,0,sizeof(*data)) — explicit reset so this
    // port is correct for any caller, not just the replay fixture's
    data.cnt = 0;
    for (let i = 0; i < 9; i++) { data.poss[i] = { x: 0, y: 0 }; data.info[i] = 0; }

    const nodiag = (mndx === PM_GRID_BUG);
    let wantpool = ((mdat.mlet | 0) === S_EEL_MV);
    const poolok = ((!Is_waterlevel(game.u?.uz) && m_in_air(mon))
                     || (is_swimmer_mv(mdat) && !wantpool));
    let lavaok = (m_in_air(mon) || likes_lava_mv(mndx));
    if (mndx === PM_FLOATING_EYE) lavaok = false; /* prefers to avoid heat */
    let thrudoor = ((flag & (ALLOW_WALL | BUSTDOOR)) !== 0);
    // C mon.c:2172-2174 — a damaging (poison) cloud makes the avoidance live.
    const poisongas_ok = (m_poisongas_ok(mon) === M_POISONGAS_OK);
    const in_poisongas = poisoncloud_at(x, y);

    let rockok = false, treeok = false;
    if (flag & ALLOW_DIG) {
        if (!needspick_mv(mdat)) {
            rockok = treeok = true;
        } else {
            // C mon.c:2170-2172 also special-cases a CURSED wielded
            // schema (STRUCT_FIELDS['struct monst *'] has no 'mw' field),
            // so this port always falls through to the m_carrying branch
            rockok = !!m_carrying(mon, PICK_AXE_MV)
                || (!!m_carrying(mon, DWARVISH_MATTOCK_MV) && !which_armor_mv(mon, W_ARMS));
            treeok = !!m_carrying(mon, AXE_MV)
                || (!!m_carrying(mon, BATTLE_AXE_MV) && !which_armor_mv(mon, W_ARMS));
        }
        if (rockok || treeok) thrudoor = true;
    }

    let cnt = 0;
    for (;;) { /* C mon.c:2185 nexttry: (eels retry on land if no water found) */
        cnt = 0;
        if (mon.mconf) { flag |= ALLOW_ALL; flag &= ~NOTONL; }
        if (!mon.mcansee) flag |= ALLOW_SSM;
        const maxx = Math.min(x + 1, COLNO - 1);
        const maxy = Math.min(y + 1, ROWNO - 1);
        /* FF_MFNDTRACE-only candidate rejection ledger.  Keep this at the
         * actual rejection sites so C/JS traces can be joined by id/coord;
         * this helper is inert in normal gameplay and does not inspect RNG. */
        const traceReject = (nx, ny, reason) => {
            if (typeof process !== 'undefined' && ENV?.FF_MFNDTRACE === '1')
                pushRngLogEntry(`^mfnd_reject[moves=${game.moves | 0} id=${mon.m_id | 0} mnum=${mndx}`
                    + ` xy=${x},${y} cand=${nx},${ny} reason=${reason} flag=${flag >>> 0}`
                    + ` typ=${game.level?.at(nx, ny)?.typ ?? -1}]`);
        };
        for (let nx = Math.max(1, x - 1); nx <= maxx; nx++) {
            for (let ny = Math.max(0, y - 1); ny <= maxy; ny++) {
                if (nx === x && ny === y) continue;
                const nloc = game.level?.at(nx, ny);
                const ntyp = nloc ? (nloc.typ | 0) : STONE;

                if (IS_OBSTRUCTED(ntyp)
                    && !((flag & ALLOW_WALL) && may_passwall(nx, ny))
                    && !((IS_TREE(ntyp) ? treeok : rockok) && may_dig(nx, ny))) {
                    traceReject(nx, ny, 'obstructed');
                    continue;
                }

                /* intelligent peacefuls avoid digging shop/temple walls.
                   C mon.c:2217-2220.  (The note that used to sit here — "in_rooms
                   is a local stub, so this branch is always false" — was true of
                   the shadowing stub this file carried and is false now.) */
                if (IS_OBSTRUCTED(ntyp) && rockok
                    && !mindless_mv(mdat) && (mon.mpeaceful || mon.mtame)
                    && ((in_rooms(nx, ny, TEMPLE)[0] | 0) || (in_rooms(nx, ny, SHOPBASE)[0] | 0))
                    && !((in_rooms(x, y, TEMPLE)[0] | 0) || (in_rooms(x, y, SHOPBASE)[0] | 0))) {
                    traceReject(nx, ny, 'peaceful_dig_shop_temple');
                    continue;
                }

                if (IS_WATERWALL(ntyp) && !is_swimmer_mv(mdat)) {
                    traceReject(nx, ny, 'waterwall');
                    continue;
                }


                /* KMH -- Added iron bars */
                if (ntyp === IRONBARS
                    && (!(flag & ALLOW_BARS)
                        || (((nloc ? (nloc.wall_info | 0) : 0) & W_NONDIGGABLE)
                            && (dmgtype(mdat, AD_RUST_MV) || dmgtype(mdat, AD_CORR_MV))))) {
                    traceReject(nx, ny, 'ironbars');
                    continue;
                }

                if (IS_DOOR(ntyp)
                    /* an amorphous creature can only move under/through a
                       closed door if it doesn't currently have hero engulfed */
                    && !((amorphous_mv(mdat) || can_fog_mv(mon)) && !engulfing_u(mon))
                    && (((((nloc ? nloc.doormask : 0) | 0) & D_CLOSED) && !(flag & OPENDOOR))
                        || ((((nloc ? nloc.doormask : 0) | 0) & D_LOCKED) && !(flag & UNLOCKDOOR)))
                    && !thrudoor) {
                    traceReject(nx, ny, 'door');
                    continue;
                }

                /* avoid poison gas? (mon.c:2240-2243) */
                if (!poisongas_ok && !in_poisongas && poisoncloud_at(nx, ny)) {
                    traceReject(nx, ny, 'poisongas');
                    continue;
                }

                /* first diagonal checks (tight squeezes handled below) */
                if (nx !== x && ny !== y
                    && (nodiag
                        || (IS_DOOR(nowtyp) && (((nowloc ? nowloc.doormask : 0) | 0) & ~D_BROKEN))
                        || (IS_DOOR(ntyp) && (((nloc ? nloc.doormask : 0) | 0) & ~D_BROKEN))
                        || ((IS_DOOR(nowtyp) || IS_DOOR(ntyp)) && Is_rogue_level(game.u?.uz))
                        || (m_at(x, ny) && m_at(nx, y) && worm_cross_mv(x, y, nx, ny)
                            && !m_at(nx, ny) && (nx !== game.u.ux || ny !== game.u.uy)))) {
                    traceReject(nx, ny, 'diagonal');
                    continue;
                }

                if ((!lavaok || !(flag & ALLOW_WALL)) && ntyp === LAVAWALL) {
                    traceReject(nx, ny, 'lavawall');
                    continue;
                }

                if ((poolok || (is_pool_mv(nx, ny) === wantpool))
                    && (lavaok || !is_lava_mv(nx, ny))) {
                    /* Displacement also displaces the Elbereth/scare monster,
                       as long as you are visible. */
                    const monseeu = (mon.mcansee && (!Invis_mv() || perceives_mv(mdat)));
                    let dispx, dispy;
                    if (Displaced_mv() && monseeu && mon.mux === nx && mon.muy === ny) {
                        dispx = game.u.ux; dispy = game.u.uy;
                    } else {
                        dispx = nx; dispy = ny;
                    }

                    data.info[cnt] = 0;
                    if (onscary_mv(dispx, dispy, mon)) {
                        if (!(flag & ALLOW_SSM)) {
                            traceReject(nx, ny, 'scary');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_SSM;
                    }
                    if (u_at(nx, ny) || (nx === mon.mux && ny === mon.muy)) {
                        if (u_at(nx, ny)) {
                            /* found you at this square — set mux/muy so the
                               caller knows ALLOW_U means "attack you", not
                               the displaced image. */
                            mon.mux = game.u.ux;
                            mon.muy = game.u.uy;
                        }
                        if (!(flag & ALLOW_U)) {
                            traceReject(nx, ny, 'hero_not_allowed');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_U;
                    } else {
                        const mtmp2 = m_at(nx, ny);
                        if (mtmp2) {
                            /* C mon.c:2287-2305.  mm_aggression_mk / mm_displacement_mk above are
                             * the ports of mon.c:2385-2468. */
                            let mmflag = flag | mm_aggression_mk(mon, mtmp2);
                            if (mmflag & ALLOW_M) {
                                data.info[cnt] |= ALLOW_M;
                                if (mtmp2.mtame) {
                                    if (!(mmflag & ALLOW_TM)) {
                                        traceReject(nx, ny, 'tame_monster');
                                        continue;
                                    }
                                    data.info[cnt] |= ALLOW_TM;
                                }
                            } else {
                                flag &= ~ALLOW_MDISP;
                                mmflag = flag | mm_displacement_mk(mon, mtmp2);
                                if (!(mmflag & ALLOW_MDISP)) {
                                    traceReject(nx, ny, 'occupied_monster');
                                    continue;
                                }
                                data.info[cnt] |= ALLOW_MDISP;
                            }
                        }
                        /* ALLOW_SANCT only prevents movement, not attack,
                           into a temple.  C mon.c:2319-2323. */
                        if (game.level?.flags?.has_temple
                            && (in_rooms(nx, ny, TEMPLE)[0] | 0)
                            && !(in_rooms(x, y, TEMPLE)[0] | 0)
                            && in_your_sanctuary(null, nx, ny)) {
                            if (!(flag & ALLOW_SANCT)) {
                                traceReject(nx, ny, 'sanctuary');
                                continue;
                            }
                            data.info[cnt] |= ALLOW_SANCT;
                        }
                    }
                    if (sobj_at(CLOVE_OF_GARLIC_MV, nx, ny)) {
                        if (flag & NOGARLIC) {
                            traceReject(nx, ny, 'garlic');
                            continue;
                        }
                        data.info[cnt] |= NOGARLIC;
                    }
                    if (sobj_at(BOULDER_MV, nx, ny)) {
                        if (!(flag & ALLOW_ROCK)) {
                            traceReject(nx, ny, 'boulder');
                            continue;
                        }
                        data.info[cnt] |= ALLOW_ROCK;
                    }
                    if (monseeu && monlineu_mv(mon, nx, ny)) {
                        if (flag & NOTONL) {
                            traceReject(nx, ny, 'not_on_line');
                            continue;
                        }
                        data.info[cnt] |= NOTONL;
                    }
                    /* check for diagonal tight squeeze */
                    if (nx !== x && ny !== y) {
                        const sideA = bad_rock_mv(mdat, x, ny);
                        const sideB = bad_rock_mv(mdat, nx, y);
                        const squeeze = cant_squeeze_thru_mv(mon);
                        if (typeof process !== 'undefined' && ENV?.FF_MFNDTRACE === '1')
                            pushRngLogEntry(`^mfnd_diag[moves=${game.moves | 0} id=${mon.m_id | 0} mnum=${mndx} xy=${x},${y} cand=${nx},${ny} a=${sideA ? 1 : 0} b=${sideB ? 1 : 0} squeeze=${squeeze | 0} skip=${sideA && sideB && squeeze ? 1 : 0}]`);
                        if (sideA && sideB && squeeze) {
                            traceReject(nx, ny, 'tight_squeeze');
                            continue;
                        }
                    }
                    /* The monster avoids a particular type of trap if it's
                       familiar with the trap type. */
                    const ttmp = t_at(nx, ny);
                    if (ttmp) {
                        if ((ttmp.ttyp | 0) >= TRAPNUM || (ttmp.ttyp | 0) === 0) {
                            /* impossible(...) — logging no-op, no state effect. */
                            traceReject(nx, ny, 'invalid_trap');
                            continue;
                        }
                        if (fixed_tele_trap_mv(ttmp) && hastrack(nx, ny)) {
                            data.info[cnt] |= ALLOW_TRAPS;
                        } else if (!m_harmless_trap(mon, ttmp)) {
                            if (!(flag & ALLOW_TRAPS) && mon_knows_traps(mon, ttmp.ttyp)) {
                                traceReject(nx, ny, 'known_trap');
                                continue;
                            }
                            data.info[cnt] |= ALLOW_TRAPS;
                        }
                    }
                    data.poss[cnt] = { x: nx, y: ny };
                    cnt++;
                }
            }
        }
        if (!cnt && wantpool && !is_pool_mv(x, y)) {
            wantpool = false;
            continue;
        }
        break;
    }
    data.cnt = cnt;
    return cnt;
}

/* C ref: nethack-c/src/mon.c:4585 healmon() */
export function healmon(mtmp, amt, overheal) {
    const g = game;
    const u = g.u;
    if (mtmp === g.youmonst) {
        const oldhp = Upolyd(u) ? u.mh : u.uhp;
        healup(amt, 0, 0, 0);
        return (Upolyd(u) ? u.mh : u.uhp) - oldhp;
    } else {
        const oldhp = mtmp.mhp;
        if (mtmp.mhp + amt > mtmp.mhpmax + overheal) {
            mtmp.mhpmax += overheal;
            mtmp.mhp = mtmp.mhpmax;
        } else {
            mtmp.mhp += amt;
            if (mtmp.mhp > mtmp.mhpmax)
                mtmp.mhpmax = mtmp.mhp;
        }
        return mtmp.mhp - oldhp;
    }
}

export async function restore_cham(mon) {
    if (false || mon.mcan) {
        await normal_shape(mon);
    } else if (mon.cham === NON_PM) {
        mon.cham = pm_to_cham(mon.data.pmidx);
    }
}

/* C ref: mkobj.c:1865 set_bknown(struct obj *obj, unsigned int onoff) —
 * obj->bknown is `Bitfield(bknown,1)` (obj.h:113), a 1-bit field: the
 * inequality test uses the raw (unmasked) onoff, but the assignment itself
 * narrows to 1 bit. Comment/caller convention documents onoff as always
 * "1 or 0" so this is a no-op for every in-domain caller. */
export function set_bknown(obj, onoff) {
    if (obj.bknown !== onoff) {
        obj.bknown = onoff & 1;
        if (obj.where === OBJ_INVENT && (game.moves) > 1)
            update_inventory();
    }
}

export function rescham() {
    iter_mons(normal_shape);
}

/* C mon.c:4421-4455 — restore a monster's ordinary shape.  This is used by
 * rescham() and by callers which cancel a shape change; it must preserve the
 * cancelled flag across newcham(), then reveal disguises and finish mimic
 * meals exactly as C does. */
export async function normal_shape(mon) {
    const mcham = mon?.cham | 0;
    if (ismnum(mcham)) {
        const mcan = mon.mcan;
        await newcham(mon, mcham, NC_SHOW_MSG);
        mon.cham = NON_PM;
        if (mcan)
            mon.mcan = 1;
        newsym(mon.mx | 0, mon.my | 0);
    }
    if (is_were(mon?.data) && !mons_is_human(mon.mnum | 0))
        await new_were(mon);
    const apType = (mon.m_ap_type | 0) & 7;
    if (apType !== 0) {
        if (!mon.meating) {
            if (apType !== 3)
                mon.msleeping = 1;
            seemimic(mon);
        } else {
            finish_meating_mcd(mon);
        }
    }
}

/* C mon.c:4517-4531 — walk the live, on-level monster chain.  Cache nmon
 * before invoking the callback because callbacks such as normal_shape can
 * mutate or unlink the current monster. */
export function iter_mons(fn) {
    for (let mtmp = game.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1)
            continue;
        if ((mtmp.mstate | 0) !== (MON_FLOOR | 0))
            continue;
        fn(mtmp);
    }
}

/* C ref: nethack-c/src/mon.c:2051-2115 mon_allowflags()
 * Computes the mfndpos() ALLOW_x / BUSTDOOR/OPENDOOR/UNLOCKDOOR/NOTONL/NOGARLIC
 * flags for a monster. Macro-shaped C helpers (nohands/verysmall/is_giant/
 * tunnels/needspick/passes_walls/throws_rocks/is_minion/is_unicorn/is_human/
 * is_undead/is_vampshifter/unsolid/is_rider) are inlined as local per-callsite
 * flag checks, matching this file's established convention (see
 * m_poisongas_ok_nonliving above) rather than sharing the file-scope is_rider
 * stub (mon.c:2051's own copy must be correct, unlike that stub). */
export function mon_allowflags(mtmp) {
    const data = mtmp.data;
    const mflags1 = (data.mflags1 | 0);
    const mflags2 = (data.mflags2 | 0);

    const nohands_d = (mflags1 & 0x00002000) !== 0;      /* M1_NOHANDS */
    const verysmall_d = (data.msize | 0) < 1;            /* MZ_SMALL */
    const can_open = !(nohands_d || verysmall_d);
    const is_rider_d = data.pmidx === PM_DEATH_R || data.pmidx === PM_FAMINE
        || data.pmidx === PM_PESTILENCE;
    const can_unlock = (can_open && monhaskey(mtmp, true)) || !!mtmp.iswiz || is_rider_d;
    const doorbuster = (mflags2 & 0x00002000) !== 0;     /* M2_GIANT */
    let can_tunnel = (mflags1 & 0x00000020) !== 0        /* M1_TUNNEL */
        && !Is_rogue_level(game.u.uz);

    const Conflict = !!(game.u.uprops[CONFLICT].intrinsic || game.u.uprops[CONFLICT].extrinsic);

    if (can_tunnel && (mflags1 & 0x00000040) !== 0       /* M1_NEEDPICK */
        && ((!mtmp.mpeaceful || Conflict)
            && dist2(mtmp.mx, mtmp.my, mtmp.mux, mtmp.muy) <= 8))
        can_tunnel = false;

    let allowflags = 0;
    if (mtmp.mtame)
        allowflags |= ALLOW_M | ALLOW_TRAPS | ALLOW_SANCT | ALLOW_SSM;
    else if (mtmp.mpeaceful)
        allowflags |= ALLOW_SANCT | ALLOW_SSM;
    else
        allowflags |= ALLOW_U;
    if (Conflict && !resist_conflict(mtmp))
        allowflags |= ALLOW_U;
    if (mtmp.isshk)
        allowflags |= ALLOW_SSM;
    if (mtmp.ispriest)
        allowflags |= ALLOW_SSM | ALLOW_SANCT;
    if ((mflags1 & 0x00000008) !== 0)                    /* M1_WALLWALK: passes_walls */
        allowflags |= (ALLOW_ROCK | ALLOW_WALL);
    if ((mflags2 & 0x08000000) !== 0                     /* M2_ROCKTHROW: throws_rocks */
        || m_can_break_boulder(mtmp))
        allowflags |= ALLOW_ROCK;
    if (can_tunnel)
        allowflags |= ALLOW_DIG;
    if (doorbuster)
        allowflags |= BUSTDOOR;
    if (can_open)
        allowflags |= OPENDOOR;
    if (can_unlock)
        allowflags |= UNLOCKDOOR;
    if (passes_bars(data)
        && (mtmp !== game.u.ustuck || (((game.youmonst.data.mflags1 | 0) & 0x00100000) !== 0 /* unsolid */
                                        || (game.youmonst.data.msize | 0) < 1 /* verysmall */)))
        allowflags |= ALLOW_BARS;
    if ((mflags2 & 0x00001000) !== 0                     /* M2_MINION: is_minion */
        || is_rider_d)
        allowflags |= ALLOW_SANCT;
    if ((data.mlet | 0) === 21 /* S_UNICORN */ && (mflags2 & 0x20000000) !== 0 /* M2_JEWELS: likes_gems */
        && !noteleport_level(mtmp))
        allowflags |= NOTONL;
    if ((mflags2 & 0x00000008) !== 0                     /* M2_HUMAN: is_human */
        || data.pmidx === PM_MINOTAUR)
        allowflags |= ALLOW_SSM;
    if (((mflags2 & 0x00000002) !== 0 /* M2_UNDEAD: is_undead */ && (data.mlet | 0) !== 54 /* S_GHOST */)
        || mtmp.cham === PM_VAMPIRE || mtmp.cham === PM_VAMPIRE_LORD || mtmp.cham === PM_VLAD_THE_IMPALER /* is_vampshifter */)
        allowflags |= NOGARLIC;

    return allowflags >>> 0;
}

/* C mkobj.c:129-141 — release the monster snapshot stored in an object's
 * oextra.  JavaScript has no free(), so clearing the nested record and its
 * mextra is the observable equivalent of freeing it and nulling OMONST(obj). */
function free_omonst(otmp) {
    const x = otmp?.oextra;
    const mon = x?.omonst;
    if (!x || !mon)
        return;
    if (mon.mextra)
        dealloc_mextra(mon);
    x.omonst = null;
}

export function stairs_description(sway, outbuf, stcase) {
    let tolev = sway.tolev;
    let stairs = sway.isladder ? "ladder" : stcase ? "staircase" : "stairs";
    let updown = sway.up ? "up" : "down";

    if (!known_branch_stairs(sway)) {
        /* ordinary stairs or branch stairs to not-yet-visited branch */
        outbuf = stairs + " " + updown;
        if (sway.u_traversed) {
            let specialdepth = (tolev.dnum === game.quest_dnum
                                || single_level_branch()); /* knox */
            let to_dlev = specialdepth ? tolev.dlevel : depth_of_level(tolev);

            outbuf += " to level " + to_dlev;
        }
    } else if (game.u.uz.dnum === 0 && game.u.uz.dlevel === 1 && sway.up) {
        /* stairs up from level one are a special case; they are marked
           as having been traversed because the hero obviously started
           the game by coming down them, but the remote side varies
           depending on whether the Amulet is being carried */
        let haveAmulet = !!(game.u.uhave && game.u.uhave.amulet);
        outbuf = (!haveAmulet ? "" : "branch ") +
                 stairs + " " + updown + " " +
                 (!haveAmulet ? "out of the dungeon"
                  /* minimize our expectations about what comes next */
                  : ((tolev.dnum === game.earth_level.dnum && tolev.dlevel === game.earth_level.dlevel)
                     || (tolev.dnum === game.air_level.dnum && tolev.dlevel === game.air_level.dlevel)
                     || (tolev.dnum === game.fire_level.dnum && tolev.dlevel === game.fire_level.dlevel)
                     || (tolev.dnum === game.water_level.dnum && tolev.dlevel === game.water_level.dlevel))
                    ? "to the Elemental Planes"
                    : "to the end game");
    } else {
        /* known branch stairs; tacking on destination level is too verbose */
        outbuf = "branch " + stairs + " " + updown + " to " +
                 game.dungeons[tolev.dnum].dname;
        /* dungeons[].dname is capitalized; undo that for "The <Branch>" */
        outbuf = strsubst(outbuf, "The ", "the ");
    }
    return outbuf;
}


/* C monflag.h MS_* — only the values this tail actually tests. */
const MS_SILENT_SM = 0, MS_HUMANOID_SM = 25, MS_ARREST_SM = 26,
      MS_SOLDIER_SM = 27, MS_GUARD_SM = 28, MS_DJINNI_SM = 29, MS_NURSE_SM = 30,
      MS_SEDUCE_SM = 31, MS_VAMPIRE_SM = 32, MS_CUSS_SM = 34, MS_LEADER_SM = 36,
      MS_GUARDIAN_SM = 38, MS_SELL_SM = 39, MS_ORACLE_SM = 40, MS_PRIEST_SM = 41,
      MS_SPELL_SM = 42, MS_BOAST_SM = 43, MS_IMITATE_SM = 22, MS_WERE_SM = 23,
      MS_ORC_SM = 24, MS_GRUNT_SM = 11, MS_LAUGH_SM = 20, MS_ROAR_SM = 3,
      MS_BELLOW_SM = 4;
/* C monflag.h M1_HUMANOID / M1_MINDLESS. */
const M1_HUMANOID_SM = 0x00020000, M1_MINDLESS_SM = 0x00010000;

/* C pline.c:466-481 verbalize(line, ...) — a pline wrapped in double quotes
 * (the PLINE_VERBALIZE flag is a message-colour channel this port does not
 * model). */
function verbalize_sm(line) { pline('"' + line + '"'); }

/* C mondata.h:159 is_watch(ptr). */
function is_watch_sm(ptr) {
    const ix = (ptr?.pmidx ?? -1) | 0;
    return ix === PM_WATCHMAN || ix === PM_WATCH_CAPTAIN;
}

/* C mondata.c:1331-1351 big_little_match(montyp1, montyp2). */
function big_little_match_sm(montyp1, montyp2) {
    if (montyp1 === montyp2)
        return true;
    const m1 = permonstTemplate(montyp1), m2 = permonstTemplate(montyp2);
    if (!m1 || !m2 || (m1.mlet | 0) !== (m2.mlet | 0))
        return false;
    for (let l = montyp1, b; (b = little_to_big_pm(l)) !== l; l = b)
        if (b === montyp2)
            return true;
    for (let l = montyp2, b; (b = little_to_big_pm(l)) !== l; l = b)
        if (b === montyp1)
            return true;
    return false;
}

function maybe_gasp_sm(mon) {
    const Exclam = ["Gasp!", "Uh-oh.", "Oh my!", "What?", "Why?"];
    const mptr = mon.data;
    let msound = (mptr?.msound | 0);
    let dogasp = false;

    /* C sounds.c:556-558 — other roles' guardians and cross-aligned priests
     * don't gasp. */
    if ((msound === MS_GUARDIAN_SM && (mptr?.pmidx | 0) !== quest_info(MS_GUARDIAN_SM))
        || (msound === MS_PRIEST_SM && !p_coaligned(mon)))
        msound = MS_SILENT_SM;

    switch (msound) {
    case MS_HUMANOID_SM: case MS_ARREST_SM: case MS_SOLDIER_SM:
    case MS_GUARD_SM: case MS_NURSE_SM: case MS_SEDUCE_SM:
    case MS_LEADER_SM: case MS_GUARDIAN_SM: case MS_SELL_SM:
    case MS_ORACLE_SM: case MS_PRIEST_SM: case MS_BOAST_SM:
    case MS_IMITATE_SM:
        dogasp = true;
        break;
    /* C sounds.c:585-596 — "issue comprehensible word(s) if hero is similar
     * type of creature". */
    case MS_ORC_SM: case MS_GRUNT_SM: case MS_LAUGH_SM: case MS_ROAR_SM:
    case MS_BELLOW_SM: case MS_DJINNI_SM: case MS_VAMPIRE_SM:
    case MS_WERE_SM: case MS_SPELL_SM:
        dogasp = ((mptr?.mlet | 0) === (game.youmonst?.data?.mlet | 0));
        break;
    default:
        break;
    }
    if (dogasp)
        return Exclam[rn2(Exclam.length)];
    return null;
}

export function get_iter_mons(bfunc) {
    for (let mtmp = game.fmon, next; mtmp; mtmp = next) {
        next = mtmp.nmon;
        if ((mtmp.mhp | 0) < 1)       /* DEADMONSTER */
            continue;
        if (bfunc(mtmp))
            return mtmp;
    }
    return null;
}
export async function angry_guards(silent) {
    let ct = 0, nct = 0, sct = 0, slct = 0;
    for (let mtmp = game.fmon; mtmp; mtmp = mtmp.nmon) {
        if ((mtmp.mhp | 0) < 1) continue; /* DEADMONSTER */
        if (is_watch_sm(mtmp.data) && mtmp.mpeaceful) {
            ct++;
            if (canspotmon(mtmp) && mtmp.mcanmove) {
                if (_sm_m_next2u(mtmp)) nct++;
                else sct++;
            }
            if (mtmp.msleeping || mtmp.mfrozen) {
                slct++;
                mtmp.msleeping = mtmp.mfrozen = 0;
            }
            mtmp.mpeaceful = 0;
        }
    }
    if (ct) {
        if (!silent) {
            if (slct) {
                const buf = "guard" + (slct === 1 ? "" : "s");
                await pline("The " + buf + " " + vtense(buf, "wake") + " up.");
            }
            if (nct) {
                const buf = "guard" + (nct === 1 ? "" : "s");
                await pline("The " + buf + " " + vtense(buf, "get") + " angry!");
            } else if (sct) {
                const buf = "guard" + (sct === 1 ? "" : "s");
                await pline((sct === 1 ? "An angry" : "Angry") + " " + buf + " "
                      + vtense(buf, "are") + " approaching!");
            } else {
                const buf = (ct === 1) ? "a guard's" : "guards'";
                await You_hear("the shrill sound of " + buf + " whistle"
                      + (ct === 1 ? "" : "s") + ".");
            }
        }
        return true;
    }
    return false;
}

/* C mondata.h m_next2u(mon) — dist2(mon, hero) <= 2. */
function _sm_m_next2u(mon) {
    return dist2(mon.mx | 0, mon.my | 0, game.u.ux | 0, game.u.uy | 0) <= 2;
}

async function peacefuls_respond(mtmp) {
    const mndx = (mtmp.data?.pmidx ?? mtmp.mnum ?? -1) | 0;
    const Deaf = false;

    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1) continue;   /* DEADMONSTER */
        if (mon === mtmp) continue;

        const mdata = mon.data;
        /* C mondata.h mindless(ptr) = ptr->mflags1 & M1_MINDLESS. */
        if (((mdata?.mflags1 | 0) & M1_MINDLESS_SM) !== 0) continue;
        if (!mon.mpeaceful || !couldsee(mon.mx, mon.my) || mon.msleeping
            || !mon.mcansee || !m_canseeu(mon))
            continue;

        let buf = '', exclaimed = false, needpunct = false, alreadyfleeing;

        if (((mdata?.mflags1 | 0) & M1_HUMANOID_SM) || mon.isshk || mon.ispriest) {
            if (is_watch_sm(mdata)) {
                await pline("\"Halt!  You're under arrest!\"");
                await angry_guards(!!Deaf);
            } else {
                if (!Deaf && !rn2(5)) {
                    const gasp = maybe_gasp_sm(mon);
                    if (gasp) {
                        if (gasp.slice(0, 4).toLowerCase() === 'gasp') {
                            buf = Monnam(mon) + " gasps";
                            needpunct = true;
                        } else {
                            buf = Monnam(mon) + ' exclaims "' + gasp + '"';
                        }
                        exclaimed = true;
                    }
                }
                /* C mon.c:4203-4210 — shopkeepers and temple priests might gasp
                   in surprise, but they won't become angry here; quest leader
                   only gets angry if the hero attacks own quest guardians. */
                if (mon.isshk || mon.ispriest
                    || ((mdata?.pmidx | 0) === quest_info(MS_LEADER_SM)
                        && (mtmp.data?.pmidx | 0) !== _sm_guardnum())) {
                    if (exclaimed)
                        pline_mon(mon, "%s%s", buf, " then shrugs.");
                    continue;
                }
                if ((mdata?.mlevel | 0) < rn2(10)
                    && (mdata?.pmidx | 0) !== _sm_guardnum()) {
                    alreadyfleeing = (mon.mflee || mon.mfleetim);
                    await monflee(mon, rn2(50) + 25, true, !exclaimed);
                    if (exclaimed) {
                        if ((game.flags?.verbose ?? true) && !alreadyfleeing) {
                            buf += " and then turns to flee.";
                            needpunct = false;
                        }
                    } else {
                        exclaimed = true; /* got msg from monflee() */
                    }
                }
                if (buf)
                    pline_mon(mon, "%s%s", buf, needpunct ? "." : "");
                if (mon.mtame) {
                    /* C: mustn't set mpeaceful to 0 as below */
                } else {
                    mon.mpeaceful = 0;
                    mon.mstrategy = (mon.mstrategy | 0) & ~(STRAT_CLOSE | STRAT_WAITFORU);
                    adjalign(-1);
                    if (!exclaimed)
                        pline_mon(mon, "%s gets angry!", Monnam(mon));
                }
            }
        } else if ((mdata?.mlet | 0) === (mtmp.data?.mlet | 0)
                   && big_little_match_sm(mndx, (mdata?.pmidx | 0))
                   && !rn2(3)) {
            if (!rn2(4))
                exclaimed = !!growl(mon);
            if (rn2(6)) {
                alreadyfleeing = (mon.mflee || mon.mfleetim);
                await monflee(mon, rn2(25) + 15, true, !exclaimed);
                if (exclaimed && !alreadyfleeing)
                    pline("And then starts to flee.");
            }
        }
    }
}

/* C role.c gu.urole.guardnum, i.e. quest_info(MS_GUARDIAN). */
function _sm_guardnum() { return quest_info(MS_GUARDIAN_SM) | 0; }

/* C ref: mon.c:4137-4157 qst_guardians_respond() — RNG-FREE. */
function qst_guardians_respond() {
    const q_guardian = _sm_guardnum();
    let got_mad = 0;
    for (let mon = game.fmon; mon; mon = mon.nmon) {
        if ((mon.mhp | 0) < 1) continue;
        if ((mon.data?.pmidx | 0) === q_guardian && mon.mpeaceful) {
            mon.mpeaceful = 0;
            if (canseemon(mon))
                ++got_mad;
        }
    }
    if (got_mad && !_Hallucination_mk()) {
        /* C questpgr.c pmname(q_guardian, NEUTRAL) — makemon_pmnames.json rows
         * are [male, female, neutral] in C's pmnames[] order; NEUTRAL is the
         * last entry and is the only one C uses here. */
        const nrow = MONS_PMNAMES_ROWS[q_guardian] || [];
        let who = nrow[nrow.length - 1] || nrow[0] || "guardian";
        if (got_mad > 1)
            who = makeplural(who);
        pline("The " + who + " " + vtense(who, "appear") + " to be angry too...");
    }
}

// C ref: mon.c:4255 setmangry — monster gets angry at player
export async function setmangry(mtmp, via_attack) {
    const g = game;
    const u = g.u;
    /* C monst.h:177 STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU; both flags are
     * now imported from const.js at the top of this file (the local
     * `const STRAT_CLOSE` that used to live here shadowed that import). */
    const STRAT_WAITMASK = STRAT_CLOSE | STRAT_WAITFORU;
    const Blind = _Blind_mk();

    // sengr_at: check for Elbereth engraving at (x,y)
    function sengr_at(text, x, y, sense_only) {
        const ep = _engr_map.get(`${x},${y}`);
        if (!ep) return false;
        // Check if engraving text contains the given text
        return ep.text && ep.text.indexOf(text) >= 0;
    }

    // humanoid: check M1_HUMANOID flag
    const M1_HUMANOID = 0x00020000;
    function humanoid(ptr) {
        return ((ptr.mflags1 | 0) & M1_HUMANOID) !== 0;
    }

    if (via_attack && sengr_at("Elbereth", u.ux, u.uy, true)
        && (onscary(u.ux, u.uy, mtmp) || mtmp.mpeaceful)) {
        pline("You feel like a hypocrite.");
        adjalign((u.ualign.record > 5) ? -5 : -rnd(5));
        if (!Blind)
            pline("The engraving beneath you fades.");
        del_engr_at(u.ux, u.uy);
    }

    mtmp.mstrategy = (mtmp.mstrategy | 0) & ~STRAT_WAITMASK;
    if (!mtmp.mpeaceful)
        return;
    if (mtmp.mtame)
        return;
    mtmp.mpeaceful = 0;
    if (mtmp.ispriest) {
        if (p_coaligned(mtmp))
            adjalign(-5);
        else
            adjalign(2);
    } else {
        adjalign(-1);
    }
    if (humanoid(mtmp.data) || mtmp.isshk || mtmp.isgd) {
        if (couldsee(mtmp.mx, mtmp.my))
            pline_mon(mtmp, "%s gets angry!", Monnam(mtmp));
    } else {
        growl(mtmp);
    }

    if (mtmp.data && mtmp.data.pmidx === quest_info(MS_LEADER))
        qst_guardians_respond();

    /* mon.c:4316 — svc.context.mon_moving lives at game.context (allmain.js writes it) */
    if (!(g.context && g.context.mon_moving))
        await peacefuls_respond(mtmp);
}

registerSpLevSomexy(somexy);
