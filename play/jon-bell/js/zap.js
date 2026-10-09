// @ts-nocheck
// zap.c — zapyourself, dozap, obj_resists and helpers.
// C ref: nethack-c/src/zap.c
// @ts-nocheck — sibling imports from hand-maintained js/*.js.
import { rn2, rnd, rn1, d, pushRngLogEntry } from './rng.js';
import { mkobj, mksobj, rnd_class, OC_MERGE, m_respond, hideunder, dealloc_oextra, OC_USES_KNOWN, engr_at, del_engr_at, make_engr_at, wipe_engr_at, lowc, healmon, random_engraving, makemon, MONS_CWT, normal_shape, revive_corpse, sobj_at, minliquid, mlifesaver } from './mklev.js';
import { MKOBJ_OC_MAGIC, MKOBJ_OC_MATERIAL, MKOBJ_OC_OPROP } from './mkobj_erosion_meta.js';
import { PM_FLESH_GOLEM, PM_IRON_GOLEM, PM_STONE_GOLEM, PM_CLAY_GOLEM, PM_WOOD_GOLEM,
         PM_LEATHER_GOLEM, PM_ROPE_GOLEM, PM_SKELETON, PM_GOLD_GOLEM, PM_GLASS_GOLEM,
         PM_PAPER_GOLEM, PM_STRAW_GOLEM } from './pm.generated.js';
import { splitobj, ureflects, create_critters, which_armor, permonstTemplate } from './makemon.js';
import { is_demon, nonliving, check_gear_next_turn } from './makemon.js';
import { resists_magm, Resists_Elem, defended, sleep_monst, seemimic,
         erode_armor } from './mhitm.js';
import { x_monnam } from './mhitm.js';
import { resists_blnd as resists_blnd_real, take_resists_blnd_impossible } from './mhitm.js';
import { impossible } from './pline.js';
import { INFRAVISION } from './const.js';
import { BLINDED, HALLUC, HALLUC_RES, WAND_BACKFIRE_CHANCE, MSLOW, ANIMATE_SPELL, LIFESAVED } from './const.js';
import { ENGRAVE, HEADSTONE, ARM } from './const.js';
import { In_mines } from './const.js';
import { GETOBJ_SUGGEST, GETOBJ_EXCLUDE, GETOBJ_NOFLAGS } from './const.js';
import { LARGEST_INT, ARTICLE_A, SUPPRESS_SADDLE, has_mgivenname, G_GENOD, MM_NOMSG } from './const.js';
import { addtobill } from './shk.js';
import { ECMD_OK, ECMD_CANCEL, ECMD_TIME } from './const.js';
import { POOL, MOAT, DRAWBRIDGE_DOWN, IS_FOUNTAIN, Is_waterlevel, Is_airlevel } from './const.js';
import { PIT, FIRE_RES, COLD_RES, SHOCK_RES, SLEEP_RES, ACID_RES, DISINT_RES, POISON_RES, W_ARMOR, W_ACCESSORY, W_WEP, W_ART, W_RING, W_ARMG, W_ARMC, W_ARM, W_ARMU, W_ARMH, W_ARMF, W_ARMS, W_AMUL, W_TOOL, W_RINGL, W_RINGR, SDOOR, SCORR, DOOR, CORR, ROOM, D_CLOSED, D_LOCKED, D_TRAPPED, D_NODOOR, BOLT_LIM, STATUE_TRAP, STONE, ZAP_POS, IS_WALL, IS_OBSTRUCTED, IS_TREE, IS_ROOM, isok, W_NONDIGGABLE, Is_earthlevel, u_at, TRAPDOOR, HOLE, NO_TRAP_FLAGS } from './const.js';
import { xdir, ydir, N_DIRS, FUMBLING, IS_SINK } from './const.js';
import { game, wizard } from './gstate.js';
import { TtyMenu, PICK_ONE, ATR_NONE } from './tty_menu.js';
import { get_obj_location } from './light.js';
import { map_trap } from './display.js';
import { BURIED_TOO, CONTAINED_TOO, TRAPPED_CHEST, Has_contents } from './const.js';
import { pline, Norep, flush_screen, newsym, feel_newsym, canspotmon, canseemon, _topl_joins_snapshot, _topline_more_pending, _defer_until_more_dismissed, tmp_at, zapdir_to_glyph, map_invisible, unmap_invisible, DISP_BEAM, DISP_CHANGE, DISP_END, DISP_FLASH, newsym_force, _topl_merge_result, shieldeff as shieldeff_real } from './display.js';
import { topl_park_cursor, _topl_stash_result, flush_pending_messages } from './display.js';
import { bot, see_monsters, force_more } from './display.js';
import { deadhero, pending_death_is_final, do_death_sequence } from './end.js';
/* unconscious()/is_fainted() — the two halves of youprop.h:399 Unaware, used by
 * resists_blnd's hero arm (mondata.c:253).  Real ported bodies, not stubs. */
import { unconscious } from './pickup.js';
/* C zap.c cancel_item()/cancel_monst() dependencies.  unbless/uncurse live in
 * js/mkobj.js, C's own home for them (see that file's header on why the port
 * has one shared body rather than a sixth hand-written copy); find_ac is
 * do_wear.c's; rehumanize is polyself.c's. */
import { unbless, uncurse } from './mkobj.js';
import { find_ac, disintegrate_arm } from './do_wear.js';
import { rehumanize } from './polyself.js';
import { NOTELL, ANTIMAGIC, UNCHANGING, SLIMED, INVIS, DRAIN_RES, STONED } from './const.js';
import { FAST, TIMEOUT, INTRINSIC, LEG, STUNNED, SEE_INVIS, TELEPAT, DETECT_MONSTERS } from './const.js';
import { is_fainted } from './eat.js';
import { do_clear_area, unblock_point, recalc_block_point, vision_recalc, does_block, block_point } from './vision.js';
import { t_at, burnarmor, monkilled_trap, extract_from_minvent as disint_extract, fill_pit, delfloortrap, closeholdingtrap, openholdingtrap, openfallingtrap, find_mac, m_useup, sokoban_guilt, goodpos, mon_adjust_speed, thitu, animate_statue, activate_statue_trap, dotrap, maketrap, mintrap, erode_obj, grease_protect, trap_ice_effects, unearth_objs } from './trap.js';
import { cansee } from './vision.js';
import { is_ice } from './engrave.js';
import { create_gas_cloud } from './region.js';
import { closed_door, may_dig, is_pool } from './look.js';
import { m_at, mon_nam, xkilled, XKILL_GIVEMSG, XKILL_NOCORPSE, more_experienced, dmgval, u_slow_down } from './uhitm.js';
import { more_experienced as more_experienced_faithful, losexp } from './exper.js';
/* C ref: mondata.h DEADMONSTER(mon) — mhp <= 0. */
function DEADMONSTER(mon) { return !!(mon && (mon.mhp | 0) <= 0); }
import { nhgetch } from './input.js';
import { exercise, get_artifact, arti_spfx, arti_cspfx, ART_NONARTIFACT, acurr } from './attrib.js';
/* observe_object() lives in o_init.c, i.e. js/o_init.js — import the ONE body.
 * js/zap.js already imported discover_object from here, so no new edge. */
import { discover_object, observe_object } from './o_init.js';
import { FF_FAITHFUL, drain_pending_death_in_place } from './fastforward.js';
import { obj_typename, an, An, makeplural, The, vtense, cloak_simple_name, suit_simple_name, helm_simple_name, gloves_simple_name, boots_simple_name, shield_simple_name, shirt_simple_name as shirt_simple_name_real, xname_ring, xname_wand, Tobjnam, simpleonames, distant_name as distant_name_real, aobjnam, killer_xname, is_quest_artifact } from './objnam.js';
import { nomul } from './allmain.js';
import { set_bc } from './ball.js';
import { xname, yname, silly_thing_dw, hard_helmet } from './do_wear.js';
import { useup as _destroy_useup, useupf, compactify, getobj_redo_menu, check_capacity, learn_unseen_invent, confdir, getObjFromGetobj, hero_breaks, boulder_hits_pool, obj_extract_self_general, costly_alteration as costly_alteration_real } from './cmd.js';
import { setnotworn } from './worn.js';
import { Ring_gone as _ring_gone } from './do_wear.js';
import { xytodir, throwit_mon_hit, endmultishot } from './cmd.js';
import { ceiling, body_part } from './cmd.js';
import { delobj, hot_pursuit, losehp, obfree } from './dokick.js';
import { weight } from './weight.js';
import { ignite_items, mon_mattk_raw, poisoned_u, expels_gu } from './mhitu.js';
import { stackobj } from './sp_lev.js';
import { HEAD, EYE } from './const.js';
import { mksobj_at, stairway_at } from './mklev.js';

/* C objnam.c:347 distant_name — use the canonical object naming body. */
async function distant_name(otmp, func) { return await distant_name_real(otmp, func); }
import { polyself, polymon, rehumanize as rehumanize_real } from './polyself.js';
import { healup, potionbreathe, make_slimed, make_stoned, self_invis_message, do_enlightenment_effect as do_enlightenment_effect_real, make_stunned, dryup } from './potion.js';
import { is_youmonst } from './mhitm.js';
/* C zap.c:2578 zapnodir() calls the same makewish() that wizcmds.c:38 does —
 * there is only one in C (zap.c:6307).  The port lives in js/wizcmds.js. */
import { makewish } from './wizcmds.js';
/* C zap.c:2549 zapnodir() calls the same litroom() that read.c's seffect_light
 * does — there is only one in C (read.c:2491).  The port lives in js/read.js;
 * this file used to redeclare it as a throw-stub, shadowing that body for
 * zapnodir()'s WAN_LIGHT / SPE_LIGHT arm (see the note at the former stub). */
import { litroom } from './read.js';
import { PM_GREMLIN, PM_SILVER_DRAGON, PM_CHROMATIC_DRAGON, PM_HEALER, PM_KNIGHT, PM_MONK, PM_CYCLOPS, PM_FLOATING_EYE } from './pm.generated.js';
/* pm.generated.js's generator dropped this one as a "duplicate" of PM_PRIEST
 * (275, the temple NPC) — the role player-character monster ("priest,
 * priestess, cleric", monsters.h) sits at index 337, between PM_MONK (336)
 * and PM_RANGER (338), which is what C's `you.h` PM_CLERIC macro names.
 * Verified by counting monsters.h's MON() role block in file order.
 * (PM_WIZARD (343) is NOT re-imported here — it already exists as a local
 * const below, in the same value, for is_mplayer's PM_ARCHEOLOGIST..
 * PM_WIZARD bound; reuse it rather than collide with a second binding.) */
const PM_CLERIC_ZAP = 337;
// ── Attribute indices (attrib.h:16-22 A_STR..A_CHA) ──────────────────────────
// These used to be three local `const`s (A_STR/A_WIS/A_CON only), so
// drain_item's A_INT / A_DEX / A_CHA arms read unbound identifiers and raised
// ReferenceError.  js/const.js already carries the full, frozen-file-backed
// set (const.js:238-243), so import it rather than re-declaring a partial
// copy — a duplicated constant set is exactly what drifted in weapon_descr.
import { A_STR, A_INT, A_WIS, A_DEX, A_CON, A_CHA } from './const.js';
// objects[otyp].oc_skill, for is_weptool (obj.h:249).  Same generated table
// js/cmd.js:8129 uses; not re-declared here.
import { MKOBJ_OC_SKILL } from './mkobj_erosion_meta.js';
// ── explode.c support (mon_explodes / explode, the AT_BOOM gas-spore path) ──
// C ref: nethack-c-v5/upstream/src/explode.c.  Every name below is an existing
// ported body elsewhere in js/; none of them is re-derived here.
import { DEAF, INVULNERABLE, PLNMSG_CAUGHT_IN_EXPLOSION, PLNMSG_TOWER_OF_FLAME,
         MAXEXPCHARS, EXPL_DARK, EXPL_NOXIOUS, EXPL_MAGICAL, EXPL_FIERY, EXPL_FROSTY,
         MON_EXPLODE, BURNING_OIL, TRAP_EXPLODE, KILLED_BY_AN, KILLED_BY, MALE, FEMALE,
         DIED, Upolyd, engulfing_u, M_AP_TYPE, M_SEEN_MAGR, M_SEEN_FIRE,
         M_SEEN_COLD, M_SEEN_SLEEP, M_SEEN_DISINT, M_SEEN_ELEC, M_SEEN_REFL, LOST_EXPLODING,
         HALF_SPDAM } from './const.js';
import { Monnam, monstseesu, monstunseesu,
         death_inflicted_by, burn_away_slime } from './mcastu.js';
import { s_suffix, ugolemeffects } from './mhitm.js';
import { rndmonnam } from './priest.js';
import { end_burn, fall_asleep } from './timeout.js';
import { monPmname, nonlivingMon, mon_set_minvis } from './makemon.js';
import { setmangry, wake_nearto } from './mklev.js';
/* C explode.c:1048-1051 — mon_explodes kills the exploder BEFORE explode() so
 * it "won't appear to be caught in its own explosion".  This was a throw on the
 * premise that mondead() was unported; js/mklev.js:15066 has it. */
import { mondead as mondead_zap } from './mklev.js';
import { pay_for_damage } from './shk.js';
import { shk_your as shk_your_uy, Shk_Your as Shk_Your_uy } from './shk.js';
import { corpse_xname as corpse_xname_uy } from './objnam.js';
import { encumber_msg } from './weight.js';
import { dist2 } from './hacklib.js';
import { LAVAPOOL, LAVAWALL, IRONBARS, DRAWBRIDGE_UP, ICE, VWALL, HWALL,
         ICED_POOL, ICED_MOAT, DB_UNDER, DB_FLOOR, DB_ICE, IS_WATERWALL,
         SHOP_BARS_COST, SHOP_DOOR_COST, SHOP_WALL_COST, SHOPBASE, D_BROKEN, TT_LAVA,
         TT_INFLOOR, MELT_ICE_AWAY, PASSES_WALLS, TIMER_LEVEL,
         Is_rogue_level, ERODE_CORRODE, EF_GREASE, EF_VERBOSE,
         M_SEEN_ACID } from './const.js';
import { hliquid } from './mhitm.js';
import { You_hear } from './display.js';
import { docrt } from './display.js';
import { couldsee } from './vision.js';
import { in_rooms, add_damage, shop_keeper, costly_spot, currency, billable } from './shk.js';
import { picking_at, reset_pick, getdir, boxlock, doorlock } from './lock.js';
import { stop_occupation } from './allmain.js';
import { fix_wall_spines, obj_ice_effects, maybe_unhide_at } from './mklev.js';
import { set_ustuck } from './mklev.js';
import { On_stairs } from './mklev.js';
import { unstuck } from './dog.js';
import { spot_time_left, spot_stop_timers, start_timer } from './timeout.js';
import { spoteffects } from './landing-effects.js';
import { is_moat, is_db_wall, find_drawbridge } from './dokick.js';
import { shkname, stolen_value } from './dokick.js';
import { cvt_sdoor_to_door, draft_message, set_utrap, dighole, bury_an_obj, unpunish,
         destroy_drawbridge, open_drawbridge, close_drawbridge } from './dig.js';
import { rloco } from './steal.js';
import { reset_utrap } from './trap.js';
import { waterbody_name, set_uinwater, switch_terrain } from './cmd.js';
import { long_to_any, mstatusline, display_minventory } from './cmd.js';
import { noit_Monnam } from './mhitm.js';
import { wakeup, wakeup_attack, update_inventory } from './mhitm.js';
import { sticks, abuse_dog } from './dog.js';
import { mhurtle } from './cmd.js';
import { XKILL_NOMSG, XKILL_NOCONDUCT } from './uhitm.js';
/* C zap.c:341-347 bhitm's WAN_TELEPORTATION/SPE_TELEPORT_AWAY case needs
 * u_teleport_mon (teleport.c:2261-2292) — a real, fully-ported exported body
 * (js/uhitm.js has its own file-local shadow copy of the same name, unused
 * here; this import binds the teleport.js export, not that shadow). */
import { u_teleport_mon, tele } from './teleport.js';
/* C zap.c:263-333 bhitm's WAN_POLYMORPH/SPE_POLYMORPH/POT_POLYMORPH case needs
 * newcham (mon.c:5277, the real body — js/mklev.js:16429) and bypass_obj
 * (worn.c:1110, js/worn.js) — both real, fully-ported exported bodies. */
import { newcham } from './mklev.js';
import { bypass_obj } from './worn.js';
import { NON_PM, MCORPSENM, ismnum, NO_NC_FLAGS, NC_SHOW_MSG, NC_VIA_WAND_OR_SPELL } from './const.js';
import { PM_LONG_WORM } from './pm.generated.js';
import { PM_RANGER, PM_ROGUE } from "./pm.generated.js";
import { FAILEDUNTRAP, CONFUSION } from "./const.js";
import { rnl } from "./rng.js";
import { is_blade } from "./cmd.js";
import { trapname } from "./makemon.js";
import { can_reach_floor } from "./hold_another_object.js";
import { cnv_trap_obj, deltrap } from "./trap.js";
import { test_move as _ut_test_move, check_leash as _ut_check_leash, bad_rock as _ut_bad_rock, dismount_steed } from './cmd.js';
import { vision_recalc as _ut_vision_recalc } from './vision.js';
import { exercise as _ut_exercise } from './attrib.js';
import { inv_weight as _ut_inv_weight, weight_cap as _ut_weight_cap, calc_capacity as _ut_calc_capacity } from './weight.js';
import { helpless as _ut_helpless, killed } from './mhitm.js';
import { set_malign as _ut_set_malign } from './makemon.js';
import { rider_cant_reach as _ut_rider_cant_reach } from './steed.js';
import { stumble_onto_mimic as _ut_stumble_onto_mimic, touch_petrifies as _ut_touch_petrifies } from './uhitm.js';
import { TEST_MOVE, WT_TOOMUCH_DIAGONAL, M_AP_OBJECT, M_AP_FURNITURE, BEAR_TRAP, LANDMINE, SQKY_BOARD, DART_TRAP, ARROW_TRAP, SPIKED_PIT, STONE_RES, is_pit } from './const.js';
import { reward_untrap } from './trap.js';
import { ENV } from './hostenv.js';
// C ref: nethack-c/include/objects.h WAND() entries, sequential from WAN_LIGHT.
const WAN_LIGHT = 410;
const WAN_SECRET_DOOR_DETECTION = 411;
const WAN_ENLIGHTENMENT = 412;
const WAN_CREATE_MONSTER = 413;
const WAN_WISHING = 414;
const WAN_STASIS = 415;
const WAN_NOTHING = 416;
const WAN_STRIKING = 417;
const WAN_MAKE_INVISIBLE = 418;
const WAN_SLOW_MONSTER = 419;
const WAN_SPEED_MONSTER = 420;
const WAN_UNDEAD_TURNING = 421;
const WAN_POLYMORPH = 422;
const WAN_CANCELLATION = 423;
const WAN_TELEPORTATION = 424;
const WAN_OPENING = 425;
const WAN_LOCKING = 426;
const WAN_PROBING = 427;
const WAN_DIGGING = 428;
const WAN_MAGIC_MISSILE = 429;
const WAN_FIRE = 430;
const WAN_COLD = 431;
const WAN_SLEEP = 432;
const WAN_DEATH = 433;
/* C ref: hack.h NO_KILLER_PREFIX (js/const.js:333) — the killer.format that
 * says killer.name is a complete phrase, not something to prefix. */
const NO_KILLER_PREFIX_ZAP = 2;
const WAN_LIGHTNING = 434;
// ── oc_dir constants (objects.h: NODIR/IMMEDIATE/RAY) ────────────────────────
// C ref: nethack-c/include/objects.h — the dir field of each WAND()/SPELL().
// dozap branches on objects[otyp].oc_dir; weffects() dispatches on it too.
const NODIR = 1;
const IMMEDIATE = 2;
const RAY = 3;
// Per-wand oc_dir, verbatim from objects.h WAND() entries (otyp 410..434).
// NODIR: light, secret door detection, enlightenment, create monster, wishing,
//        stasis.  IMMEDIATE: nothing..probing.  RAY: digging..lightning.
const WAND_OC_DIR = {
    410: NODIR, 411: NODIR, 412: NODIR, 413: NODIR, 414: NODIR, 415: NODIR,
    416: IMMEDIATE, 417: IMMEDIATE, 418: IMMEDIATE, 419: IMMEDIATE, 420: IMMEDIATE,
    421: IMMEDIATE, 422: IMMEDIATE, 423: IMMEDIATE, 424: IMMEDIATE, 425: IMMEDIATE,
    426: IMMEDIATE, 427: IMMEDIATE,
    428: RAY, 429: RAY, 430: RAY, 431: RAY, 432: RAY, 433: RAY, 434: RAY,
};
const SPBOOK_OC_DIR = {
    366: RAY, 367: RAY, 368: RAY, 369: RAY, 370: RAY, 371: RAY,
    372: NODIR, 373: NODIR, 374: IMMEDIATE, 375: IMMEDIATE, 376: IMMEDIATE,
    377: IMMEDIATE, 378: IMMEDIATE, 379: IMMEDIATE, 380: IMMEDIATE,
    381: IMMEDIATE, 382: NODIR, 383: NODIR, 384: NODIR, 385: NODIR,
    386: NODIR, 387: IMMEDIATE, 388: NODIR, 389: NODIR, 390: NODIR,
    391: IMMEDIATE, 392: NODIR, 393: NODIR, 394: NODIR, 395: NODIR,
    396: NODIR, 397: NODIR, 398: IMMEDIATE, 399: IMMEDIATE, 400: IMMEDIATE,
    401: NODIR, 402: IMMEDIATE, 403: NODIR, 404: IMMEDIATE, 405: IMMEDIATE,
    406: NODIR, 407: NODIR,
};
// objects[otyp].oc_dir lookup (defaults to NODIR for unmapped otyps).
function oc_dir_of(otyp) {
    if (Object.prototype.hasOwnProperty.call(WAND_OC_DIR, otyp)) return WAND_OC_DIR[otyp];
    if (Object.prototype.hasOwnProperty.call(SPBOOK_OC_DIR, otyp)) return SPBOOK_OC_DIR[otyp];
    return NODIR;
}
// ── Spell type constants (objects.h — SPBOOK_CLASS base = 366) ───────────────
// C ref: u_init.js SPBOOK_OC_LEVEL_C array comments for confirmed offsets.
const SPE_DIG = 366;
const SPE_MAGIC_MISSILE = 367;
const SPE_FIREBALL = 368;
const SPE_CONE_OF_COLD = 369;
const SPE_SLEEP = 370;
const SPE_FINGER_OF_DEATH = 371;
const SPE_HEALING = 374;
const SPE_KNOCK = 375;
const SPE_FORCE_BOLT = 376;
const SPE_DRAIN_LIFE = 379;
const SPE_SLOW_MONSTER = 380;
const SPE_WIZARD_LOCK = 381;
const SPE_LIGHT = 372; /* SPELL#9; SPE_DIG(366)+6 */
const SPE_DETECT_UNSEEN = 389;
const SPE_EXTRA_HEALING = 391;
const SPE_TURN_UNDEAD = 398;
const SPE_POLYMORPH = 399;
const SPE_TELEPORT_AWAY = 400;
const SPE_CANCELLATION = 402;
const SPE_STONE_TO_FLESH = 405;
/* C obclass.h POT_POLYMORPH otyp — js/potion.js:2849 carries the same literal
 * (unexported); bhitm's switch shares this arm with WAN_POLYMORPH/
 * SPE_POLYMORPH even though only the wand-zap path reaches it through this
 * file today. */
const _BHITM_POT_POLYMORPH = 316;
// ── Horn/tool constants ────────────────────────────────────────────────────────
// C ref: u_init.js lines 830-831 (verified).
const FROST_HORN = 250;
const FIRE_HORN = 251;
const EXPENSIVE_CAMERA = 229;
// ── Damage type constants (monattk.h) ─────────────────────────────────────────
// C ref: nethack-c/include/monattk.h AD_* definitions.
const AD_FIRE = 2;
const AD_COLD = 3;
const AD_ELEC = 6;
const AD_DISN = 5;
const AD_ACID = 8;
const AD_RBRE = 242; /* monattk.h — random breath weapon (resist's monkilled adtyp) */
const AD_DGST = 26;
const AT_ENGL = 11; /* monattk.h:21 — engulf (swallow or by a cloud) */
const AD_DRLI = 15; /* monattk.h:57 — drains life levels (drain_item's defends() arg) */
const DWARVISH_CLOAK = 141; /* objects.h CLOAK() DWARVISH_CLOAK; was 144 = ALCHEMY_SMOCK */
// ── Oclass constants ─────────────────────────────────────────────────────────
// C ref: nethack-c/include/objects.h GENERIC() entries.
const WEAPON_CLASS = 2;
/* ARMOR_CLASS was NOT declared here; drain_item read it unbound and only
 * survived by accident, because js/uhitm.js:64 does `globalThis.ARMOR_CLASS = 3`
 * at module load ("global for zap.js drain_item").  That makes zap.js's
 * behaviour depend on uhitm.js having been imported first — declare it locally,
 * as do_wear.js:953 and objnam.js:54 already do. */
const ARMOR_CLASS = 3;
const RING_CLASS = 4;
const TOOL_CLASS = 6;
const FOOD_CLASS = 7;
const POTION_CLASS = 8;
const SCROLL_CLASS = 9;
const SPBOOK_CLASS = 10;
const WAND_CLASS = 11;
/* ── otyp constants for destroyable()/maybe_destroy_item() ── */
const GLOB_OF_GREEN_SLIME = 273; /* FOOD_CLASS — boils & explodes on fire */
const POT_OIL = 321;             /* the one potion that doesn't shatter on cold */
const SCR_FIRE = 339;            /* fire scroll — immune to AD_FIRE */
// ── Ring otyp bounds for oc_charged check ─────────────────────────────────────
// C ref: u_init.js lines 905-906 — rings 173-178 have oc_charged=1 (spec=1).
// adornment(173), gain_str(174), gain_con(175), inc_acc(176), inc_dmg(177),
// protection(178).  All ring otyps >= 179 have oc_charged=0.
const RIN_BASE = 173;
const RIN_LAST_CHARGED = 178;
/* The six oc_charged ring otyps, by name, for drain_item's switch.  They were
 * read unbound (ReferenceError) because no js/ module exported them.
 * Anchored to RIN_BASE rather than spelled out as six independent literals so
 * the set cannot drift away from the range check two lines up.
 * C ref: objects.h RING() entries in declaration order — adornment(741),
 * gain strength(743), gain constitution(746), increase accuracy(749),
 * increase damage(752), protection(755).
 * RIN_BASE=173 is cross-checked against the generated object table: rings are
 * the 28 consecutive otyps 173..200 with oc_weight 3 (js/oc_weight.generated.js;
 * otyp 172 has weight 15, otyp 201 has weight 20), and objects.h holds exactly
 * 28 RING() entries.  do_wear.js:2219 independently carries RIN_ADORNMENT=173. */
const RIN_ADORNMENT = RIN_BASE;               /* 173 */
const RIN_GAIN_STRENGTH = RIN_BASE + 1;       /* 174 */
const RIN_GAIN_CONSTITUTION = RIN_BASE + 2;   /* 175 */
const RIN_INCREASE_ACCURACY = RIN_BASE + 3;   /* 176 */
const RIN_INCREASE_DAMAGE = RIN_BASE + 4;     /* 177 */
const RIN_PROTECTION = RIN_BASE + 5;          /* 178 == RIN_LAST_CHARGED */
/* C ref: objects.h HELM("helm of brilliance", ...) at 470 and
 * GLOVES("gauntlets of dexterity", ...) at 695.  Both cross-checked against
 * js/oc_weight.generated.js: OC_WEIGHT[96]==40 matches the helm's wt column,
 * and OC_WEIGHT[159..162]==[10,10,30,10] matches leather gloves / gauntlets of
 * fumbling / of power / of dexterity exactly, pinning dexterity at 162.
 * do_wear.js:95-96 and objnam.js:91 independently carry the same two values. */
const HELM_OF_BRILLIANCE = 96;
const GAUNTLETS_OF_DEXTERITY = 162;
const RIN_SHOCK_RESIST = 191; /* C objects.h — RIN_SHOCK_RESISTANCE is the 19th ring
                               * (ADORNMENT=173 .. SHOCK_RESISTANCE at index 18 = 191).
                               * Was 198 (which is actually RIN_INVISIBILITY); that bug
                               * made an invisibility ring non-destroyable under AD_ELEC,
                               * undercounting destroy_items' elig_stacks by one. */
// ── destroy_items constants ────────────────────────────────────────────────────
// C ref: nethack-c/src/zap.c lines 5950,5952.
const DMG_DESTROY_SCALE = 5;
const MAX_ITEMS_DESTROYED = 20;
// ── Object type constants (for obj_resists) ───────────────────────────────────
const AMULET_OF_YENDOR = 213;
const SPE_BOOK_OF_THE_DEAD = 409;
const CANDELABRUM_OF_INVOCATION = 262;
const BELL_OF_OPENING = 263;
const CORPSE = 265;
// Monster indices for is_rider macro (mondata.h:161-163)
const PM_DEATH = 311;
const PM_PESTILENCE = 312;
const PM_FAMINE = 313;
/**
 * Item resists destruction from force bolt or other zaps.
 * C ref: zap.c obj_resists(1457-1473).
 *
 * @param {{ otyp: number, oartifact: number, corpsenm: number }} obj
 * @param {number} ochance — percent chance for ordinary objects
 * @param {number} achance — percent chance for artifacts
 * @returns {boolean}
 */
export function obj_resists(obj, ochance, achance) {
    // Unique items always resist (early return, no RNG consumed).
    if (obj.otyp === AMULET_OF_YENDOR
        || obj.otyp === SPE_BOOK_OF_THE_DEAD
        || obj.otyp === CANDELABRUM_OF_INVOCATION
        || obj.otyp === BELL_OF_OPENING
        || (obj.otyp === CORPSE && (obj.corpsenm === PM_DEATH || obj.corpsenm === PM_PESTILENCE || obj.corpsenm === PM_FAMINE))) {
        return true;
    }
    const chance = rn2(100);
    return chance < (obj.oartifact ? achance : ochance);
}

/**
 * Returns TRUE if obj resists polymorphing.
 * C ref: zap.c obj_unpolyable(1677-1683)
 * Macro: obj.h:429-432 unpolyable(o)
 *
 * @param {{ otyp: number }} obj
 * @returns {boolean}
 */
export function obj_unpolyable(obj) {
    // unpolyable macro: check if object type is a polymorph item or unchanging amulet
    // Object type numbers from u_init.js
    const WAN_POLYMORPH_OTYP = 422;
    const SPE_POLYMORPH_OTYP = 399;
    const POT_POLYMORPH_OTYP = 316;
    const AMULET_OF_UNCHANGING_OTYP = 207;

    if (obj.otyp === WAN_POLYMORPH_OTYP
        || obj.otyp === SPE_POLYMORPH_OTYP
        || obj.otyp === POT_POLYMORPH_OTYP
        || obj.otyp === AMULET_OF_UNCHANGING_OTYP) {
        return true;
    }

    // Check if obj is uball or uskin (global worn items)
    // These are stored in game.u if initialized
    const u = game.u || {};
    if ((u.uball && u.uball === obj) || (u.uskin && u.uskin === obj)) {
        return true;
    }

    // obj_resists(obj, 5, 95)
    return obj_resists(obj, 5, 95);
}
/* C ref: nethack-c/include/youprop.h:87-103.
 *   HBlinded u.uprops[BLINDED].intrinsic / EBlinded .extrinsic / BBlinded .blocked
 *   BlindedTimeout (HBlinded & TIMEOUT)
 *   Blind ((HBlinded || EBlinded) && !BBlinded)
 * Read exactly the way js/display.js:2296-2301 (the botl "Blind" condition)
 * already reads the same triple, so the status line and this agree by
 * construction. */
/* BLINDED is prop.h's property index (15); take it from const.js rather than
 * repeating the literal the ZT_LIGHTNING miss arm below spells out as _uhas(15). */
const _TIMEOUT_MASK = 0x00ffffff; /* prop.h:135 TIMEOUT */
function _blind_prop() {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[BLINDED])
        u.uprops[BLINDED] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[BLINDED];
}
function _Blind() {
    const p = _blind_prop();
    return !!(((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0));
}
function _BlindedTimeout() {
    return (_blind_prop().intrinsic | 0) & _TIMEOUT_MASK;
}
/* The three HBlinded accessors, exported so callers outside this module read
 * and write THE SAME u.uprops[BLINDED] object make_blinded/_Blind do.  Added
 * for js/cmd.js wipeoff() (do.c:2361), which needs BlindedTimeout, the raw
 * HBlinded truth test and set_itimeout(&HBlinded, ...).  Exporting beats a
 * fourth file-local copy: js/ already carries three spellings of the hero
 * property table and only one of them is live. */
export function BlindedTimeout() {
    return _BlindedTimeout();
}
/* C ref: youprop.h:87 HBlinded — u.uprops[BLINDED].intrinsic, the WHOLE field
 * (timeout bits plus FROMOUTSIDE/FROMFORM), which is what C's `if (!HBlinded)`
 * tests.  Not the same question as BlindedTimeout(). */
export function HBlinded() {
    return _blind_prop().intrinsic | 0;
}
/* C ref: potion.c:69 set_itimeout(&HBlinded, val) — see _set_HBlinded. */
export function set_HBlinded(val) {
    _set_HBlinded(val);
}
/* C ref: potion.c:76 incr_itimeout(&HBlinded, incr) = set_itimeout(&HBlinded,
 * itimeout_incr(HBlinded, incr)), and itimeout_incr adds to the TIMEOUT part
 * only, leaving the non-timeout bits alone (potion.c:63-70). */
export function incr_HBlinded(incr) {
    _set_HBlinded(_BlindedTimeout() + (incr | 0));
}
/* C ref: nethack-c/src/potion.c:55-79 itimeout / set_itimeout, applied to
 * HBlinded.  itimeout clamps to [0, TIMEOUT]; set_itimeout clears the timeout
 * bits and ORs the clamped value back in, preserving FROMOUTSIDE/FROMFORM. */
function _set_HBlinded(val) {
    let v = val | 0;
    if (v >= _TIMEOUT_MASK) v = _TIMEOUT_MASK;
    else if (v < 1) v = 0;
    const p = _blind_prop();
    p.intrinsic = ((p.intrinsic | 0) & ~_TIMEOUT_MASK) | v;
}
function toggle_blindness() {
    game.disp = game.disp || {};
    game.disp.botl = 1;                 /* SET_BOTL */
    game.vision_full_recalc = 1;
    vision_recalc(0);
    /* C potion.c:355-356 — `if (Blind_telepat || Infravision || Stinging)
     * see_monsters();`.  A hero seeing by infravision loses those monsters the
     * moment sight goes: vision_recalc's blind arm only repaints IN_SIGHT
     * cells, and an infravisible monster in a dark spot is COULD_SEE only. */
    {
        const up = game.u?.uprops;
        const has = (p) => !!(up?.[p]?.intrinsic || up?.[p]?.extrinsic);
        if (has(TELEPAT) || has(INFRAVISION))
            see_monsters();
    }
    /* C potion.c:362-363 — "update dknown flag for inventory picked up while
     * blind": `if (!Blind) learn_unseen_invent();`. */
    if (!_Blind())
        learn_unseen_invent();
}
/* C ref: include/youprop.h:115-120 Hallucination —
 *     /\* Hallucination is solely a timeout *\/
 *     #define HHallucination     u.uprops[HALLUC].intrinsic
 *     #define HHalluc_resistance u.uprops[HALLUC_RES].intrinsic
 *     #define EHalluc_resistance u.uprops[HALLUC_RES].extrinsic
 *     #define Halluc_resistance  (HHalluc_resistance || EHalluc_resistance)
 *     #define Hallucination      (HHallucination && !Halluc_resistance)
 *
 * The citation this comment used to carry — "youprop.h:169,
 * ((HHallucination || EHallucination) && !Halluc_resistance)" — was
 * fabricated in both halves.  youprop.h:169 is Warn_of_mon, and there is no
 * EHallucination macro in either tree: hallucination is solely a timeout, so
 * the HALLUC slot is read for its INTRINSIC only.  Confirmed on the data side
 * too — objects.h:1139 gives POT_HALLUCINATION oc_oprop HALLUC, which is a
 * quaff timeout and not a worn extrinsic, and no C site writes
 * u.uprops[HALLUC].extrinsic.  So dropping the || extrinsic term restores the
 * macro without changing any reachable result.  js/fastforward.js:808 carries
 * the same body and the same fabricated citation. */
function _Halluc() {
    const up = game.u?.uprops;
    const hres = up?.[HALLUC_RES];
    if (hres?.intrinsic || hres?.extrinsic)
        return false;
    const h = up?.[HALLUC];
    return !!(h?.intrinsic);
}
export function make_blinded(xtime, talk) {
    const old = _BlindedTimeout();
    const u_could_see = !_Blind();
    /* probe ahead exactly as C does (potion.c:267-272) */
    _set_HBlinded(xtime ? 1 : 0);
    const can_see_now = !_Blind();
    _set_HBlinded(old);

    /* C potion.c:274-275 — `if (Unaware) talk = FALSE;`.  Unaware is
     * youprop.h's (gm.multi < 0 && (unconscious() || is_fainted())), the same
     * expression _u_resists_blnd() below already reads. */
    if (((game.multi | 0) < 0) && (unconscious() || is_fainted()))
        talk = false;

    if (can_see_now && !u_could_see) {  /* potion.c:277 regaining sight */
        if (talk) {
            /* pline() has no await in its body, so an unawaited call from this
             * synchronous function commits the message in full — the same
             * shape js/mhitu.js:258 Your1() already relies on. When it follows
             * a deferred command result, merge the channels below so later
             * messages can trigger the normal tty overflow boundary. */
            const _priorResult = game._resultMessage;
            if (_Halluc())
                pline("Far out!  Everything is all cosmic again!");
            else
                pline("You can see again.");
            /* pline() now adopts an otherwise-idle result channel itself.
             * Only fold the two channels here when that result is still
             * separate; if pline() already consumed it, prepending the saved
             * copy would print the food message twice. */
            if (_priorResult && game._resultMessage === _priorResult
                && game._pending_message) {
                const _hint = _topl_joins_snapshot(_priorResult) || undefined;
                const _merged = _topl_merge_result(_priorResult,
                    game._pending_message, _hint);
                game._resultMessage = null;
                game._pending_message = _merged;
            }
        }
    }
    if (u_could_see && !can_see_now) {  /* potion.c:300 losing sight */
        if (talk) {
            if (_Halluc())
                pline("Oh, bummer!  Everything is dark!  Help!");
            else
                pline("A cloud of darkness falls upon you.");
        }
        if (game.u?.uball)              /* Punished — youprop.h */
            set_bc(0);
    }
    /* potion.c:283-297 (`old && !xtime`, clearing temporary blindness without
     * toggling) and the `talk` half of potion.c:300-323 remain gapped — see
     * the header. */

    _set_HBlinded(xtime);               /* potion.c:326 */

    if (u_could_see !== can_see_now) {   /* potion.c:328 `u_could_see ^ can_see_now` */
        toggle_blindness();
    }
}
export async function _u_resists_blnd() {
    /* C mondata.c:268 resists_blnd(&youmonst) in full: the Blind/Unaware arm,
     * the AD_BLND attack arm, Sunsword, and the Blnd_resist catchall
     * impossible() — the real body in mhitm.js. */
    const r = resists_blnd_real(game.youmonst);
    const msg = take_resists_blnd_impossible();
    if (msg)
        await impossible(msg);
    return r;
}
function _u_resists_blnd_by_arti() {
    /* C artifact.c:2264 — `is_art(uquiver, ART_SUNSWORD)` is not involved;
     * resists_blnd_by_arti checks the wielded weapon.  ART_SUNSWORD is the
     * twentieth artilist entry (the same ordinal used by light.js). */
    return !!game.u?.uwep && ((game.u.uwep.oartifact | 0) === 20);
}
/* Exported for js/mcastu.js mcast_lightning (mcastu.c:596), which is C's third
 * call site for it and the only one outside zap.c. */
export async function flashburn(duration, via_lightning) {
    if (!(await _u_resists_blnd())) {
        await pline('You are blinded by the flash!');   /* zap.c:3058 */
        /* C runs make_blinded right after the pline returns (zap.c:3059-3061);
         * the page frame of the message above is frozen at its own flush, so
         * it still shows the pre-blind status. */
        make_blinded(duration, false);                  /* zap.c:3059 */
        if (!_Blind())                                  /* zap.c:3060-3061 */
            await pline('Your vision quickly clears.');
        return true;                                    /* zap.c:3062 */
    }
    if (!via_lightning && _u_resists_blnd_by_arti()) {
        return true;                                    /* zap.c:3072 */
    }
    return false;                                       /* zap.c:3074 */
}
async function recharge_ring(obj) {
    /* C read.c:807: int s = is_blessed ? rnd(3) : is_cursed ? -rnd(2) : 1 */
    /* For ordinary (mag=0) recharge: is_blessed=false, is_cursed=false → s=1 */
    /* No s-rng here (s determined without RNG for neutral ring). */
    const spe = (obj ? obj.spe : 0) | 0;
    if (spe > rn2(7) || spe <= -5) {
        /* C uses Yobjnam2(obj, "pulsate") followed by otense(obj, "explode").
         * Keep the two clauses in one pline: this is the text C gives to the
         * player before Ring_gone/useup, and it also preserves the message
         * ordering when the subsequent damage is fatal. */
        let name = obj && obj._name;
        if (!name && obj) {
            try { name = obj_typename(obj.otyp | 0); } catch { /* fall back */ }
        }
        if (!name) name = 'ring';
        await pline(`Your ${name} momentarily, then explodes!`);

        /* C Ring_gone() must run before useup(): worn rings can update the
         * hero's equipment slots, and a dead hero must not retain the ring as
         * an active property.  Both helpers are RNG-free. */
        if ((obj.owornmask | 0) & W_RING)
            await _ring_gone(obj);

        /* C read.c:812 evaluates rnd(3 * abs(obj->spe)) while the ring still
         * exists, then useup(obj), then losehp(Maybe_Half_Phys(s)). */
        const damage = rnd(3 * Math.abs(spe));
        if (obj === game.gc_current_wand)
            game.gc_current_wand = null;
        await _destroy_useup(obj);
        await losehp(_zap_Maybe_Half_Phys(damage), 'exploding ring', KILLED_BY_AN);
    }
    else {
        let name = obj && obj._name;
        if (!name && obj) {
            try { name = obj_typename(obj.otyp | 0); } catch { /* fall back */ }
        }
        if (!name) name = 'ring';
        await pline(`Your ${name} spins clockwise for a moment.`);
    }
}
/* ---------------------------------------------------------------------------
 * destroy_items — destroy/alter carried items on elemental damage.
 * C ref: nethack-c/src/zap.c:5958-6090 destroy_items(monst, dmgtyp, dmg_in)
 *
 * Calculates C's destruction limit, selects from the live inventory chain,
 * and passes those same objects to the damage-specific destruction helpers.
 * ---------------------------------------------------------------------------
 */
/* C zap.c:5771-5779 destroy_strings[dindx][0:singular, 1:plural, 2:killer_reason].
 * Books, rings and wands don't stack, so their plural column is "" in C too. */
const DESTROY_STRINGS = [
    ['freezes and shatters', 'freeze and shatter', 'shattered potion'],
    ['boils and explodes', 'boil and explode', 'boiling potion'],
    ['ignites and explodes', 'ignite and explode', 'exploding potion'],
    ['catches fire and burns', 'catch fire and burn', 'burning scroll'],
    ['catches fire and burns', '', 'burning book'],
    ['turns to dust and vanishes', '', ''],
    ['breaks apart and explodes', '', 'exploding wand'],
];
export async function destroy_items(mon_is_hero, dmgtyp, dmg_in) {
    /* C zap.c:5990-6001: limit = dmg_in / DMG_DESTROY_SCALE + possible increment */
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if ((dmg_in % DMG_DESTROY_SCALE) > rn2(DMG_DESTROY_SCALE)) {
        limit++;
    }
    if (limit > MAX_ITEMS_DESTROYED)
        limit = MAX_ITEMS_DESTROYED;
    if (limit < 1)
        return 0;
    /* C zap.c:6031-6068: scan the REAL hero inventory chain (gi.invent == game.invent
     * for u_carry); reservoir-sample eligible stacks into items_to_destroy[0..limit).
     * The rn2(elig_stacks) at 6038 fires once for every eligible stack PAST the
     * first 'limit' (elig_stacks counts pre-increment). */
    const chain = [];
    for (let o = game.invent; o; o = o.nobj)
        chain.push(o);
    let elig_stacks = 0;
    const items_to_destroy = [];
    for (const obj of chain) {
        if (!obj)
            continue;
        /* C zap.c:6034: if (!destroyable(obj, dmgtyp)) continue; */
        if (!_destroyable(obj, dmgtyp))
            continue;
        /* C zap.c:6038: i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks); */
        const i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks);
        elig_stacks++;
        if (i < 0 || i >= limit)
            continue;
        items_to_destroy[i] = obj;
    }
    /* C zap.c:6069-6071: clamp elig_stacks to limit for the destruction loops. */
    if (elig_stacks > limit)
        elig_stacks = limit;
    /* C zap.c:6072-6085: two-pass (defer 0/1) destruction.  Deferral applies only
     * to worn levitation/flying items and were-trigger potions — none for the
     * AD_COLD/AD_FIRE potion path here, so a single pass over the selected stacks
     * is C-faithful (deferred==FALSE for every selected item). */
    const n = Math.min(elig_stacks, limit);
    /* C zap.c:6079: dmg_out += maybe_destroy_item(mon, obj, dmgtyp); ...
     * C zap.c:6093: return dmg_out; — accumulated and returned regardless of
     * u_carry.  This hardcoded `return 0` dropped every per-item dmg, so a
     * hero-carry AD_FIRE/AD_COLD destruction that C reports back to its
     * caller (e.g. record #11: dmg_in=49 AD_FIRE, C returns 1) always read
     * back 0 here. */
    let dmg_out = 0;
    for (let i = 0; i < n; i++) {
        const obj = items_to_destroy[i];
        if (!obj)
            continue;
        if (dmgtyp === AD_ELEC)
            dmg_out += await maybe_destroy_item_elec(obj, dmgtyp);
        else
            dmg_out += await maybe_destroy_item(obj, dmgtyp);
    }
    return dmg_out;
}

/* C zap.c:5606-5643 destroyable — can this dmg type destroy this obj? */
function _destroyable(obj, adtyp) {
    if (!obj) return false;
    if (obj.oartifact) return false;
    if (obj.in_use && (obj.quan | 0) === 1) return false;
    const oclass = obj.oclass | 0, otyp = obj.otyp | 0;
    if (adtyp === AD_FIRE) {
        if (otyp === SCR_FIRE || otyp === SPE_FIREBALL) return false;
        if (otyp === GLOB_OF_GREEN_SLIME || oclass === POTION_CLASS
            || oclass === SCROLL_CLASS || oclass === SPBOOK_CLASS)
            return true;
    } else if (adtyp === AD_COLD) {
        /* non-water potions don't freeze and shatter (only POT_OIL excluded) */
        if (oclass === POTION_CLASS && otyp !== POT_OIL) return true;
    } else if (adtyp === AD_ELEC) {
        if (oclass !== RING_CLASS && oclass !== WAND_CLASS) return false;
        if (otyp !== RIN_SHOCK_RESIST && otyp !== WAN_LIGHTNING) return true;
    }
    return false;
}

/* C zap.c:5791-5947 maybe_destroy_item — AD_COLD/AD_FIRE potion/scroll/book path
 * (the AD_ELEC ring/wand path stays in maybe_destroy_item_elec).  Consumes the
 * per-item damage roll (AD_COLD rnd(4) @5816 / AD_FIRE rnd(6)/rnd(others) @5835+)
 * and the destruction count loop (for quan: if(!rn2(3)) cnt++) @5889. */
async function maybe_destroy_item(obj, dmgtyp) {
    if (!obj) return 0;
    if (inventory_resistance_check(dmgtyp))
        return 0;
    let quan = obj.quan | 0;
    let dmg = 0, dindx = 0, xresist = 0, skip = 0;
    const oclass = obj.oclass | 0, otyp = obj.otyp | 0;
    if (dmgtyp === AD_COLD) {
        /* C zap.c:5813-5816 */
        dindx = 0;
        dmg = rnd(4);
    } else if (dmgtyp === AD_FIRE) {
        /* C zap.c:5818-5849 */
        xresist = (oclass !== POTION_CLASS && otyp !== GLOB_OF_GREEN_SLIME
                   && _uhas(FIRE_RES)) ? 1 : 0;
        if (otyp === SPE_BOOK_OF_THE_DEAD) {
            skip = 1;
        } else if (oclass === POTION_CLASS) {
            dindx = (otyp !== POT_OIL) ? 1 : 2;
            dmg = rnd(6);
        } else if (oclass === SCROLL_CLASS) {
            dindx = 3; dmg = 1;
        } else if (oclass === SPBOOK_CLASS) {
            dindx = 4; dmg = 1;
        } else if (oclass === FOOD_CLASS) { /* GLOB_OF_GREEN_SLIME */
            dindx = 1;
            dmg = Math.trunc(((obj.owt | 0) + 19) / 20);
        }
    } else {
        return 0;
    }
    if (!skip) {
        /* C zap.c:5890 — `char osym = obj->oclass`, sampled BEFORE the useup loop
         * below can free the object, because the potionbreathe test reads it
         * afterwards. */
        const osym = oclass;
        if (obj.in_use)
            quan--; /* one used up elsewhere */
        /* C zap.c:5893-5895: for (i=cnt=0; i<quan; i++) if (!rn2(3)) cnt++; */
        let cnt = 0;
        for (let i = 0; i < quan; i++)
            if (!rn2(3)) cnt++;
        if (!cnt)
            return 0;
        {
            const mult = (cnt === 1)
                ? ((quan === 1) ? '' : 'One of ')
                : ((cnt < quan) ? 'Some of '
                    : (quan === 2) ? 'Both of ' : 'All of ');
            const nm = (cnt === 1 && quan === 1) ? _Yname2(obj) : yname(obj);
            await pline(`${mult}${nm} ${DESTROY_STRINGS[dindx][cnt > 1 ? 1 : 0]}!`);
            /* vpline() clears iflags.last_msg after every emitted message.
             * The caller that set CAUGHT_IN_EXPLOSION did so after its own
             * pline, so this later destruction message makes it UNKNOWN. */
            if (game.iflags)
                game.iflags.last_msg = 0; /* PLNMSG_UNKNOWN */
            /* C pline() blocks here when this destruction message overflows
             * the live topline.  Resume maybe_destroy_item only after that
             * page has been acknowledged: its useup/losehp/exercise tail and
             * destroy_items' next selected stack all happen on the far side
             * of the same more().  Merely deferring explode()'s final damage
             * is too late and lets those effects join the wrong page. */
            if (_topline_more_pending())
                await flush_screen(1);
        }
        /* C zap.c:5912-5926 — player-only side effects, in C's order. */
        /* C zap.c:5913-5917: if (osym == POTION_CLASS && dmgtyp != AD_COLD
         *     && (!breathless(youmonst.data) || haseyes(youmonst.data)))
         *         potionbreathe(obj);
         * RNG-free for the potions this reaches (POT_INVISIBILITY prints "For an
         * instant you couldn't see yourself!" and draws nothing; POT_OIL has no
         * arm at all) — verified against the recorded C stream, where the leaf
         * after the cnt loop is exercise(attrib.c:509)'s rn2(2) from the losehp
         * below, with nothing in between. */
        if (osym === POTION_CLASS && dmgtyp !== AD_COLD
            && (!_breathless_hero() || _haseyes_hero()))
            await potionbreathe(obj);
        /* C maybe_destroy_item: even a partially destroyed wielded stack is
         * unworn. Clear both its slot identity and its property/mask state. */
        if ((obj.owornmask | 0) !== 0) {
            if (((obj.owornmask | 0) & W_RING) !== 0)
                await _ring_gone(obj);
            else
                setnotworn(obj);
        }
        /* C zap.c:5924-5926: if (obj == gc.current_wand) gc.current_wand = 0. */
        if (obj === game.gc_current_wand)
            game.gc_current_wand = 0;
        /* C zap.c:5928-5933: useup(obj) cnt times. */
        for (let i = 0; i < cnt; i++)
            await _destroy_useup(obj);
        /* C zap.c:5934-5947: losehp(dmg, ...) + exercise(A_STR, FALSE). */
        if (dmg) {
            if (xresist) {
                /* C zap.c:5939 — You("aren't hurt!"); no damage, no exercise.
                 * Unreachable for POTION_CLASS (xresist is forced 0 there); live
                 * for a fire-resistant hero's scrolls and spellbooks. */
                await pline("You aren't hurt!");
            } else {
                const how = (dmgtyp === AD_FIRE && osym === FOOD_CLASS)
                    ? 'exploding glob of slime' : DESTROY_STRINGS[dindx][2];
                await losehp(dmg, (cnt | 0) === 1 ? how : makeplural(how),
                    (cnt | 0) === 1 ? KILLED_BY_AN : KILLED_BY);
                exercise(0 /* A_STR */, false);
            }
        }
    }
    return dmg;
}

/* C objnam.c:2376-2382 Yname2(obj) = highc(yname(obj)); yname (2357) is
 * shk_your() + cxname(obj), which js/do_wear.js:3967 already carries. */
function _Yname2(obj) {
    const s = yname(obj);
    return s ? s[0].toUpperCase() + s.slice(1) : s;
}

/* C monflag.h:95,97 — M1_BREATHLESS / M1_NOEYES, read off the hero's current
 * form exactly as js/potion.js:2050-2055 does for the same two predicates. */
const M1_BREATHLESS_ZAP = 0x00000400;
const M1_NOEYES_ZAP = 0x00001000;
function _breathless_hero() {
    return (((game.youmonst && game.youmonst.data && game.youmonst.data.mflags1) | 0)
            & M1_BREATHLESS_ZAP) !== 0;
}
function _haseyes_hero() {
    return (((game.youmonst && game.youmonst.data && game.youmonst.data.mflags1) | 0)
            & M1_NOEYES_ZAP) === 0;
}

async function maybe_destroy_item_elec(obj, dmgtyp) {
    if (dmgtyp !== AD_ELEC)
        return 0;
    const oclass = (obj ? obj.oclass : 0) | 0;
    /* C zap.c:5890 — retain the original class for the damage description
     * after the item may have been consumed. */
    const osym = oclass;
    if (oclass !== RING_CLASS && oclass !== WAND_CLASS)
        return 0;
    const otyp = (obj ? obj.otyp : 0) | 0;
    let quan = (obj && obj.quan != null) ? (obj.quan | 0) : 1;
    let dmg = 0, dindx = 0, skip = 0;
    let chargeit = false;
    /* C zap.c:5852: xresist = (oclass != RING_CLASS && (u_carry ? Shock_resistance : ...)).
     * For a ring, xresist=0; for a wand, it's the hero's shock resistance. */
    const xresist = (oclass !== RING_CLASS && _uhas(SHOCK_RES)) ? 1 : 0;
    if (oclass === RING_CLASS) {
        /* C zap.c:5855-5867: ring sub-switch. */
        const wornRing = (((obj.owornmask | 0) & W_RING) !== 0);
        const gloves = game.u && game.u.uarmg;
        if ((wornRing && gloves && !_is_metallic(gloves))
            || otyp === RIN_SHOCK_RESIST) {
            skip++;
        } else if ((otyp >= RIN_BASE && otyp <= RIN_LAST_CHARGED) && rn2(3)) {
            /* C zap.c:5861: oc_charged && rn2(3) → chargeit */
            chargeit = true;
        } else {
            /* C zap.c:5865-5866: dindx=5, dmg=0 — ring destroyed. */
            dindx = 5;
            dmg = 0;
        }
    } else { /* WAND_CLASS */
        /* C zap.c:5868-5871: dindx=6, dmg=rnd(10). */
        dindx = 6;
        dmg = rnd(10);
    }
    void dindx;
    /* C zap.c:5894-5900: if (chargeit) recharge(obj, 0); else if (!skip) destroy. */
    if (chargeit) {
        await recharge_ring(obj);
    } else if (!skip) {
        /* C zap.c:5901-5903: if (obj->in_use) --quan. */
        if (obj.in_use)
            quan--;
        /* C zap.c:5904-5906: for (i=cnt=0; i<quan; i++) if (!rn2(3)) cnt++; */
        let cnt = 0;
        for (let i = 0; i < quan; i++)
            if (!rn2(3)) cnt++;
        if (!cnt)
            return 0;
        /* C zap.c:5895-5905: the destruction message, printed BEFORE useup while
         * obj still holds its original quan.
         *   mult = (cnt == 1) ? ((quan == 1) ? "" : "One of ")
         *                     : (cnt < quan) ? "Some of "
         *                       : (quan == 2) ? "Both of " : "All of ";
         *   pline("%s%s %s!", mult,
         *         (cnt == 1 && quan == 1) ? Yname2(obj) : yname(obj),
         *         destroy_strings[dindx][(cnt > 1)]);
         * u_carry is true on this path (hero inventory), so yname/Yname2 render
         * "your <xname>" / "Your <xname>".  Rings and wands never stack, so the
         * plural column of destroy_strings is empty for dindx 5/6 — matching C,
         * which would print the empty string there. */
        {
            const mult = (cnt === 1)
                ? ((quan === 1) ? '' : 'One of ')
                : ((cnt < quan) ? 'Some of '
                    : (quan === 2) ? 'Both of ' : 'All of ');
            const nm = (oclass === RING_CLASS) ? xname_ring(obj) : xname_wand(obj);
            const yn = (cnt === 1 && quan === 1) ? `Your ${nm}` : `your ${nm}`;
            await pline(`${mult}${yn} ${DESTROY_STRINGS[dindx][cnt > 1 ? 1 : 0]}!`);
        }
        /* C zap.c:5919-5926 (u_carry): owornmask handling — Ring_gone / setnotworn,
         * and current_wand clear.  potionbreathe doesn't apply (rings/wands). */
        if ((obj.owornmask | 0) !== 0) {
            if (((obj.owornmask | 0) & W_RING) !== 0)
                await _ring_gone(obj);
            else
                setnotworn(obj);
        }
        if (obj === game.gc_current_wand)
            game.gc_current_wand = 0;
        /* C zap.c:5928-5933: useup(obj) cnt times. */
        for (let i = 0; i < cnt; i++)
            await _destroy_useup(obj);
        /* C zap.c:5934-5949: losehp(dmg, ...) + exercise(A_STR, FALSE). */
        if (dmg) {
            if (xresist) {
                /* "You aren't hurt!" — no damage, no exercise. */
            } else {
                const how = (dmgtyp === AD_FIRE && osym === FOOD_CLASS)
                    ? 'exploding glob of slime' : DESTROY_STRINGS[dindx][2];
                await losehp(dmg, (cnt | 0) === 1 ? how : makeplural(how),
                    (cnt | 0) === 1 ? KILLED_BY_AN : KILLED_BY);
                exercise(0 /* A_STR */, false);
            }
        }
    }
    return dmg;
}

function _is_metallic(_obj) {
    return false;
}
/* ---------------------------------------------------------------------------
 * zappable — can the wand be zapped (has charges or can wrest one)?
 * C ref: nethack-c/src/zap.c:2514-2522 zappable(struct obj *wand)
 *
 * RNG: rn2(WAND_WREST_CHANCE=121) when spe==0 (wresting last charge).
 * Returns 1 if zappable, 0 if not.
 * ---------------------------------------------------------------------------
 */
export function zappable(obj) {
    const spe = (obj ? obj.spe : 0) | 0;
    if (spe < 0 || (spe === 0 && rn2(121)))
        return 0;
    /* decrement charge — C modifies in place */
    if (obj)
        obj.spe = spe - 1;
    return 1;
}
/* C zap.c:1156-1230, unturn_you().  An undead-turning zap at the hero
 * reverses the normal undead-turning effect on carried corpses: one corpse
 * from each stack is revived, then the backlash stuns the hero.  Keep this
 * separate from timeout revival because explicit turning ignores norevive
 * and must not arm a new corpse timer. */
async function _zp_unturn_you() {
    let revived = 0;
    for (let obj = game.invent; obj; ) {
        const next = obj.nobj;
        if ((obj.otyp | 0) !== CORPSE) {
            obj = next;
            continue;
        }
        let corpse = corpse_xname_uy(obj, null, 0 /* CXN_NORMAL */);
        let owner;
        if ((obj.quan | 0) > 1)
            owner = 'One of ' + shk_your_uy('', obj);
        else
            owner = Shk_Your_uy('', obj);
        const corpsenm = obj.corpsenm | 0;
        const save_norevive = obj.norevive;
        obj.norevive = 0;
        /* zap.c:1042-1050, 1176-1190 */
        const by_hero = !(game.context && game.context.mon_moving);
        const one_of = (obj.quan | 0) > 1;
        let glow = null;
        if (by_hero && cansee(game.u.ux, game.u.uy)) {
            const q = obj.quan;
            glow = (one_of ? 'one of ' : '') + shk_your_uy('', obj);
            if (one_of) obj.quan = q + 1;
            glow += corpse_xname_uy(obj, null, 2 /* CXN_NO_PFX */);
            if (one_of) obj.quan = q;
            glow = glow.charAt(0).toUpperCase() + glow.slice(1);
        }
        const mon = await revive_corpse(obj, false);
        if (mon) {
            revived++;
            const mndx = (mon.mndx ?? mon.mnum ?? mon.pmidx) | 0;
            const different_type = mndx !== corpsenm;
            if (glow != null) {
                await pline(`${glow} glows iridescently.`);
                corpse = 'It';
                owner = '';
            }
            await pline(`${owner}${corpse} suddenly ${nonliving(mon.data) ? 'reanimates' : 'comes alive'}${different_type ? ' as ' + an(monPmname(mndx, mon.female ? FEMALE : MALE)) : ''}!`);
        } else {
            obj.norevive = save_norevive ? 1 : 0;
        }
        obj = next;
    }
    if (revived) await encumber_msg(); /* C zap.c:1219-1220 */
    const undead = !!((game.youmonst?.data?.mflags2 | 0) & 0x00000002);
    if (undead) {
        const old = game.u?.uprops?.[STUNNED]?.intrinsic | 0;
        await pline(`You feel frightened and ${old & TIMEOUT ? 'even more ' : ''}stunned.`);
        make_stunned((old & TIMEOUT) + rnd(30), false);
    } else {
        await pline('You shudder in dread.');
    }
    return revived;
}

export async function zapyourself(obj, ordinary) {
    if (!obj)
        return 0;
    const otyp = obj.otyp | 0;
    let learn_it = false;
    let damage = 0;
    let orig_dmg = 0;
    switch (otyp) {
        case WAN_STRIKING:
        case SPE_FORCE_BOLT:
            /* C zap.c:2707-2722 */
            learn_it = true;
            if (_cm_Antimagic()) {
                /* C zap.c:2713-2716: shieldeff (display only), "Boing!",
                 * monstseesu(M_SEEN_MAGR) (RNG-free); no damage, no exercise. */
                await pline('Boing!');
            }
            else {
                if (ordinary) {
                    await pline('You bash yourself!');
                    damage = d(2, 12);
                }
                else {
                    damage = d(1 + (obj.spe | 0), 6);
                }
                /* zap.c:2725 exercise(A_STR, FALSE); monstunseesu RNG-free */
                exercise(A_STR, false);
            }
            break;
        case WAN_LIGHTNING:
            learn_it = true;
            orig_dmg = d(12, 6); /* C zap.c:2727 — SCORE-MOVER divergence point */
            /* Shock_resistance check — wizard has none */
            /* C zap.c:2728: if (!Shock_resistance) */
            {
                await pline('You shock yourself!'); /* C zap.c:2729 */
                damage = orig_dmg;
                exercise(A_CON, false); /* C zap.c:2731 — fires rn2(2) */
                /* monstunseesu(M_SEEN_ELEC) — no RNG */
            }
            /* C zap.c:2739: (void) destroy_items(&gy.youmonst, AD_ELEC, orig_dmg) */
            await destroy_items(true, AD_ELEC, orig_dmg);
            {
                const _fbDur = rnd(100);
                await flashburn(_fbDur, true);
            }
            break;
        case SPE_FIREBALL:
            /* C zap.c:2743-2745 */
            /* You("explode a fireball on top of yourself!"); */
            await pline('You explode a fireball on top of yourself!');
            /* C zap.c:2745: explode() owns the damage roll and the complete
             * blast.  Keeping this call here is significant: explode() draws
             * its 3x3 mask, destroys inventory, and applies the hero injury;
             * returning the roll as `damage` would make dozap losehp() apply
             * the same fireball damage a second time. */
            await explode(game.u?.ux | 0, game.u?.uy | 0, 11, d(6, 6),
                WAND_CLASS, EXPL_FIERY);
            break;
        case WAN_FIRE:
        case FIRE_HORN:
            /* C zap.c:2747-2765 */
            learn_it = true;
            orig_dmg = d(12, 6);
            if (_uhas(FIRE_RES)) {
                /* C zap.c:2756-2760 */
                shieldeff_real(game.u?.ux | 0, game.u?.uy | 0);
                await pline('You feel rather warm.');
                monstseesu(M_SEEN_FIRE);
                ugolemeffects(AD_FIRE, orig_dmg);
            } else {
                await pline("You've set yourself afire!");
                damage = orig_dmg;
                monstunseesu(M_SEEN_FIRE);
            }
            /* C zap.c:2770-2774 — fire damage affects slime, worn armor,
             * carried consumables, and finally ignitable inventory regardless
             * of whether the hero took HP damage.  burn_away_slime() and
             * burnarmor() are RNG-free/stateful; destroy_items() owns the
             * C limit/item-selection rolls; ignite_items() runs last. */
            await _zp_burn_away_slime();
            await burnarmor(game.youmonst);
            await destroy_items(true, AD_FIRE, orig_dmg);
            await ignite_items(game.invent);
            break;
        case WAN_COLD:
        case SPE_CONE_OF_COLD:
        case FROST_HORN:
            /* C zap.c:2767-2783 */
            learn_it = true;
            orig_dmg = d(12, 6);
            if (_uhas(COLD_RES)) {
                /* C's resistance arm still destroys vulnerable inventory, but
                 * deals no HP damage and records the seen resistance. */
                await pline('You feel a little chill.');
                ugolemeffects(AD_COLD, orig_dmg);
            } else {
                await pline('You imitate a popsicle!');
                damage = orig_dmg;
            }
            await destroy_items(true, AD_COLD, orig_dmg);
            break;
        case WAN_MAGIC_MISSILE:
        case SPE_MAGIC_MISSILE:
            learn_it = true;
            if (_cm_Antimagic()) {
                /* C: shieldeff(u.ux, u.uy) — the sparkle animation, display
                 * only and RNG-free; this module's standing shieldeff no-op
                 * convention (shieldeff_mon above) applies. */
                await pline('The missiles bounce!');
                /* C: monstseesu(M_SEEN_MAGR) — sets a memory bit on every
                 * monster that can see the hero.  No RNG, nothing rendered. */
            } else {
                damage = d(4, 6);
                await pline("Idiot!  You've shot yourself!");
                /* C: monstunseesu(M_SEEN_MAGR) — RNG-free. */
            }
            break;
        case WAN_POLYMORPH:
        case SPE_POLYMORPH:
            /* C zap.c:2799-2805: if (!Unchanging) { learn_it = TRUE; polyself(POLY_NOFLAGS); } */
            {
                const u = game.u || {};
                const unchanging = !!(u.uprops && u.uprops[UNCHANGING] && u.uprops[UNCHANGING].intrinsic);
                if (!unchanging) {
                    learn_it = true;
                    await polyself(0 /* POLY_NOFLAGS */);
                }
            }
            break;
        case WAN_CANCELLATION:
        case SPE_CANCELLATION:
            await cancel_monst(game.youmonst, obj, true, true, true);
            break;
        case SPE_DRAIN_LIFE:
            /* C zap.c:2812-2818 */
            {
                const dr = game.u?.uprops?.[DRAIN_RES];
                if (!((dr?.intrinsic | 0) || (dr?.extrinsic | 0))) {
                    learn_it = true;
                    await losexp('life drainage');
                }
            }
            damage = 0;
            break;
        case WAN_MAKE_INVISIBLE:
            /* C zap.c:2820-2838 */
            {
                const u = game.u || (game.u = {});
                if (!u.uprops) u.uprops = {};
                const ip = u.uprops[INVIS]
                    || (u.uprops[INVIS] = { intrinsic: 0, extrinsic: 0, blocked: 0 });
                const bInvis = !!(ip.blocked | 0);
                const invis = !!(((ip.intrinsic | 0) || (ip.extrinsic | 0)) && !bInvis);
                const msg = !invis && !_Blind() && !bInvis;
                /* C's incr_itimeout changes only the timeout portion and
                 * preserves FROMOUTSIDE/FROM_RACE/FROMFORM bits. */
                let timeout = (ip.intrinsic | 0) & TIMEOUT;
                timeout += rn1(15, 31);
                if (timeout >= TIMEOUT) timeout = TIMEOUT;
                ip.intrinsic = ((ip.intrinsic | 0) & ~TIMEOUT) | timeout;
                if (msg) {
                    learn_it = true;
                    newsym(u.ux, u.uy);
                    await self_invis_message();
                }
            }
            break;
        case WAN_SPEED_MONSTER:
            /* C zap.c:2840-2843:
             *     speed_up(rn1(25, 50));
             *     learn_it = TRUE;
             * rn1(25,50) is evaluated as speed_up's argument (C evaluates
             * args before the call). */
            await _zp_speed_up(rn1(25, 50));
            learn_it = true;
            break;
        case WAN_SLEEP:
        case SPE_SLEEP:
            /* C zap.c:2846-2861 */
            learn_it = true;
            if (_uhas(SLEEP_RES)) {
                shieldeff_real(game.u?.ux | 0, game.u?.uy | 0);
                await pline("You don't feel sleepy!");
                monstseesu(M_SEEN_SLEEP);
            } else {
                if (ordinary) {
                    await pline('The sleep ray hits you!');
                } else {
                    await pline('You fall asleep!');
                }
                monstunseesu(M_SEEN_SLEEP);
                /* C zap.c:2859: fall_asleep(-rnd(50), TRUE).  rnd(50) is the sleep
                 * duration; fall_asleep then arms the immobile multi<0 countdown so
                 * the hero is Unaware during gethungry on each slept turn. */
                await fall_asleep(-rnd(50), true);
            }
            break;
        case WAN_SLOW_MONSTER:
        case SPE_SLOW_MONSTER:
            /* C zap.c:2863-2869 */
            /* The ray only has an effect when intrinsic speed is active;
             * speed boots (the extrinsic half) are deliberately unaffected. */
            {
                const fast = game.u?.uprops?.[FAST]?.intrinsic | 0;
                if (fast & (TIMEOUT | INTRINSIC)) {
                    learn_it = true;
                    u_slow_down();
                }
            }
            break;
        case WAN_TELEPORTATION:
        case SPE_TELEPORT_AWAY:
            /* C zap.c:2871-2878 */
            {
                const u = game.u || {};
                const ox = u.ux | 0, oy = u.uy | 0;
                await tele();
                /* A moved hero observes the teleport and can identify the
                 * wand/spell.  The canonical tele() handles control,
                 * no-teleport levels, and safe destination selection. */
                if ((u.ux | 0) !== ox || (u.uy | 0) !== oy)
                    learn_it = true;
            }
            break;
        case WAN_DEATH:
        case SPE_FINGER_OF_DEATH:
            learn_it = true;
            /* C zap.c:2894-2895 — killer name + NO_KILLER_PREFIX, set BEFORE the
             * messages because done() reads them. */
            if (!game.svk) game.svk = {};
            if (!game.svk.killer) game.svk.killer = { id: 0, format: 0, name: '', next: null };
            game.svk.killer.name =
                `shot ${game.flags?.female ? 'her' : 'him'}self with a death ray`;
            game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
            /* C zap.c:2898-2899 urgent_pline x2.  The page between them is not
             * urgency (URGENT_MESSAGE only sets ATR_URGENT, pline.c:72) — it is
             * update_topl's `notdied` conjunct, which js/display.js
             * _topl_split_for_more now applies. */
            await pline('You irradiate yourself with pure energy!');
            await pline('You die.');
            /* update_topl() pages the first line before done() starts.  The
             * shared death driver now runs at this source boundary, so drain
             * that width-driven page here rather than relying on rhack's later
             * command-read flush. */
            await flush_pending_messages();
            /* C zap.c:2901 done(DIED).  Resolve it at this call boundary: an
             * actual death does not return, while a wizard/discover-mode decline
             * returns into zapyourself(), reaches learnwand() below, and spends
             * the zap turn.  Deferring this to rhack lost that continuation and
             * skipped exercise(), movemon, and the rest of the world turn. */
            deadhero(0 /* DIED */, { alreadySaidYouDie: true });
            await do_death_sequence({ inPlace: true });
            break;
        case WAN_UNDEAD_TURNING:
        case SPE_TURN_UNDEAD:
            /* C zap.c:2898-2902 */
            learn_it = true;
            await _zp_unturn_you();
            break;
        case SPE_HEALING:
        case SPE_EXTRA_HEALING:
            /* C zap.c:2903-2909 */
            learn_it = true; /* (no effect for spells...) */
            healup(d(6, otyp === SPE_EXTRA_HEALING ? 8 : 4), 0, false,
                   (obj.blessed || otyp === SPE_EXTRA_HEALING));
            await pline(`You feel ${otyp === SPE_EXTRA_HEALING ? 'much ' : ''}better.`);
            break;
        case WAN_LIGHT:
            /* C zap.c:2910-2923 — broken wand */
            damage = d(obj.spe | 0, 25);
        /* FALLTHROUGH to EXPENSIVE_CAMERA */
        /* falls through */
        case EXPENSIVE_CAMERA:
            /* C zap.c:2915-2923 */
            if (!damage)
                damage = 5;
            /* C zap.c:2918: damage = lightdamage(obj, ordinary, damage).
             * Identity for every non-gremlin hero form (zap.c:3029 guard), so
             * this is RNG- and value-neutral outside gremlin polymorph. */
            damage = lightdamage(obj, ordinary, damage);
            damage += rnd(25);
            /* C zap.c:2920-2921:
             *     if (flashburn((long) damage, FALSE))
             *         learn_it = TRUE;
             * The return was being discarded, so learnwand(obj) (zap.c:3004)
             * never ran for this arm. */
            if (await flashburn(damage, false))
                learn_it = true;
            damage = 0; /* C zap.c:2922: reset */
            break;
        case WAN_OPENING:
        case SPE_KNOCK:
            /* C zap.c:2924-2942 */
            {
                const u = game.u || {};
                if (u.ustuck) {
                    await release_hold();
                    learn_it = true;
                }
                if ((await unpunish()))
                    learn_it = true;
                /* Route the implemented trap helpers while preserving C's
                 * holding-trap short-circuit. */
                const noticed = { value: learn_it };
                const openedHolding = !!u.utrap
                    && await openholdingtrap(game.youmonst, noticed);
                if (!openedHolding) {
                    await _zp_boxlock_invent(obj);
                    const openedFalling = await openfallingtrap(game.youmonst, true, noticed);
                    if (openedFalling)
                        learn_it = noticed.value;
                }
            }
            break;
        case WAN_LOCKING:
        case SPE_WIZARD_LOCK: {
            /* C zap.c:2943-2949:
             *     if (u.utrap || !closeholdingtrap(&gy.youmonst, &learn_it))
             *         boxlock_invent(obj);
             * Short-circuit: when u.utrap is TRUE, closeholdingtrap is NEVER
             * CALLED (the `||` short-circuits before it), so learn_it is
             * untouched by it in that branch. */
            const noticed = { value: learn_it };
            if ((game.u && game.u.utrap)
                || !(await closeholdingtrap(game.youmonst, noticed))) {
                await _zp_boxlock_invent(obj);
            }
            learn_it = noticed.value;
            break;
        }
        case WAN_DIGGING:
        case SPE_DIG:
        case SPE_DETECT_UNSEEN:
        case WAN_NOTHING:
            /* C zap.c:2950-2954 */
            break;
        case WAN_PROBING:
            /* C zap.c:2955-2960 */
            _zp_probe_objchain(game.invent);
            update_inventory();
            learn_it = true;
            if (game.disp)
                game.disp.botl = 1; /* ustatusline() */
            break;
        case SPE_STONE_TO_FLESH:
            /* C zap.c:2961-2998.  Stone to Flesh affects every carried
             * object through bhito(), including the spell object itself (which
             * bhito ignores).  Save nobj before the await: the object may be
             * replaced or freed by stone_to_flesh_obj(). */
            if ((game.u?.umonnum | 0) === PM_STONE_GOLEM) {
                learn_it = true;
                await polymon(PM_FLESH_GOLEM);
            }
            {
                const sp = game.u?.uprops?.[STONED];
                if (sp && (sp.intrinsic | 0)) {
                    learn_it = true;
                    const limber = _Halluc()
                        ? `What a pity--you just ruined a future piece of ${(acurr(game.u, A_CHA) | 0) > 15 ? 'fine ' : ''}art!`
                        : 'You feel limber!';
                    await make_stoned(0, limber, 0, null);
                }
            }
            for (let otmp = game.invent; otmp; ) {
                const onxt = otmp.nobj;
                if (await bhito(otmp, obj))
                    learn_it = true;
                otmp = onxt;
            }
            break;
        default:
            /* C zap.c:2999-3001: impossible */
            break;
    }
    /* C zap.c:3003-3007: if (learn_it) learnwand(obj); return damage; */
    if (learn_it)
        learnwand(obj);
    return damage;
}
/* ---------------------------------------------------------------------------
 * findone — find/reveal every "something" at one location (detect.c:1640).
 * C ref: nethack-c/src/detect.c:1640-1727 findone(zx, zy, whatfound).
 *
 * This is the do_clear_area() callback used by findit().  It reveals and counts
 * secret doors (SDOOR→DOOR), secret corridors (SCORR→CORR), unseen traps,
 * trapped closed doors, and hidden / not-currently-spottable monsters.  It
 * consumes NO RNG (magical detection, not a physical search).  We port the
 * counting + reveal-mutation faithfully; the FOUND_FLASH_COUNT>0 flash_glyph_at
 * highlight is a transient animation NetHack never records at an input boundary,
 * so it is elided (the persistent newsym render is kept). */
/* C detect.c:906-953 detect_obj_traps(), findone() call only (ft set,
 * show_them, how 0); sense_trap's Hallucination arm (867-882) omitted. */
function detect_obj_traps(objlist, ft) {
    for (let otmp = objlist; otmp; otmp = otmp.nobj) {
        const xp = { value: 0 }, yp = { value: 0 };
        const box = (otmp.otyp === 214 /* LARGE_BOX */ || otmp.otyp === 215 /* CHEST */);
        if ((box && otmp.otrapped) || Has_contents(otmp)) {
            if (!get_obj_location(otmp, xp, yp, BURIED_TOO | CONTAINED_TOO)
                || !isok(xp.value, yp.value)
                || xp.value !== ft.x || yp.value !== ft.y)
                continue;
        }
        if (box && otmp.otrapped) {
            otmp.tknown = 1;
            observe_object(otmp);
            map_trap({ tx: xp.value, ty: yp.value, ttyp: TRAPPED_CHEST, tseen: 1 }, 1);
            newsym(xp.value, yp.value); /* foundone() (detect.c:1610) */
            ft.num_traps++;
        }
        if (Has_contents(otmp))
            detect_obj_traps(otmp.cobj, ft);
    }
}

function findone(zx, zy, found) {
    found.x = zx; found.y = zy; /* ft_cc, detect.c:1648 */
    const lev = game.level?.at(zx, zy);
    if (!lev) return;
    let mtmp = m_at(zx, zy);
    const ttmp = t_at(zx, zy);
    /* C detect.c:1648: drop dead monsters / dormant guards. */
    if (mtmp && (DEADMONSTER(mtmp) || (mtmp.isgd && !mtmp.mx)))
        mtmp = null;

    if (lev.typ === SDOOR) {
        /* C detect.c:1657-1662: cvt_sdoor_to_door → typ=DOOR; reveal. */
        cvt_sdoor_to_door(lev);
        recalc_block_point(zx, zy);
        newsym(zx, zy);
        found.num_sdoors++;
    } else if (lev.typ === SCORR) {
        /* C detect.c:1663-1670: SCORR → CORR; reveal. */
        lev.typ = CORR;
        unblock_point(zx, zy);
        newsym(zx, zy);
        found.num_scorrs++;
    }

    /* C detect.c:1672-1679: an unseen, non-statue trap is revealed. */
    if (ttmp && !ttmp.tseen && (ttmp.ttyp | 0) !== STATUE_TRAP) {
        ttmp.tseen = 1;
        newsym(zx, zy);
        found.num_traps++;
    }
    /* C detect.c:1680-1687: a trapped CLOSED/LOCKED door counts as a trap. */
    if (lev.typ === DOOR
        && (lev.doormask & (D_CLOSED | D_LOCKED))
        && (lev.doormask & D_TRAPPED)) {
        found.num_traps++;
    }

    /* C detect.c:1687-1693: trapped chests. */
    detect_obj_traps(game.level?.buriedobjlist, found);
    detect_obj_traps(game.fobj, found);
    if (mtmp) detect_obj_traps(mtmp.minvent, found);
    if (u_at(zx, zy)) detect_obj_traps(game.invent, found);

    /* C detect.c:1695-1721: hidden / unspottable monster. */
    if (mtmp && (!canspotmon(mtmp) || mtmp.mundetected || mtmp.m_ap_type)) {
        if (mtmp.m_ap_type) {
            mtmp.m_ap_type = 0; /* seemimic: reveal a mimicking monster */
            newsym(zx, zy);
            found.num_mons++;
        } else if (mtmp.mundetected) {
            mtmp.mundetected = 0;
            newsym(zx, zy);
            found.num_mons++;
        }
    }
}

/* ---------------------------------------------------------------------------
 * findit — reveal secret doors/corridors/traps/hidden monsters around the hero.
 * C ref: nethack-c/src/detect.c:1793-1893 findit(void)
 *
 * findit() does NOT consume RNG: it is a deterministic do_clear_area(findone)
 * map scan within BOLT_LIM that counts and reveals secret features, then plines
 * the result.  Returns the number of things found.  The exact reveal text is
 * built from the do_clear_area counts exactly as C does — never scraped.
 * ---------------------------------------------------------------------------
 */
export async function findit() {
    const g = game;
    if (g.u?.uswallow) return 0;

    const found = {
        num_sdoors: 0, num_scorrs: 0, num_traps: 0,
        num_mons: 0, num_invis: 0, num_cleared_invis: 0,
    };
    /* C detect.c:1816: do_clear_area(u.ux, u.uy, BOLT_LIM, findone, &found). */
    do_clear_area(g.u.ux | 0, g.u.uy | 0, BOLT_LIM,
                  (x, y) => findone(x, y, found), null);

    /* C detect.c:1819-1822: k = count of distinct categories present (0..4). */
    const k = (found.num_sdoors ? 1 : 0) + (found.num_scorrs ? 1 : 0)
            + (found.num_traps ? 1 : 0) + (found.num_mons ? 1 : 0);

    let num = 0;
    let buf = '';
    /* C detect.c:1824-1833: secret doors. */
    if (found.num_sdoors) {
        buf += (found.num_sdoors > 1)
            ? `${found.num_sdoors} secret doors` : 'a secret door';
        num += found.num_sdoors;
    }
    /* C detect.c:1835-1844: secret corridors. */
    if (found.num_scorrs) {
        if (buf) buf += (k === 2) ? ' and ' : ', ';
        buf += (found.num_scorrs > 1)
            ? `${found.num_scorrs} secret corridors` : 'a secret corridor';
        num += found.num_scorrs;
    }
    /* C detect.c:1845-1855: traps. */
    if (found.num_traps) {
        if (buf) buf += (k === 3 && !found.num_mons) ? ', and '
                      : (k === 2) ? ' and ' : ', ';
        buf += (found.num_traps > 1)
            ? `${found.num_traps} traps` : 'a trap';
        num += found.num_traps;
    }
    /* C detect.c:1862-1871: hidden monsters. */
    if (found.num_mons) {
        if (buf) buf += (k > 2) ? ', and ' : ' and ';
        buf += (found.num_mons > 1)
            ? `${found.num_mons} hidden monsters` : 'a hidden monster';
        num += found.num_mons;
    }
    if (buf) {
        /* C detect.c:1872: You("reveal %s!", buf). */
        pushRngLogEntry('>pline @ findit(detect.c:1872)');
        await pline(`You reveal ${buf}!`);
    }

    /* C detect.c:1890: if (!num) You("don't find anything."). */
    if (!num) {
        pushRngLogEntry('>findit @ js/zap.js (detect.c:1889)');
        await pline("You don't find anything.");
    }
    return num;
}
export async function zapnodir(obj) {
    const g = game;
    const otyp = obj ? (obj.otyp | 0) : 0;
    let known = false;

    switch (otyp) {
        case WAN_LIGHT:
        case SPE_LIGHT:
            /* C zap.c:2543-2549 */
            known = !!(obj.dknown && !_Blind());
            litroom(true, obj);
            lightdamage(obj, true, 5);
            break;
        case WAN_SECRET_DOOR_DETECTION:
        case SPE_DETECT_UNSEEN:
            /* C zap.c:2553-2558: known = !!obj->dknown; (void) findit(); */
            known = !!obj.dknown;
            await findit();
            break;
        case WAN_STASIS:
            /* C zap.c:2561-2563: svl.level.flags.stasis_until = svm.moves + rn1(21,10) */
            if (!g.level) g.level = {};
            if (!g.level.flags) g.level.flags = {};
            g.level.flags.stasis_until = (g.moves | 0) + rn1(21, 10);
            break;
        case WAN_CREATE_MONSTER:
            /* C zap.c:2565-2570: create_critters(rn2(23) ? 1 : rn1(7,2), 0, FALSE)
             * create_critters is async in this port (its makemon is), so the
             * call is awaited; C evaluates the count argument first either way. */
            if (await create_critters(rn2(23) ? 1 : rn1(7, 2), null, false))
                known = !!obj.dknown;
            break;
        case WAN_WISHING:
            /* C zap.c:2572-2583 */
            if ((g.u.uluck | 0) + rn2(5) < 0) {
                await pline("Unfortunately, nothing happens.");
                known = false;
            } else {
                known = !!obj.dknown;
                /* C zap.c:2578: makewish();  (zap.c:6307 — the one real body,
                 * imported from js/wizcmds.js).  It is async here because it
                 * blocks on getlin() for the wish string. */
                await makewish();
            }
            break;
        case WAN_ENLIGHTENMENT:
            /* C zap.c:2585-2589 */
            known = !!obj.dknown;
            await do_enlightenment_effect_real();
            break;
        default:
            break;
    }

    if (known) {
        g._oc_name_known = g._oc_name_known || {};
        if (!g._oc_name_known[otyp])
            more_experienced(0, 10);
        learnwand(obj);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
 * BUZZ ENGINE — directional ray (wand/spell/breath bolt).
 * C ref: nethack-c/src/zap.c:4751-5030 (ubuzz/buzz/dobuzz), 4393 zhitu,
 *        4696 zap_hit, 4664 bounce_dir.
 * ═══════════════════════════════════════════════════════════════════════════ */

const ZT_FIRE = 1;        /* AD_FIRE - 1 */
const ZT_MAGIC_MISSILE = 0;
const ZT_COLD = 2, ZT_SLEEP = 3, ZT_DEATH = 4, ZT_LIGHTNING = 5,
      ZT_POISON_GAS = 6, ZT_ACID = 7;
/* C zap.c:13 #define MAGIC_COOKIE 1000 — zhitm()'s sentinel damage value for
 * "this disintegration ray killed the target outright" (dobuzz's u.uswallow
 * branch tests tmp==MAGIC_COOKIE to blow a hole rather than just damaging). */
const ZP_MAGIC_COOKIE = 1000;

/* C zap.c:89 zaptype — abs() with monster-wand normalization (-39..-30 → 0..9). */
function zaptype(type) {
    if (type <= -30 && -39 <= type)
        type += 30;
    return Math.abs(type);
}
/* C zap.c:71 flash_types[] — flavour text by zap value. */
const FLASH_TYPES = [
    'magic missile', 'bolt of fire', 'bolt of cold', 'sleep ray', 'death ray',
    'bolt of lightning', '', '', '', '',
    'magic missile', 'fireball', 'cone of cold', 'sleep ray', 'finger of death',
    'bolt of lightning', '', '', '', '',
    'blast of missiles', 'blast of fire', 'blast of frost', 'blast of sleep gas',
    'blast of disintegration', 'blast of lightning', 'blast of poison gas',
    'blast of acid', '', '',
];
/* C mthrowu.c:31-48 hallublasts[] — hallucinatory blast flavour text, drawn
 * by rnd_hallublast() (mthrowu.c:51-55) via rn2(SIZE(hallublasts)). */
const HALLUBLASTS = [
    'asteroids', 'beads', 'bubbles', 'butterflies', 'champagne', 'chaos',
    'coins', 'cotton candy', 'crumbs', 'dark matter', 'darkness', 'data',
    'dust specks', 'emoticons', 'emotions', 'entropy', 'flowers', 'foam',
    'fog', 'gamma rays', 'gelatin', 'gemstones', 'ghosts', 'glass shards',
    'glitter', 'good vibes', 'gravel', 'gravity', 'gravy', 'grawlixes',
    'holy light', 'hornets', 'hot air', 'hyphens', 'hypnosis', 'infrared',
    'insects', 'jargon', 'laser beams', 'leaves', 'lightening', 'logic gates',
    'magma', 'marbles', 'mathematics', 'megabytes', 'metal shavings',
    'metapatterns', 'meteors', 'mist', 'mud', 'music', 'nanites', 'needles',
    'noise', 'nostalgia', 'oil', 'paint', 'photons', 'pixels', 'plasma',
    'polarity', 'powder', 'powerups', 'prismatic light', 'pure logic',
    'purple', 'radio waves', 'rainbows', 'rock music', 'rocket fuel', 'rope',
    'sadness', 'salt', 'sand', 'scrolls', 'sludge', 'smileys', 'snowflakes',
    'sparkles', 'specularity', 'spores', 'stars', 'steam', 'tetrahedrons',
    'text', 'the past', 'tornadoes', 'toxic waste', 'ultraviolet light',
    'viruses', 'water', 'waveforms', 'wind', 'X-rays', 'zorkmids',
];
/* C mthrowu.c:51-55 rnd_hallublast(void): return ROLL_FROM(hallublasts) =
 * hallublasts[rn2(SIZE(hallublasts))]. */
export function rnd_hallublast() {
    return HALLUBLASTS[rn2(HALLUBLASTS.length)];
}
/* C zap.c:6420-6442 flash_str(typ, nohallu): typ = zaptype(typ); while
 * hallucinating (and not suppressed by nohallu) always returns
 * "blast of <rnd_hallublast()>" instead of the real flash_types[] name. */
export function flash_str(fltyp, nohallu) {
    fltyp = zaptype(fltyp);
    if (_Halluc() && !nohallu)
        return `blast of ${rnd_hallublast()}`;
    return FLASH_TYPES[fltyp] || '';
}
/* C zap.c:4696 zap_hit — does the bolt hit a target with armor class `ac`?
 *   chance = rn2(20);
 *   if (!chance) return rnd(10) < ac + spell_bonus;     // small naked-escape
 *   ac = AC_VALUE(ac);   // AC_VALUE(AC): (AC>=0) ? AC : -rnd(-AC)
 *   return (3 - chance < ac + spell_bonus);             // exact C tail
 */
function zap_hit(ac, type) {
    const chance = rn2(20);
    const spell_bonus = 0;
    void type;
    if (!chance) /* small chance for naked target to avoid being hit */
        return (rnd(10) < ac + spell_bonus) ? 1 : 0;
    /* very high armor protection does not achieve invulnerability */
    const acv = (ac >= 0) ? ac : -rnd(-ac); /* AC_VALUE(ac) */
    return (3 - chance < acv + spell_bonus) ? 1 : 0;
}
/* C zap.c:4664 bounce_dir — reflect ray off a wall.  RNG only when both
 * deltas are nonzero (diagonal): rn2(bounceback), and possibly rn2(2). */
function bounce_dir(sx, sy, dir, bounceback) {
    let ddx = dir.dx, ddy = dir.dy;
    if (!ddx || !ddy || (bounceback > 0 && !rn2(bounceback))) {
        ddx = -ddx; ddy = -ddy;
    } else {
        let bounce = 0;
        const lsy = sy - ddy, lsx = sx - ddx;
        let rmn;
        if (isok(sx, lsy) && ZAP_POS(rmn = _buzz_typ(sx, lsy))
            && !closed_door(sx, lsy)
            && (IS_ROOM(rmn) || (isok(sx + ddx, lsy) && ZAP_POS(_buzz_typ(sx + ddx, lsy)))))
            bounce = 1;
        if (isok(lsx, sy) && ZAP_POS(rmn = _buzz_typ(lsx, sy))
            && !closed_door(lsx, sy)
            && (IS_ROOM(rmn) || (isok(lsx, sy + ddy) && ZAP_POS(_buzz_typ(lsx, sy + ddy)))))
            if (!bounce || rn2(2))
                bounce = 2;
        switch (bounce) {
        case 0: ddx = -ddx; /* fallthrough */
        case 1: ddy = -ddy; break;
        case 2: ddx = -ddx; break;
        }
    }
    dir.dx = ddx; dir.dy = ddy;
}
/* level cell typ accessor (handles the JS level-storage shapes). */
function _buzz_cell(x, y) {
    const g = game;
    if (g.level && typeof g.level.at === 'function') return g.level.at(x, y);
    if (g.level && g.level.locations) return g.level.locations[x]?.[y] ?? null;
    return null;
}
function _buzz_typ(x, y) {
    const c = _buzz_cell(x, y);
    return c ? (c.typ | 0) : STONE;
}

/* C zap.c:4399-4590 zhitu — the ray hits the hero. */
async function zhitu(type, nd, fltxt, sx, sy) {
    const g = game, u = g.u;
    const abstyp = zaptype(type);
    let dam = 0, orig_dam = 0;

    switch (abstyp % 10) {
    case ZT_MAGIC_MISSILE:
        if (_uhas(ANTIMAGIC)) {
            shieldeff_real(sx, sy);
            await pline('The missiles bounce off!');
            monstseesu(M_SEEN_MAGR);
        } else {
            dam = d(nd, 6);
            exercise(A_STR, false);
            monstunseesu(M_SEEN_MAGR);
        }
        break;
    case ZT_FIRE:
        orig_dam = d(nd, 6);
        if (_uhas(FIRE_RES)) {
            shieldeff_real(sx, sy);
            await pline("You don't feel hot!");
            monstseesu(M_SEEN_FIRE);
            ugolemeffects(AD_FIRE, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_FIRE);
        }
        await burn_away_slime();
        if (await burnarmor(game.youmonst)) {
            if (!rn2(3))
                await destroy_items(game.youmonst, AD_FIRE, orig_dam);
            if (!rn2(3))
                await ignite_items(game.invent);
        }
        break;
    case ZT_COLD:
        orig_dam = d(nd, 6);
        if (_uhas(COLD_RES)) {
            shieldeff_real(sx, sy);
            await pline("You don't feel cold.");
            monstseesu(M_SEEN_COLD);
            ugolemeffects(AD_COLD, orig_dam);
        } else {
            dam = orig_dam;
            monstunseesu(M_SEEN_COLD);
        }
        if (!rn2(3))
            await destroy_items(game.youmonst, AD_COLD, orig_dam);
        break;
    case ZT_LIGHTNING:
        orig_dam = d(nd, 6);
        if (_uhas(SHOCK_RES)) {
            shieldeff_real(sx, sy);
            await pline("You aren't affected.");
            monstseesu(M_SEEN_ELEC);
            ugolemeffects(AD_ELEC, orig_dam);
        } else {
            dam = orig_dam;
            exercise(A_CON, false);
            monstunseesu(M_SEEN_ELEC);
        }
        if (!rn2(3))
            await destroy_items(game.youmonst, AD_ELEC, orig_dam);
        break;
    case ZT_SLEEP:
        /* C zap.c:4447-4456.  Sleep ray — deals no hp damage; instead it puts
         * the hero to sleep for d(nd,25) turns via fall_asleep(). */
        if (_uhas(SLEEP_RES)) {
            shieldeff_real(game.u?.ux | 0, game.u?.uy | 0);
            await pline("You don't feel sleepy.");
            monstseesu(M_SEEN_SLEEP);
        } else {
            monstunseesu(M_SEEN_SLEEP);
            await fall_asleep(-d(nd, 25), true); /* C zap.c:4454 — d(nd,25) sleep ray */
        }
        break;
    case ZT_ACID:
        if (_uhas(ACID_RES)) {
            await pline(`The ${hliquid('acid')} doesn't hurt.`);
            monstseesu(M_SEEN_ACID);
        } else {
            await pline(`The ${hliquid('acid')} burns!`);
            dam = d(nd, 6);
            exercise(A_STR, false);
            monstunseesu(M_SEEN_ACID);
        }
        if (!rn2((u.twoweap | 0) ? 3 : 6))
            await acid_damage_zap(u.uwep);
        if ((u.twoweap | 0) && !rn2(3))
            await acid_damage_zap(u.uswapwep);
        if (!rn2(6))
            await erode_armor({ u }, ERODE_CORRODE);
        break;
    case ZT_POISON_GAS:
        /* C zap.c:4519; poisoned_u owns attrib.c's resistance, wet-towel
         * half-gas damage, fatal/attribute rolls, and in-place lifesaving. */
        await poisoned_u('blast', A_DEX, 'poisoned blast', 15, false);
        break;
    case ZT_DEATH: {
        const deathBreath = abstyp === 24; /* ZT_BREATH(ZT_DEATH) */
        if (deathBreath) {
            const disnProt = inventory_resistance_check(AD_DISN);
            if (_uhas(DISINT_RES)) {
                await pline('You are not disintegrated.');
                monstseesu(M_SEEN_DISINT);
                break;
            } else if (disnProt) {
                break;
            }
            monstunseesu(M_SEEN_DISINT);
            if (u.uarms) {
                await disintegrate_arm(u.uarms);
                break;
            } else if (u.uarm) {
                if (u.uarmc) await disintegrate_arm(u.uarmc);
                await disintegrate_arm(u.uarm);
                break;
            }
            if (u.uarmc) await disintegrate_arm(u.uarmc);
            if (u.uarmu) await disintegrate_arm(u.uarmu);
        } else if (nonliving(game.youmonst?.data) || is_demon(game.youmonst?.data)) {
            shieldeff_real(sx, sy);
            await pline('You seem unaffected.');
            break;
        } else if (_uhas(ANTIMAGIC)) {
            shieldeff_real(sx, sy);
            monstseesu(M_SEEN_MAGR);
            await pline("You aren't affected.");
            break;
        }
        monstunseesu(M_SEEN_MAGR);
        game.svk ||= {};
        game.svk.killer ||= {};
        game.svk.killer.format = KILLED_BY_AN;
        game.svk.killer.name = fltxt || '';
        u.ugrave_arise = (type | 0) === -24 ? -3 : NON_PM;
        // C enters done() synchronously here.  With a lifesaving amulet,
        // done() appends "But wait..." before the pending hit page is read;
        // ordinary deaths retain the existing armor-message flush.
        const _lifeSavedDeath = !!([game.u?.uprops?.[LIFESAVED],
                                    game.u?.uprops?.['LIFESAVED']]
                                   .find(p => p?.extrinsic | 0));
        if (!_lifeSavedDeath)
            await flush_pending_messages();
        deadhero(DIED, { alreadySaidYouDie: true, noDeathLine: true,
                         prejoinButWait: _lifeSavedDeath });
        await do_death_sequence({ inPlace: true });
        return;
    }
    default:
        break;
    }
    const wand = game.gc_current_wand;
    const verb = abstyp < 10
        ? ((wand && (wand.oclass | 0) === TOOL_CLASS) ? 'played' : 'zapped')
        : abstyp < 20 ? 'cast' : abstyp < 30 ? 'exhaled' : 'imagined';
    const buzzer = game.gb?.buzzer ?? null;
    let killer;
    if ((type | 0) < 0 || ((type | 0) === 0 && buzzer)) {
        killer = death_inflicted_by('', fltxt || '', buzzer);
        if (buzzer)
            killer = killer.replace('inflicted', verb);
    } else {
        killer = `${fltxt || ''} ${verb} by ${_expl_uhim()}self`;
    }
    const halfSpell = !!((game.u?.uprops?.[HALF_SPDAM]?.intrinsic | 0)
        || (game.u?.uprops?.[HALF_SPDAM]?.extrinsic | 0));
    if (dam && halfSpell && abstyp < 20)
        dam = Math.floor((dam + 1) / 2);
    await losehp(dam, killer, KILLED_BY_AN);
}

function _uhas(prop) {
    const u = game.u;
    const p = u && u.uprops && u.uprops[prop];
    if (!p) return false;
    return !!((p.intrinsic | 0) || (p.extrinsic | 0)) && !(p.blocked | 0);
}
/* C trap.c:4618-4655 acid_damage().  zap.c reaches this with a carried weapon;
 * retain C's inventory-resistance, scroll-erasure, and canonical erosion arms. */
async function acid_damage_zap(obj) {
    if (!obj) return;
    const u = game.u;
    const carried = (obj.where | 0) === 3; /* OBJ_INVENT */
    if (carried && inventory_resistance_check(AD_ACID)) return;
    const victim = carried ? game.youmonst : (obj.ocarry || null);
    if (obj.greased) {
        await grease_protect(obj, null, victim);
    } else if ((obj.oclass | 0) === SCROLL_CLASS && (obj.otyp | 0) !== 365) {
        if (!_Blind()) await pline(`Your ${aobjnam(obj, 'fade')}.`);
        obj.otyp = 365; /* SCR_BLANK_PAPER */
        obj.spe = 0;
        obj.dknown = 0;
        return;
    } else {
        await erode_obj(obj, null, ERODE_CORRODE, EF_GREASE | EF_VERBOSE);
    }
}

/* C zap.c:3011 ubreatheu — poly'd hero uses its breath attack against itself
 * (getdir gave the self-direction '.'/'s', so u.dx==u.dy==u.dz==0).  The bolt
 * never travels: zhitu() is called directly on the hero's own square.
 *   int dtyp = 20 + mattk->adtyp - 1;   // ZT_BREATH(BZ_OFS_AD(adtyp))
 *   zhitu(dtyp, mattk->damn, flash_str(dtyp, TRUE), u.ux, u.uy);            */
export async function ubreatheu(mattk) {
    const u = game.u;
    const dtyp = 20 + (mattk.adtyp | 0) - 1; /* breath by hero */
    await zhitu(dtyp, mattk.damn | 0, flash_str(dtyp, true), u.ux | 0, u.uy | 0);
}

/* C zap.c:4751 ubuzz — hero buzz from (u.ux,u.uy) in (u.dx,u.dy). */
export async function ubuzz(type, nd) {
    const u = game.u;
    await dobuzz(type, nd, u.ux | 0, u.uy | 0, u.dx | 0, u.dy | 0, true, false, false);
}

/* C muse.c:2795-2814 mon_reflects(mon, str) — does this monster reflect a
 * ray?  Checked in order: worn shield of reflection, wielded artifact weapon
 * with SPFX_REFLECT, worn amulet of reflection, worn silver dragon
 * scales/mail, silver-or-chromatic-dragon form.  `str` mirrors C's `const
 * char *str`: null for the pure boolean probe dobuzz makes before deciding
 * to bounce, or the two-%s topline format ("But it reflects from %s %s!")
 * for the second, message-emitting call dobuzz makes once it has.  Same
 * five-branch shape as js/makemon.js's ureflects() one level up (that one
 * reads u.uprops[REFLECTING].extrinsic; this one walks the monster's own
 * worn items, since monsters have no such cached bitmask). NO RNG. */
const _SHIELD_OF_REFLECTION_ZAP = 158, _AMULET_OF_REFLECTION_ZAP = 208;
const _SILVER_DRAGON_SCALES_ZAP = 113, _SILVER_DRAGON_SCALE_MAIL_ZAP = 103;
const _SPFX_REFLECT_ZAP = 0x04000000;
/* C monst.h:210 `#define MON_WEP(mon) ((mon)->mw)` — the one-liner js/mhitu.js
 * and js/makemon.js already carry under this same name (js/mhitm.js:3734's
 * copy notes the walk-minvent version was the stale one). */
function _MON_WEP_zap(mon) { return mon ? (mon.mw ?? null) : null; }
/* C artifact.c:536-548 arti_reflects(obj) — SPFX_REFLECT while worn, or
 * CSPFX_REFLECT merely carried/wielded. */
function _arti_reflects_zap(obj) {
    const artidx = get_artifact(obj);
    if (artidx !== ART_NONARTIFACT) {
        if (((obj.owornmask | 0) & ~W_ART) && (arti_spfx(artidx) & _SPFX_REFLECT_ZAP))
            return true;
        if (arti_cspfx(artidx) & _SPFX_REFLECT_ZAP)
            return true;
    }
    return false;
}
export function _mon_reflects_zap(mon, fmt) {
    let o = which_armor(mon, W_ARMS);
    if (o && o.otyp === _SHIELD_OF_REFLECTION_ZAP) {
        if (fmt) {
            pline(fmt, s_suffix(mon_nam(mon)), 'shield');
            discover_object(_SHIELD_OF_REFLECTION_ZAP, true, true, true);
        }
        return true;
    } else if (_arti_reflects_zap(_MON_WEP_zap(mon))) {
        if (fmt) pline(fmt, s_suffix(mon_nam(mon)), 'weapon');
        return true;
    } else if ((o = which_armor(mon, W_AMUL)) && o.otyp === _AMULET_OF_REFLECTION_ZAP) {
        if (fmt) {
            pline(fmt, s_suffix(mon_nam(mon)), 'amulet');
            discover_object(_AMULET_OF_REFLECTION_ZAP, true, true, true);
        }
        return true;
    } else if ((o = which_armor(mon, W_ARM))
               && (o.otyp === _SILVER_DRAGON_SCALES_ZAP
                   || o.otyp === _SILVER_DRAGON_SCALE_MAIL_ZAP)) {
        if (fmt) pline(fmt, s_suffix(mon_nam(mon)), 'armor');
        return true;
    } else {
        const mndx = (mon.mndx ?? mon.mnum) | 0;
        if (mndx === PM_SILVER_DRAGON || mndx === PM_CHROMATIC_DRAGON) {
            if (fmt) pline(fmt, s_suffix(mon_nam(mon)), 'scales');
            return true;
        }
    }
    return false;
}

/* C zap.c:4772 dobuzz — the ray loop. */
export async function dobuzz(type, nd, sxIn, syIn, dxIn, dyIn, sayhit, saymiss, forcemiss) {
    const g = game, u = g.u;
    if (ENV.FF_BZZ_TRACE === '1')
        pushRngLogEntry(`^buzz_enter[type=${type|0} nd=${nd|0} from=${sxIn|0},${syIn|0} dir=${dxIn|0},${dyIn|0} force=${forcemiss ? 1 : 0}]`);
    const fltyp = zaptype(type), damgtype = fltyp % 10;
    _buzz_fltyp = fltyp; /* for the bounce message text */
    const fireball = (type === 10 + ZT_FIRE); /* ZT_SPELL(ZT_FIRE) */
    const hdmgtype = _uhas(23 /* HALLUC */) ? rn2(6) : damgtype;
    if (u.uswallow) {
        if (type < 0) return;
        const tmp = await _zhitm(u.ustuck, type, nd);
        if (!u.ustuck) {
            u.uswallow = 0;
        } else {
            await pline(`${The(flash_str(fltyp, false))} rips into `
                + `${mon_nam(u.ustuck)}${_wand_exclam(tmp)}`);
            /* Using disintegration from the inside only makes a hole... */
            if (tmp === ZP_MAGIC_COOKIE) u.ustuck.mhp = 0;
            if (DEADMONSTER(u.ustuck))
                await xkilled(u.ustuck, XKILL_GIVEMSG);
        }
        return;
    }
    if (type < 0)
        newsym(u.ux | 0, u.uy | 0);

    let range = rn1(7, 7); /* C zap.c:4816 — the divergence leaf. */
    let dx = dxIn, dy = dyIn;
    if (dx === 0 && dy === 0)
        range = 1;
    let sx = sxIn, sy = syIn;
    const shopdamage = { v: false }; /* C's `boolean shopdamage` + `&shopdamage` */
    /* C zap.c:4818 `save_bhitpos = gb.bhitpos;` — snapshot BEFORE the loop
     * starts overwriting g.bhitpos per-cell, restored at zap.c:5036 after the
     * loop (and after the fireball explode() below, which itself repoints
     * g.bhitpos while walking the blast). */
    const save_bhitpos = g.bhitpos ? { x: g.bhitpos.x, y: g.bhitpos.y } : null;

    tmp_at(DISP_BEAM, zapdir_to_glyph(dx, dy, hdmgtype));
    while (range-- > 0) {
        let lsx = sx, lsy = sy;
        sx += dx; sy += dy;
        if (!isok(sx, sy) || _buzz_typ(sx, sy) === STONE) {
            const bb = await _make_bounce(sx, sy, lsx, lsy, range, { dx, dy }, damgtype, fireball, hdmgtype, (d2) => { dx = d2.dx; dy = d2.dy; }, type);
            range = bb.range;
            if (bb.brk) { sx = bb.sx; sy = bb.sy; type = bb.type; break; }
            continue;
        }

        let mon = m_at(sx, sy);
        if (ENV.FF_BZZ_TRACE === '1')
            pushRngLogEntry(`^buzz_cell[x=${sx|0},y=${sy|0} mon=${mon ? (mon.m_id|0) : 0} pm=${mon?.data?.mndx ?? -1} range=${range|0}]`);
        if (cansee(sx, sy)) {
            if (mon && !canspotmon(mon))
                map_invisible(sx, sy);
            else if (!mon)
                unmap_invisible(sx, sy);
            if (ZAP_POS(_buzz_typ(sx, sy))
                || (isok(lsx, lsy) && cansee(lsx, lsy)))
                tmp_at(sx, sy);
        }
        g.bhitpos = { x: sx, y: sy };
        let gas_hit = (damgtype === ZT_POISON_GAS);
        if (!fireball && !gas_hit) {
            range += await zap_over_floor(sx, sy, type, shopdamage, true, 0);
            mon = m_at(sx, sy);
        }

        if (mon) {
            if (fireball) break;
            g.notonhead = (mon.mx !== g.bhitpos.x || mon.my !== g.bhitpos.y);
            if (!forcemiss && zap_hit(find_mac(mon), 0)) {
                /* C zap.c:4873-4884 — a hit can bounce off the target instead
                 * of damaging it.  This branch was MISSING entirely: every
                 * hit fell straight through to zhitm, so a ray that reached a
                 * reflecting bystander drew its d(nd,6) damage roll where C
                 * draws nothing and continues the ray in the OPPOSITE
                 * direction — an extra draw on this cell, and every cell the
                 * reversed ray then visits is a cell C's own tape accounts
                 * for and this port's forward-only loop never revisited.
                 * A reflected gas ray leaves no cloud at the reflection cell. */
                if (_mon_reflects_zap(mon, null)) {
                    if (cansee(mon.mx, mon.my)) {
                        await pline('The ' + flash_str(fltyp) + ' hits ' + mon_nam(mon) + '.');
                        shieldeff_real(mon.mx | 0, mon.my | 0);
                        _mon_reflects_zap(mon, 'But it reflects from %s %s!');
                        gas_hit = false;
                    }
                    dx = -dx;
                    dy = -dy;
                } else {
                    if (await _buzz_hit_monster(mon, type, nd, fltyp, sayhit))
                        break;
                }
                range -= 2;
            } else {
                /* miss — display only. */
                /* C zap.c:4943-4945 — a visible monster still gets the
                 * miss() message even when buzz_force_miss short-circuits the
                 * to-hit roll.  The flash_str call is RNG-bearing while
                 * hallucinating, so omitting it also shifts every later ray
                 * draw (the focused wand case misses the owlbear here). */
                if (saymiss || canseemon(mon))
                    miss(flash_str(fltyp, false), mon);
            }
        } else if (_u_at(sx, sy) && range >= 0) {
            nomul(0);
            /* C zap.c:4956-4959 — a mounted hero's steed may eat the bolt:
             *     if (u.usteed && !rn2(3) && !mon_reflects(u.usteed, 0)) {
             *         mon = u.usteed; goto buzzmonst;
             *     }
             * The rn2(3) is evaluated for EVERY ray that reaches a mounted
             * hero's square, so omitting it slid the stream on any ray that
             * reached a rider.  mon_reflects(u.usteed, null) is now the same
             * NO-RNG helper the buzzmonst branch above uses — a reflecting
             * steed does NOT take the hit; C falls through to the hero-hit
             * arm below instead, which the added conjunct reproduces (the
             * short-circuit still draws rn2(3) in exactly the same place). */
            const steedTookIt = !!(u.usteed && !rn2(3) && !_mon_reflects_zap(u.usteed, null));
            if (steedTookIt) {
                /* C's `goto buzzmonst` — the steed is treated as the target and
                 * the hero-branch tail (flashburn / stop_occupation) is skipped,
                 * exactly as the jump does. */
                const steed = u.usteed;
                g.notonhead = (steed.mx !== g.bhitpos.x || steed.my !== g.bhitpos.y);
                if (!forcemiss && zap_hit(find_mac(steed), 0)) {
                    if (await _buzz_hit_monster(steed, type, nd, fltyp, sayhit))
                        break;
                    range -= 2;
                }
            } else if (!forcemiss && zap_hit(u.uac | 0, 0)) {
                range -= 2;
                /* "<The flash> hits you!" */
                await pline(`The ${flash_str(fltyp)} hits you!`);
                // C update_topl blocks on overflow before applying the hit.
                // Include command-result text stashed by earlier ray effects.
                await flush_pending_messages();
                if (_uhas(65 /* REFLECTING */)) {
                    /* C zap.c:4959-4971: reflection teaches observers, reverses
                     * the ray, flashes the shield, and suppresses gas here. */
                    if (!_uhas(15 /* BLINDED */))
                        await ureflects('But %s reflects from your %s!', 'it');
                    else
                        await pline('For some reason you are not affected.');
                    monstseesu(M_SEEN_REFL);
                    dx = -dx; dy = -dy;
                    shieldeff_real(sx, sy);
                    gas_hit = false;
                } else {
                    await zhitu(type, nd, flash_str(fltyp, true), sx, sy);
                    if (game._pendingDeath)
                        return;
                    monstunseesu(M_SEEN_REFL);
                }
            } else if (!_uhas(15 /* BLINDED */)) {
                await pline(`The ${flash_str(fltyp)} whizzes by you!`);
            } else if (damgtype === ZT_LIGHTNING) {
                /* C zap.c:4986-4987 */
                await pline(`Your ${body_part(ARM)} tingles.`);
            }
            /* C zap.c:4979-4980: ZT_LIGHTNING → flashburn((long) d(nd,50), TRUE).
             * Fires after the hit/miss branch, regardless of hit, for lightning
             * — but NOT when the steed took the bolt (C jumped away). */
            if (!steedTookIt && damgtype === ZT_LIGHTNING)
                await flashburn(d(nd, 50), true);
            if (!steedTookIt) {
                await stop_occupation();
                nomul(0);
            }
        }

        if (gas_hit)
            await zap_over_floor(sx, sy, type, shopdamage, true, 0);

        /* bounce check: !ZAP_POS or closed door with range left. */
        if (!ZAP_POS(_buzz_typ(sx, sy)) || (closed_door(sx, sy) && range >= 0)) {
            const bb = await _make_bounce(sx, sy, lsx, lsy, range, { dx, dy }, damgtype, fireball, hdmgtype, (d2) => { dx = d2.dx; dy = d2.dy; }, type);
            range = bb.range;
            if (bb.brk) { sx = bb.sx; sy = bb.sy; type = bb.type; break; }
        }
    }
    /* C zap.c:5024 tmp_at(DISP_END, 0) — erase every beam cell (newsym per saved
     * position), restoring the hero/objects/terrain the beam painted over. */
    tmp_at(DISP_END, 0);
    if (fireball)
        await explode(sx, sy, type, d(12, 6), 0, EXPL_FIERY);
    /* C zap.c:5028-5034: if (shopdamage) pay_for_damage(dmgstr, FALSE); —
     * dmgstr keyed on damgtype exactly as C's nested ?: chain. */
    if (shopdamage.v) {
        const dmgstr = damgtype === ZT_FIRE ? 'burn away'
            : damgtype === ZT_COLD ? 'shatter'
            : damgtype === ZT_ACID ? 'damage'
            : damgtype === ZT_DEATH ? 'disintegrate'
            : 'destroy';
        await pay_for_damage(dmgstr, false);
    }
    /* C zap.c:5036: gb.bhitpos = save_bhitpos; */
    g.bhitpos = save_bhitpos;
    void saymiss;
}

async function _make_bounce(sx, sy, lsx, lsy, range, dir, damgtype, fireball, hdmgtype, setdir, typeIn) {
    void damgtype;
    const typ = _buzz_typ(sx, sy);
    const inMines = In_mines(game.u.uz); /* C zap.c:5003 */
    const bchance = (!isok(sx, sy) || typ === STONE) ? 10
                  : (inMines && IS_WALL(typ)) ? 20 : 75;
    if ((--range > 0 && isok(lsx, lsy) && cansee(lsx, lsy)) || fireball) {
        if (Is_airlevel(game.u.uz)) {
            /* C zap.c:5006-5009. */
            await pline(`The ${flash_str(zaptype_fltyp_cache())} vanishes into the aether!`);
            return { range, brk: true, sx, sy, type: fireball ? ZT_FIRE /* ZT_WAND(ZT_FIRE) */ : typeIn };
        } else if (fireball) {
            /* C zap.c:5010-5012 — explode at the last valid cell, not here. */
            return { range, brk: true, sx: lsx, sy: lsy, type: typeIn };
        }
        /* C zap.c:5012 pline_The("%s bounces!", flash_str(fltyp, FALSE)).
         * Awaited: C's pline is blocking, and this line is the first of the
         * messages that accumulate on the topline for this zap. */
        await pline(`The ${flash_str(zaptype_fltyp_cache())} bounces!`);
    }
    bounce_dir(sx, sy, dir, bchance);
    setdir(dir);
    /* C zap.c:5015 tmp_at(DISP_CHANGE, zapdir_to_glyph(dx, dy, hdmgtype)) — the
     * bounced ray draws with the NEW direction's beam symbol from here on. */
    tmp_at(DISP_CHANGE, zapdir_to_glyph(dir.dx, dir.dy, hdmgtype));
    return { range, brk: false };
}
/* The fltyp for the bounce message — cached on dobuzz entry. */
let _buzz_fltyp = 1;
function zaptype_fltyp_cache() { return _buzz_fltyp; }

const _MIN_ICE_TIME = 50, _MAX_ICE_TIME = 2000;
export function start_melt_ice_timeout(x, y, min_time) {
    let when = min_time | 0;
    if (when < _MIN_ICE_TIME - 1)
        when = _MIN_ICE_TIME - 1;
    while (++when <= _MAX_ICE_TIME) {
        if (!rn2((_MAX_ICE_TIME - when) + _MIN_ICE_TIME))
            break;
    }
    if (when <= _MAX_ICE_TIME) {
        const where = ((x | 0) << 16) | (y | 0);
        start_timer(when, TIMER_LEVEL, MELT_ICE_AWAY, long_to_any(where));
    }
}

const COIN_CLASS_BURY = 12;
export async function bury_objs(x, y) {
    const rooms = in_rooms(x, y, SHOPBASE);
    const shkp = shop_keeper(rooms.length ? rooms[0] : 0);
    const costly = !!(shkp && costly_spot(x, y));
    let loss = 0;

    let otmp = (game.level && game.level.levelObjects
                && game.level.levelObjects[x]) ? game.level.levelObjects[x][y] : null;
    while (otmp) {
        const otmp2 = otmp.nexthere;
        if (costly && !(game.context && game.context.mon_moving)) {
            loss += (await stolen_value(otmp, x, y, !!shkp.mpeaceful, true));
            if ((otmp.oclass | 0) !== COIN_CLASS_BURY)
                otmp.no_charge = 1;
        }
        await bury_an_obj(otmp, null);
        otmp = otmp2;
    }

    del_engr_at(x, y);
    newsym(x, y);
    maybe_unhide_at(x, y);

    if (costly && loss)
        await pline(`You owe ${shkname(shkp)} ${loss} ${currency(loss)} for burying merchandise.`);
}

export async function zap_over_floor(x, y, type, shopdamage, ignoremon, exploding_wand_typ) {
    let zapverb;
    let mon;
    let t;
    const lev = _buzz_cell(x, y);
    const see_it = cansee(x, y);
    let yourzap;
    let rangemod = 0;
    const damgtype = zaptype(type) % 10;

    if (type === PHYS_EXPL_TYPE)
        return -1000;
    if (!lev)
        return 0; /* off-map cell; C indexes levl[][] only for isok() spots */
    const lavawall = (lev.typ | 0) === LAVAWALL;

    switch (damgtype) {
    case ZT_FIRE:
        /* C zap.c:5164-5173 — a burning web is destroyed. RNG-free. */
        t = t_at(x, y);
        if (t && (t.ttyp | 0) === WEB_ZAP) {
            if (see_it)
                await Norep('A web bursts into flames!'); /* C zap.c:5170 */
            await delfloortrap(t); t = null;
            if (see_it)
                newsym(x, y);
        }
        if (is_ice(x, y)) {
            /* C zap.c:5167 — fire melts ice even without a message argument. */
            await melt_ice_zap(x, y, null);
        } else if (is_pool(x, y)) {
            /* C zap.c:5176-5231. */
            const on_water_level = Is_waterlevel(game.u?.uz);
            let msggiven = false;
            let msgtxt = !Deaf_zap()
                ? 'You hear hissing gas.'
                : (type >= 0 ? 'That seemed remarkably uneventful.' : null);

            if (!on_water_level) {
                create_gas_cloud(x, y, rnd(5), 0); /* 1..5, no damage */
                /* C: if (iflags.last_msg == PLNMSG_ENVELOPED_IN_GAS)
                 *        msggiven = TRUE;
                 * js/region.js make_gas_cloud emits that pline but does not set
                 * the last_msg flag; read the same condition it tests. */
                if (game._region_enveloped_msg) {
                    msggiven = true;
                    game._region_enveloped_msg = false;
                }
            }

            if ((lev.typ | 0) !== POOL) { /* MOAT or DRAWBRIDGE_UP or WATER */
                t = null;
                if (on_water_level)
                    msgtxt = (see_it || !Deaf_zap()) ? 'Some water boils.' : null;
                else if (see_it)
                    msgtxt = 'Some water evaporates.';
            } else {
                rangemod -= 3;
                lev.typ = ROOM; lev.flags = 0;
                /* C zap.c:5217-5229 — evaporating a pool leaves a pit,
                 * then immediately applies its trap effect to the occupant. */
                t = await maketrap(x, y, PIT);
                if (see_it)
                    msgtxt = 'The water evaporates.';
            }
            if (msgtxt && !msggiven)
                await Norep(msgtxt); /* C zap.c:5206 Norep("%s", msgtxt) */

            if ((lev.typ | 0) === ROOM) { /* POOL changed to ROOM above */
                mon = m_at(x, y);
                if (mon && mon.mundetected && _is_swimmer_zap(mon))
                    mon.mundetected = 0;
                newsym(x, y);
                /* C zap.c:5222-5229 — apply the new pit immediately. */
                if (t) {
                    if (u_at(x, y))
                        await dotrap(t, NO_TRAP_FLAGS);
                    else if (mon)
                        await mintrap(mon, NO_TRAP_FLAGS);
                }
            }
        } else if (IS_FOUNTAIN(lev.typ | 0)) {
            create_gas_cloud(x, y, rnd(3), 0); /* 1..3, no damage */
            if (see_it)
                await pline('Steam billows from the fountain.');
            rangemod -= 1;
            /* C zap.c:5257 — a hero-caused fire bolt dries a fountain through
             * fountain.c:201 dryup().  The call is after the steam/message and
             * therefore its rn2(3) depletion roll belongs here in the stream.
             * `type > 0` is C's `isyou` argument: positive zap types are hero
             * zaps, while negative types are monster breaths/blasts. */
            await dryup(x, y, type > 0);
        }
        break; /* ZT_FIRE */

    case ZT_COLD:
        /* C zap.c:5237-5330. */
        if (is_pool(x, y) || _is_lava_zap(x, y) || lavawall) {
            const lava = (_is_lava_zap(x, y) || lavawall);
            const moat = is_moat(x, y);
            /* C zap.c:5241 chance = max(2, 5 + svl.level.flags.temperature*10) */
            const temperature = (game.level && game.level.flags
                                 && game.level.flags.temperature) | 0;
            const chance = Math.max(2, 5 + temperature * 10);

            if (IS_WATERWALL(lev.typ | 0) || (lavawall && rn2(chance))) {
                /* C zap.c:5243-5252 — "For now, don't let WATER freeze." */
                if (see_it)
                    await pline(`The ${hliquid(lavawall ? 'lava' : 'water')} freezes for a moment.`);
                else
                    await You_hear('a soft crackling.');
                rangemod -= 1000; /* stop */
            } else {
                const buf = waterbody_name(x, y); /* for MOAT */

                rangemod -= 3;
                if ((lev.typ | 0) === DRAWBRIDGE_UP) {
                    lev.drawbridgemask = ((lev.drawbridgemask | 0) & ~DB_UNDER)
                                         | (lava ? DB_FLOOR : DB_ICE);
                } else {
                    lev.icedpool = lava ? 0
                                   : ((lev.typ | 0) === POOL) ? ICED_POOL
                                                              : ICED_MOAT;
                    if (lavawall) {
                        if ((isok(x, y - 1) && IS_WALL(_buzz_typ(x, y - 1)))
                            || (isok(x, y + 1) && IS_WALL(_buzz_typ(x, y + 1))))
                            lev.typ = VWALL;
                        else
                            lev.typ = HWALL;
                        fix_wall_spines(Math.max(0, x - 1), Math.max(0, y - 1),
                                        Math.min(COLNO_ZAP - 1, x + 1),
                                        Math.min(ROWNO_ZAP - 1, y + 1));
                    } else {
                        lev.typ = lava ? ROOM : ICE;
                    }
                }
                /* C zap.c:5265 bury_objs(x, y) — now ported (see above). */
                await bury_objs(x, y);
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
                    const u = game.u;
                    if (u.uinwater) { /* not just `if (Underwater)' */
                        set_uinwater(0);
                        u.uundetected = 0;
                        await docrt();
                        game.vision_full_recalc = 1;
                    } else if (u.utrap && (u.utraptype | 0) === TT_LAVA) {
                        if (_uhas(PASSES_WALLS)) {
                            await pline('You pass through the now-solid rock.');
                            await reset_utrap(true);
                        } else {
                            set_utrap(rn1(50, 20), TT_INFLOOR);
                            await pline('You are firmly stuck in the cooling rock.');
                        }
                    }
                } else if ((mon = m_at(x, y)) != null) {
                    if (_is_swimmer_zap(mon) && mon.mundetected) {
                        mon.mundetected = 0;
                        newsym(x, y);
                    }
                }
                /* C zap.c:5319-5320: start_melt_ice_timeout(x, y, 0L);
                 * obj_ice_effects(x, y, TRUE); — now both ported. */
                if (!lava) {
                    start_melt_ice_timeout(x, y, 0);
                    obj_ice_effects(x, y, true);
                }
            } /* ?WATER */
        } else if (is_ice(x, y)) {
            /* C zap.c:5324-5330 — already ice, so just firm it up, and only
             * ice that is ALREADY timed is affected.  Stops the MELT_ICE_AWAY
             * timer and immediately re-schedules it via start_melt_ice_timeout
             * — NOT a no-op on the RNG stream even though the C comment frames
             * it as one on the timeout queue: start_melt_ice_timeout draws a
             * fresh geometric roll every call. */
            const melt_time = spot_time_left(x, y, MELT_ICE_AWAY);
            if (melt_time !== 0) {
                spot_stop_timers(x, y, MELT_ICE_AWAY);
                start_melt_ice_timeout(x, y, melt_time);
            }
        }
        break; /* ZT_COLD */

    case ZT_POISON_GAS:
        /* C zap.c:5334-5340 — poison gas with range 1: green dragon / iron
         * golem breath (AD_DRST); the caller is placing a series of 1x1 clouds
         * along the zap's path, and <x,y> for wall locations gets rejected. */
        if (ZAP_POS(lev.typ | 0))
            create_gas_cloud(x, y, 1, 8);
        break;

    case ZT_LIGHTNING:
        /* FALLTHRU — C zap.c:5342-5344 */
    case ZT_ACID:
        if ((lev.typ | 0) === IRONBARS) {
            if (damgtype === ZT_LIGHTNING && rn2(10))
                break;
            if (((lev.wall_info | 0) & W_NONDIGGABLE) !== 0) {
                if (see_it)
                    await Norep(`The ${IRONBARS_NAME_ZAP} ${(damgtype === ZT_ACID) ? 'corrode' : 'melt'} somewhat but remain intact.`);
                /* but nothing actually happens... */
            } else {
                rangemod -= 3;
                if (see_it)
                    await Norep(`The ${IRONBARS_NAME_ZAP} ${(damgtype === ZT_ACID) ? 'corrode away' : 'melt'}.`);
                /* C zap.c:5362 -> dissolve_bars() — turn the bars into
                 * the terrain appropriate to the edge/special level and redraw
                 * the square. */
                const edge = (lev.edge | 0) === 1;
                const special = in_rooms(x, y, 0).length > 0;
                lev.typ = edge ? DOOR : (special ? ROOM : CORR);
                lev.flags = 0; /* D_NODOOR */
                newsym(x, y);
                if (u_at(x, y))
                    await switch_terrain();
                if (in_rooms(x, y, SHOPBASE).length > 0) { /* C's *in_rooms(): the FIRST entry */
                    add_damage(x, y, (type >= 0) ? SHOP_BARS_COST : 0);
                    if (type >= 0 && shopdamage) shopdamage.v = true;
                }
            }
        }
        break; /* ZT_ACID */

    default:
        break;
    }

    /* C zap.c:5372-5395 — set up zap text for possible door feedback; for an
     * exploding wand we want "the blast" rather than "your blast" even if the
     * hero caused it. */
    yourzap = (type >= 0 && !exploding_wand_typ);
    zapverb = 'blast'; /* breath attack or wand explosion */
    if (!exploding_wand_typ) {
        const ztype = zaptype(type); /* 0..29 for both hero and monsters */

        if (ztype < 10 /* ZT_SPELL(0) */)
            zapverb = 'bolt'; /* wand zap */
        else if (ztype < 20 /* ZT_BREATH(0) */)
            zapverb = 'spell';
    } else if (exploding_wand_typ === POT_OIL || exploding_wand_typ === SCR_FIRE) {
        /* leave zapverb as "blast"; exploding_wand_typ was nonzero, so
           'yourzap' is FALSE and the result will be "the blast" */
        exploding_wand_typ = 0; /* not actually an exploding wand */
    }

    /* C zap.c:5397-5407 — secret door gets revealed, converted into a regular
     * door. */
    if ((lev.typ | 0) === SDOOR) {
        cvt_sdoor_to_door(lev); /* .typ = DOOR */
        recalc_block_point(x, y);
        newsym(x, y);
        if (see_it)
            await pline(`${yourzap ? 'Your' : 'The'} ${zapverb} reveals a secret door.`);
        else if (Is_rogue_level(game.u?.uz))
            draft_message(false); /* "You feel a draft." (open doorway) */
    }

    /* C zap.c:5409-5487 — regular door absorbs remaining zap range, possibly
     * gets destroyed. */
    if (closed_door(x, y)) {
        let new_doormask = -1;
        let see_txt = null, sense_txt = null, hear_txt = null;
        let def_case = false;

        rangemod = -1000;
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
            if (Math.abs(type) !== 20 + ZT_DEATH /* ZT_BREATH(ZT_DEATH) */) {
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
            /* C zap.c:5442-5461 def_case: */
            let handled = false;
            if (exploding_wand_typ > 0 && exploding_wand_typ === WAN_STRIKING_ZAP) {
                /* Magical explosion from misc exploding wand */
                new_doormask = D_BROKEN;
                see_txt = 'The door crashes open!';
                sense_txt = 'feel a burst of cool air.';
                handled = true;
            }
            if (!handled) {
                if (see_it) {
                    /* "the door absorbs the blast" would be inaccurate for an
                       exploding wand since other adjacent locations still get
                       hit */
                    if (exploding_wand_typ)
                        await pline('The door remains intact.');
                    else
                        await pline(`The door absorbs ${yourzap ? 'your' : 'the'} ${zapverb}!`);
                } else {
                    await pline('You feel vibrations.');
                }
            }
        }
        if (new_doormask >= 0) { /* door gets broken */
            if (in_rooms(x, y, SHOPBASE).length > 0) { /* C's *in_rooms(): the FIRST entry */
                if (type >= 0) {
                    add_damage(x, y, SHOP_DOOR_COST);
                    if (shopdamage) shopdamage.v = true;
                } else { /* caused by monster */
                    add_damage(x, y, 0);
                }
            }
            lev.doormask = new_doormask;
            recalc_block_point(x, y); /* vision */
            if (see_it) {
                await pline(see_txt);
                newsym(x, y);
            } else if (sense_txt) {
                await pline(`You ${sense_txt}`);
            } else if (hear_txt) {
                await You_hear(hear_txt);
            }
            if (picking_at(x, y)) {
                await stop_occupation();
                reset_pick();
            }
        }
    }

    /* C zap.c:5489-5496 */
    if (_obj_at_zap(x, y) && damgtype === ZT_FIRE) {
        if (await burn_floor_objects(x, y, false, type > 0) && couldsee(x, y)) {
            newsym(x, y);
            await pline(`You ${!_uhas(BLINDED) ? 'see a puff' : 'smell a whiff'} of smoke.`);
        }
    }
    if (!ignoremon && (mon = m_at(x, y)) != null)
        await wakeup_attack(mon, (type >= 0));
    return rangemod;
}
/* C zap.c:5033-5074 melt_ice(). */
export async function melt_ice_zap(x, y, msg) {
    const lev = _buzz_cell(x, y);
    if (!lev)
        return;
    if (!msg) msg = 'The ice crackles and melts.';
    if ((lev.typ | 0) === DRAWBRIDGE_UP || (lev.typ | 0) === DRAWBRIDGE_DOWN) {
        lev.drawbridgemask = (lev.drawbridgemask | 0) & ~DB_ICE;
    } else if ((lev.typ | 0) === ICE) {
        lev.typ = ((lev.icedpool | 0) === ICED_POOL) ? POOL : MOAT;
        lev.icedpool = 0;
    } else {
        return;
    }
    spot_stop_timers(x, y, MELT_ICE_AWAY);
    if (t_at(x, y))
        await trap_ice_effects(x, y, true);
    obj_ice_effects(x, y, false);
    await unearth_objs(x, y);
    if (game.u?.uinwater)
        vision_recalc(1);
    newsym(x, y);
    if (msg && (cansee(x, y) || u_at(x, y)))
        await Norep(msg);

    let boulder = sobj_at(475 /* BOULDER */, x, y);
    if (boulder) {
        if (cansee(x, y))
            await pline(`${An(xname(boulder))} settles...`);
        do {
            obj_extract_self_general(boulder);
            await boulder_hits_pool(boulder, x, y, false);
        } while (is_pool(x, y)
                 && (boulder = sobj_at(475 /* BOULDER */, x, y)) != null);
        newsym(x, y);
    }
    if (u_at(x, y)) {
        await spoteffects(true);
    } else if (is_pool(x, y) && m_at(x, y)) {
        await minliquid(m_at(x, y));
    }
}
/* C rm.h — LAVAPOOL/LAVAWALL; the same two-typ test js/teleport.js:1438 uses. */
function _is_lava_zap(x, y) {
    if (!isok(x, y)) return false;
    const c = _buzz_cell(x, y);
    if (!c) return false;
    const typ = c.typ | 0;
    return typ === LAVAPOOL || typ === LAVAWALL;
}
/* C defsyms[S_bars].explanation — js/defsym_data.js row 6. */
const IRONBARS_NAME_ZAP = 'iron bars';
/* C global.h COLNO/ROWNO. */
const COLNO_ZAP = 80, ROWNO_ZAP = 21;
/* C objects[] WAN_STRIKING — read through the same otyp table zap.js uses. */
const WAN_STRIKING_ZAP = WAN_STRIKING;
function _obj_at_zap(x, y) {
    const lo = game.level && game.level.levelObjects;
    return !!(lo && lo[x] && lo[x][y]);
}
const WEB_ZAP = 18;
const OTYP_ARROW = 18, OTYP_DART = 24; /* objects.h */
/* C youprop.h Deaf — the same flags.deaf reader js/mhitu.js:717 uses. */
function Deaf_zap() { return !!(game.flags && game.flags.deaf); }
/* C mondata.h is_swimmer(ptr) = ptr->mflags1 & M1_SWIM. */
function _is_swimmer_zap(mon) {
    const M1_SWIM = 0x00000002; /* monflag.h:86 */
    return !!(((mon && mon.data && mon.data.mflags1) | 0) & M1_SWIM);
}
function _u_at(x, y) {
    const u = game.u;
    return (u.ux | 0) === x && (u.uy | 0) === y;
}
/* C zap.c:3025 is_hero_spell — type 10..19 (hero-cast spell). */
function is_hero_spell(type) {
    return type >= 10 && type <= 19;
}

/* C mondata.h:157 is_mplayer(ptr) — ptr's pmidx in [PM_ARCHEOLOGIST, PM_WIZARD].
 * Local copy of makemon.js's (unexported) _isMplayer; same bounds. */
const PM_ARCHEOLOGIST = 331;
const PM_WIZARD = 343;
function _resist_is_mplayer(mon) {
    const pmidx = (mon && mon.data) ? (mon.data.pmidx | 0) : -1;
    return pmidx >= PM_ARCHEOLOGIST && pmidx <= PM_WIZARD;
}
/* C mon.c:6068-6074 shieldeff_mon.  Visibility is tested at the map square,
 * not through canseemon(): an unseen monster can still own the visible shield
 * and resistance message.  pline_mon's set_msg_xy bookkeeping is represented
 * by this port's shared accessibility message location. */
async function shieldeff_mon(mon) {
    const x = mon.mx | 0, y = mon.my | 0;
    shieldeff_real(x, y);
    if (cansee(x, y)) {
        game.a11y = game.a11y || {};
        game.a11y.msg_loc = { x, y };
        await pline(`${Monnam(mon)} resists!`);
    }
}
/* C ref: mon.c:3364-3384 monkilled(mdef, fltxt, how) — a monster killed by
 * something other than the hero's own blow.  For how == AD_RBRE (the
 * monster-zap path resist() takes) gd.disintegested stays FALSE, so C reduces
 * to the mondied() branch: the "<Monnam> is killed!" line, mvitals bookkeeping,
 * corpse_chance + make_corpse, and m_detach.  js/trap.js already carries that
 * exact sequence for its own trap-kill caller; it is reused rather than
 * duplicated so there is only one body to drift.
 *
 * The two guards below are assertions, not gaps: resist() is the ONLY caller
 * and it passes the literal arguments ('' , AD_RBRE) at zap.c:6144, so
 * neither branch is reachable.  They are left as throws (rather than a
 * no-action) precisely because reaching one would mean a dead monster was
 * silently left on the map, which no replay could detect. */
async function _resist_monkilled(mon, msg, adtyp) {
    if (adtyp === AD_DGST || adtyp === -AD_RBRE)
        throw new Error('unreachable: monkilled disintegration path (mondead)');
    if (msg)
        throw new Error('unreachable: monkilled with a non-empty killer string');
    await monkilled_trap(mon);
}
/* C decl.c:531 gm.m_using — "kludge to use mondied instead of killed".  It is
 * set TRUE (transiently) by muse.c's use_offensive/use_defensive while a
 * MONSTER is the one applying the effect, which is exactly the case resist()
 * has to distinguish: a monster-zapped kill is monkilled(), a hero-zapped kill
 * is killed().  This used to be a hardcoded `false` because muse.c was not
 * ported; js/muse.js now sets game.m_using, so read the real flag. */
function _m_using_now() { return !!game.m_using; }

/* C zap.c:6093 resist(mtmp, oclass, damage, tell) — monster saving throw
 * against a wand/spell/breath effect.  C ref: nethack-c/src/zap.c:6093-6151. */
export async function resist(mtmp, oclass, damage, tell) {
    const u = game.u || {};

    /* fake players always pass resistance test against Conflict. */
    if (oclass === RING_CLASS && !damage && !tell && _resist_is_mplayer(mtmp))
        return 1;

    /* attack level */
    let alev;
    switch (oclass) {
    case WAND_CLASS: alev = 12; break;
    case TOOL_CLASS: alev = 10; break; /* instrument */
    case WEAPON_CLASS: alev = 10; break; /* artifact */
    case SCROLL_CLASS: alev = 9; break;
    case POTION_CLASS: alev = 6; break;
    case RING_CLASS: alev = 5; break;
    default: alev = (u.ulevel | 0); break; /* spell */
    }

    /* defense level */
    let dlev = (mtmp.m_lev | 0);
    if (dlev > 50) dlev = 50;
    else if (dlev < 1) dlev = _resist_is_mplayer(mtmp) ? (u.ulevel | 0) : 1;

    let resisted = (rn2(100 + alev - dlev) < (mtmp.data.mr | 0)) ? 1 : 0;
    if (resisted) {
        if (tell) await shieldeff_mon(mtmp);
        damage = Math.trunc((damage + 1) / 2);
    }

    if (damage) {
        mtmp.mhp = (mtmp.mhp | 0) - damage;
        if (DEADMONSTER(mtmp)) {
            if (_m_using_now())
                await _resist_monkilled(mtmp, '', AD_RBRE);
            else
                /* C zap.c:6154 killed(mtmp) -> xkilled(mtmp, XKILL_GIVEMSG) */
                await xkilled(mtmp, XKILL_GIVEMSG);
        }
    }
    return resisted;
}

/* exported for js/trap.js trapeffect_fire_trap's monster arm (C trap.c:1795),
 * which is C's `destroy_items(mtmp, AD_FIRE, orig_dmg)`. */
export async function destroy_items_mon(mon, dmgtyp, dmg_in) {
    /* C zap.c:5990-6001 */
    let limit = Math.trunc(dmg_in / DMG_DESTROY_SCALE);
    if ((dmg_in % DMG_DESTROY_SCALE) > rn2(DMG_DESTROY_SCALE)) limit++;
    if (limit > MAX_ITEMS_DESTROYED) limit = MAX_ITEMS_DESTROYED;
    if (limit < 1) return 0;
    /* C zap.c:6031-6068: scan mon->minvent (a monster is never u_carry). */
    const chain = [];
    for (let o = mon && mon.minvent; o; o = o.nobj) chain.push(o);
    let elig_stacks = 0;
    const items_to_destroy = [];
    for (const obj of chain) {
        if (!obj) continue;
        /* C zap.c:6034: if (!destroyable(obj, dmgtyp)) continue; */
        if (!_destroyable(obj, dmgtyp)) continue;
        /* C zap.c:6038: i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks); */
        const i = (elig_stacks < limit) ? elig_stacks : rn2(elig_stacks);
        elig_stacks++;
        if (i < 0 || i >= limit) continue;
        items_to_destroy[i] = obj;
    }
    if (elig_stacks > limit) elig_stacks = limit;
    const n = Math.min(elig_stacks, limit);
    let dmg_out = 0;
    for (let i = 0; i < n; i++) {
        const obj = items_to_destroy[i];
        if (!obj) continue;
        dmg_out += (await maybe_destroy_item_mon(mon, obj, dmgtyp));
    }
    return dmg_out;
}

/* C zap.c:5791-5947 maybe_destroy_item — the carrier-is-a-monster path.  See
 * the destroy_items_mon comment above for the full list of u_carry
 * substitutions this makes.  Kept synchronous (destroy_items_mon's callers,
 * e.g. js/trap.js's trapeffect_fire_trap_mon, are themselves synchronous and
 * fold the returned damage straight into mon.mhp); the destruction message
 * is printed fire-and-forget via `void pline(...)`, the same pattern
 * js/dokick.js uses throughout for a sync caller that cannot await display
 * output — the message carries no RNG of its own. */
async function maybe_destroy_item_mon(carrier, obj, dmgtyp) {
    if (!obj) return 0;
    const vis = canseemon(carrier);
    let quan = obj.quan | 0;
    let dmg = 0, dindx = 0, xresist = 0, skip = 0, chargeit = false;
    const oclass = obj.oclass | 0, otyp = obj.otyp | 0;
    if (dmgtyp === AD_COLD) {
        /* C zap.c:5813-5816 */
        dindx = 0;
        dmg = rnd(4);
    } else if (dmgtyp === AD_FIRE) {
        /* C zap.c:5818-5849 */
        xresist = (oclass !== POTION_CLASS && otyp !== GLOB_OF_GREEN_SLIME
                   && Resists_Elem(carrier, FIRE_RES)) ? 1 : 0;
        if (otyp === SPE_BOOK_OF_THE_DEAD) {
            skip = 1;
        } else if (oclass === POTION_CLASS) {
            dindx = (otyp !== POT_OIL) ? 1 : 2;
            dmg = rnd(6);
        } else if (oclass === SCROLL_CLASS) {
            dindx = 3; dmg = 1;
        } else if (oclass === SPBOOK_CLASS) {
            dindx = 4; dmg = 1;
        } else if (oclass === FOOD_CLASS) { /* GLOB_OF_GREEN_SLIME */
            dindx = 1;
            dmg = Math.trunc(((obj.owt | 0) + 19) / 20);
        }
    } else if (dmgtyp === AD_ELEC) {
        /* C zap.c:5851-5878 */
        xresist = (oclass !== RING_CLASS && Resists_Elem(carrier, SHOCK_RES)) ? 1 : 0;
        if (oclass === RING_CLASS) {
            /* C zap.c:5855-5867.  The worn-ring-under-non-metallic-gloves
             * protection (zap.c:5856) is a hero equipment-slot test
             * (uarmg); carrier is never the hero here, so only the
             * item-intrinsic RIN_SHOCK_RESIST skip applies. */
            if (otyp === RIN_SHOCK_RESIST) {
                skip = 1;
            } else if ((otyp >= RIN_BASE && otyp <= RIN_LAST_CHARGED) && rn2(3)) {
                chargeit = true;
            } else {
                dindx = 5;
                dmg = 0;
            }
        } else if (oclass === WAND_CLASS) {
            dindx = 6;
            dmg = rnd(10);
        } else {
            return 0;
        }
    } else {
        return 0;
    }
    if (chargeit) {
        /* C zap.c:5949-5954: recharge() only ever touches the hero's own
         * inventory ("FIXME: recharge only handles items in hero's
         * inventory"); for a monster this arm is a pure no-op. */
        return 0;
    }
    if (skip)
        return 0;
    /* C zap.c:5890: `char osym = obj->oclass;`, sampled before the useup
     * loop can free obj. */
    const osym = oclass;
    if (obj.in_use) quan--; /* C zap.c:5891-5892 */
    /* C zap.c:5893-5895: for (i=cnt=0; i<quan; i++) if (!rn2(3)) cnt++; */
    let cnt = 0;
    for (let i = 0; i < quan; i++)
        if (!rn2(3)) cnt++;
    if (!cnt) return 0;
    if (vis) {
        const mult = (cnt === 1)
            ? ((quan === 1) ? '' : 'One of ')
            : ((cnt < quan) ? 'Some of '
                : (quan === 2) ? 'Both of ' : 'All of ');
        const nm = (cnt === 1 && quan === 1) ? _Yname2(obj) : yname(obj);
        void pline(`${mult}${nm} ${DESTROY_STRINGS[dindx][cnt > 1 ? 1 : 0]}!`);
    }
    /* C zap.c:5912-5926 — potionbreathe/owornmask/gc_current_wand are all
     * u_carry-only; none apply to a monster's item. */
    /* C zap.c:5928-5933: useup(obj) cnt times → m_useup(mon, obj) here. */
    for (let i = 0; i < cnt; i++)
        await m_useup(carrier, obj);
    /* C zap.c:5934-5947:
     *     if (dmg) { if (!u_carry) return xresist ? 0 : dmg; ... }
     *     return dmg;
     * Equivalent for dmg==0 either way, so this collapses to one line —
     * the monster path never calls losehp/exercise; the caller applies dmg. */
    return xresist ? 0 : dmg;
}



/* C monattk.h:42-78 — the damage types this file names. */
const AD_PHYS = 0;
const AD_MAGM = 1;
const AD_DRST = 7;
const AD_SPC2 = 10;
const AD_DREN = 16;
const AD_DRDX = 30;
const AD_DRCO = 31;
const AD_DISE = 33;
const AD_PEST = 38;
const AD_SPEL = 241;
const AD_ENCH = 41;
/* C hack.h:1471 PHYS_EXPL_TYPE — "currently only gas spores". */
const PHYS_EXPL_TYPE = -1;
/* C defsym.h:239-247 PCHAR2 rows S_expl_tl..S_expl_br. */
const S_expl_tl = 96, S_expl_tc = 97, S_expl_tr = 98;
const S_expl_ml = 99, S_expl_mc = 100, S_expl_mr = 101;
const S_expl_bl = 102, S_expl_bc = 103, S_expl_br = 104;
/* C explode.c:10-14 — "Arrays are column first, while the screen is row first". */
const _explosion_cmap = [
    [S_expl_tl, S_expl_ml, S_expl_bl],
    [S_expl_tc, S_expl_mc, S_expl_bc],
    [S_expl_tr, S_expl_mr, S_expl_br],
];
/* C explode.c:17-22 enum explode_action. */
const EXPL_NO_ACTION = 0, EXPL_MON = 1, EXPL_HERO = 2, EXPL_SKIP = 4;
/* C display.h:527 GLYPH_EXPLODE_DARK_OFF — js/glyphs.js:74 carries the same
 * 7157 as the base of the explosion glyph block. */
const GLYPH_EXPLODE_DARK_OFF = 7157;

/* C youprop.h Deaf — (HDeaf || EDeaf). */
function _expl_deaf() {
    const p = game.u?.uprops?.[DEAF];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
/* C youprop.h:73 Invulnerable — u.uprops[INVULNERABLE].intrinsic. */
function _expl_invulnerable() {
    return !!(game.u?.uprops?.[INVULNERABLE]?.intrinsic | 0);
}
/* C decl.h svc.context.mon_moving — TRUE while movemon() is running.  Same
 * spelling js/cmd.js:4003 reads. */
function _expl_mon_moving() {
    return !!(game.context && game.context.mon_moving);
}

/* C display.h:586-592 explosion_to_glyph(expltyp, idx).  The ternary chain
 * selects GLYPH_EXPLODE_<TYPE>_OFF; display.h:527-534 makes those enum values
 * consecutive multiples of MAXEXPCHARS from the DARK base in EXPL_* order, and
 * every type the chain does not name falls through to EXPL_FIERY. */
function explosion_to_glyph(expltyp, idx) {
    const t = (expltyp >= EXPL_DARK && expltyp <= EXPL_FROSTY) ? expltyp : EXPL_FIERY;
    return (idx - S_expl_tl) + GLYPH_EXPLODE_DARK_OFF + MAXEXPCHARS * t;
}

/* C explode.c:26-113 explosionmask(m, adtyp, olet) — does this target need a
 * shield-effect flash?  AD_PHYS is the FIRST case on both the hero side and the
 * monster side and it leaves the result at EXPL_NONE, which is why a gas spore
 * blast has no shield animation and why hero and monster both take FULL damage
 * (the EXPL_HERO / EXPL_MON bits are exactly what divert to the items-only and
 * golemeffects arms further down).  The other arms read hero properties and
 * monster mresists; unreachable from mon_explodes' gas-spore call. */
/* C youprop.h:26-51 the hero-side *_resistance macros explosionmask's hero
 * switch reads DIRECTLY — u.uprops[propidx].intrinsic || .extrinsic, with NO
 * further artifact/worn-item scan (unlike Resists_Elem, which the MONSTER
 * side of this same switch calls and which DOES walk wielded/worn items).
 * Porting the hero arm with Resists_Elem(youmonst, ...) would be a DIFFERENT,
 * broader check than C's — a real behavioural divergence, not a shortcut. */
function _expl_hero_resist(propidx) {
    const p = game.u?.uprops?.[propidx];
    return !!((p?.intrinsic | 0) || (p?.extrinsic | 0));
}
/* C monst.h:217-219 is_vampshifter(mon) — mon->cham is one of the three
 * vampire-form indices.  PM_VAMPIRE_LEADER is 5.0's name for the monster
 * js/pm.generated.js still exports as PM_VAMPIRE_LORD (3.7 spelling, same
 * numeric index 227) — inlined here rather than importing the mis-named
 * symbol. mon.cham defaults to -1 (NON_PM) when unset, never matching. */
function _expl_is_vampshifter(mon) {
    const PM_VAMPIRE_ZAP = 226, PM_VAMPIRE_LEADER_ZAP = 227, PM_VLAD_ZAP = 228;
    const cham = mon ? (mon.cham | 0) : -1;
    return cham === PM_VAMPIRE_ZAP || cham === PM_VAMPIRE_LEADER_ZAP
        || cham === PM_VLAD_ZAP;
}
/* C explode.c:26-113 explosionmask(m, adtyp, olet) — does this target need a
 * shield-effect flash?  Two parallel switches (hero vs monster) on the same
 * adtyp values; the hero arm reads the plain *_resistance macros (uprops
 * only), the monster arm calls the full resists_*(m) family (uprops +
 * mon_resistancebits + wielded-artifact + worn/carried items).  NO RNG on
 * either side. */
function explosionmask(m, adtyp, olet) {
    const is_you = is_youmonst(m);
    if (is_you) {
        switch (adtyp) {
        case AD_PHYS:
            return EXPL_NO_ACTION; /* C explode.c:33-36 */
        case AD_MAGM:
            return _cm_Antimagic() ? EXPL_HERO : EXPL_NO_ACTION;
        case AD_FIRE:
            return _expl_hero_resist(FIRE_RES) ? EXPL_HERO : EXPL_NO_ACTION;
        case AD_COLD:
            return _expl_hero_resist(COLD_RES) ? EXPL_HERO : EXPL_NO_ACTION;
        case AD_DISN: {
            const md = m ? m.data : null;
            const hit = (olet === WAND_CLASS)
                ? (nonliving(md) || is_demon(md))
                : _expl_hero_resist(DISINT_RES);
            return hit ? EXPL_HERO : EXPL_NO_ACTION;
        }
        case AD_ELEC:
            return _expl_hero_resist(SHOCK_RES) ? EXPL_HERO : EXPL_NO_ACTION;
        case AD_DRST:
            return _expl_hero_resist(POISON_RES) ? EXPL_HERO : EXPL_NO_ACTION;
        case AD_ACID:
            return _expl_hero_resist(ACID_RES) ? EXPL_HERO : EXPL_NO_ACTION;
        default:
            /* C: impossible("explosion type %d?", adtyp); res stays EXPL_NONE. */
            return EXPL_NO_ACTION;
        }
    } else {
        switch (adtyp) {
        case AD_PHYS:
            return EXPL_NO_ACTION; /* C explode.c:75-76 */
        case AD_MAGM:
            return resists_magm(m) ? EXPL_MON : EXPL_NO_ACTION;
        case AD_FIRE:
            return Resists_Elem(m, FIRE_RES) ? EXPL_MON : EXPL_NO_ACTION;
        case AD_COLD:
            return Resists_Elem(m, COLD_RES) ? EXPL_MON : EXPL_NO_ACTION;
        case AD_DISN: {
            const md = m ? m.data : null;
            const hit = (olet === WAND_CLASS)
                ? (nonliving(md) || is_demon(md) || _expl_is_vampshifter(m))
                : !!Resists_Elem(m, DISINT_RES);
            return hit ? EXPL_MON : EXPL_NO_ACTION;
        }
        case AD_ELEC:
            return Resists_Elem(m, SHOCK_RES) ? EXPL_MON : EXPL_NO_ACTION;
        case AD_DRST:
            return Resists_Elem(m, POISON_RES) ? EXPL_MON : EXPL_NO_ACTION;
        case AD_ACID:
            return Resists_Elem(m, ACID_RES) ? EXPL_MON : EXPL_NO_ACTION;
        default:
            return EXPL_NO_ACTION;
        }
    }
}

/* C explode.c:986-1012 adtyp_to_expltype(adtyp) — damage type to the explosion
 * type that colours the blast glyphs. */
export function adtyp_to_expltype(adtyp) {
    switch (adtyp) {
    case AD_ELEC: /* "Electricity isn't magical ... Magical is the next best" */
    case AD_SPEL:
    case AD_DREN:
    case AD_ENCH:
        return EXPL_MAGICAL;
    case AD_FIRE:
        return EXPL_FIERY;
    case AD_COLD:
        return EXPL_FROSTY;
    case AD_DRST:
    case AD_DRDX:
    case AD_DRCO:
    case AD_DISE:
    case AD_PEST:
    case AD_PHYS: /* gas spore */
        return EXPL_NOXIOUS;
    default:
        /* C: impossible("adtyp_to_expltype: bad explosion type %d", adtyp) */
        return EXPL_FIERY;
    }
}

/* C monst.h:92-93 monst{,un}seesu_ad(adtyp) — record/forget that onlookers saw
 * the hero resist this damage type.  mondata.c:1522-1536 maps AD_PHYS to
 * M_SEEN_NOTHING, and mondata.c:1562/1576 return immediately on M_SEEN_NOTHING,
 * so a gas-spore blast records nothing.  RNG-free for every adtyp; the
 * per-monster seen_resistance bitfield the other types touch is not modelled. */
function _expl_monstseesu_ad(adtyp, saw_resist) {
    void adtyp; void saw_resist;
}

/* C you.h:315-316 uhim()/uhis() — the objective/possessive pronoun for the
 * hero, used only to build a killer string ("caught himself in his own
 * fireball").  RNG-free (genders[] is a fixed table keyed off flags.female);
 * js/spell.js carries an unexported same-shape helper (uhim_spell) for its
 * own killer string, not reused across files per that file's own comment. */
function _expl_uhim() {
    return game.flags?.female ? 'her' : 'him';
}
function _expl_uhis() {
    return game.flags?.female ? 'her' : 'his';
}

/* C timeout.c:447-452 burn_away_slime(void):
 *     if (Slimed) make_slimed(0L, "The slime that covers you is burned away!");
 * RNG-free.  js/mcastu.js also exports a function of this name, but it is a
 * throwing stub ('not yet ported: burn_away_slime') — explode()'s AD_FIRE
 * hero-in-blast tail (explode.c:605-606) needs the real body, so it is ported
 * here (this file's own local helper) rather than routed through that stub. */
async function _zp_burn_away_slime() {
    const p = game.u?.uprops?.[SLIMED];
    if ((p?.intrinsic | 0) || (p?.extrinsic | 0))
        await make_slimed(0, 'The slime that covers you is burned away!');
}

/* C mondata.h:71 digests(ptr) — dmgtype_fromattack(ptr, AD_DGST, AT_ENGL) != 0.
 * `ptr` is engulfer_explosion_msg's u.ustuck->data; this port has no permonst
 * record separate from the live monster, so it reads mndx off the monster and
 * shares the per-mndx MON_MATTK table via mon_mattk_raw() (js/mhitu.js) —
 * the same table js/mhitu.js:5490's file-local, unexported digests_gu()
 * reads, not a duplicate copy of that data. */
function _expl_digests(mon) {
    const mndx = (mon && (mon.mndx ?? mon.mnum)) | 0;
    const attks = mon_mattk_raw(mndx);
    if (!attks) return false;
    for (const a of attks) {
        if (a && (a[0] | 0) === AT_ENGL && (a[1] | 0) === AD_DGST) return true;
    }
    return false;
}

/* C explode.c:117-179 engulfer_explosion_msg(adtyp, olet).  Called only when
 * the current target IS u.ustuck (engulfing_u(mtmp) at the call site), so it
 * reads u.ustuck directly, matching C's use of the global. */
async function _expl_engulfer_msg(adtyp, olet) {
    const u = game.u || {};
    let adj;
    if (_expl_digests(u.ustuck)) {
        switch (adtyp) {
        case AD_FIRE: adj = 'heartburn'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = (olet === WAND_CLASS) ? 'irradiated by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'poisoned'; break;
        case AD_ACID: adj = 'an upset stomach'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(u.ustuck)} gets ${adj}!`);
    } else {
        switch (adtyp) {
        case AD_FIRE: adj = 'toasted'; break;
        case AD_COLD: adj = 'chilly'; break;
        case AD_DISN:
            adj = (olet === WAND_CLASS) ? 'overwhelmed by pure energy' : 'perforated';
            break;
        case AD_ELEC: adj = 'shocked'; break;
        case AD_DRST: adj = 'intoxicated'; break;
        case AD_ACID: adj = 'burned'; break;
        default: adj = 'fried'; break;
        }
        await pline(`${Monnam(u.ustuck)} gets slightly ${adj}!`);
    }
}

/* C explode.c:199-716 explode(x, y, type, dam, olet, expltype). */
export async function explode(x, y, type, dam, olet, expltype) {
    let i, j, damu = dam;
    let starting = true;
    let visible = false, any_shield = false;
    let uhurt = 0; /* 0=unhurt, 1=items damaged, 2=you and items damaged */
    let str = null;
    let mtmp, mdef = null;
    let adtyp;
    const explmask = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    let xx, yy;
    const expl_shopdamage = { v: false }; /* C explode.c:216 `boolean shopdamage` */
    let generic = false, do_hallu = false;
    let exploding_wand_typ = 0;
    const you_exploding = (olet === MON_EXPLODE && type >= 0);
    let didmsg = false;
    const u = game.u || {};

    /* C explode.c:224-262 — the olet dispatch. */
    if (olet === WAND_CLASS) {
        if (type < 0) {
            type = -type;
            exploding_wand_typ = type;
            /* C explode.c:230-238 — most attack wands produce their own
               specific explosion type; WAN_DIGGING and WAN_SLEEP are RAY
               too but have no explosion slot of their own, so they (and
               every non-RAY wand: light, detect, create monster, wishing,
               stasis, ...) fall back to the generic magical explosion. */
            if (oc_dir_of(type) === RAY && type !== WAN_DIGGING && type !== WAN_SLEEP) {
                type -= WAN_MAGIC_MISSILE;
                if (type < 0 || type > 9) {
                    /* C explode.c:236-237: impossible("explode: wand has bad
                       zap type (%d).", type); type = 0. No known wand otyp
                       can reach this (verified: every RAY wand's otyp - 429
                       lands in 0..9), so this is a defensive no-op mirror. */
                    type = 0;
                }
            } else {
                type = 0;
            }
        }
        /* C explode.c:242-251 — the hero's own share of the blast (damu) is
           quintered for the three "smart" caster roles, halved for the two
           physically-hardy ones, and untouched otherwise.  `dam` itself
           (everything else caught in the blast) is never touched. */
        if (_wand_Role_if(PM_CLERIC_ZAP) || _wand_Role_if(PM_MONK) || _wand_Role_if(PM_WIZARD)) {
            damu = Math.trunc(damu / 5);
        } else if (_wand_Role_if(PM_HEALER) || _wand_Role_if(PM_KNIGHT)) {
            damu = Math.trunc(damu / 2);
        }
    } else if (olet === BURNING_OIL) {
        exploding_wand_typ = POT_OIL;
    } else if (olet === SCROLL_CLASS) {
        exploding_wand_typ = SCR_FIRE;
    } else if (olet === TRAP_EXPLODE) {
        type = 0; /* hardcoded to generic magic explosion */
    }
    /* C explode.c:263-267 — muse_unslime passes a negative expltype meaning
       "hero gets credit/blame for killing THIS monster, not the others". */
    if (expltype < 0) {
        mdef = m_at(x, y);
        expltype = -expltype;
    }
    /* C explode.c:268-270 */
    const inside_engulfer = (!!u.uswallow && type >= 0);
    /* C explode.c:271-284 — a grabber reaching into the blast takes double. */
    let grabbed = false, grabbing = false;
    const grabxy = { x: 0, y: 0 };
    if (u.ustuck && !u.uswallow) {
        if (Upolyd(u) && sticks(game.youmonst?.data))
            grabbing = true;
        else
            grabbed = true;
        grabxy.x = u.ustuck.mx | 0;
        grabxy.y = u.ustuck.my | 0;
    }

    /* C explode.c:296-303 — a recursive explode() can overwrite svk.killer.name,
       so keep a copy; do_hallu re-rolls the blamed species per target. */
    if (olet === MON_EXPLODE && !you_exploding) {
        str = String(game.svk?.killer?.name || '');
        do_hallu = (_Halluc()
                    && (str.indexOf("'s explosion") >= 0
                        || str.indexOf("s' explosion") >= 0));
    }
    if (type === PHYS_EXPL_TYPE) {
        adtyp = AD_PHYS; /* C explode.c:304-307 — currently only gas spores */
    } else {
        /* C explode.c:308-347 — the abs(type)%10 adstr/adtyp table.  If `str` is
           e.g. "flaming sphere's explosion" from the MON_EXPLODE copy above we
           still assign adtyp, but do not replace str. */
        let adstr = null;

        switch (Math.abs(type) % 10) {
        case 0:
            adstr = 'magical blast';
            adtyp = AD_MAGM;
            break;
        case 1:
            adstr = (olet === BURNING_OIL) ? 'burning oil'
                    : (olet === SCROLL_CLASS) ? 'tower of flame' : 'fireball';
            adtyp = AD_FIRE; /* fire damage, not physical damage */
            break;
        case 2:
            adstr = 'ball of cold';
            adtyp = AD_COLD;
            break;
        case 4:
            adstr = (olet === WAND_CLASS) ? 'death field' : 'disintegration field';
            adtyp = AD_DISN;
            break;
        case 5:
            adstr = 'ball of lightning';
            adtyp = AD_ELEC;
            break;
        case 6:
            adstr = 'poison gas cloud';
            adtyp = AD_DRST;
            break;
        case 7:
            adstr = 'splash of acid';
            adtyp = AD_ACID;
            break;
        default:
            return;
        }
        if (!str)
            str = adstr;
    }

    /* C explode.c:349-379 — the 3x3 mask pass. */
    for (i = 0; i < 3; i++)
        for (j = 0; j < 3; j++) {
            xx = x + i - 1;
            yy = y + j - 1;
            if (!isok(xx, yy)) {
                explmask[i][j] = EXPL_SKIP;
                continue;
            }
            explmask[i][j] = EXPL_NO_ACTION;

            if (u_at(xx, yy))
                explmask[i][j] = explosionmask(game.youmonst, adtyp, olet);
            /* can be both you and mtmp if you're swallowed or riding */
            mtmp = m_at(xx, yy);
            if (!mtmp && u_at(xx, yy))
                mtmp = u.usteed;
            if (mtmp && DEADMONSTER(mtmp))
                mtmp = null;
            if (mtmp)
                explmask[i][j] |= explosionmask(mtmp, adtyp, olet);

            if (mtmp && cansee(xx, yy) && !canspotmon(mtmp))
                map_invisible(xx, yy);
            else if (!mtmp)
                unmap_invisible(xx, yy);
            if (cansee(xx, yy))
                visible = true;
            if ((explmask[i][j] & (EXPL_MON | EXPL_HERO)) !== 0)
                any_shield = true;
        }

    if (visible) {
        /* C explode.c:381-393 — start the explosion.  The DISP_BEAM run records
           every covered square and the DISP_END below newsym()s each one back;
           that erase pass is what repaints the exploded monster's square before
           the pline that follows can page. */
        for (i = 0; i < 3; i++)
            for (j = 0; j < 3; j++) {
                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                tmp_at(starting ? DISP_BEAM : DISP_CHANGE,
                       explosion_to_glyph(expltype, _explosion_cmap[i][j]));
                tmp_at(xx, yy);
                starting = false;
            }

        if (any_shield && game.flags?.sparkle) {
            /* C explode.c:396-425 — the SHIELD_COUNT shield-flash loop, entered
               only when some target RESISTED.  The AD_PHYS mask never sets a
               shield bit, so a gas spore cannot reach it. */
            shieldeff_real(x, y);
        }
        /* C explode.c:427-430 else: two nh_delay_output() calls — pure pacing. */

        tmp_at(DISP_END, 0); /* clear the explosion */
    } else {
        /* C explode.c:432-442 */
        if (olet === MON_EXPLODE || olet === TRAP_EXPLODE) {
            str = 'explosion';
            generic = true;
        }
        if (!_expl_deaf() && olet !== SCROLL_CLASS) {
            await pline('You hear a blast.');
            didmsg = true;
        }
    }

    if (!_expl_deaf() && !didmsg)
        await pline('Boom!'); /* C explode.c:444-445 */

    if (dam) {
        for (i = 0; i < 3; i++) {
            for (j = 0; j < 3; j++) {
                let itemdmg = 0;

                if (explmask[i][j] === EXPL_SKIP)
                    continue;
                xx = x + i - 1;
                yy = y + j - 1;
                if (u_at(xx, yy)) {
                    uhurt = ((explmask[i][j] & EXPL_HERO) !== 0) ? 1 : 2;
                    /* a poly'd hero attacking INTO its own explosion attack
                       keeps its skin and its gear (C explode.c:461-467) */
                    if (!_expl_mon_moving() && you_exploding)
                        uhurt = 0;
                } else if (inside_engulfer) {
                    continue; /* only <u.ux,u.uy> is affected */
                }

                if (!(u.uswallow && !_expl_mon_moving()))
                    await zap_over_floor(xx, yy, type, expl_shopdamage, false,
                                         exploding_wand_typ);

                mtmp = m_at(xx, yy);
                if (!mtmp && u_at(xx, yy))
                    mtmp = u.usteed;
                if (!mtmp)
                    continue;
                if (do_hallu) {
                    /* C explode.c:489-503 — a fresh rndmonnam() per target, and
                       rndmonnam DRAWS (display rng), so this is a named stop,
                       not a skip.  "we can't distinguish personal names like
                       'Barney' here in order to suppress 'the' below, so avoid
                       any which begins with a capital letter" — retry up to 20
                       draws for a lowercase-first result. */
                    let hallu_buf, tryct = 0;
                    do {
                        hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                    } while (hallu_buf[0] !== lowc(hallu_buf[0]) && ++tryct < 20);
                    str = hallu_buf;
                }
                if (engulfing_u(mtmp)) {
                    /* C explode.c:504-505 engulfer_explosion_msg */
                    await _expl_engulfer_msg(adtyp, olet);
                } else if (cansee(xx, yy)) {
                    if (M_AP_TYPE(mtmp)) {
                        /* C explode.c:506-507 seemimic(mtmp) */
                        seemimic(mtmp);
                    }
                    await pline(`${Monnam(mtmp)} is caught in the ${str}!`);
                }

                itemdmg = (await destroy_items_mon(mtmp, adtyp, dam));
                if (adtyp === AD_FIRE) {
                    await burnarmor(mtmp);
                    await ignite_items(mtmp.minvent);
                }

                if ((explmask[i][j] & EXPL_MON) !== 0) {
                    /* C explode.c:512-526 — the target resisted: only item
                       destruction damage lands, plus the golem effect. Damage
                       from a ring/wand/potion explosion isn't itself of the
                       "same type" as the explosion, so C ignores that for
                       golemeffects() and mixes in the item-destruction damage
                       directly below (imperfect and marginal per its own
                       comment; ported as-is). */
                    await _expl_golemeffects(mtmp, adtyp, dam);
                    mtmp.mhp = (mtmp.mhp | 0) - itemdmg;
                } else {
                    /* C explode.c:527-552 — resist() called with damage 0 so the
                       message can precede the damage and so mondied() (not
                       killed()) can be used when the blast is not the hero's. */
                    let mdam = dam;

                    if (await resist(mtmp, olet, 0, false)) {
                        if (cansee(xx, yy) || inside_engulfer)
                            await pline(`${Monnam(mtmp)} resists the ${str}!`);
                        mdam = Math.trunc((mdam + 1) / 2);
                    }
                    if (grabbed && mtmp === u.ustuck && dist2(x, y, u.ux | 0, u.uy | 0) <= 2)
                        mdam *= 2;
                    /* C explode.c:545-551 — being resistant to the OPPOSITE
                       type of damage makes the target MORE vulnerable to the
                       current type (when the target also resists the
                       current type, explmask[i][j] already routed it to the
                       golemeffects arm above and this branch is never
                       reached, matching C's own parenthetical). RNG-free:
                       Resists_Elem walks uprops + mon_resistancebits +
                       artifact/worn items, no draws. */
                    if (Resists_Elem(mtmp, COLD_RES) && adtyp === AD_FIRE)
                        mdam *= 2;
                    else if (Resists_Elem(mtmp, FIRE_RES) && adtyp === AD_COLD)
                        mdam *= 2;
                    mtmp.mhp = (mtmp.mhp | 0) - (mdam + itemdmg);
                }
                if (DEADMONSTER(mtmp)) {
                    const xkflg = 0;

                    if (!_expl_mon_moving()) {
                        await xkilled(mtmp, XKILL_GIVEMSG | xkflg);
                    } else if (mdef && mtmp === mdef) {
                        if (cansee(mtmp.mx | 0, mtmp.my | 0) || canspotmon(mtmp))
                            await pline(`${Monnam(mtmp)} is ${nonlivingMon((mtmp.mndx ?? mtmp.mnum) | 0) ? 'destroyed' : 'killed'}!`);
                        await xkilled(mtmp, XKILL_NOMSG | XKILL_NOCONDUCT | xkflg);
                    } else {
                        /* C: monkilled(mtmp, "", adtyp).  monkilled is unported;
                           monkilled_trap is this tree's monster-death-without-
                           hero-credit body, and is where resist() already routes
                           C's monkilled(mtmp, "", AD_RBRE). */
                        await monkilled_trap(mtmp);
                    }
                } else if (!_expl_mon_moving()) {
                    await setmangry(mtmp, true); /* C explode.c:581-584 */
                }
            }
        }
    }

    /* C explode.c:589-679 — "Do your injury last". */
    if (uhurt) {
        if (game.flags?.verbose && (type < 0 || olet !== SCROLL_CLASS)) {
            if (do_hallu) {
                /* C explode.c:592-596 — same rndmonnam retry, but unbounded
                   (no tryct cap) for the hero's own explosion message. */
                let hallu_buf;
                do {
                    hallu_buf = `${s_suffix(rndmonnam())} explosion`;
                } while (hallu_buf[0] !== lowc(hallu_buf[0]));
                str = hallu_buf;
            }
            await pline(`You are caught in the ${str}!`);
            if (game.iflags) game.iflags.last_msg = PLNMSG_CAUGHT_IN_EXPLOSION;
        }
        /* property damage first, in case we end up leaving bones */
        if (adtyp === AD_FIRE)
            await _zp_burn_away_slime();
        if (_expl_invulnerable()) {
            damu = 0;
            await pline('You are unharmed!');
        } else if (adtyp === AD_PHYS || adtyp === AD_ACID) {
            /* C hack.h Maybe_Half_Phys(dmg).  Half_physical_damage is not a
               property this port writes; js/uhitm.js reads the same spelling. */
            if (game.u?.uprops?.[_ZAP_HALF_PHDAM]
                && ((game.u.uprops[_ZAP_HALF_PHDAM].intrinsic | 0)
                    || (game.u.uprops[_ZAP_HALF_PHDAM].extrinsic | 0)))
                damu = Math.trunc((damu + 1) / 2);
        }
        if (adtyp === AD_FIRE) {
            await burnarmor(game.youmonst);
            await ignite_items(game.invent);
        }
        await destroy_items(true, adtyp, dam);

        ugolemeffects(adtyp, damu);
        if (uhurt === 2) {
            /* a poly'd hero grabbing another victim takes double damage */
            if (grabbing && dist2(grabxy.x, grabxy.y, x, y) <= 2)
                damu *= 2;
            if (Upolyd(u))
                u.mh = (u.mh | 0) - damu;
            else
                u.uhp = (u.uhp | 0) - damu;
            if (game.disp) game.disp.botl = 1;
        }

        /* "You resisted the damage, lets not keep that to ourselves" */
        _expl_monstseesu_ad(adtyp, uhurt === 1);

        if ((u.uhp | 0) <= 0 || (Upolyd(u) && (u.mh | 0) <= 0)) {
            if (Upolyd(u)) {
                await rehumanize_real();
            } else {
                if (olet === MON_EXPLODE) {
                    /* generic: the blast was unseen, so str=="explosion" while
                       svk.killer.name is still "<mon>'s explosion" */
                    if (!generic && game.svk?.killer)
                        game.svk.killer.name = str;
                    if (game.svk?.killer)
                        game.svk.killer.format = KILLED_BY_AN;
                } else if (olet === TRAP_EXPLODE) {
                    /* C explode.c:643-646. */
                    if (game.svk?.killer) {
                        game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
                        game.svk.killer.name = `caught ${_expl_uhim()}self in a ${str}`;
                    }
                } else if (type >= 0 && olet !== SCROLL_CLASS) {
                    /* C explode.c:647-650 — WAND_CLASS retributive strike (and
                       any other olet reaching here with a non-negative,
                       already-converted type) blames the hero's own device. */
                    if (game.svk?.killer) {
                        game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
                        game.svk.killer.name =
                            `caught ${_expl_uhim()}self in ${_expl_uhis()} own ${str}`;
                    }
                } else {
                    /* C explode.c:651-657 — BURNING_OIL, SCROLL_CLASS, or a
                       negative `type` (a monster-thrown wand/breath) not
                       already covered above. */
                    const strLower = String(str).toLowerCase();
                    if (game.svk?.killer) {
                        game.svk.killer.format =
                            (strLower === 'tower of flame' || strLower === 'fireball')
                                ? KILLED_BY_AN : KILLED_BY;
                        game.svk.killer.name = str;
                    }
                }
                if (game.iflags?.last_msg === PLNMSG_CAUGHT_IN_EXPLOSION
                    || game.iflags?.last_msg === PLNMSG_TOWER_OF_FLAME)
                    await pline('It is fatal.');
                else
                    await pline(`The ${str} is fatal.`);
                /* If the fatal line overflowed the destruction message, C is
                 * blocked inside this pline before entering done().  Page that
                 * older line now; the fatal line left behind is freshly drawn
                 * and must be allowed to join done()'s lifesaving text. */
                let _deathRemainderFresh = false;
                if (_topline_more_pending()) {
                    await flush_screen(1);
                    _deathRemainderFresh = true;
                }
                /* C explode.c:675 `done((adtyp == AD_FIRE) ? BURNING : DIED)` —
                 * this port had hard-coded DIED, missing the AD_FIRE arm. */
                const _deathBeforeExpl = game._pendingDeath || null;
                /* C explode.c:674-675 reaches done() directly after the
                 * source-specific "It is fatal." / "The ... is fatal."
                 * line.  It does not pass through done_in_by() or losehp(),
                 * so there is no additional "You die..." message.  Mark that
                 * distinction explicitly for the shared death driver; the
                 * manufactured extra page otherwise consumes the keystrokes
                 * C uses for the wizard-mode "Die?" query. */
                deadhero((adtyp === AD_FIRE) ? 5 /* BURNING */ : 0 /* DIED */,
                         { noDeathLine: true,
                           remainderIsFresh: _deathRemainderFresh });
                if (game._pendingDeath && game._pendingDeath !== _deathBeforeExpl)
                    await drain_pending_death_in_place();
                if (pending_death_is_final())
                    return;
            }
        }
        exercise(A_STR, false);
    }

    if (expl_shopdamage.v)
        await pay_for_damage('destroy', false);

    /* C explode.c:707-715 — explosions are noisy. */
    let noise = dam * dam;
    if (noise < 50)
        noise = 50; /* in case random damage is very small */
    if (inside_engulfer)
        noise = Math.trunc((noise + 3) / 4);
    wake_nearto(x, y, noise);
}

/* C mon.c:5678-5704 golemeffects(struct monst *mon, int damtype, int dam) —
 * "damage type X heals/slows this specific golem breed"; RNG-free. Called
 * from explode()'s resisted-monster arm (explode.c:525) and from three
 * mhitm.js sites (magr taking its own elemental damage back); this port is
 * local to zap.js's one call site rather than sharing js/uhitm.js's
 * `golemeffects` no-op stub, which nothing here imports. */
async function _expl_golemeffects(mon, damtype, dam) {
    let heal = 0, slow = false;
    const pmidx = mon.data ? (mon.data.pmidx | 0) : -1;

    if (pmidx === PM_FLESH_GOLEM) {
        if (damtype === AD_ELEC)
            heal = Math.trunc(((dam | 0) + 5) / 6);
        else if (damtype === AD_FIRE || damtype === AD_COLD)
            slow = true;
    } else if (pmidx === PM_IRON_GOLEM) {
        if (damtype === AD_ELEC)
            slow = true;
        else if (damtype === AD_FIRE)
            heal = dam | 0;
    } else {
        return;
    }
    if (slow) {
        if ((mon.mspeed | 0) !== MSLOW)
            mon_adjust_speed(mon, -1, null);
    }
    if (heal) {
        if (healmon(mon, heal, 0)) {
            if (cansee(mon.mx | 0, mon.my | 0))
                await pline(`${Monnam(mon)} seems healthier.`);
        }
    }
}

/* C explode.c:960-967 splatter_burning_oil(coordxy x, coordxy y, boolean
 * diluted_oil):
 *     int dmg = d(diluted_oil ? 3 : 4, 4);
 *     explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
 * ZT_SPELL(ZT_FIRE) = ZT_SPELL(AD_FIRE-1) = 10+(2-1) = 11 — explode.c's own
 * comment kludges the value directly rather than importing the zap.c macro,
 * so this port does the same. Exported: js/potion.js's potionhit (POT_OIL,
 * isyou arm) is the second call site alongside dothrow's break path. */
const ZT_SPELL_O_FIRE = 11;
export async function splatter_burning_oil(x, y, diluted_oil) {
    const dmg = d(diluted_oil ? 3 : 4, 4);
    await explode(x, y, ZT_SPELL_O_FIRE, dmg, BURNING_OIL, EXPL_FIERY);
}

/* C explode.c:970-979 explode_oil(struct obj *obj, coordxy x, coordxy y) —
 * "lit potion of oil is exploding; extinguish it as a light source before
 * possibly killing the hero and attempting to save bones":
 *     boolean diluted_oil = obj->odiluted;
 *     if (!obj->lamplit) impossible("exploding unlit oil");
 *     end_burn(obj, TRUE);
 *     obj->how_lost = LOST_EXPLODING;
 *     splatter_burning_oil(x, y, diluted_oil);
 * Both call sites (potionhit's isyou arm, potion.c:1684; dothrow's breakobj
 * POT_OIL arm, dothrow.c:2500-2501) already check obj->lamplit before
 * calling, so the impossible() guard is C-unreachable from js/ and is not
 * ported (matches this file's own convention for unreachable impossible()s
 * elsewhere). */
export async function explode_oil(obj, x, y) {
    const diluted_oil = !!obj.odiluted;
    end_burn(obj, true);
    obj.how_lost = LOST_EXPLODING;
    await splatter_burning_oil(x, y, diluted_oil);
}

/* C explode.c:1013-1067 mon_explodes(mon, mattk) — "a monster explodes in a way
 * that produces a real explosion (e.g. a sphere or gas spore, not a yellow
 * light or similar)".  `mattk` is one permonst mattk row: {aatyp, adtyp, damn,
 * damd}, as js/makemon_mattk.json stores it. */
export async function mon_explodes(mon, mattk) {
    let dmg, type;

    if (mattk.damn)
        dmg = d(mattk.damn | 0, mattk.damd | 0);        /* C explode.c:1025-1026 */
    else if (mattk.damd)
        dmg = d((mon.data?.mlevel | 0) + 1, mattk.damd | 0);
    else
        dmg = 0;

    if ((mattk.adtyp | 0) === AD_PHYS) {
        type = PHYS_EXPL_TYPE;
    } else if ((mattk.adtyp | 0) >= AD_MAGM && (mattk.adtyp | 0) <= AD_SPC2) {
        /* C explode.c:1036-1040 — the -1,+20,*-1 math sets it up as a 'monster
           breath' type for the explosions. */
        type = -(((mattk.adtyp | 0) - 1) + 20);
    } else {
        /* C: impossible("unknown type for mon_explode %d", adtyp); return; */
        return;
    }

    /* C explode.c:1046-1051 — kill it now so it won't appear to be caught in its
       own explosion.  Already dead when this arrives from an AT_BOOM attack upon
       death, which is corpse_chance()'s caller. */
    if (!DEADMONSTER(mon))
        await mondead_zap(mon);

    /* C explode.c:1053-1058 — killer name; explode() also prints it. */
    if (!game.svk) game.svk = {};
    if (!game.svk.killer)
        game.svk.killer = { id: 0, format: 0, name: '', next: null };
    game.svk.killer.name =
        s_suffix(monPmname((mon.mndx ?? mon.mnum) | 0, mon.female ? FEMALE : MALE))
        + ' explosion';
    game.svk.killer.format = KILLED_BY_AN;

    await explode(mon.mx | 0, mon.my | 0, type, dmg, MON_EXPLODE,
                  adtyp_to_expltype(mattk.adtyp | 0));

    game.svk.killer.name = ''; /* C explode.c:1066 — reset killer */
}
const _zhitm_disint_armor = new WeakMap();
export async function _zhitm(mon, type, nd) {
    const damgtype = zaptype(type) % 10;
    const spellcaster = is_hero_spell(type);
    let tmp = 0, orig_dmg = 0;
    let sho_shieldeff = false; /* C zap.c:4246 */

    /* zhitm() hands the caller a second result (ootmp) for the disintegration
     * breath arm.  Keep that result out of the replay schema while preserving
     * the C call order: _buzz_hit_monster consumes it immediately after this
     * function returns. */
    _zhitm_disint_armor.delete(mon);

    switch (damgtype) {
    case ZT_MAGIC_MISSILE:
        /* C zap.c:4247-4250 — resists_magm/defended: no damage, no draw. */
        if (resists_magm(mon) || defended(mon, AD_MAGM)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster) tmp = spell_damage_bonus(tmp);
        break;
    case ZT_FIRE:
        /* C zap.c:4261-4264 — a fire-resistant target takes NO damage and, more
         * importantly, draws NOTHING: the d(nd,6)/burnarmor/rn2(3) below are all
         * inside the non-resistant arm. */
        if (_resists_elem_zap(mon, MR_FIRE_ZAP)) {
            tmp = 0;
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster) tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp;
        if (_resists_elem_zap(mon, MR_COLD_ZAP)) tmp += 7;
        if (await burnarmor(mon)) {
            if (!rn2(3)) {
                tmp += (await destroy_items_mon(mon, AD_FIRE, orig_dmg));
                await ignite_items(mon.minvent || null);
            }
        }
        break;
    case ZT_COLD:
        /* C zap.c:4279-4282 — a cold-resistant target takes NO damage and
         * draws NOTHING (d(nd,6), d(nd,3) and the rn2(3) are all past the
         * guard).  Missing guard made a breath ray at an ettin zombie draw
         * d(2,6) where C went straight on to the next square. */
        if (_resists_elem_zap(mon, MR_COLD_ZAP) || defended(mon, AD_COLD)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (spellcaster) tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp;
        if (_resists_elem_zap(mon, MR_FIRE_ZAP)) tmp += d(nd, 3);
        if (!rn2(3)) tmp += (await destroy_items_mon(mon, AD_COLD, orig_dmg));
        break;
    case ZT_LIGHTNING:
        tmp = d(nd, 6);
        if (spellcaster) tmp = spell_damage_bonus(tmp);
        orig_dmg = tmp;
        /* resists_elec(mon)/defended → sho_shieldeff, tmp=0 (deferred). */
        /* C zap.c:4345-4355: sufficiently powerful lightning blinds the monster.
         *   if (!resists_blnd(mon) && !(type>0 && engulfing_u(mon)) && nd > 2)
         *       rnd_tmp = rnd(50); mcansee=0; mblinded += rnd_tmp (cap 127). */
        if (nd > 2) {
            const rnd_tmp = rnd(50);
            mon.mcansee = 0;
            const mb = (mon.mblinded | 0) + rnd_tmp;
            mon.mblinded = (mb > 127) ? 127 : mb;
        }
        if (!rn2(3)) tmp += (await destroy_items_mon(mon, AD_ELEC, orig_dmg));
        break;
    case ZT_POISON_GAS:
        /* C zap.c:4358-4362 */
        if (_resists_elem_zap(mon, 0x20 /* MR_POISON */) || defended(mon, AD_DRST)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        break;
    case ZT_ACID:
        /* C zap.c:4364-4368 */
        if (_resists_elem_zap(mon, 0x40 /* MR_ACID */) || defended(mon, AD_ACID)) {
            sho_shieldeff = true;
            break;
        }
        tmp = d(nd, 6);
        if (!rn2(6)) { /* acid_damage(MON_WEP(mon)) — no wep, no RNG */ }
        if (!rn2(6)) { /* erode_armor(mon, CORRODE) — deferred */ }
        break;
    case ZT_SLEEP:
        /* C zap.c:4290-4294: resistance/shield-effect/mimic-reveal are all
         * handled by sleep_monst(), so zhitm itself just rolls the duration
         * and hands off; tmp stays 0 (no HP damage from this case).
         *   tmp = 0;
         *   (void) sleep_monst(mon, d(nd, 25),
         *                      type == ZT_WAND(ZT_SLEEP) ? WAND_CLASS : '\0');
         * ZT_WAND(x) is `x` unchanged (zap.c:55), so `how` is WAND_CLASS only
         * when the raw (un-abs'd, un-%10'd) `type` this function received is
         * exactly ZT_SLEEP -- a wand-of-sleep zap -- and '\0' (0) for a
         * spell/breath/monster-cast sleep ray. */
        tmp = 0;
        await sleep_monst(mon, d(nd, 25), (type === ZT_SLEEP) ? WAND_CLASS : 0);
        break;
    case ZT_DEATH: { /* C zap.c:4292-4337 — death ray/disintegration */
        const breath = Math.abs(type) === (20 + ZT_DEATH);
        if (!breath) {
            /* A death ray heals Death and is absorbed by nonliving, demonic,
             * vampire-shifting, or magic-resistant monsters. */
            if ((mon.data?.pmidx | 0) === PM_DEATH) {
                healmon(mon, Math.trunc((mon.mhpmax | 0) * 3 / 2),
                        Math.trunc((mon.mhpmax | 0) / 2));
                if ((mon.mhpmax | 0) >= ZP_MAGIC_COOKIE)
                    mon.mhpmax = ZP_MAGIC_COOKIE - 1;
                tmp = 0;
                break;
            }
            if (nonliving(mon.data) || is_demon(mon.data)
                || _expl_is_vampshifter(mon) || resists_magm(mon)) {
                tmp = 0;
                break;
            }
            /* C sets type=-1: this is an outright kill with no saving throw. */
            type = -1;
            tmp = (mon.mhp | 0) + 1;
            break;
        }

        /* A disintegration breath first destroys a shield, then a suit (and
         * cloak), or kills outright while removing cloak and shirt. */
        let armor = which_armor(mon, W_ARMS);
        if (Resists_Elem(mon, DISINT_RES) || defended(mon, AD_DISN)) {
            tmp = 0;
        } else if (armor) {
            _zhitm_disint_armor.set(mon, armor);
            tmp = 0;
        } else if ((armor = which_armor(mon, W_ARM))) {
            _zhitm_disint_armor.set(mon, armor);
            const cloak = which_armor(mon, W_ARMC);
            if (cloak) await m_useup(mon, cloak);
            tmp = 0;
        } else {
            const cloak = which_armor(mon, W_ARMC);
            if (cloak) await m_useup(mon, cloak);
            const shirt = which_armor(mon, W_ARMU);
            if (shirt) await m_useup(mon, shirt);
            tmp = ZP_MAGIC_COOKIE;
        }
        /* C sets type=-1 for all disintegration breath outcomes. */
        type = -1;
        break;
    }
    default:
        tmp = 0;
        break;
    }

    /* C zap.c:4385-4386 — if (sho_shieldeff) shieldeff(mon->mx, mon->my); its
     * closing newsym() is what restores the monster over the ray glyph. */
    if (sho_shieldeff)
        shieldeff_real(mon.mx | 0, mon.my | 0);

    /* C zap.c:4380 — Knight quest-artifact double (not on this path). */
    /* C zap.c:4382-4384 — resist saving throw (only for type >= 0, tmp > 0).
     * resist(mon, type < ZT_SPELL(0) ? WAND_CLASS : '\0', 0, NOTELL). */
    if (tmp > 0 && type >= 0) {
        const resist_oclass = (type < 10 /* ZT_SPELL(0) */) ? WAND_CLASS : 0 /* '\0' */;
        if (await resist(mon, resist_oclass, 0, 0 /* NOTELL */)) tmp = Math.trunc(tmp / 2);
    }
    if (tmp < 0) tmp = 0;
    mon.mhp = (mon.mhp | 0) - tmp;
    return tmp;
}

/* Monster buzz hit — to-hit already passed; apply zhitm damage, the resist
 * saving throw, then either xkilled (fatal) or a hit message (survives).
 * C ref: nethack-c/src/zap.c:4231 zhitm + 4857-4944 buzzmonst dispatch. */
async function _buzz_hit_monster(mon, type, nd, fltyp, sayhit) {
    const damgtype = zaptype(type) % 10;
    const tmp = await _zhitm(mon, type, nd);

    const disintArmor = _zhitm_disint_armor.get(mon);
    _zhitm_disint_armor.delete(mon);

    /* C zap.c:4887-4900: disintegration breath cannot permanently destroy a
     * Rider.  zhitm has already applied the apparent disintegration; restore
     * its HP and stop the ray after the complete visible reintegration. */
    if (Math.abs(type) === 20 + ZT_DEATH
        && [PM_DEATH, PM_PESTILENCE, PM_FAMINE].includes(mon.data?.pmidx | 0)) {
        if (canseemon(mon)) {
            await pline(`The ${flash_str(fltyp, false)} hits ${mon_nam(mon)}.`);
            await pline(`${Monnam(mon)} disintegrates.`);
            const hero = game.youmonst?.data || {};
            const oneEye = !(hero.mflags1 & M1_NOEYES_ZAP)
                && [PM_CYCLOPS, PM_FLOATING_EYE].includes(hero.pmidx | 0);
            const eyes = oneEye ? body_part(EYE) : makeplural(body_part(EYE));
            await pline(`${s_suffix(Monnam(mon))} body reintegrates before your ${eyes}!`);
            await pline(`${Monnam(mon)} resurrects!`);
        }
        mon.mhp = mon.mhpmax | 0;
        return true;
    }

    /* C zap.c:4901-4912: Death absorbs an ordinary death ray.  zhitm has
     * already performed Death's HP/max-HP increase. */
    if ((mon.data?.pmidx | 0) === PM_DEATH && damgtype === ZT_DEATH) {
        if (canseemon(mon)) {
            await pline(`The ${flash_str(fltyp, false)} hits ${mon_nam(mon)}.`);
            await pline(`${Monnam(mon)} absorbs the deadly ${Math.abs(type) === 20 + ZT_DEATH ? 'blast' : 'ray'}!`);
            await pline('It seems even stronger than before.');
        }
        return true;
    }

    /* C zap.c:4914-4944 buzzmonst dispatch after zhitm. */
    if (tmp === ZP_MAGIC_COOKIE) {
        await disintegrate_mon(mon, type, flash_str(fltyp, false));
    } else if (disintArmor) {
        if (canseemon(mon))
            await pline(`${s_suffix(Monnam(mon))} ${(await distant_name(disintArmor, xname))} is disintegrated!`);
        await m_useup(mon, disintArmor);
        /* The armor result is a surviving hit, so it shares C's closing
         * wakeup() with the ordinary non-fatal arm below. */
        await wakeup(mon, type >= 0);
    } else if (DEADMONSTER(mon)) {
        if (type >= 0) {
            /* killed by hero — xkilled(mon, XKILL_GIVEMSG[ | NOCORPSE]).
             * Highly-flammable monsters leave no corpse on a fire ray. */
            let xkflags = XKILL_GIVEMSG;
            if (damgtype === ZT_FIRE && _completely_burns(mon)) xkflags |= XKILL_NOCORPSE;
            await xkilled(mon, xkflags);
        } else {
            await monkilled_trap(mon, flash_str(fltyp));
        }
    } else {
        /* normal non-fatal hit — hit message + wakeup. */
        if (sayhit || canspotmon(mon)) {
            await pline('The ' + flash_str(fltyp) + ' hits ' + mon_nam(mon)
                + (tmp > 4 ? '!' : '.'));
        }
        if (damgtype !== ZT_SLEEP) {
            /* C zap.c:4941 wakeup(mon, type >= 0): besides clearing sleep,
             * an attacking hero makes a peaceful target angry and a target
             * which was asleep emits growl().  The shield/suit native control
             * reaches that visible tail with its sleeping captain. */
            await wakeup(mon, type >= 0);
        }
    }
}

/* C zap.c:4723-4753 disintegrate_mon.  Inventory is destroyed before the
 * death/lifesaving path, except for disintegration-resistant objects, quest
 * artifacts, random object resistance, and the worn lifesaving amulet. */
export async function disintegrate_mon(mon, type, fltxt) {
    const amulet = mlifesaver(mon);
    if (canseemon(mon)) {
        if (!amulet)
            await pline(`${Monnam(mon)} is disintegrated!`);
        else
            await pline(`The ${fltxt} hits ${mon_nam(mon)}!`);
    }

    for (let obj = mon.minvent, next; obj; obj = next) {
        next = obj.nobj;
        if ((MKOBJ_OC_OPROP[obj.otyp | 0] | 0) === DISINT_RES
            || obj_resists(obj, 5, 50) || is_quest_artifact(obj) || obj === amulet)
            continue;
        await disint_extract(mon, obj, true, true);
        await obfree(obj, null);
    }

    if (type < 0) {
        (game.iflags ||= {}).sad_feeling = !!mon.mtame;
        (game.gd ||= {}).disintegested = true;
        await mondead_zap(mon);
    } else {
        await xkilled(mon, XKILL_NOMSG | XKILL_NOCORPSE);
    }
}

/* C monst.h:268-279 mon_resistancebits(mon) = data->mresists | mextrinsics |
 * mintrinsics; Resists_Elem(mon, X) masks it.  Bit values monflag.h:62-69 —
 * the same triple js/mhitm.js:1767 already reads. */
const MR_FIRE_ZAP = 0x01, MR_COLD_ZAP = 0x02;
function _resists_elem_zap(mon, mask) {
    const bits = ((mon && mon.data) ? (mon.data.mresists | 0) : 0)
        | ((mon && mon.mextrinsics) | 0) | ((mon && mon.mintrinsics) | 0);
    return (bits & mask) !== 0;
}

function _completely_burns(mon) {
    const mndx = (mon.mndx ?? mon.mnum) | 0;
    void mndx;
    return false;
}

/* C zap.c:3000 spell_damage_bonus — hero-cast spell damage modifier. */
function spell_damage_bonus(dmg) {
    /* Only relevant for hero-cast spells (ZT_SPELL); wands skip this. */
    return dmg;
}

/* C defsym.h:197-198 PCHAR2(80,')',S_boomleft,...) / PCHAR2(81,'(',S_boomright,...)
 * — PCHAR2(idx, ch, sym, ...) expands to `sym = idx` (see js/region.js's
 * S_cloud/S_poisoncloud comment for the same macro). */
const _BH_S_BOOMLEFT = 80;
const _BH_S_BOOMRIGHT = 81;
/* C hack.h:655-662 N_DIRS-based direction macros. */
function _bh_DIR_CLAMP(dir) { return ((dir + N_DIRS) % N_DIRS); }
function _bh_DIR_LEFT(dir) { return ((dir + N_DIRS - 1) % N_DIRS); }
function _bh_DIR_RIGHT(dir) { return ((dir + 1) % N_DIRS); }
function _bh_URIGHTY() { return !(game.u && game.u.uhandedness); }
function _bh_Fumbling() {
    const p = game.u && game.u.uprops ? game.u.uprops[FUMBLING] : null;
    return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0)));
}
/* C display.h:624 cmap_to_glyph(cmap_idx) — display-only glyph index for the
 * transient DISP_FLASH/DISP_CHANGE boomerang animation symbol.  Same formula
 * as js/region.js's identical (file-local, unexported) helper; kept as its
 * own copy here rather than a cross-file import per that file's own note
 * about js/display.js declaring the same-named GLYPH_CMAP_B/C_OFF constants
 * with unrelated values. */
function _bh_cmap_to_glyph(cmap_idx) {
    const S_grave = 34, S_digbeam = 78, S_arrow_trap = 49, S_goodpos = 87;
    const CMAP_B_GLYPH_BASE = 4011, CMAP_C_GLYPH_BASE = 4083;
    const MAXTCHARS = 25; /* C sym.h:92 — TRAPNUM - 1 */
    if (cmap_idx >= S_grave && cmap_idx < S_arrow_trap + MAXTCHARS)
        return (cmap_idx - S_grave) + CMAP_B_GLYPH_BASE;
    if (cmap_idx <= S_goodpos)
        return (cmap_idx - S_digbeam) + CMAP_C_GLYPH_BASE;
    return 0; /* C NO_GLYPH — unreachable for the two symbols used here */
}

export async function boomhit(obj, dx, dy) {
    const g = game, u = g.u;

    if (!g.bhitpos)
        g.bhitpos = { x: 0, y: 0 };
    g.bhitpos.x = u.ux | 0;
    g.bhitpos.y = u.uy | 0;

    const counterclockwise = _bh_URIGHTY(); /* ULEFTY => clockwise */
    const nhitsInit = Math.max(1, (obj.spe | 0) + 1);
    let nhits = nhitsInit;

    let boom = counterclockwise ? _BH_S_BOOMLEFT : _BH_S_BOOMRIGHT;
    let i = xytodir(dx, dy);
    tmp_at(DISP_FLASH, _bh_cmap_to_glyph(boom));

    for (let ct = 0; ct < 10; ct++) {
        i = _bh_DIR_CLAMP(i);
        boom = (_BH_S_BOOMLEFT + _BH_S_BOOMRIGHT - boom); /* toggle */
        tmp_at(DISP_CHANGE, _bh_cmap_to_glyph(boom)); /* change glyph */
        dx = xdir[i];
        dy = ydir[i];
        g.bhitpos.x += dx;
        g.bhitpos.y += dy;
        if (!isok(g.bhitpos.x, g.bhitpos.y)) {
            g.bhitpos.x -= dx;
            g.bhitpos.y -= dy;
            break;
        }
        const mtmp = m_at(g.bhitpos.x, g.bhitpos.y);
        if (mtmp) {
            await m_respond(mtmp);
            if (nhits-- < 0) {
                tmp_at(DISP_END, 0);
                return mtmp;
            } else if ((await throwit_mon_hit(obj, mtmp)) || !g.thrownobj) {
                break;
            }
        }
        if (!ZAP_POS(_buzz_typ(g.bhitpos.x, g.bhitpos.y) | 0)
            || closed_door(g.bhitpos.x, g.bhitpos.y)) {
            g.bhitpos.x -= dx;
            g.bhitpos.y -= dy;
            break;
        }
        if (u_at(g.bhitpos.x, g.bhitpos.y)) { /* ct == 9 */
            if (_bh_Fumbling() || rn2(20) >= acurr(u, A_DEX)) {
                const dam = dmgval(obj, g.youmonst);
                /* we hit ourselves */
                await thitu(10 + (obj.spe | 0), _zap_Maybe_Half_Phys(dam), obj,
                            'boomerang');
                endmultishot(true);
                break;
            } else { /* we catch it */
                tmp_at(DISP_END, 0);
                await pline('You skillfully catch the boomerang.');
                return g.youmonst;
            }
        }
        tmp_at(g.bhitpos.x, g.bhitpos.y);
        /* C's nh_delay_output() — animation pacing only; no observable state. */
        if (IS_SINK(_buzz_typ(g.bhitpos.x, g.bhitpos.y) | 0)) {
            /* C's Soundeffect(se_boomerang_klonk, 75) — audio only, no RNG. */
            if (!Deaf_zap())
                await pline('Klonk!');
            wake_nearto(g.bhitpos.x, g.bhitpos.y, 20);
            break; /* boomerang falls on sink */
        }
        /* ct==0, initial position, we want next delta to be same;
           ct==5, opposite position, repeat delta undoes first one */
        if (ct % 5 !== 0)
            i = counterclockwise ? _bh_DIR_LEFT(i) : _bh_DIR_RIGHT(i);
    }
    tmp_at(DISP_END, 0); /* do not leave last symbol */
    return null;
}

export function learnwand(obj) {
    const g = game;
    if (!obj) return;
    if ((obj.oclass | 0) !== SPBOOK_CLASS) {
        g._oc_name_known = g._oc_name_known || {};
        const otyp = obj.otyp | 0;
        if (g._oc_name_known[otyp]) {
            observe_object(obj);
        } else {
            /* C zap.c:137-138: if (!Blind) observe_object(obj); */
            if (!_Blind())
                observe_object(obj);
            /* C zap.c:139-140: if (obj->dknown) makeknown(obj->otyp).
             * obj.dknown is READ here as it now stands — observe_object above
             * may have left it untouched (Blind, or Hallucinating). */
            if (obj.dknown)
                discover_object(otyp, true, true, true); /* makeknown */
        }
        /* update_inventory() — no RNG. */
    }
}
/* observe_object (C o_init.c:441-452) is imported from js/o_init.js at the head
 * of this file and called at learnwand()'s two sites, matching C's two
 * (zap.c:135 and zap.c:138).  The private copy that used to sit here had NO
 * otyp test at all, under a comment asserting "FIRST_OBJECT is 0"; FIRST_OBJECT
 * is 18 (objects.h:80-108).  The claim that the missing test was inert holds —
 * every otyp reaching learnwand() is a real object type, since C's generic
 * slots 1..17 are display placeholders never assigned to an obj, and the one
 * caller that could pass something else (a fake spellbook object for a cast
 * spell) is excluded by learnwand()'s own oclass != SPBOOK_CLASS test — but
 * the comment stating WHY was false, and discover_object now enforces the
 * range on its own side regardless (o_init.c:459-461). */
/* C youprop.h:375-377:
 *   Fast      = (HFast || EFast)
 *   Very_fast = ((HFast & ~INTRINSIC) || EFast)
 * HFast/EFast are u.uprops[FAST].intrinsic/.extrinsic (youprop.h:373-374). */
function _zp_FastProp() {
    const u = game.u || (game.u = {});
    if (!u.uprops) u.uprops = {};
    if (!u.uprops[FAST]) u.uprops[FAST] = { intrinsic: 0, extrinsic: 0, blocked: 0 };
    return u.uprops[FAST];
}
function _zp_Fast() {
    const p = _zp_FastProp();
    return !!((p.intrinsic | 0) || (p.extrinsic | 0));
}
function _zp_Very_fast() {
    const p = _zp_FastProp();
    return !!(((p.intrinsic | 0) & ~INTRINSIC) || (p.extrinsic | 0));
}
/* C potion.c:2917-2926 speed_up(long duration):
 *     if (!Very_fast)
 *         You("are suddenly moving %sfaster.", Fast ? "" : "much ");
 *     else
 *         Your("%s get new energy.", makeplural(body_part(LEG)));
 *     exercise(A_DEX, TRUE);
 *     incr_itimeout(&HFast, duration);
 * Only caller in this file is the WAN_SPEED_MONSTER arm of zapyourself()
 * (zap.c:2840-2843); C's OTHER caller (potion.c:1063, peffect_speed) lives in
 * js/potion.js and is out of scope here. */
async function _zp_speed_up(duration) {
    if (!_zp_Very_fast()) {
        await pline(`You are suddenly moving ${_zp_Fast() ? '' : 'much '}faster.`);
    } else {
        await pline(`Your ${makeplural(body_part(LEG))} get new energy.`);
    }
    exercise(A_DEX, true);
    /* C potion.c:83-86 incr_itimeout(&HFast, duration) =
     *   set_itimeout(&HFast, itimeout_incr(HFast, duration))
     * itimeout_incr adds `duration` to the TIMEOUT-masked old value and
     * clamps to [0, TIMEOUT]; set_itimeout then ORs it back over the
     * TIMEOUT bits only, leaving FROMOUTSIDE/FROM_RACE/FROMEXPER untouched
     * (the same convention js/cmd.js:5454 incr_itimeout_prop uses). */
    const p = _zp_FastProp();
    let v = ((p.intrinsic | 0) & TIMEOUT) + (duration | 0);
    if (v >= TIMEOUT) v = TIMEOUT;
    else if (v < 1) v = 0;
    p.intrinsic = ((p.intrinsic | 0) & ~TIMEOUT) | v;
}

export async function zap_dig() {
    const g = game;
    const u = g.u || {};

    if (u.uswallow) {
        return;
    }

    if (u.dz | 0) {
        if (!Is_airlevel(u.uz) && !Is_waterlevel(u.uz) && !u.uinwater) {
            if (u.dz < 0 || On_stairs(u.ux, u.uy)) {
                /* C dig.c:1587-1600 — loosen a rock from the ceiling.  The
                 * stairway lookup is state-only; damage is the first draw in
                 * this arm, followed by mksobj_at's normal object/identity
                 * draws. */
                if (On_stairs(u.ux, u.uy)) {
                    const stway = stairway_at(u.ux, u.uy);
                    await pline(`The beam bounces off the ${stway?.isladder ? 'ladder' : 'stairs'} and hits the ${ceiling(u.ux, u.uy)}.`);
                }
                await pline(`You loosen a rock from the ${ceiling(u.ux, u.uy)}.`);
                await pline(`It falls on your ${body_part(HEAD)}!`);
                const dmg = rnd(hard_helmet(u.uarmh) ? 2 : 6);
                await losehp(_zap_Maybe_Half_Phys(dmg), 'falling rock', KILLED_BY_AN);
                const rock = await mksobj_at(ZP_ROCK, u.ux, u.uy, false, false);
                if (rock) {
                    xname(rock);
                    await stackobj(rock);
                }
                newsym(u.ux, u.uy);
            } else {
                /* C dig.c:1602-1605 — watch_dig() is RNG-free/no-town here
                 * (see the normal-case comment above); dighole(FALSE,TRUE,0)
                 * is the ported scope (js/dig.js). */
                await dighole(false, true, null);
            }
        }
        return;
    }

    /* ── C dig.c:1612-1622 — normal case: digging across the level ── */
    let shopdoor = false, shopwall = false;
    const lf = g.level?.flags || {};
    /* C dig.c:1614 — maze_dig = is_maze_lev && !Is_earthlevel(&u.uz). */
    const maze_dig = !!lf.is_maze_lev && !Is_earthlevel(u.uz);
    const udx = u.dx | 0, udy = u.dy | 0;
    let zx = (u.ux | 0) + udx;
    let zy = (u.uy | 0) + udy;

    const pitdig = false;

    let digdepth = rn1(18, 8);

    /* C dig.c:1624-1737 — dig loop. */
    while (--digdepth >= 0) {
        if (!isok(zx, zy))
            break;                                  /* C dig.c:1625-1626 */
        const room = g.level?.at(zx, zy);
        if (!room)
            break;
        /* C dig.c:1628-1629 tmp_at(zx,zy)/nh_delay_output — beam anim; skipped. */

        if (pitdig) {
            break;
        } else if (closed_door(zx, zy) || room.typ === SDOOR) {
            /* C dig.c:1669-1683 — raze a (secret) door into a doorless doorway. */
            /* C dig.c:1670-1673 — shop-door damage. */
            if (in_rooms(zx, zy, SHOPBASE).length) {
                add_damage(zx, zy, SHOP_DOOR_COST);
                shopdoor = true;
            }
            if (room.typ === SDOOR)
                room.typ = DOOR;                    /* C dig.c:1674-1675 */
            else if (cansee(zx, zy))
                await pline('The door is razed!');  /* C dig.c:1676-1677 */
            /* C dig.c:1678 watch_dig — RNG-free, no-town here. */
            room.doormask = D_NODOOR;               /* C dig.c:1679 */
            recalc_block_point(zx, zy);             /* C dig.c:1680 — vision */
            feel_newsym(zx, zy);
            digdepth -= 2;                          /* C dig.c:1681 */
            if (maze_dig)
                break;                              /* C dig.c:1682-1683 */
        } else if (maze_dig) {
            if (IS_WALL(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    if (in_rooms(zx, zy, SHOPBASE).length) { /* C dig.c:1687-1690 */
                        add_damage(zx, zy, SHOP_WALL_COST);
                        shopwall = true;
                    }
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                    feel_newsym(zx, zy);
                } else if (!_Blind()) {
                    await pline('The wall glows then fades.'); /* C dig.c:1691-1692 */
                }
                break;
            } else if (IS_TREE(room.typ)) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = ROOM; room.flags = 0;
                    unblock_point(zx, zy);
                    feel_newsym(zx, zy);
                } else if (!_Blind()) {
                    await pline('The tree shudders but is unharmed.'); /* C dig.c:1699-1700 */
                }
                break;
            } else if (room.typ === STONE || room.typ === SCORR) {
                if (!(room.wall_info & W_NONDIGGABLE)) {
                    room.typ = CORR; room.flags = 0;
                    unblock_point(zx, zy);
                    feel_newsym(zx, zy);
                } else if (!_Blind()) {
                    await pline('The rock glows then fades.'); /* C dig.c:1707-1708 */
                }
                break;
            }
        } else if (IS_OBSTRUCTED(room.typ)) {
            if (!may_dig(zx, zy))
                break;                              /* C dig.c:1712-1713 */
            if (IS_WALL(room.typ) || room.typ === SDOOR) {
                /* C dig.c:1714-1725 — wall → doorless doorway (non-cavernous)
                 * or corridor (cavernous). */
                if (in_rooms(zx, zy, SHOPBASE).length) {
                    add_damage(zx, zy, SHOP_WALL_COST);
                    shopwall = true;
                }
                /* C dig.c:1719 watch_dig — RNG-free, no-town here. */
                if (lf.is_cavernous_lev /* && !in_town(zx,zy) */) {
                    room.typ = CORR; room.flags = 0; /* C dig.c:1720-1721 */
                } else {
                    room.typ = DOOR; room.doormask = D_NODOOR; /* C dig.c:1722-1723 */
                }
                digdepth -= 2;                      /* C dig.c:1725 */
            } else if (IS_TREE(room.typ)) {
                room.typ = ROOM; room.flags = 0;    /* C dig.c:1726-1727 */
                digdepth -= 2;                      /* C dig.c:1728 */
            } else {
                room.typ = CORR; room.flags = 0;    /* C dig.c:1729-1731 */
                digdepth--;
            }
            unblock_point(zx, zy);                  /* C dig.c:1733 — vision */
            feel_newsym(zx, zy);
        }
        zx += udx;                                  /* C dig.c:1735-1736 */
        zy += udy;
    } /* while */
    /* C dig.c:1738 tmp_at(DISP_END,0) — closing beam call; skipped. */

    /* C dig.c:1740-1749 pitflow — only set on the pitdig path; not reached. */

    /* C dig.c:1751-1752 */
    if (shopdoor || shopwall)
        await pay_for_damage(shopdoor ? 'destroy' : 'dig into', false);
    g.vision_full_recalc = 1;
}

const STRANGE_OBJECT = 0;
const ZP_WEAPON_CLASS = 2, ZP_ARMOR_CLASS = 3, ZP_RING_CLASS = 4,
      ZP_TOOL_CLASS = 6, ZP_POTION_CLASS = 8, ZP_SPBOOK_CLASS = 10,
      ZP_WAND_CLASS = 11, ZP_GEM_CLASS = 13;
/* objects.h otyps used by poly_obj's class switch. */
const ZP_MAGIC_LAMP = 228, ZP_OIL_LAMP = 227, ZP_MAGIC_MARKER = 242,
      ZP_POT_POLYMORPH = 316, ZP_POT_GAIN_ABILITY = 297, ZP_POT_WATER = 322,
      ZP_POT_OIL = 321,
      ZP_SPE_BLANK_PAPER = 407, ZP_SPE_NOVEL = 408, ZP_MAX_SPELL_STUDY = 3,
      ZP_BOULDER = 475, ZP_ROCK = 474, ZP_MINERAL = 21, ZP_CORPSE = 265,
      ZP_EGG = 273, ZP_LEASH = 231;
const ZP_OBJ_FREE = 0, ZP_OBJ_FLOOR = 1, ZP_OBJ_INVENT = 3, ZP_OBJ_MINVENT = 4;
/* zap.c:1687 charged_objs[] = { WAND_CLASS, WEAPON_CLASS, ARMOR_CLASS,
 * TOOL_CLASS, RING_CLASS, 0 } — the classes whose spe is carried across a
 * polymorph. */
const ZP_CHARGED_CLASSES = new Set([ZP_WAND_CLASS, ZP_WEAPON_CLASS,
                                    ZP_ARMOR_CLASS, ZP_TOOL_CLASS,
                                    ZP_RING_CLASS]);

export function zapsetup() { game._obj_zapped = false; }
export async function zapwrapup() {
    if (game._obj_zapped)
        await pline("You feel shuddering vibrations.");
    game._obj_zapped = false;
}

/* C zap.c:1475 obj_shudders(struct obj *obj) — verbatim. */
function obj_shudders(obj) {
    let zap_odds;
    /* svc.context.bypasses && obj->bypass */
    if (game.context && game.context.bypasses && obj.bypass)
        return false;
    if ((obj.oclass | 0) === ZP_WAND_CLASS)
        zap_odds = 3;                       /* half-life = 2 zaps */
    else if (obj.cursed)
        zap_odds = 3;                       /* half-life = 2 zaps */
    else if (obj.blessed)
        zap_odds = 12;                      /* half-life = 8 zaps */
    else
        zap_odds = 8;                       /* half-life = 6 zaps */
    /* adjust for "large" quantities of identical things */
    if ((obj.quan | 0) > 4)
        zap_odds = Math.trunc(zap_odds / 2);
    return !rn2(zap_odds);
}

function _zp_delobj(obj) {
    const g = game;
    if (!obj) return;
    if (obj_resists(obj, 0, 0)) {
        obj.in_use = 0;
        return;
    }
    const update_map = ((obj.where | 0) === ZP_OBJ_FLOOR);
    const ox = obj.ox | 0, oy = obj.oy | 0;
    _zp_extract_floor(obj);
    obj.where = ZP_OBJ_FREE;
    if (update_map)
        newsym(ox, oy);
    {
        const store = g.__bridge__ || (g.__bridge__ = {});
        const key = 'objs_deleted.count';
        const cur = store[key] !== undefined ? Number(store[key]) : 0;
        store[key] = String(cur + 1);
    }
}
function _zp_extract_floor(obj) {
    const g = game;
    const ox = obj.ox | 0, oy = obj.oy | 0;
    const cell = g.level?.levelObjects?.[ox];
    if (cell) {
        let prev = null;
        for (let o = cell[oy]; o; prev = o, o = o.nexthere) {
            if (o === obj) {
                if (prev) prev.nexthere = o.nexthere; else cell[oy] = o.nexthere;
                break;
            }
        }
    }
    let prevn = null;
    for (let o = g.fobj; o; prevn = o, o = o.nobj) {
        if (o === obj) {
            if (prevn) prevn.nobj = o.nobj; else g.fobj = o.nobj;
            break;
        }
    }
    obj.nexthere = null;
    obj.nobj = null;
}
function _zp_replace_object(obj, otmp) {
    otmp.where = obj.where;
    if ((obj.where | 0) === ZP_OBJ_INVENT) {
        otmp.nobj = obj.nobj;
        obj.nobj = otmp;
        {
            const g = game;
            let prev = null;
            for (let o = g.invent; o; prev = o, o = o.nobj) {
                if (o === obj) {
                    if (prev) prev.nobj = o.nobj; else g.invent = o.nobj;
                    break;
                }
            }
        }
        return;
    }
    if ((obj.where | 0) === ZP_OBJ_MINVENT) {
        /* C mkobj.c:662-666 replace_object OBJ_MINVENT arm:
         *     otmp->nobj = obj->nobj; otmp->ocarry = obj->ocarry;
         *     obj->nobj = otmp; extract_nobj(obj, &obj->ocarry->minvent);
         * Reached from trapeffect_poly_trap's iron-shoes arm (trap.c:2496-2510). */
        const mon = obj.ocarry;
        otmp.nobj = obj.nobj;
        otmp.ocarry = mon;
        obj.nobj = otmp;
        let prev = null;
        for (let o = mon.minvent; o; prev = o, o = o.nobj) {
            if (o === obj) {
                if (prev) prev.nobj = o.nobj; else mon.minvent = o.nobj;
                break;
            }
        }
        obj.where = ZP_OBJ_FREE;
        obj.nobj = null;
        return;
    }
    if ((obj.where | 0) !== ZP_OBJ_FLOOR) {
        return;
    }
    otmp.nobj = obj.nobj;
    otmp.nexthere = obj.nexthere;
    otmp.ox = obj.ox;
    otmp.oy = obj.oy;
    obj.nobj = otmp;
    obj.nexthere = otmp;
    _zp_extract_floor(obj);
}

/* C zap.c:1650 do_osshock(struct obj *obj) — the "shudders" destruction. */
async function do_osshock(obj) {
    const g = game;
    g._obj_zapped = true;
    if ((g._poly_zapped | 0) < 0) {
        /* some may metamorphose */
        for (let i = obj.quan | 0; i; i--) {
            if (!rn2(_zp_Luck() + 45)) {
                g._poly_zapped = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
                break;
            }
        }
    }
    /* if quan > 1 then some will survive intact */
    if ((obj.quan | 0) > 1)
        obj = (await splitobj(obj, rnd((obj.quan | 0) - 1)));
    _zp_delobj(obj);
}
function _zp_Luck() { return (game.u?.uluck | 0); }

export async function poly_obj(obj, id) {
    const g = game;
    const can_merge = (id === STRANGE_OBJECT);
    const obj_location = obj.where | 0;
    let otmp = null;

    if (id === STRANGE_OBJECT) {  /* preserve symbol */
        let try_limit = 3;
        let magic_obj = MKOBJ_OC_MAGIC[obj.otyp | 0] | 0;
        if (obj.degraded_horn) magic_obj = 0;
        /* Try up to 3 times to make the magic-or-not status of the new item
           the same as the old item. */
        do {
            if (otmp) _zp_delobj(otmp);
            otmp = (await mkobj(obj.oclass | 0, false));
        } while (--try_limit > 0
                 && (MKOBJ_OC_MAGIC[otmp.otyp | 0] | 0) !== magic_obj);
    } else {
        otmp = (await mksobj(id, false, false));
    }

    otmp.quan = obj.quan;                       /* preserve quantity */
    otmp.no_charge = obj.no_charge;             /* shopkeeper's disinterest */
    if (obj_location === ZP_OBJ_INVENT)
        otmp.invlet = obj.invlet;

    /* keep special fields (including charges on wands) */
    if (ZP_CHARGED_CLASSES.has(otmp.oclass | 0))
        otmp.spe = obj.spe;
    otmp.recharged = obj.recharged;
    otmp.cursed = obj.cursed;
    otmp.blessed = obj.blessed;

    if (obj.oeroded)     otmp.oeroded = obj.oeroded;
    if (obj.oeroded2)    otmp.oeroded2 = obj.oeroded2;
    if (obj.oerodeproof) otmp.oerodeproof = obj.oerodeproof;

    if (obj.otrapped && otmp.otrapped !== undefined) otmp.otrapped = 1;
    if (obj.opoisoned) otmp.opoisoned = 1;

    /* 'n' merged objects may be fused into 1 object */
    if ((otmp.quan | 0) > 1
        && (!(OC_MERGE[otmp.otyp | 0])
            || (can_merge && (otmp.quan | 0) > rn2(1000))))
        otmp.quan = 1;

    switch (otmp.oclass | 0) {
    case ZP_TOOL_CLASS:
        if ((otmp.otyp | 0) === ZP_MAGIC_LAMP) {
            otmp.otyp = ZP_OIL_LAMP;
            otmp.age = 1500;               /* "best" oil lamp possible */
        } else if ((otmp.otyp | 0) === ZP_MAGIC_MARKER) {
            otmp.recharged = 1;            /* degraded quality */
        }
        break;
    case ZP_WAND_CLASS:
        while ((otmp.otyp | 0) === WAN_WISHING_ZP
               || (otmp.otyp | 0) === WAN_POLYMORPH)
            otmp.otyp = rnd_class(WAN_LIGHT, WAN_LIGHTNING);
        /* altering the object tends to degrade its quality */
        if ((otmp.recharged | 0) < rn2(7))  /* recharge_limit */
            otmp.recharged = (otmp.recharged | 0) + 1;
        break;
    case ZP_POTION_CLASS:
        while ((otmp.otyp | 0) === ZP_POT_POLYMORPH)
            otmp.otyp = rnd_class(ZP_POT_GAIN_ABILITY, ZP_POT_WATER);
        void ZP_POT_OIL;
        break;
    case ZP_SPBOOK_CLASS:
        while ((otmp.otyp | 0) === SPE_POLYMORPH)
            otmp.otyp = rnd_class(_zp_spbook_base(), ZP_SPE_BLANK_PAPER);
        if ((otmp.otyp | 0) !== ZP_SPE_BLANK_PAPER
            && (otmp.otyp | 0) !== ZP_SPE_NOVEL) {
            otmp.spestudied = (obj.spestudied | 0) + 1;
            if ((otmp.spestudied | 0) > ZP_MAX_SPELL_STUDY) {
                otmp.otyp = ZP_SPE_BLANK_PAPER;
                otmp.spestudied = rn2(otmp.spestudied | 0);
            }
        }
        break;
    case ZP_GEM_CLASS:
        if ((otmp.quan | 0) > rnd(4)
            && (MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0) === ZP_MINERAL
            && (MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) !== ZP_MINERAL) {
            otmp.otyp = ZP_ROCK;           /* transmutation backfired */
            otmp.quan = Math.trunc((otmp.quan | 0) / 2);
        }
        break;
    default:
        break;
    }

    otmp.owt = weight(otmp);                /* update the weight */

    const ox = obj.ox | 0, oy = obj.oy | 0;
    _zp_replace_object(obj, otmp);
    if (obj_location === ZP_OBJ_FLOOR) {
        /* boulder block/unblock — vision bookkeeping, RNG-free. */
        if ((obj.otyp | 0) === ZP_BOULDER && (otmp.otyp | 0) !== ZP_BOULDER)
            unblock_point(ox, oy);
    }
    _zp_delobj(obj);
    return otmp;
}
/* svb.bases[SPBOOK_CLASS] — the first spellbook otyp.  SPE_BLANK_PAPER is 407
 * and the book range runs contiguously up to it; the base is the first
 * spellbook, SPE_DIG. */
const _ZP_SPBOOK_BASE = 366;
function _zp_spbook_base() { return _ZP_SPBOOK_BASE; }
const WAN_WISHING_ZP = 414;
/* C obj.h:338 Is_box(o) := otyp == LARGE_BOX || otyp == CHEST.  js/lock.js:862-866
 * carries the same numeric otyps as a file-local `_Is_box` (not exported); zap.js
 * needs its own copy for bhito()'s WAN_OPENING/SPE_KNOCK/WAN_LOCKING/SPE_WIZARD_LOCK
 * arm (zap.c:2393-2400). */
const LARGE_BOX_OTYP_ZP = 214;
const CHEST_OTYP_ZP = 215;
function _bhito_is_box(o) {
    return !!(o && ((o.otyp | 0) === LARGE_BOX_OTYP_ZP || (o.otyp | 0) === CHEST_OTYP_ZP));
}

/* C zap.c:612-621 probe_objchain — reveal carried objects without RNG. */
function _zp_probe_objchain(head) {
    for (let obj = head; obj; obj = obj.nobj) {
        observe_object(obj);
        const typ = obj.otyp | 0;
        if ((typ >= LARGE_BOX_OTYP_ZP && typ <= 220) || typ === 476) {
            obj.lknown = 1;
            if (!(typ === LARGE_BOX_OTYP_ZP && (obj.spe | 0) === 1))
                obj.cknown = 1;
        } else if (typ === 296) {
            obj.known = 1;
        }
    }
}

export async function probe_monster(mtmp) {
    await mstatusline(mtmp);
    if (game.gn && game.gn.notonhead)
        return; /* don't show minvent for long worm tail */
    if (mtmp.minvent) {
        _zp_probe_objchain(mtmp.minvent);
        await display_minventory(mtmp, `${s_suffix(noit_Monnam(mtmp))} possessions:`);
    } else {
        await pline("%s is not carrying anything%s.", noit_Monnam(mtmp),
                    engulfing_u(mtmp) ? " besides you" : "");
    }
}

/* C zap.c:2685-2701 boxlock_invent(struct obj *obj) — (un)lock every carried
 * box/chest with the zapped wand/spellbook `obj`.  Called from zapyourself()'s
 * WAN_OPENING/SPE_KNOCK and WAN_LOCKING/SPE_WIZARD_LOCK arms (zap.c:2929-2951).
 *     for (otmp = gi.invent; otmp; otmp = nextobj) {
 *         nextobj = otmp->nobj;
 *         if (Is_box(otmp)) { (void) boxlock(otmp, obj); boxing = TRUE; }
 *     }
 *     if (boxing) update_inventory();
 * boxlock's own return is discarded here — only whether ANY box was found
 * matters, to decide whether to repaint the inventory (a no-op in this port). */
async function _zp_boxlock_invent(obj) {
    const g = game;
    let boxing = false;
    for (let otmp = g.invent, nextobj = null; otmp; otmp = nextobj) {
        nextobj = otmp.nobj;
        if (_bhito_is_box(otmp)) {
            await boxlock(otmp, obj);
            boxing = true;
        }
    }
    if (boxing)
        update_inventory();
}

function _zp_place_on_floor(obj, x, y) {
    const g = game;
    const xi = x | 0, yi = y | 0;
    let otmp2 = (g.level?.levelObjects?.[xi]?.[yi]) ?? null;
    if (otmp2 && (otmp2.otyp | 0) === ZP_BOULDER && (obj.otyp | 0) !== ZP_BOULDER) {
        while (otmp2.nexthere && (otmp2.nexthere.otyp | 0) === ZP_BOULDER)
            otmp2 = otmp2.nexthere;
        obj.nexthere = otmp2.nexthere;
        otmp2.nexthere = obj;
    } else {
        obj.nexthere = otmp2;
        if (g.level?.levelObjects?.[xi])
            g.level.levelObjects[xi][yi] = obj;
    }
    obj.ox = xi;
    obj.oy = yi;
    obj.where = ZP_OBJ_FLOOR;
    obj.nobj = g.fobj;
    g.fobj = obj;
    if ((obj.otyp | 0) === ZP_BOULDER && (!otmp2 || (otmp2.otyp | 0) !== ZP_BOULDER))
        block_point(xi, yi);
}

/* C zap.c:5537 fracture_rock(struct obj *obj) /* no texts here! *\/ —
 * "fractured by pick-axe or wand of striking or by vault guard or
 * shopkeeper".  Only the bhito() WAN_STRIKING/SPE_FORCE_BOLT BOULDER caller
 * below reaches this in this file, and that caller is always a hero zap
 * (context.mon_moving is only ever set for a MONSTER zap, which this file's
 * weffects()->bhitpile()->bhito() chain never reaches — see the comment on
 * the default arm of bhito()'s WAN_STRIKING case), so by_you is always true
 * here.  RNG: rn1(60,7) = rn2(60)+7 for the new rock's quantity
 * (zap.c:5560). */
export async function fracture_rock(obj) {
    const g = game;
    const by_you = !_expl_mon_moving();
    if (by_you && (obj.where | 0) === ZP_OBJ_FLOOR) {
        const x = obj.ox | 0, y = obj.oy | 0;
        if (costly_spot(x, y)) {
            const room = in_rooms(x, y, SHOPBASE);
            const shkbox = { value: null };
            if ((await billable(shkbox, obj, room.length ? room[0] : 0, false))) {
                const shkp = shkbox.value;
                await pline(`You fracture ${s_suffix(shkname(shkp))} ${xname(obj)}.`);
                await stolen_value(obj, x, y, !!shkp.mpeaceful, false);
            }
        }
    }
    if (by_you && (obj.otyp | 0) === ZP_BOULDER)
        sokoban_guilt();

    obj.otyp = ZP_ROCK;
    obj.oclass = ZP_GEM_CLASS;
    obj.quan = rn1(60, 7);
    obj.owt = weight(obj);
    obj.dknown = 0;
    obj.bknown = 0;
    obj.rknown = 0;
    obj.known = OC_USES_KNOWN[obj.otyp | 0] ? 0 : 1;
    dealloc_oextra(obj);

    if ((obj.where | 0) === ZP_OBJ_FLOOR) {
        const ox = obj.ox | 0, oy = obj.oy | 0;
        _zp_extract_floor(obj);        /* obj_extract_self — move rocks back on top */
        _zp_place_on_floor(obj, ox, oy);
        if (!does_block(ox, oy)) {
            unblock_point(ox, oy);
            /* need immediate update in case this is a striking/force bolt
               zap that is about hit more things */
            vision_recalc(0);
        }
        if (cansee(ox, oy))
            newsym(ox, oy);
    }
}

export async function break_statue(obj) {
    const x = obj.ox | 0, y = obj.oy | 0;
    const trap = t_at(x, y);
    if (trap && (trap.ttyp | 0) === STATUE_TRAP) {
        const mon = await activate_statue_trap(trap, x, y, true);
        if (mon)
            return false;
    }
    while (obj.cobj) {
        const item = obj.cobj;
        obj.cobj = item.nobj ?? null;
        item.nobj = null;
        item.ocontainer = null;
        _zp_place_on_floor(item, x, y);
    }
    await fracture_rock(obj);
    return true;
}

const STF_ROCK_CLASS = 14, STF_TOOL_CLASS = TOOL_CLASS,
      STF_RING_CLASS = RING_CLASS, STF_WAND_CLASS = WAND_CLASS,
      STF_GEM_CLASS = 13, STF_WEAPON_CLASS = WEAPON_CLASS;
const STF_BOULDER = 475, STF_STATUE = 476, STF_FIGURINE = 241;
const STF_MEATBALL = 267, STF_MEAT_STICK = 268, STF_ENORMOUS_MEATBALL = 269,
      STF_MEAT_RING = 270;
const STF_MINERAL = 21; /* objects.h MINERAL material code (zap.c:5419-5420) */
const STF_M1_CARNIVORE = 0x20000000;
async function stone_to_flesh_obj(obj) {
    let res = 1; /* affected object by default */

    const material = MKOBJ_OC_MATERIAL[obj.otyp | 0] | 0;
    if (material !== STF_MINERAL && material !== 20 /* GEMSTONE */)
        return 0;
    /* Heart of Ahriman usually resists; ordinary items rarely do */
    if (obj_resists(obj, 2, 98))
        return 0;

    /* get_obj_location() uses the hero's square for carried objects.  The
     * inventory arm is legal specifically because otmp is Stone to Flesh;
     * using an absent inventory ox/oy would redraw (and animate) at (0,0). */
    const carried = (obj.where | 0) === ZP_OBJ_INVENT;
    const oox = carried ? (game.u?.ux | 0) : (obj.ox | 0);
    const ooy = carried ? (game.u?.uy | 0) : (obj.oy | 0);
    let smell = false;
    const oclass = obj.oclass | 0, otyp = obj.otyp | 0;
    switch (oclass) {
    case STF_ROCK_CLASS: /* boulders and statues */
    case STF_TOOL_CLASS: /* figurines */
        if (otyp === STF_BOULDER) {
            obj = (await poly_obj(obj, STF_ENORMOUS_MEATBALL));
            smell = true;
        } else if (otyp === STF_STATUE) {
            const failReason = { value: 0 };
            const mon = await animate_statue(obj, oox, ooy,
                ANIMATE_SPELL, failReason);
            res = mon ? 1 : 0;
        } else if (otyp === STF_FIGURINE) {
            /* C zap.c:2027-2053: figurines create the saved monster form
             * directly; unlike statues they do not use animate_statue's
             * corpse-trait and statue-trap handling. */
            const ptr = permonstTemplate(obj.corpsenm | 0);
            const mon = ptr ? await makemon(ptr, oox, ooy, MM_NOMSG) : null;
            if (mon) {
                _zp_delobj(obj);
                if (cansee(mon.mx | 0, mon.my | 0))
                    await pline(`The figurine animates!`);
            }
            res = mon ? 1 : 0;
        } else { /* miscellaneous tool or unexpected rock... */
            res = 0;
        }
        break;
    /* maybe add weird things to become? */
    case STF_RING_CLASS: /* some of the rings are stone */
        obj = (await poly_obj(obj, STF_MEAT_RING));
        smell = true;
        break;
    case STF_WAND_CLASS: /* marble wand */
        obj = (await poly_obj(obj, STF_MEAT_STICK));
        smell = true;
        break;
    case STF_GEM_CLASS: /* stones & gems */
        obj = (await poly_obj(obj, STF_MEATBALL));
        smell = true;
        break;
    case STF_WEAPON_CLASS: /* crysknife */
        /* FALLTHROUGH */
    default:
        res = 0;
        break;
    }
    void obj;

    if (smell) {
        /* C zap.c:2081-2093: monks and anyone who hasn't broken vegetarian
         * conduct (or isn't currently in a carnivorous form) smell "the odor
         * of meat"; a non-monk carnivore who has already eaten meat smells
         * something "delicious". */
        const g = game;
        const carn = !!((g.youmonst?.data?.mflags1 | 0) & STF_M1_CARNIVORE);
        if (_wand_Role_if(PM_MONK) || !(g.u?.uconduct?.unvegetarian) || !carn)
            await Norep('You smell the odor of meat.');
        else
            await Norep('You smell a delicious smell.');
    }

    newsym(oox, ooy);
    return res;
}

/* C zap.c:1735 bhito(struct obj *obj, struct obj *otmp) — otmp is the wand.
 * Ported: WAN_POLYMORPH/SPE_POLYMORPH, and WAN_OPENING/SPE_KNOCK/WAN_LOCKING/
 * SPE_WIZARD_LOCK via boxlock(); see the header note. */
export async function bhito(obj, otmp) {
    const g = game;
    let res = 1;                            /* affected object by default */
    let learn_it = false;

    /* a wand effect hitting itself doesn't do anything */
    if (obj === otmp)
        return 0;

    if (obj.bypass) {
        if (g.context && g.context.bypasses)
            return 0;
        obj.bypass = 0;
    }

    if ((obj.where | 0) !== ZP_OBJ_FLOOR
        && (otmp.otyp | 0) !== SPE_STONE_TO_FLESH)
        return 0;

    switch (otmp.otyp | 0) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH: {
        if (obj_unpolyable(obj)) {
            res = 0;
            break;
        }
        /* KMH, conduct */
        if (g.u && g.u.uconduct)
            g.u.uconduct.polypiles = (g.u.uconduct.polypiles | 0) + 1;
        if (obj_shudders(obj)) {
            if (cansee(obj.ox | 0, obj.oy | 0))
                learn_it = true;
            await do_osshock(obj);
            break;
        }
        obj = (await poly_obj(obj, STRANGE_OBJECT));
        newsym(obj.ox | 0, obj.oy | 0);
        break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
        /* C zap.c:2313-2316: cancel_item(obj); newsym(obj->ox, obj->oy);
         * (might change color); res/learn_it stay at their defaults (1/false). */
        await cancel_item(obj);
        newsym(obj.ox | 0, obj.oy | 0);
        break;
    case SPE_DRAIN_LIFE:
        /* C zap.c:2318-2319: (void) drain_item(obj, TRUE);
         * res/learn_it stay at their defaults (1/false). */
        await drain_item(obj, true);
        break;
    case WAN_OPENING:
    case SPE_KNOCK:
    case WAN_LOCKING:
    case SPE_WIZARD_LOCK:
        /* C zap.c:2393-2400:
         *     if (Is_box(obj)) res = boxlock(obj, otmp);
         *     else res = 0;
         *     if (res) learn_it = TRUE;
         * boxlock (js/lock.js:1954) is ASYNC — it calls pline(). */
        if (_bhito_is_box(obj))
            res = (await boxlock(obj, otmp)) ? 1 : 0;
        else
            res = 0;
        if (res)
            learn_it = true;
        break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT: {
        const _WAND_BOULDER_OTYP = 475, _WAND_STATUE_OTYP = 476;
        const g = game;
        const deaf = _expl_deaf();
        let maybelearnit = cansee(obj.ox | 0, obj.oy | 0) || !deaf;
        if ((obj.otyp | 0) === _WAND_BOULDER_OTYP) {
            /* C zap.c:2280-2286.  Soundeffect() is a compiled-out no-op in
             * this build (no sound library integrated — sndprocs.h's
             * `#define Soundeffect(seid, vol)` empty-macro arm), so it draws
             * nothing and does nothing; only the message and fracture_rock
             * itself matter here.  maybelearnit stays as set above — neither
             * this arm nor the STATUE arm below overrides it. */
            if (cansee(obj.ox | 0, obj.oy | 0))
                await pline('The boulder falls apart.');
            else
                await You_hear('a crumbling sound.');
            await fracture_rock(obj);
        } else if ((obj.otyp | 0) === _WAND_STATUE_OTYP) {
            /* C zap.c:2289-2297 — the shatter message follows break_statue. */
            if (await break_statue(obj)) {
                if (cansee(obj.ox | 0, obj.oy | 0)) {
                    if (_Halluc())
                        await pline(`The ${rndmonnam()} shatters.`);
                    else
                        await pline('The statue shatters.');
                } else
                    await You_hear('a crumbling sound.');
            }
        } else {
            const oox = obj.ox | 0, ooy = obj.oy | 0;
            const broke = await hero_breaks(obj, oox, ooy, 0);
            if (!broke)
                maybelearnit = false;
            else
                newsym_force(oox, ooy);
            res = 0;
        }
        if (maybelearnit)
            learn_it = true;
        break;
    }
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY: {
        /* C zap.c:2317-2327. res stays 1 (the default); no learn_it. */
        const ox = obj.ox | 0, oy = obj.oy | 0;
        await rloco(obj);
        maybe_unhide_at(ox, oy);
        break;
    }
    case SPE_STONE_TO_FLESH:
        /* C zap.c:2412-2413: res = stone_to_flesh_obj(obj); no learn_it. */
        res = await stone_to_flesh_obj(obj);
        break;
    default:
        res = 0;
        break;
    }
    if (learn_it)
        learnwand(otmp);
    return res;
}

/* C zap.c:1505 polyuse(objhdr, mat, minwt) — use up at least minwt worth of
 * material `mat` from the pile headed by objhdr, called by create_polymon to
 * pay for the golem it just made. */
async function polyuse(objhdr, mat, minwt) {
    const g = game;
    for (let otmp = objhdr, otmp2 = null; minwt > 0 && otmp; otmp = otmp2) {
        otmp2 = otmp.nexthere;
        if (g.context && g.context.bypasses && otmp.bypass)
            continue;
        if (otmp === g.u.uball || otmp === g.u.uchain)
            continue;
        if (obj_resists(otmp, 0, 0))
            continue; /* preserve unique objects */
        if (((MKOBJ_OC_MATERIAL[otmp.otyp | 0] | 0) === mat) === (rn2(minwt + 1) !== 0)) {
            /* appropriately add damage to bill */
            if (costly_spot(otmp.ox | 0, otmp.oy | 0)) {
                if (g.u.ushops && g.u.ushops[0])
                    await addtobill(otmp, false, false, false);
                else
                    await stolen_value(otmp, otmp.ox | 0, otmp.oy | 0, false, false);
            }
            if ((otmp.quan | 0) < LARGEST_INT)
                minwt -= (otmp.quan | 0);
            else
                minwt = 0;
            _zp_delobj(otmp);
        }
    }
}

async function create_polymon(obj, okind) {
    const g = game;
    if (g.context && g.context.bypasses) {
        while (obj && obj.bypass)
            obj = obj.nexthere;
    }
    /* no golems if you zap only one object -- not enough stuff */
    if (!obj || (!obj.nexthere && (obj.quan | 0) === 1))
        return;

    let pm_index, material;
    switch (okind) {
    case 11: /* IRON */
    case 12: /* METAL */
    case 17: /* MITHRIL */
        pm_index = PM_IRON_GOLEM;
        material = 'metal ';
        break;
    case 13: /* COPPER */
    case 14: /* SILVER */
    case 16: /* PLATINUM */
    case 20: /* GEMSTONE */
    case 21: /* MINERAL */
        pm_index = rn2(2) ? PM_STONE_GOLEM : PM_CLAY_GOLEM;
        material = 'lithic ';
        break;
    case 0:
    case 4: /* FLESH */
        pm_index = PM_FLESH_GOLEM;
        material = 'organic ';
        break;
    case 8: /* WOOD */
        pm_index = PM_WOOD_GOLEM;
        material = 'wood ';
        break;
    case 7: /* LEATHER */
        pm_index = PM_LEATHER_GOLEM;
        material = 'leather ';
        break;
    case 6: /* CLOTH */
        pm_index = PM_ROPE_GOLEM;
        material = 'cloth ';
        break;
    case 9: /* BONE */
        pm_index = PM_SKELETON;
        material = 'bony ';
        break;
    case 15: /* GOLD */
        pm_index = PM_GOLD_GOLEM;
        material = 'gold ';
        break;
    case 19: /* GLASS */
        pm_index = PM_GLASS_GOLEM;
        material = 'glassy ';
        break;
    case 5: /* PAPER */
        pm_index = PM_PAPER_GOLEM;
        material = 'paper ';
        break;
    default:
        pm_index = PM_STRAW_GOLEM;
        material = '';
        break;
    }

    const genod = !!((g.mvitals?.[pm_index]?.mvflags | 0) & G_GENOD);
    const mdat = genod ? null : pm_index;
    const mtmp = await makemon(mdat, obj.ox | 0, obj.oy | 0, MM_NOMSG);
    await polyuse(obj, okind, MONS_CWT[pm_index] | 0);

    if (mtmp && cansee(mtmp.mx | 0, mtmp.my | 0)) {
        const nm = x_monnam(mtmp, ARTICLE_A, null,
                            has_mgivenname(mtmp) ? SUPPRESS_SADDLE : 0, false);
        await pline(`Some ${material}objects meld, and ${nm} arises from the pile!`);
    }
}

/* C mkobj.c recreate_pile_at(x, y) — empty the pile into a reversed list and
 * place_object() each back, so boulders end up on top. */
function _zp_recreate_pile_at(x, y) {
    let reversed = null;
    for (let otmp = game.level?.levelObjects?.[x]?.[y] || null, next_obj; otmp;
         otmp = next_obj) {
        next_obj = otmp.nexthere;
        _zp_extract_floor(otmp);
        otmp.nobj = reversed;
        reversed = otmp;
    }
    for (let otmp = reversed, next_obj; otmp; otmp = next_obj) {
        next_obj = otmp.nobj;
        otmp.nobj = null;
        otmp.where = ZP_OBJ_FREE;
        _zp_place_on_floor(otmp, x, y);
    }
}

export async function bhitpile(obj, fhito, tx, ty, zz) {
    const g = game;
    const cell = g.level?.levelObjects?.[tx];
    if (!cell || !cell[ty])
        return 0;
    let hitanything = 0;

    g._poly_zapped = -1;
    for (let otmp = cell[ty], next_obj = null; otmp; otmp = next_obj) {
        next_obj = otmp.nexthere;
        if ((otmp.where | 0) !== ZP_OBJ_FLOOR
            || (otmp.ox | 0) !== tx || (otmp.oy | 0) !== ty)
            continue;
        hitanything += await fhito(otmp, obj);
    }

    if ((g._poly_zapped | 0) >= 0) {
        /* C zap.c:2044: create_polymon(svl.level.objects[tx][ty], gp.poly_zapped).
         * NOTE the pile is re-read fresh from the map here, not the `obj`
         * variable this loop was iterating over — do_osshock/bhito's poly_obj
         * may already have unlinked/replaced items, so this must walk the
         * CURRENT head of the (tx,ty) cell, exactly as C re-reads
         * svl.level.objects[tx][ty] rather than reusing a stale pointer. */
        const pileHead = g.level?.levelObjects?.[tx]?.[ty] || null;
        await create_polymon(pileHead, g._poly_zapped | 0);
        g._poly_zapped = -1;
    }
    /* C zap.c:2467-2475: when boulders are present they're expected to be on
     * top; if some were changed into non-boulders while ones beneath resisted,
     * re-stack the pile.  maybe_unhide_at is display bookkeeping, RNG-free. */
    {
        let prevotyp = ZP_BOULDER;
        for (let otmp = g.level?.levelObjects?.[tx]?.[ty] || null; otmp;
             otmp = otmp.nexthere) {
            if ((otmp.otyp | 0) === ZP_BOULDER && prevotyp !== ZP_BOULDER) {
                _zp_recreate_pile_at(tx, ty);
                break;
            }
            prevotyp = otmp.otyp | 0;
        }
    }
    await fill_pit(tx, ty);
    return hitanything;
}

/* C mondata.h hides_under(ptr) = (ptr->mflags1 & M1_CONCEAL) != 0.  Local copy
 * (same pattern already used standalone elsewhere in this file for other C
 * macros) rather than importing js/dig.js's file-local M1_CONCEAL_DG. */
const M1_CONCEAL_ZP = 0x00000080;
function _hides_under_zp(ptr) {
    return !!ptr && ((ptr.mflags1 | 0) & M1_CONCEAL_ZP) !== 0;
}

async function _zap_map_engraving(x, y, obj) {
    const e = engr_at(x, y);
    if (!e || e.engr_type === HEADSTONE)
        return;
    const otyp = obj ? (obj.otyp | 0) : 0;
    switch (otyp) {
    case WAN_POLYMORPH:
    case SPE_POLYMORPH: {
        /* C zap.c:3651-3655: del_engr(e); etxt = random_engraving(ebuf,
         * pristinebuf); make_engr_at(x, y, etxt, pristinebuf, svm.moves, 0).
         * The trailing 0 e_type is NOT "default to DUST" — make_engr_at
         * (js/mklev.js) rolls rnd(N_ENGRAVE-1) for a non-positive e_type,
         * matching C's rnd(N_ENGRAVE - 1) at engrave.c:452. */
        del_engr_at(x, y);
        const { text: etxt, pristine } = random_engraving();
        make_engr_at(x, y, etxt, pristine, game.moves | 0, 0);
        break;
    }
    case WAN_CANCELLATION:
    case SPE_CANCELLATION:
    case WAN_MAKE_INVISIBLE:
        del_engr_at(x, y);
        break;
    case WAN_TELEPORTATION:
    case SPE_TELEPORT_AWAY:
        _zap_rloc_engr(x, y);
        break;
    case SPE_STONE_TO_FLESH:
        if (e.engr_type === ENGRAVE) {
            await pline(_uhas(HALLUC) ? 'The floor runs like butter!'
                                       : 'The edges on the floor get smoother.');
            wipe_engr_at(x, y, d(2, 4), true);
        }
        break;
    case WAN_STRIKING:
    case SPE_FORCE_BOLT:
        wipe_engr_at(x, y, d(2, 4), true);
        break;
    default:
        break;
    }
}

/* C zap.c:3627-3679 zap_map(), the WAN_PROBING terrain arm.  Probing is
 * called before bhitm/bhito on a lateral ray, so a secret corridor/door must
 * be exposed before the target lookup on this square.  The old ray walker
 * skipped zap_map entirely, leaving the map secret and (for a secret door)
 * leaving vision blocked even though C changes both the terrain and its
 * blocking-point cache here. */
async function _zap_map_probing(x, y, obj) {
    if (!obj || (obj.otyp | 0) !== WAN_PROBING)
        return false;
    const lev = game.level?.at?.(x, y)
        || game.level?.map?.[x]?.[y];
    if (!lev)
        return false;
    if ((lev.typ | 0) === SDOOR) {
        cvt_sdoor_to_door(lev);
        recalc_block_point(x, y);
        newsym(x, y);
        if (cansee(x, y))
            await pline('Probing reveals a secret door.');
        else if (Is_rogue_level(game.u?.uz))
            draft_message(false);
        return true;
    }
    if ((lev.typ | 0) === SCORR) {
        lev.typ = CORR;
        unblock_point(x, y);
        newsym(x, y);
        await pline('Probing exposes a secret corridor.');
        return true;
    }
    return false;
}
/* C engrave.c:1663-1677 rloc_engr(ep) — randomly relocate an engraving.
 *     int tx, ty, tryct = 200;
 *     do {
 *         if (--tryct < 0) return;
 *         tx = rn1(COLNO - 3, 2);
 *         ty = rn2(ROWNO);
 *     } while (engr_at(tx, ty) || !goodpos(tx, ty, (struct monst *) 0, 0));
 *     ep->engr_x = tx; ep->engr_y = ty; newsym(tx, ty);
 * Not exported from js/mklev.js (the engraving-store owner), so this is a
 * local copy operating through that module's exported engr_at/del_engr_at/
 * make_engr_at.  The store is keyed by (x,y) rather than by struct pointer,
 * so "move" is delete-at-old + recreate-at-new (same text/pristine/type) —
 * observationally identical to C's mutate-in-place, and goodpos(tx,ty,null,0)
 * draws no RNG of its own (the S_EEL rn2(13) branch requires a non-null
 * mtmp), matching C's `(struct monst *) 0` argument exactly. */
function _zap_rloc_engr(x, y) {
    const e = engr_at(x, y);
    if (!e)
        return;
    let tx, ty, tryct = 200;
    do {
        if (--tryct < 0)
            return;
        tx = rn1(COLNO_ZAP - 3, 2);
        ty = rn2(ROWNO_ZAP);
    } while (engr_at(tx, ty) || !goodpos(tx, ty, null, 0));
    del_engr_at(x, y);
    make_engr_at(tx, ty, e.text, e.pristine, 0, e.engr_type);
    newsym(tx, ty);
}
/* C dungeon.h:132 Is_qstart(x) = Lcheck(x, &qstart_level).  js/cmd.js's own
 * _Is_qstart is file-local (not exported), so this re-derives the same
 * dnum/dlevel compare from game.qstart_level, the published field js/cmd.js
 * itself reads at line ~48834. */
function _is_qstart_zp(uz) {
    const q = game.qstart_level;
    return !!(q && uz && uz.dnum === q.dnum && uz.dlevel === q.dlevel);
}
async function zap_updown(obj) {
    const g = game, u = g.u;
    let disclose = false;
    const x = u.ux | 0, y = u.uy | 0;
    const otyp = obj ? (obj.otyp | 0) : 0;

    /* C zap.c:3245-3410: the switch on obj->otyp.  Most cases (drawbridge/
     * portcullis toggling, WAN_PROBING, trapdoor/hole transforms) remain a
     * named gap — see the function comment above.  The WAN_STRIKING/
     * SPE_FORCE_BOLT up-zap "falling rock" arm (zap.c:3299-3313) is ported
     * here: unlike its siblings it needs no drawbridge/trap helper, only
     * mksobj_at/stackobj (already used elsewhere in this file's zap paths)
     * and hard_helmet (do_wear.js). */
    if ((otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT) && (u.dz | 0) < 0
        && rn2(3) && !Is_airlevel(u.uz) && !Is_waterlevel(u.uz)
        && !u.uinwater && !_is_qstart_zp(u.uz)) {
        await pline(`A rock is dislodged from the ${ceiling(x, y)} and falls on your ${body_part(HEAD)}.`);
        const dmg = rnd(hard_helmet(u.uarmh) ? 2 : 6);
        await losehp(_zap_Maybe_Half_Phys(dmg), 'falling rock', KILLED_BY_AN);
        const otmp = await mksobj_at(ZP_ROCK, x, y, false, false);
        if (otmp) {
            xname(otmp);
            await stackobj(otmp);
        }
        newsym(x, y);
    }

    /* C zap.c:3269-3278 — striking down through an open drawbridge destroys
     * it before the trapdoor/hole handling below. */
    const downTile = g.level?.at(x, y);
    if ((otyp === WAN_OPENING || otyp === SPE_KNOCK) && is_db_wall(x, y)) {
        const bx = { value: x | 0 }, by = { value: y | 0 };
        if (find_drawbridge(bx, by)) {
            await open_drawbridge(bx.value, by.value);
            disclose = true;
        }
    }
    if (u.dz > 0 && (otyp === WAN_LOCKING || otyp === SPE_WIZARD_LOCK)
        && (downTile?.typ | 0) === DRAWBRIDGE_DOWN) {
        await close_drawbridge(x, y);
        disclose = true;
    }
    if (u.dz > 0 && (otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT)
        && (downTile?.typ | 0) === DRAWBRIDGE_DOWN) {
        await destroy_drawbridge(x, y);
        disclose = true;
    }

    /* C zap.c:3326-3352 — striking breaks a trapdoor into a hole; locking
     * changes an existing hole back into a trapdoor.  This is deliberately
     * before the shared bhitpile/map tail: the trap mutation is the immediate
     * effect of the downward zap, and striking must trigger the new hole. */
    if (u.dz > 0
        && (otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT
            || otyp === WAN_LOCKING || otyp === SPE_WIZARD_LOCK)) {
        const striking = otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT;
        const ttmp = t_at(x, y);
        if (ttmp) {
            /* C zap.c:3337-3338: locking down closes a bear trap or web on the hero */
            const noticed = { value: disclose };
            const closed = !striking && await closeholdingtrap(g.youmonst, noticed);
            disclose = noticed.value;
            if (closed) {
                ; /* now stuck in web or bear trap */
            } else if (striking && (ttmp.ttyp | 0) === TRAPDOOR) {
                if (_Blind() && !ttmp.tseen) {
                    await pline('Something beneath you shatters.');
                } else if (!ttmp.tseen) {
                    await pline("There's a trapdoor beneath you; it shatters.");
                } else {
                    await pline('The trapdoor beneath you shatters.');
                    disclose = true;
                }
                ttmp.ttyp = HOLE;
                ttmp.tseen = 1;
                newsym(x, y);
                await dotrap(ttmp, 0);
            } else if (!striking && (ttmp.ttyp | 0) === HOLE) {
                if (_Blind() || !ttmp.tseen) {
                    await pline(`Some ${is_ice(x, y) ? 'frost' : 'dust'} swirls beneath you.`);
                } else {
                    ttmp.tseen = 1;
                    newsym(x, y);
                    await pline('A trapdoor appears beneath you.');
                    disclose = true;
                }
                ttmp.ttyp = TRAPDOOR;
            }
        }
    }

    /* C zap.c:3380-3406 — the shared tail, run regardless of which switch
     * case (if any) fired above, EXCEPT WAN_PROBING which returns earlier. */
    if (u.dz > 0) {
        /* zapping downward */
        await bhitpile(obj, bhito, x, y, u.dz);
        /* C zap.c:3388-3389: `if (!map_zapped) zap_map(x, y, obj);` —
         * map_zapped is declared FALSE and never set (its one assignment is
         * commented out, "not needed due to early return"), so this call is
         * unconditional. */
        await _zap_map_engraving(x, y, obj);
    } else if (u.dz < 0) {
        /* zapping upward: game flavor, hits whatever the hero is hiding
         * under (zap.c:3383-3395). */
        if (u.uundetected && _hides_under_zp(g.youmonst && g.youmonst.data)) {
            const otmp = g.level?.levelObjects?.[x]?.[y] || null;
            if (otmp) {
                const hitit = await bhito(otmp, obj);
                if (hitit) {
                    hideunder(g.youmonst);
                    disclose = true;
                }
            }
        }
    }
    return disclose;
}

export async function weffects(obj) {
    const g = game;
    const otyp = obj ? (obj.otyp | 0) : 0;
    g._oc_name_known = g._oc_name_known || {};
    const was_unkn = !g._oc_name_known[otyp];
    exercise(A_WIS, true);
    /* C zap.c:3429: disclose stays FALSE unless a branch sets it (steed or the
     * directional RAY/spell else-branch); IMMEDIATE and NODIR do NOT disclose. */
    let disclose = false;
    const dir = oc_dir_of(otyp);
    if (dir === IMMEDIATE) {
        const udz = (g.u.dz | 0);
        zapsetup();                       /* C zap.c:3437 — reset obj_zapped */
        if (g.u.uswallow) {
            /* C zap.c:3438-3439: (void) bhitm(u.ustuck, obj); — no range draw */
            await bhitm(g.u.ustuck, obj);
        } else if (udz) {
            /* C zap.c:3446: disclose = zap_updown(obj); */
            disclose = await zap_updown(obj);
        } else {
            await _bhit_zapped_wand(g.u.dx | 0, g.u.dy | 0, rn1(8, 6), obj);
        }
        await zapwrapup();                /* C zap.c:3448 — obj_zapped feedback */
    }
    else if (dir === NODIR) {
        /* C zap.c:3449-3450: zapnodir(obj); */
        await zapnodir(obj);
    }
    else {
        if (otyp === WAN_DIGGING || otyp === SPE_DIG) {
            await zap_dig();
        }
        else if (otyp >= SPE_MAGIC_MISSILE && otyp <= SPE_FINGER_OF_DEATH) {
            const bz = (Math.abs(otyp - SPE_MAGIC_MISSILE) % 10);
            await ubuzz(10 + bz /* BZ_U_SPELL */, ((g.u.ulevel | 0) >> 1) + 1);
        }
        else if (otyp >= WAN_MAGIC_MISSILE && otyp <= WAN_LIGHTNING) {
            const bz = (Math.abs(otyp - WAN_MAGIC_MISSILE) % 10);
            await ubuzz(bz /* BZ_U_WAND */, (otyp === WAN_MAGIC_MISSILE) ? 2 : 6);
        }
        if (game._pendingDeath)
            return;
        disclose = true;
    }
    if (disclose) {
        learnwand(obj);
        if (was_unkn)
            more_experienced_faithful(0, 10);
    }
}

async function _bhit_zapped_wand(ddx, ddy, range, obj) {
    const g = game, u = g.u;
    let x = u.ux | 0, y = u.uy | 0;
    let shopdoor = false; /* C zap.c:3839 */
    g.bhitpos = { x, y };
    while (range-- > 0) {
        x += ddx; y += ddy;
        g.bhitpos.x = x; g.bhitpos.y = y;
        if (!isok(x, y)) { g.bhitpos.x = x - ddx; g.bhitpos.y = y - ddy; break; }
        await _zap_map_probing(x, y, obj);
        const mtmp = m_at(x, y);
        if (mtmp) {
            if (await _bhitm_wand(mtmp, obj))
                return;
            range -= 3;
        }
        /* C zap.c:4046-4048:
         *     if (fhito) { if (bhitpile(obj, fhito, x, y, 0)) range--; }
         * fhito is bhito for every ZAPPED_WAND call from weffects(). */
        if (await bhitpile(obj, bhito, x, y, 0))
            range--;
        const typ = _buzz_typ(x, y);
        /* C zap.c:4056-4075: a ZAPPED_WAND crossing a door (or secret door)
         * runs doorlock() for opening/locking/striking/knock/wizard lock/
         * force bolt; a broken shop door is put on the repair list. */
        if ((typ === DOOR || typ === SDOOR)) {
            switch (obj.otyp | 0) {
            case WAN_OPENING: case WAN_LOCKING: case WAN_STRIKING:
            case SPE_KNOCK: case SPE_WIZARD_LOCK: case SPE_FORCE_BOLT:
                if (await doorlock(obj, x, y)) {
                    if (cansee(x, y) || ((obj.otyp | 0) === WAN_STRIKING && !Deaf_zap()))
                        learnwand(obj);
                    const dl = game.level?.at?.(x, y);
                    if (dl && (dl.doormask | 0) === D_BROKEN
                        && in_rooms(x, y, SHOPBASE).length) {
                        shopdoor = true;
                        add_damage(x, y, SHOP_DOOR_COST);
                    }
                }
                break;
            }
        }
        if (!ZAP_POS(typ) || (closed_door(x, y) && range >= 0)) {
            /* C zap.c:4098: ray stops at wall/closed door (no bounce for wands). */
            break;
        }
    }
    /* C zap.c:4129-4130 */
    if (shopdoor)
        await pay_for_damage('destroy', false);
}

/* C zap.c:1657: (const char *)((force < 0) ? "?" : (force <= 4) ? "." : "!") */
function _wand_exclam(force) {
    return (force < 0) ? '?' : ((force <= 4) ? '.' : '!');
}
/* C you.h:240 #define Role_if(X) (gu.urole.mnum == (X)) — local copy, same
 * pattern already used standalone in js/cmd.js, js/potion.js, js/uhitm.js
 * (one per file rather than a shared export). */
function _wand_Role_if(pm) {
    return ((game.urole && game.urole.mnum) | 0) === (pm | 0);
}
/* pm.generated.js PM_KNIGHT — role monster number, used only for the
 * dbldam check (zap.c:165), never as a table index. */
const _WAND_PM_KNIGHT = 335;
/* C zap.c:551-565: bhitm's shared post-switch epilogue, common to every case
 * (including WAN_STRIKING / SPE_FORCE_BOLT).  `wake` is TRUE for every arm
 * this file wires through this helper (nothing here ever sets it FALSE).
 *   if (wake && !DEADMONSTER(mtmp)) {
 *       wakeup(mtmp, helpful_gesture ? FALSE : TRUE);
 *       m_respond(mtmp);
 *       if (mtmp->isshk && !*u.ushops) hot_pursuit(mtmp);
 *   }
 *   if (reveal_invis && !DEADMONSTER(mtmp)) {
 *       if (cansee(bhitpos) && !canspotmon(mtmp)) map_invisible(...);
 *   }
 *   if (learn_it) learnwand(otmp);
 *   return ret; -- ret is always 0 for the arms that call this helper. */
export async function _bhitm_wand_epilogue(mtmp, helpful_gesture, reveal_invis, learn_it, obj) {
    const g = game;
    if (!DEADMONSTER(mtmp)) {
        await wakeup_attack(mtmp, !helpful_gesture);
        await m_respond(mtmp);
        if (mtmp.isshk && !(g.u && g.u.ushops && g.u.ushops[0]))
            hot_pursuit(mtmp);
    }
    if (reveal_invis && !DEADMONSTER(mtmp)) {
        const bx = g.bhitpos ? (g.bhitpos.x | 0) : 0;
        const by = g.bhitpos ? (g.bhitpos.y | 0) : 0;
        if (cansee(bx, by) && !canspotmon(mtmp))
            map_invisible(bx, by);
    }
    if (learn_it && obj)
        learnwand(obj);
    return 0;
}

async function _bhitm_wand(mtmp, obj) {
    const otyp = obj ? (obj.otyp | 0) : 0;
    if (otyp === WAN_STRIKING || otyp === SPE_FORCE_BOLT) {
        /* C zap.c:190-191: reveal_invis = TRUE; learn_it = cansee(bhitpos);
         * -- set BEFORE the resists_magm branch, so "Boing!" retains
         * whatever visibility gave it, matching every other exit path
         * through this case. */
        let learn_it = cansee(game.bhitpos ? (game.bhitpos.x | 0) : 0,
                              game.bhitpos ? (game.bhitpos.y | 0) : 0);
        /* C zap.c:198: resists_magm — magic-resistant monster: "Boing!", no roll. */
        if (_resists_magm(mtmp)) {
            shieldeff_real(mtmp.mx | 0, mtmp.my | 0);
            await pline('Boing!');
            return _bhitm_wand_epilogue(mtmp, false, true, learn_it, obj);
        }
        /* C zap.c:201: u.uswallow || rnd(20) < 10 + find_mac(mtmp). */
        if ((game.u.uswallow | 0) || rnd(20) < 10 + find_mac(mtmp)) {
            let dmg = d(2, 12); /* C zap.c:204 */
            /* C zap.c:165: dbldam = Role_if(PM_KNIGHT) && u.uhave.questart. */
            const dbldam = _wand_Role_if(_WAND_PM_KNIGHT)
                && !!(game.u.uhave && game.u.uhave.questart);
            if (dbldam) dmg *= 2;
            if (otyp === SPE_FORCE_BOLT) dmg = spell_damage_bonus(dmg);
            /* C zap.c:212: hit(zap_type_text, mtmp, exclam(dmg)); */
            hit(otyp === WAN_STRIKING ? 'wand' : 'spell', mtmp, _wand_exclam(dmg));
            /* C zap.c:213: (void) resist(mtmp, otmp->oclass, dmg, TELL); —
             * mtmp.mhp / DEADMONSTER bookkeeping happens INSIDE resist(). */
            await resist(mtmp, (obj.oclass | 0), dmg, 1 /* TELL */);
        } else {
            /* C zap.c:214-216: miss(zap_type_text, mtmp); learn_it = FALSE; */
            miss(otyp === WAN_STRIKING ? 'wand' : 'spell', mtmp);
            learn_it = false;
        }
        return _bhitm_wand_epilogue(mtmp, false, true, learn_it, obj);
    }
    if (otyp === WAN_LOCKING || otyp === SPE_WIZARD_LOCK) {
        /* C zap.c:369-374:
         *     if (disguised_mimic && box_or_door(mtmp))
         *         that_is_a_mimic(mtmp, MIM_REVEAL);
         *     wake = closeholdingtrap(mtmp, &learn_it);
         *     break;
         * that_is_a_mimic() lives in js/uhitm.js, unexported and out of this
         * file's edit scope (single-file ownership) — it is message-only and
         * draws no RNG, so the disguise-reveal topline is a named display gap,
         * not an RNG gap.  closeholdingtrap IS ported (js/trap.js:5149) and
         * carries the real RNG-visible effect (mintrap/dotrap). */
        const noticed = { value: false };
        const wake = await closeholdingtrap(mtmp, noticed);
        const learn_it = noticed.value;
        /* C zap.c:551-557:
         *     if (wake && !DEADMONSTER(mtmp)) {
         *         wakeup(mtmp, helpful_gesture ? FALSE : TRUE);
         *         m_respond(mtmp);
         *         if (mtmp->isshk && !*u.ushops)
         *             hot_pursuit(mtmp);
         *     }
         * helpful_gesture is only set TRUE by the WAN_SPEED_MONSTER arm, so it
         * is FALSE here and via_attack is always TRUE. */
        if (wake && !DEADMONSTER(mtmp)) {
            await wakeup_attack(mtmp, true);
            await m_respond(mtmp);
            const g = game;
            if (mtmp.isshk && !(g.u && g.u.ushops && g.u.ushops[0]))
                hot_pursuit(mtmp);
        }
        /* C zap.c:559-565: reveal_invis stays FALSE on this arm (only a few
         * other otyps set it), so the map_invisible() branch never fires here. */
        /* C zap.c:570-571: if (learn_it) learnwand(otmp); */
        if (learn_it)
            learnwand(obj);
        /* C zap.c:571: return ret; — ret is only assigned on the SPE_KNOCK
         * knockback arm (a different otyp), so this arm always returns 0/falsy
         * — the ray keeps going past this monster, unlike a hit that stops it. */
        return 0;
    }
    if (otyp === WAN_OPENING || otyp === SPE_KNOCK) {
        /* C zap.c:382-431:
         *     if (disguised_mimic && box_or_door(mtmp))
         *         that_is_a_mimic(mtmp, MIM_REVEAL);
         *     wake = FALSE;
         *     if (mtmp == u.ustuck) {
         *         release_hold();
         *         learn_it = TRUE;
         *     } else if (openholdingtrap(mtmp, &learn_it)) {
         *         break;
         *     } else if (openfallingtrap(mtmp, TRUE, &learn_it)) {
         *         break;
         *     } else if (otyp == SPE_KNOCK) {
         *         wake = TRUE; ret = 1;
         *         if (mtmp->data->msize < MZ_HUMAN && !m_is_steadfast(mtmp)) {
         *             ... "is knocked back!" ...
         *             mhurtle(mtmp, mtmp->mx - u.ux, mtmp->my - u.uy, rnd(2));
         *         } else {
         *             ... "doesn't budge." ...
         *         }
         *         if (!DEADMONSTER(mtmp)) {
         *             wakeup(mtmp, !mindless(mtmp->data));
         *             abuse_dog(mtmp);
         *         }
         *     } else if ((obj = which_armor(mtmp, W_SADDLE)) != 0) {
         *         ... saddle falls off, mdrop_obj(mtmp, obj, FALSE) ...
         *     }
         *     break;
         * that_is_a_mimic()/box_or_door() live in js/uhitm.js, unexported and
         * out of this file's edit scope — message-only, no RNG (same named
         * gap as the WAN_LOCKING arm above).  which_armor()/mdrop_obj(): the
         * WAN_OPENING-only saddle-drop tail needs mdrop_obj (js/steal.js,
         * unexported) — named gap, RNG-free on that path too
         * (steal.c:mdrop_obj draws nothing).  m_is_steadfast (uhitm.c) is
         * approximated FALSE — the loadstone/Giantslayer/mounted-loadstone
         * TRUE cases are all rare equipment states this isolated bhitm call
         * has no reliable way to resolve; is_flyer/is_floater targets still
         * return FALSE from the real C function (a flying target is NOT
         * steadfast), so this only mis-fires on the artifact/loadstone edge.
         */
        let wake = false;
        let learn_it = false;
        let ret = 0;
        const u = game.u || {};
        if (u.ustuck && mtmp === u.ustuck) {
            await release_hold();
            learn_it = true;
        } else {
            const noticedHolding = { value: false };
            const stoppedByHolding = await openholdingtrap(mtmp, noticedHolding);
            /* C passes &learn_it to both callees, which set it whether or
               not they return TRUE (openfallingtrap sets *noticed before
               mintrap, whose Trap_Effect_Finished makes it return FALSE). */
            learn_it = noticedHolding.value;
            if (stoppedByHolding) {
                /* C: break — no further effect on this arm. */
            } else {
                const noticedFalling = { value: false };
                const stoppedByFalling = await openfallingtrap(mtmp, true, noticedFalling);
                learn_it = learn_it || noticedFalling.value;
                if (stoppedByFalling) {
                    /* C: break */
                } else if (otyp === SPE_KNOCK) {
                    wake = true;
                    ret = 1;
                    if (((mtmp.data?.msize) | 0) < _ZK_MZ_HUMAN && !_m_is_steadfast(mtmp)) {
                        if (canseemon(mtmp))
                            await pline(`${Monnam(mtmp)} is knocked back!`);
                        await mhurtle(mtmp, (mtmp.mx | 0) - (u.ux | 0),
                                      (mtmp.my | 0) - (u.uy | 0), rnd(2));
                    } else {
                        if (canseemon(mtmp))
                            await pline(`${Monnam(mtmp)} doesn't budge.`);
                    }
                    if (!DEADMONSTER(mtmp)) {
                        await wakeup_attack(mtmp, !_mindless(mtmp.data));
                        abuse_dog(mtmp);
                    }
                }
                /* else: WAN_OPENING saddle-drop tail — named gap above. */
            }
        }
        void wake;
        if (learn_it)
            learnwand(obj);
        return ret;
    }
    if (otyp === WAN_SLOW_MONSTER || otyp === SPE_SLOW_MONSTER) {
        /* C zap.c:218-232: resist() saving throw, then mon_adjust_speed(-1).
         * seemimic() is the same message-only named gap as the arms below;
         * the engulfing_u whirly expels() tail is likewise a named gap
         * (expels lives in uhitm.c, outside this file's scope). */
        if (!await resist(mtmp, (obj.oclass | 0), 0, 0 /* NOTELL */)) {
            mon_adjust_speed(mtmp, -1, obj);
            check_gear_next_turn(mtmp);
        }
        return _bhitm_wand_epilogue(mtmp, false, false, false, obj);
    }
    if (otyp === WAN_MAKE_INVISIBLE) {
        /* C zap.c:348-367 */
        const oldinvis = mtmp.minvis | 0;
        const couldsee = canseemon(mtmp);
        const disguised_mimic = ((mtmp.data?.mlet | 0) === 18 /* S_MIMIC */)
            && (mtmp.m_ap_type | 0) !== 0;
        let learn_it = false, reveal_invis = false;
        if (disguised_mimic)
            seemimic(mtmp);
        /* format monster's name before altering its visibility */
        const nambuf = Monnam(mtmp);
        mon_set_minvis(mtmp, false);
        /* display.h _knowninvisible(mon) */
        const bl = _Blind();
        const knowninv = !!(mtmp.minvis
            && ((cansee(mtmp.mx | 0, mtmp.my | 0)
                 && (_uhas(SEE_INVIS) || _uhas(DETECT_MONSTERS)))
                || (!bl && ((game.u?.uprops?.[TELEPAT]?.extrinsic | 0)
                            || ((game.u?.uprops?.[TELEPAT]?.intrinsic | 0) & ~INTRINSIC))
                    && dist2(mtmp.mx | 0, mtmp.my | 0, game.u.ux | 0, game.u.uy | 0)
                        <= BOLT_LIM * BOLT_LIM)));
        if (!oldinvis && knowninv) {
            await pline(`${nambuf} turns transparent!`);
            reveal_invis = true;
            learn_it = true;
        } else if (couldsee && !canseemon(mtmp)) {
            await pline(`${nambuf} vanishes!`);
        }
        return _bhitm_wand_epilogue(mtmp, false, reveal_invis, learn_it, obj);
    }
    if (otyp === WAN_SPEED_MONSTER) {
        /* C zap.c:233-242: resist(), mon_adjust_speed(+1); helpful_gesture
         * is set unconditionally (wake but don't anger a peaceful). */
        if (!await resist(mtmp, (obj.oclass | 0), 0, 0 /* NOTELL */)) {
            mon_adjust_speed(mtmp, 1, obj);
            check_gear_next_turn(mtmp);
        }
        return _bhitm_wand_epilogue(mtmp, true, false, false, obj);
    }
    if (otyp === WAN_CANCELLATION || otyp === SPE_CANCELLATION) {
        /* C zap.c:335-339:
         *     case WAN_CANCELLATION:
         *     case SPE_CANCELLATION:
         *         if (disguised_mimic) seemimic(mtmp);
         *         (void) cancel_monst(mtmp, otmp, TRUE, TRUE, FALSE);
         *         break;
         * seemimic() lives in js/uhitm.js, unexported and out of this file's
         * edit scope (single-file ownership) — message-only, no RNG, the same
         * named gap as the WAN_LOCKING/WAN_OPENING arms above.  cancel_monst
         * IS already fully ported in this file (its !youdefend half draws the
         * resist() saving throw this case needs); this arm was simply never
         * wired to call it.  reveal_invis and learn_it are never set on this
         * arm, so both stay FALSE through the shared epilogue. */
        await cancel_monst(mtmp, obj, true, true, false);
        return _bhitm_wand_epilogue(mtmp, false, false, false, obj);
    }
    if (otyp === WAN_TELEPORTATION || otyp === SPE_TELEPORT_AWAY) {
        /* C zap.c:341-347:
         *     if (disguised_mimic) seemimic(mtmp);
         *     reveal_invis = !u_teleport_mon(mtmp, TRUE);
         *     learn_it = canspotmon(mtmp);
         *     break;
         * seemimic() is the same message-only, RNG-free named gap as the
         * WAN_LOCKING/WAN_OPENING/WAN_CANCELLATION arms above. */
        const reveal_invis = !(await u_teleport_mon(mtmp, true));
        const learn_it = canspotmon(mtmp);
        return _bhitm_wand_epilogue(mtmp, false, reveal_invis, learn_it, obj);
    }
    if (otyp === WAN_POLYMORPH || otyp === SPE_POLYMORPH || otyp === _BHITM_POT_POLYMORPH) {
        /* C zap.c:263-333 WAN_POLYMORPH/SPE_POLYMORPH/POT_POLYMORPH — monster
         * polymorph.  This case was entirely MISSING from _bhitm_wand (every
         * otyp fell to the closing `return 0`), so a wand-of-polymorph zap at
         * a monster consumed ZERO of C's resist()/rn2(25)/newcham RNG and fell
         * through into bhitpile() on the same tile instead — the
         * cfn-never-drawn-in-js divergence this port fixes.
         * reveal_invis stays FALSE through this arm (only WAN_STRIKING/
         * SPE_FORCE_BOLT and WAN_UNDEAD_TURNING set it), so the shared
         * epilogue is always called with (false, false, learn_it, obj). */
        let learn_it = false;
        const isLongWorm = !!(mtmp.data && (mtmp.data.pmidx | 0) === PM_LONG_WORM);
        if (isLongWorm && MCORPSENM(mtmp) !== NON_PM) {
            /* C zap.c:265-268: already polymorphed by the current zap
             * (mcorpsenm set below); don't affect it again. */
        } else if (resists_magm(mtmp)) {
            await shieldeff_mon(mtmp);
        } else if (!await resist(mtmp, (obj.oclass | 0), 0, 0 /* NOTELL */)) {
            const polyspot = (otyp !== _BHITM_POT_POLYMORPH);
            const give_msg = !_Halluc() && (canseemon(mtmp) || engulfing_u(mtmp));

            /* C zap.c:283-285: dropped inventory from system shock or shape
             * loss won't be hit by this same zap. */
            if (polyspot) {
                for (let o = mtmp.minvent; o; o = o.nobj)
                    bypass_obj(o);
            }

            if ((mtmp.cham | 0) === NON_PM && !rn2(25)) {
                /* C zap.c:289-297: natural (non-shapechanger) system shock. */
                if (canseemon(mtmp)) {
                    await pline(`${Monnam(mtmp)} shudders!`);
                    learn_it = true;
                }
                await xkilled(mtmp, XKILL_GIVEMSG | XKILL_NOCORPSE);
            } else {
                let ncflags = NO_NC_FLAGS;
                if (polyspot) ncflags |= NC_VIA_WAND_OR_SPELL;
                if (give_msg) ncflags |= NC_SHOW_MSG;
                /* C zap.c:305-315: newcham(mtmp, NULL, ncflags) picks a random
                 * shape; on failure (not enough eligible candidates, mostly a
                 * vampshifter) retry once reverting to mtmp->cham's own form.
                 * newcham's mdat is an mndx here (this port's convention), so
                 * NULL becomes null and &mons[mtmp->cham] becomes mtmp.cham. */
                if (await newcham(mtmp, null, ncflags) !== 0
                    || (ismnum(mtmp.cham | 0)
                        && await newcham(mtmp, (mtmp.cham | 0), ncflags) !== 0)) {
                    if (give_msg && (canspotmon(mtmp) || engulfing_u(mtmp)))
                        learn_it = true;
                }
            }

            /* C zap.c:319-331: a long worm hit by this zap (whether or not the
             * polymorph itself succeeded) is flagged so a later hit on its own
             * tail this same zap doesn't transform it again. */
            if (!DEADMONSTER(mtmp)
                && mtmp.data && (mtmp.data.pmidx | 0) === PM_LONG_WORM) {
                /* newmcorpsenm() only allocates mtmp->mextra when absent and
                 * seeds it NON_PM, which the very next line overwrites — so
                 * the net effect is "ensure mextra exists, then set it". */
                mtmp.mextra = mtmp.mextra || {};
                mtmp.mextra.mcorpsenm = PM_LONG_WORM;
                game.context = game.context || {};
                game.context.bypasses = true;
            }
        }
        return _bhitm_wand_epilogue(mtmp, false, false, learn_it, obj);
    }
    return 0;
}

export async function potionhit_polymorph(mtmp, obj) {
    return await _bhitm_wand(mtmp, obj);
}
/* C mondata.h:64 mindless(ptr) = (mflags1 & M1_MINDLESS) != 0.  File-local
 * copy — same pattern as this file's own DEADMONSTER above; js/mhitm.js and
 * js/music.js each carry their own unexported copy too. */
const _ZK_M1_MINDLESS = 0x00010000;
function _mindless(ptr) {
    return !!(((ptr?.mflags1) | 0) & _ZK_M1_MINDLESS);
}
const _ZK_MZ_HUMAN = 2; /* monflag.h MZ_HUMAN (== MZ_MEDIUM) */
/* C uhitm.c:5217-5241 m_is_steadfast — equipment/terrain check that protects
 * a monster from knockback.  Conservative FALSE default: TRUE requires
 * wielding artifact ART_GIANTSLAYER or carrying LOADSTONE (mtmp or, when
 * mtmp is the ridden steed, the hero) while grounded — all rare states this
 * isolated per-record call has no reliable equipment chain to resolve.  A
 * flying/floating/air-level/bubble target still returns FALSE from the real
 * C function (not steadfast), so this default matches C exactly on that
 * half of the branch and only risks the artifact/loadstone edge. */
function _m_is_steadfast(_mtmp) {
    return false;
}
export async function release_hold() {
    const u = game.u || {};
    const mtmp = u.ustuck;
    if (!mtmp) {
        /* C: impossible("release_hold when not held?"); — state guard only. */
        return;
    }
    if (u.uswallow) { /* zap.c:583 — possible for sticky hero to be swallowed */
        const mndx = (mtmp.mndx ?? mtmp.mnum) | 0;
        if (_expl_digests(mtmp)) {
            if (!_Blind())
                await pline(`${Monnam(mtmp)} opens its mouth!`);
            else
                await pline('You feel a sudden rush of air!');
        }
        /* gives "you get regurgitated" or "you get expelled from <mon>" */
        await expels_gu(mtmp, mndx, true);
        return;
    }
    if (sticks(game.youmonst && game.youmonst.data)) {
        /* C: set_ustuck(NULL); You("release %s.", mon_nam(mtmp)); */
        set_ustuck(null);
        await pline(`You release ${mon_nam(mtmp)}.`);
    } else {
        await unstuck(mtmp);
        const relbuf = ((mtmp.data?.mflags1 | 0) & 0x00002000) /* M1_NOHANDS */
            ? `by ${mon_nam(mtmp)}`
            : `from ${s_suffix(mon_nam(mtmp))} grasp`;
        await pline(`You are released ${relbuf}.`);
    }
}

/* C zap.c:160 bhitm — shared monster target arm used by broken wands.
 * Keep the existing complete wand dispatcher behind a public call-site
 * wrapper so apply.c's do_break_wand can reuse the same effect semantics. */
export async function bhitm(mtmp, obj) {
    return await _bhitm_wand(mtmp, obj);
}

/* C resists_magm — monster has magic resistance (permonst.mr-based or via item).
 * Conservative default false; widen to the per-mndx mr table when an IMMEDIATE
 * zap lands on a magic-resistant monster. */
function _resists_magm(mtmp) { return resists_magm(mtmp); }
async function backfire(otmp) {
    otmp.in_use = true;                /* in case losehp() is fatal */
    await pline(`${The(xname(otmp))} suddenly explodes!`);
    const dmg = d((otmp.spe | 0) + 2, 6);
    await losehp(_zap_Maybe_Half_Phys(dmg), 'exploding wand', KILLED_BY_AN);
    _backfire_useupall(otmp);
}
/* C hack.h Maybe_Half_Phys(dmg) = Half_physical_damage ? (dmg+1)/2 : dmg. */
function _zap_Maybe_Half_Phys(dmg) {
    const up = game.u && game.u.uprops && game.u.uprops[_ZAP_HALF_PHDAM];
    const on = up && ((up.intrinsic | 0) || (up.extrinsic | 0));
    return on ? Math.trunc((dmg + 1) / 2) : dmg;
}
const _ZAP_HALF_PHDAM = 56;   /* const.js:2353 HALF_PHDAM */
/* C invent.c useupall(obj) = freeinv(obj) + obfree(obj).  js/cmd.js's useupall
 * is file-local, and importing more of cmd.js here closes no new cycle but
 * exports nothing usable, so unlink from gi.invent directly — the same
 * unlink the file's own useupf() path performs. */
function _backfire_useupall(obj) {
    const g = game;
    let prev = null;
    for (let o = g.invent; o; prev = o, o = o.nobj) {
        if (o === obj) {
            if (prev) prev.nobj = o.nobj; else g.invent = o.nobj;
            o.nobj = null;
            o.where = 0;               /* OBJ_FREE */
            const store = g.__bridge__ || (g.__bridge__ = {});
            const key = 'objs_deleted.count';
            const cur = store[key] !== undefined ? Number(store[key]) : 0;
            store[key] = String(cur + 1);
            break;
        }
    }
    if (g.u) {
        if (g.u.uwep === obj) g.u.uwep = null;
        if (g.u.uswapwep === obj) g.u.uswapwep = null;
        if (g.u.uquiver === obj) g.u.uquiver = null;
    }
}
/* C mondata.h:52 nohands(ptr) = ((ptr)->mflags1 & M1_NOHANDS) != 0.
 * monflag.h:98 M1_NOHANDS = 0x00002000.  Reads the hero's CURRENT form, so a
 * polymorph is covered; same shape as js/lock.js:1610-1626 _nohands_lk(), which
 * doopen/doclose already use. */
const M1_NOHANDS_ZP = 0x00002000;
function _nohands_zp() {
    const d = game.youmonst && game.youmonst.data;
    return !!(((d && d.mflags1) >>> 0) & M1_NOHANDS_ZP);
}
/* C zap.c:2613-2618 —
 *     static int
 *     zap_ok(struct obj *obj)
 *     {
 *         if (obj && obj->oclass == WAND_CLASS)
 *             return GETOBJ_SUGGEST;
 *         return GETOBJ_EXCLUDE;
 *     }
 * Note the null-object arm is EXCLUDE, so getobj's `allownone` stays false and
 * "zap" is one of C's ALWAYS-early-out verbs (invent.c:1911-1914). */
function zap_ok(obj) {
    if (obj && (obj.oclass | 0) === WAND_CLASS)
        return GETOBJ_SUGGEST;
    return GETOBJ_EXCLUDE;
}

export async function dozap() {
    const g = game;
    if (_nohands_zp()) {
        await pline("You aren't able to zap anything in your current form.");
        g.context = g.context || {};
        g.context.move = 0;             /* C ECMD_OK — no time passes */
        return ECMD_OK;
    }
    if (check_capacity(null)) {
        g.context = g.context || {};
        g.context.move = 0;             /* C ECMD_OK */
        return ECMD_OK;
    }
    const obj = await getObjFromGetobj('zap', zap_ok, GETOBJ_NOFLAGS);
    /* C zap.c:2634-2635: if (!obj) return ECMD_CANCEL; */
    if (!obj) {
        g.context = g.context || {};
        g.context.move = 0;
        return ECMD_CANCEL;
    }
    /* C invent.c:2049: SET_BOTL — getobj selection sets the botl flag. */
    if (g.disp) g.disp.botl = 1;
    /* C zap.c:2637: check_unpaid(obj) — shop billing; no RNG. */
    /* C zap.c:2639: need_dir = objects[obj->otyp].oc_dir != NODIR */
    const need_dir = (oc_dir_of(obj.otyp | 0) !== NODIR);
    /* C zap.c:2640: zappable(obj) — consume a charge (rn2(121) only when spe==0). */
    if (!zappable(obj)) {
        /* C zap.c:2641: pline1(nothing_happens); */
        await pline('Nothing happens.');
        g.context.move = 1;
        return ECMD_TIME;
    }
    if (obj.cursed && !rn2(WAND_BACKFIRE_CHANCE)) {
        await backfire(obj);           /* the wand blows up in your face! */
        exercise(A_STR, false);
        /* 'obj' is gone; skip update_inventory() because
           backfire() -> useupall() -> freeinv() did it */
        g.context.move = 1;            /* ECMD_TIME */
        return ECMD_TIME;
    }
    let dx = 0, dy = 0, dz = 0, nodir_given = false;
    if (need_dir) {
        nodir_given = !(await getdir(null));
        dx = g.u.dx | 0; dy = g.u.dy | 0; dz = g.u.dz | 0;
    }
    if (need_dir && nodir_given) {
        if (!_Blind())
            await pline(`${The(xname(obj))} glows and fades.`);
    }
    /* C zap.c:2656: need_dir && !u.dx && !u.dy && !u.dz → self-directed. */
    else if (need_dir && !dx && !dy && !dz) {
        const damage = await zapyourself(obj, true);
        if (damage !== 0) {
            if (!game.svk) game.svk = {};
            if (!game.svk.killer)
                game.svk.killer = { id: 0, format: 0, name: '', next: null };
            game.svk.killer.name =
                `zapped ${game.flags?.female ? 'herself' : 'himself'} with ${killer_xname(obj)}`;
            game.svk.killer.format = NO_KILLER_PREFIX_ZAP;
            await losehp(_zap_Maybe_Half_Phys(damage), game.svk.killer.name,
                NO_KILLER_PREFIX_ZAP);
        }
    }
    else {
        await weffects(obj);
        if (!need_dir && g._pending_message) {
            _topl_stash_result();
        }
    }
    /* C zap.c:2672-2676:
     *     if (obj && obj->spe < 0) {
     *         pline("%s to dust.", Tobjnam(obj, "turn"));
     *         useupall(obj); // calls freeinv() -> update_inventory()
     *     } else
     *         update_inventory(); // maybe used a charge
     * This was a bare comment with no code, so a wand run down past its last
     * charge (zappable() above decrements spe to -1 on the roll that empties
     * it) never crumbled to dust: it sat in inventory forever at spe -1
     * instead of being freed.  RNG-free either way (useupall/update_inventory
     * are pure bookkeeping), so this cannot move the RNG-tape residual —
     * it is a screen/inventory-state fix, not an RNG one. */
    if (obj && (obj.spe | 0) < 0) {
        await pline(`${Tobjnam(obj, 'turn')} to dust.`);
        _backfire_useupall(obj); /* useupall(obj) -- freeinv() unlink, no RNG */
    } else {
        update_inventory();
    }
    if (FF_FAITHFUL) {
        g.context.move = 1; /* zapping consumes a turn (set before paging) */
        if (g._pending_message) {
            await flush_screen(1);
            if ((g.multi | 0) >= 0 && g._pending_message) {
                const rem = g._pending_message;
                const remJoins = _topl_joins_snapshot(rem);
                g._resultMessage = g._resultMessage
                    ? g._resultMessage + '  ' + rem
                    : rem;
                if (remJoins && remJoins.length && g._resultMessage === rem)
                    g._resultMessageJoins = { src: rem, joins: remJoins };
                g._pending_message = '';
            }
        }
        return ECMD_TIME;   /* C zap.c:2682 */
    }
    if (g._pending_message) {
        _topl_stash_result();
    }
    g.context.move = 1; /* zapping consumes a turn */
    return ECMD_TIME;   /* C zap.c:2682 */
}

// ── wish_history_flush support ────────────────────────────────────────────────
// C ref: nethack-c/src/zap.c:6215-6263
const MAX_WISH_HISTORY = 20;
const wish_history = new Array(MAX_WISH_HISTORY).fill(null);
let wish_history_idx = 0;

/* C zap.c:6226-6256 wish_history_add (DEBUG is defined in patchlevel.h:36). */
export function wish_history_add(buf) {
    if (!(typeof wizard === 'function' ? wizard() : wizard)) return;
    let i;
    for (i = 0; i < MAX_WISH_HISTORY; i++) {
        const idx = (wish_history_idx + i) % MAX_WISH_HISTORY;
        if (!wish_history[idx]) continue;
        if (buf.slice(0, wish_history[idx].length).toLowerCase()
            === wish_history[idx].toLowerCase()) break;
    }
    if (i === MAX_WISH_HISTORY) {
        const idx = (wish_history_idx + i) % MAX_WISH_HISTORY;
        wish_history[idx] = buf;
        wish_history_idx = (wish_history_idx + 1) % MAX_WISH_HISTORY;
    }
}

/* C zap.c:6270-6300 wish_history_menu: menu of previous wishes; returns the
 * selected text, or null when nothing was selected (buf left unmodified). */
export async function wish_history_menu() {
    /* C wintty.c: a window put up over the topline clears it, so pending
     * plines get their --More-- first (cf. optmenu.js drainTopline). */
    await flush_screen(1);
    if (game._pending_message) await force_more(game._pending_message);
    game._pending_message = '';
    const menu = new TtyMenu({ overlay: true });
    for (let i = MAX_WISH_HISTORY - 1; i >= 0; i--) {
        const idx = (wish_history_idx + i) % MAX_WISH_HISTORY;
        if (wish_history[idx])
            menu.add_menu(i + 1, 0, ATR_NONE, wish_history[idx]);
    }
    menu.end_menu('Wish what?');
    const sel = await menu.select_menu(PICK_ONE);
    if (sel.count > 0) {
        const idx = (wish_history_idx + (sel.picks[0] - 1)) % MAX_WISH_HISTORY;
        if (wish_history[idx]) return wish_history[idx];
    }
    return null;
}

/* C zap.c:6335 `wish_history[0]` test in makewish. */
export function wish_history_has() { return !!wish_history[0]; }

/**
 * Flush all wish history entries (DEBUG-only in C).
 * C source: nethack-c/src/zap.c:6251
 */
export function wish_history_flush() {
    // In C, this is wrapped in #ifdef DEBUG, but we port it faithfully.
    // The function loops through wish_history, frees each entry, and resets the index.
    for (let idx = 0; idx < MAX_WISH_HISTORY; ++idx) {
        if (wish_history[idx]) {
            // free(wish_history[idx]); — JavaScript handles garbage collection
            wish_history[idx] = null;
        }
    }
    wish_history_idx = 0;
}

/* ── C zap.c:1239-1367 cancel_item() and zap.c:3150-3213 cancel_monst() ───────
 *
 * Both were entirely absent from this port; js/zap.js's zapyourself carried
 * `cancel_monst(...) -- TODO` as its only trace of them.  Neither draws RNG on
 * the hero-defender path: cancel_monst's only draw is the `resist(mdef, ...)`
 * saving throw, and C's guard is
 *     youdefend ? (!youattack && Antimagic) : resist(mdef, obj->oclass, 0, NOTELL)
 * so a hero cancelling HERSELF (youdefend && youattack) short-circuits before
 * resist and draws nothing.  cancel_item is RNG-free outright.
 *
 * Otyps below are resolved BY NAME against the port's own object table
 * (js/oc_name_data.js OC_NAME), not counted off objects.h.
 */
const CI_RIN_ADORNMENT = 173, CI_RIN_GAIN_STRENGTH = 174,
      CI_RIN_GAIN_CONSTITUTION = 175, CI_RIN_INCREASE_ACCURACY = 176,
      CI_RIN_INCREASE_DAMAGE = 177, CI_RIN_PROTECTION = 178;
const CI_GAUNTLETS_OF_DEXTERITY = 162, CI_HELM_OF_BRILLIANCE = 96;
const CI_POT_SICKNESS = 318, CI_POT_FRUIT_JUICE = 319, CI_POT_ACID = 320,
      CI_POT_SEE_INVISIBLE = 306, CI_POT_WATER = 322;
const CI_SCR_BLANK_PAPER = 365, CI_SPE_BLANK_PAPER = 407, CI_SPE_NOVEL = 408;
const CI_CRYSTAL_BALL = 231, CI_MAGIC_LAMP = 228;
const CI_SPE_BOOK_OF_THE_DEAD_ = 409;
const CI_SCROLL_CLASS = 9, CI_SPBOOK_CLASS = 10, CI_POTION_CLASS = 8;
const CI_ARMOR_CLASS = 3, CI_WEAPON_CLASS = 2, CI_WAND_CLASS = 11;

/* C obj.h:373 carried(obj) = (obj->where == OBJ_INVENT).  This port does not
 * carry obj->where on every object; walk gi.invent, the way js/mkobj.js:243
 * _bc_carried and js/objnam.js:3002 already answer the same question. */
function _ci_carried(obj) {
    for (let o = game.invent; o; o = o.nobj)
        if (o === obj)
            return true;
    return false;
}
/* C attrib.h ABON(x) = u.abon.a[x]. */
function _ci_abon() {
    const u = game.u || (game.u = {});
    if (!u.abon) u.abon = { a: [0, 0, 0, 0, 0, 0] };
    if (!u.abon.a) u.abon.a = [0, 0, 0, 0, 0, 0];
    return u.abon.a;
}
function _ci_botl() {
    game.disp = game.disp || {};
    game.disp.botl = 1;
}
/* C shk.c costly_alteration(obj, cost_type) — bills the hero for damaging a
 * shopkeeper's goods.  Not ported here and RNG-FREE (it is a price adjustment
 * plus a shk pline); js/read.js:1681 already carries the same named stub for
 * the same reason.  Named at each of C's five call sites below rather than
 * dropped, so the gap stays visible where it belongs. */
async function _ci_costly_alteration(_obj, _cost_type) {
    return await costly_alteration_real(_obj, _cost_type);
}

/* C zap.c:1239-1367 cancel_item(struct obj *obj) */
async function cancel_item(obj) {
    const otyp = obj.otyp | 0;

    if (_ci_carried(obj)) {
        /* handle items being worn by hero */
        const worn = obj.owornmask | 0;
        switch (otyp) {
        case CI_RIN_GAIN_STRENGTH:
            if ((worn & W_RING) !== 0) {
                _ci_abon()[A_STR] -= (obj.spe | 0);
                _ci_botl();
            }
            break;
        case CI_RIN_GAIN_CONSTITUTION:
            if ((worn & W_RING) !== 0) {
                _ci_abon()[A_CON] -= (obj.spe | 0);
                _ci_botl();
            }
            break;
        case CI_RIN_ADORNMENT:
            if ((worn & W_RING) !== 0) {
                _ci_abon()[A_CHA] -= (obj.spe | 0);
                _ci_botl();
            }
            break;
        case CI_RIN_INCREASE_ACCURACY:
            if ((worn & W_RING) !== 0) {
                const u = game.u || (game.u = {});
                u.uhitinc = (u.uhitinc | 0) - (obj.spe | 0);
            }
            break;
        case CI_RIN_INCREASE_DAMAGE:
            if ((worn & W_RING) !== 0) {
                const u = game.u || (game.u = {});
                u.udaminc = (u.udaminc | 0) - (obj.spe | 0);
            }
            break;
        case CI_RIN_PROTECTION:
            if ((worn & W_RING) !== 0)
                _ci_botl();
            break;
        case CI_GAUNTLETS_OF_DEXTERITY:
            if ((worn & W_ARMG) !== 0) {
                _ci_abon()[A_DEX] -= (obj.spe | 0);
                _ci_botl();
            }
            break;
        case CI_HELM_OF_BRILLIANCE:
            if ((worn & W_ARMH) !== 0) {
                _ci_abon()[A_INT] -= (obj.spe | 0);
                _ci_abon()[A_WIS] -= (obj.spe | 0);
                _ci_botl();
            }
            break;
        default:
            if ((worn & W_ARMOR) !== 0)   /* AC */
                _ci_botl();
            break;
        }
    }

    if (MKOBJ_OC_MAGIC[otyp]
        || ((obj.spe | 0) && ((obj.oclass | 0) === CI_ARMOR_CLASS
                              || (obj.oclass | 0) === CI_WEAPON_CLASS
                              || drain_is_weptool(obj)))
        || otyp === CI_POT_ACID
        || otyp === CI_POT_SICKNESS
        || (otyp === CI_POT_WATER && (!!obj.blessed || !!obj.cursed))
        /* not magic; cancels to blank spellbook */
        || otyp === CI_SPE_NOVEL) {
        const cancelled_spe = ((obj.oclass | 0) === CI_WAND_CLASS
                               || otyp === CI_CRYSTAL_BALL) ? -1 : 0;

        if ((obj.spe | 0) !== cancelled_spe
            && otyp !== WAN_CANCELLATION      /* can't cancel cancellation */
            && otyp !== CI_MAGIC_LAMP         /* cancelling doesn't remove djinni */
            && otyp !== CANDELABRUM_OF_INVOCATION) {
            await _ci_costly_alteration(obj, 'COST_CANCEL');
            obj.spe = cancelled_spe;
        }
        switch (obj.oclass | 0) {
        case CI_SCROLL_CLASS:
            await _ci_costly_alteration(obj, 'COST_CANCEL');
            obj.otyp = CI_SCR_BLANK_PAPER;
            obj.spe = 0;
            break;
        case CI_SPBOOK_CLASS:
            if (otyp !== SPE_CANCELLATION && otyp !== CI_SPE_BOOK_OF_THE_DEAD_) {
                await _ci_costly_alteration(obj, 'COST_CANCEL');
                obj.otyp = CI_SPE_BLANK_PAPER;
                void CI_SPE_NOVEL;
            }
            break;
        case CI_POTION_CLASS:
            await _ci_costly_alteration(obj, (otyp !== CI_POT_WATER) ? 'COST_CANCEL'
                                       : obj.cursed ? 'COST_UNCURS' : 'COST_UNBLSS');
            if (otyp === CI_POT_SICKNESS || otyp === CI_POT_SEE_INVISIBLE) {
                /* C's comment: sickness is "biologically contaminated" fruit
                 * juice; see invisible tastes like "enchanted" fruit juice. */
                obj.otyp = CI_POT_FRUIT_JUICE;
            } else {
                obj.otyp = CI_POT_WATER;
                obj.odiluted = 0; /* same as any other water */
            }
            break;
        }
    }

    void 0;

    unbless(obj);
    uncurse(obj);
}

/* C zap.c:3150-3213 cancel_monst(mdef, obj, youattack, allow_cancel_kill,
 *                                self_cancel)
 *
 * Both defender arms are wired.  zapyourself's WAN_CANCELLATION arm covers
 * self-cancellation; bhitm's WAN_CANCELLATION arm reaches the monster arm.
 *
 * RETURN VALUE: FALSE means "resisted cancellation".  For youdefend &&
 * youattack C never reaches resist(), so the hero self-zap always proceeds. */
export async function cancel_monst(mdef, obj, youattack, allow_cancel_kill, self_cancel) {
    const youdefend = (mdef === game.youmonst) || !mdef;

    if (youdefend ? (!youattack && _cm_Antimagic())
                  : await resist(mdef, obj.oclass | 0, 0, NOTELL))
        return false; /* resisted cancellation */

    if (self_cancel) { /* 1st cancel inventory */
        if (youdefend) {
            for (let otmp = game.invent; otmp; otmp = otmp.nobj)
                await cancel_item(otmp);
            game.disp = game.disp || {};
            game.disp.botl = 1; /* potential AC change */
            find_ac();
            /* C: update_inventory() -- handled by caller */
        } else {
            for (let otmp = mdef.minvent; otmp; otmp = otmp.nobj)
                await cancel_item(otmp);
        }
    }

    /* now handle special cases */
    if (youdefend) {
        /* C zap.c:3176-3195 — the Upolyd branch (clay-golem death, Unchanging
         * amulet message, rehumanize()).  Upolyd is u.umonnum != u.umonster;
         * this port's polyself.js owns rehumanize(), so the branch is wired
         * through it rather than reimplemented. */
        if (_cm_Upolyd()) {
            if (_cm_Unchanging() && (game.u?.mh | 0) > 0)
                await pline('Your amulet grows hot for a moment, then cools.');
            else
                await rehumanize();
        }
    } else {
        /* C zap.c:3196-3212 — cancellation sticks to the monster and forces
         * mimics/shapeshifters back to their ordinary form.  normal_shape is
         * the canonical mon.c body; using it here also preserves mimic reveal
         * and were-form side effects instead of only changing mcan. */
        mdef.mcan = 1;
        await normal_shape(mdef);

        /* A clay golem is destroyed when cancellation restores its ordinary
         * form.  C prints this before killed()/monkilled(), so retain the
         * monster's coordinates for canseemon and corpse bookkeeping. */
        if (mdef.data && (mdef.data.pmidx | 0) === PM_CLAY_GOLEM) {
            if (canseemon(mdef))
                await pline(`${s_suffix(mon_nam(mdef))} writing vanishes!`);
            if (allow_cancel_kill) {
                if (youattack)
                    await xkilled(mdef, XKILL_GIVEMSG);
                else
                    await monkilled_trap(mdef, null);
            }
        }
    }
    return true;
}

/* C youprop.h Antimagic — EAntimagic || (HAntimagic & ~I_SPECIAL).  Only
 * consulted on the !youattack side, which no call site reaches today. */
function _cm_Antimagic() {
    const p = game.u?.uprops?.[ANTIMAGIC];
    return !!(p && (((p.intrinsic | 0) !== 0) || ((p.extrinsic | 0) !== 0)));
}
/* C you.h Upolyd — (u.umonnum != u.umonster). */
function _cm_Upolyd() {
    const u = game.u;
    if (!u || u.umonnum == null || u.umonster == null) return false;
    return (u.umonnum | 0) !== (u.umonster | 0);
}
/* C youprop.h Unchanging — u.uprops[UNCHANGING]. */
function _cm_Unchanging() {
    const p = game.u?.uprops?.[UNCHANGING];
    return !!(p && (((p.intrinsic | 0) !== 0) || ((p.extrinsic | 0) !== 0)));
}

function drain_is_weptool(o) {
    const t = o.otyp | 0;
    const skill = (t >= 0 && t < MKOBJ_OC_SKILL.length) ? (MKOBJ_OC_SKILL[t] | 0) : 0;
    return (o.oclass | 0) === TOOL_CLASS && skill !== 0;
}

/* C ref: artifact.c defends_when_carried(int adtyp, struct obj *otmp) —
 *   const struct artifact *weap = get_artifact(otmp);
 *   if (weap != &artilist[ART_NONARTIFACT]) return weap->cary.adtyp == adtyp;
 *   return FALSE;
 * drain_item's only call is defends_when_carried(AD_DRLI, obj), and that is
 * provably FALSE for every object in the game: `cary` is the third attack
 * slot of an artilist entry, and grepping nethack-c/include/artilist.h for
 * DRLI shows the only three DRLI uses are in `attk`/`defn` slots
 * (artilist.h:87 Excalibur, :95 Stormbringer, :251 The Staff of Aesculapius);
 * all three, and every other entry, carry NO_CARY.  So this is an exact port
 * of the AD_DRLI case, not an approximation.  C draws no RNG here. */
function drain_defends_when_carried(adtyp, _obj) {
    return adtyp === AD_DRLI ? false : false;
}

function drain_defends(adtyp, obj) {
    /* C artilist.h:85-95,248 — Excalibur, Stormbringer, and the Staff of
     * Aesculapius all defend against AD_DRLI.  oartifact uses the artilist
     * ordinal (the same numbering consumed by js/attrib.js's artifact data). */
    if (adtyp === AD_DRLI) {
        const art = obj?.oartifact | 0;
        return art === 1 || art === 2 || art === 24;
    }
    return false;
}

/* C ref: obj.h OBJ_INVENT — carried(obj) is (obj->where == OBJ_INVENT). */
function drain_carried(o) {
    return (o.where | 0) === 3;
}

export async function drain_item(obj, by_you) {
    /* C ref: mkobj.c costly_alteration(obj, alter_type) — the shopkeeper
     * "you pay for it" billing message.  C's own first act is to RETURN when
     * the object is carried (or OBJ_FREE) and not unpaid, which is every
     * object outside a shop; the remaining arms are verbalize() +
     * bill_dummy_object() / stolen_value().
     * KNOWN GAP: the shop arms are not ported (js/cmd.js:20634 is likewise a
     * stub).  It was an unconditional throw here, on the by_you path.
     * C draws no RNG on the returning path; the shop arms reach stolen_value(),
     * so a hero draining an unpaid shop item is an RNG-visible gap. */
    async function costly_alteration(_o, _alter_type) {
        return await costly_alteration_real(_o, _alter_type);
    }

    // Is this a charged/enchanted object?
    if (!obj || obj.spe <= 0)
        return false;

    // Check if object is potentially drainy:
    // Rings 173-178 are oc_charged; weapons and armor always are; weptools via
    // drain_is_weptool (a real oc_skill lookup now, not the former throw-stub).
    // PRE-EXISTING DEVIATION, left as found: C tests
    // objects[obj->otyp].oc_charged, and the port has no oc_charged table, so
    // the ring range 173-178 stands in for it.  That under-reports wands and
    // charged tools, whose only drain_item caller is zap.c:2319 (SPE_DRAIN_LIFE
    const is_charged_ring = (obj.otyp >= RIN_BASE && obj.otyp <= RIN_LAST_CHARGED);
    const is_weapon_or_armor = (obj.oclass === WEAPON_CLASS || obj.oclass === ARMOR_CLASS);
    const is_wep_tool = drain_is_weptool(obj);

    if (!is_charged_ring && !is_weapon_or_armor && !is_wep_tool)
        return false;
    if (drain_defends(AD_DRLI, obj) || drain_defends_when_carried(AD_DRLI, obj)
        || obj_resists(obj, 10, 90))
        return false;

    // Charge for the cost of the object
    if (by_you)
        await costly_alteration(obj, 2); // COST_DRAIN = 2

    // Drain the object and any implied effects
    obj.spe--;
    const u_ring = (obj === game.u.uleft) || (obj === game.u.uright);

    // Ensure abon structure exists
    if (!game.u.abon)
        game.u.abon = {};
    if (!game.u.abon.a)
        game.u.abon.a = [0, 0, 0, 0, 0, 0];

    switch (obj.otyp) {
    case RIN_GAIN_STRENGTH:
        if ((obj.owornmask & W_RING) && u_ring) {
            game.u.abon.a[A_STR]--;
            game.disp.botl = 1;
        }
        break;
    case RIN_GAIN_CONSTITUTION:
        if ((obj.owornmask & W_RING) && u_ring) {
            game.u.abon.a[A_CON]--;
            game.disp.botl = 1;
        }
        break;
    case RIN_ADORNMENT:
        if ((obj.owornmask & W_RING) && u_ring) {
            game.u.abon.a[A_CHA]--;
            game.disp.botl = 1;
        }
        break;
    case RIN_INCREASE_ACCURACY:
        if ((obj.owornmask & W_RING) && u_ring)
            game.u.uhitinc--;
        break;
    case RIN_INCREASE_DAMAGE:
        if ((obj.owornmask & W_RING) && u_ring)
            game.u.udaminc--;
        break;
    case RIN_PROTECTION:
        if (u_ring)
            game.disp.botl = 1; /* bot() will recalc u.uac */
        break;
    case HELM_OF_BRILLIANCE:
        if ((obj.owornmask & W_ARMH) && (obj === game.u.uarmh)) {
            game.u.abon.a[A_INT]--;
            game.u.abon.a[A_WIS]--;
            game.disp.botl = 1;
        }
        break;
    case GAUNTLETS_OF_DEXTERITY:
        if ((obj.owornmask & W_ARMG) && (obj === game.u.uarmg)) {
            game.u.abon.a[A_DEX]--;
            game.disp.botl = 1;
        }
        break;
    default:
        break;
    }
    if (game.disp.botl)
        void bot();
    if (drain_carried(obj))
        update_inventory();
    return true;
}

/**
 * Returns the percentage protection that the object gives against the
 * given damage type.
 * C ref: zap.c u_adtyp_resistance_obj(5668-5691)
 *
 * @param {number} dmgtyp
 * @returns {number}
 */
export function u_adtyp_resistance_obj(dmgtyp) {
    const u = game.u;
    const prop = adtyp_to_prop(dmgtyp);

    if (!prop)
        return 0;

    /* FIXME? these percentages (99 and 90) seem too high... */

    /* items that give an extrinsic resistance when worn or wielded or
       carried give 99% protection to your items */
    if (u.uprops && u.uprops[prop]
        && ((u.uprops[prop].extrinsic & (W_ARMOR | W_ACCESSORY | W_WEP | W_ART)) !== 0)) {
        return 99;
    }

    /* worn dwarvish cloaks give 90% protection against heat and cold to
       carried items */
    if (u.uarmc && u.uarmc.otyp === DWARVISH_CLOAK
        && (dmgtyp === AD_COLD || dmgtyp === AD_FIRE)) {
        return 90;
    }

    return 0;
}

/**
 * Convert attack damage AD_foo to property resistance.
 * C ref: zap.c adtyp_to_prop(5646-5664)
 *
 * @param {number} dmgtyp
 * @returns {number}
 */
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

/**
 * Rolls to see whether an object in inventory resists damage from the
 * given damage type, due to an equipped item protecting it.
 * C ref: zap.c inventory_resistance_check(5703-5711)
 *
 * @param {number} dmgtyp
 * @returns {boolean}
 */
export function inventory_resistance_check(dmgtyp) {
    const prob = u_adtyp_resistance_obj(dmgtyp);

    if (!prob)
        return false;

    return rn2(100) < prob;
}

/**
 * Returns a string describing what item(s) protect against the given
 * damage type. Currently only useful in wizard mode.
 * C ref: zap.c item_what(5714-5753)
 *
 * @param {number} dmgtyp
 * @returns {string}
 */
export function item_what(dmgtyp) {
    const u = game.u;
    const prop = adtyp_to_prop(dmgtyp);
    /* C: u.uprops is a fixed array so u.uprops[prop] always exists;
       JS uprops is sparse — treat missing entries as extrinsic 0. */
    const uprop = (u.uprops && u.uprops[prop]) ? u.uprops[prop] : {};
    const xtrinsic = uprop.extrinsic || 0;
    let what = null;

    if (true) {
        if (!prop || !xtrinsic) {
            return " by your " + (dmgtyp === 3 ? "cloak" : "armor");
        } else if (xtrinsic & W_ARMC) {
            what = cloak_simple_name(u.uarmc);
        } else if (xtrinsic & W_ARM) {
            what = suit_simple_name(u.uarm);
        } else if (xtrinsic & W_ARMU) {
            what = shirt_simple_name(u.uarmu);
        } else if (xtrinsic & W_ARMH) {
            what = helm_simple_name(u.uarmh);
        } else if (xtrinsic & W_ARMG) {
            what = gloves_simple_name(u.uarmg);
        } else if (xtrinsic & W_ARMF) {
            what = boots_simple_name(u.uarmf);
        } else if (xtrinsic & W_ARMS) {
            what = shield_simple_name(u.uarms);
        } else if (xtrinsic & (W_AMUL | W_TOOL)) {
            what = simpleonames((xtrinsic & W_AMUL) ? u.uamul : u.ublindf);
        } else if (xtrinsic & W_RING) {
            if ((xtrinsic & W_RING) === W_RING) /* both */
                what = "rings";
            else
                what = simpleonames((xtrinsic & W_RINGL) ? u.uleft : u.uright);
        } else if (xtrinsic & W_WEP) {
            what = simpleonames(u.uwep);
        }
        if (what)
            return " by your " + what;
    }
    return "";
}

/* ── Stubs for unported helpers called by item_what ──────────────────────── */
function shirt_simple_name(obj) { return shirt_simple_name_real(obj); }
/* simpleonames: C objnam.c:2428-2442, fully ported and exported by
 * js/objnam.js and imported at this file's header.  A file-local THROWING
 * body of the same name stood here and shadowed it at item_what()'s three
 * amulet/blindfold/ring/weapon call sites (zap.c:5758,5763,5765).  objnam.js
 * does not import zap.js, so the edge is one-way and there is no cycle. */


export async function burn_floor_objects(x, y, give_feedback, u_caused) {
    let cnt = 0;
    let obj = game.level.levelObjects[x][y];
    while (obj) {
        const obj2 = obj.nexthere;
        if (obj.oclass === SCROLL_CLASS || obj.oclass === SPBOOK_CLASS
            || (obj.oclass === FOOD_CLASS && obj.otyp === GLOB_OF_GREEN_SLIME)) {
            if (obj.otyp === SCR_FIRE || obj.otyp === SPE_FIREBALL
                || obj_resists(obj, 2, 100))
                { obj = obj2; continue; }
            const scrquan = obj.quan;
            let delquan = 0;
            for (let i = scrquan; i > 0; i--)
                if (!rn2(3))
                    delquan++;
            if (delquan) {
                let buf1, buf2;
                if (give_feedback) {
                    obj.quan = 1;
                    buf1 = u_at(x, y) ? xname(obj) : (await distant_name(obj, xname));
                    obj.quan = 2;
                    buf2 = u_at(x, y) ? xname(obj) : (await distant_name(obj, xname));
                    obj.quan = scrquan;
                }
                if (u_caused)
                    await useupf(obj, delquan);
                else if (delquan < scrquan) {
                    obj.quan -= delquan;
                    obj.owt = weight(obj);
                } else
                    await delobj(obj);
                cnt += delquan;
                if (give_feedback) {
                    if (delquan > 1)
                        pline(`${delquan} ${buf2} burn.`);
                    else {
                        const an_buf = an(buf1);
                        pline(`${an_buf.charAt(0).toUpperCase() + an_buf.slice(1)} burns.`);
                    }
                }
            }
        }
        obj = obj2;
    }
    await ignite_items(game.level.levelObjects[x][y]);
    return cnt;
}

/* ── miss (ported from zap.c) ────────────────────────────────────────────── */
/* C zap.c:3571-3578 miss(const char *str, struct monst *mtmp)
 *   pline("%s %s %s.", The(str), vtense(str, "miss"), ...)
 * js/display.js:3812 `export async function pline(msg)` takes ONE argument, so
 * the C-shaped call this body used to make put the literal "%s %s %s." on the
 * topline and dropped all three substitutions.  Interpolate instead. */
export function miss(str, mtmp) {
    const g = game;
    const bx = g.bhitpos ? g.bhitpos.x : 0;
    const by = g.bhitpos ? g.bhitpos.y : 0;
    const who = ((cansee(bx, by) || canspotmon(mtmp)) && g.flags.verbose)
        ? mon_nam(mtmp) : "it";
    pline(`${The(str)} ${vtense(str, "miss")} ${who}.`);
}

/* C zap.c:3556-3569 hit(const char *str, struct monst *mtmp, const char *force)
 *   "The crude dagger hits the little dog."  `force` is exclam(damage) — "."
 *   or "!" — and is appended with NO separating space.
 * RNG: none.  The C body's `engulfing_u(mtmp)` disjunct is a GAP: js/ has no
 * engulfing_u, and it can only widen `verbosely`, which is already true here
 * for any target the hero can see. */
export function hit(str, mtmp, force) {
    const g = game;
    const bx = g.bhitpos ? g.bhitpos.x : 0;
    const by = g.bhitpos ? g.bhitpos.y : 0;
    const verbosely = (is_youmonst(mtmp)
                       || (g.flags?.verbose
                           && (cansee(bx, by) || canspotmon(mtmp))));
    pline(`${The(str)} ${vtense(str, "hit")} ${verbosely ? mon_nam(mtmp) : "it"}${force}`);
}

/* ── Stubs for unported helpers called by zapnodir ───────────────────────── */
/* C zap.c:3021-3051 lightdamage(struct obj *obj, boolean ordinary, int amt)
 * Pseudo-damage from a light source, used to determine blindness duration.
 * RNG: NONE unless the hero is polymorphed into a gremlin — the whole body is
 * guarded by `dmg && gy.youmonst.data == &mons[PM_GREMLIN]`; for every other
 * form it is `return amt` unchanged.  Was a throw-stub, on the same arm as
 * litroom above. */
export function lightdamage(obj, ordinary, amt) {
    const g = game;
    let dmg = amt | 0;

    /* C zap.c:3029 — gy.youmonst.data == &mons[PM_GREMLIN].  js carries the
     * permonst row index on the synthetic youmonst.data_mndx field. */
    if (dmg && (g.youmonst && (g.youmonst.data_mndx | 0) === PM_GREMLIN)) {
        /* C zap.c:3031-3035 — reduce high values (wand destruction). */
        dmg = rnd(dmg);
        if (dmg > 10)
            dmg = 10 + rnd(dmg - 10);
        if (dmg > 20)
            dmg = 20;
        /* C zap.c:3036 pline("Ow, that light hurts%c", ...) — resolved here;
         * js pline() takes a single already-formatted string. */
        pline('Ow, that light hurts'
              + ((dmg > 2 || (g.u && (g.u.mh | 0) <= 5)) ? '!' : '.'));
    }
    return dmg;
}
/* create_critters is NOT redeclared here.  C has exactly one create_critters
 * (makemon.c:1556); this file used to carry a throw-stub of that name, which is
 * what halted every scored run that zapped a wand of create monster.  It is now
 * imported from js/makemon.js (where the port lives) at the top of this file. */
/* makewish() is NOT redeclared here.  C has exactly one makewish (zap.c:6307);
 * this file used to carry a throw-stub of that name, which shadowed the real
 * body for zapnodir()'s WAN_WISHING arm.  It is now imported from
 * js/wizcmds.js (where the port lives) at the top of this file. */

/* C trap.c:5285-5335 untrap_prob(); returns 0 for success, non-0 for failure. */
function untrap_prob(ttmp) {
    const u = game.u;
    const unpr = (id) => { const p = u.uprops && u.uprops[id]; return !!(p && ((p.intrinsic | 0) || (p.extrinsic | 0))); };
    let chance = 3;
    if ((ttmp.ttyp | 0) === WEB_ZAP) {
        const blade = (o) => !!o && is_blade(o);
        const wep = blade(u.uwep) ? u.uwep
            : (blade(u.uswapwep) && (u.twoweap | 0)) ? u.uswapwep : null;
        if (wep && !m_at(ttmp.tx, ttmp.ty)) {
            /* Sting / fiery artifact blades: chance = 1 (artifact data not reachable here) */
            if ((u.uwep && (u.uwep.oartifact | 0) === 20)) chance = 1;
        } else {
            const pm = game.youmonst && game.youmonst.data ? (game.youmonst.data.pmidx | 0) : -1;
            if (pm !== 94 && pm !== 96) chance = 7; /* !webmaker */
        }
    }
    if (unpr(CONFUSION) || unpr(HALLUC)) chance++;
    if (unpr(BLINDED)) chance++;
    if (unpr(STUNNED)) chance += 2;
    if (unpr(FUMBLING)) chance *= 2;
    if (ttmp.madeby_u) chance--;
    if (_wand_Role_if(PM_RANGER) && (ttmp.ttyp | 0) === 5 && chance <= 3)
        return 0;
    if (_wand_Role_if(PM_ROGUE)) {
        if (rn2(2 * 30) < (u.ulevel | 0)) chance--;
        if ((u.uhave && u.uhave.questart) && chance > 1) chance--;
    } else if (_wand_Role_if(PM_RANGER) && chance > 1)
        chance--;
    if (chance < 1) chance = 1;
    return rn2(chance);
}

/* C trap.c:5393-5436 move_into_trap(): attempting to disarm an adjacent trap,
 * the hero has fallen into it.  (Punished drag_ball/move_bc not ported.) */
async function move_into_trap(ttmp) {
    const u = game.u;
    const x = ttmp.tx, y = ttmp.ty;
    const sgn = (v) => (v > 0) - (v < 0);
    if (_ut_test_move(u.ux, u.uy, sgn(x - u.ux), sgn(y - u.uy), TEST_MOVE)) {
        u.ux0 = u.ux; u.uy0 = u.uy;
        u.ux = x; u.uy = y;
        u.umoved = true;
        newsym(u.ux0, u.uy0);
        _ut_vision_recalc(1);
        _ut_check_leash(u.ux0, u.uy0);
        ttmp.tseen = 0; /* hack for check_here() */
        game.iflags = game.iflags || {};
        game.iflags.failing_untrap = (game.iflags.failing_untrap | 0) + 1;
        await spoteffects(true);
        game.iflags.failing_untrap--;
        const t2 = t_at(u.ux, u.uy);
        if (t2) t2.tseen = 1;
        _ut_exercise(A_WIS, false);
    } else {
        const into = ((ttmp.ttyp | 0) === 5 || (ttmp.ttyp | 0) === WEB_ZAP || is_pit(ttmp.ttyp | 0));
        await pline(`Fortunately, you don't move ${into ? 'into' : 'onto'} it.`);
    }
}

/* C trap.c:5441-5524 try_disarm(): 0 doesn't even try; 1 tries and fails; 2 succeeds */
export async function try_disarm(ttmp, force_failure) {
    const u = game.u;
    const mtmp = m_at(ttmp.tx, ttmp.ty);
    const ttype = ttmp.ttyp | 0;
    const under_u = !(u.dx | 0) && !(u.dy | 0);
    const holdingtrap = (ttype === 5 || ttype === WEB_ZAP);
    if (mtmp && (!mtmp.mtrapped || !holdingtrap)) {
        await pline(`${Monnam(mtmp)} is in the way.`);
        return 0;
    }
    if (sobj_at(475 /* BOULDER */, ttmp.tx, ttmp.ty) && !_uhas(PASSES_WALLS) && !under_u) {
        await pline('There is a boulder in your way.');
        return 0;
    }
    if ((u.dx | 0) && (u.dy | 0) && _ut_bad_rock(game.youmonst.data, u.ux, ttmp.ty)
        && _ut_bad_rock(game.youmonst.data, ttmp.tx, u.uy)) {
        if ((game.invent && (_ut_inv_weight() + _ut_weight_cap() > WT_TOOMUCH_DIAGONAL))
            || ((game.youmonst.data.msize | 0) >= 4 /* MZ_LARGE: bigmonst */)) {
            await pline(`You are unable to reach the ${trapname(ttype, false)}!`);
            return 0;
        }
    }
    if (!can_reach_floor(under_u)) {
        if (u.usteed) await _ut_rider_cant_reach();
        else await pline(`You are unable to reach the ${trapname(ttype, false)}!`);
        return 0;
    }
    if (force_failure || untrap_prob(ttmp)) {
        if (rnl(5)) {
            await pline('Whoops...');
            if (mtmp) {
                if (ttype === 5) {
                    if (mtmp.mtame) await abuse_dog(mtmp);
                    mtmp.mhp -= rnd(4);
                    if (DEADMONSTER(mtmp)) await killed(mtmp);
                } else if (ttype === WEB_ZAP) {
                    let ttmp2 = t_at(u.ux, u.uy);
                    const pm = game.youmonst.data ? (game.youmonst.data.pmidx | 0) : -1;
                    if (!(pm === 94 || pm === 96) && !rn2(3)
                        && (ttmp2 ? ((ttmp2.ttyp | 0) === WEB_ZAP)
                            : (ttmp2 = await maketrap(u.ux, u.uy, WEB_ZAP)) != null)) {
                        await pline("The web sticks to you.  You're caught too!");
                        await dotrap(ttmp2, NOWEBMSG);
                        if (u.usteed && u.utrap) await dismount_steed(DISMOUNT_FELL);
                    }
                    if (mtmp.mtrapped) await pline(`${Monnam(mtmp)} remains entangled.`);
                }
            } else if (under_u) {
                await dotrap(ttmp, FAILEDUNTRAP);
            } else {
                await move_into_trap(ttmp);
            }
        } else {
            await pline(`${ttmp.madeby_u ? 'Your' : under_u ? 'This' : 'That'} ${trapname(ttype, false)} is difficult to ${ttype === WEB_ZAP ? 'remove' : 'disarm'}.`);
        }
        return 1;
    }
    return 2;
}

/* C trap.c:5553-5592 disarm_holdingtrap() */
async function disarm_holdingtrap(ttmp) {
    const u = game.u;
    const which = ttmp.madeby_u ? 'your' : 'the';
    const fails = await try_disarm(ttmp, false);
    if (fails < 2) return fails;
    let mtmp;
    if ((mtmp = m_at(ttmp.tx, ttmp.ty)) != null) {
        mtmp.mtrapped = 0;
        await pline(`You extract ${mon_nam(mtmp)} from ${which} ${(ttmp.ttyp | 0) === 5 ? 'bear trap' : 'web'}.`);
        await reward_untrap(ttmp, mtmp);
    } else if ((ttmp.ttyp | 0) === 5) {
        await pline(`You disarm ${which} bear trap.`);
        await cnv_trap_obj(244 /* BEARTRAP */, 1, ttmp, false);
    } else if ((ttmp.ttyp | 0) === WEB_ZAP) {
        const blade = (o) => !!o && is_blade(o);
        const wep = blade(u.uwep) ? u.uwep : (blade(u.uswapwep) && (u.twoweap | 0)) ? u.uswapwep : null;
        if (wep && wep.oartifact && (u.uwep && (u.uwep.oartifact | 0) === 20))
            throw new Error('not yet ported: disarm_holdingtrap artifact web arm');
        await pline(wep ? `You cut through ${which} web.` : `You succeed in removing ${which} web.`);
        deltrap(ttmp);
    }
    newsym(u.ux + (u.dx | 0), u.uy + (u.dy | 0));
    return 1;
}

/* C trap.c:5594-5604 disarm_landmine() */
async function disarm_landmine(ttmp) {
    const fails = await try_disarm(ttmp, false);
    if (fails < 2) return fails;
    await pline(`You disarm ${ttmp.madeby_u ? 'your' : 'the'} land mine.`);
    await cnv_trap_obj(243, 1, ttmp, false);
    return 1;
}

/* C trap.c:5664-5674 disarm_shooting_trap() */
async function disarm_shooting_trap(ttmp, otyp) {
    const fails = await try_disarm(ttmp, false);
    if (fails < 2) return fails;
    await pline(`You disarm ${ttmp.madeby_u ? 'your' : 'the'} trap.`);
    await cnv_trap_obj(otyp, 50 - rnl(50), ttmp, false);
    return 1;
}

/* C trap.c:5677-5694 try_lift() */
async function try_lift(mtmp, ttmp, xtra_wt, stuff) {
    if (_ut_calc_capacity(xtra_wt) >= 5 /* HVY_ENCUMBER */) {
        await pline(`${Monnam(mtmp)} is ${stuff ? 'carrying too much' : 'too heavy'} for you to lift.`);
        const d = mtmp.data;
        if (!ttmp.madeby_u && !mtmp.mpeaceful && mtmp.mcanmove
            && !(((d.mflags1 | 0) & 0x00010000) !== 0) && (d.mlet | 0) !== 53 /* S_HUMAN */
            && rnl(10) < 3) {
            mtmp.mpeaceful = 1;
            _ut_set_malign(mtmp);
            await pline(`${Monnam(mtmp)} thinks it was nice of you to try.`);
        }
        return 0;
    }
    return 1;
}

/* C trap.c:5700-5791 help_monster_out() */
async function help_monster_out(mtmp, ttmp) {
    const u = game.u;
    if (!mtmp.mtrapped) {
        await pline(`${Monnam(mtmp)} isn't trapped.`);
        return 0;
    }
    if (await check_capacity(null)) return 1;
    const uprob = untrap_prob(ttmp);
    if (uprob && !_ut_helpless(mtmp)) {
        await pline(`You try to reach out your ${makeplural(body_part(ARM))}, but ${mon_nam(mtmp)} backs away skeptically.`);
        return 1;
    }
    if (_ut_touch_petrifies(mtmp.data) && !u.uarmg && !_uhas(STONE_RES))
        throw new Error('not yet ported: help_monster_out cockatrice arm');
    if (uprob) {
        await pline(`You try to grab ${mon_nam(mtmp)}, but cannot get a firm grasp.`);
        if (mtmp.msleeping) {
            mtmp.msleeping = 0;
            await pline(`${Monnam(mtmp)} awakens.`);
        }
        return 1;
    }
    await pline(`You reach out your ${makeplural(body_part(ARM))} and grab ${mon_nam(mtmp)}.`);
    if (mtmp.msleeping) {
        mtmp.msleeping = 0;
        await pline(`${Monnam(mtmp)} awakens.`);
    } else if (mtmp.mfrozen && !rn2(mtmp.mfrozen)) {
        mtmp.mcanmove = 1;
        mtmp.mfrozen = 0;
        await pline(`${Monnam(mtmp)} stirs.`);
    }
    let xtra_wt = mtmp.data.cwt | 0;
    if (!(await try_lift(mtmp, ttmp, xtra_wt, false))) return 1;
    if (mtmp.minvent) {
        for (let o = mtmp.minvent; o; o = o.nobj) xtra_wt += (o.owt | 0);
        if (!(await try_lift(mtmp, ttmp, xtra_wt, true))) return 1;
    }
    await pline(`You pull ${mon_nam(mtmp)} out of the pit.`);
    mtmp.mtrapped = 0;
    await reward_untrap(ttmp, mtmp);
    await fill_pit(mtmp.mx, mtmp.my);
    return 1;
}

export async function untrap_floor_trap(ttmp, x, y) {
    const u = game.u;
    const here = (x === (u.ux | 0) && y === (u.uy | 0));
    const the_trap = `the ${trapname(ttmp.ttyp | 0, false)}`;
    if (u.utrap) {
        await pline(`You cannot deal with ${the_trap} while trapped${here ? ' in it' : ''}!`);
        return 1;
    }
    const mtmp = m_at(x, y);
    if (mtmp && ((mtmp.m_ap_type | 0) === M_AP_FURNITURE || (mtmp.m_ap_type | 0) === M_AP_OBJECT)) {
        await _ut_stumble_onto_mimic(mtmp);
        return 1;
    }
    switch (ttmp.ttyp | 0) {
    case BEAR_TRAP:
    case WEB_ZAP:
        return await disarm_holdingtrap(ttmp);
    case LANDMINE:
        return await disarm_landmine(ttmp);
    case SQKY_BOARD:
        return -1; /* getobj-driven grease arm not ported: caller keeps its sentinel */
    case DART_TRAP:
        return await disarm_shooting_trap(ttmp, OTYP_DART);
    case ARROW_TRAP:
        return await disarm_shooting_trap(ttmp, OTYP_ARROW);
    case PIT: case SPIKED_PIT: {
        if (here) { await pline('You are already on the edge of the pit.'); return 0; }
        if (!mtmp) { await pline('Try filling the pit instead.'); return 0; }
        return await help_monster_out(mtmp, ttmp);
    }
    default:
        await pline(`You cannot disable ${!here ? 'that' : 'this'} trap.`);
        return 0;
    }
}

/* C trap.c:5441-5527 try_disarm() + 5553-5592 disarm_holdingtrap(), restricted
 * to the hero's own square with no monster on it (under_u).  Returns the C
 * int, or -1 for a case not ported (caller keeps its sentinel). */
export async function untrap_holdingtrap_here(ttmp) {
    const u = game.u;
    if (m_at(ttmp.tx, ttmp.ty) || (u.dx | 0) || (u.dy | 0)) return -1;
    if (!can_reach_floor(true)) return -1;
    const the_your = ttmp.madeby_u ? 'your' : 'the';
    if (untrap_prob(ttmp)) {
        if (rnl(5)) {
            await pline('Whoops...');
            await dotrap(ttmp, FAILEDUNTRAP);
        } else {
            await pline(`${ttmp.madeby_u ? 'Your' : 'This'} ${trapname(ttmp.ttyp, false)} is difficult to ${(ttmp.ttyp | 0) === WEB_ZAP ? 'remove' : 'disarm'}.`);
        }
        return 1;
    }
    if ((ttmp.ttyp | 0) === 5) {
        await pline(`You disarm ${the_your} bear trap.`);
        await cnv_trap_obj(244, 1, ttmp, false);
    } else {
        const blade = (o) => !!o && is_blade(o);
        const wep = blade(u.uwep) ? u.uwep : (blade(u.uswapwep) && (u.twoweap | 0)) ? u.uswapwep : null;
        if (wep && wep.oartifact) return -1;
        await pline(wep ? `You cut through ${the_your} web.` : `You succeed in removing ${the_your} web.`);
        deltrap(ttmp);
    }
    newsym(u.ux + (u.dx | 0), u.uy + (u.dy | 0));
    return 1;
}
